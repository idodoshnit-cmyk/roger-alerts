# MATERIALS — photo materials, world lighting, shadows, sky and time of day

Owner: agent `mats`. Files: `gk3/js/10_atlas.js` (materials), `gk3/js/82_sky.js` (sky, sun, time of day), the renderer / quality / `GB.build()` block of `gk3/js/00_core.js`,
`gk3/tex/**` (texture sheets), `tools/tex/**` (pipeline + test runner). Status line at the end ("Verified / known gaps") is kept honest.

## 1. What changed for everybody (read this first)
- The old 2048² painted atlas is gone. The world is drawn with ONE shared material that samples a **WebGL2 texture array** (one 512² layer per material, true repeat
  wrapping, mipmaps, anisotropic filtering) of **photographic CC0 materials from Poly Haven**, lit **per pixel** with normal maps, a little specular, sky reflections on
  glass/water/polished stone, night window glow and a street-lamp light map.
- **Your code keeps working unchanged**: `T.<name>` ids, `RECT[T.name]` handed to `GB`, UVs "in tile repeats", `MAT.atlas / MAT.cut / MAT.leaf / MAT.signs`, the `aGlow` flag.
  All the old `T` names still exist (table in §3).
- **New building materials (2026-11-21)**: `TM.karystos` — irregular grey-green Karystos/Pelion stone slabs (the classic Athenian stone base, garden wall and step
  cladding; Poly Haven stone_tiles, 3.17 m repeat) and `TM.timber` — stained horizontal timber boards (cladding, pergolas, doors, the Starbucks stable; Poly Haven
  wooden_planks, 2 m repeat; real colour, use a white vertex colour). For sawn **stone-plate cladding** (stone_clad_base / stone_cladding in buildings_spec.json) use
  `TM.marbleW` with the stone colour as vertex colour (e.g. `#e3d3b8` beige limestone); for rusticated/ashlar villas `TM.ashlar`; for rubble garden walls `TM.rubble`.
- New for you: `TM.<name>` (the same photo material with **UVs in metres**), `defTile()` (register your own painted or image layer), `texSrc()`, `tileM()`,
  `addLight()` (night light map), `useEnv()` (reflection map that follows the time of day), `SKY`, `sun2` (second shadow cascade).
- WebGL 2 is now required (every phone browser since ~2021 has it). Without it the loading screen says so and boot stops with a clear message.

## 2. The contract
```js
// ids and rectangles — exactly as before
ch.wall(ax,az,bx,bz,y0,y0,y1,y1,nx,nz, u0,u1,v0,v1, colour, RECT[T.plaster], glow);
// NEW, preferred for new code: UVs in METRES, the photo has its real size whatever its repeat length is
ch.wall(ax,az,bx,bz,y0,y0,y1,y1,nx,nz, 0,lengthM, 0,heightM, colour, RECT[TM.plaster], 0);
groundPoly(rings, 0.16, TM.brick, 1 /* scale: 1 uv = 1 m */, C1, 6);
```
- `RECT[id]` is still a 4-number array, but it now only carries the tile id; never read its numbers. Repeat scale, normal map, gloss etc. live in a lookup texture per id.
- `T.<name>`: UV unit = "one tile repeat" **as the old callers used it** (column "1 caller UV unit" in §3 — e.g. roads call `T.asph` with uv = metres/6, sidewalks call `T.brick` with metres/2).
  These scales were chosen so that every existing call site shows the photo at its real size (brick ≈ 20×10 cm, pavers ≈ 20 cm, roof tiles ≈ 22 cm wide …).
- `TM.<name>` exists for every photographic tile and expects **metres**. `tileM(id)` → `[mU, mV]` metres per UV unit (`[1,1]` for `TM.*`, `null` for painted tiles).
- The vertex colour multiplies the texture (as before). Photo layers are graded to the colour the surface should have with a WHITE vertex colour, except the tint
  carriers `metal`, `metalL`, `wood`, `white`, `rail`, `fence`, which are light/neutral so that your colour decides (a green `#2f6b4a` on `T.metal` = green painted steel).
  Keep tints for plaster in the range of real paint (0.75–1.0): darker multipliers kill the photo detail.
- `glow` (the last GB argument, 0..1) = how much the tile's *glass/emissive mask* lights up at night (see §5). It does nothing on tiles without a mask.

## 3. Material table
`photo repeat (m)` = real size of one repeat of the source photo. `1 caller UV unit (m)` = what one UV unit covers for `T.<name>` (for `TM.<name>` it is always 1 m).
Rows named `*_m` are the `TM.*` twins (listed for completeness; use them as `TM.asph`, not `T.asph_m`).

| id | T.name | kind | source | photo repeat (m) | 1 caller UV unit (m) | normal | spec/shin | notes |
|---|---|---|---|---|---|---|---|---|
| 0 | asph | photo | PH clean_asphalt | 2.1 | 6 | asph | 0.045/22 | macro 0.5 |
| 1 | asph2 | photo | PH asphalt_pit_lane | 2 | 5 | asph2 | 0.045/20 | macro 0.5 |
| 2 | pavers | photo | PH concrete_pavers | 1.92 | 2.21 | pavers | 0.03/14 | macro 0.4 |
| 3 | brick | photo | PH herringbone_brick_03 | 1.98 | 1.98 | brick | 0.03/14 | macro 0.4 |
| 4 | marble | photo | PH marble_01 | 1.5 | 1.88 | marble | 0.05/46 | reflective 0.05, macro 0.3 |
| 5 | slabs | photo | PH concrete_pavement | 1.8 | 2.88 | slabs | 0.03/14 | macro 0.4 |
| 6 | grass | photo | PH forrest_ground_01 | 2 | 4 | grass | 0.02/6 | macro 0.7 |
| 7 | gravel | photo | PH gravel_floor | 2.25 | 2.48 | gravel | 0.02/8 | macro 0.4 |
| 8 | soil | photo | PH forest_leaves_04 | 1.5 | 3.75 | soil | 0.02/6 | macro 0.5 |
| 9 | curb | photo | PH concrete_wall_009 + joints | 1 | 1.5 × 2 | curb | 0.04/24 |  |
| 10 | paint | painted |  | — | see text | asph | 0.06/30 |  |
| 11 | tactile | photo | generated: yellow blister paving on PH concrete_pavement | 0.8 | 1.2 | tactile | 0.03/12 |  |
| 12 | platf | photo | PH concrete_tiles_02 | 1.825 | 2.01 | platf | 0.03/16 | macro 0.35 |
| 13 | ballast | photo | PH river_small_rocks | 1.5 | 3.24 | ballast | 0.03/10 | macro 0.35 |
| 14 | water | photo | generated | 3 | 6 | water | 0.08/200 | reflective 0.85 |
| 15 | pool | photo | generated | 1.5 | 3 | pool | 0.08/160 | reflective 0.45 |
| 16 | plaster | photo | PH white_stucco | 2 | 3 | plaster | 0.02/8 | macro 0.3 |
| 17 | ashlar | photo | PH sandstone_blocks_05 | 3 | 3.75 | ashlar | 0.03/10 | macro 0.25 |
| 18 | rubble | photo | PH stone_wall | 2 | 2.5 | rubble | 0.03/10 | macro 0.25 |
| 19 | concrete | photo | PH concrete_wall_009 | 1.8 | 3.6 | concrete | 0.03/12 | macro 0.3 |
| 20 | brickw | photo | PH red_brick | 1.4 | 2.8 | brickw | 0.03/10 | macro 0.25 |
| 21 | tiles | photo | PH clay_roof_tiles_02 | 2.5 | 2 | tiles | 0.035/16 | macro 0.4 |
| 22 | flatroof | photo | PH granular_concrete | 2.4 | 4.01 | flatroof | 0.02/8 | macro 0.5 |
| 23 | solar | painted |  | — | see text | — | 0.08/120 | glass mask |
| 24 | win | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 25 | balc | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 26 | neo | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 27 | neoC | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 28 | villaW | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 29 | small | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 30 | plain | painted |  | — | see text | plaster | 0.02/8 |  |
| 31 | office | painted |  | — | see text | — | 0.06/60 | glass mask |
| 32 | shopA | painted |  | — | see text | — | 0.04/30 | glass mask |
| 33 | shopB | painted |  | — | see text | — | 0.04/30 | glass mask |
| 34 | cafe | painted |  | — | see text | — | 0.04/30 | glass mask |
| 35 | shutter | painted |  | — | see text | shutterM | 0.1/30 |  |
| 36 | lobby | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 37 | garage | alias of shutter |  | — | see text | shutterM | 0.1/30 |  |
| 38 | neoDoor | painted |  | — | see text | plaster | 0.02/8 | glass mask |
| 39 | pilotis | painted |  | — | see text | — | 0.03/10 |  |
| 40 | awnS | painted |  | — | see text | — | 0.02/8 |  |
| 41 | awnG | painted |  | — | see text | — | 0.02/8 |  |
| 42 | awnR | painted |  | — | see text | — | 0.02/8 |  |
| 43 | rail | painted |  | — | see text | — | 0.15/30 | alpha cut-out |
| 44 | fence | painted |  | — | see text | — | 0.12/30 | alpha cut-out |
| 45 | hedge | photo | composited from polyhaven model leaves (searsia_lucida, island_tree_01) | 1.5 | 1.5 | hedge | 0.02/10 | macro 0.35 |
| 46 | bark | photo | PH japanese_sycamore | 1.1 | 1.83 × 1.65 | bark | 0.015/6 |  |
| 47 | leaves | photo | composited from polyhaven model:shrub_01 leaves | 2 | 2 | — | 0.02/14 | alpha cut-out |
| 48 | glassR | painted |  | — | see text | — | 0.08/120 | glass mask |
| 49 | trim | painted |  | — | see text | plaster | 0.02/8 |  |
| 50 | wood | photo | PH wood_planks | 1.5 | 1.01 | wood | 0.03/14 |  |
| 51 | metal | photo | PH green_metal_rust | 1 | 1 | metal | 0.12/36 | reflective 0.03 |
| 52 | canopy | photo | PH factory_wall | 3 | 6 × 3 | canopy | 0.08/30 |  |
| 53 | train | painted |  | — | see text | — | 0.15/50 | glass mask, reflective 0.03 |
| 54 | trainF | painted |  | — | see text | — | 0.15/50 | glass mask, reflective 0.03 |
| 55 | church | painted |  | — | see text | plasterW | 0.02/8 | glass mask |
| 56 | metalL | photo | PH blue_metal_plate | 2.5 | 2.5 | metalL | 0.2/42 | reflective 0.06 |
| 57 | kiosk | painted |  | — | see text | — | 0.04/20 |  |
| 58 | ad | painted |  | — | see text | — | 0.06/60 |  |
| 59 | stuccoL | alias of plasterW | PH painted_plaster_wall | 2 | 1 | plasterW | 0.02/8 | macro 0.2 |
| 60 | parkG | photo | PH sandy_gravel | 2.1 | 2.52 | parkG | 0.02/8 | macro 0.45 |
| 61 | dryG | photo | PH withered_grass | 2 | 6 | dryG | 0.02/6 | macro 0.6 |
| 62 | orangeF | photo | composited from polyhaven model:island_tree_01 leaves + drawn fruit | 1.5 | 1.5 | orangeF | 0.02/10 | macro 0.3 |
| 63 | white | painted |  | — | see text | — | 0.04/20 |  |
| 64 | asphP | photo | PH asphalt_02 | 3 | 6 | asphP | 0.04/18 | macro 0.4 |
| 65 | plasterW | photo | PH painted_plaster_wall | 2 | 3 | plasterW | 0.02/8 | macro 0.3 |
| 66 | plasterC | photo | PH beige_wall_002 | 3 | 3 | plasterC | 0.02/8 | macro 0.3 |
| 67 | marbleW | photo | PH stone_tile_wall | 2 | 3 | marbleW | 0.05/50 | reflective 0.04, macro 0.2 |
| 68 | karystos | photo | PH stone_tiles | 3.17 | 3.17 | karystos | 0.04/24 | macro 0.3 |
| 69 | timber | photo | PH wooden_planks | 2 | 2 | timber | 0.04/20 | macro 0.15 |
| 70 | shutterM | photo | PH painted_metal_shutter | 2 | 2 | shutterM | 0.1/30 |  |
| 71 | barkPine | photo | PH pine_bark | 2 | 1.67 × 1.6 | barkPine | 0.015/6 |  |
| 72 | barkDark | photo | PH bark_brown_02 | 1 | 1.67 × 1.5 | barkDark | 0.015/6 |  |
| 73 | barkPalm | photo | PH palm_bark | 1.86 | 1.55 × 1.86 | barkPalm | 0.015/6 |  |
| 74 | leafPine | photo | composited from polyhaven model:pine_tree_01 needle twigs | 2 | 2 | — | 0.02/14 | alpha cut-out |
| 75 | leafCypress | photo | composited from polyhaven model:fir_tree_01 twigs | 1.5 | 1.5 | — | 0.02/14 | alpha cut-out |
| 76 | leafOlive | photo | composited from polyhaven model:shrub_02 leaves | 1.5 | 1.5 | — | 0.02/14 | alpha cut-out |
| 77 | leafOrange | photo | composited from polyhaven model:island_tree_01 leaves + drawn fruit | 1.2 | 1.2 | — | 0.02/14 | alpha cut-out |
| 78 | leafPalm | photo | built from polyhaven model:fern_02 frond | 3 | 3 | — | 0.02/14 | alpha cut-out |
| 79 | noise | photo | generated noise (macro variation) | — | see text | — | 0.03/12 |  |
| 80 | asph_m | alias of asph | PH clean_asphalt | 2.1 | 6 | asph | 0.045/22 | macro 0.5 |
| 81 | asph2_m | alias of asph2 | PH asphalt_pit_lane | 2 | 5 | asph2 | 0.045/20 | macro 0.5 |
| 82 | pavers_m | alias of pavers | PH concrete_pavers | 1.92 | 2.21 | pavers | 0.03/14 | macro 0.4 |
| 83 | brick_m | alias of brick | PH herringbone_brick_03 | 1.98 | 1.98 | brick | 0.03/14 | macro 0.4 |
| 84 | marble_m | alias of marble | PH marble_01 | 1.5 | 1.88 | marble | 0.05/46 | reflective 0.05, macro 0.3 |
| 85 | slabs_m | alias of slabs | PH concrete_pavement | 1.8 | 2.88 | slabs | 0.03/14 | macro 0.4 |
| 86 | grass_m | alias of grass | PH forrest_ground_01 | 2 | 4 | grass | 0.02/6 | macro 0.7 |
| 87 | gravel_m | alias of gravel | PH gravel_floor | 2.25 | 2.48 | gravel | 0.02/8 | macro 0.4 |
| 88 | soil_m | alias of soil | PH forest_leaves_04 | 1.5 | 3.75 | soil | 0.02/6 | macro 0.5 |
| 89 | curb_m | alias of curb | PH concrete_wall_009 + joints | 1 | 1.5 × 2 | curb | 0.04/24 |  |
| 90 | tactile_m | alias of tactile | generated: yellow blister paving on PH concrete_pavement | 0.8 | 1.2 | tactile | 0.03/12 |  |
| 91 | platf_m | alias of platf | PH concrete_tiles_02 | 1.825 | 2.01 | platf | 0.03/16 | macro 0.35 |
| 92 | ballast_m | alias of ballast | PH river_small_rocks | 1.5 | 3.24 | ballast | 0.03/10 | macro 0.35 |
| 93 | water_m | alias of water | generated | 3 | 6 | water | 0.08/200 | reflective 0.85 |
| 94 | pool_m | alias of pool | generated | 1.5 | 3 | pool | 0.08/160 | reflective 0.45 |
| 95 | plaster_m | alias of plaster | PH white_stucco | 2 | 3 | plaster | 0.02/8 | macro 0.3 |
| 96 | ashlar_m | alias of ashlar | PH sandstone_blocks_05 | 3 | 3.75 | ashlar | 0.03/10 | macro 0.25 |
| 97 | rubble_m | alias of rubble | PH stone_wall | 2 | 2.5 | rubble | 0.03/10 | macro 0.25 |
| 98 | concrete_m | alias of concrete | PH concrete_wall_009 | 1.8 | 3.6 | concrete | 0.03/12 | macro 0.3 |
| 99 | brickw_m | alias of brickw | PH red_brick | 1.4 | 2.8 | brickw | 0.03/10 | macro 0.25 |
| 100 | tiles_m | alias of tiles | PH clay_roof_tiles_02 | 2.5 | 2 | tiles | 0.035/16 | macro 0.4 |
| 101 | flatroof_m | alias of flatroof | PH granular_concrete | 2.4 | 4.01 | flatroof | 0.02/8 | macro 0.5 |
| 102 | hedge_m | alias of hedge | composited from polyhaven model leaves (searsia_lucida, island_tree_01) | 1.5 | 1.5 | hedge | 0.02/10 | macro 0.35 |
| 103 | bark_m | alias of bark | PH japanese_sycamore | 1.1 | 1.83 × 1.65 | bark | 0.015/6 |  |
| 104 | leaves_m | alias of leaves | composited from polyhaven model:shrub_01 leaves | 2 | 2 | — | 0.02/14 | alpha cut-out |
| 105 | wood_m | alias of wood | PH wood_planks | 1.5 | 1.01 | wood | 0.03/14 |  |
| 106 | metal_m | alias of metal | PH green_metal_rust | 1 | 1 | metal | 0.12/36 | reflective 0.03 |
| 107 | canopy_m | alias of canopy | PH factory_wall | 3 | 6 × 3 | canopy | 0.08/30 |  |
| 108 | metalL_m | alias of metalL | PH blue_metal_plate | 2.5 | 2.5 | metalL | 0.2/42 | reflective 0.06 |
| 109 | parkG_m | alias of parkG | PH sandy_gravel | 2.1 | 2.52 | parkG | 0.02/8 | macro 0.45 |
| 110 | dryG_m | alias of dryG | PH withered_grass | 2 | 6 | dryG | 0.02/6 | macro 0.6 |
| 111 | orangeF_m | alias of orangeF | composited from polyhaven model:island_tree_01 leaves + drawn fruit | 1.5 | 1.5 | orangeF | 0.02/10 | macro 0.3 |
| 112 | asphP_m | alias of asphP | PH asphalt_02 | 3 | 6 | asphP | 0.04/18 | macro 0.4 |
| 113 | plasterW_m | alias of plasterW | PH painted_plaster_wall | 2 | 3 | plasterW | 0.02/8 | macro 0.3 |
| 114 | plasterC_m | alias of plasterC | PH beige_wall_002 | 3 | 3 | plasterC | 0.02/8 | macro 0.3 |
| 115 | marbleW_m | alias of marbleW | PH stone_tile_wall | 2 | 3 | marbleW | 0.05/50 | reflective 0.04, macro 0.2 |
| 116 | karystos_m | alias of karystos | PH stone_tiles | 3.17 | 3.17 | karystos | 0.04/24 | macro 0.3 |
| 117 | timber_m | alias of timber | PH wooden_planks | 2 | 2 | timber | 0.04/20 | macro 0.15 |
| 118 | shutterM_m | alias of shutterM | PH painted_metal_shutter | 2 | 2 | shutterM | 0.1/30 |  |
| 119 | barkPine_m | alias of barkPine | PH pine_bark | 2 | 1.67 × 1.6 | barkPine | 0.015/6 |  |
| 120 | barkDark_m | alias of barkDark | PH bark_brown_02 | 1 | 1.67 × 1.5 | barkDark | 0.015/6 |  |
| 121 | barkPalm_m | alias of barkPalm | PH palm_bark | 1.86 | 1.55 × 1.86 | barkPalm | 0.015/6 |  |
| 122 | leafPine_m | alias of leafPine | composited from polyhaven model:pine_tree_01 needle twigs | 2 | 2 | — | 0.02/14 | alpha cut-out |
| 123 | leafCypress_m | alias of leafCypress | composited from polyhaven model:fir_tree_01 twigs | 1.5 | 1.5 | — | 0.02/14 | alpha cut-out |
| 124 | leafOlive_m | alias of leafOlive | composited from polyhaven model:shrub_02 leaves | 1.5 | 1.5 | — | 0.02/14 | alpha cut-out |
| 125 | leafOrange_m | alias of leafOrange | composited from polyhaven model:island_tree_01 leaves + drawn fruit | 1.2 | 1.2 | — | 0.02/14 | alpha cut-out |
| 126 | leafPalm_m | alias of leafPalm | built from polyhaven model:fern_02 frond | 3 | 3 | — | 0.02/14 | alpha cut-out |

Painted tiles (kind "painted") are drawn by a painter function into a 240×240 design space and rendered at the layer resolution (512² on medium/high):
- facade bays `win`, `balc`, `neo`, `neoC`, `villaW`, `small`, `plain`, `lobby`, `neoDoor`, `trim`, `church`: one tile = one bay (≈3 m wide) × one storey (≈3.1 m); background is the
  white stucco photo, so the vertex colour paints the wall; glass panes are in the glass mask.
- ground floors `shopA`, `shopB`, `cafe`, `shutter`, `garage`, `pilotis`: one tile = one bay × 4.2 m; `office`: curtain wall, 3 panes × 2 rows.
- `awnS/awnG/awnR` awning stripes, `rail` wrought-iron railing (cut-out, tint carrier), `fence` welded mesh (cut-out, tint carrier), `glassR` glass roof/balustrade,
  `solar` panel, `train`/`trainF` Line 1 car side/front, `kiosk` front, `ad` poster, `paint` road paint on asphalt, `white` plain white (emissive at night when `glow`>0).
The buildings agent is expected to replace most facade/shop tiles with real geometry; they stay available.

## 4. Adding materials: `defTile(name, painter, opts)`
Call it **at script load** (top level of your file — `10_atlas.js` is loaded before you), before `boot()` builds the array. It returns the tile id and sets `T[name]`.
```js
// painted layer: g = 2D context in a 240×240 design space (S = 240), m = mask context (paint WHITE where the surface is glass / emits light at night)
defTile('menuBoard',(g,S,m)=>{g.fillStyle='#111';g.fillRect(0,0,S,S);g.fillStyle='#ffd27a';g.font='bold 20px Arial';g.fillText('PITA GYRO  3.90',12,40);m.fillStyle='#fff';m.fillRect(0,0,S,S)},
        {spec:.05,shin:40,glowK:2.2});
// image layer shipped with the game (square image, any size; scaled to the layer size)
defTile('mosaic',null,{src:'interiors/mosaic.webp',rep:1,nrm:'pavers',spec:.05,shin:30});
// painter on top of a photo: declare the photo layers you draw with texSrc() in opts.needs
defTile('plasterSign',(g,S)=>{g.drawImage(texSrc('plasterC'),0,0,S,S);/* … */},{needs:['plasterC'],nrm:'plasterC'});
// same image, other shading/scale
defTile('marbleFloor',null,{alias:'marble',rep:.5,spec:.12,shin:90,refl:.12});
```
Options: `rep` (number or `[u,v]`: texture repeats per caller UV unit, default 1) · `cut` (alpha cut-out: leave holes transparent; use with `chunk.cut` / `MAT.cut`) ·
`nrm` (name of a PHOTO tile whose normal map to use; `nrmRep` uv multiplier, `nrmK` strength) · `spec` (specular F0, default .03) · `shin` (Blinn exponent, default 12) ·
`refl` (mirror-like sky reflection 0..1: polished stone .05, water .5–.85) · `glass` (reflectivity of the masked area, 1 = window glass) · `glassDark` (how much the masked area
is darkened by day, 0..1) · `glowK` (night emission of the masked area × the vertex `glow`, default 1.7) · `macro` (large-scale tint variation 0..1 that hides tiling) ·
`transl` (leaf back-lighting) · `flow` (uv drift for water) · `vc` (0..1, default 1: how much of the vertex colour's HUE is applied — its brightness always is; foliage, hedges and grass use .3 so the photo keeps its natural green while callers can still darken/lighten per vertex) · `alias`, `src`, `photo`, `needs` as above.
- `paint(tileId, painter, cut)` (legacy) replaces the painter of an existing tile. `texSrc(name)` returns the canvas of a photo layer (only for names listed in some tile's `needs`).
- **After boot**: `defTile()` on an existing painted tile repaints and re-uploads just that layer (cheap, with its own mip chain) — use this for content that changes
  (a menu board per shop). A brand-new painted/image tile registered after boot takes one of `TEX.spare` (= 4) spare layers; when they are used up it falls back to plain
  white and logs a warning. So: register at script load whenever you can.
- Cost: every layer is 1.33 MB of GPU memory on medium/high (0.33 MB on low). There are 255 ids at most (aliases and `TM` twins use ids but no memory). Please keep new layers ≤ ~16 per agent.

## 5. The world material
`MAT.atlas` (opaque), `MAT.cut` (alpha cut-out, double sided), `MAT.leaf` (cut-out foliage cards: normals are not flipped on back faces, light shines through, leaf-shaped
shadows through `MAT.depthCut`), `MAT.signs` (the 2D sign atlas, legacy Lambert material). `worldMat({cut,leaf})` makes another instance if you need one (same program).
One program per variant; everything else is per-vertex/per-tile data, so **do not create materials per object** — use tiles.
Geometry must come from `GB` (attributes `position, normal, uv, color, aRect, aGlow`); instanced meshes work.
What the shader does per pixel: colour layer × vertex colour × macro variation (a noise layer in world space, strength `macro`) → normal from the tile's normal layer
(derivative tangent frame, so any UV orientation works) → sun (shadowed) + sky/ground hemisphere + Blinn specular (`spec`,`shin`) → sky reflection (`refl`, and the glass mask
with a Fresnel term) → street-lamp/shop light from the light map at night → night emission of the mask → haze.
- **Glass / emissive mask** (painted tiles): the painter's mask context `m`. By day masked pixels are darkened (`glassDark`) and reflect the sky; at night they emit
  `colour × glowK × glow` — with the vertex `glow` flag as the per-quad switch/brightness (lit window, dark window, shop window open/closed).
  Photo tiles have no mask. Cut-out tiles cannot have one (alpha is the cut-out).
- sRGB: colour layers are sRGB textures (decoded by the GPU), lighting is linear, output is ACES tone-mapped sRGB. Do not gamma-correct anything yourself.
- Night glow of signs (`MAT.signs`) is unchanged: alpha 128 in the sign atlas = emissive.

## 6. Lights and shadows
- `sun` (DirectionalLight) is the sun by day and the moon at night; `hemi` (sky/ground bounce) and `amb` are driven by `82_sky.js` every frame. Do not set their colour or
  intensity from other modules (if you must override them for a frame — e.g. an interior — do it in `scene.onBeforeRender` and restore in `onAfterRender`).
- **Two shadow cascades**: `sun` renders a tight box (medium: ±30 m at 1024² ≈ 6 cm per texel, high: ±36 m at 2048²) around what the camera looks at, every frame;
  `sun2` renders a wide box (±125 m / ±150 m) every 8th frame. A patch of three's light loop (in `00_core.js`, applied to **every** lit material: world, people, cars,
  interiors) blends the two and applies the sun's light once; `sun2.intensity` is 0 on purpose. **Do not add other shadow-casting DirectionalLights**; point/spot lights are fine.
- Soft-shadow filter is patched to 3×3 taps with quadratic weights (9 texture reads instead of three's 16).
- **Wind**: `MAT.leaf` / `MAT.depthCut` on INSTANCED meshes sway in the wind (crown lean grows with height above the instance origin, plus a small per-card flutter; phase from the
  instance position; shadows sway with the leaves). `U.wind.value` = (dirX, dirZ, strength) — `82_sky.js` animates the strength in slow gusts; set it from gameplay if you want a storm.
- **Horizon glow**: around sunrise/sunset the world material gets a warm fill light from the bright sky around the low sun (`U.glowC`, driven by `82_sky.js`).
- Set `mesh.castShadow` / `mesh.receiveShadow` as usual. Thin alpha cut-outs cast correct shadows only if the mesh uses `MAT.leaf` (automatic) or you set
  `mesh.customDepthMaterial = MAT.depthCut` yourself.
- `Q.sh` (near map size, 0 = shadows off on `low`), `Q.sh2`, `Q.shN`, `Q.shF` describe the cascades; `applyQuality()` (re)configures them.

## 7. Sky, time of day, night
- `tod` (hours 0–24, global, writable — missions set it), `todRate` (game hours per real second, default 1/60 = one game minute per second), `updateSky(dt)` per frame.
- The sun follows the real path for Kifisia (38.07°N) on a mid-August day in local time: sunrise ≈ 06:44, solar noon ≈ 13:29, sunset ≈ 20:14. `sunDir(hour, outVec3)` → elevation in degrees.
  `sunV` = direction to the sun, `lightV` = direction to the current key light (sun or moon), `SKY.elev` (deg), `SKY.night` (0 day … 1 night; lamps and windows come on
  as it rises — the same value is `U.night.value`).
- Everything is keyed on the sun's elevation (table `KEY` in `82_sky.js`: sky zenith/horizon colours, sun colour/intensity, hemisphere light, exposure). Tone mapping is ACES.
- The sky is a dome shader (gradient, sun disc and glow, drifting clouds, stars and moon at night, the hazy ridges of Penteli and Parnitha on the horizon). Its horizon colour
  is exactly the fog colour, so distance fades into the sky. Fog: `scene.fog` near = 0.6 × `Q.dist`, far = `Q.dist` − 8; towards the sun the haze takes the warm horizon colour.
- **Night light map** — a top-down texture of lamp light sampled by the world material, so lamps really light the pavement, walls and trees around them with no
  real-time lights. Register lights while building: `addLight(x, z, radiusM, kind, strength)` — kind 0 = warm street lamp, 1 = white light (shop windows, floodlights, kiosks).
  If nobody registers kind-0 lights, `MAP.lamps` is used; shop fronts in `SHOPFRONTS` get a strip of white light in front of them. Light reaches ~3–9 m above the ground.
  Registering after boot rebuilds the map (~0.1 s). Lamp HEADS should be `T.white` (or any masked tile) geometry with `glow` = 1: they then shine at night.
- **Reflections**: `skyEnv()` returns a PMREM environment rendered from the sky dome; `useEnv(material)` registers a MeshStandard/Physical material so that its `envMap`
  is refreshed as the light changes (cars use it). Call `useEnv` for every reflective material you create (glass, chrome, shop windows made of real geometry).
- **Interiors**: while `player.interior` is set the exposure is pinned to `SKY.indoorExposure` (0.8) so a room looks the same at noon and at midnight; the lamp light map
  is black outside the map bounds, so interior cells placed far away get no street light. The sun/hemisphere are NOT changed by this module (the interiors module overrides them per frame).

## 8. Quality presets and memory
| preset | pixel ratio | layers | normal maps | shadows | view distance | MSAA | texture memory (colour + normal arrays, with mips) |
|---|---|---|---|---|---|---|---|
| low | 0.7 | 256² | none | off | 170 m | off | ≈ 28 MB |
| medium | 1.0 | 512² | 256² | 2 × 1024² | 240 m | on | ≈ 116 MB |
| high | 1.4 | 512² | 512² | 2 × 2048² | 320 m | on | ≈ 136 MB |
(82 colour layers incl. 4 spare; 41 normal layers.) Changing the preset in the pause menu rebuilds the arrays in the background (`texQuality()`, called by `applyQuality()`).
`SETTINGS.aa=false` (localStorage `gk2_settings`) turns multisampling off. Download size of `gk3/tex/`: 8.2 MB (3 colour sheets .webp, 1 alpha sheet, 3 normal sheets .jpg, manifest).
Texture loading at boot: decode 7 images, upload 80 layers, yielding to the page between layers; progress is reported through `setLoad()`.

## 9. Pipeline (`tools/tex/`)
- `ph_fetch.py`, `ph_fetch_maps.py` — download Poly Haven 1K diffuse/normal maps and model leaf textures into `texraw/` (ambientCG is blocked by this machine's proxy, so everything is Poly Haven).
- `build_layers.py <out dir>` — grades every photo in linear light to a target mean colour, flattens low frequencies (hides tiling), builds the generated layers
  (curb, tactile paving, pool/pond water, foliage cards and hedges from scanned leaf sprites, noise), packs 4×4 sheets of 512² cells and writes `manifest.json`
  (`{S, colour:[{f,l:[names]}], alpha:[…], normal:[…], meta:{name:{m: metres per repeat, src}}}`).
  To add a photographic material: add a line to `PHOTO` in `build_layers.py`, run it, then `P('name', rep, {…})` in `10_atlas.js` (rep = caller UV unit in metres ÷ photo repeat in metres).
- `mshot.js` — screenshot runner that waits for rendered frames (not wall-clock time): `node tools/tex/mshot.js <prefix> <views.json> 900x420 medium [nohud] [noaa]`.
- `tiletable.js` — prints the table of §3 from the code and the manifest.

## 10. Credits
All photographic sources are **CC0** from Poly Haven (polyhaven.com); the exact asset ids are in §3 and in `docs/CREDITS.md`.

## 11. Verified / known gaps (updated as the work proceeds)
- Verified in the headless harness (SwiftShader) on medium, in MAIN: boots without errors, day / golden hour / dusk / night views, both shadow cascades, night light map.
- Verified 2026-11-21 09:40 with `tools/tex/mtest.js` on MAIN (all checks passed, no page errors): late `defTile()` after boot takes a spare layer, repaint keeps its layer, spare layers exhausted → warning + white fallback, `tileM()`, runtime preset switch low → high → medium (texture sizes 256/512/512, shadows off on low), no-WebGL2 message on the loading screen.
- No real phone was available to this team: frame-rate numbers do not exist; budgets are judged by triangles, draw calls and texture memory.
