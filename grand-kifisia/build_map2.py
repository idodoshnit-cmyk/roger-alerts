"""Grand Kifisia map pipeline v2: OSM + EU-DEM -> compact JSON for the game.
Coordinates: metres, x = east, z = south, origin at Platanos square."""
import json, math, hashlib, random
import numpy as np
from shapely.geometry import Polygon, LineString, Point, MultiPolygon, MultiLineString, box, GeometryCollection
from shapely.ops import unary_union, linemerge
from shapely.strtree import STRtree
from shapely.prepared import prep
from osmload import load, P, LAT0, LON0, KX, KZ

random.seed(7)
nodes, ntags, ways, rels = load()
route = json.load(open('route.json'))
R = lambda v: int(round(v * 10))            # decimetres
def H(s): return int(hashlib.md5(str(s).encode()).hexdigest()[:8], 16)
def flat(coords):
    o = []
    for x, z in coords: o += [R(x), R(z)]
    return o

# ---------------------------------------------------------------- regions
KEY = {k: P(*v) for k, v in {
    'platanos': (38.07235, 23.8117), 'station': (38.0736082, 23.8082244), 'alsos': (38.0732871, 23.8092766),
    'kfc': (38.072797, 23.812455), 'mythos': (38.072288, 23.81336), 'super': (38.071945, 23.813146),
    'starbucks': (38.072218, 23.814301), 'paul': (38.0724018, 23.8139308), 'agora': (38.07261, 23.81644), 'goulandris': (38.0743, 23.8149),
    'kefalari': (38.0747, 23.8205), 'church': (38.07014, 23.8116)}.items()}
isa_poly = Polygon(route['isa'])
route_line = LineString(route['route'])
center = MultiPoint = unary_union([Point(KEY[k]) for k in ('platanos','station','alsos','kfc','mythos','super','starbucks','agora','goulandris')]).convex_hull.buffer(95)
focus = unary_union([center, route_line.buffer(75), isa_poly.buffer(75)]).simplify(2)
context = focus.buffer(150).simplify(4)
playable = focus.buffer(45).simplify(3)
fprep, cprep = prep(focus), prep(context)
minx, minz, maxx, maxz = context.bounds
print('focus area %.0f m2, context bbox %.0f x %.0f' % (focus.area, maxx - minx, maxz - minz))

# ---------------------------------------------------------------- terrain
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
# smooth (DEM noise) with a separable gaussian, radius ~16 m
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
print('terrain grid %dx%d, relief %.1f m (base %.1f m asl)' % (gnx, gnz, T.max(), BASE))

# ---------------------------------------------------------------- roads
RT = {'primary': 0, 'primary_link': 0, 'trunk': 0, 'secondary': 1, 'secondary_link': 1, 'tertiary': 2, 'tertiary_link': 2,
      'residential': 3, 'unclassified': 3, 'living_street': 4, 'service': 5, 'pedestrian': 6, 'footway': 7, 'path': 8,
      'track': 8, 'cycleway': 7, 'steps': 9}
DEFW = [13.0, 9.0, 7.5, 6.0, 5.0, 4.0, 6.0, 2.2, 2.0, 2.4]
SURF = {'asphalt': 0, 'paving_stones': 1, 'sett': 1, 'cobblestone': 1, 'unhewn_cobblestone': 1, 'bricks': 2, 'concrete': 3,
        'concrete:plates': 3, 'paved': 0, 'gravel': 4, 'fine_gravel': 4, 'dirt': 4, 'ground': 4, 'compacted': 4, 'unpaved': 4, 'grass': 4}
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
    lanes = tg.get('lanes'); w = DEFW[ty]
    try:
        if lanes and ty <= 4: w = max(w, float(lanes) * 3.1 + 0.6)
    except ValueError: pass
    try:
        if tg.get('width'): w = float(tg['width'].split()[0])
    except ValueError: pass
    surf = SURF.get(tg.get('surface', ''), 4 if ty == 8 else 0)
    if ty in (6, 7) and 'surface' not in tg: surf = 3
    fw = tg.get('footway', '')
    hidden = (ty == 7 and fw in ('sidewalk', 'crossing')) or tg.get('tunnel') == 'yes'
    sw = tg.get('sidewalk', tg.get('sidewalk:both', ''))
    side = {'no': 0, 'none': 0, 'separate': 0, 'left': 1, 'right': 2, 'both': 3, 'yes': 3}.get(sw, 3 if ty <= 4 else 0)
    ow = 1 if tg.get('oneway') in ('yes', '1', 'true') else (-1 if tg.get('oneway') == '-1' else 0)
    if hw in ('primary_link', 'secondary_link', 'tertiary_link') and 'oneway' not in tg: ow = 1
    ri = len(roads)
    for vi, r in enumerate(refs):
        if r in nodes: road_nodes.setdefault(r, []).append((ri, vi))
    roads.append(dict(id=wid, ty=ty, w=w, surf=surf, name=tg.get('name', ''), ow=ow, side=side, hidden=hidden,
                      pts=pts, refs=[r for r in refs if r in nodes], ls=ls, infocus=ls.intersects(focus)))
print('roads', len(roads))
car_roads = [r for r in roads if r['ty'] <= 5 and not r['hidden']]
carriage = unary_union([r['ls'].buffer(r['w'] / 2, cap_style=1, join_style=1, resolution=6) for r in car_roads])
ped_ways = [r for r in roads if r['ty'] in (6, 7, 8, 9) and not r['hidden']]
pedpaths = unary_union([r['ls'].buffer(r['w'] / 2, cap_style=1, resolution=4) for r in ped_ways]) if ped_ways else Polygon()
CENTER_STREETS = {'Κασσαβέτη', 'Λεβίδου', 'Κολοκοτρώνη', 'Κηφισίας', 'Λεωφόρος Κηφισίας', 'Αργυροπούλου', 'Παπαδιαμάντη', 'Κυριαζή',
                  'Δροσίνη', 'Μπενάκη', 'Τατοΐου', 'Κόκκινου', 'Παλαιολόγου', 'Δηληγιάννη', 'Όθωνος', 'Χαριλάου Τρικούπη'}
cprep_center = prep(center.buffer(20))
def sidewalk_w(r):
    if r['ty'] == 0: return 3.6
    if cprep_center.intersects(r['ls']): return 3.0
    return 2.2 if r['ty'] <= 3 else 1.6
sw_parts = []
for r in car_roads:
    if r['side'] == 0 or r['ty'] == 5: continue
    sw_parts.append(r['ls'].buffer(r['w'] / 2 + sidewalk_w(r), cap_style=1, join_style=1, resolution=6))
sidewalk_full = unary_union(sw_parts)
sidewalk = sidewalk_full.difference(carriage)
# ---------------------------------------------------------------- buildings
bpolys = []
def add_building(pts, tg, key):
    if len(pts) < 4: return
    try:
        poly = Polygon(pts).buffer(0)
    except Exception: return
    if poly.is_empty or poly.area < 6: return
    if poly.geom_type == 'MultiPolygon': poly = max(poly.geoms, key=lambda g: g.area)
    if not cprep.intersects(poly): return
    poly = poly.simplify(0.25, preserve_topology=True)
    bpolys.append((poly, tg, key))
for wid, (refs, tg) in ways.items():
    if 'building' in tg and refs and refs[0] == refs[-1] and tg.get('building') not in ('roof',):
        add_building([nodes[r] for r in refs if r in nodes], tg, wid)
for members, tg in rels:
    if tg.get('type') == 'multipolygon' and 'building' in tg:
        for mt, ref, role in members:
            if mt == 'way' and role == 'outer' and ref in ways and ways[ref][0][0] == ways[ref][0][-1]:
                add_building([nodes[r] for r in ways[ref][0] if r in nodes], tg, ref)
print('buildings in context', len(bpolys))
btree = STRtree([b[0] for b in bpolys])
buildings_union = unary_union([b[0] for b in bpolys])
sidewalk = sidewalk.difference(buildings_union.buffer(0.05))
road_tree = STRtree([r['ls'] for r in car_roads])

def nearest_road(p, maxd=40):
    pt = Point(p); best = None
    for i in road_tree.query(pt.buffer(maxd)):
        r = car_roads[int(i)]; d = r['ls'].distance(pt) - r['w'] / 2
        if best is None or d < best[0]: best = (d, r)
    return best

def omb_rect(poly):
    """oriented minimum bounding rectangle -> (cx, cz, L, W, angle along L)"""
    mrr = poly.minimum_rotated_rectangle
    c = list(mrr.exterior.coords)[:4]
    e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1]); e2 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
    l1, l2 = math.hypot(*e1), math.hypot(*e2)
    cx = sum(p[0] for p in c) / 4; cz = sum(p[1] for p in c) / 4
    if l1 >= l2: return cx, cz, l1, l2, math.atan2(e1[1], e1[0])
    return cx, cz, l2, l1, math.atan2(e2[1], e2[0])

special_bld = {}
def bld_at(key):
    pt = Point(KEY[key]); best = None
    for i in btree.query(pt.buffer(30)):
        poly = bpolys[int(i)][0]; d = poly.distance(pt)
        if best is None or d < best[0]: best = (d, int(i))
    return best[1] if best and best[0] < 12 else None
for k in ('agora', 'goulandris', 'station'):
    bi = bld_at(k)
    if bi is not None: special_bld[bi] = k
# station building: the building nearest the station node, west of the tracks
STATION_POLY = None

WALLS_APT = [0, 1, 2, 3, 4]        # colour indices into the game palette
WALLS_NEO = [5, 6, 7, 8, 9, 10]
WALLS_VILLA = [0, 1, 11, 12, 3]
out_b = []
for bi, (poly, tg, key) in enumerate(bpolys):
    h = H(key); A = poly.area
    detail = fprep.intersects(poly)
    btype = tg.get('building', 'yes')
    lv = tg.get('building:levels')
    try: lv = int(round(float(lv)))
    except (TypeError, ValueError): lv = None
    in_center = cprep_center.intersects(poly)
    if lv is None:
        if btype in ('house', 'detached', 'villa', 'semidetached_house'): lv = 2
        elif btype in ('garage', 'garages', 'shed', 'hut', 'kiosk'): lv = 1
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
    coords = list(poly.exterior.coords)[:-1]
    if Polygon(coords).exterior.is_ccw is False:
        pass
    # ground elevation: min over footprint
    gmin = min(terr(x, z) for x, z in coords); gmax = max(terr(x, z) for x, z in coords)
    # frontage per edge
    edges = []
    n = len(coords)
    for i in range(n):
        a, b = coords[i], coords[(i + 1) % n]
        dx, dz = b[0] - a[0], b[1] - a[1]; Le = math.hypot(dx, dz)
        if Le < 0.5: edges.append(0); continue
        mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        # outward normal: test both sides
        nx, nz = dz / Le, -dx / Le
        if poly.contains(Point(mx + nx * 0.3, mz + nz * 0.3)): nx, nz = -nx, -nz
        nr_ = nearest_road((mx + nx * 3, mz + nz * 3), 30)
        f = 0
        if nr_ and nr_[0] < 12 and Le > 2.5:
            # facing the road: road point roughly in the normal direction
            rp = nr_[1]['ls'].interpolate(nr_[1]['ls'].project(Point(mx, mz)))
            vx, vz = rp.x - mx, rp.y - mz; vl = math.hypot(vx, vz) or 1
            if (vx * nx + vz * nz) / vl > 0.55:
                f = 2 if (in_center and (nr_[1]['name'] in CENTER_STREETS or nr_[1]['ty'] <= 2) and style in ('apt', 'neo', 'shop', 'modern', 'agora')) else 1
        edges.append(f)
    out_b.append(dict(bi=bi, key=key, poly=poly, coords=coords, lv=lv, style=style, roof=roof, detail=detail, h=h,
                      gmin=gmin, gmax=gmax, edges=edges, rect=(cx, cz, L, W, ang), shops=[], name=tg.get('name', ''), center=in_center))
print('styles', {s: sum(1 for b in out_b if b['style'] == s) for s in set(b['style'] for b in out_b)})

# ---------------------------------------------------------------- POIs -> shop signs on facades
BRAND = {
    'mythos': dict(name='MYTHOS plus', bg='#141414', fg='#f2c14e', kind='food', special=True),
    'starbucks': dict(name='STARBUCKS COFFEE', bg='#00704a', fg='#ffffff', kind='cafe', special=True),
    'kfc': dict(name='KFC', bg='#c8102e', fg='#ffffff', kind='food', special=True),
    'super': dict(name='ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ', bg='#ffffff', fg='#d0021b', kind='super', special=True),
    'paul': dict(name='PAUL', bg='#141414', fg='#e8d3a0', kind='bakery', special=True),
}
KINDC = {'clothes': ('#1d1d1f', '#f5f2ea'), 'jewelry': ('#2b2118', '#e8c77d'), 'cafe': ('#3b2a20', '#f3e3c3'),
         'restaurant': ('#5a1e16', '#f6efe2'), 'fast_food': ('#b3261e', '#ffffff'), 'pharmacy': ('#ffffff', '#1a8f3c'),
         'bank': ('#0b3d91', '#ffffff'), 'beauty': ('#f4e9ea', '#7a3e48'), 'shoes': ('#222', '#fff'), 'optician': ('#fff', '#1c3f6e'),
         'bakery': ('#f2e2c4', '#6b3a1e'), 'books': ('#183a2c', '#f6efe2'), 'kiosk': ('#ffd23f', '#14213d')}
pois = []
for nid_, tg in ntags.items():
    if 'name' not in tg and 'brand' not in tg: continue
    kind = tg.get('shop') or tg.get('amenity') or tg.get('office') or tg.get('craft') or tg.get('tourism')
    if not kind or kind in ('bench', 'waste_basket', 'parking_entrance', 'recycling', 'charging_station', 'drinking_water', 'fountain',
                            'bus_station', 'taxi', 'toilets', 'parking', 'atm', 'post_box', 'telephone', 'vending_machine', 'artwork', 'kiosk'):
        continue
    p = nodes[nid_]
    if not fprep.contains(Point(p)): continue
    nm = tg.get('name:en') if tg.get('name:en') and not any('Ͱ' <= ch <= 'Ͽ' for ch in tg.get('name:en')) else tg.get('name', tg.get('brand'))
    pois.append(dict(p=p, name=nm, kind=kind))
SPECIAL_P = {'mythos': KEY['mythos'], 'starbucks': KEY['starbucks'], 'kfc': KEY['kfc'], 'super': KEY['super'], 'paul': KEY['paul']}
# drop OSM duplicates of the specials, add the specials
pois = [q for q in pois if not any(math.dist(q['p'], sp) < 6 and (q['name'] or '').lower()[:3] in ('myt', 'sta', 'kfc', 'αβ ', 'ab ', 'pau') for sp in SPECIAL_P.values())]
for k, p in SPECIAL_P.items():
    pois.insert(0, dict(p=p, name=BRAND[k]['name'], kind=BRAND[k]['kind'], special=k))
print('pois in focus', len(pois))
special_out = {}
used_slots = {}
for q in pois:
    pt = Point(q['p']); best = None
    for i in btree.query(pt.buffer(25)):
        b = out_b[int(i)]
        if not b['detail']: continue
        co = b['coords']; n = len(co)
        for ei in range(n):
            if b['edges'][ei] == 0: continue
            a, c = co[ei], co[(ei + 1) % n]
            dx, dz = c[0] - a[0], c[1] - a[1]; Le2 = dx * dx + dz * dz
            if Le2 < 9: continue
            u = max(0.0, min(1.0, ((q['p'][0] - a[0]) * dx + (q['p'][1] - a[1]) * dz) / Le2))
            d = math.dist(q['p'], (a[0] + dx * u, a[1] + dz * u))
            if best is None or d < best[0]: best = (d, int(i), ei, u, math.sqrt(Le2))
    if not best or best[0] > 22: continue
    d, bi, ei, u, Le = best
    b = out_b[bi]
    # keep signs from overlapping on one edge
    slot_w = min(7.0, max(3.0, Le * 0.8))
    taken = used_slots.setdefault((bi, ei), [])
    uu = min(max(u, slot_w / 2 / Le), 1 - slot_w / 2 / Le) if Le > slot_w else 0.5
    if any(abs(uu - t) * Le < slot_w * 0.9 for t in taken):
        alt = [t for t in (0.2, 0.5, 0.8) if all(abs(t - s) * Le >= slot_w * 0.9 for s in taken)]
        if not alt or q.get('special') is None and len(taken) >= 3: continue
        uu = alt[0]
    taken.append(uu)
    if b['edges'][ei] == 1: b['edges'][ei] = 2
    br = BRAND.get(q.get('special'), None)
    bg, fg = (br['bg'], br['fg']) if br else KINDC.get(q['kind'], ('#f6efe2', '#1d1d1f'))
    b['shops'].append([ei, round(uu, 3), (q['name'] or '')[:26], bg, fg, q.get('special') or q['kind']])
    if q.get('special'):
        co = b['coords']; a, c = co[ei], co[(ei + 1) % len(co)]
        px, pz = a[0] + (c[0] - a[0]) * uu, a[1] + (c[1] - a[1]) * uu
        dx, dz = c[0] - a[0], c[1] - a[1]; Le_ = math.hypot(dx, dz); nx, nz = dz / Le_, -dx / Le_
        if b['poly'].contains(Point(px + nx * 0.3, pz + nz * 0.3)): nx, nz = -nx, -nz
        special_out[q['special']] = dict(x=round(px, 2), z=round(pz, 2), nx=round(nx, 3), nz=round(nz, 3),
                                         door=[round(px + nx * 2.4, 2), round(pz + nz * 2.4, 2)], b=bi)
print('specials placed', list(special_out))

# ---------------------------------------------------------------- areas
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
def add_area(pts, tg):
    kind = akind(tg)
    if not kind or len(pts) < 4: return
    try: poly = Polygon(pts).buffer(0)
    except Exception: return
    if poly.is_empty: return
    poly = poly.intersection(context)
    for g in getattr(poly, 'geoms', [poly]):
        if g.geom_type == 'Polygon' and g.area > 4: areas.append((kind, g, tg))
for wid, (refs, tg) in ways.items():
    if refs and refs[0] == refs[-1] and 'building' not in tg: add_area([nodes[r] for r in refs if r in nodes], tg)
for members, tg in rels:
    if tg.get('type') == 'multipolygon' and akind(tg):
        for mt, ref, role in members:
            if mt == 'way' and role == 'outer' and ref in ways and ways[ref][0][0] == ways[ref][0][-1]:
                add_area([nodes[r] for r in ways[ref][0] if r in nodes], tg)
from shapely.ops import polygonize
plat_lines = [LineString([nodes[r] for r in refs if r in nodes]) for wid, (refs, tg) in ways.items()
              if tg.get('railway') == 'platform' and refs and refs[0] != refs[-1]]
if len(plat_lines) >= 2:
    c1 = list(plat_lines[0].coords); c2 = list(plat_lines[1].coords)
    if math.dist(c1[-1], c2[0]) > math.dist(c1[-1], c2[-1]): c2 = c2[::-1]
    pg = Polygon(c1 + c2[1:]).buffer(0)
    if pg.area > 50: areas.append(('platform', pg, {'railway': 'platform'}))
print('areas', len(areas))
plaza_union = unary_union([g for k, g, t in areas if k in ('plaza', 'platform')] + [pedpaths]) if areas else Polygon()
park_union = unary_union([g for k, g, t in areas if k in ('park', 'garden', 'grass', 'wood', 'scrub')])
school_union = unary_union([g for k, g, t in areas if k == 'school'])

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
blk = unary_union([buildings_union.buffer(1.6), carriage.buffer(0.5), pedpaths.buffer(0.8), plaza_union.buffer(0.5)])
walls = []
for ln in prop:
    seg = ln.difference(blk)
    for s in lines_of(seg):
        if s.length < 4: continue
        if not cprep.intersects(s): continue
        mid = s.interpolate(0.5, normalized=True)
        st = 'park' if park_union.buffer(4).contains(mid) else ('school' if school_union.buffer(4).contains(mid) else ('center' if cprep_center.contains(mid) else 'res'))
        # gates / driveways
        Ls = s.length; pos = 0.0
        while pos < Ls:
            run = random.uniform(14, 30) if st != 'park' else Ls
            a, b = pos, min(Ls, pos + run)
            if b - a > 2.5:
                piece = [s.interpolate(t) for t in np.linspace(a, b, max(2, int((b - a) / 3) + 1))]
                walls.append([st, flat([(p.x, p.y) for p in piece])])
            pos = b + (random.uniform(2.6, 4.0) if st != 'park' else 1e9)
print('curb lines', len(curb), 'wall runs', len(walls))

# ---------------------------------------------------------------- street furniture
def road_dir_at_node(nid_):
    for ri, vi in road_nodes.get(nid_, []):
        r = roads[ri]
        if r['hidden'] and r['ty'] != 7: pass
        pts = r['pts']
        if r['ty'] > 5: continue
        a = pts[max(0, vi - 1)]; b = pts[min(len(pts) - 1, vi + 1)]
        return math.atan2(b[1] - a[1], b[0] - a[0]), r['w']
    return None, None
props = {k: [] for k in ('crossing', 'signal', 'stop', 'bus', 'bench', 'basket', 'fountain', 'kiosk', 'tree', 'recycle')}
for nid_, tg in ntags.items():
    p = nodes[nid_]
    if not cprep.contains(Point(p)): continue
    hw = tg.get('highway'); am = tg.get('amenity')
    if hw == 'crossing' or tg.get('railway') == 'crossing':
        ang, w = road_dir_at_node(nid_)
        if ang is not None: props['crossing'].append([R(p[0]), R(p[1]), round(ang, 3), round(w, 1)])
    elif hw == 'traffic_signals':
        ang, w = road_dir_at_node(nid_)
        if ang is not None: props['signal'].append([R(p[0]), R(p[1]), round(ang, 3), round(w, 1)])
    elif hw == 'stop':
        ang, w = road_dir_at_node(nid_)
        if ang is not None: props['stop'].append([R(p[0]), R(p[1]), round(ang, 3), round(w, 1)])
    elif hw == 'bus_stop' or (tg.get('public_transport') == 'platform' and tg.get('bus') == 'yes'):
        props['bus'].append([R(p[0]), R(p[1]), (tg.get('name') or '')[:24]])
    elif am == 'bench': props['bench'].append([R(p[0]), R(p[1])])
    elif am == 'waste_basket': props['basket'].append([R(p[0]), R(p[1])])
    elif am == 'fountain' or am == 'drinking_water': props['fountain'].append([R(p[0]), R(p[1]), 1 if am == 'fountain' else 0])
    elif tg.get('shop') == 'kiosk': props['kiosk'].append([R(p[0]), R(p[1]), (tg.get('name') or '')[:20]])
    elif tg.get('natural') == 'tree': props['tree'].append([R(p[0]), R(p[1])])
    elif am == 'recycling': props['recycle'].append([R(p[0]), R(p[1])])
# de-duplicate bus stops (platform + stop nodes)
bs = []
for b in props['bus']:
    if all(math.hypot(b[0] - c[0], b[1] - c[1]) > 120 for c in bs): bs.append(b)
props['bus'] = bs
print({k: len(v) for k, v in props.items()})

# trees / lamps / bollards / parked cars along streets
occupied = unary_union([buildings_union.buffer(1.2), carriage.buffer(0.4)])
occ_prep = prep(occupied)
crossing_pts = [Point(c[0] / 10, c[1] / 10) for c in props['crossing']] + [Point(s[0] / 10, s[1] / 10) for s in props['signal']]
cross_union = unary_union([p.buffer(7) for p in crossing_pts]) if crossing_pts else Polygon()
junction_nodes = [nodes[n] for n, lst in road_nodes.items() if len({ri for ri, vi in lst if roads[ri]['ty'] <= 5}) >= 2]
junc_union = unary_union([Point(p).buffer(9) for p in junction_nodes])
avoid = prep(unary_union([cross_union, junc_union]))
street_trees, lamps, bollards, parked = [], [], [], []
for r in car_roads:
    if r['side'] == 0 or r['ty'] == 5: continue
    if not cprep.intersects(r['ls']): continue
    sww = sidewalk_w(r); ls = r['ls']; Lr = ls.length
    ctr = cprep_center.intersects(ls)
    for sd in (-1, 1):
        try:
            off = ls.parallel_offset(r['w'] / 2 + sww * 0.62, 'left' if sd > 0 else 'right', join_style=2)
        except Exception:
            continue
        for oln in lines_of(off):
            Lo = oln.length; t = random.uniform(3, 9)
            while t < Lo - 2:
                p = oln.interpolate(t)
                if not occ_prep.contains(p) and not avoid.contains(p) and cprep.contains(p) and swp.contains(p):
                    sp = 'plane' if (r['ty'] <= 2 or ctr) else ('orange' if (H(r['id']) + int(t)) % 3 else 'plane')
                    street_trees.append([R(p.x), R(p.y), sp])
                t += random.uniform(9, 15)
        try:
            off2 = ls.parallel_offset(r['w'] / 2 + 0.55, 'left' if sd > 0 else 'right', join_style=2)
        except Exception:
            continue
        for oln in lines_of(off2):
            Lo = oln.length; t = 12 if sd > 0 else 25
            while t < Lo - 3:
                p = oln.interpolate(t); q = oln.interpolate(min(Lo, t + 0.5))
                if not occ_prep.contains(p) and cprep.contains(p) and swp_b.contains(p):
                    style = 2 if r['ty'] == 0 else (0 if ctr else 1)   # 0 cast-iron lantern, 1 globe, 2 avenue
                    lamps.append([R(p.x), R(p.y), style, round(math.atan2(q.y - p.y, q.x - p.x), 2), sd])
                t += 26 if ctr else 32
            if ctr and r['ty'] >= 2 and r['w'] < 10 and fprep.intersects(oln):
                t = 2.0
                while t < Lo - 1:
                    p = oln.interpolate(t)
                    if not avoid.contains(p) and not occ_prep.contains(p) and swp_b.contains(p) and fprep.contains(p):
                        bollards.append([R(p.x), R(p.y)])
                    t += 1.7
    # parallel parking on residential / tertiary streets in focus
    if r['ty'] in (2, 3, 4) and r['w'] >= 5.5 and fprep.intersects(ls):
        for sd in ((1,) if r['ow'] else (-1, 1)):
            try:
                off = ls.parallel_offset(r['w'] / 2 - 1.1, 'left' if sd > 0 else 'right', join_style=2)
            except Exception:
                continue
            for oln in lines_of(off):
                Lo = oln.length; t = 8.0
                while t < Lo - 8:
                    p = oln.interpolate(t); q = oln.interpolate(t + 1)
                    if random.random() < 0.55 and not avoid.contains(p) and fprep.contains(p) and not buildings_union.contains(p):
                        parked.append([R(p.x), R(p.y), round(math.atan2(q.y - p.y, q.x - p.x), 3)])
                    t += 5.6
print('street trees', len(street_trees), 'lamps', len(lamps), 'bollards', len(bollards), 'parked', len(parked))

# garden / park trees (sampled in open land)
free_land = context.difference(unary_union([buildings_union.buffer(2.0), carriage.buffer(1.0), sidewalk_full.buffer(0.5), plaza_union, pedpaths.buffer(1.0)]))
fl_prep = prep(free_land); park_prep = prep(park_union)
garden_trees = []
bx0, bz0, bx1, bz1 = context.bounds
tries = 0
while len(garden_trees) < 3600 and tries < 90000:
    tries += 1
    x, z = random.uniform(bx0, bx1), random.uniform(bz0, bz1); p = Point(x, z)
    if not fl_prep.contains(p): continue
    inpark = park_prep.contains(p)
    infocus = fprep.contains(p)
    if not inpark and random.random() < (0.35 if infocus else 0.75): continue
    sp = random.choice(['pine', 'pine', 'cypress', 'cypress', 'plane', 'olive', 'palm', 'orange', 'cedar']) if not inpark else random.choice(['pine', 'pine', 'cedar', 'cypress', 'plane', 'plane', 'palm'])
    garden_trees.append([R(x), R(z), sp])
print('garden trees', len(garden_trees))

# ---------------------------------------------------------------- rail / station
rail = []
for wid, (refs, tg) in ways.items():
    if tg.get('railway') in ('subway', 'rail', 'light_rail') and tg.get('service') not in ('yard',):
        pts = [nodes[r] for r in refs if r in nodes]
        if len(pts) > 1 and LineString(pts).intersects(context): rail.append(flat(pts))
station_node = KEY['station']
platforms = [g for k, g, t in areas if k == 'platform']
bz_ = [b for b in out_b if b['style']=='church']
station_bld = None
for b in out_b:
    if b['poly'].distance(Point(station_node)) < 25 and b['poly'].area < 900:
        if station_bld is None or b['poly'].distance(Point(station_node)) < station_bld['poly'].distance(Point(station_node)): station_bld = b
if station_bld: station_bld['style'] = 'station'; station_bld['lv'] = 1; station_bld['roof'] = 'flat'
print('station building', station_bld['coords'][:2] if station_bld else None, 'platforms', len(platforms))

# train path: from the north end of the platform track southwards
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
print('train path', len(train_path), 'pts, length %.0f m' % LineString(train_path).length, train_path[0], train_path[-1])
oc = []
for c in curb:
    if c.length < 0.6: continue
    co = list(c.coords)
    a, b = co[0], co[1]; dx, dz = b[0] - a[0], b[1] - a[1]; L_ = math.hypot(dx, dz) or 1
    mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    # right of travel direction (x east, z south): (-dz, dx)
    if not carriage.contains(Point(mx - dz / L_ * 0.5, mz + dx / L_ * 0.5)): co = co[::-1]
    oc.append(co)
# ---------------------------------------------------------------- write
def ring(poly):
    c = list(poly.exterior.coords)[:-1]
    return flat(c)
def poly_out(g):
    return [ring(g)] + [flat(list(h.coords)[:-1]) for h in g.interiors]
# tile-split sidewalks for triangulation
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
sw_tiles = split_tiles(sw_focus.intersection(context))
car_tiles = None
data = dict(
    v=2, origin=[LAT0, LON0], base=round(BASE, 2),
    bounds=[round(v, 1) for v in context.bounds],
    terrain=dict(x0=gx0, z0=gz0, step=TG, nx=gnx, nz=gnz, h=[int(round(v * 100)) for v in T.flatten()]),
    focus=[ring(g) for g in getattr(focus, 'geoms', [focus])],
    playable=[ring(g) for g in getattr(playable, 'geoms', [playable])],
    names=names,
    roads=[[r['ty'], nid(r['name']), r['ow'], round(r['w'], 1), r['surf'], r['side'] if not r['hidden'] else -1,
            round(sidewalk_w(r), 1) if r['ty'] <= 4 else 0, 1 if r['infocus'] else 0] + flat(r['pts']) for r in roads],
    sidewalks=sw_tiles,
    curbs=[flat(c) for c in oc],
    train=flat(train_path),
    walls=walls,
    buildings=[[R(b['gmin']), b['lv'], b['style'], b['roof'], 1 if b['detail'] else 0, b['h'] % 997,
                [round(v, 2) for v in b['rect']], b['edges'], b['shops'], b['name'][:30], flat(b['coords'])] for b in out_b],
    areas=[[k, poly_out(g)] for k, g, t in areas],
    rail=rail,
    props=props, street_trees=street_trees, garden_trees=garden_trees, lamps=lamps, bollards=bollards, parked=parked,
    pitches=[], special=special_out,
    key={k: [round(v[0], 1), round(v[1], 1)] for k, v in KEY.items()},
    isa=dict(poly=flat(list(isa_poly.exterior.coords)[:-1]), gate=[round(v, 1) for v in route['route'][-1]]),
    route=flat(route['route']),
)
# pitches with oriented rects
for k, g, t in areas:
    if k == 'pitch':
        cx, cz, L, W, ang = omb_rect(g)
        data['pitches'].append([round(cx, 1), round(cz, 1), round(L, 1), round(W, 1), round(ang, 3), t.get('sport', '')])
s = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
open('gk2/kifisia_map.json', 'w').write(s)
print('json size %.0f KB' % (len(s.encode()) / 1024))
