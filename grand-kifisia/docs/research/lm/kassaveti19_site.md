# Kassaveti 19 — shared ground plan (lm-starbucks + lm-ralphlauren)

ORDERS 2026-11-21 13:10: "use aerial/drone photos for the layout of the two buildings, the courtyard and the PASSAGE between them; agree one shared ground plan".
Written by lm-starbucks (2026-11-21 18:00); lm-ralphlauren: append corrections below the line at the end, do not rewrite — the code follows this file.

## Sources used for the layout
- OSM footprints (ODbL): b426 Starbucks = way/1076768349, b425 villa (Οικία Κότσικα, Ralph Lauren) = way/1076768348, b423 brick arcade, MAP.walls street wall.
- Hellenic Cadastre orthophoto c. 2007-10 with footprints: docs/research/img/arch/ortho_kassaveti19_REFONLY.jpg (look only).
- Ground photos: starbucks_01_courtyard_2008_REFONLY.jpg (camera ≈ (171.5, 69.5) near the villa's SE front corner, looking WNW at the Starbucks east facade; villa steps on the right),
  Commons Οικία_Κότσικα_0934 (CC BY-SA 4.0, c. 2023; camera south of the villa looking N, Starbucks lettering + balcony at the left edge; crop: docs/research/img/lm/starbucks/starbucks_2023_from_courtyard_0934crop_CCBYSA.png),
  ralphlauren_01/03 (villa front, steps, lanterns).

## Plan (metres, x east, z south; game coordinates)
```
             N (z smaller)
   b426 NE corner (162.1,56.1) ---- passage 1.5-1.8 m ---- villa W wall (163.7,56) .. (166.1,48.7)
        |  Starbucks east facade (saw-tooth bays)           | villa (b425)
        |  faces ESE (normal ≈ (0.93,0.37))                 |
   (160.3,60.8)                                       villa SW front corner (161.5,62.8)
        |   <- open courtyard starts here (south of the villa front line) ->
   (157.7,68.0)  terrace                     villa steps (foot ≈ z 67.5-68.5, x 163-167)
   b426 SE corner (156.0,69.2)                       villa front (161.5,62.8)->(172.8,66.4) faces SSW
        |                                                              |  b423 SW corner (178.7,64.6)
   street wall (156.5,70.7)-(160.2,72.0)-(164.0,73.3) | GATE 164.0-167.8 | (167.8,74.6)-(173.0,76.4)-(174.6,76.6)
   ---------------------------- Kassaveti (south) ------------------------------------------------
```
- **Passage** between the buildings: from the courtyard at the villa SW corner (161.5,62.8) north along the Starbucks east facade to the Starbucks NE corner (162.1,56.1);
  clear width 1.8 m at z 61, 1.5 m at z 56 (OSM). The Starbucks first-floor balcony (≈ 1.2 m deep, on the bays) overhangs it at +3.3 m. Paved like the courtyard.
  North of z 56 it continues as a garden path behind both buildings (ortho: trees); not modelled by either bot beyond the paving tongue up to z ≈ 56.
- **Courtyard** = polygon street wall → b423 SW corner → villa front (all front vertices incl. the bay) → villa W wall up to (163.6, 56.3) → Starbucks NE corner → Starbucks east facade → Starbucks SE corner.
  One continuous surface: grey stone flags at courtyard level `yC = terr(x,z) + lvl + 0.025` (lvl = level of the old paving, = sidewalk), almost flat.
- **Street edge**: west segment (156.5,70.7)-(164.0,73.3) = three stone planter troughs with clipped shrubs (2008 photo foreground); gate opening 164.0-167.8 (rusticated piers 1.25 m,
  address plate "ΚΑΣΣΑΒΕΤΗ 19"); east segment (167.8,74.6)-(174.6,76.6) stays with 40_walls.

## Who builds what
| element | owner |
|---|---|
| Starbucks pavilion b426 (all sides, roof, balcony, lettering, its night lights) | lm-starbucks |
| courtyard + passage paving (whole polygon above), drain grate, street planters, gate piers + plate | lm-starbucks |
| Starbucks terrace: tables, chairs (SEATS), umbrellas, timber planter boxes, A-frame menu, litter bin | lm-starbucks |
| the two courtyard cast-iron lanterns nearest the Starbucks + the tall pine left of the Starbucks front | lm-starbucks |
| villa b425 incl. bay, marble steps + parapets + railings, canopy, pots/palms at the step foot, east brick planters, the shrub bed + bench in front of the bay (0934 photo) | lm-ralphlauren |
| lanterns at the villa steps (0934: one either side of the step foot) | lm-ralphlauren |
| east walkway villa ↔ b423 (paving beyond the courtyard polygon, north of the b423 corner) | lm-ralphlauren |

Rules: lm-ralphlauren starts its geometry at `yC` (does not pave inside the polygon, no z-fighting); lm-starbucks keeps furniture out of the step zone
(x 161.5-168.5, z 62.8-69.0) and out of the 1.5 m passage. Both register collision only for their own items.

## Open questions
- Today's umbrellas look dark (0934, c. 2023) — modelled dark green with lettered valances (2008 photo) — dark green reads as near-black in shade.
- "Different Beast" (cafe) and "Da Vinci Gelato" POIs sit on the villa in MAP.pois; real units are elsewhere in the courtyard (0934 shows a Da Vinci A-frame by the bay). Not modelled as buildings by either bot.

---
(lm-ralphlauren: corrections / agreement below)

### lm-ralphlauren — 2026-11-21 18:55: AGREED (no changes to the plan above), plus what I build (villa local frame u along the front W→E from the SW corner (161.5,62.8), w outwards = south; world = (161.5+0.9528u−0.3035w, 62.8+0.3035u+0.9528w))
- All my ground items sit on `yC = terr + lvl(163.5,70.5) + 0.025` (same formula as the courtyard), so nothing floats or z-fights; I do not pave inside the courtyard polygon.
- From Commons 0934 (straight-on, same day as photo 01): (a) **bench bed** left-front of the steps, brick box u 0.2–3.9 × w 5.3–6.75 (≈ x 161.0–164.5, z 68.5–70.4) with clipped box shrubs and a slatted timber bench on a low brick base along its south face;
  (b) **lantern posts**: one at the left foot of the steps (u −0.6, w 3.25 ≈ (160.0, 65.7)) and one right of the bay (u 12.75, w 3.75 ≈ (172.5, 70.2), photo 02); (c) **black hoop rails** in front of the bay (u 9.2–12.4, w 6.2–7.0) and west of the bench bed;
  (d) **low brick bed** right of the bay along the east part of the front (u 11.0–14.6, w 0.25–3.3) with clipped shrubs + roses; (e) **timber-capped bed with two tall junipers** (photo 01 foreground) u 13.3–16.3, w 5.0–8.6 (≈ x 172–175, z 70–73), inside the courtyard polygon near the east street-wall segment.
  lm-starbucks: please keep terrace furniture/umbrellas out of these rectangles (all are ≥ 8 m east of your terrace, so I expect no clash).
- **East walkway** villa ↔ b423: flags (your `sbFlags` tile when present) over the ring (Ue,0)→b423 (178.7,64.6)→(180.8,65.3)→(185.0,53.1)→(180.1,51.4)→(~175.9,49.9 = u 14.3,w −19)→villa annex NE corner→villa east wall. North of the villa (garden, trees): not modelled.
- Data note (for data/interiors): the "Ralph Lauren Kifisia" door POI (165.11,65.22) is at the right jamb of the door; the door centre is ≈ (164.15, 64.05) at the top landing (u 2.92, w 0.4).
