'use strict';
/* Grand Kifisia — cars (instanced), car physics helpers, train */
/* ============================== VEHICLES ============================== */
const CARTYPES={hatch:{L:3.95,W:1.72,H:1.48,cab:[-1.35,0.75],hood:0.62},sedan:{L:4.6,W:1.78,H:1.46,cab:[-1.2,0.55],hood:0.62},suv:{L:4.45,W:1.84,H:1.66,cab:[-1.45,0.85],hood:0.8},taxi:{L:4.6,W:1.78,H:1.46,cab:[-1.2,0.55],hood:0.62,taxi:1},van:{L:4.9,W:1.95,H:2.05,cab:[-2.2,1.35],hood:0.9}};
function carGeo(t){const g=new GB();const T_=CARTYPES[t];const L=T_.L,W=T_.W,H=T_.H,hw=W/2;const paint=C1,glass=hexc('#1b232b'),dark=hexc('#141414'),chrome=hexc('#b9bec4'),light=hexc('#fff6d8'),red=hexc('#b3121b');const rc=RECT[T.white];
  const y0=0.32,yb=y0+0.62;// body side profile: lower body box with chamfers + cabin
  const side=(sx)=>sx*hw;
  // lower body
  g.box(0,(y0+yb)/2,0,W,yb-y0,L,0,paint,rc);
  g.box(0,yb+0.01,L/2-T_.hood/2-0.05,W*0.98,0.04,T_.hood,0,paint,rc);
  // cabin (trapezoid)
  const c0=T_.cab[0],c1=T_.cab[1],ct=H,inset=0.13;const rz0=c0+0.3,rz1=c1-0.42;
  const P=(x,y,z)=>[x,y,z];const A=P(-hw+0.04,yb,c0),B=P(hw-0.04,yb,c0),C=P(hw-0.04,yb,c1),D=P(-hw+0.04,yb,c1),E=P(-hw+inset,ct,rz0),F=P(hw-inset,ct,rz0),G=P(hw-inset,ct,rz1),Hh=P(-hw+inset,ct,rz1);
  g.quad(D,C,G,Hh,[0,0],[1,0],[1,1],[0,1],glass,rc,0);// windshield
  g.quad(B,A,E,F,[0,0],[1,0],[1,1],[0,1],glass,rc,0);// rear window
  g.quad(A,D,Hh,E,[0,0],[1,0],[1,1],[0,1],glass,rc,0);g.quad(C,B,F,G,[0,0],[1,0],[1,1],[0,1],glass,rc,0);// sides
  g.quad(E,Hh,G,F,[0,0],[1,0],[1,1],[0,1],paint,rc,0);// roof
  // pillars (paint strips) on sides
  for(const sx of[-1,1]){const x=sx*(hw-0.03);g.box(x,(yb+ct)/2,(c0+c1)/2-0.15,0.03,ct-yb,0.08,0,paint,rc)}
  // bumpers, lights, plates
  g.box(0,y0+0.12,L/2+0.02,W*0.96,0.22,0.12,0,dark,rc);g.box(0,y0+0.12,-L/2-0.02,W*0.96,0.22,0.12,0,dark,rc);
  for(const sx of[-1,1]){g.box(sx*(hw-0.25),yb-0.1,L/2+0.005,0.34,0.13,0.04,0,light,rc,1);g.box(sx*(hw-0.22),yb-0.12,-L/2-0.005,0.3,0.14,0.04,0,red,rc,1);g.box(sx*(hw+0.06),yb+0.12,c1-0.05,0.1,0.08,0.16,0,paint,rc)}
  g.box(0,y0+0.3,L/2+0.03,0.52,0.12,0.02,0,hexc('#f2f2f2'),rc);g.box(0,y0+0.3,-L/2-0.03,0.52,0.12,0.02,0,hexc('#f2f2f2'),rc);
  // wheels
  const wb=L/2-0.78;for(const sz of[-1,1])for(const sx of[-1,1]){g.cyl(sx*(hw-0.12),0.33,sz*wb,0.33,0.33,0.0001,10,dark,rc,false);
    const cx=sx*(hw-0.02),cz=sz*wb;for(let i=0;i<12;i++){const a0=i/12*TAU,a1=(i+1)/12*TAU;const r=0.33;g.quad([cx,0.33+Math.sin(a0)*r,cz+Math.cos(a0)*r],[cx,0.33+Math.sin(a1)*r,cz+Math.cos(a1)*r],[cx-sx*0.22,0.33+Math.sin(a1)*r,cz+Math.cos(a1)*r],[cx-sx*0.22,0.33+Math.sin(a0)*r,cz+Math.cos(a0)*r],[0,0],[1,0],[1,1],[0,1],dark,rc,0);
      g.tri([cx+sx*0.005,0.33,cz],[cx+sx*0.005,0.33+Math.sin(sx>0?a0:a1)*0.2,cz+Math.cos(sx>0?a0:a1)*0.2],[cx+sx*0.005,0.33+Math.sin(sx>0?a1:a0)*0.2,cz+Math.cos(sx>0?a1:a0)*0.2],[0,0],[1,0],[0,1],chrome,rc,0)}}
  if(T_.taxi){g.box(0,ct+0.09,(rz0+rz1)/2,0.62,0.18,0.24,0,hexc('#fbfbf5'),rc,1)}
  return g.build()}
let carMat,carMeshes={},CARS=[];const CARCAP={hatch:150,sedan:110,suv:90,taxi:60,van:30};
function initCars(){for(const t in CARTYPES){const im=new THREE.InstancedMesh(carGeo(t),carMat,CARCAP[t]);im.count=0;im.castShadow=true;im.receiveShadow=false;im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(im);carMeshes[t]={im,n:0}}}
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_sc=new THREE.Vector3(1,1,1);
function addCar(type,x,z,yaw,color,mode){const cm=carMeshes[type];if(cm.n>=CARCAP[type])return null;const idx=cm.n++;cm.im.count=cm.n;const c={type,idx,x,z,yaw,y:0,pitch:0,roll:0,vf:0,vr:0,steer:0,mode:mode||'parked',color:new THREE.Color(color),hp:100};cm.im.setColorAt(idx,c.color);CARS.push(c);syncCar(c);return c}
function syncCar(c){const tgt=terr(c.x,c.z);c.y=tgt;_e.set(c.pitch,c.yaw,c.roll,'YXZ');_q.setFromEuler(_e);_v.set(c.x,c.y,c.z);_m4.compose(_v,_q,_sc);const cm=carMeshes[c.type];cm.im.setMatrixAt(c.idx,_m4);cm.dirty=true}
function flushCars(){for(const t in carMeshes){const cm=carMeshes[t];if(cm.dirty){cm.im.instanceMatrix.needsUpdate=true;cm.dirty=false}if(cm.cdirty){cm.im.instanceColor.needsUpdate=true;cm.cdirty=false}}}
function carPush(c,p,r){const dx=p.x-c.x,dz=p.z-c.z,co=Math.cos(c.yaw),si=Math.sin(c.yaw);let lx=dx*co-dz*si,lz=dx*si+dz*co;const T_=CARTYPES[c.type];const hx=T_.W/2+r,hz=T_.L/2+r;
  if(Math.abs(lx)<hx&&Math.abs(lz)<hz){if(hx-Math.abs(lx)<hz-Math.abs(lz))lx=Math.sign(lx||1)*hx;else lz=Math.sign(lz||1)*hz;p.x=c.x+co*lx+si*lz;p.z=c.z-si*lx+co*lz;return true}return false}

/* ============================== TRAIN ============================== */
const TRAIN={cars:[],s:-400,state:'away',t:0,doors:0};
function buildTrain(){const g=new GB();const L=17.2,W=2.85,H=3.5;const rc=k=>RECT[k];
  g.wall(-W/2,-L/2,-W/2,L/2,0.9,0.9,0.9+H,0.9+H,-1,0,0,4,0,1,C1,rc(T.train),1);g.wall(W/2,L/2,W/2,-L/2,0.9,0.9,0.9+H,0.9+H,1,0,0,4,0,1,C1,rc(T.train),1);
  g.wall(W/2,L/2,-W/2,L/2,0.9,0.9,0.9+H,0.9+H,0,1,0,1,0,1,C1,rc(T.trainF),1);g.wall(-W/2,-L/2,W/2,-L/2,0.9,0.9,0.9+H,0.9+H,0,-1,0,1,0,1,C1,rc(T.trainF),1);
  g.quad([-W/2,0.9+H,-L/2],[-W/2,0.9+H,L/2],[W/2,0.9+H,L/2],[W/2,0.9+H,-L/2],[0,0],[0,1],[1,1],[1,0],hexc('#c9ccd0'),rc(T.metalL),0);
  g.box(0,0.6,0,W*0.9,0.6,L*0.96,0,hexc('#2a2c2e'),rc(T.metal));for(const sz of[-1,1])g.box(0,0.45,sz*L*0.33,2.2,0.5,2.6,0,hexc('#1d1f22'),rc(T.metal));
  const geo=g.build();for(let k=0;k<5;k++){const m=new THREE.Mesh(geo,MAT.atlas);m.castShadow=true;scene.add(m);TRAIN.cars.push(m)}}
function placeTrain(){const tp=TRAINPATH;if(!tp)return;TRAIN.cars.forEach((m,k)=>{const sF=TRAIN.s+k*17.6+0.5,sB=TRAIN.s+k*17.6+16.7;const a=atLen(tp.ps,tp.cum,sF),b=atLen(tp.ps,tp.cum,sB);const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;m.position.set(x,terr(x,z)+0.02,z);m.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);m.visible=TRAIN.state!=='away'})}
function updateTrain(dt){const tp=TRAINPATH;if(!tp)return;TRAIN.t+=dt;const Lmax=tp.cum[tp.cum.length-1]-95;
  if(TRAIN.state==='away'){TRAIN.s=Lmax;if(TRAIN.t>(TRAIN.next||25)){TRAIN.state='arrive';TRAIN.t=0}}
  else if(TRAIN.state==='arrive'){const target=4;const d=TRAIN.s-target;const v=Math.max(1.2,Math.min(14,Math.sqrt(Math.max(0,d)*1.6)));TRAIN.s-=v*dt;if(TRAIN.s<=target){TRAIN.s=target;TRAIN.state='dwell';TRAIN.t=0;subtitle('Line 1 train to Piraeus now at the platform.',3)}}
  else if(TRAIN.state==='dwell'){if(TRAIN.t>(TRAIN.hold?9999:45)){TRAIN.state='depart';TRAIN.t=0;TRAIN.v=0}}
  else if(TRAIN.state==='depart'){TRAIN.v=Math.min(16,(TRAIN.v||0)+1.1*dt);TRAIN.s+=TRAIN.v*dt;if(TRAIN.s>Lmax){TRAIN.state='away';TRAIN.t=0;TRAIN.next=60+Math.random()*40}}
  placeTrain()}

