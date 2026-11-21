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
## 18:20 step 4 (resumed after cutoff; work copy, not integrated)
- synced others into copy; v2 shot run (step-3 alsos changes) launched -> run2.log, shots/v2_*.png.
- Kefalari grove written: kef_layout.py extended (OSM benches w/ yaw, baskets, feat: fountain1872/art/kiosk/chapel/recycling, base ring; species cedar/aleppo/plane/holmoak, 81 trees);
  JS section 10 buildKef() in 89f (embedded KEF_LAYOUT via: python3 tools/lm/park/kef_layout.py ROOT work/lm-park/gk3/js/89f_lm_park.js), LM id 'kefalari'.
  deep() now covers both parks (areas park+water, trees, footways, benches, lamps suppressed in K); MAP.seats benches in both parks filtered.
- next: check v2 shots, then kef shots (tools/lm/park/v3.json), integrate.
## 19:30 step 5 (work copy, still not integrated)
- v2 (alsos) + v3 (kefalari) runs: no errors. Kefalari renders (lawns, walks w/ stones, lamps, benches, agaves, statue, busts, 1872 fountain, chapel).
- fixes after v3: generic MAP.props.fountain inside Kefalari suppressed (octagon basin was showing); pond = own opaque-ish material, level above highest ground;
  bridge: collision gap + railings + LVL raised along deck (walkable); alsos fountain pedestal now chunk lathe (was invisible Mesh); tank uses metal texture (was pale).
  groundVar(): per-vertex colour noise for lawns + gravel in both parks.
- v4 run (tools/lm/park/v4.json -> run4.log) checks these; then INTEGRATE.
- harness note: some shots come out black intermittently (v2_overSW, v3_aTop) — re-shoot, not a code error.
- next after integrate: Platanos island (OSM way 648699659, extract -> tools/lm/park/plat_osm.json): only 529 m2; plane tree is 45_trees' (streets).
## step 6 — INTEGRATED v2 (alsos fixes + Kefalari grove + ground variation) into main js/89f_lm_park.js. v4 run: no errors.
- main boot check running: tools/lm/park/main2.json -> work/lm-park/main2.log, shots m2_*.png (views after a far camera jump need "wait":5000+ or chunks are not streamed yet).
- next: ORDERS_DONE entry; Platanos (ref r09 = Commons "Κηφισιά 4102.jpg" oblique aerial over Platanos, look before modelling).
