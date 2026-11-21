# chars agent — progress log

Private copy: work/chars/gk3. Pipeline: tools/chars/. Raw downloads: work/chars/raw/ (not shipped).

## Plan (milestones)
1. [x] Pick the cast from Rocketbox previews; fetch FBX + colour/opacity TGA  (tools/chars/avatars.txt, fetch_avatars.sh → raw/av_glb, raw/av_tex PNG 1024/512). 41 avatars downloaded.
2. [ ] Pipeline tools/chars/: GLB → compact .json (bone collapse, 2 LODs, quantised) + atlas textures (.webp, alpha = hair cut-out).
3. [ ] Animation pack: clips in tools/chars/anims_fetch.txt (fetch_anims.sh → raw/anim_glb) → 30 fps quantised packed .json. Root speed per clip.
4. [ ] Runtime 60_people.js: loader, Person class (own FK, no THREE.Bone), state machine, locomotion blend, look-at, breathing, foot IK, hand-keyed clips.
5. [ ] 75_npc.js: street life.
6. [ ] CAST registry + docs/CHARACTERS.md, CREDITS.md.
7. [ ] Verify (frame strips, crowd shots, stats, missions), integrate into main, delete rpm/michelle/anims.

## Decisions
- Own animation runtime: clips sampled at fixed fps into Int16 quaternions, own FK into skeleton.boneMatrices (bindMode detached, mesh = character space, y up, facing +z).
- Canonical skeleton tools/chars/skeleton.js: 23 body bones (+30 fingers, jaw, 2 eyelids for near LOD). Thighs re-parented to Pelvis, clavicles to Spine2 → only rotations + root pos in clips.
- Children use "Bip02" prefix → normalise to Bip01. Some avatars have no opacity material; Security_Male_01 has an "equipment" material.
- xy clips: Bip01 moves along +z together with node MotionExtractionHelper; in-place pose = Bip01 relative to helper. m_walk_neutral_01: 1.187 m per 1.167 s cycle.
- One draw call per character: atlas 768x512 (body 512², head 256², third slot 256² = hair opacity or equipment), alphaTest only in hair slot.
- Hand-keyed clips (punch, jump, climb, shoot, knockdown, getup, drive, eat) are authored in the PIPELINE (tools/chars/handkeyed.js) and packed like mocap.
- Compatibility API kept for other modules: Ped(look,force), .root, .play(name,once), .stop(), .update(dt,speed,air), .override, .look.fem, NPCS[], randomLook(), loadReal(), makeClips(), paintChar(), chC, charMat, updateLOD(), spawnPeople(), updatePeople(), placeNpc().

## Status log
- 14:30 avatars fetched (41). anim fetch running in background (raw/fetch_anims.log).
- 15:20 (resumed) pipeline verified: build_people.js → models/rb_people.json (41 avatars, 8.9 MB) + models/tex/*.webp (2.0 MB); build_anims.js → models/rb_anims.json (127 mocap clips, 2.5 MB).
- 15:30 NEW RUNTIME WORKS: work/chars/gk3/js/60_people.js rewritten (Person class, own FK/skinning, locomotion blend space, actions/activities/fidgets, look-at, lean). Verified in tools/chars/viewer.js (stand-alone viewer, boots in 2 s; `node viewer.js out.png '<strip json>'`). Walk/run/idle strips look right.
  NEXT: run full game with new people; hand-keyed clips (tools/chars/handkeyed.js: punch_r/l, shoot, climb, knockdown/lie/getup, eat, drive, sit_ground, give, pickup, air_up/air_down); foot IK; 75_npc.js street life; CAST + homeless; docs; integrate; delete rpm/michelle/anims.json.
- 16:10 hand-keyed clips done (tools/chars/rig.js = authoring rig with IK; tools/chars/handkeyed.js = clips; `node handkeyed.js` patches rb_anims.json in ~1 s): hk_punch_r/l, shoot, climb, knockdown, lie, getup, eat, drive, sit_ground, give, pickup, air_up, air_down. All viewed as strips, OK.
- 16:20 runtime foot IK (ikLeg), curb smoothing (sy), landing spring, seat height, verified with viewer "film" mode (one person simulated, n frames side by side): slope 20 %, 16 cm steps, jump.
  NEXT: 75_npc.js street life (seats/benches/bus/chat pairs/homeless/guard), props (phone/cup/paper/bag, chairs+tables if none exist), CAST registry, patch call sites (player avatar, guard), docs, integrate, delete old models.

## Session 2 (restart at 19:43)
- 19:52 **INTEGRATED v1 INTO MAIN**: js/60_people.js, js/75_npc.js, models/{rb_people.json,rb_anims.json,cast.json,tex/*.webp}; old rpm.json/michelle.json/anims.json deleted from main and from my copy. Main boots, no errors (shots/main1_*.png).
  - 60_people.js: Person handles 'player' alias + legacy look objects (forced legacy look = player avatar from cast.json, cap = guard) so NO call-site patches were needed; nod(); hurried get-up; IK only when on the ground height field.
  - 75_npc.js: street life works in the full game (59 NPCs: 30 walkers, 24 pool at terraces/benches/bus/chat/window, staff, kids, cast). npcLine wrapped at spawn so cast lines are spoken (no edit to 85_hud_missions.js).
  - cast.json: player m16, homeless "Mr. Lefteris" (m05) next to "Hondos center" (no Sephora POI in the map yet).
  - Verified in game (tests/t1.js, t2.js): talk, punch → knockdown, cast talk/give, ISA guard = Security avatar. 
- Test helpers: work/chars/tests/*.js (run with ROOT=… GK_DIR=… GK_SHOTS=… NODE_PATH=/opt/node-tools/node_modules node tX.js). Game time in SwiftShader is slow: fast-forward with sim() (call update functions in a loop), do not wait wall-clock.
NEXT (in order): docs/CHARACTERS.md + CREDITS.md → fix chef head texture (f110_head_color_a.tga) + biz_f glasses → close-up visual QA of every role (terrace, bench, bus, chat, window, homeless scene) → start/stop/turn transition clips in runtime → more avatars (7 extra GLBs already in raw/av_glb) → dog → driver seat hook → final docs/report.

## OWNER UPDATE (from the project lead — newest demand, act on it)
- The owner again: "make characters of different people who look different" and "add the homeless man next to the Sephora". Make sure that in ANY street view no two visible people share an avatar
  when it can be avoided (spawn by least-recently-used avatar), vary height/build per person, and that the homeless man scene is in MAIN and easy to find (anchor: MAP.key.sephora when the data agent
  publishes it, else the Hondos center cosmetics store). A weapons bot will later add paintball markers: expose hold/aim poses if cheap, and mark children, CAST characters and the homeless man as protected
  (a boolean on the person record) so other modules can never target them.

## Session 3 (restart Nov 21 00:48)
- State on entry: main == my copy for 60_people.js, 75_npc.js, models/*. No docs/ORDERS.md yet. docs/CHARACTERS.md + CREDITS.md are written (v1).
- Plan this session (integrate after each): (A) protected flag + LRU avatars + height/build variation + Sephora anchor check → (B) aim/hold poses for weapons → (C) chef head tex + more avatars (≥49 distinct street people) → (D) close-up QA per role → (E) start/stop transitions → (F) dog → (G) driver hook w/ cars agent → docs.
- (session 3 did, not logged): 61 avatars built (tools/chars/cast.js), packs split rb_people.json + rb_people2.json (pp.more), tex 61 webp; LRU pickAvatar (fewest users), repeat → tint/scale; isProtected(p) + person.protected / npc.protected (children, cast, homeless); N_WALK 28 + N_POOL 21. Lineups s4/new1.png new2.png look right.

## Session 4 (restart Nov 21 08:24)
- main now: MAP.key.sephora (129.4,-3.5) + map shop "SEPHORA" on Levidou; HUD split into 85_hud/86_map/87_missions/87b_mission_data/88_menu (npcLine gone; talkTo calls npcSay; 87b stranger mission uses castNpc/castGive).
- findPoi order: map shop name → MAP.key snapped to nearest shop → facadePoi (PLACED / data/census.json loaded in loadReal as PPL.census, snapped to street-facing facade with no fence between) → fallback.
- tests/lib.js: renamed simTimers→__gkTimers (game now has simTimers()), sim() also runs inputTick/FRAME_HOOKS/flushCars.
- 08:56 INTEGRATED into main: 61 avatars (2 packs), LRU casting, protected flags, census/facade Sephora anchor. main boots, no errors (shots/s4/main4_*).
- 09:20 weapons/reactions (in my copy, verified in viewer: shots/s4/pose2.png pose3.png flinch_*.png): hk clips aim_pistol/hold_pistol/aim_rifle/hold_rifle/flinch/cower/hands_up (handkeyed.js; hand rotations fitted numerically with work/chars/tmp/fithand.js),
  props marker_p/marker_r (vcBoxes), person.aimPitch, person.handWorld(), person.handProp; 75_npc: npcReact(n,what,x,z), npcTargets(x,z,r), state 'react', p.resume. docs/CHARACTERS.md updated.
  tools/chars/poses.js = pose sheet tool (node poses.js out.png act[:carry|:up],... av WxH T speed).
  NEXT: t7 game test → integrate → ORDERS_DONE → (C) chef head tex → (D) close-up QA → (E) start/stop transitions → dog.

## Session 5 (restart Nov 21 12:45)
- State on entry: copy has (unintegrated) weapons poses/reactions + 3 ISA IB Student cast entries (cast.json, label via castLabel/updateLabels in 75_npc.js, backpack wear, laptop prop). ORDERS: IB students (integrate now), Sephora moved to EAST side Levidou 8 (door ≈ 141.5, 2).
- Plan: sync main → check Sephora key → game test IB students + homeless → integrate → ORDERS_DONE → then QA/polish.
- 13:50 INTEGRATED into main: 3 ISA IB Students (label, backpack, IB-only dialog via n.dialog=castDialog / cast field `only`), weapons poses + npcReact/npcTargets, homeless at the new MAP.key.sephora (east side Levidou, verified t7_home.png), setCarry(null) now removes the carry prop. Verified in game t7 (shots/s5/t7_*), no errors. castDialog itself not yet clicked in game.
  Known: ib_starbucks has no terrace seat at Starbucks → stands (fallback). m11 looks ~30: picking a younger avatar (lineup young_m.png pending).

## Session 6 (restart Nov 21 17:48)
- State on entry: main == copy for 60_people.js/rb_anims; copy has UNINTEGRATED 75_npc.js castFurniture (own bistro table for cast at a café without terrace, cast field "own") + cast.json ib_starbucks own:true. No 81_weapons.js in main yet.
- Open orders for chars: item 16 pistol/rifle FIRE + RELOAD poses (have aim/hold); item 17 smooth player movement (blended start/stop, turn-in-place).
- Plan: sync → test castFurniture → integrate → fire/reload clips → start/stop/turn-in-place in Person → integrate → QA (young m11, chef head) → docs.
- 18:30 (copy only, not integrated yet) rig.js: handLw/handRw absolute hand orientation channel (+wk weight). handkeyed.js: hk_fire_pistol, hk_reload_pistol (1.9 s), hk_fire_rifle, hk_reload_rifle (2.5 s), meta mag/magIn/ready.
  60_people.js: realistic gun props 'pistol'/'rifle' (marker_p/r aliases) + left-hand magazines mag_p/mag_r; ACTIONS fire_*/reload_*; person.gesture(name,opt) upper-body one-shot layer (+gesturing, stopGesture), person.fire()/reload(); setCarry(name,{noProp}); head leads turns (turnLook).
  Tool: tools/chars/gest.js jobs.json (gesture strips + film, one browser). First strip shots/s6/rl_p_side.png OK. Browser queue ~15 min per run (machine load 14).
  NEXT: check batch g1 strips → t8 game test (tests/t8.js) → integrate 60_people/75_npc/cast/rb_anims → ORDERS_DONE → docs.
- 18:50 INTEGRATED into main: 60_people.js (gestures/fire/reload/gun props/turnLook), 75_npc.js (castFurniture), cast.json, rb_anims.json (152 clips). t8 game test on copy: no errors. ORDERS_DONE + CHARACTERS.md "Guns" updated.
  NEXT: viewer re-check of rifle reload after moving work space forward (ws r [0,-0.13,0.07], yaw +0.14) → main boot check → QA (m11 young, crowd close-ups).
