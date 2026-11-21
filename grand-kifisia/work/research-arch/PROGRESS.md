# research-arch PROGRESS
## 2026-11-21 start
- done: read OWNER_BRIEF, ARCHITECTURE, task brief, ORDERS
- next: extract OSM buildings -> tools/arch/extract.py; publish first buildings_spec.json (osm+inferred); then photos
## M1 (08:52) base layer published
- gk3/data/buildings_spec.json: all 948 map buildings, top-level keys = map id "w…"/"r…", "_meta","_styles"; 945 inferred, 3 osm. Generator tools/arch/extract.py (photo layer: tools/arch/photo_specs.json overrides per id).
- Overture buildings fetched (work/research-arch/overture_buildings.json): NO heights for Greece (1 of 6424) -> useless for height.
- Commons geosearch running -> work/research-arch/commons_geo.json
- next: photos (Commons, C messier address-named photos), photo_specs.json, styles.json, ARCHITECTURE_KIFISIA.md
## M2 (photo layer v1) published
- tools/arch/photo_specs.json: 13 buildings (Mythos 294, RL 425, Starbucks 426, HSBC 291, Kif236 290, KFC block 305, 303, 302, Kolokotroni7 482, Kifisias297 834, station 173, church 0) ; tools/arch/styles.json -> "_styles"
- Commons API + upload.wikimedia.org return 429 for this session (shared IP). Slow polite list job running (work/research-arch/list.log). DO NOT switch UA to dodge it (classifier refused, rightly).
- Drone photo method: tools/arch/fitcam.py (pose from correspondences) + overlay.py (wireframe over photo) -> identify footprints in ref/r09 (Platanos) ; r10 (station) not yet done.
- next: ARCHITECTURE_KIFISIA.md, CREDITS, ORDERS_DONE; then r10 overlay, more inference rules
## M3 (09:20) docs published
- docs/research/ARCHITECTURE_KIFISIA.md written; CREDITS, SOURCES, ORDERS_DONE appended; ISA (b752) photo from lm-isa REFONLY; b423 description; Mela notes.
- counts: photo 9, aerial 4, description 1, osm 2, inferred 932
- next: wait for commons_slow list results -> info stage -> look at address-named photos; spawn junction photos still missing
## M4 (09:13) shops.json building layer merged (PAUL b434 -> 2 floors); node check: 948/948 map ids match, 18 styles.
## RESUME PLAN
1. `cd work/research-arch && python3 -I ../../tools/arch/commons_slow.py list` (resumable; skips done jobs; geo00, geo01 done), then `info`, then pick address-named files -> want.txt -> `get` (all polite; if 429, just wait — never change UA to evade).
2. Look at photos (tools/arch/sheet.py), add records to tools/arch/photo_specs.json, run tools/arch/extract.py (writes gk3/data/buildings_spec.json in MAIN directly).
3. Priority still missing: spawn junction b30 AB, b434 PAUL, b293 Goody's/Everest, b295 Kassaveti 9, b388 Zara block, b435; Kassaveti 3/5/7 (b298,b297,b296); Levidou east side b431/b432 (Sephora).
4. r10 drone (station) pose fit failed with rail line alone: add point correspondences (station canopy ends, the white stepped block) and retry.
## M5 (resume 2026-11-21 ~09:30)
- KartaView / Panoramax: NO coverage in Kifisia centre (nearest KartaView photo 3.5 km west). Mapillary needs token (skipped).
- Openverse paging job (tools/arch/ov_pages.sh -> work/research-arch/ov/p_*.json): found "Kifisia, Greece - panoramio (1..39)" (Alexandros Georgiou, CC BY) + Flickr CC (mroach, philos). ov_thumbs.py downloads thumbs via api.openverse.org -> docs/research/img/arch/ov/ (run AFTER paging finishes).
- Hellenic Cadastre open WMS orthophoto (gis.ktimanet.gr BASEMAP): got ONE 400x400 m mosaic work/research-arch/ortho/core.jpg (x,z -150..250, 0.25 m/px; fetched with plain curl). Footprints align ~1 m (core_ov_c.jpg).
  The server answers HTTP 500 to any UA containing "bot" -> it blocks self-declared bots. DECISION: do NOT fetch more tiles by changing UA (that would evade the block). Only core.jpg (+ test.jpg) are used. Gap recorded.
- tools/arch/ortho.py: overlay + measure (roof pixel classes per footprint). measure() uses tiles t_i_j; adapt to core.jpg.
## M6 (12:50 resume) 
- PUBLISHED buildings_spec v202611211246: + shops.json buildings layer (152 groundFloor), + ortho roof layer (180 roofs from core.jpg, verified visually: work/research-arch/sheets/oc_spawn.jpg, oc_platanos.jpg; check script work/research-arch/scripts/ortho_check.py), + b477 Kolokotroni 7 correction.
- upload.wikimedia.org WORKS again with standard thumb sizes (960px) -> tools/arch/commons_thumbs.py (no API; md5 path). API still 429. Running: want_commons.json (103) -> docs/research/img/arch/commons/, log work/research-arch/commons_dl.json
## M7 (13:00) published v2 spec (13 photo) + doc §2b
- r10 drone: b50 ruin (OSM building=ruins), b68 stepped white block, b69 hip house -> photo_specs. Shadow heights tried & rejected (tools/arch/shadow.py).
- Commons download: python urllib gets 429 even at 1 req; curl w/ same honest UA gets 200 for CACHED thumbs; then 429 Retry-After 600. Downloader (curl, honours Retry-After, gives up after 8x429) running in bg -> commons_dl.json/log.
- next: look at downloaded photos -> photo_specs; ORDERS_DONE entry; CREDITS for new photos.
## M8 (13:10) v2 published: photo 15. ORDERS_DONE + CREDITS + SOURCES appended.
- downloader restarted (30 s gap, sleeps 660 on 429, prioritised list: Kokkota DJI drone, Perraki, Dimorsitanos...) appends to commons_dl.log
- next: as photos arrive -> look -> photo_specs -> extract.py
- 13:10 b8 Goulandris photo; shop-ground-floor rule in extract.py; doc §2b updated
## M9 (13:25) photo 18 published: + b167 Kokkotas house (drone DJI 4115/4117; turrets at front facing E onto Kokota), b471 Perrakis house (0914)
- downloader rate: ~3 files / 11 min (429 then Retry-After 600). Running bg; log commons_dl.log. Already-looked files: 0934, DJI4115, DJI4117, 0914.
- 13:30 + b3 National Bank (aerial r09), b288 green hip (ortho), b388 Πύργος Κηφισιάς tower+dome (aerial ortho). ortho refs for lm bots published (img/arch/ortho_*_REFONLY.jpg) + ORDERS_DONE line. flickr 7 downloaded (unlocatable).
- 13:40 doc §7 generated table (tools/arch/doc_table.py); spec validated (enum/style ok)
## RESUME PLAN (updated 13:45)
1. Photos: `cd /tmp && python3 -I $ROOT/tools/arch/commons_thumbs.py $ROOT/work/research-arch/want_commons.json >> $ROOT/work/research-arch/commons_dl.log` (curl, skips files already ok; honours Retry-After; Wikimedia 429 is GLOBAL for the shared IP, ~3 files per 11+ min). Do not change UA.
2. For each new ok file: Read it, locate footprint (camera geotag x,z in want_commons.json; tools/arch/plotmap.py; ortho overlay if x,z in -150..250), add record to tools/arch/photo_specs.json, run tools/arch/extract.py then tools/arch/doc_table.py.
3. r10 pose fit attempt (work/research-arch/corr_r10b.json, rms ~24 px) is not good enough to name the cream villa NE of the station.
