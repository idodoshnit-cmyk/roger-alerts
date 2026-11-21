'use strict';
/* Grand Kifisia — railway, station platform, finalize chunks, chunk visibility */
/* ---------- rail, platform, canopy, station ---------- */
function buildRail(){const O=(x,z)=>chunkAt(x,z).o;const sl=[];
  for(const rr of MAP.rail){const ps=resample(unp(rr),3);for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;const nx=-dz/l,nz=dx/l;const o=O(a[0],a[1]);const Y=(x,z)=>terr(x,z);
    o.hq([a[0]-nx*1.7,Y(a[0],a[1])+0.12,a[1]-nz*1.7],[b[0]-nx*1.7,Y(b[0],b[1])+0.12,b[1]-nz*1.7],[b[0]+nx*1.7,Y(b[0],b[1])+0.12,b[1]+nz*1.7],[a[0]+nx*1.7,Y(a[0],a[1])+0.12,a[1]+nz*1.7],[a[0]/3,a[1]/3],[b[0]/3,b[1]/3],[b[0]/3+1,b[1]/3],[a[0]/3+1,a[1]/3],C1,RECT[T.ballast],0);
    for(const s of[-0.72,0.72]){const ax=a[0]+nx*s,az=a[1]+nz*s,bx=b[0]+nx*s,bz=b[1]+nz*s;o.hq([ax-nx*0.04,Y(a[0],a[1])+0.3,az-nz*0.04],[bx-nx*0.04,Y(b[0],b[1])+0.3,bz-nz*0.04],[bx+nx*0.04,Y(b[0],b[1])+0.3,bz+nz*0.04],[ax+nx*0.04,Y(a[0],a[1])+0.3,az+nz*0.04],[0,0],[1,0],[1,1],[0,1],hexc('#c9ccd0'),RECT[T.metalL],0);
      o.wall(ax,az,bx,bz,Y(a[0],a[1])+0.18,Y(b[0],b[1])+0.18,Y(a[0],a[1])+0.3,Y(b[0],b[1])+0.3,-nx*Math.sign(s),-nz*Math.sign(s),0,1,0,1,hexc('#5f5248'),RECT[T.metal],0)}
    for(let s=0;s<l;s+=0.7){const x=a[0]+dx*s/l,z=a[1]+dz*s/l;sl.push([x,terr(x,z)+0.16,z,Math.atan2(dx,dz)+Math.PI/2])}}}
  // concrete monoblock sleepers every 0.7 m (Line 1), drawn through a distance pool; third rail with its cover board on the outer side of each track
  const sg=new GB();sg.box(0,0,0,2.5,0.12,0.24,0,hexc('#9a9690'),RECT[T.concrete]);for(const sx of[-0.72,0.72])sg.box(sx,0.075,0,0.16,0.03,0.2,0,hexc('#3a3c3f'),RECT[T.metal]);
  if(typeof lodPool==='function')lodPool(sl.map(p=>[p[0],p[1],p[2],p[3],1,1,1]),[{geos:[[sg.build(),MAT.atlas]],d:0,cast:false}]);else instanced(sg.build(),MAT.atlas,sl,false);
  for(const rr of MAP.rail){const ps=resample(unp(rr),3);for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;const nx=-dz/l,nz=dx/l,o=O(a[0],a[1]);const ya=terr(a[0],a[1]),yb=terr(b[0],b[1]),k=1.45;
    const A=[a[0]+nx*k,a[1]+nz*k],B=[b[0]+nx*k,b[1]+nz*k];o.box((A[0]+B[0])/2,(ya+yb)/2+0.28,(A[1]+B[1])/2,0.08,0.1,l,Math.atan2(dx,dz),hexc('#8b8f93'),RECT[T.metalL]);
    o.box((A[0]+B[0])/2+nx*0.02,(ya+yb)/2+0.37,(A[1]+B[1])/2+nz*0.02,0.26,0.03,l,Math.atan2(dx,dz),hexc('#c8b98f'),RECT[T.wood])}}
  // train path + island platform aligned to it
  const tp=unp(MAP.train);TRAINPATH={ps:tp,cum:cumlen(tp)};const P0=0,P1=96;const pl=[],pr=[];for(let s=P0;s<=P1;s+=4){const p=atLen(tp,TRAINPATH.cum,s);const fx=Math.sin(p[2]),fz=Math.cos(p[2]);const rx=-fz,rz=fx;pl.push([p[0]+rx*1.55,p[1]+rz*1.55]);pr.push([p[0]+rx*8.6,p[1]+rz*8.6])}
  // pick the side away from the other tracks: test which side has the OSM platform
  let side=1;const osmP=MAP.areas.find(a=>a[0]==='platform');if(osmP){const op=unp(osmP[1][0]);const mid=atLen(tp,TRAINPATH.cum,48);const fx=Math.sin(mid[2]),fz=Math.cos(mid[2]);const cx=op.reduce((s,p)=>s+p[0],0)/op.length,cz=op.reduce((s,p)=>s+p[1],0)/op.length;if((cx-mid[0])*(-fz)+(cz-mid[1])*fx<0)side=-1}
  if(side<0){pl.length=0;pr.length=0;for(let s=P0;s<=P1;s+=4){const p=atLen(tp,TRAINPATH.cum,s);const fx=Math.sin(p[2]),fz=Math.cos(p[2]);const rx=fz,rz=-fx;pl.push([p[0]+rx*1.55,p[1]+rz*1.55]);pr.push([p[0]+rx*8.6,p[1]+rz*8.6])}}
  STATION.platform=pl.concat(pr.slice().reverse());STATION.side=side;
  const ramp0=pl[0],ramp1=pr[0];const back=atLen(tp,TRAINPATH.cum,-1);const p0=atLen(tp,TRAINPATH.cum,0);const fx=Math.sin(p0[2]),fz=Math.cos(p0[2]);
  STATION.ramp=[[(ramp0[0]+ramp1[0])/2,(ramp0[1]+ramp1[1])/2],[(ramp0[0]+ramp1[0])/2-fx*9,(ramp0[1]+ramp1[1])/2-fz*9],[ramp0,ramp1,[ramp1[0]-fx*9,ramp1[1]-fz*9],[ramp0[0]-fx*9,ramp0[1]-fz*9]]];
  STATION.mid=atLen(tp,TRAINPATH.cum,50);STATION.edgeOff=1.55*side;
}
function buildPlatform(){if(!STATION.platform)return;const ring=STATION.platform;const y0=0.65;groundPoly([ring],y0,T.platf,2,C1,5);const half=ring.length/2;
  // tactile strip along the train edge + platform edge wall
  const pl=ring.slice(0,half);for(let i=0;i<pl.length-1;i++){const a=pl[i],b=pl[i+1];const ch=chunkAt(a[0],a[1]).o;const ya=terr(a[0],a[1])+y0,yb=terr(b[0],b[1])+y0;const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);const nx=-dz/l*STATION.side,nz=dx/l*STATION.side;
    ch.hq([a[0]-nx*0.0,ya+0.01,a[1]-nz*0.0],[b[0],yb+0.01,b[1]],[b[0]-nx*-0.6,yb+0.01,b[1]-nz*-0.6],[a[0]-nx*-0.6,ya+0.01,a[1]-nz*-0.6],[0,0],[l/1.2,0],[l/1.2,0.5],[0,0.5],C1,RECT[T.tactile],0);
    ch.wall(a[0],a[1],b[0],b[1],ya-0.75,yb-0.75,ya,yb,-nx,-nz,0,l/3,0,0.25,C1,RECT[T.concrete],0);addSeg(a[0],a[1],b[0],b[1],'f')}
  const pr=ring.slice(half).reverse();for(let i=0;i<pr.length-1;i++){const a=pr[i],b=pr[i+1];const ch=chunkAt(a[0],a[1]);const ya=terr(a[0],a[1])+y0,yb=terr(b[0],b[1])+y0;ch.cut.wall(a[0],a[1],b[0],b[1],ya,yb,ya+1.3,yb+1.3,0,0,0,(Math.hypot(b[0]-a[0],b[1]-a[1]))/1.2,0,1,hexc('#2b5a3f'),RECT[T.fence],0);addSeg(a[0],a[1],b[0],b[1],'f')}
  // green steel canopy (columns + roof panels) as in the photos
  const tp=TRAINPATH;for(let s=6;s<=90;s+=7.5){const p=atLen(tp.ps,tp.cum,s);const fx=Math.sin(p[2]),fz=Math.cos(p[2]);const rx=-fz*STATION.side,rz=fx*STATION.side;const cx=p[0]+rx*5.1,cz=p[1]+rz*5.1;const ch=chunkAt(cx,cz).o;const y=terr(cx,cz)+y0;
    ch.cyl(cx,y,cz,0.13,0.11,3.9,8,hexc('#2f6e4c'),RECT[T.metal],false);
    const q=atLen(tp.ps,tp.cum,s+7.5);const gx=Math.sin(q[2]),gz=Math.cos(q[2]);const qx=q[0]+(-gz*STATION.side)*5.1,qz=q[1]+(gx*STATION.side)*5.1;
    for(const sd of[-1,1]){const e0=[cx+rx*sd*4.4,cz+rz*sd*4.4],e1=[qx+(-gz*STATION.side)*sd*4.4,qz+(gx*STATION.side)*sd*4.4];const yc=y+3.9,ye=y+4.35;
      ch.hq([cx,yc,cz],[e0[0],ye,e0[1]],[e1[0],ye,e1[1]],[qx,yc,qz],[0,0],[0,1],[2,1],[2,0],C1,RECT[T.canopy],0);ch.hq([qx,yc-0.06,qz],[e1[0],ye-0.06,e1[1]],[e0[0],ye-0.06,e0[1]],[cx,yc-0.06,cz],[0,0],[0,1],[3,1],[3,0],hexc('#b98a5a'),RECT[T.wood],0,true)}
    if(s%15<1)chunkAt(cx,cz).detailPos=1}
  // benches and the departure board
  const mid=atLen(tp.ps,tp.cum,40);const fx=Math.sin(mid[2]),fz=Math.cos(mid[2]);const rx=-fz*STATION.side,rz=fx*STATION.side;const bx=mid[0]+rx*5.1,bz=mid[1]+rz*5.1;const ch=chunkAt(bx,bz);const y=terr(bx,bz)+y0;
  ch.o.box(bx,y+3.2,bz,0.1,0.6,0.1,0,hexc('#2f6e4c'),RECT[T.metal]);const brd=newSlot('3′','#0b1d4a','#ffb000','board');if(brd){signAt(ch,bx+fx*0.06,y+2.75,bz+fz*0.06,fx,fz,2.2,0.55,null,1,brd);signAt(ch,bx-fx*0.06,y+2.75,bz-fz*0.06,-fx,-fz,2.2,0.55,null,1,brd)}
  const tk=atLen(tp.ps,tp.cum,10);const tx=tk[0]+(-Math.cos(tk[2])*STATION.side)*7.2,tz=tk[1]+(Math.sin(tk[2])*STATION.side)*7.2;STATION.machine={x:tx,z:tz};const ty=terr(tx,tz)+y0;
  const ch2=chunkAt(tx,tz);ch2.o.box(tx,ty+0.85,tz,0.8,1.7,0.5,tk[2],hexc('#2f6e4c'),RECT[T.metal]);ch2.o.box(tx+Math.sin(tk[2])*0.26,ty+1.2,tz+Math.cos(tk[2])*0.26,0.6,0.5,0.02,tk[2],C1,RECT[T.ad],1);
  const vx=tk[0]+(-Math.cos(tk[2])*STATION.side)*4.2,vz=tk[1]+(Math.sin(tk[2])*STATION.side)*4.2;STATION.validator={x:vx,z:vz};ch2.o.box(vx,ty+0.6,vz,0.3,1.2,0.3,0,hexc('#ffb000'),RECT[T.white]);
  for(let s=20;s<=80;s+=20){const p=atLen(tp.ps,tp.cum,s);const ox=p[0]+(-Math.cos(p[2])*STATION.side)*6.6,oz=p[1]+(Math.sin(p[2])*STATION.side)*6.6;const c=chunkAt(ox,oz);const yy=terr(ox,oz)+y0;for(let k=0;k<3;k++)c.o.box(ox+Math.sin(p[2])*(k*0.15-0.15),yy+0.45,oz+Math.cos(p[2])*(k*0.15-0.15),0.11,0.05,1.8,p[2],hexc('#8a603c'),RECT[T.wood])}}

/* finalize: turn chunk builders into meshes */
function finalize(){for(const c of chunks.values()){if(c.o.size()){const m=new THREE.Mesh(c.o.build(),MAT.atlas);m.castShadow=true;m.receiveShadow=true;scene.add(m);c.meshes.push(m)}
  if(c.cut.size()){const m=new THREE.Mesh(c.cut.build(),MAT.cut);m.receiveShadow=true;scene.add(m);c.detail.push(m)}
  if(c.sg.size()){const m=new THREE.Mesh(c.sg.build(),MAT.signs);scene.add(m);c.detail.push(m)}c.o=c.cut=c.sg=null}}
function updateChunkVis(cx,cz){if(typeof updatePropLOD==='function')updatePropLOD(cx,cz);if(typeof updateTreeLOD==='function')updateTreeLOD(cx,cz);const d2=Math.pow(Q.dist+40,2),dd=Math.pow(Math.min(Q.dist,200),2);for(const c of chunks.values()){const dx=c.cx-cx,dz=c.cz-cz,d=dx*dx+dz*dz;const v=d<d2;for(const m of c.meshes)m.visible=v;const vd=d<dd;for(const m of c.detail)m.visible=vd}
  const td=Math.pow(Q.dist+60,2),sd=150*150,pd=Math.pow(Math.min(Q.dist,170)+60,2);for(const c of TREECH.values()){const dx=c.cx-cx,dz=c.cz-cz,d=dx*dx+dz*dz;const v=d<td;for(const m of c.detail){m.visible=v;m.castShadow=Q.sh>0&&d<sd}for(const m of c.props){m.visible=d<pd;m.castShadow=Q.sh>0&&d<sd&&m.userData.cast}}}

