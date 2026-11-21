"""plotmap.py out.png x0 z0 x1 z1 [scale px/m] : top-down plot of map buildings (index labels), roads with names; north up (z grows south)."""
import sys, json, os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = json.load(open(os.path.join(ROOT, 'gk3', 'kifisia_map.json')))
out = sys.argv[1]; x0, z0, x1, z1 = map(float, sys.argv[2:6]); s = float(sys.argv[6]) if len(sys.argv) > 6 else 3
W, H = int((x1 - x0) * s), int((z1 - z0) * s)
im = Image.new('RGB', (W, H), (245, 245, 240)); d = ImageDraw.Draw(im)
P = lambda x, z: ((x - x0) * s, (z - z0) * s)
for r in M['roads']:
    pts = [P(r[i] / 10, r[i + 1] / 10) for i in range(8, len(r) - 1, 2)]
    if len(pts) > 1: d.line(pts, fill=(170, 170, 170) if r[0] < 7 else (210, 200, 180), width=max(1, int(r[3] * s * (1 if r[0] < 7 else .4))))
for r in M['roads']:
    pts = [P(r[i] / 10, r[i + 1] / 10) for i in range(8, len(r) - 1, 2)]
    if len(pts) > 1 and r[1] is not None and r[1] >= 0 and r[0] < 7:
        m = pts[len(pts) // 2]
        if 0 < m[0] < W and 0 < m[1] < H: d.text(m, (M.get('names_latin') or M['names'])[r[1]] or '', fill=(0, 0, 160))
for i, b in enumerate(M['buildings']):
    c = b[10]; pts = [P(c[k] / 10, c[k + 1] / 10) for k in range(0, len(c) - 1, 2)]
    if not any(0 <= p[0] <= W and 0 <= p[1] <= H for p in pts): continue
    col = {'apt': (230, 200, 160), 'villa': (200, 220, 170), 'neo': (240, 170, 170), 'modern': (170, 200, 230)}.get(b[2], (210, 210, 210))
    d.polygon(pts, fill=col, outline=(60, 60, 60))
    cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
    d.text((cx - 8, cz - 5), str(i), fill=(0, 0, 0))
im.save(out)
