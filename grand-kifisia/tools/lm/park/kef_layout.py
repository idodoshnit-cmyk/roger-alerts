# lm-park: Kefalari grove (Άλσος Κεφαλαρίου, OSM way 119884594) layout in world metres, embedded into js/89f_lm_park.js
# between /*KEFLAYOUT*/ and /*ENDKEFLAYOUT*/.
# Sources: OSM (tools/lm/park/kef_osm.json from extract2.py: outline, gravel footways (lit=yes), basin, footbridge, buildings,
# benches, busts, statue, 1872 fountain) + photo ref/r04.jpg (Commons "Άλσος Κεφαλαρίου 8587.JPG", C messier, CC BY-SA 4.0:
# tall Atlas cedars, Aleppo pines, a few deciduous trees, lawns, agave + shrub beds, irregular stones lining the gravel walks,
# globe-cluster lamps). OSM has no trees here: tree positions are generated (Poisson disc in the lawns) = INFERRED.
# Usage: python3 kef_layout.py ROOT JSFILE
import sys, json, math, random
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union
R = sys.argv[1]; JS = sys.argv[2]
d = json.load(open(R + '/tools/lm/park/kef_osm.json'))
K = Polygon(d['park']).buffer(0)
W = {w['id']: w for w in d['ways']}
rnd = random.Random(1872)
walk_ids = ['1078561010', '1078561011', '1078561012', '1078561013', '1078561014', '1078561015']
walks = [LineString(W[i]['pts']) for i in walk_ids]
WALKW = 3.6
walk_poly = unary_union([w.buffer(WALKW / 2, cap_style=1, join_style=1) for w in walks]).intersection(K)
# the pedestrian street along the west edge (paved, built by the streets module) and the church forecourt: kept free
ped = LineString(W['204807770']['pts']).buffer(3.0)
basin = Polygon(W['374724984']['pts']).buffer(0)
bridge = LineString(W['1078561016']['pts'])
bld = [Polygon(W[i]['pts']).buffer(0) for i in ['123694055', '380206161', '1078561017', '1078561018', '1078561019', '1078567935']]
bldU = unary_union(bld)
church_yard = bld[0].buffer(6.0)          # paved forecourt around the church (not lawn)
lawn = K.difference(walk_poly).difference(basin.buffer(1.4)).difference(bldU.buffer(1.2)).difference(ped).difference(church_yard).buffer(-0.05)
paved = K.intersection(unary_union([church_yard.difference(bldU), ped.intersection(K)])).difference(bldU)
def rings(g):
    out = []
    gs = [g] if g.geom_type == 'Polygon' else list(getattr(g, 'geoms', []))
    for p in gs:
        if p.geom_type != 'Polygon' or p.area < 4: continue
        out.append({'o': [[round(x, 2), round(z, 2)] for x, z in list(p.exterior.coords)[:-1]],
                    'h': [[[round(x, 2), round(z, 2)] for x, z in list(i.coords)[:-1]] for i in p.interiors if Polygon(i).area > 1]})
    return out
# beds: agave + shrub beds on the lawn at the walk edges near junctions (photo r04)
beds = []
junc = [(666.71, -236.55), (680.77, -237.6), (675.19, -260.46), (697.24, -225.83), (701.09, -267.7), (741.82, -257.18), (702.77, -279.43)]
for (jx, jz) in junc:
    for k in range(2):
        a = rnd.random() * math.tau
        c = Point(jx + math.cos(a) * 5.5, jz + math.sin(a) * 5.5)
        b = c.buffer(1.6 + rnd.random() * 1.3, 8)
        b = Polygon([(c.x + (x - c.x) * (1 + 0.5 * math.cos(i * 1.7)), c.y + (z - c.y) * (0.8 + 0.3 * math.sin(i))) for i, (x, z) in enumerate(b.exterior.coords)]).buffer(0)
        b = b.intersection(lawn).buffer(-0.3)
        if b.area > 3 and not any(b.intersects(Polygon(x['o'])) for x in beds):
            gs = [b] if b.geom_type == 'Polygon' else list(b.geoms)
            g = max(gs, key=lambda p: p.area)
            beds.append({'o': [[round(x, 2), round(z, 2)] for x, z in list(g.exterior.coords)[:-1]], 'agaves': max(1, int(g.area / 4))})
bedU = unary_union([Polygon(b['o']) for b in beds]) if beds else Polygon()
# trees (inferred): Poisson disc in the lawn, away from walks/buildings/basin
SP = [('cedar', 0.38, 11, 15), ('aleppo', 0.30, 10, 14), ('plane', 0.12, 11, 14), ('holmoak', 0.10, 7, 9), ('cypress', 0.10, 3, 4)]
trees = []
inner = lawn.buffer(-1.8).difference(bedU.buffer(1.0))
minx, minz, maxx, maxz = inner.bounds
tries = 0
while tries < 20000 and len(trees) < 110:
    tries += 1
    x = minx + rnd.random() * (maxx - minx); z = minz + rnd.random() * (maxz - minz)
    if not inner.contains(Point(x, z)): continue
    r = rnd.random(); acc = 0
    for sp, p, d0, d1 in SP:
        acc += p
        if r <= acc: break
    dia = d0 + rnd.random() * (d1 - d0)
    ok = all(math.hypot(x - t[0], z - t[1]) > 0.42 * (dia + t[3]) for t in trees)
    if ok: trees.append([round(x, 2), round(z, 2), sp, round(dia, 1), 'inferred (photo r04 species mix)'])
# stones lining the walks where they meet the lawn (photo r04): every ~0.9 m with gaps
stones = []
edge = walk_poly.boundary.intersection(lawn.buffer(0.6))
segs = [edge] if edge.geom_type == 'LineString' else [g for g in getattr(edge, 'geoms', []) if g.geom_type == 'LineString']
for s in segs:
    L = s.length; t = rnd.random()
    while t < L:
        if rnd.random() < 0.8:
            p = s.interpolate(t); q = s.interpolate(min(L, t + 0.1))
            ang = math.atan2(q.y - p.y, q.x - p.x)
            stones.append([round(p.x, 2), round(p.y, 2), round(0.35 + rnd.random() * 0.4, 2), round(ang, 2)])
        t += 0.75 + rnd.random() * 0.5
# lamps (globe_cluster, photo r04) along the lit walks, every ~22 m, 2.3 m to alternate sides
lamps = []
for w in walks:
    L = w.length; t = 6.0; side = 1
    while t < L - 3:
        p = w.interpolate(t); q = w.interpolate(min(L, t + 0.5))
        dx, dz = q.x - p.x, q.y - p.y; l = math.hypot(dx, dz) or 1
        x, z = p.x - dz / l * 2.3 * side, p.y + dx / l * 2.3 * side
        if K.contains(Point(x, z)) and all(math.hypot(x - a[0], z - a[1]) > 12 for a in lamps) and not bldU.buffer(1).contains(Point(x, z)) and not basin.buffer(0.8).contains(Point(x, z)):
            lamps.append([round(x, 2), round(z, 2)])
        t += 22; side = -side
out = {'park': [[round(x, 2), round(z, 2)] for x, z in d['park'][:-1]], 'lawn': rings(lawn), 'walks': rings(walk_poly), 'paved': rings(paved),
       'basin': [[round(x, 2), round(z, 2)] for x, z in list(basin.exterior.coords)[:-1]], 'bridge': [list(bridge.coords[0]), list(bridge.coords[-1])],
       'beds': beds, 'trees': trees, 'stones': stones, 'lamps': lamps}
s = json.dumps(out, separators=(',', ':'))
js = open(JS).read()
a = js.index('/*KEFLAYOUT*/'); b = js.index('/*ENDKEFLAYOUT*/')
js = js[:a] + '/*KEFLAYOUT*/' + s + js[b:]
open(JS, 'w').write(js)
json.dump(out, open(R + '/tools/lm/park/kef_layout.json', 'w'))
from collections import Counter
print('lawn', len(out['lawn']), 'walks', len(out['walks']), 'beds', len(beds), 'trees', len(trees), Counter(t[2] for t in trees), 'stones', len(stones), 'lamps', len(lamps), 'bytes', len(s))
