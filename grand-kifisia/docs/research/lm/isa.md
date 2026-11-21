# ISA — International School of Athens campus (lm-isa)

Artemidos 42 & Xenias, Kefalari, Kifisia. Implementation: `gk3/js/89e_lm_isa.js`. Owner of this doc: lm-isa.

## Sources (what each fact comes from)
| fact | source | confidence |
|---|---|---|
| Campus outline (ISA ground) 4 pts, 92.8 x 42.4 m | OSM way 1086751865 (`MAP.isa.poly`) | survey |
| Main building footprint 51.4 m (Artemidos side) x up to 33.7 m, 10 pts | OSM way 1086751869 (`MAP.buildings[752]`, buildings_spec `w1086751869`) | survey |
| Multi-sport court 32.3 x 18.6 m, angle 1.686 | OSM way 1086751866 (`MAP.pitches`, sport=multi) | survey |
| 5-a-side pitch 31.5 x 16.2 m, angle 1.701 | OSM way 1086751867 (sport=soccer) | survey |
| Gate nodes | OSM nodes 9957387837 / 9957387838 (on the outline) | survey |
| West facade (Artemidos): bays, storeys, arches, balconies, tympanum, roof, colours, street fence, gate, pines | `docs/research/img/lm/isa/isa_west_facade_REFONLY.png` (photo of the facade from across Artemidos, c. 2019; downloaded by the previous lm-isa session, exact page URL not recorded; reference only, never shipped) | photo |
| Courts: green windscreen on the mesh fences, red/white striped goals, artificial turf, outdoor basketball with glass boards | `isa_site_photos_courts_REFONLY.jpg` (contact sheet of the school's own public photos, isa.edu.gr; reference only) | photo |
| History: former hotel (rough-stone 1928 postcard), now rendered cream | `isa_hotel_1928_REFONLY.png` (elia.org.gr postcard, reference only), docs/research/PLACES.md | photo / text |
| "historic neoclassical four-storey former hotel", ~6,000 m2, courts for basketball/volleyball/handball/mini-soccer | isa.edu.gr campuses + athletics pages, english-schools.org (via PLACES.md) | official |

Orientation check: z grows to the SOUTH, so the courts (z ≈ -452) lie NORTH of the building (z -385..-439) and Xenias runs along the SOUTH
side (z ≈ -376..-380). Artemidos runs N–S along the WEST side; the photo looks east at the west front, north is on the left.

## Main building (modelled)
- Historic block 36.6 m long x 16 m deep at the NORTH end of the 51.4 m Artemidos front; the remaining ~14.8 m to the south is a lower wing
  whose roof is a terrace at ground-floor level (seen on the right of the photo: railing, air-conditioners, terrace continuing).
- Levels: raised lower-ground floor (semi-basement windows behind the street fence), ground floor GF = street + 2.9 m, floors at GF+4.4,
  GF+8.1, GF+11.8; eaves cornice at GF+12.6 (≈ 15.5 m above the pavement; buildings_spec says 16 m). Door ≈ 2.1 m and the arched
  French doors ≈ 3.6–3.9 m tall were used as scale in the photo.
- Symmetric west front, 5 sections (from north, block coordinates in m): end bay 0–5.1 (projects 0 / others recessed 0.3), 3-window
  section 5.1–15.0 (axes 7.05, 11.25, 13.7), centre bay 15.0–21.6 (axis 18.3), 3-window section 21.6–31.5 (axes 22.9, 25.35, 29.55),
  end bay 31.5–36.6.
  - Ground floor: horizontally rusticated render (grooves every 0.45 m), arched French doors (end bays 2.5 m wide, normal 1.3 m,
    centre entrance 2.1 m), heavy string course on top.
  - 1st and 2nd floors: tall rectangular French windows 1.15 x 2.55 m with small black iron balconies (1.7 m wide, 0.5 m deep);
    end and centre bays get wide balconies with white plaster posts and iron panels (4.5 m / 6.0 m wide, 0.85 m deep);
    centre bay 1st floor: triple window (1.45 m + two 0.85 m), 2nd floor: single window with two blind panels.
  - Frieze band with small round rosettes under the cornice, continuous white eaves cornice.
- Roof: hipped, Byzantine clay tiles, pitch 23°, 0.5 m overhang; centre: semicircular tympanum (segmental arched parapet with a
  moulded arch band) between two square pylons, raised cross roof behind it; north end: flat-topped attic box over the end bay (photo).
- Greek flag on the centre 1st-floor balcony (photo).
- North and south end walls: same storey rhythm, 3 axes each (inferred: no photo shows them).
- Rear school wing: the rest of the OSM footprint behind the historic block, two storeys over the lower ground, flat roof (INFERRED).
- Colours sampled from the photo: wall #efe8d2, shaded wall #e6dec6, trim #fbf9f3, ground-floor render #ebe3cb, roof tiles #d6a58e (tinted
  photographic tiles), iron #2b2c2e.

## Grounds (modelled)
- Veranda/terrace along the west front at GF level with a black iron railing; lower-ground windows below it; stair down to the court platform
  at the north end.
- Street fence along Artemidos/Xenias: rubble-stone base 0.75 m with a marble coping, steel bar fence 1.85 m above it, cream plaster piers;
  gate with two cream piers with lamps, grey steel bar leaves, plain-text plaque "INTERNATIONAL SCHOOL OF ATHENS" (exact plaque not documented).
  Gate position: on the Artemidos front at block coordinate 27.2 m (photo: right of centre); `MAP.isa.gate` is moved onto the pavement in
  front of it (the original junction point is kept in `MAP.isa.gate0`).
- Court platform: flat terrace at the highest terrain level under the courts (retaining concrete walls on the street sides).
- Multi-sport court (OSM 1086751866): green acrylic run-off, red 26 x 14 m court with FIBA lines (centre circle 1.8 m, keys 4.9 m, free-throw
  circles, 6.75 m three-point arc with the corner lines), two hoops (post 1 m behind the end line, glass board 1.8 x 1.05 m, rim at 3.05 m, net),
  red/white handball goals on the end lines. The hoops go into `HOOPS` with `isa:true` for the "After Hours at ISA" mission.
- 5-a-side pitch (OSM 1086751867): artificial turf, white lines, red/white goals with nets.
- Court fences: 4 m green mesh with dark green windscreen fabric on the lower 2.2 m (photos); floodlight masts at the platform corners.
- Trees: none on the courts; the street trees in front of the facade become Aleppo pines (photo).

## Not documented / inferred
- North (court-side), south and east sides: no photo — modelled with the same rhythm as the west front, plainer.
- Rear wing height and windows, interior: inferred.
- Exact gate design and plaque text: inferred from the visible gate in the photo (grey bars between cream piers).
