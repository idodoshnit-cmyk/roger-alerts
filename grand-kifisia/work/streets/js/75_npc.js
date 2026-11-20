'use strict';
/* Grand Kifisia — pedestrian (NPC) spawning and AI on the road graph */
/* ============================== PEDESTRIANS & TRAFFIC ============================== */
const NPCS=[];
function walkOff(r,side){if(r.ty<=4)return(r.w/2+Math.max(1.0,r.sw*0.55))*side;if(r.ty===6)return 1.5*side;return 0.45*side}
function roadPos(r,s,off){const c=r.cum,ps=r.ps;s=clamp(s,0,r.L);let i=r._i||1;if(i>=c.length||c[i-1]>s)i=1;while(i<c.length-1&&c[i]<s)i++;r._i=i;const seg=(c[i]-c[i-1])||1e-6,t=(s-c[i-1])/seg;const a=ps[i-1],b=ps[i];const dx=(b[0]-a[0])/seg,dz=(b[1]-a[1])/seg;return{x:lerp(a[0],b[0],t)-dz*off,z:lerp(a[1],b[1],t)+dx*off,dx,dz}}
function nextRoad(r,atEnd,ok){const k=atEnd?r.k1:r.k0;const l=(ROADNODES.get(k)||[]).filter(e=>ROADS[e.ri]!==r&&ok(ROADS[e.ri],e.end));return l.length?l[Math.floor(Math.random()*l.length)]:null}
const pedOK=r=>(r.ty<=4&&r.side>0)||(r.ty>=6&&r.ty<=8&&r.side>=0);
function nearRoads(x,z,r0,r1,ok){const o=[];ROADS.forEach((r,i)=>{if(!ok(r))return;const m=r.ps[Math.floor(r.ps.length/2)];const d=Math.hypot(m[0]-x,m[1]-z);if(d>r0&&d<r1)o.push(i)});return o}
function placeNpc(n,cx,cz,r0,r1){const l=nearRoads(cx,cz,r0,r1,pedOK);if(!l.length)return false;n.ri=l[Math.floor(Math.random()*l.length)];const r=ROADS[n.ri];n.s=Math.random()*r.L;n.dir=Math.random()<0.5?1:-1;n.side=Math.random()<0.5?1:-1;const p=roadPos(r,n.s,walkOff(r,n.side));n.x=p.x;n.z=p.z;n.cross=null;return true}
function spawnPeople(cx,cz){const seats=[];
  for(const k of['starbucks','mythos']){const s=SPECIAL[k];if(!s)continue;for(let i=0;i<3;i++){const ux=-s.nz,uz=s.nx;const x=s.door[0]+s.nx*1.6+ux*(i-1)*2.1,z=s.door[1]+s.nz*1.6+uz*(i-1)*2.1;if(maskBuilding(x,z))continue;seats.push({x,z,yaw:Math.atan2(-ux,-uz)+(i%2?Math.PI:0),kind:'sit'})}}
  for(const b of MAP.props.bench.slice(0,6)){const x=b[0]/10,z=b[1]/10;if(inFocus(x,z))seats.push({x,z,yaw:hf(b[0])*TAU+Math.PI,kind:'sit'})}
  if(STATION.mid){for(let i=0;i<2;i++){const p=atLen(TRAINPATH.ps,TRAINPATH.cum,30+i*25);const x=p[0]+(-Math.cos(p[2])*STATION.side)*4,z=p[1]+(Math.sin(p[2])*STATION.side)*4;seats.push({x,z,yaw:p[2]+Math.PI/2*STATION.side,kind:'idle'})}}
  // talking pairs on Kassaveti & Platanos
  const P=MAP.key.platanos;seats.push({x:P[0]+3,z:P[1]+5,yaw:0.4,kind:'talk'},{x:P[0]+3.6,z:P[1]+6.2,yaw:3.5,kind:'talk'});
  let made=0;for(const s of seats){if(made>=10)break;const h=new Ped(randomLook());const n={h,static:s.kind,x:s.x,z:s.z,yaw:s.yaw,state:'still',timer:0};h.play(s.kind==='sit'?'sit':s.kind==='talk'?'talk':'idle');NPCS.push(n);made++}
  for(let k=made;k<49;k++){const h=new Ped(randomLook());const n={h,ri:0,s:0,dir:1,side:1,spd:R(1.15,1.55),state:'walk',timer:0,x:0,z:0,panic:0,yaw:0};placeNpc(n,cx,cz,3,k<34?140:260);NPCS.push(n)}}
function maskBuilding(x,z){return !!collide({x,z},0.5,['t','p'])}
const PCAM=new THREE.Vector3();
function updatePeople(dt,px,pz){let n=0;for(const p of NPCS){const d=Math.hypot(p.x-px,p.z-pz);
    if(p.static){p.h.root.visible=d<120;if(d<120){p.h.root.position.set(p.x,groundY(p.x,p.z)+(p.static==='sit'?0.02:0),p.z);p.h.root.rotation.y=p.yaw;if(d<60||(n++%3===0))p.h.update(d<60?dt:dt*3,0,false)}continue}
    if(d>300&&p.state!=='down'){placeNpc(p,px,pz,80,180);continue}
    const vis=d<150;p.h.root.visible=vis;
    if(p.state==='down'){p.timer-=dt;if(p.timer<=0){p.state='walk';p.h.stop()}if(vis){p.h.root.position.set(p.x,groundY(p.x,p.z),p.z);p.h.update(dt,0,false)}continue}
    if(p.state==='talk'){p.timer-=dt;const ty=Math.atan2(player.x-p.x,player.z-p.z);p.h.root.rotation.y+=wrapA(ty-p.h.root.rotation.y)*Math.min(1,dt*6);p.yaw=p.h.root.rotation.y;if(p.timer<=0||d>6){p.state='walk';p.h.stop()}if(vis){p.h.root.position.set(p.x,groundY(p.x,p.z),p.z);p.h.update(dt,0,false)}continue}
    let spd=p.spd*(p.panic>0?2.6:1);if(p.panic>0)p.panic-=dt;
    if(p.cross){const c=p.cross;const dx=c.x-p.x,dz=c.z-p.z,l=Math.hypot(dx,dz);if(l<0.25){p.cross=null}else{p.x+=dx/l*spd*dt;p.z+=dz/l*spd*dt;p.yaw=Math.atan2(dx,dz)}}
    else{const r=ROADS[p.ri];p.s+=spd*dt*p.dir;if(p.s>r.L||p.s<0){const atEnd=p.s>r.L;const nx=nextRoad(r,atEnd,pedOK);if(nx){p.ri=nx.ri;const r2=ROADS[nx.ri];p.dir=nx.end===0?1:-1;p.s=nx.end===0?0:r2.L;const q=roadPos(r2,p.s,walkOff(r2,p.side));p.cross={x:q.x,z:q.z}}else{p.dir*=-1;p.s=clamp(p.s,0,r.L);p.side*=-1;const q=roadPos(r,p.s,walkOff(r,p.side));p.cross={x:q.x,z:q.z}}}
      if(!p.cross){const q=roadPos(ROADS[p.ri],p.s,walkOff(ROADS[p.ri],p.side));const dx=q.x-p.x,dz=q.z-p.z;if(dx*dx+dz*dz>1e-6)p.yaw=Math.atan2(dx,dz);p.x=q.x;p.z=q.z}}
    if(vis){p.h.root.position.set(p.x,groundY(p.x,p.z),p.z);let dy=wrapA(p.yaw-p.h.root.rotation.y);p.h.root.rotation.y+=dy*Math.min(1,dt*8);if(d<70||(n++%2===0))p.h.update(d<70?dt:dt*2,spd,false)}}}
