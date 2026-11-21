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
- 20:15 RESUMED (session 2). State found: work copy has UNTESTED drafts of 80_player.js (controller+camera+save), 85_hud.js, 86_map.js (vector map, route(), GPS, big map),
  87_missions.js (events, shops, dialogue, interactions, mission framework). NOT yet written: index.html (new markup/CSS), 90_main.js (input+loop), 87b_mission_data.js, 88_menu.js, 84_ambience.js.
  Nothing integrated yet. Synced copy from main (mats+chars changes; boot() in 90_main.js changed by mats -> keep main's boot()).
  PRIORITY NOW: write the 5 missing files minimal-but-complete, one harness run, INTEGRATE, then iterate in small integrated steps.

## OWNER UPDATE (from the project lead — newest demand, act on it)
- The owner again: "improve the control of the player". Treat movement/camera/touch feel as your first deliverable; integrate it into MAIN as soon as it is clearly better than what is there.
- "Add guns": a separate weapons bot will build js/81_weapons.js (paintball markers and toy blasters only — see the Weapons rule in docs/OWNER_BRIEF.md). Give it clean hooks and document them
  in docs/GAMEPLAY.md: registerAction({id,label,key,onDown,onUp,visible}) for extra touch buttons/keys, a HUD weapon/ammo slot, setAimMode(on) for an over-the-shoulder aiming camera with a reticle,
  and a way for missions to equip/holster. You do not build the weapons themselves.

- 00:50 (Nov 21) RESUMED (session 3). Found MORE than the log said: work copy ALSO has index.html (new markup/CSS, 377 lines) and src/90_head.js + src/90_tail.js
  (input + main loop + debug hook), assembled into gk3/js/90_main.js by work/game/tools/build_main.py (boot() is taken verbatim from MAIN; `--main` writes MAIN too).
  Still missing: 84_ambience.js, 87b_mission_data.js, 88_menu.js. Nothing integrated, nothing run yet. Main changed only in mats files (atlas/sky/tex).
  NOW: write the 3 files -> one harness run -> integrate (delete main 85_hud_missions.js, replace index.html (I own it), build_main.py --main).
- 08:50 (Nov 21) RESUMED (session 4). Wrote 88_menu.js (MENU, openMenu/closeMenu/menuTab/menuKey/menuMapInfo, titleReady, startGame, newGame w/ in-page confirm, openingCinematic 4 shots).
  Fixed: stationFront name clash with 30_buildings (renamed stationDoorPt in 87b), radar never initialised (radarResize in startGame), #wslot markup added (hudWeapon), dlgOpen body class hides pads/keys.
  Smoke test (tests/smoke.js) passes with 0 errors at 844x390: title, play, walk, HUD, all 5 tabs, dialogue, gyro intro. NEXT: portrait run + gyro playthrough -> INTEGRATE.
- 09:10 INTEGRATED into main: index.html, 80_player, 84_ambience, 85_hud, 86_map, 87_missions, 87b_mission_data, 88_menu, fonts/, 90_main (build_main --main, boot verbatim); deleted main js/85_hud_missions.js. Backups of previous main files in work/game/tmp/*.prev.*. Smoke on main: 0 errors. NEXT: scripted playthrough of all 6 missions, GAMEPLAY.md, CREDITS fonts.
- 10:30 IB students (tag labels via hudTags, linesOnly dialogue, fallback spawner on 'start' event), docs/GAMEPLAY.md written, CREDITS fonts appended. Waiting for browser slot to verify IB (tests/ib.js), then integrate 85_hud/87/87b/88/index.html.
- 12:50 UTC (Nov 21) RESUMED (session 5). IB students (85_hud hudTags, 87 linesOnly, 87b ibStudents, 88 'start' event) were NOT yet in main. Synced copy from main (21 files), .ntag CSS added to MAIN index.html + copy.
  New orders (ORDERS.md 12:50): interiors+game "every shop enterable, Enter <name>, test 10 shops" -> tests/shops.js; cars "driving much simpler" -> my part = touch layout (one-finger steer, auto-gas, big brake, auto-reverse) + car camera.
- 13:25 written in copy (NOT yet integrated, test queued: tests/all.js = shops.js 844x390 + drive.js 390x844, log tmp/all_a.log):
  one-finger driving (90_head joySet car rail steer; 80_player readStick auto-gas while thumb down, CARX{t,exit,cruise}; carBtn exit-at-speed auto-brake; index.html big BRAKE pad, bCar.ready pulse;
  85_hud ONB_DRIVE hint; 88_menu setting autoGas), map search (88_menu mapFind + #mapFind CSS), districtName shows INTERIORS name indoors. GAMEPLAY.md updated.
  NEXT: read all_a.log + shots -> fix -> integrate 80/85/86/87/87b/88 + 90_main(build_main --main) + index.html (hand-merge into MAIN: CSS blocks + bBrake markup).
- 17:50 UTC RESUMED (session 6). Found: cars integrated their own one-finger/auto-throttle driving (72_driving DRV.auto/setAutoThrottle/exitReq) and shared edits in MY main files
  (90_main joySet, index.html #bBrake layout, 80_player portrait car boom); chars integrated IB students with sprite tags + castDialog (p.dialog).
  RECONCILED copy: 80_player = main's; dropped my CARX auto-gas/exit-at-speed + ONB_DRIVE (duplicates); menu toggle now calls setAutoThrottle; hudTags only for n.domTag (my fallback students);
  joySet keeps my rail (linear, cars do curve); index.html = main + brake label/ready pulse/mapFind CSS. Synced 18 files from main.
  Testing a frozen snapshot (work/game/snap, tests/run_snap.sh <pfx>, log tmp/all_<pfx>.log) so I can keep editing gk3 while it queues. Run 'c' queued 17:55.
  NEXT: integrate after 'c' passes; then ORDER 13:10 smooth movement (accel/decel curves, turn-in-place, start/stop blends, fades for car/shop transitions).
- 18:15 copy also has: speed as critically damped spring (sdamp; player.spdV) for eased starts/stops, turn-in-place pivot from standstill (10.5 rad/s, speed held ≤0.12-0.9 until facing),
  TF screen dip (90_head tfTick/tfDip, own overlay z18) for entering/exiting cars incl. following the auto-stop of DRV.exitReq. New test tests/feel.js (in all.js). Run 'd' queued (snapshot).
- 18:42 INTEGRATED into main: index.html, 80_player, 85_hud, 86_map, 87_missions, 87b_mission_data, 88_menu, 90_main (build_main --main equivalent: work build + integrate.sh).
  Verified on snapshot before: tmp/all_d.log (16 shops entered via "Enter <name>" -> counter -> order -> leave: 14/16 full OK; Bank sells nothing (paid 0), ΟΠΑΠ counter next to door;
  0 errors), FEEL 30/60/120 Hz: 90% run speed in 0.37-0.38 s, stop in 0.40-0.42 s, 180° turn in place 0.30 s with ≤0.10 m drift; tmp/drv_e.log 390x844: tap Car -> dip -> in car,
  auto-throttle drive, brake+reverse, exit at speed -> on foot, map search ok, 0 errors. Added after the test (syntax-checked only): initial body.touch/kb class (no pad+legend overlap
  before first input), walking hints paused while driving. Smoke on MAIN 390x844 queued (tmp/smoke_m6.log).
- 19:20 copy (NOT integrated yet, needs tests/f.js run): indoor minimap draws the interior floor plan (IN.alive.segs) + gold/blue dots for counter/door; useTarget picks the
  NEAREST option (mission step first) so "Leave" beats "Order" at a door next to a counter; xactBuild()/xactKey() implemented (registerAction buttons in #xact above the pad + keys;
  weapons noted it was missing). Waiting for smoke_m6 (main) -> missions_m6 (chained, main) -> then run tests/f.js on a snapshot.
