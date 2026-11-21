# MAP_DATA — gk3/kifisia_map.json (v3, team:data)

Pipeline: `python3 build_map3.py [out.json]` (ROOT; ~12 s; default output `work/data/gk3/kifisia_map.json`) → `python3 tools/data/check_map.py <out.json>` (must print `RESULT: PASS`)
→ integrate. Build report (Overture/census stats, special-shop evidence, moved furniture, per-street widths): `work/data/tmp/build_report.json`.
Inputs: `kif.osm` (OpenStreetMap, ODbL, bbox 23.804,38.0675–23.8265,38.0795), `elev.json` (EU-DEM 25 m), `route.json`, `tools/data/src/overture_places_2026-11-18.geojson`
(Overture Maps places, CDLA-Permissive-2.0), and when present the research files `gk3/data/census.json`, `gk3/data/streets.json` (read at build time; rebuild after they change).

**Compatibility rule:** every key/field of v2 keeps its name, order and position. v3 only adds keys and appends fields. One deliberate exception in content (not shape):
`buildings[i][8]` (legacy shop list) is capped at 165 entries in total, because the current 30_buildings.js sign atlas has 224 slots shared with bus stops and street plates
and the game crashed (black screen) when they ran out. **The complete list of shopfront bays is `buildings[i][11].shops` (same 8-field format) and `MAP.pois`.**
Renderers that can draw more signs should use `(b[11] && b[11].shops) || b[8]`.

## World, units, scale
- Metres; x = east, z = south, y = up; origin Platanos square (lat 38.0727, lon 23.8125). `x = (lon − 23.8125) × 87716`, `z = −(lat − 38.0727) × 110998`.
- **1 game unit = 1 real metre.** Scale audit in check_map.py (20 pairs of surveyed OSM nodes, WGS84 geodesic via geographiclib): max relative error **0.036 %**, mean −0.023 %
  (the E–W factor 87716 is 0.034 % below the exact 87745.7 m/deg at this latitude: 3.4 cm per 100 m; kept because every agent and research file uses the same formula).
  Independent re-projection of 15 random OSM POIs (azimuthal equidistant on the ellipsoid): max difference 0.19 m (at 640 m from the origin).
- Survey fidelity (check_map): every building outline within **0.29 m** of its OSM way (Hausdorff, 942 buildings; only near-collinear vertices are dropped, simplify 0.25 m),
  every road vertex within **0.07 m** of the OSM centre line. JSON coordinates are integer **decimetres** unless stated (±0.05 m rounding).

## Keys (old = v2, new = v3)
| key | format |
|---|---|
| `v` | 3 |
| `origin` | [lat0, lon0] |
| `base` | terrain base height (m a.s.l.) |
| `bounds` | context bbox [x0,z0,x1,z1] (m) |
| `terrain` | {x0,z0,step,nx,nz,h[] (cm above base)} (EU-DEM 25 m, resampled 8 m) |
| `focus`, `playable` | rings (dm) of the detailed area / where the player may go |
| `names[]` | street names (Greek, as in OSM); `names_latin[]` (new, parallel): name:en / int_name or ELOT-style transliteration |
| `roads[]` | `[type, nameIdx, oneway, widthM, surface, sidewalkSides, sidewalkW, inFocus, x0,z0,…]` type 0 primary(Kifisias) 1 secondary 2 tertiary 3 residential 4 living 5 service 6 pedestrian 7 footway 8 path 9 steps. `widthM` = carriageway kerb-to-kerb, calibrated (below) |
| `roadx[]` (new, parallel to roads) | `{id:"w…", hw, nameLatin, lanes, maxspeed, lit, surface, sidewalk, service, access, bridge, tunnel, layer, incline, steps, handrail, ref, footway, smoothness, dual, junction, covered, motor_vehicle, cycleway*, wSrc, w0, clear:[left,right], sw:[left,right], park:[left,right], parkSrc}` — `wSrc` = where the width came from (`research:streets.json`, `tag:width`, `lanes`, `class`, `+clearance` when narrowed to fit between facades); `w0` width before the facade check; `clear` = typical (15th percentile) distance centre line → building line per side (OSM left/right, m); `sw` = footway width per side (m); `park` = kerb-side parking per side (0/1) |
| `sidewalks[]` | polygons `[outer, hole…]` (dm), cut into 96 m tiles |
| `curbs[]` | kerb lines (dm) |
| `carriage[]` (new) | carriageway (asphalt) polygons `[outer, hole…]` (dm), 96 m tiles, cut back to the facades |
| `fillets[]` (new) | junction corner pieces (real kerb radius 4 m) as rings (dm); already included in `carriage` |
| `junctions[]` (new) | `[x,z (dm), arms, [roadIdx…], "n<osm node>"]` for car junctions with ≥ 3 arms in the focus |
| `driveways[]` (new) | `[x,z (dm), angle, widthM]` vehicle entrances (service ways meeting a road, parking entrances): keep free of trees/cars/bollards |
| `restrictions[]` (new) | `[restriction, fromRoadIdx, toRoadIdx, viaX, viaZ (dm)]` OSM turn restrictions |
| `walls[]` | `[style, coords]` garden walls / property lines (synthetic where OSM has none) |
| `barriers[]` (new) | mapped fences/walls/hedges/retaining walls `[barrier, heightM, "w<id>", coords]` |
| `buildings[]` | `[groundDm, levels, style, roof, detail, hash, [cx,cz,L,W,ang] (m), edgeFrontage[], shops[] (legacy, capped), name, coords (dm), extras]` — edgeFrontage per edge: 0 back, 1 street-facing, 2 shopfront |
| `buildings[i][11]` (new extras) | `{id:"w…"/"r…", tags:{every OSM tag of the building, verbatim}, name, startDate, type, height, roofShape, roofLevels, roofColour, colour, material, amenity, shop, tourism, street, number, wikidata, layer, historic, denomination, levels (tagged), nameLatin, setb[] (per edge: m from facade to public space, −1 = not street-facing), fs[] (per edge: names[] index of the street it faces, −1), shops[] (ALL bays)}` |
| shop bay (in `shops[]`) | `[edgeIndex, t (0..1 along edge, bay centre), signText, bg, fg, kind, poiIndex, bayWidthM]` (v2 had the first 6) |
| `pois[]` (new) | every point of interest, see below |
| `areas[]` | `[kind, [rings]]` parks, plazas, pools, pitches, parking…; `area_tags[]` (new, parallel): `{id, name, sport, surface, access, parking, leisure, amenity, landuse, natural, capacity, fee}` |
| `pitches[]` | `[cx,cz,L,W,ang,sport, surface (new), areaIdx (new)]` (m) |
| `rail[]`, `train[]` | Line 1 tracks / train path (dm) |
| `props{}` | mapped street furniture, see below (all OSM, x,z dm, last field = OSM id) |
| `seats[]` (new) | `[x,z (dm), yaw, seatHeightM, kind, id]` places NPCs can sit (benches) |
| `street_trees[]` | `[x,z,species]` synthetic along footways ≥ 1.9 m, plus interpolated trunks on mapped tree rows; `tree_rows[]` (new) = mapped rows `[species, "w<id>", coords]` |
| `garden_trees[]`, `lamps[] = [x,z,style,angle,side]`, `bollards[] = [x,z]`, `parked[] = [x,z,angle]` | synthetic, generated to follow the real data (rules below) |
| `addr[]` (new) | house-number plates `[x,z (dm), number, streetNameIdx or −1, buildingIdx or −1, osmId]` |
| `special{}` | `{mythos, paul, starbucks, kfc, super, sephora → x,z (facade centre, m), nx,nz (outward normal), door [x,z] (pavement 2.4 m out), b (building), e (edge), t, w (bay width), poi (index in pois), interior:{poly [[x,z]…] (building footprint, m), frontage [ax,az,bx,bz] (the shopfront segment), depth (m, from the bay centre straight in to the far wall), width, area}}` |
| `key{}` | named points [x,z] (m): platanos, station, alsos, kfc, mythos, super, starbucks (= door of the courtyard pavilion), paul, agora, goulandris, kefalari, church, **sephora** (= pavement in front of its door: the homeless man's spot), sephora_src / starbucks_src (raw source points), **junction** (spawn: Kassaveti × Levidou × Kyriazi, OSM node 363975095) |
| `isa{poly,gate}`, `route` | ISA campus polygon, walking route to its gate |
| `synthetic[]` (new) | list of the keys that contain generated (not surveyed) content |
| `meta{}` (new) | generation time, projection, sources (versions of census/streets used), counts |

### pois[] (one object per place)
`{id, src, cat, tag, name, nameLatin, x, z, focus, play, bay, posErrM, conf, bg, fg, b, e, t, w, fx, fz, nx, nz, door, snapM, facing, special?, brand?, cuisine?, hours?, street?, number?,
level?, phone?, website?, operator?, outdoor?, takeaway?, ov_addr?, posMethod?, census?, tier?, osm?, overture?, also?, datasets?, area_m2?, sj?, sjName?, listingXZ?, dups?}`
- v3.1 (2026-11-21 14:20, PLACEMENT AUDIT): `listingXZ` = the census listing's own coordinate when the POI was built at its verified address instead; `dups` = ids merged into this POI (same name within 60 m); `posMethod` for census POIs = `address-exact` | `address-interp` | `address-listings`. No `ov:` POIs any more (Overture alone is never built).
- `sj` = index of the matching entry in `gk3/data/shops.json` `shops[]` (research-shops facade/sign/awning/interior spec), `sjName` = that entry's name (check `shops[sj].name === sjName`;
  if shops.json was regenerated after the map, fall back to your own match). Matched by OSM id, else normalised name within 60 m; 382 of 392 entries linked (meta.sources.shops).
  A shops.json entry whose `osm` is a building way pins its POI to that building (22 POIs, e.g. Ralph Lauren → villa b425).
- `id`: `osm:n…/w…/r…`, `ov:<overture id>`, `cs:<census id>`, `special:<key>`. `src`: osm (survey), overture, census, address (placed by address).
- `x,z`: source position (m). `posErrM`: estimated position error of the source (OSM node 3, OSM area 5, Overture 15–30, census per its posErrM). `conf`: existence confidence 0..1.
- `bay`: `shop` = has its own ground-floor shopfront bay; `plate` = name plate at the entrance (offices, doctors, upper floors); `directory` = no free shopfront width left near it
  (arcades / malls / upper floors) — name goes on the building's directory/plate at `door`; `building` = the POI is a whole building (sign over the entrance); `standalone` = free-standing
  (kiosk, fuel, taxi, toilets, station); `area` = open area (park, parking, playground).
- Facade: `b,e,t` = building, edge, position along the edge (bay centre); `w` = bay width (m, 0 for plates); `fx,fz` = facade point; `nx,nz` = outward normal; `door` = pavement point
  1.2 m (2.4 m for specials) in front; `snapM` = distance moved from the source point to the facade; `facing` = names[] index of the street the facade faces.
- Bays never overlap (check_map), each POI in the focus has a facade; 0 unplaced.
- How a facade is chosen (v3.1, rules in docs/research/PLACEMENT_AUDIT_DATA.md section C): OSM-surveyed POI → the building containing its point (else ≤ 12/25 m without crossing a
  main street), nearest edge, never moved for capacity (surplus → `directory` of the same building); courtyard/stoa edges only when open and reachable. Census-only POI → only with a
  verified address, at the address, on a facade facing its street on the address side (house-number parity), only in frontage left free by OSM bays (else `directory`). Specials first
  (researched widths). Bays keep 0.3 m margins/gaps like js/30_buildings.js layoutEdges().
- Categories (`cat`): clothes, shoes, bags, jewelry, beauty, cosmetics, hairdresser, optician, pharmacy, bank, finance, estate_agent, travel_agent, telecom, electronics, books, gift, florist,
  home, sports, toys, pet, kids, confectionery, bakery, supermarket, convenience, kiosk, tobacco, betting, wine, coffee_tea, health_shop, hardware, dry_cleaning, services, gallery, music,
  restaurant, cafe, bar, fast_food, ice_cream, hotel, office, doctor, dentist, clinic, vet, education, fitness, bowling, school, kindergarten, church, museum, cinema, theatre, events_venue,
  arts_centre, community, townhall, police, library, post_office, mall, department_store, station, bus_station, taxi, fuel, parking, toilets, charging_station, bicycle_rental, car_rental,
  car_wash, park, playground, garden, historic, market, public, shop (unspecified). `tag` keeps the original tag (`shop=boutique`, `amenity=cafe`, `overture=greek_restaurant`, `census=…`).

### props{} (mapped street furniture; x,z dm; last field = OSM id)
crossing `[x,z,ang,widthM,type(zebra|signals|uncontrolled|…),kerbLowered,tactile,id]` · signal `[x,z,ang,roadW,id]` · stop / giveway `[x,z,ang,roadW,direction,id]` ·
bus `[x,z,name,{id,nameLatin,shelter,bench,ref,routes[],yaw}]` · bench `[x,z,yaw,backrest,material,id]` · basket `[x,z,id]` · recycle `[x,z,type,id]` · fountain `[x,z,isFountain(0=drinking post),name,id,radius?]` ·
water `[x,z,id]` · kiosk `[x,z,name,yaw,id]` · tree `[x,z,species,id]` · post_box / telephone `[x,z,yaw,id]` · vending `[x,z,what,yaw,id]` · atm `[x,z,operator,yaw,id]` ·
bike_parking / moto_parking `[x,z,capacity,id]` · bike_rental `[x,z,name,id]` · parking_entrance `[x,z,parking,name,id]` · charging `[x,z,operator,id]` · clock / toilets / elevator / manhole / flagpole / basket `[x,z,id]` ·
taxi / subway_entrance `[x,z,name,id]` · artwork `[x,z,type,name,id]` · memorial `[x,z,type,name,id]` · info `[x,z,type,name,id]` · gate `[x,z,barrier,ang,widthM,access,id]` · entrance `[x,z,type,id]` ·
play `[x,z,equipment,id]` · speed_sign `[x,z,sign,maxspeed,id]` · lamp / bollard (mapped ones; empty in this extract) `[x,z,…,id]`.
Mapped furniture that fell inside a carriageway/building after width calibration is nudged onto the nearest footway edge (12 items; listed in the build report `moved`).

## Real street proportions (width calibration)
1. Width from `gk3/data/streets.json` (research: carriagewayM, sidewalk width, parking) when present, else OSM `width`/`lanes`, else class defaults.
2. Rays every 3 m perpendicular to each car way measure the distance to the first building on each side; carriageway + 2 footways (≥ 1.2 m) must fit between the building lines
   (15th percentile), the 3rd percentile must keep 0.35 m; one width per street (25th percentile of its ways), narrowed only where a way needs it.
3. Hard guarantee: ways are shrunk (to 2.8 m, service 2.4 m) until no building intersects them; where an off-centre OSM line still touches a facade the carriageway polygon is cut
   back to the facade (36 m² total). check_map: 0 buildings in a carriageway.
4. Footway width per side = distance to the building line minus half the carriageway (0.6–7 m) where built up, research/class default elsewhere.
5. Junction corners: kerb radius 4 m fillets only at real junction nodes (no round blobs); bends close with a disc of the narrower half-width.
Examples (focus): Kassaveti 6.0 m carriageway, footways 3–7 m; Levidou 3.8 m + 7 m footways (pedestrianised shopping street); Kolokotroni 3.5 m + ~7 m; Kifisias Ave 7 m per carriageway
(dual carriageway, separate OSM ways), footways 3.5–7 m; Kyriazi 3.0 m (narrowed by facades from 4.0). 14 short ways remain wider than their facade gap (lanes tags on avenue slip ways; reported, not hidden).

## Synthetic data follows real data
Street trees / lamps / bollards / parked cars are generated, but never on: a mapped object (+2.2 m), a shop door zone, a crossing, a junction, a driveway/parking entrance, a bus stop (14 m)
or taxi rank (10 m). Mapped trees/benches/bins replace synthetic ones near them; tree rows mapped in OSM become trunks every ~8 m. Bollards only on narrow centre streets on the side
without a parking lane. Parked cars only on tertiary/residential/living streets where tags, streets.json or the spare width allow it (never on Kifisias Ave or secondary roads),
and always inside the carriageway (check_map).

## Counts (focus area, build of 2026-11-21 14:20, v3.1)
v3.2 (18:03): POIs 687 total, 600 in the focus; OSM 409, census 275, address 2, overture 1 (Sephora). Bays: shop 398, directory 113, plate 95, building 34, standalone 29, area 18.
v3.1 numbers below kept for comparison.
POIs 665 total, 578 in the focus; sources: OSM 408, census 254 (verified address only; +375 census entries matched to OSM POIs), address 2, overture 1 (Sephora special). Bays: shop 397,
plate 95, directory 93, building 33, standalone 29, area 18. Unplaced: 0. Not built: 479 Overture-only places, 229 census entries without a verifiable address (MAP.meta.audit).
(Counts before the placement audit, v3 08:50: POIs 1046, shop bays 691, of which 285 Overture-only.)
Focus by category (top): clothes 153, beauty 50, jewelry 48, restaurant 41, office 40, doctor 40, cafe 25, home 22, hairdresser 20, shoes 20, cosmetics 19, pharmacy 18, bar 17,
fast_food 15, estate_agent 15, optician 15 (full table: `python3 tools/data/check_map.py` → `focus_by_cat`).
Furniture (whole context): crossings 63, signals 25, stop signs 22, bus stops 20, benches 25, fountains 11, kiosks 8, waste baskets 5, recycling 6, mapped trees 10, gates 13, parking entrances 9,
charging 6, artworks 5, play equipment 3, + singles. Synthetic: street trees ~1930, lamps ~1050, bollards ~2200, parked cars ~450, garden trees 3600.

## Census / Overture merge rules (v3.1, PLACEMENT AUDIT)
- Overture: never built on its own; a place matching an OSM/census POI (name + distance) only adds its id/confidence/address as evidence (`overture`, `ov_addr`).
- census.json: entries matching an OSM POI (OSM id or name + distance) only enrich it (street/number/tier); the OSM position wins. Census-only entries: tiers A/B, not closed, with a
  verified address (surveyed number / bracketed interpolation ≤ 12 / tier-A two-source listing on its street with a clear side; listing within 35 m of the address) → built at the address.
  Everything else is listed in `meta.audit.censusUnbuilt` with the reason. `streetLevel:false` → plate.
- v3.2 (2026-11-21 18:03): a census address equal to an OSM building's own `addr:street`+`addr:housenumber` (building ≤ 20 m from the address) → that building only, facades
  on its street only, else its `directory` (e.g. the "Κολοκοτρώνη 1" listings → b33 Φοίνικας). Last-resort geocoder: research-census `tools/census/addr.py` (exact number attested
  by an independent listing, error ≤ 18 m, listing ≤ 35 m away; `posMethod` stays `address-listings`). Bays widen only without moving their centre away from the source point;
  `directory` names share one board position per cluster (< 6 m apart along the facade) — several POIs can therefore have identical `fx,fz` with `bay:"directory"`.
- Same normalised name/brand within 60 m → one POI. `meta.audit` = {rules, overtureNotBuilt, censusUnbuilt, duplicatesMerged, directoryBecauseEdgeFull, censusSaysClosedOsmKept}.

## Special shops — evidence and uncertainty
| key | address | position evidence | facade in the game | uncertainty |
|---|---|---|---|---|
| mythos | Kassaveti 13 | OSM node 10098110169 "Mythos plus" (survey) at x 75.4 z 45.7; Overture "Mythos plus, Kassaveti 13" 3.9 m away | b294 (OSM w1075949835) Kassaveti edge (6.5 m, whole edge), door (76.4, 51.5); depth 28.8 m | ±3 m; frontage = the 6.5 m grill hall (INTERIORS.md 1.2) |
| paul | Levidou 4 | OSM node 4565941901 "Paul" at x 125.5 z 33.1; Overture "4 Levidou st." 13.6 m away; official address Levidou 4 | b434 (w1076768357) Levidou edge, 9.5 m bay, door (123.5, 27.6), depth 21 m | ±3 m |
| super | Levidou 2 / Kassaveti 8 | OSM way 668312663 "ΑΒ Βασιλόπουλος" addr Levidou 2 (the building itself); two Overture entries (Levidou 2) | b30 corner block SW of the spawn junction, 18 m bay | position exact (building); entrance edge is the longest street edge, real door side not surveyed |
| kfc | Kifisias Ave 238-240 | not in OSM; Overture "KFC, Leof. Kifisias 238-240" conf 0.99 (29 m off, address geocode); official KFC store list; SHOPS.md: Mela arcade (ex-Grand Hotel) | b305 (w1075952145) Kifisias edge, 7.4 m (whole edge), door (−10.4, −17.0), depth 22.8 m | ±10 m along the arcade front |
| starbucks | Kassaveti 19 (courtyard) | not in OSM; Overture "19 Kassaveti Str" conf 1.0; **SHOPS.md (photo): the courtyard pavilion OSM w1076768349 = b426, west of the Ralph Lauren villa b425** | b426 east (courtyard) face, door (160.5, 67.4); bay 3.1 m (stepped facade), depth 6.8 m | building certain (photo); exact door segment ±3 m |
| sephora | Levidou 8 | not in OSM; Overture "SEPHORA, Levidou 8" conf 1.0 (point in the street, x 129.4 z −3.5); Foursquare via census (same address); vrisko.gr directory "Λεβίδου 8, Κηφισιά" (tel. 211 012 4679); SHOPS.md: east side ≈ x 141.5 z 2 | b432 (w1076768355) Levidou edge, 8 m bay, facade (138.6, 1.6), door (136.0, 1.5) = `key.sephora`; depth 18.9 m | side of street from house-number parity (Levidou even = east, learnt from OSM PAUL 4, Alpha Bank 6, Tsantilis 8, Mikel 10); ±5 m along the street |
Spawn: `key.junction` = OSM node 363975095, the shared node of Kassaveti, Kyriazi and Levidou (x 93.9, z 61.1), between Mythos (NW), PAUL (NE) and AB (SW).

## Verification
- `python3 tools/data/check_map.py [map.json] [--quiet]` — HARD checks (exit 1 on failure): POI facades, bay overlap, bays on edge, legacy ⊂ full shop list, doors not inside buildings,
  furniture and synthetic objects not in buildings / carriageway, no building in a carriageway, specials + keys present, scale audit ≤ 0.1 %, survey fidelity ≤ 0.3 m. INFO: spot check, counts.
- `node tools/verify_placement.js [--all] [--json out.json]` — boots the game and compares `PLACED` (00_core.js `placed(kind,x,z,name,src)`) with the map: per kind, how many map features
  have a placed object of a matching kind within 1.5 m (or a PLACED entry whose `src` equals the feature id). **World modules: register what you build with the feature id as `src`**
  (POI `id`, the OSM id at the end of a props row, `buildings[i][11].id`), and one of these kinds: shop, plate, poi_building, poi_standalone, poi_area, special, building, street_tree, tree,
  lamp, bollard, car, bench, basket, recycle, crossing, signal, stop, bus, kiosk, fountain, water, gate, parking_entrance, charging, artwork, … (aliases in the script's `ALIAS` table).
  Main on 2026-11-21 09:40: 5290 focus features, 67.4 % placed (props by the streets module 100 %; shops, buildings, plates, cars, house numbers not yet registered by their modules).

## Known limits of the sources (what open data does not know)
- Exact shopfront widths and door positions: OSM rarely maps them; bays are split from the facade length (specials use researched widths). Real unit boundaries differ.
- Floors / upper-floor businesses: only where tagged `level` or census `streetLevel:false`; otherwise ground floor assumed.
- Facade colours, materials, awnings, signage style: not in OSM for most buildings (see shops.json / MATERIALS.md for researched looks). Building heights: `building:levels` on a minority; the rest estimated (listed in `synthetic`).
- Overture/Foursquare positions are often address geocodes or user pins (errors 10–40 m); they are snapped to the most plausible facade, and `posErrM`/`snapM` say how far.
- Tier-C census listings (existence today unknown) are not built; some real shops may therefore be missing, and some built Overture shops may have closed recently.
- Street lamps, bollards, parking bays, most trees are not mapped in OSM here: they are generated (rules above), not surveyed.
- Terrain: EU-DEM 25 m (±2–4 m vertical); small steps/kerbs are not in it.
