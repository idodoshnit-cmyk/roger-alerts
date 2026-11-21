// Build the avatar packs:  node build_people.js [gameDir] [only id,id,...]
//   -> <gameDir>/models/rb_people.json (+ rb_people2.json ...)   skeleton + every avatar's two LODs, quantised, base64.
//      The avatars are split over several files of at most ~8 MB (the publishing limit is 16 MB per text file); the first lists the others in "more".
//   -> <gameDir>/models/tex/<id>.webp     (768x512 atlas: body | head | hair-opacity / glasses / equipment; alpha of the body slot = clothing mask for tints)
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { buildAvatar } = require('./build_avatar'); const SK = require('./skeleton'); const CAST = require('./cast');
const ROOT = path.resolve(__dirname, '../..'), RAW = path.join(ROOT, 'work/chars/raw');
const GAME = path.resolve(process.argv[2] || path.join(ROOT, 'work/chars/gk3')); const only = process.argv[3] ? process.argv[3].split(',') : null;
const PACK_MAX = 8.2e6;
(async () => {
  const mdir = path.join(GAME, 'models'), outFile = path.join(mdir, 'rb_people.json');
  const avatars = {};
  if (only && fs.existsSync(outFile)) { const p0 = JSON.parse(fs.readFileSync(outFile, 'utf8')); Object.assign(avatars, p0.avatars); for (const m of p0.more || []) Object.assign(avatars, JSON.parse(fs.readFileSync(path.join(GAME, m), 'utf8')).avatars); }
  const jobs = [], texDir = path.join(RAW, 'av_tex'), texFiles = fs.readdirSync(texDir);
  for (const c of CAST) {
    if (only && !only.includes(c.id)) continue;
    console.log(c.id, c.src);
    const { rec, layout } = await buildAvatar(path.join(RAW, 'av_glb', c.src + '.glb'), { log: console.log, maxTris: c.hi ? 9000 : 6400 });
    avatars[c.id] = Object.assign({ src: c.src, sex: c.sex, age: c.age, tags: c.tags, tex: 'models/tex/' + c.id + '.webp', hair: !!layout.opacity }, rec);
    const src = {}; for (const k in layout) { src[k] = path.join(texDir, c.src + '_' + k + '.png');
      if (!fs.existsSync(src[k]) && k === 'equipment') { const f = texFiles.find(n => n.startsWith(c.src + '_') && !/_(body|head|opacity|glasses)\.png$/.test(n)); if (f) src[k] = path.join(texDir, f); } }
    jobs.push({ id: c.id, out: path.join(mdir, 'tex', c.id + '.webp'), layout, src, mask: path.join(RAW, 'av_mask', c.src + '.png'), tintMask: true });
  }
  fs.mkdirSync(path.join(mdir, 'tex'), { recursive: true });
  // split in CAST order
  const packs = [{ v: 1, skeleton: { names: SK.NAMES, parent: SK.PARENT, nbody: SK.NBODY }, more: [], avatars: {} }]; let size = 0;
  for (const c of CAST) { const a = avatars[c.id]; if (!a) continue; const n = JSON.stringify(a).length; if (size + n > PACK_MAX) { packs.push({ v: 1, avatars: {} }); size = 0; } packs[packs.length - 1].avatars[c.id] = a; size += n; }
  for (const f of fs.readdirSync(mdir)) if (/^rb_people\d*\.json$/.test(f)) fs.unlinkSync(path.join(mdir, f));
  packs.forEach((p, i) => { if (i) packs[0].more.push('models/rb_people' + (i + 1) + '.json'); });
  packs.forEach((p, i) => { const f = path.join(mdir, 'rb_people' + (i ? i + 1 : '') + '.json'); fs.writeFileSync(f, JSON.stringify(p)); console.log(path.basename(f), fs.statSync(f).size, 'bytes,', Object.keys(p.avatars).length, 'avatars'); });
  const jf = path.join(RAW, 'tex_jobs.json'); fs.writeFileSync(jf, JSON.stringify(jobs));
  if (!process.env.NO_TEX) console.log(cp.execFileSync('python3', [path.join(__dirname, 'build_tex.py'), jf], { encoding: 'utf8', maxBuffer: 1 << 26 }));
})();
