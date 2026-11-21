# interiors agent — progress log (team:interiors)
Private copy: work/interiors/gk3. Owned: gk3/js/35_interiors.js, gk3/interiors/**, docs/INTERIORS.md.
AUTHORING SOURCE: work/interiors/src/*.js  -> concatenated by work/interiors/tools/build.sh into work/interiors/gk3/js/35_interiors.js (never edit the built file by hand).
Texture pipeline: work/interiors/tools/build_tex.py (raw CC0 Poly Haven photos in work/interiors/raw/ph -> gk3/interiors/c*.jpg, n*.jpg, manifest.json).
Fast viewer (no game boot): work/interiors/tools/iview.js. Full-game scenario tests: work/interiors/tools/walk.js. Shots: work/interiors/shots/.
Old first draft (not used any more, kept for reference): work/interiors/old/35_interiors_v0.js.

## Plan (milestones) — integrate after EVERY milestone
1. [ ] Core (src/00..40): registry INTERIORS, own lit material on a per-interior WebGL2 texture array, builder, baked light, enter/exit with fade,
       tick via updateCamera wrapper, world hidden while inside, lights override, camera clamp, staff, shop menu through SHOPS/openShop.
2. [ ] Texture sheets (build_tex.py) -> gk3/interiors/.
3. [ ] Furniture kit + generic generator (templates by category) + "Enter <name>" at every shop door  -> INTEGRATE (v1).
4. [ ] Mythos Plus hand-made after the real reference photos (docs/research/img/shops/mythos_*)  -> INTEGRATE.
5. [ ] PAUL, Starbucks, KFC, AB Vasilopoulos hand-made; cosmetics (Sephora/Hondos) hand-made -> INTEGRATE each.
6. [ ] Verify (walk-in scripts, buy, Gyro Run inside Mythos, exit, day/night, stats), docs/INTERIORS.md, CREDITS.md, ORDERS_DONE.md.

## Decisions (current)
- Whole module is ONE IIFE (other modules already use globals named IN, T, R, U, Q ...). Public globals only: INTERIORS, buildInteriors, enterInterior, exitInterior, updateInteriors.
- Cells live at x,z >= 3200 (terr() constant there, lvl()=0, lamp light map black). Specials: own slot each; generic shops: one slot per shop (collision segments are added once per slot).
- Cell authored in LOCAL coords: origin = street-door centre on the inner face of the front wall, +z = out to the street (door normal), -z = into the shop, +x = right when entering.
  Group rotation.y = atan2(nx,nz) of the real shopfront => same compass orientation as reality.
- Only ONE interior is alive at a time: geometry + textures are built on entry (during the fade) and disposed on exit.
- Own material (MeshPhong patched: sampler2DArray colour layers 512² + normal/gloss layers 256², vertex colours carry baked AO/light pools, aGlow emissive).
  Unlit "board" material (menu boards, screens, street panorama in the windows) on a per-interior canvas texture. Glass = transparent Phong.
- Lighting: scene.onBeforeRender overrides sun (0), hemi, amb while inside and restores them in onAfterRender; up to 3 PointLights that exist only while inside.
- Per-frame hook: buildInteriors() wraps updateCamera (camera clamp + tick), updatePeople/updateTraffic (skipped while inside), openShop (door of a special -> enter instead).
- Shop UI: the module registers SHOPS['i:'+key] = {t,s,items} and calls the game's openShop(); the five specials use the game's own SHOPS[k] when present.
- game agent's draft (work/game/gk3) expects: INTERIORS[k].counter {x,z}, exitInterior(true) on respawn, gameEvent('interior',{key}); FRAME_HOOKS exists there.

## Status log
- [start] read all docs + modules; working copy created.
- [resume 20:15] re-read docs (MATERIALS.md, CHARACTERS.md new), synced work copy from main, looked at the Mythos reference photos (contact sheets in work/interiors/tmp/ref_mythos_*.jpg).
  Real Mythos Plus: black steel-framed glazing + brick arch entrance, long counter on the LEFT faced with vertical cream tiles + white marble top, gyro spits behind,
  ochre tile vault, "garden in" yellow neon at the end of the corridor, dining hall with timber posts/beams, wood floor, terracotta tile wainscot + white square tiles above,
  B&W photos of old Kifisia, banquettes with green cushions, white marble tables on black pedestals, walnut armchairs, gold ring + fork emblem on a wood plank wall. Footprint ~10 m wide x ~30 m deep.
