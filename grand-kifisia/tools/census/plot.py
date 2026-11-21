#!/usr/bin/env python3
"""Debug plot of the census: python3 plot.py out.png x0 z0 x1 z1 [labels] [anchors]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
out, x0, z0, x1, z1 = sys.argv[1], *map(float, sys.argv[2:6])
opts = sys.argv[6:]
M = load_map()
d = json.load(open(os.path.join(WORK, 'census_preview.json'), encoding='utf-8'))
fig, ax = plt.subplots(figsize=(16, 16 * (z1 - z0) / (x1 - x0)), dpi=110)
for b in M['buildings']:
    c = unp(b[10])
    if not c or not (x0 - 50 < c[0][0] < x1 + 50 and z0 - 50 < c[0][1] < z1 + 50): continue
    ax.fill([p[0] for p in c], [p[1] for p in c], fc='#e8e2d6', ec='#8a8272', lw=0.6)
for r in M['roads']:
    c = r[8:]; pts = [(c[i] / 10, c[i + 1] / 10) for i in range(0, len(c), 2)]
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color='#bbbbbb' if r[0] < 6 else '#dddddd', lw=1.0, zorder=1)
if 'anchors' in opts:
    import addr as ADDR
    AM = ADDR.build_model()
    for name, A in AM.anchors.items():
        for a in A:
            if x0 < a[5] < x1 and z0 < a[6] < z1:
                col = '#008800' if a[4] == 'osm' else '#bb8800'
                if a[4] == 'osm' or 'noisy' in opts:
                    ax.plot(a[5], a[6], 's', ms=3, color=col); ax.text(a[5] + 0.8, a[6], str(a[0]), fontsize=6, color=col)
    for name, axl in AM.axis.items():
        xs, zs = axl.xy
        mid = axl.interpolate(0.5, normalized=True)
        if x0 < mid.x < x1 and z0 < mid.y < z1: ax.text(mid.x, mid.y, name, fontsize=8, color='#3355aa')
        if 'axis' in opts: ax.plot(xs, zs, color='#3355aa', lw=0.5, alpha=0.5)
COL = {'A': '#d00000', 'B': '#ff8800', 'C': '#999999', 'X': '#000000'}
for e in d['places']:
    if not (x0 < e['x'] < x1 and z0 < e['z'] < z1): continue
    if e['tier'] in 'CX' and 'all' not in opts: continue
    ax.plot(e['x'], e['z'], 'o' if e.get('osm') else ('^' if e['posMethod'] == 'geocoded' else 'v'), ms=4, color=COL[e['tier']], zorder=5)
    if 'labels' in opts:
        ax.text(e['x'] + 0.6, e['z'] - 0.4, (e['nameLatin'] or e['name'])[:18] + (' ' + e['number'] if e.get('number') else ''), fontsize=5, zorder=6, rotation=25)
ax.set_xlim(x0, x1); ax.set_ylim(z1, z0); ax.set_aspect('equal'); ax.grid(True, lw=0.2)
fig.tight_layout(); fig.savefig(out); print('saved', out)
