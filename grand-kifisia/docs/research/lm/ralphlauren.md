# Ralph Lauren — villa "Οικία Κότσικα" (Kotsikas house), Κασσαβέτη 19, Kifisia — landmark model notes (bot lm-ralphlauren)

Game file: `gk3/js/89c_lm_ralphlauren.js` (registered with `LM.register({id:'ralphlauren', at:[[169.84,56.4]]})`, replaces map building b425).

## Identity and sources
- Listed monument, built 1910: "an English suburban villa combined with a stone version of the Swiss-cottage style" (archaiologia.gr via SHOPS.md §1b). Wikidata Q122260203, OSM way/1076768348 (map b425, no height tags in OSM).
- Tenant: Ralph Lauren (LH Group franchise list: "Ralph Lauren, Kifisia — 19 Kassaveti Str.").
- Photos used (looked at, measured):
  - `docs/research/img/shops/ralphlauren_01_kotsikas_house_day_CCBYSA.jpg` — Commons, C messier, CC BY-SA 4.0. Day, from the south-east: front + east side.
  - `docs/research/img/shops/ralphlauren_02_night_lhgroup_REFONLY.jpg` — LH Group, reference only. Night, straight on, current awnings.
  - `docs/research/img/shops/ralphlauren_03_night_starbucks_left_travelstyle_REFONLY.jpg` — travelstyle.gr, reference only. Night, straight on, perspective-corrected → used for all heights.
- No Google imagery used.

## Plan (1:1 from OSM)
Local frame used in the code: origin = front-left (south-west) corner (x 161.5, z 62.8); **u** along the front towards the east (unit (0.9528, 0.3035) in x/z); **w** outwards from the front
(negative = into the house); y = metres above the courtyard in front of the steps. The front faces SSW (azimuth ≈ 197°) towards Kassaveti, ~17 m back from the kerb.
OSM outline in (u, w): front (0,0)→(11.86,0) with a bay; east (11.86,0)→(11.98,−11.79); step to (11.16,−11.74); rear annex east →(11.2,−18.9); back →(1.62,−18.99); →(1.56,−14.87) →(0.10,−14.83) → west back to (0,0).
- Main block 11.9 × 11.8 m (three storeys incl. attic); rear annex to 19 m depth.
- **Deviation:** OSM draws the bay as a 4.0 × 1.7 m rectangle at u 5.6–9.6. All three photos show a *canted* bay centred under the main gable and the gable balcony, with only ~0.7 m of wall to its right.
  The model uses a canted bay: base u 5.98–10.98, front face u 6.83–10.13 (3.3 m), projection 1.5 m. Everything else follows the OSM outline exactly.

## Heights (photo 3 = 81.4 px/m on the facade plane, courtyard = 0)
| element | height (m) |
|---|---|
| raised ground floor / door threshold (10 marble steps) | 1.65 |
| plinth sill band (white) | 1.52–1.68 |
| door opening (2.2 m wide, segmental arch) | 1.65–4.63 |
| bay display window (1.9 m wide, segmental arch) | 1.80–4.90 |
| fluted frieze / moulded cornice (wraps the front, bay and sides) | 5.30–5.65 / 5.65–6.05 |
| bay balcony: floor / pierced stone balustrade top | 6.05 / 7.17 |
| first floor: gable French window 1.9 m / wing window 1.3 m (with marble apron 6.05–6.65) | 6.10–8.60 / 6.65–9.00 |
| navy box awnings (valance bottom) | 8.2 (gable, lettered) / 8.6 (wing, plain) |
| gable attic balcony floor (white timber railing, carved brackets) / attic window | 9.60 / 9.75–11.45 |
| wall dormer of the west wing: ledge / window / gable peak / finial | 9.55 / 9.97–11.70 / 12.9 / 13.35 |
| eaves: main gable section / west wing | 10.0 / 10.8 |
| main gable apex (bargeboard top) / finial top | 14.1 / 14.7 |
| rear annex parapet (2 storeys, flat roof) | 8.35 |

## Facade elements (front = SSW)
- Two parts: **west wing** (u 0–5.1) with a low hipped roof, a stone wall-dormer with its own pointed gable + finial, and a chimney; **gable section** (u 5.1–11.86)
  with a steep (≈49°) front-facing gable.
- Walls: rough-faced, irregular coursed honey limestone (#c4a68a lit, #8a7461 shade) with lighter long-and-short rusticated quoins at every corner and
  block surrounds/voussoirs around openings. Bay piers have banded rustication with deep horizontal joints.
- Gable: deep white timber bargeboards, three Swiss-cottage brackets per side (purlin end + drop + diagonal brace), king-post truss with collar and braces in the apex, turned finial.
- West wing ground floor: arched door with dark blue-grey frame (#2f3a40) and gold "RALPH LAUREN" on navy in the fanlight; curved glass canopy on black scroll brackets;
  10 white marble steps flaring outwards, white marble side parapets with black wrought-iron railings; terracotta pots with fan palms at the foot.
- Bay: big arched display window + narrow arched side lights, lit display (mannequins); stone plinth with a vent; cornice wraps it and carries a balcony with a white pierced
  balustrade (small round-arched slots).
- First floor: small-paned white casements; navy box awnings (#2b3a66), the gable one lettered "RALPH LAUREN" in gold serif capitals (plain text, no logo).
- Black iron "X" tie-rod anchors at upper floor level near both front corners (and on the sides).
- East side (photo 1): white cornice band continues; tall round-arched windows on both floors; bracketed white eave soffit (triangular knee braces); white down-pipes;
  rear part lower (annex, flat roof with parapet). Raised brick planters with shrubs along the east walkway.
- West and north sides: **no photo found** — modelled plausibly with the same window type as the east side (stated here honestly).

## Surroundings modelled with the building
Marble steps (walkable: `groundY` is wrapped for the stair area only), side parapets + railings, glass canopy, terracotta pots with fan palms, east brick planter with clipped shrubs.
The courtyard paving, lamps and trees belong to the streets/ground agents.

## Known data conflicts (for data / interiors)
- MAP.pois puts "Different Beast" (cafe) door at (167.84, 67.84) = in front of the RL bay window and "Da Vinci Gelato" at (162.46, 64.37) = on the RL stair landing.
  Both are really separate units in the Kassaveti 19 courtyard; their doors should not sit on the villa. The "Ralph Lauren Kifisia" door (165.11, 65.22) is correct (top of the steps).
