'use strict';
/* Grand Kifisia — 32_facades.js (owner: buildings agent; docs/BUILDINGS_IMPL.md §4)
   Parametric facade generators, one per architectural style class of gk3/data/buildings_spec.json (research-arch):
     poly_6080 (1960-85 polykatoikia: continuous marble-edged balconies, aluminium sliders, roller shutters, fabric awnings),
     poly_8000 (1985-2005 garden-suburb block: stone-clad base, casements with louvred shutters, individual balconies, tiled roofs/pergolas),
     poly_modern (2005-25: big sliders, frameless glass rails, recessed loggias, cladding strips), neo_villa (neoclassical: plinth, tall framed
     windows with pediments, shutters, cornice, hip roof), interwar, hotel, villa_modern, house_suburban, retail_modern (curtain wall / brick),
     arcade_retail, market_hall, ancillary.
   Every building record gives: levels, ground-floor + floor heights, roof (flat / flat_solar / hip / gable), roof colour, facade colour/material/base/trim,
   balcony type + rail + depth, top-floor setback (retiré), pilotis, awnings, features (stone_clad_base, shutters_green, pergola_top, quoins …).
   LOD: walls with real openings (reveals, glass, frames, sills, shutters, pediments) are built into the near cell (visible within bldNearD());
   a painted-bay twin of the same wall goes into the cell's far mesh, which is shown instead beyond that distance. Slabs, balconies, rails,
   parapets and roofs are in the chunk (always visible: they make the silhouette). */

/* ---------- own material layers (registered at script load, docs/MATERIALS.md §4) ---------- */
// window glass, 2×2 variants: sheer curtains / dark interior with reflection / venetian blinds / curtains drawn aside. Mask = glass (sky reflection, night glow)
defTile('gkWin',(g,S,m)=>{const h=S/2;g.clearRect(0,0,S,S);
  for(let q=0;q<4;q++){const x=(q%2)*h,y=Math.floor(q/2)*h;const gr=g.createLinearGradient(x,y,x+h*0.3,y+h);gr.addColorStop(0,'#90a4ae');gr.addColorStop(0.45,'#5a6a72');gr.addColorStop(1,'#323c42');g.fillStyle=gr;g.fillRect(x,y,h,h);
    if(q===0){for(let i=0;i<14;i++){g.fillStyle=i%2?'rgba(236,232,222,0.55)':'rgba(214,208,196,0.5)';g.fillRect(x+i*h/14,y+4,h/14+1,h-8)}}
    else if(q===1){g.fillStyle='rgba(20,22,24,0.55)';g.fillRect(x,y+h*0.35,h,h*0.65);g.fillStyle='rgba(255,255,255,0.12)';g.beginPath();g.moveTo(x+h*0.15,y);g.lineTo(x+h*0.45,y);g.lineTo(x+h*0.05,y+h);g.lineTo(x,y+h);g.lineTo(x,y+h*0.6);g.fill()}
    else if(q===2){for(let i=0;i<22;i++){g.fillStyle=i%2?'rgba(226,222,212,0.85)':'rgba(170,166,158,0.85)';g.fillRect(x,y+i*h*0.62/22,h,h*0.62/22+0.5)}}
    else{g.fillStyle='rgba(60,46,34,0.6)';g.fillRect(x+h*0.25,y,h*0.5,h);const cc=['#8a3b2e','#c9b89a','#4d5e6e','#7a6a4a'][Math.floor(x/h+y/h*2)%4];for(const [a,b] of [[0,0.27],[0.73,1]]){g.fillStyle=cc;g.fillRect(x+h*a,y+2,h*(b-a),h-4);for(let i=0;i<4;i++){g.fillStyle='rgba(0,0,0,0.18)';g.fillRect(x+h*(a+(b-a)*(i+0.5)/4),y+2,2,h-4)}}}
    m.fillStyle='#fff';m.fillRect(x+1,y+1,h-2,h-2)}},{glass:1,glassDark:0.2,spec:0.09,shin:120,glowK:1.6});
// louvred timber/aluminium shutter leaf (tint carrier: the vertex colour is the paint colour); one UV unit = one leaf
defTile('gkLouv',(g,S)=>{g.fillStyle='#f2f2f0';g.fillRect(0,0,S,S);g.fillStyle='#b9b9b6';g.fillRect(0,0,S,10);g.fillRect(0,S-10,S,10);g.fillRect(0,0,14,S);g.fillRect(S-14,0,14,S);g.fillRect(0,S/2-5,S,10);
  for(let y=14;y<S-12;y+=8){if(Math.abs(y-S/2)<8)continue;g.fillStyle='#8e8e8a';g.fillRect(14,y,S-28,2);g.fillStyle='#ffffff';g.fillRect(14,y+2,S-28,2)}},{spec:0.04,shin:20});
// anodised aluminium bar railing (alpha cut-out, tint carrier): one UV unit = 1.2 m wide × 1 m high
defTile('gkAlu',(g,S)=>{g.clearRect(0,0,S,S);g.fillStyle='#e9ebec';g.fillRect(0,0,S,13);g.fillRect(0,S-16,S,9);g.fillStyle='#c9cdd0';g.fillRect(0,11,S,3);for(let x=4;x<S;x+=20){g.fillStyle='#e4e7e8';g.fillRect(x,12,5,S-22);g.fillStyle='#b4b8bb';g.fillRect(x+4,12,1,S-22)}},{cut:true,spec:0.2,shin:40});
// awning canvas (tint carrier, woven texture); one UV unit = 1 m
defTile('gkFab',(g,S)=>{g.fillStyle='#f4f2ee';g.fillRect(0,0,S,S);for(let i=0;i<S;i+=3){g.fillStyle='rgba(0,0,0,0.035)';g.fillRect(i,0,1,S);g.fillRect(0,i,S,1)}for(let i=0;i<S;i+=60){g.fillStyle='rgba(0,0,0,0.06)';g.fillRect(i,0,2,S)}},{spec:0.02,shin:6});

/* ---------- style classes → legacy style (other code reads B.style) ---------- */
const ARCH_STYLE={poly_6080:'apt',poly_8000:'apt',poly_modern:'apt',ancillary:'apt',neo_villa:'neo',interwar:'neo',hotel:'neo',villa_modern:'villa',house_suburban:'villa',kiosk:'villa',chalet_villa:'villa',
  retail_modern:'modern',market_hall:'modern',arcade_retail:'modern',modern_retail_block_1980s_refaced:'modern',church:'church',station:'station',eclectic_pavilion:'agora'};
const ARCH_SPECIAL=new Set(['church','station','eclectic_pavilion']);// keep their hand-built landmark generators (30_buildings.js) and only take heights/colours
const ARCH={n:0,cls:{},src:{},nearTris:0};
const pickH=(arr,r)=>arr[Math.min(arr.length-1,Math.floor(r*arr.length))];
const AWN_PLAIN=['#d8c9a3','#4f6b4a','#b55b3c','#d8c9a3','#cdbf9a','#5a6b52','#a8462e','#3f5872'];

function archRec(B){const s=BDATA.spec;if(!s||!B.tags||!B.tags.id)return null;return s[B.tags.id]||null}

/* the parameter set of one building (all choices deterministic from its hash, inside the ranges research gives for its class) */
function archProfile(B,s){const sty=((BDATA.spec&&BDATA.spec._styles)||{})[s.style]||{};const H=(B.h|0)+1;const r=k=>hf(H*131+k*7919);const feat=new Set(s.features||[]);
  const fa=s.facade||{},bal=s.balconies||{},cls=s.style;const isHex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
  const P={cls,feat,conf:s.confidence,wall:isHex(fa.colour)?fa.colour:'#efe9dc',trim:isHex(fa.trim)?fa.trim:'#f4f1ea',base:isHex(fa.base)?fa.base:null,baseMat:isHex(fa.base)?null:fa.base,mat:fa.material||'plaster',
    lv:Math.max(1,s.levels|0||1),gfh:+s.gfH||3.4,fh:+s.floorH||3.05,roof:s.roof||'flat',roofCol:isHex(s.roofColour)?s.roofColour:null,setTop:!!s.setbackTop,pilotis:!!s.pilotis,awn:s.awnings||'none',raise:+s.raisedGroundM||0,
    balc:{type:bal.type||'none',rail:bal.rail||'none',dep:+bal.depthM||0,perFloor:!!bal.perFloor},name:s.name||''};
  if(P.fh<2.6)P.fh=3.05;
  const bd=sty.balcony&&sty.balcony.depth;if(!P.balc.dep)P.balc.dep=Array.isArray(bd)?lerp(bd[0],bd[1],r(1)):(+bd||1.2);
  P.stoneBase=feat.has('stone_clad_base')||P.baseMat==='stone';P.stoneCol=pickH(['#e3d3b8','#d9cbb2','#cfc3ad','#e6dccb'],r(2));
  P.shutCol=feat.has('shutters_green')?pickH(['#3d5e46','#4a6b4f','#36513f'],r(3)):feat.has('shutters_brown')?pickH(['#6b4a33','#7a5a3c','#5a3d2a'],r(3)):null;
  P.frame='#d6d7d3';P.shut=null;P.rollCol=pickH(['#ddd3bb','#eeeeea','#cfc7b4','#e6e0cf','#b8ab8e','#7a5a3c'],r(4));P.awnCol=pickH(AWN_PLAIN,r(5));P.awnStripe=r(6)<0.3?pickH([T.awnS,T.awnG,T.awnR],r(7)):0;
  P.slabEdge='#f2f0ea';P.sill='#ece8e1';P.box=false;P.surround=0;P.head=null;P.quoins=feat.has('quoins');P.cornice=feat.has('cornice')?0.45:0;P.plinth=feat.has('rusticated_plinth')?1:0;P.eaves=0.55;P.ac=feat.has('ac_units');
  P.bayW=3.0;P.win={w:1.25,h:1.4,sill:0.95};P.door={w:1.7,h:2.2};P.panes=1;
  switch(cls){
    case 'poly_6080':P.bayW=lerp(2.8,3.4,r(10));P.win={w:lerp(1.1,1.4,r(11)),h:1.35,sill:1.0};P.door={w:lerp(1.6,2.2,r(12)),h:2.2};P.frame=pickH(['#d6d7d3','#eeeeea','#d6d7d3','#6b5644','#c9c4b8'],r(13));P.shut='roll';P.box=r(14)<0.7;break;
    case 'poly_8000':P.bayW=lerp(3.0,3.6,r(10));P.win={w:lerp(1.1,1.3,r(11)),h:1.4,sill:0.95};P.door={w:lerp(1.3,1.7,r(12)),h:2.2};P.frame=pickH(['#efefeb','#6b4a33','#e9e6df','#4a3a2c'],r(13));
      P.shut=P.shutCol||feat.has('timber_or_alu_shutters')?'louvre':'roll';if(!P.shutCol)P.shutCol=pickH(['#6b4a33','#3d5e46','#ecebe6','#8a6a48','#c9c2b0'],r(14));P.surround=r(15)<0.4?0.12:0;P.eaves=0.6;break;
    case 'poly_modern':P.bayW=lerp(3.2,4.2,r(10));P.win={w:1.4,h:1.6,sill:0.85};P.door={w:lerp(2.4,3.0,r(12)),h:2.5};P.frame=pickH(['#3b3c3e','#2c2d2f','#6a6c6e','#e8e8e6'],r(13));P.shut=r(14)<0.5?'roll':null;P.rollCol=pickH(['#3b3c3e','#8c8f92','#d6d4ce'],r(15));
      P.clad=r(16)<0.55?pickH(['#cfc6b6','#b9ae9c','#8f8f8c','#a07a58'],r(17)):null;break;
    case 'neo_villa':P.bayW=lerp(2.5,2.8,r(10));P.win={w:1.15,h:2.4,sill:0.9};P.door={w:1.3,h:2.9};P.frame='#f4f2ec';P.shut='louvre';if(!P.shutCol)P.shutCol=pickH(['#3d5e46','#6c7f8a','#3d5e46','#5d7f9a'],r(14));
      P.surround=0.15;P.head='cornice';P.ped=r(15)<0.65;P.cornice=Math.max(P.cornice,0.55);P.eaves=0.75;P.plinth=Math.max(P.plinth,1);if(!P.raise)P.raise=lerp(0.6,1.4,r(16));P.quoins=P.quoins||r(17)<0.6;P.panes=3;break;
    case 'interwar':P.bayW=2.8;P.win={w:1.2,h:1.9,sill:0.9};P.door={w:1.3,h:2.4};P.frame=pickH(['#f4f2ec','#5a4a3a'],r(13));P.surround=0.12;P.shut=r(14)<0.5?'louvre':'roll';if(!P.shutCol)P.shutCol=pickH(['#3d5e46','#6b4a33','#6c7f8a'],r(15));P.cornice=0.3;P.panes=2;break;
    case 'hotel':P.bayW=2.7;P.win={w:1.2,h:2.3,sill:0.4};P.door={w:1.2,h:2.4};P.frame='#f4f2ec';P.surround=0.14;P.head='cornice';P.shut='louvre';if(!P.shutCol)P.shutCol=pickH(['#3d5e46','#6c7f8a','#ecebe6'],r(14));P.cornice=0.5;P.panes=3;break;
    case 'villa_modern':P.bayW=lerp(3.0,3.8,r(10));P.win={w:lerp(1.2,1.6,r(11)),h:1.45,sill:0.9};P.door={w:lerp(1.6,2.4,r(12)),h:2.3};P.frame=pickH(['#efefeb','#3b3c3e','#6b4a33','#e9e6df'],r(13));P.shut=r(14)<0.6?'louvre':'roll';
      if(!P.shutCol)P.shutCol=pickH(['#6b4a33','#ecebe6','#3d5e46','#8f9296'],r(15));P.eaves=0.6;break;
    case 'house_suburban':P.bayW=3.2;P.win={w:1.2,h:1.4,sill:0.95};P.door={w:1.4,h:2.2};P.frame=pickH(['#efefeb','#6b4a33'],r(13));P.shut='louvre';if(!P.shutCol)P.shutCol=pickH(['#6b4a33','#3d5e46','#ecebe6','#8a6a48'],r(15));P.eaves=0.55;break;
    case 'retail_modern':case 'modern_retail_block_1980s_refaced':P.bayW=2.0;P.curtain=P.mat==='glass'||cls!=='retail_modern'||r(10)<0.5;P.frame='#3b3c3e';if(P.mat==='brick'){P.curtain=false;P.bayW=2.6;P.win={w:1.4,h:1.9,sill:0.7}}break;
    case 'market_hall':case 'arcade_retail':P.bayW=3.4;P.win={w:1.6,h:1.6,sill:0.8};P.frame='#f4f2ec';P.surround=0.12;P.cornice=0.35;break;
    case 'ancillary':case 'kiosk':P.bayW=3.4;P.win={w:0.9,h:1.0,sill:1.2};P.frame='#d6d7d3';break}
  // photo-checked details named in the features list
  for(const f of feat){if(/blue_painted_window_frames/.test(f)){P.frame='#3f6d9a';P.shut=null}if(/green_fascia_band/.test(f))P.trim='#3e5a45';const m=/(#[0-9a-f]{6})/i.exec(f);if(m&&/tympanum/.test(f))P.tympanum=m[1];if(/cross_gable/.test(f))P.crossGable=true;if(/oculus/.test(f))P.oculus=true}
  P.wt=P.mat==='stone'?TM.ashlar:P.mat==='brick'?TM.brickw:TM.plaster;if(P.wt!==TM.plaster){const c=hexc(P.wall);P.wall='#'+new THREE.Color(lerp(c[0],1,0.45),lerp(c[1],1,0.45),lerp(c[2],1,0.45)).getHexString()}
  // balcony type → generator mode
  const bt=P.balc.type;P.bmode=bt==='continuous_slab'?'cont':bt==='individual'?'ind':bt==='recessed'?'rec':bt==='glass'?'cont':'none';
  P.rail=P.balc.rail==='none'?(bt==='glass'?'glass':'iron'):P.balc.rail;if(bt==='glass')P.rail='glass';
  P.railCol=P.rail==='iron'?pickH(['#2a2c2d','#2f3a33','#3a3a3a'],r(20)):'#d2d5d7';
  return P}

/* heights / roof type of a building described by the spec (replaces bldHeights for those) */
function archHeights(B){const P=B.P;const has=B.shopsE.some(a=>a.length>0);B.hasShop=has;B.lv=P.lv;
  B.gfh=has?Math.max(P.gfh,4.0):P.gfh;if(B.style==='neo'&&!has)B.gfh=Math.max(B.gfh,3.6);B.fh=P.fh;
  B.gy=B.gmax+0.14+(has?0:P.raise);B.pent=P.setTop&&B.lv>=3&&B.area>110;B.ip=B.pent?insetPoly(B.ps,2.0):null;if(B.ip&&Math.abs(polyArea(B.ip))<B.area*0.35)B.ip=null;if(!B.ip)B.pent=false;
  const lvB=B.pent?B.lv-1:B.lv;B.top=B.gy+B.gfh+(lvB-1)*B.fh;
  let rt=/hip|gable/.test(P.roof)?'hip':'flat';B.roofT=rt;B.solar=P.roof==='flat_solar'||P.feat.has('solar_water_heaters');
  B.rectish=!!(B.rv&&B.area/(B.rv[2]*B.rv[3])>0.83&&B.rv[2]<46)}

/* ---------- bay layout of one edge: one letter per bay, the same on every floor (facades are vertically aligned) ----------
   D balcony door · W window · T tall (neoclassical) window · S small window · F floor-to-ceiling slider · L recessed loggia · G curtain-wall bay · B blank */
function bayLayout(B,P,E,front,nb){const out=[],H=(B.h|0)*97+E.i*31;const r=k=>hf(H+k*613);const cls=P.cls;
  for(let k=0;k<nb;k++){let c='W';const x=r(k);
    if(P.curtain)c='G';
    else if(cls==='poly_6080')c=front?(P.bmode!=='none'?(x<0.62?'D':'W'):(x<0.8?'W':'S')):(x<0.45?'W':x<0.65?'S':'B');
    else if(cls==='poly_8000')c=front?(P.bmode==='rec'?(x<0.45?'L':'W'):P.bmode!=='none'?(x<0.42?'D':'W'):'W'):(x<0.55?'W':x<0.7?'S':'B');
    else if(cls==='poly_modern')c=front?(P.bmode==='rec'?(x<0.6?'L':x<0.85?'F':'B'):(x<0.7?'F':x<0.85?'W':'B')):(x<0.5?'W':x<0.6?'F':'B');
    else if(cls==='neo_villa'||cls==='hotel'||cls==='interwar')c=front||cls!=='interwar'?(x<0.9?'T':'B'):(x<0.6?'T':'B');
    else if(cls==='villa_modern'||cls==='house_suburban')c=x<0.25&&P.bmode!=='none'&&front?'D':x<0.8?'W':'B';
    else if(cls==='ancillary'||cls==='kiosk')c=x<0.35?'S':'B';
    else c=front?'W':(x<0.5?'W':'B');
    out.push(c)}
  // neoclassical fronts are symmetric: mirror the left half
  if(/neo_villa|hotel/.test(cls)){for(let k=0;k<nb;k++)out[k]=out[nb-1-k]=(out[k]==='B'&&out[nb-1-k]==='B')?'B':'T';if(front&&nb>=3&&nb%2)out[(nb-1)/2]='T'}
  return out}

/* far twin: the painted bay tile that matches a bay letter */
function farTile(c,P){if(c==='G')return T.office;if(c==='T')return P.cls==='interwar'?T.win:T.neo;if(c==='D'||c==='F'||c==='L')return T.balc;if(c==='S')return T.small;if(c==='B')return T.plain;return /villa|house/.test(P.cls)?T.villaW:T.win}

/* ---------- one opening (near): wall around it, reveals, glass, frame, sill, shutters, surround/head ---------- */
function openingN(G,Gc,E,s0,s1,y0,y1,o){const a=o.a,b=o.b,ys=o.ys,yt=o.yt,dr=o.dr||0.18,col=o.col,wt=o.wt||TM.plaster,ww=b-a,wh=yt-ys,c=(a+b)/2;
  eq(G,E,s0,s1,0,y0,ys,col,wt,s0,s1,y0,ys);eq(G,E,s0,s1,0,yt,y1,col,wt,s0,s1,yt,y1);eq(G,E,s0,a,0,ys,yt,col,wt,s0,a,ys,yt);eq(G,E,b,s1,0,ys,yt,col,wt,b,s1,ys,yt);
  const rv=shade(col,0.8),A=EP(E,a,0),A2=EP(E,a,-dr),Bq=EP(E,b,0),B2=EP(E,b,-dr);
  G.wall(A2[0],A2[1],A[0],A[1],ys,ys,yt,yt,E.ux,E.uz,0,dr,ys,yt,rv,RECT[wt],0);G.wall(Bq[0],Bq[1],B2[0],B2[1],ys,ys,yt,yt,-E.ux,-E.uz,0,dr,ys,yt,rv,RECT[wt],0);
  G.hq([A[0],yt,A[1]],[Bq[0],yt,Bq[1]],[B2[0],yt,B2[1]],[A2[0],yt,A2[1]],[0,0],[ww,0],[ww,dr],[0,dr],shade(rv,0.85),RECT[wt],0,true);
  G.hq([A2[0],ys,A2[1]],[B2[0],ys,B2[1]],[Bq[0],ys,Bq[1]],[A[0],ys,A[1]],[0,0],[ww,0],[ww,dr],[0,dr],hexc(o.sillCol||'#e6e2da'),RECT[TM.marble],0);
  const v=o.gv|0,u0=(v%2)*0.5+0.01,v0=(v>1?0:0.5)+0.01;eq(G,E,a,b,-dr,ys,yt,C1,T.gkWin,u0,u0+0.48,v0,v0+0.48,o.gl||0);
  // frame: outer + mullions/transom
  const fc=hexc(o.fcol||'#d6d7d3'),fw=o.fw||0.055,fd=-dr,fd1=-dr+0.06,ft=TM.metalL;
  ebox(G,E,a,a+fw,fd,fd1,ys,yt,fc,ft,0,'fr');ebox(G,E,b-fw,b,fd,fd1,ys,yt,fc,ft,0,'fl');ebox(G,E,a,b,fd,fd1,yt-fw,yt,fc,ft,0,'fu');ebox(G,E,a,b,fd,fd1,ys,ys+fw,fc,ft,0,'ft');
  const nm=o.mull==null?(ww>1.0?1:0):o.mull;for(let k=1;k<=nm;k++){const x=a+ww*k/(nm+1);ebox(G,E,x-fw*0.6,x+fw*0.6,fd,fd1+0.01,ys,yt,fc,ft,0,'flr')}
  if(o.transom){const y=ys+wh*o.transom;ebox(G,E,a,b,fd,fd1,y-0.03,y+0.03,fc,ft,0,'ftu')}
  if(o.panes>1)for(let k=1;k<o.panes;k++){const y=ys+wh*k/o.panes;ebox(G,E,a,b,fd,fd+0.04,y-0.015,y+0.015,fc,ft,0,'ft')}
  // sill
  if(o.sill!==false&&ys>y0+0.3)ebox(G,E,a-0.07,b+0.07,-0.02,0.07,ys-0.06,ys,hexc(o.sillCol||'#ece8e1'),TM.marble,0,'flrtu');
  // roller shutter (partly down) + external box
  if(o.roll!=null){const yb=yt-o.roll*wh;if(o.roll>0.04)eq(G,E,a+0.01,b-0.01,-0.05,yb,yt,hexc(o.rollCol),TM.shutterM,0,ww,yb,yt);if(o.box)ebox(G,E,a-0.06,b+0.06,0,0.13,yt,yt+0.26,shade(col,1.02),TM.plaster,0,'flrtu')}
  // louvred shutters: open against the wall, or closed over the glass
  if(o.louv){const sc=hexc(o.louv);if(o.closed){eq(G,E,a+0.02,c,-0.07,ys,yt,sc,T.gkLouv,0,1,0,1);eq(G,E,c,b-0.02,-0.07,ys,yt,sc,T.gkLouv,0,1,0,1)}
    else{const lw=ww/2;eq(G,E,a-lw-0.02,a-0.02,0.035,ys,yt,sc,T.gkLouv,0,1,0,1);eq(G,E,b+0.02,b+lw+0.02,0.035,ys,yt,sc,T.gkLouv,0,1,0,1)}}
  // moulded surround + cornice head / pediment (neoclassical)
  if(o.sur){const sw=o.sur,tc=hexc(o.tcol||'#f6f3ec');ebox(G,E,a-sw,a,0,0.045,ys-(o.sill===false?0:0.02),yt+sw,tc,TM.plaster,0,'flrt');ebox(G,E,b,b+sw,0,0.045,ys-(o.sill===false?0:0.02),yt+sw,tc,TM.plaster,0,'flrt');ebox(G,E,a,b,0,0.045,yt,yt+sw,tc,TM.plaster,0,'ft');
    if(o.head){const y=yt+sw;ebox(G,E,a-sw-0.12,b+sw+0.12,0,0.15,y+0.04,y+0.16,tc,TM.plaster,0,'flrtu');ebox(G,E,a-sw,b+sw,0,0.07,y,y+0.05,shade(tc,0.95),TM.plaster,0,'flr');
      if(o.ped&&y1-y>0.75){const pa=EP(E,a-sw-0.1,0.13),pb=EP(E,b+sw+0.1,0.13),pc=EP(E,c,0.13),yb=y+0.16,yp=yb+Math.min(0.5,(ww+2*sw)*0.22);
        G.tri([pa[0],yb,pa[1]],[pb[0],yb,pb[1]],[pc[0],yp,pc[1]],[0,0],[ww,0],[ww/2,yp-yb],tc,RECT[TM.plaster],0,false);
        const wa=EP(E,a-sw-0.1,0),wb=EP(E,b+sw+0.1,0),wc2=EP(E,c,0);G.hq([pa[0],yb,pa[1]],[pc[0],yp,pc[1]],[wc2[0],yp,wc2[1]],[wa[0],yb,wa[1]],[0,0],[1,0],[1,0.13],[0,0.13],shade(tc,0.92),RECT[TM.plaster],0);
        G.hq([pc[0],yp,pc[1]],[pb[0],yb,pb[1]],[wb[0],yb,wb[1]],[wc2[0],yp,wc2[1]],[0,0],[1,0],[1,0.13],[0,0.13],shade(tc,0.92),RECT[TM.plaster],0)}}}
  // window bars on ground-floor windows
  if(o.bars&&Gc)eq(Gc,E,a,b,0.025,ys,yt,hexc('#2a2c2d'),T.rail,0,ww/1.2,0,1);
  if(FAC.mode==='near')ARCH.nOpen=(ARCH.nOpen||0)+1}

/* the opening of a bay letter (geometry parameters) */
function bayOpening(B,P,c,s0,s1,y0,y1,fl,k,E){const w=s1-s0,fh=y1-y0,H=(B.h|0)*53+E.i*17+k*7+fl*131;const r=j=>hf(H+j*977);const mid=(s0+s1)/2;let ow,oh,ys;
  if(c==='D'){ow=Math.min(P.door.w,w-0.6);oh=Math.min(P.door.h,fh-0.55);ys=y0+0.04}
  else if(c==='F'||c==='L'){ow=Math.min(P.door.w,w-(c==='L'?0.9:0.45));oh=Math.min(P.door.h,fh-0.45);ys=y0+0.04}
  else if(c==='T'){ow=Math.min(P.win.w,w*0.5);oh=Math.min(P.win.h,fh-1.2);ys=y0+Math.min(P.win.sill,fh-oh-0.6)}
  else if(c==='S'){ow=0.62;oh=0.62;ys=y0+1.55}
  else{ow=Math.min(P.win.w,w*0.6);oh=Math.min(P.win.h,fh-1.25);ys=y0+Math.min(P.win.sill,fh-oh-0.5)}
  const lit=hf(H*3+11);const o={wt:P.wt,a:mid-ow/2,b:mid+ow/2,ys,yt:ys+oh,gl:lit<0.28?1:lit<0.36?0.55:0,gv:Math.floor(r(1)*4),fcol:P.frame,sillCol:P.sill,mull:c==='S'||c==='T'?(c==='T'?1:0):(ow>1.5?(c==='F'?2:1):ow>0.95?1:0),dr:c==='T'?0.22:0.17};
  if(c==='T'){o.panes=P.panes||2;o.transom=0.78}
  if(P.shut==='roll'&&c!=='S'){o.roll=r(2)<0.35?0:r(2)<0.75?lerp(0.1,0.5,r(3)):lerp(0.6,0.95,r(3));o.rollCol=P.rollCol;o.box=P.box}
  else if(P.shut==='louvre'&&c!=='S'&&c!=='L'&&c!=='F'){o.louv=P.shutCol;o.closed=r(4)<0.18}
  if(P.surround&&c!=='S'){o.sur=P.surround;o.tcol=P.trim;if(P.head&&fl>=0){o.head=true;o.ped=!!P.ped&&fl>=1&&((k+fl)%2===0||P.cls==='hotel'?false:true)}}
  return o}

/* ---------- balconies / rails (chunk geometry, always visible) ---------- */
function railP(ch,O,E,s0,s1,d,y,P,sides,dep){const L=s1-s0,hP=1.0,rail=P.rail;if(L<0.2)return;const C=ch.cut;
  const runs=[[EP(E,s0,d),EP(E,s1,d),E.nx,E.nz,L]];if(sides){runs.push([EP(E,s0,0),EP(E,s0,d),-E.ux,-E.uz,d]);runs.push([EP(E,s1,d),EP(E,s1,0),E.ux,E.uz,d])}
  if(rail==='masonry'){ebox(O,E,s0,s1,d-0.12,d,y,y+0.92,B_wc(P),TM.plaster,0,'fbt');if(sides){ebox(O,E,s0,s0+0.12,0,d-0.12,y,y+0.92,B_wc(P),TM.plaster,0,'lrt');ebox(O,E,s1-0.12,s1,0,d-0.12,y,y+0.92,B_wc(P),TM.plaster,0,'lrt')}
    ebox(O,E,s0-0.03,s1+0.03,d-0.16,d+0.03,y+0.92,y+0.97,hexc('#efece6'),TM.marble,0,'flrtu');return}
  for(const [A,Bp,nx,nz,l] of runs){
    if(rail==='glass'){C.wall(A[0],A[1],Bp[0],Bp[1],y+0.04,y+0.04,y+hP,y+hP,nx,nz,0,l/1.6,0,1,C1,RECT[T.glassR],0);C.wall(Bp[0],Bp[1],A[0],A[1],y+0.04,y+0.04,y+hP,y+hP,-nx,-nz,0,l/1.6,0,1,C1,RECT[T.glassR],0)}
    else if(rail==='alu'){C.wall(A[0],A[1],Bp[0],Bp[1],y,y,y+hP,y+hP,nx,nz,0,l/1.2,0,1,hexc(P.railCol),RECT[T.gkAlu],0);C.wall(Bp[0],Bp[1],A[0],A[1],y,y,y+hP,y+hP,-nx,-nz,0,l/1.2,0,1,shade(hexc(P.railCol),0.8),RECT[T.gkAlu],0)}
    else if(rail==='wood'){C.wall(A[0],A[1],Bp[0],Bp[1],y,y,y+hP,y+hP,nx,nz,0,l/1.6,0,1,hexc('#6b4a33'),RECT[T.bBalu||T.rail],0)}
    else{C.wall(A[0],A[1],Bp[0],Bp[1],y,y,y+hP,y+hP,nx,nz,0,l/1.2,0,1,hexc(P.railCol),RECT[T.rail],0);C.wall(Bp[0],Bp[1],A[0],A[1],y,y,y+hP,y+hP,-nx,-nz,0,l/1.2,0,1,hexc(P.railCol),RECT[T.rail],0)}}
  const capC=rail==='iron'||rail==='wood'?hexc(rail==='wood'?'#5a3d2a':P.railCol):hexc(rail==='glass'?'#c9ced2':'#e4e7e8');
  ebox(O,E,s0,s1,d-0.05,d+0.02,y+hP,y+hP+0.05,capC,TM.metalL,0,'ftu');if(sides){ebox(O,E,s0,s0+0.05,0,d,y+hP,y+hP+0.05,capC,TM.metalL,0,'lrt');ebox(O,E,s1-0.05,s1,0,d,y+hP,y+hP+0.05,capC,TM.metalL,0,'lrt')}}
const B_wc=P=>P._wc||C1;

/* fabric drop awning over a balcony bay (near): from the wall under the slab above, sloping out over the rail */
function awningN(G,E,s0,s1,y,fh,dep,P,H){const col=hf(H)<0.75?hexc(P.awnCol):hexc(pickH(AWN_PLAIN,hf(H*7)));const st=P.awnStripe&&hf(H*3)<0.85?P.awnStripe:0;const yt=y+fh-0.3,yb=y+fh-1.3,d=dep+0.12;
  if(hf(H*5)<0.3){ebox(G,E,s0,s1,0,0.16,yt-0.14,yt,col,T.gkFab,0,'flrtu');return}// retracted: only the cassette
  const A=EP(E,s0,0.02),Bq=EP(E,s1,0.02),C=EP(E,s1,d),D=EP(E,s0,d),tl=st||T.gkFab,cc=st?C1:col,L=s1-s0,us=st?L/1.6:L;
  G.hq([A[0],yt,A[1]],[D[0],yb,D[1]],[C[0],yb,C[1]],[Bq[0],yt,Bq[1]],[0,0],[0,1],[us,1],[us,0],cc,RECT[tl],0);G.hq([Bq[0],yt-0.015,Bq[1]],[C[0],yb-0.015,C[1]],[D[0],yb-0.015,D[1]],[A[0],yt-0.015,A[1]],[0,0],[0,1],[us,1],[us,0],shade(cc,0.7),RECT[tl],0,true);
  eq(G,E,s0,s1,d,yb-0.24,yb,cc,tl,0,us,0.8,1);eq(G,E,s0,s1,d-0.01,yb-0.24,yb,shade(cc,0.7),tl,us,0,0.8,1,0,true);
  for(const s of[s0+0.05,s1-0.05]){const p=EP(E,s,0.03),q=EP(E,s,d);G.box((p[0]+q[0])/2,(yt+yb)/2-0.05,(p[1]+q[1])/2,0.03,0.03,Math.hypot(d,yt-yb),0,hexc('#8a8d90'),RECT[TM.metalL])}}

/* classical pediment standing on the cornice of an edge (s0..s1): tympanum, raking cornices, base cornice; optional oculus */
function pedimentO(O,E,s0,s1,y,col,tym,oculus){const w=s1-s0,h=Math.min(2.6,w*0.2),c=(s0+s1)/2,d=0.18;const a=EP(E,s0,d),b=EP(E,s1,d),t=EP(E,c,d),a0=EP(E,s0,-1.2),b0=EP(E,s1,-1.2),t0=EP(E,c,-1.2);
  O.tri([a[0],y,a[1]],[b[0],y,b[1]],[t[0],y+h,t[1]],[0,0],[w,0],[w/2,h],hexc(tym||'#f1ece2'),RECT[TM.plaster],0,false);
  const rk=(p,q,yp,yq)=>{O.hq([p[0],yp+0.22,p[1]],[q[0],yq+0.22,q[1]],[q[0],yq,q[1]],[p[0],yp,p[1]],[0,0],[1,0],[1,0.2],[0,0.2],col,RECT[TM.plaster],0);};
  const a1=EP(E,s0-0.15,d+0.12),b1=EP(E,s1+0.15,d+0.12),t1=EP(E,c,d+0.12);rk(a1,t1,y-0.05,y+h);rk(t1,b1,y+h,y-0.05);
  O.hq([a1[0],y+0.17,a1[1]],[t1[0],y+h+0.22,t1[1]],[t0[0],y+h+0.22,t0[1]],[a0[0],y+0.17,a0[1]],[0,0],[1,0],[1,1],[0,1],shade(hexc('#b85a3a'),0.9),RECT[TM.tiles],0);
  O.hq([t1[0],y+h+0.22,t1[1]],[b1[0],y+0.17,b1[1]],[b0[0],y+0.17,b0[1]],[t0[0],y+h+0.22,t0[1]],[0,0],[1,0],[1,1],[0,1],shade(hexc('#b85a3a'),0.9),RECT[TM.tiles],0);
  ebox(O,E,s0-0.15,s1+0.15,0,d+0.14,y-0.12,y+0.02,col,TM.plaster,0,'ftu');
  if(oculus){const r=Math.min(0.45,h*0.22),q=EP(E,c,d+0.01);O.cyl(q[0],y+h*0.42,q[1],r,r,0.02,10,hexc('#2f3a40'),RECT[TM.metalL],true)}}

/* ---------- roofs ---------- */
// tiled roof for any footprint: eaves overhang + a tiled slope band rising inwards to an inset ring (+ flat concealed top). Reads as a hip roof from the street.
function perimRoof(O,ps,y,col,e,band,pitch){const out=insetPoly(ps,-e),inn=insetPoly(ps,band);if(!out||!inn||out.length!==ps.length||inn.length!==ps.length)return false;const rise=(band+e)*Math.tan(pitch);const n=ps.length,rc=RECT[TM.tiles];const yb=y-0.06,yr=yb+rise;
  for(let i=0;i<n;i++){const j=(i+1)%n;const a=out[i],b=out[j],c=inn[j],d=inn[i];const l=Math.hypot(b[0]-a[0],b[1]-a[1]),sl=Math.hypot(band+e,rise);
    O.hq([a[0],yb,a[1]],[b[0],yb,b[1]],[c[0],yr,c[1]],[d[0],yr,d[1]],[0,0],[l,0],[l,sl],[0,sl],col,rc,0);
    O.hq([b[0],yb-0.02,b[1]],[a[0],yb-0.02,a[1]],[ps[i][0],yb-0.02,ps[i][1]],[ps[j][0],yb-0.02,ps[j][1]],[0,0],[l,0],[l,e],[0,e],hexc('#cfc7b8'),RECT[TM.plaster],0,true);
    O.wall(a[0],a[1],b[0],b[1],yb-0.2,yb-0.2,yb,yb,(b[1]-a[1]),-(b[0]-a[0]),0,l,0,0.2,hexc('#f1eee7'),RECT[TM.plaster],0)}
  // hip ridges between bands
  for(let i=0;i<n;i++){const a=out[i],d=inn[i];const mx=(a[0]+d[0])/2,mz=(a[1]+d[1])/2,l=Math.hypot(d[0]-a[0],d[1]-a[1]);const ang=Math.atan2(d[1]-a[1],d[0]-a[0]);O.box(mx,yb+rise/2+0.04,mz,Math.hypot(l,rise),0.08,0.16,-ang,shade(col,0.82),rc)}
  flatPoly(O,inn,yr-0.02,shade(col,0.75),TM.tiles);return true}
// timber pergola on a roof terrace (near)
function pergolaN(G,ps,y,H){let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9;for(const p of ps){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}
  const w=Math.min(5,(maxx-minx)*0.45),d=Math.min(4,(maxz-minz)*0.45);if(w<2||d<2)return;const cx=lerp(minx+w/2+0.6,maxx-w/2-0.6,hf(H)),cz=lerp(minz+d/2+0.6,maxz-d/2-0.6,hf(H*3));
  if(!pip(ps,cx-w/2,cz-d/2)||!pip(ps,cx+w/2,cz+d/2)||!pip(ps,cx+w/2,cz-d/2)||!pip(ps,cx-w/2,cz+d/2))return;const tc=hexc('#7a5a3c'),tr=RECT[TM.timber];
  for(const [px,pz] of[[-1,-1],[1,-1],[1,1],[-1,1]])G.box(cx+px*(w/2-0.1),y+1.15,cz+pz*(d/2-0.1),0.14,2.3,0.14,0,tc,tr);
  for(let k=0;k<=Math.floor(w/0.6);k++)G.box(cx-w/2+k*0.6,y+2.36,cz,0.06,0.14,d+0.3,0,tc,tr);for(const pz of[-1,1])G.box(cx,y+2.24,cz+pz*(d/2-0.1),w+0.3,0.12,0.1,0,tc,tr)}

/* ---------- ground floor of a residential edge (no shop): pilotis, entrance, windows with bars, stone-clad base ---------- */
function groundResP(B,P,E,s0,s1,O,X,FG,front,wc,base){const gy=B.gy,gfh=B.gfh,L=s1-s0;if(L<0.05)return;
  const lob=B.lobby&&B.lobby.E===E&&B.lobby.s>s0+0.9&&B.lobby.s<s1-0.9;if(lob){const ls=B.lobby.s;groundResP(B,P,E,s0,ls-1.25,O,X,FG,front,wc,base);groundResP(B,P,E,ls+1.25,s1,O,X,FG,front,wc,base);B.lobby.y=gy;return}
  const stone=P.stoneBase||P.plinth,sc=hexc(P.base||P.stoneCol),st=P.plinth?TM.ashlar:P.cls==='poly_8000'?TM.karystos||TM.marbleW:TM.marbleW;
  eq(O,E,s0,s1,0,base,gy,stone?shade(sc,0.9):shade(wc,0.84),stone?st:TM.plaster,s0,s1,base,gy);
  if(P.pilotis&&front&&L>2){// open parking under the building: columns on the facade line, dark recess behind
    const dd=Math.min(4.5,Math.sqrt(B.area)*0.3);const y1=gy+gfh;eq(O,E,s0,s1,-dd,gy-0.1,y1,hexc('#6f6a62'),TM.concrete,s0,s1,gy,y1);
    const A=EP(E,s0,0),Bq=EP(E,s1,0),A2=EP(E,s0,-dd),B2=EP(E,s1,-dd);O.hq([A2[0],y1-0.02,A2[1]],[B2[0],y1-0.02,B2[1]],[Bq[0],y1-0.02,Bq[1]],[A[0],y1-0.02,A[1]],[0,0],[L,0],[L,dd],[0,dd],hexc('#bdb8ae'),RECT[TM.concrete],0,true);
    O.hq([A[0],gy-0.05,A[1]],[Bq[0],gy-0.05,Bq[1]],[B2[0],gy-0.05,B2[1]],[A2[0],gy-0.05,A2[1]],[0,0],[L,0],[L,dd],[0,dd],hexc('#8d8a84'),RECT[TM.asph],0);
    const nc=Math.max(1,Math.round(L/4.5));for(let k=0;k<=nc;k++){const s=s0+0.25+(L-0.5)*k/nc;ebox(O,E,s-0.22,s+0.22,-0.45,0,gy-0.1,y1,stone?sc:shade(wc,0.97),stone?TM.marbleW:TM.plaster,0,'flrt')}
    ebox(O,E,s0,s1,-0.3,0.03,y1-0.35,y1,shade(wc,0.98),TM.plaster,0,'ftu');return}
  const nb=L<1.6?0:Math.max(1,Math.round(L/P.bayW));const sb=stone&&(P.cls==='poly_8000'||P.plinth||P.cls==='neo_villa');const gwc=sb?sc:wc,gwt=sb?(P.plinth?TM.ashlar:st):TM.plaster;
  if(nb===0){eq(O,E,s0,s1,0,gy,gy+gfh,gwc,gwt,s0,s1,gy,gy+gfh);return}
  const lay=bayLayout(B,P,E,front,nb).map(c=>c==='D'||c==='F'||c==='L'?'W':c==='G'?'W':c);
  for(let k=0;k<nb;k++){const a=s0+L*k/nb,b=s0+L*(k+1)/nb,c=lay[k];const lit=hf((B.h|0)*19+E.i*3+k);
    eq(FG,E,a,b,0,gy,gy+gfh,gwc,c==='B'?T.plain:farTile(c,P),0,1,0,gfh/3.1,lit<0.3?1:0);
    if(c==='B'){eq(X.o,E,a,b,0,gy,gy+gfh,gwc,gwt,a,b,gy,gy+gfh);continue}
    const o=bayOpening(B,P,c==='T'?'T':'W',a,b,gy,gy+gfh,0,k,E);o.col=gwc;o.wt=gwt;o.bars=front&&!/neo|hotel/.test(P.cls)&&hf((B.h|0)*7+k)<0.45;if(o.sur)o.ped=false;openingN(X.o,X.cut,E,a,b,gy,gy+gfh,o)}
  if(stone&&!sb)ebox(X.o,E,s0,s1,0,0.035,gy-0.02,gy+0.95,sc,st,0,'ft')}

/* ---------- the whole building ---------- */
function buildShellP(B){const P=B.P,NM=FAC.mode==='near',ch0=chunkAt(B.cx,B.cz),ch=NM?NULLCH:ch0,O=ch.o,N=bcell(B.cx,B.cz);const near=B.inF||B.detail;const Fc=fcell(B.cx,B.cz);
  if(!NM&&near)Fc.blds.push(B);const FG=NM?NULLGB:near?Fc.far:O;const X=NM?FAC.X:NULLCH;const wc=hexc(P.wall);B.wc=wc;P._wc=wc;
  const gy=B.gy,gfh=B.gfh,fh=B.fh,top=B.top,base=B.gmin-0.7,lvB=B.pent?B.lv-1:B.lv,H=(B.h|0)+7;const paraH=B.roofT==='flat'?(B.pent?1.05:0.95):0;
  if(!NM){ARCH.n++;ARCH.cls[P.cls]=(ARCH.cls[P.cls]||0)+1}
  // entrance: the longest street-facing gap on the ground floor
  if(!NM){let best=null;for(const E of B.E){const fr=B.F[E.i]>0?1:0;if(E.L<2.2)continue;const segs=B.shopsE[E.i];let prev=0.3;const gaps=[];for(const s of segs){gaps.push([prev,s.s0-0.1]);prev=s.s1+0.1}gaps.push([prev,E.L-0.3]);
      for(const g of gaps){const len=g[1]-g[0];if(len<1.9)continue;const sc=len*(0.4+fr)+(segs.length?2:0);if(!best||sc>best.sc)best={sc,E,s:(g[0]+g[1])/2}}}B.lobby=best}
  for(const E of B.E){const i=E.i,L=E.L;if(L<0.05)continue;if(!NM)addSeg(E.a[0],E.a[1],E.c[0],E.c[1],'b');const front=B.F[i]>0;const segs=B.shopsE[i];let cur=0;
    const gap=(s0,s1)=>{if(s1-s0<0.03)return;if(B.hasShop&&front){if(!NM)groundWall(B,E,s0,s1,O,N,front,wc,base,P.bayW)}else if(near)groundResP(B,P,E,s0,s1,O,X,FG,front,wc,base);else if(!NM)groundWall(B,E,s0,s1,O,N,front,wc,base,P.bayW)};
    for(const sh of segs){gap(cur,sh.s0);if(!NM)shopBuild(B,E,sh,O,N,base);cur=sh.s1}gap(cur,L);
    if(segs.length&&!NM){const s0=segs[0].s0,s1=segs[segs.length-1].s1;SHOPFRONTS.push({a:EP(E,s0,0),c:EP(E,s1,0),nx:E.nx,nz:E.nz,L:s1-s0,n:segs.length})}
    if(P.plinth&&front&&!segs.length)ebox(O,E,0,L,0,0.06,base,gy,hexc(P.base||'#d9cfbd'),TM.ashlar,0,'ft')}
  // ---- upper floors ----
  const clad=P.clad?hexc(P.clad):null;
  for(const E of B.E){const i=E.i,L=E.L;if(L<0.05)continue;const front=B.F[i]>0;
    const nb=L<1.6?0:Math.max(1,Math.round(L/P.bayW));const lay=nb?bayLayout(B,P,E,front,nb):[];
    for(let fl=1;fl<lvB;fl++){const y0=gy+gfh+(fl-1)*fh,y1=y0+fh;
      if(nb===0){eq(O,E,0,L,0,y0,y1,wc,P.wt,0,L,y0,y1);continue}
      for(let k=0;k<nb;k++){const s0=L*k/nb,s1=L*(k+1)/nb,c=lay[k];const lit=hf((B.h|0)*13+i*7+k*11+fl*29);const gl=lit<0.28?1:lit<0.36?0.55:0;
        if(c==='G'){// curtain wall: glass in a grid of mullions (far and near the same: glass is cheap)
          eq(O,E,s0,s1,0,y0,y1,C1,T.office,0,1,0,1,gl);if(near){const fc=hexc(P.frame);ebox(X.o,E,s0,s0+0.06,0,0.08,y0,y1,fc,TM.metalL,0,'flr');ebox(X.o,E,s0,s1,0,0.08,y0-0.05,y0+0.05,fc,TM.metalL,0,'ftu')}continue}
        if(!near){eq(O,E,s0,s1,0,y0,y1,wc,c==='B'?T.plain:farTile(c,P),0,1,0,1,gl);continue}
        eq(FG,E,s0,s1,0,y0,y1,wc,c==='B'?T.plain:farTile(c,P),0,1,0,1,gl);
        if(c==='B'){eq(X.o,E,s0,s1,0,y0,y1,clad||wc,clad?TM.marbleW:P.wt,s0,s1,y0,y1);continue}
        if(c==='L'){// recessed loggia: the bay is hollowed out to the balcony depth, glass slider at the back, rail on the facade line
          const dp=Math.min(P.balc.dep,1.8),a=s0+0.3,b=s1-0.3;eq(X.o,E,s0,a,0,y0,y1,wc,TM.plaster,s0,a,y0,y1);eq(X.o,E,b,s1,0,y0,y1,wc,TM.plaster,b,s1,y0,y1);eq(X.o,E,a,b,0,y1-0.3,y1,wc,TM.plaster,a,b,y1-0.3,y1);
          const E2={a:EP(E,0,-dp),c:EP(E,L,-dp),ux:E.ux,uz:E.uz,nx:E.nx,nz:E.nz,L};const o=bayOpening(B,P,'F',a,b,y0,y1-0.3,fl,k,E);o.col=shade(wc,0.92);openingN(X.o,null,E2,a,b,y0,y1-0.3,o);
          const A=EP(E,a,0),A2=EP(E,a,-dp),Bq=EP(E,b,0),B2=EP(E,b,-dp);X.o.wall(A2[0],A2[1],A[0],A[1],y0,y0,y1-0.3,y1-0.3,E.ux,E.uz,0,dp,y0,y1,shade(wc,0.85),RECT[TM.plaster],0);X.o.wall(Bq[0],Bq[1],B2[0],B2[1],y0,y0,y1-0.3,y1-0.3,-E.ux,-E.uz,0,dp,y0,y1,shade(wc,0.85),RECT[TM.plaster],0);
          X.o.hq([A[0],y1-0.3,A[1]],[Bq[0],y1-0.3,Bq[1]],[B2[0],y1-0.3,B2[1]],[A2[0],y1-0.3,A2[1]],[0,0],[b-a,0],[b-a,dp],[0,dp],shade(wc,0.8),RECT[TM.plaster],0,true);
          X.o.hq([A2[0],y0+0.02,A2[1]],[B2[0],y0+0.02,B2[1]],[Bq[0],y0+0.02,Bq[1]],[A[0],y0+0.02,A[1]],[0,0],[b-a,0],[b-a,dp],[0,dp],hexc('#d8d2c6'),RECT[TM.marble],0);
          railP(ch,X.o,E,a,b,0.02,y0,P,false);continue}
        const o=bayOpening(B,P,c,s0,s1,y0,y1,fl,k,E);o.col=wc;openingN(X.o,X.cut,E,s0,s1,y0,y1,o);
        if(clad&&(k===0||lay[k-1]==='B'||k%2===0))ebox(X.o,E,s0,s0+0.35,0,0.06,y0,y1,clad,TM.marbleW,0,'flr')}}
    // ---- slabs and balconies ----
    for(let fl=1;fl<lvB;fl++){const y=gy+gfh+(fl-1)*fh;
      if(front&&nb&&P.bmode==='cont'&&L>=3.2){const dep=P.balc.dep,s0=0.12,s1=L-0.12;ebox(O,E,s0,s1,0,dep,y-0.18,y,shade(wc,0.96),TM.concrete,0,'lrtu');ebox(O,E,s0,s1,dep-0.02,dep+0.02,y-0.2,y+0.03,hexc(P.slabEdge),TM.marble,0,'flrt');
        railP(ch,O,E,s0,s1,dep,y+0.03,P,true,dep);
        if(near){for(let k=0;k<nb;k++){const c=lay[k];if(c!=='D'&&c!=='F')continue;const a=L*k/nb,b=L*(k+1)/nb;if(P.awn==='fabric'&&hf(H*17+i*5+k*3+fl)<0.62)awningN(X.o,E,a+0.08,b-0.08,y,fh,dep,P,H*31+i*7+k*13+fl*3)}}}
      else if(front&&nb&&(P.bmode==='ind'||P.bmode==='rec'&&P.cls!=='poly_modern'&&P.cls!=='poly_8000')){const dep=Math.min(P.balc.dep||1.0,/neo|hotel|interwar/.test(P.cls)?0.85:1.6);
        for(let k=0;k<nb;k++){const c=lay[k];const isD=c==='D'||(c==='T'&&(P.balc.perFloor||(k===(nb-1)/2&&fl===1)));if(!isD)continue;const a=L*k/nb,b=L*(k+1)/nb,m=(a+b)/2,hw=Math.min((b-a)/2-0.05,(c==='T'?P.win.w:P.door.w)/2+0.35);
          ebox(O,E,m-hw,m+hw,0,dep,y-0.16,y,hexc(c==='T'?'#f2efe8':'#ece8e0'),TM.marble,0,'flrtu');if(c==='T'){for(const s of[m-hw+0.15,m+hw-0.15])ebox(O,E,s-0.07,s+0.07,0,dep*0.8,y-0.42,y-0.16,hexc('#f2efe8'),TM.plaster,0,'flr')}
          railP(ch,O,E,m-hw,m+hw,dep,y,P,true,dep);if(near&&P.awn==='fabric'&&c==='D'&&hf(H*11+k+fl*5)<0.5)awningN(X.o,E,m-hw+0.05,m+hw-0.05,y,fh,dep,P,H*37+k*3+fl)}
        ebox(O,E,0,L,0,0.06,y-0.15,y,shade(wc,0.95),TM.plaster,0,'ftu')}
      else ebox(O,E,0,L,0,/neo|hotel|interwar/.test(P.cls)?0.1:0.06,y-0.16,y,P.surround||/neo|hotel/.test(P.cls)?hexc(P.trim):shade(wc,0.94),TM.plaster,0,'ftu')}
    // ground-floor string course (neoclassical) and quoins
    if(/neo_villa|hotel|interwar/.test(P.cls)&&lvB>1)ebox(O,E,0,L,0,0.13,gy+gfh-0.2,gy+gfh,hexc(P.trim),TM.plaster,0,'ftu');
    if(P.quoins&&L>3)for(const ss of[0,L-0.6])for(let y=gy;y<top-0.3;y+=0.6){const wq=((y-gy)/0.6|0)%2?0.4:0.6;const s=ss===0?0:L-wq;ebox(near?X.o:O,E,s,s+wq,0,0.05,y+0.02,y+0.56,hexc(P.trim),TM.plaster,0,'flrtu')}
    // ---- parapet / cornice ----
    if(B.roofT==='flat'){eq(O,E,0,L,0,top,top+paraH,wc,TM.plaster,0,L,top,top+paraH);eq(O,E,0,L,-0.22,top,top+paraH,shade(wc,0.88),TM.plaster,L,0,top,top+paraH,0,true);
      ebox(O,E,-0.04,L+0.04,-0.26,P.cornice?0.3:0.05,top+paraH,top+paraH+(P.cornice?0.18:0.07),P.cornice?hexc(P.trim):shade(wc,1.03),P.cornice?TM.plaster:TM.marble,0,'ftu');
      if(P.cornice)ebox(O,E,0,L,0,P.cornice*0.6,top-0.3,top,hexc(P.trim),TM.plaster,0,'ftu')}
    else{const cd=P.cornice||0.12;ebox(O,E,-0.02,L+0.02,0,cd,top-0.3,top,hexc(P.cornice?P.trim:'#f1eee7'),TM.plaster,0,'ftu');if(P.cornice)ebox(O,E,0,L,0,cd*0.5,top-0.5,top-0.3,hexc(P.trim),TM.plaster,0,'ftu')}
    // ---- pediments named by research: a salmon tympanum on the square end (CrediaBank corner) / a small central cross-gable with oculus (Kifisias 297) ----
    if(!NM&&front&&P.tympanum&&E===B.E.filter(e=>B.F[e.i]>0&&e.L>5).sort((p,q)=>p.L-q.L)[0])pedimentO(O,E,0,L,top,hexc(P.trim),P.tympanum,false);
    if(!NM&&front&&P.crossGable&&E===B.E.filter(e=>B.F[e.i]>0).sort((p,q)=>q.L-p.L)[0])pedimentO(O,E,L*0.34,L*0.66,top,hexc(P.trim),P.wall,P.oculus);
    // ---- near clutter: AC units on balconies / under windows, potted plants ----
    if(near&&P.ac&&nb)for(let fl=1;fl<lvB;fl++){const y=gy+gfh+(fl-1)*fh;if(hf(H*3+fl*11+i*7)>0.6)continue;const k=Math.floor(hf(H+fl*7+i*13)*nb),a=L*k/nb,b=L*(k+1)/nb;const t=a+(b-a)*(lay[k]==='D'?0.82:0.5);
      const onB=front&&P.bmode==='cont';const yy=onB?y+0.03:y+0.25;ebox(X.o,E,t-0.4,t+0.4,0.02,0.3,yy,yy+0.56,hexc('#ecebe7'),TM.metalL,0,'flrt');eq(X.o,E,t-0.33,t+0.08,0.305,yy+0.07,yy+0.49,hexc('#8d9296'),T.rail,0,0.5,0,0.5)}
    if(near&&front&&P.bmode==='cont'&&(P.feat.has('planters')||P.cls==='poly_6080'))for(let fl=1;fl<lvB;fl++){if(hf(H*11+fl+i)>0.5)continue;const y=gy+gfh+(fl-1)*fh,t=L*(0.15+hf(H+fl*5+i)*0.7),Pp=EP(E,t,P.balc.dep-0.35);
      X.o.cyl(Pp[0],y,Pp[1],0.2,0.24,0.38,6,hexc('#a8552f'),RECT[TM.plaster],true);X.cut.cyl(Pp[0],y+0.35,Pp[1],0.34,0.12,0.75,5,hexc('#4f7a3a'),RECT[T.leaves],false)}}
  // ---- retiré (set-back top floor) ----
  if(B.pent){const ip=B.ip,y0=top,y1=top+fh;for(let k=0;k<ip.length;k++){const a=ip[k],c=ip[(k+1)%ip.length];const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz);if(L<0.1)continue;const E={a,c,ux:dx/L,uz:dz/L,nx:dz/L,nz:-dx/L,L,i:100+k};
      const nb=L<1.6?0:Math.max(1,Math.round(L/3.2));if(!nb||!near){for(let j=0;j<Math.max(1,nb);j++){const lit=hf(H*7+k*13+j);eq(O,E,L*j/Math.max(1,nb),L*(j+1)/Math.max(1,nb),0,y0,y1,wc,nb?T.balc:T.plain,0,1,0,1,lit<0.35?1:0)}}
      else for(let j=0;j<nb;j++){const s0=L*j/nb,s1=L*(j+1)/nb,lit=hf(H*7+k*13+j);eq(FG,E,s0,s1,0,y0,y1,wc,T.balc,0,1,0,1,lit<0.35?1:0);const o=bayOpening(B,P,hf(H+k*5+j)<0.7?'F':'B',s0,s1,y0,y1,9,j,E);if(hf(H+k*5+j)>=0.7){eq(X.o,E,s0,s1,0,y0,y1,wc,TM.plaster,s0,s1,y0,y1);continue}o.col=wc;openingN(X.o,null,E,s0,s1,y0,y1,o)}
      eq(O,E,0,L,0,y1,y1+0.45,wc,TM.plaster,0,L,y1,y1+0.45);ebox(O,E,-0.05,L+0.05,-0.2,0.35,y1+0.45,y1+0.55,shade(wc,1.03),TM.plaster,0,'ftu')}
    flatPoly(O,ip,y1+0.02,C1,TM.flatroof);flatPoly(O,B.ps,top+0.02,hexc('#d9d3c6'),TM.slabs);if(near&&(P.feat.has('pergola_top')||P.feat.has('pergola')))pergolaN(X.o,B.ps,top,H)}
  // ---- roof ----
  if(B.roofT==='hip'){const rc=hexc(P.roofCol||['#c9673f','#b85a3a','#d07447','#a95236'][H%4]);
    if(B.rectish&&!B.pent)hipRoof(O,B.rv,top,B.style,B.h,{roofCol:P.roofCol,eaves:P.eaves,chimney:P.feat.has('chimneys')||(/neo|villa|house/.test(P.cls)&&hf(H*5)<0.5)});
    else if(!B.pent&&!perimRoof(O,B.ps,top,rc,P.eaves,Math.min(3.2,Math.sqrt(B.area)*0.22),0.47))flatPoly(O,B.ps,top+0.02,shade(rc,0.9),TM.tiles)}
  else if(!B.pent)flatPoly(O,B.ps,top+0.02,shade(hexc(['#d8d3c8','#cfcabd','#e2ded4','#c9c4b8','#d6d6d2'][H%5]),0.92),TM.flatroof);
  if(B.roofT==='flat'&&B.lv>=2&&!NM){if(near)roofClutter(B,ch,N);if(B.solar&&!near){const p=B.pent?B.ip:B.ps;let cx=0,cz=0;for(const q of p){cx+=q[0];cz+=q[1]}ROOFI.solar.push([cx/p.length,B.pent?top+fh:top,cz/p.length,(H%7)*0.1+Math.PI*0.95])}
  }
  if(near&&!B.pent&&B.roofT==='flat'&&P.feat.has('pergola_top'))pergolaN(X.o,B.ps,top,H);
  if(NM)return;
  // ---- entrance (lobby) + plates ----
  const free=B.plates.filter(p=>!p.plateAt);B.plates=B.plates.filter(p=>p.plateAt);
  if(B.lobby)lobby(B,O,N,free);else if(free.length){const E=B.E.reduce((p,q)=>q.L>p.L?q:p);platesAt(B,E,E.L/2,N,free)}
  const groups=new Map();for(const sp of B.plates){const E=sp.plateAt.E;let s=clamp(sp.plateAt.s,0.3,E.L-0.3);for(const sh of B.shopsE[E.i]){if(s>sh.s0-0.25&&s<sh.s1+0.25){s=(s-sh.s0<sh.s1-s)?sh.s0-0.25:sh.s1+0.25}}s=clamp(s,0.25,E.L-0.25);const key=E.i+':'+Math.round(s*2);if(!groups.has(key))groups.set(key,{E,s,list:[]});groups.get(key).list.push(sp)}
  for(const g of groups.values())platesAt(B,g.E,g.s,N,g.list);
  if(B.bsigns)for(const bs of B.bsigns)buildingSign(B,bs,N)}

/* ---------- lazy near facades: 32 m cells, built when the camera comes within facD(), freed when it leaves ----------
   At boot buildShellP() runs in mode 'boot' (chunk geometry, far painted twin, shops, collision); the near detail of a cell is produced later by running
   buildShellP() again for the cell's buildings in mode 'near', where only the facade-detail targets (FAC.X) receive geometry. Everything is hash-deterministic. */
const NULLGB={wall(){},hq(){},tri(){},quad(){},box(){},cyl(){},size(){return 0}};const NULLCH={o:NULLGB,cut:NULLGB,sg:NULLGB};
const FAC={mode:'boot',X:null,cells:new Map(),C:32,built:0,tris:0,ms:0};
function facD(){return Q===QP.low?42:Q===QP.high?88:62}
function fcell(x,z){const C=FAC.C,k=Math.floor(x/C)+','+Math.floor(z/C);let c=FAC.cells.get(k);if(!c){c={k,cx:(Math.floor(x/C)+0.5)*C,cz:(Math.floor(z/C)+0.5)*C,blds:[],far:new GB(),farM:null,mesh:null,cutM:null};FAC.cells.set(k,c)}return c}
function facBuild(c){const t0=performance.now();FAC.mode='near';FAC.X={o:new GB(),cut:new GB()};try{for(const B of c.blds){try{buildShellP(B)}catch(e){console.error('facade near',B.i,e)}}}finally{FAC.mode='boot'}
  const X=FAC.X;FAC.X=null;if(X.o.size()){c.mesh=new THREE.Mesh(X.o.build(),MAT.atlas);c.mesh.castShadow=true;c.mesh.receiveShadow=true;scene.add(c.mesh);FAC.tris+=c.mesh.geometry.index.count/3}
  if(X.cut.size()){c.cutM=new THREE.Mesh(X.cut.build(),MAT.cut);c.cutM.receiveShadow=true;scene.add(c.cutM)}c.built=true;FAC.built++;FAC.ms+=performance.now()-t0}
function facFree(c){for(const m of[c.mesh,c.cutM])if(m){scene.remove(m);if(m===c.mesh)FAC.tris-=m.geometry.index.count/3;m.geometry.dispose()}c.mesh=c.cutM=null;c.built=false}
/* called with updateChunkVis (every ~0.35 s); force=true builds every wanted cell now (screenshots, teleports) */
function facVis(cx,cz,force){const D=facD(),t0=performance.now(),want=[];
  for(const c of FAC.cells.values()){if(!c.blds.length)continue;const d=Math.hypot(c.cx-cx,c.cz-cz);if(d<D){if(!c.built)want.push([d,c])}else if(c.built&&d>D+30)facFree(c);
    const on=c.built&&d<D+30;if(c.mesh)c.mesh.visible=on;if(c.cutM)c.cutM.visible=on;if(c.farM)c.farM.visible=!on}
  want.sort((a,b)=>a[0]-b[0]);for(const [d,c] of want){if(!force&&performance.now()-t0>10)break;facBuild(c);if(c.farM)c.farM.visible=false}}
function facFinalize(){for(const c of FAC.cells.values()){if(c.far&&c.far.size()){c.farM=new THREE.Mesh(c.far.build(),MAT.atlas);c.farM.castShadow=true;c.farM.receiveShadow=true;scene.add(c.farM)}c.far=null}
  if(typeof updateChunkVis==='function'&&!updateChunkVis._fac){const f=updateChunkVis;updateChunkVis=function(cx,cz){f(cx,cz);facVis(cx,cz)};updateChunkVis._fac=true}}

/* called by applyBuildingSpecs() (30_buildings.js): attach the research-arch record to every building it describes */
function archApplyAll(){if(!BDATA.spec)return;let n=0;
  for(const B of BLD.list){const s=archRec(B);if(!s)continue;B.arch=s;n++;
    if(ARCH_SPECIAL.has(s.style)){const ov=B.ovr;B.style=ARCH_STYLE[s.style];ov.floors=s.levels||ov.floors;if(s.facade&&/^#/.test(s.facade.colour||''))ov.colour=s.facade.colour;if(s.roofColour)ov.roofCol=s.roofColour;ov.src='arch:'+s.confidence;ARCH.src[s.confidence]=(ARCH.src[s.confidence]||0)+1;continue}
    if(B.ovr.src&&/^research/.test(B.ovr.src)&&s.confidence==='inferred')continue;// a photo description from research-shops beats an inferred class
    B.P=archProfile(B,s);B.style=ARCH_STYLE[s.style]||'apt';B.ovr.src='arch:'+s.confidence;ARCH.src[s.confidence]=(ARCH.src[s.confidence]||0)+1}
  ARCH.matched=n}
