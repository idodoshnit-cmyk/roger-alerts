# Weapons (team:weapons)

Owner: agent `weapons`. Code: `gk3/js/81_weapons.js` (loaded right after `80_player.js`). No downloaded assets: every mesh, texture and sound is generated in code.

## The rule (OWNER_BRIEF item 16 — replaces the earlier paintball-only rule)
Realistic-looking pistol / SMG / rifle — but **no blood, no gore, no corpses, no killing**. A person who is hit is **knocked down, stays down 3–5 s, gets up and runs away**.
Enforced in code (`weaponBlock()`, `wProtected()`):
- Weapons are holstered automatically and cannot fire **inside shops** (`player.interior`), **in a car**, **inside the ISA campus or within 150 m of it**
  (distance to the gate and to `ISA.poly`), in missions with `noWeapons` and always in the school missions (`school`, `isa`) and the homeless-man mission (`stranger`),
  while talking, carrying the basketball, eating, frozen or knocked down.
- **Children, named CAST characters (incl. the ISA IB students), the homeless man (Mr. Lefteris) and the police are never targets**: aim-assist ignores them,
  the trigger is blocked while the reticle is on them ("Not a target"), and a shot that strays onto them passes through with no effect. Seated people are never
  knocked over (they flinch / react instead).

## What the player gets
| weapon | behaviour | price (Fun Ocean Outdoors, Kifisias Ave 228) |
|---|---|---|
| Fists | the game's own punch | — |
| Pistol | 9 mm look, 15-round magazine, semi-auto, 90 m | €60 (ammo box 30: €8) |
| SMG | compact, folding stock, 30 rounds, 13 rounds/s, 80 m | €150 (box 60: €12) |
| Rifle | carbine with red-dot sight, 30 rounds, 9 rounds/s, 140 m | €250 (box 30: €15) |
Fun Ocean Outdoors is the only outdoors/sporting-goods shop in the playable map (Overture place, tier B); no gun shop exists in the open data, so it stands in.
The items are added to that shop's own interior menu (`INTERIORS[key].menu`, order at the counter); without the interiors module a USE action at the door opens the sheet.

- **Models**: detailed procedural meshes (slide with serrations, sights, ejection port, bore, trigger guard, magazine, rails, handguard, optic, stock), two PBR materials each:
  steel (metalness 0.85, environment reflections) and stippled polymer (bump-mapped grip). Held in the right hand via the characters API (`handWorld`, aim/hold poses).
- **Firing**: hitscan along the aim ray from the muzzle (1.5 m steps against people, cars, building/garden walls, props, ground, range targets); spread grows while moving
  and firing (bloom), shrinks standing still; tracers on most rounds.
- **Feel**: camera recoil kick with recovery, shake, muzzle flash (two additive billboards, 45 ms), brass casings ejected to the right that bounce and tinkle and lie on the
  ground for 9 s, bullet-hole decals (4 variants) on walls, ground and cars (they ride with the car), dust puffs, sparks on metal; procedural WebAudio gunshots
  (crack + body + low thump + street echo), impacts, ricochets, casing tinkles, magazine change, slide rack.
- **Reactions**: gunfire panics walkers within 45 m (they run), seated people react, some shout ("Run!", "Gun!"); hit walkers are knocked down and get up and flee.
- **Wanted level** (★★★ under the clock): street gunfire +7, hits on metal +5, knockdowns +40; decays after 10 s. At 60 a police officer (protected) walks you down and,
  through the game's dialogue, fines €50 × stars (×2, ×3 for repeat offences within 5 min) and holsters your weapon. Lose him (car, shop, > 90 m) for 8 s and he gives up.
  Shooting inside the range / match zone never counts.
- **Shooting range** (Alsos Kifisias, western round clearing ~55 m from the station; pop-up gazebo stall, rope line, backstop net, 8 pop-up targets + 2 sliders):
  €5 → 60 s with your drawn gun (or a loaner pistol), unlimited ammo. 5 / 10 (bullseye) / 15 (slider) points; prize €1 per 10 points (max €30); best score saved.
- **Mission "Alsos Paintball"** (beacon by the range, €50 + bonus): the one place paint survives — a pop-up paintball field with 13 inflatable bunkers, 3 v 3 with loaner
  paint markers (projectiles with drag + drop, paint splats). Bots take cover, peek and shoot; hit = hands up, 10 s out. First to 8.

## Controls
- Touch: tap the **weapon slot** under the clock → weapon wheel. With a gun drawn the Punch button becomes **FIRE** (hold = aim + fire; drag on it to steer the aim),
  plus **AIM** (toggle) and **R** (reload). Aim-assist (~4° cone) eases the camera onto the nearest valid person/target on touch.
- Keyboard/mouse: **1–4** pick, **Q** next (Shift+Q previous), **R** reload, hold **right mouse** or **K** (toggle) to aim, **left click** or **J** to fire while a gun is drawn.

## Public API (globals)
| name | meaning |
|---|---|
| `WPN` | state: `cur`, `owned{}`, `ammo{id:{mag,res}}` (`res -1` = unlimited), `holster` (block reason or null), `aiming`, `mis` (heat 0–100), `guard`, `hits`, `shots`, `match`, `loan` |
| `WDEF` | weapon definitions (rate, spread, magazine, recoil, range…) |
| `weaponBlock()` | `null` when weapons are allowed, else `'indoors'|'car'|'school'|'mission'|'talk'|'ball'|'busy'` |
| `nearSchool(x,z)` | inside ISA or within 150 m of it |
| `wProtected(npc)` | true for anybody who may never be targeted |
| `wGive(id, quiet)`, `wSelect(id)`, `wAddAmmo(n, id?)`, `wReload()` | inventory |
| `wHeat(v)`, `wStars()` | wanted level |
| `WRANGE.start()`, `WRANGE.stop()`, `WRANGE.on`, `WRANGE.score` | the shooting range |
| events | `gameEvent('shotHit',{npc})`, `'paintHit'`, `'rangeStart'`, `'rangeEnd' {score,prize,best,why}`; purchases use tags `w:pistol|w:smg|w:rifle|w:ammo_pistol|w:ammo_smg|w:ammo_rifle` on the normal `buy` event |
| save | `SAVE.flags.wpn = {owned, ammo, cur, fines, best}` |
| test hook | `window.__wpn` (always present) |
Missions may set `noWeapons:true`, or lend a weapon with `WPN.loan = {id, ammo:{mag, res:-1}, col?}` (clear it in cleanup).

## Hooks used (all feature-detected)
`FRAME_HOOKS`, `setAimMode`, `aimRay`, `weaponsAllowed`, `hudWeapon`, `onGame('buy')` (sets `d.eat=false` for weapon items), `INTERIORS[key].menu`, `INTER`, `say/dlgPick/dlgClose`,
`addMoney/spend`, `banner/toast/objective/hudTimer/subtitle`, `MISSIONS`, `placePlayer`, `lookBy`; characters: `Ped`, `randomLook`, `isProtected`, `npcReact` (when present),
`ACTIONS.aim_pistol/hold_pistol/aim_rifle/hold_rifle/hands_up/crouch`, `person.setCarry/setProp/handWorld/aimPitch/bonePos`, NPC knockdown fields (`state='down'`, `timer`, `panic`, `play('lie')`).
`registerAction()` exists in 80_player.js but nothing builds its buttons (`xactBuild` is not defined in main), so this module builds its own buttons, wheel and reticle (CSS injected from the JS).

## Known gaps
Kept current in the weapons report and `work/weapons/PROGRESS.md`.
