# Interiors — walk-in shops (team:interiors)

Owner: agent `interiors`. Code: `gk3/js/35_interiors.js` (BUILT file — authored in `work/interiors/src/*.js`, concatenated by `work/interiors/tools/build.sh`; never edit the built file by hand).
Data: `gk3/interiors/c0..c3.jpg` (colour sheets, 4×4 cells of 512²), `n0..n3.jpg` (normal xy + gloss), `manifest.json` (cell → material name, metres per repeat, gloss). Built by `work/interiors/tools/build_tex.py` from CC0 Poly Haven photos (see CREDITS.md).
Research it follows: `docs/research/INTERIORS.md` (Mythos §1, Starbucks §2, PAUL §3, KFC §4, AB §5, Sephora §6) and `gk3/data/shops.json` (`interior`, `items`).

## What the player gets
- **Every shop door in the map is enterable**: one door per `MAP.pois[]` entry with `bay` = shop / building / standalone (map v3; ~700 doors), plus the six specials. Older maps fall back to `MAP.buildings[].shops` + `data/shops.json` + `data/census.json` (tiers A/B).
  Walk up to a shopfront → the USE button says **"Enter <real name>"** → short fade → you stand inside the door, facing into the shop.
- Inside: a furnished room at real scale (door 2.3 m, counters 0.9–1.1 m, tables 0.75 m, chair seats 0.45 m, ceilings 3–4.2 m), staff behind the counter, 1–3 customers, own lighting (baked light pools + ≤3 point lights; the sun/sky are hidden), the street visible through the windows (daylight / night), collision for furniture and walls, an **EXIT · ΕΞΟΔΟΣ** sign over the door.
- **Order at the counter** (the gameplay module's shop sheet, `openShop(key)` with `INTERIORS[key].menu`) — then "Leave <name>" at the door puts you back on the pavement facing the street.
- Hand-made: **Mythos Plus** (grill hall + "garden in" courtyard hall, real menu boards and prices), **Starbucks** (Kassaveti 19 pavilion), **PAUL** (Levidou 4), **KFC** (Mela arcade), **AB Vasilopoulos** (Levidou 2), **SEPHORA** (Levidou 8).
  Everything else: 21 category templates (café, bar, restaurant, fast food, bakery, clothes, shoes, jewellery, cosmetics, salon, optician, pharmacy, bank, office, mini-market, books, electronics, gallery, hotel, home/gifts, generic),
  sized from the real frontage width (`poi.w`) and the depth of the footprint behind the door, deterministic per shop, coloured from `shops.json` `interior.palette/floor/walls` when the shop has them.

## Public API (globals; all other modules feature-detect them)
| name | meaning |
|---|---|
| `INTERIORS[key]` | registry entry for every enterable shop. Specials use their `MAP.special` key (`mythos paul starbucks kfc super sephora`), other shops `g<hash>`. |
| `INTERIORS[key].name / .sub / .tpl / .category` | real name, address line, template, category |
| `INTERIORS[key].door` | `{x,z,nx,nz}` facade point of the street door (world m) and outward normal |
| `INTERIORS[key].exit` | `{x,z}` where the player is put back outside |
| `INTERIORS[key].counter` | `{x,z}` world position of the order point **while that interior is the live one** (else `null`) |
| `INTERIORS[key].menu` | `{title, sub, items:[[name, priceEUR, tag?]]}` (Mythos items carry `'gyro'` so the Gyro Run completes) |
| `INTERIORS[key].bounds` | local room box `{x0,x1,z0,z1,h}` |
| `INTERIORS.generic(shop)` | interior of any shop record `{name,x,z,category}` or `{door:{x,z}}` (nearest door within 6 m, or a new entry snapped to the nearest facade) |
| `enterInterior(key, {instant})` | async; fades, builds the room, moves the player in. Returns `true` on success. |
| `exitInterior(instant)` | async; disposes the room, puts the player on the pavement facing the street. `exitInterior(true)` is synchronous enough for respawn/mission resets. |
| `buildInteriors()` | called once from `boot()` after `buildBuildings()`; loads `data/shops.json` + `data/census.json`, registers the doors, installs the hooks. Costs ~0.1–0.3 s of CPU, no geometry. |
| `player.interior` | key of the interior the player is in, or `null` |
| `gameEvent('interior', {key, enter})` | fired on enter / leave when `gameEvent` exists |
| `INTERIORS._` | debug: `{IN, DOORS, stats, L2W, W2L, enter, exit, boot}`; `INTERIORS._.stats[key]` = `{tris, calls, build, layers, texMB, people}` of the last build |

Hooks installed at boot (wrapping, never editing other files): `updateCamera` (keeps the camera inside the room and under the ceiling, ticks the room: gyro spits, staff look-at, daylight in the windows),
`updatePeople` / `updateTraffic` (skipped while inside), `openShop(k)` for a special while outdoors → enters instead, `respawn` → leaves first. One `INTER` entry follows the nearest shop door (≤ 1.9 m).

## How it works
- One interior is alive at a time. It is built when the player walks in (during the fade) and disposed when they leave — nothing is built at boot.
- The cell is placed at world (3400, terr, 3400), far outside the map (chunks there are empty, terr() is constant), rotated so it has the **same compass orientation as the real shopfront**.
  Local axes: origin = centre of the street door on the inner face of the front wall, +z = out to the street, −z = into the shop, +x = right when entering.
- Geometry: own builder (`IB`) → 3 meshes: lit (Phong patched to sample a WebGL2 texture array of photo materials + painted layers, normal/gloss maps), boards (unlit canvas atlas: menus, signs, screens, pictures, street view), glass. Collision segments are added to the world grid on build and removed on exit.
- Lighting: per-vertex bake (ambient × cheap AO + warm light pools at every lamp), ambient + hemisphere + ≤3 point lights in the cell; `SKY.indoorExposure` per interior.
- People: `new Ped(spec, true)` staff (tinted uniforms; cashiers turn their head to the player) and customers (`randomLook()`, seated with `sit_table`). ≤ 6 per room, disposed on exit.

## Cost (SwiftShader measurements, see work/interiors/PROGRESS.md for the latest)
Mythos: ~42k triangles, 5 draw calls + 6 people, texture array ~11 MB, build ~1.5–3 s (CPU renderer; real phones are much faster). Generic shops: 6–15k triangles, 3 calls, 5–8 MB. Boot: door registration only.

## How to add / change an interior
- New hand-made room: in `work/interiors/src/85_brands.js` add `TPL.myRoom={plan:()=>({W,D,h,x0,x1,door:[dx,dw],counter:[x,z],side:0,bounds}), build(def,r){ room(...); frontage(...); ... }}` and point a `SPECIALS` entry (80_specials.js) or a category at it.
  Kit (30_kit.js): `room, frontage, streetView, counter, displayCase, shelving (goods / flat), fridge, table, chair, banquette, armchair, pendant, downlight, strip, plant, till, coffeeMachine, menuBoard, menuSheet, textPanel, picture, mirror, rug, clothesRail, displayTable, spineWall, pool, plight, person, seg, colBox`.
- Category → template: `CAT2TPL` (50_doors.js). Price lists per template: `MENUS`. Styles: `STY` (60_generic.js).
- Rebuild: `work/interiors/tools/build.sh`; test: `node work/interiors/tools/walk.js <prefix> <plan.json>`; integrate: `tools/integrate.sh interiors js/35_interiors.js interiors`.

## Known gaps (honest)
- Only Mythos follows real photos of its interior. Starbucks, PAUL, KFC, AB and Sephora are brand-TYPICAL layouts sized to the research plans (no photos of those interiors exist in the research). Starbucks' first floor and balcony are not built (the stair ends in the ceiling).
- Generic shops are category templates, not the real interior of each shop; names, frontage width, depth, colours (when shops.json has them) and price lists by category are real/plausible, layouts are not surveyed.
- Mythos "garden in" is an axis-aligned rectangle (the real hall is skewed ~25°); its second door to the lane is decorative.
