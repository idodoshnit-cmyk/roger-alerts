# mats — PROGRESS (materials / lighting / sky workstream)

## Status log
- [start] Read ARCHITECTURE.md + all modules. Private copy created (work/mats/gk3). No other docs existed yet.

## Plan
1. Baseline shots of current main (work/mats/shots/base_*).
2. Texture pipeline tools/tex/: download ambientCG / Poly Haven 1K sets -> pick -> 512² jpg layers in gk3/tex/.
3. 10_atlas.js rewrite: DataArrayTexture (manual GL upload layer by layer), defTile(), RECT contract kept.
4. World material (per-pixel, normal array, specular, glow) in 00_core.js / 10_atlas.js.
5. 82_sky.js: sky/sun/fog/env/tone mapping, night.
6. Verify (close-ups, wide, 4 times of day), docs/MATERIALS.md, CREDITS.md, integrate.

## Decisions
(none yet)

## Resume log (2nd process, 14:22)
- Found from earlier process: baseline shots work/mats/shots/base_*.png; tools/tex/{acg_fetch,acg_search,ph_fetch,ph_fetch_maps,sheet}.py;
  texraw/ph/<id>/<id>_diff.jpg for 203 Poly Haven textures (diffuse only, 1K), texraw/phm/<model>/ foliage maps (16 models);
  contact sheets work/mats/tmp/c_*.jpg (candidates) + ref_sheet*.jpg (reference photos).
- Design decisions:
  * RECT[i] stays a 4-number array in 0..1 (GB.build keeps Uint16 normalized): [layer/255, uScale/64, vScale/64, spare]. Sign atlas (2D) keeps old rect semantics via atlasMat().
  * World material = MeshPhong/Lambert + onBeforeCompile, sampler2DArray colour + RG normal array, per-layer params in a small LUT texture (texelFetch).

## Resume log (3rd process, 14:45)
- Found tools/tex/build_layers.py (complete draft, never run?) -> writes gk3/tex/{c,a,n}<N> sheets (4x4 cells of 512) + manifest.json. All chosen PH ids have diff+nor in texraw/ph.
- Facts checked: r147 Lambert is ALREADY per-pixel (no vLightFront in build). fog_fragment is applied AFTER tonemapping+encoding => fog.color is a display-space colour.
  Sky/light globals (sky, skyU, hemi, amb, sun, sunV, U.night) are only used in 00_core/82_sky. Pause menu (85_hud) sets Q=QP[..] and calls applyQuality().
- Design (final):
  * RECT[i]=[i/255,0,0,0]; per-layer params (uv scale, normal layer, spec, shininess, flags) in a LUT texture fetched in the VERTEX shader.
  * Colour array SRGB8_ALPHA8 created by hand (texStorage3D + texSubImage3D per layer from canvas, generateMipmap), attached to a THREE.DataArrayTexture via renderer.properties (version stays 0).
  * World material = MeshPhongMaterial + onBeforeCompile (own varyings, no USE_UV dependency). MAT.atlas / MAT.cut / MAT.leaf (leaf: no back-face normal flip, translucency).
  * Sky = own dome ShaderMaterial writing display-space colour; fog colour == dome horizon colour.
- 15:40 WRITTEN (private copy, untested yet): js/10_atlas.js (tile registry defTile/paint/texSrc, array loader loadTextures, worldMat, cutDepthMat, legacy atlasMat, initMaterials),
  js/82_sky.js (sun path Athens mid-Aug, KEY keyframes over sun elevation, sky dome shader, skyEnv/useEnv PMREM, buildLampMap, updateSky with shadow texel snapping),
  00_core.js renderer block (Q before renderer, QP +tex/ntex/aniso/aa, U uniforms, fog range, shadow bias), 90_main.js boot (initMaterials, skyEnv, useEnv(carMat)).
  tools/tex/build_layers.py updated (asph<-gravel_stones, marble<-marble_01, soil<-forest_leaves_04, ballast<-ganges_river_pebbles, plasterC<-beige_wall_002, tiles<-ceramic_roof_01, +noise layer).
  gk3/tex built: c0-2.webp a0.webp n0-2.jpg manifest.json (8.2 MB). ambientcg.com downloads are BLOCKED by the proxy (403) -> Poly Haven only.
- NEXT: run harness, fix shader/JS errors, look at shots, tune. Then apply 00_core.js + 90_main.js edits to MAIN by hand (shared files), integrate.sh for 10_atlas.js 82_sky.js tex/.

## Resume log (4th process, 19:43)
- Found: private copy already RENDERS (shots work/mats/shots/t2_*.png from 15:10). Re-verified at 19:50 (r2_*.png): no errors, 76 colour layers 512² + 39 normal layers 256² = 107.8 MB on medium.
- 19:52 **INTEGRATED v1 INTO MAIN**: tex/ (8.2 MB), js/10_atlas.js, js/82_sky.js via integrate.sh; js/00_core.js renderer block + js/90_main.js boot lines (initMaterials, skyEnv/useEnv) by hand in MAIN (mirrored in my copy).
- tools/tex/mshot.js rewritten: waits for rendered FRAMES (machine is slow/shared: 5-8 s per frame), forces updateChunkVis after a camera jump, options: quality, nohud, noaa (SETTINGS.aa=false).
  usage: cd tools/tex && GK_DIR=$ROOT/work/mats/gk3 GK_SHOTS=$ROOT/work/mats/shots node mshot.js <prefix> <views.json> 900x420 medium [nohud] [noaa]
- NEXT (in this order, integrating after each): (1) verify main run main1_*; (2) docs/MATERIALS.md + CREDITS.md (v1 so others can use defTile/new names);
  (3) close-up review of every material vs ref photos, fix scales/tints; (4) sky/atmosphere tuning at 13/19.3/20.3/23; shadows acne check; (5) low/high presets + WebGL2 message test; (6) perf numbers.
- 20:08 **INTEGRATED v2**: two shadow cascades (sun + sun2, global ShaderChunk patch in 00_core.js: 9-tap PCF, cascade blend), LIGHTS/addLight registry for the night light map,
  TM.<name> metric twins + tileM(), late defTile (TEX.spare=4 spare layers, per-layer mip upload), indoor exposure pin. Verified r3_*.png (day/gold/dusk/night), no errors.
  tools/tex/sync_core.py copies ONLY my blocks (renderer block + GB.build) of 00_core.js into main (use it instead of integrate.sh for that file).
- 20:12 docs/MATERIALS.md v1 written (API for the others) + docs/CREDITS.md lines appended. tools/tex/tiletable.js regenerates the table (cat doc_head + table + doc_tail in work/mats/tmp).
- NEXT: tuning pass — (a) asphalt sparkle at grazing angles (fade normal strength with distance), (b) golden hour / dusk too dark & flat: hemi + exposure keys, sunset glow,
  (c) roof tiles too pale (re-grade terracotta), ballast should be angular grey stone, (d) presets low/high + runtime switch + late defTile test, (e) perf table.

## Resume log (5th process, 00:50 next day)
- Found unintegrated tuning in my copy (r5_* shots, no errors): asph<-clean_asphalt, normal fade with distance, haze uniform, cut flag in LUT (only cut:true tiles discard), sky keys, sunset glow, MOBILE tex 384.
- 00:55 **INTEGRATED v3** (tex/, 10_atlas.js, 82_sky.js via integrate.sh; 00_core.js via tools/tex/sync_core.py). Copy synced from main first (60_people, 75_npc).
- Running main3_* verification (tmp/viewsF.json, log tmp/main3.log). No docs/ORDERS.md exists yet.
- NEXT: look at main3 shots; then tuning list: roof tiles colour, ballast, facade/plaster look, foliage quality, dusk/night readability; run tools/tex/mtest.js (late defTile, presets, no-WebGL2) — not yet run; perf table; MATERIALS.md update.

## Resume log (6th process, 08:25)
- Found unintegrated r6 work (vc hue param for foliage/grass, wind sway GK_VWIND for leaf/cut materials, glowC horizon light, tiles/ballast scale). r6 had no errors.
- 08:27 **INTEGRATED v4** (10_atlas.js, 82_sky.js, tex/ via integrate.sh; 00_core.js via sync_core.py). No ORDERS.md exists.
- NEXT: verify main4; "gold" shot looks not golden -> check time-of-day keys; facade/plaster look; dusk/night readability; mtest.js; perf; MATERIALS.md update (vc, wind).
- 09:20 tuning pass r7/r8 (shots work/mats/shots/r7_*, r8_*; no errors): night darker (hemi .10/.13, moon .13, expo .88), lamp pools steeper + brighter (lampC 1.55,1.02,.52; light reaches 7.5 m),
  golden hour warmer (sunC 10° = 1,.62,.36; sunI 1.6), blue hour 20:30 ok. Measured night facade upper floors ≈ sRGB 50, lamp-lit ≈ 110 warm.
- 09:22 **INTEGRATED v5** (10_atlas.js, 82_sky.js). MATERIALS.md: vc option, wind, horizon glow documented.
- NEXT: run tools/tex/mtest.js on MAIN (late defTile, presets, no-WebGL2), fix; then perf table; close-up material review.
- 09:45 **INTEGRATED v6**: new photo layers karystos (PH stone_tiles) + timber (PH wooden_planks) with normals (tex/ rebuilt: 82 colour / 41 normal layers, 116.2 MB medium, 8.2 MB download), P() in 10_atlas.js.
  mtest.js on main: ALL CHECKS PASSED (mt1.log). MATERIALS.md: table regenerated, memory numbers, verification line, building-material mapping. CREDITS + ORDERS_DONE appended.
- ORDERS.md now exists: nothing for mats; project priority = buildings/landmarks (lm-* bots, gk3/js/89*_lm_*.js).
- NEXT: verify MAIN boots with everyone's latest work (main5 run: spawn, mythos, platanos, station, kefalari + gold/night); perf table; look at lm-* files for material misuse.

## Resume log (7th process, 12:47)
- ORDERS.md 12:50 directive for mats: GRAPHICS OVERHAUL (ACES+sRGB, PMREM env lighting, cascaded stable soft shadows, SSAO/baked contact AO, subtle bloom,
  haze, PBR facades normal+roughness, wet/dirty variation, AA, better trees/grass, presets: High default desktop + auto phone preset 30+ fps, before/after shots in MATERIALS.md).
- Main unchanged since 09:14 (my v6 is live). Plan: (B) in-shader colour grading + presets/High default + phone auto preset; (C) heightfield AO (top-down height RT
  around camera, contact AO + street-canyon sky occlusion on indirect light); (D) LDR bloom via copyFramebufferToTexture + additive composite; (E) analytic sky reflection
  on glass/water/wet + macro dirt variation; (F) docs before(base_*)/after.
- 13:15 WRITTEN in copy (not yet integrated, testing run a1 = tmp/a1.log, shots a1_*): QP +ao/bloom/prMin/fpsLo, autoQ() (desktop high, phones medium), ACES colour grade patch (00_core);
  height-field AO (82_sky.js HF*, world shader GK_AO/GK_AO2 in 10_atlas.js, U.hf/hfR/hfK), bloom+vignette postFX() (82_sky.js), autoQuality() step-down (skips navigator.webdriver),
  fxQuality() hook from applyQuality. Shared edits in COPY only so far: 90_main.js (postFX call after renderer.render; Q.fpsLo/Q.prMin in auto-res loop), 88_menu.js setQuality auto->autoQ().
  Must apply those 2 shared edits to MAIN by hand at integration.

## Resume log (8th process, 17:50)
- Found a2 run (14:03, no errors) of the unintegrated overhaul: a2_spawn (AO on) vs a2_spawnN (AO off) — AO subtle; a2_spawnD = AO debug view. Main unchanged since 13:52. No new orders for mats after 12:50/13:00.
- NEXT: diff copy vs main for shared files (90_main.js changed in main 12:51, 88_menu.js), integrate the overhaul, then visual push (sky blue not white, stronger contact AO, facade normals, FXAA, trees/grass).
- 18:05 b1 FAILED: my 13:55 edit in 82_sky.js hfTag had a // comment swallowing the rest of the line (syntax error) -> fixed (node --check OK). ALWAYS run `node --check` on edited js.
  Synced others' work into copy (syncwork, owned: 10_atlas 82_sky tex 00_core 90_main 88_menu), merged main's 90_main.js line 18 into copy.
  Test runs now use a SNAPSHOT (work/mats/snap/gk3) so I can keep editing gk3. Run b2 (tmp/viewsB.json: A/B lighting variant via eval on KEY) started 18:06.
- 18:55 **INTEGRATED v7 = GRAPHICS OVERHAUL part 1** (b2 run: 8 views, no errors): 10_atlas.js (height-field AO in world shader), 82_sky.js (HF AO, bloom+vignette postFX, autoQuality step-down,
  autoQuality() without dt returns autoQ() because game's 88_menu.js qAuto() calls it), 00_core.js block (QP ao/bloom/prMin/fpsLo, autoQ: desktop high / phone medium, ACES grade patch),
  MAIN 90_main.js by hand (postFX after render; Q.fpsLo/Q.prMin in auto-res). 88_menu.js: NOT edited (game's qAuto handles it). Copy now = main for 90_main/88_menu.
  A/B test of lower hemi/higher exposure: marginal -> KEY kept. Texture array is now 114 layers (others' defTiles) = 179 MB on high: CHECK medium memory.
  main6 verification run started (tmp/viewsM.json).
