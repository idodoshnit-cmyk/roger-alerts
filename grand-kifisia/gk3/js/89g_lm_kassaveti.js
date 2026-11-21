/* 89g_lm_kassaveti.js — the Kassaveti shop block, hand-modelled (owner: bot lm-kassaveti).
   West Kassaveti between Platanos / Kifisias Ave and the spawn junction, both sides, excluding the junction corner buildings (lm-junction:
   AB b30, Kassaveti 9 b295, Mythos b294, b293 …) and the Kassaveti 19 courtyard (lm-starbucks / lm-ralphlauren).
   North: Kassaveti 1 (b291, neoclassical corner with Kifisias), Kassaveti 3 (b298, Wagamama / Magnifique), Kassaveti 5 (b297, Varsos),
          Kassaveti 7-9 (b296, Holland & Barrett / Nova / Ancho).
   South: Kassaveti 4 (b14, MrPhone / Zenith / The sweet spot / Coffee Island corner), b289 (Bibi / Chantrokosmos / Triumph / L'Occitane),
          Kassaveti 6 (b288, pharmacy / Pischos optics / Dust Cream), b286 (Pischos / Vodafone / pharmacy), Drosini 11 (b264, Leonidas).
   Every building keeps its real OSM footprint (1 unit = 1 m). Every shopfront is laid out by hand in the real street order, at the position of its
   OSM-surveyed node / verified address (docs/research/PLACEMENT_AUDIT.md §7), with the real name as a plain-text sign (no logos).
   What is photo-based and what is inferred: docs/research/lm/kassaveti.md.
   Side effect (documented): the MAP.pois records of the shops of these buildings are moved onto the shopfront this file draws (fx/fz/door/e/t/w),
   so the walk-in doors of 35_interiors.js (built after buildBuildings) open exactly at the drawn door.
   Public: window.KV (debug: built buildings, units, warnings, triangle count). Nothing else is exported. */
(function(){
'use strict';
if(typeof LM==='undefined'||typeof defTile!=='function'||typeof GB==='undefined')return;
const KV=window.KV={built:[],warn:[],units:[],patched:[],tris:0,ms:0,version:2};
const H=hexc;

/* ============================== MATERIAL TILES ============================== */
function tile(name,fn,o){try{if(T[name]===undefined)defTile(name,fn,o)}catch(e){KV.warn.push('tile '+name+': '+e.message)}}
const TT=(n,fb)=>T[n]!==undefined?T[n]:(fb!==undefined?fb:T.white);
const TMt=(n,fb)=>(typeof TM!=='undefined'&&TM[n]!==undefined)?TM[n]:(T[fb||n]!==undefined?T[fb||n]:T.plaster);
const FAM_SERIF='Georgia,"Times New Roman",serif',FAM_SANS='"Helvetica Neue",Helvetica,Arial,sans-serif',FAM_DIDOT='Didot,"Bodoni 72","Playfair Display",Georgia,serif';
function fitFont(g,txt,w,h,fam,wt){let fs=Math.max(5,Math.floor(h));g.font=wt+' '+fs+'px '+fam;while(fs>4&&g.measureText(txt).width>w){fs-=1;g.font=wt+' '+fs+'px '+fam}return fs}
function spots(g,S,n,y,r,a){for(let i=0;i<n;i++){const x=S*(i+0.5)/n;const l=g.createRadialGradient(x,y,1,x,y+r*0.4,r);l.addColorStop(0,'rgba(255,246,222,'+a+')');l.addColorStop(1,'rgba(255,246,222,0)');g.fillStyle=l;g.fillRect(x-r,y-r,2*r,2*r)}}
let _r=1;const R01=()=>{_r=(_r*16807)%2147483647;return _r/2147483647};
// boutique: racks of clothes, folded shelves, a mannequin, spotlights, light oak floor
tile('kvShopC',(g,S,m)=>{_r=11;g.fillStyle='#efe9e0';g.fillRect(0,0,S,S);const fl=g.createLinearGradient(0,S*0.74,0,S);fl.addColorStop(0,'#c9b394');fl.addColorStop(1,'#9c8466');g.fillStyle=fl;g.fillRect(0,S*0.74,S,S*0.26);
  g.fillStyle='#d9d1c4';g.fillRect(0,S*0.06,S,4);g.fillStyle='#6b6258';g.fillRect(10,S*0.3,S*0.55,3);
  const cols=['#1d1d22','#f3efe6','#8a2a2e','#c8b28a','#2f4a6b','#d9c2b8','#5a6b4a','#e8e2d0','#a35a3a','#3b3b44'];
  for(let i=0;i<15;i++){const x=14+i*8.6,c=cols[(i*7)%cols.length];g.fillStyle=c;const hh=58+((i*13)%4)*9;g.beginPath();g.moveTo(x,S*0.3+3);g.lineTo(x+7,S*0.3+3);g.lineTo(x+8.5,S*0.3+hh);g.lineTo(x-1.5,S*0.3+hh);g.fill();g.fillStyle='rgba(0,0,0,0.18)';g.fillRect(x+6,S*0.3+3,1.5,hh-3)}
  g.fillStyle='#e2dbcf';g.fillRect(S*0.68,S*0.16,S*0.29,S*0.58);for(let r=0;r<4;r++){g.fillStyle='#b8ab97';g.fillRect(S*0.68,S*0.26+r*S*0.12,S*0.29,2);for(let i=0;i<5;i++){g.fillStyle=cols[(i*3+r*5)%cols.length];g.fillRect(S*0.69+i*13,S*0.26+r*S*0.12-9,11,9)}}
  g.fillStyle='#e9e5dd';g.beginPath();g.ellipse(S*0.6,S*0.38,6,7,0,0,TAU);g.fill();g.fillRect(S*0.6-10,S*0.42,20,34);g.fillStyle='#2a2a30';g.beginPath();g.moveTo(S*0.6-11,S*0.44);g.lineTo(S*0.6+11,S*0.44);g.lineTo(S*0.6+16,S*0.7);g.lineTo(S*0.6-16,S*0.7);g.fill();g.fillStyle='#9a9590';g.fillRect(S*0.6-1,S*0.7,2,S*0.04);
  spots(g,S,6,10,34,0.95);m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.5,glassDark:0.1,spec:0.25,shin:90,glowK:1.6});
// café / patisserie / grill: warm wood, menu boards, glass counter with pastries, pendant lamps
tile('kvShopF',(g,S,m)=>{_r=23;const bg=g.createLinearGradient(0,0,0,S);bg.addColorStop(0,'#6a4a32');bg.addColorStop(1,'#3e2a1c');g.fillStyle=bg;g.fillRect(0,0,S,S);
  for(let i=0;i<3;i++){g.fillStyle='#1e1a17';g.fillRect(16+i*76,S*0.14,62,40);g.fillStyle='rgba(245,240,225,0.85)';for(let k=0;k<5;k++)g.fillRect(22+i*76,S*0.14+7+k*6.6,30+((i+k)*7)%22,2)}
  g.fillStyle='#e2d3b8';g.fillRect(0,S*0.52,S,S*0.04);g.fillStyle='rgba(255,250,235,0.55)';g.fillRect(0,S*0.56,S,S*0.16);
  const pc=['#c98a3d','#e9cf9a','#7a3b22','#f2e6cf','#d65a6a','#b8742c','#f3c768'];for(let r=0;r<2;r++)for(let i=0;i<20;i++){g.fillStyle=pc[(i*3+r)%pc.length];g.beginPath();g.ellipse(8+i*11.8,S*0.61+r*S*0.075,4.6,3.2,0,0,TAU);g.fill()}
  g.fillStyle='#2c1e14';g.fillRect(0,S*0.72,S,S*0.28);g.fillStyle='#4a3424';g.fillRect(0,S*0.72,S,3);
  for(let i=0;i<5;i++){const x=S*(0.1+i*0.2);g.fillStyle='#1a1410';g.fillRect(x-0.5,0,1,S*0.26);g.fillStyle='#f0c070';g.beginPath();g.arc(x,S*0.27,5,Math.PI,0);g.fill();const l=g.createRadialGradient(x,S*0.3,1,x,S*0.34,40);l.addColorStop(0,'rgba(255,214,150,0.85)');l.addColorStop(1,'rgba(255,214,150,0)');g.fillStyle=l;g.fillRect(x-40,S*0.26,80,80)}
  m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.5,glassDark:0.08,spec:0.2,shin:80,glowK:1.7});
// tech / optics / bank / services: white display walls with lit shelves of small objects, white counter, bright
tile('kvShopT',(g,S,m)=>{_r=37;g.fillStyle='#f4f4f2';g.fillRect(0,0,S,S);g.fillStyle='#d4d6d8';g.fillRect(0,S*0.76,S,S*0.24);g.fillStyle='rgba(0,0,0,0.06)';for(let i=0;i<8;i++)g.fillRect(i*30,S*0.76,1,S*0.24);
  for(let p=0;p<3;p++){const x0=10+p*78;g.fillStyle='#e6e8ea';g.fillRect(x0,S*0.12,66,S*0.56);for(let r=0;r<5;r++){g.fillStyle='rgba(255,255,255,0.9)';g.fillRect(x0,S*0.16+r*S*0.105,66,2);for(let i=0;i<7;i++){g.fillStyle=['#202226','#3a3d44','#c9ccd1','#b88a4a','#5a7fa8'][(i+r+p)%5];g.fillRect(x0+4+i*9,S*0.16+r*S*0.105-11,6,11)}}}
  g.fillStyle='#fbfbfa';g.fillRect(S*0.3,S*0.64,S*0.4,S*0.13);g.fillStyle='#c9ccd0';g.fillRect(S*0.3,S*0.64,S*0.4,2);spots(g,S,6,6,30,1);m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.5,glassDark:0.1,spec:0.3,shin:100,glowK:1.6});
// beauty / cosmetics / pharmacy: white gondolas packed with small coloured bottles and boxes
tile('kvShopB',(g,S,m)=>{_r=53;g.fillStyle='#f7f5f2';g.fillRect(0,0,S,S);g.fillStyle='#e3ddd5';g.fillRect(0,S*0.78,S,S*0.22);
  for(let r=0;r<7;r++){g.fillStyle='#ffffff';g.fillRect(0,S*0.12+r*S*0.09,S,2.5);for(let i=0;i<34;i++){const c=['#e8b4b8','#ffffff','#2b2b2b','#c9a46a','#9cc3d5','#d8e4c8','#b03a48','#f2e1c1','#6a4c93'][((i*5+r*3)+((i*i)%7))%9];const hh=6+((i*7+r)%4)*1.6;g.fillStyle=c;g.fillRect(3+i*7,S*0.12+r*S*0.09-hh,5,hh)}}
  spots(g,S,7,6,26,1);m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:0.5,glassDark:0.1,spec:0.3,shin:100,glowK:1.6});
// flat window glass with curtains and a ceiling lamp hint
tile('kvGlass',(g,S,m)=>{const gr=g.createLinearGradient(0,0,0,S);gr.addColorStop(0,'#8f887e');gr.addColorStop(0.55,'#6a6258');gr.addColorStop(1,'#48423b');g.fillStyle=gr;g.fillRect(0,0,S,S);
  g.fillStyle='rgba(238,228,206,0.78)';g.fillRect(0,0,S*0.18,S);g.fillRect(S*0.82,0,S*0.18,S);g.fillStyle='rgba(110,96,80,0.3)';for(let i=0;i<5;i++){g.fillRect(S*0.035*i+3,0,2,S);g.fillRect(S*0.82+S*0.035*i+3,0,2,S)}
  const l=g.createRadialGradient(S*0.5,S*0.1,2,S*0.5,S*0.2,S*0.5);l.addColorStop(0,'rgba(255,232,186,0.85)');l.addColorStop(1,'rgba(255,232,186,0)');g.fillStyle=l;g.fillRect(0,0,S,S);
  g.fillStyle='rgba(255,255,255,0.10)';g.beginPath();g.moveTo(0,S*0.15);g.lineTo(S*0.4,0);g.lineTo(S*0.55,0);g.lineTo(0,S*0.32);g.fill();m.fillStyle='#fff';m.fillRect(0,0,S,S)},{glass:1,glassDark:0.55,spec:0.3,shin:110,glowK:1.8});
// awning canvas (tint carrier)
tile('kvFabric',(g,S)=>{g.fillStyle='#e8e8e8';g.fillRect(0,0,S,S);for(let i=0;i<240;i+=3){g.fillStyle=i%6?'rgba(0,0,0,0.035)':'rgba(255,255,255,0.05)';g.fillRect(0,i,S,1.5);g.fillRect(i,0,1.5,S)}g.fillStyle='rgba(0,0,0,0.07)';g.fillRect(0,0,S,3)},{spec:0.03,shin:10});
// cut-outs: aluminium balcony rail, wrought-iron neoclassical rail, white balusters (top half) + awning valance (bottom)
tile('kvRail',(g,S)=>{g.clearRect(0,0,S,S);g.fillStyle='#f4f4f4';g.fillRect(0,0,S,16);g.fillRect(0,S-14,S,14);g.fillRect(0,S*0.6,S,6);for(let i=0;i<8;i++)g.fillRect(i*30+12,0,7,S)},{cut:true,spec:0.25,shin:60});
tile('kvIron',(g,S)=>{g.clearRect(0,0,S,S);g.strokeStyle='#ffffff';g.fillStyle='#ffffff';g.fillRect(0,0,S,12);g.fillRect(0,S-12,S,12);g.lineWidth=4;
  for(let i=0;i<6;i++){const x=20+i*40;g.fillRect(x-2,0,4,S);g.beginPath();g.arc(x+20,S*0.3,11,0,TAU);g.stroke();g.beginPath();g.arc(x+20,S*0.7,11,0,TAU);g.stroke();g.beginPath();g.moveTo(x+20,S*0.3+11);g.lineTo(x+20,S*0.7-11);g.stroke()}},{cut:true,spec:0.2,shin:40});
tile('kvBalus',(g,S)=>{g.clearRect(0,0,S,S);g.fillStyle='#f2efe7';
  for(let i=0;i<4;i++){const cx=30+i*60;g.beginPath();g.moveTo(cx-9,118);g.lineTo(cx+9,118);g.bezierCurveTo(cx+9,100,cx+4,96,cx+5,88);g.bezierCurveTo(cx+18,70,cx+16,40,cx+5,28);g.lineTo(cx+8,20);g.lineTo(cx+10,4);g.lineTo(cx-10,4);g.lineTo(cx-8,20);g.lineTo(cx-5,28);g.bezierCurveTo(cx-16,40,cx-18,70,cx-5,88);g.bezierCurveTo(cx-4,96,cx-9,100,cx-9,118);g.fill()}
  g.fillStyle='#ffffff';for(let i=0;i<4;i++){g.beginPath();g.moveTo(i*60,122);g.lineTo(i*60+60,122);g.lineTo(i*60+60,150);g.quadraticCurveTo(i*60+30,182,i*60,150);g.fill()}},{cut:true,spec:0.05,shin:20});
// louvred timber shutter (tint carrier)
tile('kvShut',(g,S)=>{g.fillStyle='#d8d8d8';g.fillRect(0,0,S,S);for(let y=8;y<S-6;y+=9){g.fillStyle='rgba(0,0,0,0.28)';g.fillRect(10,y+5,S-20,4);g.fillStyle='rgba(255,255,255,0.25)';g.fillRect(10,y,S-20,2)}
  g.fillStyle='rgba(0,0,0,0.22)';g.fillRect(0,0,10,S);g.fillRect(S-10,0,10,S);g.fillRect(0,S/2-4,S,8)},{spec:0.08,shin:20});

/* ============================== SIGNS (plain text, real names, no logos) ============================== */
const SG_ROWS=10,SG_TILES=7,BAND=24;// 7 tiles × 10 bands of 240×24 design px (aspect 10:1)
const uvR=(x0,y0,x1,y1)=>[x0/240,x1/240,1-y1/240,1-y0/240];
function drawSign(g,m,y,sg){const x=0,w=240,h=BAND;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.fillStyle=sg.bg;g.fillRect(x,y,w,h);
  const st=sg.st||'sans';const fam=st==='serif'||st==='script'?FAM_SERIF:st==='didot'?FAM_DIDOT:FAM_SANS;const wt=st==='script'?'italic bold':st==='thin'?'300':st==='didot'?'':'bold';
  let txt=st==='caps'||st==='didot'?sg.text.toUpperCase():sg.text;g.fillStyle=sg.fg;g.textAlign='center';g.textBaseline='middle';
  if(st==='caps'||st==='didot')txt=txt.split('').join(String.fromCharCode(8202));
  if(sg.sub){fitFont(g,txt,w*0.86,h*0.6,fam,wt);g.fillText(txt,x+w/2,y+h*0.40);fitFont(g,sg.sub,w*0.6,h*0.22,FAM_SANS,'bold');g.fillText(sg.sub,x+w/2,y+h*0.84)}
  else{fitFont(g,txt,w*0.88,h*0.68,fam,wt);g.fillText(txt,x+w/2,y+h*0.55)}
  if(sg.rule){g.fillStyle=sg.rule;g.fillRect(x,y+h-2,w,2)}g.restore();if(sg.lit!==false){m.fillStyle='#fff';m.fillRect(x,y,w,h)}}
let SIGNS=null;const SIGNIX=new Map();
function signList(){if(SIGNS)return SIGNS;SIGNS=[];
  const add=(key,sg)=>{if(SIGNIX.has(key))return;if(SIGNS.length>=SG_ROWS*SG_TILES){KV.warn.push('sign atlas full: '+key);return}SIGNIX.set(key,SIGNS.length);SIGNS.push(sg)};
  for(const id in BLD){const c=BLD[id];for(const e in c.units||{})for(const u of c.units[e]){const s=u[2]&&SH[u[2]];if(s&&!s.noSign)add('s:'+u[2],{text:s.sign||s.n,sub:s.sub,bg:s.bg,fg:s.fg,st:s.st,rule:s.rule,lit:s.lit});
      if(u[2]==='lobby'&&u[3]){if(u[3].no)add('no:'+u[3].no,{text:u[3].no,bg:'#1f4f9c',fg:'#ffffff',st:'sans'});for(const p of u[3].plates||[])add('pl:'+p,{text:p,bg:'#b89a5a',fg:'#2a2118',st:'serif',lit:false})}}}
  // shops of the back streets come from MAP.pois (generic layout)
  try{for(const id in BLD){const idx=bIdx(id);if(idx<0)continue;for(const p of poisOf(idx))if(p.bay==='shop'&&!BLD[id].units[p.e]){if(p.name)add('p:'+p.name,{text:p.name,bg:p.bg||'#1d1d1f',fg:p.fg||'#f6efe2',st:'sans'});else if(/pharm/.test(p.cat||''))add('p:ΦΑΡΜΑΚΕΙΟ',{text:'ΦΑΡΜΑΚΕΙΟ',bg:'#ffffff',fg:'#13824a',st:'sans',rule:'#13824a'})}}}catch(e){}
  add('pharm',{text:'ΦΑΡΜΑΚΕΙΟ',bg:'#ffffff',fg:'#13824a',st:'sans',rule:'#13824a'});
  return SIGNS}
function signPainter(k){return (g,S,m)=>{const L=signList();for(let r=0;r<SG_ROWS;r++){const sg=L[k*SG_ROWS+r];if(!sg){g.fillStyle='#e8e2d6';g.fillRect(0,r*BAND,240,BAND);continue}drawSign(g,m,r*BAND,sg)}}}
for(let k=0;k<SG_TILES;k++)tile('kvSign'+k,signPainter(k),{spec:0.08,shin:40,glowK:1.5});
function signUV(key){signList();const i=SIGNIX.get(key);if(i===undefined)return null;const k=Math.floor(i/SG_ROWS),r=i%SG_ROWS;if(T['kvSign'+k]===undefined)return null;return{tile:T['kvSign'+k],uv:uvR(0,r*BAND,240,r*BAND+BAND),sg:SIGNS[i]}}

/* ============================== SHOP CATALOGUE ==============================
   n: real name (as surveyed), sign: sign text if different, cat: category → interior tile, bg/fg/st: sign colours + type style,
   frame: shopfront frame colour, door: l|c|r, awn: {c: colour, t: 'straight'|'dome'}, terr: {t: tables, ch: chair colour, umb: umbrella colour},
   cross: green pharmacy cross, conf: photo | inferred. Colours of independent shops are inferred (no open-licence photo of this block exists);
   chain brands use their usual livery as plain text. */
const SH={
  vivify:{n:'Vivify - The Beauty Lab',sign:'VIVIFY',sub:'THE BEAUTY LAB',cat:'beauty',bg:'#f4ece6',fg:'#5a2e38',st:'caps',frame:'#e8e6e0',conf:'photo'},
  credia:{n:'CrediaBank',cat:'bank',bg:'#0f2b46',fg:'#ffffff',st:'sans',frame:'#2b2d30',door:'l'},
  repair:{n:'RepairLogic',cat:'services',bg:'#1d1d1f',fg:'#f6efe2',st:'sans',frame:'#2b2d30'},
  ojo:{n:'OJO Sunglasses',sign:'OJO',sub:'SUNGLASSES',cat:'optician',bg:'#1c3f6e',fg:'#ffffff',st:'caps',frame:'#1c1c1e',weak:1},
  bueno:{n:'Bueno',cat:'fast_food',bg:'#3a2a1e',fg:'#f6e7c1',st:'script',frame:'#1f1a16',awn:{c:'#1f3b2c',t:'straight'},terr:{t:4,ch:'#2a2a2a',umb:null,planter:1}},
  thiros:{n:'THIROS',cat:'bags',bg:'#141414',fg:'#e9dcc0',st:'caps',frame:'#141414',weak:1},
  glamur:{n:'glamur',cat:'jewelry',bg:'#f3eee6',fg:'#8a6a3a',st:'script',frame:'#c9b48a',weak:1},
  lila:{n:'Lilá',cat:'clothes',bg:'#f5f2ea',fg:'#1d1d1f',st:'didot',frame:'#3a3f44',door:'r'},
  choriatiko:{n:'Το Χωριάτικο',cat:'bakery',bg:'#27405a',fg:'#ffffff',st:'sans',sub:'ΑΡΤΟΠΟΙΕΙΟ',frame:'#111111',door:'r',awn:{c:'#1a1a1a',t:'straight'}},
  deli:{n:'Deli To Bacco',cat:'tobacco',bg:'#e7dfd0',fg:'#222222',st:'sans',frame:'#e8e6e0'},
  bottega:{n:'Bottega Belleza',cat:'cosmetics',bg:'#f3efe6',fg:'#141414',st:'didot',frame:'#111111'},
  fixers:{n:'TheFixers',cat:'services',bg:'#1f2a24',fg:'#d8c28a',st:'caps',frame:'#e8e6e0',door:'l'},
  swiss:{n:'Swiss Corner',cat:'jewelry',bg:'#141414',fg:'#c9a961',st:'serif',frame:'#2b2622',door:'c'},
  wagamama:{n:'Wagamama',sign:'wagamama',cat:'restaurant',bg:'#1b1b1b',fg:'#ffffff',st:'sans',frame:'#1a1a1c',door:'l',awn:{c:'#2a2f3a',t:'straight'},terr:{t:6,ch:'#2b2b2b',umb:'#e2d2b0',bench:1}},
  magnifique:{n:'Magnifique',cat:'cafe',bg:'#14110e',fg:'#d6b46a',st:'didot',frame:'#14110e',door:'c',awn:{c:'#e9e1d0',t:'straight'},terr:{t:5,ch:'#b8a07a',umb:'#efe7d6',planter:1}},
  varsos:{n:'Βάρσος',sign:'ΒΑΡΣΟΣ',sub:'ΖΑΧΑΡΟΠΛΑΣΤΕΙΟ · 1892',cat:'confectionery',bg:'#fbf8f1',fg:'#7a1f2b',st:'serif',frame:'#2b2622',door:'c',terr:{t:4,ch:'#3a2a20',umb:null}},
  hb:{n:'Holland & Barrett',cat:'health_shop',bg:'#004c3f',fg:'#ffffff',st:'sans',frame:'#004c3f',door:'c'},
  nova:{n:'Nova',sign:'nova',cat:'telecom',bg:'#101014',fg:'#ffffff',st:'sans',frame:'#101014',rule:'#e3262f'},
  ancho:{n:'Ancho',sign:'ANCHO',sub:'MEXICAN GRILL',cat:'fast_food',bg:'#1c1a17',fg:'#f08a24',st:'caps',frame:'#1c1a17',awn:{c:'#c25a1c',t:'straight'},terr:{t:2,ch:'#2b2b2b',umb:null}},
  mrphone:{n:'MrPhone.gr',cat:'telecom',bg:'#e7dfd0',fg:'#222222',st:'sans',frame:'#e8e6e0',door:'l'},
  zenith:{n:'Ζενίθ',cat:'services',bg:'#2a2622',fg:'#e8dcc0',st:'caps',frame:'#2a2622'},
  sweet:{n:'The sweet spot',cat:'confectionery',bg:'#f7dfe2',fg:'#7a2e44',st:'script',frame:'#f0e8e2',awn:{c:'#e8b7c0',t:'dome'}},
  ibank:{n:'i-bank corner',cat:'bank',bg:'#003a70',fg:'#ffffff',st:'sans',frame:'#9aa3ab'},
  coffeeisland:{n:'Coffee Island',cat:'cafe',bg:'#191513',fg:'#ffffff',st:'caps',frame:'#191513',door:'c',terr:{t:3,ch:'#3b3b3b',umb:'#2b2b2b'}},
  fresco:{n:'Fresco Gelateria',sign:'Fresco',sub:'GELATERIA',cat:'ice_cream',bg:'#f3f6ef',fg:'#2f6d4f',st:'script',frame:'#e8e6e0',terr:{t:2,ch:'#e8e6e0',umb:null}},
  bibi:{n:'Bibi boutique',cat:'clothes',bg:'#f2ece4',fg:'#3a2a24',st:'script',frame:'#3a2a24'},
  chantro:{n:'Χαντρόκοσμος',cat:'crafts',bg:'#5b2a6e',fg:'#f6e6ff',st:'sans',frame:'#e8e6e0'},
  triumph:{n:'Triumph',cat:'clothes',bg:'#111111',fg:'#ffffff',st:'caps',frame:'#111111'},
  loccitane:{n:"L'Occitane",sign:"L'OCCITANE",sub:'EN PROVENCE',cat:'cosmetics',bg:'#f6c443',fg:'#3b2a1a',st:'caps',frame:'#3b2a1a',door:'r'},
  tissa:{n:'TISSA',cat:'shoes',bg:'#ffffff',fg:'#111111',st:'caps',frame:'#1a1a1a',weak:1},
  pharm6:{n:'Pharmacy (Kassaveti 6)',sign:'ΦΑΡΜΑΚΕΙΟ',cat:'pharmacy',bg:'#ffffff',fg:'#13824a',st:'sans',rule:'#13824a',frame:'#13824a',cross:1,poi:'pharmacy'},
  pischosv:{n:'Pisxos optics visionworks',sign:'ΠΙΣΧΟΣ',sub:'OPTICS · VISIONWORKS',cat:'optician',bg:'#16243d',fg:'#ffffff',st:'caps',frame:'#16243d'},
  dust:{n:'Dust Cream',cat:'cosmetics',bg:'#ffffff',fg:'#141414',st:'thin',frame:'#141414',door:'l'},
  pischos:{n:'Πίσχος',sign:'ΠΙΣΧΟΣ',sub:'ΟΠΤΙΚΑ',cat:'optician',bg:'#16243d',fg:'#ffffff',st:'caps',frame:'#16243d'},
  vodafone:{n:'Vodafone',sign:'vodafone',cat:'telecom',bg:'#e60000',fg:'#ffffff',st:'sans',frame:'#e8e6e0'},
  pharm6b:{n:'Pharmacy (Kassaveti 6, east)',sign:'ΦΑΡΜΑΚΕΙΟ',cat:'pharmacy',bg:'#ffffff',fg:'#13824a',st:'sans',rule:'#13824a',frame:'#13824a',cross:1,poi:'pharmacy'},
  leonidas:{n:'Leonidas',sub:'CHOCOLATIER',cat:'confectionery',bg:'#f6f0e2',fg:'#a8863e',st:'serif',frame:'#a8863e'},
  lobby:{n:'',noSign:1},closed:{n:'',noSign:1},wall:{n:'',noSign:1}};
const CAT_INT={restaurant:'F',cafe:'F',fast_food:'F',bakery:'F',confectionery:'F',ice_cream:'F',clothes:'C',bags:'C',shoes:'C',crafts:'C',jewelry:'T',optician:'T',telecom:'T',services:'T',bank:'T',tobacco:'T',
  cosmetics:'B',beauty:'B',pharmacy:'B',health_shop:'B'};
const CAT_TINT={restaurant:'#ffe0bc',cafe:'#ffdcb4',fast_food:'#ffe2bf',bakery:'#ffdcae',confectionery:'#ffe6c8',ice_cream:'#fff2d8',clothes:'#fff8f0',bags:'#fff4e8',shoes:'#fff4e8',crafts:'#f6eaff',jewelry:'#fff6e0',
  optician:'#eef4ff',telecom:'#eef2fa',services:'#f6f6f2',bank:'#e8eef8',tobacco:'#fff3e0',cosmetics:'#fff6f6',beauty:'#fff4f4',pharmacy:'#eefaf2',health_shop:'#f0faf0'};

/* ============================== BUILDINGS (OSM way id → design) ==============================
   units[edge] = [[s0, s1, shopKey, opts], …]: metres along the OSM edge from its first vertex; shop centres = OSM node / verified address
   positions of PLACEMENT_AUDIT.md §7 carried to the facade. front = edges with full street facades (balconies / neoclassical bays). */
const BLD={
  // Kassaveti 1 — neoclassical corner block on Kifisias Ave / Kassaveti (photo ref/r11: cream plaster, grey stone pilasters, tall moulded first-floor windows,
  // salmon pediment over the corner wing, red-tile hip roof). The 4 m NW end (e2) is the plainer modern 3-storey block with balconies (Vivify).
  w1075949217:{style:'neo',lv:2,gfH:4.9,fh:4.3,wall:'#e8dcbc',trim:'#f6f2e8',pil:'#a9a59c',roof:'hip',roofCol:'#b5573c',cornice:0.55,front:[2,4,5,7,8,10,0],modern:[2],
    pediment:{e:4,s0:5.2,s1:11.7,col:'#e8907a'},balcEvery:2,winW:1.15,
    units:{2:[[0.2,3.9,'vivify']],4:[[0.4,6.0,'credia'],[6.4,11.3,'repair']],5:[[0.5,4.7,'ojo'],[5.1,14.5,'bueno']],7:[[0.25,2.5,'thiros'],[2.7,4.9,'glamur']],
      8:[[0.3,4.1,'lila'],[4.3,8.1,'choriatiko'],[8.3,14.9,'deli']],10:[[0.2,3.4,'bottega'],[3.6,5.0,'lobby',{no:'1',plates:['Akouson','OJO Sunglasses','glamur']}],[5.2,8.6,'fixers'],[8.8,13.4,'swiss']]}},
  // Kassaveti 3 — 4-storey 1960-80 polykatoikia, continuous marble-edged balconies, top floor set back; Wagamama + Magnifique terraces
  w1075949840:{style:'poly',lv:4,gfH:4.3,fh:3.0,wall:'#f2ede1',gfMat:'marble',front:[21,16],rail:'alu',dep:1.3,setTop:1.6,shut:'#d6cfbf',frame:'#d8d8d2',awn:['#3d5f6a','#d8ccb2','#7a7f78',null],solar:3,
    units:{21:[[0.3,12.0,'wagamama'],[12.4,21.4,'magnifique'],[21.7,24.2,'lobby',{no:'3',plates:[]}]]}},
  // Kassaveti 5 — Varsos (historic patisserie, 1892): 2-storey neoclassical, rusticated base, quoins, central balcony on consoles, green shutters, cornice + balustrade
  w1075949838:{style:'neo',lv:2,gfH:4.6,fh:4.2,wall:'#e8cdb5',trim:'#f5efe4',pil:'#cdbfa8',roof:'flat',balus:1,cornice:0.5,front:[0],shutters:'#4f6b55',quoins:1,centreBalc:1,winW:1.1,raised:0.3,
    units:{0:[[0.25,8.05,'varsos']]}},
  // Kassaveti 7-9 — 3-storey polykatoikia, continuous balconies with iron rails, solar heaters
  w1075949837:{style:'poly',lv:3,gfH:4.3,fh:3.0,wall:'#f1eee7',gfMat:'marble',front:[1],rail:'iron',railCol:'#2c2f30',dep:1.3,shut:'#cfc8b6',frame:'#e8e6e0',awn:['#b9b2a3','#4d6b5a',null,'#8a3a2a'],solar:3,
    units:{1:[[0.3,6.5,'hb'],[6.8,12.0,'nova'],[12.3,17.5,'ancho']]}},
  // Kassaveti 4 — 3-storey corner block Kassaveti / Drosini, masonry balcony parapets
  w378932290:{style:'poly',lv:3,gfH:4.2,fh:3.0,wall:'#f1eee7',gfMat:'marble',front:[10,0,1],rail:'masonry',dep:1.2,shut:'#d8d2c4',frame:'#3b3c3e',awn:['#c9c2b0',null,'#5a6e5a',null],solar:2,
    units:{10:[[0.3,3.3,'mrphone'],[3.5,6.2,'zenith'],[6.4,8.8,'sweet'],[9.0,10.2,'ibank'],[10.4,11.5,'coffeeisland',{corner:1}]],
      0:[[0.1,5.0,'coffeeisland',{second:1}],[5.3,7.4,'lobby',{no:'4',plates:['Drip','Naturafoods']}],[8.8,16.3,'fresco'],[16.6,22.3,'closed']]}},
  // b289 — 4-storey, stone-clad base, top floor set back; four narrow boutiques on Kassaveti
  w1075948791:{style:'poly',lv:4,gfH:4.2,fh:3.05,wall:'#e7cfae',gfMat:'stone',front:[16,11],rail:'masonry',dep:1.3,setTop:1.7,shut:'#7a5a3a',frame:'#4a3a2c',awn:['#d8ccb2','#7a4a3a',null],solar:3,planters:true,
    units:{16:[[0.2,3.2,'bibi'],[3.4,6.4,'chantro'],[6.6,9.6,'triumph'],[9.8,12.85,'loccitane']]}},
  // Kassaveti 6 — 4-storey polykatoikia, top floor set back
  w1075948790:{style:'poly',lv:4,gfH:4.2,fh:3.0,wall:'#f2ede1',gfMat:'marble',front:[3],rail:'alu',dep:1.3,setTop:1.6,shut:'#d6cfbf',frame:'#d8d8d2',awn:['#3d6a4c','#d8ccb2',null,'#8a8f86'],solar:3,
    units:{3:[[0.3,2.4,'lobby',{no:'6',plates:['TISSA']}],[2.6,4.4,'tissa'],[4.6,8.0,'pharm6'],[8.2,11.0,'pischosv'],[11.2,16.2,'dust']]}},
  // b286 — 4-storey polykatoikia (Kassaveti / Miltiadou, Hotel des Roses at the back)
  w1075948788:{style:'poly',lv:4,gfH:4.2,fh:3.0,wall:'#ece4cf',gfMat:'marble',front:[2,9],rail:'alu',dep:1.3,shut:'#d6cfbf',frame:'#e6e4de',awn:['#d8ccb2','#3d5f8a',null],solar:4,
    units:{2:[[0.3,4.5,'pischos'],[4.7,10.0,'vodafone'],[10.2,14.25,'pharm6b']]}},
  // Drosini 11 — modern 3-storey, stone/HPL cladding, glass rails; Leonidas on the north point (OSM node 10098070077)
  w1075656859:{style:'poly',lv:3,gfH:4.5,fh:3.1,wall:'#f3f1ec',gfMat:'stone',front:[1,3,2],rail:'glass',dep:1.0,shut:null,frame:'#2f3032',awn:[null],solar:0,
    units:{3:[[0.3,5.4,'leonidas']]}}};
const AT=[[-24.0,36.0],[17.0,30.0],[31.5,35.0],[46.0,36.0],[-5.0,70.0],[12.0,72.0],[27.0,74.0],[43.0,75.0],[-31.0,78.0]];

/* ============================== MAP HELPERS ============================== */
const _bi={};function bIdx(id){if(_bi[id]!==undefined)return _bi[id];let r=-1;if(typeof MAP!=='undefined'&&MAP&&MAP.buildings){for(let i=0;i<MAP.buildings.length;i++){const b=MAP.buildings[i];if(b&&b[11]&&b[11].id===id){r=b._i!=null?b._i:i;break}}}if(r>=0)_bi[id]=r;return r}
const poisOf=idx=>(typeof MAP!=='undefined'&&MAP&&Array.isArray(MAP.pois))?MAP.pois.filter(p=>p.b===idx):[];
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9α-ω]/g,'');

/* ============================== GEOMETRY HELPERS (edge frames) ============================== */
function FR(a,c,sg){const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz)||1e-6,ux=dx/L,uz=dz/L;return{a,c,L,ux,uz,nx:sg>0?uz:-uz,nz:sg>0?-ux:ux}}
const P=(f,s,d)=>[f.a[0]+f.ux*s+f.nx*d,f.a[1]+f.uz*s+f.nz*d];
const V=(f,s,d,y)=>{const p=P(f,s,d);return[p[0],y,p[1]]};
let O,CUT;
function fq(B,f,s0,s1,y0,y1,d,col,tile,uv,gl,dir){if(s1-s0<1e-3||y1-y0<1e-3)return;const a=P(f,s0,d),b=P(f,s1,d),k=dir||1;const u=uv||[s0,s1,y0,y1];B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,f.nx*k,f.nz*k,u[0],u[1],u[2],u[3],col,RECT[tile],gl||0)}
function sq(B,f,s,d0,d1,y0,y1,dir,col,tile,gl){if(Math.abs(d1-d0)<1e-3||y1-y0<1e-3)return;const a=P(f,s,d0),b=P(f,s,d1);B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,f.ux*dir,f.uz*dir,d0,d1,y0,y1,col,RECT[tile],gl||0)}
function hq(B,f,s0,s1,d0,d1,y,down,col,tile,gl){if(s1-s0<1e-3||Math.abs(d1-d0)<1e-3)return;const A=P(f,s0,d0),Bp=P(f,s1,d0),C=P(f,s1,d1),D=P(f,s0,d1);B.hq([A[0],y,A[1]],[Bp[0],y,Bp[1]],[C[0],y,C[1]],[D[0],y,D[1]],[A[0],A[1]],[Bp[0],Bp[1]],[C[0],C[1]],[D[0],D[1]],col,RECT[tile],gl||0,!!down)}
function bx(B,f,s,d,y0,ws,wd,h,col,tile,gl){if(ws<1e-3||wd<1e-3||h<1e-3)return;const p=P(f,s,d);B.box(p[0],y0+h/2,p[1],ws,h,wd,Math.atan2(-f.uz,f.ux),col,RECT[tile],1,gl||0)}
function q3(B,a,b,c,d,ua,ub,uc,ud,col,tile,gl,want){const n=B.nrm(a,b,c);if(n[0]*want[0]+n[1]*want[1]+n[2]*want[2]<0)B.quad(d,c,b,a,ud,uc,ub,ua,col,RECT[tile],gl||0);else B.quad(a,b,c,d,ua,ub,uc,ud,col,RECT[tile],gl||0)}
function t3(B,a,b,c,ua,ub,uc,col,tile,gl,want){const n=B.nrm(a,b,c);if(n[0]*want[0]+n[1]*want[1]+n[2]*want[2]<0)B.tri(a,c,b,ua,uc,ub,col,RECT[tile],gl||0);else B.tri(a,b,c,ua,ub,uc,col,RECT[tile],gl||0)}
function wallHoles(B,f,S0,S1,Y0,Y1,d,holes,col,tile){holes=holes.filter(h=>h[1]>S0&&h[0]<S1&&h[3]>Y0&&h[2]<Y1).sort((a,b)=>a[0]-b[0]);let cur=S0;
  // merge overlapping holes into columns: for each column draw the wall above and below every hole it contains
  let i=0;while(i<holes.length){let c0=Math.max(holes[i][0],S0),c1=Math.min(holes[i][1],S1);const col_=[holes[i]];let j=i+1;while(j<holes.length&&holes[j][0]<c1-1e-3){c1=Math.max(c1,Math.min(holes[j][1],S1));col_.push(holes[j]);j++}
    if(c0>cur)fq(B,f,cur,c0,Y0,Y1,d,col,tile);
    if(col_.length===1){const h=col_[0];if(h[2]>Y0)fq(B,f,c0,c1,Y0,Math.min(h[2],Y1),d,col,tile);if(h[3]<Y1)fq(B,f,c0,c1,Math.max(h[3],Y0),Y1,d,col,tile)}
    else{// several holes sharing a column (e.g. door + fascia): fill the vertical gaps over the column width
      const ys=col_.map(h=>[Math.max(h[2],Y0),Math.min(h[3],Y1)]).sort((a,b)=>a[0]-b[0]);let y=Y0;for(const [a,b] of ys){if(a>y)fq(B,f,c0,c1,y,a,d,col,tile);y=Math.max(y,b)}if(y<Y1)fq(B,f,c0,c1,y,Y1,d,col,tile)}
    cur=c1;i=j}
  if(S1>cur)fq(B,f,cur,S1,Y0,Y1,d,col,tile)}
const ALU=H('#d4d6d6'),MARBLE=H('#eeebe4'),C_SILL=H('#e9e6de'),GREY=H('#9a9ea2'),DARKM=H('#2a2c2e');
/* recessed opening (window, balcony door or shop glazing). o: {glass, glassCol, gl, frame, rev, revT, mull, tr, door:[s0,s1], shut(0..1), shutCol, sill, fw, glassUv} */
function opening(B,f,s0,s1,y0,y1,dep,o){const rev=o.rev||MARBLE,rt=o.revT||TMt('plaster'),fc=o.frame||ALU,fw=o.fw||0.06;
  sq(B,f,s0,0,-dep,y0,y1,1,shade(rev,0.86),rt);sq(B,f,s1,0,-dep,y0,y1,-1,shade(rev,0.86),rt);hq(B,f,s0,s1,-dep,0,y0,false,o.sillCol||C_SILL,TMt('marble'));hq(B,f,s0,s1,-dep,0,y1,true,shade(rev,0.7),rt);
  fq(B,f,s0,s1,y0,y1,-dep,o.glassCol||C1,o.glass||TT('kvGlass'),o.glassUv||[0,1,0,1],o.gl||0);
  const d=-dep+0.025;fq(B,f,s0,s0+fw,y0,y1,d,fc,T.white);fq(B,f,s1-fw,s1,y0,y1,d,fc,T.white);fq(B,f,s0,s1,y1-fw,y1,d,fc,T.white);fq(B,f,s0,s1,y0,y0+fw*1.4,d,fc,T.white);
  const n=o.mull||1;for(let i=1;i<n;i++){const s=s0+(s1-s0)*i/n;if(o.door&&s>o.door[0]-0.1&&s<o.door[1]+0.1)continue;fq(B,f,s-fw/2,s+fw/2,y0,o.tr&&o.door?o.tr:y1,d,fc,T.white)}
  if(o.tr&&o.tr<y1-0.1)fq(B,f,s0,s1,o.tr-fw/2,o.tr+fw/2,d,fc,T.white);
  if(o.door){const [a,b]=o.door;fq(B,f,a-fw,a+fw*0.5,y0,o.tr||y1,d+0.01,fc,T.white);fq(B,f,b-fw*0.5,b+fw,y0,o.tr||y1,d+0.01,fc,T.white);const m=(a+b)/2;bx(B,f,m-0.1,d+0.05,y0+0.9,0.03,0.05,0.85,H('#c0c4c6'),T.white);bx(B,f,m+0.1,d+0.05,y0+0.9,0.03,0.05,0.85,H('#c0c4c6'),T.white)}
  if(o.kick){const kc=shade(fc,0.85);for(const [a,b] of o.door?[[s0,o.door[0]-fw],[o.door[1]+fw,s1]]:[[s0,s1]])fq(B,f,a,b,y0,y0+o.kick,d+0.012,kc,T.white)}
  if(o.shut>0){const hh=(y1-y0)*Math.min(1,o.shut);fq(B,f,s0+fw,s1-fw,y1-hh,y1-fw,d+0.02,o.shutCol||H('#d9d3c3'),TMt('shutterM','shutter'))}
  if(o.sill)bx(B,f,(s0+s1)/2,0.05,y0-0.06,s1-s0+0.14,0.1,0.06,C_SILL,TMt('marble'))}
/* outline offsets: per vertex intersection of the neighbouring edges' offset lines (offset d per edge, outward positive) */
function outline(ps,sg,dOf){const n=ps.length,E=[];for(let i=0;i<n;i++)E.push(FR(ps[i],ps[(i+1)%n],sg));const out=[];
  for(let j=0;j<n;j++){const e0=E[(j-1+n)%n],e1=E[j],d0=dOf((j-1+n)%n),d1=dOf(j);const p=ps[j];
    const a0=[p[0]+e0.nx*d0,p[1]+e0.nz*d0],a1=[p[0]+e1.nx*d1,p[1]+e1.nz*d1];const cr=e0.ux*e1.uz-e0.uz*e1.ux;
    if(Math.abs(cr)<0.08||(d0===0&&d1===0)){out.push(Math.abs(d0)>Math.abs(d1)?a0:a1);continue}
    const t=((a1[0]-a0[0])*e1.uz-(a1[1]-a0[1])*e1.ux)/cr;const q=[a0[0]+e0.ux*t,a0[1]+e0.uz*t];const lim=3*Math.max(Math.abs(d0),Math.abs(d1))+0.5;
    out.push(Math.hypot(q[0]-p[0],q[1]-p[1])>lim?(Math.abs(d0)>Math.abs(d1)?a0:a1):q)}
  return out}
function polyRoof(B,ps,y,col,tile){const tris=triangulate([ps]);for(const t of tris){let [a,b,c]=t;const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr>0){const q=b;b=c;c=q}
  B.tri([a[0],y,a[1]],[b[0],y,b[1]],[c[0],y,c[1]],[a[0],a[1]],[b[0],b[1]],[c[0],c[1]],col,RECT[tile],0,true)}}
/* party wall test: is the ground just outside this edge inside another building? (then no windows / no shops on it) */
let _nb=null;function nearBuildings(cx,cz){const out=[];for(const b of MAP.buildings){const r=b[6];if(!r)continue;if(Math.abs(r[0]-cx)<60&&Math.abs(r[1]-cz)<60){try{out.push(unp(b[10]))}catch(e){}}}return out}
function isParty(f,self){if(f.L<0.3)return true;for(const t of[0.25,0.5,0.75]){const p=P(f,f.L*t,0.7);let hit=false;for(const q of _nb){if(q===self)continue;if(pip(q,p[0],p[1])){hit=true;break}}if(!hit)return false}return true}

/* ============================== SHOPFRONT PIECES ============================== */
function awning(f,s0,s1,yTop,proj,drop,col,type){const c=H(col),y1=yTop-drop,L=s1-s0;const up=[f.nx*0.3,1,f.nz*0.3],dn=[-f.nx*0.3,-1,-f.nz*0.3];
  const fab=TT('kvFabric');
  if(type==='dome'){// quarter-round "basket" awning: 4 facets
    const N=4;let pa=null;for(let i=0;i<=N;i++){const a=i/N*Math.PI/2;const d=0.04+Math.sin(a)*proj,y=yTop-(1-Math.cos(a))*drop;if(pa){const A=V(f,s0,pa[0],pa[1]),B=V(f,s1,pa[0],pa[1]),C=V(f,s1,d,y),D=V(f,s0,d,y);q3(O,A,B,C,D,[0,0],[L,0],[L,0.5],[0,0.5],c,fab,0,up);q3(O,A,B,C,D,[0,0],[L,0],[L,0.5],[0,0.5],shade(c,0.6),fab,0,dn);
        t3(O,A,D,V(f,s0,0.04,pa[1]),[0,0],[0.4,0],[0,0.4],shade(c,0.85),fab,0,[-f.ux,0,-f.uz]);t3(O,B,C,V(f,s1,0.04,pa[1]),[0,0],[0.4,0],[0,0.4],shade(c,0.85),fab,0,[f.ux,0,f.uz]);
        t3(O,D,V(f,s0,0.04,y),V(f,s0,0.04,pa[1]),[0,0],[0.4,0],[0,0.4],shade(c,0.85),fab,0,[-f.ux,0,-f.uz]);t3(O,C,V(f,s1,0.04,y),V(f,s1,0.04,pa[1]),[0,0],[0.4,0],[0,0.4],shade(c,0.85),fab,0,[f.ux,0,f.uz])}pa=[d,y]}
    return}
  const A=V(f,s0,0.04,yTop),Bv=V(f,s1,0.04,yTop),C=V(f,s1,proj,y1),D=V(f,s0,proj,y1);
  q3(O,A,Bv,C,D,[0,0],[L,0],[L,proj],[0,proj],c,fab,0,up);q3(O,A,Bv,C,D,[0,0],[L,0],[L,proj],[0,proj],shade(c,0.62),fab,0,dn);
  const vh=0.24,v=uvR(0,122,240,182);CUT.wall(C[0],C[2],D[0],D[2],y1-vh,y1-vh,y1,y1,f.nx,f.nz,0,Math.max(1,L/1.4),v[2],v[3],c,RECT[TT('kvBalus')],0);
  t3(O,A,D,[D[0],yTop,D[2]],[0,0],[proj,0],[proj,0.3],shade(c,0.8),fab,0,[-f.ux,0,-f.uz]);t3(O,Bv,C,[C[0],yTop,C[2]],[0,0],[proj,0],[proj,0.3],shade(c,0.8),fab,0,[f.ux,0,f.uz]);
}
function signQuad(f,s0,s1,y0,y1,d,key){const su=signUV(key);if(!su)return null;const w=s1-s0,h=y1-y0;let sw=Math.min(w-0.12,(h-0.06)*10),sh=sw/10;if(sw<0.3)return null;const c=(s0+s1)/2,yc=(y0+y1)/2;
  fq(O,f,c-sw/2,c+sw/2,yc-sh/2,yc+sh/2,d,C1,su.tile,su.uv,su.sg.lit===false?0:1);return su}
function fascia(f,s0,s1,y0,y1,s,key,proj){proj=proj||0.1;const bg=H(s.bg||'#1d1d1f');bx(O,f,(s0+s1)/2,proj/2,y0,s1-s0,proj,y1-y0,bg,T.white);signQuad(f,s0,s1,y0,y1,proj+0.006,key)}
function pharmCross(f,s,y){const g=H('#18a558');const p=P(f,s,0.55);bx(O,f,s,0.3,y+0.28,0.08,0.5,0.08,GREY,T.white);
  for(const [w,h] of[[0.62,0.2],[0.2,0.62]])bx(O,f,s,0.62,y-h/2+0.1,0.07,w,h,g,T.white,1);placed('lm_sign',p[0],p[1],'pharmacy cross','lm-kassaveti')}
function chairAt(x,y,z,yaw,col){O.box(x,y+0.44,z,0.44,0.05,0.44,yaw,col,RECT[T.white]);const bxp=x-Math.sin(yaw)*0.2,bzp=z-Math.cos(yaw)*0.2;O.box(bxp,y+0.68,bzp,0.44,0.44,0.04,yaw,col,RECT[T.white]);
  for(const [a,b] of[[-0.19,-0.19],[0.19,-0.19],[-0.19,0.19],[0.19,0.19]])O.box(x+a,y+0.21,z+b,0.03,0.42,0.03,0,shade(col,0.7),RECT[T.white])}
function terrace(f,s0,s1,gy,t,yAwn){const w=s1-s0;const n=Math.max(1,Math.min(t.t||2,Math.floor((w-0.4)/1.6)));const ch=H(t.ch||'#2b2b2b'),top=H('#e8e4dc');const d0=t.bench?1.0:1.25;
  for(let i=0;i<n;i++){const s=s0+(i+0.5)*w/n;const p=P(f,s,d0+0.35);const y=terr(p[0],p[1])+0.16;
    O.cyl(p[0],y,p[1],0.05,0.05,0.72,6,GREY,RECT[T.white],false);O.cyl(p[0],y+0.72,p[1],0.36,0.36,0.035,10,top,RECT[TMt('marble')],true);O.cyl(p[0],y,p[1],0.22,0.18,0.03,8,GREY,RECT[T.white],true);
    const yaw=Math.atan2(f.ux,f.uz);for(const sd of[-1,1]){const q=P(f,s+sd*0.62,d0+0.35);chairAt(q[0],y,q[1],yaw+sd*Math.PI/2,ch)}
    if(t.umb&&i%2===0){const u=H(t.umb);O.cyl(p[0],y,p[1],0.025,0.025,2.35,4,GREY,RECT[T.white],false);O.cyl(p[0],y+2.0,p[1],1.35,0.04,0.42,8,u,RECT[TT('kvFabric')],true);O.cyl(p[0],y+1.98,p[1],1.35,1.35,0.06,8,shade(u,0.85),RECT[TT('kvFabric')],false)}
    addSeg(p[0]-0.3,p[1]-0.3,p[0]+0.3,p[1]+0.3,'p')}
  if(t.planter){for(const s of[s0+0.35,s1-0.35]){const p=P(f,s,0.9);const y=terr(p[0],p[1])+0.16;O.box(p[0],y+0.3,p[1],0.5,0.6,0.5,Math.atan2(-f.uz,f.ux),H('#3a3a3a'),RECT[T.white]);O.cyl(p[0],y+0.6,p[1],0.3,0.16,0.7,7,H('#4d6b34'),RECT[TT('hedge',T.white)],true);addSeg(p[0]-0.25,p[1],p[0]+0.25,p[1],'p')}}}
/* one shop unit. gy = shop floor level, gTop = ceiling of the ground floor (fascia area ends there or earlier) */
function shopUnit(f,s0,s1,gy,gTop,key,s,opt,cfg,neo){const w=s1-s0;const cat=s.cat||'services';const it=TT('kvShop'+(CAT_INT[cat]||'T'));
  const glassTop=Math.min(gTop-0.95,gy+(neo?3.25:2.95));const fr=H(s.frame||cfg.frame||'#2e2f31');
  const dw=Math.min(1.25,Math.max(0.9,w*0.32));const dpos=opt&&opt.corner?'c':(s.door||'c');const dc=w<2.2?(s0+s1)/2:dpos==='l'?s0+0.2+dw/2:dpos==='r'?s1-0.2-dw/2:(s0+s1)/2;
  const rev=cfg.gfMat==='stone'?H('#d9c7a6'):H('#e8e4dc');
  opening(O,f,s0,s1,gy+0.02,glassTop,0.2,{glass:it,glassCol:H(CAT_TINT[cat]||'#fff6ea'),gl:1,frame:fr,fw:0.07,mull:Math.max(1,Math.round(w/1.7)),tr:gy+2.45,door:[dc-dw/2,dc+dw/2],rev,revT:TMt(cfg.gfMat==='stone'?'ashlar':'marbleW','marble'),kick:0.32});
  const fy0=glassTop+0.06,fy1=Math.min(gTop-0.15,glassTop+(w>7?0.85:0.72));
  fascia(f,s0+0.02,s1-0.02,fy0,fy1,s,key.startsWith('p:')?key:'s:'+key,0.1);
  if(s.awn&&s.awn.c)awning(f,s0+0.05,s1-0.05,glassTop+0.02,w>6?1.6:1.2,s.awn.t==='dome'?0.75:0.45,s.awn.c,s.awn.t);
  if(s.cross)pharmCross(f,dpos==='l'?s1-0.3:s0+0.3,fy1+0.1);
  if(s.terr&&!(opt&&opt.second))terrace(f,s0,s1,gy,s.terr,glassTop);
  if(opt&&opt.second)return[s0,s1,gy+0.02,fy1];
  return[s0,s1,gy+0.02,fy1]}
function lobbyUnit(f,s0,s1,gy,opt){const w=s1-s0;const dw=Math.min(1.6,w-0.5);const c=(s0+s1)/2;
  opening(O,f,c-dw/2,c+dw/2,gy+0.02,gy+2.75,0.3,{glass:TT('kvGlass'),glassCol:H('#d8cdb8'),gl:0.7,frame:H('#2f3032'),fw:0.07,mull:2,tr:gy+2.25,rev:H('#efece6'),revT:TMt('marbleW','marble'),door:[c-dw/2+0.04,c+dw/2-0.04]});
  bx(O,f,c,0.45,gy+2.9,dw+0.6,0.9,0.1,H('#efece6'),TMt('marble'));// marble canopy slab
  if(opt&&opt.no){const su=signUV('no:'+opt.no);if(su)fq(O,f,c+dw/2+0.08,c+dw/2+0.08+0.36,gy+2.25,gy+2.25+0.036*3,0.03,C1,su.tile,su.uv,0)}
  let y=gy+1.65;for(const p of(opt&&opt.plates)||[]){const su=signUV('pl:'+p);if(!su)continue;const s=c-dw/2-0.1;if(s-0.42<s0-0.25)break;fq(O,f,s-0.42,s,y,y+0.042,0.02,C1,su.tile,su.uv,0);bx(O,f,s-0.21,0.005,y-0.02,0.46,0.02,0.082,H('#b89a5a'),T.white);y-=0.12}
  return[c-dw/2,c+dw/2,gy+0.02,gy+2.75]}
function closedUnit(f,s0,s1,gy,cfg){fq(O,f,s0+0.05,s1-0.05,gy+0.02,gy+2.95,-0.12,H('#c9c4b8'),TMt('shutterM','shutter'));sq(O,f,s0+0.05,0,-0.12,gy,gy+2.95,1,MARBLE,TMt('marble'));sq(O,f,s1-0.05,0,-0.12,gy,gy+2.95,-1,MARBLE,TMt('marble'));
  bx(O,f,(s0+s1)/2,0.05,gy+2.95,s1-s0,0.1,0.28,H('#d8d4cc'),T.white);return[s0+0.05,s1-0.05,gy+0.02,gy+3.23]}
/* move the MAP.pois record(s) of a shop onto the unit drawn here, so the interiors module puts its door exactly at the drawn door */
function patchPoi(s,idx,ei,f,s0,s1){if(!Array.isArray(MAP.pois)||!s.n)return;const want=nrm(s.n);const c=(s0+s1)/2;const cp=P(f,c,0);
  let cands=MAP.pois.filter(p=>p.b===idx&&(nrm(p.name)===want||(s.poi&&p.cat===s.poi&&!p.name)));
  if(!cands.length)cands=MAP.pois.filter(p=>nrm(p.name)===want&&Math.hypot((p.fx||p.x)-cp[0],(p.fz||p.z)-cp[1])<25);
  if(s.poi==='pharmacy')cands=cands.sort((a,b)=>Math.hypot(a.fx-cp[0],a.fz-cp[1])-Math.hypot(b.fx-cp[0],b.fz-cp[1])).slice(0,1);
  for(const p of cands){const dpos=s.door||'c';const dw=Math.min(1.25,Math.max(0.9,(s1-s0)*0.32));const dc=dpos==='l'?s0+0.2+dw/2:dpos==='r'?s1-0.2-dw/2:c;
    const old=[p.fx,p.fz];p.b=idx;p.e=ei;p.t=+(c/f.L).toFixed(4);p.w=+(s1-s0).toFixed(2);p.fx=+cp[0].toFixed(2);p.fz=+cp[1].toFixed(2);p.nx=+f.nx.toFixed(3);p.nz=+f.nz.toFixed(3);
    const dp=P(f,dc,0);p.door=[+dp[0].toFixed(2),+dp[1].toFixed(2)];if(p.bay!=='shop')p.bay='shop';p.lm='lm-kassaveti';KV.patched.push([p.name,old,[p.fx,p.fz]])}
  return cands.length}

/* ============================== FACADE BUILDERS ============================== */
function polyBays(f,y0,y1,k,cfg,seed,bal,wallC){const L=f.L;if(L<1.3){fq(O,f,0,L,y0,y1,0,wallC,TMt('plaster'));return}
  const nb=L<2.8?1:Math.max(1,Math.round((L-0.4)/3.3)),bw=L/nb;const holes=[];const fr=H(cfg.frame||'#e6e4de'),sc=cfg.shut?H(cfg.shut):null;
  for(let i=0;i<nb;i++){const c=(i+0.5)*bw,h=hf(seed*13+i*7+k*101);let w,ya,yb,door;
    if(bal){door=h<0.72||bw<2;w=door?Math.min(bw<2?0.9:1.4,bw-0.5):Math.min(1.6,bw-0.6);ya=door?y0:y0+0.95;yb=y0+2.4}
    else{door=false;w=Math.min(1.3,bw-0.7);ya=y0+0.95;yb=y0+2.3}if(w<0.5)continue;
    const lit=hf(seed+i*3+k*17)<0.3?1:0;const shut=sc?[0,0,0.15,0.35,0.6,1.0][Math.floor(hf(seed*7+i+k*5)*6)]:0;
    opening(O,f,c-w/2,c+w/2,ya,yb,0.18,{frame:fr,mull:w>1.1?2:1,gl:lit,shut,shutCol:sc,sill:!door});holes.push([c-w/2,c+w/2,ya,yb]);
    if(bal){const ac=cfg.awn&&cfg.awn[Math.floor(hf(seed+i*11+k)*cfg.awn.length)];if(ac&&hf(seed*3+i*5+k*9)<0.55)awning(f,c-bw/2+0.15,c+bw/2-0.15,y1-0.22,(cfg.dep||1.3)+0.1,1.0,ac,'straight');
      if(hf(seed+i*19+k*3)<0.4){const s=c+(hf(seed+i)<0.5?-1:1)*(w/2+0.55);if(s>0.5&&s<L-0.5){bx(O,f,s,0.35,y0,0.8,0.3,0.55,H('#ecebe7'),T.white);fq(O,f,s-0.3,s+0.2,y0+0.08,y0+0.48,0.505,H('#6a6c6e'),T.white)}}
      if(cfg.planters&&hf(seed+i*23+k)<0.6){const s=c+w/2+0.3;if(s<L-0.3){const p=P(f,s,(cfg.dep||1.3)-0.35);O.cyl(p[0],y0,p[1],0.22,0.18,0.42,8,H('#a0522d'),RECT[T.white],true);O.cyl(p[0],y0+0.42,p[1],0.32,0.1,0.6,7,H('#4d6b34'),RECT[TT('hedge',T.white)],true)}}}}
  wallHoles(O,f,0,L,y0,y1,0,holes,wallC,TMt('plaster'))}
function sideWindows(f,y0,y1,k,cfg,seed,wallC){const L=f.L;const holes=[];if(L>=3.2){const nb=Math.max(1,Math.round(L/4.2)),bw=L/nb;for(let i=0;i<nb;i++){const c=(i+0.5)*bw,w=Math.min(1.1,bw-1.0);if(w<0.6)continue;const ya=y0+1.0,yb=y0+2.25;
    opening(O,f,c-w/2,c+w/2,ya,yb,0.14,{frame:H(cfg.frame||'#e6e4de'),gl:hf(seed+i*7+k)<0.25?1:0,shut:cfg.shut?[0,0.3,0.6,1][Math.floor(hf(seed*5+i+k)*4)]:0,shutCol:cfg.shut?H(cfg.shut):null,sill:true});holes.push([c-w/2,c+w/2,ya,yb])}}
  wallHoles(O,f,0,L,y0,y1,0,holes,wallC,TMt('plaster'))}
function railing(f,s0,s1,y,type,cfg,d){const L=s1-s0;if(L<0.05)return;
  if(type==='masonry'){fq(O,f,s0,s1,y,y+0.95,d,H(cfg.wall),TMt('plaster'));fq(O,f,s0,s1,y,y+0.95,d-0.15,H(cfg.wall),TMt('plaster'),null,0,-1);hq(O,f,s0,s1,d-0.15,d+0.02,y+0.95,false,MARBLE,TMt('marble'));return}
  if(type==='glass'){fq(CUT,f,s0,s1,y+0.08,y+1.0,d,H('#bfd0d6'),TT('glassR',T.white),[0,L,0,1]);bx(O,f,(s0+s1)/2,d,y+1.0,L,0.06,0.05,H('#b8bcbf'),T.white);return}
  if(type==='balus'){const bh=0.62;bx(O,f,(s0+s1)/2,d-0.02,y,L,0.24,0.12,MARBLE,TMt('marble'));const v=uvR(0,0,240,120);fq(CUT,f,s0,s1,y+0.12,y+0.12+bh,d-0.02,C1,TT('kvBalus'),[0,L/0.55,v[2],v[3]]);
    bx(O,f,(s0+s1)/2,d-0.02,y+0.12+bh,L+0.04,0.3,0.12,MARBLE,TMt('marble'));return}
  if(type==='ironN'){fq(CUT,f,s0,s1,y,y+0.95,d,H('#1f2224'),TT('kvIron'),[0,L/1.0,0,1]);bx(O,f,(s0+s1)/2,d,y+0.95,L,0.05,0.04,H('#1f2224'),T.white);return}
  const col=type==='alu'?H(cfg.railCol||'#c9cdd1'):H(cfg.railCol||'#2a2c2d');fq(CUT,f,s0,s1,y,y+1.0,d,col,TT('kvRail'),[0,L/(type==='alu'?1.0:1.2),0,1]);bx(O,f,(s0+s1)/2,d,y+1.0,L,0.06,0.05,col,T.white)}
function roofStuff(R,top,cfg,seed){let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9;for(const p of R){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}
  let n=0;for(let k=0;k<40&&n<(cfg.solar||0);k++){const x=lerp(minx+1.5,maxx-1.5,hf(seed*5+k*7)),z=lerp(minz+1.5,maxz-1.5,hf(seed*11+k*13));if(!pip(R,x,z)||!pip(R,x,z-1.8)||!pip(R,x+1.1,z)||!pip(R,x-1.1,z))continue;n++;
    O.hq([x-1.0,top+0.35,z-0.6],[x+1.0,top+0.35,z-0.6],[x+1.0,top+1.25,z-1.5],[x-1.0,top+1.25,z-1.5],[0,0],[1,0],[1,1],[0,1],C1,RECT[TT('solar',T.white)],0,false);
    O.box(x,top+1.45,z-1.65,1.9,0.55,0.55,0,H('#efefec'),RECT[T.white]);O.box(x,top+0.6,z-1.4,1.6,1.2,0.06,0,H('#8a8c8e'),RECT[TMt('metalL','metal')])}
  for(let k=0;k<24;k++){const x=lerp(minx+2,maxx-2,hf(seed*3+k)),z=lerp(minz+2,maxz-2,hf(seed*17+k));if(!pip(R,x,z)||!pip(R,x+1.4,z)||!pip(R,x-1.4,z)||!pip(R,x,z+1.4)||!pip(R,x,z-1.4))continue;
    O.box(x,top+1.25,z,2.4,2.5,2.4,0,H(cfg.wall),RECT[TMt('plaster')]);O.box(x,top+2.55,z,2.6,0.12,2.6,0,MARBLE,RECT[TMt('marble')]);O.cyl(x+0.9,top+2.6,z+0.9,0.025,0.025,2.4,4,GREY,RECT[T.white],false);
    for(let j=0;j<3;j++)O.box(x+0.9,top+4.2+j*0.3,z+0.9,1.2-j*0.25,0.03,0.03,0.4,GREY,RECT[T.white]);break}}
/* tiled hip "skirt" roof for any outline: slopes up from the eaves to an inner ring (inset by `ins`), flat tiled top inside */
function skirtRoof(ps,sg,y,ins,rise,col){const inner=outline(ps,sg,()=>-ins);const n=ps.length;const tl=TT('tiles',T.white),c=H(col);const eave=outline(ps,sg,()=>0.35);
  for(let i=0;i<n;i++){const j=(i+1)%n;const a=eave[i],b=eave[j],ia=inner[i],ib=inner[j];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.05)continue;
    q3(O,[a[0],y-0.12,a[1]],[b[0],y-0.12,b[1]],[ib[0],y+rise,ib[1]],[ia[0],y+rise,ia[1]],[0,0],[L,0],[L,ins*1.1],[0,ins*1.1],c,tl,0,[0,1,0]);
    {const fe=FR(a,b,sg);fq(O,fe,0,fe.L,y-0.3,y-0.12,0,MARBLE,TMt('marble'))}
    O.hq([a[0],y-0.3,a[1]],[b[0],y-0.3,b[1]],[ps[j][0],y-0.3,ps[j][1]],[ps[i][0],y-0.3,ps[i][1]],[0,0],[1,0],[1,1],[0,1],shade(MARBLE,0.8),RECT[TMt('marble')],0,true)}
  polyRoof(O,inner,y+rise,shade(c,0.95),tl)}

/* neoclassical facade of one edge (2 storeys): pilasters + shop bays below a string course, tall moulded windows with hood cornices above,
   frieze + projecting cornice at the top */
function neoEdge(f,i,gy,cfg,ctx){const L=f.L,wallC=H(cfg.wall),trim=H(cfg.trim),pil=H(cfg.pil||'#b0aaa0');const y1=gy+cfg.gfH,y2=y1+cfg.fh,top=y2;const seed=ctx.seed+i*31;
  const modern=(cfg.modern||[]).indexOf(i)>=0;
  // ground floor
  const holes=[];const U=(cfg.units&&cfg.units[i])||[];for(const u of U){const r=unitAt(f,i,u,ctx,y1,true);if(r)holes.push(r)}
  if(!U.length&&L>2.5){const nb=Math.max(1,Math.round(L/3.2)),bw=L/nb;for(let k=0;k<nb;k++){const c=(k+0.5)*bw,w=Math.min(1.2,bw-0.8);if(w<0.5)continue;opening(O,f,c-w/2,c+w/2,gy+1.0,gy+3.2,0.2,{frame:H('#3a3632'),gl:0,shut:0.0,sill:true});holes.push([c-w/2,c+w/2,gy+1.0,gy+3.2])}}
  wallHoles(O,f,0,L,ctx.loE[i],y1,0,holes,shade(wallC,0.97),TMt('plaster'));
  // stone pilasters between the shop bays and at the corners
  const cuts=[0,L];for(const h of holes){cuts.push(h[0]-0.02,h[1]+0.02)}cuts.sort((a,b)=>a-b);
  for(let k=0;k<cuts.length-1;k++){const a=cuts[k],b=cuts[k+1];if(b-a<0.12)continue;let inHole=false;for(const h of holes)if(a>=h[0]-0.05&&b<=h[1]+0.05){inHole=true;break}if(inHole)continue;
    bx(O,f,(a+b)/2,0.04,gy-0.05,b-a,0.08,y1-gy-0.3,pil,TMt('ashlar','marble'))}
  bx(O,f,L/2,0.12,y1-0.32,L+0.1,0.24,0.32,trim,TMt('marble'));// string course
  if(modern){for(let k=1;k<3;k++){const ya=y1+(k-1)*3.0;polyBays(f,ya,ya+3.0,k,Object.assign({},cfg,{frame:'#d8d8d2',shut:'#d6cfbf',awn:['#d8ccb2',null]}),seed,false,H('#f1eee7'))}return y1+6.0}
  // first floor: tall windows every ~2.5 m
  const winW=cfg.winW||1.15,nb=Math.max(1,Math.round(L/2.55)),bw=L/nb;const wh=[];
  for(let k=0;k<nb;k++){const c=(k+0.5)*bw;if(bw<winW+0.5)continue;const ya=y1+0.55,yb=Math.min(y2-0.75,ya+2.55);const centre=cfg.centreBalc&&k===Math.floor(nb/2)&&nb%2===1;const balc=centre||(cfg.balcEvery&&((k+i)%cfg.balcEvery===0));
    const y0w=balc?y1+0.08:ya;opening(O,f,c-winW/2,c+winW/2,y0w,yb,0.22,{frame:H('#5a4a3a'),mull:2,gl:hf(seed+k*5)<0.3?1:0,tr:yb-0.55,sill:!balc,rev:trim});wh.push([c-winW/2,c+winW/2,y0w,yb]);
    // moulded architrave + hood cornice (+ small pediment on the central bay)
    bx(O,f,c-winW/2-0.08,0.03,y0w,0.14,0.06,yb-y0w,trim,TMt('marble'));bx(O,f,c+winW/2+0.08,0.03,y0w,0.14,0.06,yb-y0w,trim,TMt('marble'));bx(O,f,c,0.04,yb,winW+0.3,0.08,0.18,trim,TMt('marble'));
    bx(O,f,c,0.12,yb+0.2,winW+0.55,0.24,0.1,trim,TMt('marble'));
    if(centre){const A=V(f,c-winW/2-0.3,0.12,yb+0.3),B=V(f,c+winW/2+0.3,0.12,yb+0.3),C=V(f,c,0.12,yb+0.75);t3(O,A,B,C,[0,0],[1,0],[0.5,0.5],trim,TMt('marble'),0,[f.nx,0,f.nz])}
    if(cfg.shutters){const sc=H(cfg.shutters);for(const sd of[-1,1]){const s=c+sd*(winW/2+0.16+winW/4);if(s-winW/4<0.05||s+winW/4>L-0.05)continue;fq(O,f,s-winW/4,s+winW/4,y0w,yb,0.07,sc,TT('kvShut'),[0,1,0,1]);sq(O,f,s+sd*winW/4,0,0.07,y0w,yb,sd,shade(sc,0.75),T.white)}}
    if(balc){const bw2=centre?winW+1.4:winW+0.5,dep=centre?0.9:0.5;bx(O,f,c,dep/2,y1,bw2,dep,0.14,MARBLE,TMt('marble'));
      for(const sd of[-1,1])bx(O,f,c+sd*(bw2/2-0.2),0.2,y1-0.42,0.14,0.36,0.42,trim,TMt('marble'));// consoles
      const g=FR(P(f,c-bw2/2,dep),P(f,c+bw2/2,dep),ctx.sg);railing(g,0,g.L,y1+0.14,'ironN',cfg,0);
      for(const sd of[-1,1]){const g2=sd<0?FR(P(f,c-bw2/2,0),P(f,c-bw2/2,dep),ctx.sg):FR(P(f,c+bw2/2,dep),P(f,c+bw2/2,0),ctx.sg);railing(g2,0,g2.L,y1+0.14,'ironN',cfg,0)}}}
  wallHoles(O,f,0,L,y1,y2,0,wh,wallC,TMt('plaster'));
  if(cfg.quoins){for(const s of[0.25,L-0.25])for(let y=gy+0.2,k=0;y<top-0.4;y+=0.42,k++)bx(O,f,s+(k%2?0:(s<1?0.12:-0.12)),0.025,y,k%2?0.5:0.74,0.05,0.36,trim,TMt('ashlar','marble'))}
  // frieze + cornice
  bx(O,f,L/2,0.03,top-0.62,L,0.06,0.5,shade(trim,0.97),TMt('plaster'));bx(O,f,L/2,(cfg.cornice||0.5)/2,top-0.12,L+0.3,cfg.cornice||0.5,0.24,trim,TMt('marble'));
  bx(O,f,L/2,(cfg.cornice||0.5)*0.3,top-0.26,L+0.1,(cfg.cornice||0.5)*0.6,0.14,shade(trim,0.9),TMt('marble'));
  for(let s=0.3;s<L-0.2;s+=0.6)bx(O,f,s,0.12,top-0.36,0.12,0.24,0.1,trim,T.white);// modillions
  return top}

/* ============================== UNITS ============================== */
function unitAt(f,ei,u,ctx,gTop,neo){const [s0,s1,key,opt]=u;if(s1>f.L+0.05||s0<-0.05){KV.warn.push('unit off edge '+key+' e'+ei+' L='+f.L.toFixed(1))}
  const a=Math.max(0,s0),b=Math.min(f.L,s1);if(b-a<0.4)return null;const s=SH[key]||{n:key};
  // floor level of this unit: highest pavement point in front of it (+ step), so shops step down the 7 % slope of Kassaveti
  let gy=-1e9;for(const t of[a,(a+b)/2,b]){const p=P(f,t,0.6);gy=Math.max(gy,terr(p[0],p[1])+0.17)}if(gy>ctx.gyMax)gy=ctx.gyMax;if(ctx.cfg.raised)gy+=ctx.cfg.raised;
  // plinth under the unit down to the pavement
  let lo=1e9;for(const t of[a,b]){const p=P(f,t,0.2);lo=Math.min(lo,terr(p[0],p[1]))}fq(O,f,a,b,lo-0.4,gy,0.0,H('#cfcac0'),TMt('marbleW','marble'));
  if(ctx.cfg.raised){for(let k=0;k<2;k++)bx(O,f,(a+b)/2,0.25+k*0.3,gy-ctx.cfg.raised+k*ctx.cfg.raised/2-0.05,b-a-0.4,0.6-k*0.3,ctx.cfg.raised/2+0.05,MARBLE,TMt('marble'))}
  let r;if(key==='lobby')r=lobbyUnit(f,a,b,gy,opt);else if(key==='closed')r=closedUnit(f,a,b,gy,ctx.cfg);else if(key==='wall')return null;
  else{r=shopUnit(f,a,b,gy,gTop,key,s,opt,ctx.cfg,neo);const n=ctx.pp[ei+':'+s0]||0;const p=P(f,(a+b)/2,0);placed('lm_shop',p[0],p[1],s.n,'lm-kassaveti');
    SHOPFRONTS.push({a:P(f,a,0),c:P(f,b,0),nx:f.nx,nz:f.nz,L:b-a});KV.units.push({b:ctx.idx,e:ei,s0:+a.toFixed(2),s1:+b.toFixed(2),name:s.n,x:+p[0].toFixed(1),z:+p[1].toFixed(1),poi:n,weak:!!s.weak})}
  return r}
/* shops of non-curated edges (back streets) from MAP.pois */
function poiUnits(f,ei,ctx){const ps=poisOf(ctx.idx).filter(p=>p.e===ei&&p.bay==='shop'&&!p.lm);const L=f.L;const U=ps.map(p=>{const w=clamp(p.w||4,2.4,Math.min(10,L-0.4));const c=clamp(p.t*L,0.2+w/2,L-0.2-w/2);return{c,w,p}}).sort((a,b)=>a.c-b.c);
  for(let i=0;i<U.length-1;i++){const a=U[i],b=U[i+1];if(a.c+a.w/2>b.c-b.w/2-0.3){const m=(a.c+a.w/2+b.c-b.w/2)/2;a.w=Math.max(2,2*(m-0.15-a.c+a.w/2)-a.w);}}
  return U.filter(u=>u.p.name||/pharm/.test(u.p.cat||'')).map(u=>{const s0=Math.max(0.2,u.c-u.w/2),s1=Math.min(L-0.2,u.c+u.w/2);const nm=u.p.name||'ΦΑΡΜΑΚΕΙΟ';const key='p:'+nm;const s={n:nm,cat:CAT_INT[u.p.cat]?u.p.cat:(/pharm/.test(u.p.cat)?'pharmacy':'services'),bg:u.p.bg||'#1d1d1f',fg:u.p.fg||'#f6efe2',cross:/pharm/.test(u.p.cat||'')};
    return[s0,s1,key,{poiShop:s}]}).filter(u=>u[1]-u[0]>1.6)}

/* ============================== BUILD ONE BUILDING ============================== */
function buildOne(fp){const b=fp.b,id=b[11]&&b[11].id,cfg=BLD[id];if(!cfg)return false;const ps=fp.ps.slice(),n=ps.length;const sg=polyArea(ps)>0?1:-1;
  const idx=bIdx(id);const seed=(b[5]|0)+13;const front=new Set(cfg.front.filter(e=>e<n));
  const wallC=H(cfg.wall);let gmin=Infinity,gmax=-Infinity;for(const p of ps){const y=terr(p[0],p[1]);gmin=Math.min(gmin,y);gmax=Math.max(gmax,y)}
  // ground-floor datum: highest pavement level along the front edges (shops on the low end step down; upper floors are level)
  let gyMax=-Infinity;for(const e of front){const f=FR(ps[e],ps[(e+1)%n],sg);for(const t of[0,0.5,1]){const p=P(f,f.L*t,0.6);gyMax=Math.max(gyMax,terr(p[0],p[1])+0.17)}}if(!isFinite(gyMax))gyMax=gmax+0.17;
  const gy=gyMax+(cfg.raised||0),base=gmin-0.6,lv=cfg.lv,gfH=cfg.gfH,fh=cfg.fh;const yAt=k=>k===0?gy:gy+gfH+(k-1)*fh;const top=yAt(lv);
  const cx=ps.reduce((s,p)=>s+p[0],0)/n,cz=ps.reduce((s,p)=>s+p[1],0)/n;const ch=chunkAt(cx,cz);O=ch.o;CUT=ch.cut;const v0=O.size()+CUT.size();
  _nb=nearBuildings(cx,cz);const E=[];for(let i=0;i<n;i++)E.push(FR(ps[i],ps[(i+1)%n],sg));const party=E.map(f=>isParty(f,null)&&true);
  // own footprint is in _nb too: isParty skips nothing by identity, so test with the point outside (0.7 m) — own polygon never contains it
  for(let i=0;i<n;i++)if(E[i].L>0.05)addSeg(ps[i][0],ps[i][1],ps[(i+1)%n][0],ps[(i+1)%n][1],'b');
  const ctx={cfg,idx,seed,sg,gyMax:gy-(cfg.raised||0)+0.6,id,pp:{}};
  // pre-pass: move the POIs of every curated shop onto its drawn unit before any generic (MAP.pois-driven) edge is laid out
  for(const e in cfg.units||{}){const f=E[e];if(!f)continue;for(const u of cfg.units[e]){const s=SH[u[2]];if(!s||s.noSign||(u[3]&&u[3].corner))continue;ctx.pp[e+':'+u[0]]=patchPoi(s,idx,+e,f,Math.max(0,u[0]),Math.min(f.L,u[1]))||0}}
  const loE=E.map(f=>{let lo=1e9;for(const t of[0,0.25,0.5,0.75,1]){const p=P(f,f.L*t,0.3);lo=Math.min(lo,terr(p[0],p[1]))}return lo-0.4});ctx.loE=loE;
  if(cfg.style==='neo'){
    let topY=gy+gfH+fh;for(let i=0;i<n;i++){const f=E[i];if(f.L<0.05)continue;if(!front.has(i))fq(O,f,0,f.L,base,gy,0,H('#cfcac0'),TMt('marbleW','marble'));
      if(front.has(i)){topY=Math.max(topY,neoEdge(f,i,gy,cfg,ctx))}
      else{const c=party[i]?shade(wallC,0.9):shade(wallC,0.95);if(party[i])fq(O,f,0,f.L,gy,gy+gfH+fh,0,c,TMt('plaster'));else{sideWindows(f,gy,gy+gfH,0,cfg,seed+i,c);sideWindows(f,gy+gfH,gy+gfH+fh,1,cfg,seed+i,c)}
        bx(O,f,f.L/2,0.1,gy+gfH+fh-0.12,f.L,0.2,0.22,H(cfg.trim),TMt('marble'))}}
    const top2=gy+gfH+fh;
    if(cfg.roof==='hip')skirtRoof(ps,sg,top2,3.2,1.25,cfg.roofCol||'#b5573c');
    else{polyRoof(O,ps,top2,H('#d6d2ca'),TMt('flatroof','plaster'));for(let i=0;i<n;i++){const f=E[i];if(f.L<0.05)continue;if(front.has(i)&&cfg.balus)railing(f,0.15,f.L-0.15,top2,'balus',cfg,-0.05);else{fq(O,f,0,f.L,top2,top2+0.6,0,shade(wallC,0.95),TMt('plaster'));fq(O,f,0,f.L,top2,top2+0.6,-0.18,shade(wallC,0.85),TMt('plaster'),null,0,-1);hq(O,f,0,f.L,-0.18,0.03,top2+0.6,false,MARBLE,TMt('marble'))}}}
    if(cfg.pediment){const pd=cfg.pediment,f=E[pd.e];if(f){const s0=pd.s0,s1=Math.min(f.L,pd.s1),w=s1-s0,hgt=w*0.2,y=top2+0.12;const A=V(f,s0,0.18,y),B=V(f,s1,0.18,y),C=V(f,(s0+s1)/2,0.18,y+hgt);
        t3(O,A,B,C,[s0,y],[s1,y],[(s0+s1)/2,y+hgt],H(pd.col),TMt('plaster'),0,[f.nx,0,f.nz]);
        const g1=FR(P(f,s0-0.2,0.3),P(f,(s0+s1)/2,0.3),sg);// raking cornices
        for(const [p0,p1] of[[[s0-0.25,y-0.05],[(s0+s1)/2,y+hgt+0.12]],[[(s0+s1)/2,y+hgt+0.12],[s1+0.25,y-0.05]]]){const a3=V(f,p0[0],0.34,p0[1]),b3=V(f,p1[0],0.34,p1[1]),a4=V(f,p0[0],0.34,p0[1]+0.22),b4=V(f,p1[0],0.34,p1[1]+0.22);
          q3(O,a3,b3,b4,a4,[0,0],[1,0],[1,1],[0,1],H(cfg.trim),TMt('marble'),0,[f.nx,0,f.nz]);const a5=V(f,p0[0],-3.0,p0[1]+0.22),b5=V(f,p1[0],-3.0,p1[1]+0.22);q3(O,a4,b4,b5,a5,[0,0],[w,0],[w,3],[0,3],H(cfg.roofCol),TT('tiles',T.white),0,[0,1,0])}
        // gable roof behind the pediment back into the hip
        const D=V(f,(s0+s1)/2,-3.2,y+hgt);t3(O,A,C,V(f,s0,-3.2,y),[0,0],[1,0],[0,1],H(cfg.roofCol),TT('tiles',T.white),0,[0,1,0]);t3(O,B,C,V(f,s1,-3.2,y),[0,0],[1,0],[0,1],H(cfg.roofCol),TT('tiles',T.white),0,[0,1,0])}}
  }else{
    // ---------- polykatoikia ----------
    const off=(e,k)=>{let d=[0,0,null];if(k>0&&front.has(e)){d=[0,cfg.dep||0,cfg.rail];if(cfg.setTop&&k===lv-1)d=[-cfg.setTop,cfg.dep||0,cfg.rail]}return d};
    const gfC=cfg.gfMat==='marble'?H('#e6e2d8'):cfg.gfMat==='stone'?H('#d9c7a6'):wallC,gfT=TMt(cfg.gfMat==='marble'?'marbleW':cfg.gfMat==='stone'?'ashlar':'plasterW',cfg.gfMat==='stone'?'ashlar':'marble');
    for(let i=0;i<n;i++){const f=E[i];if(f.L<0.05)continue;const isF=front.has(i);
      if(!isF)fq(O,f,0,f.L,base,gy,0,shade(wallC,0.8),TMt('plaster'));
      if(!isF){if(party[i])fq(O,f,0,f.L,gy,yAt(1),0,shade(wallC,0.9),TMt('plaster'));else sideWindows(f,gy,yAt(1),0,cfg,seed+i,shade(wallC,0.93));continue}
      const holes=[];let U=(cfg.units&&cfg.units[i])||null;
      if(U){for(const u of U){const r=unitAt(f,i,u,ctx,yAt(1),false);if(r)holes.push(r)}}
      else{for(const u of poiUnits(f,i,ctx)){const s=u[3].poiShop;SH[u[2]]=s;const r=unitAt(f,i,[u[0],u[1],u[2],null],ctx,yAt(1),false);if(r)holes.push(r)}
        if(!holes.length&&f.L>=2.6){const r=lobbyUnit(f,f.L/2-0.9,f.L/2+0.9,gy,null);holes.push(r)}}
      // marble-clad piers between shops; fascia band continuity
      wallHoles(O,f,0,f.L,loE[i],yAt(1),0.0,holes,gfC,gfT);
      bx(O,f,f.L/2,0.09,yAt(1)-0.22,f.L+0.06,0.18,0.22,MARBLE,TMt('marble'))}
    let prevOut=ps;
    for(let k=1;k<lv;k++){const y0=yAt(k),y1=yAt(k+1);const W=outline(ps,sg,e=>off(e,k)[0]),Rr=outline(ps,sg,e=>{const o=off(e,k);return Math.max(o[0],o[1])});
      for(let i=0;i<n;i++){const a=W[i],c=W[(i+1)%n];const f=FR(a,c,sg);if(f.L<0.05)continue;const isF=front.has(i);const o=off(i,k);
        if(!isF){if(party[i])fq(O,f,0,f.L,y0,y1,0,shade(wallC,0.9),TMt('plaster'));else sideWindows(f,y0,y1,k,cfg,seed+i*7,shade(wallC,0.95));continue}
        polyBays(f,y0,y1,k,cfg,seed+i*31+k*7,o[1]-o[0]>0.6,wallC)}
      for(let i=0;i<n;i++){if(!front.has(i))continue;const o=off(i,k);if(o[1]-o[0]<0.05)continue;const j=(i+1)%n;
        const a=W[i],c=W[j],ra=Rr[i],rc=Rr[j];const ys=y0;
        O.hq([a[0],ys,a[1]],[c[0],ys,c[1]],[rc[0],ys,rc[1]],[ra[0],ys,ra[1]],[a[0],a[1]],[c[0],c[1]],[rc[0],rc[1]],[ra[0],ra[1]],H('#d9d4ca'),RECT[TMt('marble')],0,false);
        O.hq([a[0],ys-0.2,a[1]],[c[0],ys-0.2,c[1]],[rc[0],ys-0.2,rc[1]],[ra[0],ys-0.2,ra[1]],[0,0],[1,0],[1,1],[0,1],shade(wallC,0.78),RECT[TMt('plaster')],0,true);
        const fr=FR(ra,rc,sg);if(fr.L>0.05){fq(O,fr,0,fr.L,ys-0.2,ys+0.04,0.0,MARBLE,TMt('marble'));railing(fr,0,fr.L,ys+0.04,o[2],cfg,-0.06)}
        for(const [p,q,dir] of[[a,ra,-1],[c,rc,1]]){const nb=dir<0?(i-1+n)%n:j;const on=off(nb,k);if(front.has(nb)&&on[1]-on[0]>=0.05)continue;const g=FR(p,q,sg);if(g.L<0.1)continue;
          fq(O,g,0,g.L,ys-0.2,ys+0.04,0,MARBLE,TMt('marble'),null,0,1);fq(O,g,0,g.L,ys-0.2,ys+0.04,0,MARBLE,TMt('marble'),null,0,-1);railing(g,0,g.L,ys+0.04,o[2],cfg,0)}}
      // roof of the floor below where this floor steps back (set-back top floor): covered by the balcony slab ring
      prevOut=W}
    const Rf=prevOut;polyRoof(O,Rf,top,H('#d6d2ca'),TMt('flatroof','plaster'));
    for(let i=0;i<n;i++){const f=FR(Rf[i],Rf[(i+1)%n],sg);if(f.L<0.05)continue;fq(O,f,0,f.L,top,top+0.85,0,front.has(i)?wallC:shade(wallC,0.93),TMt('plaster'));fq(O,f,0,f.L,top,top+0.85,-0.2,shade(wallC,0.85),TMt('plaster'),null,0,-1);
      hq(O,f,0,f.L,-0.2,0.04,top+0.85,false,MARBLE,TMt('marble'));fq(O,f,0,f.L,top+0.79,top+0.85,0.04,MARBLE,TMt('marble'))}
    roofStuff(Rf,top,cfg,seed)}
  const v1=O.size()+CUT.size();KV.tris+=Math.round((v1-v0)/2);KV.built.push('b'+idx+' '+id);return true}

/* ============================== REGISTER ============================== */
LM.register({id:'kassaveti',at:AT,build(ctx){const t0=performance.now();signList();
  for(const fp of ctx.footprints){try{if(!buildOne(fp))KV.warn.push('no design for '+(fp.b[11]&&fp.b[11].id))}catch(e){console.error('lm-kassaveti: building',fp.b[11]&&fp.b[11].id,e);KV.warn.push(String(e&&e.stack||e).slice(0,300))}}
  KV.ms=Math.round(performance.now()-t0);KV.tiles=typeof _nextTile!=='undefined'?_nextTile:null}});
})();
