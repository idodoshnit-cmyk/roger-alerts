# Grand Kifisia — gameplay layer (game agent)

Files: `js/80_player.js` (save, player controller, camera, action/aim hooks), `js/84_ambience.js` (synth ambience, footsteps, UI sounds),
`js/85_hud.js` (HUD, radar, onboarding, overhead tags), `js/86_map.js` (vector map, road-graph routing, GPS, big map),
`js/87_missions.js` (events, shops, dialogue, interactions, mission framework, markers), `js/87b_mission_data.js` (the six missions, the school fence, IB students),
`js/88_menu.js` (title menu, pause menu tabs, new game, opening cinematic), `js/90_main.js` input + main loop (boot() is shared and assembled verbatim from main),
`index.html` markup + CSS, `fonts/` (local OFL fonts). The old `85_hud_missions.js` is gone; every global other modules used from it still exists.

## Controls
- Touch: the half of the screen on the stick side (left; right when "left-handed" is on) below the top 28 % is a floating analogue stick (dead zone 14 %, response curve ^1.2,
  the base follows a drifting thumb). Everything else is drag-to-look with inertia (flick to keep turning). Every touch is tracked by id: move + look + a button at once.
  Buttons: USE (contextual, appears with a label), Car (pulses gold when a car is within reach: one tap gets in), Punch/Shoot, Sprint (toggle; lets go when the stick is released), Jump.
- Driving on touch (OWNER_BRIEF 15, "much simpler"): one finger. A thumb anywhere on the stick side steers — only its sideways distance counts (the knob slides on a
  horizontal rail and follows the thumb vertically); dead zone and response curve are applied in `driveCar` (72_driving.js, cars agent). Auto-throttle (`DRV.auto`, cars agent,
  default on; Settings → "Auto-throttle when driving" calls `setAutoThrottle(on)`): finger down = drive, lift = coast down. Big red BRAKE: hold to stop, keep holding to reverse.
  Car / Exit: one tap; when moving, 72_driving brakes to a stop and then gets out (`DRV.exitReq`). Keyboard driving stays manual (W gas, S brake/reverse, A/D steer, Space handbrake).
- On foot: speed follows the stick through a critically damped spring (`sdamp`, `player.spdV` = current acceleration): starts ease in, stops ease out, nothing overshoots,
  identical at 30/60/120 Hz. From a standstill a big change of direction is a turn in place (≈10 rad/s, the legs step round in 60_people) before the character sets off;
  while running the turn rate falls with speed and a reversal pivots first.
- Transitions: getting into / out of a car dips the screen (`tfDip(fn, depth)` in 90_main.js, own overlay, eased per frame; the dip also follows the last metres of an
  automatic stop-then-exit). Shops fade through black (35_interiors.js `fade`). Missions use `fadeCut(fn, ms)` (87_missions.js).
- Keyboard: WASD/arrows move, Shift sprint, Space jump, E/Enter use, F car, J/H punch or horn, M map, Esc/P/Tab menu, C recentre the camera; mouse drag looks, wheel zooms.
  In the menu: ←/→ or Q/E switch tabs; on the map +/− zoom, WASD pan, C centre. In dialogue: 1–3 pick, E/Enter/Space first choice, Esc close.

## Hooks for other modules
- `FRAME_HOOKS.push(dt=>…)` — called every simulated frame while the game runs.
- `INTER.push({x,z,r?,label,fn,when?})` — contextual USE action (unchanged contract). Mission steps and `onGame('interactions', d=>d.opts.push({label,fn,low?}))` add more;
  `low:true` options lose against normal ones (talking is low).
- `onGame(name, fn)` / `gameEvent(name, data)` — event bus. Events emitted: `start {fresh}`, `use {label}`, `talk {npc}`, `buy {shop, item, tag, price, eat}`, `enterCar {car}`,
  `exitCar {car}`, `horn`, `punch {npc}`, `fence {inside}`, `missionStart {id}`, `missionEnd {id, passed}`, `interactions {opts, near}`.
- `registerAction({id, label|()=>label, key:'KeyQ', onDown, onUp, visible:()=>bool, hold})` — extra touch button + key (weapons module). `setAimMode(on)` — over-the-shoulder aim
  camera + reticle (`body.aim`). `aimRay()` → `{o,d}` centre-screen ray. `weaponsAllowed()` — the OWNER_BRIEF weapons rule (never indoors, in a car, busy, in a mission with
  `noWeapons`, inside or within 150 m of ISA). `hudWeapon(name, ammoText)` / `hudWeapon(null)` — weapon slot under the clock. Missions equip/holster by listening to
  `missionStart`/`missionEnd` and reading `mission.M.noWeapons`.
- People: any NPC record may set `dialog(p)` (own dialogue), `lines` (+ `linesOnly:true` → a random line each time with `replies:[a,b,c]`), `useLabel`, `noTalk`, `noPunch`,
  `tag:'Text'` + `domTag:true` → a floating gold DOM name tag above the head (85_hud.js `hudTags`, ≤ 34 m, fades from 22 m), `tagH` head height in metres (default 2.08).
  (Cast characters from models/cast.json get their own sprite label from 75_npc.js `castLabel`; hudTags does not draw those.)
- Feedback: `subtitle(text, secs, speaker)`, `banner(title, sub, isFail, rewardText)`, `objective(html)`, `toast(text, icon)`, `hudTimer(secs|null, warnAt)`,
  `hudGauge(label|null, 0..1, colour)`, `hudDetect(0..1|null)`, `cinema(on, title, sub)`, `addMoney(delta, label)` (animated, counts into STATS), `spend(amount, label)` → bool.
- Camera: `camCut(secs, (t,dt,elapsed)=>{…set camera…}, {title, sub, noSkip, noBars, keepBars})` → Promise(skipped). `camShake` (add to it), `camBoomMax`.
- Map/GPS: `route(ax,az,bx,bz,'walk'|'drive')` → `{pts, len}` along the real road graph; `setWaypoint(x,z,label,quiet)`, `clearWaypoint(quiet)`, `streetName()`, `districtName()`.
- Shops: `openShop(keyOrDescriptor)` works for the five specials, any `INTERIORS[key].menu`, and any descriptor `{name, category, items:[[name, price, tag?]]}`; buying emits `buy`.
- Dialogue: `say(who, text, [{t, f}], {npc})`, `dlgPick(i)`, `dlgClose()`, `talkTo(npc)`.
- Menu: `openMenu('map'|'brief'|'stats'|'settings'|'credits')`, `closeMenu()`, `menuTab(name)`, `startGame({fresh})`, `openingCinematic()`.

## Missions
`MISSIONS.push({id, title, icon, sub, giver?, reward, brief, at:()=>({x,z}), onFoot?, noWeapons?, time?(hour), todRate?, timeLabel?, setup(m), tick(m,dt), cleanup(m), retry(m,cp),
focus(m), bonus(m)→[euro,label], passed(m), after:[speaker,line], timeFail, on:{event(m,data)}, steps:[…]})`.
A step: `{type:'goto'|'interact'|(none = custom), text|text(m), at(m), r, checkpoint, time, warnAt, onFoot, inCar, stop, gps, path(m), marker, say:[who,line,secs],
label, use(m)→false keeps the step, needs:{shop,tag}, opts(m,opts,near), enter(m,retry), tick(m,dt), done(m,dt), fail(m)→reason, exit(m), on:{event}}`.
- `goto` completes within `r` of `at`; `interact` shows a USE label within `r` and completes after `use`; custom steps complete when `done(m)` is true.
- Checkpoints snapshot position, timer, time of day and `m.data`; failing offers "Try again from checkpoint" or "Quit" (no reload). `startMission(id,{skipIntro, step})`,
  `missionNext()`, `failMission(reason)`, `retryMission()`, `quitMission()`. Replays pay half. A gold beam marks each mission start; walking into it offers the mission.
- The six missions: Gyro Run (Mythos Plus → Nikos at Platanos, hot-food timer), A Gyro for a Stranger (Mr. Lefteris beside the cosmetics store; coin/story/lunch),
  Line 1 to the Mall (ticket, validator, board the train), Walk to School (the real route `MAP.route` to the ISA gate before the 08:30 bell, commentary per street),
  After Hours (climb the ISA fence, avoid the guard's torch, three baskets with a timing meter, climb out), Kefalari Valet (drive a car to the hotel; damage meter, timer;
  picks an exotic car type when `CARTYPES` has one).
- Verified by `work/game/tests/missions.js`: every mission start → payout, plus fail → retry.

## ISA IB students (OWNER_BRIEF 13)
The characters module provides them (models/cast.json ids ib_gate / ib_starbucks / ib_platform, `label:"ISA IB Student"`, IB-only `castDialog`, see docs/CHARACTERS.md).
87b `ibStudents()` is only a fallback: on the `start` event it spawns three tagged students (ISA gate, outside Starbucks, station platform; `linesOnly` IB lines) if and only
if no cast character with an "ISA IB Student" label/tag exists.

## Save format and settings
- `localStorage` via `store` (00_core.js, key prefix `gk2_`), always in try/catch. `save` = `{v:3, money, done:{id:count}, best:{id:secs}, flags:{onb:{…}}, tod, pos:[x,z,yaw],
  stats:{earned, spent, walked, driven, played, passed, failed, talked, gyros, coffees, baskets, rides, topSpeed, cars, punches, given, knocked}}`. Saved every 15 s, on pause,
  on hide and after every payout. Position is only saved on foot, outdoors, outside missions.
- `settings` = `{q:'auto'|<any QP preset>, sens, invY, lefty, vol, fps, haptics, subs}`; 'auto' resolves through `autoQuality()` when the materials module provides it. Auto-throttle is stored by 72_driving (`gk_autogas`).
- New game (title or SETTINGS tab) asks for an in-page confirmation, then wipes the save, respawns at the junction and plays the opening cinematic.

## Title, menu, opening
- Title: photo slideshow, PLAY/CONTINUE (+ save summary), NEW GAME (with confirmation), SETTINGS, CREDITS. `#play` always starts the game (the harness clicks it).
- Pause menu tabs: MAP (search box "Find a shop, café or place…" over every named shop/amenity in the map data and every landmark — accents folded, Greek input
  transliterated, nearest first, tap a result = GPS route + zoom to it; `mapFind(text)` returns `[{name,sub,x,z,col}]`), pan/pinch/wheel zoom, legend under KEY, tap a street/shop/mission to set a GPS route, tap the pin to clear), BRIEF (active/available/passed with
  rewards; GPS, Start/Replay, Retry, Quit), STATS, SETTINGS, CREDITS. The world stops rendering while the menu is open.
- Opening cinematic (new game only, skippable): aerial orbit over the centre → Kifisia station → glide along Kassaveti → down behind the player at the junction.

## Known gaps
- Mission intro shots avoid buildings and street trees but can still clip a garden tree.
- Map labels can overlap where several missions/streets meet.
- Footstep surfaces come from the road/sidewalk data only (no per-material floor sounds indoors).
