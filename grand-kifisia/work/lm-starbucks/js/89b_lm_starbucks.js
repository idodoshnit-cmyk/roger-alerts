'use strict';
/* 89b_lm_starbucks.js — hand-modelled landmark: Starbucks Kifisia, Kassaveti 19 (owner: bot lm-starbucks; research: docs/research/lm/starbucks.md)
   The two-storey timber-and-brick former stable in the Kassaveti 19 courtyard (OSM way/1076768349, map building b426, footprint used vertex for vertex),
   west of the Ralph Lauren villa (b425, built by lm-ralphlauren), plus the courtyard: stone-flag paving, street-edge planters, gate piers, the Starbucks terrace
   (tables, slatted chairs, square green umbrellas with "STARBUCKS COFFEE" valances), timber planter boxes, cast-iron lanterns and the courtyard pine.
   Building: ground floor = brick walls, rough stone piers and three projecting timber-framed French-door bays (the OSM saw-tooth on the east side);
   first floor = continuous small-paned timber gallery behind a full-width timber balcony that sits on the bays; dark timber cladding on the other sides;
   hipped red clay-tile roof with deep eaves, timber soffits and one rendered chimney; "STARBUCKS COFFEE" lettering on the timber band under the eave.
   Plain text signs only (no logo artwork). Everything is in metres, 1:1, on the OSM footprint. */
(function(){
if(typeof LM==='undefined'||typeof defTile!=='function')return;
const FP0=[[150.7,67.2],[156.0,69.2],[156.6,67.6],[157.7,68.0],[158.8,65.1],[157.8,64.7],[158.3,63.3],[159.2,63.6],[160.3,60.8],[159.4,60.5],[159.7,59.8],[160.5,60.1],[162.1,56.1],[156.0,53.7]];
const RL0=[[177.9,48.2],[168.8,45.2],[167.5,49.1],[166.1,48.7],[161.5,62.8],[166.8,64.5],[166.3,66.1],[170.1,67.3],[170.6,65.7],[172.8,66.4],[176.5,55.2],[175.7,55.0]];
const STREET_W=[[156.5,70.7],[160.2,72.0],[164.0,73.3]],GATE=[[164.0,73.3],[167.8,74.6]],STREET_E=[[167.8,74.6],[173.0,76.4],[174.6,76.6]],B423C=[178.7,64.6];
const SB={built:false};window.LM_STARBUCKS=SB;// debug/inspection hook: frame, door, seats, tri count

/* ---------------- material tiles (registered at script load, before boot builds the texture array) ---------------- */
const wood=(g,S,tint,sc)=>pBg(g,'wood',S,tint||'#6a4834',sc||1.4);
function interior(g,x,y,w,h,k){// warm café interior seen through glass (shows dimmed by day, glows at night)
  const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#f1d29c');gr.addColorStop(0.55,'#d9a86a');gr.addColorStop(1,'#8a5a36');g.fillStyle=gr;g.fillRect(x,y,w,h);
  g.fillStyle='rgba(120,52,34,.35)';g.fillRect(x,y+h*0.12,w,h*0.42);// exposed brick back wall
  g.fillStyle='rgba(60,36,22,.55)';g.fillRect(x,y+h*0.62,w,h*0.1);// counter / table edge
  for(let i=0;i<3;i++){const px=x+w*(0.2+0.3*i+0.05*Math.sin(k+i)),py=y+h*(0.08+0.04*((i+k)%2));g.fillStyle='rgba(255,246,214,.95)';g.beginPath();g.arc(px,py,Math.max(2,w*0.05),0,TAU);g.fill()}
  g.fillStyle='rgba(40,28,20,.45)';const hx=x+w*(0.3+0.4*((k*7)%1));g.beginPath();g.ellipse(hx,y+h*0.6,w*0.08,h*0.13,0,0,TAU);g.fill();// a seated figure
  const r=g.createLinearGradient(x,y,x+w,y+h);r.addColorStop(0,'rgba(255,255,255,.10)');r.addColorStop(0.5,'rgba(255,255,255,0)');r.addColorStop(1,'rgba(255,255,255,.06)');g.fillStyle=r;g.fillRect(x,y,w,h)}
function panes(g,m,x,y,w,h,cols,rows,bar,fc,k){interior(g,x,y,w,h,k);if(m){m.fillStyle='#fff';m.fillRect(x,y,w,h)}g.fillStyle=fc;
  for(let i=1;i<cols;i++){const bx=x+w*i/cols-bar/2;g.fillRect(bx,y,bar,h);if(m){m.fillStyle='#000';m.fillRect(bx,y,bar,h)}}
  for(let j=1;j<rows;j++){const by=y+h*j/rows-bar/2;g.fillStyle=fc;g.fillRect(x,by,w,bar);if(m){m.fillStyle='#000';m.fillRect(x,by,w,bar)}}
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x,y,w,2);g.fillRect(x,y,2,h)}
const GLASS={needs:['wood'],nrm:'wood',nrmK:0.5,spec:0.05,shin:40,glass:0.55,glassDark:0.6,glowK:1.55};
/* one French-door pair: 1.5 m wide x 2.63 m high (sill 0.32 m -> head 2.95 m) */
defTile('sbFrench',(g,S,m)=>{wood(g,S,'#5c3e2c');const fc='#4a3122';
  panes(g,m,14,10,S-28,44,3,1,5,fc,1);// transom
  for(const lx of[12,122]){const lw=106;panes(g,m,lx+9,76,lw-18,116,2,3,5,fc,lx);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(lx+12,200,lw-24,2);g.fillStyle='rgba(255,230,190,.10)';g.fillRect(lx+12,226,lw-24,2);
    g.strokeStyle='rgba(30,18,10,.55)';g.lineWidth=1.5;g.strokeRect(lx+14,202,lw-28,24)}
  g.fillStyle='rgba(20,12,6,.55)';g.fillRect(118,66,4,S-70);g.fillStyle='#b89a5a';g.fillRect(110,138,4,14);g.fillRect(126,138,4,14);// meeting stile + brass handles
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,62,S,3)},GLASS);
/* first-floor gallery bay: 1.2 m wide x 2.1 m high, two small-paned casements under a transom */
defTile('sbGallery',(g,S,m)=>{wood(g,S,'#5c3e2c');const fc='#4a3122';panes(g,m,12,10,S-24,38,3,1,5,fc,3);
  for(const lx of[10,122]){panes(g,m,lx+8,62,100,166,2,4,5,fc,lx+5)}g.fillStyle='rgba(20,12,6,.5)';g.fillRect(118,56,4,S-60);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,54,S,3)},GLASS);
/* umbrella canvas: plain woven fabric (tint carrier: the vertex colour gives the green) */
defTile('sbCanvas',(g,S)=>{pRect(g,0,0,S,S,'#ecebe7');g.globalAlpha=0.07;for(let i=0;i<S;i+=2){g.fillStyle=i%4?'#000':'#fff';g.fillRect(i,0,1,S);g.fillRect(0,i,S,1)}g.globalAlpha=1;
  const gr=g.createLinearGradient(0,0,S,S);gr.addColorStop(0,'rgba(255,255,255,.06)');gr.addColorStop(1,'rgba(0,0,0,.06)');g.fillStyle=gr;g.fillRect(0,0,S,S)},{spec:0.02,shin:8});
/* courtyard paving: grey limestone / granite flags in random-length courses (1 tile = 2.4 m), 1 cm joints */
defTile('sbFlags',(g,S)=>{pRect(g,0,0,S,S,'#77736c');let s=11;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};const rows=[30,40,30,40,40,30,30];let y=0;
  for(const rh of rows){let x=-r()*40;while(x<S){const w=[40,50,60,70,80][Math.floor(r()*5)];const v=150+Math.floor(r()*38),t=Math.floor(r()*8)-4;
      for(const ox of[0,-S,S]){g.fillStyle=`rgb(${v+t},${v+t-1},${v-3})`;g.fillRect(x+ox+0.6,y+0.6,w-1.2,rh-1.2);g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x+ox+0.6,y+0.6,w-1.2,1.2);g.fillStyle='rgba(0,0,0,.07)';g.fillRect(x+ox+0.6,y+rh-1.8,w-1.2,1.2)}
      x+=w}y+=rh}
  speck(g,2600,['rgba(60,58,54,.25)','rgba(210,208,200,.22)','rgba(120,116,110,.25)'],0.4,1.4)},{nrm:'slabs',nrmK:0.6,spec:0.035,shin:16,macro:0.25});

/* ---------------- sign / lettering atlas (one CanvasTexture, one material; letters glow at night) ---------------- */
const SA={W:1024,H:512};
function signAtlas(){const c=document.createElement('canvas');c.width=SA.W;c.height=SA.H;const g=c.getContext('2d');const e=document.createElement('canvas');e.width=SA.W;e.height=SA.H;const ge=e.getContext('2d');
  g.clearRect(0,0,SA.W,SA.H);ge.fillStyle='#000';ge.fillRect(0,0,SA.W,SA.H);
  const font=(px,w)=>`${w||'bold'} ${px}px "Helvetica Neue",Helvetica,Arial,"DejaVu Sans",sans-serif`;
  const spaced=(ctx,txt,cx,cy,px,sp,fill)=>{ctx.font=font(px);ctx.fillStyle=fill;ctx.textBaseline='middle';const ws=[...txt].map(ch=>ctx.measureText(ch).width);const tot=ws.reduce((a,b)=>a+b,0)+sp*(txt.length-1);let x=cx-tot/2;
    for(let i=0;i<txt.length;i++){ctx.fillText(txt[i],x,cy);x+=ws[i]+sp}return tot};
  // row A (y 0..64): fascia lettering, green letters on transparent (6.2 m x 0.34 m on the timber band)
  let px=50;g.font=font(px);while(px>20&&g.measureText('STARBUCKS COFFEE').width+15*16>SA.W-20){px-=2;g.font=font(px)}
  spaced(g,'STARBUCKS COFFEE',SA.W/2,33,px,15,'#1f6a4f');spaced(ge,'STARBUCKS COFFEE',SA.W/2,33,px,15,'#3fd08a');// green letters (photos: green by day, glowing green at night)
  // row B (y 64..174): lit green panel, white letters (door-bay head beam)
  for(const [ctx,lit] of [[g,0],[ge,1]]){ctx.fillStyle=lit?'#0c5a3e':'#1e6b57';ctx.fillRect(0,64,SA.W,110);ctx.strokeStyle=lit?'#9fd8bf':'#e9efe9';ctx.lineWidth=4;ctx.strokeRect(8,72,SA.W-16,94);spaced(ctx,'STARBUCKS COFFEE',SA.W/2,121,70,12,lit?'#f4fff8':'#ffffff')}
  // row C (y 174..259): umbrella valance, white on dark green (not lit)
  g.fillStyle='#1e6b57';g.fillRect(0,174,SA.W,85);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,250,SA.W,9);spaced(g,'STARBUCKS COFFEE',SA.W/2,214,54,10,'#f6f6f2');
  // D (x 0..170, y 262..510): A-frame chalkboard
  g.fillStyle='#2c2b28';g.fillRect(0,262,170,248);g.strokeStyle='#5b4330';g.lineWidth=10;g.strokeRect(5,267,160,238);g.fillStyle='#e9e4d6';g.textAlign='center';g.font=font(22);g.fillText('STARBUCKS',85,300);
  g.font=font(15,'normal');['Freddo Espresso  3.40','Freddo Cappuccino  3.80','Cappuccino  3.90','Caramel Frapp.  5.20','Croissant  2.60'].forEach((t,i)=>g.fillText(t,85,338+i*24));g.fillStyle='#7fc4a4';g.font=font(16);g.fillText('Welcome!',85,482);g.textAlign='left';
  // E (x 180..436, y 262..326): address plate on the gate pier (white enamel, blue letters)
  g.fillStyle='#f4f2ea';g.fillRect(180,262,256,64);g.strokeStyle='#1d3f8f';g.lineWidth=5;g.strokeRect(186,268,244,52);g.fillStyle='#1d3f8f';g.font=font(30);g.textAlign='center';g.fillText('ΚΑΣΣΑΒΕΤΗ 19',308,296);g.textAlign='left';
  const t=new THREE.CanvasTexture(c),te=new THREE.CanvasTexture(e);for(const x of[t,te]){x.encoding=THREE.sRGBEncoding;x.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());x.flipY=true}
  const mat=new THREE.MeshStandardMaterial({map:t,emissiveMap:te,emissive:0xffffff,emissiveIntensity:0,alphaTest:0.5,roughness:0.78,metalness:0,side:THREE.FrontSide});
  return mat}
const R={A:[0,0,1024,64],B:[0,64,1024,110],C:[0,174,1024,85],D:[0,262,170,248],E:[180,262,256,64]};
const ruv=(k,x0,x1)=>{const r=R[k];x0=x0||0;x1=x1===undefined?1:x1;return[(r[0]+r[2]*x0)/SA.W,1-(r[1]+r[3])/SA.H,(r[0]+r[2]*x1)/SA.W,1-r[1]/SA.H]};

/* ---------------- geometry helpers ---------------- */
let F=null,O=null,CUT=null,yF=0;const TXT={p:[],n:[],u:[],i:[]};
const L3=(s,d,y)=>[s*F.tx+d*F.nx,yF+y,s*F.tz+d*F.nz];
const W2=(s,d)=>[s*F.tx+d*F.nx,s*F.tz+d*F.nz];
const S_=(p)=>p[0]*F.tx+p[1]*F.tz,D_=(p)=>p[0]*F.nx+p[1]*F.nz;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrmz=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]};
/* quad A,B,C,D (counter-clockwise seen from outside) — flipped automatically so the face points along `out` */
function q4(G,A,B,C,D,uA,uB,uC,uD,col,tile,gl,out){const n=cross(sub(B,A),sub(C,A));if(out&&dot(n,out)<0)G.quad(D,C,B,A,uD,uC,uB,uA,col,RECT[tile],gl||0);else G.quad(A,B,C,D,uA,uB,uC,uD,col,RECT[tile],gl||0)}
function t3(G,A,B,C,uA,uB,uC,col,tile,out){const n=cross(sub(B,A),sub(C,A));if(out&&dot(n,out)<0)G.tri(A,C,B,uA,uC,uB,col,RECT[tile],0);else G.tri(A,B,C,uA,uB,uC,col,RECT[tile],0)}
const NE=()=>[F.nx,0,F.nz],NW=()=>[-F.nx,0,-F.nz],NN=()=>[F.tx,0,F.tz],NS=()=>[-F.tx,0,-F.tz];
/* vertical rectangle in the local frame from (s0,d0) to (s1,d1), y0..y1, facing `out`; uv in metres (or tile repeats if ru/rv given) */
function vrect(G,s0,d0,s1,d1,y0,y1,out,col,tile,gl,ru,rv,vert){const A=L3(s0,d0,y0),B=L3(s1,d1,y0),C=L3(s1,d1,y1),D=L3(s0,d0,y1);const L=Math.hypot(s1-s0,d1-d0),H=y1-y0;
  const U=ru===undefined?L:ru,V=rv===undefined?H:rv;if(vert)q4(G,A,B,C,D,[0,0],[0,U],[V,U],[V,0],col,tile,gl,out);else q4(G,A,B,C,D,[0,0],[U,0],[U,V],[0,V],col,tile,gl,out)}
/* box in the local frame: centre (s,d), bottom y, sizes along s / up / along d; bottom face optional */
function lbox(G,s,d,y,ls,h,ld,col,tile,bottom,gl){const p=W2(s,d);G.box(p[0],yF+y+h/2,p[1],ls,h,ld,F.ry,col,RECT[tile],1,gl||0);
  if(bottom){q4(G,L3(s-ls/2,d-ld/2,y),L3(s+ls/2,d-ld/2,y),L3(s+ls/2,d+ld/2,y),L3(s-ls/2,d+ld/2,y),[0,0],[ls,0],[ls,ld],[0,ld],shade(col,0.8),tile,0,[0,-1,0])}}
/* square beam between two world points (w = width, h = height of the section) */
function beam(G,p0,p1,w,h,col,tile){const a=nrmz(sub(p1,p0));let sd=cross(a,[0,1,0]);if(Math.hypot(...sd)<0.2)sd=cross(a,[1,0,0]);sd=nrmz(sd);const up=nrmz(cross(sd,a));const L=Math.hypot(...sub(p1,p0));
  const c=(p,i,j)=>[p[0]+sd[0]*w/2*i+up[0]*h/2*j,p[1]+sd[1]*w/2*i+up[1]*h/2*j,p[2]+sd[2]*w/2*i+up[2]*h/2*j];
  const fs=[[1,1,-1,1,up],[-1,-1,1,-1,[-up[0],-up[1],-up[2]]],[1,-1,1,1,sd],[-1,1,-1,-1,[-sd[0],-sd[1],-sd[2]]]];
  for(const [i0,j0,i1,j1,o] of fs){q4(G,c(p0,i0,j0),c(p1,i0,j0),c(p1,i1,j1),c(p0,i1,j1),[0,0],[L,0],[L,w],[0,w],col,tile,0,o)}
  q4(G,c(p1,1,1),c(p1,-1,1),c(p1,-1,-1),c(p1,1,-1),[0,0],[w,0],[w,h],[0,h],col,tile,0,a);q4(G,c(p0,1,1),c(p0,-1,1),c(p0,-1,-1),c(p0,1,-1),[0,0],[w,0],[w,h],[0,h],col,tile,0,[-a[0],-a[1],-a[2]])}
/* text quad (sign atlas): local vertical rectangle facing `out` */
function tquad(s0,d0,s1,d1,y0,y1,uv,out){const A=L3(s0,d0,y0),B=L3(s1,d1,y0),C=L3(s1,d1,y1),D=L3(s0,d0,y1);textQuad(A,B,C,D,uv,out)}
function textQuad(A,B,C,D,uv,out){let n=nrmz(cross(sub(B,A),sub(C,A)));let P=[A,B,C,D],U=[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]];
  if(out&&dot(n,out)<0){P=[B,A,D,C];U=[U[0],U[1],U[2],U[3]];n=[-n[0],-n[1],-n[2]]}const o=TXT.p.length/3;
  for(let k=0;k<4;k++){TXT.p.push(...P[k]);TXT.n.push(...n);TXT.u.push(...U[k])}TXT.i.push(o,o+1,o+2,o,o+2,o+3)}

/* ---------------- colours ---------------- */
const C={timber:hexc('#5d4130'),timberD:hexc('#46301f'),clad:hexc('#7a573f'),deck:hexc('#6e4c35'),brick:hexc('#f2e2d6'),stone:hexc('#efe6d6'),stoneW:hexc('#e6dccb'),plinth:hexc('#cfc4b0'),
  tile:hexc('#c8704f'),tileD:hexc('#9a4f36'),render:hexc('#ebe6dc'),iron:hexc('#1f2221'),green:hexc('#1e6b57'),greenD:hexc('#174f41'),planter:hexc('#9a5038'),trough:hexc('#d9d2c2'),chair:hexc('#4a3426'),table:hexc('#3d2c22'),leaf:hexc('#5f8a45')};

/* ---------------- the build ---------------- */
function frameOf(ps){const n=ps.length;let bi=0,bl=0;for(let i=0;i<n;i++){const a=ps[i],b=ps[(i+1)%n];const l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>bl){bl=l;bi=i}}
  const a=ps[bi],b=ps[(bi+1)%n];const tx=(b[0]-a[0])/bl,tz=(b[1]-a[1])/bl;let nx=tz,nz=-tx;const cx=ps.reduce((s,p)=>s+p[0],0)/n,cz=ps.reduce((s,p)=>s+p[1],0)/n;
  if((cx-a[0])*nx+(cz-a[1])*nz<0){nx=-nx;nz=-nz}// n: from the long (west) wall into the building = towards the courtyard
  return{nx,nz,tx:nz,tz:-nx,ry:Math.atan2(nx,nz)}}

function build(ctx){const t0=performance.now();let fp=ctx&&ctx.footprints&&ctx.footprints[0];let ps=(fp&&fp.ps&&fp.ps.length>3?fp.ps:FP0).map(p=>[p[0],p[1]]);
  if(polyArea(ps)<0)ps.reverse();// CCW: outward normal of edge a->c is (dz,-dx)
  F=frameOf(ps);const n=ps.length;const cx=ps.reduce((s,p)=>s+p[0],0)/n,cz=ps.reduce((s,p)=>s+p[1],0)/n;const ch=chunkAt(cx,cz);O=ch.o;CUT=ch.cut;
  // floor level: highest ground around the footprint (the courtyard paving is at sidewalk level)
  let gmax=-1e9,gmin=1e9;for(let i=0;i<n;i++){const a=ps[i],b=ps[(i+1)%n];const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;const mx=(a[0]+b[0])/2+(b[1]-a[1])/L*0.8,mz=(a[1]+b[1])/2-(b[0]-a[0])/L*0.8;
    gmax=Math.max(gmax,terr(a[0],a[1]),groundY(mx,mz));gmin=Math.min(gmin,terr(a[0],a[1]))}
  const courtLvl=Math.max(0,lvl(163.5,70.5));const yPave=terr(158,70)+courtLvl+0.025;yF=Math.max(gmax,yPave)+0.04;
  // local extents
  let dW=1e9,dB=-1e9,sS=1e9,sN=-1e9;for(const p of ps){const s=S_(p),d=D_(p);dW=Math.min(dW,d);dB=Math.max(dB,d);sS=Math.min(sS,s);sN=Math.max(sN,s)}
  const E=[];let dM=dB;for(let i=0;i<n;i++){const a=ps[i],c=ps[(i+1)%n];const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz);if(L<0.05)continue;const on=[dz/L,-dx/L];const kn=on[0]*F.nx+on[1]*F.nz,kt=on[0]*F.tx+on[1]*F.tz;
    const e={a,c,L,s0:S_(a),d0:D_(a),s1:S_(c),d1:D_(c),on,kind:'odd'};if(kn<-0.8)e.kind='W';else if(kn>0.8){e.kind='E';e.d=(e.d0+e.d1)/2}else if(Math.abs(kt)>0.8)e.kind=L>3?(kt<0?'S':'N'):'ret';E.push(e)}
  for(const e of E)if(e.kind==='E'&&e.d<dB-0.35)dM=Math.min(dM,e.d);if(dM>=dB-0.3)dM=dB;
  for(const e of E)if(e.kind==='E')e.kind=(e.d>dB-0.35&&dM<dB-0.3)?'bay':'rec';
  Object.assign(F,{dW,dB,dM,sS,sN,yF});SB.F=F;SB.edges=E.map(e=>e.kind);
  const H={pl:0.32,gfTop:2.95,beam:3.30,deck:3.48,glass0:3.62,glass1:5.72,wall1:6.16,eave:6.42};
  for(const e of E)addSeg(e.a[0],e.a[1],e.c[0],e.c[1],'b');
  placed('poi',cx,cz,'Starbucks (Kassaveti 19) — landmark model','osm:way/1076768349');

  /* ===== ground floor ===== */
  const winGF=[];
  for(const e of E){const out=[e.on[0],0,e.on[1]],L=e.L;
    if(e.kind==='bay'){// projecting timber French-door bay
      vrect(O,e.s0,e.d0,e.s1,e.d1,-0.6,H.pl,out,C.plinth,TM.rubble);
      const np=Math.max(1,Math.round(L/1.5));vrect(O,e.s0,e.d0,e.s1,e.d1,H.pl,H.gfTop,out,C1,T.sbFrench,1,np,1);
      const ux=(e.s1-e.s0)/L,ud=(e.d1-e.d0)/L,o=0.05;
      for(let k=0;k<=np;k++){const t=k/np*L;const s=e.s0+ux*t,d=e.d0+ud*t+o;lbox(O,s,d,H.pl,k===0||k===np?0.16:0.1,H.gfTop-H.pl,0.1,C.timber,TM.wood)}
      lbox(O,(e.s0+e.s1)/2,e.d+0.03,H.gfTop,L+0.12,H.beam-H.gfTop,0.18,C.timberD,TM.wood);// head beam
      lbox(O,(e.s0+e.s1)/2,e.d+0.06,H.pl-0.1,L+0.06,0.1,0.16,C.stone,TM.ashlar);// stone sill
      e.door=Math.abs(e.s1-e.s0)>2.5?{s:(e.s0+e.s1)/2,d:e.d}:null}
    else if(e.kind==='rec'){// rough stone pier between the bays
      vrect(O,e.s0,e.d0,e.s1,e.d1,-0.6,H.beam,out,C.stone,TM.rubble);
      vrect(O,e.s0,e.d0,e.s1,e.d1,H.beam,H.deck,out,C.timberD,TM.wood)}
    else{// brick walls with a stone plinth
      vrect(O,e.s0,e.d0,e.s1,e.d1,-0.6,H.pl,out,C.plinth,TM.rubble);vrect(O,e.s0,e.d0,e.s1,e.d1,H.pl,H.beam,out,C.brick,TM.brickw);
      if(e.kind==='W'){const nw=Math.max(1,Math.floor(L/3.6));for(let k=0;k<nw;k++){const t=(k+0.5)/nw;winGF.push({e,t,w:1.0,y0:1.05,y1:2.35})}}
      if(e.kind==='S')winGF.push({e,t:0.42,w:1.3,y0:0.95,y1:2.45});
      if(e.kind==='ret'||e.kind==='odd'){vrect(O,e.s0,e.d0,e.s1,e.d1,H.beam,H.deck,out,C.timberD,TM.wood)}}}
  // the bay with the widest front nearest the courtyard is the entrance (it is where MAP.special.starbucks puts the door)
  const sp=(typeof SPECIAL!=='undefined'&&SPECIAL.starbucks)||null;let doorE=null,best=1e9;for(const e of E)if(e.kind==='bay'){const mx=(e.a[0]+e.c[0])/2,mz=(e.a[1]+e.c[1])/2;const dd=sp?Math.hypot(mx-sp.x,mz-sp.z):S_([mx,mz]);if(dd<best){best=dd;doorE=e}}
  // stone quoins at the main-body corners
  for(const [s,d] of [[sS,dW],[sN,dW],[sS,dM]]){lbox(O,s+(s===sS?0.25:-0.25),d+(d===dW?0.25:-0.25),-0.3,0.62,H.beam+0.3,0.62,C.stoneW,TM.rubble)}
  // ground-floor windows (timber, small panes) with stone lintels and sills
  for(const w of winGF){const e=w.e,ux=(e.s1-e.s0)/e.L,ud=(e.d1-e.d0)/e.L,o=0.04;const ts=w.t*e.L;const a=[e.s0+ux*(ts-w.w/2)+e.on[0]*0,e.d0+ud*(ts-w.w/2)],b=[e.s0+ux*(ts+w.w/2),e.d0+ud*(ts+w.w/2)];
    const ons=e.on[0]*F.tx+e.on[1]*F.tz,ond=e.on[0]*F.nx+e.on[1]*F.nz,out=[e.on[0],0,e.on[1]];
    vrect(O,a[0]+ons*o,a[1]+ond*o,b[0]+ons*o,b[1]+ond*o,w.y0,w.y1,out,C1,T.sbGallery,0,1,1);
    const ms=(a[0]+b[0])/2+ons*0.06,md=(a[1]+b[1])/2+ond*0.06;const ls=Math.abs(ux)*(w.w+0.3)+Math.abs(ons)*0.14,ld=Math.abs(ud)*(w.w+0.3)+Math.abs(ond)*0.14;
    lbox(O,ms,md,w.y1,ls,0.22,ld,C.stoneW,TM.ashlar);lbox(O,ms,md,w.y0-0.08,ls,0.08,ld,C.stoneW,TM.ashlar,true)}

  /* ===== first floor ===== */
  const clip=(e)=>{// part of a gable edge west of the main east wall line
    let A=[e.s0,e.d0],B=[e.s1,e.d1];const f=(P,Q)=>{const t=(dM-P[1])/(Q[1]-P[1]);return[P[0]+(Q[0]-P[0])*t,dM]};if(A[1]>dM+0.01&&B[1]>dM+0.01)return null;if(A[1]>dM+0.01)A=f(B,A);if(B[1]>dM+0.01)B=f(A,B);return[A,B]};
  const win1=[];
  for(const e of E){if(!(e.kind==='W'||e.kind==='S'||e.kind==='N'))continue;const cl=e.kind==='W'?[[e.s0,e.d0],[e.s1,e.d1]]:clip(e);if(!cl)continue;const [A,B]=cl;const out=[e.on[0],0,e.on[1]];
    vrect(O,A[0],A[1],B[0],B[1],H.beam,H.wall1,out,C.clad,TM.wood,0,undefined,undefined,true);// vertical boards
    vrect(O,A[0],A[1],B[0],B[1],H.beam-0.02,H.deck,out,C.timberD,TM.wood);// floor beam band
    const L=Math.hypot(B[0]-A[0],B[1]-A[1]);const nw=e.kind==='W'?Math.max(1,Math.floor(L/3.2)):(e.kind==='S'?2:1);for(let k=0;k<nw;k++)win1.push({A,B,t:(k+0.5)/nw,out,w:1.05})}
  for(const w of win1){const L=Math.hypot(w.B[0]-w.A[0],w.B[1]-w.A[1]),ux=(w.B[0]-w.A[0])/L,ud=(w.B[1]-w.A[1])/L,ts=w.t*L;const ons=w.out[0]*F.tx+w.out[2]*F.tz,ond=w.out[0]*F.nx+w.out[2]*F.nz,o=0.035;
    const a=[w.A[0]+ux*(ts-w.w/2)+ons*o,w.A[1]+ud*(ts-w.w/2)+ond*o],b=[w.A[0]+ux*(ts+w.w/2)+ons*o,w.A[1]+ud*(ts+w.w/2)+ond*o];vrect(O,a[0],a[1],b[0],b[1],4.0,5.55,w.out,C1,T.sbGallery,hf(Math.round(a[0]*10))>0.5?1:0,1,1);
    const ms=(a[0]+b[0])/2+ons*0.04,md=(a[1]+b[1])/2+ond*0.04,ls=Math.abs(ux)*(w.w+0.2)+Math.abs(ons)*0.1,ld=Math.abs(ud)*(w.w+0.2)+Math.abs(ond)*0.1;
    lbox(O,ms,md,5.55,ls,0.12,ld,C.timberD,TM.wood);lbox(O,ms,md,3.92,ls,0.08,ld,C.timberD,TM.wood,true)}
  // east gallery: continuous small-paned timber glazing on the main wall line behind the balcony
  {const out=NE(),L=sN-sS,nb=Math.max(2,Math.round(L/1.2));vrect(O,sS,dM,sN,dM,H.deck,H.glass0,out,C.timberD,TM.wood);vrect(O,sS,dM,sN,dM,H.glass0,H.glass1,out,C1,T.sbGallery,1,nb,1);
    vrect(O,sS,dM,sN,dM,H.glass1,H.wall1,out,C.timber,TM.wood);
    for(let k=0;k<=nb;k++){const s=sS+L*k/nb;lbox(O,clamp(s,sS+0.07,sN-0.07),dM+0.05,H.deck,k%nb===0?0.16:0.09,H.glass1-H.deck,0.1,C.timberD,TM.wood)}
    lbox(O,(sS+sN)/2,dM+0.06,H.glass1,L,0.08,0.14,C.timberD,TM.wood)}
  for(const [s,d] of [[sS,dW],[sN,dW]])lbox(O,s+(s===sS?0.07:-0.07),d+0.07,H.beam,0.18,H.wall1-H.beam,0.18,C.timberD,TM.wood);

  /* ===== balcony on the bays ===== */
  {const d0=dM,d1=dB+0.12,yb=H.beam,yt=H.deck;lbox(O,(sS+sN)/2,(d0+d1)/2,yb,sN-sS,yt-yb,d1-d0,C.deck,TM.wood,true);
    const rd=dB+0.05,y0=yt,ys=[0.1,0.98];const sA=sS+0.06,sB=sN-0.06;
    const rail=(pa,pb)=>{// posts, rails and balusters between two local points (s,d)
      const L=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]);const np=Math.max(1,Math.ceil(L/1.7));for(let k=0;k<=np;k++){const t=k/np;lbox(O,pa[0]+(pb[0]-pa[0])*t,pa[1]+(pb[1]-pa[1])*t,y0,0.1,1.06,0.1,C.timberD,TM.wood)}
      const P=(t,y)=>L3(pa[0]+(pb[0]-pa[0])*t,pa[1]+(pb[1]-pa[1])*t,y);beam(O,P(0,y0+ys[1]+0.03),P(1,y0+ys[1]+0.03),0.13,0.06,C.timberD,TM.wood);beam(O,P(0,y0+ys[0]),P(1,y0+ys[0]),0.06,0.06,C.timberD,TM.wood);
      beam(O,P(0,y0+0.55),P(1,y0+0.55),0.04,0.05,C.timberD,TM.wood);const nbl=Math.floor(L/0.13);for(let k=1;k<nbl;k++){const t=k/nbl;beam(O,P(t,y0+ys[0]+0.03),P(t,y0+ys[1]),0.035,0.035,C.timber,TM.wood)}};
    rail([sA,rd],[sB,rd]);rail([sA,dM+0.05],[sA,rd]);rail([sB,dM+0.05],[sB,rd]);
    // diagonal brackets under the cantilevered parts (where there is no bay below)
    for(const e of E)if(e.kind==='rec'){const s=(e.s0+e.s1)/2;beam(O,L3(s,dM+0.06,2.45),L3(s,dB-0.02,H.beam-0.02),0.09,0.09,C.timberD,TM.wood)}
    beam(O,L3(sS+0.3,dM+0.06,2.45),L3(sS+0.3,dB-0.02,H.beam-0.02),0.09,0.09,C.timberD,TM.wood)}

  /* ===== hipped roof with deep eaves ===== */
  const pitch=27*Math.PI/180;const s0=sS-0.55,s1=sN+0.55,d0=dW-0.55,d1=dB+0.36,hw=(d1-d0)/2,dc=(d0+d1)/2,yE=H.eave,rise=hw*Math.tan(pitch),yR=yE+rise,sl=hw/Math.cos(pitch);
  {const A=L3(s0,d0,yE),B=L3(s1,d0,yE),Cc=L3(s1,d1,yE),D=L3(s0,d1,yE),R1=L3(s0+hw,dc,yR),R2=L3(s1-hw,dc,yR);const up=(v)=>[v[0],1.2,v[2]];
    q4(O,A,B,R2,R1,[s0,0],[s1,0],[s1-hw,sl],[s0+hw,sl],C.tile,TM.tiles,0,up(NW()));q4(O,Cc,D,R1,R2,[s1,0],[s0,0],[s0+hw,sl],[s1-hw,sl],C.tile,TM.tiles,0,up(NE()));
    t3(O,D,A,R1,[d1,0],[d0,0],[dc,sl],C.tile,TM.tiles,up(NS()));t3(O,B,Cc,R2,[d0,0],[d1,0],[dc,sl],C.tile,TM.tiles,up(NN()));
    const lift=(p,k)=>[p[0],p[1]+k,p[2]];beam(O,lift(R1,0.06),lift(R2,0.06),0.26,0.15,C.tileD,TM.tiles);for(const [p,r] of [[A,R1],[D,R1],[B,R2],[Cc,R2]])beam(O,lift(p,0.07),lift(r,0.07),0.24,0.13,C.tileD,TM.tiles);
    // fascia boards and timber soffits
    const fy0=yE-0.27,fy1=yE+0.05;vrect(O,s0,d0,s1,d0,fy0,fy1,NW(),C.timberD,TM.wood);vrect(O,s1,d1,s0,d1,fy0,fy1,NE(),C.timberD,TM.wood);vrect(O,s0,d1,s0,d0,fy0,fy1,NS(),C.timberD,TM.wood);vrect(O,s1,d0,s1,d1,fy0,fy1,NN(),C.timberD,TM.wood);
    const dn=[0,-1,0],ys=fy0;const ring=[[s0,d0,sS,dW],[s1,d0,sN,dW],[s1,d1,sN,dM],[s0,d1,sS,dM]];
    for(let k=0;k<4;k++){const [a0,b0,a1,b1]=ring[k],[c0,e0,c1,e1]=ring[(k+1)%4];q4(O,L3(a0,b0,ys),L3(c0,e0,ys),L3(c1,e1,ys),L3(a1,b1,ys),[a0,b0],[c0,e0],[c1,e1],[a1,b1],shade(C.clad,0.9),TM.wood,0,dn)}
    // rafter tails under the soffit (east side, over the balcony)
    for(let s=sS+0.4;s<sN-0.2;s+=0.6)lbox(O,s,(dM+d1)/2,ys-0.11,0.07,0.11,d1-dM-0.05,C.timberD,TM.wood);
    // rendered chimney with a small hood
    const sc=sS+(sN-sS)*0.6,dcc=dc+0.35;lbox(O,sc,dcc,yE+0.6,0.64,yR+1.0-(yE+0.6),0.64,C.render,TM.plaster);lbox(O,sc,dcc,yR+1.0,0.8,0.09,0.8,shade(C.render,0.92),TM.plaster,true);
    for(const [i,j] of [[-1,-1],[1,-1],[1,1],[-1,1]])lbox(O,sc+i*0.26,dcc+j*0.26,yR+1.09,0.08,0.24,0.08,C.render,TM.plaster);
    const hA=L3(sc-0.42,dcc-0.42,yR+1.33),hB=L3(sc+0.42,dcc-0.42,yR+1.33),hC=L3(sc+0.42,dcc+0.42,yR+1.33),hD=L3(sc-0.42,dcc+0.42,yR+1.33),hR1=L3(sc-0.42,dcc,yR+1.55),hR2=L3(sc+0.42,dcc,yR+1.55);
    q4(O,hA,hB,hR2,hR1,[0,0],[0.84,0],[0.84,0.5],[0,0.5],C.tileD,TM.tiles,0,[0,1,-1]);q4(O,hC,hD,hR1,hR2,[0,0],[0.84,0],[0.84,0.5],[0,0.5],C.tileD,TM.tiles,0,[0,1,1]);
    t3(O,hD,hA,hR1,[0,0],[0.84,0],[0.42,0.2],C.render,TM.plaster,NS());t3(O,hB,hC,hR2,[0,0],[0.84,0],[0.42,0.2],C.render,TM.plaster,NN());
    SB.roof={yE:yF+yE,yR:yF+yR}}

  /* ===== lettering ===== */
  {const sEnd=Math.min(sN-0.5,0.3),sBeg=sS+0.6,L=Math.min(6.4,sEnd-sBeg),sm=(sBeg+sEnd)/2;tquad(sm-L/2,dM+0.012,sm+L/2,dM+0.012,H.glass1+0.07,H.glass1+0.40,ruv('A'),NE());SB.fascia={s0:sm-L/2,s1:sm+L/2}}
  if(doorE){const e=doorE,sm=(e.s0+e.s1)/2,L=Math.min(2.9,e.L-0.1);tquad(sm-L/2,e.d+0.125,sm+L/2,e.d+0.125,H.gfTop+0.03,H.beam-0.03,ruv('B'),NE());SB.door=W2(sm,e.d);
    // lit sign also on the south gable towards Kassaveti
  }
  {const e=E.find(e=>e.kind==='S');if(e){const cl=clip(e);if(cl){const [A,B]=cl;const L=Math.hypot(B[0]-A[0],B[1]-A[1]),w=Math.min(3.2,L-0.8);const ms=(A[0]+B[0])/2,md=(A[1]+B[1])/2,ux=(B[0]-A[0])/L,ud=(B[1]-A[1])/L,o=0.03;
    const ons=e.on[0]*F.tx+e.on[1]*F.tz,ond=e.on[0]*F.nx+e.on[1]*F.nz;tquad(ms-ux*w/2+ons*o,md-ud*w/2+ond*o,ms+ux*w/2+ons*o,md+ud*w/2+ond*o,5.74,6.05,ruv('B'),[e.on[0],0,e.on[1]])}}}

  /* ===== courtyard ===== */
  buildCourt(ps,E,yPave,courtLvl,doorE,H);
  /* text mesh */
  if(TXT.i.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(TXT.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(TXT.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(TXT.u,2));g.setIndex(TXT.i);g.computeBoundingSphere();
    const mat=signAtlas();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;m.onBeforeRender=()=>{const nt=typeof SKY!=='undefined'?SKY.night:0;mat.emissiveIntensity=nt*1.15};scene.add(m);ch.detail.push(m);SB.textMesh=m}
  // night light: shop windows and courtyard lanterns light the paving and the facade
  if(typeof addLight==='function'){for(const e of E)if(e.kind==='bay'){const m=[(e.a[0]+e.c[0])/2+e.on[0]*2.2,(e.a[1]+e.c[1])/2+e.on[1]*2.2];addLight(m[0],m[1],6.5,1,0.75)}}
  SB.built=true;SB.ms=Math.round(performance.now()-t0)}

/* ---------- courtyard: paving, planters, gate, terrace, umbrellas, lanterns, pine ---------- */
function buildCourt(ps,E,yPave,courtLvl,doorE,H){const yP=yPave-yF;// local y of the paving surface
  // paving polygon: street wall -> b423 corner -> villa front + west wall -> Starbucks east facade (vertex for vertex)
  const rlB=(typeof MAP!=='undefined'&&MAP.buildings||[]).find(b=>b[11]&&b[11].id==='w1076768348');let rl=rlB?unp(rlB[10]):RL0;
  const rlFront=[[172.8,66.4],[170.6,65.7],[170.1,67.3],[166.3,66.1],[166.8,64.5],[161.5,62.8]].map(p=>{let bd=1e9,bp=p;for(const q of rl){const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;bp=q}}return bd<1.5?bp:p});
  const sbE=[];{// east-side vertices of the footprint from the NE corner to the SE corner
    let iNE=0,iSE=0,bNE=-1e9,bSE=-1e9;ps.forEach((p,i)=>{const s=S_(p),d=D_(p);if(s+d*0.6>bNE){bNE=s+d*0.6;iNE=i}if(-s+d*0.6>bSE){bSE=-s+d*0.6;iSE=i}});
    const walk=st=>{const o=[];for(let i=iNE,k=0;k<ps.length;k++,i=(i+ps.length+st)%ps.length){o.push(ps[i]);if(i===iSE)break}return o};const md=a=>a.slice(1,-1).reduce((t,p)=>t+D_(p),0)/Math.max(1,a.length-2);
    const fw=walk(1),bw=walk(-1);sbE.push(...((fw.length>2&&(bw.length<=2||md(fw)>md(bw)))?fw:bw));
    if(sbE.length<2||D_(sbE[0])<F.dM-1){sbE.length=0;sbE.push(...FP0.slice(1,13).reverse())}}
  const rlW=rlFront[rlFront.length-1];const rlN=[rlW[0]+(166.1-161.5)*0.46,rlW[1]+(48.7-62.8)*0.46];
  const ring=[...STREET_W,...STREET_E.slice(0),B423C,...rlFront,rlN,...sbE];// street wall west, gate, east segment, b423 corner, villa, alley, Starbucks
  const clean=[];for(const p of ring){const q=clean[clean.length-1];if(!q||Math.hypot(q[0]-p[0],q[1]-p[1])>0.05)clean.push(p)}
  if(polyArea(clean)<0)clean.reverse();
  const tris=triangulate([clean]);let nt=0;for(const t of tris){const out=[];subdiv(t[0],t[1],t[2],2.5,out);for(let i=0;i<out.length;i+=3){let a=out[i],b=out[i+1],c=out[i+2];const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr>0){const q=b;b=c;c=q}
      const Y=p=>terr(p[0],p[1])+courtLvl+0.025;const uv=p=>[S_(p)/2.4,D_(p)/2.4];O.tri([a[0],Y(a),a[1]],[b[0],Y(b),b[1]],[c[0],Y(c),c[1]],uv(a),uv(b),uv(c),C1,RECT[T.sbFlags],0,true);nt++}}
  SB.court={ring:clean,tris:nt,y:yPave};
  // the gap between the old paving level and the street: a granite edge strip along the street wall line
  const segL=(P,Q,w,h,col,tile,G)=>{const dx=Q[0]-P[0],dz=Q[1]-P[1],L=Math.hypot(dx,dz);const ry=Math.atan2(-dz,dx);const y=Math.max(terr(P[0],P[1]),terr(Q[0],Q[1]))+courtLvl;(G||O).box((P[0]+Q[0])/2,y+h/2-0.08,(P[1]+Q[1])/2,L,h+0.08,w,ry,col,RECT[tile],1)};
  // street-edge stone planter troughs with shrubs on the WEST wall segment (the photo's foreground), replacing the generic wall there
  if(typeof MAP!=='undefined'&&MAP.walls)for(const w of MAP.walls){const pts=unp(w[1]);if(pts.length>=2&&pts.every(p=>Math.hypot(p[0]-160.2,p[1]-72.0)<5))w[1]=[]}
  {const P0=STREET_W[0],P1=STREET_W[STREET_W.length-1],dx=P1[0]-P0[0],dz=P1[1]-P0[1],L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;const ix=F.tx,iz=F.tz;// inward = towards the courtyard (north)
    const nT=3,gap=0.35,tl=(L-0.2-gap*(nT-1))/nT;for(let k=0;k<nT;k++){const t0=0.1+k*(tl+gap),tm=t0+tl/2;const x=P0[0]+ux*tm+ix*0.38,z=P0[1]+uz*tm+iz*0.38;const y=terr(x,z)+courtLvl;
      O.box(x,y+0.31,z,tl,0.62,0.7,Math.atan2(-uz,ux),C.trough,RECT[TM.ashlar],1);O.box(x,y+0.6,z,tl-0.12,0.04,0.58,Math.atan2(-uz,ux),hexc('#4a3b2c'),RECT[TM.soil||T.soil],1);
      shrubRow(x,y+0.62,z,ux,uz,tl-0.2,0.5,0.55,k*7+1);for(const s of[-1,1])addSeg(x-ux*tl/2+ix*0.35*s,z-uz*tl/2+iz*0.35*s,x+ux*tl/2+ix*0.35*s,z+uz*tl/2+iz*0.35*s,'w');
      placed('planter',x,z,'Kassaveti 19 street planter','lm-starbucks (photo starbucks_01)')}
    // low granite kerb under the troughs, closing the street edge
    segL([P0[0]+ix*0.02,P0[1]+iz*0.02],[P1[0]+ix*0.02,P1[1]+iz*0.02],0.3,0.12,hexc('#b9b4aa'),TM.curb||T.curb)}
  // gate piers (rusticated stone, 1.25 m) either side of the courtyard entrance, with the address plate
  for(const p of GATE){const x=p[0]+F.tx*0.25,z=p[1]+F.tz*0.25,y=terr(x,z)+courtLvl;O.box(x,y+0.6,z,0.5,1.25,0.5,F.ry,C.stoneW,RECT[TM.rubble],1);O.box(x,y+1.27,z,0.6,0.1,0.6,F.ry,C.trough,RECT[TM.ashlar],1);addBoxC(x,z,0.27,'w')}
  {const p=GATE[0],x=p[0]+F.tx*0.25,z=p[1]+F.tz*0.25,y=terr(x,z)+courtLvl;const o=0.255;const A=[x-F.nx*0.2-F.tx*o,y+0.78,z-F.nz*0.2-F.tz*o],B=[x+F.nx*0.2-F.tx*o,y+0.78,z+F.nz*0.2-F.tz*o];
    textQuad(A,B,[B[0],B[1]+0.1,B[2]],[A[0],A[1]+0.1,A[2]],ruv('E'),[-F.tx,0,-F.tz])}
  // linear drain grate across the courtyard, parallel to the facade (photo)
  {const s0=-7.9,s1=-0.9,d=F.dB+3.2;if(S_(GATE[0])<-6){const m=W2((s0+s1)/2,d);O.box(m[0],terr(m[0],m[1])+courtLvl+0.03,m[1],s1-s0,0.012,0.14,F.ry,hexc('#3b3c3c'),RECT[T.metal],1)}}

  /* --- Starbucks terrace: tables, chairs, umbrellas, planter boxes --- */
  const dB=F.dB,sDoor=doorE?(doorE.s0+doorE.s1)/2:-4.2;const seats=[];
  const tables=[[-7.0,dB+1.45,4],[-0.95,dB+1.35,3],[-6.9,dB+4.3,4],[-4.6,dB+5.4,2]].filter(t=>Math.abs(t[0]-sDoor)>1.6||t[1]>dB+3.5);
  const G=CUT;// small furniture: detail mesh (hidden beyond 200 m)
  for(const [s,d,nc] of tables){const p=W2(s,d),y=terr(p[0],p[1])+courtLvl+0.025-yF;const tt=hf(Math.round(s*13+d*7));
    // square bistro table, dark wood
    lbox(G,s,d,y+0.72,0.72,0.04,0.72,C.table,TM.wood,true);lbox(G,s,d,y+0.04,0.07,0.68,0.07,C.iron,T.metal);lbox(G,s,d,y,0.46,0.04,0.46,C.iron,T.metal);
    addBoxC(p[0],p[1],0.38,'p');placed('table',p[0],p[1],'Starbucks terrace table','lm-starbucks (photo starbucks_01, estimated layout)');
    for(let k=0;k<nc;k++){const a=k*Math.PI/2+(nc===3&&k===2?Math.PI/2:0)+Math.PI/4*0;const ox=Math.sin(a),od=Math.cos(a);const cs=s+ox*0.62,cd=d+od*0.62;chair(G,cs,cd,y,Math.atan2(-ox,-od)+(tt-0.5)*0.25);
      const w=W2(cs,cd);const yaw=Math.atan2(-(ox*F.tx+od*F.nx),-(ox*F.tz+od*F.nz));seats.push({x:w[0],z:w[1],yaw,seatH:0.45,kind:'chair',name:'Starbucks',table:[p[0],p[1]]})}}
  // brick-red timber planter boxes along the facade, either side of the door
  for(const [s,d,l] of [[sDoor-2.05,dB+0.55,1.1],[sDoor+2.05,dB+0.55,1.1],[-8.0,dB+2.9,0.9]]){const p=W2(s,d),y=terr(p[0],p[1])+courtLvl+0.025-yF;lbox(O,s,d,y,l,0.5,0.42,C.planter,TM.wood);
    for(let k=0;k<3;k++)lbox(O,s,d+0.215,y+0.06+k*0.15,l-0.02,0.012,0.01,shade(C.planter,0.7),TM.wood);const w=W2(s,d);shrubRow(w[0],yF+y+0.5,w[1],F.tx,F.tz,l-0.15,0.36,0.42,Math.round(s*10));addBoxC(w[0],w[1],0.3,'p')}
  // square market umbrellas (3 m / 2.6 m, dark green, "STARBUCKS COFFEE" valances) — one on the balcony
  const umb=[[-6.95,dB+2.6,3.0,0],[-1.6,dB+2.0,2.6,0],[-6.6,dB+5.2,2.8,0],[F.sS+1.4,(F.dM+dB)/2,1.5,H.deck]];
  for(const [s,d,sz,yb] of umb){const p=W2(s,d);const y=yb?yb:terr(p[0],p[1])+courtLvl+0.025-yF;umbrella(s,d,y,sz,!!yb);if(!yb)addBoxC(p[0],p[1],0.12,'p')}
  // A-frame menu board by the door
  if(doorE){const s=sDoor+1.35,d=dB+0.9,p=W2(s,d),y=terr(p[0],p[1])+courtLvl+0.025-yF;const A=L3(s-0.3,d+0.18,y),B=L3(s+0.3,d+0.18,y),Cc=L3(s+0.3,d,y+0.95),D=L3(s-0.3,d,y+0.95);
    textQuad(A,B,Cc,D,ruv('D'),NE());const A2=L3(s+0.3,d-0.18,y),B2=L3(s-0.3,d-0.18,y);q4(G,A2,B2,D,Cc,[0,0],[0.6,0],[0.6,0.95],[0,0.95],hexc('#2c2b28'),TM.wood,0,NW());
    beam(G,L3(s-0.31,d+0.19,y),L3(s-0.31,d,y+0.96),0.03,0.03,C.timber,TM.wood);beam(G,L3(s+0.31,d+0.19,y),L3(s+0.31,d,y+0.96),0.03,0.03,C.timber,TM.wood)}
  // cast-iron lantern posts (warm light at night)
  for(const [s,d] of [[-0.35,dB+1.05],[S_(GATE[0])+0.55,D_(GATE[0])-0.45]]){const p=W2(s,d);lantern(p[0],p[1],terr(p[0],p[1])+courtLvl+0.025)}
  // litter bin by the street planters (photo)
  {const s=S_(GATE[0])+0.6,d=D_(GATE[0])-1.3,p=W2(s,d),y=terr(p[0],p[1])+courtLvl+0.025;O.cyl(p[0],y,p[1],0.22,0.24,0.9,10,hexc('#3a3d3b'),RECT[T.metal],true,0,1);addBoxC(p[0],p[1],0.24,'p')}
  // the big courtyard pine (photo: tall trunk left of the Starbucks front, crown above the roof)
  if(typeof treeGeo==='function'&&typeof treeChunk==='function'){const p=W2(-7.95,F.dB+0.9);plantOne(p[0],p[1],'pine',1.18);addBoxC(p[0],p[1],0.38,'t');placed('tree',p[0],p[1],'pine','lm-starbucks (photo starbucks_01)')}
  if(typeof SEATS!=='undefined')for(const q of seats)SEATS.push(q);SB.seats=seats.length}

function chair(G,s,d,y,yawLocal){// slatted dark-timber café chair, seat 0.45 m; yawLocal: facing direction in the local frame (0 = +d)
  const fs=Math.sin(yawLocal),fd=Math.cos(yawLocal),rs=fd,rd=-fs;const P=(a,b,h)=>L3(s+fs*a+rs*b,d+fd*a+rd*b,y+h);
  for(const [a,b] of [[0.19,0.19],[0.19,-0.19],[-0.19,0.19],[-0.19,-0.19]])beam(G,P(a,b,0),P(a,b,0.43),0.035,0.035,C.chair,TM.wood);
  for(let k=0;k<4;k++){const a=-0.2+k*0.135;beam(G,P(a,-0.22,0.44),P(a,0.22,0.44),0.03,0.11,C.chair,TM.wood)}
  for(const b of[0.19,-0.19])beam(G,P(-0.19,b,0.43),P(-0.24,b,0.86),0.035,0.035,C.chair,TM.wood);for(let k=0;k<3;k++){const h=0.58+k*0.1;beam(G,P(-0.2-(h-0.43)*0.12,-0.2,h),P(-0.2-(h-0.43)*0.12,0.2,h),0.025,0.065,C.chair,TM.wood)}}
function umbrella(s,d,y,sz,small){const h=small?2.15:2.5,yc=y+h-0.15,ya=y+h+0.35,hs=sz/2;const G=CUT;
  lbox(G,s,d,y,0.5,0.07,0.5,hexc('#2b2b2a'),T.metal);beam(G,L3(s,d,y+0.05),L3(s,d,ya+0.1),0.05,0.05,hexc('#cfc9bd'),T.metal);
  const cor=[[-hs,-hs],[hs,-hs],[hs,hs],[-hs,hs]],apex=L3(s,d,ya);
  for(let k=0;k<4;k++){const [a0,b0]=cor[k],[a1,b1]=cor[(k+1)%4];const A=L3(s+a0,d+b0,yc),B=L3(s+a1,d+b1,yc);const mid=[(a0+a1)/2,(b0+b1)/2];const out=[mid[0]*F.tx+mid[1]*F.nx,1.5,mid[0]*F.tz+mid[1]*F.nz];
    t3(O,A,B,apex,[0,0],[1,0],[0.5,0.6],C.green,T.sbCanvas,out);t3(O,B,A,[apex[0],apex[1]-0.02,apex[2]],[0,0],[1,0],[0.5,0.6],shade(C.green,0.62),T.sbCanvas,[-out[0],-1,-out[2]]);
    // valance: canvas inside, lettering outside
    const yv=yc-0.24,o=[out[0],0,out[2]];const A2=[A[0],yv,A[2]],B2=[B[0],yv,B[2]];q4(O,B,A,A2,B2,[0,0],[1,0],[1,0.2],[0,0.2],shade(C.green,0.7),T.sbCanvas,0,[-o[0],0,-o[2]]);
    const e=0.006,on=nrmz(o);const P=q=>[q[0]+on[0]*e,q[1],q[2]+on[2]*e];textQuad(P(A2),P(B2),P(B),P(A),ruv('C',0.04,0.96),o);
    // strut from the pole to the corner
    beam(G,L3(s,d,yc-0.55),L3(s+a0*0.96,d+b0*0.96,yc-0.01),0.025,0.025,hexc('#cfc9bd'),T.metal)}
  lbox(G,s,d,ya-0.02,0.12,0.1,0.12,C.greenD,T.sbCanvas)}
function lantern(x,z,y){const G=O,ic=C.iron;G.cyl(x,y,z,0.15,0.11,0.55,10,ic,RECT[T.metal],false,0,1);G.cyl(x,y+0.55,z,0.06,0.05,2.55,8,ic,RECT[T.metal],false,0,1);G.cyl(x,y+3.08,z,0.1,0.07,0.1,8,ic,RECT[T.metal],false,0,1);
  G.box(x,y+3.4,z,0.3,0.42,0.3,F.ry,[1,0.93,0.78],RECT[T.white],1,1);for(const [i,j] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const px=x+(F.tx*i+F.nx*j)*0.155,pz=z+(F.tz*i+F.nz*j)*0.155;G.box(px,y+3.4,pz,0.03,0.46,0.03,F.ry,ic,RECT[T.metal],1)}
  G.cyl(x,y+3.61,z,0.25,0.04,0.22,4,ic,RECT[T.metal],true,0,1);G.cyl(x,y+3.83,z,0.03,0.0,0.14,6,ic,RECT[T.metal],true,0,1);addBoxC(x,z,0.15,'p');
  if(typeof addLight==='function')addLight(x,z,8,0,0.9);placed('lamp',x,z,'courtyard lantern','lm-starbucks (photo ralphlauren_03)')}
function shrubRow(x,y,z,ux,uz,len,depth,h,seed){// clipped evergreen shrubs: dark core + alpha-cut leaf cards
  const G=CUT;const nb=Math.max(1,Math.round(len/0.55));for(let k=0;k<nb;k++){const t=(k+0.5)/nb-0.5;const cx=x+ux*t*len,cz=z+uz*t*len;const r=0.32+hf(seed*31+k)*0.12,hh=h*(0.75+hf(seed+k*7)*0.5);
    O.box(cx,y+hh*0.42,cz,r*1.5,hh*0.8,depth*0.8,Math.atan2(-uz,ux),shade(hexc('#3f5f30'),0.8+hf(k+seed)*0.25),RECT[T.hedge],1);
    for(let q=0;q<9;q++){const u=hf(seed*97+k*13+q),v=hf(seed*31+k*7+q*3),w=hf(seed*17+k*29+q*5);const th=u*TAU;const px=cx+Math.cos(th)*r*0.8*w,pz=cz+Math.sin(th)*depth*0.5*w,py=y+hh*(0.25+0.7*v);
      const sz=0.38+0.2*hf(q+k+seed),a=hf(q*7+seed+k)*TAU,ax=Math.cos(a)*sz/2,az=Math.sin(a)*sz/2,nn=nrmz([Math.cos(th),0.6,Math.sin(th)]);const c=shade(C.leaf,0.8+0.35*v);
      const o=G.v(px-ax,py-sz/2,pz-az,nn[0],nn[1],nn[2],0,0,c,RECT[T.leaves],0);G.v(px+ax,py-sz/2,pz+az,nn[0],nn[1],nn[2],1,0,c,RECT[T.leaves],0);G.v(px+ax,py+sz/2,pz+az,nn[0],nn[1],nn[2],1,1,c,RECT[T.leaves],0);G.v(px-ax,py+sz/2,pz-az,nn[0],nn[1],nn[2],0,1,c,RECT[T.leaves],0);G.i.push(o,o+1,o+2,o,o+2,o+3)}}}
function plantOne(x,z,kind,sc){if(!TREE[kind])TREE[kind]=treeGeo(kind);const Gt=TREE[kind],c=treeChunk(x,z);const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),hf(Math.floor(x*13+z*7))*TAU);
  m.compose(new THREE.Vector3(x,terr(x,z),z),q,new THREE.Vector3(sc,sc,sc));for(const [geo,mat] of [[Gt.solid,MAT.atlas],[Gt.leaf,MAT.leaf]]){if(!geo)continue;const im=new THREE.InstancedMesh(geo,mat,1);im.setMatrixAt(0,m);im.castShadow=true;im.frustumCulled=false;c.detail.push(im);scene.add(im)}}

LM.register({id:'starbucks',at:[[156.5,61.5]],build(ctx){try{build(ctx)}catch(e){console.error('lm-starbucks build failed',e);throw e}}});
})();
