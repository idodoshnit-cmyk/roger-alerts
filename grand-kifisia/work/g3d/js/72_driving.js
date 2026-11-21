'use strict';
/* Grand Kifisia — player driving (team:cars). SIMPLE ARCADE MODEL (owner directive 15: "car driving much, much simpler"):
   - phone: put a finger on the left half and drag left/right to steer — with auto-throttle on (default on touch screens) the car drives itself while
     the finger is down and coasts to a stop when it lifts; the big Brake button brakes, and held while stopped it reverses; Gas = full power anyway.
   - keyboard: W/Up gas, S/Down brake + reverse, A/D steer, Space handbrake.
   - strong auto-straighten, traction assist (no slides below 60 km/h, no spin-outs), handbrake slides that recover on their own,
     soft collisions (slide along walls, never stuck; auto-unstuck after 2 s), automatic gearbox (sound), sprung body (pitch / roll on kerbs and hills).
   API: driveCar(dt,jx,jy), nearestCar(), enterCar(), exitCar(force), carHit(c,impact,front), setAutoThrottle(on), DRV (tuning/state). */
const DRV={h:1/90,g:9.81,loose:[],eng:{rpm:800,red:6000,idle:800,load:0,gear:1,voice:'i4',slip:0,scrape:0,shift:0,v:0,on:false,vol:1,horn:'car'},hitT:0,revT:0,
  auto:true,assistV:16.7,stk:{x:0,z:0,t:0},unstuckN:0,
  circ:[{x:0,z:0},{x:0,z:0},{x:0,z:0},{x:0,z:0},{x:0,z:0}],oc:[{x:0,z:0},{x:0,z:0},{x:0,z:0},{x:0,z:0},{x:0,z:0}]};
try{const v=localStorage.getItem('gk_autogas');if(v!==null)DRV.auto=v==='1'}catch(e){}
function setAutoThrottle(on){DRV.auto=!!on;try{localStorage.setItem('gk_autogas',DRV.auto?'1':'0')}catch(e){}return DRV.auto}
function carDyn(c){const S=CARTYPES[c.type];return S.dyn}
function gearTop(d,k){return d.vmax*Math.pow(k/d.eng.gears,0.8)}
/* circles that approximate a car footprint (3 for cars, 5 for long vehicles, 2 for two-wheelers); local offsets along the car's axis */
function carCircles(c,out){const S=CARTYPES[c.type];const n=S.L>7?5:S.cls==='moto'?2:3;const r=S.W/2*0.98;const half=Math.max(0,S.L/2-r);const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);
  for(let i=0;i<n;i++){const o=n===1?0:lerp(-half,half,i/(n-1));out[i].x=c.x+fx*o;out[i].z=c.z+fz*o;out[i].o=o;out[i].r=r}return n}
/* ground under the four wheels → chassis height, pitch and roll (kerbs and slopes) */
const _wp=[0,0,0,0];
function wheelGround(c){const S=CARTYPES[c.type];const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),lx=Math.cos(c.yaw),lz=-Math.sin(c.yaw);const zf=S.zf,zr=S.zr,t=S.cls==='moto'?0:S.track/2;
  const g=(lo,fo)=>groundY(c.x+lx*lo+fx*fo,c.z+lz*lo+fz*fo);const fl=g(t,zf),fr=g(-t,zf),rl=g(t,zr),rr=g(-t,zr);
  _wp[0]=(fl+fr+rl+rr)/4;_wp[1]=Math.atan2((rl+rr)/2-(fl+fr)/2,S.wb);_wp[2]=t?Math.atan2((fl+rl)/2-(fr+rr)/2,S.track):0;
  _wp[0]-=Math.sin(_wp[1])*((zf+zr)/2);return _wp}
/* the pedals as the player means them: thr 0..1 forward drive, brk 0..1 brake / reverse, hand */
function driveIntent(jy){const touch=typeof JOY!=='undefined'&&JOY.id!==null;const brk=jy>0.05?Math.min(1,jy):0;let thr=jy<-0.05?Math.min(1,-jy):0;
  if(!thr&&!brk&&DRV.auto&&touch)thr=1;/* auto-throttle: steering finger down = drive */
  return{thr,brk,hand:!!(input.brake||keys.Space),touch}}
function driveCar(dt,jx,jy){const c=player.car;if(!c)return;const S=CARTYPES[c.type],d=S.dyn,E=DRV.eng;
  const I=driveIntent(jy);const hand=I.hand;let steps=Math.max(1,Math.ceil(dt/DRV.h));const h=dt/steps;
  if(Math.abs(jx)<0.08)jx=0;else jx=Math.sign(jx)*Math.min(1,(Math.abs(jx)-0.08)/0.92);jx=Math.sign(jx)*Math.pow(Math.abs(jx),1.35);/* soft centre: small thumb wobbles do not weave */
  if(c.gear===undefined){c.gear=1;c.yr=0;c.shv=0;c.spv=0;c.srv=0;c.sh=0;c.sp=0;c.sr=0;c.shiftT=0;c.fixY=true;c.vr=0;const w=wheelGround(c);c.y=w[0];c.pitch=w[1];c.roll=w[2];DRV.stk.t=0;DRV.revT=0}
  if(c.hp===undefined)c.hp=100;const wreck=c.hp<=0;
  if(DRV.exitReq){I.thr=0;I.brk=0;const bd=12*dt;c.vf=Math.abs(c.vf)<=bd?0:c.vf-Math.sign(c.vf)*bd}
  let slipSum=0,scrape=0,ax=0,thrShown=0,reverse=false,braking=false;
  for(let s=0;s<steps;s++){let v=c.vf;const av=Math.abs(v);let a=0;
    /* ---- longitudinal: brake button brakes, then reverses once stopped (auto-reverse); throttle drives forward (or brakes a reversing car) */
    if(I.brk>0){if(v>0.4){braking=true;v=Math.max(0,v-d.brake*(0.55+0.45*I.brk)*h);DRV.revT=0}else{DRV.revT+=h;if(DRV.revT>0.22){reverse=true;a=v>-7?-d.acc*0.6:0}else v*=Math.max(0,1-10*h)}}
    else{DRV.revT=0;if(I.thr>0){if(v<-0.4){braking=true;v=Math.min(0,v+d.brake*h)}else{const top=gearTop(d,c.gear);
        if(c.gear<1)c.gear=1;if(v>top*0.93&&c.gear<d.eng.gears){c.gear++;c.shiftT=0.2;E.shift=1}else if(c.gear>1&&v<gearTop(d,c.gear-1)*0.62){c.gear--;c.shiftT=0.1;E.shift=0.6}
        const f=1-Math.pow(clamp(v/d.vmax,0,1),2.2);a=d.acc*I.thr*(0.45+0.55*f)*(c.shiftT>0?0.6:1)*(wreck?0.2:1);thrShown=I.thr}}
      else{/* coasting: engine braking; with auto-throttle a lifted finger slows the car firmly so stopping is easy */
        const dec=(DRV.auto&&!I.touch&&('ontouchstart' in window)?2.6:1.3)+0.012*av;v=Math.abs(v)<=dec*h?0:v-Math.sign(v)*dec*h}}
    if(c.shiftT>0)c.shiftT-=h;if(!reverse&&v>=0&&c.gear===0)c.gear=1;if(reverse)c.gear=0;
    if(hand){const bd=(av>6?3.2:7)*h;v=Math.abs(v)<=bd?0:v-Math.sign(v)*bd}
    /* hills: gravity along the slope only while moving or pushing (a parked or stopped car never creeps or jitters) */
    if(Math.abs(v)>0.5||I.thr>0||reverse)a+=DRV.g*Math.sin(c.pitch)*0.6;
    a-=0.00028*v*Math.abs(v);v+=a*h;v=clamp(v,-7.5,d.vmax*1.02);ax+=(v-c.vf)/h;c.vf=v;
    /* ---- steering: speed-sensitive angle, quick to turn in, faster still to straighten (strong auto-centre) */
    const maxSt=d.steer*lerp(1,0.24,clamp(av/36,0,1));const tgt=jx*maxSt;const toward=Math.abs(tgt)>Math.abs(c.steer)&&Math.sign(tgt)===Math.sign(c.steer||tgt);
    const rate=jx===0?7.5:toward?3.2:6.5;c.steer+=clamp(tgt-c.steer,-rate*h,rate*h);
    /* ---- yaw: follows the wheels directly (traction assist) up to the grip limit; handbrake lets the tail out a little and always recovers */
    const hb=hand&&av>6;const rdes=-v*Math.tan(c.steer)/S.wb;const amax=DRV.g*d.grip*1.05*(wreck?0.75:1);const rcap=amax/Math.max(3,av);
    let rg=clamp(rdes,-rcap,rcap);if(hb)rg=clamp(rdes*1.7,-1.9,1.9);
    c.yr+=(rg-c.yr)*Math.min(1,h*(hb?3.5:12));c.yaw+=c.yr*h;
    /* ---- lateral slip: none below ~60 km/h; a gentle drift above it or on the handbrake, capped so the car never spins */
    const allow=hb?1:clamp((av-DRV.assistV)/14,0,0.6);
    c.vr+=c.yr*v*0.32*allow*h;c.vr*=Math.exp(-h*(hb?1.6:lerp(30,4,allow)));const vmaxR=Math.abs(v)*(hb?0.45:0.22);c.vr=clamp(c.vr,-vmaxR,vmaxR);
    if(hb||Math.abs(c.vr)>1)c.vf-=Math.sign(c.vf)*Math.min(Math.abs(c.vf),Math.abs(c.vr)*0.25*h);
    slipSum+=Math.abs(c.vr)*0.6+(hb?2.2:0)+(Math.abs(rdes)>rcap*1.15&&av>8?1.2:0);
    /* ---- move, then slide along whatever is in the way (sub-stepped: never tunnels) */
    const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),rx=-Math.cos(c.yaw),rz=Math.sin(c.yaw);c.x+=(fx*c.vf+rx*c.vr)*h;c.z+=(fz*c.vf+rz*c.vr)*h;
    scrape=Math.max(scrape,carWorldCollide(c,S,d));carCarCollide(c,S,d);
  }
  DRV.hitT-=dt;ax/=steps;
  /* people: shove them aside at low speed; at speed they are knocked down (npcHitByCar when the characters module provides it) */
  if(Math.abs(c.vf)>0.8)for(const p of NPCS){if(p.static||p.state==='down'||p.h&&p.h.inCar)continue;const dx=p.x-c.x,dz=p.z-c.z;if(dx*dx+dz*dz>36)continue;const pp={x:p.x,z:p.z};
    if(carPush(c,pp,0.3)){if(Math.abs(c.vf)>5){if(typeof npcHitByCar==='function')npcHitByCar(p,c);else{p.state='down';p.timer=5;p.panic=8;if(p.h&&p.h.play)p.h.play('lie');sfx('thud')}}else{p.x=pp.x;p.z=pp.z;p.panic=4}}}
  if(typeof TRAIN!=='undefined'&&TRAIN.state!=='away')for(const m of TRAIN.cars){const dd=Math.hypot(m.position.x-c.x,m.position.z-c.z);if(dd<10){const dx=c.x-m.position.x,dz=c.z-m.position.z,co=Math.cos(m.rotation.y),si=Math.sin(m.rotation.y);const lx=dx*co-dz*si,lz=dx*si+dz*co;if(Math.abs(lx)<2.7&&Math.abs(lz)<9.5){c.x=m.position.x+co*Math.sign(lx||1)*2.7+si*lz;c.z=m.position.z-si*Math.sign(lx||1)*2.7+co*lz;if(TRAIN.state!=='dwell'&&typeof hurt==='function')hurt(40,'Hit by the train');c.vf=0;c.vr=0}}}
  /* edge of the playable area: slide along it like a wall */
  if(typeof inPlay==='function'&&!inPlay(c.x,c.z)){const ox=c.x-(Math.sin(c.yaw)*c.vf-Math.cos(c.yaw)*c.vr)*dt*1.05,oz=c.z-(Math.cos(c.yaw)*c.vf+Math.sin(c.yaw)*c.vr)*dt*1.05;
    if(inPlay(c.x,oz))c.z=oz;else if(inPlay(ox,c.z))c.x=ox;else{c.x=ox;c.z=oz;c.vf*=0.3}c.vf*=0.97;
    if(!DRV.edgeT||performance.now()>DRV.edgeT){DRV.edgeT=performance.now()+6000;subtitle('That\'s the edge of Grand Kifisia — turn back.',2)}}
  /* never stuck: if the player keeps pushing for 2 s and the car has not got anywhere, lift it to the nearest free spot */
  const pushing=I.thr>0||I.brk>0;if(!pushing){DRV.stk.t=0;DRV.stk.x=c.x;DRV.stk.z=c.z}else{if(Math.hypot(c.x-DRV.stk.x,c.z-DRV.stk.z)>1.2){DRV.stk.x=c.x;DRV.stk.z=c.z;DRV.stk.t=0}else{DRV.stk.t+=dt;if(DRV.stk.t>2){DRV.stk.t=0;unstuckCar(c)}}}
  /* ---- sprung body: chassis follows the wheel contacts, the body follows the chassis through damped springs (dive, squat, roll, kerb bumps) */
  const w=wheelGround(c);const ay=c.vf*c.yr;const cg=d.cg||0.55;const spT=clamp(-ax*0.0045*cg/0.55,-0.05,0.05)*(S.cls==='moto'?0.4:1),srT=S.cls==='moto'?clamp(-Math.atan(ay/DRV.g),-0.7,0.7):clamp(ay*0.0036*cg/0.55,-0.055,0.055);
  const k=120,cdm=13;
  const tgtY=w[0];const dy=tgtY-c.y;if(Math.abs(dy)>0.6){c.y=tgtY;c.shv=0}else{c.shv+=(dy*k-c.shv*cdm)*dt;c.y+=c.shv*dt}
  c.spv+=((spT-c.sp)*k-c.spv*cdm)*dt;c.sp+=c.spv*dt;c.srv+=((srT-c.sr)*k-c.srv*cdm)*dt;c.sr+=c.srv*dt;
  const dp=w[1]-c.pitch,dr=w[2]-c.roll;c.spv-=dp*1.5;c.srv-=dr*1.5;c.pitch=w[1];c.roll=w[2];c.sh=0;
  c.brk=braking||hand||(I.brk>0&&Math.abs(c.vf)<0.4&&!reverse);c.rev=reverse;c.ind=c.ind===3?3:0;syncCar(c);
  player.x=c.x;player.z=c.z;player.y=c.y;
  if(DRV.exitReq&&Math.abs(c.vf)<1.5){DRV.exitReq=0;exitCar(true);if(!player.car&&typeof gameEvent==='function')gameEvent('exitCar',{car:c});return}
  /* ---- sound */
  const av=Math.abs(c.vf);E.v=av;E.on=true;E.red=d.eng.red;E.idle=d.eng.idle;E.voice=d.eng.voice;E.vol=d.eng.vol||1;E.gear=c.gear;
  const gt=gearTop(d,Math.max(1,c.gear));const rpmT=c.gear===0?lerp(E.idle,E.red*0.55,clamp(av/8,0,1)):lerp(E.idle,E.red,clamp(av/gt,0,1))*(c.shiftT>0?0.82:1)+(thrShown>0.1&&av<1?E.idle*0.6*thrShown:0);
  E.rpm+=(Math.max(E.idle,rpmT)-E.rpm)*Math.min(1,dt*(c.shiftT>0?14:8));E.load=lerp(E.load,clamp(thrShown+(reverse?0.6:0),0,1),Math.min(1,dt*6));E.slip=lerp(E.slip,clamp(slipSum/steps/4,0,1),Math.min(1,dt*10));E.scrape=scrape;
  if(typeof engine==='function')engine(av,thrShown,E);E.shift=0;
  if(typeof carFX==='function')carFX(c,E.slip,dt)}
/* is the car's footprint free of walls, buildings, props and other cars at (x,z,yaw)? */
function carFree(c,x,z,yaw){const S=CARTYPES[c.type];const C=DRV.circ;const sv=[c.x,c.z,c.yaw];c.x=x;c.z=z;c.yaw=yaw;const n=carCircles(c,C);c.x=sv[0];c.z=sv[1];c.yaw=sv[2];
  for(let i=0;i<n;i++){const p={x:C[i].x,z:C[i].z};if(collide(p,C[i].r+0.05))return false;
    for(const o of CARS){if(o===c||o.hidden)continue;const dx=o.x-p.x,dz=o.z-p.z;const So=CARTYPES[o.type];const rr=C[i].r+Math.max(So.L,So.W)/2;if(dx*dx+dz*dz<rr*rr*0.6)return false}}
  return typeof inPlay!=='function'||inPlay(x,z)}
/* auto-unstuck: nearest free spot (behind first, then around) whose heading has 4 m of clear road ahead; turns away from the obstacle when needed */
function unstuckCar(c){const back=c.vf<0?0:Math.PI;const yaws=[0,0.5,-0.5,1.0,-1.0,1.6,-1.6,Math.PI].map(o=>c.yaw+o);const dirs=[];for(let k=0;k<12;k++)dirs.push(c.yaw+back+(k%2?1:-1)*Math.ceil(k/2)*Math.PI/6);
  const ahead=(x,z,y)=>{const sgn=c.vf<0?-1:1;return carFree(c,x+Math.sin(y)*2*sgn,z+Math.cos(y)*2*sgn,y)&&carFree(c,x+Math.sin(y)*4*sgn,z+Math.cos(y)*4*sgn,y)};
  for(let pass=0;pass<2;pass++)for(let r=1.5;r<=8;r+=1)for(const a of dirs){const x=c.x+Math.sin(a)*r,z=c.z+Math.cos(a)*r;for(const y of yaws){if(!carFree(c,x,z,y)||(pass===0&&!ahead(x,z,y)))continue;
      c.x=x;c.z=z;c.yaw=y;c.vf=0;c.vr=0;c.yr=0;c.steer=0;DRV.unstuckN++;if(typeof vehFX==='function')vehFX('dust',x,c.y+0.2,z,8);return true}}
  c.yaw+=Math.PI;c.vf=0;c.vr=0;c.yr=0;DRV.unstuckN++;return false}
/* walls, buildings, props, trees: push each footprint circle out and SLIDE along the surface (no bounce, little speed lost on a glancing hit) */
function carWorldCollide(c,S,d){const C=DRV.circ;const n=carCircles(c,C);let sx=0,sz=0,cnt=0,maxPen=0,hitO=0;
  for(let i=0;i<n;i++){const p=C[i];const ox=p.x,oz=p.z;let moved=false;for(let it=0;it<3;it++){if(!collide(p,p.r))break;moved=true}if(moved){const dx=p.x-ox,dz=p.z-oz,l=Math.hypot(dx,dz);if(l>1e-5){sx+=dx;sz+=dz;cnt++;if(l>maxPen){maxPen=l;hitO=p.o}}}}
  if(!cnt)return 0;sx/=cnt;sz/=cnt;c.x+=sx;c.z+=sz;const l=Math.hypot(sx,sz)||1;const nx=sx/l,nz=sz/l;
  const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),rx=-Math.cos(c.yaw),rz=Math.sin(c.yaw);let vx=fx*c.vf+rx*c.vr,vz=fz*c.vf+rz*c.vr;const vn=vx*nx+vz*nz;
  if(vn<0){const imp=-vn,spd=Math.hypot(vx,vz)||1;vx-=vn*nx;vz-=vn*nz;/* remove only the part going into the wall */
    const fr=1-0.25*Math.min(1,imp/10);vx*=fr;vz*=fr;
    /* glancing hit: turn the nose to run along the wall instead of grinding into it */
    const tx=-nz,tz=nx,along=fx*tx+fz*tz,into=-(fx*nx+fz*nz);if(into>0&&into<0.75&&c.vf>1){const want=Math.atan2(tx*Math.sign(along||1),tz*Math.sign(along||1));c.yaw+=wrapA(want-c.yaw)*0.08;c.yr*=0.6}
    c.vf=vx*Math.sin(c.yaw)+vz*Math.cos(c.yaw);c.vr=(vx*-Math.cos(c.yaw)+vz*Math.sin(c.yaw))*0.5;if(imp>3)carHit(c,imp,hitO>=0,c.x-nx*S.W*0.5+fx*hitO,c.z-nz*S.W*0.5+fz*hitO);return 0}
  const vt=Math.abs(vx*-nz+vz*nx);return vt>2?Math.min(1,vt/14):0}
/* damage + feedback for a hit of `imp` m/s on the front (true) or rear */
function carHit(c,imp,front,hx,hz){const k=Math.min(1,imp/40);if(front)c.dmgF=Math.min(1,c.dmgF+k*0.6);else c.dmgR=Math.min(1,c.dmgR+k*0.6);c.hp=Math.max(0,(c.hp===undefined?100:c.hp)-imp*1.6);
  if(c===player.car){if(DRV.hitT<=0){sfx('crash',imp);DRV.hitT=0.22}if(typeof camShake!=='undefined')camShake=Math.min(1,imp/16);if(imp>16&&typeof hurt==='function')hurt(Math.round((imp-16)*2.2),'Crash');
    if(c.hp<=0&&!c.wreckMsg){c.wreckMsg=1;subtitle('The engine is wrecked — it will only crawl now. Find another car.',3.5)}}
  if(typeof vehFX==='function')vehFX('spark',hx===undefined?c.x:hx,c.y+0.5,hz===undefined?c.z:hz,Math.min(24,4+imp*1.2))}
/* car-to-car: circles against circles, momentum exchange by mass; parked and traffic cars get shoved and slide (DRV.loose) */
function carCarCollide(c,S,d){const C=DRV.circ,O=DRV.oc;const n=carCircles(c,C);const m1=d.mass;
  for(const o of CARS){if(o===c||o.hidden)continue;const dx0=o.x-c.x,dz0=o.z-c.z;if(dx0*dx0+dz0*dz0>196)continue;const So=CARTYPES[o.type];const m2=So.dyn?So.dyn.mass:1200;const no=carCircles(o,O);
    for(let i=0;i<n;i++)for(let j=0;j<no;j++){const a=C[i],b=O[j];const dx=a.x-b.x,dz=a.z-b.z,dd=Math.hypot(dx,dz),rr=a.r+b.r;if(dd>=rr||dd<1e-4)continue;const nx=dx/dd,nz=dz/dd,pen=rr-dd;
      const w1=m2/(m1+m2),w2=m1/(m1+m2);c.x+=nx*pen*w1;c.z+=nz*pen*w1;a.x+=nx*pen*w1;a.z+=nz*pen*w1;
      if(!o.lv)o.lv={x:0,z:0,r:0};if(o.mode==='traffic'||o.mode==='bus'){o.lv.x=Math.sin(o.yaw)*o.vf;o.lv.z=Math.cos(o.yaw)*o.vf}
      o.x-=nx*pen*w2;o.z-=nz*pen*w2;
      const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),rx=-Math.cos(c.yaw),rz=Math.sin(c.yaw);let vx=fx*c.vf+rx*c.vr,vz=fz*c.vf+rz*c.vr;const vn=(vx-o.lv.x)*nx+(vz-o.lv.z)*nz;
      if(vn<0){const e=0.22,J=-(1+e)*vn/(1/m1+1/m2);vx+=J/m1*nx;vz+=J/m1*nz;o.lv.x-=J/m2*nx;o.lv.z-=J/m2*nz;const ob=b.o;o.lv.r=(o.lv.r||0)-((Math.cos(o.yaw)*ob)*(-nx)-(Math.sin(o.yaw)*ob)*(-nz))*J/m2*6/(So.L*So.L);
        c.vf=vx*fx+vz*fz;c.vr=vx*rx+vz*rz;const imp=-vn;if(imp>1.5){carHit(c,imp*Math.min(1,m2/m1+0.3),a.o>=0,(a.x+b.x)/2,(a.z+b.z)/2);carHit(o,imp,b.o>=0,(a.x+b.x)/2,(a.z+b.z)/2)}
        if(o.mode==='traffic'&&imp>3){o.mode='free';o.ind=3;o.occ=1;if(typeof trafficLost==='function')trafficLost(o)}
        if(o.mode!=='traffic'&&o.mode!=='bus'&&DRV.loose.indexOf(o)<0)DRV.loose.push(o)}
      syncCar(o)}}}
/* cars that were shoved slide to a stop with tyre friction and hit walls */
function updateLoose(dt){for(let i=DRV.loose.length-1;i>=0;i--){const o=DRV.loose[i];if(o===player.car||!o.lv){DRV.loose.splice(i,1);continue}const sp=Math.hypot(o.lv.x,o.lv.z);const dec=6.5*dt;
    if(sp<=dec&&Math.abs(o.lv.r)<0.05){o.lv.x=o.lv.z=o.lv.r=0;DRV.loose.splice(i,1);if(o.mode==='free'||o.mode==='parked'){o.fixY=true;const w=wheelGround(o);o.y=w[0];o.pitch=w[1];o.roll=w[2];syncCar(o)}continue}
    const k=sp>0?Math.max(0,sp-dec)/sp:0;o.lv.x*=k;o.lv.z*=k;o.lv.r*=Math.max(0,1-3*dt);o.x+=o.lv.x*dt;o.z+=o.lv.z*dt;o.yaw+=o.lv.r*dt;
    const S=CARTYPES[o.type];const p={x:o.x,z:o.z};if(collide(p,S.W/2)){o.x=p.x;o.z=p.z;o.lv.x*=0.3;o.lv.z*=0.3}o.fixY=true;const w=wheelGround(o);o.y=w[0];o.pitch=w[1];o.roll=w[2];syncCar(o)}}
/* enter / leave (walk up, press Car) */
function nearestCar(){let best=null,bd=1e9;for(const c of CARS){if(c.hidden||c===player.car)continue;const T_=CARTYPES[c.type];const dx=player.x-c.x,dz=player.z-c.z;if(dx*dx+dz*dz>144)continue;
    const co=Math.cos(c.yaw),si=Math.sin(c.yaw);const lx=Math.abs(dx*co-dz*si)-T_.W/2,lz=Math.abs(dx*si+dz*co)-T_.L/2;const d=Math.hypot(Math.max(0,lx),Math.max(0,lz))-(S_ex(c)?0.6:0);if(d<3.6&&d<bd){bd=d;best=c}}return best}
function S_ex(c){return !!CARTYPES[c.type].exotic}
function enterCar(){const c=nearestCar();if(!c)return;if(typeof ISA!=='undefined'&&ISA.inside){subtitle('No cars inside the school grounds.',2);return}
  const S=CARTYPES[c.type];
  if(c.mode==='traffic'||c.mode==='bus'||(c.mode==='free'&&c.occ)){subtitle(c.mode==='bus'?'You ask the bus driver to take a break. He shrugs and steps off.':'The driver jumps out and stomps off, shouting in Greek.',2.6);
    try{if(typeof Ped==='function'&&typeof randomLook==='function'){const hp=new Ped(randomLook());const lx=Math.cos(c.yaw),lz=-Math.sin(c.yaw);const p={h:hp,ri:0,s:0,dir:1,side:1,spd:1.6,state:'walk',timer:0,x:c.x+lx*(S.W/2+0.8),z:c.z+lz*(S.W/2+0.8),panic:6,yaw:c.yaw};
      if(typeof placeNpc==='function'){placeNpc(p,c.x,c.z,1,25);p.x=c.x+lx*(S.W/2+0.8);p.z=c.z+lz*(S.W/2+0.8)}NPCS.push(p)}}catch(e){}
    if(typeof trafficLost==='function')trafficLost(c)}
  const wasLoose=DRV.loose.indexOf(c);if(wasLoose>=0)DRV.loose.splice(wasLoose,1);
  DRV.exitReq=0;c.mode='player';c.occ=1;c.vr=0;c.ind=0;c.gear=undefined;player.car=c;if(typeof ph!=='undefined'&&ph&&ph.root)ph.root.visible=false;sfx('door');if(typeof camYaw!=='undefined')camYaw=c.yaw;
  if(typeof carDoor==='function')carDoor(c);c.shv=-0.35;
  const touch=('ontouchstart' in window);const how=touch?(DRV.auto?'Drag on the left to steer — the car drives itself while your finger is down. BRAKE to stop, hold it to reverse.':'Drag on the left to steer, GAS to go, BRAKE to stop / reverse.'):'W / S to drive and brake (hold S to reverse), A / D to steer, Space handbrake.';
  if(S.exotic)subtitle(`${S.name} — ${Math.round(S.dyn.vmax*3.6)} km/h top speed. ${how}`,4.5);
  else if(!DRV.told){DRV.told=1;subtitle(how+' Car to get out.',4.5)}}
function exitCar(force){const c=player.car;if(!c)return;if(!force&&Math.abs(c.vf)>4){DRV.exitReq=1;subtitle('Stopping…',1);return}const S=CARTYPES[c.type];
  const lx=Math.cos(c.yaw),lz=-Math.sin(c.yaw);let p=null;for(const side of[1,-1]){const q={x:c.x+lx*side*(S.W/2+0.55),z:c.z+lz*side*(S.W/2+0.55)};const ox=q.x,oz=q.z;collide(q,0.35);if(Math.hypot(q.x-ox,q.z-oz)<0.25){p=q;break}if(!p)p=q}
  player.x=p.x;player.z=p.z;player.y=groundY(p.x,p.z);player.yaw=c.yaw;c.mode='free';c.occ=0;c.vf=0;c.vr=0;c.brk=false;c.steer*=0.5;player.car=null;if(typeof ph!=='undefined'&&ph&&ph.root)ph.root.visible=true;sfx('door');
  if(typeof carDoor==='function')carDoor(c);DRV.eng.on=false;if(typeof engine==='function')engine(0,0,DRV.eng);syncCar(c)}
