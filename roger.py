"""Roger: looks at the 9:45 picture and says TAKE or SKIP, then learns from Hans's answer.

Roger is a small online logistic model. Hans tells him which of the 5 setups
triggered and shows the context (gap, volume, VWAP, stop width, time of day).
He starts with the rules from the research and adjusts the weights after every answer,
so over time he learns which setups and which conditions actually pay.
"""
import json
import math
import os

from hans import FEATURES
from setups import SETUPS

HERE = os.path.dirname(os.path.abspath(__file__))
BRAIN = os.path.join(HERE, "data", "roger_brain.json")

# Starting beliefs from the research doc. Positive = makes a trade more attractive.
PRIOR = {
    "gap_pct": 0.2,
    "pm_vol_ratio": 0.3,
    "vol_ratio": 0.4,
    "change_from_open": 0.0,
    "vwap_dist": 0.2,
    "hod_dist": 0.2,          # near the high of day = strength
    "stop_width": -0.4,       # wide stop = worse odds for a 2R target
    "minutes_in": -0.3,       # early in the session is better
    "log_price": 0.0,
    # the setups start equal; Roger learns which ones work
    "setup_gap_and_go": 0.0,
    "setup_bull_flag": 0.0,
    "setup_micro_pullback": 0.0,
    "setup_orb": 0.0,
    "setup_vwap_reclaim": 0.0,
}

for _f in FEATURES:               # every new sense or setup starts neutral
    PRIOR.setdefault(_f, 0.0)

TAKE_THRESHOLD = 0.55   # Roger only says TAKE when he thinks the odds are clearly good
LEARNING_RATE = 0.05
L2 = 0.001


class Roger:
    def __init__(self, path=BRAIN, params=None, fresh=False):
        """fresh=True starts a new Roger from the research priors (used by the boot camp)."""
        self.path = path
        if path and os.path.exists(path) and not fresh:
            s = json.load(open(path))
        else:
            s = {"w": dict(PRIOR), "b": -0.2,
                 "n": 0, "mean": {f: 0.0 for f in FEATURES}, "m2": {f: 1.0 for f in FEATURES},
                 "seen": 0, "right": 0}
        s.setdefault("params", {"threshold": TAKE_THRESHOLD, "lr": LEARNING_RATE, "l2": L2})
        if params:
            s["params"].update(params)
        self.s = s
        self.p = s["params"]

    # running standardization so features with big numbers don't dominate
    def _z(self, x):
        n = max(self.s["n"], 1)
        out = {}
        for f in FEATURES:
            if f.startswith("setup_"):       # on/off flags stay as they are
                out[f] = x[f]
                continue
            var = self.s["m2"][f] / n if self.s["n"] > 1 else 1.0
            sd = math.sqrt(var) if var > 1e-12 else 1.0
            out[f] = max(-5.0, min(5.0, (x[f] - self.s["mean"][f]) / sd))
        return out

    def _update_stats(self, x):
        self.s["n"] += 1
        n = self.s["n"]
        for f in FEATURES:
            d = x[f] - self.s["mean"][f]
            self.s["mean"][f] += d / n
            self.s["m2"][f] += d * (x[f] - self.s["mean"][f])

    def probability(self, features):
        z = self._z(features)
        logit = self.s["b"] + sum(self.s["w"][f] * z[f] for f in FEATURES)
        return 1 / (1 + math.exp(-max(-30, min(30, logit))))

    def answer(self, quiz):
        p = self.probability(quiz["features"])
        return {"decision": "TAKE" if p >= self.p["threshold"] else "SKIP", "p": round(p, 3)}

    def learn(self, quiz, outcome):
        """Hans says what happened. A day is 'good' if the trade ended in profit."""
        x = quiz["features"]
        self._update_stats(x)
        z = self._z(x)
        y = 1.0 if outcome["r"] > 0 else 0.0
        p = self.probability(x)
        err = y - p
        for f in FEATURES:
            self.s["w"][f] += self.p["lr"] * (err * z[f] - self.p["l2"] * self.s["w"][f])
        self.s["b"] += self.p["lr"] * err
        self.s["seen"] += 1

    def save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        json.dump(self.s, open(self.path, "w"), indent=1)

    def beliefs(self):
        """What Roger currently believes matters most, strongest first."""
        return sorted(self.s["w"].items(), key=lambda kv: -abs(kv[1]))
