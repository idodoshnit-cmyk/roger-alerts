'use strict';
/* Grand Kifisia — traffic AI on the real road graph (team:cars).
   Right-hand lanes, one-way streets, smooth curved paths through junctions (quadratic Bézier from lane to lane), speed by road class and
   by curve, following distance, traffic lights (SIGNALS / signalState) and stop signs (MAP.props.stop), giving way to people crossing and
   to the player, indicators before turns, a city bus on Kifisias Avenue that stops at the real bus stops (MAP.props.bus), the odd
   double-parked car with hazards, density by time of day. Vehicles only appear / disappear out of sight (behind the camera or beyond the fog).
   API: placeTraffic(c,cx,cz,r0,r1), updateTraffic(dt,px,pz,t), initTraffic(), trafficLost(c), TRF (state/tuning). */
const TRF={pool:[],bus:null,t:0,want:20,spawnT:0,frust:new THREE.Frustum(),pm:new THREE.Matrix4(),sph:new THREE.Sphere(),stopNodes:null,sigNodes:null,init:false,dbl:[]};
const carOK=(r,end)=>{if(!(r.ty<=3||r.ty===5&&r.w>=5))return false;if(end===undefined||!r.ow)return true;return r.ow===1?end===0:end===1};
function laneOff(r){return r.ow?Math.min(1.2,r.w*0.12):Math.max(1.45,Math.min(2.2,r.w/4))}
function roadCruise(r){return[15,13.5,12,10,7,6.5][Math.min(5,r.ty)]||9}
/* is a world point visible (inside the frustum and nearer than the fog)? used so cars never pop in or out in view */
function trfVisible(x,z,r){const d=Math.hypot(x-camera.position.x,z-camera.position.z);const fog=typeof Q!=='undefined'&&Q?Q.dist*0.92:220;if(d>fog)return false;TRF.sph.center.set(x,terr(x,z)+1,z);TRF.sph.radius=r||4;return TRF.frust.intersectsSphere(TRF.sph)}
function trfNodes(){if(TRF.stopNodes)return;TRF.stopNodes=[];TRF.sigNodes=new Map();const st=(MAP.props&&MAP.props.stop)||[];
  ROADNODES.forEach((list,key)=>{const [x,z]=key.split(',').map(v=>+v/10);let sig=null;for(const g of SIGNALS){if(Math.hypot(g.x-x,g.z-z)<22){sig=g;break}}if(sig)TRF.sigNodes.set(key,sig);
    for(const s of st){if(Math.hypot(s[0]/10-x,s[1]/10-z)<14){TRF.stopNodes.push(key);break}}})}
function placeTraffic(c,cx,cz,r0,r1,hidden){const l=nearRoads(cx,cz,r0,r1,r=>carOK(r)&&r.L>18);if(!l.length)return false;
  for(let tries=0;tries<12;tries++){const ri=l[Math.floor(Math.random()*l.length)],r=ROADS[ri];const dir=r.ow===1?1:(Math.random()<0.5?1:-1);const s=5+Math.random()*Math.max(1,r.L-10);const q=roadPos(r,s,laneOff(r)*dir);
    if(!hidden&&trfVisible(q.x,q.z,5))continue;let ok=true;for(const o of CARS){if(o!==c&&!o.hidden&&(o.mode==='traffic'||o.mode==='bus'||o===player.car)&&Math.abs(o.x-q.x)<12&&Math.abs(o.z-q.z)<12){ok=false;break}}if(!ok)continue;
    c.ri=ri;c.dir=dir;c.s=s;c.path=null;c.next=null;c.x=q.x;c.z=q.z;c.yaw=Math.atan2(q.dx*dir,q.dz*dir);c.hidden=false;c.wait=0;c.occ=1;c.stopDone=null;c.ind=0;c.brk=false;c.cruise=roadCruise(r)*(0.85+Math.random()*0.25);c.vf=c.cruise*0.8;syncCar(c);return true}
  if(!hidden&&!c.ri&&c.ri!==0){c.hidden=true;c.x=0;c.z=-9999}return false}
/* choose where to go at the end of the current road */
function trfChooseNext(c){const r=ROADS[c.ri];const atEnd=c.dir>0;const key=atEnd?r.k1:r.k0;let l=(ROADNODES.get(key)||[]).filter(e=>e.ri!==c.ri&&carOK(ROADS[e.ri],e.end));
  if(c.route){const same=l.filter(e=>ROADS[e.ri].name===c.route);if(same.length)l=same}
  if(!l.length)return null;// prefer going roughly straight on bigger roads
  const h0=trfHeadAt(c.ri,c.dir,atEnd);let best=null,bw=-1;for(const e of l){const r2=ROADS[e.ri],d2=e.end===0?1:-1;const h1=trfHeadAt(e.ri,d2,false);const turn=wrapA(Math.atan2(h1[0],h1[1])-Math.atan2(h0[0],h0[1]));if(Math.abs(turn)>2.6)continue;
    const w=(1.2-Math.abs(turn)/2.6)*(r2.ty<=2?1.4:1)*(0.4+Math.random());if(w>bw){bw=w;best={ri:e.ri,dir:d2,turn,key}}}return best}
function trfHeadAt(ri,dir,atEnd){const r=ROADS[ri],ps=r.ps,n=ps.length;let a,b;if(dir>0){if(atEnd){a=ps[n-2];b=ps[n-1]}else{a=ps[0];b=ps[1]}}else{if(atEnd){a=ps[1];b=ps[0]}else{a=ps[n-1];b=ps[n-2]}}const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;return[dx/l,dz/l]}
/* lane point at arc length s (in the road's own parameter) */
function trfLane(ri,dir,s){const r=ROADS[ri];const q=roadPos(r,s,laneOff(r)*dir);return q}
/* junction curve from the current lane end to the next lane start (quadratic Bézier through the corner) */
function trfMakePath(c){const r=ROADS[c.ri],n=c.next,r2=ROADS[n.ri];const d0=Math.min(6,r.L*0.35),d1=Math.min(6,r2.L*0.35);const sA=c.dir>0?r.L-d0:d0;const A=trfLane(c.ri,c.dir,sA);
  const sB=n.dir>0?d1:r2.L-d1;const B=trfLane(n.ri,n.dir,sB);const ha=trfHeadAt(c.ri,c.dir,true),hb=trfHeadAt(n.ri,n.dir,false);
  // control point: intersection of the two lane lines (fallback: midpoint)
  const den=ha[0]*hb[1]-ha[1]*hb[0];let P=[(A.x+B.x)/2,(A.z+B.z)/2];if(Math.abs(den)>0.15){const t=((B.x-A.x)*hb[1]-(B.z-A.z)*hb[0])/den;if(t>0&&t<d0+d1+8)P=[A.x+ha[0]*t,A.z+ha[1]*t]}
  const pts=[];let len=0,px=A.x,pz=A.z;for(let i=0;i<=10;i++){const t=i/10,u=1-t;const x=u*u*A.x+2*u*t*P[0]+t*t*B.x,z=u*u*A.z+2*u*t*P[1]+t*t*B.z;if(i)len+=Math.hypot(x-px,z-pz);pts.push([x,z,len]);px=x;pz=z}
  c.path={pts,len,u:0,sB,turn:n.turn};c.ri=n.ri;c.dir=n.dir;c.s=sB;c.next=null}
function trfPathPos(p,u){const pts=p.pts;let i=1;while(i<pts.length-1&&pts[i][2]<u)i++;const a=pts[i-1],b=pts[i];const t=clamp((u-a[2])/((b[2]-a[2])||1),0,1);return[lerp(a[0],b[0],t),lerp(a[1],b[1],t),Math.atan2(b[0]-a[0],b[1]-a[1])]}
/* distance along my travel to the end of the current road */
function trfRemain(c){const r=ROADS[c.ri];return c.dir>0?r.L-c.s:c.s}
function initTraffic(){if(TRF.init)return;TRF.init=true;trfNodes();
  // a reserve of cars so hijacked / crashed ones are replaced at once (out of sight)
  const mix=['hatch','mini','scooterD','hatch','sedan','suv','taxi','scooter','hatch','mini','sedan','taxi','suv','exec','moto','suvL','van','hatch','taxi','scooterD','mini','sedan','suv','hatch','taxi','scooter','hatch','exec','mini','sedan','van','suv','hatch','taxi','mini','hatch','sedan','suvL','taxi','hatch','mini'];
  for(const c of CARS)if(c.mode==='traffic'&&TRF.pool.indexOf(c)<0){c.occ=1;TRF.pool.push(c)}
  const n=(typeof Q!=='undefined'&&Q?(Q.sh===0?18:Q.pr>1.2?34:26):26)-TRF.pool.length;for(let i=0;i<n;i++){const c=addCar(mix[i%mix.length],0,-9999,0,null,'traffic');if(!c)continue;c.hidden=true;c.occ=1;TRF.pool.push(c)}
  // the city bus on Kifisias Avenue
  const bus=addCar('bus',0,-9999,0,null,'bus');if(bus){bus.route='Λεωφόρος Κηφισίας';bus.hidden=true;bus.occ=1;TRF.bus=bus;TRF.pool.push(bus)}
  // one or two double-parked cars with hazards on the shopping streets
  let k=0;for(const c of CARS){if(k>=2)break;if(c.mode!=='parked'||c.type==='taxi')continue;const S=CARTYPES[c.type];if(S.cls!=='car')continue;const near=['mythos','starbucks','paul'].some(n=>MAP.key[n]&&Math.hypot(MAP.key[n][0]-c.x,MAP.key[n][1]-c.z)<60);if(!near||hf(c.id*3+5)>0.25)continue;
    const l=nearRoads(c.x,c.z,0,20,r=>carOK(r));if(!l.length)continue;const r=ROADS[l[0]];let best=null,bd=9;for(let s=0;s<r.L;s+=2){const q=roadPos(r,s,0);const d=Math.hypot(q.x-c.x,q.z-c.z);if(d<bd){bd=d;best=q}}if(!best||bd<2.8||bd>6)continue;
    const dx=best.x-c.x,dz=best.z-c.z,dl=Math.hypot(dx,dz);c.x+=dx/dl*2.1;c.z+=dz/dl*2.1;c.ind=3;c.occ=1;c.dbl=true;syncCar(c);TRF.dbl.push(c);k++}}
function trafficLost(c){const i=TRF.pool.indexOf(c);if(i>=0)TRF.pool.splice(i,1);if(c===TRF.bus)TRF.bus=null;
  // replace it with a fresh car out of sight
  const types=['hatch','mini','sedan','suv','taxi'];const n=addCar(types[Math.floor(Math.random()*types.length)],0,-9999,0,null,'traffic');if(n){n.hidden=true;n.occ=1;TRF.pool.push(n)}}
function trfDensity(){const h=typeof tod!=='undefined'?tod:13;if(h<5)return 0.3;if(h<7)return 0.5;if(h<10)return 1;if(h<16)return 0.85;if(h<21)return 1;if(h<23)return 0.6;return 0.4}
function updateTraffic(dt,px,pz,t){if(!ROADS.length)return;if(!TRF.init)initTraffic();if(dt<=0)return;
  camera.updateMatrixWorld();TRF.pm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);TRF.frust.setFromProjectionMatrix(TRF.pm);
  const fogD=typeof Q!=='undefined'&&Q?Q.dist:240;const want=Math.round(TRF.pool.length*trfDensity());let active=0;for(const c of TRF.pool)if(!c.hidden&&c.mode==='traffic')active++;
  // spawn hidden cars (out of sight) up to the wanted density; the bus always runs
  TRF.spawnT-=dt;if(TRF.spawnT<=0){TRF.spawnT=0.25;for(const c of TRF.pool){if(!c.hidden)continue;if(c===TRF.bus){if(placeBus(c,px,pz))break;continue}if(active>=want)break;if(placeTraffic(c,px,pz,60,Math.min(260,fogD*1.1))){active++;break}}}
  for(const c of TRF.pool){if(c.hidden||(c.mode!=='traffic'&&c.mode!=='bus'))continue;const d=Math.hypot(c.x-px,c.z-pz);
    // despawn far away or (over density) when out of sight
    if(d>fogD+40||(d>90&&!trfVisible(c.x,c.z,5)&&(active>want+1||d>200))){if(!trfVisible(c.x,c.z,5)){c.hidden=true;c.x=0;c.z=-9999;active--;continue}}
    trfDrive(c,dt,t)}
}
function placeBus(c,px,pz){const name=c.route;const l=[];ROADS.forEach((r,i)=>{if(r.name===name&&carOK(r)&&r.L>20){const m=r.ps[Math.floor(r.ps.length/2)];const d=Math.hypot(m[0]-px,m[1]-pz);if(d>70&&d<300)l.push(i)}});if(!l.length)return false;
  for(let k=0;k<6;k++){const ri=l[Math.floor(Math.random()*l.length)],r=ROADS[ri];const dir=r.ow===1?1:(Math.random()<0.5?1:-1);const s=r.L*0.5;const q=roadPos(r,s,laneOff(r)*dir);if(trfVisible(q.x,q.z,8))continue;
    c.ri=ri;c.dir=dir;c.s=s;c.path=null;c.next=null;c.x=q.x;c.z=q.z;c.yaw=Math.atan2(q.dx*dir,q.dz*dir);c.hidden=false;c.cruise=11;c.vf=8;c.wait=0;c.busStop=null;syncCar(c);return true}return false}
const _trfO={x:0,z:0};
function trfDrive(c,dt,t){const S=CARTYPES[c.type];const r=ROADS[c.ri];if(!r){c.hidden=true;return}
  // ---- plan the junction ahead
  let rem=c.path?c.path.len-c.path.u+trfRemain(c):trfRemain(c);if(!c.path&&!c.next&&trfRemain(c)<35){c.next=trfChooseNext(c);if(!c.next){c.deadEnd=true}else c.deadEnd=false}
  const nx=c.next;c.ind=nx&&!c.path&&trfRemain(c)<30?(nx.turn>0.45?1:nx.turn<-0.45?2:0):(c.path&&Math.abs(c.path.turn)>0.45&&c.path.u<c.path.len*0.8?(c.path.turn>0?1:2):0);
  // ---- target speed: cruise, curves, obstacles, lights, stop signs, bus stops
  let vT=c.cruise||10;const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);
  if(nx&&!c.path){const turnV=Math.abs(nx.turn)>0.3?clamp(3.2+7/Math.max(0.35,Math.abs(nx.turn)),4,vT):vT;const dist=Math.max(0,trfRemain(c)-6);vT=Math.min(vT,Math.sqrt(turnV*turnV+2*2.2*dist))}
  if(c.path&&Math.abs(c.path.turn)>0.3)vT=Math.min(vT,clamp(3.2+7/Math.abs(c.path.turn),4,vT));
  if(c.deadEnd&&!c.path){vT=Math.min(vT,Math.sqrt(2*2.5*Math.max(0,trfRemain(c)-4)))}
  let gap=99;const look=(x,z,rad,isCar)=>{const dx=x-c.x,dz=z-c.z,al=dx*fx+dz*fz;if(al<=0.5||al>34)return;const lat=Math.abs(-dx*fz+dz*fx);if(lat<rad)gap=Math.min(gap,al)};
  for(const o of CARS){if(o===c||o.hidden)continue;if(Math.abs(o.x-c.x)>36||Math.abs(o.z-c.z)>36)continue;if(o.mode==='parked'&&!o.dbl)continue;const So=CARTYPES[o.type];
    const dx=o.x-c.x,dz=o.z-c.z,al=dx*fx+dz*fz;if(al<=0)continue;const head=Math.cos(o.yaw-c.yaw);const lat=Math.abs(-dx*fz+dz*fx);
    // oncoming cars in their own lane are not obstacles; crossing ones are
    if(head<-0.5&&lat>1.6)continue;const need=(S.W+So.W)/2+0.35;if(lat<need){const g=al-(S.L+So.L)/2;if(g<gap){gap=g;c.blocker=o}}}
  if(!player.car&&!player.interior)look(player.x,player.z,1.7);
  if(typeof NPCS!=='undefined')for(const p of NPCS){if(!p.cross&&p.state!=='down')continue;if(Math.abs(p.x-c.x)>30||Math.abs(p.z-c.z)>30)continue;look(p.x,p.z,2.0)}
  // traffic lights at the junction we are approaching
  const endKey=c.dir>0?r.k1:r.k0;const sig=TRF.sigNodes&&TRF.sigNodes.get(endKey);
  if(sig&&!c.path){const st=signalState(sig,Math.abs(Math.cos(Math.atan2(fz,fx)-sig.ang))>0.7?0:1,t);const dl=trfRemain(c)-7;
    if(st!=='g'&&dl>-1.5){if(st==='r'||dl>c.vf*c.vf/(2*3.5))gap=Math.min(gap,Math.max(0,dl)+S.L/2*0)}}
  // stop signs: full stop, then go
  if(TRF.stopNodes&&!c.path&&TRF.stopNodes.indexOf(endKey)>=0&&!sig){const dl=trfRemain(c)-5;if(c.stopDone!==endKey){if(dl<1&&c.vf<0.4){c.stopT=(c.stopT||0)+dt;if(c.stopT>1.3){c.stopDone=endKey;c.stopT=0}}gap=Math.min(gap,Math.max(0,dl))}}
  // the bus stops at the real bus stops near its lane
  if(c===TRF.bus&&MAP.props&&MAP.props.bus){if(c.busStop){c.busStop.t-=dt;gap=Math.min(gap,0);if(c.busStop.t<=0){c.busStop.done=c.busStop.k;c.busStop=null;c.ind=0}else c.ind=2}
    else for(let k=0;k<MAP.props.bus.length;k++){const b=MAP.props.bus[k];if(c.lastStop===k)continue;const bx=b[0]/10,bz=b[1]/10;const dx=bx-c.x,dz=bz-c.z,al=dx*fx+dz*fz,lat=-dx*fz+dz*fx;if(al>0&&al<26&&lat<-0.5&&lat>-9){gap=Math.min(gap,Math.max(0,al-2));c.ind=2;if(al<3&&c.vf<0.5){c.busStop={k,t:9};c.lastStop=k;sfx&&AC&&Math.hypot(c.x-player.x,c.z-player.z)<40&&sfx('brakeAir')}}}}
  // deadlock breaker: after waiting long behind a car that is not in our lane, creep
  if(gap<99&&c.vf<0.3){c.wait=(c.wait||0)+dt}else c.wait=0;if(c.wait>7&&c.blocker&&c.blocker.mode==='traffic'){gap=99;if(c.wait>9)c.wait=0}
  const minGap=2.2;if(gap<99)vT=Math.min(vT,Math.sqrt(Math.max(0,2*3.2*(gap-minGap))));
  const acc=vT>c.vf?Math.min(2.4,(vT-c.vf)*1.5):Math.max(-7,(vT-c.vf)*3);const pv=c.vf;c.vf=Math.max(0,c.vf+acc*dt);c.brk=acc<-0.6||c.vf<0.2&&vT<0.5;c.blocker=null;
  // ---- move along the lane / the junction curve
  let dist=c.vf*dt;let x,z,yaw;
  if(c.path){c.path.u+=dist;if(c.path.u>=c.path.len){const over=c.path.u-c.path.len;c.path=null;c.s+=over*c.dir}else{const p=trfPathPos(c.path,c.path.u);x=p[0];z=p[1];yaw=p[2]}}
  if(!c.path){c.s+=dist*c.dir;const rr=ROADS[c.ri];const d0=c.next?Math.min(6,rr.L*0.35):0;
    if(c.next&&trfRemain(c)<=d0){trfMakePath(c);const p=trfPathPos(c.path,0);x=p[0];z=p[1];yaw=p[2]}
    else{if(c.s>rr.L||c.s<0){if(c.deadEnd||!c.next){// end of the network: turn round out of sight, else wait
          if(!trfVisible(c.x,c.z,5)){if(rr.ow){c.hidden=true;c.x=0;c.z=-9999;return}c.dir*=-1;c.s=clamp(c.s,0,rr.L);c.deadEnd=false}else{c.s=clamp(c.s,0,rr.L);c.vf=0}}}
      const q=trfLane(c.ri,c.dir,clamp(c.s,0,rr.L));x=q.x;z=q.z;yaw=Math.atan2(q.dx*c.dir,q.dz*c.dir)}}
  const dyaw=wrapA(yaw-c.yaw);const yr=dt>0?dyaw/dt:0;c.yaw+=dyaw*Math.min(1,dt*9);c.x=x;c.z=z;
  c.steer=c.vf>0.5?clamp(-Math.atan(yr*S.wb/Math.max(1,c.vf)),-0.6,0.6):c.steer*0.9;
  const yf=terr(c.x+fx*1.3,c.z+fz*1.3),yb=terr(c.x-fx*1.3,c.z-fz*1.3);c.pitch=-Math.atan2(yf-yb,2.6);c.roll=0;
  c.sp+=((clamp(-(c.vf-pv)/Math.max(dt,1e-3)*0.005,-0.035,0.035))-(c.sp||0))*Math.min(1,dt*5);c.sr=(c.sr||0)+((clamp(c.vf*yr*0.004,-0.04,0.04))-(c.sr||0))*Math.min(1,dt*4);c.fixY=false;syncCar(c)}
