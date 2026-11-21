#!/usr/bin/env python3
"""Merge OSM + Overture + Foursquare OS Places + web-verified entries into gk3/data/census.json.
Usage: python3 05_merge.py [--no-publish]
Reads:  work/research-census/osm_pois.json, raw/fsq_places_*.json, tools/data/src/overture_places_*.geojson,
        tools/census/web_entries.json (hand/web-researched entries, optional), tools/census/overrides.json (optional)
Writes: gk3/data/census.json (MAIN, atomically), work/research-census/census_debug.json"""
import sys, os, re, json, glob, math, collections, difflib, datetime, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from cats import categorise
import addr as ADDR
from shapely.geometry import Polygon, Point

HERE = os.path.dirname(os.path.abspath(__file__))
AM = ADDR.build_model()
MAP = AM.map
PLAY = Polygon(unp(MAP['playable'][0])); FOCUS = Polygon(unp(MAP['focus'][0]))
AREA = PLAY.union(FOCUS).buffer(15)

def in_area(x, z): return AREA.contains(Point(x, z))

def clean_name(n):
    n = (n or '').strip()
    n = re.sub(r'\s+', ' ', n)
    n = re.sub(r'\s*[-–|,@]\s*(kifis+ia|κηφισι[άα]|κηφισια|kefalari|κεφαλ[άα]ρι|athens|greece)\s*$', '', n, flags=re.I)
    n = re.sub(r'\s*\((kifis+ia|κηφισι[άα]|kefalari|κεφαλ[άα]ρι)\)\s*$', '', n, flags=re.I)
    n = re.sub(r'\s+(kifis+ia|kifisia|kifissia|kefalari|κηφισι[άα]ς?|κεφαλ[άα]ρι|ΚΗΦΙΣΙΑΣ?)$', '', n, flags=re.I) if len(n.split()) > 1 and not re.search(r'(of|στην|της|του|δήμος|dimos|city)\s+\S+$', n, re.I) else n
    return n.strip(' -–|,')

def phone_key(p):
    d = re.sub(r'\D', '', p or '')
    if d.startswith('0030'): d = d[4:]
    if d.startswith('30') and len(d) == 12: d = d[2:]
    return d if len(d) == 10 else ''

def host_key(u):
    m = re.match(r'^(?:https?://)?(?:www\.)?([^/?#]+)', (u or '').strip().lower())
    h = m.group(1) if m else ''
    return '' if re.search(r'facebook|instagram|google|linktr|i-host|e-food|efood|wolt|box\.gr|tripadvisor|booking|twitter|youtube|foursquare|bit\.ly', h) else h

# ---------------------------------------------------------------- candidates
C = []   # dicts: src, sid, name, rawcat, street_raw, num, numraw, lat, lon, x, z, open, phone, web, fresh, srcconf
OVR = json.load(open(os.path.join(HERE, 'overrides.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'overrides.json')) else {}
ALIAS = {norm(a): norm(b) for a, b in OVR.get('aliases', [])}
def add(**k):
    k['name'] = clean_name(k.get('name'))
    k['x'], k['z'] = P(k['lat'], k['lon'])
    if not in_area(k['x'], k['z']): return
    if OVR.get('dropAddressPattern') and re.search(OVR['dropAddressPattern'], k.get('addr') or ''): return
    k['key'] = norm(k['name']); k['key'] = ALIAS.get(k['key'], k['key'])
    if OVR.get('insideAddressPattern') and re.search(OVR['insideAddressPattern'], k.get('addr') or ''): k['inside'] = True
    C.append(k)

OSM_GENERIC = {'kiosk': 'Περίπτερο', 'pharmacy': 'Φαρμακείο', 'florist': 'Ανθοπωλείο', 'bank': 'Τράπεζα', 'supermarket': 'Σούπερ Μάρκετ', 'place_of_worship': 'Εκκλησία',
               'shoe_repair': 'Επιδιορθώσεις Υποδημάτων', 'doctors': 'Ιατρείο', 'jewelry': 'Κοσμήματα', 'restaurant': 'Εστιατόριο', 'fast_food': 'Σουβλάκι', 'mall': 'Στοά καταστημάτων'}
for p in json.load(open(os.path.join(WORK, 'osm_pois.json'), encoding='utf-8')):
    t = p['tags']
    if t.get('disused') == 'yes': continue
    name = p['name']; unnamed = not name
    if unnamed:
        if p['value'] not in OSM_GENERIC: continue
        name = OSM_GENERIC[p['value']]
    add(src='osm', sid=p['osm'], name=name, name_en=p.get('name_en') or '', unnamed=unnamed, rawcat=f"{p['key']}={p['value']}" + (' ' + t['cuisine'] if t.get('cuisine') else ''),
        street_raw=p['street'], numraw=p['number'], lat=p['lat'], lon=p['lon'], open=True, phone=phone_key(t.get('phone') or t.get('contact:phone')),
        web=host_key(t.get('website') or t.get('contact:website')), fresh=None, srcconf=0.9, way=p['osm'].startswith(('way', 'rel')))

for fp in sorted(glob.glob(os.path.join(ROOT, 'tools', 'data', 'src', 'overture_places_*.geojson')))[-1:]:
    OV_FILE = os.path.basename(fp)
    for f in json.load(open(fp, encoding='utf-8'))['features']:
        pr = f['properties']; lon, lat = f['geometry']['coordinates']
        nm = (pr.get('names') or {}).get('primary')
        if not nm: continue
        tx = pr.get('taxonomy') or {}
        raw = '>'.join(tx.get('hierarchy') or [pr.get('basic_category') or ''])
        ad = (pr.get('addresses') or [{}])[0].get('freeform') or ''
        st = pr.get('operating_status')
        ds = sorted({s['dataset'] for s in pr.get('sources', []) if s['dataset'] != 'Overture'})
        add(src='overture', sid=f['id'], name=nm, rawcat=raw, addr=ad, lat=lat, lon=lon, open=(False if st and 'closed' in st else None),
            phone=phone_key((pr.get('phones') or [''])[0]), web=host_key((pr.get('websites') or [''])[0]), fresh='2026', srcconf=pr.get('confidence', 0.5), via=ds)

for fp in sorted(glob.glob(os.path.join(RAW, 'fsq_places_*.json')))[-1:]:
    FSQ_REL = json.load(open(fp, encoding='utf-8'))['release']
    for r in json.load(open(fp, encoding='utf-8'))['rows']:
        if not r.get('name'): continue
        labs = r.get('fsq_category_labels') or []
        add(src='fsq', sid=r['fsq_place_id'], name=r['name'], rawcat=labs[0] if labs else '', rawcat2=' | '.join(labs[1:]), addr=r.get('address') or '', lat=r['latitude'], lon=r['longitude'],
            open=(False if r.get('date_closed') else None), phone=phone_key(r.get('tel')), web=host_key(r.get('website')), fresh=(r.get('date_refreshed') or '')[:4], srcconf=None)

# ---------------------------------------------------------------- vrisko.gr (Greek yellow pages), harvested by 08_vrisko.py
VR_CAT = {'anthopoleia': 'florist', 'bar': 'bar', 'bibliopoleia': 'bookshop', 'delicatessen': 'food_shop', 'eidi-doron': 'gifts', 'estiatoria': 'restaurant',
          'farmakeia': 'pharmacy', 'fast-food': 'fast_food', 'fotografeia-fotografoi': 'photo', 'gymnastiria': 'gym', 'ixthyopoleia': 'food_shop', 'kafeteries': 'cafe',
          'katastimata-royxon': 'clothes', 'katastimata-ypodimaton': 'shoes', 'kentra-aisthitikis-adynatismatos': 'beauty', 'kommotiria-koyreia': 'hairdresser',
          'kosmimata': 'jewellery', 'kreopoleia': 'food_shop', 'ksenodoxeia': 'hotel', 'manikioyr-pentikioyr-texnita-nyxia': 'beauty', 'ompreles': 'bags_accessories',
          'optika': 'optician', 'paixnidia': 'toys', 'pantopoleia': 'convenience', 'periptera': 'kiosk_tobacco_betting', 'pet-shop': 'pet',
          'praktoreia-taksidion-toyrismoy': 'travel', 'psitopoleia': 'fast_food', 'rologia': 'watches', 'soyper-market': 'supermarket', 'trapezes': 'bank',
          'zaxaroplasteia': 'patisserie', 'kallyntika': 'cosmetics',
          'athlitika-eidi': 'sports', 'paidika-royxa': 'kids', 'nyfika': 'bridal', 'dermatina-eidi': 'bags_accessories', 'kafekopteia': 'food_shop', 'pagota': 'ice_cream',
          'artozaxaroplasteia': 'bakery', 'eidi-diakosmisis': 'home_decor', 'raftes': 'repair', 'xartopoleia': 'bookshop', 'andrika-papoytsia': 'shoes',
          'gynaikeia-papoytsia': 'shoes', 'andrika-royxa': 'clothes', 'gynaikeia-royxa': 'clothes', 'foremata': 'clothes', 'royxa-egkymosynis': 'clothes',
          'royxa-stock': 'clothes', 'vintage-royxa': 'clothes', 'glykopoleia': 'patisserie', 'mini-markets': 'convenience', 'soyblaki': 'fast_food', 'burger': 'fast_food',
          'kotopoyladika': 'fast_food', 'anapsyktiria': 'cafe', 'wine-bar': 'bar', 'ilektronikoi-ypologistes-emporio-episkeyi': 'electronics',
          'kleidia-kleidaries': 'repair', 'epipla-genika': 'home_decor', 'stromata': 'home_decor', 'podilata': 'sports',
          'aitheria-elaia': 'cosmetics', 'praktoreia-opap': 'kiosk_tobacco_betting', 'kreperi': 'fast_food', 'sushi': 'restaurant', 'italiki-koyzina': 'restaurant',
          'katharistiria-royxon': 'dry_cleaning', 'eidi-kapnistoy': 'kiosk_tobacco_betting'}
VR_GENERIC = {'florist': 'Ανθοπωλείο', 'pharmacy': 'Φαρμακείο', 'kiosk_tobacco_betting': 'Περίπτερο', 'hairdresser': 'Κομμωτήριο', 'beauty': 'Κέντρο Αισθητικής',
              'jewellery': 'Κοσμήματα', 'optician': 'Οπτικά', 'clothes': 'Ρούχα', 'shoes': 'Υποδήματα', 'food_shop': 'Κρεοπωλείο', 'convenience': 'Παντοπωλείο',
              'patisserie': 'Ζαχαροπλαστείο', 'fast_food': 'Ψητοπωλείο', 'bakery': 'Αρτοποιείο', 'repair': 'Κλειδαράς', 'home_decor': 'Έπιπλα', 'kids': 'Παιδικά', 'sports': 'Αθλητικά', 'photo': 'Φωτογραφείο', 'travel': 'Ταξιδιωτικό Γραφείο', 'bookshop': 'Βιβλιοπωλείο', 'dry_cleaning': 'Καθαριστήριο'}
_LEGAL = r'\b(Α\.?Ε\.?Ε\.?|Α\.?Ε\.?|Ε\.?Π\.?Ε\.?|Ι\.?Κ\.?Ε\.?|Ο\.?Ε\.?|Ε\.?Ε\.?|ΑΒΕΕ|ΑΕΒΕ|ΜΟΝΟΠΡΟΣΩΠΗ|Μονοπρόσωπη|ΑΝΩΝΥΜΗ|ΕΤΑΙΡΙΑ|ΕΤΑΙΡΕΙΑ|ΕΜΠΟΡΙΚΗ|ΙΔΙΩΤΙΚΗ|ΚΕΦΑΛΑΙΟΥΧΙΚΗ|LTD|S\.?A\.?|IKE|EPE)\b'
def _legalish(t):
    return bool(re.search(_LEGAL, t)) or bool(re.search(r'(&|ΚΑΙ)\s*ΣΙΑ', t)) or bool(re.search(r'\b(ΗΛΛΑΣ|ΕΛΛΑΣ|HELLAS|GREECE|ΕΣΤΙΑΣΗ|GROUP)\b', t))
def _person(t):
    t = t.strip()
    return bool(re.match(r'^[Α-ΩΆ-Ώ][α-ωά-ώϊΐϋΰ]+(-[Α-ΩΆ-Ώ][α-ωά-ώ]+)? [Α-ΩΆ-Ώ][α-ωά-ώϊΐϋΰ]+( [Α-ΩΆ-Ώ][α-ω]{0,3}\.)*$', t)) or bool(re.match(r'^[Α-ΩΆ-Ώ][α-ωά-ώ]+ - [Α-ΩΆ-Ώ][α-ωά-ώ]+ ', t))
def vr_name(raw, cat):
    """sign name from a directory entry: 'STARBUCKS COFFEE - ALSHAYA HELLAS ΜΟΝΟΠΡΟΣΩΠΗ ΑΕ' -> 'STARBUCKS COFFEE'; 'ΚΛΥΤΑΙΜΝΗΣΤΡΑ (Τσούτης Γεώργιος Ι.)' -> 'ΚΛΥΤΑΙΜΝΗΣΤΡΑ';
    a bare person's name ('Κουτσουράδη Μαρία Σ.') -> 'Ανθοπωλείο Κουτσουράδη' (Greek small shops are signed with the category + surname). Returns (name, legal_name, person)."""
    n = re.sub(r'\s+', ' ', raw or '').strip()
    person_in_paren = re.search(r'\(([^)]*)\)', n)
    n0 = re.sub(r'\s*\([^)]*\)', '', n).strip()
    parts = [p.strip() for p in re.split(r'\s+-\s+', n0) if p.strip()]
    good = [p for p in parts if not _legalish(p) and not _person(p)]
    if good: nm = good[0]
    else:
        nm = parts[0] if parts else n0
        nm = re.sub(_LEGAL, '', nm); nm = re.sub(r'(&|ΚΑΙ)\s*ΣΙΑ', '', nm); nm = re.sub(r'\s+', ' ', nm).strip(' .,&-')
        if _person(nm) or (not good and parts and _person(parts[0])):
            sur = nm.split()[0]
            return ((VR_GENERIC.get(cat, '') + ' ' + sur).strip(), n, True)
    return nm, n, False
VR = []
vp = os.path.join(WORK, 'raw', 'vrisko', 'vrisko_items.json')
if os.path.exists(vp):
    for k, v in json.load(open(vp, encoding='utf-8')).items():
        if v.get('sponsored') or v.get('lat') is None: continue
        if 'κηφισι' not in strip_acc((v.get('locality') or '').lower()) and 'κεφαλαρ' not in strip_acc((v.get('locality') or '').lower()): continue
        cat = next((VR_CAT[s] for s in v['slugs'] if s in VR_CAT and VR_CAT[s] not in ('bar',)), VR_CAT.get(v['slugs'][0], 'shop'))
        nm, legal, person = vr_name(v['name'], cat)
        if len(nm) < 2: continue
        add(src='vrisko', sid=v['url'] or k, name=nm, legal=legal, person=person, rawcat='vrisko=' + ','.join(v['slugs']), addr=v.get('street') or '', lat=v['lat'], lon=v['lon'],
            open=None, phone=phone_key(v.get('phone')), web='', fresh=None, srcconf=None, webcat=cat, websl=True, urls=[v['url']] if v.get('url') else [],
            vrprec=len(str(v['lat']).split('.')[-1]))

WEB = []
wp = os.path.join(HERE, 'web_entries.json')
if os.path.exists(wp):
    WEB = json.load(open(wp, encoding='utf-8'))['entries']
    for i, w in enumerate(WEB):
        if w.get('lat') is None:
            st, num, rawn = ADDR.parse_address(w.get('address') or '')
            g = AM.geocode(st, num) if num is not None else None
            if not g:
                w['_fail'] = True; continue
            w['lat'], w['lon'] = g['lat'], g['lon']; w['_geocoded'] = g
        add(src='web', sid=w.get('id') or ('web:' + hashlib.md5((w['name'] + (w.get('address') or '')).encode()).hexdigest()[:10]), name=w['name'], rawcat=w.get('category') or '',
            addr=w.get('address') or '', lat=w['lat'], lon=w['lon'], open=w.get('open', True), phone=phone_key(w.get('phone')), web=host_key(w.get('url')), fresh='2026',
            srcconf=w.get('confidence', 0.8), urls=w.get('sources') or [], webcat=w.get('category'), websl=w.get('streetLevel', True), closed_note=w.get('closed_note'), _geocoded=bool(w.get('_geocoded')))

# addresses
for c in C:
    if c['src'] == 'osm':
        m = re.match(r'\d+', c.get('numraw') or '')
        c['num'] = int(m.group(0)) if m else None
        c['street'] = AM.street(c['street_raw']) if c.get('street_raw') else None
    else:
        st, num, rawn = ADDR.parse_address(c.get('addr'))
        c['street'] = AM.street(st) if st else None
        c['num'] = num if c['street'] else None; c['numraw'] = rawn if c['street'] else None
    c['cat'], c['sl'] = categorise(c['rawcat'], c['name'])
    if c.get('webcat'): c['cat'], c['sl'] = c['webcat'], c.get('websl', True)
    if c['cat'] in ('shop', 'other') and c.get('rawcat2'):
        c2 = categorise(c['rawcat2'].split(' | ')[0], c['name'])
        if c2[0] and c2[0] not in ('shop', 'other'): c['cat'], c['sl'] = c2

dropped = [c for c in C if c['cat'] is None]
C = [c for c in C if c['cat'] is not None and len(c['key']) >= 2]

# ---------------------------------------------------------------- de-duplication (union-find)
GEN = {'farmakeio', 'pharmacy', 'periptero', 'kiosk', 'atm', 'anthopoleio', 'trapeza', 'ekklisia', 'iatreio', 'kosmimata', 'estiatorio', 'souvlaki', 'stoa katastimaton', 'souper market', 'parking', 'epidiorthoseis ypodimaton'}
def toks(k): return [t for t in k.split() if t not in ('and', 'by', 'of', 'cafe', 'bar', 'restaurant', 'boutique', 'greece', 'hellas', 'athens')]
def name_sim(a, b):
    ka, kb = a['key'], b['key']
    if ka == kb: return 1.0
    pa, pb = ADDR.phon(a['name']), ADDR.phon(b['name'])
    if pa and pa == pb: return 0.97
    ta, tb = toks(ka), toks(kb)
    if ta and tb:
        sa, sb = set(ta), set(tb)
        short, long_ = (sa, sb) if len(sa) <= len(sb) else (sb, sa)
        if short <= long_ and sum(len(t) for t in short) >= 4: return 0.92
        ja, jb = ''.join(ta), ''.join(tb)
        if ja == jb: return 0.97
        if len(ja) >= 5 and len(jb) >= 5 and (ja in jb or jb in ja): return 0.9
    r = difflib.SequenceMatcher(None, ka, kb).ratio()
    r2 = difflib.SequenceMatcher(None, pa, pb).ratio() if pa and pb else 0
    return max(r, r2) * 0.98

par = list(range(len(C)))
def find(i):
    while par[i] != i:
        par[i] = par[par[i]]; i = par[i]
    return i
def union(i, j):
    i, j = find(i), find(j)
    if i != j: par[j] = i

# OSM "twins": the same business mapped twice (same name + category within 25 m, or two unnamed POIs of one category within 13 m) -> one entity
def osm_twins(a, b):
    d = dist((a['x'], a['z']), (b['x'], b['z']))
    if a['cat'] != b['cat']: return False
    if a.get('unnamed') and b.get('unnamed'): return d < 13 and a['cat'] not in ('kiosk_tobacco_betting', 'kiosk')
    return (not a.get('unnamed')) and (not b.get('unnamed')) and a['key'] == b['key'] and d < 25
grid = collections.defaultdict(list)
for i, c in enumerate(C): grid[(int(c['x'] // 100), int(c['z'] // 100))].append(i)
why = {}
for i, a in enumerate(C):
    gx, gz = int(a['x'] // 100), int(a['z'] // 100)
    for dx in (-2, -1, 0, 1, 2):
        for dz in (-2, -1, 0, 1, 2):
            for j in grid.get((gx + dx, gz + dz), ()):
                if j <= i: continue
                b = C[j]
                if a['src'] == b['src'] == 'osm':
                    if osm_twins(a, b): union(i, j)
                    continue
                d = dist((a['x'], a['z']), (b['x'], b['z']))
                if d > 200: continue
                s = name_sim(a, b)
                gen = a['key'] in GEN or b['key'] in GEN or a.get('unnamed') or b.get('unnamed')
                same_addr = a['street'] and a['street'] == b['street'] and a['num'] is not None and a['num'] == b['num']
                same_phone = a['phone'] and a['phone'] == b['phone']
                same_web = a['web'] and a['web'] == b['web']
                ok = False
                if gen:
                    ok = (a.get('unnamed') or b.get('unnamed')) and a['cat'] == b['cat'] and d < 12 and not (a['src'] == 'osm' and b['src'] == 'osm')
                    ok = ok or (s >= 0.97 and d < 15)
                elif s >= 0.9 and d < 60: ok = True
                elif s >= 0.9 and d < 200 and (same_addr or same_phone): ok = True
                elif s >= 0.8 and d < 40 and (same_addr or same_phone or same_web or a['cat'] == b['cat']): ok = True
                elif s >= 0.6 and d < 120 and same_phone: ok = True
                elif s >= 0.6 and d < 60 and same_addr and (same_web or a['cat'] == b['cat']): ok = True
                elif same_phone and same_addr and d < 80: ok = True
                if ok: union(i, j)
# directory entries signed with the owner's surname ('Περίπτερο Λώλης', 'Φαρμακείο Μπίσιας') = the nearest unnamed OSM POI of that category
# (directory coordinates are 25-70 m off, see raw:vrisko validation); one-to-one, nearest first, within 60 m.
pairs = []
for i, a in enumerate(C):
    if a['src'] != 'vrisko' or not a.get('person'): continue
    for j, b in enumerate(C):
        if b['src'] == 'osm' and b.get('unnamed') and b['cat'] == a['cat']:
            d = dist((a['x'], a['z']), (b['x'], b['z']))
            if d < 60: pairs.append((d, i, j))
used_i, used_j = set(), set()
for d, i, j in sorted(pairs):
    if i in used_i or j in used_j: continue
    used_i.add(i); used_j.add(j); union(j, i)
clusters = collections.defaultdict(list)
for i in range(len(C)): clusters[find(i)].append(C[i])

# split clusters that contain several OSM POIs (distinct branches chained by a noisy source): attach non-OSM members to the nearest OSM member
final = []; NTWIN = 0
for cl in clusters.values():
    osm = [c for c in cl if c['src'] == 'osm']
    if len(osm) <= 1: final.append(cl); continue
    reps = []; twins = collections.defaultdict(list)
    for o in osm:
        r = next((q for q in reps if osm_twins(q, o)), None)
        if r is None: reps.append(o)
        else: twins[id(r)].append(o); NTWIN += 1
    osm = reps
    if len(osm) == 1: final.append(cl); continue
    groups = [[o] + twins[id(o)] for o in osm]
    for c in cl:
        if c['src'] == 'osm': continue
        k = min(range(len(osm)), key=lambda q: dist((osm[q]['x'], osm[q]['z']), (c['x'], c['z'])))
        groups[k].append(c)
    final += groups

# ---------------------------------------------------------------- per-entity resolution
ERR = {'fsq': 22.0, 'overture': 28.0, 'web': 20.0, 'vrisko': 40.0}   # calibrated against OSM in validate() below (median error of raw coordinates)
PRI = {'osm': 0, 'web': 1, 'fsq': 2, 'overture': 3, 'vrisko': 4}
THIS_YEAR = 2026

def locate(cl, ignore_osm=False):
    """returns dict(x,z,posMethod,posErrM,how)"""
    o = [c for c in cl if c['src'] == 'osm']
    if o and not ignore_osm:
        c = o[0]
        return dict(x=c['x'], z=c['z'], posMethod='source', posErrM=6.0 if c.get('way') else 3.0, how='osm')
    rest = sorted([c for c in cl if c['src'] != 'osm'], key=lambda c: PRI[c['src']])
    if not rest: return None
    ads = [c for c in rest if c['street'] and c['num'] is not None]
    g = None
    for c in ads:
        g = AM.geocode(c['street'], c['num'])
        if g: break
    real = [c for c in rest if not c.get('_geocoded')]   # web entries without coordinates were geocoded: not an independent position
    if not real:
        if g: return dict(x=g['x'], z=g['z'], posMethod='geocoded', posErrM=g['errM'], how='addr:' + g['how'] + '(web address)')
        real = rest
    src = real[0]
    others = [c for c in real if c is not src and c['src'] != src['src']]
    agree = any(dist((c['x'], c['z']), (src['x'], src['z'])) < 15 for c in others)
    if g and g['how'].startswith('exact-osm'):
        return dict(x=g['x'], z=g['z'], posMethod='geocoded', posErrM=6.0, how='addr:' + g['how'])
    if g and g['errM'] <= 15:
        return dict(x=g['x'], z=g['z'], posMethod='geocoded', posErrM=g['errM'], how='addr:' + g['how'])
    if g and not agree and dist((g['x'], g['z']), (src['x'], src['z'])) >= 25:
        # the preferred source disagrees with the address: take another source that agrees with the address, else the address itself
        alt = [c for c in real if dist((c['x'], c['z']), (g['x'], g['z'])) < 25]
        if alt: src = alt[0]
        elif g['errM'] <= 30:
            return dict(x=g['x'], z=g['z'], posMethod='geocoded', posErrM=g['errM'] + 5,
                        how='addr:' + g['how'] + '(coords %dm away)' % dist((g['x'], g['z']), (src['x'], src['z'])))
    sx, sz, serr = src['x'], src['z'], ERR[src['src']]
    if agree: serr = 12.0
    how = 'coords:' + src['src']
    if g:
        dg = dist((g['x'], g['z']), (sx, sz))
        if dg < 25: serr = min(serr, 14.0); how += '+addr-agrees'
    # snap the raw coordinate to a street-facing facade
    st = src['street'] or next((c['street'] for c in rest if c['street']), None)
    snapped = None
    if st and st in AM.axis:
        s, d, side = AM.project(st, sx, sz)
        # side of the street from the house-number parity when known (raw points often fall in the carriageway)
        num_ = next((c['num'] for c in rest if c['street'] and c['num'] is not None and AM.street(c['street']) == st), None)
        mod_ = AM.models.get(st) or {}
        if num_ is not None and mod_.get('ok'): side = mod_['side'][num_ % 2]
        if d < 45:
            fx, fz, fh = AM.facade_point(st, s, side)
            if fh == 'facade' and dist((fx, fz), (sx, sz)) < 30: snapped = (fx, fz)
    if snapped is None:
        p = Point(sx, sz); best = None
        for i in AM.btree.query(p.buffer(30)):
            e = AM.bpolys[i].exterior; q = e.interpolate(e.project(p)); dd = q.distance(p)
            if best is None or dd < best[0]: best = (dd, q.x, q.y)
        if best and best[0] < 30: snapped = (best[1], best[2]); how += '/nearest-facade'
    else: how += '/street-facade'
    if snapped: sx, sz = snapped
    return dict(x=sx, z=sz, posMethod='source', posErrM=serr, how=how)

def pick_name(cl):
    o = [c for c in cl if c['src'] == 'osm' and not c.get('unnamed')]
    if o: return o[0]['name'], (o[0].get('name_en') or '')
    cands = sorted([c for c in cl if not c.get('unnamed')] or cl, key=lambda c: (PRI[c['src']], -len(c['name'])))
    # prefer a name shared by two sources
    cnt = collections.Counter(c['key'] for c in cands)
    cands.sort(key=lambda c: (-cnt[c['key']], PRI[c['src']], len(c['name'])))
    n = cands[0]['name']
    if n.isupper() and len(n) > 4 and has_greek(n): pass
    return n, ''

def latin(name, cl, name_en):
    if name_en: return name_en
    if not has_greek(name): return name
    k = norm(name)
    for c in cl:
        if not has_greek(c['name']) and difflib.SequenceMatcher(None, norm(c['name']), k).ratio() > 0.75: return c['name']
    return translit(name)

def nearest_street(x, z):
    best = None; p = Point(x, z)
    for n, ax in AM.axis.items():
        d = ax.distance(p)
        if best is None or d < best[0]: best = (d, n)
    return best[1] if best and best[0] < 45 else None

# second pass on resolved entities: raw coordinates can be far off (an Overture ATM 450 m away whose address is
# Kolokotroni 1), so compare entities at their resolved positions. Same name (or one name contained in the other)
# within 45 m, or an identical non-generic name within 90 m, is one business -- unless both carry different OSM objects.
def _ent(cl):
    loc = locate(cl)
    if not loc: return None
    osm = [c for c in cl if c['src'] == 'osm']
    keys = {c['key'] for c in cl}; gen = all((c['key'] in GEN) or c.get('unnamed') for c in cl)
    return dict(x=loc['x'], z=loc['z'], osm=bool(osm), keys=keys, gen=gen, cats={c['cat'] for c in cl}, cl=cl)
ENT = [e for e in (_ent(cl) for cl in final) if e]
par2 = list(range(len(ENT)))
def f2(i):
    while par2[i] != i: par2[i] = par2[par2[i]]; i = par2[i]
    return i
NPASS2 = 0; P2LOG = []
for i, a in enumerate(ENT):
    for j in range(i + 1, len(ENT)):
        b = ENT[j]
        if a['gen'] or b['gen']: continue
        d = dist((a['x'], a['z']), (b['x'], b['z']))
        if d > 90: continue
        ri, rj = f2(i), f2(j)
        if ri == rj: continue
        if ENT[ri]['osm'] and ENT[rj]['osm']: continue
        best = max(name_sim({'key': ka, 'name': ka}, {'key': kb, 'name': kb}) for ka in a['keys'] for kb in b['keys'])
        exact = bool(a['keys'] & b['keys']) and min(len(k) for k in (a['keys'] & b['keys'])) >= 4
        catok = bool(a['cats'] & b['cats']) or bool((a['cats'] | b['cats']) & {'shop', 'other', 'atm'}) or {'clinic', 'optician'} <= (a['cats'] | b['cats'])
        if catok and ((exact and d < 85) or (best >= 0.9 and d < 45)):
            par2[rj] = ri; ENT[ri]['osm'] = ENT[ri]['osm'] or ENT[rj]['osm']; NPASS2 += 1
            P2LOG.append(f"{d:.0f} m | {sorted(a['keys'])} {sorted(a['cats'])} | {sorted(b['keys'])} {sorted(b['cats'])}")
g2 = collections.defaultdict(list)
for i, e in enumerate(ENT): g2[f2(i)] += e['cl']
final = list(g2.values())
open(os.path.join(WORK, 'pass2_merges.txt'), 'w', encoding='utf-8').write('\n'.join(P2LOG) + '\n')
places = []; dbg = []; OUTAREA = []
for cl in final:
    cl.sort(key=lambda c: PRI[c['src']])
    srcs = sorted({c['src'] for c in cl}, key=lambda s: PRI[s])
    loc = locate(cl)
    if not loc or not in_area(loc['x'], loc['z']):
        OUTAREA.append(dict(loc=(loc and [round(loc['x'], 1), round(loc['z'], 1), loc['how']]), members=[(c['src'], c['name'], c.get('addr') or '', round(c['x'], 1), round(c['z'], 1)) for c in cl])); continue
    name, name_en = pick_name(cl)
    rebrand = None
    for rb in OVR.get('rebrand', []):
        if any(c['key'] == norm(rb['match']) for c in cl) and any((c.get('street') or '') == rb.get('street', c.get('street')) for c in cl):
            rebrand = rb; old_name = name; name, name_en = rb['name'], rb.get('nameLatin', '')
    # category: first non-generic by priority
    cat, sl = next(((c['cat'], c['sl']) for c in cl if c['cat'] not in ('shop', 'other')), (cl[0]['cat'], cl[0]['sl']))
    # open?
    closed_by = [c['src'] for c in cl if c['open'] is False]
    fresh = max([int(c['fresh']) for c in cl if c.get('fresh') and str(c['fresh']).isdigit()] or [0])
    has_osm = 'osm' in srcs; has_web = 'web' in srcs
    ovc = max([c['srcconf'] for c in cl if c['src'] == 'overture' and c['open'] is not False] or [0])
    fsq_fresh = max([int(c['fresh']) for c in cl if c['src'] == 'fsq' and c.get('fresh') and c['open'] is not False] or [0])
    fsq_closed = max([int(c['fresh'] or 0) for c in cl if c['src'] == 'fsq' and c['open'] is False] or [0])
    web_closed = any(c['src'] == 'web' and c['open'] is False for c in cl)
    still = ovc >= 0.5 or (fsq_fresh and fsq_fresh >= fsq_closed)
    if web_closed: opn, conf = False, 0.1
    elif has_osm and (not closed_by or still): opn, conf = True, 0.9 + (0.05 if len(srcs) > 1 else 0)
    elif has_osm: opn, conf = None, 0.6
    else:
        conf = 0.0
        if ovc: conf = max(conf, 0.25 + 0.6 * ovc)
        if fsq_fresh: conf = max(conf, 0.2 if fsq_fresh < 2017 else 0.3 if fsq_fresh < 2020 else 0.45 if fsq_fresh < 2023 else 0.6)
        if ovc and fsq_fresh: conf = min(0.9, conf + 0.12)
        if closed_by and not (ovc >= 0.7 or (fsq_fresh and fsq_fresh > fsq_closed)): opn, conf = False, min(max(conf, 0.1), 0.15)
        else: opn = True if conf >= 0.7 else None
    if 'vrisko' in srcs and not web_closed and opn is not False:   # listed in the yellow pages (vrisko.gr, current listing; no date)
        others = [x for x in srcs if x not in ('vrisko', 'osm')]
        if has_osm: conf = max(conf, 0.95)
        elif others: conf = min(0.9, max(conf, 0.5) + 0.2)
        else: conf = max(conf, 0.5)
        opn = True if conf >= 0.7 else opn
    if has_web and not web_closed:   # web evidence: confidence = the better of the web source and the other sources
        wc = max(c['srcconf'] for c in cl if c['src'] == 'web')
        conf = max(conf, wc, 0.95 if has_osm else 0); opn = True if conf >= 0.5 else opn
    tier = 'X' if opn is False else 'A' if (has_osm and opn) or conf >= 0.8 else 'B' if conf >= 0.5 else 'C'
    street = next((c['street'] for c in cl if c['street']), None)
    numraw = next((c['numraw'] for c in cl if c['street'] and c.get('numraw')), None)
    street_how = 'address' if street else None
    if not street:
        street = nearest_street(loc['x'], loc['z']); street_how = 'nearest' if street else None
    lat, lon = LL(loc['x'], loc['z'])
    oid = next((c['sid'] for c in cl if c['src'] == 'osm'), None)
    pid = ('osm:' + oid) if oid else next((('fsq:' if c['src'] == 'fsq' else 'ovt:' if c['src'] == 'overture' else '') + c['sid'] for c in cl if c['src'] != 'vrisko'), None) \
        or 'vr:' + hashlib.md5(cl[0]['sid'].encode()).hexdigest()[:10]
    sources = []
    for c in cl:
        if c['src'] == 'osm': sources.append('osm:' + c['sid'])
        elif c['src'] == 'fsq': sources.append('fsq:' + c['sid'])
        elif c['src'] == 'overture': sources.append('overture:' + c['sid'] + ('(' + '+'.join(c.get('via') or []) + ')' if c.get('via') else ''))
        elif c['src'] == 'vrisko': sources.append('vrisko:' + c['sid'])
        else: sources += ['web:' + u for u in (c.get('urls') or [c['sid']])]
    e = dict(id=pid, name=name, nameLatin=latin(name, cl, name_en), category=cat, street=street, number=(str(numraw) if numraw else None),
             lat=round(lat, 7), lon=round(lon, 7), x=round(loc['x'], 1), z=round(loc['z'], 1), posMethod=loc['posMethod'], posErrM=round(loc['posErrM'], 1),
             open=opn, sources=sources, confidence=round(min(conf, 0.98), 2), tier=tier, streetLevel=sl, streetFrom=street_how, inPlayable=PLAY.contains(Point(loc['x'], loc['z'])),
             inFocus=FOCUS.contains(Point(loc['x'], loc['z'])))
    if oid: e['osm'] = oid
    if any(c.get('unnamed') for c in cl) and name in OSM_GENERIC.values(): e['unnamed'] = True
    ph = next((c['phone'] for c in cl if c['phone']), None)
    if ph: e['phone'] = ph
    wb = next((c['web'] for c in cl if c['web']), None)
    if wb: e['website'] = wb
    if rebrand:
        e['rebrandedFrom'] = old_name; e['rebrandNote'] = rebrand['note']; e['sources'] += ['web:' + u for u in rebrand.get('sources', [])]
    if all(c.get('inside') for c in cl if c['src'] == 'vrisko') and any(c.get('inside') for c in cl) and not any(c['src'] == 'osm' for c in cl): e['streetLevel'] = False; e['inside'] = True
    alts = sorted({c['name'] for c in cl if c['name'] != name and norm(c['name']) != norm(name)})
    if alts: e['altNames'] = alts[:4]
    if fresh: e['lastSeen'] = fresh
    places.append(e)
    dbg.append(dict(id=pid, how=loc['how'], members=[dict(src=c['src'], name=c['name'], cat=c['rawcat'], addr=c.get('addr') or ((c.get('street_raw') or '') + ' ' + (c.get('numraw') or '')), x=round(c['x'], 1), z=round(c['z'], 1), fresh=c.get('fresh')) for c in cl]))

# ---------------------------------------------------------------- validation of non-OSM positions against OSM (same entity in both)
val = collections.defaultdict(list)
for cl in final:
    o = [c for c in cl if c['src'] == 'osm']
    if not o or o[0].get('way') or len(cl) < 2: continue
    for c in cl:
        if c['src'] in ('fsq', 'overture', 'vrisko'): val['raw:' + c['src']].append(dist((c['x'], c['z']), (o[0]['x'], o[0]['z'])))
    loc = locate(cl, ignore_osm=True)
    if loc:
        d = dist((loc['x'], loc['z']), (o[0]['x'], o[0]['z']))
        val['final:' + loc['posMethod']].append(d); val['final:all'].append(d)
        val['ratio'].append(d / loc['posErrM'])
def q(L, f): L = sorted(L); return L[min(len(L) - 1, int(len(L) * f))] if L else None
VAL = {k: dict(n=len(v), median=round(q(v, .5), 1), p75=round(q(v, .75), 1), p90=round(q(v, .9), 1)) for k, v in val.items()}
VAL['geocoderLOO'] = ADDR.loo(AM)[0]

# de-stack: entries at (almost) the same point are spread along the nearest building edge, 4 m apart, so each gets its own bay
places.sort(key=lambda e: (e['x'], e['z']))
def spread():
    used = collections.defaultdict(list)
    for e in places: used[(round(e['x'] / 2.5), round(e['z'] / 2.5))].append(e)
    n = 0
    for grp in used.values():
        if len(grp) < 2: continue
        grp.sort(key=lambda e: (e['posMethod'] != 'source' or 'osm' not in e, -e['confidence']))
        p = Point(grp[0]['x'], grp[0]['z']); best = None
        for i in AM.btree.query(p.buffer(12)):
            ex = AM.bpolys[i].exterior; d = ex.distance(p)
            if best is None or d < best[0]: best = (d, ex)
        if not best or best[0] > 8: continue
        ex = best[1]; s0 = ex.project(p); L = ex.length
        for k, e in enumerate(grp[1:], 1):
            if 'osm' in e: continue
            off = ((k + 1) // 2) * 4.0 * (1 if k % 2 else -1)
            qpt = ex.interpolate((s0 + off) % L)
            e['x'], e['z'] = round(qpt.x, 1), round(qpt.y, 1)
            lat, lon = LL(qpt.x, qpt.y); e['lat'], e['lon'] = round(lat, 7), round(lon, 7)
            e['posErrM'] = round(e['posErrM'] + 4, 1); e['spread'] = True; n += 1
    return n
NSPREAD = spread()

# ---------------------------------------------------------------- output
places.sort(key=lambda e: ((e['street'] or 'ω'), int(re.match(r'\d+', e['number']).group(0)) if e['number'] and re.match(r'\d+', e['number']) else 9999, e['name']))
def src_class(e): return sorted({s.split(':')[0] for s in e['sources']})
bySource = collections.Counter(); byCombo = collections.Counter()
for e in places:
    for s in src_class(e): bySource[s] += 1
    byCombo['+'.join(src_class(e))] += 1
live = [e for e in places if e['open'] is not False]
AB = [e for e in places if e['tier'] in 'AB']
counts = dict(total=len(places), tierA=sum(1 for e in places if e['tier']=='A'), tierB=sum(1 for e in places if e['tier']=='B'), tierC=sum(1 for e in places if e['tier']=='C'), tierX=sum(1 for e in places if e['tier']=='X'),
              buildSet=len(AB), buildSetNewVsOsm=sum(1 for e in AB if 'osm' not in e), buildSetStreetLevel=sum(1 for e in AB if e['streetLevel'] is not False), buildSetInPlayable=sum(1 for e in AB if e['inPlayable']), notClosed=len(live), believedOpen=sum(1 for e in places if e['open'] is True), unknownOpen=sum(1 for e in places if e['open'] is None),
              closed=sum(1 for e in places if e['open'] is False), inPlayable=sum(1 for e in live if e['inPlayable']), inFocus=sum(1 for e in live if e['inFocus']),
              newVsOsm=sum(1 for e in live if 'osm' not in e), newVsOsmConf50=sum(1 for e in live if 'osm' not in e and e['confidence'] >= 0.5),
              streetLevelLikely=sum(1 for e in live if e['streetLevel'] is not False),
              bySource=dict(bySource.most_common()), bySourceCombination=dict(byCombo.most_common()),
              byCategory=dict(collections.Counter(e['category'] for e in live).most_common()),
              byStreet=dict(collections.Counter(e['street'] or '(unknown)' for e in live).most_common()),
              byPosMethod=dict(collections.Counter(e['posMethod'] for e in live)))
out = dict(version=int(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M')), generated=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
           about="Census of businesses/shopfronts in the Grand Kifisia play area. Positions: OSM survey points where available, else an address geocoded on OSM house numbers, "
                 "else the source's own coordinate snapped to the nearest street-facing facade. posErrM is an estimate (see docs/research/CENSUS.md). Not a 'verified' ground survey.",
           coord="x=(lon-23.8125)*87716, z=-(lat-38.0727)*110998 (metres)",
           fields=dict(open="true = believed open, null = unknown (old/unconfirmed listing), false = reported closed", streetLevel="true = street-level shopfront likely, false = upper-floor office/practice likely (door plate, not a shop window), null = unknown",
                       posMethod="source = coordinate from the source (OSM, or Foursquare/Overture snapped to a facade); geocoded = from street + house number", confidence="0..1 that the business exists today at this place",
                       tier="A = confirmed (OSM survey, web-verified, or two fresh independent listings); B = one fresh listing (2023+ / Overture confidence >= ~0.45); C = old or weak listing, existence today unknown; X = reported closed. BUILD tiers A and B; C/X are history (use for vacant/'TO LET' fronts at most)"),
           sourcesUsed=dict(osm='kif.osm (OpenStreetMap contributors, ODbL)', overture=OV_FILE + ' (Overture Maps places, CDLA-Permissive-2.0)', fsq='Foursquare OS Places release ' + FSQ_REL + ' (Apache-2.0)', web='store locators / directories, see tools/census/web_entries.json'),
           counts=counts, positionValidation=VAL, places=places)
jdump(dict(dbg=dbg, outArea=OUTAREA, dropped=[dict(src=c['src'], name=c['name'], cat=c['rawcat']) for c in dropped], webfail=[w for w in WEB if w.get('_fail')]), os.path.join(WORK, 'census_debug.json'))
if '--no-publish' in sys.argv:
    jdump(out, os.path.join(WORK, 'census_preview.json'), indent=0)
else:
    os.makedirs(os.path.join(ROOT, 'gk3', 'data'), exist_ok=True)
    jdump(out, os.path.join(ROOT, 'gk3', 'data', 'census.json'), separators=(',', ':'))
    jdump(out, os.path.join(WORK, 'census_preview.json'), indent=0)
print(json.dumps({k: v for k, v in counts.items() if not isinstance(v, dict)}, ensure_ascii=False))
print('bySource', counts['bySource']); print('combos', counts['bySourceCombination']); print('posMethod', counts['byPosMethod'])
print('validation', json.dumps(VAL)); print('pass2 merges', NPASS2, 'osm twins', NTWIN); print('spread', NSPREAD, 'dropped(non-business)', len(dropped), 'candidates', len(C), 'webfail', sum(1 for w in WEB if w.get('_fail')))
print('cats', counts['byCategory'])
