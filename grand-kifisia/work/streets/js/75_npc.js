'use strict';
/* Grand Kifisia — street life: pedestrians on the sidewalk graph, people at the real cafés, benches, bus stops, the station platform
   and the Platanos taxi rank, chatting pairs, window-shoppers, staff, school kids, and the named CAST characters (models/cast.json).
   An NPC is a plain object { h: Person, x, z, yaw, state, static, timer, panic, ... } in NPCS (other modules read/write these fields).
   states: 'walk' | 'pause' | 'talk' | 'down' | 'getup' | 'still'.   static: falsy for walkers, else the role name.   docs/CHARACTERS.md */
const NPCS = [];
const STREET = { spots: [], pool: [], groups: [], cast: {}, frame: 0, t: 0, assignT: 0, furniture: null, counts: {} };

/* ---------- walking the road graph on the sidewalks ---------- */
function walkOff(r, side) { if (r.ty <= 4) return (r.w / 2 + Math.max(1.0, r.sw * 0.55)) * side; if (r.ty === 6) return 1.5 * side; return 0.45 * side; }
function roadPos(r, s, off) { const c = r.cum, ps = r.ps; s = clamp(s, 0, r.L); let i = r._i || 1; if (i >= c.length || c[i - 1] > s) i = 1; while (i < c.length - 1 && c[i] < s) i++; r._i = i; const seg = (c[i] - c[i - 1]) || 1e-6, t = (s - c[i - 1]) / seg; const a = ps[i - 1], b = ps[i]; const dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg; return { x: lerp(a[0], b[0], t) - dz * off, z: lerp(a[1], b[1], t) + dx * off, dx, dz }; }
function nextRoad(r, atEnd, ok) { const k = atEnd ? r.k1 : r.k0; const l = (ROADNODES.get(k) || []).filter(e => ROADS[e.ri] !== r && ok(ROADS[e.ri], e.end)); return l.length ? l[Math.floor(Math.random() * l.length)] : null; }
const pedOK = r => (r.ty <= 4 && r.side > 0) || (r.ty >= 6 && r.ty <= 8 && r.side >= 0);
function nearRoads(x, z, r0, r1, ok) { const o = []; ROADS.forEach((r, i) => { if (!ok(r)) return; const m = r.ps[Math.floor(r.ps.length / 2)]; const d = Math.hypot(m[0] - x, m[1] - z); if (d > r0 && d < r1) o.push(i); }); return o; }
function placeNpc(n, cx, cz, r0, r1) { const l = nearRoads(cx, cz, r0, r1, pedOK); if (!l.length) return false; n.ri = l[Math.floor(Math.random() * l.length)]; const r = ROADS[n.ri]; n.s = Math.random() * r.L; n.dir = Math.random() < 0.5 ? 1 : -1; n.side = Math.random() < 0.5 ? 1 : -1; const p = roadPos(r, n.s, walkOff(r, n.side) + (n.lat || 0)); n.x = p.x; n.z = p.z; n.cross = null; return true; }
function maskBuilding(x, z) { return !!collide({ x, z }, 0.5, ['t', 'p']); }
const clearSpot = (x, z, r) => lvl(x, z) > 0.05 && inPlay(x, z) && !collide({ x, z }, r || 0.45, null);

/* ---------- where things are ---------- */
/* every shop front from the map: { name, kind, x, z (on the facade), nx, nz (outward), tx, tz (along the facade) } */
function shopSpots() { if (shopSpots.c) return shopSpots.c; const out = [];
  for (const b of MAP.buildings) { const shops = b[8]; if (!shops || !shops.length) continue; let ps = unp(b[10]); if (ps.length < 3) continue; const flip = polyArea(ps) < 0; if (flip) ps = ps.reverse(); const n = ps.length;
    for (const s of shops) { let ei = s[0]; if (flip) ei = (n - 2 - ei + n) % n; const a = ps[ei], c = ps[(ei + 1) % n]; if (!a || !c) continue; const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.05) continue;
      out.push({ name: s[2], kind: s[5], x: a[0] + dx * s[1], z: a[1] + dz * s[1], nx: dz / L, nz: -dx / L, tx: dx / L, tz: dz / L, L }); } }
  return shopSpots.c = out; }
/* a named place -> shop spot.  q: 'Sephora' (name contains), MAP.key name, or [x,z] */
function findPoi(q, fallback, xz) { const S = shopSpots(), has = n => S.find(s => s.name && s.name.toLowerCase().indexOf(String(n).toLowerCase()) >= 0);
  if (typeof q === 'string' && MAP.key && MAP.key[q.toLowerCase()]) { const k = MAP.key[q.toLowerCase()]; let best = null, bd = 30; for (const s of S) { const d = Math.hypot(s.x - k[0], s.z - k[1]); if (d < bd) { bd = d; best = s; } } if (best) return best; }
  let s = (typeof q === 'string' && has(q)) || (fallback && has(fallback)); if (s) return s;
  if (xz) { let best = null, bd = 40; for (const c of S) { const d = Math.hypot(c.x - xz[0], c.z - xz[1]); if (d < bd) { bd = d; best = c; } } return best; }
  return null; }
const EAT_KINDS = { cafe: 1, restaurant: 1, fast_food: 1, bakery: 1, bar: 1, coffee: 1, confectionery: 1, ice_cream: 1, pub: 1, mythos: 1, paul: 1, starbucks: 1, kfc: 1 };
const SHOP_KINDS = { clothes: 1, jewelry: 1, shoes: 1, bag: 1, gift: 1, books: 1, interior_decoration: 1, watches: 1, perfumery: 1, cosmetics: 1, chocolate: 1, fashion_accessories: 1, gallery: 1, optician: 1, houseware: 1 };

/* ---------- THE seat finder: every place a person can sit or stand around, from map data ----------
   returns spots { role, x, z, yaw, seatH?, group?, slot?, name? }.  Roles: terrace (chair at a café table), bench, bus, platform, taxi,
   chat (standing pair), window (looking at a shop window).  If the map ever publishes MAP.seats = [[x, z, yaw, seatHeight, kind, name], ...]
   (decimetres like the rest of the map) those are used as well.  Café tables + chairs are also built here (returned in .furniture).   */
function findSeats() { const spots = [], chairs = [], tables = [], S = shopSpots();
  const group = (role, name) => ({ role, name: name || '', members: [], t: 2 + Math.random() * 6, speaker: 0 });
  /* café / restaurant terraces: bistro tables in front of the real shop fronts, where the sidewalk is wide enough */
  for (const s of S) { if (!EAT_KINDS[s.kind] || !inFocus(s.x, s.z)) continue; let made = 0;
    for (const u of [2.5, -2.5, 4.9, -4.9]) { if (made >= 2) break; const d = 1.55, x = s.x + s.tx * u + s.nx * d, z = s.z + s.tz * u + s.nz * d;
      if (!clearSpot(x, z, 0.95) || lvl(x + s.nx * 1.3, z + s.nz * 1.3) < 0.05) continue; if (tables.some(t => Math.hypot(t[0] - x, t[2] - z) < 2.2)) continue;
      const y = groundY(x, z), yaw = Math.atan2(s.tx, s.tz), g = group('terrace', s.name); tables.push([x, y, z, yaw]); made++;
      for (const k of [1, -1]) { const cx = x + s.tx * 0.68 * k, cz = z + s.tz * 0.68 * k, cyaw = Math.atan2(-s.tx * k, -s.tz * k); chairs.push([cx, groundY(cx, cz), cz, cyaw]); spots.push({ role: 'terrace', x: cx, z: cz, yaw: cyaw, seatH: 0.45, group: g, name: s.name, tx: x, tz: z }); } } }
  /* benches (same orientation rule as 50_props.js: yaw = hf(x)*TAU, seat 0.475 m, sitter faces local +z) */
  for (const b of MAP.props.bench || []) { const x = b[0] / 10, z = b[1] / 10, yaw = hf(b[0]) * TAU, g = group('bench'); for (const k of [-0.45, 0.45]) spots.push({ role: 'bench', x: x + Math.cos(yaw) * k + Math.sin(yaw) * 0.03, z: z - Math.sin(yaw) * k + Math.cos(yaw) * 0.03, yaw, seatH: 0.475, group: g }); }
  if (MAP.seats) for (const e of MAP.seats) spots.push({ role: e[4] === 'chair' ? 'terrace' : 'bench', x: e[0] / 10, z: e[1] / 10, yaw: e[2], seatH: e[3] || 0.46, group: group('bench', e[5]), name: e[5] });
  /* bus stops: under the shelter, facing the road */
  if (typeof nearestRoad === 'function') for (const b of MAP.props.bus || []) { const x = b[0] / 10, z = b[1] / 10, r = nearestRoad(x, z); if (!r) continue; const yaw = Math.atan2(r.nx, r.nz);
    for (const k of [-0.8, 0.5, 1.9]) { const px = x + r.nx * 0.15 - r.nz * k, pz = z + r.nz * 0.15 + r.nx * k; if (lvl(px, pz) > 0.05) spots.push({ role: 'bus', x: px, z: pz, yaw: yaw + (hf(b[0] + k * 10) - 0.5) * 0.7, name: b[2] }); } }
  /* station platform: spread along the platform, facing the track */
  if (STATION.platform && TRAINPATH) for (let i = 0; i < 6; i++) { const p = atLen(TRAINPATH.ps, TRAINPATH.cum, 14 + i * 13 + hf(i * 7) * 5); const fx = Math.sin(p[2]), fz = Math.cos(p[2]);
    for (const sg of [1, -1]) { const off = (3 + hf(i * 13) * 3) * sg, x = p[0] + fz * off, z = p[1] - fx * off; if (pip(STATION.platform, x, z)) { spots.push({ role: 'platform', x, z, yaw: Math.atan2(p[0] - x, p[1] - z) + (hf(i) - 0.5) * 0.5 }); break; } } }
  /* taxi rank at Platanos square + standing pairs on squares and pedestrian streets */
  const P = MAP.key.platanos; let tx = 0; for (let a = 0; a < 24 && tx < 3; a++) { const ang = a / 24 * TAU + 0.3, rr = 5 + (a % 3) * 2.5, x = P[0] + Math.cos(ang) * rr, z = P[1] + Math.sin(ang) * rr; if (clearSpot(x, z, 0.6) && !spots.some(s => Math.hypot(s.x - x, s.z - z) < 2.5)) { spots.push({ role: 'taxi', x, z, yaw: Math.atan2(P[0] - x, P[1] - z) + Math.PI + (hf(a) - 0.5) }); tx++; } }
  const chatAt = (x, z, name) => { if (!clearSpot(x, z, 0.9) || spots.some(s => Math.hypot(s.x - x, s.z - z) < 3)) return; const a = hf(Math.round(x * 7 + z * 13)) * TAU, g = group('chat', name); for (const k of [1, -1]) spots.push({ role: 'chat', x: x + Math.sin(a) * 0.48 * k, z: z + Math.cos(a) * 0.48 * k, yaw: a + (k > 0 ? Math.PI : 0), group: g }); };
  ROADS.forEach((r, i) => { if (!r.focus || r.L < 14) return; if (r.ty === 6) { for (let s = 7; s < r.L - 5; s += 26) { const q = roadPos(r, s + hf(i * 31 + s) * 8, (hf(i + s) < 0.5 ? 1 : -1) * 1.3); chatAt(q.x, q.z, r.name); } } else if (r.ty <= 4 && r.side > 0 && hf(i * 17) < 0.3) { const q = roadPos(r, r.L * (0.3 + hf(i) * 0.4), walkOff(r, hf(i * 3) < 0.5 ? 1 : -1) + 0.9); chatAt(q.x, q.z, r.name); } });
  for (const k of [[4, 6], [-6, -5], [9, -3]]) chatAt(P[0] + k[0], P[1] + k[1], 'Platanos');
  /* window shopping: in front of the real shop windows, facing the glass */
  for (const s of S) { if (!SHOP_KINDS[s.kind] || !inFocus(s.x, s.z)) continue; const u = (hf(Math.round(s.x * 11 + s.z * 3)) - 0.5) * 2.4, x = s.x + s.tx * u + s.nx * 1.15, z = s.z + s.tz * u + s.nz * 1.15; if (clearSpot(x, z, 0.5) && !spots.some(q => Math.hypot(q.x - x, q.z - z) < 1.6)) spots.push({ role: 'window', x, z, yaw: Math.atan2(-s.nx, -s.nz), name: s.name, lx: s.x + s.tx * u * 1.5, lz: s.z + s.tz * u * 1.5 }); }
  for (const s of spots) if (s.group) { s.slot = s.group.members.length; s.group.members.push(null); s.group.spots = (s.group.spots || []).concat([s]); }
  findSeats.furniture = { chairs, tables }; return spots; }
function buildTerraceFurniture(f) { if (typeof GB !== 'function' || typeof instanced !== 'function' || !MAT.atlas) return; const dark = hexc('#2a2c2e'), cane = hexc('#b08a56'), top = hexc('#e9e6df');
  const c = new GB(); c.box(0, 0.44, 0, 0.42, 0.035, 0.42, 0, cane, RECT[T.wood]); c.box(0, 0.7, -0.205, 0.42, 0.36, 0.03, 0, cane, RECT[T.wood]); for (const sx of [-0.19, 0.19]) for (const sz of [-0.19, 0.19]) c.box(sx, sz < 0 ? 0.44 : 0.21, sz, 0.03, sz < 0 ? 0.88 : 0.42, 0.03, 0, dark, RECT[T.metal]);
  const t = new GB(); t.cyl(0, 0.71, 0, 0.36, 0.36, 0.03, 12, top, RECT[T.marble], true); t.cyl(0, 0.03, 0, 0.035, 0.035, 0.68, 6, dark, RECT[T.metal], false); t.cyl(0, 0, 0, 0.24, 0.2, 0.03, 10, dark, RECT[T.metal], true);
  STREET.furniture = [instanced(c.build(), MAT.atlas, f.chairs, true), instanced(t.build(), MAT.atlas, f.tables, true)];
  if (typeof addBoxC === 'function') for (const q of f.tables) addBoxC(q[0], q[2], 0.34, 'p');
  if (typeof placed === 'function') for (const q of f.tables) placed('table', q[0], q[2], 'café table', 'estimated terrace in front of an OSM café/restaurant'); }

/* ---------- spawning ---------- */
const STYLE_CARRY = ['phone', 'text', 'bag', 'bag', 'drink'];
function newNpc(spec, o) { const h = new Ped(spec); const n = Object.assign({ h, x: 0, z: 0, yaw: 0, state: 'walk', static: null, timer: 0, panic: 0, ri: 0, s: 0, dir: 1, side: 1, cross: null, acc: 0, lat: 0, dodge: 0, glance: 0, glanceT: 2 + Math.random() * 6, pauseT: 20 + Math.random() * 50, vx: 0, vz: 0, lastTalks: 0, sp: 0 }, o || {});
  n.spd = n.spd || h.walkSpeed * R(0.94, 1.06) || 1.3; NPCS.push(n); return n; }
function initNpc(p) { p.acc = 0; p.lat = p.lat || 0; p.dodge = 0; p.glance = 0; p.glanceT = 3; p.pauseT = 30 + Math.random() * 40; p.vx = 0; p.vz = 0; p.lastTalks = p.talks || 0; p.sp = 0; if (p.panic === undefined) p.panic = 0; }
function spawnPeople(cx, cz) { if (!PPL.ready) return;
  STREET.spots = findSeats(); buildTerraceFurniture(findSeats.furniture);
  /* walkers: every one a different avatar first; styles = natural clip speed, some on the phone / texting / with a bag, two joggers */
  for (let k = 0; k < 30; k++) { const jog = k === 7 || k === 19; const spec = jog ? { av: k === 7 ? 'jog_m' : 'jog_f', scale: R(0.97, 1.03) } : randomLook(); const n = newNpc(spec, { lat: R(-0.45, 0.45) });
    if (jog) { n.spd = R(2.5, 2.9); n.jog = true; } else if (hf(k * 37 + 5) < 0.42) n.h.setCarry(STYLE_CARRY[Math.floor(hf(k * 91) * STYLE_CARRY.length)]);
    placeNpc(n, cx, cz, 3, k < 21 ? 140 : 260); n.h.root.rotation.y = n.yaw; }
  /* the pool that fills seats / stops / chat spots around the player */
  for (let k = 0; k < 24; k++) { const n = newNpc(randomLook(), { state: 'still', static: 'idle', spot: null }); STREET.pool.push(n); n.h.root.visible = false; }
  /* staff with a fixed place: the chef on a break next to Mythos Plus, a waiter at the nearest terrace, a delivery rider outside a fast-food place */
  const fixed = (spec, x, z, yaw, role, setup) => { if (!clearSpot(x, z, 0.4)) { for (let a = 0; a < 8; a++) { const nx = x + Math.cos(a * 0.8) * 1.2, nz = z + Math.sin(a * 0.8) * 1.2; if (clearSpot(nx, nz, 0.4)) { x = nx; z = nz; break; } } } const n = newNpc(spec, { state: 'still', static: role, x, z, yaw, fixed: true }); n.h.root.rotation.y = yaw; if (setup) setup(n); return n; };
  const my = SPECIAL.mythos; if (my) fixed({ av: 'chef' }, my.door[0] - my.nz * 2.4 + my.nx * 0.8, my.door[1] + my.nx * 2.4 + my.nz * 0.8, Math.atan2(my.nx, my.nz) + 0.5, 'staff', n => { n.h.setCarry('phone'); n.name = 'Voula'; });
  const ter = STREET.spots.filter(s => s.role === 'terrace').sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
  if (ter) { const g = ter.group.spots, mx = (g[0].x + g[1].x) / 2, mz = (g[0].z + g[1].z) / 2, s = shopSpots().find(q => q.name === ter.name) || { nx: 0, nz: 1 }; fixed({ av: 'waiter' }, mx + s.nx * 1.25, mz + s.nz * 1.25, Math.atan2(-s.nx, -s.nz), 'staff', n => { n.name = 'Stelios'; }); }
  const ff = shopSpots().filter(s => (s.kind === 'fast_food' || s.kind === 'kfc') && inFocus(s.x, s.z)).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
  if (ff) fixed({ av: 'rider' }, ff.x - ff.tx * 2.2 + ff.nx * 1.1, ff.z - ff.tz * 2.2 + ff.nz * 1.1, Math.atan2(ff.nx, ff.nz) - 0.6, 'staff', n => { n.h.setCarry('text'); n.name = 'Babis'; });
  /* school kids at the ISA gate, daytime only */
  if (MAP.isa && MAP.isa.gate) { const g = MAP.isa.gate; let k = 0; for (let a = 0; a < 16 && k < 2; a++) { const x = g[0] + Math.cos(a * 0.7) * (2.5 + a * 0.25), z = g[1] + Math.sin(a * 0.7) * (2.5 + a * 0.25); if (!clearSpot(x, z, 0.5) || pip(ISA.poly, x, z)) continue;
      const grp = STREET.kids || (STREET.kids = { role: 'chat', members: [], t: 3, speaker: 0, spots: [] }); const n = fixed({ av: k ? 'girl' : 'boy' }, x + k * 0.9, z, k ? -1.6 : 1.6, 'kids', q => { q.hours = [7.5, 16.5]; q.group = grp; q.slot = grp.members.length; grp.members.push(q); q.h.play(k ? 'listen' : 'talk'); }); k++; if (k === 1) { a--; } }
    if (STREET.kids && STREET.kids.members.length === 2) { const m = STREET.kids.members; m[1].x = m[0].x + 0.95; m[1].z = m[0].z; m[0].yaw = Math.PI / 2; m[1].yaw = -Math.PI / 2; STREET.groups.push(STREET.kids); } }
  spawnCast(); assignSpots(cx, cz, true);
  /* named characters speak their own lines: wrap the generic small-talk function of the HUD module if it is not cast-aware itself */
  if (typeof npcLine === 'function' && !npcLine.cast) { const generic = npcLine; npcLine = function (p) { const l = npcSay(p); if (l == null) return generic(p); p.talks = (p.talks || 0) + 1; return l; }; npcLine.cast = true; } }

/* ---------- named characters from models/cast.json ---------- */
function castAnchor(at) { if (!at) return null; if (Array.isArray(at)) return { x: at[0], z: at[1], yaw: at[2] || 0 };
  if (at.poi || at.fallback) { const s = findPoi(at.poi, at.fallback, at.xz); if (s) { const side = at.side == null ? 2.3 : at.side, out = at.out == null ? 0.5 : at.out; for (const sg of [1, -1, 1.6, -1.6]) { const x = s.x + s.tx * side * sg + s.nx * out, z = s.z + s.tz * side * sg + s.nz * out; if (!collide({ x, z }, 0.3, null) || sg === -1.6) return { x, z, yaw: Math.atan2(s.nx, s.nz) + (at.turn || 0), shop: s }; } } }
  if (at.key && MAP.key[at.key]) { const k = MAP.key[at.key], o = at.offset || [0, 0]; return { x: k[0] + o[0], z: k[1] + o[1], yaw: at.yaw || 0 }; }
  if (at.xz) return { x: at.xz[0], z: at.xz[1], yaw: at.yaw || 0 }; return null; }
function spawnCast() { for (const c of (PPL.cast && PPL.cast.characters) || []) { if (!c.id || STREET.cast[c.id]) continue; const a = castAnchor(c.at); if (!a) { console.warn('cast: no place for', c.id); continue; }
    const n = newNpc(Object.assign({}, c, { seed: 5000 + NPCS.length }), { state: 'still', static: c.does === 'walk' ? null : (c.does || 'idle'), x: a.x, z: a.z, yaw: a.yaw, fixed: true, cast: c, name: c.name, lines: c.lines || null, helped: {} });
    n.h.root.rotation.y = a.yaw; if (c.hours) n.hours = c.hours;
    if (c.does === 'walk') { n.state = 'walk'; n.fixed = false; placeNpc(n, a.x, a.z, 0, 60); } else if (c.does && c.does !== 'idle' && ACTIONS[c.does]) n.h.play(c.does, { seatH: c.seatH });
    if (c.carry) n.h.setCarry(c.carry);
    if (c.props) n.set = castProps(c.props, a); STREET.cast[c.id] = n; if (typeof placed === 'function') placed('cast', a.x, a.z, c.name || c.id, c.at && c.at.poi ? 'next to ' + (a.shop ? a.shop.name : c.at.poi) : 'cast.json'); } }
/* little still-life around a sitting character: cardboard, blanket, bag, paper cup */
function castProps(list, a) { const g = new THREE.Group(), mat = c => new THREE.MeshLambertMaterial({ color: c }); const add = (geo, col, x, y, z, ry) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  if (list.indexOf('cardboard') >= 0) { add(new THREE.BoxGeometry(1.25, 0.018, 1.5), 0xa8845a, 0.02, 0.012, 0.42, 0.04); add(new THREE.BoxGeometry(0.7, 0.016, 0.5), 0x9a7850, -0.5, 0.03, 0.9, -0.3); }
  if (list.indexOf('blanket') >= 0) { const b = add(new THREE.BoxGeometry(0.62, 0.09, 0.42), 0x5d6b7a, 0.52, 0.06, 0.02, 0.15); b.scale.y = 1; add(new THREE.BoxGeometry(0.6, 0.05, 0.4), 0x7a4f4f, 0.52, 0.13, 0.03, 0.2); }
  if (list.indexOf('bag') >= 0) { add(new THREE.BoxGeometry(0.42, 0.34, 0.24), 0x2f3a33, -0.55, 0.17, 0.08, 0.35); add(new THREE.BoxGeometry(0.3, 0.26, 0.2), 0x6b6f76, -0.62, 0.13, 0.4, -0.2); }
  if (list.indexOf('cup') >= 0) { add(new THREE.CylinderGeometry(0.045, 0.034, 0.11, 10), 0xf3efe6, 0.18, 0.057, 1.02, 0); }
  g.position.set(a.x, groundY(a.x, a.z) + 0.005, a.z); g.rotation.y = a.yaw; scene.add(g); return g; }
function castNpc(id) { return STREET.cast[id] || null; }
/* next line of a named character (85_hud_missions.js npcLine() calls this first); null for ordinary people */
function npcSay(p) { if (!p || !p.lines || !p.lines.length) return null; p.said = (p.said || 0) + 1; p.h.talking = true; p.talkT = 4.5; return p.lines[(p.said - 1) % p.lines.length]; }
/* gameplay hook: the player gives something ('coin', 'food', ...) to a named character.  Returns { ok, line, first } and plays the reaction. */
function castGive(id, what) { const n = STREET.cast[id]; if (!n) return { ok: false, line: '' }; what = what || 'coin'; const c = n.cast, th = (c.thanks && (c.thanks[what] || c.thanks.any)) || ['Thank you.']; const first = !n.helped[what]; n.helped[what] = (n.helped[what] || 0) + 1;
  const line = th[(n.helped[what] - 1) % th.length]; n.h.talking = true; n.talkT = 4.5; n.h.nod(); n.lookHold = 6; return { ok: true, line, first, name: n.name, count: n.helped[what] }; }

/* ---------- the pool: keep the places around the player populated ---------- */
const QUOTA = [['terrace', 9], ['chat', 4], ['bus', 3], ['window', 3], ['bench', 2], ['platform', 2], ['taxi', 2]];
function freeSpot(n) { if (n.spot) { n.spot.who = null; if (n.spot.group) n.spot.group.members[n.spot.slot] = null; n.spot = null; } }
function applySpot(n, s) { freeSpot(n); n.spot = s; s.who = n; n.x = s.x; n.z = s.z; n.yaw = s.yaw; n.static = s.role; n.state = 'still'; const h = n.h; h.root.rotation.y = s.yaw; h.setCarry(null); h.stop(0.01); h.lookAt(null); h.talking = false; n.group = s.group || null;
  if (s.group) { s.group.members[s.slot] = n; if (STREET.groups.indexOf(s.group) < 0) STREET.groups.push(s.group); }
  const r = hf(h.seq * 53 + Math.round(s.x * 3));
  if (s.role === 'terrace') h.play('sit_table', { seatH: s.seatH, fade: 0.01 }); else if (s.role === 'bench') { h.play('sit', { seatH: s.seatH, fade: 0.01 }); if (r < 0.55) h.setCarry('text'); }
  else if (s.role === 'chat') h.play(s.slot ? 'listen' : 'talk', { fade: 0.01 }); else if (s.role === 'window') { if (r < 0.25) h.setCarry('bag'); h.lookAt(s.lx, groundY(s.x, s.z) + 1.3, s.lz); }
  else { if (r < 0.3) h.setCarry('text'); else if (r < 0.5) h.setCarry('phone'); else h.play('wait', { fade: 0.01 }); } }
function assignSpots(px, pz, boot) { const cnt = {}; for (const n of STREET.pool) { if (n.spot && Math.hypot(n.spot.x - px, n.spot.z - pz) > 215 && n.state !== 'talk') { freeSpot(n); n.h.root.visible = false; } if (n.spot) cnt[n.spot.role] = (cnt[n.spot.role] || 0) + 1; }
  const free = STREET.pool.filter(n => !n.spot); if (!free.length) return; const near = STREET.spots.filter(s => !s.who && Math.hypot(s.x - px, s.z - pz) < 175 && (boot || Math.hypot(s.x - px, s.z - pz) > 38));
  near.sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz));
  for (let pass = 0; pass < 2 && free.length; pass++) for (const [role, q] of QUOTA) { let need = (pass ? q + 4 : q) - (cnt[role] || 0); if (need <= 0) continue;
    for (const s of near) { if (!free.length || need <= 0) break; if (s.who || s.role !== role) continue; if (s.group && s.group.role !== 'bench' && pass === 0) { /* fill pairs together */ const other = s.group.spots[1 - s.slot]; if (other && !other.who && free.length < 2) continue; }
      applySpot(free.pop(), s); cnt[role] = (cnt[role] || 0) + 1; need--; } } }
function updateGroups(dt) { for (const g of STREET.groups) { const a = g.members[0], b = g.members[1]; if (!a || !b) { const solo = a || b; if (solo && g.role === 'chat' && solo.h.override !== 'wait' && !solo.fixed && solo.state === 'still') { solo.h.play('wait'); solo.h.lookAt(null); } continue; }
    if (a.state !== 'still' || b.state !== 'still') continue; g.t -= dt; if (g.t > 0 && g.init) continue; g.init = true; g.t = 4 + Math.random() * 8; g.speaker = 1 - g.speaker; const sp = g.members[g.speaker], li = g.members[1 - g.speaker];
    if (g.role === 'chat') { if (sp.h.override !== 'talk') sp.h.play('talk'); if (li.h.override !== 'listen') li.h.play('listen'); } else { sp.h.talking = g.role === 'terrace' || Math.random() < 0.5; li.h.talking = false; }
    const hs = sp.h.root.position, hl = li.h.root.position; if (g.role !== 'bench' || Math.random() < 0.4) { li.h.lookAt(hs.x, hs.y + (g.role === 'chat' ? 1.6 : 1.15), hs.z); if (Math.random() < 0.7) sp.h.lookAt(hl.x, hl.y + (g.role === 'chat' ? 1.6 : 1.15), hl.z); else sp.h.lookAt(null); } else { li.h.lookAt(null); sp.h.lookAt(null); } } }

/* ---------- per frame ---------- */
const NPC_V = new THREE.Vector3();
function updatePeople(dt, px, pz) { if (!PPL.ready) return; const S = STREET; S.frame++; S.t += dt; PPL.stat.anim = 0;
  S.assignT -= dt; if (S.assignT <= 0) { S.assignT = 1.2; assignSpots(px, pz, false); } updateGroups(dt);
  camera.getWorldDirection(NPC_V); const fx = NPC_V.x, fz = NPC_V.z, cxx = camera.position.x, czz = camera.position.z; const car = player.car, carFast = car && Math.abs(car.vf) > 6, hour = typeof tod === 'number' ? tod : 12;
  const budget = Q.real >= 14 ? 14 : Q.real >= 8 ? 8 : 6; let farDone = 0; const phead = player.y + 1.62;
  for (let i = 0; i < NPCS.length; i++) { const p = NPCS[i], h = p.h; if (p.acc === undefined) initNpc(p); const dxp = p.x - px, dzp = p.z - pz, d = Math.hypot(dxp, dzp); p.acc += dt;
    if (p.hours && (hour < p.hours[0] || hour > p.hours[1])) { h.root.visible = false; continue; }
    if (p.talkT > 0) { p.talkT -= dt; if (p.talkT <= 0) h.talking = false; }
    /* ---- people who stay where they are ---- */
    if (p.static) { if (!p.fixed && !p.spot) { h.root.visible = false; continue; } const vis = d < 130; h.root.visible = vis; if (!vis) continue;
      if (p.talks && p.talks !== p.lastTalks) { p.lastTalks = p.talks; h.talking = true; p.talkT = 4.5; p.lookHold = 5; }
      if (p.lookHold > 0) { p.lookHold -= dt; h.lookAt(px, phead, pz); if (p.lookHold <= 0) h.lookAt(null); }
      else if (p.cast && d < 7 && !car) { h.lookAt(px, phead, pz); p.looking = true; } else if (p.looking) { p.looking = false; h.lookAt(null); }
      else if (d < 3.2 && !p.group && !car) { p.glanceT -= dt; if (p.glanceT <= 0) { p.glanceT = 5 + Math.random() * 8; p.lookHold = 1.5 + Math.random() * 1.5; } }
      h.root.position.set(p.x, groundY(p.x, p.z), p.z); h.root.rotation.y += wrapA(p.yaw - h.root.rotation.y) * Math.min(1, dt * 6);
    } else {
      /* ---- walkers ---- */
      if (d > 300 && p.state !== 'down') { placeNpc(p, px, pz, 80, 180); h.root.visible = false; continue; }
      const vis = d < 150; h.root.visible = vis; let moveSpd = 0; const ox = p.x, oz = p.z;
      if (p.state === 'down') { if (!p.wasDown) { p.wasDown = true; const src = car || player; p.yaw = Math.atan2(src.x - p.x, src.z - p.z); h.root.rotation.y = p.yaw; const l = d || 1, k = car ? clamp(Math.abs(car.vf) * 0.25, 1, 4) : 1.1; p.vx = dxp / l * k; p.vz = dzp / l * k; h.lookAt(null); }
        p.x += p.vx * dt; p.z += p.vz * dt; const f = Math.max(0, 1 - dt * 3.5); p.vx *= f; p.vz *= f; p.timer -= dt; if (p.timer <= 0) { p.state = 'getup'; p.timer = 2.1; h.stop(); } }
      else if (p.state === 'getup') { p.wasDown = false; p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; p.cross = null; } }
      else if (p.state === 'talk') { p.timer -= dt; const ty = Math.atan2(px - p.x, pz - p.z); p.yaw += wrapA(ty - p.yaw) * Math.min(1, dt * 6); h.lookAt(px, phead, pz); if (p.timer <= 0 || d > 6) { p.state = 'walk'; h.stop(); h.lookAt(null); } }
      else if (p.state === 'pause') { p.timer -= dt; if (p.timer <= 0 || p.panic > 0) { p.state = 'walk'; if (h.override) h.stop(); } }
      else { /* walk */ if (p.wasDown) p.wasDown = false;
        if (carFast && d < 13) { const cf = Math.sin(car.yaw) * dxp + Math.cos(car.yaw) * dzp; if (cf > 0 && Math.abs(-Math.cos(car.yaw) * dxp + Math.sin(car.yaw) * dzp) < 3.5) p.panic = Math.max(p.panic, 2.5); }
        let spd = p.spd; if (p.panic > 0) { if (!p.wasPanic) { p.wasPanic = true; const r = ROADS[p.ri], q = roadPos(r, p.s, 0); if ((q.dx * p.dir) * -dxp + (q.dz * p.dir) * -dzp > 0) p.dir *= -1; h.lookAt(null); } p.panic -= dt; spd = Math.max(spd * 1.6, 3.3 + (i % 5) * 0.2); } else p.wasPanic = false;
        /* step aside for the player, glance at them now and then */
        let dodge = 0; if (d < 2.2 && !car) { const wx = Math.sin(p.yaw), wz = Math.cos(p.yaw), ahead = -(dxp * wx + dzp * wz), sidep = -(dxp * wz - dzp * wx); if (ahead > -0.3 && Math.abs(sidep) < 1.0) { dodge = sidep > 0 ? -0.75 : 0.75; if (ahead < 1.1 && Math.abs(sidep) < 0.45) spd *= 0.35; } }
        p.dodge += (dodge - p.dodge) * Math.min(1, dt * 3);
        if (d < 8 && !car && p.panic <= 0) { p.glanceT -= dt; if (p.glanceT <= 0) { p.glanceT = 6 + Math.random() * 10; p.glance = 1.2 + Math.random() * 1.6; } } if (p.glance > 0) { p.glance -= dt; if (p.glance > 0 && d < 9) h.lookAt(px, phead, pz); else { p.glance = 0; h.lookAt(null); } }
        p.sp += (spd - p.sp) * Math.min(1, dt * (spd > p.sp ? 2.2 : 4)); spd = p.sp;
        if (p.cross) { const c = p.cross, dx = c.x - p.x, dz = c.z - p.z, l = Math.hypot(dx, dz); if (l < 0.25) p.cross = null; else { p.x += dx / l * spd * dt; p.z += dz / l * spd * dt; p.yaw = Math.atan2(dx, dz); } }
        else { const r = ROADS[p.ri]; p.s += spd * dt * p.dir; if (p.s > r.L || p.s < 0) { const atEnd = p.s > r.L; const nx = nextRoad(r, atEnd, pedOK);
            if (nx) { p.ri = nx.ri; const r2 = ROADS[nx.ri]; p.dir = nx.end === 0 ? 1 : -1; p.s = nx.end === 0 ? 0 : r2.L; const q = roadPos(r2, p.s, walkOff(r2, p.side) + p.lat); p.cross = { x: q.x, z: q.z }; }
            else { p.dir *= -1; p.s = clamp(p.s, 0, r.L); p.side *= -1; const q = roadPos(r, p.s, walkOff(r, p.side) + p.lat); p.cross = { x: q.x, z: q.z }; } }
          if (!p.cross) { const r3 = ROADS[p.ri], q = roadPos(r3, p.s, walkOff(r3, p.side) + p.lat + p.dodge * p.dir * p.side * (p.side > 0 ? 1 : 1)); const dx = q.x - p.x, dz = q.z - p.z, l2 = dx * dx + dz * dz; if (l2 > 2.25) p.cross = { x: q.x, z: q.z }; else { if (l2 > 1e-6) p.yaw = Math.atan2(q.dx * p.dir + dx * 2, q.dz * p.dir + dz * 2); p.x = q.x; p.z = q.z; } } }
        /* now and then stop for a moment: check the phone, look around, take a photo, wave */
        if (vis && d < 70 && p.panic <= 0 && !p.jog && !p.cross) { p.pauseT -= dt; if (p.pauseT <= 0) { p.pauseT = 35 + Math.random() * 70; p.state = 'pause'; const r = Math.random(), a = r < 0.35 ? 'look_around' : r < 0.55 ? 'photo' : r < 0.7 ? 'think' : r < 0.82 ? 'yawn' : r < 0.92 ? 'wave' : 'stretch'; h.play(a); p.timer = (h.act && h.act.loop ? h.act.loop.dur : 3) + 0.4; } } }
      if (dt > 0) moveSpd = Math.hypot(p.x - ox, p.z - oz) / dt; p.mv = moveSpd;
      if (!vis) continue; h.root.position.set(p.x, groundY(p.x, p.z), p.z); h.root.rotation.y += wrapA(p.yaw - h.root.rotation.y) * Math.min(1, dt * (p.panic > 0 ? 9 : 5.5)); }
    /* ---- animate: near people every frame, far ones share a budget, people behind the camera not at all ---- */
    const bx = p.x - cxx, bz = p.z - czz, front = bx * fx + bz * fz; if (front < -3 && d > 6) { if (p.acc > 0.6) p.acc = 0.6; continue; }
    if (h.lod === 0 || d < 16) { h.update(p.acc, p.mv || 0, false); p.acc = 0; } else if (farDone < budget && (i + S.frame) % (d < 60 ? 2 : 4) === 0) { h.update(Math.min(p.acc, 0.25), p.mv || 0, false); p.acc = 0; farDone++; } } }
