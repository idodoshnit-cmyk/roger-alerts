#!/usr/bin/env python3
"""Grand Kifisia map pipeline v3 (team:data): OSM + EU-DEM + Overture places (+ research census/streets when present)
-> gk3/kifisia_map.json.   Usage: python3 build_map3.py [out.json]   (default: work/data/gk3/kifisia_map.json)

World: metres, x = east, z = south, origin Platanos square; x=(lon-23.8125)*87716, z=-(lat-38.0727)*110998 (1 unit = 1 m).
Everything that v2 (build_map2.py) wrote keeps its key, order and field positions; v3 only ADDS keys / APPENDS fields.
See docs/MAP_DATA.md for every key."""
import json, math, hashlib, random, os, sys, re, time, unicodedata, difflib, collections
import xml.etree.ElementTree as ET
import numpy as np, shapely
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union, linemerge
from shapely.strtree import STRtree
from shapely.prepared import prep

ROOT = os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'work/data/gk3/kifisia_map.json')
REPORT = os.path.join(ROOT, 'work/data/tmp/build_report.json')
RESEARCH = os.path.join(ROOT, 'gk3/data')                       # research bots write here (main)
OVERTURE = os.path.join(ROOT, 'tools/data/src/overture_places_2026-11-18.geojson')
T0 = time.time()
LAT0, LON0 = 38.0727, 23.8125
KX, KZ = 87716.0, 110998.0
def P(lat, lon): return ((lon - LON0) * KX, -(lat - LAT0) * KZ)
def LL(x, z): return (LAT0 - z / KZ, LON0 + x / KX)
random.seed(7)
R = lambda v: int(round(v * 10))            # decimetres
r2 = lambda v: round(float(v), 2)
def H(s): return int(hashlib.md5(str(s).encode()).hexdigest()[:8], 16)
def flat(coords):
    o = []
    for x, z in coords: o += [R(x), R(z)]
    return o
def log(*a): print('[%5.1fs]' % (time.time() - T0), *a); sys.stdout.flush()

# ---------------------------------------------------------------- OSM load (ids kept for nodes, ways, relations)
def load_osm(path='kif.osm'):
    t = ET.parse(path).getroot()
    nodes = {}; ntags = {}; nll = {}
    for n in t.iter('node'):
        la, lo = float(n.get('lat')), float(n.get('lon'))
        nodes[n.get('id')] = P(la, lo); nll[n.get('id')] = (la, lo)
        tg = {x.get('k'): x.get('v') for x in n.findall('tag')}
        if tg: ntags[n.get('id')] = tg
    ways = {}
    for w in t.iter('way'):
        ways[w.get('id')] = ([r.get('ref') for r in w.findall('nd')], {x.get('k'): x.get('v') for x in w.findall('tag')})
    rels = []
    for r in t.iter('relation'):
        rels.append(([(m.get('type'), m.get('ref'), m.get('role')) for m in r.findall('member')],
                     {x.get('k'): x.get('v') for x in r.findall('tag')}, r.get('id')))
    return nodes, ntags, ways, rels, nll
nodes, ntags, ways, rels, nll = load_osm()
route = json.load(open('route.json'))
def research(name):
    p = os.path.join(RESEARCH, name)
    try: return json.load(open(p))
    except Exception: return None
CENSUS = research('census.json'); STREETS = research('streets.json')

# ---------------------------------------------------------------- names: Greek -> Latin
_DG = [('ου', 'ou'), ('αι', 'ai'), ('ει', 'ei'), ('οι', 'oi'), ('γγ', 'ng'), ('γκ', 'gk'), ('τσ', 'ts'), ('τζ', 'tz'), ('ντ', 'nt')]
_SG = dict(zip('αβγδεζηθικλμνξοπρσςτυφχψω', ['a', 'v', 'g', 'd', 'e', 'z', 'i', 'th', 'i', 'k', 'l', 'm', 'n', 'x', 'o', 'p', 'r', 's', 's', 't', 'y', 'f', 'ch', 'ps', 'o']))
def strip_acc(s): return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
def has_greek(s): return any('Ͱ' <= ch <= 'Ͽ' or 'ἀ' <= ch <= '῿' for ch in s or '')
def translit(s):
    """ELOT-743 style transliteration, keeping the capitalisation of each word."""
    if not s or not has_greek(s): return s or ''
    out = []
    for word in re.split(r'(\s+|-)', s):
        w = strip_acc(word); lw = w.lower(); o = ''; i = 0
        if lw.startswith('μπ'): o = 'b'; i = 2
        while i < len(lw):
            two = lw[i:i + 2]
            if two in ('αυ', 'ευ', 'ηυ'):
                nxt = lw[i + 2:i + 3]; v = 'f' if (nxt in 'θκξπστφχψ' or nxt == '') and nxt != '' or nxt == '' else 'v'
                o += {'α': 'a', 'ε': 'e', 'η': 'i'}[two[0]] + v; i += 2; continue
            for a, b in _DG:
                if two == a: o += b; i += 2; break
            else:
                o += _SG.get(lw[i], lw[i]); i += 1
        if w[:1].isupper(): o = o.upper() if (len(w) > 1 and w.isupper()) else o[:1].upper() + o[1:]
        out.append(o)
    return ''.join(out)
STOP = {'kifisia', 'kifissia', 'kifisias', 'store', 'shop', 'the', 'athens', 'greece', 'boutique', 'cafe', 'restaurant', 'bar', 'official', 'page', 'hellas', 'gr'}
def norm(s):
    s = translit(s or '').lower(); s = strip_acc(s)
    toks = [t for t in re.split(r'[^a-z0-9]+', s) if t and t not in STOP]
    return ''.join(toks)
def snorm(s):
    """street-name key (no stop-word removal: 'Κηφισίας' must not vanish)"""
    s = strip_acc(translit(s or '').lower())
    return re.sub(r'[^a-z0-9]+', '', s).replace('leoforos', '').replace('leof', '').replace('odos', '').replace('plateia', 'plateia')
def same_place(na, nb, dist):
    if not na or not nb: return False
    if na == nb: return dist < 90
    if dist < 55 and difflib.SequenceMatcher(None, na, nb).ratio() >= 0.82: return True
    if dist < 35 and min(len(na), len(nb)) >= 4 and (na in nb or nb in na): return True
    return False

# ---------------------------------------------------------------- regions (identical to v2)
KEY = {k: P(*v) for k, v in {
    'platanos': (38.07235, 23.8117), 'station': (38.0736082, 23.8082244), 'alsos': (38.0732871, 23.8092766),
    'kfc': (38.072797, 23.812455), 'mythos': (38.072288, 23.81336), 'super': (38.071945, 23.813146),
    'starbucks': (38.072218, 23.814301), 'paul': (38.0724018, 23.8139308), 'agora': (38.07261, 23.81644), 'goulandris': (38.0743, 23.8149),
    'kefalari': (38.0747, 23.8205), 'church': (38.07014, 23.8116)}.items()}
isa_poly = Polygon(route['isa'])
route_line = LineString(route['route'])
center = unary_union([Point(KEY[k]) for k in ('platanos', 'station', 'alsos', 'kfc', 'mythos', 'super', 'starbucks', 'agora', 'goulandris')]).convex_hull.buffer(95)
focus = unary_union([center, route_line.buffer(75), isa_poly.buffer(75)]).simplify(2)
context = focus.buffer(150).simplify(4)
playable = focus.buffer(45).simplify(3)
fprep, cprep, pprep = prep(focus), prep(context), prep(playable)
minx, minz, maxx, maxz = context.bounds
log('focus area %.0f m2, context bbox %.0f x %.0f' % (focus.area, maxx - minx, maxz - minz))

# ---------------------------------------------------------------- terrain (identical to v2)
E = json.load(open('elev.json'))
LATm, LONm, ST, nr, nc, KXe, KZe = E['lat0'], E['lon0'], E['step'], E['nr'], E['nc'], E['kx'], E['kz']
Hraw = np.array(E['h'], dtype=float).reshape(nr, nc)
def elev_latlon(lat, lon):
    r = (lat - LATm) * KZe / ST; c = (lon - LONm) * KXe / ST
    r0 = int(np.clip(math.floor(r), 0, nr - 2)); c0 = int(np.clip(math.floor(c), 0, nc - 2))
    fr = min(max(r - r0, 0), 1); fc = min(max(c - c0, 0), 1)
    h = Hraw[r0:r0 + 2, c0:c0 + 2]
    return (h[0, 0] * (1 - fc) + h[0, 1] * fc) * (1 - fr) + (h[1, 0] * (1 - fc) + h[1, 1] * fc) * fr
TG = 8.0
gx0, gz0 = math.floor(minx / TG) * TG - TG, math.floor(minz / TG) * TG - TG
gnx, gnz = int((maxx - gx0) / TG) + 3, int((maxz - gz0) / TG) + 3
T = np.zeros((gnz, gnx))
for j in range(gnz):
    for i in range(gnx):
        x, z = gx0 + i * TG, gz0 + j * TG
        T[j, i] = elev_latlon(LAT0 - z / KZ, LON0 + x / KX)
k = np.array([1, 4, 6, 4, 1], float); k /= k.sum()
for _ in range(2):
    T = np.apply_along_axis(lambda v: np.convolve(np.pad(v, 2, mode='edge'), k, 'valid'), 1, T)
    T = np.apply_along_axis(lambda v: np.convolve(np.pad(v, 2, mode='edge'), k, 'valid'), 0, T)
BASE = float(T.min())
T -= BASE
def terr(x, z):
    fi = (x - gx0) / TG; fj = (z - gz0) / TG
    i0 = int(np.clip(math.floor(fi), 0, gnx - 2)); j0 = int(np.clip(math.floor(fj), 0, gnz - 2))
    fi = min(max(fi - i0, 0), 1); fj = min(max(fj - j0, 0), 1)
    return (T[j0, i0] * (1 - fi) + T[j0, i0 + 1] * fi) * (1 - fj) + (T[j0 + 1, i0] * (1 - fi) + T[j0 + 1, i0 + 1] * fi) * fj
log('terrain grid %dx%d, relief %.1f m (base %.1f m asl)' % (gnx, gnz, T.max(), BASE))

# ---------------------------------------------------------------- roads: parse (same order as v2)
RT = {'primary': 0, 'primary_link': 0, 'trunk': 0, 'secondary': 1, 'secondary_link': 1, 'tertiary': 2, 'tertiary_link': 2,
      'residential': 3, 'unclassified': 3, 'living_street': 4, 'service': 5, 'pedestrian': 6, 'footway': 7, 'path': 8,
      'track': 8, 'cycleway': 7, 'steps': 9}
DEFW = [13.0, 9.0, 7.5, 6.0, 5.0, 4.0, 6.0, 2.2, 2.0, 2.4]
SURF = {'asphalt': 0, 'paving_stones': 1, 'sett': 1, 'cobblestone': 1, 'unhewn_cobblestone': 1, 'bricks': 2, 'concrete': 3,
        'concrete:plates': 3, 'paved': 0, 'gravel': 4, 'fine_gravel': 4, 'dirt': 4, 'ground': 4, 'compacted': 4, 'unpaved': 4, 'grass': 4}
RSTREET = {}
if STREETS:
    for s in STREETS.get('streets', []):
        if s.get('name'): RSTREET[s['name']] = s
def fnum(v):
    try: return float(str(v).replace(',', '.').split()[0])
    except Exception: return None
def park_tags(tg):
    """-> (left, right) in OSM sense (relative to way direction): 'lane'|'street_side'|'no'|None"""
    b = tg.get('parking:both') or tg.get('parking:lane:both')
    l = tg.get('parking:left') or tg.get('parking:lane:left') or b
    r = tg.get('parking:right') or tg.get('parking:lane:right') or b
    f = lambda v: None if v is None else ('no' if v in ('no', 'no_parking', 'no_stopping', 'separate') else v)
    return f(l), f(r)
def base_width(ty, tg, ow):
    """carriageway width (kerb to kerb) before the facade-clearance check -> (metres, source)"""
    w = fnum(tg.get('width'))
    if w and ty != 9: return w, 'tag:width'
    rs = RSTREET.get(tg.get('name', ''))
    if rs and fnum(rs.get('carriagewayM')): return fnum(rs['carriagewayM']), 'research:streets.json'
    lanes = fnum(tg.get('lanes')); pl, pr = park_tags(tg)
    npark = sum(1 for v in (pl, pr) if v in ('lane', 'parallel', 'yes', 'street_side', 'half_on_kerb'))
    nopark = pl == 'no' and pr == 'no'
    if ty == 0:
        n = lanes or (3 if ow else 4); return n * 3.25 + 0.6, 'lanes' if lanes else 'class'
    if ty == 1:
        n = lanes or (1 if ow else 2); return n * 3.25 + (2.2 if n == 1 and not nopark else 1.0), 'lanes' if lanes else 'class'
    if ty in (2, 3):
        if lanes:
            return lanes * 3.0 + (2.0 * max(npark, 0 if nopark else 1) if lanes == 1 else (2.0 * npark + 0.5)), 'lanes'
        if ow: return (3.6 if nopark else 5.4 + 2.0 * max(0, npark - 1)), 'class'
        return (7.0 if ty == 2 else 6.0), 'class'
    if ty == 4: return 4.5, 'class'
    if ty == 5:
        sv = tg.get('service', '')
        return {'driveway': 3.0, 'parking_aisle': 5.0, 'alley': 3.2}.get(sv, 3.6), 'class'
    if ty == 6: return 6.0, 'class'
    return DEFW[ty], 'class'
roads = []
names = []; nameidx = {}
def nid(n):
    if n not in nameidx: nameidx[n] = len(names); names.append(n)
    return nameidx[n]
road_nodes = {}  # osm node -> list of (road index, vertex index)
for wid, (refs, tg) in ways.items():
    hw = tg.get('highway')
    if hw not in RT: continue
    pts = [nodes[r] for r in refs if r in nodes]
    if len(pts) < 2: continue
    ls = LineString(pts)
    if not ls.intersects(context): continue
    ty = RT[hw]
    if tg.get('area') == 'yes': continue
    ow = 1 if tg.get('oneway') in ('yes', '1', 'true') else (-1 if tg.get('oneway') == '-1' else 0)
    if hw in ('primary_link', 'secondary_link', 'tertiary_link') and 'oneway' not in tg: ow = 1
    w, wsrc = base_width(ty, tg, ow != 0)
    surf = SURF.get(tg.get('surface', ''), 4 if ty == 8 else 0)
    if ty in (6, 7) and 'surface' not in tg: surf = 3
    fw = tg.get('footway', '')
    hidden = (ty == 7 and fw in ('sidewalk', 'crossing')) or tg.get('tunnel') == 'yes'
    sw = tg.get('sidewalk', tg.get('sidewalk:both', ''))
    side = {'no': 0, 'none': 0, 'separate': 0, 'left': 1, 'right': 2, 'both': 3, 'yes': 3}.get(sw, 3 if ty <= 4 else 0)
    ri = len(roads)
    rr = [r for r in refs if r in nodes]
    for vi, r in enumerate(rr): road_nodes.setdefault(r, []).append((ri, vi))
    roads.append(dict(id=wid, ty=ty, w=w, w0=w, wsrc=wsrc, surf=surf, name=tg.get('name', ''), ow=ow, side=side, hidden=hidden, tg=tg,
                      pts=pts, refs=rr, ls=ls, infocus=ls.intersects(focus)))
log('roads', len(roads))
car_roads = [r for r in roads if r['ty'] <= 5 and not r['hidden']]
ped_ways = [r for r in roads if r['ty'] in (6, 7, 8, 9) and not r['hidden']]
cprep_center = prep(center.buffer(20))
for r in roads: r['center'] = cprep_center.intersects(r['ls'])

# ---------------------------------------------------------------- buildings: parse (same order as v2)
bpolys = []
def add_building(pts, tg, key, osmid):
    if len(pts) < 4: return
    try: poly = Polygon(pts).buffer(0)
    except Exception: return
    if poly.is_empty or poly.area < 6: return
    if poly.geom_type == 'MultiPolygon': poly = max(poly.geoms, key=lambda g: g.area)
    if not cprep.intersects(poly): return
    poly = poly.simplify(0.25, preserve_topology=True)       # removes only near-collinear vertices: no corner moves > 0.25 m
    bpolys.append((poly, tg, key, osmid))
for wid, (refs, tg) in ways.items():
    if 'building' in tg and refs and refs[0] == refs[-1] and tg.get('building') not in ('roof',):
        add_building([nodes[r] for r in refs if r in nodes], tg, wid, 'w' + wid)
for members, tg, rid in rels:
    if tg.get('type') == 'multipolygon' and 'building' in tg:
        for mt, ref, role in members:
            if mt == 'way' and role == 'outer' and ref in ways and ways[ref][0][0] == ways[ref][0][-1]:
                add_building([nodes[r] for r in ways[ref][0] if r in nodes], tg, ref, 'r' + rid)
log('buildings in context', len(bpolys))
bgeoms = np.array([b[0] for b in bpolys], dtype=object)
btree = STRtree(bgeoms)
buildings_union = unary_union(list(bgeoms))
shapely.prepare(buildings_union)
bkey_bi = {}
for bi, b in enumerate(bpolys): bkey_bi.setdefault(b[3], bi)

# ---------------------------------------------------------------- street proportions: facade-to-facade clearance per road
# For every carriageway we cast rays perpendicular to the centre line every 3 m and measure the distance to the first building
# on each side.  Side A = normal (-dz, dx) ("left" in map x/z coordinates = the RIGHT of a traveller, because z points south);
# side B = (dz, -dx) = OSM "left".  All per-side values written to the JSON use the OSM sense [left, right].
REACH = 32.0
def clearances(rlist):
    P0 = []; RA = []; RB = []; owner = []
    for qi, r in enumerate(rlist):
        ls = r['ls']; L = ls.length
        n = max(2, int(L / 3.0)); m = min(2.5, L * 0.2)
        for d in np.linspace(m, L - m, n):
            p = ls.interpolate(d); a = ls.interpolate(max(0, d - 0.6)); b = ls.interpolate(min(L, d + 0.6))
            dx, dz = b.x - a.x, b.y - a.y; l = math.hypot(dx, dz)
            if l < 1e-6: continue
            dx /= l; dz /= l
            P0.append((p.x, p.y)); owner.append(qi)
            RA.append(((p.x, p.y), (p.x - dz * REACH, p.y + dx * REACH)))
            RB.append(((p.x, p.y), (p.x + dz * REACH, p.y - dx * REACH)))
    P0 = np.array(P0); owner = np.array(owner); res = []
    pts = shapely.points(P0)
    for rays in (RA, RB):
        lines = shapely.linestrings(np.array(rays))
        qi, gi = btree.query(lines, predicate='intersects')
        d = np.full(len(lines), np.inf)
        if len(qi):
            inter = shapely.intersection(lines[qi], bgeoms[gi])
            dd = shapely.distance(pts[qi], inter)
            np.minimum.at(d, qi, dd)
        res.append(d)
    out = []
    for qi, r in enumerate(rlist):
        m = owner == qi
        out.append((res[0][m], res[1][m]))
    return out
cl = clearances(car_roads)
def pct(a, q):
    a = a[np.isfinite(a)]
    return float(np.percentile(a, q)) if len(a) else None
for r, (da, db) in zip(car_roads, cl):
    n = max(1, len(da))
    cov = [float(np.sum(np.isfinite(d) & (d < 22)) / n) for d in (da, db)]
    r['cov'] = cov
    r['p15'] = [pct(d, 15) if c >= 0.35 else None for d, c in zip((da, db), cov)]     # typical building line
    r['p3'] = [pct(d, 3) if np.isfinite(d).any() else None for d in (da, db)]          # nearest building corner
# 1) width from tags/class, limited by the corridor: carriageway + 2 footways must fit between the building lines
MIN_SW = 1.2
def limit_w(r):
    w = r['w0']; a, b = r['p15']; lim = []
    minw = 2.6 if r['ty'] == 5 else 3.0
    if a is not None and b is not None: lim.append(a + b - 2 * (MIN_SW if r['ty'] != 5 else 0.3))
    for v in (a, b):
        if v is not None: lim.append(2 * (v - (MIN_SW if r['ty'] != 5 else 0.3)))
    for v in r['p3']:
        if v is not None: lim.append(2 * (v - 0.35))
    if lim and min(lim) < w: return max(minw, min(lim)), True
    return w, False
for r in car_roads:
    r['wown'], r['clamped'] = limit_w(r)
# 2) one width per street (name+class+direction): the 25th percentile (by length) of its ways, narrowed further only where a way needs it
groups = collections.defaultdict(list)
for r in car_roads:
    if r['name'] and r['ty'] <= 4: groups[(r['name'], r['ty'], r['ow'] != 0, r['tg'].get('lanes'))].append(r)
for g in groups.values():
    ws = sorted((r['wown'], r['ls'].length) for r in g); tot = sum(l for w, l in ws); acc = 0; wg = ws[0][0]
    for w, l in ws:
        acc += l
        if acc >= tot * 0.25: wg = w; break
    for r in g: r['w'] = min(r['wown'], max(wg, 3.0)) if r['wown'] < r['w0'] or wg < r['w0'] else r['w0']
for r in car_roads:
    if not (r['name'] and r['ty'] <= 4): r['w'] = r['wown']
    if r['w'] < r['w0'] - 0.05: r['wsrc'] = r['wsrc'] + '+clearance'
    r['w'] = round(r['w'], 1)
# 3) hard guarantee: no building inside a carriageway (shrink the offending way; report what remains)
def strip(r, extra=0.0): return r['ls'].buffer(r['w'] / 2 + extra, cap_style='flat', join_style='round', resolution=6)
bu_tree_hits = 0
for it in range(12):
    bad = 0
    for r in car_roads:
        s = strip(r)
        if shapely.intersects(buildings_union, s) and buildings_union.intersection(s).area > 0.05:
            minw = 2.4 if r['ty'] == 5 else 2.8
            if r['w'] > minw: r['w'] = round(max(minw, r['w'] - 0.4), 1); bad += 1; r['wsrc'] = r['wsrc'].replace('+clearance', '') + '+clearance'
    if not bad: break
log('width calibration: %d ways narrowed by clearance; iterations %d' % (sum(1 for r in car_roads if 'clearance' in r['wsrc']), it + 1))
# 4) footway width per side: up to the building line where the street is built up, class default elsewhere
def default_sw(r):
    rs = RSTREET.get(r['name']); v = fnum((rs or {}).get('sidewalk', {}).get('widthM')) if rs else None
    if v: return v
    if r['ty'] == 0: return 3.6
    if r['center']: return 2.6
    return 2.0 if r['ty'] <= 3 else 1.5
SW_MAX = 7.0
for r in car_roads:
    d = default_sw(r); sw = []
    for sidx in (0, 1):
        p = r['p15'][sidx]
        if p is None: sw.append(d)
        else: sw.append(round(min(SW_MAX, max(0.6, p - r['w'] / 2)), 1) if (p - r['w'] / 2) < SW_MAX + 2.5 else d)
    r['swA'], r['swB'] = sw                  # A = map-left (traveller's right), B = OSM left
for r in roads:
    if 'swA' not in r: r['swA'] = r['swB'] = 0.0

# ---------------------------------------------------------------- areas (as v2; needed before frontage tests)
AK = [('leisure', 'park', 'park'), ('leisure', 'garden', 'garden'), ('landuse', 'grass', 'grass'), ('landuse', 'forest', 'wood'),
      ('natural', 'wood', 'wood'), ('natural', 'heath', 'scrub'), ('natural', 'scrub', 'scrub'), ('leisure', 'swimming_pool', 'pool'),
      ('natural', 'water', 'water'), ('amenity', 'parking', 'parking'), ('leisure', 'playground', 'play'), ('railway', 'platform', 'platform'),
      ('public_transport', 'platform', 'platform'), ('amenity', 'school', 'school'), ('leisure', 'sports_centre', 'sport'), ('amenity', 'fountain', 'water'),
      ('place', 'square', 'plaza'), ('highway', 'pedestrian', 'plaza'), ('landuse', 'railway', 'rail'), ('leisure', 'pitch', 'pitch'), ('amenity', 'grave_yard', 'grass')]
def akind(tg):
    for k, v, kind in AK:
        if tg.get(k) == v:
            if kind == 'plaza' and k == 'highway' and tg.get('area') != 'yes': continue
            return kind
areas = []
def add_area(pts, tg, osmid):
    kind = akind(tg)
    if not kind or len(pts) < 4: return
    try: poly = Polygon(pts).buffer(0)
    except Exception: return
    if poly.is_empty: return
    poly = poly.intersection(context)
    for g in getattr(poly, 'geoms', [poly]):
        if g.geom_type == 'Polygon' and g.area > 4: areas.append((kind, g, tg, osmid))
for wid, (refs, tg) in ways.items():
    if refs and refs[0] == refs[-1] and 'building' not in tg: add_area([nodes[r] for r in refs if r in nodes], tg, 'w' + wid)
for members, tg, rid in rels:
    if tg.get('type') == 'multipolygon' and akind(tg):
        for mt, ref, role in members:
            if mt == 'way' and role == 'outer' and ref in ways and ways[ref][0][0] == ways[ref][0][-1]:
                add_area([nodes[r] for r in ways[ref][0] if r in nodes], tg, 'r' + rid)
plat_lines = [LineString([nodes[r] for r in refs if r in nodes]) for wid, (refs, tg) in ways.items()
              if tg.get('railway') == 'platform' and refs and refs[0] != refs[-1]]
if len(plat_lines) >= 2:
    c1 = list(plat_lines[0].coords); c2 = list(plat_lines[1].coords)
    if math.dist(c1[-1], c2[0]) > math.dist(c1[-1], c2[-1]): c2 = c2[::-1]
    pg = Polygon(c1 + c2[1:]).buffer(0)
    if pg.area > 50: areas.append(('platform', pg, {'railway': 'platform'}, ''))
log('areas', len(areas))
pedpaths = unary_union([r['ls'].buffer(r['w'] / 2, cap_style='round', resolution=4) for r in ped_ways]) if ped_ways else Polygon()
plaza_union = unary_union([g for k, g, t, i in areas if k in ('plaza', 'platform')] + [pedpaths]) if areas else Polygon()
park_union = unary_union([g for k, g, t, i in areas if k in ('park', 'garden', 'grass', 'wood', 'scrub')])
school_union = unary_union([g for k, g, t, i in areas if k == 'school'])
pool_union = unary_union([g for k, g, t, i in areas if k in ('pool', 'water')])

# ---------------------------------------------------------------- carriageway, junction corners, footways
# carriageway = flat-ended strips; ways that END at a shared node get a disc of the narrower half-width so bends close without blobs
discs = []
car_set = {id(r) for r in car_roads}
junction_nodes = []; junctions = []
for n, lst in road_nodes.items():
    cars = [(ri, vi) for ri, vi in lst if id(roads[ri]) in car_set]
    if len(cars) < 2: continue
    ends = [roads[ri]['w'] for ri, vi in cars if vi in (0, len(roads[ri]['refs']) - 1)]
    if len(ends) >= 2: discs.append(Point(nodes[n]).buffer(min(ends) / 2, resolution=8))
    arms = sum(1 if vi in (0, len(roads[ri]['refs']) - 1) else 2 for ri, vi in cars)
    if len({ri for ri, vi in cars}) >= 2:
        junction_nodes.append(nodes[n])
        if arms >= 3 and cprep.contains(Point(nodes[n])):
            junctions.append((n, nodes[n], arms, sorted({ri for ri, vi in cars})))
carriage0 = unary_union([strip(r) for r in car_roads] + discs)
# kerb radii: close the carriageway by R (rounds the concave corners between two kerb lines), keep only the small corner pieces at junctions
jtree = STRtree([Point(p) for p in junction_nodes])
def fillets(R_):
    closed = carriage0.buffer(R_, join_style='round', resolution=8).buffer(-R_, join_style='round', resolution=8)
    out = []
    for g in getattr(closed.difference(carriage0), 'geoms', []):
        if g.geom_type != 'Polygon' or g.area < 0.12 or g.area > 26: continue
        c = g.representative_point()
        if not cprep.contains(c): continue
        near = jtree.query(c.buffer(15))
        if not len(near): continue
        if shapely.intersects(buildings_union, g): g = g.difference(buildings_union.buffer(0.3))
        if g.is_empty or g.geom_type != 'Polygon' or g.area < 0.12: continue
        out.append(g)
    return out
FIL = fillets(4.0)
carriage = unary_union([carriage0] + FIL)
# the surveyed facades win over the estimated kerb line: where a way at its minimum width still touches a building (OSM centre line off-centre,
# building passages), the carriageway is cut back to the facade
_cb = carriage.intersection(buildings_union).area
if _cb > 0.05: carriage = carriage.difference(buildings_union).buffer(0)
log('carriageway cut back to facades: %.1f m2' % _cb)
log('carriage %.0f m2, junction corner fillets %d (%.0f m2)' % (carriage.area, len(FIL), sum(g.area for g in FIL)))
def side_buf(ls, d, left):
    try:
        g = ls.buffer(d if left else -d, single_sided=True, join_style='round', resolution=6)
        return g if g.is_valid else g.buffer(0)
    except Exception:
        return Polygon()
sw_parts = []
for r in car_roads:
    if r['side'] == 0 or r['ty'] == 5: continue
    a_on = r['side'] in (2, 3); b_on = r['side'] in (1, 3)      # OSM right = side A, OSM left = side B
    hw = r['w'] / 2
    if a_on and b_on:
        sw_parts.append(r['ls'].buffer(hw + min(r['swA'], r['swB']), cap_style='round', join_style='round', resolution=6))
    if a_on and (not b_on or r['swA'] > r['swB'] + 0.05): sw_parts.append(side_buf(r['ls'], hw + r['swA'], True))
    if b_on and (not a_on or r['swB'] > r['swA'] + 0.05): sw_parts.append(side_buf(r['ls'], hw + r['swB'], False))
sidewalk_full = unary_union([g for g in sw_parts if not g.is_empty])
sidewalk = sidewalk_full.difference(carriage).difference(buildings_union.buffer(0.05))
# pave the slivers (< 2.4 m) left between a footway and a facade
near_b = buildings_union.intersection(sidewalk_full.buffer(4))
closed = unary_union([sidewalk, near_b]).buffer(1.2, join_style='mitre').buffer(-1.2, join_style='mitre')
sliver = closed.difference(unary_union([near_b.buffer(0.05), carriage, pool_union]))
sidewalk = unary_union([sidewalk, sliver]).difference(carriage).difference(buildings_union.buffer(0.05)).buffer(0)
log('footways %.0f m2' % sidewalk.area)
road_tree = STRtree([r['ls'] for r in car_roads])
def nearest_road(p, maxd=40):
    pt = Point(p); best = None
    for i in road_tree.query(pt.buffer(maxd)):
        r = car_roads[int(i)]; d = r['ls'].distance(pt) - r['w'] / 2
        if best is None or d < best[0]: best = (d, r)
    return best
def omb_rect(poly):
    mrr = poly.minimum_rotated_rectangle
    c = list(mrr.exterior.coords)[:4]
    e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1]); e2 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
    l1, l2 = math.hypot(*e1), math.hypot(*e2)
    cx = sum(p[0] for p in c) / 4; cz = sum(p[1] for p in c) / 4
    if l1 >= l2: return cx, cz, l1, l2, math.atan2(e1[1], e1[0])
    return cx, cz, l2, l1, math.atan2(e2[1], e2[0])

# ---------------------------------------------------------------- building records (v2 heuristics kept) + per-edge frontage
CENTER_STREETS = {'Κασσαβέτη', 'Λεβίδου', 'Κολοκοτρώνη', 'Κηφισίας', 'Λεωφόρος Κηφισίας', 'Αργυροπούλου', 'Παπαδιαμάντη', 'Κυριαζή',
                  'Δροσίνη', 'Μπενάκη', 'Τατοΐου', 'Κόκκινου', 'Παλαιολόγου', 'Δηληγιάννη', 'Όθωνος', 'Χαριλάου Τρικούπη'}
special_bld = {}
def bld_at(key):
    pt = Point(KEY[key]); best = None
    for i in btree.query(pt.buffer(30)):
        poly = bpolys[int(i)][0]; d = poly.distance(pt)
        if best is None or d < best[0]: best = (d, int(i))
    return best[1] if best and best[0] < 12 else None
for k_ in ('agora', 'goulandris', 'station'):
    bi = bld_at(k_)
    if bi is not None: special_bld[bi] = k_
out_b = []
for bi, (poly, tg, key, osmid) in enumerate(bpolys):
    h = H(key); A = poly.area
    detail = fprep.intersects(poly)
    btype = tg.get('building', 'yes')
    lv_tag = fnum(tg.get('building:levels')); lv = int(round(lv_tag)) if lv_tag else None
    in_center = cprep_center.intersects(poly)
    if lv is None:
        if btype in ('house', 'detached', 'villa', 'semidetached_house'): lv = 2
        elif btype in ('garage', 'garages', 'shed', 'hut', 'kiosk', 'carport', 'service'): lv = 1
        elif btype in ('apartments', 'residential'): lv = 3 + (h % 3 == 0)
        elif A < 45: lv = 1
        elif A < 120: lv = 2
        elif A < 300: lv = 2 + (h % 3 != 0)
        elif A < 900: lv = 3 + (h % 2)
        else: lv = 3 + (h % 3)
        if in_center and A > 150: lv = max(lv, 3)
    lv = max(1, min(lv, 7))
    cx, cz, L, W, ang = omb_rect(poly)
    fill = A / max(1, L * W)
    style = 'apt'
    if btype in ('church', 'chapel', 'cathedral') or tg.get('amenity') == 'place_of_worship': style = 'church'
    elif btype in ('school', 'university', 'college'): style = 'school'
    elif btype in ('commercial', 'retail', 'office', 'supermarket'): style = 'shop'
    elif lv <= 2 and A < 450:
        style = 'neo' if (h % 100) < (45 if in_center else 22) else 'villa'
    elif lv >= 3: style = 'apt' if (h % 100) > 12 else 'modern'
    sk = special_bld.get(bi)
    if sk == 'agora': style = 'agora'; lv = 2
    if sk == 'goulandris': style = 'neo'; lv = 2
    roof = 'flat'
    if style in ('neo', 'villa', 'church', 'agora') and fill > 0.72 and L < 40: roof = 'hip'
    if tg.get('roof:shape') in ('hipped', 'gabled', 'pyramidal'): roof = 'hip'
    if tg.get('roof:shape') == 'flat': roof = 'flat'
    if style == 'neo' and roof == 'flat': roof = 'hip' if fill > 0.6 else 'flat'
    coords = [(round(x, 1), round(z, 1)) for x, z in list(poly.exterior.coords)[:-1]]   # the JSON stores decimetres: lay bays out on exactly those coordinates
    gmin = min(terr(x, z) for x, z in coords); gmax = max(terr(x, z) for x, z in coords)
    edges = []; n = len(coords); normals = []
    for i in range(n):
        a, b = coords[i], coords[(i + 1) % n]
        dx, dz = b[0] - a[0], b[1] - a[1]; Le = math.hypot(dx, dz)
        if Le < 0.5: edges.append(0); normals.append((0.0, 0.0, Le)); continue
        mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        nx, nz = dz / Le, -dx / Le
        if poly.contains(Point(mx + nx * 0.3, mz + nz * 0.3)): nx, nz = -nx, -nz
        normals.append((nx, nz, Le))
        nr_ = nearest_road((mx + nx * 3, mz + nz * 3), 30)
        f = 0
        if nr_ and nr_[0] < 12 and Le > 2.5:
            rp = nr_[1]['ls'].interpolate(nr_[1]['ls'].project(Point(mx, mz)))
            vx, vz = rp.x - mx, rp.y - mz; vl = math.hypot(vx, vz) or 1
            if (vx * nx + vz * nz) / vl > 0.55:
                f = 2 if (in_center and (nr_[1]['name'] in CENTER_STREETS or nr_[1]['ty'] <= 2) and style in ('apt', 'neo', 'shop', 'modern', 'agora')) else 1
        edges.append(f)
    out_b.append(dict(bi=bi, key=key, osmid=osmid, tg=tg, poly=poly, coords=coords, lv=lv, lv_tag=lv_tag, style=style, roof=roof, detail=detail, h=h,
                      gmin=gmin, gmax=gmax, edges=edges, normals=normals, rect=(cx, cz, L, W, ang), shops=[], name=tg.get('name', ''), center=in_center,
                      setb=[-1.0] * n, fs=[-1] * n))
log('styles', {s: sum(1 for b in out_b if b['style'] == s) for s in sorted(set(b['style'] for b in out_b))})
# frontage test for every edge: walk outwards from the edge midpoint; public space (road, footway, pedestrian way, square) reached
# before any building -> the edge is a street facade, with its setback in metres
public = unary_union([carriage, sidewalk_full, pedpaths, plaza_union]); shapely.prepare(public)
EB = []; EI = []; MX = []; MZ = []; NX = []; NZ = []
for b in out_b:
    co = b['coords']; n = len(co)
    for i in range(n):
        nx, nz, Le = b['normals'][i]
        if Le < 1.5: continue
        a, c = co[i], co[(i + 1) % n]
        EB.append(b['bi']); EI.append(i); MX.append((a[0] + c[0]) / 2); MZ.append((a[1] + c[1]) / 2); NX.append(nx); NZ.append(nz)
MX, MZ, NX, NZ = map(np.array, (MX, MZ, NX, NZ)); state = np.zeros(len(MX), int); setb = np.full(len(MX), -1.0)
for d in (0.7, 1.5, 2.5, 4, 6, 8, 10, 12.5, 15):
    idx = np.where(state == 0)[0]
    x = MX[idx] + NX[idx] * d; z = MZ[idx] + NZ[idx] * d
    inb = shapely.contains_xy(buildings_union, x, z); inp = shapely.contains_xy(public, x, z)
    state[idx[inb]] = -1
    ok = idx[~inb & inp]; state[ok] = 1; setb[ok] = d
named_roads = [r for r in roads if r['name'] and not r['hidden']]
ntree = STRtree([r['ls'] for r in named_roads])
fidx = np.where(state == 1)[0]
qpts = shapely.points(MX[fidx] + NX[fidx] * (setb[fidx] + 1.0), MZ[fidx] + NZ[fidx] * (setb[fidx] + 1.0))
qi, gi = ntree.query_nearest(qpts, max_distance=30, all_matches=False)
for q, g in zip(qi, gi):
    e = fidx[q]; out_b[EB[e]]['fs'][EI[e]] = nid(named_roads[g]['name'])
for e in fidx:
    b = out_b[EB[e]]; b['setb'][EI[e]] = float(setb[e])
    if b['edges'][EI[e]] == 0 and b['normals'][EI[e]][2] > 2.5: b['edges'][EI[e]] = 1      # faces a pedestrian way / square / road further away
log('street-facing edges', len(fidx), 'of', len(MX))

# ---------------------------------------------------------------- POIs
# category table: OSM tag value -> (normalised category, bay mode)
#   shop  = ground-floor shopfront bay on a facade      plate = name plate at the entrance (upper floor / office / practice)
#   building = the POI is a whole building (sign over its entrance)   standalone = free-standing object   area = an open area
FOOD = {'restaurant': 'restaurant', 'cafe': 'cafe', 'bar': 'bar', 'pub': 'bar', 'fast_food': 'fast_food', 'ice_cream': 'ice_cream', 'food_court': 'restaurant', 'biergarten': 'bar', 'nightclub': 'bar'}
SHOPCAT = {'clothes': 'clothes', 'fashion_accessories': 'clothes', 'boutique': 'clothes', 'vintage': 'clothes', 'second_hand': 'clothes', 'bag': 'bags', 'leather': 'bags', 'shoes': 'shoes',
           'jewelry': 'jewelry', 'watches': 'jewelry', 'beauty': 'beauty', 'cosmetics': 'cosmetics', 'perfumery': 'cosmetics', 'hairdresser': 'hairdresser', 'optician': 'optician',
           'bakery': 'bakery', 'pastry': 'confectionery', 'confectionery': 'confectionery', 'chocolate': 'confectionery', 'supermarket': 'supermarket', 'convenience': 'convenience',
           'greengrocer': 'convenience', 'kiosk': 'kiosk', 'books': 'books', 'stationery': 'books', 'electronics': 'electronics', 'computer': 'electronics', 'mobile_phone': 'telecom',
           'telecommunication': 'telecom', 'gift': 'gift', 'florist': 'florist', 'interior_decoration': 'home', 'bed': 'home', 'houseware': 'home', 'furniture': 'home',
           'bathroom_furnishing': 'home', 'candles': 'home', 'kitchen': 'home', 'dry_cleaning': 'dry_cleaning', 'laundry': 'dry_cleaning', 'estate_agent': 'estate_agent', 'mall': 'mall',
           'department_store': 'department_store', 'sports': 'sports', 'toys': 'toys', 'pet': 'pet', 'bookmaker': 'betting', 'lottery': 'betting', 'ticket': 'tickets', 'coffee': 'coffee_tea', 'tea': 'coffee_tea',
           'tobacco': 'tobacco', 'e-cigarette': 'tobacco', 'alcohol': 'wine', 'wine': 'wine', 'art': 'gallery', 'musical_instrument': 'music', 'travel_agency': 'travel_agent',
           'doityourself': 'hardware', 'hardware': 'hardware', 'locksmith': 'services', 'shoe_repair': 'services', 'sewing': 'services', 'tailor': 'services', 'nutrition_supplements': 'health_shop', 'cannabis': 'health_shop', 'medical_supply': 'health_shop'}
AMEN = {'pharmacy': ('pharmacy', 'shop'), 'bank': ('bank', 'shop'), 'bureau_de_change': ('finance', 'shop'), 'money_transfer': ('finance', 'shop'), 'post_office': ('post_office', 'shop'),
        'doctors': ('doctor', 'plate'), 'clinic': ('clinic', 'plate'), 'dentist': ('dentist', 'plate'), 'veterinary': ('vet', 'shop'), 'hospital': ('clinic', 'building'),
        'cinema': ('cinema', 'building'), 'theatre': ('theatre', 'building'), 'townhall': ('townhall', 'building'), 'police': ('police', 'building'), 'library': ('library', 'building'),
        'school': ('school', 'building'), 'kindergarten': ('kindergarten', 'building'), 'childcare': ('kindergarten', 'plate'), 'college': ('school', 'building'), 'university': ('school', 'building'),
        'language_school': ('education', 'plate'), 'music_school': ('education', 'plate'), 'driving_school': ('education', 'shop'),
        'place_of_worship': ('church', 'building'), 'arts_centre': ('arts_centre', 'building'), 'events_venue': ('events_venue', 'building'), 'public_bath': ('public_bath', 'building'),
        'community_centre': ('community', 'building'), 'social_facility': ('community', 'plate'), 'fuel': ('fuel', 'standalone'), 'taxi': ('taxi', 'standalone'), 'bus_station': ('bus_station', 'standalone'),
        'parking': ('parking', 'area'), 'toilets': ('toilets', 'standalone'), 'bicycle_rental': ('bicycle_rental', 'standalone'), 'charging_station': ('charging_station', 'standalone'),
        'car_rental': ('car_rental', 'shop'), 'car_wash': ('car_wash', 'standalone'), 'grave_yard': ('cemetery', 'area'), 'marketplace': ('market', 'area')}
FURN_AMENITY = {'bench', 'waste_basket', 'recycling', 'fountain', 'drinking_water', 'telephone', 'atm', 'post_box', 'vending_machine', 'parking_entrance', 'clock', 'bicycle_parking', 'motorcycle_parking', 'shelter', 'waste_disposal'}
OFFICE_SHOP = {'estate_agent': 'estate_agent', 'travel_agent': 'travel_agent', 'energy_supplier': 'services', 'courier': 'services', 'telecommunication': 'telecom', 'insurance': 'finance'}
def classify(tg, is_building=False, is_area=False):
    """-> (cat, 'key=value', mode) or None"""
    if tg.get('shop') and tg['shop'] not in ('no', 'vacant'):
        v = tg['shop']; cat = SHOPCAT.get(v, 'shop')
        mode = 'standalone' if v == 'kiosk' else ('building' if v == 'mall' else 'shop')
        return cat, 'shop=' + v, mode
    a = tg.get('amenity')
    if a in FOOD: return FOOD[a], 'amenity=' + a, 'shop'
    if a in AMEN: return AMEN[a][0], 'amenity=' + a, AMEN[a][1]
    if a and a not in FURN_AMENITY: return a, 'amenity=' + a, 'plate'
    if tg.get('office'):
        v = tg['office']
        if v in OFFICE_SHOP: return OFFICE_SHOP[v], 'office=' + v, 'shop'
        return 'office', 'office=' + v, 'plate'
    if tg.get('craft'): return 'services', 'craft=' + tg['craft'], 'shop'
    t = tg.get('tourism')
    if t in ('hotel', 'guest_house', 'hostel', 'motel', 'apartment'): return 'hotel', 'tourism=' + t, 'building'
    if t == 'gallery': return 'gallery', 'tourism=gallery', 'shop'
    if t == 'museum': return 'museum', 'tourism=museum', 'building'
    l = tg.get('leisure')
    if l in ('fitness_centre', 'dance', 'bowling_alley', 'sports_hall', 'sports_centre', 'amusement_arcade'): return ('fitness' if l != 'bowling_alley' else 'bowling'), 'leisure=' + l, 'plate' if not (is_building or is_area) else ('building' if is_building else 'area')
    if l in ('playground', 'park', 'garden') and (tg.get('name') or l == 'playground'): return l, 'leisure=' + l, 'area'
    hc = tg.get('healthcare')
    if hc and hc != 'no': return {'pharmacy': 'pharmacy', 'dentist': 'dentist', 'clinic': 'clinic'}.get(hc, 'doctor'), 'healthcare=' + hc, 'plate'
    if tg.get('historic') in ('monument', 'house', 'building', 'aqueduct', 'yes', 'ruins', 'archaeological_site') and tg.get('name'): return 'historic', 'historic=' + tg['historic'], 'building' if is_building else 'area'
    if tg.get('railway') == 'station' or tg.get('public_transport') == 'station': return 'station', 'railway=station', 'standalone'
    return None
KINDC = {'clothes': ('#1d1d1f', '#f5f2ea'), 'jewelry': ('#2b2118', '#e8c77d'), 'cafe': ('#3b2a20', '#f3e3c3'), 'restaurant': ('#5a1e16', '#f6efe2'), 'fast_food': ('#b3261e', '#ffffff'),
         'pharmacy': ('#ffffff', '#1a8f3c'), 'bank': ('#0b3d91', '#ffffff'), 'beauty': ('#f4e9ea', '#7a3e48'), 'shoes': ('#222222', '#ffffff'), 'optician': ('#ffffff', '#1c3f6e'),
         'bakery': ('#f2e2c4', '#6b3a1e'), 'books': ('#183a2c', '#f6efe2'), 'kiosk': ('#ffd23f', '#14213d'), 'bar': ('#16161a', '#e9c46a'), 'cosmetics': ('#101010', '#ffffff'),
         'hairdresser': ('#efe9e1', '#2d2a26'), 'confectionery': ('#f7e6ea', '#7b2d42'), 'supermarket': ('#ffffff', '#d0021b'), 'convenience': ('#fff4d6', '#0e5a2b'), 'bags': ('#2a1d14', '#f0e0c0'),
         'electronics': ('#0e2a47', '#ffffff'), 'telecom': ('#e60000', '#ffffff'), 'gift': ('#fbf3e4', '#8a3b12'), 'florist': ('#eaf4e4', '#2f5d2a'), 'home': ('#ece7df', '#3a3a3a'),
         'estate_agent': ('#12355b', '#ffffff'), 'hotel': ('#f4efe6', '#3a2e1e'), 'gallery': ('#ffffff', '#111111'), 'ice_cream': ('#fdf1f4', '#b03a5b'), 'finance': ('#0a4f3c', '#ffffff'),
         'sports': ('#111111', '#ffffff'), 'travel_agent': ('#0d6efd', '#ffffff'), 'betting': ('#0b5d1e', '#ffe14d'), 'dry_cleaning': ('#e8f3fb', '#16507a'), 'doctor': ('#ffffff', '#27507a'),
         'dentist': ('#ffffff', '#27507a'), 'clinic': ('#ffffff', '#27507a'), 'office': ('#f1f1ee', '#2b2b2b'), 'post_office': ('#ffcc00', '#00387b'), 'department_store': ('#101010', '#ffffff')}
MINW = {'kiosk': 2.2, 'supermarket': 8.0, 'department_store': 8.0, 'bank': 4.5, 'cinema': 6.0}
MAXW = {'supermarket': 30.0, 'department_store': 30.0, 'mall': 30.0, 'bank': 12.0, 'restaurant': 11.0, 'cafe': 10.0, 'bar': 9.0, 'hotel': 22.0, 'cinema': 16.0, 'fast_food': 9.0,
        'kiosk': 3.0, 'pharmacy': 8.0, 'clothes': 8.0}
BRAND = {
    'mythos': dict(name='MYTHOS plus', bg='#141414', fg='#f2c14e', kind='food', cat='fast_food', w=6.5),     # INTERIORS.md 1.2: grill hall 6.5 m wide
    'starbucks': dict(name='STARBUCKS COFFEE', bg='#00704a', fg='#ffffff', kind='cafe', cat='cafe', w=6.4), # INTERIORS.md 2.2: pavilion 6.4 m wide
    'kfc': dict(name='KFC', bg='#c8102e', fg='#ffffff', kind='food', cat='fast_food', w=9.0),             # INTERIORS.md 4.2: 9 m
    'super': dict(name='ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ', bg='#ffffff', fg='#d0021b', kind='super', cat='supermarket', w=18.0),
    'paul': dict(name='PAUL', bg='#141414', fg='#e8d3a0', kind='bakery', cat='bakery', w=9.5),           # INTERIORS.md 3.2: 9.5 m
    'sephora': dict(name='SEPHORA', bg='#000000', fg='#ffffff', kind='cosmetics', cat='cosmetics', w=8.0),
}
def latin_name(tg):
    for k in ('name:en', 'int_name', 'brand:en'):
        if tg.get(k) and not has_greek(tg[k]): return tg[k]
    return translit(tg.get('name') or tg.get('brand') or '')
def poi_from_tags(tg, p, pid, is_building=False, is_area=False):
    c = classify(tg, is_building, is_area)
    if not c: return None
    cat, tag, mode = c
    if is_building and mode in ('plate',): mode = 'building'
    if is_area and not is_building and mode in ('shop', 'plate', 'building'): mode = 'area'
    q = dict(id=pid, src='osm', cat=cat, tag=tag, mode=mode, p=p, name=tg.get('name') or tg.get('brand') or '', nameLatin=latin_name(tg), posErrM=3 if pid.startswith('osm:n') else 5, conf=1.0)
    for k, o in (('brand', 'brand'), ('cuisine', 'cuisine'), ('opening_hours', 'hours'), ('addr:street', 'street'), ('addr:housenumber', 'number'), ('level', 'level'),
                 ('phone', 'phone'), ('website', 'website'), ('operator', 'operator'), ('wheelchair', 'wheelchair')):
        if tg.get(k): q[o] = tg[k]
    if not q.get('phone') and tg.get('contact:phone'): q['phone'] = tg['contact:phone']
    br_ = (tg.get('branch') or '').strip()
    if br_:
        q['branch'] = br_
        if br_.lower() in ('uomo', 'kids', 'men', 'women', 'home', 'junior', 'baby', 'man', 'woman', 'donna', 'bambino', 'beauty') and br_.lower() not in q['name'].lower():
            q['name'] = q['name'] + ' ' + br_.title(); q['nameLatin'] = q['nameLatin'] + ' ' + br_.title()     # a separate shop of the brand (e.g. Intimissimi Uomo)
    if not q.get('website') and tg.get('contact:website'): q['website'] = tg['contact:website']
    if tg.get('outdoor_seating') in ('yes', 'terrace', 'sidewalk', 'pedestrian_zone', 'street'): q['outdoor'] = 1
    if tg.get('takeaway') in ('yes', 'only'): q['takeaway'] = 1
    lvl = tg.get('level')
    if lvl and mode == 'shop' and not re.match(r'^\s*(0|-?0\.5)?\s*(;.*)?$', lvl) and not lvl.strip().startswith('0'): q['mode'] = 'plate'
    return q
pois = []
POI_SKIP_BLD = set()
for nid_, tg in ntags.items():
    p = nodes[nid_]
    if not cprep.contains(Point(p)): continue
    q = poi_from_tags(tg, p, 'osm:n' + nid_)
    if q: pois.append(q)
def way_poly(refs):
    pts = [nodes[r] for r in refs if r in nodes]
    if len(pts) >= 4 and refs[0] == refs[-1]:
        try:
            g = Polygon(pts).buffer(0)
            return max(g.geoms, key=lambda x: x.area) if g.geom_type == 'MultiPolygon' else g
        except Exception: return None
for wid, (refs, tg) in ways.items():
    if 'highway' in tg: continue
    g = way_poly(refs)
    if g is None or g.is_empty or not cprep.intersects(g): continue
    isb = 'building' in tg
    q = poi_from_tags(tg, (g.representative_point().x, g.representative_point().y), 'osm:w' + wid, isb, not isb)
    if q:
        if isb and ('w' + wid) in bkey_bi: q['own_b'] = bkey_bi['w' + wid]
        q['area_m2'] = round(g.area); pois.append(q)
for members, tg, rid in rels:
    if tg.get('type') != 'multipolygon': continue
    outer = [ref for mt, ref, role in members if mt == 'way' and role == 'outer' and ref in ways]
    if not outer: continue
    g = way_poly(ways[outer[0]][0])
    if g is None or not cprep.intersects(g): continue
    isb = 'building' in tg
    q = poi_from_tags(tg, (g.representative_point().x, g.representative_point().y), 'osm:r' + rid, isb, not isb)
    if q:
        if isb and ('r' + rid) in bkey_bi: q['own_b'] = bkey_bi['r' + rid]
        pois.append(q)
# a node and the building/area it sits in describing the same thing (same category + same name): keep the node, remember the building
osm_n = len(pois)
drop = set()
for i, a in enumerate(pois):
    if not a['id'].startswith('osm:n'): continue
    for j, b in enumerate(pois):
        if j in drop or b['id'].startswith('osm:n') or a['cat'] != b['cat']: continue
        if math.dist(a['p'], b['p']) < 60 and (norm(a['name']) == norm(b['name']) or not a['name'] or not b['name']):
            if not a['name'] and b['name']: a['name'] = b['name']; a['nameLatin'] = b['nameLatin']
            if 'own_b' in b: a['own_b'] = b['own_b']; a['mode'] = b['mode']
            drop.add(j); a.setdefault('also', []).append(b['id'])
pois = [q for j, q in enumerate(pois) if j not in drop]
log('OSM POIs in context: %d (%d node/area duplicates merged)' % (len(pois), len(drop)))

# ---- the special shops (positions verified in docs/MAP_DATA.md) ----
SPECIAL_P = {k: KEY[k] for k in ('mythos', 'starbucks', 'kfc', 'super', 'paul')}
SPECIAL_MATCH = {'mythos': ('mythos',), 'starbucks': ('starbucks',), 'kfc': ('kfc',), 'super': ('avvasilopoulos', 'abvasilopoulos', 'vasilopoulos', 'vassilopoulos', 'av', 'ab'), 'paul': ('paul',), 'sephora': ('sephora',)}
def special_of(name, p, maxd=70):
    n = norm(name)
    for k, pre in SPECIAL_MATCH.items():
        if k in SPECIAL_P and math.dist(p, SPECIAL_P[k]) < maxd and any(n == s or (len(s) > 3 and n.startswith(s)) for s in pre): return k
    return None
OV = []
try:
    for f in json.load(open(OVERTURE))['features']:
        lon, lat = f['geometry']['coordinates']; pr = f['properties']
        OV.append(dict(id=f['id'], p=P(lat, lon), name=((pr.get('names') or {}).get('primary') or '').strip(), conf=pr.get('confidence') or 0, basic=pr.get('basic_category') or '',
                       prim=((pr.get('taxonomy') or {}).get('primary') or ''), hier=((pr.get('taxonomy') or {}).get('hierarchy') or []),
                       addr=((pr.get('addresses') or [{}])[0].get('freeform') or ''), brand=(((pr.get('brand') or {}).get('names') or {}).get('primary') or ''),
                       phone=(pr.get('phones') or [''])[0], web=(pr.get('websites') or [''])[0] if pr.get('websites') else '', status=pr.get('operating_status'),
                       ds=sorted({s['dataset'] for s in pr.get('sources') or [] if s.get('dataset') and s['dataset'] != 'Overture'})))
except Exception as ex:
    log('Overture places not available:', ex)
# Sephora: not in OSM.  Overture has it (address "Levidou 8"); see the evidence table in docs/MAP_DATA.md
seph = [o for o in OV if norm(o['name']).startswith('sephora')]
if seph:
    s = max(seph, key=lambda o: o['conf']); KEY['sephora'] = s['p']; SPECIAL_P['sephora'] = s['p']
    SEPHORA_SRC = dict(source='overture', id=s['id'], conf=round(s['conf'], 3), addr=s['addr'])
else:
    hond = [q for q in pois if norm(q['name']).startswith('hondos')]
    KEY['sephora'] = hond[0]['p'] if hond else (268.0, -1.0); SPECIAL_P['sephora'] = KEY['sephora']
    SEPHORA_SRC = dict(source='fallback: Hondos Center (OSM)')
special_evidence = {k: dict(key=[r2(v) for v in SPECIAL_P[k]], osm=[], overture=[]) for k in SPECIAL_P}
keep = []
for q in pois:
    k = special_of(q['name'], q['p'])
    if k and q['mode'] in ('shop', 'building'):
        special_evidence[k]['osm'].append(dict(id=q['id'], name=q['name'], x=r2(q['p'][0]), z=r2(q['p'][1]), street=q.get('street'), number=q.get('number'), d=r2(math.dist(q['p'], SPECIAL_P[k]))))
        SPECIAL_P.setdefault('_tags_' + k, q)
        continue
    keep.append(q)
pois = keep
for k in ('mythos', 'starbucks', 'kfc', 'super', 'paul', 'sephora'):
    br = BRAND[k]; src = SPECIAL_P.get('_tags_' + k) or {}
    q = dict(id='special:' + k, src='osm' if src else ('overture' if k in ('sephora',) else 'address'), cat=br['cat'], tag=src.get('tag', ''), mode='shop', p=SPECIAL_P[k],
             name=br['name'], nameLatin=translit(br['name']), special=k, posErrM=5 if src else 12, conf=1.0)
    for f_ in ('hours', 'street', 'number', 'phone', 'website', 'cuisine', 'outdoor', 'takeaway', 'brand'):
        if src.get(f_): q[f_] = src[f_]
    if src: q['osm'] = src['id']
    pois.insert(0, q)

# ---- Overture places: de-duplicate against OSM, keep confident ones ----
OV_SKIP = {'public_plaza', 'park', 'train_station', 'parking', 'atm', 'historic_site', 'police_station', 'christian_place_of_worship', 'bus_station', 'transportation_location'}
def ov_cat(o):
    b = o['basic']; s = ' '.join([o['prim']] + o['hier'] + [b])
    def has(*ws): return any(w in s for w in ws)
    if b in OV_SKIP or has('place_of_worship', 'public_plaza', 'train_station'): return None
    if has('jewel', 'watch_store'): return 'jewelry', 'shop'
    if has('shoe'): return 'shoes', 'shop'
    if has('eyewear', 'optic', 'sunglass'): return 'optician', 'shop'
    if has('hair', 'barber'): return 'hairdresser', 'shop'
    if has('bakery'): return 'bakery', 'shop'
    if has('pastry', 'dessert', 'candy', 'chocolat', 'donut', 'cupcake', 'patisserie'): return 'confectionery', 'shop'
    if has('ice_cream', 'frozen_yog', 'gelato'): return 'ice_cream', 'shop'
    if has('supermarket', 'grocery'): return 'supermarket', 'shop'
    if has('convenience'): return 'convenience', 'shop'
    if has('pharmacy'): return 'pharmacy', 'shop'
    if b in ('bank_or_credit_union',) or has('bank'): return 'bank', 'shop'
    if has('fast_food', 'pizza', 'burger', 'souvlaki', 'sandwich', 'gyro', 'creperie', 'food_truck'): return 'fast_food', 'shop'
    if has('coffee', 'cafe', 'tea_room', 'juice', 'non_alcoholic'): return 'cafe', 'shop'
    if has('bar', 'pub', 'dance_club', 'lounge', 'nightlife') and 'barber' not in s: return 'bar', 'shop'
    if b in ('restaurant', 'casual_eatery', 'food_service', 'food_and_drink') or has('restaurant', 'eatery', 'taverna', 'bistro'): return 'restaurant', 'shop'
    if has('cosmetic', 'perfum', 'personal_care_and_beauty_store'): return 'cosmetics', 'shop'
    if has('nail', 'beauty', 'spa', 'tanning', 'massage', 'wax', 'skin_care', 'tattoo', 'personal_or_beauty_service'): return 'beauty', 'shop'
    if has('florist', 'flower'): return 'florist', 'shop'
    if has('gift'): return 'gift', 'shop'
    if has('book', 'stationery', 'newsstand'): return 'books', 'shop'
    if has('toy'): return 'toys', 'shop'
    if has('pet_store', 'animal_and_pet_store'): return 'pet', 'shop'
    if has('mobile_phone', 'telecom'): return 'telecom', 'shop'
    if has('electronics', 'computer_store'): return 'electronics', 'shop'
    if has('sporting_goods', 'bicycle_shop', 'outdoor_gear'): return 'sports', 'shop'
    if has('furniture', 'home_and_garden', 'interior', 'lighting_store', 'kitchen', 'home_goods', 'mattress', 'carpet'): return 'home', 'shop'
    if has('wine', 'liquor', 'beer_'): return 'wine', 'shop'
    if has('food_and_beverage_store', 'butcher', 'delicatessen', 'cheese', 'seafood_market', 'health_food', 'organic'): return 'convenience', 'shop'
    if has('fashion', 'clothing', 'apparel', 'boutique', 'lingerie', 'bridal', 'second_hand', 'handbag', 'leather', 'accessor'): return 'clothes', 'shop'
    if has('department_store'): return 'department_store', 'shop'
    if has('shopping_mall'): return 'mall', 'plate'
    if has('art_gallery'): return 'gallery', 'shop'
    if has('arts_crafts', 'hobby', 'frame'): return 'gift', 'shop'
    if has('real_estate'): return 'estate_agent', 'shop'
    if has('travel_service', 'travel_agen', 'travel_and_transportation'): return 'travel_agent', 'shop'
    if has('laundry', 'dry_clean'): return 'dry_cleaning', 'shop'
    if has('hotel', 'lodging', 'bed_and_breakfast', 'resort'): return 'hotel', 'plate'
    if has('movie_theater', 'cinema'): return 'cinema', 'plate'
    if has('museum'): return 'museum', 'plate'
    if has('theatre', 'theater', 'arts_and_entertainment', 'event_or_party', 'community_center'): return 'events_venue', 'plate'
    if has('dental', 'dentist', 'orthodont'): return 'dentist', 'plate'
    if has('hospital', 'clinic', 'surgery', 'diagnostic', 'health_care', 'medical', 'doctor', 'physio', 'therap', 'psych', 'alternative_medicine', 'care', 'wellness'): return 'doctor', 'plate'
    if has('gym', 'fitness', 'sport', 'yoga', 'pilates', 'martial', 'dance_s'): return 'fitness', 'plate'
    if has('school', 'education', 'learning', 'tutoring', 'preschool'): return 'education', 'plate'
    if has('financial', 'insurance', 'accountant', 'attorney', 'law', 'office', 'professional', 'service', 'manufacturer', 'institute', 'organization', 'government', 'agency', 'storage'): return 'office', 'plate'
    if b in ('shopping', 'specialty_store', '') or has('store', 'shop'): return ('shop', 'shop') if b else ('shop', 'plate')
    return 'office', 'plate'
OV_MINCONF = 0.5
ov_stats = collections.Counter()
allp = [(norm(q['name']), q) for q in pois]
ov_new = []
OV_UNBUILT = []
for o in sorted(OV, key=lambda o: -o['conf']):
    if not cprep.contains(Point(o['p'])): ov_stats['outside'] += 1; continue
    if o['status'] in ('permanently_closed', 'temporarily_closed'): ov_stats['closed'] += 1; continue
    n = norm(o['name'])
    if not n: ov_stats['no_name'] += 1; continue
    hit = None
    for nb, q in allp:
        if same_place(n, nb, math.dist(o['p'], q['p'])): hit = q; break
    if hit is None:
        k = special_of(o['name'], o['p'], 90)
        if k: hit = next(q for q in pois if q.get('special') == k)
    if hit is not None:
        ov_stats['dup_osm' if hit['src'] != 'overture' else 'dup_overture'] += 1
        hit.setdefault('overture', dict(id=o['id'], conf=round(o['conf'], 3), addr=o['addr'], x=r2(o['p'][0]), z=r2(o['p'][1])))
        if o['addr'] and not hit.get('ov_addr'): hit['ov_addr'] = o['addr']
        if hit.get('special'): special_evidence[hit['special']]['overture'].append(dict(id=o['id'], name=o['name'], addr=o['addr'], conf=round(o['conf'], 3), x=r2(o['p'][0]), z=r2(o['p'][1]), d=r2(math.dist(o['p'], hit['p']))))
        continue
    if o['conf'] < OV_MINCONF: ov_stats['low_conf'] += 1; continue
    c = ov_cat(o)
    if not c: ov_stats['skipped_category'] += 1; continue
    q = dict(id='ov:' + o['id'], src='overture', cat=c[0], tag='overture=' + (o['prim'] or o['basic'] or 'unknown'), mode=c[1], p=o['p'], name=o['name'], nameLatin=translit(o['name']),
             posErrM=15, conf=round(o['conf'], 3))
    if o['addr']: q['ov_addr'] = o['addr']
    if o['brand']: q['brand'] = o['brand']
    if o['phone']: q['phone'] = o['phone']
    if o['ds']: q['datasets'] = o['ds']
    OV_UNBUILT.append(q); ov_stats['not_built_overture_only'] += 1     # PLACEMENT AUDIT: an Overture point alone is never built (census decides)
log('Overture:', dict(ov_stats))

# ---- house-number parity: which side of each street the odd / even numbers are on (learnt from OSM-surveyed POIs with an address) ----
roads_by_norm = collections.defaultdict(list)
for r in roads:
    if r['name'] and r['ty'] <= 7: roads_by_norm[snorm(r['name'])].append(r)
def street_roads(st):
    a = snorm(st)
    if not a: return []
    if a in roads_by_norm: return roads_by_norm[a]
    for k_, v in roads_by_norm.items():
        if len(a) >= 5 and (a in k_ or k_ in a): return v
    return []
def side_of(st, p, maxd=45.0):
    """+1 / -1 = side of point p relative to the direction of the nearest way of street st (None if no such way near)"""
    best = None
    for r in street_roads(st):
        d = r['ls'].distance(Point(p))
        if d < maxd and (best is None or d < best[0]): best = (d, r)
    if best is None: return None
    ls = best[1]['ls']; t = ls.project(Point(p)); a = ls.interpolate(max(0, t - 1)); c = ls.interpolate(min(ls.length, t + 1))
    cr = (c.x - a.x) * (p[1] - a.y) - (c.y - a.y) * (p[0] - a.x)
    if abs(cr) < 1e-6: return None
    return (1 if cr > 0 else -1, best[1]['id'])
def hn(v):
    m = re.match(r'^\s*(\d+)', str(v or ''))
    return int(m.group(1)) if m else None
def learn_parity():
    global PARITY
    parity_votes = collections.defaultdict(collections.Counter)      # (street road id, parity) -> Counter(side)
    for q in pois:
        if q['src'] in ('osm', 'address') and q.get('street') and hn(q.get('number')) is not None and q['posErrM'] <= 5:
            so = side_of(q['street'], q['p'])
            if so: parity_votes[(so[1], hn(q['number']) % 2)][so[0]] += 1
    for (rid, par), c in [(k, v) for k, v in ADDR_VOTES.items()]:
        parity_votes[(rid, par)].update(c)
    PARITY = {}
    for k_, c in parity_votes.items():
        tot = sum(c.values()); sd, n = c.most_common(1)[0]
        if tot >= 2 and n / tot >= 0.75: PARITY[k_] = sd
    log('house-number parity learnt for %d (way, parity) pairs' % len(PARITY))
ADDR_VOTES = collections.defaultdict(collections.Counter)
PARITY = {}
learn_parity()
def parity_side(q):
    """expected side (+1/-1, road id) of an addressed POI, or None"""
    n = hn(q.get('number'))
    if n is None or not q.get('street'): return None
    so = side_of(q['street'], q['p'], 60)
    if not so: return None
    sd = PARITY.get((so[1], n % 2))
    return (sd, so[1]) if sd is not None else None
# ---- address verification (PLACEMENT AUDIT, OWNER_BRIEF 16): a house number is "verified" when it lies on the surveyed OSM numbering of its street ----
# anchors = OSM-surveyed objects carrying addr:street + addr:housenumber (shop nodes, address nodes, addressed buildings), projected onto the street centre line.
ADDR_ANCHORS = collections.defaultdict(list)          # norm(street) -> [(number, x, z)]
def _add_anchor(st, num, p):
    n_ = hn(num)
    if n_ is None or not st: return
    ADDR_ANCHORS[snorm(st)].append((n_, p[0], p[1]))
for nid_, tg in ntags.items():
    if tg.get('addr:street') and tg.get('addr:housenumber'): _add_anchor(tg['addr:street'], tg['addr:housenumber'], nodes[nid_])
for wid, (refs, tg) in ways.items():
    if tg.get('addr:street') and tg.get('addr:housenumber') and 'highway' not in tg:
        pts_ = [nodes[r] for r in refs if r in nodes]
        if len(pts_) >= 3:
            try: c_ = Polygon(pts_).representative_point(); _add_anchor(tg['addr:street'], tg['addr:housenumber'], (c_.x, c_.y))
            except Exception: pass
log('address anchors: %d on %d streets' % (sum(len(v) for v in ADDR_ANCHORS.values()), len(ADDR_ANCHORS)))
def geocode(st, num, hint):
    """-> dict(p, method exact|interp, road, side, span) or None (address not verifiable on the surveyed numbering)"""
    n_ = hn(num); rs = street_roads(st)
    if n_ is None or not rs: return None
    r = min(rs, key=lambda r: r['ls'].distance(Point(hint)))
    if r['ls'].distance(Point(hint)) > 90: return None
    key_ = snorm(st)
    A = []
    for k_, v in ADDR_ANCHORS.items():
        if k_ == key_ or (len(key_) >= 5 and (key_ in k_ or k_ in key_)): A += v
    ls = r['ls']; A = [(a, ls.project(Point(x, z)), (x, z)) for a, x, z in A if a % 2 == n_ % 2 and ls.distance(Point(x, z)) < 45]
    if not A: return None
    ex = [a for a in A if a[0] == n_]
    if ex:
        x = sum(a[2][0] for a in ex) / len(ex); z = sum(a[2][1] for a in ex) / len(ex)
        so = side_of(st, (x, z), 60)
        return dict(p=(x, z), method='exact', road=r['id'], side=so[0] if so else None, span=0)
    lo = max((a for a in A if a[0] < n_), key=lambda a: a[0], default=None); hi = min((a for a in A if a[0] > n_), key=lambda a: a[0], default=None)
    if lo is None or hi is None or hi[0] - lo[0] > 12 or abs(hi[1] - lo[1]) > 160: return None
    sl, sh = side_of(st, lo[2], 60), side_of(st, hi[2], 60)
    if not sl or not sh or sl[0] != sh[0]: return None
    t = lo[1] + (n_ - lo[0]) / (hi[0] - lo[0]) * (hi[1] - lo[1])
    a_ = ls.interpolate(max(0, t - 1)); c_ = ls.interpolate(min(ls.length, t + 1)); m_ = ls.interpolate(t)
    dx, dz = c_.x - a_.x, c_.y - a_.y; L_ = math.hypot(dx, dz) or 1
    off = r['w'] / 2 + 3.0; nx_, nz_ = -dz / L_ * sl[0], dx / L_ * sl[0]
    return dict(p=(m_.x + nx_ * off, m_.y + nz_ * off), method='interp', road=r['id'], side=sl[0], span=hi[0] - lo[0])
# ---- research census (gk3/data/census.json): PLACEMENT AUDIT rules (OWNER_BRIEF 16) ----
# * an entry that is an OSM object (or matches one by name within the same_place distance) only enriches the OSM POI; the OSM-surveyed position wins;
# * a census-only entry is built only if: tier A/B, not reported closed, street + house number given, the number is VERIFIED on the surveyed OSM numbering
#   (exact surveyed number, or bracketed by surveyed numbers <= 12 apart on the same side) and the census position agrees with that address within 35 m;
#   it is then placed AT THE ADDRESS (not at the listing's coordinate), on the facade of its street on the address side, in frontage not used by an OSM shop.
cs_stats = collections.Counter(); CS_UNBUILT = []; CS_CLOSED_OSM = []
if CENSUS:
    by_osm = {q['id'][4:]: q for q in pois if q['id'].startswith('osm:')}
    for q in pois:
        for a in q.get('also', []): by_osm[a[4:]] = q
        if q.get('osm'): by_osm[q['osm'][4:]] = q
    CAT_ALIAS = {'jewellery': 'jewelry', 'café': 'cafe', 'bookshop': 'books', 'cosmetics': 'cosmetics', 'real_estate': 'estate_agent', 'clinic': 'clinic', 'home_decor': 'home',
                 'bags_accessories': 'bags', 'gifts': 'gift', 'kiosk_tobacco_betting': 'kiosk', 'patisserie': 'confectionery', 'gym': 'fitness', 'food_shop': 'convenience',
                 'crafts_hobby': 'services', 'watches': 'jewelry', 'lingerie': 'clothes', 'bridal': 'clothes', 'wine_spirits': 'wine', 'barber': 'hairdresser', 'post_courier': 'post_office',
                 'money_exchange': 'finance', 'insurance': 'finance', 'travel': 'travel_agent', 'repair': 'services', 'driving_school': 'education', 'pawnbroker': 'finance',
                 'carpets': 'home', 'funeral': 'services', 'nightclub': 'bar', 'bowling': 'bowling', 'atm': 'bank'}
    PLATE_CATS = {'office', 'doctor', 'dentist', 'clinic', 'lawyer', 'education', 'fitness', 'accountant', 'architect', 'notary', 'association', 'public'}
    BUILDING_CATS = {'school', 'kindergarten', 'hotel', 'church', 'museum', 'cinema', 'theatre', 'mall', 'police', 'bowling'}
    def _unbuilt(c, p, why):
        CS_UNBUILT.append(dict(id=c.get('id'), name=c.get('name'), street=c.get('street'), number=c.get('number'), tier=c.get('tier'), x=r2(p[0]), z=r2(p[1]), why=why)); cs_stats['unbuilt:' + why.split(' (')[0]] += 1
    for c in CENSUS.get('places', []):
        try:
            if c.get('lat') is not None and c.get('lon') is not None: p = P(float(c['lat']), float(c['lon']))
            else: p = (float(c['x']), float(c['z']))
        except Exception: cs_stats['no_position'] += 1; continue
        if not cprep.contains(Point(p)): cs_stats['outside'] += 1; continue
        hit = None; oid = c.get('osm')
        if oid:
            m = re.match(r'^(node|way|relation|n|w|r)[/:]?(\d+)$', str(oid))
            if m: hit = by_osm.get(m.group(1)[0] + m.group(2))
        n = norm(c.get('name') or c.get('nameLatin') or '')
        if hit is None and n:
            for nb, q in allp:
                if same_place(n, nb, math.dist(p, q['p'])): hit = q; break
            if hit is None:
                k = special_of(c.get('name') or '', p, 90)
                if k: hit = next(q for q in pois if q.get('special') == k)
        if hit is not None:
            cs_stats['matched'] += 1; hit.setdefault('census', c.get('id'))
            if c.get('rebrandedFrom') and not hit.get('special'): hit['formerName'] = hit['name']; hit['name'] = c.get('name') or hit['name']; hit['nameLatin'] = c.get('nameLatin') or hit['nameLatin']   # e.g. HSBC -> CrediaBank (census overrides, vrisko 2025)
            if c.get('tier'): hit.setdefault('tier', c['tier'])
            if c.get('tier') == 'X' or c.get('open') is False: CS_CLOSED_OSM.append(dict(osm=hit['id'], name=hit['name'], census=c.get('id'), cname=c.get('name')))
            for f_ in ('street', 'number'):
                if c.get(f_) and not hit.get(f_): hit[f_] = str(c[f_])
            continue
        if c.get('open') is False or c.get('tier') == 'X': cs_stats['closed'] += 1; continue
        if c.get('tier') not in ('A', 'B'): cs_stats['tierC_not_built'] += 1; continue
        if not c.get('street') or hn(c.get('number')) is None: _unbuilt(c, p, 'no house number'); continue
        g = geocode(c['street'], c['number'], p)
        if g is not None and math.dist(g['p'], p) > 35: _unbuilt(c, p, 'listing position %.0f m from its address' % math.dist(g['p'], p)); continue
        if g is None:
            # V3: no surveyed numbering around this number -> accepted only when the census confirms it (tier A = two fresh independent listings or a
            # web/official source) AND its position lies on its addressed street with an unambiguous side; built at that position on that side
            srcs = c.get('sources') or []
            multi = len({str(x).split(':')[0] for x in srcs}) >= 2 or any(str(x).startswith(('web', 'official')) for x in srcs)
            rs_ = street_roads(c['street'])
            dst = min((r['ls'].distance(Point(p)) for r in rs_), default=1e9)
            so = side_of(c['street'], p, 30) if dst < 25 else None
            if c.get('tier') == 'A' and multi and so:
                r_ = next(r for r in rs_ if r['id'] == so[1])
                if dst < r_['w'] / 2 + 1.0:
                    ps_ = PARITY.get((so[1], hn(c['number']) % 2))
                    so = (ps_, so[1]) if ps_ is not None else None
            if not (c.get('tier') == 'A' and multi and so):
                _unbuilt(c, p, 'address not on surveyed numbering, not confirmed by two sources (%s %s)' % (c['street'], c['number'])); continue
            g = dict(p=p, method='listings', road=so[1], side=so[0])
        cat = CAT_ALIAS.get(c.get('category') or '', c.get('category') or 'shop')
        mode = 'building' if cat in BUILDING_CATS else ('plate' if cat in PLATE_CATS or c.get('streetLevel') is False else 'shop')
        q = dict(id='cs:' + str(c.get('id')), src='census', cat=cat, tag='census=' + str(c.get('category')), mode=mode, p=g['p'], tier=c.get('tier'),
                 name=c.get('name') or c.get('nameLatin') or '', nameLatin=c.get('nameLatin') or translit(c.get('name') or ''), posErrM=4 if g['method'] == 'exact' else 8 if g['method'] == 'interp' else max(8, c.get('posErrM') or 12),
                 posMethod='address-' + g['method'], conf=c.get('confidence') if c.get('confidence') is not None else 0.5, census=c.get('id'),
                 street=str(c['street']), number=str(c['number']), gside=(g['road'], g['side']), listingXZ=[r2(p[0]), r2(p[1])])
        if c.get('sources'): q['datasets'] = c['sources'] if isinstance(c['sources'], list) else [c['sources']]
        pois.append(q); allp.append((n, q)); cs_stats['added_' + g['method']] += 1
    log('census:', dict(cs_stats))
    for k_, v in ADDR_ANCHORS.items():
        rs_ = roads_by_norm.get(k_, [])
        for n_, x_, z_ in v:
            if rs_:
                r_ = min(rs_, key=lambda r: r['ls'].distance(Point(x_, z_)))
                if r_['ls'].distance(Point(x_, z_)) < 40:
                    so = side_of(r_['name'], (x_, z_), 40)
                    if so: ADDR_VOTES[(so[1], n_ % 2)][so[0]] += 1
    learn_parity()
    log('census says CLOSED for %d OSM POIs (kept: OSM survey wins, listed in meta.audit): %s' % (len(CS_CLOSED_OSM), ', '.join(x['name'] for x in CS_CLOSED_OSM[:12])))
# ---- same brand / name within 60 m = one shop (PLACEMENT AUDIT) ----
GENERIC = {'', 'pharmacy', 'farmakeio', 'kiosk', 'periptero', 'cafe', 'atm', 'bank', 'parking', 'toilets', 'wc', 'kafeteria', 'shop'}
_prio = lambda q: (0 if q.get('special') else 1, 0 if q['id'].startswith('osm:n') else 1 if q['src'] in ('osm', 'address') else 2, q['posErrM'])
DUP_MERGED = []
_keep = []
for q in sorted(pois, key=_prio):
    nq = norm(q['name'] if q.get('branch') else (q.get('brand') or q['name']))
    if q['mode'] in ('shop', 'building', 'plate') and len(nq) >= 3 and nq not in GENERIC:
        o = next((k for k in _keep if k['mode'] in ('shop', 'building', 'plate') and norm(k['name'] if k.get('branch') else (k.get('brand') or k['name'])) == nq and math.dist(k['p'], q['p']) < 60), None)
        if o is not None:
            o.setdefault('dups', []).append(q['id']); DUP_MERGED.append(dict(kept=o['id'], dropped=q['id'], name=q['name'], d=r2(math.dist(o['p'], q['p'])))); continue
    _keep.append(q)
_ids = {id(q) for q in _keep}; pois = [q for q in pois if id(q) in _ids]
log('same-name duplicates within 60 m merged: %d' % len(DUP_MERGED))
# shops.json (research-shops) wiring: each POI gets the index of its shops.json entry (match by OSM id, else normalised name within 60 m)
SHOPSJ = research('shops.json'); SJ_MATCH = 0
if SHOPSJ:
    sj_osm = {}; sj_list = []
    for k_, e in enumerate(SHOPSJ.get('shops', [])):
        o_ = e.get('osm')
        if o_:
            m = re.match(r'^(node|way|relation)/(\d+)$', str(o_))
            if m: sj_osm[m.group(1)[0] + m.group(2)] = k_
        try: sj_list.append((k_, norm(e.get('name') or ''), norm(e.get('nameLatin') or ''), P(float(e['lat']), float(e['lon']))))
        except Exception: pass
    for q in pois:
        hit = None
        for oid in [q['id'][4:] if q['id'].startswith('osm:') else None, (q.get('osm') or '')[4:] or None] + [a_[4:] for a_ in q.get('also', [])]:
            if oid and oid in sj_osm: hit = sj_osm[oid]; break
        if hit is None:
            n1 = norm(q['name'] or ''); n2 = norm(q['nameLatin'] or '')
            best = None
            for k_, a1, a2, pp in sj_list:
                d = math.dist(pp, q['p'])
                sk_ = q.get('special')
                if d < 60 and ((n1 and (n1 == a1 or n1 == a2)) or (n2 and (n2 == a1 or n2 == a2)) or (sk_ and sk_ != 'super' and (a1.startswith(sk_) or a2.startswith(sk_)))) and (best is None or d < best[0]): best = (d, k_)
            if best: hit = best[1]
        if hit is not None: q['sj'] = hit; q['sjName'] = SHOPSJ['shops'][hit].get('name'); SJ_MATCH += 1
    log('shops.json: %d entries, %d POIs linked' % (len(SHOPSJ.get('shops', [])), SJ_MATCH))
# a shops.json entry tied to an OSM building way (photo/official research) pins its POI to that building
SJ_FORCED = 0
if SHOPSJ:
    for q in pois:
        e = SHOPSJ['shops'][q['sj']] if 'sj' in q else None
        m = re.match(r'^way/(\d+)$', str((e or {}).get('osm') or ''))
        if m and ('w' + m.group(1)) in bkey_bi and not q.get('special'):
            q['force_b'] = bkey_bi['w' + m.group(1)]; SJ_FORCED += 1
    log('shops.json: %d POIs pinned to their researched building' % SJ_FORCED)
# ---- facade bays ----
# candidate edges: street-facing edges (setb >= 0) of buildings within 45 m.  A POI inside a building prefers that building; a POI with an address
# prefers edges facing that street; shopfront bays on one edge never overlap (min width MINW, then widened to the neighbours / MAXW).
def edge_geom(b, ei):
    co = b['coords']; a = co[ei]; c = co[(ei + 1) % len(co)]; nx, nz, Le = b['normals'][ei]
    return a, c, nx, nz, Le
street_norm = {}
def street_match(q, b, ei):
    st = q.get('street') or ''
    if not st:
        st = re.sub(r'[\d,./-]+', ' ', q.get('ov_addr') or '').strip()
    if not st: return 0
    fs = b['fs'][ei]
    if fs < 0: return 0
    a = snorm(st); c = street_norm.setdefault(fs, snorm(names[fs]))
    if not a or not c: return 0
    a2 = a; c2 = c
    if a2 == c2 or (len(a2) >= 5 and (a2 in c2 or c2 in a2)) or difflib.SequenceMatcher(None, a2, c2).ratio() > 0.8: return 1
    return -1
# PLACEMENT AUDIT rules (OWNER_BRIEF 16):
#  * OSM-surveyed shop: the building that contains the point, else a building within 12 m (25 m at most) whose facade is reached WITHOUT crossing a street
#    centre line; the nearest such edge wins (the addressed street only breaks near-ties).  It is never moved to another edge because an edge is full:
#    bays are squeezed, and only when even 2.2 m each does not fit does the farthest one become a name on the building directory board.
#  * census-only shop (verified address): an edge that faces its street on the address side, within 15 m of the address, and only in frontage that the OSM
#    shops leave free (never overlapping an OSM shop); otherwise it is not built (bay 'unbuilt', reason kept).
main_roads = [r for r in roads if r['ty'] <= 4 and not r['hidden']]
main_tree = STRtree([r['ls'] for r in main_roads])
def crosses_street(p, f):
    seg = LineString([p, f])
    if seg.length < 0.3: return False
    for k in main_tree.query(seg):
        if main_roads[int(k)]['ls'].intersects(seg): return True
    return False
ped_tree = STRtree([r['ls'] for r in roads if not r['hidden']]); ped_list = [r for r in roads if not r['hidden']]
def courtyard_ok(bi, fx, fz, nx, nz, d):
    """a non-street edge may carry a surveyed shop only when the shop point is within 4 m of it and the edge faces open, walkable space
    (no building 1.5-5 m in front of it) that a mapped way (passage, footway, street) reaches within 12 m: a real stoa / courtyard frontage"""
    if d > 4.0: return False
    for k in (1.5, 3.0, 5.0):
        pt = Point(fx + nx * k, fz + nz * k)
        for j in btree.query(pt):
            if bpolys[int(j)][0].contains(pt): return False
    pt = Point(fx + nx * 3, fz + nz * 3)
    return any(ped_list[int(j)]['ls'].distance(pt) < 12 for j in ped_tree.query(pt.buffer(12)))
def candidates(q, maxd=45.0):
    pt = Point(q['p']); out = []
    if 'force_b' in q:                     # researched building: its edges only; street-facing ones first, then the one nearest the source point
        b = out_b[q['force_b']]
        for ei in range(len(b['coords'])):
            a, c, nx, nz, Le = edge_geom(b, ei)
            if Le < 2.2: continue
            dx, dz = c[0] - a[0], c[1] - a[1]
            u = max(0.0, min(1.0, ((q['p'][0] - a[0]) * dx + (q['p'][1] - a[1]) * dz) / (Le * Le)))
            d = math.dist(q['p'], (a[0] + dx * u, a[1] + dz * u))
            out.append(((0 if b['setb'][ei] >= 0 else 30) + d - min(Le, 12) * 0.5, q['force_b'], ei, u, Le, d))
        out.sort()
        return out
    inside = None
    for i in btree.query(pt):
        if bpolys[int(i)][0].contains(pt): inside = int(i); break
    own = q.get('own_b', inside)
    osm_like = q['src'] in ('osm', 'address') and not q.get('special')
    gs = q.get('gside')
    for i in btree.query(pt.buffer(maxd)):
        if osm_like and own is not None and int(i) != own: continue          # surveyed point inside a building: that building only
        b = out_b[int(i)]; co = b['coords']; n = len(co)
        has_front = any(s_ >= 0 for s_ in b['setb'])
        for ei in range(n):
            if b['setb'][ei] < 0 and not osm_like: continue        # surveyed shops may face a courtyard / arcade / passage (real Kifisia stoas)
            a, c, nx, nz, Le = edge_geom(b, ei)
            if Le < 2.2: continue
            dx, dz = c[0] - a[0], c[1] - a[1]
            u = max(0.0, min(1.0, ((q['p'][0] - a[0]) * dx + (q['p'][1] - a[1]) * dz) / (Le * Le)))
            fx, fz = a[0] + dx * u, a[1] + dz * u
            d = math.dist(q['p'], (fx, fz))
            if d > maxd: continue
            sm = street_match(q, b, ei)
            if osm_like:
                if own is None and crosses_street(q['p'], (fx, fz)): continue     # never across a street from the surveyed point
                if b['setb'][ei] < 0 and not courtyard_ok(int(i), fx, fz, nx, nz, d): continue
                score = d + (-2 if sm > 0 else (2 if sm < 0 else 0)) + min(2.0, max(0, b['setb'][ei]) * 0.2) + (3.0 if b['setb'][ei] < 0 else 0)
            elif gs:
                if sm <= 0: continue                                              # must face the street of its address
                so = side_of(q['street'], (fx + nx * 1.5, fz + nz * 1.5), 60)
                if not so or so[1] != gs[0] or (gs[1] is not None and so[0] != gs[1]): continue   # address side of the street only
                score = d + min(4.0, max(0, b['setb'][ei]) * 0.4)
            else:
                score = d
                if own is not None and int(i) != own: score += 14 if 'own_b' in q else 9
                if own is None and ((q['p'][0] - fx) * nx + (q['p'][1] - fz) * nz) < -0.5: score += 6
                score += -5 if sm > 0 else (8 if sm < 0 else 0)
                score += min(4.0, b['setb'][ei] * 0.4)
            out.append((score, int(i), ei, u, Le, d))
    out.sort()
    return out
slots = collections.defaultdict(list)         # (bi, ei) -> POIs with a shopfront bay
def minw(q): return BRAND[q['special']]['w'] if q.get('special') else MINW.get(q['cat'], 3.0)
def maxw(q): return BRAND[q['special']]['w'] if q.get('special') else MAXW.get(q['cat'], 7.5)
HARD_MIN = 2.4; SQUEEZE_MIN = 2.2; GAP = 0.3; FIRST_CAP = 5.0
unplaced = []
order = sorted(range(len(pois)), key=lambda i: (0 if pois[i].get('special') else 1, {'osm': 0, 'address': 0, 'census': 1, 'overture': 2}[pois[i]['src']], pois[i]['posErrM'], -pois[i]['conf']))
# research overrides (docs/research/SHOPS.md action list): the shop stands in a courtyard, not on the street line -> explicit building + door side
SPECIAL_FIX = {'starbucks': dict(osm='w1076768349', toward=(159.0, 66.0), why='SHOPS.md 1a: Starbucks = Kassaveti 19 courtyard pavilion (OSM way 1076768349), door on its SSE face toward the courtyard; b425 is Ralph Lauren')}
osm_bi = {b['osmid']: i for i, b in enumerate(out_b)}
CENSUS_SHOPS = []
for q in pois:     # Sephora (not in OSM): its verified address (Levidou 8, research SHOPS.md: EAST side) decides the side of the street
    if q.get('special') == 'sephora' and q.get('street') and q.get('number'):
        g_ = geocode(q['street'], q['number'], q['p'])
        if g_ and g_['side'] is not None: q['gside'] = (g_['road'], g_['side']); special_evidence['sephora']['address'] = dict(method=g_['method'], at=[r2(g_['p'][0]), r2(g_['p'][1])])
        elif parity_side(q):
            ps_ = parity_side(q); q['gside'] = (ps_[1], ps_[0]); special_evidence['sephora']['address'] = dict(method='house-number parity of Levidou (even side)', side=ps_[0])
EXCL_CENSUS_B = {osm_bi.get('w1076768349'), osm_bi.get('w1076768348')} - {None}   # single-tenant: Starbucks pavilion, Ralph Lauren villa
CENSUS_SHOPS = []
for i in order:
    q = pois[i]
    if q['mode'] in ('standalone', 'area'): q['bay'] = q['mode']; continue
    fx_ = SPECIAL_FIX.get(q.get('special'))
    if fx_ and fx_['osm'] in osm_bi:
        bi = osm_bi[fx_['osm']]; b = out_b[bi]; best = None
        for ei in range(len(b['coords'])):
            a, c, nx, nz, Le = edge_geom(b, ei)
            if Le < 2.0: continue
            m = ((a[0] + c[0]) / 2 + nx * 2, (a[1] + c[1]) / 2 + nz * 2); dd = math.dist(m, fx_['toward'])
            if best is None or dd < best[0]: best = (dd, ei, Le)
        if best:
            slots[(bi, best[1])].append(q); q['_e'] = (bi, best[1], 0.5, best[2], round(best[0], 1)); q['bay'] = 'shop'; q['p'] = fx_['toward']
            special_evidence[q['special']]['override'] = fx_['why']; continue
    if q['src'] == 'census' and q['mode'] == 'shop': CENSUS_SHOPS.append(q); continue     # second pass, after the OSM bays are laid out
    cand = candidates(q, 12.0 if q['src'] in ('osm', 'address') and not q.get('special') else 45.0)
    if not cand: cand = candidates(q, 25.0 if q['src'] in ('osm', 'address') and not q.get('special') else 90.0)
    if not cand and q['src'] in ('osm', 'address'): cand = candidates(q, 45.0)
    if not cand:
        if q['src'] == 'census': q['bay'] = 'unbuilt'; q['why'] = 'no facade of its street on the address side near the address'; continue
        if q['src'] in ('osm', 'address'):     # no facade reachable without crossing a street: kept as a free-standing point (kiosk/park/station object), never moved
            q['bay'] = 'standalone'; q['why'] = 'no building facade within 45 m on its side of the street'; continue
        q['bay'] = 'none'; unplaced.append(q); continue
    if q['mode'] == 'shop':
        score, bi, ei, u, Le, d = cand[0]
        slots[(bi, ei)].append(q); q['_e'] = (bi, ei, u, Le, d); q['bay'] = 'shop'; continue
    q['bay'] = 'plate' if q['mode'] == 'plate' else 'building'
    if 'own_b' in q:
        own = [c for c in cand if c[1] == q['own_b']]
        if own:   # whole-building POI: the longest street-facing edge among the nearest ones
            d0 = own[0][0]; own.sort(key=lambda c: (-(c[4] if c[0] < d0 + 12 else 0), c[0])); cand = own
    score, bi, ei, u, Le, d = cand[0]
    q['_e'] = (bi, ei, u, Le, d)
# an edge with more surveyed shops than fit at 2.2 m each: the farthest-snapped ordinary ones go on the building directory board (same building, never moved)
SQUEEZED = []
for (bi, ei), items in slots.items():
    L = out_b[bi]['normals'][ei][2]
    while len(items) > 1:
        need = sum(min(minw(x), L) if x.get('special') else SQUEEZE_MIN for x in items) + GAP * (len(items) + 1)
        if need <= L: break
        ordn = [x for x in items if not x.get('special')]
        if not ordn: break
        x = max(ordn, key=lambda x: (0 if x['name'] else 1, x['_e'][4]))
        items.remove(x); x['bay'] = 'directory'; SQUEEZED.append(x['id'])
log('edges over capacity: %d surveyed shops moved to the directory board of the same building' % len(SQUEEZED))
def layout(L, items):
    """bays on one edge, in the order of their surveyed positions: min widths first (specials keep their researched width), then widened toward the
    neighbours up to maxw. 0.3 m margins at both ends and 0.3 m between bays (= what js/30_buildings.js layoutEdges() keeps, so the renderer does not move them)."""
    items.sort(key=lambda q: q['_e'][2])
    if len(items) == 1 and items[0].get('special'):
        q = items[0]; w = min(minw(q), L); c0 = min(max(q['_e'][2] * L, w / 2), L - w / 2); q['_bay'] = (c0 - w / 2, c0 + w / 2); return
    n = len(items); c = [q['_e'][2] * L for q in items]; mw = [min(minw(q), L - 2 * GAP) for q in items]
    room = L - GAP * (n + 1)
    if sum(mw) > room:
        sp_w = sum(m for m, q in zip(mw, items) if q.get('special')); oth = sum(mw) - sp_w; no = n - sum(1 for q in items if q.get('special'))
        if no and room - sp_w >= no * SQUEEZE_MIN: mw = [m if q.get('special') else max(SQUEEZE_MIN, m * (room - sp_w) / oth) for m, q in zip(mw, items)]
    if sum(mw) > room: mw = [m * room / sum(mw) for m in mw]
    pos = []; lo = GAP
    for i in range(n):
        ci = max(c[i], lo + mw[i] / 2); pos.append(ci); lo = ci + mw[i] / 2 + GAP
    hi = L - GAP
    for i in reversed(range(n)):
        ci = min(pos[i], hi - mw[i] / 2); pos[i] = ci; hi = ci - mw[i] / 2 - GAP
    for i, q in enumerate(items):
        left = GAP if i == 0 else (pos[i - 1] + mw[i - 1] / 2 + pos[i] - mw[i] / 2) / 2 + GAP / 2
        right = L - GAP if i == n - 1 else (pos[i] + mw[i] / 2 + pos[i + 1] - mw[i + 1] / 2) / 2 - GAP / 2
        w = max(min(right - left, maxw(q) if (q.get('special') or q['cat'] in MINW) else min(maxw(q), FIRST_CAP)), min(mw[i], right - left))
        c0 = min(max(pos[i], left + w / 2), right - w / 2)
        q['_bay'] = (c0 - w / 2, c0 + w / 2)
for (bi, ei), items in slots.items():
    if items: layout(out_b[bi]['normals'][ei][2], items)
# second pass: census-only shops (verified address) take only frontage the surveyed shops left free, near their address
CS_PLACED = 0; CS_DIR = 0
for q in sorted(CENSUS_SHOPS, key=lambda q: (q['posErrM'], -q['conf'])):
    cand = candidates(q, 15.0); done = False
    for score, bi, ei, u, Le, d in [c_ for c_ in cand if c_[1] not in EXCL_CENSUS_B][:6]:
        L = out_b[bi]['normals'][ei][2]; want = u * L
        occ = sorted(x['_bay'] for x in slots.get((bi, ei), []) if '_bay' in x)
        free = []; lo = GAP
        for s0, s1 in occ:
            if s0 - GAP - lo >= 2.6: free.append((lo, s0 - GAP))
            lo = max(lo, s1 + GAP)
        if L - GAP - lo >= 2.6: free.append((lo, L - GAP))
        best = None
        for f0, f1 in free:
            w = min(f1 - f0, maxw(q), 5.0); c0 = min(max(want, f0 + w / 2), f1 - w / 2)
            if abs(c0 - want) <= 12 and (best is None or abs(c0 - want) < best[0]): best = (abs(c0 - want), c0, w)
        if best:
            q['_e'] = (bi, ei, u, Le, d); q['_bay'] = (best[1] - best[2] / 2, best[1] + best[2] / 2); q['bay'] = 'shop'
            slots[(bi, ei)].append(q); done = True; CS_PLACED += 1; break
    if not done and cand:          # verified address but its frontage is taken by surveyed shops: its name goes on the directory board of that building
        q['_e'] = cand[0][1:]; q['bay'] = 'directory'; q['why'] = 'frontage at its address occupied by OSM-surveyed shops -> building directory board'; CS_DIR += 1
    elif not done:
        q['bay'] = 'unbuilt'; q['why'] = 'no facade of its street on the address side within 15 m'
log('census-only shops built: %d of %d verified; %d on the building directory (no free frontage)' % (CS_PLACED, len(CENSUS_SHOPS), CS_DIR))
# final pass: every bay grows into the free frontage next to it (up to its category's max width), centres stay; 0.3 m gaps kept
for (bi, ei), items in slots.items():
    L = out_b[bi]['normals'][ei][2]; it = sorted([x for x in items if '_bay' in x], key=lambda x: x['_bay'][0])
    for k_, x in enumerate(it):
        s0, s1 = x['_bay']; lo = it[k_ - 1]['_bay'][1] + GAP if k_ else GAP; hi = it[k_ + 1]['_bay'][0] - GAP if k_ + 1 < len(it) else L - GAP
        if x.get('special'): continue
        extra = max(0.0, maxw(x) - (s1 - s0)); 
        if extra <= 0: continue
        left_room = max(0.0, s0 - lo); right_room = max(0.0, hi - s1)
        if k_ + 1 < len(it): right_room /= 2          # share the gap with the right neighbour (it grows into the other half)
        if k_: left_room = min(left_room, max(0.0, (s0 - lo) / 2)) if not it[k_ - 1].get('special') else left_room
        gl = min(left_room, extra / 2); gr = min(right_room, extra - gl); gl = min(left_room, extra - gr)
        x['_bay'] = (s0 - gl, s1 + gr)
# plates / directories / whole-building signs: next to the middle of the edge's free part (they never take shopfront width)
plates = collections.defaultdict(list)
for q in pois:
    if q.get('bay') in ('plate', 'directory', 'building') and '_e' in q: plates[q['_e'][:2]].append(q)
def finish(q):
    bi, ei, u, Le, d = q['_e']; b = out_b[bi]; a, c, nx, nz, Le = edge_geom(b, ei)
    if '_bay' in q:
        s0, s1 = q['_bay']; t = (s0 + s1) / 2 / Le; w = s1 - s0
    else:
        t = min(max(u, min(0.5, 1.0 / Le)), max(0.5, 1 - 1.0 / Le)); w = 0.0
    fx, fz = a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t
    dd = 2.4 if q.get('special') else 1.2
    q.update(b=bi, e=ei, t=round(t, 4), w=round(w, 2), fx=r2(fx), fz=r2(fz), nx=round(nx, 3), nz=round(nz, 3), door=[r2(fx + nx * dd), r2(fz + nz * dd)], snapM=round(d, 1))
    if b['fs'][ei] >= 0: q['facing'] = b['fs'][ei]
for q in pois:
    if '_e' in q: finish(q)
# plates sharing an edge: spread them 0.9 m apart around their position so they do not coincide
for (bi, ei), items in plates.items():
    if len(items) < 2: continue
    b = out_b[bi]; a, c, nx, nz, Le = edge_geom(b, ei)
    items.sort(key=lambda q: q['t']); n = len(items); sp = min(0.9, Le / (n + 1))
    lo = 0.5 * sp
    ts = []
    for q in items:
        s = max(q['t'] * Le, lo); ts.append(s); lo = s + sp
    hi = Le - 0.5 * sp
    for k_ in reversed(range(n)):
        ts[k_] = min(ts[k_], hi); hi = ts[k_] - sp
    for q, s in zip(items, ts):
        t = max(0.0, s) / Le; fx, fz = a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t
        q.update(t=round(t, 4), fx=r2(fx), fz=r2(fz), door=[r2(fx + nx * 1.2), r2(fz + nz * 1.2)])
UNBUILT_POIS = [q for q in pois if q.get('bay') == 'unbuilt']
pois = [q for q in pois if q.get('bay') != 'unbuilt']
bay_counts = collections.Counter(q.get('bay') for q in pois)
log('POIs', len(pois), dict(bay_counts), 'unplaced', len(unplaced))

# legacy shops array per building (v2 format + 2 appended fields): [edge, t, sign text, bg, fg, kind, poiIndex, bayWidth]
special_out = {}
for qi, q in enumerate(pois):
    q['i'] = qi
    br = BRAND.get(q.get('special'))
    bg, fg = (br['bg'], br['fg']) if br else KINDC.get(q['cat'], ('#f6efe2', '#1d1d1f'))
    q['bg'], q['fg'] = bg, fg
    if q.get('bay') == 'shop':
        b = out_b[q['b']]
        if b['edges'][q['e']] != 2: b['edges'][q['e']] = 2
        label = (q['name'] or q['nameLatin'] or q['cat'].replace('_', ' ').title())[:26]
        b['shops'].append([q['e'], round(q['t'], 3), label, bg, fg, br['kind'] if br else q['tag'].split('=')[-1], qi, q['w']])
    if q.get('special'):
        b = out_b[q['b']]; a, c, nx, nz, Le = edge_geom(b, q['e'])
        ux, uz = (c[0] - a[0]) / Le, (c[1] - a[1]) / Le; hw = q['w'] / 2
        fa = (q['fx'] - ux * hw, q['fz'] - uz * hw); fb = (q['fx'] + ux * hw, q['fz'] + uz * hw)
        # usable depth behind the shopfront: from the bay centre straight in to the far wall
        ray = LineString([(q['fx'] - nx * 0.2, q['fz'] - nz * 0.2), (q['fx'] - nx * 80, q['fz'] - nz * 80)])
        inside = ray.intersection(b['poly'])
        seg = [g for g in getattr(inside, 'geoms', [inside]) if g.geom_type == 'LineString' and g.distance(Point(q['fx'], q['fz'])) < 0.5]
        depth = seg[0].length + 0.2 if seg else 0.0
        special_out[q['special']] = dict(x=q['fx'], z=q['fz'], nx=q['nx'], nz=q['nz'], door=q['door'], b=q['b'], e=q['e'], t=q['t'], w=q['w'], poi=qi,
                                         interior=dict(poly=[[r2(x), r2(z)] for x, z in b['coords']], frontage=[r2(fa[0]), r2(fa[1]), r2(fb[0]), r2(fb[1])], depth=round(depth, 1),
                                                       width=q['w'], area=round(b['poly'].area)))
        special_evidence[q['special']].update(facade=[q['fx'], q['fz']], b=q['b'], building=b['osmid'], facing=names[q['facing']] if 'facing' in q else None, snapM=q['snapM'], bayW=q['w'], depth=round(depth, 1))
log('specials placed', list(special_out))
if 'sephora' in special_out:     # the raw source point lies in the street; key.sephora = the pavement in front of the real shopfront (homeless man's spot)
    KEY['sephora_src'] = KEY['sephora']; KEY['sephora'] = tuple(special_out['sephora']['door'])
if 'starbucks' in special_out:   # address geocode lay on Kassaveti; the shop is the courtyard pavilion -> key = in front of its door
    KEY['starbucks_src'] = KEY['starbucks']; KEY['starbucks'] = tuple(special_out['starbucks']['door'])
door_pts = [Point(q['door']) for q in pois if 'door' in q]
door_zone = unary_union([LineString([(q['fx'], q['fz']), (q['fx'] + q['nx'] * 9, q['fz'] + q['nz'] * 9)]).buffer(max(1.3, min(q['w'], 6) / 2), cap_style='flat') for q in pois if q.get('bay') == 'shop'])

# ---------------------------------------------------------------- curbs, property lines, walls
def lines_of(geom):
    if geom.is_empty: return []
    if geom.geom_type == 'LineString': return [geom]
    if geom.geom_type == 'MultiLineString': return list(geom.geoms)
    if geom.geom_type == 'GeometryCollection': return [g for gg in geom.geoms for g in lines_of(gg)]
    return []
sw_focus = sidewalk.intersection(context)
swp = prep(sw_focus); swp_b = prep(sw_focus.buffer(0.3))
curb = lines_of(linemerge(lines_of(sw_focus.boundary.intersection(carriage.buffer(0.08)))))
prop = lines_of(linemerge(lines_of(sw_focus.boundary.difference(carriage.buffer(0.3)))))
# driveways: where a service road / parking entrance leaves a street
driveways = []
for n, lst in road_nodes.items():
    rs = [roads[ri] for ri, vi in lst]
    sv = [(ri, vi) for ri, vi in lst if roads[ri]['ty'] == 5 and not roads[ri]['hidden'] and vi in (0, len(roads[ri]['refs']) - 1)]
    if sv and any(r['ty'] <= 4 for r in rs) and cprep.contains(Point(nodes[n])):
        ri, vi = sv[0]; r = roads[ri]; a = r['pts'][vi]; b_ = r['pts'][1 if vi == 0 else -2]
        driveways.append((a[0], a[1], math.atan2(b_[1] - a[1], b_[0] - a[0]), r['w']))
for nid_, tg in ntags.items():
    if tg.get('amenity') == 'parking_entrance' and cprep.contains(Point(nodes[nid_])): driveways.append((nodes[nid_][0], nodes[nid_][1], 0.0, 4.0))
drive_zone = unary_union([Point(d[0], d[1]).buffer(d[3] / 2 + 1.6) for d in driveways]) if driveways else Polygon()
gate_pts = [nodes[n] for n, tg in ntags.items() if tg.get('barrier') in ('gate', 'lift_gate', 'entrance') or tg.get('entrance')]
blk = unary_union([buildings_union.buffer(1.6), carriage.buffer(0.5), pedpaths.buffer(0.8), plaza_union.buffer(0.5), door_zone, drive_zone] + [Point(p).buffer(1.6) for p in gate_pts])
walls = []
for ln in prop:
    seg = ln.difference(blk)
    for s in lines_of(seg):
        if s.length < 4: continue
        if not cprep.intersects(s): continue
        mid = s.interpolate(0.5, normalized=True)
        st = 'park' if park_union.buffer(4).contains(mid) else ('school' if school_union.buffer(4).contains(mid) else ('center' if cprep_center.contains(mid) else 'res'))
        Ls = s.length; pos = 0.0
        while pos < Ls:
            run = random.uniform(14, 30) if st != 'park' else Ls
            a, b = pos, min(Ls, pos + run)
            if b - a > 2.5:
                piece = [s.interpolate(t) for t in np.linspace(a, b, max(2, int((b - a) / 3) + 1))]
                walls.append([st, flat([(p.x, p.y) for p in piece])])
            pos = b + (random.uniform(2.6, 4.0) if st != 'park' else 1e9)
log('curb lines', len(curb), 'wall runs', len(walls))
# mapped line barriers and tree rows (real geometry)
barriers = []; tree_rows = []
for wid, (refs, tg) in ways.items():
    pts = [nodes[r] for r in refs if r in nodes]
    if len(pts) < 2 or not LineString(pts).intersects(context): continue
    if tg.get('barrier') in ('fence', 'wall', 'hedge', 'retaining_wall', 'guard_rail', 'city_wall', 'handrail', 'kerb') and 'building' not in tg:
        barriers.append([tg['barrier'], fnum(tg.get('height')) or 0, 'w' + wid, flat(pts)])
    if tg.get('natural') == 'tree_row':
        tree_rows.append([tg.get('species') or tg.get('genus') or tg.get('leaf_type') or '', 'w' + wid, flat(pts)])

# ---------------------------------------------------------------- street furniture (every mapped micro-feature)
def road_dir_at_node(nid_):
    for ri, vi in road_nodes.get(nid_, []):
        r = roads[ri]; pts = r['pts']
        if r['ty'] > 5: continue
        a = pts[max(0, vi - 1)]; b = pts[min(len(pts) - 1, vi + 1)]
        return math.atan2(b[1] - a[1], b[0] - a[0]), r['w']
    return None, None
alln_tree = STRtree([r['ls'] for r in roads if not r['hidden']]); alln = [r for r in roads if not r['hidden']]
def face_yaw(p, tg=None):
    """yaw (facing = (sin, cos)) for a seat / box: OSM direction tag if present, else towards the nearest way it sits beside"""
    if tg and tg.get('direction'):
        d = fnum(tg['direction'])
        comp = {'N': 0, 'NE': 45, 'E': 90, 'SE': 135, 'S': 180, 'SW': 225, 'W': 270, 'NW': 315}
        if d is None: d = comp.get(tg['direction'].upper())
        if d is not None:      # compass bearing: 0 = north (-z), 90 = east (+x)  -> facing (sin b, -cos b) -> yaw = atan2(sin b, -cos b)
            br = math.radians(d); return round(math.atan2(math.sin(br), -math.cos(br)), 3)
    pt = Point(p); idx = alln_tree.query_nearest(pt, max_distance=40, all_matches=False)
    if len(idx):
        ls = alln[int(idx[0])]['ls']; c = ls.interpolate(ls.project(pt))
        if c.distance(pt) > 0.3: return round(math.atan2(c.x - p[0], c.y - p[1]), 3)
    return 0.0
PK = ('crossing', 'signal', 'stop', 'bus', 'bench', 'basket', 'fountain', 'kiosk', 'tree', 'recycle',
      'giveway', 'post_box', 'telephone', 'vending', 'atm', 'water', 'artwork', 'memorial', 'info', 'bike_parking', 'moto_parking', 'lamp', 'bollard', 'gate', 'entrance',
      'parking_entrance', 'charging', 'clock', 'toilets', 'taxi', 'flagpole', 'manhole', 'elevator', 'subway_entrance', 'play', 'speed_sign', 'bike_rental')
props = {k: [] for k in PK}
bus_routes = collections.defaultdict(set)
for members, tg, rid in rels:
    if tg.get('type') == 'route' and tg.get('route') in ('bus', 'trolleybus'):
        for mt, ref, role in members:
            if mt == 'node': bus_routes[ref].add(tg.get('ref') or tg.get('name') or '')
moved = []
def XZ(p): return [R(p[0]), R(p[1])]
for nid_, tg in ntags.items():
    p = nodes[nid_]
    if not cprep.contains(Point(p)): continue
    hw = tg.get('highway'); am = tg.get('amenity'); oid = 'n' + nid_
    if hw == 'crossing' or tg.get('railway') == 'crossing':
        ang, w = road_dir_at_node(nid_)
        if ang is not None:
            ct = tg.get('crossing', ''); mk = tg.get('crossing:markings', '')
            typ = 'signals' if (ct == 'traffic_signals' or tg.get('crossing:signals') == 'yes') else ('unmarked' if (ct == 'unmarked' or mk == 'no') else 'zebra')
            props['crossing'].append(XZ(p) + [round(ang, 3), round(w, 1), typ, 1 if tg.get('kerb') in ('lowered', 'flush') else 0, 1 if tg.get('tactile_paving') == 'yes' else 0, oid])
    elif hw == 'traffic_signals':
        ang, w = road_dir_at_node(nid_)
        if ang is not None: props['signal'].append(XZ(p) + [round(ang, 3), round(w, 1), oid])
    elif hw == 'stop':
        ang, w = road_dir_at_node(nid_)
        if ang is not None: props['stop'].append(XZ(p) + [round(ang, 3), round(w, 1), tg.get('direction', ''), oid])
    elif hw == 'give_way':
        ang, w = road_dir_at_node(nid_)
        if ang is not None: props['giveway'].append(XZ(p) + [round(ang, 3), round(w, 1), tg.get('direction', ''), oid])
    elif hw == 'bus_stop' or (tg.get('public_transport') == 'platform' and tg.get('bus') == 'yes'):
        props['bus'].append(XZ(p) + [(tg.get('name') or '')[:24], dict(id=oid, nameLatin=latin_name(tg), shelter=1 if tg.get('shelter') == 'yes' else 0, bench=1 if tg.get('bench') == 'yes' else 0,
                                                                         ref=tg.get('ref', ''), routes=sorted(x for x in bus_routes.get(nid_, []) if x), yaw=face_yaw(p))])
    elif hw == 'street_lamp': props['lamp'].append(XZ(p) + [tg.get('lamp_type', ''), oid])
    elif hw == 'elevator': props['elevator'].append(XZ(p) + [oid])
    elif am == 'bench': props['bench'].append(XZ(p) + [face_yaw(p, tg), 1 if tg.get('backrest') != 'no' else 0, tg.get('material', ''), oid])
    elif am == 'waste_basket': props['basket'].append(XZ(p) + [oid])
    elif am == 'fountain' or am == 'drinking_water':
        props['fountain'].append(XZ(p) + [1 if am == 'fountain' else 0, (tg.get('name') or '')[:24], oid])
        if am == 'drinking_water': props['water'].append(XZ(p) + [oid])
    elif tg.get('shop') == 'kiosk': props['kiosk'].append(XZ(p) + [(tg.get('name') or '')[:20], face_yaw(p), oid])
    elif tg.get('natural') == 'tree': props['tree'].append(XZ(p) + [tg.get('species') or tg.get('genus') or tg.get('leaf_type') or '', oid])
    elif am == 'recycling': props['recycle'].append(XZ(p) + [tg.get('recycling_type', ''), oid])
    elif am == 'post_box': props['post_box'].append(XZ(p) + [face_yaw(p), oid])
    elif am == 'telephone': props['telephone'].append(XZ(p) + [face_yaw(p), oid])
    elif am == 'vending_machine': props['vending'].append(XZ(p) + [tg.get('vending', ''), face_yaw(p), oid])
    elif am == 'atm': props['atm'].append(XZ(p) + [(tg.get('operator') or tg.get('brand') or tg.get('name') or '')[:20], face_yaw(p), oid])
    elif am == 'bicycle_parking': props['bike_parking'].append(XZ(p) + [fnum(tg.get('capacity')) or 0, oid])
    elif am == 'motorcycle_parking': props['moto_parking'].append(XZ(p) + [fnum(tg.get('capacity')) or 0, oid])
    elif am == 'bicycle_rental': props['bike_rental'].append(XZ(p) + [(tg.get('name') or tg.get('operator') or '')[:20], oid])
    elif am == 'parking_entrance': props['parking_entrance'].append(XZ(p) + [tg.get('parking', ''), (tg.get('name') or '')[:24], oid])
    elif am == 'charging_station': props['charging'].append(XZ(p) + [(tg.get('operator') or tg.get('brand') or '')[:20], oid])
    elif am == 'clock': props['clock'].append(XZ(p) + [oid])
    elif am == 'toilets': props['toilets'].append(XZ(p) + [oid])
    elif am == 'taxi': props['taxi'].append(XZ(p) + [(tg.get('name') or '')[:24], oid])
    elif tg.get('tourism') == 'artwork': props['artwork'].append(XZ(p) + [tg.get('artwork_type', ''), (tg.get('name') or '')[:40], oid])
    elif tg.get('historic') == 'memorial': props['memorial'].append(XZ(p) + [tg.get('memorial', ''), (tg.get('name') or '')[:40], oid])
    elif tg.get('tourism') == 'information': props['info'].append(XZ(p) + [tg.get('information', ''), (tg.get('name') or '')[:30], oid])
    elif tg.get('barrier') == 'bollard': props['bollard'].append(XZ(p) + [oid])
    elif tg.get('barrier') in ('gate', 'lift_gate', 'swing_gate', 'entrance', 'kissing_gate', 'turnstile'):
        ang, w = None, None
        for ri, vi in road_nodes.get(nid_, []):
            pts = roads[ri]['pts']; a = pts[max(0, vi - 1)]; b = pts[min(len(pts) - 1, vi + 1)]; ang = math.atan2(b[1] - a[1], b[0] - a[0]); w = roads[ri]['w']; break
        props['gate'].append(XZ(p) + [tg['barrier'], round(ang, 3) if ang is not None else None, round(w, 1) if w else None, tg.get('access', ''), oid])
    elif tg.get('entrance'): props['entrance'].append(XZ(p) + [tg['entrance'], oid])
    elif tg.get('man_made') == 'flagpole': props['flagpole'].append(XZ(p) + [oid])
    elif tg.get('man_made') == 'manhole': props['manhole'].append(XZ(p) + [oid])
    elif tg.get('railway') == 'subway_entrance': props['subway_entrance'].append(XZ(p) + [(tg.get('name') or '')[:24], oid])
    elif tg.get('playground'): props['play'].append(XZ(p) + [tg['playground'], oid])
    elif tg.get('traffic_sign'): props['speed_sign'].append(XZ(p) + [tg.get('traffic_sign', ''), tg.get('maxspeed', ''), oid])
# fountains / playground equipment mapped as areas
for wid, (refs, tg) in ways.items():
    g = way_poly(refs)
    if g is None or not cprep.intersects(g): continue
    c = g.representative_point()
    if tg.get('amenity') == 'fountain': props['fountain'].append([R(c.x), R(c.y), 1, (tg.get('name') or '')[:24], 'w' + wid, round(math.sqrt(g.area / math.pi), 1)])
    if tg.get('playground'): props['play'].append([R(c.x), R(c.y), tg['playground'], 'w' + wid])
# de-duplicate bus stops (platform + stop nodes describing one stop)
bs = []
for b in props['bus']:
    dup = next((c for c in bs if math.hypot(b[0] - c[0], b[1] - c[1]) <= 120), None)
    if dup is None: bs.append(b)
    else:
        for k_ in ('shelter', 'bench'): dup[3][k_] = max(dup[3][k_], b[3][k_])
        dup[3]['routes'] = sorted(set(dup[3]['routes']) | set(b[3]['routes']))
        if not dup[2] and b[2]: dup[2] = b[2]
props['bus'] = bs
# mapped furniture must not sit in a carriageway or a building after the width calibration: nudge onto the nearest footway edge (reported)
carr_prep = prep(carriage)
for kind in ('bench', 'basket', 'recycle', 'post_box', 'telephone', 'vending', 'atm', 'water', 'bus', 'kiosk', 'tree', 'bike_parking', 'moto_parking', 'lamp', 'info', 'artwork', 'memorial', 'clock', 'fountain'):
    for it in props[kind]:
        pt = Point(it[0] / 10, it[1] / 10)
        inc = carr_prep.contains(pt); inb = shapely.contains_xy(buildings_union, pt.x, pt.y)
        if not (inc or inb): continue
        if inb and kind in ('atm', 'vending', 'telephone', 'clock', 'info', 'artwork', 'memorial', 'bench', 'fountain'): continue      # legitimately indoors / wall-mounted / courtyard
        tgt = carriage if inc else buildings_union
        e = tgt.boundary.interpolate(tgt.boundary.project(pt)); dx, dz = e.x - pt.x, e.y - pt.y; l = math.hypot(dx, dz) or 1
        nx_, nz_ = e.x + dx / l * 0.45, e.y + dz / l * 0.45
        if carr_prep.contains(Point(nx_, nz_)) or shapely.contains_xy(buildings_union, nx_, nz_): continue
        moved.append(dict(kind=kind, id=it[-1] if isinstance(it[-1], str) else '', frm=[it[0] / 10, it[1] / 10], to=[round(nx_, 1), round(nz_, 1)], by=round(l + 0.45, 2), why='in carriageway' if inc else 'in building'))
        it[0], it[1] = R(nx_), R(nz_)
log({k: len(v) for k, v in props.items() if v}, 'moved', len(moved))
seats = [[b[0], b[1], b[2], 0.45, 'bench', ''] for b in props['bench']]

# ---------------------------------------------------------------- synthetic street trees / lamps / bollards / parked cars (follow the real data)
def pts_of(kinds, rad): return [Point(it[0] / 10, it[1] / 10).buffer(rad) for k_ in kinds for it in props[k_]]
occupied = unary_union([buildings_union.buffer(1.2), carriage.buffer(0.4)])
occ_prep = prep(occupied)
crossing_pts = [Point(c[0] / 10, c[1] / 10) for c in props['crossing']] + [Point(s[0] / 10, s[1] / 10) for s in props['signal']]
cross_union = unary_union([p.buffer(7) for p in crossing_pts]) if crossing_pts else Polygon()
cross_near = unary_union([p.buffer(4.5) for p in crossing_pts]) if crossing_pts else Polygon()
junc_union = unary_union([Point(p).buffer(9) for p in junction_nodes])
avoid = prep(unary_union([cross_union, junc_union]))
doors_u = unary_union([p.buffer(1.7) for p in door_pts]) if door_pts else Polygon()
bus_u = unary_union(pts_of(['bus'], 5)) if props['bus'] else Polygon()
real_small = unary_union(pts_of(['bench', 'basket', 'recycle', 'post_box', 'telephone', 'vending', 'water', 'kiosk', 'fountain', 'artwork', 'memorial', 'info', 'bike_parking', 'lamp', 'bollard', 'clock', 'taxi', 'parking_entrance'], 2.2) or [Polygon()])
real_trees = unary_union(pts_of(['tree'], 5.0) + [LineString([(c[i] / 10, c[i + 1] / 10) for i in range(0, len(c), 2)]).buffer(5.0) for s_, i_, c in tree_rows] or [Polygon()])
no_tree = prep(unary_union([cross_near, junc_union, doors_u, drive_zone, bus_u, real_small, real_trees]))
no_lamp = prep(unary_union([doors_u, drive_zone, real_small, unary_union(pts_of(['tree'], 2.0) or [Polygon()])]))
no_boll = prep(unary_union([cross_near, doors_u.buffer(-0.5), drive_zone, bus_u, real_small]))
no_park = prep(unary_union([cross_union, junc_union, drive_zone.buffer(1.5), unary_union(pts_of(['bus'], 14) or [Polygon()]), unary_union(pts_of(['taxi'], 10) or [Polygon()]), buildings_union.buffer(0.6)]))
def parking_sides(r):
    """-> set of sides (+1 = side A / OSM right, -1 = side B / OSM left) with kerb-side parking.  OSM tags first, else by width."""
    pl, pr = park_tags(r['tg'])
    if pl is not None or pr is not None:
        s = set()
        if pr in ('lane', 'parallel', 'yes', 'street_side', 'half_on_kerb', 'on_kerb'): s.add(1)
        if pl in ('lane', 'parallel', 'yes', 'street_side', 'half_on_kerb', 'on_kerb'): s.add(-1)
        return s, 'tag'
    rs = RSTREET.get(r['name'])
    if rs and rs.get('parking') in ('none', 'left', 'right', 'both'):
        return {'none': set(), 'left': {-1}, 'right': {1}, 'both': {1, -1}}[rs['parking']], 'research'
    if r['ty'] not in (2, 3, 4): return set(), 'class'
    lanes = 1 if r['ow'] else 2; spare = r['w'] - lanes * 2.9
    if spare >= 4.0: return {1, -1}, 'width'
    if spare >= 2.0: return {1}, 'width'
    return set(), 'width'
street_trees, lamps, bollards, parked = [], [], [], []
for r in car_roads:
    r['park'], r['park_src'] = parking_sides(r)
    if r['side'] == 0 or r['ty'] == 5: continue
    if not cprep.intersects(r['ls']): continue
    ls = r['ls']; ctr = r['center']
    for sd in (-1, 1):
        sww = r['swA'] if sd > 0 else r['swB']
        if (sd > 0 and r['side'] == 1) or (sd < 0 and r['side'] == 2): continue
        if sww >= 1.9:      # a tree needs a footway at least 1.9 m wide; it stands 0.75 m behind the kerb
            try: off = ls.parallel_offset(r['w'] / 2 + min(0.9, sww * 0.35), 'left' if sd > 0 else 'right', join_style=2)
            except Exception: off = None
            for oln in lines_of(off) if off is not None else []:
                Lo = oln.length; t = random.uniform(3, 9)
                while t < Lo - 2:
                    p = oln.interpolate(t)
                    if not occ_prep.contains(p) and not avoid.contains(p) and not no_tree.contains(p) and cprep.contains(p) and swp.contains(p):
                        sp = 'plane' if (r['ty'] <= 2 or ctr) else ('orange' if (H(r['id']) + int(t)) % 3 else 'plane')
                        street_trees.append([R(p.x), R(p.y), sp])
                    t += random.uniform(9, 15)
        try: off2 = ls.parallel_offset(r['w'] / 2 + 0.55, 'left' if sd > 0 else 'right', join_style=2)
        except Exception: continue
        for oln in lines_of(off2):
            Lo = oln.length; t = 12 if sd > 0 else 25
            while t < Lo - 3:
                p = oln.interpolate(t); q = oln.interpolate(min(Lo, t + 0.5))
                if not occ_prep.contains(p) and cprep.contains(p) and swp_b.contains(p) and not no_lamp.contains(p):
                    style = 2 if r['ty'] == 0 else (0 if ctr else 1)   # 0 cast-iron lantern, 1 globe, 2 avenue
                    lamps.append([R(p.x), R(p.y), style, round(math.atan2(q.y - p.y, q.x - p.x), 2), sd])
                t += 26 if ctr else 32
            # bollards guard the kerb of narrow centre streets on the sides WITHOUT a parking lane
            if ctr and r['ty'] >= 2 and r['w'] < 10 and sd not in r['park'] and fprep.intersects(oln):
                t = 2.0
                while t < Lo - 1:
                    p = oln.interpolate(t)
                    if not avoid.contains(p) and not occ_prep.contains(p) and swp_b.contains(p) and fprep.contains(p) and not no_boll.contains(p):
                        bollards.append([R(p.x), R(p.y)])
                    t += 1.9
    # parallel parking where the carriageway has room for it (never on the avenue or secondary roads)
    if r['ty'] in (2, 3, 4) and fprep.intersects(ls):
        for sd in sorted(r['park']):
            try: off = ls.parallel_offset(r['w'] / 2 - 1.1, 'left' if sd > 0 else 'right', join_style=2)
            except Exception: continue
            for oln in lines_of(off):
                Lo = oln.length; t = 8.0
                while t < Lo - 8:
                    p = oln.interpolate(t); q = oln.interpolate(t + 1)
                    if random.random() < 0.6 and not no_park.contains(p) and fprep.contains(p) and carr_prep.contains(p):
                        ang = math.atan2(q.y - p.y, q.x - p.x)
                        if sd < 0 and not r['ow']: ang += math.pi          # two-way street: cars on the far side face the other way
                        parked.append([R(p.x), R(p.y), round(ang, 3)])
                    t += 5.6
# real tree rows -> trees every ~8 m along the mapped line (row is real, the individual trunks are interpolated)
row_trees = 0
for sp, wid_, c in tree_rows:
    ln = LineString([(c[i] / 10, c[i + 1] / 10) for i in range(0, len(c), 2)]); n = max(2, int(round(ln.length / 8.0)) + 1)
    for t in np.linspace(0, ln.length, n):
        p = ln.interpolate(t)
        if not occ_prep.contains(p): street_trees.append([R(p.x), R(p.y), 'plane' if 'broad' in sp or not sp else ('pine' if 'needle' in sp else 'plane')]); row_trees += 1
log('street trees', len(street_trees), '(of which on mapped rows %d)' % row_trees, 'lamps', len(lamps), 'bollards', len(bollards), 'parked', len(parked))

# garden / park trees (sampled in open land; as v2 but never on a door, driveway or mapped object)
free_land = context.difference(unary_union([buildings_union.buffer(2.0), carriage.buffer(1.0), sidewalk_full.buffer(0.5), sidewalk.buffer(0.3), plaza_union, pedpaths.buffer(1.0), pool_union.buffer(0.8), door_zone, drive_zone, real_small]))
fl_prep = prep(free_land); park_prep = prep(park_union)
pitch_u = unary_union([g for k_, g, t, i in areas if k_ in ('pitch', 'play', 'parking')] or [Polygon()]); pitch_prep = prep(pitch_u.buffer(1.0))
garden_trees = []
bx0, bz0, bx1, bz1 = context.bounds
tries = 0
while len(garden_trees) < 3600 and tries < 90000:
    tries += 1
    x, z = random.uniform(bx0, bx1), random.uniform(bz0, bz1); p = Point(x, z)
    if not fl_prep.contains(p) or pitch_prep.contains(p): continue
    inpark = park_prep.contains(p)
    infocus = fprep.contains(p)
    if not inpark and random.random() < (0.35 if infocus else 0.75): continue
    sp = random.choice(['pine', 'pine', 'cypress', 'cypress', 'plane', 'olive', 'palm', 'orange', 'cedar']) if not inpark else random.choice(['pine', 'pine', 'cedar', 'cypress', 'plane', 'plane', 'palm'])
    garden_trees.append([R(x), R(z), sp])
log('garden trees', len(garden_trees))

# ---------------------------------------------------------------- rail / station (as v2)
rail = []
for wid, (refs, tg) in ways.items():
    if tg.get('railway') in ('subway', 'rail', 'light_rail') and tg.get('service') not in ('yard',):
        pts = [nodes[r] for r in refs if r in nodes]
        if len(pts) > 1 and LineString(pts).intersects(context): rail.append(flat(pts))
station_node = KEY['station']
station_bld = None
for b in out_b:
    if b['poly'].distance(Point(station_node)) < 25 and b['poly'].area < 900:
        if station_bld is None or b['poly'].distance(Point(station_node)) < station_bld['poly'].distance(Point(station_node)): station_bld = b
if station_bld: station_bld['style'] = 'station'; station_bld['lv'] = 1; station_bld['roof'] = 'flat'
radj = {}
for wid, (refs, tg) in ways.items():
    if tg.get('railway') == 'subway':
        rr = [r for r in refs if r in nodes]
        for a, b in zip(rr, rr[1:]):
            radj.setdefault(a, set()).add(b); radj.setdefault(b, set()).add(a)
startn = min(radj, key=lambda n: math.dist(nodes[n], (-386, -112)))
path = [startn]; seen = {startn}
while True:
    cur = path[-1]
    nxt = [m for m in radj[cur] if m not in seen and nodes[m][1] > nodes[cur][1] - 1]
    if not nxt: break
    m = max(nxt, key=lambda m: nodes[m][1] - abs(nodes[m][0] - nodes[cur][0]) * 0.2)
    path.append(m); seen.add(m)
    if nodes[m][1] - nodes[startn][1] > 650: break
train_path = [nodes[n] for n in path]
log('train path', len(train_path), 'pts, length %.0f m' % LineString(train_path).length)
oc = []
for c in curb:
    if c.length < 0.6: continue
    co = list(c.coords)
    a, b = co[0], co[1]; dx, dz = b[0] - a[0], b[1] - a[1]; L_ = math.hypot(dx, dz) or 1
    mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    if not carriage.contains(Point(mx - dz / L_ * 0.5, mz + dx / L_ * 0.5)): co = co[::-1]
    oc.append(co)

# ---------------------------------------------------------------- addresses, restrictions, key points
addr = []
for nid_, tg in ntags.items():
    if tg.get('addr:housenumber') and cprep.contains(Point(nodes[nid_])):
        addr.append([R(nodes[nid_][0]), R(nodes[nid_][1]), tg['addr:housenumber'], nid(tg['addr:street']) if tg.get('addr:street') else -1, -1, 'n' + nid_])
for b in out_b:
    tg = b['tg']
    if tg.get('addr:housenumber'):
        c = b['poly'].representative_point()
        addr.append([R(c.x), R(c.y), tg['addr:housenumber'], nid(tg['addr:street']) if tg.get('addr:street') else -1, b['bi'], b['osmid']])
way_ri = {r['id']: i for i, r in enumerate(roads)}
restrictions = []
for members, tg, rid in rels:
    if tg.get('type') != 'restriction': continue
    fr = next((ref for mt, ref, role in members if role == 'from' and mt == 'way'), None); to = next((ref for mt, ref, role in members if role == 'to' and mt == 'way'), None)
    via = next((ref for mt, ref, role in members if role == 'via' and mt == 'node'), None)
    if fr in way_ri and to in way_ri and via in nodes:
        restrictions.append([tg.get('restriction', ''), way_ri[fr], way_ri[to], R(nodes[via][0]), R(nodes[via][1])])
# the spawn junction: where Kassaveti, Levidou and Kyriazi meet (between Mythos Plus, AB and PAUL)
JN = {'Κασσαβέτη', 'Λεβίδου', 'Κυριαζή'}
cands = []
for n, lst in road_nodes.items():
    nm = {roads[ri]['name'] for ri, vi in lst if roads[ri]['ty'] <= 4} & JN
    if len(nm) >= 2: cands.append((len(nm), n, nm))
if cands:
    ctr3 = [sum(special_out[k][c] for k in ('mythos', 'super', 'paul')) / 3 for c in ('x', 'z')]
    best = min(cands, key=lambda c: math.dist(nodes[c[1]], ctr3) - 25 * c[0])
    JUNCTION = nodes[best[1]]; JUNCTION_INFO = dict(node='n' + best[1], streets=sorted(best[2]), all=[dict(node='n' + c[1], streets=sorted(c[2]), x=r2(nodes[c[1]][0]), z=r2(nodes[c[1]][1])) for c in cands])
    KEY['junction'] = JUNCTION
    log('spawn junction', JUNCTION, JUNCTION_INFO['streets'])

# ---------------------------------------------------------------- write
def ring(poly): return flat(list(poly.exterior.coords)[:-1])
def poly_out(g): return [ring(g)] + [flat(list(h.coords)[:-1]) for h in g.interiors]
TILE = 64.0
def split_tiles(geom):
    out = []
    if geom.is_empty: return out
    x0, z0, x1, z1 = geom.bounds
    for ti in range(int(math.floor(x0 / TILE)), int(math.floor(x1 / TILE)) + 1):
        for tj in range(int(math.floor(z0 / TILE)), int(math.floor(z1 / TILE)) + 1):
            cell = box(ti * TILE, tj * TILE, (ti + 1) * TILE, (tj + 1) * TILE)
            g = geom.intersection(cell)
            for gg in getattr(g, 'geoms', [g]):
                if gg.geom_type == 'Polygon' and gg.area > 0.5: out.append(poly_out(gg.simplify(0.05)))
    return out
def sw_legacy(r):
    if r['ty'] > 4: return 0
    return round(max(0.6, min(r['swA'], r['swB'])), 1)
def roadx(r):
    tg = r['tg']; o = dict(id='w' + r['id'], hw=tg['highway'])
    nl = latin_name(tg) if tg.get('name') else ''
    if nl: o['nameLatin'] = nl
    for k_, f_ in (('lanes', 'lanes'), ('maxspeed', 'maxspeed'), ('lit', 'lit'), ('surface', 'surface'), ('sidewalk', 'sidewalk'), ('service', 'service'), ('access', 'access'), ('bridge', 'bridge'),
                   ('tunnel', 'tunnel'), ('layer', 'layer'), ('incline', 'incline'), ('step_count', 'steps'), ('handrail', 'handrail'), ('ref', 'ref'), ('footway', 'footway'), ('smoothness', 'smoothness'),
                   ('dual_carriageway', 'dual'), ('junction', 'junction'), ('covered', 'covered'), ('motor_vehicle', 'motor_vehicle'), ('cycleway:right', 'cyclewayRight'), ('cycleway:both', 'cycleway')):
        if tg.get(k_): o[f_] = tg[k_]
    if 'sidewalk' not in o and tg.get('sidewalk:both'): o['sidewalk'] = 'both' if tg['sidewalk:both'] not in ('no', 'separate') else tg['sidewalk:both']
    if r['ty'] <= 5 and not r['hidden']:
        o['wSrc'] = r['wsrc']; o['w0'] = round(r['w0'], 1)
        o['clear'] = [None if v is None else round(v, 1) for v in (r['p15'][1], r['p15'][0])]       # [OSM left, OSM right] typical distance centre line -> building line
        o['sw'] = [r['swB'], r['swA']]                                                              # [OSM left, OSM right] footway width
        pk = r.get('park', set()); o['park'] = [1 if -1 in pk else 0, 1 if 1 in pk else 0]; o['parkSrc'] = r.get('park_src', '')
    return o
def bx(b):
    tg = b['tg']; o = dict(id=b['osmid'])
    for k_, f_ in (('building', 'type'), ('height', 'height'), ('roof:shape', 'roofShape'), ('roof:levels', 'roofLevels'), ('roof:colour', 'roofColour'), ('building:colour', 'colour'),
                   ('building:material', 'material'), ('amenity', 'amenity'), ('shop', 'shop'), ('tourism', 'tourism'), ('addr:street', 'street'), ('addr:housenumber', 'number'), ('wikidata', 'wikidata'),
                   ('layer', 'layer'), ('historic', 'historic'), ('denomination', 'denomination')):
        if tg.get(k_) and not (k_ == 'building' and tg[k_] == 'yes'): o[f_] = tg[k_]
    if b['lv_tag']: o['levels'] = b['lv_tag']
    if tg.get('name'): o['name'] = tg['name']; o['nameLatin'] = latin_name(tg)
    if tg.get('start_date'): o['startDate'] = tg['start_date']
    o['tags'] = dict(tg)                                                     # ORDERS 2026-11-21: every OSM tag of the building, verbatim
    # (no building:part ways exist in this OSM extract; if they appear, add them here as o['parts'])
    o['setb'] = [round(v, 1) if v >= 0 else -1 for v in b['setb']]          # per edge: metres from the facade to public space, -1 = not street-facing
    o['fs'] = b['fs']                                                        # per edge: index into names[] of the street it faces, -1 = unknown
    o['shops'] = sorted(b['shops'], key=lambda s: (s[0], s[1]))              # ALL shopfront bays of this building (same 8-field format as buildings[i][8])
    return o
# buildings[i][8] (legacy field) is capped: the v2 renderer's sign atlas has 224 slots shared with bus stops / street plates and crashes when they run out.
# Kept: the specials, then OSM-surveyed shops, then the rest by distance to the spawn junction.  The complete list is buildings[i][11].shops and MAP.pois.
LEGACY_SHOP_CAP = 165
_jx, _jz = KEY.get('junction', (94.0, 61.0))
_rank = sorted([q for q in pois if q.get('bay') == 'shop'], key=lambda q: (0 if q.get('special') else (1 if q['src'] in ('osm', 'address') and q['name'] else 2), math.dist((q['fx'], q['fz']), (_jx, _jz))))
LEGACY_OK = set(q['i'] for q in _rank[:LEGACY_SHOP_CAP])
def legacy_shops(b): return sorted([s_ for s_ in b['shops'] if s_[6] in LEGACY_OK], key=lambda s: (s[0], s[1]))
def poi_out(q):
    o = dict(id=q['id'], src=q['src'], cat=q['cat'], tag=q['tag'], name=q['name'], nameLatin=q['nameLatin'], x=r2(q['p'][0]), z=r2(q['p'][1]),
             focus=1 if fprep.contains(Point(q['p'])) else 0, play=1 if pprep.contains(Point(q['p'])) else 0, bay=q.get('bay', 'none'), posErrM=q['posErrM'], conf=q['conf'], bg=q['bg'], fg=q['fg'])
    for f_ in ('b', 'e', 't', 'w', 'fx', 'fz', 'nx', 'nz', 'door', 'snapM', 'facing', 'special', 'brand', 'cuisine', 'hours', 'street', 'number', 'level', 'phone', 'website', 'operator', 'outdoor',
               'takeaway', 'ov_addr', 'posMethod', 'census', 'tier', 'osm', 'also', 'datasets', 'area_m2', 'sj', 'sjName', 'listingXZ', 'dups', 'formerName', 'branch'):
        if q.get(f_) not in (None, '', []): o[f_] = q[f_]
    if 'overture' in q and q['src'] != 'overture': o['overture'] = q['overture']['id']
    return o
data = dict(
    v=3, origin=[LAT0, LON0], base=round(BASE, 2),
    bounds=[round(v, 1) for v in context.bounds],
    terrain=dict(x0=gx0, z0=gz0, step=TG, nx=gnx, nz=gnz, h=[int(round(v * 100)) for v in T.flatten()]),
    focus=[ring(g) for g in getattr(focus, 'geoms', [focus])],
    playable=[ring(g) for g in getattr(playable, 'geoms', [playable])],
    names=names,
    roads=[[r['ty'], nid(r['name']), r['ow'], round(r['w'], 1), r['surf'], r['side'] if not r['hidden'] else -1, sw_legacy(r), 1 if r['infocus'] else 0] + flat(r['pts']) for r in roads],
    sidewalks=split_tiles(sw_focus),
    curbs=[flat(c) for c in oc],
    train=flat(train_path),
    walls=walls,
    buildings=[[R(b['gmin']), b['lv'], b['style'], b['roof'], 1 if b['detail'] else 0, b['h'] % 997,
                [round(v, 2) for v in b['rect']], b['edges'], legacy_shops(b), b['name'][:30], flat(b['coords']), bx(b)] for b in out_b],
    areas=[[k_, poly_out(g)] for k_, g, t, i in areas],
    rail=rail,
    props=props, street_trees=street_trees, garden_trees=garden_trees, lamps=lamps, bollards=bollards, parked=parked,
    pitches=[], special=special_out,
    key={k_: [round(v[0], 1), round(v[1], 1)] for k_, v in KEY.items()},
    isa=dict(poly=flat(list(isa_poly.exterior.coords)[:-1]), gate=[round(v, 1) for v in route['route'][-1]]),
    route=flat(route['route']),
)
for k_, g, t, i in areas:
    if k_ == 'pitch':
        cx, cz, L, W, ang = omb_rect(g)
        data['pitches'].append([round(cx, 1), round(cz, 1), round(L, 1), round(W, 1), round(ang, 3), t.get('sport', ''), t.get('surface', ''), i])
# ---- v3 additions ----
data['names_latin'] = [None] * len(names)
for r in roads:
    if r['name']: data['names_latin'][nameidx[r['name']]] = latin_name(r['tg'])
data['names_latin'] = [v if v is not None else translit(n) for v, n in zip(data['names_latin'], names)]
data['roadx'] = [roadx(r) for r in roads]
data['pois'] = [poi_out(q) for q in pois]
data['carriage'] = split_tiles(carriage.intersection(context))
data['fillets'] = [ring(g.simplify(0.03)) for g in FIL]
data['junctions'] = [[R(p[0]), R(p[1]), arms, ris, 'n' + n] for n, p, arms, ris in junctions]
data['driveways'] = [[R(d[0]), R(d[1]), round(d[2], 3), round(d[3], 1)] for d in driveways]
data['addr'] = addr
data['barriers'] = barriers
data['tree_rows'] = tree_rows
data['restrictions'] = restrictions
data['seats'] = seats
data['area_tags'] = [dict(id=i, **{k2: t[k2] for k2 in ('name', 'sport', 'surface', 'access', 'parking', 'leisure', 'amenity', 'landuse', 'natural', 'capacity', 'fee') if t.get(k2)}) for k_, g, t, i in areas]
data['synthetic'] = ['street_trees (except those on tree_rows)', 'garden_trees', 'lamps', 'bollards', 'parked', 'walls', 'buildings[].levels/style/roof when untagged']
# Copernicus Urban Atlas Building Height 2012 class per building (tools/data/ua_heights.py; ORDERS 13:30). Added as buildings[i][11].ua = {cls, hM:[lo,hi], h, lv:[lo,hi], built}
UA_N = 0
try:
    _ua = json.load(open(os.path.join(ROOT, 'tools/data/src/ua_bh2012_buildings.json')))['buildings']
    for i_, rec in enumerate(data['buildings']):
        o = _ua.get(str(i_))
        if o and o.get('cls') and isinstance(rec[11], dict):
            rec[11]['ua'] = dict(cls=o['cls'], hM=o['heightRangeM'], h=o['heightM'], lv=o['levelsRange'], built=o['built']); UA_N += 1
    log('Urban Atlas 2012 height class on %d buildings' % UA_N)
except FileNotFoundError:
    log('Urban Atlas heights not available (run tools/data/ua_heights.py)')
data['meta'] = dict(generated=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), pipeline='build_map3.py',
                    projection=dict(lat0=LAT0, lon0=LON0, kx=KX, kz=KZ, note='x=(lon-lon0)*kx, z=-(lat-lat0)*kz; 1 unit = 1 m'),
                    sources=dict(osm='OpenStreetMap (ODbL) kif.osm', overture='Overture Maps places 2026-11-18 (CDLA-Permissive-2.0)' if OV else None,
                                 elevation='EU-DEM 25 m', heights=('Copernicus Urban Atlas Building Height 2012 (EEA), %d buildings' % UA_N) if UA_N else None, shops=(dict(version=SHOPSJ.get('version'), generated=SHOPSJ.get('generated'), linked=SJ_MATCH) if SHOPSJ else None), census=(CENSUS or {}).get('version') if CENSUS else None, streets=(STREETS or {}).get('version') if STREETS else None),
                    counts=dict(pois=len(pois), pois_focus=sum(1 for q in data['pois'] if q['focus']), bySrc=dict(collections.Counter(q['src'] for q in pois)), byBay=dict(bay_counts),
                                buildings=len(out_b), roads=len(roads)))
data['meta']['audit'] = dict(rules='docs/research/PLACEMENT_AUDIT.md section C: OSM-surveyed position wins; census-only shops only with a verified address, at the address, in free frontage; Overture-only never; same name within 60 m merged; closed dropped',
    overtureNotBuilt=len(OV_UNBUILT), overtureUnbuilt=[dict(id=q['id'], name=q['name'], addr=q.get('ov_addr', ''), x=r2(q['p'][0]), z=r2(q['p'][1]), conf=q['conf']) for q in OV_UNBUILT if fprep.contains(Point(q['p']))],
    censusUnbuilt=[dict(id=x['id'], name=x['name'], street=x.get('street'), number=x.get('number'), tier=x.get('tier'), x=x['x'], z=x['z'], why=x['why']) for x in CS_UNBUILT] + [dict(id=q.get('census'), name=q['name'], street=q.get('street'), number=q.get('number'), tier=q.get('tier'), x=r2(q['p'][0]), z=r2(q['p'][1]), why=q.get('why')) for q in UNBUILT_POIS],
    duplicatesMerged=DUP_MERGED, directoryBecauseEdgeFull=SQUEEZED, censusSaysClosedOsmKept=CS_CLOSED_OSM)
s = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
tmp = OUT + '.tmp'; open(tmp, 'w').write(s); json.load(open(tmp)); os.replace(tmp, OUT)
rep = dict(generated=data['meta']['generated'], overture=dict(ov_stats), census=dict(cs_stats), bays=dict(bay_counts), moved=moved, special_evidence=special_evidence, sephora=SEPHORA_SRC,
           junction=JUNCTION_INFO if cands else None,
           unplaced=[dict(id=q['id'], name=q['name'], cat=q['cat'], x=r2(q['p'][0]), z=r2(q['p'][1]), why='no street-facing building edge within 90 m') for q in unplaced],
           widths=[dict(id=r['id'], name=r['name'], ty=r['ty'], w0=round(r['w0'], 1), w=r['w'], src=r['wsrc'], clear=[None if v is None else round(v, 1) for v in r['p15']], sw=[r['swA'], r['swB']],
                        park=sorted(r.get('park', [])), L=round(r['ls'].length)) for r in car_roads if r['infocus']])
os.makedirs(os.path.dirname(REPORT), exist_ok=True); json.dump(rep, open(REPORT, 'w'), ensure_ascii=False, indent=0)
log('json size %.0f KB -> %s' % (len(s.encode()) / 1024, OUT))
