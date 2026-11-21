# lm-ralphlauren progress
## Done
- [step 0] read briefs (OWNER_BRIEF, ARCHITECTURE, lm-common, task, ORDERS). Work copy exists (work/lm-ralphlauren/gk3, made by setup).
- [step 1] research: footprint b425 analysed in local frame (u along front W->E from (161.5,62.8), d = depth N): main block 11.9 x 11.8, rear annex to d 18.9.
  Heights from photo 3 (perspective-corrected, 81.4 px/m): floor +1.65, cornice 5.3-6.05, eaves 10.1 (gable) / 10.8 (left wing), apex 14.1, dormer 12.9.
  POIs on b425 from map: "Ralph Lauren Kifisia" door (165.11,65.22) -> interiors module makes it enterable.
## Next
- write docs/research/lm/ralphlauren.md, model v1 in js/89c_lm_ralphlauren.js, screenshot, integrate.
## Decisions
- geometry via GB into chunkAt(cx,cz).o/.cut; custom tiles via defTile (stone graded from PH rubble, windows, awning text, balustrades).
- stairs: wrap groundY() with a bbox-limited step function so the player can climb the marble steps to the raised door.
- [step 2] (found on resume 12:45) docs/research/lm/ralphlauren.md written; model v1 drafted in work copy js/89c_lm_ralphlauren.js (42 KB), NOT yet screenshotted/integrated.
- [step 3] 13:30 synced main into copy; v1 boots with LM.built=['ralphlauren'] (no errors seen at boot). Harness is overloaded: use tools/lm/ralphlauren/shot.js (JS-click play, 240 s screenshot timeout, timeout 5000 on the node run). Views in work/lm-ralphlauren/tmp/v1.json (front, se, night, street, aerial).
  NEXT: look at v1 shots -> fix -> integrate js/89c_lm_ralphlauren.js ASAP.
