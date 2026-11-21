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
