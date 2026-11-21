
## research-census — 2026-11-21 (task brief deliverable 3: scale and position audit) — to: data, commander
- Order: verify 1 game unit = 1 real metre; report a correction to "data" if any pair is off by more than 0.1 %.
- Change: none needed. 20 pairs of survey points (street-junction nodes, named-building corners) in gk3/kifisia_map.json vs WGS84 geodesics (geographiclib).
  Max relative error 0.198 % on a 29 m pair and 0.192 % on a 22 m pair = the map's 0.1 m coordinate rounding (±0.07 m per point), not scale.
  Every pair of 100 m or more: within 0.055 %. Projection formula alone (no rounding): max 0.034 %.
  East-west factor: game 87716 m/deg lon, exact at lat 38.0727 = 87745.7 (-0.034 %, 3.4 cm per 100 m). North-south: 110998 vs 110997.85 (+0.0001 %).
  90/90 checked survey points have a game vertex within 8 cm. Optional (not required): use 87745.7 for x if the map is ever rebuilt anyway.
- Evidence: docs/research/CENSUS.md, section "Scale and position audit"; work/research-census/scale_audit.json; script tools/census/06_scale_audit.py.

## research-census — 2026-11-21 — census.json v202611210833 published (to: data, buildings, interiors)
- gk3/data/census.json: 1343 entries, build set (tiers A+B) 828, of which 462 are not in OSM. Duplicates removed in this round: OSM objects mapped twice (4), and same business listed by two sources with far-off raw coordinates (16, e.g. an Overture "ATM Alpha Bank" 450 m away whose address is Kolokotroni 1). Check: tools/census/dupcheck.py lists 7 remaining same-name pairs, all distinct OSM objects (kiosks, Aigli buildings, Alpha Bank vs Alpha Private Bank).

## research-shops — 2026-11-21 — shops.json v2 + SHOPS.md + INTERIORS §2-6 + GAPS_SHOPS.md (to: buildings, interiors, game, census, commander)
- Order: none addressed to research-shops in docs/ORDERS.md (file absent at 09:55 UTC); task brief priorities 1 + owner update (Starbucks building, Ralph Lauren, supermarkets, Sephora).
- Change: gk3/data/shops.json (392 entries; photo-confirmed Ralph Lauren + Starbucks + Mythos; official Sephora, KFC, PAUL; AB/Thanopoulos/Varsos description). docs/research/SHOPS.md, INTERIORS.md §2-6, GAPS_SHOPS.md.
- Findings others must act on: (1) MAP.special.starbucks is on b425, which is really the Ralph Lauren stone villa (listed "Οικία Κότσικα"); Starbucks is b426 behind/west of it in the Kassaveti 19 courtyard.
  (2) Sephora exists at Λεβίδου 8 = EAST side of Levidou (door ≈ x 141.5, z 2); the game's sephora place is on the west side (x 122.7, z −7.2). (3) census: fsq SEPHORA Λεβίδου 8 at x 145.5 z 62.1 is a bad geocode.
  (4) Old Starbucks Kifisias 238-240 closed; KFC is there (Mela arcade, ex-Grand Hotel de Kifissia 1897); OSM also shows "Gordo". (5) No module loads shops.json yet.
- Evidence: docs/research/img/shops/ralphlauren_*.jpg, starbucks_01_*.jpg, gaps/2026-11-21_*.png; sources listed in SHOPS.md.

## data — 2026-11-21 (no ORDERS.md exists yet; task brief tasks/data.md + owner item 9 + research findings) — to: buildings, streets, interiors, game, commander
- Change: gk3/kifisia_map.json v3 integrated (build_map3.py): 1046 POIs (OSM 412 + Overture 471 + census 161 new; tiers A/B only), every POI in the focus on a facade (691 shop bays, 0 unplaced, no overlaps),
  6 specials with interior {poly, frontage, depth}, key.junction (spawn node), key.sephora (pavement at its door). Calibrated street widths (streets.json + facade clearance), carriageway/junction fillets,
  roadx/addr/junctions/driveways/restrictions/barriers/tree_rows/seats/meta keys. docs/MAP_DATA.md documents every key.
- Research findings acted on: SHOPS.md #1 Starbucks moved to the courtyard pavilion b426 (door 160.5, 67.4); #2 Sephora on the EAST side of Levidou, b432 (door 136.0, 1.5); census bad Sephora geocode ignored.
- For buildings: buildings[i][8] is capped at 165 (legacy sign atlas crashed); the full list is buildings[i][11].shops / MAP.pois. For everyone: register placed objects with placed(kind,x,z,name,featureId).
- Shared-file edit: gk3/js/90_main.js lines 70/76 — cdirty only for car types with instances (a type with 0 parked cars crashed flushCars -> black screen).
- Evidence: tools/data/check_map.py -> RESULT: PASS (scale audit max 0.036 %, buildings within 0.29 m of OSM, roads 0.07 m, spot check 0.19 m); tools/verify_placement.js on main: 67.4 % of 5290 focus features placed;
  shots work/data/shots/v1_*.png, main1_*.png.

## research-census — 2026-11-21 — census.json v202611210845 (web evidence layer v1) — to: data, buildings, interiors
- Change: tools/census/web_entries.json (18 entries, each with URLs) merged: owner-named shops now web-confirmed at their addresses — Starbucks and Polo Ralph Lauren (Kassaveti 19), SEPHORA (Levidou 8; was tier B, now A), AB Vasilopoulos (Levidou 2 / Kassaveti), PAUL (Levidou 4), KFC (Kifisias 238-240), Mythos plus (Kassaveti 13); also Zara (Kyriazi 40, official locator), Kotsovolos (Kyriazi 36, 3-floor store opened June 2025), Panaidis, Papaioannou, Hydé, Incrocio, Tommy Hilfiger. Massimo Dutti (Kolokotroni 8) is now tier X: the brand's Greek store locator lists no Kifisia store.
- Evidence: docs/research/CENSUS.md (regenerated); `python3 tools/census/dupcheck.py` = 7 remaining same-name pairs, all distinct OSM objects. No orders addressed to research-census in docs/ORDERS.md as of this round.
- (data, round "OWNER DIRECTIVE 2026-11-21") Order: give research-arch/buildings every OSM building tag. Change: buildings[i][11].tags = all OSM tags verbatim, plus name, startDate, levels, height, roofShape/Levels/Colour, colour, material (no building:part ways exist in kif.osm). Evidence: check_map PASS; MAP_DATA.md.
- (data, "OWNER-LEVEL CORRECTIONS") Order: wire shops.json. Change: pois[].sj/sjName link 382 of 392 shops.json entries (OSM id, else name ≤ 60 m; specials by brand); entries with a building way pin the POI to that building (22, Ralph Lauren -> b425). Sephora east side (b432, key.sephora = its door) and Starbucks -> b426 already done. Integrated 2026-11-21.

## research-census — 2026-11-21 08:53 UTC — census.json v202611210852: house-number geocoder fix (to: data, buildings)
- Order: none addressed to research-census in docs/ORDERS.md; own task brief (positions by house number, odd/even sides).
- Change: tools/census/addr.py models odd and even house numbers as independent sequences per street when OSM has >= 3 numbers on a side.
  Kifisias Avenue odd numbers run ~30-40 ahead of the even numbers opposite, so the old combined fit put even Nos 244-256 (Fondazione, Blue Bear, Serras Flowers, PNN, RE/MAX, Pastry Family, DHL, BOMBERG, Celest ...)
  up to 384 m too far north (around x -80, z 90 instead of z -100..-270). 22 Kifisias + 1 Kolokotroni build-set entries moved > 40 m; Starbucks/Polo RL (Kassaveti 19) now 2-7 m from the data agent's b426 door.
  Geocoder leave-one-out on 209 OSM house numbers: median 19.8 -> 12.8 m, p90 80 -> 54 m, max 492 -> 270 m (Kolokotroni median 53 -> 14 m, Kifisias 17.8 -> 14.3 m).
- For data: please re-run build_map3.py so census-sourced POIs on Kifisias Avenue move to the right blocks.
- Evidence: census.json positionValidation.geocoderLOO; docs/research/CENSUS.md "Position quality"; `python3 tools/census/addr.py` prints the LOO table.

## interiors — 2026-11-21 — walk-in interiors integrated (to: game, commander, chars)
- Order: "buildings/interiors: KFC is inside the Mela arcade … AB is b30 … PAUL is Levidou 4. Interior plans: docs/research/INTERIORS.md sections 2–6" + task brief (Mythos walk-in, every shop enterable).
- Change: gk3/js/35_interiors.js (+ gk3/interiors/ texture sheets), one script line in index.html, one line in 90_main.js boot(). 720 enterable doors from MAP.pois (map v3) + the 6 specials
  (MAP.special facade points). Hand-made: Mythos Plus (research §1: grill hall, L counter, 2 rotating gyro spits, hood, corten emblems, the 3 real Greek menu boards, neon "garden in", courtyard hall),
  Starbucks §2, PAUL §3, KFC §4, AB §5, SEPHORA §6 (brand-typical, sized to the plans). Others: 21 category templates sized from poi.w + footprint depth. Ordering through the game's openShop(key)
  with INTERIORS[key].menu (Mythos items tagged 'gyro'). docs/INTERIORS.md documents the API.
- Evidence: work/interiors/shots/t3_*.png, m4_*.png (run against MAIN): enter → order → exit OK for mythos, starbucks, paul, kfc, super, sephora, jewellery, salon; 0 page errors.
  Mythos 42k tris / 5 draw calls (+6 people), generic 4–27k tris / 3 calls; rooms are built lazily on entry, boot adds door registration only.

## research-shops — 2026-11-21 run 5 — order "help research-arch: per-building facade specs …; Hondos Center + generic shop interior templates" — to: research-arch, buildings, interiors
- Change: gk3/data/shops.json v3 (still 392 shops) gains two top-level keys (old `shops[]` unchanged, safe for 35_interiors.js):
  (1) `buildings` = 152 records keyed by OSM way id "w<id>" (same as kifisia_map buildings[i][11].id) for every building fronting Kassaveti, Levidou, Kyriazi, Kifisias, Kolokotroni, Argyropoulou, Panagitsas, Miltiadou, Ag. Dimitriou, Othonos, Tatoiou, Drosini.
      4 are PHOTO facade specs in the buildings_spec.json schema (w1076768348 Ralph Lauren villa b425, w1076768349 Starbucks pavilion b426, w1075949835 Mythos Plus b294, w1076626156 Kyriazi 36 / Kotsovolos b391);
      all carry `groundFloor[]` = the real shop units in facade order [edge, t, name, category, fg, bg, widthM] + `shopfronts` count. research-arch: merge PHOTO records as-is; use groundFloor/shopfronts for every other building.
  (2) `interiorTemplates` = 22 dimensioned interior templates (keys = CAT2TPL names in 35_interiors.js + kiosk, arcade, cinema_leisure, fuel, hondos_center_kifisia); every shop entry has `interior.template`.
- Docs: INTERIORS.md §7 Hondos Center Kolokotroni 3 (b475 "Shoppingland"), §8 templates (generated); SHOPS.md §9 "Facades by street" (generated, every building in street order with its shops).
- Findings: Kyriazi 36 Kotsovolos = 3 floors, 785 m², white facade #f0f4f5 + giant red 3D "K" #fb3d38 (opened 13 Jun 2025; newmoney.gr photos, REFONLY). Map bay "Εμπορικο Κεντρο Μελα" sits on b290 (Kassaveti/Kifisias corner), while KFC (Kifisias 238 = Mela arcade per KFC list) sits on b305 — data: check which block is the Mela arcade.
- Evidence: docs/research/img/shops/kotsovolos_0*_REFONLY.jpg; work/research-shops/{facades.py,templates.py,gen_*_md.py}.

## research-streets — 2026-11-21 run (resume) — standing task + OWNER_BRIEF 12/14 support — to: streets, lm-park, lm-isa, lm-junction, buildings
- Change: PUBLISHED gk3/data/streets.json (73 streets = every name in kifisia_map.json; 21 hand-researched with per-segment specs, rest derived from OSM; `styles{}` catalogue of the real local lamps/bollards/paving/railings/bins incl. new `kifisia_double_globe` (Kyriazi) and `baluster_green_yellow` (Kassaveti shop block)) and gk3/data/places.json (22 places: spawn_junction, platanos_square, station, alsos (+ `paths[]` OSM walk network for lm-park), agora, kotsika_house_ralph_lauren, agios_dimitrios, goulandris, kefalari (14 OSM benches, statues, basin), isa (official facts + OSM courts/gates), kifisias_297, cinemas, hotels…). Rebuild: work/research-streets/src/build.py; docs: src/docs.py.
- Docs: docs/research/STREETS.md, PLACES.md (generated from the JSON), GAPS_STREETS.md (game vs reality, 9 sections, exact changes), img/streets/r00–r21 + img/SOURCES.md.
- Findings for streets: `loadStreetSpecs()` in 20_ground.js is defined but was never called when I checked (GAPS §0). Kassaveti has 3 segments with different bollards/lamps (`segments[].bollardsSeg/lampsSeg`) — ball_green bollards belong to x>94 only; the shop block has baluster_green_yellow. Kolokotroni = red-brown block carriageway + cone_black_gold (photo r17).
- Correction: ref photo ids were mislabelled in my earlier notes — r12 = turreted Agora building (Kolokotroni 7), r20 = Kotsika stone villa (Ralph Lauren, Kassaveti 19), r08 = yellow neoclassical house Kifisias 297, r04 = Kefalari grove, r05 = Alsos aerial.
- Evidence: work/research-streets/shots/g1_*.png, g2_*.png (MAIN), view/sheet*.jpg.

## research-arch (2026-11-21, round: OWNER DIRECTIVE items 12 + LANDMARKS corrections)
- Order: per-building spec for every building (OWNER_BRIEF 12, tasks/research-arch.md). Change: PUBLISHED gk3/data/buildings_spec.json, which covers all 948 MAP.buildings and is keyed by the map's own OSM id (MAP.buildings[i][11].id). It also holds `_styles` (18 style classes with real proportions) and `_meta`. 9 records are photo-checked (Mythos Plus b294, Kotsikas house/Ralph Lauren b425, Starbucks pavilion b426, HSBC corner Kassaveti 1 b291 with `parts`, Kolokotroni 7 pavilion b482, Kifisias 297 villa b834, station b173, Agios Dimitrios b0, ISA main building b752), 4 are aerial (Mela arcade/KFC b305, Kifisias 236 b290, b302, b303 from the drone photo r09 with a fitted camera), 1 is description-only (b423) and 932 are inferred, each flagged honestly. Docs: docs/research/ARCHITECTURE_KIFISIA.md. Tools: tools/arch/ (extract.py regenerates; photo_specs.json is the hand layer).
- Order (corrections): b425 = Kotsikas house (Ralph Lauren), b426 = Starbucks: both are in the spec as `chalet_villa` with full details. KFC = Mela arcade b305: the spec notes record that the drone photo shows a low colonnaded arcade under a low hipped terracotta roof, not a visible 3-storey neoclassical front.
- Evidence: docs/research/img/arch/r09_platanos_footprint_overlay_CCBYSA.jpg (map footprints with indices drawn over the drone photo), work/research-arch/sheets/*.jpg.
- Gap: Commons API and upload.wikimedia.org answer 429 for this session. The spawn-junction buildings other than Mythos (AB b30, PAUL b434, b293, b295, b388, b435) are still inferred.
- research-shops → research-arch (09:30, CORRECTION, please apply): the Kolokotroni 7 twin-turret pavilion (Commons "Κολοκοτρώνη 7, Κηφισιά 0913", Marina Rinaldi) is map **b477 = w1077112775**, NOT b482/w1077113199.
  Evidence: the photo's camera point (Commons coords 38.072551, 23.816051 → x 311.5, z 16.5) is 21 m south of b477 and 75 m from b482; the Marina Rinaldi tenant (census/OSM, x 316.7 z −5.3) lies inside b477; b477's footprint (17.6 × 14.4 m) matches the ~17 m symmetric front; b482 is a 33 × 27 m 4-level corner block tagged Κολοκοτρώνη 11 (Vagenas, Agora Deco&Deli, BSB…).
  Full photo spec: shops.json buildings["w1077112775"]. Also new: shops.json buildings["w1076626156"] = Kyriazi 36 (Kotsovolos) PHOTO (white facade, red 3D "K"), replace your inferred retail_modern.
- (mats, 2026-11-21 09:45) No order addressed to mats; in support of the OWNER DIRECTIVE (architecture first): added building materials TM.karystos (Karystos stone slabs) and TM.timber (stained timber boards) to the texture array, documented in docs/MATERIALS.md §1 how to map buildings_spec.json facade materials (stone_clad_base/stone_cladding -> TM.marbleW + stone colour, neo_villa -> TM.ashlar, garden_wall -> TM.rubble/TM.karystos). Evidence: work/mats/shots/r9_kt.png; mtest all checks passed (work/mats/tmp/mt1.log). Also lighting pass: warmer golden hour, darker night with lamp pools (work/mats/shots/r8_*.png).

## lm-starbucks — 2026-11-21 09:20 UTC — Kassaveti 19 courtyard boundary (to: lm-ralphlauren, buildings, streets, walls)
- Proposal (task brief: "coordinate the shared boundary with lm-ralphlauren"). lm-starbucks builds: b426 (Starbucks pavilion) completely; the courtyard PAVING (grey stone flags, at courtyard level + 2.5 cm) over the
  whole polygon street-wall (156.5,70.7)-(160.2,72.0)-(164.0,73.3)-(167.8,74.6)-(173.0,76.4)-(174.6,76.6) -> b423 corner (178.7,64.6) -> RL front vertices (172.8,66.4)...(161.5,62.8) -> RL west wall up to ~(163.6,56.3)
  -> Starbucks NE corner (162.1,56.1) -> Starbucks east facade -> (156.0,69.2); the street-edge stone planters on the WEST wall segment (156.5,70.7)-(164.0,73.3) (I neutralise that MAP.walls entry at build time so 40_walls does not
  also build it), the gate piers at (164.0,73.3)/(167.8,74.6), Starbucks terrace furniture + green umbrellas, courtyard lanterns, the courtyard pine.
- lm-ralphlauren builds everything attached to b425: marble steps + railings (they stand ON my paving: please do not pave the courtyard polygon, start your geometry at courtyard level = groundY + 0.025 m),
  the bay-front garden/brick planters (within ~2.5 m of the bay), the side passage east of the villa to b423 and anything north of the villa. The EAST street-wall segment (167.8,74.6)-(173.0,76.4) stays with 40_walls unless you want it.
- Note for lm-ralphlauren: OSM cafe node "Different Beast" (166.45,69.46) is in the courtyard; the map put its sign on b425 edge 6. Your call (I do not build it).

## research-census — 2026-11-21 09:15 UTC — census.json v202611210914: new source vrisko.gr + overrides (to: data, buildings, research-shops)
- Order: none addressed to research-census; own task brief source 4 (Greek directories, category by category).
- Change: vrisko.gr (Greek yellow pages) Kifisia listings of 33 shopfront categories harvested (robots.txt allows /dir/; 3 s per request): 217 businesses in the play area,
  192 of them confirm an existing census entry (32 tier upgrades, e.g. Gap/Sugarfree/eyeQ/HEEL Kyriazi 34-36, Fratelli Petridi Kifisias 242, American Vintage Levidou 5),
  25 are new (7 kiosks with owner names: Περίπτερο Λώλης Kolokotroni 1, Καραντουμάν Kyriazi 36, ...; TISSA Kassaveti 6; ROCOCO UOMO + ΝΑΝΑ Levidou 5; OPTIKER Kifisias 246; ΟΡΑΜΑ + PLANET HOLIDAYS Kolokotroni 7; ...).
  tools/census/overrides.json: HSBC at Kassaveti 1 is now **CrediaBank** (HSBC Greece -> Pancreta -> Attica Bank, rebranded CrediaBank 2025; vrisko lists CREDIABANK at Kassaveti 1): entry renamed, `rebrandedFrom:"HSBC"`.
  Shops inside an arcade/mall (address "Εντός ..."/"Στοά") now `inside:true, streetLevel:false`; counters inside Hondos Center dropped.
- For data: re-run build_map3.py (build set 824 -> 854; the HSBC sign should read CrediaBank).
- Evidence: docs/research/CENSUS.md (Method 4b, totals); work/research-census/raw/vrisko/ (cached pages + vrisko_items.json); `python3 tools/census/dupcheck.py` = 8 pairs, all distinct OSM objects or pre-existing.

## streets — 2026-11-21 (no order addressed to "streets" in docs/ORDERS.md; task brief tasks/streets.md + research streets.json/places.json + MAP_DATA v3) — to: commander, data, chars, mats
- Change (integrated into main): 20_ground.js road markings/decals in road coordinates (lane lines, bays, arrows, stop lines, zebras at mapped crossings, tactile, manholes, drains, patches), fillets (map v3), streets.json loaded at boot (sidewalk material per street), block-paved carriageways (Kolokotroni, Levidou); 45_trees.js rewritten (branching plane/pine/olive skeletons + leaf cards, 3-tier distance pools; Platanos old plane at the research position −68.1, 14.2); 50_props.js rewritten after the streets.json styles catalogue (kifisia_lantern, kifisia_globe, avenue_mast, pole_arm, globe_cluster lamps; cyl_black_yellow / ball_green / cone_black_gold bollards), benches at OSM yaw, OASA shelters, periptera, fountains, taxi/clock/playground/charging/bike/water/info, places.json landmarks (pedestal monument, statues/busts, Dexameni tank, dovecote, buffer stops, Platanos taxi rank); 40_walls.js bougainvillea + mapped gates; 55_rail.js sleepers in a distance pool + third rail.
- placed(): lamps 1050, bollards 2218, trees 3533, benches 25, bins 11, signals 25, stop signs 22, bus stops 20, kiosks 8, fountains 11, gates 13, crossings 63, + taxi/clock/playground/charging/bike/info/monument/statues/landmarks/buffer stop (walk test count on main).
- Evidence: work/streets/shots/D1_*, E1_*, shots_main/M2_* (main boots, no errors; whole-scene 415–515k tris, 86–135 calls in the shot views); docs/STREETS_IMPL.md.

## research-arch — 2026-11-21 13:10 — round "OWNER DIRECTIVE 12" (continued) + research-shops correction 09:30 — to: buildings, lm-*, commander
- Order: research-shops correction (Kolokotroni 7 pavilion = b477 w1077112775, Kyriazi 36 Kotsovolos = photo). Change: applied; b482 w1077113199 is now its own photo record (Kolokotroni 11: cream 4-storey block with a rounded glazed east corner bay and recessed shop arcade, NOT a glass curtain wall).
- Order: OWNER_BRIEF 12 (per-building spec). Change: PUBLISHED gk3/data/buildings_spec.json v2 (version in _meta): + `groundFloor[]`/`faces` for 152 buildings (research-shops tenants in facade order); + measured roofs for 180 central buildings from the Cadastre orthophoto (`roofOrtho`, `roofSrc:"ortho"`: tile -> hip + measured colour, flat, mixed -> `partly_tiled_roof` + `roofPartColour`); + photo records b50 (roofless stone ruin by the station), b68 (white saw-tooth 5-storey block facing the platforms), b69, b482, b423 (brick arcade, now photo), Ralph Lauren enriched from a 2nd Commons photo. Counts: photo 15, aerial 4, osm 2, inferred 927. `style` is now always a `_styles` key (finer label in `styleDetail`).
- Spawn junction from the orthophoto: 293 (NW corner) tiled hip; 435 (NE) flat; 388 (SE) tiled hip with a round corner turret + grey dome facing the junction and a glazed atrium; 30 AB (SW) flat with a light well; 434 PAUL half hip / half flat terrace.
- Docs: docs/research/ARCHITECTURE_KIFISIA.md §2b (new fields), §6 gaps. Evidence: work/research-arch/sheets/oc_spawn.jpg, oc_platanos.jpg (classification over the photo), r10_crops.jpg, r18_crop.jpg, b423_crop.jpg.
- Gap: Commons answers 429 (Retry-After 600) after ~1 file; a downloader honouring Retry-After is fetching the remaining 80 files slowly. Facades of AB, PAUL, 293, 388, 435 are still class inferences.

## lm-park — 2026-11-21 13:20 — LANDMARKS (OWNER_BRIEF 14): the Alsos (Kifisia grove) 1:1 — to: streets, game, mats
- Change: INTEGRATED gk3/js/89f_lm_park.js v1. Everything inside OSM way 32324869 (park polygon) is now built by lm-park from OSM + the georeferenced straight-down aerial ref/r05.jpg: gravel field, 44 beds with clipped box hedges, 194 box balls, 128 trees of 10 species at their traced positions (instanced), 28 benches (+SEATS), 8 globe lamps, the round ribbed fountain (+ coin-toss INTER), domed pavilion, 3 small buildings, the riveted iron water tank (r07), ALSOS CAFE BAR (+ order INTER via openShop if present).
- streets: you do NOT need to skip anything by hand — while buildAreas/buildRoads/plantTrees/buildProps/buildFurniture run, lm-park temporarily filters out the park lawn area, footway strips (ty 7/8) >1.5 m inside, garden/street trees and props.tree inside, benches/baskets >3 m inside, lamps/bollards >4 m inside and the OSM fountain; restored right after. Please keep these entry-point names and the MAP keys (areas, garden_trees, street_trees, props.bench/basket/tree/fountain, lamps, bollards) and ROADS[].side/.ty/.ps. The perimeter wall/railing (40_walls 'park') and the edge kiosks (50_props) stay yours.
- Public: PARKLM.inPark(x,z,marginM), PARKLM.stats. Research: docs/research/lm/park.md. Evidence: work/lm-park/shots/v1_*.png.

## data — 2026-11-21 13:25 — COORDINATION NOTE for the SHOP PLACEMENT AUDIT (OWNER_BRIEF 16) — to: research-census, research-shops, buildings, commander
- Split so we do not duplicate: **data** fixes the pipeline (build_map3.py rules: OSM-surveyed position wins; Overture/census built only with a verified address and no collision with an OSM shop;
  same-brand duplicates within 60 m merged; closed dropped; side-of-street/building checks) and measures the GAME (runtime dump of every sign the renderer actually built:
  tools/data/dump_signs.js -> work/data/audit/signs_*.json) against raw OSM shop nodes (tools/data/placement_audit.py -> overlay PNG + per-street tables).
- In docs/research/PLACEMENT_AUDIT.md data writes the section "B. Game vs OSM — measured (team:data)" and "C. Pipeline rules (team:data)". research-census: please keep your parts
  (real street order from verified addresses) in their own sections; append, do not overwrite the file.
- research-arch → lm-starbucks, lm-ralphlauren, lm-kassaveti, lm-junction (13:40, support for OWNER DIRECTIVE 13:10): top-down reference for the Kassaveti 19 site and the whole Kassaveti block: docs/research/img/arch/ortho_kassaveti19_REFONLY.jpg (0.07 m/px, map footprints + indices: villa b425 tiled roof with the steep gable, Starbucks b426 dark roof, slatted pergola terrace west of b426 over b437's side, courtyard/garden south of both, brick arcade b423 flat roof) and ortho_kassaveti_roofclass_REFONLY.jpg (x −60..200: left photo, right roof classes orange = tile, yellow = mixed, blue = flat). Photo c. 2007-2010, so tenants/pergolas may have changed. Second street photo of the villa + brick arcade: docs/research/img/arch/commons/Οικία_Κότσικα_Κηφισιά_0934.jpg (CC BY-SA 4.0).

## research-census — 2026-11-21 13:45 — ORDER item 16 SHOP PLACEMENT AUDIT, Part A + census position fix — to: data, buildings, research-shops, commander
- Order: OWNER DIRECTIVE 13:00 / OWNER_BRIEF 16 (shop placement audit; shared with data). Split per data's 13:25 note: research-census owns Part A of docs/research/PLACEMENT_AUDIT.md
  (between the `BEGIN/END Part A` markers, regenerated by `python3 tools/census/11_placement_report.py`; text outside the markers is preserved — data, write Parts B/C below the END marker).
- Change 1 (published in MAIN): `gk3/data/placement_audit.json` — per game sign: truth (OSM surveyed / verified address / single listing), truth facade `tf {b,e,t,fx,fz,faces}`, delta, flags
  (DUPLICATE, WRONG_SIDE, WRONG_STREET, WRONG_BUILDING, SHIFTED, ON_OSM_BAY, CLOSED, UNVERIFIED, SINGLE_LISTING) and `action`; `missing[]` = real businesses without a sign with their truth facade.
  Tools: `tools/census/09_placement_audit.py [map.json] [--out=file]` (any map, ~2 s), `10_placement_plot.py` (docs/research/img/placement/: overview + 9 street panels, every delta > 4 m drawn), `11_placement_report.py`.
- Result: map 08:50 → main 13:37 (data v3.1): signs 807 → 568; misplaced/should-not-exist 258 (32 %) → 93 (16 %); duplicates 70 → 0; wrong side 12 → 1; wrong street 45 → 0; wrong building 139 → 42;
  OSM shops > 4 m from their shopfront 78 → 52 of 351 (median 1.4 → 0.9 m); closed drawn 1 → 0; unverified drawn 9 → 0; real businesses with no sign 6 → 23.
- For data (remaining, PLACEMENT_AUDIT §4): (a) **Κολοκοτρώνη 1 = OSM building b33 "Φοίνικας" (shop=mall, addr Κολοκοτρώνη 1)**: the 13 listings with that address (Bowling Center, EMS, Hom+ Plus, ZerTeo, SmileWorks…) are inside the arcade → b33 directory/arcade, not the frontage of the unnamed neighbour b931;
  (b) b443 Kolokotroni: 11 OSM shops 4–12 m off (bay packing; centre each OSM bay on its tf.t); (c) b33/b478 corner shops (Swiss line, Dontas Real Estate, ElenaMakri.com, Tan beautiful) on the wrong edge of their building (30–38 m);
  (d) b263→b262 Kifisias: 7 listings one building north. 23 missing listed in §9 with truth facades.
- Change 2 (census.json 202611211336, MAIN; CENSUS.md regenerated): 05_merge.locate fixes — a web entry geocoded from its own address no longer counts as an independent coordinate (Zara had posErrM 12 from two web geocodes "agreeing");
  if the preferred source disagrees with the address, a source agreeing with the address is used, else the address geocode (err ≤ 30); snapping uses the house-number parity side. Validation vs OSM (same entities): median 12.6 → 11.5 m, final:source median 13.9 → 10.1 m.
  Examples: American Vintage Levidou 5 → west side (was east); Sephora Levidou 8 stays east (x 139.8, z 2.5); Lynne/Kiko on Kyriazi moved to their number's block.
- Evidence: docs/research/PLACEMENT_AUDIT.md (Part A), docs/research/img/placement/*.png, work/research-census/placement/before_0850.json (audit of the 08:50 map = work/data/tmp/test_map.json).

## cars — 2026-11-21 13:20 — round "OWNER DIRECTIVE 12:50 (OWNER_BRIEF 15): DRIVING MUCH SIMPLER" — to: commander, game
- Integrated into main: new js/70_vehicles.js (lofted procedural cars: mini/hatch/sedan/taxi/exec/suv/suvL/van/bus, scooters/delivery scooters/motorbikes in rows,
  exotics Furia V12 / Cobalto RS / Titan 4x4 / Riviera Spider + Ferrari 458 from models/ferrari.json (CC BY, in CREDITS), Greek plates, lights, near/far LOD),
  js/72_driving.js (simple arcade driving), js/76_traffic.js (lanes, Bézier junctions, signals, stop signs, bus, out-of-sight spawning), js/83_audio.js (layered engine synth).
- Driving order, item by item: auto-throttle (DRV.auto, default on; steering finger down = drive, lift = firm coast-down; setAutoThrottle(on) for a menu toggle — game/menu:
  please add a "Auto-throttle" switch that calls it); one-finger steer on the left half (shared edit 90_main.js joySet: in a car jx = clamp(dx/R), horizontal only);
  big Brake button (shared edit index.html: #bBrake 96 px in the corner, #bGas 70 px, #bHand/#bHorn moved so nothing overlaps); strong auto-straighten; traction assist
  (no lateral slip below 60 km/h, drift capped so no spin-outs); auto-reverse after holding Brake 0.22 s while stopped; soft collisions (only the into-wall velocity is removed,
  nose turns along the wall) + auto-unstuck after 2 s of pushing without progress (unstuckCar: nearest free spot with clear road ahead); one-tap Car within 3.6 m of any car;
  pressing Car while moving brakes and exits automatically. Camera: shared edit 80_player.js car branch — on portrait phones a 28% longer boom and +16° FOV so the road ahead
  is visible (the existing look-ahead + whisker rays keep it out of walls).
- Evidence: work/cars/shots/p1_d*.png + p1_sheet.png (390x844 phone: entered car with one tap, drove with auto-throttle, crashed into a shopfront, auto-unstuck fired;
  533 vehicles, 5 exotics, Ferrari model loaded, no page errors). Fixed-step physics run tools/cars/ptest.js queued for a browser slot (results will be appended).

## data — 2026-11-21 14:50 — SHOP PLACEMENT AUDIT (OWNER_BRIEF 16), per-shop verification (13:05), building heights (13:30) — to: commander, buildings, research-census, research-shops, research-arch, interiors
- Order 16 (placement audit). Change: build_map3.py placement rules rewritten and INTEGRATED (kifisia_map.json v3.1, main 14:20, refreshed 14:50): OSM-surveyed position wins (containing building, never across a
  street, never moved for capacity; surplus -> directory of the same building); Overture alone never built (was 285 signs); census-only shops only with a verified address, built AT the
  address on the address side in frontage free of OSM bays; same name within 60 m merged; closed / tier C never built; Sephora on the EAST side of Levidou (b432). Bug fixed: "Κηφισίας" was a
  stop word in the name normaliser, so no Kifisias Avenue address could ever match its street.
  Evidence: signs 691 -> 397; OSM shops > 4 m from their real facade 54 -> 24 (tools/data/placement_audit.py, bay-segment metric) and 86 -> 59 of 351 with research-census's own
  09_placement_audit.py (run on a private copy: work/data/cxtools, outputs work/data/audit/cx; it did NOT overwrite gk3/data/placement_audit.json); DUPLICATE 0, CLOSED 0, WRONG_SIDE 1.
  check_map.py PASS. Docs: docs/research/PLACEMENT_AUDIT_DATA.md (B measured, C rules, D per-shop table, E street tables) + pointer appended to PLACEMENT_AUDIT.md; images docs/research/img/placement_data/.
- Order 13:05 (verify one by one): docs/research/PLACEMENT_AUDIT_DATA.md section D = 1020 rows for Kassaveti, Levidou, Kyriazi, Kolokotroni, Argyropoulou, Kifisias, Platanos, Othonos, Deligianni:
  name | street no. | address source | game x,z | real x,z | delta | status (verified 367 / moved 51 / removed 92 / unverified-not-built 510). Regenerate: python3 tools/data/assemble_audit_doc.py.
- Order 13:30 (heights): Copernicus Urban Atlas Building Height 2012 sampled WITHOUT login from the public EEA ImageServer (getSamples). The service gives height CLASSES (2-4, 4-6, 6-8, 8-10,
  10-15, 15-20, 20-30 m...). Per building: MAP.buildings[i][11].ua = {cls, hM:[lo,hi], h (band middle), lv:[lo,hi] (4.0 m ground floor + 3.2 m floors), built}; 880 of 948 buildings
  (AB b30: 10-15 m, 3-4 levels; Starbucks pavilion b426: 6-8 m). research-arch: tools/data/src/ua_bh2012_buildings.json (keyed by map building index) is ready to merge into
  buildings_spec.json (heightM / levels, source "copernicus-ua-bh"); it is 2012 data at 10 m: small/new buildings have built < 0.5 or no class. CREDITS.md appended.
- For buildings: the map now carries far fewer, correctly placed bays; bays keep 0.3 m margins/gaps like layoutEdges(). HSBC is now "CrediaBank" in MAP.pois (census rebrand, formerName:"HSBC")
  but shops.json still says HSBC, so the sign text may still read HSBC: research-shops/buildings please follow the census rebrand.
- Gap: runtime dump of the signs the renderer actually draws (tools/data/dump_signs.js) still waiting for a browser slot at the time of writing; see PROGRESS.md for its result.

## chars — 2026-11-21 13:50 (orders: "ISA IB Student" NPCs; Sephora moved to the EAST side of Levidou 8) — to: commander, game
- Order (IB students, OWNER_BRIEF 13): 3 fictional teen NPCs in main (models/cast.json ids ib_gate / ib_starbucks / ib_platform): floating "ISA IB Student" label (sprite, always on top,
  fades 22-38 m, hidden indoors), backpack, protected (never targetable). Dialogue is IB-only: talkTo() calls p.dialog = castDialog (75_npc.js), whose choices are
  "So… how is IB going?" (another random IB line, never the same twice in a row) and "Good luck. You've got this!" — no generic small talk. 15 lines (the 10 of the brief + 5 more).
  Evidence: work/chars/shots/s5/t7_ib_gate.png, t7_ib_starbucks.png, t7_ib_platform.png; log: each returned an IB line; no JS errors.
  Gap: no Starbucks terrace seat exists in the data, so ib_starbucks stands beside Starbucks texting instead of sitting with the laptop (will add an own table if lm-starbucks builds none).
- Order (Sephora east side): no change needed in my code: the homeless man (Mr. Lefteris) follows MAP.key.sephora (now 136.0,1.4) snapped to the map shop "SEPHORA" (138.1,2.5, facing west onto Levidou);
  he sits 2.6 m beside the entrance at (138.7,-0.1). Evidence: work/chars/shots/s5/t7_home.png (Sephora shelves visible behind him).
- Also integrated: paintball hold/aim poses for the weapons module (Person.setCarry('aim_pistol'|'hold_pistol'|'aim_rifle'|'hold_rifle'), aimPitch, handWorld(), handProp),
  npcReact(n,'hit'|'near'|'aimed',x,z), npcTargets(x,z,r) (never returns protected people), isProtected(p). Docs: docs/CHARACTERS.md.

## research-census — 2026-11-21 14:00 — OWNER DIRECTIVE 13:05 "verify shops ONE BY ONE" (Part A §7) + census 202611211349 — to: data, research-shops, commander
- Order: per-shop verification table for the core streets. Change: docs/research/PLACEMENT_AUDIT.md §7 (generated) now has, per street side and in REAL order, every game sign plus every real
  business without a sign plus every sign removed since the 08:50 map: s | No. | shop | address source (cited: [web] store locator / shop site URL, [vrisko.gr] listing URL, OSM id link, Foursquare, Overture (+sub-source)) |
  game # | game x,z | real x,z | Δ m | status. Streets: Kassaveti, Levidou, Kyriazi, Kolokotroni, Argyropoulou, Kifisias, Platanos square, Othonos, Deligianni.
  Status totals on main 13:49: verified 223, verified (moved since 08:50) 61, misplaced → move 80, unverified (weak listing) 53, missing → add 17,
  removed: single listing 95, duplicate 14, no listing 5, closed 1, **VERIFIED but not rebuilt 3** (Travel Plan Kifisias 226, Fondazione Kifisias 256, Kessaris Kifisias 238-240 — data: please rebuild).
  Also in the table as missing → add (verified/OSM, no sign): ΕΛΤΑ Levidou 3α, Suba Levidou 11, Natu Levidou 13, Imaginarium Levidou 2, Engel & Völkers Kolokotroni 7, Argo Exchange Kifisias 236 …
- Census 202611211349: vrisko round 2 (17 more categories: mini-markets, souvlaki, burger, OPAP, dry cleaners, tobacco, Italian, sushi…) — only +2 entries/+2 tier upgrades in the play area: the directory is saturated for these categories.
  Web check of FSQ-only Alpha Bank "Levidou 6" and Τσαντίλης "Levidou 8": no confirming source found → they stay tier B (removed from the game by v3.1; correct under the rule). xo.gr is behind a Cloudflare challenge (not used).
- Evidence: PLACEMENT_AUDIT.md §1 table, §7; gk3/data/placement_audit.json; work/research-census/placement/audit_tables.json.
