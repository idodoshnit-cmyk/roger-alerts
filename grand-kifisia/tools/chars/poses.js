// Pose sheet: each action twice (facing the camera, and in profile), one screenshot.  node poses.js out.png act,act,... [av] [WxH] [T seconds] [carrySpeed]
'use strict';
const { open } = require('./viewer');
(async () => {
  const [out, acts, av, wh, T, spd] = process.argv.slice(2); const [W, H] = (wh || '2000x560').split('x').map(Number);
  const V = await open({ width: W, height: H });
  try {
    await V.eval(({ acts, av, T, spd }) => { VW.clear(); const n = acts.length * 2, sp = 0.85;
      acts.forEach((a, k) => { for (let j = 0; j < 2; j++) { const i = k * 2 + j, p = VW.person({ av: av || 'm16', seed: 300 + k }, (i - (n - 1) / 2) * sp, 0, j ? -Math.PI / 2 : 0);
        const [name, mode] = a.split(':'); if (mode === 'carry') p.setCarry(name); else p.play(name); if (/aim/.test(name) && mode === 'up') p.aimPitch = -0.45;
        const s = mode === 'carry' ? (spd || 1.3) : 0; VW.advance(p, T || 0.9, s, false); p.root.position.x = (i - (n - 1) / 2) * sp; p.root.position.z = 0; p.update(0, s, false); } });
      VW.cam('front', 0, 0.95, 0, Math.max(1.05, n * sp / 2 / (innerWidth / innerHeight) + 0.05)); }, { acts: acts.split(','), av, T: T ? +T : 0, spd: spd ? +spd : 0 });
    const st = await V.shot(out); console.log(JSON.stringify(st)); if (V.errors.length) console.log('ERRORS:\n' + [...new Set(V.errors)].slice(0, 10).join('\n'));
  } catch (e) { console.log('FAILED', e.message, V.errors.join('\n')); } finally { await V.close(); }
})();
