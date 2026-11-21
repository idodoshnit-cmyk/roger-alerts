#!/usr/bin/env python3
"""Grand Kifisia - SHOP PLACEMENT AUDIT (team:data, OWNER_BRIEF 16).

Compares every shop sign the GAME actually built (runtime dump, tools/data/dump_signs.js) with the REAL shops:
  * OSM-surveyed shop nodes/areas, re-read from the raw kif.osm and re-projected independently of the pipeline;
  * census entries with a verified address (research-census, gk3/data/census.json) for the shops OSM does not have.

Usage: python3 tools/data/placement_audit.py SIGNS.json MAP.json OUT_PREFIX [--title T]
Writes OUT_PREFIX.md (per-street tables: game order vs real order), OUT_PREFIX.png (top-down overlay) and OUT_PREFIX.json (numbers).

Delta of an OSM shop = distance between its game sign BAY (the shopfront segment, 0 when the bay covers the point) and the OSM point projected onto the facade it belongs to
(the street-facing edge of the building that contains it, else the nearest building edge on the same side of its street).
"""
import json, math, re, sys, unicodedata, collections, xml.etree.ElementTree as ET
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import linemerge, unary_union
from shapely.strtree import STRtree

ROOT = '/tmp/claude-0/-home-user-roger-alerts/1b3b0d86-8923-5c5e-87ff-3268c67302f8/scratchpad'
LAT0, LON0, KX, KZ = 38.0727, 23.8125, 87716.0, 110998.0
def P(lat, lon): return ((lon - LON0) * KX, -(lat - LAT0) * KZ)
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SIGNS, MAPF, OUT = args[0], args[1], args[2]
TITLE = sys.argv[sys.argv.index('--title') + 1] if '--title' in sys.argv else OUT.split('/')[-1]
D = json.load(open(SIGNS)); M = json.load(open(MAPF))
signs = D.get('signs', [])
names = M['names']

def strip_acc(s): return ''.join(c for c in unicodedata.normalize('NFD', s or '') if unicodedata.category(c) != 'Mn')
def norm(s): return re.sub(r'[^0-9a-zα-ω]', '', strip_acc(s).lower().replace('ς', 'σ'))

# ---------------- raw OSM shops (independent re-projection) ----------------
SHOP_AMEN = {'restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'ice_cream', 'pharmacy', 'bank', 'bureau_de_change', 'cinema', 'nightclub', 'post_office', 'clinic', 'dentist', 'doctors'}
tree = ET.parse(ROOT + '/kif.osm').getroot()
nodes = {}
osm_shops = []
for n in tree.iter('node'):
    nid = n.get('id'); lat = float(n.get('lat')); lon = float(n.get('lon')); nodes[nid] = (lat, lon)
    tg = {t.get('k'): t.get('v') for t in n.iter('tag')}
    if 'shop' in tg or tg.get('amenity') in SHOP_AMEN or tg.get('healthcare') == 'pharmacy':
        osm_shops.append(dict(id='n' + nid, p=P(lat, lon), name=tg.get('name') or tg.get('brand') or '', tags=tg))
for w in tree.iter('way'):
    tg = {t.get('k'): t.get('v') for t in w.iter('tag')}
    if not ('shop' in tg or tg.get('amenity') in SHOP_AMEN): continue
    pts = [P(*nodes[nd.get('ref')]) for nd in w.iter('nd') if nd.get('ref') in nodes]
    if len(pts) < 3: continue
    c = Polygon(pts).representative_point()
    osm_shops.append(dict(id='w' + w.get('id'), p=(c.x, c.y), name=tg.get('name') or tg.get('brand') or '', tags=tg))
focus = unary_union([Polygon([(r[i] / 10, r[i + 1] / 10) for i in range(0, len(r) - 1, 2)]).buffer(0) for r in M['focus']])
osm_shops = [s for s in osm_shops if focus.contains(Point(s['p']))]

# ---------------- buildings and roads from the map ----------------
def unflat(a): return [(a[i] / 10, a[i + 1] / 10) for i in range(0, len(a) - 1, 2)]
B = []
for i, b in enumerate(M['buildings']):
    co = unflat(b[10])
    if len(co) >= 3:
        try: B.append((i, Polygon(co), co, b[7]))
        except Exception: pass
btree = STRtree([x[1] for x in B])
roads = collections.defaultdict(list)
for r in M['roads']:
    if r[1] >= 0 and r[0] <= 7:
        roads[names[r[1]]].append(LineString(unflat(r[8:])))

STREETS = [('Kassaveti', 'Κασσαβέτη'), ('Levidou', 'Λεβίδου'), ('Kyriazi', 'Κυριαζή'), ('Kolokotroni', 'Κολοκοτρώνη'), ('Kifisias Ave', 'Κηφισίας'),
           ('Platanos square', 'Πλατεία Πλατάνου'), ('Argyropoulou', 'Αργυροπούλου')]
class Street:
    def __init__(s, lat, gr):
        s.lat, s.gr = lat, gr
        ls = roads.get(gr, [])
        u = unary_union(ls) if ls else None
        m = (u if u.geom_type == 'LineString' else linemerge(u)) if u is not None else None
        s.parts = list(m.geoms) if m is not None and m.geom_type == 'MultiLineString' else ([m] if m is not None else [])
        s.geom = unary_union(ls) if ls else None
        pts = [c for l in ls for c in l.coords]
        if pts:
            mx = sum(p[0] for p in pts) / len(pts); mz = sum(p[1] for p in pts) / len(pts)
            sxx = sum((p[0] - mx) ** 2 for p in pts); szz = sum((p[1] - mz) ** 2 for p in pts); sxz = sum((p[0] - mx) * (p[1] - mz) for p in pts)
            th = 0.5 * math.atan2(2 * sxz, sxx - szz); s.ax = (math.cos(th), math.sin(th)); s.c = (mx, mz)
            # orient the axis west->east or north->south for readable chainage
            if abs(s.ax[0]) >= abs(s.ax[1]):
                if s.ax[0] < 0: s.ax = (-s.ax[0], -s.ax[1])
            elif s.ax[1] < 0: s.ax = (-s.ax[0], -s.ax[1])
            ns = abs(s.ax[1]) > abs(s.ax[0])
            s.sides = ('E', 'W') if ns else ('N', 'S')
    def dist(s, p): return s.geom.distance(Point(p)) if s.geom is not None else 1e9
    def chain(s, p): return (p[0] - s.c[0]) * s.ax[0] + (p[1] - s.c[1]) * s.ax[1]
    def side(s, p):
        """compass side of p relative to the nearest piece of the street (local direction oriented like the axis)"""
        best = None
        for l in s.parts:
            d = l.distance(Point(p))
            if best is None or d < best[0]: best = (d, l)
        l = best[1]; t = l.project(Point(p)); a = l.interpolate(max(0, t - 2)); c = l.interpolate(min(l.length, t + 2))
        dx, dz = c.x - a.x, c.y - a.y
        if dx * s.ax[0] + dz * s.ax[1] < 0: dx, dz = -dx, -dz
        cr = dx * (p[1] - a.y) - dz * (p[0] - a.x)     # >0: right of the direction of travel in x-east/z-south coords
        # axis E-W (travel east): right = south ; axis N-S (travel south): right = west
        if s.sides == ('N', 'S'): return 'S' if cr > 0 else 'N'
        return 'W' if cr > 0 else 'E'
ST = [Street(a, b) for a, b in STREETS]
def street_of(p, normal=None, maxd=22.0, pref=None):
    best = None
    for s in ST:
        if s.geom is None: continue
        d = s.dist(p)
        if pref and norm(pref).replace('leoforos', '') and norm(s.gr) in norm(pref): d -= 6
        if normal is not None:
            q = s.geom.interpolate(s.geom.project(Point(p))) if s.geom.geom_type == 'LineString' else min((l.interpolate(l.project(Point(p))) for l in s.parts), key=lambda g: g.distance(Point(p)))
            if (q.x - p[0]) * normal[0] + (q.y - p[1]) * normal[1] < 0: continue   # sign faces away from this street
        if d < maxd and (best is None or d < best[0]): best = (d, s)
    return best[1] if best else None

ALLW = [LineString(unflat(r[8:])) for r in M['roads']]; wtree = STRtree(ALLW)
def courtyard_ok(f, nx, nz, poly, d):
    if d > 4.0: return False
    if poly.contains(Point(f[0] + nx * 0.5, f[1] + nz * 0.5)): nx, nz = -nx, -nz      # outward normal
    for k in (1.5, 3.0, 5.0):
        pt = Point(f[0] + nx * k, f[1] + nz * k)
        if any(B[int(j)][1].contains(pt) for j in btree.query(pt)): return False
    pt = Point(f[0] + nx * 3, f[1] + nz * 3)
    return any(ALLW[int(j)].distance(pt) < 12 for j in wtree.query(pt.buffer(12)))
def facade_point(p, street=None):
    """OSM point -> nearest facade point: an edge of the building that contains it, else the nearest building edge within 25 m on the same side of its street"""
    pt = Point(p); inside = None
    for k in btree.query(pt):
        if B[int(k)][1].contains(pt): inside = int(k); break
    cands = [inside] if inside is not None else [int(k) for k in btree.query(pt.buffer(25))]
    best = None
    sd = street.side(p) if street is not None and street.dist(p) > 1.0 else None
    for k in cands:
        i, poly, co, fr = B[k]
        for e in range(len(co)):
            a, c = co[e], co[(e + 1) % len(co)]
            L = math.dist(a, c)
            if L < 1.5: continue
            u = max(0, min(1, ((p[0] - a[0]) * (c[0] - a[0]) + (p[1] - a[1]) * (c[1] - a[1])) / (L * L)))
            f = (a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u)
            d = math.dist(p, f)
            pen = 0
            if street is not None and inside is None:
                if sd and street.dist(f) > 1.0 and street.side(f) != sd: pen += 40     # never across its street
            if fr and e < len(fr) and fr[e] == 0:                                        # courtyard/arcade edge: only a real, open, reachable frontage near the point
                if not courtyard_ok(f, (c[1] - a[1]) / L, -(c[0] - a[0]) / L, poly, d): continue
                pen += 3
            if best is None or d + pen < best[0]: best = (d + pen, f, i)
    return (best[1], best[2], inside is not None and B[inside][0]) if best else (p, None, None)

# ---------------- link signs to OSM ----------------
pmap = {q['id']: q for q in M.get('pois', [])}
def osm_of(sid):
    q = pmap.get(sid) or {}
    ids = []
    for v in [sid, q.get('osm')] + list(q.get('also', [])):
        m = re.match(r'^osm:([nw])(\d+)', str(v or ''))
        if m: ids.append(m.group(1) + m.group(2))
    return ids
sign_by_osm = {}
for s in signs:
    for o in osm_of(s.get('id')): sign_by_osm.setdefault(o, s)
def src_of(s):
    sid = s.get('id') or ''
    if sid.startswith('osm:') or osm_of(sid): return 'osm'
    if sid.startswith('special:'): return 'address'
    if sid.startswith('ov:'): return 'overture'
    if sid.startswith('cs:'): return 'census'
    return s.get('src') or '?'

rows = []
for o in osm_shops:
    s = sign_by_osm.get(o['id'])
    st = street_of(o['p'], pref=o['tags'].get('addr:street'), maxd=35)
    f, fb, inb = facade_point(o['p'], st)
    r = dict(id=o['id'], name=o['name'], p=o['p'], f=f, street=st.lat if st else None, number=o['tags'].get('addr:housenumber', ''), cat=o['tags'].get('shop') or o['tags'].get('amenity'))
    if s:
        r['sign'] = (s['x'], s['z']); r['b_sign'] = s['b']; r['b_real'] = fb
        ux, uz = -(s.get('nz') or 0), (s.get('nx') or 0); hw = (s.get('w') or 0) / 2
        seg = LineString([(s['x'] - ux * hw, s['z'] - uz * hw), (s['x'] + ux * hw, s['z'] + uz * hw)]) if hw > 0 else Point(s['x'], s['z'])
        r['delta'] = seg.distance(Point(f)); r['dcentre'] = math.dist(f, r['sign'])     # delta = real facade point -> nearest point of the game bay
        if st and st.dist(o['p']) > 1.0 and st.dist(r['sign']) > 1.0:
            r['wrong_side'] = st.side(f) != st.side(r['sign'])
    else:
        r['delta'] = None
        q = next((q for q in M.get('pois', []) if q['id'] == 'osm:' + o['id'] or q.get('osm') == 'osm:' + o['id'] or ('osm:' + o['id']) in q.get('also', []) or ('osm:' + o['id']) in q.get('dups', [])), None)
        r['bay'] = (q.get('bay') + (' (merged duplicate)' if ('osm:' + o['id']) in q.get('dups', []) else '')) if q else 'not in map'
    rows.append(r)

def bucket(d, r=None):
    if d is None: return 'no sign: ' + (r.get('bay', '?') if r else '?')
    return '<=2 m' if d <= 2 else '2-4 m' if d <= 4 else '4-10 m' if d <= 10 else '>10 m'
summ = collections.Counter(bucket(r['delta'], r) for r in rows)
named = [r for r in rows if r['name']]
summ_named = collections.Counter(bucket(r['delta'], r) for r in named)
wrong_side = [r for r in rows if r.get('wrong_side')]
src_cnt = collections.Counter(src_of(s) for s in signs if s.get('kind', 'shop') != 'building')

# ---------------- per-street tables ----------------
def fmt(v): return '%.1f' % v
md = ['## %s' % TITLE, '',
      'Signs built by the game: **%d** (by source: %s). OSM shop/amenity objects in the focus area: **%d** (%d named).' % (len(signs), ', '.join('%s %d' % kv for kv in src_cnt.most_common()), len(rows), len(named)),
      '', '| OSM shop -> game sign delta | all | named |', '|---|---|---|']
for k in ['<=2 m', '2-4 m', '4-10 m', '>10 m'] + sorted(k for k in summ if k.startswith('no sign')):
    md.append('| %s | %d | %d |' % (k, summ[k], summ_named[k]))
md += ['', 'Signs on the wrong side of their street (vs the OSM point): **%d**.' % len(wrong_side), '']
per_street = {}
for s_ in ST:
    gs = []
    for s in signs:
        st = street_of((s['x'], s['z']), (s['nx'], s['nz']) if (s.get('nx') or s.get('nz')) else None)
        if st is s_: gs.append(s)
    rs = [r for r in rows if r['street'] == s_.lat and r['name']]
    gs.sort(key=lambda s: s_.chain((s['x'], s['z']))); rs.sort(key=lambda r: s_.chain(r['f']))
    per_street[s_.lat] = dict(game=len(gs), real=len(rs))
    md += ['### %s (%s)' % (s_.lat, s_.gr), '',
           'Chainage m = position along the street (%s); side = compass side. Game: %d signs. Real (OSM-surveyed, named): %d.' % ('west->east' if s_.sides == ('N', 'S') else 'north->south', len(gs), len(rs)), '',
           '**GAME (street order)**', '', '| m | side | no. | sign | source | x | z | delta to OSM m |', '|---|---|---|---|---|---|---|---|']
    for s in gs:
        p = (s['x'], s['z']); ids = osm_of(s.get('id'))
        dl = next((r['delta'] for r in rows if r['id'] in ids and r.get('delta') is not None), None)
        md.append('| %s | %s | %s | %s | %s | %s | %s | %s |' % (fmt(s_.chain(p)), s_.side(p) if s_.dist(p) > 1 else '-', s.get('number') or (pmap.get(s.get('id')) or {}).get('number', '') or '',
                                                             (s['name'] or '').replace('|', '/'), src_of(s), fmt(s['x']), fmt(s['z']), fmt(dl) if dl is not None else ''))
    md += ['', '**REAL (OSM-surveyed points, street order)**', '', '| m | side | no. | name | OSM | x | z | game delta m |', '|---|---|---|---|---|---|---|---|']
    for r in rs:
        md.append('| %s | %s | %s | %s | %s | %s | %s | %s |' % (fmt(s_.chain(r['f'])), s_.side(r['f']) if s_.dist(r['f']) > 1 else '-', r['number'], r['name'].replace('|', '/'), r['id'],
                                                             fmt(r['f'][0]), fmt(r['f'][1]), ('no sign: ' + r.get('bay', '?')) if r['delta'] is None else fmt(r['delta']) + (' WRONG SIDE' if r.get('wrong_side') else '')))
    md.append('')
big = sorted([r for r in rows if r['delta'] is not None and r['delta'] > 4], key=lambda r: -r['delta'])
md += ['### OSM shops whose game sign is more than 4 m from the real facade point', '', '| OSM | name | street | delta m | real facade x,z | game sign x,z |', '|---|---|---|---|---|---|']
for r in big:
    md.append('| %s | %s | %s | %.1f | %.1f, %.1f | %.1f, %.1f |' % (r['id'], r['name'].replace('|', '/'), r['street'] or '', r['delta'], r['f'][0], r['f'][1], r['sign'][0], r['sign'][1]))
open(OUT + '.md', 'w').write('\n'.join(md) + '\n')
json.dump(dict(title=TITLE, signs=len(signs), bySource=src_cnt, osm=len(rows), osmNamed=len(named), delta=summ, deltaNamed=summ_named, wrongSide=len(wrong_side),
               over4=[dict(id=r['id'], name=r['name'], d=round(r['delta'], 1)) for r in big], streets=per_street,
               noSign=[dict(id=r['id'], name=r['name'], x=round(r['p'][0], 1), z=round(r['p'][1], 1)) for r in rows if r['delta'] is None and r['name']]), open(OUT + '.json', 'w'), ensure_ascii=False, indent=0)

# ---------------- overlay image ----------------
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection, LineCollection
VIEWS = [('centre', (-120, 330, -130, 160)), ('east', (200, 470, -140, 90)), ('kifisias', (-130, 60, -280, 140))]
for vname, (x0, x1, z0, z1) in VIEWS:
    fig = plt.figure(figsize=((x1 - x0) / 18, (z1 - z0) / 18), dpi=110); ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(x0, x1); ax.set_ylim(z1, z0); ax.set_aspect('equal'); ax.axis('off')
    ax.add_collection(PolyCollection([co for i, poly, co, fr in B], facecolor='#d9d4cc', edgecolor='#8a847a', linewidths=0.4))
    segs = [list(l.coords) for s in roads.values() for l in s]
    ax.add_collection(LineCollection([list(LineString(unflat(r[8:])).coords) for r in M['roads'] if r[0] <= 6], colors='#ffffff', linewidths=3.2, zorder=1))
    for s_ in ST:
        for l in s_.parts: ax.plot(*zip(*l.coords), color='#c8b98a', lw=1.2, zorder=2)
    for s in signs:
        c = {'osm': '#d0021b', 'address': '#d0021b', 'overture': '#ff9900', 'census': '#8e44ad'}.get(src_of(s), '#555')
        w = max(1.2, s.get('w') or 3); ux, uz = -(s.get('nz') or 0), (s.get('nx') or 0)
        ax.plot([s['x'] - ux * w / 2, s['x'] + ux * w / 2], [s['z'] - uz * w / 2, s['z'] + uz * w / 2], color=c, lw=2.2, zorder=4, solid_capstyle='butt')
    for r in rows:
        ax.plot(r['p'][0], r['p'][1], 'o', ms=2.6, color='#0057d9', zorder=5)
        if r['delta'] is None:
            ax.plot(r['f'][0], r['f'][1], 'o', ms=6, mfc='none', mec='#0057d9', mew=0.9, zorder=5)
        elif r['delta'] > 4:
            ax.plot([r['f'][0], r['sign'][0]], [r['f'][1], r['sign'][1]], '-', color='#00b050', lw=1.3, zorder=6)
            ax.text(r['sign'][0], r['sign'][1], '%.0f' % r['delta'], fontsize=5, color='#006b30', zorder=7)
    for s in signs:
        if s.get('special') or (s['name'] and len(s['name']) < 18 and x0 < s['x'] < x1 and z0 < s['z'] < z1 and src_of(s) == 'osm'):
            ax.text(s['x'] + 0.6, s['z'] - 0.6, s['name'], fontsize=3.6, color='#5a0010', zorder=8)
    ax.text(x0 + 4, z0 + 8, TITLE + '  |  red = game sign from OSM, orange = Overture, purple = census, blue dot = OSM shop point, blue ring = OSM shop without sign, green line = delta > 4 m',
            fontsize=7, color='#222', zorder=9, bbox=dict(fc='white', ec='none', alpha=0.85))
    fig.savefig(OUT + ('' if vname == 'centre' else '_' + vname) + '.png'); plt.close(fig)
print('signs', len(signs), dict(src_cnt), '| osm', len(rows), dict(summ), '| named', dict(summ_named), '| wrong side', len(wrong_side), '| streets', per_street)
