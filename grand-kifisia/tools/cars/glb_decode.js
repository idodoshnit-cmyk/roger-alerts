// Decode a Draco-compressed GLB into plain arrays. Usage: const {decodeGLB}=require('./glb_decode'); const g=await decodeGLB(path)
// Returns {json, prims:[{node,nodeName,mesh,meshName,material,matName,world:Float64Array(16),pos:Float32Array,nor:Float32Array|null,uv,idx:Uint32Array}]}
const fs=require('fs'),path=require('path');
const NM=process.env.CARS_NODE_MODULES||path.resolve(__dirname,'../../work/cars/tools/node/node_modules');
function mul(a,b){const o=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
function trs(n){if(n.matrix)return Float64Array.from(n.matrix);const t=n.translation||[0,0,0],q=n.rotation||[0,0,0,1],s=n.scale||[1,1,1];const [x,y,z,w]=q;
  const m=new Float64Array(16);m[0]=(1-2*(y*y+z*z))*s[0];m[1]=(2*(x*y+z*w))*s[0];m[2]=(2*(x*z-y*w))*s[0];m[4]=(2*(x*y-z*w))*s[1];m[5]=(1-2*(x*x+z*z))*s[1];m[6]=(2*(y*z+x*w))*s[1];m[8]=(2*(x*z+y*w))*s[2];m[9]=(2*(y*z-x*w))*s[2];m[10]=(1-2*(x*x+y*y))*s[2];m[12]=t[0];m[13]=t[1];m[14]=t[2];m[15]=1;return m}
async function decodeGLB(file){const buf=fs.readFileSync(file);const jl=buf.readUInt32LE(12);const json=JSON.parse(buf.slice(20,20+jl).toString('utf8'));const bin=buf.slice(20+jl+8);
  const draco3d=require(path.join(NM,'draco3d'));const dm=await draco3d.createDecoderModule({});const dec=new dm.Decoder();
  const bv=i=>{const v=json.bufferViews[i];return bin.slice(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)};
  const prims=[];const ident=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function walk(ni,parent,pathNames){const n=json.nodes[ni];const w=mul(parent,trs(n));const names=pathNames.concat([n.name||('node'+ni)]);
    if(n.mesh!==undefined){const m=json.meshes[n.mesh];m.primitives.forEach((p,pi)=>{const ex=p.extensions&&p.extensions.KHR_draco_mesh_compression;let pos,nor=null,uv=null,idx;
      if(ex){const data=bv(ex.bufferView);const b=new dm.DecoderBuffer();b.Init(new Int8Array(data.buffer,data.byteOffset,data.byteLength),data.byteLength);const mesh=new dm.Mesh();const st=dec.DecodeBufferToMesh(b,mesh);if(!st.ok())throw new Error('draco '+st.error_msg());
        const nf=mesh.num_faces(),nv=mesh.num_points();const get=(id,comps)=>{const a=dec.GetAttributeByUniqueId(mesh,id);const arr=new dm.DracoFloat32Array();dec.GetAttributeFloatForAllPoints(mesh,a,arr);const o=new Float32Array(nv*comps);for(let i=0;i<nv*comps;i++)o[i]=arr.GetValue(i);dm.destroy(arr);return o};
        pos=get(ex.attributes.POSITION,3);if(ex.attributes.NORMAL!==undefined)nor=get(ex.attributes.NORMAL,3);if(ex.attributes.TEXCOORD_0!==undefined)uv=get(ex.attributes.TEXCOORD_0,2);
        idx=new Uint32Array(nf*3);const fa=new dm.DracoInt32Array();for(let f=0;f<nf;f++){dec.GetFaceFromMesh(mesh,f,fa);idx[f*3]=fa.GetValue(0);idx[f*3+1]=fa.GetValue(1);idx[f*3+2]=fa.GetValue(2)}dm.destroy(fa);dm.destroy(mesh);dm.destroy(b)}
      else throw new Error('non-draco primitive not supported');
      prims.push({node:ni,nodeName:n.name,path:names.join('/'),mesh:n.mesh,meshName:m.name,material:p.material,matName:json.materials[p.material]&&json.materials[p.material].name,world:w,pos,nor,uv,idx})})}
    (n.children||[]).forEach(c=>walk(c,w,names))}
  for(const r of json.scenes[json.scene||0].nodes)walk(r,ident,[]);return{json,prims}}
module.exports={decodeGLB,mul,trs};
if(require.main===module){decodeGLB(process.argv[2]).then(g=>{let tot=0;for(const p of g.prims){const w=p.world;let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let i=0;i<p.pos.length;i+=3){const x=p.pos[i],y=p.pos[i+1],z=p.pos[i+2];const X=w[0]*x+w[4]*y+w[8]*z+w[12],Y=w[1]*x+w[5]*y+w[9]*z+w[13],Z=w[2]*x+w[6]*y+w[10]*z+w[14];mn[0]=Math.min(mn[0],X);mn[1]=Math.min(mn[1],Y);mn[2]=Math.min(mn[2],Z);mx[0]=Math.max(mx[0],X);mx[1]=Math.max(mx[1],Y);mx[2]=Math.max(mx[2],Z)}
    tot+=p.idx.length/3;console.log(p.path.padEnd(46),String(p.matName).padEnd(16),String(p.idx.length/3).padStart(7),'tris',String(p.pos.length/3).padStart(6),'v  bbox',mn.map(v=>v.toFixed(2)).join(','),'→',mx.map(v=>v.toFixed(2)).join(','))}console.log('total tris',tot)})}
