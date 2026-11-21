## Your role: WEAPONS BOT — "guns", done as paintball and toy blasters (read the Weapons rule in docs/OWNER_BRIEF.md first: it is absolute)

The owner asked to "add guns". The project lead decided how: non-lethal paintball markers and toy blasters only, because the game copies a real neighbourhood, a real school and real people.
You own: gk3/js/81_weapons.js (new; add it to the script list in index.html after 80_player.js with a one-line edit in MAIN), docs/WEAPONS.md.
Use the gameplay agent's hooks (docs/GAMEPLAY.md): extra action buttons / key bindings, the HUD weapon slot, the camera aim mode, the mission framework, the interaction registry INTER, the shop UI; and the characters API (docs/CHARACTERS.md) for holding/aiming poses and reactions. Feature-detect everything; if a hook is missing, add the smallest possible one in MAIN and list it in your report.

Build
1. A weapon system in the feel of a AAA open-world game: weapon wheel/slot (fists, paintball pistol, paintball rifle, water blaster), over-the-shoulder aim with a reticle, generous aim-assist on touch,
   projectiles with travel time and drop, hopper ammo and reload, recoil and sound (synthesised), paint splat decals on walls, cars and the ground, coloured splats on generic adult NPCs who react
   believably (flinch, shout, laugh or run; they are never hurt), a "mischief" meter: if you splat bystanders a security guard or police officer walks you down and fines you.
2. Where to get them: a real sports/toy shop from the map sells markers and paintballs (pick the right POI; fall back to the kiosk), and a paintball/shooting range mini-game at a sensible real open space
   (e.g. in the Alsos or a sports ground): timed pop-up and moving targets, score → prize money; documented so missions can use it.
3. One mission through the gameplay agent's mission data format: a paintball match against bots in the park (teams, hits = out for 10 s, first to N).
4. The absolute rules, enforced in code and covered by scripted tests: no blood, injury or death anywhere; weapons are holstered automatically and cannot fire inside player.interior, inside the ISA polygon or
   within 150 m of it; children, CAST characters (named people) and the homeless man are never valid targets (shots do nothing, aim-assist ignores them); weapons never appear in the school missions.
Verify with scripted runs and screenshots (aiming, splats, NPC reactions, range, the exclusion zone, the protected characters) and report honestly.

## OWNER UPDATE 2026-11-21 13:00 (OWNER_BRIEF item 16) — supersedes the paintball-only rule above
Make realistic-looking guns: a pistol, an SMG and a rifle, modelled in detail (slide, grip texture, sights, magazine), metal/polymer PBR materials,
held with the chars bot's aim/hold poses, real-feeling recoil, muzzle flash, shell ejection, impact sparks/dust decals on walls, realistic sounds
(procedural WebAudio), reload. Hit NPCs: knockdown → get up → flee; no blood. Keep the ISA 150 m zone, the shop-interior auto-holster and the
protected flag (children, CAST, homeless never targetable). Simple phone controls: aim button + fire button, auto-aim assist to nearest valid target.
