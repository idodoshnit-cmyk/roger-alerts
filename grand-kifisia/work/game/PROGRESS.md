# game agent — PROGRESS (movement / camera / HUD / menus / missions / ambience)

Private copy: work/game/gk3. Shots: work/game/shots. Test scripts: work/game/tests/.

## Plan (milestones)
1. [ ] 80_player.js: velocity-based controller (sub-stepped collision, curb smoothing, slide), SmoothDamp camera (on foot / indoors / car), FRAME_HOOKS.
2. [ ] 90_main.js: touch input (floating stick + drag-look inertia), keyboard/mouse, main loop with __gk.step(dt) for scripted tests. boot() untouched except my lines.
3. [ ] 85_hud.js: HUD (radar w/ GPS route, cash anim, health, clock, objective, subtitles w/ speaker, toasts, edge objective arrow, onboarding).
4. [ ] 86_map.js: vector map (Path2D), routing on ROADS graph (route()), pan/zoom big map, waypoint.
5. [ ] 87_missions.js: mission framework + 6 missions + dialogue + shops + interactions.
6. [ ] 88_menu.js: title menu, pause tabs (MAP/BRIEF/STATS/SETTINGS/CREDITS), persistence (SAVE), new game confirm.
7. [ ] 84_ambience.js: WebAudio ambience + footsteps + stingers.
8. [ ] index.html: markup + CSS (local fonts in gk3/fonts/), responsive portrait/landscape, lefty.
9. [ ] Verify: movement tests 30/120 Hz, all missions scripted, screenshots 844x390 + 390x844. docs/GAMEPLAY.md, CREDITS.md. Integrate.

## Decisions
- 85_hud_missions.js is split into 85_hud.js, 86_map.js, 87_missions.js, 88_menu.js (old file deleted from main at integration; index.html script list updated).
- Fonts shipped locally (OFL): gk3/fonts/*.woff2 (Bebas Neue, Inter variable, Barlow Condensed 600/700) — no Google Fonts link any more.
- Kept globals other modules use: player, ph, input, keys, camYaw, camShake, hurt(), subtitle(), banner(), objective(), sfx (theirs), INTER contract, running, sheet()/closeSheet(), openShop(), mission, startMission(), endMission(), use(), useTarget, window.__gk (extended).
- #play stays the element that starts the game (harness clicks it); #loadTxt, #sheet kept.

## Status log
- 15:00 read all docs/code, baseline shots (work/game/shots/base_*). Fonts fetched from npm (@fontsource).
