## Your workstream: shops you can really walk into — starting with Mythos Plus

The owner: "you can really enter Mythos". Build walk-in interiors for the five special shops: Mythos Plus (the showpiece: a Greek gyro/souvlaki grill), PAUL (French bakery-café), Starbucks, KFC and the AB Vasilopoulos supermarket.

You own: gk3/js/35_interiors.js (new; add it to the script list in index.html after 30_buildings.js with a one-line edit in MAIN), gk3/interiors/** if you need data/images, docs/INTERIORS.md. Add one clearly commented line to boot() in MAIN's js/90_main.js to call your builder (after buildBuildings(), before finalize()).

### Design constraints (decided; follow them)
- An interior is a self-contained "cell": a room built with the same GB/chunk system and materials as the world, placed far outside the map at its own x,z (e.g. x ≥ 3000) so the 2D collision grid (addSeg/collide ignore height) and chunk culling work unchanged and the outside world is not rendered while you are inside. Keep the same compass orientation as the real shopfront so the street door is where it should be.
- Entering/leaving: at the real shop door (MAP.special[k].door, facing normal nx,nz) register an interaction through the shared hook INTER.push({x,z,r,label,fn,when}) (see ARCHITECTURE.md): "Enter Mythos Plus" → short fade (the #fade element) → teleport the player to the cell's entrance, set player.interior = k; the inside door does the reverse and restores the player on the pavement facing the street. Expose: INTERIORS (registry by key with entrance, exit, counter point, bounds), enterInterior(k), exitInterior(), and make the existing shop menu open at the COUNTER (call openShop(k) from a counter interaction) instead of at the street door when the interior exists. The gameplay agent owns the shop menu, HUD, camera and missions and will feature-detect these names — keep them exactly.
- While inside: time keeps running; give the room its own lighting that does not depend on the sun (baked vertex colours / emissive "glow" surfaces / at most 2-3 point lights), and make sure the sun's shadow and the sky do not leak in (ceiling, closed shell, daylight panels at the windows showing a blurred street).
- Staff and customers are people created through the characters API (new Ped(look, true), .play(action), feature-detect richer actions such as sitting/serving once docs/CHARACTERS.md exists): a cook at the gyro spit and a cashier in Mythos, baristas, a supermarket cashier, a few seated customers. Keep the total small (≤ 6 per interior) and only alive while the player is inside.
- Budget per interior: ≤ 60k triangles, ≤ 25 draw calls, built once at boot into chunks (cheap) or lazily on first entry.

### What each interior must contain (model real objects with real dimensions; no empty boxes)
- Mythos Plus: tiled floor, a long service counter with glass sneeze guard and till, the grill wall with two vertical gyro spits (rotating, glowing elements), a flat-top grill and fryer, a pita/toppings station, an illuminated menu board above the counter with real items and euro prices (pita gyro pork/chicken, souvlaki skewers, portions, fries, salads, drinks), a drinks fridge, tables with chairs, napkin holders, wall photos/decor, a door and windows to the street, warm lighting. This is where the Gyro Run mission ends, so the order point must be obvious.
- PAUL: dark wood and black fronts, a pastry display case with croissants/baguettes/tarts, coffee machine, bread racks, small round tables.
- Starbucks: bar with espresso machines, pastry case, menu boards, hand-off counter, communal table, armchairs, shelves with merchandise (plain shapes and text, no logo artwork).
- KFC: order counter with menu screens, kitchen pass, booths and tables, self-order kiosks, red/white scheme.
- AB Vasilopoulos: a compact supermarket you can walk through: entrance gates, 4-6 aisles of shelves with products (instanced boxes/bottles with varied labels), produce section, fridges along a wall, checkout counters with a cashier, baskets/trolleys.
- For all: correct human scale (door 2.1 m, counter 0.9-1.1 m, table 0.75 m, chair seat 0.45 m, ceiling 3-3.5 m), collision for furniture so the player walks around it, readable text on boards, an exit sign over the street door.

### Sources
docs/STYLE_BIBLE.md (another agent is writing descriptions of these interiors; use it when it appears), your general knowledge of such shops, and the existing texture tiles (T.<name>, see 10_atlas.js; the materials agent is upgrading them to real photo textures and adds defTile() for custom tiles — feature-detect it; until then register painted tiles the way 10_atlas.js does, in the least invasive way, and note what you did). Menu boards and labels can be painted with canvas into tiles or use the sign atlas API (newSlot/signAt in 30_buildings.js).

### How to verify (do all of it)
- Walk the player in through each door by script (teleport to the door point, call the interaction, then move with input.jx/jy), take screenshots from the chase camera inside each interior from at least four positions plus free-camera overview shots, at midday and at night, and look at them critically: scale, lighting, clutter, readability, z-fighting, holes.
- Buy something at each counter; run the Gyro Run mission (startMission('gyro')) and finish it inside Mythos; leave each interior and confirm the player stands on the pavement facing the street with the outside world visible again; zero console errors.
- Report triangles/draw calls inside each interior and the cost added to boot time.
- docs/INTERIORS.md: the registry format, how to add another interior, the functions and flags other modules use.

## OWNER UPDATE (newest; do this right after Mythos Plus works)
The owner now wants EVERY shop to be enterable "for ordering", not only the five named ones.
- Build a generic interior generator: templates by category (café, restaurant/taverna, fast food, bakery, clothes, shoes, jewellery, cosmetics, optician, pharmacy, bank,
  mini-market, bookshop, hair salon, electronics/telecom, gallery, hotel lobby, generic shop), parameterised by the real frontage width and depth from the map, with the shop's real
  name on a sign inside, colours/details from gk3/data/shops.json when present, staff at a counter, and a category-appropriate list of things to order or buy with plausible euro prices.
- Built lazily when the player enters (one generic cell alive at a time, rebuilt per shop, deterministic from the shop's id), so it costs nothing at boot.
- Every shop door in the map gets an "Enter <name>" interaction (today: MAP.buildings[].shops; later the richer POI list from the data agent and gk3/data/census.json — feature-detect).
- Expose for the game agent: INTERIORS.generic(shop) / enterInterior(key) for any shop, INTERIORS[key].menu = {title, items:[[name, priceEUR]]}; ordering goes through the shop UI the game agent owns.
The five specials and the cosmetics store (Sephora/Hondos) keep hand-made interiors.
