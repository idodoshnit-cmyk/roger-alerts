// Gesture strips: n copies of a person with a carry (e.g. aim_pistol), each advanced to a different time of a gesture (fire / reload) layered on top.
// Several jobs per browser session:  node gest.js jobs.json      jobs = [{out, carry, gest, n, dt, view, speed, av, cy, sp, W, H} | {out, film:{...viewer film opts}}]
'use strict';
const { open } = require('./viewer'); const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const V = await open({ width: 2000, height: 560 });
  try { for (const j of jobs) {
    if (j.lineup) { await V.eval(j => { VW.clear(); const n = j.lineup.length, sp = j.sp || 0.75; j.lineup.forEach((id, k) => { const p = VW.person({ av: id, seed: 900 + k }, (k - (n - 1) / 2) * sp, 0, 0); VW.advance(p, 0.5, 0, false); });
        const a = innerWidth / innerHeight; VW.cam('front', 0, j.cy || 1.0, 0, Math.max(j.hh || 0.5, (n * sp / 2 + 0.2) / a)); }, j); console.log(j.out, JSON.stringify(await V.shot(j.out))); continue; }
    if (j.film) { const lg = await V.film(j.out, j.film); console.log(j.out, lg.map(e => e.join('/')).join(' ')); continue; }
    const ts = await V.eval(j => { VW.clear(); const n = j.n || 8, view = j.view || 'q', sp = j.sp || 0.8, out = [], speed = j.speed || 0;
      for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * sp, along = view === 'side' || view === 'side2', x = along ? 0 : off, z = along ? (view === 'side' ? off : -off) : 0;
        const p = VW.person({ av: j.av || 'm16', seed: 500 }, x, z, j.yaw || 0); if (j.carry) p.setCarry(j.carry); VW.advance(p, j.pre || 0.6, speed, false);
        const d = j.gest ? p.gesture(j.gest) : 0; const T = (j.t0 || 0) + k * (j.dt || 0.1); VW.advance(p, T, speed, false); p.root.position.set(x, 0, z); p.update(0, speed, false); out.push(+T.toFixed(3)); if (k === 0) out.unshift(d); }
      const a = innerWidth / innerHeight; VW.cam(view === 'q' ? [-0.25, 0.12, 1] : view, 0, j.cy || 1.15, 0, Math.max(j.hh || 0.62, (n * sp / 2 + 0.3) / a)); return out; }, j);
    const st = await V.shot(j.out); console.log(j.out, JSON.stringify(st), 'dur', ts[0], 't=', ts.slice(1).join(',')); }
    if (V.errors.length) console.log('ERRORS:\n' + [...new Set(V.errors)].slice(0, 10).join('\n'));
  } catch (e) { console.log('FAILED', e.message, V.errors.join('\n')); } finally { await V.close(); }
})();
