# Kassaveti shop block (lm-kassaveti)

Owner: bot `lm-kassaveti`. Code: `gk3/js/89g_lm_kassaveti.js` (registers landmark `kassaveti` with `LM.register`). Debug: `window.KV` in the page
(`built`, `units` = every drawn shopfront with its x/z, `patched` = MAP.pois moved onto the drawn doors, `warn`, `tris`, `ms`).

Scope: west Kassaveti between Kifisias Ave / Platanos and the spawn junction, both sides. The junction corner buildings (AB b30, Kassaveti 9 b295,
Mythos b294, b293, b292) belong to lm-junction; the Kassaveti 19 courtyard to lm-starbucks / lm-ralphlauren.

## Buildings (OSM footprints, 1 unit = 1 m)

| map | OSM way | address | design | storeys (GF + upper) | source of the look |
|---|---|---|---|---|---|
| b291 | w1075949217 | Kassaveti 1 / Kifisias 234 | neoclassical corner block: cream plaster #e8dcbc, grey stone pilasters between the shop bays, string course, tall first-floor windows with moulded architraves and hood cornices, small iron balconies, frieze + modillion cornice, red-tile hip roof, salmon pediment (#e8907a) over the 6.5 m corner wing on Kifisias; the 4 m NW end (edge 2, Vivify) is the plainer modern 3-storey block with balconies | GF 4.9 m + 4.3 m | **photo** ref/r11.jpg (C messier, CC BY-SA 4.0) for the Kifisias front and corner; the 49 m Kassaveti side is not in any open photo → same neoclassical order continued (inferred) |
| b298 | w1075949840 | Kassaveti 3 | 1960-80 polykatoikia, continuous marble-edged balconies with aluminium rails, roller shutters, fabric awnings, top floor set back 1.6 m, solar heaters | GF 4.3 + 3 × 3.0 | inferred (buildings_spec style poly_6080) |
| b297 | w1075949838 | Kassaveti 5 — Varsos | 2-storey neoclassical: salmon-ochre plaster #e8cdb5, quoins, raised ground floor (+0.3 m, two marble steps), central marble balcony on consoles with a small pediment over the door, green louvred shutters, cornice + white balustrade parapet | GF 4.6 + 4.2 | description (buildings_spec features list); no open photo |
| b296 | w1075949837 | Kassaveti 7-9 | 3-storey polykatoikia, iron balcony rails | GF 4.3 + 2 × 3.0 | inferred |
| b14 | w378932290 | Kassaveti 4 (corner Drosini) | 3-storey, masonry balcony parapets | GF 4.2 + 2 × 3.0 | inferred |
| b289 | w1075948791 | Kassaveti 4 (east part) | 4-storey, stone-clad ground floor, top floor set back, planters | GF 4.2 + 3 × 3.05 | inferred |
| b288 | w1075948790 | Kassaveti 6 | 4-storey, top floor set back | GF 4.2 + 3 × 3.0 | inferred |
| b286 | w1075948788 | Kassaveti 6 (east) / Miltiadou 4 | 4-storey (Hotel des Roses entrance on Miltiadou) | GF 4.2 + 3 × 3.0 | inferred |
| b264 | w1075656859 | Drosini 11 | modern 3-storey, stone cladding, glass rails | GF 4.5 + 2 × 3.1 | inferred |

Kassaveti climbs ~7 % from Kifisias (pavement ≈ 26.5 m) to the junction (≈ 33 m). Each shop's floor follows the pavement in front of it
(shops step down the slope, as in reality); upper floors of a building are level.

## Shopfronts in real street order

Positions: OSM-surveyed nodes and verified addresses from docs/research/PLACEMENT_AUDIT.md §7, carried to the facade. s = metres along the OSM edge.
Widths: from the spacing of neighbouring OSM nodes (no open source gives unit boundaries). "weak" = census tier B listing (drawn, marked unverified).

**North side (odd numbers), west → east**
- b291 Kifisias face: Vivify - The Beauty Lab (edge 2, photo), CrediaBank (former HSBC branch in r11), RepairLogic.
- b291 Kassaveti: OJO Sunglasses (weak) · **Bueno** (9.4 m, terrace, green awning) · THIROS (weak) · glamur (weak) · **Lilá** · **Το Χωριάτικο** (bakery) ·
  **Deli To Bacco** · **Bottega Belleza** · entrance no. 1 (plates: Akouson, OJO, glamur) · **TheFixers** · **Swiss Corner**.
- b298: **Wagamama** (11.7 m, terrace with umbrellas) · **Magnifique** (9 m café, terrace) · entrance no. 3.
- b297: **Βάρσος** (whole 7.8 m front, raised floor, terrace).
- b296: **Holland & Barrett** · **Nova** · **Ancho**. (then lm-junction: Kassaveti 9 …)

**South side (even numbers), west → east**
- b264 north point: **Leonidas** (moved from the Drosini side to its OSM node, 15 m fix). Drosini side: Xana, La Vie En Rose, Σφαντος (from MAP.pois).
- b14: **Coffee Island** (corner, both faces) · i-bank corner · **The sweet spot** · **Ζενίθ** · **MrPhone.gr**; Drosini face: entrance no. 4 (plates Drip, Naturafoods — weak listings) · **Fresco Gelateria** · closed unit (roller shutter).
- b289: **L'Occitane** · **Triumph** · **Χαντρόκοσμος** · **Bibi boutique**.
- b288: **Dust Cream** · **Pisxos optics visionworks** · **pharmacy** (green cross) · TISSA (weak) · entrance no. 6.
- b286: **pharmacy** (green cross) · **Vodafone** · **Πίσχος** optics. (then lm-junction: AB.)

Sign colours of chains use their usual livery as plain text (Vodafone red, Holland & Barrett green, L'Occitane yellow, Nova black/red rule,
Wagamama black/white); everything else is **inferred** (no open-licence photo of these shopfronts exists; Wikimedia Commons API was rate-limited
during this work). No logos.

## Interiors hook
Before building, every curated shop's `MAP.pois` record is moved onto the drawn unit (`fx,fz` = unit centre on the facade, `door` = drawn door,
`e,t,w` updated, `lm:'lm-kassaveti'`); 35_interiors.js registers its walk-in doors after `buildBuildings()`, so "Enter <name>" appears at the
drawn door. `KV.patched` lists every move (name, old, new).

## Known gaps (kept current)
- No open photo of the Kassaveti side of b291, of Varsos or of any south-side shopfront: all facade colours / awnings / window rhythms there are inferred.
- Unit widths between OSM nodes are estimated.
- The Kassaveti 4 directory businesses (Drip, Naturafoods) and the Kassaveti 1 ones (OJO, glamur, Akouson) are shown as plates or narrow units; their exact unit is unknown.
