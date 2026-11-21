
## OWNER DIRECTIVE 2026-11-21 (overrides earlier priorities) — see OWNER_BRIEF items 12 and 13
- buildings: architecture is now the #1 priority of the whole project. Every building must look like the real one: real footprint, levels, roof, facade type/colour/material, balconies, shopfronts, setbacks. Consume gk3/data/buildings_spec.json from research-arch as soon as it exists (fall back to OSM tags + style classes meanwhile). Integrate the start junction first, then walk outward in the order of OWNER_BRIEF item 12. Screenshot each block from street level and compare with ref/ photos.
- chars (with game for the talk UI): add 3 "ISA IB Student" NPCs exactly as OWNER_BRIEF item 13 says — floating label above the head, IB-only dialogue lines. Integrate it in your next integration, it is small and the owner wants to see it.
- data: give research-arch and buildings every OSM building tag (levels, height, roof:shape, roof:colour, building:colour, building:material, start_date, name) on each building record.

## OWNER-LEVEL CORRECTIONS 2026-11-21 (from research-shops run 4, see docs/research/SHOPS.md + GAPS_SHOPS.md)
- data + buildings: NO game module loads gk3/data/shops.json yet — wire it in now (match by osm id / key / building.mapBuilding). It holds per-building facade specs for the named places.
- buildings: the Starbucks sign is on map building b425 — WRONG. b425 is the 1910 stone villa "Oikia Kotsika" = Ralph Lauren (stone #c4a68a, red tile roof with Swiss-cottage bargeboards, marble steps, bay window, navy awnings). Starbucks is b426, the 2-storey timber-and-brick former stable just west of it in the Kassaveti 19 courtyard. b423 is a modern brick shopping arcade.
- data/streets/chars: Sephora is at Levidou 8, EAST side of Levidou (door ≈ x 141.5, z 2), not the west side (x 122.7, z −7.2). Move the place key, the shopfront and the homeless man's spot accordingly.
- buildings/interiors: KFC is inside the Mela arcade (former 1897 Grand Hotel de Kifissia), Kifisias Ave 238. AB is the corner building Levidou 2 / Kassaveti 8 (b30). PAUL is Levidou 4. Interior plans: docs/research/INTERIORS.md sections 2–6.
- research-shops (next run): help research-arch — per-building facade specs for every building on Kassaveti, Levidou, Kyriazi, Kifisias Ave and around Platanos (photos from Commons, retry 429 with long backoff); Hondos Center + generic shop interior templates.

## 2026-11-21 LANDMARKS (OWNER_BRIEF item 14)
- ALL: new main files js/89_landmarks.js + js/89a..f_lm_*.js and their <script> tags in index.html (before 90_main.js). game: when you next integrate index.html, KEEP these tags (merge by hand). buildings: buildings handed to LM (by `at` points) are removed from MAP.buildings only during buildBuildings(); do not rebuild them elsewhere. data: if you change the MAP.buildings record format (coords at index 10), update 89_landmarks.js `dec()` too and tell lm-* bots.

## OWNER DIRECTIVE 2026-11-21 12:50 (OWNER_BRIEF item 15) — next integrations must show these
- cars: DRIVING MUCH SIMPLER. Arcade model: auto-throttle option, one-finger steer on phone (drag left/right on the left half), big brake button, strong
  auto-straighten and traction assist, no spin-outs below 60 km/h, auto-reverse when holding brake while stopped, soft collision (slide along walls, never
  stuck; auto-unstuck after 2 s), camera that looks ahead and never clips. Enter car = one tap on the "Car" button near any car. Test it on a phone
  viewport 390x844 in the harness. Ferrari + exotics drivable.
- mats: GRAPHICS OVERHAUL — must stop looking like an old game. ACES tone mapping + correct sRGB, PMREM environment lighting from the sky, soft
  shadow maps with cascades/stable fitting around the camera, SSAO or baked contact AO under buildings/props, subtle bloom, distance haze/aerial
  perspective, high-res PBR facades (normal + roughness), wet/dirty variation, anti-aliasing (FXAA/SMAA), better trees and grass; quality presets
  with "High" as default on desktop and an automatic phone preset that stays at 30+ fps. Show before/after screenshots in docs/MATERIALS.md.
- interiors + game: EVERY shop door is enterable (generic interior per category for all shops, detailed for the special ones), with a clear
  "Enter <shop name>" prompt and ordering at the counter where it makes sense. Test entering at least 10 different shops.
- weapons: start now (docs/tasks/weapons.md). Paintball markers / toy blasters only, per the standing Weapons rule. If game hooks
  (registerAction/setAimMode) are missing, add a minimal hook in your own file 81_weapons.js and tell game in ORDERS_DONE.md.

## OWNER DIRECTIVE 2026-11-21 13:00 (OWNER_BRIEF item 16)
- weapons: realistic-looking guns now (see docs/tasks/weapons.md owner update) — replaces paintball. chars: provide pistol/rifle hold, aim, fire, reload poses.
- data + research-census (+ research-shops): SHOP PLACEMENT AUDIT — the owner says shop positions are "a mess". Produce docs/research/PLACEMENT_AUDIT.md:
  (1) for Kassaveti, Levidou, Kyriazi, Kolokotroni, Kifisias Ave, Platanos and Argyropoulou list every shop sign in the GAME in street order (side, house
  number, x/z) next to the REAL order from OSM-surveyed nodes and verified addresses; (2) a top-down overlay image game-signs vs OSM shop nodes with lines
  for every delta > 4 m; (3) fix the pipeline: OSM-surveyed position wins; Overture/census entries are built only if their address is verified and does
  not collide with an OSM shop; duplicates (same brand within 60 m) are merged; closed shops dropped; a shop never on the wrong side of the street or on
  the wrong building. Re-run check_map.py + verify_placement.js, integrate, and re-shoot the street views. buildings: make sure 31_shopfronts.js draws each
  bay exactly at its (edge, t, width) — report any sign the renderer moves.
- mats + streets + lm-park: realism push for parks (grass with variation, real tree species, gravel paths, benches/lamps of the real style).

## OWNER DIRECTIVE 2026-11-21 13:05 — verify shops ONE BY ONE (data, research-census, research-shops)
Owner: "lots and lots of shops — go one by one and make sure everything is exactly where it is." Extend PLACEMENT_AUDIT.md into a per-shop
verification table for every shop in the core streets (Kassaveti, Levidou, Kyriazi, Kolokotroni, Argyropoulou, Kifisias Ave around Platanos,
Platanos square, Othonos, Deligianni near the centre): name | street + number | source of the address (shop's own site / store locator, vrisko.gr,
Foursquare/Overture, OSM survey) | game x,z | real x,z | delta m | status (verified / moved / removed / unverified). Every shop must end up either
verified with a cited source or explicitly marked unverified. No Google Maps / Street View data (terms of use) — use the sources above.

## OWNER DIRECTIVE 2026-11-21 13:10 (OWNER_BRIEF item 17) — CENTRAL AREA FIRST
- interiors: FIRST rebuild the Mythos Plus interior strictly from docs/research/img/shops/mythos_01..10 (entrance arch, counter, neon "garden in",
  garden hall with bamboo, banquettes, table tiles). Side-by-side photo|game images in docs/research/img/lm/mythos_interior/. Owner says the current one is wrong.
- lm-kassaveti (NEW bot): the Kassaveti shop block from the spawn junction toward Platanos — every shopfront in real order, width, colours, awnings, building.
- lm-junction: coordinate with lm-kassaveti (you: the junction corners incl. AB/PAUL/Mythos building; they: the rest of the Kassaveti block). Mythos facade from mythos_01/02/04.
- lm-starbucks + lm-ralphlauren: use aerial/drone photos (ref/r09-r11, Commons, any CC aerials) for the layout of the two buildings, the courtyard and the
  PASSAGE between them; agree one shared ground plan in docs/research/lm/kassaveti19_site.md.
- lm-park: Alsos Kifisias first, then the Kefalari square grove (ref/streets r04), then Platanos square. They must look much more like the real parks.
- buildings: vary every non-landmark building by its real look (buildings_spec.json style classes); highest detail in the central area
  (junction → Kassaveti → Platanos → station → Kefalari); lower detail elsewhere.
- cars: smooth driving — input smoothing, gentle steering curve, speed-sensitive steering, smooth camera follow with lag + look-ahead, no jitter.
- game + chars: smooth player movement — acceleration/deceleration curves, turn-in-place, blended start/stop animations, smooth camera, and smooth
  fades/transitions for entering/exiting cars and shops.

## 2026-11-21 13:30 — research-arch + data: real building heights
Try the Copernicus Land Monitoring Service "Urban Atlas Building Height 2012" (10 m raster, covers the Athens functional urban area, free/open
Copernicus licence) and Copernicus DEM GLO-30 / any open nDSM for Attica: sample per-building height into buildings_spec.json (heightM, levels =
round((h-gfH)/floorH)+1) with source "copernicus-ua-bh". Record licence + attribution in docs/CREDITS.md. If the download needs a login, say so in
PROGRESS.md and continue with other sources.

## 2026-11-21 (from data run, MUST DO) — lm-junction, lm-kassaveti, lm-kfc, lm-starbucks, lm-ralphlauren
23 real shops sit on buildings you took over (b292 b293 b294 b295 b305 b388 b425 b426 b434 b435 b30) and are NOT drawn by 30_buildings.js any more:
Nak, Everest, Desigual, Goody's, Γερμανός, Hachiko, La Pasteria, Imaginarium and others. Your module MUST draw every MAP.pois shop bay whose b is one of
your buildings (use (b[11]&&b[11].shops)||b[8] bays: edge, t, sign text, bg, fg, kind, poiIndex, bayW) — exact position and width, real name. Check with
tools/data/compare_runtime.py that 0 bays on your buildings are missing.
