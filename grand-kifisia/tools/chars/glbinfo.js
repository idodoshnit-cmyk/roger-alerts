// Print structure of a GLB: node tree, skins, meshes, materials, animations. Usage: node glbinfo.js file.glb [-v]
const fs=require('fs');const b=fs.readFileSync(process.argv[2]);const jl=b.readUInt32LE(12);const j=JSON.parse(b.slice(20,20+jl).toString());
const v=process.argv.includes('-v');
console.log('nodes',j.nodes.length,'meshes',(j.meshes||[]).length,'skins',(j.skins||[]).length,'materials',(j.materials||[]).map(m=>m.name),'images',(j.images||[]).length,'anims',(j.animations||[]).length);
for(const m of j.meshes||[])for(const p of m.primitives)console.log(' mesh',m.name,'mat',p.material,'verts',j.accessors[p.attributes.POSITION].count,'idx',j.accessors[p.indices].count,Object.keys(p.attributes).join(','),'targets',(p.targets||[]).length);
for(const s of j.skins||[])console.log(' skin joints',s.joints.length,'skeleton',s.skeleton);
const par={};j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>par[c]=i));
function pr(i,d){const n=j.nodes[i];const f=a=>a?a.map(x=>+x.toFixed(4)).join(','):'-';console.log(' '.repeat(d*2)+n.name+(n.mesh!==undefined?' [mesh]':'')+(v?'  t='+f(n.translation)+' r='+f(n.rotation)+' s='+f(n.scale):''));(n.children||[]).forEach(c=>pr(c,d+1))}
for(const r of j.scenes[0].nodes)pr(r,0);
for(const a of j.animations||[]){const ts=new Set();let maxT=0,n=0;for(const c of a.channels){const s=a.samplers[c.sampler];const acc=j.accessors[s.input];maxT=Math.max(maxT,acc.max[0]);n=Math.max(n,acc.count)}
  console.log(' anim',a.name,'channels',a.channels.length,'dur',maxT.toFixed(3),'maxkeys',n);
  if(v){const by={};for(const c of a.channels){const nn=j.nodes[c.target.node].name;(by[nn]=by[nn]||[]).push(c.target.path[0]+j.accessors[a.samplers[c.sampler].input].count)}console.log(Object.entries(by).map(e=>e[0]+':'+e[1].join('/')).join(' | '))}}
