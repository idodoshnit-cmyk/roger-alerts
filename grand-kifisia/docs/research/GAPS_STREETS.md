# GAPS_STREETS — current game vs reality (streets and public places)

Author: research-streets. Evidence: harness screenshots of MAIN (work/research-streets/shots/g1_*.png, run 2026-11-21) compared with the reference photos
docs/research/img/streets/r##.jpg and the data in gk3/data/streets.json / places.json. Ordered by how much each gap hurts. Each item: what is wrong → exact change.
Coordinates: game metres.

**What is already right (do not break it):** road centre-lines, building footprints, the ISA courts (32.3 x 18.6 m multi court and 31.5 x 16.2 m soccer pitch),
the station building footprint (16.1 x 7.7 m) and platforms all match OpenStreetMap 1:1 (checked against kif.osm). The gaps below are about what stands
on that geometry.

## 0. Wiring (blocks everything else) — owner: streets
- `loadStreetSpecs(json)` exists in js/20_ground.js but nothing calls it, and nothing fetches `data/streets.json` or `data/places.json`.
  → In boot, `fetch('data/streets.json')` (feature-detect, ignore failure) and call `loadStreetSpecs(j)` BEFORE the ground/props are built; same for places.json
  (store as `PLACES_DATA`).
- streets.json entries with `researched:false` are generic (derived from OSM tags only). Apply their geometry/oneway/lanes, but keep your own built-in
  furniture choices unless you have nothing better. Entries with `researched:true` should win.
- Use `segments[]` where present (Kassaveti has 3, Levidou 2, others): the street changes character along its length; one value per street is wrong for Kassaveti.

## 1. Platanos square / Kassaveti 1 (r11) — first thing the player sees when walking west from spawn
1. Kassaveti 1 (footprint 48.7 x 18.6 m at x=-24, z=36; OSM way 1075949217) is rendered as a white modern 3-storey block with long balconies.
   → Two-storey neoclassical: cream plaster #e8dfc4, white marble pilasters and cornices between every bay, salmon-red pediment tympanum #d6705f on the WEST gable
   facing the square, tiled hip roof, ground floor = shopfronts between pilasters (HSBC fascia, Vivify, Pansik, Travel Plan). Only the short east wing is 3 storeys with
   balconies. (photo r11)
2. Taxi rank: one generic low-poly yellow car. → 5–6 yellow taxis (#f0c810, saloon proportions 4.6 x 1.8 x 1.5 m, roof TAXI sign) parked nose-to-tail along the NORTH
   kerb of Kassaveti in front of Kassaveti 1, x≈-60…-25, with a TAXI road marking. (photo r11)
3. Sidewalks around the square and along Kassaveti 1 are plain grey. → red_tile (0.3 m terracotta squares #b0614a) with a yellow ribbed tactile strip #d9b53a and the
   kerb face painted yellow #e0b62a. (photo r11)
4. Missing: marble pedestal monument (~2.2 m square shaft with cornice) on the sidewalk corner at the west gable of Kassaveti 1 (≈x=-46, z=41); black litter bin beside it;
   pedestrian signal at the zebra x=-66, z=43. (photo r11)
5. The old plane tree that names the square must be the biggest tree in the centre: x=-68.1, z=14.2 on the island (island outline in places.json; 57 x 14 m, lawn,
   kerbed), decorative fountain at x=-61, z=-3.2. Verify it reads as a landmark from the bottom of Kassaveti.

## 2. Kassaveti east end (r16; camera x=303, z=134 looking east)
Game: shopfronts with big glass windows on BOTH sides, a glass office block, lantern posts, no bollards, a 6+ m carriageway.
Reality (photo, segment `kassaveti_e`, x=236…407): RESIDENTIAL — garden walls with stone piers and dark-green bar railings (north), white railing on a beige wall
(south), villas behind hedges; ONE unmarked 3.8 m asphalt lane; 3.0 m paved sidewalks (buff_pavers); ball-top green bollards (style `ball_green`, 0.95 m, every
2.4 m) on both kerbs; old leaning plane trees on the NORTH sidewalk only; globe lamps (`kifisia_globe`, 3.6 m) on the SOUTH sidewalk; an 1100 L wheeled bin;
overhead cables on poles. → No shop facades east of x≈236 except those in shops.json/census.json; walls+railings instead (styles `garden_green_bars`,
`garden_white_bars`, `rubble_wall`); narrow the lane; swap lamps; add bollards.
Middle block (`kassaveti_m`, x=94…236): one 4.5 m lane, bollards and globe lamps start here.

## 3. Levidou first block (r19; x=94,61 → 144,-29)
Game: a normal kerbed street with a grey box (utility cabinet) and a hard-edged white wall in the foreground; a raised grey-paver sidewalk.
Reality (photo 2015): SHARED SURFACE — pale grey concrete block carriageway 3.8 m, flush with 2.5–3 m walkways of the same blocks, NO kerb, separated only by dense
rows of black bollards with a yellow band (`cyl_black_yellow`, 0.8 m, every 1.25 m) on both sides; lantern posts in the bollard line; hedges and garden walls,
buildings far back (facade gap 22–31 m); PAUL in a villa behind its garden on the east side. → flush surface + bollard rows; garden walls/hedges instead of shop arcades
on this block.

## 4. Station (r00, r21)
1. Station building (x=-368, z=-111, 16.1 x 7.7 m, 1 storey): game shows a beige box with an arched door and a taller tower-like volume beside it (g1_r00_station.png).
   → ochre-yellow #e2c25a single storey ~5 m, white pilasters and trim, low white central pediment with a round analog clock, white fascia "ΚΗΦΙΣΙΑ / KIFISSIA",
   green doors, no tower. (photo r00)
2. Platform canopies: not visible from the forecourt. → full-length green steel canopies (#3f7a5e) on both platforms (114.8 m east, 88.5 m west), columns + lattice
   trusses, glass and timber roof panels, yellow tactile line, hanging departure boards. (photo r21)
3. Forecourt: green diagonal-cross guard railings 1.0 m (`green_x_guard`), taxi rank x=-356, z=-85, bus terminus x=-358, z=-66, two lit fountains (x=-335,z=-81.5 and
   x=-339.7,z=-27), 9 bike stands x=-350, z=-71.

## 5. Alsos (grove) (r05 aerial, r07)
Game: an even lawn with evenly spaced identical trees and one footpath — reads as a generic park.
Reality: FORMAL garden — straight beige gravel walks 3–5 m (#cdbb9a) edged with clipped box hedges, oval and rectangular hedged beds, a round fountain basin (~6 m)
at x=-182, z=-13 where walks cross, mixed tall trees (many deciduous - bare in the December aerial - with evergreen pines/cypresses; carob at x=-257, z=-71);
lamps probably `globe_cluster` like Kefalari (not verified for the Alsos); the riveted green iron water tank on cast-iron legs at the north-east tip (≈x=-105, z=35); wooden benches; dovecote x=-287, z=-84. Outline:
wedge (-358,-11) (-111,48) (-95,21) (-84,-17) (-85,-27) (-345,-104).

## 6. ISA (owner: "the school must be one to one")
Game: a modern dark glass office block and one large pale-blue court surface.
Reality: official — "a historic building ... on 6,100 m² of landscaped grounds" with multipurpose outdoor courts and a lower-school playground. The court/pitch
geometry in the map is correct (OSM). → Replace the glass curtain-wall facade with a FOUR-STOREY NEOCLASSICAL FORMER HOTEL of the early 1900s (verified text: english-schools.org 'adapted ... from a
neo-classical, four-story former hotel'; floor space ~6,000 m² = 4 x the 51.4 x 33.7 m footprint): plastered walls, cornices, regular rows of tall windows with
surrounds, balconies, hip roof - see the comparable former Palace hotel (img/streets/c4_d3.jpg). Exact colour NOT verified (no licensed photo); use cream and say so, paint the multi court as a basketball court (28 x 15 m lines, hoops at both ends of the 32.3 m axis) in
green/terracotta acrylic rather than pale blue, fence 3–4 m around the courts, gates at x=831.6, z=-385.1 and x=869.3, z=-445.3, pine wood and EYDAP water tower to
the south (x=876.5, z=-495). OPEN ITEM for research: facade photo.

## 7. Kefalari square (places.json `kefalari`)
Game: lawn with paths, pines, palms, a bench.
Reality (OSM): central rectangular ornamental basin 30.7 x 13.7 m at x=673, z=-239; church Metamorfosi Sotiros (26 x 18.5 m) on the west side x=626, z=-244, chapel,
bronze statue of Pavlos Melas x=665, z=-192, busts x=684,-248 and x=707,-275, marble fountain "ΔΗΜΟΣ ΑΘΗΝΑΙΩΝ 1872" x=626, z=-207, kiosk x=623, z=-197, 15 wooden
benches at the exact positions listed in places.json. → place these. Planting/furniture (photo r04): tall cedars and Aleppo pines, lawns, agave beds,
unkerbed beige earth paths 3-4 m, black ~4 m lamp posts with three opal globes on swan-neck arms plus one on top (`globe_cluster`). Palms are not in the photo.

## 8. Street furniture everywhere (styles catalogue in streets.json)
- Lamp style must follow the street: `kifisia_lantern` (Kolokotroni, Levidou, Othonos, Kyriazi, Platanos), `kifisia_globe` (Kassaveti middle/east), `globe_cluster`
  (Kefalari grove, Agora; probably Alsos), `avenue_mast` (Kifisias Avenue), `pole_arm` on residential streets. The game currently uses the same lantern-on-green-pole everywhere.
- Bollard style per street (`ball_green`, `cone_black_gold`, `cyl_black_yellow`); the screenshots show one generic black bollard (Kassaveti west only) and none on Kassaveti east or Levidou, where the photos show dense rows.

## 9. Second pass (shots g2_*, main of 2026-11-21 ~08:30: per-street bollards/lamps are now applied - good progress)
1. **Kolokotroni (r17/r18; g2_r17_kolokotroni, g2_r18_kolokotroni)** - game: light-grey paver carriageway and tall black cylinders with a yellow band.
   Reality (photo r17): carriageway of RED-BROWN concrete block pavers #9a8177 in stretcher bond with yellow parking-box / zig-zag markings; a smooth dark-grey
   cycle track #6f6d6b with a 0.25 m white concrete edge band along the left; red_tile sidewalk with a yellow tactile strip; SHORT black cast-iron cone bollards
   (`cone_black_gold`, 0.6 m, gold neck ring) along both edges; rubble-stone garden wall with hedge (right), lantern posts (`kifisia_lantern`).
   → set Kolokotroni carriageway material to the red-brown blocks and the bollard model to `cone_black_gold` (streets.json already says so).
2. **Kassaveti west block, north side (spawn area; photo mythos01 from mythosplus.gr, reference only)** - sidewalk/forecourt is glossy terracotta red_tile
   (~0.35 m squares) - matches; kerb bollards are `baluster_green_yellow` (0.7 m, very dark green, yellow band, acorn top, ~4 m apart), not ball-top green posts
   (g2_spawn_eye shows ball-top `ball_green` here; those belong to the EAST end, x>236). Cafe terraces sit inside low black steel frame enclosures under black
   fabric awnings; plane trees stand in the north sidewalk at the kerb.
3. **Kassaveti middle block (g2_spawn_from_e)** - the 1100 L bin renders as a featureless black box. → dark grey-green body #3a4a44 with curved lid, 4 castors,
   1.37 x 1.07 x 1.3 m (style `wheeled_1100`).
4. **Kyriazi (photo kots02, x~88 z~133)** - lamps are `kifisia_double_globe` (dark-green post, scroll arm, TWO opal globes), sidewalk dark charcoal slabs
   #4a4a4c, pines overhanging. The game uses lantern posts. (My camera at x=40,z=180 landed inside a block - no usable game view yet.)
5. **Agora (g2_agora)** - game: one small green-and-white single turret. Reality (r06, r12): white building with TWO round turrets (~6 m diameter, ~9 m to eaves)
   with bronze/copper-coloured cones and gilded finials, linked by a gabled centre bay with an arched entrance, fleur-de-lis frieze, red ridge tiles, marble
   courtyard with box hedges, Washingtonia palms and 2/3-globe lamps.
6. **Kotsika house / Ralph Lauren (g2_r20_kotsika)** - the honey-stone 3-storey Swiss-cottage villa is not recognisable from Kassaveti 19 (white plaster
   buildings in view). Spec: places.json `kotsika_house_ralph_lauren` + shops.json Ralph Lauren `building`. (lm-ralphlauren owns this.)

Next screenshot pass (planned): Kyriazi at eye level, Kifisias Avenue at Platanos, Othonos (r15), station platforms.
