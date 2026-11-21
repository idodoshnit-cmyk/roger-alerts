'use strict';
/* Grand Kifisia — world materials.
   A WebGL2 texture ARRAY of photographic CC0 materials (tex/*.webp|jpg, built by tools/tex/build_layers.py) plus procedural
   layers painted here (facade bays, shop fronts, railings …), one shared per-pixel-lit world material (normal mapping, specular,
   sky reflections on glass/water, night window glow, street-lamp light map) and the legacy 2D atlas material used by the sign atlas.
   Public contract (unchanged for the other modules):  T.<name> → tile id,  RECT[T.name] → value passed to GB,  UVs in tile repeats.
   Full documentation: docs/MATERIALS.md */

/* ============================== TILE REGISTRY ============================== */
// The first 64 ids are the historical atlas slots (other modules were written against them); new tiles get ids from 64 up.
const T={asph:0,asph2:1,pavers:2,brick:3,marble:4,slabs:5,grass:6,gravel:7,soil:8,curb:9,paint:10,tactile:11,platf:12,ballast:13,water:14,pool:15,plaster:16,ashlar:17,rubble:18,concrete:19,brickw:20,tiles:21,flatroof:22,solar:23,
  win:24,balc:25,neo:26,neoC:27,villaW:28,small:29,plain:30,office:31,shopA:32,shopB:33,cafe:34,shutter:35,lobby:36,garage:37,neoDoor:38,pilotis:39,awnS:40,awnG:41,awnR:42,rail:43,fence:44,hedge:45,bark:46,leaves:47,glassR:48,trim:49,wood:50,metal:51,canopy:52,train:53,trainF:54,church:55,metalL:56,kiosk:57,ad:58,stuccoL:59,parkG:60,dryG:61,orangeF:62,white:63};
// RECT[id] is what callers hand to GB as the "tile rectangle". It now only carries the tile id; everything else lives in a lookup texture.
const RECT=[];for(let i=0;i<256;i++)RECT.push([i/255,0,0,0]);
const TILE=[];let _nextTile=64;
/* TM.<name> → the same photographic material as T.<name>, but addressed with UVs in METRES (u,v = metres along the surface): use RECT[TM.brick] in new code
   and the texture has its real-world size whatever the photo's repeat length is. Exists for every photographic tile. */
const TM={};
const TEX={ready:false,size:0,nsize:0,layers:0,nlayers:0,bytes:0,spare:4,free:[],man:null,src:{},keep:new Set(['plaster','plasterW','concrete','shutterM','asph','marbleW','wood','metal','brickw','marble','ashlar'])};
/* defTile(name, painter, opts) — register (or replace) a material tile. Call it BEFORE boot builds the array (i.e. at script load);
   if it is called later the layer is repainted and re-uploaded on the spot.
     painter(g, S, m)  draws the colour into g (a 2D context whose design space is S×S = 240×240 units, rendered at the layer resolution);
                       m is a second context: paint WHITE where the surface is glass / emits light at night (the "glow mask").
     opts.photo  name of a layer in tex/manifest.json (photographic layer; no painter)      opts.alias  reuse the image of another tile
     opts.src    URL of a square image shipped with the game (image-based layer)           opts.cut    alpha cut-out (painter leaves holes transparent)
     opts.rep    [u,v] how many texture repeats one caller UV unit contains (default 1)     opts.needs  photo layers the painter draws with texSrc()
     opts.nrm    name of the tile whose normal map to use, opts.nrmRep (uv multiplier), opts.nrmK (strength)
     opts.spec (F0, default .03) opts.shin (Blinn exponent) opts.refl (mirror-like sky reflection 0..1)
     opts.glass (reflectivity of the masked area) opts.glassDark (how much the masked area is darkened by day) opts.glowK (night emission)
     opts.macro (large-scale tint variation 0..1) opts.transl (leaf back-lighting) opts.flow (uv drift, water)
     opts.vc (0..1, default 1: how much of the vertex colour's HUE is applied; its brightness always is. Foliage and grass use 0.3 so the photo keeps its natural green) */
function defTile(name,painter,o){o=o||{};let id=T[name];if(id===undefined){id=T[name]=_nextTile++;if(id>255)throw new Error('too many material tiles')}
  const rep=o.rep===undefined?[1,1]:(typeof o.rep==='number'?[o.rep,o.rep]:o.rep);
  const d={id,name,painter:painter||null,photo:o.photo||null,alias:o.alias||null,src:o.src||null,cut:!!o.cut,rep,nrm:o.nrm===undefined?null:o.nrm,nrmRep:o.nrmRep||1,nrmK:o.nrmK===undefined?1:o.nrmK,
    spec:o.spec===undefined?0.03:o.spec,shin:o.shin||12,refl:o.refl||0,glass:o.glass||0,glassDark:o.glassDark||0,glowK:o.glowK===undefined?1.7:o.glowK,macro:o.macro||0,transl:o.transl||0,flow:o.flow||0,vc:o.vc===undefined?1:o.vc,metric:!!o.metric,layer:-1,nlayer:-1};
  if(o.needs)for(const n of o.needs)TEX.keep.add(n);
  const old=TILE[id];TILE[id]=d;
  if(TEX.ready){// registered (or replaced) after the array was built: reuse the tile's own layer, or take one of the spare layers
    const fallback=()=>{console.warn('defTile("'+name+'"): '+(d.photo?'photographic layers cannot be added after boot':'no spare material layer left — register tiles at script load, before boot()'));return TILE[T.white].layer};
    if(d.alias){const a=TILE[T[d.alias]];d.layer=a&&a.layer>=0?a.layer:fallback()}
    else if(d.photo){const ex=TILE.find(t=>t&&t!==d&&t.photo===d.photo&&t.layer>=0);d.layer=old&&old.photo===d.photo?old.layer:(ex?ex.layer:fallback())}
    else{const own=old&&old.own&&old.layer>=0;d.layer=own?old.layer:(TEX.free.length?TEX.free.shift():-1);if(d.layer<0)d.layer=fallback();else{d.own=true;if(d.src)loadImg(d.src).then(im=>uploadLayer(d.layer,imgBytes(im,TEX.size),TEX.size)).catch(e=>console.warn(e.message));else if(d.painter)repaintTile(d)}}
    writeLut()}
  return id}
/* metres covered by one caller UV unit of a tile, as [u, v] (photographic tiles; [1,1] for TM.* twins; null for painted tiles, whose size is whatever the caller maps them to) */
function tileM(id){const d=TILE[id];if(!d)return null;if(d.metric)return[1,1];const b=d.alias?TILE[T[d.alias]]:d,m=b&&b.photo&&TEX.man&&TEX.man.meta[b.photo]?TEX.man.meta[b.photo].m:0;return m?[d.rep[0]*m,d.rep[1]*m]:null}
/* legacy entry point: paint(tileId, painter, cut) replaces the painter of an existing tile */
function paint(i,fn,cut){const d=TILE[i];if(!d)return;const name=d.name;defTile(name,fn,Object.assign({},d,{photo:null,alias:null,cut:!!cut}))}
/* canvas of a photographic layer for use as a painter background (only layers listed in TEX.keep / opts.needs; null otherwise) */
function texSrc(name){return TEX.src[name]||null}

/* ---------- painter helpers (design space 240 × 240) ---------- */
const IN=240;let _ps=1;
const MR=()=>{_ps=_ps+0x6D2B79F5|0;let t=Math.imul(_ps^_ps>>>15,1|_ps);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function speck(g,n,cols,s0,s1,a){g.globalAlpha=a==null?1:a;for(let i=0;i<n;i++){g.fillStyle=cols[(MR()*cols.length)|0];const s=s0+MR()*(s1-s0);const x=MR()*IN,y=MR()*IN;g.fillRect(x,y,s,s);if(x+s>IN)g.fillRect(x-IN,y,s,s);if(y+s>IN)g.fillRect(x,y-IN,s,s)}g.globalAlpha=1}
function bricks(g,S,bw,bh,cols,joint,stag){g.fillStyle=joint;g.fillRect(0,0,S,S);for(let r=0;r*bh<S;r++){const off=(stag&&r%2)?bw/2:0;for(let c=-1;c*bw<S+bw;c++){g.fillStyle=cols[(MR()*cols.length)|0];g.fillRect(c*bw+off+1,r*bh+1,bw-2,bh-2)}}}
/* photographic background: the named layer tiled at `scale` (1 = one photo repeat across the tile), optional multiply tint */
function pBg(g,name,S,tint,scale,x,y,w,h){const c=texSrc(name);x=x||0;y=y||0;w=w===undefined?S:w;h=h===undefined?S:h;
  if(c){const k=S/c.width*(scale||1);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.scale(k,k);g.fillStyle=g.createPattern(c,'repeat');g.fillRect(x/k,y/k,w/k+1,h/k+1);g.restore()}else{g.fillStyle='#ecebe6';g.fillRect(x,y,w,h)}
  if(tint){g.save();g.globalCompositeOperation='multiply';g.fillStyle=tint;g.fillRect(x,y,w,h);g.restore()}}
const pRect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
function pGrad(g,x,y,w,h,c0,c1,horiz){const gr=horiz?g.createLinearGradient(x,0,x+w,0):g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.fillRect(x,y,w,h)}
/* soft contact shadow below/right of a projecting element */
function pShadow(g,x,y,w,h,a,d){d=d||3;const gr=g.createLinearGradient(0,y+h,0,y+h+d*2);gr.addColorStop(0,`rgba(38,34,30,${a})`);gr.addColorStop(1,'rgba(38,34,30,0)');g.fillStyle=gr;g.fillRect(x-1,y+h,w+2,d*2)}
/* glass pane: what you see through it (curtains / a dim room). The mask marks it as glass: darkened + sky reflection by day, lit at night */
function pGlass(g,m,x,y,w,h,o){o=o||{};const kind=o.kind||'curtain';
  if(kind==='curtain'){pGrad(g,x,y,w,h,'#d9d2c2','#b9b09d');const n=Math.max(2,Math.round(w/7));for(let i=0;i<n;i++){const fx=x+i*w/n;const gr=g.createLinearGradient(fx,0,fx+w/n,0);gr.addColorStop(0,'rgba(255,250,235,.28)');gr.addColorStop(.5,'rgba(120,105,85,.20)');gr.addColorStop(1,'rgba(255,250,235,.10)');g.fillStyle=gr;g.fillRect(fx,y,w/n+.3,h)}
    if(o.gap!==false){const gw=w*(0.12+MR()*0.2),gx=x+w*(0.3+MR()*0.3);pGrad(g,gx,y,gw,h,'#5d5a55','#3b3936');g.fillStyle='rgba(255,214,150,.35)';g.fillRect(gx+gw*0.2,y+h*0.25,gw*0.6,h*0.2)}}
  else if(kind==='dark'){pGrad(g,x,y,w,h,'#7d8690','#4c545e')}
  else if(kind==='office'){pGrad(g,x,y,w,h,'#a9b6bf','#6f7f8c');g.fillStyle='rgba(255,246,220,.5)';for(let i=0;i<3;i++)g.fillRect(x+w*(0.1+i*0.3),y+h*0.08,w*0.2,h*0.035);g.fillStyle='rgba(40,48,58,.35)';g.fillRect(x,y+h*0.62,w,h*0.38)}
  // top reveal shadow on the glass
  const gr=g.createLinearGradient(0,y,0,y+Math.min(10,h*0.2));gr.addColorStop(0,'rgba(20,22,26,.42)');gr.addColorStop(1,'rgba(20,22,26,0)');g.fillStyle=gr;g.fillRect(x,y,w,Math.min(10,h*0.2));
  if(m){m.fillStyle='#fff';m.fillRect(x,y,w,h)}}
/* framed window: reveal, frame, glass, mullions */
function pWin(g,m,x,y,w,h,o){o=o||{};const f=o.f||3,fc=o.frame||'#f1efea';
  g.fillStyle='rgba(52,48,44,.55)';g.fillRect(x-1.5,y-2,w+3,h+3.5);pRect(g,x,y,w,h,fc);pGlass(g,m,x+f,y+f,w-2*f,h-2*f,o);
  const mv=o.mv===undefined?1:o.mv,mh=o.mh||0;g.fillStyle=fc;for(let i=1;i<=mv;i++){const mx=x+w*i/(mv+1)-f/2;g.fillRect(mx,y,f,h);if(m){m.fillStyle='#000';m.fillRect(mx,y,f,h)}}
  for(let i=1;i<=mh;i++){const my=y+h*i/(mh+1)-f/2;g.fillRect(x,my,w,f);if(m){m.fillStyle='#000';m.fillRect(x,my,w,f)}}
  g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x,y+h-1,w,1)}
/* louvred shutter leaf */
function pLouvre(g,x,y,w,h,col,dark,step){step=step||5;pRect(g,x,y,w,h,col);for(let yy=y+2.5;yy<y+h-2;yy+=step){g.fillStyle=dark;g.fillRect(x+2.5,yy+step*0.45,w-5,step*0.5);g.fillStyle='rgba(255,255,255,.16)';g.fillRect(x+2.5,yy,w-5,step*0.18)}
  g.strokeStyle=dark;g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+w,y+2,1.5,h)}
/* roller-shutter box / closed roller shutter */
function pRoller(g,x,y,w,h,col,line){pRect(g,x,y,w,h,col);for(let yy=y;yy<y+h;yy+=4.2){g.fillStyle=line;g.fillRect(x,yy+3.1,w,1.1);g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x,yy,w,0.8)}}
function pSill(g,x,y,w,h){pShadow(g,x,y,w,h,0.4,3.5);pGrad(g,x,y,w,h,'#f4f2ed','#d6d2c9');g.fillStyle='rgba(255,255,255,.6)';g.fillRect(x,y,w,1)}
/* weathering common to all facade bays: faint rain streaks below sills/ledges and a slightly dirtier base */
function pWeather(g,S,k){k=k===undefined?1:k;for(let i=0;i<26;i++){const x=MR()*S,y=MR()*S*0.7,h=18+MR()*70;const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,`rgba(96,88,76,${0.05*k})`);gr.addColorStop(1,'rgba(96,88,76,0)');g.fillStyle=gr;g.fillRect(x,y,1.2+MR()*3,h)}}
const facadeBg=(g,S)=>{pBg(g,'plaster',S,null,0.8);pWeather(g,S)};

/* ============================== TILE DEFINITIONS ============================== */
(function(){
  const P=(name,rep,o)=>defTile(name,null,Object.assign({photo:name,rep,nrm:name},o));
  /* --- photographic ground --- (rep = caller UV unit in metres / real size of the photo; see docs/MATERIALS.md) */
  P('asph',2.857,{spec:.045,shin:22,macro:.5,nrmK:.9});P('asph2',2.5,{spec:.045,shin:20,macro:.5,nrmK:.7});P('asphP',2,{spec:.04,shin:18,macro:.4,nrmK:.8});
  P('pavers',1.15,{spec:.03,shin:14,macro:.4});P('brick',1,{spec:.03,shin:14,macro:.4});P('marble',1.25,{spec:.05,shin:46,refl:.05,macro:.3});
  P('slabs',1.6,{spec:.03,shin:14,macro:.4});P('platf',1.1,{spec:.03,shin:16,macro:.35});P('gravel',1.1,{spec:.02,shin:8,macro:.4});P('parkG',1.2,{spec:.02,shin:8,macro:.45});
  P('soil',2.5,{spec:.02,shin:6,macro:.5});P('grass',2,{spec:.02,shin:6,macro:.7,vc:.3});P('dryG',3,{spec:.02,shin:6,macro:.6,vc:.3});P('ballast',2.16,{spec:.03,shin:10,macro:.35});
  P('curb',[1.5,2],{spec:.04,shin:24});P('tactile',[1.5,1.5],{spec:.03,shin:12});
  P('pool',2,{spec:.08,shin:160,refl:.45,flow:1,nrmK:.7});P('water',2,{spec:.08,shin:200,refl:.85,flow:.6,nrmK:.8});
  /* --- photographic walls and roofs --- */
  P('plaster',1.5,{spec:.02,shin:8,macro:.3,nrmK:.9});P('plasterW',1.5,{spec:.02,shin:8,macro:.3});P('plasterC',1,{spec:.02,shin:8,macro:.3});
  P('concrete',2,{spec:.03,shin:12,macro:.3});P('ashlar',1.25,{spec:.03,shin:10,macro:.25});P('rubble',1.25,{spec:.03,shin:10,macro:.25});P('brickw',2,{spec:.03,shin:10,macro:.25});
  P('marbleW',1.5,{spec:.05,shin:50,refl:.04,macro:.2});P('tiles',.8,{spec:.035,shin:16,macro:.4});P('flatroof',1.67,{spec:.02,shin:8,macro:.5});
  /* --- wood, metal (light tint carriers: callers multiply their own colour), bark, foliage --- */
  P('wood',.67,{spec:.03,shin:14});P('metal',1,{spec:.12,shin:36,refl:.03,nrmK:.5});P('metalL',1,{spec:.2,shin:42,refl:.06,nrmK:.5});P('canopy',[2,1],{spec:.08,shin:30});P('shutterM',1,{spec:.1,shin:30});
  P('bark',[1.6667,1.5],{spec:.015,shin:6});P('barkPine',[.8333,.8],{spec:.015,shin:6});P('barkDark',[1.6667,1.5],{spec:.015,shin:6});P('barkPalm',[.8333,1],{spec:.015,shin:6});
  P('hedge',1,{spec:.02,shin:10,macro:.35,nrmK:.8,vc:.3});P('orangeF',1,{spec:.02,shin:10,macro:.3,nrmK:.8,vc:.3});
  for(const n of['leaves','leafPine','leafCypress','leafOlive','leafOrange','leafPalm'])defTile(n,null,{photo:n,cut:true,spec:.02,shin:14,transl:.55,vc:.3});
  defTile('noise',null,{photo:'noise'});
  for(const d of TILE.slice())if(d&&d.photo&&d.name!=='noise')TM[d.name]=defTile(d.name+'_m',null,Object.assign({},d,{photo:null,alias:d.name,metric:true}));
  /* --- aliases --- */
  defTile('stuccoL',null,{alias:'plasterW',rep:.5,nrm:'plasterW',spec:.02,shin:8,macro:.2});
  defTile('garage',null,{alias:'shutter',nrm:'shutterM',nrmRep:1.5,spec:.1,shin:30});

  /* --- procedural layers --- */
  const WALL={nrm:'plaster',nrmRep:1.5,nrmK:.8,spec:.02,shin:8,glass:1,glassDark:.62,needs:['plaster']};const W=o=>Object.assign({},WALL,o);
  defTile('white',(g,S,m)=>{pRect(g,0,0,S,S,'#fff');m.fillStyle='#fff';m.fillRect(0,0,S,S)},{spec:.04,shin:20,glowK:2.6});
  defTile('paint',(g,S)=>{pBg(g,'asph',S,null,1);g.fillStyle='rgba(246,245,240,.94)';g.fillRect(0,0,S,S);speck(g,1500,['rgba(66,66,70,.55)','rgba(98,98,100,.4)','rgba(40,40,44,.5)'],.5,2);
    g.strokeStyle='rgba(60,60,64,.45)';g.lineWidth=.6;for(let k=0;k<7;k++){g.beginPath();let x=MR()*S,y=MR()*S;g.moveTo(x,y);for(let j=0;j<5;j++){x+=MR()*40-20;y+=MR()*40-20;g.lineTo(x,y)}g.stroke()}},{nrm:'asph',nrmK:.6,spec:.06,shin:30,needs:['asph']});
  defTile('solar',(g,S,m)=>{pRect(g,0,0,S,S,'#c3c7cb');for(let r=0;r<6;r++)for(let c=0;c<4;c++){const x=c*60+3,y=r*40+3;pGrad(g,x,y,54,34,'#22345a','#13203c');g.strokeStyle='rgba(150,175,220,.35)';g.lineWidth=.5;for(let k=1;k<6;k++){g.beginPath();g.moveTo(x+k*9,y);g.lineTo(x+k*9,y+34);g.stroke()}g.beginPath();g.moveTo(x,y+17);g.lineTo(x+54,y+17);g.stroke();m.fillStyle='#fff';m.fillRect(x,y,54,34)}},{spec:.08,shin:120,glass:.8,glassDark:.15,glowK:0});
  /* facade bays: one tile = one bay (≈3 m) × one floor (3.1 m); the wall colour comes from the vertex colour */
  defTile('win',(g,S,m)=>{facadeBg(g,S);pRect(g,56,46,128,9,'#e3e0d9');pShadow(g,56,46,128,9,.3,2.5);g.fillStyle='rgba(52,48,44,.5)';g.fillRect(58.5,54,123,131);pRect(g,60,56,120,128,'#eceae5');
    pRoller(g,66,58,108,38,'#dedcd6','#b9b6ae');pShadow(g,66,58,108,38,.35,3);pWin(g,m,66,98,108,82,{mv:1});pSill(g,54,184,132,7)},W());
  defTile('balc',(g,S,m)=>{facadeBg(g,S);pRect(g,36,22,168,9,'#e3e0d9');pShadow(g,36,22,168,9,.3,2.5);g.fillStyle='rgba(52,48,44,.5)';g.fillRect(38.5,30,163,210);pRect(g,40,32,160,208,'#eceae5');
    pRoller(g,48,34,144,34,'#dedcd6','#b9b6ae');pShadow(g,48,34,144,34,.35,3);pWin(g,m,48,70,144,170,{mv:1,f:3.5});g.fillStyle='rgba(255,255,255,.5)';g.fillRect(48,150,144,2.5);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(48,152.5,144,1)},W());
  const neoBay=(g,S,m,closed)=>{facadeBg(g,S);pRect(g,62,20,116,8,'#fbfaf7');pShadow(g,62,20,116,8,.35,3);pRect(g,68,28,104,14,'#f6f4ef');pShadow(g,68,28,104,14,.25,2);pRect(g,72,42,96,176,'#f8f6f1');g.fillStyle='rgba(52,48,44,.35)';g.fillRect(70,42,2,176);g.fillRect(168,42,2,176);
    if(closed){pLouvre(g,78,48,42,164,'#3d6a4e','#2c4f3a',6);pLouvre(g,120,48,42,164,'#3d6a4e','#2c4f3a',6)}
    else{pWin(g,m,80,50,80,160,{mv:1,mh:2,f:3,frame:'#fbfaf7'});pLouvre(g,40,46,32,168,'#3d6a4e','#2c4f3a',6);pLouvre(g,168,46,32,168,'#3d6a4e','#2c4f3a',6)}
    pSill(g,64,216,112,7)};
  defTile('neo',(g,S,m)=>neoBay(g,S,m,false),W());defTile('neoC',(g,S,m)=>neoBay(g,S,m,true),W());
  defTile('villaW',(g,S,m)=>{facadeBg(g,S);g.fillStyle='rgba(52,48,44,.5)';g.fillRect(82.5,62,75,108);pRect(g,84,64,72,104,'#6b4a2e');pWin(g,m,86,66,68,100,{mv:1,mh:1,f:3,frame:'#70502f'});pLouvre(g,52,64,30,104,'#7a5636','#5a3f27',6);pLouvre(g,158,64,30,104,'#7a5636','#5a3f27',6);pSill(g,78,168,84,7)},W());
  defTile('small',(g,S,m)=>{facadeBg(g,S);pRect(g,92,70,56,56,'#e6e3dc');pWin(g,m,95,73,50,50,{mv:1,kind:'dark'});pSill(g,90,126,60,5)},W({glassDark:.4}));
  defTile('plain',(g,S)=>{facadeBg(g,S);pWeather(g,S,1.4);pShadow(g,70,120,90,64,.4,4);pGrad(g,70,120,90,64,'#ecece9','#d8d8d4');g.strokeStyle='#b4b4af';g.lineWidth=.8;g.strokeRect(70.5,120.5,89,63);g.fillStyle='#a9a9a4';for(let k=0;k<9;k++)g.fillRect(78,126+k*6,54,2.6);g.fillStyle='#8f8f8a';g.beginPath();g.arc(144,152,9,0,TAU);g.fill();g.fillStyle='#c9c9c4';g.beginPath();g.arc(144,152,6.5,0,TAU);g.fill();
    pGrad(g,160,140,5,100,'#b9b9b4','#9a9a95',true);g.fillStyle='rgba(60,55,50,.25)';g.fillRect(165,140,1.5,100)},{nrm:'plaster',nrmRep:1.5,nrmK:.8,spec:.02,shin:8,needs:['plaster']});
  defTile('office',(g,S,m)=>{pRect(g,0,0,S,S,'#56616b');for(let c=0;c<3;c++){pGlass(g,m,c*80+4,8,72,106,{kind:'office'});pGlass(g,m,c*80+4,126,72,106,{kind:'office'})}pGrad(g,0,0,S,7,'#b3bbc1','#8c959c');pGrad(g,0,114,S,12,'#a2abb2','#7d868d');pGrad(g,0,232,S,8,'#9aa3aa','#7d868d');g.fillStyle='#7f8990';for(let c=0;c<=3;c++)g.fillRect(c*80-2,0,4,S)},{spec:.06,shin:60,glass:1,glassDark:.7});
  /* ground floors (4.2 m tall): fascia band, shop window, plinth */
  const shopInterior=(g,x,y,w,h,kind)=>{pGrad(g,x,y,w,h,'#fff3d6','#d8c4a0');
    if(kind===0){pRect(g,x,y,w,h,'#efe9df');const gl=g.createRadialGradient(x+w/2,y+10,4,x+w/2,y+30,w*0.7);gl.addColorStop(0,'rgba(255,240,210,.9)');gl.addColorStop(1,'rgba(255,240,210,0)');g.fillStyle=gl;g.fillRect(x,y,w,h);
      for(let s=0;s<2;s++){pRect(g,x+14,y+52+s*44,w-28,3,'#b89a73');pShadow(g,x+14,y+52+s*44,w-28,3,.3,2);for(let k=0;k<5;k++){if(MR()<0.3)continue;const bx=x+22+k*((w-44)/5);g.fillStyle=['#2b2b2b','#7a5236','#c9b48a','#8c2f2f','#e8e2d4','#3c4a5e'][(MR()*6)|0];g.beginPath();g.moveTo(bx,y+50+s*44);g.lineTo(bx+16,y+50+s*44);g.lineTo(bx+14,y+31+s*44);g.lineTo(bx+2,y+31+s*44);g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;g.beginPath();g.arc(bx+8,y+31+s*44,5,Math.PI,0);g.stroke()}}
      pRect(g,x,y+h-26,w,26,'#d9cfbf');pGrad(g,x+w*0.55,y+h-58,w*0.35,32,'#cfc2ae','#b3a58f')}
    if(kind===1){pRect(g,x,y,w,h,'#f4efe6');pGrad(g,x,y+h-22,w,22,'#cdbfa9','#b8a98f');for(let k=0;k<3;k++){const cx=x+34+k*(w-68)/2;g.fillStyle='#f1ece2';g.beginPath();g.arc(cx,y+30,8.5,0,TAU);g.fill();g.fillStyle=['#1d1d1f','#7a2e2e','#c9b48a','#2c3e50','#3f6b4f'][(MR()*5)|0];g.beginPath();g.moveTo(cx-15,y+41);g.quadraticCurveTo(cx,y+36,cx+15,y+41);g.lineTo(cx+21,y+122);g.lineTo(cx-21,y+122);g.fill();g.fillStyle='rgba(255,255,255,.12)';g.fillRect(cx-3,y+44,4,76);pRect(g,cx-1.5,y+122,3,26,'#b9b9b9');g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx,y+148,12,2.5,0,0,TAU);g.fill()}}
    if(kind===2){pGrad(g,x,y,w,h,'#f0dcb8','#c9a878');pRect(g,x,y+h-50,w,50,'#6b4a2e');pGrad(g,x,y+h-52,w,4,'#8a6540','#5a3d24');for(let k=0;k<3;k++){pRect(g,x+20+k*58,y+h-82,32,5,'#3d2a1b');pRect(g,x+34+k*58,y+h-77,4,27,'#3d2a1b');pRect(g,x+12+k*58,y+h-66,5,18,'#2a1d12');pRect(g,x+56+k*58,y+h-66,5,18,'#2a1d12')}
      for(let k=0;k<3;k++){const lx=x+32+k*62;g.strokeStyle='#3a3a3a';g.lineWidth=.7;g.beginPath();g.moveTo(lx,y);g.lineTo(lx,y+14);g.stroke();const gl=g.createRadialGradient(lx,y+18,1,lx,y+18,22);gl.addColorStop(0,'rgba(255,224,160,.95)');gl.addColorStop(1,'rgba(255,224,160,0)');g.fillStyle=gl;g.fillRect(lx-22,y,44,44)}
      pRect(g,x+w*0.62,y+34,w*0.3,44,'#2e2a26');g.fillStyle='#e8e2d0';for(let k=0;k<5;k++)g.fillRect(x+w*0.65,y+40+k*7,w*0.2*(0.5+MR()*0.5),1.6)}};
  [['shopA',0],['shopB',1],['cafe',2]].forEach(([n,k])=>defTile(n,(g,S,m)=>{pRect(g,0,0,S,S,'#24262a');pBg(g,'plaster',S,null,.8,0,0,S,52);pRect(g,0,44,S,8,'#d9d6cf');pShadow(g,0,44,S,8,.45,4);shopInterior(g,10,60,S-20,166,k);
    const gr=g.createLinearGradient(0,60,0,90);gr.addColorStop(0,'rgba(20,22,26,.45)');gr.addColorStop(1,'rgba(20,22,26,0)');g.fillStyle=gr;g.fillRect(10,60,S-20,30);
    pRect(g,0,56,S,5,'#1f2124');pGrad(g,0,226,S,14,'#2c2e32','#17181a');pRect(g,k===2?150:168,60,3.5,166,'#1f2124');pRect(g,0,60,10,166,'#1f2124');pRect(g,S-10,60,10,166,'#1f2124');m.fillStyle='#fff';m.fillRect(10,61,S-20,165);m.fillStyle='#000';m.fillRect(k===2?150:168,60,3.5,166)},{nrm:null,spec:.04,shin:30,glass:1,glassDark:.3,glowK:2.0,needs:['plaster']}));
  defTile('shutter',(g,S)=>{pRect(g,0,0,S,S,'#2b2d31');pRect(g,0,0,S,52,'#2b2d31');pBg(g,'shutterM',S,null,1.4,6,58,S-12,176);g.fillStyle='rgba(20,20,22,.35)';g.fillRect(6,58,S-12,7);pRect(g,6,226,S-12,8,'#6d7074');pRect(g,110,222,20,6,'#3a3c40');pGrad(g,0,234,S,6,'#2c2e32','#17181a')},{nrm:'shutterM',nrmRep:1.4,nrmK:.9,spec:.1,shin:30,needs:['shutterM']});
  defTile('lobby',(g,S,m)=>{facadeBg(g,S);pBg(g,'marbleW',S,null,1,46,36,148,204);g.fillStyle='rgba(52,48,44,.5)';g.fillRect(60,50,120,190);pRect(g,62,52,116,188,'#4d5054');pGlass(g,m,68,58,104,176,{kind:'dark'});
    g.fillStyle='rgba(255,236,190,.55)';g.fillRect(68,58,104,176);pRect(g,74,150,36,84,'rgba(120,96,60,.5)');pRect(g,130,90,34,50,'rgba(230,220,200,.6)');pRect(g,118,58,4,176,'#4d5054');pRect(g,68,100,104,3,'#4d5054');m.fillStyle='#000';m.fillRect(118,58,4,176);m.fillRect(68,100,104,3);pRect(g,124,150,3,26,'#c9b37e');pRect(g,50,36,140,5,'#d9d5cc');pShadow(g,50,36,140,5,.3,3)},W({glassDark:.35,needs:['plaster','marbleW']}));
  defTile('neoDoor',(g,S,m)=>{facadeBg(g,S);pRect(g,54,18,132,8,'#fbfaf7');pShadow(g,54,18,132,8,.35,3);pRect(g,60,26,120,214,'#f8f6f1');g.fillStyle='#e2ddd2';g.beginPath();g.arc(120,72,50,Math.PI,0);g.fill();g.save();g.beginPath();g.arc(120,72,44,Math.PI,0);g.clip();pGlass(g,m,76,28,88,44,{kind:'dark'});g.restore();g.strokeStyle='#f8f6f1';g.lineWidth=2.5;for(let k=1;k<6;k++){g.beginPath();g.moveTo(120,72);g.lineTo(120+Math.cos(Math.PI+k*Math.PI/6)*46,72+Math.sin(Math.PI+k*Math.PI/6)*46);g.stroke()}
    g.fillStyle='rgba(40,30,22,.6)';g.fillRect(68,70,104,170);pRect(g,70,72,100,168,'#4a3a2a');for(const dx of[76,124]){pGrad(g,dx,80,40,154,'#63503a','#55432f');g.strokeStyle='#3a2c1f';g.lineWidth=1;g.strokeRect(dx+5,88,30,50);g.strokeRect(dx+5,148,30,76);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(dx+6,89,28,2)}pRect(g,118,72,4,168,'#3a2c1f');pRect(g,110,150,4,10,'#c9a85a');pRect(g,126,150,4,10,'#c9a85a');pGrad(g,56,232,128,8,'#e0dbd0','#bdb7aa')},W({glassDark:.5}));
  defTile('pilotis',(g,S)=>{pGrad(g,0,0,S,S,'#26272a','#141516');pGrad(g,0,0,S,30,'#3a3b3e','#242527');pShadow(g,0,0,S,30,.5,8);pBg(g,'plaster',S,null,.8,104,30,32,210);const gr=g.createLinearGradient(104,0,136,0);gr.addColorStop(0,'rgba(0,0,0,.05)');gr.addColorStop(1,'rgba(0,0,0,.4)');g.fillStyle=gr;g.fillRect(104,30,32,210);pGrad(g,0,200,S,40,'#3d3e41','#555659');g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(120,238,40,5,0,0,TAU);g.fill()},{spec:.03,shin:10,needs:['plaster']});
  const awn=(a,b)=>(g,S)=>{for(let x=0;x<S;x+=30){pRect(g,x,0,15,S,a);pRect(g,x+15,0,15,S,b)}g.fillStyle='rgba(0,0,0,.05)';for(let y=0;y<S;y+=1.6)g.fillRect(0,y,S,.5);for(let x=0;x<S;x+=1.6)g.fillRect(x,0,.4,S);for(let k=0;k<5;k++){const y=20+k*44+MR()*10;const gr=g.createLinearGradient(0,y,0,y+26);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.5,'rgba(0,0,0,.09)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,y,S,26)}
    pGrad(g,0,S-16,S,3,'rgba(0,0,0,.3)','rgba(0,0,0,0)');g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,S-17,S,1)};
  defTile('awnS',awn('#ece3cd','#b9a77f'),{spec:.02,shin:8});defTile('awnG',awn('#2f6b4a','#27593d'),{spec:.02,shin:8});defTile('awnR',awn('#7a1f2b','#681a25'),{spec:.02,shin:8});
  /* wrought-iron balcony / garden railing (cut-out). Tint comes from the vertex colour, so the metal is painted light. */
  defTile('rail',(g,S)=>{const c='#e9ece9',d='#aab0ab';pRect(g,0,3,S,7,c);pRect(g,0,8.5,S,1.5,d);pRect(g,0,S-16,S,6,c);pRect(g,0,S-11.5,S,1.5,d);pRect(g,0,40,S,3,c);
    for(let x=8;x<S;x+=20){pRect(g,x,6,4,S-18,c);pRect(g,x+2.8,6,1.2,S-18,d);g.fillStyle=c;g.beginPath();g.arc(x+2,24,3.6,0,TAU);g.fill()}
    g.strokeStyle=c;g.lineWidth=2;for(let x=18;x<S;x+=40){g.beginPath();g.arc(x,S*0.56,7.5,0,TAU);g.stroke();g.beginPath();g.arc(x,S*0.56-15,7.5,Math.PI*0.5,Math.PI*1.5);g.stroke();g.beginPath();g.arc(x,S*0.56+15,7.5,-Math.PI*0.5,Math.PI*0.5);g.stroke()}},{cut:true,spec:.15,shin:30});
  /* green welded-mesh fence with frame (cut-out) */
  defTile('fence',(g,S)=>{const c='#e9ece9';g.strokeStyle=c;g.lineWidth=1.6;for(let x=-S;x<S*2;x+=15){g.beginPath();g.moveTo(x,0);g.lineTo(x+S,S);g.stroke();g.beginPath();g.moveTo(x,S);g.lineTo(x+S,0);g.stroke()}pRect(g,0,0,S,6,c);pRect(g,0,S-6,S,6,c);pRect(g,0,0,5,S,c);pRect(g,S-1.5,0,1.5,S,c);g.fillStyle='#aab0ab';g.fillRect(0,5,S,1);g.fillRect(4,0,1,S)},{cut:true,spec:.12,shin:30});
  defTile('glassR',(g,S,m)=>{pGrad(g,0,0,S,S,'#b9cdd2','#9fb7be');g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.moveTo(0,S*0.75);g.lineTo(S*0.5,S*0.1);g.lineTo(S*0.7,S*0.1);g.lineTo(0,S);g.fill();m.fillStyle='#fff';m.fillRect(0,0,S,S);pGrad(g,0,0,S,12,'#eef0f0','#b9bfc0');m.fillStyle='#000';m.fillRect(0,0,S,12);for(let x=0;x<S;x+=80){pGrad(g,x,12,3.5,S-12,'#cfd5d6','#8f9a9d',true);m.fillRect(x,12,3.5,S-12)}pRect(g,0,S-5,S,5,'#aeb6b8');m.fillRect(0,S-5,S,5)},{spec:.08,shin:120,glass:1,glassDark:.25,glowK:0});
  defTile('trim',(g,S)=>{pBg(g,'plaster',S,null,.8);const band=(y,h)=>{pGrad(g,0,y,S,h,'#fbfaf6','#d5d0c6');pShadow(g,0,y,S,h,.38,3.5);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(0,y,S,1)};band(40,10);band(110,14);for(let x=0;x<S;x+=24){pGrad(g,x,124,12,20,'#efece5','#cfcabf');g.fillStyle='rgba(50,45,40,.3)';g.fillRect(x+12,124,2,20)}pShadow(g,0,124,S,20,.3,3);band(180,8)},{nrm:'plaster',nrmRep:1.5,nrmK:.6,spec:.02,shin:8,needs:['plaster']});
  /* Line 1 (ISAP) train: side with windows and doors, front with destination board */
  const trainBody=(g,S)=>{pGrad(g,0,0,S,S,'#f1f0ec','#dddcd6');pGrad(g,0,0,S,12,'#c9cdd1','#aeb3b8');pRect(g,0,196,S,20,'#2e8b57');pRect(g,0,216,S,24,'#3b4046');g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,195,S,1.5);g.fillStyle='rgba(60,55,50,.07)';for(let i=0;i<20;i++)g.fillRect(MR()*S,12+MR()*150,1.5+MR()*2,20+MR()*40)};
  defTile('train',(g,S,m)=>{trainBody(g,S);for(const x of[12,164]){pRect(g,x,68,64,74,'#1d1f22');pGlass(g,m,x+3,71,58,68,{kind:'dark'});g.fillStyle='rgba(255,240,200,.25)';g.fillRect(x+3,71,58,20)}pRect(g,88,54,64,174,'#9aa0a6');for(const x of[92,121]){pRect(g,x,62,27,94,'#2b3138');pGlass(g,m,x+2,64,23,90,{kind:'dark'})}pRect(g,119,54,2,174,'#5b6168');g.fillStyle='rgba(0,0,0,.25)';g.fillRect(88,54,1.5,174);g.fillRect(150.5,54,1.5,174)},{spec:.15,shin:50,refl:.03,glass:1,glassDark:.5,glowK:2});
  defTile('trainF',(g,S,m)=>{trainBody(g,S);pRect(g,28,38,184,94,'#1d1f22');pGlass(g,m,34,44,172,82,{kind:'dark'});pRect(g,118,44,4,82,'#1d1f22');m.fillStyle='#000';m.fillRect(118,44,4,82);pRect(g,60,8,120,24,'#111');g.font='bold 17px Arial';g.fillStyle='#ffb000';g.textAlign='center';g.fillText('ΠΕΙΡΑΙΑΣ',120,26);m.fillStyle='#fff';m.fillRect(60,8,120,24);
    for(const x of[40,170]){g.fillStyle='#fff7c0';g.beginPath();g.ellipse(x+15,168,15,8,0,0,TAU);g.fill();m.beginPath();m.ellipse(x+15,168,15,8,0,0,TAU);m.fill()}},{spec:.15,shin:50,refl:.03,glass:1,glassDark:.2,glowK:2.4});
  defTile('church',(g,S,m)=>{pBg(g,'plasterW',S,'#f3e6cf',.8);pWeather(g,S,1.2);g.fillStyle='#fbf8f0';g.beginPath();g.moveTo(78,222);g.lineTo(78,90);g.arc(120,90,42,Math.PI,0);g.lineTo(162,222);g.fill();g.fillStyle='rgba(52,48,44,.45)';g.beginPath();g.moveTo(86,216);g.lineTo(86,91);g.arc(120,91,34,Math.PI,0);g.lineTo(154,216);g.fill();
    g.save();g.beginPath();g.moveTo(88,214);g.lineTo(88,92);g.arc(120,92,32,Math.PI,0);g.lineTo(152,214);g.clip();pRect(g,88,58,64,158,'#2a2f4a');for(let k=0;k<70;k++){g.fillStyle=['#8e2a2a','#2a4f8e','#d6a83a','#3b7a3b','#6a2a8e','#c96a2a'][(MR()*6)|0];g.fillRect(88+Math.floor(MR()*8)*8,60+Math.floor(MR()*20)*8,7,7)}g.strokeStyle='#1c1c22';g.lineWidth=1.6;g.beginPath();g.moveTo(120,58);g.lineTo(120,214);g.moveTo(88,130);g.lineTo(152,130);g.stroke();g.restore();
    m.fillStyle='#fff';m.beginPath();m.moveTo(88,214);m.lineTo(88,92);m.arc(120,92,32,Math.PI,0);m.lineTo(152,214);m.fill();pSill(g,76,220,88,6)},{nrm:'plasterW',nrmRep:1.2,nrmK:.8,spec:.02,shin:8,glass:.4,glassDark:.3,glowK:1.4,needs:['plasterW']});
  defTile('kiosk',(g,S,m)=>{pRect(g,0,0,S,S,'#3a3f45');pGrad(g,0,0,S,40,'#ffd84a','#f2bd1e');g.fillStyle='#1d3557';g.font='bold 25px Arial';g.textAlign='center';g.fillText('ΠΕΡΙΠΤΕΡΟ',120,29);
    for(let r=0;r<5;r++)for(let c=0;c<8;c++){const x=6+c*29,y=48+r*36;const col=['#e63946','#f1faee','#457b9d','#ffb703','#06d6a0','#8338ec','#fb8500','#2a9d8f'][(MR()*8)|0];pRect(g,x,y,26,32,col);g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x+3,y+4,20,5);g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x+3,y+12,14,2);g.fillRect(x+3,y+16,18,2);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x,y+30,26,2)}
    m.fillStyle='#888';m.fillRect(0,40,S,190);m.fillStyle='#fff';m.fillRect(0,0,S,40)},{spec:.04,shin:20,glowK:1.6});
  defTile('ad',(g,S,m)=>{pGrad(g,0,0,S,S,'#1b7fd1','#13305a');g.fillStyle='#ffcf3f';g.beginPath();g.arc(170,172,42,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.14)';for(let k=0;k<5;k++){g.beginPath();g.ellipse(120,238-k*4,150-k*20,12,0,0,TAU);g.fill()}g.fillStyle='#fff';g.font='bold 34px Arial';g.textAlign='left';g.fillText('ATHENS',26,92);g.font='bold 17px Arial';g.fillText('summer nights',28,118);g.font='11px Arial';g.fillText('open-air cinema · every evening',28,138);pRect(g,0,0,S,5,'#d9dcdf');pRect(g,0,S-5,S,5,'#d9dcdf');pRect(g,0,0,5,S,'#d9dcdf');pRect(g,S-5,0,5,S,'#d9dcdf');m.fillStyle='#fff';m.fillRect(5,5,S-10,S-10)},{spec:.06,shin:60,glowK:1.5});
})();

/* ============================== TEXTURE ARRAY: build + upload ============================== */
const arrTex=new THREE.DataArrayTexture(null,1,1,1),nrmTex=new THREE.DataArrayTexture(null,1,1,1);
const lutData=new Float32Array(4*256*4),lutTex=new THREE.DataTexture(lutData,4,256,THREE.RGBAFormat,THREE.FloatType);lutTex.minFilter=lutTex.magFilter=THREE.NearestFilter;lutTex.generateMipmaps=false;
function writeLut(){for(let id=0;id<256;id++){const d=TILE[id],o=id*16;if(!d){lutData.fill(0,o,o+16);lutData[o+1]=lutData[o+2]=1;lutData[o+3]=-1;continue}
    const nd=d.nrm&&T[d.nrm]!==undefined?TILE[T[d.nrm]]:null;let ru=d.rep[0],rv=d.rep[1];
    if(d.metric){const b=TILE[T[d.alias]],m=b&&b.photo&&TEX.man&&TEX.man.meta[b.photo]?TEX.man.meta[b.photo].m:2;ru=rv=1/(m||2)}
    lutData.set([d.layer<0?0:d.layer,ru,rv,nd&&nd.nlayer>=0?nd.nlayer:-1, d.nrmRep,d.nrmK,d.spec,d.shin, d.refl,d.glass,d.glassDark,d.glowK, d.macro,d.transl,d.flow,(d.cut?2:0)+clamp(d.vc,0,1)],o)}
  lutTex.needsUpdate=true;if(T.noise!==undefined&&TILE[T.noise])U.noiseL.value=Math.max(0,TILE[T.noise].layer)}
function loadImg(url){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('could not load '+url));im.src=url})}
const _cv=(s,rf)=>{const c=document.createElement('canvas');c.width=c.height=s;return[c,c.getContext('2d',{willReadFrequently:!!rf})]};
let _texBusy=null,_painters=null;
function glBindArr(gl,t){renderer.state.bindTexture(gl.TEXTURE_2D_ARRAY,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE)}
function glNewArr(gl,fmt,size,layers,aniso){const t=gl.createTexture();glBindArr(gl,t);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,Math.floor(Math.log2(size))+1,fmt,size,size,layers);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const ext=renderer.extensions.get('EXT_texture_filter_anisotropic');if(ext&&aniso>1)gl.texParameterf(gl.TEXTURE_2D_ARRAY,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(aniso,renderer.capabilities.getMaxAnisotropy()));return t}
/* paint one procedural tile into RGBA bytes (bottom row first, as GL wants it) */
function paintBytes(d,S){const P=_painters||(_painters={});if(P.S!==S){[P.c,P.g]=_cv(S,true);[P.mc,P.m]=_cv(S,true);[P.fc,P.f]=_cv(S,true);P.S=S}
  const k=S/IN;_ps=1+d.id*7919;P.g.setTransform(1,0,0,1,0,0);P.g.clearRect(0,0,S,S);P.g.globalAlpha=1;P.g.globalCompositeOperation='source-over';P.g.textAlign='left';P.g.textBaseline='alphabetic';P.g.setTransform(k,0,0,k,0,0);
  P.m.setTransform(1,0,0,1,0,0);P.m.fillStyle='#000';P.m.fillRect(0,0,S,S);P.m.setTransform(k,0,0,k,0,0);d.painter(P.g,IN,P.m);
  const flip=src=>{P.f.setTransform(1,0,0,1,0,0);P.f.clearRect(0,0,S,S);P.f.setTransform(1,0,0,-1,0,S);P.f.drawImage(src,0,0);return P.f.getImageData(0,0,S,S).data};
  const px=flip(P.c),out=new Uint8Array(px.length);out.set(px);
  if(d.cut){let r=0,gg=0,b=0,n=0;for(let p=0;p<out.length;p+=4)if(out[p+3]>200){r+=out[p];gg+=out[p+1];b+=out[p+2];n++}n=n||1;r=r/n|0;gg=gg/n|0;b=b/n|0;
    for(let p=0;p<out.length;p+=4){const a=out[p+3];if(a<8){out[p]=r;out[p+1]=gg;out[p+2]=b}out[p+3]=a>110?255:0}}
  else{const mk=flip(P.mc);for(let p=0;p<out.length;p+=4)out[p+3]=255-Math.round(mk[p]*0.5)}
  return out}
/* upload one layer of the colour array together with its mip chain (box filter), without touching the other layers */
function uploadLayer(layer,px,S){const gl=renderer.getContext();glBindArr(gl,TEX.glCol);let w=S,src=px;
  for(let lv=0;;lv++){gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,lv,0,0,layer,w,w,1,gl.RGBA,gl.UNSIGNED_BYTE,src);if(w===1)break;const h=w>>1,dst=new Uint8Array(h*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<h;x++){const o=(y*h+x)*4,a=(y*2*w+x*2)*4,b=a+w*4;for(let k=0;k<4;k++)dst[o+k]=(src[a+k]+src[a+4+k]+src[b+k]+src[b+4+k]+2)>>2}
    src=dst;w=h}
  renderer.state.bindTexture(gl.TEXTURE_2D_ARRAY,null)}
function imgBytes(img,S){const [c,g]=_cv(S,true);g.imageSmoothingQuality='high';g.setTransform(1,0,0,-1,0,S);g.drawImage(img,0,0,img.width,img.height,0,0,S,S);const p=g.getImageData(0,0,S,S).data;return new Uint8Array(p.buffer,p.byteOffset,p.length)}
function repaintTile(d){if(!TEX.ready||!d.painter||d.layer<0)return;uploadLayer(d.layer,paintBytes(d,TEX.size),TEX.size)}
/* Build (or rebuild for another quality preset) the colour and normal arrays. Reports progress through cb(0..1). */
async function loadTextures(cb){if(_texBusy)return _texBusy;_texBusy=(async()=>{
  const gl=renderer.getContext(),S=Q.tex||512,NS=Q.ntex||0,aniso=Q.aniso||4;let last=performance.now();const breathe=async()=>{if(performance.now()-last>10){await tick();last=performance.now()}};
  const r=await fetch(TEXDIR+'manifest.json');if(!r.ok)throw new Error('materials manifest '+r.status);const man=await r.json(),CS=man.S;
  // layer numbering: photographic layers that some tile uses, then image layers, then procedural ones
  const where={};for(const kind of['colour','alpha','normal'])man[kind].forEach((sh,si)=>sh.l.forEach((n,i)=>{(where[n]=where[n]||{})[kind]=[si,i]}));
  let nl=0;const photoL={},jobs=[];for(const d of TILE){if(!d||d.alias)continue;if(d.photo){if(!where[d.photo]||!where[d.photo].colour)throw new Error('material "'+d.photo+'" missing from manifest');if(photoL[d.photo]===undefined)photoL[d.photo]=nl++;d.layer=photoL[d.photo]}}
  for(const d of TILE){if(!d||d.alias||d.photo)continue;d.layer=nl++;d.own=true;jobs.push(d)}
  const used=nl,spare=TEX.spare|0;nl+=spare;
  for(const d of TILE)if(d&&d.alias){const a=TILE[T[d.alias]];if(!a)throw new Error('alias of unknown tile '+d.alias);d.layer=a.layer}
  // normal layers: every photographic layer that has a normal map and is referenced by some tile's nrm
  let nn=0;const nrmL={};for(const d of TILE){if(!d)continue;d.nlayer=-1}
  if(NS)for(const d of TILE){if(!d||!d.nrm)continue;const nd=TILE[T[d.nrm]];if(!nd||!nd.photo||!where[nd.photo].normal)continue;if(nrmL[nd.photo]===undefined)nrmL[nd.photo]=nn++;nd.nlayer=nrmL[nd.photo]}
  const total=nl+nn+2;let done=0;const step=()=>{done++;if(cb)cb(done/total)};
  const glCol=glNewArr(gl,gl.SRGB8_ALPHA8,S,nl,aniso);const [lc,lg]=_cv(S,true);lg.imageSmoothingQuality='high';
  const grab=(img,cell,size,ctx)=>{const sx=(cell%4)*CS,sy=Math.floor(cell/4)*CS;ctx.setTransform(1,0,0,-1,0,size);ctx.drawImage(img,sx,sy,CS,CS,0,0,size,size);ctx.setTransform(1,0,0,1,0,0);return ctx.getImageData(0,0,size,size).data};
  // alpha sheets first (small), kept until the colour sheets are done
  const alphaImg=await Promise.all(man.alpha.map(sh=>loadImg(TEXDIR+sh.f)));step();
  TEX.src={};TEX.man=man;
  for(let si=0;si<man.colour.length;si++){const sh=man.colour[si];if(!sh.l.some(n=>photoL[n]!==undefined||TEX.keep.has(n)))continue;const img=await loadImg(TEXDIR+sh.f);last=performance.now();
    for(let i=0;i<sh.l.length;i++){const n=sh.l[i];
      if(TEX.keep.has(n)){const [kc,kg]=_cv(S,false);kg.imageSmoothingQuality='high';kg.drawImage(img,(i%4)*CS,Math.floor(i/4)*CS,CS,CS,0,0,S,S);TEX.src[n]=kc}
      if(photoL[n]===undefined)continue;const px=grab(img,i,S,lg);
      if(where[n].alpha){const [asi,ai]=where[n].alpha;const [ac,ag]=_cv(S,true);ag.imageSmoothingQuality='high';const al=grab(alphaImg[asi],ai,S,ag);for(let p=0;p<px.length;p+=4)px[p+3]=al[p]}
      glBindArr(gl,glCol);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,photoL[n],S,S,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(px.buffer,px.byteOffset,px.length));step();await breathe()}}
  // image-based and procedural layers
  for(const d of jobs){let px;if(d.src){px=imgBytes(await loadImg(d.src),S)}
    else if(d.painter)px=paintBytes(d,S);else{px=new Uint8Array(S*S*4).fill(255)}
    glBindArr(gl,glCol);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,d.layer,S,S,1,gl.RGBA,gl.UNSIGNED_BYTE,px);step();await breathe()}
  glBindArr(gl,glCol);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);step();await tick();
  // normal maps (two channels; z is rebuilt in the shader)
  let glNrm=null;if(NS&&nn){glNrm=glNewArr(gl,gl.RG8,NS,nn,Math.min(aniso,4));const [nc,ng]=_cv(NS,true);ng.imageSmoothingQuality='high';const rg=new Uint8Array(NS*NS*2);
    for(let si=0;si<man.normal.length;si++){const sh=man.normal[si];if(!sh.l.some(n=>nrmL[n]!==undefined))continue;const img=await loadImg(TEXDIR+sh.f);last=performance.now();
      for(let i=0;i<sh.l.length;i++){const n=sh.l[i];if(nrmL[n]===undefined)continue;const px=grab(img,i,NS,ng);for(let p=0,q=0;p<px.length;p+=4,q+=2){rg[q]=px[p];rg[q+1]=px[p+1]}
        glBindArr(gl,glNrm);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,nrmL[n],NS,NS,1,gl.RG,gl.UNSIGNED_BYTE,rg);step();await breathe()}}
    glBindArr(gl,glNrm);gl.generateMipmap(gl.TEXTURE_2D_ARRAY)}
  renderer.state.bindTexture(gl.TEXTURE_2D_ARRAY,null);
  // hand the GL objects to three.js (version stays 0, so three only ever binds them)
  const swap=(tex,glt,size,layers)=>{const p=renderer.properties.get(tex);if(p.__webglTexture&&p.__webglTexture!==glt)gl.deleteTexture(p.__webglTexture);p.__webglTexture=glt;p.__webglInit=true;tex.image={data:null,width:size,height:size,depth:layers}};
  swap(arrTex,glCol,S,nl);if(glNrm)swap(nrmTex,glNrm,NS,nn);else{const p=renderer.properties.get(nrmTex);if(p.__webglTexture){gl.deleteTexture(p.__webglTexture);p.__webglTexture=null}}
  TEX.free=[];for(let i=used;i<nl;i++)TEX.free.push(i);
  TEX.glCol=glCol;TEX.glNrm=glNrm;TEX.size=S;TEX.nsize=glNrm?NS:0;TEX.layers=nl;TEX.nlayers=glNrm?nn:0;TEX.aniso=aniso;TEX.bytes=Math.round((S*S*4*nl+(glNrm?NS*NS*2*nn:0))*4/3);TEX.ready=true;
  writeLut();for(const k of['atlas','cut','leaf'])if(MAT[k]){const want=!!glNrm;if(!!MAT[k].defines.GK_NRM!==want){if(want)MAT[k].defines.GK_NRM='';else delete MAT[k].defines.GK_NRM;MAT[k].needsUpdate=true}}
  if(cb)cb(1)})();try{await _texBusy}finally{_texBusy=null}}
/* called by applyQuality(): rebuild the arrays when the preset asks for another resolution */
function texQuality(){if(!TEX.ready||_texBusy)return;if((Q.tex||512)!==TEX.size||(Q.ntex||0)!==TEX.nsize)loadTextures().catch(e=>console.warn('texture rebuild failed',e))}
const TEXDIR='tex/';
function paintAtlas(){/* kept for old callers: the atlas is now built by initMaterials() */}

/* ============================== WORLD MATERIAL ============================== */
const GK_VPARS=`
attribute vec4 aRect;attribute float aGlow;uniform highp sampler2D uLut;uniform float uTime;uniform vec3 uWind;
varying vec4 vTuv;varying vec4 vP1;varying vec4 vP2;varying vec4 vP3;varying vec3 vWp;`;
const GK_VMAIN=`
{int gkId=int(aRect.x*255.0+0.5);
 vec4 gk0=texelFetch(uLut,ivec2(0,gkId),0),gk1=texelFetch(uLut,ivec2(1,gkId),0),gk2=texelFetch(uLut,ivec2(2,gkId),0),gk3=texelFetch(uLut,ivec2(3,gkId),0);
 vTuv=vec4(uv*gk0.yz+gk3.z*uTime*vec2(0.031,0.017),aGlow,gk0.x);
 vP1=vec4(gk0.w,gk1.x,gk1.y,gk3.x);vP2=vec4(gk1.z,gk1.w,gk2.x,gk2.y);vP3=vec4(gk2.z,gk2.w,gk3.y,gk3.w);
 vec4 gkW=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 gkW=instanceMatrix*gkW;
 #endif
 vWp=(modelMatrix*gkW).xyz;}`;
const GK_VWIND=`
#ifdef USE_INSTANCING
{// wind: the crown leans with slow gusts (more the higher above the trunk base) and every leaf card flutters a little; phase from the tree's position
 vec3 gkO=instanceMatrix[3].xyz;float gkPh=dot(gkO.xz,vec2(0.37,0.23));float gkHt=clamp(transformed.y*0.11,0.0,1.0);gkHt*=gkHt;
 float gkG=sin(uTime*0.9+gkPh)+0.5*sin(uTime*2.3+gkPh*1.7);
 vec3 gkF=sin(uTime*vec3(3.1,2.7,3.7)+transformed.zxy*vec3(1.7,2.3,1.9)+gkPh);
 vec3 gkD=vec3(uWind.x,0.0,uWind.y)*(gkG*gkHt*uWind.z)+gkF*(0.3*uWind.z*step(0.6,transformed.y));
 mvPosition.xyz+=mat3(viewMatrix)*gkD;gl_Position=projectionMatrix*mvPosition;vWp+=gkD;}
#endif`;
const GK_FPARS=`
uniform mediump sampler2DArray uArr;
#ifdef GK_NRM
uniform mediump sampler2DArray uNrm;
#endif
uniform sampler2D uLamp;uniform vec4 uLampR;uniform vec2 uLampH;uniform vec3 uLampC;uniform vec3 uShopC;
uniform float uNight;uniform float uNoiseL;uniform float uHaze;uniform vec3 uGlowC;uniform vec3 uSkyZ;uniform vec3 uSkyH;uniform vec3 uSkyG;uniform vec4 uFogSun;uniform vec2 uSunXZ;
varying vec4 vTuv;varying vec4 vP1;varying vec4 vP2;varying vec4 vP3;varying vec3 vWp;
float gkSunVis=1.0;`;
const GK_FMAP=`
vec4 texel=texture(uArr,vec3(vTuv.xy,floor(vTuv.w+0.5)));
#ifdef GK_CUT
 vec2 gkS=vec2(textureSize(uArr,0).xy);vec2 gkDx=dFdx(vTuv.xy)*gkS,gkDy=dFdy(vTuv.xy)*gkS;
 float gkLod=max(0.0,0.5*log2(max(dot(gkDx,gkDx),dot(gkDy,gkDy))+1e-8));
 float gm=0.0;
 if(vP3.w>1.5){if(texel.a*(1.0+0.25*gkLod)<0.5)discard;}else gm=clamp((1.0-texel.a)*2.0,0.0,1.0);   // only tiles registered with cut:true are cut out; others keep their glass mask
#else
 float gm=clamp((1.0-texel.a)*2.0,0.0,1.0);
#endif
diffuseColor.rgb*=texel.rgb;float gkVc=vP3.w-2.0*step(1.5,vP3.w);
{vec3 gkN=texture(uArr,vec3((vWp.xz+vWp.y*vec2(0.61,0.37))*0.043,uNoiseL)).rgb;diffuseColor.rgb*=1.0+((gkN.r-0.5)*0.75+(gkN.g-0.5)*0.45)*vP1.w;}`;
const GK_FCOLOR=`
#if defined( USE_COLOR_ALPHA )
 diffuseColor.rgb*=mix(vec3(dot(vColor.rgb,vec3(0.2126,0.7152,0.0722))),vColor.rgb,gkVc);
#elif defined( USE_COLOR )
 diffuseColor.rgb*=mix(vec3(dot(vColor,vec3(0.2126,0.7152,0.0722))),vColor,gkVc);
#endif`;
const GK_FNORMAL=`
#ifdef GK_LEAF
 normal=normal*faceDirection;
#endif
#ifdef GK_NRM
{vec2 gkUv=vTuv.xy*vP1.y;vec2 gkXY=texture(uNrm,vec3(gkUv,floor(max(vP1.x,0.0)+0.5))).rg*2.0-1.0;vec3 gkQ0=dFdx(-vViewPosition),gkQ1=dFdy(-vViewPosition);vec2 gkS0=dFdx(gkUv),gkS1=dFdy(gkUv);
 float gkNs=float(textureSize(uNrm,0).x);gkXY*=vP1.z*(1.0-gm)*step(-0.5,vP1.x)/(1.0+0.3*max(0.0,0.5*log2(max(dot(gkS0,gkS0),dot(gkS1,gkS1))*gkNs*gkNs+1e-8)));
 vec3 gkQ1p=cross(gkQ1,normal),gkQ0p=cross(normal,gkQ0);vec3 gkT=gkQ1p*gkS0.x+gkQ0p*gkS1.x,gkB=gkQ1p*gkS0.y+gkQ0p*gkS1.y;
 float gkD=max(dot(gkT,gkT),dot(gkB,gkB));float gkSc=gkD==0.0?0.0:faceDirection*inversesqrt(gkD);
 normal=normalize(gkT*(gkXY.x*gkSc)+gkB*(gkXY.y*gkSc)+normal*sqrt(max(0.06,1.0-dot(gkXY,gkXY))));}
#endif
totalEmissiveRadiance+=diffuseColor.rgb*gm*vTuv.z*uNight*vP3.y;`;
const GK_FPHONG=`
BlinnPhongMaterial material;
float gkGl=gm*vP2.w;
material.diffuseColor=diffuseColor.rgb*(1.0-gm*vP3.x);
material.specularColor=vec3(mix(vP2.x,0.08,gkGl));
material.specularShininess=mix(vP2.y,320.0,gkGl);
material.specularStrength=1.0;`;
const GK_FEXTRA=`
{vec3 gkV=normalize(vViewPosition);float gkNV=saturate(dot(normal,gkV));
 vec3 gkRw=normalize((vec4(reflect(-gkV,normal),0.0)*viewMatrix).xyz);
 vec3 gkEnv=mix(uSkyH,uSkyZ,pow(saturate(gkRw.y),0.5));gkEnv=mix(uSkyG,gkEnv,smoothstep(-0.05,0.22,gkRw.y));
 reflectedLight.indirectSpecular+=gkEnv*(0.05+0.95*pow(1.0-gkNV,5.0))*max(vP2.z,gkGl);
 vec3 gkL=texture2D(uLamp,(vWp.xz-uLampR.xy)*uLampR.zw).rgb;
 float gkH=vWp.y-(uLampH.x+gkL.b*uLampH.y);float gkNy=dot(normal,viewMatrix[1].xyz);
 reflectedLight.indirectDiffuse+=(uLampC*gkL.r+uShopC*gkL.g)*((1.0-smoothstep(2.0,7.5,gkH))*(0.5+0.5*gkNy)*uNight)*material.diffuseColor;
 {vec3 gkNw=(vec4(normal,0.0)*viewMatrix).xyz;float gkW=saturate(dot(gkNw.xz,uSunXZ)*0.75+0.25+0.25*gkNw.y);reflectedLight.indirectDiffuse+=uGlowC*(gkW*gkW)*material.diffuseColor;}
 #ifdef GK_LEAF
  #if NUM_DIR_LIGHTS > 0
  reflectedLight.directDiffuse+=directionalLights[0].color*material.diffuseColor*(gkSunVis*RECIPROCAL_PI*vP3.z*saturate(dot(-normal,directionalLights[0].direction)*0.8+0.2));
  #endif
 #endif
}`;
const GK_FFOG=`
#ifdef USE_FOG
 float fogFactor=1.0-(1.0-smoothstep(fogNear,fogFar,vFogDepth))*exp(-vFogDepth*uHaze);
 float gkSg=max(dot(normalize(vWp.xz-cameraPosition.xz+vec2(1e-4)),uSunXZ),0.0);
 gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(fogColor,uFogSun.rgb,gkSg*gkSg*gkSg*uFogSun.a),fogFactor);
#endif`;
function gkUniforms(sh){sh.uniforms.uLut={value:lutTex};sh.uniforms.uArr={value:arrTex};sh.uniforms.uNrm={value:nrmTex};sh.uniforms.uTime=U.time;sh.uniforms.uNight=U.night;sh.uniforms.uNoiseL=U.noiseL;
  sh.uniforms.uLamp=U.lamp;sh.uniforms.uLampR=U.lampR;sh.uniforms.uLampH=U.lampH;sh.uniforms.uLampC=U.lampC;sh.uniforms.uShopC=U.shopC;sh.uniforms.uSkyZ=U.skyZ;sh.uniforms.uSkyH=U.skyH;sh.uniforms.uSkyG=U.skyG;sh.uniforms.uFogSun=U.fogSun;sh.uniforms.uSunXZ=U.sunXZ;sh.uniforms.uHaze=U.haze;sh.uniforms.uGlowC=U.glowC;sh.uniforms.uWind=U.wind}
/* worldMat({cut, leaf}) — the shared world material. cut: alpha cut-out, double sided. leaf: foliage cards (normals not flipped, translucent). */
function worldMat(o){o=o||{};const m=new THREE.MeshPhongMaterial({vertexColors:true,side:o.cut?THREE.DoubleSide:THREE.FrontSide});m.defines={GK_WORLD:''};if(o.cut)m.defines.GK_CUT='';if(o.leaf)m.defines.GK_LEAF='';if(TEX.nsize>0||(!TEX.ready&&Q.ntex>0))m.defines.GK_NRM='';
  m.onBeforeCompile=sh=>{gkUniforms(sh);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>'+GK_VPARS).replace('#include <project_vertex>','#include <project_vertex>'+GK_VMAIN+(o.leaf?GK_VWIND:''));
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>'+GK_FPARS).replace('#include <map_fragment>',GK_FMAP).replace('#include <color_fragment>',GK_FCOLOR).replace('#include <specularmap_fragment>','float specularStrength=1.0;')
      .replace('#include <normal_fragment_maps>',GK_FNORMAL).replace('#include <lights_phong_fragment>',GK_FPHONG).replace('#include <lights_fragment_end>','#include <lights_fragment_end>'+GK_FEXTRA).replace('#include <fog_fragment>',GK_FFOG)};
  m.customProgramCacheKey=()=>'gkWorld'+(o.cut?'C':'')+(o.leaf?'L':'');
  if(o.leaf)m.onBeforeRender=(r,s,c,g,obj)=>{if(obj.castShadow&&!obj.customDepthMaterial)obj.customDepthMaterial=MAT.depthCut};
  return m}
/* depth material for alpha cut-outs so that foliage casts leaf-shaped shadows */
function cutDepthMat(){const m=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
  m.onBeforeCompile=sh=>{sh.uniforms.uLut={value:lutTex};sh.uniforms.uArr={value:arrTex};sh.uniforms.uTime=U.time;sh.uniforms.uWind=U.wind;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aRect;uniform highp sampler2D uLut;uniform float uTime;uniform vec3 uWind;varying vec3 vTuvD;').replace('#include <uv_vertex>','#include <uv_vertex>\n{int gkId=int(aRect.x*255.0+0.5);vec4 gk0=texelFetch(uLut,ivec2(0,gkId),0);vTuvD=vec3(uv*gk0.yz,gk0.x);}')
      .replace('#include <project_vertex>','#include <project_vertex>'+GK_VWIND.replace('vWp+=gkD;',''));
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform mediump sampler2DArray uArr;varying vec3 vTuvD;').replace('#include <map_fragment>','if(texture(uArr,vec3(vTuvD.xy,floor(vTuvD.z+0.5))).a<0.42)discard;')};
  m.customProgramCacheKey=()=>'gkDepthCut';return m}

/* legacy 2D atlas material (used by the sign atlas): per-vertex tile rectangle, night glow from the texture's alpha */
let atlasTex=null,signTex;
function atlasMat(tex,cut){const m=new THREE.MeshLambertMaterial({map:tex,vertexColors:true,side:cut?THREE.DoubleSide:THREE.FrontSide});
  m.onBeforeCompile=sh=>{sh.uniforms.uNight=U.night;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aRect;attribute float aGlow;varying vec4 vRect;varying float vGlow;').replace('#include <uv_vertex>','#include <uv_vertex>\nvRect=aRect;vGlow=aGlow;');
    const samp=GL2?'textureGrad(map,auv,dFdx(vUv)*vRect.zw,dFdy(vUv)*vRect.zw)':'texture2D(map,auv)';
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uNight;varying vec4 vRect;varying float vGlow;')
      .replace('#include <map_fragment>',`vec2 auv=vRect.xy+fract(vUv)*vRect.zw;vec4 texel=${samp};diffuseColor.rgb*=texel.rgb;float gm=clamp((1.0-texel.a)*2.0,0.0,1.0);${cut?'if(texel.a<0.5)discard;gm=0.0;':''}`)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=texel.rgb*gm*vGlow*uNight*1.7;')};
  m.customProgramCacheKey=()=>cut?'atlasCut':'atlas';return m}
const MAT={};
/* initMaterials(progress) — called once from boot(): checks WebGL2, loads the photographic layers, paints the procedural ones,
   and creates MAT.atlas (opaque world), MAT.cut (alpha cut-outs), MAT.leaf (foliage cards), MAT.depthCut. */
async function initMaterials(progress){if(!GL2)throw new Error('this browser has no WebGL 2, which the game needs. Please update your browser or try another device.');
  lutTex.needsUpdate=true;await loadTextures(progress);
  MAT.atlas=worldMat();MAT.cut=worldMat({cut:true});MAT.leaf=worldMat({cut:true,leaf:true});MAT.depthCut=cutDepthMat();return MAT}
