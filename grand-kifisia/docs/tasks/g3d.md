# g3d — prototype: Grand Kifisia on Google Photorealistic 3D Tiles (owner, 2026-11-21 13:40)
Owner: "I want a real 1:1 copy of the surface, everything super realistic as if I'm really walking in the street, best there is."
Build a SEPARATE prototype in scratchpad/gk3d/ (you own gk3d/**, tools/g3d/**, docs/G3D.md). Do not touch gk3/.

## Tech
- three.js current release + 3d-tiles-renderer (NASA-AMMOS/3DTilesRendererJS) as ES modules from cdn.jsdelivr.net/npm with EXACT pinned versions that
  exist on npm and are ≥ 2 weeks old (check `npm view`), importmap in index.html. Use its Google tiles support (GoogleCloudAuthPlugin / TilesRenderer with
  https://tile.googleapis.com/v1/3dtiles/root.json).
- API key: gk3d/config.js exports KEY (empty string here). In THIS dev environment the network proxy injects the header X-Goog-Api-Key for
  tile.googleapis.com, so with KEY==='' the code must NOT append a `key=` query param and must still work (session token from root.json is fine).
  Never write a real key anywhere. If requests to tile.googleapis.com fail with 401/403, the owner has not saved the key yet: build everything else,
  note it in PROGRESS.md, retry later.
- Frame: local ENU at Platanos (lat 38.0727, lon 23.8125), metres; match the main game axes (x east, z south) so gk3/kifisia_map.json data lines up.

## Policy (Google Maps Platform — mandatory)
- Visualization only. No caching/storing tiles beyond HTTP Cache-Control, no offline, no extraction, no deriving geometry, collision or models from
  the tiles. Physics/collision come from OUR OSM data (kifisia_map.json footprints as walls, our DEM for ground). Runtime raycasts against tiles only for
  visual camera/foot placement, never stored.
- Show the Google Maps logo + the data attributions from the tiles, visible and unobstructed, and state in the UI which parts are Google
  ("3D city: Google Maps") and which are ours (characters, cars, signs, interiors).
- Our own 3D objects may be overlaid only if not traced/derived from the tiles.

## Deliverable (iterate, integrate early, write PROGRESS.md after each step)
1. Walking third-person character (reuse gk3 Rocketbox avatar + anims: gk3/models/rb_people.json, rb_anims.json via GLTFLoader) at the spawn junction
   (MAP.key.junction), smooth camera, phone controls (left-thumb joystick, drag-to-look), WASD on desktop.
2. Tile quality tuned for eye level (errorTarget, LRU/memory caps for phones), loading screen, fog/haze matched to the tiles.
3. Screenshots in docs/G3D.md: eye level and 30 m drone view at Mythos junction, Kassaveti 19 (Starbucks/Ralph Lauren), Platanos, station, ISA, side by
   side with the current gk3 game. Measure fps at 390x844. Report HONESTLY how it looks at eye level (photogrammetry can look "melted" up close).
4. If the base works: add our NPCs, a drivable car, shop door hotspots from kifisia_map.json, as overlays.
