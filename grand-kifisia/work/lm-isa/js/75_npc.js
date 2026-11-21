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

/* ---------- where things are ---------- */
/* every shop front from the map: { name, kind, x, z (on the facade), nx, nz (outward), tx, tz (along the facade), u0, u1 (frontage along the facade, m) } */
function shopSpots() { if (shopSpots.c) return shopSpots.c; const out = [];
  for (const b of MAP.buildings) { const shops = b[8]; if (!shops || !shops.length) continue; let ps = unp(b[10]); if (ps.length < 3) continue; const flip = polyArea(ps) < 0; if (flip) ps = ps.reverse(); const n = ps.length, mine = [];
    for (const s of shops) { let ei = s[0], t = s[1]; if (flip) { ei = (n - 2 - ei + n) % n; t = 1 - t; } const a = ps[ei], c = ps[(ei + 1) % n]; if (!a || !c) continue; const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.05) continue;
      mine.push({ name: s[2], kind: s[5], x: a[0] + dx * t, z: a[1] + dz * t, nx: dz / L, nz: -dx / L, tx: dx / L, tz: dz / L, L, ei, t, u0: -L * t, u1: L * (1 - t) }); }
    /* shops that share one facade edge split it half-way between their doors */
    for (const q of mine) for (const o of mine) { if (o === q || o.ei !== q.ei) continue; const d = (o.t - q.t) * q.L; if (d > 0) q.u1 = Math.min(q.u1, d / 2); else if (d < 0) q.u0 = Math.max(q.u0, d / 2); }
    for (const q of mine) out.push(q); }
  return shopSpots.c = out; }
/* a named place -> shop spot.  q: 'Sephora' (name contains), MAP.key name, or [x,z] */
function findPoi(q, fallback, xz) { const S = shopSpots(), has = n => S.find(s => s.name && s.name.toLowerCase().indexOf(String(n).toLowerCase()) >= 0);
  if (typeof q === 'string' && MAP.key && MAP.key[q.toLowerCase()]) { const k = MAP.key[q.toLowerCase()]; let best = null, bd = 30; for (const s of S) { const d = Math.hypot(s.x - k[0], s.z - k[1]); if (d < bd) { bd = d; best = s; } } if (best) return best; }
  let s = (typeof q === 'string' && has(q)) || (fallback && has(fallback)); if (s) return s;
  if (xz) { let best = null, bd = 40; for (const c of S) { const d = Math.hypot(c.x - xz[0], c.z - xz[1]); if (d < bd) { bd = d; best = c; } } return best; }
  return null; }
const EAT_KINDS = { cafe: 3, restaurant: 3, fast_food: 2, bakery: 1, bar: 2, coffee: 2, confectionery: 1, ice_cream: 1, pub: 2, mythos: 2, paul: 3, starbucks: 3, kfc: 2, tea: 1 }; // value = default number of terrace tables
const SHOP_KINDS = { clothes: 1, jewelry: 1, shoes: 1, bag: 1, gift: 1, books: 1, interior_decoration: 1, watches: 1, perfumery: 1, cosmetics: 1, chocolate: 1, fashion_accessories: 1, gallery: 1, optician: 1, houseware: 1 };
/* pavement = public sidewalk / square (level grid) or a private shop forecourt; everything else in a street is carriageway */
const onPave = (x, z) => lvl(x, z) > 0.05 || (typeof inShopZone === 'function' && inShopZone(x, z, 0.01));
const paveFree = (x, z, r) => inPlay(x, z) && onPave(x, z) && !collide({ x, z }, r || 0.45, null);

/* HOOK for world modules: whoever builds real seats (terrace chairs, benches, low walls people sit on) pushes them here at boot, before spawnPeople():
     if (typeof SEATS !== 'undefined') SEATS.push({ x, z, yaw, seatH, kind: 'chair' | 'bench', name, table: [x, z] })
   x,z = point on the ground under the sitter's hips, yaw = the way the sitter faces, seatH = seat height above the ground there, table = centre of the table the
   chair belongs to (chairs with the same table chat with each other).  People then use these seats, and no extra furniture is generated within 9 m of them. */
const SEATS = [];

/* ---------- THE seat finder: every place a person can sit or stand around, from map data ----------
   returns spots { role, x, z, yaw, seatH?, group?, slot?, name? }.  Roles: terrace (chair at a café table), bench, bus, platform, taxi, chat (standing pair),
   window (looking at a shop window).  Sources, in this order: SEATS (above), MAP.seats = [[xDm, zDm, yaw, seatH, 'chair'|'bench', name], ...] if the map has it,
   then estimates: bistro tables in front of the OSM cafés/restaurants (returned in findSeats.furniture and built here) and two seats on every MAP.props.bench. */
function findSeats() { const spots = [], chairs = [], tables = [], S = shopSpots(), groups = new Map();
  const group = (role, name) => ({ role, name: name || '', members: [], t: 2 + Math.random() * 6, speaker: 0 });
  const ext = SEATS.slice(); if (MAP.seats) for (const e of MAP.seats) ext.push({ x: e[0] / 10, z: e[1] / 10, yaw: e[2], seatH: e[3] || 0.46, kind: e[4] || 'bench', name: e[5] });
  for (const e of ext) { const role = e.kind === 'bench' ? 'bench' : 'terrace', key = e.group != null ? 'g' + e.group : e.table ? 't' + Math.round(e.table[0] * 4) + ',' + Math.round(e.table[1] * 4) : role === 'bench' ? 'b' + Math.round(e.x / 2) + ',' + Math.round(e.z / 2) : null;
    let g = key && groups.get(key); if (!g) { g = group(role, e.name); if (key) groups.set(key, g); }
    spots.push({ role, x: e.x, z: e.z, yaw: e.yaw || 0, seatH: e.seatH == null ? 0.46 : e.seatH, group: g, name: e.name, ext: true, tx: e.table ? e.table[0] : e.x + Math.sin(e.yaw || 0) * 0.6, tz: e.table ? e.table[1] : e.z + Math.cos(e.yaw || 0) * 0.6 }); }
  const hasExt = (x, z, r, role) => spots.some(q => q.ext && q.role === role && Math.hypot(q.x - x, q.z - z) < r);
  /* café / restaurant terraces: small bistro tables along the real shop front (and a second row where the forecourt is deep), never blocking the pavement */
  for (const s of S) { const want = EAT_KINDS[s.kind]; if (!want || !inFocus(s.x, s.z) || hasExt(s.x, s.z, 9, 'terrace')) continue; let made = 0;
    for (const row of [0.85, 2.75]) for (const u of row < 1 ? [1.9, -1.9, 4.1, -4.1, 6.3, -6.3] : [2.6, -2.6, 4.9, -4.9]) { if (made >= want) break; if (u < s.u0 + 0.9 || u > s.u1 - 0.9) continue;
      const x = s.x + s.tx * u + s.nx * row, z = s.z + s.tz * u + s.nz * row;
      if (!paveFree(x, z, 0.5) || !paveFree(x + s.tx * 0.64, z + s.tz * 0.64, 0.28) || !paveFree(x - s.tx * 0.64, z - s.tz * 0.64, 0.28) || !onPave(x + s.nx * 1.45, z + s.nz * 1.45)) continue;
      if (tables.some(t => Math.hypot(t[0] - x, t[2] - z) < 1.85)) continue;
      const yaw = Math.atan2(s.tx, s.tz), g = group('terrace', s.name); tables.push([x, groundY(x, z), z, yaw + hf(Math.round(x * 31 + z * 17)) * TAU]); made++;
      for (const k of [1, -1]) { const cx = x + s.tx * 0.64 * k, cz = z + s.tz * 0.64 * k, cyaw = Math.atan2(-s.tx * k, -s.tz * k) + (hf(Math.round(cx * 13 + cz * 7)) - 0.5) * 0.3; chairs.push([cx, groundY(cx, cz), cz, cyaw]); spots.push({ role: 'terrace', x: cx, z: cz, yaw: cyaw, seatH: 0.455, group: g, name: s.name, tx: x, tz: z }); } } }
  /* benches (same orientation rule as 50_props.js: yaw = hf(x)*TAU, seat 0.475 m, sitter faces local +z, hips 7 cm behind the seat centre) */
  for (const b of MAP.props.bench || []) { const x = b[0] / 10, z = b[1] / 10; if (hasExt(x, z, 1.6, 'bench')) continue; const yaw = hf(b[0]) * TAU, g = group('bench'); for (const k of [-0.45, 0.45]) spots.push({ role: 'bench', x: x + Math.cos(yaw) * k - Math.sin(yaw) * 0.07, z: z - Math.sin(yaw) * k - Math.cos(yaw) * 0.07, yaw, seatH: 0.475, group: g }); }
  /* bus stops: under the shelter, facing the road */
  if (typeof nearestRoad === 'function') for (const b of MAP.props.bus || []) { const x = b[0] / 10, z = b[1] / 10, r = nearestRoad(x, z); if (!r) continue; const yaw = Math.atan2(r.nx, r.nz);
    for (const k of [-0.8, 0.5, 1.9]) { const px = x + r.nx * 0.15 - r.nz * k, pz = z + r.nz * 0.15 + r.nx * k; if (lvl(px, pz) > 0.05) spots.push({ role: 'bus', x: px, z: pz, yaw: yaw + (hf(b[0] + k * 10) - 0.5) * 0.7, name: b[2] }); } }
  /* station platform: spread along the platform, facing the track */
  if (STATION.platform && TRAINPATH) for (let i = 0; i < 6; i++) { const p = atLen(TRAINPATH.ps, TRAINPATH.cum, 14 + i * 13 + hf(i * 7) * 5); const fx = Math.sin(p[2]), fz = Math.cos(p[2]);
    for (const sg of [1, -1]) { const off = (3 + hf(i * 13) * 3) * sg, x = p[0] + fz * off, z = p[1] - fx * off; if (pip(STATION.platform, x, z)) { spots.push({ role: 'platform', x, z, yaw: Math.atan2(p[0] - x, p[1] - z) + (hf(i) - 0.5) * 0.5 }); break; } } }
  /* taxi rank at Platanos square + standing pairs on squares, pedestrian streets and street corners */
  const P = MAP.key.platanos; let tx = 0; for (let a = 0; a < 24 && tx < 3; a++) { const ang = a / 24 * TAU + 0.3, rr = 5 + (a % 3) * 2.5, x = P[0] + Math.cos(ang) * rr, z = P[1] + Math.sin(ang) * rr; if (paveFree(x, z, 0.6) && lvl(x, z) > 0.05 && !spots.some(q => Math.hypot(q.x - x, q.z - z) < 2.5)) { spots.push({ role: 'taxi', x, z, yaw: Math.atan2(P[0] - x, P[1] - z) + Math.PI + (hf(a) - 0.5) }); tx++; } }
  const chatAt = (x, z, name) => { if (!paveFree(x, z, 0.9) || lvl(x, z) < 0.05 || spots.some(q => Math.hypot(q.x - x, q.z - z) < 3)) return; const a = hf(Math.round(x * 7 + z * 13)) * TAU, g = group('chat', name); for (const k of [1, -1]) spots.push({ role: 'chat', x: x + Math.sin(a) * 0.5 * k, z: z + Math.cos(a) * 0.5 * k, yaw: a + (k > 0 ? Math.PI : 0), group: g }); };
  ROADS.forEach((r, i) => { if (!r.focus || r.L < 14) return; if (r.ty === 6) { for (let q0 = 7; q0 < r.L - 5; q0 += 26) { const q = roadPos(r, q0 + hf(i * 31 + q0) * 8, (hf(i + q0) < 0.5 ? 1 : -1) * 1.3); chatAt(q.x, q.z, r.name); } } else if (r.ty <= 4 && r.side > 0 && hf(i * 17) < 0.45) { const q = roadPos(r, r.L * (0.3 + hf(i) * 0.4), walkOff(r, hf(i * 3) < 0.5 ? 1 : -1) + 0.9); chatAt(q.x, q.z, r.name); } });
  for (const k of [[4, 6], [-6, -5], [9, -3]]) chatAt(P[0] + k[0], P[1] + k[1], 'Platanos');
  /* window shopping: in front of the real shop windows, facing the glass */
  for (const s of S) { if (!SHOP_KINDS[s.kind] || !inFocus(s.x, s.z)) continue; const u = clamp((hf(Math.round(s.x * 11 + s.z * 3)) - 0.5) * 2.4, s.u0 + 0.5, s.u1 - 0.5), x = s.x + s.tx * u + s.nx * 1.15, z = s.z + s.tz * u + s.nz * 1.15; if (paveFree(x, z, 0.5) && !spots.some(q => Math.hypot(q.x - x, q.z - z) < 1.6)) spots.push({ role: 'window', x, z, yaw: Math.atan2(-s.nx, -s.nz), name: s.name, lx: s.x + s.tx * u * 1.5, lz: s.z + s.tz * u * 1.5 }); }
  for (const q of spots) if (q.group) { q.slot = q.group.members.length; q.group.members.push(null); q.group.spots = (q.group.spots || []).concat([q]); }
  findSeats.furniture = { chairs, tables }; return spots; }

/* ---------- terrace furniture (only for the estimated terraces above): bistro chair + 60 cm marble table with two coffees, instanced per 192 m chunk ---------- */
function furnGeo(parts) { const P = [], N = [], C = [], I = []; let base = 0; const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), col = new THREE.Color(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (const [g, c, x, y, z, rx, ry] of parts) { e.set(rx || 0, ry || 0, 0); q.setFromEuler(e); m.compose(v.set(x, y, z), q, one); g.applyMatrix4(m); col.set(c).convertSRGBToLinear(); const p = g.attributes.position, n = g.attributes.normal, ix = g.index;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); C.push(col.r, col.g, col.b); } for (let i = 0; i < ix.count; i++) I.push(base + ix.getX(i)); base += p.count; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); out.setIndex(I); return out; }
function buildTerraceFurniture(f) { if (!f || !f.tables.length || typeof instanced !== 'function') return; const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r0, r1, h, n) => new THREE.CylinderGeometry(r0, r1, h, n);
  const frame = '#2b2d2f', cane = '#c9a468', caneD = '#a8834c', marble = '#ebe8e1', china = '#f6f4ee', coffee = '#4a2f1c';
  /* chair: seat top at 0.455, back to -z (the sitter faces +z) */
  const ch = []; for (const sx of [-0.19, 0.19]) { ch.push([B(0.026, 0.44, 0.026), frame, sx, 0.22, 0.18]); ch.push([B(0.026, 0.9, 0.026), frame, sx, 0.45, -0.2, -0.1]); ch.push([B(0.022, 0.022, 0.36), frame, sx, 0.2, -0.01]); }
  ch.push([B(0.43, 0.03, 0.42), cane, 0, 0.44, 0]); ch.push([B(0.4, 0.3, 0.02), cane, 0, 0.7, -0.225, -0.1]); ch.push([B(0.43, 0.035, 0.03), caneD, 0, 0.885, -0.243, -0.1]); ch.push([B(0.36, 0.022, 0.022), frame, 0, 0.2, 0.18]);
  const tb = [[Cy(0.3, 0.3, 0.028, 16), marble, 0, 0.726, 0], [Cy(0.31, 0.31, 0.012, 16), frame, 0, 0.706, 0], [Cy(0.028, 0.034, 0.69, 8), frame, 0, 0.355, 0], [Cy(0.2, 0.23, 0.03, 12), frame, 0, 0.015, 0]];
  for (const k of [1, -1]) { tb.push([Cy(0.062, 0.05, 0.008, 10), china, 0.02 * k, 0.744, 0.17 * k]); tb.push([Cy(0.036, 0.027, 0.05, 8), china, 0.02 * k, 0.773, 0.17 * k]); tb.push([Cy(0.03, 0.03, 0.004, 8), coffee, 0.02 * k, 0.797, 0.17 * k]); }
  tb.push([Cy(0.03, 0.026, 0.11, 8), '#cfe3ea', -0.16, 0.795, 0.02]); tb.push([B(0.11, 0.012, 0.09), china, 0.15, 0.746, -0.03, 0, 0.5]);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), cg = furnGeo(ch), tg = furnGeo(tb), by = {};
  const chunkOf = (x, z) => typeof treeChunk === 'function' ? treeChunk(x, z) : { k: 'all', props: [] };
  for (const [list, key] of [[f.chairs, 'c'], [f.tables, 't']]) for (const it of list) { const c = chunkOf(it[0], it[2]), e = by[c.k] || (by[c.k] = { c, c_: [], t_: [] }); e[key + '_'].push(it); }
  STREET.furniture = []; for (const k in by) { const e = by[k]; for (const [geo, list] of [[cg, e.c_], [tg, e.t_]]) { const im = instanced(geo, mat, list, false); if (!im) continue; im.userData.cast = true; im.receiveShadow = true; e.c.props.push(im); STREET.furniture.push(im); } }
  if (typeof addBoxC === 'function') { for (const q of f.tables) addBoxC(q[0], q[2], 0.26, 'p'); for (const q of f.chairs) addBoxC(q[0], q[2], 0.2, 'p'); }
  if (typeof placed === 'function') for (const q of f.tables) placed('table', q[0], q[2], 'café table', 'estimated terrace in front of an OSM café/restaurant'); }

/* ---------- spawning ---------- */
const STYLE_CARRY = ['phone', 'text', 'bag', 'bag', 'drink'];
function newNpc(spec, o) { const h = new Ped(spec); const n = Object.assign({ h, x: 0, z: 0, yaw: 0, state: 'walk', static: null, timer: 0, panic: 0, ri: 0, s: 0, dir: 1, side: 1, cross: null, acc: 0, lat: 0, dodge: 0, glance: 0, glanceT: 2 + Math.random() * 6, pauseT: 20 + Math.random() * 50, vx: 0, vz: 0, lastTalks: 0, sp: 0 }, o || {});
  n.spd = n.spd || h.walkSpeed * R(0.94, 1.06) || 1.3; NPCS.push(n); return n; }
function initNpc(p) { p.acc = 0; p.lat = p.lat || 0; p.dodge = 0; p.glance = 0; p.glanceT = 3; p.pauseT = 30 + Math.random() * 40; p.vx = 0; p.vz = 0; p.lastTalks = p.talks || 0; p.sp = 0; if (p.panic === undefined) p.panic = 0; }
function spawnPeople(cx, cz) { if (!PPL.ready) return;
  STREET.spots = findSeats(); try { buildTerraceFurniture(findSeats.furniture); } catch (e) { console.warn('terrace furniture', e); }
  /* walkers: every one a different avatar first; styles = natural clip speed, some on the phone / texting / with a bag, two joggers */
  for (let k = 0; k < 30; k++) { const jog = k === 7 || k === 19; const spec = jog ? { av: k === 7 ? 'jog_m' : 'jog_f', scale: R(0.97, 1.03) } : randomLook(); const n = newNpc(spec, { lat: R(-0.45, 0.45) });
    if (jog) { n.spd = R(2.5, 2.9); n.jog = true; } else if (hf(k * 37 + 5) < 0.42) n.h.setCarry(STYLE_CARRY[Math.floor(hf(k * 91) * STYLE_CARRY.length)]);
    placeNpc(n, cx, cz, 3, k < 21 ? 140 : 260); n.h.root.rotation.y = n.yaw; }
  /* the pool that fills seats / stops / chat spots around the player */
  for (let k = 0; k < 24; k++) { const n = newNpc(randomLook(), { state: 'still', static: 'idle', spot: null }); STREET.pool.push(n); n.h.root.visible = false; }
  /* staff with a fixed place: the chef on a break next to Mythos Plus, a waiter at the nearest terrace, a delivery rider outside a fast-food place */
  const fixed = (spec, x, z, yaw, role, setup) => { if (!paveFree(x, z, 0.4)) { for (let a = 0; a < 8; a++) { const nx = x + Math.cos(a * 0.8) * 1.2, nz = z + Math.sin(a * 0.8) * 1.2; if (paveFree(nx, nz, 0.4)) { x = nx; z = nz; break; } } } const n = newNpc(spec, { state: 'still', static: role, x, z, yaw, fixed: true }); n.h.root.rotation.y = yaw; if (setup) setup(n); return n; };
  const my = SPECIAL.mythos; if (my) { let cx0 = my.door[0], cz0 = my.door[1]; for (const u of [4.6, -4.6, 6, -6, 3.4, -3.4]) { const x = my.door[0] - my.nz * u + my.nx * 0.75, z = my.door[1] + my.nx * u + my.nz * 0.75; if (paveFree(x, z, 0.4)) { cx0 = x; cz0 = z; break; } }
    fixed({ av: 'chef' }, cx0, cz0, Math.atan2(my.nx, my.nz) + 0.5, 'staff', n => { n.h.setCarry('phone'); n.name = 'Voula'; }); }
  const ter = STREET.spots.filter(s => s.role === 'terrace').sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
  if (ter) { const g = ter.group.spots, mx = (g[0].x + g[1].x) / 2, mz = (g[0].z + g[1].z) / 2, s = shopSpots().find(q => q.name === ter.name) || { nx: 0, nz: 1 }; fixed({ av: 'waiter' }, mx + s.nx * 1.25, mz + s.nz * 1.25, Math.atan2(-s.nx, -s.nz), 'staff', n => { n.name = 'Stelios'; }); }
  const ff = shopSpots().filter(s => (s.kind === 'fast_food' || s.kind === 'kfc') && inFocus(s.x, s.z)).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
  if (ff) fixed({ av: 'rider' }, ff.x - ff.tx * 2.2 + ff.nx * 1.1, ff.z - ff.tz * 2.2 + ff.nz * 1.1, Math.atan2(ff.nx, ff.nz) - 0.6, 'staff', n => { n.h.setCarry('text'); n.name = 'Babis'; });
  /* school kids at the ISA gate, daytime only */
  if (MAP.isa && MAP.isa.gate) { const g = MAP.isa.gate; let k = 0; for (let a = 0; a < 16 && k < 2; a++) { const x = g[0] + Math.cos(a * 0.7) * (2.5 + a * 0.25), z = g[1] + Math.sin(a * 0.7) * (2.5 + a * 0.25); if (!paveFree(x, z, 0.5) || pip(ISA.poly, x, z)) continue;
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
  else { if (r < 0.3) h.setCarry('text'); else if (r < 0.5) h.setCarry('phone'); else h.play('wait', { fade: 0.01 }); }
  /* take the new pose right now: people behind the camera are not animated, and nobody may ever be seen in a stale pose */
  h.root.position.set(n.x, groundY(n.x, n.z), n.z); h.update(0.05, 0, false); h.update(0.05, 0, false); n.acc = 0; }
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
