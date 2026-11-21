# Landmark modelling bots (lm-*) — OWNER_BRIEF item 14: the most important thing in the project now
Owner (2026-11-21): "the most important thing is the architecture — put several bots on each building and build a real 3D model of the
building so it looks exactly the same. Not every building now — the important ones: Starbucks, Ralph Lauren, ISA, the park 1:1, KFC…"
You are ONE of six landmark bots; each owns exactly one landmark. Goal: when the owner walks up to it in the game he recognises it instantly.

## Owned files (only these)
gk3/js/89<letter>_lm_<id>.js (already created as a stub and loaded by index.html), gk3/tex/lm/<id>/** (webp/jpg/png, keep < 1.5 MB total),
gk3/models/lm/<id>*.json (glTF JSON with embedded base64 only — .glb/.bin cannot be published), docs/research/lm/<id>.md,
docs/research/img/lm/<id>/**, tools/lm/<id>/**. Work in work/lm-<id>/gk3 (private copy) and integrate with
`tools/integrate.sh lm-<id> js/89<letter>_lm_<id>.js tex/lm/<id> ...` after every good iteration.

## Mechanism (read gk3/js/89_landmarks.js, 30_buildings.js, 00_core.js)
`LM.register({id, at:[[x,z],...], build({footprints}){...}})`: every map building containing an `at` point is skipped by the generic
builder and handed to you with its real OSM footprint `ps` (metres; x east, z south; terr(x,z) gives ground height). You build it all:
geometry (THREE meshes added to `scene`, or the chunk builder GB like 30_buildings), materials consistent with the renderer (see
docs/MATERIALS.md and 10_atlas.js / 82_sky.js), collision (`addSeg`), signs (plain text of the real business name; no copied logos),
doors where the interiors bot hooks in (`INTER`, 35_interiors.js). You may override a global builder (e.g. `buildISA=function(){...}`).
Keep draw calls low (merge geometry per material), ≤ ~60k triangles per landmark (ISA/park ≤ 150k), add a cheap LOD if far.

## Method — "photo match", at least 6 iterations
1. Research (≤ 25 % of your time): OSM footprint/tags (kif.osm, gk3/kifisia_map.json, gk3/data/shops.json building specs,
   docs/research/SHOPS.md, INTERIORS.md, ref/*.jpg, docs/research/img/**), Wikimedia Commons (API geosearch/search; ≥ 6 s between requests,
   back off on 429; plain non-browser User-Agent; never spoof), Wikipedia/Wikidata, the business's or school's own public pages.
   NEVER Google Maps/Street View/Earth imagery. Save refs in docs/research/img/lm/<id>/ with licence in docs/research/img/SOURCES.md
   (REFONLY suffix for non-free images: look only, never ship them).
2. Write docs/research/lm/<id>.md: dimensions (footprint from OSM; heights from levels/photos using door ≈ 2.1 m, floor ≈ 3.0–3.3 m),
   every facade element per side (openings with sizes and rhythm, frames, shutters, cornices, mouldings, balconies, railings, roof shape,
   tiles, chimneys, materials and colours sampled from photos), surroundings (paving, steps, fences, planters, trees, awnings, terraces).
3. Model it in your file. 4. Screenshot from the SAME viewpoints as the reference photos (node tools/shot.js with custom views,
   GK_DIR=work/lm-<id>/gk3) and make a side-by-side image ref|game in docs/research/img/lm/<id>/match_<n>.jpg. List every difference, fix
   the biggest ones, repeat. 5. Integrate after each iteration once the page boots with no errors; then check main boots too.
Honesty: where no photo shows a side, model it plausibly and say so in <id>.md. Read docs/ORDERS.md at each milestone.
Resume from work/lm-<id>/PROGRESS.md (write it after every step: what is done, what is next).
