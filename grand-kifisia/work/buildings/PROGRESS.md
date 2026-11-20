# buildings agent — PROGRESS (buildings / shopfronts / landmarks / roofs)
# OWNER-INSTANCE: workstream "buildings" is worked on by the agent labelled team:buildings.

Private copy: work/buildings/gk3. Shots: work/buildings/shots. Owned: gk3/js/30_buildings.js (+ 31_/32_ splits), docs/BUILDINGS_IMPL.md.

## Status log
- [start] read OWNER_BRIEF, ARCHITECTURE, tasks/buildings.md, sibling briefs; working copy created.

## OWNER UPDATE (from the project lead, newest demand — act on it now)
The owner now demands: "not only the shops I named — really EVERYTHING; every shop that exists in reality must be there; the map exactly like Google Maps with an identical metre-to-metre ratio; abnormal precision."
See docs/OWNER_BRIEF.md item 9. A new research bot (research-census) is building gk3/data/census.json: a complete directory of every business in the play area, geocoded to real addresses.
- buildings: build a real shopfront with its real name for EVERY POI, including those merged from census.json/Overture (MAP data from the data agent); 100 % coverage is the goal that tools/verify_placement.js must show. Strict 1:1 scale: doors 2.1 m, floor heights from data or ~3.0-3.3 m, nothing rescaled.
