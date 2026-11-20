// Build the animation pack:  node build_anims.js [gameDir]   ->  <gameDir>/models/rb_anims.json
// Clip record (all arrays base64, little endian):
//   f fps, n frames, loop 0/1 (a looping clip has period n/f and NO duplicated end frame; a one-shot spans (n-1)/f),
//   leg / hip: leg length and standing hip height of the source skeleton (root motion is scaled by avatar.hip / clip.hip at run time),
//   r  Int16[n*3]  root (Bip01) position in character space, metres * 8192
//   k  Int16[NB*4] constant rotation of every bone (fingers, jaw, eyelids and any body bone that does not move)
//   a  list of animated bone indices,  q Int16[n*a.length*4] their local rotations, frame-major, * 32767
//   cycle: dist (m per loop), speed, cyc (gait cycles per loop), off (clip phase where the left foot passes the right going forward), amp
//   trans: dist, D Uint16[n] cumulative forward distance / dist * 65535, gs Int8[n] gait signal (zL-zR)/leg*127*2
//   turn:  yaw (rad, + = left), Y Int16[n] cumulative yaw / |yaw| * 32767
'use strict';
const fs = require('fs'), path = require('path');
const A = require('./animlib'), SK = require('./skeleton'), { Q } = require('./lib');
const ROOT = path.resolve(__dirname, '../..'), RAW = path.join(ROOT, 'work/chars/raw');
const GAME = path.resolve(process.argv[2] || path.join(ROOT, 'work/chars/gk3'));
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const NB = SK.NBONES, NBODY = SK.NBODY, deg = r => r * 180 / Math.PI;
const bodyDist = (a, b) => { let e = 0; for (let i = 0; i < NBODY; i++) e = Math.max(e, Q.angle(a[i], b[i])); return e; };

// frames: {lq[k][bone], rp[k] root pos, plus optional curves} -> packed record
function packClip(name, fr, meta) {
  const n = fr.lq.length, anim = [], k = new Int16Array(NB * 4);
  for (let i = 0; i < NB; i++) {
    let e = 0; for (let f = 1; f < n; f++) e = Math.max(e, Q.angle(fr.lq[0][i], fr.lq[f][i]));
    const isFinger = i >= NBODY; // fingers / jaw / eyelids: one pose per clip (the middle frame)
    const ref = isFinger ? fr.lq[n >> 1][i] : fr.lq[0][i];
    for (let c = 0; c < 4; c++) k[i * 4 + c] = Math.round(ref[c] * 32767);
    if (!isFinger && e > 0.006) anim.push(i);
  }
  const q = new Int16Array(n * anim.length * 4), r = new Int16Array(n * 3);
  for (let f = 0; f < n; f++) {
    anim.forEach((b, a) => { const v = fr.lq[f][b]; for (let c = 0; c < 4; c++) q[(f * anim.length + a) * 4 + c] = Math.round(v[c] * 32767); });
    for (let c = 0; c < 3; c++) r[f * 3 + c] = Math.max(-32767, Math.min(32767, Math.round(fr.rp[f][c] * 8192)));
  }
  return Object.assign({ f: meta.fps, n, loop: meta.loop ? 1 : 0 }, meta.extra, { r: b64(r), k: b64(k), a: anim, q: b64(q) });
}
// close a loop: frames [0,kc) of ex become a seamless cycle by distributing the mismatch between frame kc and frame 0 over the last B frames
function closeLoop(lq, rp, kc, B) {
  const out = { lq: lq.slice(0, kc).map(f => f.slice()), rp: rp.slice(0, kc).map(p => p.slice()) };
  if (kc >= lq.length) return out; // nothing after the cut: the source already loops by itself
  for (let i = Math.max(0, kc - B); i < kc; i++) {
    const w = (i - (kc - B) + 1) / (B + 1), s = w * w * (3 - 2 * w);
    for (let b = 0; b < NB; b++) { const fix = Q.norm(Q.mul(Q.mul(lq[i][b], Q.inv(lq[kc][b])), lq[0][b])); out.lq[i][b] = Q.slerp(lq[i][b], fix, s); }
    for (let c = 0; c < 3; c++) out.rp[i][c] = rp[i][c] + (rp[0][c] - rp[kc][c]) * s;
  }
  return out;
}
const decimate = (arr, step) => arr.filter((_, i) => i % step === 0);

function buildMocap(name, opt, log) {
  const file = path.join(RAW, 'anim_glb', name + '.glb'); if (!fs.existsSync(file)) { log('MISSING ' + name); return []; }
  const out = [];
  for (const mir of opt.mirror ? [false, true] : [false]) {
    let ex = A.extract(file); if (mir) ex = A.mirror(ex);
    const lq = A.toLocal(ex), rp = ex.wp.map(f => f[0]), N = ex.n, kind = opt.kind, fps = opt.fps || (kind === 'loop' || kind === 'once' ? 12 : 24), step = Math.round(A.FPS / fps);
    const hip = ex.leg + ex.ankle, extra = { leg: +ex.leg.toFixed(4), hip: +hip.toFixed(4) };
    let fr, loop = false, info = '';
    if (kind === 'cycle') {
      loop = true; const err = A.loopError(lq); let stepAvg = 0; for (let f = 1; f < N; f++) stepAvg += bodyDist(lq[f - 1], lq[f]); stepAvg = deg(stepAvg / (N - 1));
      const dup = err < 0.4 * stepAvg; // last frame repeats the first?  (otherwise the gap first<-last is one ordinary frame step)
      const n = dup ? N - 1 : N; fr = { lq: lq.slice(0, n), rp: rp.slice(0, n) };
      const g = A.gait(Object.assign({}, ex, { wp: ex.wp.slice(0, n).concat([ex.wp[0]]), n: n + 1 }));
      const period = n / A.FPS, dist = ex.fwd[N - 1] * (dup ? 1 : N / (N - 1));
      if (g.cycles < 1) log('  WARN no gait cycle found in ' + name);
      Object.assign(extra, { dist: +dist.toFixed(4), speed: +(dist / period).toFixed(4), cyc: g.cycles, off: +g.off.toFixed(4), amp: +(g.amp / ex.leg).toFixed(4) });
      info = `speed ${extra.speed.toFixed(2)} m/s  stride ${(dist / Math.max(1, g.cycles)).toFixed(2)} m  cyc ${g.cycles} off ${g.off.toFixed(2)} ${dup ? 'dup-end' : 'open'} (gap ${err.toFixed(1)} deg, step ${stepAvg.toFixed(1)})`;
    } else if (kind === 'trans') {
      fr = { lq, rp }; const dist = ex.fwd[N - 1], g = A.gait(ex);
      const D = new Uint16Array(N), gs = new Int8Array(N); let mono = 0;
      for (let f = 0; f < N; f++) { mono = Math.max(mono, ex.fwd[f]); D[f] = Math.round(Math.min(1, mono / dist) * 65535); gs[f] = Math.max(-127, Math.min(127, Math.round(g.s[f] / ex.leg * 254))); }
      Object.assign(extra, { dist: +dist.toFixed(4), D: b64(D), gs: b64(gs) }); info = `dist ${dist.toFixed(2)} m in ${ex.dur.toFixed(2)} s  gs ${gs[0]}..${gs[N - 1]}`;
    } else if (kind === 'turn') {
      fr = { lq, rp }; const yaw = ex.yaw[N - 1], Y = new Int16Array(N); for (let f = 0; f < N; f++) Y[f] = Math.round(Math.max(-1, Math.min(1, ex.yaw[f] / Math.abs(yaw))) * 32767);
      Object.assign(extra, { yaw: +yaw.toFixed(4), Y: b64(Y) }); info = `yaw ${deg(yaw).toFixed(0)} deg in ${ex.dur.toFixed(2)} s`;
    } else {
      // stand / sit clips: start and end in the same pose.  Optionally trim and decimate.
      let k0 = 0, kc = N - 1; const err = A.loopError(lq), T = opt.trim ? Math.round(opt.trim * A.FPS) : 0;
      if (T && ex.dur > opt.trim + 1.5) {
        // (a) cut where the pose comes back closest to frame 0
        let best = 1e9; for (let f = Math.round(T * 0.62); f <= T; f += step) { const d = bodyDist(lq[f], lq[0]); if (d < best) { best = d; kc = f; } }
        if (kind === 'loop' && deg(best) > 12) {
          // (b) the clip holds a different pose in its middle (phone at the ear ...): loop a stretch of the middle instead
          const lo = Math.min(Math.round(3.5 * A.FPS), N >> 2), hi = N - 1 - lo; let bb = 1e9;
          for (let s0 = lo; s0 + Math.round(T * 0.62) <= hi; s0 += 2 * step) for (let e = s0 + Math.round(T * 0.62); e <= Math.min(hi, s0 + T); e += step) { const d = bodyDist(lq[s0], lq[e]); if (d < bb) { bb = d; k0 = s0; kc = e; } }
          info = `inner loop ${(k0 / A.FPS).toFixed(1)}..${(kc / A.FPS).toFixed(1)} s (gap ${deg(bb).toFixed(1)} deg, from-start gap was ${deg(best).toFixed(0)}) `; extra.inner = 1;
        } else info = `trim ${(kc / A.FPS).toFixed(1)} s (gap ${deg(best).toFixed(1)} deg) `;
      } else if (err > 2) info = `end pose differs ${err.toFixed(0)} deg `;
      kc -= (kc - k0) % step;
      const lqs = lq.slice(k0), rps = rp.slice(k0), kk = kc - k0;
      if (kind === 'loop' || (T && kk < lqs.length - 1)) { const c = closeLoop(lqs, rps, kk, Math.round(0.8 * A.FPS)); fr = { lq: decimate(c.lq, step), rp: decimate(c.rp, step) }; if (kind === 'once') { fr.lq.push(c.lq[0]); fr.rp.push(c.rp[0]); } }
      else fr = { lq: decimate(lqs.slice(0, kk + 1), step), rp: decimate(rps.slice(0, kk + 1), step) };
      loop = kind === 'loop';
      let py = 0; for (const p of fr.rp) py += p[1]; extra.py = +(py / fr.rp.length).toFixed(3);
    }
    if (kind === 'cycle' || kind === 'trans' || kind === 'turn') { if (step > 1) { fr = { lq: decimate(fr.lq, step), rp: decimate(fr.rp, step) }; } }
    if (opt.hold) extra.hold = 1;
    const rec = packClip(name, fr, { fps, loop, extra }), nm = name + (mir ? '_mir' : '');
    log(`${nm.padEnd(32)} ${kind.padEnd(5)} ${String(rec.n).padStart(4)} fr @${fps}  ${(rec.n / fps).toFixed(1).padStart(5)} s  anim ${String(rec.a.length).padStart(2)}  ${(JSON.stringify(rec).length / 1024).toFixed(0).padStart(4)} KB  ${info}`);
    out.push([nm, rec]);
  }
  return out;
}
module.exports = { packClip, closeLoop, b64 };
if (require.main === module) {
  const CLIPS = require('./clips'); const pack = { v: 1, nb: NB, clips: {} }; const log = s => console.log(s);
  for (const [name, opt] of CLIPS) for (const [nm, rec] of buildMocap(name, opt, log)) pack.clips[nm] = rec;
  // hand-keyed clips (punch, jump, climb, shoot, knock-down, get up, drive, eat ...) are authored in handkeyed.js on top of mocap poses
  if (fs.existsSync(path.join(__dirname, 'handkeyed.js'))) { const hk = require('./handkeyed').build(pack, log); for (const nm in hk) pack.clips[nm] = hk[nm]; }
  const out = path.join(GAME, 'models/rb_anims.json'); fs.writeFileSync(out, JSON.stringify(pack));
  console.log('rb_anims.json', fs.statSync(out).size, 'bytes,', Object.keys(pack.clips).length, 'clips');
}
