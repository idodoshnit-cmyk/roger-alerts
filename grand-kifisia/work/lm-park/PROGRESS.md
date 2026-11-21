# lm-park PROGRESS
## 2026-11-21 step 0
- done: read docs, extracted OSM features in park polygon -> tools/lm/park/extract.py, park_osm.json. OSM has only 1 tree (carob), 6 footways, fountain, gate, dovecote, cafe, bench.
- ref: ref/r05.jpg = aerial straight down centred at fountain (CC BY-SA 4.0, C messier), ref/r07.jpg = water tank.
- next: georeference aerial r05 -> world, trace walks/beds/trees; check current game render of park; build v1 in js/89f_lm_park.js; integrate.
## 12:45 step 1 (resumed)
- found: tools/lm/park/layout.py (aerial-traced layout: 44 beds, 128 trees, 194 shrub balls, 28 benches, 8 lamps, features) + full 89f_lm_park.js (ground, trees, benches, lamps, fountain, pavilion, small houses, tank, cafe). Embed with: python3 tools/lm/park/layout.py ROOT work/lm-park/gk3/js/89f_lm_park.js
- next: sync, boot test, shots, integrate v1.
## 13:20 step 2 — v1 INTEGRATED into main (js/89f_lm_park.js, layout embedded). Shots work/lm-park/shots/v1_*.png, no errors.
- fixed: limb() tile index vs rect crash (trees failed). tools/lm/park/shot.js now uses 240 s screenshot timeout.
- docs/research/lm/park.md written.
- next: (a) tree instancing per species (54 meshes -> ~20 calls), (b) gravel colour to beige #cdbb9a, (c) cafe terrace inside the fence (now on the outside/south), (d) tank dark green + inscription, (e) tree crowns less faceted, (f) match image ref|game, ORDERS_DONE note to streets.
## 13:45 step 3 (work copy, not yet integrated)
- trees now via shared 45_trees treeGeo()/lodPool() (buildTreesShared; own geometry only for fan palms / fallback), own per-species instancing.
- gravel tint 0.9,0.84,0.72; cafe flipped (terrace north, inside the wall which bends to z=1.4); tank darker matte green.
- tools/lm/park/match.py ROOT top.png out.jpg -> aerial|game side by side (top cam [-182,140,-10,-182,0,-12]).
- ORDERS_DONE entry written (13:20). main boot check running (main.log), v2 views in tools/lm/park/v2.json.
