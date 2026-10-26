"""Roger's frozen Monday brain for the live alerts. Numpy only, no training code needed.

Load once:   fr = FrozenRoger("data/roger_trees.json")
Per trigger: fr.answer(features, setup, day_gaps, reg, i) -> {"decision": "TAKE"/"SKIP", "p": prob, "why": ...}
  features  the dict live.check() builds (same formulas as hans.py)
  setup     the detector name, e.g. "orb"
  day_gaps  {ticker: gap_pct} for every stock watched today (for "hot market" and "gap rank")
  reg       today's regular-session 5-minute bars (DataFrame with Open/High/Low/Close/Volume)
  i         index of the entry bar in reg (only bars before i are used)

Same order as the scoring: coach rules first (blocked = SKIP), then the tree score vs the frozen threshold.
Max 3 trades a day and one per stock are enforced by live.py, as before.
"""
import json

import numpy as np


class FrozenRoger:
    def __init__(self, path):
        self.m = json.load(open(path))
        self.edges = [np.array(e) for e in self.m["edges"]]
        self.names = self.m["names"]

    def blocked(self, features, setup):
        for r in self.m["rules"]:
            if r["kind"] == "setup" and setup == r["value"]:
                return f"כלל המאמן: לא נכנסים ב-{setup}"
            if r["kind"] == "feature":
                lo = -np.inf if r["lo"] is None else r["lo"]
                hi = np.inf if r["hi"] is None else r["hi"]
                if lo <= features.get(r["f"], 0.0) < hi:
                    return f"כלל המאמן: {r['f']} בטווח האסור"
        return None

    def _row(self, features, setup, day_gaps, extra):
        g = features["gap_pct"]
        gaps = list(day_gaps.values()) if day_gaps else [g]
        hot = sum(1 for v in gaps if v >= 0.05)
        rank = 1 + sum(1 for v in gaps if v > g)
        vals = {"hot": np.log1p(hot), "rank": np.log(rank)}
        vals.update(extra)
        row = []
        for n in self.names:
            if n in self.m["zero"]:
                row.append(0.0)
            elif n.startswith("setup_"):
                row.append(1.0 if n == "setup_" + setup else float(features.get(n, 0.0)))
            elif n in vals:
                row.append(float(vals[n]))
            else:
                row.append(float(features.get(n, 0.0)))
        row = np.nan_to_num(np.array(row, dtype=float), nan=0.0, posinf=0.0, neginf=0.0)
        return row

    def _apply(self, t, b):
        while t[0] == "split":
            t = t[3] if b[t[1]] <= t[2] else t[4]
        return t[1]

    def proba(self, features, setup, day_gaps, extra):
        x = self._row(features, setup, day_gaps, extra)
        b = [int(np.searchsorted(self.edges[j], x[j])) for j in range(len(x))]
        f = self.m["base"] + self.m["lr"] * sum(self._apply(t, b) for t in self.m["trees"])
        return float(1 / (1 + np.exp(-f)))

    @staticmethod
    def vwap_feats(reg, i):
        """Hans's VWAP rule (masters.py): share of the last 6 closed bars above VWAP, and VWAP losses today."""
        c = reg["Close"].values
        typical = (reg["High"] + reg["Low"] + reg["Close"]) / 3
        vwap = ((typical * reg["Volume"]).cumsum() / reg["Volume"].cumsum().replace(0, np.nan)).ffill().fillna(reg["Close"]).values
        lo6 = max(0, i - 6)
        above = c[lo6:i] > vwap[lo6:i]
        crosses = int(np.sum((c[1:i] < vwap[1:i]) & (c[:i - 1] >= vwap[:i - 1])))
        return {"vwap_hold": float(above.mean()) if len(above) else 0.0, "vwap_losses": float(crosses)}

    def answer(self, features, setup, day_gaps, reg, i):
        why = self.blocked(features, setup)
        if why:
            return {"decision": "SKIP", "p": 0.0, "why": why}
        extra = self.vwap_feats(reg, i) if i >= 2 else {"vwap_hold": 0.0, "vwap_losses": 0.0}
        p = self.proba(features, setup, day_gaps, extra)
        take = p >= self.m["threshold"]
        return {"decision": "TAKE" if take else "SKIP", "p": p,
                "why": f"ביטחון {p:.0%} (סף {self.m['threshold']:.0%})"}
