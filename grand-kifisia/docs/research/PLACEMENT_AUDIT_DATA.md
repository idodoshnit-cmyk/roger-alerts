# Placement audit — data pipeline and measured game (team:data)

Companion of docs/research/PLACEMENT_AUDIT.md (research-census). Section B: game vs OSM measured before/after; C: the placement rules now in build_map3.py; D: per-shop verification table (every business on the core streets, built or not); then street-by-street game order vs OSM order.

## B. Game vs OSM — measured (team:data)

What was measured: every shop sign the map tells the renderer to build (`MAP.pois` with `bay:"shop"`, their bay = edge segment `fx,fz ± w/2`), against every OSM shop / food / bank /
pharmacy object in the focus area, **re-read from the raw `kif.osm` and re-projected independently** of the pipeline. The OSM point is carried to its own facade (the street-facing edge
of the building containing it; a courtyard/arcade edge only when the point is within 4 m of it and the edge faces open space reached by a mapped way; never across its street).
Delta = distance from that real facade point to the game bay (0 when the bay covers the point). Script: `tools/data/placement_audit.py`; runtime check of what the renderer actually
draws: `tools/data/dump_signs.js` (boots the game, dumps `BLD.shops`).

| | map v3 (main until 14:20, BEFORE) | map v3.1 (integrated 14:20, AFTER) |
|---|---|---|
| shop signs built | 691 | 397 |
| — from OSM survey / owner-named specials | 292 | 265 |
| — from Overture alone (no verified address) | **285** | **0** |
| — from census | 114 (any tier A/B, listing coordinate) | 132 (verified address only, built at the address) |
| OSM shops whose sign is ≤ 2 m from the real facade point | 171 | 192 |
| OSM shops 4–10 m off | 27 | 16 |
| OSM shops > 10 m off | 27 | 8 |
| same business drawn twice (same name < 60 m) | many (research-census counted 70) | 0 (5 merged) |
| signs on the wrong side of their street | 0 by this metric (research-census: several) | 0 (research-census audit: 1, an unnamed florist at the station) |
| research-census `09_placement_audit.py` on the same map: OSM delta > 4 m | 86 of 351 | 59 of 351 (median 0.9 m, p90 6.0 m) |

Remaining OSM deltas > 4 m are of two kinds, both listed by name in `docs/research/PLACEMENT_AUDIT_DATA.md`: (1) shop points deep inside a block (the Kolokotroni/Argyropoulou stoas,
the Mela arcade) where two facades are about equally near and the two audits pick different ones; (2) very crowded frontages (e.g. Kolokotroni b443 edge 2) where 2.2 m bays in surveyed
order still push a centre 5–12 m along the same facade. 18 surveyed shops did not fit even at 2.2 m each: they are on the building's directory board (same building, never moved
round the corner). Images (north up, metres; red = sign from OSM, purple = census at verified address, blue dot = OSM point, blue ring = OSM point without a shop sign (plate,
directory, kiosk…), green line = delta > 4 m):

![before](img/placement_data/before_centre.png)
![after centre](img/placement_data/after_centre.png)
![after east (Kolokotroni / Argyropoulou)](img/placement_data/after_east.png)
![after Kifisias Ave](img/placement_data/after_kifisias.png)

Street-by-street tables (game order next to OSM order, with side, house number, x/z, delta) for Kassaveti, Levidou, Kyriazi, Kolokotroni, Kifisias Ave, Platanos and Argyropoulou:
`docs/research/PLACEMENT_AUDIT_DATA.md`.

## C. Pipeline rules now in build_map3.py (team:data, integrated 2026-11-21 14:20)

1. **OSM-surveyed position wins.** A surveyed shop goes on the building that contains its point (else a building within 12 m, 25 m at most, reached without crossing a street centre line),
   on the nearest facade edge; the addressed street only breaks near-ties. It is never moved to another edge because an edge is full: bays are squeezed (min 2.2 m, 0.3 m gaps, in
   surveyed order); only the surplus becomes a directory-board entry of the same building. Courtyard/arcade edges are used only for points within 4 m of them that face open space a
   mapped way reaches (real stoa frontage).
2. **Overture alone is never built.** An Overture place only enriches the OSM/census entry it matches (id, confidence, address kept as evidence).
3. **Census-only businesses** (research-census, tiers A/B, not closed) are built only with a **verified address**: street + house number, and the number is (a) a surveyed OSM house
   number on that street, or (b) bracketed by surveyed numbers ≤ 12 apart on the same side (interpolated), or (c) when OSM has no numbering there, a tier-A entry confirmed by two
   independent sources whose position lies on its addressed street with an unambiguous side (house-number parity when it lies on the centre line). The listing position must agree with
   the address within 35 m. It is built **at the address**, on a facade that faces its street on the address side, within 15 m, and only in frontage left free by the OSM bays (never
   overlapping one). No free frontage → directory board of that building. 133 verified entries without such an address are not built (listed in `MAP.meta.audit.censusUnbuilt` with the reason).
4. **One sign per business:** same normalised name/brand within 60 m → one entry (survey node > OSM area > census); merged ids kept in `dups`.
5. **Closed:** census tier X / `open:false` and Overture closed are never built; census tier C (existence unknown) is never built.
6. **Never the wrong side / wrong building:** OSM candidates crossing a main street are rejected; census candidates must face their street on the address side; the Starbucks pavilion and the
   Ralph Lauren villa take no census tenants; Sephora (not in OSM) is on the even = EAST side of Levidou (house-number parity learnt from 58 surveyed (way, parity) pairs), building b432.
7. Bays leave 0.3 m margins and gaps exactly like `js/30_buildings.js layoutEdges()`, so the renderer has no reason to move them (verified by the runtime dump of v3.2, see end of C2).
8. Bug fixed on the way: the name normaliser dropped the word "Κηφισίας/kifisias" (a stop word for shop names), so **no address on Kifisias Avenue could ever match its street**
   (parity, street facing, geocoding). Street keys now use their own normaliser.

`MAP.meta.audit` (in kifisia_map.json): rules, overtureNotBuilt, censusUnbuilt[{name,street,number,why}], duplicatesMerged, directoryBecauseEdgeFull, censusSaysClosedOsmKept.
Acceptance on the integrated map: `tools/data/check_map.py` PASS; research-census `09_placement_audit.py` (run on a private copy so it does not overwrite their published files):
DUPLICATE 0, CLOSED 0, WRONG_SIDE 1, osmOver4 59.

### C2. Map v3.2 (team:data, integrated 2026-11-21 18:03 UTC) — answers research-census's requests (a)–(d) of 13:45

9. **A census tenant whose address is a surveyed building's own address belongs to that building.** 99 OSM building ways carry `addr:street` + `addr:housenumber`
   (ranges such as "8-10" expanded). When a verified census address equals one of them (building within 20 m of the geocoded address), the entry is placed only on that
   building's facades on the street of its address; if those are full of OSM-surveyed shops, its name goes on that building's directory board — never on the neighbour.
   Examples: the 13 "Κολοκοτρώνη 1" listings (Bowling Center, EMS, Hom+ Plus, ZerTeo, SmileWorks…) are now on b33 "Φοίνικας" (OSM `shop=mall`, addr Κολοκοτρώνη 1), not on
   the unnamed neighbour b931; "Κηφισίας 232" listings are on b262 (OSM addr 232), not b263.
10. **A bay never drifts away from its surveyed point when it widens.** The final widening pass now only grows a bay in ways that do not move its centre further from the
    OSM point / address (before, a bay next to a free stretch grew one-sidedly and its centre moved up to 5 m).
11. **Directory boards:** names that did not fit on a frontage share one board per entrance cluster (names < 6 m apart along the facade), instead of being spread as
    plates that pushed surveyed plates aside.
12. **Geocoder:** an address anchor lying beyond the end of a street line by more than 20 m is ignored (the AB supermarket on Kyriazi is tagged "Λεβίδου 2" in OSM; it
    had dragged every "Levidou 2" listing 69 m away).
13. **research-census address model as a last resort** (`tools/census/addr.py`, feature-detected): a tier-A entry confirmed by two sources whose exact house number is
    attested by an independent listing on that street (model error ≤ 18 m) and whose listing lies within 35 m of that point is built there (2 entries, e.g. Imaginarium Λεβίδου 2).

research-census `09_placement_audit.py` on main, before → after v3.2: WRONG_BUILDING 43 → 14, WRONG_STREET 0 → 0, WRONG_SIDE 1 → 1, real businesses without a sign 22 → 15,
OSM shops > 4 m from their shopfront 60 → 48 of 352, OSM delta median 0.9 → 0.5 m, p90 6.4 → 5.7 m. DUPLICATE 0 → 1: two OSM-surveyed Alpha Bank branches 72 m apart
(Φοίνικας arcade and Λεβίδου 16) — both are real survey objects and are kept. The 14 remaining WRONG_BUILDING are census entries where the two geocoders disagree by one
building (e.g. the three "Κολοκοτρώνη 10" listings, which research-census's own truth puts on three different buildings; "Κηφισίας 238" which the census truth puts on
b290 although OSM tags b290 as Κηφισίας 236). `tools/data/check_map.py` PASS.

**Runtime check of v3.2 (what the renderer really draws, 2026-11-21 18:15 UTC).** `tools/data/dump_and_shoot.js` booted MAIN headless and dumped `BLD.shops`;
`tools/data/compare_runtime.py` compared each rendered sign with its map bay: of 398 map shop bays, **369 are drawn by js/30_buildings.js and all 369 sit exactly on their bay**
(centre ≤ 0.3 m, width ± 0.3 m): 0 moved, 0 resized, 0 runtime errors. The other **29 bays are on buildings handed to the landmark modules** (89_landmarks: b293, b294, b295, b305,
b292, b388, b425, b426, b430/434/435, b30) — 6 are the specials those modules build themselves (PAUL, AB, KFC, Starbucks, Mythos, Ralph Lauren); the other 23 (Nak, Everest, Desigual,
Goody's, Γερμανός, Hachiko, Simply Burgers, La Pasteria, Flocafe, Imaginarium, …) are drawn only if the landmark module draws them — none of js/89a–g reads MAP.pois yet.
Table: `work/data/audit/runtime_vs_map.md`; shots `work/data/shots/pa_*.png` (e.g. pa_phoenix: JEGE, Lentros and the census tenants on b33's Kolokotroni front).

## D. Per-shop verification table (team:data, generated by tools/data/shop_table.py from the integrated map)

Every business on the core streets (Kassaveti, Levidou, Kyriazi, Kolokotroni, Argyropoulou, Kifisias Ave, Platanos square, Othonos, Deligianni) inside the play area, built or not. `real x,z` = OSM-surveyed point, or the verified address position (census), or the listing coordinate (not built). `game x,z` = the bay / plate the renderer builds. `delta` = distance along the facade between the real point and the shopfront bay (0 when the bay covers it). Totals: unverified 492, verified 387, removed 91, moved 52.

### Kassaveti (Κασσαβέτη) — 148 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Akouson | Kassaveti 1 | OSM survey (n10098110168); also OSM, Overture | -10.3, 45.0 | -10.2, 43.8 |  | verified (OSM survey), door plate (upper floor / office) |
| Bottega Belleza | Kassaveti 1 | OSM survey (n10098118201); also OSM, Overture | -11.5, 44.9 | -14.0, 43.3 | 0.7 | verified (OSM survey) |
| Bueno | Kassaveti 1 | OSM survey (n10098103361); also Foursquare OS Places, OSM, Overture, vrisko.gr | -35.6, 39.0 | -32.4, 38.7 | 0.3 | verified (OSM survey) |
| CrediaBank | Kassaveti 1 | OSM survey (n4656636032); also Foursquare OS Places, OSM, vrisko.gr, web/official site | -43.5, 26.3 | -35.6, 24.7 | 1.4 | verified (OSM survey) |
| Deli To Bacco | Kassaveti 1 | OSM survey (n10098127030); also OSM, vrisko.gr | -17.9, 45.3 | -18.1, 42.8 | 0.0 | verified (OSM survey) |
| Lilá | Kassaveti 1 | OSM survey (n10098116489); also OSM | -26.7, 44.5 | -26.3, 41.3 | 0.0 | verified (OSM survey) |
| Nara Camicie | Kassaveti 1 | Foursquare OS Places | - | -27.4, 44.4 |  | unverified (old/weak listing, census tier C): not built |
| OJO Sunglasses | Kassaveti 1 | Foursquare OS Places | -44.7, 34.9 | -18.0, 41.1 | 25.0 | moved 25.0 m along the facade (crowded frontage; address = surveyed OSM number) |
| Stories Alexi Andriotti | Kassaveti 1 | Foursquare OS Places | - | -39.7, 37.2 |  | removed (reported closed, census tier X) |
| Swiss Corner | Kassaveti 1 | OSM survey (n11069636734); also OSM | -2.7, 45.8 | -3.3, 43.7 | 0.0 | verified (OSM survey) |
| THIROS | Kassaveti 1 | Foursquare OS Places, vrisko.gr | -31.2, 43.2 | -18.0, 41.1 | 8.9 | moved 8.9 m along the facade (crowded frontage; address = surveyed OSM number) |
| TheFixers | Kassaveti 1 | OSM survey (n10098116625); also Foursquare OS Places, OSM, Overture | -7.3, 45.3 | -6.7, 43.7 | 0.0 | verified (OSM survey) |
| glamur | Kassaveti 1 | Foursquare OS Places, vrisko.gr | -40.5, 36.8 | -18.0, 41.1 | 19.7 | moved 19.7 m along the facade (crowded frontage; address = surveyed OSM number) |
| Το Χωριάτικο | Kassaveti 1 | OSM survey (n10098129864); also Foursquare OS Places, OSM, Overture, vrisko.gr | -22.7, 44.9 | -22.6, 42.0 | 0.0 | verified (OSM survey) |
| Ace Burger Company | Kassaveti 3 | Foursquare OS Places | - | 27.5, 36.6 |  | removed (reported closed, census tier X) |
| Ben & Jerry's | Kassaveti 3 | Foursquare OS Places | - | 1.9, 39.7 |  | removed (reported closed, census tier X) |
| Coffee Qubes | Kassaveti 3 | Foursquare OS Places | - | 20.2, 42.0 |  | unverified (old/weak listing, census tier C): not built |
| Join Juice Bar | Kassaveti 3 | Foursquare OS Places | - | 4.2, 41.4 |  | removed (reported closed, census tier X) |
| Manchester United Athens Club | Kassaveti 3 | Foursquare OS Places | - | 3.5, 37.3 |  | removed (reported closed, census tier X) |
| Metropolis | Kassaveti 3 | Foursquare OS Places | - | 28.3, 32.7 |  | removed (reported closed, census tier X) |
| Queen Burger | Kassaveti 3 | Foursquare OS Places | - | 24.2, 42.2 |  | unverified (old/weak listing, census tier C): not built |
| SyWear | Kassaveti 3 | Overture | 21.2, 42.1 | 19.3, 25.1 | 0.1 | verified (address = surveyed OSM number) |
| SyWear | Κασσαβέτη 3 | Overture only (confidence 0.52) | - | -15.4, 44.7 |  | unverified (Overture only, no census confirmation): not built |
| The Bee Bros | Kassaveti 3 | Overture | - | 12.2, 41.7 |  | unverified (old/weak listing, census tier C): not built |
| Tricks | Kassaveti 3 | Foursquare OS Places, Overture | - | 26.8, 40.5 |  | removed (reported closed, census tier X) |
| Wagamama | Kassaveti 3 | OSM survey (n7040794587); also Foursquare OS Places, OSM, Overture | 10.6, 41.6 | 10.7, 39.1 | 0.0 | verified (OSM survey) |
| littleDiner | Kassaveti 3 | Foursquare OS Places | - | 8.2, 41.6 |  | unverified (old/weak listing, census tier C): not built |
| Bibi boutique | Kassaveti 4 | OSM survey (n10098109194); also Foursquare OS Places, OSM, Overture | 17.7, 61.5 | 17.4, 62.9 | 0.0 | verified (OSM survey) |
| Coffee Island | Kassaveti 4 | Foursquare OS Places, vrisko.gr | -2.0, 60.5 | -2.9, 68.1 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Drip | Kassaveti 4 | Foursquare OS Places, Overture | -2.0, 60.5 | -2.9, 68.1 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| I-Bank Corner | Κασσαβέτη 4 | Overture only (confidence 0.92) | - | 15.2, 55.6 |  | unverified (Overture only, no census confirmation): not built |
| L'Occitane | Kassaveti 4 | OSM survey (n10098115328); also Foursquare OS Places, OSM, Overture, vrisko.gr | 8.2, 60.5 | 8.0, 62.1 | 0.0 | verified (OSM survey) |
| Leonidas | Kassaveti 4 | OSM survey (n10098070077); also Foursquare OS Places, OSM, Overture | -29.2, 85.1 | -32.3, 82.8 | 0.0 | verified (OSM survey) |
| MrPhone.gr | Kassaveti 4 | OSM survey (n10098110170); also Foursquare OS Places, OSM | 2.7, 61.0 | 2.4, 62.7 | 0.0 | verified (OSM survey) |
| Naturafoods | Kassaveti 4 | Overture | -2.0, 60.5 | -2.9, 68.1 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Naturafoods | Κασσαβέτη 4 | Overture only (confidence 0.69) | - | 23.4, 64.4 |  | unverified (Overture only, no census confirmation): not built |
| The sweet spot | Kassaveti 4 | OSM survey (n4721277584); also Foursquare OS Places, OSM | -4.6, 60.2 | -3.1, 62.1 | 0.0 | verified (OSM survey) |
| Triumph | Kassaveti 4 | OSM survey (n10098070078); also Foursquare OS Places, OSM, Overture | 11.4, 60.8 | 11.2, 62.5 | 0.0 | verified (OSM survey) |
| Triumph Lingerie - Kifisia | Kassaveti 4 | Overture only (confidence 0.98) | - | 31.8, 33.2 |  | unverified (Overture only, no census confirmation): not built |
| i-bank corner | Kassaveti 4 | Foursquare OS Places, Overture | -2.0, 60.5 | -2.9, 68.1 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Ζενίθ | Kassaveti 4 | OSM survey (n10098103379); also Foursquare OS Places, OSM | -0.7, 60.6 | -0.5, 62.2 | 0.0 | verified (OSM survey) |
| Βάρσος | Kassaveti 5 | OSM survey (n4721277016); also Foursquare OS Places, OSM, Overture, vrisko.gr | 30.0, 42.9 | 30.4, 40.6 | 0.0 | verified (OSM survey) |
| Dust Cream | Kassaveti 6 | OSM survey (n10098067666); also Foursquare OS Places, OSM, Overture, vrisko.gr | 23.8, 63.1 | 23.6, 65.0 | 0.0 | verified (OSM survey) |
| Messagero | Kassaveti 6 | OSM survey (n10098118202); also OSM, vrisko.gr | 28.7, 94.9 | 30.3, 87.6 |  | verified (OSM survey), door plate (upper floor / office) |
| Pharmacy 295 | Kassaveti 6 | Overture only (confidence 0.99) | - | 36.3, 63.2 |  | unverified (Overture only, no census confirmation): not built |
| Pisxos optics visionworks | Kassaveti 6 | Overture, vrisko.gr | 34.3, 64.2 | 26.6, 73.8 | 4.7 | moved 4.7 m along the facade (crowded frontage; address = surveyed OSM number) |
| Pisxos optics visionworks | Κασσαβέτη 6 | Overture only (confidence 0.91) | - | 41.7, 71.4 |  | unverified (Overture only, no census confirmation): not built |
| TISSA | Kassaveti 6 | vrisko.gr | 27.6, 63.5 | 26.6, 73.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| The Body Shop | Kassaveti 6 | Foursquare OS Places | - | 31.6, 63.9 |  | removed (reported closed, census tier X) |
| Vodafone | Kassaveti 6 | OSM survey (n10098090459); also Foursquare OS Places, OSM, Overture | 46.4, 66.4 | 46.2, 68.1 | 0.0 | verified (OSM survey) |
| pharmacy | Kassaveti 6 | OSM survey (n10098067665); also Foursquare OS Places, OSM, Overture, vrisko.gr | 41.7, 65.9 | 41.1, 67.5 | 0.0 | verified (OSM survey) |
| Holland Barrett | Kassaveti 7 | OSM survey (n12560123969); also Foursquare OS Places, OSM, Overture | 37.7, 45.4 | 38.1, 41.7 | 0.0 | verified (OSM survey) |
| Γερμανός | Kassaveti 7 | OSM survey (n12560123971); also Foursquare OS Places, OSM | 115.8, 43.4 | 118.1, 43.8 | 0.0 | verified (OSM survey) |
| Ancho | Kassaveti 9 | OSM survey (n10098118200); also Foursquare OS Places, OSM, Overture | 49.2, 46.5 | 49.8, 42.8 | 0.0 | verified (OSM survey) |
| En Kassaveti Peridromos | Kassaveti 9 | Foursquare OS Places, Overture | - | 54.9, 47.1 |  | removed (reported closed, census tier X) |
| Munchy's | Kassaveti 9 | Foursquare OS Places, Overture, vrisko.gr | 66.3, 48.2 | 64.1, 39.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Munchy's Burgers | Κασσαβέτη 9 | Overture only (confidence 0.79) | - | 45.5, 51.2 |  | unverified (Overture only, no census confirmation): not built |
| Nine Steak House | Kassaveti 9 | Foursquare OS Places | - | 58.9, 47.5 |  | unverified (old/weak listing, census tier C): not built |
| Nova | Kassaveti 9 | OSM survey (n7309463885); also Foursquare OS Places, OSM, Overture | 43.7, 46.0 | 44.1, 42.4 | 0.0 | verified (OSM survey) |
| Γρηγόρης | Kassaveti 9 | Foursquare OS Places | - | 70.8, 48.6 |  | unverified (old/weak listing, census tier C): not built |
| Εν Κασσαβέτη Περίδρομος | Κασσαβέτη 9 | Overture only (confidence 0.67) | - | 46.2, 50.8 |  | unverified (Overture only, no census confirmation): not built |
| Το Καλαμάκι | Kassaveti 9 | OSM survey (n9830482970); also Foursquare OS Places, OSM, Overture, vrisko.gr | 56.5, 47.3 | 56.8, 43.5 | 0.0 | verified (OSM survey) |
| La Pasteria | Kassaveti 10 | OSM survey (n6291212004); also Foursquare OS Places, OSM, Overture, vrisko.gr | 115.9, 76.8 | 114.7, 80.2 | 0.0 | verified (OSM survey) |
| Ακίνητα Πόλις Δύναμις | Κασσαβέτη 10 | Overture only (confidence 0.83) | - | 102.3, 70.2 |  | unverified (Overture only, no census confirmation): not built |
| DPA Architects - Δούρος Νικόλαος, Παλαιολογοπούλου Βασιλική | Kassaveti 11 | Overture | - | 56.6, 45.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 11) |
| DPA Architects - Δούρος Νικόλαος, Παλαιολογοπούλου Βασιλική | Κασσαβέτη & Κύπρου 11, Κηφισιά | Overture only (confidence 0.95) | - | 55.5, 57.5 |  | unverified (Overture only, no census confirmation): not built |
| La Maison du Grec | Kassaveti 11 | Foursquare OS Places | - | 66.9, 48.2 |  | unverified (old/weak listing, census tier C): not built |
| Litta | Kassaveti 11 | Foursquare OS Places, Overture, vrisko.gr | 66.3, 48.2 | 66.4, 46.7 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| Litta | Κασσαβέτη 11 | Overture only (confidence 0.71) | - | 61.4, 52.2 |  | unverified (Overture only, no census confirmation): not built |
| Yard 242 | Kassaveti 11 | Overture | - | 61.1, 46.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 11) |
| Yard 242 | Κασσαβέτη 11 | Overture only (confidence 0.57) | - | 61.4, 43.3 |  | unverified (Overture only, no census confirmation): not built |
| Βενέτη | Kassaveti 11 | OSM survey (n12560123967); also Foursquare OS Places, OSM, vrisko.gr | 67.9, 48.3 | 68.2, 44.4 | 0.0 | verified (OSM survey) |
| Archive Visual Storytellers | Kassaveti 12 | Overture | - | 136.7, 86.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 12) |
| Archive Visual Storytellers | Kassaveti 12 | Overture only (confidence 0.69) | - | 135.8, 98.5 |  | unverified (Overture only, no census confirmation): not built |
| Barefoot Contessa | Kassaveti 12 | Foursquare OS Places | - | 138.3, 81.3 |  | removed (reported closed, census tier X) |
| Manolea Gouskos Hairstylists | Kassaveti 12 | Foursquare OS Places, Overture, vrisko.gr | 123.3, 79.3 | 122.8, 80.7 | 0.0 | verified (two-source listing on its street) |
| ManoleaGouskos-kifisia | Kassaveti 12 | Overture only (confidence 0.97) | - | 123.7, 78.2 |  | unverified (Overture only, no census confirmation): not built |
| Mosh | Kassaveti 12 | Foursquare OS Places | - | 128.1, 102.4 |  | unverified (old/weak listing, census tier C): not built |
| Recipe Bar | Kassaveti 12 | Foursquare OS Places, Overture, vrisko.gr | 140.5, 82.0 | 138.9, 83.0 | 0.0 | verified (two-source listing on its street) |
| Recipe Bar | Kassaveti 12 | Overture only (confidence 0.99) | - | 136.4, 81.3 |  | unverified (Overture only, no census confirmation): not built |
| Saitis Nektarios | Kassaveti 12 | OSM survey (n6291212005); also Foursquare OS Places, OSM | 145.1, 83.4 | 143.8, 87.5 | 0.0 | verified (OSM survey) |
| spoondesign | Kassaveti 12 | Overture | - | 130.2, 98.9 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 12) |
| spoondesign | Kassaveti 12 | Overture only (confidence 0.78) | - | 113.8, 79.0 |  | unverified (Overture only, no census confirmation): not built |
| Amos Cafe | κ, Κασσαβετη 13, Levidou 1 | Overture only (confidence 0.97) | - | 109.5, 23.7 |  | unverified (Overture only, no census confirmation): not built |
| Bubble Tale | Kassaveti 13 | Foursquare OS Places | - | 85.5, 48.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 13) |
| Buzzer Bitter | Kassaveti 13 | Foursquare OS Places | - | 76.7, 47.6 |  | unverified (old/weak listing, census tier C): not built |
| MYTHOS plus | Kassaveti 13 | OSM survey (n10098110169); also Foursquare OS Places, OSM, Overture, vrisko.gr, web/official site | 76.6, 49.1 | 75.4, 45.7 | 0.0 | verified (OSM survey) |
| Master Meat | Κασσαβέτη 13 | Overture only (confidence 0.91) | - | 78.7, 42.5 |  | unverified (Overture only, no census confirmation): not built |
| Trieste Cafe | Kassaveti 13 | Foursquare OS Places | - | 63.9, 46.4 |  | removed (reported closed, census tier X) |
| UÉ | Kassaveti 13 | OSM survey (n10207374863); also OSM, vrisko.gr | 82.7, 49.8 | 82.1, 47.5 | 0.0 | verified (OSM survey) |
| Yoo Moo Fat Free Yogurt | Kassaveti 13 | Foursquare OS Places | - | 81.7, 49.7 |  | removed (reported closed, census tier X) |
| Ίδρυμα Εικαστικών Τεχνών Τσιχριτζή | Kassaveti 18 | OSM survey (n6291212006); also Foursquare OS Places, OSM, Overture | 212.4, 108.1 | 210.7, 113.2 |  | verified (OSM survey), sign over the building entrance |
| C De C - Κατσαντωνη Η Ηρα | Kassaveti 19 | Foursquare OS Places, vrisko.gr | - | 174.6, 76.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 19) |
| Da Vinci | Kassaveti 19 | Foursquare OS Places, Overture, vrisko.gr | 176.4, 77.2 | 166.5, 65.3 | 11.6 | moved 11.6 m along the facade (crowded frontage; two-source listing on its street) |
| Da Vinci Gelato | Kassaveti 19 | Overture only (confidence 1.00) | - | 155.5, 73.2 |  | unverified (Overture only, no census confirmation): not built |
| Dialogue Public Relations | Kassaveti 19 | Overture | - | 167.2, 64.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 19) |
| Dialogue Public Relations | Κασσαβέτη 19 | Overture only (confidence 0.84) | - | 171.1, 38.2 |  | unverified (Overture only, no census confirmation): not built |
| Different Beast | Kassaveti 19 | OSM survey (n3781052994); also Foursquare OS Places, OSM, Overture | 168.2, 66.7 | 166.4, 69.5 | 0.0 | verified (OSM survey) |
| LOL the BRAND | Kassaveti 19 | Foursquare OS Places, Overture, vrisko.gr | 146.7, 66.7 | 152.7, 66.4 | 3.0 | verified (two-source listing on its street) |
| LOL the BRAND | Κασσαβέτη 19 | Overture only (confidence 0.94) | - | 166.8, 57.9 |  | unverified (Overture only, no census confirmation): not built |
| La Queen | Kassaveti 19 | Foursquare OS Places, Overture | 110.8, 75.0 | 103.7, 72.9 | 4.8 | moved 4.8 m along the facade (crowded frontage; two-source listing on its street) |
| La Queen Kifissia | Κασσαβέτη 19 | Overture only (confidence 0.91) | - | 99.9, 71.0 |  | unverified (Overture only, no census confirmation): not built |
| Love & Light | Kassaveti 19 | Foursquare OS Places | - | 168.7, 66.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 19) |
| Niki Kartsona The Stores | Kassaveti 19 | Overture, vrisko.gr | 180.6, 78.7 | 184.3, 78.3 | 0.8 | verified (two-source listing on its street) |
| Niki Kartsona The Stores | Kassaveti 19 Kifisia, Aristomenous 67 | Overture only (confidence 0.92) | - | 185.1, 76.0 |  | unverified (Overture only, no census confirmation): not built |
| Par'amour | Κασσαβέτη 19 | Overture only (confidence 0.81) | - | 185.9, 103.2 |  | unverified (Overture only, no census confirmation): not built |
| Polo Ralph Lauren | Kassaveti 19 | Foursquare OS Places, Overture, vrisko.gr, web/official site | 162.8, 63.2 | 163.3, 61.8 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| Polo Ralph Lauren | Κασσαβέτη 19 | Overture only (confidence 0.77) | - | 167.9, 48.3 |  | unverified (Overture only, no census confirmation): not built |
| Ralph Lauren Kifisia | Kassaveti 19 | Overture only (confidence 0.99) | - | 176.2, 71.9 |  | unverified (Overture only, no census confirmation): not built |
| STARBUCKS COFFEE | Kassaveti 19 | address (research); also Foursquare OS Places, Overture, vrisko.gr, web/official site | 158.2, 66.5 | 159.0, 66.0 | 0.0 | verified (OSM survey) |
| The Kassaveti Outlet | Kassaveti 19 | Overture | - | 163.2, 63.3 |  | unverified (old/weak listing, census tier C): not built |
| Valentino | Kassaveti 19 | Foursquare OS Places | - | 171.4, 66.0 |  | removed (reported closed, census tier X) |
| Venetia Vildiridis | Kassaveti 19 | Foursquare OS Places, Overture | - | 170.4, -6.1 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κασσαβέτη 19) |
| Venetia Vildiridis | Κασσαβέτη 19 | Overture only (confidence 0.77) | - | 171.1, -5.8 |  | unverified (Overture only, no census confirmation): not built |
| par'amour | Kassaveti 19 | Foursquare OS Places, Overture | 185.7, 80.4 | 187.6, 79.5 | 0.0 | verified (two-source listing on its street) |
| Jasmine Skylounge | Λεωφόρος Κηφισίας 232 &, Kassaveti | Overture only (confidence 0.98) | - | -60.1, 64.5 |  | unverified (Overture only, no census confirmation): not built |
| Vivify - The Beauty Lab | Λεωφόρος Κηφισίας 234 & Κασσαβέτη 1ος όροφος | Overture only (confidence 0.98) | - | -41.8, 30.6 |  | unverified (Overture only, no census confirmation): not built |
| AdLib | Kassaveti  | Foursquare OS Places | - | 163.4, 33.7 |  | unverified (old/weak listing, census tier C): not built |
| Akourou Computer Services | Kassaveti  | Foursquare OS Places | - | 99.8, 31.2 |  | removed (reported closed, census tier X) |
| Alexi Andriotti Storys | Kassaveti  | Foursquare OS Places | - | 5.6, 71.4 |  | unverified (old/weak listing, census tier C): not built |
| Axel | Kassaveti  | Foursquare OS Places | - | 13.6, 61.1 |  | unverified (old/weak listing, census tier C): not built |
| Birra Moretti | Kassaveti  | Foursquare OS Places | - | 72.5, 70.6 |  | unverified (old/weak listing, census tier C): not built |
| Bufala Gelato | Kassaveti  | OSM survey (n7017421288); also Foursquare OS Places, OSM | 77.9, 49.3 | 78.3, 45.7 |  | verified (OSM survey), name on the building directory board (frontage full) |
| DelBacco | Kassaveti  | Foursquare OS Places | - | -3.1, 44.2 |  | unverified (old/weak listing, census tier C): not built |
| Grey Goose | Kassaveti  | Foursquare OS Places, Overture | - | 145.6, 83.5 |  | unverified, not built: no house number |
| Kiosky's | Kassaveti  | Overture | - | -46.7, 34.0 |  | unverified, not built: no house number |
| Magnifique | Kassaveti  | OSM survey (n9830492199); also OSM | 15.9, 41.9 | 16.0, 39.1 | 0.0 | verified (OSM survey) |
| Med | Kassaveti  | Foursquare OS Places | - | -14.6, 30.0 |  | unverified (old/weak listing, census tier C): not built |
| Metropolis | Kassaveti  | Foursquare OS Places | - | 239.2, -46.9 |  | removed (reported closed, census tier X) |
| Motorbike | Kassaveti  | Foursquare OS Places | - | 46.3, 46.2 |  | unverified (old/weak listing, census tier C): not built |
| My Pet Vet | Kassaveti  | Foursquare OS Places | - | -14.2, 21.9 |  | unverified (old/weak listing, census tier C): not built |
| Nak | Kassaveti  | OSM survey (n4638357560); also OSM | 61.9, 47.8 | 62.2, 43.9 | 0.0 | verified (OSM survey) |
| Nikolas Nikitopoulos Hair Salon | Kassaveti  | Foursquare OS Places | - | 27.6, 63.5 |  | unverified, not built: no house number |
| Oikotexniki Domiki S.A. | Kassaveti  | Overture | - | 170.6, 65.7 |  | unverified (old/weak listing, census tier C): not built |
| PatentaGroup | Kassaveti  | Overture | - | -19.3, 45.2 |  | unverified, not built: no house number |
| Prairie | Kassaveti  | Foursquare OS Places | - | 67.4, 18.3 |  | unverified (old/weak listing, census tier C): not built |
| The Tome Artisans | Kassaveti  | Foursquare OS Places | - | -25.5, 25.5 |  | unverified, not built: no house number |
| kiosk | Kassaveti  | OSM survey (n6291212650); also OSM | - | 75.0, 66.0 |  | verified (OSM survey), free-standing (standalone) |
| peroni italy | Kassaveti  | Foursquare OS Places | - | 142.2, 43.5 |  | removed (reported closed, census tier X) |
| pharmacy | Kassaveti  | OSM survey (n10098113939) | 29.5, 63.7 | 29.4, 65.3 | 0.0 | verified (OSM survey) |
| Αλεξάνδρα Δαμβουνέλη Διαιτολόγος-Διατροφολόγος | Kassaveti  | Foursquare OS Places | - | -1.1, 60.6 |  | unverified (old/weak listing, census tier C): not built |
| Κλειδαρας | Kassaveti  | Foursquare OS Places | - | 85.7, 50.2 |  | unverified, not built: no house number |
| Πίσχος | Kassaveti  | OSM survey (n10098103378); also OSM | 51.3, 67.0 | 51.4, 68.5 | 0.0 | verified (OSM survey) |
| Πύργος Κασσαβέτη | Kassaveti  | Overture | - | 182.7, 77.8 |  | unverified, not built: no house number |
| Πύργος Κασσαβέτη | Κασσαβέτη | Overture only (confidence 0.81) | - | 187.7, 63.3 |  | unverified (Overture only, no census confirmation): not built |
| Ρωμαϊκό Ταφικό Μνημείο | Kassaveti  | OSM survey (w378931288); also OSM | -48.3, 59.7 | -50.5, 61.8 |  | verified (OSM survey), sign over the building entrance |
| Υπαίθρια Ανταλλακτική Βιβλιοθήκη | Kassaveti  | Foursquare OS Places | - | 119.2, 57.6 |  | removed (reported closed, census tier X) |
| Χαντρόκοσμος | Kassaveti  | OSM survey (n10098106907); also OSM | 14.5, 61.2 | 14.6, 62.8 | 0.0 | verified (OSM survey) |

### Levidou (Λεβίδου) — 113 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Chryssinas | Levidou 1 | Foursquare OS Places | - | 90.0, 45.7 |  | removed (reported closed, census tier X) |
| Everest | Levidou 1 | OSM survey (n6291212721); also Foursquare OS Places, OSM, Overture, vrisko.gr | 90.5, 44.7 | 89.9, 45.2 | 0.0 | verified (OSM survey) |
| Gloria Jean's Coffees | Levidou 1 | Foursquare OS Places | - | 88.5, 45.2 |  | removed (reported closed, census tier X) |
| Goody's | Levidou 1 | OSM survey (n12560123968); also Foursquare OS Places, OSM, Overture, vrisko.gr | 88.4, 48.7 | 86.5, 48.4 | 0.0 | verified (OSM survey) |
| Kostarelos | Levidou 1 | Foursquare OS Places, Overture | 94.1, 38.0 | 96.0, 35.3 | 0.7 | verified (two-source listing on its street) |
| Kostarelos / Kifisia | Levidou 1 | Overture only (confidence 0.85) | - | 98.6, 31.8 |  | unverified (Overture only, no census confirmation): not built |
| Nidodileda Creative Store | Levidou 1A | Overture, vrisko.gr | 93.2, 24.0 | 92.2, 38.4 | 3.6 | verified (two-source listing on its street) |
| Nidodileda Creative Store | Levidou 1A | Overture only (confidence 0.94) | - | 75.7, 29.6 |  | unverified (Overture only, no census confirmation): not built |
| SmileWorks - Λεύκανση Δοντιών | Κολοκοτρώνη 1 & Λεβίδου | Overture only (confidence 0.58) | - | 145.3, -37.5 |  | unverified (Overture only, no census confirmation): not built |
| Tsouderos | Levidou 1 | Foursquare OS Places, Overture, vrisko.gr | 91.9, 42.1 | 90.5, 41.5 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| Tsouderos | Levidou 1 | Overture only (confidence 0.85) | - | 96.2, 44.5 |  | unverified (Overture only, no census confirmation): not built |
| UÈ! Pizza Bar | Levidou 1 | Foursquare OS Places, Overture | - | 70.2, 48.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 1) |
| UÈ! Pizza Bar | Λεβίδου 1 | Overture only (confidence 0.77) | - | 88.8, 59.5 |  | unverified (Overture only, no census confirmation): not built |
| chillbox frozen yogurt | Levidou 1Α | Foursquare OS Places, Overture | 98.5, 33.8 | 96.7, 34.1 | 0.0 | verified (two-source listing on its street) |
| chillbox frozen yogurt | Λεβίδου 1Α | Overture only (confidence 0.77) | - | 107.0, 39.6 |  | unverified (Overture only, no census confirmation): not built |
| Παγωτά Δωδώνη | Levidou 1 | Foursquare OS Places | - | 99.9, 27.8 |  | unverified (old/weak listing, census tier C): not built |
| Τυροκομείο Κωσταρέλου | Levidou 1 | Foursquare OS Places, Overture | 100.5, 29.9 | 97.6, 32.3 | 1.9 | verified (two-source listing on its street) |
| Τυροκομείο Κωσταρέλου | Λεβίδου 1 | Overture only (confidence 0.77) | - | 105.6, 36.6 |  | unverified (Overture only, no census confirmation): not built |
| Artisti Italiani Cafe | Levidou 2 | Foursquare OS Places | - | 112.6, 49.8 |  | removed (reported closed, census tier X) |
| Carpo | Levidou 2 | OSM survey (n12560123970); also Foursquare OS Places, OSM, Overture | 113.7, 47.6 | 115.6, 50.0 | 0.0 | verified (OSM survey) |
| Desigual | Levidou 2 | OSM survey (n6291212722); also Foursquare OS Places, OSM, Overture | 118.4, 58.9 | 118.4, 55.0 | 0.0 | verified (OSM survey) |
| Imaginarium | Levidou 2 | Foursquare OS Places, Overture | 125.6, 38.4 | 115.4, 47.6 | 10.7 | moved 10.7 m along the facade (crowded frontage; two-source listing on its street) |
| Imaginarium | Λεβίδου 2 | Overture only (confidence 0.77) | - | 107.4, 43.3 |  | unverified (Overture only, no census confirmation): not built |
| Serendipity | Levidou 2 | Foursquare OS Places | - | 115.1, 54.2 |  | removed (reported closed, census tier X) |
| ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ | Levidou 2 | OSM survey (w668312663); also Foursquare OS Places, OSM, Overture, vrisko.gr, web/official site | 66.4, 89.3 | 56.7, 83.8 | 0.0 | verified (OSM survey) |
| ΕΛΤΑ (Hellenic Post) | Levidou 3α | Foursquare OS Places, Overture | - | 39.4, 7.0 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 3α) |
| Louis Vuitton | Levidou 4 | Foursquare OS Places | - | 123.8, 35.7 |  | removed (reported closed, census tier X) |
| PAUL | Levidou 4 | OSM survey (n4565941901); also Foursquare OS Places, OSM, Overture, vrisko.gr, web/official site | 124.6, 30.9 | 125.5, 33.1 | 0.0 | verified (OSM survey) |
| American Vintage | Levidou 5 | Foursquare OS Places, Overture, vrisko.gr | 105.5, 18.9 | 103.8, 19.0 | 0.0 | verified (two-source listing on its street) |
| American Vintage | Levidou 5 | Overture only (confidence 0.63) | - | 119.4, 27.9 |  | unverified (Overture only, no census confirmation): not built |
| Apivita | Levidou 5 | Foursquare OS Places | - | 109.1, 9.4 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 5) |
| Beautyworld | Λεβιδου 5 | Overture only (confidence 0.55) | - | 109.8, 18.7 |  | unverified (Overture only, no census confirmation): not built |
| Lapin House | Levidou 5 | Overture, vrisko.gr | - | 106.4, 14.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 5) |
| Lapin House | Levidou 5 | Overture only (confidence 0.56) | - | 112.8, 17.9 |  | unverified (Overture only, no census confirmation): not built |
| Medical Anti Aging Center | Levidou 5 | Overture only (confidence 0.83) | - | 120.9, 45.3 |  | unverified (Overture only, no census confirmation): not built |
| Moschoutis | Levidou 5 | Foursquare OS Places, vrisko.gr | - | 113.2, 1.9 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 5) |
| Portobello's | Levidou 5 | OSM survey (n10095536164); also Foursquare OS Places, OSM | 127.3, -20.6 | 124.6, -22.4 | 0.0 | verified (OSM survey) |
| ROCOCO UOMO | Levidou 5 | vrisko.gr | - | 105.2, 16.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 5) |
| Εye-Q Optical Stores | Λεβίδου 5 | Overture only (confidence 0.72) | - | 112.3, -2.2 |  | unverified (Overture only, no census confirmation): not built |
| ΝΑΝΑ | Levidou 5 | vrisko.gr | - | 108.4, 13.7 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 5) |
| Φαρμακείο Μαλιωτάκης | Levidou 5 | Foursquare OS Places, Overture, vrisko.gr | 113.2, 5.1 | 111.9, 4.4 | 0.0 | verified (two-source listing on its street) |
| Φαρμακείο Μαλιωτάκης Παντελής, pamepharmacy.gr | Λεβίδου 5 | Overture only (confidence 0.84) | - | 112.3, -2.2 |  | unverified (Overture only, no census confirmation): not built |
| Alpha Bank | Levidou 6 | Foursquare OS Places | - | 129.5, 24.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 6) |
| SEPHORA | Levidou 8 | address Levidou 8 (Overture + census web source; even = east side by OSM house-number parity); also Foursquare OS Places, Overture, vrisko.gr, web/official site | 138.2, 2.5 | 129.4, -3.5 | 0.0 | verified (OSM survey) |
| Τσαντίλης | Levidou 8 | Foursquare OS Places | - | 137.9, 14.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 8) |
| Amos Café bistro | Levidou 10 | Foursquare OS Places, Overture, vrisko.gr | 138.3, 10.4 | 138.0, 6.2 | 1.0 | verified (two-source listing on its street) |
| Beautyworld | Levidou 10 | Foursquare OS Places, Overture | - | 144.1, -5.7 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Λεβίδου 10) |
| Little Italy | Levidou 10 | Foursquare OS Places | - | 136.7, 5.4 |  | removed (reported closed, census tier X) |
| Mikel Coffee Company | Levidou 10 | Foursquare OS Places, Overture | 135.9, 14.8 | 141.4, 8.5 | 5.9 | moved 5.9 m along the facade (crowded frontage; two-source listing on its street) |
| Mikel Coffee Company | Λεβίδου 10 | Overture only (confidence 0.77) | - | 134.8, 2.9 |  | unverified (Overture only, no census confirmation): not built |
| Swarovski | Levidou 10 | Overture only (confidence 0.99) | - | 139.3, -4.2 |  | unverified (Overture only, no census confirmation): not built |
| Swarovski | Levidou 10 | Overture only (confidence 0.99) | - | 139.3, -4.2 |  | unverified (Overture only, no census confirmation): not built |
| Bellini Aperitivo | Levidou 11 | Foursquare OS Places | - | 170.8, -119.8 |  | removed (reported closed, census tier X) |
| Cepillo | Levidou 11 | Foursquare OS Places | - | 184.1, -134.9 |  | removed (reported closed, census tier X) |
| Estrella | Levidou 11 | Foursquare OS Places | - | 187.6, -133.0 |  | removed (reported closed, census tier X) |
| Gelato | Levidou 11 | Foursquare OS Places | - | 179.9, -119.0 |  | unverified (old/weak listing, census tier C): not built |
| Giacomo | Levidou 11 | OSM survey (n10095551693); also Foursquare OS Places, OSM, Overture, vrisko.gr | 185.3, -128.8 | 179.7, -131.9 | 0.0 | verified (OSM survey) |
| Giraffe | Levidou 11 | Foursquare OS Places, Overture | - | 185.7, -129.5 |  | removed (reported closed, census tier X) |
| Hamptons Cupcakes | Levidou 11 | Foursquare OS Places, Overture | - | 177.8, -116.0 |  | removed (reported closed, census tier X) |
| Juicy Couture | Levidou 11 | Foursquare OS Places | - | 167.2, -121.7 |  | removed (reported closed, census tier X) |
| Nespresso | Levidou 11 | OSM survey (n10095551692); also Foursquare OS Places, OSM, Overture | 179.7, -118.8 | 174.7, -121.6 | 0.0 | verified (OSM survey) |
| Pearl Harbor Sushi Bar | Levidou 11 | Foursquare OS Places | - | 180.6, -136.8 |  | removed (reported closed, census tier X) |
| Rotisserie | Levidou 11 | Foursquare OS Places | - | 183.7, -126.0 |  | unverified (old/weak listing, census tier C): not built |
| Suba | Levidou 11 | Foursquare OS Places, Overture | 182.4, -123.7 | 168.9, -131.1 | 0.0 | verified (address = surveyed OSM number) |
| Suba | Λεβίδου 11 | Overture only (confidence 0.77) | - | 170.2, -133.6 |  | unverified (Overture only, no census confirmation): not built |
| Πινακοθήκη Κουβουτσάκη | Levidou 11 | OSM survey (w383346455); also Foursquare OS Places, OSM, Overture | 163.6, -133.2 | 160.8, -134.7 | 0.0 | verified (OSM survey) |
| πBOX | Levidou 11 | Foursquare OS Places | - | 174.3, -117.9 |  | removed (reported closed, census tier X) |
| Museum Café | Levidou 13 | Foursquare OS Places, Overture | 209.7, -215.9 | 188.9, -185.6 | 2.8 | verified (address = surveyed OSM number) |
| NATU Restaurant | Levidou 13 | Overture only (confidence 0.99) | - | 204.9, -162.0 |  | unverified (Overture only, no census confirmation): not built |
| Natu | Levidou 13 | Foursquare OS Places, Overture, vrisko.gr | 206.1, -217.8 | 188.9, -185.6 | 0.0 | verified (address = surveyed OSM number) |
| Μουσείο Γουλανδρή Φυσικής Ιστορίας | Levidou 13 | OSM survey (n11711407738); also OSM | 205.9, -217.9 | 188.5, -185.2 |  | verified (OSM survey), sign over the building entrance |
| Chance | Levidou 14 | OSM survey (n10095545903); also OSM, Overture, vrisko.gr | 177.6, -65.9 | 176.0, -60.2 | 4.5 | moved 4.5 m along the facade (crowded frontage; OSM survey) |
| Chance Charokopou | Λεβίδου 14 | Overture only (confidence 0.78) | - | 217.5, -101.0 |  | unverified (Overture only, no census confirmation): not built |
| Pinko | Levidou 14 | OSM survey (n10095548122); also Foursquare OS Places, OSM, Overture, vrisko.gr | 180.0, -71.8 | 178.8, -68.3 | 2.3 | verified (OSM survey) |
| Λάσκαρη | Levidou 14 | OSM survey (n10095518171); also Foursquare OS Places, OSM, Overture, vrisko.gr | 181.2, -74.7 | 181.8, -75.0 | 0.0 | verified (OSM survey) |
| Alpha Bank | Levidou 16 | OSM survey (w1077416585); also OSM, Overture | 217.7, -93.0 | 223.5, -101.5 | 0.0 | verified (OSM survey) |
| Alpha Private Bank | Levidou 16 | Overture only (confidence 0.85) | - | 197.3, -126.2 |  | unverified (Overture only, no census confirmation): not built |
| Andrea Kosta | Levidou 16 | Overture | 204.6, -116.6 | 213.0, -126.2 | 10.8 | moved 10.8 m along the facade (crowded frontage; address = surveyed OSM number) |
| Andrea Kosta | Λεβίδου 16 | Overture only (confidence 0.96) | - | 215.8, -115.4 |  | unverified (Overture only, no census confirmation): not built |
| Barber's & Co | Levidou 16 | OSM survey (n10095488557); also Foursquare OS Places, OSM, Overture, vrisko.gr | 237.2, -80.2 | 246.1, -109.7 |  | verified (OSM survey), door plate (upper floor / office) |
| Citibank | Levidou 16 | Foursquare OS Places | - | 209.1, -124.7 |  | removed (reported closed, census tier X) |
| EV Loader - City Parking Kifisia | Levidou 16 | OSM survey (n13508749461) | - | 215.5, -125.1 |  | verified (OSM survey), free-standing (standalone) |
| English Home | Levidou 16 | Foursquare OS Places | - | 230.5, -118.4 |  | unverified (old/weak listing, census tier C): not built |
| Enny Monaco | Levidou 16 | Foursquare OS Places, Overture, vrisko.gr | 209.2, -125.0 | 213.0, -126.2 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Enny Monaco Kifisia | Levidou 16 | Overture only (confidence 0.63) | - | 205.0, -127.8 |  | unverified (Overture only, no census confirmation): not built |
| Geelist | Levidou 16 | OSM survey (n10095548438); also OSM, vrisko.gr | 208.8, -124.3 | 231.6, -114.8 | 1.2 | verified (OSM survey) |
| Health Spot | Levidou 16 | Foursquare OS Places, Overture | 208.8, -124.2 | 213.0, -126.2 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Health Spot Κηφισιάς | Levidou 16 | Overture only (confidence 0.90) | - | 204.8, -128.1 |  | unverified (Overture only, no census confirmation): not built |
| MINI MO Kids Boutique | Λεβίδου 16 | Overture only (confidence 0.91) | - | 169.9, -47.7 |  | unverified (Overture only, no census confirmation): not built |
| Mini & Mo | Levidou 16 | OSM survey (n10095543953); also Foursquare OS Places, OSM, Overture, vrisko.gr | 195.7, -100.7 | 203.2, -99.4 | 0.0 | verified (OSM survey) |
| Oscar de la Renta | Levidou 16 | Foursquare OS Places | - | 212.2, -125.1 |  | unverified (old/weak listing, census tier C): not built |
| Tommy Hilfiger | Levidou 16 | Foursquare OS Places, Overture, web/official site | 219.1, -135.9 | 213.0, -126.2 | 8.7 | moved 8.7 m along the facade (crowded frontage; address = surveyed OSM number) |
| Tommy Hilfiger | Λεβίδου 16 | Overture only (confidence 0.77) | - | 343.9, -0.3 |  | unverified (Overture only, no census confirmation): not built |
| Yasu | Levidou 16 | Foursquare OS Places | - | 238.0, -115.8 |  | removed (reported closed, census tier X) |
| Παιχνιδόσπιτο | Levidou 16 | Foursquare OS Places | - | 234.3, -117.1 |  | unverified (old/weak listing, census tier C): not built |
| Accessorize | Levidou  | Foursquare OS Places | - | 140.0, -1.2 |  | unverified (old/weak listing, census tier C): not built |
| Active Sundays | Levidou  | Overture | - | 94.6, 36.9 |  | unverified (old/weak listing, census tier C): not built |
| Brick by brick | Levidou  | Foursquare OS Places | - | 189.5, -45.7 |  | unverified (old/weak listing, census tier C): not built |
| Diamantopoulos Academy | Levidou  | Foursquare OS Places | - | 154.9, 29.2 |  | unverified, not built: no house number |
| Dna Centers | Levidou  | Foursquare OS Places | - | 107.0, 16.2 |  | unverified, not built: no house number |
| Dwdwni Kifissias | Levidou  | Foursquare OS Places | - | 115.8, 43.4 |  | unverified, not built: no house number |
| Esmeralda Isufi (Fashion Designer) | Levidou  | Foursquare OS Places | - | 166.5, -122.1 |  | unverified, not built: no house number |
| Frattina | Levidou  | OSM survey (n10095543952); also Foursquare OS Places, OSM | 174.1, -57.0 | 181.7, -50.2 | 2.1 | verified (OSM survey) |
| Kassaveti Cafeteria | Levidou  | Overture | - | 101.5, 76.1 |  | unverified (old/weak listing, census tier C): not built |
| Monsoon | Levidou  | Foursquare OS Places | - | 150.7, -13.4 |  | unverified (old/weak listing, census tier C): not built |
| Relativity Capital Advisors | Levidou  | Foursquare OS Places | - | 90.5, 14.3 |  | unverified (old/weak listing, census tier C): not built |
| Stenia | Levidou  | Foursquare OS Places | - | 145.6, -11.4 |  | unverified (old/weak listing, census tier C): not built |
| Veniero | Levidou  | Foursquare OS Places | - | 171.8, -104.2 |  | unverified (old/weak listing, census tier C): not built |
| lamptons | Levidou  | Foursquare OS Places | - | 188.7, -6.9 |  | unverified (old/weak listing, census tier C): not built |
| Βιβλιοθήκη της Κηφισιάς | Levidou  | Foursquare OS Places | - | 114.3, 46.4 |  | unverified, not built: no house number |
| Ελεάννα Ι. Ψαράκη | Levidou  | OSM survey (n10095488556); also OSM | 172.9, -54.1 | 186.2, -48.1 | 0.0 | verified (OSM survey) |
| Θανασης Παπακωσταντινου Live(μπομπονιερα) | Levidou  | Foursquare OS Places | - | 182.1, -48.6 |  | removed (reported closed, census tier X) |
| Φαρμακείο Μαραγκουδάκη | Levidou  | Foursquare OS Places | - | 164.6, -146.0 |  | unverified, not built: no house number |

### Kyriazi (Κυριαζή) — 41 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| NO NAME Kifisia | Κυριαζή 13 | Overture only (confidence 0.81) | - | 63.3, 94.8 |  | unverified (Overture only, no census confirmation): not built |
| Miss Simbolo | Kyriazi 21 | Foursquare OS Places, Overture, vrisko.gr | 57.9, 158.1 | 59.3, 158.4 | 0.0 | verified (two-source listing on its street) |
| Simple Caracters | Kyriazi 23 | Foursquare OS Places, Overture, vrisko.gr | 61.7, 160.1 | 57.9, 159.1 | 1.8 | verified (two-source listing on its street) |
| Boutique Kalamaki North | Kyriazi 34 | Foursquare OS Places | - | 78.8, 170.6 |  | removed (reported closed, census tier X) |
| 520 Barcode Hellas | Kyriazi 36Β | Overture | - | 79.4, 152.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 36Β) |
| ALE | Kyriazi 36Α | Overture, vrisko.gr | 81.6, 142.9 | 79.6, 152.1 | 6.8 | moved 6.8 m along the facade (crowded frontage; two-source listing on its street) |
| Biostate | Kyriazi 36 | Overture | - | 82.0, 141.1 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 36) |
| Emporiki Bank | Kyriazi 36 | Foursquare OS Places | - | 77.9, 159.5 |  | removed (reported closed, census tier X) |
| GUESS | Kyriazi 36 | Overture | - | 83.9, 139.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 36) |
| Gap | Kyriazi 36 | Foursquare OS Places, vrisko.gr | 77.6, 160.8 | 77.8, 160.0 | 0.0 | verified (two-source listing on its street) |
| Häagen-Dazs Café | Kyriazi 36 | Foursquare OS Places | - | 82.9, 137.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 36) |
| Ma Cherie | Κυριαζή 36Α | Overture only (confidence 0.83) | - | 98.2, 104.2 |  | unverified (Overture only, no census confirmation): not built |
| Regalinas | Kyriazi 36B | Foursquare OS Places, Overture, vrisko.gr | 80.4, 148.2 | 81.9, 148.5 | 0.0 | verified (two-source listing on its street) |
| Sugarfree Kifisia Store | Kyriazi 36 A | Overture, vrisko.gr | 78.1, 167.3 | 80.2, 165.1 | 0.2 | verified (two-source listing on its street) |
| eyeQ | Kyriazi 36β | Foursquare OS Places, Overture, vrisko.gr | 82.8, 137.4 | 85.9, 130.3 | 5.1 | moved 5.1 m along the facade (crowded frontage; two-source listing on its street) |
| Δημήτρης Ζησιάδης | Kyriazi 36 | Overture | - | 80.3, 148.9 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 36) |
| Ιδιωτικό Πολυϊατρείο | Kyriazi 36 Β | Foursquare OS Places | - | 77.7, 160.6 |  | unverified (old/weak listing, census tier C): not built |
| Κωτσόβολος | Kyriazi 36 | OSM survey (n13284916388); also OSM, web/official site | 84.0, 132.1 | 87.9, 133.1 | 0.0 | verified (OSM survey) |
| Παντελής Τόσκας Καρδιολόγος | Kyriazi 36 | Overture | - | 78.5, 156.7 |  | unverified (old/weak listing, census tier C): not built |
| Περίπτερο Καραντουμάν | Kyriazi 36 | vrisko.gr | - | 78.2, 167.0 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 36) |
| Τρυφωνίδη - Ζαχαρη Αμαλία | Kyriazi 36 | Overture | - | 83.7, 133.3 |  | unverified (old/weak listing, census tier C): not built |
| Φαρμακείο Τσίτσου | Kyriazi 36 | Foursquare OS Places, Overture, vrisko.gr | 78.7, 156.0 | 80.2, 156.4 | 0.0 | verified (two-source listing on its street) |
| Φαρμακείο Τσίτσου | Κυριαζή 36 | Overture only (confidence 0.99) | - | 74.4, 161.2 |  | unverified (Overture only, no census confirmation): not built |
| Χαρά Σκουλαρίκη | Kyriazi 36 | Overture | - | 82.6, 145.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 36) |
| Aromatologic | Kyriazi 40 | Foursquare OS Places | - | 101.1, 80.4 |  | unverified (old/weak listing, census tier C): not built |
| Dr Pagkalos Plastic Surgery Clinic | Κυριαζή 40 | Overture only (confidence 0.99) | - | 110.5, 88.8 |  | unverified (Overture only, no census confirmation): not built |
| Flocafe Espresso Room | Kyriazi 40 | Foursquare OS Places, Overture, vrisko.gr | 101.1, 80.2 | 103.0, 76.2 | 1.9 | verified (two-source listing on its street) |
| Giannetos | Kyriazi 40 | Foursquare OS Places, Overture, vrisko.gr | 99.8, 85.3 | 102.2, 81.8 | 1.5 | verified (two-source listing on its street) |
| Kayak | Kyriazi 40 | Foursquare OS Places | - | 97.3, 100.3 |  | removed (reported closed, census tier X) |
| Outstand Communications | Kyriazi 40 | Overture | - | 99.8, 91.1 |  | unverified (old/weak listing, census tier C): not built |
| Zara | Kyriazi 40 | Foursquare OS Places, Overture, vrisko.gr, web/official site | 89.6, 115.5 | 91.1, 115.8 | 0.0 | verified (two-source listing on its street) |
| Ακίνητα Πόλις Δύναμις | Kyriazi 40 | Foursquare OS Places, Overture | - | 116.0, 57.4 |  | unverified, not built: no facade of its street on the address side within 15 m |
| Αρσινόη Ξανθινάκη | Kyriazi 40 | Overture | - | 97.9, 98.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κυριαζή 40) |
| Πάγκαλος Β. Πλαστικός Χειρούργος (Pagkalos Board Certified Plastic Surgeon) | Kyriazi 40 | Foursquare OS Places, Overture | 101.5, 78.5 | 103.0, 78.8 |  | verified (two-source listing on its street), door plate (upper floor / office) |
| Alpha Bank (059-E Κηφισιάς) | Kyriazi  | Foursquare OS Places | - | 78.8, 155.6 |  | removed (reported closed, census tier X) |
| Kif-kiriazi | Kyriazi  | Foursquare OS Places | - | 90.4, 112.1 |  | unverified (old/weak listing, census tier C): not built |
| Lacoste | Kyriazi  | Foursquare OS Places | - | 101.1, 80.0 |  | unverified (old/weak listing, census tier C): not built |
| Lentzos Odontiatreio | Kyriazi  | Foursquare OS Places | - | 80.7, 146.9 |  | unverified, not built: no house number |
| Toi Moi | Kyriazi  | Foursquare OS Places | - | 176.5, 29.7 |  | unverified, not built: no house number |
| zourefixe | Kyriazi  | Foursquare OS Places | - | 89.5, 116.0 |  | unverified (old/weak listing, census tier C): not built |
| Κυρ Αντώνης | Kyriazi  | Foursquare OS Places | - | 107.5, 73.3 |  | unverified (old/weak listing, census tier C): not built |

### Kolokotroni (Κολοκοτρώνη) — 317 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Aladin | Kolokotroni 1 | OSM survey (n10095429215); also Foursquare OS Places, OSM, Overture, vrisko.gr | 175.3, -60.0 | 173.9, -53.5 | 5.1 | moved 5.1 m along the facade (crowded frontage; OSM survey) |
| Alda | Kolokotroni 1 | OSM survey (n10095501264); also Foursquare OS Places, OSM, Overture, vrisko.gr | 235.9, -24.9 | 235.5, -26.3 | 0.0 | verified (OSM survey) |
| Alpha Bank | Kolokotroni 1 | OSM survey (n10095447769); also Foursquare OS Places, OSM, Overture, vrisko.gr | 202.5, -36.1 | 211.8, -30.6 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Artworx - Isabela Frances -Maria Xanthakos | Kolokotroni 1 | Overture | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Artworx - Isabela Frances -Maria Xanthakos | Kolokotroni 1 | Overture only (confidence 0.56) | - | 169.8, -39.8 |  | unverified (Overture only, no census confirmation): not built |
| Atsidakou and Associates Law Office | Kolokotroni 1 | Overture | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Atsidakou and Associates Law Office | Κολοκοτρώνη 1 | Overture only (confidence 0.74) | - | 243.0, -14.4 |  | unverified (Overture only, no census confirmation): not built |
| Bowling Center | Kolokotroni 1 | Foursquare OS Places, Overture | 223.3, -15.3 | 228.2, -30.3 |  | verified (address = surveyed OSM number), sign over the building entrance |
| Bowling Center S.A. | Kolokotroni 1 | Overture only (confidence 1.00) | - | 201.5, -29.5 |  | unverified (Overture only, no census confirmation): not built |
| Brumel | Kolokotroni 1 | OSM survey (n10095523836); also Foursquare OS Places, OSM, Overture, vrisko.gr | 226.2, -63.5 | 224.6, -59.6 |  | verified (OSM survey), door plate (upper floor / office) |
| Conti Confetteria Milano | Kolokotroni 1 | Foursquare OS Places | - | 225.2, -14.5 |  | unverified (old/weak listing, census tier C): not built |
| Dontas Real Estate | Kolokotroni 1 | OSM survey (n7117576499); also OSM, Overture | 175.0, -59.3 | 188.1, -54.1 |  | verified (OSM survey), door plate (upper floor / office) |
| EMS | Kolokotroni 1 | Foursquare OS Places, vrisko.gr | 224.1, -15.0 | 228.2, -30.3 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Event Planning By Zoulovits | Kolokotroni 1 | Overture | - | 186.5, -46.9 |  | unverified, not built: listing position 45 m from its address |
| Fairynails | Kolokotroni 1 | Foursquare OS Places | - | 193.9, -43.9 |  | unverified, not built: listing position 37 m from its address |
| Fortune Kids Underwear | Kolokotroni 1 | Foursquare OS Places | - | 172.6, -53.2 |  | unverified (old/weak listing, census tier C): not built |
| Hom+ Plus | Kolokotroni 1 | Foursquare OS Places, Overture | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Jasna Liverios Skin and Beauty Clinic | Kolokotroni 1 | Overture | 214.7, -18.7 | 228.2, -30.3 | 5.8 | moved 5.8 m along the facade (crowded frontage; address = surveyed OSM number) |
| Jasna Liverios Skin and Beauty Clinic | Κολοκοτρώνη 1 | Overture only (confidence 0.97) | - | 189.4, -53.4 |  | unverified (Overture only, no census confirmation): not built |
| Jege | Kolokotroni 1 | OSM survey (n10095524516); also OSM, vrisko.gr | 219.6, -16.7 | 227.5, -22.6 | 2.7 | verified (OSM survey) |
| Karida 1912 | Kolokotroni 1 | OSM survey (n9303522718); also Foursquare OS Places, OSM, vrisko.gr | 202.5, -36.1 | 190.6, -46.1 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Kartakis | Kolokotroni 1 | OSM survey (n10095497079); also Foursquare OS Places, OSM, Overture, vrisko.gr | 212.2, -19.7 | 215.9, -29.0 |  | verified (OSM survey), door plate (upper floor / office) |
| Kifisia Pharmacy_Psaraki Eleanna | Kolokotroni 1 | Overture | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Kifisia Pharmacy_Psaraki Eleanna | Κολοκοτρώνη 1 | Overture only (confidence 0.62) | - | 230.3, -27.0 |  | unverified (Overture only, no census confirmation): not built |
| Kifisia Shopping Center | Κολοκοτρώνη 1 | Overture only (confidence 0.77) | - | 177.7, -7.4 |  | unverified (Overture only, no census confirmation): not built |
| Long Island | Kolokotroni 1 | Foursquare OS Places, Overture | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Long Island Shop Kifissia | Κολοκοτρώνη 1 | Overture only (confidence 0.67) | - | 243.0, -14.4 |  | unverified (Overture only, no census confirmation): not built |
| MAC Cosmetics | Kolokotroni 1 | OSM survey (n10095527968); also Foursquare OS Places, OSM, Overture | 202.5, -36.1 | 196.7, -44.0 |  | verified (OSM survey), name on the building directory board (frontage full) |
| MY Holidays - Mediterranean Yachting Holidays | Κολοκοτρώνη 1 | Overture only (confidence 0.68) | - | 192.8, -12.5 |  | unverified (Overture only, no census confirmation): not built |
| Magginasrealestate | Κολοκοτρώνη 1 | Overture only (confidence 0.54) | - | 184.6, -30.6 |  | unverified (Overture only, no census confirmation): not built |
| Mathemousiki Musichouse | Kolokotroni 1 | Overture | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Mathemousiki Musichouse | Κολοκοτρώνη 1 | Overture only (confidence 0.85) | - | 230.3, -27.0 |  | unverified (Overture only, no census confirmation): not built |
| Medicosmetics | Kolokotroni 1 | OSM survey (n10095524643); also Foursquare OS Places, OSM, Overture, vrisko.gr | 178.8, -68.8 | 181.8, -62.5 | 3.4 | verified (OSM survey) |
| Mint Vintage Aesthetics | Kolokotroni 1 | Foursquare OS Places | - | 179.0, -49.8 |  | unverified (old/weak listing, census tier C): not built |
| Miraya | Kolokotroni 1 | Overture | 209.7, -20.7 | 228.2, -30.3 | 11.1 | moved 11.1 m along the facade (crowded frontage; address = surveyed OSM number) |
| Miraya | Kolokotroni 1 | Overture only (confidence 0.92) | - | 169.0, -32.4 |  | unverified (Overture only, no census confirmation): not built |
| My Holidays | Kolokotroni 1 | OSM survey (n10095493615); also OSM, Overture | 239.2, -58.3 | 234.4, -46.1 |  | verified (OSM survey), door plate (upper floor / office) |
| Nailed it | Kolokotroni 1 | OSM survey (n10095479945); also Foursquare OS Places, OSM, Overture, vrisko.gr | 202.5, -36.1 | 192.8, -52.0 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Novadis - Novadis Μεπε | Kolokotroni 1 | Foursquare OS Places | - | 175.3, -51.3 |  | unverified (old/weak listing, census tier C): not built |
| Parity Tattoo | Kolokotroni 1 | Foursquare OS Places | - | 221.5, -16.0 |  | unverified (old/weak listing, census tier C): not built |
| Prof Γεώργιος Πετρούτσος - MD PhD Χειρουργός Οφθαλμίατρος | Κολοκοτρώνη 1 | Overture only (confidence 0.82) | - | 243.0, -14.4 |  | unverified (Overture only, no census confirmation): not built |
| Royal brows | Kolokotroni 1 | OSM survey (n10095543954); also Foursquare OS Places, OSM | 204.9, -35.2 | 218.0, -34.9 |  | verified (OSM survey), door plate (upper floor / office) |
| Season | Kolokotroni 1 | OSM survey (n10095519389); also Foursquare OS Places, OSM, Overture | 264.4, 24.1 | 254.3, 31.3 | 5.5 | moved 5.5 m along the facade (crowded frontage; OSM survey) |
| Shoppingland | Kolokotroni 1 | OSM survey (w1077110413); also Foursquare OS Places, OSM, Overture | 239.3, -17.5 | 243.2, -14.2 |  | verified (OSM survey), sign over the building entrance |
| SmileWorks - Λεύκανση Δοντιών | Kolokotroni 1 | Overture | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Social Coffee Bar | Kolokotroni 1 | Foursquare OS Places | - | 228.2, -21.8 |  | removed (reported closed, census tier X) |
| Speciale O Nikos ( Επιδιορθοσις Ενδιματον ) | Kolokotroni 1 | Foursquare OS Places | - | 217.8, -17.5 |  | unverified (old/weak listing, census tier C): not built |
| Stavrou | Kolokotroni 1 | OSM survey (n10095540317); also Foursquare OS Places, OSM, vrisko.gr | 202.5, -36.1 | 215.0, -48.7 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Swiss line | Kolokotroni 1 | OSM survey (n10095479946); also OSM, Overture | 229.5, -62.2 | 224.6, -49.8 |  | verified (OSM survey), door plate (upper floor / office) |
| Time of art | Kolokotroni 1 | OSM survey (n10095503365); also OSM, Overture | 238.4, -58.7 | 237.2, -54.5 |  | verified (OSM survey), door plate (upper floor / office) |
| V&O Pastras Jewelry | Κολοκοτρώνη 1 | Overture only (confidence 0.79) | - | 230.3, -27.0 |  | unverified (Overture only, no census confirmation): not built |
| Wolford | Kolokotroni 1 | OSM survey (n10095551755); also Foursquare OS Places, OSM, Overture | 203.7, -35.6 | 202.4, -41.4 | 1.4 | verified (OSM survey) |
| ZerTeo | Kolokotroni 1 | Foursquare OS Places | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| iFast repair | Kolokotroni 1 | OSM survey (n10095511207); also Foursquare OS Places, OSM, Overture | 176.5, -62.9 | 182.8, -55.8 | 2.8 | verified (OSM survey) |
| the maker | Kolokotroni 1-3 | Foursquare OS Places, Overture | - | 226.7, -18.1 |  | removed (reported closed, census tier X) |
| ΑΡΤΙΟΝ Art Space | Kolokotroni 1 | Foursquare OS Places | - | 190.2, -45.4 |  | unverified, not built: listing position 41 m from its address |
| Γαστρεντερολογική Ενδοσκοπική Μονάδα | Kolokotroni 1 | Overture | - | 182.7, -48.4 |  | unverified (old/weak listing, census tier C): not built |
| Γεώργιος Πετρούτσος | Kolokotroni 1 | OSM survey (n10095519388); also OSM, Overture | 202.5, -36.1 | 204.5, -47.1 |  | verified (OSM survey), door plate (upper floor / office) |
| Νοβαλίς | Kolokotroni 1 | Foursquare OS Places | - | 174.1, -56.9 |  | removed (reported closed, census tier X) |
| Περίπτερο Λώλης | Kolokotroni 1 | vrisko.gr | 222.4, -15.6 | 228.2, -30.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Φοίνικας | Kolokotroni 1 | OSM survey (w761788138); also OSM | 215.6, -62.9 | 213.3, -46.4 |  | verified (OSM survey), sign over the building entrance |
| Χάρις Καζάκος | Kolokotroni 1 | OSM survey (w1077109788); also Foursquare OS Places, OSM, vrisko.gr | 168.7, -36.5 | 171.1, -42.6 | 0.0 | verified (OSM survey) |
| Palmers | Kolokotroni 2 | OSM survey (n10095541241); also Foursquare OS Places, OSM, Overture | 90.8, -51.1 | 90.9, -56.0 | 0.0 | verified (OSM survey) |
| Panaidis | Kolokotroni 2 | OSM survey (n10095487363); also Foursquare OS Places, OSM, Overture, vrisko.gr, web/official site | 154.6, -16.8 | 152.6, -12.7 | 0.0 | verified (OSM survey) |
| Γεωργαντάς | Kolokotroni 2 | OSM survey (n10095544216); also Foursquare OS Places, OSM, vrisko.gr | 166.5, -13.5 | 165.7, -11.7 | 0.0 | verified (OSM survey) |
| Anna Maria Mazaraki | Kolokotroni 3 | OSM survey (n10095482758); also Foursquare OS Places, OSM, Overture, vrisko.gr | 259.1, -1.6 | 261.3, -5.9 | 0.0 | verified (OSM survey) |
| Gregio | Kolokotroni 3 | Overture | 237.7, -9.3 | 244.1, -0.7 | 7.2 | moved 7.2 m along the facade (crowded frontage; address interpolated between surveyed numbers) |
| Gregio Κηφισιά | Kolokotroni 3 | Overture only (confidence 0.64) | - | 242.6, -11.5 |  | unverified (Overture only, no census confirmation): not built |
| Hondos center | Kolokotroni 3 | OSM survey (n10095491196); also Foursquare OS Places, OSM, Overture | 265.1, 1.4 | 268.0, -1.0 | 0.0 | verified (OSM survey) |
| Ikebana Flowers | Kolokotroni 3 | Foursquare OS Places | 243.8, -6.6 | 244.1, -0.7 |  | verified (address interpolated between surveyed numbers), name on the building directory board (frontage full) |
| Laboratorios BABÉ Greece | Kolokotroni 3 | Overture | 236.6, -12.8 | 244.1, -0.7 | 5.6 | moved 5.6 m along the facade (crowded frontage; address interpolated between surveyed numbers) |
| Laboratorios BABÉ Greece | Κολοκοτρώνη 3 | Overture only (confidence 0.59) | - | 434.2, -22.2 |  | unverified (Overture only, no census confirmation): not built |
| Lentros | Kolokotroni 3 | OSM survey (n10095501140); also Foursquare OS Places, OSM, Overture, vrisko.gr | 223.6, -15.2 | 225.1, -15.7 | 0.0 | verified (OSM survey) |
| Pandora | Kolokotroni 3 | OSM survey (n10095521488); also Foursquare OS Places, OSM, Overture | 242.1, -7.3 | 244.1, -9.7 | 0.0 | verified (OSM survey) |
| Dovas | Kolokotroni 4 | OSM survey (n10095502120); also Foursquare OS Places, OSM | 175.3, -12.6 | 168.4, 6.7 | 0.0 | verified (OSM survey) |
| Dr Boukouvalas | Kolokotroni 4 | OSM survey (n10095511144); also Foursquare OS Places, OSM | 177.5, -11.7 | 175.2, -6.2 |  | verified (OSM survey), door plate (upper floor / office) |
| Galenas | Kolokotroni 4 | OSM survey (n10095487361); also Foursquare OS Places, OSM, Overture | 176.7, -12.0 | 173.0, -1.7 |  | verified (OSM survey), door plate (upper floor / office) |
| Merlin | Kolokotroni 4 | OSM survey (n10095543320); also OSM, vrisko.gr | 177.7, -11.6 | 170.4, 3.2 | 0.0 | verified (OSM survey) |
| Oxford Company | Kolokotroni 4 | OSM survey (n10095540168); also Foursquare OS Places, OSM, Overture, vrisko.gr | 180.1, -10.6 | 177.3, -10.7 | 1.4 | verified (OSM survey) |
| P.K Kifissia hair& nails | Kolokotroni 4 | Overture | 177.6, -11.7 | 173.0, -0.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| P.K Kifissia hair& nails | Kolokotroni 4 | Overture only (confidence 0.55) | - | 174.0, 0.6 |  | unverified (Overture only, no census confirmation): not built |
| niche beauty services | Kolokotroni 4 | Foursquare OS Places, Overture | - | 172.2, -9.7 |  | removed (reported closed, census tier X) |
| Cafe's Richard | Kolokotroni 5 | Foursquare OS Places | - | 283.5, -5.7 |  | unverified (old/weak listing, census tier C): not built |
| Hydé | Kolokotroni 5 | OSM survey (n10095476290); also Foursquare OS Places, OSM, Overture, vrisko.gr, web/official site | 283.3, -4.2 | 291.1, -13.6 | 4.2 | moved 4.2 m along the facade (crowded frontage; OSM survey) |
| IQOS | Kolokotroni 5 | OSM survey (n10095517248); also Foursquare OS Places, OSM, Overture | 293.0, 8.9 | 293.6, 5.5 | 0.0 | verified (OSM survey) |
| Playville | Kolokotroni 5 | Overture | 290.7, 8.6 | 285.8, 13.7 |  | verified (address interpolated between surveyed numbers), door plate (upper floor / office) |
| Playville | Κολοκοτρώνη 5 | Overture only (confidence 0.92) | - | 288.6, -6.7 |  | unverified (Overture only, no census confirmation): not built |
| Regent Fair Hall | Kolokotroni 5 | Foursquare OS Places | 278.1, 5.3 | 285.8, 13.7 | 8.5 | moved 8.5 m along the facade (crowded frontage; address interpolated between surveyed numbers) |
| Staff Jeans&Co | Kolokotroni 5 | Foursquare OS Places | - | 293.4, 7.5 |  | unverified (old/weak listing, census tier C): not built |
| Fogal | Kolokotroni 6 | Foursquare OS Places, Overture | 203.9, 1.0 | 206.3, -4.8 | 0.0 | verified (address interpolated between surveyed numbers) |
| Max Mara | Kolokotroni 6 | OSM survey (n10095539629); also OSM, Overture, vrisko.gr | 187.0, -7.5 | 185.9, -4.5 | 0.0 | verified (OSM survey) |
| Stella Roidi, Gynaecologist - Obstetrician | Κολοκοτρώνη 6 | Overture only (confidence 0.96) | - | 185.1, -1.1 |  | unverified (Overture only, no census confirmation): not built |
| doctor | Kolokotroni 6 | OSM survey (n10095479456); also Foursquare OS Places, OSM, Overture | 185.0, -8.2 | 182.4, -1.4 |  | verified (OSM survey), door plate (upper floor / office) |
| ASHK Luxury Accessories | Kolokotroni 7 | Foursquare OS Places | - | 330.4, -14.1 |  | unverified (old/weak listing, census tier C): not built |
| AlisandratoShop | Kolokotroni 7 | Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Art & Hobby | Kolokotroni 7 | Foursquare OS Places | - | 328.2, -16.4 |  | removed (reported closed, census tier X) |
| Bristot Greece | Kolokotroni 7 | Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Bristot Greece | Κολοκοτρώνη 7 | Overture only (confidence 0.81) | - | 315.8, -4.4 |  | unverified (Overture only, no census confirmation): not built |
| Dimitriadis | Kolokotroni 7 | OSM survey (n10095519386); also Foursquare OS Places, OSM, Overture, vrisko.gr | 332.9, 3.1 | 335.1, -10.1 |  | verified (OSM survey), door plate (upper floor / office) |
| Engel & Völkers, Athens North | Kolokotroni 7 | Foursquare OS Places, Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Engel & Völkers, Athens North | Κολοκοτρώνη 7 | Overture only (confidence 0.77) | - | 332.1, -20.2 |  | unverified (Overture only, no census confirmation): not built |
| Lydiloo Kids Couture | Kolokotroni 7 | Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Lydiloo Kids Couture | Kolokotroni 7 | Overture only (confidence 0.55) | - | 322.4, 0.9 |  | unverified (Overture only, no census confirmation): not built |
| Marina Rinaldi | Kolokotroni 7 | OSM survey (n10095527967); also Foursquare OS Places, OSM, vrisko.gr | 315.4, 0.0 | 316.7, -5.3 | 0.0 | verified (OSM survey) |
| Megafitness | Kolokotroni 7 | Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Megafitness | Kolokotroni 7 | Overture only (confidence 0.78) | - | 322.2, 0.8 |  | unverified (Overture only, no census confirmation): not built |
| Mystis | Kolokotroni 7 | Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Mystis | Kolokotroni 7 | Overture only (confidence 0.65) | - | 333.1, -20.4 |  | unverified (Overture only, no census confirmation): not built |
| PLANET HOLIDAYS | Kolokotroni 7 | vrisko.gr | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Papadopoulos | Kolokotroni 7 | OSM survey (n10095540742); also OSM, Overture, vrisko.gr | 336.1, 3.6 | 329.5, -5.5 | 6.4 | moved 6.4 m along the facade (crowded frontage; OSM survey) |
| Rovoliva Brokerage | Kolokotroni 7 | OSM survey (n10095540327); also Foursquare OS Places, OSM, Overture | 331.6, 2.9 | 332.4, -1.7 |  | verified (OSM survey), door plate (upper floor / office) |
| Sissi's Art Room | Kolokotroni 7 | Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Sissi's Art Room | Kolokotroni 7 | Overture only (confidence 0.90) | - | 335.6, 4.3 |  | unverified (Overture only, no census confirmation): not built |
| Swiss service ωρολογίων | Κολοκοτρώνη 7 | Overture only (confidence 0.77) | - | 326.0, -6.8 |  | unverified (Overture only, no census confirmation): not built |
| The Artians by Konstantina | Kolokotroni 7 | Overture | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| etoilekids | Kolokotroni 7 | Foursquare OS Places | - | 340.9, -13.2 |  | unverified (old/weak listing, census tier C): not built |
| ΟΡΑΜΑ | Kolokotroni 7 | vrisko.gr | 328.9, 2.5 | 327.1, -17.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Φοίνικες | Kolokotroni 7 | OSM survey (w1077112776); also OSM | 331.4, -35.8 | 327.1, -17.8 |  | verified (OSM survey), sign over the building entrance |
| 180 DEGREES by Maria Prastakou | Kolokotroni 8 | Foursquare OS Places | - | 235.0, 24.7 |  | unverified (old/weak listing, census tier C): not built |
| Anagennisi | Kolokotroni 8 | Foursquare OS Places, Overture | 221.3, 17.2 | 226.9, 24.8 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Folli Follie | ΑΚΡΟΠΟΛ, Κολοκοτρώνη 8 | Overture only (confidence 0.87) | - | 213.3, 13.2 |  | unverified (Overture only, no census confirmation): not built |
| Folli Follie Store | Kolokotroni 8 | Foursquare OS Places, Overture | 226.0, 9.9 | 226.9, 24.8 | 4.7 | moved 4.7 m along the facade (crowded frontage; address = surveyed OSM number) |
| Franck Muller-Chopard | Kolokotroni 8 | Foursquare OS Places | 221.3, 17.2 | 226.9, 24.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Gucci | Kolokotroni 8 | Foursquare OS Places | - | 233.5, 28.4 |  | removed (reported closed, census tier X) |
| Healthy Hair Clinics | Kolokotroni 8 | Foursquare OS Places | - | 220.0, 21.8 |  | unverified (old/weak listing, census tier C): not built |
| Highend Boutique | Kolokotroni 8 | Overture | 221.3, 17.2 | 226.9, 24.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Highend Boutique | Κολοκοτρώνη 8 | Overture only (confidence 0.52) | - | 249.1, 46.6 |  | unverified (Overture only, no census confirmation): not built |
| Hugo Boss | Kolokotroni 8 | OSM survey (n10095491310); also OSM, Overture | - | 207.4, 31.4 |  | verified (OSM survey), free-standing (standalone) |
| Human Perfection | Kolokotroni 8 | Foursquare OS Places, Overture | 221.3, 17.2 | 226.9, 24.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Massimo Dutti | Kolokotroni 8 | Foursquare OS Places, web/official site | - | 217.1, 29.3 |  | removed (reported closed, census tier X) |
| Nail'd it | Kolokotroni 8 | OSM survey (n10095493614); also OSM, vrisko.gr | 221.9, 15.5 | 218.5, 28.7 | 11.1 | moved 11.1 m along the facade (crowded frontage; OSM survey) |
| New Dash | Kolokotroni 8 | Foursquare OS Places, Overture | - | 218.6, 25.6 |  | removed (reported closed, census tier X) |
| Nick Tailor | Kolokotroni 8 | OSM survey (n10095521491); also OSM, Overture | 205.8, 1.8 | 197.2, 22.9 |  | verified (OSM survey), door plate (upper floor / office) |
| Nike Kifisia | Κολοκοτρώνη 8 | Overture only (confidence 0.95) | - | 214.6, 3.0 |  | unverified (Overture only, no census confirmation): not built |
| Nike Store | Kolokotroni 8 | Foursquare OS Places, Overture | 223.6, 11.2 | 226.9, 24.8 | 9.8 | moved 9.8 m along the facade (crowded frontage; address = surveyed OSM number) |
| Salomon | Kolokotroni 8 | OSM survey (n10095524355); also Foursquare OS Places, OSM, Overture, vrisko.gr | 235.8, 13.7 | 235.4, 14.8 | 0.0 | verified (OSM survey) |
| Sugarfree | Kolokotroni 8 | Foursquare OS Places, Overture | 221.3, 17.2 | 226.9, 24.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Sugarfree | Κολοκοτρώνη 8 | Overture only (confidence 0.77) | - | 206.8, 19.1 |  | unverified (Overture only, no census confirmation): not built |
| Underdog The Store | Kolokotroni 8 | Overture | 221.3, 17.2 | 226.9, 24.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Underdog The Store | Kolokotroni 8 | Overture only (confidence 0.91) | - | 217.8, 33.9 |  | unverified (Overture only, no census confirmation): not built |
| Zerar | Kolokotroni 8 | OSM survey (n10095493616); also OSM, Overture, vrisko.gr | 230.1, 11.4 | 229.9, 11.7 | 0.0 | verified (OSM survey) |
| Chrono Technica | Kolokotroni 9 | OSM survey (n10095479944); also OSM, vrisko.gr | 351.6, -21.6 | 346.6, -20.7 |  | verified (OSM survey), door plate (upper floor / office) |
| Concept Cafe | Kolokotroni 9 | Foursquare OS Places, Overture | - | 357.3, 6.2 |  | removed (reported closed, census tier X) |
| Gospel | Kolokotroni 9 | Foursquare OS Places, Overture | 358.8, 7.3 | 360.3, -10.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| High | Kolokotroni 9 | OSM survey (n10095520703); also Foursquare OS Places, OSM | 360.8, 7.5 | 361.1, 3.2 |  | verified (OSM survey), door plate (upper floor / office) |
| Hollywood Secrets | Kolokotroni 9-11 | OSM survey (n10095524454); also OSM, Overture | 387.2, -9.1 | 384.5, -11.6 | 1.8 | verified (OSM survey) |
| Jackson | Kolokotroni 9 | Foursquare OS Places | - | 358.4, -1.7 |  | unverified (old/weak listing, census tier C): not built |
| Join clothes | Kolokotroni 9 | OSM survey (n10095524358); also Foursquare OS Places, OSM, Overture, vrisko.gr | 362.4, 7.6 | 360.8, 5.5 | 0.1 | verified (OSM survey) |
| Luisa | Kolokotroni 9 | OSM survey (n10095501156); also Foursquare OS Places, OSM, Overture, vrisko.gr | 400.1, -5.4 | 401.4, -10.9 | 4.4 | moved 4.4 m along the facade (crowded frontage; OSM survey) |
| MAT. | Kolokotroni 9 | Foursquare OS Places | - | 357.9, 2.3 |  | unverified (old/weak listing, census tier C): not built |
| Michas | Kolokotroni 9 | OSM survey (n10095524354); also Foursquare OS Places, OSM, Overture | 359.0, 7.3 | 350.1, -4.3 | 8.3 | moved 8.3 m along the facade (crowded frontage; OSM survey) |
| Nueve | Kolokotroni 9 | Foursquare OS Places | - | 345.2, 8.1 |  | removed (reported closed, census tier X) |
| Stelios Parliaros Sweet Alchemy | Kolokotroni 9 | Foursquare OS Places | - | 360.2, 7.5 |  | removed (reported closed, census tier X) |
| The Social Club Community | Kolokotroni 9 | Overture | 358.8, 7.3 | 360.3, -10.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| The Social Club Community | Κολοκοτρώνη 9 | Overture only (confidence 0.62) | - | 334.3, -4.4 |  | unverified (Overture only, no census confirmation): not built |
| Venus Victoria Store | Kolokotroni 9 | Foursquare OS Places | - | 346.3, 4.9 |  | unverified (old/weak listing, census tier C): not built |
| Vintage Lovers | Kolokotroni 9 | Overture only (confidence 0.90) | - | 362.2, -11.8 |  | unverified (Overture only, no census confirmation): not built |
| Vintage lovers | Kolokotroni 9 | OSM survey (n10095522796); also OSM, Overture, vrisko.gr | 206.7, -120.6 | 222.7, -117.6 | 2.6 | verified (OSM survey) |
| Viscosity | Kolokotroni 9 | Foursquare OS Places | - | 346.9, 1.0 |  | unverified (old/weak listing, census tier C): not built |
| mall | Kolokotroni 9 | OSM survey (w1103238409); also OSM | 359.6, -20.7 | 360.3, -10.8 |  | verified (OSM survey), sign over the building entrance |
| soleRebels Greece | Kolokotroni 9 | Overture | 358.8, 7.3 | 360.3, -10.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| soleRebels Greece | Κολοκοτρώνη 9 | Overture only (confidence 0.55) | - | 336.1, 18.2 |  | unverified (Overture only, no census confirmation): not built |
| Κλυταιμνήστρα | Kolokotroni 9 | Foursquare OS Places, Overture, vrisko.gr | 358.8, 7.3 | 360.3, -10.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Κλυταιμνήστρα | Κολοκοτρώνη 9 | Overture only (confidence 0.83) | - | 342.6, 3.3 |  | unverified (Overture only, no census confirmation): not built |
| Κοσμήματα Αφεντάκη | Kolokotroni 9 | vrisko.gr | 358.8, 7.3 | 360.3, -10.8 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Λαμπρόπουλος | Kolokotroni 9 | Foursquare OS Places, Overture | 358.8, 7.3 | 360.3, -10.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Λαμπρόπουλος | Κολοκοτρώνη 9 | Overture only (confidence 0.61) | - | 334.2, -4.4 |  | unverified (Overture only, no census confirmation): not built |
| Στρογγυλός | Kolokotroni 9 | OSM survey (n10095540166); also Foursquare OS Places, OSM, Overture, vrisko.gr | 358.8, 7.3 | 351.1, -8.4 |  | verified (OSM survey), name on the building directory board (frontage full) |
| ΤΟ ΓΑΪΤΑΝΑΚΙ | Kolokotroni 9 | vrisko.gr | 359.6, 7.4 | 360.3, -10.8 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Τζίμας | Kolokotroni 9 | OSM survey (n10095542845); also OSM, Overture | 358.8, 7.3 | 361.0, -6.9 |  | verified (OSM survey), name on the building directory board (frontage full) |
| ATHENS KIFISSIA SC KERASIES | Kolokotroni 10 | Overture | 258.2, 21.7 | 258.9, 15.1 |  | verified (address interpolated between surveyed numbers), name on the building directory board (frontage full) |
| ATHENS KIFISSIA SC KERASIES | Kolokotroni, 10 | Overture only (confidence 0.80) | - | 243.2, 28.4 |  | unverified (Overture only, no census confirmation): not built |
| Beauty Wishes | Kolokotroni 10 | Overture | 258.2, 21.7 | 258.9, 15.1 |  | verified (address interpolated between surveyed numbers), name on the building directory board (frontage full) |
| Beauty Wishes | Kolokotroni 10 | Overture only (confidence 0.74) | - | 251.5, 43.7 |  | unverified (Overture only, no census confirmation): not built |
| Calzedonia | Kolokotroni 10 | OSM survey (n10095519028); also Foursquare OS Places, OSM, Overture | 258.2, 21.7 | 239.0, 38.0 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Celestino | Kolokotroni 10 | Foursquare OS Places | - | 271.5, 26.8 |  | unverified (old/weak listing, census tier C): not built |
| Christodoulou | Kolokotroni 10 | OSM survey (n10095519027); also Foursquare OS Places, OSM, Overture, vrisko.gr | 258.6, 21.8 | 237.9, 41.0 |  | verified (OSM survey), door plate (upper floor / office) |
| Dream Nails | Kolokotroni 10 | Foursquare OS Places, Overture | 258.2, 21.7 | 258.9, 15.1 |  | verified (address interpolated between surveyed numbers), name on the building directory board (frontage full) |
| Dream Nails (kifisia) | Κολοκοτρώνη 10 | Overture only (confidence 0.77) | - | 243.0, 0.0 |  | unverified (Overture only, no census confirmation): not built |
| In Massage | Kolokotroni 10 | Foursquare OS Places | - | 253.9, 30.2 |  | unverified (old/weak listing, census tier C): not built |
| Intimissimi | Kolokotroni 10 | OSM survey (n10095524453); also Foursquare OS Places, OSM, Overture | 258.2, 21.7 | 234.4, 36.2 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Monoi | Kolokotroni 10 | Foursquare OS Places, Overture, vrisko.gr | 257.7, 21.5 | 258.9, 15.1 |  | verified (address interpolated between surveyed numbers), door plate (upper floor / office) |
| Natura bar | Kolokotroni 10 | Foursquare OS Places | 258.2, 21.7 | 258.9, 15.1 |  | verified (address interpolated between surveyed numbers), name on the building directory board (frontage full) |
| SAND IN MY TOES / Monoi Kifissia | Kolokotroni 10 | Overture only (confidence 0.90) | - | 252.0, 18.9 |  | unverified (Overture only, no census confirmation): not built |
| Solarium | Kolokotroni 10 | OSM survey (n10095505759); also Foursquare OS Places, OSM, vrisko.gr | 260.8, 22.6 | 258.9, 29.4 |  | verified (OSM survey), door plate (upper floor / office) |
| The Body Shop | Kolokotroni 10 | OSM survey (n10095521489); also Foursquare OS Places, OSM | 267.2, 25.1 | 250.4, 41.9 | 8.2 | moved 8.2 m along the facade (crowded frontage; OSM survey) |
| Vdance Palladium | Kolokotroni 10 | Foursquare OS Places | - | 260.9, 24.3 |  | unverified (old/weak listing, census tier C): not built |
| Who Cares? | Kolokotroni 10 | Foursquare OS Places | - | 238.8, 14.8 |  | unverified (old/weak listing, census tier C): not built |
| Zadig & Voltaire | Kolokotroni 10 | OSM survey (n10095503333); also Foursquare OS Places, OSM, Overture, vrisko.gr | 270.0, 26.2 | 258.0, 23.1 | 11.0 | moved 11.0 m along the facade (crowded frontage; OSM survey) |
| Zilly | Kolokotroni 10 | Foursquare OS Places | - | 259.6, 22.2 |  | unverified (old/weak listing, census tier C): not built |
| Κατάστημα Nova | Kolokotroni 10 | Foursquare OS Places | - | 263.3, 23.6 |  | removed (reported closed, census tier X) |
| Παπασωτηρίου | Kolokotroni 10 | Foursquare OS Places | - | 236.4, 13.9 |  | unverified (old/weak listing, census tier C): not built |
| BSB Fashion | Kolokotroni 11 | OSM survey (n10095520243); also OSM, Overture | 392.1, -1.6 | 390.1, -3.9 | 0.9 | verified (OSM survey) |
| Iordanis | Kolokotroni 11 | OSM survey (n10095487346); also OSM, Overture | 398.3, -3.6 | 396.4, -4.4 | 0.0 | verified (OSM survey) |
| Nanoasia Greece | Kolokotroni 11 | Overture | 395.4, -2.1 | 391.1, -9.8 | 0.1 | verified (address = surveyed OSM number) |
| Nanoasia Greece | Κολοκοτρώνη 11 | Overture only (confidence 0.53) | - | 400.0, 4.0 |  | unverified (Overture only, no census confirmation): not built |
| SKIN MOOD LIMITED ΕΠΕ Καλλυντικά | Kolokotroni 11 | Overture | 387.7, -9.0 | 391.1, -9.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Παρουσίαση | Kolokotroni 11 | OSM survey (n13437464039); also OSM, Overture | 396.8, -17.4 | 396.1, -14.3 | 0.0 | verified (OSM survey) |
| Aldipa | Kolokotroni 12 | OSM survey (n10095479477); also Foursquare OS Places, OSM | 285.1, 29.2 | 279.9, 42.9 |  | verified (OSM survey), door plate (upper floor / office) |
| Diane Von Furstenberg | Kolokotroni 12 | Foursquare OS Places | - | 278.1, 29.0 |  | unverified (old/weak listing, census tier C): not built |
| Ibo | Kolokotroni 12 | Foursquare OS Places, vrisko.gr | 284.6, 28.9 | 281.5, 36.9 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Kosta Boda | Kolokotroni 12 | OSM survey (n10095542847); also Foursquare OS Places, OSM, Overture | 338.3, -34.8 | 330.2, -34.0 | 6.5 | moved 6.5 m along the facade (crowded frontage; OSM survey) |
| Malene Birger | Kolokotroni 12 | Foursquare OS Places | - | 280.5, 27.4 |  | unverified (old/weak listing, census tier C): not built |
| Papadiamantopoulos | Kolokotroni 12 | OSM survey (n10095520702); also Foursquare OS Places, OSM, Overture, vrisko.gr | 287.9, 30.2 | 287.3, 31.9 | 0.0 | verified (OSM survey) |
| Project BioArte | Kolokotroni 12-14 | Overture | - | 288.0, 30.3 |  | unverified (old/weak listing, census tier C): not built |
| Sunlounge | Kolokotroni 12 | OSM survey (n10095526267); also Foursquare OS Places, OSM, Overture | 284.0, 28.8 | 276.7, 42.1 | 0.3 | verified (OSM survey) |
| pharmacy | Kolokotroni 12-14 | OSM survey (n10095539630); also Foursquare OS Places, OSM, Overture, vrisko.gr | 305.1, 58.1 | 293.5, 49.8 | 2.9 | verified (OSM survey) |
| Σακελλάρη | Kolokotroni 12 | OSM survey (n10095498064); also OSM, vrisko.gr | 280.7, 27.4 | 280.0, 29.1 | 0.0 | verified (OSM survey) |
| Φαρμακείο Ε.Καφίρης Κηφισιά | Κολοκοτρώνη 12 | Overture only (confidence 0.81) | - | 271.0, 31.6 |  | unverified (Overture only, no census confirmation): not built |
| Bottega Veneta | Kolokotroni 14 | OSM survey (n10095487252); also Foursquare OS Places, OSM, Overture, vrisko.gr | 300.5, 31.8 | 299.4, 33.5 | 0.0 | verified (OSM survey) |
| Brides | Kolokotroni 14 | OSM survey (n10095504291); also Foursquare OS Places, OSM, Overture | 305.1, 32.5 | 304.6, 34.2 | 0.0 | verified (OSM survey) |
| DVF | Kolokotroni 14 | Foursquare OS Places | - | 295.3, 40.4 |  | unverified (old/weak listing, census tier C): not built |
| GSS International | Κολοκοτρώνη 14 | Overture only (confidence 0.61) | - | 304.8, 38.5 |  | unverified (Overture only, no census confirmation): not built |
| Gss International Travel And Congress Services Ltd | Kolokotroni 14 | Foursquare OS Places, Overture | 307.6, 33.3 | 303.6, 46.0 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Intersilver Gallery | Kolokotroni 14 | Foursquare OS Places | - | 296.5, 36.6 |  | unverified (old/weak listing, census tier C): not built |
| Nail affair | Kolokotroni 14 | OSM survey (n10095527969); also OSM, vrisko.gr | 307.5, 50.3 | 303.8, 49.8 | 0.0 | verified (OSM survey) |
| TSANTILIS BOUTIQUE | Kolokotroni 14 | vrisko.gr | 307.6, 33.3 | 303.6, 46.0 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Uptown | Kolokotroni 14 | Foursquare OS Places, Overture, vrisko.gr | 310.8, 33.2 | 303.6, 46.0 | 0.6 | verified (address = surveyed OSM number) |
| Uptown | Kolokotroni 14 | Overture only (confidence 0.67) | - | 307.5, 28.8 |  | unverified (Overture only, no census confirmation): not built |
| Zen Living | Kolokotroni 14 | Foursquare OS Places | - | 311.9, 33.6 |  | unverified (old/weak listing, census tier C): not built |
| Ιατρείο Πλαστικής Χειρουργικής / Όθων Κρητικός | Kolokotroni 15 | Overture | 459.9, -31.4 | 455.6, -41.3 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Ιατρείο Πλαστικής Χειρουργικής / Όθων Κρητικός | Κολοκοτρώνη 15 | Overture only (confidence 0.94) | - | 461.1, -30.4 |  | unverified (Overture only, no census confirmation): not built |
| Σινε Γεύσεις | Kolokotroni 17 | Foursquare OS Places | - | 482.8, -57.4 |  | unverified (old/weak listing, census tier C): not built |
| Dr. Π.Ι Πασχαλίδης | Kolokotroni 20 | Foursquare OS Places, Overture | 377.6, 24.9 | 382.7, 32.4 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| 21 Restaurant | Kolokotroni 21 | Foursquare OS Places, Overture | 543.1, -129.1 | 534.9, -131.0 | 0.5 | verified (address = surveyed OSM number) |
| 21 Restaurant | Κολοκοτρώνη 21 | Overture only (confidence 0.93) | - | 559.2, -117.6 |  | unverified (Overture only, no census confirmation): not built |
| The Twenty one | Kolokotroni 21 | OSM survey (n10095519385); also Foursquare OS Places, OSM, Overture, vrisko.gr | 544.0, -119.2 | 540.8, -121.4 | 0.0 | verified (OSM survey) |
| Dr. John Anastasatos | Kolokotroni 23 | Overture | - | 593.5, -144.4 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κολοκοτρώνη 23) |
| Dr. John Anastasatos | Kolokotroni 23 | Overture only (confidence 0.95) | - | 551.1, -114.4 |  | unverified (Overture only, no census confirmation): not built |
| PremEvent | Kolokotroni 23 | Overture | - | 591.3, -141.1 |  | unverified (old/weak listing, census tier C): not built |
| Πειραιώς Private Banking - Κτίριο ΠΑΛΑΣ ( Στον 1ο όροφο) | Kolokotroni 23 | Foursquare OS Places | - | 596.8, -142.2 |  | unverified (old/weak listing, census tier C): not built |
| Περισφαίριον | Kolokotroni 23 | Overture | - | 589.7, -137.9 |  | unverified (old/weak listing, census tier C): not built |
| Athanasiou Psychoanalysis | Kolokotroni 24 | Foursquare OS Places | - | 439.4, 5.6 |  | unverified (old/weak listing, census tier C): not built |
| Kaze Boutique | Kolokotroni 24 | Foursquare OS Places, Overture, vrisko.gr | 438.2, 6.1 | 438.0, 12.6 | 0.2 | verified (address = surveyed OSM number) |
| Kazeboutique hair and nails | Κολοκοτρώνη 24 | Overture only (confidence 0.62) | - | 413.2, 8.5 |  | unverified (Overture only, no census confirmation): not built |
| Konstantinos Xatzis | Κολοκοτρώνη 24 | Overture only (confidence 0.74) | - | 402.3, -6.2 |  | unverified (Overture only, no census confirmation): not built |
| Sidel Hellas | Kolokotroni 24 | Foursquare OS Places | - | 428.8, 9.7 |  | unverified (old/weak listing, census tier C): not built |
| Kefalari Suites | Kolokotroni 32 | Overture only (confidence 0.86) | - | 578.0, -106.3 |  | unverified (Overture only, no census confirmation): not built |
| Papaioannou | Kolokotroni 32 | OSM survey (n10095520699); also Foursquare OS Places, OSM, Overture, vrisko.gr, web/official site | 574.0, -114.5 | 576.6, -112.5 | 0.0 | verified (OSM survey) |
| Pizza Hut | Kolokotroni 32 | Foursquare OS Places | - | 573.7, -111.7 |  | removed (reported closed, census tier X) |
| Divine Club Restaurant (ex Mansion) | Kolokotroni 34 | Foursquare OS Places | - | 593.9, -144.1 |  | removed (reported closed, census tier X) |
| Theoxenia Residence Hotel | Kolokotroni 34 | Foursquare OS Places | 591.5, -141.3 | 602.3, -134.1 |  | verified (address = surveyed OSM number), sign over the building entrance |
| Κλικ | Kolokotroni 34 | Foursquare OS Places, Overture | 591.5, -141.3 | 602.3, -134.1 | 0.0 | verified (address = surveyed OSM number) |
| Act & React | Kolokotroni 35 | Overture | - | 584.4, -224.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κολοκοτρώνη 35) |
| Act & React | Κολοκοτρώνη 35 | Overture only (confidence 0.58) | - | 583.9, -212.6 |  | unverified (Overture only, no census confirmation): not built |
| Act & React | Κολοκοτρώνη 35 | Overture only (confidence 0.56) | - | 549.7, -105.8 |  | unverified (Overture only, no census confirmation): not built |
| Palmie Bistro | Kolokotroni 35 | Foursquare OS Places | - | 579.8, -221.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κολοκοτρώνη 35) |
| TGI Fridays | Kolokotroni 35 | Foursquare OS Places, Overture, vrisko.gr | - | 583.8, -220.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κολοκοτρώνη 35) |
| TGI Fridays | Kolokotroni 35 | Overture only (confidence 0.99) | - | 589.0, -212.3 |  | unverified (Overture only, no census confirmation): not built |
| Επαγγελματικός Προσανατολισμός | Kolokotroni 35 | Overture | - | 583.2, -227.3 |  | unverified (old/weak listing, census tier C): not built |
| Abovo | Kolokotroni 37 | Foursquare OS Places | - | 585.4, -241.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κολοκοτρώνη 37) |
| Bakoa | Kolokotroni 37 | Foursquare OS Places | - | 597.7, -241.7 |  | removed (reported closed, census tier X) |
| Butcher's Burger | Kolokotroni 37 | Foursquare OS Places, Overture, vrisko.gr | - | 597.9, -257.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κολοκοτρώνη 37) |
| Pueblo Chido | Kolokotroni 37 | Overture only (confidence 0.94) | - | 593.9, -242.6 |  | unverified (Overture only, no census confirmation): not built |
| toob | Kolokotroni 37 | Foursquare OS Places | - | 599.4, -252.4 |  | removed (reported closed, census tier X) |
| Πρυτανείον | Kolokotroni 37 | Foursquare OS Places, Overture, vrisko.gr | - | 595.1, -240.3 |  | removed (reported closed, census tier X) |
| Anemos | Kolokotroni  | OSM survey (n10095502122); also Foursquare OS Places, OSM | 160.5, -16.1 | 160.0, -14.8 | 0.0 | verified (OSM survey) |
| BSB | Kolokotroni  | Foursquare OS Places | - | 389.9, 21.8 |  | unverified (old/weak listing, census tier C): not built |
| Barbour | Kolokotroni  | OSM survey (n10095487250); also OSM | 299.9, 31.8 | 297.2, 40.2 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Bartaruga | Kolokotroni  | Foursquare OS Places | - | 311.7, 36.9 |  | unverified (old/weak listing, census tier C): not built |
| BeautyMind | Kolokotroni  | Foursquare OS Places | - | 204.0, 17.2 |  | unverified (old/weak listing, census tier C): not built |
| Beautyworks | Kolokotroni  | Foursquare OS Places | - | 209.6, 3.3 |  | unverified, not built: no house number |
| Bournazos | Kolokotroni  | Foursquare OS Places | - | 236.7, -13.0 |  | unverified (old/weak listing, census tier C): not built |
| Braccialini | Kolokotroni  | Foursquare OS Places | - | 362.9, 34.3 |  | unverified, not built: no house number |
| Brooklyn | Kolokotroni  | Foursquare OS Places | - | 211.5, -32.7 |  | removed (reported closed, census tier X) |
| Chipie Chipie | Kolokotroni  | Foursquare OS Places | - | 206.5, 11.0 |  | unverified (old/weak listing, census tier C): not built |
| Clinical reflexology center | Kolokotroni  | OSM survey (n10095477056); also OSM | 261.6, 23.0 | 255.4, 38.9 |  | verified (OSM survey), door plate (upper floor / office) |
| Cloud Nine | Kolokotroni  | OSM survey (n10095491312); also OSM | 341.8, 7.6 | 343.7, -5.0 |  | verified (OSM survey), door plate (upper floor / office) |
| Coco Chanel | Kolokotroni  | OSM survey (n10095492350); also OSM | 243.8, -26.6 | 252.6, -22.3 | 0.0 | verified (OSM survey) |
| Colour Skate | Kolokotroni  | Foursquare OS Places | - | 255.7, 25.5 |  | unverified, not built: no house number |
| Descamps Kifissias | Kolokotroni  | Foursquare OS Places | - | 357.2, 7.2 |  | unverified, not built: no house number |
| Designer's Cat | Kolokotroni  | OSM survey (n10095521571); also OSM | 341.4, 7.5 | 341.7, 5.6 | 0.0 | verified (OSM survey) |
| Esmeralda Sulejmani (Fashion Designer) | Kolokotroni  | Foursquare OS Places | - | 804.7, -268.2 |  | unverified (old/weak listing, census tier C): not built |
| Esprit | Kolokotroni  | Foursquare OS Places | - | 207.1, -21.7 |  | removed (reported closed, census tier X) |
| Fama | Kolokotroni  | OSM survey (n10095503332); also OSM | 270.6, 26.4 | 266.4, 52.6 |  | verified (OSM survey), name on the building directory board (frontage full) |
| G. Magginas | Kolokotroni  | OSM survey (n10095526239); also OSM | 220.1, -16.6 | 223.2, -24.3 |  | verified (OSM survey), door plate (upper floor / office) |
| GEOX | Kolokotroni  | Foursquare OS Places | - | 373.7, 26.2 |  | unverified (old/weak listing, census tier C): not built |
| GUK | Kolokotroni  | OSM survey (n10095505760); also OSM | 213.0, -19.4 | 214.5, -24.4 |  | verified (OSM survey), door plate (upper floor / office) |
| Gallery Cafe | Kolokotroni  | Foursquare OS Places | - | 202.9, 19.8 |  | unverified (old/weak listing, census tier C): not built |
| Glow | Kolokotroni  | OSM survey (n10095524603); also OSM | 239.9, 18.0 | 236.7, 26.3 | 0.0 | verified (OSM survey) |
| ILANGA | Kolokotroni  | Foursquare OS Places | - | 213.0, -36.4 |  | unverified (old/weak listing, census tier C): not built |
| Incontri | Kolokotroni  | OSM survey (n10095520705); also Foursquare OS Places, OSM | 381.1, 2.6 | 383.1, -0.1 | 0.2 | verified (OSM survey) |
| Intimissimi Uomo | Kolokotroni  | OSM survey (n10095537383) | 258.8, 21.9 | 243.5, 39.2 | 6.7 | moved 6.7 m along the facade (crowded frontage; OSM survey) |
| Iro Paris | Kolokotroni  | Foursquare OS Places | - | 203.5, 0.8 |  | unverified, not built: no house number |
| Kiosk | Kolokotroni  | OSM survey (n10095511206); also OSM | - | 199.1, -19.1 |  | verified (OSM survey), free-standing (standalone) |
| La Lika | Kolokotroni  | Foursquare OS Places | - | 173.6, -36.5 |  | unverified (old/weak listing, census tier C): not built |
| Li-La-Lo | Kolokotroni  | OSM survey (n10095505756); also OSM | 332.9, 3.1 | 329.0, -2.6 | 3.2 | verified (OSM survey) |
| M kids | Kolokotroni  | OSM survey (n10095511156); also OSM | 258.2, 21.7 | 245.8, 44.1 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Man & Manetti | Kolokotroni  | Foursquare OS Places | - | 236.8, 19.9 |  | unverified (old/weak listing, census tier C): not built |
| Mark Aalen | Kolokotroni  | Foursquare OS Places | - | 173.5, -12.3 |  | unverified (old/weak listing, census tier C): not built |
| Mat Fashion | Kolokotroni  | Overture | - | 319.5, 3.3 |  | unverified, not built: no house number |
| Mitsubishi Σωτηροπουλος | Kolokotroni  | Foursquare OS Places | - | 584.0, -222.1 |  | unverified, not built: no house number |
| New Years Eve Party @ Theoxenia | Kolokotroni  | Foursquare OS Places | - | 607.2, -164.4 |  | removed (reported closed, census tier X) |
| Pasxalidis dermatologos | Kolokotroni  | Foursquare OS Places | - | 393.8, 20.5 |  | unverified (old/weak listing, census tier C): not built |
| Senses | Kolokotroni  | Foursquare OS Places | - | 226.1, -16.5 |  | unverified (old/weak listing, census tier C): not built |
| Sergio Tacchini | Kolokotroni  | Foursquare OS Places | - | 267.7, 2.6 |  | unverified (old/weak listing, census tier C): not built |
| SkourasMed Gold | Kolokotroni  | OSM survey (n10095543319); also OSM | 283.8, -4.0 | 288.7, -4.6 |  | verified (OSM survey), door plate (upper floor / office) |
| Sofia | Kolokotroni  | OSM survey (n10095487343); also OSM | 261.6, 23.0 | 255.7, 27.0 | 2.7 | verified (OSM survey) |
| Stefanel | Kolokotroni  | Foursquare OS Places | - | 157.2, -16.8 |  | unverified (old/weak listing, census tier C): not built |
| Vergetis | Kolokotroni  | Foursquare OS Places | - | 152.1, -16.9 |  | unverified (old/weak listing, census tier C): not built |
| White Angel | Kolokotroni  | OSM survey (n10095479943); also OSM | 258.2, 21.7 | 249.2, 45.4 |  | verified (OSM survey), name on the building directory board (frontage full) |
| blanc | Kolokotroni  | Foursquare OS Places | - | 341.9, 7.6 |  | unverified (old/weak listing, census tier C): not built |
| consept | Kolokotroni  | Foursquare OS Places | - | 347.7, -5.1 |  | unverified (old/weak listing, census tier C): not built |
| cruciani | Kolokotroni  | Foursquare OS Places | - | 201.0, 24.7 |  | unverified (old/weak listing, census tier C): not built |
| iordanou-jewels | Kolokotroni  | Foursquare OS Places | - | 428.8, 9.5 |  | unverified (old/weak listing, census tier C): not built |
| Αίγλη | Kolokotroni  | OSM survey (w1076768347); also OSM | 203.3, 0.8 | 198.0, 13.9 |  | verified (OSM survey), sign over the building entrance |
| Αίγλη | Kolokotroni  | OSM w1077035729 | - |  |  | removed (duplicate of w1076768347, same name < 60 m) |
| Αίγλη | Kolokotroni  | OSM w1077035730 | - |  |  | removed (duplicate of w1076768347, same name < 60 m) |
| Αλλεργιολογικό Ιατρείο Παρασκευόπουλος Ιωάννης | Kolokotroni  | Foursquare OS Places | - | 439.0, 5.7 |  | unverified, not built: no house number |
| Αρμαος | Kolokotroni  | Foursquare OS Places | - | 227.2, -19.2 |  | unverified (old/weak listing, census tier C): not built |
| Ελενα Μακρη Μυκονος | Kolokotroni  | Foursquare OS Places | - | 323.1, 2.6 |  | unverified (old/weak listing, census tier C): not built |
| Ιατρική Απεικόνηση | Kolokotroni  | OSM survey (n10095524642); also OSM | 259.9, 22.3 | 259.6, 26.3 |  | verified (OSM survey), door plate (upper floor / office) |
| Ιερός Ναός Μεταμορφώσεως Σωτήρος | Kolokotroni  | Overture | - | 625.3, -251.6 |  | unverified, not built: no house number |
| Ιωάννου Ιωάννα | Kolokotroni  | Foursquare OS Places | - | 581.9, -220.9 |  | unverified (old/weak listing, census tier C): not built |
| Μεταμόρφωση Σωτήρος | Kolokotroni  | OSM survey (w123694055); also Foursquare OS Places, OSM, Overture | 615.2, -243.8 | 628.0, -242.6 |  | verified (OSM survey), sign over the building entrance |
| ΡΑLmie Bistro KeΦΑΛΑΡΙ | Kolokotroni  | Overture | - | 174.6, -36.9 |  | unverified, not built: no house number |
| Στρογγυλος | Kolokotroni  | Foursquare OS Places | - | 215.8, -18.3 |  | removed (reported closed, census tier X) |

### Argyropoulou (Αργυροπούλου) — 120 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Arch fresh and healthy | Argyropoulou 1-3 | OSM survey (n10095477055); also Foursquare OS Places, OSM, Overture, vrisko.gr | 236.2, -80.5 | 239.9, -90.3 | 0.0 | verified (OSM survey) |
| Artion | Argyropoulou 1-3 | OSM survey (n10095479481); also OSM, Overture | 204.8, -88.6 | 205.6, -91.3 | 0.0 | verified (OSM survey) |
| B-spoke | Argyropoulou 1-3 | Foursquare OS Places | - | 217.2, -85.2 |  | removed (reported closed, census tier X) |
| Chariot | Argyropoulou 1 | OSM survey (n10095519029); also Foursquare OS Places, OSM, Overture | 220.9, -84.2 | 221.3, -86.5 | 0.0 | verified (OSM survey) |
| Chopard-Kassis | Argyropoulou 1-3 | Foursquare OS Places | - | 220.5, -85.9 |  | unverified (old/weak listing, census tier C): not built |
| Eleven Shop | Argyropoulou 1-3 | Foursquare OS Places, vrisko.gr | - | 229.9, -86.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 1-3) |
| Gns Nails&Hair Spa | Αργυρόπουλου 1 | Overture only (confidence 0.56) | - | 227.5, -80.5 |  | unverified (Overture only, no census confirmation): not built |
| Heaven on earth | Argyropoulou 1-3 | OSM survey (n10095540743); also Foursquare OS Places, OSM, Overture, vrisko.gr | 195.3, -91.2 | 196.0, -93.9 | 0.0 | verified (OSM survey) |
| Jacadi Paris Greece | Argyropoulou 1 | Overture | - | 221.5, -85.6 |  | unverified (old/weak listing, census tier C): not built |
| Swarovski | Argyropoulou 1-3 | Foursquare OS Places, Overture, vrisko.gr | 212.0, -86.6 | 213.4, -91.5 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| gns nails&hair spa | Argyropoulou 1-3 | Foursquare OS Places, Overture | - | 234.8, -85.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 1-3) |
| Access Fashion | Argyropoulou 2 | OSM survey (n10095484309); also Foursquare OS Places, OSM, Overture, vrisko.gr | 208.3, -65.8 | 210.5, -64.0 | 1.2 | verified (OSM survey) |
| ActEve | Argyropoulou 2 | OSM survey (n10095458969); also OSM, Overture | 187.3, -74.1 | 186.9, -73.1 | 0.0 | verified (OSM survey) |
| Alouette | Argyropoulou 2 | OSM survey (n10095429216); also OSM, vrisko.gr | 225.3, -63.8 | 225.7, -62.8 | 0.0 | verified (OSM survey) |
| BeSeen | Argyropoulou 2 | OSM survey (n10095520244); also Foursquare OS Places, OSM, Overture, vrisko.gr | 199.1, -69.5 | 201.2, -67.5 | 1.2 | verified (OSM survey) |
| Feather Box | Argyropoulou 2 | Foursquare OS Places | - | 205.8, -65.2 |  | unverified (old/weak listing, census tier C): not built |
| Lollipops & Rainbows | Argyropoulou 2 | OSM survey (n10095542848); also Foursquare OS Places, OSM, Overture, vrisko.gr | 192.0, -72.3 | 191.9, -71.1 | 0.0 | verified (OSM survey) |
| MOONSHOT PRODUCTIONS | Argyropoulou 2 | vrisko.gr | - | 208.9, -65.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 2) |
| Orama | Argyropoulou 2 | OSM survey (n10095545902); also Foursquare OS Places, OSM, Overture | 221.8, -65.2 | 220.2, -64.4 | 0.0 | verified (OSM survey) |
| Permanent Beauty | Argyropoulou 2 | OSM survey (n10095541240); also Foursquare OS Places, OSM, Overture, vrisko.gr | 205.2, -67.0 | 208.9, -60.1 | 4.4 | moved 4.4 m along the facade (crowded frontage; OSM survey) |
| Pet Vogue | Argyropoulou 2 | OSM survey (n10095550122); also Foursquare OS Places, OSM, Overture | 228.6, -62.5 | 231.0, -60.3 | 1.5 | verified (OSM survey) |
| Petit Moi | Argyropoulou 2 | OSM survey (n10095527970); also OSM, Overture | - | 246.1, -53.5 |  | verified (OSM survey), free-standing (standalone) |
| Pops & Bows | Αργυρόπουλου 2 | Overture only (confidence 0.77) | - | 207.0, -51.1 |  | unverified (Overture only, no census confirmation): not built |
| Salon D’ Athènes | Argyropoulou 2 | Overture, vrisko.gr | 212.7, -64.1 | 212.1, -62.7 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| Sider | Argyropoulou 2 | OSM survey (n10095518170); also Foursquare OS Places, OSM, Overture, vrisko.gr | 241.4, -57.5 | 241.2, -56.4 | 0.0 | verified (OSM survey) |
| Sleeplux | Argyropoulou 2 | OSM survey (n10095548721); also OSM, Overture | 235.2, -60.0 | 236.0, -58.5 | 0.0 | verified (OSM survey) |
| Sparkle boutique | Argyropoulou 2 | Foursquare OS Places, Overture | - | 196.0, -69.1 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 2) |
| Viki Kremer | Argyropoulou 2 | OSM survey (n10095527973); also OSM, Overture | 201.5, -68.5 | 199.8, -64.2 |  | verified (OSM survey), door plate (upper floor / office) |
| White Angel | Argyropoulou 2 | Foursquare OS Places, Overture | 198.0, -69.9 | 197.4, -68.5 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| White Angel - Μαλλιωρασ | Αργυρόπουλου 2 | Overture only (confidence 0.73) | - | 202.1, -84.7 |  | unverified (Overture only, no census confirmation): not built |
| Zic Zac | Argyropoulou 2 | OSM survey (n10095537397); also OSM, Overture, vrisko.gr | 195.9, -70.7 | 196.3, -69.1 | 0.0 | verified (OSM survey) |
| Zini | Argyropoulou 2 | Foursquare OS Places, Overture | - | 183.6, -75.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 2) |
| Zini Boutique | Αργυροπούλου 2 | Overture only (confidence 0.58) | - | 183.1, -56.9 |  | unverified (Overture only, no census confirmation): not built |
| Κοσμήματα Μοιράγια | Argyropoulou 2 | vrisko.gr | - | 216.4, -62.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 2) |
| Ama lounge | Argyropoulou 3 | OSM survey (n10095477054); also Foursquare OS Places, OSM | 237.4, -80.2 | 241.7, -95.3 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Angelopoulos Brazilian Keratin Experts Κηφισιά Κέντρο | Argyropoulou 3 | Overture | - | 238.8, -81.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 3) |
| Cake | Argyropoulou 3 | OSM survey (n10095491311); also Foursquare OS Places, OSM, Overture, vrisko.gr | 210.9, -86.9 | 211.8, -89.4 | 0.0 | verified (OSM survey) |
| Gogo Porchetta Pizza Cocktail | Argyropoulou 3 | Foursquare OS Places | - | 214.0, -87.6 |  | unverified (old/weak listing, census tier C): not built |
| Portofino | Argyropoulou 3 | OSM survey (n10095547450); also Foursquare OS Places, OSM | 215.9, -85.6 | 216.6, -88.1 | 0.0 | verified (OSM survey) |
| GAP | Argyropoulou 4 | Foursquare OS Places, Overture | 252.1, -47.8 | 255.8, -55.0 | 5.6 | moved 5.6 m along the facade (crowded frontage; two-source listing on its street) |
| Gap | Αργυροπούλου 4 | Overture only (confidence 0.91) | - | 253.1, -67.6 |  | unverified (Overture only, no census confirmation): not built |
| Cosmos sport | Argyropoulou 6 | OSM survey (n10095505757); also Foursquare OS Places, OSM, Overture, vrisko.gr | 254.5, -52.5 | 256.2, -52.7 | 0.0 | verified (OSM survey) |
| J | Argyropoulou 6 | OSM survey (n10095524360); also Overture | 291.3, -48.2 | 290.9, -47.0 | 0.0 | verified (OSM survey) |
| Lalique - Εριλιν Ειδη Δωρων Και Διακοσμησησ | Argyropoulou 6 | Foursquare OS Places | - | 279.5, -51.3 |  | unverified (old/weak listing, census tier C): not built |
| Mothercare | Argyropoulou 6 | Foursquare OS Places, Overture | - | 305.8, -106.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 6) |
| Mothercare | Αργυροπούλου 6 | Overture only (confidence 0.77) | - | 308.7, -105.3 |  | unverified (Overture only, no census confirmation): not built |
| Έπος Cafe | Argyropoulou 6 | Foursquare OS Places | - | 284.1, -48.6 |  | unverified (old/weak listing, census tier C): not built |
| Cafe I Frati | Argyropoulou 7 | OSM survey (n10095518651); also Foursquare OS Places, OSM, Overture, vrisko.gr | 279.9, -70.8 | 279.9, -73.0 | 0.0 | verified (OSM survey) |
| Double D | Argyropoulou 7 | OSM survey (n10095498066); also Foursquare OS Places, OSM, Overture | 275.6, -72.4 | 281.1, -87.6 | 0.0 | verified (OSM survey) |
| L'été | Argyropoulou 7 | Foursquare OS Places | - | 285.1, -71.8 |  | removed (reported closed, census tier X) |
| Marina Papaioannou Notary | Argyropoulou 7 | Foursquare OS Places | 279.0, -71.2 | 283.7, -84.2 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| επτά7 | Argyropoulou 7 | Foursquare OS Places | 279.0, -71.2 | 283.7, -84.2 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Anatol | Argyropoulou 8 | OSM survey (n10095519023); also Foursquare OS Places, OSM, Overture, vrisko.gr | 309.4, -42.5 | 309.2, -42.8 | 0.0 | verified (OSM survey) |
| Fabriano Boutique | Argyropoulou 8 | Foursquare OS Places, Overture | 306.5, -43.2 | 306.8, -36.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Kids by Davina | Argyropoulou 8 | Foursquare OS Places | - | 312.2, -42.1 |  | unverified (old/weak listing, census tier C): not built |
| Kifisia Fabriano Boutique | Αργυρόπουλου 8 | Overture only (confidence 0.57) | - | 307.0, -33.3 |  | unverified (Overture only, no census confirmation): not built |
| Lampiris Interiors | Argyropoulou 8 | OSM survey (n10095540165); also Foursquare OS Places, OSM, Overture | 317.6, -40.2 | 317.1, -40.1 | 0.0 | verified (OSM survey) |
| Loco Loco | Argyropoulou 8 | OSM survey (n10095520704); also Foursquare OS Places, OSM, Overture | 313.2, -41.5 | 313.2, -41.8 | 0.0 | verified (OSM survey) |
| The Body Shop | Αργυροπούλου 8 | Overture only (confidence 0.97) | - | 226.2, -61.7 |  | unverified (Overture only, no census confirmation): not built |
| The Body Shop - Συνετοσ Ν & Σια Οε | Argyropoulou 8 | Foursquare OS Places, Overture | 306.5, -43.2 | 306.8, -36.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Αριστοκρατικόν | Argyropoulou 8 | OSM survey (n10095541239); also Foursquare OS Places, OSM, vrisko.gr | 301.2, -45.1 | 300.1, -45.3 | 0.0 | verified (OSM survey) |
| Μούγερ | Argyropoulou 8 | Foursquare OS Places | - | 302.5, -44.5 |  | unverified (old/weak listing, census tier C): not built |
| Crafts + Paper | Argyropoulou 9 | Foursquare OS Places | - | 298.9, -61.4 |  | unverified (old/weak listing, census tier C): not built |
| Pediatrician Arleen Chung-Sechopoulou | Argyropoulou 9 | Foursquare OS Places | 292.4, -65.6 | 298.2, -74.7 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Agora Deco&Deli | Argyropoulou 10 | Overture | - | 320.6, -35.1 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 10) |
| As You Plan | Argyropoulou 10 | OSM survey (n10095491307); also OSM, Overture | 328.5, -37.0 | 322.6, -25.4 |  | verified (OSM survey), door plate (upper floor / office) |
| Kitabu | Argyropoulou 10 | OSM survey (n10095524359); also Foursquare OS Places, OSM, Overture | 332.1, -35.7 | 328.2, -25.1 | 0.7 | verified (OSM survey) |
| MySign | Argyropoulou 10 | Overture | - | 318.5, -31.7 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Αργυροπούλου 10) |
| MySign | Αργυρόπουλου 10 | Overture only (confidence 0.58) | - | 214.3, -10.3 |  | unverified (Overture only, no census confirmation): not built |
| Whizz | Argyropoulou 10 | OSM survey (n10095505765); also OSM, Overture | - | 331.9, -20.1 |  | verified (OSM survey), free-standing (standalone) |
| asterkin | Argyropoulou 10 | Foursquare OS Places | - | 305.2, -42.2 |  | unverified (old/weak listing, census tier C): not built |
| Check me | Argyropoulou 12 | OSM survey (n10095521490); also Foursquare OS Places, OSM, Overture, vrisko.gr | 364.2, -21.6 | 364.0, -19.7 | 0.0 | verified (OSM survey) |
| Vagenas | Argyropoulou 14 | OSM survey (n10095518167); also Foursquare OS Places | 384.0, -21.2 | 385.3, -18.2 | 0.0 | verified (OSM survey) |
| Βαγενασ | Argyropoulou 14 | Foursquare OS Places | - | 341.3, -32.8 |  | unverified (old/weak listing, census tier C): not built |
| Armaos | Argyropoulou 15 | Foursquare OS Places | - | 366.5, -42.7 |  | unverified (old/weak listing, census tier C): not built |
| Artflyer | Argyropoulou 15 | Foursquare OS Places, Overture | 361.6, -45.2 | 365.7, -49.2 | 0.3 | verified (address = surveyed OSM number) |
| Artflyer | Αργυροπούλου 15 | Overture only (confidence 0.77) | - | 349.3, -49.5 |  | unverified (Overture only, no census confirmation): not built |
| Hellas Brands | Argyropoulou 17 | Overture | - | 394.3, -39.8 |  | unverified (old/weak listing, census tier C): not built |
| 2 architects | Argyropoulou  | OSM survey (n10095519420); also OSM | 232.1, -61.2 | 227.2, -49.0 |  | verified (OSM survey), door plate (upper floor / office) |
| Accountancy-Ηρω Αντωνοπούλου | Argyropoulou  | OSM survey (n10095501902); also OSM | 236.0, -59.6 | 231.1, -47.4 |  | verified (OSM survey), door plate (upper floor / office) |
| Alessandra | Argyropoulou  | OSM survey (n10095500863); also OSM | 335.2, -35.2 | 329.3, -29.2 | 3.4 | verified (OSM survey) |
| Amoreti | Argyropoulou  | Foursquare OS Places | - | 359.9, -20.7 |  | unverified (old/weak listing, census tier C): not built |
| As Seen | Argyropoulou  | Foursquare OS Places | - | 225.0, -83.1 |  | removed (reported closed, census tier X) |
| Bespoke | Argyropoulou  | Foursquare OS Places | - | 211.5, -64.6 |  | unverified (old/weak listing, census tier C): not built |
| Blanc | Argyropoulou  | OSM survey (n10095484311); also OSM | 237.4, -80.2 | 243.4, -99.7 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Butlers | Argyropoulou  | OSM survey (n10095465764); also Foursquare OS Places, OSM | 280.4, -51.1 | 277.8, -49.3 | 0.0 | verified (OSM survey) |
| Celadon | Argyropoulou  | OSM survey (n10095523837); also OSM | 238.4, -58.7 | 235.4, -42.0 | 1.9 | verified (OSM survey) |
| Chiara | Argyropoulou  | OSM survey (n10095509355); also OSM | 242.9, -39.1 | 241.3, -39.9 | 0.0 | verified (OSM survey) |
| Confido Realty | Argyropoulou  | OSM survey (n10095517251); also OSM | 231.2, -61.5 | 229.9, -57.3 |  | verified (OSM survey), door plate (upper floor / office) |
| Dalianis Architects | Argyropoulou  | OSM survey (n10095540741); also OSM | 338.7, -34.7 | 336.4, -19.8 |  | verified (OSM survey), door plate (upper floor / office) |
| ElenaMakri.com | Argyropoulou  | OSM survey (n10095517250); also OSM | 329.6, 2.6 | 330.4, -12.8 | 0.3 | verified (OSM survey) |
| Ellika | Argyropoulou  | OSM survey (n10095493613); also OSM | 296.3, -62.2 | 297.0, -64.2 | 0.0 | verified (OSM survey) |
| Emmy Monaco | Argyropoulou  | OSM survey (n10095542367); also OSM | 237.4, -80.2 | 244.7, -104.4 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Express Ραπτικης | Argyropoulou  | Foursquare OS Places | - | 355.9, -21.1 |  | unverified (old/weak listing, census tier C): not built |
| Gaitanaki | Argyropoulou  | Foursquare OS Places | - | 376.4, -23.2 |  | unverified (old/weak listing, census tier C): not built |
| Grafs And Papers | Argyropoulou  | Foursquare OS Places | - | 275.4, -47.4 |  | unverified, not built: no house number |
| Hug Cafe And Gateau | Argyropoulou  | Foursquare OS Places | - | 192.8, -71.9 |  | unverified (old/weak listing, census tier C): not built |
| I.D Fashion | Argyropoulou  | Foursquare OS Places | - | 361.8, -45.1 |  | unverified (old/weak listing, census tier C): not built |
| IBP | Argyropoulou  | OSM survey (n10095541222); also OSM | 364.5, -21.6 | 363.9, -17.4 |  | verified (OSM survey), door plate (upper floor / office) |
| Jacksonkids.gr | Argyropoulou  | OSM survey (n10095526506); also OSM | 231.8, -61.3 | 225.4, -45.4 | 0.0 | verified (OSM survey) |
| L'art des bijoux | Argyropoulou  | OSM survey (n10095518166); also OSM | 358.8, -20.8 | 361.9, -14.8 | 2.3 | verified (OSM survey) |
| Le shop | Argyropoulou  | OSM survey (n10095540318); also OSM | 348.4, -27.9 | 348.9, -26.2 | 0.0 | verified (OSM survey) |
| Magnolia grace | Argyropoulou  | OSM survey (n10095526273); also OSM | 215.4, -63.0 | 208.8, -49.0 | 0.0 | verified (OSM survey) |
| Michalelis | Argyropoulou  | OSM survey (n10095545895); also OSM | 202.2, -68.2 | 204.7, -62.1 | 3.1 | verified (OSM survey) |
| Mimoza Cafe | Argyropoulou  | Foursquare OS Places | - | 277.7, -51.8 |  | unverified, not built: no house number |
| One O One North | Argyropoulou  | OSM survey (n10095537395); also OSM | 341.4, -34.3 | 332.7, -24.0 | 5.6 | moved 5.6 m along the facade (crowded frontage; OSM survey) |
| Replay Stores | Argyropoulou  | Foursquare OS Places | - | 237.1, -41.9 |  | removed (reported closed, census tier X) |
| Seazen | Argyropoulou  | Foursquare OS Places | - | 305.9, -43.5 |  | unverified (old/weak listing, census tier C): not built |
| Spyrakis Developments | Argyropoulou  | OSM survey (n10095517249); also OSM | 350.8, -21.8 | 345.8, -16.7 |  | verified (OSM survey), door plate (upper floor / office) |
| TOMS Pop up Store | Argyropoulou  | Foursquare OS Places | - | 181.8, -76.3 |  | unverified (old/weak listing, census tier C): not built |
| Ta Skalakia | Argyropoulou  | Foursquare OS Places, Overture | - | 282.2, -50.6 |  | unverified, not built: no house number |
| Tan beautiful | Argyropoulou  | OSM survey (n10095505708); also OSM | 202.5, -36.1 | 199.0, -49.3 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Tricks & Treats | Argyropoulou  | OSM survey (n10095487347); also OSM | 305.2, -43.9 | 304.5, -43.8 | 0.0 | verified (OSM survey) |
| V&O | Argyropoulou  | OSM survey (n10095501211); also OSM | 211.4, -64.6 | 211.1, -56.6 | 1.1 | verified (OSM survey) |
| Watchlab | Argyropoulou  | OSM survey (n10095551417); also OSM | 216.4, -62.6 | 221.2, -60.8 |  | verified (OSM survey), door plate (upper floor / office) |
| bowling | Argyropoulou  | OSM survey (n10095484308) | 211.2, -64.7 | 206.9, -53.9 |  | verified (OSM survey), door plate (upper floor / office) |
| office | Argyropoulou  | OSM survey (n10095527971) | 275.6, -72.4 | 284.3, -96.7 |  | verified (OSM survey), door plate (upper floor / office) |
| ΑΑ Αφεντάκη | Argyropoulou  | OSM survey (n10095542846); also OSM | 354.5, -21.3 | 361.5, -11.5 | 5.6 | moved 5.6 m along the facade (crowded frontage; OSM survey) |
| Κ. Μοιραγιας | Argyropoulou  | OSM survey (n10095503366); also OSM | 217.3, -62.3 | 221.3, -51.1 |  | verified (OSM survey), door plate (upper floor / office) |
| Μιμή Σιακάρα | Argyropoulou  | OSM survey (n10095544928); also OSM | 235.2, -60.0 | 234.3, -55.9 |  | verified (OSM survey), door plate (upper floor / office) |

### Kifisias Ave (Κηφισίας) — 262 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Truffle house Barbarigo | Papadianti 1 & Kifisias | Overture only (confidence 0.77) | - | 0.9, -130.1 |  | unverified (Overture only, no census confirmation): not built |
| MAX&Co. | Kifisias Ave 5 | OSM survey (n10095497106); also Foursquare OS Places, OSM, Overture | 274.0, 4.0 | 274.5, 2.4 | 0.0 | verified (OSM survey) |
| Bourtsalas - Gold & Silver | Α)Πλ. 25ης Μαρτίου. Β)Λ Κηφισιας 232 | Overture only (confidence 0.78) | - | -71.5, 65.9 |  | unverified (Overture only, no census confirmation): not built |
| ΚΩΝΣΤΑΝΤΑΡΑΣ - Χειροποίητο έπιπλο - Κατάστημα Κηφισιάς | Leof. Kifisias 96 | Overture only (confidence 0.85) | - | -25.8, -24.0 |  | unverified (Overture only, no census confirmation): not built |
| Pet City | Λεωφόρος Κηφισίας 220 | Overture only (confidence 0.91) | - | -58.8, 86.9 |  | unverified (Overture only, no census confirmation): not built |
| Travel Plan | Κηφισίας 226 | Overture only (confidence 0.77) | - | -94.0, 121.0 |  | unverified (Overture only, no census confirmation): not built |
| Andie Wings | Kifisias Ave 228 | Overture | -95.9, 115.2 | -88.4, 118.3 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Avorio (Home Collection) | Λεωφόρος Κηφισίας 228 | Overture only (confidence 0.67) | - | -70.5, 110.9 |  | unverified (Overture only, no census confirmation): not built |
| Bonsai - Tranquility at Home | Λεωφόρος Κηφισιας 228 | Overture only (confidence 0.77) | - | -88.3, 115.5 |  | unverified (Overture only, no census confirmation): not built |
| Crocodilino | Kifisias Ave 228 | Foursquare OS Places | - | -76.3, 109.7 |  | unverified (old/weak listing, census tier C): not built |
| Elite Style | Kifisias Ave 228 | Overture | -92.0, 106.4 | -88.4, 118.3 | 6.6 | moved 6.6 m along the facade (crowded frontage; address = surveyed OSM number) |
| Elite Style Kifisia | Leof. Kifisias 228 | Overture only (confidence 0.88) | - | -78.2, 111.3 |  | unverified (Overture only, no census confirmation): not built |
| Fun Ocean Outdoors Ltd | Kifisias Ave 228 | Overture | -84.3, 106.5 | -88.4, 118.3 | 0.0 | verified (address = surveyed OSM number) |
| Fun Ocean Outdoors Ltd | Λεωφ. Κηφισίας 228 &, Geor. Drosini 5-7 | Overture only (confidence 0.87) | - | -60.4, 127.3 |  | unverified (Overture only, no census confirmation): not built |
| Hope Bar | Kifisias Ave 228 | Foursquare OS Places, Overture | -95.9, 115.2 | -88.4, 118.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Melcore | Kifisias Ave 228 | Foursquare OS Places | - | -85.4, 135.7 |  | unverified (old/weak listing, census tier C): not built |
| Moketino Living | Leof. Kifisias 228 | Overture only (confidence 0.94) | - | -100.7, 118.9 |  | unverified (Overture only, no census confirmation): not built |
| Prince Gold | Kifisias Ave 228 | Foursquare OS Places | - | -89.1, 134.6 |  | unverified (old/weak listing, census tier C): not built |
| Slut Boardshop | Kifisias Ave 228 | OSM survey (n5979293375); also Foursquare OS Places, OSM, Overture | -7.7, -17.4 | -8.2, -18.3 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Stones and Walls | Kifisias Ave 228 | Overture | -79.2, 108.2 | -88.4, 118.3 | 2.8 | verified (address = surveyed OSM number) |
| Stones and Walls | Leof. Kifisias 228 | Overture only (confidence 0.70) | - | -100.2, 119.6 |  | unverified (Overture only, no census confirmation): not built |
| Welcome | Kifisias Ave 228 | Overture | - | -92.9, 133.3 |  | unverified (old/weak listing, census tier C): not built |
| iRepair | Kifisias Ave 228 | Foursquare OS Places, Overture | -88.7, 104.9 | -88.4, 118.3 | 2.8 | verified (address = surveyed OSM number) |
| slutboardshop kifisia | Leof. Kifisias 228 | Overture only (confidence 0.99) | - | -93.4, 118.3 |  | unverified (Overture only, no census confirmation): not built |
| Αλιόνα Στράτουλατ | Kifisias Ave 228 | Overture | -97.3, 119.3 | -88.4, 118.3 | 0.9 | verified (address = surveyed OSM number) |
| Αλιόνα Στράτουλατ | Leof. Kifisias 228 | Overture only (confidence 0.91) | - | -91.3, 121.2 |  | unverified (Overture only, no census confirmation): not built |
| Βασίλης Ξυπολυτάς | Kifisias Ave 228 | Overture | -99.4, 127.3 | -88.4, 118.3 | 8.4 | moved 8.4 m along the facade (crowded frontage; address = surveyed OSM number) |
| Βασίλης Ξυπολυτάς | Λεωφόρος Κηφισίας 228 | Overture only (confidence 0.62) | - | -86.8, 123.2 |  | unverified (Overture only, no census confirmation): not built |
| Μοκετινο | Kifisias Ave 228 | Foursquare OS Places, Overture | -95.4, 114.0 | -88.4, 118.3 | 0.0 | verified (address = surveyed OSM number) |
| Νότα Ζέρβα | Kifisias Ave 228 | Overture | - | -79.4, 108.1 |  | unverified (old/weak listing, census tier C): not built |
| ΟΝΝΕΔ | Kifisias Ave 228 | Overture | - | -83.2, 106.8 |  | unverified (old/weak listing, census tier C): not built |
| Σχολή Χορού ''Δέσποινα Γρηγοριάδου '' / Grigoriadou Dance School | Kifisias Ave 228 | Foursquare OS Places, Overture | -93.8, 110.2 | -88.4, 118.3 | 4.1 | moved 4.1 m along the facade (crowded frontage; address = surveyed OSM number) |
| Σχολή Χορού ''Δέσποινα Γρηγοριάδου '' / Grigoriadou Dance School | Κηφισίας 228, Κηφισιά | Overture only (confidence 0.97) | - | -90.8, 104.2 |  | unverified (Overture only, no census confirmation): not built |
| Σχολή Χορού ''Δέσποινα Γρηγοριάδου '' / Grigoriadou Dance School | Λεωφόρος Κηφισίας 228 | Overture only (confidence 0.95) | - | -100.3, 119.0 |  | unverified (Overture only, no census confirmation): not built |
| Capital Exchange | Kifisias Ave 230 | Foursquare OS Places, Overture | -70.8, 93.6 | -75.6, 81.6 | 4.9 | moved 4.9 m along the facade (crowded frontage; address = surveyed OSM number) |
| Capital Exchange | Leof. Kifisias 230 | Overture only (confidence 0.74) | - | -81.9, 80.3 |  | unverified (Overture only, no census confirmation): not built |
| Inteliexpress | Kifisias Ave 230 | OSM survey (n11069628669); also OSM | -76.2, 78.1 | -75.2, 79.4 | 0.0 | verified (OSM survey) |
| Ioulia️️ Vasilaki | Kifisias Ave 230 | Overture | -77.6, 80.4 | -75.6, 81.6 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Ioulia️️ Vasilaki | Λεωφόρος Κηφισίας 230 | Overture only (confidence 0.85) | - | -74.6, 91.0 |  | unverified (Overture only, no census confirmation): not built |
| Loukia Tseke | Kifisias Ave 230 | Overture | -77.6, 80.4 | -75.6, 81.6 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Loukia Tseke | Λεωφόρος Κηφισίας 230 | Overture only (confidence 0.53) | - | -82.6, 107.1 |  | unverified (Overture only, no census confirmation): not built |
| Nixi Nixi | Kifisias Ave 230 | Foursquare OS Places | - | -85.8, 96.5 |  | unverified (old/weak listing, census tier C): not built |
| Nobacco | Kifisias Ave 230 | OSM survey (n11069418194); also Foursquare OS Places, OSM, Overture | -78.9, 82.7 | -76.0, 83.7 | 0.0 | verified (OSM survey) |
| ORAGOLD / Αγορά Χρυσού | Kifisias Ave 230 | Overture | -85.1, 94.9 | -75.6, 81.6 | 13.5 | moved 13.5 m along the facade (crowded frontage; address = surveyed OSM number) |
| ORAGOLD / Αγορά Χρυσού Κηφισιά | Λεωφόρος Κηφισίας 230 | Overture only (confidence 0.94) | - | -78.3, 86.1 |  | unverified (Overture only, no census confirmation): not built |
| Sueno Bags | Kifisias Ave 230 | Overture | -81.3, 97.4 | -75.6, 81.6 | 11.6 | moved 11.6 m along the facade (crowded frontage; address = surveyed OSM number) |
| Sueno Bags | Leof. Kifisias 230 | Overture only (confidence 0.89) | - | -66.6, 86.1 |  | unverified (Overture only, no census confirmation): not built |
| Vassili's Barber Shop | Kifisias Ave 230 | Foursquare OS Places | - | -72.3, 77.2 |  | unverified (old/weak listing, census tier C): not built |
| Victoria's Secret | Kifisias Ave 230 | Foursquare OS Places, Overture | - | -70.0, 80.5 |  | removed (reported closed, census tier X) |
| Western Union | Kifisias Ave 230 | Foursquare OS Places, Overture | -82.9, 90.1 | -75.6, 81.6 | 8.2 | moved 8.2 m along the facade (crowded frontage; address = surveyed OSM number) |
| Western Union | 230 Kifisias | Overture only (confidence 0.85) | - | -74.3, 85.5 |  | unverified (Overture only, no census confirmation): not built |
| Bourtsalas Bros | Leof. Kifisias 232 | Overture only (confidence 0.80) | - | -71.5, 65.9 |  | unverified (Overture only, no census confirmation): not built |
| Cactus - Curated Piercing | Kifisias Ave 232 | Overture | - | -60.6, 62.9 |  | unverified (old/weak listing, census tier C): not built |
| Cararigas | Kifisias Ave 232 | Foursquare OS Places | - | -56.9, 61.4 |  | unverified (old/weak listing, census tier C): not built |
| Fotofast F-Lab | Kifisias Ave 232 | Overture, vrisko.gr | -64.9, 65.3 | -60.6, 72.3 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Fotofast F-Lab | Leof. Kifisias 232 | Overture only (confidence 0.53) | - | -72.8, 65.3 |  | unverified (Overture only, no census confirmation): not built |
| Globalcitizen Educational Organization | Kifisias Ave 232 | Overture | -65.7, 65.8 | -60.6, 72.3 |  | verified (address = surveyed OSM number), sign over the building entrance |
| Globalcitizen Educational Organization | Leof. Kifisias 232 | Overture only (confidence 0.65) | - | -60.0, 72.3 |  | unverified (Overture only, no census confirmation): not built |
| Hellenic Realtor Service | Kifisias Ave 232 | Overture | -64.9, 65.3 | -60.6, 72.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Hellenic Realtor Service | Leof. Kifisias 232 | Overture only (confidence 0.85) | - | -67.6, 65.3 |  | unverified (Overture only, no census confirmation): not built |
| IL Toto | Kifisias Ave 232 | OSM survey (n5488581836); also Foursquare OS Places, OSM, Overture | -69.1, 67.9 | -66.2, 73.0 | 0.0 | verified (OSM survey) |
| J'aime la mode | Kifisias Ave 232 | Overture | -64.9, 65.3 | -60.6, 72.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| J'aime la mode | Leof. Kifisias 232 | Overture only (confidence 0.77) | - | -60.2, 73.1 |  | unverified (Overture only, no census confirmation): not built |
| Jasmine Skylounge | Kifisias Ave 232 | Foursquare OS Places, Overture, vrisko.gr | -64.9, 65.3 | -60.6, 72.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Pharmonline | Kifisias Ave 232 | Overture, vrisko.gr | -64.9, 65.3 | -60.6, 72.3 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Pharmonline | Λεωφόρος Κηφισίας 232 | Overture only (confidence 0.57) | - | -56.2, 65.0 |  | unverified (Overture only, no census confirmation): not built |
| Suite Bar | Kifisias Ave 232 | Foursquare OS Places, Overture | - | -53.9, 62.7 |  | removed (reported closed, census tier X) |
| Survival Club | Kifisias Ave 232 | Foursquare OS Places | - | -55.5, 87.7 |  | unverified (old/weak listing, census tier C): not built |
| Tobacco Club 232 | Kifisias Ave 232 | Overture | -64.9, 65.3 | -62.8, 70.8 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Tobacco Club 232 | Λεωφόρος Κηφισίας 232 | Overture only (confidence 0.68) | - | -78.8, 89.1 |  | unverified (Overture only, no census confirmation): not built |
| craftit | Kifisias Ave 232 | Foursquare OS Places | - | -52.7, 90.6 |  | unverified (old/weak listing, census tier C): not built |
| jewelry | Kifisias Ave 232 | OSM survey (n5488581835); also OSM, Overture | -66.2, 66.1 | -63.2, 71.0 | 0.0 | verified (OSM survey) |
| Ματίνα Τσακίρη | Kifisias Ave 232 | OSM survey (n3269056761); also OSM | -63.2, 64.3 | -59.0, 68.4 | 0.0 | verified (OSM survey) |
| Ορθοπεδικό ιατρείο Αλέξανδρος Αουάντ | Kifisias Ave 232 | Overture | -66.4, 66.3 | -60.6, 72.3 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Ορθοπεδικό ιατρείο Αλέξανδρος Αουάντ | Leof. Kifisias 232 | Overture only (confidence 0.91) | - | -59.8, 72.9 |  | unverified (Overture only, no census confirmation): not built |
| RepairLogic | Kifisias Ave 234 | OSM survey (n4656636066); also Foursquare OS Places, OSM, Overture | -45.7, 31.5 | -44.5, 32.8 | 0.0 | verified (OSM survey) |
| Vivify - The Beauty Lab | Kifisias Ave 234 | Foursquare OS Places, Overture, vrisko.gr | -42.4, 20.9 | -44.5, 32.8 | 9.9 | moved 9.9 m along the facade (crowded frontage; address = surveyed OSM number) |
| ADS Architects | Kifisias Ave 236 | Overture | - | -41.0, 18.0 |  | unverified (old/weak listing, census tier C): not built |
| Argo Exchange | Kifisias Ave 236 | Foursquare OS Places, Overture | -29.3, 3.7 | -28.8, 5.9 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| Argo Exchange | Leof. Kifisias 236 | Overture only (confidence 0.74) | - | -44.5, 23.1 |  | unverified (Overture only, no census confirmation): not built |
| Coffeeway bar | Kifisias Ave 236 | OSM survey (n4936860763); also Foursquare OS Places, OSM, Overture, vrisko.gr | -32.5, 10.2 | -30.5, 11.6 | 0.0 | verified (OSM survey) |
| Dromor Travel | Kifisias Ave 236 | Foursquare OS Places, vrisko.gr | -40.5, 16.9 | -13.4, 11.5 | 14.1 | moved 14.1 m along the facade (crowded frontage; address = surveyed OSM number) |
| Mikel Coffee Company | Kifisias Ave 236-240 | Foursquare OS Places | - | -39.2, 14.7 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 236-240) |
| MoneyGram | 236 Leoforos Kifisias | Overture only (confidence 0.95) | - | -38.4, 29.4 |  | unverified (Overture only, no census confirmation): not built |
| Monogram Books | Kifisias Ave 236 | OSM survey (n11129217101); also Foursquare OS Places, OSM, vrisko.gr | 0.1, 17.7 | 0.4, 16.8 | 0.0 | verified (OSM survey) |
| Pansik Scuola Di Moda | Kifisias Ave 236 | Foursquare OS Places | - | -14.2, 3.0 |  | unverified (old/weak listing, census tier C): not built |
| Skin Touch Dermatology | Leof. Kifisias 236 | Overture only (confidence 0.96) | - | -40.0, 23.9 |  | unverified (Overture only, no census confirmation): not built |
| Skin Touch Dermatology Clinic | Kifisias Ave 236 | Foursquare OS Places, Overture | -31.9, 8.8 | -31.9, 8.8 |  | verified (two-source listing on its street), door plate (upper floor / office) |
| Takouni Expert | Kifisias Ave 236 | Overture | -29.3, 3.7 | -13.4, 11.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Takouni Expert | Λεωφόρος Κηφισίας 236 | Overture only (confidence 0.59) | - | -34.1, 26.6 |  | unverified (Overture only, no census confirmation): not built |
| Tzoumakas homes | Kifisias Ave 236 | Overture | - | -35.4, 16.0 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 236) |
| Tzoumakas homes | Λεωφόρος Κηφισίας 236 | Overture only (confidence 0.65) | - | -22.8, 16.6 |  | unverified (Overture only, no census confirmation): not built |
| Wine Therapy Kifissia cave & 🍷 | Kifisias Ave 236 | Overture | - | -33.6, 12.4 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 236) |
| Wine Therapy Kifissia cave & 🍷 | Leof. Kifisias 236 | Overture only (confidence 0.79) | - | -38.8, 26.8 |  | unverified (Overture only, no census confirmation): not built |
| antonisloumidis.gr - καφεκοπτείο online Kifisia | Λεωφόρος Κηφισίας 236 | Overture only (confidence 0.89) | - | -36.1, 27.5 |  | unverified (Overture only, no census confirmation): not built |
| Αντώνης Λουμίδης Καφεκοπτείο | Λεωφ. Κηφισίας 236 | Overture only (confidence 0.77) | - | -41.4, 1.2 |  | unverified (Overture only, no census confirmation): not built |
| Αρκαδιανός | Kifisias Ave 236 | Foursquare OS Places, vrisko.gr | -37.4, 15.3 | -13.4, 11.5 | 19.5 | moved 19.5 m along the facade (crowded frontage; address = surveyed OSM number) |
| ΒΕΚΡΗΣ GAMES | Kifisias Ave 236 | vrisko.gr | -29.3, 3.7 | -13.4, 11.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| ΟΠΑΠ | Kifisias Ave 236 | OSM survey (n4936863007); also Foursquare OS Places, OSM | -28.5, 2.0 | -25.1, 2.2 | 0.0 | verified (OSM survey) |
| Πλάτανος | Kifisias Ave 236 | OSM survey (n4936862425); also Foursquare OS Places, OSM | -30.4, 5.8 | -27.7, 6.7 | 0.0 | verified (OSM survey) |
| Bacco | Kifisias Ave 238 | Foursquare OS Places | - | 4.7, -29.6 |  | removed (reported closed, census tier X) |
| Blowdoll | Kifisias Ave 238-240 | Foursquare OS Places | - | 7.6, -16.1 |  | unverified (old/weak listing, census tier C): not built |
| Bubble Tale teabar | Kifisias Ave 238 | Overture | - | -10.4, -7.5 |  | unverified, not built: no facade of its street on the address side within 15 m |
| Bubble Tale teabar | Leof. Kifisias 238 | Overture only (confidence 0.98) | - | -13.5, -14.3 |  | unverified (Overture only, no census confirmation): not built |
| Coffee Time | Kifisias Ave 238-240 | Foursquare OS Places | - | 11.5, -26.6 |  | removed (reported closed, census tier X) |
| Etien Pizza Bar | Kifisias Ave 238-240 | Foursquare OS Places | - | 10.2, 0.5 |  | removed (reported closed, census tier X) |
| Fairynails | Kifisias Ave 238-240 | Overture | -16.4, -9.8 | -10.4, -7.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Fairynails Kifisia | Leof. Kifisias 238-240 | Overture only (confidence 0.98) | - | -13.2, -20.8 |  | unverified (Overture only, no census confirmation): not built |
| Far East Fusion | Kifisias Ave 238-240 | Foursquare OS Places | - | -3.5, 6.0 |  | unverified (old/weak listing, census tier C): not built |
| Gordo | Kifisias Ave 238-240 | OSM survey (n13698583664); also OSM, Overture | -7.7, -17.4 | 2.3, -13.9 |  | verified (OSM survey), name on the building directory board (frontage full) |
| Gözleme | Kifisias Ave 238 | Foursquare OS Places | - | 8.5, -28.3 |  | removed (reported closed, census tier X) |
| Hachiko | Kifisias Ave 238-240 | OSM survey (n10095479947); also Foursquare OS Places, OSM | -1.7, -42.9 | 39.8, -30.5 | 0.0 | verified (OSM survey) |
| KFC | Kifisias Ave 238-240 | address (research); also Foursquare OS Places, Overture, web/official site | -8.1, -16.2 | -4.0, -10.8 | 0.1 | verified (OSM survey) |
| Kessaris | Kifisias Ave 238-240 | Foursquare OS Places, vrisko.gr | - | -10.4, -7.5 |  | unverified, not built: no facade of its street on the address side near the address |
| La Puerkita | Kifisias Ave 238-240 | Overture | -16.4, -9.8 | -10.4, -7.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Mailo's The Pasta Project | Kifisias Ave 238 | Foursquare OS Places, Overture | -16.4, -9.8 | -10.4, -7.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Mailo’s Kifisia | Λεωφόρος Κηφισίας 238 | Overture only (confidence 0.76) | - | -6.7, -12.2 |  | unverified (Overture only, no census confirmation): not built |
| Meligan Beauty spot | Kifisias Ave 238-240 | Overture | - | -10.4, -7.5 |  | unverified, not built: no facade of its street on the address side within 15 m |
| Meligan Beauty spot | Leof. Kifisias 238-240 | Overture only (confidence 0.86) | - | -15.5, -20.9 |  | unverified (Overture only, no census confirmation): not built |
| Move Your Hair | Kifisias Ave 238-240 | Foursquare OS Places, Overture, vrisko.gr | -16.4, -9.8 | -10.4, -7.5 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Old Boy Members Club | Kifisias Ave 238-240 | Overture | -16.4, -9.8 | -10.4, -7.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Old Boy Members Club | Leof. Kifisias, 238-240 | Overture only (confidence 0.77) | - | -5.6, -17.2 |  | unverified (Overture only, no census confirmation): not built |
| Paragon Fitness | Kifisias Ave 238-240 | Overture | - | 4.7, -15.7 |  | unverified (old/weak listing, census tier C): not built |
| Rakkan | Kifisias Ave 238-240 | Foursquare OS Places, Overture | -16.4, -9.8 | -10.4, -7.5 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Rakkan Bar Restaurant | Λεωφόρος Κηφισίας 238 | Overture only (confidence 0.68) | - | 29.1, -17.1 |  | unverified (Overture only, no census confirmation): not built |
| Rojo Restaurant | Λεωφόρος Κηφισίας 238 | Overture only (confidence 0.70) | - | 19.3, -19.0 |  | unverified (Overture only, no census confirmation): not built |
| Sense Cafe | Kifisias Ave 238-240 | Foursquare OS Places | - | 0.3, 7.0 |  | unverified (old/weak listing, census tier C): not built |
| Simply Burgers | Kifisias Ave 238 | Foursquare OS Places, Overture | -16.4, -9.8 | -10.4, -7.5 | 0.0 | verified (address = surveyed OSM number) |
| Simply Burgers Kifissia | Leof. Kifisias 238 | Overture only (confidence 0.96) | - | -16.2, -11.6 |  | unverified (Overture only, no census confirmation): not built |
| Starbucks | Kifisias Ave 238-240 | Foursquare OS Places | - | 7.4, 8.0 |  | removed (reported closed, census tier X) |
| Sublime | Kifisias Ave 238-240 | Foursquare OS Places | - | 4.2, 8.1 |  | unverified (old/weak listing, census tier C): not built |
| kiosk | Kifisias Ave 238 | OSM survey (n2399797106); also Foursquare OS Places, OSM | - | -10.8, -32.0 |  | verified (OSM survey), free-standing (standalone) |
| Γουρουνάκια | Kifisias Ave 238-240 | Foursquare OS Places | - | 8.8, 4.2 |  | removed (reported closed, census tier X) |
| Ελληνική Κουζίνα Εστιατόρια-ΜΠΑΚΑΛΙΚΟ ΟΛΑ ΤΑ ΚΑΛΑ | Kifisias Ave 238 | Foursquare OS Places | - | 9.8, -23.2 |  | unverified (old/weak listing, census tier C): not built |
| Εμπορικο Κεντρο Μελα | ΛΕΩΦΟΡΟΣ ΚΗΦΙΣΙΑΣ 238-240 | Overture only (confidence 0.81) | - | -33.5, -7.2 |  | unverified (Overture only, no census confirmation): not built |
| Κέντρο Μελά | Kifisias Ave 238-240 | Foursquare OS Places, Overture | -19.9, -0.6 | -10.4, -7.5 | 8.1 | moved 8.1 m along the facade (crowded frontage; address = surveyed OSM number) |
| Κεντρικό Περίπτερο | Kifisias Ave 238-240 | Foursquare OS Places | - | -10.4, -7.5 |  | unverified, not built: no facade of its street on the address side within 15 m |
| Κηφισίας & Κασσαβέτη Μeat Bar (Κέντρο Μελά) | Λεωφόρος Κηφισίας 238 | Overture only (confidence 0.69) | - | -17.4, -15.6 |  | unverified (Overture only, no census confirmation): not built |
| Πίκος | Kifisias Ave 238 | Foursquare OS Places | - | 8.0, -19.9 |  | unverified (old/weak listing, census tier C): not built |
| Φωτο Κηφισια | Λεωφόρος Κηφισίας 238-240 | Overture only (confidence 0.94) | - | -31.5, -14.7 |  | unverified (Overture only, no census confirmation): not built |
| Φώτο | Kifisias Ave 238-240 | Foursquare OS Places, Overture, vrisko.gr | -18.3, -4.8 | -10.4, -7.5 | 2.8 | verified (address = surveyed OSM number) |
| BOMBERG | Kifisias Ave 240 | Overture | - | -1.6, -48.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 240) |
| BOMBERG | Λεωφόρος Κηφισίας 240 | Overture only (confidence 0.75) | - | -11.2, -52.6 |  | unverified (Overture only, no census confirmation): not built |
| Celest • All-Day Bar Restaurant | Kifisias Ave 240 | Overture | - | -2.0, -46.0 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 240) |
| Celest • All-Day Bar Restaurant | Λεωφόρος Κηφισίας 240 | Overture only (confidence 0.54) | - | 0.0, -3.3 |  | unverified (Overture only, no census confirmation): not built |
| Move Your Hair and Nails | 240, Leof. Kifisias 238 | Overture only (confidence 0.95) | - | -17.0, -15.6 |  | unverified (Overture only, no census confirmation): not built |
| Fratelli Petridi | Kifisias Ave 242 | Overture, vrisko.gr | 5.7, -103.3 | 8.7, -86.0 | 14.7 | moved 14.7 m along the facade (crowded frontage; address = surveyed OSM number) |
| Fratelli Petridi | Leof. Kifisias 242 | Overture only (confidence 0.60) | - | 5.3, -91.4 |  | unverified (Overture only, no census confirmation): not built |
| Li-Ning | Kifisias Ave 242 | Foursquare OS Places | - | 18.0, -75.8 |  | removed (reported closed, census tier X) |
| Medical Anti-aging Center | Kifisias Ave 242 | Foursquare OS Places, Overture | 6.4, -93.5 | 8.7, -86.0 | 4.7 | moved 4.7 m along the facade (crowded frontage; address = surveyed OSM number) |
| Medical Anti-aging Center | Λεωφόρος Κηφισίας 242 | Overture only (confidence 0.77) | - | 28.2, -48.4 |  | unverified (Overture only, no census confirmation): not built |
| Optima | Kifisias Ave 242 | OSM survey (n10095525694); also OSM | 5.8, -84.7 | 8.3, -79.1 | 0.0 | verified (OSM survey) |
| Prince Oliver | Kifisias Ave 242 | Foursquare OS Places, Overture | 5.8, -108.6 | 8.7, -86.0 | 20.0 | moved 20.0 m along the facade (crowded frontage; address = surveyed OSM number) |
| The PUMA Store | Kifisias Ave 242 | Foursquare OS Places | 5.9, -86.2 | 8.7, -86.0 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| ASICS | Kifisias Ave 244 | OSM survey (n10095501266); also Foursquare OS Places, OSM, Overture, vrisko.gr | 6.0, -121.3 | 8.2, -121.3 | 0.0 | verified (OSM survey) |
| DHL Service Point | Kifisias Ave 244 | Foursquare OS Places | - | 7.4, -117.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 244) |
| Football shop | Kifisias Ave 244 | Foursquare OS Places | - | 5.9, -113.8 |  | unverified (old/weak listing, census tier C): not built |
| KEM | Kifisias Ave 244 | Foursquare OS Places | - | 6.0, -121.8 |  | unverified (old/weak listing, census tier C): not built |
| Pastry Family | Kifisias Ave 244 | Overture, vrisko.gr | 5.9, -113.9 | 7.2, -103.2 | 8.2 | moved 8.2 m along the facade (crowded frontage; two-source listing on its street) |
| Pastry Family | Leof. Kifisias 244 | Overture only (confidence 0.77) | - | 3.1, -103.4 |  | unverified (Overture only, no census confirmation): not built |
| Polish Up by Nicole | Kifisias Ave 244 | Overture | - | -10.0, -129.4 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 244) |
| Polish Up by Nicole | Λεωφόρος Κηφισίας 244 | Overture only (confidence 0.94) | - | -10.0, -129.4 |  | unverified (Overture only, no census confirmation): not built |
| foo bar | Kifisias Ave 244 | Foursquare OS Places | - | 7.4, -113.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 244) |
| A2Z Nutrition | Kifisias Ave 246β | Overture | - | 8.5, -142.1 |  | unverified (old/weak listing, census tier C): not built |
| Filmstream | Kifisias Ave 246Β | Foursquare OS Places, Overture, vrisko.gr | 5.6, -152.7 | 6.8, -155.6 | 0.2 | verified (two-source listing on its street) |
| OPTIKER | Kifisias Ave 246 | vrisko.gr | - | 17.0, -139.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 246) |
| Quantum Wellness Hub | Kifisias Ave 246 | Overture | - | 8.0, -145.0 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 246) |
| Quantum Wellness Hub | Λεωφόρος Κηφισίας 246 | Overture only (confidence 0.59) | - | 13.2, -145.4 |  | unverified (Overture only, no census confirmation): not built |
| ip jewels | Kifisias Ave 246 | Overture | - | -11.4, -132.0 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 246) |
| Passas Real Estate | Kifisias Ave 248 | Overture | - | 22.6, -159.9 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 248) |
| Ανθοπωλείο Κουτσουράδη | Kifisias Ave 248 | vrisko.gr | - | 7.4, -164.8 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 248) |
| δύο 48 | Kifisias Ave 248 | Foursquare OS Places | - | 7.3, -151.3 |  | removed (reported closed, census tier X) |
| Blue Bear | Kifisias Ave 250 | Overture | - | 2.9, -184.4 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 250) |
| Blue Bear | Leof. Kifisias 250 | Overture only (confidence 0.84) | - | 10.4, -185.9 |  | unverified (Overture only, no census confirmation): not built |
| Κωτσόβολος-Αττική | Kifisias Ave 250-254 | Foursquare OS Places, Overture | -0.6, -194.5 | 0.9, -194.8 | 0.0 | verified (two-source listing on its street) |
| Κωτσόβολος-Αττική-Κηφισιά | Λεωφ.Κηφισίας 250-254 | Overture only (confidence 0.77) | - | -9.8, -192.6 |  | unverified (Overture only, no census confirmation): not built |
| Advanced Hair Clinics | Kifisias Ave 252Α | Overture | - | 1.3, -201.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 252Α) |
| Advanced Hair Clinics | Leof. Kifisias 252Α | Overture only (confidence 0.93) | - | -5.3, -200.2 |  | unverified (Overture only, no census confirmation): not built |
| Advanced Plastic Surgery | Kifisias Ave 252A | Overture | - | 0.4, -205.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 252A) |
| Advanced Plastic Surgery | Leof. Kifisias 252A | Overture only (confidence 0.65) | - | -6.2, -204.2 |  | unverified (Overture only, no census confirmation): not built |
| Cosmetic Derma Medicine | Leof. Kifisias 252Α | Overture only (confidence 0.97) | - | -5.4, -200.0 |  | unverified (Overture only, no census confirmation): not built |
| Cosmetic Derma Midicine Medical Group | Kifisias Ave 252 | Foursquare OS Places | - | 1.6, -210.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 252) |
| ISO | Kifisias Ave 252 | Foursquare OS Places, vrisko.gr | - | 7.2, -182.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 252) |
| Marco Muré Dolci e Gelati | Kifisias Ave 252 | Foursquare OS Places, Overture, vrisko.gr | - | 1.2, -192.9 |  | removed (reported closed, census tier X) |
| PNN Nightwear | Kifisias Ave 252 | Overture | - | 1.1, -202.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 252) |
| PNN Nightwear | Leof. Kifisias 252 | Overture only (confidence 0.85) | - | -10.0, -199.9 |  | unverified (Overture only, no census confirmation): not built |
| Piraeus | Kifisias Ave 252 | OSM survey (n10095482759); also Foursquare OS Places, OSM, Overture, vrisko.gr | -2.3, -50.6 | -0.4, -50.3 | 0.0 | verified (OSM survey) |
| Serras Flowers | Kifisias Ave 252 | Overture, vrisko.gr | -1.3, -206.2 | -0.3, -208.9 | 0.0 | verified (two-source listing on its street) |
| Serras Flowers | Leof. Kifisias 252 | Overture only (confidence 0.94) | - | -14.8, -205.9 |  | unverified (Overture only, no census confirmation): not built |
| Live Love | Kifisias Ave 254 | Foursquare OS Places | - | -4.6, -211.9 |  | unverified (old/weak listing, census tier C): not built |
| RE/MAX Royal Selection | Kifisias Ave 254 | Overture | - | -4.9, -214.6 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 254) |
| RE/MAX Royal Selection | Leof. Kifisias 254 | Overture only (confidence 0.90) | - | -5.9, -214.3 |  | unverified (Overture only, no census confirmation): not built |
| Stones and Walls | Kifisias Ave 254 | Foursquare OS Places | - | -8.4, -229.6 |  | unverified (old/weak listing, census tier C): not built |
| Verona | Kifisias Ave 254 | OSM survey (n11069647962); also Foursquare OS Places, OSM, Overture, vrisko.gr | -8.3, -222.4 | -6.0, -222.9 | 0.0 | verified (OSM survey) |
| Πλαίσιο | Kifisias Ave 254 | OSM survey (w1073118248); also Foursquare OS Places, OSM, Overture, vrisko.gr | -39.4, -238.6 | -40.0, -228.1 | 0.0 | verified (OSM survey) |
| Φροντιστήριο Αξία | Kifisias Ave 254 | Overture | - | -6.6, -222.0 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 254) |
| Φροντιστήριο Αξία | Λεωφ. Κηφισίας 254 &, Othonos 90 | Overture only (confidence 0.90) | - | -9.3, -221.5 |  | unverified (Overture only, no census confirmation): not built |
| Aspis Real Estate | Kifisias Ave 269 | Foursquare OS Places | - | -130.5, 109.0 |  | unverified (old/weak listing, census tier C): not built |
| CANDIA | Kifisias Ave 269 | Overture | - | -128.0, 110.3 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 269) |
| CANDIA | Λεωφόρος Κηφισίας 269 | Overture only (confidence 0.95) | - | -126.7, 113.1 |  | unverified (Overture only, no census confirmation): not built |
| EFG Eurobank ergasias AE | Kifisias Ave 271 | OSM survey (n3865916893); also Foursquare OS Places, OSM, Overture, vrisko.gr | -111.5, 70.3 | -113.9, 68.3 | 0.0 | verified (OSM survey) |
| Δελβενακιώτης Αθανάσιος | Kifisias Ave 271 | Overture | -111.2, 69.7 | -113.9, 68.3 |  | verified (address = surveyed OSM number), door plate (upper floor / office) |
| Δελβενακιώτης Αθανάσιος | Leof. Kifisias 271 | Overture only (confidence 0.53) | - | -117.3, 68.2 |  | unverified (Overture only, no census confirmation): not built |
| Εθνική Τράπεζα | Kifisias Ave 273 | OSM survey (w262269079); also Foursquare OS Places, OSM, Overture, vrisko.gr | -35.3, -51.4 | -45.3, -62.4 | 4.1 | moved 4.1 m along the facade (crowded frontage; OSM survey) |
| Κατάστημα | Kifisias Ave 273 | Overture | - | -37.3, -49.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 273) |
| Bang & Olufsen | Kifisias Ave 279 | Foursquare OS Places, Overture | -10.0, -124.0 | -11.5, -124.0 | 0.0 | verified (two-source listing on its street) |
| Bang & Olufsen | Λεωφ. Κηφισίας 279 | Overture only (confidence 0.77) | - | -0.8, -124.7 |  | unverified (Overture only, no census confirmation): not built |
| Lifetime Kids Rooms | Kifisias Ave 279 | Overture | - | -11.6, -117.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 279) |
| Lifetime Kids Rooms | Leof. Kifisias 279 | Overture only (confidence 0.54) | - | -7.3, -117.4 |  | unverified (Overture only, no census confirmation): not built |
| Probank | Kifisias Ave 279 | Foursquare OS Places | - | -10.0, -128.0 |  | removed (reported closed, census tier X) |
| Zeus Factory | Kifisias Ave 279 | Foursquare OS Places | - | -10.1, -121.5 |  | unverified (old/weak listing, census tier C): not built |
| flat & heel | Kifisias Ave 279 | Foursquare OS Places | - | -11.6, -111.2 |  | unverified (old/weak listing, census tier C): not built |
| Labrini | Kifisias Ave 281 | OSM survey (n11069648334); also OSM, vrisko.gr | -11.7, -141.9 | -13.6, -141.7 | 0.0 | verified (OSM survey) |
| Nakas Concept | Kifisias Ave 281 | OSM survey (n11069636735); also Foursquare OS Places, OSM, Overture | -12.2, -147.9 | -13.8, -147.8 | 0.0 | verified (OSM survey) |
| iStorm | Kifisias Ave 281 | Foursquare OS Places, vrisko.gr | -11.4, -136.4 | -13.7, -144.7 | 6.0 | moved 6.0 m along the facade (crowded frontage; address = surveyed OSM number) |
| ΜΠΑΚΑΚΟΣ | Kifisias Ave 281 | vrisko.gr | -11.9, -144.9 | -13.7, -144.7 |  | verified (address = surveyed OSM number), name on the building directory board (frontage full) |
| Ωδείο Φίλιππος Νάκας | Kifisias Ave 281 | Foursquare OS Places, Overture | -11.9, -144.9 | -13.7, -144.7 |  | verified (address = surveyed OSM number), sign over the building entrance |
| Ωδείο Φίλιππος Νάκας Παράρτημα Κηφισιάς | Λεωφόρος Κηφισίας 281 | Overture only (confidence 0.75) | - | -26.4, -172.8 |  | unverified (Overture only, no census confirmation): not built |
| Mentererum | Kifisias Ave 283 | Foursquare OS Places, Overture | -18.9, -198.8 | -20.5, -199.0 | 0.0 | verified (two-source listing on its street) |
| Mentererum | Leof. Kifisias 283 | Overture only (confidence 0.93) | - | -34.4, -204.0 |  | unverified (Overture only, no census confirmation): not built |
| ΒΡΑΧΝΟΣ | Kifisias Ave 283 | Foursquare OS Places, Overture, vrisko.gr | -17.6, -193.4 | -19.1, -193.1 | 0.0 | verified (two-source listing on its street) |
| Διονυσος  -  Ομ. Πνευμ. Αθληματων | Λεωφόρος Κηφισίας 283 | Overture only (confidence 0.79) | - | -26.3, -193.1 |  | unverified (Overture only, no census confirmation): not built |
| Ζαχαροπλαστεία Κωνσταντινίδης | Kifisias Ave 283 | Foursquare OS Places, Overture, vrisko.gr | -11.5, -137.0 | -13.0, -137.0 |  | verified (two-source listing on its street), name on the building directory board (frontage full) |
| Ταχυδρομικο Ταμιευτηριο | Kifisias Ave 283 | Foursquare OS Places | - | -21.2, -201.1 |  | unverified (old/weak listing, census tier C): not built |
| Pagoni | Kifisias Ave 285 | Foursquare OS Places | - | -30.6, -238.1 |  | unverified (old/weak listing, census tier C): not built |
| Θ ΣΚΟΥΤΕΛΗΣ | Kifisias Ave 285 | vrisko.gr | - | -31.4, -238.2 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Κηφισίας 285) |
| Myeconspartners | Λεωφόρος Κηφισίας 299 | Overture only (confidence 0.77) | - | 41.5, 58.9 |  | unverified (Overture only, no census confirmation): not built |
| Studio Kosta Boda Illum Erythraia | Kifisias Ave 373 | Foursquare OS Places | - | 402.3, -6.2 |  | unverified (old/weak listing, census tier C): not built |
| 58η Ανθοκομική Έκθεση | Kifisias Ave  | Foursquare OS Places | - | -210.7, -23.3 |  | removed (reported closed, census tier X) |
| 64η Ανθοκομική Έκθεση | Kifisias Ave  | Foursquare OS Places | - | -329.5, -36.1 |  | removed (reported closed, census tier X) |
| ATE Bank | Kifisias Ave  | Foursquare OS Places | - | -4.3, -35.7 |  | removed (reported closed, census tier X) |
| Bacacos Nails | Kifisias Ave  | Foursquare OS Places | - | -21.6, -133.8 |  | unverified, not built: no house number |
| Bambineria | Kifisias Ave  | Foursquare OS Places | - | -6.9, -19.7 |  | unverified (old/weak listing, census tier C): not built |
| Euro Jet | Kifisias Ave  | Foursquare OS Places | - | -43.2, 22.8 |  | unverified (old/weak listing, census tier C): not built |
| Far East Pack | Kifisias Ave  | Foursquare OS Places | - | 2.9, -30.2 |  | removed (reported closed, census tier X) |
| Fubar | Kifisias Ave  | Foursquare OS Places | - | 5.7, -102.4 |  | removed (reported closed, census tier X) |
| House Of Chesterfields | Kifisias Ave  | Foursquare OS Places | - | -139.1, 106.7 |  | removed (reported closed, census tier X) |
| Maredo | Kifisias Ave  | Foursquare OS Places | - | -14.6, -14.6 |  | removed (reported closed, census tier X) |
| Marfin Egnatia Bank | Kifisias Ave  | Foursquare OS Places | - | 2.5, -53.5 |  | removed (reported closed, census tier X) |
| Maurizio | Kifisias Ave  | Foursquare OS Places | - | -17.4, -192.1 |  | unverified, not built: no house number |
| Millennium Bank | Kifisias Ave  | Foursquare OS Places | - | -41.8, 19.7 |  | removed (reported closed, census tier X) |
| Money Center | Kifisias Ave  | OSM survey (n4936855970); also Foursquare OS Places, OSM | -34.5, 14.2 | -34.3, 14.6 | 0.0 | verified (OSM survey) |
| Nike Store | Kifisias Ave  | Foursquare OS Places | - | 16.9, -18.1 |  | removed (reported closed, census tier X) |
| Prince Oliver | Λεωφόρος Κηφισίας και Παναγίτσας | Overture only (confidence 0.71) | - | 2.1, -84.8 |  | unverified (Overture only, no census confirmation): not built |
| ProtonBank | Kifisias Ave  | Foursquare OS Places | - | -34.6, -238.3 |  | removed (reported closed, census tier X) |
| Sebago | Kifisias Ave  | Foursquare OS Places | - | 6.2, -147.3 |  | unverified, not built: no house number |
| Seven Spot | Kifisias Ave  | Foursquare OS Places | - | -51.0, 58.5 |  | removed (reported closed, census tier X) |
| Sheraton Tel Aviv | Kifisias Ave  | Foursquare OS Places | - | -2.7, -18.3 |  | unverified (old/weak listing, census tier C): not built |
| Sunshine Solarium | Kifisias Ave  | Foursquare OS Places | - | 17.3, -19.2 |  | unverified (old/weak listing, census tier C): not built |
| Timberland | Kifisias Ave  | Foursquare OS Places | - | -85.8, 96.5 |  | removed (reported closed, census tier X) |
| Tramezzini | Kifisias Ave  | Foursquare OS Places | - | 26.3, -158.2 |  | unverified (old/weak listing, census tier C): not built |
| Video Club Blu | Kifisias Ave  | Foursquare OS Places | - | -45.4, 62.8 |  | unverified (old/weak listing, census tier C): not built |
| ponirakis | Kifisias Ave  | Foursquare OS Places | - | -11.4, -133.9 |  | unverified (old/weak listing, census tier C): not built |
| www.ngis.gr | Kifisias Ave  | Foursquare OS Places | - | -68.3, 84.4 |  | removed (reported closed, census tier X) |
| Ενεχυροδανειστήριο | Kifisias Ave  | Overture | - | -93.5, 109.3 |  | unverified, not built: no house number |
| Καθαριστηρια Σφαντος | Kifisias Ave  | Foursquare OS Places | - | -39.4, 14.6 |  | unverified (old/weak listing, census tier C): not built |
| Κομπολογαδικο | Kifisias Ave  | Foursquare OS Places | - | -83.6, 91.6 |  | unverified (old/weak listing, census tier C): not built |
| Λαμπρινη Shoes | Kifisias Ave  | Foursquare OS Places | - | -342.1, -111.1 |  | unverified (old/weak listing, census tier C): not built |
| Μπέκιος | Kifisias Ave  | Foursquare OS Places | - | -97.8, 120.9 |  | unverified (old/weak listing, census tier C): not built |
| Σχολές Οδηγών Στραβοπόδης Νίκος | Kifisias Ave  | Foursquare OS Places | - | -99.0, 125.3 |  | unverified (old/weak listing, census tier C): not built |
| νυχι νυχι | Kifisias Ave  | Foursquare OS Places | - | -75.5, 77.0 |  | unverified (old/weak listing, census tier C): not built |
| φωτοτυπικο | Kifisias Ave  | Foursquare OS Places | - | -114.9, 86.6 |  | unverified (old/weak listing, census tier C): not built |

### Platanos square (Πλατεία Πλατάνου) — 6 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Satgames Ηρακλειου | Platanos square  | Overture | - | -2.6, 6.2 |  | unverified, not built: no house number |
| kiosk | Platanos square  | OSM survey (n4656636026); also OSM | - | -90.7, 24.6 |  | verified (OSM survey), free-standing (standalone) |
| kiosk | Platanos square  | OSM survey (n4656636046); also OSM | - | -89.2, -1.5 |  | verified (OSM survey), free-standing (standalone) |
| Δροσια | Platanos square  | Foursquare OS Places | - | -26.0, -0.2 |  | unverified, not built: no house number |
| ΟΑΣΑ | Platanos square  | OSM survey (n4656636028); also OSM | - | -94.8, 44.0 |  | verified (OSM survey), free-standing (standalone) |
| Σημείο Δειγματοληψιών ΕΟΔΥ | Platanos square  | Foursquare OS Places | - | -79.3, -14.0 |  | unverified (old/weak listing, census tier C): not built |

### Othonos (Όθωνος) — 12 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Thalassa Fish And Grill | Othonos 10 | Overture | - | -45.6, -237.5 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Όθωνος 10) |
| Automelody | Othonos 72 | Foursquare OS Places | - | -325.1, -194.9 |  | unverified (old/weak listing, census tier C): not built |
| Εκπαιδευτικοσ Οργανισμοσ Καραρηγασ | Othonos 90 | Foursquare OS Places | - | -10.3, -236.0 |  | unverified (old/weak listing, census tier C): not built |
| GHP Hellas | Othonos 92 | Overture | - | 18.6, -232.4 |  | unverified (old/weak listing, census tier C): not built |
| GK Events | Othonos 92 | Overture | - | 30.6, -232.1 |  | unverified (old/weak listing, census tier C): not built |
| Α.Τ. | Othonos 94 | Overture | - | 51.7, -230.1 |  | unverified, not built: address not on surveyed numbering, not confirmed by two sources (Όθωνος 94) |
| Αστυνομικό Τμήμα Κηφησιάς | Othonos 94 | OSM survey (w668312309); also Foursquare OS Places, OSM | 59.0, -231.1 | 58.4, -222.7 |  | verified (OSM survey), sign over the building entrance |
| Goulandris Natural History Museum | Othonos 100 | Overture only (confidence 0.98) | - | 190.0, -196.2 |  | unverified (Overture only, no census confirmation): not built |
| Κέντρο ΓΑΙΑ - Μουσείο Γουλανδρή Φυσικής Ιστορίας | Othonos 100 | OSM survey (n11711407737); also Foursquare OS Places, OSM, Overture | 170.0, -220.3 | 163.2, -196.7 |  | verified (OSM survey), sign over the building entrance |
| The Guestbook | Othonos  | Foursquare OS Places | - | 15.7, -236.3 |  | unverified (old/weak listing, census tier C): not built |
| time of art | Othonos  | Foursquare OS Places | - | 11.7, -236.4 |  | unverified (old/weak listing, census tier C): not built |
| Αμφιθέατρο μουσείου Γουλανδρή | Othonos  | OSM survey (n13891427358); also OSM | 171.9, -219.8 | 166.3, -200.5 |  | verified (OSM survey), sign over the building entrance |

### Deligianni (Δηληγιάννη) — 3 entries

| name | street no. | address source | game x,z | real x,z | delta m | status |
|---|---|---|---|---|---|---|
| Pentelikon | Deligianni 66 | OSM survey (n3065370271); also Foursquare OS Places, OSM, Overture | 901.3, -257.7 | 900.7, -248.6 |  | verified (OSM survey), sign over the building entrance |
| barBar | Deligianni 66 | Foursquare OS Places | - | 918.9, -254.9 |  | unverified (old/weak listing, census tier C): not built |
| SAY Hotel | Deligianni 67 | OSM survey (w1001843964); also Foursquare OS Places, OSM, Overture, vrisko.gr | 738.0, -293.3 | 739.3, -307.5 |  | verified (OSM survey), sign over the building entrance |


## E. Street tables: game order next to OSM order (map v3.2)

Signs built by the game: **398** (by source: osm 262, census 133, address 3). OSM shop/amenity objects in the focus area: **303** (282 named).

| OSM shop -> game sign delta | all | named |
|---|---|---|
| <=2 m | 192 | 184 |
| 2-4 m | 12 | 12 |
| 4-10 m | 16 | 16 |
| >10 m | 8 | 7 |
| no sign: area | 2 | 2 |
| no sign: building | 7 | 5 |
| no sign: building (merged duplicate) | 2 | 2 |
| no sign: directory | 19 | 19 |
| no sign: plate | 29 | 26 |
| no sign: shop (merged duplicate) | 1 | 1 |
| no sign: standalone | 15 | 8 |

Signs on the wrong side of their street (vs the OSM point): **0**.

### Kassaveti (Κασσαβέτη)

Chainage m = position along the street (west->east); side = compass side. Game: 48 signs. Real (OSM-surveyed, named): 41.

**GAME (street order)**

| m | side | no. | sign | source | x | z | delta to OSM m |
|---|---|---|---|---|---|---|---|
| -213.2 | N | 1 | OJO Sunglasses | census | -44.7 | 34.9 |  |
| -208.6 | N | 1 | glamur | census | -40.5 | 36.8 |  |
| -203.3 | N | 1 | Bueno | osm | -35.6 | 39.0 | 0.3 |
| -198.0 | N | 1 | THIROS | census | -31.2 | 43.2 |  |
| -193.4 | N | 1 | Lilá | osm | -26.7 | 44.5 | 0.0 |
| -189.3 | N | 1 | Το Χωριάτικο | osm | -22.7 | 44.9 | 0.0 |
| -184.6 | N | 1 | Deli To Bacco | osm | -17.9 | 45.3 | 0.0 |
| -178.5 | N | 1 | Bottega Belleza | osm | -11.5 | 44.9 | 0.3 |
| -174.3 | N | 1 | TheFixers | osm | -7.3 | 45.3 |  |
| -172.8 | S | 18 | Fresco Gelateria | census | -12.4 | 71.2 |  |
| -169.8 | N | 1 | Swiss Corner | osm | -2.7 | 45.8 | 0.0 |
| -168.0 | S | 4 | The sweet spot | osm | -4.6 | 60.2 | 0.0 |
| -164.1 | S | 4 | Ζενίθ | osm | -0.7 | 60.6 |  |
| -160.8 | S | 4 | MrPhone.gr | osm | 2.7 | 61.0 | 0.0 |
| -157.9 | N | 3 | Wagamama | osm | 10.6 | 41.6 | 0.0 |
| -155.5 | S | 4 | L'Occitane | osm | 8.2 | 60.5 | 0.0 |
| -152.7 | N |  | Magnifique | osm | 15.9 | 41.9 | 0.0 |
| -152.4 | S | 4 | Triumph | osm | 11.4 | 60.8 | 0.0 |
| -149.2 | S |  | Χαντρόκοσμος | osm | 14.5 | 61.2 |  |
| -147.5 | N | 3 | SyWear | census | 21.2 | 42.1 |  |
| -146.1 | S | 4 | Bibi boutique | osm | 17.7 | 61.5 | 0.0 |
| -139.7 | S | 6 | Dust Cream | osm | 23.8 | 63.1 | 0.0 |
| -138.8 | N | 5 | Βάρσος | osm | 30.0 | 42.9 | 0.0 |
| -134.1 | S |  |  | osm | 29.5 | 63.7 | 0.0 |
| -130.7 | N | 7 | Holland Barrett | osm | 37.7 | 45.4 | 0.0 |
| -129.3 | S | 6 | Pisxos optics visionworks | census | 34.3 | 64.2 |  |
| -124.7 | N | 9 | Nova | osm | 43.7 | 46.0 | 0.0 |
| -121.7 | S | 6 |  | osm | 41.7 | 65.9 | 0.0 |
| -119.3 | N | 9 | Ancho | osm | 49.2 | 46.5 | 0.0 |
| -117.0 | S | 6 | Vodafone | osm | 46.4 | 66.4 | 0.0 |
| -112.2 | S |  | Πίσχος | osm | 51.3 | 67.0 | 0.0 |
| -112.1 | N | 9 | Το Καλαμάκι | osm | 56.5 | 47.3 | 0.0 |
| -106.7 | N |  | Nak | osm | 61.9 | 47.8 | 0.0 |
| -100.8 | N | 11 | Βενέτη | osm | 67.9 | 48.3 | 0.0 |
| -92.1 | N | 13 | MYTHOS plus | osm | 76.6 | 49.1 | 0.0 |
| -86.1 | N | 13 | UÉ | osm | 82.7 | 49.8 | 0.0 |
| -52.6 | S | 19 | La Queen | census | 110.8 | 75.0 |  |
| -49.2 | N | 2 | Desigual | osm | 118.4 | 58.9 | 2.1 |
| -47.1 | S | 10 | La Pasteria | osm | 115.9 | 76.8 | 0.0 |
| -39.4 | S | 12 | Manolea Gouskos Hairstylists | census | 123.3 | 79.3 |  |
| -22.1 | S | 12 | Recipe Bar | census | 140.5 | 82.0 |  |
| -19.8 | N | 19 | LOL the BRAND | census | 146.7 | 66.7 |  |
| -17.2 | S | 12 | Saitis Nektarios | osm | 145.1 | 83.4 | 0.0 |
| -8.7 | N | 19 | STARBUCKS COFFEE | address | 158.2 | 66.5 |  |
| 1.0 | N | 19 | Different Beast | osm | 168.2 | 66.7 | 0.0 |
| 11.6 | N | 19 | Da Vinci | census | 176.4 | 77.2 |  |
| 16.0 | N | 19 | Niki Kartsona The Stores | census | 180.6 | 78.7 |  |
| 21.3 | N | 19 | par'amour | census | 185.7 | 80.4 |  |

**REAL (OSM-surveyed points, street order)**

| m | side | no. | name | OSM | x | z | game delta m |
|---|---|---|---|---|---|---|---|
| -200.6 | N | 1 | Bueno | n10098103361 | -33.1 | 40.2 | 0.3 |
| -193.2 | N | 1 | Lilá | n10098116489 | -26.6 | 44.5 | 0.0 |
| -189.5 | N | 1 | Το Χωριάτικο | n10098129864 | -22.9 | 44.9 | 0.0 |
| -187.1 | S |  | Σφαντος | n10098100531 | -26.9 | 70.1 | 3.8 |
| -185.4 | S |  | Leonidas | n10098070077 | -28.8 | 84.3 | 0.0 |
| -185.0 | N | 1 | Deli To Bacco | n10098127030 | -18.3 | 45.3 | 0.0 |
| -184.9 | S |  | Xana | n10098090460 | -27.4 | 81.0 | 0.0 |
| -184.3 | S |  | La Vie En Rose | n10098089439 | -26.0 | 77.7 | 0.0 |
| -180.7 | N | 1 | Bottega Belleza | n10098118201 | -13.7 | 44.7 | 0.3 |
| -170.6 | N | 1 | Swiss Corner | n11069636734 | -3.5 | 45.7 | 0.0 |
| -166.3 | S |  | The sweet spot | n4721277584 | -2.9 | 60.4 | 0.0 |
| -161.1 | S |  | Healty Derma Clinics | n10098090458 | -3.9 | 85.1 | no sign: plate |
| -160.9 | S | 4 | MrPhone.gr | n10098110170 | 2.5 | 61.0 | 0.0 |
| -157.9 | N |  | Wagamama | n7040794587 | 10.6 | 41.7 | 0.0 |
| -156.0 | S |  | Medi Prinou | n10098119815 | 0.9 | 86.9 | no sign: plate |
| -155.5 | S |  | L'Occitane | n10098115328 | 8.2 | 60.5 | 0.0 |
| -152.7 | N |  | Magnifique | n9830492199 | 15.9 | 41.9 | 0.0 |
| -152.4 | S |  | Triumph | n10098070078 | 11.4 | 60.8 | 0.0 |
| -151.3 | S |  | Ana Adeco | n10098109193 | 5.3 | 88.6 | 0.0 |
| -146.2 | S |  | Bibi boutique | n10098109194 | 17.6 | 61.5 | 0.0 |
| -139.7 | S |  | Dust Cream | n10098067666 | 23.8 | 63.2 | 0.0 |
| -138.8 | N |  | Βάρσος | n4721277016 | 30.0 | 42.9 | 0.0 |
| -134.4 | S |  | Το Τέλειο | n10098070080 | 21.7 | 92.9 | no sign: plate |
| -130.7 | N |  | Holland Barrett | n12560123969 | 37.8 | 45.4 | 0.0 |
| -127.1 | S |  | Messagero | n10098118202 | 28.7 | 94.9 | no sign: plate |
| -124.7 | N |  | Nova | n7309463885 | 43.8 | 46.0 | 0.0 |
| -119.1 | N |  | Ancho | n10098118200 | 49.4 | 46.5 | 0.0 |
| -117.1 | S |  | Vodafone | n10098090459 | 46.4 | 66.4 | 0.0 |
| -112.0 | N |  | Το Καλαμάκι | n9830482970 | 56.5 | 47.3 | 0.0 |
| -111.9 | S |  | Πίσχος | n10098103378 | 51.6 | 67.0 | 0.0 |
| -106.7 | N |  | Nak | n4638357560 | 61.9 | 47.8 | 0.0 |
| -100.8 | N |  | Βενέτη | n12560123967 | 67.9 | 48.3 | 0.0 |
| -93.7 | N |  | Mythos plus | n10098110169 | 75.0 | 49.0 | 0.0 |
| -90.8 | N |  | Bufala Gelato | n7017421288 | 77.9 | 49.3 | no sign: directory |
| -86.9 | N |  | UÉ | n10207374863 | 81.9 | 49.7 | 0.0 |
| -80.9 | N |  | Goody's | n12560123968 | 88.1 | 49.2 | 0.0 |
| -52.5 | N |  | Desigual | n6291212722 | 115.8 | 56.0 | 2.1 |
| -47.2 | S |  | La Pasteria | n6291212004 | 115.9 | 76.8 | 0.0 |
| -23.4 | N | 17 | Χλόη | w590364078 | 143.3 | 65.5 | no sign: area |
| -17.3 | S |  | Saitis Nektarios | n6291212005 | 145.1 | 83.3 | 0.0 |
| 0.1 | N |  | Different Beast | n3781052994 | 167.4 | 66.4 | 0.0 |

### Levidou (Λεβίδου)

Chainage m = position along the street (north->south); side = compass side. Game: 32 signs. Real (OSM-surveyed, named): 21.

**GAME (street order)**

| m | side | no. | sign | source | x | z | delta to OSM m |
|---|---|---|---|---|---|---|---|
| 41.3 | E | 16 | Tommy Hilfiger | census | 219.1 | -135.9 |  |
| 56.3 | E | 16 | Geelist | osm | 208.8 | -124.3 | 0.3 |
| 60.6 | E | 9 | Vintage lovers | osm | 206.7 | -120.6 | 2.6 |
| 63.7 | W | 11 | Giacomo | osm | 185.3 | -128.8 | 0.0 |
| 65.1 | E | 16 | Andrea Kosta | census | 204.6 | -116.6 |  |
| 69.5 | W | 11 | Suba | census | 182.4 | -123.7 |  |
| 75.1 | W | 11 | Nespresso | osm | 179.7 | -118.8 | 0.0 |
| 83.3 | E | 16 | Mini & Mo | osm | 195.7 | -100.7 | 0.0 |
| 97.3 | W | 7 | Incrocio | osm | 166.6 | -100.7 | 0.0 |
| 113.1 | E | 14 | Λάσκαρη | osm | 181.2 | -74.7 | 0.0 |
| 116.3 | E | 14 | Pinko | osm | 180.0 | -71.8 | 2.2 |
| 119.4 | E | 1 | Medicosmetics | osm | 178.8 | -68.8 | 3.4 |
| 122.6 | E | 14 | Chance | osm | 177.6 | -65.9 | 4.5 |
| 125.7 | E | 1 | iFast repair | osm | 176.5 | -62.9 |  |
| 128.9 | E | 1 | Aladin | osm | 175.3 | -60.0 | 5.1 |
| 132.0 | E |  | Frattina | osm | 174.1 | -57.0 | 2.1 |
| 135.1 | E |  | Ελεάννα Ι. Ψαράκη | osm | 172.9 | -54.1 | 0.0 |
| 186.4 | W | 5 | Portobello's | osm | 127.3 | -20.6 | 3.6 |
| 201.5 | E | 8 | SEPHORA | address | 138.2 | 2.5 |  |
| 208.4 | E | 10 | Amos Café bistro | census | 138.3 | 10.4 |  |
| 213.4 | E | 10 | Mikel Coffee Company | census | 135.9 | 14.8 |  |
| 215.7 | W | 5 | Φαρμακείο Μαλιωτάκης | census | 113.2 | 5.1 |  |
| 231.5 | W | 5 | American Vintage | census | 105.5 | 18.9 |  |
| 232.9 | E | 4 | PAUL | osm | 124.6 | 30.9 | 0.0 |
| 239.0 | E | 2 | Imaginarium | census | 125.6 | 38.4 |  |
| 243.6 | W | 1 | Τυροκομείο Κωσταρέλου | census | 100.5 | 29.9 |  |
| 248.0 | W | 1Α | chillbox frozen yogurt | census | 98.5 | 33.8 |  |
| 248.1 | E | 7 | Γερμανός | osm | 115.8 | 43.4 | 0.0 |
| 252.8 | E | 2 | Carpo | osm | 113.7 | 47.6 | 1.6 |
| 253.8 | W | 1 | Kostarelos | census | 94.1 | 38.0 |  |
| 261.4 | W | 1 | Everest | osm | 90.5 | 44.7 | 0.0 |
| 265.8 | W | 1 | Goody's | osm | 88.4 | 48.7 | 0.0 |

**REAL (OSM-surveyed points, street order)**

| m | side | no. | name | OSM | x | z | game delta m |
|---|---|---|---|---|---|---|---|
| 55.5 | E |  | Vintage lovers | n10095522796 | 209.2 | -125.0 | 2.6 |
| 63.7 | W |  | Giacomo | n10095551693 | 185.3 | -128.8 | 0.0 |
| 70.2 | W | 11 | Πινακοθήκη Κουβουτσάκη | w383346455 | 163.6 | -133.2 | 0.0 |
| 75.1 | W |  | Nespresso | n10095551692 | 179.8 | -118.8 | 0.0 |
| 97.3 | W |  | Incrocio | n10095545290 | 166.8 | -100.6 | 0.0 |
| 99.2 | W |  | Ilias Lalaounis | n10095540755 | 158.5 | -102.9 | 0.0 |
| 100.3 | W |  | Molton Brown | n10095503364 | 154.0 | -104.1 | 0.0 |
| 112.6 | E |  | Λάσκαρη | n10095518171 | 181.4 | -75.2 | 0.0 |
| 119.9 | E |  | Pinko | n10095548122 | 178.6 | -68.3 | 2.2 |
| 122.1 | W | 12 | Μπομπονιέρα | w496476833 | 141.9 | -85.8 | no sign: area |
| 124.2 | E |  | Medicosmetics | n10095524643 | 177.0 | -64.4 | 3.4 |
| 128.4 | E |  | Chance | n10095545903 | 175.4 | -60.4 | 4.5 |
| 135.3 | E |  | Aladin | n10095429215 | 172.9 | -53.9 | 5.1 |
| 135.5 | E |  | Frattina | n10095543952 | 172.8 | -53.8 | 2.1 |
| 135.8 | E |  | Ελεάννα Ι. Ψαράκη | n10095488556 | 172.7 | -53.5 | 0.0 |
| 152.7 | E |  | Χάρις Καζάκος | w1077109788 | 168.7 | -36.5 | 0.0 |
| 184.2 | W |  | Portobello's | n10095536164 | 125.2 | -24.2 | 3.6 |
| 234.5 | E |  | Paul | n4565941901 | 123.8 | 32.3 | 0.0 |
| 247.5 | E |  | Γερμανός | n12560123971 | 116.1 | 42.9 | 0.0 |
| 255.5 | E |  | Carpo | n12560123970 | 113.7 | 50.7 | 1.6 |
| 262.0 | W |  | Everest | n6291212721 | 90.2 | 45.3 | 0.0 |

### Kyriazi (Κυριαζή)

Chainage m = position along the street (north->south); side = compass side. Game: 22 signs. Real (OSM-surveyed, named): 2.

**GAME (street order)**

| m | side | no. | sign | source | x | z | delta to OSM m |
|---|---|---|---|---|---|---|---|
| -143.4 | E | 40 | Flocafe Espresso Room | census | 101.1 | 80.2 |  |
| -138.1 | E | 40 | Giannetos | census | 99.8 | 85.3 |  |
| -124.3 | W | 2 | ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ | osm | 66.4 | 89.3 | 0.0 |
| -106.3 | E | 40 | Zara | census | 89.6 | 115.5 |  |
| -88.7 | E | 36 | Κωτσόβολος | osm | 84.0 | 132.1 | 0.0 |
| -83.4 | E | 36β | eyeQ | census | 82.8 | 137.4 |  |
| -77.7 | E | 36Α | ALE | census | 81.6 | 142.9 |  |
| -72.4 | E | 36B | Regalinas | census | 80.4 | 148.2 |  |
| -64.4 | E | 36 | Φαρμακείο Τσίτσου | census | 78.7 | 156.0 |  |
| -59.4 | E | 36 | Gap | census | 77.6 | 160.8 |  |
| -56.1 | W | 21 | Miss Simbolo | census | 57.9 | 158.1 |  |
| -53.4 | E | 36 A | Sugarfree Kifisia Store | census | 78.1 | 167.3 |  |
| -30.6 | E | 34 | HEEL | census | 73.7 | 189.8 |  |
| -12.9 | W | 21 | Detroit | census | 54.8 | 202.5 |  |
| -8.9 | E | 30 | Lynne | census | 67.3 | 210.6 |  |
| -2.6 | W | 15 | Vice Versa Studio | census | 52.7 | 212.7 |  |
| 1.4 | E | 30 | Petros Tasoulis Jewellery | census | 64.6 | 220.6 |  |
| 9.9 | E | 30 | Ariel Motor Greece | census | 62.5 | 228.8 |  |
| 29.0 | W |  | Kathy Heyndels | osm | 41.8 | 242.3 |  |
| 49.2 | W |  | Ιάσωνας και Αργοναύτες | osm | 35.8 | 261.6 |  |
| 53.9 | E | 24 | Dos Hermanos | osm | 39.4 | 267.6 |  |
| 70.6 | W | 9 | Norte Wine Bar | osm | 20.9 | 279.3 |  |

**REAL (OSM-surveyed points, street order)**

| m | side | no. | name | OSM | x | z | game delta m |
|---|---|---|---|---|---|---|---|
| -122.7 | W | 2 | ΑΒ Βασιλόπουλος | w668312663 | 65.6 | 90.7 | 0.0 |
| -88.7 | E |  | Κωτσόβολος | n13284916388 | 84.0 | 132.2 | 0.0 |

### Kolokotroni (Κολοκοτρώνη)

Chainage m = position along the street (west->east); side = compass side. Game: 57 signs. Real (OSM-surveyed, named): 69.

**GAME (street order)**

| m | side | no. | sign | source | x | z | delta to OSM m |
|---|---|---|---|---|---|---|---|
| -234.0 | S | 2 | Panaidis | osm | 154.6 | -16.8 | 4.4 |
| -228.6 | S |  | Anemos | osm | 160.5 | -16.1 | 0.0 |
| -223.9 | S | 2 | Γεωργαντάς | osm | 166.5 | -13.5 | 0.0 |
| -216.0 | S | 4 | Dovas | osm | 175.3 | -12.6 | 0.0 |
| -214.1 | S | 4 | Merlin | osm | 177.7 | -11.6 | 0.0 |
| -213.9 | N | 1 | Χάρις Καζάκος | osm | 168.7 | -36.5 | 0.0 |
| -212.1 | S | 4 | Oxford Company | osm | 180.1 | -10.6 | 1.4 |
| -206.8 | S | 6 | Max Mara | osm | 187.0 | -7.5 | 0.0 |
| -193.8 | S | 6 | Fogal | census | 203.9 | 1.0 |  |
| -182.0 | S | 8 | Nail'd it | osm | 221.9 | 15.5 | 11.1 |
| -180.9 | N | 1 | Miraya | census | 209.7 | -20.7 |  |
| -179.0 | S | 8 | Nike Store | census | 223.6 | 11.2 |  |
| -176.9 | N | 1 | Jasna Liverios Skin and Beauty Clinic | census | 214.7 | -18.7 |  |
| -176.2 | S | 8 | Folli Follie Store | census | 226.0 | 9.9 |  |
| -173.0 | N | 1 | Jege | osm | 219.6 | -16.7 | 9.1 |
| -172.9 | S | 8 | Zerar | osm | 230.1 | 11.4 | 0.0 |
| -169.8 | N | 3 | Lentros | osm | 223.6 | -15.2 | 1.1 |
| -168.3 | S | 8 | Salomon | osm | 235.8 | 13.7 | 0.0 |
| -166.0 | S |  | Glow | osm | 239.9 | 18.0 | 0.0 |
| -158.6 | N | 3 | Gregio | census | 237.7 | -9.3 |  |
| -155.1 | N | 3 | Pandora | osm | 242.1 | -7.3 | 0.0 |
| -149.6 | S |  | Intimissimi Uomo | osm | 258.8 | 21.9 | 0.3 |
| -147.4 | S |  | Sofia | osm | 261.6 | 23.0 | 6.8 |
| -145.1 | S | 1 | Season | osm | 264.4 | 24.1 | 5.5 |
| -142.9 | S | 10 | The Body Shop | osm | 267.2 | 25.1 | 8.2 |
| -141.2 | N | 3 | Anna Maria Mazaraki | osm | 259.1 | -1.6 | 0.0 |
| -140.7 | S | 10 | Zadig & Voltaire | osm | 270.0 | 26.2 | 11.0 |
| -136.6 | N | 3 | Hondos center | osm | 265.1 | 1.4 | 0.0 |
| -131.0 | S | 12 | Σακελλάρη | osm | 280.7 | 27.4 | 0.0 |
| -129.2 | N | 5 | MAX&Co. | osm | 274.0 | 4.0 | 0.0 |
| -128.4 | S | 12 | Sunlounge | osm | 284.0 | 28.8 | 0.3 |
| -125.8 | N | 5 | Regent Fair Hall | census | 278.1 | 5.3 |  |
| -125.2 | S | 12 | Papadiamantopoulos | osm | 287.9 | 30.2 | 0.0 |
| -117.6 | N | 5 | Hydé | osm | 283.3 | -4.2 | 0.3 |
| -113.9 | S | 14 | Bottega Veneta | osm | 300.5 | 31.8 | 0.0 |
| -113.0 | N | 5 | IQOS | osm | 293.0 | 8.9 | 0.0 |
| -109.9 | S | 14 | Brides | osm | 305.1 | 32.5 | 0.0 |
| -104.8 | S | 14 | Uptown | census | 310.8 | 33.2 |  |
| -93.5 | S | 3 | Marks & Spencer | osm | 326.3 | 42.6 | 4.1 |
| -89.0 | N | 7 | Marina Rinaldi | osm | 315.4 | 0.0 | 0.0 |
| -76.5 | N |  | ElenaMakri.com | osm | 329.6 | 2.6 | 0.3 |
| -73.7 | N |  | Li-La-Lo | osm | 332.9 | 3.1 | 3.2 |
| -70.8 | N | 7 | Papadopoulos | osm | 336.1 | 3.6 | 6.4 |
| -67.2 | N |  | Designer's Cat | osm | 341.4 | 7.5 | 0.0 |
| -50.6 | N | 9 | Michas | osm | 359.0 | 7.3 | 11.6 |
| -47.5 | N | 9 | Join clothes | osm | 362.4 | 7.6 | 0.1 |
| -28.3 | N |  | Incontri | osm | 381.1 | 2.6 | 0.2 |
| -18.5 | N | 9-11 | Hollywood Secrets | osm | 387.2 | -9.1 | 4.1 |
| -16.4 | N | 11 | BSB Fashion | osm | 392.1 | -1.6 | 1.5 |
| -13.2 | N | 11 | Nanoasia Greece | census | 395.4 | -2.1 |  |
| -10.0 | N | 11 | Iordanis | osm | 398.3 | -3.6 | 0.0 |
| -7.7 | N | 9 | Luisa | osm | 400.1 | -5.4 | 5.5 |
| 24.1 | S | 24 | Kaze Boutique | census | 438.2 | 6.1 |  |
| 166.8 | N | 21 | The Twenty one | osm | 544.0 | -119.2 | 0.0 |
| 169.5 | N | 21 | 21 Restaurant | census | 543.1 | -129.1 |  |
| 193.3 | S | 32 | Papaioannou | osm | 574.0 | -114.5 | 0.0 |
| 219.0 | S | 34 | Κλικ | census | 591.5 | -141.3 |  |

**REAL (OSM-surveyed points, street order)**

| m | side | no. | name | OSM | x | z | game delta m |
|---|---|---|---|---|---|---|---|
| -238.7 | S |  | Panaidis | n10095487363 | 150.7 | -13.4 | 4.4 |
| -228.6 | S |  | Anemos | n10095502122 | 160.5 | -16.1 | 0.0 |
| -223.9 | S |  | Γεωργαντάς | n10095544216 | 166.5 | -13.5 | 0.0 |
| -215.1 | S |  | Dovas | n10095502120 | 176.4 | -12.2 | 0.0 |
| -214.8 | S |  | Merlin | n10095543320 | 176.8 | -12.0 | 0.0 |
| -214.1 | S |  | Oxford Company | n10095540168 | 177.7 | -11.6 | 1.4 |
| -206.8 | S |  | Max Mara | n10095539629 | 187.0 | -7.5 | 0.0 |
| -204.7 | S |  | Nick Tailor | n10095521491 | 201.1 | 24.5 | no sign: plate |
| -198.9 | S |  | Αίγλη | w1076768347 | 204.3 | 16.4 | no sign: building |
| -190.6 | S |  | Nail'd it | n10095493614 | 217.5 | 28.3 | 11.1 |
| -186.2 | S | 8 | Αίγλη | w1077035729 | 219.9 | 22.1 | no sign: building (merged duplicate) |
| -183.0 | N |  | Karida 1912 | n9303522718 | 201.6 | -36.5 | no sign: directory |
| -183.0 | N |  | MAC Cosmetics | n10095527968 | 201.6 | -36.5 | no sign: directory |
| -183.0 | N |  | Wolford | n10095551755 | 201.6 | -36.5 | 0.3 |
| -183.0 | N |  | Kiosk | n10095511206 | 207.1 | -21.7 | no sign: standalone |
| -179.7 | N |  | Alpha Bank | n10095447769 | 205.8 | -34.8 | no sign: directory |
| -179.7 | N |  | Royal brows | n10095543954 | 205.8 | -34.8 | no sign: plate |
| -178.9 | N |  | Kartakis | n10095497079 | 212.2 | -19.7 | no sign: plate |
| -178.6 | N |  | GUK | n10095505760 | 212.6 | -19.5 | no sign: plate |
| -173.0 | S |  | Zerar | n10095493616 | 230.1 | 11.4 | 0.0 |
| -168.3 | S |  | Salomon | n10095524355 | 235.9 | 13.7 | 0.0 |
| -167.7 | N |  | Lentros | n10095501140 | 225.7 | -15.5 | 1.1 |
| -166.0 | S |  | Glow | n10095524603 | 239.9 | 18.0 | 0.0 |
| -162.9 | N |  | Jege | n10095524516 | 228.4 | -22.2 | 9.1 |
| -162.8 | N |  | G. Magginas | n10095526239 | 228.4 | -22.2 | no sign: plate |
| -154.9 | N | 1 | Shoppingland | w1077110413 | 238.9 | -16.6 | no sign: building |
| -154.8 | S |  | Sofia | n10095487343 | 255.2 | 26.8 | 6.8 |
| -154.5 | N |  | Pandora | n10095521488 | 242.9 | -7.0 | 0.0 |
| -154.1 | N |  | Alda | n10095501264 | 236.3 | -25.9 | 0.0 |
| -150.8 | S |  | Calzedonia | n10095519028 | 257.3 | 21.3 | no sign: directory |
| -150.8 | S |  | Intimissimi | n10095524453 | 257.3 | 21.3 | no sign: directory |
| -150.8 | S |  | Intimissimi | n10095537383 | 257.3 | 21.3 | 0.3 |
| -150.2 | S |  | Season | n10095519389 | 258.1 | 21.6 | 5.5 |
| -150.1 | S |  | The Body Shop | n10095521489 | 258.2 | 21.7 | 8.2 |
| -149.9 | S |  | Zadig & Voltaire | n10095503333 | 258.5 | 21.8 | 11.0 |
| -147.9 | S |  | Ιατρική Απεικόνηση | n10095524642 | 260.9 | 22.7 | no sign: plate |
| -147.5 | S |  | Solarium | n10095505759 | 261.4 | 22.9 | no sign: plate |
| -146.8 | N |  | Coco Chanel | n10095492350 | 243.8 | -26.6 | 0.0 |
| -141.2 | N |  | Anna Maria Mazaraki | n10095482758 | 259.2 | -1.6 | 0.0 |
| -135.5 | N |  | Hondos center | n10095491196 | 266.5 | 2.0 | 0.0 |
| -131.1 | S |  | Σακελλάρη | n10095498064 | 280.7 | 27.4 | 0.0 |
| -129.9 | S |  | Sunlounge | n10095526267 | 282.1 | 28.0 | 0.3 |
| -129.1 | N |  | MAX&Co. | n10095497106 | 274.0 | 4.0 | 0.0 |
| -127.5 | S |  | Aldipa | n10095479477 | 285.1 | 29.2 | no sign: plate |
| -125.2 | S |  | Papadiamantopoulos | n10095520702 | 287.9 | 30.3 | 0.0 |
| -116.3 | N |  | Hydé | n10095476290 | 284.8 | -3.8 | 0.3 |
| -115.5 | S |  | Barbour | n10095487250 | 298.9 | 31.9 | no sign: directory |
| -115.1 | S |  | Bottega Veneta | n10095487252 | 299.3 | 31.9 | 0.0 |
| -114.2 | S |  | Nail affair | n10095527969 | 307.3 | 51.0 | 0.0 |
| -113.0 | N |  | IQOS | n10095517248 | 293.0 | 8.9 | 0.0 |
| -109.9 | S |  | Brides | n10095504291 | 305.1 | 32.5 | 0.0 |
| -107.1 | S |  | New image | n10095509552 | 308.5 | 33.6 | 4.1 |
| -88.9 | N |  | Marina Rinaldi | n10095527967 | 315.5 | 0.0 | 0.0 |
| -87.0 | S |  | Marks & Spencer | w1077109265 | 331.5 | 37.9 | 4.1 |
| -77.8 | N |  | Li-La-Lo | n10095505756 | 328.2 | 2.3 | 3.2 |
| -77.7 | N |  | Papadopoulos | n10095540742 | 328.3 | 2.4 | 6.4 |
| -74.8 | N |  | Rovoliva Brokerage | n10095540327 | 331.6 | 2.9 | no sign: plate |
| -73.6 | N |  | Dimitriadis | n10095519386 | 332.9 | 3.1 | no sign: plate |
| -67.2 | N |  | Designer's Cat | n10095521571 | 341.4 | 7.5 | 0.0 |
| -66.8 | N |  | Cloud Nine | n10095491312 | 341.8 | 7.6 | no sign: plate |
| -63.2 | N |  | Michas | n10095524354 | 345.9 | 8.2 | 11.6 |
| -49.1 | N |  | Join clothes | n10095524358 | 360.6 | 7.5 | 0.1 |
| -49.0 | N |  | High | n10095520703 | 360.8 | 7.5 | no sign: plate |
| -46.6 | N |  | Στρογγυλός | n10095540166 | 352.6 | -21.5 | no sign: directory |
| -25.6 | N |  | Incontri | n10095520705 | 383.7 | 1.9 | 0.2 |
| -18.7 | N | 11 | BSB Fashion | n10095520243 | 389.5 | -2.1 | 1.5 |
| -10.9 | N |  | Iordanis | n10095487346 | 397.6 | -3.0 | 0.0 |
| 166.9 | N |  | The Twenty one | n10095519385 | 544.0 | -119.2 | 0.0 |
| 193.3 | S |  | Papaioannou | n10095520699 | 574.0 | -114.5 | 0.0 |

### Kifisias Ave (Κηφισίας)

Chainage m = position along the street (north->south); side = compass side. Game: 56 signs. Real (OSM-surveyed, named): 25.

**GAME (street order)**

| m | side | no. | sign | source | x | z | delta to OSM m |
|---|---|---|---|---|---|---|---|
| -260.7 | W | 289 | Tart sweet days | census | -38.6 | -264.7 |  |
| -234.9 | W | 254 | Πλαίσιο | osm | -39.4 | -238.6 | 10.1 |
| -224.8 | E | 254 | Verona | osm | -8.3 | -222.4 | 0.0 |
| -210.1 | E | 252 | Serras Flowers | census | -1.3 | -206.2 |  |
| -199.6 | W | 283 | Mentererum | census | -18.9 | -198.8 |  |
| -198.8 | E | 250-254 | Κωτσόβολος-Αττική | census | -0.6 | -194.5 |  |
| -194.5 | W | 283 | ΒΡΑΧΝΟΣ | census | -17.6 | -193.4 |  |
| -158.9 | E | 246Β | Filmstream | census | 5.6 | -152.7 |  |
| -150.9 | W | 281 | Nakas Concept | osm | -12.2 | -147.9 | 0.0 |
| -149.0 | E |  | Mon Trésor | osm | 9.5 | -141.8 | 0.0 |
| -148.5 | E | 1 | Ιωαννου Jewellery - Ιωαννου Γεωργιοσ | census | 14.6 | -140.4 |  |
| -145.0 | W | 281 | Labrini | osm | -11.7 | -141.9 | 0.0 |
| -139.7 | W | 281 | iStorm | census | -11.4 | -136.4 |  |
| -128.2 | E | 244 | ASICS | osm | 6.0 | -121.3 | 0.0 |
| -127.7 | W | 279 | Bang & Olufsen | census | -10.0 | -124.0 |  |
| -120.9 | E | 244 | Pastry Family | census | 5.9 | -113.9 |  |
| -115.6 | E | 242 | Prince Oliver | census | 5.8 | -108.6 |  |
| -110.4 | E | 242 | Fratelli Petridi | census | 5.7 | -103.3 |  |
| -100.9 | E | 242 | Medical Anti-aging Center | census | 6.4 | -93.5 |  |
| -92.1 | E | 242 | Optima | osm | 5.8 | -84.7 | 2.8 |
| -57.2 | E | 252 | Piraeus | osm | -2.3 | -50.6 | 0.0 |
| -51.7 | W | 273 | Εθνική Τράπεζα | osm | -35.3 | -51.4 | 0.3 |
| -49.6 | E | 238-240 | Hachiko | osm | -1.7 | -42.9 | 0.0 |
| -22.2 | E | 238-240 | KFC | address | -8.1 | -16.2 |  |
| -14.4 | E | 238 | Simply Burgers | census | -16.4 | -9.8 |  |
| -9.2 | E | 238-240 | Φώτο | census | -18.3 | -4.8 |  |
| -4.7 | E | 238-240 | Κέντρο Μελά | census | -19.9 | -0.6 |  |
| -0.6 | E | 236 | ΟΠΑΠ | osm | -28.5 | 2.0 | 0.0 |
| 3.5 | E | 236 | Πλάτανος | osm | -30.4 | 5.8 | 0.0 |
| 8.3 | E | 236 | Coffeeway bar | osm | -32.5 | 10.2 | 0.0 |
| 12.5 | E |  | Money Center | osm | -34.5 | 14.2 | 0.0 |
| 14.2 | E | 236 | Αρκαδιανός | census | -37.4 | 15.3 |  |
| 16.3 | E | 236 | Dromor Travel | census | -40.5 | 16.9 |  |
| 20.7 | E | 234 | Vivify - The Beauty Lab | census | -42.4 | 20.9 |  |
| 26.1 | E | 1 | CrediaBank | osm | -43.5 | 26.3 | 0.3 |
| 31.7 | E | 234 | RepairLogic | osm | -45.7 | 31.5 |  |
| 67.1 | E | 232 | Ματίνα Τσακίρη | osm | -63.2 | 64.3 | 0.8 |
| 69.5 | E | 232 |  | osm | -66.2 | 66.1 | 0.0 |
| 71.8 | E | 232 | IL Toto | osm | -69.1 | 67.9 | 0.0 |
| 82.1 | W | 271 | EFG Eurobank ergasias AE | osm | -111.5 | 70.3 | 0.0 |
| 83.1 | E | 230 | Inteliexpress | osm | -76.2 | 78.1 |  |
| 88.1 | E | 230 | Nobacco | osm | -78.9 | 82.7 | 0.0 |
| 96.1 | E | 230 | Western Union | census | -82.9 | 90.1 |  |
| 101.3 | E | 230 | ORAGOLD / Αγορά Χρυσού | census | -85.1 | 94.9 |  |
| 111.8 | E | 228 | iRepair | census | -88.7 | 104.9 |  |
| 112.5 | E | 228 | Fun Ocean Outdoors Ltd | census | -84.3 | 106.5 |  |
| 113.3 | E | 228 | Stones and Walls | census | -79.2 | 108.2 |  |
| 113.9 | E | 228 | Elite Style | census | -92.0 | 106.4 |  |
| 117.9 | E | 228 | Σχολή Χορού ''Δέσποινα Γρηγοριάδου '' / Grigoriadou Dance School | census | -93.8 | 110.2 |  |
| 122.0 | E | 228 | Μοκετινο | census | -95.4 | 114.0 |  |
| 127.5 | E | 228 | Αλιόνα Στράτουλατ | census | -97.3 | 119.3 |  |
| 135.9 | E | 228 | Βασίλης Ξυπολυτάς | census | -99.4 | 127.3 |  |
| 161.4 | W | 267 | Bostantzoglou Handmade Carpets | census | -132.7 | 147.0 |  |
| 166.6 | W | 267 | KEFI Tours & Conferences | census | -132.9 | 152.3 |  |
| 171.9 | W | 267 | Lestos Bikes | census | -133.1 | 157.6 |  |
| 193.6 | E | 222 | OPAP Play | census | -106.5 | 184.8 |  |

**REAL (OSM-surveyed points, street order)**

| m | side | no. | name | OSM | x | z | game delta m |
|---|---|---|---|---|---|---|---|
| -228.4 | W |  | Πλαίσιο | w1073118248 | -29.7 | -230.2 | 10.1 |
| -224.8 | E |  | Verona | n11069647962 | -8.3 | -222.4 | 0.0 |
| -172.5 | W |  | Koi | n7798253250 | -27.9 | -172.9 | 0.3 |
| -150.9 | W | 281 | Nakas Concept | n11069636735 | -12.2 | -147.9 | 0.0 |
| -149.1 | E |  | Mon Trésor | n10095523070 | 8.4 | -142.2 | 0.0 |
| -148.0 | E |  | Ioanna | n10095549041 | 20.8 | -138.7 | 0.0 |
| -147.5 | E |  | Marquise | n10095548439 | 27.4 | -136.9 | no sign: shop (merged duplicate) |
| -145.0 | W | 281 | Labrini | n11069648334 | -11.7 | -141.8 | 0.0 |
| -131.8 | E |  | Marquise | n10095518528 | 20.9 | -122.2 | 0.0 |
| -128.4 | E |  | Soho Soho | n10095530902 | 32.6 | -116.5 | 0.3 |
| -128.2 | E |  | ASICS | n10095501266 | 6.0 | -121.3 | 0.0 |
| -86.1 | E | 242 | Optima | n10095525694 | 8.2 | -78.1 | 2.8 |
| -57.4 | E |  | Piraeus | n10095482759 | -2.2 | -50.9 | 0.0 |
| -55.9 | W |  | Εθνική Τράπεζα | w262269079 | -34.2 | -55.4 | 0.3 |
| -24.1 | E |  | Slut Boardshop | n5979293375 | -7.5 | -18.0 | no sign: directory |
| -23.5 | E | 238-240 | Gordo | n13698583664 | -7.7 | -17.4 | no sign: directory |
| -1.9 | E |  | ΟΠΑΠ | n4936863007 | -27.9 | 0.8 | 0.0 |
| 3.1 | E |  | Πλάτανος | n4936862425 | -30.2 | 5.4 | 0.0 |
| 8.6 | E |  | Coffeeway bar | n4936860763 | -32.7 | 10.5 | 0.0 |
| 12.8 | E |  | Money Center | n4936855970 | -34.6 | 14.5 | 0.0 |
| 22.9 | E |  | HSBC | n4656636032 | -42.3 | 23.2 | 0.3 |
| 65.6 | E | 232 | Ματίνα Τσακίρη | n3269056761 | -61.2 | 63.1 | 0.8 |
| 71.9 | E | 232 | IL Toto | n5488581836 | -69.3 | 68.0 | 0.0 |
| 81.5 | W | 271 | EFG Eurobank ergasias AE | n3865916893 | -111.2 | 69.7 | 0.0 |
| 87.6 | E | 230 | Nobacco | n11069418194 | -78.6 | 82.1 | 0.0 |

### Platanos square (Πλατεία Πλατάνου)

Chainage m = position along the street (north->south); side = compass side. Game: 0 signs. Real (OSM-surveyed, named): 3.

**GAME (street order)**

| m | side | no. | sign | source | x | z | delta to OSM m |
|---|---|---|---|---|---|---|---|

**REAL (OSM-surveyed points, street order)**

| m | side | no. | name | OSM | x | z | game delta m |
|---|---|---|---|---|---|---|---|
| -60.5 | W |  | Κρέπες Κηφισιάς | n4937229373 | -60.6 | -54.3 | 7.5 |
| -21.3 | W |  | Το κουλούρι της Κηφισιάς | n5808889058 | -79.1 | -19.5 | no sign: standalone |
| 65.0 | W |  | ΟΑΣΑ | n4656636028 | -108.6 | 64.9 | no sign: standalone |

### Argyropoulou (Αργυροπούλου)

Chainage m = position along the street (west->east); side = compass side. Game: 46 signs. Real (OSM-surveyed, named): 65.

**GAME (street order)**

| m | side | no. | sign | source | x | z | delta to OSM m |
|---|---|---|---|---|---|---|---|
| -92.7 | S | 2 | ActEve | osm | 187.3 | -74.1 | 0.0 |
| -89.6 | N | 1-3 | Heaven on earth | osm | 195.3 | -91.2 | 0.0 |
| -87.6 | S | 2 | Lollipops & Rainbows | osm | 192.0 | -72.3 | 0.0 |
| -83.4 | S | 2 | Zic Zac | osm | 195.9 | -70.7 | 0.0 |
| -80.0 | S | 2 | BeSeen | osm | 199.1 | -69.5 | 1.2 |
| -79.7 | N | 1-3 | Artion | osm | 204.8 | -88.6 |  |
| -76.7 | S |  | Michalelis | osm | 202.2 | -68.2 | 3.1 |
| -73.4 | S | 2 | Permanent Beauty | osm | 205.2 | -67.0 | 4.4 |
| -73.4 | N | 3 | Cake | osm | 210.9 | -86.9 | 0.0 |
| -70.2 | S | 2 | Access Fashion | osm | 208.3 | -65.8 | 1.2 |
| -68.5 | N | 16 | Alpha Bank | osm | 217.7 | -93.0 | 0.0 |
| -68.2 | N | 3 | Portofino | osm | 215.9 | -85.6 | 0.0 |
| -66.9 | S |  | V&O | osm | 211.4 | -64.6 | 1.1 |
| -63.0 | N | 1 | Chariot | osm | 220.9 | -84.2 | 0.0 |
| -62.5 | S |  | Magnolia grace | osm | 215.4 | -63.0 | 29.7 |
| -57.0 | S | 2 | Orama | osm | 221.8 | -65.2 | 0.0 |
| -53.2 | S | 2 | Alouette | osm | 225.3 | -63.8 | 0.0 |
| -49.7 | S | 2 | Pet Vogue | osm | 228.6 | -62.5 | 1.5 |
| -47.3 | N | 1-3 | Arch fresh and healthy | osm | 236.2 | -80.5 | 0.0 |
| -46.3 | S |  | Jacksonkids.gr | osm | 231.8 | -61.3 | 20.1 |
| -42.7 | S | 2 | Sleeplux | osm | 235.2 | -60.0 | 0.0 |
| -39.3 | S |  | Celadon | osm | 238.4 | -58.7 | 16.9 |
| -36.0 | S | 2 | Sider | osm | 241.4 | -57.5 | 0.0 |
| -23.1 | S | 4 | GAP | census | 252.1 | -47.8 |  |
| -22.1 | S | 6 | Cosmos sport | osm | 254.5 | -52.5 | 0.0 |
| -7.2 | N | 7 | Double D | osm | 275.6 | -72.4 | 0.0 |
| -2.6 | N | 7 | Cafe I Frati | osm | 279.9 | -70.8 | 0.0 |
| 3.3 | S |  | Butlers | osm | 280.4 | -51.1 | 0.0 |
| 14.5 | S | 6 | J | osm | 291.3 | -48.2 | 0.0 |
| 15.5 | N |  | Ellika | osm | 296.3 | -62.2 | 0.0 |
| 24.9 | S | 8 | Αριστοκρατικόν | osm | 301.2 | -45.1 | 0.0 |
| 29.0 | S |  | Tricks & Treats | osm | 305.2 | -43.9 | 0.0 |
| 33.5 | S | 8 | Anatol | osm | 309.4 | -42.5 | 0.0 |
| 37.4 | S | 8 | Loco Loco | osm | 313.2 | -41.5 | 0.0 |
| 42.0 | S | 8 | Lampiris Interiors | osm | 317.6 | -40.2 | 0.0 |
| 57.1 | S | 10 | Kitabu | osm | 332.1 | -35.7 | 0.3 |
| 60.3 | S |  | Alessandra | osm | 335.2 | -35.2 | 3.4 |
| 63.4 | S | 12 | Kosta Boda | osm | 338.3 | -34.8 | 6.5 |
| 66.5 | S |  | One O One North | osm | 341.4 | -34.3 | 5.6 |
| 75.0 | S |  | Le shop | osm | 348.4 | -27.9 | 0.0 |
| 82.7 | S |  | ΑΑ Αφεντάκη | osm | 354.5 | -21.3 | 3.6 |
| 83.0 | N | 15 | Artflyer | census | 361.6 | -45.2 |  |
| 86.9 | S |  | L'art des bijoux | osm | 358.8 | -20.8 | 0.3 |
| 91.9 | S | 12 | Check me | osm | 364.2 | -21.6 | 0.0 |
| 111.0 | S | 14 | Vagenas | osm | 384.0 | -21.2 | 0.0 |
| 124.4 | S | 11 | Παρουσίαση | osm | 396.8 | -17.4 | 0.0 |

**REAL (OSM-surveyed points, street order)**

| m | side | no. | name | OSM | x | z | game delta m |
|---|---|---|---|---|---|---|---|
| -92.7 | S |  | ActEve | n10095458969 | 187.3 | -74.1 | 0.0 |
| -91.3 | N |  | Mini & Mo | n10095543953 | 196.8 | -102.8 | 0.0 |
| -89.6 | N |  | Heaven on earth | n10095540743 | 195.3 | -91.2 | 0.0 |
| -87.3 | S |  | Lollipops & Rainbows | n10095542848 | 192.3 | -72.1 | 0.0 |
| -82.4 | S |  | Zic Zac | n10095537397 | 196.8 | -70.4 | 0.0 |
| -77.4 | S |  | Viki Kremer | n10095527973 | 201.5 | -68.5 | no sign: plate |
| -77.3 | S |  | BeSeen | n10095520244 | 201.6 | -68.5 | 1.2 |
| -73.2 | N |  | Cake | n10095491311 | 211.1 | -86.9 | 0.0 |
| -72.1 | S |  | Michalelis | n10095545895 | 206.5 | -66.5 | 3.1 |
| -68.7 | S |  | Nailed it | n10095479945 | 201.6 | -36.5 | no sign: directory |
| -68.7 | S |  | Tan beautiful | n10095505708 | 201.6 | -36.5 | no sign: directory |
| -68.2 | N |  | Portofino | n10095547450 | 215.9 | -85.6 | 0.0 |
| -67.5 | S |  | Permanent Beauty | n10095541240 | 210.8 | -64.8 | 4.4 |
| -67.5 | S |  | Access Fashion | n10095484309 | 210.8 | -64.8 | 1.2 |
| -66.7 | S |  | Magnolia grace | n10095526273 | 203.4 | -35.8 | 29.7 |
| -65.1 | N |  | Alpha Bank | w1077416585 | 220.9 | -92.1 | 0.0 |
| -64.3 | S |  | V&O | n10095501211 | 213.8 | -63.6 | 1.1 |
| -64.2 | S | 1 | Φοίνικας | w761788138 | 205.8 | -34.8 | no sign: building |
| -63.2 | N |  | Chariot | n10095519029 | 220.7 | -84.2 | 0.0 |
| -59.6 | S |  | Κ. Μοιραγιας | n10095503366 | 218.2 | -61.9 | no sign: plate |
| -59.6 | S |  | Stavrou | n10095540317 | 218.2 | -61.9 | no sign: directory |
| -59.6 | S |  | Watchlab | n10095551417 | 218.2 | -61.9 | no sign: plate |
| -58.2 | S |  | Orama | n10095545902 | 220.7 | -65.7 | 0.0 |
| -52.5 | S |  | Alouette | n10095429216 | 226.0 | -63.6 | 0.0 |
| -52.4 | S |  | Brumel | n10095523836 | 226.2 | -63.5 | no sign: plate |
| -48.8 | S |  | Swiss line | n10095479946 | 229.5 | -62.2 | no sign: plate |
| -46.7 | S |  | Pet Vogue | n10095550122 | 231.5 | -61.4 | 1.5 |
| -46.5 | N |  | Arch fresh and healthy | n10095477055 | 236.9 | -80.3 | 0.0 |
| -46.3 | N |  | Ama lounge | n10095477054 | 237.2 | -80.2 | no sign: directory |
| -46.0 | N |  | Emmy Monaco | n10095542367 | 237.4 | -80.2 | no sign: directory |
| -45.9 | N |  | Blanc | n10095484311 | 237.6 | -80.1 | no sign: directory |
| -42.0 | S |  | Μιμή Σιακάρα | n10095544928 | 235.8 | -59.7 | no sign: plate |
| -41.4 | S |  | Sleeplux | n10095548721 | 236.4 | -59.5 | 0.0 |
| -36.0 | S |  | Jacksonkids.gr | n10095526506 | 236.7 | -40.8 | 20.1 |
| -36.0 | S |  | Celadon | n10095523837 | 237.0 | -41.4 | 16.9 |
| -35.8 | S |  | Sider | n10095518170 | 241.6 | -57.4 | 0.0 |
| -31.8 | S |  | Petit Moi | n10095527970 | 245.4 | -55.8 | no sign: standalone |
| -29.6 | S |  | Chiara | n10095509355 | 242.9 | -39.1 | 0.0 |
| -21.9 | S |  | Cosmos sport | n10095505757 | 254.9 | -53.3 | 0.0 |
| -7.2 | N |  | Double D | n10095498066 | 275.6 | -72.4 | 0.0 |
| -3.4 | N |  | Cafe I Frati | n10095518651 | 279.2 | -71.1 | 0.0 |
| 1.1 | S |  | Butlers | n10095465764 | 278.4 | -51.6 | 0.0 |
| 14.5 | S |  | J | n10095524360 | 291.3 | -48.2 | 0.0 |
| 15.6 | N |  | Ellika | n10095493613 | 296.4 | -62.2 | 0.0 |
| 23.8 | S |  | Αριστοκρατικόν | n10095541239 | 300.3 | -45.6 | 0.0 |
| 28.5 | S |  | Tricks & Treats | n10095487347 | 304.7 | -44.2 | 0.0 |
| 33.2 | S |  | Anatol | n10095519023 | 309.2 | -42.6 | 0.0 |
| 37.3 | S |  | Loco Loco | n10095520704 | 313.1 | -41.6 | 0.0 |
| 41.6 | S |  | Lampiris Interiors | n10095540165 | 317.3 | -40.4 | 0.0 |
| 53.4 | S |  | As You Plan | n10095491307 | 328.5 | -37.0 | no sign: plate |
| 55.4 | S |  | Alessandra | n10095500863 | 330.4 | -36.0 | 3.4 |
| 55.4 | S |  | Kitabu | n10095524359 | 330.4 | -36.0 | 0.3 |
| 55.4 | S | 7 | Φοίνικες | w1077112776 | 330.4 | -36.0 | no sign: building |
| 55.5 | S |  | Kosta Boda | n10095542847 | 330.5 | -36.0 | 6.5 |
| 59.6 | S |  | One O One North | n10095537395 | 334.5 | -35.4 | 5.6 |
| 63.5 | S |  | ElenaMakri.com | n10095517250 | 327.9 | 2.3 | 0.3 |
| 75.6 | S |  | Le shop | n10095540318 | 349.1 | -27.9 | 0.0 |
| 78.4 | S |  | Chrono Technica | n10095479944 | 350.3 | -21.8 | no sign: plate |
| 88.7 | S |  | L'art des bijoux | n10095518166 | 360.6 | -20.6 | 0.3 |
| 88.7 | S |  | ΑΑ Αφεντάκη | n10095542846 | 360.6 | -20.6 | 3.6 |
| 92.0 | S |  | Check me | n10095521490 | 364.3 | -21.6 | 0.0 |
| 113.1 | S |  | Vagenas | n10095518167 | 386.0 | -20.7 | 0.0 |
| 115.4 | S |  | Hollywood Secrets | n10095524454 | 386.3 | -13.3 | 4.1 |
| 124.4 | S | 11 | Παρουσίαση | n13437464039 | 396.8 | -17.4 | 0.0 |
| 132.3 | S |  | Luisa | n10095501156 | 403.2 | -10.8 | 5.5 |

### OSM shops whose game sign is more than 4 m from the real facade point

| OSM | name | street | delta m | real facade x,z | game sign x,z |
|---|---|---|---|---|---|
| n10095526273 | Magnolia grace | Argyropoulou | 29.7 | 203.4, -35.8 | 215.4, -63.0 |
| n5488608429 |  |  | 20.2 | -342.6, -123.2 | -362.6, -116.2 |
| n10095526506 | Jacksonkids.gr | Argyropoulou | 20.1 | 236.7, -40.8 | 231.8, -61.3 |
| n10095523837 | Celadon | Argyropoulou | 16.9 | 237.0, -41.4 | 238.4, -58.7 |
| n10095524354 | Michas | Kolokotroni | 11.6 | 345.9, 8.2 | 359.0, 7.3 |
| n10095493614 | Nail'd it | Kolokotroni | 11.1 | 217.5, 28.3 | 221.9, 15.5 |
| n10095503333 | Zadig & Voltaire | Kolokotroni | 11.0 | 258.5, 21.8 | 270.0, 26.2 |
| w1073118248 | Πλαίσιο | Kifisias Ave | 10.1 | -29.7, -230.2 | -39.4, -238.6 |
| n10095524516 | Jege | Kolokotroni | 9.1 | 228.4, -22.2 | 219.6, -16.7 |
| n10095521489 | The Body Shop | Kolokotroni | 8.2 | 258.2, 21.7 | 267.2, 25.1 |
| n4937229373 | Κρέπες Κηφισιάς | Platanos square | 7.5 | -60.6, -54.3 | -59.9, -63.8 |
| n10095487343 | Sofia | Kolokotroni | 6.8 | 255.2, 26.8 | 261.6, 23.0 |
| n10095542847 | Kosta Boda | Argyropoulou | 6.5 | 330.5, -36.0 | 338.3, -34.8 |
| n10095540742 | Papadopoulos | Kolokotroni | 6.4 | 328.3, 2.4 | 336.1, 3.6 |
| n10095537395 | One O One North | Argyropoulou | 5.6 | 334.5, -35.4 | 341.4, -34.3 |
| n10095519389 | Season | Kolokotroni | 5.5 | 258.1, 21.6 | 264.4, 24.1 |
| n10095501156 | Luisa | Argyropoulou | 5.5 | 403.2, -10.8 | 400.1, -5.4 |
| n10095429215 | Aladin | Levidou | 5.1 | 172.9, -53.9 | 175.3, -60.0 |
| n10095545903 | Chance | Levidou | 4.5 | 175.4, -60.4 | 177.6, -65.9 |
| n10095541240 | Permanent Beauty | Argyropoulou | 4.4 | 210.8, -64.8 | 205.2, -67.0 |
| n10095487363 | Panaidis | Kolokotroni | 4.4 | 150.7, -13.4 | 154.6, -16.8 |
| w1077109265 | Marks & Spencer | Kolokotroni | 4.1 | 331.5, 37.9 | 326.3, 42.6 |
| n10095509552 | New image | Kolokotroni | 4.1 | 308.5, 33.6 | 311.9, 36.6 |
| n10095524454 | Hollywood Secrets | Argyropoulou | 4.1 | 386.3, -13.3 | 387.2, -9.1 |
