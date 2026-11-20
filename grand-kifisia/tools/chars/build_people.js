// Build the avatar pack:  node build_people.js [gameDir] [only id,id,...]
//   -> <gameDir>/models/rb_people.json   (skeleton + every avatar's two LODs, quantised, base64)
//   -> <gameDir>/models/tex/<id>.webp     (768x512 atlas: body | head | hair-opacity or equipment)
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { buildAvatar } = require('./build_avatar'); const SK = require('./skeleton'); const CAST = require('./cast');
const ROOT = path.resolve(__dirname, '../..'), RAW = path.join(ROOT, 'work/chars/raw');
const GAME = path.resolve(process.argv[2] || path.join(ROOT, 'work/chars/gk3')); const only = process.argv[3] ? process.argv[3].split(',') : null;
(async () => {
  const outFile = path.join(GAME, 'models/rb_people.json');
  const pack = only && fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : { v: 1, skeleton: { names: SK.NAMES, parent: SK.PARENT, nbody: SK.NBODY }, avatars: {} };
  const jobs = [];
  for (const c of CAST) {
    if (only && !only.includes(c.id)) continue;
    console.log(c.id, c.src);
    const { rec, layout } = await buildAvatar(path.join(RAW, 'av_glb', c.src + '.glb'), { log: console.log, maxTris: c.hi ? 9000 : 6400 });
    const slots = {}; for (const k in layout) slots[k] = layout[k];
    pack.avatars[c.id] = Object.assign({ src: c.src, sex: c.sex, age: c.age, tags: c.tags, tex: 'models/tex/' + c.id + '.webp', hair: !!layout.opacity }, rec);
    const src = {}; for (const k in layout) src[k] = path.join(RAW, 'av_tex', c.src + '_' + k + '.png');
    jobs.push({ id: c.id, out: path.join(GAME, 'models/tex', c.id + '.webp'), layout, src, mask: path.join(RAW, 'av_mask', c.src + '.png') });
  }
  fs.mkdirSync(path.join(GAME, 'models/tex'), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(pack));
  console.log('rb_people.json', fs.statSync(outFile).size, 'bytes,', Object.keys(pack.avatars).length, 'avatars');
  const jf = path.join(RAW, 'tex_jobs.json'); fs.writeFileSync(jf, JSON.stringify(jobs));
  if (!process.env.NO_TEX) console.log(cp.execFileSync('python3', [path.join(__dirname, 'build_tex.py'), jf], { encoding: 'utf8' }));
})();
