'use strict';
/* Grand Kifisia — player on foot, health/respawn, camera */
/* ============================== PLAYER ============================== */
const player={x:0,z:0,y:0,vy:0,yaw:0,spd:0,car:null,health:100,money:40,air:false,knock:0,busy:0,interior:null};// interior: key of the walk-in interior the player is inside (null = outdoors)
let ph;
const input={jx:0,jy:0,sprint:false,brake:false};const keys={};
let camYaw=0,camPitch=0.22,lastDrag=0,camDist=4.6,camShake=0;
function updatePlayer(dt){let jx=input.jx,jy=input.jy;if(keys.KeyW||keys.ArrowUp)jy=-1;if(keys.KeyS||keys.ArrowDown)jy=1;if(keys.KeyA||keys.ArrowLeft)jx=-1;if(keys.KeyD||keys.ArrowRight)jx=1;
  if(player.car){driveCar(dt,jx,jy);return}
  if(player.busy>0){player.busy-=dt;ph.root.position.set(player.x,player.y,player.z);ph.root.rotation.y=player.yaw;ph.update(dt,0,false);return}
  if(player.knock>0){player.knock-=dt;if(player.knock<=0)ph.stop();ph.update(dt,0,false);ph.root.position.set(player.x,groundY(player.x,player.z),player.z);return}
  const fc=[Math.sin(camYaw),Math.cos(camYaw)],rc=[-Math.cos(camYaw),Math.sin(camYaw)];let mx=fc[0]*-jy+rc[0]*jx,mz=fc[1]*-jy+rc[1]*jx;let mag=Math.min(1,Math.hypot(mx,mz));
  const sprint=input.sprint||keys.ShiftLeft||keys.ShiftRight;const target=mag<0.08?0:(sprint?6.6:(mag<0.55?lerp(0.9,1.7,mag/0.55):lerp(1.7,4.6,(mag-0.55)/0.45)));
  player.spd+=(target-player.spd)*Math.min(1,dt*(target>player.spd?4:7));
  if(mag>0.08){const ty=Math.atan2(mx,mz);player.yaw+=wrapA(ty-player.yaw)*Math.min(1,dt*10)}
  const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);const p={x:player.x+fx*player.spd*dt,z:player.z+fz*player.spd*dt};
  const skip=player.y-groundY(player.x,player.z)>0.6?['p','t']:null;collide(p,0.32,skip);for(const c of CARS)carPush(c,p,0.32);
  if(TRAIN.cars.length&&TRAIN.state!=='away')for(const m of TRAIN.cars){const dx=p.x-m.position.x,dz=p.z-m.position.z,co=Math.cos(m.rotation.y),si=Math.sin(m.rotation.y);const lx=dx*co-dz*si,lz=dx*si+dz*co;if(Math.abs(lx)<1.75&&Math.abs(lz)<8.8){if(TRAIN.state==='depart'||TRAIN.state==='arrive'){hurt(60,'Hit by the train');player.knock=2.5;ph.play('lie')}p.x=m.position.x+co*Math.sign(lx||1)*1.75+si*lz;p.z=m.position.z-si*Math.sign(lx||1)*1.75+co*lz}}
  if(!player.interior&&!inPlay(p.x,p.z)){p.x=player.x;p.z=player.z;subtitle('That\'s outside Grand Kifisia — head back to the centre.',2)}
  player.x=p.x;player.z=p.z;const gy=groundY(p.x,p.z);player.vy-=19*dt;player.y+=player.vy*dt;if(player.y<=gy){if(player.air&&player.vy<-9)hurt(10,'Bad landing');player.y=gy;player.vy=0;player.air=false}else if(player.y>gy+0.25)player.air=true;
  if(player.y<gy+0.2&&!player.air)player.y+=(gy-player.y)*Math.min(1,dt*12);
  ph.root.position.set(player.x,player.y,player.z);ph.root.rotation.y=player.yaw;ph.update(dt,player.air?0:player.spd,player.air);
  if(player.health<100)player.health=Math.min(100,player.health+dt*1.2)}
function hurt(n,why){player.health-=n;if(player.health<=0){player.health=100;const fee=Math.min(player.money,15);player.money=Math.round((player.money-fee)*100)/100;banner('KNOCKED OUT',why+(fee?` · hospital bill €${fee}`:''),true);if(mission)endMission(false,true);respawn()}}
function spawnPoint(){const P=JUNCTION();for(let r=0;r<30;r+=1.5)for(let a=0;a<16;a++){const x=P[0]+Math.cos(a/16*TAU)*r,z=P[1]+Math.sin(a/16*TAU)*r;if(lvl(x,z)>0.1&&!collide({x,z},0.6,null))return{x,z}}return{x:P[0],z:P[1]}}
function JUNCTION(){const t=[SPECIAL.mythos&&SPECIAL.mythos.door,SPECIAL.super&&SPECIAL.super.door,SPECIAL.paul&&SPECIAL.paul.door].filter(Boolean);let best=null,bd=1e9;
  for(const [k,l] of ROADNODES){const ns=l.filter(e=>ROADS[e.ri].ty<=4);if(ns.length<2)continue;const [x,z]=k.split(',').map(v=>+v/10);const d=t.reduce((s,q)=>s+Math.hypot(q[0]-x,q[1]-z),0);if(d<bd){bd=d;best=[x,z]}}return best||MAP.key.platanos}
function respawn(){if(player.car)exitCar(true);const s=spawnPoint();player.x=s.x;player.z=s.z;player.y=groundY(s.x,s.z);player.knock=0;ph.stop();lastMarker=performance.now()+5000}

/* ============================== CAMERA ============================== */
let camT=new THREE.Vector3(),camP=new THREE.Vector3(),freeCam=null;
function updateCamera(dt){if(freeCam){freeCam(dt);return}
  const c=player.car;const tx=player.x,tz=player.z,ty=(c?player.y+1.5:player.y+1.55);
  const dist=c?(6.6+Math.abs(c.vf)*0.07):camDist;const hgt=c?2.0:0.55;
  if(c){if(performance.now()-lastDrag>1400){const fwd=c.vf>=-1?c.yaw:c.yaw+Math.PI;camYaw+=wrapA(fwd-camYaw)*Math.min(1,dt*(2.2+Math.abs(c.vf)*0.08))}}
  else if(performance.now()-lastDrag>1100&&player.spd>0.8){camYaw+=wrapA(player.yaw-camYaw)*Math.min(1,dt*(0.8+player.spd*0.35))}
  const cp=Math.cos(camPitch),sp=Math.sin(camPitch);let cx=tx-Math.sin(camYaw)*dist*cp,cz=tz-Math.cos(camYaw)*dist*cp;
  const t=rayHit(tx,tz,cx,cz);let d2=dist;if(t<1){const f=Math.max(0.12,t-0.06);cx=tx+(cx-tx)*f;cz=tz+(cz-tz)*f;d2=dist*f}
  let cy=ty+hgt+d2*sp;cy=Math.max(cy,terr(cx,cz)+0.6);
  camP.set(cx,cy,cz);camT.set(tx+(c?Math.sin(c.yaw)*c.vf*0.06:0),ty,tz+(c?Math.cos(c.yaw)*c.vf*0.06:0));
  camera.position.lerp(camP,Math.min(1,dt*(c?6:9)));if(camera.position.distanceTo(camP)>25)camera.position.copy(camP);
  if(camShake>0){camera.position.x+=(Math.random()-0.5)*camShake*0.4;camera.position.y+=(Math.random()-0.5)*camShake*0.3;camShake=Math.max(0,camShake-dt*2)}
  camera.lookAt(camT);const fov=c?60+Math.min(14,Math.abs(c.vf)*0.45):60;if(Math.abs(camera.fov-fov)>0.1){camera.fov+=(fov-camera.fov)*Math.min(1,dt*3);camera.updateProjectionMatrix()}}

