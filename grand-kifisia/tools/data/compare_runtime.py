#!/usr/bin/env python3
"""team:data — compare what the renderer actually built (BLD.shops dump from dump_and_shoot.js) with the map bays (MAP.pois bay:'shop').
Usage: compare_runtime.py kifisia_map.json signs_runtime.json [out.md]
Reports every map shop bay whose rendered sign centre is moved > 0.3 m or whose width differs > 0.3 m, and bays the renderer did not build."""
import json, math, sys
M = json.load(open(sys.argv[1])); D = json.load(open(sys.argv[2])); out = sys.argv[3] if len(sys.argv) > 3 else None
bays = [p for p in M['pois'] if p.get('bay') == 'shop']
run = [s for s in D.get('signs', []) if s.get('kind', 'shop') != 'building']
byid = {}
for s in run: byid.setdefault(s.get('id') or '', []).append(s)
moved, wdiff, missing, ok = [], [], [], 0
lm = {p['id'] for p in D.get('landmarkPois', [])}
for p in bays:
    c = byid.get(p['id'], [])
    if not c:
        missing.append((p, 'landmark module (building handed to 89_landmarks)' if p['id'] in lm else 'not in BLD.shops')); continue
    s = min(c, key=lambda s: math.hypot(s['x'] - p['fx'], s['z'] - p['fz']))
    d = math.hypot(s['x'] - p['fx'], s['z'] - p['fz']); dw = s['w'] - p['w']
    if d > 0.3: moved.append((p, s, d))
    elif abs(dw) > 0.3: wdiff.append((p, s, dw))
    else: ok += 1
L = [f"map shop bays: {len(bays)}; rendered shop signs: {len(run)}; runtime errors: {len(D.get('errors', []))}",
     f"exact (centre <= 0.3 m, width +-0.3 m): {ok}; moved > 0.3 m: {len(moved)}; width changed: {len(wdiff)}; not built by 30_buildings: {len(missing)}"]
if moved:
    L.append('\n| sign | building | map bay centre | rendered centre | moved m |\n|---|---|---|---|---|')
    for p, s, d in sorted(moved, key=lambda r: -r[2]): L.append(f"| {p['name']} | b{p['b']} e{p['e']} | {p['fx']:.1f}, {p['fz']:.1f} | {s['x']:.1f}, {s['z']:.1f} | {d:.2f} |")
if wdiff:
    L.append('\n| sign | building | map width | rendered width |\n|---|---|---|---|')
    for p, s, dw in wdiff: L.append(f"| {p['name']} | b{p['b']} | {p['w']:.2f} | {s['w']:.2f} |")
if missing:
    L.append('\n| sign | building | reason |\n|---|---|---|')
    for p, why in missing: L.append(f"| {p['name']} | b{p['b']} | {why} |")
txt = '\n'.join(L); print(txt)
if out: open(out, 'w').write(txt + '\n')
