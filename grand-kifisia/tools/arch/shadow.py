"""research-arch: building heights from shadow lengths in the Ktimatologio orthophoto core.jpg (reference only).
  python3 -I tools/arch/shadow.py dir        # find the shadow azimuth (darkness just outside footprints, per direction)
  python3 -I tools/arch/shadow.py measure    # per building: shadow length along that azimuth -> work/research-arch/shadow/shadow.json
Game coords x east, z south. core.jpg covers x,z -150..250 at 0.25 m/px."""
import json, os, sys, math
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ortho
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
ROOT = ortho.ROOT; OD = os.path.join(ROOT, 'work', 'research-arch', 'shadow'); os.makedirs(OD, exist_ok=True)
X0, Z0, MPP, N = -150.0, -150.0, 0.25, 1600
IM = np.asarray(Image.open(os.path.join(ortho.OD, 'core.jpg')).convert('RGB')).astype(np.float32)
L = IM.mean(2)
M = ortho.load_map()
PL = [(i, bid, Polygon(p).buffer(0)) for i, bid, p in ortho.polys(M) if len(p) >= 3]
PL = [(i, b, g) for i, b, g in PL if g.is_valid and not g.is_empty]
inside = [(i, b, g) for i, b, g in PL if g.bounds[0] > X0 + 5 and g.bounds[1] > Z0 + 5 and g.bounds[2] < X0 + 395 and g.bounds[3] < Z0 + 395]
# footprint mask (pixels inside any building)
fm = Image.new('L', (N, N), 0); dr = ImageDraw.Draw(fm)
for i, b, g in PL:
    for gg in (g.geoms if g.geom_type == 'MultiPolygon' else [g]):
        dr.polygon([((x - X0) / MPP, (z - Z0) / MPP) for x, z in gg.exterior.coords], fill=1)
FM = np.asarray(fm).astype(bool)
def pix(x, z):
    c, r = int((x - X0) / MPP), int((z - Z0) / MPP)
    if 0 <= c < N and 0 <= r < N: return r, c
    return None
def darkness_dir():
    res = []
    for a in range(0, 360, 5):
        dx, dz = math.sin(math.radians(a)), -math.cos(math.radians(a))   # azimuth from north (−z), clockwise
        tot = []; 
        for i, b, g in inside:
            for gg in (g.geoms if g.geom_type == 'MultiPolygon' else [g]):
                cs = list(gg.exterior.coords)
                for k in range(len(cs) - 1):
                    (x1, z1), (x2, z2) = cs[k], cs[k + 1]
                    for t in (0.25, 0.5, 0.75):
                        x, z = x1 + (x2 - x1) * t, z1 + (z2 - z1) * t
                        p = pix(x + dx * 1.5, z + dz * 1.5)
                        if p and not FM[p]: tot.append(L[p])
        res.append((a, float(np.mean(tot)) if tot else 999, len(tot)))
    res.sort(key=lambda r: r[1])
    return res
DARK = 62.0
def measure(az):
    dx, dz = math.sin(math.radians(az)), -math.cos(math.radians(az))
    out = {}
    for i, b, g in inside:
        lens = []; rays = 0
        for gg in (g.geoms if g.geom_type == 'MultiPolygon' else [g]):
            cs = list(gg.exterior.coords)
            for k in range(len(cs) - 1):
                (x1, z1), (x2, z2) = cs[k], cs[k + 1]
                ex, ez = x2 - x1, z2 - z1; el = math.hypot(ex, ez)
                if el < 1.5: continue
                # outward normal (polygon orientation independent): test which side is outside
                nx, nz = ez / el, -ex / el
                mx, mz = (x1 + x2) / 2, (z1 + z2) / 2
                if gg.contains(Point(mx + nx * 0.3, mz + nz * 0.3)): nx, nz = -nx, -nz
                if nx * dx + nz * dz < 0.35: continue        # edge does not face the shadow side
                for t in np.arange(0.5 / el, 1, 0.5 / el):
                    x, z = x1 + ex * t, z1 + ez * t
                    s = 0.0; ok = True; hit = None
                    while s < 40:
                        s += 0.25
                        p = pix(x + dx * s, z + dz * s)
                        if not p: ok = False; break
                        if FM[p] and s > 0.6: hit = 'bld'; break     # shadow falls on another building -> censored
                        if L[p] > DARK:
                            # allow 1 px gaps
                            p2 = pix(x + dx * (s + 0.5), z + dz * (s + 0.5))
                            if p2 and L[p2] <= DARK and not FM[p2]: continue
                            break
                    rays += 1
                    if ok and hit is None and s > 0.6: lens.append(s)
        if rays >= 8 and len(lens) >= 5:
            a = np.array(lens)
            out[b] = {'map': i, 'rays': rays, 'n': len(lens), 'p50': round(float(np.median(a)), 2), 'p75': round(float(np.percentile(a, 75)), 2),
                      'p90': round(float(np.percentile(a, 90)), 2)}
    return out
if __name__ == '__main__':
    if sys.argv[1] == 'dir':
        r = darkness_dir(); print(r[:6], r[-3:])
        json.dump({'az': r[0][0], 'all': r}, open(os.path.join(OD, 'dir.json'), 'w'))
    elif sys.argv[1] == 'measure':
        az = float(sys.argv[2]) if len(sys.argv) > 2 else json.load(open(os.path.join(OD, 'dir.json')))['az']
        o = measure(az); json.dump({'az': az, 'b': o}, open(os.path.join(OD, 'shadow.json'), 'w'), indent=0); print('measured', len(o))
