# STREETS_IMPL — streets and public realm (agent `streets`)

Files: `gk3/js/20_ground.js` (terrain, level grid, roads, markings, sidewalks, kerbs, tree pits, stairs, areas, pitches),
`gk3/js/40_walls.js` (garden walls, railings, hedges, ISA fence), `gk3/js/45_trees.js` (trees), `gk3/js/50_props.js` (street furniture),
`gk3/js/55_rail.js` (Line 1, station platform, `finalize()`, `updateChunkVis()`).
Status is kept honest in the last section.

## Data used (feature-detected; everything works when a file/key is missing)
- `gk3/kifisia_map.json` v3 (docs/MAP_DATA.md): roads + `roadx`, `sidewalks`, `curbs`, `fillets` (real 4 m kerb radius corners, drawn as asphalt), `props.*`
  (crossing, signal, stop, bus {shelter,bench}, bench {yaw}, basket, recycle, fountain {radius}, kiosk {yaw}, water, taxi, clock, play, charging, bike_parking, info),
  `street_trees`, `garden_trees`, `lamps`, `bollards`, `parked`, `seats`.
- `gk3/data/streets.json` (research-streets): fetched by 20_ground.js at script load, applied in `buildRoads()` through `loadStreetSpecs()`.
  Used per street: `sidewalk.material` → sidewalk photo material; `lamps.style` → lamp model; `bollards.style` → bollard model.
  The `styles{}` catalogue was followed for the models (dimensions and colours below).

## Street furniture models (50_props.js) — real metres, after the research catalogue / reference photos
| map/research style | model kind | what it is |
|---|---|---|
| kifisia_lantern (Kolokotroni, Levidou, Othonos, Kyriazi…) | `lamp0` | dark-green (#1c3328) cast-iron post, fluted base, 4-sided tapered lantern with cap + finial, 4.0 m |
| kifisia_globe (Kassaveti, Kyprou) | `lamp1` | dark-green (#1f3a2c) fluted post, opal globe Ø 0.5 m, ≈ 3.95 m |
| avenue_mast (Kifisias Ave) | `lamp2` | galvanised 9.75 m column, curved 1.8 m arm, LED head over the road |
| pole_arm (residential streets) | `lampP` | concrete utility pole 8.7 m, galvanised arm at 7 m, luminaire over the road |
| globe_cluster | `lampC` | slim dark post with 3 globes on arms + 1 on top |
| cyl_black_yellow (Levidou, Kyriazi, most) | `bollard` | black Ø 0.13 × 0.80 m, ribbed top, yellow band 0.12 m, 0.15 m below the top |
| ball_green (Kassaveti, Kyprou) | `bollardB` | green Ø 0.09 post with collar and Ø 0.14 ball, 0.95 m |
| cone_black_gold (Kolokotroni) | `bollardC` | 0.6 m cast-iron baluster, gold neck ring |
| bench | `bench` | 4 wood slats + 3 back slats on black cast-iron ends, seat 0.46 m; yaw = OSM yaw (map v3) |
| waste basket | `basket` | dark-green municipal bin on a post |
| recycle / estimated refuse bins | `recycle` / `bin` | 1100 l four-wheel containers (blue with yellow lid / dark grey) |
| signals | `signal` (+ `lensMesh`) | grey pole, black head, back plate, visors; lenses cycle with `SIGNALS` (76_traffic.js obeys them) |
| stop signs | `stopsign` | pole + red octagon + STOP lettering (sign atlas) |
| bus stops | chunk geometry | OASA-type shelter (galvanised frame, glass back/end, perch bench, lit advert) where OSM says shelter=yes or the pavement is deep enough; always the pole with ΣΤΑΣΗ + the stop name plate (Greek/Latin) |
| kiosks | chunk geometry | periptero: booth with magazine walls, deep roof, sign band, drinks fridge, ice-cream freezer, newspaper stand; USE → "Buy a frappé" (INTER) |
| fountains | chunk geometry | octagonal marble basin (radius from map) with water + central bowl; drinking posts in cast iron |
| taxi, clock, play, charging, bike_parking, water, info | chunk geometry | TAXI plate pole, two-faced street clock, climbing frame with slide, EV post, Sheffield hoops, drinking post, guidepost |
| street names | chunk geometry | blue Greek+Latin plates on a pole at focus junctions |

## Trees (45_trees.js)
- Species by map data: street trees plane / bitter orange; garden trees pine, cypress, plane, palm, cedar, olive, orange. Real sizes: plane 13–17 m (×0.9–1.3), pine 12–15 m,
  cypress 11 m, palm 9 m, cedar 11 m, olive 4–5 m, orange 3.5–4 m. Platanos landmark plane at ×1.55 (position estimated at the square centre).
- Branching species (plane, pine, olive) are grown from a seeded skeleton (trunk → limbs → branches → twigs, tapered tubes) with leaf cards clustered at the twig tips,
  photo foliage layers (T.leaves, leafPine, leafOlive, leafOrange, leafCypress, leafPalm) on `MAT.leaf` (wind sway, leaf shadows). Plane has 2 skeleton variants; every
  instance has its own yaw, scale, horizontal stretch and tint.
- 3 LOD tiers per species: near (full, casts shadows) ≤ 40–60 m, mid (trunk + limbs + bigger cards, casts) ≤ 95–140 m, far (trunk + few big cards) to the view distance.

## Distance pools (public)
- `lodPool(list, tiers)` (45_trees.js): list `[[x,y,z,yaw,scale,stretchXZ,shade],…]`, tiers `[{geos:[[geometry, material],…], d, cast}]` near→far (last tier d=0 = view distance).
  One InstancedMesh per tier and geometry for the whole world; `updateTreeLOD(cx,cz)` refills them.
- `propPool(kind, list, cast)` / `PPOOL` / `updatePropLOD(cx,cz)` (50_props.js): same idea for furniture (near/far geometry from `propGeo(kind, far)`; distances in `PROP_D`).
- Both are refreshed from `updateChunkVis(cx,cz)` (55_rail.js), which 90_main.js calls every 0.35 s. Effect: thousands of bollards/lamps/trees cost a few draw calls.
- `treeChunk(x,z).props` (per 192 m cell) still works for other modules' instanced meshes (75_npc.js terrace furniture).

## Other hooks
- `placed(kind,x,z,name,src)` is called for every mapped lamp, bollard, bench, bin, signal, stop sign, bus stop, kiosk, fountain, crossing, tree, taxi, clock, playground,
  charging point, bike parking, drinking water and info post.
- Benches: when the map has no `seats` key, each bench pushes its two seats into `SEATS` (75_npc.js) with the bench's yaw.
- Kiosks: `INTER.push({type:'kiosk', …})` (no fn → the HUD treats it as a kiosk).
- Night: lamp heads/globes/lanterns are `T.white` with glow 1 (they shine); pavement light comes from the night light map of 82_sky.js (MAP.lamps); shelters and kiosks
  register white light with `addLight()`.

## Estimated (not in open data) — stated honestly
- 1100 l refuse/recycling containers at the kerb of residential focus streets (~every 70 m, alternate sides, never on bays/crossings/junctions).
- Parked scooters along shopping streets. Lamp/bollard/street-tree POSITIONS are synthetic in the map (data agent rules in MAP_DATA.md); their MODELS follow the street research.
- The Platanos landmark tree position and size.

## Walls, parks, landmarks
- 40_walls.js: garden walls with railings/hedges by map style; bougainvillea (painted alpha-cut layer `T.bougain`) on ~16 % of villa walls; mapped gates (props.gate) with
  stone pillars and wrought-iron leaves (open unless access=private); Alsos walks edged with clipped box hedges (research).
- Parks: lamps inside park areas use the globe_cluster model; ground surfaces come from the mapped areas.
- 50_props.js `buildPlaceElements()` reads gk3/data/places.json (fetched by 20_ground.js at load, `placeEl(regex, placeKey)`): pedestal monument (Platanos), statues/busts
  (Kefalari — abstract bronze figures, no likeness claimed), the Dexameni iron water tank (Alsos), dovecote, buffer stops at the end of Line 1, ornamental basin (Kefalari,
  only if not already a mapped water area), the Platanos taxi rank (TAXI plate + yellow TAXI bay on Kassaveti).
- 20_ground.js: red cement-tile sidewalk layer `T.redtile` (research red_tile) for streets whose sidewalk material is red_brick; yellow-painted kerbs round Platanos square;
  overhead cables between pole_arm poles of the same street.

## Known gaps (updated as work proceeds)
- Lamp, bollard and street-tree POSITIONS are synthetic (data agent); exact real positions are not in open data.
- Graffiti artworks and wall plaques (props.artwork / memorial) are not drawn (they are paint on walls owned by the buildings module).
- Cycle track of Kolokotroni, tactile strip down the middle of the red-tile sidewalks, Kassaveti buff pavers on the east end (one material per street only).
- Station canopy/platform still the earlier simplified model (green steel columns, roof panels); the station building itself belongs to buildings/landmarks.
- No real phone was available: performance is judged by triangles/draw calls in the headless harness only.
