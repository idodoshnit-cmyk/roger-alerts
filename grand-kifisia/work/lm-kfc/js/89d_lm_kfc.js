'use strict';
/* 89d_lm_kfc.js — hand-modelled landmark (owner: bot lm-kfc): the Mela arcade / Εμπορικό Κέντρο Μελά, Kifisias Ave 238-240,
   site of the Grand Hotel de Kifissia (opened 1897, Melas family) — today a low arcade complex around a SUNKEN forecourt that opens
   onto Kifisias Avenue opposite Platanos square. KFC is on the UPPER (gallery) level at the avenue end of the north wing.
   Evidence and every modelling decision: docs/research/lm/kfc.md. Main photo reference: Wikimedia Commons "Κηφισιά 4102.jpg"
   (C messier, CC BY-SA 4.0, drone view looking NNE along Kifisias Ave). What it shows and what is built here:
   - north wing: lower floor at court level (glazed shop units between white piers), above it a loggia of square white columns with a
     glass/steel balustrade (restaurant terraces), heavy white beam, one big terracotta hipped roof. The site slopes up to the east, so
     the gallery is a storey above the court at the avenue end and at grade with the garden at the east end.
   - KFC: terrace + restaurant at gallery level at the avenue end, black sign band with white "KFC" letters (plain text, no logo).
   - a wide stair rises from the avenue pavement (next to the kiosk) to the gallery; a second flight goes DOWN from the pavement
     into the forecourt, which lies ~1.75 m below the avenue behind a rough-stone retaining wall.
   - forecourt: grey slabs, black steel-and-glass restaurant pavilion with white retractable awnings and a red floor.
   - south block: café colonnade on the avenue (closed black umbrellas), hipped terracotta roofs, grey metal roof near the wing.
   Walkable: the stairs, the gallery and the KFC terrace (via the shared level grid LVL; the court is cut out of the terrain mesh).
   Map building b305 (OSM way 1075952145) is handed to this file by 89_landmarks.js. Units metres, x east, z south. */
(function(){
/* ---------------- material layers (registered at script load, see docs/MATERIALS.md §4) ---------------- */
const KFC_RED='#e4002b';
const fitText=(g,txt,maxW,size,font)=>{let fs=size;g.font=`${font.replace('$',fs)}`;while(g.measureText(txt).width>maxW&&fs>6){fs-=1;g.font=font.replace('$',fs)}return fs};
// KFC sign layer. top half: the black sign band seen in the photo (white "KFC" capitals; a red square plate with "KFC" in it — text, no logo);
// bottom half: red box sign (white KFC on red)
defTile('lmKfcSign',(g,S,m)=>{const H=S/4;g.textAlign='center';g.textBaseline='middle';const F='bold $px Arial Black,Arial,Helvetica,sans-serif';
  g.fillStyle='#151516';g.fillRect(0,0,S,H);g.fillStyle=KFC_RED;g.fillRect(6,5,H-10,H-10);g.fillStyle='#fff';fitText(g,'KFC',H-16,22,F);g.fillText('KFC',6+(H-10)/2,H/2+1);
  fitText(g,'KFC',S-H-30,40,F);g.fillText('KFC',H+(S-H)/2,H/2+2);m.fillStyle='#000';m.fillRect(0,0,S,H);m.fillStyle='#fff';m.textAlign='center';m.textBaseline='middle';m.font=g.font;m.fillText('KFC',H+(S-H)/2,H/2+2);m.fillStyle='#aaa';m.fillRect(6,5,H-10,H-10);
  g.fillStyle=KFC_RED;g.fillRect(0,H,S,H);g.fillStyle='#fff';fitText(g,'KFC',S*0.7,44,F);g.fillText('KFC',S/2,H+H/2+2);m.fillStyle='#777';m.fillRect(0,H,S,H);m.fillStyle='#fff';m.font=g.font;m.fillText('KFC',S/2,H+H/2+2);
  for(let i=0;i<16;i++){g.fillStyle=i%2?'#ffffff':KFC_RED;g.fillRect(i*S/16,2*H,S/16,2*H)}m.fillStyle='#000';m.fillRect(0,2*H,S,2*H)},{spec:.05,shin:30,glowK:2.0});
const kRow=r=>[0.003,0.997,1-(r+1)/4+0.004,1-r/4-0.004];// row r of the KFC sign layer (0 = black band, 1 = red box)
// KFC shop window: bright white interior, red stripe feature wall, menu screens, tables (brand-typical fit-out, INTERIORS.md §4)
defTile('lmKfcGlass',(g,S,m)=>{g.fillStyle='#e9e4dc';g.fillRect(0,0,S,S);g.fillStyle='#f7f4ee';g.fillRect(0,0,S,S*0.62);
  for(let i=0;i<16;i++){g.fillStyle=i%2?'#ffffff':'#c8102e';g.fillRect(i*15,S*0.12,15,S*0.38)}
  g.fillStyle='#161616';for(let i=0;i<4;i++)g.fillRect(18+i*54,S*0.16,44,24);g.fillStyle='#f1c232';for(let i=0;i<4;i++){g.fillRect(22+i*54,S*0.18,14,8);g.fillRect(40+i*54,S*0.18,18,4)}
  g.fillStyle='#c8102e';g.fillRect(0,S*0.62,S,S*0.08);g.fillStyle='#ffffff';g.fillRect(0,S*0.6,S,4);
  g.fillStyle='#4a4644';g.fillRect(0,S*0.7,S,S*0.3);g.fillStyle='#a0703c';for(let i=0;i<3;i++)g.fillRect(20+i*80,S*0.72,52,8);g.fillStyle='#202020';for(let i=0;i<3;i++){g.fillRect(28+i*80,S*0.75,4,40);g.fillRect(60+i*80,S*0.75,4,40)}
  const gr=g.createLinearGradient(0,0,S,S);gr.addColorStop(0,'rgba(255,255,255,0.18)');gr.addColorStop(0.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(255,255,255,0.1)');g.fillStyle=gr;g.fillRect(0,0,S,S);
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{spec:.08,shin:90,glass:.55,glassDark:.25,glowK:1.6});
// generic arcade shop window: warm-lit boutique / restaurant interior seen through glass
defTile('lmMelaGlass',(g,S,m)=>{// warm, bright restaurant / boutique interior seen through clear glass (the gallery fronts in the photo read light)
  const gr=g.createLinearGradient(0,0,0,S);gr.addColorStop(0,'#cdbb9e');gr.addColorStop(0.62,'#e2d5bf');gr.addColorStop(0.63,'#8a7158');gr.addColorStop(1,'#5e4a37');g.fillStyle=gr;g.fillRect(0,0,S,S);
  g.fillStyle='#7d6a55';g.fillRect(0,0,S,S*0.07);// ceiling soffit
  for(let i=0;i<4;i++){const x=32+i*64;g.fillStyle='#3b3128';g.fillRect(x-1,S*0.07,2,S*0.1);g.fillStyle='#ffe3a6';g.beginPath();g.ellipse(x,S*0.18,11,6,0,0,TAU);g.fill();
    const lg=g.createRadialGradient(x,S*0.2,2,x,S*0.2,40);lg.addColorStop(0,'rgba(255,236,190,0.55)');lg.addColorStop(1,'rgba(255,236,190,0)');g.fillStyle=lg;g.fillRect(x-40,S*0.12,80,60)}
  g.fillStyle='#a58f73';g.fillRect(150,S*0.27,96,S*0.33);g.fillStyle='#5b4634';g.fillRect(150,S*0.27,96,4);// bar back shelves
  for(let r=0;r<3;r++)for(let i=0;i<11;i++){g.fillStyle=['#5d7a4a','#8a2f2a','#d9c27a','#3d5a6b'][(i+r)%4];g.fillRect(156+i*8,S*0.3+r*24,5,14)}
  g.fillStyle='#6f5a46';g.fillRect(14,S*0.27,110,S*0.22);g.fillStyle='#e9e0cf';g.fillRect(20,S*0.29,98,S*0.18);g.fillStyle='#9fb19a';g.fillRect(28,S*0.31,40,S*0.12);g.fillStyle='#c98f6a';g.fillRect(74,S*0.33,36,S*0.1);// framed pictures
  g.fillStyle='#4c3a2b';g.fillRect(140,S*0.6,116,S*0.16);g.fillStyle='#d8c7a8';g.fillRect(138,S*0.58,120,6);// bar counter
  const person=(x,y,c)=>{g.fillStyle=c;g.fillRect(x-9,y,18,30);g.fillStyle='#6b4a36';g.beginPath();g.arc(x,y-7,7,0,TAU);g.fill()};
  person(60,S*0.56,'#3c4a5c');person(196,S*0.5,'#efe7da');person(108,S*0.6,'#8a3b3b');
  for(const x of[20,92]){g.fillStyle='#f4efe6';g.fillRect(x,S*0.66,52,7);g.fillStyle='#3a2c20';g.fillRect(x+22,S*0.66+7,6,26);g.fillStyle='#7a5a3c';g.fillRect(x-10,S*0.68,10,26);g.fillRect(x+52,S*0.68,10,26)}
  const r=g.createLinearGradient(0,0,S,S);r.addColorStop(0,'rgba(225,238,255,0.30)');r.addColorStop(0.4,'rgba(255,255,255,0.0)');r.addColorStop(0.75,'rgba(255,255,255,0.06)');r.addColorStop(1,'rgba(225,238,255,0.22)');g.fillStyle=r;g.fillRect(0,0,S,S);
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{spec:.08,shin:90,glass:.55,glassDark:.2,glowK:1.4});
// kiosk front: white aluminium frame, glazed fridge doors with drinks, magazines, a blue band (no text)
defTile('lmKioskF',(g,S,m)=>{g.fillStyle='#f3f3f1';g.fillRect(0,0,S,S);g.fillStyle='#1f4f9c';g.fillRect(0,0,S,S*0.1);g.fillStyle='#d42a2a';g.fillRect(0,S*0.1,S,4);
  g.fillStyle='#2c3138';g.fillRect(10,S*0.18,S*0.45,S*0.76);for(let r=0;r<5;r++)for(let i=0;i<9;i++){g.fillStyle=['#c8202a','#f2f2f2','#2f7d32','#f2a51a','#1d5fa8'][(i*3+r)%5];g.fillRect(16+i*12,S*0.22+r*36,8,24)}
  g.fillStyle='rgba(255,255,255,0.18)';g.fillRect(10,S*0.18,S*0.2,S*0.76);
  g.fillStyle='#e9e4da';g.fillRect(S*0.55,S*0.18,S*0.42,S*0.76);for(let r=0;r<6;r++)for(let i=0;i<4;i++){g.fillStyle=['#d63a5a','#2b6cb0','#f0c419','#3a9d5d','#7a3fa0','#e8743b'][(i+r*2)%6];g.fillRect(S*0.57+i*26,S*0.2+r*30,22,27)}
  m.fillStyle='#000';m.fillRect(0,0,S,S);m.fillStyle='#888';m.fillRect(10,S*0.18,S*0.45,S*0.76)},{spec:.15,shin:60,glowK:1.5});
// kiosk roof ad screens (generic bright ad layouts, no brands)
defTile('lmKioskAd',(g,S,m)=>{const gr=g.createLinearGradient(0,0,0,S);gr.addColorStop(0,'#5fb6e8');gr.addColorStop(1,'#1d5fa8');g.fillStyle=gr;g.fillRect(0,0,S,S);
  g.fillStyle='#ffffff';g.fillRect(S*0.08,S*0.12,S*0.5,S*0.1);g.fillRect(S*0.08,S*0.28,S*0.34,S*0.06);g.fillStyle='#f6d54a';g.beginPath();g.arc(S*0.74,S*0.62,S*0.18,0,TAU);g.fill();
  g.fillStyle='rgba(255,255,255,0.85)';g.fillRect(S*0.08,S*0.78,S*0.4,S*0.08);m.fillStyle='#ccc';m.fillRect(0,0,S,S)},{spec:.3,shin:80,glowK:1.6});
// the lower units of the wing in the photo have pale green-tinted glass (frosted / reflective)
defTile('lmMelaGlassG',(g,S,m)=>{const gr=g.createLinearGradient(0,0,0,S);gr.addColorStop(0,'#9fb8b0');gr.addColorStop(0.6,'#7f9a93');gr.addColorStop(1,'#5f7570');g.fillStyle=gr;g.fillRect(0,0,S,S);
  g.fillStyle='rgba(40,50,48,0.35)';g.fillRect(0,S*0.55,S,S*0.45);g.fillStyle='rgba(255,240,210,0.35)';for(let i=0;i<4;i++)g.fillRect(20+i*58,S*0.12,30,5);
  const r=g.createLinearGradient(0,0,S,S);r.addColorStop(0,'rgba(255,255,255,0.28)');r.addColorStop(0.5,'rgba(255,255,255,0.03)');r.addColorStop(1,'rgba(255,255,255,0.18)');g.fillStyle=r;g.fillRect(0,0,S,S);
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{spec:.1,shin:90,glass:.8,glassDark:.3,glowK:1.2});
// white retractable awning fabric (pavilion)
defTile('lmAwnW',(g,S)=>{g.fillStyle='#ece9e2';g.fillRect(0,0,S,S);for(let i=0;i<8;i++){g.fillStyle='rgba(0,0,0,0.05)';g.fillRect(i*30,0,3,S)}g.fillStyle='rgba(0,0,0,0.08)';g.fillRect(0,S-14,S,14)},{spec:.02,shin:8});
// two sign sheets, 8 rows each (row = 240×30 design units = an 8:1 fascia panel). Text only, real business names (OSM/Overture at Kifisias 238-240).
const SIGNS_A=[['Meligan Beauty spot','#f3ece4','#5a3b48','serif'],['Fairynails','#ffffff','#b0457a','script'],['ΦΩΤΟ  FOTO','#1d1d1f','#ffffff','sans'],['Simply Burgers','#151515','#f2b632','sans'],
  ["Mailo's  The Pasta Project",'#f4efe6','#2a2a2a','serif'],['GORDO','#20302a','#f2d27a','sans'],['CELEST  ALL DAY','#0f0f10','#e8d9b0','serif'],['La Puerkita','#7a1f1f','#ffe9c7','script']];
const SIGNS_B=[['Bubble Tale','#121212','#d9b25c','script'],['OLD BOY MEMBERS CLUB','#101010','#efe6d2','serif'],['ROJO','#8c1c13','#ffffff','sans'],['KESSARIS','#0d0d0d','#d4af37','serif'],
  ['ΕΜΠΟΡΙΚΟ ΚΕΝΤΡΟ ΜΕΛΑ','#efe9dc','#3b3226','serif'],['MELA  ·  ARCADE','#efe9dc','#3b3226','serif'],['ΠΕΡΙΠΤΕΡΟ','#1f4f9c','#ffffff','sans'],['KFC  ▸  ΚΕΝΤΡΟ ΜΕΛΑ','#e4002b','#ffffff','sans']];
const FONTS={serif:'bold $px Georgia,Times New Roman,serif',sans:'bold $px Arial,Helvetica,sans-serif',script:'italic bold $px Georgia,serif'};
const sheet=list=>(g,S,m)=>{const H=S/8;list.forEach(([t,bg,fg,st],i)=>{const y=i*H;g.fillStyle=bg;g.fillRect(0,y,S,H);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
  fitText(g,t,S-16,Math.floor(H*0.62),FONTS[st]||FONTS.sans);g.fillText(t,S/2,y+H/2+1);g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=1;g.strokeRect(0.5,y+0.5,S-1,H-1);
  m.fillStyle='#333';m.fillRect(0,y,S,H);m.fillStyle='#fff';m.textAlign='center';m.textBaseline='middle';m.font=g.font;m.fillText(t,S/2,y+H/2+1)})};
defTile('lmMelaSignsA',sheet(SIGNS_A),{spec:.04,shin:20,glowK:1.8});
defTile('lmMelaSignsB',sheet(SIGNS_B),{spec:.04,shin:20,glowK:1.8});
const SG=name=>{let i=SIGNS_A.findIndex(r=>r[0].indexOf(name)===0);if(i>=0)return[T.lmMelaSignsA,rowUV(i)];i=SIGNS_B.findIndex(r=>r[0].indexOf(name)===0);return[T.lmMelaSignsB,rowUV(Math.max(0,i))]};

/* ---------------- geometry helpers ---------------- */
const add2=(a,b,k)=>[a[0]+b[0]*k,a[1]+b[1]*k],sub2=(a,b)=>[a[0]-b[0],a[1]-b[1]],len2=a=>Math.hypot(a[0],a[1]),nrm2=a=>{const l=len2(a)||1;return[a[0]/l,a[1]/l]};
// local frame: F(s,t) = o + u*s + v*t (u,v unit, perpendicular)
function frame(o,u,v){return{o,u,v,P(s,t){return[o[0]+u[0]*s+v[0]*t,o[1]+u[1]*s+v[1]*t]}}}
const Oc=(x,z)=>chunkAt(x,z).o,Cc=(x,z)=>chunkAt(x,z).cut;
// vertical wall from a to b (world 2D), facing n, uv in metres (u along wall from u0, v = absolute height)
function wallW(a,b,y0,y1,n,col,tile,glow,u0,cut){const L=len2(sub2(b,a));const B=cut?Cc((a[0]+b[0])/2,(a[1]+b[1])/2):Oc((a[0]+b[0])/2,(a[1]+b[1])/2);u0=u0||0;
  B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,n[0],n[1],u0,u0+L,y0,y1,col,RECT[tile],glow||0)}
// a wall quad with explicit uv rectangle (signs, painted windows)
function wallUV(a,b,y0,y1,n,col,tile,glow,uv){const B=Oc((a[0]+b[0])/2,(a[1]+b[1])/2);B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,n[0],n[1],uv[0],uv[1],uv[2],uv[3],col,RECT[tile],glow||0)}
// horizontal polygon (2D points) at height y, facing up (or down); uv in metres
function flat(pts,y,col,tile,down,uvk){const B=Oc(pts[0][0],pts[0][1]);const k=uvk||1;const tris=pts.length===4?[[pts[0],pts[1],pts[2]],[pts[0],pts[2],pts[3]]]:triangulate([pts]);
  for(const tr of tris){const a=tr[0],b=tr[1],c=tr[2];if(!a||!b||!c)continue;const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let A=a,Bp=b,C=c;if((cr>0)!==!!down){Bp=c;C=b}
    B.triN([A[0],y,A[1]],[Bp[0],y,Bp[1]],[C[0],y,C[1]],[0,down?-1:1,0],[0,down?-1:1,0],[0,down?-1:1,0],[A[0]*k,A[1]*k],[Bp[0]*k,Bp[1]*k],[C[0]*k,C[1]*k],col,RECT[tile],0)}}
// box in a local frame: s0..s1, t0..t1, y0..y1. o.bottom adds the underside, o.noTop skips the top, o.skip=[side idx]
function lbox(F,s0,s1,t0,t1,y0,y1,col,tile,o){o=o||{};const c=[F.P(s0,t0),F.P(s1,t0),F.P(s1,t1),F.P(s0,t1)],mid=F.P((s0+s1)/2,(t0+t1)/2);const glow=o.glow||0;
  for(let i=0;i<4;i++){if(o.skip&&o.skip.indexOf(i)>=0)continue;const a=c[i],b=c[(i+1)%4];const m=[(a[0]+b[0])/2-mid[0],(a[1]+b[1])/2-mid[1]];wallW(a,b,y0,y1,nrm2(m),col,tile,glow,0,o.cut)}
  if(!o.noTop)flat(c,y1,o.topCol||col,o.topTile||tile,false);if(o.bottom)flat(c,y0,o.botCol||col,o.topTile||tile,true)}
function quadN(B,a,b,c,d,ua,ub,uc,ud,col,tile,wantUp){const n=B.nrm(a,b,c);if((n[1]>=0)!==wantUp)B.quad(d,c,b,a,ud,uc,ub,ua,col,RECT[tile],0);else B.quad(a,b,c,d,ua,ub,uc,ud,col,RECT[tile],0)}
function triN(B,a,b,c,ua,ub,uc,col,tile,wantUp){const n=B.nrm(a,b,c);if((n[1]>=0)!==wantUp)B.tri(a,c,b,ua,uc,ub,col,RECT[tile],0);else B.tri(a,b,c,ua,ub,uc,col,RECT[tile],0)}
/* hipped roof over a rectangle given as a local frame and extents; ridge along the longer side.
   ov = eave overhang, pitch = rise/run. Builds tiles, fascia board, soffit and ridge/hip caps. */
function hipRoof(F,s0,s1,t0,t1,yE,pitch,ov,o){o=o||{};if(t1-t0>s1-s0)return hipRoof(frame(F.P(0,0),F.v,F.u),t0,t1,s0,s1,yE,pitch,ov,o);
  s0-=ov;s1+=ov;t0-=ov;t1+=ov;const L=s1-s0,W=t1-t0;const B=Oc(...F.P((s0+s1)/2,(t0+t1)/2));
  const tileCol=o.col||[1,0.97,0.94],tile=o.tile||TM.tiles,sec=Math.sqrt(1+pitch*pitch);
  const P3=(s,t,y)=>{const p=F.P(s,t);return[p[0],y,p[1]]};
  const h=W/2*pitch,r=Math.max(0,L/2-W/2),sm=(s0+s1)/2,tm=(t0+t1)/2;const R1=[sm-r,tm],R2=[sm+r,tm];
  const fA=[s0,t0],fB=[s1,t0],fC=[s1,t1],fD=[s0,t1];const yR=yE+h;
  quadN(B,P3(fA[0],fA[1],yE),P3(fB[0],fB[1],yE),P3(R2[0],R2[1],yR),P3(R1[0],R1[1],yR),[fA[0],0],[fB[0],0],[R2[0],(W/2)*sec],[R1[0],(W/2)*sec],tileCol,tile,true);
  quadN(B,P3(fC[0],fC[1],yE),P3(fD[0],fD[1],yE),P3(R1[0],R1[1],yR),P3(R2[0],R2[1],yR),[-fC[0],0],[-fD[0],0],[-R1[0],(W/2)*sec],[-R2[0],(W/2)*sec],tileCol,tile,true);
  triN(B,P3(fB[0],fB[1],yE),P3(fC[0],fC[1],yE),P3(R2[0],R2[1],yR),[fB[1],0],[fC[1],0],[R2[1],(W/2)*sec],tileCol,tile,true);
  triN(B,P3(fD[0],fD[1],yE),P3(fA[0],fA[1],yE),P3(R1[0],R1[1],yR),[-fD[1],0],[-fA[1],0],[-R1[1],(W/2)*sec],tileCol,tile,true);
  // ridge + hip caps (rounded ridge tiles read as a darker line)
  const cap=shade(tileCol,0.8);const capT=(p,q)=>{const a=P3(p[0],p[1],0),b=P3(q[0],q[1],0);const ya=p===R1||p===R2?yR:yE,yb=q===R1||q===R2?yR:yE;const dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,px=-dz/l*0.13,pz=dx/l*0.13;
    B.quad([a[0]-px,ya+0.03,a[2]-pz],[b[0]-px,yb+0.03,b[2]-pz],[b[0],yb+0.12,b[2]],[a[0],ya+0.12,a[2]],[0,0],[l,0],[l,0.2],[0,0.2],cap,RECT[tile],0);
    B.quad([a[0],ya+0.12,a[2]],[b[0],yb+0.12,b[2]],[b[0]+px,yb+0.03,b[2]+pz],[a[0]+px,ya+0.03,a[2]+pz],[0,0],[l,0],[l,0.2],[0,0.2],cap,RECT[tile],0)};
  if(r>0.01)capT(R1,R2);capT(fA,R1);capT(fD,R1);capT(fB,R2);capT(fC,R2);
  // fascia board + soffit
  const fc=o.fascia||[0.93,0.91,0.86];const corners=[fA,fB,fC,fD];const ctr=[sm,tm];
  for(let i=0;i<4;i++){const p=corners[i],q=corners[(i+1)%4];const a=F.P(p[0],p[1]),b=F.P(q[0],q[1]);const mm=F.P((p[0]+q[0])/2,(p[1]+q[1])/2),cc=F.P(ctr[0],ctr[1]);const n=nrm2(sub2(mm,cc));
    wallW(a,b,yE-0.28,yE+0.02,n,fc,TM.plaster,0);
    const ia=F.P(p[0]+(p[0]<ctr[0]?ov:-ov),p[1]+(p[1]<ctr[1]?ov:-ov)),ib=F.P(q[0]+(q[0]<ctr[0]?ov:-ov),q[1]+(q[1]<ctr[1]?ov:-ov));
    quadN(B,[a[0],yE-0.28,a[1]],[b[0],yE-0.28,b[1]],[ib[0],yE-0.28,ib[1]],[ia[0],yE-0.28,ia[1]],[0,0],[1,0],[1,1],[0,1],shade(fc,0.8),TM.plaster,false)}}
function colm(F,s,t,y0,y1,w,col){// square column with base and capital (local frame)
  const h=w/2;lbox(F,s-h,s+h,t-h,t+h,y0+0.22,y1-0.24,col,TM.plaster,{noTop:true});
  lbox(F,s-h-0.08,s+h+0.08,t-h-0.08,t+h+0.08,y0,y0+0.22,shade(col,0.97),TM.plaster);
  lbox(F,s-h-0.1,s+h+0.1,t-h-0.1,t+h+0.1,y1-0.24,y1,col,TM.plaster,{bottom:true,noTop:true});
  lbox(F,s-h-0.04,s+h+0.04,t-h-0.04,t+h+0.04,y1-0.32,y1-0.24,shade(col,0.92),TM.plaster,{noTop:true})}
// shopfront in a local frame along s (facade line t=0, outward = -v): frame bars, glass, door, fascia sign
function shopfront(F,s0,s1,y0,yTop,o){o=o||{};const tg=o.tg===undefined?0.35:o.tg;const fc=o.frame||[0.11,0.11,0.12];const n=[-F.v[0],-F.v[1]];
  const gTile=o.glass||T.lmMelaGlass;const W=s1-s0;
  const panes=Math.max(1,Math.round(W/2.4));const yg0=y0+0.12,yg1=yTop-(o.fascia?0.72:0.12);
  for(let i=0;i<panes;i++){const a=F.P(s0+W*i/panes,tg),b=F.P(s0+W*(i+1)/panes,tg);wallUV(a,b,yg0,yg1,n,C1,gTile,1,[0,1,0,1])}
  lbox(F,s0,s1,0,tg,y0,yg0,o.sill||[0.86,0.85,0.83],TM.marble);
  if(o.fascia||o.head)lbox(F,s0,s1,0,tg,yg1,yTop,o.headCol||[0.93,0.91,0.86],TM.plaster,{bottom:true});
  for(let i=0;i<=panes;i++){const s=s0+W*i/panes;lbox(F,s-0.05,s+0.05,tg-0.06,tg+0.02,yg0,yg1,fc,TM.metalL,{noTop:true})}
  lbox(F,s0,s1,tg-0.06,tg+0.02,yg1-0.06,yg1,fc,TM.metalL,{bottom:true});
  if(o.door!==undefined){const dc=s0+W*o.door;lbox(F,dc-0.95,dc+0.95,tg-0.07,tg+0.03,y0+2.3,y0+2.38,fc,TM.metalL,{bottom:true});lbox(F,dc-0.03,dc+0.03,tg-0.07,tg+0.03,yg0,y0+2.3,fc,TM.metalL,{noTop:true});
    lbox(F,dc-0.5,dc-0.12,tg-0.12,tg-0.09,y0+0.9,y0+1.1,[0.75,0.75,0.76],TM.metalL,{noTop:true});lbox(F,dc+0.12,dc+0.5,tg-0.12,tg-0.09,y0+0.9,y0+1.1,[0.75,0.75,0.76],TM.metalL,{noTop:true})}
  if(o.fascia){const f=o.fascia;// fascia panel: [tile, uvRect, colourOfBoard, width]
    const yf0=yTop-0.66,yf1=yTop-0.08;lbox(F,s0+0.02,s1-0.02,-0.14,0,yf0-0.04,yf1+0.04,f[2]||[0.1,0.1,0.1],TM.metalL,{bottom:true});
    const sw=Math.min(W-0.3,f[3]||W-0.3),sc=(s0+s1)/2;wallUV(F.P(sc-sw/2,-0.145),F.P(sc+sw/2,-0.145),yf0,yf1,n,C1,f[0],1,f[1])}}
const rowUV=(i)=>[0.003,0.997,1-(i+1)/8+0.004,1-i/8-0.004];// row i of a sign sheet (v up)
function railing(F,s0,s1,t,y0,h){const a=F.P(s0,t),b=F.P(s1,t);const B=Cc((a[0]+b[0])/2,(a[1]+b[1])/2);const L=s1-s0;
  B.wall(a[0],a[1],b[0],b[1],y0,y0,y0+h,y0+h,-F.v[0],-F.v[1],0,L/1.2,0,1,[0.16,0.16,0.17],RECT[T.rail],0);
  lbox(F,s0,s1,t-0.04,t+0.04,y0+h,y0+h+0.06,[0.16,0.16,0.17],TM.metalL)}
// glass balustrade: pale glass panels between thin posts, steel handrail
function glassRail(F,s0,s1,t,y0,h){const n=[-F.v[0],-F.v[1]];const L=s1-s0,k=Math.max(1,Math.round(L/1.4));
  for(let i=0;i<k;i++){const a=F.P(s0+L*i/k+0.03,t),b=F.P(s0+L*(i+1)/k-0.03,t);wallUV(a,b,y0+0.08,y0+h-0.06,n,[0.78,0.86,0.86],T.lmMelaGlassG,0,[0,1,0.1,0.9]);wallUV(b,a,y0+0.08,y0+h-0.06,[-n[0],-n[1]],[0.78,0.86,0.86],T.lmMelaGlassG,0,[0,1,0.1,0.9])}
  for(let i=0;i<=k;i++){const s=s0+L*i/k;lbox(F,s-0.025,s+0.025,t-0.025,t+0.025,y0,y0+h,[0.55,0.56,0.58],TM.metalL,{noTop:true})}
  lbox(F,s0,s1,t-0.03,t+0.03,y0+h-0.02,y0+h+0.03,[0.62,0.63,0.65],TM.metalL)}
function table(x,z,y,r,topCol,chairCol,n,yaw,cush){const B=Oc(x,z);const MT=RECT[TM.metalL];B.cyl(x,y+0.72,z,r,r,0.04,10,topCol,RECT[TM.marble],true);B.cyl(x,y,z,0.03,0.03,0.72,5,[0.12,0.12,0.12],MT,false);B.cyl(x,y,z,0.22,0.02,0.04,8,[0.12,0.12,0.12],MT,true);
  for(let k=0;k<n;k++){const a=yaw+k*TAU/n,sa=Math.sin(a),ca=Math.cos(a),cx=x+sa*(r+0.34),cz=z+ca*(r+0.34);
    B.box(cx,y+0.45,cz,0.42,0.05,0.42,a,chairCol,MT);if(cush)B.box(cx,y+0.5,cz,0.38,0.05,0.38,a,cush,MT);
    for(const [p,q] of[[-1,-1],[1,-1],[1,1],[-1,1]]){const lx=cx+(ca*p+sa*q)*0.18,lz=cz+(-sa*p+ca*q)*0.18;B.box(lx,y+0.22,lz,0.035,0.44,0.035,a,chairCol,MT)}
    const bx=cx+sa*0.2,bz=cz+ca*0.2;B.box(bx,y+0.7,bz,0.42,0.44,0.04,a,chairCol,MT)}}
function planter(F,s,t,y,w,d,h){lbox(F,s-w/2,s+w/2,t-d/2,t+d/2,y,y+h,[0.25,0.25,0.26],TM.metalL);lbox(F,s-w/2+0.06,s+w/2-0.06,t-d/2+0.06,t+d/2-0.06,y+h,y+h+0.45,[0.85,1,0.85],T.hedge)}
// straight flight of steps in a local frame: s from s0 (height ya) to s1 (height yb), across t0..t1; each step a solid block down to yMin
function steps(F,s0,s1,t0,t1,ya,yb,n,col,tile,yMin){for(let i=0;i<n;i++){const sa=s0+(s1-s0)*i/n,sb=s0+(s1-s0)*(i+1)/n;const y=ya+(yb-ya)*(i+(yb>ya?1:0))/n;
  lbox(F,Math.min(sa,sb),Math.max(sa,sb),t0,t1,yMin,y,col,tile)}}
// thick wall with a sloping top in a local frame: s0..s1, t0..t1, bottom yb, top ya1 (at s0) -> yb1 (at s1)
function swall(F,s0,s1,t0,t1,yb,ya1,yb1,col,tile){const B=Oc(...F.P((s0+s1)/2,(t0+t1)/2));const n0=[-F.v[0],-F.v[1]],n1=[F.v[0],F.v[1]];
  for(const [t,n] of[[t0,n0],[t1,n1]]){const a=F.P(s0,t),b=F.P(s1,t);B.wall(a[0],a[1],b[0],b[1],yb,yb,ya1,yb1,n[0],n[1],0,s1-s0,yb,Math.max(ya1,yb1),col,RECT[tile],0)}
  {const a=F.P(s0,t0),b=F.P(s0,t1);B.wall(a[0],a[1],b[0],b[1],yb,yb,ya1,ya1,-F.u[0],-F.u[1],0,t1-t0,yb,ya1,col,RECT[tile],0)}{const a=F.P(s1,t0),b=F.P(s1,t1);B.wall(a[0],a[1],b[0],b[1],yb,yb,yb1,yb1,F.u[0],F.u[1],0,t1-t0,yb,yb1,col,RECT[tile],0)}
  const a=F.P(s0,t0),b=F.P(s1,t0),c=F.P(s1,t1),d=F.P(s0,t1);quadN(B,[a[0],ya1,a[1]],[b[0],yb1,b[1]],[c[0],yb1,c[1]],[d[0],ya1,d[1]],[0,0],[s1-s0,0],[s1-s0,t1-t0],[0,t1-t0],col,tile,true)}
// distance from point to polygon ring
function dRing(r,x,z){let d=1e9;for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];const dx=b[0]-a[0],dz=b[1]-a[1];const L2=dx*dx+dz*dz||1;const k=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/L2));d=Math.min(d,Math.hypot(a[0]+dx*k-x,a[1]+dz*k-z))}return d}

/* ---------------- the survey footprint (OSM way 1075952145 as stored in kifisia_map.json, metres) ---------------- */
const FP0=[[19.1,-24.2],[35.9,-18.2],[40.8,-31.1],[-0.8,-45.5],[-5.3,-32.9],[11.7,-27.2],[10.4,-23.6],[8.6,-22.3],[7.9,-20.3],[8.4,-18.2],[7.2,-14.8],[-6.9,-19.7],[-9.3,-12.7],[-14.6,-14.6],[-20.6,1.3],[7.1,8.9]];
// paved strip between the building and the avenue sidewalk polygon (sidewalk edge points from kifisia_map.json sidewalks, 2026-11-21)
const STRIP_SW=[[-25.3,-0.1],[-17.6,-12.8],[-15.5,-25.2],[-5.4,-47.2],[-3.7,-46.6]];
const pickFP=fps=>{let ps=FP0;const got=(fps||[]).find(f=>f.ps&&f.ps.length===16);if(got){let d=0;for(let i=0;i<16;i++)d=Math.max(d,len2(sub2(got.ps[i],FP0[i])));if(d<0.6)ps=got.ps}return ps};
const courtRing=ps=>[4,5,6,7,8,9,10,11,12,13].map(i=>ps[i]);// the forecourt: wing south face, the south block's court faces, open to the avenue p13->p4
let PS=null;// footprint actually used (set in buildTerrain wrapper or build)
function findPS(){if(PS)return PS;try{for(const b of MAP.buildings){const ps=unp(b[10]);if(ps.length>2&&pip(ps,20,-35)&&pip(ps,-5,-2)){PS=pickFP([{ps}]);return PS}}}catch(e){}return null}

/* ---------------- the sunken forecourt is cut out of the terrain mesh ----------------
   The terrain is one height field (8 m cells). After the stock buildTerrain() has run, every terrain triangle that touches the forecourt
   is collapsed and re-emitted adaptively subdivided, keeping only the pieces outside the court (+0.3 m). Heights are interpolated on the
   original planar triangles, so the cut terrain matches its neighbours exactly. terr()/groundY() are not changed (the court level is set
   through LVL in build()). */
if(typeof buildTerrain==='function'){const _bt=buildTerrain;buildTerrain=function(){
  const ps=findPS();if(!ps)return _bt();const ring=courtRing(ps);let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of ring){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])}
  const recs=[];for(let x=Math.floor((x0-10)/CH)*CH;x<=x1+10;x+=CH)for(let z=Math.floor((z0-10)/CH)*CH;z<=z1+10;z+=CH){const c=chunkAt(x+1,z+1);if(!recs.some(r=>r.c===c))recs.push({c,i0:c.o.i.length})}
  _bt();
  try{let cut=0,add=0;const M=0.3;
    for(const R of recs){const o=R.c.o,P=o.p,I=o.i,end=I.length;
      for(let k=R.i0;k<end;k+=3){const ia=I[k],ib=I[k+1],ic=I[k+2];const xs=[P[ia*3],P[ib*3],P[ic*3]],zs=[P[ia*3+2],P[ib*3+2],P[ic*3+2]];
        if(Math.max(...xs)<x0-1||Math.min(...xs)>x1+1||Math.max(...zs)<z0-1||Math.min(...zs)>z1+1)continue;
        const V=j=>({p:[P[j*3],P[j*3+1],P[j*3+2]],u:[o.u[j*2],o.u[j*2+1]]});const va=V(ia),vb=V(ib),vc=V(ic);
        const col=[o.c[ia*3],o.c[ia*3+1],o.c[ia*3+2]],rc=[o.r[ia*4],o.r[ia*4+1],o.r[ia*4+2],o.r[ia*4+3]],nn=[o.n[ia*3],o.n[ia*3+1],o.n[ia*3+2]];
        I[k+1]=ia;I[k+2]=ia;cut++;// collapse the original
        const mid=(a,b)=>({p:[(a.p[0]+b.p[0])/2,(a.p[1]+b.p[1])/2,(a.p[2]+b.p[2])/2],u:[(a.u[0]+b.u[0])/2,(a.u[1]+b.u[1])/2]});
        const keepV=v=>!pip(ring,v.p[0],v.p[2])&&dRing(ring,v.p[0],v.p[2])>M;
        const emit=(a,b,c)=>{const j=o.v(a.p[0],a.p[1],a.p[2],nn[0],nn[1],nn[2],a.u[0],a.u[1],col,rc,0);o.v(b.p[0],b.p[1],b.p[2],nn[0],nn[1],nn[2],b.u[0],b.u[1],col,rc,0);o.v(c.p[0],c.p[1],c.p[2],nn[0],nn[1],nn[2],c.u[0],c.u[1],col,rc,0);I.push(j,j+1,j+2);add++};
        const rec=(a,b,c,d)=>{const cx=(a.p[0]+b.p[0]+c.p[0])/3,cz=(a.p[2]+b.p[2]+c.p[2])/3;const rad=Math.max(Math.hypot(a.p[0]-cx,a.p[2]-cz),Math.hypot(b.p[0]-cx,b.p[2]-cz),Math.hypot(c.p[0]-cx,c.p[2]-cz));
          const inC=pip(ring,cx,cz),dd=dRing(ring,cx,cz);if(!inC&&dd>rad+M){emit(a,b,c);return}if(inC&&dd>rad)return;
          if(d>=5){if(keepV(a)&&keepV(b)&&keepV(c))emit(a,b,c);return}const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);rec(a,ab,ca,d+1);rec(ab,b,bc,d+1);rec(ca,bc,c,d+1);rec(ab,bc,ca,d+1)};
        rec(va,vb,vc,0)}}
    console.log('[lm-kfc] forecourt cut from terrain: '+cut+' triangles replaced by '+add)}catch(e){console.error('lm-kfc terrain cut failed',e)}}}

function build(ctx){
  const fps=ctx.footprints||[];if(!fps.length){console.warn('lm-kfc: b305 not found in the map, landmark not built');return}
  const ps=PS||pickFP(fps);if(ps===FP0&&!PS)console.log('[lm-kfc] using the surveyed footprint');
  const P=i=>ps[i];
  const WHITE=[0.95,0.93,0.88],CREAM=[0.93,0.89,0.81],STONE=[0.83,0.8,0.74],DARK=[0.11,0.11,0.12],RUBBLE=[0.86,0.78,0.64];
  /* ======== frames and levels ======== */
  const A=P(4),u=nrm2(sub2(P(1),A));let v=[-u[1],u[0]];if((P(3)[0]-A[0])*v[0]+(P(3)[1]-A[1])*v[1]<0)v=[-v[0],-v[1]];
  const Wf=frame(A,u,v);const Lw=Math.max(len2(sub2(P(1),A)),43),Dw=Math.max(12.8,Math.abs((P(3)[0]-A[0])*v[0]+(P(3)[1]-A[1])*v[1]));
  const W2=(x,z)=>{const d=[x-A[0],z-A[1]];return[d[0]*u[0]+d[1]*u[1],d[0]*v[0]+d[1]*v[1]]};
  const nN=[v[0],v[1]],nE=[u[0],u[1]],nS=[-v[0],-v[1]],nW=[-u[0],-u[1]];
  const pv=Wf.P(-5.5,1.5);const yP=groundY(pv[0],pv[1]);// avenue pavement next to the kiosk
  const yC=yP-1.75;// forecourt (photo: ~11 steps down from the pavement)
  const y0=yC,yG=yC+4.0,yCl=yG+3.35,yE=yCl+0.6;// wing: lower floor, gallery floor (13 steps up from the pavement), gallery ceiling, eaves
  const NB=9,bw=Lw/NB,cw=0.56,Dg=3.0;// bays, column width, gallery depth
  const cS=k=>k===0?cw/2:k===NB?Lw-cw/2:k*bw;// column centre along the south face
  const sP5=W2(...P(5))[0],sP0=W2(...P(0))[0];// court ends / south block meets the wing / garden begins
  const UF=3.9,UT0=0.0,UT1=4.0;// upper flight (pavement -> gallery): s -UF..0, t 0..4 (west of the wing's SW corner)
  const LF1=3.3,LT0=-4.6,LT1=-0.05;// lower flight (pavement -> court): s -0.8..LF1, t LT0..LT1
  const KT0=4.0,KT1=Dw-0.5,KD=3.0;// KFC terrace (west loggia at gallery level): t KT0..KT1, s 0..KD

  /* ======== NORTH WING ======== */
  const yNb=Math.min(y0,terr(...Wf.P(Lw,Dw)))-0.8;
  wallW(Wf.P(Lw,Dw),Wf.P(0,Dw),yNb,yE,nN,CREAM,TM.plaster);// north face (1-4 m from the neighbour; plain render)
  wallW(Wf.P(Lw,0),Wf.P(Lw,Dw),yNb,yE,nE,CREAM,TM.plaster);// east end
  const winRow=(a,b,n,count,yb,yt)=>{const L=len2(sub2(b,a)),dir=nrm2(sub2(b,a));for(let i=0;i<count;i++){const c=(i+0.5)*L/count;const p0=add2(add2(a,dir,c-0.6),n,0.02),p1=add2(add2(a,dir,c+0.6),n,0.02);
    wallUV(p0,p1,yb,yt,n,[0.9,0.9,0.92],T.lmMelaGlass,1,[0,1,0,1]);const q0=add2(p0,dir,-0.12),q1=add2(p1,dir,0.12);wallW(q0,add2(q0,dir,0.12),yb-0.1,yt+0.1,n,WHITE,TM.plaster);wallW(add2(q1,dir,-0.12),q1,yb-0.1,yt+0.1,n,WHITE,TM.plaster);
    wallW(add2(q0,n,0.03),add2(q1,n,0.03),yt,yt+0.18,n,WHITE,TM.plaster);wallW(add2(q0,n,0.05),add2(q1,n,0.05),yb-0.14,yb,n,STONE,TM.marble)}};
  winRow(Wf.P(Lw,Dw+0.01),Wf.P(0,Dw+0.01),nN,9,yG+0.4,yCl-0.6);winRow(Wf.P(Lw+0.01,0.5),Wf.P(Lw+0.01,Dw-0.5),nE,3,yG+0.4,yCl-0.6);
  // --- lower floor, court side: piers + shop units (bays 0-3 face the sunken court; further east the lower floor is below the garden) ---
  const nLow=Math.max(1,Math.min(NB,Math.round(sP5/bw)));// bays facing the court
  for(let k=0;k<=nLow;k++){const s=cS(k);lbox(Wf,s-0.3,s+0.3,-0.05,0.55,y0-0.3,yG-0.35,WHITE,TM.plaster)}
  const lowNames=[null,'Meligan','Fairynails','ΦΩΤΟ'];
  for(let k=0;k<nLow;k++){const s0=cS(k)+0.3,s1=Math.min(cS(k+1),sP5)-0.3;if(s1-s0<1.5)continue;if(k===0){wallW(Wf.P(s0,-0.04),Wf.P(s1,-0.04),y0-0.3,yG-0.35,nS,WHITE,TM.plaster);continue}const sg=SG(lowNames[k%lowNames.length]||'ΦΩΤΟ');
    shopfront(Wf,s0,s1,y0,yG-0.35,{door:k===0?0.7:0.5,glass:k%2?T.lmMelaGlassG:T.lmMelaGlass,fascia:[sg[0],sg[1],[0.1,0.1,0.1],Math.min(3.6,s1-s0-0.4)],tg:0.45})}
  // slab band between the floors (projects a little) along the whole south face
  lbox(Wf,-0.15,Lw,-0.18,0.62,yG-0.35,yG,WHITE,TM.plaster,{bottom:true});
  // where the garden is (east of the south block) the slab edge meets the ground: plinth down to the terrain
  {const a=Wf.P(sP0,-0.18),b=Wf.P(Lw,-0.18);wallW(a,b,Math.min(terr(...a),terr(...b))-0.6,yG-0.35,nS,STONE,TM.plaster)}
  // --- gallery (loggia) floor/ceiling along the south face + the KFC terrace (west loggia) ---
  flat([Wf.P(0,0),Wf.P(Lw,0),Wf.P(Lw,Dg),Wf.P(0,Dg)],yG,[0.82,0.78,0.72],TM.marble);flat([Wf.P(0,Dg),Wf.P(KD,Dg),Wf.P(KD,KT1),Wf.P(0,KT1)],yG,[0.82,0.78,0.72],TM.marble);
  flat([Wf.P(0,0),Wf.P(Lw,0),Wf.P(Lw,Dg),Wf.P(0,Dg)],yCl,[0.9,0.88,0.84],TM.plaster,true);flat([Wf.P(0,Dg),Wf.P(KD,Dg),Wf.P(KD,KT1),Wf.P(0,KT1)],yCl,[0.9,0.88,0.84],TM.plaster,true);
  // gallery back wall: glazed restaurant fronts between plaster piers, with name boards (bay 0 = KFC side windows)
  const galNames=[null,'Simply Burgers',"Mailo's",'ROJO','La Puerkita','OLD BOY',null,null,null];
  for(let k=0;k<NB;k++){const s0=k===0?KD:k*bw,s1=(k+1)*bw;const g0=s0+0.35,g1=s1-0.35;
    if(g1>g0+0.5){const pane=Math.max(1,Math.round((g1-g0)/1.3));for(let i=0;i<pane;i++)wallUV(Wf.P(g0+(g1-g0)*i/pane,Dg),Wf.P(g0+(g1-g0)*(i+1)/pane,Dg),yG,yCl-0.6,nS,k===0?C1:[0.95,0.95,0.95],k===0?T.lmKfcGlass:T.lmMelaGlass,1,[0,1,0,1]);
      for(let i=0;i<=pane;i++){const s=g0+(g1-g0)*i/pane;lbox(Wf,s-0.035,s+0.035,Dg-0.06,Dg,yG,yCl-0.6,[0.72,0.72,0.73],TM.metalL,{noTop:true})}lbox(Wf,g0,g1,Dg-0.07,Dg,yCl-0.66,yCl-0.6,[0.72,0.72,0.73],TM.metalL,{bottom:true})}
    wallW(Wf.P(s0,Dg),Wf.P(g0,Dg),yG,yCl,nS,CREAM,TM.plaster);wallW(Wf.P(g1,Dg),Wf.P(s1,Dg),yG,yCl,nS,CREAM,TM.plaster);wallW(Wf.P(g0,Dg),Wf.P(g1,Dg),yCl-0.6,yCl,nS,CREAM,TM.plaster);
    if(galNames[k]){const sg=SG(galNames[k]);const sw=Math.min(3.2,g1-g0-0.2),sc=(g0+g1)/2;wallUV(Wf.P(sc-sw/2,Dg-0.03),Wf.P(sc+sw/2,Dg-0.03),yCl-0.52,yCl-0.12,nS,C1,sg[0],1,sg[1])}}
  // columns, glass balustrade, entablature (beam) along the court/garden
  for(let k=0;k<=NB;k++)colm(Wf,cS(k),cw/2,yG,yCl,cw,WHITE);
  for(let k=0;k<NB;k++){const a=cS(k)+cw/2,b=cS(k+1)-cw/2;if(k===NB-2){glassRail(Wf,a,a+(b-a)*0.35,cw/2,yG,1.05)}else glassRail(Wf,a,b,cw/2,yG,1.05)}
  lbox(Wf,-0.12,Lw,-0.12,0.7,yCl,yE,WHITE,TM.plaster,{bottom:true});
  // --- west (avenue) end ---
  // gallery west opening above the stair: two columns; the KFC terrace (planters, red chairs) behind its railing
  colm(Wf,cw/2,UT1,yG,yCl,cw,WHITE);colm(Wf,cw/2,KT1,yG,yCl,cw,WHITE);
  lbox(Wf,-0.12,0.7,0,Dw,yCl,yE,WHITE,TM.plaster,{bottom:true});// beam along the avenue face
  railing(frame(Wf.P(0,KT1),nS,nE),0.3,KT1-UT1-0.3,cw/2,yG,1.0);
  {const Fr=frame(Wf.P(cw/2,KT1),nS,nE);for(let i=0;i<4;i++)planter(Fr,0.9+i*((KT1-UT1)-1.5)/3,0.45,yG,0.9,0.42,0.42)}
  // KFC glazing at the back of the terrace (s = KD) with its door (the interiors bot hooks onto MAP.special.kfc)
  const kd=frame(Wf.P(KD,KT1),nS,nE);// s from KT1 southwards along the KFC glazing, t>0 = into the KFC
  const kDoorT=KT0+1.6;
  {const L=KT1-KT0;const pane=Math.max(1,Math.round(L/1.3));for(let i=0;i<pane;i++)wallUV(kd.P(L*i/pane,0),kd.P(L*(i+1)/pane,0),yG,yCl-0.6,nW,C1,T.lmKfcGlass,1,[0,1,0,1]);
    for(let i=0;i<=pane;i++)lbox(kd,L*i/pane-0.04,L*i/pane+0.04,-0.06,0,yG,yCl-0.6,[0.62,0.02,0.07],TM.metalL,{noTop:true});wallW(kd.P(0,0),kd.P(L,0),yCl-0.6,yCl,nW,CREAM,TM.plaster);
    const dc=KT1-kDoorT;lbox(kd,dc-0.95,dc+0.95,-0.08,0,yG+2.3,yG+2.4,[0.62,0.02,0.07],TM.metalL,{bottom:true});lbox(kd,dc-0.5,dc-0.12,-0.12,-0.09,yG+0.9,yG+1.1,[0.75,0.75,0.76],TM.metalL,{noTop:true});lbox(kd,dc+0.12,dc+0.5,-0.12,-0.09,yG+0.9,yG+1.1,[0.75,0.75,0.76],TM.metalL,{noTop:true})}
  wallW(Wf.P(0,KT1),Wf.P(KD,KT1),yG,yCl,nS,CREAM,TM.plaster);
  // KFC sign bands: on the beam over the terrace facing the avenue, and over the stair landing facing south (as in the photo)
  {const s0=KT0+0.4,s1=KT1-0.4,Lb=s1-s0;const kb=frame(Wf.P(0,s1),nS,nE);lbox(kb,-0.1,Lb+0.1,-0.2,-0.12,yCl+0.02,yE-0.04,[0.09,0.09,0.1],TM.metalL,{bottom:true});
    const pw=(yE-yCl-0.1)*4,pc=Lb*0.42;wallUV(kb.P(pc-pw/2,-0.205),kb.P(pc+pw/2,-0.205),yCl+0.04,yE-0.06,nW,C1,T.lmKfcSign,1,kRow(0))}
  {const sb=frame(Wf.P(0.4,UT1),nE,nS);// facing south, over the stair head, on the terrace's south edge
    lbox(sb,0,KD-0.6,0.12,0.2,yCl-0.6,yCl-0.02,[0.09,0.09,0.1],TM.metalL,{bottom:true});const pw=Math.min(KD-0.7,0.54*4);wallUV(sb.P((KD-0.6-pw)/2,0.205),sb.P((KD-0.6+pw)/2,0.205),yCl-0.58,yCl-0.04,nS,C1,T.lmKfcSign,1,kRow(0))}
  // KFC terrace furniture (red chairs)
  {const tp=(s,t)=>{const p=Wf.P(s,t);table(p[0],p[1],yG,0.34,[0.95,0.94,0.92],[0.78,0.05,0.09],2,Math.atan2(v[0],v[1]))};for(let t=KT0+0.9;t<KT1-0.5;t+=1.9){tp(1.35,t);tp(2.35,t+0.9)}}
  // lower part of the west face (pavement level up to the gallery floor): white rendered plinth with two service doors; the stair's side wall
  wallW(Wf.P(0,Dw),Wf.P(0,UT1),yP-0.6,yG,nW,WHITE,TM.plaster);lbox(Wf,-0.18,0,UT1,Dw,yP-0.3,yP+0.35,STONE,TM.marble,{});
  for(const t of[UT1+3.2,UT1+6.6])lbox(Wf,-0.04,0,t-0.55,t+0.55,yP,yP+2.1,[0.42,0.43,0.45],TM.metalL,{noTop:true});
  lbox(Wf,-0.15,0.62,UT1,Dw,yG-0.35,yG,WHITE,TM.plaster,{bottom:true});// slab edge on the avenue side
  winRow(Wf.P(0.01,Dw-0.2),Wf.P(0.01,KT1+0.1),nW,1,yG+0.35,yCl-0.45);
  // roof (terracotta, hipped, ~23°) with 0.9 m eaves
  hipRoof(Wf,0,Lw,0,Dw,yE,0.42,0.9);
  // rooftop AC units at the back (north) slope, as in the photo
  for(let i=0;i<5;i++){const p=Wf.P(14+i*3.2,Dw-1.6);Oc(p[0],p[1]).box(p[0],yE+1.75,p[1],1.0,0.75,0.6,Math.atan2(u[0],u[1]),[0.82,0.82,0.8],RECT[TM.metalL])}
  // gallery furniture: restaurant tables (dark chairs)
  for(let k=1;k<NB;k++){const p1=Wf.P(k*bw+bw*0.3,1.9),p2=Wf.P(k*bw+bw*0.72,1.9);table(p1[0],p1[1],yG,0.36,[0.96,0.95,0.93],[0.52,0.36,0.22],2,Math.atan2(u[0],u[1]),k%2?[0.82,0.36,0.42]:[0.9,0.88,0.82]);table(p2[0],p2[1],yG,0.36,[0.96,0.95,0.93],[0.52,0.36,0.22],2,Math.atan2(u[0],u[1]),k%2?[0.82,0.36,0.42]:[0.9,0.88,0.82])}
  // white flat-roofed structure on the garden terrace east of the south block (lift/stair head in the photo)
  {const s=Math.min(Lw-4,sP0+8.5);lbox(Wf,s,s+3.4,-4.6,-2.2,yG,yG+2.3,WHITE,TM.plaster,{});lbox(Wf,s-0.1,s+3.5,-4.7,-2.1,yG+2.3,yG+2.45,[0.9,0.9,0.88],TM.plaster,{bottom:true})}

  /* ======== the kiosk (periptero) on the pavement in front of the stairs — photo: white booth, blue band, deep white canopy with a blue edge,
     a big white hood carrying ad screens. It replaces the generic kiosk prop at the same spot (50_props builds after the landmarks). ======== */
  try{const kp=MAP.props&&MAP.props.kiosk;const c=Wf.P(-5.5,1.5);let bi=-1,bd=10;
    if(kp)kp.forEach((k,i)=>{const d=Math.hypot(k[0]/10-c[0],k[1]/10-c[1]);if(d<bd){bd=d;bi=i}});
    const k=bi>=0?kp.splice(bi,1)[0]:null;const kx=k?k[0]/10:Wf.P(-7.6,1.2)[0],kz=k?k[1]/10:Wf.P(-7.6,1.2)[1];
    console.log('[lm-kfc] kiosk '+(k?'prop replaced ('+bd.toFixed(1)+' m from the stair foot)':'not in map, built at the photo position'));
    const n=nW,Fk=frame([kx,kz],[-n[1],n[0]],[-n[0],-n[1]]);// s along the avenue, t>0 = away from the road (outward front = n)
    const y=groundY(kx,kz),BL=[0.12,0.31,0.61],B=Oc(kx,kz);
    lbox(Fk,-1.15,1.15,-0.8,0.8,y,y+2.3,[0.95,0.95,0.94],TM.plaster,{});
    wallUV(Fk.P(1.0,-0.81),Fk.P(-1.0,-0.81),y+0.15,y+2.2,n,C1,T.lmKioskF,1,[0,1,0,1]);// front (counter, fridge, magazines)
    for(const sd of[-1,1]){const a=Fk.P(sd*1.16,-0.7),b=Fk.P(sd*1.16,0.7);wallUV(sd>0?b:a,sd>0?a:b,y+0.15,y+2.2,sd>0?[-Fk.u[0]*-1,-Fk.u[1]*-1]:[-Fk.u[0],-Fk.u[1]],C1,T.lmKioskF,0.6,[0.55,1,0,1])}
    lbox(Fk,-1.17,1.17,-0.82,0.82,y+2.08,y+2.3,BL,TM.metalL,{noTop:true});
    lbox(Fk,-1.62,1.62,-1.4,1.1,y+2.3,y+2.46,[0.96,0.96,0.95],TM.plaster,{bottom:true});lbox(Fk,-1.64,1.64,-1.42,1.12,y+2.46,y+2.56,BL,TM.metalL,{noTop:true});
    // hood: truncated pyramid, ad screens on the front and both sides
    const h0=y+2.56,h1=y+3.3,o0=[[-1.58,-1.36],[1.58,-1.36],[1.58,1.06],[-1.58,1.06]],o1=[[-0.85,-0.6],[0.85,-0.6],[0.85,0.35],[-0.85,0.35]];const ctr=Fk.P(0,-0.15);
    const V=(q,yy)=>{const p=Fk.P(q[0],q[1]);return[p[0],yy,p[1]]};
    const face=(a,b,c,d,col,rect,glow)=>{const nn=B.nrm(a,b,c);const mx=(a[0]+c[0])/2-ctr[0],mz=(a[2]+c[2])/2-ctr[1];if(nn[0]*mx+nn[2]*mz+nn[1]*0.3<0)B.quad(d,c,b,a,[0,1],[1,1],[1,0],[0,0],col,rect,glow);else B.quad(a,b,c,d,[0,0],[1,0],[1,1],[0,1],col,rect,glow)};
    for(let i=0;i<4;i++){const j=(i+1)%4;face(V(o0[i],h0),V(o0[j],h0),V(o1[j],h1),V(o1[i],h1),[0.95,0.95,0.94],RECT[TM.plaster],0)}
    flat(o1.map(q=>Fk.P(q[0],q[1])),h1,[0.93,0.93,0.92],TM.plaster);
    const lerp=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
    for(const [i,j] of[[0,1],[3,0],[1,2]]){const a0=lerp(o0[i],o1[i],0.15),b0=lerp(o0[j],o1[j],0.15),a1=lerp(o0[i],o1[i],0.85),b1=lerp(o0[j],o1[j],0.85);
      const e=0.03,lift=(q,yy)=>{const v3=V(q,yy);return v3};const ya=h0+(h1-h0)*0.15+e,yb=h0+(h1-h0)*0.85+e;
      const A0=lerp(a0,b0,0.08),B0=lerp(a0,b0,0.92),A1=lerp(a1,b1,0.08),B1=lerp(a1,b1,0.92);face(lift(A0,ya),lift(B0,ya),lift(B1,yb),lift(A1,yb),C1,RECT[T.lmKioskAd],1)}
    {const sg=SG('ΠΕΡΙΠΤΕΡΟ');wallUV(Fk.P(0.8,-1.425),Fk.P(-0.8,-1.425),y+2.3,y+2.55,n,C1,sg[0],1,sg[1])}
    lbox(Fk,1.25,1.85,-0.75,-0.1,y,y+1.85,[0.08,0.22,0.14],TM.metalL,{});wallUV(Fk.P(1.8,-0.76),Fk.P(1.3,-0.76),y+0.15,y+1.75,n,C1,T.lmKioskF,1,[0.06,0.4,0.05,0.9]);// drinks fridge
    lbox(Fk,-1.95,-1.25,-0.7,-0.05,y,y+0.85,[0.94,0.94,0.95],TM.metalL,{});// ice-cream freezer
    {const c4=[Fk.P(-1.95,-0.8),Fk.P(1.85,-0.8),Fk.P(1.85,0.8),Fk.P(-1.95,0.8)];for(let i=0;i<4;i++){const a=c4[i],b=c4[(i+1)%4];addSeg(a[0],a[1],b[0],b[1],'b')}}
    {const ip=Fk.P(0,-1.9);INTER.push({type:'kiosk',x:ip[0],z:ip[1],label:'Buy a frappé'})}
    if(typeof placed==='function')placed('kiosk',kx,kz,k&&k[2]||'ΠΕΡΙΠΤΕΡΟ');
  }catch(e){console.warn('[lm-kfc] kiosk failed',e)}

  /* ======== the two stairs + the retaining wall along the avenue ======== */
  const STEP=[0.6,0.47,0.34],STEPT=TM.marble;
  // upper flight: 13 steps from the pavement up to the gallery, side walls white with a steel handrail
  steps(Wf,-UF,0,UT0+0.2,UT1-0.05,yP,yG,13,STEP,STEPT,yP-0.4);
  swall(Wf,-UF,0,UT0,UT0+0.2,yP-0.4,yP+0.95,yG+0.95,WHITE,TM.plaster);// south side wall (parapet, follows the stair)
  {const B=Oc(...Wf.P(-UF/2,UT1)),a=Wf.P(-UF,UT1-0.15),b=Wf.P(0,UT1-0.15);B.quad([a[0],yP+0.95,a[1]],[b[0],yG+0.95,b[1]],[b[0],yG+1.0,b[1]],[a[0],yP+1.0,a[1]],[0,0],[UF,0],[UF,0.05],[0,0.05],[0.6,0.61,0.63],RECT[TM.metalL],0);
    for(let i=0;i<=3;i++){const s=-UF+UF*i/3;const p=Wf.P(s,UT1-0.15);Oc(p[0],p[1]).cyl(p[0],yP+(yG-yP)*i/3,p[1],0.025,0.025,0.97,5,[0.6,0.61,0.63],RECT[TM.metalL],false)}}
  // lower flight: 11 steps from the pavement down into the court, beside a white wall with a handrail (photo)
  steps(Wf,-0.8,LF1,LT0+0.15,LT1,yP,yC,11,STEP,STEPT,yC-0.3);
  flat([Wf.P(-0.8,LT0),Wf.P(-0.8,LT1),Wf.P(-UF,LT1),Wf.P(-UF,LT0)],yP+0.0,[0.7,0.68,0.64],TM.slabs);
  lbox(Wf,-0.8,LF1,LT0,LT0+0.15,yC-0.3,yP+0.9,RUBBLE,TM.rubble,{});// south parapet (stone)
  {const B=Oc(...Wf.P(1,LT1)),a=Wf.P(-0.8,LT1-0.12),b=Wf.P(LF1,LT1-0.12);B.quad([b[0],yC+0.95,b[1]],[a[0],yP+0.95,a[1]],[a[0],yP+1.0,a[1]],[b[0],yC+1.0,b[1]],[0,0],[4,0],[4,0.05],[0,0.05],[0.6,0.61,0.63],RECT[TM.metalL],0)}
  // retaining wall along the open side of the court (p4 -> p13), rough stone, parapet 0.9 m above the pavement; opening at the lower flight
  const ring=courtRing(ps);
  {const a=P(4),b=P(13);const d=nrm2(sub2(b,a));let n=[d[1],-d[0]];const tp=add2([(a[0]+b[0])/2,(a[1]+b[1])/2],n,0.5);if(pip(ring,tp[0],tp[1]))n=[-n[0],-n[1]];// n = towards the avenue
    const L=len2(sub2(b,a));const Fo=frame(a,d,n);// s along p4->p13, t>0 towards the avenue
    const sOpen0=Math.max(0,W2(...Wf.P(0,LT1))[1]*-1),sOpen1=-LT0+0.2;// opening (approx: the edge runs almost along -t of the wing)
    const segW=(s0,s1)=>{if(s1-s0<0.2)return;lbox(Fo,s0,s1,-0.05,0.4,yC-0.3,yP+0.9,RUBBLE,TM.rubble,{});lbox(Fo,s0-0.03,s1+0.03,-0.08,0.43,yP+0.9,yP+0.98,STONE,TM.marble,{})};
    segW(sOpen1,L);
    // collision: strip side and court side, each 0.75 m from the wall (the level grid has 1 m cells), not across the lower flight
    const so=sOpen1;const A1=Fo.P(so,0.95),B1=Fo.P(L+0.4,0.95),A2=Fo.P(so-0.6,-0.75),B2=Fo.P(L,-0.75);addSeg(A1[0],A1[1],B1[0],B1[1],'b');addSeg(A2[0],A2[1],B2[0],B2[1],'b');
    {const f1=Wf.P(-0.8,LT0+0.4),f2=Wf.P(0.4,LT0-0.7);addSeg(f1[0],f1[1],A1[0],A1[1],'b');addSeg(f2[0],f2[1],A2[0],A2[1],'b')}}
  // court and paving
  flat(ring,yC+0.02,[0.86,0.85,0.82],TM.slabs);
  {const strip=[P(14),...STRIP_SW,P(3),P(4),P(13)];groundPoly([strip],0.165,TM.slabs,1,[0.8,0.78,0.74],5)}

  /* ======== SOUTH BLOCK (arcade block, p5..p15 + p0): local frame a along the avenue front (p13->p14), b inward ======== */
  const O13=P(13),aU=nrm2(sub2(P(14),O13));let bU=[-aU[1],aU[0]];if((P(15)[0]-O13[0])*bU[0]+(P(15)[1]-O13[1])*bU[1]<0)bU=[-bU[0],-bU[1]];
  const Sf=frame(O13,aU,bU);const loc=p=>{const d=sub2(p,O13);return[d[0]*aU[0]+d[1]*aU[1],d[0]*bU[0]+d[1]*bU[1]]};
  const Q=ps.map(loc);
  const yF=groundY(...Sf.P(8.5,-2.5));// avenue pavement in front of the block
  const yS=Math.max(yF+4.1,yC+5.4);// eaves of the avenue range
  const ySc=yG-0.1;// eaves of the court range (photo: about the wing's gallery floor)
  const inFront=p=>loc(p)[1]<12.0;// under the avenue range roof
  const aF=len2(sub2(P(14),O13));// ~17 m front
  const nFront=[-bU[0],-bU[1]];
  // -- avenue arcade: 5 columns on the front line, glazing set back 2.2 m, café terrace under and in front --
  const Dar=2.2,yAr=yF+3.4;
  for(let k=0;k<5;k++){const a=0.3+k*(aF-0.6)/4;colm(Sf,a,0.25,yF,yAr,0.5,WHITE)}
  flat([Sf.P(0,0),Sf.P(aF,0),Sf.P(aF,Dar),Sf.P(0,Dar)],yAr,[0.9,0.88,0.84],TM.plaster,true);
  flat([Sf.P(0,0),Sf.P(aF,0),Sf.P(aF,Dar),Sf.P(0,Dar)],yF+0.03,[0.78,0.75,0.7],TM.marble);
  lbox(Sf,-0.1,aF+0.1,-0.12,0.55,yAr,yS,WHITE,TM.plaster,{bottom:true,noTop:true});// frieze over the arcade
  {const FrA=frame(Sf.P(0,Dar),aU,bU);// shopfronts at the back of the arcade (café, burger, pasta, bubble tea)
    const n4=[['CELEST',0.5],['GORDO',0.5],['Bubble Tale',0.3],['KESSARIS',0.5]];const w=(aF-0.4)/4;
    n4.forEach(([nm,dr],i)=>{const sg=SG(nm);shopfront(FrA,0.2+i*w+0.1,0.2+(i+1)*w-0.1,yF,yAr,{door:dr,fascia:[sg[0],sg[1],[0.06,0.06,0.06],Math.min(3.6,w-0.5)]})});
    wallW(Sf.P(0,Dar),Sf.P(0,0),yF-0.5,yAr,[-aU[0],-aU[1]],CREAM,TM.plaster);wallW(Sf.P(aF,0),Sf.P(aF,Dar),yF-0.5,yAr,aU,CREAM,TM.plaster)}
  // café terrace in front of the arcade (tables with closed black umbrellas, as in the photo)
  for(let k=0;k<4;k++){const a=1.8+k*4.1;for(const bb of[-1.1,1.2]){const p=Sf.P(a,bb);table(p[0],p[1],yF,0.34,[0.88,0.86,0.83],[0.13,0.12,0.11],2,Math.atan2(aU[0],aU[1]));
    if(bb<0){const B=Oc(p[0],p[1]);B.cyl(p[0],yF+0.74,p[1],0.025,0.025,1.6,5,[0.1,0.1,0.1],RECT[TM.metalL],false);B.cyl(p[0],yF+1.5,p[1],0.12,0.05,0.95,8,[0.08,0.08,0.09],RECT[TM.metalL],true)}}}
  // -- the other facades of the block, edge by edge along the footprint (p5 -> p15 -> p0) --
  const yS0=yS;const faces=[[5,6,'stem'],[6,7,'curve'],[7,8,'curve'],[8,9,'curve'],[9,10,'stemS'],[10,11,'courtN'],[11,12,'courtW'],[12,13,'courtF'],[14,15,'party'],[15,0,'back']];
  for(const [i,j,kind] of faces){const a=P(i),b=P(j);const d=nrm2(sub2(b,a));let n=[d[1],-d[0]];const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const tp=add2(mid,n,0.3);if(pip(ps,tp[0],tp[1]))n=[-n[0],-n[1]];
    const L=len2(sub2(b,a));const Ff=frame(a,d,[-n[0],-n[1]]);const yS=inFront(a)&&inFront(b)?yS0:ySc;
    if(kind==='party'){wallW(a,b,yF-0.8,yS,n,CREAM,TM.plaster);continue}
    if(kind==='back'){const g0=Math.min(terr(...a),terr(...b));wallW(a,b,g0-0.8,yS,n,CREAM,TM.plaster);const nw=Math.floor(L/4.5);for(let w=0;w<nw;w++){const c=(w+0.5)*L/nw;const p0=add2(add2(a,d,c-0.7),n,0.02),p1=add2(add2(a,d,c+0.7),n,0.02);const g=Math.max(terr(...p0),yF);wallUV(p0,p1,g+1.0,Math.min(g+3.2,yS-0.4),n,[0.85,0.85,0.88],T.lmMelaGlass,1,[0,1,0,1])}continue}
    if(kind==='curve'){wallUV(a,b,y0,yS-0.5,n,[0.9,0.93,0.95],T.lmMelaGlass,1,[0,1,0,1]);wallW(a,b,yS-0.5,yS,n,WHITE,TM.plaster);continue}
    // pier + shopfront units
    lbox(Ff,-0.25,0.25,-0.05,0.4,y0-0.3,yS,WHITE,TM.plaster);lbox(Ff,L-0.25,L+0.25,-0.05,0.4,y0-0.3,yS,WHITE,TM.plaster);
    lbox(Ff,0,L,-0.15,0.35,yS-0.6,yS-0.45,WHITE,TM.plaster,{bottom:true});
    const yTop=y0+3.7;wallW(add2(a,n,-0.35),add2(b,n,-0.35),yTop,yS,n,CREAM,TM.plaster);
    lbox(Ff,0,L,-0.12,0.35,yTop,yTop+0.25,WHITE,TM.plaster,{bottom:true});
    {const nw=Math.floor(L/3.2);for(let w=0;w<nw;w++){const c=(w+0.5)*L/nw;if(yS-yTop<2.2)break;const p0=add2(add2(a,d,c-0.55),n,0.02),p1=add2(add2(a,d,c+0.55),n,0.02);wallUV(p0,p1,yTop+0.6,yS-0.8,n,[0.9,0.9,0.92],T.lmMelaGlass,1,[0,1,0,1])}}
    if(kind==='stem'){// the arcade passage (στοά) into the block
      const pw=3.2,pc=L*0.35;lbox(Ff,pc-pw/2-0.3,pc-pw/2,-0.05,0.4,y0,yTop,WHITE,TM.plaster);lbox(Ff,pc+pw/2,pc+pw/2+0.3,-0.05,0.4,y0,yTop,WHITE,TM.plaster);
      wallUV(Ff.P(pc-pw/2,1.8),Ff.P(pc+pw/2,1.8),y0,yTop-0.2,n,[0.9,0.88,0.84],T.lmMelaGlass,1,[0,1,0,0.7]);
      flat([Ff.P(pc-pw/2,0.35),Ff.P(pc+pw/2,0.35),Ff.P(pc+pw/2,1.8),Ff.P(pc-pw/2,1.8)],yTop-0.2,[0.85,0.83,0.8],TM.plaster,true);
      wallW(Ff.P(pc-pw/2,0.35),Ff.P(pc-pw/2,1.8),y0,yTop-0.2,d,CREAM,TM.plaster);wallW(Ff.P(pc+pw/2,1.8),Ff.P(pc+pw/2,0.35),y0,yTop-0.2,[-d[0],-d[1]],CREAM,TM.plaster);
      const sm=SG('ΕΜΠΟΡΙΚΟ');wallUV(Ff.P(pc-pw/2-0.2,-0.06),Ff.P(pc+pw/2+0.2,-0.06),yTop+0.05,yTop+0.55,n,C1,sm[0],1,sm[1]);
      shopfront(Ff,0.3,pc-pw/2-0.35,y0,yTop,{door:0.5,head:true,glass:T.lmMelaGlassG});
      if(L-0.3>pc+pw/2+1.5){shopfront(Ff,pc+pw/2+0.35,L-0.3,y0,yTop,{door:0.5,head:true})}continue}
    if(kind==='courtN'){const m=L*0.48;lbox(Ff,m-0.25,m+0.25,-0.05,0.4,y0-0.3,yTop,WHITE,TM.plaster);
      {shopfront(Ff,0.3,m-0.3,y0,yTop,{door:0.5,head:true,glass:T.lmMelaGlassG})}
      {shopfront(Ff,m+0.3,L-0.3,y0,yTop,{door:0.5,head:true})}continue}
    if(kind==='courtW'){shopfront(Ff,0.3,L-0.3,y0,yTop,{door:0.5,head:true,glass:T.lmMelaGlassG});continue}
    if(kind==='courtF'){shopfront(Ff,0.3,L-0.3,y0,yTop,{door:0.5,head:true});continue}
    if(kind==='stemS'){wallW(a,b,y0-0.3,yS,n,CREAM,TM.plaster);continue}}
  // -- roofs of the block: hipped terracotta over the avenue range and over the court range; low grey metal roof next to the wing --
  hipRoof(Sf,0,aF,0,11.5,yS,0.42,0.8);
  const q11=Q[11],q10=Q[10];
  hipRoof(frame(Sf.P(q11[0],q11[1]),[bU[0],bU[1]],[aU[0],aU[1]]),0,len2(sub2(P(10),P(11))),0,-q11[0]+0.2,ySc,0.42,0.7);
  {const deck=[Q[5],Q[0],Q[15],[aF-1.2,11.5],[0,11.5],[0,q10[1]],q10].map(p=>Sf.P(p[0],p[1]));const yM=Math.min(yS+0.5,ySc-0.15);
    flat(deck,yM,[0.66,0.68,0.7],TM.metalL);
    for(let i=0;i<deck.length;i++){const a=deck[i],b=deck[(i+1)%deck.length];const d=nrm2(sub2(b,a));let n=[d[1],-d[0]];const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];const tp=add2(mid,n,0.3);if(pip(deck,tp[0],tp[1]))n=[-n[0],-n[1]];wallW(a,b,Math.min(yS,yM)-0.4,yM,n,[0.88,0.87,0.84],TM.plaster)}
    // standing seams
    {const B=Oc(...deck[0]);const c0=Sf.P(Q[5][0],Q[5][1]);for(let k=0;k<14;k++){const p=add2(add2(Sf.P(0,12),aU,1+k*1.1),[0,0],0);const q=add2(p,bU,9);if(!pip(deck,p[0],p[1])&&!pip(deck,q[0],q[1]))continue;lbox(frame(p,aU,bU),-0.025,0.025,0,9,yM,yM+0.05,[0.6,0.62,0.64],TM.metalL,{})}}}
  // collision for the block (arcade: walk under it, stop at the glazing)
  {const segs=[];const E=(i,j)=>segs.push([P(i),P(j)]);E(5,6);E(6,7);E(7,8);E(8,9);E(9,10);E(10,11);E(11,12);E(12,13);E(14,15);E(15,0);
    segs.push([Sf.P(0,0),Sf.P(0,Dar)],[Sf.P(0,Dar),Sf.P(aF,Dar)],[Sf.P(aF,Dar),Sf.P(aF,0)]);for(const [a,b] of segs)addSeg(a[0],a[1],b[0],b[1],'b');
    for(let k=0;k<5;k++){const p=Sf.P(0.3+k*(aF-0.6)/4,0.25);addBoxC(p[0],p[1],0.28,'p')}}

  /* ======== FORECOURT: the glass pavilion with white awnings and a red floor, planters ======== */
  {const Fp=frame(Wf.P(5.0,-2.0),u,nS);const L=7.2,D=4.4,H=3.0,yb=yC+0.02;
    lbox(Fp,0,L,0,D,yb,yb+0.1,[0.62,0.08,0.08],TM.wood);
    for(const [s,t] of[[0,0],[L,0],[L,D],[0,D],[L/2,0],[L/2,D],[0,D/2],[L,D/2]])lbox(Fp,s-0.07,s+0.07,t-0.07,t+0.07,yb,yb+H,DARK,TM.metalL,{noTop:true});
    lbox(Fp,-0.15,L+0.15,-0.15,D+0.15,yb+H,yb+H+0.28,[0.13,0.13,0.14],TM.metalL,{bottom:true,botCol:[0.25,0.25,0.26]});
    const gl=(a,b,n)=>wallUV(a,b,yb+0.1,yb+2.35,n,[0.92,0.95,0.97],T.lmMelaGlass,1,[0,1,0.2,0.75]);
    gl(Fp.P(0,D),Fp.P(L,D),nS);gl(Fp.P(0,0),Fp.P(0,D),nW);gl(Fp.P(L,0),Fp.P(L,D),nE);
    // white retractable awnings on two slanted black arms (court side) + flat roof fabric
    {const B=Oc(...Fp.P(L/2,D));const a=Fp.P(0,D),b=Fp.P(L,D),a2=Fp.P(0,D+2.0),b2=Fp.P(L,D+2.0);const yt=yb+H+0.05,ybb=yb+H-0.65;
      quadN(B,[a[0],yt,a[1]],[b[0],yt,b[1]],[b2[0],ybb,b2[1]],[a2[0],ybb,a2[1]],[0,0],[L/1.6,0],[L/1.6,1],[0,1],C1,T.lmAwnW,true);
      quadN(B,[a[0],yt-0.02,a[1]],[b[0],yt-0.02,b[1]],[b2[0],ybb-0.02,b2[1]],[a2[0],ybb-0.02,a2[1]],[0,0],[L/1.6,0],[L/1.6,1],[0,1],[0.8,0.8,0.78],T.lmAwnW,false);
      for(const s of[0,L/2,L]){const p=Fp.P(s,D),q=Fp.P(s,D+2.0);B.quad([p[0],yt+0.03,p[1]],[q[0],ybb+0.03,q[1]],[q[0],ybb+0.1,q[1]],[p[0],yt+0.1,p[1]],[0,0],[2,0],[2,0.1],[0,0.1],DARK,RECT[TM.metalL],0)}}
    flat([Fp.P(0.1,0.1),Fp.P(L-0.1,0.1),Fp.P(L-0.1,D-0.1),Fp.P(0.1,D-0.1)],yb+H+0.29,[0.93,0.92,0.9],T.lmAwnW,false,0.3);
    for(const [s,t] of[[1.4,1.2],[3.6,1.2],[5.8,1.2],[1.4,3.1],[3.6,3.1],[5.8,3.1]]){const p=Fp.P(s,t);table(p[0],p[1],yb+0.1,0.36,[0.15,0.15,0.15],[0.7,0.1,0.1],2,Math.atan2(u[0],u[1]))}
    for(const [a,b] of[[Fp.P(0,0),Fp.P(L,0)],[Fp.P(L,0),Fp.P(L,D)],[Fp.P(L,D),Fp.P(0,D)],[Fp.P(0,D),Fp.P(0,0)]])addSeg(a[0],a[1],b[0],b[1],'p');
    // planters in the court
    for(const [s,t] of[[14.5,-3.0],[14.5,-8.5]]){const Fq=frame(Wf.P(s,t),u,v);lbox(Fq,-0.6,0.6,-0.6,0.6,yC,yC+0.7,[0.62,0.6,0.57],TM.concrete);lbox(Fq,-0.5,0.5,-0.5,0.5,yC+0.7,yC+1.2,[0.9,1,0.9],T.hedge,{});const q=Wf.P(s,t);addBoxC(q[0],q[1],0.6,'p')}}

  /* ======== collision (2D) — the level grid has 1 m cells, so every level change gets two walls 0.75 m either side ======== */
  const S=(s0,t0,s1,t1)=>{const a=Wf.P(s0,t0),b=Wf.P(s1,t1);addSeg(a[0],a[1],b[0],b[1],'b')};
  S(0,Dw,Lw,Dw);S(Lw,-0.75,Lw,Dw);// north face, east end
  S(-0.8,-0.75,sP5,-0.75);// court side of the wing (also the lower flight's north wall)
  const gOpen0=Lw-4.4,gOpen1=Lw-1.2;// gallery <-> garden step at the east end
  const gp=Wf.P((gOpen0+gOpen1)/2,-1.3),gd=groundY(gp[0],gp[1])-yG;
  if(Math.abs(gd)<0.6){S(sP0,-0.75,gOpen0,-0.75);S(gOpen1,-0.75,Lw,-0.75);S(0,0.75,gOpen0,0.75);S(gOpen1,0.75,Lw,0.75);S(gOpen0,-0.75,gOpen0,0.75);S(gOpen1,-0.75,gOpen1,0.75)}
  else{S(sP0,-0.75,Lw,-0.75);S(0,0.75,Lw,0.75)}
  console.log('[lm-kfc] gallery vs garden at the east end: '+gd.toFixed(2)+' m');
  S(KD,Dg,Lw,Dg);S(KD,Dg,KD,KT1);S(0.75,KT1,KD,KT1);// gallery back, KFC glazing, terrace north end
  S(0.75,UT1-0.7,0.75,KT1);S(0,UT1-0.7,0.75,UT1-0.7);// terrace west railing (raised side)
  S(-0.75,UT1+0.2,-0.75,Dw);// pavement side of the west face
  S(-UF,1.2,0,1.2);S(-UF+1,-0.2,0,-0.2);S(0,-0.2,0,0.75);S(0,0.75,0,1.2);// upper flight: south side (stair side / pavement side)
  S(-UF,UT1-0.7,0,UT1-0.7);S(-UF+1,UT1+0.2,-0.75,UT1+0.2);// upper flight: north side
  S(-0.8,LT0+0.4,LF1,LT0+0.4);S(0.4,LT0-0.7,LF1,LT0-0.7);// lower flight: south side (flight side / court side)

  /* ======== the walkable levels (LVL grid: height above the terrain per 1 m cell) ======== */
  try{if(typeof LVL!=='undefined'&&LVL&&BOUNDS){const bx0=BOUNDS[0],bz0=BOUNDS[1];const strip=[P(14),...STRIP_SW,P(3),P(4),P(13)];
    let X0=1e9,X1=-1e9,Z0=1e9,Z1=-1e9;for(const p of ps.concat(strip)){X0=Math.min(X0,p[0]);X1=Math.max(X1,p[0]);Z0=Math.min(Z0,p[1]);Z1=Math.max(Z1,p[1])}
    let n=0;for(let pz=Math.floor(Z0-2-bz0);pz<=Math.ceil(Z1+2-bz0);pz++)for(let px=Math.floor(X0-2-bx0);px<=Math.ceil(X1+2-bx0);px++){if(px<0||pz<0||px>=lvW||pz>=lvH)continue;
      const x=bx0+px+0.5,z=bz0+pz+0.5;const [s,t]=W2(x,z);let h=null;
      if(s>=-UF&&s<0&&t>=0.5&&t<UT1-0.25)h=yP+(s+UF)/UF*(yG-yP);// upper flight
      else if(s>=0&&s<Lw+0.8&&t>=0&&(t<Dg+1.0||(s<KD+0.75&&t<Dw+0.5)))h=yG;// gallery + KFC terrace
      else if(s>=-0.8&&s<LF1&&t>=LT0-0.15&&t<0)h=yP-Math.max(0,Math.min(1,s/LF1))*(yP-yC);// lower flight
      else if(pip(ring,x,z))h=yC;// forecourt
      else if(pip(strip,x,z)){LVL[pz*lvW+px]=0.165;n++;continue}
      else{const [a,b]=loc([x,z]);if(a>=0&&a<=aF&&b>=0&&b<Dar)h=yF+0.03}// avenue arcade floor
      if(h!=null){LVL[pz*lvW+px]=h-terr(x,z);n++}}
    console.log('[lm-kfc] level grid: '+n+' cells set (court '+yC.toFixed(2)+', pavement '+yP.toFixed(2)+', gallery '+yG.toFixed(2)+')')}}catch(e){console.error('lm-kfc LVL failed',e)}
  // no garden trees in the paved forecourt / on the strip (the photo shows none); street trees on the sidewalk are kept
  try{const strip=[P(14),...STRIP_SW,P(3),P(4),P(13)];const G=MAP.garden_trees;if(G)for(let i=G.length-1;i>=0;i--){const x=G[i][0]/10,z=G[i][1]/10;if(pip(ring,x,z)||pip(strip,x,z)||pip(ps,x,z))G.splice(i,1)}}catch(e){}

  /* ======== the KFC door for the interiors / map / missions (on the terrace, gallery level) ======== */
  {const fac=Wf.P(KD,kDoorT),n=nW;const Sp=MAP.special&&MAP.special.kfc;const door=[+(fac[0]+n[0]*1.6).toFixed(2),+(fac[1]+n[1]*1.6).toFixed(2)];
    if(Sp){Sp.x=+fac[0].toFixed(2);Sp.z=+fac[1].toFixed(2);Sp.nx=+n[0].toFixed(3);Sp.nz=+n[1].toFixed(3);Sp.door=door;Sp.lm='kfc';Sp.y=yG;
      if(Sp.poi!=null&&MAP.pois&&MAP.pois[Sp.poi]){const p=MAP.pois[Sp.poi];p.x=Sp.x;p.z=Sp.z;if(p.fx!=null){p.fx=Sp.x;p.fz=Sp.z}p.nx=Sp.nx;p.nz=Sp.nz;p.door=Sp.door}}
    if(MAP.key)MAP.key.kfc=door.slice();
    placed('landmark',fac[0],fac[1],'KFC (Mela arcade, Kifisias 238, upper level)','lm-kfc')}
  placed('landmark',P(13)[0],P(13)[1],'Εμπορικό Κέντρο Μελά (ex Grand Hotel de Kifissia, 1897)','lm-kfc');
  window.LM_KFC={yP,yC,yG,frame:{A,u,v},door:MAP.key&&MAP.key.kfc};
}
LM.register({id:'kfc',at:[[20,-35],[-5,-2]],build});
})();
