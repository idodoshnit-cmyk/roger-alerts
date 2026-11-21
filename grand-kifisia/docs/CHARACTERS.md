# Characters — people, animation, street life, CAST

Owner: agent `chars`. Code: `gk3/js/60_people.js` (avatars + animation runtime), `gk3/js/75_npc.js` (street life + named characters).
Assets: `gk3/models/rb_people.json` (meshes), `gk3/models/rb_anims.json` (clips), `gk3/models/tex/<id>.webp` (one atlas per avatar),
`gk3/models/cast.json` (the player and the named characters). Pipeline: `tools/chars/` (re-runnable, see the end of this file).

All people are **Microsoft Rocketbox avatars (MIT)** animated with **Rocketbox motion capture (MIT)** plus a few clips hand-keyed for this game.
There is no THREE.AnimationMixer and no THREE.Bone graph: clips are fixed-rate quantised quaternion tracks on one canonical 56-bone Biped
skeleton (23 body bones + 30 finger bones + jaw + 2 eyelids), and every `Person` evaluates
`state machine → blended local pose → additive layers → FK → foot IK → skin matrices` straight into its own `Skeleton.boneMatrices`.
One draw call per person. Near LOD ≈ 6.4–7k triangles / 56 bones (fingers, jaw, blinking, shadow), far LOD ≈ 1.25k triangles / 23 bones.

## 1. Creating and driving a person (60_people.js)

```js
const p = new Ped(spec, forceNear);     // Ped === Person === RealHuman.  Adds p.root (THREE.Group, metres, y up, facing +z at yaw 0) to the scene.
p.root.position.set(x, groundY(x, z), z); p.root.rotation.y = yaw;   // YOU place the root every frame (feet are IK-planted on the ground by the person)
p.update(dt, speedMps, inAir);          // once per frame: speed 0 = stand (idle + fidgets), >0 = walk/run blend matched to that ground speed
```

`spec` is one of
- an avatar id string: `'m16'`, `'chef'`, … (table below); `'player'` = the hero defined in `cast.json`;
- an object `{ av, scale, build, tint:[topHex, bottomHex], walk, idle, posture, name, seed }` — all optional:
  `scale` uniform height factor (0.9–1.1 sensible), `build` width factor (0.9–1.15), `tint` multiplies the clothing colour of the upper / lower body
  (skin, hair and shoes are not tinted), `walk` a walk clip base name (`'walk_cool_01'`, `'walk_stroll_01'`, `'walk_self-assured'`…),
  `idle` an action name used when standing (`'idle'` default, `'wait'`), `posture` forward stoop in radians (0–0.15), `seed` makes the random choices repeatable;
- `{ fem: true|false }` → a random street avatar of that sex; `randomLook(sex?)` returns a spec for the street avatar that the fewest living people wear right now
  (so the ~49 random people are 49 different persons; an unavoidable repeat gets a different height, build and clothing tint);
- legacy procedural "look" objects (`{shirt, hair, …}`) still work: the forced one becomes the player avatar, one with `cap` becomes the security guard.

`forceNear = true` keeps the detailed mesh regardless of distance (player, mission characters, people inside interiors).
Otherwise `updateLOD()` (called by the main loop) gives the `Q.real` (4 / 8 / 14) nearest people the near mesh.

| member | meaning |
|---|---|
| `p.play(action, opt)` | start a named action (table below). `opt === true` or `{once:true}`: play the body once and hold the last frame until `stop()`. Other options: `{seatH, fade, clip, t, noProp, propCol}`. Returns `p`. |
| `p.stop(fade)` | leave the current action (plays the lead-out clip if the action has one, e.g. getting up). |
| `p.busy` / `p.override` | `busy`: an action is still running (including lead-out). `override`: name of the current action or `null`. |
| `p.setCarry(name)` | walk-around accessory: `'phone'`, `'text'`, `'bag'`, `'drink'`, `null` — upper body only while walking, the full clip while standing. |
| `p.setProp(name, colour)` | put a hand prop in the right hand: `'phone'`, `'cup'`, `'pita'`, `'bag'`, `null` (near LOD only). Actions with a prop set it themselves. |
| `p.lookAt(x, y, z)` / `p.lookAt(null)` | head/neck/spine look-at target in world space (eased, limited to ±65° yaw). |
| `p.nod()` | a small acknowledging nod on top of anything. |
| `p.talking = true/false` | jaw movement while it is true (the `talk`/`phone` actions do this themselves). |
| `p.ik = false` | switch foot IK off (it is automatic: only when the root stands on `groundY`). |
| `p.walkSpeed` | this person's natural walking speed in m/s (clip speed × leg length × scale) — move walkers at about this speed and the feet do not slide. |
| `p.look.fem`, `p.av.id`, `p.av.age` | sex, avatar id, `'child' | 'young' | 'adult' | 'senior'`. |
| `p.bonePos(BN.RHAND, vec3)` | world position of a bone after `update()` (indices in `BN`). |
| `p.handWorld('R'|'L', vec3, quat)` | world position + orientation of a hand (hand space: x along the fingers = barrel of a held marker, y out of the palm, z towards the thumb = top of the marker). `false` when not near-LOD. |
| `p.handProp` | the prop mesh currently in the hand (or `null`); read its `matrixWorld` for a muzzle point. |
| `p.aimPitch` | radians, + = down: bends the chest so the arms (and the held marker) aim up/down. Combine with the root yaw for full aiming. |
| `p.protected` | `true` for children, named CAST characters and the homeless man. Use `isProtected(personOrNpc)` — nothing may target, hit or splat them. |
| `p.dispose()` | remove from the scene and free the skeleton. |

### Actions (`ACTIONS` in 60_people.js)
Mocap, male and female variants picked automatically:
`idle`, `wait`, `talk`, `listen`, `phone`, `text`, `drink`, `newspaper`, `bag`, `trolley`, `sit` (chair/bench), `sit_table`, `wave`, `wave_long`, `cheer`, `clap`,
`dance`, `photo`, `knock`, `shrug`, `laugh`, `yawn`, `stretch`, `look_around`, `think`, `crouch` (with in/out clips).
Hand-keyed for this game (unisex): `punch` (alternates right/left), `shoot` (basketball jump shot, hold), `climb` (over a fence, hold), `lie` (knock-down → lying → get-up on `stop()`),
`eat` (pita in both hands), `drive` (seated, hands on a steering wheel), `sit_ground` (against a wall, one knee up), `give`, `pickup`,
`flinch` (startled by a paint hit: recoil, a hand to the spot, a step back), `cower` (crouched, arms over the head), `hands_up` (also the paintball "I'm out" signal).

### Guns: hold, aim, fire, reload (for the weapons module — owner item 16; gameplay stays non-lethal)
Carries (upper body only, the legs keep walking/running underneath; full-body stance when standing): `aim_pistol` (two-handed, eye line), `hold_pistol` (low ready),
`aim_rifle` (stock at the shoulder, cheek on the stock), `hold_rifle` (across the body). `ph.setCarry('aim_pistol')` … `ph.setCarry(null)`.
Each puts a realistic matte-black prop in the right hand (`'pistol'` / `'rifle'`; old names `marker_p` / `marker_r` still work).
`ph.setCarry('aim_rifle', { noProp: true })` = pose only, when you draw your own gun mesh at `handWorld` each frame.
Aim up/down with `ph.aimPitch = -0.3` (up) … `0.4` (down); left/right by turning `root.rotation.y`.
The barrel is the hand's +x axis: `ph.handWorld('R', pos, quat)` then `new THREE.Vector3(1,0,0).applyQuaternion(quat)` = fire direction
(muzzle ≈ pos + dir × 0.2 m for the pistol, × 0.68 m for the rifle).

One-shot **gestures** layered over the upper body of whatever the person is doing (aim carry, walking, standing) — they return the duration in seconds:
| call | what |
|---|---|
| `ph.fire()` | recoil matching the carry (`fire_pistol`: 0.33 s muzzle flip + wrists, `fire_rifle`: 0.32 s shoulder kick). Call once per shot; a new call restarts it (fine for full-auto). |
| `ph.reload()` | `reload_pistol` 1.9 s (gun into the work space, eyes on it, left hand to the belt pouch, magazine in, slap, rack the slide, back on target); `reload_rifle` 2.5 s (rifle canted, old magazine out to the vest, new one rocked in, charging handle, back to the shoulder). A magazine prop appears in the left hand while it is out. Clip meta: `ready` = time the gun is back on target (1.6 / 2.25 s). |
| `ph.gesture(name, {speed, mask, fadeIn, fadeOut})` | any ACTIONS key or clip as an upper-body one-shot (e.g. `'wave'`, `'shrug'`), `speed` 1.5 = a fast reload |
| `ph.gesturing` / `ph.stopGesture()` | name of the running gesture or null / cancel it |
`fire_pistol`, `fire_rifle`, `reload_pistol`, `reload_rifle` are also ACTIONS, so `play()` works for a standing NPC.
Pose sheets: work/chars/shots/s6/fi_p.png, rl_p.png, rl_r*.png (tool: `node tools/chars/gest.js jobs.json`).
Looping actions mix in random fidgets (look around, scratch head, yawn, touch hair, shift weight…) on their own.

Sitting: place `root` on the floor/ground directly below the hips, facing the way the person faces, and pass the seat height:
`p.play('sit_table', { seatH: 0.45 })` (chair), `p.play('sit', { seatH: 0.475 })` (bench). The feet are not IK-planted while seated.

### Seating a driver (for the vehicles module)
`p.play('drive', { seatH: 0 })` and every frame put `p.root` at the **top of the seat cushion under the hips** with `rotation.y = car yaw`
(`root.rotation.order` is `'YXZ'`, so `rotation.x/z` may carry the body pitch/roll), then `p.update(dt, 0, false)`.
Pose geometry relative to that point (adult, scale 1): hip centre +0.10 m up; steering-wheel centre 0.44 m forward and 0.43 m up, wheel radius 0.17 m;
ankles ≈ 0.62 m forward and 0.25 m below; eye height ≈ 0.70 m above the cushion. Use `forceNear` only for the player's own car; traffic drivers can stay far LOD.
`p.stop()` + normal placement gets the person out again. (Door opening/closing poses are not authored — see gaps.)

### Avatars (61) — `PPL.av[id]`
Street people (48, used for random pedestrians, `tags` contains `'street'`): `m01 m02 m03 m04 m06 m07 m08 m09 m10 m11 m12 m13 m14 m15 m17 m18 m20`,
`f01 f02 f03 f04 f05 f06 f07 f08 f09 f11 f12 f13 f14 f15 f17 fp1 fp2`, business `biz_m biz_m2…biz_m6 biz_f biz_f2…biz_f4`, footballers in club kit `fb_m1 fb_m2`, doctors `doc_f doc_m`.
More roles: `gardener`, children `boy2`, `girl2`.
Roles: `m16` (the player: young man, T-shirt and jeans), `m05` (Mr. Lefteris), `waiter`, `chef` (woman in chef's whites), `guard` (security uniform, used by the ISA mission),
`rider` (delivery uniform), `jog_m`, `jog_f` (sportswear), `boy`, `girl` (children, 1.43 m).
For interiors: cooks → `'chef'`; counter staff / baristas → `'waiter'` or any street avatar with a tint; customers → `randomLook()`.

## 2. Street life (75_npc.js)

`NPCS` is the array of street people: `{ h: Person, x, z, yaw, state, static, name, timer, panic, … }`.
- `state`: `'walk' | 'pause' | 'talk' | 'down' | 'getup' | 'still'`; `static`: falsy for walkers, otherwise the role
  (`'terrace' | 'bench' | 'bus' | 'platform' | 'taxi' | 'chat' | 'window' | 'staff' | 'kids' | 'sit_ground' | …`).
- Other modules may set: `p.state='down'; p.timer=4; p.panic=6; p.h.play('lie')` (knock down — they get up by themselves), `p.panic = seconds` (run away),
  `p.state='talk'; p.timer=6; p.h.play('talk')` (stop and face the player). `p.cross` is set while a walker crosses a road (traffic gives way).
- `spawnPeople(x, z)` (boot) and `updatePeople(dt, playerX, playerZ)` (every frame) are the only entry points. `placeNpc(n, x, z, r0, r1)` drops a walker on a sidewalk.
- Who is out there: 28 walkers (each a different avatar first; own walk style and speed; some on the phone, texting, with a shopping bag or a drink; two joggers),
  a pool of 21 people that fills the places around the player — café/restaurant terraces (2 chairs + bistro table are built in front of every OSM café, restaurant,
  fast-food place and bakery where the pavement is wide enough), the real benches (`MAP.props.bench`), bus stops (`MAP.props.bus`), the station platform, the Platanos taxi rank,
  chatting pairs on pedestrian streets and squares, window-shoppers in front of real shop windows — plus fixed staff (chef on a break by Mythos Plus, a waiter, a delivery rider),
  two school kids at the ISA gate in daytime (07:30–16:30) and the named CAST characters.
- **Weapons hooks** (paintball): `npcReact(n, what, x, z)` with `what` = `'hit'` (flinch on the spot, then hurry away; standing people flinch and resume; seated ones look up),
  `'near'` (a shot/splat close by: walkers hurry away), `'aimed'` (a marker pointed at them: they move away); returns `false` and does nothing for protected people.
  `npcTargets(x, z, r)` → the people a weapon may target within r m (visible, standing, never protected). `isProtected(n)` for anything else.
  A walker in `npcReact` uses `state = 'react'` for ~1 s.
- Reactions: walkers step aside for the player, glance at them, stop now and then (look around, take a photo, yawn, wave), run from a honking or speeding car,
  fall when punched or hit and get up again; seated/standing people look at the player when spoken to.
- **The seat finder** is ONE function, `findSeats()`: it returns `[{ role, x, z, yaw, seatH?, group?, name? }]` from map data. If the map ever provides
  `MAP.seats = [[xDm, zDm, yaw, seatH, 'chair'|'bench', name], …]` those are used too. Richer POI data should be wired in there.
- Named characters: `castNpc(id)` → NPC record or `null`; `npcSay(p)` → next line of a named character (or `null` for ordinary people);
  `castGive(id, what)` → `{ ok, line, first, name, count }` and the character reacts (`what` = `'coin' | 'food' | …`, lines from `cast.json` → `thanks`).
  `spawnPeople()` wraps the HUD's `npcLine()` so that talking to a named character uses their own lines.

### The homeless man ("A Gyro for a Stranger")
`castNpc('homeless')` — **Mr. Lefteris**, a retired newspaper typesetter, sits on flattened cardboard with a blanket, a bag and a paper cup against the wall beside the
cosmetics store (anchor, first that exists: a map shop named "SEPHORA" (`MAP.buildings[].shops`, the data agent's real position on Levidou) → `MAP.key.sephora` →
a business named Sephora in `data/census.json` or in `PLACED`, snapped to the nearest street-facing facade → "Hondos center" → about x=268, z=−1). He is protected (`isProtected`).. He looks up at the player within 7 m.
Hooks: `const n = castNpc('homeless')` (`n.x, n.z, n.name, n.lines, n.helped`), `castGive('homeless','coin')`, `castGive('homeless','food')`.

## 3. CAST registry — adding a named character from data (`gk3/models/cast.json`)

```json
{ "player": { "av": "m16", "name": "You", "scale": 1.0 },
  "characters": [
    { "id": "nikos", "name": "Nikos", "av": "m09", "scale": 1.03, "build": 1.0, "tint": ["#2e4a7a", null],
      "at": { "poi": "Starbucks", "side": 2.5, "out": 1.2 },
      "does": "idle", "carry": "phone", "hours": [9, 22],
      "lines": ["Ela! Coffee later?", "I am waiting for Maria, she is always late."],
      "thanks": { "any": ["Thanks, man."] }, "mission": null } ] }
```
- `av`: any avatar id from the table; `scale`/`build`/`tint`/`walk`/`posture` as in the Person spec. To base a friend on a description: pick the closest avatar
  (sex, age, hair, build), set height with `scale` (1.00 = the avatar's own height, listed as `h` in `rb_people.json`), recolour clothes with `tint`.
- `at`: where they hang out — `{poi:"name contains", fallback:"other name", xz:[x,z], side: metres along the facade, out: metres from the wall}` or `{key:"platanos", offset:[dx,dz], yaw}` or `[x, z, yaw]`.
- `does`: `'idle'` (default), `'walk'` (strolls the streets around the anchor), or any action (`'sit_ground'`, `'talk'`, `'wait'`, `'phone'`…); `carry`: accessory; `hours`: `[from, to]` visible hours;
  `props`: `["cardboard","blanket","bag","cup"]` still-life around a sitter; `lines`: spoken in order when the player talks to them; `thanks`: lines for `castGive`; `mission`: free field for the gameplay module.
- More `at` forms: `{seat:"Starbucks"}` (takes a real café-terrace chair in front of that place, with its table), `{role:"platform", near:[x,z]}` (a street-life spot of that role:
  `platform | bench | bus | taxi | chat | window`), `{isaGate:true, dist:6}` (on the pavement outside the ISA gate); `alt:{…}` + `altDoes` = where to stand / what to do if the wanted seat does not exist.
- `label`: a floating name tag above the head (always on top, fades out beyond ~22–38 m, grows slightly with distance, hidden indoors); `labelColour` (default `#ffd34d`).
- `linesRandom: true`: lines in random order (never the same twice in a row) instead of in sequence. `wear: "backpack"`: worn on the back (`Person.setWear`).
- `only: { ask, bye }`: a single-topic conversation. Talking to the character opens a dialogue whose two choices are `ask` (answered with another of the character's own lines) and `bye`; no generic small talk or directions (implemented as `n.dialog = castDialog`, which `talkTo()` in 87_missions.js calls when present).
  `props` also knows `"laptop"` (open laptop on the café table in front of a seated character). Every CAST character is protected (`isProtected`).
- Example in the shipped file: the three **"ISA IB Student"** characters (`ib_gate` at the ISA gate 07:00–20:30, `ib_starbucks` at a Starbucks terrace table with a laptop,
  `ib_platform` on the station platform), fictional teenagers in casual clothes with backpacks, who only talk about how hard the IB is (OWNER_BRIEF item 13).
- No code change is needed: add the entry, reload. `STREET.cast[id]` / `castNpc(id)` gives the live record.

## 4. Budgets and numbers (measured)
- Download: `rb_people.json` 8.1 MB + `rb_people2.json` 5.2 MB (61 avatars; split for the 16 MB per-file limit, the first lists the others in `more`) + `tex/*.webp` 3.1 MB
  + `rb_anims.json` 2.6 MB = 19 MB (over the 14 MB target since the cast grew from 41 to 61 avatars). Textures load lazily per avatar in use.
- Per frame on "medium": 8 near people (≈ 6.5k tris each) animated every frame + at most 8 far people (1.25k tris) animated per frame in rotation; people behind the camera are not animated.
- 148 clips (127 mocap at 12/24 fps + 21 hand-keyed), 16-bit quaternions.

## 5. Pipeline (`tools/chars/`)
- `avatars.txt` + `fetch_avatars.sh` (FBX + TGA from the Rocketbox clone → GLB + PNG in `work/chars/raw/`), `cast.js` (which avatars ship, ids, tags), `build_people.js` (→ `rb_people.json` + atlases via `build_tex.py`).
- `anims_fetch.txt` + `fetch_anims.sh`, `clips.js` (curated clip list with kind/fps/trim), `build_anims.js` (→ `rb_anims.json`, gait analysis: speed, stride, phase).
- `rig.js` + `handkeyed.js`: authoring rig with IK targets and easing for the hand-keyed clips (`node handkeyed.js` patches `rb_anims.json` in about a second).
- `viewer.js`: stand-alone character viewer for frame strips and "film" tests (boots in ~3 s, no game needed).

## 6. Known gaps
See the chars report / PROGRESS (kept current in `work/chars/PROGRESS.md`).
