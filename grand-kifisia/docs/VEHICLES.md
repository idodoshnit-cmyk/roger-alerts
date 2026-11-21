# Vehicles, driving, traffic and vehicle audio (team:cars)

Files: `gk3/js/70_vehicles.js` (models, instancing, lights, train), `gk3/js/72_driving.js` (player driving), `gk3/js/76_traffic.js` (traffic AI),
`gk3/js/83_audio.js` (WebAudio synth), `gk3/models/ferrari.json` (built by `tools/cars/ferrari_build.js`). Studio for fast iteration:
`GK_DIR=… node tools/cars/viewer.js <outPrefix> '{"types":["hatch","taxi"],"mode":"show","views":["f34","side","r34","front","rear","close","top"],"grid":[3,2],"night":false}' 1500x800`.

All units are metres (1:1). Local vehicle frame: +z forward, +y up, **+x is the car's LEFT** (driver's side: Greece drives on the right, cars are left-hand drive).

## Vehicle types (`CARTYPES[key]`)
| key | what | L×W×H (m) | notes |
|---|---|---|---|
| mini | supermini (Fiat 500 / Aygo class) | 3.62×1.66×1.50 | round lamps |
| hatch | small hatchback (Polo / 208 class) | 4.05×1.75×1.46 | most common |
| sedan | compact saloon (Corolla / Octavia class) | 4.62×1.78×1.46 | |
| taxi | Athens taxi: yellow saloon with lit TAXI roof sign | 4.62×1.78×1.46 | fixed colour |
| exec | executive saloon | 4.96×1.87×1.47 | chrome trim |
| suv / suvL | crossover / large SUV | 4.42×1.83×1.60 / 4.92×1.96×1.76 | black cladding, roof rails |
| van | delivery van | 4.98×1.98×2.00 | cargo body without windows |
| bus | blue-and-white city bus | 12.0×2.55×3.05 | runs on Kifisias Avenue, stops at MAP.props.bus |
| scooter / scooterD / moto | scooter / delivery scooter with top box / naked motorbike | ~1.95–2.1 long | parked in rows, ridden in traffic |
| ferrari | **Ferrari 458 Italia** (three.js example model, decoded & simplified) | 4.53×1.94×1.21 | exotic, 325 km/h |
| wedge | "Furia V12" low wedge supercar | 4.62×2.03×1.13 | exotic, 330 km/h |
| coupe | "Cobalto RS" rear-engined sports coupé | 4.52×1.85×1.30 | exotic, round lamps |
| offroad | "Titan 4x4" boxy luxury off-roader | 4.82×1.93×1.97 | exotic, spare wheel |
| cabrio | "Riviera Spider" open convertible | 4.60×1.86×1.28 | exotic, open cabin |

Spec fields used by other code: `L, W, H, wb (wheelbase), zf/zr (axle z), wr (wheel radius), track, seat [x,y,z], seats[], cls ('car'|'moto'), exotic, name,
dyn {acc, vmax, brake, grip, steer, mass, cg, eng{idle, red, gears, voice, vol}}`.

### How the cars are modelled
Cars are **lofted**: `carRing(S,z)` returns the cross-section at any z from smooth monotone keyframe curves along the car (`bot` underside, `belt`
shoulder/window line or bonnet/boot edge, `top` greenhouse top, `hw` plan half-width; u = 0 rear … 1 front). Wheel arches are cut into the section,
glass zones (`wsT..wsB` windscreen, `rwT..wsT` side glass minus `pil` pillars, `rwB..rwT` rear screen) become inset glass, and details are patched on
the surface (`carPatch`): door/bonnet/boot seams, window trim, head lamp clusters wrapping round the corners, tail lamps, indicators, side repeaters,
mirrors on stalks, door handles, wipers, shark-fin antenna, roof rails, grille slats, intakes, fog lamps, Greek plates. An interior (dash, seats,
steering wheel, door cards, headliner) is visible through the tinted glass. Near LOD ≈ 3,000 triangles + 4 shared wheels (≈ 230 tris each), far LOD ≈ 600.

**Adding a type:** `defCar('key',{name,L,W,H,wb,fo,wr,bot:[[u,y]…],belt:[…],top:[…],hw:[…],wsB,wsT,rwT,rwB,pil:[[u0,u1]],doors:[u…],hl:{w,h,round?},tl:{w,h},gr:{w,y0,y1},seat:[x,y,z],cap,dyn:{…}})`
(see the hatch for a template; `[u,y,1]` marks a sharp key). Two-wheelers: `defBike(key,{kind:'scooter'|'moto',…})`. A custom mesh: give the spec
`build(S) → {body, glass, far:{body}}` with the attributes listed below, or `model:'models/x.json'` (format written by `tools/cars/ferrari_build.js`).

## Records (`CARS[]`)
`addCar(type, x, z, yaw, colourHex|null, mode)` → record or null (capacity / claimed spot). Modes: `parked`, `traffic`, `bus`, `player`, `free` (left by
the player or knocked out of traffic), `show` (studio). Parked requests for hatch/sedan/suv are varied (mini/exec/suvL); ~9 % of parked car slots become
a row of 3–4 scooters; spots used by exotics are skipped (`CLAIMED`).
Fields: `type, id, x, z, y, yaw, pitch, roll` (chassis, from the ground), `sp, sr, sh` (sprung body pitch/roll/heave offsets), `vf` forward speed,
`vr` lateral slip, `steer` (rad, + = right), `spin` (wheel angle), `color` (THREE.Color, linear), `plate` (0..126), `brk` (brake lamps), `ind`
(0 none, 1 left, 2 right, 3 hazards), `lightsOn`, `dmgF/dmgR` (0..1 dents, vertex-shader crumple), `hp`, `occ` (shows a seated driver), `hidden`,
`gear`, `fixY` (keep y instead of terrain), `driver`/`riders` (see hooks), `lv` (slide velocity of a shoved car).
Call `syncCar(c)` after changing position/attitude; `flushCars()` (every frame, from the main loop) does LOD selection, frustum culling, instance packing,
wheels, drivers, headlight pools, door animation, shoved-car sliding and the vehicle audio tick.
`carPush(c, p, r)` pushes a point {x,z} of radius r out of a car footprint (used for the player and NPCs).

## Hooks for other modules
- `seatPos(car, k)` → local [x,y,z] of seat k (0 driver, 1 front passenger, 2/3 rear; bikes 0 rider, 1 pillion).
- `attachDriver(car, object3D, seat=0)` → the object is placed on that seat every frame (`matrixAutoUpdate` is switched off; add it to the scene
  yourself); the generic driver silhouette disappears for seat 0. `attachDriver(car, null, seat)` removes it.
- `carDoor(car)` plays the driver's door open/close (called by enterCar/exitCar).
- `npcHitByCar(npc, car)` — if the characters module defines it, the driving code calls it instead of its own knock-down when a car touches a person.
- `trafficLost(car)` — call when you take a car out of traffic; a replacement spawns out of sight.
- `carLights(car, night, out)` → `[head, brake, indicator, reverse]`.

## Driving (`72_driving.js`) — simple arcade model (owner directive 15)
Controls. Phone: put a finger anywhere on the left half and drag left/right to steer (the stick is horizontal-only in a car: `input.jx = clamp(dx/R)`).
With **auto-throttle** (`DRV.auto`, default on, saved in localStorage `gk_autogas`; `setAutoThrottle(on)` for a settings toggle) the car drives
while that finger is down and slows firmly when it lifts. The big **Brake** button (bottom-right corner, 96 px) brakes; held while stopped it reverses
(auto-reverse after 0.22 s). **Gas** gives full power without the steering finger. **H-Brake** = handbrake. Keyboard: W/Up gas, S/Down brake+reverse,
A/D steer, Space handbrake. **Car** (one tap) enters the nearest car within 3.6 m of its body (exotics a little further); pressed while moving it brakes
to a stop and gets out by itself (`DRV.exitReq`).
Model (`driveCar(dt, jx, jy)`, sub-stepped at 90 Hz): steering input goes through a dead zone, a gentle curve (0.45·x + 0.55·x²) and a short
low-pass (`DRV.jxs`, 90 ms toward a new input, 50 ms back to centre — order 13:10 "smooth driving"); the steering angle is speed-sensitive (full lock at
walking pace, 24 % at 130 km/h), turn-in slows with speed (3.4 → 1.7 rad/s) while the auto-centre stays fast, and yaw builds a little more progressively at speed;
yaw follows the front wheels directly up to the grip limit (traction assist); **no lateral slip below `DRV.assistV` = 16.7 m/s (60 km/h)**, a gentle,
capped drift above it; handbrake (> 6 m/s) lets the tail out by at most 0.45 × speed and recovers on its own — the car cannot spin. Automatic gearbox
(drives the engine sound), slope gravity only while moving (no creep or jitter when stopped on Kifisia's hills). Collisions: 3–5 footprint circles per car;
against walls/props/trees only the velocity component into the surface is removed (no bounce), and on a glancing hit the nose turns to run along the
wall; **auto-unstuck**: if the player pushes Gas/Brake for 2 s without getting 1.2 m anywhere, `unstuckCar(c)` lifts the car to the nearest free spot
(`carFree(c,x,z,yaw)`), counting `DRV.unstuckN`. Car-to-car: momentum exchange by mass (parked cars slide, traffic cars stop with hazards), damage
(`carHit`), people pushed aside at walking pace and knocked over (non-lethal; `npcHitByCar` hook) above 18 km/h. The playable edge acts like a wall.
Body: chassis height, pitch and roll from the ground under the four wheels; a damped spring adds dive, squat and roll (bikes lean).
Tuning: `DRV.h`, `DRV.assistV`, `DRV.auto`, per-type `dyn {acc, vmax, brake, grip, steer, mass, cg, eng}`. Camera: 80_player.js `updateCamera` (look-ahead
along the car's velocity, whisker rays against walls) is unchanged.

## Traffic (`76_traffic.js`)
A pool of hidden vehicles (`TRF.pool`, size by quality) is activated up to `pool × trfDensity()` (time of day). Cars follow right-hand lanes
(`laneOff`), respect one-way streets (`carOK`), plan the next road 35 m ahead (indicators on), drive a quadratic Bézier from lane to lane through the
junction, slow for curves, keep a gap (`minGap` 2.2 m at 3.2 m/s² braking), stop for red/amber lights at signalled nodes (`TRF.sigNodes`, from
`SIGNALS`), make a full stop at stop-sign nodes, give way to people crossing (`NPCS[].cross`) and to the player on foot. The bus follows roads named
"Λεωφόρος Κηφισίας" and stops 9 s at bus stops on its right. Spawning/despawning only out of view (`trfVisible`: outside the frustum or beyond the fog).
One or two parked cars near Mythos / Starbucks / PAUL are double-parked with hazards.

## Audio (`83_audio.js`)
`audio()` (first user gesture) creates `AC`. `engine(speed, throttle, info)` — info from the driving model `{on, rpm, idle, red, load, gear, voice,
slip, scrape, shift, vol}`; voices `i3, i4, i6, v8, v10, v12, f6, diesel, bus, scooter, moto`. Layers: firing-frequency sawtooth, sub square, rasp,
harmonic, band-passed intake noise, diesel clatter, waveshaper + load-dependent low-pass; tyre squeal, wind, scrape loops. `sfx(name, v)`: crash (scaled,
with glass), thud, door, horn (`hornFor(type)`: car / sport / scooter / bus), tick, chime (train doors), depart (Line 1 departure tone), brakeAir, buy,
pass, fail, swish. `vehAudioTick(dt)`: master volume (SETTINGS.vol), three positional traffic voices (distance + stereo pan), train rumble.

## Train
`TRAIN.cars[k]` are meshes (position/rotation used by missions). Five Line 1 cars: white/silver with the green Line 1 stripe, four pairs of sliding
doors per side (one instanced mesh of 80 leaves that slide open at the platform: `TRAIN.doors` 0..1), cab ends with windscreen, destination display,
head and tail lamps, bogies with wheels and third-rail shoes, interior seats. States `away → arrive → dwell (chime, doors open, departure tone, doors
close) → depart`. `TRAIN.hold` keeps it at the platform (missions).

## Known gaps (honest)
- No usable CC0 vehicle or scooter models exist on Poly Haven (only "covered_car"); all models except the Ferrari are procedural.
- Train livery follows public descriptions of the Line 1 stock, not a specific photographed unit.
- Only the driver's door is articulated, and only for the car being entered/left; handles/trim stay on the body while it swings.
- Ferrari model: `tools/cars/ferrari_build.js` decodes the Draco glb, welds by position but keeps the ORIGINAL normals (clustered per position so
  double-sided sheets do not cancel), simplifies with meshoptimizer and picks per triangle corner the normal cluster that matches its facing.
  Near LOD ≈ 8.6k triangles + 2.2k glass — above the 2,500 per-car budget, accepted because at most five exotics exist and only one or two are ever near.
