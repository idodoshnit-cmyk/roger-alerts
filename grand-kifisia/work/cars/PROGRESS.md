# OWNER-INSTANCE: this workstream ("cars") is being worked on by the agent labelled "team:cars" started by the project lead in a dedicated workflow.
# If you are ANY OTHER process started with id "cars": STOP. Do not create or modify anything. Report: "handled by the dedicated team:cars instance".
# (The owning instance keeps these three header lines at the top of this file and writes its progress below.)


## Log (newest last)
- [session 2, start] Found from session 1: raw/ferrari/ferrari.glb downloaded (three.js example model, "Ferrari 458 Italia" by vicent091036 on Sketchfab),
  tools/cars/glb_decode.js (Draco decoder, uses work/cars/tools/node/node_modules draco3d + meshoptimizer). Nothing integrated yet. No ORDERS.md exists yet.
- PLAN (milestones, integrate after each):
  M1 70_vehicles.js rewrite: lofted procedural car bodies, instanced near/far LOD, glass, wheels, lights, plates; API kept (CARS, CARTYPES, addCar, syncCar, flushCars, carPush, initCars, buildTrain, placeTrain, updateTrain).
  M2 72_driving.js physics + 83_audio.js layered synth. M3 76_traffic.js lanes/junction curves/signals/bus/taxi/scooters.
  M4 Ferrari (decoded glb → models/ferrari.json) + exotics, train ISAP stock with doors, scooters rows. M5 docs/VEHICLES.md + verification shots.
- Viewer for fast iteration: tools/cars/viewer.js (standalone studio page; uses same .locks slot protocol as harness).
- [session 3, 08:30 21 Nov] Resumed. Still nothing integrated (my copy's 70/72/76/83 == main). viewer.js expects updateCarLOD/updateVehicles/vehiclesReady (optional).
  Design for M1 (writing now): own loft builder in 70_vehicles.js; per type: near body InstancedMesh (paint mask via aux attr, light groups, plate atlas UV, dent weights),
  glass InstancedMesh, far LOD InstancedMesh; one shared wheel InstancedMesh (unit wheel scaled); driver silhouettes; headlight ground pools. flushCars() = per-frame LOD/frustum packer.
  Boot's type names hatch/sedan/suv/taxi/van kept; parked 'hatch' etc remapped to variants inside addCar.
- [09:20] Written in work copy (NOT yet integrated, game test queued): 70_vehicles.js (loft cars: mini,hatch,sedan,taxi,exec,suv,suvL,van,bus + exotics wedge,coupe,offroad,cabrio,
  ferrari via models/ferrari.json built by tools/cars/ferrari_build.js; near/far LOD packer in flushCars; plates atlas; lights shader; pools; driver silhouettes; attachDriver/seatPos),
  72_driving.js (gearbox, slip, handbrake, springs from 4 wheel heights, substep collisions, car shoving DRV.loose, door hook carDoor if present),
  76_traffic.js (TRF pool, Bezier junctions, signals/stop/bus stops, out-of-sight spawn, density by tod, trafficLost), 83_audio.js (layered engine, tyres, wind, traffic voices, train).
  Viewer studio verified everyday types look like cars (shots/v/sheet1.png sheet2.png). Name clash MK fixed (87_missions uses MK) -> VK.
  NEXT: game test g1 -> integrate all 4 files + models/ferrari.json; then scripted drive test; train ISAP model; scooters; docs/VEHICLES.md; CREDITS line for Ferrari.
- [session 4, 12:50] Resumed. ORDERS: owner directive 15 for cars = DRIVING MUCH SIMPLER (auto-throttle, one-finger steer, big brake, auto-straighten,
  traction assist, auto-reverse, soft walls + auto-unstuck 2 s, one-tap Car, phone 390x844 test). synced copy from main (syncwork).
  Rewrote driveCar in 72_driving.js as simple arcade (backup of session-3 version: work/cars/72_driving.session3.js). nearestCar range 3.6 m.
  Shared edits applied in MAIN + copy: 90_main.js joySet (in car jx=clamp(dx/R)), index.html #bBrake 96px corner / #bGas 70px / #bHand / #bHorn moved.
  Running phone test sc/p1.json (gtest.js). NEXT: check result -> integrate 70/72/76/83 + models/ferrari.json; ORDERS_DONE entry.
- [13:20] p1 phone test (gtest, wall-clock steps) OK: 533 vehicles incl. 5 exotics, ferrari loaded, no page errors; car drove, crashed into a shop, auto-unstuck fired.
  Added: better unstuckCar (clear path ahead, turn away), exitCar while moving = auto-stop then exit (DRV.exitReq), 80_player.js car camera: portrait boom x1.28 / fov +16
  (shared edit, MAIN + copy). New tool tools/cars/ptest.js (fixed-step physics test in page + phone shots).
  INTEGRATED into main 13:20: js/70_vehicles.js 72_driving.js 76_traffic.js 83_audio.js models/ferrari.json. CREDITS Ferrari line appended. VEHICLES.md driving section rewritten.
  NEXT: read pt1 results (running), harness run on MAIN, ORDERS_DONE entry, then traffic watch + beauty shots.
