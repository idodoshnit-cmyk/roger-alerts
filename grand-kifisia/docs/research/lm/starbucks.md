# Starbucks Kifisia — Kassaveti 19 courtyard (landmark model, bot lm-starbucks)

Model: `gk3/js/89b_lm_starbucks.js` (registers `LM.register({id:'starbucks', at:[[156.5,61.5]]})`, i.e. map building b426 = OSM way/1076768349).
Debug hook in the game: `window.LM_STARBUCKS` (frame, door, seats, courtyard triangles, roof heights, build time).

## Sources (reference only unless stated)
| file | what it shows | licence |
|---|---|---|
| docs/research/img/shops/starbucks_01_courtyard_2008_REFONLY.jpg | the pavilion seen from the courtyard gate (looking NW): two storeys, hipped tile roof, rendered chimney, "STARBUCKS COFFEE" lettering on the eave band, full-width timber balcony with green umbrellas, ground floor of stone piers + timber French doors, stone-flag paving with a linear drain, street planters in the foreground, villa (Ralph Lauren) steps on the right | starbuckseverywhere.net 2008, REFONLY |
| docs/research/img/shops/ralphlauren_03_night_starbucks_left_travelstyle_REFONLY.jpg | night: the lit green "…RBUCKS C…" lettering and cast-iron lanterns at the left edge, courtyard paving at the villa steps | travelstyle.gr, REFONLY |
| gk3/data/buildings_spec.json `w1076768349`, gk3/data/shops.json buildings `w1076768349` | research-arch / research-shops spec: chalet_villa / timber_brick_pavilion, 2 levels, gfH 3.6, ~8.0 m, hip roof #a4553c, facade brick #7b5a43, timber #5a3d2a, continuous timber balcony ~1.2 m deep | team research (photo) |
| kif.osm / kifisia_map.json b426 | footprint, 14 vertices, ~92 m² (used vertex for vertex) | ODbL |
No free-licence photo of the pavilion exists on Commons (searched by the research bots; Commons answered 429 for this session). No Google imagery used.

## Footprint and frame (metres, x east, z south)
OSM ring: (150.7,67.2) (156.0,69.2) (156.6,67.6) (157.7,68.0) (158.8,65.1) (157.8,64.7) (158.3,63.3) (159.2,63.6) (160.3,60.8) (159.4,60.5) (159.7,59.8) (160.5,60.1) (162.1,56.1) (156.0,53.7).
- Long WEST wall (156.0,53.7)→(150.7,67.2) = 14.5 m, azimuth ≈ 159° → local frame: `s` along the west wall (south end = Kassaveti side), `d` from the west wall into the building = towards the courtyard (ENE).
- The EAST side is a saw-tooth: three projecting bays (≈ 1.1–3.1 m wide, projecting ≈ 0.9 m) separated by recesses — read as the projecting timber French-door bays of the photo. The main east wall line is at the recesses; the balcony deck spans the bays.
- South gable (150.7,67.2)→(156.0,69.2) = 5.7 m faces Kassaveti (shops.json lists "LOL the BRAND" kids' wear on that edge: not modelled as a separate shop yet).

## Heights (door 2.1 m and the timber gallery as scale, cross-checked with spec gfH 3.6 / 8.0 m)
plinth 0.32 · French-door head 2.95 · floor beam 3.30 · balcony deck 3.48 · gallery glazing 3.62–5.72 · lettering band 5.79–6.12 · eave 6.42 · ridge ≈ 8.2 (27° hip) · chimney top ≈ 9.3.
Floor level: highest ground around the footprint + 4 cm (the courtyard is almost flat; Kassaveti falls to the east).

## Facade elements (per side)
- EAST (courtyard, main): GF = three timber French-door bays (1.5 m leaves, 3 x small panes, transom), dark timber posts, head beam, stone sill; rough limestone piers in the recesses; the bay nearest MAP.special.starbucks is the entrance (lit green "STARBUCKS COFFEE" panel on its head beam). FF = continuous small-paned timber gallery glazing behind a full-width timber balcony (posts, handrail, mid rail, square balusters at 13 cm), diagonal brackets under the cantilever; cream "STARBUCKS COFFEE" lettering on the timber band under the eave (photo).
- WEST (back, to the neighbouring lot): GF brick with stone plinth and small timber windows with stone lintels/sills; FF vertical dark timber cladding with small casements. Not visible in any photo → plausible, flagged inferred.
- SOUTH gable (Kassaveti): brick GF with one window, timber FF with two casements, second lit sign high on the gable (inferred from the night photo glow).
- NORTH: brick/timber like the west side (inferred).
- ROOF: hipped, red clay tiles #c8704f, ridge/hip caps, deep eaves (0.55 m, 0.36 m over the balcony) with dark fascia, timber soffit and rafter tails; one square rendered chimney with a tiled hood (photo).

## Courtyard (built by lm-starbucks; boundary agreed in docs/ORDERS_DONE.md 09:20)
Grey stone-flag paving (random-length courses, 1 cm joints) over the whole courtyard polygon (street wall → b423 corner → villa front → villa west wall → Starbucks east facade) at sidewalk level + 2.5 cm; linear drain grate parallel to the facade; three street-edge stone planter troughs with clipped shrubs on the west street-wall segment (photo foreground; replaces that MAP.walls entry), granite kerb, rusticated gate piers with the "ΚΑΣΣΑΒΕΤΗ 19" plate, litter bin, terrace of square dark-wood bistro tables + slatted timber chairs (seats registered in `SEATS` for NPCs), brick-red timber planter boxes, square dark-green market umbrellas with "STARBUCKS COFFEE" valances (one small one on the balcony), A-frame menu board, two cast-iron lanterns (night lights), the tall courtyard pine (photo, left of the facade).
lm-ralphlauren builds the villa, its marble steps/railings (standing on this paving) and the side passage.

## Honesty / gaps
Heights are photo-estimated (no survey). West/north sides and roof plan are inferred. Terrace layout is estimated from one 2008 photo (umbrella/table count may differ today).
