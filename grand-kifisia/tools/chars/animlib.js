// Extract a Rocketbox animation GLB into canonical-skeleton tracks in CHARACTER SPACE (y up, facing +z, origin on the ground under the root):
//   root motion (the MotionExtractionHelper's ground-plane translation and yaw) is separated from the pose, so every clip plays in place and
//   carries its forward distance / yaw curves as metadata.  Also: gait analysis (cycles, phase offset), loop error, mirroring.
'use strict';
const { readGLB, Q, M, scene } = require('./lib');
const SK = require('./skeleton');
const FPS = 24; // native rate of the Rocketbox clips
const canonName = n => n.replace(/^Bip\d\d/, 'Bip01');
const yawOf = q => 2 * Math.atan2(q[1], q[3]);
const rotY = a => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// -> { n, fps, dur, wq[frame][bone] world quat (char space), wp[frame][bone] world pos (char space), fwd[frame], side[frame], yaw[frame], leg, ankle }
function extract(file, opt = {}) {
  const g = readGLB(file), sc = scene(g), j = g.json;
  j.nodes.forEach(n => { if (n.name) n.name = canonName(n.name); }); const byName = {}; j.nodes.forEach((n, i) => { if (!(n.name in byName)) byName[n.name] = i; });
  const idx = SK.NAMES.map(n => { const i = byName[n]; if (i === undefined) throw new Error('missing bone ' + n + ' in ' + file); return i; });
  const hi = byName.MotionExtractionHelper;
  const t0 = opt.t0 || 0, t1 = opt.t1 === undefined ? sc.duration : Math.min(opt.t1, sc.duration), dur = t1 - t0;
  const n = Math.max(1, Math.round(dur * FPS)) + 1; // samples including both ends
  const wq = [], wp = [], fwd = [], side = [], yaw = [];
  let h0 = null, hq0 = null, prevYaw = 0;
  for (let k = 0; k < n; k++) {
    const t = t0 + k / (n - 1) * dur, W = sc.world(t);
    let hx = 0, hz = 0, hy = 0;
    if (hi !== undefined) { const hp = M.pos(W[hi]), hq = M.quat(W[hi]); if (!h0) { h0 = hp; hq0 = hq; } hx = hp[0]; hz = hp[2]; hy = wrap(yawOf(Q.mul(hq, Q.inv(hq0)))); hy = prevYaw + wrap(hy - prevYaw); prevYaw = hy; }
    const inv = rotY(-hy), fq = [], fp = [];
    for (const i of idx) { const p = M.pos(W[i]); fp.push(Q.rot(inv, [p[0] - hx, p[1], p[2] - hz])); fq.push(Q.norm(Q.mul(inv, M.quat(W[i])))); }
    wq.push(fq); wp.push(fp); yaw.push(hy);
    // helper displacement expressed in the frame-0 heading
    fwd.push(hi === undefined ? 0 : hz - h0[2]); side.push(hi === undefined ? 0 : hx - h0[0]);
  }
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), I = SK.INDEX;
  const leg = d(wp[0][I['Bip01 L Thigh']], wp[0][I['Bip01 L Calf']]) + d(wp[0][I['Bip01 L Calf']], wp[0][I['Bip01 L Foot']]);
  let ankle = 9; for (const f of wp) ankle = Math.min(ankle, f[I['Bip01 L Foot']][1], f[I['Bip01 R Foot']][1]);
  return { n, fps: FPS, dur, wq, wp, fwd, side, yaw, leg, ankle, hasHelper: hi !== undefined };
}
// world (char-space) rotations -> local rotations in the canonical hierarchy, sign-continuous over time
function toLocal(ex) {
  const lq = ex.wq.map(fq => fq.map((q, i) => SK.PARENT[i] < 0 ? q : Q.norm(Q.mul(Q.inv(fq[SK.PARENT[i]]), q))));
  for (let k = 1; k < lq.length; k++) for (let i = 0; i < SK.NBONES; i++) { const a = lq[k - 1][i], b = lq[k][i]; if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0) lq[k][i] = [-b[0], -b[1], -b[2], -b[3]]; }
  return lq;
}
// gait analysis from the feet (char space): s(t) = zL - zR.  cycles = upward zero crossings over the loop, off = phase (0..1 of the clip) of the first one.
function gait(ex) {
  const L = SK.INDEX['Bip01 L Foot'], R = SK.INDEX['Bip01 R Foot'], s = ex.wp.map(f => f[L][2] - f[R][2]), n = ex.n - 1, ups = [];
  for (let k = 0; k < n; k++) { const a = s[k], b = s[k + 1]; if (a <= 0 && b > 0) ups.push((k + a / (a - b)) / n); }
  let amp = 0; for (const v of s) amp = Math.max(amp, Math.abs(v));
  return { cycles: ups.length, off: ups.length ? ups[0] : 0, amp, s };
}
// largest joint angle (deg) between the first and last frame of the body bones: ~0 for a seamless loop
function loopError(lq) { let e = 0; const a = lq[0], b = lq[lq.length - 1]; for (let i = 0; i < SK.NBODY; i++) e = Math.max(e, Q.angle(a[i], b[i])); return e * 180 / Math.PI; }
// mirror a clip left<->right in character space
function mirror(ex) {
  const swap = SK.NAMES.map(n => SK.INDEX[n.replace(/ L /, ' # ').replace(/ R /, ' L ').replace(/ # /, ' R ').replace(/^Bip01 L(Eye)/, 'Bip01 #$1').replace(/^Bip01 R(Eye)/, 'Bip01 L$1').replace(/^Bip01 #(Eye)/, 'Bip01 R$1')]);
  // reflection of a world rotation R of the opposite bone: R' = S R S_l, with S = diag(-1,1,1) and S_l = diag(1,1,-1) (Biped bones are mirror images across local z)
  const mq = q => { const m = M.trs([0, 0, 0], q); const r = [-m[0], m[1], m[2], 0, -m[4], m[5], m[6], 0, m[8], -m[9], -m[10], 0, 0, 0, 0, 1]; return Q.fromMat(r); };
  const out = Object.assign({}, ex);
  out.wq = ex.wq.map(f => f.map((_, i) => mq(f[swap[i]]))); out.wp = ex.wp.map(f => f.map((_, i) => { const p = f[swap[i]]; return [-p[0], p[1], p[2]]; }));
  out.side = ex.side.map(v => -v); out.yaw = ex.yaw.map(v => -v);
  return out;
}
module.exports = { extract, toLocal, gait, loopError, mirror, FPS };
