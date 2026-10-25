"""Hans's stock hunter: finds today's hottest US small caps, fast.

Main source is TradingView's market scanner, the same data behind its "Top gainers" and
"Pre-market gainers" pages (US prices come from Cboe in real time). Yahoo's gainers lists
are the backup if TradingView does not answer.

Each stock gets a "hotness" score from the 5 pillars: how much it is up, how unusual
today's volume is, a small float, and a price between $1 and $20.

  python hunter.py              show the list right now
  python hunter.py --pre        pre-market list only
"""
import argparse
import math

import requests

TV = "https://scanner.tradingview.com/america/scan"
COLS = ["name", "close", "change", "gap", "premarket_change", "premarket_volume",
        "relative_volume_10d_calc", "volume", "float_shares_outstanding", "exchange", "change_from_open"]
PRICE = (1.0, 20.0)
BASE = [{"left": "type", "operation": "in_range", "right": ["stock", "dr"]},
        {"left": "exchange", "operation": "in_range", "right": ["NASDAQ", "NYSE", "AMEX"]}]


def _tv(filters, sort_by, limit=60):
    q = {"columns": COLS, "filter": BASE + filters, "range": [0, limit],
         "sort": {"sortBy": sort_by, "sortOrder": "desc"}}
    r = requests.post(TV, json=q, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    out = []
    for row in r.json().get("data", []):
        d = dict(zip(COLS, row["d"]))
        if not str(d["name"]).isalpha():          # skip warrants, units, preferreds
            continue
        out.append(d)
    return out


def hotness(s):
    up = max(s.get("change") or 0, s.get("gap") or 0, s.get("premarket_change") or 0)
    rv = min(max(s.get("relative_volume_10d_calc") or 1, 1), 100)
    fl = s.get("float_shares_outstanding")
    float_bonus = 1.5 if fl and fl < 10e6 else 1.25 if fl and fl < 20e6 else 1.0
    return round(up * math.sqrt(rv) * float_bonus, 1)


def premarket(min_pct=10):
    """Before 9:30 New York: stocks up min_pct%+ in the pre-market with real pre-market volume."""
    return _tv([{"left": "premarket_change", "operation": "greater", "right": min_pct},
                {"left": "premarket_volume", "operation": "greater", "right": 50_000},
                {"left": "close", "operation": "in_range", "right": [PRICE[0] * 0.7, PRICE[1] * 1.3]}],
               "premarket_change")


def gappers(min_gap_pct=20):
    """From 9:30: stocks that opened min_gap_pct%+ above yesterday's close (what Roger trained on)."""
    return _tv([{"left": "gap", "operation": "greater", "right": min_gap_pct},
                {"left": "close", "operation": "in_range", "right": list(PRICE)},
                {"left": "volume", "operation": "greater", "right": 100_000}], "gap")


def runners(min_pct=10):
    """During the day: biggest gainers right now with heavy volume."""
    return _tv([{"left": "change", "operation": "greater", "right": min_pct},
                {"left": "close", "operation": "in_range", "right": list(PRICE)},
                {"left": "volume", "operation": "greater", "right": 300_000}], "change")


def yahoo(min_pct=15):
    out = []
    for scr in ("day_gainers", "small_cap_gainers"):
        try:
            r = requests.get("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved",
                             params={"scrIds": scr, "count": 100}, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
            for q in r.json()["finance"]["result"][0]["quotes"]:
                if q.get("regularMarketChangePercent", 0) >= min_pct and str(q["symbol"]).isalpha():
                    out.append({"name": q["symbol"], "close": q.get("regularMarketPrice"),
                                "change": q.get("regularMarketChangePercent"),
                                "volume": q.get("regularMarketVolume")})
        except Exception as e:
            print("Yahoo", scr, "failed:", e)
    return out


def hunt(pre=False, min_gap_pct=20, limit=40):
    """One merged, ranked list. Never raises: a dead source is skipped."""
    found = {}
    sources = [("premarket", premarket)] if pre else [("gap", lambda: gappers(min_gap_pct)), ("premarket", premarket), ("runner", runners)]
    for tag, fn in sources:
        try:
            for s in fn():
                found.setdefault(s["name"], {**s, "why": tag})
        except Exception as e:
            print("TradingView", tag, "failed:", e)
    if not found:
        for s in yahoo():
            found.setdefault(s["name"], {**s, "why": "yahoo"})
    ranked = sorted(found.values(), key=hotness, reverse=True)
    for s in ranked:
        s["hot"] = hotness(s)
    return ranked[:limit]


def line(s):
    pct = lambda v: f"{v:+.0f}%" if isinstance(v, (int, float)) else "-"
    fl = s.get("float_shares_outstanding")
    rv = s.get("relative_volume_10d_calc")
    return (f"{s['name']:<6} {s.get('close') or 0:>7.2f}$  היום {pct(s.get('change'))}  גאפ {pct(s.get('gap'))}  "
            f"פרה {pct(s.get('premarket_change'))}  נפח פי {rv:.0f}" if rv else f"{s['name']:<6}") + \
           (f"  פלוט {fl / 1e6:.1f}M" if fl else "")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pre", action="store_true")
    a = ap.parse_args()
    for s in hunt(pre=a.pre, limit=20):
        print(f"{s['hot']:>7}  {line(s)}")
