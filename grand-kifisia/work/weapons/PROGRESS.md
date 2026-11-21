# weapons PROGRESS

## Session 1 (start 2026-11-21 ~13:00)
- Read: OWNER_BRIEF, ARCHITECTURE, tasks/weapons.md, ORDERS (weapons: start now; add own hooks if missing), GAMEPLAY.md, CHARACTERS.md, INTERIORS.md.
- Findings: main has registerAction/XACT, setAimMode (CAMS.aim camera), aimRay, weaponsAllowed, hudWeapon, FRAME_HOOKS, onGame/gameEvent('buy' returns data -> can set d.eat=false).
  MISSING in main: xactBuild (no touch buttons are built for XACT), no XACT key dispatch, no reticle CSS. -> 81_weapons.js builds its own buttons/reticle/wheel/CSS.
  chars' aim/hold poses, marker props, handWorld, aimPitch, npcReact/npcTargets are in work/chars (unintegrated at 13:00) -> feature-detect, fallback.
- Decisions:
  * Shops: Imaginarium (toy store, Levidou 2, door ~114,55 — 30 m from spawn) sells water blaster / paint pistol / paint refills; "Fun Ocean Outdoors" (sporting goods, Kifisias 228, door ~-93,106) sells rifle + paintballs. Via INTERIORS[key].menu (ordering inside) with fallback INTER at the door. Tags 'w:*'.
  * Range + match: Alsos Kifisias western round clearing, centre ~(-336,-56) (computed free space from lm-park PARK_LAYOUT: work/weapons/free.py). 55 m from the station. Pop-up stall only.
  * Guard = 'guard' avatar, "Municipal Police", protected, fines €40.
- Next: write js/81_weapons.js v1 (core: wheel, aim, projectiles, splats, rules, NPC reactions) -> test -> integrate + index.html script tag.
- 13:20 v1 (paintball) written: work/weapons/81_paint_v1.js (backup). Test tests/t1.js queued (browser slots full).
- 13:22 NEW ORDER (OWNER_BRIEF 16, ORDERS 13:00, tasks/weapons.md owner update): realistic-looking pistol/SMG/rifle replace paintball; no blood; hit = knockdown → get up → flee; ISA zone, shop holster, protected flags stay; wanted level OK.
- 13:30 converted with work/weapons/guns_patch.py (+ guns_frag.js models, guns_frag2.js fx/hitscan) -> gk3/js/81_weapons.js now: Pistol/SMG/Rifle hitscan (tracers, flash, casings, bullet holes, dust, sparks, knockdown, panic, wanted stars + police fine), paint marker kept only as the Alsos Paintball match loaner; shop = Fun Ocean Outdoors (Kifisias 228) only; range uses own gun or loaner pistol.
- docs/WEAPONS.md v1 written (paintball wording) -> must be rewritten for guns.
- Next: t1 results -> fix -> integrate (integrate.sh weapons js/81_weapons.js + one-line script tag in MAIN index.html) -> ORDERS_DONE.
