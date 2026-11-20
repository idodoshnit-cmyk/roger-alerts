'use strict';
/* Grand Kifisia — save game + stats, player on foot (movement, collision response, stepping), health/respawn,
   camera (on foot / indoors / driving / cut-scenes). See docs/GAMEPLAY.md for the public API. */

/* ============================== SAVE GAME ==============================
   One JSON blob in localStorage (through store.get/set, which are already try/catch-safe; the game works without storage). */
const SAVE_V=3;
function newSave(){return{v:SAVE_V,money:40,done:{},best:{},flags:{},tod:16.5,pos:null,
  stats:{earned:0,spent:0,walked:0,driven:0,played:0,passed:0,failed:0,talked:0,gyros:0,coffees:0,baskets:0,rides:0,topSpeed:0,cars:0,punches:0,given:0,knocked:0}}}
let SAVE=(function(){const s=store.get('save',null);if(s&&s.v===SAVE_V){const n=newSave();Object.assign(n.stats,s.stats||{});return Object.assign(n,s,{stats:n.stats})}
  const n=newSave();const om=store.get('money',null),od=store.get('done',null);if(typeof om==='number')n.money=om;if(od)for(const k in od)n.done[k]=1;return n})();
const STATS=SAVE.stats;
let saveT=0;
function saveGame(){try{SAVE.money=player.money;if(typeof tod==='number')SAVE.tod=tod;
  if(!player.car&&!player.interior&&!player.busy&&!(typeof mission!=='undefined'&&mission))SAVE.pos=[Math.round(player.x*10)/10,Math.round(player.z*10)/10,Math.round(player.yaw*100)/100];
  store.set('save',SAVE)}catch(e){}}
function wipeSave(){try{for(const k of['save','money','done'])localStorage.removeItem('gk2_'+k)}catch(e){}
  const n=newSave();for(const k in SAVE)delete SAVE[k];Object.assign(SAVE,n);for(const k in STATS)delete STATS[k];Object.assign(STATS,n.stats);SAVE.stats=STATS}
/* default settings (00_core.js creates SETTINGS from storage; fill in what this module adds) */
(function(){const d={sens:1,invY:false,lefty:false,vol:0.8,fps:false,haptics:true,subs:true};for(const k in d)if(SETTINGS[k]===undefined)SETTINGS[k]=d[k]})();
function saveSettings(){store.set('settings',SETTINGS)}

/* ============================== PLAYER ============================== */
const player={x:0,z:0,y:0,vy:0,yaw:0,spd:0,car:null,health:100,money:SAVE.money,air:false,knock:0,busy:0,interior:null,// interior: key of the walk-in interior the player is inside (null = outdoors)
  vx:0,vz:0,mv:0,step:0,ball:false,frozen:false,blocked:0};
let ph;
const input={jx:0,jy:0,sprint:false,brake:false,gas:false,rev:false,looking:false};const keys={};
let camYaw=0,camPitch=0.2,lastDrag=0,camDist=4.4,camShake=0;
/* other modules may push fn(dt) here from their boot-time init: called once per simulated frame while the game runs */
const FRAME_HOOKS=[];
const PMOVE={R:0.3,WALK:1.6,RUN:4.4,SPRINT:6.5,GRAV:19.6,JUMP:5.2,SUB:0.12};
const _ply1={x:0,z:0},SKIP_AIR=['p','t'];
function readStick(car){let jx=input.jx,jy=input.jy;const kx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),ky=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
  if(kx||ky){if(car){jx=kx;jy=ky}else{const l=Math.hypot(kx,ky);jx=kx/l;jy=ky/l}}
  if(car){if(input.gas)jy=-1;else if(input.rev)jy=1}
  _ply1.x=jx;_ply1.z=jy;return _ply1}
/* resolve the on-foot capsule (a circle in plan) against the world at point p; returns true when something pushed back */
function footSolve(p,ox,oz){let hit=false;const skip=player.y-groundY(player.x,player.z)>0.7?SKIP_AIR:null;
  for(let i=0;i<3;i++){if(!collide(p,PMOVE.R,skip))break;hit=true}
  for(let i=0;i<CARS.length;i++){const c=CARS[i],dx=c.x-p.x,dz=c.z-p.z;if(dx*dx+dz*dz<16&&carPush(c,p,PMOVE.R))hit=true}
  for(let i=0;i<NPCS.length;i++){const n=NPCS[i];if(n.state==='down')continue;const dx=p.x-n.x,dz=p.z-n.z,d2=dx*dx+dz*dz;if(d2<0.3025&&d2>1e-6){const d=Math.sqrt(d2),k=(0.55-d)*0.6;p.x+=dx/d*k;p.z+=dz/d*k;hit=true}}
  if(TRAIN.cars.length&&TRAIN.state!=='away')for(const m of TRAIN.cars){const dx=p.x-m.position.x,dz=p.z-m.position.z;if(dx*dx+dz*dz>100)continue;const co=Math.cos(m.rotation.y),si=Math.sin(m.rotation.y);const lx=dx*co-dz*si,lz=dx*si+dz*co;
    if(Math.abs(lx)<1.75&&Math.abs(lz)<8.8){if(TRAIN.state==='depart'||TRAIN.state==='arrive'){hurt(60,'Hit by the train');player.knock=2.5;ph.play('lie')}p.x=m.position.x+co*Math.sign(lx||1)*1.75+si*lz;p.z=m.position.z-si*Math.sign(lx||1)*1.75+co*lz;hit=true}}
  if(!player.interior&&!inPlay(p.x,p.z)){/* slide along the edge of the playable area instead of stopping dead */
    if(inPlay(p.x,oz))p.z=oz;else if(inPlay(ox,p.z))p.x=ox;else{p.x=ox;p.z=oz}hit=true;
    if(performance.now()>edgeMsgT){edgeMsgT=performance.now()+6000;subtitle('That is the edge of Grand Kifisia — head back towards the centre.',2.5)}}
  return hit}
let edgeMsgT=0;
function updatePlayer(dt){const car=player.car;const st=readStick(!!car);let jx=st.x,jy=st.z;
  STATS.played+=dt;
  if(car){driveCar(dt,jx,jy);const v=Math.abs(car.vf||0);STATS.driven+=v*dt;if(v>STATS.topSpeed)STATS.topSpeed=v;player.vx=Math.sin(car.yaw)*car.vf;player.vz=Math.cos(car.yaw)*car.vf;player.mv=v;player.spd=0;player.step=0;return}
  if(player.busy>0){player.busy-=dt;player.spd=player.mv=player.vx=player.vz=0;ph.root.position.set(player.x,player.y,player.z);ph.root.rotation.y=player.yaw;ph.update(dt,0,false);return}
  if(player.knock>0){player.knock-=dt;if(player.knock<=0)ph.stop();player.spd=player.mv=player.vx=player.vz=0;ph.update(dt,0,false);player.y=groundY(player.x,player.z);ph.root.position.set(player.x,player.y,player.z);return}
  if(player.frozen)jx=jy=0;
  const sy=Math.sin(camYaw),cy=Math.cos(camYaw);const mx=-sy*jy-cy*jx,mz=-cy*jy+sy*jx;const mag=Math.min(1,Math.hypot(jx,jy));
  const sprint=(input.sprint||keys.ShiftLeft||keys.ShiftRight)&&mag>0.5;
  let target=mag<0.02?0:sprint?PMOVE.SPRINT:mag<0.6?lerp(0.8,PMOVE.WALK,mag/0.6):lerp(PMOVE.WALK,PMOVE.RUN,(mag-0.6)/0.4);
  if(keys.ControlLeft||keys.AltLeft)target=Math.min(target,PMOVE.WALK);
  if(player.interior)target=Math.min(target,2.6);
  /* heading follows the stick: exponential ease with a speed-dependent rate cap, so it never snaps and never wobbles */
  if(mag>0.02){const d=wrapA(Math.atan2(mx,mz)-player.yaw),ad=Math.abs(d),s01=clamp(player.spd/PMOVE.SPRINT,0,1);
    const cap=lerp(13,6.5,s01)*dt;player.yaw=wrapA(player.yaw+clamp(d*(1-Math.exp(-lerp(16,9,s01)*dt)),-cap,cap));
    if(ad>1.9)target*=lerp(1,0.25,clamp((ad-1.9)/1.0,0,1))}// pivot on the spot before running back the other way
  /* speed: exponential approach with a minimum slope so it settles cleanly (frame-rate independent) */
  {const ds=target-player.spd;if(ds!==0){const k=ds>0?(player.air?2:6.5):(player.air?1:9);let s=ds*(1-Math.exp(-k*dt));const mn=(ds>0?2.5:5)*dt;if(Math.abs(s)<mn)s=Math.sign(ds)*Math.min(Math.abs(ds),mn);player.spd+=s}}
  const ox=player.x,oz=player.z;let px=ox,pz=oz,hit=false;
  if(player.spd>0.001){const dist=player.spd*dt,n=Math.max(1,Math.ceil(dist/PMOVE.SUB)),fx=Math.sin(player.yaw)*dist/n,fz=Math.cos(player.yaw)*dist/n;
    for(let i=0;i<n;i++){_ply2.x=px+fx;_ply2.z=pz+fz;if(footSolve(_ply2,px,pz))hit=true;px=_ply2.x;pz=_ply2.z}}
  const adx=px-ox,adz=pz-oz,mvRaw=dt>0?Math.hypot(adx,adz)/dt:0;player.vx=dt>0?adx/dt:0;player.vz=dt>0?adz/dt:0;
  /* blocked by a wall: bleed the speed so the character shuffles instead of running on the spot */
  if(hit&&player.spd>0.7&&mvRaw<player.spd*0.55){player.spd=Math.max(0.7,mvRaw,player.spd-24*dt);player.blocked=0.2}else if(player.blocked>0)player.blocked-=dt;
  player.mv+=(mvRaw-player.mv)*(1-Math.exp(-14*dt));if(player.mv<0.01)player.mv=0;
  STATS.walked+=mvRaw*dt;
  player.x=px;player.z=pz;
  /* vertical: terrain is followed exactly (no lag on slopes); the 16 cm kerb / platform level is eased like a real step */
  const gT=terr(px,pz),L=lvl(px,pz);
  if(player.air){player.vy-=PMOVE.GRAV*dt;player.y+=player.vy*dt;if(player.y<=gT+L){if(player.vy<-9.5)hurt(10,'Bad landing');player.y=gT+L;player.step=L;player.vy=0;player.air=false;if(typeof ambLand==='function')ambLand()}}
  else{const d=L-player.step;if(d<-0.45){player.air=true;player.vy=0}else{player.step+=d*(1-Math.exp(-dt*(d>0?22:14)));if(Math.abs(L-player.step)<0.002)player.step=L;player.y=gT+player.step}}
  ph.root.position.set(player.x,player.y,player.z);ph.root.rotation.y=player.yaw;ph.update(dt,player.air?0:player.mv,player.air);
  if(player.health<100)player.health=Math.min(100,player.health+dt*1.2)}
const _ply2={x:0,z:0};
function playerJump(){if(player.car||player.busy>0||player.air||player.knock>0||player.frozen)return false;player.vy=PMOVE.JUMP;player.air=true;return true}
/* place the player somewhere (missions, respawn, interiors): keeps the vertical state and camera consistent */
function placePlayer(x,z,yaw){player.x=x;player.z=z;player.step=lvl(x,z);player.y=terr(x,z)+player.step;player.vy=0;player.air=false;player.spd=player.mv=player.vx=player.vz=0;if(yaw!=null){player.yaw=yaw;camYaw=yaw}
  if(ph){ph.root.position.set(x,player.y,z);ph.root.rotation.y=player.yaw}CAMS.ok=false}
function hurt(n,why){if(player.health<=0)return;player.health-=n;if(typeof hudHurt==='function')hudHurt(n);
  if(player.health<=0){player.health=100;const fee=Math.min(player.money,15);STATS.knocked++;if(fee>0){if(typeof addMoney==='function')addMoney(-fee,'Hospital bill');else player.money=Math.round((player.money-fee)*100)/100}
    if(typeof mission!=='undefined'&&mission&&typeof failMission==='function'){respawn(true);failMission(why+'.');return}
    banner('KNOCKED OUT',why+(fee?` · hospital bill €${fee.toFixed(2)}`:''),true);respawn()}}
function spawnPoint(){const P=JUNCTION();for(let r=0;r<30;r+=1.5)for(let a=0;a<16;a++){const x=P[0]+Math.cos(a/16*TAU)*r,z=P[1]+Math.sin(a/16*TAU)*r;if(lvl(x,z)>0.1&&!collide({x,z},0.6,null))return{x,z}}return{x:P[0],z:P[1]}}
function JUNCTION(){if(MAP.key&&MAP.key.junction)return MAP.key.junction;const t=[SPECIAL.mythos&&SPECIAL.mythos.door,SPECIAL.super&&SPECIAL.super.door,SPECIAL.paul&&SPECIAL.paul.door].filter(Boolean);let best=null,bd=1e9;
  for(const [k,l] of ROADNODES){const ns=l.filter(e=>ROADS[e.ri].ty<=4);if(ns.length<2)continue;const [x,z]=k.split(',').map(v=>+v/10);const d=t.reduce((s,q)=>s+Math.hypot(q[0]-x,q[1]-z),0);if(d<bd){bd=d;best=[x,z]}}return best||MAP.key.platanos}
function respawn(quiet){if(player.car)exitCar(true);if(player.interior&&typeof exitInterior==='function'){try{exitInterior(true)}catch(e){}}player.interior=null;const s=spawnPoint();placePlayer(s.x,s.z);player.knock=0;player.busy=0;player.frozen=false;ph.root.visible=true;ph.stop();if(typeof lastMarker!=='undefined')lastMarker=performance.now()+5000}

/* ============================== CAMERA ==============================
   The orbit (camYaw, camPitch, camDist) is the only thing the player or the auto-follow changes. The pivot is a critically damped
   copy of the player's position, the boom length is eased against obstacles (in fast, out slow), and the camera is then placed rigidly
   from those smooth values — so nothing in the chain can jerk. freeCam (a function) takes over for cut-scenes. */
let camT=new THREE.Vector3(),camP=new THREE.Vector3(),freeCam=null;
const CAMS={ok:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,ax:0,az:0,avx:0,avz:0,d:4.4,dv:0,fov:60,fv:0,lvx:0,lvy:0,yv:0,pv:0,roll:0,rv:0,rev:0,t:0,rise:0,risev:0,sh:0,shv:0,hide:false};
const PITCH_MIN=-0.25,PITCH_MAX=1.15;
let _sdV=0;
/* critically damped spring (Game Programming Gems 4 "SmoothDamp"); returns the new value, new velocity in _sdV */
function sdamp(cur,tgt,vel,st,dt){const om=2/Math.max(1e-4,st),x=om*dt,e=1/(1+x+0.48*x*x+0.235*x*x*x),ch=cur-tgt,tmp=(vel+om*ch)*dt;_sdV=(vel-om*tmp)*e;return tgt+(ch+tmp)*e}
/* fraction (0..1) of the way from a to b at which a camera-blocking segment is hit */
function camRay(ax,az,bx,bz,indoor){stamp++;let best=1;const dx=bx-ax,dz=bz-az;const gx0=Math.floor(Math.min(ax,bx)/CELL),gx1=Math.floor(Math.max(ax,bx)/CELL),gz0=Math.floor(Math.min(az,bz)/CELL),gz1=Math.floor(Math.max(az,bz)/CELL);
  for(let gx=gx0;gx<=gx1;gx++)for(let gz=gz0;gz<=gz1;gz++){const a=grid.get(gx*65536+gz);if(!a)continue;
    for(let i=0;i<a.length;i++){const s=a[i];if(s.s===stamp)continue;s.s=stamp;const k=s.kind;if(indoor?(k==='p'||k==='t'):(k!=='b'))continue;
      const ex=s.bx-s.ax,ez=s.bz-s.az,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const t=((s.ax-ax)*ez-(s.az-az)*ex)/den,u=((s.ax-ax)*dz-(s.az-az)*dx)/den;if(t>0&&t<best&&u>=-0.02&&u<=1.02)best=t}}
  return best}
function camSnap(){const c=player.car;CAMS.x=c?c.x:player.x;CAMS.z=c?c.z:player.z;CAMS.y=(c?(c.y||terr(c.x,c.z))+1.15:player.y+1.5);CAMS.vx=CAMS.vy=CAMS.vz=CAMS.ax=CAMS.az=CAMS.avx=CAMS.avz=CAMS.dv=CAMS.yv=CAMS.pv=CAMS.lvx=CAMS.lvy=0;CAMS.d=Math.min(CAMS.d,c?7:camDist);CAMS.ok=true}
function updateCamera(dt){if(freeCam){freeCam(dt);CAMS.ok=false;return}
  const c=player.car,indoor=!!player.interior,idle=(performance.now()-lastDrag)/1000;
  const tx=c?c.x:player.x,tz=c?c.z:player.z,ty=c?(c.y||terr(c.x,c.z))+1.15:player.y+1.5;
  if(!CAMS.ok||Math.abs(CAMS.x-tx)+Math.abs(CAMS.z-tz)>14)camSnap();
  /* drag-look inertia */
  if(!input.looking&&(CAMS.lvx||CAMS.lvy)){camYaw+=CAMS.lvx*dt;camPitch=clamp(camPitch+CAMS.lvy*dt,PITCH_MIN,PITCH_MAX);const k=Math.exp(-dt*8);CAMS.lvx*=k;CAMS.lvy*=k;if(Math.abs(CAMS.lvx)<0.02)CAMS.lvx=0;if(Math.abs(CAMS.lvy)<0.02)CAMS.lvy=0}
  let want,fovT,lax=0,laz=0,pivUp=0.25,stXZ=0.07,stY=0.16,rollT=0;
  if(c){const sp=Math.abs(c.vf||0);if((c.vf||0)<-1.5)CAMS.rev+=dt;else CAMS.rev=0;const heading=c.yaw+(CAMS.rev>0.6?Math.PI:0);
    if(idle>1.5&&!input.looking){camYaw=heading+sdamp(wrapA(camYaw-heading),0,CAMS.yv,lerp(0.6,0.24,clamp(sp/12,0,1)),dt);CAMS.yv=_sdV;camPitch=sdamp(camPitch,0.17+Math.min(0.05,sp*0.002),CAMS.pv,0.7,dt);CAMS.pv=_sdV}else{CAMS.yv=0;CAMS.pv=0}
    want=5.4+Math.min(4.2,sp*0.11);fovT=58+Math.min(22,sp*0.72);const la=clamp((c.vf||0)*0.16,-1.5,4.5);lax=Math.sin(c.yaw)*la;laz=Math.cos(c.yaw)*la;stXZ=0.05;stY=0.22;pivUp=0.35;
    rollT=clamp(-(c.steer||0)*sp*0.004,-0.04,0.04)}
  else{const mv=player.mv;
    if(idle>1.6&&!input.looking&&mv>0.9&&!player.frozen){const d=wrapA(player.yaw-camYaw),ad=Math.abs(d);/* ease behind the direction of travel — but not while the player runs towards the camera */
      const w=(1-sstep((ad-2.0)/0.8))*clamp(mv/PMOVE.RUN,0,1.3);camYaw+=d*(1-Math.exp(-dt*1.15*w));
      camPitch+=(0.2-camPitch)*(1-Math.exp(-dt*0.5*w))}
    want=indoor?Math.min(camDist,2.9):camDist;fovT=indoor?64:(player.spd>PMOVE.RUN+0.6?66:60);const la=indoor?0.08:0.2;lax=player.vx*la;laz=player.vz*la;if(player.air)stY=0.3}
  CAMS.x=sdamp(CAMS.x,tx,CAMS.vx,stXZ,dt);CAMS.vx=_sdV;CAMS.z=sdamp(CAMS.z,tz,CAMS.vz,stXZ,dt);CAMS.vz=_sdV;CAMS.y=sdamp(CAMS.y,ty,CAMS.vy,stY,dt);CAMS.vy=_sdV;
  CAMS.ax=sdamp(CAMS.ax,lax,CAMS.avx,0.4,dt);CAMS.avx=_sdV;CAMS.az=sdamp(CAMS.az,laz,CAMS.avz,0.4,dt);CAMS.avz=_sdV;
  const cp=Math.cos(camPitch),sp_=Math.sin(camPitch),sy=Math.sin(camYaw),cy=Math.cos(camYaw),rx=-cy,rz=sy;
  const px=CAMS.x+CAMS.ax,pz=CAMS.z+CAMS.az,hd=Math.max(0.6,want*cp);
  /* obstacle avoidance: centre ray + two whiskers; pull in fast, ease back out slowly */
  let t=camRay(px,pz,px-sy*hd,pz-cy*hd,indoor);const wsk=indoor?0.22:0.4;
  t=Math.min(t,camRay(px,pz,px-sy*hd+rx*wsk,pz-cy*hd+rz*wsk,indoor),camRay(px,pz,px-sy*hd-rx*wsk,pz-cy*hd-rz*wsk,indoor));
  const dT=t<1?Math.max(0.45,(hd*t-0.28)/Math.max(0.2,cp)):want;
  CAMS.d=sdamp(CAMS.d,dT,CAMS.dv,dT<CAMS.d?0.05:0.5,dt);CAMS.dv=_sdV;if(t<1&&CAMS.d>dT+0.2){CAMS.d=dT+0.2;if(CAMS.dv>0)CAMS.dv=0}
  const squeeze=1-clamp(CAMS.d/Math.max(1.2,want*0.6),0,1);/* 0 = full boom, 1 = pressed against the player */
  CAMS.rise=sdamp(CAMS.rise,squeeze*0.55,CAMS.risev,0.18,dt);CAMS.risev=_sdV;
  const shT=c||indoor?0:0.3*clamp((CAMS.d-1.2)/2,0,1);CAMS.sh=sdamp(CAMS.sh,shT,CAMS.shv,0.3,dt);CAMS.shv=_sdV;
  const d=CAMS.d,piv=CAMS.y+pivUp+CAMS.rise;let cx=px-sy*d*cp+rx*CAMS.sh,cz=pz-cy*d*cp+rz*CAMS.sh,cyy=piv+d*sp_+(c?0.55:0.1);
  const floor=groundY(cx,cz)+0.35;if(cyy<floor)cyy=floor;
  camP.set(cx,cyy,cz);camT.set(px+rx*CAMS.sh,piv+(c?0.1:0.12),pz+rz*CAMS.sh);
  camera.position.copy(camP);
  if(camShake>0.001){CAMS.t+=dt;const a=Math.min(1,camShake),tt=CAMS.t;camera.position.x+=(Math.sin(tt*41)+Math.sin(tt*67+1.3))*0.07*a;camera.position.y+=(Math.sin(tt*53+0.7)+Math.sin(tt*79))*0.05*a;camShake=Math.max(0,camShake-dt*1.9)}else camShake=0;
  camera.lookAt(camT);CAMS.roll=sdamp(CAMS.roll,rollT,CAMS.rv,0.35,dt);CAMS.rv=_sdV;if(Math.abs(CAMS.roll)>1e-4)camera.rotateZ(CAMS.roll);
  CAMS.fov=sdamp(CAMS.fov,fovT,CAMS.fv,0.45,dt);CAMS.fv=_sdV;if(Math.abs(camera.fov-CAMS.fov)>0.02){camera.fov=CAMS.fov;camera.updateProjectionMatrix()}
  /* do not look through the character's head when the camera is squeezed right up to it */
  if(!c&&ph&&player.busy<=0){const hide=d<0.8;if(hide||CAMS.hide)ph.root.visible=!hide;CAMS.hide=hide}}
/* cut-scene helper: run fn(t,dt) as the camera for `secs` seconds (t = 0..1), then return to the chase camera; resolves when done or skipped */
let cutSkip=null;
function camCut(secs,fn,opt){return new Promise(res=>{let t=0;const o=opt||{};const end=()=>{if(freeCam!==f)return;freeCam=null;cutSkip=null;CAMS.ok=false;if(typeof cinema==='function'&&!o.keepBars)cinema(false);res()};
  const f=dt=>{t+=dt/secs;fn(Math.min(1,t),dt);if(t>=1)end()};freeCam=f;cutSkip=o.noSkip?null:end;if(typeof cinema==='function'&&!o.noBars)cinema(true,o.title,o.sub)})}
