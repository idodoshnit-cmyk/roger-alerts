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
