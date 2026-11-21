// Line-up of avatars for visual QA:  node lineup.js out.png id,id,... [view=front] [WxH] [specJSON applied to all] [play action]
'use strict';
const { open } = require('./viewer');
(async () => {
  const [out, ids, view, wh, spec, play] = process.argv.slice(2); const [W, H] = (wh || '1800x520').split('x').map(Number);
  const V = await open({ width: W, height: H });
  try {
    const list = ids === 'all' ? await V.eval(() => PPL.ids) : ids.split(',');
    await V.eval(({ list, view, spec, play }) => { VW.clear(); const n = list.length, sp = 0.8; list.forEach((id, k) => { const p = VW.person(Object.assign({ av: id, seed: 100 + k }, spec || {}), (k - (n - 1) / 2) * sp, 0, view === 'back' ? Math.PI : 0); if (play) p.play(play); VW.advance(p, 0.7, 0, false); });
      VW.cam(view === 'back' ? 'front' : (view || 'front'), 0, 0.95, 0, n * sp / 2 / (innerWidth / innerHeight) + 0.05 > 1.05 ? n * sp / 2 / (innerWidth / innerHeight) + 0.05 : 1.05); }, { list, view, spec: spec ? JSON.parse(spec) : null, play });
    const st = await V.shot(out); console.log(JSON.stringify(st), list.join(' '));
    if (V.errors.length) console.log('ERRORS:\n' + [...new Set(V.errors)].slice(0, 10).join('\n'));
  } catch (e) { console.log('FAILED', e.message, V.errors.join('\n')); } finally { await V.close(); }
})();
