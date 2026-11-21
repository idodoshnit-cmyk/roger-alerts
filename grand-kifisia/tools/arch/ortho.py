"""research-arch: Hellenic Cadastre (Ktimatologio) open orthophoto WMS -> per-building roof evidence.
Reference only: the imagery is never shipped in the game; we derive roof type / roof colour / roof equipment per footprint.

  python3 -I tools/arch/ortho.py fetch              # tiles of the whole building area -> work/research-arch/ortho/t_<i>_<j>.jpg (polite, 4 s apart)
  python3 -I tools/arch/ortho.py overlay X0 Z0 X1 Z1 out.jpg [scale]   # footprints + map indices drawn over the photo (for looking)
  python3 -I tools/arch/ortho.py measure            # per-building pixel statistics -> work/research-arch/ortho/roofstats.json
Game coords: x = (lon - 23.8125) * 87716, z = -(lat - 38.0727) * 110998 (docs/MAP_DATA.md).
"""
import json, os, sys, time, math, urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OD = os.path.join(ROOT, 'work', 'research-arch', 'ortho')
KX, KZ, LON0, LAT0 = 87716.0, 110998.0, 23.8125, 38.0727
WMS = 'https://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx'
UA = 'GrandKifisiaResearchBot/1.0 (non-commercial offline game research; python urllib)'
TILE = 200.0   # metres per tile
PX = 800       # pixels per tile (0.25 m/px)


def bbox_ll(x0, z0, x1, z1):
    return (LON0 + x0 / KX, LAT0 - z1 / KZ, LON0 + x1 / KX, LAT0 - z0 / KZ)


def load_map():
    return json.load(open(os.path.join(ROOT, 'gk3', 'kifisia_map.json')))


def polys(M):
    out = []
    for i, b in enumerate(M['buildings']):
        c = b[10]
        out.append((i, b[11].get('id'), [(c[k] / 10, c[k + 1] / 10) for k in range(0, len(c) - 1, 2)]))
    return out


def extent(M):
    xs, zs = [], []
    for _, _, p in polys(M):
        for x, z in p: xs.append(x); zs.append(z)
    return min(xs), min(zs), max(xs), max(zs)


def tiles(M):
    x0, z0, x1, z1 = extent(M)
    i0, j0 = math.floor(x0 / TILE), math.floor(z0 / TILE)
    i1, j1 = math.floor(x1 / TILE), math.floor(z1 / TILE)
    return [(i, j) for j in range(j0, j1 + 1) for i in range(i0, i1 + 1)]


def fetch():
    os.makedirs(OD, exist_ok=True)
    M = load_map()
    T = tiles(M)
    print(len(T), 'tiles', flush=True)
    for i, j in T:
        fn = os.path.join(OD, 't_%d_%d.jpg' % (i, j))
        if os.path.exists(fn) and os.path.getsize(fn) > 20000: continue
        bb = bbox_ll(i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE)
        url = WMS + '?SERVICE=WMS&VERSION=1.1.0&REQUEST=GetMap&LAYERS=BASEMAP&STYLES=&SRS=EPSG:4326&BBOX=%.7f,%.7f,%.7f,%.7f&WIDTH=%d&HEIGHT=%d&FORMAT=image/jpeg' % (bb + (PX, PX))
        for a in range(4):
            try:
                time.sleep(4)
                data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=120).read()
                if len(data) < 20000: raise Exception('small %d' % len(data))
                open(fn, 'wb').write(data); print('got', i, j, len(data), flush=True); break
            except Exception as ex:
                print('err', i, j, ex, flush=True); time.sleep(30)


def sources():
    """(file, x0, z0, metres, pixels): 200 m tiles t_i_j.jpg plus the 400 m core mosaic core.jpg (x,z -150..250)."""
    S = []
    for fn in sorted(os.listdir(OD)) if os.path.isdir(OD) else []:
        if fn.startswith('t_') and fn.endswith('.jpg'):
            i, j = [int(v) for v in fn[2:-4].split('_')]
            S.append((os.path.join(OD, fn), i * TILE, j * TILE, TILE, PX))
    if os.path.exists(os.path.join(OD, 'core.jpg')): S.append((os.path.join(OD, 'core.jpg'), -150.0, -150.0, 400.0, 1600))
    return S


def mosaic(x0, z0, x1, z1, mpp=0.25, mask=False):
    """Image covering game rect at mpp metres/pixel (and optionally a coverage mask)."""
    W, H = int((x1 - x0) / mpp), int((z1 - z0) / mpp)
    im = Image.new('RGB', (W, H), (40, 40, 40)); mk = Image.new('L', (W, H), 0)
    for fn, sx, sz, sm, spx in sources():
        if sx > x1 or sz > z1 or sx + sm < x0 or sz + sm < z0: continue
        t = Image.open(fn).convert('RGB')
        n = int(round(sm / mpp))
        if n != spx: t = t.resize((n, n), Image.LANCZOS)
        im.paste(t, (int(round((sx - x0) / mpp)), int(round((sz - z0) / mpp))))
        mk.paste(255, (int(round((sx - x0) / mpp)), int(round((sz - z0) / mpp)), int(round((sx - x0) / mpp)) + n, int(round((sz - z0) / mpp)) + n))
    return (im, mk) if mask else im


def overlay(x0, z0, x1, z1, out, mpp=0.25, labels=True):
    M = load_map()
    im = mosaic(x0, z0, x1, z1, mpp)
    d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', max(10, int(2.6 / mpp)))
    except Exception: f = ImageFont.load_default()
    P = lambda x, z: ((x - x0) / mpp, (z - z0) / mpp)
    for i, bid, p in polys(M):
        if max(x for x, _ in p) < x0 or min(x for x, _ in p) > x1 or max(z for _, z in p) < z0 or min(z for _, z in p) > z1: continue
        d.line([P(x, z) for x, z in p] + [P(*p[0])], fill=(255, 230, 0), width=1)
        if labels:
            cx = sum(x for x, _ in p) / len(p); cz = sum(z for _, z in p) / len(p)
            px, pz = P(cx, cz)
            d.text((px - 8, pz - 6), str(i), fill=(255, 40, 40), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    im.save(out, quality=88)
    print(out, im.size)


def hexc(c):
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(round(v)))) for v in c)


def measure():
    """Pixel classes inside each footprint (eroded 0.7 m so walls/eaves of neighbours do not count)."""
    import numpy as np
    from shapely.geometry import Polygon
    M = load_map()
    x0, z0, x1, z1 = extent(M)
    x0 = math.floor(x0 / TILE) * TILE; z0 = math.floor(z0 / TILE) * TILE
    x1 = (math.floor(x1 / TILE) + 1) * TILE; z1 = (math.floor(z1 / TILE) + 1) * TILE
    mpp = 0.25
    big, cov = mosaic(x0, z0, x1, z1, mpp, mask=True)
    A = np.asarray(big).astype(np.float32)
    have = np.asarray(cov) > 0
    out = {}
    for i, bid, p in polys(M):
        try:
            pg = Polygon(p).buffer(0)
            pe = pg.buffer(-0.7)
            if pe.is_empty or pe.area < 0.35 * pg.area: pe = pg.buffer(-0.3)
            if pe.is_empty: pe = pg
            if pe.geom_type != 'Polygon': pe = max(pe.geoms, key=lambda g: g.area)
        except Exception:
            continue
        bx0, bz0, bx1, bz1 = pe.bounds
        c0, r0 = int((bx0 - x0) / mpp), int((bz0 - z0) / mpp)
        c1, r1 = int((bx1 - x0) / mpp) + 1, int((bz1 - z0) / mpp) + 1
        if c1 <= c0 or r1 <= r0: continue
        mk = Image.new('L', (c1 - c0, r1 - r0), 0)
        ImageDraw.Draw(mk).polygon([((x - x0) / mpp - c0, (z - z0) / mpp - r0) for x, z in pe.exterior.coords], fill=1)
        m = np.asarray(mk).astype(bool) & have[r0:r1, c0:c1]
        if m.sum() < 12 or m.sum() < 0.8 * np.asarray(mk).astype(bool).sum(): continue
        px = A[r0:r1, c0:c1][m]
        R, G, B = px[:, 0], px[:, 1], px[:, 2]
        mx = px.max(1); mn = px.min(1); L = px.mean(1)
        sat = (mx - mn) / np.maximum(mx, 1)
        veg = (G >= R - 4) & (G > B + 6) & (sat > 0.12)
        dark = (L < 60) & ~veg
        ok = ~veg & ~dark
        warm = ok & ((R - B) > 28) & ((R - G) > 8)          # terracotta tile (calibrated on b425/b388/b383 vs b30/b389/b391)
        light = ok & ~warm & (sat < 0.2)
        n = float(len(px)); no = float(max(1, ok.sum()))
        rec = {'map': i, 'n': int(n), 'warm': round(warm.sum() / no, 3), 'veg': round(veg.sum() / n, 3), 'dark': round(dark.sum() / n, 3),
               'white': round((light & (L > 185)).sum() / no, 3)}
        if warm.sum() > 10:
            c = np.median(px[warm], 0); rec['tileCol'] = hexc(c)
            l = c.mean(); rec['tileColFix'] = hexc([(l + (v - l) * 1.9) * 0.93 for v in c])   # orthophoto haze removed: x1.9 saturation, -7 % value
        if light.sum() > 10: rec['flatCol'] = hexc(np.median(px[light], 0))
        out[bid] = rec
    json.dump(out, open(os.path.join(OD, 'roofstats.json'), 'w'), indent=0)
    print('measured', len(out))


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'fetch': fetch()
    elif cmd == 'measure': measure()
    elif cmd == 'overlay':
        a = [float(v) for v in sys.argv[2:6]]
        overlay(*a, sys.argv[6], float(sys.argv[7]) if len(sys.argv) > 7 else 0.25)
