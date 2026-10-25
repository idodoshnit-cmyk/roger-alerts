"""George: sends Roger's buy alerts by email during the US morning session.

Runs once per trading day (GitHub Actions starts it before the open). Every 5 minutes:
  1. download the newest 5-minute bars of today's gap-up stocks,
  2. run the same setup detectors Hans uses in training,
  3. ask Roger TAKE or SKIP, and ask James for the stop and target,
  4. apply the team rules (max 3 trades a day, stop for the day after -2R),
  5. email the order, and later email when the stop or the target is hit.

Alerts only. Nothing here talks to a broker. Educational, not financial advice.

Secrets (environment variables):
  GMAIL_ADDRESS       the Gmail account that sends
  GMAIL_APP_PASSWORD  a Gmail app password (not the normal password)
  ALERT_TO            where to send (optional, defaults to GMAIL_ADDRESS)
  or, with no Gmail password:
  RESEND_API_KEY      a free Resend key (resend.com, sign in with Google)
  ALERT_TO            the same email you signed up to Resend with

Usage:
  python live.py                      run the live session
  python live.py --test-email         send one test email and exit
  python live.py --replay data/bars/X_2026-10-01.csv   replay a saved day, print alerts, no email
"""
import argparse
import csv
import json
import os
import re
import smtplib
import sys
import time as _time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time, timedelta
from email.message import EmailMessage
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import hans  # noqa: E402
from hans import FEATURES, STOPS, DEFAULT_PLAN, MIN_GAP, MIN_PRICE, MAX_PRICE  # noqa: E402
from roger import Roger  # noqa: E402
from setups import DETECTORS, NAMES_HE  # noqa: E402

ET = ZoneInfo("America/New_York")
IL = ZoneInfo("Asia/Jerusalem")
LOG = os.path.join(HERE, "log")

START_SCAN = time(9, 20)      # look for gap-up stocks in the premarket
FIRST_CHECK = time(9, 35)     # first 5-minute candle has closed
LAST_CHECK = time(11, 40)     # last entry bar (11:30) has closed
FOLLOW_UNTIL = time(12, 30)   # keep watching open trades for stop/target until here
MAX_TRADES = 3
DAY_STOP_R = -2.0
MAX_CANDIDATES = 40
FRESH = timedelta(minutes=10)  # only alert on a setup that triggered in the last 10 minutes
ACCOUNT = float(os.environ.get("ACCOUNT_USD", "100"))
RISK_PCT = 0.01

TACTICS_HE = {
    "be_after_1r": "אחרי רווח של 1R להזיז את הסטופ למחיר הכניסה",
    "trail_ema9": "לצאת כשנר נסגר מתחת לממוצע 9",
    "half_1r_trail": "למכור חצי ב-1R, ואת השאר כשנר נסגר מתחת לממוצע 9",
    "trail_prev_low": "אחרי 1R לגרור את הסטופ לשפל של הנר הקודם",
    "time_60m": "לצאת אחרי 60 דקות אם לא נגע בסטופ",
    "chandelier": "סטופ נגרר: 3 ATR מתחת לשיא מאז הכניסה, זז רק למעלה",
}


# ---------- Roger and James ----------

class JamesLive:
    """Reads James's saved brain. With no brain yet he uses the default plan."""

    def __init__(self, path=os.path.join(HERE, "data", "james_brain.json")):
        self.models = {}
        if os.path.exists(path):
            d = json.load(open(path))
            if d.get("models") and d.get("mu"):
                mu, sd = np.array(d["mu"], dtype=float), np.array(d["sd"], dtype=float)
                models = {p: np.array(w, dtype=float) for p, w in d["models"].items()}
                # a broken brain (NaN numbers) would pick a random plan: use the default plan instead
                if len(mu) == len(FEATURES) and np.all(np.isfinite(mu)) and np.all(np.isfinite(sd)) \
                        and all(len(w) == len(FEATURES) + 1 and np.all(np.isfinite(w)) for w in models.values()):
                    self.mu, self.sd, self.models = mu, np.where(sd < 1e-9, 1.0, sd), models

    def choose(self, feats):
        if not self.models:
            return DEFAULT_PLAN
        try:
            x = np.append((np.array([float(feats.get(f, 0.0)) for f in FEATURES]) - self.mu) / self.sd, 1.0)
            ok = getattr(hans, "allowed", None)
            sw = float(feats.get("stop_width", 0.0))
            scores = {p: float(x @ w) for p, w in self.models.items() if ok is None or ok(p, sw)}
            scores = {p: v for p, v in scores.items() if np.isfinite(v)}
            return max(scores, key=scores.get) if scores else DEFAULT_PLAN
        except Exception:
            return DEFAULT_PLAN


def plan_levels(plan, entry, setup_stop):
    """Turn a plan name like 'tight_1.5' into stop and target prices."""
    if plan == "half_p5_chandelier":
        return setup_stop, entry * 1.05, "למכור חצי ב-+5% ולהזיז סטופ לכניסה, את השאר לגרור 3 ATR מתחת לשיא"
    if plan in TACTICS_HE:
        return setup_stop, None, TACTICS_HE[plan]
    s, t = plan.split("_")
    if t.startswith("p"):
        stop = entry - STOPS[s] * (entry - setup_stop)
        return stop, entry * (1 + int(t[1:]) / 100), f"יעד +{int(t[1:])}%"
    stop = entry - STOPS[s] * (entry - setup_stop)
    if t == "close":
        return stop, None, "בלי יעד: להחזיק עד הסטופ או עד הסגירה"
    return stop, entry + float(t) * (entry - stop), f"יעד פי {t} מהסיכון"


# ---------- data ----------

def premarket_candidates():
    """TradingView scan: US stocks up 15%+ in the premarket, price 1 to 20 dollars."""
    q = {"columns": ["name", "premarket_change", "premarket_close", "exchange"],
         "filter": [{"left": "type", "operation": "equal", "right": "stock"},
                    {"left": "exchange", "operation": "in_range", "right": ["NASDAQ", "NYSE", "AMEX"]},
                    {"left": "premarket_change", "operation": "greater", "right": 15},
                    {"left": "premarket_close", "operation": "in_range", "right": [MIN_PRICE * 0.8, MAX_PRICE * 1.2]}],
         "sort": {"sortBy": "premarket_change", "sortOrder": "desc"},
         "range": [0, MAX_CANDIDATES]}
    try:
        r = requests.post("https://scanner.tradingview.com/america/scan", json=q, timeout=30)
        return [row["d"][0] for row in r.json().get("data", []) if row["d"][0].isalpha()]
    except Exception as e:
        print("TradingView scan failed:", e)
        return []


def yahoo_gainers():
    """Backup list: Yahoo's 'day gainers' screener."""
    try:
        r = requests.get("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved",
                         params={"scrIds": "day_gainers", "count": 100},
                         headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        quotes = r.json()["finance"]["result"][0]["quotes"]
        return [q["symbol"] for q in quotes if q.get("regularMarketChangePercent", 0) >= 15]
    except Exception as e:
        print("Yahoo gainers failed:", e)
        return []


def daily_meta(ticker, today):
    """Previous close and 20-day average volume, the same way Hans measures them."""
    d = hans._yahoo(ticker, range="3mo", interval="1d")
    if d is None:
        return None
    d = d[d.index.strftime("%Y-%m-%d") < today]
    if len(d) < 21:
        return None
    return {"ticker": ticker, "date": today, "prev_close": float(d["Close"].iloc[-1]),
            "avg_vol20": float(d["Volume"].iloc[-20:].mean())}


def today_bars(ticker):
    return hans._yahoo(ticker, range="1d", interval="5m", includePrePost="true")


# ---------- the setup check, live ----------

def check(bars, meta, now):
    """Run every detector on the candles that have closed. Returns fresh triggers."""
    bars = bars[bars.index + timedelta(minutes=5) <= now]
    pm = bars[bars.index.time < time(9, 30)]
    reg = bars[(bars.index.time >= time(9, 30)) & (bars.index.time < time(16, 0))]
    if len(reg) < 1 or meta["avg_vol20"] <= 0:
        return [], reg
    open_ = float(reg["Open"].iloc[0])
    if open_ / meta["prev_close"] - 1 < MIN_GAP or not (MIN_PRICE <= open_ <= MAX_PRICE):
        return [], reg
    typical = (reg["High"] + reg["Low"] + reg["Close"]) / 3
    vwap = ((typical * reg["Volume"]).cumsum() / reg["Volume"].cumsum().replace(0, np.nan)).ffill().fillna(reg["Close"])
    ctx = {"pm_high": float(pm["High"].max()) if len(pm) else open_,
           "vwap": vwap, "ema9": reg["Close"].ewm(span=9, adjust=False).mean()}
    pm_vol = float(pm["Volume"].sum())
    out = []
    for name, detect in DETECTORS.items():
        try:
            hit = detect(reg, ctx)
        except Exception:
            continue
        if not hit:
            continue
        i, entry, stop = hit
        entry, stop = float(entry), float(stop)
        risk = entry - stop
        if risk <= 0 or not (getattr(hans, "MIN_STOP_WIDTH", 0.0) <= risk / entry <= 0.25):
            continue
        bar_close = reg.index[i] + timedelta(minutes=5)
        hod = max(ctx["pm_high"], float(reg["High"].iloc[:i].max()))
        feats = {
            "gap_pct": open_ / meta["prev_close"] - 1,
            "pm_vol_ratio": pm_vol / meta["avg_vol20"],
            "vol_ratio": (pm_vol + float(reg["Volume"].iloc[:i].sum())) / meta["avg_vol20"],
            "change_from_open": entry / open_ - 1,
            "vwap_dist": entry / float(vwap.iloc[i - 1]) - 1,
            "hod_dist": entry / hod - 1,
            "stop_width": risk / entry,
            "minutes_in": (reg.index[i] - reg.index[0]).total_seconds() / 60,
            "log_price": float(np.log(entry)),
            # same formulas as hans.py, so Roger sees what he trained on
            "recent_vol_ratio": float(reg["Volume"].iloc[max(0, i - 3):i].mean()
                                      / max(reg["Volume"].iloc[:i].mean(), 1.0)),
            "pm_high_dist": entry / ctx["pm_high"] - 1 if ctx["pm_high"] > 0 else 0.0,
            "day_range": hod / max(float(reg["Low"].iloc[:i].min()), 1e-6) - 1,
        }
        for s in DETECTORS:
            feats["setup_" + s] = 1.0 if s == name else 0.0
        out.append({"setup": name, "i": i, "entry": entry, "stop": stop, "features": feats,
                    "bar_close": bar_close, "fresh": now - bar_close <= FRESH,
                    "last": float(reg["Close"].iloc[-1])})
    return out, reg


# ---------- email ----------

def send(subject, body, dry=False):
    """Sends right away. Returns the time it left, or None if it failed."""
    if dry:
        body = body.replace("{sent}", datetime.now(IL).strftime("%H:%M:%S"))
        print(f"\n=== {subject}\n{body}")
        return datetime.now(ET)
    if os.environ.get("RESEND_API_KEY") and not os.environ.get("GMAIL_APP_PASSWORD"):
        return send_resend(subject, body)
    user, pw = os.environ.get("GMAIL_ADDRESS"), os.environ.get("GMAIL_APP_PASSWORD")
    if not user or not pw:
        print("No Gmail secrets set, email not sent.")
        return False
    for attempt in range(3):
        try:
            msg = EmailMessage()
            msg["Subject"], msg["From"], msg["To"] = subject, user, os.environ.get("ALERT_TO") or user
            msg["X-Priority"] = "1"
            msg.set_content(body.replace("{sent}", datetime.now(IL).strftime("%H:%M:%S")))
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as s:
                s.login(user, pw.replace(" ", ""))
                s.send_message(msg)
            print(f"\n=== sent: {subject}")
            return datetime.now(ET)
        except Exception as e:
            print("email failed:", e)
            _time.sleep(2)
    return None


def send_resend(subject, body):
    """Same as send(), through Resend's free email API (no Gmail password needed)."""
    to = (os.environ.get("ALERT_TO") or os.environ.get("GMAIL_ADDRESS") or "").strip()
    if not to:
        print("ALERT_TO secret missing, email not sent.")
        return False
    for attempt in range(3):
        try:
            r = requests.post("https://api.resend.com/emails", timeout=20,
                              headers={"Authorization": "Bearer " + os.environ["RESEND_API_KEY"].strip()},
                              json={"from": "Roger <onboarding@resend.dev>", "to": [to], "subject": subject,
                                    "text": body.replace("{sent}", datetime.now(IL).strftime("%H:%M:%S")),
                                    "headers": {"X-Priority": "1"}})
            if r.status_code < 300:
                print(f"\n=== sent: {subject}")
                return datetime.now(ET)
            print("email failed:", r.status_code, r.text[:200])
            # free Resend only delivers to the signup address; it names it, so send there instead
            m = re.search(r"own email address \(([^)\s]+@[^)\s]+)\)", r.text)
            if r.status_code == 403 and m and m.group(1).lower() != to.lower():
                print("ALERT_TO differs from the Resend signup address, sending to the signup address")
                to = m.group(1)
                continue
            if r.status_code in (401, 403, 422):
                return None          # wrong key or address: retrying will not help
        except Exception as e:
            print("email failed:", e)
        _time.sleep(2)
    return None


def il(t):
    return t.astimezone(IL).strftime("%H:%M")


def money(x):
    return f"{x:.2f}$" if x >= 1 else f"{x:.4f}$"


def log_row(name, row):
    os.makedirs(LOG, exist_ok=True)
    path = os.path.join(LOG, name)
    new = not os.path.exists(path)
    with open(path, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(row))
        if new:
            w.writeheader()
        w.writerow(row)


# ---------- the session ----------

class Session:
    def __init__(self, dry=False):
        self.roger = Roger(path=os.path.join(HERE, "data", "roger_brain.json"))
        self.james = JamesLive()
        self.dry = dry
        self.alerted = set()      # tickers already alerted today
        self.trades = []          # open and closed trades today
        self.day_r = 0.0
        self.stopped = False
        self.skips = 0

    def consider(self, ticker, trig, now):
        if ticker in self.alerted or not trig["fresh"]:
            return
        feats = dict(trig["features"])
        for f in FEATURES:   # a feature added in training later: use Roger's average so he never crashes
            if f not in feats or not np.isfinite(feats[f]):
                feats[f] = float(self.roger.s.get("mean", {}).get(f, 0.0))
        ans = self.roger.answer({"features": feats})
        if ans["decision"] != "TAKE":
            self.skips += 1
            return
        self.alerted.add(ticker)
        if self.stopped or len(self.trades) >= MAX_TRADES:
            return
        plan = self.james.choose(feats)
        stop, target, how = plan_levels(plan, trig["entry"], trig["stop"])
        if trig["last"] <= stop:
            return                # the move already failed before we could tell you
        risk = trig["entry"] - stop
        shares = int(ACCOUNT * RISK_PCT / risk) if risk > 0 else 0
        n = len(self.trades) + 1
        valid = now + FRESH
        far = trig["last"] > trig["entry"] + 0.5 * risk
        subject = f"קנייה (תרגול): {ticker} ב-{money(trig['entry'])} | סטופ {money(stop)}" + \
                  (f" | יעד {money(target)}" if target else "")
        body = "\n".join([
            f"רוג׳ר: להיכנס ל-{ticker} (ביטחון {ans['p']:.0%})",
            f"מערך: {NAMES_HE.get(trig['setup'], trig['setup'])}",
            f"כניסה: {money(trig['entry'])}   מחיר אחרון: {money(trig['last'])}",
            f"סטופ (ג׳יימס): {money(stop)}",
            f"יעד: {money(target) if target else 'אין'} ({how})",
            f"כמות לפי 1% סיכון מ-{ACCOUNT:.0f}$: {shares} מניות" if shares else
            f"הסיכון למניה ({money(risk)}) גדול מ-1% מהחשבון, אז לפי הכלל לא נכנסים בכסף אמיתי.",
            f"המחיר כבר ירד מתחת לכניסה. אפשר לשים פקודת קנייה בפריצה של {money(trig['entry'])}." if trig["last"] < trig["entry"] else "",
            f"בתוקף עד {il(valid)} שעון ישראל. אם ראית את המייל אחרי זה, לוותר.",
            "המחיר כבר רחוק מהכניסה. עדיף לוותר." if far else "",
            f"עסקה {n} מתוך {MAX_TRADES} היום.",
            "",
            "תרגול בלבד. חומר לימודי, לא ייעוץ השקעות.",
        ])
        decided = datetime.now(ET)
        body += f"\n\nרוג׳ר החליט ב-{decided.astimezone(IL).strftime('%H:%M:%S')}, המייל יצא ב-{{sent}}."
        sent_at = send(subject, body, self.dry)
        lag = (sent_at - decided).total_seconds() if sent_at else None
        t = {"ticker": ticker, "setup": trig["setup"], "entry": trig["entry"], "stop": stop,
             "target": target, "i": trig["i"], "open": True, "r": None, "p": ans["p"], "plan": plan}
        self.trades.append(t)
        if not self.dry:
            log_row("alerts.csv", {"date": now.strftime("%Y-%m-%d"), "time_il": il(now), "ticker": ticker,
                                   "setup": trig["setup"], "p": ans["p"], "plan": plan,
                                   "entry": round(trig["entry"], 4), "stop": round(stop, 4),
                                   "target": round(target, 4) if target else "",
                                   "candle_to_send_sec": round((sent_at - trig["bar_close"]).total_seconds()) if sent_at else "",
                                   "decide_to_send_sec": round(lag, 1) if lag is not None else ""})

    def follow(self, ticker, reg, now):
        """Email when an open trade hits its stop or target."""
        for t in self.trades:
            if t["ticker"] != ticker or not t["open"]:
                continue
            risk = t["entry"] - t["stop"]
            for k in range(t["i"], len(reg)):
                b = reg.iloc[k]
                if b["Low"] <= t["stop"]:
                    t.update(open=False, r=-1.0, how="stop")
                elif t["target"] and b["High"] >= t["target"] and (k > t["i"] or b["Close"] >= t["target"]):
                    t.update(open=False, r=round((t["target"] - t["entry"]) / risk, 2), how="target")
                if not t["open"]:
                    break
            if not t["open"]:
                self.day_r += t["r"]
                word = "הסטופ נגע" if t["how"] == "stop" else "היעד נגע"
                lines = [f"{word} ב-{ticker}: {t['r']:+.1f}R", f"סה״כ היום: {self.day_r:+.1f}R"]
                if self.day_r <= DAY_STOP_R and not self.stopped:
                    self.stopped = True
                    lines.append("הגענו ל-2R- היום. עוצרים ליום, לא יהיו עוד הוראות.")
                send(f"{word}: {ticker} {t['r']:+.1f}R (תרגול)", "\n".join(lines), self.dry)

    def summary(self, now, n_watch):
        lines = [f"סיכום היום ({now.strftime('%d/%m')}): {len(self.trades)} הוראות, {self.day_r:+.1f}R בעסקאות שנסגרו."]
        for t in self.trades:
            state = "עדיין פתוחה" if t["open"] else f"{t['r']:+.1f}R"
            lines.append(f"- {t['ticker']} ({NAMES_HE.get(t['setup'], t['setup'])}): {state}")
        lines.append(f"רוג׳ר עקב אחרי {n_watch} מניות וויתר על {self.skips} הזדמנויות.")
        lines += ["", "תרגול בלבד. חומר לימודי, לא ייעוץ השקעות."]
        send(f"סיכום יום של רוג׳ר: {len(self.trades)} הוראות (תרגול)", "\n".join(lines), self.dry)
        if not self.dry:
            log_row("runs.csv", {"date": now.strftime("%Y-%m-%d"), "watched": n_watch,
                                 "alerts": len(self.trades), "skips": self.skips, "day_r": round(self.day_r, 2)})


def sleep_until(t):
    while True:
        left = (t - datetime.now(ET)).total_seconds()
        if left <= 0:
            return
        _time.sleep(min(left, 60))


def run_live():
    now = datetime.now(ET)
    today = now.strftime("%Y-%m-%d")
    if now.weekday() >= 5 or now.time() > LAST_CHECK:
        print("Outside the session, nothing to do.")
        return
    if os.path.exists(os.path.join(LOG, "runs.csv")) and today in open(os.path.join(LOG, "runs.csv")).read():
        print("Already ran today.")
        return
    sleep_until(now.replace(hour=START_SCAN.hour, minute=START_SCAN.minute, second=0, microsecond=0))
    tickers = premarket_candidates()
    sleep_until(datetime.now(ET).replace(hour=9, minute=35, second=8, microsecond=0))
    tickers = list(dict.fromkeys(tickers + yahoo_gainers()))[:MAX_CANDIDATES]
    spy = today_bars("SPY")
    if spy is None or not any(spy.index.strftime("%Y-%m-%d") == today):
        print("Market looks closed today (holiday?).")
        return
    metas = {t: m for t in tickers if (m := daily_meta(t, today))}
    print(f"Watching {len(metas)} stocks: {', '.join(metas)}")
    send(f"רוג׳ר התחיל: עוקב אחרי {len(metas)} מניות היום",
         "רוג׳ר, הנס וג׳יימס ערים ומחוברים לשוק. הוראות קנייה יגיעו עד 18:40 שעון ישראל, אם יהיו.\n"
         f"המניות: {', '.join(metas) or 'אין היום מניות בגאפ של 20% ומעלה'}\n\n"
         "תרגול בלבד. חומר לימודי, לא ייעוץ השקעות.")
    s = Session()
    end = datetime.now(ET).replace(hour=FOLLOW_UNTIL.hour, minute=FOLLOW_UNTIL.minute)
    last_entry = datetime.now(ET).replace(hour=LAST_CHECK.hour, minute=LAST_CHECK.minute)
    while True:
        now = datetime.now(ET)
        # all stocks at once, so Roger sees every chart within seconds of the candle closing
        with ThreadPoolExecutor(16) as ex:
            fetched = dict(zip(metas, ex.map(today_bars, metas)))
        for t, meta in metas.items():
            bars = fetched[t]
            if bars is None:
                continue
            trigs, reg = check(bars, meta, datetime.now(ET))
            if now <= last_entry:
                for trig in trigs:
                    s.consider(t, trig, now)
            s.follow(t, reg, now)
        if now >= end or (now > last_entry and not any(x["open"] for x in s.trades)):
            break
        nxt = now + timedelta(minutes=5)
        sleep_until(nxt.replace(minute=nxt.minute - nxt.minute % 5, second=8, microsecond=0))
    s.summary(datetime.now(ET), len(metas))


def replay(path):
    """Feed a saved day to the live code candle by candle. Prints what would be emailed."""
    meta = json.load(open(path.replace(".csv", ".json")))
    bars = pd.read_csv(path, index_col=0)
    bars = bars[pd.to_numeric(bars["Close"], errors="coerce").notna()].astype(float)
    bars.index = pd.to_datetime(bars.index, utc=True).tz_convert(ET)
    day = bars.index[-1]
    s = Session(dry=True)
    s.roger.p["threshold"] = float(os.environ.get("REPLAY_THRESHOLD", s.roger.p["threshold"]))
    t = day.replace(hour=9, minute=35, second=20)
    while t.time() <= FOLLOW_UNTIL:
        trigs, reg = check(bars, meta, t)
        if t.time() <= LAST_CHECK:
            for trig in trigs:
                s.consider(meta["ticker"], trig, t)
        s.follow(meta["ticker"], reg, t)
        t += timedelta(minutes=5)
    s.summary(t, 1)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--test-email", action="store_true")
    ap.add_argument("--replay")
    ap.add_argument("--alarm", action="store_true", help="email that today's run failed")
    a = ap.parse_args()
    if a.alarm:
        send("רוג׳ר לא רץ היום כמו שצריך", "משהו נתקע בהפעלה היומית, ולכן ייתכן שלא יגיעו הוראות היום. ג׳ורג׳ יבדוק.")
    elif a.test_email:
        ok = send("בדיקה: רוג׳ר מחובר למייל", "אם קיבלת את המייל הזה, הוראות הקנייה של רוג׳ר יגיעו לכאן.\n\nתרגול בלבד. חומר לימודי, לא ייעוץ השקעות.")
        sys.exit(0 if ok else 1)
    elif a.replay:
        replay(a.replay)
    else:
        run_live()
