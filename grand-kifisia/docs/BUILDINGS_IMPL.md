# BUILDINGS_IMPL — buildings, shopfronts, roofs, landmarks (agent `buildings`)

Files: `gk3/js/30_buildings.js` (data, allocation, building shell, LOD cells, label atlas, roofs, landmarks, legacy sign atlas),
`gk3/js/31_shopfronts.js` (category groups, painted interior layers, shop specs, 3D shopfront builder),
`gk3/js/32_facades.js` (parametric facade generators per research-arch style class, lazy near-facade cells). Shared-file edits: `index.html` (31 and 32 after 30),
`js/90_main.js` boot: `if(typeof bldLoad==='function')await bldLoad();` right before `buildBuildings()`.

## Inputs (read at boot, all optional / feature-detected)
| input | used for |
|---|---|
| `MAP.buildings` (+ `b[11]` OSM tags: colour, material, roofShape, roofColour, height) | footprint 1:1, storeys, roof, colour/material |
| `MAP.pois` (team:data) | **where every shop is**: building `b`, edge `e`, position `t`, bay width `w`; bay kinds `shop` → shopfront, `plate`/`directory` → brass plates, `building` → name on the facade |
| `MAP.special` | special shops (door kept where `door` says: the interiors module uses it) |
| `MAP.addr` | blue enamel house-number plates on the facades |
| `gk3/data/shops.json` (research-shops) | the look of each shop matched by OSM id / name: sign text, colours, lettering style, awning, frame colour, door side, glazing, facade material, terrace; `building{}` descriptions → storeys, heights, colour, roof, stone/brick/timber walls, balcony type, setbacks, quoins |
| `gk3/data/census.json` | only when `MAP.pois` is missing (fallback allocation of tiers A/B to facades by own 1-D layout) |
| `gk3/data/buildings_spec.json` (research-arch) | **every building it describes** (matched by `MAP.buildings[i][11].id`): style class → parametric generator, levels, ground-floor and floor heights, roof (flat / flat_solar / hip / gable), roof colour, facade colour / material / base / trim, balcony type + rail + depth, set-back top floor, pilotis, awnings, features (stone_clad_base, shutters_green/brown, quoins, cornice, rusticated_plinth, pergola_top, ac_units, solar_water_heaters, partly_tiled_roof + roofPartColour, tympanum colour, cross gable / oculus…). Landmark classes (church, station, eclectic_pavilion) keep the hand generators and only take heights/colours. Buildings handed to LM bots are not built here. |

## What is built
- **Shell** (world chunks, every distance): plinth, ground floor (4.25 m when it has shops), upper floors at 3.1 m (neo 3.7, modern 3.35) unless research gives a height;
  painted bay tiles for plaster facades, punched windows with reveals/sills/frames for stone/brick/timber facades (research buildings); floor slabs; continuous balconies with
  glass / iron / solid / balustrade parapets; penthouse set-backs (inset polygon, terrace); neoclassical plinth/string course/cornice; flat roofs with parapet, coping, stair
  bulkhead, solar heaters & AC (`ROOFI`, instanced by 50_props.js), antennas; tiled hip roofs with eaves, soffits, ridge, chimney.
- **Shop bay** (shell): lit interior box behind the glass (category picture on the back wall: 12 kinds in layers `bInt0..2`, side walls, wood/marble floor, ceiling that glows
  at night), wall above the window, flat fascia band (far view).
- **Shop bay** (near cells, ≤ ~108 m on medium): frames, stall risers, mullions, transoms, door (side from research or the special door point), handles, glass (reflective
  transparent material), fascia board with the real name (crisp label atlas, Greek/Latin as in the data; lit at night), awnings (straight / canopy / striped, posts),
  green pharmacy cross, projecting bank boxes, house number by the door, display cards (mannequins, rail, plant, bistro set), café terraces only on pavement (`lvl()>0`),
  roller-shutter boxes and night shutters (21:30–08:30, not on cafés/bars/restaurants/pharmacies), Mythos Plus: brick-ringed arch with fanlight, capsule sign, black awning on posts,
  glass terrace screens, salmon facade, first floor set back behind a white balustrade.
- **Landmarks**: station portico (yellow, white pilasters, pediment, clock, ΗΣΑΠ sign; sets `STATION.front`), Agora round towers with tile cornices and conical roofs,
  church domes + bell tower. Hand-modelled landmarks by other bots (`89_landmarks.js` / `LM.register`) remove their buildings from the list before `buildBuildings()`;
  the original indices are kept (`b._i`), POIs on those buildings are left to the landmark (`BLD.landmarkPois`).

## Parametric facades (32_facades.js)
- `archProfile(B, rec)` → parameter set `B.P` (all choices hash-deterministic inside the ranges research gives per class): bay width, window/door sizes, frame / shutter /
  roller colours, awning colour + stripes, cladding, surrounds, pediments, cornice, plinth, eaves, quoins, balcony mode (`cont` continuous slab, `ind` individual, `rec` loggia).
- `bayLayout()` one letter per bay, the same on every floor (D balcony door, W window, T tall neoclassical window, S small, F slider, L loggia, G curtain wall, B blank);
  neoclassical fronts are mirrored symmetric.
- `buildShellP(B)`: ground floor (shop bays from MAP.pois, residential ground floors with pilotis / entrance / barred windows / stone base), upper floors with real
  openings (reveal, glass `gkWin` with curtains/blinds variants, frame, sill, roller box or louvred shutters `gkLouv`, pediments), continuous marble-edged slabs with
  aluminium (`gkAlu`) / iron / glass / masonry rails, fabric awnings (`gkFab`) per balcony door, individual balconies on consoles, AC units and planters, retiré top floor,
  parapet + coping or tiled hip roof (`hipRoof` for rectangles, `perimRoof` for any polygon), partly tiled roofs (`partTiled`), roof pergolas.
- LOD: chunk geometry (always): massing, slabs, balconies, rails, parapets, roofs. Far twin (`FAC` cell `.farM`): painted bays of the same rhythm. Near detail: built lazily
  per 32 m cell when the camera comes within `facD()` (42 / 62 / 88 m for low / medium / high) by re-running `buildShellP` in mode `'near'`, freed 30 m beyond.
  `facVis(x,z,force)` is chained onto `updateChunkVis` at finalize time.

## Public globals / interfaces
- `buildBuildings()`, `bldLoad()` (async, fetch data), `measureShopDepths/buildForecourts/inShopZone` (20_ground.js) read `SHOPFRONTS` — one entry per facade edge with shops `{a,c,nx,nz,L,n}`.
- `SHOPS_BUILT` (= `BLD.shops`): `{name,x,z (facade point),nx,nz,door:[x,z],w,group,cat,b,src,id,special,number,kind?}` for every shopfront and building sign.
- `BLD` `{list, byIdx, shops, plates, unplaced, stats, landmarkPois}`; `window.__bld` (debug).
- `labText(text, style, rowPx)` → atlas rect; `labQuad(G, rect, x,y,z, nx,nz, h, maxW, colour, glow)` — crisp text quads for anyone (`G` must be rendered with `LABMAT`; easiest: use `bcell(x,z).lab`).
- `bcell(x,z)` → near-detail cell `{o, cut, gl, lab, shut}` (GBs, built at the end of `buildBuildings()`; only usable during `buildBuildings`).
- Legacy (unchanged API): `newSlot`, `signAt`, `addSign`, `brandSlot`, `BRANDS`, `signC/sgx/SG`, `ROOFI`, `STATION.front`.
- `PLACED` kinds registered: `poi` (src = POI id, e.g. `osm:n…`, `ov:…`, `special:mythos`), `building` (src = OSM way id), `addr`, `entrance`.

## Budget (harness, medium, 844×390)
Whole frame 430–560 k triangles / 110–190 draw calls (all modules). Near-detail cells of this module: 16–30 draw calls, 19–27 k triangles in view.
Boot: buildings step ≈ 2.2 s (SwiftShader machine). Label atlas: 4096² R8 (16 MB + mips), 1117 labels, 3264 rows used.

## Building → source table
| building | source | what is real |
|---|---|---|
| all 948 footprints | OSM (survey) | footprint, position, levels when tagged |
| b294 Mythos Plus (Kassaveti 13) | research photo (shops.json building + sign/awning detail) | 2 floors / 8.5 m, salmon plaster, brick-ringed arch, steel glazing, door right, capsule sign, black awning on posts, glass screens, set-back first floor behind white balustrade |
| b426 Starbucks pavilion (Kassaveti 19) | research photo | 2 floors / 8 m, brick ground floor, dark timber upper floor with small-paned windows, timber balcony, hipped red-tile roof, chimney |
| b425 Ralph Lauren villa | research photo | 3 floors, limestone ashlar walls, quoins, white string course, hipped roof (detailed hand model may come from lm-ralphlauren) |
| KFC building (Kifisias 238-240) | research description | 3 floors / 12 m, neoclassical, cream, shutters, hipped tiled roof |
| b434 PAUL, b432 SEPHORA, b30 AB | research description / inferred | floors, colour, flat roof; shop fronts from shops.json |
| every other building | inferred | style class from map (apt / neo / villa / modern), colour from palette, balconies/parapet/setback chosen deterministically from the building hash |
| every shop sign | shops.json (photo/official/description/inferred per entry) or MAP.pois (OSM/Overture/census names) | the name is real; colours/lettering are research or inferred |

## Known gaps (kept honest)
- Generic buildings are style-class approximations, not per-building photo matches.
- Plates: at most 7 per spot are stacked (one census plate was dropped where more businesses share an entrance).
- Shop interiors are painted pictures (12 categories) with a few cut-out cards, not 3D rooms (walk-in rooms belong to the interiors module).
- No real phone was available: no frame-rate numbers.
