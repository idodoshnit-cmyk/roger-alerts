'use strict';
/* Grand Kifisia — driving physics for the player's car, entering and leaving vehicles */
function driveCar(dt,jx,jy){const c=player.car;const T_=CARTYPES[c.type];let thr=-jy;const brake=input.brake||keys.Space;
  const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);
  // throttle / brake / reverse
  if(thr>0.05){c.vf+=thr*(c.vf<0?14:Math.max(2.5,8.5-c.vf*0.18))*dt}else if(thr<-0.05){c.vf+=thr*(c.vf>0.5?16:5)*dt}
  if(brake)c.vf*=1-Math.min(1,dt*(Math.abs(c.vf)>2?2.2:5));
  c.vf-=c.vf*Math.abs(c.vf)*0.0012*dt*60*0.016+c.vf*0.18*dt;c.vf=clamp(c.vf,-9,38);
  const maxSteer=lerp(0.62,0.16,clamp(Math.abs(c.vf)/30,0,1));c.steer+=(jx*maxSteer-c.steer)*Math.min(1,dt*7);
  const yawRate=-(c.vf/2.6)*Math.tan(c.steer);c.yaw+=yawRate*dt;
  // lateral slip (handbrake drifts)
  const grip=brake&&Math.abs(c.vf)>8?2.2:9;c.vr+=(-yawRate*c.vf*0.06)*dt;c.vr*=1-Math.min(1,grip*dt);
  const rx=-Math.cos(c.yaw),rz=Math.sin(c.yaw);let nx=c.x+(Math.sin(c.yaw)*c.vf+rx*c.vr)*dt,nz=c.z+(Math.cos(c.yaw)*c.vf+rz*c.vr)*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(nx-c.x,nz-c.z)/0.5));const sx=(nx-c.x)/steps,sz=(nz-c.z)/steps;let bump=0;
  for(let k=0;k<steps;k++){c.x+=sx;c.z+=sz;const f={x:c.x+Math.sin(c.yaw)*(T_.L/2-0.8),z:c.z+Math.cos(c.yaw)*(T_.L/2-0.8)},b={x:c.x-Math.sin(c.yaw)*(T_.L/2-0.8),z:c.z-Math.cos(c.yaw)*(T_.L/2-0.8)};
    const h1=collide(f,T_.W/2,['t']),h2=collide(b,T_.W/2,['t']);if(h1||h2){c.x=(f.x+b.x)/2;c.z=(f.z+b.z)/2;bump=Math.max(bump,Math.abs(c.vf))}}
  if(bump){if(bump>7){camShake=Math.min(1,bump/25);hurt(Math.round((bump-7)*1.2),'Crash');sfx('crash',bump)}c.vf*=-0.25;c.vr*=0.3}
  for(const o of CARS){if(o===c)continue;const dx=o.x-c.x,dz=o.z-c.z,d=Math.hypot(dx,dz);if(d<3.6&&d>0.01){const pen=(3.6-d);const p={x:c.x,z:c.z};if(carPush(o,p,T_.W/2*0.9)){c.x=p.x;c.z=p.z;if(Math.abs(c.vf)>5){sfx('crash',Math.abs(c.vf)*0.6);camShake=0.4}if(o.mode==='traffic'){o.vf=0}else if(o.mode==='parked'){o.x+=dx/d*pen*0.15;o.z+=dz/d*pen*0.15;syncCar(o)}c.vf*=0.55}}}
  if(Math.abs(c.vf)>4)for(const p of NPCS){if(p.static||p.state==='down')continue;const pp={x:p.x,z:p.z};if(carPush(c,pp,0.3)){p.state='down';p.timer=5;p.panic=8;p.h.play('lie');sfx('thud')}}
  if(TRAIN.state!=='away')for(const m of TRAIN.cars){const d=Math.hypot(m.position.x-c.x,m.position.z-c.z);if(d<9){const dx=c.x-m.position.x,dz=c.z-m.position.z,co=Math.cos(m.rotation.y),si=Math.sin(m.rotation.y);const lx=dx*co-dz*si,lz=dx*si+dz*co;if(Math.abs(lx)<2.7&&Math.abs(lz)<9.5){c.x=m.position.x+co*Math.sign(lx||1)*2.7+si*lz;c.z=m.position.z-si*Math.sign(lx||1)*2.7+co*lz;if(TRAIN.state!=='dwell')hurt(40,'Hit by the train');c.vf=0}}}
  if(!inPlay(c.x,c.z)){c.x-=Math.sin(c.yaw)*c.vf*dt*2;c.z-=Math.cos(c.yaw)*c.vf*dt*2;c.vf=0;subtitle('That\'s outside Grand Kifisia — turn back.',2)}
  // suspension feel: pitch from terrain + accel, roll from steering
  const yf=terr(c.x+Math.sin(c.yaw)*1.3,c.z+Math.cos(c.yaw)*1.3),yb=terr(c.x-Math.sin(c.yaw)*1.3,c.z-Math.cos(c.yaw)*1.3);const tp=-Math.atan2(yf-yb,2.6);
  c.pitch+=(tp-thr*0.012*(c.vf>0?1:-1)-c.pitch)*Math.min(1,dt*6);c.roll+=(c.steer*c.vf*0.006-c.roll)*Math.min(1,dt*5);syncCar(c);
  player.x=c.x;player.z=c.z;player.y=terr(c.x,c.z);engine(Math.abs(c.vf),thr)}
/* enter / exit vehicles (GTA style: walk up, press Car) */
function nearestCar(){let best=null,bd=3.4;for(const c of CARS){const T_=CARTYPES[c.type];const d=Math.hypot(c.x-player.x,c.z-player.z)-T_.L*0.35;if(d<bd){bd=d;best=c}}return best}
function enterCar(){const c=nearestCar();if(!c)return;if(ISA.inside){subtitle('No cars inside the school grounds.',2);return}
  if(c.mode==='traffic'){subtitle('You pull the driver out. He is not happy.',2.5);const h=new Ped(randomLook());const p={h,ri:0,s:0,dir:1,side:1,spd:1.4,state:'walk',timer:0,x:c.x-Math.cos(c.yaw)*2,z:c.z+Math.sin(c.yaw)*2,panic:6,yaw:0};placeNpc(p,c.x,c.z,1,25);p.x=c.x-Math.cos(c.yaw)*2;p.z=c.z+Math.sin(c.yaw)*2;NPCS.push(p)}
  c.mode='player';c.vr=0;player.car=c;ph.root.visible=false;sfx('door');camYaw=c.yaw}
function exitCar(force){const c=player.car;if(!c)return;if(!force&&Math.abs(c.vf)>4){subtitle('Slow down first.',1.5);return}const p={x:c.x-Math.cos(c.yaw)*1.9,z:c.z+Math.sin(c.yaw)*1.9};collide(p,0.35);player.x=p.x;player.z=p.z;player.y=groundY(p.x,p.z);player.yaw=c.yaw;c.mode='free';c.vf=0;player.car=null;ph.root.visible=true;sfx('door');engine(0,0)}

