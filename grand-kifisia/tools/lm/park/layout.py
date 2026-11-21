# lm-park: build the Alsos Kifisias layout (world metres) and embed it into js/89f_lm_park.js between /*LAYOUT*/ and /*ENDLAYOUT*/.
# Sources: OSM way 32324869 + nodes inside it (tools/lm/park/park_osm.json) and the straight-down aerial ref/r05.jpg
# (Commons "Άλσος Κηφισιάς 4106.jpg", C messier, CC BY-SA 4.0), georeferenced on the OSM fountain node with a similarity transform.
# Usage: python3 layout.py ROOT JSFILE
import sys, json, math
from shapely.geometry import Polygon, LineString, Point, MultiPolygon, box
from shapely.ops import unary_union
from shapely import affinity

R = sys.argv[1]; JS = sys.argv[2]
d = json.load(open(R + '/tools/lm/park/park_osm.json'))
PARK = Polygon(d['park'])
F = (-182.07, -12.73)          # OSM fountain node (decorative fountain, Dimos Kifisias)
A = math.radians(15.0)         # aerial "right" = park long axis, bearing 15 deg south of east
S = 8.1                        # aerial px per metre (fountain rim 58 px ~ 7.2 m; road-to-road 680 px ~ 84 m)
CA, SA = math.cos(A), math.sin(A)
FX, FY = 473, 368              # fountain centre in r05 pixels

def pf(u, v):                  # park frame (u along axis to the east, v across to the south, metres from fountain) -> world
    return (F[0] + u * CA - v * SA, F[1] + u * SA + v * CA)
def px(ix, iy):                # aerial pixel -> world
    return pf((ix - FX) / S, (iy - FY) / S)
def pxl(ix, iy):               # aerial pixel -> park frame
    return ((ix - FX) / S, (iy - FY) / S)
def poly_pf(pts):
    return Polygon([pf(*p) for p in pts])
def rrect(cx, cy, w, h, r, ang=0):     # rounded rectangle in AERIAL pixels -> world polygon
    u, v = pxl(cx, cy); w /= S; h /= S; r = min(r / S, w / 2 - 0.01, h / 2 - 0.01)
    b = box(-w / 2 + r, -h / 2 + r, w / 2 - r, h / 2 - r).buffer(r, 8) if r > 0 else box(-w / 2, -h / 2, w / 2, h / 2)
    if ang: b = affinity.rotate(b, ang, origin=(0, 0))
    return Polygon([pf(u + x, v + y) for x, y in b.exterior.coords])
def ellipse(cx, cy, w, h, ang=0):
    u, v = pxl(cx, cy)
    e = affinity.scale(Point(0, 0).buffer(1, 16), w / 2 / S, h / 2 / S)
    if ang: e = affinity.rotate(e, ang, origin=(0, 0))
    return Polygon([pf(u + x, v + y) for x, y in e.exterior.coords])
def ring_sector(r0, r1, a0, a1, n=14):  # around the fountain, park frame angles in degrees (0 = east along axis, 90 = south)
    pts = []
    for i in range(n + 1):
        t = math.radians(a0 + (a1 - a0) * i / n); pts.append(pf(r1 * math.cos(t), r1 * math.sin(t)))
    for i in range(n, -1, -1):
        t = math.radians(a0 + (a1 - a0) * i / n); pts.append(pf(r0 * math.cos(t), r0 * math.sin(t)))
    return Polygon(pts)

INNER = PARK.buffer(-2.2)       # keep the perimeter wall + railing (40_walls 'park' style) and its verge clear
beds = []   # {k: lawn|shrub|grove|palm|rock|edge, ring:[[x,z]..], hedge:0/1, curb:0/1, src}
def addbed(poly, k, hedge=1, curb=0, src='aerial r05'):
    poly = poly.intersection(INNER)
    if poly.is_empty: return
    for p in (poly.geoms if hasattr(poly, 'geoms') else [poly]):
        if p.geom_type != 'Polygon' or p.area < 1.5: continue
        p = p.simplify(0.12)
        beds.append({'k': k, 'ring': [[round(x, 2), round(z, 2)] for x, z in list(p.exterior.coords)[:-1]], 'hedge': hedge, 'curb': curb, 'src': src})

# ---------------- core: everything visible in the aerial (u -58..60, v -45..43) ----------------
CORE = Polygon([px(0, 30), px(960, 30), px(960, 700), px(0, 700)])
# strips of the main walk with the fan palms (north and south side, west of the fountain)
addbed(rrect(232, 326, 224, 34, 6), 'palm')
addbed(rrect(230, 421, 236, 36, 6), 'palm')
# east of the fountain: lawn strips with clipped hedges and box balls
for cx, w in ((680, 136), (825, 90), (930, 68)):
    addbed(rrect(cx, 320, w, 38, 8), 'lawn')
for cx, w in ((652, 96), (810, 140), (935, 60)):
    addbed(rrect(cx, 415, w, 42, 8), 'lawn')
# the four arc beds that close the round fountain place (white stone kerbs, benches on the inner side)
for a0, a1 in ((-160, -104), (-76, -22), (22, 76), (104, 160)):
    addbed(ring_sector(6.6, 10.4, a0, a1), 'shrub', hedge=1, curb=1)
# north zone
addbed(ellipse(256, 248, 120, 64), 'lawn')                    # oval lawn bed
addbed(ellipse(576, 252, 48, 48), 'lawn')                     # round lawn bed
addbed(rrect(677, 237, 94, 58, 12), 'lawn')                   # rectangular lawn bed
addbed(rrect(598, 168, 110, 28, 13, ang=-4), 'shrub')         # curved bed with a row of box balls
addbed(rrect(812, 62, 104, 28, 12), 'shrub')                  # hedge with box balls along the north path
addbed(rrect(752, 128, 96, 48, 18), 'shrub')
addbed(ellipse(836, 224, 88, 96), 'rock', hedge=0)            # rockery
addbed(ellipse(152, 70, 56, 44), 'shrub')
addbed(Polygon([px(108, 150), px(205, 150), px(230, 205), px(205, 240), px(120, 240), px(95, 200)]), 'grove', hedge=0)
addbed(Polygon([px(0, 35), px(960, 35), px(960, 42), px(900, 80), px(700, 95), px(520, 92), px(510, 60), px(420, 60), px(380, 95), px(200, 100), px(0, 110)]), 'edge', hedge=0)   # planting under the trees along Adrianou
# south zone
addbed(rrect(718, 484, 76, 64, 16), 'lawn')
addbed(rrect(825, 469, 102, 46, 22), 'lawn')
addbed(rrect(825, 562, 78, 68, 10), 'shrub')
addbed(ellipse(930, 560, 80, 80), 'shrub')
addbed(rrect(744, 538, 48, 28, 10), 'shrub')
addbed(Polygon([px(140, 455), px(420, 452), px(425, 512), px(410, 600), px(330, 600), px(200, 600), px(150, 585), px(105, 540)]), 'grove', hedge=0)   # grove of deciduous trees SW of the fountain
addbed(Polygon([px(0, 600), px(80, 560), px(150, 600), px(230, 625), px(960, 628), px(960, 700), px(0, 700)]), 'edge', hedge=0)   # planting along Irodou Attikou
addbed(Polygon([px(520, 520), px(620, 520), px(640, 590), px(520, 598)]), 'grove', hedge=0)   # under the holm oak

# ---------------- west part (station side, beyond the aerial): OSM walks + the same formal style ----------------
def wl(pts, w): return LineString(pts).buffer(w / 2, cap_style=1, join_style=1)
west_walks = unary_union([
    wl([pf(-58, 0.5), pf(-150, 0.5), (-324.7, -50.4), (-342.8, -51.4), (-357.0, -47.4)], 7.0),   # main walk to the station
    wl([(-174.5, -35.9), (-189.7, -44.1), (-209.8, -45.7), (-228.0, -45.8), (-236.8, -49.1), (-242.3, -50.6), (-244.0, -55.8), (-284.3, -66.4)], 4.0),
    wl([(-183.1, 6.0), (-221.1, -3.4), (-234.8, -7.5), (-246.2, -10.5), (-255.7, -12.8), (-254.7, -15.8), (-253.1, -24.8), (-250.4, -30.5), (-246.9, -32.4), (-241.3, -37.4), (-242.3, -50.6)], 4.0),
    wl([(-324.7, -50.4), (-321.9, -78.1), (-284.3, -66.4), (-291.4, -34.5)], 4.0),
    wl([(-268.7, -28.0), (-276.9, 14.0)], 3.5),                       # south gate path
    wl([(-284.3, -66.4), (-282.3, -75.5), (-279.5, -90.0)], 3.5),     # north gate
    Point(-288.0, -3.7).buffer(9.0),                                  # ALSOS CAFE BAR terrace (OSM node)
    Point(-287.4, -83.9).buffer(3.2),                                 # dovecote
    Point(-337.0, -56.0).buffer(16.0),                                # station forecourt end
    wl([(-345, -30), (-300, -18), (-288, -10)], 3.5),
])
WEST = INNER.intersection(Polygon([(-500, -300), pf(-58, -90), pf(-58, 90), (-500, 300)]))
west_beds = WEST.difference(west_walks).difference(CORE.buffer(0.5))
for p in (west_beds.geoms if hasattr(west_beds, 'geoms') else [west_beds]):
    q = p.buffer(-1.6).buffer(1.0, join_style=1)
    if q.is_empty: continue
    for g in (q.geoms if hasattr(q, 'geoms') else [q]):
        if g.area < 6: continue
        addbed(g, 'lawn' if g.area < 260 else 'grove', hedge=1 if g.area < 900 else 0, src='inferred from OSM walks')

# ---------------- east tip (Platanos side) ----------------
EAST = INNER.intersection(Polygon([pf(60, -90), (100, -300), (100, 300), pf(60, 90)]))
east_walks = unary_union([wl([pf(58, 0), pf(84, 0.5), (-93.0, 15.5), (-86.0, 17.5)], 6.0),
                          wl([pf(58, 30), pf(80, 28), (-104.0, 22.0), (-95.0, 17.0)], 3.5),
                          wl([pf(58, -38), pf(76, -30), (-92.0, -12.0), (-90.0, 0.0), (-93.0, 14.0)], 3.5),
                          Point(-109.0, 33.0).buffer(4.5)])
east_beds = EAST.difference(east_walks).difference(CORE.buffer(0.5))
for p in (east_beds.geoms if hasattr(east_beds, 'geoms') else [east_beds]):
    q = p.buffer(-1.4).buffer(0.9, join_style=1)
    for g in (q.geoms if hasattr(q, 'geoms') else [q]):
        if g.area < 6: continue
        addbed(g, 'lawn', hedge=1, src='inferred')

# ---------------- trees ----------------
trees = []   # [x, z, species, scale, src]
def T(ix, iy, sp, dpx, src='aerial r05'):
    x, z = px(ix, iy); trees.append([round(x, 2), round(z, 2), sp, round(dpx / S, 1), src])
for ix in (140, 198, 252, 318): T(ix, 330, 'fanpalm', 46)
for ix in (140, 202, 250, 322): T(ix, 428, 'fanpalm', 46)
T(930, 415, 'fanpalm', 40)
for ix, iy, sp, dp in [(55, 45, 'aleppo', 130), (65, 285, 'aleppo', 140), (60, 480, 'aleppo', 120), (340, 124, 'aleppo', 85), (275, 60, 'cedar', 70), (430, 44, 'cedar', 60),
                       (600, 55, 'aleppo', 140), (720, 65, 'aleppo', 90), (930, 40, 'aleppo', 90), (880, 150, 'plane', 130), (370, 180, 'melia', 60), (215, 140, 'melia', 80),
                       (420, 420, 'melia', 70), (545, 330, 'melia', 75), (535, 410, 'melia', 60), (180, 500, 'plane', 90), (262, 520, 'plane', 100), (335, 560, 'plane', 90), (215, 600, 'melia', 80),
                       (300, 625, 'plane', 85), (385, 515, 'melia', 70), (400, 600, 'melia', 80), (575, 552, 'holmoak', 100), (560, 645, 'holmoak', 80), (712, 645, 'pittosporum', 85),
                       (830, 670, 'holmoak', 80), (910, 660, 'holmoak', 80), (625, 412, 'melia', 60), (735, 412, 'melia', 64), (845, 412, 'melia', 60), (640, 322, 'melia', 60), (745, 322, 'melia', 64),
                       (850, 320, 'melia', 60), (940, 322, 'melia', 55), (712, 480, 'cypress', 26), (160, 195, 'cedar', 80), (110, 615, 'aleppo', 100), (460, 655, 'cypress', 30), (490, 660, 'cypress', 30),
                       (980 - 30, 250, 'plane', 110), (330, 30, 'cypress', 30), (520, 30, 'cypress', 28), (20, 160, 'cedar', 90)]:
    T(ix, iy, sp, dp)
# carob tree registered in OSM (natural=tree, Ceratonia siliqua)
trees.append([-256.73, -71.42, 'carob', 11.0, 'OSM node 13081546394'])
# west and east parts: big trees in the beds (inferred: species mix of the aerial: Aleppo pines and cedars on the edges, planes/melias inside, palms on the main walk)
import random
rnd = random.Random(7)
occupied = [Point(t[0], t[1]).buffer(t[3] * 0.42) for t in trees]
def free(x, z, r):
    pt = Point(x, z).buffer(r)
    return not any(o.intersects(pt) for o in occupied)
for b in beds:
    if b['src'].startswith('aerial'): continue
    p = Polygon(b['ring']); minx, minz, maxx, maxz = p.bounds
    edge_d = PARK.exterior
    n = int(p.area / 95) + (1 if p.area > 25 else 0)
    for _ in range(n * 6):
        if n <= 0: break
        x = rnd.uniform(minx, maxx); z = rnd.uniform(minz, maxz)
        if not p.buffer(-1.2).contains(Point(x, z)): continue
        de = edge_d.distance(Point(x, z))
        sp = rnd.choice(['aleppo', 'aleppo', 'cedar', 'stonepine']) if de < 14 else rnd.choice(['plane', 'melia', 'melia', 'holmoak', 'cedar', 'cypress', 'aleppo'])
        dm = {'aleppo': 12, 'cedar': 10, 'stonepine': 13, 'plane': 13, 'melia': 8, 'holmoak': 9, 'cypress': 3.5}[sp] * rnd.uniform(0.8, 1.15)
        if not free(x, z, dm * 0.4): continue
        trees.append([round(x, 2), round(z, 2), sp, round(dm, 1), 'inferred']); occupied.append(Point(x, z).buffer(dm * 0.42)); n -= 1
# palms continue along the main walk to the station (pairs every ~7 m, inferred from the aerial rhythm)
for u in (-66, -73, -80, -87):
    for v in (-4.6, 7.2):
        x, z = pf(u, v)
        if INNER.contains(Point(x, z)) and free(x, z, 1.5): trees.append([round(x, 2), round(z, 2), 'fanpalm', 5.6, 'inferred (aerial rhythm)'])

# ---------------- box balls (topiary) in the shrub beds ----------------
balls = []
for b in beds:
    if b['k'] not in ('shrub', 'palm', 'lawn'): continue
    p = Polygon(b['ring']); inner = p.buffer(-0.9)
    if inner.is_empty: continue
    step = 1.7 if b['k'] == 'shrub' else 3.4
    ring = inner.exterior; L = ring.length; k = int(L / step)
    for i in range(k):
        if b['k'] == 'lawn' and i % 2: continue
        q = ring.interpolate(i * step)
        if any(Point(t[0], t[1]).distance(q) < t[3] * 0.3 for t in trees): continue
        balls.append([round(q.x, 2), round(q.y, 2), round(0.45 + 0.25 * ((i * 7) % 5) / 4, 2)])

# ---------------- benches, lamps ----------------
benches = []   # [x, z, yaw] yaw = facing direction
def bench_pf(u, v, face_u, face_v):
    x, z = pf(u, v); fx, fz = face_u * CA - face_v * SA, face_u * SA + face_v * CA
    benches.append([round(x, 2), round(z, 2), round(math.atan2(fx, fz), 3)])
for ang in (-132, -48, 48, 132):          # four benches on the inner side of the arc beds, facing the fountain
    t = math.radians(ang); bench_pf(6.1 * math.cos(t), 6.1 * math.sin(t), -math.cos(t), -math.sin(t))
for u in range(-50, 60, 11):              # along both sides of the main walk
    if abs(u) < 12: continue
    bench_pf(u, -3.2 if u < 0 else -2.4, 0, 1); bench_pf(u + 4, 4.6 if u < 0 else 2.6, 0, -1)
for u in (-140, -128, -116, -104, -92, -80, -68):
    bench_pf(u, -3.0, 0, 1); bench_pf(u + 5, 3.9, 0, -1)
x, z = (-181.11, -32.99); benches.append([x, z, round(math.atan2(-0.26, 0.97), 3)])   # OSM bench node (wood, backrest)
lamps = []
for u in range(-160, 85, 18):
    for v in ((-3.9, 5.0) if u < 0 else (-3.4, 3.6)):
        if abs(u) < 9: continue
        x, z = pf(u, v)
        if INNER.contains(Point(x, z)): lamps.append([round(x, 2), round(z, 2)])
for ix, iy in ((574, 294), (838, 306)):
    x, z = px(ix, iy); lamps.append([round(x, 2), round(z, 2)])
# drop lamps/benches that land inside a bed
bedpolys = [Polygon(b['ring']) for b in beds]
def clear(x, z, r):
    pt = Point(x, z).buffer(r); return not any(bp.intersects(pt) for bp in bedpolys)
lamps = [l for l in lamps if clear(l[0], l[1], 0.3)]
benches = [b for b in benches if clear(b[0], b[1], 0.6) or abs(Point(b[0], b[1]).distance(Point(*F)) - 6.1) < 0.3]
trees = [t for t in trees if INNER.buffer(1.0).contains(Point(t[0], t[1]))]

# ---------------- features ----------------
feat = {
    'fountain': {'x': F[0], 'z': F[1], 'r': 3.6, 'src': 'OSM node 4936874274 + aerial r05 (white rim, 8 radial ribs, dark centre)'},
    'pavilion': {'c': px(464, 560), 'w': 84 / S, 'd': 72 / S, 'dome': 50 / S, 'ang': A, 'src': 'aerial r05 (square paved platform with a round white ribbed dome; function not verified)'},
    'service': {'c': px(588, 493), 'w': 53 / S, 'd': 44 / S, 'ang': A, 'src': 'aerial r05 (small single-storey building with flat grey roof and 4 vents; function not verified)'},
    'booth': {'c': px(592, 321), 'w': 34 / S, 'd': 40 / S, 'ang': A, 'src': 'aerial r05 (small white two-part structure NE of the fountain; function not verified)'},
    'house': {'c': px(624, 654), 'w': 80 / S, 'd': 52 / S, 'ang': A, 'src': 'aerial r05 (single-storey building with red clay tile roof near the south edge)'},
    'well': {'c': px(764, 264), 'src': 'aerial r05 (small round dark object in the gravel; modelled as a drinking fountain - not verified)'},
    'tank': {'c': (-109.0, 33.0), 'src': 'photo r07 + PLACES.md (position estimated near the NE tip)'},
    'dovecote': {'c': (-287.41, -83.94), 'src': 'OSM man_made=dovecote'},
    'cafe': {'c': (-288.05, -3.72), 'name': 'ALSOS CAFE BAR', 'src': 'OSM amenity=cafe (look inferred)'},
    'steps': {'a': (-90.87, 15.96), 'b': (-82.01, 18.2), 'src': 'OSM highway=steps 418588997'},
}
out = {'park': [[round(x, 2), round(z, 2)] for x, z in list(PARK.exterior.coords)[:-1]], 'axis': [math.cos(A), math.sin(A)], 'beds': beds, 'trees': trees, 'balls': balls,
       'benches': benches, 'lamps': lamps, 'feat': feat}
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
js = open(JS).read()
a = js.index('/*LAYOUT*/'); b = js.index('/*ENDLAYOUT*/')
js = js[:a] + '/*LAYOUT*/' + s + js[b:]
open(JS, 'w').write(js)
from collections import Counter
print('beds', len(beds), Counter(b['k'] for b in beds), 'trees', len(trees), Counter(t[2] for t in trees), 'balls', len(balls), 'benches', len(benches), 'lamps', len(lamps), 'bytes', len(s))
json.dump(out, open(R + '/tools/lm/park/layout.json', 'w'))
