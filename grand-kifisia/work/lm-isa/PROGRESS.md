# lm-isa progress
## Done
- [start] read briefs; work copy exists at work/lm-isa/gk3. OSM extract around ISA: tools/lm/isa/osm_isa.py -> tools/lm/isa/osm_isa.jsonl
  ISA ground way 1086751865 (4 pts), main building way 1086751869 (map b752), multi court w1086751866, soccer w1086751867, gates nodes 9957387837/38, MAP.isa.gate=[876.3,-444.6]
## Next
- research photos (Commons geosearch, isa.edu.gr), write docs/research/lm/isa.md, model in js/89e_lm_isa.js, integrate early
- [12:45 resume] found js/89e_lm_isa.js (386 lines, ~45KB, written 09:17, never tested/integrated): main building (Hotel Olympos Pallas facade),
  veranda, rear wing, roof, tympanum, grounds (court platform, multi court w/ FIBA lines+hoops→HOOPS isa:true, soccer, fences, gate), hooks buildAreas/plantTrees/buildISA.
  Refs in docs/research/img/lm/isa/*REFONLY*. Next: test boot in work copy, fix errors, screenshot, integrate.
- [13:15] wrote docs/research/lm/isa.md. Switched T.plasterW/T.marbleW→TM.* (metric UVs). Test script tools/lm/isa/shot.js + v1.json
  (run: cd ROOT; GK_DIR=work/lm-isa/gk3 GK_SHOTS=work/lm-isa/shots node tools/lm/isa/shot.js i1 tools/lm/isa/v1.json > work/lm-isa/run1.log; NO `timeout` — slot wait eats it).
- [17:55 resume after reboot] run1 OK: boots, ISALM.built, 2 hoops isa:true, no errors (shot.js now uses page.screenshot timeout 240s).
  syncwork done 17:58. v2.json = views matched to the ref photo (ref cam [860.3,9,-422.1 -> 882.2,7,-420]). Next: check i2 shots, integrate, then iterate facade colour/ground floor/court colour.
- [18:30] INTEGRATED v1 into main (js/89e_lm_isa.js). Iter 2 edits in work copy: roof 18deg darker, attic +0.2, court colours,
  street fence = rubble base 0.65 + light-grey galv bars 2.0 (no piers), 2 gates (u 10.6 ped 1.7m, u 27.6 main 3.0m) cream piers+globe lamps,
  veranda: lower-ground facade recessed 1.3m under cantilever fascia, cream railing piers with globe lamps every 7.4m; front street trees -> pines via garden_trees.
  shot.js: per-view fov + hide (hide instanced trees). v3.json views. tools/lm/isa/match.py makes ref|game images.
