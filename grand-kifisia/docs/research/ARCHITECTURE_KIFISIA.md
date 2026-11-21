# Architecture of central Kifisia: per-building spec (research-arch)

Owner priority (OWNER_BRIEF item 12): every building should look like the real one. This file explains the data in
**`gk3/data/buildings_spec.json`**, the style classes it uses, and how far each building has been checked against a photo.
Read it together with `_styles` inside the JSON (the same classes, machine-readable).

## 1. How honest is the data (read this first)

| confidence | meaning | count (current) |
|---|---|---|
| `photo` | facade checked against a street-level photo listed in `photos` (open licence or reference-only) | 18 |
| `aerial` | roof shape, roof colour, storeys and massing read from a drone photo; facade detail is the class default | 7 |
| `description` | text description only (no photo) | 0 |
| `osm` | `building:levels` / `roof:shape` tagged in OSM | 2 |
| `inferred` | style class chosen from street character, footprint size, shops on the ground floor and map data; **not verified** | 921 (PAUL b434 uses the shops.json storey count) |

OpenStreetMap has almost no 3D tags here (3 buildings with `building:levels`, 1 with `roof:shape`, 0 with colours).
Overture Maps buildings (release 2026-11-18, 6,424 footprints in the bbox) were checked: 1 has a height and 12 have
`num_floors`, all from OSM, so Overture adds nothing. No Google imagery was used.
Wikimedia Commons is the main open photo source. It returned HTTP 429 (rate limited) for this session's shared IP
during the whole of v1. A slow crawler (`tools/arch/commons_slow.py`, at most one request every 12 s with long back-off)
is still collecting more file names. The photos already in `ref/` and `docs/research/img/` (22 Commons files by C messier
and others, plus shop photos) are what v1 is based on.

## 2. File format: `gk3/data/buildings_spec.json`

Every top-level key that does not start with `_` is one building, keyed by the **OSM id exactly as `kifisia_map.json` stores it**
(`MAP.buildings[i][11].id`, e.g. `"w1075949835"`). `_meta` holds the version and counts. `_styles` holds the style classes (section 3).
Records are sorted in the owner's build order (`zoneOrder` 1 = spawn junction … 9 = everything else).

```
"w1075949835": {
  "name": "Mythos Plus building (Kassaveti 13)", "addr": "Κασσαβέτη 13", "street": "Κασσαβέτη", "streetLatin": "Kassaveti",
  "osm": "way/1075949835", "map": 294, "x": 78.9, "z": 33.9, "lat": .., "lon": .., "areaM2": 221,
  "zone": "spawn_junction", "zoneOrder": 1,
  "style": "interwar", "levels": 2, "gfH": 4.6, "floorH": 3.4, "heightM": 8.5,         // metres; heightM = top of parapet / roof ridge
  "roof": "flat|flat_solar|hip|gable|pyramid|dome", "roofColour": "#hex",
  "facade": {"colour": "#hex", "material": "plaster|stone|marble|brick|glass|metal", "base": "#hex or material", "baseNote": "..", "trim": "#hex"},
  "balconies": {"type": "none|continuous_slab|individual|recessed|glass", "rail": "alu|iron|glass|masonry|wood", "perFloor": bool, "depthM": n, "note": ".."},
  "setbackTop": bool, "pilotis": bool, "awnings": "none|fabric|fixed", "shopfronts": n,
  "features": ["white_balustrade_terrace", ...],      // free-form tags, snake_case, read them as a checklist
  "parts": [{"pos":[0,0.55], "style":.., "levels":.., ...}],   // optional: one OSM footprint holding several real buildings
  "eavesM", "raisedGroundM", "roofPitchDeg", "notes": optional,
  "photos": ["ref/r11.jpg", ...], "source": [...], "confidence": "photo|aerial|description|osm|inferred",
  "osmTags": {...}                                       // raw OSM building/roof/addr/name tags
}
```
Notes for the buildings bot:
- `map` is the index at generation time. If `kifisia_map.json` is rebuilt, match by id; fall back to the nearest footprint to (x, z).
- `parts[].pos` is a 0..1 range along the footprint's longest axis, measured from its west (or north) end.
- `gfH` is the floor-to-floor height of the ground floor; upper floors use `floorH`. Shops get 4.2–5.0 m ground floors; flats 3.0–3.2 m.
- `heightM` already includes the parapet (0.9 m) or the roof, plus a set-back top floor (3 m) when `setbackTop` is true.
- Colours are sampled from the photos where the record is `photo`/`aerial`. Otherwise they come from the class palette, picked deterministically from the id.
- Regenerate with `python3 -I tools/arch/extract.py` (base layer from the map and OSM, then `tools/arch/photo_specs.json` on top).

### 2b. Layers added in v2 (2026-11-21 afternoon)
- **Roofs from the orthophoto (`roofOrtho`, `roofSrc:"ortho"`)**: one 400 x 400 m mosaic of the Hellenic Cadastre open orthophoto
  (x, z -150..250, 0.25 m/px, flown c. 2007-2010, reference only, never shipped) was classified per footprint (`tools/arch/ortho.py measure`):
  terracotta-tile fraction, vegetation, light flat roof. 186 buildings carry `roofOrtho {kind: tile|mixed|flat, tileFrac, veg, colour}`.
  For 180 of them (not `photo`/`aerial`, not hidden by trees) the roof was **set from it**: `tile` -> `roof:"hip"` + measured `roofColour`;
  `flat` -> `roof:"flat"` + measured light colour; `mixed` -> flat + feature `partly_tiled_roof` + `roofPartColour` (typical: a flat terrace with a
  small tiled penthouse or a tiled pent strip). Their `confidence` stays `inferred` (facade unverified) but the roof is measured.
  Checked by eye: `work/research-arch/sheets/oc_spawn.jpg`, `oc_platanos.jpg` (left: photo, right: orange = tile, yellow = mixed, blue = flat).
  Findings near spawn: 293 (Goody's corner) and 388 (corner block with the **round corner turret and grey dome**, central glazed atrium) have
  tiled hip roofs; 434 PAUL has a hip roof over its south-east half and a flat terrace north-west; 294 Mythos, 295, 30 (AB, with a light well),
  435 are flat; 431/432 are flat terraces with small tiled penthouses; 288 has a hip roof in grey-green sheet.
- **Ground floors from research-shops (`groundFloor`, `faces`)**: 152 buildings carry `groundFloor[] = [edge, t, name, category, fg, bg, widthM]`
  (real shop units in facade order; `edge` = footprint edge index, `t` = 0..1 along it) and `shopfronts` = their count. Build shop bays from it.
  Inferred villa/house records that have real tenants now get a 4.2 m shop ground floor (feature `converted_ground_floor_shops`); tiny ones
  (< 60 m2) become 1-storey shop pavilions (`styleDetail:"shop_pavilion"`).
- New photo record: **b8 w302682638 = Retsinas Mansion / Goulandris Natural History Museum (Levidou 13)**: was inferred as a 4-storey block; it is a
  2-storey pale-yellow chalet villa with dark-red carved bargeboards, an ogee central gable and a single-storey front wing with a roof terrace (ref/r14).
- `styleDetail`: a finer label when a record's own class is not one of `_styles` (e.g. `modern_retail_block_1980s_refaced`, `ruin_shell`);
  `style` is then always a valid `_styles` key. `roofDetail`: free text where the roof enum is not enough (e.g. the roofless ruin w1072202922).
- New photo records: Kolokotroni 7 pavilion moved to **b477 w1077112775** (research-shops correction), Kyriazi 36 Kotsovolos b391 (research-shops),
  and from the station drone photo `ref/r10.jpg` (Commons "Κηφισιά 4110"): **b50 w1072202922 = the roofless stone ruin** between Tatoiou and the rail
  cutting (OSM `building=ruins`), **b68 w1072358338 = white 5-storey block with a saw-tooth plan**, deep continuous balconies, setback top floor,
  facing the platforms across Gr. Lampraki, and b69 w1072358339 = 3-storey hip-roofed white house south of it (position match, moderate).
- Tried and rejected: building heights from shadow lengths in the orthophoto (`tools/arch/shadow.py`). Shadows fall east (afternoon flight) but in
  this dense, tree-lined centre most of them land on neighbours or trees; the per-storey spread was larger than one storey, so no heights were taken from it.

## 3. Style classes (real proportions)

Kifisia grew as the summer resort of wealthy Athenians after the railway arrived in 1885. Neoclassical and eclectic villas and
"Swiss chalet" stone villas came first. Interwar houses followed, then post-war apartment blocks (polykatoikies) built under
antiparochi, held lower than in Athens by the garden-suburb planning rules. Since about 2000, new glass-and-stone retail
buildings have gone up on the shopping streets. What the photos show:

| class | storeys | ground / upper floor (m) | facade | balconies | roof | photo examples |
|---|---|---|---|---|---|---|
| `neo_villa` neoclassical villa/town house 1880-1930 | 1-2 (+raised ground 0.6-1.6 m) | 4.6 / 4.3 | ochre, cream, pale yellow or salmon render; white mouldings, cornice, quoins/pilasters; tall windows 1.15 x 2.4 m every ~2.6 m, green/blue shutters; symmetric 3-5 bays | one central marble balcony on consoles, black iron rail | hip 25-30°, red tiles, eaves 0.6-0.9 m with dark soffit; pediments with a salmon tympanum | ref/r08 (Kifisias 297), ref/r11 (HSBC corner), ref/r14 (Goulandris) |
| `chalet_villa` romantic stone villa 1890-1925 | 2-3 | 4.3 / 3.9 | rough honey limestone #c4a68a, big quoins, white string course, white small-pane casements | white timber balconies on carved brackets | steep gable 45-55°, white carved bargeboards, finial, dormers | ref/r20 (Kotsikas house / Ralph Lauren) |
| `eclectic_pavilion` | 1-2 | 6.0 | white render, stone plinth, arched display windows | none | round towers with conical grey roofs, gold finials, scalloped tile cornice | ref/r12 (Kolokotroni 7), ref/r06 (Agora) |
| `interwar` 1925-1960 | 2-3 | 4.2 / 3.5 | plain render or stone, thin cornices | simple iron bars or solid parapets | flat with parapet, or low hip | Mythos Plus building; 302 (stone, hip roof) |
| `poly_6080` polykatoikia 1960-85 | 3-5 | 4.2 shops (3.1 flats/pilotis) / 3.0 | white/off-white render, marble-clad shop columns | continuous cantilevered slabs 1.2-1.6 m with marble edges; aluminium or iron rails or masonry parapets; one drop awning per bay (beige, green, terracotta, stripes) | flat, parapet 0.9 m, solar heaters, antennas, AC units, stair bulkhead, often a set-back top floor | ref/r11 (block left of HSBC), ref/r09 (Kifisias Ave) |
| `poly_8000` 1985-2005 | 2-4 | 4.2 / 3.05 | ochre/cream/apricot render, stone-clad base and strips | individual or recessed balconies, masonry parapets with iron top rail | low tiled hip over the top floor or tiled pergola | ref/r09, ref/r10 (backgrounds) |
| `poly_modern` 2005-2025 | 2-4 | 4.5 / 3.1 | white/grey render, large stone/HPL panels | frameless glass, deep recessed balconies | flat, hidden plant | |
| `retail_modern` | 2-3 | 5.0 / 3.6 | curtain wall or stone panels, flush signage | none | flat | |
| `arcade_retail` (Platanos) | 1-2 | 4.4 / 3.4 | cream render behind a 3 m deep colonnade of square pillars every 4-5 m, café terraces | none | low hip 20°, terracotta, eaves 0.8 m | ref/r09 (Kifisias 236, KFC block) |
| `villa_modern` 1975-2015 | 2-3 | 3.2 / 3.1 | cream/ochre render, stone base, arches or pergolas, garden wall | individual | hip, red tiles | ref/r10, ref/r16 |
| `house_suburban` | 1-2 | 3.1 / 3.0 | render, shutters | none | hip, tiles | |
| `hotel`, `church`, `station`, `school`, `market_hall`, `kiosk`, `ancillary` | see `_styles` | | | | | ref/r13, ref/r21 |

Roof colours seen in the drone photos: terracotta #b45f3f to #c8653c (most tiled roofs). A few roofs are pale ochre tiles
(#c9a46a), on the low shop pavilions along Kifisias Ave north of 303. Flat roofs read grey #9a9690 to #bdb7ad.
Roughly half of the low buildings have tiled roofs. The larger white blocks are flat with AC units and solar heaters.

## 4. Streets and their classes

| street / zone | what stands there (photo-backed where marked) |
|---|---|
| Platanos square / Kifisias Ave at the square | HSBC neoclassical corner (photo r11); arcade blocks with café colonnades and low terracotta hips: Kifisias 236 and the KFC block (aerial r09); white flat-roof 3-storey block 303 and stone 2-storey 302 behind (aerial r09); the modern white municipal building with a solar roof on the west side (building 3, aerial r09) |
| Kifisias Ave north of the square | 3-5 storey 1960-80 blocks with shops, continuous balconies and awnings, interleaved with low 1-storey shop pavilions with pale ochre tiled roofs (aerial r09) |
| Kassaveti, Platanos → Levidou (spawn) | commercial: neoclassical corner, 1960-80 blocks with shops, Mythos Plus 2-storey building (salmon render, brick arch, white balustrade terrace, photo) |
| Kassaveti 19 courtyard | Kotsikas house (stone chalet, Ralph Lauren) and the timber-and-brick Starbucks pavilion in a paved courtyard (photos) |
| Kassaveti east of Kyriazi | residential: villas and low blocks behind stone/rendered garden walls with green iron railings, plane trees (photo r16) |
| Levidou upper (Kassaveti → Kolokotroni) | pedestrianised shopping street, 2-3 storey shop buildings; lower Levidou (north): villas behind hedges and walls (photo r19) |
| Kolokotroni | luxury retail: eclectic white pavilions (Kolokotroni 7, Agora) and modern 2-3 storey shop buildings; east end residential with stone garden walls (photos r12, r17, r18) |
| station area | yellow single-storey station building with white pilasters (r21); 4-5 storey white stepped blocks east of the tracks; a 3-storey stone ruin-like tower house south of the platforms (r10; ids not yet matched) |
| route to ISA, Kefalari | garden suburb: villa_modern and poly_8000 behind walls, many tiled roofs |
| ISA | main building: 4-storey former neoclassical hotel on a 51 x 34 m footprint (description only) |

## 5. Tools (tools/arch/)
- `extract.py`: builds the JSON (base layer plus photo layer).
- `photo_specs.json`: hand-written per-building specs from the photos. Add new buildings here.
- `styles.json`: the class definitions (copied into `_styles`).
- `fitcam.py` + `overlay.py`: fit a drone photo's camera to the map from a few point and line matches, then draw every footprint
  (with its map index) as a wireframe over the photo. Example: `python3 -I tools/arch/fitcam.py work/research-arch/corr_r09.json`,
  then `python3 -I tools/arch/overlay.py ref/r09.jpg out.jpg <x h z yaw pitch hfov>`.
- `plotmap.py`: top-down footprint plot with map indices, used to find which footprint a photo shows.
- `sheet.py`: contact sheets. `commons_slow.py`: polite Commons crawler. `overture_buildings.py`: Overture check.

## 6. Known gaps (v1)
- 932 of 948 buildings are `inferred`. Commons was rate-limited all through v1, and no other open street-level imagery exists
  here (KartaView has no coverage, Panoramax has none, Mapillary needs a login token).
- Spawn junction: only Mythos Plus is photo-checked. AB Vasilopoulos (Levidou 2), PAUL (Levidou 4), the Goody's/Everest building,
  the Zara block and Kassaveti 9 are still class inferences.
- KFC: research-shops describes a 3-storey neoclassical ex-hotel (text source); the drone photo shows a 1-2 storey arcade
  building on that footprint. The notes on `w1075952145` explain this. A street photo is needed.
- The r10 drone view (station): b50, b68, b69 are matched by footprint shape/OSM tags; the rest (the cream neoclassical villa with a hip roof
  north-east of the station by the Alsos, the white crenellated building next to the station) still need a pose fit before they can be named.
- The orthophoto covers only x,z -150..250. The Cadastre server refuses clients that call themselves bots (HTTP 500), so no further tiles were
  fetched (we do not disguise our client). Roofs outside the core stay class inferences.

## 7. Buildings checked against photos / aerials
<!-- checked:start (generated by tools/arch/doc_table.py) -->

| map | id | building | conf. | style | levels / height | roof | photo |
|---|---|---|---|---|---|---|---|
| 294 | w1075949835 | Mythos Plus building (Kassaveti 13) | photo | interwar | 2 / 8.5 m | flat #bdb7ad | mythos_01_street_front_night.jpg |
| 388 | w1076626153 | Πύργος Κηφισιάς (Kifisia Tower) — corner Kassaveti / Kyriazi, Zara | aerial | poly_6080 | 4 / 18.6 m | hip #b4683f |  |
| 288 | w1075948790 | Κασσαβέτη 6 | aerial | poly_6080 | 4 / 18.8 m | hip #62786a |  |
| 291 | w1075949217 | HSBC corner (Kassaveti 1 / Platanos square) | photo | neo_villa | 2 / 13.0 m | hip #b5573c | r11.jpg |
| 423 | w1076768346 | Kassaveti tower arcade (Πύργος Κασσαβέτη) | photo | retail_modern | 3 / 12.5 m | flat #a9a49b | Οικία_Κότσικα_Κηφισιά_0934.jpg |
| 425 | w1076768348 | Kotsikas House (Ralph Lauren), Kassaveti 19 | photo | chalet_villa | 3 / 13.5 m | gable #a8553a | Οικία_Κότσικα_Κηφισιά_0934.jpg |
| 426 | w1076768349 | Starbucks pavilion, Kassaveti 19 courtyard | photo | chalet_villa | 2 / 8.0 m | hip #a4553c | starbucks_01_courtyard_2008_REFONLY.jpg |
| 290 | w1075949216 | Kifisias 236 arcade block (Platanos) | aerial | arcade_retail | 2 / 11.0 m | hip #c0623e | r09.jpg |
| 305 | w1075952145 | KFC arcade block (Kifisias Ave at Platanos) | aerial | arcade_retail | 2 / 10.0 m | hip #c4633c | r09.jpg |
| 50 | w1072202922 | Ruined stone mansion by the station (OSM building=ruins) | photo | neo_villa (ruin_shell) | 3 / 12.5 m | flat #8f8676 | r10.jpg |
| 173 | w1073283872 | Kifisia station building (Line 1) | photo | station | 1 / 7.5 m | flat #b8b2a8 | r21.jpg |
| 8 | w302682638 | Retsinas Mansion = Goulandris Natural History Museum, Levidou 13 | photo | chalet_villa | 2 / 12.5 m | hip #b4543a | r14.jpg |
| 302 | w1075952142 |  | aerial | interwar | 2 / 10.0 m | hip #c8653c | r09.jpg |
| 303 | w1075952143 |  | aerial | poly_6080 | 3 / 11.5 m | flat #9a9690 | r09.jpg |
| 391 | w1076626156 | Kyriazi 36 (Kotsovolos, GUESS, Gap, ALE) | photo | retail_modern (modern_retail_block_1980s_refaced) | 3 / 12.0 m | flat #9a958c | kotsovolos_01_kyriazi36_front_newmoney_REFONLY.jpg |
| 471 | w1077110409 | Perrakis House (Οικία Περράκη), Kolokotroni — SkourasMed | photo | neo_villa (chalet_porch_villa) | 1 / 10.0 m | hip #b8643f | Οικία_Περράκη_Κηφισσιά_0914.jpg |
| 477 | w1077112775 | Kolokotroni 7 pavilion | photo | eclectic_pavilion | 1 / 11.0 m | flat #b4502e | r12.jpg |
| 482 | w1077113199 | Kolokotroni 11 corner block (Vagenas, Agora Deco&Deli) | photo | poly_6080 | 4 / 15.5 m | flat #c9c4b8 | r18.jpg |
| 752 | w1086751869 | International School of Athens - main building | photo | hotel | 3 / 16.0 m | hip #b05a3c | isa_west_facade_REFONLY.png |
| 0 | w83642558 | Άγιος Δημήτριος Κηφισιάς | photo | church | 1 / 22.0 m | dome #b85a3c | r13.jpg |
| 3 | w262269079 | National Bank of Greece, Platanos square (star-plan modern building) | aerial | poly_modern (modern_civic_star_plan) | 3 / 14.0 m | flat_solar #a9aaa8 | r09.jpg |
| 68 | w1072358338 | White stepped apartment block, Grigoriou Lampraki (facing the rail) | photo | poly_8000 | 5 / 16.5 m | flat #d6d6d2 | r10.jpg |
| 69 | w1072358339 | Hip-roofed house south of the stepped block | photo | house_suburban | 3 / 12.0 m | hip #c98f63 | r10.jpg |
| 167 | w1073120660 | Kokkotas House (Οικία Κόκκοτα), Kokota street — half-timbered villa with two spired corner turrets | photo | chalet_villa | 2 / 13.0 m | hip #d0673a | Οικία_Κόκκοτα_3_Κηφισιά_DJI_4117.jpg |
| 834 | w1090553221 | Neoclassical villa, Kifisias 297 | photo | neo_villa | 2 / 11.5 m | hip #a9553a | r08.jpg |

<!-- checked:end -->
