"""The 5 entry setups from the research doc, as rules on 5-minute bars.

Each detector walks the regular session bar by bar and only uses bars that
have already closed. When a setup triggers it returns the bar where the buy
happens, the entry price and the stop. Each setup fires at most once per day.

The bars are 5 minutes because that is what Yahoo keeps for ~60 days.
Real traders often watch 1-minute charts, so these are simplified versions.
"""
from datetime import time

SETUPS = ["gap_and_go", "bull_flag", "micro_pullback", "orb", "vwap_reclaim",
          "orb15", "abcd", "hod_break", "ema9_bounce",
          "holy_grail", "red_to_green", "orb30", "vwap_pullback",
          "orb_mid", "orb_body", "gap_go_vwap_pullback"]

# Which master teaches each method (for the debrief).
MASTERS = {
    "gap_and_go": "Ross Cameron", "bull_flag": "Ross Cameron", "micro_pullback": "Ross Cameron",
    "orb": "Andrew Aziz", "orb15": "Andrew Aziz", "abcd": "Andrew Aziz", "vwap_reclaim": "Andrew Aziz",
    "red_to_green": "Andrew Aziz", "hod_break": "Ross Cameron", "ema9_bounce": "Andrew Aziz (9 EMA)",
    "holy_grail": "Linda Raschke", "orb30": "Toby Crabel", "vwap_pullback": "Brian Shannon",
    "orb_mid": "Bear Bull Traders (Aziz)", "orb_body": "Andrew Aziz", "gap_go_vwap_pullback": "Guy Gentile",
}

NAMES_HE = {
    "gap_and_go": "Gap and Go (פריצת שיא הפרה-מרקט)",
    "bull_flag": "דגל שורי",
    "micro_pullback": "Micro pullback",
    "orb": "ORB (פריצת טווח הפתיחה)",
    "vwap_reclaim": "VWAP reclaim (חזרה מעל VWAP)",
    "orb15": "ORB 15 דקות (פריצת טווח 15 הדקות הראשונות)",
    "abcd": "ABCD (זינוק, תיקון מעל VWAP, פריצה)",
    "hod_break": "פריצת שיא היום אחרי דשדוש",
    "ema9_bounce": "קפיצה מממוצע 9",
    "holy_grail": "Holy Grail (תיקון לממוצע 20 במגמה חזקה)",
    "red_to_green": "Red to Green (חזרה מעל סגירת אתמול)",
    "orb30": "ORB 30 דקות",
    "vwap_pullback": "תיקון ל-VWAP במגמה עולה",
    "orb_mid": "ORB עם סטופ באמצע הטווח",
    "orb_body": "ORB לפי גוף הנר (בלי פתילים)",
    "gap_go_vwap_pullback": "Gap and Go שמרני: תיקון ראשון ל-VWAP",
}

LAST_ENTRY = time(11, 30)   # momentum fades after the morning; no new entries later


def _green(b):
    return b["Close"] > b["Open"]


def _fill(bar, level):
    """A buy-stop at `level` fills at the level, or at the open if the bar gaps above it."""
    if bar["High"] < level:
        return None
    return max(level, bar["Open"])


def orb(reg, ctx):
    """First 5-min candle green -> buy the break of its high, stop at its low."""
    b0 = reg.iloc[0]
    if not _green(b0):
        return None
    for i in range(1, len(reg)):
        bar = reg.iloc[i]
        if reg.index[i].time() > time(10, 30):
            return None
        if bar["Low"] < b0["Low"]:            # broke the range down first: setup failed
            return None
        e = _fill(bar, b0["High"])
        if e:
            return i, e, b0["Low"]
    return None


def gap_and_go(reg, ctx):
    """Break of the premarket high in the first 30 minutes, while above VWAP."""
    level = ctx["pm_high"]
    for i in range(1, len(reg)):
        if reg.index[i].time() > time(10, 0):
            return None
        prev = reg.iloc[i - 1]
        if prev["Close"] < ctx["vwap"].iloc[i - 1]:
            continue
        e = _fill(reg.iloc[i], level)
        if e:
            return i, e, min(prev["Low"], reg.iloc[i]["Low"])
    return None


def bull_flag(reg, ctx, min_pole=0.04):
    """Pole: 2+ green bars up 4%+. Flag: 2-4 bars that give back under 50% on lower volume.
    Buy the break of the flag high, stop at the flag low."""
    n = len(reg)
    for s in range(0, n - 4):
        # build the pole
        j = s
        while j < n and _green(reg.iloc[j]):
            j += 1
        if j - s < 2:
            continue
        pole_low, pole_high = reg["Low"].iloc[s:j].min(), reg["High"].iloc[s:j].max()
        if pole_high / pole_low - 1 < min_pole:
            continue
        pole_vol = reg["Volume"].iloc[s:j].mean()
        for k in range(2, 5):                  # flag length
            if j + k >= n:
                break
            flag = reg.iloc[j:j + k]
            if flag["High"].max() > pole_high * 1.002:
                break
            if flag["Low"].min() < pole_high - 0.5 * (pole_high - pole_low):
                break
            if flag["Volume"].mean() > pole_vol:
                continue
            i = j + k
            if reg.index[i].time() > LAST_ENTRY:
                return None
            e = _fill(reg.iloc[i], flag["High"].max())
            if e:
                return i, e, flag["Low"].min()
    return None


def micro_pullback(reg, ctx, min_run=0.03):
    """3+ green bars up 3%+, then ONE red bar that holds above EMA 9 and gives back under 1/3.
    Buy the break of the red bar's high, stop at its low."""
    n = len(reg)
    for r in range(3, n - 1):
        bar = reg.iloc[r]
        if _green(bar):
            continue
        run = reg.iloc[r - 3:r]
        if not all(_green(run.iloc[x]) for x in range(3)):
            continue
        lo, hi = run["Low"].min(), run["High"].max()
        if hi / lo - 1 < min_run:
            continue
        if bar["Low"] < hi - (hi - lo) / 3 or bar["Low"] < ctx["ema9"].iloc[r]:
            continue
        i = r + 1
        if reg.index[i].time() > LAST_ENTRY:
            return None
        e = _fill(reg.iloc[i], bar["High"])
        if e:
            return i, e, bar["Low"]
    return None


def vwap_reclaim(reg, ctx):
    """Was above VWAP, lost it for 2+ bars, then a green bar closes back above VWAP on
    above-average volume. Buy at that close, stop at the low under VWAP."""
    vwap = ctx["vwap"]
    was_above, below_start = False, None
    avg_vol = reg["Volume"].expanding().mean()
    for i in range(len(reg) - 1):
        c = reg["Close"].iloc[i]
        if c > vwap.iloc[i]:
            if below_start is not None and i - below_start >= 2 and was_above \
                    and _green(reg.iloc[i]) and reg["Volume"].iloc[i] > avg_vol.iloc[i - 1]:
                if reg.index[i].time() > LAST_ENTRY:
                    return None
                stop = reg["Low"].iloc[below_start:i + 1].min()
                return i + 1, float(reg["Open"].iloc[i + 1]), stop
            was_above, below_start = True, None
        elif was_above and below_start is None:
            below_start = i
    return None


def orb15(reg, ctx):
    """15-minute opening range (first 3 bars). Buy the break of its high until 11:00, stop at its low."""
    if len(reg) < 4:
        return None
    hi, lo = reg["High"].iloc[:3].max(), reg["Low"].iloc[:3].min()
    for i in range(3, len(reg)):
        if reg.index[i].time() > time(11, 0):
            return None
        if reg["Low"].iloc[i] < lo:
            return None
        e = _fill(reg.iloc[i], hi)
        if e:
            return i, e, lo
    return None


def abcd(reg, ctx, min_drop=0.03):
    """A: morning high in the first 30 min. C: a pullback of 3%+ that holds above VWAP.
    D: buy the break of the last lower high (B) after C, stop at C."""
    n = len(reg)
    if n < 10:
        return None
    a_idx = int(reg["High"].iloc[:6].values.argmax())
    a = reg["High"].iloc[a_idx]
    c, c_idx = a, None
    for i in range(a_idx + 1, n):
        if reg.index[i].time() > LAST_ENTRY:
            return None
        bar = reg.iloc[i]
        if bar["High"] > a:                   # made a new high before a real pullback
            if c_idx is None:
                return None
        if bar["Low"] < c:
            c, c_idx = bar["Low"], i
            if c < ctx["vwap"].iloc[i]:        # lost VWAP: not an ABCD
                return None
            continue
        if c_idx is not None and a / c - 1 >= min_drop and i - c_idx >= 1:
            b = reg["High"].iloc[c_idx:i].max()
            e = _fill(bar, b)
            if e and e < a:
                return i, e, c
    return None


def hod_break(reg, ctx, bars=6, max_range=0.05):
    """After 10:00: 6+ bars tight under the high of day (range under 5%), then buy the break
    of the high of day, stop at the low of that base."""
    for i in range(bars + 1, len(reg)):
        t = reg.index[i].time()
        if t < time(10, 0):
            continue
        if t > LAST_ENTRY:
            return None
        hod = max(ctx["pm_high"], reg["High"].iloc[:i].max())
        base = reg.iloc[i - bars:i]
        if base["High"].max() < hod * 0.995:
            continue
        if base["High"].max() / base["Low"].min() - 1 > max_range:
            continue
        e = _fill(reg.iloc[i], hod)
        if e:
            return i, e, base["Low"].min()
    return None


def ema9_bounce(reg, ctx):
    """Strong trend (3 closes above EMA 9 and above VWAP), then the first bar that dips to EMA 9
    and closes above it. Buy the break of that bar's high, stop at its low."""
    ema = ctx["ema9"]
    for r in range(4, len(reg) - 1):
        if reg.index[r].time() < time(9, 50):
            continue
        if not all(reg["Close"].iloc[r - k] > ema.iloc[r - k] for k in (1, 2, 3)):
            continue
        bar = reg.iloc[r]
        if bar["Low"] <= ema.iloc[r] < bar["Close"] and bar["Close"] > ctx["vwap"].iloc[r]:
            i = r + 1
            if reg.index[i].time() > LAST_ENTRY:
                return None
            e = _fill(reg.iloc[i], bar["High"])
            if e:
                return i, e, bar["Low"]
    return None


def holy_grail(reg, ctx, min_run=0.05):
    """Raschke & Connors' Holy Grail, intraday: a strong trend (EMA 20 rising for 6 bars and
    price up 5%+ from the open), then the first pullback that touches EMA 20.
    Buy the break of the touching bar's high, stop at its low."""
    ema20 = reg["Close"].ewm(span=20, adjust=False).mean()
    open_ = reg["Open"].iloc[0]
    for r in range(8, len(reg) - 1):
        if not all(ema20.iloc[r - k] > ema20.iloc[r - k - 1] for k in range(6)):
            continue
        if reg["High"].iloc[:r].max() / open_ - 1 < min_run:
            continue
        if not all(reg["Low"].iloc[r - k] > ema20.iloc[r - k] for k in (1, 2, 3)):
            continue
        bar = reg.iloc[r]
        if bar["Low"] <= ema20.iloc[r] <= bar["High"]:
            i = r + 1
            if reg.index[i].time() > LAST_ENTRY:
                return None
            e = _fill(reg.iloc[i], bar["High"])
            if e:
                return i, e, bar["Low"]
    return None


def red_to_green(reg, ctx):
    """Price trades below yesterday's close, then a bar closes back above it.
    Buy the next open, stop at the low made below yesterday's close."""
    pc = ctx.get("prev_close")
    if not pc:
        return None
    went_red = None
    for i in range(len(reg) - 1):
        if reg.index[i].time() > LAST_ENTRY:
            return None
        if reg["Low"].iloc[i] < pc and went_red is None:
            went_red = i
        if went_red is not None and i > went_red and reg["Close"].iloc[i] > pc and _green(reg.iloc[i]):
            return i + 1, float(reg["Open"].iloc[i + 1]), reg["Low"].iloc[went_red:i + 1].min()
    return None


def orb30(reg, ctx):
    """Crabel-style 30-minute opening range (first 6 bars). Buy the break of its high
    until 12:00, stop at the middle of the range."""
    if len(reg) < 7:
        return None
    hi, lo = reg["High"].iloc[:6].max(), reg["Low"].iloc[:6].min()
    mid = (hi + lo) / 2
    for i in range(6, len(reg)):
        if reg.index[i].time() > time(12, 0):
            return None
        if reg["Low"].iloc[i] < lo:
            return None
        e = _fill(reg.iloc[i], hi)
        if e:
            return i, e, mid
    return None


def vwap_pullback(reg, ctx):
    """Shannon-style: trend above a rising VWAP (6+ bars above), a pullback that touches VWAP
    and closes above it. Buy the break of that bar's high, stop just under VWAP."""
    vwap = ctx["vwap"]
    for r in range(7, len(reg) - 1):
        if reg.index[r].time() < time(9, 50):
            continue
        if vwap.iloc[r] <= vwap.iloc[r - 6]:
            continue
        if not all(reg["Close"].iloc[r - k] > vwap.iloc[r - k] for k in range(1, 7)):
            continue
        bar = reg.iloc[r]
        if bar["Low"] <= vwap.iloc[r] * 1.003 and bar["Close"] > vwap.iloc[r]:
            i = r + 1
            if reg.index[i].time() > LAST_ENTRY:
                return None
            e = _fill(reg.iloc[i], bar["High"])
            if e:
                return i, e, min(bar["Low"], vwap.iloc[r] * 0.995)
    return None


def orb_mid(reg, ctx):
    """Bear Bull Traders' ORB rule: first 5-min candle, buy the break of its high,
    stop at the MIDDLE of the range (not the low). Range must be green."""
    b0 = reg.iloc[0]
    if not _green(b0):
        return None
    mid = (b0["High"] + b0["Low"]) / 2
    for i in range(1, len(reg)):
        if reg.index[i].time() > time(10, 30) or reg["Low"].iloc[i] < b0["Low"]:
            return None
        e = _fill(reg.iloc[i], b0["High"])
        if e:
            return i, e, mid
    return None


def orb_body(reg, ctx):
    """Aziz: 'I consider body not wicks'. The range is the first candle's body (open to close);
    a later bar must CLOSE above it. Buy the next open, stop under the body."""
    b0 = reg.iloc[0]
    if not _green(b0):
        return None
    top, bottom = b0["Close"], b0["Open"]
    for i in range(1, len(reg) - 1):
        if reg.index[i].time() > time(10, 30) or reg["Close"].iloc[i] < bottom:
            return None
        if reg["Close"].iloc[i] > top:
            return i + 1, float(reg["Open"].iloc[i + 1]), bottom
    return None


def gap_go_vwap_pullback(reg, ctx):
    """Guy Gentile's conservative gap-and-go: let the open settle, wait for the first pullback
    to VWAP in the first 45 minutes, then buy the break of the bar that held VWAP."""
    vwap = ctx["vwap"]
    for r in range(2, len(reg) - 1):
        if reg.index[r].time() > time(10, 15):
            return None
        bar = reg.iloc[r]
        if bar["Low"] <= vwap.iloc[r] * 1.005 and bar["Close"] > vwap.iloc[r]:
            i = r + 1
            e = _fill(reg.iloc[i], bar["High"])
            if e:
                return i, e, min(bar["Low"], vwap.iloc[r] * 0.99)
    return None


DETECTORS = {
    "gap_and_go": gap_and_go,
    "bull_flag": bull_flag,
    "micro_pullback": micro_pullback,
    "orb": orb,
    "vwap_reclaim": vwap_reclaim,
    "orb15": orb15,
    "abcd": abcd,
    "hod_break": hod_break,
    "ema9_bounce": ema9_bounce,
    "holy_grail": holy_grail,
    "red_to_green": red_to_green,
    "orb30": orb30,
    "vwap_pullback": vwap_pullback,
    "orb_mid": orb_mid,
    "orb_body": orb_body,
    "gap_go_vwap_pullback": gap_go_vwap_pullback,
}
