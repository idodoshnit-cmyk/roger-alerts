#!/usr/bin/env python3
"""Scale + position audit: geodesic distances (WGS84, geographiclib) between surveyed OSM points vs distances between the
corresponding vertices in the shipped game map (gk3/kifisia_map.json).  Writes work/research-census/scale_audit.{json,md}.
Usage: python3 06_scale_audit.py [path/to/kifisia_map.json]"""
import sys, os, json, math, collections, itertools, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from geographiclib.geodesic import Geodesic
G = Geodesic.WGS84
mp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'gk3', 'kifisia_map.json')
M = json.load(open(mp))
t = ET.parse(os.path.join(ROOT, 'kif.osm')).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in t.iter('node')}
hw = collections.defaultdict(set); bcorner = {}
for w in t.iter('way'):
    tg = {x.get('k'): x.get('v') for x in w.findall('tag')}
    refs = [r.get('ref') for r in w.findall('nd')]
    if tg.get('highway') in ('primary', 'secondary', 'tertiary', 'residential', 'living_street', 'pedestrian', 'unclassified') and tg.get('name'):
        for r in refs: hw[r].add(tg['name'])
    if 'building' in tg and (tg.get('name') or tg.get('amenity') or tg.get('shop')):
        nm = tg.get('name') or tg.get('amenity') or tg.get('shop')
        # the corner = the most extreme node (NE-most) of the footprint: well defined
        best = max(refs[:-1], key=lambda r: nodes[r][0] + nodes[r][1]) if len(refs) > 3 else None
        if best: bcorner[best] = nm
# game vertices
road_v = [];
for r in M['roads']:
    c = r[8:]
    road_v += [(c[i] / 10.0, c[i + 1] / 10.0) for i in range(0, len(c), 2)]
bld_v = []
for b in M['buildings']:
    c = b[10]
    bld_v += [(c[i] / 10.0, c[i + 1] / 10.0) for i in range(0, len(c), 2)]
def nearest(V, p):
    return min(V, key=lambda v: (v[0] - p[0]) ** 2 + (v[1] - p[1]) ** 2)
focus = unp(M['focus'][0]); play = unp(M['playable'][0])
def inside(p): return pip(p, play)

pts = []
for nid, names in hw.items():
    if len(names) >= 2:
        ll = nodes[nid]; p = P(*ll)
        if not inside(p): continue
        v = nearest(road_v, p)
        pts.append(dict(kind='junction', label=' × '.join(sorted(names)[:2]), osm='node/' + nid, lat=ll[0], lon=ll[1], px=p[0], pz=p[1], gx=v[0], gz=v[1], resid=dist(p, v)))
for nid, nm in bcorner.items():
    ll = nodes[nid]; p = P(*ll)
    if not inside(p): continue
    v = nearest(bld_v, p)
    pts.append(dict(kind='corner', label='NE corner of ' + nm, osm='node/' + nid, lat=ll[0], lon=ll[1], px=p[0], pz=p[1], gx=v[0], gz=v[1], resid=dist(p, v)))
res = sorted(p['resid'] for p in pts)
print('candidate points', len(pts), 'vertex residual (survey point -> nearest game vertex): median %.3f m, p95 %.3f, max %.3f' % (res[len(res) // 2], res[int(len(res) * .95)], res[-1]))
good = [p for p in pts if p['resid'] <= 0.08]
print('points present in the game map within 8 cm:', len(good), 'of', len(pts))
miss = [p for p in pts if p['resid'] > 0.5]
print('survey points with no game vertex within 0.5 m:', len(miss), [(m['label'], round(m['resid'], 1)) for m in sorted(miss, key=lambda m: -m['resid'])[:8]])

# choose 20 pairs: spread over the area and over directions (E-W, N-S, diagonals), long and short
J = [p for p in good if p['kind'] == 'junction']; B = [p for p in good if p['kind'] == 'corner']
def extreme(L, f): return max(L, key=f)
ext = [extreme(J, lambda p: p['px']), extreme(J, lambda p: -p['px']), extreme(J, lambda p: p['pz']), extreme(J, lambda p: -p['pz']),
       extreme(J, lambda p: p['px'] + p['pz']), extreme(J, lambda p: -p['px'] - p['pz']), extreme(J, lambda p: p['px'] - p['pz']), extreme(J, lambda p: -p['px'] + p['pz'])]
center = min(J, key=lambda p: p['px'] ** 2 + p['pz'] ** 2)
pairs = [(ext[1], ext[0]), (ext[2], ext[3]), (ext[5], ext[4]), (ext[7], ext[6]), (center, ext[0]), (center, ext[1]), (center, ext[2]), (center, ext[3])]
# mid/short pairs: deterministic pseudo-random picks
import random
rng = random.Random(20261121)
def pick(L, n, dmin, dmax, ew=None):
    out = []; tries = 0
    while len(out) < n and tries < 20000:
        tries += 1
        a, b = rng.sample(L, 2); d = dist((a['px'], a['pz']), (b['px'], b['pz']))
        if not dmin <= d <= dmax: continue
        ang = abs(math.degrees(math.atan2(b['pz'] - a['pz'], b['px'] - a['px']))) % 180
        if ew is True and not (ang < 12 or ang > 168): continue
        if ew is False and not (78 < ang < 102): continue
        out.append((a, b))
    return out
pairs += pick(J, 2, 300, 900, True) + pick(J, 2, 200, 700, False) + pick(J, 2, 40, 150) + pick(B, 3, 100, 900) + pick(J + B, 3, 15, 60)
rows = []
for a, b in pairs[:20]:
    g = G.Inverse(a['lat'], a['lon'], b['lat'], b['lon'])
    geo = g['s12']; game = dist((a['gx'], a['gz']), (b['gx'], b['gz'])); proj = dist((a['px'], a['pz']), (b['px'], b['pz']))
    rows.append(dict(a=a['label'], b=b['label'], aOsm=a['osm'], bOsm=b['osm'], azimuth=round(g['azi1'] % 360), geodesicM=round(geo, 3), gameM=round(game, 3), diffM=round(game - geo, 3),
                     relErrPct=round(100 * (game - geo) / geo, 4), projOnlyRelErrPct=round(100 * (proj - geo) / geo, 4)))
mx = max(rows, key=lambda r: abs(r['relErrPct']))
# exact local scale factors at the origin latitude
phi = math.radians(LAT0); a_, f_ = 6378137.0, 1 / 298.257223563; e2 = f_ * (2 - f_)
Nn = a_ / math.sqrt(1 - e2 * math.sin(phi) ** 2); Mm = a_ * (1 - e2) / (1 - e2 * math.sin(phi) ** 2) ** 1.5
kx_true = math.radians(1) * Nn * math.cos(phi); kz_true = math.radians(1) * Mm
# variation of the E-W factor over the map's latitude range
b = M['bounds']; lat_n = LAT0 - b[1] / KZ; lat_s = LAT0 - b[3] / KZ
def kx_at(lat):
    p = math.radians(lat); return math.radians(1) * a_ / math.sqrt(1 - e2 * math.sin(p) ** 2) * math.cos(p)
summary = dict(map=os.path.relpath(mp, ROOT), pairs=len(rows), maxAbsRelErrPct=abs(mx['relErrPct']), maxPair=[mx['a'], mx['b']],
               maxAbsRelErrPct_pairsOver100m=max(abs(r['relErrPct']) for r in rows if r['geodesicM'] >= 100), maxAbsRelErrPct_projectionOnly=max(abs(r['projOnlyRelErrPct']) for r in rows),
               note='pairs shorter than ~100 m are dominated by the 0.1 m coordinate grid of the map JSON (up to ±0.14 m per pair), not by scale',
               maxAbsDiffM=max(abs(r['diffM']) for r in rows), kxUsed=KX, kxTrueAtOrigin=round(kx_true, 2), kxErrPct=round(100 * (KX - kx_true) / kx_true, 4),
               kzUsed=KZ, kzTrueAtOrigin=round(kz_true, 2), kzErrPct=round(100 * (KZ - kz_true) / kz_true, 4),
               kxTrueAtNorthEdge=round(kx_at(lat_n), 2), kxTrueAtSouthEdge=round(kx_at(lat_s), 2),
               vertexResidual=dict(points=len(pts), within8cm=len(good), medianM=round(res[len(res) // 2], 3), p95M=round(res[int(len(res) * .95)], 3), maxM=round(res[-1], 3),
                                   missingOver0_5m=[dict(label=m['label'], osm=m['osm'], residM=round(m['resid'], 2)) for m in sorted(miss, key=lambda m: -m['resid'])[:20]]))
jdump(dict(summary=summary, rows=rows), os.path.join(WORK, 'scale_audit.json'), indent=1)
md = ['| # | from | to | azimuth | geodesic (m) | game (m) | diff (m) | rel. error | projection only (no 0.1 m rounding) |', '|---|---|---|---|---|---|---|---|---|']
for i, r in enumerate(rows, 1):
    md.append(f"| {i} | {r['a']} ({r['aOsm']}) | {r['b']} ({r['bOsm']}) | {r['azimuth']}° | {r['geodesicM']:.2f} | {r['gameM']:.2f} | {r['diffM']:+.2f} | {r['relErrPct']:+.4f} % | {r['projOnlyRelErrPct']:+.4f} % |")
open(os.path.join(WORK, 'scale_audit.md'), 'w').write('\n'.join(md) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=1))
print('\n'.join(md))
