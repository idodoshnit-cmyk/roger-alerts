# interiors agent — progress log
Private copy: work/interiors/gk3. Owned: gk3/js/35_interiors.js, gk3/interiors/**, docs/INTERIORS.md.
Raw downloads (not shipped): work/interiors/raw/. Scratch tools: work/interiors/tools/. Shots: work/interiors/shots/.

## Plan (milestones)
1. [ ] Infrastructure in js/35_interiors.js: INTERIORS registry, cell kit (local-coordinate builder on GB), own lit atlas material + glow material + glass,
       enter/exit with fade, INTER hooks, scoped light override (scene.onBeforeRender/onAfterRender), camera clamp, people, indoor minimap.
2. [ ] Texture atlas: CC0 photo tiles (Poly Haven) -> gk3/interiors/tiles_c.jpg (+ normals tiles_n.jpg) built by work/interiors/tools/build_atlas.py; painted tiles at runtime.
3. [ ] Mythos Plus full detail (showpiece).
4. [ ] PAUL, Starbucks, KFC, AB Vasilopoulos.
5. [ ] Exterior door portals at the real facades.
6. [ ] Verify (walk-in scripts, buy, Gyro Run, exit, day/night, stats), docs/INTERIORS.md, CREDITS.md, integrate into main.

## Decisions
- Cells live at x>=3000,z>=3000 (outside terrain grid on both axes => terr() is the constant corner height 65.59, lvl()=0 => flat floor, groundY works unchanged).
- Each cell is authored in LOCAL coords: origin = street-door centre on the inner face of the front wall, +z = out to the street (door normal), -z = into the shop,
  +x = right-hand side when entering. Group rotation.y = atan2(nx,nz) of the real shopfront => same compass orientation as reality.
- Own meshes (lazy build on first entry), NOT world chunks: own atlas texture + own material so the module is independent of the materials agent's rewrite.
  Only contract used: GB (attribute layout position/normal/uv/color/aRect/aGlow) and scene lights.
- Lighting: scoped override in scene.onBeforeRender (sun off, hemi/amb set, 2-3 point lights visible only inside), restored in scene.onAfterRender; baked vertex AO/light pools.
- Furniture collision uses kind 'w' (not jumpable), shell walls kind 'b' (camera ray stops at them).

## Status log
- [start] read all docs + modules; working copy created.
