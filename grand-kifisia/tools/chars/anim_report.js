// Print per-clip stats for every fetched animation GLB: duration, root distance / speed / yaw, gait cycles and phase, loop error, finger motion.
'use strict';
const fs = require('fs'), path = require('path'); const A = require('./animlib'); const SK = require('./skeleton'); const { Q } = require('./lib');
const dir = process.argv[2], pat = new RegExp(process.argv[3] || '.');
let tot = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.glb') && pat.test(f)).sort()) {
  const ex = A.extract(path.join(dir, f)), lq = A.toLocal(ex), g = A.gait(ex), n = ex.n;
  let fing = 0, body = 0; for (let i = 0; i < SK.NBONES; i++) { let e = 0; for (let k = 1; k < n; k++) e = Math.max(e, Q.angle(lq[0][i], lq[k][i])); if (i >= SK.NBODY && i < SK.NBODY + 30) fing = Math.max(fing, e); if (i < SK.NBODY && e > 0.01) body++; }
  const p0 = ex.wp[0][1], pe = ex.wp[n - 1][1], face = ex.wp[0][SK.INDEX['Bip01 L Toe0']][2] - ex.wp[0][SK.INDEX['Bip01 L Foot']][2];
  let ymin = 9, ymax = -9; for (const fr of ex.wp) { ymin = Math.min(ymin, fr[1][1]); ymax = Math.max(ymax, fr[1][1]); }
  tot += ex.dur;
  console.log(f.replace('.glb', '').padEnd(34), 'dur', ex.dur.toFixed(2).padStart(6), 'fwd', ex.fwd[n - 1].toFixed(2).padStart(6), 'side', ex.side[n - 1].toFixed(2).padStart(5), 'yaw', (ex.yaw[n - 1] * 180 / Math.PI).toFixed(0).padStart(4), 'spd', (ex.fwd[n - 1] / ex.dur).toFixed(2), 'cyc', g.cycles, 'off', g.off.toFixed(2), 'loopErr', A.loopError(lq).toFixed(1).padStart(5), 'fing', (fing * 57.3).toFixed(0).padStart(3), 'pelv0', p0.map(v => v.toFixed(2)).join(','), 'pelvY', ymin.toFixed(2) + '..' + ymax.toFixed(2), 'leg', ex.leg.toFixed(3), 'ank', ex.ankle.toFixed(3), face > 0.03 ? '' : 'FACING?');
}
console.log('total duration', tot.toFixed(1), 's');
