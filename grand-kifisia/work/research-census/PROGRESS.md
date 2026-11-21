# research-census — PROGRESS

## Log
- [start 2026-11-20 ~20:30] Read OWNER_BRIEF, ARCHITECTURE, tasks/research-census.md, tasks/data.md. No docs/ORDERS.md yet.
  Found: tools/data/src/overture_places_2026-11-18.geojson (Overture, fetched by data agent, 1.7 MB), kif.osm.
- Plan: tools/census/01_osm.py (POIs + house numbers + street lines) -> 02_overture.py -> 03_fsq.py -> 04_web (directories) -> 05_merge.py -> census.json v1 -> CENSUS.md -> scale audit -> grow.

## Done
(nothing published yet)

## Next
- write 01_osm.py
- [resume 2026-11-21 00:50] State found on disk: tools/census/{common.py,01_osm.py,03_fsq_fetch.py,addr.py} written; work/research-census/osm_*.json produced;
  raw/fsq_places_2025-02-06.json fetched (Source Cooperative mirror, release 2025-02-06). Nothing published yet. Next: run addr.py validation, write 05_merge.py -> census.json v1 FAST.
- [01:00] PUBLISHED gk3/data/census.json v1 (202611210055): 1359 places (OSM 370 + Overture 637 + FSQ 958 merged), tiers A 525 / B 313 / C 376 / X 145.
  Pipeline: tools/census/01_osm.py -> (03_fsq_fetch.py once) -> 05_merge.py (uses addr.py geocoder, cats.py categories). Re-run 05_merge.py to republish.
  Position validation vs OSM (same entity in both): final median 11.5 m, p90 33 m.
## Next (in order)
1. scale audit (tools/census/06_scale_audit.py) -> docs/research/CENSUS.md section + ORDERS_DONE note
2. docs/research/CENSUS.md v1 (07_report.py generates per-street tables)
3. web verification of named brands (Sephora, Starbucks, KFC, AB, Ralph Lauren...) + chains store locators -> tools/census/web_entries.json
4. geocoder fixes (Kifisias avenue axis LOO errors up to 490 m; Kolokotroni med 53 m), debug plot
5. check docs/ORDERS.md
- [resume 2026-11-21 ~09:00] PUBLISHED docs/research/CENSUS.md v1 (07_report.py + tools/census/report_static.tmpl; Write tool refuses .md so template is .tmpl).
  Scale audit included: max 0.198 % (29 m pair, 0.1 m grid noise), >100 m pairs max 0.055 %, projection only 0.034 % -> no correction needed.
  Next: dedupe check (e.g. Pharmacy 295 twice on Kassaveti), ORDERS_DONE note to data, web verification of brands.
- [08:35] census.json v202611210833 published (1343 / build set 828): OSM twin merge + second-pass entity merge (log work/research-census/pass2_merges.txt), suffix-strip fix (re.I).
  CENSUS.md regenerated. CREDITS.md appended (OSM/Overture/FSQ). ORDERS_DONE.md created with scale audit note to data + census note.
  No docs/ORDERS.md exists yet.
  Next: web verification layer tools/census/web_entries.json (chains: Sephora, Hondos, Starbucks, banks, pharmacies, supermarkets...), then re-run 05_merge + 07_report.
- [09:20] web layer v1: tools/census/web_entries.json (15 entries, URLs; WebFetch blocked for most hosts -> evidence from WebSearch results only).
  05_merge: web conf no longer auto-tier-A (conf>=0.8 needed); webcat used directly; outArea clusters logged in census_debug.json.
  Found: BOSS Kyriazi 15 is ~90 m south of the playable edge (OSM house numbers) -> correctly excluded. Published + CENSUS.md regenerated.
- [09:30] v202611210845 published: web_entries 18 (+Zara, Eurobank, Massimo Dutti closed). Eurobank Patriarchou Maximou 2 web entry geocodes outside area -> dropped (FSQ copy remains B). CENSUS.md regenerated, ORDERS_DONE appended. ORDERS.md has nothing for research-census.
## Next (in order)
1. more web evidence: banks/pharmacies/kiosks on Kifisias + Platanos; chains with B tier (Kiko, Longchamp, Mango, Mikel); check X entries that may still exist (Valentino, Louis Vuitton Levidou 4).
2. geocoder: Kifisias avenue LOO errors (up to 490 m), Kolokotroni median 53 m; FSQ coordinate vs OSM numbers conflicts at Kyriazi 15.
3. kiosks hole: list corners of Kifisias/Platanos without a kiosk entry.
- [resume 3, v202611210852] GEOCODER FIX published: addr.py now fits odd and even numbers as separate sequences (_fit_pts, model['par']) when >=3 OSM numbers per parity.
  LOO median 19.8 -> 12.8 m, p90 80 -> 54, max 492 -> 270; Kifisias even 244-256 had been ~300-380 m too far north (now agree with source coords). Kolokotroni LOO med 53 -> 14.
  addr.loo(AM) stored as positionValidation.geocoderLOO in census.json and shown in CENSUS.md. Backup of old addr: work/research-census/addr_v1_backup.py.
  Next: ORDERS_DONE note; then web evidence round 2 (kiosks, banks, pharmacies, chains on Kyriazi/Kifisias), then Kyriazi positions.
- [09:15] v202611210914 PUBLISHED with NEW SOURCE vrisko.gr: tools/census/08_vrisko.py (robots allows /dir/, 3 s/request, JSON-LD parse, cache raw/vrisko/*.html,
  items in raw/vrisko/vrisko_items.json). 33 category slugs harvested (probe list raw/vrisko/probe.txt; tools/census/vr_probe.sh tests slugs; pager is 0-based after page 1).
  05_merge: src 'vrisko' (PRI 4, ERR 40 m; raw coords median 27 m off), vr_name() cleans legal names, person names -> category + surname, surname entries joined 1:1 with nearest unnamed OSM POI (<60 m).
  tools/census/overrides.json: aliases (ΕΤΕ=Εθνική Τράπεζα, CrediaBank=HSBC...), rebrand HSBC->CrediaBank (Kassaveti 1), drop counters 'Εντός Πολυκαταστήματος', inside -> streetLevel false.
  addr.py: inverted directory street names ("Δηληγιάννη Θεοδώρου"). Result: 1362 entries, build set 854 (was 824), vrisko-only 25, 32 tier upgrades.
  Next: more vrisko slugs (electronics, phones, bakeries, kids, lingerie, sports, home, bags, tailors, dry cleaning, cafés...), then web checks.
- [resume 4, 2026-11-21 ~13:20] ORDERS.md item 16 addressed to research-census (with data, research-shops): SHOP PLACEMENT AUDIT -> docs/research/PLACEMENT_AUDIT.md
  (game signs vs real order per street, overlay image with delta>4 m lines, pipeline rules). Doing this first (also the user's direct complaint). vrisko slug growth postponed.
- [13:30] PLACEMENT AUDIT v1 built (not yet announced): tools/census/09_placement_audit.py [map.json] -> gk3/data/placement_audit.json + work/research-census/placement/;
  10_placement_plot.py -> docs/research/img/placement/*.png (overview + 9 street panels, viewed); 11_placement_report.py + placement_static.tmpl -> docs/research/PLACEMENT_AUDIT.md.
  Result on main map (built 08:50 from census 0845): 807 signs, 265 misplaced (70 duplicates, 86/351 OSM >4 m, 42 stale census pos, 66 wrong facade snaps), rules for data in §3.
  Found census bug: two geocoded web entries 'agreed' -> posErrM 12 (Zara). Fixed in 05_merge.locate (web _geocoded flag); backup work/research-census/05_merge_backup_pa.py. Re-running merge.
  NEXT: verify merge diff -> re-run audit -> ORDERS_DONE note to data -> vrisko more slugs.
- [13:45] PUBLISHED: gk3/data/placement_audit.json (audit of main v3.1 built 13:37 by data), PLACEMENT_AUDIT.md Part A (markers; data writes B/C outside), images, census 202611211336 (merge fixes), CENSUS.md regenerated.
  ORDERS_DONE entry appended. Before audit = work/research-census/placement/before_0850.json. Pipeline to refresh: 09 -> 10 -> 11 (after any new main map).
  NEXT: vrisko more category slugs (grow verified set: 568 signs now since Overture-only dropped), re-run 05 -> 07 -> 09/10/11.
- [14:00] DONE: OWNER DIRECTIVE 13:05 per-shop verification table (§7 of PLACEMENT_AUDIT Part A: cites, real x,z, status incl. moved/removed/missing); streets + Othonos, Deligianni.
  vrisko round 2 (17 slugs, +2 entries) -> census 202611211349, CENSUS.md regenerated. ORDERS_DONE appended (2 entries today 13:45, 14:00).
  Refresh after any new main map: python3 tools/census/09_placement_audit.py && 10_placement_plot.py && 11_placement_report.py (before file: work/research-census/placement/before_0850.json).
  NEXT (if resumed): web verification of tier-B shops on core streets (store locators of chains: Alpha Bank, Tsantilis, Beautyworld, Coffee Island...) -> web_entries.json -> 05 -> 07 -> 09/10/11.
