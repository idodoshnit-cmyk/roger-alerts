"""SHOP PLACEMENT AUDIT (ORDERS item 16) — research-census.
Compares every shop sign the GAME draws (MAP.pois facade points in gk3/kifisia_map.json) with the REAL position:
  * OSM-surveyed nodes/ways (truth = the surveyed point, carried to its own facade), and
  * census entries with a VERIFIED address (tier A, street + number, two independent listings or web/vrisko),
    positioned by the house-number geocoder (addr.py, odd/even sides), carried to the facade.
Outputs: gk3/data/placement_audit.json (machine readable, per POI verdict + truth facade), docs/research/img/placement/*.png,
         work/research-census/placement/audit_tables.json (for 10_placement_report.py).
Usage: python3 tools/census/09_placement_audit.py [map.json] [--out=audit.json]
"""
import sys, os, json, math, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from addr import build_model
from shapely.geometry import Point, Polygon, LineString
from shapely.strtree import STRtree

ARGS = [a for a in sys.argv[1:] if not a.startswith('--out=')]
OUTJ = next((a[6:] for a in sys.argv[1:] if a.startswith('--out=')), None)   # --out=path: write the audit there instead of gk3/data/placement_audit.json (tables not written)
MAPF = ARGS[0] if ARGS else os.path.join(ROOT, 'gk3', 'kifisia_map.json')
OUTD = os.path.join(WORK, 'placement'); os.makedirs(OUTD, exist_ok=True)
IMGD = os.path.join(ROOT, 'docs', 'research', 'img', 'placement'); os.makedirs(IMGD, exist_ok=True)
STREETS = ['Κασσαβέτη', 'Λεβίδου', 'Κυριαζή', 'Κολοκοτρώνη', 'Κηφισίας', 'Πλατεία Πλατάνου', 'Αργυροπούλου', 'Όθωνος', 'Δηληγιάννη']
TOL = 4.0

AM = build_model()
M = json.load(open(MAPF, encoding='utf-8'))
C = json.load(open(os.path.join(ROOT, 'gk3', 'data', 'census.json'), encoding='utf-8'))
OSMP = json.load(open(os.path.join(WORK, 'osm_pois.json'), encoding='utf-8'))
names = M['names']

# ---------------- buildings ----------------
B = []  # (poly, coords, setb, fs)
for i, b in enumerate(M['buildings']):
    c = unp(b[10]); ex = b[11] if len(b) > 11 and isinstance(b[11], dict) else {}
    try:
        pg = Polygon(c)
        if not pg.is_valid: pg = pg.buffer(0)
    except Exception:
        pg = None
    B.append((pg, c, ex.get('setb') or [], ex.get('fs') or []))
bidx = [i for i, b in enumerate(B) if b[0] is not None and not b[0].is_empty]
btree = STRtree([B[i][0] for i in bidx])

def street_of_fs(fs):
    if fs is None or fs < 0 or fs >= len(names): return None
    return AM.street(names[fs]) or names[fs]

def facade_of(x, z, street=None, maxd=15.0):
    """Truth facade: the street-facing edge (setb>=0) of the building that contains the point (or the nearest building within maxd),
    preferring edges that face `street`. Returns dict(b, e, t, fx, fz, dist) or None."""
    p = Point(x, z)
    cands = []
    for k in btree.query(p.buffer(maxd)):
        i = bidx[k]; pg = B[i][0]
        d = pg.distance(p)
        if d <= maxd: cands.append((d, i))
    if not cands: return None
    cands.sort()
    inside = [i for d, i in cands if d == 0]
    blds = inside[:1] if inside else [i for d, i in cands if d <= cands[0][0] + 3.0][:3]
    best = None
    for i in blds:
        pg, c, setb, fs = B[i]
        n = len(c)
        for e in range(n):
            if e < len(setb) and setb[e] is not None and setb[e] < 0: continue
            if not setb: continue
            a = c[e]; b2 = c[(e + 1) % n]
            L = math.hypot(b2[0] - a[0], b2[1] - a[1])
            if L < 1.0: continue
            t = ((x - a[0]) * (b2[0] - a[0]) + (z - a[1]) * (b2[1] - a[1])) / (L * L)
            t = max(0.02, min(0.98, t))
            fx, fz = a[0] + t * (b2[0] - a[0]), a[1] + t * (b2[1] - a[1])
            d = math.hypot(fx - x, fz - z)
            st = street_of_fs(fs[e] if e < len(fs) else -1)
            pen = d + (0 if (street and st == street) else (12 if street else 0)) + (0 if i in inside else cands[[j for _, j in cands].index(i)][0])
            if best is None or pen < best[0]:
                best = (pen, dict(b=i, e=e, t=round(t, 4), fx=round(fx, 2), fz=round(fz, 2), dist=round(d, 1), faces=st))
    return best[1] if best else None

def side_info(street, x, z):
    if street not in AM.axis: return None
    s, d, side = AM.project(street, x, z)
    Mo = AM.models.get(street) or {}
    par = None
    if Mo.get('ok'):
        par = 'odd' if Mo['side'][1] == side else 'even'
    ax = AM.axis[street]
    q = ax.interpolate(s)
    nx, nz = x - q.x, z - q.y
    ang = math.degrees(math.atan2(-nz, nx))  # 0 = east, 90 = north
    comp = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][int(((ang + 22.5) % 360) // 45)]
    return dict(s=round(s, 1), d=round(d, 1), side=side, parity=par, compass=comp)

# ---------------- census index ----------------
cen = {p['id']: p for p in C['places']}
cen_by_osm = {}
for p in C['places']:
    if p.get('osm'): cen_by_osm[p['osm']] = p
osm_by_id = {o['osm']: o for o in OSMP}
cen_by_ov = {}
for p in C['places']:
    for s_ in p.get('sources', []):
        m_ = re.match(r'overture:([0-9a-f-]{36})', s_)
        if m_: cen_by_ov[m_.group(1)] = p

def osm_key(pid):
    m = re.match(r'osm:([nwr])(\d+)', pid or '')
    if not m: return None
    return {'n': 'node', 'w': 'way', 'r': 'relation'}[m.group(1)] + '/' + m.group(2)

INDEP = {'fsq', 'overture', 'vrisko', 'web'}
def verified(p):
    """address verified = tier A, street+number, and (web/vrisko listing or >= 2 independent datasets)."""
    if not p or p.get('tier') != 'A' or not p.get('street') or not p.get('number'): return False
    src = {s.split(':')[0] for s in p.get('sources', [])}
    return bool(src & {'web', 'vrisko'}) or len(src & INDEP) >= 2

def num_of(p):
    m = re.match(r'\d+', str(p.get('number') or ''))
    return int(m.group(0)) if m else None

# ---------------- game signs ----------------
pois = M['pois']
G = []
for qi, q in enumerate(pois):
    if not q.get('focus'): continue
    if q.get('bay') not in ('shop', 'plate', 'directory', 'building', 'standalone'): continue
    fx = q.get('fx', q['x']); fz = q.get('fz', q['z'])
    if q.get('bay') == 'directory' and q.get('door'): fx, fz = q['door']
    G.append(dict(qi=qi, id=q['id'], name=q.get('name') or q.get('cat'), nameLatin=q.get('nameLatin'), cat=q.get('cat'), src=q.get('src'), bay=q.get('bay'),
                  x=q['x'], z=q['z'], fx=fx, fz=fz, b=q.get('b'), e=q.get('e'), t=q.get('t'), w=q.get('w', 0), facing=street_of_fs(q.get('facing', -1)),
                  street=AM.street(q.get('street')) if q.get('street') else None, number=q.get('number'), census=q.get('census'), tier=q.get('tier'), special=q.get('special')))

# ---------------- truth per game sign ----------------
used_cen = set(); used_osm = set()
for g in G:
    ok_ = osm_key(g['id'])
    cp = cen.get(g['census']) if g['census'] else None
    if not cp and g['id'].startswith('ov:'): cp = cen_by_ov.get(g['id'][3:])
    if not cp and g['id'].startswith('cs:'): cp = cen.get(g['id'][3:])
    if not ok_ and cp and cp.get('osm'): ok_ = cp['osm']
    if not cp and ok_: cp = cen_by_osm.get(ok_)
    g['osm'] = ok_
    if cp: used_cen.add(cp['id'])
    if ok_: used_osm.add(ok_)
    g['cen'] = cp['id'] if cp else None
    g['cenTier'] = cp.get('tier') if cp else None
    g['open'] = cp.get('open') if cp else None
    truth = None
    if ok_:
        o = osm_by_id.get(ok_)
        if g['src'] == 'osm' or g['id'].startswith('osm:'):
            tx, tz = g['x'], g['z']   # raw surveyed point carried in the map
        elif o:
            tx, tz = o['x'], o['y'] if 'y' in o else o['z']
        elif cp:
            tx, tz = cp['x'], cp['z']
        else:
            tx, tz = g['x'], g['z']
        st = AM.street(o.get('street')) if o and o.get('street') else (AM.street(cp.get('street')) if cp and cp.get('street') else None)
        truth = dict(kind='osm', x=tx, z=tz, street=st, number=(o.get('number') if o else None) or (cp.get('number') if cp else None), err=3.0)
    elif cp and cp.get('tier') in ('A', 'B'):
        # truth = the census best position NOW (OSM > house-number geocode > Foursquare > Overture), with its error estimate
        st = AM.street(cp['street']) if cp.get('street') else None
        kind = 'address' if verified(cp) else 'single'
        truth = dict(kind=kind, x=cp['x'], z=cp['z'], street=st, number=cp.get('number'), err=float(cp.get('posErrM') or 25), how=cp.get('posMethod'))
    g['truth'] = truth

    flags = []
    if cp and (cp.get('tier') == 'X' or cp.get('open') is False): flags.append('CLOSED')
    if not truth:
        if cp and cp.get('tier') in ('C',): flags.append('WEAK')
        flags.append('UNVERIFIED')
        g.update(flags=flags, delta=None); continue
    tf = facade_of(truth['x'], truth['z'], truth['street'])
    if truth['kind'] == 'address' and tf is None:
        tf = facade_of(truth['x'], truth['z'], truth['street'], maxd=30)
    g['tf'] = tf
    if tf is None:
        g['delta'] = round(dist((g['fx'], g['fz']), (truth['x'], truth['z'])), 1)
        if g['delta'] > TOL: flags.append('SHIFTED')
        g['flags'] = flags; continue
    d = dist((g['fx'], g['fz']), (tf['fx'], tf['fz']))
    g['delta'] = round(d, 1)
    tol = TOL if truth['kind'] == 'osm' else max(TOL, truth['err'])
    if truth['kind'] == 'single': flags.append('SINGLE_LISTING')
    gst = g['facing'] or truth['street']
    # side check on the street the truth faces
    rs = truth['street'] or tf.get('faces')
    if rs and rs in AM.axis:
        si_t = side_info(rs, tf['fx'], tf['fz']); si_g = side_info(rs, g['fx'], g['fz'])
        side_ok = truth['kind'] == 'osm' or truth.get('how') == 'geocoded' or truth['err'] <= 12
        if side_ok and si_t and si_g and si_t['d'] < 35 and si_g['d'] < 35 and si_t['side'] != si_g['side']: flags.append('WRONG_SIDE')
    if g['b'] is not None and g['b'] != tf['b']:
        # wrong building only if the game building does not contain/touch the truth point
        pg = B[g['b']][0]
        if pg is None or pg.distance(Point(tf['fx'], tf['fz'])) > 1.0: flags.append('WRONG_BUILDING')
    if truth['kind'] == 'osm':
        if d <= tol and 'WRONG_BUILDING' in flags: flags.remove('WRONG_BUILDING')   # node on a party wall: ambiguous
        if (g['osm'] or '').startswith('way/') and g['b'] == tf['b']: d = 0.0   # the OSM object is the building itself: any frontage of it is right
        if d > tol and 'WRONG_SIDE' not in flags: flags.append('SHIFTED')
    else:
        # address-level truth (10-30 m): judge building / street / side, not the exact point
        same_b = 'WRONG_BUILDING' not in flags
        if same_b or d <= tol:
            if 'WRONG_BUILDING' in flags: flags.remove('WRONG_BUILDING')
        if truth['street'] and g['facing'] and g['facing'] != truth['street'] and truth['street'] in AM.axis:
            # facing another street although the truth building has a frontage on the address street
            pg_t = B[tf['b']]
            if tf.get('faces') == truth['street'] and 'WRONG_SIDE' not in flags: flags.append('WRONG_STREET')
        if not same_b and d > tol and 'WRONG_SIDE' not in flags and 'WRONG_BUILDING' not in flags: flags.append('SHIFTED')
    g['tol'] = tol
    g['flags'] = flags

# duplicates: same normalised name within 60 m
GEN = {'atm', 'kiosk', 'periptero', 'parking', 'pharmacy', 'farmakeio', 'cafe', 'bank', 'toilets', 'no name'}
by = collections.defaultdict(list)
for g in G:
    k = norm(g['name'] or '')
    if len(k) >= 3 and k not in GEN: by[k].append(g)
RANK = lambda g: (-1 if (g['id'].startswith('osm:') or g['special']) else 0 if g['truth'] else 1, g['delta'] if g.get('delta') is not None else 999)   # keep the copy nearest to the real place
for k, L in by.items():
    if len(L) < 2: continue
    L.sort(key=RANK)
    for h in L[1:]:
        if dist((h['fx'], h['fz']), (L[0]['fx'], L[0]['fz'])) <= 60:
            h['flags'].append('DUPLICATE'); h['dupOf'] = L[0]['id']

# duplicates: two game signs for the same OSM object or the same census entry
seen = {}
for g in sorted(G, key=RANK):
    for k in ([('osm', g['osm'])] if g['osm'] else []) + ([('cen', g['cen'])] if g['cen'] else []):
        if k in seen and seen[k] is not g and 'DUPLICATE' not in g['flags']:
            g['flags'].append('DUPLICATE'); g['dupOf'] = seen[k]['id']
        seen.setdefault(k, g)

# bay squatting: a non-OSM sign sits on the truth facade point of an OSM shop whose own sign is elsewhere
bays = collections.defaultdict(list)
for g in G:
    if g['b'] is not None and g['e'] is not None and g['w']: bays[(g['b'], g['e'])].append(g)
for g in G:
    if not g['osm'] or not g.get('tf') or 'SHIFTED' not in g['flags'] and 'WRONG_BUILDING' not in g['flags']: continue
    tf = g['tf']
    for h in bays.get((tf['b'], tf['e']), []):
        if h is g or h['osm']: continue
        c = B[tf['b']][1]; a = c[tf['e']]; b2 = c[(tf['e'] + 1) % len(c)]; L = math.hypot(b2[0] - a[0], b2[1] - a[1])
        if abs((h['t'] - tf['t']) * L) <= h['w'] / 2 + 0.5:
            if 'ON_OSM_BAY' not in h['flags']: h['flags'].append('ON_OSM_BAY')
            h['squats'] = g['id']; g.setdefault('displacedBy', []).append(h['id'])

# ---------------- real entries missing from the game ----------------
missing = []
# OSM named shop-like POIs in focus not represented
SHOPKEYS = {'shop', 'amenity', 'office', 'craft', 'healthcare', 'tourism', 'leisure'}
NOTSHOP = {'bench', 'waste_basket', 'parking', 'bicycle_parking', 'motorcycle_parking', 'fountain', 'drinking_water', 'toilets', 'telephone', 'post_box', 'vending_machine',
           'recycling', 'shelter', 'clock', 'parking_entrance', 'charging_station', 'taxi', 'bus_station', 'playground', 'park', 'garden', 'pitch', 'grave_yard', 'place_of_worship',
           'school', 'kindergarten', 'townhall', 'police', 'fire_station', 'public_bookcase', 'water_point', 'picnic_table', 'artwork', 'viewpoint', 'information', 'attraction'}
fpoly = None
for o in OSMP:
    if o['osm'] in used_osm: continue
    if o['key'] not in SHOPKEYS or o['value'] in NOTSHOP: continue
    if not (o.get('name') or o.get('brand')): continue
    x, z = o['x'], o.get('z', o.get('y'))
    if 'focus' in M and not pip((x, z), unp(M['focus'][0]) if isinstance(M['focus'][0], list) else unp(M['focus'])): continue
    missing.append(dict(kind='osm', id=o['osm'], name=o.get('name') or o.get('brand'), cat=o['value'], x=x, z=z, street=AM.street(o['street']) if o.get('street') else None, number=o.get('number')))
for p in C['places']:
    if p['id'] in used_cen or not p.get('inFocus') or p.get('osm') in used_osm: continue
    if not verified(p) or p.get('streetLevel') is False: continue
    n = num_of(p); geo = AM.geocode(p['street'], n) if n is not None else None
    if not geo: continue
    missing.append(dict(kind='address', id=p['id'], name=p['name'], cat=p['category'], x=geo['x'], z=geo['z'], street=geo['street'], number=p['number'], err=geo['errM']))
for m_ in missing:
    tf = facade_of(m_['x'], m_['z'], m_['street'], maxd=20)
    m_['tf'] = tf

# ---------------- per street tables ----------------
def street_of_sign(g):
    for s in (g['facing'], g['truth']['street'] if g.get('truth') else None, g['street']):
        if s in STREETS: return s
    return None

BADF = {'DUPLICATE', 'WRONG_SIDE', 'WRONG_STREET', 'WRONG_BUILDING', 'SHIFTED', 'CLOSED'}
def cite(osm_id, cen_id):
    """citations for the address/position, strongest first: shop's own site / store locator (web), vrisko.gr, OSM survey, Foursquare, Overture"""
    out = []
    cp = cen.get(cen_id) if cen_id else None
    srcs = list(cp.get('sources', [])) if cp else []
    seen_u = set()
    for s_ in srcs:
        if s_.startswith('web:') and s_[4:] not in seen_u:
            u = s_[4:]; seen_u.add(u); out.append(('[vrisko.gr](' if 'vrisko.gr' in u else '[web](') + u + ')')
    for s_ in srcs:
        if s_.startswith('vrisko:') and s_[7:] not in seen_u and not any('vrisko.gr/details' in u for u in seen_u): out.append('[vrisko.gr](' + s_[7:] + ')'); break
    if osm_id: out.append('[OSM ' + osm_id + '](https://www.openstreetmap.org/' + osm_id + ')')
    if any(s_.startswith('fsq:') for s_ in srcs): out.append('Foursquare OS Places')
    ov = [s_ for s_ in srcs if s_.startswith('overture:')]
    if ov:
        m_ = re.search(r'\((.*)\)', ov[0]); out.append('Overture' + (' (' + m_.group(1).replace('+meta', '').replace('meta', '') + ')' if m_ and m_.group(1) not in ('meta',) else ''))
    return ', '.join(dict.fromkeys(out)) or '–'

# identities in the 08:50 map (before) for moved / removed status
BEF = os.path.join(OUTD, 'before_0850.json')
bef = json.load(open(BEF, encoding='utf-8')) if (os.path.exists(BEF) and not OUTJ) else None
def ident(osm_id, cen_id, pid):
    return osm_id or cen_id or pid
bef_by = {}
if bef:
    for b_ in bef['signs']: bef_by.setdefault(ident(b_.get('osm'), b_.get('census'), b_['id']), b_)
now_ids = {ident(g['osm'], g['cen'], g['id']) for g in G}
miss_ids = {m_['id'] for m_ in missing} | {(cen.get(m_['id']) or {}).get('osm') for m_ in missing if m_['kind'] != 'osm'}

def status(g):
    f = set(g['flags'])
    if 'DUPLICATE' in f: return 'duplicate → remove'
    if 'CLOSED' in f: return 'closed → remove'
    if f & BADF: return 'misplaced → move'
    if not g.get('truth'): return 'unverified (no listing)'
    if g['truth']['kind'] == 'single': return 'unverified (weak listing)'
    b_ = bef_by.get(ident(g['osm'], g['cen'], g['id']))
    if b_ and set(b_['flags']) & BADF and not set(b_['flags']) & {'DUPLICATE'}: return 'verified (moved)'
    return 'verified'

tables = {}
for st in STREETS:
    rows = []
    for g in G:
        if street_of_sign(g) != st: continue
        si = side_info(st, g['fx'], g['fz'])
        if not si or si['d'] > 45: continue
        sr = side_info(st, g['tf']['fx'], g['tf']['fz']) if g.get('tf') else None
        rows.append(dict(type='game', id=g['id'], name=g['name'], src=g['src'], bay=g['bay'], sGame=si['s'], sideGame=si['compass'], parGame=si['parity'], sideKey=si['side'],
                         sReal=sr['s'] if sr else None, sideReal=sr['compass'] if sr else None, sideKeyReal=sr['side'] if sr else None, parReal=sr['parity'] if sr else None, real=(g['truth']['kind'] if g.get('truth') else None),
                         number=(g['truth'] or {}).get('number') or g['number'], delta=g.get('delta'), errM=(g['truth'] or {}).get('err'), flags=g['flags'], fx=g['fx'], fz=g['fz'],
                         tfx=g['tf']['fx'] if g.get('tf') else None, tfz=g['tf']['fz'] if g.get('tf') else None,
                         street=(g['truth'] or {}).get('street') or g['street'], cite=cite(g['osm'], g['cen']), status=status(g)))
    for m_ in missing:
        if m_['street'] != st and not (m_['street'] is None and m_.get('tf') and m_['tf'].get('faces') == st): continue
        p = m_['tf'] or m_
        si = side_info(st, p.get('fx', m_['x']), p.get('fz', m_['z']))
        if not si or si['d'] > 45: continue
        rows.append(dict(type='missing', id=m_['id'], name=m_['name'], src=m_['kind'], sReal=si['s'], sideReal=si['compass'], sideKey=si['side'], sideKeyReal=si['side'], parReal=si['parity'], parGame=si['parity'],
                         number=m_.get('number'), flags=['MISSING'], tfx=p.get('fx', m_['x']), tfz=p.get('fz', m_['z']), street=m_['street'],
                         cite=cite(m_['id'] if m_['kind'] == 'osm' else (cen.get(m_['id']) or {}).get('osm'), m_['id'] if m_['kind'] != 'osm' else None), status='missing → add'))
    # signs of the 08:50 map that are no longer built (removed: duplicate / closed / no verified address)
    if bef:
        for b_ in bef['signs']:
            k_ = ident(b_.get('osm'), b_.get('census'), b_['id'])
            if k_ in now_ids or k_ in miss_ids or b_.get('street') != st: continue
            tf_ = b_.get('tf') or {}
            px, pz = (tf_.get('fx'), tf_.get('fz')) if tf_ else (b_['game']['fx'], b_['game']['fz'])
            si = side_info(st, px, pz)
            if not si or si['d'] > 45: continue
            fl_ = set(b_['flags'])
            why = 'duplicate' if 'DUPLICATE' in fl_ else 'closed' if 'CLOSED' in fl_ else 'no listing' if 'UNVERIFIED' in fl_ else \
                  'single listing, not rebuilt' if ('SINGLE_LISTING' in fl_ or (b_.get('truth') or {}).get('kind') == 'single') else 'VERIFIED - should be rebuilt'
            cp_ = cen.get(b_.get('census')) if b_.get('census') else None
            rows.append(dict(type='removed', id=b_['id'], name=b_['name'], src=(b_.get('truth') or {}).get('kind') or 'none', sReal=si['s'] if tf_ else None, sGame=si['s'],
                             sideReal=si['compass'], sideKey=si['side'], sideKeyReal=si['side'], parReal=si['parity'], parGame=si['parity'],
                             number=(b_.get('truth') or {}).get('number') or (cp_ or {}).get('number'), flags=['REMOVED'], fx=b_['game']['fx'], fz=b_['game']['fz'],
                             tfx=tf_.get('fx'), tfz=tf_.get('fz'), street=(b_.get('truth') or {}).get('street'), cite=cite(b_.get('osm'), b_.get('census')),
                             status='removed (' + why + ')'))
    # order check (matched rows with truth): inversions per side
    inv = 0; pairs = 0
    for sk in (1, -1):
        R = [r for r in rows if r['type'] == 'game' and r.get('sReal') is not None and r['sideKey'] == sk and r.get('real') in ('osm', 'address') and (r.get('errM') or 0) <= 15 and 'DUPLICATE' not in r['flags']]
        for i in range(len(R)):
            for j in range(i + 1, len(R)):
                a, b = R[i], R[j]
                if abs(a['sReal'] - b['sReal']) < 3 or abs(a['sGame'] - b['sGame']) < 0.5: continue
                pairs += 1
                if (a['sReal'] - b['sReal']) * (a['sGame'] - b['sGame']) < 0: inv += 1
    tables[st] = dict(rows=rows, inversions=inv, pairs=pairs, axisLen=round(AM.axis[st].length, 1) if st in AM.axis else None)

# ---------------- summary ----------------
cnt = collections.Counter()
for g in G:
    for f in g['flags']: cnt[f] += 1
    if not g['flags']: cnt['OK'] += 1
cnt_truth = collections.Counter((g['truth']['kind'] if g.get('truth') else 'none') for g in G)
deltas = sorted(g['delta'] for g in G if g.get('delta') is not None and g['truth'] and g['truth']['kind'] == 'osm')
summ = dict(signs=len(G), flags=dict(cnt), truth=dict(cnt_truth), missing=len(missing),
            osmDeltaMedian=deltas[len(deltas) // 2] if deltas else None, osmDeltaP90=deltas[int(len(deltas) * 0.9)] if deltas else None,
            osmOver4=sum(1 for d in deltas if d > TOL), osmN=len(deltas))
print(json.dumps(summ, ensure_ascii=False, indent=1))
for st, T in tables.items():
    rr = T['rows']; print(st, 'signs', sum(r['type'] == 'game' for r in rr), 'missing', sum(r['type'] == 'missing' for r in rr), 'flagged', sum(1 for r in rr if r['type'] == 'game' and r['flags']), 'inv', T['inversions'], '/', T['pairs'])

def action(g):
    f = set(g['flags'])
    if 'CLOSED' in f: return 'drop'
    if 'DUPLICATE' in f: return 'merge_into:' + g['dupOf']
    if 'UNVERIFIED' in f: return 'drop_or_plate'   # not built per new rule unless a free bay remains (never on an OSM bay)
    if f & {'WRONG_SIDE', 'WRONG_BUILDING', 'SHIFTED', 'WRONG_STREET'}: return 'move_to_truth' + ('_if_free' if 'SINGLE_LISTING' in f else '')
    if 'SINGLE_LISTING' in f: return 'keep_if_free'
    if 'ON_OSM_BAY' in f: return 'move_off_osm_bay'
    return 'keep'

out = dict(version=str(C['version']) + '-pa1', generated=__import__('datetime').datetime.now(__import__('datetime').timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), map=os.path.relpath(MAPF, ROOT), mapV=M.get('v'),
           about='Shop placement audit (ORDERS item 16). For every game sign (MAP.pois index qi): truth = OSM surveyed point or verified address geocode, carried to the facade '
                 '(tf: building b, edge e, t, facade point fx/fz); delta = game facade point -> truth facade point (m); flags; action for the map pipeline. '
                 'missing[] = real businesses (OSM named shops, verified census addresses) without a game sign, with their truth facade.',
           tolerance=TOL, summary=summ,
           signs=[dict(qi=g['qi'], id=g['id'], name=g['name'], src=g['src'], bay=g['bay'], street=street_of_sign(g), game=dict(b=g['b'], e=g['e'], t=g['t'], fx=round(g['fx'], 2), fz=round(g['fz'], 2)),
                       truth=(dict(kind=g['truth']['kind'], x=round(g['truth']['x'], 2), z=round(g['truth']['z'], 2), street=g['truth']['street'], number=g['truth']['number'], errM=g['truth']['err']) if g.get('truth') else None),
                       tf=g.get('tf'), delta=g.get('delta'), flags=g['flags'], action=action(g), osm=g['osm'], census=g['cen'], **({'dupOf': g['dupOf']} if g.get('dupOf') else {}),
                       **({'squats': g['squats']} if g.get('squats') else {})) for g in G],
           missing=[dict(kind=m_['kind'], id=m_['id'], name=m_['name'], cat=m_['cat'], street=m_['street'], number=m_.get('number'), x=round(m_['x'], 2), z=round(m_['z'], 2), tf=m_.get('tf'), errM=m_.get('err', 3.0)) for m_ in missing])
if OUTJ:
    jdump(out, OUTJ); print('wrote', OUTJ); sys.exit(0)
jdump(out, os.path.join(ROOT, 'gk3', 'data', 'placement_audit.json'))
jdump(dict(tables=tables, summary=summ), os.path.join(OUTD, 'audit_tables.json'))
jdump([{k: v for k, v in g.items() if k not in ()} for g in G], os.path.join(OUTD, 'signs_debug.json'), default=str)
print('wrote gk3/data/placement_audit.json')
