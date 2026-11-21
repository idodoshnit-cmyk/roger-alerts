'use strict';
/* 89a_lm_junction.js — the player's start junction, hand-modelled (owner: bot lm-junction).
   Kassaveti × Levidou × Agiou Dimitriou: AB Vasilopoulos (Levidou 2 / Kassaveti 8), Mythos Plus (Kassaveti 13) and the corner block next to it,
   PAUL (Levidou 4), the NE corner block (Carpo / Desigual / Germanos), "Pyrgos Kifisias" (SE corner: La Pasteria, Zara), Kassaveti 9 and the Kostarelos building.
   Every building keeps its real OSM footprint (1 unit = 1 m). Facade designs: docs/research/lm/junction.md (what is photo-based and what is inferred).
   Public: window.JN (debug info: built buildings, sign list, triangle count). Nothing else is exported. */
(function(){
if(typeof LM==='undefined'||typeof defTile!=='function')return;
const JN=window.JN={built:[],signs:[],tris:0,warn:[],version:1};
const H=hexc;
let SHOPSJ=null,BSPEC=null;// data/shops.json (research-shops) and data/buildings_spec.json (research-arch); both optional
try{fetch('data/shops.json').then(r=>r.ok?r.json():null).then(d=>{if(d&&d.shops)SHOPSJ=d.shops}).catch(()=>{});fetch('data/buildings_spec.json').then(r=>r.ok?r.json():null).then(d=>{if(d)BSPEC=d}).catch(()=>{})}catch(e){}
const shopsJ=()=>SHOPSJ||(typeof BDATA!=='undefined'&&BDATA&&BDATA.shops&&BDATA.shops.shops)||null;
/* full shop list of a map building: [edge, t, name, bg, fg, kind, poiIdx, widthM] (b[11].shops is the complete list; b[8] the signed subset) */
const shopsOf=b=>(b[11]&&Array.isArray(b[11].shops)&&b[11].shops.length?b[11].shops:b[8])||[];

/* ============================== BUILDINGS (OSM way ids, as kifisia_map.json buildings[i][11].id) ============================== */
const IDS={ab:'w668312663',nw:'w1075949834',myth:'w1075949835',kost:'w1075949833',k9:'w1075949836',paul:'w1076768357',ne:'w1076768358',pyr:'w1076626153'};
const AT=[[61.7,78.7],[86.0,41.8],[76.0,42.8],[94.4,31.6],[69.2,43.6],[134.5,35.2],[125.8,48.6],[113.4,94.4]];

/* ============================== MATERIAL TILES (registered at script load) ============================== */
const VFLIP=true;// canvas row 0 = v 1 (top of the quad)
const SG_ROWS=6,SG_TILES=5;// 5 sign tiles × 6 bands (each band 240×40 design px, aspect 6:1)
function fitFont(g,txt,w,h,fam,wt){let fs=Math.max(6,Math.floor(h));g.font=wt+' '+fs+'px '+fam;while(fs>5&&g.measureText(txt).width>w){fs-=1;g.font=wt+' '+fs+'px '+fam}return fs}
const FAM_SERIF='Georgia,"Times New Roman",serif',FAM_SANS='"Helvetica Neue",Helvetica,Arial,sans-serif';
function drawBand(g,m,x,y,w,h,sg){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.fillStyle=sg.bg;g.fillRect(x,y,w,h);
  const fam=(sg.style==='serif'||sg.style==='script')?FAM_SERIF:FAM_SANS,wt=sg.style==='script'?'italic bold':'bold';const txt=sg.style==='caps'?sg.text.toUpperCase():sg.text;
  g.fillStyle=sg.fg;g.textAlign='center';g.textBaseline='middle';
  if(sg.sub){fitFont(g,txt,w*0.88,h*0.56,fam,wt);g.fillText(txt,x+w/2,y+h*0.40);fitFont(g,sg.sub,w*0.8,h*0.2,FAM_SANS,'bold');g.fillText(sg.sub,x+w/2,y+h*0.82)}
  else{fitFont(g,txt,w*0.88,h*0.64,fam,wt);g.fillText(txt,x+w/2,y+h*0.54)}
  g.strokeStyle='rgba(255,255,255,0.10)';g.lineWidth=1;g.strokeRect(x+1.5,y+1.5,w-3,h-3);g.restore();if(sg.lit!==false){m.fillStyle='#fff';m.fillRect(x,y,w,h)}}
/* band rectangle (design px) → [u0,u1,v0,v1] */
const uvR=(x0,y0,x1,y1)=>VFLIP?[x0/240,x1/240,1-y1/240,1-y0/240]:[x0/240,x1/240,y0/240,y1/240];

// window glass with a hint of the room behind (curtains, ceiling lamp): reflective by day, warm at night
defTile('jGlass',(g,S,m)=>{const gr=g.createLinearGradient(0,0,0,S);gr.addColorStop(0,'#8d8478');gr.addColorStop(0.5,'#6f6558');gr.addColorStop(1,'#4c463e');g.fillStyle=gr;g.fillRect(0,0,S,S);
  g.fillStyle='rgba(240,228,205,0.75)';g.fillRect(0,0,S*0.2,S);g.fillRect(S*0.8,0,S*0.2,S);g.fillStyle='rgba(120,100,80,0.35)';for(let i=0;i<6;i++){g.fillRect(S*0.03*i+3,0,2,S);g.fillRect(S*0.8+S*0.03*i+3,0,2,S)}
  const l=g.createRadialGradient(S*0.5,S*0.12,2,S*0.5,S*0.2,S*0.5);l.addColorStop(0,'rgba(255,236,190,0.9)');l.addColorStop(1,'rgba(255,236,190,0)');g.fillStyle=l;g.fillRect(0,0,S,S);
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:1,glassDark:0.55,spec:0.3,shin:110,glowK:1.8});
// generic lit shop interior (shelves, counter, lights); vertex colour tints it per category
defTile('jShop',(g,S,m)=>{g.fillStyle='#e9e2d6';g.fillRect(0,0,S,S);g.fillStyle='#d8cfc0';g.fillRect(0,S*0.72,S,S*0.28);
  const fl=g.createLinearGradient(0,S*0.72,0,S);fl.addColorStop(0,'#b9ab96');fl.addColorStop(1,'#8f8270');g.fillStyle=fl;g.fillRect(0,S*0.72,S,S*0.28);
  const cols=['#7b5a3c','#3c4f6b','#9b3b3b','#c8b48a','#2f2f33','#e6e0d2','#6b7b5a'];for(let r=0;r<4;r++){g.fillStyle='#8a7b66';g.fillRect(8,S*0.16+r*S*0.13,S-16,3);
    for(let i=0;i<22;i++){g.fillStyle=cols[(i*7+r*3)%cols.length];g.fillRect(12+i*10,S*0.16+r*S*0.13-14+((i*5+r)%3)*2,7,14-((i*5+r)%3)*2)}}
  g.fillStyle='#3a3029';g.fillRect(S*0.55,S*0.62,S*0.4,S*0.16);g.fillStyle='#c9b79a';g.fillRect(S*0.55,S*0.6,S*0.4,4);
  for(let i=0;i<5;i++){const l=g.createRadialGradient(S*(0.1+i*0.2),6,1,S*(0.1+i*0.2),10,40);l.addColorStop(0,'rgba(255,248,225,1)');l.addColorStop(1,'rgba(255,248,225,0)');g.fillStyle=l;g.fillRect(0,0,S,S*0.4)}
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.55,glassDark:0.12,spec:0.2,shin:80,glowK:1.6});
// supermarket interior: white, cool light, gondolas with colourful products, promo banners
defTile('jSuper',(g,S,m)=>{g.fillStyle='#f2f2ef';g.fillRect(0,0,S,S);g.fillStyle='#c9ccce';g.fillRect(0,S*0.78,S,S*0.22);
  g.fillStyle='#d7262d';g.fillRect(0,S*0.08,S,10);g.fillStyle='#0a4ea1';g.fillRect(0,S*0.08+10,S,4);
  const cols=['#d7262d','#f2c230','#3f8f3a','#0a4ea1','#ffffff','#f08a24','#7a3d8f','#e8e0c8'];
  for(let gi=0;gi<4;gi++){const x0=6+gi*60;g.fillStyle='#b7bcc0';g.fillRect(x0,S*0.26,48,S*0.52);for(let r=0;r<5;r++){g.fillStyle='#9aa0a6';g.fillRect(x0,S*0.3+r*S*0.095,48,2);
      for(let i=0;i<8;i++){g.fillStyle=cols[(i*3+r*5+gi)%cols.length];g.fillRect(x0+2+i*5.8,S*0.3+r*S*0.095-11,4.6,11)}}}
  for(let i=0;i<6;i++){g.fillStyle='rgba(255,255,255,0.95)';g.fillRect(i*42+6,S*0.02,30,4)}
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.5,glassDark:0.08,spec:0.2,shin:80,glowK:1.5});
// PAUL boulangerie window: dark wooden racks with loaves, pastries vitrine, warm light
defTile('jBakery',(g,S,m)=>{const bg=g.createLinearGradient(0,0,0,S);bg.addColorStop(0,'#5a3d26');bg.addColorStop(1,'#2e1f14');g.fillStyle=bg;g.fillRect(0,0,S,S);
  for(let r=0;r<4;r++){const y=S*0.12+r*S*0.13;g.fillStyle='#3a2416';g.fillRect(6,y+18,S-12,4);for(let i=0;i<11;i++){g.fillStyle=['#c98a3d','#b8742c','#d9a55a','#a8652a'][(i+r)%4];g.beginPath();g.ellipse(18+i*20.5,y+12,8.5,(r%2?5:7),0,0,TAU);g.fill();g.fillStyle='rgba(255,235,190,0.35)';g.fillRect(14+i*20.5,y+8,6,2)}}
  g.fillStyle='#e9dfc9';g.fillRect(0,S*0.68,S,S*0.32);g.fillStyle='rgba(255,255,255,0.5)';g.fillRect(0,S*0.68,S,3);
  for(let i=0;i<14;i++){g.fillStyle=['#e7b86a','#8b4a2b','#f0e2c4','#d65a6a','#c99b4f'][i%5];g.beginPath();g.ellipse(10+i*16.5,S*0.8,6,4,0,0,TAU);g.fill()}
  g.fillStyle='#24170f';g.fillRect(0,S*0.88,S,S*0.12);
  const l=g.createRadialGradient(S/2,S*0.05,4,S/2,S*0.2,S*0.7);l.addColorStop(0,'rgba(255,214,150,0.55)');l.addColorStop(1,'rgba(255,214,150,0)');g.fillStyle=l;g.fillRect(0,0,S,S);
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.55,glassDark:0.1,spec:0.2,shin:80,glowK:1.7});
// Mythos Plus grill hall seen through the arch: brick-paved aisle, white brick wall right, beige tiled counter left, warm spots, "garden in" at the end
defTile('jGrill',(g,S,m)=>{g.fillStyle='#d9b88a';g.fillRect(0,0,S,S);const vx=S*0.62,vy=S*0.52;
  g.fillStyle='#efe9df';g.beginPath();g.moveTo(S,0);g.lineTo(vx+18,vy-26);g.lineTo(vx+18,vy+18);g.lineTo(S,S);g.fill();
  g.strokeStyle='rgba(180,170,160,0.6)';g.lineWidth=1;for(let i=0;i<12;i++){g.beginPath();g.moveTo(S,i*S/12);g.lineTo(vx+18,vy-26+i*44/12);g.stroke()}
  g.fillStyle='#b5683c';g.beginPath();g.moveTo(0,S);g.lineTo(vx-14,vy+18);g.lineTo(vx+18,vy+18);g.lineTo(S,S);g.fill();
  g.strokeStyle='rgba(90,40,20,0.5)';for(let i=0;i<10;i++){const t=i/10;g.beginPath();g.moveTo(0+t*(vx-14),S-t*(S-vy-18));g.lineTo(S-t*(S-vx-18),S-t*(S-vy-18));g.stroke()}
  g.fillStyle='#cdb48c';g.beginPath();g.moveTo(0,S*0.62);g.lineTo(vx-14,vy);g.lineTo(vx-14,vy+18);g.lineTo(0,S*0.9);g.fill();g.fillStyle='#efe2c8';g.beginPath();g.moveTo(0,S*0.6);g.lineTo(vx-14,vy-2);g.lineTo(vx-14,vy);g.lineTo(0,S*0.63);g.fill();
  g.fillStyle='#c9962e';g.beginPath();g.moveTo(0,0);g.lineTo(vx-14,vy-26);g.lineTo(vx+18,vy-26);g.lineTo(S,0);g.fill();
  for(let i=0;i<7;i++){const t=i/7;const x=lerp(S*0.15,vx,t),y=lerp(10,vy-26,t);const l=g.createRadialGradient(x,y,1,x,y,22*(1-t)+6);l.addColorStop(0,'rgba(255,240,200,1)');l.addColorStop(1,'rgba(255,240,200,0)');g.fillStyle=l;g.fillRect(x-30,y-30,60,60)}
  g.fillStyle='#2b241c';g.fillRect(vx-14,vy-26,32,44);g.fillStyle='#ffd23a';g.font='italic bold 9px Georgia';g.textAlign='center';g.fillText('garden in',vx+2,vy-12);
  g.fillStyle='#e8701e';g.fillRect(S*0.08,S*0.4,10,30);g.fillRect(S*0.2,S*0.42,9,26);g.fillStyle='#7a3e1e';g.fillRect(S*0.08+2,S*0.43,6,24);g.fillRect(S*0.2+2,S*0.45,5,20);
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.5,glassDark:0.1,spec:0.2,shin:80,glowK:1.7});
// room-in-perspective helper for shop interiors: back wall, floor, ceiling with spots (vanishing point vx,vy)
function roomPersp(g,S,wall,floor,ceil,spot){const vx=S*0.5,vy=S*0.5,bw=S*0.36,bh=S*0.3;const x0=vx-bw/2,x1=vx+bw/2,y0=vy-bh/2,y1=vy+bh/2;
  g.fillStyle=ceil;g.beginPath();g.moveTo(0,0);g.lineTo(S,0);g.lineTo(x1,y0);g.lineTo(x0,y0);g.fill();
  g.fillStyle=floor;g.beginPath();g.moveTo(0,S);g.lineTo(S,S);g.lineTo(x1,y1);g.lineTo(x0,y1);g.fill();
  g.fillStyle=shadeHex(wall,0.9);g.beginPath();g.moveTo(0,0);g.lineTo(x0,y0);g.lineTo(x0,y1);g.lineTo(0,S);g.fill();g.beginPath();g.moveTo(S,0);g.lineTo(x1,y0);g.lineTo(x1,y1);g.lineTo(S,S);g.fill();
  g.fillStyle=wall;g.fillRect(x0,y0,bw,bh);
  g.strokeStyle='rgba(0,0,0,0.08)';g.lineWidth=1;for(let i=1;i<8;i++){const t=i/8;g.beginPath();g.moveTo(t*S,S);g.lineTo(x0+t*bw,y1);g.stroke()}
  for(let i=0;i<4;i++){const t=(i+0.5)/4;for(let k=0;k<3;k++){const d=k/3,x=lerp(t*S,x0+t*bw,d),y=lerp(4,y0,d),r=lerp(26,8,d);const l=g.createRadialGradient(x,y,1,x,y,r);l.addColorStop(0,spot);l.addColorStop(1,'rgba(255,240,210,0)');g.fillStyle=l;g.fillRect(x-r,y-r,2*r,2*r)}}
  return{x0,x1,y0,y1,vx,vy}}
function shadeHex(h,k){const n=parseInt(h.slice(1),16);const r=Math.round(((n>>16)&255)*k),gg=Math.round(((n>>8)&255)*k),b=Math.round((n&255)*k);return 'rgb('+r+','+gg+','+b+')'}
// café / restaurant / fast food: warm wood, counter with menu boards at the back, small tables and chairs, pendant lamps
defTile('jCafe',(g,S,m)=>{const R=roomPersp(g,S,'#d9c3a0','#8a5f3c','#e8dccb','rgba(255,226,170,0.95)');
  g.fillStyle='#2b2420';g.fillRect(R.x0+4,R.y0+6,R.x1-R.x0-8,18);g.fillStyle='#f3e7c9';for(let i=0;i<3;i++)g.fillRect(R.x0+8+i*((R.x1-R.x0-16)/3),R.y0+9,(R.x1-R.x0-16)/3-6,12);
  g.fillStyle='#6b4a30';g.fillRect(R.x0-6,R.y1-26,R.x1-R.x0+12,26);g.fillStyle='#c9a77a';g.fillRect(R.x0-8,R.y1-28,R.x1-R.x0+16,4);
  const tb=(x,y,sc)=>{g.fillStyle='#3b2a1e';g.fillRect(x-1.5*sc,y,3*sc,16*sc);g.fillStyle='#e9e2d4';g.beginPath();g.ellipse(x,y,13*sc,3.5*sc,0,0,TAU);g.fill();
    g.fillStyle='#7a5434';for(const d of[-1,1]){g.fillRect(x+d*15*sc-3*sc,y-6*sc,6*sc,20*sc);g.fillRect(x+d*15*sc-5*sc,y+4*sc,10*sc,3*sc)}};
  tb(S*0.2,S*0.72,1.6);tb(S*0.8,S*0.72,1.6);tb(S*0.33,S*0.62,1.1);tb(S*0.67,S*0.62,1.1);
  for(let i=0;i<3;i++){const x=S*(0.25+i*0.25);g.strokeStyle='#222';g.beginPath();g.moveTo(x,0);g.lineTo(x,S*0.12);g.stroke();g.fillStyle='#1d1d1d';g.beginPath();g.moveTo(x-9,S*0.15);g.lineTo(x+9,S*0.15);g.lineTo(x+4,S*0.11);g.lineTo(x-4,S*0.11);g.fill();
    const l=g.createRadialGradient(x,S*0.16,1,x,S*0.18,22);l.addColorStop(0,'rgba(255,214,140,1)');l.addColorStop(1,'rgba(255,214,140,0)');g.fillStyle=l;g.fillRect(x-24,S*0.12,48,40)}
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.5,glassDark:0.1,spec:0.2,shin:80,glowK:1.7});
// fashion / shoes / cosmetics: pale room, wall shelves with folded stacks, clothes rails, two mannequins in the window
defTile('jFashion',(g,S,m)=>{const R=roomPersp(g,S,'#efebe4','#cfc6b8','#f6f4ef','rgba(255,250,236,1)');const cols=['#1f2a44','#8a2b2b','#d8cfc0','#3b5a3f','#111','#c9a46a','#7d6b8f','#e9e4da'];
  for(let r=0;r<3;r++){g.fillStyle='#b9b1a4';g.fillRect(R.x0+4,R.y0+10+r*20,R.x1-R.x0-8,2);for(let i=0;i<9;i++){g.fillStyle=cols[(i*3+r)%8];g.fillRect(R.x0+7+i*9.3,R.y0+3+r*20,7,7)}}
  for(const sd of[-1,1]){const xa=sd<0?S*0.06:S*0.94,xb=sd<0?R.x0-6:R.x1+6;g.strokeStyle='#9a9a9a';g.lineWidth=2;g.beginPath();g.moveTo(xa,S*0.36);g.lineTo(xb,R.y0+18);g.stroke();
    for(let i=0;i<10;i++){const t=i/10,x=lerp(xa,xb,t),y=lerp(S*0.36,R.y0+18,t),h=lerp(64,22,t),w=lerp(12,4,t);g.fillStyle=cols[(i*5+(sd>0?3:0))%8];g.fillRect(x-w/2,y,w,h)}}
  for(const x of[S*0.36,S*0.64]){g.fillStyle='#e8e0d6';g.beginPath();g.arc(x,S*0.5,7,0,TAU);g.fill();g.fillStyle=x<S/2?'#1f2a44':'#8a2b2b';g.fillRect(x-12,S*0.54,24,40);g.fillStyle='#2b2b2b';g.fillRect(x-8,S*0.66,16,36);g.fillStyle='#8f8f8f';g.fillRect(x-1,S*0.8,2,22);g.fillRect(x-10,S*0.89,20,3)}
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.55,glassDark:0.1,spec:0.25,shin:90,glowK:1.6});
// phones / electronics / bank / optician: bright white, display tables with devices, wall screens, back counter
defTile('jTech',(g,S,m)=>{const R=roomPersp(g,S,'#f4f6f8','#d9dde0','#fbfcfd','rgba(240,248,255,1)');
  g.fillStyle='#1d2430';for(let i=0;i<3;i++)g.fillRect(R.x0+6+i*((R.x1-R.x0-12)/3),R.y0+8,(R.x1-R.x0-12)/3-5,22);g.fillStyle='#3d7bd9';for(let i=0;i<3;i++)g.fillRect(R.x0+9+i*((R.x1-R.x0-12)/3),R.y0+11,(R.x1-R.x0-12)/3-11,16);
  const tb=(x,y,w,h)=>{g.fillStyle='#e9e5de';g.fillRect(x-w/2,y,w,h);g.fillStyle='#ffffff';g.fillRect(x-w/2-2,y-4,w+4,5);g.fillStyle='#202428';for(let i=0;i<5;i++)g.fillRect(x-w/2+4+i*(w-8)/5,y-7,(w-8)/5-4,4)};
  tb(S*0.25,S*0.72,70,30);tb(S*0.75,S*0.72,70,30);tb(S*0.5,S*0.6,46,18);
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.55,glassDark:0.08,spec:0.25,shin:90,glowK:1.5});
const CAT_TILE=k=>/cafe|restaurant|fast_food|food|ice_cream|bar|pub|bakery|confectionery|pastry|deli|frozen|chocolate|coffee|tea|wine/.test(k||'')?'jCafe'
  :/cloth|shoe|fashion|boutique|bag|jewel|gift|toy|cosmetic|perfum|beauty|watch|lingerie|accessor|sport|interior|houseware|florist|books|stationery/.test(k||'')?'jFashion'
  :/mobile|phone|electronic|computer|bank|optician|travel|money|insurance|hairdress|pharmacy|chemist/.test(k||'')?'jTech':'jShop';
// brand signs (plain text in the shops' colours — no logos): AB fascia, PAUL fascia, Mythos capsule, Mythos round decal, PAUL blade
const BR={ab:uvR(0,0,240,48),paul:uvR(0,48,240,96),myth:uvR(0,96,240,192),decal:uvR(0,192,48,240),blade:uvR(48,192,96,240),neon:uvR(96,192,240,240)};
defTile('jBrand',(g,S,m)=>{
  // AB Vasilopoulos — white fascia, red ΑΒ + navy ΒΑΣΙΛΟΠΟΥΛΟΣ (plain lettering)
  g.fillStyle='#ffffff';g.fillRect(0,0,240,48);g.textBaseline='middle';g.textAlign='left';g.fillStyle='#d7262d';fitFont(g,'ΑΒ',60,34,FAM_SANS,'bold');g.fillText('ΑΒ',14,25);
  g.fillStyle='#0a3d8f';fitFont(g,'ΒΑΣΙΛΟΠΟΥΛΟΣ',150,22,FAM_SANS,'bold');g.fillText('ΒΑΣΙΛΟΠΟΥΛΟΣ',74,26);g.fillStyle='#d7262d';g.fillRect(0,44,240,4);
  // PAUL — dark brown timber, cream/gold serif capitals
  g.fillStyle='#2b1d14';g.fillRect(0,48,240,48);g.strokeStyle='#b89a5a';g.lineWidth=1.2;g.strokeRect(4,52,232,40);g.fillStyle='#e3cf98';g.textAlign='center';fitFont(g,'PAUL',120,27,FAM_SERIF,'bold');g.fillText('PAUL',120,68);
  fitFont(g,'MAISON DE QUALITÉ DEPUIS 1889',150,7,FAM_SERIF,'');g.fillText('MAISON DE QUALITÉ DEPUIS 1889',120,86);
  // Mythos Plus capsule light box (geometry is a stadium shape; the corners of this area are not shown)
  g.fillStyle='#141416';g.fillRect(0,96,240,96);g.fillStyle='#f5b81c';fitFont(g,'mythos',170,44,FAM_SANS,'bold');g.fillText('mythos',120,128);
  g.fillStyle='#ffffff';fitFont(g,'plus',60,22,FAM_SERIF,'italic');g.fillText('plus',132,154);g.fillRect(52,173,22,1.5);g.fillRect(166,173,22,1.5);fitFont(g,'RESTAURANT - GRILL',86,9,FAM_SANS,'bold');g.fillText('RESTAURANT - GRILL',120,174);
  // round navy decal on the terrace screens
  g.fillStyle='#ffffff';g.fillRect(0,192,48,48);g.fillStyle='#1d2a4a';g.beginPath();g.arc(24,216,23,0,TAU);g.fill();g.strokeStyle='#e9e2cf';g.lineWidth=1;g.beginPath();g.arc(24,216,20,0,TAU);g.stroke();
  g.fillStyle='#f5b81c';fitFont(g,'mythos',36,12,FAM_SANS,'bold');g.fillText('mythos',24,213);g.fillStyle='#fff';fitFont(g,'plus',20,7,FAM_SERIF,'italic');g.fillText('plus',26,223);
  // PAUL blade (projecting oval)
  g.fillStyle='#b89a5a';g.fillRect(48,192,48,48);g.fillStyle='#2b1d14';g.beginPath();g.ellipse(72,216,22,22,0,0,TAU);g.fill();g.fillStyle='#e3cf98';fitFont(g,'PAUL',34,13,FAM_SERIF,'bold');g.fillText('PAUL',72,217);
  // "garden in" neon (yellow on dark) — seen at the end of the Mythos aisle
  g.fillStyle='#1c1814';g.fillRect(96,192,144,48);g.fillStyle='#ffd23a';fitFont(g,'garden in',120,26,FAM_SERIF,'italic bold');g.fillText('garden in',168,216);
  m.fillStyle='#fff';m.fillRect(0,0,240,192);m.beginPath();m.arc(24,216,23,0,TAU);m.fill();m.beginPath();m.ellipse(72,216,22,22,0,0,TAU);m.fill();m.fillRect(96,192,144,48)},{spec:0.08,shin:40,glowK:1.6});
// shop fascia signs: SG_TILES tiles × SG_ROWS bands; filled from MAP + data/shops.json when the materials are painted
function signPainter(k){return (g,S,m)=>{const L=collectSigns();for(let r=0;r<SG_ROWS;r++){const sg=L[k*SG_ROWS+r];if(!sg){g.fillStyle='#e8e2d6';g.fillRect(0,r*40,240,40);continue}drawBand(g,m,0,r*40,240,40,sg)}}}
for(let k=0;k<SG_TILES;k++)defTile('jSign'+k,signPainter(k),{spec:0.08,shin:40,glowK:1.5});
// cut-outs: white turned balusters (top half), scalloped awning valance (rows 120-180), glass-screen frame (rows 180-240)
defTile('jBalus',(g,S,m)=>{g.clearRect(0,0,S,S);g.fillStyle='#f2efe7';
  for(let i=0;i<4;i++){const cx=30+i*60;g.beginPath();g.moveTo(cx-9,118);g.lineTo(cx+9,118);g.bezierCurveTo(cx+9,100,cx+4,96,cx+5,88);g.bezierCurveTo(cx+18,70,cx+16,40,cx+5,28);g.lineTo(cx+8,20);g.lineTo(cx+10,4);g.lineTo(cx-10,4);g.lineTo(cx-8,20);g.lineTo(cx-5,28);g.bezierCurveTo(cx-16,40,cx-18,70,cx-5,88);g.bezierCurveTo(cx-4,96,cx-9,100,cx-9,118);g.fill()}
  g.fillStyle='#ffffff';for(let i=0;i<4;i++){g.beginPath();g.moveTo(i*60,120);g.lineTo(i*60+60,120);g.lineTo(i*60+60,150);g.quadraticCurveTo(i*60+30,182,i*60,150);g.fill()}
  g.fillStyle='#ffffff';g.fillRect(0,180,S,4);g.fillRect(0,236,S,4);g.fillStyle='rgba(255,255,255,0.0)'},{cut:true,spec:0.05,shin:20});
// aluminium balcony railing: top and bottom rail, vertical bars every 12 cm (tint carrier: vertex colour decides)
defTile('jRail',(g,S,m)=>{g.clearRect(0,0,S,S);g.fillStyle='#f4f4f4';g.fillRect(0,0,S,16);g.fillRect(0,S-14,S,14);g.fillRect(0,S*0.62,S,6);for(let i=0;i<8;i++)g.fillRect(i*30+12,0,7,S)},{cut:true,spec:0.25,shin:60});
// awning canvas (tint carrier), soft woven texture with seams
defTile('jFabric',(g,S,m)=>{g.fillStyle='#e6e6e6';g.fillRect(0,0,S,S);for(let i=0;i<240;i+=3){g.fillStyle=i%6?'rgba(0,0,0,0.035)':'rgba(255,255,255,0.05)';g.fillRect(0,i,S,1.5);g.fillRect(i,0,1.5,S)}
  g.fillStyle='rgba(0,0,0,0.08)';g.fillRect(0,0,S,3);g.fillRect(S/2,0,2,S)},{spec:0.03,shin:10});

/* ============================== SIGN LIST ============================== */
let _signs=null,_signKey='';
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9α-ω]/g,'');
const isBrand=n=>/mythos|^paul$|βασιλ[οό]πουλος|vasilopoulos/i.test(n);
function shopSpec(name,x,z){const SJ=shopsJ();if(!SJ)return null;const k=nrm(name);let best=null,bd=80;for(const s of SJ){if(nrm(s.name)!==k&&nrm(s.nameLatin)!==k)continue;const d=s.x!==undefined?Math.hypot(s.x-x,s.z-z):0;if(d<bd){bd=d;best=s}}return best}
function myBuildings(){const o=[];if(typeof MAP==='undefined'||!MAP||!MAP.buildings)return o;const want=new Set(Object.values(IDS));for(const b of MAP.buildings)if(b[11]&&want.has(b[11].id))o.push(b);return o}
function collectSigns(){const bs=myBuildings();const key=bs.length+':'+(shopsJ()?1:0);if(_signs&&_signKey===key)return _signs;_signKey=key;const L=[];
  for(const b of bs){const id=b[11].id;const ps=unp(b[10]);const cx=ps.reduce((s,p)=>s+p[0],0)/ps.length,cz=ps.reduce((s,p)=>s+p[1],0)/ps.length;
    for(const s of shopsOf(b)){const name=s[2];if(isBrand(name))continue;const sp=shopSpec(name,cx,cz);const sgn=sp&&sp.sign||{};let text=sgn.text||name,sub='';
      if(text.indexOf(' — ')>0){const p=text.split(' — ');text=p[0];sub=p[1]}
      L.push({key:id+'|'+name,text,sub,bg:sgn.bgColour||s[3]||'#1d1d1f',fg:sgn.textColour||s[4]||'#ffffff',style:sgn.style||(/restaurant|cafe|bakery|confectionery/.test(s[5])?'serif':'sans'),lit:sgn.lit!==false,spec:sp})}}
  _signs=L;JN.signs=L.map(s=>s.text);return L}
function signUV(key){const L=collectSigns();const i=L.findIndex(s=>s.key===key);if(i<0||i>=SG_ROWS*SG_TILES)return null;const k=Math.floor(i/SG_ROWS),r=i%SG_ROWS;return{tile:T['jSign'+k],uv:uvR(0,r*40,240,r*40+40),sg:L[i]}}

/* ============================== GEOMETRY HELPERS ============================== */
// facade frame on edge a→c: s along the edge, d outward (sg = sign of the polygon area), y up
function FR(a,c,sg){const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz)||1e-6,ux=dx/L,uz=dz/L;return{a,c,L,ux,uz,nx:sg>0?uz:-uz,nz:sg>0?-ux:ux}}
const P=(f,s,d)=>[f.a[0]+f.ux*s+f.nx*d,f.a[1]+f.uz*s+f.nz*d];
let O,CUT;// current opaque / cut-out builders
function fq(B,f,s0,s1,y0,y1,d,col,tile,uv,gl,dir){if(s1-s0<1e-3||y1-y0<1e-3)return;const a=P(f,s0,d),b=P(f,s1,d),k=dir||1;const u=uv||[s0,s1,y0,y1];B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,f.nx*k,f.nz*k,u[0],u[1],u[2],u[3],col,RECT[tile],gl||0)}
function sq(B,f,s,d0,d1,y0,y1,dir,col,tile,gl){if(Math.abs(d1-d0)<1e-3||y1-y0<1e-3)return;const a=P(f,s,d0),b=P(f,s,d1);B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,f.ux*dir,f.uz*dir,d0,d1,y0,y1,col,RECT[tile],gl||0)}
function hq(B,f,s0,s1,d0,d1,y,down,col,tile,gl){if(s1-s0<1e-3||Math.abs(d1-d0)<1e-3)return;const A=P(f,s0,d0),Bp=P(f,s1,d0),C=P(f,s1,d1),D=P(f,s0,d1);B.hq([A[0],y,A[1]],[Bp[0],y,Bp[1]],[C[0],y,C[1]],[D[0],y,D[1]],[A[0],A[1]],[Bp[0],Bp[1]],[C[0],C[1]],[D[0],D[1]],col,RECT[tile],gl||0,!!down)}
function bx(B,f,s,d,y0,ws,wd,h,col,tile,gl){const p=P(f,s,d);B.box(p[0],y0+h/2,p[1],ws,h,wd,Math.atan2(-f.uz,f.ux),col,RECT[tile],1,gl||0)}
// quad / triangle with explicit 3D points, turned to face `want`
function q3(B,a,b,c,d,ua,ub,uc,ud,col,tile,gl,want){const n=B.nrm(a,b,c);if(n[0]*want[0]+n[1]*want[1]+n[2]*want[2]<0)B.quad(d,c,b,a,ud,uc,ub,ua,col,RECT[tile],gl||0);else B.quad(a,b,c,d,ua,ub,uc,ud,col,RECT[tile],gl||0)}
function t3(B,a,b,c,ua,ub,uc,col,tile,gl,want){const n=B.nrm(a,b,c);if(n[0]*want[0]+n[1]*want[1]+n[2]*want[2]<0)B.tri(a,c,b,ua,uc,ub,col,RECT[tile],gl||0);else B.tri(a,b,c,ua,ub,uc,col,RECT[tile],gl||0)}
const V=(f,s,d,y)=>{const p=P(f,s,d);return[p[0],y,p[1]]};
function wallHoles(B,f,S0,S1,Y0,Y1,d,holes,col,tile){holes=holes.filter(h=>h[1]>S0&&h[0]<S1).sort((a,b)=>a[0]-b[0]);let cur=S0;
  for(const h of holes){const h0=Math.max(h[0],cur),h1=Math.min(h[1],S1);if(h1<=h0)continue;if(h0>cur)fq(B,f,cur,h0,Y0,Y1,d,col,tile);if(h[2]>Y0)fq(B,f,h0,h1,Y0,Math.min(h[2],Y1),d,col,tile);if(h[3]<Y1)fq(B,f,h0,h1,Math.max(h[3],Y0),Y1,d,col,tile);cur=h1}
  if(S1>cur)fq(B,f,cur,S1,Y0,Y1,d,col,tile)}
const ALU=H('#d4d6d6'),DARK=H('#1b1c1e'),MARBLE=H('#eeebe4'),C_SILL=H('#e9e6de');
/* recessed opening (window, balcony door or shop glazing). o: {glass, gl, frame, rev(col), revT, mull, tr(transom y), door:[s0,s1], shut(0..1), shutCol, sill, fw} */
function opening(B,f,s0,s1,y0,y1,dep,o){const rev=o.rev||MARBLE,rt=o.revT||TM.plaster,fc=o.frame||ALU,fw=o.fw||0.06;
  sq(B,f,s0,0,-dep,y0,y1,1,shade(rev,0.86),rt);sq(B,f,s1,0,-dep,y0,y1,-1,shade(rev,0.86),rt);hq(B,f,s0,s1,-dep,0,y0,false,o.sillCol||C_SILL,TM.marble);hq(B,f,s0,s1,-dep,0,y1,true,shade(rev,0.7),rt);
  fq(B,f,s0,s1,y0,y1,-dep,o.glassCol||C1,o.glass||T.jGlass,[0,1,0,1],o.gl||0);
  const d=-dep+0.025;fq(B,f,s0,s0+fw,y0,y1,d,fc,T.white);fq(B,f,s1-fw,s1,y0,y1,d,fc,T.white);fq(B,f,s0,s1,y1-fw,y1,d,fc,T.white);fq(B,f,s0,s1,y0,y0+fw*1.4,d,fc,T.white);
  const n=o.mull||1;for(let i=1;i<n;i++){const s=s0+(s1-s0)*i/n;fq(B,f,s-fw/2,s+fw/2,y0,y1,d,fc,T.white)}
  if(o.tr&&o.tr<y1-0.1)fq(B,f,s0,s1,o.tr-fw/2,o.tr+fw/2,d,fc,T.white);
  if(o.door){const [a,b]=o.door;fq(B,f,a-fw,a+fw*0.5,y0,o.tr||y1,d+0.01,fc,T.white);fq(B,f,b-fw*0.5,b+fw,y0,o.tr||y1,d+0.01,fc,T.white);const m=(a+b)/2;bx(B,f,m-0.12,d+0.05,y0+0.9,0.035,0.05,0.9,H('#c0c4c6'),T.white);bx(B,f,m+0.12,d+0.05,y0+0.9,0.035,0.05,0.9,H('#c0c4c6'),T.white)}
  if(o.shut>0){const hh=(y1-y0)*Math.min(1,o.shut);fq(B,f,s0+fw,s1-fw,y1-hh,y1-fw,d+0.02,o.shutCol||H('#d9d3c3'),TM.shutterM)}
  if(o.sill)bx(B,f,(s0+s1)/2,0.05,y0-0.06,s1-s0+0.14,0.1,0.06,C_SILL,TM.marble)}
/* chain/outline offsets: per vertex intersection of the two neighbouring edges' offset lines (offset d per edge, outward positive) */
function outline(ps,sg,dOf){const n=ps.length,E=[];for(let i=0;i<n;i++)E.push(FR(ps[i],ps[(i+1)%n],sg));const out=[];
  for(let j=0;j<n;j++){const e0=E[(j-1+n)%n],e1=E[j],d0=dOf((j-1+n)%n),d1=dOf(j);const p=ps[j];
    const a0=[p[0]+e0.nx*d0,p[1]+e0.nz*d0],a1=[p[0]+e1.nx*d1,p[1]+e1.nz*d1];const cr=e0.ux*e1.uz-e0.uz*e1.ux;
    if(Math.abs(cr)<0.08||(d0===0&&d1===0)){out.push(Math.abs(d0)>Math.abs(d1)?a0:a1);continue}
    const t=((a1[0]-a0[0])*e1.uz-(a1[1]-a0[1])*e1.ux)/cr;const q=[a0[0]+e0.ux*t,a0[1]+e0.uz*t];const lim=3*Math.max(Math.abs(d0),Math.abs(d1))+0.5;
    out.push(Math.hypot(q[0]-p[0],q[1]-p[1])>lim?(Math.abs(d0)>Math.abs(d1)?a0:a1):q)}
  return out}
function polyRoof(B,ps,y,col,tile){const tris=triangulate([ps]);for(const t of tris){let [a,b,c]=t;const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr>0){const q=b;b=c;c=q}
  B.tri([a[0],y,a[1]],[b[0],y,b[1]],[c[0],y,c[1]],[a[0]/1,a[1]/1],[b[0],b[1]],[c[0],c[1]],col,RECT[tile],0,true)}}

/* ============================== SHOPFRONT RENDERERS ============================== */
const CAT_TINT={food:'#ffe2bf',fast_food:'#ffe2bf',restaurant:'#ffdcb4',cafe:'#ffd9b0',ice_cream:'#fff0c8',bakery:'#ffdcae',confectionery:'#ffe6c8',clothes:'#ffffff',shoe_store:'#fff4e8',mobile_phone:'#e4eeff',bank:'#e6eefa',optician:'#eef4ff',hairdresser:'#fff4ec',jewelry:'#fff8e0'};
function fascia(B,f,s0,s1,y0,y1,bg,key,d){const w=s1-s0;d=d||0.07;bx(B,f,(s0+s1)/2,d,y0,w,0.12,y1-y0,H(bg||'#1d1d1f'),T.white);const su=key&&signUV(key);
  if(su){const h=Math.min(y1-y0-0.12,(w-0.2)/6),sw=h*6,c=(s0+s1)/2,yc=(y0+y1)/2;fq(B,f,c-sw/2,c+sw/2,yc-h/2,yc+h/2,d+0.065,C1,su.tile,su.uv,1);return su}return null}
function awning(B,Cb,f,s0,s1,yTop,proj,drop,col,valCol){const c=H(col),y1=yTop-drop;const A=V(f,s0,0.04,yTop),Bv=V(f,s1,0.04,yTop),C=V(f,s1,proj,y1),D=V(f,s0,proj,y1);const up=[f.nx*0.3,1,f.nz*0.3],dn=[-f.nx*0.3,-1,-f.nz*0.3];
  const L=s1-s0;q3(B,A,Bv,C,D,[0,0],[L,0],[L,proj],[0,proj],c,T.jFabric,0,up);q3(B,A,Bv,C,D,[0,0],[L,0],[L,proj],[0,proj],shade(c,0.6),T.jFabric,0,dn);
  // scalloped valance (cut-out band of jBalus rows 120..182)
  const vh=0.26,v=uvR(0,120,240,182);const nU=Math.max(1,Math.round(L/0.5));Cb.wall(C[0],C[2],D[0],D[2],y1-vh,y1-vh,y1,y1,f.nx,f.nz,0,Math.max(1,L/1.4),v[2],v[3],valCol?H(valCol):c,RECT[T.jBalus],0);
  // side cheeks
  t3(B,A,D,[D[0],yTop,D[2]],[0,0],[proj,0],[proj,0.3],shade(c,0.8),T.jFabric,0,[-f.ux,0,-f.uz]);t3(B,Bv,C,[C[0],yTop,C[2]],[0,0],[proj,0],[proj,0.3],shade(c,0.8),T.jFabric,0,[f.ux,0,f.uz])}
function genericShop(f,s0,s1,gy,gfH,shop,id,cfg){const name=shop?shop[2]:'',kind=shop?shop[5]:'';const key=shop?id+'|'+name:null;const su=key?signUV(key):null;const sp=su&&su.sg.spec;
  const top=gy+3.05,w=s1-s0;const tint=H(CAT_TINT[kind]||'#fff6ea');const fr=sp&&sp.shopfront&&sp.shopfront.frameColour?H(sp.shopfront.frameColour):H(cfg.shopFrame||'#3a3b3d');
  const dpos=sp&&sp.shopfront&&sp.shopfront.door||'center';const dw=Math.min(1.1,w*0.35);const dc=dpos==='left'?s0+0.15+dw/2:dpos==='right'?s1-0.15-dw/2:(s0+s1)/2;
  opening(O,f,s0,s1,gy+0.02,top,0.22,{glass:shop?T[CAT_TILE(kind)]:T.jShop,glassCol:shop?tint:H('#9a948a'),gl:shop?1:0,frame:fr,fw:0.07,mull:Math.max(1,Math.round(w/1.8)),tr:gy+2.5,door:[dc-dw/2,dc+dw/2],rev:H(cfg.gfRev||'#e8e4dc'),revT:TM.marbleW});
  if(!shop){fq(O,f,s0+0.07,s1-0.07,gy+0.1,top-0.07,-0.19,H('#cfc9bc'),TM.shutterM);return}
  fascia(O,f,s0+0.02,s1-0.02,top+0.1,gy+3.95,su?su.sg.bg:shop[3],key);
  const aw=sp&&sp.awning;if(aw&&aw.type&&aw.type!=='none'&&aw.colour)awning(O,CUT,f,s0+0.05,s1-0.05,top+0.02,1.35,0.5,aw.colour);
  SHOPFRONTS.push({a:P(f,s0,0),c:P(f,s1,0),nx:f.nx,nz:f.nz,L:w});placed('lm_shop',(P(f,s0,0)[0]+P(f,s1,0)[0])/2,(P(f,s0,0)[1]+P(f,s1,0)[1])/2,name,'lm-junction')}
/* resolve the ground-floor units of one edge from the map's shop list: [{s0,s1,shop}] */
function units(f,shops,m0,m1){const L=f.L;const U=shops.map(s=>{const w=clamp(s[7]||4,2.4,22);const c=clamp(s[1]*L,m0+w/2,L-m1-w/2);return{c,w,shop:s}}).sort((a,b)=>a.c-b.c);
  for(const u of U){u.s0=u.c-u.w/2;u.s1=u.c+u.w/2}
  for(let i=0;i<U.length-1;i++){const a=U[i],b=U[i+1];if(a.s1>b.s0-0.4){const m=(a.s1+b.s0)/2;a.s1=Math.max(a.s0+1.8,m-0.2);b.s0=Math.min(b.s1-1.8,m+0.2);if(a.s1>b.s0-0.3){b.s0=a.s1+0.3}}}
  return U.filter(u=>u.s1-u.s0>1.2).map(u=>({s0:Math.max(m0,u.s0),s1:Math.min(L-m1,u.s1),shop:u.shop}))}

/* ---------- Mythos Plus (b294 edge 0): salmon plaster, terracotta-ringed semicircular arch with black steel glazing, capsule light box,
   black scalloped awning shared with the neighbour, two glass wind-screen enclosures with rattan chairs, gas heaters. (photos: docs/research/img/shops/mythos_01, _02) */
function mythosFront(f,gy,gfH,cfg){const L=f.L,top=gy+gfH;const SAL=H('#c27a55'),BRK=H('#c96a37'),WBR=H('#ebe6dc');
  const a0=1.55,a1=4.85,r=(a1-a0)/2,cx=(a0+a1)/2,ys=gy+2.62,ring=0.42,R2=r+ring,dep=0.32,N=14;
  // wall: left pier, right piers (white brick pier 5.30-5.78), spandrel above the arch
  fq(O,f,0,a0-ring,gy,top,0,SAL,TM.plasterW);fq(O,f,a1+ring,5.30,gy,top,0,SAL,TM.plasterW);fq(O,f,5.78,L,gy,top,0,SAL,TM.plasterW);
  fq(O,f,5.30,5.78,gy,top,0.04,WBR,TM.brickw);sq(O,f,5.30,0,0.04,gy,top,-1,WBR,TM.brickw);sq(O,f,5.78,0,0.04,gy,top,1,WBR,TM.brickw);fq(O,f,5.30,5.78,gy+gfH-0.5,top,0,WBR,TM.brickw);
  const want=[f.nx,0,f.nz];
  for(let i=0;i<N;i++){const t0=Math.PI-i*Math.PI/N,t1=Math.PI-(i+1)*Math.PI/N;const s0=cx+R2*Math.cos(t0),y0=ys+R2*Math.sin(t0),s1=cx+R2*Math.cos(t1),y1=ys+R2*Math.sin(t1);
    q3(O,V(f,s0,0,y0),V(f,s1,0,y1),V(f,s1,0,top),V(f,s0,0,top),[s0,y0],[s1,y1],[s1,top],[s0,top],SAL,TM.plasterW,0,want);
    // terracotta ring (radiating tiles), proud 3 cm
    const i0=[cx+r*Math.cos(t0),ys+r*Math.sin(t0)],i1=[cx+r*Math.cos(t1),ys+r*Math.sin(t1)],o0=[s0,y0],o1=[s1,y1];
    q3(O,V(f,i0[0],0.03,i0[1]),V(f,i1[0],0.03,i1[1]),V(f,o1[0],0.03,o1[1]),V(f,o0[0],0.03,o0[1]),[i*0.38,0],[(i+1)*0.38,0],[(i+1)*0.38,0.42],[i*0.38,0.42],BRK,TM.brickw,0,want);
    // intrados (soffit) of the arch
    const cm=(t0+t1)/2;q3(O,V(f,i0[0],0.03,i0[1]),V(f,i1[0],0.03,i1[1]),V(f,i1[0],-dep,i1[1]),V(f,i0[0],-dep,i0[1]),[0,0],[0.38,0],[0.38,dep],[0,dep],shade(BRK,0.85),TM.brickw,0,[-Math.cos(cm)*f.ux,-Math.sin(cm),-Math.cos(cm)*f.uz]);
    // fanlight glass
    t3(O,V(f,cx,-dep,ys),V(f,i0[0],-dep,i0[1]),V(f,i1[0],-dep,i1[1]),[0.5,(ys-gy)/(ys+r-gy)],[(i0[0]-a0)/(a1-a0),(i0[1]-gy)/(ys+r-gy)],[(i1[0]-a0)/(a1-a0),(i1[1]-gy)/(ys+r-gy)],C1,T.jGrill,1,want)}
  // brick jambs below the springing line + reveals
  fq(O,f,a0-ring,a0,gy,ys,0.03,BRK,TM.brickw);fq(O,f,a1,a1+ring,gy,ys,0.03,BRK,TM.brickw);sq(O,f,a0-ring,0,0.03,gy,ys,-1,BRK,TM.brickw);sq(O,f,a1+ring,0,0.03,gy,ys,1,BRK,TM.brickw);
  sq(O,f,a0,0.03,-dep,gy,ys,1,shade(BRK,0.85),TM.brickw);sq(O,f,a1,0.03,-dep,gy,ys,-1,shade(BRK,0.85),TM.brickw);
  fq(O,f,a0,a1,gy,ys,-dep,C1,T.jGrill,[0,1,0,(ys-gy)/(ys+r-gy)],1);
  // black steel factory glazing: fixed 2×3 screen left, double door right (a1-1.6..a1), bars continue into the fanlight
  const d=-dep+0.03,BL=H('#141416'),bw=0.055,doorL=a1-1.62;const vbar=(s,yb)=>{const yt=ys+Math.sqrt(Math.max(0,r*r-(s-cx)*(s-cx)));fq(O,f,s-bw/2,s+bw/2,yb,yt,d,BL,T.white)};
  [a0+0.03,a0+(doorL-a0)/2,doorL,doorL+0.81,a1-0.03].forEach(s=>vbar(s,gy));for(const y of[gy+0.05,gy+0.95,gy+1.8,ys])fq(O,f,a0,a1,y-bw/2,y+bw/2,d,BL,T.white);
  for(const fy of[ys+0.85]){const hw=Math.sqrt(r*r-(fy-ys)*(fy-ys));fq(O,f,cx-hw,cx+hw,fy-bw/2,fy+bw/2,d,BL,T.white)}
  bx(O,f,doorL+0.68,d+0.05,gy+0.5,0.035,0.06,1.25,H('#9a9ea2'),T.white);bx(O,f,doorL+0.94,d+0.05,gy+0.5,0.035,0.06,1.25,H('#9a9ea2'),T.white);
  hq(O,f,a0,a1,-dep,0.03,gy+0.02,false,H('#7a4a32'),TM.brick);
  // capsule light box hung in front of the fanlight (1.9 × 0.75 m, centre-right)
  const cs=cx+0.35,cy=gy+2.88,cw=1.9,ch2=0.75,cr=ch2/2,cd=0.1,uv=BR.myth;const U=(s,y)=>[uv[0]+(s-(cs-cw/2))/cw*(uv[1]-uv[0]),uv[2]+(y-(cy-ch2/2))/ch2*(uv[3]-uv[2])];
  const capsule=[];for(let i=0;i<=8;i++){const a=-Math.PI/2+i*Math.PI/8;capsule.push([cs+cw/2-cr+Math.cos(a)*cr,cy+Math.sin(a)*cr])}for(let i=0;i<=8;i++){const a=Math.PI/2+i*Math.PI/8;capsule.push([cs-cw/2+cr+Math.cos(a)*cr,cy+Math.sin(a)*cr])}
  for(let i=0;i<capsule.length;i++){const p=capsule[i],q=capsule[(i+1)%capsule.length];t3(O,V(f,cs,cd,cy),V(f,p[0],cd,p[1]),V(f,q[0],cd,q[1]),U(cs,cy),U(p[0],p[1]),U(q[0],q[1]),C1,T.jBrand,1,want);
    q3(O,V(f,p[0],cd,p[1]),V(f,q[0],cd,q[1]),V(f,q[0],cd-0.12,q[1]),V(f,p[0],cd-0.12,p[1]),[0,0],[0.1,0],[0.1,0.1],[0,0.1],BL,T.white,0,[f.ux*((p[0]+q[0])/2-cs),(p[1]+q[1])/2-cy,f.uz*((p[0]+q[0])/2-cs)])}
  for(const o of[-0.6,0.6])bx(O,f,cs+o,cd-0.06,cy+cr,0.02,0.02,ys+Math.sqrt(Math.max(0,r*r-(cs+o-cx)*(cs+o-cx)))-cy-cr,BL,T.white);
  SHOPFRONTS.push({a:P(f,a0,0),c:P(f,a1,0),nx:f.nx,nz:f.nz,L:a1-a0});placed('lm_shop',P(f,cx,0)[0],P(f,cx,0)[1],'Mythos Plus','lm-junction');
  // small round lamp + electrical boxes on the left pier (photo)
  bx(O,f,0.55,0.04,gy+2.2,0.16,0.08,0.2,H('#e8e6e0'),T.white);bx(O,f,0.85,0.04,gy+2.2,0.16,0.08,0.2,H('#e8e6e0'),T.white);
  JN.mythos={a:P(f,0,0),c:P(f,L,0)}}
/* Mythos terrace + shared awning, laid along b294 edge 0 extended 4.5 m over the neighbour (the two fronts are collinear) */
function mythosTerrace(f,gy){const BL=H('#151515'),AW=11.0,proj=3.0,yT=gy+4.3,yF=gy+3.16;
  awning(O,CUT,f,0.0,AW,yT,proj,yT-yF,'#0a0a0a','#0a0a0a');
  for(const s of[0.25,3.85,7.35,10.75]){bx(O,f,s,proj-0.05,gy,0.06,0.06,yF-gy-0.25,BL,T.white);addBoxC(P(f,s,proj-0.05)[0],P(f,s,proj-0.05)[1],0.06,'p')}
  // fairy lights along the front edge and spiralled round the posts (small glowing beads)
  const BEAD=H('#ffe6a0');for(let i=0;i<=44;i++){const s=i*AW/44;bx(O,f,s,proj+0.02,yF-0.32-0.04*Math.sin(i*1.3),0.04,0.04,0.04,BEAD,T.white,1)}
  for(const s0 of[0.25,3.85,7.35,10.75])for(let k=0;k<18;k++){const a=k*1.2,y=gy+0.4+k*0.14;bx(O,f,s0+Math.cos(a)*0.06,proj-0.05+Math.sin(a)*0.06,y,0.035,0.035,0.035,BEAD,T.white,1)}
  // two glass wind-screen enclosures (black posts, 1.5 m glass — drawn as frames: the glass itself is see-through)
  const encl=[[0.35,3.75],[4.45,7.85]],eh=1.5,ed=2.6;for(const [s0,s1] of encl){
    for(const s of[s0,(s0+s1)/2,s1])bx(O,f,s,ed,gy,0.05,0.05,eh,BL,T.white);for(const dd of[0.9,1.75])for(const s of[s0,s1])bx(O,f,s,dd,gy,0.04,0.04,eh,BL,T.white);
    bx(O,f,(s0+s1)/2,ed,gy+eh-0.04,s1-s0,0.05,0.04,BL,T.white);bx(O,f,(s0+s1)/2,ed,gy,s1-s0,0.06,0.08,BL,T.white);
    for(const s of[s0,s1]){bx(O,f,s,ed/2+0.05,gy+eh-0.04,0.05,ed,0.04,BL,T.white);bx(O,f,s,ed/2+0.05,gy,0.06,ed,0.08,BL,T.white)}
    const a=P(f,s0,ed),b=P(f,s1,ed);addSeg(a[0],a[1],b[0],b[1],'f');for(const s of[s0,s1]){const p=P(f,s,ed),q=P(f,s,0.7);addSeg(p[0],p[1],q[0],q[1],'f')}
    // round navy decal on the glass, both faces
    const dc=(s0+s1)/2;fq(O,f,dc-0.3,dc+0.3,gy+0.55,gy+1.15,ed+0.03,C1,T.jBrand,BR.decal,1);fq(O,f,dc-0.3,dc+0.3,gy+0.55,gy+1.15,ed-0.03,C1,T.jBrand,[BR.decal[1],BR.decal[0],BR.decal[2],BR.decal[3]],1,-1);
    // tables (marble tops) with cream woven bistro armchairs
    for(let i=0;i<2;i++)for(let j=0;j<2;j++){const ts=s0+(s1-s0)*(0.27+i*0.46),td=0.75+j*1.05;const p=P(f,ts,td);O.cyl(p[0],gy,p[1],0.05,0.05,0.72,6,H('#2a2a2a'),RECT[T.white],false);O.cyl(p[0],gy+0.72,p[1],0.32,0.32,0.03,12,H('#efece6'),RECT[TM.marble],true);
      for(const sd of[-1,1]){const cs=ts+sd*0.5;chair(f,cs,td,gy,sd>0?-1:1)}}
    // mushroom gas heater
    const hp=P(f,s0+0.25,ed-0.3);O.cyl(hp[0],gy,hp[1],0.18,0.12,0.08,10,H('#5a5c5e'),RECT[TM.metalL],true);O.cyl(hp[0],gy+0.08,hp[1],0.04,0.04,2.05,6,H('#6e7072'),RECT[TM.metalL],false);O.cyl(hp[0],gy+2.12,hp[1],0.06,0.45,0.16,12,H('#7d8082'),RECT[TM.metalL],true)}
  // A4 menu on the right screen
  fq(O,f,7.3,7.62,gy+0.95,gy+1.38,ed+0.035,H('#f4f1e8'),T.white)}
function chair(f,s,d,gy,face){const C=H('#d8c9a2'),p=P(f,s,d);bx(O,f,s,d,gy+0.42,0.46,0.46,0.06,C,TM.wood);bx(O,f,s+face*0.21,d,gy+0.48,0.05,0.46,0.42,C,TM.wood);
  for(const ds of[-0.19,0.19])bx(O,f,s,d+ds,gy+0.48,0.4,0.04,0.2,C,TM.wood);for(const a of[[-0.19,-0.19],[0.19,-0.19],[-0.19,0.19],[0.19,0.19]])bx(O,f,s+a[0],d+a[1],gy,0.03,0.03,0.42,H('#3a3a38'),T.white)}

/* ---------- PAUL (b434 edge 3): dark-brown painted timber shopfront, stall risers, small-paned upper lights, serif fascia, brass lanterns, blade sign,
   dark awning, bistro terrace with woven chairs and planters (brand-typical; this branch is not photo-verified — see junction.md) */
function paulFront(f,s0,s1,gy,cfg){const TB=H('#2b1d14'),GOLD=H('#b89a5a'),top=gy+3.08,w=s1-s0,nb=3,bw=(w-0.3*(nb+1))/nb;const holes=[];
  for(let i=0;i<nb;i++){const a=s0+0.3+i*(bw+0.3),b=a+bw;const isDoor=i===1;const y0=isDoor?gy+0.02:gy+0.58;holes.push([a,b,y0,top]);
    opening(O,f,a,b,y0,top,0.16,{glass:isDoor?T.jShop:T.jBakery,glassCol:isDoor?H('#ffdcae'):C1,gl:1,frame:TB,fw:0.08,mull:isDoor?2:3,tr:gy+2.42,rev:TB,revT:TM.wood,door:isDoor?[a+0.1,b-0.1]:null,sillCol:TB});
    // small panes in the upper lights
    for(let k=1;k<6;k++){const s=a+(b-a)*k/6;fq(O,f,s-0.02,s+0.02,gy+2.42,top,-0.135,TB,T.white)}
    if(!isDoor){fq(O,f,a,b,gy+0.02,y0,0.0,TB,TM.wood);fq(O,f,a+0.12,b-0.12,gy+0.12,y0-0.1,0.03,shade(TB,1.25),TM.wood);bx(O,f,(a+b)/2,0.05,y0-0.02,b-a+0.06,0.12,0.05,TB,TM.wood)}}
  // timber pilasters + plinth
  for(let i=0;i<=nb;i++){const a=s0+i*(bw+0.3);fq(O,f,a,a+0.3,gy,top+0.1,0.06,TB,TM.wood);sq(O,f,a,0,0.06,gy,top+0.1,-1,TB,TM.wood);sq(O,f,a+0.3,0,0.06,gy,top+0.1,1,TB,TM.wood);bx(O,f,a+0.15,0.07,top-0.05,0.36,0.14,0.16,GOLD,T.white);
    // brass lantern on each pilaster (warm glow)
    if(i>0&&i<nb){bx(O,f,a+0.15,0.22,gy+2.35,0.2,0.2,0.34,H('#ffd79a'),T.white,1);bx(O,f,a+0.15,0.22,gy+2.68,0.26,0.26,0.05,GOLD,T.white);bx(O,f,a+0.15,0.12,gy+2.45,0.04,0.2,0.04,GOLD,T.white)}}
  wallHoles(O,f,s0,s1,gy,top+0.1,0,holes.map(h=>[h[0]-0.001,h[1]+0.001,h[2],h[3]]),TB,TM.wood);
  // fascia: dark timber with gold mouldings and the PAUL lettering
  const fy0=top+0.1,fy1=gy+4.0;bx(O,f,(s0+s1)/2,0.08,fy0,w,0.16,fy1-fy0,TB,TM.wood);bx(O,f,(s0+s1)/2,0.09,fy1-0.02,w+0.1,0.2,0.08,GOLD,T.white);bx(O,f,(s0+s1)/2,0.09,fy0-0.03,w+0.06,0.18,0.05,GOLD,T.white);
  const sh=0.72,sw=sh*5;fq(O,f,(s0+s1)/2-sw/2,(s0+s1)/2+sw/2,(fy0+fy1)/2-sh/2,(fy0+fy1)/2+sh/2,0.165,C1,T.jBrand,BR.paul,1);
  // projecting blade sign at the left end of the fascia (both faces)
  const bp=P(f,s0+0.15,0.6);const bs={a:P(f,s0+0.15,0.25),c:P(f,s0+0.15,0.95)};O.wall(bs.a[0],bs.a[1],bs.c[0],bs.c[1],gy+3.0,gy+3.0,gy+3.7,gy+3.7,f.ux,f.uz,BR.blade[0],BR.blade[1],BR.blade[2],BR.blade[3],C1,RECT[T.jBrand],1);
  O.wall(bs.c[0],bs.c[1],bs.a[0],bs.a[1],gy+3.0,gy+3.0,gy+3.7,gy+3.7,-f.ux,-f.uz,BR.blade[0],BR.blade[1],BR.blade[2],BR.blade[3],C1,RECT[T.jBrand],1);bx(O,f,s0+0.15,0.55,gy+3.72,0.04,0.9,0.04,GOLD,T.white);
  awning(O,CUT,f,s0+0.1,s1-0.1,gy+3.05,1.5,0.45,'#2b1d14','#2b1d14');
  // terrace: bistro tables, woven chairs, planters at both ends
  for(let i=0;i<6;i++){const ts=s0+0.9+i*(w-1.8)/5,td=2.3;const p=P(f,ts,td);O.cyl(p[0],gy,p[1],0.04,0.04,0.72,6,H('#1f1f1f'),RECT[T.white],false);O.cyl(p[0],gy+0.72,p[1],0.3,0.3,0.03,12,H('#2a2421'),RECT[TM.marble],true);chair(f,ts,td-0.55,gy,1);chair(f,ts,td+0.55,gy,-1)}
  for(const s of[s0+0.25,s1-0.25]){bx(O,f,s,1.1,gy,0.5,0.5,0.55,H('#2b2622'),TM.wood);const p=P(f,s,1.1);O.cyl(p[0],gy+0.55,p[1],0.3,0.22,0.55,8,H('#4f6b3a'),RECT[T.hedge],true)}
  SHOPFRONTS.push({a:P(f,s0,0),c:P(f,s1,0),nx:f.nx,nz:f.nz,L:w});placed('lm_shop',P(f,(s0+s1)/2,0)[0],P(f,(s0+s1)/2,0)[1],'PAUL','lm-junction')}

/* ---------- AB Vasilopoulos (b30 edges 2 + 3): full-height supermarket glazing on slim aluminium mullions, automatic sliding entrance,
   white fascia band with the plain-text name (colours: see junction.md) */
function abFront(f,s0,s1,gy,cfg,entrance){const top=gy+3.15,w=s1-s0;const AL=H('#9ea3a7');
  opening(O,f,s0,s1,gy+0.02,top,0.2,{glass:T.jSuper,gl:1,frame:AL,fw:0.07,mull:Math.max(1,Math.round(w/1.55)),tr:gy+2.6,rev:H('#e9e6df'),revT:TM.marbleW,door:entrance!=null?[entrance-1.2,entrance+1.2]:null});
  fq(O,f,s0+0.07,s1-0.07,gy+0.02,gy+0.5,-0.17,H('#d4d0c8'),TM.marbleW);
  bx(O,f,(s0+s1)/2,0.08,top+0.08,w,0.16,gy+4.15-top-0.08,H('#ffffff'),T.white);bx(O,f,(s0+s1)/2,0.09,gy+4.15-0.12,w,0.18,0.12,H('#d7262d'),T.white,1);
  const sh=Math.min(0.85,(w-0.4)/5),sw=sh*5,c=entrance!=null?clamp(entrance,s0+sw/2+0.1,s1-sw/2-0.1):(s0+s1)/2;fq(O,f,c-sw/2,c+sw/2,top+0.12,top+0.12+sh,0.175,C1,T.jBrand,BR.ab,1);
  if(entrance!=null){// sliding-door canopy and mat
    bx(O,f,entrance,0.6,top-0.05,2.8,1.2,0.12,H('#e9e9e6'),T.white);hq(O,f,entrance-1.2,entrance+1.2,0.05,1.2,gy+0.02,false,H('#3a3c3e'),TM.asph)}
  SHOPFRONTS.push({a:P(f,s0,0),c:P(f,s1,0),nx:f.nx,nz:f.nz,L:w});placed('lm_shop',P(f,(s0+s1)/2,0)[0],P(f,(s0+s1)/2,0)[1],'AB Vasilopoulos','lm-junction')}

/* ============================== BUILDING CONFIGURATION ==============================
   lv: storeys incl. ground floor; gfH/fh: storey heights; front: street edges (indices into the OSM footprint ring); wall/trim colours from data/buildings_spec.json;
   rail: alu|iron|glass|masonry|balus; off(e,k,def) may override [wallOffset, balconyOffset, railType] per edge/floor. */
const CFG={};
CFG[IDS.ab]={lv:3,gfH:4.2,fh:3.0,wall:'#e3dccd',gfMat:'marble',front:[1,2,3,4],shopEdges:[2,4],rail:'alu',railCol:'#c9cdd1',dep:1.3,shut:'#d6cfbf',frame:'#d8d8d2',awn:['#3d6a4c','#d8ccb2','#8a8f86',null],solar:3,
  gf(e,f,gy,gfH,id,b){if(e===2){const L=f.L;const shops=shopsOf(b).filter(s=>s[0]===2);const ab=shops.find(s=>/βασιλ/i.test(s[2]));const other=shops.filter(s=>s!==ab);
      // AB occupies the north part of the Agiou Dimitriou front (to the corner); the door is the map's special door
      const sd=SPECIAL&&SPECIAL.super?SPECIAL.super.door:null;let ent=null;if(sd){const t=(sd[0]-f.a[0])*f.ux+(sd[1]-f.a[1])*f.uz;ent=clamp(t,10,L-2)}
      const abS0=Math.max(9.2,ent!=null?ent-9:9.2);abFront(f,abS0,L-0.35,gy,this,ent);const holes=[[abS0,L-0.35,gy+0.02,gy+3.15]];
      if(other.length){genericShop(f,0.6,abS0-0.5,gy,gfH,other[0],id,this);holes.push([0.6,abS0-0.5,gy+0.02,gy+3.05])}
      return holes}
    if(e===3){abFront(f,0.3,f.L-0.3,gy,this,null);return[[0.3,f.L-0.3,gy+0.02,gy+3.15]]}
    return null}};
CFG[IDS.nw]={lv:3,gfH:4.2,fh:3.0,wall:'#f1eee7',gfMat:'marble',front:[0,1],shopEdges:[0,1],rail:'iron',railCol:'#2c2f30',dep:1.3,setTop:1.7,shut:'#cfc8b6',frame:'#e8e6e0',awn:['#b9b2a3','#7a1f1f',null,'#2f5a3a'],solar:0,roof:'hip',roofCol:'#c06f4c',
  off(e,k,d){if(e===0)return k===1?[-2.4,0.15,'balus']:[-2.4,0,'glass'];return d},
  // Kassaveti front (edge 0): the first 4.4 m is Mythos Plus's second room under the shared black awning (mythos_01: yellow-lit glazing with the round
  // emblem, black steel frames, white brick pier); the rest is UÉ, whose dark sign shows at the right edge of that photo
  gf(e,f,gy,gfH,id,b){if(e!==0||f.L<6)return null;const m1=4.4;mythos2(f,0.12,m1,gy);const holes=[[0.12,m1,gy+0.02,gy+3.1]];
    const ue=shopsOf(b).find(s=>s[0]===0);if(ue){genericShop(f,m1+0.5,f.L-0.25,gy,gfH,ue,id,this);holes.push([m1+0.5,f.L-0.25,gy+0.02,gy+3.05])}
    fq(O,f,m1,m1+0.5,gy,gy+gfH,0.04,H('#ebe6dc'),TM.brickw);sq(O,f,m1,0,0.04,gy,gy+gfH,-1,H('#ebe6dc'),TM.brickw);sq(O,f,m1+0.5,0,0.04,gy,gy+gfH,1,H('#ebe6dc'),TM.brickw);
    return holes}};
/* Mythos Plus second room (on b293 edge 0, under the shared awning): black steel glazing, warm yellow interior, round emblem inside the glass */
function mythos2(f,s0,s1,gy){const BL=H('#141416');opening(O,f,s0,s1,gy+0.02,gy+3.1,0.2,{glass:T.jCafe,glassCol:H('#ffd27a'),gl:1,frame:BL,fw:0.06,mull:3,tr:gy+2.55,rev:H('#c27a55'),revT:TM.plasterW});
  const c=(s0+s1)/2+0.3;fq(O,f,c-0.6,c+0.6,gy+1.35,gy+2.55,-0.12,C1,T.jBrand,BR.decal,1);
  fq(O,f,s0-0.1,s1,gy+3.1,gy+4.2,0.015,H('#c27a55'),TM.plasterW);placed('lm_shop',P(f,(s0+s1)/2,0)[0],P(f,(s0+s1)/2,0)[1],'Mythos Plus (2nd room)','lm-junction')}
CFG[IDS.myth]={keepCol:1,keepH:1,lv:2,gfH:4.6,fh:3.4,wall:'#ece4cf',gfMat:'plaster',front:[0],shopEdges:[0],rail:'balus',dep:0,frame:'#141416',shut:null,solar:2,upWall:'#efe8da',
  off(e,k,d){return e===0?[-2.5,0.15,'balus']:d},gf(e,f,gy,gfH){if(e===0){mythosFront(f,gy,gfH,this);mythosTerrace(f,gy);return 'done'}return null}};
CFG[IDS.kost]={lv:3,gfH:3.6,fh:3.1,wall:'#f2ebdd',gfMat:'stone',front:[1],shopEdges:[1],rail:'masonry',dep:1.0,shut:'#7a5a3a',frame:'#4a3a2c',solar:0};// orthophoto: flat dark roof
CFG[IDS.k9]={lv:3,keepLv:1,gfH:4.2,fh:3.0,wall:'#f1eee7',gfMat:'copper',// mythos_01 photo: left neighbour 2-3 storeys, rust/copper cladding on the ground floor
  front:[1],shopEdges:[1],rail:'alu',dep:1.3,shut:'#d8d2c4',frame:'#3b3c3e',awn:['#c9c2b0',null,'#5a6e5a',null],solar:3,tileEave:2.2};// orthophoto: tiled pent strip along the Kassaveti front of the roof
CFG[IDS.paul]={lv:2,gfH:4.4,fh:3.0,wall:'#f2ede1',gfMat:'marble',front:[3,4,5],shopEdges:[3,5],rail:'iron',railCol:'#2a2c2d',dep:1.3,setTop:1.6,shut:'#d6cfbf',frame:'#e6e4de',awn:['#d8ccb2','#3d5f8a',null,'#9a3b2a'],solar:3,
  gf(e,f,gy,gfH,id,b){if(e!==3)return null;const shops=shopsOf(b).filter(s=>s[0]===3);const U=units(f,shops,0.35,0.35);const holes=[];
    for(const u of U){if(/^paul$/i.test(u.shop[2]))paulFront(f,u.s0,u.s1,gy,this);else genericShop(f,u.s0,u.s1,gy,gfH,u.shop,id,this);holes.push([u.s0,u.s1,gy+0.02,/^paul$/i.test(u.shop[2])?gy+4.0:gy+3.05])}
    return holes}};
CFG[IDS.ne]={lv:3,gfH:4.2,fh:3.05,wall:'#ead9b8',gfMat:'stone',front:[1,2,7,8,9],shopEdges:[2,7,9],rail:'iron',railCol:'#2a2c2d',dep:1.4,setTop:1.8,shut:'#6b5a44',frame:'#5a4a3a',shutters:'timber',awn:['#5b1f2a',null,'#d8ccb2',null],solar:2,planters:true};
CFG[IDS.pyr]={lv:4,gfH:4.2,fh:3.0,wall:'#e9e2d0',gfMat:'marble',front:[1,2,3,4,5,6,7,8],shopEdges:[1,8],rail:'iron',railCol:'#2a2c2d',dep:1.3,shut:'#d6cfbf',frame:'#e6e4de',awn:['#d8ccb2','#3d6a4c','#c58a3a',null,'#8a8f86'],solar:0,
  roof:'atrium',roofCol:'#b4683f',tower:{c:[104.6,75.6],r:3.25,h:3.5,dome:'#d6d8d8'}};// orthophoto: one tiled hip roof round a glazed atrium + domed round corner tower

/* ============================== GENERIC POLYKATOIKIA BUILDER ============================== */
function buildBlock(fp){const b=fp.b,id=b[11]&&b[11].id,cfg=CFG[id];if(!cfg)return false;let ps=fp.ps.slice();const n=ps.length;const sg=polyArea(ps)>0?1:-1;
  const seed=(b[5]|0)+7;const front=new Set(cfg.front.filter(e=>e<n));
  // research-arch spec (data/buildings_spec.json) wins for storeys / storey heights / wall colour when it is loaded
  const sp=BSPEC&&BSPEC[id];if(sp){if(sp.levels>=1&&sp.levels<=8&&!cfg.keepLv)cfg.lv=sp.levels;if(sp.gfH>2.8&&sp.gfH<6&&!cfg.keepH)cfg.gfH=sp.gfH;if(sp.floorH>2.6&&sp.floorH<4)cfg.fh=sp.floorH;if(sp.facade&&/^#[0-9a-f]{6}$/i.test(sp.facade.colour||'')&&!cfg.keepCol)cfg.wall=sp.facade.colour;JN.spec=(JN.spec||0)+1}
  const wallC=H(cfg.wall),upC=H(cfg.upWall||cfg.wall);
  let gmin=Infinity,gmax=-Infinity;for(const p of ps){const y=terr(p[0],p[1]);gmin=Math.min(gmin,y);gmax=Math.max(gmax,y)}
  const gy=gmax+0.17,base=gmin-0.6,lv=cfg.lv,gfH=cfg.gfH,fh=cfg.fh;(JN.gy=JN.gy||{})[id]=gmax+0.17;const yAt=k=>k===0?gy:gy+gfH+(k-1)*fh;const top=yAt(lv);
  const cx=ps.reduce((s,p)=>s+p[0],0)/n,cz=ps.reduce((s,p)=>s+p[1],0)/n;const ch=chunkAt(cx,cz);O=ch.o;CUT=ch.cut;const v0=O.size()+CUT.size();
  const E=[];for(let i=0;i<n;i++)E.push(FR(ps[i],ps[(i+1)%n],sg));
  for(let i=0;i<n;i++)if(E[i].L>0.05)addSeg(ps[i][0],ps[i][1],ps[(i+1)%n][0],ps[(i+1)%n][1],'b');
  // per floor offsets
  const off=(e,k)=>{let d=[0,0,null];if(k>0&&front.has(e)){d=[0,cfg.dep||0,cfg.rail];if(cfg.setTop&&k===lv-1)d=[-cfg.setTop,cfg.dep||0,cfg.rail]}if(cfg.off&&front.has(e)&&k>0)d=cfg.off(e,k,d);return d};
  const gfMatT=cfg.gfMat==='copper'?TM.metal:cfg.gfMat==='marble'?TM.marbleW:cfg.gfMat==='stone'?TM.ashlar:TM.plasterW,gfMatC=cfg.gfMat==='copper'?H('#93573a'):cfg.gfMat==='marble'?H('#e6e2d8'):cfg.gfMat==='stone'?H('#d9c7a6'):wallC;
  const shopsBy={};for(const s of shopsOf(b))(shopsBy[s[0]]=shopsBy[s[0]]||[]).push(s);
  // ---------- ground floor ----------
  for(let i=0;i<n;i++){const f=E[i];if(f.L<0.05)continue;const isF=front.has(i);
    // plinth from the lowest terrain to the ground-floor level
    fq(O,f,0,f.L,base,gy,0,isF?H('#d8d3c8'):shade(wallC,0.8),isF?TM.marbleW:TM.plaster);
    if(!isF){fq(O,f,0,f.L,gy,yAt(1),0,shade(wallC,0.93),TM.plaster);continue}
    let holes=cfg.gf?cfg.gf(i,f,gy,gfH,id,b):null;if(holes==='done')continue;
    if(!holes){holes=[];const shops=shopsBy[i]||[];if(shops.length&&(cfg.shopEdges||[]).indexOf(i)>=0){const U=units(f,shops,f.L>4?0.35:0.1,f.L>4?0.35:0.1);for(const u of U){genericShop(f,u.s0,u.s1,gy,gfH,u.shop,id,cfg);holes.push([u.s0,u.s1,gy+0.02,gy+3.05])}}
      else if(f.L>=2.2){// residential entrance (glass door in a marble surround) + small windows
        const c=f.L/2,dw=Math.min(1.6,f.L-0.6);opening(O,f,c-dw/2,c+dw/2,gy+0.02,gy+2.7,0.25,{glass:T.jShop,glassCol:H('#c8c0b0'),gl:0.6,frame:H('#2f3032'),fw:0.07,mull:2,tr:gy+2.2,rev:H('#efece6'),revT:TM.marbleW,door:[c-dw/2+0.05,c+dw/2-0.05]});holes.push([c-dw/2,c+dw/2,gy+0.02,gy+2.7]);
        bx(O,f,c,0.5,gy+2.85,dw+0.9,1.0,0.12,H('#efece6'),TM.marble);
        for(const s of[c-dw/2-1.6,c+dw/2+0.6])if(s>0.3&&s+1.0<f.L-0.3){opening(O,f,s,s+1.0,gy+1.5,gy+2.6,0.18,{frame:ALU,mull:1,gl:hf(seed+i)>0.6?1:0});holes.push([s,s+1.0,gy+1.5,gy+2.6])}}}
    wallHoles(O,f,0,f.L,gy,yAt(1),0,holes,gfMatC,gfMatT)}
  // ---------- upper floors ----------
  let prevOut=ps;
  for(let k=1;k<lv;k++){const y0=yAt(k),y1=yAt(k+1);const W=outline(ps,sg,e=>off(e,k)[0]),Rr=outline(ps,sg,e=>{const o=off(e,k);return Math.max(o[0],o[1])});
    for(let i=0;i<n;i++){const a=W[i],c=W[(i+1)%n];const f=FR(a,c,sg);if(f.L<0.05)continue;const isF=front.has(i);const o=off(i,k);
      if(!isF){fq(O,f,0,f.L,y0,y1,0,shade(upC,0.93),TM.plaster);continue}
      bays(f,y0,y1,k,cfg,seed+i*31+k*7,o[1]-o[0]>0.6,upC)}
    // slabs: ring between the wall outline and the balcony/terrace outline on front edges; railings on the outer line
    const ys=y0;for(let i=0;i<n;i++){if(!front.has(i))continue;const o=off(i,k);if(o[1]-o[0]<0.05)continue;const j=(i+1)%n;
      const a=W[i],c=W[j],ra=Rr[i],rc=Rr[j];const Ap=[a[0],ys,a[1]],Cp=[c[0],ys,c[1]],RA=[ra[0],ys,ra[1]],RC=[rc[0],ys,rc[1]];
      O.hq(Ap,Cp,RC,RA,[a[0],a[1]],[c[0],c[1]],[rc[0],rc[1]],[ra[0],ra[1]],H('#d9d4ca'),RECT[TM.marble],0,false);
      O.hq([a[0],ys-0.2,a[1]],[c[0],ys-0.2,c[1]],[rc[0],ys-0.2,rc[1]],[ra[0],ys-0.2,ra[1]],[0,0],[1,0],[1,1],[0,1],shade(wallC,0.78),RECT[TM.plaster],0,true);
      const fr=FR(ra,rc,sg);if(fr.L>0.05){fq(O,fr,0,fr.L,ys-0.2,ys+0.04,0.0,MARBLE,TM.marble);railing(fr,0,fr.L,ys+0.04,o[2],cfg,-0.06)}
      // returns of the railing / slab ends where the next/previous edge is not a balcony edge
      for(const [p,q,dir] of[[a,ra,-1],[c,rc,1]]){const nb=dir<0?(i-1+n)%n:j;const on=off(nb,k);if(front.has(nb)&&on[1]-on[0]>=0.05)continue;const g=FR(p,q,sg);if(g.L<0.1)continue;
        fq(O,g,0,g.L,ys-0.2,ys+0.04,0,MARBLE,TM.marble,null,0,1);fq(O,g,0,g.L,ys-0.2,ys+0.04,0,MARBLE,TM.marble,null,0,-1);railing(g,0,g.L,ys+0.04,o[2],cfg,0)}}
    // floor/terrace slab where this floor steps back from the one below (roof of the lower floor)
    prevOut=W}
  // ---------- roof ----------
  const R=prevOut;if(cfg.roof==='hip'){hipRoofP(R,top,sg,cfg.roofCol)}else if(cfg.roof==='atrium'){atriumRoof(R,top,sg,cfg);if(cfg.tower)tower(cfg.tower,top,gy,cfg)}else{polyRoof(O,R,top,H('#d6d2ca'),TM.flatroof);
    for(let i=0;i<n;i++){const f=FR(R[i],R[(i+1)%n],sg);if(f.L<0.05)continue;fq(O,f,0,f.L,top,top+0.85,0,front.has(i)?upC:shade(upC,0.93),TM.plaster);fq(O,f,0,f.L,top,top+0.85,-0.2,shade(upC,0.85),TM.plaster,null,0,-1);
      hq(O,f,0,f.L,-0.2,0.04,top+0.85,false,MARBLE,TM.marble);fq(O,f,0,f.L,top+0.85-0.06,top+0.85,0.04,MARBLE,TM.marble)}
    if(cfg.tileEave)for(const i of front){const f=FR(R[i],R[(i+1)%n],sg);if(f.L>2)tileEave(f,top,cfg.tileEave,cfg.roofCol)}
    roofStuff(R,top,cfg,seed)}
  // lower-floor roofs exposed by set-back floors (terraces) are covered by the slab rings above
  const v1=O.size()+CUT.size();JN.tris+=Math.round((v1-v0)/2);JN.built.push(id);return true}
/* upper-floor facade: bays of balcony doors / windows with roller shutters, awnings and a/c units on balconies */
function bays(f,y0,y1,k,cfg,seed,bal,wallC){const L=f.L;if(L<1.3){fq(O,f,0,L,y0,y1,0,wallC,TM.plaster);return}
  const nb=L<2.8?1:Math.max(1,Math.round((L-0.4)/3.3)),bw=L/nb;const holes=[];const fr=H(cfg.frame||'#e6e4de'),sc=cfg.shut?H(cfg.shut):null;
  for(let i=0;i<nb;i++){const c=(i+0.5)*bw,h=hf(seed*13+i*7+k*101);let w,ya,yb,door;
    if(bal){door=h<0.72||bw<2;w=door?Math.min(bw<2?0.9:1.4,bw-0.5):Math.min(1.6,bw-0.6);ya=door?y0:y0+0.95;yb=y0+2.4}
    else{door=false;w=Math.min(1.4,bw-0.7);ya=y0+0.95;yb=y0+2.35}if(w<0.5)continue;
    const lit=hf(seed+i*3+k*17)<0.32?1:0;const shut=sc?[0,0,0.15,0.35,0.6,1.0][Math.floor(hf(seed*7+i+k*5)*6)]:0;
    opening(O,f,c-w/2,c+w/2,ya,yb,0.18,{frame:fr,mull:w>1.1?2:1,gl:lit,shut,shutCol:sc,sill:!door,tr:door&&w>1.1?null:null});holes.push([c-w/2,c+w/2,ya,yb]);
    if(cfg.shutters==='timber'){for(const sd of[-1,1]){const ss=c+sd*(w/2+w/4+0.03);if(ss-w/4<0.05||ss+w/4>L-0.05)continue;fq(O,f,ss-w/4,ss+w/4,ya,yb,0.04,sc,TM.wood);sq(O,f,ss+sd*w/4,0,0.04,ya,yb,sd,shade(sc,0.8),TM.wood)}}
    if(bal){// fabric awning (tenta) hanging from the slab above
      const ac=cfg.awn&&cfg.awn[Math.floor(hf(seed+i*11+k)*cfg.awn.length)];if(ac&&hf(seed*3+i*5+k*9)<0.55)awning(O,CUT,f,c-bw/2+0.15,c+bw/2-0.15,y1-0.22,(cfg.dep||1.3)+0.1,1.0,ac);
      if(hf(seed+i*19+k*3)<0.4){const s=c+(hf(seed+i)<0.5?-1:1)*(w/2+0.55);if(s>0.5&&s<L-0.5){bx(O,f,s,0.35,y0,0.8,0.3,0.55,H('#ecebe7'),T.white);fq(O,f,s-0.3,s+0.2,y0+0.08,y0+0.48,0.505,H('#6a6c6e'),T.white)}}
      if(cfg.planters&&hf(seed+i*23+k)<0.6){const s=c+w/2+0.3;if(s<L-0.3){const p=P(f,s,(cfg.dep||1.3)-0.35);O.cyl(p[0],y0,p[1],0.22,0.18,0.42,8,H('#a0522d'),RECT[T.white],true);O.cyl(p[0],y0+0.42,p[1],0.32,0.1,0.6,7,H('#4d6b34'),RECT[T.hedge],true)}}}}
  wallHoles(O,f,0,L,y0,y1,0,holes,wallC,TM.plaster)}
function railing(f,s0,s1,y,type,cfg,d){const L=s1-s0;if(L<0.05)return;
  if(type==='masonry'){fq(O,f,s0,s1,y,y+0.95,d,H(cfg.wall),TM.plaster);fq(O,f,s0,s1,y,y+0.95,d-0.15,H(cfg.wall),TM.plaster,null,0,-1);hq(O,f,s0,s1,d-0.15,d+0.02,y+0.95,false,MARBLE,TM.marble);return}
  if(type==='glass'){fq(CUT,f,s0,s1,y+0.08,y+1.0,d,H('#bfd0d6'),T.glassR,[0,L,0,1]);bx(O,f,(s0+s1)/2,d,y+1.0,L,0.06,0.05,H('#b8bcbf'),T.white);return}
  if(type==='balus'){const bh=0.68;bx(O,f,(s0+s1)/2,d-0.02,y,L,0.24,0.12,MARBLE,TM.marble);const v=uvR(0,0,240,120);fq(CUT,f,s0,s1,y+0.12,y+0.12+bh,d-0.02,C1,T.jBalus,[0,L/0.6,v[2],v[3]]);
    bx(O,f,(s0+s1)/2,d-0.02,y+0.12+bh,L+0.04,0.28,0.13,MARBLE,TM.marble);for(let s=s0;s<=s1+0.01;s+=Math.max(1.2,L/Math.max(1,Math.round(L/2.4))))bx(O,f,clamp(s,s0+0.13,s1-0.13),d-0.02,y,0.26,0.26,0.12+bh,MARBLE,TM.marble);return}
  const col=type==='alu'?H(cfg.railCol||'#c9cdd1'):H(cfg.railCol||'#2a2c2d');fq(CUT,f,s0,s1,y,y+1.0,d,col,type==='alu'?T.jRail:T.rail,[0,L/(type==='alu'?1.0:1.2),0,1]);bx(O,f,(s0+s1)/2,d,y+1.0,L,0.06,0.05,col,T.white)}
function hipRoofP(ps,yb,sg,rc){// pitched (hip) roof on the minimum-area rectangle of the outline: Kifisia red tiles, white eaves
  let best=null;for(let i=0;i<ps.length;i++){const a=ps[i],c=ps[(i+1)%ps.length];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L<0.5)continue;const ux=(c[0]-a[0])/L,uz=(c[1]-a[1])/L;let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;
    for(const p of ps){const u=(p[0]-a[0])*ux+(p[1]-a[1])*uz,v=-(p[0]-a[0])*uz+(p[1]-a[1])*ux;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v)}const A=(u1-u0)*(v1-v0);if(!best||A<best.A)best={A,a,ux,uz,u0,u1,v0,v1}}
  const {a,ux,uz,u0,u1,v0,v1}=best;const cu=(u0+u1)/2,cv=(v0+v1)/2;const cxw=a[0]+ux*cu-uz*cv,czw=a[1]+uz*cu+ux*cv;let L=u1-u0,W=v1-v0,ang=Math.atan2(uz,ux);if(W>L){const t=L;L=W;W=t;ang+=Math.PI/2}
  hipRoof(O,[cxw,czw,L,W,ang],yb,'villa',2,rc?{roofCol:rc}:undefined);for(let i=0;i<ps.length;i++){const f=FR(ps[i],ps[(i+1)%ps.length],sg);if(f.L>0.05)fq(O,f,0,f.L,yb-0.01,yb+0.02,0,MARBLE,TM.marble)}}
function roofStuff(R,top,cfg,seed){let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9;for(const p of R){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}
  let placedN=0;for(let k=0;k<30&&placedN<(cfg.solar||0);k++){const x=lerp(minx+1.5,maxx-1.5,hf(seed*5+k*7)),z=lerp(minz+1.5,maxz-1.5,hf(seed*11+k*13));if(!pip(R,x,z))continue;placedN++;
    // solar water heater: tilted collector facing south + horizontal white tank on a frame
    O.hq([x-1.0,top+0.35,z-0.6],[x+1.0,top+0.35,z-0.6],[x+1.0,top+1.25,z-1.5],[x-1.0,top+1.25,z-1.5],[0,0],[1,0],[1,1],[0,1],C1,RECT[T.solar],0,false);
    O.box(x,top+1.45,z-1.65,1.9,0.55,0.55,0,H('#efefec'),RECT[T.white]);O.box(x,top+0.6,z-1.4,1.6,1.2,0.06,0,H('#8a8c8e'),RECT[TM.metalL])}
  // stair bulkhead with door + TV antenna
  for(let k=0;k<20;k++){const x=lerp(minx+2,maxx-2,hf(seed*3+k)),z=lerp(minz+2,maxz-2,hf(seed*17+k));if(!pip(R,x,z)||!pip(R,x+1.3,z)||!pip(R,x-1.3,z)||!pip(R,x,z+1.3)||!pip(R,x,z-1.3))continue;
    O.box(x,top+1.25,z,2.4,2.5,2.4,0,H(cfg.upWall||cfg.wall),RECT[TM.plaster]);O.box(x,top+2.55,z,2.6,0.12,2.6,0,MARBLE,RECT[TM.marble]);O.cyl(x+0.9,top+2.6,z+0.9,0.025,0.025,2.4,4,H('#9a9ea2'),RECT[T.white],false);
    for(let j=0;j<3;j++)O.box(x+0.9,top+4.2+j*0.3,z+0.9,1.2-j*0.25,0.03,0.03,0.4,H('#9a9ea2'),RECT[T.white]);break}}

/* pent strip of Kifisia red tiles over the parapet of one roof edge (seen on the orthophoto along Kassaveti 9) */
function tileEave(f,top,dep,rc){const col=H(rc||'#b85a3a'),y0=top+0.55,y1=top+0.55+dep*0.45;
  q3(O,V(f,0,0.45,y0),V(f,f.L,0.45,y0),V(f,f.L,-dep,y1),V(f,0,-dep,y1),[0,0],[f.L,0],[f.L,dep],[0,dep],col,TM.tiles,0,[f.nx,1,f.nz]);
  fq(O,f,0,f.L,y0-0.12,y0,0.45,MARBLE,TM.marble);hq(O,f,0,f.L,0,0.45,y0-0.12,true,shade(MARBLE,0.8),TM.marble);
  for(const s of[0,f.L])t3(O,V(f,s,0.45,y0),V(f,s,-dep,y1),V(f,s,-dep,y0),[0,0],[dep,0.5],[dep,0],shade(H('#efe8da'),0.9),TM.plaster,0,[f.ux*(s?1:-1),0,f.uz*(s?1:-1)])}
/* one terracotta hip roof running round a central glazed atrium (Pyrgos Kifisias, orthophoto): eaves → ridge ring → short inner slope → glass lantern */
function atriumRoof(R,top,sg,cfg){let P2=R.filter((p,i)=>{const n=R.length,a=R[(i-1+n)%n],c=R[(i+1)%n];return Math.hypot(p[0]-a[0],p[1]-a[1])>2.2||Math.hypot(c[0]-p[0],c[1]-p[1])>2.2});
  const s2=polyArea(P2)>0?1:-1,n=P2.length,tp=Math.tan(28*Math.PI/180),col=H(cfg.roofCol||'#b4683f'),UP=[0,1,0];
  const ev=0.55,rin=5.4,iin=6.6,yE=top-0.06-ev*tp,yR=top+rin*tp,yI=yR-(iin-rin)*tp;
  const Eo=outline(P2,s2,()=>ev),Er=outline(P2,s2,()=>-rin),Ei=outline(P2,s2,()=>-iin);const Y=(p,y)=>[p[0],y,p[1]];
  // flat lid inside the walls under the roof (keeps the inside closed when seen through the atrium glass)
  polyRoof(O,R,top-0.02,H('#8f8a82'),TM.flatroof);
  for(let i=0;i<n;i++){const j=(i+1)%n;const lo=Math.hypot(Eo[j][0]-Eo[i][0],Eo[j][1]-Eo[i][1]),lr=Math.hypot(Er[j][0]-Er[i][0],Er[j][1]-Er[i][1]),sl=(rin+ev)/Math.cos(28*Math.PI/180);
    q3(O,Y(Eo[i],yE),Y(Eo[j],yE),Y(Er[j],yR),Y(Er[i],yR),[0,0],[lo,0],[(lo+lr)/2,sl],[(lo-lr)/2,sl],col,TM.tiles,0,UP);
    const li=Math.hypot(Ei[j][0]-Ei[i][0],Ei[j][1]-Ei[i][1]),s3=(iin-rin)/Math.cos(28*Math.PI/180);
    q3(O,Y(Er[i],yR),Y(Er[j],yR),Y(Ei[j],yI),Y(Ei[i],yI),[0,0],[lr,0],[(lr+li)/2,s3],[(lr-li)/2,s3],shade(col,0.93),TM.tiles,0,UP);
    // white eaves fascia + soffit
    const g=FR(Eo[i],Eo[j],s2);if(g.L>0.05){fq(O,g,0,g.L,yE-0.22,yE+0.02,0,MARBLE,TM.marble)}
    // ridge cap
    const rg=FR(Er[i],Er[j],s2);if(rg.L>0.05)bx(O,rg,rg.L/2,0,yR-0.05,rg.L,0.24,0.14,shade(col,0.85),TM.tiles)}
  // soffit: one ring between the wall outline and the eaves line
  for(let i=0;i<n;i++){const j=(i+1)%n;const a=outline(P2,s2,()=>-0.05);q3(O,Y(a[i],yE-0.2),Y(a[j],yE-0.2),Y(Eo[j],yE-0.2),Y(Eo[i],yE-0.2),[0,0],[1,0],[1,1],[0,1],shade(MARBLE,0.75),TM.plaster,0,[0,-1,0])}
  // atrium lantern: low glass pyramid with a dark metal frame
  const c=[Ei.reduce((s,p)=>s+p[0],0)/n,Ei.reduce((s,p)=>s+p[1],0)/n],yT=yI+1.1,GL=H('#9fb3bd'),FRM=H('#3a3d40');
  for(let i=0;i<n;i++){const j=(i+1)%n;t3(O,Y(Ei[i],yI+0.15),Y(Ei[j],yI+0.15),[c[0],yT,c[1]],[0,0],[1,0],[0.5,1],GL,T.glassR,0,UP);
    const g=FR(Ei[i],Ei[j],s2);if(g.L>0.05){fq(O,g,0,g.L,yI-0.1,yI+0.15,0,FRM,TM.metalL);fq(O,g,0,g.L,yI-0.1,yI+0.15,0,FRM,TM.metalL,null,0,-1)}
  }
  addInfo('atriumRoof',n)}
/* round corner tower rising above the eaves, light-grey dome (Pyrgos Kifisias, orthophoto: Ø 6.5 m, 3.5 m above the eaves) */
function tower(t,top,gy,cfg){const [cx,cz]=t.c,r=t.r,y0=top-0.3,y1=top+t.h,wall=H(cfg.wall),N=20;
  O.cyl(cx,y0,cz,r,r,y1-y0,N,wall,RECT[TM.plaster],false,0,6);
  O.cyl(cx,top-0.25,cz,r+0.12,r+0.12,0.28,N,MARBLE,RECT[TM.marble],false);// string course at the eaves
  O.cyl(cx,y1-0.05,cz,r+0.28,r+0.28,0.32,N,MARBLE,RECT[TM.marble],true);// crowning cornice
  for(let k=0;k<8;k++){const a=(k+0.5)/8*TAU,ca=Math.cos(a),sa=Math.sin(a),ang=Math.atan2(-ca,-sa);const x=cx+ca*(r+0.01),z=cz+sa*(r+0.01),yw=top+0.55;
    O.box(x,yw+0.85,z,1.0,1.7,0.08,ang,H('#2a2d30'),RECT[T.glassR],1,hf(k*7+3)<0.4?1:0);
    O.box(cx+ca*(r+0.06),yw+1.75,cz+sa*(r+0.06),1.2,0.14,0.14,ang,MARBLE,RECT[TM.marble]);O.box(cx+ca*(r+0.06),yw-0.06,cz+sa*(r+0.06),1.2,0.1,0.16,ang,MARBLE,RECT[TM.marble])}
  // dome: 6 stacked frustums approximating a hemisphere (light grey metal / render), lantern finial
  const R0=r+0.05,dc=H(t.dome||'#d6d8d8'),yb=y1+0.27,K=6;
  for(let i=0;i<K;i++){const p0=i/K*Math.PI/2,p1=(i+1)/K*Math.PI/2;const ra=R0*Math.cos(p0),rb=Math.max(0.12,R0*Math.cos(p1)),ya=yb+R0*0.82*Math.sin(p0),yb2=yb+R0*0.82*Math.sin(p1);
    O.cyl(cx,ya,cz,ra,rb,yb2-ya,N,shade(dc,0.9+0.1*i/K),RECT[TM.metalL],i===K-1)}
  const yt=yb+R0*0.82;O.cyl(cx,yt-0.05,cz,0.22,0.18,0.55,8,MARBLE,RECT[TM.marble],true);O.cyl(cx,yt+0.5,cz,0.04,0.02,0.8,4,H('#7a7d80'),RECT[TM.metalL],true);
  addInfo('tower',1)}
const addInfo=(k,v)=>{(JN.parts=JN.parts||{})[k]=v};

/* brass name plates of the offices upstairs (MAP.pois bay 'plate': doctors, architects, post office) beside their street door */
function plates(bs){if(!Array.isArray(MAP.pois))return;const idx=new Map();bs.forEach(fp=>idx.set(MAP.buildings.indexOf(fp.b),fp));
  for(const p of MAP.pois){if(p.bay!=='plate'||p.fx==null||!idx.has(p.b))continue;const gy=JN.gy&&JN.gy[idx.get(p.b).b[11].id];if(gy==null)continue;const ch=chunkAt(p.fx,p.fz);
    const tx=-p.nz,tz=p.nx,x=p.fx+p.nx*0.03,z=p.fz+p.nz*0.03;ch.o.box(x,gy+1.55,z,0.32,0.24,0.025,Math.atan2(-tz,tx),H('#b8913a'),RECT[TM.metalL],1,0);
    placed('lm_plate',x,z,p.name,'lm-junction')}}
/* ============================== REGISTER ============================== */
LM.register({id:'junction',at:AT,build(ctx){const t0=performance.now();collectSigns();
  for(const fp of ctx.footprints){try{if(!buildBlock(fp))JN.warn.push('no config for '+(fp.b[11]&&fp.b[11].id))}catch(e){console.error('lm-junction: building',fp.b[11]&&fp.b[11].id,e);JN.warn.push(String(e))}}
  try{plates(ctx.footprints)}catch(e){JN.warn.push('plates '+e)}
  JN.ms=Math.round(performance.now()-t0)}});
})();
