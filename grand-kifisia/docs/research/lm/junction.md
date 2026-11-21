# lm-junction — the spawn junction (Kassaveti × Levidou × Agiou Dimitriou)

Owner: bot `lm-junction`. Code: `gk3/js/89a_lm_junction.js` (registers landmark `junction` with `LM.register`). Debug: `window.JN` in the page
(`JN.built` = OSM ids modelled, `JN.signs` = fascia texts, `JN.tris` ≈ triangles added, `JN.warn`).

## Where it is
The junction node is at game (93.9, 61.1) (`MAP.key.junction`). Kassaveti runs W→E (and bends ESE east of the node), Levidou leaves NNE,
Agiou Dimitriou leaves SSW (in OSM; addresses on it near the corner are still given as "Levidou 2"). (The task brief says "Kyriazi"; Kyriazi is the next
street south — the buildings framing the start view are the eight below.)

| quadrant | map idx | OSM way | what | storeys (model) |
|---|---|---|---|---|
| SW | b30 | w668312663 | AB Vasilopoulos supermarket, Levidou 2 / Kassaveti 8, corner block | GF 4.4 m + 2 × 3.05 m = 10.5 m (+0.85 parapet) |
| NW | b294 | w1075949835 | Mythos Plus, Kassaveti 13 (arched shopfront, terrace) | GF 4.4 + 1 set-back storey 3.3 = 7.7 m (+parapet ≈ 8.5 m, shops.json says 8.5) |
| NW corner | b293 | w1075949834 | corner block: Bufala Gelato, UÉ (Kassaveti) / Goody's, Everest, Bubble Tale, Κλειδαράς, Nidodileda (Levidou) | 3, top floor set back 1.7 m |
| NW | b292 | w1075949833 | Kostarelos / Tsouderos building on Levidou | 2 + hip roof |
| NW | b295 | w1075949836 | Kassaveti 9: Το Καλαμάκι, Yard 242, Nak, Munchy's, Βενέτη, Master Meat | 4 |
| NE | b434 | w1076768357 | PAUL (Levidou 4) with Alpha Bank, Amos Cafe, Βιβλιοθήκη της Κηφισιάς | 3, top set back 1.6 m |
| NE corner | b435 | w1076768358 | Carpo, Desigual, Dwdwni (Levidou) / Γερμανός, Imaginarium (corner) / La Queen (Kassaveti) | 3, top set back 1.8 m |
| SE corner | b388 | w1076626153 | "Πύργος Κηφισιάς" with rounded corner: La Pasteria, Manolea Gouskos (Kassaveti) / Flocafe, Zara, Giannetos… (Ag. Dimitriou) | 4, top set back 1.6 m |

Footprints are the real OSM polygons (metres, 1:1); nothing is rescaled. Ground-floor level = highest terrain under the footprint + 0.17 m;
a marble plinth fills down to the street on the low side. Storey heights: shop ground floors 4.4 m, upper floors 3.05 m (door 2.1–2.4 m, balcony rail 1.0 m),
balcony slabs 1.3 m deep (buildings_spec `continuous_slab`, 1.3 m).

## Sources and honesty
- **Photo-based**: Mythos Plus street front — `docs/research/img/shops/mythos_01_street_front_night.jpg`, `mythos_02_entrance_arch.jpg` (© Mythos Plus,
  REFERENCE ONLY, not shipped) + the measured description in `gk3/data/shops.json` (research-shops).
- **Data-based**: footprints, levels, shop names and their edge positions (`kifisia_map.json` from OSM), wall colours / balcony type / rail type /
  set-back top / solar heaters per building (`gk3/data/buildings_spec.json`, research-arch; confidence there = "inferred"), sign texts and colours
  (`gk3/data/shops.json` where present, else the map's shop colours).
- **Searched, nothing usable**: Wikimedia Commons geosearch 150 m around the node (only Οικία Κότσικα and Οδός Λεβίδου 7899, which look elsewhere),
  Commons text search "Κασσαβέτη Κηφισιά" / "Λεβίδου Κηφισιά", web search for PAUL Levidou 4 photos. No Google imagery used (rule).
- **Inferred (not photo-verified)**: everything about AB, PAUL, b293, b435, b388, b292, b295 facades beyond footprint/levels — modelled in the documented
  Kifisia 1960–80 polykatoikia style (marble-clad shop piers, continuous balcony slabs with marble edges, aluminium or iron rails, roller shutters,
  fabric awnings, a/c units, solar water heaters, stair bulkhead). PAUL's shopfront is the brand-typical dark timber front (shops.json says so too).
  AB's fascia uses plain lettering: red "ΑΒ" + navy "ΒΑΣΙΛΟΠΟΥΛΟΣ" on white with a red base line (chain colours; branch livery unconfirmed).

## Mythos Plus — element list (from the photos)
- Salmon/terracotta plaster ground floor (#c27a55). One semicircular arch, clear span 3.3 m, springing 2.62 m, crown ≈ 4.27 m, ringed with radiating
  orange terracotta tiles 0.42 m wide; black steel factory glazing: fixed screen (2 columns × 3 rows) on the left, double door with two long steel pulls on
  the right (1.62 m), bars continue into the fanlight with one horizontal at +0.85 m. Interior visible: brick-paved aisle, white brick right wall, beige
  counter left, "garden in" yellow neon at the end (painted interior tile `jGrill`).
- White-painted brick pier right of the arch (0.48 m). Small electrical boxes on the left pier.
- Capsule (stadium) light box 1.9 × 0.75 m hung on two rods in front of the fanlight, centre-right: "mythos" yellow lower-case, "plus" white,
  "RESTAURANT - GRILL" (plain text, not the logo artwork).
- Cornice slab at 4.4 m, white turned-baluster balustrade along the front; upper storey set back 3 m behind it (glazed terrace doors, black frames).
- Black drop awning with scalloped valance, 11 m long (covers the neighbour unit too), projecting 3 m, front edge 2.9 m, 4 slim black posts;
  fairy lights along the front edge and spiralled round the posts.
- Two glass wind-screen enclosures (3.4 × 2.6 m, 1.5 m high, black posts; the glass is see-through), round navy "mythos plus" decals,
  4 marble-top tables each with cream woven bistro armchairs, one mushroom gas heater per enclosure, A4 menu clipped to the right screen.

## Known gaps (kept current)
- No open-licence or reference photo of AB, PAUL, the corner blocks: their facades are style-class inferences (see above).
- The neighbour unit right of Mythos (yellow-lit, under the shared awning) is modelled as the first shop of b293 (Bufala Gelato per OSM); unverified.
