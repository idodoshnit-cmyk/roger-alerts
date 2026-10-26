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
from hans import FEATURES, STOPS, DEFAULT_PLAN, MIN_PRICE, MAX_PRICE  # noqa: E402
from frozen_roger import FrozenRoger  # noqa: E402
# Roger's frozen Monday brain learned on stocks gapping about 5-10% (library median 3%), so live
# watches gaps of 5%+ too, not only 20%+ (training thread, 2026-10-26).
MIN_GAP = 0.05
from roger import Roger  # noqa: E402
import hunter  # noqa: E402
from setups import DETECTORS, NAMES_HE  # noqa: E402

ET = ZoneInfo("America/New_York")
IL = ZoneInfo("Asia/Jerusalem")
LOG = os.path.join(HERE, "log")

START_SCAN = time(9, 20)      # look for gap-up stocks in the premarket
FIRST_CHECK = time(9, 35)     # first 5-minute candle has closed
LAST_CHECK = time(11, 40)     # last entry bar (11:30) has closed
FOLLOW_UNTIL = time(13, 0)    # keep watching open trades until here (the job must end within 330 minutes)
CLOSE_WARN = time(15, 45)     # Blink plan: last call to sell what is left before the close
# Blink allows one open order per position (no trailing stop, no bracket), so James's plan for it:
# stop at the setup stop; at +5% sell half and move the stop to entry; sell the rest at +15% or before the close.
BLINK_PLAN = "half_p5_be_p15"
TRADE_SHARE = 0.5             # each trade uses half of the account
MAX_TRADES = 3
DAY_STOP_R = -2.0
# Watch-only days (the user's live test, no real buying): Roger looks for entries until 15:30 New York,
# with no 3-a-day or -2R limit, so every stock he takes is emailed. One date per line.
WATCH_DAY_FILE = os.path.join(HERE, "data", "watch_all_day.txt")
WATCH_LAST_ENTRY = time(15, 30)
WATCH_END = time(15, 55)


def watch_day(today):
    return os.path.exists(WATCH_DAY_FILE) and today in open(WATCH_DAY_FILE).read()
MAX_CANDIDATES = 40
FRESH = timedelta(minutes=10)  # only alert on a setup that triggered in the last 10 minutes
ACCOUNT = float(os.environ.get("ACCOUNT_USD", "100"))
RISK_PCT = 0.01
HQ_URL = "https://claude.ai/artifact/HQx32MY8NJckNzW8K9rDox"

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
    if plan == BLINK_PLAN:
        return setup_stop, entry * 1.05, "ב-+5%: לבטל את הסטופ, למכור חצי, ולשים סטופ חדש במחיר הכניסה. את השאר למכור ב-+15% או לפני הסגירה"
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
                    "last": float(reg["Close"].iloc[-1]), "reg": reg})
    return out, reg


# ---------- email ----------

def send(subject, body, dry=False):
    """Sends right away. Returns the time it left, or None if it failed.
    Tries Gmail or Resend when set up; if that fails, GitHub emails the repo owner."""
    if dry:
        body = body.replace("{sent}", datetime.now(IL).strftime("%H:%M:%S"))
        print(f"\n=== {subject}\n{body}")
        return datetime.now(ET)
    sent = None
    if os.environ.get("GMAIL_APP_PASSWORD") or os.environ.get("RESEND_API_KEY"):
        sent = send_mail(subject, body)
    if not sent and os.environ.get("GITHUB_TOKEN"):
        sent = send_github(subject, body)
    return sent


def send_github(subject, body):
    """Opens an issue in this repo that mentions the owner. GitHub emails it to them within seconds."""
    repo, owner = os.environ.get("GITHUB_REPOSITORY"), os.environ.get("GITHUB_REPOSITORY_OWNER")
    if not repo:
        print("Not running on GitHub, email not sent.")
        return None
    text = body.replace("{sent}", datetime.now(IL).strftime("%H:%M:%S"))
    for attempt in range(3):
        try:
            r = requests.post(f"https://api.github.com/repos/{repo}/issues", timeout=20,
                              headers={"Authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
                                       "Accept": "application/vnd.github+json"},
                              json={"title": subject, "body": f"@{owner}\n\n{text}"})
            if r.status_code < 300:
                print(f"\n=== sent through GitHub: {subject}")
                return datetime.now(ET)
            print("GitHub email failed:", r.status_code, r.text[:200])
        except Exception as e:
            print("GitHub email failed:", e)
        _time.sleep(2)
    return None


def send_mail(subject, body):
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
    raw = os.environ.get("ALERT_TO") or os.environ.get("GMAIL_ADDRESS") or ""
    to = re.sub(r"[^\x21-\x7e]", "", raw)          # drop spaces and invisible marks a phone keyboard adds
    if not to:
        print("ALERT_TO secret missing, email not sent.")
        return False
    for attempt in range(3):
        try:
            r = requests.post("https://api.resend.com/emails", timeout=20,
                              headers={"Authorization": "Bearer " + os.environ["RESEND_API_KEY"].strip()},
                              json={"from": "Roger <onboarding@resend.dev>", "to": [to], "subject": subject,
                                    "text": body.replace("{sent}", datetime.now(IL).strftime("%H:%M:%S"))})
            if r.status_code < 300:
                print(f"\n=== sent: {subject}")
                return datetime.now(ET)
            print("email failed:", r.status_code, r.text[:300])
            print(f"  (address: {len(to)} chars, cleaned {len(raw) - len(to)} hidden chars)")
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


MAX_CHASE = 0.03      # if the price is already 3%+ above Roger's entry, the chance is gone: no alert


def live_price(ticker):
    """Real-time last price: TradingView's scanner (US prices from Cboe in real time), Yahoo as backup."""
    try:
        r = requests.post("https://scanner.tradingview.com/america/scan", timeout=8, headers={"User-Agent": "Mozilla/5.0"},
                          json={"columns": ["close"], "range": [0, 1],
                                "filter": [{"left": "name", "operation": "equal", "right": ticker}]})
        d = r.json().get("data") or []
        if d and d[0]["d"][0]:
            return float(d[0]["d"][0])
    except Exception as e:
        print("TradingView price failed:", e)
    try:
        r = requests.get(f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}", timeout=8,
                         params={"range": "1d", "interval": "1m"}, headers={"User-Agent": "Mozilla/5.0"})
        return float(r.json()["chart"]["result"][0]["meta"]["regularMarketPrice"])
    except Exception as e:
        print("Yahoo price failed:", e)
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
        trees = os.path.join(HERE, "data", "roger_trees.json")
        self.frozen = FrozenRoger(trees) if os.path.exists(trees) else None
        self.day_gaps = {}        # ticker -> today's open gap, for the "hot market" count and gap rank
        self.james = JamesLive()
        self.dry = dry
        self.alerted = set()      # tickers already alerted today
        self.trades = []          # open and closed trades today
        self.day_r = 0.0
        self.stopped = False
        self.watch = watch_day(datetime.now(ET).strftime("%Y-%m-%d"))
        self.skips = 0

    def consider(self, ticker, trig, now):
        if ticker in self.alerted or not trig["fresh"]:
            return
        feats = dict(trig["features"])
        for f in FEATURES:   # a feature added in training later: use Roger's average so he never crashes
            if f not in feats or not np.isfinite(feats[f]):
                feats[f] = float(self.roger.s.get("mean", {}).get(f, 0.0))
        if self.frozen is not None:
            ans = self.frozen.answer(dict(trig["features"]), trig["setup"], self.day_gaps or {ticker: feats.get("gap_pct", 0.0)},
                                     trig.get("reg"), trig["i"])
        else:
            ans = self.roger.answer({"features": feats})
        if not self.dry:      # every look Roger takes, so Hans can review his live calls
            log_row("decisions.csv", {"date": now.strftime("%Y-%m-%d"), "time_et": now.strftime("%H:%M"), "ticker": ticker,
                                      "setup": trig["setup"], "entry": round(trig["entry"], 4), "stop": round(trig["stop"], 4),
                                      "decision": ans["decision"], "p": round(ans["p"], 4), "why": ans.get("why", ""),
                                      "gap": round(feats.get("gap_pct", 0.0), 4)})
        if ans["decision"] != "TAKE":
            self.skips += 1
            return
        self.alerted.add(ticker)
        if not self.watch and (self.stopped or len(self.trades) >= MAX_TRADES):
            return
        plan = BLINK_PLAN if BLINK_PLAN else self.james.choose(feats)
        priced = None
        if not self.dry:      # the buy price in the email is the market price seconds before it is sent
            px = live_price(ticker)
            if px:
                priced = datetime.now(IL).strftime("%H:%M:%S")
                if px > trig["entry"] * (1 + MAX_CHASE):
                    print(f"{ticker}: price {px} already ran past the setup entry {trig['entry']}, no alert")
                    return
                # follow from the newest closed candle: older candles happened before this price
                trig = {**trig, "setup_entry": trig["entry"], "entry": px, "last": px, "i": max(trig["i"], len(trig["reg"]) - 1)}
        stop, target, how = plan_levels(plan, trig["entry"], trig["stop"])
        if trig["last"] <= stop:
            return                # the move already failed before we could tell you
        risk = trig["entry"] - stop
        shares = int(ACCOUNT * RISK_PCT / risk) if risk > 0 else 0
        shares = min(shares, int(ACCOUNT / trig["entry"]))      # never more than the account can buy
        if plan == BLINK_PLAN:                                  # James's Blink plan: half the account per trade
            shares = int(ACCOUNT * TRADE_SHARE / trig["entry"]) if risk > 0 else 0
        n = len(self.trades) + 1
        valid = now + FRESH
        far = trig["last"] > trig["entry"] + 0.5 * risk
        subject = f"🟢 קנייה {ticker} ב-{money(trig['entry'])} | טייק פרופיט {money(target) if target else 'נגרר'} | סטופ {money(stop)}"
        cost = shares * trig["entry"]
        tp_pct = f" (+{(target / trig['entry'] - 1):.0%})" if target else ""
        summary = [
            f"🟢 הוראת קנייה (תרגול): {ticker}",
            "━━━━━━━━━━━━━━━━",
            f"קנייה:        {money(trig['entry'])}" + (f"  (מחיר השוק ב-{priced})" if priced else ""),
            f"כמות:         {shares} מניות  ·  סכום {cost:.2f}$" if shares else
            "כמות:         0 (הסיכון למניה גדול מ-1% מהחשבון, לא נכנסים)",
            f"טייק פרופיט:  {money(target)}{tp_pct}" if target else f"טייק פרופיט:  בלי יעד קבוע ({how})",
            f"סטופ לוס:     {money(stop)}",
            f"שלב 2:        ב-{money(trig['entry'] * 1.05)} למכור חצי ולהזיז את הסטופ ל-{money(trig['entry'])}. את השאר למכור ב-{money(trig['entry'] * 1.15)} (+15%)" if plan == BLINK_PLAN else "",
            f"סיכון: {shares * risk:.2f}$  ·  רווח ביעד: {shares * (target - trig['entry']):.2f}$" if shares and target else "",
            f"בתוקף עד {il(valid)} שעון ישראל",
            "━━━━━━━━━━━━━━━━",
            f"מה קורה עכשיו בצוות, בזמן אמת: {HQ_URL}",
            "",
            "פרטים:",
        ]
        body = "\n".join([l for l in summary if l != ""][:-1] + ["", "פרטים:"] + [
            f"רוג׳ר: להיכנס ל-{ticker} (ביטחון {ans['p']:.0%})",
            f"מערך: {NAMES_HE.get(trig['setup'], trig['setup'])}",
            f"כניסה: {money(trig['entry'])}   מחיר אחרון: {money(trig['last'])}",
            f"סטופ (ג׳יימס): {money(stop)}",
            f"יעד: {money(target) if target else 'אין'} ({how})",
            (f"כמות: חצי מהחשבון ({ACCOUNT * TRADE_SHARE:.0f}$): {shares} מניות" if plan == BLINK_PLAN else f"כמות לפי 1% סיכון מ-{ACCOUNT:.0f}$: {shares} מניות") if shares else
            f"הסיכון למניה ({money(risk)}) גדול מ-1% מהחשבון, אז לפי הכלל לא נכנסים בכסף אמיתי.",
            f"המחיר כבר ירד מתחת לכניסה. אפשר לשים פקודת קנייה בפריצה של {money(trig['entry'])}." if trig["last"] < trig["entry"] else "",
            f"בתוקף עד {il(valid)} שעון ישראל. אם ראית את המייל אחרי זה, לוותר.",
            "המחיר כבר רחוק מהכניסה. עדיף לוותר." if far else "",
            f"עסקה {n} היום (יום צפייה: בלי הגבלה של 3)." if self.watch else f"עסקה {n} מתוך {MAX_TRADES} היום.",
            "",
            "תרגול בלבד. חומר לימודי, לא ייעוץ השקעות.",
        ])
        body = "\n".join(l for l in body.split("\n\n\n"))
        decided = datetime.now(ET)
        body += f"\n\nרוג׳ר החליט ב-{decided.astimezone(IL).strftime('%H:%M:%S')}, המייל יצא ב-{{sent}}."
        sent_at = send(subject, body, self.dry)
        lag = (sent_at - decided).total_seconds() if sent_at else None
        t = {"ticker": ticker, "setup": trig["setup"], "entry": trig["entry"], "stop": stop,
             "target": target, "i": trig["i"], "open": True, "r": None, "p": ans["p"], "plan": plan,
             "shares": shares, "k": trig["i"], "half": False, "bank": 0.0, "risk": risk}
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
            if t["plan"] == BLINK_PLAN:
                self.follow_blink(t, reg, now)
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

    def close_trade(self, t, r, how, subject, lines):
        t.update(open=False, r=round(r, 2), how=how)
        self.day_r += t["r"]
        lines.append(f"סה״כ היום: {self.day_r:+.1f}R")
        if self.day_r <= DAY_STOP_R and not self.stopped:
            self.stopped = True
            lines.append("הגענו ל-2R- היום. עוצרים ליום, לא יהיו עוד הוראות.")
        send(subject, "\n".join(lines + ["", "תרגול בלבד. חומר לימודי, לא ייעוץ השקעות."]), self.dry)

    def confirm(self, tk, k, level, down):
        """Second look before a stop or target email: a fresh download of the same candle, or the live price,
        must agree. A Yahoo candle that gets revised a minute later can no longer fake a stop or target."""
        if self.dry:
            return True
        px = live_price(tk)
        if px is not None and (px <= level if down else px >= level):
            return True
        bars = today_bars(tk)
        if bars is None or k is None:
            return False
        reg = regular(bars, datetime.now(ET))
        if k >= len(reg):
            return False
        b = reg.iloc[k]
        return bool(b["Low"] <= level) if down else bool(b["High"] >= level)

    def blink_step(self, t, lo, hi, k):
        """One price range (a closed candle, or the live price) against James's Blink plan. True when the trade closed."""
        e, tk = t["entry"], t["ticker"]
        risk = t.setdefault("risk", e - t["stop"])        # the first risk: the stop moves to entry later
        half = max(1, t.get("shares", 0) // 2) if t.get("shares") else 0
        rest = max(0, t.get("shares", 0) - half)
        if not t["half"]:
            if lo <= t["stop"] and self.confirm(tk, k, t["stop"], True):
                self.close_trade(t, -1.0, "stop", f"🔴 הסטופ נגע ב-{tk}: -1R (תרגול)",
                                 [f"הסטופ ב-{money(t['stop'])} נגע. העסקה נסגרה בהפסד של 1R.", "אין מה לעשות, הפקודה בבלינק כבר ביצעה את זה."])
                return True
            if hi >= e * 1.05 and self.confirm(tk, k, e * 1.05, False):
                t.update(half=True, bank=0.5 * 0.05 * e / risk, stop=e)
                send(f"🟡 {tk} הגיעה ל-+5% ({money(e * 1.05)}): למכור חצי ולהזיז סטופ (תרגול)", "\n".join([
                    f"🟡 {tk} הגיעה ל-{money(e * 1.05)} (+5%). עכשיו בבלינק, לפי הסדר:",
                    "━━━━━━━━━━━━━━━━",
                    "1. לבטל את פקודת הסטופ הפתוחה.",
                    f"2. למכור חצי: {half} מניות, במחיר השוק." if half else "2. למכור חצי מהמניות, במחיר השוק.",
                    f"3. לשים סטופ לוס חדש על השאר ({rest} מניות) ב-{money(e)}, מחיר הכניסה." if half else f"3. לשים סטופ לוס חדש על השאר ב-{money(e)}, מחיר הכניסה.",
                    "━━━━━━━━━━━━━━━━",
                    f"מעכשיו העסקה לא יכולה להפסיד. את השאר נמכור ב-{money(e * 1.15)} (+15%) או לפני הסגירה, ותקבל על זה מייל.",
                    f"מה קורה עכשיו בצוות: {HQ_URL}", "", "תרגול בלבד. חומר לימודי, לא ייעוץ השקעות."]), self.dry)
            return False
        if lo <= t["stop"] and self.confirm(tk, k, t["stop"], True):
            self.close_trade(t, t["bank"], "breakeven", f"⚪ {tk} חזרה לכניסה: הסטופ נגע (תרגול)",
                             [f"החצי השני נמכר בסטופ ב-{money(e)}, מחיר הכניסה.", f"בסך הכול העסקה הרוויחה {t['bank']:+.2f}R מהחצי שנמכר ב-+5%."])
            return True
        if hi >= e * 1.15 and self.confirm(tk, k, e * 1.15, False):
            self.close_trade(t, t["bank"] + 0.5 * 0.15 * e / risk, "target", f"🎯 {tk} הגיעה ל-+15% ({money(e * 1.15)}): למכור את השאר (תרגול)", [
                f"🎯 {tk} הגיעה ל-{money(e * 1.15)} (+15%). עכשיו בבלינק:",
                "1. לבטל את הסטופ במחיר הכניסה.",
                f"2. למכור את השאר ({rest} מניות) במחיר השוק." if half else "2. למכור את כל מה שנשאר, במחיר השוק.",
                f"העסקה הרוויחה בערך {t['bank'] + 0.5 * 0.15 * e / risk:+.2f}R."])
            return True
        return False

    def follow_blink(self, t, reg, now, px=None):
        """James's Blink plan, step by step. Each step is one email telling you the one order to change.
        reg: closed 5-minute candles (None between candles); px: the live price, checked every minute."""
        if reg is not None:
            for k in range(t["k"], len(reg)):
                b = reg.iloc[k]
                first = k == t["i"]                    # the entry bar: only its close counts, we bought during it
                lo, hi = (b["Close"], b["Close"]) if first else (b["Low"], b["High"])
                if self.blink_step(t, lo, hi, k):
                    t["k"] = k + 1
                    return
            t["k"] = len(reg)
        if px is not None and t["open"] and self.blink_step(t, px, px, None):
            return
        if now.time() >= CLOSE_WARN and t["open"] and not t.get("warned"):
            e, risk = t["entry"], t["risk"]
            t["warned"] = True
            last = px if px is not None else (float(reg["Close"].iloc[-1]) if reg is not None and len(reg) else e)
            r = (t["bank"] + 0.5 * (last - e) / risk) if t["half"] else (last - e) / risk
            self.close_trade(t, r, "close", f"⏰ {t['ticker']}: למכור את מה שנשאר לפני הסגירה (תרגול)", [
                f"⏰ השוק נסגר בעוד כרבע שעה. {t['ticker']} עכשיו ב-{money(last)}. בבלינק:",
                "1. לבטל את פקודת הסטופ הפתוחה.",
                "2. למכור את כל מה שנשאר במחיר השוק.",
                f"לפי המחיר עכשיו העסקה בערך {r:+.2f}R."])

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


def run_live(late=False, carry=None):
    """late=True: the afternoon part of a watch-only day (picks up where the morning job stopped)."""
    now = datetime.now(ET)
    today = now.strftime("%Y-%m-%d")
    watch = watch_day(today)
    last_check = WATCH_LAST_ENTRY if watch else LAST_CHECK
    if now.weekday() >= 5 or now.time() > last_check:
        print("Outside the session, nothing to do.")
        return
    if not late and os.path.exists(os.path.join(LOG, "runs.csv")) and today in open(os.path.join(LOG, "runs.csv")).read():
        print("Already ran today.")
        return
    sleep_until(now.replace(hour=START_SCAN.hour, minute=START_SCAN.minute, second=0, microsecond=0))
    pre = hunter.hunt(pre=True) or [{"name": t} for t in premarket_candidates()]
    sleep_until(datetime.now(ET).replace(hour=9, minute=31, second=30, microsecond=0))
    found = hunter.hunt(min_gap_pct=MIN_GAP * 100)            # TradingView: today's gappers, ranked
    tickers = list(dict.fromkeys([x["name"] for x in found] + [x["name"] for x in pre] + yahoo_gainers()))[:MAX_CANDIDATES]
    hot = {x["name"]: x for x in found + pre}
    sleep_until(datetime.now(ET).replace(hour=9, minute=35, second=8, microsecond=0))
    spy = today_bars("SPY")
    if spy is None or not any(spy.index.strftime("%Y-%m-%d") == today):
        print("Market looks closed today (holiday?).")
        return
    metas = {t: m for t in tickers if (m := daily_meta(t, today))}
    print(f"Watching {len(metas)} stocks: {', '.join(metas)}")
    send((f"רוג׳ר ממשיך לצפות עד הסגירה: {len(metas)} מניות" if late else f"רוג׳ר התחיל: עוקב אחרי {len(metas)} מניות היום"),
         ("יום צפייה בלבד, לא קונים. " if watch else "")
         + f"רוג׳ר, הנס וג׳יימס ערים ומחוברים לשוק. הוראות קנייה יגיעו עד {il(datetime.now(ET).replace(hour=last_check.hour, minute=last_check.minute))} שעון ישראל, אם יהיו.\n"
         f"המניות: {', '.join(metas) or 'אין היום מניות בגאפ של 20% ומעלה'}\n\n"
         + ("הכי חמות לפי הנס (TradingView):\n" + "\n".join(hunter.line(hot[t]) for t in list(metas)[:8] if t in hot) + "\n\n" if hot else "")
         + f"מה קורה עכשיו בצוות: {HQ_URL}\n\n"
         "תרגול בלבד. חומר לימודי, לא ייעוץ השקעות.")
    s = Session()
    if carry:            # the morning's orders that are still open, and the stocks already alerted
        s.trades, s.day_r = carry["trades"], carry.get("day_r", 0.0)
        s.alerted |= {t["ticker"] for t in s.trades} | set(carry.get("alerted", []))
    stop_at = WATCH_END if late else FOLLOW_UNTIL
    end = datetime.now(ET).replace(hour=stop_at.hour, minute=stop_at.minute)
    last_entry = datetime.now(ET).replace(hour=last_check.hour, minute=last_check.minute)
    for tr in s.trades:          # open trades carried from the morning are followed even if Hans dropped the stock
        if tr["open"] and tr["ticker"] not in metas and (m := daily_meta(tr["ticker"], today)):
            metas[tr["ticker"]] = m
    first = True
    while True:
        now = datetime.now(ET)
        # every 5-minute candle close: Hans re-scans, Roger reads every chart (he decides on closed 5-minute candles)
        if first or now.minute % 5 == 0:
            first = False
            if now <= last_entry and len(metas) < MAX_CANDIDATES:
                for x in hunter.hunt(min_gap_pct=MIN_GAP * 100, limit=15):
                    if x["name"] not in metas and len(metas) < MAX_CANDIDATES and (m := daily_meta(x["name"], today)):
                        metas[x["name"]] = m
                        print("Hans added", x["name"])
            with ThreadPoolExecutor(16) as ex:
                fetched = dict(zip(metas, ex.map(today_bars, metas)))
            for t, meta in metas.items():      # today's gaps of every watched stock: Roger's "hot market" and gap rank
                b = fetched[t]
                r0 = b[(b.index.time >= time(9, 30)) & (b.index.time < time(16, 0))] if b is not None else None
                if r0 is not None and len(r0) and meta["prev_close"] > 0:
                    s.day_gaps[t] = float(r0["Open"].iloc[0]) / meta["prev_close"] - 1
            for t, meta in metas.items():
                bars = fetched[t]
                if bars is None:
                    continue
                trigs, reg = check(bars, meta, datetime.now(ET))
                if now <= last_entry:
                    for trig in trigs:
                        s.consider(t, trig, now)
                s.follow(t, reg, now)
        else:
            # between candles: open trades are checked against the live price every minute
            for tr in s.trades:
                if tr["open"] and tr["plan"] == BLINK_PLAN and (px := live_price(tr["ticker"])) is not None:
                    s.follow_blink(tr, None, now, px)
        if now >= end or (now > last_entry and not any(x["open"] for x in s.trades)):
            break
        nxt = now + timedelta(minutes=1)
        sleep_until(nxt.replace(second=3, microsecond=0))
    s.summary(datetime.now(ET), len(metas))
    if late:
        os.makedirs(LOG, exist_ok=True)
        json.dump({"date": today, "day_r": s.day_r, "stopped": s.stopped, "trades": s.trades, "done": True},
                  open(OPEN_FILE, "w"), default=float, ensure_ascii=False, indent=1)
    else:
        save_open(s, today)


# ---------- the afternoon run: GitHub stops a job after 6 hours, so a second run follows the Blink plan to the close ----------

OPEN_FILE = os.path.join(LOG, "open_trades.json")


def save_open(s, today):
    still = [t for t in s.trades if t["open"] and t["plan"] == BLINK_PLAN]
    if not still or s.dry:
        return
    os.makedirs(LOG, exist_ok=True)
    json.dump({"date": today, "day_r": s.day_r, "stopped": s.stopped, "trades": still, "done": False},
              open(OPEN_FILE, "w"), default=float, ensure_ascii=False, indent=1)
    print(f"{len(still)} trades still open, the afternoon run will follow them.")


def regular(bars, now):
    bars = bars[bars.index + timedelta(minutes=5) <= now]
    return bars[(bars.index.time >= time(9, 30)) & (bars.index.time < time(16, 0))]


def trades_from_emails(today):
    """Backup when the morning log was not saved: rebuild today's orders from the buy emails (GitHub issues),
    then replay each one quietly up to the morning run's end, so no step email is sent twice."""
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not repo:
        return []
    r = requests.get(f"https://api.github.com/repos/{repo}/issues", timeout=20,
                     params={"state": "all", "since": f"{today}T00:00:00Z", "per_page": 50},
                     headers={"Authorization": "Bearer " + os.environ["GITHUB_TOKEN"], "Accept": "application/vnd.github+json"})
    trades, quiet = [], Session(dry=True)
    end = datetime.now(ET).replace(hour=FOLLOW_UNTIL.hour, minute=FOLLOW_UNTIL.minute, second=0)
    for it in reversed(r.json() if r.ok else []):
        m = re.match(r"🟢 קנייה ([A-Z.]+) ב-([\d.]+)\$ \| טייק פרופיט [^|]+\| סטופ ([\d.]+)\$", it.get("title", ""))
        if not m:
            continue
        sh = re.search(r"כמות:\s+(\d+)", it.get("body") or "")
        tk, e, st = m.group(1), float(m.group(2)), float(m.group(3))
        bars = today_bars(tk)
        if bars is None or e <= st:
            continue
        sent = pd.Timestamp(it["created_at"]).tz_convert(ET)
        reg = regular(bars, end)
        before = [k for k in range(len(reg)) if reg.index[k] + timedelta(minutes=5) <= sent]
        t = {"ticker": tk, "entry": e, "stop": st, "target": e * 1.05, "i": before[-1] if before else 0, "open": True,
             "r": None, "plan": BLINK_PLAN, "setup": "?", "p": None, "shares": int(sh.group(1)) if sh else 0, "half": False, "bank": 0.0, "risk": e - st}
        t["k"] = t["i"]
        quiet.follow_blink(t, reg, end)
        if t["open"]:
            trades.append(t)
    return trades


def alerted_today(today):
    """Tickers already emailed today (from the buy emails), so the afternoon never repeats one."""
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not repo:
        return []
    try:
        r = requests.get(f"https://api.github.com/repos/{repo}/issues", timeout=20,
                         params={"state": "all", "since": f"{today}T00:00:00Z", "per_page": 100},
                         headers={"Authorization": "Bearer " + os.environ["GITHUB_TOKEN"], "Accept": "application/vnd.github+json"})
        return [m.group(1) for it in r.json() if (m := re.match(r"🟢 קנייה ([A-Z.]+) ", it.get("title", "")))]
    except Exception:
        return []


def run_follow():
    today = datetime.now(ET).strftime("%Y-%m-%d")
    d = json.load(open(OPEN_FILE)) if os.path.exists(OPEN_FILE) else {}
    if d.get("date") != today:
        print("No saved open trades from today, rebuilding from today's buy emails.")
        d = {"date": today, "day_r": 0.0, "stopped": False, "trades": trades_from_emails(today), "done": False}
    if watch_day(today) and not d.get("done"):
        return run_live(late=True, carry={**d, "alerted": alerted_today(today)})
    if d.get("done") or not d["trades"]:
        print("Nothing open from today.")
        return
    s = Session()
    s.trades, s.day_r, s.stopped = d["trades"], d["day_r"], d["stopped"]
    while True:
        now = datetime.now(ET)
        for t in s.trades:
            if t["open"] and (bars := today_bars(t["ticker"])) is not None:
                s.follow_blink(t, regular(bars, now), now, live_price(t["ticker"]))
        json.dump({**d, "day_r": s.day_r, "trades": s.trades}, open(OPEN_FILE, "w"), default=float, ensure_ascii=False, indent=1)
        if not any(t["open"] for t in s.trades) or now.time() >= CLOSE_WARN:
            break
        nxt = now + timedelta(minutes=1)
        sleep_until(nxt.replace(second=3, microsecond=0))
    json.dump({**d, "day_r": s.day_r, "trades": s.trades, "done": True}, open(OPEN_FILE, "w"), default=float, ensure_ascii=False, indent=1)


def replay(path):
    """Feed a saved day to the live code candle by candle. Prints what would be emailed."""
    meta = json.load(open(path.replace(".csv", ".json")))
    bars = pd.read_csv(path, index_col=0)
    bars = bars[pd.to_numeric(bars["Close"], errors="coerce").notna()].astype(float)
    bars.index = pd.to_datetime(bars.index, utc=True).tz_convert(ET)
    day = bars.index[-1]
    s = Session(dry=True)
    s.roger.p["threshold"] = float(os.environ.get("REPLAY_THRESHOLD", s.roger.p["threshold"]))
    if s.frozen is not None and "REPLAY_THRESHOLD" in os.environ:
        s.frozen.m["threshold"] = float(os.environ["REPLAY_THRESHOLD"])
    t = day.replace(hour=9, minute=35, second=20)
    until = CLOSE_WARN if BLINK_PLAN else FOLLOW_UNTIL
    while t.time() <= until:
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
    ap.add_argument("--follow", action="store_true", help="afternoon run: follow open Blink trades to the close")
    ap.add_argument("--alarm", action="store_true", help="email that today's run failed")
    a = ap.parse_args()
    if a.alarm:
        send("רוג׳ר לא רץ היום כמו שצריך", "משהו נתקע בהפעלה היומית, ולכן ייתכן שלא יגיעו הוראות היום. ג׳ורג׳ יבדוק.")
    elif a.test_email:
        ok = send("בדיקה: רוג׳ר מחובר למייל", "אם קיבלת את המייל הזה, הוראות הקנייה של רוג׳ר יגיעו לכאן.\n"
                  "בכל הוראה תראה למעלה: מחיר קנייה, כמות וסכום, טייק פרופיט וסטופ.\n\n"
                  f"מה קורה עכשיו בצוות, בזמן אמת: {HQ_URL}\n\nתרגול בלבד. חומר לימודי, לא ייעוץ השקעות.")
        sys.exit(0 if ok else 1)
    elif a.replay:
        replay(a.replay)
    elif a.follow:
        run_follow()
    else:
        run_live()
