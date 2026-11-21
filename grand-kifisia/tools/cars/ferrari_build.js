// Build gk3/models/ferrari.json from the three.js example model (raw/ferrari/ferrari.glb, Draco): decode, weld, simplify with meshoptimizer,
// bake material colours / kinds / light groups into vertex attributes matching 70_vehicles.js (position, normal, color, aux), split glass, one wheel.
// Usage: node tools/cars/ferrari_build.js <in.glb> <out.json> [quality=1]
const fs=require('fs'),path=require('path');const {decodeGLB}=require('./glb_decode');
const NM=process.env.CARS_NODE_MODULES||path.resolve(__dirname,'../../work/cars/tools/node/node_modules');const {MeshoptSimplifier}=require(path.join(NM,'meshoptimizer'));
const Q=+(process.argv[4]||1);
function xf(p,w){const o=new Float32Array(p.length);for(let i=0;i<p.length;i+=3){const x=p[i],y=p[i+1],z=p[i+2];const X=w[0]*x+w[4]*y+w[8]*z+w[12],Y=w[1]*x+w[5]*y+w[9]*z+w[13],Z=w[2]*x+w[6]*y+w[10]*z+w[14];o[i]=-X;o[i+1]=Y;o[i+2]=-Z}return o}// model faces -z: rotate 180° so it faces +z
function weld(pos,idx){const map=new Map(),np=[],remap=new Uint32Array(pos.length/3);for(let i=0;i<pos.length/3;i++){const k=Math.round(pos[i*3]*1e4)+','+Math.round(pos[i*3+1]*1e4)+','+Math.round(pos[i*3+2]*1e4);let j=map.get(k);if(j===undefined){j=np.length/3;map.set(k,j);np.push(pos[i*3],pos[i*3+1],pos[i*3+2])}remap[i]=j}
  const ni=new Uint32Array(idx.length);for(let i=0;i<idx.length;i++)ni[i]=remap[idx[i]];return{pos:new Float32Array(np),idx:ni}}
function simplify(m,target,err){if(m.idx.length/3<=target)return m;const [ni]=MeshoptSimplifier.simplify(m.idx,m.pos,3,Math.max(3,Math.floor(target)*3),err||0.02,[]);return{pos:m.pos,idx:ni}}
function compact(m){const used=new Map(),np=[];const ni=new Uint32Array(m.idx.length);for(let i=0;i<m.idx.length;i++){const v=m.idx[i];let j=used.get(v);if(j===undefined){j=np.length/3;used.set(v,j);np.push(m.pos[v*3],m.pos[v*3+1],m.pos[v*3+2])}ni[i]=j}
  // drop degenerate triangles
  const keep=[];for(let i=0;i<ni.length;i+=3){if(ni[i]!==ni[i+1]&&ni[i+1]!==ni[i+2]&&ni[i]!==ni[i+2])keep.push(ni[i],ni[i+1],ni[i+2])}return{pos:new Float32Array(np),idx:new Uint32Array(keep)}}
function normals(m){const n=new Float32Array(m.pos.length);const P=m.pos;for(let i=0;i<m.idx.length;i+=3){const a=m.idx[i]*3,b=m.idx[i+1]*3,c=m.idx[i+2]*3;const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of[a,b,c]){n[k]+=nx;n[k+1]+=ny;n[k+2]+=nz}}
  for(let i=0;i<n.length;i+=3){const l=Math.hypot(n[i],n[i+1],n[i+2])||1;n[i]/=l;n[i+1]/=l;n[i+2]/=l}return n}
// material table: kind (0 fixed, 1 paint, 2 chrome, 3 gloss), colour (linear), light group, target fraction
const MATS={Body_Color:{k:1,c:[1,1,1],t:3000},metal_chrome:{k:2,c:[0.78,0.78,0.78],t:380},metal_gray:{k:2,c:[0.45,0.45,0.45],t:160},plastic_gray:{k:3,c:[0.05,0.05,0.05],t:320},Interior_dark:{k:0,c:[0.05,0.05,0.05],t:520},
  Interior_light:{k:0,c:[0.09,0.09,0.09],t:380},Leather:{k:0,c:[0.035,0.035,0.04],t:260},Leather_red:{k:0,c:[0.2,0.03,0.03],t:80},Carbon_Fiber:{k:3,c:[0.03,0.03,0.035],t:170},Taillight_Glass:{k:3,c:[0.45,0.0,0.0],lg:2,t:260},
  Projector_Glass:{k:2,c:[0.8,0.8,0.82],lg:1,t:220},Turn_Signal_LED:{k:3,c:[0.6,0.25,0.02],lg:'ind',t:200},Tires:{k:0,c:[0.012,0.012,0.012],t:300},Carpet:{k:0,c:[0.04,0.04,0.04],t:60},Ferrari_Yellow:{k:3,c:[0.94,0.6,0],t:60}};
function pack(parts){let nv=0,ni=0;for(const p of parts){nv+=p.m.pos.length/3;ni+=p.m.idx.length}const pos=new Float32Array(nv*3),nor=new Int8Array(nv*3),col=new Uint8Array(nv*3),aux=new Int8Array(nv*4),idx=new Uint16Array(ni);let vo=0,io=0;
  if(nv>65535)throw new Error('too many vertices '+nv);
  for(const p of parts){const m=p.m,n=normals(m);for(let i=0;i<m.pos.length/3;i++){pos.set(m.pos.subarray(i*3,i*3+3),(vo+i)*3);for(let k=0;k<3;k++){nor[(vo+i)*3+k]=Math.round(n[i*3+k]*127);col[(vo+i)*3+k]=Math.round(Math.sqrt(Math.min(1,p.c[k]))*255)}
      const lg=p.lg==='ind'?(m.pos[i*3]>0?4:5):(p.lg||0);aux[(vo+i)*4]=p.k;aux[(vo+i)*4+1]=lg;aux[(vo+i)*4+2]=-1;aux[(vo+i)*4+3]=0}
    for(let i=0;i<m.idx.length;i++)idx[io+i]=m.idx[i]+vo;vo+=m.pos.length/3;io+=m.idx.length}
  const b=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');return{nv,nt:ni/3,pos:b(pos),nor:b(nor),col:b(col),aux:b(aux),idx:b(idx)}}
(async()=>{await MeshoptSimplifier.ready;const g=await decodeGLB(process.argv[2]);const body=[],glass=[],far=[],wheel=[];let wc=null;
  // wheel centre from the front-right tyre
  for(const p of g.prims){if(p.path.indexOf('wheel_fr/tire')>=0){const P=xf(p.pos,p.world);let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let i=0;i<P.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],P[i+k]);mx[k]=Math.max(mx[k],P[i+k])}wc={c:[(mn[0]+mx[0])/2,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2],r:(mx[1]-mn[1])/2,w:mx[0]-mn[0]}}}
  console.log('wheel',JSON.stringify(wc));
  for(const p of g.prims){const mat=MATS[p.matName];if(p.matName==='_0098_DodgerBlue')continue;let P=xf(p.pos,p.world);const tris=p.idx.length/3;
    if(p.path.indexOf('/wheel_')>=0){if(p.path.indexOf('wheel_fr/')<0)continue;// one wheel → unit wheel: centre at origin, outward face +x (the fr wheel is the right wheel; after the 180° turn its outer face is −x)
      const U=new Float32Array(P.length);for(let i=0;i<P.length;i+=3){U[i]=-(P[i]-wc.c[0])/wc.w;U[i+1]=(P[i+1]-wc.c[1])/wc.r;U[i+2]=-(P[i+2]-wc.c[2])/wc.r}
      const tgt={tire:220,wheel:260,rim_fr:130,brake:70,nuts:30,centre:20}[p.nodeName]||40;const m=compact(simplify(weld(U,p.idx),tgt*Q,0.08));wheel.push({m,k:mat?mat.k:0,c:p.nodeName==='tire'?[0.012,0.012,0.012]:p.nodeName==='brake'?[0.25,0.02,0.02]:mat?mat.c:[0.5,0.5,0.5],lg:0});continue}
    const w=weld(P,p.idx);
    if(p.matName==='Glass_Gray'){const m=compact(simplify(w,400*Q,0.01));glass.push({m,k:0,c:[1,1,1],lg:0});far.push({m:compact(simplify(w,40,0.05)),k:3,c:[0.012,0.016,0.02],lg:0});continue}
    if(!mat){console.log('unmapped',p.matName);continue}
    // share each material's budget among its prims by their size
    const total=g.prims.filter(q=>q.matName===p.matName&&q.path.indexOf('/wheel_')<0).reduce((s,q)=>s+q.idx.length/3,0);let tgt=Math.max(12,mat.t*Q*tris/total);
    let lg=mat.lg;if(p.nodeName==='brakes')lg=3;
    const m=compact(simplify(w,tgt,0.012));body.push({m,k:mat.k,c:mat.c,lg});
    if(['body','chrome','plastic_gray','grills','lights_red','lights','brakes'].indexOf(p.nodeName)>=0){const ft={body:200,chrome:20,plastic_gray:20,grills:10,lights_red:12,lights:6,brakes:6}[p.nodeName];far.push({m:compact(simplify(w,ft,0.06)),k:mat.k,c:mat.c,lg})}}
  // far LOD wheels: the wheel simplified hard, placed at the four corners
  const fw=wheel.filter(p=>p.c[0]<0.02);const L={c:wc.c};
  const out={version:1,name:'Ferrari 458 Italia',credit:'"Ferrari 458 Italia" model by vicent091036 (Sketchfab), CC BY 4.0, as shipped with the three.js examples (examples/models/gltf/ferrari.glb); decoded, simplified and recoloured for Grand Kifisia.',
    wheel:{centre:wc.c,r:wc.r,w:wc.w},near:pack(body),glass:pack(glass),far:pack(far),wheelGeo:pack(wheel)};
  let bb=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(const p of body){const P=p.m.pos;for(let i=0;i<P.length;i+=3)for(let k=0;k<3;k++){bb[k]=Math.min(bb[k],P[i+k]);bb[k+3]=Math.max(bb[k+3],P[i+k])}}out.bbox=bb;
  fs.writeFileSync(process.argv[3],JSON.stringify(out));console.log('near',out.near.nt,'glass',out.glass.nt,'far',out.far.nt,'wheel',out.wheelGeo.nt,'bbox',bb.map(v=>v.toFixed(3)).join(','),'bytes',fs.statSync(process.argv[3]).size)})();
