# Landmark: KFC — Mela arcade (Εμπορικό Κέντρο Μελά), Kifisias Ave 238-240 — bot lm-kfc

Code: `gk3/js/89d_lm_kfc.js` (registers `LM.register({id:'kfc', at:[[20,-35],[-5,-2]]})`, receives map building b305 = OSM way 1075952145).

## Sources
| what | source | licence / use |
|---|---|---|
| History: Grand Hotel de Kifissia opened 1897 at Kifisias 238-240 (Melas family); today a luxury shopping centre; Rakkan used to be in its forecourt (προαύλιο) | travelstyle.gr (2021 article) | text, facts only |
| KFC Kifisia, Λεωφ. Κηφισίας 238; hours | kfc.gr store list (via docs/research/SHOPS.md §3) | facts |
| Tenants at 238-240: Kessaris, Fairynails, Simply Burgers, Meligan Beauty spot, Mailo's, Gordo, Celest, La Puerkita, Bubble Tale, Old Boy Members Club, Rojo, photo shop | OSM / Overture via SHOPS.md (b305 list), census.json | positions inside the complex are ESTIMATED |
| **Main photo**: Wikimedia Commons "Κηφισιά 4102.jpg", drone view looking NNE along Kifisias Ave, the arcade in the centre | C messier, CC BY-SA 4.0 — `docs/research/img/lm/kfc/ref_4102_aerial_CCBYSA.jpg` | may be looked at and shown with attribution |
| Footprint | OSM way 1075952145 as stored in kifisia_map.json (16 vertices, T-shaped, forecourt open to the avenue) | ODbL |

No street-level open-licence photo of the avenue facade or of the KFC shopfront was found (Commons API rate-limited, KartaView empty, Mapillary needs a token).
Street-level details below that the drone photo does not show are marked **inferred**.

## What the drone photo shows (crops c1/c2 of 4102)
- **North wing** (former hotel range, ~43 x 13.6 m, long side roughly E-W, perpendicular to the avenue): two storeys. Lower level = glazed shop units
  between white piers on the forecourt side. Upper level = a deep **loggia/gallery of square white columns** (9 bays, ~4.8 m) with glass balustrades /
  railings, restaurant terraces with tables and Christmas wreaths on the columns. Heavy white entablature. **Terracotta hipped roof**, ~22-24°, eaves ~0.9 m,
  rooftop AC units at the back.
- **KFC**: the red "KFC" box sign hangs under the eaves at the **avenue end** of the north wing, right behind the blue/white **kiosk (periptero)** on the
  pavement. KFC's terrace (red chairs) is on the gallery corner. At street level a stair rises from the avenue pavement to the gallery.
- **Forecourt**: paved, slightly sunken relative to the avenue at its south end; a **black steel-and-glass restaurant pavilion with red awnings**
  sits in front of the colonnade; planters; a short stair and a low stone wall towards the avenue.
- **South block**: hipped terracotta roofs over the avenue range and over the court range, a **grey standing-seam metal roof** over the covered arcade behind,
  rooftop chimneys/vents. Along the avenue a **café terrace** under a colonnade (square white pillars), tables with **closed black umbrellas**.
- Colours sampled: render cream `#ede3cf`, trims/columns white `#f2eee4`, roof tiles terracotta `#b85c3a`..`#a24f30`, metal roof `#a9adb0`, pavilion black, awnings red `#a3201c`.

## Dimensions (model)
- Wing: L = 43 m (OSM edge p4-p1), depth 13.6 m. Lower floor 4.05 m (shop height incl. slab), gallery floor at +4.05 m, gallery ceiling +7.45 m, eaves +8.05 m.
  Door 2.1-2.3 m tall in shopfronts, column 0.56 m square. Gallery depth 3.0 m.
- South block: avenue front ~17 m, eaves +4.55 m above the court level; avenue arcade depth 2.2 m, column height 3.55 m.
- Heights from the photo: the gallery storey reads about as tall as the shop storey; the people on the pavement (~1.7 m) give ~4 m per storey.

## Inferred (no photo)
- North face of the wing (1-4 m from the neighbour) and its window rhythm; the east end; street-level details of the avenue face of the wing north of KFC
  (two shop units under a grey canopy); the exact unit-to-tenant assignment; the glazed stair drum at the inner corner of the court; the arcade passage (στοά).
- KFC shopfront detail (red frame, white interior with red-stripe feature wall): brand-typical, not this branch.

## Iteration log
- v1 (2026-11-21): full model from the drone photo — wing with loggia, KFC corner sign + shopfronts + door (special.kfc/MAP.key.kfc moved onto the real KFC door),
  south block with avenue colonnade + café terrace, forecourt paving, pavilion with red awnings, planters, collision.
