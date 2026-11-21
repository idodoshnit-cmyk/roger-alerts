'use strict';
/* Grand Kifisia — garden walls, railings, hedges, bougainvillea, mapped gates, ISA perimeter (agent: streets; see docs/STREETS_IMPL.md) */
/* bougainvillea: painted alpha-cut layer (magenta bract clusters among dark leaves), draped over some villa walls as in every Kifisia street */
defTile('bougain',(g,S)=>{let sd=7;const r=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
  for(let k=0;k<260;k++){const x=r()*S,y=Math.pow(r(),0.7)*S,a=r()*TAU;g.save();g.translate(x,y);g.rotate(a);g.fillStyle=['#2f5a22','#3c6b2a','#24461b','#4a7a30'][k&3];g.beginPath();g.ellipse(0,0,5+r()*3,2.6+r()*1.4,0,0,TAU);g.fill();g.restore()}
  for(let k=0;k<170;k++){const x=r()*S,y=Math.pow(r(),0.85)*S;if(r()<0.25&&y>S*0.8)continue;const col=['#c2187a','#d63a8f','#e055a5','#b0126c','#ea6db3'][Math.floor(r()*5)];
    for(let b=0;b<3;b++){const a=b/3*TAU+r()*0.5;g.save();g.translate(x+Math.cos(a)*2.5,y+Math.sin(a)*2.5);g.rotate(a);g.fillStyle=col;g.beginPath();g.ellipse(0,0,4.2,3,0,0,TAU);g.fill();g.restore()}}
},{cut:true,spec:.02,shin:10,transl:.5});
/* ---------- garden walls, railings, hedges ---------- */
function simplifyLine(ps,maxLen){if(ps.length<3)return ps;const o=[ps[0]];let a=ps[0];for(let i=1;i<ps.length-1;i++){const b=ps[i],c=ps[i+1];const a1=Math.atan2(b[1]-a[1],b[0]-a[0]),a2=Math.atan2(c[1]-b[1],c[0]-b[0]);if(Math.abs(wrapA(a1-a2))>0.06||Math.hypot(c[0]-a[0],c[1]-a[1])>maxLen){o.push(b);a=b}}o.push(ps[ps.length-1]);return o}
function buildWalls(){buildGates();buildParkHedges();try{buildVerges()}catch(e){console.warn('verges',e)}for(const w of MAP.walls){const st=w[0];const ps=simplifyLine(unp(w[1]),9);for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<0.2)continue;
  if(st!=='park'&&inShopZone((a[0]+b[0])/2,(a[1]+b[1])/2,10))continue;
  let nx=-dz/L,nz=dx/L;const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;if(lvl(mx+nx*1.2,mz+nz*1.2)<0.05&&lvl(mx-nx*1.2,mz-nz*1.2)>0.05){nx=-nx;nz=-nz}// n points to the street
  const ch=chunkAt(mx,mz);const ya=terr(a[0],a[1]),yb=terr(b[0],b[1]);const hv=hf(Math.floor(a[0]*7+a[1]*13));
  let wallH,wallT,wallC,railH,railT,railC;
  if(st==='park'){wallH=0.35;wallT=T.ashlar;wallC=C1;railH=1.15;railT=T.fence;railC=hexc('#244a35')}
  else if(st==='center'){wallH=0.7;wallT=T.ashlar;wallC=C1;railH=0.95;railT=T.rail;railC=hexc('#2e5a3f')}
  else if(st==='school'){wallH=1.0;wallT=T.concrete;wallC=C1;railH=1.2;railT=T.fence;railC=hexc('#2c3d33')}
  else{wallH=0.85+hv*0.4;wallT=hv<0.35?T.ashlar:T.plaster;wallC=wallT===T.plaster?hexc(['#f4f1ea','#efe6d6','#ece9e2'][Math.floor(hv*3)]):C1;railH=hv<0.8?0.8:0;railT=T.rail;railC=hexc(hv<0.5?'#25302b':'#1d1f22')}
  let wsty=st==='res'||st==='center'?segWallStyle(mx,mz):null,hedgeAlways=false;
  if(wsty==='garden_green_bars'){wallH=0.75;wallT=T.rubble||T.ashlar;wallC=hexc('#d8d2c4');railH=1.1;railT=T.rail;railC=hexc('#2f5d3a');hedgeAlways=true}
  else if(wsty==='garden_white_bars'){wallH=0.6;wallT=T.plaster;wallC=hexc('#e6dcc6');railH=1.0;railT=T.rail;railC=hexc('#e9e6df')}
  else if(wsty==='rubble_wall'){wallH=1.05;wallT=T.rubble||T.ashlar;wallC=hexc('#d9d4c8');railH=0;hedgeAlways=true}
  const O=ch.o,th=0.22,ox=-nx*th,oz=-nz*th;
  O.wall(a[0],a[1],b[0],b[1],ya-0.3,yb-0.3,ya+wallH,yb+wallH,nx,nz,0,L/2.5,0,(wallH+0.3)/2.5,wallC,RECT[wallT],0);
  O.wall(b[0]+ox,b[1]+oz,a[0]+ox,a[1]+oz,yb-0.3,ya-0.3,yb+wallH,ya+wallH,-nx,-nz,0,L/2.5,0,(wallH+0.3)/2.5,shade(wallC,0.9),RECT[wallT],0);
  O.quad([a[0],ya+wallH,a[1]],[a[0]+ox,ya+wallH,a[1]+oz],[b[0]+ox,yb+wallH,b[1]+oz],[b[0],yb+wallH,b[1]],[0,0],[0,0.1],[L/2,0.1],[L/2,0],hexc('#e9e6df'),RECT[T.trim],0);
  if(railH>0)ch.cut.wall(a[0]+ox/2,a[1]+oz/2,b[0]+ox/2,b[1]+oz/2,ya+wallH,yb+wallH,ya+wallH+railH,yb+wallH+railH,nx,nz,0,L/1.1,0,1,railC,RECT[railT],0);
  if((st==='res'&&hv>0.25)||hedgeAlways){const hh=1.4+hv*1.2,hx=-nx*0.7,hz=-nz*0.7;const hc=shade(C1,0.85+hv*0.2);O.wall(a[0]+hx,a[1]+hz,b[0]+hx,b[1]+hz,ya,yb,ya+hh,yb+hh,nx,nz,0,L/1.5,0,hh/1.5,hc,RECT[T.hedge],0);O.hq([a[0]+hx,ya+hh,a[1]+hz],[b[0]+hx,yb+hh,b[1]+hz],[b[0]+hx*1.9,yb+hh,b[1]+hz*1.9],[a[0]+hx*1.9,ya+hh,a[1]+hz*1.9],[0,0],[L/1.5,0],[L/1.5,0.4],[0,0.4],shade(hc,1.05),RECT[T.hedge],0)}
  if(st==='res'&&L>2.5&&hf(Math.floor(a[0]*3+a[1]*5))<0.16){const top=wallH+railH,dr=0.9+hv*0.9,fx=nx*0.06,fz=nz*0.06,C=ch.cut;// bougainvillea spilling over the street face and the top
    C.wall(a[0]+fx,a[1]+fz,b[0]+fx,b[1]+fz,ya+top-dr,yb+top-dr,ya+top+0.35,yb+top+0.35,nx,nz,0,L/1.4,0,(dr+0.35)/1.4,C1,RECT[T.bougain],0);
    C.quad([a[0]+fx,ya+top+0.3,a[1]+fz],[b[0]+fx,yb+top+0.3,b[1]+fz],[b[0]+ox*2.5,yb+top+0.75,b[1]+oz*2.5],[a[0]+ox*2.5,ya+top+0.75,a[1]+oz*2.5],[0,0],[L/1.4,0],[L/1.4,0.6],[0,0.6],C1,RECT[T.bougain],0)}
  if(wsty==='garden_green_bars'&&L>4.5){const np=Math.floor(L/3.5);for(let k=1;k<np;k++){const t=k/np,px=a[0]+dx*t+ox/2,pz=a[1]+dz*t+oz/2,py=lerp(ya,yb,t);O.box(px,py+(wallH+railH)/2+0.05,pz,0.42,wallH+railH+0.1,0.42,Math.atan2(dx,dz),wallC,RECT[wallT],0.5);O.box(px,py+wallH+railH+0.13,pz,0.5,0.06,0.5,Math.atan2(dx,dz),hexc('#ece8de'),RECT[T.marble],0)}}
  if(st!=='park')O.box(a[0]+ox/2,ya+(wallH+railH)/2+0.05,a[1]+oz/2,0.38,wallH+railH+0.1,0.38,Math.atan2(dx,dz),st==='res'&&wallT===T.plaster?wallC:C1,RECT[st==='res'&&wallT===T.plaster?T.plaster:T.ashlar],0.5);
  addSeg(a[0],a[1],b[0],b[1],'w')}}}

/* wall/railing style per street segment from the research photos (streets.json styles.railings; GAPS_STREETS §2, §9.1):
   Kassaveti east (r16): north = garden_green_bars (stone plinth + piers + dark-green bars + hedge), south = garden_white_bars (beige wall + white bars);
   Kolokotroni (r17): north = rubble_wall with hedge. Side is taken from the segment line (game north = -z). */
const SEGWALL={kassaveti_e:{north:'garden_green_bars',south:'garden_white_bars'},kolokotroni_1:{north:'rubble_wall'}};
let _segw=null;
function segWallStyle(x,z){if(!_segw){_segw=[];if(typeof STREETS!=='undefined')for(const n in STREETS){const d=STREETS[n].data;if(d&&d.segments)for(const g of d.segments)if(SEGWALL[g.id]&&g.ax!=null)_segw.push({g,st:SEGWALL[g.id]})}}
  for(const o of _segw){const g=o.g,dx=g.bx-g.ax,dz=g.bz-g.az,L2=dx*dx+dz*dz||1,u=((x-g.ax)*dx+(z-g.az)*dz)/L2;if(u<0||u>1)continue;const L=Math.sqrt(L2),t=((x-g.ax)*-dz+(z-g.az)*dx)/L;if(Math.abs(t)>24)continue;
    // +t is along (-dz,dx); that normal points to +z (south) when dx>0
    const south=(t>0)===(dx>0);const st=south?o.st.south:o.st.north;if(st)return st}return null}

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


/* mapped gates (map v3 props.gate [x,z,barrier,ang,widthM,access,id]): two stone/plaster pillars and wrought-iron leaves; public gates stand open, private ones are closed */
function buildGates(){const G=(MAP.props&&MAP.props.gate)||[];for(const gt of G){const x=gt[0]/10,z=gt[1]/10,w=clamp(+gt[4]||3,1,8),priv=/private|no/.test(gt[5]||'');let ux=Math.cos(gt[3]||0),uz=Math.sin(gt[3]||0);
    // align with the nearest mapped wall/fence line when there is one within 3 m
    let bd=3;for(const wl of MAP.walls){const ps=unp(wl[1]);for(let i=0;i<ps.length-1;i++){const p=ps[i],q=ps[i+1],dx=q[0]-p[0],dz=q[1]-p[1],L2=dx*dx+dz*dz||1,u=clamp(((x-p[0])*dx+(z-p[1])*dz)/L2,0,1),d=Math.hypot(x-p[0]-dx*u,z-p[1]-dz*u);if(d<bd){bd=d;const l=Math.sqrt(L2);ux=dx/l;uz=dz/l}}}
    const ch=chunkAt(x,z),y=terr(x,z),stone=hexc('#e2dccf');placed('gate',x,z,gt[2]||'gate',gt[6]||'map.props.gate');
    for(const sd of[-1,1]){const px=x+ux*sd*(w/2+0.22),pz=z+uz*sd*(w/2+0.22);ch.o.box(px,y+0.95,pz,0.45,1.9+0.3,0.45,Math.atan2(ux,uz),stone,RECT[T.ashlar],0);ch.o.box(px,y+2.12,pz,0.55,0.12,0.55,Math.atan2(ux,uz),hexc('#ece8de'),RECT[T.marble],0);addBoxC(px,pz,0.24,'w')}
    const lw=w/2,col=hexc('#1d2420');for(const sd of[-1,1]){const hx=x+ux*sd*w/2,hz=z+uz*sd*w/2;const op=priv?0:1.2;const dx=-ux*sd,dz=-uz*sd,ca=Math.cos(op),sa=Math.sin(op),nx=-uz,nz=ux;
      const ex=hx+(dx*ca+nx*sa)*lw,ez=hz+(dz*ca+nz*sa)*lw;ch.cut.wall(hx,hz,ex,ez,y+0.05,y+0.05,y+1.75,y+1.75,0,0,0,lw/1.1,0,1,col,RECT[T.rail],0);if(priv)addSeg(hx,hz,ex,ez,'f')}}}

/* Alsos: the straight walks are edged with clipped box hedges 0.5-0.8 m (research places.json alsos, aerial r05); gaps where walks meet */
function buildParkHedges(){if(typeof LM!=='undefined'&&LM.list&&LM.list.some(l=>l.id==='park'))return;/* lm-park (89f_lm_park.js) models the grove itself */const ai=(MAP.area_tags||[]).findIndex(t=>t&&/Άλσος Κηφισιάς/.test(t.name||''));if(ai<0)return;const poly=unp(MAP.areas[ai][1][0]);
  const ends=[];for(const r of ROADS)if(r.ty>=6&&r.ty<=8){ends.push(r.ps[0],r.ps[r.ps.length-1])}
  for(const r of ROADS){if(r.ty<6||r.ty>8)continue;const ps=r.ps;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;if(!pip(poly,mx,mz))continue;const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<3)continue;
    const ux=dx/L,uz=dz/L,nx=-uz,nz=ux,off=(r.w||3)/2+0.35;for(const sd of[-1,1]){let s0=0,s1=L;for(const e of ends){const t=(e[0]-a[0])*ux+(e[1]-a[1])*uz,dd=Math.abs((e[0]-a[0])*nx+(e[1]-a[1])*nz);if(dd<off+3){if(t>-3&&t<2.5)s0=Math.max(s0,t+2.5);if(t>L-2.5&&t<L+3)s1=Math.min(s1,t-2.5)}}
      if(s1-s0<1.5)continue;const A=[a[0]+ux*s0+nx*off*sd,a[1]+uz*s0+nz*off*sd],B=[a[0]+ux*s1+nx*off*sd,a[1]+uz*s1+nz*off*sd],ch=chunkAt(A[0],A[1]).o,ya=terr(A[0],A[1]),yb=terr(B[0],B[1]),h=0.65,w=0.25;
      for(const k of[-1,1])ch.wall(A[0]+nx*w*k,A[1]+nz*w*k,B[0]+nx*w*k,B[1]+nz*w*k,ya-0.05,yb-0.05,ya+h,yb+h,nx*k,nz*k,0,(s1-s0)/1.5,0,h/1.5,hexc('#cfe0b0'),RECT[T.hedge],0);
      ch.hq([A[0]-nx*w,ya+h,A[1]-nz*w],[B[0]-nx*w,yb+h,B[1]-nz*w],[B[0]+nx*w,yb+h,B[1]+nz*w],[A[0]+nx*w,ya+h,A[1]+nz*w],[0,0],[(s1-s0)/1.5,0],[(s1-s0)/1.5,0.33],[0,0.33],hexc('#d8e8b8'),RECT[T.hedge],0);addSeg(A[0],A[1],B[0],B[1],'w')}}}}

/* planted verges of the villa avenues (streets.json Othonos crossSection, photo r15): east of Kifisias Ave a 1.4 m earth verge with shrubs behind the kerb on the
   SOUTH side, fenced from the road by a low dark-green lattice railing (styles.railings.green_lattice_low: 0.8 m, posts with pointed caps every 2 m, diamond mesh);
   a narrower verge with shrubs on the north side in front of the 1.8 m footway. Openings at junctions, crossings, driveways and gates. */
const VERGES={'Όθωνος':{x0:-12,south:{w:1.4,rail:true},north:{w:0.8,rail:false}}};
function buildVerges(){if(typeof roadPoint!=='function')return;const sty=(typeof STREETS_JSON!=='undefined'&&STREETS_JSON&&STREETS_JSON.styles&&STREETS_JSON.styles.railings&&STREETS_JSON.styles.railings.green_lattice_low)||{};
  const RC=hexc(/^#[0-9a-f]{6}$/i.test(sty.colour||'')?sty.colour:'#1f3a2c'),RH=sty.heightM||0.8,MR=RECT[T.metal],soil=hexc('#8a7a62');let H=7771;const rnd=()=>{H=(H*16807)%2147483647;return H/2147483647};
  const blocked=(x,z,d)=>{for(const w of MAP.driveways||[])if(Math.hypot(w[0]/10-x,w[1]/10-z)<d+(w[3]||3)/2)return true;for(const g of (MAP.props&&MAP.props.gate)||[])if(Math.hypot(g[0]/10-x,g[1]/10-z)<d+(g[4]||2)/2)return true;return false};
  let n=0;for(const r of ROADS){const V=VERGES[r.name];if(!V||!r.fr||r.ty>5||(r.sw||0)<1.6)continue;const hw=r.w/2,L=r.fr.L;
    for(let s=1;s<L-1;s+=2){const c=roadPoint(r,s,0),c2=roadPoint(r,s+2,0);if(c[0]<V.x0||c2[0]<V.x0)continue;if(!jclear(r,s+1,4)||!xclear(r,s+1,3))continue;
      for(const sd of[-1,1]){const kp=roadPoint(r,s+1,sd*(hw+1));const south=kp[2]>c[2];const cfg=south?V.south:V.north;if(!cfg)continue;const vw=Math.min(cfg.w,r.sw-0.5);if(vw<0.5)continue;
        const t0=sd*(hw+0.2),t1=sd*(hw+0.2+vw),tm=(t0+t1)/2,m=roadPoint(r,s+1,tm);if(blocked(m[0],m[2],1.2))continue;if(lvl(m[0],m[2])<0.05)continue;// must be on the raised footway
        gdecal(m[0],m[2],m[3],2.0,vw,T.soil,soil,0.012);
        const ch=chunkAt(m[0],m[2]).o;
        // shrub clumps (box/pittosporum/lantana look): 1–2 squashed spheres with the hedge photo texture, kept off tree trunks and lamp posts
        const k=1+(rnd()<0.6?1:0);for(let i=0;i<k;i++){const ss=s+0.4+rnd()*1.2,tt=tm+(rnd()-0.5)*(vw-0.5)*0.6,p=roadPoint(r,ss,tt);if(typeof collide==='function'&&collide({x:p[0],z:p[2]},0.45,null))continue;
          const rad=0.32+rnd()*0.3,y=groundY(p[0],p[2]);ball(ch,p[0],y+rad*0.55,p[2],rad,shade(hexc('#7c9a52'),0.75+rnd()*0.35),RECT[T.hedge],0,1,0.85+rnd()*0.4)}
        if(cfg.rail){const a=roadPoint(r,s,sd*(hw+0.32)),b=roadPoint(r,s+2,sd*(hw+0.32)),ya=groundY(a[0],a[2]),yb=groundY(b[0],b[2]);
          ch.box(a[0],ya+RH/2,a[2],0.05,RH,0.05,a[3],RC,MR);sqfrust(ch,a[0],a[2],ya+RH,ya+RH+0.09,0.07,0.0,RC,MR,0,a[3],0);
          rod(ch,[a[0],ya+RH-0.05,a[2]],[b[0],yb+RH-0.05,b[2]],0.035,RC,MR,0);rod(ch,[a[0],ya+0.1,a[2]],[b[0],yb+0.1,b[2]],0.035,RC,MR,0);
          chunkAt(a[0],a[2]).cut.wall(a[0],a[2],b[0],b[2],ya+0.1,yb+0.1,ya+RH-0.05,yb+RH-0.05,0,0,0,2/0.9,0,1,RC,RECT[T.fence],0);
          chunkAt(a[0],a[2]).cut.wall(b[0],b[2],a[0],a[2],yb+0.1,ya+0.1,yb+RH-0.05,ya+RH-0.05,0,0,0,2/0.9,0,1,RC,RECT[T.fence],0);
          addSeg(a[0],a[2],b[0],b[2],'f')}
        n++}}}
  if(n)placed('verge',-0,-235,'Othonos planted verges ('+n+' × 2 m)','streets.json Othonos crossSection + styles.railings.green_lattice_low');return n}
