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
        """One brain, or the average of a committee of brains ("members") when the json has them."""
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
        return float(np.mean(ps))

    def answer(self, features, setup, day_gaps, reg, i, pm_volume=0.0):
        why = self.blocked(features, setup)
        if why:
            return {"decision": "SKIP", "p": 0.0, "why": why}
        extra = self.vwap_feats(reg, i) if i >= 2 else {"vwap_hold": 0.0, "vwap_losses": 0.0}
        if i >= 1:
            extra.update(new_feats(reg, i, pm_volume))
        p = self.proba(features, setup, day_gaps, extra)
        take = p >= self.m["threshold"]
        return {"decision": "TAKE" if take else "SKIP", "p": p,
                "why": f"בטוח מאוד: ביטחון {p:.0%} (סף {self.m['threshold']:.0%})"}
