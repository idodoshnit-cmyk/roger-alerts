# research-shops — PROGRESS

## State found on (re)start 2026-11-20 ~20:25
- No PROGRESS.md existed; a previous run (15:09–15:15) left: `osm_pois.json` (525 OSM POIs with x,z and distance d from spawn),
  `plotmap.py` (plots buildings+POIs around a point), `sample.py` (median colour of an image box), `raw/` (mythosplus.gr pages + vrisko page, 22 Mythos photos),
  `view/` (downscaled copies), and 18 Mythos images already copied to `docs/research/img/shops/mythos_*.jpg`.
- NOT yet written: docs/research/SHOPS.md, INTERIORS.md, GAPS_SHOPS.md, gk3/data/shops.json, img/SOURCES.md lines.

## Done
(nothing published yet)

## Next
1. Look at Mythos photos, parse menu → publish INTERIORS.md (Mythos first) + first shops.json (Mythos).
2. PAUL, Starbucks (+ building Kassaveti 19), KFC, AB Levidou 2, Sephora address.
3. Ralph Lauren store, all supermarkets, spawn-junction shops, then street by street.

## Decisions
- shops.json is written from a Python source-of-truth script in work/research-shops/build_shops.py (entries in work/research-shops/entries/*.py or a single data file), always validated before copy to MAIN.
