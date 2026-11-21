"""research-arch: build gk3/data/buildings_spec.json.

Base layer (every building of gk3/kifisia_map.json, keyed by its OSM id as the map stores it: "w123" / "r456"):
  OSM tags from kif.osm + street/frontage/shops from the map  ->  style class + parameters (confidence "osm" or "inferred").
Photo layer: tools/arch/photo_specs.json (hand-written from looking at open-licence photos) overrides fields per id
  and sets confidence "photo".
Usage: python3 -I tools/arch/extract.py
"""
import json, os, math, re, hashlib, collections
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon, LineString, Point
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda *a: os.path.join(ROOT, *a)
MAP = json.load(open(P('gk3', 'kifisia_map.json')))
KX, KZ, LON0, LAT0 = 87716.0, 110998.0, 23.8125, 38.0727

# ---------------------------------------------------------------- OSM raw tags per building id
osm_tags = {}
for ev, el in ET.iterparse(P('kif.osm'), events=('end',)):
    if el.tag in ('way', 'relation'):
        tg = {t.get('k'): t.get('v') for t in el.findall('tag')}
        if 'building' in tg or 'building:part' in tg:
            osm_tags[('w' if el.tag == 'way' else 'r') + el.get('id')] = tg
        el.clear()
    elif el.tag == 'node':
        el.clear()

# ---------------------------------------------------------------- roads (named) for street lookup
names = MAP['names']
latin = MAP.get('names_latin') or []
rl, rmeta = [], []
for r in MAP['roads']:
    ty, ni = r[0], r[1]
    if ni is None or ni < 0 or ty in (7, 8, 9): continue
    pts = [(r[i] / 10, r[i + 1] / 10) for i in range(8, len(r) - 1, 2)]
    if len(pts) < 2: continue
    rl.append(LineString(pts)); rmeta.append((ty, ni))
rtree = STRtree(rl)

def street_of(poly):
    best = None
    for i in rtree.query(poly.buffer(30)):
        d = rl[i].distance(poly)
        if best is None or d < best[0]: best = (d, rmeta[i])
    if not best: return None, None, None, 999
    ty, ni = best[1]
    return names[ni], (latin[ni] if ni < len(latin) else None), ty, best[0]

# ---------------------------------------------------------------- zones in the owner's order (OWNER_BRIEF item 12)
K = MAP['key']
def zone(cx, cz, st):
    jx, jz = K['junction']
    if math.hypot(cx - jx, cz - jz) < 45: return 1, 'spawn_junction'
    if st == 'Κασσαβέτη' and cz > -40: return 2, 'kassaveti'
    if st == 'Κηφισίας' and math.hypot(cx - K['kfc'][0], cz - K['kfc'][1]) < 260: return 3, 'kifisias_ave'
    if math.hypot(cx - K['platanos'][0], cz - K['platanos'][1]) < 90: return 4, 'platanos'
    if math.hypot(cx - K['station'][0], cz - K['station'][1]) < 110: return 5, 'station'
    if st in ('Λεβίδου', 'Κολοκοτρώνη', 'Κυριαζή', 'Αργυροπούλου', 'Παναγίτσας', 'Δροσίνη', 'Γεωργίου Δροσίνη'): return 6, 'levidou_kolokotroni'
    gx, gz = MAP['isa']['gate']
    if math.hypot(cx - gx, cz - gz) < 80: return 8, 'isa_campus'
    rp = MAP.get('route') or []
    if rp:
        rline = LineString([(rp[i] / 10, rp[i + 1] / 10) for i in range(0, len(rp) - 1, 2)])
        if rline.distance(Point(cx, cz)) < 35: return 7, 'isa_route'
    return 9, 'other'

# ---------------------------------------------------------------- style classes (documented in docs/research/ARCHITECTURE_KIFISIA.md)
COMMERCIAL = {'Κασσαβέτη', 'Λεβίδου', 'Κολοκοτρώνη', 'Κυριαζή', 'Αργυροπούλου', 'Κηφισίας', 'Παναγίτσας', 'Δροσίνη',
              'Γεωργίου Δροσίνη', 'Αγίου Δημητρίου', 'Παπαδιαμάντη', 'Μπενάκη', 'Ζηρίνη', 'Πλατεία Πλατάνου', 'Όθωνος', 'Χαριλάου Τρικούπη', 'Τατοΐου'}
PAL = {   # realistic Kifisia colours (sampled from the Commons photos listed in ARCHITECTURE_KIFISIA.md)
    'neo_villa': ['#e3c48e', '#e9d2a6', '#e6b9a0', '#efe3c8', '#d9b27c', '#e8cdb5', '#f0e6d2'],
    'chalet_villa': ['#c4a68a', '#cdb79c', '#efe6d6'],
    'interwar': ['#ece5d6', '#e8dcc2', '#efe9de', '#dcd2bf'],
    'poly_6080': ['#f1eee7', '#ebe6db', '#e9e2d0', '#f2ede1', '#e3dccd', '#ece4cf'],
    'poly_8000': ['#ead9b8', '#e7cfae', '#f0e4cc', '#e2c9a3', '#efe8da', '#dcc3a0'],
    'poly_modern': ['#f3f1ec', '#e9e6e0', '#d9d4cc', '#efebe3'],
    'retail_modern': ['#dfdbd4', '#c9c4bc', '#2f3236', '#e8e4dc'],
    'villa_modern': ['#efe3c9', '#e9d3b0', '#f2ebdd', '#e6c9a5', '#ede6d8'],
    'house_suburban': ['#efe6d4', '#e8d6b6', '#f2ece0'],
    'ancillary': ['#d9d3c8', '#cfc8bb'],
}
ROOFCOL = {'tile': ['#a9553a', '#b45f3f', '#9c4d35', '#b8664a'], 'flat': ['#bdb7ad', '#c7c2b8', '#b3ada3']}

def H(s, n):  # deterministic pick
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16) % n

def base_spec(i, b):
    tags = b[11]; bid = tags['id']; tg = osm_tags.get(bid, {})
    coords = b[10]
    pts = [(coords[k] / 10, coords[k + 1] / 10) for k in range(0, len(coords) - 1, 2)]
    poly = Polygon(pts).buffer(0)
    cx, cz = poly.centroid.x, poly.centroid.y
    area = poly.area
    st, stl, sty, sd = street_of(poly)
    ast = tags.get('street') or tg.get('addr:street')
    if ast and ast != st:
        st, stl, sd = ast, (latin[names.index(ast)] if ast in names and names.index(ast) < len(latin) else None), 0
    nshops = len(b[8]) + len(tags.get('shops', []))
    mstyle, mlev, mroof = b[2], b[1], b[3]
    btype = tg.get('building', 'yes')
    zi, zn = zone(cx, cz, st)
    commercial = (st in COMMERCIAL and sd < 12) or nshops > 0
    src = ['osm']
    feats = []
    levels_tagged = 'building:levels' in tg
    # --- style
    if mstyle in ('church', 'station', 'agora') or btype in ('church', 'chapel', 'train_station', 'school', 'kiosk'):
        style = {'church': 'church', 'chapel': 'church', 'train_station': 'station', 'school': 'school', 'kiosk': 'kiosk'}.get(btype, mstyle if mstyle != 'agora' else 'market_hall')
    elif btype in ('garage', 'garages', 'shed', 'roof', 'carport', 'hut', 'service', 'container', 'construction') or area < 25:
        style = 'ancillary'
    elif mstyle == 'neo' or tg.get('historic') or tg.get('heritage'):
        style = 'neo_villa'
    elif mstyle == 'modern' or btype in ('retail', 'commercial', 'office', 'supermarket'):
        style = 'retail_modern' if (commercial and area > 250) else 'poly_modern'
    elif btype == 'hotel' or tags.get('tourism') == 'hotel':
        style = 'hotel'
    elif mstyle == 'villa' or btype in ('house', 'detached', 'semidetached_house'):
        style = 'house_suburban' if area < 110 else 'villa_modern'
    else:  # apartment blocks
        if commercial: style = 'poly_6080' if H(bid, 10) < 7 else 'poly_8000'
        else: style = ['poly_6080', 'poly_8000', 'poly_8000', 'poly_modern'][H(bid, 4)]
    # --- levels
    if levels_tagged:
        try: levels = max(1, int(round(float(tg['building:levels']))))
        except ValueError: levels = mlev
    else:
        levels = {'neo_villa': 2, 'chalet_villa': 2, 'house_suburban': 2, 'villa_modern': 2 + (H(bid + 'l', 3) == 0),
                  'ancillary': 1, 'kiosk': 1, 'church': 1, 'station': 1, 'market_hall': 1, 'school': 2,
                  'retail_modern': 2 + H(bid + 'l', 2), 'hotel': max(3, mlev)}.get(style)
        if levels is None:
            levels = mlev if mlev >= 2 else 3
            if style in ('poly_6080', 'poly_8000', 'poly_modern'):
                levels = max(3, min(5, levels)) if commercial else max(2, min(4, levels))
                if st == 'Κηφισίας' and commercial: levels = max(levels, 4 + H(bid + 'k', 2))
    # --- floor heights (metres)
    gfH, floorH = {
        'neo_villa': (4.6, 4.3), 'chalet_villa': (4.2, 3.8), 'interwar': (3.8, 3.4), 'poly_6080': (4.2 if commercial else 3.1, 3.0),
        'poly_8000': (4.2 if commercial else 3.1, 3.05), 'poly_modern': (4.5 if commercial else 3.2, 3.1), 'retail_modern': (5.0, 3.6),
        'villa_modern': (3.2, 3.1), 'house_suburban': (3.1, 3.0), 'ancillary': (2.8, 2.8), 'kiosk': (2.6, 2.6), 'church': (9.0, 0),
        'station': (6.0, 0), 'market_hall': (6.5, 0), 'school': (3.6, 3.4), 'hotel': (4.5, 3.2)}.get(style, (3.2, 3.0))
    pilotis = (style in ('poly_6080', 'poly_8000') and not commercial and H(bid + 'p', 4) == 0)
    if pilotis: gfH = 3.0
    setback = style in ('poly_6080', 'poly_8000', 'poly_modern') and levels >= 3 and H(bid + 's', 5) < 3
    # --- roof
    rs = tg.get('roof:shape')
    if rs: roof = {'hipped': 'hip', 'gabled': 'gable', 'pyramidal': 'pyramid', 'flat': 'flat', 'dome': 'dome'}.get(rs, 'flat')
    elif style in ('neo_villa', 'house_suburban'): roof = 'hip'
    elif style == 'chalet_villa': roof = 'gable'
    elif style == 'villa_modern': roof = 'hip' if H(bid + 'r', 10) < 7 else 'flat'
    elif style == 'church': roof = 'dome'
    elif style in ('station', 'market_hall'): roof = 'hip'
    elif style == 'poly_8000' and not commercial and H(bid + 'r', 3) == 0: roof = 'hip'
    elif style in ('poly_6080', 'poly_8000', 'hotel'): roof = 'flat_solar' if H(bid + 'r', 3) else 'flat'
    else: roof = mroof if mroof in ('flat', 'hip') else 'flat'
    roofColour = tg.get('roof:colour') or (ROOFCOL['tile'][H(bid, 4)] if roof in ('hip', 'gable', 'pyramid') else ROOFCOL['flat'][H(bid, 3)])
    pal = PAL.get(style, PAL['poly_6080'])
    fcol = tg.get('building:colour') or pal[H(bid + 'c', len(pal))]
    mat = tg.get('building:material') or {'retail_modern': 'glass', 'chalet_villa': 'stone'}.get(style, 'plaster')
    base = {'neo_villa': 'stone', 'poly_8000': 'stone', 'poly_modern': 'stone', 'villa_modern': 'stone', 'retail_modern': 'stone',
            'poly_6080': 'marble' if commercial else 'plaster'}.get(style, 'plaster')
    bal = {
        'poly_6080': {'type': 'continuous_slab', 'rail': ['alu', 'alu', 'masonry', 'iron'][H(bid + 'b', 4)], 'perFloor': True, 'depthM': 1.3, 'slabEdge': 'marble'},
        'poly_8000': {'type': ['individual', 'recessed', 'continuous_slab'][H(bid + 'b', 3)], 'rail': ['masonry', 'iron', 'alu'][H(bid + 'b2', 3)], 'perFloor': True, 'depthM': 1.4},
        'poly_modern': {'type': ['glass', 'recessed', 'continuous_slab'][H(bid + 'b', 3)], 'rail': 'glass', 'perFloor': True, 'depthM': 1.6},
        'neo_villa': {'type': 'individual', 'rail': 'iron', 'perFloor': False, 'depthM': 0.8, 'note': 'one central marble balcony on carved consoles over the entrance'},
        'villa_modern': {'type': 'individual', 'rail': ['masonry', 'iron', 'alu'][H(bid + 'b', 3)], 'perFloor': True, 'depthM': 1.5},
        'hotel': {'type': 'individual', 'rail': 'iron', 'perFloor': True, 'depthM': 1.0},
    }.get(style, {'type': 'none', 'rail': 'none', 'perFloor': False})
    awn = 'none'
    if style in ('poly_6080', 'poly_8000'): awn = 'fabric'
    if commercial and style in ('poly_6080', 'poly_8000', 'neo_villa', 'interwar'): awn = 'fabric'
    if style == 'neo_villa': feats += ['rusticated_plinth', 'quoins', 'cornice', 'window_pediments', 'shutters_green', 'raised_ground_floor_steps']
    if style == 'poly_6080': feats += ['marble_slab_edges', 'roller_shutter_boxes', 'awnings_per_balcony', 'ac_units', 'stair_bulkhead', 'solar_water_heaters' if roof == 'flat_solar' else 'tv_antennas']
    if style == 'poly_8000': feats += ['stone_clad_base', 'timber_or_alu_shutters', 'planters', 'ac_units', 'pergola_top' if setback else 'parapet']
    if style == 'poly_modern': feats += ['stone_or_hpl_cladding', 'frameless_glass_rails', 'sliding_doors', 'hidden_ac']
    if style == 'retail_modern': feats += ['curtain_wall', 'stone_cladding', 'flush_signage']
    if style == 'villa_modern': feats += ['tiled_roof_eaves', 'stone_clad_base', 'arched_openings' if H(bid + 'a', 2) else 'pergola', 'garden_wall']
    if style == 'house_suburban': feats += ['tiled_roof_eaves', 'shutters_green' if H(bid + 'g', 2) else 'shutters_brown']
    if pilotis: feats.append('pilotis_parking')
    hgt = gfH + max(0, levels - 1) * floorH
    if roof in ('flat', 'flat_solar'): hgt += 0.9  # parapet
    else: hgt += {'hip': 2.4, 'gable': 3.5, 'pyramid': 2.4, 'dome': 4.0}[roof] if style != 'church' else 6.0
    if setback: hgt += 3.0
    if 'height' in tg:
        try: hgt = float(re.sub('[^0-9.]', '', tg['height'])); src.append('osm:height')
        except ValueError: pass
    lon = cx / KX + LON0; lat = LAT0 - cz / KZ
    addr = None
    if tags.get('street'): addr = f"{tags['street']} {tags.get('number', '')}".strip()
    elif tg.get('addr:street'): addr = f"{tg['addr:street']} {tg.get('addr:housenumber', '')}".strip()
    spec = dict(
        name=b[9] or tg.get('name') or None, addr=addr, street=st, streetLatin=stl, osm=('way/' if bid[0] == 'w' else 'relation/') + bid[1:],
        map=i, x=round(cx, 1), z=round(cz, 1), lat=round(lat, 7), lon=round(lon, 7), areaM2=round(area), zone=zn, zoneOrder=zi,
        style=style, levels=levels, gfH=gfH, floorH=floorH, heightM=round(hgt, 1), roof=roof, roofColour=roofColour,
        facade=dict(colour=fcol, material=mat, base=base, trim='#f4f1ea'),
        balconies=bal, setbackTop=setback, pilotis=pilotis, awnings=awn, shopfronts=nshops, features=feats,
        photos=[], source=src, confidence='osm' if (levels_tagged or rs) else 'inferred',
        osmTags={k: v for k, v in tg.items() if k.startswith(('building', 'roof', 'height', 'start_date', 'name', 'addr', 'historic', 'heritage', 'architect', 'amenity', 'shop', 'tourism'))})
    if spec['name'] is None: del spec['name']
    return bid, spec

def main():
    out = {}
    for i, b in enumerate(MAP['buildings']):
        bid, s = base_spec(i, b)
        out[bid] = s

    # research-shops layer: shops.json "building" descriptions for buildings still inferred
    sj = P('gk3', 'data', 'shops.json')
    if os.path.exists(sj):
        byidx = {s['map']: k for k, s in out.items()}
        for r in json.load(open(sj)).get('shops', []):
            b = r.get('building') or {}
            mb = b.get('mapBuilding')
            k = byidx.get(mb) if isinstance(mb, int) else None
            if b.get('osmWay'): k = 'w' + b['osmWay'].split('/')[-1] if ('w' + b['osmWay'].split('/')[-1]) in out else k
            if not k or out[k]['confidence'] not in ('inferred', 'osm'): continue
            s = out[k]
            if b.get('floors'):
                s['levels'] = b['floors']
                s['heightM'] = b.get('heightM') or round(s['gfH'] + (b['floors'] - 1) * s['floorH'] + 0.9, 1)
            if b.get('colour'): s['facade']['colour'] = b['colour']
            if b.get('roof'):
                rr = b['roof'].lower(); s['roof'] = 'hip' if any(w in rr for w in ('hip', 'tile', 'pitch')) else ('gable' if 'gable' in rr else 'flat')
            s['source'].append('shops.json building (' + r['name'] + ')')
            s['researchNote'] = (b.get('facade') or '') + ((' | ' + b['note']) if b.get('note') else '')
            if not str(b.get('facade', '')).lower().startswith('inferred') and b.get('floors'): s['confidence'] = 'description'
    # research-shops top-level "buildings": real ground-floor tenants per facade (+ 6 photo records, merged only where we have none)
    if os.path.exists(sj):
        SB = json.load(open(sj)).get('buildings', {})
        for k, r in SB.items():
            if k not in out: continue
            s = out[k]
            for f in ('groundFloor', 'faces'):
                if r.get(f): s[f] = r[f]
            if r.get('shopfronts'): s['shopfronts'] = max(s.get('shopfronts') or 0, r['shopfronts'])
            if r.get('confidence') == 'photo' and s['confidence'] in ('inferred', 'osm', 'description'):
                for f, v in r.items():
                    if f in ('mapBuilding',): continue
                    s[f] = v
                s['source'] = list(r.get('source', [])) + ['shops.json buildings (research-shops)']
    # inferred residential classes that research-shops shows with real shop tenants: give them a shop ground floor
    for s in out.values():
        if s['confidence'] != 'inferred' or not s.get('groundFloor'): continue
        if s['style'] in ('villa_modern', 'house_suburban', 'ancillary', 'neo_villa'):
            if s['areaM2'] < 60 and s['style'] != 'neo_villa':
                s['styleDetail'] = 'shop_pavilion'; s['style'] = 'retail_modern'
                s['levels'] = 1; s['gfH'] = 4.2; s['heightM'] = 5.1 if s['roof'].startswith('flat') else 6.6
                s['balconies'] = {'type': 'none', 'rail': 'none', 'perFloor': False}
                s['features'] = ['shop_pavilion', 'full_width_shop_glazing']
            elif s['gfH'] < 4.0:
                s['heightM'] = round(s['heightM'] + 4.2 - s['gfH'], 1); s['gfH'] = 4.2
                s['features'] = s['features'] + ['converted_ground_floor_shops']
            s['source'].append('shops.json tenants -> shop ground floor')
    # orthophoto roof layer (Hellenic Cadastre open WMS, c. 2007-2010, reference only): tools/arch/ortho.py measure
    rsf = P('work', 'research-arch', 'ortho', 'roofstats.json')
    if not os.path.exists(rsf): rsf = P('tools', 'arch', 'roofstats.json')
    northo = 0
    if os.path.exists(rsf):
        RS = json.load(open(rsf))
        for k, r in RS.items():
            if k not in out or 'warm' not in r: continue
            s = out[k]
            w = r['warm']
            kind = 'tile' if w >= 0.55 else ('mixed' if w >= 0.25 else 'flat')
            s['roofOrtho'] = {'kind': kind, 'tileFrac': w, 'veg': r.get('veg'), 'colour': r.get('tileCol') if kind != 'flat' else r.get('flatCol'),
                              'src': 'Ktimatologio orthophoto c.2007-2010 (tools/arch/ortho.py)'}
            if r.get('veg', 0) > 0.5: s['roofOrtho']['note'] = 'mostly hidden by trees'; continue
            if s['confidence'] in ('photo', 'aerial'): continue
            if kind == 'tile':
                if s['roof'] not in ('hip', 'gable', 'pyramid', 'dome'):
                    s['roof'] = 'hip'
                    s['heightM'] = round(s['heightM'] - 0.9 + 2.4, 1)
                s['roofColour'] = r['tileColFix']
            elif kind == 'flat':
                if s['roof'] in ('hip', 'gable', 'pyramid'):
                    s['roof'] = 'flat'; s['heightM'] = round(s['heightM'] - 2.4 + 0.9, 1)
                    s['features'] = [f for f in s['features'] if f != 'tiled_roof_eaves']
                if r.get('flatCol'): s['roofColour'] = r['flatCol']
            else:
                if s['roof'] in ('hip', 'gable', 'pyramid'): s['roof'] = 'flat'; s['heightM'] = round(s['heightM'] - 2.4 + 0.9, 1)
                s['features'] = [f for f in s['features'] if f != 'tiled_roof_eaves'] + ['partly_tiled_roof']
                s['roofColour'] = r.get('flatCol') or s['roofColour']
                s['roofPartColour'] = r['tileColFix']
            s['source'].append('ortho:roof')
            s['roofSrc'] = 'ortho'
            northo += 1
        print('ortho roofs applied', northo)
    # photo layer
    pf = P('tools', 'arch', 'photo_specs.json')
    nphoto = 0
    if os.path.exists(pf):
        ph = json.load(open(pf))
        for bid, o in ph.items():
            if bid.startswith('_'): continue
            if bid not in out: print('photo spec for unknown id', bid); continue
            s = out[bid]
            for k, v in o.items():
                if k == 'facade':
                    s[k] = {**s.get(k, {}), **v}
                else:
                    s[k] = v
            s.setdefault('confidence', 'photo')
            if s['confidence'] == 'photo': nphoto += 1
    # every style must be a key of _styles (consumers switch on it); keep a finer label in styleDetail
    known = set(json.load(open(P('tools', 'arch', 'styles.json'))).keys())
    ALIAS = [('retail', 'retail_modern'), ('villa', 'neo_villa'), ('neoclass', 'neo_villa'), ('pavilion', 'eclectic_pavilion'),
             ('arcade', 'arcade_retail'), ('poly', 'poly_8000'), ('house', 'house_suburban')]
    for s in out.values():
        if s['style'] not in known:
            s['styleDetail'] = s['style']
            s['style'] = next((v for a, v in ALIAS if a in s['style']), 'poly_8000')
    cnt = collections.Counter(s['confidence'] for s in out.values())
    sty = collections.Counter(s['style'] for s in out.values())
    meta = {'version': __import__('time').strftime('%Y%m%d%H%M'),
           'about': 'Per-building architecture spec for Grand Kifisia (research-arch). Every key not starting with "_" is a building: the OSM id exactly as '
                    'kifisia_map.json stores it in buildings[i][11].id ("w<way>" / "r<relation>"); field "map" = index into MAP.buildings at generation time '
                    '(re-match by id, or by x,z if the map is rebuilt). confidence: photo = checked against an open-licence photo listed in photos/source; '
                    'osm = levels/roof from OSM tags; inferred = style class chosen from street character / footprint / map data, NOT verified. Units metres. '
                    'Style classes and their proportions: "_styles" below and docs/research/ARCHITECTURE_KIFISIA.md.',
           'counts': {'buildings': len(out), 'confidence': cnt, 'style': sty}}
    doc = {'_meta': meta, '_styles': json.load(open(P('tools', 'arch', 'styles.json'))) if os.path.exists(P('tools', 'arch', 'styles.json')) else {}}
    for k in sorted(out, key=lambda k: (out[k]['zoneOrder'], out[k]['map'])): doc[k] = out[k]
    tmp = P('gk3', 'data', 'buildings_spec.json.tmp')
    json.dump(doc, open(tmp, 'w'), ensure_ascii=False, separators=(',', ':'))
    json.load(open(tmp))
    os.replace(tmp, P('gk3', 'data', 'buildings_spec.json'))
    print(len(out), dict(cnt), dict(sty))

if __name__ == '__main__':
    main()
