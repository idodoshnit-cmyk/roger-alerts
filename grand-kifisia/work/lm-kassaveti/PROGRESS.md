# lm-kassaveti PROGRESS
## Scope (decided)
West Kassaveti block, Platanos -> spawn junction, both sides, excluding lm-junction buildings (b30 AB, b293, b294 Mythos, b295 Kassaveti 9, b388...).
Mine: north b291 (Kassaveti 1, neoclassical HSBC/CrediaBank, photo r11), b298 (K3 Wagamama/Magnifique), b297 (K5 Varsos neo 2-storey), b296 (K7 Holland&Barrett/Nova/Ancho);
south b14 (K4 MrPhone/Zenith/sweet spot), b289 (Bibi/Chantrokosmos/Triumph/L'Occitane), b288 (K6 Dust Cream...), b286 (Pischos/Vodafone/pharmacy), b264 (Leonidas, Drosini 11).
## Done
- read docs, map analysis (work/lm-kassaveti/lsb.py lists buildings along axis)
## Next
- research Varsos / Kassaveti photos; write js/89g_lm_kassaveti.js; shoot; integrate
## 2026-11-21 session 2
- Commons API rate-limited (429) -> no new photos; refs: ref/r11 (b291 neo corner), r16 (residential Kassaveti, not my block). Everything else inferred (say so in kassaveti.md).
- Decision: shop positions = PLACEMENT_AUDIT real x,z / OSM nodes; units hand-laid per edge (s0,s1); MAP.pois of my buildings patched at build so interior doors follow my geometry (Leonidas -> b264 north edge e3 per OSM node).
- Writing js/89g_lm_kassaveti.js (IIFE, own tiles kv*, junction-style polykatoikia builder + neo builder for b291/b297).
- DONE: js/89g_lm_kassaveti.js v2 written (9 buildings, 43 units, 38 POIs patched); node smoke test passes (work/lm-kassaveti/smoke.js: `node smoke.js work/lm-kassaveti/gk3`); docs/research/lm/kassaveti.md written.
- NEXT: browser run k1 (views1.json, run.js) -> look -> integrate (tools/integrate.sh lm-kassaveti js/89g_lm_kassaveti.js) -> main check -> iterate.
- Browser slots are scarce (runs wait 30+ min): always run node run.js in background with timeout 7200000.
