'use strict';
/* 89c_lm_ralphlauren.js — RALPH LAUREN in the listed 1910 villa "Οικία Κότσικα" (Kotsikas house), Κασσαβέτη 19 — hand-modelled landmark (bot lm-ralphlauren).
   Measurements and sources: docs/research/lm/ralphlauren.md. OSM way/1076768348 (map b425), Wikidata Q122260203.
   Local frame: u = along the front (west→east) from the front-left corner, w = outwards from the front facade (negative = into the house),
   y = metres above the courtyard at the foot of the steps. Wall pieces are authored in "frames" (s along a wall, t outwards from it).
   Public: RL_VILLA {Y0, toWorld(u,y,w), stairH(u,w)} for other modules (e.g. interiors/props) — read-only. */
const RL_VILLA={};
(function(){
if(typeof LM==='undefined'||typeof defTile!=='function')return;
const lin=h=>{const c=new THREE.Color(h);return[Math.pow(c.r,2.2),Math.pow(c.g,2.2),Math.pow(c.b,2.2)]};
const W1=[1,1,1];

/* ============================== material tiles (registered at script load) ============================== */
/* rough honey limestone: the PH stone_wall photo re-graded to the villa's stone (#c4a68a lit), stones drawn 1.5x larger (one tile = 3 m) */
defTile('rlStone',(g,S)=>{const src=typeof texSrc==='function'?texSrc('rubble'):null;if(!src){g.fillStyle='#c4a68a';g.fillRect(0,0,S,S);return}
  g.drawImage(src,0,0,S,S);const cv=g.canvas,N=cv.width,id=g.getImageData(0,0,N,N),d=id.data;
  const st=[[0,50,40,34],[.35,100,82,68],[.5,150,128,110],[.67,196,170,146],[.8,224,204,182],[.95,242,230,214],[1,248,240,228]];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const p=(y*N+x)*4,r=d[p],gg=d[p+1],b=d[p+2],L=(0.3*r+0.59*gg+0.11*b)/255;let k=1;while(k<st.length-1&&st[k][0]<L)k++;
    const a=st[k-1],c=st[k],t=clamp((L-a[0])/((c[0]-a[0])||1),0,1),xx=x/N,yy=y/N;
    const n=(Math.sin(xx*12.566+1.3)*Math.sin(yy*18.85+0.4)+Math.sin(xx*31.4+yy*12.566))*0.5;
    d[p]=clamp(a[1]+(c[1]-a[1])*t+(r-L*255)*0.45+n*14,0,255);d[p+1]=clamp(a[2]+(c[2]-a[2])*t+(gg-L*255)*0.45+n*4,0,255);d[p+2]=clamp(a[3]+(c[3]-a[3])*t+(b-L*255)*0.45-n*10,0,255)}
  g.putImageData(id,0,0)},{needs:['rubble'],nrm:'rubble',nrmK:1.15,spec:.03,shin:10,macro:.22});
/* small-paned white casement glazing: periodic grid, 4 panes across x 4 panes up per tile (u 0..1 = full window width) */
defTile('rlCase',(g,S,m)=>{const fc='#f4f2ec';
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){const x=c*60,y=r*60;const gr=g.createLinearGradient(0,y,0,y+60);gr.addColorStop(0,'#9aa3a8');gr.addColorStop(1,'#5d625f');g.fillStyle=gr;g.fillRect(x,y,60,60);
    g.fillStyle=(c===0||c===3)?'rgba(244,238,226,.55)':'rgba(255,236,200,.18)';g.fillRect(x+(c===0?4:c===3?20:8),y,c===0||c===3?36:44,60);m.fillStyle='#fff';m.fillRect(x,y,60,60)}
  g.fillStyle=fc;m.fillStyle='#000';for(const y of[0,60,120,180,240]){g.fillRect(0,y-3.5,S,7);m.fillRect(0,y-3.5,S,7)}
  for(const x of[0,60,180,240]){g.fillRect(x-3.5,0,7,S);m.fillRect(x-3.5,0,7,S)}g.fillRect(113,0,14,S);m.fillRect(113,0,14,S);
  g.fillStyle='rgba(0,0,0,.18)';for(const y of[3.5,63.5,123.5,183.5])g.fillRect(0,y,S,2)},{spec:.08,shin:90,glass:1,glassDark:.35,glowK:1.6});
/* bay display window: fanlight row with vertical bars on top, then one big lit pane showing the boutique (mannequins, framed pictures) */
defTile('rlShop',(g,S,m)=>{pGrad(g,0,0,S,S,'#f3ead8','#d9cbb2');
  g.fillStyle='#e9dfcc';g.fillRect(0,150,S,90);g.fillStyle='#b9a27e';g.fillRect(0,212,S,28);// floor
  for(const [x,y,w,h] of[[22,70,44,56],[170,62,52,64],[96,58,30,40]]){g.fillStyle='#3a2e22';g.fillRect(x-3,y-3,w+6,h+6);g.fillStyle='#d8cdb6';g.fillRect(x,y,w,h);g.fillStyle='#6f7d6a';g.fillRect(x+5,y+6,w-10,h-14)}
  const man=(x,top,coat,trou)=>{g.fillStyle='#e8dccb';g.beginPath();g.arc(x,top+8,7,0,TAU);g.fill();g.fillStyle=coat;g.fillRect(x-15,top+16,30,58);g.fillStyle=trou;g.fillRect(x-12,top+74,11,62);g.fillRect(x+1,top+74,11,62);g.fillStyle='#f4f1ea';g.fillRect(x-4,top+17,8,22);g.fillStyle='#202020';g.fillRect(x-14,top+138,28,4)};
  man(72,74,'#1d2740','#1b2235');man(122,70,'#5b4632','#2c2f3a');man(170,76,'#7c1c24','#d8d0bf');
  g.fillStyle='rgba(255,226,170,.35)';g.fillRect(0,0,S,S);
  m.fillStyle='#fff';m.fillRect(0,0,S,S);
  g.fillStyle='#f4f2ec';m.fillStyle='#000';g.fillRect(0,40,S,9);m.fillRect(0,40,S,9);for(let i=1;i<7;i++){g.fillRect(i*S/7-3,0,6,44);m.fillRect(i*S/7-3,0,6,44)}},
  {spec:.08,shin:100,glass:.9,glassDark:.2,glowK:2.4});
/* entrance door: dark blue-grey frame, two glazed leaves into the shop, fanlight with gold "RALPH LAUREN" on navy (plain text) */
defTile('rlDoor',(g,S,m)=>{const fr='#2f3a40';pRect(g,0,0,S,S,fr);
  pRect(g,10,8,S-20,44,'#1c2747');g.save();g.translate(S/2,38);g.scale(1.3,1);g.fillStyle='#d9b56c';g.font='bold 24px Georgia,serif';g.textAlign='center';g.fillText('RALPH LAUREN',0,0);g.restore();m.fillStyle='#fff';m.fillRect(10,8,S-20,44);
  for(const x0 of[16,124]){const w=100;pGrad(g,x0,64,w,170,'#f6efe2','#d8cab2');g.fillStyle='#5a4a3a';g.fillRect(x0+8,120,w-16,4);
    for(let i=0;i<7;i++){g.fillStyle=['#1d2740','#7c1c24','#e9e3d6','#3d4f3e','#c8b28a','#2a2a2c','#6d7f99'][i];g.fillRect(x0+12+i*12,124,9,52)}
    g.fillStyle='#8d6b45';g.fillRect(x0+10,196,w-20,30);g.strokeStyle='#6b5038';g.lineWidth=3;g.beginPath();g.moveTo(x0+w-18,232);g.lineTo(x0+w-46,70);g.stroke();
    m.fillStyle='#fff';m.fillRect(x0,64,w,170)}
  g.fillStyle='#c9a24a';g.fillRect(112,140,3,30);g.fillRect(125,140,3,30)},{spec:.1,shin:80,glass:.8,glassDark:.25,glowK:2.0});
/* navy box awning: plain canvas (v 0.5..1) and a valance strip with "RALPH LAUREN" in gold serif capitals (v 0..0.4) */
defTile('rlAwn',(g,S)=>{pRect(g,0,0,S,S,'#2b3a66');for(let x=0;x<S;x+=20){g.fillStyle='rgba(255,255,255,.035)';g.fillRect(x,0,10,S)}
  g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,118,S,8);
  g.save();g.translate(S/2,200);g.scale(0.36,1);g.fillStyle='#e6d7a6';g.font='bold 54px Georgia,"Times New Roman",serif';g.textAlign='center';g.textBaseline='middle';
  const t='R A L P H   L A U R E N';g.fillText(t,0,0,620);g.restore()},{spec:.02,shin:8});
/* pierced white stone balustrade panel (cut-out): one tile = 1.23 m x 0.85 m, three small round-arched slots */
defTile('rlBal',(g,S)=>{pRect(g,0,0,S,S,'#efebe3');speck(g,500,['#e2ddd2','#f7f4ee','#d9d3c7'],0.6,1.6,0.6);
  g.globalCompositeOperation='destination-out';for(let i=0;i<3;i++){const cx=40+i*80,w=24,top=70,bot=180;g.beginPath();g.moveTo(cx-w/2,bot);g.lineTo(cx-w/2,top+w/2);g.arc(cx,top+w/2,w/2,Math.PI,0);g.lineTo(cx+w/2,bot);g.closePath();g.fill()}
  g.globalCompositeOperation='source-over'},{cut:true,spec:.03,shin:12});
/* white painted timber railing (cut-out): one tile = 1 m x 0.85 m, nine turned balusters */
defTile('rlRail',(g,S)=>{g.clearRect(0,0,S,S);g.fillStyle='#f3f1ec';for(let i=0;i<9;i++){const cx=13+i*26.6;g.fillRect(cx-4,0,8,S);g.fillRect(cx-6,40,12,20);g.fillRect(cx-6,170,12,24);g.beginPath();g.ellipse(cx,118,6.5,30,0,0,TAU);g.fill()}},{cut:true,spec:.03,shin:14});
/* fluted white frieze under the first-floor cornice: one tile = 0.6 m x 0.35 m */
defTile('rlFrieze',(g,S)=>{pRect(g,0,0,S,S,'#f1eee7');for(let i=0;i<12;i++){const x=i*20;const gr=g.createLinearGradient(x+3,0,x+20,0);gr.addColorStop(0,'#b9b3a8');gr.addColorStop(.35,'#ddd8cf');gr.addColorStop(1,'#faf8f3');g.fillStyle=gr;g.fillRect(x+3,34,17,172)}
  pRect(g,0,0,S,26,'#f6f3ee');pRect(g,0,26,S,5,'#c9c3b8');pRect(g,0,212,S,28,'#f6f3ee');pRect(g,0,208,S,4,'#d2ccc1')},{spec:.03,shin:12});

/* ============================== geometry helpers ============================== */
let G=null,GC=null,OX=161.5,OZ=62.8,UX=0.95281,UZ=0.30355,Y0=0;
const P=(u,y,w)=>[OX+UX*u-UZ*w,Y0+y,OZ+UZ*u+UX*w];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const nrmz=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]};
/* frames: wall line from a=[u,w] in direction d (unit); outward normal n = (-d.w, d.u). FP -> local [u,y,w] */
function frame(a,b){const du=b[0]-a[0],dw=b[1]-a[1],L=Math.hypot(du,dw);return{a:[a[0],a[1]],d:[du/L,dw/L],L}}
const F0={a:[0,0],d:[1,0],L:1};
const FP=(F,s,y,t)=>[F.a[0]+F.d[0]*s-F.d[1]*t,y,F.a[1]+F.d[1]*s+F.d[0]*t];
/* local quad (points [u,y,w]); uv optional; planar metric uv by the dominant axis otherwise */
function luv(n,p,sc){const ax=Math.abs(n[0]),ay=Math.abs(n[1]),az=Math.abs(n[2]);if(ay>=ax&&ay>=az)return[p[0]/sc,-p[2]*(n[1]>=0?1:-1)/sc];if(az>=ax)return[p[0]*(n[2]>=0?1:-1)/sc,p[1]/sc];return[-p[2]*(n[0]>=0?1:-1)/sc,p[1]/sc]}
function lq(g,a,b,c,d,col,tile,sc,gl,uv){const n=crs(sub(b,a),sub(c,a));uv=uv||[luv(n,a,sc),luv(n,b,sc),luv(n,c,sc),luv(n,d,sc)];
  g.quad(P(a[0],a[1],a[2]),P(b[0],b[1],b[2]),P(c[0],c[1],c[2]),P(d[0],d[1],d[2]),uv[0],uv[1],uv[2],uv[3],col,RECT[tile],gl||0)}
function lt(g,a,b,c,col,tile,sc,gl,uv){const n=crs(sub(b,a),sub(c,a));uv=uv||[luv(n,a,sc),luv(n,b,sc),luv(n,c,sc)];g.tri(P(a[0],a[1],a[2]),P(b[0],b[1],b[2]),P(c[0],c[1],c[2]),uv[0],uv[1],uv[2],col,RECT[tile],gl||0)}
/* oriented: flip winding so the face normal points along `out` */
function oq(g,a,b,c,d,out,col,tile,sc,gl,uv){const n=crs(sub(b,a),sub(c,a));if(dot(n,out)<0){lq(g,d,c,b,a,col,tile,sc,gl,uv?[uv[3],uv[2],uv[1],uv[0]]:null)}else lq(g,a,b,c,d,col,tile,sc,gl,uv)}
function ot(g,a,b,c,out,col,tile,sc,gl,uv){const n=crs(sub(b,a),sub(c,a));if(dot(n,out)<0)lt(g,c,b,a,col,tile,sc,gl,uv?[uv[2],uv[1],uv[0]]:null);else lt(g,a,b,c,col,tile,sc,gl,uv)}
/* frame quad / box (frame coords [s,y,t]) */
function fq(F,g,p0,p1,p2,p3,col,tile,sc,gl,uv){const a=FP(F,p0[0],p0[1],p0[2]),b=FP(F,p1[0],p1[1],p1[2]),c=FP(F,p2[0],p2[1],p2[2]),d=FP(F,p3[0],p3[1],p3[2]);
  if(!uv){const n=crs(sub(p1,p0),sub(p2,p0));const m=p=>{const ax=Math.abs(n[0]),ay=Math.abs(n[1]),az=Math.abs(n[2]);if(ay>=ax&&ay>=az)return[p[0]/sc,-p[2]*(n[1]>=0?1:-1)/sc];if(az>=ax)return[p[0]*(n[2]>=0?1:-1)/sc+F.o0,p[1]/sc];return[-p[2]*(n[0]>=0?1:-1)/sc,p[1]/sc]};
    F.o0=F.o0||0;uv=[m(p0),m(p1),m(p2),m(p3)]}
  lq(g,a,b,c,d,col,tile,sc,gl,uv)}
function fbox(F,g,s0,s1,y0,y1,t0,t1,col,tile,sc,gl,skip){const f=c=>!skip||skip.indexOf(c)<0;
  if(f('f'))fq(F,g,[s0,y0,t1],[s1,y0,t1],[s1,y1,t1],[s0,y1,t1],col,tile,sc,gl);if(f('b'))fq(F,g,[s1,y0,t0],[s0,y0,t0],[s0,y1,t0],[s1,y1,t0],col,tile,sc,gl);
  if(f('r'))fq(F,g,[s1,y0,t1],[s1,y0,t0],[s1,y1,t0],[s1,y1,t1],col,tile,sc,gl);if(f('l'))fq(F,g,[s0,y0,t0],[s0,y0,t1],[s0,y1,t1],[s0,y1,t0],col,tile,sc,gl);
  if(f('t'))fq(F,g,[s0,y1,t1],[s1,y1,t1],[s1,y1,t0],[s0,y1,t0],col,tile,sc,gl);if(f('d'))fq(F,g,[s0,y0,t0],[s1,y0,t0],[s1,y0,t1],[s0,y0,t1],col,tile,sc,gl)}
/* beam between two local points with a w x h section */
function beam(g,p,q,w,h,col,tile,sc,ends){const e=nrmz(sub(q,p));const up=Math.abs(e[1])<0.95?[0,1,0]:[1,0,0];const sd=nrmz(crs(e,up)),u2=crs(sd,e);
  const C=(o,a,b)=>[o[0]+sd[0]*a+u2[0]*b,o[1]+sd[1]*a+u2[1]*b,o[2]+sd[2]*a+u2[2]*b];const hw=w/2,hh=h/2;
  const k=[[hw,hh],[-hw,hh],[-hw,-hh],[hw,-hh]];for(let i=0;i<4;i++){const a=k[i],b=k[(i+1)%4];const out=[sd[0]*(a[0]+b[0])+u2[0]*(a[1]+b[1]),sd[1]*(a[0]+b[0])+u2[1]*(a[1]+b[1]),sd[2]*(a[0]+b[0])+u2[2]*(a[1]+b[1])];
    oq(g,C(p,a[0],a[1]),C(q,a[0],a[1]),C(q,b[0],b[1]),C(p,b[0],b[1]),out,col,tile,sc||1)}
  if(ends!==false){oq(g,C(q,hw,hh),C(q,-hw,hh),C(q,-hw,-hh),C(q,hw,-hh),e,col,tile,sc||1);oq(g,C(p,hw,hh),C(p,-hw,hh),C(p,-hw,-hh),C(p,hw,-hh),[-e[0],-e[1],-e[2]],col,tile,sc||1)}}
/* ellipsoid blob (shrubs, finial balls) in local coords */
function blob(g,cu,cy,cw,ru,ry,rw,col,tile,sc,seg,seed){seg=seg||7;const ring=Math.max(3,seg-2);const pt=(i,j)=>{const th=i/ring*Math.PI,ph=j/seg*TAU;const jit=1+((hf((seed||1)*131+i*17+j*7)-0.5)*0.22);
  return[cu+Math.sin(th)*Math.cos(ph)*ru*jit,cy+Math.cos(th)*ry*jit,cw+Math.sin(th)*Math.sin(ph)*rw*jit]};
  for(let i=0;i<ring;i++)for(let j=0;j<seg;j++){const a=pt(i,j),b=pt(i,j+1),c=pt(i+1,j+1),d=pt(i+1,j);const m=[(a[0]+c[0])/2-cu,(a[1]+c[1])/2-cy,(a[2]+c[2])/2-cw];
    oq(g,a,b,c,d,m,col,tile,sc||1.5)}}
/* convex polygon clip in plan (u,w): keep a*u+b*w <= c */
function clip(poly,a,b,c){const o=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];const fp=a*p[0]+b*p[1]-c,fq2=a*q[0]+b*q[1]-c;
  if(fp<=0)o.push(p);if((fp<0&&fq2>0)||(fp>0&&fq2<0)){const t=fp/(fp-fq2);o.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t])}}return o}
/* planar roof polygon: plan points, height function, upward normal; uv = (along eave, up the slope) from an eave origin/direction */
function roofPoly(g,poly,yf,col,tile,eave){if(poly.length<3)return;const pts=poly.map(p=>[p[0],yf(p[0],p[1]),p[1]]);
  const uvf=p=>{const du=p[0]-eave.o[0],dw=p[2]-eave.o[1];const along=du*eave.d[0]+dw*eave.d[1];const across=-(du*eave.d[1])+dw*eave.d[0];return[along,Math.abs(across)*eave.k]};
  for(let i=1;i<pts.length-1;i++)ot(g,pts[0],pts[i],pts[i+1],[0,1,0],col,tile,1,0,[uvf(pts[0]),uvf(pts[i]),uvf(pts[i+1])])}

/* wall with openings in frame F (face at t=0, outward +t). prof: number or [[s,y],...] top line (vertical steps allowed by repeating s).
   ops: {s0,s1,y0,y1, rise (arch rise, 0 = square head), dep (reveal depth), kind:'glass'|'hole', tile, uv:(s,y)->[u,v], gl, frame:'#hex'|null, sill, sur, arch:'seg'} */
function wall(F,s0,s1,yb,prof,ops,o){o=o||{};const g=o.g||G,tile=o.tile===undefined?T.rlStone:o.tile,col=o.col||W1,sc=o.sc||3.0;ops=ops||[];F.o0=o.uo||0;
  const PR=typeof prof==='number'?[[s0,prof],[s1,prof]]:prof;
  const seg=s=>{for(let k=0;k<PR.length-1;k++)if(PR[k][0]<=s&&s<=PR[k+1][0]&&PR[k+1][0]>PR[k][0])return k;return-1};
  const at=(k,s)=>{const a=PR[k],b=PR[k+1];return a[1]+(b[1]-a[1])*(s-a[0])/(b[0]-a[0])};
  const xs=new Set([s0,s1]),ys=new Set([yb]);for(const p of PR){if(p[0]>s0&&p[0]<s1)xs.add(p[0]);ys.add(p[1])}
  for(const q of ops){xs.add(clamp(q.s0,s0,s1));xs.add(clamp(q.s1,s0,s1));ys.add(q.y0);ys.add(q.y1)}
  const yl=[...ys].sort((a,b)=>a-b);for(let k=0;k<PR.length-1;k++){const a=PR[k],b=PR[k+1];if(b[0]<=a[0])continue;for(const y of yl){if((a[1]-y)*(b[1]-y)<0){xs.add(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]))}}}
  const xl=[...xs].filter(s=>s>=s0&&s<=s1).sort((a,b)=>a-b);
  for(let i=0;i<xl.length-1;i++){const sa=xl[i],sb=xl[i+1];if(sb-sa<1e-4)continue;const sm=(sa+sb)/2,k=seg(sm);if(k<0)continue;const pa=at(k,sa),pb=at(k,sb);
    for(let j=0;j<yl.length-1;j++){const ya=yl[j],yb2=yl[j+1];if(yb2-ya<1e-4)continue;const ym=(ya+yb2)/2;
      if(ops.some(q=>sm>q.s0&&sm<q.s1&&ym>q.y0&&ym<q.y1))continue;if(Math.max(pa,pb)<=ya+1e-4)continue;
      const ta=Math.min(yb2,pa),tb=Math.min(yb2,pb);fq(F,g,[sa,ya,0],[sb,ya,0],[sb,tb,0],[sa,ta,0],col,tile,sc,0)}}
  for(const q of ops)opening(F,q,o)}
function opening(F,q,o){if(q.kind==='hole')return;const g=o.g||G,tile=o.tile===undefined?T.rlStone:o.tile,col=o.col||W1,sc=o.sc||3.0;
  const dep=q.dep||0.3,rise=q.rise||0,ys=q.y1-rise,s0=q.s0,s1=q.s1,wd=s1-s0;
  const gu=q.uv||((s,y)=>[(s-s0)/wd,(y-q.y0)/(q.y1-q.y0)]);const gt=q.tile||T.rlCase,gc=q.gcol||W1,gl=q.gl===undefined?1:q.gl;
  // jambs + sill (+ head)
  fq(F,g,[s0,q.y0,0],[s0,q.y0,-dep],[s0,ys,-dep],[s0,ys,0],col,tile,sc,0);fq(F,g,[s1,q.y0,-dep],[s1,q.y0,0],[s1,ys,0],[s1,ys,-dep],col,tile,sc,0);
  fq(F,g,[s0,q.y0,0],[s1,q.y0,0],[s1,q.y0,-dep],[s0,q.y0,-dep],q.sillCol||col,q.sillTile||tile,sc,0);
  fq(F,g,[s0,ys,-dep],[s1,ys,-dep],[s1,ys,0],[s0,ys,0],col,tile,sc,0);
  // glass (rectangular part)
  const u0=gu(s0,q.y0),u1=gu(s1,q.y0),u2=gu(s1,ys),u3=gu(s0,ys);fq(F,g,[s0,q.y0,-dep],[s1,q.y0,-dep],[s1,ys,-dep],[s0,ys,-dep],gc,gt,1,gl,[u0,u1,u2,u3]);
  // arch: strips (wall spandrel above the curve, glass below it, soffit along it)
  if(rise>0){const c=wd/2,R=(c*c+rise*rise)/(2*rise),yc=q.y1-R,sm=(s0+s1)/2,n=q.n||10;const cy=s=>yc+Math.sqrt(Math.max(0,R*R-(s-sm)*(s-sm)));
    for(let i=0;i<n;i++){const a=s0+wd*i/n,b=s0+wd*(i+1)/n,ya=Math.max(ys,cy(a)),yb=Math.max(ys,cy(b));
      fq(F,g,[a,ya,0],[b,yb,0],[b,q.y1,0],[a,q.y1,0],col,tile,sc,0);
      fq(F,g,[a,ys,-dep],[b,ys,-dep],[b,yb,-dep],[a,ya,-dep],gc,gt,1,gl,[gu(a,ys),gu(b,ys),gu(b,yb),gu(a,ya)]);
      fq(F,g,[a,ya,0],[a,ya,-dep],[b,yb,-dep],[b,yb,0],col,tile,sc,0);
      if(q.frame)fq(F,g,[a,ya-0.07,-dep+0.03],[b,yb-0.07,-dep+0.03],[b,yb,-dep+0.03],[a,ya,-dep+0.03],lin(q.frame),T.white,1,0,[[0,0],[1,0],[1,1],[0,1]]);
    }
    if(q.vous){const nv=q.vous,dv=0.34;
      const th0=Math.asin(Math.min(1,c/R));const vc=lin('#ead9bd');for(let i=0;i<nv;i++){if(i%2)continue;const t0=-th0+2*th0*i/nv,t1=-th0+2*th0*(i+1)/nv;const pa=[sm+Math.sin(t0)*R,yc+Math.cos(t0)*R],pb=[sm+Math.sin(t1)*R,yc+Math.cos(t1)*R];
        const qa=[sm+Math.sin(t0)*(R+dv*(i===nv>>1?1.25:1)),yc+Math.cos(t0)*(R+dv*(i===nv>>1?1.25:1))],qb=[sm+Math.sin(t1)*(R+dv*(i===nv>>1?1.25:1)),yc+Math.cos(t1)*(R+dv*(i===nv>>1?1.25:1))];
        fq(F,g,[pa[0],pa[1],0.03],[pb[0],pb[1],0.03],[qb[0],qb[1],0.03],[qa[0],qa[1],0.03],vc,TM.ashlar,1.2,0)}}}
  // white frame at the glass
  if(q.frame){const fc=lin(q.frame),ft=0.07,t=-dep+0.002;fbox(F,g,s0,s0+ft,q.y0,ys,t,t+0.06,fc,T.white,1,0,'bd');fbox(F,g,s1-ft,s1,q.y0,ys,t,t+0.06,fc,T.white,1,0,'bd');
    fbox(F,g,s0,s1,q.y0,q.y0+ft,t,t+0.06,fc,T.white,1,0,'bd');if(!rise)fbox(F,g,s0,s1,ys-ft,ys,t,t+0.06,fc,T.white,1,0,'bd');
    if(q.transom)fbox(F,g,s0,s1,q.transom-0.04,q.transom+0.04,t,t+0.07,fc,T.white,1,0,'b')}
  // projecting sill
  if(q.sill)fbox(F,g,s0-0.1,s1+0.1,q.y0-0.09,q.y0+0.01,-0.02,0.08,lin('#ece7dd'),TM.marble,1,0,'b');
  // block surround (alternating dressed blocks on both jambs)
  if(q.sur){const bc=lin('#f0dcbc');let y=q.y0,k=0;while(y<ys-0.05){const h=Math.min(0.34,ys-y),L=k%2?0.26:0.42;fbox(F,g,s0-L,s0,y+0.015,y+h-0.015,0,0.035,bc,TM.ashlar,1.2,0,'b');fbox(F,g,s1,s1+L,y+0.015,y+h-0.015,0,0.035,bc,TM.ashlar,1.2,0,'b');y+=h;k++}}}
/* long-and-short quoins at a corner between frame F (at s=sEnd, running back along -s) and the next wall (Fn, at s=0, along +s) */
function quoins(F,sEnd,Fn,y0,y1,skipY,o){o=o||{};const bc=o.col||lin('#e9d2ae'),hgt=0.33,pr=0.035;let y=y0,k=0;
  while(y<y1-0.08){const h=Math.min(hgt,y1-y);if(!(skipY&&y+h>skipY[0]&&y<skipY[1])){const La=k%2?0.32:0.58,Lb=k%2?0.58:0.32;
    if(F)fbox(F,G,sEnd-La,sEnd+pr,y+0.012,y+h-0.012,0,pr,bc,TM.ashlar,1.2,0,'b');if(Fn)fbox(Fn,G,-pr,Lb,y+0.012,y+h-0.012,0,pr,bc,TM.ashlar,1.2,0,'b')}y+=h;k++}}
/* projecting moulded band along a wall: stacked boxes [y0,y1,proj,tile,col] */
function band(F,s0,s1,layers,ext){for(const [y0,y1,pr,tile,col,sc,fit] of layers){const e=ext===undefined?pr:ext;fbox(F,G,s0-e,s1+e,y0,y1,0,pr,col,tile,sc||1,0,fit?'bf':'b');
  if(fit)fq(F,G,[s0-e,y0,pr],[s1+e,y0,pr],[s1+e,y1,pr],[s0-e,y1,pr],col,tile,1,0,[[(s0-e)/sc,0],[(s1+e)/sc,0],[(s1+e)/sc,1],[(s0-e)/sc,1]])}}
const WHITE=lin('#f1ede6'),WOOD=lin('#f2f0eb'),IRON=lin('#17181a');
const CORN=[[5.3,5.65,0.06,T.rlFrieze,W1,0.6,true],[5.65,5.75,0.12,TM.plaster,WHITE,1],[5.75,5.95,0.2,TM.plaster,WHITE,1],[5.95,6.05,0.26,TM.plaster,lin('#f6f3ee'),1]];
const PLB=[[1.52,1.68,0.06,TM.marble,lin('#f2efe9'),1]];

/* ============================== the villa ============================== */
// key heights (see docs/research/lm/ralphlauren.md)
const FL=1.65,EM=10.0,EW=10.8,UW=5.1,UE=11.86,AP=13.9,DB=-11.8,AN=8.0;
let UR=8.48,KS=(AP-EM)/(UR-UW);
const BAY={b0:5.98,b1:10.98,f0:6.83,f1:10.13,pj:1.5};
function stairH(u,w){if(w<0||w>3.72)return 0;const uL=0.75-0.1375*w,uR=4.85+0.1375*w;if(u<uL-0.02||u>uR+0.02)return 0;if(w<1.0)return FL;const k=Math.min(10,Math.ceil((w-1.0)/0.3));return Math.max(0,FL-0.165*k)}

function buildVilla(ctx){
  const fp=(ctx.footprints||[])[0];if(!fp)return;const ps=fp.ps;
  // anchor the local frame on the real OSM corners (front-left and front-right)
  const near=(x,z)=>{let best=null,bd=4;for(const p of ps){const d=Math.hypot(p[0]-x,p[1]-z);if(d<bd){bd=d;best=p}}return best};
  const A=near(161.5,62.8),B=near(172.8,66.4);if(A&&B){const L=Math.hypot(B[0]-A[0],B[1]-A[1]);OX=A[0];OZ=A[1];UX=(B[0]-A[0])/L;UZ=(B[1]-A[1])/L}
  const toL=(x,z)=>{const dx=x-OX,dz=z-OZ;return[dx*UX+dz*UZ,-dx*UZ+dz*UX]};
  let tmin=Infinity;for(const p of ps)tmin=Math.min(tmin,terr(p[0],p[1]));
  const foot=[OX+UX*3-UZ*4.4,OZ+UZ*3+UX*4.4];Y0=Math.max(terr(foot[0],foot[1]),typeof groundY==='function'?groundY(foot[0],foot[1]):-1e9);
  const YB=tmin-Y0-0.35;
  const cw=P(6,0,-9);const ch=chunkAt(cw[0],cw[2]);G=ch.o;GC=ch.cut;
  RL_VILLA.Y0=Y0;RL_VILLA.toWorld=P;RL_VILLA.toLocal=toL;RL_VILLA.stairH=stairH;
  const L=ps.map(p=>toL(p[0],p[1]));// OSM outline in local coords
  const pick=(u,w)=>{let best=[u,w],bd=1.2;for(const p of L){const d=Math.hypot(p[0]-u,p[1]-w);if(d<bd){bd=d;best=p}}return best};
  const cFR=pick(UE,0),cER=pick(11.98,-11.79),cST=pick(11.16,-11.74),cBR=pick(11.2,-18.9),cBL=pick(1.62,-18.99),cWN=pick(1.56,-14.87),cWW=pick(0.10,-14.83);
  const Ue=cFR[0];
  // ---------- FRONT: west wing ----------
  const Fw=frame([0,0],[UW,0]);
  const dorm=[2.35,3.6],dC=(dorm[0]+dorm[1])/2;
  const wingProf=[[0,EW],[dorm[0],EW],[dorm[0],12.0],[dC,12.62],[dorm[1],12.0],[dorm[1],EW],[UW,EW]];
  const door={s0:1.82,s1:4.02,y0:FL,y1:4.63,rise:0.35,dep:0.38,tile:T.rlDoor,gl:1,n:12,vous:11};
  const wWin={s0:2.3,s1:3.6,y0:6.65,y1:9.0,rise:0.28,dep:0.3,frame:'#f4f2ec',transom:8.25,uv:(s,y)=>[(s-2.3)/1.3,(y-6.65)/1.47],sill:true,vous:9};
  const dWin={s0:2.52,s1:3.42,y0:9.97,y1:11.7,rise:0.2,dep:0.25,frame:'#f4f2ec',transom:11.1,uv:(s,y)=>[(s-2.52)/0.9*0.5,(y-9.97)/1.15],n:8};
  wall(Fw,0,UW,YB,wingProf,[door,wWin,dWin]);
  // marble apron under the wing window, dormer ledge and its little iron railing
  fbox(Fw,G,2.18,3.72,6.05,6.62,0,0.03,lin('#ece8e0'),TM.marbleW,1,0,'b');
  fbox(Fw,G,2.0,3.9,9.55,9.72,0,0.32,lin('#efebe4'),TM.plaster,1,0,'b');fbox(Fw,G,2.1,3.8,9.72,9.92,0,0.2,lin('#e6d3b2'),TM.ashlar,1.2,0,'b');
  GC.quad(P(...FP(Fw,2.52,9.97,0.06)),P(...FP(Fw,3.42,9.97,0.06)),P(...FP(Fw,3.42,10.55,0.06)),P(...FP(Fw,2.52,10.55,0.06)),[0,0],[0.9,0],[0.9,0.6],[0,0.6],IRON,RECT[T.rail],0);
  // ---------- FRONT: gable section (the wall behind the bay is hidden) ----------
  const Fg=frame([UW,0],[Ue,0]);const gs=s=>s-UW;
  const gProf=[[0,EM],[gs(UR),AP],[gs(Ue),EM]];
  const fWin={s0:gs(7.53),s1:gs(9.43),y0:6.08,y1:8.6,rise:0.3,dep:0.3,frame:'#f4f2ec',transom:7.95,uv:(s,y)=>[(s-gs(7.53))/1.9,(y-6.08)/1.32]};
  const aWin={s0:gs(7.86),s1:gs(9.1),y0:9.75,y1:11.45,rise:0.26,dep:0.28,frame:'#f4f2ec',transom:10.85,uv:(s,y)=>[(s-gs(7.86))/1.24,(y-9.75)/1.1],vous:9};
  wall(Fg,0,gs(Ue),YB,gProf,[{s0:gs(BAY.b0),s1:gs(BAY.b1),y0:YB,y1:6.05,kind:'hole'},fWin,aWin],{uo:1.7});
  // ---------- BAY (canted, 3 faces) ----------
  const Bl=frame([BAY.b0,0],[BAY.f0,BAY.pj]),Bf=frame([BAY.f0,BAY.pj],[BAY.f1,BAY.pj]),Br=frame([BAY.f1,BAY.pj],[BAY.b1,0]);
  const bwin={s0:0.7,s1:2.6,y0:1.8,y1:4.9,rise:0.45,dep:0.32,tile:T.rlShop,gl:1,n:12,frame:'#f4f2ec',uv:(s,y)=>[(s-0.7)/1.9,(y-1.8)/3.1]};
  wall(Bf,0,Bf.L,YB,5.3,[bwin]);
  for(const Fs of[Bl,Br]){const m=Fs.L/2;wall(Fs,0,Fs.L,YB,5.3,[{s0:m-0.25,s1:m+0.25,y0:1.85,y1:4.85,rise:0.25,dep:0.3,tile:T.rlShop,gl:1,n:8,frame:'#f4f2ec',uv:(s,y)=>[(s-m+0.25)/0.5*0.3+0.35,(y-1.85)/3.0]}]);
    // banded rusticated piers either side of the side light
    for(const [a,b] of[[0.04,m-0.25],[m+0.25,Fs.L-0.04]]){let y=1.78;while(y<5.25){fbox(Fs,G,a,b,y+0.025,Math.min(5.3,y+0.3)-0.025,0,0.07,lin('#e3cba6'),TM.ashlar,1.1,0,'b');y+=0.3}}}
  for(const [a,b] of[[0.04,0.7],[2.6,Bf.L-0.04]]){let y=1.78;while(y<5.25){fbox(Bf,G,a,b,y+0.025,Math.min(5.3,y+0.3)-0.025,0,0.07,lin('#e3cba6'),TM.ashlar,1.1,0,'b');y+=0.3}}
  // bay plinth sill band, vent, cornice, balcony floor and pierced balustrade
  for(const Fs of[Bl,Bf,Br]){band(Fs,0,Fs.L,[[1.6,1.78,0.08,TM.marble,lin('#f2efe9'),1]],0.0);band(Fs,0,Fs.L,CORN,0.0)}
  fbox(Bf,G,1.35,1.95,0.45,0.85,0,0.02,lin('#e9e6e0'),T.white,1,0,'b');fbox(Bf,G,1.42,1.88,0.5,0.8,0.02,0.025,lin('#2a2b2c'),TM.metal,1,0,'b');
  const bayTop=[[BAY.b0,0],[BAY.f0,BAY.pj],[BAY.f1,BAY.pj],[BAY.b1,0]];
  roofPoly(G,bayTop,()=>6.05,lin('#e9e5dc'),TM.marble,{o:[0,0],d:[1,0],k:1});
  for(const Fs of[Bl,Bf,Br]){const i0=0.1,i1=Fs.L-0.1;fbox(Fs,G,i0,i1,6.05,6.18,-0.24,-0.02,WHITE,TM.plaster,1,0,'b');
    GC.quad(P(...FP(Fs,i0,6.18,-0.12)),P(...FP(Fs,i1,6.18,-0.12)),P(...FP(Fs,i1,7.02,-0.12)),P(...FP(Fs,i0,7.02,-0.12)),[0,0],[(i1-i0)/1.23,0],[(i1-i0)/1.23,1],[0,1],W1,RECT[T.rlBal],0);
    fbox(Fs,G,i0-0.04,i1+0.04,7.02,7.17,-0.26,0.0,lin('#f4f1eb'),TM.plaster,1,0,'b')}
  // ---------- side and back walls (OSM outline) ----------
  const archW=(s,y0,y1,w)=>({s0:s-w/2,s1:s+w/2,y0,y1,rise:w/2,dep:0.3,frame:'#f4f2ec',n:10,sill:true,uv:(ss,yy)=>[(ss-s+w/2)/w*0.5,(yy-y0)/1.0]});
  const Fe=frame([Ue,0],cER);wall(Fe,0,Fe.L,YB,EM,[archW(3.0,1.95,4.75,0.95),archW(7.6,1.95,4.75,0.95),archW(3.0,6.6,8.9,0.9),archW(7.6,6.6,8.9,0.9)],{uo:0.4});
  const Fst=frame(cER,cST);wall(Fst,0,Fst.L,YB,EM,[]);
  const Fea=frame(cST,cBR);wall(Fea,0,Fea.L,YB,AN+0.35,[archW(2.2,1.95,4.75,0.95),archW(5.2,1.95,4.75,0.95),archW(2.2,6.35,7.65,0.8),archW(5.2,6.35,7.65,0.8)],{uo:0.9});
  const Fb=frame(cBR,cBL);wall(Fb,0,Fb.L,YB,AN+0.35,[archW(1.9,1.95,4.6,0.9),archW(4.8,1.95,4.6,0.9),archW(7.7,1.95,4.6,0.9),archW(1.9,6.35,7.65,0.8),archW(4.8,6.35,7.65,0.8),archW(7.7,6.35,7.65,0.8)],{uo:2.1});
  const Fwn=frame(cBL,cWN);wall(Fwn,0,Fwn.L,YB,AN+0.35,[archW(2.06,1.95,4.6,0.9),archW(2.06,6.35,7.65,0.8)]);
  const Fnn=frame(cWN,cWW);wall(Fnn,0,Fnn.L,YB,AN+0.35,[]);
  const wBack=[cWW[0]+(0-cWW[0])*((DB-cWW[1])/(0-cWW[1])),DB];
  const Fwa=frame(cWW,wBack);wall(Fwa,0,Fwa.L,YB,AN+0.35,[archW(Fwa.L/2,1.95,4.6,0.9)]);
  const Fwm=frame(wBack,[0,0]);wall(Fwm,0,Fwm.L,YB,EW,[archW(Fwm.L-3.0,1.95,4.75,0.95),archW(Fwm.L-7.6,1.95,4.75,0.95),archW(Fwm.L-3.0,6.6,8.9,0.9),archW(Fwm.L-7.6,6.6,8.9,0.9)],{uo:1.3});
  // back wall of the main block above the annex roof (gable + wing)
  const Fbk=frame([cER[0],DB],[0,DB]);const bs=u=>cER[0]-u;
  wall(Fbk,0,Fbk.L,AN,[[0,EM],[bs(UR),AP],[bs(UW),EM],[bs(UW),EW],[Fbk.L,EW]],[{s0:bs(9.0),s1:bs(7.96),y0:9.6,y1:11.0,rise:0.52,dep:0.25,frame:'#f4f2ec',uv:(s,y)=>[(s-bs(9.0))/1.04*0.5,(y-9.6)/1.0]}]);
  // wing east wall strip above the main roof
  wall(frame([UW,0],[UW,DB]),0,11.8,EM-0.2,EW+0.15,[]);
  // ---------- bands, plinth course, quoins ----------
  band(Fw,0,Fw.L,CORN,0.06);band(Fwm,Fwm.L-0.45,Fwm.L,PLB,0.06);
  for(const [F,ext] of[[Fg,0.0],[Fe,0.26],[Fea,0.26],[Fb,0.26],[Fwa,0.26],[Fwm,0.26],[Fwn,0.26]]){band(F,0,F.L,CORN,ext);band(F,0,F.L,PLB,0.06)}
  band(Fst,0,Fst.L,CORN,0);band(Fnn,0,Fnn.L,CORN,0);
  const SK=[5.25,6.1];
  quoins(Fwm,Fwm.L,Fw,1.68,EW-0.1,SK);quoins(Fg,Fg.L,Fe,1.68,EM-0.1,SK);
  quoins(null,0,Fg,1.68,EM-0.1,SK,{});// pier of the gable section next to the wing (front only)
  quoins(Fea,Fea.L,Fb,1.68,AN,SK);quoins(Fb,Fb.L,Fwn,1.68,AN,SK);quoins(Fe,Fe.L,null,1.68,EM-0.1,SK);
  // annex parapet coping + flat roof
  const annex=[cST,cBR,cBL,cWN,cWW,wBack,[cER[0],DB]];
  roofPoly(G,annex,()=>AN,lin('#c9c4ba'),TM.flatroof,{o:[0,0],d:[1,0],k:1});
  for(const F of[Fea,Fb,Fwn,Fnn,Fwa])fbox(F,G,-0.05,F.L+0.05,AN+0.35,AN+0.45,-0.3,0.06,lin('#efebe4'),TM.plaster,1,0,'');
  // ---------- ROOFS ----------
  const TC=lin('#d98b6e'),SOF=lin('#f3f1ec');
  // main gable roof (ridge along w), front overhang 0.75, east overhang to 12.5
  const yr0=AP+0.15,wF=0.75,wBk=DB-0.45,uEo=Ue+0.66,yE=yr0-(uEo-UR)*KS,yW=yr0-(UR-UW)*KS;const sl=Math.hypot(1,KS);
  oq(G,[uEo,yE,wF],[uEo,yE,wBk],[UR,yr0,wBk],[UR,yr0,wF],[1,1,0],TC,TM.tiles,1,0,[[-wF,0],[-wBk,0],[-wBk,(uEo-UR)*sl],[-wF,(uEo-UR)*sl]]);
  oq(G,[UW-0.02,yW,wBk],[UW-0.02,yW,wF],[UR,yr0,wF],[UR,yr0,wBk],[-1,1,0],TC,TM.tiles,1,0,[[wBk,0],[wF,0],[wF,(UR-UW)*sl],[wBk,(UR-UW)*sl]]);
  beam(G,[UR,yr0+0.06,wF+0.05],[UR,yr0+0.06,wBk-0.05],0.26,0.16,lin('#b85c3f'),TM.tiles,1);
  // undersides of the overhangs (white boards)
  const ub=0.2;oq(G,[Ue,yr0-(Ue-UR)*KS-ub,wF],[uEo,yE-ub,wF],[uEo,yE-ub,wBk],[Ue,yr0-(Ue-UR)*KS-ub,wBk],[0,-1,0],SOF,TM.wood,1);
  for(const sgn of[1,-1]){const ue=sgn>0?uEo:UW;const ye=sgn>0?yE:yW;oq(G,[UR,yr0-ub,0],[ue,ye-ub,0],[ue,ye-ub,wF],[UR,yr0-ub,wF],[0,-1,0],SOF,TM.wood,1);
    oq(G,[UR,yr0-ub,DB],[ue,ye-ub,DB],[ue,ye-ub,wBk],[UR,yr0-ub,wBk],[0,-1,0],SOF,TM.wood,1)}
  // east fascia + knee-brace brackets under the east eave
  oq(G,[uEo,yE-0.24,wF],[uEo,yE-0.24,wBk],[uEo,yE+0.04,wBk],[uEo,yE+0.04,wF],[1,0,0],WOOD,TM.wood,1);
  for(let k=0;k<5;k++){const w=-1.3-k*2.35;const ya=yr0-(Ue+0.5-UR)*KS-0.22;beam(G,[Ue,ya,w],[uEo-0.06,ya,w],0.1,0.12,WOOD,TM.wood,1);beam(G,[Ue+0.04,ya-0.75,w],[Ue+0.04,ya,w],0.1,0.1,WOOD,TM.wood,1);beam(G,[Ue+0.04,ya-0.7,w],[uEo-0.12,ya-0.04,w],0.08,0.08,WOOD,TM.wood,1)}
  // bargeboards (front: carved Swiss-cottage work; back: plain)
  for(const [wb,front] of[[wF,true],[wBk,false]]){const t=front?0.06:-0.06,dp=0.36;
    for(const sgn of[1,-1]){const ue=sgn>0?uEo+0.06:UW+0.25;const ye=yr0-Math.abs(ue-UR)*KS;
      const a=[UR,yr0+0.12,wb],b=[ue,ye+0.12,wb],c=[ue,ye+0.12-dp,wb],d=[UR,yr0+0.12-dp,wb];
      oq(G,a,b,c,d,[0,0,front?1:-1],WOOD,TM.wood,1);const a2=[a[0],a[1],wb-t],b2=[b[0],b[1],wb-t],c2=[c[0],c[1],wb-t],d2=[d[0],d[1],wb-t];
      oq(G,a2,b2,c2,d2,[0,0,front?-1:1],WOOD,TM.wood,1);oq(G,d,c,c2,d2,[0,-1,0],WOOD,TM.wood,1);oq(G,a,b,b2,a2,[0,1,0],WOOD,TM.wood,1)}}
  // Swiss brackets: purlin end + drop + brace, three per slope
  const bbY=u=>yr0+0.12-0.36-Math.abs(u-UR)*KS;
  for(const sgn of[1,-1])for(const off of[1.25,2.3,3.25]){const u=UR+sgn*off;if(u<UW+0.15)continue;const y=bbY(u);
    beam(G,[u,y-0.08,-0.02],[u,y-0.08,wF+0.02],0.13,0.16,WOOD,TM.wood,1);beam(G,[u,y-0.6,wF-0.03],[u,y,wF-0.03],0.12,0.12,WOOD,TM.wood,1);
    beam(G,[u,y-0.95,0],[u,y-0.16,wF-0.08],0.09,0.09,WOOD,TM.wood,1);blob(G,u,y-0.66,wF-0.03,0.07,0.09,0.07,WOOD,TM.wood,1,5,7)}
  // apex: king post with drop, collar, braces and turned finial
  {const yk=yr0-1.45,wt=wF-0.03;beam(G,[UR,yk-0.35,wt],[UR,yr0-0.1,wt],0.14,0.14,WOOD,TM.wood,1);blob(G,UR,yk-0.42,wt,0.08,0.12,0.08,WOOD,TM.wood,1,6,3);
    const hc=(yr0+0.12-0.36-yk)/KS;beam(G,[UR-hc,yk,wt],[UR+hc,yk,wt],0.1,0.14,WOOD,TM.wood,1);
    for(const sgn of[1,-1]){beam(G,[UR,yk+0.05,wt],[UR+sgn*(hc*0.55),yk+0.05+hc*0.55*KS*0.92,wt],0.08,0.1,WOOD,TM.wood,1);beam(G,[UR,yr0-0.5,wt],[UR+sgn*0.42,yr0-0.5-0.0,wt],0.07,0.09,WOOD,TM.wood,1)}
    beam(G,[UR,yr0+0.05,wF-0.05],[UR,yr0+0.62,wF-0.05],0.11,0.11,WOOD,TM.wood,1);blob(G,UR,yr0+0.7,wF-0.05,0.07,0.1,0.07,WOOD,TM.wood,1,6,5)}
  // ---------- west wing hipped roof (eave 10.8, pitch 30°) with the wall dormer cut out ----------
  {const ye=EW+0.15,tn=Math.tan(30*Math.PI/180),u0=-0.8,u1=UW,w0=0.8,w1=DB-0.8,ur=(u0+u1)/2,run=(u1-u0)/2,yr=ye+run*tn;
    const front=[[u0,w0],[u1,w0],[ur,w0-run]],back=[[u0,w1],[ur,w1+run],[u1,w1]],west=[[u0,w0],[ur,w0-run],[ur,w1+run],[u0,w1]],east=[[u1,w0],[u1,w1],[ur,w1+run],[ur,w0-run]];
    const yF=(u,w)=>ye+(w0-w)*tn,yBk=(u,w)=>ye+(w-w1)*tn,yWs=(u,w)=>ye+(u-u0)*tn,yEs=(u,w)=>ye+(u1-u)*tn;
    const ev=(o,d)=>({o,d,k:Math.hypot(1,tn)});
    const dl=dorm[0],dr=dorm[1],dback=-1.05;
    roofPoly(G,clip(front,1,0,dl),yF,TC,TM.tiles,ev([u0,w0],[1,0]));roofPoly(G,clip(front,-1,0,-dr),yF,TC,TM.tiles,ev([u0,w0],[1,0]));
    roofPoly(G,clip(clip(clip(front,-1,0,-dl),1,0,dr),0,1,dback),yF,TC,TM.tiles,ev([u0,w0],[1,0]));
    roofPoly(G,back,yBk,TC,TM.tiles,ev([u0,w1],[1,0]));roofPoly(G,west,yWs,TC,TM.tiles,ev([u0,w0],[0,-1]));roofPoly(G,east,yEs,TC,TM.tiles,ev([u1,w0],[0,-1]));
    beam(G,[ur,yr+0.05,w0-run],[ur,yr+0.05,w1+run],0.22,0.14,lin('#b85c3f'),TM.tiles,1);
    for(const sgn of[1,-1]){beam(G,[ur,yr+0.05,sgn>0?w0-run:w1+run],[sgn>0?u0:u0,ye+0.05,sgn>0?w0:w1],0.2,0.12,lin('#b85c3f'),TM.tiles,1,false);beam(G,[ur,yr+0.05,sgn>0?w0-run:w1+run],[u1,ye+0.05+0,sgn>0?w0:w1],0.2,0.12,lin('#b85c3f'),TM.tiles,1,false)}
    // fascia boards and soffits (front broken by the dormer)
    const fasc=(a,b,out)=>{oq(G,[a[0],ye-0.28,a[1]],[b[0],ye-0.28,b[1]],[b[0],ye+0.02,b[1]],[a[0],ye+0.02,a[1]],out,WOOD,TM.wood,1)};
    fasc([u0,w0],[dl,w0],[0,0,1]);fasc([dr,w0],[u1,w0],[0,0,1]);fasc([u0,w1],[u0,w0],[-1,0,0]);fasc([u1,w1],[u0,w1],[0,0,-1]);
    const sof=(poly)=>{for(let i=1;i<poly.length-1;i++)ot(G,[poly[0][0],ye-0.28,poly[0][1]],[poly[i][0],ye-0.28,poly[i][1]],[poly[i+1][0],ye-0.28,poly[i+1][1]],[0,-1,0],SOF,TM.wood,1)};
    sof([[u0,w0],[dl,w0],[dl,0],[u0,0]]);sof([[dr,w0],[u1,w0],[u1,0],[dr,0]]);sof([[u0,0],[0,0],[0,DB],[u0,DB]]);sof([[u0,DB],[u1,DB],[u1,w1],[u0,w1]]);
    // the wall dormer: gable roof, bargeboards, finial, stone cheeks back to the hip
    const dy0=12.0,dyr=12.62,dhw=1.25,dwf=0.35;const dyAt=u=>dyr+0.12-Math.abs(u-dC)*((dyr-dy0)/((dorm[1]-dorm[0])/2));const dKs=(dyr-dy0)/((dorm[1]-dorm[0])/2);
    for(const sgn of[1,-1]){const ue=dC+sgn*dhw,ye2=dyr+0.12-dhw*dKs;
      oq(G,[dC,dyr+0.12,dwf],[ue,ye2,dwf],[ue,ye2,dback-1.2],[dC,dyr+0.12,dback-1.4],[sgn*0.6,1,0],TC,TM.tiles,1,0,[[0,0],[dhw,0],[dhw,1.6],[0,1.8]]);
      oq(G,[dC,dyr-0.08,dwf],[ue,ye2-0.2,dwf],[ue,ye2-0.2,0],[dC,dyr-0.08,0],[0,-1,0],SOF,TM.wood,1);
      const a=[dC,dyr+0.22,dwf],b=[ue,ye2+0.1,dwf],c=[ue,ye2-0.2,dwf],d=[dC,dyr-0.08,dwf];oq(G,a,b,c,d,[0,0,1],WOOD,TM.wood,1);oq(G,d,c,[c[0],c[1],dwf-0.05],[d[0],d[1],dwf-0.05],[0,-1,0],WOOD,TM.wood,1);
      const cs=sgn>0?dorm[1]:dorm[0];const cheek=[[cs,yF(0,0)-0.05,0],[cs,dy0+0.1,0],[cs,dy0+0.1,dback],[cs,yF(0,dback)-0.05,dback]];oq(G,cheek[0],cheek[1],cheek[2],cheek[3],[sgn,0,0],W1,T.rlStone,3);
      beam(G,[dC+sgn*0.45,dyAt(dC+sgn*0.45)-0.35,0.0],[dC+sgn*0.45,dyAt(dC+sgn*0.45)-0.35,dwf],0.08,0.1,WOOD,TM.wood,1);beam(G,[dC+sgn*0.45,dyAt(dC+sgn*0.45)-0.75,dwf-0.03],[dC+sgn*0.45,dyAt(dC+sgn*0.45)-0.32,dwf-0.03],0.07,0.07,WOOD,TM.wood,1)}
    beam(G,[dC,dyr+0.2,dwf-0.04],[dC,dyr+0.68,dwf-0.04],0.08,0.08,lin('#b4552f'),TM.metal,1);blob(G,dC,dyr+0.74,dwf-0.04,0.05,0.08,0.05,lin('#b4552f'),TM.metal,1,5,9);
    beam(G,[dC,dyr-0.25,dwf-0.03],[dC,dyr-0.75,dwf-0.03],0.09,0.09,WOOD,TM.wood,1);
    // chimney on the wing roof
    fbox(F0,G,0.45,1.05,yWs(0.45,0)-0.3,13.0,-2.0,-1.4,lin('#cdb79a'),TM.plasterC,1,0,'d');fbox(F0,G,0.38,1.12,13.0,13.12,-2.07,-1.33,lin('#e9e4da'),TM.plaster,1,0,'');
  }
  // ---------- first-floor awnings (navy box awnings) ----------
  const awn=(u0,u1,yt,dpt,yv,txt)=>{const yb=yt-0.48,vb=yb-yv;const tv=txt?[0.02,0.38]:[0.52,0.9];
    oq(G,[u0,yt,0],[u1,yt,0],[u1,yb,dpt],[u0,yb,dpt],[0,1,1],W1,T.rlAwn,1,0,[[0,0.5],[1,0.5],[1,1],[0,1]]);
    oq(G,[u0,vb,dpt],[u1,vb,dpt],[u1,yb,dpt],[u0,yb,dpt],[0,0,1],W1,T.rlAwn,1,0,[[0,tv[0]],[1,tv[0]],[1,tv[1]],[0,tv[1]]]);
    oq(G,[u0,yb-0.02,0],[u1,yb-0.02,0],[u1,yb-0.02,dpt],[u0,yb-0.02,dpt],[0,-1,0],lin('#5d6680'),T.rlAwn,1,0,[[0,0.55],[1,0.55],[1,0.85],[0,0.85]]);
    for(const [u,sx] of[[u0,-1],[u1,1]]){ot(G,[u,yt,0],[u,yb,dpt],[u,yb,0],[sx,0,0],W1,T.rlAwn,1,0,[[0,1],[0.3,0.5],[0,0.5]]);oq(G,[u,vb,dpt],[u,yb,dpt],[u,yb,dpt-0.08],[u,vb,dpt-0.08],[sx,0,0],W1,T.rlAwn,1,0,[[0,0.52],[0,0.9],[0.05,0.9],[0.05,0.52]])}};
  awn(7.33,9.63,8.98,0.72,0.3,true);awn(2.05,3.85,9.38,0.62,0.26,false);
  // ---------- gable attic balcony: slab, white timber railing, carved brackets ----------
  {const a0=7.0,a1=9.96,dp=0.85,yf=9.6;fbox(F0,G,a0,a1,yf-0.14,yf,-0.02,dp,WOOD,TM.wood,1,0,'b');
    for(const [p,q,len] of[[[a0+0.04,dp-0.04],[a1-0.04,dp-0.04],a1-a0],[[a0+0.04,0],[a0+0.04,dp-0.04],dp],[[a1-0.04,dp-0.04],[a1-0.04,0],dp]]){
      GC.quad(P(p[0],yf,p[1]),P(q[0],yf,q[1]),P(q[0],yf+0.86,q[1]),P(p[0],yf+0.86,p[1]),[0,0],[len,0],[len,1],[0,1],W1,RECT[T.rlRail],0);
      beam(G,[p[0],yf+0.9,p[1]],[q[0],yf+0.9,q[1]],0.09,0.08,WOOD,TM.wood,1);beam(G,[p[0],yf+0.06,p[1]],[q[0],yf+0.06,q[1]],0.07,0.07,WOOD,TM.wood,1)}
    for(const u of[a0+0.12,a1-0.12])beam(G,[u,yf,dp-0.04],[u,yf+0.95,dp-0.04],0.09,0.09,WOOD,TM.wood,1);
    for(const u of[a0+0.25,UR,a1-0.25]){beam(G,[u,yf-0.12,0],[u,yf-0.12,dp-0.05],0.1,0.14,WOOD,TM.wood,1);beam(G,[u,yf-0.62,0.0],[u,yf-0.16,dp-0.1],0.09,0.09,WOOD,TM.wood,1);blob(G,u,yf-0.3,dp-0.05,0.05,0.08,0.05,WOOD,TM.wood,1,5,11)}}
  // ---------- entrance: marble steps, parapets, wrought-iron railings, glass canopy ----------
  {const M=lin('#f4f1ec'),nS=10;
    // landing + steps (only the exposed tread and riser of each step)
    const uL=w=>0.75-0.1375*w,uRr=w=>4.85+0.1375*w;
    oq(G,[uL(0),FL,0],[uRr(0),FL,0],[uRr(1.0),FL,1.0],[uL(1.0),FL,1.0],[0,1,0],M,TM.marble,1);
    for(let k=0;k<nS;k++){const top=FL-0.165*k,wa=k===0?1.0:1.0+0.3*k,wb=1.0+0.3*(k+1),bot=k===nS-1?YB:FL-0.165*(k+1);
      if(k>0)oq(G,[uL(wa),top,wa-0.3],[uRr(wa),top,wa-0.3],[uRr(wa),top,wa],[uL(wa),top,wa],[0,1,0],M,TM.marble,1);
      const wr=k===0?1.0:wa;oq(G,[uL(wr),bot,wr],[uRr(wr),bot,wr],[uRr(wr),top,wr],[uL(wr),top,wr],[0,0,1],shade(M,0.93),TM.marble,1);
      oq(G,[uL(wr)-0.02,top,wr],[uRr(wr)+0.02,top,wr],[uRr(wr)+0.02,top-0.035,wr+0.03],[uL(wr)-0.02,top-0.035,wr+0.03],[0,0.3,1],M,TM.marble,1)}
    {const k=nS-1;}
    // side parapets (white marble) with iron railing + handrail; pedestals at the foot
    for(const sd of[-1,1]){const iu=w=>sd<0?uL(w):uRr(w),ou=w=>iu(w)+sd*0.3;const yT=w=>w<0.9?FL+0.32:Math.max(0.55,FL+0.32-(w-0.9)*0.55);const wEnd=3.7;
      const pts=[0,0.9,wEnd];for(let i=0;i<pts.length-1;i++){const wa=pts[i],wb=pts[i+1];
        oq(G,[ou(wa),YB,wa],[ou(wb),YB,wb],[ou(wb),yT(wb),wb],[ou(wa),yT(wa),wa],[sd,0,0],M,TM.marble,1);oq(G,[iu(wa),YB,wa],[iu(wb),YB,wb],[iu(wb),yT(wb),wb],[iu(wa),yT(wa),wa],[-sd,0,0],M,TM.marble,1);
        oq(G,[iu(wa),yT(wa),wa],[ou(wa),yT(wa),wa],[ou(wb),yT(wb),wb],[iu(wb),yT(wb),wb],[0,1,0],shade(M,1.0),TM.marble,1);
        const mu=(w)=>(iu(w)+ou(w))/2;GC.quad(P(mu(wa),yT(wa),wa),P(mu(wb),yT(wb),wb),P(mu(wb),yT(wb)+0.92,wb),P(mu(wa),yT(wa)+0.92,wa),[0,0],[(wb-wa)/1.1,0],[(wb-wa)/1.1,0.92],[0,0.92],IRON,RECT[T.rail],0);
        beam(G,[mu(wa),yT(wa)+0.95,wa],[mu(wb),yT(wb)+0.95,wb],0.05,0.05,IRON,TM.metal,1)}
      const pc=[ou(wEnd)-sd*0.15,wEnd+0.18];fbox(F0,G,Math.min(iu(wEnd),ou(wEnd))-0.05,Math.max(iu(wEnd),ou(wEnd))+0.05,YB,0.75,wEnd-0.1,wEnd+0.4,M,TM.marble,1,0,'');
      beam(G,[(iu(wEnd)+ou(wEnd))/2,0.75,wEnd+0.15],[(iu(wEnd)+ou(wEnd))/2,1.55,wEnd+0.15],0.06,0.06,IRON,TM.metal,1);blob(G,(iu(wEnd)+ou(wEnd))/2,1.6,wEnd+0.15,0.06,0.06,0.06,IRON,TM.metal,1,5,13)}
    // curved glass canopy on black scroll brackets
    const c0=1.15,c1=4.75,cd=1.3,cy0=5.08,cy=w=>cy0-0.34*Math.pow(w/cd,1.6);const nC=5;
    for(let i=0;i<nC;i++){const wa=cd*i/nC,wb=cd*(i+1)/nC;oq(G,[c0,cy(wa),wa],[c1,cy(wa),wa],[c1,cy(wb),wb],[c0,cy(wb),wb],[0,1,0.3],lin('#cfd8dc'),T.glassR,1,0,[[0,wa],[2,wa],[2,wb],[0,wb]]);oq(G,[c0,cy(wa)-0.01,wa],[c1,cy(wa)-0.01,wa],[c1,cy(wb)-0.01,wb],[c0,cy(wb)-0.01,wb],[0,-1,-0.3],lin('#b8c2c6'),T.glassR,1,0,[[0,wa],[2,wa],[2,wb],[0,wb]]);
      for(const u of[c0,c1,(c0+c1)/2])beam(G,[u,cy(wa)+0.01,wa],[u,cy(wb)+0.01,wb],0.04,0.05,IRON,TM.metal,1,false)}
    beam(G,[c0,cy(cd),cd],[c1,cy(cd),cd],0.05,0.07,IRON,TM.metal,1);beam(G,[c0,cy0,0.02],[c1,cy0,0.02],0.05,0.06,IRON,TM.metal,1);
    for(const u of[c0+0.05,c1-0.05]){beam(G,[u,3.95,0.02],[u,cy(cd*0.75)-0.03,cd*0.75],0.05,0.06,IRON,TM.metal,1);beam(G,[u,3.9,0.03],[u,cy0,0.03],0.05,0.05,IRON,TM.metal,1);
      for(let k=0;k<6;k++){const a=k/6*TAU,b=(k+1)/6*TAU,r=0.16,cu=0.42,cyy=4.45;beam(G,[u,cyy+Math.sin(a)*r,cu+Math.cos(a)*r],[u,cyy+Math.sin(b)*r,cu+Math.cos(b)*r],0.03,0.03,IRON,TM.metal,1,false)}}}
  // ---------- small details: iron X anchors, downpipes ----------
  const xAnchor=(F,s,y)=>{for(const sg of[1,-1]){const a=FP(F,s-0.22,y-0.22*sg,0.04),b=FP(F,s+0.22,y+0.22*sg,0.04);beam(G,a,b,0.045,0.03,IRON,TM.metal,1)}};
  xAnchor(Fw,0.5,9.8);xAnchor(Fg,gs(11.45),9.05);xAnchor(Fe,0.55,9.2);xAnchor(Fwm,Fwm.L-0.55,9.4);xAnchor(Fe,5.3,9.2);
  for(const [p,y1] of[[[UW-0.07,0.1],EM-0.05],[[Ue+0.1,-0.3],EM-0.25]]){beam(G,[p[0],YB+0.3,p[1]],[p[0],y1,p[1]],0.09,0.09,lin('#f2f0ea'),T.white,1)}
  // ---------- planters and plants in front ----------
  {const pot=(u,w,r,h)=>{const c=P(u,0,w);const g2=G;g2.cyl(c[0],Y0+YB+0.3,c[2],r*0.72,r,h-(YB+0.3),10,lin('#b5643f'),RECT[TM.plasterC],false,0,1);g2.cyl(c[0],Y0+h,c[2],r*1.08,r*1.08,0.07,10,lin('#c06e47'),RECT[TM.plasterC],true,0,1);
      // fan palm: short trunk + fronds (cut-out cards)
      const tr=h+0.15;g2.cyl(c[0],Y0+h,c[2],0.07,0.06,0.45,6,lin('#6b5a44'),RECT[TM.barkPalm!==undefined?TM.barkPalm:TM.bark],false,0,1);
      for(let k=0;k<7;k++){const a=k/7*TAU+u,ca=Math.cos(a),sa=Math.sin(a),len=0.85;const b0=[c[0],Y0+tr+0.3,c[2]],tip=[c[0]+ca*len,Y0+tr+0.75+((k%2)?0.15:-0.05),c[2]+sa*len],wx=-sa*0.32,wz=ca*0.32;
        GC.quad([b0[0]-wx*0.3,b0[1],b0[2]-wz*0.3],[b0[0]+wx*0.3,b0[1],b0[2]+wz*0.3],[tip[0]+wx,tip[1],tip[2]+wz],[tip[0]-wx,tip[1],tip[2]-wz],[0,0],[1,0],[1,1],[0,1],lin('#7d9c5a'),RECT[T.leafPalm!==undefined?T.leafPalm:T.leaves],0)}
      addBoxC(c[0],c[2],r*0.9,'p')};
    pot(-0.55,4.35,0.42,0.62);pot(6.05,4.35,0.42,0.62);pot(5.95,2.15,0.36,0.52);
    // raised brick planter along the east walkway with clipped shrubs
    const Fpl={a:[Ue+0.35,-0.6],d:[0,-1],L:9};fbox(Fpl,G,0,8.6,YB,0.55,0,1.2,lin('#e0b08a'),TM.brickw,1,0,'d');fbox(Fpl,G,-0.04,8.64,0.55,0.6,-0.04,1.24,lin('#d9a37c'),TM.brickw,1,0,'d');
    for(let k=0;k<5;k++){const w=-1.3-k*1.7;blob(G,Ue+0.95,0.95+hf(k*7)*0.25,w,0.6,0.5+hf(k*3)*0.2,0.75,lin('#9fb08a'),TM.hedge||T.hedge,1.5,7,k+3)}
    {const a=P(Ue+0.35,0,-0.6),b=P(Ue+0.35,0,-9.2),c=P(Ue+1.55,0,-9.2),d=P(Ue+1.55,0,-0.6);addSeg(a[0],a[2],b[0],b[2],'p');addSeg(b[0],b[2],c[0],c[2],'p');addSeg(c[0],c[2],d[0],d[2],'p');addSeg(d[0],d[2],a[0],a[2],'p')}
}
  // ---------- collision: real outline (with the canted bay) + stair parapets ----------
  const outline=[[0,0],[BAY.b0,0],[BAY.f0,BAY.pj],[BAY.f1,BAY.pj],[BAY.b1,0],[Ue,0],cER,cST,cBR,cBL,cWN,cWW];
  for(let i=0;i<outline.length;i++){const a=P(outline[i][0],0,outline[i][1]),b=P(outline[(i+1)%outline.length][0],0,outline[(i+1)%outline.length][1]);addSeg(a[0],a[2],b[0],b[2],'b')}
  for(const [a,b] of[[[0.75,0],[0.24,3.72]],[[0.45,0],[-0.06,3.72]],[[4.85,0],[5.36,3.72]],[[5.15,0],[5.66,3.72]],[[-0.15,3.6],[0.3,4.1]],[[5.3,3.6],[5.75,4.1]]]){const p=P(a[0],0,a[1]),q=P(b[0],0,b[1]);addSeg(p[0],p[2],q[0],q[2],'w')}
  // ---------- walkable steps: groundY follows the marble stair (bbox-limited, cheap) ----------
  if(typeof groundY==='function'&&!groundY._rl){const _gy=groundY,ox=OX,oz=OZ,ux=UX,uz=UZ,y0=Y0;
    const gy=function(x,z){const v=_gy(x,z);const dx=x-ox,dz=z-oz;const w=-dx*uz+dz*ux;if(w<0||w>3.75)return v;const u=dx*ux+dz*uz;if(u<0.2||u>5.4)return v;const h=stairH(u,w);return h>0?Math.max(v,y0+h):v};
    gy._rl=true;try{groundY=gy}catch(e){console.warn('lm-ralphlauren: could not wrap groundY',e)}}
  // ---------- night light, placement registry ----------
  if(typeof addLight==='function'){const l=(u,w,r,a)=>{const p=P(u,0,w);addLight(p[0],p[2],r,1,a)};l(2.9,2.0,7,0.8);l(8.5,3.0,8,0.9);l(UE+1.5,-4,6,0.5)}
  {const c=P(6,0,-6);placed('landmark',c[0],c[2],'Ralph Lauren — Οικία Κότσικα (1910)','osm:w1076768348')}
}
LM.register({id:'ralphlauren',at:[[169.84,56.4]],build(ctx){buildVilla(ctx)}});
})();
