// Prints the material table (markdown) from js/10_atlas.js + tex/manifest.json. usage: node tools/tex/tiletable.js [gk3 dir]
const fs=require('fs'),path=require('path'),vm=require('vm');const GK=process.argv[2]||path.join(__dirname,'../../gk3');
class Tx{constructor(){this.image={}}}
const ctx={THREE:{DataArrayTexture:Tx,DataTexture:Tx,NearestFilter:0,RGBAFormat:0,FloatType:0,MeshPhongMaterial:Tx,MeshLambertMaterial:Tx,MeshDepthMaterial:Tx},U:{noiseL:{value:0}},TAU:Math.PI*2,console,Math,Object,Set,Float32Array,Uint8Array,Error};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(GK,'js/10_atlas.js'),'utf8')+'\n;this.__T=T;this.__TILE=TILE;',ctx);
const man=JSON.parse(fs.readFileSync(path.join(GK,'tex/manifest.json'),'utf8')),meta=man.meta;const T=ctx.__T,TILE=ctx.__TILE;
const rows=[];for(const d of TILE){if(!d)continue;const base=d.alias?TILE[T[d.alias]]:d;const m=base.photo&&meta[base.photo]?meta[base.photo].m:0;
  const unit=m?[+(d.rep[0]*m).toFixed(2),+(d.rep[1]*m).toFixed(2)]:null;
  rows.push({id:d.id,name:d.name,kind:d.alias?'alias of '+d.alias:(d.photo?'photo':'painted'),src:base.photo&&meta[base.photo]?meta[base.photo].src:'',m,unit,cut:d.cut,nrm:d.nrm||'',spec:d.spec,shin:d.shin,refl:d.refl,glass:d.glass,glowK:d.glowK,macro:d.macro})}
if(process.argv.includes('--json')){console.log(JSON.stringify(rows));process.exit(0)}
console.log('| id | T.name | kind | source | photo repeat (m) | 1 caller UV unit (m) | normal | spec/shin | notes |');console.log('|---|---|---|---|---|---|---|---|---|');
for(const r of rows){const notes=[];if(r.cut)notes.push('alpha cut-out');if(r.glass)notes.push('glass mask');if(r.refl)notes.push('reflective '+r.refl);if(r.macro)notes.push('macro '+r.macro);
  console.log(`| ${r.id} | ${r.name} | ${r.kind} | ${r.src.replace('polyhaven:','PH ')} | ${r.m||'—'} | ${r.unit?(r.unit[0]===r.unit[1]?r.unit[0]:r.unit.join(' × ')):'see text'} | ${r.nrm||'—'} | ${r.spec}/${r.shin} | ${notes.join(', ')} |`)}
