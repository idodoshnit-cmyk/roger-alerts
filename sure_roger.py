"""'Very sure' Roger (2026-10-27): the frozen brain's chart facts plus 15 new ones (buyer volume, volume
spike, candle shape, EMA9, premarket volume...), and he says TAKE only for his top 2% most confident charts.
Same use as FrozenRoger, plus the premarket volume of the day:
  sr = SureRoger("data/sure_freeze/sure_trees.json")
  sr.answer(features, setup, day_gaps, reg, i, pm_volume)
"""
import os
import sys

from frozen_roger import FrozenRoger

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from brain2 import new_feats  # noqa: E402


class SureRoger(FrozenRoger):
    def proba(self, features, setup, day_gaps, extra):
        """One brain, or Roger weighing his 5 traders (clones of him, "members" in the json): the average of their opinions."""
        members = self.m.get("members")
        if not members or len(members) == 1:
            return super().proba(features, setup, day_gaps, extra)
        import numpy as np
        x = self._row(features, setup, day_gaps, extra)
        ps = []
        for mm in members:
            b = [int(np.searchsorted(np.array(mm["edges"][j]), x[j])) for j in range(len(x))]
            f = mm["base"] + mm["lr"] * sum(self._apply(t, b) for t in mm["trees"])
            ps.append(1 / (1 + np.exp(-f)))
        self.last_votes = [float(v) for v in ps]
        return float(np.mean(ps))

    def score(self, p):
        """1-10 score from the json's score_cuts (7 = the send bar)."""
        cuts = self.m.get("score_cuts", {})
        return 1 + sum(p >= float(cuts[k]) for k in cuts)

    def explain(self, features, setup, extra, p, stop_pct=None):
        """Short Hebrew explanation of an entry, for the email and the team chat."""
        votes = getattr(self, "last_votes", [p])
        vs = ", ".join(f"סוחר {n + 1}: {self.score(v)}" for n, v in enumerate(votes))
        facts = []
        g = features.get("gap_pct")
        if g is not None:
            facts.append(f"קפצה {g:.0%} מהסגירה של אתמול")
        b6 = extra.get("buyer6")
        if b6 is not None:
            facts.append(f"{b6:.0%} מהנפח ב-30 הדקות האחרונות בנרות ירוקים (קונים)")
        sp = extra.get("spike")
        if sp is not None and sp >= 1.5:
            facts.append(f"נפח בנר האחרון פי {sp:.1f} מהממוצע")
        vh = extra.get("vwap_hold")
        if vh:
            facts.append("מחזיקה מעל VWAP")
        e9 = extra.get("ema9_dist")
        if e9 is not None:
            facts.append(f"{abs(e9):.1%} {'מעל' if e9 >= 0 else 'מתחת'} לממוצע 9")
        txt = f"תבנית: {setup}. ציון {self.score(p)}/10 (ביטחון {p:.0%}). דעת הסוחרים: {vs}."
        if facts:
            txt += " למה: " + "; ".join(facts) + "."
        if stop_pct is not None:
            txt += f" סטופ {stop_pct:.1%} מתחת לכניסה, מתחת לשפל של התבנית."
        return txt

    def answer(self, features, setup, day_gaps, reg, i, pm_volume=0.0):
        why = self.blocked(features, setup)
        if why:
            return {"decision": "SKIP", "p": 0.0, "why": why}
        extra = self.vwap_feats(reg, i) if i >= 2 else {"vwap_hold": 0.0, "vwap_losses": 0.0}
        if i >= 1:
            extra.update(new_feats(reg, i, pm_volume))
        p = self.proba(features, setup, day_gaps, extra)
        take = p >= self.m["threshold"]
        return {"decision": "TAKE" if take else "SKIP", "p": p, "score": self.score(p),
                "votes": [self.score(v) for v in getattr(self, "last_votes", [p])],
                "explain": self.explain(features, setup, extra, p, features.get("stop_width")),
                "why": f"בטוח מאוד: ביטחון {p:.0%} (סף {self.m['threshold']:.0%})"}
