'use strict';
/* Grand Kifisia — shopfronts: interior impressions behind the glass (painted layers), category specs, and the 3D shopfront builder.
   Owner: buildings agent. Called from buildBuildings() (30_buildings.js). Docs: docs/BUILDINGS_IMPL.md */

/* ---------- category groups ---------- */
const SHOPCAT={
  clothes:/^(clothes|mall|department_store|fashion|boutique|fashion_accessories|vintage|tailor|sewing|bridal)/, shoes:/^(shoes|shoe_repair|bag|bags|leather|sports|outdoor)/, jewel:/^(jewel|watches|optician|audiologist)/,
  beauty:/^(beauty|cosmetics|perfumery|hairdresser|pharmacy|chemist|nutrition|herbalist|massage|tattoo|nails|e-cigarette|cannabis|medical_supply)/,
  cafe:/^(cafe|coffee|bar|pub|tea|nightclub|wine_bar|juice)/, rest:/^(restaurant|fast_food|food_court|bistro|grill|pizza)/, bakery:/^(bakery|patisserie|confectionery|chocolate|ice_cream|pastry|deli|cheese|butcher|greengrocer|seafood|wine|alcohol|beverages|food)/,
  super:/^(supermarket|convenience|food_shop|grocery)/, bank:/^(bank|bureau_de_change|money|atm|estate_agent|real_estate|insurance|travel|office|post|government|public|architect|accountant|consult|advertis|lawyer|doctor|dentist|clinic|energy|telecom|ticket|employment)/,
  elec:/^(electronics|mobile_phone|computer|telecommunication|hifi|camera|photo|appliance|electrical|video_games|repair)/, books:/^(books|bookshop|kiosk|newsagent|stationery|gift|toys|kids|tobacco|lottery|bookmaker|games|music|crafts|art_supplies|candles|florist|garden|pet)/,
  home:/^(interior|furniture|bed|home|houseware|kitchen|bathroom|lighting|carpet|curtain|gallery|art|antiques|frame|doityourself|hardware|paint|locksmith|dry_cleaning|laundry)/};
function shopGroup(cat){cat=(cat||'').toLowerCase();for(const k in SHOPCAT)if(SHOPCAT[k].test(cat))return k;return 'other'}
/* picture per group: [layer index 0..2, quadrant 0..3] and default frontage width (m), min width */
const SHOPPIC={clothes:[0,0,5.5],shoes:[0,1,5],jewel:[0,2,4],beauty:[0,3,4.5],cafe:[1,0,6],rest:[1,1,7],bakery:[1,2,5],super:[1,3,12],bank:[2,0,6],elec:[2,1,5],books:[2,2,4.5],home:[2,3,6],other:[2,2,4.5]};

/* ---------- painted interior layers (2×2 pictures per layer, 120×120 design units each; the whole layer glows at night) ---------- */
(function(){
  const R=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const G=(g,x,y,w,h,c0,c1,hz)=>{const gr=hz?g.createLinearGradient(x,0,x+w,0):g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.fillRect(x,y,w,h)};
  const spot=(g,x,y,r,a,c)=>{const gr=g.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,`rgba(${c||'255,244,220'},${a})`);gr.addColorStop(1,`rgba(${c||'255,244,220'},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r)};
  let s=11;const rr=()=>{s=(s*16807)%2147483647;return s/2147483647};const pk=a=>a[(rr()*a.length)|0];
  const room=(g,x,y,wall0,wall1,floor0,floor1,ceil)=>{G(g,x,y,120,120,wall0,wall1);G(g,x,y+96,120,24,floor0,floor1);R(g,x,y,120,9,ceil||'#f4f1ea');g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x,y+9,120,1.2);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x,y+96,120,1.5);
    for(let k=0;k<3;k++){const lx=x+20+k*40;R(g,lx-4,y+7,8,2.5,'#fffdf2');spot(g,lx,y+14,26,.35)}};
  const garments=['#1d1d1f','#f2efe8','#7a2e2e','#c9b48a','#2c3e50','#3f6b4f','#b6a3c9','#d9a07a','#8a8f96','#e8c547','#5a3b2e','#9e2b3a'];
  const P={
    clothes(g,x,y){room(g,x,y,'#f5f0e7','#e4dccd','#c8a77e','#a7845c');
      for(let r=0;r<2;r++){const ry=y+30+r*0,rx=x+8+r*62;R(g,rx,ry,46,1.6,'#8a8a8a');for(let k=0;k<8;k++){const c=pk(garments);const gx=rx+2+k*5.4;g.fillStyle=c;g.beginPath();g.moveTo(gx,ry+2);g.lineTo(gx+5,ry+2);g.lineTo(gx+5.6,ry+36+rr()*14);g.lineTo(gx-0.6,ry+36+rr()*14);g.fill();g.fillStyle='rgba(255,255,255,.12)';g.fillRect(gx+1,ry+3,1,30)}}
      R(g,x+12,y+76,96,1.5,'#b89a73');for(let k=0;k<9;k++){R(g,x+14+k*10.4,y+68,8.5,8,pk(garments));g.fillStyle='rgba(0,0,0,.15)';g.fillRect(x+14+k*10.4,y+72,8.5,.8)}
      R(g,x+50,y+80,20,16,'#efe8dc');g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x+50,y+94,20,2)},
    shoes(g,x,y){room(g,x,y,'#efe9df','#d9cfbf','#9c8f84','#7d7268');for(let r=0;r<5;r++){const sy=y+22+r*14.5;R(g,x+6,sy+9,108,1.8,'#c8b79b');g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+6,sy+10.8,108,1.2);
      for(let k=0;k<9;k++){if(rr()<0.2)continue;const sx=x+9+k*11.7;g.fillStyle=pk(['#1d1d1f','#7a5236','#c9b48a','#8c2f2f','#e8e2d4','#3c4a5e','#b0b5ba']);g.beginPath();g.moveTo(sx,sy+9);g.lineTo(sx+9,sy+9);g.quadraticCurveTo(sx+9,sy+5,sx+5,sy+5);g.lineTo(sx+3,sy+2.5);g.lineTo(sx,sy+3);g.closePath();g.fill()}}
      R(g,x+36,y+90,48,6,'#3d3a36');R(g,x+38,y+96,3,4,'#2a2826');R(g,x+79,y+96,3,4,'#2a2826')},
    jewel(g,x,y){G(g,x,y,120,120,'#2b2a30','#18171b');G(g,x,y+96,120,24,'#3a3530','#221e1a');R(g,x,y,120,8,'#121115');
      for(let k=0;k<3;k++){const cx=x+8+k*38;spot(g,cx+15,y+44,34,.35,'255,236,200');R(g,cx,y+30,30,26,'rgba(255,248,232,.12)');R(g,cx,y+56,30,2,'#c9a85a');for(let j=0;j<7;j++){g.fillStyle=pk(['#ffd76a','#f1f1f1','#e6c06a','#bfe3ff']);g.beginPath();g.arc(cx+4+rr()*22,y+36+rr()*16,1.2+rr()*1.4,0,TAU);g.fill()}}
      for(let k=0;k<2;k++){const cx=x+18+k*54;R(g,cx,y+74,30,24,'#4a3f36');G(g,cx,y+70,30,6,'rgba(255,250,235,.55)','rgba(255,250,235,.15)');for(let j=0;j<6;j++){g.fillStyle='#ffd76a';g.fillRect(cx+3+j*4.4,y+72,1.6,1.6)}}},
    beauty(g,x,y){room(g,x,y,'#fbfaf8','#ece9e4','#e8e4de','#cfcac2');for(let r=0;r<5;r++){const sy=y+18+r*14;R(g,x+5,sy+10,110,1.4,'#d8d4cd');
      for(let k=0;k<22;k++){if(rr()<0.15)continue;const bw=2.5+rr()*2,bh=4+rr()*6;g.fillStyle=pk(['#e85d8f','#1d1d1f','#f2d2c2','#b31d4a','#d4af37','#7aa6c2','#ffffff','#c45c3c','#6b3fa0']);g.fillRect(x+6+k*4.9,sy+10-bh,bw,bh)}}
      R(g,x+40,y+86,40,10,'#f2efea');R(g,x+40,y+84,40,2.5,'#e3c3c9');spot(g,x+60,y+40,40,.25,'255,230,240')},
    cafe(g,x,y){G(g,x,y,120,120,'#e9d3ae','#b98d5c');G(g,x,y+96,120,24,'#6b4a2e','#3d2a1b');R(g,x,y,120,8,'#3b2a1e');
      R(g,x+8,y+28,104,1.6,'#5a3d24');R(g,x+8,y+46,104,1.6,'#5a3d24');for(let k=0;k<24;k++){g.fillStyle=pk(['#2e5e3a','#7a2e2e','#e8e2d0','#2b2b2b','#c9a24a','#6aa0c0']);g.fillRect(x+10+k*4.2,y+19+rr()*2,2.6,8)}
      for(let k=0;k<12;k++){g.fillStyle='#f4efe6';g.fillRect(x+12+k*8,y+40,5,5.5)}
      R(g,x+80,y+12,32,14,'#1f1d1b');for(let k=0;k<4;k++){R(g,x+83,y+15+k*2.8,18+rr()*8,1,'#efe7d4')}
      G(g,x,y+70,120,26,'#7a5636','#5a3d24');R(g,x,y+68,120,3,'#cbb08a');R(g,x+20,y+58,22,10,'#c8cdd2');R(g,x+22,y+60,18,4,'#8d949b');
      for(let k=0;k<4;k++){const lx=x+15+k*30;g.strokeStyle='#222';g.lineWidth=.6;g.beginPath();g.moveTo(lx,y+8);g.lineTo(lx,y+50);g.stroke();g.fillStyle='#2b2b2b';g.beginPath();g.arc(lx,y+52,4,Math.PI,0);g.fill();spot(g,lx,y+56,18,.6,'255,214,150')}},
    rest(g,x,y){G(g,x,y,120,120,'#f0dcc0','#c89a6c');G(g,x,y+96,120,24,'#8a5a3a','#5a3a24');R(g,x,y,120,8,'#4a3426');
      for(let k=0;k<3;k++){R(g,x+12+k*36,y+22,22,16,'#efe6d4');R(g,x+13+k*36,y+23,20,14,pk(['#6b8f5a','#a65a3a','#3c5a7a','#c9a24a']))}
      for(let k=0;k<3;k++){const tx=x+10+k*38;R(g,tx,y+82,26,2.5,'#f5f1e8');R(g,tx+12,y+84,2,12,'#3a2a1e');for(const cx of[tx-6,tx+28]){R(g,cx,y+80,4,16,'#4a3426');R(g,cx-1,y+88,6,2,'#4a3426')}spot(g,tx+13,y+70,22,.55,'255,210,140')}
      R(g,x+0,y+56,120,1.2,'rgba(90,60,40,.4)')},
    bakery(g,x,y){room(g,x,y,'#f7ecd9','#e2cba4','#d8c3a2','#b8a07c');for(let r=0;r<3;r++){R(g,x+8,y+20+r*13,104,1.6,'#b08a5a');for(let k=0;k<10;k++){g.fillStyle=pk(['#c98b45','#a8692e','#e0b070','#8a5222']);g.beginPath();g.ellipse(x+14+k*10,y+16+r*13,4.2,2.8,0,0,TAU);g.fill()}}
      R(g,x+4,y+64,112,32,'#e9e2d6');G(g,x+6,y+66,108,14,'rgba(255,255,255,.85)','rgba(240,240,240,.35)');for(let k=0;k<14;k++){g.fillStyle=pk(['#f2c3c9','#7a4a2a','#f5e6c8','#e8a33a','#c2185b','#fafafa','#5d3a1a']);g.beginPath();g.arc(x+10+k*7.5,y+77,2.8,0,TAU);g.fill()}
      R(g,x+4,y+80,112,16,'#c9b38e');R(g,x+4,y+80,112,1.5,'#a88f68')},
    super(g,x,y){G(g,x,y,120,120,'#f4f4f2','#e4e4e0');G(g,x,y+80,120,40,'#d9d9d4','#b9b9b4');for(let k=0;k<4;k++){R(g,x+10+k*28,y+4,16,2.5,'#ffffff');spot(g,x+18+k*28,y+8,18,.3,'255,255,255')}
      const aisle=(x0,w0,x1,w1)=>{for(let r=0;r<6;r++){const t=r/6;const yy=y+24+r*10;const xa=x0,xb=x0+w0;g.fillStyle=pk(['#d0021b','#f5a623','#4a90e2','#7ed321','#ffffff','#9013fe','#e8e2d4','#50e3c2']);g.fillRect(xa,yy,w0,7);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(xa,yy+7,w0,1.6)}};
      aisle(x+2,30);aisle(x+88,30);G(g,x+34,y+20,52,66,'#ececea','#d0d0cc');for(let r=0;r<6;r++){g.fillStyle=pk(['#d0021b','#f5a623','#4a90e2','#7ed321','#ffffff']);g.fillRect(x+40,y+30+r*8,40,5)}
      R(g,x+2,y+20,30,3,'#d0021b');R(g,x+88,y+20,30,3,'#d0021b')},
    bank(g,x,y){room(g,x,y,'#eef0f2','#d9dde1','#bfc4c9','#9aa0a6');for(let k=0;k<3;k++){R(g,x+10+k*36,y+20,24,30,'#2c4a6e');R(g,x+12+k*36,y+22,20,20,pk(['#4a90b8','#88b04b','#e8b04a']));R(g,x+12+k*36,y+44,14,2,'#fff')}
      for(let k=0;k<2;k++){const dx=x+14+k*54;R(g,dx,y+74,40,3,'#e8e4dc');R(g,dx+2,y+77,36,19,'#cfc8bb');R(g,dx+12,y+64,14,10,'#1d1f22');R(g,dx+18,y+74,2,1,'#555')}
      g.fillStyle='#4f7a3a';g.beginPath();g.ellipse(x+108,y+70,8,14,0,0,TAU);g.fill();R(g,x+104,y+82,8,14,'#7a5a3a')},
    elec(g,x,y){room(g,x,y,'#fafafa','#ececec','#e6e6e6','#cfcfcf');R(g,x+10,y+16,100,34,'#16181c');G(g,x+12,y+18,96,30,'#3a6ea5','#7b3fa0',true);g.fillStyle='rgba(255,255,255,.85)';g.font='bold 9px Arial';g.fillText('NEW',x+18,y+38);
      for(let k=0;k<2;k++){const tx=x+12+k*52;R(g,tx,y+76,44,3,'#d8d8d8');R(g,tx+2,y+79,40,17,'#bfbfbf');for(let j=0;j<5;j++){R(g,tx+3+j*8.4,y+70,5.5,7,'#1d1f22');R(g,tx+3.6+j*8.4,y+70.6,4.3,5.4,pk(['#3a6ea5','#2b2b2b','#c0c0c0','#e8b04a']))}}},
    books(g,x,y){room(g,x,y,'#efe6d6','#d8c8ac','#b08a5a','#8a6a40');for(let r=0;r<6;r++){const sy=y+14+r*13;R(g,x+4,sy+11,112,1.8,'#7a5a3a');let bx=x+5;while(bx<x+114){const bw=1.6+rr()*2.6,bh=7+rr()*4;g.fillStyle=pk(['#8c2f2f','#2c4a6e','#3f6b4f','#c9a24a','#e8e2d4','#1d1d1f','#b85a3a','#6b3fa0','#d0021b']);g.fillRect(bx,sy+11-bh,bw,bh);bx+=bw+0.4}}},
    home(g,x,y){room(g,x,y,'#f3efe8','#ddd5c8','#bfae94','#9c8a70');for(let k=0;k<3;k++){const fx=x+12+k*36;R(g,fx,y+22,24,30,'#2a2a2a');G(g,fx+2,y+24,20,26,pk(['#d98e5a','#6aa0c0','#c9b48a','#3f6b4f']),pk(['#f2e8d0','#2c4a6e','#8c2f2f']))}
      R(g,x+20,y+78,64,12,'#7d8a96');R(g,x+18,y+72,68,8,'#8f9ca8');R(g,x+20,y+90,3,6,'#3a2a1e');R(g,x+81,y+90,3,6,'#3a2a1e');R(g,x+100,y+50,1.5,46,'#2a2a2a');g.fillStyle='#f2e6c8';g.beginPath();g.moveTo(x+94,y+52);g.lineTo(x+108,y+52);g.lineTo(x+105,y+42);g.lineTo(x+97,y+42);g.fill();spot(g,x+101,y+50,20,.5,'255,226,170')}};
  const L=[['clothes','shoes','jewel','beauty'],['cafe','rest','bakery','super'],['bank','elec','books','home']];
  L.forEach((names,li)=>defTile('bInt'+li,(g,S,m)=>{s=11+li*977;g.save();g.scale(S/240,S/240);names.forEach((n,q)=>{const x=(q%2)*120,y=(q>>1)*120;g.save();g.beginPath();g.rect(x,y,120,120);g.clip();P[n](g,x,y);g.restore()});g.restore();m.fillStyle='#fff';m.fillRect(0,0,S,S)},{spec:.03,shin:10,glass:0,glassDark:0,glowK:1.05}));
  /* cut-out cards: mannequins, clothes rack, potted plant, bistro set */
  defTile('bCard',(g,S)=>{s=4242;g.save();g.scale(S/240,S/240);g.clearRect(0,0,240,240);
    // q0: two mannequins
    for(let k=0;k<2;k++){const cx=30+k*60,c=['#1d1d1f','#c9b48a'][k],c2=['#7a2e2e','#2c3e50'][k];g.fillStyle='#efe8dc';g.beginPath();g.arc(cx,14,6,0,TAU);g.fill();g.fillRect(cx-1.5,19,3,5);
      g.fillStyle=c;g.beginPath();g.moveTo(cx-12,26);g.quadraticCurveTo(cx,22,cx+12,26);g.lineTo(cx+10,62);g.lineTo(cx-10,62);g.fill();g.fillStyle=c2;g.beginPath();g.moveTo(cx-10,60);g.lineTo(cx+10,60);g.lineTo(cx+12,104);g.lineTo(cx+2,104);g.lineTo(cx,70);g.lineTo(cx-2,104);g.lineTo(cx-12,104);g.fill();
      g.fillStyle='#efe8dc';g.fillRect(cx-15,28,3,30);g.fillRect(cx+12,28,3,30);g.fillStyle='#777';g.fillRect(cx-1,104,2,12);g.fillRect(cx-9,115,18,3)}
    // q1: clothes rack
    g.fillStyle='#9a9a9a';g.fillRect(124,30,112,2.5);g.fillRect(126,30,2.5,86);g.fillRect(231,30,2.5,86);g.fillRect(122,114,14,3);g.fillRect(222,114,14,3);
    for(let k=0;k<12;k++){const gx=130+k*8.6;g.fillStyle=pk(garments);g.beginPath();g.moveTo(gx,33);g.lineTo(gx+8,33);g.lineTo(gx+9,80+rr()*20);g.lineTo(gx-1,80+rr()*20);g.fill();g.fillStyle='rgba(255,255,255,.1)';g.fillRect(gx+2,35,1.2,40)}
    // q2: potted plant
    g.fillStyle='#4a3a26';g.fillRect(58,190,3,28);for(let k=0;k<70;k++){const a=rr()*TAU,r=rr()*32;g.fillStyle=pk(['#2f5a2a','#3f7a35','#4f8a3e','#285024']);g.beginPath();g.ellipse(60+Math.cos(a)*r*0.85,170+Math.sin(a)*r,5,2.6,a,0,TAU);g.fill()}
    g.fillStyle='#7a5a3a';g.beginPath();g.moveTo(46,214);g.lineTo(74,214);g.lineTo(70,238);g.lineTo(50,238);g.fill();
    // q3: bistro table + two chairs
    const ox=120,oy=120;g.fillStyle='#e8e4dc';g.fillRect(ox+38,oy+62,44,4);g.fillStyle='#2b2b2b';g.fillRect(ox+58,oy+66,4,44);g.fillRect(ox+48,oy+108,24,3);
    for(const cx of[ox+18,ox+92]){g.fillStyle='#c9a77a';g.fillRect(cx,oy+76,16,4);g.fillStyle='#8a6a40';g.fillRect(cx+1,oy+80,2,30);g.fillRect(cx+13,oy+80,2,30);g.fillRect(cx+(cx<ox+60?0:13),oy+50,2.5,28);g.fillStyle='#c9a77a';g.fillRect(cx+(cx<ox+60?-1:11),oy+50,6,20)}
    g.restore()},{cut:true,spec:.03,shin:10});
  /* white stone balustrade (cut-out): one tile = 1.6 m × 1.0 m */
  defTile('bBalu',(g,S)=>{g.save();g.scale(S/240,S/240);g.clearRect(0,0,240,240);const c='#f4f1ea',d='#cfc9bd';g.fillStyle=c;g.fillRect(0,0,240,26);g.fillStyle=d;g.fillRect(0,22,240,4);g.fillStyle=c;g.fillRect(0,214,240,26);g.fillStyle=d;g.fillRect(0,214,240,3);
    for(let k=0;k<8;k++){const cx=15+k*30;g.fillStyle=c;g.beginPath();g.moveTo(cx-6,26);g.lineTo(cx+6,26);g.lineTo(cx+5,40);g.quadraticCurveTo(cx+13,120,cx+8,196);g.lineTo(cx+7,214);g.lineTo(cx-7,214);g.lineTo(cx-8,196);g.quadraticCurveTo(cx-13,120,cx-5,40);g.closePath();g.fill();
      g.fillStyle='rgba(0,0,0,.12)';g.fillRect(cx+3,44,3,150)}g.restore()},{cut:true,spec:.03,shin:10});
})();

/* ---------- shop spec resolution ---------- */
/* Every shop record (from shops.json, census.json or the map) becomes: {name, sign:{text,sub,fg,bg,style,lit}, cat, group, awn:{type,col,stripe}, frame, door, glazing, facade:{col,mat}, terrace, number, src, conf} */
const AWNCOL=['#2f6b4a','#7a1f2b','#1d2f4f','#151515','#b9a77f','#5b2a1e','#3c4a3a','#8a6d3b'];
function shopSpecFrom(rec,kind){const g=shopGroup(rec.category||rec.kind),hh=hf(Math.round((rec.x||0)*7+(rec.z||0)*13)+((rec.name||'').length*101));
  const sp={name:rec.name||'',nameLatin:rec.nameLatin||rec.name||'',cat:rec.category||'',group:g,number:rec.number||'',src:kind,id:rec.osm||rec.id||'',x:rec.x,z:rec.z,hours:rec.hours||null,conf:rec.confidence};
  if(kind==='shops'&&rec.sign){const s=rec.sign;let t=(s.text||sp.name).split(/\s+[—–]\s+/);sp.sign={text:t[0],sub:t[1]||'',fg:s.textColour||'#ffffff',bg:s.bgColour||'#1d1d1f',style:s.style||'sans',lit:s.lit!==false,pos:s.position||'fascia'};
    const a=rec.awning||{};sp.awn={type:a.type||'none',col:a.colour||'#2f6b4a',stripe:a.stripe||null,proj:/projects\s+([\d.]+)\s*m/.exec(a.detail||'')};if(sp.awn.proj)sp.awn.proj=parseFloat(sp.awn.proj[1]);
    const f=rec.shopfront||{};sp.frame=f.frameColour||'#2b2d31';sp.door=f.door||'center';sp.glazing=f.glazing||'full';sp.bays=f.bays||1;
    sp.facade={col:(rec.facade&&rec.facade.colour)||null,mat:(rec.facade&&rec.facade.material)||'plaster'};sp.terrace=rec.terrace||null;sp.level=rec.level;sp.building=rec.building||null}
  else{// census / map records: category-typical look (honest: "inferred")
    const dark=hh<0.5;const pal=[['#1d1d1f','#ffffff'],['#ffffff','#1d1d1f'],['#2b3a4a','#ffffff'],['#f4efe6','#3a2a1e'],['#7a1f2b','#ffffff'],['#0f3d2e','#f2e6c8'],['#c9a24a','#1d1d1f'],['#e8e2d6','#7a1f2b']];
    let p=pal[Math.floor(hh*pal.length)];if(rec.bg&&rec.fg)p=[rec.bg,rec.fg];
    if(g==='beauty'&&/pharm/.test(sp.cat))p=['#ffffff','#1a8a3a'];
    sp.sign={text:sp.name,sub:'',fg:p[1],bg:p[0],style:['sans','caps','serif','caps'][Math.floor(hf(hh*977)*4)],lit:true,pos:'fascia'};
    const aw=(g==='cafe'||g==='rest'||g==='bakery')?hh<0.75:hh<0.22;sp.awn={type:aw?'straight':'none',col:AWNCOL[Math.floor(hf(hh*31)*AWNCOL.length)],stripe:hf(hh*53)<0.2?'#f2efe8':null};
    sp.frame=['#2b2d31','#1d1d1f','#5a5f66','#e8e4dc','#3a2a1e'][Math.floor(hf(hh*71)*5)];sp.door=['center','left','right','center'][Math.floor(hf(hh*91)*4)];sp.glazing='full';sp.bays=1;
    sp.facade={col:null,mat:['marble','stone','plaster','plaster'][Math.floor(hf(hh*13)*4)]};
    sp.terrace=(g==='cafe'||g==='rest')?{tables:2+Math.floor(hf(hh*7)*4),chairs:['rattan','metal','wood'][Math.floor(hf(hh*3)*3)],umbrellas:null}:null}
  const pic=SHOPPIC[g]||SHOPPIC.other;sp.want=kind==='shops'&&rec.shopfront&&rec.shopfront.bays>1?Math.max(rec.shopfront.bays*2.9,pic[2]*0.85):pic[2];if(/kiosk|tobacco|lottery|bookmaker/.test(sp.cat))sp.want=3;
  sp.minW=/kiosk|tobacco/.test(sp.cat)?2.0:2.4;return sp}

/* special brands: hand-tuned fronts (plain text in the brand colours, no logo artwork) */
const SPECIALSPEC={
  mythos:{keepText:true,text:'mythos',sub:'plus',fg:'#f5b81c',bg:'#141416',style:'sans',facade:'#c27a55',frame:'#141416',awn:{type:'straight',col:'#151515',proj:3.0,posts:true},door:'right',want:9,group:'rest',arch:true,proj:true,terrace:{tables:8,chairs:'rattan',screens:true}},
  paul:{text:'PAUL',sub:'MAISON DE QUALITÉ',fg:'#f2d27a',bg:'#20302a',style:'serif',facade:'#f1ede4',frame:'#2b2622',awn:{type:'straight',col:'#7a1f1f',proj:1.6},door:'center',want:9,group:'bakery',terrace:{tables:6,chairs:'rattan'}},
  starbucks:{text:'STARBUCKS',sub:'COFFEE',fg:'#ffffff',bg:'#00704a',style:'sans',facade:'#efe9df',frame:'#1f2a24',awn:{type:'none'},door:'center',want:9,group:'cafe',terrace:{tables:5,chairs:'metal'}},
  kfc:{text:'KFC',sub:'',fg:'#ffffff',bg:'#c8102e',style:'sans',facade:'#f3f1ee',frame:'#1d1d1f',awn:{type:'none'},door:'center',want:9,group:'rest',stripes:true},
  sephora:{text:'SEPHORA',sub:'',fg:'#ffffff',bg:'#000000',style:'caps',facade:'#e9e4da',frame:'#111111',awn:{type:'none'},door:'center',want:8,group:'beauty',keepText:true},
  super:{text:'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ',sub:'',fg:'#d0021b',bg:'#ffffff',style:'sans',facade:'#e9e6df',frame:'#3a3f44',awn:{type:'none'},door:'center',want:16,group:'super'}};

/* ---------- shopfront geometry ---------- */
/* brand / paint colours as linear values, so a sign shows its real hex colour on screen (hexc() feeds sRGB numbers to a linear pipeline and washes colours out) */
const hexL=h=>{const c=new THREE.Color(h);c.convertSRGBToLinear();return[c.r,c.g,c.b]};
const INTWALL={clothes:'#f2ede4',shoes:'#e9e2d6',jewel:'#2e2c32',beauty:'#f7f6f3',cafe:'#d9c09a',rest:'#e6cfae',bakery:'#f2e6cf',super:'#f0f0ee',bank:'#e6e9ec',elec:'#f4f4f4',books:'#e8dcc4',home:'#ece6dc',other:'#ece6dc'};
const FLOORWOOD={cafe:1,rest:1,books:1,home:1,clothes:1,shoes:1};
const CHAIRCOL={rattan:'#c9a77a',metal:'#3a3d40',wood:'#7a5a3a',plastic:'#e8e8e4'};
function surroundOf(sp){const m=sp.facade&&sp.facade.mat;return[sp.facade&&sp.facade.col?hexc(sp.facade.col):hexc('#e4ded2'),m==='marble'?TM.marbleW:m==='stone'?TM.ashlar:m==='brick'?TM.brickw:m==='metal'?TM.metalL:m==='wood'?TM.wood:TM.plasterC]}
/* the shell part of a shop bay (in the world chunk: visible at every distance): plinth, wall above the window, flat fascia, and the lit interior box behind the glass */
function shopShell(B,E,sh,O,N,base){const sp=sh.sp,gy=B.gy,gfh=B.gfh,s0=sh.s0,s1=sh.s1,w=s1-s0,mid=(s0+s1)/2;const spec=sp.special?SPECIALSPEC[sp.special]:null;
  const Pm=EP(E,mid,0.9);let y0=clamp(groundY(Pm[0],Pm[1])+0.03,gy-2.5,gy);sh.y0=y0;let yG=gy+Math.min(3.05,gfh-0.85);const fasH=clamp(gfh-(yG-gy)-0.12,0.5,1.05);sh.fasH=fasH;
  const [fcol,ft]=surroundOf(sp);sh.fcol=fcol;sh.ft=ft;
  if(spec&&spec.arch){sh.arch={c:mid,a:Math.min(w-1.0,6)/2,b:1.3};yG=y0+3.0}sh.yG=yG;
  eq(O,E,s0,s1,0,base,y0,shade(fcol,0.8),ft,s0,s1,base,y0);
  const yTop=gy+gfh;
  if(sh.arch){const A=sh.arch,K=14;eq(O,E,s0,A.c-A.a,0,yG,yTop,fcol,ft,s0,A.c-A.a,yG,yTop);eq(O,E,A.c+A.a,s1,0,yG,yTop,fcol,ft,A.c+A.a,s1,yG,yTop);
    const ring=hexc('#a8521f');for(let k=0;k<K;k++){const t0=Math.PI*(1-k/K),t1=Math.PI*(1-(k+1)/K);const sa=A.c+A.a*Math.cos(t0),sb=A.c+A.a*Math.cos(t1),ya=yG+A.b*Math.sin(t0),yb=yG+A.b*Math.sin(t1);
      const ra=A.c+(A.a+0.45)*Math.cos(t0),rb=A.c+(A.a+0.45)*Math.cos(t1),yra=yG+(A.b+0.45)*Math.sin(t0),yrb=yG+(A.b+0.45)*Math.sin(t1);
      const p=EP(E,sa,0.02),q=EP(E,sb,0.02),pr=EP(E,ra,0.02),qr=EP(E,rb,0.02);O.quad([p[0],ya,p[1]],[q[0],yb,q[1]],[qr[0],yrb,qr[1]],[pr[0],yra,pr[1]],[0,0],[0.45,0],[0.45,0.5],[0,0.5],ring,RECT[TM.brickw],0);
      // wall from the ring up to the top of the ground floor
      const P2=EP(E,ra,0),Q2=EP(E,rb,0);O.wall(P2[0],P2[1],Q2[0],Q2[1],yra,yrb,yTop,yTop,E.nx,E.nz,ra,rb,yra,yTop,fcol,RECT[ft],0);
      // brick soffit of the arch (the vault seen from below)
      const pi=EP(E,sa,-0.6),qi=EP(E,sb,-0.6);O.quad([p[0],ya,p[1]],[pi[0],ya,pi[1]],[qi[0],yb,qi[1]],[q[0],yb,q[1]],[0,0],[0.6,0],[0.6,0.3],[0,0.3],shade(ring,0.85),RECT[TM.brickw],0)}
    const ra=A.c-A.a-0.45,rb=A.c+A.a+0.45;eq(O,E,ra,A.c-A.a,0,yG,yG+0.02,ring,TM.brickw,0,1,0,1)}
  else{eq(O,E,s0,s1,0,yG,yTop,fcol,ft,s0,s1,yG,yTop);if(!(spec&&spec.noFascia))eq(O,E,s0+0.08,s1-0.08,0.012,yG+0.06,yG+fasH-0.04,hexL(sp.sign.bg),T.white,0,1,0,1,0)}
  let D=0;for(const d of[3.6,2.4,1.4,0.8]){const a=EP(E,s0+0.15,-d),b=EP(E,s1-0.15,-d),c=EP(E,mid,-d);if(pip(B.ps,a[0],a[1])&&pip(B.ps,b[0],b[1])&&pip(B.ps,c[0],c[1])){D=d;break}}sh.D=D;
  if(D===0){eq(O,E,s0,s1,-0.05,y0,yG,C1,T.shopA,0,Math.max(1,Math.round(w/3)),0,(yG-y0)/3.4,1);return}
  const pic=SHOPPIC[sp.group]||SHOPPIC.other,tile=T['bInt'+pic[0]],q=pic[1],qu=(q%2)*0.5,qv=0.5*(1-(q>>1));const H=yG-y0,nrep=Math.max(1,Math.round(w/(H*1.3)));const yC=sh.arch?yG+sh.arch.b:yG;
  for(let k=0;k<nrep;k++)eq(O,E,s0+w*k/nrep,s0+w*(k+1)/nrep,-D,y0,yG,C1,tile,qu+0.012,qu+0.488,qv+0.012,qv+0.488,1);
  const iw=hexc(INTWALL[sp.group]||INTWALL.other);if(yC>yG)eq(O,E,s0,s1,-D,yG,yC,hexc('#d9a35a'),TM.plasterC,0,w,yG,yC);
  const A0=EP(E,s0,0),A1=EP(E,s0,-D),B0=EP(E,s1,0),B1=EP(E,s1,-D);
  O.wall(A1[0],A1[1],A0[0],A0[1],y0,y0,yC,yC,E.ux,E.uz,0,D,y0,yC,iw,RECT[TM.plaster],0);O.wall(B0[0],B0[1],B1[0],B1[1],y0,y0,yC,yC,-E.ux,-E.uz,0,D,y0,yC,iw,RECT[TM.plaster],0);
  O.hq([A0[0],y0,A0[1]],[B0[0],y0,B0[1]],[B1[0],y0,B1[1]],[A1[0],y0,A1[1]],[s0,0],[s1,0],[s1,D],[s0,D],FLOORWOOD[sp.group]?hexc('#b48a5c'):hexc('#e2ddd4'),RECT[FLOORWOOD[sp.group]?TM.wood:TM.marble],0);
  O.hq([A0[0],yC,A0[1]],[B0[0],yC,B0[1]],[B1[0],yC,B1[1]],[A1[0],yC,A1[1]],[0,0],[1,0],[1,1],[0,1],sh.arch?hexc('#d9a35a'):hexc('#f2efe8'),RECT[T.white],0.5,true)}

/* the near part of a shop bay: frames, door, glass, fascia board with the real name, awning, projecting sign, house number, display cards, terrace */
function shopNear(B,E,sh,N){const sp=sh.sp,s0=sh.s0,s1=sh.s1,w=s1-s0,y0=sh.y0,yG=sh.yG,G=N.o;const spec=sp.special?SPECIALSPEC[sp.special]:null;const fr=hexL(sp.frame||'#2b2d31');const fm=TM.metalL;
  const dw=(w>=5.5||spec)?1.8:1.05;let dc;
  if(sp.special&&Array.isArray(sp.door)){const dx=sp.door[0]-E.a[0],dz=sp.door[1]-E.a[1];dc=dx*E.ux+dz*E.uz}else{const side=spec?spec.door:sp.door;dc=side==='left'?s0+0.25+dw/2:side==='right'?s1-0.25-dw/2:(s0+s1)/2}
  dc=w<dw+0.5?(s0+s1)/2:clamp(dc,s0+dw/2+0.15,s1-dw/2-0.15);const d0=dc-dw/2,d1=dc+dw/2;sh.dc=dc;
  const jw=0.09;ebox(G,E,s0,s0+jw,-0.05,0.05,y0,yG,fr,fm,0,'flr');ebox(G,E,s1-jw,s1,-0.05,0.05,y0,yG,fr,fm,0,'flr');ebox(G,E,s0,s1,-0.05,0.06,yG-0.12,yG,fr,fm,0,'fu');
  const riser=sp.glazing==='windows'?0.8:0.32;
  for(const [a,b] of[[s0+jw,d0-0.05],[d1+0.05,s1-jw]]){if(b-a<0.12)continue;ebox(G,E,a,b,-0.04,0.04,y0,y0+riser,fr,fm,0,'ft');const nm=Math.max(0,Math.round((b-a)/(sp.special==='mythos'?1.3:1.75))-1);
    for(let k=1;k<=nm;k++){const m=a+(b-a)*k/(nm+1);ebox(G,E,m-0.03,m+0.03,-0.04,0.045,y0+riser,yG-0.12,fr,fm,0,'flr')}if(yG-y0>2.9||sp.special==='mythos')ebox(G,E,a,b,-0.04,0.045,y0+2.45,y0+2.52,fr,fm,0,'ftu');
    if(sp.special==='mythos')ebox(G,E,a,b,-0.04,0.045,y0+1.2,y0+1.26,fr,fm,0,'ftu')}
  ebox(G,E,d0-0.06,d0,-0.05,0.05,y0,yG-0.12,fr,fm,0,'flr');ebox(G,E,d1,d1+0.06,-0.05,0.05,y0,yG-0.12,fr,fm,0,'flr');ebox(G,E,d0,d1,-0.05,0.05,y0+2.3,y0+2.38,fr,fm,0,'ftu');
  if(dw>1.5)ebox(G,E,dc-0.025,dc+0.025,-0.03,0.04,y0,y0+2.3,fr,fm,0,'f');const hcol=sp.special==='mythos'?hexc('#cfcfcf'):hexc('#bfbfbf');
  for(const hs of dw>1.5?[dc-0.12,dc+0.09]:[d1-0.16]){ebox(G,E,hs,hs+0.03,0.04,0.09,y0+0.75,y0+(sp.special==='mythos'?2.05:1.45),hcol,fm,0,'flr')}
  eq(N.gl,E,s0+jw,s1-jw,0.0,y0+0.02,yG-0.12,C1,fm,0,1,0,1);
  if(sh.arch){const A=sh.arch,K=14;const ctr=EP(E,A.c,0.0);for(let k=0;k<K;k++){const t0=Math.PI*(1-k/K),t1=Math.PI*(1-(k+1)/K);const p=EP(E,A.c+A.a*Math.cos(t0),0),q=EP(E,A.c+A.a*Math.cos(t1),0);
      N.gl.tri([ctr[0],yG,ctr[1]],[p[0],yG+A.b*Math.sin(t0),p[1]],[q[0],yG+A.b*Math.sin(t1),q[1]],[0,0],[0,1],[1,1],C1,RECT[fm],0)}
    for(let s=A.c-A.a+0.65;s<A.c+A.a-0.3;s+=0.65){const u=(s-A.c)/A.a,yy=yG+A.b*Math.sqrt(Math.max(0,1-u*u));ebox(G,E,s-0.025,s+0.025,-0.03,0.04,yG,yy,fr,fm,0,'flr')}ebox(G,E,A.c-A.a,A.c+A.a,-0.04,0.05,yG-0.05,yG+0.03,fr,fm,0,'ftu')}
  // fascia board with the real name
  if(spec&&spec.arch){mythosSign(N,E,dc-0.2,y0+2.86,sp)}
  else{const fy0=yG+0.06,fy1=yG+sh.fasH-0.04;ebox(G,E,s0+0.06,s1-0.06,0,0.1,fy0,fy1,hexL(sp.sign.bg),T.white,0,'flrtu');signText(N,E,sp,(s0+s1)/2,0.104,fy0,fy1,w-0.55)}
  awning(N,E,sp,s0,s1,yG,y0,sh);
  if(/pharm/.test(sp.cat||''))pharmCross(N,E,s1-0.15>s0+1?s1-0.35:s0+0.35,yG+0.55);
  else if(/^bank/.test(sp.cat||'')||(sp.special==='kfc'))projBox(N,E,sp,s1-0.3,yG-0.55);
  if(sp.number){const ps_=d1+0.32<s1-0.12?d1+0.3:d0-0.3;const yy=y0+2.12;ebox(G,E,ps_-0.13,ps_+0.13,0.05,0.07,yy-0.09,yy+0.09,hexc('#1f4e9c'),T.white,0,'flrt');const P=EP(E,ps_,0.072);labQuad(N.lab,labText(String(sp.number),'sans',30),P[0],yy,P[1],E.nx,E.nz,0.13,0.22,hexc('#ffffff'),0)}
  if(sh.D>0.7)cards(N,E,sh,sp,d0,d1);
  // roller shutter box (always) and the shutter itself (night only, separate mesh) on shops that have one
  if(!/cafe|rest|bar/.test(sp.group)&&!/pharm|bar|pub|hotel|cinema/.test(sp.cat||'')&&hf(Math.round(s0*13+s1*7)+B.i*31)<0.6&&!sp.special){ebox(G,E,s0+0.05,s1-0.05,0,0.2,yG-0.32,yG-0.12,hexc('#8d9094'),TM.metalL,0,'ftu');
    eq(N.shut,E,s0+0.06,s1-0.06,0.12,y0,yG-0.32,hexc('#b7babd'),TM.shutterM,s0,s1,y0,yG-0.32)}
  if(sp.terrace&&sp.terrace.tables)terrace(N,E,sh,sp)}

function signText(N,E,sp,sc,d,fy0,fy1,maxW){const s=sp.sign;if(!s)return;const H=fy1-fy0,P=EP(E,sc,d),glow=s.lit===false?0:1;let ink=hexL(s.fg||'#fff');const bg=hexL(s.bg||'#000');
  if(Math.abs((ink[0]+ink[1]+ink[2])-(bg[0]+bg[1]+bg[2]))<0.45)ink=(bg[0]+bg[1]+bg[2])>1.2?hexc('#1d1d1f'):hexc('#ffffff');
  const st=s.style==='caps'?'caps':s.style==='serif'?'serif':s.style==='script'?'script':'sans';const r=labText(s.text,st,sp.special?64:44);
  if(s.sub){const r2=labText(s.sub,'caps',sp.special?40:28);labQuad(N.lab,r,P[0],fy0+H*0.63,P[1],E.nx,E.nz,H*0.56,maxW,ink,glow);labQuad(N.lab,r2,P[0],fy0+H*0.2,P[1],E.nx,E.nz,H*0.22,maxW*0.8,ink,glow)}
  else labQuad(N.lab,r,P[0],fy0+H*0.5,P[1],E.nx,E.nz,H*(st==='script'?0.8:0.66),maxW,ink,glow)}

function awning(N,E,sp,s0,s1,yG,y0,sh){const a=sp.awn;if(!a||a.type==='none'||!a.type)return;const G=N.o;const col=hexL(a.col||'#2f6b4a');const w=s1-s0;
  if(a.type==='canopy'){ebox(G,E,s0,s1,0,1.1,yG-0.02,yG+0.1,col,TM.metalL,0,'flrtu');return}
  let tile=T.white,tc=col;if(a.stripe){const c=col;tile=c[1]>c[0]*1.1?T.awnG:c[0]>c[1]*1.4?T.awnR:T.awnS;tc=C1}
  const proj=clamp(a.proj||1.4,0.9,3.2);const yt=sp.special==='mythos'?y0+3.45:yG-0.02,yb=sp.special==='mythos'?y0+2.92:Math.max(y0+2.3,yt-0.3-proj*0.24);
  const A=EP(E,s0,0.02),B=EP(E,s1,0.02),C=EP(E,s1,proj),D=EP(E,s0,proj);const ur=tile===T.white?1:w/1.6;
  G.hq([A[0],yt,A[1]],[D[0],yb,D[1]],[C[0],yb,C[1]],[B[0],yt,B[1]],[0,0],[0,1],[ur,1],[ur,0],tc,RECT[tile],0);G.hq([B[0],yt-0.02,B[1]],[C[0],yb-0.02,C[1]],[D[0],yb-0.02,D[1]],[A[0],yt-0.02,A[1]],[0,0],[0,1],[ur,1],[ur,0],shade(tc,0.7),RECT[tile],0,true);
  eq(G,E,s0,s1,proj,yb-0.24,yb,tc,tile,0,ur,0.8,1);eq(G,E,s0,s1,proj-0.01,yb-0.24,yb,shade(tc,0.7),tile,ur,0,0.8,1,0,true);
  for(const [s,sg] of[[s0,-1],[s1,1]]){const p=EP(E,s,0.02),q=EP(E,s,proj);G.tri([p[0],yt,p[1]],[q[0],yb,q[1]],[q[0],yb-0.24,q[1]],[0,1],[1,0.5],[1,0],shade(tc,0.9),RECT[tile],0);G.tri([q[0],yb-0.24,q[1]],[q[0],yb,q[1]],[p[0],yt,p[1]],[1,0],[1,0.5],[0,1],shade(tc,0.9),RECT[tile],0)}
  if(a.posts){for(const s of[s0+0.12,s1-0.12,(s0+s1)/2]){const p=EP(E,s,proj-0.08);G.cyl(p[0],groundY(p[0],p[1]),p[1],0.035,0.035,yb-groundY(p[0],p[1]),6,hexc('#151515'),RECT[TM.metalL],false)}}}
function pharmCross(N,E,s,y){const G=N.o;ebox(G,E,s-0.03,s+0.03,0,0.28,y-0.03,y+0.03,hexc('#5a5a5a'),TM.metalL,0,'flrtu');const c=hexc('#14b04a');const dc=0.66;
  ebox(G,E,s-0.06,s+0.06,dc-0.12,dc+0.12,y-0.36,y+0.36,c,T.white,1,'flrtu');ebox(G,E,s-0.06,s+0.06,dc-0.36,dc+0.36,y-0.12,y+0.12,c,T.white,1,'flrtu')}
function projBox(N,E,sp,s,y){const G=N.o;const bg=hexL(sp.sign.bg),ink=hexc(sp.sign.fg);ebox(G,E,s-0.03,s+0.03,0,0.22,y+0.3,y+0.34,hexc('#5a5a5a'),TM.metalL,0,'flrtu');ebox(G,E,s-0.06,s+0.06,0.22,0.92,y,y+0.62,bg,T.white,0,'flrtu');
  const r=labText(sp.sign.text,'caps',44);for(const sg of[1,-1]){const P=EP(E,s+sg*0.065,0.57);labQuad(N.lab,r,P[0],y+0.31,P[1],E.ux*sg,E.uz*sg,0.3,0.62,ink,1)}}
/* Mythos Plus: black capsule light box hung in front of the fanlight (spec: shops.json sign.detail) */
function mythosSign(N,E,s,y,sp){const G=N.o,len=1.9,h=0.75,r=h/2,d=0.32,col=hexc('#141416');const K=8;const P=(ss,yy,dd)=>{const q=EP(E,ss,dd);return[q[0],yy,q[1]]};
  for(const dd of[d,d-0.12]){const back=dd!==d;const pts=[];for(let k=0;k<=K;k++){const t=-Math.PI/2+Math.PI*k/K;pts.push([s+len/2-r+Math.cos(t)*r,y+Math.sin(t)*r])}for(let k=0;k<=K;k++){const t=Math.PI/2+Math.PI*k/K;pts.push([s-len/2+r+Math.cos(t)*r,y+Math.sin(t)*r])}
    const c=P(s,y,dd);for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length];const A=P(a[0],a[1],dd),B=P(b[0],b[1],dd);if(back)G.tri(c,B,A,[0,0],[1,0],[0,1],col,RECT[T.white],0);else G.tri(c,A,B,[0,0],[1,0],[0,1],col,RECT[T.white],0)}
    if(!back){for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length];const A=P(a[0],a[1],d),B=P(b[0],b[1],d),A2=P(a[0],a[1],d-0.12),B2=P(b[0],b[1],d-0.12);G.quad(A,A2,B2,B,[0,0],[0,1],[1,1],[1,0],col,RECT[T.white],0)}}}
  ebox(G,E,s-0.02,s+0.02,0,d-0.12,y+r-0.05,y+r,hexc('#2a2a2a'),TM.metalL,0,'flrtu');
  const Q=EP(E,s,d+0.005);labQuad(N.lab,labText('mythos','sans',64),Q[0],y+0.1,Q[1],E.nx,E.nz,0.34,1.5,hexc('#f5b81c'),1);labQuad(N.lab,labText('plus','script',48),Q[0],y-0.12,Q[1],E.nx,E.nz,0.17,0.8,hexc('#ffffff'),1);
  labQuad(N.lab,labText('— RESTAURANT · GRILL —','caps',32),Q[0],y-0.27,Q[1],E.nx,E.nz,0.07,1.2,hexc('#ffffff'),1)}
/* free-standing display cards just behind the glass (mannequins, clothes rail, plant, bistro set) for depth */
function cards(N,E,sh,sp,d0,d1){const g=sp.group;let q=-1,sz=1.9;if(g==='clothes'){q=0;sz=1.95}else if(g==='cafe'||g==='rest'||g==='bakery'){q=3;sz=1.8}else if(g==='shoes'||g==='beauty'||g==='home'||g==='books'||g==='bank'||g==='elec'||g==='jewel'||g==='other'){q=2;sz=1.4}if(q<0)return;
  const dd=-Math.min(0.9,sh.D*0.35);const spots=[];if(d0-sh.s0>sz*0.6+0.2)spots.push((sh.s0+d0)/2);if(sh.s1-d1>sz*0.6+0.2)spots.push((d1+sh.s1)/2);
  for(const s of spots){const qu=(q%2)*0.5,qv=0.5*(1-(q>>1));const a=EP(E,s-sz/2,dd),b=EP(E,s+sz/2,dd);N.cut.wall(a[0],a[1],b[0],b[1],sh.y0,sh.y0,sh.y0+sz,sh.y0+sz,E.nx,E.nz,qu+0.005,qu+0.495,qv+0.005,qv+0.495,C1,RECT[T.bCard],0)}}
/* café / restaurant terrace on the pavement in front of the shop (only where there is pavement: lvl()>0) */
function terrace(N,E,sh,sp){const t=sp.terrace,G=N.o,n=Math.min(t.tables||0,12);if(!n)return;const cc=hexc(CHAIRCOL[t.chairs]||CHAIRCOL.metal);let k=0;
  for(const d of[1.35,2.85,4.35])for(let s=sh.s0+0.75;s<=sh.s1-0.75&&k<n;s+=1.7){const p=EP(E,s,d),pf=EP(E,s,d+0.75);if(lvl(p[0],p[1])<0.05||lvl(pf[0],pf[1])<0.05)continue;if(Math.abs(s-sh.dc)<0.9&&d<2)continue;k++;
    const y=groundY(p[0],p[1]);G.cyl(p[0],y+0.72,p[1],0.34,0.34,0.035,10,hexc('#efebe3'),RECT[TM.marble],true);G.cyl(p[0],y,p[1],0.04,0.04,0.72,5,hexc('#2b2b2b'),RECT[TM.metalL],false);G.cyl(p[0],y,p[1],0.22,0.2,0.03,8,hexc('#2b2b2b'),RECT[TM.metalL],true);
    for(const o of[-0.56,0.56]){const c=EP(E,s+o,d);const an=Math.atan2(E.ux*Math.sign(o),E.uz*Math.sign(o));G.box(c[0],y+0.44,c[1],0.44,0.05,0.44,an,cc,RECT[t.chairs==='rattan'?TM.wood:TM.metalL]);
      const bk=EP(E,s+o*1.36,d);G.box(bk[0],y+0.68,bk[1],0.44,0.46,0.05,Math.atan2(E.nx,E.nz)+Math.PI/2,cc,RECT[t.chairs==='rattan'?TM.wood:TM.metalL]);
      for(const lo of[-0.18,0.18])for(const lw of[-0.18,0.18]){const l=EP(E,s+o+lo,d+lw);G.box(l[0],y+0.21,l[1],0.03,0.42,0.03,0,cc,RECT[TM.metalL])}}
    if(t.umbrellas){const uc=hexc(t.umbrellas);G.cyl(p[0],y+0.75,p[1],0.025,0.025,1.6,4,hexc('#ddd'),RECT[TM.metalL],false);G.cyl(p[0],y+2.05,p[1],1.25,0.05,0.45,8,uc,RECT[T.white],true)}}
  if(t.screens){for(const sg of[-1,1]){const s=sh.dc+sg*1.4,s2=sh.dc+sg*(1.4+3.4);const a=Math.min(s,s2),b=Math.max(s,s2);if(a<sh.s0-2||b>sh.s1+3)continue;const pa=EP(E,a,3.0),pb=EP(E,b,3.0);if(lvl(pa[0],pa[1])<0.05||lvl(pb[0],pb[1])<0.05)continue;const y=groundY(pa[0],pa[1]);
      eq(N.gl,E,a,b,3.0,y+0.05,y+1.5,C1,TM.metalL,0,1,0,1);for(const s3 of[a,b,(a+b)/2])ebox(G,E,s3-0.03,s3+0.03,2.97,3.03,y,y+1.55,hexc('#151515'),TM.metalL,0,'flrt');ebox(G,E,a,b,2.97,3.03,y+1.5,y+1.56,hexc('#151515'),TM.metalL,0,'ftu')}}}
