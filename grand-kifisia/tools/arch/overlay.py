"""overlay.py photo.jpg out.jpg camx camy(abs m above sea? no: above terrain) camz yawDeg pitchDeg hfovDeg [rollDeg]
Projects map building prisms (heights from gk3/data/buildings_spec.json) and road centre lines as a wireframe over a photo,
with building map indices, to identify which footprint is which building in an (aerial) photo. North = -z. yaw 0 = looking north (-z), 90 = east (+x)."""
import sys, json, os, math
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = json.load(open(os.path.join(ROOT, 'gk3', 'kifisia_map.json')))
SP = json.load(open(os.path.join(ROOT, 'gk3', 'data', 'buildings_spec.json')))
T = M['terrain']
def terr(x, z):
    gx = (x - T['x0']) / T['step']; gz = (z - T['z0']) / T['step']
    i = max(0, min(T['nx'] - 2, int(gx))); j = max(0, min(T['nz'] - 2, int(gz))); fx = min(1, max(0, gx - i)); fz = min(1, max(0, gz - j))
    h = T['h']; n = T['nx']
    a = h[j * n + i]; b = h[j * n + i + 1]; c = h[(j + 1) * n + i]; d = h[(j + 1) * n + i + 1]
    return ((a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz) / 100
photo, out = sys.argv[1], sys.argv[2]
cx, ch, cz, yaw, pitch, hfov = map(float, sys.argv[3:9]); roll = float(sys.argv[9]) if len(sys.argv) > 9 else 0
cy = terr(cx, cz) + ch
im = Image.open(photo).convert('RGB'); W, H = im.size
f = (W / 2) / math.tan(math.radians(hfov / 2))
ya, pa, ra = math.radians(yaw), math.radians(pitch), math.radians(roll)
fwd = (math.sin(ya) * math.cos(pa), math.sin(pa), -math.cos(ya) * math.cos(pa))
right = (math.cos(ya), 0, math.sin(ya))
up = (fwd[1] * right[2] - fwd[2] * right[1], fwd[2] * right[0] - fwd[0] * right[2], fwd[0] * right[1] - fwd[1] * right[0])
up = tuple(-u for u in up) if up[1] < 0 else up
def proj(x, y, z):
    dx, dy, dz = x - cx, y - cy, z - cz
    zc = dx * fwd[0] + dy * fwd[1] + dz * fwd[2]
    if zc < 1: return None
    xc = dx * right[0] + dy * right[1] + dz * right[2]; yc = dx * up[0] + dy * up[1] + dz * up[2]
    u, v = xc * math.cos(ra) + yc * math.sin(ra), -xc * math.sin(ra) + yc * math.cos(ra)
    return (W / 2 + f * u / zc, H / 2 - f * v / zc, zc)
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
for r in M['roads']:
    if r[0] > 6: continue
    pts = [(r[i] / 10, r[i + 1] / 10) for i in range(8, len(r) - 1, 2)]
    pp = [proj(x, terr(x, z) + 0.2, z) for x, z in pts]
    for a, b in zip(pp, pp[1:]):
        if a and b and a[2] < 900: d.line([a[:2], b[:2]], fill=(0, 255, 255, 160), width=1)
t = M['train']; tp = [proj(t[i]/10, terr(t[i]/10, t[i+1]/10)+0.3, t[i+1]/10) for i in range(0, len(t)-1, 2)]
for a, b in zip(tp, tp[1:]):
    if a and b: d.line([a[:2], b[:2]], fill=(0, 255, 0, 200), width=2)
labels = []
for i, b in enumerate(M['buildings']):
    bid = b[11]['id']; s = SP.get(bid, {})
    hgt = s.get('heightM', 9)
    c = b[10]; pts = [(c[k] / 10, c[k + 1] / 10) for k in range(0, len(c) - 1, 2)]
    mx = sum(p[0] for p in pts) / len(pts); mz = sum(p[1] for p in pts) / len(pts)
    if math.hypot(mx - cx, mz - cz) > 700: continue
    base = min(terr(x, z) for x, z in pts)
    top = [proj(x, base + hgt, z) for x, z in pts]; bot = [proj(x, base, z) for x, z in pts]
    if any(p is None for p in top): continue
    d.line([p[:2] for p in top] + [top[0][:2]], fill=(255, 40, 40, 200), width=1)
    for p, q in zip(top, bot):
        if q: d.line([p[:2], q[:2]], fill=(255, 160, 40, 110), width=1)
    pc = proj(mx, base + hgt, mz)
    if pc and 0 <= pc[0] < W and 0 <= pc[1] < H: labels.append((pc, str(i)))
for pc, t in labels:
    d.text((pc[0] - 6, pc[1] - 5), t, fill=(255, 255, 0, 255))
Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB').save(out, quality=90)
print('cam y abs', round(cy, 1))
