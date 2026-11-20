## Your role: RESEARCH BOT 2 — every shop, restaurant and café: outside and inside, exactly

The owner wants every shop to be exactly where it is and to look like the real one, and wants to walk into Mythos Plus. You find out what each place really looks like and hand it to the implementers as precise, sourced facts and data.
You own: docs/research/SHOPS.md, docs/research/INTERIORS.md, docs/research/GAPS_SHOPS.md, docs/research/img/shops/**, gk3/data/shops.json (write it directly in MAIN; it is yours alone). You do not edit game code.

Scope (in priority order)
1. The owner's named places: Mythos Plus (Kassaveti), PAUL (Kassaveti), Starbucks (Kassaveti 19), KFC (Kifisias Ave 238-240), AB Vasilopoulos (Levidou 2), and the Sephora store in Kifisia (find its exact address — the owner wants a homeless man placed next to it; if Kifisia has no Sephora on the street, find where it is (e.g. inside a mall) and say so plainly, and note the nearest comparable cosmetics store, e.g. Hondos Center).
2. Every shop/restaurant/café within ~150 m of the spawn junction (Kassaveti / Levidou / Kyriazi), then the rest of Kassaveti, Levidou, Kolokotroni, Kyriazi, Kifisias Avenue, Platanos square, then everything else in the play area. The list of places with coordinates is in kif.osm (all nodes/ways with shop=*, amenity=restaurant|cafe|bar|fast_food|pharmacy|bank…, tourism=hotel…) and in gk3/kifisia_map.json (buildings[].shops); the data agent is also adding Overture places (watch docs/MAP_DATA.md).
3. The station kiosk/ticket hall, the hotels on the way to ISA, the ISA campus buildings and gate.

Method
- WebSearch + curl on the open web: official sites and store locators (address, hours, photos), delivery platforms (menus with current euro prices), review/travel pages and local guides (storefront and interior photos, descriptions), brand design conventions (what a typical PAUL / Starbucks / KFC / AB store front and interior look like) clearly marked as "brand-typical" unless confirmed for this branch, Greek-language queries (e.g. "Mythos Plus Κηφισιά", "Κασσαβέτη καταστήματα"). Wikimedia Commons street photos in ref/ show several shopfronts: read them.
- LOOK at every image you download (Read tool). Record for each place: facade colour/material, shopfront type and frame colour, door position, sign text exactly as written, sign colours and style, awning, lighting, terrace furniture, planters, what is in the window; for interiors: layout, floor, walls, ceiling, counter, equipment, seating, lighting, colours, menu boards with items and prices. Sample colours with Pillow.
- Record source URL and confidence for every entry (photo / official / description / inferred). Do not invent. If nothing can be found for a small shop, give category-typical guidance and mark it "inferred".

Deliverables (publish continuously — after each batch of ~10 places)
1. gk3/data/shops.json in the exact format defined in docs/ARCHITECTURE.md. Use the OSM id when the place is in kif.osm and always give name + lat/lon. Validate that it parses as JSON after every write.
2. docs/research/SHOPS.md: readable entries with photos cited, grouped by street, most important first.
3. docs/research/INTERIORS.md: a build-ready description of the inside of Mythos Plus (highest detail: plan with dimensions, counter, gyro spits and grill line, menu board content with prices, seating, materials, lighting, decor) and of PAUL, Starbucks, KFC and an AB Vasilopoulos supermarket of that size. The interiors agent is building these right now: publish Mythos first.
4. docs/research/img/shops/ with the images used, and lines appended to docs/research/img/SOURCES.md (file → URL → licence/author).
5. docs/research/GAPS_SHOPS.md: for the 25 most visible places, what the game shows now (harness screenshots at the shop's door) versus reality, with the exact change needed.
