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
