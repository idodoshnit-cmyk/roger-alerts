#!/usr/bin/env python3
"""Fetch Foursquare OS Places (Apache-2.0) rows inside the kif.osm bbox (+margin).
The official HF dataset became gated (login) in 2025; we do not log in. We use the last openly mirrored,
spatially partitioned copy at Source Cooperative (fused/fsq-os-places, release 2025-02-06).
Reads only the row groups whose bbox statistics overlap (HTTP range requests)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import pyarrow.parquet as pq, pyarrow as pa, fsspec
REL = '2025-02-06'
BASE = f'https://data.source.coop/fused/fsq-os-places/{REL}/places/'
W, S, E, N = BBOX[0] - 0.004, BBOX[1] - 0.003, BBOX[2] + 0.004, BBOX[3] + 0.003
md = pq.read_metadata(os.path.join(RAW, f'fsq_metadata_{REL}'))
hits = {}
for i in range(md.num_row_groups):
    rg = md.row_group(i)
    la = rg.column(2).statistics; lo = rg.column(3).statistics
    if not (la and lo and la.has_min_max and lo.has_min_max): continue
    if la.max < S or la.min > N or lo.max < W or lo.min > E: continue
    hits.setdefault(rg.column(0).file_path, []).append(i)
print('row groups overlapping:', {k: len(v) for k, v in hits.items()})
fs = fsspec.filesystem('https', client_kwargs={'headers': {'User-Agent': 'GrandKifisiaCensus/1.0 (student game project; open-data research)'}, 'trust_env': True})
rows = []
for fp, gl in hits.items():
    with fs.open(BASE + fp, block_size=4 * 1024 * 1024) as f:
        pf = pq.ParquetFile(f)
        for g in range(pf.metadata.num_row_groups):
            rg = pf.metadata.row_group(g)
            la = rg.column(2).statistics; lo = rg.column(3).statistics
            if la.max < S or la.min > N or lo.max < W or lo.min > E: continue
            t = pf.read_row_group(g, columns=['fsq_place_id','name','latitude','longitude','address','locality','postcode','date_created','date_refreshed','date_closed','tel','website','fsq_category_labels'])
            for r in t.to_pylist():
                if r['latitude'] is None or r['longitude'] is None: continue
                if S <= r['latitude'] <= N and W <= r['longitude'] <= E: rows.append(r)
            print(fp, 'rg', g, t.num_rows, '->', len(rows), flush=True)
jdump({'release': REL, 'source': BASE, 'bbox': [W, S, E, N], 'rows': rows}, os.path.join(RAW, f'fsq_places_{REL}.json'))
print('saved', len(rows))
