// node stubtest.js <file.js> : runs the lm-ralphlauren build with stubbed game globals, reports errors + vertex/tri counts (no rendering)
const fs=require('fs'),vm=require('vm'),path=require('path');const ROOT=path.resolve(__dirname,'../../..');
const THREE=require(ROOT+'/npm/package/build/three.cjs');
const core=fs.readFileSync(ROOT+'/gk3/js/00_core.js','utf8');const gbSrc=core.slice(core.indexOf('class GB{'),core.indexOf('size(){return this.vc}'))+'size(){return this.vc}}';
const hfSrc=(core.match(/const hf=[^\n]*/)||[''])[0];
const ctx={THREE,console,Math,performance:{now:()=>0},document:{createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:(t,k)=>k==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):k==='canvas'?{width:256}:()=>({addColorStop(){}})})})}};
vm.createContext(ctx);
vm.runInContext(`const TAU=Math.PI*2;${hfSrc};const clamp=(v,a,b)=>v<a?a:v>b?b:v;${gbSrc};
const TILES=[];const T={},TM={},RECT=new Proxy({},{get:()=>[0,0,1,1]});function defTile(n){T[n]=TILES.length;TILES.push(n);return T[n]}
for(const n of['white','rail','glassR','leaves','hedge'])defTile(n);for(const n of['marble','marbleW','plaster','plasterC','ashlar','tiles','wood','metal','flatroof','brickw','bark','hedge'])TM[n]=defTile(n+'_m');
const CH={o:new GB(),cut:new GB()};function chunkAt(){return CH}function terr(x,z){return 30+0.02*x-0.01*z}let groundY=(x,z)=>terr(x,z)+0.1;function lvl(){return 0.12}
const SEGS=[];function addSeg(){SEGS.push([...arguments])}function addBoxC(){}function placed(){}function shade(c,f){return[c[0]*f,c[1]*f,c[2]*f]}
function triangulate(r){const o=r[0];const t=[];for(let i=1;i<o.length-1;i++)t.push([o[0],o[i],o[i+1]]);return t}
const scene={children:[],add(m){this.children.push(m)}};const FRAME_HOOKS=[];const SKY={night:0.8};const LIGHTS=[];function addLight(){LIGHTS.push([...arguments])}
const LM={list:[],built:[],register(o){this.list.push(o)}};function texSrc(){return null}function pGrad(){}function pRect(){}function speck(){}
this.__x={CH,SEGS,LM,scene,FRAME_HOOKS,LIGHTS,getRL:()=>RL_VILLA};`,ctx);
vm.runInContext(fs.readFileSync(process.argv[2],'utf8')+';this.__x.getRL=()=>RL_VILLA;',ctx);
const X=ctx.__x;const ps=[[177.9,48.2],[168.8,45.2],[167.5,49.1],[166.1,48.7],[161.5,62.8],[166.8,64.5],[166.3,66.1],[170.1,67.3],[170.6,65.7],[172.8,66.4],[176.5,55.2],[175.7,55.0]];
const t0=Date.now();X.LM.list[0].build({footprints:[{ps}]});
for(const h of X.FRAME_HOOKS)h(0.016);const o=X.CH.o,c=X.CH.cut;
console.log('OK build',Date.now()-t0,'ms; opaque verts',o.vc,'tris',o.i.length/3,'| cut verts',c.vc,'tris',c.i.length/3,'| segs',X.SEGS.length,'| scene meshes',X.scene.children.length,'| lights',X.LIGHTS.length);
let bad=0;for(const v of o.p)if(!isFinite(v))bad++;for(const v of c.p)if(!isFinite(v))bad++;console.log('non-finite coords',bad,'| Y0',X.getRL().Y0);
