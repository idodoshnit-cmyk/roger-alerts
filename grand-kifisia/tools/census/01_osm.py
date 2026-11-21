#!/usr/bin/env python3
"""Extract from kif.osm: POIs (named or not), house-number points, named street polylines.
Outputs work/research-census/osm_pois.json, osm_addr.json, osm_streets.json"""
import xml.etree.ElementTree as ET, sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
t = ET.parse(os.path.join(ROOT, 'kif.osm')).getroot()
nodes = {}; ntags = {}
for n in t.iter('node'):
    nodes[n.get('id')] = (float(n.get('lat')), float(n.get('lon')))
    tg = {x.get('k'): x.get('v') for x in n.findall('tag')}
    if tg: ntags[n.get('id')] = tg
ways = {}
for w in t.iter('way'):
    ways[w.get('id')] = ([r.get('ref') for r in w.findall('nd')], {x.get('k'): x.get('v') for x in w.findall('tag')})
rels = {}
for r in t.iter('relation'):
    rels[r.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in r.findall('member')], {x.get('k'): x.get('v') for x in r.findall('tag')})

def centroid(refs):
    pts = [nodes[r] for r in refs if r in nodes]
    if not pts: return None
    if len(pts) > 2 and refs[0] == refs[-1]:
        # area centroid in projected coords
        xy = [P(*p) for p in pts]
        A = cx = cz = 0
        for i in range(len(xy) - 1):
            c = xy[i][0] * xy[i+1][1] - xy[i+1][0] * xy[i][1]
            A += c; cx += (xy[i][0] + xy[i+1][0]) * c; cz += (xy[i][1] + xy[i+1][1]) * c
        if abs(A) > 1e-6:
            return LL(cx / (3 * A), cz / (3 * A))
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))

KEYS = ['shop', 'amenity', 'office', 'craft', 'tourism', 'leisure', 'healthcare', 'club', 'historic']
SKIP_AMEN = {'bench','waste_basket','recycling','parking','parking_space','parking_entrance','bicycle_parking','motorcycle_parking','telephone','post_box','drinking_water','fountain','vending_machine','toilets','shelter','waste_disposal','atm','bbq','clock','grit_bin','charging_station','taxi','bus_station','loading_dock','hunting_stand','water_point','lounger','letter_box'}
SKIP_LEIS = {'swimming_pool','pitch','garden','park','playground','picnic_table','outdoor_seating','common','track','nature_reserve','firepit','slipway','bleachers'}
SKIP_TOUR = {'information','artwork','viewpoint','picnic_site','attraction'}
pois = []; addr = []
def handle(kind, id_, tg, ll, poly=None):
    if not ll: return
    if 'addr:housenumber' in tg:
        addr.append({'osm': f'{kind}/{id_}', 'street': tg.get('addr:street'), 'number': tg['addr:housenumber'], 'lat': ll[0], 'lon': ll[1], 'isPoi': any(k in tg for k in KEYS), 'kind': kind})
    for k in KEYS:
        if k in tg:
            v = tg[k]
            if k == 'amenity' and v in SKIP_AMEN: continue
            if k == 'leisure' and v in SKIP_LEIS: continue
            if k == 'tourism' and v in SKIP_TOUR: continue
            if k == 'historic' and not tg.get('name'): continue
            if v in ('no', 'vacant') and not tg.get('name'): continue
            x, z = P(*ll)
            pois.append({'osm': f'{kind}/{id_}', 'key': k, 'value': v, 'name': tg.get('name') or tg.get('brand') or tg.get('operator') or '',
                         'name_en': tg.get('name:en') or tg.get('int_name') or '', 'name_el': tg.get('name:el') or '', 'brand': tg.get('brand', ''),
                         'street': tg.get('addr:street', ''), 'number': tg.get('addr:housenumber', ''), 'lat': ll[0], 'lon': ll[1], 'x': round(x, 1), 'z': round(z, 1),
                         'tags': {a: b for a, b in tg.items() if a in ('cuisine','opening_hours','phone','contact:phone','website','contact:website','level','operator','disused','disused:shop','disused:amenity','shop','amenity','office','craft','tourism','leisure','healthcare','clothes','brand:wikidata','takeaway','outdoor_seating','description','check_date','survey:date')}})
            break
for id_, tg in ntags.items():
    handle('node', id_, tg, nodes[id_])
for id_, (refs, tg) in ways.items():
    if tg: handle('way', id_, tg, centroid(refs))
for id_, (mem, tg) in rels.items():
    if tg and tg.get('type') == 'multipolygon':
        outer = [m for m in mem if m[0] == 'way' and m[2] in ('outer', '') and m[1] in ways]
        if outer: handle('relation', id_, tg, centroid(ways[outer[0][1]][0]))
# disused / vacant shops (lifecycle prefixes) are recorded separately
closed = []
for id_, tg in ntags.items():
    for k, v in tg.items():
        if k.startswith(('disused:', 'was:', 'abandoned:', 'closed:')) and k.split(':', 1)[1] in KEYS and (tg.get('name') or tg.get('old_name')):
            x, z = P(*nodes[id_])
            closed.append({'osm': f'node/{id_}', 'name': tg.get('name') or tg.get('old_name'), 'was': k + '=' + v, 'lat': nodes[id_][0], 'lon': nodes[id_][1], 'x': round(x, 1), 'z': round(z, 1)})
            break
# streets
streets = collections.defaultdict(list)
for id_, (refs, tg) in ways.items():
    if 'highway' in tg and tg.get('name'):
        pts = [nodes[r] for r in refs if r in nodes]
        streets[tg['name']].append({'way': id_, 'highway': tg['highway'], 'name_en': tg.get('name:en', ''), 'oneway': tg.get('oneway', ''), 'pts': [[round(a, 7), round(b, 7)] for a, b in pts]})
jdump(pois, os.path.join(WORK, 'osm_pois.json'))
jdump(addr, os.path.join(WORK, 'osm_addr.json'))
jdump(closed, os.path.join(WORK, 'osm_closed.json'))
jdump(streets, os.path.join(WORK, 'osm_streets.json'))
print('pois', len(pois), 'named', sum(1 for p in pois if p['name']), 'addr', len(addr), 'closed', len(closed), 'streets', len(streets))
c = collections.Counter(a['street'] for a in addr)
print(c.most_common(30))
print(collections.Counter(p['key'] + '=' + p['value'] for p in pois).most_common(60))
