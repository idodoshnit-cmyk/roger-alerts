// Shared helpers for the character pipeline: GLB reading, quaternion/matrix math, sampling of glTF animations.
'use strict';
const fs=require('fs');
function readGLB(file){const b=fs.readFileSync(file);if(b.readUInt32LE(0)!==0x46546C67)throw new Error('not glb: '+file);const jl=b.readUInt32LE(12);const json=JSON.parse(b.slice(20,20+jl).toString('utf8'));
  let bin=null;const o=20+jl;if(o<b.length){const bl=b.readUInt32LE(o);bin=b.slice(o+8,o+8+bl)}return{json,bin}}
const CT={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function accessor(g,i){const a=g.json.accessors[i],bv=g.json.bufferViews[a.bufferView],T=CT[a.componentType],n=NC[a.type];const off=(bv.byteOffset||0)+(a.byteOffset||0);const stride=bv.byteStride||T.BYTES_PER_ELEMENT*n;
  const out=new T(a.count*n);const dv=new DataView(g.bin.buffer,g.bin.byteOffset,g.bin.byteLength);const rd={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];
  for(let k=0;k<a.count;k++)for(let c=0;c<n;c++)out[k*n+c]=dv[rd](off+k*stride+c*T.BYTES_PER_ELEMENT,true);
  if(a.normalized&&a.componentType!==5126){const f=new Float32Array(out.length);const d={5120:127,5121:255,5122:32767,5123:65535}[a.componentType];for(let k=0;k<out.length;k++)f[k]=Math.max(-1,out[k]/d);return f}
  return out}
/* quaternions are [x,y,z,w] arrays; matrices are column-major 16 arrays (affine) */
const Q={mul(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]},
  inv(a){return[-a[0],-a[1],-a[2],a[3]]},norm(a){const l=Math.hypot(a[0],a[1],a[2],a[3])||1;return[a[0]/l,a[1]/l,a[2]/l,a[3]/l]},
  rot(q,v){const x=v[0],y=v[1],z=v[2],qx=q[0],qy=q[1],qz=q[2],qw=q[3];const ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;return[ix*qw+iw*-qx+iy*-qz-iz*-qy,iy*qw+iw*-qy+iz*-qx-ix*-qz,iz*qw+iw*-qz+ix*-qy-iy*-qx]},
  slerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];let s=1;if(d<0){d=-d;s=-1}if(d>0.9995)return Q.norm([a[0]+(b[0]*s-a[0])*t,a[1]+(b[1]*s-a[1])*t,a[2]+(b[2]*s-a[2])*t,a[3]+(b[3]*s-a[3])*t]);const th=Math.acos(d),sn=Math.sin(th),wa=Math.sin((1-t)*th)/sn,wb=Math.sin(t*th)/sn*s;return[a[0]*wa+b[0]*wb,a[1]*wa+b[1]*wb,a[2]*wa+b[2]*wb,a[3]*wa+b[3]*wb]},
  axis(ax,ang){const s=Math.sin(ang/2);return[ax[0]*s,ax[1]*s,ax[2]*s,Math.cos(ang/2)]},
  angle(a,b){const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return 2*Math.acos(Math.min(1,d))},
  fromMat(m){const m00=m[0],m10=m[1],m20=m[2],m01=m[4],m11=m[5],m21=m[6],m02=m[8],m12=m[9],m22=m[10];const tr=m00+m11+m22;let q;
    if(tr>0){const s=Math.sqrt(tr+1)*2;q=[(m21-m12)/s,(m02-m20)/s,(m10-m01)/s,0.25*s]}else if(m00>m11&&m00>m22){const s=Math.sqrt(1+m00-m11-m22)*2;q=[0.25*s,(m01+m10)/s,(m02+m20)/s,(m21-m12)/s]}
    else if(m11>m22){const s=Math.sqrt(1+m11-m00-m22)*2;q=[(m01+m10)/s,0.25*s,(m12+m21)/s,(m02-m20)/s]}else{const s=Math.sqrt(1+m22-m00-m11)*2;q=[(m02+m20)/s,(m12+m21)/s,0.25*s,(m10-m01)/s]}return Q.norm(q)}};
const M={ident(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},
  trs(t,q,s){const x=q[0],y=q[1],z=q[2],w=q[3],x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2,sx=s?s[0]:1,sy=s?s[1]:1,sz=s?s[2]:1;
    return[(1-(yy+zz))*sx,(xy+wz)*sx,(xz-wy)*sx,0,(xy-wz)*sy,(1-(xx+zz))*sy,(yz+wx)*sy,0,(xz+wy)*sz,(yz-wx)*sz,(1-(xx+yy))*sz,0,t[0],t[1],t[2],1]},
  mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
  inv(m){// general 4x4 inverse
    const a=m,o=new Array(16);const b00=a[0]*a[5]-a[1]*a[4],b01=a[0]*a[6]-a[2]*a[4],b02=a[0]*a[7]-a[3]*a[4],b03=a[1]*a[6]-a[2]*a[5],b04=a[1]*a[7]-a[3]*a[5],b05=a[2]*a[7]-a[3]*a[6],b06=a[8]*a[13]-a[9]*a[12],b07=a[8]*a[14]-a[10]*a[12],b08=a[8]*a[15]-a[11]*a[12],b09=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14];
    let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;det=1/det;
    o[0]=(a[5]*b11-a[6]*b10+a[7]*b09)*det;o[1]=(a[2]*b10-a[1]*b11-a[3]*b09)*det;o[2]=(a[13]*b05-a[14]*b04+a[15]*b03)*det;o[3]=(a[10]*b04-a[9]*b05-a[11]*b03)*det;
    o[4]=(a[6]*b08-a[4]*b11-a[7]*b07)*det;o[5]=(a[0]*b11-a[2]*b08+a[3]*b07)*det;o[6]=(a[14]*b02-a[12]*b05-a[15]*b01)*det;o[7]=(a[8]*b05-a[10]*b02+a[11]*b01)*det;
    o[8]=(a[4]*b10-a[5]*b08+a[7]*b06)*det;o[9]=(a[1]*b08-a[0]*b10-a[3]*b06)*det;o[10]=(a[12]*b04-a[13]*b02+a[15]*b00)*det;o[11]=(a[9]*b02-a[8]*b04-a[11]*b00)*det;
    o[12]=(a[5]*b07-a[4]*b09-a[6]*b06)*det;o[13]=(a[0]*b09-a[1]*b07+a[2]*b06)*det;o[14]=(a[13]*b01-a[12]*b03-a[14]*b00)*det;o[15]=(a[8]*b03-a[9]*b01+a[10]*b00)*det;return o},
  pt(m,v){return[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]},
  dir(m,v){return[m[0]*v[0]+m[4]*v[1]+m[8]*v[2],m[1]*v[0]+m[5]*v[1]+m[9]*v[2],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]]},
  pos(m){return[m[12],m[13],m[14]]},
  /* rotation part as quaternion (removes scale) */
  quat(m){const sx=Math.hypot(m[0],m[1],m[2]),sy=Math.hypot(m[4],m[5],m[6]),sz=Math.hypot(m[8],m[9],m[10]);return Q.fromMat([m[0]/sx,m[1]/sx,m[2]/sx,0,m[4]/sy,m[5]/sy,m[6]/sy,0,m[8]/sz,m[9]/sz,m[10]/sz,0,0,0,0,1])}};
/* Scene helper: nodes by name, parents, rest TRS, and a sampler that evaluates the (single) animation at time t into world matrices. */
function scene(g){const j=g.json,N=j.nodes.length,parent=new Array(N).fill(-1);j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parent[c]=i));const byName={};j.nodes.forEach((n,i)=>{if(!(n.name in byName))byName[n.name]=i});
  const order=[];const visit=i=>{order.push(i);(j.nodes[i].children||[]).forEach(visit)};j.scenes[j.scene||0].nodes.forEach(visit);
  const rest=j.nodes.map(n=>({t:n.translation||[0,0,0],r:n.rotation||[0,0,0,1],s:n.scale||[1,1,1]}));
  let tracks=null,duration=0,nkeys=0;if(j.animations&&j.animations.length){const a=j.animations[0];tracks=j.nodes.map(()=>({}));for(const c of a.channels){const s=a.samplers[c.sampler];const times=accessor(g,s.input),vals=accessor(g,s.output);tracks[c.target.node][c.target.path]={times,vals,interp:s.interpolation||'LINEAR'};duration=Math.max(duration,times[times.length-1]);nkeys=Math.max(nkeys,times.length)}}
  function sampleTrack(tr,t,n){const T=tr.times;let i=0;if(t<=T[0])i=0;else if(t>=T[T.length-1])i=T.length-1;else{let lo=0,hi=T.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(T[m]<=t)lo=m;else hi=m}i=lo}
    const i1=Math.min(T.length-1,i+1);const f=i1===i?0:Math.min(1,Math.max(0,(t-T[i])/(T[i1]-T[i])));const a=Array.from(tr.vals.subarray(i*n,i*n+n)),b=Array.from(tr.vals.subarray(i1*n,i1*n+n));
    if(n===4)return Q.slerp(a,b,f);return a.map((v,k)=>v+(b[k]-v)*f)}
  function local(i,t){const r=rest[i];if(tracks===null||t===undefined)return{t:r.t,r:r.r,s:r.s};const tk=tracks[i];return{t:tk.translation?sampleTrack(tk.translation,t,3):r.t,r:tk.rotation?sampleTrack(tk.rotation,t,4):r.r,s:tk.scale?sampleTrack(tk.scale,t,3):r.s}}
  function world(t){const W=new Array(N);for(const i of order){const l=local(i,t);const m=M.trs(l.t,l.r,l.s);W[i]=parent[i]<0?m:M.mul(W[parent[i]],m)}return W}
  return{j,N,parent,byName,order,rest,tracks,duration,nkeys,local,world}}
module.exports={readGLB,accessor,Q,M,scene};
