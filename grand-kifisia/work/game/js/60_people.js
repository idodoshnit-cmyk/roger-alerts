'use strict';
/* Grand Kifisia — procedural humans, realistic rigged humans, Ped LOD wrapper */
/* ============================== CHARACTERS (procedural skinned humans) ============================== */
const BONEDEF=[['root',-1,0,0,0],['hips',0,0,0.98,0],['spine',1,0,0.1,0],['chest',2,0,0.18,0],['neck',3,0,0.24,0],['head',4,0,0.09,0],
 ['shoulderL',3,0.07,0.2,0],['upperArmL',6,0.11,0,0],['foreArmL',7,0,-0.29,0],['handL',8,0,-0.25,0],
 ['shoulderR',3,-0.07,0.2,0],['upperArmR',10,-0.11,0,0],['foreArmR',11,0,-0.29,0],['handR',12,0,-0.25,0],
 ['thighL',1,0.095,-0.04,0],['shinL',14,0,-0.43,0],['footL',15,0,-0.42,0],['thighR',1,-0.095,-0.04,0],['shinR',17,0,-0.43,0],['footR',18,0,-0.42,0]];
const BI={};BONEDEF.forEach((b,i)=>BI[b[0]]=i);
const BONEW=BONEDEF.map(()=>[0,0,0]);BONEDEF.forEach((b,i)=>{if(b[1]<0)BONEW[i]=[b[2],b[3],b[4]];else{const p=BONEW[b[1]];BONEW[i]=[p[0]+b[2],p[1]+b[3],p[2]+b[4]]}});
/* character texture: white body + faces */
const chC=document.createElement('canvas');chC.width=512;chC.height=256;
function paintChar(){const g=chC.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,512,256);
  for(let v=0;v<8;v++){const x=(v%4)*128,y=128+Math.floor(v/4)*0;if(v>=4)continue;}
  for(let v=0;v<6;v++){const ox=(v%4)*128,oy=Math.floor(v/4)*128;if(oy===0&&v<4||v>=4){const X=ox,Y=oy;g.fillStyle='#ffffff';g.fillRect(X,Y,128,128);
    const ey=Y+58,sp=19+(v%3)*2;g.fillStyle='#fff';[-1,1].forEach(s=>{g.beginPath();g.ellipse(X+64+s*sp,ey,8,4.5,0,0,TAU);g.fill()});
    g.fillStyle=['#3b2a1e','#2a1d14','#4a6a3a','#2c3e5a','#5a3a20','#1e1a16'][v];[-1,1].forEach(s=>{g.beginPath();g.arc(X+64+s*sp,ey,3.6,0,TAU);g.fill()});g.fillStyle='#000';[-1,1].forEach(s=>{g.beginPath();g.arc(X+64+s*sp,ey,1.6,0,TAU);g.fill()});
    g.fillStyle='rgba(70,45,30,.85)';[-1,1].forEach(s=>{g.save();g.translate(X+64+s*sp,ey-11);g.rotate(s*-0.08);g.fillRect(-10,-2,20,v===4?3:4);g.restore()});
    g.fillStyle='rgba(120,80,60,.25)';g.beginPath();g.moveTo(X+64,ey+4);g.lineTo(X+59,ey+22);g.lineTo(X+69,ey+22);g.fill();
    g.fillStyle=v===1||v===4?'#a8574f':'#9a5a4e';g.beginPath();g.ellipse(X+64,Y+92,v===1||v===4?11:10,3.4,0,0,TAU);g.fill();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(X+55,Y+91,18,1.2);
    if(v===2||v===5){g.fillStyle='rgba(40,30,25,.32)';g.beginPath();g.ellipse(X+64,Y+98,26,20,0,0,Math.PI);g.fill()}}}
  // fabric noise strip at y 200..256 for clothes
  for(let k=0;k<5000;k++){g.fillStyle=MR()<0.5?'rgba(0,0,0,.07)':'rgba(255,255,255,.08)';g.fillRect(MR()*512,200+MR()*56,1+MR()*2,1+MR()*2)}}
const FACE_UV=v=>{const ox=(v%4)*128,oy=Math.floor(v/4)*128;return[ox/512,1-(oy+128)/256,128/512,128/256]};
const CLOTH_UV=[0.02,0.02,0.96,0.18];
function buildHumanGeo(o){const P=[],N=[],C=[],UV=[],SI=[],SW=[],IDX=[];
  const push=(p,n,col,uv,b0,b1,w1)=>{P.push(p[0],p[1],p[2]);N.push(n[0],n[1],n[2]);C.push(col[0],col[1],col[2]);UV.push(uv[0],uv[1]);SI.push(b0,b1<0?0:b1,0,0);SW.push(1-(w1||0),b1<0?0:(w1||0),0,0);return P.length/3-1};
  const fem=o.fem,b=o.build||1;
  const skin=hexc(o.skin),shirt=hexc(o.shirt),pants=hexc(o.pants),shoes=hexc(o.shoes||'#222222'),hair=hexc(o.hair);
  const cloth=(col,u,v)=>[CLOTH_UV[0]+u*CLOTH_UV[2],CLOTH_UV[1]+v*CLOTH_UV[3]];
  // generic lofted tube: centers & radii per ring, bone weights per ring
  function loft(rings,seg,colF,uvF,cap0,cap1){const base=P.length/3;for(let r=0;r<rings.length;r++){const R_=rings[r];for(let s=0;s<=seg;s++){const a=s/seg*TAU;const ca=Math.cos(a),sa=Math.sin(a);const x=R_.c[0]+ca*R_.rx,y=R_.c[1],z=R_.c[2]+sa*R_.rz;const n=[ca*R_.rz,0,sa*R_.rx];const l=Math.hypot(...n)||1;
      push([x,y,z],[n[0]/l,n[1]/l,n[2]/l],colF(r,s),uvF(r/(rings.length-1),s/seg),R_.b0,R_.b1,R_.w)}}
    for(let r=0;r<rings.length-1;r++)for(let s=0;s<seg;s++){const a=base+r*(seg+1)+s,b2=a+seg+1;IDX.push(a,b2,a+1,a+1,b2,b2+1)}
    const close=(r,up)=>{const R_=rings[r];const c=push([R_.c[0],R_.c[1]+(up?R_.rz*0.5:-R_.rz*0.5),R_.c[2]],[0,up?1:-1,0],colF(r,0),uvF(r/(rings.length-1),0),R_.b0,R_.b1,R_.w);for(let s=0;s<seg;s++){const a=base+r*(seg+1)+s;if(up)IDX.push(a,c,a+1);else IDX.push(a,a+1,c)}};
    if(cap0)close(0,false);if(cap1)close(rings.length-1,true)}
  // limb tube between two joints (vertical-ish), with blend toward parent at the top and child at the bottom
  function limb(j0,j1,r0,r1,bone,parentB,childB,col,n,flat){const rings=[];const steps=n||6;for(let i=0;i<=steps;i++){const t=i/steps;const c=[lerp(j0[0],j1[0],t),lerp(j0[1],j1[1],t),lerp(j0[2],j1[2],t)];const r=lerp(r0,r1,t)*(1+0.12*Math.sin(t*Math.PI));
      let b0=bone,b1=-1,w=0;if(t<0.22&&parentB>=0){b1=parentB;w=0.5*(1-t/0.22)}else if(t>0.78&&childB>=0){b1=childB;w=0.5*((t-0.78)/0.22)}rings.push({c,rx:r,rz:r*(flat||1),b0,b1,w})}
    loft(rings,8,()=>col,(u,v)=>cloth(col,v,u),true,true)}
  const hipsY=0.98,sh=BONEW[BI.upperArmL],shR=BONEW[BI.upperArmR];
  // torso
  const TW=fem?[0.165,0.175,0.135,0.15,0.165,0.17,0.14]:[0.16,0.165,0.15,0.165,0.185,0.19,0.15],TD=fem?[0.115,0.12,0.1,0.11,0.12,0.11,0.09]:[0.11,0.115,0.105,0.115,0.12,0.11,0.09];
  const TY=[0.86,0.96,1.08,1.2,1.32,1.42,1.49];const belt=fem&&o.dress?1.12:0.97;
  const trings=TY.map((y,i)=>{let b0=BI.hips,b1=-1,w=0;if(y>0.98&&y<=1.12){b0=BI.hips;b1=BI.spine;w=(y-0.98)/0.14}else if(y>1.12&&y<=1.26){b0=BI.spine;b1=BI.chest;w=(y-1.12)/0.14}else if(y>1.26){b0=BI.chest}return{c:[0,y,0],rx:TW[i]*b,rz:TD[i]*Math.sqrt(b),b0,b1,w}});
  loft(trings,12,r=>TY[r]<belt?pants:shirt,(u,v)=>cloth(null,v,u),true,true);
  // dress / skirt
  if(fem&&o.dress){const rings=[];for(let i=0;i<=4;i++){const t=i/4;const y=lerp(1.0,0.5,t);rings.push({c:[0,y,0],rx:lerp(0.17,0.25,t)*b,rz:lerp(0.13,0.2,t)*b,b0:BI.hips,b1:-1,w:0})}loft(rings,12,()=>shirt,(u,v)=>cloth(null,v,u),false,false)}
  // shoulders
  const shoulderBall=(j,bone)=>{const rings=[];for(let i=0;i<=4;i++){const t=i/4;const y=j[1]+0.06-t*0.12;const r=Math.sin(t*Math.PI)*0.07+0.012;rings.push({c:[j[0]*0.92,y,j[2]],rx:r,rz:r,b0:BI.chest,b1:bone,w:0.5})}loft(rings,8,()=>shirt,(u,v)=>cloth(null,v,u),false,false)};
  shoulderBall(sh,BI.upperArmL);shoulderBall(shR,BI.upperArmR);
  // arms
  const longSleeve=o.sleeves==='long';
  for(const [side,ua,fa,hd] of [['L',BI.upperArmL,BI.foreArmL,BI.handL],['R',BI.upperArmR,BI.foreArmR,BI.handR]]){const j0=BONEW[ua],j1=BONEW[fa],j2=BONEW[hd];
    limb(j0,j1,0.05*b,0.043*b,ua,BI.chest,fa,o.sleeves==='none'?skin:shirt,5);limb(j1,j2,0.041*b,0.032,fa,ua,hd,longSleeve?shirt:skin,5);
    const hc=[j2[0],j2[1]-0.075,j2[2]+0.01];limb([hc[0],hc[1]+0.06,hc[2]],[hc[0],hc[1]-0.05,hc[2]+0.005],0.033,0.024,hd,fa,-1,skin,3,0.55)}
  // legs
  const shorts=o.shorts;
  for(const [th,sn,ft] of [[BI.thighL,BI.shinL,BI.footL],[BI.thighR,BI.shinR,BI.footR]]){const j0=BONEW[th],j1=BONEW[sn],j2=BONEW[ft];
    const legCol=fem&&o.dress?skin:pants;limb([j0[0],j0[1]+0.04,j0[2]],j1,0.085*b,0.058*b,th,BI.hips,sn,legCol,6);limb(j1,[j2[0],j2[1]+0.02,j2[2]],0.057*b,0.04,sn,th,ft,shorts||(fem&&o.dress)?skin:pants,6);
    // shoe
    const rings=[];const sx=j2[0];for(let i=0;i<=5;i++){const t=i/5;const z=lerp(-0.06,0.19,t);const r=0.05+0.012*Math.sin(t*Math.PI);rings.push({c:[sx,0.045+0.012*(1-t),z],rx:r*0.95,rz:0.042,b0:ft,b1:-1,w:0})}
    const base=P.length/3;for(let r=0;r<rings.length;r++){const R_=rings[r];for(let s=0;s<=8;s++){const a=s/8*TAU;const x=R_.c[0]+Math.cos(a)*R_.rx,y=R_.c[1]+Math.sin(a)*R_.rz*1.1,zz=R_.c[2];push([x,Math.max(0.005,y),zz],[Math.cos(a),Math.sin(a),0],shoes,cloth(null,0.5,0.5),ft,-1,0)}}
    for(let r=0;r<rings.length-1;r++)for(let s=0;s<8;s++){const a=base+r*9+s,b2=a+9;IDX.push(a,a+1,b2,a+1,b2+1,b2)}const tipC=push([sx,0.05,0.215],[0,0,1],shoes,cloth(null,0.5,0.5),ft,-1,0);for(let s=0;s<8;s++){const a=base+5*9+s;IDX.push(a,a+1,tipC)}const heelC=push([sx,0.05,-0.075],[0,0,-1],shoes,cloth(null,0.5,0.5),ft,-1,0);for(let s=0;s<8;s++){const a=base+s;IDX.push(a+1,a,heelC)}}
  // neck
  limb([0,1.47,0],[0,1.6,0.005],0.052,0.048,BI.neck,BI.chest,BI.head,skin,3);
  // head (ellipsoid) with face mapped from the face atlas
  const hc=[0,1.705,0.012],hr=[0.094,0.118,0.104],fuv=FACE_UV(o.face||0);const hseg=16,hring=12;const hb=P.length/3;
  for(let r=0;r<=hring;r++){const v=r/hring;const phi=v*Math.PI;for(let s=0;s<=hseg;s++){const u=s/hseg;const th=u*TAU;let x=Math.sin(phi)*Math.sin(th),y=Math.cos(phi),z=Math.sin(phi)*Math.cos(th);
      const jaw=y<-0.1?1-0.18*(-y-0.1):1;x*=jaw;let zz=z;if(z>0.2&&y<0.2&&y>-0.35&&Math.abs(x)<0.18)zz+=0.06*(1-Math.abs(x)/0.18)*(1-Math.abs(y+0.08)/0.28);
      const px=hc[0]+x*hr[0],py=hc[1]+y*hr[1],pz=hc[2]+zz*hr[2];let uv;if(z>0.05){const fu=0.5+x*0.62,fv=0.53+y*0.55;uv=[fuv[0]+clamp(fu,0,1)*fuv[2],fuv[1]+clamp(fv,0,1)*fuv[3]]}else uv=[0.9,0.95];
      push([px,py,pz],[x,y,z],skin,uv,BI.head,-1,0)}}
  for(let r=0;r<hring;r++)for(let s=0;s<hseg;s++){const a=hb+r*(hseg+1)+s,b2=a+hseg+1;IDX.push(a,a+1,b2,a+1,b2+1,b2)}
  // hair shell
  if(o.hairStyle!=='bald'){const hb2=P.length/3;const grow=o.hairStyle==='curly'?1.18:1.06;const line=(x,y,z)=>{if(o.hairStyle==='long'||o.hairStyle==='bun'||o.hairStyle==='pony')return z>0.45?y>0.32:y>-0.55;if(o.hairStyle==='buzz')return z>0.5?y>0.42:y>-0.15;return z>0.45?y>0.36:y>-0.28};
    const keep=[];for(let r=0;r<=hring;r++){const phi=r/hring*Math.PI;for(let s=0;s<=hseg;s++){const th=s/hseg*TAU;const x=Math.sin(phi)*Math.sin(th),y=Math.cos(phi),z=Math.sin(phi)*Math.cos(th);const g2=grow*(o.hairStyle==='curly'?1+0.05*Math.sin(th*7)*Math.sin(phi*5):1);
      keep.push(line(x,y,z));push([hc[0]+x*hr[0]*g2,hc[1]+y*hr[1]*g2+0.008,hc[2]+z*hr[2]*g2-0.004],[x,y,z],hair,cloth(null,0.3,0.6),BI.head,-1,0)}}
    for(let r=0;r<hring;r++)for(let s=0;s<hseg;s++){const a=r*(hseg+1)+s,b2=a+hseg+1;if(keep[a]&&keep[a+1]&&keep[b2]&&keep[b2+1])IDX.push(hb2+a,hb2+a+1,hb2+b2,hb2+a+1,hb2+b2+1,hb2+b2)}
    if(o.hairStyle==='long'){const rings=[];for(let i=0;i<=4;i++){const t=i/4;rings.push({c:[0,lerp(1.68,1.36,t),-0.06-t*0.02],rx:lerp(0.1,0.11,t),rz:lerp(0.06,0.035,t),b0:i<2?BI.head:BI.chest,b1:i===2?BI.head:-1,w:0.5})}loft(rings,10,()=>hair,(u,v)=>cloth(null,v,u),false,true)}
    if(o.hairStyle==='bun'||o.hairStyle==='pony'){const c=[0,o.hairStyle==='bun'?1.8:1.72,-0.1];limb([c[0],c[1]+0.04,c[2]],[c[0],c[1]-(o.hairStyle==='pony'?0.22:0.02),c[2]-0.02],0.05,0.035,BI.head,-1,-1,hair,3)}}
  if(o.glasses){limb([-0.07,1.715,0.108],[0.07,1.715,0.108],0.012,0.012,BI.head,-1,-1,hexc('#111111'),1,0.6)}
  if(o.cap){const rings=[];for(let i=0;i<=3;i++){const t=i/3;rings.push({c:[0,1.75+t*0.07,0.005],rx:lerp(0.105,0.07,t),rz:lerp(0.115,0.075,t),b0:BI.head,b1:-1,w:0})}loft(rings,12,()=>hexc(o.capColor||'#222'),(u,v)=>cloth(null,v,u),false,true);
    const rings2=[{c:[0,1.752,0.12],rx:0.08,rz:0.05,b0:BI.head,b1:-1,w:0},{c:[0,1.748,0.15],rx:0.075,rz:0.04,b0:BI.head,b1:-1,w:0}];loft(rings2,10,()=>hexc(o.capColor||'#222'),(u,v)=>cloth(null,v,u),true,true)}
  if(o.bag){const bx=o.bag==='L'?0.27:-0.27;limb([bx,1.02,0.02],[bx,0.78,0.03],0.08,0.08,o.bag==='L'?BI.handL:BI.handR,-1,-1,hexc(o.bagColor||'#c9a227'),2,0.4)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));g.setIndex(IDX);g.computeVertexNormals();return g}
function makeSkeleton(){const bones=BONEDEF.map(b=>{const bn=new THREE.Bone();bn.name=b[0];bn.position.set(b[2],b[3],b[4]);return bn});BONEDEF.forEach((b,i)=>{if(b[1]>=0)bones[b[1]].add(bones[i])});return bones}
/* ---- animation clips authored as functions of phase ---- */
const bump=(x,c,w)=>{const d=wrapA(x-c);return Math.exp(-d*d/(2*w*w))};
function clipFrom(name,dur,fps,fn){const n=Math.max(2,Math.round(dur*fps)+1),times=[],tr={};const q=new THREE.Quaternion(),e=new THREE.Euler();
  for(let i=0;i<n;i++){const t=i/(n-1)*dur;times.push(t);const pose=fn(t,t/dur);for(const k in pose){(tr[k]=tr[k]||[]);if(k==='_hips')tr[k].push(pose[k][0],0.98+pose[k][1],pose[k][2]);else{e.set(pose[k][0],pose[k][1],pose[k][2],'XYZ');q.setFromEuler(e);tr[k].push(q.x,q.y,q.z,q.w)}}}
  const tracks=[];for(const k in tr){if(k==='_hips')tracks.push(new THREE.VectorKeyframeTrack('hips.position',times,tr[k]));else tracks.push(new THREE.QuaternionKeyframeTrack(k+'.quaternion',times,tr[k]))}return new THREE.AnimationClip(name,dur,tracks)}
function gaitPose(ph,A){// A: amplitudes for walk / jog / sprint
  const L=ph,Rr=ph+Math.PI;const leg=(p)=>{const th=-(A.tb+A.ta*Math.sin(p));const kn=A.k0+A.kp*bump(p,A.kc,A.kw)+A.ks*bump(p,A.sc,0.42);const ft=-(th+kn)*A.fc+A.tp*bump(p,-1.5,0.33)-0.08*bump(p,1.0,0.5);return[th,kn,ft]};
  const l=leg(L),r=leg(Rr);const s=Math.sin(ph);
  return{_hips:[-A.sway*Math.cos(ph),A.bob*Math.cos(2*ph)-A.drop,0],hips:[A.lean*0.3,-A.hy*s,-A.hr*Math.cos(ph)],spine:[A.lean*0.5,A.sy*s,0],chest:[A.lean*0.5+0.02,A.cy*s,A.hr*0.5*Math.cos(ph)],neck:[-A.lean*0.4,-(A.sy+A.cy)*0.3*s,0],head:[-A.lean*0.3,-(A.sy+A.cy)*0.3*s,0],
    thighL:[l[0],0,0.02],shinL:[l[1],0,0],footL:[l[2],0,0],thighR:[r[0],0,-0.02],shinR:[r[1],0,0],footR:[r[2],0,0],
    shoulderL:[0,0,0.03*s],shoulderR:[0,0,0.03*s],upperArmL:[-A.ab+A.as*s,0,A.az],upperArmR:[-A.ab-A.as*s,0,-A.az],
    foreArmL:[-(A.e0+A.e1*Math.max(0,-s)),0,0],foreArmR:[-(A.e0+A.e1*Math.max(0,s)),0,0],handL:[0.1,0,0],handR:[0.1,0,0]}}
const GAIT={walk:{tb:0.1,ta:0.36,k0:0.05,kp:1.0,kc:-0.6,kw:0.6,ks:0.2,sc:2.2,fc:1,tp:0.35,sway:0.024,bob:0.022,drop:0.012,lean:0.06,hy:0.1,hr:0.04,sy:0.06,cy:0.05,ab:0.03,as:0.3,az:0.09,e0:0.22,e1:0.2},
  jog:{tb:0.22,ta:0.6,k0:0.22,kp:1.5,kc:-0.75,kw:0.7,ks:0.35,sc:2.1,fc:0.9,tp:0.5,sway:0.012,bob:0.045,drop:0.05,lean:0.16,hy:0.16,hr:0.05,sy:0.11,cy:0.06,ab:0.12,as:0.55,az:0.14,e0:1.3,e1:0.15},
  sprint:{tb:0.3,ta:0.74,k0:0.3,kp:1.85,kc:-0.8,kw:0.7,ks:0.4,sc:2.0,fc:0.85,tp:0.6,sway:0.01,bob:0.055,drop:0.07,lean:0.27,hy:0.2,hr:0.05,sy:0.14,cy:0.07,ab:0.2,as:0.78,az:0.15,e0:1.45,e1:0.2}};
const NEUTRAL=()=>({_hips:[0,0,0],hips:[0,0,0],spine:[0,0,0],chest:[0,0,0],neck:[0,0,0],head:[0,0,0],thighL:[0,0,0.02],shinL:[0,0,0],footL:[0,0,0],thighR:[0,0,-0.02],shinR:[0,0,0],footR:[0,0,0],shoulderL:[0,0,0],shoulderR:[0,0,0],upperArmL:[0,0,0.08],upperArmR:[0,0,-0.08],foreArmL:[-0.12,0,0],foreArmR:[-0.12,0,0],handL:[0,0,0],handR:[0,0,0]});
const POSES={idle:(u)=>{const p=NEUTRAL(),s=Math.sin(u*TAU),s2=Math.sin(u*TAU*0.5);p._hips=[0.012*s2,-0.004+0.003*s,0];p.chest=[0.025*s,0,0];p.spine=[0.012*s,0,0];p.head=[0.02*s,0.14*Math.sin(u*TAU*0.5+1),0];p.thighL=[-0.02,0,0.04];p.thighR=[0.02,0,-0.04];p.shinL=[0.05,0,0];p.shinR=[0.03,0,0];p.footL=[-0.03,0,0];p.footR=[-0.05,0,0];p.upperArmL=[0.02+0.015*s,0,0.09];p.upperArmR=[0.02+0.015*s,0,-0.09];p.foreArmL=[-0.16,0,0];p.foreArmR=[-0.16,0,0];return p},talk:(u)=>{const p=NEUTRAL(),s=Math.sin(u*TAU);p.upperArmR=[-0.35-0.2*Math.max(0,Math.sin(u*TAU*2)),0,-0.25];p.foreArmR=[-1.0-0.3*Math.sin(u*TAU*2),0.3,0];p.upperArmL=[0.05,0,0.12];p.foreArmL=[-0.3,0,0];p.head=[0.03*s,0.2*Math.sin(u*TAU),0];p.chest=[0.02,0.06*s,0];return p},air:(u)=>{const p=NEUTRAL();p.thighL=[-0.7,0,0.05];p.shinL=[1.0,0,0];p.thighR=[-0.2,0,-0.05];p.shinR=[0.6,0,0];p.upperArmL=[-0.5,0,0.55];p.upperArmR=[-0.5,0,-0.55];p.foreArmL=[-0.6,0,0];p.foreArmR=[-0.6,0,0];p.spine=[0.1,0,0];return p},punch:(u)=>{const p=NEUTRAL();const w=u<0.25?u/0.25:u<0.45?1:1-(u-0.45)/0.55;const strike=u<0.25?0:u<0.45?(u-0.25)/0.2:1-(u-0.45)/0.55;p.thighL=[-0.35,0,0.08];p.shinL=[0.3,0,0];p.thighR=[0.25,0,-0.08];p.shinR=[0.2,0,0];
    p.upperArmL=[-0.9,0,0.3];p.foreArmL=[-1.7,0,0];p.chest=[0.05,-0.35*w+0.75*strike,0];p.upperArmR=[-0.6*w-1.0*strike,0,-0.15+0.1*strike];p.foreArmR=[-1.6*(1-strike)-0.1,0,0];p._hips=[0,-0.04,0];return p},sit:(u)=>{const p=NEUTRAL();p._hips=[0,-0.45,-0.05];p.thighL=[-1.5,0,0.06];p.thighR=[-1.5,0,-0.06];p.shinL=[1.45,0,0];p.shinR=[1.45,0,0];p.footL=[0.02,0,0];p.footR=[0.02,0,0];p.spine=[0.04+0.01*Math.sin(u*TAU),0,0];p.upperArmL=[-0.3,0,0.1];p.upperArmR=[-0.3,0,-0.1];p.foreArmL=[-0.9,0,0];p.foreArmR=[-0.9,0,0];return p},drive:(u)=>{const p=NEUTRAL();p._hips=[0,-0.48,-0.05];p.thighL=[-1.45,0,0.06];p.thighR=[-1.45,0,-0.06];p.shinL=[1.25,0,0];p.shinR=[1.25,0,0];p.upperArmL=[-1.0,0,0.25];p.upperArmR=[-1.0,0,-0.25];p.foreArmL=[-0.6,0,0];p.foreArmR=[-0.6,0,0];return p},lie:(u)=>{const p=NEUTRAL();p.upperArmL=[-0.2,0,0.9];p.upperArmR=[-0.1,0,-0.8];p.foreArmL=[-0.4,0,0];p.thighL=[-0.1,0,0.15];p.thighR=[0.05,0,-0.12];p.shinR=[0.3,0,0];p.head=[0,0.4,0];return p},shoot:(u)=>{const p=NEUTRAL();const down=u<0.35?u/0.35:1-(u-0.35)/0.3;const up=u<0.35?0:Math.min(1,(u-0.35)/0.25);const kd=clamp(down,0,1);p._hips=[0,-0.12*kd+0.06*up*(u<0.75?1:0),0];p.thighL=[-0.45*kd,0,0.05];p.thighR=[-0.45*kd,0,-0.05];p.shinL=[0.9*kd,0,0];p.shinR=[0.9*kd,0,0];p.footL=[-0.45*kd,0,0];p.footR=[-0.45*kd,0,0];
    p.upperArmL=[-1.2-1.3*up,0,0.2];p.upperArmR=[-1.2-1.4*up,0,-0.15];p.foreArmL=[-1.2+0.9*up,0,0];p.foreArmR=[-1.4+1.2*up,0,0];p.handR=[0.6*up,0,0];return p},climb:(u)=>{const p=NEUTRAL();const a=u<0.4?u/0.4:1;const b=u<0.4?0:(u-0.4)/0.6;p.upperArmL=[-2.6+1.8*b,0,0.25];p.upperArmR=[-2.6+1.8*b,0,-0.25];p.foreArmL=[-0.4,0,0];p.foreArmR=[-0.4,0,0];p.thighL=[-1.3*a+0.8*b,0,0.1];p.thighR=[-0.6*a-0.6*b,0,-0.1];p.shinL=[1.6*a-1.0*b,0,0];p.shinR=[1.2*a,0,0];p.spine=[0.4*a-0.3*b,0,0];return p},wave:(u)=>{const p=NEUTRAL();p.upperArmR=[-0.3,0,-2.5];p.foreArmR=[0,0,-0.4-0.4*Math.sin(u*TAU*3)];p.head=[0,-0.2,0];return p},eat:(u)=>{const p=NEUTRAL();const b=0.5+0.5*Math.sin(u*TAU*2);p.upperArmR=[-0.4-0.3*b,0,-0.2];p.foreArmR=[-1.6-0.5*b,0,0];p.upperArmL=[-0.3,0,0.15];p.foreArmL=[-1.2,0,0];p.head=[0.1*b,0,0];return p}};
const PDUR={idle:4,talk:3,air:1,punch:0.55,sit:2,drive:2,lie:2,shoot:0.9,climb:1.1,wave:1.6,eat:2.4},PFPS={idle:15,talk:15,air:10,punch:30,sit:10,drive:10,lie:5,shoot:30,climb:30,wave:24,eat:15};
let CLIPS={};
function makeClips(){const c={};
  c.walk=clipFrom('walk',1.1,30,(t,u)=>gaitPose(u*TAU,GAIT.walk));c.jog=clipFrom('jog',0.72,30,(t,u)=>gaitPose(u*TAU,GAIT.jog));c.sprint=clipFrom('sprint',0.6,30,(t,u)=>gaitPose(u*TAU,GAIT.sprint));
  for(const k in POSES)c[k]=clipFrom(k,PDUR[k],PFPS[k],(t,u)=>POSES[k](u));
  CLIPS=c}
let charMat;
class Human{constructor(look){this.look=look;const g=buildHumanGeo(look);const bones=makeSkeleton();this.mesh=new THREE.SkinnedMesh(g,charMat);this.mesh.add(bones[0]);this.mesh.bind(new THREE.Skeleton(bones));this.mesh.castShadow=true;this.mesh.frustumCulled=false;
  this.root=new THREE.Group();this.root.add(this.mesh);this.mesh.scale.setScalar(look.height||1);scene.add(this.root);this.mixer=new THREE.AnimationMixer(this.mesh);this.act={};
  for(const k of['idle','walk','jog','sprint','air','punch','sit','drive','lie','shoot','climb','wave','talk','eat']){const a=this.mixer.clipAction(CLIPS[k]);a.play();a.setEffectiveWeight(0);a.enabled=false;this.act[k]=a}
  for(const k of['punch','shoot','climb'])this.act[k].setLoop(THREE.LoopOnce,1),this.act[k].clampWhenFinished=true;
  this.phase=0;this.override=null;this.ow=0;this.speed=0;this.state='walk'}
  play(name,once){this.override=name;const a=this.act[name];a.enabled=true;if(once){a.reset();a.play()}this.otime=0}
  stop(){this.override=null}
  update(dt,speed,air){this.speed=speed;const v=Math.max(0,speed);
    // locomotion blend weights
    let wi=0,ww=0,wj=0,ws=0;if(v<0.12)wi=1;else if(v<1.6){const t=(v-0.12)/1.48;wi=1-sstep(Math.min(1,t*1.6));ww=1-wi}else if(v<3.0){const t=(v-1.6)/1.4;ww=1-t;wj=t}else if(v<4.8)wj=1;else if(v<6.2){const t=(v-4.8)/1.4;wj=1-t;ws=t}else ws=1;
    const cyc=ww*(v/1.6)/1.1+wj*(v/3.7)/0.72+ws*(v/6.6)/0.6;this.phase=(this.phase+dt*Math.max(cyc,0))%1;
    const tw=this.override?1:0;this.ow+=(tw-this.ow)*Math.min(1,dt*(this.override?12:6));const lw=1-this.ow;
    const set=(k,w)=>{const a=this.act[k];if(w>0.002){a.enabled=true;a.setEffectiveWeight(w)}else{a.setEffectiveWeight(0);a.enabled=false}};
    const airW=air?1:0;set('idle',wi*lw*(1-airW));set('walk',ww*lw*(1-airW));set('jog',wj*lw*(1-airW));set('sprint',ws*lw*(1-airW));set('air',lw*airW);
    for(const k of['walk','jog','sprint'])this.act[k].time=this.phase*this.act[k].getClip().duration;
    for(const k of['punch','sit','drive','lie','shoot','climb','wave','talk','eat'])set(k,this.override===k?this.ow:0);
    for(const k of['walk','jog','sprint'])this.act[k].timeScale=0;this.mixer.update(dt);
    const lt=this.override==='lie'?1:0;this.lieW=(this.lieW||0)+(lt-(this.lieW||0))*Math.min(1,dt*7);this.mesh.rotation.x=-Math.PI/2*this.lieW;this.mesh.position.y=0.14*this.lieW}
  dispose(){scene.remove(this.root);this.mesh.geometry.dispose()}}
const SKINS=['#f1c9a5','#e8b791','#d9a47c','#c08a62','#a06e4b','#7a5236','#f5d8bf'],HAIRS=['#1b1410','#2c1d14','#4a3020','#6b4a2c','#a57c4a','#d6bd8a','#8a8a88','#c9c7c2'];
const SHIRTS=['#f4f4f2','#1d1d1f','#2b3f63','#7a2e2e','#3f6b4f','#c9b48a','#e8d8c0','#6c8fb3','#d46a5a','#ffffff','#9a9a96','#334','#b38bb5','#e3c15b','#5b7c8d','#a3443a'],PANTS=['#2b3445','#1d1d1f','#3c4a5e','#c9bc9c','#5b5f63','#e8e2d4','#384a3a','#6b5a48'];
function randomLook(i){const fem=rnd()<0.5;const old=rnd()<0.2;return{fem,skin:pick(SKINS),hair:old?pick(['#8a8a88','#c9c7c2','#6b6b68']):pick(HAIRS),hairStyle:fem?pick(['long','long','bun','pony','short']):pick(['short','short','buzz','curly','bald']),
  shirt:pick(SHIRTS),pants:pick(PANTS),shoes:pick(['#1d1d1f','#f2f2f2','#6b4a2e','#3a3a3a']),sleeves:pick(['short','short','long','none']),shorts:!fem&&rnd()<0.2,dress:fem&&rnd()<0.3,glasses:rnd()<0.18,cap:!fem&&rnd()<0.12,beard:!fem&&rnd()<0.45,capColor:pick(SHIRTS),face:Math.floor(rnd()*6),height:fem?R(0.92,1.0):R(0.97,1.06),build:R(0.9,1.12),bag:rnd()<0.3?pick(['L','R']):null,bagColor:pick(['#c9a227','#ffffff','#7a2e2e','#1d1d1f','#d9b38c'])}}


/* ============================== REALISTIC PEOPLE (rigged models + mocap clips) ============================== */
const REAL={};const MIX={hips:'Hips',spine:'Spine',chest:'Spine2',neck:'Neck',head:'Head',shoulderL:'LeftShoulder',upperArmL:'LeftArm',foreArmL:'LeftForeArm',handL:'LeftHand',shoulderR:'RightShoulder',upperArmR:'RightArm',foreArmR:'RightForeArm',handR:'RightHand',thighL:'LeftUpLeg',shinL:'LeftLeg',footL:'LeftFoot',thighR:'RightUpLeg',shinR:'RightLeg',footR:'RightFoot'};
const MIXORDER=['hips','spine','chest','neck','head','shoulderL','upperArmL','foreArmL','handL','shoulderR','upperArmR','foreArmR','handR','thighL','shinL','footL','thighR','shinR','footR'];
let NEUT=null;
function findHips(root){let h=null;root.traverse(o=>{if(!h&&/Hips$/.test(o.name))h=o});return h}
function retarget(clip,srcH,tgtH,mapName){srcH.parent.updateMatrixWorld(true);tgtH.parent.updateMatrixWorld(true);
  const Ps=new THREE.Quaternion(),Pt=new THREE.Quaternion();srcH.parent.getWorldQuaternion(Ps);tgtH.parent.getWorldQuaternion(Pt);const conv=Pt.clone().invert().multiply(Ps);
  const PsM=srcH.parent.matrixWorld.clone(),PtMi=tgtH.parent.matrixWorld.clone().invert();const sRest=srcH.position.clone().applyMatrix4(PsM),tRest=tgtH.position.clone().applyMatrix4(tgtH.parent.matrixWorld);const k=tRest.y/sRest.y;
  const tracks=[];for(const t of clip.tracks){const dot=t.name.lastIndexOf('.');const node=t.name.slice(0,dot),prop=t.name.slice(dot+1);const tn=mapName(node);if(!tn)continue;
    if(prop==='quaternion'){const v=t.values.slice();if(node===srcH.name){const q=new THREE.Quaternion();for(let i=0;i<v.length;i+=4){q.fromArray(v,i);q.premultiply(conv);q.toArray(v,i)}}tracks.push(new THREE.QuaternionKeyframeTrack(tn+'.quaternion',t.times,v))}
    else if(prop==='position'&&node===srcH.name){const v=t.values.slice();const p=new THREE.Vector3();for(let i=0;i<v.length;i+=3){p.fromArray(v,i).applyMatrix4(PsM);p.set(tRest.x,tRest.y+(p.y-sRest.y)*k,tRest.z);p.applyMatrix4(PtMi);p.toArray(v,i)}tracks.push(new THREE.VectorKeyframeTrack(tn+'.position',t.times,v))}}
  return new THREE.AnimationClip(clip.name,clip.duration,tracks)}
/* world-space retarget: each bone keeps the source motion relative to its own rest pose */
function retargetWorld(clip,src,tgt,mapName){const Q=THREE.Quaternion,V=THREE.Vector3;const sB={},tB={};src.traverse(o=>{if(/Hips|Spine|Neck|Head|Shoulder|Arm|Hand|Leg|Foot|Toe/.test(o.name))sB[o.name]=o});tgt.traverse(o=>{if(o.isBone)tB[o.name]=o});
  const pairs=[];for(const n in sB){const tn=mapName(n);if(tB[tn])pairs.push([sB[n],tB[tn]])}const depth=o=>{let d=0;while(o.parent){d++;o=o.parent}return d};pairs.sort((a,b)=>depth(a[1])-depth(b[1]));
  src.updateMatrixWorld(true);tgt.updateMatrixWorld(true);const rS=new Map(),rT=new Map();for(const [s,t] of pairs){rS.set(s,s.getWorldQuaternion(new Q()));rT.set(t,t.getWorldQuaternion(new Q()))}
  const hp=pairs.find(p=>/Hips$/.test(p[0].name));if(!hp)return null;const [hS,hT]=hp;const hS0=hS.getWorldPosition(new V()),hT0=hT.getWorldPosition(new V());const k=hT0.y/hS0.y;
  const mixer=new THREE.AnimationMixer(src);const act=mixer.clipAction(clip);act.play();const ht=clip.tracks.find(t=>/Hips\.quaternion$/.test(t.name));const times=ht?Array.from(ht.times):[0,clip.duration];
  // facing correction: keep the target facing +Z even if the source clip faces elsewhere
  mixer.setTime(clip.duration*0.5);src.updateMatrixWorld(true);const rel=hS.getWorldQuaternion(new Q()).multiply(rS.get(hS).clone().invert());const fwd=new V(0,0,1).applyQuaternion(rel);const yaw=Math.atan2(fwd.x,fwd.z);
  const C=new Q().setFromAxisAngle(new V(0,1,0),Math.abs(yaw)>1.6?-yaw:0);
  const out=new Map(pairs.map(p=>[p[1],[]])),pos=[];
  for(const t of times){mixer.setTime(t);src.updateMatrixWorld(true);const W=new Map();
    for(const [s,tb] of pairs){const w=s.getWorldQuaternion(new Q()).multiply(rS.get(s).clone().invert()).premultiply(C).multiply(rT.get(tb));W.set(tb,w)}
    for(const [s,tb] of pairs){const pw=W.has(tb.parent)?W.get(tb.parent):tb.parent.getWorldQuaternion(new Q());const l=pw.clone().invert().multiply(W.get(tb));out.get(tb).push(l.x,l.y,l.z,l.w)}
    const p=hS.getWorldPosition(new V());const wp=new V(hT0.x,hT0.y+(p.y-hS0.y)*k,hT0.z);const lp=hT.parent.worldToLocal(wp);pos.push(lp.x,lp.y,lp.z)}
  act.stop();mixer.uncacheRoot(src);const tracks=[];for(const [tb,arr] of out)tracks.push(new THREE.QuaternionKeyframeTrack(tb.name+'.quaternion',times,arr));tracks.push(new THREE.VectorKeyframeTrack(hT.name+'.position',times,pos));
  return new THREE.AnimationClip(clip.name,clip.duration,tracks)}
async function loadReal(){const L=new THREE.GLTFLoader();const ld=u=>new Promise((res,rej)=>L.load(u,res,undefined,rej));
  const [m,f,a]=await Promise.all([ld('models/rpm.json'),ld('models/michelle.json'),ld('models/anims.json')]);
  const prep=(g,H)=>{const sc=g.scene;sc.updateMatrixWorld(true);let minY=Infinity,maxY=-Infinity;const v=new THREE.Vector3();
    sc.traverse(o=>{if(o.isBone){o.getWorldPosition(v);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y)}if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;const mt=o.material;if(mt){mt.metalness=0;mt.roughness=0.8;mt.envMapIntensity=0}}});
    const h=(maxY-minY)*1.04;sc.userData.scale=H/Math.max(0.3,h);sc.userData.minY=minY-0.03*h;return sc};
  const RR={male:{scene:prep(m,1.78)},female:{scene:prep(f,1.66)}};
  const get=n=>a.animations.find(c=>c.name.toLowerCase()===n);
  for(const k of['male','female']){const map=k==='male'?(n=>n.replace(/^mixamorig:?/,'')):(n=>n);RR[k].clips={idle:retargetWorld(get('idle'),a.scene,RR[k].scene,map),walk:retargetWorld(get('walk'),a.scene,RR[k].scene,map),run:retargetWorld(get('run'),a.scene,RR[k].scene,map)}}
  NEUT=NEUTRAL();Object.assign(REAL,RR)}
const _qa=new THREE.Quaternion(),_qb=new THREE.Quaternion(),_qc=new THREE.Quaternion(),_qd=new THREE.Quaternion(),_eu=new THREE.Euler(),_v3=new THREE.Vector3(),_m3=new THREE.Matrix3();
const mixHex=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
class RealHuman{constructor(kind,look){const R_=REAL[kind];this.kind=kind;this.model=THREE.SkeletonUtils.clone(R_.scene);const sc=R_.scene.userData.scale*(look.height||1);this.model.scale.setScalar(sc);this.model.position.y=-R_.scene.userData.minY*sc;
    this.root=new THREE.Group();this.inner=new THREE.Group();this.inner.add(this.model);this.root.add(this.inner);
    this.model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.frustumCulled=false;const n=(o.material&&o.material.name)||'';
      if(kind==='male'){if(/Headwear/.test(n))o.visible=!!look.cap;else if(/Beard/.test(n))o.visible=!!look.beard;else if(/Outfit_Top/.test(n)){o.material=o.material.clone();o.material.color=mixHex('#ffffff',look.shirt,0.8)}
        else if(/Outfit_Bottom/.test(n)){o.material=o.material.clone();o.material.color=mixHex('#ffffff',look.pants,0.75)}else if(/Footwear/.test(n)){o.material=o.material.clone();o.material.color=mixHex('#ffffff',look.shoes||'#222',0.6)}
        else if(/Skin|Body/.test(n)){o.material=o.material.clone();o.material.color=mixHex('#ffffff',look.skin,0.45).multiplyScalar(1.12)}}
      else{o.material=o.material.clone();o.material.color=mixHex('#ffffff',look.shirt,0.22)}});
    if(kind==='male'&&!look.cap&&look.hairStyle!=='bald'){let head=null;this.model.traverse(o=>{if(o.isBone&&/Head$/.test(o.name)&&!head)head=o});
      if(head){const hm=new THREE.MeshLambertMaterial({color:new THREE.Color(look.hair||'#2c1d14')});const geo=new THREE.SphereGeometry(1,18,12,0,TAU,0,Math.PI*0.58);const hair=new THREE.Mesh(geo,hm);
        this.model.updateMatrixWorld(true);const ws=new THREE.Vector3();head.getWorldScale(ws);const k=1/ws.x;hair.scale.set(0.102*k,0.11*k*(look.hairStyle==='curly'?1.15:1),0.112*k);hair.position.set(0,0.112*k,-0.008*k);hair.rotation.x=-0.28;hair.castShadow=true;head.add(hair);this.hair=hair}}
    this.mixer=new THREE.AnimationMixer(this.model);this.act={};for(const k in R_.clips){const a=this.mixer.clipAction(R_.clips[k]);a.play();a.setEffectiveWeight(0);this.act[k]=a}
    this.bones={};this.model.traverse(o=>{if(o.isBone)this.bones[o.name.replace(/^mixamorig:?/,'')]=o});this.phase=Math.random();this.override=null;this.ow=0;this.otime=0;this.lieW=0}
  play(name,once){this.override=name;this.once=!!once;this.otime=0}
  stop(){this.override=null}
  update(dt,speed,air){const v=Math.max(0,speed);let wi=0,ww=0,wr=0;if(v<0.15)wi=1;else if(v<1.7){const t=(v-0.15)/1.55;wi=1-sstep(t);ww=1-wi}else if(v<3.3){const t=(v-1.7)/1.6;ww=1-t;wr=t}else wr=1;
    if(air){wi=0;ww=0;wr=1}
    const wd=this.act.walk.getClip().duration,rd=this.act.run.getClip().duration;this.phase=(this.phase+dt*(ww*(v/1.45)/wd+wr*(Math.max(v,3.3)/4.6)/rd))%1;
    this.ow+=((this.override?1:0)-this.ow)*Math.min(1,dt*(this.override?12:6));const lw=1-this.ow;
    const set=(k,w)=>{const a=this.act[k];if(w>0.002){a.enabled=true;a.setEffectiveWeight(w)}else{a.setEffectiveWeight(0);a.enabled=false}};
    set('idle',wi*lw+this.ow);set('walk',ww*lw);set('run',wr*lw);this.act.walk.time=this.phase*wd;this.act.run.time=this.phase*rd;this.act.walk.timeScale=0;this.act.run.timeScale=0;
    this.mixer.update(dt);
    const lt=this.override==='lie'?1:0;this.lieW+=(lt-this.lieW)*Math.min(1,dt*7);this.inner.rotation.x=-Math.PI/2*this.lieW;this.inner.position.y=0.15*this.lieW;
    if(air)this.applyPose(POSES.air(0),0.7);
    if(this.override&&this.ow>0.01&&POSES[this.override]){this.otime+=dt;const d=PDUR[this.override];const u=this.once?Math.min(1,this.otime/d):(this.otime/d)%1;this.applyPose(POSES[this.override](u),this.ow)}}
  /* layer a procedural pose on top of the mocap clip, rotating each joint in character space */
  applyPose(pose,w){this.root.updateMatrixWorld(true);const Wc=this.inner.getWorldQuaternion(_qa),Wci=_qb.copy(Wc).invert();
    for(const k of MIXORDER){const b=this.bones[MIX[k]];if(!b||!pose[k])continue;const n=NEUT[k]||[0,0,0];const dx=(pose[k][0]-n[0])*w,dy=(pose[k][1]-n[1])*w,dz=(pose[k][2]-n[2])*w;if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)<0.004)continue;
      _qc.setFromEuler(_eu.set(dx,dy,dz,'XYZ'));_qc.premultiply(Wc).multiply(Wci);b.parent.getWorldQuaternion(_qd);const pi=_qd.clone().invert();b.quaternion.premultiply(pi.multiply(_qc).multiply(_qd))}
    if(pose._hips){const b=this.bones.Hips;if(b){_v3.set(pose._hips[0]*w,pose._hips[1]*w,pose._hips[2]*w).applyQuaternion(Wc);b.parent.updateMatrixWorld(true);_m3.setFromMatrix4(b.parent.matrixWorld).invert();_v3.applyMatrix3(_m3);b.position.add(_v3)}}}}
/* a person: realistic model up close, light procedural body far away */
class Ped{constructor(look,force){this.look=look;/* look kept for talk names */this.low=new Human(look);scene.remove(this.low.root);this.root=new THREE.Group();this.root.add(this.low.root);scene.add(this.root);
    this.real=null;if(REAL.male){this.real=new RealHuman(look.fem?'female':'male',look);this.real.root.visible=false;this.root.add(this.real.root)}this.useReal=false;if(force)this.setReal(true)}
  setReal(on){if(!this.real)on=false;this.useReal=on;this.low.root.visible=!on;if(this.real)this.real.root.visible=on}
  update(dt,s,air){if(this.useReal)this.real.update(dt,s,air);else this.low.update(dt,s,air)}
  play(n,o){this.low.play(n,o);if(this.real)this.real.play(n,o)}
  stop(){this.low.stop();if(this.real)this.real.stop()}
  get override(){return this.low.override}
  dispose(){scene.remove(this.root)}}
function updateLOD(){if(!REAL.male)return;const cx=camera.position.x,cz=camera.position.z;const list=[];for(const p of NPCS){if(!p.h.root.visible){if(p.h.useReal)p.h.setReal(false);continue}list.push([Math.hypot(p.x-cx,p.z-cz),p])}
  list.sort((a,b)=>a[0]-b[0]);let n=0;for(const [d,p] of list){const want=n<Q.real&&d<60;if(want)n++;if(p.h.useReal!==want)p.h.setReal(want)}}

