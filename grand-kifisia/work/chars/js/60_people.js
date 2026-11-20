'use strict';
/* Grand Kifisia — people.  Microsoft Rocketbox avatars (MIT) + Rocketbox motion capture, played by a small purpose-built
   animation runtime (no THREE.AnimationMixer, no THREE.Bone graph): clips are fixed-rate quantised quaternion tracks on one
   canonical 56-bone Biped skeleton, every person evaluates  state machine -> blended local pose -> additive layers -> FK ->
   foot IK -> skin matrices  straight into its Skeleton.boneMatrices.   Public API and data formats: docs/CHARACTERS.md      */

/* ---- hooks that boot() in 90_main.js still calls (the old procedural people needed them) ---- */
const chC = document.createElement('canvas'); chC.width = chC.height = 4;
function paintChar() {}
function makeClips() {}
let charMat = null;
const REAL = {}, POSES = {}; // referenced by the #debug hook in 90_main.js

/* ============================== DATA ============================== */
const PPL = { ready: false, av: {}, clips: {}, ids: [], list: [], NB: 56, NBODY: 23, par: null, names: null, deck: [], deckI: 0, stat: { near: 0, far: 0, anim: 0 } };
const BN = { ROOT: 0, PELVIS: 1, SPINE: 2, SPINE1: 3, SPINE2: 4, NECK: 5, HEAD: 6, LCLAV: 7, LUP: 8, LFORE: 9, LHAND: 10, RCLAV: 11, RUP: 12, RFORE: 13, RHAND: 14,
  LTHIGH: 15, LCALF: 16, LFOOT: 17, LTOE: 18, RTHIGH: 19, RCALF: 20, RFOOT: 21, RTOE: 22, JAW: 53, LLID: 54, RLID: 55 };
const P_INV = 1 / 32767; let LID_DROP = 0.0062, LID_FWD = 0.001;
function b64bytes(s) { const bin = atob(s), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u; }
const b64i16 = s => new Int16Array(b64bytes(s).buffer);

async function loadReal() {
  const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
  const [pp, an] = await Promise.all([get('models/rb_people.json'), get('models/rb_anims.json')]);
  PPL.NB = pp.skeleton.names.length; PPL.NBODY = pp.skeleton.nbody; PPL.par = Int8Array.from(pp.skeleton.parent); PPL.names = pp.skeleton.names;
  if (pp.skeleton.names[BN.RTOE] !== 'Bip01 R Toe0' || pp.skeleton.names[BN.JAW] !== 'Bip01 MJaw') throw new Error('people pack: unexpected skeleton');
  for (const id in pp.avatars) { const a = pp.avatars[id]; a.id = id; a.geo = [null, null]; a.mat = [null, null]; a.texUrl = a.tex; a.tex = null; a.nearN = 0; a.hiIdle = 0; a.hiUsed = false; prepAvatar(a); PPL.av[id] = a; PPL.ids.push(id); }
  PPL.clips = an.clips; for (const n in an.clips) an.clips[n].name = n;
  PPL.dummy = []; for (let i = 0; i < PPL.NB; i++) PPL.dummy.push(new THREE.Bone());
  PPL.ident = PPL.dummy.map(() => new THREE.Matrix4());
  try { PPL.cast = await get('models/cast.json'); } catch (e) { console.warn('cast.json missing', e); PPL.cast = { characters: [] }; }
  if (PPL.cast.player && PPL.cast.player.av && PPL.av[PPL.cast.player.av]) PPL.av[PPL.cast.player.av].street = false; // nobody else wears the player's face
  PPL.ready = true; REAL.ready = true;
}
/* rest pose of one avatar in character space: local offsets, inverse world rotations, world positions */
function prepAvatar(a) {
  const NB = PPL.NB, par = PPL.par, t = Float32Array.from(a.rest.t), q = Float32Array.from(a.rest.q), wq = new Float32Array(NB * 4), wp = new Float32Array(NB * 3);
  for (let i = 0; i < NB; i++) { const p = par[i];
    if (p < 0) { wq.set(q.subarray(0, 4), 0); wp.set(t.subarray(0, 3), 0); } else { qmulTo(wq, i * 4, wq, p * 4, q, i * 4); qrotTo(wp, i * 3, wq, p * 4, t[i * 3], t[i * 3 + 1], t[i * 3 + 2]); wp[i * 3] += wp[p * 3]; wp[i * 3 + 1] += wp[p * 3 + 1]; wp[i * 3 + 2] += wp[p * 3 + 2]; } }
  const wqi = new Float32Array(NB * 4); for (let i = 0; i < NB; i++) { wqi[i * 4] = -wq[i * 4]; wqi[i * 4 + 1] = -wq[i * 4 + 1]; wqi[i * 4 + 2] = -wq[i * 4 + 2]; wqi[i * 4 + 3] = wq[i * 4 + 3]; }
  a.rt = t; a.rq = q; a.rwq = wq; a.rwqi = wqi; a.rwp = wp;
  const d = (i, j) => Math.hypot(wp[i * 3] - wp[j * 3], wp[i * 3 + 1] - wp[j * 3 + 1], wp[i * 3 + 2] - wp[j * 3 + 2]);
  a.thigh = d(BN.LTHIGH, BN.LCALF); a.shin = d(BN.LCALF, BN.LFOOT); a.fem = a.sex === 'f';
  a.street = a.tags.indexOf('street') >= 0;
}
function clipGet(name) { const c = PPL.clips[name]; if (!c) return null;
  if (!c.Q) { c.R = b64i16(c.r); c.K = b64i16(c.k); c.Q = b64i16(c.q); c.na = c.a.length; c.dur = c.loop ? c.n / c.f : (c.n - 1) / c.f; if (c.D) c.D = new Uint16Array(b64bytes(c.D).buffer); if (c.gs) c.gs = new Int8Array(b64bytes(c.gs).buffer); if (c.Y) c.Y = b64i16(c.Y); c.r = c.k = c.q = null; }
  return c; }
/* clip lookup by sex with fall-backs:  'walk_neutral_01' -> m_walk_neutral_01 / f_walk_neutral_01 / hk_... (hand-keyed, unisex) */
const CLIP_ALT = { newspaper: { m: 'newspaper_arm_idle', f: 'newspaper_hand_idle' }, bag: { m: 'hold_bag_idle', f: 'hold_bag_idle_01' }, cheer: { m: 'cheer_01', f: 'cheer_03' },
  fidget_a: { m: 'idle_touch_face_01', f: 'idle_touch_hair_01' }, fidget_b: { m: 'idle_shake_leg_01', f: 'idle_move_leg_01' }, walk_alt: { m: 'walk_neutral_03', f: 'walk_self-assured' } };
function clipFor(sex, base) { if (CLIP_ALT[base]) base = CLIP_ALT[base][sex]; return clipGet(sex + '_' + base) || clipGet('hk_' + base) || clipGet(base) || clipGet((sex === 'm' ? 'f_' : 'm_') + base); }

/* ---- geometry + material per avatar (shared by everybody who wears that avatar) ---- */
function avatarGeo(a, l) { if (a.geo[l]) return a.geo[l];
  const L = a.lod[l], g = new THREE.BufferGeometry(), p16 = b64i16(L.p), pos = new Float32Array(p16.length), k = a.ps / 32767; for (let i = 0; i < pos.length; i++) pos[i] = p16[i] * k;
  const bi = b64bytes(L.bi), bw = b64bytes(L.bw), tw = new Uint8Array(L.nv * 2);
  for (let v = 0; v < L.nv; v++) { let top = 0, bot = 0; for (let c = 0; c < 4; c++) { const b = bi[v * 4 + c], w = bw[v * 4 + c]; if ((b >= BN.SPINE && b <= BN.SPINE2) || b === BN.LCLAV || b === BN.RCLAV || b === BN.LUP || b === BN.RUP || b === BN.LFORE || b === BN.RFORE) top += w; else if (b === BN.PELVIS || b === BN.LTHIGH || b === BN.RTHIGH || b === BN.LCALF || b === BN.RCALF) bot += w; } tw[v * 2] = Math.min(255, top); tw[v * 2 + 1] = Math.min(255, bot); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(b64bytes(L.n).buffer), 3, true));
  g.setAttribute('uv', new THREE.BufferAttribute(new Uint16Array(b64bytes(L.uv).buffer), 2, true)); g.setAttribute('skinIndex', new THREE.BufferAttribute(bi, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(bw, 4, true));
  g.setAttribute('tintW', new THREE.BufferAttribute(tw, 2, true)); g.setIndex(new THREE.BufferAttribute(new Uint16Array(b64bytes(L.ix).buffer), 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, a.h * 0.5, 0), a.h * 0.85); g.boundingBox = new THREE.Box3(new THREE.Vector3(-1, -0.3, -1), new THREE.Vector3(1, a.h + 0.3, 1));
  L.p = L.n = L.uv = L.bi = L.bw = L.ix = null; a.geo[l] = g; return g; }
const WHITE3 = new THREE.Color(1, 1, 1);
/* textures: an avatar's 768x512 atlas is fetched once.  A 192x128 copy of it dresses that avatar at the far LOD; the full atlas is on the GPU
   only while somebody nearby wears it (updateLOD() releases it a few seconds after the last near wearer left) - ~25 MB instead of ~80 MB */
function avatarTex(a) { if (a.img) return; const img = a.img = new Image(), c = document.createElement('canvas'); c.width = 192; c.height = 128; a.texPending = true; a.texReady = false;
  const hi = a.texHi = new THREE.Texture(img); hi.flipY = false; hi.encoding = THREE.sRGBEncoding; hi.anisotropy = 4;
  const lo = a.texLo = new THREE.CanvasTexture(c); lo.flipY = false; lo.encoding = THREE.sRGBEncoding; a.tex = hi;
  img.onload = () => { const g = c.getContext('2d'); g.clearRect(0, 0, 192, 128); g.drawImage(img, 0, 0, 192, 128); lo.needsUpdate = true; hi.needsUpdate = true; a.texPending = false; a.texReady = true; };
  img.onerror = () => { a.texPending = false; console.warn('people: texture missing', a.texUrl); };
  img.src = a.texUrl || ('models/tex/' + a.id + '.webp'); }
/* material of avatar a for LOD l (0 near, 1 far); tint = [topHex, bottomHex] gives a private pair */
function avatarMat(a, tint, l) { avatarTex(a);
  if (!tint && a.mat[l]) return a.mat[l];
  const m = new THREE.MeshLambertMaterial({ map: l ? a.texLo : a.texHi, alphaTest: 0.42, side: THREE.DoubleSide });
  m.userData.tintA = { value: tint && tint[0] ? new THREE.Color(tint[0]) : WHITE3 }; m.userData.tintB = { value: tint && tint[1] ? new THREE.Color(tint[1]) : WHITE3 };
  m.onBeforeCompile = sh => { sh.uniforms.tintA = m.userData.tintA; sh.uniforms.tintB = m.userData.tintB;
    sh.vertexShader = 'attribute vec2 tintW;uniform vec3 tintA;uniform vec3 tintB;varying vec3 vTint;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint=mix(vec3(1.0),tintA,tintW.x)*mix(vec3(1.0),tintB,tintW.y);');
    sh.fragmentShader = 'varying vec3 vTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb*=mix(vec3(1.0),vTint,clamp((1.0-diffuseColor.a)*2.6,0.0,1.0));'); };
  m.customProgramCacheKey = () => 'gkPerson';
  if (!tint) a.mat[l] = m; return m; }

/* ============================== MATH (flat arrays, no allocation) ============================== */
function qmulTo(o, oi, a, ai, b, bi) { const ax = a[ai], ay = a[ai + 1], az = a[ai + 2], aw = a[ai + 3], bx = b[bi], by = b[bi + 1], bz = b[bi + 2], bw = b[bi + 3];
  o[oi] = aw * bx + ax * bw + ay * bz - az * by; o[oi + 1] = aw * by - ax * bz + ay * bw + az * bx; o[oi + 2] = aw * bz + ax * by - ay * bx + az * bw; o[oi + 3] = aw * bw - ax * bx - ay * by - az * bz; }
function qrotTo(o, oi, q, qi, x, y, z) { const qx = q[qi], qy = q[qi + 1], qz = q[qi + 2], qw = q[qi + 3], tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  o[oi] = x + qw * tx + (qy * tz - qz * ty); o[oi + 1] = y + qw * ty + (qz * tx - qx * tz); o[oi + 2] = z + qw * tz + (qx * ty - qy * tx); }
/* quaternion for small character-space Euler angles (x pitch, y yaw, z roll), applied X then Y then Z */
function eulerTo(o, oi, x, y, z) { const c1 = Math.cos(x / 2), s1 = Math.sin(x / 2), c2 = Math.cos(y / 2), s2 = Math.sin(y / 2), c3 = Math.cos(z / 2), s3 = Math.sin(z / 2);
  o[oi] = s1 * c2 * c3 - c1 * s2 * s3; o[oi + 1] = c1 * s2 * c3 + s1 * c2 * s3; o[oi + 2] = c1 * c2 * s3 - s1 * s2 * c3; o[oi + 3] = c1 * c2 * c3 + s1 * s2 * s3; }
/* dst = nlerp(dst, src, w) for the first nb bones */
function poseBlend(dst, src, w, nb) { if (w <= 0) return; if (w >= 1) { for (let i = 0, e = nb * 4; i < e; i++) dst[i] = src[i]; return; }
  for (let i = 0, e = nb * 4; i < e; i += 4) { const ax = dst[i], ay = dst[i + 1], az = dst[i + 2], aw = dst[i + 3]; let bx = src[i], by = src[i + 1], bz = src[i + 2], bw = src[i + 3];
    if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
    const x = ax + (bx - ax) * w, y = ay + (by - ay) * w, z = az + (bz - az) * w, ww = aw + (bw - aw) * w, l = 1 / Math.sqrt(x * x + y * y + z * z + ww * ww); dst[i] = x * l; dst[i + 1] = y * l; dst[i + 2] = z * l; dst[i + 3] = ww * l; } }
function poseBlendMask(dst, src, w, mask) { for (let k = 0; k < mask.length; k++) { const i = mask[k] * 4; const ax = dst[i], ay = dst[i + 1], az = dst[i + 2], aw = dst[i + 3]; let bx = src[i], by = src[i + 1], bz = src[i + 2], bw = src[i + 3];
    if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
    const x = ax + (bx - ax) * w, y = ay + (by - ay) * w, z = az + (bz - az) * w, ww = aw + (bw - aw) * w, l = 1 / Math.sqrt(x * x + y * y + z * z + ww * ww); dst[i] = x * l; dst[i + 1] = y * l; dst[i + 2] = z * l; dst[i + 3] = ww * l; } }
/* sample clip c at time t (s) into out (local rotations of the first nb bones) and outR (root position, metres of the SOURCE skeleton) */
function clipSample(c, t, out, outR, nb) { const n = c.n; let f = t * c.f, i0, i1;
  if (c.loop) { f = f % n; if (f < 0) f += n; i0 = Math.floor(f); if (i0 >= n) i0 = n - 1; i1 = i0 + 1; if (i1 >= n) i1 = 0; } else { if (f < 0) f = 0; else if (f > n - 1) f = n - 1; i0 = Math.floor(f); i1 = i0 + 1; if (i1 > n - 1) i1 = n - 1; }
  const fr = f - i0, K = c.K; for (let i = 0, e = nb * 4; i < e; i++) out[i] = K[i] * P_INV;
  const A = c.a, na = c.na, Qd = c.Q; let o0 = i0 * na * 4, o1 = i1 * na * 4;
  for (let a = 0; a < na; a++, o0 += 4, o1 += 4) { const b = A[a]; if (b >= nb) continue; const x0 = Qd[o0], y0 = Qd[o0 + 1], z0 = Qd[o0 + 2], w0 = Qd[o0 + 3]; let x1 = Qd[o1], y1 = Qd[o1 + 1], z1 = Qd[o1 + 2], w1 = Qd[o1 + 3];
    if (x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1 < 0) { x1 = -x1; y1 = -y1; z1 = -z1; w1 = -w1; }
    const x = x0 + (x1 - x0) * fr, y = y0 + (y1 - y0) * fr, z = z0 + (z1 - z0) * fr, w = w0 + (w1 - w0) * fr, l = 1 / Math.sqrt(x * x + y * y + z * z + w * w), bo = b * 4; out[bo] = x * l; out[bo + 1] = y * l; out[bo + 2] = z * l; out[bo + 3] = w * l; }
  const Rr = c.R, r0 = i0 * 3, r1 = i1 * 3, s = 1 / 8192; outR[0] = (Rr[r0] + (Rr[r1] - Rr[r0]) * fr) * s; outR[1] = (Rr[r0 + 1] + (Rr[r1 + 1] - Rr[r0 + 1]) * fr) * s; outR[2] = (Rr[r0 + 2] + (Rr[r1 + 2] - Rr[r0 + 2]) * fr) * s; }
const S_A = new Float32Array(56 * 4), S_B = new Float32Array(56 * 4), S_C = new Float32Array(56 * 4), S_RA = new Float32Array(3), S_RB = new Float32Array(3), S_RC = new Float32Array(3), S_Q = new Float32Array(16), S_V = new Float32Array(12);

/* two-bone IK for a leg whose thigh is bone th (calf th+1, foot th+2, toe th+3): move the ankle to (tx,ty,tz) in character space,
   keep the knee in its animated plane and the foot in its animated orientation; rewrites world rotations/positions only */
function ikLeg(P, th, tx, ty, tz) { const wq = P.wq, wp = P.wp, a = th * 3, b = a + 3, c = a + 6, qa = th * 4, qb = qa + 4;
  const pax = wp[a], pay = wp[a + 1], paz = wp[a + 2]; let ux = wp[b] - pax, uy = wp[b + 1] - pay, uz = wp[b + 2] - paz; const l1 = Math.sqrt(ux * ux + uy * uy + uz * uz);
  let fx = wp[c] - wp[b], fy = wp[c + 1] - wp[b + 1], fz = wp[c + 2] - wp[b + 2]; const l2 = Math.sqrt(fx * fx + fy * fy + fz * fz);
  let vx = tx - pax, vy = ty - pay, vz = tz - paz, d = Math.sqrt(vx * vx + vy * vy + vz * vz); if (d < 1e-5) return; vx /= d; vy /= d; vz /= d; const dmax = (l1 + l2) * 0.9985, dmin = Math.abs(l1 - l2) + 0.03; if (d > dmax) d = dmax; else if (d < dmin) d = dmin;
  /* pole = animated knee direction, made perpendicular to the new hip->ankle line */
  let px = ux, py = uy, pz = uz; let dd = px * vx + py * vy + pz * vz; px -= vx * dd; py -= vy * dd; pz -= vz * dd; let pl = Math.sqrt(px * px + py * py + pz * pz); if (pl < 0.02) { px = 0; py = 0; pz = 1; dd = vz; px -= vx * dd; py -= vy * dd; pz -= vz * dd; pl = Math.sqrt(px * px + py * py + pz * pz) || 1; } px /= pl; py /= pl; pz /= pl;
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x)), ex = vx * x + px * h, ey = vy * x + py * h, ez = vz * x + pz * h; /* new knee, relative to the hip */
  /* r1: thigh direction u -> e */
  let rx = uy * ez - uz * ey, ry = uz * ex - ux * ez, rz = ux * ey - uy * ex, rw = l1 * l1 + ux * ex + uy * ey + uz * ez, rl = Math.sqrt(rx * rx + ry * ry + rz * rz + rw * rw); if (rl < 1e-9) return; rx /= rl; ry /= rl; rz /= rl; rw /= rl;
  S_Q[0] = rx; S_Q[1] = ry; S_Q[2] = rz; S_Q[3] = rw; qmulTo(wq, qa, S_Q, 0, wq, qa); qmulTo(S_Q, 4, S_Q, 0, wq, qb); qrotTo(S_V, 0, S_Q, 0, fx, fy, fz); fx = S_V[0]; fy = S_V[1]; fz = S_V[2];
  /* r2: fore direction f -> (target - knee) */
  const gx = vx * d - ex, gy = vy * d - ey, gz = vz * d - ez; rx = fy * gz - fz * gy; ry = fz * gx - fx * gz; rz = fx * gy - fy * gx; rw = l2 * l2 + fx * gx + fy * gy + fz * gz; rl = Math.sqrt(rx * rx + ry * ry + rz * rz + rw * rw);
  if (rl > 1e-9) { S_Q[8] = rx / rl; S_Q[9] = ry / rl; S_Q[10] = rz / rl; S_Q[11] = rw / rl; qmulTo(wq, qb, S_Q, 8, S_Q, 4); } else { wq[qb] = S_Q[4]; wq[qb + 1] = S_Q[5]; wq[qb + 2] = S_Q[6]; wq[qb + 3] = S_Q[7]; }
  wp[b] = pax + ex; wp[b + 1] = pay + ey; wp[b + 2] = paz + ez; const ox = pax + vx * d - wp[c], oy = pay + vy * d - wp[c + 1], oz = paz + vz * d - wp[c + 2]; wp[c] += ox; wp[c + 1] += oy; wp[c + 2] += oz; wp[c + 3] += ox; wp[c + 4] += oy; wp[c + 5] += oz; }

/* ============================== ACTIONS ============================== */
/* A named action = an optional lead-in clip, a body (looping activity with random fidgets, or a one-shot), an optional lead-out clip.
   c: clip base name or list (one is picked per play)   mode: loop | once | hold (one-shot that keeps its last frame until stop())
   fid: fidget one-shots mixed into a loop   mask: 'upper' -> while moving only arms+head come from the clip, the legs keep walking
   nolook: head look-at is switched off   seat: sitting (pelvis is put on the seat, feet are not IK-planted)   fade: cross-fade seconds  */
const ACTIONS = {
  idle: { c: ['idle_neutral_01', 'idle_neutral_02', 'idle_neutral_03'], mode: 'loop', fid: ['idle_look_around_01', 'idle_look_around_02', 'idle_scratch_head_01', 'fidget_a', 'fidget_b', 'idle_roll_head_01'] },
  wait: { c: ['idle_waiting_01', 'idle_neutral_02'], mode: 'loop', fid: ['idle_look_around_01', 'idle_look_around_02', 'idle_yawn_01', 'idle_stretch_arms_01', 'fidget_b'] },
  talk: { c: ['gestic_talk_neutral_01', 'gestic_talk_relaxed_01', 'gestic_talk_excited_01'], mode: 'loop', fid: ['gestic_shrug_01', 'gestic_laugh_low'], fidEvery: [5, 11], jaw: 1 },
  listen: { c: ['gestic_listen_neutral_01'], mode: 'loop', fid: ['gestic_listen_accept_01', 'gestic_laugh_low', 'gestic_thoughtful_01'], fidEvery: [3, 8] },
  phone: { c: ['cell_phone_talk_01'], mode: 'loop', mask: 'upperR', jaw: 1, prop: 'phone' },
  text: { c: ['cell_phone_textmessage'], mode: 'loop', mask: 'upper', nolook: true, prop: 'phone' },
  drink: { c: ['drink_drinking'], mode: 'loop', mask: 'upperR', prop: 'cup' },
  newspaper: { c: ['newspaper'], mode: 'loop', nolook: true, prop: 'paper' },
  bag: { c: ['bag'], mode: 'loop', mask: 'armR', prop: 'bag' },
  trolley: { c: ['trolley_idle'], mode: 'loop' },
  sit: { c: ['sit_chair_idle_neutral_01', 'sit_chair_idle_relaxed_01'], mode: 'loop', fid: ['sit_chair_idle_look_around'], fidEvery: [6, 14], seat: 1 },
  sit_table: { c: ['sit_table_idle_neutral_01', 'sit_table_idle_relaxed_01'], mode: 'loop', fid: ['sit_table_gestic_thoughtful'], fidEvery: [7, 16], seat: 1 },
  wave: { c: ['wave_01'], mode: 'once' }, wave_long: { c: ['wave_02'], mode: 'once' }, cheer: { c: ['cheer'], mode: 'once' }, clap: { c: ['claphands_01'], mode: 'loop' }, dance: { c: ['dancing_cool'], mode: 'loop' },
  photo: { c: ['take_picture'], mode: 'once', prop: 'phone' }, knock: { c: ['knock_door'], mode: 'once' }, shrug: { c: ['gestic_shrug_01'], mode: 'once' }, laugh: { c: ['gestic_laugh_low'], mode: 'once' },
  yawn: { c: ['idle_yawn_01'], mode: 'once' }, stretch: { c: ['idle_stretch_arms_01'], mode: 'once' }, look_around: { c: ['idle_look_around_01', 'idle_look_around_02'], mode: 'once' }, think: { c: ['gestic_thoughtful_01'], mode: 'once' },
  crouch: { c: ['crouch_idle'], mode: 'loop', in: 'crouch_in', out: 'crouch_out' },
  /* hand-keyed (tools/chars/handkeyed.js) */
  punch: { c: ['punch_r', 'punch_l'], mode: 'once', fade: 0.08, nolook: true }, shoot: { c: ['shoot'], mode: 'hold', fade: 0.1, nolook: true }, climb: { c: ['climb'], mode: 'hold', fade: 0.1, nolook: true },
  lie: { c: ['lie'], mode: 'loop', in: 'knockdown', out: 'getup', fade: 0.08, nolook: true, flat: 1 }, eat: { c: ['eat'], mode: 'loop', fade: 0.3, prop: 'pita' },
  drive: { c: ['drive'], mode: 'loop', seat: 1, fade: 0.2 }, sit_ground: { c: ['sit_ground'], mode: 'loop', seat: 2 }, give: { c: ['give'], mode: 'once' }, pickup: { c: ['pickup'], mode: 'once', nolook: true },
};
const MASKS = {};
(function () { const armL = [BN.LCLAV, BN.LUP, BN.LFORE, BN.LHAND], armR = [BN.RCLAV, BN.RUP, BN.RFORE, BN.RHAND]; for (let i = 23; i < 38; i++) armL.push(i); for (let i = 38; i < 53; i++) armR.push(i);
  MASKS.armL = armL; MASKS.armR = armR; MASKS.upperR = armR.concat([BN.NECK, BN.HEAD]); MASKS.upperL = armL.concat([BN.NECK, BN.HEAD]); MASKS.upper = armL.concat(armR, [BN.NECK, BN.HEAD]); })();

/* ---- hand props (near LOD only). Hand space: x towards the fingers, y out of the palm, z towards the thumb (right hand) ---- */
const PROPS = { defs: {
  phone: { hand: 'R', geo: () => new THREE.BoxGeometry(0.145, 0.009, 0.07), col: 0x15171a, pos: [0.085, 0.024, 0.004], rot: [0, 0, 0] },
  cup: { hand: 'R', geo: () => { const g = new THREE.CylinderGeometry(0.036, 0.028, 0.11, 10); g.rotateX(Math.PI / 2); return g; }, col: 0xf1ece2, pos: [0.078, 0.042, 0.01], rot: [0, 0, 0] },
  pita: { hand: 'R', geo: () => { const g = new THREE.ConeGeometry(0.04, 0.17, 8); g.rotateX(-Math.PI / 2); return g; }, col: 0xe2c48f, pos: [0.075, 0.04, 0.03], rot: [0, 0, 0] },
  bag: { hand: 'R', hang: true, geo: () => { const g = new THREE.BoxGeometry(0.1, 0.3, 0.27); g.translate(0, -0.25, 0); return g; }, col: 0xd9c9a8, pos: [0.06, 0, 0], rot: [0, 0, 0] } }, geo: {}, mat: {} };
function propMesh(name, col) { const d = PROPS.defs[name]; if (!d) return null; const g = PROPS.geo[name] || (PROPS.geo[name] = d.geo()), c = col == null ? d.col : col, m = PROPS.mat[c] || (PROPS.mat[c] = new THREE.MeshLambertMaterial({ color: c })); const o = new THREE.Mesh(g, m); o.castShadow = true; o.userData.def = d; o.userData.name = name; return o; }

/* ============================== PERSON ============================== */
/* spec: avatar id ('m16') | { av, scale, build, tint:[top,bottom], walk, name, ... } | a legacy look object { fem, height, ... } */
const GAITS = { m: { slow: ['walk_stroll_01', 'walk_slow_01', 'walk_stroll_02'], walk: ['walk_neutral_01', 'walk_cool_01', 'walk_neutral_02', 'walk_neutral_03'], brisk: 'walk_fast_02', run: ['run_slow_01', 'run_neutral_01', 'run_fast_01'] },
  f: { slow: ['walk_stroll_01', 'walk_slow_01', 'walk_stroll_02'], walk: ['walk_neutral_01', 'walk_cool_01', 'walk_neutral_02', 'walk_self-assured', 'walk_neutral_03'], brisk: 'walk_fast_01', run: ['run_slow_01', 'run_neutral_01', 'run_fast_01'] } };
let personSeq = 0;
class Person {
  constructor(spec, force) {
    if (typeof spec === 'string') spec = { av: spec }; spec = spec || {};
    /* roles: 'player' = the hero from models/cast.json.  Old call sites pass a procedural "look" ({shirt, hair, cap...}): the forced one is the player, a cap means the guard */
    const legacy = spec.av == null && (spec.shirt !== undefined || spec.hairStyle !== undefined);
    if (spec.av === 'player' || (legacy && force && !spec.cap)) spec = Object.assign({ name: spec.name }, (PPL.cast && PPL.cast.player) || { av: 'm16' });
    else if (legacy && spec.cap) spec = { av: 'guard', scale: 1.02 };
    this.seq = spec.seed != null ? spec.seed : personSeq++; const h = hf(this.seq * 7919 + 13);
    let id = spec.av; if (!id || !PPL.av[id]) id = pickAvatar(spec.fem === undefined ? null : (spec.fem ? 'f' : 'm'));
    const a = this.av = PPL.av[id] || null; this.spec = spec; this.name = spec.name || null;
    this.look = { fem: a ? a.fem : !!spec.fem, av: id }; // .look.fem is read by the talk code
    this.root = new THREE.Group(); this.root.rotation.order = 'YXZ'; scene.add(this.root); this.lod = -1; this.mesh = [null, null]; this.override = null; this.dist = 0;
    if (!a) return;
    const sc = spec.scale || (spec.height && spec.height > 0.8 && spec.height < 1.2 ? spec.height : 1), bd = spec.build && spec.build > 0.8 && spec.build < 1.25 ? spec.build : 1;
    this.scale = sc; this.root.scale.set(sc * bd, sc, sc * (1 + (bd - 1) * 0.6));
    this.tint = spec.tint || null; this.mats = [avatarMat(a, this.tint, 0), avatarMat(a, this.tint, 1)]; this.texOK = false;
    const NB = PPL.NB; this.lq = new Float32Array(NB * 4); this.wq = new Float32Array(NB * 4); this.wp = new Float32Array(NB * 3); this.rp = new Float32Array(3); this.snap = new Float32Array(NB * 4); this.snapR = new Float32Array(3);
    for (let i = 0; i < NB * 4; i++) this.lq[i] = a.rq[i]; this.rp.set(a.rt.subarray(0, 3));
    this.skel = new THREE.Skeleton(PPL.dummy, PPL.ident); this.skel.update = function () {};
    this.fade = 0; this.fadeDur = 0.25; this.t = h * 50; this.act = null; this.carry = null; this.prop = null; this.actProp = false;
    this.aq = new Float32Array(5 * 4); this.lookT = null; this.lookYaw = 0; this.lookPitch = 0; this.lookW = 0; this.lean = 0; this.pitch = 0; this.lastYaw = null; this.yawRate = 0; this.lastSpd = 0; this.airW = 0; this.lastY = null; this.vy = 0; this.land = 0;
    this.ik = true; this.pelY = 0; this.footY = [0, 0]; this.jaw = 0; this.talking = false; this.jawOpen = null; this.blink = 0; this.blinkT = 1 + h * 4; this.blinkHold = null; this.sy = null; this.landV = 0; this.wasAir = false; this.seatH = null; this.noIK = false; this.posture = spec.posture != null ? spec.posture : (a.age === 'senior' ? 0.05 : 0); this.nodT = 0;
    this.setStyle(spec);
    this.stand = this._activity(ACTIONS[spec.idle || 'idle']);
    PPL.list.push(this); this.setLOD(force ? 0 : 1); this.forceNear = !!force;
    this.update(0, 0, false);
  }
  /* locomotion of this person: a walk family and a run family, each a list [{c, v, st}] sorted by natural speed (character-space m/s, stride m) */
  setStyle(spec) { const a = this.av, G = GAITS[a.sex], h = hf(this.seq * 131 + 7);
    const mk = names => { const list = []; for (const n of names) { const c = clipFor(a.sex, n); if (!c || !c.dist) continue; const k = a.hip / c.hip; list.push({ c, v: c.speed * k, st: c.dist / (c.cyc || 1) * k }); }
      list.sort((x, y) => x.v - y.v); const out = []; for (const e of list) { if (!out.length || e.v > out[out.length - 1].v + 0.12) out.push(e); } return out; };
    const old = a.age === 'senior';
    const walk = spec.walk || (old ? ['walk_neutral_01', 'walk_cool_01', 'walk_slow_01'][Math.floor(h * 3)] : G.walk[Math.floor(h * G.walk.length)]);
    this.gaitW = mk([G.slow[Math.floor(hf(this.seq * 17 + 3) * G.slow.length)], walk, G.brisk]); this.gaitR = mk(G.run); this.gait = this.gaitW;
    this.walkClip = clipFor(a.sex, walk); const wc = this.walkClip;
    this.walkSpeed = (wc ? wc.speed * a.hip / wc.hip : 1.2) * this.scale; // natural walking speed in world m/s
    const wmax = this.gaitW[this.gaitW.length - 1].v, rmin = this.gaitR.length ? this.gaitR[0].v : 9;
    this.runOn = Math.min(wmax * 1.2, rmin * 1.02); this.runOff = this.runOn * 0.88; this.runW = 0; this.runT = 0;
    this.g = h; this.gv = 0; this.idleT = 0; this.stepSide = h < 0.5; }
  _activity(def) { const a = this.av, s = { def, loop: null, lt: 0, fid: null, ft: 0, next: 0, fids: [] }; const h = hf(this.seq * 31 + (def.c[0].length * 7));
    s.loop = clipFor(a.sex, def.c[Math.floor(h * def.c.length) % def.c.length]); if (s.loop) s.lt = h * s.loop.dur;
    if (def.fid) for (const n of def.fid) { const c = clipFor(a.sex, n); if (c) s.fids.push(c); }
    const fe = def.fidEvery || [7, 18]; s.fe = fe; s.next = fe[0] * 0.3 + Math.random() * fe[1]; return s; }
  setLOD(l) { const a = this.av; if (!a || l === this.lod) return; if (l === 0) { a.nearN++; a.hiUsed = true; } else if (this.lod === 0) a.nearN--; this.lod = l;
    for (let k = 0; k < 2; k++) { if (k === l && !this.mesh[k]) { const m = new THREE.SkinnedMesh(avatarGeo(a, k), this.mats[k]); m.bindMode = 'detached'; m.bind(this.skel, PPL.ident[0]); m.castShadow = k === 0; m.receiveShadow = false; m.matrixAutoUpdate = false; this.root.add(m); this.mesh[k] = m; }
      if (this.mesh[k]) this.mesh[k].visible = k === l && a.texReady; } this.texOK = a.texReady; }
  /* ---- public: actions ---- */
  play(name, opt) { const def = ACTIONS[name]; if (!this.av) { this.override = name; return this; } if (!def) { console.warn('Person.play: unknown action', name); return this; }
    const a = this.av, once = opt === true || (opt && opt.once); const st = this._activity(def); if (!st.loop) { this.override = name; return this; }
    if (opt && opt.clip) { const c = clipFor(a.sex, opt.clip); if (c) st.loop = c; }
    this._snapshot(def.fade || (opt && opt.fade) || 0.28);
    if (opt && opt.seatH != null) this.seatH = opt.seatH; if (def.prop && !(opt && opt.noProp)) { this.setProp(def.prop, opt && opt.propCol); this.actProp = true; }
    st.name = name; st.t = 0; st.mode = def.mode === 'loop' && once ? 'hold' : def.mode; st.phase = def.in ? 'in' : 'body'; st.cin = def.in ? clipFor(a.sex, def.in) : null; st.cout = def.out ? clipFor(a.sex, def.out) : null; if (!st.cin) st.phase = 'body';
    if (st.mode !== 'loop') st.lt = 0; if (opt && opt.t != null) st.lt = opt.t;
    this.act = st; this.override = name; return this; }
  stop(fade) { if (!this.act) { this.override = null; return this; } const st = this.act; if (this.actProp) { this.actProp = false; this.setProp(this.carry && this.carry.def.prop ? this.carry.def.prop : null); }
    if (st.cout && st.phase !== 'out') { this._snapshot(0.2); st.phase = 'out'; st.t = 0; this.override = null; return this; }
    if (st.phase === 'out') { this.override = null; return this; }
    this._snapshot(fade || st.def.fade || 0.3); this.act = null; this.override = null; return this; }
  /* walk-around accessory: 'phone' | 'text' | 'bag' | 'drink' | null  (upper body only while moving, full clip while standing) */
  setCarry(name) { if (!this.av) return this; const def = name && ACTIONS[name]; if (!def) { this.carry = null; return this; } const st = this._activity(def); if (!st.loop) return this; st.name = name; st.w = 0; st.mask = MASKS[def.mask] || MASKS.upper; this.carry = st; if (def.prop) this.setProp(def.prop); return this; }
  setProp(name, col) { if (this.prop) { this.root.remove(this.prop); this.prop = null; } if (name) { this.prop = propMesh(name, col); if (this.prop) { this.root.add(this.prop); this.prop.visible = false; } } return this; }
  _prop() { const o = this.prop, want = this.lod === 0 && !!this.av; if (!want) { o.visible = false; return; } o.visible = true; const d = o.userData.def, hb = d.hand === 'L' ? BN.LHAND : BN.RHAND, wq = this.wq, wp = this.wp;
    qrotTo(S_V, 0, wq, hb * 4, d.pos[0], d.pos[1], d.pos[2] * (d.hand === 'L' ? -1 : 1)); o.position.set(wp[hb * 3] + S_V[0], wp[hb * 3 + 1] + S_V[1], wp[hb * 3 + 2] + S_V[2]);
    if (d.hang) o.quaternion.set(0, 0, 0, 1); else o.quaternion.set(wq[hb * 4], wq[hb * 4 + 1], wq[hb * 4 + 2], wq[hb * 4 + 3]); }
  /* a small acknowledging nod (additive, works on top of anything) */
  nod() { this.nodT = 1; return this; }
  lookAt(x, y, z) { if (x == null) { this.lookT = null; return this; } if (!this.lookT) this.lookT = [0, 0, 0]; this.lookT[0] = x; this.lookT[1] = y; this.lookT[2] = z; return this; }
  _snapshot(d) { if (!this.av) return; this.snap.set(this.lq); this.snapR.set(this.rp); this.fade = 1; this.fadeDur = Math.max(0.02, d); }
  get busy() { return !!this.act; }
  /* ---- per-frame ---- */
  update(dt, speed, air) { if (!this.av) return; const nb = this.lod === 0 ? PPL.NB : PPL.NBODY; this.t += dt; PPL.stat.anim++; this.hurry = speed > 0.6; speed = speed || 0;
    if (!this.texOK && this.av.texReady) { this.texOK = true; if (this.mesh[this.lod]) this.mesh[this.lod].visible = true; } /* nobody is drawn before their texture has arrived */
    { const ry = this.root.rotation.y; let yr = 0; if (this.lastYaw != null && dt > 0) { let d = ry - this.lastYaw; d -= Math.round(d / TAU) * TAU; yr = clamp(d / dt, -6, 6); } this.lastYaw = ry; this.yawRate += (yr - this.yawRate) * Math.min(1, dt * 10); }
    let lspeed = speed; if (speed < 0.35 && !air) { const tv = Math.min(0.55, Math.abs(this.yawRate) * 0.22) * this.scale; if (tv > 0.12 && tv > speed) lspeed = tv; }
    if (this.act) this._evalAct(dt, nb); else this._evalLoco(dt, lspeed, !!air, nb);
    if (this.fade > 0) { this.fade -= dt / this.fadeDur; if (this.fade > 0) { const w = this.fade * this.fade * (3 - 2 * this.fade); poseBlend(this.lq, this.snap, w, nb); const r = this.rp, s = this.snapR; r[0] += (s[0] - r[0]) * w; r[1] += (s[1] - r[1]) * w; r[2] += (s[2] - r[2]) * w; } }
    this._layers(dt, speed || 0);
    if (nb > BN.JAW) this._face(dt);
    const r = this.root, sc = r.scale.y, def = this.act ? this.act.def : null, grounded = !(def && (def.seat || def.flat)) && this.airW < 0.5 && !this.noIK;
    /* smooth the visual height over curbs and steps (the caller snaps root.position.y to the ground) */
    const gy = r.position.y; if (this.sy == null || Math.abs(gy - this.sy) > 0.6 || !grounded) this.sy = gy; else this.sy += (gy - this.sy) * Math.min(1, dt * 9);
    if (air) this.wasAir = true; else if (this.wasAir) { this.wasAir = false; this.landV = -Math.min(2.2, Math.max(0.5, -this.vy * 0.35)); }
    if (this.land !== 0 || this.landV !== 0) { this.landV += (-this.land * 90 - this.landV * 11) * dt; this.land += this.landV * dt; if (this.land > 0) { this.land = 0; this.landV = 0; } if (Math.abs(this.land) < 1e-4 && Math.abs(this.landV) < 0.01) { this.land = 0; this.landV = 0; } }
    const useIK = grounded && this.lod === 0 && this.ik && Math.abs(groundY(r.position.x, r.position.z) - gy) < 0.3; if (!useIK) { this.pelY *= Math.max(0, 1 - dt * 8); }
    if (def && def.seat === 1 && this.seatH != null) { const c = this.act.loop; this.rp[1] += this.seatH / sc + 0.1 * this.av.hip / 0.9 - (c.py || 0.59) * this.av.hip / c.hip; }
    const shift = (this.sy - gy) / sc + this.pelY + this.land; this.rp[1] += shift;
    this._fk(nb); if (useIK) this._footIK(dt, shift); this._skin(nb); if (this.prop) this._prop(); }
  /* jaw flaps while talking (def.jaw or this.talking), eyelids blink every few seconds */
  _face(dt) { const lq = this.lq, def = this.act ? this.act.def : (this.carry ? this.carry.def : null); const talk = this.talking || (def && def.jaw);
    let jt = 0; if (talk) { const t = this.t * 9.5 + this.seq; jt = Math.max(0, 0.45 + 0.4 * Math.sin(t) + 0.3 * Math.sin(t * 0.37 + 1.3)) * 0.16; } if (this.jawOpen != null) jt = this.jawOpen;
    this.jaw += (jt - this.jaw) * Math.min(1, dt * 18);
    if (this.jaw > 0.002) { const o = BN.JAW * 4, h = this.jaw * 0.5, sz = Math.sin(h), cz = Math.cos(h), x = lq[o], y = lq[o + 1], z = lq[o + 2], w = lq[o + 3]; lq[o] = x * cz + y * sz; lq[o + 1] = y * cz - x * sz; lq[o + 2] = z * cz + w * sz; lq[o + 3] = w * cz - z * sz; }
    this.blinkT -= dt; if (this.blinkT < -0.14) this.blinkT = 1.8 + Math.random() * 4.5; this.blink = this.blinkT < 0 ? Math.sin(-this.blinkT / 0.14 * Math.PI) : 0; if (this.blinkHold != null) this.blink = this.blinkHold; }
  /* plant the feet on the real ground (slopes, curbs, steps) with two-bone IK; the pelvis follows the lower foot */
  _footIK(dt, shift) { const r = this.root, wp = this.wp, sn = Math.sin(r.rotation.y), cs = Math.cos(r.rotation.y), sx = r.scale.x, sc = r.scale.y, sz = r.scale.z, k = Math.min(1, dt * 16), a = this.av; let lo = 0;
    for (let f = 0; f < 2; f++) { const ft = f ? BN.RFOOT : BN.LFOOT, o = ft * 3, ax = wp[o] * sx, az = wp[o + 2] * sz, wx = r.position.x + ax * cs + az * sn, wz = r.position.z - ax * sn + az * cs;
      let g = (groundY(wx, wz) - r.position.y) / sc; if (g > 0.4) g = 0.4; else if (g < -0.5) g = -0.5; this.footY[f] += (g - this.footY[f]) * k; if (f === 0 || this.footY[f] < lo) lo = this.footY[f]; }
    this.pelY += (clamp(lo, -0.3, 0.2) - this.pelY) * Math.min(1, dt * 8);
    for (let f = 0; f < 2; f++) { const th = f ? BN.RTHIGH : BN.LTHIGH, o = (th + 2) * 3; const lift = this.footY[f] - shift; if (Math.abs(lift) < 0.004) continue;
      ikLeg(this, th, wp[o], wp[o + 1] + lift, wp[o + 2]); } }

  _evalActivity(s, dt, nb, out, outR) { const a = this.av; s.lt += dt; clipSample(s.loop, s.lt, out, outR, nb); const k = a.hip / s.loop.hip; outR[0] *= k; outR[1] *= k; outR[2] *= k;
    if (s.fid) { s.ft += dt; const d = s.fid.dur, w = sstep(Math.min(1, s.ft / 0.5)) * sstep(Math.min(1, (d - s.ft) / 0.5)); clipSample(s.fid, s.ft, S_B, S_RB, nb); poseBlend(out, S_B, w, nb); const k2 = a.hip / s.fid.hip; outR[0] += (S_RB[0] * k2 - outR[0]) * w; outR[1] += (S_RB[1] * k2 - outR[1]) * w; outR[2] += (S_RB[2] * k2 - outR[2]) * w; if (s.ft >= d) { s.fid = null; s.next = s.fe[0] + Math.random() * (s.fe[1] - s.fe[0]); } }
    else if (s.fids.length && this.lod === 0) { s.next -= dt; if (s.next <= 0) { s.fid = s.fids[Math.floor(Math.random() * s.fids.length)]; s.ft = 0; } } }
  _evalAct(dt, nb) { const st = this.act, a = this.av, lq = this.lq, rp = this.rp;
    if (st.phase === 'in') { st.t += dt; clipSample(st.cin, st.t, lq, rp, nb); const k = a.hip / st.cin.hip; rp[0] *= k; rp[1] *= k; rp[2] *= k; if (st.t >= st.cin.dur) { st.phase = 'body'; this._snapshot(0.15); } return; }
    if (st.phase === 'out') { st.t += dt * (this.hurry ? 1.9 : 1); clipSample(st.cout, st.t, lq, rp, nb); const k = a.hip / st.cout.hip; rp[0] *= k; rp[1] *= k; rp[2] *= k; if (st.t >= st.cout.dur - 0.05) { this._snapshot(0.25); this.act = null; } return; }
    if (st.mode === 'loop') { this._evalActivity(st, dt, nb, lq, rp);
      if (this.carry && st.def.seat === 1) { const cs = this.carry; cs.lt += dt; clipSample(cs.loop, cs.lt, S_A, S_RA, nb); poseBlendMask(lq, S_A, 1, cs.mask); } return; }
    st.lt += dt; const c = st.loop; clipSample(c, Math.min(st.lt, c.dur), lq, rp, nb); const k = a.hip / c.hip; rp[0] *= k; rp[1] *= k; rp[2] *= k;
    if (st.lt >= c.dur - (st.mode === 'once' ? 0.12 : 0) && st.mode === 'once') { this._snapshot(0.3); this.act = null; this.override = null; if (this.actProp) { this.actProp = false; this.setProp(null); } } }
  /* one gait family at ground speed v and the shared phase this.g -> pose in out/outR; returns the cadence (cycles/s) that keeps the feet from sliding */
  _gait(G, v, out, outR, nb) { const a = this.av, n = G.length; let i0 = 0, i1 = 0, w = 0;
    if (n > 1) { let i = 0; while (i < n - 2 && v > G[i + 1].v) i++; i0 = i; i1 = i + 1; w = clamp((v - G[i0].v) / (G[i1].v - G[i0].v), 0, 1); }
    const c0 = G[i0].c; let u = this.g + c0.off; u -= Math.floor(u); clipSample(c0, u * c0.n / c0.f, out, outR, nb); let k = a.hip / c0.hip; outR[0] *= k; outR[1] *= k; outR[2] *= k;
    if (w > 0.001) { const c1 = G[i1].c; u = this.g + c1.off; u -= Math.floor(u); clipSample(c1, u * c1.n / c1.f, S_C, S_RC, nb); poseBlend(out, S_C, w, nb); k = a.hip / c1.hip; outR[0] += (S_RC[0] * k - outR[0]) * w; outR[1] += (S_RC[1] * k - outR[1]) * w; outR[2] += (S_RC[2] * k - outR[2]) * w; }
    const st = G[i0].st + (G[i1].st - G[i0].st) * w, nat = (G[i0].v / G[i0].st) * (1 - w) + (G[i1].v / G[i1].st) * w; return clamp(v / st, nat * 0.62, nat * 1.32); }
  _evalLoco(dt, speed, air, nb) { const a = this.av, GW = this.gaitW, GR = this.gaitR, lq = this.lq, rp = this.rp, v = speed / this.scale;
    this.gv += (v - this.gv) * Math.min(1, dt * 12); if (v === 0 && this.gv < 0.03) this.gv = 0; const gv = this.gv, v0 = GW[0].v;
    /* walk <-> run is a short timed cross-fade with hysteresis (never a speed-proportional mix of a walk and a run) */
    if (GR.length) { if (gv > this.runOn) this.runT = 1; else if (gv < this.runOff) this.runT = 0; } this.runW += (this.runT - this.runW) * Math.min(1, dt * 7); if (Math.abs(this.runT - this.runW) < 0.004) this.runW = this.runT;
    const rw = this.runW * this.runW * (3 - 2 * this.runW), wi = this.runT ? 0 : (gv < v0 ? 1 - gv / v0 : 0);
    if (wi < 1) { if (this.idleT > 0.3) this.g = (this.stepSide = !this.stepSide) ? 0.96 : 0.46; /* first step: a foot lifts from beside the other one */ this.idleT = 0;
      let rate = 0;
      if (rw < 0.999) rate = this._gait(GW, gv, lq, rp, nb) * (1 - rw);
      if (rw > 0.001) { if (rw >= 0.999) rate = this._gait(GR, gv, lq, rp, nb); else { rate += this._gait(GR, gv, S_A, S_RA, nb) * rw; poseBlend(lq, S_A, rw, nb); rp[0] += (S_RA[0] - rp[0]) * rw; rp[1] += (S_RA[1] - rp[1]) * rw; rp[2] += (S_RA[2] - rp[2]) * rw; } }
      let ng = this.g + dt * rate;
      if (wi > 0.3 && v < gv - 0.02) { const lim = Math.ceil(this.g * 2 - 1e-6) / 2; if (ng > lim) ng = lim; } /* coming to a halt: the swinging foot arrives beside the other and stays */
      this.g = ng - Math.floor(ng); } else this.idleT += dt;
    if (wi > 0) { const ws = wi >= 1 ? 1 : wi * wi * (3 - 2 * wi); if (wi >= 1) this._evalActivity(this.carry || this.stand, dt, nb, lq, rp); else { this._evalActivity(this.carry || this.stand, dt, nb, S_A, S_RA); poseBlend(lq, S_A, ws, nb); rp[0] += (S_RA[0] - rp[0]) * ws; rp[1] += (S_RA[1] - rp[1]) * ws; rp[2] += (S_RA[2] - rp[2]) * ws; } }
    if (this.carry && wi < 1) { const cs = this.carry; cs.lt += dt * (wi > 0 ? 0 : 1); clipSample(cs.loop, cs.lt, S_A, S_RA, nb); poseBlendMask(lq, S_A, 1, cs.mask); }
    const at = air ? 1 : 0; this.airW += (at - this.airW) * Math.min(1, dt * (air ? 14 : 9));
    if (this.airW > 0.01) { const up = clipGet('hk_air_up'), dn = clipGet('hk_air_down'); if (up && dn) { clipSample(up, 0, S_A, S_RA, nb); clipSample(dn, 0, S_B, S_RB, nb); const f = clamp(0.5 - this.vy * 0.18, 0, 1); poseBlend(S_A, S_B, f, nb); poseBlend(lq, S_A, this.airW, nb); const k = a.hip / up.hip, y = (S_RA[1] + (S_RB[1] - S_RA[1]) * f) * k; rp[1] += (y - rp[1]) * this.airW; } } }
  /* additive layers in character space: posture, breathing, lean into turns / acceleration, head look-at */
  _layers(dt, speed) { const aq = this.aq, r = this.root, def = this.act ? this.act.def : null;
    const yawRate = this.yawRate;
    const acc = dt > 0 ? clamp((speed - this.lastSpd) / dt, -12, 12) : 0; this.lastSpd = speed;
    if (dt > 0 && this.lastY != null) this.vy += ((r.position.y - this.lastY) / dt - this.vy) * Math.min(1, dt * 20); this.lastY = r.position.y;
    const flat = def && (def.flat || def.seat); const k = Math.min(1, dt * 6);
    this.lean += ((flat ? 0 : clamp(-yawRate * speed * 0.035, -0.22, 0.22)) - this.lean) * k; this.pitch += ((flat ? 0 : clamp(acc * 0.012, -0.08, 0.1)) - this.pitch) * k;
    const br = Math.sin(this.t * 1.55 + this.seq) * 0.009, post = flat ? 0 : this.posture;
    let ty = 0, tp = 0, tw = 0;
    if (this.lookT && !(def && def.nolook)) { const dx = this.lookT[0] - r.position.x, dz = this.lookT[2] - r.position.z, s = Math.sin(r.rotation.y), c = Math.cos(r.rotation.y), lx = dx * c - dz * s, lz = dx * s + dz * c, d = Math.hypot(lx, lz);
      const yaw = Math.atan2(lx, lz), dy = this.lookT[1] - (r.position.y + (this.wp[BN.HEAD * 3 + 1] + 0.08) * this.scale);
      if (Math.abs(yaw) < 1.75 && d > 0.25) { tw = 1; ty = clamp(yaw, -1.15, 1.15); tp = clamp(-Math.atan2(dy, d), -0.5, 0.45); } }
    const kl = Math.min(1, dt * (tw ? 4.5 : 3)); this.lookW += (tw - this.lookW) * kl; if (tw) { this.lookYaw += (ty - this.lookYaw) * kl; this.lookPitch += (tp - this.lookPitch) * kl; }
    let nd = 0; if (this.nodT > 0) { this.nodT -= dt * 1.25; const u = 1 - Math.max(0, this.nodT); nd = Math.sin(u * Math.PI * 2) * Math.sin(u * Math.PI) * 0.2; }
    const ly = this.lookYaw * this.lookW, lp = this.lookPitch * this.lookW + nd;
    eulerTo(aq, 0, this.pitch * 0.5 + post * 0.4, 0, this.lean * 0.45);              // Spine
    eulerTo(aq, 4, this.pitch * 0.5 + post * 0.6 + br, ly * 0.08, this.lean * 0.4);   // Spine1
    eulerTo(aq, 8, br * 0.8, ly * 0.12, 0);                                             // Spine2
    eulerTo(aq, 12, lp * 0.4 - post * 0.5 - br, ly * 0.32, -this.lean * 0.35);          // Neck
    eulerTo(aq, 16, lp * 0.6 - post * 0.3 - br * 0.6, ly * 0.48, -this.lean * 0.3); }   // Head
  _fk(nb) { const lq = this.lq, wq = this.wq, wp = this.wp, rt = this.av.rt, par = PPL.par, aq = this.aq;
    wq[0] = lq[0]; wq[1] = lq[1]; wq[2] = lq[2]; wq[3] = lq[3]; wp[0] = this.rp[0]; wp[1] = this.rp[1]; wp[2] = this.rp[2];
    for (let i = 1; i < nb; i++) { const p = par[i] * 4, o = i * 4, ax = wq[p], ay = wq[p + 1], az = wq[p + 2], aw = wq[p + 3], bx = lq[o], by = lq[o + 1], bz = lq[o + 2], bw = lq[o + 3];
      let x = aw * bx + ax * bw + ay * bz - az * by, y = aw * by - ax * bz + ay * bw + az * bx, z = aw * bz + ax * by - ay * bx + az * bw, w = aw * bw - ax * bx - ay * by - az * bz;
      if (i >= BN.SPINE && i <= BN.HEAD) { const q = (i - BN.SPINE) * 4, cx = aq[q], cy = aq[q + 1], cz = aq[q + 2], cw = aq[q + 3]; const nx = cw * x + cx * w + cy * z - cz * y, ny = cw * y - cx * z + cy * w + cz * x, nz = cw * z + cx * y - cy * x + cz * w, nw = cw * w - cx * x - cy * y - cz * z; x = nx; y = ny; z = nz; w = nw; }
      wq[o] = x; wq[o + 1] = y; wq[o + 2] = z; wq[o + 3] = w;
      const t = i * 3; let vx = rt[t], vy = rt[t + 1], vz = rt[t + 2]; if (i >= BN.LLID && this.blink > 0) { vx -= this.blink * LID_DROP * this.av.h; vy += this.blink * LID_FWD * this.av.h; }
      const tx = 2 * (ay * vz - az * vy), ty = 2 * (az * vx - ax * vz), tz = 2 * (ax * vy - ay * vx), pp = par[i] * 3;
      wp[t] = wp[pp] + vx + aw * tx + (ay * tz - az * ty); wp[t + 1] = wp[pp + 1] + vy + aw * ty + (az * tx - ax * tz); wp[t + 2] = wp[pp + 2] + vz + aw * tz + (ax * ty - ay * tx); } }
  _skin(nb) { const sk = this.skel, bm = sk.boneMatrices, wq = this.wq, wp = this.wp, ri = this.av.rwqi, rp = this.av.rwp;
    for (let i = 0; i < nb; i++) { const o = i * 4, ax = wq[o], ay = wq[o + 1], az = wq[o + 2], aw = wq[o + 3], bx = ri[o], by = ri[o + 1], bz = ri[o + 2], bw = ri[o + 3];
      const x = aw * bx + ax * bw + ay * bz - az * by, y = aw * by - ax * bz + ay * bw + az * bx, z = aw * bz + ax * by - ay * bx + az * bw, w = aw * bw - ax * bx - ay * by - az * bz;
      const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z, m = i * 16, t = i * 3, px = rp[t], py = rp[t + 1], pz = rp[t + 2];
      const m0 = 1 - 2 * (yy + zz), m1 = 2 * (xy + wz), m2 = 2 * (xz - wy), m4 = 2 * (xy - wz), m5 = 1 - 2 * (xx + zz), m6 = 2 * (yz + wx), m8 = 2 * (xz + wy), m9 = 2 * (yz - wx), m10 = 1 - 2 * (xx + yy);
      bm[m] = m0; bm[m + 1] = m1; bm[m + 2] = m2; bm[m + 3] = 0; bm[m + 4] = m4; bm[m + 5] = m5; bm[m + 6] = m6; bm[m + 7] = 0; bm[m + 8] = m8; bm[m + 9] = m9; bm[m + 10] = m10; bm[m + 11] = 0;
      bm[m + 12] = wp[t] - (m0 * px + m4 * py + m8 * pz); bm[m + 13] = wp[t + 1] - (m1 * px + m5 * py + m9 * pz); bm[m + 14] = wp[t + 2] - (m2 * px + m6 * py + m10 * pz); bm[m + 15] = 1; }
    if (sk.boneTexture) sk.boneTexture.needsUpdate = true; }
  /* world position of a bone (after update) */
  bonePos(i, out) { const r = this.root, s = Math.sin(r.rotation.y), c = Math.cos(r.rotation.y), x = this.wp[i * 3] * r.scale.x, y = this.wp[i * 3 + 1] * r.scale.y, z = this.wp[i * 3 + 2] * r.scale.z; out = out || new THREE.Vector3(); return out.set(r.position.x + x * c + z * s, r.position.y + y, r.position.z - x * s + z * c); }
  dispose() { scene.remove(this.root); const i = PPL.list.indexOf(this); if (i >= 0) PPL.list.splice(i, 1); if (this.skel) this.skel.dispose(); if (this.av && this.lod === 0) this.av.nearN--; if (this.tint && this.mats) { this.mats[0].dispose(); this.mats[1].dispose(); } }
}
const Ped = Person, RealHuman = Person;

/* ---- casting: every street avatar is used once before any is used twice ---- */
function pickAvatar(sex) { const ids = PPL.ids.filter(id => PPL.av[id].street && (!sex || PPL.av[id].sex === sex)); if (!ids.length) return PPL.ids[0];
  if (!PPL.deck.length) { PPL.deck = PPL.ids.filter(id => PPL.av[id].street); for (let i = PPL.deck.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = PPL.deck[i]; PPL.deck[i] = PPL.deck[j]; PPL.deck[j] = t; } PPL.deckI = 0; }
  for (let k = 0; k < PPL.deck.length; k++) { const id = PPL.deck[(PPL.deckI + k) % PPL.deck.length]; if (!sex || PPL.av[id].sex === sex) { PPL.deckI = (PPL.deckI + k + 1) % PPL.deck.length; return id; } }
  return ids[0]; }
function randomLook() { const id = pickAvatar(null), a = PPL.av[id]; return { av: id, fem: a ? a.fem : false, scale: R(0.955, 1.045), build: R(0.95, 1.07) }; }

/* near / far LOD: the Q.real nearest visible people get the detailed mesh (fingers, face bones, shadow) */
function updateLOD() { if (!PPL.ready) return; const cx = camera.position.x, cz = camera.position.z, list = []; let far = 0;
  for (const p of PPL.list) { if (!p.av) continue; const r = p.root; if (!r.visible) continue; p.dist = Math.hypot(r.position.x - cx, r.position.z - cz); if (p.forceNear) { p.setLOD(0); continue; } list.push(p); }
  list.sort((a, b) => a.dist - b.dist); let n = 0; for (const p of list) { const want = n < Q.real && p.dist < (p.lod === 0 ? 34 : 28); if (want) n++; else far++; p.setLOD(want ? 0 : 1); }
  PPL.stat.near = n; PPL.stat.far = far;
  for (let i = 0; i < PPL.ids.length; i++) { const a = PPL.av[PPL.ids[i]]; if (a.hiUsed && a.nearN <= 0) { if (++a.hiIdle > 16) { a.texHi.dispose(); a.hiUsed = false; a.hiIdle = 0; } } else a.hiIdle = 0; } }
