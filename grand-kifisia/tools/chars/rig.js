// Authoring rig for hand-keyed clips on the canonical Biped skeleton.
// A clip is a set of CHANNELS, each with its own keys {t, v}; channels are interpolated with Catmull-Rom splines (or linearly) and the
// rig is solved every frame:  base mocap pose + character-space joint rotations -> FK -> two-bone IK for arms/legs that have targets.
// Character space: metres, y up, facing +z, +x = the character's LEFT.  Euler triples are [pitch(x), yaw(y), roll(z)] in radians:
//   pitch + = bow forward / swing a hanging limb BACK,  yaw + = turn left,  roll + = tilt towards the character's right side... (see FK below)
'use strict';
const path = require('path');
const A = require('./animlib'), SK = require('./skeleton'), { Q } = require('./lib');
const ROOT = path.resolve(__dirname, '../..'), RAW = path.join(ROOT, 'work/chars/raw');
const I = SK.INDEX, NB = SK.NBONES, PAR = SK.PARENT;
const B = n => I['Bip01 ' + n];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = a => Math.hypot(a[0], a[1], a[2]), nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const qx = a => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)], qy = a => [0, Math.sin(a / 2), 0, Math.cos(a / 2)], qz = a => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
// yaw outermost, then pitch, then roll
const euler = e => Q.norm(Q.mul(qy(e[1] || 0), Q.mul(qx(e[0] || 0), qz(e[2] || 0))));
function arc(a, b) { a = nrm(a); b = nrm(b); const d = dot(a, b); if (d > 0.999999) return [0, 0, 0, 1]; if (d < -0.999999) { let ax = cross(a, [1, 0, 0]); if (len(ax) < 0.01) ax = cross(a, [0, 1, 0]); ax = nrm(ax); return [ax[0], ax[1], ax[2], 0]; } const c = cross(a, b); return Q.norm([c[0], c[1], c[2], 1 + d]); }

// ---- reference skeleton + poses taken from the motion capture ----
function mocapPose(name, time, mirror) { let ex = A.extract(path.join(RAW, 'anim_glb', name + '.glb')); if (mirror) ex = A.mirror(ex); const k = Math.max(0, Math.min(ex.n - 1, Math.round((time || 0) * A.FPS))); const lq = A.toLocal(ex)[k]; return { lq: lq.map(q => q.slice()), rp: ex.wp[k][0].slice(), ex, k }; }
const REF = mocapPose('m_idle_neutral_01', 0);
const T = SK.NAMES.map((_, i) => { const p = PAR[i]; return p < 0 ? [0, 0, 0] : Q.rot(Q.inv(REF.ex.wq[0][p]), sub(REF.ex.wp[0][i], REF.ex.wp[0][p])); });
const HIP = REF.ex.leg + REF.ex.ankle, LEG = REF.ex.leg;
function fk(lq, rp) { const wq = new Array(NB), wp = new Array(NB); for (let i = 0; i < NB; i++) { const p = PAR[i]; if (p < 0) { wq[i] = lq[i]; wp[i] = rp; } else { wq[i] = Q.norm(Q.mul(wq[p], lq[i])); wp[i] = add(wp[p], Q.rot(wq[p], T[i])); } } return { wq, wp }; }
const BASE = { lq: REF.lq, rp: REF.rp, w: fk(REF.lq, REF.rp) };
// finger poses: open (base) and fist (from the running mocap)
const FIST = mocapPose('m_run_neutral_01', 0.2).lq;

// ---- splines ----
function sample(keys, t, mode) { // keys sorted by t: [{t, v:[...]}]
  const n = keys.length; if (t <= keys[0].t) return keys[0].v.slice(); if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
  let i = 0; while (keys[i + 1].t < t) i++; const k1 = keys[i], k2 = keys[i + 1], u = (t - k1.t) / (k2.t - k1.t);
  const md = k2.ease || mode;
  if (md === 'lin') return k1.v.map((v, c) => v + (k2.v[c] - v) * u);
  if (md === 'in') { const s = u * u; return k1.v.map((v, c) => v + (k2.v[c] - v) * s); }           // slow start, fast end (a hit)
  if (md === 'out') { const s = 1 - (1 - u) * (1 - u); return k1.v.map((v, c) => v + (k2.v[c] - v) * s); } // fast start, settle
  if (md === 'io') { const s = u * u * (3 - 2 * u); return k1.v.map((v, c) => v + (k2.v[c] - v) * s); }
  const k0 = keys[Math.max(0, i - 1)], k3 = keys[Math.min(n - 1, i + 2)], dt = k2.t - k1.t;
  return k1.v.map((p1, c) => { const p0 = k0.v[c], p2 = k2.v[c], p3 = k3.v[c];
    // Catmull-Rom with non-uniform key times (finite-difference tangents), zero tangent at the ends
    const m1 = i === 0 ? 0 : (p2 - p0) / (k2.t - k0.t) * dt, m2 = i + 2 > n - 1 ? 0 : (p3 - p1) / (k3.t - k1.t) * dt, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2; }); }

// ---- solving one frame ----
// P: { hips:[3], hipsR:[3], spine:[3], chest:[3], neck:[3], head:[3], clavL/R:[3],
//      armL/R: [upper p,y,r, elbow flex]  (FK)   or  handL/R: [x,y,z] wrist target (IK) with poleL/R:[3] elbow direction,
//      handLr/handRr: [3] hand rotation (char space, on top of what the arm gives),  curlL/R:[1] 0 open .. 1 fist,
//      legL/R: [thigh p,y,r, knee flex] (FK)   or  footL/R: [x,y,z] ankle offset from the base stance (IK, default = planted) with kneeL/R:[3] pole,
//      footLr/footRr: [3] foot rotation relative to flat-on-the-ground base,  toeL/R:[1] toe bend }
function solve(P, opt = {}) {
  const base = opt.base || BASE, lq = base.lq.map(q => q.slice()), bw = base.w;
  const rotIn = (b, e) => { const p = PAR[b], E = euler(e); lq[b] = p < 0 ? Q.norm(Q.mul(E, lq[b])) : Q.norm(Q.mul(Q.mul(Q.mul(Q.inv(bw.wq[p]), E), bw.wq[p]), lq[b])); };
  const rp = add(base.rp, P.hips || [0, 0, 0]);
  if (P.hipsR) rotIn(0, P.hipsR);
  if (P.spine) { const e = P.spine.map(v => v / 3); rotIn(B('Spine'), e); rotIn(B('Spine1'), e); rotIn(B('Spine2'), e); }
  if (P.chest) rotIn(B('Spine2'), P.chest);
  if (P.neck) rotIn(B('Neck'), P.neck); if (P.head) rotIn(B('Head'), P.head);
  for (const s of ['L', 'R']) {
    if (P['clav' + s]) rotIn(B(s + ' Clavicle'), P['clav' + s]);
    const arm = P['arm' + s]; if (arm) { rotIn(B(s + ' UpperArm'), arm.slice(0, 3)); rotIn(B(s + ' Forearm'), [-(arm[3] || 0), 0, 0]); }
    const leg = P['leg' + s]; if (leg) { rotIn(B(s + ' Thigh'), leg.slice(0, 3)); rotIn(B(s + ' Calf'), [leg[3] || 0, 0, 0]); }
    const c = P['curl' + s]; if (c && c[0] > 0) for (let f = 0; f < 5; f++) for (const j of ['', '1', '2']) { const b = B(s + ' Finger' + f + j); lq[b] = Q.slerp(lq[b], FIST[b], Math.min(1.3, c[0])); }
  }
  let w = fk(lq, rp);
  const setWorld = (b, q) => { lq[b] = Q.norm(Q.mul(Q.inv(w.wq[PAR[b]]), q)); };
  function limb(a, b, c, target, pole) { // rotate bones a,b so that joint c reaches target; pole = direction the middle joint should point to
    const pa = w.wp[a], l1 = len(sub(w.wp[b], pa)), l2 = len(sub(w.wp[c], w.wp[b])); let v = sub(target, pa), d = len(v); const dmax = (l1 + l2) * 0.999, dmin = Math.abs(l1 - l2) + 0.02; d = Math.max(dmin, Math.min(dmax, d)); const dir = nrm(v);
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x)); let pp = sub(pole, mul(dir, dot(pole, dir))); if (len(pp) < 1e-4) pp = [0, 0, 1]; pp = nrm(pp);
    const E = add(add(pa, mul(dir, x)), mul(pp, h)), Tt = add(pa, mul(dir, d));
    const r1 = arc(sub(w.wp[b], pa), sub(E, pa)); const qa = Q.norm(Q.mul(r1, w.wq[a])); const fore = Q.rot(r1, sub(w.wp[c], w.wp[b])); const r2 = arc(fore, sub(Tt, E)); const qb = Q.norm(Q.mul(r2, Q.mul(r1, w.wq[b])));
    setWorld(a, qa); w = fk(lq, rp); setWorld(b, qb); w = fk(lq, rp); }
  for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1;
    const hand = P['hand' + s]; if (hand) { limb(B(s + ' UpperArm'), B(s + ' Forearm'), B(s + ' Hand'), hand, P['pole' + s] || [sg * 0.6, -0.6, -0.5]); }
    const hr = P['hand' + s + 'r']; if (hr) { const b = B(s + ' Hand'); setWorld(b, Q.mul(euler(hr), w.wq[b])); w = fk(lq, rp); }
    /* handLw/handRw: absolute hand orientation (character-space quaternion [x,y,z,w]); handLwk/handRwk [0..1] = how much of it (default 1) */
    const hw = P['hand' + s + 'w']; if (hw) { const b = B(s + ' Hand'), k = P['hand' + s + 'wk'] ? Math.max(0, Math.min(1, P['hand' + s + 'wk'][0])) : 1; if (k > 0) { setWorld(b, Q.slerp(w.wq[b], Q.norm(hw), k)); w = fk(lq, rp); } }
    if (!P['leg' + s]) { const off = P['foot' + s] || [0, 0, 0], fb = B(s + ' Foot'); const target = add(bw.wp[fb], off); limb(B(s + ' Thigh'), B(s + ' Calf'), fb, target, P['knee' + s] || [sg * 0.12, 0, 1]);
      setWorld(fb, Q.mul(euler(P['foot' + s + 'r'] || [0, 0, 0]), bw.wq[fb])); w = fk(lq, rp); const tb = B(s + ' Toe0'); const tr = P['toe' + s]; setWorld(tb, Q.mul(euler([-(tr ? tr[0] : 0), 0, 0]), Q.mul(euler(P['foot' + s + 'r'] || [0, 0, 0]), bw.wq[tb]))); w = fk(lq, rp); }
    else { const fr = P['foot' + s + 'r']; if (fr) { const fb = B(s + ' Foot'); setWorld(fb, Q.mul(euler(fr), w.wq[fb])); w = fk(lq, rp); } }
  }
  return { lq, rp, w };
}
// channels: { name: [[t, v...], ...] }   ->  frames {lq[], rp[]} at fps over [0, dur]
function bake(channels, dur, fps, opt = {}) { const n = Math.round(dur * fps) + 1, fr = { lq: [], rp: [] }, ch = {};
  for (const k in channels) { ch[k] = channels[k].map(e => Array.isArray(e) ? { t: e[0], v: e.slice(1).flat() } : e).sort((a, b) => a.t - b.t); }
  for (let f = 0; f < n; f++) { const t = f / fps, P = {}; for (const k in ch) P[k] = sample(ch[k], t, (opt.modes || {})[k] || opt.mode);
    const s = solve(P, opt); fr.lq.push(s.lq); fr.rp.push(s.rp); }
  for (let k = 1; k < n; k++) for (let i = 0; i < NB; i++) { const a = fr.lq[k - 1][i], b = fr.lq[k][i]; if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0) fr.lq[k][i] = b.map(v => -v); }
  return fr; }
module.exports = { solve, bake, sample, mocapPose, fk, BASE, B, T, HIP, LEG, euler, add, sub, mul, RAW };
