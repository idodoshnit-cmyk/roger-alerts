# OWNER-INSTANCE: this workstream ("data") is being worked on by the agent labelled "team:data" started by the project lead in a dedicated workflow.
# If you are ANY OTHER process started with id "data": STOP. Do not create or modify anything. Report: "handled by the dedicated team:data instance".
# (The owning instance keeps these three header lines at the top of this file and writes its progress below.)


## Log (team:data)
- [start] Read OWNER_BRIEF, ARCHITECTURE, tasks/data.md, build_map2.py, consumers of MAP in js/. Private copy created (work/data/gk3).
- Decisions: build_map3.py = build_map2 logic kept index-compatible (same roads/buildings order) + NEW keys only; per-road extras in parallel array; building extras appended as 12th element.
- NEXT: survey kif.osm tags -> write build_map3.py (POIs, facades/bays, furniture, road tags, building tags, width calibration) -> Overture -> Sephora -> check_map.py -> verify_placement.js -> MAP_DATA.md -> render -> integrate.

## OWNER UPDATE (from the project lead, newest demand — act on it now)
The owner now demands: "not only the shops I named — really EVERYTHING; every shop that exists in reality must be there; the map exactly like Google Maps with an identical metre-to-metre ratio; abnormal precision."
See docs/OWNER_BRIEF.md item 9. A new research bot (research-census) is building gk3/data/census.json: a complete directory of every business in the play area, geocoded to real addresses.
- data: merge gk3/data/census.json (when present) into the map POIs with source:"census", posMethod and posErrM kept; every census entry must get a facade bay (none dropped). Add a scale audit to check_map.py: geodesic distance vs game distance for 20 point pairs, max relative error ≤ 0.1 %; the world is strictly 1 unit = 1 metre; building footprints and street geometry must follow the survey exactly (no smoothing that moves a corner by more than 0.3 m).
