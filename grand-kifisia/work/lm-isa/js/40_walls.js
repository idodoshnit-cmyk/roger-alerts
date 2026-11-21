'use strict';
/* Grand Kifisia — garden walls, railings, hedges, ISA perimeter */
/* ---------- garden walls, railings, hedges ---------- */
function simplifyLine(ps,maxLen){if(ps.length<3)return ps;const o=[ps[0]];let a=ps[0];for(let i=1;i<ps.length-1;i++){const b=ps[i],c=ps[i+1];const a1=Math.atan2(b[1]-a[1],b[0]-a[0]),a2=Math.atan2(c[1]-b[1],c[0]-b[0]);if(Math.abs(wrapA(a1-a2))>0.06||Math.hypot(c[0]-a[0],c[1]-a[1])>maxLen){o.push(b);a=b}}o.push(ps[ps.length-1]);return o}
function buildWalls(){for(const w of MAP.walls){const st=w[0];const ps=simplifyLine(unp(w[1]),9);for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<0.2)continue;
  if(st!=='park'&&inShopZone((a[0]+b[0])/2,(a[1]+b[1])/2,10))continue;
  let nx=-dz/L,nz=dx/L;const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;if(lvl(mx+nx*1.2,mz+nz*1.2)<0.05&&lvl(mx-nx*1.2,mz-nz*1.2)>0.05){nx=-nx;nz=-nz}// n points to the street
  const ch=chunkAt(mx,mz);const ya=terr(a[0],a[1]),yb=terr(b[0],b[1]);const hv=hf(Math.floor(a[0]*7+a[1]*13));
  let wallH,wallT,wallC,railH,railT,railC;
  if(st==='park'){wallH=0.35;wallT=T.ashlar;wallC=C1;railH=1.15;railT=T.fence;railC=hexc('#244a35')}
  else if(st==='center'){wallH=0.7;wallT=T.ashlar;wallC=C1;railH=0.95;railT=T.rail;railC=hexc('#2e5a3f')}
  else if(st==='school'){wallH=1.0;wallT=T.concrete;wallC=C1;railH=1.2;railT=T.fence;railC=hexc('#2c3d33')}
  else{wallH=0.85+hv*0.4;wallT=hv<0.35?T.ashlar:T.plaster;wallC=wallT===T.plaster?hexc(['#f4f1ea','#efe6d6','#ece9e2'][Math.floor(hv*3)]):C1;railH=hv<0.8?0.8:0;railT=T.rail;railC=hexc(hv<0.5?'#25302b':'#1d1f22')}
  const O=ch.o,th=0.22,ox=-nx*th,oz=-nz*th;
  O.wall(a[0],a[1],b[0],b[1],ya-0.3,yb-0.3,ya+wallH,yb+wallH,nx,nz,0,L/2.5,0,(wallH+0.3)/2.5,wallC,RECT[wallT],0);
  O.wall(b[0]+ox,b[1]+oz,a[0]+ox,a[1]+oz,yb-0.3,ya-0.3,yb+wallH,ya+wallH,-nx,-nz,0,L/2.5,0,(wallH+0.3)/2.5,shade(wallC,0.9),RECT[wallT],0);
  O.quad([a[0],ya+wallH,a[1]],[a[0]+ox,ya+wallH,a[1]+oz],[b[0]+ox,yb+wallH,b[1]+oz],[b[0],yb+wallH,b[1]],[0,0],[0,0.1],[L/2,0.1],[L/2,0],hexc('#e9e6df'),RECT[T.trim],0);
  if(railH>0)ch.cut.wall(a[0]+ox/2,a[1]+oz/2,b[0]+ox/2,b[1]+oz/2,ya+wallH,yb+wallH,ya+wallH+railH,yb+wallH+railH,nx,nz,0,L/1.1,0,1,railC,RECT[railT],0);
  if(st==='res'&&hv>0.25){const hh=1.4+hv*1.2,hx=-nx*0.7,hz=-nz*0.7;const hc=shade(C1,0.85+hv*0.2);O.wall(a[0]+hx,a[1]+hz,b[0]+hx,b[1]+hz,ya,yb,ya+hh,yb+hh,nx,nz,0,L/1.5,0,hh/1.5,hc,RECT[T.hedge],0);O.hq([a[0]+hx,ya+hh,a[1]+hz],[b[0]+hx,yb+hh,b[1]+hz],[b[0]+hx*1.9,yb+hh,b[1]+hz*1.9],[a[0]+hx*1.9,ya+hh,a[1]+hz*1.9],[0,0],[L/1.5,0],[L/1.5,0.4],[0,0.4],shade(hc,1.05),RECT[T.hedge],0)}
  if(st!=='park')O.box(a[0]+ox/2,ya+(wallH+railH)/2+0.05,a[1]+oz/2,0.38,wallH+railH+0.1,0.38,Math.atan2(dx,dz),st==='res'&&wallT===T.plaster?wallC:C1,RECT[st==='res'&&wallT===T.plaster?T.plaster:T.ashlar],0.5);
  addSeg(a[0],a[1],b[0],b[1],'w')}}}

/* ---------- ISA: locked perimeter fence, gate, floodlights ---------- */
const EXTRA={lamp2:[]};
function buildISA(){const ps=unp(MAP.isa.poly);ISA.poly=ps;const gate=MAP.isa.gate;
  for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const steps=Math.max(1,Math.ceil(L/3));
    for(let k=0;k<steps;k++){const t0=k/steps,t1=(k+1)/steps;const ax=lerp(a[0],b[0],t0),az=lerp(a[1],b[1],t0),bx=lerp(a[0],b[0],t1),bz=lerp(a[1],b[1],t1);const ch=chunkAt(ax,az);const ya=terr(ax,az),yb=terr(bx,bz);
      const isGate=Math.hypot((ax+bx)/2-gate[0],(az+bz)/2-gate[1])<3.2;ch.cut.wall(ax,az,bx,bz,ya,yb,ya+2.4,yb+2.4,0,0,0,(L/steps)/1.2,0,1,hexc(isGate?'#1d1f22':'#2b5a3f'),RECT[isGate?T.rail:T.fence],0);
      ch.o.cyl(ax,ya,az,0.05,0.05,2.5,6,hexc(isGate?'#1d1f22':'#2b5a3f'),RECT[T.metal],true)}
    addSeg(a[0],a[1],b[0],b[1],'f')}
  const g=chunkAt(gate[0],gate[1]);const gy=terr(gate[0],gate[1]);const c=ps.reduce((s,p)=>[s[0]+p[0]/ps.length,s[1]+p[1]/ps.length],[0,0]);const dx=c[0]-gate[0],dz=c[1]-gate[1],l=Math.hypot(dx,dz)||1;
  g.o.box(gate[0]+dx/l*4,gy+1.3,gate[1]+dz/l*4,2.2,2.6,2.2,Math.atan2(dx,dz),hexc('#e2ddd2'),RECT[T.plain]);
  const sl=newSlot('INTERNATIONAL SCHOOL OF ATHENS','#0d2c5a','#ffffff','plain');if(sl)signAt(g,gate[0]-dz/l*3-dx/l*0.2,gy+2.2,gate[1]+dx/l*3-dz/l*0.2,-dx/l,-dz/l,3.6,0.9,null,1,sl);
  for(const p of MAP.pitches)if(pip(ps,p[0],p[1])){EXTRA.lamp2.push([p[0]+Math.cos(p[4])*p[2]*0.55,p[1]+Math.sin(p[4])*p[2]*0.55]);EXTRA.lamp2.push([p[0]-Math.cos(p[4])*p[2]*0.55,p[1]-Math.sin(p[4])*p[2]*0.55])}}

