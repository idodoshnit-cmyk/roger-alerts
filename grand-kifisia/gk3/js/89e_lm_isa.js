'use strict';
/* 89e_lm_isa.js — International School of Athens (ISA), Artemidos 42 & Xenias, Kefalari — hand-modelled landmark (owner: lm-isa).
   Main building = the listed former "Hotel Kokkoris" / "Olympos Pallas" (built 1923-26, listed monument 1992): three storeys on a raised
   lower-ground floor, symmetric neoclassical WEST facade on Artemidos (end bays + centre bay projecting), hipped roof of Byzantine tiles raised
   over the entrance axis into a semicircular tympanum, arched French doors on the ground floor, rectangular French windows with iron balconies
   above, horizontally rusticated ground floor, a veranda around the ground floor, pale cream plaster with white trim.
   Courts (OSM ways 1086751866/67), fences, gate and the rear school wing follow OSM + the school's own photos. Full notes, measurements,
   sources and what is inferred: docs/research/lm/isa.md.
   Interface for other modules:  ISALM = {built, GF, Yc, gate:[x,z], hoops:[{x,z,y}], court:{x,z,L,W,a}, frame:{O,E,I}}
   (GF = ground-floor/veranda level, Yc = court platform level, both absolute metres). The court platform and veranda heights are written into
   the level grid (LVL) so the player, the ball and the guard stand on them; hoops are pushed into HOOPS with isa:true for the "After Hours" mission. */
const ISALM={built:false,GF:0,Yc:0,gate:null,hoops:[],court:null,frame:null};
(function(){
if(typeof LM==='undefined')return;

/* ============================== painted material layers (registered at script load) ============================== */
const tl=(n,p,o)=>{try{return defTile(n,p,o)}catch(e){console.warn('lm-isa: tile '+n+' failed',e);return T.white}};
const FR='#f4f2ec';
function gFill(g,m,path,y0,y1,c0,c1){g.save();path(g);g.clip();pGrad(g,0,y0,240,y1-y0,c0,c1);g.restore();if(m){m.save();path(m);m.clip();m.fillStyle='#fff';m.fillRect(0,0,240,240);m.restore()}}
function bar(g,m,x,y,w,h){g.fillStyle=FR;g.fillRect(x,y,w,h);if(m){m.fillStyle='#000';m.fillRect(x,y,w,h)}}
/* French window: two glazed leaves (3 panes each) + transom light; the whole tile is the whole opening */
tl('isaWin',(g,S,m)=>{pRect(g,0,0,S,S,FR);const f=11,tr=Math.round(S*0.21);
  gFill(g,m,c=>{c.beginPath();c.rect(f,f,S-2*f,tr-f)},f,tr,'#7a848e','#4d555f');
  gFill(g,m,c=>{c.beginPath();c.rect(f,tr+8,S-2*f,S-f-tr-8)},tr,S,'#b9b2a2','#8e8676');
  g.globalAlpha=.35;pGrad(g,f,tr+8,(S-2*f)/2,S-f-tr-8,'#efe6d3','#cfc3ab',true);g.globalAlpha=1;
  bar(g,m,f,tr,S-2*f,8);bar(g,m,S/2-5,tr,10,S-tr);for(const k of[.47,.72])bar(g,m,f,S*k,S-2*f,5);
  g.fillStyle='rgba(30,26,22,.35)';g.fillRect(f,f,S-2*f,4);pRect(g,0,S-7,S,7,'#d9d5cb')},{nrm:'plaster',nrmK:.25,spec:.07,shin:50,glass:1,glassDark:.5,glowK:1.4});
/* arched French door: rectangle + semicircular fanlight in the top 22 % of the tile (UVs are mapped piecewise so any arch fits) */
const ARCH_FT=0.22;
tl('isaArch',(g,S,m)=>{const ft=S*ARCH_FT,f=10;pRect(g,0,0,S,S,FR);
  gFill(g,m,c=>{c.beginPath();c.ellipse(S/2,ft,S/2-f,ft-f*0.6,0,Math.PI,0);c.closePath()},0,ft,'#7a848e','#4d555f');
  g.strokeStyle=FR;g.lineWidth=5;m.strokeStyle='#000';m.lineWidth=5;for(let k=1;k<6;k++){const a=Math.PI+k*Math.PI/6;for(const c of[g,m]){c.beginPath();c.moveTo(S/2,ft);c.lineTo(S/2+Math.cos(a)*(S/2),ft+Math.sin(a)*ft);c.stroke()}}
  gFill(g,m,c=>{c.beginPath();c.rect(f,ft+7,S-2*f,S-f-ft-7)},ft,S,'#b5ae9e','#8a8272');
  bar(g,m,0,ft,S,7);bar(g,m,S/2-5,ft,10,S-ft);for(const k of[.5,.75])bar(g,m,f,S*k,S-2*f,5);pRect(g,0,S-7,S,7,'#d9d5cb')},{nrm:'plaster',nrmK:.25,spec:.07,shin:50,glass:1,glassDark:.5,glowK:1.4});
/* horizontally rusticated (pseudo-ashlar grooved) render of the ground floor: one tile = 1.8 m x 1.8 m, grooves every 0.45 m */
tl('isaRust',(g,S)=>{pBg(g,'plaster',S,null,0.9);for(let k=0;k<4;k++){const y=k*S/4;g.fillStyle='rgba(78,70,58,.42)';g.fillRect(0,y,S,3.2);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(0,y+3.2,S,1.4)}},{needs:['plaster'],nrm:'plaster',nrmRep:1.2,spec:.02,shin:8,macro:.25});
/* steel bar fence (cut-out, tint carrier): 1.2 m wide tile, bars every 10 cm, top/bottom rails */
tl('isaBars',(g,S)=>{const c='#e8e8e6',d='#b4b6b4';for(let x=4;x<S;x+=20){pRect(g,x,0,6,S,c);pRect(g,x+4.5,0,1.5,S,d)}pRect(g,0,8,S,9,c);pRect(g,0,S-18,S,9,c);pRect(g,0,15,S,2,d)},{cut:true,spec:.12,shin:30});
/* dark green windscreen fabric of the court fences (one tile = 2.5 m) */
tl('isaScreen',(g,S)=>{pRect(g,0,0,S,S,'#2d4936');g.globalAlpha=.22;for(let y=0;y<S;y+=3)pRect(g,0,y,S,1,'#18291d');for(let x=0;x<S;x+=3)pRect(g,x,0,1,S,'#466a50');g.globalAlpha=1;
  for(let x=10;x<S;x+=40){g.fillStyle='rgba(230,230,220,.55)';g.beginPath();g.arc(x,8,2.2,0,6.3);g.fill();g.beginPath();g.arc(x,S-8,2.2,0,6.3);g.fill()}pRect(g,0,0,S,4,'#1d3023');pRect(g,0,S-4,S,4,'#1d3023')},{spec:.03,shin:10});
/* artificial turf (one tile = 2 m) */
tl('isaTurf',(g,S)=>{pRect(g,0,0,S,S,'#4b8a3c');speck(g,3200,['#3c7631','#5a9c47','#447f36','#64a64f','#3a6e2f'],0.5,1.5,0.85);g.globalAlpha=.08;pRect(g,0,0,S/2,S,'#ffffff');g.globalAlpha=1},{spec:.035,shin:10,macro:.3});
/* acrylic sports surface (white, tinted by the vertex colour: red court, green run-off) */
tl('isaAcryl',(g,S)=>{pRect(g,0,0,S,S,'#f0f0f0');speck(g,3000,['#e2e2e2','#fbfbfb','#d6d6d6'],0.5,1.4,0.7)},{spec:.05,shin:24,macro:.25});
/* glass basketball backboard 1.8 x 1.05 m with the FIBA border and shooter's square */
tl('isaBoard',(g,S)=>{pRect(g,0,0,S,S,'#f5f5f3');const c='#d02a1e';pRect(g,0,0,S,11,c);pRect(g,0,S-11,S,11,c);pRect(g,0,0,7,S,c);pRect(g,S-7,0,7,S,c);
  pRect(g,80,103,80,11,c);pRect(g,80,195,80,11,c);pRect(g,80,103,7,103,c);pRect(g,153,103,7,103,c)},{spec:.12,shin:60});

/* ============================== small geometry helpers ============================== */
const hx=s=>{const n=parseInt(s.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
const COL={wall:hx('#efe8d2'),wallS:hx('#e6dec6'),trim:hx('#fbf9f3'),rust:hx('#ebe3cb'),roof:hx('#d6a58e'),iron:hx('#2b2c2e'),stone:hx('#cdbfa8'),
  annex:hx('#ede7d6'),deck:hx('#e8e1d2'),concrete:hx('#c9c6bf'),greenSurf:hx('#3f7552'),redSurf:hx('#b04a3c'),line:[0.97,0.97,0.95],post:hx('#2f4f3b'),
  gateG:hx('#a9b0b2'),galv:hx('#b9bec2'),glass:hx('#ffffff')};
let G,GC,GL=0;                          // opaque builder, cut-out builder, glow
const gl=()=>GL;
function Q(a,b,c,d,ua,ub,uc,ud,col,t,want){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  if(nx*want[0]+ny*want[1]+nz*want[2]<0)G.quad(d,c,b,a,ud,uc,ub,ua,col,RECT[t],gl());else G.quad(a,b,c,d,ua,ub,uc,ud,col,RECT[t],gl())}
function TRI(a,b,c,ua,ub,uc,col,t,want,B){B=B||G;const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  if(nx*want[0]+ny*want[1]+nz*want[2]<0)B.tri(a,c,b,ua,uc,ub,col,RECT[t],gl());else B.tri(a,b,c,ua,ub,uc,col,RECT[t],gl())}
/* a local frame on a straight wall line: origin O, unit E along it, I = inward (d > 0 goes into the building), N = outward */
function Frame(O,E,inward){const I=inward,N=[-I[0],-I[1]];const P=(u,d)=>[O[0]+E[0]*u+I[0]*d,O[1]+E[1]*u+I[1]*d];
  const F={O,E,I,N,P,
    /* vertical wall in the plane d, facing outward (or inward when back) ; UVs in metres x s */
    fw(u0,u1,d,y0,y1,col,t,s,back,B){if(u1-u0<1e-3||y1-y0<1e-3)return;s=s||1;const a=P(u0,d),b=P(u1,d),n=back?I:N;(B||G).wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,n[0],n[1],u0*s,u1*s,y0*s,y1*s,col,RECT[t],gl())},
    /* vertical wall across the facade at u, from d0 to d1, facing +E (sg=1) or -E (sg=-1) */
    sw(u,d0,d1,y0,y1,sg,col,t,s,B){if(Math.abs(d1-d0)<1e-3||y1-y0<1e-3)return;s=s||1;const a=P(u,d0),b=P(u,d1);(B||G).wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,E[0]*sg,E[1]*sg,d0*s,d1*s,y0*s,y1*s,col,RECT[t],gl())},
    /* railing / fence panel: u in units of uw metres, v = 0..1 over the height (for T.rail, T.isaBars, T.fence) */
    rw(u0,u1,d,y0,y1,col,t,uw,B){const a=P(u0,d),b=P(u1,d);(B||GC).wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,N[0],N[1],0,(u1-u0)/uw,0,1,col,RECT[t],0)},
    rs(u,d0,d1,y0,y1,sg,col,t,uw,B){const a=P(u,d0),b=P(u,d1);(B||GC).wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,E[0]*sg,E[1]*sg,0,Math.abs(d1-d0)/uw,0,1,col,RECT[t],0)},
    /* horizontal rectangle at y (down = facing down) */
    h(u0,u1,d0,d1,y,col,t,s,down){s=s||1;const a=P(u0,d0),b=P(u1,d0),c=P(u1,d1),d=P(u0,d1);Q([a[0],y,a[1]],[b[0],y,b[1]],[c[0],y,c[1]],[d[0],y,d[1]],[u0*s,d0*s],[u1*s,d0*s],[u1*s,d1*s],[u0*s,d1*s],col,t,down?[0,-1,0]:[0,1,0])},
    /* box in local coordinates (bottom face only when bot) */
    box(u0,u1,d0,d1,y0,y1,col,t,s,bot){F.fw(u0,u1,d0,y0,y1,col,t,s);F.fw(u0,u1,d1,y0,y1,col,t,s,true);F.sw(u0,d0,d1,y0,y1,-1,col,t,s);F.sw(u1,d0,d1,y0,y1,1,col,t,s);F.h(u0,u1,d0,d1,y1,col,t,s);if(bot)F.h(u0,u1,d0,d1,y0,col,t,s,true)},
    /* round medallion (rosette) on the facade plane d, centre (u,y) */
    disc(u,y,d,r,col){const n=10,c=P(u,d),cy=y;const pts=[];for(let k=0;k<=n;k++){const a=k/n*TAU;pts.push([u+Math.cos(a)*r,y+Math.sin(a)*r])}
      const want=[N[0],0,N[1]];for(let k=0;k<n;k++){const p0=P(pts[k][0],d),p1=P(pts[k+1][0],d);TRI([c[0],cy,c[1]],[p0[0],pts[k][1],p0[1]],[p1[0],pts[k+1][1],p1[1]],[0.5,0.5],[0,0],[1,0],col,TM.plasterW,want)}
      for(let k=0;k<n;k++){const p0=P(pts[k][0],d),p1=P(pts[k+1][0],d),q0=P(pts[k][0],d+0.07),q1=P(pts[k+1][0],d+0.07);const mx=(pts[k][0]+pts[k+1][0])/2-u,my=(pts[k][1]+pts[k+1][1])/2-y;
        Q([q0[0],pts[k][1],q0[1]],[q1[0],pts[k+1][1],q1[1]],[p1[0],pts[k+1][1],p1[1]],[p0[0],pts[k][1],p0[1]],[0,0],[1,0],[1,1],[0,1],shade(col,0.9),TM.plasterW,[E[0]*mx,my,E[1]*mx])}},
    /* one storey band of wall in plane d between u0..u1 and y0..y1, with openings [{c,w,yb,yt,arch,t}] (yt = apex for arches) */
    band(u0,u1,d,y0,y1,ops,col,t,s,rd){rd=rd===undefined?0.3:rd;let cur=u0;ops=ops.slice().sort((p,q)=>p.c-q.c);
      for(const o of ops){const a=o.c-o.w/2,b=o.c+o.w/2;if(a<cur-0.01||b>u1+0.01)continue;F.fw(cur,a,d,y0,y1,col,t,s);F.fw(a,b,d,y0,o.yb,col,t,s);
        const r=o.w/2,ys=o.arch?o.yt-r:o.yt;
        if(!o.arch)F.fw(a,b,d,o.yt,y1,col,t,s);
        else{const K=8;for(let k=0;k<K;k++){const t0=Math.PI-Math.PI*k/K,t1=Math.PI-Math.PI*(k+1)/K;const u_0=o.c+Math.cos(t0)*r,u_1=o.c+Math.cos(t1)*r,y_0=ys+Math.sin(t0)*r,y_1=ys+Math.sin(t1)*r;
          const p0=P(u_0,d),p1=P(u_1,d);Q([p0[0],y_0,p0[1]],[p1[0],y_1,p1[1]],[p1[0],y1,p1[1]],[p0[0],y1,p0[1]],[u_0*s,y_0*s],[u_1*s,y_1*s],[u_1*s,y1*s],[u_0*s,y1*s],col,t,[N[0],0,N[1]])}}
        F.opening(o,d,rd,col);cur=b}
      F.fw(cur,u1,d,y0,y1,col,t,s)},
    /* reveals + glazing of one opening */
    opening(o,d,rd,col){const a=o.c-o.w/2,b=o.c+o.w/2,r=o.w/2,ys=o.arch?o.yt-r:o.yt,rc=shade(col,0.86),wt=o.t||(o.arch?T.isaArch:T.isaWin),gc=o.gc||COL.glass;
      F.sw(a,d,d+rd,o.yb,ys,1,rc,TM.plasterW,1);F.sw(b,d,d+rd,o.yb,ys,-1,rc,TM.plasterW,1);F.h(a,b,d,d+rd,o.yb,shade(rc,1.05),TM.marbleW,1);
      const gd=d+rd;if(!o.arch){F.h(a,b,d,d+rd,o.yt,rc,TM.plasterW,1,true);const p0=P(a,gd),p1=P(b,gd);Q([p0[0],o.yb,p0[1]],[p1[0],o.yb,p1[1]],[p1[0],o.yt,p1[1]],[p0[0],o.yt,p0[1]],[0,0],[1,0],[1,1],[0,1],gc,wt,[N[0],0,N[1]]);return}
      const v1=1-ARCH_FT;{const p0=P(a,gd),p1=P(b,gd);Q([p0[0],o.yb,p0[1]],[p1[0],o.yb,p1[1]],[p1[0],ys,p1[1]],[p0[0],ys,p0[1]],[0,0],[1,0],[1,v1],[0,v1],gc,wt,[N[0],0,N[1]])}
      const K=8,cc=P(o.c,gd);for(let k=0;k<K;k++){const t0=Math.PI-Math.PI*k/K,t1=Math.PI-Math.PI*(k+1)/K;const u_0=o.c+Math.cos(t0)*r,u_1=o.c+Math.cos(t1)*r,y_0=ys+Math.sin(t0)*r,y_1=ys+Math.sin(t1)*r;
        const p0=P(u_0,gd),p1=P(u_1,gd);TRI([cc[0],ys,cc[1]],[p0[0],y_0,p0[1]],[p1[0],y_1,p1[1]],[0.5,v1],[(u_0-a)/o.w,v1+Math.sin(t0)*ARCH_FT],[(u_1-a)/o.w,v1+Math.sin(t1)*ARCH_FT],gc,wt,[N[0],0,N[1]]);
        const q0=P(u_0,d),q1=P(u_1,d);const mc=(t0+t1)/2;Q([q0[0],y_0,q0[1]],[q1[0],y_1,q1[1]],[p1[0],y_1,p1[1]],[p0[0],y_0,p0[1]],[0,0],[1,0],[1,rd],[0,rd],rc,TM.plasterW,[-E[0]*Math.cos(mc),-Math.sin(mc),-E[1]*Math.cos(mc)])}},
    /* balcony: slab from u0..u1 projecting dep in front of plane d at floor y, iron railing; posts = wide plaster-post type */
    balcony(u0,u1,d,y,dep,posts){const d0=d-dep;F.box(u0,u1,d0,d,y-0.16,y,COL.trim,TM.plasterW,1,true);F.box(u0-0.03,u1+0.03,d0-0.03,d0+0.06,y-0.24,y-0.14,COL.trim,TM.plasterW,1,true);
      const nC=Math.max(2,Math.round((u1-u0)/1.1));for(let k=0;k<nC;k++){const uc=u0+0.18+(u1-u0-0.36)*k/(nC-1);F.box(uc-0.07,uc+0.07,d0+0.15,d,y-0.46,y-0.16,COL.trim,TM.plasterW,1,true)}
      const rh=posts?0.92:1.0,y1=y+rh;
      if(posts){const pw=0.24;const pu=[u0,u1-pw];const nm=Math.floor((u1-u0)/1.9);for(let k=1;k<nm;k++)pu.push(u0+(u1-u0-pw)*k/nm);
        for(const p of pu)F.box(p,p+pw,d0,d0+pw,y,y1,COL.trim,TM.plasterW,1);F.box(u0-0.04,u1+0.04,d0-0.04,d0+0.2,y1,y1+0.09,COL.trim,TM.plasterW,1);
        F.box(u0,u0+pw,d0,d,y,y1,COL.trim,TM.plasterW,1);F.box(u1-pw,u1,d0,d,y,y1,COL.trim,TM.plasterW,1);
        F.rw(u0+pw,u1-pw,d0+0.12,y+0.06,y1,COL.iron,T.rail,1.1);}
      else{F.rw(u0,u1,d0+0.03,y,y1,COL.iron,T.rail,1.1);F.rs(u0+0.03,d0,d,y,y1,-1,COL.iron,T.rail,1.1);F.rs(u1-0.03,d0,d,y,y1,1,COL.iron,T.rail,1.1);
        F.box(u0,u1,d0,d0+0.05,y1-0.03,y1+0.02,COL.iron,T.metal,1)}}};
  return F}
/* straight segment helpers in world space */
const segLen=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function clipHalf(poly,f){// keep f(p) <= 0 (Sutherland-Hodgman, one half-plane)
  const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],fa=f(a),fb=f(b);if(fa<=0)out.push(a);if((fa<0&&fb>0)||(fa>0&&fb<0)){const t=fa/(fa-fb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}return out}
function flatPoly(ring,y,col,t,s,B){B=B||G;const c=ring.map(p=>new THREE.Vector2(p[0],p[1]));if(THREE.ShapeUtils.isClockWise(c))c.reverse();const tris=THREE.ShapeUtils.triangulateShape(c,[]);s=s||1;
  for(const tr of tris){const a=c[tr[0]],b=c[tr[1]],d=c[tr[2]];TRI([a.x,y,a.y],[b.x,y,b.y],[d.x,y,d.y],[a.x*s,a.y*s],[b.x*s,b.y*s],[d.x*s,d.y*s],col,t,[0,1,0],B)}}
/* level grid: make the player / ball stand at absolute height yAt(x,z) inside poly */
function setLevel(poly,yAt){if(typeof LVL==='undefined'||!LVL)return;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of poly){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])}
  for(let px=Math.floor(x0-BOUNDS[0]);px<=Math.ceil(x1-BOUNDS[0]);px++)for(let py=Math.floor(z0-BOUNDS[1]);py<=Math.ceil(z1-BOUNDS[1]);py++){if(px<0||py<0||px>=lvW||py>=lvH)continue;
    const cx=BOUNDS[0]+px+0.5,cz=BOUNDS[1]+py+0.5;if(!pip(poly,cx,cz))continue;LVL[py*lvW+px]=Math.max(0,yAt(cx,cz)-terr(cx,cz))}}

/* ============================== site model (shared by the building and the grounds) ============================== */
const S={};
function site(ps){if(S.ok)return S;
  /* main facade = longest footprint edge (OSM way 1086751869: 51.4 m along Artemidos). O = its NORTH end, E runs south */
  let best=-1,bi=0;for(let i=0;i<ps.length;i++){const L=segLen(ps[i],ps[(i+1)%ps.length]);if(L>best){best=L;bi=i}}
  let A=ps[bi],B=ps[(bi+1)%ps.length];if(A[1]>B[1]){const t=A;A=B;B=t}            // A = north end (smaller z)
  const L=segLen(A,B),E=[(B[0]-A[0])/L,(B[1]-A[1])/L];let I=[E[1],-E[0]];const cen=ps.reduce((s,p)=>[s[0]+p[0]/ps.length,s[1]+p[1]/ps.length],[0,0]);
  if((cen[0]-A[0])*I[0]+(cen[1]-A[1])*I[1]<0)I=[-I[0],-I[1]];
  const F=Frame(A,E,I);S.F=F;S.L=L;S.ps=ps;
  const loc=p=>[(p[0]-A[0])*E[0]+(p[1]-A[1])*E[1],(p[0]-A[0])*I[0]+(p[1]-A[1])*I[1]];S.loc=loc;
  let dmax=0;for(const p of ps)dmax=Math.max(dmax,loc(p)[1]);S.depth=dmax;
  /* the school fence line in front of the facade (ISA ground polygon, OSM way 1086751865) */
  const poly=ISA.poly||unp(MAP.isa.poly);S.poly=poly;let fd=-3.1;
  for(let i=0;i<poly.length;i++){const a=loc(poly[i]),b=loc(poly[(i+1)%poly.length]);if(a[1]<0&&b[1]<0&&Math.abs(a[1]-b[1])<3){fd=Math.max(a[1],b[1]);break}}
  S.fenceAt=uu=>{let best=-1e9;for(let i=0;i<poly.length;i++){const a=loc(poly[i]),b=loc(poly[(i+1)%poly.length]);if((a[0]-uu)*(b[0]-uu)>0||a[0]===b[0])continue;const t=(uu-a[0])/(b[0]-a[0]),dd=a[1]+(b[1]-a[1])*t;if(dd<0&&dd>best)best=dd}return best>-1e8?best:fd};
  S.fenceD=fd;S.dV=Math.min(-1.6,fd+0.6);                                            // veranda front wall, 0.6 m behind the fence
  /* levels: street at the facade, ground floor 2.9 m above it (raised lower-ground floor, veranda), court platform just above the highest ground under it */
  let ys=1e9;for(let u=0;u<=L;u+=2){const p=F.P(u,fd-1.0);ys=Math.min(ys,terr(p[0],p[1]))}S.streetMin=ys;
  const pm=F.P(L*0.45,fd-1.5);S.street=terr(pm[0],pm[1]);S.GF=S.street+2.9;
  S.court=clipHalf(poly,p=>loc(p)[0]);                                                // part of the school ground north of the building line
  let yc=-1e9;for(let x=-60;x<=60;x+=1)for(let z=-60;z<=60;z+=1){const p=[cen[0]+x,cen[1]-40+z];if(pip(S.court,p[0],p[1]))yc=Math.max(yc,terr(p[0],p[1]))}
  for(const p of S.court)yc=Math.max(yc,terr(p[0],p[1]));S.Yc=yc+0.05;
  /* main historic block (36.6 m x 16 m) at the north end of the facade; lower south wing with terrace towards Xenias */
  S.U0=0.35;S.BW=36.6;S.BD=16;S.U1=S.U0+S.BW;
  S.H=S.GF+12.6;                                                                      // eaves (top of cornice)
  ISALM.GF=S.GF;ISALM.Yc=S.Yc;ISALM.frame={O:A,E,I};S.ok=true;return S}

/* ============================== the main building (LM hook) ============================== */
function buildMain(fp){const ps=fp.ps;const s=site(ps),F=s.F,GF=s.GF,H=s.H,U0=s.U0,U1=s.U1,BD=s.BD;const P=F.P;
  const ch=chunkAt(P(s.L/2,BD/2)[0],P(s.L/2,BD/2)[1]);G=ch.o;GC=ch.cut;
  const lowY=Math.min(s.streetMin,s.Yc)-0.4;
  /* storeys (relative to GF) */
  const FL=[0,4.4,8.1,11.8];const yG=GF,y1=GF+FL[1],y2=GF+FL[2],y3=GF+FL[3];
  /* bays (block coordinates b from the north end) — measured from the 2019 photo of the west facade, see isa.md */
  const SEC=[[0,5.1,0],[5.1,15.0,0.3],[15.0,21.6,0],[21.6,31.5,0.3],[31.5,36.6,0]];// [b0,b1,recess]
  const WIN=[7.05,11.25,13.7,22.9,25.35,29.55];const cB=18.3;
  const u=b=>U0+b;const secOf=b=>SEC.find(q=>b>=q[0]-1e-6&&b<=q[1]+1e-6);
  /* ---- west facade, storey by storey, section by section ---- */
  for(const [b0,b1,rc] of SEC){const d=rc,end=(b1-b0)<6&&b0!==15.0,cen=b0===15.0;
    const opsG=[],ops1=[],ops2=[];
    if(end){const c=u((b0+b1)/2);opsG.push({c,w:2.5,yb:yG,yt:yG+3.75,arch:true});ops1.push({c,w:1.2,yb:y1,yt:y1+2.6});ops2.push({c,w:1.2,yb:y2,yt:y2+2.6})}
    else if(cen){const c=u(cB);opsG.push({c,w:2.1,yb:yG,yt:yG+3.95,arch:true});
      ops1.push({c,w:1.45,yb:y1,yt:y1+2.6},{c:u(cB-1.75),w:0.85,yb:y1,yt:y1+2.6},{c:u(cB+1.75),w:0.85,yb:y1,yt:y1+2.6});
      ops2.push({c,w:1.45,yb:y2,yt:y2+2.6})}
    else for(const wb of WIN)if(wb>b0&&wb<b1){const c=u(wb);opsG.push({c,w:1.3,yb:yG,yt:yG+3.55,arch:true});ops1.push({c,w:1.15,yb:y1,yt:y1+2.55});ops2.push({c,w:1.15,yb:y2,yt:y2+2.55})}
    F.band(u(b0),u(b1),d,yG,y1,opsG,COL.rust,T.isaRust,1/1.8,0.42);
    F.band(u(b0),u(b1),d,y1,y2,ops1,COL.wall,TM.plasterW,1,0.32);
    F.band(u(b0),u(b1),d,y2,y3,ops2,COL.wall,TM.plasterW,1,0.32);
    F.fw(u(b0),u(b1),d,y3,H,COL.wall,TM.plasterW,1);
    if(cen){// blind panels beside the 2nd-floor centre window (as in the photo)
      for(const sg of[-1,1])F.box(u(cB+sg*1.75)-0.43,u(cB+sg*1.75)+0.43,d-0.04,d,y2+0.05,y2+2.55,shade(COL.wall,0.97),TM.plasterW,1)}
    /* side walls of the projections */
    if(rc>0){F.sw(u(b0),0,rc,yG,H,1,COL.wall,TM.plasterW,1);F.sw(u(b1),0,rc,yG,H,-1,COL.wall,TM.plasterW,1)}
    /* balconies */
    if(end||cen){const w=cen?6.0:4.5,c=u((b0+b1)/2);F.balcony(c-w/2,c+w/2,d,y1,0.85,true);F.balcony(c-w/2,c+w/2,d,y2,0.85,true)}
    else for(const wb of WIN)if(wb>b0&&wb<b1){F.balcony(u(wb)-0.85,u(wb)+0.85,d,y1,0.5,false);F.balcony(u(wb)-0.85,u(wb)+0.85,d,y2,0.5,false)}
    /* string courses: heavy cornice over the rusticated ground floor, thin band at the 2nd floor, frieze band */
    F.box(u(b0)-(b0===0?0.12:0),u(b1)+(b1===36.6?0.12:0),d-0.2,d,y1-0.34,y1-0.04,COL.trim,TM.plasterW,1,true);
    F.box(u(b0),u(b1),d-0.07,d,y2-0.12,y2-0.02,COL.trim,TM.plasterW,1,true);
    F.box(u(b0),u(b1),d-0.06,d,H-0.95,H-0.85,COL.trim,TM.plasterW,1,true);
    /* rosettes in the frieze */
    const meds=[];if(end)meds.push((b0+b1)/2-1.2,(b0+b1)/2+1.2);else if(cen)meds.push(cB-2.4,cB+2.4);else for(const wb of WIN)if(wb>b0&&wb<b1)meds.push(wb-0.95,wb+0.95);
    for(const m of meds)F.disc(u(m),H-0.55,d-0.07,0.17,COL.trim)}
  /* main eaves cornice, continuous */
  F.box(U0-0.45,U1+0.45,-0.5,BD+0.5,H-0.34,H,COL.trim,TM.plasterW,1,true);
  /* ---- north end wall (court side), south end wall (over the terrace), rear wall above the rear wing ---- */
  const nF=Frame(P(U0,BD),[-F.I[0],-F.I[1]],F.E),sF=Frame(P(U1,0),F.I,[-F.E[0],-F.E[1]]),rF=Frame(P(U1,BD),[-F.E[0],-F.E[1]],[-F.I[0],-F.I[1]]);
  const sideOps=(y,h,w,arch)=>[3.4,8,12.6].map(c=>({c,w,yb:y,yt:y+h,arch}));
  for(const [fr,base] of [[nF,s.Yc-0.3],[sF,GF]]){
    if(fr===nF){fr.band(0,BD,0,base,yG,[3.4,8,12.6].map(c=>({c,w:1.2,yb:yG-2.15,yt:yG-0.6})),COL.wallS,TM.plasterW,1,0.3)}
    fr.band(0,BD,0,yG,y1,sideOps(yG,3.55,1.3,true),COL.rust,T.isaRust,1/1.8,0.42);
    fr.band(0,BD,0,y1,y2,sideOps(y1,2.55,1.15),COL.wall,TM.plasterW,1,0.32);fr.band(0,BD,0,y2,y3,sideOps(y2,2.55,1.15),COL.wall,TM.plasterW,1,0.32);fr.fw(0,BD,0,y3,H,COL.wall,TM.plasterW,1);
    fr.box(-0.1,BD+0.1,-0.2,0,y1-0.34,y1-0.04,COL.trim,TM.plasterW,1,true);fr.box(0,BD,-0.07,0,y2-0.12,y2-0.02,COL.trim,TM.plasterW,1,true);fr.box(0,BD,-0.06,0,H-0.95,H-0.85,COL.trim,TM.plasterW,1,true);
    for(const c of[3.4,8,12.6]){fr.balcony(c-0.85,c+0.85,0,y1,0.5,false);fr.balcony(c-0.85,c+0.85,0,y2,0.5,false)}}
  const rearTop=GF+7.9;const rOps=[];for(let c=2;c<s.BW-1;c+=3.3)rOps.push({c,w:1.1,yb:y2+0.2,yt:y2+2.4});
  rF.fw(0,s.BW,0,rearTop,y2,COL.wallS,TM.plasterW,1);rF.band(0,s.BW,0,y2,y3,rOps,COL.wallS,TM.plasterW,1,0.25);rF.fw(0,s.BW,0,y3,H,COL.wallS,TM.plasterW,1);
  /* ---- hipped roof of Byzantine tiles (pitch 23°), overhang 0.5 m ---- */
  const ov=0.5,uA=U0-ov,uB=U1+ov,dA=-ov,dB=BD+ov,hw=(dB-dA)/2,dm=(dA+dB)/2,tp=Math.tan(23*Math.PI/180),Hr=H+hw*tp,cs=1/Math.cos(23*Math.PI/180);
  const R=(uu,dd,yy)=>{const p=P(uu,dd);return[p[0],yy,p[1]]};const up=[0,1,0];
  Q(R(uA,dA,H),R(uB,dA,H),R(uB-hw,dm,Hr),R(uA+hw,dm,Hr),[uA,0],[uB,0],[uB-hw,hw*cs],[uA+hw,hw*cs],COL.roof,TM.tiles,up);
  Q(R(uB,dB,H),R(uA,dB,H),R(uA+hw,dm,Hr),R(uB-hw,dm,Hr),[uB,0],[uA,0],[uA+hw,hw*cs],[uB-hw,hw*cs],COL.roof,TM.tiles,up);
  TRI(R(uA,dB,H),R(uA,dA,H),R(uA+hw,dm,Hr),[dB,0],[dA,0],[dm,hw*cs],COL.roof,TM.tiles,up);
  TRI(R(uB,dA,H),R(uB,dB,H),R(uB-hw,dm,Hr),[dA,0],[dB,0],[dm,hw*cs],COL.roof,TM.tiles,up);
  {const a=R(uA+hw,dm,Hr),b=R(uB-hw,dm,Hr);const mx=(a[0]+b[0])/2,mz=(a[2]+b[2])/2;G.box(mx,Hr+0.06,mz,uB-uA-2*hw,0.16,0.3,Math.atan2(-F.E[1],F.E[0]),shade(COL.roof,0.85),RECT[TM.tiles],1)}
  /* ---- north-end attic (the flat-topped "tower" over the left end bay in the photo) ---- */
  const tH=H+1.75;F.box(U0,U0+5.1,0,6.2,H-0.3,tH,COL.wall,TM.plasterW,1);F.box(U0-0.12,U0+5.22,-0.12,6.32,tH,tH+0.22,COL.trim,TM.plasterW,1,true);
  F.h(U0,U0+5.1,0,6.2,tH+0.221,COL.concrete,TM.flatroof,1);
  /* ---- centre: semicircular tympanum between two square pylons, raised roof behind it ---- */
  {const b0=U0+15.0,b1=U0+21.6,c=U0+cB,pw=0.85,yP=H+2.75,yS=H+1.15,yA=H+2.6,th=0.45;
    F.box(b0,b0+pw,-0.05,th+0.3,H-0.3,yP,COL.wall,TM.plasterW,1);F.box(b1-pw,b1,-0.05,th+0.3,H-0.3,yP,COL.wall,TM.plasterW,1);
    F.box(b0-0.06,b0+pw+0.06,-0.11,th+0.36,yP,yP+0.14,COL.trim,TM.plasterW,1);F.box(b1-pw-0.06,b1+0.06,-0.11,th+0.36,yP,yP+0.14,COL.trim,TM.plasterW,1);
    /* arched parapet: top edge is a segmental arc from yS at the pylons to yA on the axis */
    const ua=b0+pw,ub=b1-pw,half=(ub-ua)/2,sag=yA-yS,rad=(half*half+sag*sag)/(2*sag),cy=yA-rad,K=12;
    const top=k=>{const uu=ua+(ub-ua)*k/K;return[uu,cy+Math.sqrt(Math.max(0,rad*rad-(uu-c)*(uu-c)))]};
    for(let k=0;k<K;k++){const [u_0,y_0]=top(k),[u_1,y_1]=top(k+1);
      for(const [dd,n] of[[0,F.N],[th,F.I]]){const p0=P(u_0,dd),p1=P(u_1,dd);Q([p0[0],H-0.3,p0[1]],[p1[0],H-0.3,p1[1]],[p1[0],y_1,p1[1]],[p0[0],y_0,p0[1]],[u_0,H],[u_1,H],[u_1,y_1],[u_0,y_0],COL.wall,TM.plasterW,[n[0],0,n[1]])}
      const p0=P(u_0,-0.1),p1=P(u_1,-0.1),q0=P(u_0,th+0.1),q1=P(u_1,th+0.1);Q([p0[0],y_0+0.12,p0[1]],[p1[0],y_1+0.12,p1[1]],[q1[0],y_1+0.12,q1[1]],[q0[0],y_0+0.12,q0[1]],[0,0],[1,0],[1,1],[0,1],COL.trim,TM.plasterW,up);
      Q([p0[0],y_0,p0[1]],[p1[0],y_1,p1[1]],[p1[0],y_1+0.12,p1[1]],[p0[0],y_0+0.12,p0[1]],[0,0],[1,0],[1,0.12],[0,0.12],COL.trim,TM.plasterW,[F.N[0],0,F.N[1]]);
      /* moulded arch band 0.45 m below the edge */
      const m0=P(u_0,-0.08),m1=P(u_1,-0.08),m0b=P(u_0,0),m1b=P(u_1,0);Q([m0[0],y_0-0.55,m0[1]],[m1[0],y_1-0.55,m1[1]],[m1[0],y_1-0.42,m1[1]],[m0[0],y_0-0.42,m0[1]],[0,0],[1,0],[1,.13],[0,.13],COL.trim,TM.plasterW,[F.N[0],0,F.N[1]]);
      Q([m0[0],y_0-0.42,m0[1]],[m1[0],y_1-0.42,m1[1]],[m1b[0],y_1-0.42,m1b[1]],[m0b[0],y_0-0.42,m0b[1]],[0,0],[1,0],[1,.1],[0,.1],COL.trim,TM.plasterW,up)}
    /* raised cross roof behind the tympanum: gable from the parapet back into the main roof */
    const rY=H+2.15,dEnd=(rY-H)/tp-ov;const L0=P(b0+0.2,th),L1=P(b0+0.2,dEnd+1.2),M0=P(c,th),M1=P(c,dEnd),R0=P(b1-0.2,th),R1=P(b1-0.2,dEnd+1.2);
    Q([L0[0],H+0.2,L0[1]],[M0[0],rY,M0[1]],[M1[0],rY,M1[1]],[L1[0],H+0.2,L1[1]],[0,0],[3.3,0],[3.3,dEnd],[0,dEnd],COL.roof,TM.tiles,up);
    Q([M0[0],rY,M0[1]],[R0[0],H+0.2,R0[1]],[R1[0],H+0.2,R1[1]],[M1[0],rY,M1[1]],[0,0],[3.3,0],[3.3,dEnd],[0,dEnd],COL.roof,TM.tiles,up)}
  /* ---- Greek flag on the centre balcony (seen in the photo) ---- */
  {const p=P(U0+cB+2.6,-0.75);G.cyl(p[0],y1+0.9,p[1],0.025,0.02,2.6,6,COL.galv,RECT[T.metal],true);
    const f0=P(U0+cB+2.6,-0.75),f1=P(U0+cB+2.6,-2.05);for(let k=0;k<9;k++){const ya=y1+3.4-k*0.1,yb=ya-0.1,c=k%2?COL.trim:hx('#1f5fb0');G.wall(f0[0],f0[1],f1[0],f1[1],yb,yb,ya,ya,F.E[0],F.E[1],0,1,0,1,c,RECT[T.white],0);G.wall(f1[0],f1[1],f0[0],f0[1],yb,yb,ya,ya,-F.E[0],-F.E[1],0,1,0,1,c,RECT[T.white],0)}}
  /* ---- rear school wing: the rest of the OSM footprint, two storeys over the lower ground floor, flat roof (inferred) ---- */
  const annex=clipHalf(ps,p=>BD-s.loc(p)[1]);
  if(annex.length>2){const yTop=rearTop;let cw=0;for(let i=0;i<annex.length;i++)cw+=(annex[(i+1)%annex.length][0]-annex[i][0])*(annex[(i+1)%annex.length][1]+annex[i][1]);
    for(let i=0;i<annex.length;i++){const a=annex[i],b=annex[(i+1)%annex.length],Ls=segLen(a,b);if(Ls<0.3)continue;const la=s.loc(a),lb=s.loc(b);
      const onCut=Math.abs(la[1]-BD)<0.05&&Math.abs(lb[1]-BD)<0.05;if(onCut&&Math.min(la[0],lb[0])<U1-0.05&&Math.max(la[0],lb[0])<=U1+0.05)continue;// hidden inside the main block
      const e=[(b[0]-a[0])/Ls,(b[1]-a[1])/Ls];let inw=[e[1],-e[0]];const mid=[(a[0]+b[0])/2+inw[0]*0.3,(a[1]+b[1])/2+inw[1]*0.3];if(!pip(annex,mid[0],mid[1]))inw=[-inw[0],-inw[1]];
      const fr=Frame(a,e,inw);let base=Math.min(terr(a[0],a[1]),terr(b[0],b[1]))-0.3;if(onCut)base=GF;else{const mm=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(s.loc(mm)[0]<0.5)base=Math.min(base,s.Yc-0.3)}
      let sA=0,sB=Ls;if(onCut){if(la[0]<lb[0])sA=clamp(U1-la[0],0,Ls);else sB=clamp(la[0]-U1,0,Ls)}const sp=sB-sA;if(sp<0.3)continue;
      const ops0=[],ops1=[],opsL=[];const n=Math.max(0,Math.floor((sp-1.2)/3.3));for(let k=0;k<n;k++){const c=sA+(sp-(n-1)*3.3)/2+k*3.3;ops0.push({c,w:1.15,yb:GF+0.9,yt:GF+3.1});ops1.push({c,w:1.15,yb:GF+4.3,yt:GF+6.5});if(base<GF-2.4)opsL.push({c,w:1.15,yb:GF-2.0,yt:GF-0.6})}
      if(base<GF-0.05)fr.band(sA,sB,0,base,GF,opsL,COL.annex,TM.plasterW,1,0.22);
      fr.band(sA,sB,0,GF,GF+3.9,ops0,COL.annex,TM.plasterW,1,0.22);fr.band(sA,sB,0,GF+3.9,yTop,ops1,COL.annex,TM.plasterW,1,0.22);
      fr.box(sA-0.05,sB+0.05,-0.12,0.2,yTop,yTop+0.35,COL.trim,TM.plasterW,1,true);fr.box(sA,sB,-0.06,0,GF+3.75,GF+3.9,COL.trim,TM.plasterW,1,true)}
    flatPoly(annex,yTop+0.2,COL.concrete,TM.flatroof,1)}
  /* ---- veranda: raised deck along the west facade and over the south wing, iron railing, lower-ground windows below ---- */
  const dV=s.dV,uN=0,uS=s.L;
  {const vf=Frame(P(uN,dV),F.E,F.I);const lg=[];for(const wb of WIN.concat([2.55,cB,34.05]))lg.push(u(wb));for(let c=U1+2.4;c<uS-1.5;c+=3.4)lg.push(c);
    const gateU=U0+27.2;S.gateU=gateU;
    const ops=lg.filter(c=>Math.abs(c-gateU)>1.6).map(c=>({c,w:1.15,yb:GF-2.3,yt:GF-0.85}));ops.push({c:gateU,w:1.5,yb:s.street+0.05,yt:s.street+2.35});
    vf.band(uN,uS,0,lowY,GF,ops,COL.wallS,TM.plasterW,1,0.3);vf.box(uN-0.15,uS,-0.12,0.32,GF-0.02,GF+0.12,COL.trim,TM.plasterW,1,true);
    F.h(uN,uS,dV+0.05,0,GF+0.12,COL.deck,TM.marbleW,1);
    F.rw(uN,uS,dV+0.15,GF+0.12,GF+1.05,COL.iron,T.isaBars,1.2);for(let c=uN;c<=uS;c+=2.4)F.box(c-0.05,c+0.05,dV+0.1,dV+0.2,GF+0.12,GF+1.08,COL.iron,T.metal,1);
    F.box(uN,uS,dV+0.08,dV+0.22,GF+1.02,GF+1.08,COL.iron,T.metal,1);
    /* south wing: lower-ground storey with a terrace roof at GF level */
    const swF=Frame(P(uS,dV),F.I,[-F.E[0],-F.E[1]]);const sOps=[];for(let c=2.5;c<BD-dV-1;c+=3.4)sOps.push({c,w:1.15,yb:GF-2.3,yt:GF-0.85});
    swF.band(0,BD-dV,0,lowY,GF,sOps,COL.wallS,TM.plasterW,1,0.3);swF.box(0,BD-dV,-0.12,0.3,GF-0.02,GF+0.12,COL.trim,TM.plasterW,1,true);
    F.h(U1,uS,0,BD,GF+0.12,COL.deck,TM.marbleW,1);
    swF.rw(0,BD-dV,0.15,GF+0.12,GF+1.05,COL.iron,T.isaBars,1.2);swF.box(0,BD-dV,0.08,0.22,GF+1.02,GF+1.08,COL.iron,T.metal,1);
    /* stair from the veranda down to the court platform, beyond the north end of the facade */
    const n=16,rise=(GF+0.12-s.Yc)/n,run=0.3,sw=1.5;S.stair={u0:uN-n*run,u1:uN,d0:dV+0.3,d1:dV+0.3+sw};
    for(let k=0;k<n;k++){const ua=uN-(k+1)*run,ub=uN-k*run,yt=GF+0.12-k*rise;F.box(ua,ub,dV+0.3,dV+0.3+sw,s.Yc-0.2,yt,COL.deck,TM.marbleW,1)}
    F.box(uN-n*run,uN,dV+0.3+sw,dV+0.5+sw,s.Yc-0.2,s.Yc+0.5,COL.wallS,TM.plasterW,1);
    {const a=P(uN,dV+0.4+sw),b=P(uN-n*run,dV+0.4+sw);GC.wall(a[0],a[1],b[0],b[1],GF+0.12,s.Yc+0.5,GF+1.05,s.Yc+1.43,F.I[0],F.I[1],0,n*run/1.2,0,1,COL.iron,RECT[T.isaBars],0)}
    /* north end of the veranda: wall down to the court platform */
    F.sw(uN,dV+0.5+sw,0,s.Yc-0.3,GF+0.12,-1,COL.wallS,TM.plasterW,1);
    /* level grid + collision */
    const vPoly=[P(uN,dV),P(uS,dV),P(uS,BD),P(U1,BD),P(U1,0.05),P(uN,0.05)];setLevel(vPoly,()=>GF+0.12);
    const st=[P(uN-n*run,dV+0.3),P(uN,dV+0.3),P(uN,dV+0.3+sw),P(uN-n*run,dV+0.3+sw)];setLevel(st,(x,z)=>{const lu=s.loc([x,z])[0];return s.Yc+clamp((lu-(uN-n*run))/(n*run),0,1)*(GF+0.12-s.Yc)});
    const seg=(a,b,k)=>addSeg(a[0],a[1],b[0],b[1],k);seg(P(uN,dV),P(uS,dV),'w');seg(P(uS,dV),P(uS,BD),'w');seg(P(uN-n*run,dV+0.3+sw),P(uN,dV+0.3+sw),'f');seg(P(uN,dV+0.3+sw),P(uN,0),'w')}
  for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];addSeg(a[0],a[1],b[0],b[1],'b')}
  /* the main block walls below GF inside the veranda are hidden; its north and south walls are built above */
  const c=P(U0+cB,BD/2);if(typeof placed==='function')placed('landmark',c[0],c[1],'International School of Athens (former Hotel Olympos Pallas)','osm:way/1086751869');
  ISALM.built=true}

/* ============================== grounds: fences, gate, courts (replaces buildISA of 40_walls.js) ============================== */
function buildGrounds(){const poly=ISA.poly=unp(MAP.isa.poly);if(!S.ok){console.warn('lm-isa: main building not built; grounds use defaults');return false}
  const F=S.F,P=F.P,Yc=S.Yc;const ch=chunkAt(P(-16,16)[0],P(-16,16)[1]);G=ch.o;GC=ch.cut;GL=0;
  const n=poly.length;let pcx=0,pcz=0;for(const p of poly){pcx+=p[0]/n;pcz+=p[1]/n}
  /* ---- court platform: flat terrace at Yc retained by concrete walls ---- */
  const cp=S.court;flatPoly(cp,Yc,COL.concrete,TM.concrete,1);setLevel(cp,()=>Yc);
  /* ---- multi-sport court (OSM 1086751866) and 5-a-side pitch (OSM 1086751867) ---- */
  const pit=MAP.pitches.filter(p=>pip(poly,p[0],p[1]));const multi=pit.find(p=>p[5]==='multi'||p[5]==='basketball'),socc=pit.find(p=>p[5]==='soccer');
  const lineQ=(cx,cz,ca,sa,s0,t0,s1,t1,w,y)=>{const L=Math.hypot(s1-s0,t1-t0)||1,ns=-(t1-t0)/L*w/2,nt=(s1-s0)/L*w/2;const W=(s,t)=>[cx+ca*s-sa*t,y,cz+sa*s+ca*t];
    Q(W(s0+ns,t0+nt),W(s1+ns,t1+nt),W(s1-ns,t1-nt),W(s0-ns,t0-nt),[0,0],[1,0],[1,1],[0,1],COL.line,T.isaAcryl,[0,1,0])};
  const arcL=(cx,cz,ca,sa,os,ot,r,a0,a1,w,y)=>{const K=Math.max(6,Math.ceil(Math.abs(a1-a0)*r*2));for(let k=0;k<K;k++){const b0=a0+(a1-a0)*k/K,b1=a0+(a1-a0)*(k+1)/K;lineQ(cx,cz,ca,sa,os+Math.cos(b0)*r,ot+Math.sin(b0)*r,os+Math.cos(b1)*r,ot+Math.sin(b1)*r,w,y)}};
  const rect=(cx,cz,ca,sa,L,W,col,t,y,s)=>{const P2=(u,v)=>[cx+ca*u-sa*v,cz+sa*u+ca*v];flatPoly([P2(-L/2,-W/2),P2(L/2,-W/2),P2(L/2,W/2),P2(-L/2,W/2)],y,col,t,s)};
  const hoops=[];
  if(multi){const [cx,cz,L,W,a]=multi,ca=Math.cos(a),sa=Math.sin(a);ISALM.court={x:cx,z:cz,L,W,a};
    rect(cx,cz,ca,sa,L,W,COL.greenSurf,T.isaAcryl,Yc+0.01,0.5);
    const CL=Math.min(26,L-3),CW=Math.min(14,W-2.5),hl=CL/2,hw=CW/2,y=Yc+0.03,w=0.05;
    rect(cx,cz,ca,sa,CL,CW,COL.redSurf,T.isaAcryl,Yc+0.02,0.5);
    lineQ(cx,cz,ca,sa,-hl,-hw,hl,-hw,w,y);lineQ(cx,cz,ca,sa,-hl,hw,hl,hw,w,y);lineQ(cx,cz,ca,sa,-hl,-hw,-hl,hw,w,y);lineQ(cx,cz,ca,sa,hl,-hw,hl,hw,w,y);lineQ(cx,cz,ca,sa,0,-hw,0,hw,w,y);
    arcL(cx,cz,ca,sa,0,0,1.8,0,TAU,w,y);
    for(const sd of[-1,1]){const bs=sd*(hl-1.575),ft=sd*(hl-5.8);
      lineQ(cx,cz,ca,sa,sd*hl,-2.45,ft,-2.45,w,y);lineQ(cx,cz,ca,sa,sd*hl,2.45,ft,2.45,w,y);lineQ(cx,cz,ca,sa,ft,-2.45,ft,2.45,w,y);
      arcL(cx,cz,ca,sa,ft,0,1.8,0,TAU,w,y);
      const t3=Math.min(6.6,hw-0.4),ph=Math.asin(t3/6.75),se=bs-sd*6.75*Math.cos(ph);
      lineQ(cx,cz,ca,sa,sd*hl,-t3,se,-t3,w,y);lineQ(cx,cz,ca,sa,sd*hl,t3,se,t3,w,y);
      const base=sd>0?Math.PI:0;arcL(cx,cz,ca,sa,bs,0,6.75,base-ph,base+ph,w,y);arcL(cx,cz,ca,sa,bs,0,1.25,base-Math.PI/2,base+Math.PI/2,w,y);
      /* hoop: post 1.0 m behind the end line, arm, glass board (face 1.2 m inside the line), rim at 3.05 m, net */
      const W2=(s,t)=>[cx+ca*s-sa*t,cz+sa*s+ca*t];const po=W2(sd*(hl+1.0),0),bo=W2(sd*(hl-1.2),0),rim=W2(bs,0),ry=Math.atan2(-sa,ca);
      G.box(po[0],Yc+1.98,po[1],0.16,3.96,0.16,ry,COL.post,RECT[T.metal],1);
      const am=W2(sd*(hl-0.1),0);G.box(am[0],Yc+3.62,am[1],2.2,0.1,0.1,ry,COL.post,RECT[T.metal],1);G.box(am[0],Yc+3.25,am[1],2.0,0.08,0.08,ry,COL.post,RECT[T.metal],1);
      const bA=W2(sd*(hl-1.2),-0.9),bB=W2(sd*(hl-1.2),0.9);const nB=[-ca*sd,-sa*sd];
      G.wall(bA[0],bA[1],bB[0],bB[1],Yc+2.9,Yc+2.9,Yc+3.95,Yc+3.95,nB[0],nB[1],0,1,0,1,C1,RECT[T.isaBoard],0);G.wall(bB[0],bB[1],bA[0],bA[1],Yc+2.9,Yc+2.9,Yc+3.95,Yc+3.95,-nB[0],-nB[1],1,0,0,1,shade(C1,0.9),RECT[T.isaBoard],0);
      G.cyl(rim[0],Yc+3.04,rim[1],0.235,0.235,0.02,16,hx('#e2531d'),RECT[T.metal],false);G.cyl(rim[0],Yc+3.04,rim[1],0.215,0.215,0.02,16,hx('#c8441a'),RECT[T.metal],false);
      const br=W2(sd*(hl-1.37),0);G.box(br[0],Yc+3.03,br[1],0.15,0.04,0.12,ry,hx('#e2531d'),RECT[T.metal],1);
      GC.cyl(rim[0],Yc+2.62,rim[1],0.15,0.225,0.42,10,C1,RECT[T.fence],false,0,0.6);
      hoops.push({x:rim[0],z:rim[1],y:Yc+3.05,isa:true});
      /* handball / futsal goal on the end line (red-white posts) */
      const g0=W2(sd*hl,-1.5),g1=W2(sd*hl,1.5),gb0=W2(sd*(hl+0.9),-1.5),gb1=W2(sd*(hl+0.9),1.5);
      for(const gp of[g0,g1])for(let k=0;k<10;k++)G.box(gp[0],Yc+0.1+k*0.2,gp[1],0.08,0.2,0.08,ry,k%2?COL.trim:hx('#c62f26'),RECT[T.metal],1);
      {const m=W2(sd*hl,0);for(let k=0;k<15;k++){const p=W2(sd*hl,-1.5+k*0.2+0.1);G.box(p[0],Yc+2.04,p[1],0.08,0.08,0.2,ry,k%2?COL.trim:hx('#c62f26'),RECT[T.metal],1)}
        GC.wall(gb0[0],gb0[1],gb1[0],gb1[1],Yc,Yc,Yc+1.6,Yc+1.6,-nB[0],-nB[1],0,3,0,1.6,C1,RECT[T.fence],0);
        for(const [x0,x1] of[[g0,gb0],[g1,gb1]])GC.wall(x0[0],x0[1],x1[0],x1[1],Yc,Yc,Yc+2.0,Yc+1.6,1,0,0,0.9,0,2,C1,RECT[T.fence],0);
        GC.quad([g0[0],Yc+2.0,g0[1]],[g1[0],Yc+2.0,g1[1]],[gb1[0],Yc+1.6,gb1[1]],[gb0[0],Yc+1.6,gb0[1]],[0,0],[3,0],[3,0.9],[0,0.9],C1,RECT[T.fence],0)}}}
  if(socc){const [cx,cz,L,W,a]=socc,ca=Math.cos(a),sa=Math.sin(a);rect(cx,cz,ca,sa,L,W,C1,T.isaTurf,Yc+0.02,0.5);const hl=L/2-0.4,hw=W/2-0.4,y=Yc+0.035,w=0.08;
    lineQ(cx,cz,ca,sa,-hl,-hw,hl,-hw,w,y);lineQ(cx,cz,ca,sa,-hl,hw,hl,hw,w,y);lineQ(cx,cz,ca,sa,-hl,-hw,-hl,hw,w,y);lineQ(cx,cz,ca,sa,hl,-hw,hl,hw,w,y);lineQ(cx,cz,ca,sa,0,-hw,0,hw,w,y);arcL(cx,cz,ca,sa,0,0,3,0,TAU,w,y);
    const W2=(s,t)=>[cx+ca*s-sa*t,cz+sa*s+ca*t],ry=Math.atan2(-sa,ca);
    for(const sd of[-1,1]){const base=sd>0?Math.PI:0;arcL(cx,cz,ca,sa,sd*hl,0,Math.min(6,hw),base-Math.PI/2,base+Math.PI/2,w,y);const sp=W2(sd*(hl-6),0);G.cyl(sp[0],y,sp[1],0.11,0.11,0.003,8,COL.line,RECT[T.isaAcryl],true);
      const g0=W2(sd*hl,-1.5),g1=W2(sd*hl,1.5),gb0=W2(sd*(hl+0.9),-1.5),gb1=W2(sd*(hl+0.9),1.5),nB=[-ca*sd,-sa*sd];
      for(const gp of[g0,g1])for(let k=0;k<10;k++)G.box(gp[0],Yc+0.1+k*0.2,gp[1],0.08,0.2,0.08,ry,k%2?COL.trim:hx('#c62f26'),RECT[T.metal],1);
      for(let k=0;k<15;k++){const p=W2(sd*hl,-1.5+k*0.2+0.1);G.box(p[0],Yc+2.04,p[1],0.08,0.08,0.2,ry,k%2?COL.trim:hx('#c62f26'),RECT[T.metal],1)}
      GC.wall(gb0[0],gb0[1],gb1[0],gb1[1],Yc,Yc,Yc+1.6,Yc+1.6,-nB[0],-nB[1],0,3,0,1.6,C1,RECT[T.fence],0);
      for(const [x0,x1] of[[g0,gb0],[g1,gb1]])GC.wall(x0[0],x0[1],x1[0],x1[1],Yc,Yc,Yc+2.0,Yc+1.6,1,0,0,0.9,0,2,C1,RECT[T.fence],0);
      GC.quad([g0[0],Yc+2.0,g0[1]],[g1[0],Yc+2.0,g1[1]],[gb1[0],Yc+1.6,gb1[1]],[gb0[0],Yc+1.6,gb0[1]],[0,0],[3,0],[3,0.9],[0,0.9],C1,RECT[T.fence],0)}}
  if(typeof HOOPS!=='undefined'){for(let i=HOOPS.length-1;i>=0;i--)if(HOOPS[i].isa)HOOPS.splice(i,1);for(const h of hoops)HOOPS.push(h)}ISALM.hoops=hoops;
  /* ---- floodlight masts at the platform corners ---- */
  for(const p of cp){const dx=pcx-p[0],dz=pcz-p[1],l=Math.hypot(dx,dz)||1;const q=[p[0]+dx/l*1.2,p[1]+dz/l*1.2];if(!pip(cp,q[0],q[1])||S.loc(q)[0]>-4)continue;G.cyl(q[0],Yc,q[1],0.11,0.07,9.0,8,COL.galv,RECT[T.metal],true);
    const hq=[q[0]+dx/l*0.5,q[1]+dz/l*0.5];G.box(hq[0],Yc+8.9,hq[1],0.7,0.12,0.45,Math.atan2(dx,dz),hx('#3a3d40'),RECT[T.metal],1);G.box(hq[0],Yc+8.4,hq[1],0.7,0.12,0.45,Math.atan2(dx,dz),hx('#3a3d40'),RECT[T.metal],1)}
  /* ---- perimeter: street fence (stone base, steel bars, cream piers, gate) along the streets; mesh + windscreen around the courts ---- */
  const gateU=S.gateU||S.U0+27.2;const gateP=P(gateU,S.fenceAt(gateU));
  for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];const L=segLen(a,b);const e=[(b[0]-a[0])/L,(b[1]-a[1])/L];let nO=[e[1],-e[0]];const mm=[(a[0]+b[0])/2,(a[1]+b[1])/2];if((pcx-mm[0])*nO[0]+(pcz-mm[1])*nO[1]>0)nO=[-nO[0],-nO[1]];
    addSeg(a[0],a[1],b[0],b[1],'f');
    /* intervals along the edge (metres); the gate interrupts the street fence */
    let ivs=[[0,L]];{const sg=(gateP[0]-a[0])*e[0]+(gateP[1]-a[1])*e[1],dd=Math.abs((gateP[0]-a[0])*nO[0]+(gateP[1]-a[1])*nO[1]);if(dd<0.6&&sg>2&&sg<L-2){ivs=[[0,sg-1.66],[sg+1.66,L]];buildGate(gateP,e,nO,terr(gateP[0],gateP[1]))}}
    for(const [sA,sB] of ivs){const steps=Math.max(1,Math.ceil((sB-sA)/2.5));
    for(let k=0;k<steps;k++){const t0=(sA+(sB-sA)*k/steps)/L,t1=(sA+(sB-sA)*(k+1)/steps)/L;const p0=[lerp(a[0],b[0],t0),lerp(a[1],b[1],t0)],p1=[lerp(a[0],b[0],t1),lerp(a[1],b[1],t1)],pm=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2],sl=segLen(p0,p1);
      const onCourt=pip(cp,pm[0]-nO[0]*0.6,pm[1]-nO[1]*0.6);const ya=terr(p0[0],p0[1]),yb=terr(p1[0],p1[1]);
      if(onCourt){/* retaining wall outside, mesh fence 4 m with windscreen on the inner 2.2 m */
        G.wall(p0[0],p0[1],p1[0],p1[1],ya-0.4,yb-0.4,Yc+0.25,Yc+0.25,nO[0],nO[1],k*sl,(k+1)*sl,ya-0.4,Yc+0.25,COL.concrete,RECT[TM.concrete],0);
        G.wall(p0[0]-nO[0]*0.25,p0[1]-nO[1]*0.25,p1[0]-nO[0]*0.25,p1[1]-nO[1]*0.25,Yc,Yc,Yc+0.25,Yc+0.25,-nO[0],-nO[1],k*sl,(k+1)*sl,0,0.25,COL.concrete,RECT[TM.concrete],0);
        G.hq([p0[0],Yc+0.25,p0[1]],[p1[0],Yc+0.25,p1[1]],[p1[0]-nO[0]*0.25,Yc+0.25,p1[1]-nO[1]*0.25],[p0[0]-nO[0]*0.25,Yc+0.25,p0[1]-nO[1]*0.25],[0,0],[sl,0],[sl,.25],[0,.25],COL.concrete,RECT[TM.concrete],0);
        const q0=[p0[0]-nO[0]*0.12,p0[1]-nO[1]*0.12],q1=[p1[0]-nO[0]*0.12,p1[1]-nO[1]*0.12];
        GC.wall(q0[0],q0[1],q1[0],q1[1],Yc+0.25,Yc+0.25,Yc+4.2,Yc+4.2,nO[0],nO[1],0,sl/1.0,0,3.95/1.0,COL.post,RECT[T.fence],0);
        const r0=[p0[0]-nO[0]*0.16,p0[1]-nO[1]*0.16],r1=[p1[0]-nO[0]*0.16,p1[1]-nO[1]*0.16];
        G.wall(r0[0],r0[1],r1[0],r1[1],Yc+0.25,Yc+0.25,Yc+2.45,Yc+2.45,-nO[0],-nO[1],0,sl/2.5,0,1,C1,RECT[T.isaScreen],0);G.wall(r1[0],r1[1],r0[0],r0[1],Yc+0.25,Yc+0.25,Yc+2.45,Yc+2.45,nO[0],nO[1],0,sl/2.5,0,1,shade(C1,0.85),RECT[T.isaScreen],0);
        G.cyl(q0[0],Yc+0.25,q0[1],0.035,0.035,4.0,6,COL.post,RECT[T.metal],true);G.box((q0[0]+q1[0])/2,Yc+4.2,(q0[1]+q1[1])/2,sl,0.05,0.05,Math.atan2(-e[1],e[0]),COL.post,RECT[T.metal],1)}
      else{/* street fence: rubble-stone base 0.75 m, steel bars 1.85 m, cream piers every ~6 m */
        const wb=0.75;
        G.wall(p0[0],p0[1],p1[0],p1[1],ya-0.3,yb-0.3,ya+wb,yb+wb,nO[0],nO[1],k*sl,(k+1)*sl,ya-0.3,ya+wb,COL.stone,RECT[TM.rubble],0);
        G.wall(p0[0]-nO[0]*0.4,p0[1]-nO[1]*0.4,p1[0]-nO[0]*0.4,p1[1]-nO[1]*0.4,ya-0.3,yb-0.3,ya+wb,yb+wb,-nO[0],-nO[1],k*sl,(k+1)*sl,ya-0.3,ya+wb,shade(COL.stone,0.92),RECT[TM.rubble],0);
        G.hq([p0[0],ya+wb,p0[1]],[p1[0],yb+wb,p1[1]],[p1[0]-nO[0]*0.4,yb+wb,p1[1]-nO[1]*0.4],[p0[0]-nO[0]*0.4,ya+wb,p0[1]-nO[1]*0.4],[0,0],[sl,0],[sl,.4],[0,.4],COL.trim,RECT[TM.marbleW],0);
        const q0=[p0[0]-nO[0]*0.2,p0[1]-nO[1]*0.2],q1=[p1[0]-nO[0]*0.2,p1[1]-nO[1]*0.2];
        GC.wall(q0[0],q0[1],q1[0],q1[1],ya+wb,yb+wb,ya+wb+1.85,yb+wb+1.85,nO[0],nO[1],0,sl/1.2,0,1,COL.iron,RECT[T.isaBars],0);
        if(k%2===0||k===steps-1&&false){G.box(p0[0]-nO[0]*0.2,ya+1.45,p0[1]-nO[1]*0.2,0.5,2.9,0.5,Math.atan2(-e[1],e[0]),COL.wall,RECT[TM.plasterW],1);G.box(p0[0]-nO[0]*0.2,ya+2.95,p0[1]-nO[1]*0.2,0.62,0.12,0.62,Math.atan2(-e[1],e[0]),COL.trim,RECT[TM.plasterW],1)}}}}}
  /* ---- gate position for missions / map / NPCs: on the pavement in front of the real gate ---- */
  if(!MAP.isa.gate0)MAP.isa.gate0=MAP.isa.gate.slice();
  {const out=P(gateU,S.fenceD-1.6);MAP.isa.gate=[Math.round(out[0]*10)/10,Math.round(out[1]*10)/10];ISALM.gate=MAP.isa.gate}
  return true}
function buildGate(p,e,nO,y){const ry=Math.atan2(-e[1],e[0]);const gw=2.7;const a=[p[0]-e[0]*gw/2,p[1]-e[1]*gw/2],b=[p[0]+e[0]*gw/2,p[1]+e[1]*gw/2];
  for(const q of[a,b]){G.box(q[0]-nO[0]*0.2,y+1.55,q[1]-nO[1]*0.2,0.62,3.1,0.62,ry,COL.wall,RECT[TM.plasterW],1);G.box(q[0]-nO[0]*0.2,y+3.17,q[1]-nO[1]*0.2,0.76,0.14,0.76,ry,COL.trim,RECT[TM.plasterW],1);
    G.cyl(q[0]-nO[0]*0.2,y+3.24,q[1]-nO[1]*0.2,0.12,0.16,0.36,8,hx('#f2ecd8'),RECT[T.white],true,0.6)}
  const a2=[a[0]+e[0]*0.31-nO[0]*0.2,a[1]+e[1]*0.31-nO[1]*0.2],b2=[b[0]-e[0]*0.31-nO[0]*0.2,b[1]-e[1]*0.31-nO[1]*0.2];
  G.wall(a2[0],a2[1],b2[0],b2[1],y-0.05,y-0.05,y+0.02,y+0.02,nO[0],nO[1],0,2,0,.1,COL.trim,RECT[TM.marbleW],0);
  GC.wall(a2[0],a2[1],b2[0],b2[1],y+0.05,y+0.05,y+2.45,y+2.45,nO[0],nO[1],0,segLen(a2,b2)/1.2,0,1,COL.gateG,RECT[T.isaBars],0);
  for(const t of[0,0.5,1]){const q=[lerp(a2[0],b2[0],t),lerp(a2[1],b2[1],t)];G.box(q[0],y+1.25,q[1],0.07,2.4,0.07,ry,COL.gateG,RECT[T.metal],1)}
  for(const hh of[0.12,1.2,2.42])G.box(p[0]-nO[0]*0.2,y+hh,p[1]-nO[1]*0.2,segLen(a2,b2),0.07,0.07,ry,COL.gateG,RECT[T.metal],1);
  /* school name plaque on the left pier (plain text; the exact real plaque is not documented) */
  if(typeof newSlot==='function'){const sl=newSlot('INTERNATIONAL SCHOOL OF ATHENS','#f1ece0','#22324f','plain');if(sl){const q=[a[0]-e[0]*1.6+nO[0]*0.03,a[1]-e[1]*1.6+nO[1]*0.03];
    signAt(chunkAt(q[0],q[1]),q[0],y+1.55,q[1],nO[0],nO[1],1.9,0.5,null,0.4,sl)}}}

/* ============================== hooks ============================== */
/* keep the generic pitches (lines, hoops) and the OSM school-ground fill out of the campus: this file builds them at the real court level */
const _ba=typeof buildAreas==='function'?buildAreas:null;
if(_ba)buildAreas=function(){const pit=MAP.pitches,ar=MAP.areas;let poly=null;try{poly=unp(MAP.isa.poly)}catch(e){}
  if(poly){MAP.pitches=pit.filter(p=>!pip(poly,p[0],p[1]));MAP.areas=ar.filter(a=>{if(a[0]!=='pitch')return true;try{const r=unp(a[1][0]);let x=0,z=0;for(const p of r){x+=p[0]/r.length;z+=p[1]/r.length}return !pip(poly,x,z)}catch(e){return true}})}
  try{_ba()}finally{MAP.pitches=pit;MAP.areas=ar}};
/* trees: none on the courts; the trees on the school pavement of Artemidos in front of the facade are Aleppo pines (photo) */
const _pt=typeof plantTrees==='function'?plantTrees:null;
if(_pt)plantTrees=function(){const gt=MAP.garden_trees,st=MAP.street_trees;
  if(S.ok){MAP.garden_trees=gt.filter(t=>!pip(S.court,t[0]/10,t[1]/10));
    MAP.street_trees=st.map(t=>{const l=S.loc([t[0]/10,t[1]/10]);return(l[0]>-2&&l[0]<S.L+1&&l[1]<S.fenceD&&l[1]>S.fenceD-4)?[t[0],t[1],'pine'].concat(t.slice(3)):t})}
  try{_pt()}finally{MAP.garden_trees=gt;MAP.street_trees=st}};
LM.register({id:'isa',at:[[897,-410]],build(ctx){const fps=ctx.footprints||[];if(!fps.length){console.warn('lm-isa: ISA main building footprint not found');return}
  let big=fps[0];for(const f of fps)if(f.ps.length&&Math.abs(THREE.ShapeUtils.area(f.ps.map(p=>new THREE.Vector2(p[0],p[1]))))>Math.abs(THREE.ShapeUtils.area(big.ps.map(p=>new THREE.Vector2(p[0],p[1])))))big=f;
  ISA.poly=ISA.poly||unp(MAP.isa.poly);buildMain(big)}});
const _bi=typeof buildISA==='function'?buildISA:null;
buildISA=function(){let ok=false;try{ok=buildGrounds()}catch(e){console.error('lm-isa grounds failed',e)}if(!ok&&_bi)_bi()};
})();
