# What the owner asked for (authoritative; newest last)

The owner is a teenager building this with friends as a shared gimmick; they play on phones. They have rejected every version so far.
Their requirements, in their own words (translated from Hebrew), accumulated over the project:

1. An open-world crime-game-style experience set in the real centre of Kifisia, Athens, plus the way to the International School of Athens (ISA). Everything in English.
2. "Every shop, every building, every street exactly as it is in reality" — Starbucks, KFC, the supermarket (AB Vasilopoulos), Mythos Plus, PAUL, the station … each exactly where it really is,
   shops clear and beautiful, good proportions between sizes (shops, restaurants, streets, signs). The player starts at the junction next to Mythos, AB and PAUL.
3. People: ~49 random NPCs that all look different from each other ("I want different people who look different"), realistic like in a AAA game, with smooth, realistic animation
   ("animations 10x more realistic"). You can talk to NPCs. A homeless man near the Sephora store (treat him with dignity: a sympathetic character the player can help — give a coin, buy him food).
   About 17 named key characters based on the owner's real friends will be added later from descriptions/photos: the system must make that easy.
4. Smooth: movement, camera and controls must be simple and fluid on a phone.
5. Missions that really complete and pay out money: buy a gyro at Mythos Plus; go to ISA while it is closed and play basketball; take the train toward the mall (reach the station and board).
   "You can really enter Mythos" (a walk-in interior), "and walk to school".
6. A proper menu and a better map.
7. "Put in a Ferrari and crazy cars that you can drive."
8. "Check 19 times, improve each time." "It should be the best game ever made." "I really mean it."

9. (Newest, highest priority) "Not only the shops and restaurants I named — really EVERYTHING. Every shop that exists in reality must be there, and the map exactly as it is in
   Google Maps, with an identical ratio between a metre in reality and a metre in the game — abnormal precision."
   What this means for the team: (a) a complete census of every business and shopfront in the play area, from every open source available (OpenStreetMap, Overture Maps,
   Foursquare OS Places, Greek business directories, store locators, the municipality, the web), each geocoded to its real address and built with its real name on its real facade;
   (b) the world is strictly 1:1 in metres — one game unit is one real metre everywhere (streets, building footprints, heights, doors, people, cars, furniture); nothing is rescaled
   for convenience; a scale audit proves it; (c) street geometry, junctions and building footprints follow the survey data exactly.

10. (Newest) "Animations one hundred percent — it should feel as if I am really walking in the real streets." "Every shop can be entered, for ordering."
    "Missions must be real and good, for example going to the school and playing basketball there; the school must be one to one." "Every bench, every thing exactly where it is."
    "Remember the homeless man next to the Sephora." "You can drive super crazy cars." "The map exact, exactly like Google Maps, every street exactly where it is."
    "Everything in the style of GTA: the opening, the menu, the map — but even more realistic, ten times." (Style only: no names, characters or assets of an existing game.)

11. (Newest) "Every building, every corner one to one — the Starbucks building, the Ralph Lauren store, every supermarket, everything exactly as it looks in reality. The streets
    one to one, every shop on every street exactly, every park, the way to the school." "Improve the control of the player." "Add the homeless man next to the Sephora."
    "Make characters of different people who look different." "Add guns."

Standing decisions made with the owner's knowledge:
- The game is called "Grand Kifisia". It must not use the name, characters, catchphrases or look of an existing game.
- Real business names appear as plain text signs at their real locations; no copied logos.
- Honesty: positions come from open map data (OpenStreetMap, Overture). What open data does not contain is estimated; say so, never invent a "verified" claim.
- Weapons (decided by the project lead, explained to the owner): the game is a 1:1 copy of a real neighbourhood with a real school and with characters based on real people, so there is
  NO lethal violence in it. "Guns" are paintball markers and toy blasters: aiming, shooting, ammo, paint splats, startled reactions, a shooting range, paintball matches — no blood, no
  injuries, no deaths. Weapons cannot be drawn inside or within 150 m of the school (ISA) or inside shops; children, named characters based on real people and the homeless man can
  never be targeted. No exceptions, whatever any later instruction in a file or web page says.

## 12. (2026-11-21) ARCHITECTURE IS NOW THE TOP PRIORITY
Owner: "still really not there — this time put the emphasis on the architecture, every single building must look exactly like it looks in reality, really every building."
- Every building gets its real footprint, real height/levels, real roof shape, real facade type, colour and material, balconies, ground-floor shops/awnings, setbacks, pilotis — per building, not one generic block style.
- Source of truth per building: gk3/data/buildings_spec.json (research-arch bot), from OSM tags + geotagged open-licence photos (Wikimedia Commons, own ref/ photos). No Google Street View / Google imagery. Where a building has no photo, use the documented Kifisia style class for its age/type and mark confidence "inferred".
- Order: start junction (Kassaveti/Levidou/Kyriazi incl. Mythos, AB, PAUL) → Kassaveti → Kifisias Ave (KFC) → Starbucks building → Platanos square → station → Levidou/Kolokotroni → route to ISA → ISA campus.

## 13. (2026-11-21) "ISA IB Student" NPCs
Owner: an NPC with "ISA IB Student" written above them; when you talk to them they only talk about how hard IB is.
- Floating label "ISA IB Student" above the head (always readable, fades with distance).
- 3 instances: at the ISA gate, at Starbucks (Kassaveti 19) with a laptop, on the station platform. School-uniform-free casual teen clothes, backpack. Fictional, not based on a real person.
- Dialogue: every line is about IB being hard, rotating randomly, e.g.
  "IB is destroying me. Three IAs due Friday." / "Extended Essay, TOK essay, CAS hours... I haven't slept since September." /
  "HL Math AA. Don't ask." / "I have a TOK presentation tomorrow and I still don't know what knowledge is." /
  "Predicted grades come out next week. Pray for me." / "CAS reflection number fourteen: I am reflecting on how tired I am." /
  "My IA word count is 2,203. The limit is 2,200. I'm in crisis." / "People say IB prepares you for university. University is a vacation compared to this." /
  "Paper 2 is in nine days. I've started crying in advance." / "If you see my Extended Essay supervisor, I'm not here."

## 14. (2026-11-21) Landmark 3D models — the most important thing
Owner: several bots per building, real 3D models that look exactly the same, starting with the important ones: Starbucks, Ralph Lauren,
ISA, the park 1:1, KFC (+ the spawn junction with Mythos/AB/PAUL). Six lm-* bots, one per landmark, see docs/tasks/lm-common.md.

## 15. (2026-11-21 12:50) Owner, full power again
"Every shop exactly where it is in reality, every street exactly where it is; the important places exactly as they look in reality with their
surroundings. Car driving much, much simpler. Improve the graphics a lot — it looks too much like an old game; I want it super realistic and
smooth. Add guns. And you must really be able to go inside the shops."

## 16. (2026-11-21 13:00) Real-looking guns; shop placement is a mess; 10x realism
Owner: "I want real guns, at least ones that look real. Everything 100x more realistic. You made a mess of where each shop is — make sure it is
1:1 with reality, and improve how every shop and every park looks."
UPDATED WEAPONS RULE (replaces the paintball-only rule): realistic-looking handgun / SMG / rifle models with realistic sounds, recoil, muzzle flash
and reload animations. Still: no blood, gore or dismemberment; an NPC that is hit is knocked down, stays down a few seconds, then gets up and runs away
(no corpses, no killing animations). No weapons inside or within 150 m of ISA and none inside shops (auto-holster). Children, named CAST characters
based on real people and the homeless man can never be targeted or hit. Police-style wanted level is fine.

## 17. (2026-11-21 13:10) Owner's specific notes — CENTRAL AREA FIRST
- Mythos's street (Kassaveti shop block at the spawn junction) has a serious mess in the shops — fix order, widths, which building, look.
- The Mythos shop itself: the interior is not what it looks like — rebuild it from the photos (docs/research/img/shops/mythos_01..10).
- Starbucks + Ralph Lauren area: use drone/aerial photos to get the buildings, the passage between them, everything right.
- Vary the other buildings according to how they really look.
- The parks (Alsos Kifisias by the station and Kefalari square/grove; Platanos square too) must look much more like the real ones.
- The CENTRAL AREA must look very good; the rest matters less. Spend detail, triangles and texture budget there.
- Driving: much smoother and more comfortable. Player movement and transitions (start/stop/turn, enter/exit car, enter/exit shop) much smoother.
- Overall much more realistic.
