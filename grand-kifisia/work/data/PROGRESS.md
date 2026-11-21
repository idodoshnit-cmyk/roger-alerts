# OWNER-INSTANCE: this workstream ("data") is being worked on by the agent labelled "team:data" started by the project lead in a dedicated workflow.
# If you are ANY OTHER process started with id "data": STOP. Do not create or modify anything. Report: "handled by the dedicated team:data instance".
# (The owning instance keeps these three header lines at the top of this file and writes its progress below.)


## Log (team:data)
- [start] Read OWNER_BRIEF, ARCHITECTURE, tasks/data.md, build_map2.py, consumers of MAP in js/. Private copy created (work/data/gk3).
- Decisions: build_map3.py = build_map2 logic kept index-compatible (same roads/buildings order) + NEW keys only; per-road extras in parallel array; building extras appended as 12th element.
- NEXT: survey kif.osm tags -> write build_map3.py (POIs, facades/bays, furniture, road tags, building tags, width calibration) -> Overture -> Sephora -> check_map.py -> verify_placement.js -> MAP_DATA.md -> render -> integrate.

## OWNER UPDATE (from the project lead, newest demand — act on it now)
The owner now demands: "not only the shops I named — really EVERYTHING; every shop that exists in reality must be there; the map exactly like Google Maps with an identical metre-to-metre ratio; abnormal precision."
See docs/OWNER_BRIEF.md item 9. A new research bot (research-census) is building gk3/data/census.json: a complete directory of every business in the play area, geocoded to real addresses.
- data: merge gk3/data/census.json (when present) into the map POIs with source:"census", posMethod and posErrM kept; every census entry must get a facade bay (none dropped). Add a scale audit to check_map.py: geodesic distance vs game distance for 20 point pairs, max relative error ≤ 0.1 %; the world is strictly 1 unit = 1 metre; building footprints and street geometry must follow the survey exactly (no smoothing that moves a corner by more than 0.3 m).
- [resume 2, Nov 21 00:50] Re-read docs. No ORDERS.md yet, no census.json yet, gk3/data has only shops.json. Overture places already downloaded (tools/data/src/overture_places_2026-11-18.geojson, 1328 in bbox, 604 in focus; has Sephora "Levidou 8" at x=129.4 z=-3.5, Starbucks/KFC/Paul/Mythos/AB too).
  Scale check: KX=87716 vs geodesic 87745.7 m/deg (0.034 % short E-W), KZ exact -> within 0.1 %, constants kept (documented).
  DESIGN (build_map3.py): same roads/buildings order as v2. New keys: pois[] (objects, every POI with facade bay), roadx[] (parallel to roads), buildings[i][11] extras dict, carriage (asphalt polygons), fillets, addr, barriers, tree_rows, restrictions, junctions, driveways, seats, extra props kinds, special[k].interior/e/t/w, key.junction/sephora, meta.
  buildings[].shops = ALL shop bays [edge,t,name,bg,fg,kind,poiIndex,bayW].
- NEXT: write build_map3.py -> run -> check_map.py -> harness shot -> integrate v1 -> verify_placement.js -> MAP_DATA.md -> iterate.
- [resume 3, Nov 21 08:30] build_map3.py found complete (1517 lines, written by run 2 before cut-off). Fixed a sort bug (own[0] referenced during sort). Pipeline runs in 10 s: 1417 POIs (OSM 412 + Overture 470 + census 532 added/682 matched), 0 unplaced, 6 specials incl. sephora. Output 1889 KB.
- NEXT: check_map.py -> harness shot with new JSON in private copy -> integrate kifisia_map.json -> verify_placement.js -> MAP_DATA.md.
- [08:55] Census merge per contract (tiers A/B built, C not built, X/closed dropped; streetLevel=false -> plate). legacy buildings[i][8] capped at 165 (v2 renderer sign atlas = 224 slots, crashed otherwise); full list in buildings[i][11].shops + MAP.pois.
  Shared-file fix in MAIN 90_main.js (lines 70/76): cdirty only for car types with instances (crash when a type had 0 cars -> black screen). Mirrored in my copy + base.md5.
  Shots v1_* OK, no errors. INTEGRATED kifisia_map.json v3 (1048 POIs, 701 shop bays, 6 specials incl sephora, key.junction) into main.
- NEXT: harness on main; check_map.py; verify_placement.js; MAP_DATA.md; ORDERS_DONE; then improvements (top-down low-altitude shots, width check).
- [09:10] tools/data/check_map.py written (HARD: facades, bay overlap, furniture/synthetic in buildings/carriageway, buildings in carriageway, specials, scale audit 20 pairs geodesic, survey Hausdorff <=0.3 m; INFO spot check 15 POIs). Fixed: carriageway cut back to facades; bay overlap post-pass; building coords snapped to dm before bay layout. check_map PASS (scale max err 0.036 %, worst building 0.29 m, road 0.07 m, spot check max 0.19 m). INTEGRATED.
- NEXT: verify_placement.js; MAP_DATA.md; ORDERS_DONE; low-altitude top-down review shots.
- [09:45] tools/verify_placement.js written + run on main: 5290 focus features, 67.4 % placed (streets agent registers props; shops/buildings/cars not registered yet -> 0 %). Report work/data/tmp/verify_main.log.
  Pipeline: house-number parity side inference (20 way/parity pairs from OSM) -> Sephora now on EAST side of Levidou (b432, matches SHOPS.md), key.sephora = pavement at its door (key.sephora_src = raw).
  Starbucks override per SHOPS.md: courtyard pavilion b426 (w1076768349), door ESE at (158.2,66.5); key.starbucks = door. Specials keep researched widths (Mythos 6.5, PAUL 9.5, KFC 7.4 (edge), Sephora 8, AB 18). check PASS. INTEGRATED.
- NEXT: MAP_DATA.md, ORDERS_DONE, review shots (low top-down) of Levidou/Sephora/Starbucks.
- [10:30] ORDERS.md appeared: done for data -> buildings[i][11].tags (all OSM tags), shops.json linking (pois[].sj/sjName, 382 linked, 22 pinned to researched building, Ralph Lauren -> b425). MAP_DATA.md written; CREDITS + ORDERS_DONE appended. check PASS. INTEGRATED. Shots v2_* reviewed (Sephora on east side with homeless man, Starbucks pavilion, top junction clean).
- [10:45] Final: main harness main2_* no errors; check_map PASS on main. Known gaps: 35 POIs on 'directory' (no free frontage), legacy b[8] capped at 165 until buildings v2 reads b[11].shops, KX kept at 87716 (0.034 % E-W), verify_placement shows 0 % for shops/buildings/cars until those modules call placed().

- [resume 4, Nov 21 13:xx] New ORDER (item 16): SHOP PLACEMENT AUDIT -> docs/research/PLACEMENT_AUDIT.md + overlay image + pipeline fix (OSM wins, overture/census only if address verified & no OSM collision, brand dedupe 60 m, closed dropped, side/building correct). STATUS line removed while working.
- [13:55] build_map3.py PLACEMENT AUDIT rules implemented (backup work/data/build_map3.before_audit.py): Overture-only never built; census-only built only with verified address
  (exact surveyed number / bracketed interpolation <=12 / tier-A two-source listing on its street with clear side) AT the address, only in frontage free of OSM bays, else building directory;
  OSM: containing building only, else <=12/25 m without crossing a main road, courtyard edges allowed (+3), never moved for capacity (overflow -> directory same building);
  same-name within 60 m merged; snorm() fixes 'Κηφισίας' vanishing (STOP word bug that broke all Kifisias address matching); parity re-learnt after census (58 pairs) -> Sephora east side b432.
  Map-level audit (tools/data/placement_audit.py): OSM shop -> game bay >4 m: 80 before -> 14 after; signs 691 -> 422 (Overture 285 -> 0). check_map PASS. NOT yet integrated.
- NEXT: runtime dump (tools/data/dump_signs.js) on my copy, shots, integrate, write PLACEMENT_AUDIT.md sections B/C.
- [14:20] INTEGRATED kifisia_map.json v3.1 (placement rules) into main: 397 shop bays (OSM 262 + census verified 132 + 3 address specials), 0 Overture-only; Sephora east side b432.
  Courtyard edges only when open + reachable (courtyard_ok). Audits: mine (bay-segment metric) OSM >4 m 54 -> 24; research-census 09_placement_audit (copy in work/data/cxtools, outputs in work/data/audit/cx) osmOver4 86 (old main) -> 59, DUPLICATE 0, WRONG_SIDE 1.
  Runtime dump (dump_signs.js on my copy) queued for a browser slot (queue very long).
- NEXT: when dump arrives -> compare runtime vs map (renderer moves?), shots of Levidou/Kassaveti/Kolokotroni; write PLACEMENT_AUDIT.md sections B/C; MAP_DATA.md update; ORDERS_DONE.
- [14:50] INTEGRATED map v3.1b: + buildings[i][11].ua (Copernicus Urban Atlas Building Height 2012 class, 880/948 buildings; public EEA ImageServer getSamples, no login; tools/data/ua_heights.py; CREDITS appended)
  + HSBC -> CrediaBank (census rebrand, formerName kept) + meta.audit.overtureUnbuilt/censusUnbuilt with x,z. Per-shop verification table (ORDER 13:05): tools/data/shop_table.py -> docs/research/PLACEMENT_AUDIT_DATA.md section D (1020 rows); assemble with tools/data/assemble_audit_doc.py.
- NEXT: runtime dump still queued; then shots; ORDERS_DONE entry.
- [15:05] INTEGRATED: OSM `branch` kept (Intimissimi Uomo is a separate shop, no longer merged as a duplicate). Docs regenerated (assemble_audit_doc.py). ORDERS_DONE entry written (14:50).
  Runtime dump+shots job (tools/data/dump_and_shoot.js -> work/data/audit/signs_after.json, shots work/data/shots/pa_*) queued for a browser slot.
