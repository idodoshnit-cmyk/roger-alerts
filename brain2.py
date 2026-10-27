"""Brain 2 (2026-10-27): rebuild Roger's brain with more chart facts (volume, candles), walk-forward.

Step 1 (cache): for every library chart with a stop at most 12% below entry, read the 5-min bars and
compute new facts seen BEFORE the entry candle, plus the price path after entry.
Step 2: train Roger on the old facts and on old+new facts, fold by fold (only past days),
and score the next days under James's Blink plan (after 0.2% costs).
Practice = folds 1-4. The final fold is scored only for the setting chosen on practice.

Run: python brain2.py cache   then   python brain2.py test
"""
import json
import os
import pickle
import sys
from concurrent.futures import ProcessPoolExecutor
from datetime import time

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "data", "brain2_cache.pkl")
ET = "America/New_York"
COST = 0.002
MAXSTOP = 0.12
CACHE_ALL = os.path.join(HERE, "data", "brain2_cache_all.pkl")
NEW = ["buyer6", "buyer3", "spike", "body", "close_loc", "upper_wick", "green_streak", "log_dollar_vol",
       "ema9_dist", "tight3", "ret3", "log_pm_vol", "vol_trend", "bars_above_vwap", "first_bar_ret"]


def new_feats(reg, i, pm_volume):
    """The 15 new chart facts, from the regular-session bars before the entry bar i (live uses the same code)."""
    pre = reg.iloc[:i]
    o, h, l, c, v = (pre[x].values.astype(float) for x in ("Open", "High", "Low", "Close", "Volume"))
    g = c >= o

    def share(n):
        vv, gg = v[-n:], g[-n:]
        return float(vv[gg].sum() / vv.sum()) if vv.sum() > 0 else 0.5
    rng = max(h[-1] - l[-1], 1e-9)
    streak = 0
    for x in g[::-1]:
        if not x:
            break
        streak += 1
    ema = pd.Series(c).ewm(span=9, adjust=False).mean().values[-1]
    tp = (h + l + c) / 3
    vwap = np.cumsum(tp * v) / np.maximum(np.cumsum(v), 1e-9)
    return {
        "buyer6": share(6), "buyer3": share(3),
        "spike": float(v[-1] / max(v.mean(), 1e-9)),
        "body": float((c[-1] - o[-1]) / rng), "close_loc": float((c[-1] - l[-1]) / rng),
        "upper_wick": float((h[-1] - max(c[-1], o[-1])) / rng), "green_streak": streak,
        "log_dollar_vol": float(np.log1p((c * v).sum())), "ema9_dist": float(c[-1] / ema - 1),
        "tight3": float((h[-3:].max() - l[-3:].min()) / c[-1]), "ret3": float(c[-1] / o[-3:][0] - 1),
        "log_pm_vol": float(np.log1p(pm_volume)),
        "vol_trend": float(v[-3:].mean() / max(v[:-3].mean(), 1e-9)) if len(v) > 3 else 1.0,
        "bars_above_vwap": float((c > vwap).mean()), "first_bar_ret": float(c[0] / o[0] - 1),
    }


def one(args):
    key, date, t_entry, entry, stop = args
    try:
        b = pd.read_csv(os.path.join(HERE, "data", "bars", key + ".csv"), index_col=0)
        b = b[pd.to_numeric(b["Close"], errors="coerce").notna()].astype(float)
        idx = pd.to_datetime(b.index, utc=True).tz_convert(ET)
        b.index = idx
        pm = b[idx.time < time(9, 30)]
        reg = b[(idx.time >= time(9, 30)) & (idx.time < time(16, 0))]
        i = int(np.searchsorted(reg.index, pd.Timestamp(f"{date} {t_entry}").tz_localize(ET)))
        if i < 1 or i >= len(reg):
            return key, None
        f = new_feats(reg, i, float(pm["Volume"].sum()))
        path = {"h": reg["High"].values[i:] / entry - 1, "l": reg["Low"].values[i:] / entry - 1,
                "c": reg["Close"].values[i:] / entry - 1, "stop_pct": 1 - stop / entry}
        return key, (f, path)
    except Exception:
        return key, None


def blink(p):
    """Stop on all; at +5% sell half and move the stop to entry; rest at +15% or the close.
    A candle that touches both counts as the stop."""
    st, done, bank = -p["stop_pct"], False, 0.0
    for k in range(len(p["h"])):
        if p["l"][k] <= st:
            return bank + (0.5 if done else 1.0) * st - COST
        if not done and p["h"][k] >= 0.05:
            done, bank, st = True, 0.025, 0.0
        if done and p["h"][k] >= 0.15:
            return bank + 0.5 * 0.15 - COST
    last = p["c"][-1] if len(p["c"]) else 0.0
    return bank + (0.5 if done else 1.0) * last - COST


def cache():
    import hans
    allw = len(sys.argv) > 2 and sys.argv[2] == "all"
    cases = [c for c in hans.load_library() if allw or c["features"]["stop_width"] <= MAXSTOP]
    jobs, seen = [], set()
    for c in cases:
        k = f"{c['ticker']}_{c['date']}|{c['setup']}|{c['outcome']['time']}"
        if k in seen:
            continue
        seen.add(k)
        jobs.append((f"{c['ticker']}_{c['date']}", c["date"], c["outcome"]["time"], c["outcome"]["entry"], c["outcome"]["stop"]))
    out = {}
    with ProcessPoolExecutor(4) as ex:
        for n, (args, res) in enumerate(zip(jobs, ex.map(one, jobs, chunksize=50))):
            out[f"{args[0]}|{args[2]}|{args[3]}|{args[4]}"] = res[1]
            if n % 2000 == 0:
                print("cached", n, "of", len(jobs), flush=True)
    pickle.dump(out, open(CACHE_ALL if allw else CACHE, "wb"))
    print("done", len(out), sum(v is not None for v in out.values()), flush=True)


def key_of(c):
    return f"{c['ticker']}_{c['date']}|{c['outcome']['time']}|{c['outcome']['entry']}|{c['outcome']['stop']}"


def cap3(rows):
    by = {}
    for r in rows:
        by.setdefault(r["date"], []).append(r)
    out = []
    for d, rs in by.items():
        rs.sort(key=lambda r: r["time"])
        seen = set()
        for r in rs:
            if r["ticker"] in seen or len(seen) >= 3:
                continue
            seen.add(r["ticker"])
            out.append(r)
    return out


def stats(x):
    x = np.array(x, dtype=float)
    n = len(x)
    if n < 2:
        return {"n": n}
    m, se = x.mean(), x.std(ddof=1) / np.sqrt(n)
    return {"n": n, "win": float((x > 0).mean()), "pct": float(m), "lo": float(m - 1.96 * se), "hi": float(m + 1.96 * se)}


def test():
    import coach
    import hans
    import masters
    import night
    FREEZE = os.path.join(HERE, "data", "monday_freeze")
    C = pickle.load(open(CACHE, "rb"))
    cases = hans.load_library()
    masters.ACTIVE = json.load(open(os.path.join(FREEZE, "master_groups.json")))
    masters.build(cases)
    night.HIDE_STOP = True
    for c in cases:
        night.DAY.setdefault(c["date"], {})[c["ticker"]] = c["features"]["gap_pct"]
    rules = [r for r in json.load(open(os.path.join(FREEZE, "coach_rules.json"))) if not r.get("rejected")]
    plan = coach.PLAN
    cases = [c for c in cases if c["features"]["stop_width"] <= MAXSTOP and C.get(key_of(c))]
    for c in cases:
        c["_f"], c["_p"] = C[key_of(c)]
        c["_r"] = blink(c["_p"])
    gates = {"frozen_gate": lambda c: hans.allowed(plan, c["features"]["stop_width"]) and not coach.blocked(c, rules),
             "all_charts": lambda c: True}
    days = sorted({c["date"] for c in cases})
    size = len(days) // night.CHUNKS
    edges = [days[k * size] for k in range(night.CHUNKS)] + ["9999"]
    print("charts", len(cases), "days", len(days), flush=True)

    def X(cs, new):
        a = night.matrix(cs)
        if new:
            a = np.hstack([a, np.array([[c["_f"][f] for f in NEW] for c in cs], dtype=float)])
        return np.nan_to_num(a, nan=0.0, posinf=0.0, neginf=0.0)

    variants = {}
    for gname, gate in gates.items():
        for new in (False, True):
            for label in ("plan", "blink"):
                name = f"{gname}|{'old+new' if new else 'old'}|{label}"
                scored = []
                for k in range(1, night.CHUNKS):
                    past = [c for c in cases if c["date"] < edges[k] and gate(c)]
                    now = [c for c in cases if edges[k] <= c["date"] < edges[k + 1] and gate(c)]
                    y = np.array([(c["outcome"]["plans"][plan] > 0) if label == "plan" else (c["_r"] > 0) for c in past], dtype=float)
                    m = night.Trees(seed=0).fit(X(past, new), y)
                    pp = m.proba(X(past, new))
                    qs = {s: float(np.quantile(pp, 1 - s)) for s in (0.01, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15)}
                    for c, p in zip(now, m.proba(X(now, new))):
                        scored.append({"fold": k, "date": c["date"], "ticker": c["ticker"], "time": c["outcome"]["time"],
                                       "p": float(p), "q": qs, "r": c["_r"]})
                variants[name] = scored
                print("trained", name, flush=True)
    pickle.dump(variants, open(os.path.join(HERE, "data", "brain2_scored.pkl"), "wb"))

    rows = []
    for name, sc in variants.items():
        for s in (0.01, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15):
            pr = [r for r in sc if r["fold"] <= 4 and r["p"] >= r["q"][s]]
            sig = stats([r["r"] for r in pr])
            real = stats([r["r"] for r in cap3(pr)])
            folds = []
            for k in (1, 2, 3, 4):
                fs = stats([r["r"] for r in cap3([r for r in pr if r["fold"] == k])])
                folds.append(round(fs.get("win", 0), 2))
            rows.append({"variant": name, "share": s, "signal": sig, "real": real, "folds": folds})
    json.dump(rows, open(os.path.join(HERE, "data", "brain2_practice.json"), "w"), indent=1)
    for r in sorted(rows, key=lambda r: -r["real"].get("lo", -9)):
        s, q = r["signal"], r["real"]
        if q.get("n", 0) >= 40:
            print(f"{r['variant']:32s} top{r['share']:.0%}  signal n={s['n']} win={s['win']:.0%} {s['pct']*100:+.2f}%  |  real n={q['n']} win={q['win']:.0%} {q['pct']*100:+.2f}% [{q['lo']*100:+.2f},{q['hi']*100:+.2f}] folds={r['folds']}")


if __name__ == "__main__":
    {"cache": cache, "test": test}[sys.argv[1]]()
