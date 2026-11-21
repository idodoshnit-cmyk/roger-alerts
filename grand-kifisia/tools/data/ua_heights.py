#!/usr/bin/env python3
"""Per-building heights from the Copernicus Urban Atlas Building Height 2012 (10 m raster), team:data (ORDERS 2026-11-21 13:30).
Source: EEA public ArcGIS ImageServer (the CLMS map-viewer service) .../UrbanAtlas/UA_BuildingHeights_2012_10m/ImageServer, getSamples (no login needed).
Licence: Copernicus data and information policy (Reg. (EU) 1159/2013): free, full and open; attribution "Contains Copernicus Land Monitoring Service information, Urban Atlas
Building Height 2012 (EEA)". Raw samples cached in tools/data/src/ua_bh2012_samples.json; per-building result in tools/data/src/ua_bh2012_buildings.json.
Usage: python3 tools/data/ua_heights.py [MAP.json]
"""
import json, math, sys, time, os, urllib.request, urllib.parse
from shapely.geometry import Polygon, Point
R = '/tmp/claude-0/-home-user-roger-alerts/1b3b0d86-8923-5c5e-87ff-3268c67302f8/scratchpad'
MAPF = sys.argv[1] if len(sys.argv) > 1 else R + '/gk3/kifisia_map.json'
SVC = 'https://copernicus.discomap.eea.europa.eu/arcgis/rest/services/UrbanAtlas/UA_BuildingHeights_2012_10m/ImageServer/getSamples'
LAT0, LON0, KX, KZ = 38.0727, 23.8125, 87716.0, 110998.0
CACHE = R + '/tools/data/src/ua_bh2012_samples.json'; OUT = R + '/tools/data/src/ua_bh2012_buildings.json'
M = json.load(open(MAPF))
pts = []; owner = []
for i, b in enumerate(M['buildings']):
    co = [(b[10][k] / 10, b[10][k + 1] / 10) for k in range(0, len(b[10]) - 1, 2)]
    if len(co) < 3: continue
    pg = Polygon(co).buffer(0)
    if pg.is_empty: continue
    x0, z0, x1, z1 = pg.bounds; step = 5.0
    if (x1 - x0) * (z1 - z0) / 25 > 60: step = math.sqrt((x1 - x0) * (z1 - z0) / 60)
    mine = []
    x = x0 + step / 2
    while x < x1:
        z = z0 + step / 2
        while z < z1:
            if pg.contains(Point(x, z)): mine.append((x, z))
            z += step
        x += step
    if not mine: c = pg.representative_point(); mine = [(c.x, c.y)]
    for x, z in mine: pts.append((round(LON0 + x / KX, 7), round(LAT0 - z / KZ, 7))); owner.append(i)
print('sample points', len(pts), 'buildings', len(set(owner)))
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
todo = [p for p in pts if '%s,%s' % p not in cache]
for k in range(0, len(todo), 1000):
    chunk = todo[k:k + 1000]
    body = urllib.parse.urlencode(dict(geometry=json.dumps(dict(points=[list(p) for p in chunk], spatialReference=dict(wkid=4326))), geometryType='esriGeometryMultipoint',
                                       returnFirstValueOnly='true', interpolation='RSP_NearestNeighbor', outFields='', f='json')).encode()
    req = urllib.request.Request(SVC, data=body, headers={'User-Agent': 'GrandKifisia-mapdata/1.0 (open-data research; building heights)', 'Content-Type': 'application/x-www-form-urlencoded'})
    for attempt in range(4):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=90)); break
        except Exception as ex:
            print('retry', attempt, ex); time.sleep(10 * (attempt + 1))
    else: raise SystemExit('service failed')
    sams = d.get('samples') or []
    if len(sams) != len(chunk): print('warning: %d samples for %d points' % (len(sams), len(chunk)))
    for s in sams:
        loc = s.get('location') or {}; idx = s.get('locationId')
        p = chunk[idx] if idx is not None and idx < len(chunk) else None
        if p is None: continue
        v = s.get('value')
        try: v = float(v)
        except Exception: v = None
        cache['%s,%s' % p] = v
    json.dump(cache, open(CACHE, 'w')); print('batch', k // 1000 + 1, 'done', len(cache)); time.sleep(3)
# the service publishes the height CLASS per 10 m pixel (raster attribute table): 1=2-4 m, 2=4-6, 3=6-8, 4=8-10, 5=10-15, 6=15-20, 7=20-30, 8=30-60, 9=60-100, 10=100-368; 0/none = no building
CL = {1: (2, 4), 2: (4, 6), 3: (6, 8), 4: (8, 10), 5: (10, 15), 6: (15, 20), 7: (20, 30), 8: (30, 60), 9: (60, 100), 10: (100, 368)}
def lv(h, gf=4.0, fl=3.2): return max(1, int(round((h - gf) / fl)) + 1)
res = {}
for p, i in zip(pts, owner):
    res.setdefault(i, []).append(cache.get('%s,%s' % p))
out = {}
for i, vs in res.items():
    v = sorted(int(x) for x in vs if x is not None and 1 <= x <= 10)
    n = len(vs)
    if not v: out[i] = dict(cls=None, n=n, built=0); continue
    q = lambda f: v[min(len(v) - 1, int(f * (len(v) - 1) + 0.5))]
    c = q(0.75); lo, hi = CL[c]
    out[i] = dict(cls=c, heightRangeM=[lo, hi], heightM=round((lo + hi) / 2, 1), levelsRange=[lv(lo), lv(hi)], clsMax=v[-1], n=n, built=round(len(v) / max(1, n), 2))
json.dump(dict(source='Copernicus Urban Atlas Building Height 2012, 10 m (EEA ImageServer UA_BuildingHeights_2012_10m, getSamples, nearest neighbour)',
               licence='Copernicus data and information policy, Reg. (EU) 1159/2013: free, full and open; credit "Contains Copernicus Land Monitoring Service information (Urban Atlas Building Height 2012, EEA)"',
               note='The public service gives the height CLASS per pixel. cls = 75th percentile class of the pixels sampled on a <=5 m grid inside the OSM footprint; heightRangeM = that class band; heightM = band middle; levelsRange = round((h - 4.0 m ground floor) / 3.2 m) + 1 for both ends; built = share of samples on a building pixel (low = small/new building, 2012 data).',
               buildings=out), open(OUT, 'w'))
import collections
print('buildings with a class', sum(1 for o in out.values() if o['cls']), 'of', len(out), collections.Counter(o['cls'] for o in out.values()))
