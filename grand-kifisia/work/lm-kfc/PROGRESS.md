# lm-kfc PROGRESS
## Done
- 08:50 read briefs; map: KFC/Mela = b305 (w1075952145), T-shaped footprint, forecourt open to Kifisias Ave. special.kfc originally on edge 11.
- Research: travelstyle.gr (Grand Hotel de Kifissia 1897, Kifisias 238-240). Main ref = Commons 4102 aerial (CC BY-SA) in docs/research/img/lm/kfc/; crops work/lm-kfc/c1..c4.jpg.
- v1 (09:14) built without errors (13:40 run; screenshot timed out under CPU load). Backup: work/lm-kfc/v1_backup.js.
- 13:00 docs/research/lm/kfc.md written. tools/lm/kfc/shots.js = robust shot script (JS click, 240 s timeouts, GK_EVAL).
- 14:00 v2 written (work copy js/89d_lm_kfc.js == work/lm-kfc/draft_v2.js): photo re-read -> court SUNKEN 1.75 m below the avenue, KFC on the
  UPPER gallery level at the avenue end (black sign band), upper flight pavement->gallery (13 steps) next to the kiosk, lower flight into court,
  rubble retaining wall, pavilion with WHITE awnings + red floor; terrain mesh cut around the court (buildTerrain wrapper); LVL grid set so
  stairs/gallery/terrace/court are walkable (double collision segs 0.75 m either side of each level change); garden trees removed from court.
## Next
- check v2 render (run2.log, shots v2_*) -> integrate (tools/integrate.sh lm-kfc js/89d_lm_kfc.js) -> match_1 image -> iterate.
- 17:50 RESUMED. v2 render checked (shots/v2_*: no errors, stairs/kiosk/gallery/court OK). v2 INTEGRATED into main (js/89d_lm_kfc.js).
  Next: verify main boots (run3 on main), match_1 image, then iterate v3.
- 17:55 v3 edits in work copy (backup of integrated v2: work/lm-kfc/v2_integrated.js): brighter restaurant-glass texture (was reading as dark
  bookshelves), light-grey gallery mullions, chairs with legs + cushions, tan steps, and a faithful KIOSK (white booth, blue band, white
  canopy + hood with ad screens) that REPLACES the generic MAP.props.kiosk prop nearest the stair foot (splice before buildProps; INTER kiosk kept).
  Waiting for run3 (main boot check) then run v3 (views v3.json).
- 18:15 main3 check: main boots with v2, no errors, all 5 LMs built. v3 run started (run4.log).
