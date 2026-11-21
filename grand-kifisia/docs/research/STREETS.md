# STREETS of Kifisia - research facts for implementers

Generated from `gk3/data/streets.json` (version 2026-11-21.0908) by research-streets. **Data file is authoritative**; this page is its readable form.
Coordinates are game metres: x = (lon-23.8125)*87716 (east), z = -(lat-38.0727)*110998 (south). Origin = Platanos square.
Confidence: photo (seen in a dated photo) | official | description (text source) | inferred (from OSM geometry / typical local practice). Entries marked *derived* were not researched individually: OSM tags + map geometry only.

## Street furniture catalogue (real local designs; referenced by `style` fields)

### lamps
- **kifisia_globe** - Cast-iron pedestrian post: stepped round plinth, bulbous fluted base to 0.9 m, slim fluted shaft, collar, one opal-white sphere on top. Stands in the sidewalk 0.5 m behind the kerb. - `{"heightM": 3.6, "globeDiaM": 0.45, "baseDiaM": 0.32, "shaftDiaM": 0.09, "colour": "#1f3a2c", "globeColour": "#f3f1e8", "light": "warm white, ~3000 K"}` - seen: Kassaveti east (r16) - (photo)
- **kifisia_lantern** - Cast-iron traditional post: square-to-round fluted base 0.9 m with a spiral garland relief winding up the lower shaft, slim shaft, four-sided tapering glass lantern with a small roof and finial. - `{"heightM": 4.0, "lanternM": [0.38, 0.38, 0.6], "baseDiaM": 0.35, "shaftDiaM": 0.1, "colour": "#1c3328", "glassColour": "#e9e2c8", "light": "warm white"}` - seen: Kolokotroni (r17,r18); Othonos (r15); Levidou (r19) - (photo)
- **kifisia_double_globe** - Dark-green cast-iron post ~4 m with a decorative scroll cross-arm carrying TWO opal-white spheres (one each side, slightly above the arm) and a small finial between them. - `{"heightM": 4.0, "armSpanM": 0.8, "globeDiaM": 0.4, "colour": "#1f3a2c", "globeColour": "#f3f1e8"}` - seen: Kyriazi near Kotsovolos, x~88 z~133 (kots02) - (photo)
- **kifisia_lantern_double** - Same post as kifisia_lantern with a short cross-arm carrying two lanterns (seen where the sidewalk is wide, north side of Kolokotroni). - `{"heightM": 4.2, "armSpanM": 0.9, "colour": "#1c3328"}` - seen: Kolokotroni north side (r17) - (photo)
- **globe_cluster** - Black/dark-green slim post with 2 or 3 opal globes on short curved arms (park and courtyard lamp). - `{"heightM": 3.6, "globes": 3, "globeDiaM": 0.4, "colour": "#16201a"}` - seen: Agora courtyard, 2 and 3 globes (r06); Kefalari grove: 3 globes on curved swan-neck arms + 1 on top (r04) - (photo)
- **avenue_mast** - Tall galvanised steel road-lighting column with a single or double curved arm and LED/sodium luminaire, in the median or at the kerb of Kifisias Avenue. - `{"heightM": 10, "armM": 1.8, "colour": "#8d9194"}` - seen: Kifisias Avenue (OSM lit=yes; typical Attica avenue column) - (inferred)
- **pole_arm** - Residential streets: no decorative posts. A luminaire on a 1.2 m galvanised arm bolted at ~7 m to the concrete (or tarred wooden) electricity pole; overhead cables run pole to pole along one side of the street. - `{"heightM": 7, "poleDiaM": 0.28, "colour": "#9a968c"}` - seen: utility poles with overhead lines on Kassaveti east (r16) and Levidou (r19) - (photo)

### bollards
- **ball_green** - Slim round steel post with a collar and a ball finial; set 0.3 m behind the kerb on BOTH sidewalks to stop pavement parking. - `{"heightM": 0.95, "diaM": 0.09, "ballDiaM": 0.14, "colour": "#1f3a2c", "spacingM": 2.4}` - seen: Kassaveti east (r16) - (photo)
- **baluster_green_yellow** - Cast-iron baluster bollard: round flared foot, slim tapering body, one yellow band ~0.12 m below the top, acorn/ball finial; very dark green (reads black at night). Stands at the kerb edge of the shop sidewalk. - `{"heightM": 0.7, "diaM": 0.14, "colour": "#1d3a2c", "bandColour": "#d6b21c", "spacingM": 4.0}` - seen: Kassaveti north side in front of Mythos Plus (mythos01) - (photo)
- **cone_black_gold** - Short cast-iron baluster bollard: flared round foot, tapering body, neck ring painted gold/yellow, rounded cap. Lines the edge between the cycle track and the carriageway. - `{"heightM": 0.6, "diaM": 0.16, "colour": "#15171a", "bandColour": "#c9a227", "spacingM": 1.5}` - seen: Kolokotroni (r17,r18) - (photo)
- **cyl_black_yellow** - Plain black steel cylinder with a ribbed top section and one yellow reflective band 0.12 m high about 0.15 m below the top. Dense rows on both sides of the paved lane. - `{"heightM": 0.8, "diaM": 0.13, "colour": "#17181a", "bandColour": "#e3b40f", "spacingM": 1.25}` - seen: Levidou (r19) - (photo)

### paving
- **red_tile** - Terracotta-red square cement tiles ~0.3 x 0.3 m laid in a straight grid with fine joints, in panels separated by bands of the same tile; tree pits are plain earth squares ~1.2 m edged with a flat concrete band. A yellow ribbed tactile strip 0.4 m wide runs along the middle of the sidewalk. - `{"colour": "#b0614a", "shadeColour": "#785a50", "tactileColour": "#d9b53a"}` - seen: Kolokotroni south sidewalk (r17,r18); Platanos square sidewalks (r11) - (photo)
- **buff_pavers** - Small rectangular concrete block pavers ~0.1 x 0.2 m, grey-buff with a pink cast, laid stretcher/herringbone; flush cast-iron service covers. - `{"colour": "#a8998c"}` - seen: Kassaveti east sidewalks (r16) - (photo)
- **redbrown_block_road** - CARRIAGEWAY surface (not sidewalk): rectangular concrete block pavers ~0.1 x 0.2 m in red-brown/mauve tones, stretcher bond across the street, with a 0.3 m band of pale concrete blocks along each edge; yellow zig-zag / box markings painted on the blocks at stops and entrances. - `{"colour": "#9a8177", "edgeBandColour": "#c9c2b6"}` - seen: Kolokotroni (r17,r18); OSM surface=sett - (photo)
- **grey_block_road** - CARRIAGEWAY of pale grey concrete block pavers ~0.1 x 0.2 m in stretcher bond, flush with the side walkways (no raised kerb; bollards do the separating). - `{"colour": "#a29e99"}` - seen: Levidou, block between Kassaveti and Kolokotroni, 2015 (r19) - (photo)
- **cycle_asphalt** - Cycle track: smooth dark-grey fine asphalt/screed strip, level with the sidewalk and 2-3 cm above the block carriageway, edged on the road side by a 0.25 m white concrete band. - `{"colour": "#6f6d6b", "edgeBandColour": "#d6d2c8"}` - seen: Kolokotroni (r17,r18) - (photo)
- **marble_slabs** - White-grey Pentelic-type marble slabs in mixed rectangles (0.3-0.6 m) laid in bands, with small red clay insets at joints. - `{"colour": "#cfcac6", "insetColour": "#b4573d"}` - seen: Agora courtyard, Kolokotroni (r06); garden path of the neoclassical house Kifisias 297 (r08) - (photo)
- **cement_slabs** - Standard Greek municipal sidewalk: grey pressed-cement slabs 0.4 x 0.4 m (often with a 4x4 grooved pattern), patched with poured concrete at driveways. - `{"colour": "#9c9a94"}` - seen: typical for residential Kifisia; not photographed street by street - (inferred)
- **asphalt_fresh** - `{"colour": "#3b3b3d"}`
- **asphalt_worn** - Sun-bleached asphalt with darker trench patches and round/rectangular cast-iron covers (r16, r21). - `{"colour": "#6e6a66"}`
- **kerb** - Kerbs are pale precast concrete / white-grey marble-chip blocks 0.15 m wide with a 0.12-0.15 m upstand; at Platanos square the kerb face is painted yellow (no stopping). - `{"colour": "#cfcabc", "yellow": "#e0b62a"}` - seen: r16; r11 - (photo)

### railings
- **green_x_guard** - Pedestrian guard-rail panels along the kerb: dark-green square-tube frame 1.0 m high x 2.0 m long, infill of two crossing diagonals with a small diamond at the centre; posts every 2 m. - `{"heightM": 1.0, "panelM": 2.0, "colour": "#2e5a45"}` - seen: station forecourt (r21) - (photo)
- **green_lattice_low** - Low ornamental railing around planted verges: dark-green posts with pointed caps every 2 m, lattice/diamond mesh panel 0.8 m high. - `{"heightM": 0.8, "colour": "#1f3a2c"}` - seen: Othonos (r15) - (photo)
- **garden_green_bars** - Property boundary: 0.6-1.0 m plastered or rubble-stone plinth wall with square stone/plaster piers every 3-4 m and 1.0-1.2 m of vertical bar railing between them, usually dark green, backed by a clipped hedge or ivy. - `{"colour": "#2f5d3a"}` - seen: Kassaveti east (r16) - (photo)
- **garden_white_bars** - White vertical-bar railing 1.0 m high on a low beige plastered wall. - `{"colour": "#e9e6df"}` - seen: Kassaveti east, south side (r16) - (photo)
- **rubble_wall** - Dry-look rubble limestone garden wall 0.9-1.2 m high in pale grey-white stone, hedge above. - `{"colour": "#bdb8ad"}` - seen: Kolokotroni north side (r17); Kassaveti east (r16) - (photo)

### bins
- **wheeled_1100** - Municipal 1100-litre four-wheel container, dark grey-green body with a curved lid, usually standing in the carriageway against the kerb; often with graffiti tags. - `{"sizeM": [1.37, 1.07, 1.3], "colour": "#3a4a44"}` - seen: Kassaveti east (r16) - (photo)
- **litter_post** - Small dark-green litter basket on a post near crossings. - `{"sizeM": [0.4, 0.3, 1.0], "colour": "#2d4f3c"}` - seen: Platanos (r11, black bin at the corner) - (photo)

### signs
- **street_plate** - Greek street-name plate: blue enamel rectangle ~0.6 x 0.2 m with white capitals, Greek on top and Latin transliteration below, fixed on the corner building or wall at 2.5-3 m. - `{"colour": "#1d4fa0"}` - (inferred)
- **taxi** - Athens taxis are yellow saloons (Skoda Octavia / Mercedes E / Toyota) with a roof TAXI light. - `{"colour": "#f0c810"}` - seen: Platanos (r11) - (photo)

## Streets (priority order)

### Κασσαβέτη - Kassaveti
- kind **shopping_street** | carriageway **6.0 m** | lanes 2 | one-way | eastbound (uphill, away from Kifisias Avenue) | surface asphalt | parking none
- sidewalk: widthM 3.0, material red_brick, materialDetail red_tile on the commercial block (inferred from Platanos/Kolokotroni); buff_pavers on the residential east end (photo), curb concrete
- bollards: present True, spacingM 2.4, style ball_green; lamps: style kifisia_globe, spacingM 22; trees: species plane (Platanus orientalis), old, pollarded, leaning trunks with mottled cream/olive bark, spacingM 9, sides both
- cycle track: present True, side south (right-hand side of the one-way traffic) - side inferred, widthM 2.4, surface cycle_asphalt, twoWay True, extent Kifisias Avenue to the Levidou/Kyriazi junction (OSM cycleway=track on ways 1268628932 and 108224959)
- geometry (OSM): length in play area 443 m; elevation 27.3-38.8 m; grade median 2.7 % (max 6.7 %); facade-to-facade median 21.5 m (p20 19.0, p80 27.8)
- junctions: Agiou Dimitriou (94,61), Levidou (94,61), Kyriazi (94,61), Grigoriou Afxentiou (201,97), Georgiou Drosini (-12,51), Kyprou (292,128), Christou Lada (368,154), G. Karaiskaki (407,166), Georganta (407,166), Kifisias Avenue (-68,46)

Kifisia's best-known cafe and shopping street. It starts at Platanos square on Kifisias Avenue and climbs gently east (2.7 %) for 440 m. The first 160 m (to the junction with Levidou, Kyriazi and Agiou Dimitriou - the player's spawn) are lined shop-to-shop with cafes, fast food and boutiques under big plane trees; east of the junction it turns residential within one block: garden walls, railings, hedges and villas behind them.

Cross-section: `WEST BLOCK (looking east, the direction of traffic): north facades | private forecourt with cafe terraces ~4.4 m | sidewalk ~2.6 m | kerb | 6.0 m asphalt, two lanes one-way (left lane used by the taxi queue / stopping, right lane running) | 2.4 m two-way cycle track | sidewalk ~4.0 m | south facades.  Total facade to facade 19-21.5 m (measured from OSM building outlines). EAST END (photo r16, x~300): garden wall + green railing | 3.0 m buff-paver sidewalk with plane trees in 1.5 m earth pits and ball-top bollards every 2.4 m | pale kerb 0.15 m | 3.8 m asphalt single lane, no markings | kerb | 3.0 m buff-paver sidewalk with ball-top bollards and globe lamp posts | low beige wall + white railing.`

- **segment kassaveti_w** (-68,46) -> (94,61), 162 m: carriageway 6.0 m, 2 lane(s), surface asphalt, parking none; Shop block. North side W->E: Varsos, Holland & Barrett, Nova, Ancho, To Kalamaki..., Veneti bakery, Mythos Plus, Goody's, Everest (corner of Levidou). South side: Dust Cream, Vodafone, AB Vasilopoulos (corner of Kyriazi). Cafe tables stand on the north forecourts, not on the public sidewalk. Mapped zebra crossings at both ends. Widths are derived from OSM sidewalk centre-lines and building outlines, not from a survey. (inferred)
- **segment kassaveti_m** (94,61) -> (236,109), 150 m: carriageway 4.5 m, 1 lane(s), surface asphalt, parking none; Transition block: Kifisia Tower / La Pasteria on the south corner, Carpo, Desigual, Germanos and the open-air cinema Chloe (north side, x~150), then boutiques in converted villas (Different Beast, Kassaveti Tower). Street narrows to one lane; bollards and globe lamps start. (inferred)
- **segment kassaveti_e** (236,109) -> (407,166), 180 m: carriageway 3.8 m, 1 lane(s), surface asphalt, parking none; Exactly as in photo r16 (camera at x=303, z=134 looking east): single unmarked asphalt lane between two paved sidewalks, ball-top bollards on both kerbs, old plane trees on the north sidewalk whose trunks lean over the road, globe lamp posts on the south sidewalk, an 1100 L wheeled bin standing on the sidewalk build-out, garden walls with stone piers and green railings (north) and a beige wall with white railing (south). Ends at Georganta / G. Karaiskaki. (photo)
- landmarks: Platanos square / Kifisias Avenue (start) (-68,46); Roman funerary monument (corner with Kifisias, south side) (-51.5,61.6); Mythos Plus (75.4,45.7); AB Vasilopoulos (56.7,83.8); Spawn junction Kassaveti/Levidou/Kyriazi/Ag. Dimitriou (94,61); Open-air cinema Chloe (148.7,51.5); Starbucks (Kassaveti 19, placed by address) (158,53.5); Archaeological Collection of Kifisia (near the east end) (388,140)
- confidence: photo (east end r16; west block north side: paving, bollards, terraces from mythos01) / inferred (rest)
- sources: <docs/research/img/shops/mythos_01_street_front_night.jpg (from https://www.mythosplus.gr/ - reference only)> <https://commons.wikimedia.org/wiki/File:%CE%9F%CE%B4%CF%8C%CF%82_%CE%9A%CE%B1%CF%83%CF%83%CE%B1%CE%B2%CE%AD%CF%84%CE%B7,_%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_0921.jpg> <https://commons.wikimedia.org/wiki/File:%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_%CE%A0%CE%BB%CE%AC%CF%84%CE%B1%CE%BD%CE%BF%CF%82_7863.jpg> <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)> <https://www.kifissia.gr/sites/default/files/00_new_%CE%A4%CE%95%CE%A7%CE%9D%CE%99%CE%9A%CE%97%20%CE%A0%CE%95%CE%A1%CE%99%CE%93%CE%A1%CE%91%CE%A6%CE%97%20%28S%29.pdf (Municipality of Kifisia, study 3/2021: reconstruction of the cycle tracks on Kassaveti, Levidou, Kolokotroni and Vas. Amalias; known only from the search-engine summary, the file itself was unreachable on 2026-11-21)>

### Κηφισίας - Kifisias Avenue
- kind **avenue** | carriageway **7.0 m** | lanes 2 | two-way | north-south; dual carriageway south of Platanos square, single two-way carriageway north of it | surface asphalt | parking none
- sidewalk: widthM 3.5, material red_brick, materialDetail red_tile around Platanos square (photo r11); cement_slabs elsewhere (inferred), curb concrete, painted yellow at Platanos
- bollards: present False; lamps: style avenue_mast, spacingM 30; trees: species plane (Platanus) and mulberry on the sidewalks; oleander/shrubs in the median, spacingM 10, sides both
- geometry (OSM): length in play area 712 m; elevation 25.6-32.4 m; grade median 3.0 % (max 4.7 %); facade-to-facade median 29.9 m (p20 18.3, p80 34.3)
- junctions: Othonos (-22,-247), Plateia Platanou (Platanos Square) (-37,-2), Irodou Attikou (-87,57), Panagitsas (-5,-74), Georgiou Drosini (-116,182), Papadiamanti (-2,-136), Kassaveti (-68,46), Adrianou (-42,-9), Solomou (-4,-163), Mitropolitou Iakovou (-118,121)

Kifisias Avenue (national road EO83) is the spine of the suburb. Coming from Athens it is a dual carriageway - two lanes each way with a narrow median - up to Platanos square, where the two carriageways pass either side of the planted island; north of the square (from about z=-30) it is ONE carriageway with one lane each way plus bus stops, lined with banks, shops and offices, and it leaves the centre past the Othonos and Deligianni junctions. Traffic lights at Kassaveti, Platanos, Panagitsas/Papadiamanti, Othonos and Deligianni.

Cross-section: `SOUTH OF PLATANOS (dual): facade | 3-4 m sidewalk | 7.0 m southbound carriageway (2 lanes, white dashed lane line, solid edge lines) | 1.5-2 m raised median with shrubs and mast lights | 7.0 m northbound carriageway (2 lanes) | 3-4 m sidewalk | facade. Facade to facade ~30 m. NORTH OF PLATANOS (single): facade | 3 m sidewalk | 9-10 m carriageway: one lane each way, double white centre line, bus bays | 3 m sidewalk | facade. Narrowest facade gap 18 m.`

- **segment kifisias_dual_nb** (-116,274) -> (-27,-18), 315 m: carriageway 7.0 m, 2 lane(s), surface asphalt, parking None; Northbound carriageway (east one). Passes the Roman monument block and the corner of Kassaveti (x=-68, z=46); zebra + signals there. (inferred)
- **segment kifisias_dual_sb** (-33,-22) -> (-125,274), 320 m: carriageway 7.0 m, 2 lane(s), surface asphalt, parking None; Southbound carriageway (west one), along the east edge of the Platanos island and then the Alsos side. (inferred)
- **segment kifisias_north** (-25,-30) -> (-36,-354), 330 m: carriageway 9.5 m, 2 lane(s), surface asphalt, parking None; Single carriageway through the northern centre: KFC at Kifisias 238-240 (x=-4, z=-11), National Bank (x=-46, z=-63), Plaisio (x=-44, z=-229), police station nearby on Othonos side. AERIAL r09 (Dec 2022, camera over Platanos looking north up the avenue): old plane trees (bare in winter) on BOTH sidewalks forming a continuous canopy; the National Bank on the WEST side is a modern 3-storey white block with full-height glass curtain-wall bays and a low pyramid skylight roof covered in blue solar panels, set back behind a stepped paved plaza with young palms; on the EAST side low buildings with large red tiled hip roofs and colonnaded cafe terraces (the Mela arcade / KFC block is among them - identified by address, not by the photo); a signalised zebra with a crowd at Platanos, a white kiosk/shelter on the east sidewalk, buses and taxis in the stream; a yellow-painted kerb curve at the square. (photo (r09 aerial) / inferred (widths))
- landmarks: Platanos square island (-66,5); Kassaveti junction (signals) (-68,46); KFC (-3.9,-10.8); National Bank of Greece (-46,-63.3); Othonos junction (-22,-247); Deligianni junction (-36,-354); Agios Dimitrios cathedral (south) (-17.5,294)
- confidence: inferred (geometry from OSM; surfaces/furniture typical)
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)> <https://commons.wikimedia.org/wiki/File:%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_%CE%A0%CE%BB%CE%AC%CF%84%CE%B1%CE%BD%CE%BF%CF%82_7863.jpg> <https://commons.wikimedia.org/wiki/File:%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_4102.jpg>

### Κολοκοτρώνη - Kolokotroni
- kind **shopping_street** | carriageway **3.5 m** | lanes 1 | one-way | eastbound (uphill towards Kefalari) | surface redbrown_block_road | parking left
- sidewalk: widthM 3.0, material red_brick, materialDetail red_tile with a yellow tactile strip, curb concrete, low (2-3 cm) on the cycle-track side
- bollards: present True, spacingM 1.5, style cone_black_gold; lamps: style kifisia_lantern, spacingM 20; trees: species plane (Platanus orientalis), large, in the south sidewalk and in the north parking strip, spacingM 10, sides both
- cycle track: present True, side south (right-hand side of the one-way traffic), widthM 2.8, surface cycle_asphalt, twoWay True, extent Levidou to x~545 (OSM cycleway=track on way 108224776, 449 m)
- geometry (OSM): length in play area 562 m; elevation 33.2-51.3 m; grade median 3.0 % (max 5.8 %); facade-to-facade median 28.1 m (p20 22.2, p80 36.0)
- junctions: Levidou (144,-29), Panagitsas (144,-29), Kyprou (325,22), Georganta (417,3), Chlois (504,-46), Pentelis (545,-97), Mykonou (574,-140), Filadelfeos (610,-188)

The elegant shopping street of Kifisia: boutiques in old villas and small arcades (Agora, Aigli, Foinikes, Shoppingland), running 560 m uphill (3 %) from Levidou to Charilaou Trikoupi / Kefalari. Unmistakable surface: the carriageway is paved with red-brown concrete blocks, a grey cycle track runs along its south side behind a line of little black-and-gold bollards, and the south sidewalk is red tile under tall plane trees with spiral-decorated lantern posts.

Cross-section: `Looking WEST (downhill, as in photos r17 and r18), left to right = south to north: garden wall / shopfront | 3.0 m red-tile sidewalk (plane trees in earth pits and lantern posts stand in its outer 1 m; yellow tactile strip down the middle) | 2.8 m dark-grey cycle track | 0.25 m white concrete band carrying cone bollards every 1.5 m | 3.5 m lane of red-brown blocks (traffic comes towards you: one-way eastbound) | 2.0 m parallel parking on the same blocks, marked by a pale block band; yellow zig-zag where stopping is banned | 0.15 m kerb | 2.5 m sidewalk | rubble-stone garden wall with hedge / shopfront. Facade to facade 22-28 m.`

- **segment kolokotroni_1** (144,-29) -> (545,-97), 449 m: carriageway 3.5 m, 1 lane(s), surface redbrown_block_road, parking left; OSM tags this way lanes=2: the second "lane" is the parking strip. Shops both sides for the first 250 m (Foinikas arcade at no. 1, x=210 z=-45; Aigli arcades no. 8, x=200-226 z=17-36; Shoppingland x=256 z=-13; Foinikes / Agora complex at no. 7 (x=329 z=-22) with the white turreted folly (Rinaldi in 2015; photos r12 and r06, x~312-345 z~10-16); Marks & Spencer x=339 z=45, GANT). East of x~400 mostly villas (Villa Elli, no. 26, x=493 z=18). (photo)
- **segment kolokotroni_2** (545,-97) -> (610,-188), 112 m: carriageway 5.0 m, 1 lane(s), surface redbrown_block_road, parking both; Bends north-east to Charilaou Trikoupi beside the former Palace hotel; no cycle track on this piece in OSM. Double-lantern posts on the north side (photo r17 was taken at x=535, z=-73). (photo)
- landmarks: Corner Levidou / Panagitsas (start) (144,-29); Agora of Kifisia (white turreted arcade, 1930s style) (345.6,10); Ralph Lauren, stone villa at Kolokotroni 7 (312,-12); Villa Elli, Kolokotroni 26 (N. Plastiras lived here) (492.6,17.6); Former Palace hotel (563,-142)
- confidence: photo
- sources: <https://commons.wikimedia.org/wiki/File:%CE%9F%CE%B4%CF%8C%CF%82_%CE%9A%CE%BF%CE%BB%CE%BF%CE%BA%CE%BF%CF%84%CF%81%CF%8E%CE%BD%CE%B7,_%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_0906.jpg> <https://commons.wikimedia.org/wiki/File:%CE%9F%CE%B4%CF%8C%CF%82_%CE%9A%CE%BF%CE%BB%CE%BF%CE%BA%CE%BF%CF%84%CF%81%CF%8E%CE%BD%CE%B7,_%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_0907.jpg> <https://commons.wikimedia.org/wiki/File:%CE%91%CE%B3%CE%BF%CF%81%CE%AC_%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC%CF%82_0910.jpg> <https://commons.wikimedia.org/wiki/File:%CE%9A%CE%BF%CE%BB%CE%BF%CE%BA%CE%BF%CF%84%CF%81%CF%8E%CE%BD%CE%B7_7,_%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_0913.jpg> <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)> <https://www.kifissia.gr/sites/default/files/00_new_%CE%A4%CE%95%CE%A7%CE%9D%CE%99%CE%9A%CE%97%20%CE%A0%CE%95%CE%A1%CE%99%CE%93%CE%A1%CE%91%CE%A6%CE%97%20%28S%29.pdf (Municipality of Kifisia, study 3/2021: reconstruction of the cycle tracks on Kassaveti, Levidou, Kolokotroni and Vas. Amalias; known only from the search-engine summary, the file itself was unreachable on 2026-11-21)>

### Κυριαζή - Kyriazi
- kind **shopping_street** | carriageway **4.0 m** | lanes 1 | one-way | northbound (arrives at the spawn junction from the south) | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, materialDetail dark charcoal-grey stone/concrete slabs ~0.4 x 0.6 m with paler joint bands (photo kots02 at x~88 z~133); red_tile near the junction (inferred), colour #4a4a4c, curb concrete
- bollards: present True, spacingM 1.5, style cyl_black_yellow, confidence inferred; lamps: style kifisia_double_globe, spacingM 25, confidence photo (kots02); trees: species stone/Aleppo pines with reddish trunks overhanging (photo kots02), bitter orange and plane, spacingM 8, sides both
- geometry (OSM): length in play area 165 m; elevation 34.5-41.1 m; grade median 4.3 % (max 5.6 %); facade-to-facade median 15.1 m (p20 14.1, p80 32.0)
- junctions: Alonion (50,235), Agiou Dimitriou (94,61), Kassaveti (94,61), Levidou (94,61)

Narrow one-way street (facade to facade only 14-15 m) that brings traffic up from Agiou Dimitriou church to the spawn junction. AB Vasilopoulos fills its west side at the junction, the Kifisia Tower / La Pasteria block the east side; further south small shops, the Hotel des Roses side and Norte wine bar (no. 9) near the church square.

Cross-section: `shopfront | 2.2 m sidewalk | kerb | 4.0 m asphalt, one lane northbound | 2.0 m parallel parking (east side, where the width allows) | kerb | 2.2 m sidewalk | shopfront.  Derived from the 14-15 m facade gap. Opposite Kotsovolos: a modern 4-5 storey block clad in grey panels with a ground-floor arcade (kots02).`

- landmarks: Spawn junction (north end) (94,61); AB Vasilopoulos (west side) (56.7,83.8); Kifisia Tower (east side) (107.9,81.6); Norte Wine Bar, Kyriazi 9 (21.8,276.5); Agios Dimitrios church square (south end) (-17.5,294)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Λεβίδου - Levidou
- kind **shopping_street** | carriageway **3.8 m** | lanes 1 | one-way | northbound (from the spawn junction towards Kolokotroni, Othonos and Deligianni) | surface grey_block_road (photo 2015) - OSM 2024 says asphalt | parking left
- sidewalk: widthM 3.0, material grey_pavers, materialDetail same grey blocks as the lane, flush, separated by bollards, curb none (flush) on the first block; concrete further north
- bollards: present True, spacingM 1.25, style cyl_black_yellow; lamps: style kifisia_lantern, spacingM 25; trees: species mixed: stone pines and planes overhanging from the gardens, bitter-orange and mulberry in the sidewalk, spacingM 10, sides both
- cycle track: present True, side east (right-hand side of the one-way traffic) - side inferred, widthM 2.2, surface cycle_asphalt, twoWay True, extent spawn junction to Kolokotroni (OSM cycleway=track on way 108224868)
- geometry (OSM): length in play area 402 m; elevation 33.2-40.2 m; grade median 2.2 % (max 3.2 %); facade-to-facade median 31.4 m (p20 22.1, p80 39.1)
- junctions: Agiou Dimitriou (94,61), Kassaveti (94,61), Kyriazi (94,61), Kolokotroni (144,-29), Panagitsas (144,-29), Argyropoulou (177,-88), Papadiamanti (177,-88), Dimosthenous (224,-175), Othonos (250,-225)

Leaves the spawn junction to the north-east. The first 103 m (to the corner of Kolokotroni and Panagitsas) is a quiet, leafy, shared-surface lane: PAUL stands on its east side in a villa set back behind a garden. North of Kolokotroni it passes the Panagitsa chapel area, the Kouvoutsakis gallery (no. 11) and the Goulandris Natural History Museum (no. 13) and continues as a one-lane residential street to Othonos and Deligianni.

Cross-section: `FIRST BLOCK (photo r19, camera at the Kolokotroni corner looking south-west towards the spawn junction): hedge / garden wall | 2.5-3 m walkway of grey blocks | row of black bollards with a yellow band every 1.25 m | 3.8 m lane of pale grey concrete blocks, no kerb, no markings | row of bollards | parking bay / walkway 2.5 m (cars nose-to-tail beyond the bollards on the north-west side) | hedge. Lantern posts stand in the bollard line on the south-east side. Facade to facade 22-31 m: the buildings sit far back behind gardens.`

- **segment levidou_1** (94,61) -> (144,-29), 103 m: carriageway 3.8 m, 1 lane(s), surface grey_block_road, parking left; Block between Kassaveti and Kolokotroni; PAUL at x=125.5, z=33 (east side). Photo r19 is from April 2015; the 2021 municipal study planned new surfacing for the cycle track here, so the colour of the lane today may differ. (photo)
- **segment levidou_2** (144,-29) -> (250,-225), 225 m: carriageway 4.5 m, 1 lane(s), surface asphalt, parking right; Kolokotroni to Othonos: Kouvoutsakis gallery (Levidou 11, x=155, z=-131), Goulandris Natural History Museum and Retsina mansion (Levidou 13, x=188, z=-189). Gardens, stone walls, pines. (inferred)
- **segment levidou_3** (250,-225) -> (438,-571), 391 m: carriageway 4.5 m, 1 lane(s), surface asphalt, parking right; Othonos to the stream bridge: villas and apartment blocks behind walls (Levidou 26 neoclassical house at x=326, z=-363). (inferred)
- landmarks: Spawn junction (94,61); PAUL (125.5,33.1); Pocket park / planned fountain wall at Levidou & Panagitsas (municipal study 24/2021) (140,-32); Panagitsa chapel (124.9,-50.5); Art Gallery Kouvoutsakis, Levidou 11 (155.5,-131.2); Goulandris Natural History Museum, Levidou 13 (188.5,-185.2)
- confidence: photo (first block, 2015) / inferred (rest)
- sources: <https://commons.wikimedia.org/wiki/File:%CE%9F%CE%B4%CF%8C%CF%82_%CE%9B%CE%B5%CE%B2%CE%AF%CE%B4%CE%BF%CF%85_7899.jpg> <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)> <https://www.kifissia.gr/sites/default/files/00_new_%CE%A4%CE%95%CE%A7%CE%9D%CE%99%CE%9A%CE%97%20%CE%A0%CE%95%CE%A1%CE%99%CE%93%CE%A1%CE%91%CE%A6%CE%97%20%28S%29.pdf (Municipality of Kifisia, study 3/2021: reconstruction of the cycle tracks on Kassaveti, Levidou, Kolokotroni and Vas. Amalias; known only from the search-engine summary, the file itself was unreachable on 2026-11-21)> <https://www.kifissia.gr/sites/default/files/00_new_%CE%A4%CE%95%CE%A5%CE%A7%CE%9F%CE%A3%20%CE%A6%CE%A9%CE%A4%CE%9F%CE%93%CE%A1.%20%CE%A4%CE%95%CE%9A%CE%9C%CE%97%CE%A1%CE%99%CE%A9%CE%A3%CE%97%CE%A3_s.pdf (Municipality of Kifisia, study 24/2021: bioclimatic redevelopment of public spaces, Levidou & Panagitsas; search-engine summary only)>

### Πλατεία Πλατάνου - Plateia Platanou (Platanos Square)
- kind **square_loop** | carriageway **6.5 m** | lanes 2 | one-way | south-west then south (slip road around the west side of the Platanos island) | surface asphalt | parking none
- sidewalk: widthM 3.5, material red_brick, materialDetail red_tile, yellow-painted kerb, curb concrete, painted yellow
- bollards: present False; lamps: style kifisia_lantern, spacingM 20; trees: species plane (the old plane tree that names the square) and smaller planes, spacingM 12, sides both
- geometry (OSM): length in play area 109 m; elevation 24.9-27.1 m; grade median 2.8 % (max 6.8 %); facade-to-facade median None m (p20 None, p80 None)
- junctions: Kifisias Avenue (-42,-9), Adrianou (-42,-9), Irodou Attikou (-87,57)

The 109 m slip road that leaves southbound Kifisias Avenue, runs round the west side of the Platanos island past the edge of the Alsos and the bus stops, and rejoins the avenue opposite Kassaveti. See places.json 'platanos_square'.

Cross-section: `Alsos edge (low wall, railing, trees) | 3.5 m red-tile sidewalk with bus shelter | yellow kerb | 6.5 m asphalt, two lanes one-way | kerb | planted island of the square.`

- landmarks: Bus stop PLATEIA PLATANOU (-84.1,26.5); Decorative fountain on the island (-61,-3.2); Alsos entrance path (-95,20)
- confidence: inferred (OSM geometry) + photo r11 for materials
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)> <https://commons.wikimedia.org/wiki/File:%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC_%CE%A0%CE%BB%CE%AC%CF%84%CE%B1%CE%BD%CE%BF%CF%82_7863.jpg>

### Όθωνος - Othonos
- kind **residential_avenue** | carriageway **6.0 m** | lanes 2 | one-way | eastbound east of the railway/Kifisias (two lanes); mapped one-way throughout | surface asphalt | parking left
- sidewalk: widthM 2.0, material slabs, materialDetail concrete kerb with a planted verge behind it on the villa stretch, curb concrete
- bollards: present False; lamps: style kifisia_lantern, spacingM 25; trees: species plane (Platanus), very large, forming a closed canopy; Judas trees (pink blossom in April) in gardens, spacingM 9, sides both
- geometry (OSM): length in play area 457 m; elevation 25.1-38.7 m; grade median 3.0 % (max 6.9 %); facade-to-facade median 26.6 m (p20 21.6, p80 35.2)
- junctions: Grigoriou Lampraki (-322,-272), Kifisias Avenue (-22,-247), Dionysou (104,-236), Levidou (250,-225), Amalias (Vasilissis Amalias) (-247,-266), Kokota (-141,-257)

One of the grand villa avenues: a tunnel of huge plane trees. West of Kifisias Avenue it comes up from the railway bridge past the station depot; east of it it runs past the police station and the Goulandris museum grounds to Levidou and on towards Kefalari.

Cross-section: `Villa stretch east of Kifisias (photo r15, at x~230, z=-233): old stone wall | planted verge 1.5-2 m with shrubs behind a low green lattice railing, plane trunks (0.8-1 m diameter) standing in it | concrete kerb | 5.5-6 m asphalt, no markings | kerb | verge with shrubs and lantern posts | 1.8 m sidewalk | wall with hedge and garage gate.`

- landmarks: Kifisias Avenue junction (signals) (-22,-247); Police station (63.8,-219); GAIA Centre / Goulandris museum, Othonos 100 (163,-197); Levidou crossing (250,-225)
- confidence: photo (villa stretch) / inferred
- sources: <https://commons.wikimedia.org/wiki/File:%CE%9F%CE%B4%CF%8C%CF%82_%CE%8C%CE%B8%CF%89%CE%BD%CE%BF%CF%82_8572.jpg> <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αγίου Δημητρίου - Agiou Dimitriou
- kind **residential** | carriageway **4.5 m** | lanes 1 | one-way | south-west bound from the spawn junction down to the cathedral and Kifisias Avenue | surface asphalt | parking right
- sidewalk: widthM 2.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species bitter orange, pines from gardens, spacingM 9, sides both
- geometry (OSM): length in play area 175 m; elevation 34.5-41.1 m; grade median 4.3 % (max 5.4 %); facade-to-facade median 29.5 m (p20 17.1, p80 33.3)
- junctions: Alonion (20,229), Agion Theodoron (20,229), Kassaveti (94,61), Levidou (94,61), Kyriazi (94,61), Miltiadou (65,110)

Fourth arm of the spawn junction: leaves it to the south-west beside AB Vasilopoulos, passes a pocket park (x=66, z=131) and Miltiadou, then splits around the cathedral of Agios Dimitrios and its square/playground before reaching Kifisias Avenue. It rises 6.5 m towards the junction (4.3 %).

Cross-section: `building / garden wall | 2 m slab sidewalk | 4.5 m asphalt one lane | 2 m parking | 2 m sidewalk | wall.`

- landmarks: Spawn junction (94,61); Pocket park (65.6,131.4); Agios Dimitrios cathedral (-17.5,294); Playground south of the church (-29,341)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)> <https://commons.wikimedia.org/wiki/File:%CE%9C%CE%B7%CF%84%CF%81%CE%BF%CF%80%CE%BF%CE%BB%CE%B9%CF%84%CE%B9%CE%BA%CF%8C%CF%82_%CE%BD%CE%B1%CF%8C%CF%82_%CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC%CF%82_7915.jpg>

### Αδριανού - Adrianou
- kind **residential** | carriageway **6.0 m** | lanes 2 | one-way | westbound: from Platanos square down past the Alsos and the station forecourt | surface asphalt | parking right
- sidewalk: widthM 2.5, material red_brick, materialDetail red_tile near Platanos, slabs lower down (inferred), curb concrete
- bollards: present False; lamps: style kifisia_lantern, spacingM 25; trees: species plane, pine (Alsos edge), spacingM 10, sides both
- geometry (OSM): length in play area 327 m; elevation 15.2-25.7 m; grade median 3.5 % (max 5.9 %); facade-to-facade median None m (p20 None, p80 None)
- junctions: Kokota (-170,-58), Amalias (Vasilissis Amalias) (-279,-88), Grigoriou Lampraki (-351,-108), Kifisias Avenue (-42,-9), Plateia Platanou (Platanos Square) (-42,-9)

Leaves Platanos square to the west along the north edge of the Alsos (Platanos underground/surface car park on its north side) and drops 10 m to the station forecourt: the walking route from the square to the trains.

Cross-section: `car park / buildings | 2.5 m sidewalk | 6.0 m asphalt | 2.5 m sidewalk | Alsos boundary: low wall with railing and tall pines.`

- landmarks: Platanos square (-45,-12); Platanos Parking (-125,-88); Station forecourt (-350,-85)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αργυροπούλου - Argyropoulou
- kind **shopping_street** | carriageway **4.0 m** | lanes 1 | one-way | westbound | surface asphalt | parking none
- sidewalk: widthM 2.5, material grey_pavers, curb concrete
- bollards: present True, spacingM 1.5, style cyl_black_yellow; lamps: style kifisia_lantern, spacingM 25; trees: species plane, bitter orange, spacingM 9, sides both
- geometry (OSM): length in play area 237 m; elevation 34.5-40.7 m; grade median 2.8 % (max 3.5 %); facade-to-facade median 21.6 m (p20 19.1, p80 27.5)
- junctions: Levidou (177,-88), Papadiamanti (177,-88)

Boutique street parallel to Kolokotroni on its north side (Alpha Bank, Art Flyer at no. 15); sidewalk centre-lines only 6.6 m apart, so a single lane.

Cross-section: `shopfront | 2.5 m sidewalk | 4.0 m asphalt | 2.5 m sidewalk | shopfront.`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αρτέμιδος - Artemidos
- kind **residential** | carriageway **5.0 m** | lanes 1 | one-way | southbound | surface asphalt | parking right
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species pines and cypresses from the school and villa grounds, spacingM 10, sides both
- geometry (OSM): length in play area 325 m; elevation 55.2-61.8 m; grade median 2.8 % (max 6.2 %); facade-to-facade median 25.2 m (p20 22.2, p80 28.2)
- junctions: Xenias (869,-376), Deligianni (858,-273), Filadelfeos (848,-167)

Residential street on the route to the International School of Athens (ISA, campus between Xenias and Artemidos around x=897, z=-433). High walls and fences, school signs, speed limit signs; quiet except at school-run times.

Cross-section: `school fence / wall | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | villa wall.`

- landmarks: ISA campus (897.2,-433.5)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Γεωργίου Δροσίνη - Georgiou Drosini
- kind **lane** | carriageway **4.0 m** | lanes 1 | one-way | north-east bound | surface asphalt | parking none
- sidewalk: widthM 1.5, material slabs, curb concrete
- bollards: present True, spacingM 1.5, style cyl_black_yellow; lamps: style kifisia_lantern, spacingM 25; trees: species bitter orange, spacingM 8, sides one
- geometry (OSM): length in play area 159 m; elevation 30.6-34.2 m; grade median 3.4 % (max 5.1 %); facade-to-facade median 7.4 m (p20 4.2, p80 13.8)
- junctions: Kifisias Avenue (-116,182), Kyriakou (-57,134), Miltiadou (-26,85), Kassaveti (-12,51)

Very narrow lane (facades only 4-7 m apart in places) behind the Kassaveti/Kifisias corner block: Cinemax 3 cinema (Drosini 16), the Drosinis Museum / municipal library villa (x=-52, z=166), small shops (Leonidas, Hemp oil...). A flight of steps (23 m, highway=steps) connects its south-west end down to Kifisias Avenue.

Cross-section: `shopfront | 1.5 m sidewalk | 4.0 m asphalt | 1.5 m sidewalk | shopfront.`

- landmarks: Cinemax 3 (-42,133.5); Drosinis Museum / library (-52.4,165.9); Steps down to Kifisias Avenue (-107,175)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Δηληγιάννη - Deligianni
- kind **residential_avenue** | carriageway **5.5 m** | lanes 1 | one-way | westbound (from Kefalari down to Kifisias Avenue and the station side) | surface asphalt | parking right
- sidewalk: widthM 2.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species plane and pine, spacingM 10, sides both
- cycle track: present True, side right, widthM 2.2, surface cycle_asphalt, twoWay True, extent only way 108225469, x=-228..-332 west of Kifisias Avenue
- geometry (OSM): length in play area 400 m; elevation 52.0-63.6 m; grade median 2.9 % (max 6.0 %); facade-to-facade median 30.8 m (p20 22.3, p80 33.7)
- junctions: Patriarchou Grigoriou E (546,-301), Avras (999,-260), Artemidos (858,-273), Charilaou Trikoupi (765,-281)

Long one-way avenue (the bus route down from Kefalari square): villas, embassies' residences and apartment blocks behind walls; 12 m of fall over 640 m. Crosses Kifisias Avenue at signals (x=-36, z=-354) and continues west to the railway.

Cross-section: `wall | 2 m sidewalk | 5.5 m asphalt: one lane + parking | 2 m sidewalk | wall.`

- landmarks: Kefalari square end (624,-295); Georganta corner, neoclassical house no. 48 (424,-290); Kifisias Avenue junction (-36,-354)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Μιλτιάδου - Miltiadou
- kind **lane** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking right
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species bitter orange, spacingM 8, sides one
- geometry (OSM): length in play area 95 m; elevation 32.4-36.0 m; grade median 3.9 % (max 6.5 %); facade-to-facade median 14.2 m (p20 13.8, p80 15.2)
- junctions: Georgiou Drosini (-26,85), Agiou Dimitriou (65,110)

Short (95 m) back street parallel to Kassaveti behind AB Vasilopoulos, between Drosini and Agiou Dimitriou; facade gap 14 m, service entrances, the side of Hotel des Roses.

Cross-section: `wall | 1.6 m sidewalk | 5.0 m asphalt (two-way in OSM, effectively one lane + parked cars) | 1.6 m sidewalk | wall.`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Ξενίας - Xenias
- kind **residential** | carriageway **5.0 m** | lanes 1 | one-way | eastbound | surface asphalt | parking right
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species pine, plane, spacingM 10, sides both
- geometry (OSM): length in play area 322 m; elevation 53.9-64.5 m; grade median 3.3 % (max 6.2 %); facade-to-facade median 27.6 m (p20 27.1, p80 35.9)
- junctions: Charilaou Trikoupi (755,-388), Artemidos (869,-376), Avras (1008,-362)

Leads from Kefalari (Deligianni / Kolokotroni top) east towards the ISA campus; a bus stop and one signalised junction; rises 10 m.

Cross-section: `wall | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall.`

- landmarks: ISA campus (897.2,-433.5); EYDAP water tower (876.5,-495.4)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Παναγίτσας - Panagitsas
- kind **shopping_street** | carriageway **5.5 m** | lanes 1 | one-way | eastbound from Kifisias Avenue to the Levidou/Kolokotroni corner | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present True, spacingM 1.5, style cyl_black_yellow; lamps: style kifisia_lantern, spacingM 25; trees: species bitter orange, spacingM 8, sides both
- geometry (OSM): length in play area 156 m; elevation 28.6-33.1 m; grade median 3.1 % (max 4.2 %); facade-to-facade median 17.2 m (p20 15.5, p80 25.4)
- junctions: Kifisias Avenue (-5,-74), Kolokotroni (144,-29), Levidou (144,-29)

156 m boutique street (Funky Buddha, Sandy Costa, United Colors of Benetton, Collective...) climbing from the KFC corner on Kifisias Avenue to the little Panagitsa chapel and the corner of Levidou and Kolokotroni. Facade gap 15-17 m.

Cross-section: `shopfront | 2.2 m sidewalk | 5.5 m asphalt: one lane + parking on the south side | 2.2 m sidewalk | shopfront.`

- landmarks: KFC corner on Kifisias (-5,-74); Panagitsa chapel (124.9,-50.5)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Παπαδιαμάντη - Papadiamanti
- kind **shopping_street** | carriageway **5.0 m** | lanes 1 | one-way | westbound to Kifisias Avenue | surface block pavers (OSM surface=paving_stones) | parking right
- sidewalk: widthM 2.5, material grey_pavers, curb concrete
- bollards: present True, spacingM 1.5, style cyl_black_yellow; lamps: style kifisia_lantern, spacingM 25; trees: species plane, bitter orange, spacingM 9, sides both
- geometry (OSM): length in play area 185 m; elevation 30.4-34.3 m; grade median 2.6 % (max 4.5 %); facade-to-facade median 17.5 m (p20 15.9, p80 26.1)
- junctions: Argyropoulou (177,-88), Levidou (177,-88), Dionysou (78,-115), Kifisias Avenue (-2,-136)

Paved shopping street north of Panagitsas: the open-air cinema Bomboniera (no. 12, x=129, z=-84), Cosmote, galleries. OSM maps both sidewalks (centre-lines 7.8 m apart).

Cross-section: `shopfront | 2.5 m sidewalk | 5.0 m block-paved carriageway: one lane + parking | 2.5 m sidewalk | shopfront.`

- landmarks: Open-air cinema Bomboniera (129.1,-83.6)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)> <https://www.kifissia.gr/sites/default/files/00_new_%CE%A4%CE%95%CE%A5%CE%A7%CE%9F%CE%A3%20%CE%A6%CE%A9%CE%A4%CE%9F%CE%93%CE%A1.%20%CE%A4%CE%95%CE%9A%CE%9C%CE%97%CE%A1%CE%99%CE%A9%CE%A3%CE%97%CE%A3_s.pdf (Municipality of Kifisia, study 24/2021: bioclimatic redevelopment of public spaces, Levidou & Panagitsas; search-engine summary only)>

### Φιλαδελφέως - Filadelfeos
- kind **residential** | carriageway **5.0 m** | lanes 1 | one-way | eastbound | surface asphalt | parking right
- sidewalk: widthM 1.8, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species pine, cypress, plane from gardens, spacingM 10, sides both
- geometry (OSM): length in play area 290 m; elevation 51.4-57.2 m; grade median 1.7 % (max 5.3 %); facade-to-facade median 24.0 m (p20 20.0, p80 27.3)
- junctions: Charilaou Trikoupi (757,-175), Artemidos (848,-167), Kolokotroni (610,-188), Kefalariou (668,-183)

Quiet villa street on the plateau east of the centre (elevation 51-57 m), signals where it meets Charilaou Trikoupi.

Cross-section: `wall | 1.8 m sidewalk | 5.0 m asphalt | 1.8 m sidewalk | wall.`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Χαριλάου Τρικούπη - Charilaou Trikoupi
- kind **avenue** | carriageway **7.0 m** | lanes 2 | two-way | north-south along the east side of the centre; one-way pairs near Kefalari | surface asphalt | parking both | 30 km/h
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species plane and pine, spacingM 10, sides both
- geometry (OSM): length in play area 630 m; elevation 52.9-56.0 m; grade median 1.5 % (max 3.1 %); facade-to-facade median 40.1 m (p20 29.1, p80 41.4)
- junctions: Xenias (755,-388), Deligianni (757,-282), Pentelis (739,-73), Filadelfeos (750,-176)

The main north-south road of upper Kifisia, linking Kolokotroni's top end with Kefalari square. Tertiary road, 30 km/h, several signalised junctions (8 mapped signals), bus stop. Hotels and large villas (Theoxenia Palace at x=643, z=-166).

Cross-section: `wall | 2.2 m sidewalk | 7.0 m asphalt, one lane each way with centre line (widening to 4 lanes at the Kefalari end) | 2.2 m sidewalk | wall.`

- landmarks: Top of Kolokotroni (610,-188); Theoxenia Palace hotel (643.2,-166.5); Kefalari square (660,-250)
- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Γρηγορίου Λαμπράκη - Grigoriou Lampraki
- kind **avenue** | carriageway **6.5 m** | lanes 2 | one-way | southbound | surface asphalt | parking right | 30 km/h
- sidewalk: widthM 2.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species plane, mulberry, spacingM 10, sides both
- geometry (OSM): length in play area 303 m; elevation 12.0-18.0 m; grade median 2.2 % (max 3.3 %); facade-to-facade median 30.1 m (p20 21.1, p80 36.0)
- junctions: Othonos (-322,-272), Irodou Attikou (-362,-7), Adrianou (-351,-108)

West of the railway, lower town (elevation 12-18 m): two-lane one-way street with bus stops and a taxi stand.

Cross-section: `building | 2 m sidewalk | 6.5 m asphalt, two lanes | 2 m sidewalk | building.`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Κύπρου - Kyprou
- kind **residential** | carriageway **4.5 m** | lanes 1 | one-way | northbound | surface block pavers (OSM surface=paving_stones) | parking none
- sidewalk: widthM 1.8, material grey_pavers, curb concrete
- bollards: present True, spacingM 2.4, style ball_green; lamps: style kifisia_globe, spacingM 25; trees: species plane, pine, spacingM 10, sides both
- geometry (OSM): length in play area 157 m; elevation 36.0-37.7 m; grade median 2.2 % (max 4.1 %); facade-to-facade median 18.6 m (p20 15.2, p80 28.5)
- junctions: Digeni (279,168), Kassaveti (292,128), Kolokotroni (325,22)

Paved residential street south of Kassaveti (neoclassical house at Kyprou 19, x=253, z=249).

Cross-section: `wall | 1.8 m sidewalk | 4.5 m paved lane | 1.8 m sidewalk | wall.`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Charilaou Trikoupi - Charilaou Trikoupi *(derived)*
- kind **residential** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Charilaou Trikoupi str. - Charilaou Trikoupi Str. *(derived)*
- kind **residential** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Filadelfeos Str. - Filadelfeos Str. *(derived)*
- kind **residential** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αγίων Ασωμάτων - Agion Asomaton *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 2 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 68 m; elevation 10.3-14.3 m; grade median 6.9 % (max 8.5 %); facade-to-facade median 18.3 m (p20 17.5, p80 20.4)
- junctions: Tatoiou (-412,-190)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.6 m sidewalk | 6.8 m asphalt | 3.6 m sidewalk | wall/garden (facade-to-facade median 18.3 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αγίων Θεοδώρων - Agion Theodoron *(derived)*
- kind **residential** | carriageway **3.0 m** | lanes 1 | one-way | surface asphalt | parking none
- sidewalk: widthM 0.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 75 m; elevation 36.6-41.0 m; grade median 6.6 % (max 7.2 %); facade-to-facade median 7.3 m (p20 4.5, p80 16.2)
- junctions: Agiou Dimitriou (20,229), Alonion (20,229), Kyriakou (-62,176)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 0.6 m sidewalk | 3.0 m asphalt | 0.6 m sidewalk | wall/garden (facade-to-facade median 7.3 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αλωνίων - Alonion *(derived)*
- kind **main_street** | carriageway **3.3 m** | lanes 1 | one-way | surface asphalt | parking none
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Not individually researched; values derived from OpenStreetMap tags and the map geometry.

Cross-section: `wall/garden | 2.2 m sidewalk | 3.3 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αμαλίας - Amalias (Vasilissis Amalias) *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 5.7, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 171 m; elevation 18.0-22.2 m; grade median 2.7 % (max 3.5 %); facade-to-facade median 25.7 m (p20 20.9, p80 33.0)
- junctions: Adrianou (-279,-88), Othonos (-247,-266)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 5.7 m sidewalk | 6.0 m asphalt | 5.7 m sidewalk | wall/garden (facade-to-facade median 25.7 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αχαρνών - Acharnon *(derived)*
- kind **main_street** | carriageway **7.5 m** | lanes 2 | one-way | surface asphalt | parking none
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 103 m; elevation 6.3-13.4 m; grade median 7.8 % (max 8.6 %); facade-to-facade median 20.2 m (p20 18.6, p80 35.9)
- junctions: Tatoiou (-407,-128)

Not individually researched; values derived from OpenStreetMap tags and the map geometry.

Cross-section: `wall/garden | 2.2 m sidewalk | 7.5 m asphalt | 2.2 m sidewalk | wall/garden (facade-to-facade median 20.2 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Αύρας - Avras *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 241 m; elevation 60.7-65.2 m; grade median 1.9 % (max 4.0 %); facade-to-facade median 31.4 m (p20 24.6, p80 41.1)
- junctions: Syrou (1026,-575), Xenias (1008,-362), Deligianni (999,-260)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden (facade-to-facade median 31.4 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Γεωργαντά - Georganta *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 269 m; elevation 39.1-44.1 m; grade median 2.0 % (max 3.0 %); facade-to-facade median 24.9 m (p20 22.7, p80 32.1)
- junctions: Patriarchou Grigoriou E (421,-121), Dimosthenous (420,-99), Kolokotroni (417,3), G. Karaiskaki (410,103), Kassaveti (407,166)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.0 m sidewalk | 6.0 m asphalt | 3.0 m sidewalk | wall/garden (facade-to-facade median 24.9 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Γρηγορίου Αυξεντίου - Grigoriou Afxentiou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 4.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 110 m; elevation 36.0-40.5 m; grade median 4.3 % (max 5.3 %); facade-to-facade median 20.7 m (p20 16.2, p80 27.5)
- junctions: Kassaveti (201,97), Digeni (185,144)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 4.0 m sidewalk | 6.0 m asphalt | 4.0 m sidewalk | wall/garden (facade-to-facade median 20.7 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Δαρειώτου - Dareiotou *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 2 | one-way | surface asphalt | parking right
- sidewalk: widthM 5.1, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 6 m; elevation 23.4-23.4 m; grade median 0.8 % (max 0.8 %); facade-to-facade median None m (p20 None, p80 None)
- junctions: Mitropolitou Iakovou (-208,124)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 5.1 m sidewalk | 6.8 m asphalt | 5.1 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Δημοσθένους - Dimosthenous *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 210 m; elevation 37.1-43.2 m; grade median 3.3 % (max 4.5 %); facade-to-facade median 22.8 m (p20 21.8, p80 33.3)
- junctions: Levidou (224,-175), Georganta (420,-99)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.0 m sidewalk | 6.0 m asphalt | 3.0 m sidewalk | wall/garden (facade-to-facade median 22.8 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Διγενή - Digeni *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.4, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 98 m; elevation 37.3-37.8 m; grade median 1.1 % (max 2.0 %); facade-to-facade median 19.9 m (p20 13.9, p80 24.9)
- junctions: Grigoriou Afxentiou (185,144), Kyprou (279,168)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.4 m sidewalk | 6.0 m asphalt | 2.4 m sidewalk | wall/garden (facade-to-facade median 19.9 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Διονύσου - Dionysou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 196 m; elevation 30.5-35.8 m; grade median 2.7 % (max 5.4 %); facade-to-facade median 29.6 m (p20 21.7, p80 34.2)
- junctions: Othonos (104,-236), Papadiamanti (78,-115)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.0 m sidewalk | 6.0 m asphalt | 3.0 m sidewalk | wall/garden (facade-to-facade median 29.6 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Δραγούμη - Dragoumi *(derived)*
- kind **residential** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Δροσίνη - Drosini *(derived)*
- kind **residential** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Ευβοίας - Evvoias *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.9, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.9 m sidewalk | 6.0 m asphalt | 2.9 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Ευρυάλης - Evryalis *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | two-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 34 m; elevation 58.5-58.8 m; grade median 1.0 % (max 1.7 %); facade-to-facade median None m (p20 None, p80 None)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Ζηρίνη - Zirini *(derived)*
- kind **main_street** | carriageway **7.5 m** | lanes 1 | one-way | surface asphalt | parking none
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Not individually researched; values derived from OpenStreetMap tags and the map geometry.

Cross-section: `wall/garden | 2.2 m sidewalk | 7.5 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Ηρώδου Αττικού - Irodou Attikou *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 2 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 282 m; elevation 12.5-27.1 m; grade median 5.7 % (max 7.6 %); facade-to-facade median None m (p20 None, p80 None)
- junctions: Grigoriou Lampraki (-362,-7), Menandrou (-289,10), Kifisias Avenue (-87,57), Plateia Platanou (Platanos Square) (-87,57)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.0 m sidewalk | 6.8 m asphalt | 3.0 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Θεσσαλονίκης - Thessalonikis *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 1 | two-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.8 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Καποδιστρίου - Kapodistriou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 87 m; elevation 49.2-51.1 m; grade median 2.4 % (max 3.0 %); facade-to-facade median 26.5 m (p20 24.4, p80 39.3)
- junctions: Pentelis (632,-83), Chlois (618,35)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden (facade-to-facade median 26.5 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Καραϊσκάκη Γ. - G. Karaiskaki *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 77 m; elevation 39.2-40.1 m; grade median 1.9 % (max 2.7 %); facade-to-facade median 29.2 m (p20 29.2, p80 29.2)
- junctions: Kassaveti (407,166), Georganta (407,166)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden (facade-to-facade median 29.2 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Κεφαλλαρίου - Kefalariou *(derived)*
- kind **residential** | carriageway **4.6 m** | lanes 1 | one-way | surface asphalt | parking none
- sidewalk: widthM 1.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 103 m; elevation 51.8-52.4 m; grade median 0.3 % (max 1.9 %); facade-to-facade median 13.4 m (p20 13.1, p80 29.1)
- junctions: Filadelfeos (668,-183), Pentelis (658,-80)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.2 m sidewalk | 4.6 m asphalt | 1.2 m sidewalk | wall/garden (facade-to-facade median 13.4 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Κοκκιναρά - Kokkinara *(derived)*
- kind **main_street** | carriageway **7.5 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Not individually researched; values derived from OpenStreetMap tags and the map geometry.

Cross-section: `wall/garden | 2.2 m sidewalk | 7.5 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Κυριακού - Kyriakou *(derived)*
- kind **residential** | carriageway **2.8 m** | lanes 2 | one-way | surface asphalt | parking none
- sidewalk: widthM 0.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 56 m; elevation 34.2-36.9 m; grade median 5.1 % (max 5.5 %); facade-to-facade median 9.8 m (p20 8.0, p80 20.4)
- junctions: Agion Theodoron (-62,176), Georgiou Drosini (-57,134)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 0.6 m sidewalk | 2.8 m asphalt | 0.6 m sidewalk | wall/garden (facade-to-facade median 9.8 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Κόκοτα - Kokota *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 2 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 201 m; elevation 23.1-25.7 m; grade median 1.1 % (max 2.8 %); facade-to-facade median 27.3 m (p20 18.4, p80 32.6)
- junctions: Othonos (-141,-257), Solomou (-153,-166), Adrianou (-170,-58)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.0 m sidewalk | 6.8 m asphalt | 3.0 m sidewalk | wall/garden (facade-to-facade median 27.3 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### ΛΕΩΦΟΡΟΣ ΚΗΦΙΣΙΑΣ - Leoforos Kifisias *(derived)*
- kind **residential** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Λάμπρου Κατσώνη - Labrou Katsoni *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 1 | two-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.8 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Λεωφόρος Κηφισίας - Leoforos Kifisias *(derived)*
- kind **residential** | carriageway **5.0 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.6, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.6 m sidewalk | 5.0 m asphalt | 1.6 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Μαυρομιχάλη - Mavromichali *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Μενάνδρου - Menandrou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | two-way | surface asphalt | parking right
- sidewalk: widthM 5.3, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 80 m; elevation 16.9-17.1 m; grade median 0.4 % (max 0.6 %); facade-to-facade median 20.3 m (p20 19.7, p80 23.6)
- junctions: Irodou Attikou (-289,10), Evvoias (-299,116)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 5.3 m sidewalk | 6.0 m asphalt | 5.3 m sidewalk | wall/garden (facade-to-facade median 20.3 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Μητροπολίτου Ιακώβου - Mitropolitou Iakovou *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 2 | one-way | surface asphalt | parking right
- sidewalk: widthM 4.1, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 100 m; elevation 22.9-30.1 m; grade median 7.7 % (max 8.2 %); facade-to-facade median 29.5 m (p20 20.5, p80 33.8)
- junctions: Kifisias Avenue (-118,121), Dareiotou (-208,124)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 4.1 m sidewalk | 6.8 m asphalt | 4.1 m sidewalk | wall/garden (facade-to-facade median 29.5 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Μυκόνου - Mykonou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.7, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 97 m; elevation 48.5-50.4 m; grade median 2.0 % (max 3.7 %); facade-to-facade median 17.8 m (p20 14.9, p80 21.6)
- junctions: Kolokotroni (574,-140), Patriarchou Grigoriou E (490,-188)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.7 m sidewalk | 6.0 m asphalt | 3.7 m sidewalk | wall/garden (facade-to-facade median 17.8 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Μυρσίνης - Myrsinis *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Νάξου - Naxou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Νυμφών - Nymfon *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | two-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 40 m; elevation 54.9-55.1 m; grade median 0.5 % (max 1.9 %); facade-to-facade median None m (p20 None, p80 None)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Ομήρου - Omirou *(derived)*
- kind **residential** | carriageway **5.1 m** | lanes 1 | one-way | surface asphalt | parking none
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 5.1 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Πατριάρχου Γρηγορίου Ε - Patriarchou Grigoriou E *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 3.9, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 190 m; elevation 44.0-50.0 m; grade median 2.7 % (max 5.9 %); facade-to-facade median 25.3 m (p20 23.5, p80 37.8)
- junctions: Georganta (421,-121), Mykonou (490,-188), Deligianni (546,-301)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.9 m sidewalk | 6.0 m asphalt | 3.9 m sidewalk | wall/garden (facade-to-facade median 25.3 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Πατριάρχου Μαξίμου - Patriarchou Maximou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 2 m; grade median None % (max None %); facade-to-facade median None m (p20 None, p80 None)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Πεντέλης - Pentelis *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 181 m; elevation 48.8-53.5 m; grade median 2.7 % (max 2.9 %); facade-to-facade median 26.5 m (p20 23.4, p80 36.7)
- junctions: Charilaou Trikoupi (747,-73), Kapodistriou (632,-83), Kolokotroni (545,-97), Kefalariou (658,-80)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden (facade-to-facade median 26.5 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Σολωμού - Solomou *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 2 | one-way | surface asphalt | parking right
- sidewalk: widthM 5.9, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 148 m; elevation 25.4-31.7 m; grade median 4.6 % (max 5.8 %); facade-to-facade median 29.7 m (p20 19.6, p80 34.3)
- junctions: Kokota (-153,-166), Kifisias Avenue (-4,-163)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 5.9 m sidewalk | 6.8 m asphalt | 5.9 m sidewalk | wall/garden (facade-to-facade median 29.7 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Στροφυλίου - Strofyliou *(derived)*
- kind **residential** | carriageway **4.2 m** | lanes 1 | one-way | surface asphalt | parking none
- sidewalk: widthM 1.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.2 m sidewalk | 4.2 m asphalt | 1.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Συγγρού - Syngrou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Σωκράτους - Sokratous *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.8 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Σύρου - Syrou *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | two-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Τατοΐου - Tatoiou *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 2 | two-way | surface asphalt | parking right
- sidewalk: widthM 3.0, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 271 m; elevation 10.3-14.6 m; grade median 1.6 % (max 3.4 %); facade-to-facade median None m (p20 None, p80 None)
- junctions: Acharnon (-407,-128), Agion Asomaton (-412,-190)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 3.0 m sidewalk | 6.8 m asphalt | 3.0 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Ταϋγέτου - Taygetou *(derived)*
- kind **residential** | carriageway **4.5 m** | lanes 1 | two-way | surface asphalt | parking none
- sidewalk: widthM 1.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 1.2 m sidewalk | 4.5 m asphalt | 1.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Φιλύρων - Filyron *(derived)*
- kind **residential** | carriageway **6.8 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.8 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Χλόης - Chlois *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 5.7, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both
- geometry (OSM): length in play area 137 m; elevation 44.5-47.0 m; grade median 1.4 % (max 5.2 %); facade-to-facade median 19.6 m (p20 18.4, p80 20.1)
- junctions: Kolokotroni (504,-46), Kapodistriou (618,35)

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 5.7 m sidewalk | 6.0 m asphalt | 5.7 m sidewalk | wall/garden (facade-to-facade median 19.6 m from OSM buildings)`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>

### Χρήστου Λαδά - Christou Lada *(derived)*
- kind **residential** | carriageway **6.0 m** | lanes 1 | one-way | surface asphalt | parking right
- sidewalk: widthM 2.2, material slabs, curb concrete
- bollards: present False; lamps: style pole_arm, spacingM 30; trees: species mixed garden trees (pine, cypress, bitter orange) behind walls, spacingM 12, sides both

Residential street of the Kifisia garden suburb: villas and 3-4 storey apartment blocks set back behind walls and railings with gardens; no shops unless listed in shops.json/census.json. Generic description - not individually researched.

Cross-section: `wall/garden | 2.2 m sidewalk | 6.0 m asphalt | 2.2 m sidewalk | wall/garden`

- confidence: inferred
- sources: <https://www.openstreetmap.org/ (extract kif.osm, bbox 23.804,38.0675-23.8265,38.0795; ODbL)>
