"""Hans: collects past gap-up days and turns each one into a quiz.

Hans replays each day bar by bar. When one of the 5 setups triggers, he stops
the tape and shows Roger only what a trader could see at that moment.
The rest of the day stays hidden until Roger has answered.
"""
import json
import os
import random
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

ET = ZoneInfo("America/New_York")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
BARS = os.path.join(DATA, "bars")
UNIVERSE_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt"

# Base filters from the research doc (section "the strict filter").
MIN_GAP = 0.20
MIN_PRICE, MAX_PRICE = 1.0, 20.0
MIN_DAY_VOLUME = 1_000_000

from setups import DETECTORS, SETUPS

CONTEXT_FEATURES = [
    "gap_pct",           # open vs previous close
    "pm_vol_ratio",      # premarket volume / 20-day average daily volume
    "vol_ratio",         # volume so far today / 20-day average daily volume
    "change_from_open",  # entry price vs today's open
    "vwap_dist",         # entry price vs VWAP
    "hod_dist",          # entry price vs the high of the day so far (incl. premarket)
    "stop_width",        # distance to the stop, as % of price
    "minutes_in",        # minutes since 9:30
    "log_price",
    "recent_vol_ratio",  # volume of the last 3 bars vs the average bar so far
    "pm_high_dist",      # entry price vs the premarket high
    "day_range",         # how wide the day has been so far (high / low - 1)
]
FEATURES = CONTEXT_FEATURES + ["setup_" + s for s in SETUPS]


# ---------- data collection (needs network access to Yahoo + nasdaqtrader) ----------

def load_universe(refresh=False):
    path = os.path.join(DATA, "universe.txt")
    if os.path.exists(path) and not refresh:
        return open(path).read().split()
    import requests
    txt = requests.get(UNIVERSE_URL, timeout=30).text
    rows = [l.split("|") for l in txt.splitlines()[1:] if "|" in l]
    # columns: Nasdaq Traded|Symbol|Security Name|Listing Exchange|Market Category|ETF|Round Lot|Test Issue|...
    syms = sorted({r[1] for r in rows
                   if len(r) > 7 and r[0] == "Y" and r[5] == "N" and r[7] == "N"
                   and r[1].isalpha() and len(r[1]) <= 5})
    os.makedirs(DATA, exist_ok=True)
    open(path, "w").write("\n".join(syms))
    return syms


YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/"
_session = None


def _yahoo(ticker, **params):
    """Ask Yahoo's chart API directly (no yfinance needed). Returns a DataFrame in ET."""
    import requests, time as _t
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers["User-Agent"] = "Mozilla/5.0"
    for attempt in range(3):
        try:
            r = _session.get(YAHOO + ticker, params=params, timeout=20)
            if r.status_code == 429:
                _t.sleep(2 + 3 * attempt)
                continue
            if r.status_code != 200:
                return None
            res = r.json()["chart"]["result"]
            if not res or "timestamp" not in res[0]:
                return None
            res = res[0]
            q = res["indicators"]["quote"][0]
            df = pd.DataFrame({"Open": q["open"], "High": q["high"], "Low": q["low"],
                               "Close": q["close"], "Volume": q["volume"]},
                              index=pd.to_datetime(res["timestamp"], unit="s", utc=True).tz_convert(ET))
            return df.dropna()
        except Exception:
            _t.sleep(1)
    return None


def _gaps_for(t, rng, min_gap=MIN_GAP):
    d = _yahoo(t, range=rng, interval="1d")
    if d is None or len(d) < 22:
        return []
    prev_close = d["Close"].shift(1)
    avg_vol = d["Volume"].shift(1).rolling(20).mean()
    gap = d["Open"] / prev_close - 1
    hit = (gap >= min_gap) & d["Open"].between(MIN_PRICE, MAX_PRICE) & (d["Volume"] >= MIN_DAY_VOLUME)
    return [{"ticker": t, "date": day.strftime("%Y-%m-%d"),
             "prev_close": float(prev_close[day]), "avg_vol20": float(avg_vol[day])}
            for day in d.index[hit.fillna(False)]]


def find_gappers(tickers, period="3mo", workers=16, min_gap=MIN_GAP):
    """Daily scan: every day a stock opened 20%+ above the previous close."""
    from concurrent.futures import ThreadPoolExecutor
    found = []
    with ThreadPoolExecutor(workers) as ex:
        for i, res in enumerate(ex.map(lambda t: _gaps_for(t, period, min_gap), tickers)):
            found.extend(res)
            if i % 1000 == 0:
                print(f"  scanned {i}/{len(tickers)}, gap days so far: {len(found)}", flush=True)
    return found


def fetch_intraday(item):
    """Save 5-minute bars (with premarket) for one gap day. Yahoo keeps ~60 days of 5m bars."""
    path = os.path.join(BARS, f"{item['ticker']}_{item['date']}.csv")
    if os.path.exists(path):
        return False
    day = datetime.strptime(item["date"], "%Y-%m-%d").replace(tzinfo=ET)
    df = _yahoo(item["ticker"], interval="5m", includePrePost="true",
                period1=int(day.timestamp()), period2=int((day + timedelta(days=1)).timestamp()))
    if df is None or df.empty:
        return False
    os.makedirs(BARS, exist_ok=True)
    df.to_csv(path)
    json.dump(item, open(path.replace(".csv", ".json"), "w"))
    return True


def collect(min_gap=MIN_GAP):
    """Grow the library. Every run adds the newest gap days."""
    tickers = load_universe()
    gappers = find_gappers(tickers, min_gap=min_gap)
    # skip today until the session is over, so a half-finished day is never saved
    now = datetime.now(ET)
    if now.time() < time(16, 30):
        gappers = [g for g in gappers if g["date"] != now.strftime("%Y-%m-%d")]
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(8) as ex:
        new = sum(ex.map(fetch_intraday, gappers))
    return len(gappers), new


# ---------- turning a saved day into a quiz ----------

def _outcome(reg, i, entry, stop, target_mult=2.0):
    """Hidden part: stop -1R, target +target_mult R, else exit at the close.
    target_mult=None means no target: hold until the stop or the close."""
    risk = entry - stop
    target = entry + target_mult * risk if target_mult else float("inf")
    for k in range(i, len(reg)):
        b = reg.iloc[k]
        if b["Low"] <= stop:          # assume the stop fills first when both happen in one bar
            return {"r": -1.0, "how": "stop"}
        if b["High"] >= target and (k > i or b["Close"] >= target):
            return {"r": float(target_mult), "how": "target"}
    return {"r": round((float(reg["Close"].iloc[-1]) - entry) / risk, 3), "how": "close"}


# James's menu of exit plans: which stop, and which target (in R of that stop).
STOPS = {"setup": 1.0, "tight": 0.5, "wide": 1.5}   # share of the setup's own stop distance
TARGETS = [1.0, 1.5, 2.0, 3.0, None]                 # None = no target, hold to the close
PCT_TARGETS = [0.05, 0.08, 0.10, 0.15]               # targets as % above the entry
PLANS = [f"{s}_{t if t else 'close'}" for s in STOPS for t in TARGETS] + \
        [f"{s}_p{int(p * 100)}" for s in STOPS for p in PCT_TARGETS]
MIN_TARGET_PCT = 0.05     # the user's rule: every trade aims for at least +5%
DEFAULT_PLAN = "setup_p5"


def target_pct(plan, stop_width):
    """How far above the entry this plan's target is, as a share of price. None = no fixed target."""
    if plan == "half_p5_chandelier":
        return 0.05
    if plan in TACTICS or plan.endswith("_close"):
        return None
    s, t = plan.split("_")
    if t.startswith("p"):
        return int(t[1:]) / 100
    return float(t) * STOPS[s] * stop_width


def allowed(plan, stop_width):
    tp = target_pct(plan, stop_width)
    return tp is not None and tp >= MIN_TARGET_PCT - 1e-9
# James's tactics: exits that react to how the trade develops (all with the setup stop).
TACTICS = ["be_after_1r", "trail_ema9", "half_1r_trail", "trail_prev_low", "time_60m",
           "chandelier", "half_p5_chandelier"]
PLANS = PLANS + TACTICS


def _tactic(reg, i, entry, stop, kind, ema):
    """Walk the trade bar by bar. R is measured on the original risk."""
    risk = entry - stop
    st, half_done, banked = stop, False, 0.0
    atr = (reg["High"] - reg["Low"]).rolling(14, min_periods=1).mean()
    peak = entry
    for k in range(i, len(reg)):
        b = reg.iloc[k]
        if b["Low"] <= st:
            r = (st - entry) / risk
            return round(banked + (0.5 if half_done else 1.0) * r, 3)
        up = (b["High"] - entry) / risk
        if kind == "be_after_1r" and up >= 1:
            st = max(st, entry)
            if up >= 3:
                return 3.0
        elif kind == "half_1r_trail":
            if not half_done and up >= 1:
                half_done, banked, st = True, 0.5, max(st, entry)
            if half_done and k > i and b["Close"] < ema.iloc[k]:
                return round(banked + 0.5 * (b["Close"] - entry) / risk, 3)
        elif kind == "trail_ema9" and k > i and b["Close"] < ema.iloc[k]:
            return round((b["Close"] - entry) / risk, 3)
        elif kind == "trail_prev_low" and k > i:
            st = max(st, reg["Low"].iloc[k - 1]) if up >= 1 else st
        elif kind == "chandelier":
            # Chandelier exit (LeBeau): trail 3 ATR under the highest high since entry; only moves up
            peak = max(peak, b["High"])
            st = max(st, peak - 3 * atr.iloc[k])
        elif kind == "half_p5_chandelier":
            # the user's rule: take half at +5%, let the rest run with the Chandelier stop
            if not half_done and b["High"] >= entry * 1.05:
                half_done, banked, st = True, 0.5 * (0.05 * entry) / risk, max(st, entry)
            peak = max(peak, b["High"])
            if half_done:
                st = max(st, peak - 3 * atr.iloc[k])
        elif kind == "time_60m" and k - i >= 12:
            return round((b["Close"] - entry) / risk, 3)
    last = (float(reg["Close"].iloc[-1]) - entry) / risk
    return round(banked + (0.5 if half_done else 1.0) * last, 3)


def _all_plans(reg, i, entry, stop, ema=None):
    out = {}
    if ema is not None:
        for t in TACTICS:
            out[t] = float(_tactic(reg, i, entry, stop, t, ema))
    for s, k in STOPS.items():
        st = entry - k * (entry - stop)
        if st <= 0:
            continue
        for t in TARGETS:
            out[f"{s}_{t if t else 'close'}"] = float(_outcome(reg, i, entry, st, t)["r"])
        for p in PCT_TARGETS:
            # R is measured on the original setup risk, so plans stay comparable
            r = _outcome(reg, i, entry, st, p * entry / (entry - st))["r"]
            out[f"{s}_p{int(p * 100)}"] = float(r * (entry - st) / (entry - stop))
    return out


def build_cases(bars: pd.DataFrame, meta: dict):
    """Run the 5 setup detectors on one day. Each trigger becomes one quiz:
    (setup, visible features, hidden outcome)."""
    idx = pd.to_datetime(bars.index, utc=True).tz_convert(ET)
    bars = bars.copy()
    bars.index = idx
    pm = bars[bars.index.time < time(9, 30)]
    reg = bars[(bars.index.time >= time(9, 30)) & (bars.index.time < time(16, 0))]
    avg_vol = meta.get("avg_vol20", 0)
    if len(reg) < 12 or avg_vol <= 0:
        return []
    typical = (reg["High"] + reg["Low"] + reg["Close"]) / 3
    vwap = (typical * reg["Volume"]).cumsum() / reg["Volume"].cumsum().replace(0, np.nan)
    vwap = vwap.ffill().fillna(reg["Close"])
    ctx = {
        "pm_high": float(pm["High"].max()) if len(pm) else float(reg["Open"].iloc[0]),
        "vwap": vwap,
        "ema9": reg["Close"].ewm(span=9, adjust=False).mean(),
        "prev_close": meta.get("prev_close"),
    }
    open_ = float(reg["Open"].iloc[0])
    pm_vol = float(pm["Volume"].sum())
    out = []
    for name, detect in DETECTORS.items():
        hit = detect(reg, ctx)
        if not hit:
            continue
        i, entry, stop = hit
        entry, stop = float(entry), float(stop)
        risk = entry - stop
        if risk <= 0 or risk / entry > 0.25:
            continue
        hod = max(ctx["pm_high"], float(reg["High"].iloc[:i].max()))
        feats = {
            "gap_pct": open_ / meta["prev_close"] - 1,
            "pm_vol_ratio": pm_vol / avg_vol,
            "vol_ratio": (pm_vol + float(reg["Volume"].iloc[:i].sum())) / avg_vol,
            "change_from_open": entry / open_ - 1,
            "vwap_dist": entry / float(vwap.iloc[i - 1]) - 1,
            "hod_dist": entry / hod - 1,
            "stop_width": risk / entry,
            "minutes_in": (reg.index[i] - reg.index[0]).total_seconds() / 60,
            "log_price": float(np.log(entry)),
            "recent_vol_ratio": float(reg["Volume"].iloc[max(0, i - 3):i].mean()
                                      / max(reg["Volume"].iloc[:i].mean(), 1.0)),
            "pm_high_dist": entry / ctx["pm_high"] - 1 if ctx["pm_high"] > 0 else 0.0,
            "day_range": hod / max(float(reg["Low"].iloc[:i].min()), 1e-6) - 1,
        }
        for s in SETUPS:
            feats["setup_" + s] = 1.0 if s == name else 0.0
        o = _outcome(reg, i, entry, stop)
        o["plans"] = _all_plans(reg, i, entry, stop, ctx["ema9"])
        o["r"] = o["plans"][DEFAULT_PLAN]          # default exit: setup stop, +5% target
        o.update({"entry": round(entry, 4), "stop": round(stop, 4),
                  "time": reg.index[i].strftime("%H:%M")})
        out.append((name, feats, o))
    return out


def _code_version():
    """Changes whenever the setup rules or Hans's quiz-building change, so the cache refreshes."""
    import hashlib
    here = os.path.dirname(os.path.abspath(__file__))
    h = hashlib.sha1()
    for name in ("hans.py", "setups.py"):
        h.update(open(os.path.join(here, name), "rb").read())
    return h.hexdigest()[:12]


MIN_STOP_WIDTH = 0.005   # a stop closer than 0.5% is inside the spread: not a real trade
MAX_R = 10.0             # one trade counts as at most +10R, so a bad data tick can't fake a profit


def clean(cases):
    """Drop setups with an unreal stop (too close or over 25%) and cap each result at +10R."""
    out = []
    for c in cases:
        sw = c["features"]["stop_width"]
        if not (MIN_STOP_WIDTH <= sw <= 0.25):
            continue
        o = c["outcome"]
        plans = {k: min(v, MAX_R) for k, v in o["plans"].items()}
        out.append({**c, "outcome": {**o, "plans": plans, "r": min(o["r"], MAX_R)}})
    return out


def load_library():
    """All quiz cases from the saved days. Results are cached per day, so only new days
    (or a change in the rules) cost time."""
    import pickle
    cases = []
    if not os.path.isdir(BARS):
        return cases
    cache_path = os.path.join(DATA, "cases_cache.pkl")
    version = _code_version()
    cache = {}
    try:
        stored = pickle.load(open(cache_path, "rb"))
        if stored.get("version") == version:
            cache = stored["days"]
    except Exception:
        pass
    changed = False
    for f in sorted(os.listdir(BARS)):
        if not f.endswith(".csv"):
            continue
        if f not in cache:
            meta = json.load(open(os.path.join(BARS, f.replace(".csv", ".json"))))
            bars = pd.read_csv(os.path.join(BARS, f), index_col=0)
            bars = bars[pd.to_numeric(bars["Close"], errors="coerce").notna()].astype(float)
            cache[f] = [{"id": f"{f[:-4]}_{setup}", "ticker": meta["ticker"], "date": meta["date"],
                         "setup": setup, "features": feats, "outcome": outcome}
                        for setup, feats, outcome in build_cases(bars, meta)]
            changed = True
        cases.extend(cache[f])
    if changed:
        tmp = cache_path + ".tmp"
        pickle.dump({"version": version, "days": cache}, open(tmp, "wb"))
        os.replace(tmp, cache_path)
    return clean(cases)
    for f in sorted(os.listdir(BARS)):
        if not f.endswith(".csv"):
            continue
        meta = json.load(open(os.path.join(BARS, f.replace(".csv", ".json"))))
        bars = pd.read_csv(os.path.join(BARS, f), index_col=0)
        bars = bars[pd.to_numeric(bars["Close"], errors="coerce").notna()].astype(float)
        for setup, feats, outcome in build_cases(bars, meta):
            cases.append({"id": f"{f[:-4]}_{setup}", "ticker": meta["ticker"], "date": meta["date"],
                          "setup": setup, "features": feats, "outcome": outcome})
    return cases


def split(cases, test_share=0.25):
    """Newest days go to the exam set. Roger never learns from them, so the exam score is honest."""
    days = sorted({c["date"] for c in cases})
    cut = days[int(len(days) * (1 - test_share))] if days else ""
    return [c for c in cases if c["date"] < cut], [c for c in cases if c["date"] >= cut]


def quiz(case):
    """What Hans shows Roger: ticker, date and the 9:45 picture. No outcome."""
    return {"id": case["id"], "ticker": case["ticker"], "date": case["date"],
            "setup": case["setup"], "features": case["features"]}


def reveal(case):
    return case["outcome"]


def shuffled(cases, seed=None):
    c = list(cases)
    random.Random(seed).shuffle(c)
    return c


if __name__ == "__main__":
    # Hans's search hour: cast a wider net (gap 10%+ by default) and log what he found.
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-gap", type=float, default=0.10)
    args = ap.parse_args()
    from hq_status import set_status
    set_status("hans", "working", f"סורק את כל המניות ומחפש ימי גאפ של {args.min_gap:.0%} ומעלה")
    before = len([f for f in os.listdir(BARS) if f.endswith(".csv")]) if os.path.isdir(BARS) else 0
    found, new = collect(min_gap=args.min_gap)
    log = os.path.join(DATA, "hans_log.csv")
    first = not os.path.exists(log)
    with open(log, "a") as f:
        if first:
            f.write("time_utc,min_gap,gap_days_found,new_days_saved,library_days_total\n")
        f.write(f"{datetime.now(ZoneInfo("UTC")):%Y-%m-%d %H:%M},{args.min_gap},{found},{new},{before + new}\n")
    set_status("hans", "resting", f"סיים חיפוש: {new} ימים חדשים, הספרייה {before + new:,} ימים")
    print(f"Hans found {found} gap days (gap {args.min_gap:.0%}+), saved {new} new ones; library now {before + new}")
