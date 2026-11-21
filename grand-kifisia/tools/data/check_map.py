#!/usr/bin/env python3
"""Validate gk3/kifisia_map.json (team:data).  Usage: python3 tools/data/check_map.py [map.json] [--osm kif.osm] [--quiet]

Checks (HARD = must be 0, INFO = reported):
  HARD  every POI has a facade / placement (no bay 'none')                       HARD  no two shop bays overlap on one building edge
  HARD  no synthetic or street furniture inside a building footprint             HARD  no lamp/bollard/tree/bench/bin inside the carriageway
  HARD  no building stands in a carriageway (overlap > 0.5 m2)                   HARD  every special shop present (door, building, interior) + key.junction/sephora
  HARD  scale audit: geodesic (WGS84, Karney) vs game distance for 20 point pairs, max relative error <= 0.1 %
  HARD  survey fidelity: every building / road vertex within 0.3 m of the OSM geometry (Hausdorff, both directions for buildings)
  INFO  spot check of 15 random OSM POIs re-projected independently (azimuthal equidistant around the origin)
  INFO  counts per category / source / bay type, roads narrower than their facade clearance
Exit code 1 when a HARD check fails."""
import json, math, sys, os, random, collections
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.prepared import prep
from geographiclib.geodesic import Geodesic

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
MAPF = args[0] if args else os.path.join(ROOT, 'gk3/kifisia_map.json')
OSMF = sys.argv[sys.argv.index('--osm') + 1] if '--osm' in sys.argv else os.path.join(ROOT, 'kif.osm')
if OSMF in args: args.remove(OSMF)
QUIET = '--quiet' in sys.argv
M = json.load(open(MAPF))
LAT0, LON0 = M['origin']; KX, KZ = 87716.0, 110998.0
if M.get('meta', {}).get('projection'): KX = M['meta']['projection']['kx']; KZ = M['meta']['projection']['kz']
G = Geodesic.WGS84
fails = collections.OrderedDict(); info = collections.OrderedDict()
def fail(k, msg):
    fails.setdefault(k, []).append(msg)
def pts(flat): return [(flat[i] / 10, flat[i + 1] / 10) for i in range(0, len(flat) - 1, 2)]
def poly_of(rings):
    try:
        g = Polygon(pts(rings[0]), [pts(h) for h in rings[1:] if len(h) >= 6])
        return g if g.is_valid else g.buffer(0)
    except Exception: return None

# ---------------------------------------------------------------- geometry
B = M['buildings']; bpoly = []
for b in B:
    g = Polygon(pts(b[10])); bpoly.append(g if g.is_valid else g.buffer(0))
btree = STRtree(bpoly)
def in_building(x, z, shrink=0.15):
    p = Point(x, z)
    for i in btree.query(p):
        g = bpoly[int(i)]
        if g.contains(p) and g.exterior.distance(p) > shrink: return int(i)
    return None
carr = unary_union([g for g in (poly_of(c) for c in M.get('carriage', [])) if g is not None and not g.is_empty])
carr_in = prep(carr.buffer(-0.2)) if not carr.is_empty else None
def in_carr(x, z): return carr_in is not None and carr_in.contains(Point(x, z))

# ---------------------------------------------------------------- 1. POIs placed
pois = M.get('pois', [])
for q in pois:
    if q.get('bay') in (None, 'none'): fail('poi_without_facade', '%s %s (%s)' % (q['id'], q['name'], q['cat']))
    elif q['bay'] in ('shop', 'plate', 'directory', 'building') and ('b' not in q or 'door' not in q): fail('poi_without_facade', '%s %s bay=%s but no b/door' % (q['id'], q['name'], q['bay']))
    if 'door' in q and in_building(*q['door'], shrink=0.3) is not None: fail('door_inside_building', '%s %s door %s' % (q['id'], q['name'], q['door']))
# ---------------------------------------------------------------- 2. bays never overlap
edges = collections.defaultdict(list)
for q in pois:
    if q.get('bay') == 'shop': edges[(q['b'], q['e'])].append(q)
for (bi, ei), qs in edges.items():
    co = pts(B[bi][10]); a = co[ei]; c = co[(ei + 1) % len(co)]; L = math.dist(a, c)
    iv = sorted((q['t'] * L - q['w'] / 2, q['t'] * L + q['w'] / 2, q) for q in qs)
    for (a0, a1, qa), (b0, b1, qb) in zip(iv, iv[1:]):
        if a1 > b0 + 0.05: fail('bays_overlap', 'b%d e%d: %s [%.1f-%.1f] / %s [%.1f-%.1f]' % (bi, ei, qa['name'], a0, a1, qb['name'], b0, b1))
    for a0, a1, q in iv:
        if a0 < -0.05 or a1 > L + 0.05: fail('bay_outside_edge', 'b%d e%d %s [%.1f-%.1f] L=%.1f' % (bi, ei, q['name'], a0, a1, L))
# legacy field must be a subset of the full list
for bi, b in enumerate(B):
    full = b[11].get('shops') if len(b) > 11 and isinstance(b[11], dict) else None
    if full is not None and not all(s in full for s in b[8]): fail('legacy_shops_not_subset', 'b%d' % bi)
# ---------------------------------------------------------------- 3./4. furniture
FURN_NO_B = ['bench', 'basket', 'recycle', 'kiosk', 'fountain', 'tree', 'bus', 'signal', 'stop', 'giveway', 'post_box', 'telephone', 'vending', 'water', 'artwork', 'memorial', 'info',
             'bike_parking', 'moto_parking', 'lamp', 'bollard', 'clock', 'taxi', 'flagpole', 'play']
FURN_NO_C = ['bench', 'basket', 'recycle', 'kiosk', 'fountain', 'tree', 'post_box', 'telephone', 'vending', 'water', 'bike_parking', 'lamp', 'clock', 'play']
props = M['props']
for k in FURN_NO_B:
    for it in props.get(k, []):
        bi = in_building(it[0] / 10, it[1] / 10, 0.3)
        if bi is not None: fail('furniture_in_building', '%s %s at %.1f,%.1f in b%d' % (k, it[-1], it[0] / 10, it[1] / 10, bi))
for k in FURN_NO_C:
    for it in props.get(k, []):
        if in_carr(it[0] / 10, it[1] / 10): fail('furniture_in_carriageway', '%s %s at %.1f,%.1f' % (k, it[-1], it[0] / 10, it[1] / 10))
for name, arr in (('street_trees', M['street_trees']), ('lamps', M['lamps']), ('bollards', M['bollards']), ('garden_trees', M['garden_trees']), ('parked', M['parked'])):
    nb = nc = 0
    for it in arr:
        x, z = it[0] / 10, it[1] / 10
        if in_building(x, z, 0.3) is not None: nb += 1; fail('synthetic_in_building', '%s %.1f,%.1f' % (name, x, z))
        if name != 'parked' and in_carr(x, z): nc += 1; fail('synthetic_in_carriageway', '%s %.1f,%.1f' % (name, x, z))
    if name == 'parked':
        off = sum(1 for it in arr if not carr.buffer(0.3).contains(Point(it[0] / 10, it[1] / 10))) if not carr.is_empty else 0
        info['parked_off_carriageway'] = off
# ---------------------------------------------------------------- 5. buildings vs carriageway
if not carr.is_empty:
    ctree_parts = list(getattr(carr, 'geoms', [carr])); ct = STRtree(ctree_parts)
    for bi, g in enumerate(bpoly):
        if B[bi][4] == 0 and len(B[bi]) > 11 and not B[bi][11].get('id'): continue
        ov = sum(g.intersection(ctree_parts[int(j)]).area for j in ct.query(g))
        if ov > 0.5: fail('building_in_carriageway', 'b%d %s %s overlap %.1f m2' % (bi, (B[bi][11] or {}).get('id', '') if len(B[bi]) > 11 else '', B[bi][9], ov))
# ---------------------------------------------------------------- 6. specials and key points
for k in ('mythos', 'paul', 'starbucks', 'kfc', 'super', 'sephora'):
    s = M['special'].get(k)
    if not s: fail('special_missing', k); continue
    if not (0 <= s['b'] < len(B)): fail('special_missing', '%s bad b' % k)
    it = s.get('interior') or {}
    if not it.get('poly') or not it.get('frontage') or not it.get('depth'): fail('special_missing', '%s interior incomplete' % k)
    if in_building(*s['door'], shrink=0.3) is not None: fail('special_missing', '%s door inside a building' % k)
for k in ('junction', 'sephora', 'mythos', 'platanos', 'station'):
    if k not in M['key']: fail('key_missing', k)
# ---------------------------------------------------------------- 7. scale audit + survey fidelity (needs kif.osm)
osm_ok = os.path.exists(OSMF)
if osm_ok:
    t = ET.parse(OSMF).getroot()
    nll = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in t.iter('node')}
    wnd = {w.get('id'): [r.get('ref') for r in w.findall('nd')] for w in t.iter('way')}
    def P(la, lo): return ((lo - LON0) * KX, -(la - LAT0) * KZ)
    # scale audit: 20 pairs of surveyed OSM POI nodes, spread over the map (game positions read back from the JSON)
    cand = [q for q in pois if q['id'].startswith('osm:n') and q['id'][5:] in nll]
    rnd = random.Random(20261121); pairs = []
    while len(pairs) < 20 and len(cand) > 2:
        a, b = rnd.sample(cand, 2)
        if math.dist((a['x'], a['z']), (b['x'], b['z'])) > 150: pairs.append((a, b))
    worst = 0; rows = []
    for a, b in pairs:
        la1, lo1 = nll[a['id'][5:]]; la2, lo2 = nll[b['id'][5:]]
        s12 = G.Inverse(la1, lo1, la2, lo2)['s12']; d = math.dist((a['x'], a['z']), (b['x'], b['z']))
        e = (d - s12) / s12; worst = max(worst, abs(e)); rows.append((a['name'] or a['cat'], b['name'] or b['cat'], s12, d, e * 100))
    info['scale_audit'] = dict(pairs=len(rows), max_rel_err_pct=round(worst * 100, 4), mean_rel_err_pct=round(sum(r[4] for r in rows) / max(1, len(rows)), 4))
    if worst > 0.001: fail('scale_audit', 'max relative error %.4f %% > 0.1 %%' % (worst * 100))
    if not QUIET:
        print('scale audit (geodesic WGS84 vs game metres):')
        for r in rows: print('   %-26s %-26s geo %8.2f m  game %8.2f m  err %+.4f %%' % (r[0][:26], r[1][:26], r[2], r[3], r[4]))
    # survey fidelity: building outlines and road centrelines vs OSM
    nb = worstb = 0
    for bi, b in enumerate(B):
        ex = b[11] if len(b) > 11 and isinstance(b[11], dict) else {}
        wid = str(ex.get('id', ''))
        if not wid.startswith('w') or wid[1:] not in wnd: continue
        ref = [P(*nll[n]) for n in wnd[wid[1:]] if n in nll]
        if len(ref) < 3: continue
        rg = LineString(ref); og = LineString(pts(b[10]) + [pts(b[10])[0]])
        h = max(rg.hausdorff_distance(og), 0); nb += 1; worstb = max(worstb, h)
        if h > 0.3: fail('building_geometry_moved', 'b%d %s hausdorff %.2f m' % (bi, wid, h))
    nr = worstr = 0
    for ri, r in enumerate(M['roads']):
        rid = str(M['roadx'][ri].get('id', '')) if ri < len(M.get('roadx', [])) else ''
        if not rid.startswith('w') or rid[1:] not in wnd: continue
        ref = LineString([P(*nll[n]) for n in wnd[rid[1:]] if n in nll])
        o = pts(r[8:])
        if len(o) < 2: continue
        h = max(ref.distance(Point(p)) for p in o); nr += 1; worstr = max(worstr, h)
        if h > 0.3: fail('road_geometry_moved', 'road %d %s max vertex offset %.2f m' % (ri, rid, h))
    info['survey_fidelity'] = dict(buildings=nb, worst_building_m=round(worstb, 3), roads=nr, worst_road_vertex_m=round(worstr, 3))
    # independent re-projection of 15 random OSM POIs (azimuthal equidistant on the WGS84 ellipsoid)
    sp = rnd.sample(cand, min(15, len(cand))); errs = []
    if not QUIET: print('spot check (independent geodesic re-projection of OSM node -> x,z):')
    for q in sp:
        la, lo = nll[q['id'][5:]]; g = G.Inverse(LAT0, LON0, la, lo); az = math.radians(g['azi1'])
        x, z = g['s12'] * math.sin(az), -g['s12'] * math.cos(az); e = math.dist((x, z), (q['x'], q['z'])); errs.append(e)
        if not QUIET: print('   %-30s osm %.7f,%.7f  json %8.2f,%8.2f  indep %8.2f,%8.2f  diff %.2f m' % ((q['name'] or q['cat'])[:30], la, lo, q['x'], q['z'], x, z, e))
    info['spot_check'] = dict(n=len(errs), max_diff_m=round(max(errs), 2) if errs else None)
else:
    info['scale_audit'] = 'skipped (no %s)' % OSMF
# ---------------------------------------------------------------- info: roads vs facade clearance, counts
narrow = []
for ri, rx in enumerate(M.get('roadx', [])):
    cl = [v for v in (rx.get('clear') or []) if v is not None]
    if cl and M['roads'][ri][7]:
        if M['roads'][ri][3] > min(cl) + 0.05: narrow.append((rx['id'], M['roads'][ri][3], min(cl)))
info['roads_wider_than_facade_gap'] = len(narrow)
foc = [q for q in pois if q.get('focus')]
info['pois'] = dict(total=len(pois), focus=len(foc), bySrc=dict(collections.Counter(q['src'] for q in pois)), byBay=dict(collections.Counter(q.get('bay') for q in pois)))
info['focus_by_cat'] = dict(collections.Counter(q['cat'] for q in foc).most_common())
info['furniture'] = {k: len(v) for k, v in props.items() if v}
info['synthetic'] = dict(street_trees=len(M['street_trees']), lamps=len(M['lamps']), bollards=len(M['bollards']), parked=len(M['parked']), garden_trees=len(M['garden_trees']))
info['specials'] = {k: dict(door=v['door'], b=v['b'], w=v.get('w'), depth=(v.get('interior') or {}).get('depth')) for k, v in M['special'].items()}

print('=== check_map %s (%.0f KB)' % (os.path.relpath(MAPF, ROOT), os.path.getsize(MAPF) / 1024))
for k, v in info.items(): print('INFO %-28s %s' % (k, json.dumps(v, ensure_ascii=False)))
HARD = ['poi_without_facade', 'bays_overlap', 'bay_outside_edge', 'legacy_shops_not_subset', 'door_inside_building', 'furniture_in_building', 'furniture_in_carriageway',
        'synthetic_in_building', 'synthetic_in_carriageway', 'building_in_carriageway', 'special_missing', 'key_missing', 'scale_audit', 'building_geometry_moved', 'road_geometry_moved']
bad = 0
for k in HARD:
    v = fails.get(k, []); bad += len(v)
    print('%s %-28s %d' % ('OK  ' if not v else 'FAIL', k, len(v)))
    for m in v[:8 if not QUIET else 3]: print('       ', m)
print('RESULT:', 'PASS' if bad == 0 else 'FAIL (%d violations)' % bad)
sys.exit(1 if bad else 0)
