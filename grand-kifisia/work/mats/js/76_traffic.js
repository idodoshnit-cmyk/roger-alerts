'use strict';
/* Grand Kifisia — traffic AI on the real road graph */
/* traffic on the real road graph, obeying the signals */
const carOK=(r,end)=>{if(!(r.ty<=3&&r.side>=0))return false;if(end===undefined||!r.ow)return true;return r.ow===1?end===0:end===1};
function placeTraffic(c,cx,cz,r0,r1){const l=nearRoads(cx,cz,r0,r1,r=>carOK(r));if(!l.length)return;c.ri=l[Math.floor(Math.random()*l.length)];const r=ROADS[c.ri];c.dir=r.ow===-1?-1:r.ow===1?1:(Math.random()<0.5?1:-1);c.s=Math.random()*r.L;const q=roadPos(r,c.s,laneOff(r)*c.dir);c.x=q.x;c.z=q.z;c.yaw=Math.atan2(q.dx*c.dir,q.dz*c.dir);syncCar(c)}
function laneOff(r){return r.ow?0:Math.max(1.5,r.w/4)}
function updateTraffic(dt,px,pz,t){for(const c of CARS){if(c.mode!=='traffic')continue;
  if(Math.hypot(c.x-px,c.z-pz)>320){placeTraffic(c,px,pz,110,260);continue}
  const r=ROADS[c.ri];const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);let block=99;
  const look=(x,z,rad)=>{const dx=x-c.x,dz=z-c.z,al=dx*fx+dz*fz,lat=Math.abs(-dx*fz+dz*fx);if(al>0&&al<12&&lat<rad)block=Math.min(block,al)};
  for(const o of CARS){if(o===c||(o.mode==='parked'))continue;look(o.x,o.z,2.0)}if(!player.car)look(player.x,player.z,1.6);for(const p of NPCS)if(p.cross)look(p.x,p.z,1.5);
  for(const g of SIGNALS){const dx=g.x-c.x,dz=g.z-c.z,al=dx*fx+dz*fz;if(al>3&&al<16&&Math.abs(-dx*fz+dz*fx)<9){const axis=Math.abs(Math.cos(Math.atan2(fz,fx)-g.ang))>0.7?0:1;const s=signalState(g,axis,t);if(s!=='g')block=Math.min(block,al-4)}}
  const target=block<99?clamp((block-4)*1.4,0,c.cruise):c.cruise;c.vf+=clamp(target-c.vf,-9*dt,3.2*dt);
  c.s+=c.vf*dt*c.dir;if(c.s>r.L||c.s<0){const atEnd=c.s>r.L;const nx=nextRoad(r,atEnd,carOK);if(nx){c.ri=nx.ri;const r2=ROADS[nx.ri];c.dir=nx.end===0?1:-1;c.s=nx.end===0?0:r2.L}else{if(r.ow){placeTraffic(c,px,pz,110,260);continue}c.dir*=-1;c.s=clamp(c.s,0,r.L)}}
  const r2=ROADS[c.ri];const q=roadPos(r2,c.s,laneOff(r2)*c.dir);const k=Math.min(1,dt*5);c.x+=(q.x-c.x)*k;c.z+=(q.z-c.z)*k;const ty=Math.atan2(q.dx*c.dir,q.dz*c.dir);c.yaw+=wrapA(ty-c.yaw)*Math.min(1,dt*5);
  const yf=terr(c.x+fx*1.3,c.z+fz*1.3),yb=terr(c.x-fx*1.3,c.z-fz*1.3);c.pitch=-Math.atan2(yf-yb,2.6);syncCar(c)}}

