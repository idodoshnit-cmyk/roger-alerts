"""Fetch Overture Maps buildings (CDLA-Permissive-2.0 / ODbL for OSM-derived) in the Kifisia bbox, anonymously from the public S3 bucket.
Writes work/research-arch/overture_buildings.json  (id, sources, height, num_floors, roof_shape, facade_colour..., geometry WKB->coords)."""
import json, sys, os, pyarrow.dataset as ds, pyarrow.fs as pfs, pyarrow.compute as pc
import shapely.wkb
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REL = sys.argv[1] if len(sys.argv) > 1 else '2026-11-18.0'
W, E, S, N = 23.798, 23.832, 38.064, 38.083
fs = pfs.S3FileSystem(anonymous=True, region='us-west-2')
d = ds.dataset(f'overturemaps-us-west-2/release/{REL}/theme=buildings/type=building/', filesystem=fs, format='parquet')
print(d.schema.names, flush=True)
flt = (pc.field('bbox', 'xmin') < E) & (pc.field('bbox', 'xmax') > W) & (pc.field('bbox', 'ymin') < N) & (pc.field('bbox', 'ymax') > S)
cols = [c for c in ['id', 'geometry', 'bbox', 'sources', 'height', 'num_floors', 'roof_shape', 'roof_height', 'roof_color', 'roof_material', 'facade_color', 'facade_material', 'roof_direction', 'num_floors_underground', 'class', 'subtype', 'names', 'min_height', 'is_underground', 'level'] if c in d.schema.names]
t = d.to_table(filter=flt, columns=cols)
print('rows', t.num_rows, flush=True)
out = []
for r in t.to_pylist():
    g = shapely.wkb.loads(r['geometry'])
    if g.geom_type == 'MultiPolygon': g = max(g.geoms, key=lambda q: q.area)
    r['geometry'] = [[round(x, 7), round(y, 7)] for x, y in g.exterior.coords]
    r['sources'] = [{k: s.get(k) for k in ('dataset', 'record_id', 'confidence')} for s in (r.get('sources') or [])]
    r.pop('bbox', None)
    if r.get('names'): r['names'] = {'primary': r['names'].get('primary')}
    out.append(r)
json.dump({'release': REL, 'bbox': [W, S, E, N], 'buildings': out}, open(os.path.join(ROOT, 'work', 'research-arch', 'overture_buildings.json'), 'w'), ensure_ascii=False)
print('wrote', len(out))
