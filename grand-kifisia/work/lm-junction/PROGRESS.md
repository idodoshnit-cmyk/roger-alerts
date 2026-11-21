# lm-junction progress
## Done
- (step 0) read briefs; work copy exists at work/lm-junction/gk3
## Next
- research: shops.json/buildings_spec for b30 (AB), PAUL (Levidou 4), Mythos; map buildings around junction
- (step 1, 09:30) research done: no open-licence photos of AB/PAUL/corners exist on Commons (geosearch 150 m + text search); Mythos has 2 exterior REFONLY photos (shops/mythos_01,02).
  Junction = Kassaveti x Levidou x Agiou Dimitriou at (93.9,61.1). Buildings I own (OSM ids): AB b30 w668312663, NW corner b293 w1075949834, Mythos b294 w1075949835,
  b292 w1075949833 (Kostarelos), b295 w1075949836 (Kassaveti 9), PAUL b434 w1076768357, NE corner b435 w1076768358, SE corner Pyrgos b388 w1076626153.
  NOTE: buildings_spec "setb" = distance to street, NOT upper-floor setback.
- design: generic per-floor outline system (per-edge wall offset w / balcony offset r, line intersections) + custom GF renderers (mythos arch, paul, ab, generic shop)
  own tiles via defTile (jGlass,jShop,jSuper,jBakery,jGrill,jBrand,jSign0-4,jBalus,jRail,jFabric)
- (step 2, 13:10 resumed) synced work copy from main. Full model in work 89a (393 lines) boots: all 8 buildings built, 16.7k tris, 48 ms, no errors (diag.js).
  Switched shop list to b[11].shops (complete), shops.json via BDATA fallback, buildings_spec fetch. h.play() click times out under load -> runner uses evaluate click.
  NEXT: screenshots (tools/lm/junction/run.js + v1.json), fix visuals, INTEGRATE ASAP.
- (step 3, found on resume 17:50) main ALREADY has 89a integrated (13:21, 400 lines). Work copy adds plates() (brass office name plates) + darker AB awning, not yet integrated.
- (step 4, 18:20) ortho overlay docs/research/img/lm/junction/ortho_junction_REFONLY.jpg (tools/arch/ortho.py overlay 35 10 160 120). From ortho+spec: Pyrgos b388 = tiled hip roof round glazed atrium + domed round corner tower (done: atriumRoof(), tower()); b293 hip tiled roof (done); b292 flat (done); b295 tiled pent strip on front (tileEave, done), 3 storeys + copper GF per mythos_01 note (keepLv).
  NEXT: screenshot run b (queued for browser slot), fix, integrate.
- (step 5, 18:55) added category interior tiles jCafe/jFashion/jTech (CAT_TILE by shop kind), Mythos 2nd room on b293 edge 0 (mythos2(); UÉ moved right of it, matches mythos_01).
  junction.md updated (ortho section, table). Browser queue is ~20-40 min per run; run c (tools/lm/junction/v4.json) queued at 18:43. After it: fix, integrate (integrate.sh lm-junction js/89a_lm_junction.js), ORDERS_DONE entry.
