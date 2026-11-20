// Rocketbox avatar GLB (from FBX2glTF) -> compact avatar record for the people pack.
//   - vertices are baked into the rest pose in character space (metres, y up, facing +z) and re-bound to the canonical skeleton
//     (facial bones collapse into Head/Jaw/eyelids; LOD1 also collapses fingers, jaw and eyelids -> 23 bones)
//   - the source materials (body / head / opacity / equipment) are merged into ONE mesh whose UVs address a 768x512 texture atlas
//   - LOD0 = source mesh trimmed to maxTris, LOD1 = meshoptimizer simplification (~1.2k triangles)
//   - everything is quantised: position int16, normal int8, uv uint16, 4 bone indices uint8, 4 weights uint8
'use strict';
const { readGLB, accessor, Q, M, scene } = require('./lib');
const SK = require('./skeleton');
const path = require('path');
const { MeshoptSimplifier } = require(path.resolve(__dirname, '../../models/node_modules/meshoptimizer'));

const AW = 768, AH = 512; // atlas size in pixels
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const canonName = n => n.replace(/^Bip\d\d/, 'Bip01');
const kindOf = m => /opacity/i.test(m) ? 'opacity' : /head/i.test(m) ? 'head' : /body/i.test(m) ? 'body' : 'equipment';
// atlas layout for the set of material kinds an avatar has: pixel rects [x,y,w,h], y from the top
function layoutFor(kinds) {
  const L = { body: [0, 0, 512, 512] };
  if (kinds.includes('head')) L.head = [512, 0, 256, 256];
  const extra = kinds.filter(k => k !== 'body' && k !== 'head').sort(); // 'equipment' < 'opacity'
  extra.forEach((k, i) => { L[k] = [512, 256 + i * 256 / extra.length, 256, 256 / extra.length]; });
  return L;
}

async function buildAvatar(file, opt = {}) {
  await MeshoptSimplifier.ready;
  const g = readGLB(file), sc = scene(g), j = g.json, log = opt.log || (() => {});
  j.nodes.forEach(n => { if (n.name) n.name = canonName(n.name); }); sc.byName = {}; j.nodes.forEach((n, i) => { if (!(n.name in sc.byName)) sc.byName[n.name] = i; });
  const skin = j.skins[0], joints = skin.joints, ibm = accessor(g, skin.inverseBindMatrices);
  const W = sc.world();
  const S = joints.map((n, k) => M.mul(W[n], Array.from(ibm.subarray(k * 16, k * 16 + 16))));
  const canonOf = n => { let i = n; while (i >= 0 && !(j.nodes[i].name in SK.INDEX)) i = sc.parent[i]; return i < 0 ? 0 : SK.INDEX[j.nodes[i].name]; };
  const jmap = joints.map(canonOf);
  const bodyOf = SK.NAMES.map((_, i) => { let k = i; while (k >= SK.NBODY) k = SK.PARENT[k]; return k; });
  // rest pose of the canonical skeleton: world position + world rotation per bone, stored as parent-relative t (parent frame) and q
  const Wc = SK.NAMES.map(n => { const i = sc.byName[n]; if (i === undefined) throw new Error('missing bone ' + n + ' in ' + file); return W[i]; });
  const wq = Wc.map(m => M.quat(m)), wp = Wc.map(m => M.pos(m));
  const rest = { t: [], q: [] };
  SK.NAMES.forEach((n, i) => {
    const p = SK.PARENT[i];
    const t = p < 0 ? wp[i] : Q.rot(Q.inv(wq[p]), [wp[i][0] - wp[p][0], wp[i][1] - wp[p][1], wp[i][2] - wp[p][2]]);
    const q = p < 0 ? wq[i] : Q.norm(Q.mul(Q.inv(wq[p]), wq[i]));
    rest.t.push(...t.map(v => +v.toFixed(5))); rest.q.push(...q.map(v => +v.toFixed(6)));
  });
  const kinds = [...new Set(j.meshes.flatMap(m => m.primitives.map(pr => kindOf(j.materials[pr.material].name))))];
  const LAY = layoutFor(kinds);
  // gather + bake vertices
  const P = [], Nn = [], UV = [], BI = [], BW = [], KIND = [], IDX = [[], []]; // IDX[0] skin/cloth, IDX[1] hair cards
  for (const mesh of j.meshes) for (const pr of mesh.primitives) {
    const kind = kindOf(j.materials[pr.material].name), px = LAY[kind], rc = [px[0] / AW, px[1] / AH, px[2] / AW, px[3] / AH];
    const pos = accessor(g, pr.attributes.POSITION), nor = accessor(g, pr.attributes.NORMAL), uv = accessor(g, pr.attributes.TEXCOORD_0), ji = accessor(g, pr.attributes.JOINTS_0), jw = accessor(g, pr.attributes.WEIGHTS_0), ix = accessor(g, pr.indices);
    const base = P.length / 3, nv = pos.length / 3; let out = 0;
    for (let v = 0; v < nv; v++) {
      const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], n = [nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]];
      let o = [0, 0, 0], on = [0, 0, 0], ws = 0; const acc = new Map();
      for (let k = 0; k < 4; k++) { const w = jw[v * 4 + k]; if (w <= 0) continue; const jj = ji[v * 4 + k]; const a = M.pt(S[jj], p), b = M.dir(S[jj], n); for (let c = 0; c < 3; c++) { o[c] += a[c] * w; on[c] += b[c] * w; } ws += w; acc.set(jmap[jj], (acc.get(jmap[jj]) || 0) + w); }
      const nl = Math.hypot(on[0], on[1], on[2]) || 1;
      P.push(o[0] / ws, o[1] / ws, o[2] / ws); Nn.push(on[0] / nl, on[1] / nl, on[2] / nl);
      let u = uv[v * 2], vv = uv[v * 2 + 1]; if (u < -0.02 || u > 1.02 || vv < -0.02 || vv > 1.02) out++;
      const eu = 0.6 / px[2], ev = 0.6 / px[3]; u = Math.min(1 - eu, Math.max(eu, u)); vv = Math.min(1 - ev, Math.max(ev, vv));
      UV.push(rc[0] + u * rc[2], rc[1] + vv * rc[3]);
      const bw = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); const tot = bw.reduce((s, e) => s + e[1], 0);
      for (let k = 0; k < 4; k++) { BI.push(k < bw.length ? bw[k][0] : 0); BW.push(k < bw.length ? bw[k][1] / tot : 0); }
      KIND.push(kind);
    }
    if (out) log(`  WARN ${out} vertices of ${kind} have UVs outside 0..1 (clamped)`);
    const dst = IDX[kind === 'opacity' ? 1 : 0]; for (let k = 0; k < ix.length; k++) dst.push(base + ix[k]);
  }
  const NV = P.length / 3; let ymax = -9, ymin = 9, ext = 0;
  for (let v = 0; v < NV; v++) { ymax = Math.max(ymax, P[v * 3 + 1]); ymin = Math.min(ymin, P[v * 3 + 1]); ext = Math.max(ext, Math.abs(P[v * 3]), Math.abs(P[v * 3 + 1]), Math.abs(P[v * 3 + 2])); }
  const toe = wp[SK.INDEX['Bip01 L Toe0']], foot = wp[SK.INDEX['Bip01 L Foot']];
  if (toe[2] - foot[2] < 0.03) log('  WARN avatar does not face +z: toe-foot z ' + (toe[2] - foot[2]).toFixed(3));
  log(`  verts ${NV} tris skin ${IDX[0].length / 3} hair ${IDX[1].length / 3}  y ${ymin.toFixed(3)}..${ymax.toFixed(3)} kinds ${kinds}`);
  const PS = Math.ceil(ext * 20 + 1) / 20; // position scale for int16
  const pos32 = new Float32Array(P);
  // attributes that guide the simplifier: uv (keeps texture seams and the face tidy)
  const attr = new Float32Array(NV * 2); for (let v = 0; v < NV; v++) { attr[v * 2] = UV[v * 2]; attr[v * 2 + 1] = UV[v * 2 + 1]; }
  function simplify(idx, target, err, lockBorder, uvW) {
    if (idx.length <= target) return Uint32Array.from(idx);
    MeshoptSimplifier.useExperimentalFeatures = true;
    const [out] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(idx), pos32, 3, attr, 2, [uvW || 0.3, uvW || 0.3], target - target % 3, err, lockBorder ? ['LockBorder'] : []);
    return out;
  }
  function pack(skinIdx, hairIdx, bodyOnly) {
    const all = [...skinIdx, ...hairIdx], remap = new Map(), keyOf = new Map(), order = [];
    const p = [], n = [], uv = [], bi = [], bw = [], ix = new Uint16Array(all.length);
    all.forEach((v, k) => {
      if (!remap.has(v)) {
        const qp = [0, 1, 2].map(c => Math.round(P[v * 3 + c] / PS * 32767)), qn = [0, 1, 2].map(c => Math.round(Nn[v * 3 + c] * 127)), quv = [Math.round(UV[v * 2] * 65535), Math.round(UV[v * 2 + 1] * 65535)];
        // weights (optionally collapsed to the body skeleton), quantised so that they sum to 255
        const acc = new Map(); for (let c = 0; c < 4; c++) { const w = BW[v * 4 + c]; if (w <= 0) continue; const b = bodyOnly ? bodyOf[BI[v * 4 + c]] : BI[v * 4 + c]; acc.set(b, (acc.get(b) || 0) + w); }
        const e = [...acc.entries()].sort((a, b) => b[1] - a[1]); let q = e.map(x => Math.round(x[1] * 255)); q[0] += 255 - q.reduce((s, x) => s + x, 0);
        const qb = [0, 1, 2, 3].map(c => c < e.length && q[c] > 0 ? e[c][0] : e[0][0]), qw = [0, 1, 2, 3].map(c => c < e.length ? q[c] : 0);
        const key = [...qp, ...qn, ...quv, ...qb, ...qw].join(',');
        let id = keyOf.get(key);
        if (id === undefined) { id = order.length; keyOf.set(key, id); order.push(v); p.push(...qp); n.push(...qn); uv.push(...quv); bi.push(...qb); bw.push(...qw); }
        remap.set(v, id);
      }
      ix[k] = remap.get(v);
    });
    const nv = order.length; if (nv > 65535) throw new Error('too many vertices');
    return { nv, nt: all.length / 3, hair: skinIdx.length, p: b64(Int16Array.from(p)), n: b64(Int8Array.from(n)), uv: b64(Uint16Array.from(uv)), bi: b64(Uint8Array.from(bi)), bw: b64(Uint8Array.from(bw)), ix: b64(ix), _order: order };
  }
  const maxTris = opt.maxTris || 6400, lod1Tris = opt.lod1Tris || 1250;
  let s0 = IDX[0], h0 = IDX[1];
  if ((s0.length + h0.length) / 3 > maxTris) s0 = Array.from(simplify(s0, Math.round(maxTris - h0.length / 3) * 3, 0.004, false, 0.5));
  const hairT = Math.min(h0.length / 3, Math.max(60, Math.round(Math.min(h0.length / 3 * 0.45, lod1Tris * 0.2))));
  const s1 = Array.from(simplify(IDX[0], (lod1Tris - hairT) * 3, 0.05, false, 0.15)), h1 = h0.length ? Array.from(simplify(h0, hairT * 3, 0.05, true, 0.1)) : [];
  const lod0 = pack(s0, h0, false), lod1 = pack(s1, h1, true);
  log(`  LOD0 ${lod0.nv}v ${lod0.nt}t   LOD1 ${lod1.nv}v ${lod1.nt}t (hair ${h1.length / 3})  posScale ${PS}`);
  const head = wp[SK.INDEX['Bip01 Head']];
  const rec = { h: +ymax.toFixed(4), hip: +wp[SK.INDEX['Bip01 Pelvis']][1].toFixed(4), ankle: +foot[1].toFixed(4), eye: +(head[1] + (ymax - head[1]) * 0.42).toFixed(4), ps: PS, rest, lod: [lod0, lod1] };
  const dbg = { P, UV, KIND, BI, BW, IDX, wp, layout: LAY, order0: lod0._order, order1: lod1._order }; delete lod0._order; delete lod1._order;
  return { rec, dbg, layout: LAY };
}
module.exports = { buildAvatar, layoutFor, AW, AH };
if (require.main === module) {
  buildAvatar(process.argv[2], { log: console.log, maxTris: +process.argv[4] || undefined }).then(({ rec }) => { const s = JSON.stringify(rec); console.log('json bytes', s.length, 'h', rec.h, 'hip', rec.hip, 'ankle', rec.ankle, 'eye', rec.eye); if (process.argv[3]) require('fs').writeFileSync(process.argv[3], s); });
}
