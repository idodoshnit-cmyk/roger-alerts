'use strict';
/* 89g_lm_kassaveti.js — the Kassaveti shop block ("Mythos's street"), hand-modelled (owner: bot lm-kassaveti).
   West Kassaveti from Platanos square to the spawn junction, both sides, minus the junction corner buildings (lm-junction) and the
   Kassaveti 19 courtyard (lm-starbucks / lm-ralphlauren). Every building keeps its real OSM footprint (1 unit = 1 m).
   North side: Kassaveti 1 (neoclassical corner building facing Platanos, photo ref/r11, + its east wing), Kassaveti 3 (Wagamama / Magnifique),
   Kassaveti 5 (Varsos patisserie, 1892), Kassaveti 7 (Holland & Barrett / Nova / Ancho).
   South side: Kassaveti 4 (MrPhone.gr … I-Bank corner on Drosini), the L'Occitane / Triumph block, Kassaveti 6 (pharmacy, Dust Cream),
   the Vodafone / Pischos block, Drosini 11 (Leonidas).
   Shop list = curated table SHOPS below: one entry per real shopfront, in real street order, at the OSM-surveyed position
   (docs/research/PLACEMENT_AUDIT / gk3/data/placement_audit.json), duplicates / closed / unverified listings dropped.
   Facade designs and honesty notes: docs/research/lm/kassaveti.md.
   Public: window.KV (debug: built ids, shop list, door positions, triangle count). The interiors' door builder (buildDoorsPois) is wrapped
   so that the doors of these buildings sit exactly on the modelled shopfronts and dropped listings get no door. */
(function(){
if(typeof LM==='undefined'||typeof defTile!=='function')return;
const KV=window.KV={built:[],signs:[],doors:{},tris:0,warn:[],version:2,bidx:new Set()};
const H=hexc;
const tm=n=>(typeof TM!=='undefined'&&TM[n]!==undefined)?TM[n]:(T[n]!==undefined?T[n]:T.white);
const tt=(n,fb)=>T[n]!==undefined?T[n]:(T[fb]!==undefined?T[fb]:T.white);

/* ============================== BUILDINGS (OSM way ids) ============================== */
const ID={k1:'w1075949217',k3:'w1075949840',k5:'w1075949838',k7:'w1075949837',k4:'w378932290',occ:'w1075948791',k6:'w1075948790',voda:'w1075948788',leo:'w1075656859'};
// one interior point per building (LM hands every map building containing one of these to us)
const AT=[[-30,33],[18,30],[32,34],[46,36],[-6,70],[10,66],[27,74],[45,74],[-31,79]];

/* ============================== CURATED SHOP TABLE ==============================
   per building id → per footprint edge → shopfronts [name, t(centre along edge 0..1), width m, opts]
   opts: poi (MAP.pois id → its door is moved here), sign {text,sub,bg,fg,style}, win (window display: 0 clothes 1 café/food 2 tech 3 pharmacy/beauty 4 bank/office),
         awn colour, terr {n, chairs, umb}, door 'l'|'r'|'c', cross (green pharmacy cross), blade */
const SHOPS={};
SHOPS[ID.k1]={
  4:[['RepairLogic',0.80,3.4,{poi:'osm:n4656636066',sign:{bg:'#1f2b3a',fg:'#ffffff',style:'sans'},win:2,door:'l'}],
     ['CrediaBank',0.32,5.2,{bankWin:1,win:4}]],
  5:[['CrediaBank',0.40,6.4,{poi:'osm:n4656636032',sign:{text:'CrediaBank',bg:'#ffffff',fg:'#0b3c7d',style:'sans'},win:4,door:'c'}],
     ['OJO Sunglasses',0.86,3.2,{poi:'cs:fsq:563cdf32cd10627b592e4313',sign:{text:'OJO',sub:'SUNGLASSES',bg:'#141414',fg:'#ffffff',style:'caps'},win:3,door:'r'}]],
  7:[['Bueno',0.50,4.3,{poi:'osm:n10098103361',sign:{text:'Bueno',bg:'#3a2a1e',fg:'#f6e7c1',style:'script'},win:1,awn:'#1f3b2c',terr:{n:3,chairs:'metal',umb:'#efe7d6'},door:'r'}]],
  8:[['Lilá',0.14,3.9,{poi:'osm:n10098116489',sign:{bg:'#141414',fg:'#c9a961',style:'serif'},win:0,door:'r'}],
     ['Το Χωριάτικο',0.41,4.0,{poi:'osm:n10098129864',sign:{bg:'#27405a',fg:'#ffffff',style:'sans',sub:'ΑΡΤΟΠΟΙΕΙΟ'},win:1,awn:'#151515',door:'r'}],
     ['Deli To Bacco',0.74,5.0,{poi:'osm:n10098127030',sign:{bg:'#e7dfd0',fg:'#222222',style:'sans'},win:1,door:'c'}]],
  10:[['Bottega Belleza',0.16,4.0,{poi:'osm:n10098118201',sign:{bg:'#f3efe6',fg:'#141414',style:'serif'},win:3,door:'c'}],
      ['TheFixers',0.47,4.0,{poi:'osm:n10098116625',sign:{text:'THE FIXERS',bg:'#1f2a24',fg:'#d8c28a',style:'caps'},win:2,door:'l'}],
      ['Swiss Corner',0.80,4.4,{poi:'osm:n11069636734',sign:{bg:'#141414',fg:'#c9a961',style:'serif'},win:3,door:'c'}]]};
SHOPS[ID.k3]={21:[['Wagamama',0.27,9.6,{poi:'osm:n7040794587',sign:{text:'wagamama',bg:'#1a1a1a',fg:'#ffffff',style:'sans'},win:1,awn:'#2a2f3a',terr:{n:6,chairs:'wood',umb:null},door:'l'}],
                  ['Magnifique',0.57,4.2,{poi:'osm:n9830492199',sign:{bg:'#27405a',fg:'#ffffff',style:'sans'},win:1,awn:'#7a1f1f',terr:{n:4,chairs:'rattan',umb:'#e2d2b0'},door:'l'}],
                  ['SyWear',0.84,5.6,{poi:'ov:52d6342e-efa9-4dc0-afda-bdb5bc2eb6c9',sign:{text:'SYWEAR',bg:'#f2efe9',fg:'#1a1a1a',style:'caps'},win:0,door:'c'}]]};
SHOPS[ID.k5]={0:[['Βάρσος',0.5,7.2,{poi:'osm:n4721277016',varsos:1}]]};
SHOPS[ID.k7]={1:[['Holland & Barrett',0.17,5.2,{poi:'osm:n12560123969',sign:{bg:'#00594c',fg:'#ffffff',style:'serif'},win:3,door:'c'}],
                 ['Nova',0.47,3.6,{poi:'osm:n7309463885',sign:{text:'NOVA',bg:'#5a1e96',fg:'#ffffff',style:'caps'},win:2,door:'c'}],
                 ['Ancho',0.81,4.4,{poi:'osm:n10098118200',sign:{bg:'#5a3a22',fg:'#fff4dc',style:'serif'},win:1,awn:'#7a1f1f',terr:{n:3,chairs:'metal',umb:'#f5f1e8'},door:'r'}]]};
SHOPS[ID.k4]={10:[['MrPhone.gr',0.15,2.7,{poi:'osm:n10098110170',sign:{bg:'#e7dfd0',fg:'#222222',style:'sans'},win:2,door:'l'}],
                  ['Ζενίθ',0.40,2.7,{poi:'osm:n10098103379',sign:{text:'ΖΕΝΙΘ',bg:'#00539f',fg:'#ffffff',style:'caps'},win:4,door:'r'}],
                  ['The sweet spot',0.64,2.7,{poi:'osm:n4721277584',sign:{bg:'#7a1f1f',fg:'#ffffff',style:'serif'},win:1,door:'c'}],
                  ['Drip',0.88,2.6,{poi:'cs:fsq:667ee6b64aa957530cad42be',sign:{text:'DRIP',bg:'#111111',fg:'#ffffff',style:'caps'},win:0,door:'c'}]],
              0:[['I-Bank Corner',0.09,3.4,{poi:'ov:14b72af6-352e-4875-af21-b1062097ecf8',sign:{text:'i-bank corner',bg:'#00539f',fg:'#ffffff',style:'sans'},win:4,door:'c'}],
                 ['Coffee Island',0.28,3.8,{poi:'cs:fsq:64817068d7dd142a0642bbc4',sign:{text:'COFFEE ISLAND',bg:'#2b2522',fg:'#ffffff',style:'caps'},win:1,awn:'#2b2522',terr:{n:2,chairs:'metal',umb:null},door:'c'}],
                 ['Naturafoods',0.47,3.4,{poi:'ov:97b46790-c5db-4814-85ec-e6afc780f640',sign:{bg:'#3e6b35',fg:'#ffffff',style:'sans'},win:3,door:'c'}],
                 ['Fresco gelateria',0.77,5.0,{poi:'ov:493c74f9-291a-48b1-a296-df72eef62457',sign:{text:'Fresco',sub:'GELATERIA',bg:'#f4ede0',fg:'#2f6b4a',style:'script'},win:1,door:'c'}]]};
SHOPS[ID.occ]={16:[['Bibi boutique',0.13,3.0,{poi:'osm:n10098109194',sign:{text:'BIBI BOUTIQUE',bg:'#0f2740',fg:'#ffffff',style:'caps'},win:0,door:'c'}],
                   ['Χαντρόκοσμος',0.38,3.0,{poi:'osm:n10098106907',sign:{bg:'#f3efe6',fg:'#141414',style:'serif'},win:3,door:'c'}],
                   ['Triumph',0.62,3.0,{poi:'osm:n10098070078',sign:{bg:'#ffffff',fg:'#c8102e',style:'serif'},win:0,door:'l'}],
                   ["L'Occitane",0.87,3.1,{poi:'osm:n10098115328',sign:{text:"L'OCCITANE",sub:'EN PROVENCE',bg:'#ffcb05',fg:'#1a1a1a',style:'caps'},win:3,door:'c'}]],
               11:[['Lazarou',0.12,3.8,{poi:'cs:fsq:4f8d7e04e5e81a37dd9342e3',sign:{text:'ΛΑΖΑΡΟΥ',sub:'ΣΙΔΗΡΙΚΑ',bg:'#b8322a',fg:'#ffffff',style:'caps'},win:2,door:'c'}],
                   ['Ana Adeco',0.35,3.8,{poi:'osm:n10098109193',sign:{bg:'#ece6da',fg:'#3a3026',style:'serif'},win:3,door:'c'}],
                   ['25 minutes',0.56,3.0,{poi:'cs:fsq:53106965498eb42eea3e5f01',sign:{text:'25 MINUTES',sub:'BODYTEC',bg:'#e4002b',fg:'#ffffff',style:'caps'},win:4,door:'c'}],
                   ['Pharmacy',0.81,4.6,{poi:'osm:n10098116483',sign:{text:'ΦΑΡΜΑΚΕΙΟ',bg:'#ffffff',fg:'#1f8a3c',style:'caps'},win:3,cross:1,door:'c'}]]};
SHOPS[ID.k6]={3:[['Pharmacy',0.20,4.6,{poi:'osm:n10098113939',sign:{text:'ΦΑΡΜΑΚΕΙΟ',bg:'#ffffff',fg:'#1f8a3c',style:'caps'},win:3,cross:1,door:'c'}],
                 ['Dust Cream',0.84,3.8,{poi:'osm:n10098067666',sign:{bg:'#141414',fg:'#c9a961',style:'serif'},win:3,door:'c'}]]};
SHOPS[ID.voda]={2:[['Πίσχος',0.17,4.4,{poi:'osm:n10098103378',sign:{text:'ΠΙΣΧΟΣ',sub:'ΟΠΤΙΚΑ',bg:'#141414',fg:'#ffffff',style:'caps'},win:3,door:'l'}],
                   ['Vodafone',0.51,4.8,{poi:'osm:n10098090459',sign:{text:'vodafone',bg:'#e60000',fg:'#ffffff',style:'sans'},win:2,door:'l'}],
                   ['Pharmacy 295',0.85,4.0,{poi:'osm:n10098067665',sign:{text:'ΦΑΡΜΑΚΕΙΟ',sub:'PHARMACY 295',bg:'#ffffff',fg:'#1f8a3c',style:'caps'},win:3,cross:1,door:'c'}]]};
SHOPS[ID.leo]={3:[['Leonidas',0.5,4.4,{poi:'osm:n10098070077',sign:{text:'Leonidas',sub:'BELGIAN CHOCOLATES',bg:'#0b2a5b',fg:'#c9a961',style:'serif'},win:1,door:'c'}]],
               1:[['Xana',0.29,3.2,{poi:'osm:n10098090460',sign:{text:'XANA',bg:'#1a1a1a',fg:'#ffffff',style:'caps'},win:0,door:'c'}],
                  ['Πίσχος Οπτικά',0.46,3.0,{poi:'ov:e3486675-45e1-452d-81b4-590766969b58',sign:{text:'ΠΙΣΧΟΣ',sub:'ΟΠΤΙΚΑ',bg:'#141414',fg:'#ffffff',style:'caps'},win:3,door:'c'}],
                  ['La Vie En Rose',0.62,3.0,{poi:'osm:n10098089439',sign:{bg:'#f6e6ea',fg:'#7a2a44',style:'script'},win:3,door:'c'}],
                  ['Σφαντος',0.90,2.8,{poi:'osm:n10098100531',sign:{text:'ΣΦΑΝΤΟΣ',sub:'ΚΑΘΑΡΙΣΤΗΡΙΑ',bg:'#2a5b8a',fg:'#ffffff',style:'caps'},win:4,door:'c'}]]};

/* ============================== MATERIAL TILES (registered at script load) ============================== */
const VF=true;
const uvR=(x0,y0,x1,y1)=>VF?[x0/240,x1/240,1-y1/240,1-y0/240]:[x0/240,x1/240,y0/240,y1/240];
const FS='Georgia,"Times New Roman",serif',FA='"Helvetica Neue",Helvetica,Arial,sans-serif';
function fit(g,txt,w,h,fam,wt){let fs=Math.max(6,Math.floor(h));g.font=wt+' '+fs+'px '+fam;while(fs>5&&g.measureText(txt).width>w){fs-=1;g.font=wt+' '+fs+'px '+fam}return fs}
function band(g,m,x,y,w,h,s){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.fillStyle=s.bg;g.fillRect(x,y,w,h);
  const fam=(s.style==='serif'||s.style==='script')?FS:FA,wt=s.style==='script'?'italic bold':(s.style==='serif'?'bold':'bold');const txt=s.style==='caps'?s.text.toUpperCase():s.text;
  g.fillStyle=s.fg;g.textAlign='center';g.textBaseline='middle';
  if(s.sub){fit(g,txt,w*0.86,h*0.56,fam,wt);g.fillText(txt,x+w/2,y+h*0.40);fit(g,s.sub,w*0.7,h*0.19,FA,'bold');g.fillText(s.sub,x+w/2,y+h*0.83)}
  else{fit(g,txt,w*0.86,h*0.66,fam,wt);g.fillText(txt,x+w/2,y+h*0.54)}
  g.restore();if(s.lit!==false){m.fillStyle='#fff';m.fillRect(x,y,w,h)}}
const SG_ROWS=6,SG_TILES=8;
let _sl=null;function signList(){if(_sl)return _sl;const L=[],seen=new Set();for(const id in SHOPS)for(const e in SHOPS[id])for(const s of SHOPS[id][e]){const o=s[3]||{};if(!o.sign)continue;const sg=Object.assign({text:s[0]},o.sign);const k=sg.text+'|'+(sg.sub||'')+'|'+sg.bg+'|'+sg.fg;if(seen.has(k))continue;seen.add(k);sg.key=k;L.push(sg)}
  // Varsos fascia + blade
  L.push({key:'varsos',text:'ΒΑΡΣΟΣ',sub:'ΖΑΧΑΡΟΠΛΑΣΤΕΙΟ · 1892',bg:'#f7f1e3',fg:'#7a1f2b',style:'serif'});
  _sl=L;KV.signs=L.map(s=>s.text);return L}
const sgKey=o=>{const s=Object.assign({},o.sign);return (s.text)+'|'+(s.sub||'')+'|'+s.bg+'|'+s.fg};
function signUV(key){const L=signList();const i=L.findIndex(s=>s.key===key);if(i<0||i>=SG_ROWS*SG_TILES)return null;const k=Math.floor(i/SG_ROWS),r=i%SG_ROWS;return{tile:T['kSg'+k],uv:uvR(0,r*40,240,r*40+40),sg:L[i]}}
for(let k=0;k<SG_TILES;k++)defTile('kSg'+k,(g,S,m)=>{const L=signList();for(let r=0;r<SG_ROWS;r++){const s=L[k*SG_ROWS+r];if(!s){g.fillStyle='#e8e2d6';g.fillRect(0,r*40,240,40);continue}band(g,m,0,r*40,240,40,s)}},{spec:0.08,shin:40,glowK:1.5});
/* shop window displays, 4 quadrants (0 clothes, 1 café / food, 2 tech shop, 3 pharmacy / beauty) + bank strip at the bottom-right half of q3 row */
const WQ=[uvR(0,0,120,120),uvR(120,0,240,120),uvR(0,120,120,240),uvR(120,120,240,240)];
defTile('kWin',(g,S,m)=>{
  // q0 clothes boutique: pale wall, rail with garments, two mannequins, spot lights
  g.fillStyle='#efe9e0';g.fillRect(0,0,120,120);g.fillStyle='#cdbfae';g.fillRect(0,92,120,28);g.fillStyle='#8a7d6c';g.fillRect(6,30,108,2);
  const cl=['#2a2a2e','#b9a58c','#f4f0e8','#7b2d2d','#3b4a63','#d9c6a8','#5a5a52'];for(let i=0;i<16;i++){g.fillStyle=cl[(i*5)%cl.length];g.fillRect(8+i*6.6,32,5.4,26+((i*7)%3)*5)}
  for(const mx of[30,86]){g.fillStyle='#e9e2d6';g.beginPath();g.arc(mx,52,4.5,0,TAU);g.fill();g.fillStyle=mx<50?'#1f1f22':'#c9b08c';g.fillRect(mx-7,57,14,26);g.fillRect(mx-6,83,12,9);g.fillStyle='#777';g.fillRect(mx-0.6,92,1.2,8)}
  for(let i=0;i<4;i++){const l=g.createRadialGradient(15+i*30,4,1,15+i*30,8,24);l.addColorStop(0,'rgba(255,250,235,1)');l.addColorStop(1,'rgba(255,250,235,0)');g.fillStyle=l;g.fillRect(0,0,120,50)}
  // q1 café / food: warm wall, back counter, shelves with bottles/jars, pendant lamps, tables
  g.fillStyle='#d9b88f';g.fillRect(120,0,120,120);g.fillStyle='#6b4a32';g.fillRect(120,0,120,12);g.fillStyle='#4a3324';g.fillRect(128,70,104,26);g.fillStyle='#e8ddc8';g.fillRect(128,68,104,4);
  for(let r=0;r<2;r++){g.fillStyle='#5a3d28';g.fillRect(130,28+r*18,100,2);for(let i=0;i<14;i++){g.fillStyle=['#c98a3d','#e9e2d0','#7a3e1e','#3a5a3a','#d65a4a'][(i+r)%5];g.fillRect(132+i*7,19+r*18,4.5,9)}}
  for(let i=0;i<3;i++){g.fillStyle='#222';g.fillRect(140+i*32,12,1,10);const l=g.createRadialGradient(140.5+i*32,24,1,140.5+i*32,24,16);l.addColorStop(0,'rgba(255,214,150,1)');l.addColorStop(1,'rgba(255,214,150,0)');g.fillStyle=l;g.fillRect(120,8,120,40)}
  g.fillStyle='#8f6b4a';g.fillRect(120,104,120,16);g.fillStyle='#2b211a';for(let i=0;i<3;i++){g.fillRect(132+i*36,98,22,3);g.fillRect(142+i*36,100,2,14)}
  // q2 tech / phone shop: white, bright, display tables with devices, big poster
  g.fillStyle='#f6f7f8';g.fillRect(0,120,120,120);g.fillStyle='#d9dde0';g.fillRect(0,214,120,26);g.fillStyle='#2b6fd6';g.fillRect(10,132,46,40);g.fillStyle='#f2f4f6';g.fillRect(14,136,38,32);g.fillStyle='#1b1b1d';g.fillRect(26,142,14,22);
  g.fillStyle='#e23b3b';g.fillRect(66,132,44,22);g.fillStyle='#ffffff';g.fillRect(70,138,36,4);g.fillRect(70,145,24,3);
  for(const tx of[8,64]){g.fillStyle='#e6e3dc';g.fillRect(tx,192,48,8);g.fillStyle='#bfbab0';g.fillRect(tx+4,200,40,16);for(let i=0;i<5;i++){g.fillStyle='#1b1b1d';g.fillRect(tx+3+i*9,186,6,6)}}
  for(let i=0;i<6;i++){g.fillStyle='rgba(255,255,255,.95)';g.fillRect(4+i*20,122,12,3)}
  // q3 pharmacy / beauty: white shelving walls with colourful packs, glass counter, green accent
  g.fillStyle='#fbfbfa';g.fillRect(120,120,120,120);g.fillStyle='#e0e3e2';g.fillRect(120,214,120,26);
  const pc=['#2e9a46','#ffffff','#e85d8a','#3a7bd5','#f2c230','#d9d9d9','#9a6ac8','#f08a24'];for(let r=0;r<5;r++){g.fillStyle='#d2d6d5';g.fillRect(124,134+r*14,112,1.6);for(let i=0;i<18;i++){g.fillStyle=pc[(i*3+r*5)%pc.length];g.fillRect(125+i*6.2,126+r*14,4.6,8)}}
  g.fillStyle='rgba(200,225,230,.8)';g.fillRect(150,196,62,18);g.fillStyle='#2e9a46';g.fillRect(150,194,62,3);for(let i=0;i<6;i++){g.fillStyle='rgba(255,255,255,.95)';g.fillRect(124+i*20,122,12,3)}
  m.fillStyle='#fff';m.fillRect(0,0,240,240)},{glass:0.55,glassDark:0.12,spec:0.2,shin:80,glowK:1.6});

/* ============================== GEOMETRY HELPERS (same conventions as 89a_lm_junction.js) ============================== */
function FR(a,c,sg){const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz)||1e-6,ux=dx/L,uz=dz/L;return{a,c,L,ux,uz,nx:sg>0?uz:-uz,nz:sg>0?-ux:ux}}
const P=(f,s,d)=>[f.a[0]+f.ux*s+f.nx*d,f.a[1]+f.uz*s+f.nz*d];
const V=(f,s,d,y)=>{const p=P(f,s,d);return[p[0],y,p[1]]};
let O,CUT;
function fq(B,f,s0,s1,y0,y1,d,col,tile,uv,gl,dir){if(s1-s0<1e-3||y1-y0<1e-3)return;const a=P(f,s0,d),b=P(f,s1,d),k=dir||1;const u=uv||[s0,s1,y0,y1];B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,f.nx*k,f.nz*k,u[0],u[1],u[2],u[3],col,RECT[tile],gl||0)}
function sq(B,f,s,d0,d1,y0,y1,dir,col,tile,gl){if(Math.abs(d1-d0)<1e-3||y1-y0<1e-3)return;const a=P(f,s,d0),b=P(f,s,d1);B.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,f.ux*dir,f.uz*dir,d0,d1,y0,y1,col,RECT[tile],gl||0)}
function hq(B,f,s0,s1,d0,d1,y,down,col,tile,gl){if(s1-s0<1e-3||Math.abs(d1-d0)<1e-3)return;const A=P(f,s0,d0),Bp=P(f,s1,d0),C=P(f,s1,d1),D=P(f,s0,d1);B.hq([A[0],y,A[1]],[Bp[0],y,Bp[1]],[C[0],y,C[1]],[D[0],y,D[1]],[A[0],A[1]],[Bp[0],Bp[1]],[C[0],C[1]],[D[0],D[1]],col,RECT[tile],gl||0,!!down)}
function bx(B,f,s,d,y0,ws,wd,h,col,tile,gl){const p=P(f,s,d);B.box(p[0],y0+h/2,p[1],ws,h,wd,Math.atan2(-f.uz,f.ux),col,RECT[tile],1,gl||0)}
function q3(B,a,b,c,d,ua,ub,uc,ud,col,tile,gl,want){const n=B.nrm(a,b,c);if(n[0]*want[0]+n[1]*want[1]+n[2]*want[2]<0)B.quad(d,c,b,a,ud,uc,ub,ua,col,RECT[tile],gl||0);else B.quad(a,b,c,d,ua,ub,uc,ud,col,RECT[tile],gl||0)}
function t3(B,a,b,c,ua,ub,uc,col,tile,gl,want){const n=B.nrm(a,b,c);if(n[0]*want[0]+n[1]*want[1]+n[2]*want[2]<0)B.tri(a,c,b,ua,uc,ub,col,RECT[tile],gl||0);else B.tri(a,b,c,ua,ub,uc,col,RECT[tile],gl||0)}
function wallHoles(B,f,S0,S1,Y0,Y1,d,holes,col,tile){holes=holes.filter(h=>h[1]>S0&&h[0]<S1).sort((a,b)=>a[0]-b[0]);let cur=S0;
  for(const h of holes){const h0=Math.max(h[0],cur),h1=Math.min(h[1],S1);if(h1<=h0)continue;if(h0>cur)fq(B,f,cur,h0,Y0,Y1,d,col,tile);if(h[2]>Y0)fq(B,f,h0,h1,Y0,Math.min(h[2],Y1),d,col,tile);if(h[3]<Y1)fq(B,f,h0,h1,Math.max(h[3],Y0),Y1,d,col,tile);cur=h1}
  if(S1>cur)fq(B,f,cur,S1,Y0,Y1,d,col,tile)}
const ALU=H('#d4d6d6'),MARBLE=H('#eeebe4'),C_SILL=H('#e9e6de'),WHITE=H('#f6f3ea'),BLACK=H('#18191b');
/* recessed opening: o {glass, uv, glassCol, gl, frame, fw, mull, tr, door:[s0,s1], shut, shutCol, sill, rev, revT, sillCol} */
function opening(B,f,s0,s1,y0,y1,dep,o){const rev=o.rev||MARBLE,rt=o.revT||tm('plaster'),fc=o.frame||ALU,fw=o.fw||0.06;
  sq(B,f,s0,0,-dep,y0,y1,1,shade(rev,0.86),rt);sq(B,f,s1,0,-dep,y0,y1,-1,shade(rev,0.86),rt);hq(B,f,s0,s1,-dep,0,y0,false,o.sillCol||C_SILL,tm('marble'));hq(B,f,s0,s1,-dep,0,y1,true,shade(rev,0.7),rt);
  fq(B,f,s0,s1,y0,y1,-dep,o.glassCol||C1,o.glass!=null?o.glass:tt('jGlass','glassR'),o.uv||[0,1,0,1],o.gl||0);
  const d=-dep+0.025;fq(B,f,s0,s0+fw,y0,y1,d,fc,T.white);fq(B,f,s1-fw,s1,y0,y1,d,fc,T.white);fq(B,f,s0,s1,y1-fw,y1,d,fc,T.white);fq(B,f,s0,s1,y0,y0+fw*1.4,d,fc,T.white);
  const n=o.mull||1;for(let i=1;i<n;i++){const s=s0+(s1-s0)*i/n;fq(B,f,s-fw/2,s+fw/2,y0,o.tr||y1,d,fc,T.white)}
  if(o.tr&&o.tr<y1-0.1){fq(B,f,s0,s1,o.tr-fw/2,o.tr+fw/2,d,fc,T.white);const nt=o.trMull||0;for(let i=1;i<nt;i++){const s=s0+(s1-s0)*i/nt;fq(B,f,s-fw/3,s+fw/3,o.tr,y1,d,fc,T.white)}}
  if(o.door){const [a,b]=o.door;fq(B,f,a-fw,a+fw*0.5,y0,o.tr||y1,d+0.01,fc,T.white);fq(B,f,b-fw*0.5,b+fw,y0,o.tr||y1,d+0.01,fc,T.white);const m=(a+b)/2;bx(B,f,m-0.1,d+0.05,y0+0.95,0.03,0.05,0.75,H('#b8bcbe'),T.white);bx(B,f,m+0.1,d+0.05,y0+0.95,0.03,0.05,0.75,H('#b8bcbe'),T.white)}
  if(o.shut>0){const hh=(y1-y0)*Math.min(1,o.shut);fq(B,f,s0+fw,s1-fw,y1-hh,y1-fw,d+0.02,o.shutCol||H('#d9d3c3'),tm('shutterM'))}
  if(o.sill)bx(B,f,(s0+s1)/2,0.05,y0-0.06,s1-s0+0.14,0.1,0.06,C_SILL,tm('marble'))}
function outline(ps,sg,dOf){const n=ps.length,E=[];for(let i=0;i<n;i++)E.push(FR(ps[i],ps[(i+1)%n],sg));const out=[];
  for(let j=0;j<n;j++){const e0=E[(j-1+n)%n],e1=E[j],d0=dOf((j-1+n)%n),d1=dOf(j);const p=ps[j];
    const a0=[p[0]+e0.nx*d0,p[1]+e0.nz*d0],a1=[p[0]+e1.nx*d1,p[1]+e1.nz*d1];const cr=e0.ux*e1.uz-e0.uz*e1.ux;
    if(Math.abs(cr)<0.08||(d0===0&&d1===0)){out.push(Math.abs(d0)>Math.abs(d1)?a0:a1);continue}
    const t=((a1[0]-a0[0])*e1.uz-(a1[1]-a0[1])*e1.ux)/cr;const q=[a0[0]+e0.ux*t,a0[1]+e0.uz*t];const lim=3*Math.max(Math.abs(d0),Math.abs(d1))+0.5;
    out.push(Math.hypot(q[0]-p[0],q[1]-p[1])>lim?(Math.abs(d0)>Math.abs(d1)?a0:a1):q)}
  return out}
function polyRoof(B,ps,y,col,tile){const tris=triangulate([ps]);for(const t of tris){let [a,b,c]=t;const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr>0){const q=b;b=c;c=q}
  B.tri([a[0],y,a[1]],[b[0],y,b[1]],[c[0],y,c[1]],[a[0],a[1]],[b[0],b[1]],[c[0],c[1]],col,RECT[tile],0,true)}}
function awning(B,Cb,f,s0,s1,yTop,proj,drop,col,valCol){const c=H(col),y1=yTop-drop;const A=V(f,s0,0.04,yTop),Bv=V(f,s1,0.04,yTop),C=V(f,s1,proj,y1),D=V(f,s0,proj,y1);const up=[f.nx*0.3,1,f.nz*0.3],dn=[-f.nx*0.3,-1,-f.nz*0.3];
  const L=s1-s0,fab=tt('jFabric','awnS');q3(B,A,Bv,C,D,[0,0],[L,0],[L,proj],[0,proj],c,fab,0,up);q3(B,A,Bv,C,D,[0,0],[L,0],[L,proj],[0,proj],shade(c,0.62),fab,0,dn);
  // straight valance 22 cm (both faces)
  const vh=0.22;fq(B,{a:P(f,s0,proj),c:P(f,s1,proj),L,ux:f.ux,uz:f.uz,nx:f.nx,nz:f.nz},0,L,y1-vh,y1,0,valCol?H(valCol):c,fab);fq(B,{a:P(f,s0,proj),c:P(f,s1,proj),L,ux:f.ux,uz:f.uz,nx:f.nx,nz:f.nz},0,L,y1-vh,y1,-0.01,shade(c,0.6),fab,null,0,-1);
  t3(B,A,D,[D[0],yTop,D[2]],[0,0],[proj,0],[proj,0.3],shade(c,0.8),fab,0,[-f.ux,0,-f.uz]);t3(B,Bv,C,[C[0],yTop,C[2]],[0,0],[proj,0],[proj,0.3],shade(c,0.8),fab,0,[f.ux,0,f.uz]);
  // folding arms
  for(const s of[s0+0.15,s1-0.15]){const a=V(f,s,0.05,yTop-0.35),b=V(f,s,proj-0.05,y1+0.02);B.box((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,0.04,0.04,Math.hypot(b[0]-a[0],b[2]-a[2]),Math.atan2(f.nx,f.nz),H('#c8cacc'),RECT[T.white],1,0)}}

/* ============================== DATA HELPERS ============================== */
let ROADPTS=null;// Kassaveti carriageway centrelines [[x,z],...] segments
function kassRoad(){if(ROADPTS)return ROADPTS;ROADPTS=[];try{const ni=MAP.names.indexOf('Κασσαβέτη');for(const r of MAP.roads){if(r[1]!==ni)continue;const c=r.slice(8);const ps=[];for(let i=0;i+1<c.length;i+=2)ps.push([c[i]/10,c[i+1]/10]);ROADPTS.push({ps,w:r[3]})}}catch(e){}return ROADPTS}
function roadDist(x,z){let best=1e9;for(const r of kassRoad())for(let i=0;i<r.ps.length-1;i++){const a=r.ps[i],b=r.ps[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1);best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t))}return best}
const swY=(x,z)=>terr(x,z)+0.16;
let SPEC=null;try{fetch('data/buildings_spec.json').then(r=>r.ok?r.json():null).then(d=>{if(d)SPEC=d}).catch(()=>{})}catch(e){}

/* ============================== SHOPFRONT ============================== */
const CAT_TINT=['#fff6ec','#ffe2bf','#eef3ff','#ffffff','#eef2f6'];
/* one shop unit on edge f between s0..s1. yb = local sidewalk level, top = first-floor level. cfg: building config. returns hole */
function shopUnit(f,s0,s1,yb,top,u,cfg){const o=u.o||{},w=s1-s0;const gT=Math.min(top-0.95,yb+3.25);const win=o.win==null?0:o.win;
  const fr=H(o.frame||cfg.shopFrame||'#2f3032');const dw=Math.min(1.15,w*0.36);const dpos=o.door||'c';const dc=dpos==='l'?s0+0.2+dw/2:dpos==='r'?s1-0.2-dw/2:(s0+s1)/2;
  opening(O,f,s0,s1,yb+0.02,gT,0.24,{glass:T.kWin,uv:WQ[win===4?2:win],glassCol:H(win===4?'#e8eef4':CAT_TINT[win]),gl:1,frame:fr,fw:0.07,mull:Math.max(1,Math.round(w/1.9)),tr:yb+2.55,trMull:Math.max(1,Math.round(w/1.9)),door:o.bankWin?null:[dc-dw/2,dc+dw/2],rev:H(cfg.gfRev||'#e8e4dc'),revT:tm('marbleW')});
  // stall riser (marble) under the fixed panes
  if(!o.full)for(const [a,b] of[[s0+0.07,dc-dw/2-0.06],[dc+dw/2+0.06,s1-0.07]])if(b-a>0.3&&!o.bankWin)fq(O,f,a,b,yb+0.02,yb+0.32,-0.2,H(cfg.riser||'#d8d3c8'),tm('marbleW'));
  // roller-shutter box over the glazing
  bx(O,f,(s0+s1)/2,0.03,gT,w-0.04,0.08,0.26,H(cfg.boxCol||'#cfcac0'),tm('metalL'));
  KV.doors[o.poi||u.name]={x:P(f,dc,0)[0],z:P(f,dc,0)[1],nx:f.nx,nz:f.nz,w,name:u.name};
  const hole=[s0,s1,yb+0.02,gT+0.26];
  if(o.bankWin)return hole;
  // fascia (panel with the plain-text name) between the shutter box and the first-floor slab
  const fy0=gT+0.3,fy1=Math.min(top-0.12,fy0+0.95);
  if(o.sign&&fy1-fy0>0.3){const su=signUV(sgKey(o));const bg=H(o.sign.bg);bx(O,f,(s0+s1)/2,0.07,fy0,w-0.06,0.12,fy1-fy0,bg,T.white);
    if(su){const h=Math.min(fy1-fy0-0.12,(w-0.25)/6),sw=h*6,c=(s0+s1)/2,yc=(fy0+fy1)/2;fq(O,f,c-sw/2,c+sw/2,yc-h/2,yc+h/2,0.135,C1,su.tile,su.uv,1)}
  }
  if(o.cross){// green pharmacy cross, projecting, glowing both faces (the standard Greek pharmacy sign)
    const cs=s1-0.15,yc=fy1+0.55,GC=H('#2fd35a');bx(O,f,cs,0.15,yc-0.05,0.06,0.3,0.1,H('#7a7c7e'),tm('metalL'));
    bx(O,f,cs,0.62,yc-0.36,0.1,0.24,0.72,GC,T.white,1);bx(O,f,cs,0.62,yc-0.12,0.1,0.72,0.24,GC,T.white,1)}
  if(o.awn)awning(O,CUT,f,s0+0.05,s1-0.05,Math.min(top-0.08,fy1+0.06),o.terr?2.4:1.5,0.55,o.awn);
  return hole}

/* outdoor terrace: tables + chairs (+ umbrellas / planters) in front of a unit, kept clear of the carriageway */
function terrace(f,s0,s1,yb,spec){const n=spec.n||2;let dMax=4.2;const sm=(s0+s1)/2;for(let d=1.2;d<=4.6;d+=0.2){const p=P(f,sm,d);if(roadDist(p[0],p[1])<4.9){dMax=d-0.2;break}}if(dMax<1.6)return;
  const rows=dMax>3.2?2:1,per=Math.ceil(n/rows),CH=spec.chairs==='rattan'?H('#c9a874'):spec.chairs==='wood'?H('#6e5136'):H('#3a3b3c');
  for(let r=0;r<rows;r++)for(let i=0;i<per;i++){const ts=s0+0.7+(i+0.5)*(s1-s0-1.4)/per,td=1.25+r*1.6;if(td>dMax-0.5)continue;const p=P(f,ts,td);const y=swY(p[0],p[1]);
    O.cyl(p[0],y,p[1],0.04,0.04,0.72,6,H('#262626'),RECT[T.white],false);O.cyl(p[0],y+0.72,p[1],0.33,0.33,0.03,12,H(spec.chairs==='wood'?'#2a2a2a':'#efece6'),RECT[tm('marble')],true);
    for(const sd of[-1,1])chair(f,ts+sd*0.52,td,y,-sd,CH);addBoxC(p[0],p[1],0.35,'p')}
  if(spec.umb)for(let i=0;i<Math.max(1,Math.round((s1-s0)/4));i++){const us=s0+(i+0.5)*(s1-s0)/Math.max(1,Math.round((s1-s0)/4));const p=P(f,us,Math.min(dMax-1.0,1.9));const y=swY(p[0],p[1]);umbrella(p[0],y,p[1],1.35,spec.umb)}
  for(const s of[s0+0.2,s1-0.2]){const p=P(f,s,Math.min(dMax-0.3,2.6));const y=swY(p[0],p[1]);O.box(p[0],y+0.25,p[1],0.45,0.5,0.45,Math.atan2(-f.uz,f.ux),H('#3c3a36'),RECT[tm('concrete')],1,0);O.cyl(p[0],y+0.5,p[1],0.28,0.18,0.55,7,H('#4f6b3a'),RECT[T.hedge],true)}}
function chair(f,s,d,y,face,C){bx(O,f,s,d,y+0.44,0.44,0.44,0.05,C,tm('wood'));bx(O,f,s+face*0.2,d,y+0.49,0.05,0.44,0.42,C,tm('wood'));for(const a of[[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]])bx(O,f,s+a[0],d+a[1],y,0.03,0.03,0.44,shade(C,0.7),T.white)}
function umbrella(x,y,z,r,col){const c=H(col),N=8,h=0.45,yt=y+2.35;O.cyl(x,y,z,0.03,0.03,yt+h-y,5,H('#5a5550'),RECT[T.white],false);O.cyl(x,y,z,0.22,0.22,0.06,8,H('#3a3a3a'),RECT[T.white],true);
  for(let i=0;i<N;i++){const a0=i/N*TAU,a1=(i+1)/N*TAU;const p0=[x+Math.cos(a0)*r,yt,z+Math.sin(a0)*r],p1=[x+Math.cos(a1)*r,yt,z+Math.sin(a1)*r],tp=[x,yt+h,z];
    t3(O,p0,p1,tp,[0,0],[1,0],[0.5,1],c,tt('jFabric','awnS'),0,[Math.cos((a0+a1)/2),1,Math.sin((a0+a1)/2)]);t3(O,p0,p1,tp,[0,0],[1,0],[0.5,1],shade(c,0.6),tt('jFabric','awnS'),0,[-Math.cos((a0+a1)/2),-1,-Math.sin((a0+a1)/2)]);
    O.box((p0[0]+p1[0])/2,yt-0.1,(p0[2]+p1[2])/2,0.02,0.2,r*0.78,-(a0+a1)/2,c,RECT[T.white],1,0)}}
/* resolve units of an edge (explicit centres / widths) → [{s0,s1,name,o}] without overlaps */
function units(f,list,m0,m1){const L=f.L;const U=list.map(s=>{const w=Math.min(s[2],L-m0-m1);const c=clamp(s[1]*L,m0+w/2,L-m1-w/2);return{c,w,name:s[0],o:s[3]||{}}}).sort((a,b)=>a.c-b.c);
  for(const u of U){u.s0=u.c-u.w/2;u.s1=u.c+u.w/2}
  for(let i=0;i<U.length-1;i++){const a=U[i],b=U[i+1];if(a.s1>b.s0-0.35){const m=(a.s1+b.s0)/2;a.s1=Math.max(a.s0+1.6,m-0.18);b.s0=Math.min(b.s1-1.6,m+0.18)}}
  return U.filter(u=>u.s1-u.s0>1.2)}
/* residential entrance: glass door in a marble surround + canopy slab + brass name plates */
function entrance(f,c,yb,dw){const holes=[[c-dw/2,c+dw/2,yb+0.02,yb+2.65]];opening(O,f,c-dw/2,c+dw/2,yb+0.02,yb+2.65,0.3,{glass:tt('jShop','lobby'),glassCol:H('#c8c0b0'),gl:0.7,frame:H('#2f3032'),fw:0.07,mull:2,tr:yb+2.15,rev:H('#efece6'),revT:tm('marbleW'),door:[c-dw/2+0.05,c+dw/2-0.05]});
  bx(O,f,c,0.5,yb+2.8,dw+0.8,1.0,0.1,H('#efece6'),tm('marble'));fq(O,f,c-dw/2-0.22,c+dw/2+0.22,yb+0.02,yb+2.95,0.03,H('#e9e5dc'),tm('marbleW'));
  for(let i=0;i<3;i++)bx(O,f,c+dw/2+0.35,0.04,yb+1.25+i*0.22,0.24,0.02,0.16,H('#b89a5a'),tm('metalL'));return holes}

/* ============================== POLYKATOIKIA BLOCK ============================== */
const CFG={};
CFG[ID.k3]={lv:4,gfH:4.3,fh:3.0,wall:'#f1ece0',front:[21,16],rail:'alu',railCol:'#c9cdd1',dep:1.3,setTop:1.7,shut:'#d8d1c0',frame:'#e3e2dc',awn:['#c9c2b0','#3d5f4a',null,'#8a8f86'],solar:0,ant:1,gfRev:'#e2ded4',shopFrame:'#1d1e20',entr:{16:0.5}};
CFG[ID.k7]={lv:3,gfH:4.2,fh:3.0,wall:'#f0ebe2',front:[1],rail:'iron',railCol:'#2a2c2d',dep:1.3,shut:'#cdc6b4',frame:'#ebe9e3',awn:['#d8ccb2','#7a3b2a',null,'#3d5f8a'],solar:3,entr:{1:0.635},shopFrame:'#2b2c2e'};
CFG[ID.k4]={lv:3,gfH:4.2,fh:3.0,wall:'#efe9dc',front:[10,0,1],rail:'masonry',dep:1.2,shut:'#7a5a3a',frame:'#5a4636',shutters:'timber',awn:['#5b1f2a',null,'#c9c2b0'],solar:2,entr:{0:0.62,1:0.5},shopFrame:'#2a2b2d',planters:true};
CFG[ID.occ]={lv:4,gfH:4.2,fh:3.05,wall:'#e5cfae',front:[16,11],rail:'masonry',dep:1.4,setTop:1.6,shut:'#efe9dc',frame:'#f2efe8',awn:['#d8ccb2',null,'#6b7b5a'],solar:2,planters:true,riser:'#cdbb9c',gfRev:'#d9c7a6',shopFrame:'#3a2f26'};
CFG[ID.k6]={lv:4,gfH:4.2,fh:3.0,wall:'#f3eee3',front:[3],rail:'alu',railCol:'#d0d3d5',dep:1.3,setTop:1.6,shut:'#d6cfbf',frame:'#e6e4de',awn:['#2f5a3a','#d8ccb2',null],solar:3,entr:{3:0.56},shopFrame:'#e8e6e0'};
CFG[ID.voda]={lv:4,gfH:4.2,fh:3.0,wall:'#ece3cc',front:[2],rail:'alu',railCol:'#bfc3c6',dep:1.3,shut:'#cfc6b0',frame:'#d9d6cf',awn:['#8a8f86','#c58a3a',null,'#d8ccb2'],solar:3,shopFrame:'#2a2b2d'};
CFG[ID.leo]={lv:3,gfH:4.5,fh:3.1,wall:'#f4f2ed',front:[3,2,1],rail:'glass',dep:0,recess:1.5,frame:'#3a3d40',shut:null,solar:0,gfMat:'stone',shopFrame:'#141414',entr:{2:0.5}};
function buildBlock(ps0,id,b){const cfg=CFG[id];if(!cfg)return false;const ps=ps0.slice();const n=ps.length;const sg=polyArea(ps)>0?1:-1;const seed=(b[5]|0)+11;const front=new Set(cfg.front.filter(e=>e<n));
  const sp=SPEC&&SPEC[id];if(sp){if(sp.levels>=2&&sp.levels<=6)cfg.lv=sp.levels;if(sp.floorH>2.7&&sp.floorH<3.5)cfg.fh=sp.floorH}
  const wallC=H(cfg.wall);const E=[];for(let i=0;i<n;i++)E.push(FR(ps[i],ps[(i+1)%n],sg));
  let gmin=Infinity,gmaxF=-Infinity;for(const p of ps)gmin=Math.min(gmin,terr(p[0],p[1]));for(const i of front){const f=E[i];for(const s of[0.3,f.L/2,f.L-0.3]){const p=P(f,s,0.8);gmaxF=Math.max(gmaxF,swY(p[0],p[1]))}}
  if(!isFinite(gmaxF))gmaxF=gmin+0.2;const base=gmin-0.6,lv=cfg.lv,top1=gmaxF+cfg.gfH,fh=cfg.fh;const yAt=k=>k===0?gmaxF:top1+(k-1)*fh;const top=yAt(lv);
  const cx=ps.reduce((s,p)=>s+p[0],0)/n,cz=ps.reduce((s,p)=>s+p[1],0)/n;const ch=chunkAt(cx,cz);O=ch.o;CUT=ch.cut;const v0=O.size()+CUT.size();
  for(let i=0;i<n;i++)if(E[i].L>0.05)addSeg(ps[i][0],ps[i][1],ps[(i+1)%n][0],ps[(i+1)%n][1],'b');
  const off=(e,k)=>{let d=[0,0,null];if(k>0&&front.has(e)){if(cfg.recess)d=[-cfg.recess,0,cfg.rail];else{d=[0,cfg.dep||0,cfg.rail];if(cfg.setTop&&k===lv-1)d=[-cfg.setTop,cfg.dep||0,cfg.rail]}}return d};
  const gfT=cfg.gfMat==='stone'?tm('ashlar'):tm('marbleW'),gfC=cfg.gfMat==='stone'?H('#d6cdbd'):H(cfg.gfRev||'#e6e2d8');
  const sh=SHOPS[id]||{};
  // ---------- ground floor ----------
  for(let i=0;i<n;i++){const f=E[i];if(f.L<0.05)continue;const isF=front.has(i);
    if(!isF){fq(O,f,0,f.L,base,top1,0,shade(wallC,0.9),tm('plaster'));continue}
    const holes=[];const list=sh[i]||[];const U=units(f,list,f.L>4?0.3:0.05,f.L>4?0.3:0.05);
    for(const u of U){const p=P(f,(u.s0+u.s1)/2,0.8);const yb=Math.min(swY(p[0],p[1]),top1-3.6);holes.push(shopUnit(f,u.s0,u.s1,yb,top1,u,cfg));if(u.o.terr)terrace(f,u.s0,u.s1,yb,u.o.terr);
      placed('lm_shop',P(f,(u.s0+u.s1)/2,0)[0],P(f,(u.s0+u.s1)/2,0)[1],u.name,'lm-kassaveti');SHOPFRONTS.push({a:P(f,u.s0,0),c:P(f,u.s1,0),nx:f.nx,nz:f.nz,L:u.s1-u.s0})}
    const et=cfg.entr&&cfg.entr[i];if(et!=null){const c=et*f.L;const p=P(f,c,0.8);for(const h of entrance(f,c,Math.min(swY(p[0],p[1]),top1-3),1.5))holes.push(h)}
    else if(!U.length&&f.L>=2.5){// windows of a ground-floor office / flat
      const nb=Math.max(1,Math.round(f.L/3.2));for(let k=0;k<nb;k++){const c=(k+0.5)*f.L/nb,w=Math.min(1.4,f.L/nb-0.8);if(w<0.6)continue;const p=P(f,c,0.8);const yb=swY(p[0],p[1]);opening(O,f,c-w/2,c+w/2,yb+1.0,yb+2.5,0.2,{frame:H(cfg.frame||'#e6e4de'),mull:2,gl:hf(seed+k)>0.5?1:0,sill:true,shut:0.3,shutCol:cfg.shut?H(cfg.shut):null});holes.push([c-w/2,c+w/2,yb+1.0,yb+2.5])}}
    wallHoles(O,f,0,f.L,base,top1,0,holes,gfC,gfT);
    // marble band at first-floor level
    bx(O,f,f.L/2,0.04,top1-0.14,f.L,0.1,0.14,MARBLE,tm('marble'))}
  // ---------- upper floors ----------
  let prevOut=ps;
  for(let k=1;k<lv;k++){const y0=yAt(k),y1=yAt(k+1);const W=outline(ps,sg,e=>off(e,k)[0]),Rr=outline(ps,sg,e=>{const o=off(e,k);return Math.max(o[0],o[1])});
    for(let i=0;i<n;i++){const a=W[i],c=W[(i+1)%n];const f=FR(a,c,sg);if(f.L<0.05)continue;const isF=front.has(i);const o=off(i,k);
      if(!isF){fq(O,f,0,f.L,y0,y1,0,shade(wallC,0.9),tm('plaster'));continue}
      bays(f,y0,y1,k,cfg,seed+i*31+k*7,(o[1]-o[0]>0.6)||cfg.recess,wallC)}
    for(let i=0;i<n;i++){if(!front.has(i))continue;const o=off(i,k);if(o[1]-o[0]<0.05)continue;const j=(i+1)%n;
      const a=W[i],c=W[j],ra=Rr[i],rc=Rr[j],ys=y0;O.hq([a[0],ys,a[1]],[c[0],ys,c[1]],[rc[0],ys,rc[1]],[ra[0],ys,ra[1]],[a[0],a[1]],[c[0],c[1]],[rc[0],rc[1]],[ra[0],ra[1]],H('#d9d4ca'),RECT[tm('marble')],0,false);
      O.hq([a[0],ys-0.2,a[1]],[c[0],ys-0.2,c[1]],[rc[0],ys-0.2,rc[1]],[ra[0],ys-0.2,ra[1]],[0,0],[1,0],[1,1],[0,1],shade(wallC,0.78),RECT[tm('plaster')],0,true);
      const fr=FR(ra,rc,sg);if(fr.L>0.05){fq(O,fr,0,fr.L,ys-0.2,ys+0.04,0,MARBLE,tm('marble'));railing(fr,0,fr.L,ys+0.04,o[2],cfg,-0.06)}
      for(const [p,q,dir] of[[a,ra,-1],[c,rc,1]]){const nb=dir<0?(i-1+n)%n:j;const on=off(nb,k);if(front.has(nb)&&on[1]-on[0]>=0.05)continue;const g=FR(p,q,sg);if(g.L<0.1)continue;
        fq(O,g,0,g.L,ys-0.2,ys+0.04,0,MARBLE,tm('marble'),null,0,1);fq(O,g,0,g.L,ys-0.2,ys+0.04,0,MARBLE,tm('marble'),null,0,-1);railing(g,0,g.L,ys+0.04,o[2],cfg,0)}}
    if(cfg.recess){// recessed loggias: slab edge + glass rail on the original line, ceiling of the loggia
      for(let i=0;i<n;i++){if(!front.has(i))continue;const f=E[i];hq(O,f,0,f.L,-cfg.recess,0,y0,false,H('#d9d4ca'),tm('marble'));hq(O,f,0,f.L,-cfg.recess,0,y1-0.02,true,H('#efece6'),tm('plaster'));fq(O,f,0,f.L,y0-0.25,y0+0.05,0.02,H('#e9e6df'),tm('marbleW'));railing(f,0,f.L,y0+0.05,'glass',cfg,-0.05);
        for(const s of[0,f.L])sq(O,f,s,-cfg.recess,0,y0,y1,s===0?1:-1,wallC,tm('plaster'))}}
    prevOut=W}
  // ---------- roof ----------
  const R=prevOut;polyRoof(O,R,top,H('#d1cdc4'),tm('flatroof'));
  for(let i=0;i<n;i++){const f=FR(R[i],R[(i+1)%n],sg);if(f.L<0.05)continue;fq(O,f,0,f.L,top,top+0.9,0,front.has(i)?wallC:shade(wallC,0.9),tm('plaster'));fq(O,f,0,f.L,top,top+0.9,-0.2,shade(wallC,0.85),tm('plaster'),null,0,-1);
    hq(O,f,0,f.L,-0.2,0.05,top+0.9,false,MARBLE,tm('marble'));fq(O,f,0,f.L,top+0.84,top+0.9,0.05,MARBLE,tm('marble'))}
  roofStuff(R,top,cfg,seed);
  KV.tris+=Math.round((O.size()+CUT.size()-v0)/2);KV.built.push(id);return true}
/* upper-floor facade: balcony doors / windows with roller shutters, fabric awnings and a/c units */
function bays(f,y0,y1,k,cfg,seed,bal,wallC){const L=f.L;if(L<1.3){fq(O,f,0,L,y0,y1,0,wallC,tm('plaster'));return}
  const nb=L<2.8?1:Math.max(1,Math.round((L-0.4)/3.3)),bw=L/nb;const holes=[];const fr=H(cfg.frame||'#e6e4de'),sc=cfg.shut?H(cfg.shut):null;
  for(let i=0;i<nb;i++){const c=(i+0.5)*bw,h=hf(seed*13+i*7+k*101);let w,ya,yb,door;
    if(bal){door=h<0.75||bw<2;w=door?Math.min(bw<2?0.9:1.5,bw-0.5):Math.min(1.6,bw-0.6);ya=door?y0:y0+0.95;yb=y0+2.4}else{door=false;w=Math.min(1.4,bw-0.7);ya=y0+0.95;yb=y0+2.35}if(w<0.5)continue;
    const lit=hf(seed+i*3+k*17)<0.3?1:0;const shut=sc?[0,0,0.12,0.3,0.55,1.0][Math.floor(hf(seed*7+i+k*5)*6)]:0;
    opening(O,f,c-w/2,c+w/2,ya,yb,0.18,{frame:fr,mull:w>1.1?2:1,gl:lit,shut,shutCol:sc,sill:!door});holes.push([c-w/2,c+w/2,ya,yb]);
    bx(O,f,c,0.02,yb,w+0.1,0.06,0.2,shade(wallC,0.96),tm('plaster'));// shutter box
    if(cfg.shutters==='timber'&&sc){for(const sd of[-1,1]){const ss=c+sd*(w/2+w/4+0.03);if(ss-w/4<0.05||ss+w/4>L-0.05)continue;fq(O,f,ss-w/4,ss+w/4,ya,yb,0.04,sc,tm('wood'));sq(O,f,ss+sd*w/4,0,0.04,ya,yb,sd,shade(sc,0.8),tm('wood'))}}
    if(bal&&!cfg.recess){const ac=cfg.awn&&cfg.awn[Math.floor(hf(seed+i*11+k)*cfg.awn.length)];if(ac&&hf(seed*3+i*5+k*9)<0.5)awning(O,CUT,f,c-bw/2+0.15,c+bw/2-0.15,y1-0.24,(cfg.dep||1.3)+0.1,1.0,ac);
      if(hf(seed+i*19+k*3)<0.4){const s=c+(hf(seed+i)<0.5?-1:1)*(w/2+0.55);if(s>0.5&&s<L-0.5){bx(O,f,s,0.35,y0,0.8,0.3,0.55,H('#ecebe7'),T.white);fq(O,f,s-0.3,s+0.2,y0+0.08,y0+0.48,0.505,H('#6a6c6e'),T.white)}}
      if(cfg.planters&&hf(seed+i*23+k)<0.55){const s=c+w/2+0.3;if(s<L-0.3){const p=P(f,s,(cfg.dep||1.3)-0.35);O.cyl(p[0],y0,p[1],0.22,0.18,0.42,8,H('#a0522d'),RECT[T.white],true);O.cyl(p[0],y0+0.42,p[1],0.32,0.1,0.6,7,H('#4d6b34'),RECT[T.hedge],true)}}}}
  wallHoles(O,f,0,L,y0,y1,0,holes,wallC,tm('plaster'))}
function railing(f,s0,s1,y,type,cfg,d){const L=s1-s0;if(L<0.05)return;
  if(type==='masonry'){fq(O,f,s0,s1,y,y+0.95,d,H(cfg.wall),tm('plaster'));fq(O,f,s0,s1,y,y+0.95,d-0.15,H(cfg.wall),tm('plaster'),null,0,-1);hq(O,f,s0,s1,d-0.15,d+0.02,y+0.95,false,MARBLE,tm('marble'));return}
  if(type==='glass'){fq(CUT,f,s0,s1,y+0.08,y+1.0,d,H('#c4d4da'),T.glassR,[0,L,0,1]);bx(O,f,(s0+s1)/2,d,y+1.0,L,0.06,0.05,H('#b8bcbf'),T.white);return}
  const col=type==='alu'?H(cfg.railCol||'#c9cdd1'):H(cfg.railCol||'#2a2c2d');fq(CUT,f,s0,s1,y,y+1.0,d,col,type==='alu'?tt('jRail','rail'):T.rail,[0,L/(type==='alu'?1.0:1.2),0,1]);bx(O,f,(s0+s1)/2,d,y+1.0,L,0.06,0.05,col,T.white)}
function roofStuff(R,top,cfg,seed){let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9;for(const p of R){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}
  let k2=0;for(let k=0;k<30&&k2<(cfg.solar||0);k++){const x=lerp(minx+1.5,maxx-1.5,hf(seed*5+k*7)),z=lerp(minz+1.5,maxz-1.5,hf(seed*11+k*13));if(!pip(R,x,z)||!pip(R,x,z-1.8))continue;k2++;
    O.hq([x-1.0,top+0.35,z-0.6],[x+1.0,top+0.35,z-0.6],[x+1.0,top+1.25,z-1.5],[x-1.0,top+1.25,z-1.5],[0,0],[1,0],[1,1],[0,1],C1,RECT[T.solar],0,false);
    O.box(x,top+1.45,z-1.65,1.9,0.55,0.55,0,H('#efefec'),RECT[T.white],1,0);O.box(x,top+0.6,z-1.4,1.6,1.2,0.06,0,H('#8a8c8e'),RECT[tm('metalL')],1,0)}
  for(let k=0;k<20;k++){const x=lerp(minx+2,maxx-2,hf(seed*3+k)),z=lerp(minz+2,maxz-2,hf(seed*17+k));if(!pip(R,x,z)||!pip(R,x+1.3,z)||!pip(R,x-1.3,z)||!pip(R,x,z+1.3)||!pip(R,x,z-1.3))continue;
    O.box(x,top+1.25,z,2.4,2.5,2.4,0,H(cfg.wall),RECT[tm('plaster')],1,0);O.box(x,top+2.55,z,2.6,0.12,2.6,0,MARBLE,RECT[tm('marble')],1,0);O.cyl(x+0.9,top+2.6,z+0.9,0.025,0.025,2.4,4,H('#9a9ea2'),RECT[T.white],false);
    for(let j=0;j<3;j++)O.box(x+0.9,top+4.2+j*0.3,z+0.9,1.2-j*0.25,0.03,0.03,0.4,H('#9a9ea2'),RECT[T.white],1,0);break}}

/* ============================== NEOCLASSICAL BUILDER ==============================
   used for Kassaveti 1 (photo ref/r11: cream render, grey stone pilasters between the tall ground-floor shop bays, white entablature,
   tall first-floor windows with moulded surrounds and cornice heads, salmon apron panels, small iron balconies on consoles,
   crowning cornice, red-tiled roof, salmon pediment on the gable that faces the square), its east wing and Varsos (Kassaveti 5). */
function neoGround(f,top,cfg,list,pil){const holes=[];const U=units(f,list||[],0.55,0.55);const PIL=H(cfg.pil||'#bdb6a8');
  for(const u of U){const p=P(f,(u.s0+u.s1)/2,0.8);const yb=Math.min(swY(p[0],p[1]),top-3.8);const hole=shopUnit(f,u.s0,u.s1,yb,top,u,Object.assign({gfRev:cfg.pil||'#d8d2c4',boxCol:cfg.boxCol||'#c4bdb0'},cfg));holes.push(hole);if(u.o.terr)terrace(f,u.s0,u.s1,yb,u.o.terr);
    if(!u.o.bankWin){placed('lm_shop',P(f,(u.s0+u.s1)/2,0)[0],P(f,(u.s0+u.s1)/2,0)[1],u.name,'lm-kassaveti');SHOPFRONTS.push({a:P(f,u.s0,0),c:P(f,u.s1,0),nx:f.nx,nz:f.nz,L:u.s1-u.s0})}}
  // pilasters at both ends and between units (stone, proud 12 cm, with base and capital)
  if(pil!==false){const ps=[0.28,f.L-0.28];for(let i=0;i<U.length-1;i++)ps.push((U[i].s1+U[i+1].s0)/2);
    for(const s of ps){const p=P(f,s,0.5);const yb=swY(p[0],p[1])-0.3;bx(O,f,s,0.06,yb,0.5,0.12,top-0.5-yb,PIL,tm('ashlar'));bx(O,f,s,0.08,yb,0.6,0.16,0.55,shade(PIL,0.92),tm('ashlar'));bx(O,f,s,0.09,top-0.62,0.62,0.18,0.18,WHITE,tm('marble'))}}
  return holes}
/* first-floor neoclassical bay windows: o {nb, w, h, sill, head:'cornice'|'pediment', apron(colour|null), balc:[bay indices], shutters colour} */
function neoUpper(f,y0,y1,o,wallC){const holes=[];const L=f.L,nb=o.nb||Math.max(1,Math.round(L/2.9)),bw=L/nb;
  for(let i=0;i<nb;i++){const c=(i+0.5)*bw,w=Math.min(o.w||1.15,bw-0.8);if(w<0.5)continue;const bal=o.balc&&o.balc.indexOf(i)>=0;const ya=bal?y0+0.05:y0+(o.sill||0.75),yb=y0+(o.h||2.75);
    opening(O,f,c-w/2,c+w/2,ya,yb,0.2,{frame:H(o.frame||'#5a4632'),fw:0.07,mull:2,tr:yb-0.6,gl:hf(i*7+(o.seed||0))<0.3?1:0,rev:H('#efe9dc'),sillCol:H('#e8e2d4')});holes.push([c-w/2,c+w/2,ya,yb]);
    // moulded surround (architrave)
    const ac=WHITE;fq(O,f,c-w/2-0.16,c-w/2,ya,yb+0.16,0.05,ac,tm('plasterW'));fq(O,f,c+w/2,c+w/2+0.16,ya,yb+0.16,0.05,ac,tm('plasterW'));fq(O,f,c-w/2,c+w/2,yb,yb+0.16,0.05,ac,tm('plasterW'));
    sq(O,f,c-w/2-0.16,0,0.05,ya,yb+0.16,-1,shade(ac,0.85),tm('plasterW'));sq(O,f,c+w/2+0.16,0,0.05,ya,yb+0.16,1,shade(ac,0.85),tm('plasterW'));
    // head: cornice slab (+ triangular pediment)
    bx(O,f,c,0.1,yb+0.3,w+0.6,0.22,0.12,ac,tm('marble'));bx(O,f,c,0.06,yb+0.16,w+0.42,0.14,0.14,shade(ac,0.95),tm('plasterW'));
    if(o.head==='pediment'){const yp=yb+0.42,hw=w/2+0.3;t3(O,V(f,c-hw,0.1,yp),V(f,c+hw,0.1,yp),V(f,c,0.1,yp+0.42),[0,0],[1,0],[0.5,0.4],ac,tm('plasterW'),0,[f.nx,0,f.nz]);
      for(const sd of[-1,1]){const a=V(f,c+sd*hw,0.14,yp),b=V(f,c,0.14,yp+0.42);q3(O,a,b,[b[0],b[1]+0.08,b[2]],[a[0],a[1]+0.08,a[2]],[0,0],[1,0],[1,0.1],[0,0.1],ac,tm('marble'),0,[f.nx,0.3,f.nz])}}
    if(o.apron&&!bal){fq(O,f,c-w/2,c+w/2,y0+0.12,ya-0.1,0.03,H(o.apron),tm('plaster'));sq(O,f,c-w/2,0,0.03,y0+0.12,ya-0.1,-1,H(o.apron),tm('plaster'));sq(O,f,c+w/2,0,0.03,y0+0.12,ya-0.1,1,H(o.apron),tm('plaster'))}
    if(!bal)bx(O,f,c,0.08,ya-0.1,w+0.4,0.18,0.1,H('#e8e2d4'),tm('marble'));
    if(bal){// marble balcony slab on two scroll consoles, wrought-iron railing
      const bd=o.balcD||0.75,bwid=w+0.9;bx(O,f,c,bd/2,y0-0.12,bwid,bd,0.14,H('#ebe7de'),tm('marble'));for(const sd of[-1,1])bx(O,f,c+sd*(bwid/2-0.18),0.2,y0-0.55,0.16,0.4,0.43,H('#e6e1d6'),tm('marble'));
      const rf={a:P(f,c-bwid/2+0.05,bd-0.05),c:P(f,c+bwid/2-0.05,bd-0.05),L:bwid-0.1,ux:f.ux,uz:f.uz,nx:f.nx,nz:f.nz};railing(rf,0,rf.L,y0+0.02,'iron',{railCol:'#26292a'},0);
      for(const sd of[-1,1]){const s=c+sd*(bwid/2-0.05);const fr2=FR(P(f,s,0.02),P(f,s,bd-0.05),1);fq(CUT,fr2,0,fr2.L,y0+0.02,y0+1.0,0,H('#26292a'),T.rail,[0,fr2.L/1.2,0,1])}}
    if(o.shutters){const sc=H(o.shutters);for(const sd of[-1,1]){const ss=c+sd*(w/2+0.16+w/4);if(ss-w/4<0.05||ss+w/4>L-0.05)continue;fq(O,f,ss-w/4,ss+w/4,ya,yb,0.07,sc,tm('wood'));sq(O,f,ss+sd*w/4,0.0,0.07,ya,yb,sd,shade(sc,0.8),tm('wood'))}}}
  wallHoles(O,f,0,L,y0,y1,0,holes,wallC,tm('plasterW'));return holes}
function entablature(f,y,wallC,big){// white band at first-floor level (architrave + frieze + projecting cornice)
  bx(O,f,f.L/2,0.06,y-0.4,f.L+0.08,0.14,0.4,WHITE,tm('plasterW'));bx(O,f,f.L/2,0.13,y,f.L+0.2,0.28,big?0.16:0.12,WHITE,tm('marble'))}
function crown(f,y,big){// crowning cornice: frieze, dentil band, projecting corona
  bx(O,f,f.L/2,0.05,y-0.55,f.L+0.06,0.12,0.5,WHITE,tm('plasterW'));for(let s=0.15;s<f.L-0.1;s+=0.34)bx(O,f,s,0.16,y-0.16,0.14,0.16,0.12,WHITE,tm('plasterW'));
  bx(O,f,f.L/2,0.25,y-0.04,f.L+0.5,big?0.6:0.45,0.2,WHITE,tm('marble'));bx(O,f,f.L/2,0.15,y-0.2,f.L+0.3,0.3,0.12,shade(WHITE,0.95),tm('plasterW'))}
function quoins(f,s,y0,y1,col){for(let y=y0,k=0;y<y1-0.05;y+=0.5,k++)bx(O,f,s,0.04,y,k%2?0.45:0.7,0.09,0.46,col,tm('plasterW'))}

/* ---- Kassaveti 1: split of OSM way 1075949217 into the neoclassical corner building (west, facing Platanos) and its lower east wing ---- */
function buildK1(ps,b){const sg=polyArea(ps)>0?1:-1;const n=ps.length;if(n!==11){KV.warn.push('k1: unexpected footprint '+n);return buildGenericNeo(ps,b)}
  // cut on the north wall (edge 1) at the step between edge 5 and edge 7 (vertex 6)
  const P1=ps[1],P2=ps[2],P6=ps[6];const t=(P1[0]-P6[0])/(P1[0]-P2[0]);const Q=[P6[0],P1[1]+(P2[1]-P1[1])*t];
  const W=[Q,ps[2],ps[3],ps[4],ps[5],ps[6]],WE=[-1,2,3,4,5,-6];// original edge per sub-edge (-6: party wall with the east wing)
  const Ea=[ps[0],ps[1],Q,ps[6],ps[7],ps[8],ps[9],ps[10]],EE=[0,-1,-6,6,7,8,9,10];
  const cx=(ps[0][0]+ps[5][0])/2,cz=(ps[0][1]+ps[5][1])/2;const ch=chunkAt(cx,cz);O=ch.o;CUT=ch.cut;const v0=O.size()+CUT.size();
  for(let i=0;i<n;i++)addSeg(ps[i][0],ps[i][1],ps[(i+1)%n][0],ps[(i+1)%n][1],'b');
  const sh=SHOPS[ID.k1];
  /* -- west: neoclassical, 2 tall storeys + hip roof with a pediment on the south (Kassaveti / square) gable -- */
  {const cfg={pil:'#bdb6a8',shopFrame:'#2b2e31',riser:'#bdb6a8'};const wallC=H('#eadfc0');let gmin=1e9,gmax=-1e9;for(const p of W){const y=swY(p[0],p[1]);gmin=Math.min(gmin,y);gmax=Math.max(gmax,y)}
    const gfH=5.0,fh=4.5,top1=gmax+gfH,top=top1+fh,base=gmin-0.8;const E=W.map((p,i)=>FR(p,W[(i+1)%W.length],sg));
    for(let i=0;i<E.length;i++){const f=E[i],oe=WE[i];if(f.L<0.05)continue;
      if(oe===4||oe===5){const holes=neoGround(f,top1,cfg,sh[oe]);wallHoles(O,f,0,f.L,base,top1,0,holes,wallC,tm('plasterW'));entablature(f,top1,wallC,true);
        neoUpper(f,top1,top,{nb:oe===5?5:4,w:1.15,h:2.85,sill:0.8,head:'cornice',apron:'#d97a62',balc:oe===5?[2]:[1,2],shutters:null,frame:'#4a3a2c',seed:oe*13},wallC);crown(f,top,true);
        quoins(f,0.25,top1,top-0.5,H('#f1ece0'));quoins(f,f.L-0.25,top1,top-0.5,H('#f1ece0'))}
      else if(oe===2||oe===3){fq(O,f,0,f.L,base,top1,0,wallC,tm('plasterW'));if(f.L>3)neoUpper(f,top1,top,{nb:1,w:1.1,h:2.8,head:'cornice',apron:'#d97a62',frame:'#4a3a2c'},wallC);else fq(O,f,0,f.L,top1,top,0,wallC,tm('plasterW'));crown(f,top,false)}
      else fq(O,f,0,f.L,base,top,0,shade(wallC,0.92),tm('plasterW'))}
    neoRoof([W[1],W[4],W[5],W[0]],top,sg,'#b4583d','#d97a62');KV.k1top=top}
  /* -- east wing: 2 storeys, render with stone pilasters and shuttered first-floor windows, flat roof behind a balustraded parapet (inferred, see kassaveti.md) -- */
  {const cfg={pil:'#d6ccb8',shopFrame:'#24262a',riser:'#cbbfa8'};const wallC=H('#e7d4ad');let gmin=1e9,gmax=-1e9;for(const i of[3,4,5,6,7]){const p=Ea[i];const y=swY(p[0],p[1]);gmin=Math.min(gmin,y);gmax=Math.max(gmax,y)}
    const gfH=4.5,fh=3.7,top1=gmax+gfH,top=top1+fh,base=gmin-0.8;const E=Ea.map((p,i)=>FR(p,Ea[(i+1)%Ea.length],sg));
    for(let i=0;i<E.length;i++){const f=E[i],oe=EE[i];if(f.L<0.05)continue;
      if([7,8,10].indexOf(oe)>=0){const holes=neoGround(f,top1,cfg,sh[oe]);wallHoles(O,f,0,f.L,base,top1,0,holes,wallC,tm('plasterW'));entablature(f,top1,wallC,false);
        neoUpper(f,top1,top,{w:1.05,h:2.45,sill:0.7,head:oe===8?'pediment':'cornice',apron:null,shutters:'#4b5e4a',frame:'#4a3a2c',balc:oe===8?[2]:null,seed:oe*7},wallC);crown(f,top,false);parapet(f,top,wallC)}
      else if(oe===0){const p=P(f,f.L/2,0.8);const hs=entrance(f,f.L/2,swY(p[0],p[1]),1.4);wallHoles(O,f,0,f.L,base,top1,0,hs,wallC,tm('plasterW'));neoUpper(f,top1,top,{nb:3,w:1.0,h:2.4,head:'cornice',shutters:'#4b5e4a',frame:'#4a3a2c'},wallC);
        crown(f,top,false);parapet(f,top,wallC)}
      else if(oe===6||oe===9){fq(O,f,0,f.L,base,top+0.9,0,wallC,tm('plasterW'))}
      else if(oe===-6){/* party wall: the corner building rises above the wing */}
      else fq(O,f,0,f.L,base,top,0,shade(wallC,0.9),tm('plasterW'))}
    // roof + parapet on all edges
    polyRoof(O,Ea,top,H('#c9c4ba'),tm('flatroof'));for(let i=0;i<E.length;i++){const f=E[i],oe=EE[i];if(f.L<0.05||[7,8,10,0].indexOf(oe)>=0||oe===-6)continue;fq(O,f,0,f.L,top,top+0.9,0,shade(wallC,0.9),tm('plaster'));fq(O,f,0,f.L,top,top+0.9,-0.2,shade(wallC,0.85),tm('plaster'),null,0,-1)}
    roofStuff(Ea,top,{solar:2,wall:'#e7d4ad'},77)}
  KV.tris+=Math.round((O.size()+CUT.size()-v0)/2);KV.built.push(ID.k1);return true}
function parapet(f,top,wallC){fq(O,f,0,f.L,top,top+0.95,0.02,wallC,tm('plasterW'));fq(O,f,0,f.L,top,top+0.95,-0.2,shade(wallC,0.85),tm('plaster'),null,0,-1);hq(O,f,0,f.L,-0.22,0.12,top+0.95,false,WHITE,tm('marble'));
  // balustrade panels between plinths (cut-out turned balusters when available)
  const bal=T.jBalus;if(bal!==undefined){const v=uvR(0,0,240,120);const np=Math.max(1,Math.round(f.L/3.0));for(let i=0;i<np;i++){const a=i*f.L/np+0.45,b=(i+1)*f.L/np-0.45;if(b-a<0.6)continue;fq(CUT,f,a,b,top+0.18,top+0.8,0.05,WHITE,bal,[0,(b-a)/0.6,v[2],v[3]]);fq(CUT,f,a,b,top+0.18,top+0.8,0.05,WHITE,bal,[0,(b-a)/0.6,v[2],v[3]],0,-1)}}}
/* tiled roof over the 4 principal corners of a neoclassical footprint (quad order follows the ring: D, A, B, C with A→B the pediment front):
   gable with a salmon pediment on A→B, hipped at the back; follows the real (non-rectangular) outline, eaves 45 cm (25 cm at the pediment). */
function neoRoof(quad,y,sg,roofCol,tymCol){const [D0,A0,B0,C0]=quad;const f=FR(A0,B0,sg),L=f.L;
  const X=outline(quad,sg,i=>i===1?0.25:0.45);const [D,A,B,C]=X;const yb=y+0.12,rise=L*0.19;const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2];
  const r1=mid(A,B),mb=mid(C,D);const dl=Math.hypot(mb[0]-r1[0],mb[1]-r1[1]);const hw=Math.min(Math.hypot(C[0]-D[0],C[1]-D[1])/2*0.9,dl*0.6);const r2=[mb[0]+(r1[0]-mb[0])*hw/dl,mb[1]+(r1[1]-mb[1])*hw/dl];
  const v=(p,yy)=>[p[0],yy,p[1]];const a=v(A,yb),bb=v(B,yb),c=v(C,yb),d=v(D,yb),R1=v(r1,yb+rise),R2=v(r2,yb+rise);const col=H(roofCol),und=shade(H('#e9e3d6'),0.8),rc=tm('tiles');const up=[0,1,0],dn=[0,-1,0];
  const UV=(p)=>[p[0]*0.9+p[2]*0.4,p[1]*1.3+p[2]*0.2];const tri=(p,q,r)=>{t3(O,p,q,r,UV(p),UV(q),UV(r),col,rc,0,up);t3(O,p,q,r,[0,0],[1,0],[0,1],und,tm('plasterW'),0,dn)};
  tri(a,R1,d);tri(d,R1,R2);tri(bb,c,R2);tri(bb,R2,R1);tri(d,R2,c);
  // ridge capping
  {const m=[(R1[0]+R2[0])/2,yb+rise+0.06,(R1[2]+R2[2])/2];O.box(m[0],m[1],m[2],0.22,0.12,Math.hypot(R2[0]-R1[0],R2[2]-R1[2]),Math.atan2(R2[0]-R1[0],R2[2]-R1[2]),shade(col,0.9),RECT[rc],1,0)}
  // pediment: recessed salmon tympanum + white raking cornices (the horizontal cornice is the facade crown)
  const y0=y+0.05;t3(O,V(f,0.25,0.03,y0),V(f,L-0.25,0.03,y0),V(f,L/2,0.03,yb+rise-0.3),[0,0],[L,0],[L/2,rise],H(tymCol),tm('plasterW'),0,[f.nx,0,f.nz]);
  for(const sd of[-1,1]){const p=V(f,sd<0?-0.3:L+0.3,0.32,y0+0.02),q=V(f,L/2,0.32,yb+rise+0.12);const len=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);const ofs=(pt,dd,dy)=>[pt[0]+f.nx*dd,pt[1]+dy,pt[2]+f.nz*dd];
    q3(O,ofs(p,0,-0.34),ofs(q,0,-0.34),ofs(q,0,0),ofs(p,0,0),[0,0],[len,0],[len,0.34],[0,0.34],WHITE,tm('marble'),0,[f.nx,0,f.nz]);
    q3(O,ofs(p,-0.6,0),ofs(q,-0.6,0),ofs(q,0,0),ofs(p,0,0),[0,0],[len,0],[len,0.6],[0,0.6],shade(WHITE,0.97),tm('marble'),0,up);
    q3(O,ofs(p,-0.6,-0.34),ofs(q,-0.6,-0.34),ofs(q,0,-0.34),ofs(p,0,-0.34),[0,0],[len,0],[len,0.6],[0,0.6],shade(WHITE,0.75),tm('plasterW'),0,dn)}
  bx(O,f,L/2,0.2,yb+rise+0.05,0.4,0.35,0.5,WHITE,tm('marble'));for(const s of[0.1,L-0.1])bx(O,f,s,0.2,y0+0.1,0.45,0.35,0.42,WHITE,tm('marble'));
  // two chimneys on the back slopes
  for(const t of[0.35,0.7]){const p=[lerp(r1[0],r2[0],t)+(D[0]-A[0])*0.12,lerp(r1[1],r2[1],t)+(D[1]-A[1])*0.12];O.box(p[0],yb+rise*0.7+0.5,p[1],0.55,1.6,0.75,0,H('#e3d6b8'),RECT[tm('plasterW')],1,0);O.box(p[0],yb+rise*0.7+1.35,p[1],0.7,0.1,0.9,0,WHITE,RECT[tm('marble')],1,0)}}
function buildGenericNeo(ps,b){KV.warn.push('generic neo fallback');return false}

/* ---- Varsos, Kassaveti 5 (OSM way 1075949838): two-storey neoclassical house, the patisserie (since 1892) on the ground floor ---- */
function buildVarsos(ps,b){const sg=polyArea(ps)>0?1:-1;const n=ps.length;const E=ps.map((p,i)=>FR(p,ps[(i+1)%n],sg));const wallC=H('#e6c9ad');
  let gmin=1e9;for(const p of ps)gmin=Math.min(gmin,terr(p[0],p[1]));const f0=E[0];const pm=P(f0,f0.L/2,0.8);const gy=swY(pm[0],pm[1]);const top1=gy+4.7,top=top1+4.3,base=gmin-0.8;
  const cx=ps.reduce((s,p)=>s+p[0],0)/n,cz=ps.reduce((s,p)=>s+p[1],0)/n;const ch=chunkAt(cx,cz);O=ch.o;CUT=ch.cut;const v0=O.size()+CUT.size();
  for(let i=0;i<n;i++)addSeg(ps[i][0],ps[i][1],ps[(i+1)%n][0],ps[(i+1)%n][1],'b');
  for(let i=0;i<n;i++){const f=E[i];if(i!==0){fq(O,f,0,f.L,base,top+0.9,0,shade(wallC,0.9),tm('plasterW'));continue}
    // ground floor: rusticated base, central double door, two wide shop windows with the patisserie display, timber frames (dark green)
    const L=f.L,FRM=H('#24382c'),dc=L/2,dw=1.7,holes=[];
    for(const [a,c] of[[0.55,dc-dw/2-0.45],[dc+dw/2+0.45,L-0.55]]){opening(O,f,a,c,gy+0.55,gy+3.35,0.3,{glass:T.kWin,uv:WQ[1],glassCol:H('#ffe6c4'),gl:1,frame:FRM,fw:0.09,mull:2,tr:gy+2.65,trMull:2,rev:H('#efe6d6'),revT:tm('marbleW')});holes.push([a,c,gy+0.55,gy+3.35]);
      fq(O,f,a,c,gy+0.02,gy+0.55,0.03,FRM,tm('wood'))}
    opening(O,f,dc-dw/2,dc+dw/2,gy+0.02,gy+3.35,0.35,{glass:T.kWin,uv:WQ[1],glassCol:H('#ffe2bc'),gl:1,frame:FRM,fw:0.09,mull:2,tr:gy+2.65,door:[dc-dw/2+0.05,dc+dw/2-0.05],rev:H('#efe6d6'),revT:tm('marbleW')});holes.push([dc-dw/2,dc+dw/2,gy+0.02,gy+3.35]);
    // marble steps at the door
    bx(O,f,dc,0.35,gy-0.17,dw+0.8,0.7,0.17,H('#f0ece4'),tm('marble'));
    // fascia: cream board with burgundy serif lettering, framed by a white moulding
    const su=signUV('varsos');bx(O,f,L/2,0.08,gy+3.55,L-0.7,0.14,0.85,H('#f7f1e3'),T.white);bx(O,f,L/2,0.1,gy+4.38,L-0.5,0.2,0.08,WHITE,tm('marble'));if(su){const h=0.66,sw=Math.min(L-1.0,h*6);fq(O,f,L/2-sw/2,L/2+sw/2,gy+3.64,gy+3.64+sw/6,0.155,C1,su.tile,su.uv,1)}
    wallHoles(O,f,0,L,base,top1,0,holes,H('#e2cbb0'),tm('ashlar'));
    quoins(f,0.22,gy,top-0.4,H('#f2ead8'));quoins(f,L-0.22,gy,top-0.4,H('#f2ead8'));entablature(f,top1,wallC,true);
    // first floor: three windows with triangular pediments, green timber shutters, the central one a balcony door on carved consoles
    neoUpper(f,top1,top,{nb:3,w:1.05,h:2.7,sill:0.85,head:'pediment',apron:null,balc:[1],balcD:0.85,shutters:'#3c5a45',frame:'#3a2c20',seed:5},wallC);crown(f,top,true);
    // balustraded parapet
    parapet(f,top,wallC);
    SHOPFRONTS.push({a:P(f,0.5,0),c:P(f,L-0.5,0),nx:f.nx,nz:f.nz,L:L-1});placed('lm_shop',P(f,dc,0)[0],P(f,dc,0)[1],'Βάρσος','lm-kassaveti');KV.doors['osm:n4721277016']={x:P(f,dc,0)[0],z:P(f,dc,0)[1],nx:f.nx,nz:f.nz,w:L-1,name:'Βάρσος'};
    // terrace in front: marble tables, dark bentwood chairs (the patisserie's famous outdoor seating, inferred placement)
    terrace(f,0.4,L-0.4,gy,{n:4,chairs:'wood',umb:'#f3ecdc'})}
  polyRoof(O,ps,top,H('#c9c4ba'),tm('flatroof'));
  KV.tris+=Math.round((O.size()+CUT.size()-v0)/2);KV.built.push(ID.k5);return true}

/* ============================== INTERIORS DOOR HOOK ============================== */
if(typeof buildDoorsPois==='function'){const _bdp=buildDoorsPois;buildDoorsPois=function(){const saved=[];
  try{if(KV.built.length&&typeof MAP!=='undefined'&&MAP&&Array.isArray(MAP.pois)){for(const p of MAP.pois){if(p.b==null||!KV.bidx.has(p.b))continue;const d=KV.doors[p.id];saved.push([p,p.bay,p.fx,p.fz,p.nx,p.nz,p.w,p.name,p.nameLatin]);
      if(d){p.fx=d.x;p.fz=d.z;p.nx=d.nx;p.nz=d.nz;p.w=d.w;if(d.name&&p.name!==d.name){p.name=d.name;p.nameLatin=d.name}}else p.bay='lm_kassaveti_hidden'}KV.doorHook=saved.length}}catch(e){KV.warn.push('door hook: '+e)}
  try{return _bdp.apply(this,arguments)}finally{for(const s of saved){const p=s[0];p.bay=s[1];p.fx=s[2];p.fz=s[3];p.nx=s[4];p.nz=s[5];p.w=s[6];p.name=s[7];p.nameLatin=s[8]}}}}

/* ============================== REGISTER ============================== */
LM.register({id:'kassaveti',at:AT,build(ctx){const t0=performance.now();signList();
  for(const fp of ctx.footprints){const b=fp.b,id=b[11]&&b[11].id;try{const bi=MAP.buildings.indexOf(b);if(bi>=0)KV.bidx.add(bi);
      if(id===ID.k1)buildK1(fp.ps,b);else if(id===ID.k5)buildVarsos(fp.ps,b);else if(CFG[id])buildBlock(fp.ps,id,b);else KV.warn.push('no config for '+id)}
    catch(e){console.error('lm-kassaveti: building',id,e);KV.warn.push(id+': '+String(e&&e.stack||e).slice(0,300))}}
  // the CrediaBank name replaces the old HSBC listing (rebrand, census overrides)
  KV.ms=Math.round(performance.now()-t0)}});
})();
