# INTERIORS — build-ready descriptions of the walk-in shops (research-shops)

Status (updated continuously; newest facts win over older docs):

| interior | status | confidence | evidence |
|---|---|---|---|
| Mythos Plus, Kassaveti 13 | **complete (v1)** | photo (22 official photos, all looked at) + official menu | docs/research/img/shops/mythos_*.jpg |
| Starbucks (Kassaveti 19 courtyard pavilion, map b426) | **v1 (§2)** | exterior PHOTO + official facts; inside TYPICAL, sized to the real footprint | img/shops/starbucks_01_* |
| PAUL (Levidou 4) | **v1 (§3)** | official facts + Wolt prices; look TYPICAL | — |
| KFC (Kifisias 238, Mela arcade) | **v1 (§4)** | official facts; look TYPICAL | — |
| AB Vasilopoulos (Levidou 2 / Kassaveti 8) | **v1 (§5)** | OSM footprint; look TYPICAL | — |
| Sephora (Levidou 8) | **v1 (§6)** | official address; look TYPICAL | — |

Conventions used in every plan below
- Units are metres, 1:1. Local axes are the interiors agent's: **origin = centre of the street door on the inner face of the front wall, +z = out to the street,
  −z = into the shop, +x = to your right as you walk in.** Heights are above the finished floor.
- "PHOTO" = seen in a photo of this very branch. "OFFICIAL" = stated by the business. "TYPICAL" = normal for this kind of shop / this brand, not confirmed for this branch.
  Dimensions are estimated from photo proportions against known sizes (door leaf 0.95 × 2.2 m, chair seat 0.45 m, table 0.75 m) and from the OSM footprint; treat them as ±15 %.
- Colours: photos were taken at night under warm light; the hex values below are corrected toward daylight by eye. Sampled raw values are in SHOPS.md.
- No logo artwork is to be copied. Brand names appear as plain text in the described colours; emblems are described as simple shapes.

---

## 1. MYTHOS PLUS — "Restaurant · Grill", Kassaveti 13, Kifisia 145 62

Facts (OFFICIAL, mythosplus.gr, fetched 2026-11-20): address Κασσαβέτη 13; tel. 210 623 3111; open Monday–Sunday 12:00–00:00; a grill house ("ψητοπωλείο-στέκι") trading since 1997
(first shop in Kefalari, 2003 Kifisia, 2005 Marousi), re-opened as "Mythos Plus" in a new space "with the hidden courtyard" (με την κρυφή αυλή). Dine-in, take-away and delivery.
OSM: node/10098110169 (lat 38.0722883, lon 23.8133596). Map building index 294; `MAP.special.mythos`.

### 1.1 What the place is (read this first)
It is **not** a small tiled souvlaki counter with a few plastic tables. It is a designed, warm, wood-and-terracotta grill restaurant made of TWO spaces in a row:

1. **The grill hall** on Kassaveti — a 6.5 m wide, ~13 m deep, high room. Everything on your LEFT as you enter is one long open kitchen behind an L-shaped tiled counter;
   on your RIGHT a clear 2 m wide brick-paved aisle runs straight to the back. The two gyro spits stand right behind the street window (they are the shop-window display).
2. **"garden in"** — the hidden courtyard: a glazed winter-garden dining hall behind the grill hall (timber posts and beams, retractable fabric roof, plank floor, banquettes),
   with its own second entrance (a flight of 6 wide lit steps) on the lane behind the block.

The Gyro Run order point is the till at the street end of the counter; seated customers are in "garden in".

### 1.2 Plan (local axes; origin = street door centre)

```
                         NORTH (lane behind the block; 6 lit steps down to it)
        x=-4.9                       x=+4.6
   z=-27 +---------[ garden door ]------+
         | B  B  B  B  B  B  B  B  B  B |   B = banquette along walls (seat 0.45 high)
         | t   t   t   t   t        t  |   t = marble tables, 0.7x0.7 (2 seats) / 1.2x0.7 (4 seats)
         |                              g   g = full-height black-framed glazing, bamboo planters inside it
         | t   T   T   t   t        t  g   T = 4-seat tables in the middle
         |      "garden in" hall        g       timber posts every ~3.4 m (P)
         | P        P        P       t  g       9.5 m wide x 14 m deep, ceiling 3.4-3.9 m
         | t   T   T   t   t        t  g
         | B  B  B  B                   |
   z=-13 +-----------+   portal  +------+   portal: 2.2 m wide timber opening; neon "garden in" above it (faces the street door)
         |  kitchen  |c          |
         |  (prep,   |c  aisle   |          c = service counter, long leg (top 1.10 m; middle part raised to 1.35 m, oak slats)
         |  grill,   |c  2.0 m   |          aisle floor: terracotta brick pavers
         |  fryers)  |c  wide    |
         |  hood     |c          |   z=-3.5: TILL / ORDER POINT on the counter (customer stands at x=-0.9, z=-3.5 facing -x)
         |  above    |c          |
         | GG  ______/c          |          GG = the two vertical gyro spits, in the front-left corner behind the street glass
   z=0   +--[ glazed screen ]--[DOOR]--+     front leg of the counter runs behind the glazed screen (0.75 m behind the glass)
        x=-4.6     street glass   x=0  x=+1.9
                  KASSAVETI (terrace under black awning, then pedestrian paving)
```

Room sizes: grill hall 6.5 (x from −4.6 to +1.9) × 13.0 m; clear height 4.4 m under the tiled vault at the entrance, 3.3 m under the timber ceiling further in.
"garden in": 9.5 × 14.0 m (the real hall is skewed ~25° toward the north-east and its plan is an irregular polygon — OSM building 294; an axis-aligned rectangle is an accepted simplification).
The OSM footprint gives a total depth of 29 m from Kassaveti to the lane, which is what the two rooms add up to (13 + 14 + walls).

### 1.3 Street front as seen from inside (z = 0 wall) — PHOTO
- Whole front is black steel "factory window" glazing (thin 4 cm black bars): a fixed screen 3.9 m wide on the left (x −4.3 … −0.95) divided into 2 × 3 panes
  (horizontal bars at 1.05 m and 2.25 m), a double door on the right (2 leaves of 0.95 × 2.25 m, x −0.95 … +0.95) with full-height brushed-steel tube pull handles (Ø4 cm, 1.8 m long),
  and above everything a **semi-circular fanlight** (the top of a big arch, crown at 4.3 m) with radial/vertical black bars.
- Outside, hanging in front of the fanlight at 2.5–3.2 m: the black capsule light-box sign (see SHOPS.md). From inside you see its back.
- A black rubber doormat (1.5 × 0.9 m) with "mythos plus" in a ring, in ochre, lies just outside the door.
- Wall piece right of the door (x +0.95 … +1.9): white-painted brick.

### 1.4 Grill hall — surfaces — PHOTO
| element | description | colour |
|---|---|---|
| floor | terracotta clay brick pavers ~10 × 20 cm, running bond, matt; continues the look of the street paving | `#a3684a`, joints `#7d5540` |
| right wall (x = +1.9) | white-painted brick / brick-format tile, full height | `#ebe8e2` |
| left & back kitchen walls up to the hood (0–2.1 m) | glossy beige "finger" tiles ~5 × 20 cm laid VERTICALLY in straight stacks | `#d9b88a`, joints `#c4a06f` |
| wall above the hood (2.3–4.2 m), left side, whole length | cement-plaster / concrete-effect panels, pale grey-green with rusty stains, visible panel joints every 1.2 m | `#b9b4aa` |
| ceiling, first 4 m from the street | barrel vault (axis along z) clad in glossy ochre-yellow rectangular tiles ~7 × 15 cm in running bond; its front end is the arch you see from the street; the arch ring is orange terracotta brick tile, 0.45 m wide | vault `#c9962e`, ring `#a8521f` |
| ceiling, rest | natural timber boards with exposed black ducts; a black lighting track along the aisle with ~12 cylindrical wood-bodied spotlights at 0.6 m spacing | boards `#b98a5a`, track `#151515` |
| entrance reveal / outer piers | salmon-terracotta painted plaster | `#c27a55` |

### 1.5 The counter (the main object) — PHOTO
- **L-shaped**, front in the same beige vertical finger tiles, top a cream-white composite stone slab 4 cm thick with a rounded edge (`#efe9dc`).
- Front leg: parallel to the street glass, 0.75 m behind it, from the left wall to x = −1.6; height 1.10 m, depth 0.70 m. On it (PHOTO): stacked cardboard take-away boxes (kraft brown, 6–8 high) at the left end,
  a tower of upturned glasses, 6–8 half-litre water bottles with blue caps, a stack of white plates with ochre rims, a steel cutlery bucket, a brown paper bag.
- Corner at x = −1.6, z = −0.75…−1.45: rounded (radius 0.5 m).
- Long leg: along the aisle at x = −1.6 … −0.9 (depth 0.70 m), from z = −1.2 to z = −11.5. First 2.5 m at 1.10 m high (till zone, TYPICAL: POS screen, card terminal, tip jar, paper-bag stack);
  then a 5 m long **raised pass** at 1.35 m whose aisle face is vertical half-round natural-oak slats (each 4 cm wide, `#b88a5e`) starting with a quarter-round end, white stone top — plated dishes wait here;
  the last 2 m drop to 1.10 m again (waiter station: plate stacks, black woven cutlery baskets, napkins).
- Behind the counter along the left wall (kitchen line, 0.8 m deep equipment, working aisle 1.0 m): from the street inwards
  1. **Two vertical gyro spits** (PHOTO): stainless-steel cabinets 0.6 m wide × 1.9 m high, open front, each with a cone of stacked meat 0.35 m Ø at the top tapering to 0.22 m, 0.75 m tall,
     turning slowly (≈ 2 rev/min), with a glowing orange ceramic burner panel behind it and a drip tray below. Left = pork (darker, `#b5713a` with charred edges `#6b3a1c`), right = chicken (paler, `#d9a05c`).
     They stand in the front-left corner so that passers-by see them through the street glass.
  2. TYPICAL for a Greek grill house (not visible in the photos — build them, mark nothing as "verified"): a charcoal/gas char-grill 1.2 m wide with skewers (kalamakia) lying across it,
     a flat-top griddle 0.8 m for pitas, a double fryer 0.6 m (fresh hand-cut fries are on the menu), a refrigerated toppings well (tomato, onion, tzatziki, sauce, lettuce, carrot) 1.2 m with a wrapping board
     and a roll of grease-proof paper, a hand sink, under-counter fridges.
  3. A continuous stainless-steel **extraction hood** over the whole line: underside at 2.0 m, 0.5 m high, 0.9 m deep, with a warm LED strip under its front edge (PHOTO: visible bright line).
- On the concrete-effect wall above the hood, facing the aisle (PHOTO), from the street inwards:
  1. a large **emblem in rusted (corten) steel** Ø 1.6 m: a thin ring (5 cm wide strip standing 6 cm off the wall) that ends at the lower right in a three-pronged fork, and inside it a blocky capital "M"
     0.8 m high with the silhouette of a small standing goat/kid cut out of its lower edge. Colour `#b07a3c` with darker rust `#7a3f1e`. Warm fairy-light strings hang next to it.
  2. **three menu boards** — black frames 0.75 × 1.6 m (portrait), white sheet with small black print, hung side by side 10 cm apart, lower edge at 2.4 m (content in 1.8);
  3. a second, smaller corten emblem Ø 0.9 m (ring with a plain "M").
- At the far end of the aisle (z = −13), over the 2.2 m wide timber-boarded opening to the garden hall: the neon **"garden in"** — warm-yellow neon handwriting (0.3 m tall letters, ~1.5 m wide) mounted on a
  black diamond-mesh panel 1.9 × 0.7 m, wreathed with artificial ivy and burgundy leaves; two small white dome cameras under it. The wall around it is horizontal honey-pine boards (`#b9783f`).

### 1.6 "garden in" — the courtyard hall — PHOTO
- Structure: square timber posts 0.20 m (`#a87548`, natural pine with knots) on a ~3.4 m grid with diagonal knee braces to the beams; beams 0.20 × 0.25 m; roof = a retractable pergola awning of cream
  fabric (`#d8c8b0`) lying in soft transverse waves between the beams. On the underside of every beam, every 1.1 m: a flat round ceiling lamp (white enamel disc Ø 0.30 m with one bare warm bulb).
- Outer sides (north and east): full-height black aluminium-framed glazing in 1.1 m wide panes with a transom at 2.4 m; some panes slide. Outside is dark at night / white daylight by day.
  Through the west glazing you can read the lit sign of the neighbour "Βάρσος 1892" (white box, burgundy script) — the famous patisserie two doors down.
- Solid walls: **lower 1.45 m in dusty terracotta-pink glazed tiles ~7.5 × 30 cm laid vertically in straight stacks (`#a8736a`), above that white brick-format tiles in stack bond (`#ebe9e6`)**;
  upper wall areas between glazing: salmon plaster `#c27a55`. One wall section (2.5 m wide) is clad floor-to-ceiling in vertical knotty pine boards and carries another corten "M" ring emblem Ø 1.2 m.
- Wall lights on the white tile: round alabaster-look discs Ø 0.25 m with a brass centre, at 2.6 m, one per bay.
- Pictures: three black-and-white (sepia) photographs of old Kifisia in thin oak frames ~1.3 × 0.65 m, hung with the lower edge at 1.55 m:
  a horse-drawn carriage (the Kifisia "amaxa"), a neoclassical villa with a colonnaded porch and stone lions, the Platanos square with its giant plane tree and people in 1900s dress.
- Floor: wide oiled pine planks, honey colour (`#9a6a3f`), boards 14 cm.
- A row of 1.8 m tall bamboo plants in grey fibre-cement troughs (0.4 × 1.2 × 0.45 m, `#8f8f8c`) stands inside the glazing behind the banquette.
- **Furniture**
  - Built-in banquette along the walls: tiled base 0.45 m high × 0.55 m deep in the same pink tile, moss-green bouclé seat pad 8 cm (`#5c6044`), loose back cushions 45 × 45 cm alternating
    dusty pink `#b48c86`, oatmeal weave `#cfc6b0` and moss green.
  - Tables: white marble tops with soft grey veins (`#e9e9ec`), 70 × 70 cm (two-tops) and 120 × 70 cm (four-tops), 3 cm thick, on black cast-iron pedestal bases with four toes; height 0.75 m.
    A few four-tops have walnut-stained wood tops (`#6a4a34`).
  - Chairs, two models mixed: (a) dark walnut armchair with a single curved back/arm rail and a moss-green upholstered seat (`#4a2a17` frame); (b) natural-oak "wishbone" (Y-back) chair with a woven
    paper-cord seat (`#c49a66`).
  - Each table is laid: beige paper placemats, white plates with an ochre rim, ribbed glasses upside-down, a small cut-glass bud vase tinted pink with dried red gypsophila tied with a red polka-dot ribbon,
    a black woven cutlery basket with folded white napkins, an amber pump bottle, salt and pepper.
  - About 60 covers in the hall.
- Second entrance (north, to the lane): glazed double door with the same long steel pulls; outside, **six steps the full 5 m width**, each tread 0.35 m with a warm LED strip under the nosing,
  steps and plinth clad in terracotta tile; black planters with shrubs at both ends; above the door a second black capsule sign "mythos plus — RESTAURANT · GRILL"; the fascia above the glazing is
  clad in small brown tiles with round disc wall lamps in groups of three.

### 1.7 Terrace on Kassaveti (outside, for the buildings/streets agents) — PHOTO
Two black-framed glass wind-screen enclosures (1.5 m high clear glass in black posts, each ~3.6 m wide × 2.6 m deep) either side of the door axis, each with a round navy-blue decal Ø 0.6 m reading
"mythos plus" (ochre) on the glass; inside each 3–4 small round/square marble tables and cream woven-rattan bistro armchairs on ochre-painted metal legs; two stainless mushroom gas heaters;
black wall fans on the piers; warm fairy lights spiralled around the plane-tree trunk and the awning posts; a double A4 menu sheet clipped to the right screen. Over it all a **black straight drop awning
with a scalloped valance**, about 11 m wide (it also covers the neighbouring unit), projecting 3 m at a height of 2.9 m. Above the awning the building has a white classical **balustrade** (first-floor terrace).

### 1.8 Menu boards — real content and prices (OFFICIAL: mythosplus.gr/menu, read 2026-11-20)
Board 1 — ΤΥΛΙΧΤΑ / WRAPS (pita 4.50 € · tortilla with double filling 7.00 €)
| Greek (as printed) | English for the game UI | pita € | tortilla € |
|---|---|---|---|
| ΓΥΡΟΣ ΧΟΙΡΙΝΟΣ — ντομάτα, κρεμμύδι, τζατζίκι, πατάτες | Pork gyro pita — tomato, onion, tzatziki, fries | 4.50 | 7.00 |
| ΓΥΡΟΣ ΚΟΤΟΠΟΥΛΟ — ντομάτα, μαρούλι, καρότο, πατάτες, σως Mythos Plus | Chicken gyro pita — tomato, lettuce, carrot, fries, Mythos Plus sauce | 4.50 | 7.00 |
| ΚΑΛΑΜΑΚΙ ΧΟΙΡΙΝΟ | Pork souvlaki pita | 4.50 | 7.00 |
| ΚΑΛΑΜΑΚΙ ΚΟΤΟΠΟΥΛΟ | Chicken souvlaki pita | 4.50 | 7.00 |
| ΚΕΜΠΑΠ | Kebab pita | 4.50 | 7.00 |
| ΚΕΜΠΑΠ ΚΟΤΟΠΟΥΛΟ | Chicken kebab pita | 4.50 | 7.00 |
| ΜΟΣΧΑΡΙ ΓΑΛΑΚΤΟΣ | Veal pita | 4.90 | 7.00 |
| ΜΠΙΦΤΕΚΙ ΜΟΣΧΑΡΙ | Beef patty pita | 4.50 | 7.00 |
| ΜΠΙΦΤΕΚΙ ΚΟΤΟΠΟΥΛΟ | Chicken patty pita | 4.50 | 7.00 |
| ΛΟΥΚΑΝΙΚΟ | Sausage pita | 4.50 | 7.00 |
| ΚΟΤΟΠΟΥΛΟ ΠΑΝΕ | Crispy chicken pita | 4.50 | 7.00 |
| ΤΟ ΑΠΙΤΟ ΤΥΛΙΧΤΟ | "No-pita wrap" (a beef patty instead of the pita) | 7.90 | — |
| VEGGIE: ΜΠΙΦΤΕΚΙ ΛΑΧΑΝΙΚΩΝ · ΦΑΛΑΦΕΛ · ΧΑΛΟΥΜΙ | Veggie patty · Falafel · Halloumi pita | 4.20 | 6.90 |

Board 2 — ΚΑΛΑΜΑΚΙΑ / SKEWERS (each, served with a small pita) and ΜΕΡΙΔΕΣ / PLATES
| Greek | English | € |
|---|---|---|
| ΧΟΙΡΙΝΟ (από τρυφερό λαιμό) | Pork skewer | 3.20 |
| ΚΟΤΟΠΟΥΛΟ ΜΠΟΥΤΙ | Chicken thigh skewer | 3.20 |
| ΜΠΡΙΖΟΛΟΚΑΛΑΜΟ | Pork-chop skewer | 3.90 |
| ΜΟΣΧΑΡΙ ΓΑΛΑΚΤΟΣ | Veal skewer | 3.90 |
| ΚΕΜΠΑΠ · ΚΕΜΠΑΠ ΚΟΤΟΠΟΥΛΟ | Kebab · Chicken kebab | 3.20 |
| ΜΕΡΙΔΑ ΓΥΡΟΣ ΧΟΙΡΙΝΟΣ / ΚΟΤΟΠΟΥΛΟ | Gyro plate, pork / chicken (pita, tomato, onion, tzatziki, fries) | 11.90 |
| ΜΕΡΙΔΑ ΚΑΛΑΜΑΚΙ ΧΟΙΡΙΝΟ / ΚΟΤΟΠΟΥΛΟ (3 τεμ.) | Souvlaki plate, 3 skewers | 11.90 |
| ΜΠΡΙΖΟΛΟΚΑΛΑΜΟ (3 τεμ.) | Pork-chop skewer plate | 12.90 |
| ΚΕΜΠΑΠ ΓΙΑΟΥΡΤΛΟΥ (3 τεμ.) | Kebab with yoghurt and tomato sauce | 11.90 |
| ΜΠΩΛ MYTHOS PLUS ΧΟΙΡΙΝΟ / ΚΟΤΟΠΟΥΛΟ | Mythos Plus bowl (gyro, pita, fries, salad) | 6.90 |
| ΠΙΤΑ ΔΙΑΒΟΛΟΥ | "Devil's pita" — two stuffed pitas, pork and chicken gyro, spicy sauce | 11.90 |
| ΠΛΑΤΩ ΚΡΕΑΤΩΝ MYTHOS PLUS | Mythos Plus meat platter (to share) | 28.90 |
| ΣΧΑΡΑΣ: TOMAHAWK ΧΟΙΡΙΝΗ 800γρ. | Grill: pork tomahawk 800 g with fresh fries | 19.90 |
| ΜΠΙΦΤΕΚΙ ΜΟΣΧΑΡΙ (3 τεμ.) | Beef patties with fries | 10.90 |
| RIB EYE | Rib-eye with fries | 24.90 |
| AMERICAN BURGER · CHICKEN BURGER | Burgers with fries | 10.90 |

Board 3 — ΟΡΕΚΤΙΚΑ / STARTERS · ΣΑΛΑΤΕΣ / SALADS · ΑΝΑΨΥΚΤΙΚΑ & ΜΠΥΡΕΣ / DRINKS
| Greek | English | € |
|---|---|---|
| ΤΖΑΤΖΙΚΙ | Tzatziki | 4.90 |
| ΣΠΙΤΙΚΗ ΤΥΡΟΚΑΥΤΕΡΗ | Spicy feta dip | 4.90 |
| ΦΕΤΑ ΛΑΔΟΡΙΓΑΝΗ | Feta with oil and oregano | 4.90 |
| ΦΡΕΣΚΕΣ ΠΑΤΑΤΕΣ ΤΗΓΑΝΗΤΕΣ | Fresh hand-cut fries | 4.90 |
| ΠΟΙΚΙΛΙΑ ΠΙΤΑΚΙΑ (4 τεμ.) | Small pitas ×4 | 1.90 |
| ΨΗΤΟ ΤΑΛΑΓΑΝΙ | Grilled talagani cheese with tomato jam | 6.90 |
| ΕΛΛΗΝΙΚΗ | Greek salad | 9.90 |
| ΚΑΙΣΑΡΑ | Caesar salad | 11.90 |
| ΝΤΑΚΟΣ | Dakos | 9.90 |
| MYTHOS PLUS (σαλάτα) | Mythos Plus salad | 10.90 |
| COCA-COLA · ZERO · FANTA · SPRITE · FUZE TEA 330ml | Soft drinks 330 ml | 2.00 |
| ΑΥΡΑ ΝΕΡΟ 500ml / 1lt | Avra water 0.5 l / 1 l | 0.50 / 1.00 |
| ΑΛΦΑ · HEINEKEN 330ml | Beer 330 ml | 2.50 |

Footers printed on the real menu: "*Επιλογή πίτας σίτου ή ολικής άλεσης" (wheat or wholemeal pita), "*Η τορτίγια είναι με διπλή γέμιση" (the tortilla has double filling),
"*Όλα τα καλαμάκια συνοδεύονται από πιτάκι" (all skewers come with a small pita).
Suggested short list for the in-game order menu (prices exact): Pork gyro pita 4.50 · Chicken gyro pita 4.50 · Pork souvlaki skewer 3.20 · Chicken souvlaki skewer 3.20 · Gyro tortilla (double) 7.00 ·
Gyro plate 11.90 · Mythos Plus bowl 6.90 · Fresh fries 4.90 · Greek salad 9.90 · Tzatziki 4.90 · Coca-Cola 2.00 · Water 0.50 · Alfa beer 2.50.

### 1.9 People (for the characters API)
- Behind the counter (PHOTO shows one): a cook at the spits — man, dark beard, black T-shirt, **mustard/ochre bib apron**; carving with a long knife. TYPICAL: a second cook at the grill, a cashier at the till.
- Floor staff in black with the same ochre apron. 3–6 seated guests in "garden in".

### 1.10 Lighting and mood
Warm (2700 K) everywhere; nothing blue. Brightest objects: the gyro burner panels (orange glow), the LED line under the hood, the track spots washing the yellow vault, the yellow neon "garden in"
at the end of the aisle (it is the visual target as you walk in), the disc lamps on the garden beams and the LED-lit steps. Daytime: the garden hall is bright with white daylight through the glazing and roof fabric.

### 1.11 Palette (daylight-corrected)
salmon plaster `#c27a55` · arch brick `#a8521f` · vault tile `#c9962e` · beige finger tile `#d9b88a` · oak slats `#b88a5e` · terracotta floor `#a3684a` · concrete wall `#b9b4aa` · corten `#b07a3c`/`#7a3f1e` ·
pink wall tile `#a8736a` · white brick `#ebe9e6` · pine floor `#9a6a3f` · timber `#a87548` · moss green `#5c6044` · dusty pink `#b48c86` · marble `#e9e9ec` · walnut `#4a2a17` · black steel `#141416` ·
sign yellow `#f5b81c` · neon `#ffe65a`.

### 1.12 Sources
- https://www.mythosplus.gr/ (home), /mythos-plus (about), /menu, /epikoinonia (contact) — text and the 22 photos (© Mythos Plus; reference only, not shipped). Local copies: docs/research/img/shops/mythos_01…18.
- OpenStreetMap node/10098110169 and building footprint (ODbL).

---

## 2. STARBUCKS — Kassaveti 19 courtyard pavilion (map b426), two storeys

### 2.1 What the place is
OFFICIAL/PHOTO: a converted two-storey **timber-and-brick former stable** standing at the back-west of the Kassaveti 19 courtyard (NOT on the street; the stone villa east of it is Ralph Lauren).
Footprint from OSM ≈ **14.4 × 6.8 m**, long axis roughly N–S; the glazed front with the balcony faces the courtyard (SSE). Opened 2005. Hours Mo–Fr 08:00–23:00, Sa–Su 08:30–23:30.
Interior: no photo of this branch's inside was found — everything inside is TYPICAL (Starbucks "heritage" fit-out in an old timber building), sized to the real footprint.

### 2.2 Plan (origin = courtyard door; −z into the shop)
- Room: 6.4 m wide (x −3.2…+3.2) × 13.8 m deep (z 0…−13.8). Ground-floor clear height 3.0 m; first floor 2.7 m to the eaves, open to the hipped roof timbers in the middle (ridge 4.6 m above the first floor).
- Bar: along the right wall (x +2.0…+3.2) from z −3.5 to −10.5, height 1.05 m, depth 0.75 m; customer side faces left. Order point/till at z −4; hand-off plane at z −9.5 (with a small "Pick-up" sign).
  Pastry vitrine 1.4 m long at the till (curved glass, 3 shelves). Behind the bar on the wall: 2 espresso machines (each 0.85 × 0.55 × 0.5 m, silver), 2 grinders, a sink, under-counter fridges, shelves of mugs and cups, the menu board above at 2.1–2.8 m.
- Stair: straight timber stair along the left wall, foot at z −9, rising toward the back to the first-floor landing at z −13 (13 risers 0.175 m, width 0.95 m, dark handrail).
- Ground-floor seating (left half): 4 small round tables (Ø 0.6 m) with 8 wooden chairs, a long communal table (2.4 × 0.9 m, 6 stools) near the front glazing, 2 leather armchairs.
- First floor: gallery room the full footprint; 2 sofas, 6 armchairs, 4 low tables, window bar along the front glazing with 6 stools; door to the **full-width timber balcony** (1.4 m deep) over the courtyard with 2 tables under a green umbrella.
- Toilet: back-left corner of the ground floor (1.6 × 2.0 m).

### 2.3 Surfaces and lighting (TYPICAL, matched to the PHOTO exterior)
- Floor: wide dark-oiled oak boards (#5a4030); entrance mat 1.2 × 0.9 m. Walls: exposed old red brick (#8a4b32) to 1.2 m and on the back wall; dark-stained timber framing and boarding above (#5a4030); ceiling joists exposed.
- Bar front: vertical dark timber slats; top: dark stone/quartz (#2b2b2b). Menu board: black board (2.4 × 0.7 m) with white hand-lettered items and prices (use the list in shops.json `items`).
- Lighting: warm 2700 K pendants (black metal shades) over the bar every 1.2 m at 2.2 m, wall lamps over the tables; front glazing glows at night.
- Palette: #1e6b57 (green accents: aprons, cup sleeves, small "STARBUCKS COFFEE" text panel), #5a4030, #8a4b32, #d9c7a8, #2b2b2b.

### 2.4 People: 2 baristas behind the bar (green aprons, black shirts), 3–4 seated customers with laptops/cups, 1 in the queue.

---

## 3. PAUL — Levidou 4 (map b434, NE corner of the spawn junction)

### 3.1 What the place is
OFFICIAL: PAUL boulangerie-café Kifisia, Λεβίδου 4, tel. 210 808 4288; prices from PAUL on Wolt (Nov 2026). Inside and shopfront: PAUL brand-TYPICAL (no photo of this branch found yet).

### 3.2 Plan (origin = door on Levidou; −z into the shop)
- Room 9.5 m wide (x −4.75…+4.75) × 12 m deep; ceiling 3.4 m.
- Sales counter: a long refrigerated glass vitrine across the room at z −5.5 from x −4.2 to +1.5 (6 m long, 1.1 m high, curved glass top to 1.35 m): left part viennoiserie (croissants, pains au chocolat), middle sandwiches and tortillas, right part pâtisserie (éclairs, tartelettes, millefeuille, macarons in rows of colours). Till + card terminal at the right end.
- Behind the counter (z −6.3…−7.0): the **bread wall** — dark wooden racks 2.4 m high × 5 m long with wicker baskets of baguettes (vertical), round loaves (pain PAUL rond, campagne), seeded loaves; a coffee machine and a juice fridge at the right end; a door to the bakehouse/kitchen at x −4 (staff only).
- Café seating in front of the counter and along the windows (front 5 m): 6 small marble-top bistro tables (Ø 0.6 m) with 12 cane/rattan bistro chairs; a wall banquette (dark green leather) along the left wall.
- Window display: wooden shelves with loaves and a cake stand facing the street.

### 3.3 Surfaces, light, palette (TYPICAL)
- Floor: black-and-white cement tiles (0.2 m, checker or small pattern). Walls: cream (#efe6d2) above dark wood wainscot (#2b1d14) to 1.1 m; framed black-and-white photos of old French bakeries; "PAUL — Maison de Qualité depuis 1889" painted in gold serif on a dark panel above the bread wall.
- Lighting: warm brass pendants with glass globes over the counter, brass wall sconces; counter lights inside the vitrine.
- Palette: #2b1d14, #d9c48a (gold lettering), #efe6d2, #8b5a2b (bread/wicker), #111111.
- People: 2 staff in black aprons/caps behind the counter, 2–3 customers at tables, 1 at the counter.

---

## 4. KFC — Kifisias Ave 238-240 (Mela arcade, ex-Grand Hotel de Kifissia), map b305

### 4.1 What the place is
OFFICIAL: KFC Kifisia, Λεωφ. Κηφισίας 238 (KFC Greece store list): Su–We 12:00–24:00, Th 10:00–24:00, Fr–Sa 12:00–01:00. It is a unit in the ground floor of the Mela shopping centre (the 1897 Grand Hotel de Kifissia), facing Platanos square / Kifisias Ave.
Interior: KFC brand-TYPICAL (current "global design" fit-out); no photo of this branch found.

### 4.2 Plan (origin = street door; −z into the shop)
- Room 9 m wide × 15 m deep, ceiling 3.6 m (old hotel ground floor; exposed tall windows on the street side).
- Counter: across the room at z −9, from x −3.5 to +3.5, 1.05 m high, white top, red front with white vertical stripes; 4 tills; above it 4 digital menu screens (each 1.0 × 0.56 m) in a row at 2.4 m showing buckets, burgers, wraps with prices (use shops.json `items`).
- Behind: stainless kitchen line (fryers, holding cabinets with orange heat lamps, drinks dispenser with Pepsi/7Up taps), a pass with trays.
- 3 self-order kiosks (0.6 × 0.4 × 1.8 m portrait touch screens) on the left wall at z −4…−6. Drinks/condiment station (napkins, sauces) on the right at z −6.
- Seating in the front 8 m: 6 four-seat tables (wood-look top, black metal legs), a long bench along the left wall with 4 two-seat tables, high bar along the street window with 6 stools.

### 4.3 Surfaces, light, palette (TYPICAL)
- Floor: dark grey porcelain tiles 0.6 × 0.6 m. Walls: white, one feature wall of red-and-white vertical stripes (stripe width 0.25 m) behind the counter; black graphic panels with large white text (food words only, no logos).
- Lighting: bright 3500 K downlights, black pendant cones over the tables; red-lit counter front.
- Palette: #e4002b, #ffffff, #1a1a1a, #a0703c (wood-look), #f2ede4.
- People: 2 cashiers in black/red uniforms with caps, 1 cook visible behind, 3–4 customers.

---

## 5. AB VASILOPOULOS — Levidou 2 / Kassaveti 8 (map b30), town-centre supermarket

### 5.1 What the place is
OSM/description: the supermarket fills the ground floor of the 3-storey corner block on the SW corner of the spawn junction (footprint ≈ 33 × 21 m), with frontage on Kassaveti and Levidou.
Inside: TYPICAL of a town-centre AB of ~450–550 m² sales area (no photo of this branch found).

### 5.2 Plan (origin = entrance; −z into the store)
- Sales floor ≈ 26 × 18 m, ceiling 3.2 m (suspended grid with light panels).
- Entrance with automatic sliding doors (2.4 m wide) + a separate exit; inside on the right: 3 checkout counters (each 2.8 m long belt + till, 1.0 m apart) facing the exit; cigarettes/sweets rack behind the tills; baskets and a few small trolleys at the door.
- First section: fruit & vegetables (tilted wooden crates on stepped stands, 2 islands 3 × 1.2 m + a wall unit), bakery shelf with bagged bread.
- 6 aisles (gondolas 1.6–1.8 m high, 9–10 m long, 1.8 m aisle width), ends with promo stacks; categories in order: pasta/rice/pulses, oil/canned, breakfast/coffee, snacks/biscuits, drinks (water, soft drinks, beer, wine), household/cleaning, personal care.
- Back wall: open dairy and chilled cabinets (yogurt, milk, feta, cheeses, cold cuts) 12 m long, 2.0 m high with lit shelves; a corner of freezers (chest freezers with glass lids).
- Optional service counter (deli/cheese) 4 m long on the side wall with a clerk.

### 5.3 Surfaces, light, palette (TYPICAL)
- Floor: light grey/beige terrazzo or porcelain tiles 0.6 m. Walls: white; category signs hanging from the ceiling (white text on coloured panels: ΦΡΟΥΤΑ & ΛΑΧΑΝΙΚΑ, ΓΑΛΑΚΤΟΚΟΜΙΚΑ, ΑΝΑΨΥΚΤΙΚΑ, ΚΑΘΑΡΙΣΤΙΚΑ …). Shelves white metal with price-label strips.
- Lighting: bright 4000 K LED panels / linear lights over the aisles.
- People: 2 cashiers, 1 shelf-stacker, 3–4 shoppers with baskets.
- Things to buy (typical Greek supermarket prices, Nov 2026; estimate): bottled water 1.5 l €0.60, bread loaf €1.40, feta 400 g €4.50, Greek yogurt 1 kg €3.90, olive oil 1 l €9.50, tomatoes 1 kg €2.20, bananas 1 kg €1.90, crisps 150 g €2.10, chocolate bar €1.30, soft drink 1.5 l €1.90, beer 330 ml €1.10.

---

## 6. SEPHORA — Levidou 8 (cosmetics store for the homeless-man scene)

### 6.1 What the place is
OFFICIAL address (Λεβίδου 8, Mo–Fr 09:00–21:00, Sa 09:00–20:00). Not in OSM; unit on the east side of Levidou in map b432/b431 (≈ 35 m north of PAUL). Inside: Sephora brand-TYPICAL.

### 6.2 Plan (origin = door; −z into the store)
- Unit ≈ 7.5 m wide × 16 m deep, ceiling 3.2 m.
- Perimeter wall units (2.4 m high) on both side walls: brand bays 1.2 m wide each (make-up left, fragrance right), lit shelves, testers on a sloped lower shelf.
- Centre: 3 low gondolas (1.4 m high, 3 m long) with skincare and the "SEPHORA collection" (black-and-white packaging) in a row down the middle, 1.4 m aisles.
- Tills: black gloss counter (2.4 m) at the back right at z −12, bags hanging behind; a make-up service chair (high chair + mirror) at the back left.
- Floor: glossy white/light-grey tiles; walls white with black-and-white vertical stripe panels at the entrance and behind the tills; ceiling white with bright 4000 K downlights.
- Palette: #000000, #ffffff, #e5e5e5, #c8102e (small red accents).
- People: 2 staff in black with a make-up belt, 2 shoppers.

### 6.3 Sources (sections 2–6)
starbucks.co.uk store locator 42431-97953; starbuckseverywhere.net Attiki/Kifissia (photo 2008); kfc.gr store list (saved 2026-11-21); travelstyle.gr (Grand Hotel de Kifissia, Kifisias 238-240); athensvoice.gr (PAUL branches); wolt.com (PAUL, KFC Kifisia menus); OSM way/668312663 (AB); kifisia.com Kassaveti list; vrisko.gr + tiendeo.gr (Sephora Levidou 8). See SHOPS.md for details.

<!-- BEGIN research-shops generated 7-8 (gen_interiors_md.py) -->
## 7. HONDOS CENTER — Kolokotroni 3 (OWNER: "nearest comparable cosmetics store")

Machine-readable: `shops.json` → `interiorTemplates.hondos_center_kifisia`; the Hondos entry in `shops.json` has `interior.template = "hondos_center_kifisia"`.

### hondos_center_kifisia — Hondos Center Kifisia - Kolokotroni 3, ground floor of the "Shoppingland" arcade building (OSM node/10095491196, map b475)

- unit: 8–12 m wide x 18–25 m deep, ceiling 3.6 m
- floor: white gloss porcelain 60x60 (#f3f3f1); walls: white perimeter bays, brand panels (Estee Lauder, Lancome, Dior, Shiseido, Korres, Apivita), mirrors; ceiling: white, dense recessed downlights
- light: downlights + back-lit brand bays, 4000 K; palette #ffffff #f3f3f1 #1c1c1c #c8102e #d4af37
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - fragrance wall (selective brands), back-lit glass shelves with testers (x6) — left-wall, u 0 v 0.1-0.6, 1.2 x 0.5 x 2.4 m, lacquer + glass #ffffff
  - make-up brand bays with tester trays (x6) — right-wall, u 1 v 0.1-0.7, 1.2 x 0.5 x 2.4 m, lacquer + acrylic #ffffff
  - central gondolas: pharmacy-cosmetics, haircare, sun care (x4) — centre, u 0.5 v 0.25-0.8, 3 x 1 x 1.4 m, white lacquer #ffffff
  - promotional table at the entrance (seasonal gift sets) — door, u 0.5 v 0.12, 1.6 x 0.9 x 0.9 m, gold-trim table #d4af37
  - tills: 2 stations with carrier bags and gift wrap — back-wall, u 0.7 v 0.9, 3 x 0.7 x 1 m, black gloss #1c1c1c
  - beauty consultation chair with lit mirror — back-wall, u 0.2 v 0.9, 0.8 x 0.8 x 1.8 m, chrome + leather #1c1c1c
- people: 3 consultants in black; 3-5 shoppers
- street side: Ground-floor unit with glazed front inside/along the Shoppingland building on Kolokotroni (Kolokotroni 1-3, between Platanos square side and Kassaveti side); fascia lettering "HONDOS CENTER" (brand logo colours not verified in this run - hondoscenter.com blocked 403; use white letters on black as a neutral stand-in and mark it inferred).
- confidence: inferred (address/position OSM + Foursquare + Overture; interior = chain-typical, NOT seen for this branch)
- note: Kifisia also has SEPHORA (Levidou 8) - Hondos is the comparable local chain, ~185 m east of the spawn junction.

## 8. GENERIC SHOP INTERIOR TEMPLATES (every other walk-in shop)

Machine-readable: `shops.json` → `interiorTemplates.<key>`; every shop entry carries `interior.template` = its key. Keys match `CAT2TPL` in `gk3/js/35_interiors.js`. Frame: origin = street-door centre, −z into the shop; place objects by `anchor` + `u`/`v` fractions so they fit the real unit (map frontage x footprint depth). The one photo-based template is `electronics` (Kotsovolos Kyriazi 36, newmoney.gr 2025 opening photos, `docs/research/img/shops/kotsovolos_04_interior_newmoney_REFONLY.jpg`); all others are category-typical for upscale Kifisia (inferred).

### clothes — Fashion boutique (clothes, bags, accessories, lingerie)

- applies to categories: clothes, bag, fashion_accessories, boutique, vintage, leather, fashion, sports
- unit: 5–9 m wide x 10–18 m deep, ceiling 3.6 m
- floor: pale oak planks or large cream porcelain tiles 60x120 (#d9c7a8); walls: white or warm grey plaster; one feature wall (brand colour, mirror or timber slats); ceiling: white plaster, black track lights in 2 rows
- light: track spots on garments + LED strip under shelves, 3000 K; palette #f4f1ea #d9c7a8 #1a1a1a #b8a07a #8c8c8c
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - window display: 2 mannequins on a low plinth — window, u 0.5 v 0.05, 3 x 1.2 x 0.2 m, white lacquer plinth #f4f1ea
  - hanging rail with garments (wall-mounted, 2 tiers) — left-wall, u 0 v 0.15-0.8, - x 0.5 x 2.4 m, black steel or brass tube #1a1a1a
  - hanging rail with garments + shelves above — right-wall, u 1 v 0.15-0.8, - x 0.5 x 2.4 m, black steel / oak shelves #1a1a1a
  - display table with folded knitwear (x2) — centre, u 0.5 v 0.3, 1.6 x 0.8 x 0.8 m, oak / travertine #b8a07a — one behind the other on the centre line
  - free-standing mannequin — centre, u 0.5 v 0.55, 0.5 x 0.5 x 1.8 m, matte white #f4f1ea
  - cash desk with card terminal, tissue paper, carrier bags behind — right-wall, u 0.85 v 0.82, 1.6 x 0.6 x 1 m, black lacquer, stone top #1a1a1a
  - fitting rooms with heavy linen curtains (x2) — back-wall, u 0.3 v 0.97, 1.2 x 1.2 x 2.3 m, linen curtain, mirror #e6dccb
  - full-length mirror — back-wall, u 0.7 v 0.97, 0.8 x 0.05 x 2 m, mirror, black frame #c9ced3
  - upholstered pouf / bench — centre, u 0.35 v 0.85, 1 x 0.5 x 0.45 m, velvet #8c8c8c
- people: 1-2 shop assistants in black; 1-3 shoppers
- street side: full-height glazing, recessed central door, lettering sign on the fascia, roller shutter box above
- confidence: inferred (category-typical)

### shoes — Shoe shop

- applies to categories: shoes, shoe_repair
- unit: 5–8 m wide x 8–15 m deep, ceiling 3.4 m
- floor: oak planks (#c8ad85); walls: cream; back-lit niche shelving on both long walls; ceiling: white, recessed downlights
- light: downlights + LED in every shelf niche, 3000 K; palette #f3eee4 #c8ad85 #2b2622 #ffffff
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - back-lit wall shelving, one shoe per niche (6 rows) — left-wall, u 0 v 0.1-0.85, - x 0.35 x 2.4 m, lacquered MDF + LED #f3eee4
  - back-lit wall shelving — right-wall, u 1 v 0.1-0.7, - x 0.35 x 2.4 m, lacquered MDF + LED #f3eee4
  - upholstered try-on bench (x2) — centre, u 0.5 v 0.4, 1.8 x 0.6 x 0.45 m, leather #2b2622
  - floor mirror angled (x2) — centre, u 0.5 v 0.55, 0.4 x 0.05 x 0.6 m, mirror #c9ced3
  - cash desk — right-wall, u 0.85 v 0.85, 1.5 x 0.6 x 1 m, walnut #2b2622
  - door to the stock room — back-wall, u 0.3 v 1.0, 0.9 x 0.1 x 2.2 m, flush door #f3eee4
- people: 1 assistant; 1-2 customers seated trying shoes
- confidence: inferred (category-typical)

### jewellery — Jeweller / watches

- applies to categories: jewelry, jeweller, watches
- unit: 4–7 m wide x 7–12 m deep, ceiling 3.3 m
- floor: dark walnut or grey marble (#4a3a2e); walls: dark lacquer or fabric panels, brass trims; ceiling: dark grey, pin-spots
- light: pin-spots on each showcase, LED inside showcases (cool 4000 K so diamonds sparkle), 4000 K; palette #1d1a17 #4a3a2e #c9a961 #f2efe9 #2c3e50
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - buzzer-entry glass door with security lock — door, u 0.5 v 0.0, 1 x 0.1 x 2.3 m, glass, brass frame #c9a961
  - window showcases (lit), facing the street (x2) — window, u 0.5 v 0.05, - x 0.6 x 1.6 m, glass + velvet #1d1a17
  - wall showcases set into the panelling (x3) — left-wall, u 0 v 0.2-0.8, 1.2 x 0.35 x 1 m, glass #1d1a17
  - glass counter with velvet trays and 2 stools for clients — right-wall, u 0.8 v 0.3-0.7, 3 x 0.6 x 0.95 m, glass, walnut base #2c3e50
  - client stool (x2) — right-wall, u 0.65 v 0.5, 0.45 x 0.45 x 0.75 m, brass + velvet #c9a961
  - safe door / back office — back-wall, u 0.5 v 1.0, 0.9 x 0.2 x 2.1 m, steel #1d1a17
- people: 1 jeweller in suit; 0-1 client seated
- street side: narrow front, small lit windows, often a black or bronze frame and a gold-leaf name
- confidence: inferred (category-typical)

### cafe — Coffee bar / all-day café

- applies to categories: cafe, coffee, tea
- unit: 5–10 m wide x 8–16 m deep, ceiling 3.6 m
- floor: terrazzo or patterned cement tiles (#d8d2c8); walls: white plaster + one timber or tiled wall; menu board above the bar; ceiling: exposed or white, pendant lamps
- light: pendants over the bar, warm wall lights, 2700 K; palette #f2ede4 #d8d2c8 #5a3e2b #1f1f1f #7a8b6a
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - coffee bar: counter with 2-group espresso machine, grinders, pastry display at the front — right-wall, u 0.75 v 0.25-0.6, 4 x 0.7 x 1.05 m, timber front, stone top #5a3e2b
  - back bar: shelves of cups, fridge with juices — right-wall, u 1 v 0.25-0.6, 4 x 0.6 x 2.2 m, steel + timber #1f1f1f
  - menu board (chalk or light box) above the back bar — right-wall, u 1 v 0.4, 2 x 0.05 x 0.8 m, black board, white text #1f1f1f
  - small round table with 2 chairs (x4) — left-wall, u 0.2 v 0.2-0.85, 0.6 x 0.6 x 0.75 m, marble top, metal base #f2ede4
  - window bar with high stools — window, u 0.3 v 0.05, 2.5 x 0.4 x 1.1 m, timber #5a3e2b
  - WC door — back-wall, u 0.2 v 1.0, 0.8 x 0.1 x 2.1 m, flush door #f2ede4
- people: 1-2 baristas; 3-6 customers, some outside
- street side: outside: 4-10 tables with rattan or metal chairs under cream umbrellas; inside doors folded open in summer
- confidence: inferred (category-typical)

### restaurant — Restaurant / taverna

- applies to categories: restaurant, bar, pub, biergarten
- unit: 7–14 m wide x 12–25 m deep, ceiling 3.8 m
- floor: oak planks or Cretan-style terracotta tiles (#a87b55); walls: plaster in warm white, stone or timber feature wall, framed photos; ceiling: timber beams or white
- light: warm pendants over tables, candle lights at night, 2700 K; palette #efe6d6 #a87b55 #3a2e27 #6b7f5a #c9a961
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - host stand at the door — door, u 0.6 v 0.08, 0.6 x 0.4 x 1.1 m, timber #3a2e27
  - table for 4 with chairs (x8) — centre, u 0.5 v 0.15-0.75, 0.8 x 0.8 x 0.75 m, white linen over timber #efe6d6 — grid 2.2 m x 2.0 m
  - wall banquette with tables for 2 — left-wall, u 0 v 0.2-0.8, - x 0.6 x 0.9 m, upholstered #6b7f5a
  - bar / pass to the kitchen, wine shelves behind — back-wall, u 0.6 v 0.88, 4 x 0.7 x 1.1 m, timber + marble #3a2e27
  - kitchen door with porthole — back-wall, u 0.15 v 1.0, 0.9 x 0.1 x 2.1 m, stainless #c9c9c9
- people: 2 waiters in black aprons; 6-14 diners
- street side: terrace on the pavement: tables in rows, planters as a fence, umbrellas or an awning
- confidence: inferred (category-typical)

### fastfood — Souvlaki / gyro / burger counter shop

- applies to categories: fast_food
- unit: 4–8 m wide x 8–14 m deep, ceiling 3.3 m
- floor: grey porcelain anti-slip tile (#8f8f8a); walls: white tiles to 2 m, illuminated menu light boxes with photos above the counter; ceiling: white, LED panels
- light: LED panels + lit menu boxes, 4000 K; palette #f4f4f2 #8f8f8a #b8322a #f2c14e #1c1c1c
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - service counter with till and card terminal — centre, u 0.5 v 0.45, - x 0.7 x 1.05 m, stainless + coloured front #b8322a
  - vertical gyro spits (2) with radiant burners (x2) — back-wall, u 0.25 v 0.65, 0.6 x 0.6 x 1.4 m, stainless #c9c9c9
  - charcoal/gas grill line with extractor hood — back-wall, u 0.65 v 0.7, 2 x 0.8 x 0.9 m, stainless #c9c9c9
  - cold toppings bar (tomato, onion, tzatziki tubs) — centre, u 0.5 v 0.55, 1.6 x 0.5 x 0.9 m, stainless + glass #c9c9c9
  - illuminated menu light boxes — back-wall, u 0.5 v 0.95, 3 x 0.1 x 0.8 m, light box #1c1c1c
  - drinks fridge (glass door) — left-wall, u 0 v 0.4, 0.7 x 0.7 x 2 m, branded cooler #b8322a
  - high table with stools (x2) — window, u 0.3 v 0.1, 1.5 x 0.4 x 1.1 m, laminate #1c1c1c
- people: 2-3 staff (cap, apron); 2-4 customers waiting, delivery riders with box backpacks outside
- confidence: inferred (category-typical)

### bakery — Bakery / patisserie / chocolate shop

- applies to categories: bakery, confectionery, pastry, chocolate, ice_cream, deli
- unit: 5–9 m wide x 8–15 m deep, ceiling 3.5 m
- floor: white marble or beige porcelain (#ece6da); walls: cream panelling, mirrors, timber bread racks; ceiling: white, a crystal or brass chandelier in upscale ones
- light: downlights + lit display cases, 3000 K; palette #f6f1e7 #ece6da #c9a961 #6b3e26 #e7c9c1
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - refrigerated glass display counter (cakes, syrup sweets, pies) — centre, u 0.5 v 0.4, - x 0.9 x 1.25 m, glass + white lacquer #f6f1e7
  - bread racks (timber slats) behind the counter — back-wall, u 0.5 v 0.95, - x 0.4 x 2.2 m, oak #6b3e26
  - stacked gift boxes and ribbon rolls — right-wall, u 1 v 0.6, 1.5 x 0.4 x 2 m, shelving #e7c9c1
  - till with weighing scale — centre, u 0.8 v 0.4, 0.8 x 0.6 x 1.1 m, brass #c9a961
  - ice-cream / gelato freezer (where sold) — window, u 0.3 v 0.1, 1.8 x 0.9 x 1.3 m, glass + steel #f6f1e7
- people: 2 assistants in white or pastel aprons; 2-4 customers
- confidence: inferred (category-typical)

### minimarket — Mini-market / convenience

- applies to categories: convenience, greengrocer, butcher, wine, alcohol, e-cigarette, tobacco
- unit: 5–9 m wide x 8–16 m deep, ceiling 3.2 m
- floor: light grey tile (#cfcfca); walls: white; shelving to 2.2 m; ceiling: white LED panels
- light: LED panels, 4000 K; palette #f2f2f0 #cfcfca #2a6aa5 #d13b2f
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - gondola shelving 1.8 m high (x2) — centre, u 0.5 v 0.25-0.85, - x 0.9 x 1.8 m, steel #f2f2f0 — 2 aisles of 1.1 m
  - wall shelving — left-wall, u 0 v 0.15-0.9, - x 0.5 x 2.2 m, steel #f2f2f0
  - chilled drinks wall with glass doors — back-wall, u 0.5 v 0.97, - x 0.8 x 2.1 m, refrigerated #2a6aa5
  - till counter with cigarette rack behind — right-wall, u 0.85 v 0.15, 1.6 x 0.6 x 1 m, laminate #d13b2f
- people: 1 cashier; 1-2 customers
- confidence: inferred (category-typical)

### pharmacy — Pharmacy

- applies to categories: pharmacy, chemist, medical_supply, nutrition_supplements, herbalist
- unit: 5–10 m wide x 10–18 m deep, ceiling 3.4 m
- floor: white gloss porcelain (#f0f0ee); walls: white shelving with dermo-cosmetic brands (Vichy, La Roche-Posay, Korres, Apivita); ceiling: white, LED lines
- light: bright LED lines, 4000 K; palette #ffffff #f0f0ee #2e9e5b #1c1c1c #a7c7e7
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - green LED cross sign projecting from the facade (animated) — facade, u 0.9 v 0.0, 0.7 x 0.1 x 0.7 m, LED #2e9e5b
  - wall shelving of cosmetics, lit — left-wall, u 0 v 0.1-0.75, - x 0.4 x 2.4 m, white lacquer #ffffff
  - wall shelving — right-wall, u 1 v 0.1-0.6, - x 0.4 x 2.4 m, white lacquer #ffffff
  - low promotional gondola (x2) — centre, u 0.5 v 0.35, 1.8 x 0.6 x 1.3 m, white lacquer #ffffff
  - dispensing counter with 2-3 stations and screens — back-wall, u 0.5 v 0.75, - x 0.7 x 1.05 m, white solid surface #1c1c1c
  - drawer wall of medicines behind the counter — back-wall, u 0.5 v 0.97, - x 0.6 x 2.4 m, pull-out drawers #ffffff
  - queue-ticket machine and blood-pressure chair — left-wall, u 0.1 v 0.8, 0.5 x 0.5 x 1.4 m, plastic #a7c7e7
- people: 2 pharmacists in white coats; 1-3 customers
- street side: green neon cross; glazed front with window displays of sun cream / seasonal products
- confidence: inferred (category-typical)

### cosmetics — Cosmetics / perfumery / beauty retail (Hondos-, Sephora-, MAC-type)

- applies to categories: cosmetics, perfumery, beauty_retail, candles
- unit: 6–12 m wide x 12–25 m deep, ceiling 3.6 m
- floor: white gloss tiles (#f2f2f2); walls: white back-lit brand bays 1.2 m wide; ceiling: white, dense downlights
- light: downlights + back-lit shelves, 4000 K; palette #ffffff #f2f2f2 #000000 #c8102e #d4af37
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - perimeter brand bays with testers (x8) — left-wall, u 0 v 0.1-0.9, 1.2 x 0.5 x 2.4 m, lacquer + acrylic #ffffff
  - perimeter brand bays (x8) — right-wall, u 1 v 0.1-0.9, 1.2 x 0.5 x 2.4 m, lacquer + acrylic #ffffff
  - central gondolas (skincare, haircare) (x3) — centre, u 0.5 v 0.2-0.8, 3 x 1 x 1.4 m, white lacquer #ffffff
  - make-up service chair with bulb mirror — back-wall, u 0.2 v 0.92, 0.8 x 0.8 x 1.8 m, chrome + leather #000000
  - tills, carrier bags behind — back-wall, u 0.75 v 0.9, 2.4 x 0.7 x 1 m, black gloss #000000
- people: 2-3 staff in black with make-up belts; 2-4 shoppers
- confidence: inferred (category-typical)

### salon — Hair salon / barber / nail & beauty studio

- applies to categories: hairdresser, beauty, massage, tattoo, cosmetic_clinic
- unit: 4–8 m wide x 8–16 m deep, ceiling 3.3 m
- floor: grey concrete-look tile or herringbone vinyl (#a9a6a0); walls: white, one dark or blush-pink wall; ceiling: white, round pendant lamps
- light: bright diffuse + mirror lights, 4000 K; palette #f7f4f0 #a9a6a0 #1c1c1c #e8c4c0 #c9a961
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - reception desk with product shelf — door, u 0.75 v 0.12, 1.4 x 0.6 x 1.05 m, lacquer #1c1c1c
  - styling station: round mirror + hydraulic chair (x4) — left-wall, u 0 v 0.2-0.7, 1 x 0.6 x 1.8 m, leather chair, brass mirror #1c1c1c
  - wash basins with reclining chairs (x2) — back-wall, u 0.5 v 0.95, 0.8 x 1.2 x 1 m, ceramic #1c1c1c
  - manicure table with lamp (nail studios) (x3) — right-wall, u 1 v 0.3-0.7, 1 x 0.5 x 0.75 m, white #f7f4f0
  - waiting sofa — window, u 0.25 v 0.12, 1.6 x 0.7 x 0.8 m, velvet #e8c4c0
- people: 2-3 stylists; 2 clients in chairs
- street side: narrow front, frosted lower glass, name in script letters, sometimes a barber pole
- confidence: inferred (category-typical)

### optician — Optician

- applies to categories: optician, hearing_aids, audiologist
- unit: 4–7 m wide x 8–14 m deep, ceiling 3.3 m
- floor: pale oak (#d8c4a2); walls: white back-lit frame racks; ceiling: white, LED lines
- light: bright, 4000 K; palette #ffffff #d8c4a2 #1c1c1c #3a6ea5
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - back-lit frame racks (glasses on acrylic pegs) — left-wall, u 0 v 0.1-0.8, - x 0.25 x 2.2 m, acrylic + LED #ffffff
  - back-lit frame racks — right-wall, u 1 v 0.1-0.6, - x 0.25 x 2.2 m, acrylic + LED #ffffff
  - fitting desk with mirror and 2 chairs (x2) — centre, u 0.5 v 0.45, 1.6 x 0.8 x 0.75 m, oak + black #1c1c1c
  - eye-test room door — back-wall, u 0.3 v 1.0, 0.9 x 0.1 x 2.1 m, flush door #ffffff
- people: 1 optician; 1 customer trying frames
- confidence: inferred (category-typical)

### bank — Bank branch

- applies to categories: bank, bureau_de_change, money_transfer, post_office, insurance, energy_supplier, telecommunication, mobile_phone
- unit: 8–16 m wide x 12–22 m deep, ceiling 3.5 m
- floor: grey granite at the entrance, carpet tiles inside (#9a9a96); walls: white with brand-colour panels and logo wall; ceiling: white acoustic tiles, LED panels
- light: LED panels, 4000 K; palette #f4f4f2 #9a9a96 #004b87 #d32f2f #1c1c1c
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - 24 h ATM lobby with 2 ATMs (glass vestibule) — window, u 0.2 v 0.08, 2.5 x 1.5 x 2.4 m, glass + steel #004b87
  - queue-ticket kiosk — door, u 0.6 v 0.15, 0.4 x 0.3 x 1.4 m, steel #004b87
  - teller desks behind low glass screens (x3) — back-wall, u 0.5 v 0.8, 1.6 x 0.8 x 1.1 m, laminate #f4f4f2
  - advisor desk with 2 chairs (x2) — left-wall, u 0.15 v 0.5, 1.4 x 0.7 x 0.75 m, laminate #f4f4f2
  - waiting chairs in a row, queue display screen above — right-wall, u 1 v 0.4, 3 x 0.6 x 0.8 m, upholstered #1c1c1c
- people: 3 staff in shirts; 2-5 customers holding numbered tickets
- street side: brand-colour fascia, 24 h ATM in the facade, security door with interlock
- confidence: inferred (category-typical)

### electronics — Electronics / appliance store (Kotsovolos-, Public-, Plaisio-type) - PHOTO-based (Kotsovolos Kyriazi 36, 2025)

- applies to categories: electronics, computer, electronics_repair, appliance, hifi, video_games, department_store
- unit: 10–20 m wide x 15–30 m deep, ceiling 4.0 m; 2-3 levels linked by a stair and a glass-railed mezzanine
- floor: light grey porcelain 60x60 (#d7d7d5); walls: white; category signs in thin red/black letters ("Telecom", "Σπίτι & Τεχνολογία") on the mezzanine edge; ceiling: white, black track spots in rows
- light: track spots + LED in wall bays, 4000 K; palette #ffffff #d7d7d5 #e3001b #1c1c1c #c8a882
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - entrance vestibule lined with two tall LED screens showing ads — door, u 0.5 v 0.05, 3 x 2.5 x 3 m, LED screens #1a5fd1
  - white laptop demo tables with oak gantry carrying brand name plates (Lenovo, HP, Asus, Microsoft) (x4) — centre, u 0.5 v 0.25-0.6, 3 x 1.2 x 0.9 m, white lacquer + oak #ffffff
  - phone accessory wall (hanging packs) under a "Telecom" sign — left-wall, u 0 v 0.2-0.7, - x 0.4 x 2.4 m, slatwall #ffffff
  - TV wall — back-wall, u 0.5 v 0.97, - x 0.3 x 2.6 m, screens #1c1c1c
  - mezzanine with glass balustrade — back-wall, u 0.5 v 0.6-1.0, - x - x 3.5 m, glass rail #ffffff
  - service desk (K-Service / pick-up) — right-wall, u 0.85 v 0.75, 3 x 0.7 x 1.05 m, white + red #e3001b
- people: 3-4 staff in red shirts; 4-8 shoppers
- street side: white-clad facade, giant red 3D "K" letter + red box with "ΚΩΤΣΟΒΟΛΟΣ" (see shops.json Kotsovolos)
- confidence: photo (Kotsovolos Kyriazi 36 only)

### office — Office / estate agent / travel agent / practice

- applies to categories: estate_agent, travel_agent, architect, lawyer, accountant, consulting, doctors, dentist, clinic, advertising_agency, government, private, research, company, office
- unit: 4–8 m wide x 8–14 m deep, ceiling 3.2 m
- floor: light vinyl plank or grey tile (#cfc6b8); walls: white; window posters with property listings (estate agents); ceiling: white, LED panels
- light: LED panels, 4000 K; palette #f4f4f2 #cfc6b8 #3a4a5a #9aa0a6
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - window listing boards (A4 photos in acrylic frames) — window, u 0.5 v 0.03, - x 0.05 x 1.6 m, acrylic #ffffff
  - reception desk — door, u 0.6 v 0.25, 1.6 x 0.7 x 1.05 m, laminate #3a4a5a
  - work desks with monitors (x3) — centre, u 0.5 v 0.4-0.85, 1.4 x 0.7 x 0.75 m, white desk #f4f4f2
  - waiting chairs — left-wall, u 0 v 0.3, 1.5 x 0.6 x 0.8 m, upholstered #9aa0a6
- people: 1-3 staff at desks
- confidence: inferred (category-typical)

### kiosk — Periptero (street kiosk)

- applies to categories: kiosk, newsagent, lottery, bookmaker, ticket
- unit: 1.8–2.4 m wide x 1.8–2.4 m deep, ceiling 2.4 m
- floor: n/a (served from outside) (#8f8f8a); walls: the outside IS the shop: every face hung with goods; ceiling: projecting flat roof 0.6 m overhang with fluorescent tube
- light: fluorescent tube under the overhang, 5000 K; palette #e8e4d8 #2a6aa5 #d13b2f #f2c14e #1c1c1c
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - kiosk box with serving hatch on the pavement side — centre, u 0.5 v 0.5, 2 x 2 x 2.4 m, painted steel #e8e4d8
  - magazine and newspaper racks on the side faces (x2) — left-wall, u 0 v 0.5, 1.8 x 0.2 x 1.6 m, wire racks #ffffff
  - drinks fridges (Coca-Cola red, Pepsi/Lacta) standing on the pavement (x2) — right-wall, u 1 v 0.5, 0.7 x 0.7 x 1.9 m, branded cooler #d13b2f
  - ice-cream chest freezer (Algida / Kri Kri) — front, u 0.3 v -0.2, 1 x 0.6 x 0.9 m, branded freezer #2a6aa5
  - crisps and sweets on clip strips around the hatch (x4) — front, u 0.5 v 0.0, 1.2 x 0.05 x 1 m, clip strips #f2c14e
- people: 1 kioskas inside the hatch; 0-1 customer
- confidence: inferred (category-typical)

### home — Gallery / bookshop / gift & home shop

- applies to categories: gallery, books, gift, interior_decoration, houseware, bed, art, arts_centre, museum, florist, musical_instrument, sewing, toys, pet, doityourself, bathroom_furnishing, antiques, stationery, photo, frame, kitchen, furniture, lighting, carpet, curtain, fabric, cannabis
- unit: 5–10 m wide x 10–18 m deep, ceiling 3.6 m
- floor: polished concrete or oak (#bdb7ad); walls: white; ceiling: white, track lights
- light: track spots, 3000 K; palette #ffffff #bdb7ad #2b2b2b #a67c52
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - styled display tables (x3) — centre, u 0.5 v 0.2-0.7, 1.6 x 0.9 x 0.8 m, timber #a67c52
  - floor-to-ceiling shelving — left-wall, u 0 v 0.1-0.9, - x 0.4 x 2.6 m, timber/white #ffffff
  - till with wrapping paper rolls — right-wall, u 0.85 v 0.2, 1.4 x 0.6 x 1 m, timber #2b2b2b
- people: 1 assistant; 1-2 browsers
- confidence: inferred (category-typical)

### hotel — Hotel lobby

- applies to categories: hotel, guest_house, apartment
- unit: 10–20 m wide x 10–20 m deep, ceiling 4.0 m
- floor: polished marble (#efe7da); walls: panelled, warm white, artworks; ceiling: coffered or plaster with a chandelier
- light: chandelier + table lamps, 2700 K; palette #efe7da #3a2e27 #c9a961 #5b6b5a
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - reception desk — back-wall, u 0.6 v 0.6, 3 x 0.8 x 1.1 m, walnut + marble #3a2e27
  - seating group: sofa, 2 armchairs, coffee table — left-wall, u 0.25 v 0.45, 3 x 2 x 0.8 m, velvet #5b6b5a
  - lift doors (x2) — back-wall, u 0.15 v 1.0, 1 x 0.2 x 2.2 m, brass #c9a961
- people: 1-2 receptionists; porter; 1-2 guests with luggage
- confidence: inferred (category-typical)

### cinema_leisure — Cinema / bowling / fitness / dance

- applies to categories: cinema, bowling_alley, fitness_centre, sports_hall, dance, theatre, childcare
- unit: 8–20 m wide x 12–30 m deep, ceiling 4.0 m
- floor: patterned carpet / rubber (#3a2a2a); walls: dark, posters in light boxes; ceiling: black
- light: dim + lit posters, 3000 K; palette #2a1416 #7a1f1f #c9a961 #111111
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - ticket + snack counter — back-wall, u 0.5 v 0.6, 4 x 0.8 x 1.1 m, laminate + steel #7a1f1f
  - poster light boxes (x4) — left-wall, u 0 v 0.2-0.8, 1 x 0.1 x 1.5 m, light box #111111
- people: 2 staff; 2-6 visitors
- confidence: inferred (category-typical)

### fuel — Fuel station shop

- applies to categories: fuel, car_wash, car_repair, car, bicycle_rental, bicycle, motorcycle, locksmith, dry_cleaning, laundry, tailor, copyshop, alternative, yes
- unit: 4–10 m wide x 6–12 m deep, ceiling 3.2 m
- floor: grey tile (#a0a0a0); walls: white; ceiling: white panels
- light: LED panels, 4500 K; palette #f2f2f2 #a0a0a0 #1c1c1c #2a6aa5
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - service counter — centre, u 0.5 v 0.5, - x 0.6 x 1.05 m, laminate #1c1c1c
  - wall shelving / rail of bagged garments (dry cleaners) — back-wall, u 0.5 v 0.95, - x 0.5 x 2.2 m, steel #f2f2f2
- people: 1 attendant
- confidence: inferred (category-typical)

### arcade — Shopping arcade / stoa (Kifisia has several: Mela arcade Kifisias 238, Shoppingland Kolokotroni 1, Kassaveti 19 courtyard)

- applies to categories: mall
- unit: 3.5–6 m wide x 20–50 m deep, ceiling 4.0 m; a covered passage through the block, often bending, with a light well or open courtyard
- floor: polished cream or grey marble slabs, sometimes with a dark border band (#e6dfd2); walls: shopfronts on both sides: full glazing in black / bronze frames, each unit 3-6 m wide; ceiling: white plaster with recessed downlights; glazed skylight over the courtyard
- light: downlights + shop window light, 3000 K; palette #e6dfd2 #f4f1ea #1a1a1a #c9a961 #5f6b5a
- objects (u = 0 left wall … 1 right wall looking in from the door; v = 0 street wall … 1 back wall; size = w x d x h):
  - arcade entrance portal with the arcade name in brass letters — door, u 0.5 v 0.0, 3.5 x 0.3 x 3.5 m, stone / brass #c9a961
  - shopfront units (glass, 3-6 m) on both sides (x5) — left-wall, u 0 v 0.05-0.95, 4 x 0.2 x 3.2 m, glass + metal frame #1a1a1a
  - shopfront units on the right side (x5) — right-wall, u 1 v 0.05-0.95, 4 x 0.2 x 3.2 m, glass + metal frame #1a1a1a
  - planters with olive or ficus trees in the courtyard (x2) — centre, u 0.5 v 0.6, 0.8 x 0.8 x 2.5 m, stone planter #5f6b5a
  - café tables in the courtyard (x4) — centre, u 0.5 v 0.7, 0.7 x 0.7 x 0.75 m, metal + marble #f4f1ea
  - building directory board — left-wall, u 0 v 0.08, 0.8 x 0.05 x 1.6 m, brass/acrylic #1a1a1a
- people: shoppers walking through; 2-4 café customers in the court
- confidence: inferred (category-typical)

<!-- END research-shops generated 7-8 -->
