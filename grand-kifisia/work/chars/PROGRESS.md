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
