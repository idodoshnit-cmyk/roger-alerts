# buildings agent — PROGRESS (buildings / shopfronts / landmarks / roofs)
# OWNER-INSTANCE: workstream "buildings" is worked on by the agent labelled team:buildings.

Private copy: work/buildings/gk3. Shots: work/buildings/shots. Owned: gk3/js/30_buildings.js (+ 31_/32_ splits), docs/BUILDINGS_IMPL.md.

## Status log
- [start] read OWNER_BRIEF, ARCHITECTURE, tasks/buildings.md, sibling briefs; working copy created.

## OWNER UPDATE (from the project lead, newest demand — act on it now)
The owner now demands: "not only the shops I named — really EVERYTHING; every shop that exists in reality must be there; the map exactly like Google Maps with an identical metre-to-metre ratio; abnormal precision."
See docs/OWNER_BRIEF.md item 9. A new research bot (research-census) is building gk3/data/census.json: a complete directory of every business in the play area, geocoded to real addresses.
- buildings: build a real shopfront with its real name for EVERY POI, including those merged from census.json/Overture (MAP data from the data agent); 100 % coverage is the goal that tools/verify_placement.js must show. Strict 1:1 scale: doors 2.1 m, floor heights from data or ~3.0-3.3 m, nothing rescaled.

## [resume 2026-11-21 00:50] state + design decisions
- Found: baseline shots only (work/buildings/shots/base_*), no code changes. Work copy re-synced from main (syncwork).
- Research data NOT published yet (gk3/data empty, no MAP_DATA.md, no ORDERS.md) -> build from MAP.buildings[].shops now, feature-detect later data.
- DESIGN (v2 buildings module):
  * own LOD cells (BCELL=48 m): far GB (flat painted bays) + near GB (real 3D facade) + near cut GB + label GB; LOD swap by camera distance;
    hooks: buildBuildings() wraps finalize() and updateChunkVis() at boot (no shared-file edit).
  * Shop sign text: own single-channel LABEL atlas (4096 x N canvas, alpha = glyph, vertex colour = ink) -> crisp, ~1000 signs; legacy sign atlas API kept for other modules.
  * Shopfronts: recessed diorama box behind glazing (category picture sheets, 4 per layer), fascia + label, awning, door, plinth.
  * Files: js/30_buildings.js (core+facades+roofs+signs), js/31_shopfronts.js, js/32_landmarks.js (index.html script list edited in MAIN when integrating).
- NEXT: write v2, shots, integrate ASAP (milestone 1), then iterate: landmarks, specials, night, data hookups.

## [resume 2 2026-11-21] data now present in main: gk3/data/shops.json (388 OSM shops w/ specs, 1 'building'), gk3/data/census.json (1359, build tiers A/B, streetLevel). No ORDERS.md, no MAP_DATA.md, no verify_placement.js yet.
- PLAN M1: rewrite js/30_buildings.js (shell, allocation of ALL shops to facades, LOD cells, label atlas R8 4096², legacy sign API kept) + js/31_shopfronts.js (interior picture tiles via defTile, shopfront near-detail, specials). Boot edit in MAIN 90_main.js: `if(typeof bldLoad==='function')await bldLoad();` before buildBuildings(); index.html: add 31_shopfronts.js.
- [M1 code written] 30_buildings.js v2 + 31_shopfronts.js in work copy; work copy synced from main (main now has 84_ambience, 85_hud, 86_map, 87_missions, 88_menu…); re-applied index.html (31 script tag after 30) + 90_main.js line ~111 bldLoad edit in COPY only (MAIN still to do at integration). First shot run v1 started.
- [v1/v2 shots OK, no errors] boots; arch Mythos, setback+balustrade, terraces, interiors, AB/KFC fascia render. Fixed: labels were back-facing (labQuad u=(nz,-nx)); atlas filled up -> shelf packer + smaller rows (44 names, 30 plates); sign colours now linear (hexL).
- Consumes MAP.pois (data agent v3 map: b,e,t,w per POI, bay shop/plate/directory/building) via allocateFromPois(); own allocation is fallback. Registers placed('poi',..,poi.id), placed('building'), placed('addr') (house-number plates from MAP.addr), placed('entrance').
- Night roller shutters (cell.shutM, visible 21:30-08:30). Building specs: shops.json building{} -> specToOvr (floors,height,eaves,colour,roof hip/colour,stone/wood/brick + punched windows, balcony type, setback, quoins).
- scripts: work/buildings/scripts/bshot.js (stats + near tris). NEXT: v3 check -> integrate into MAIN (copy 30,31 via integrate.sh; Edit MAIN index.html + 90_main.js bldLoad line).
- [M1 INTEGRATED 09:11] 30_buildings.js + 31_shopfronts.js in MAIN; index.html 31 tag + 90_main.js bldLoad edit done in MAIN. Copy has small window-relief addition (sills/shutter boxes/cornices) not yet integrated.
## [resume 3 ~09:50] new: gk3/data/buildings_spec.json (research-arch, 948 bldgs keyed by OSM id MAP.buildings[i][11].id, _styles); ORDERS: architecture #1, start junction then outward (OWNER_BRIEF 12); LM bots own landmark buildings (89_*), b425=RalphLauren, b426=Starbucks, b305 Mela/KFC, AB=b30, PAUL=b434. NEXT: consume buildings_spec.json.
- [M2 code ~10:20] NEW js/32_facades.js (parametric facade generators per buildings_spec style class: archProfile/archHeights/bayLayout/openingN/railP/awningN/perimRoof/pergolaN/groundResP/buildShellP/archApplyAll; own tiles gkWin gkLouv gkAlu gkFab).
  30_buildings.js hooks: bldLoad fetches data/buildings_spec.json; cells have far GB/farM (shown beyond bldNearD, hidden when near meshes show); applyBuildingSpecs calls archApplyAll(); buildBuildings dispatches archHeights/buildShellP when B.P.
  Copy index.html has 32_facades.js tag (MAIN still needs it at integration). LM bots own: junction 8 bldgs (lm-junction), b425/b426, b305/b290? (lm-kfc), ISA b752.
  test script: scripts/bshot2.js (views by cls/bld). views4.json.
