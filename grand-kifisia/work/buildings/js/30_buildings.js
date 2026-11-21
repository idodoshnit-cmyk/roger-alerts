'use strict';
/* Grand Kifisia — buildings v2 (owner: buildings agent; docs/BUILDINGS_IMPL.md)
   - every building footprint from the map, 1:1 in metres: storeys from OSM levels, a taller commercial ground floor, slabs, balconies with parapets, penthouse set-backs,
     neoclassical plinths/cornices, flat roofs with parapets/bulkheads, tiled hip roofs with eaves;
   - EVERY business of the census (gk3/data/census.json tiers A/B) and every OSM shop (gk3/data/shops.json) gets a shopfront with its real name on the facade nearest
     to its real position; bays never overlap (1-D layout per facade edge); upper-floor businesses get brass plates at the building entrance;
   - LOD: the building shell (walls, tiles, slabs, roofs, shop interiors) lives in the 96 m world chunks; the near detail (3D shopfront frames, glass, fascia boxes,
     sign text, awnings, AC units, terraces) lives in 64 m cells shown within ~105 m of the camera (hooked into updateChunkVis at boot);
   - sign text: a single-channel 4096² label atlas (white glyph mask, the ink colour is the vertex colour) → crisp, ~1000 signs; the legacy 2D sign atlas
     (newSlot / signAt / addSign / brandSlot) is kept unchanged for other modules. */

/* ============================== research data ============================== */
const BDATA={shops:null,census:null,spec:null};
async function bldLoad(){if(MAP&&MAP.buildings){BLD.nAll=MAP.buildings.length;MAP.buildings.forEach((b,i)=>{b._i=i})}const get=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);[BDATA.shops,BDATA.census,BDATA.spec]=await Promise.all([get('data/shops.json'),get('data/census.json'),get('data/buildings_spec.json')])}

/* registry of what was built (other modules may read it): SHOPS_BUILT[i] = {name, x, z (facade point), nx, nz, door:[x,z], w, group, cat, b (building index), src, id} */
const BLD={list:[],shops:[],plates:[],unplaced:[],stats:{}};const SHOPS_BUILT=BLD.shops;

/* ============================== near-detail LOD cells ============================== */
const BCELL=64,BCELLS=new Map();let BGLASS=null,LABMAT=null;
function bcell(x,z){const k=Math.floor(x/BCELL)+','+Math.floor(z/BCELL);let c=BCELLS.get(k);if(!c){c={k,cx:(Math.floor(x/BCELL)+0.5)*BCELL,cz:(Math.floor(z/BCELL)+0.5)*BCELL,o:new GB(),cut:new GB(),gl:new GB(),lab:new GB(),shut:new GB(),far:new GB(),meshes:[],shutM:null,farM:null};BCELLS.set(k,c)}return c}
function bldNearD(){return Q===QP.low?78:Q===QP.high?140:108}
/* shops close at night: roller shutters come down (21:30–08:30) on the shops that have them (cafés, bars, restaurants, pharmacies stay open) */
function shopsClosed(){const t=typeof tod==='number'?tod:12;return t>=21.5||t<8.5}
function bldVis(cx,cz){const d2=Math.pow(bldNearD(),2),cl=shopsClosed();for(const c of BCELLS.values()){const dx=c.cx-cx,dz=c.cz-cz,v=dx*dx+dz*dz<d2;for(const m of c.meshes)m.visible=v;if(c.farM)c.farM.visible=!v;if(c.shutM)c.shutM.visible=v&&cl}}

/* ============================== label atlas (crisp sign text) ============================== */
const LAB={W:4096,H:4096,y:0,shelves:[],cache:new Map(),c:null,g:null,tex:null,full:false,n:0};
function labG(){if(!LAB.g){const c=document.createElement('canvas');c.width=LAB.W;c.height=LAB.H;LAB.c=c;LAB.g=c.getContext('2d',{willReadFrequently:true});LAB.g.fillStyle='#000';LAB.g.fillRect(0,0,LAB.W,LAB.H)}return LAB.g}
function labFont(style,px){const fam=style==='serif'?'Georgia,"Times New Roman","DejaVu Serif",serif':style==='script'?'"Brush Script MT","Segoe Script","URW Chancery L","Z003",cursive':'"Helvetica Neue",Helvetica,Arial,"Liberation Sans","DejaVu Sans",sans-serif';
  return (style==='script'?'italic ':style==='thin'?'':'bold ')+px+'px '+fam}
/* labText(text, style 'sans|serif|caps|script|thin', rowPx) → {u0,u1,vt,vb,asp} (asp = width/height of the glyph box) or null when the atlas is full */
function labText(text,style,hpx){text=String(text==null?'':text).replace(/\s+/g,' ').trim();if(!text)return null;if(style==='caps')text=text.toUpperCase();hpx=hpx||56;
  const key=style+'|'+hpx+'|'+text;if(LAB.cache.has(key))return LAB.cache.get(key);
  const g=labG();let px=Math.round(hpx*0.74);g.font=labFont(style,px);const sp=style==='caps'?px*0.09:0;const meas=()=>g.measureText(text).width+sp*text.length;let tw=meas();
  const maxW=LAB.W*0.45;if(tw>maxW){px=Math.max(10,Math.floor(px*maxW/tw));g.font=labFont(style,px);tw=meas()}
  const w=Math.ceil(tw+hpx*0.3);let sh=null;for(const q of LAB.shelves)if(q.h===hpx&&q.x+w<=LAB.W){sh=q;break}
  if(!sh){if(LAB.y+hpx+2>LAB.H){LAB.full=true;console.warn('label atlas full: '+text);return null}sh={y:LAB.y,h:hpx,x:0};LAB.shelves.push(sh);LAB.y+=hpx+2}
  const x=sh.x,y=sh.y;sh.x+=w+3;LAB.n++;g.fillStyle='#fff';g.textBaseline='middle';
  if(sp){g.textAlign='left';let cx=x+hpx*0.15;for(const ch of text){g.fillText(ch,cx,y+hpx*0.55);cx+=g.measureText(ch).width+sp}}else{g.textAlign='center';g.fillText(text,x+w/2,y+hpx*0.55)}
  const r={u0:(x+1)/LAB.W,u1:(x+w-1)/LAB.W,vt:(y+1)/LAB.H,vb:(y+hpx)/LAB.H,asp:(w-2)/(hpx-1)};LAB.cache.set(key,r);return r}
/* a text quad: centre (x,y,z), facing (nx,nz), height h (m) of the glyph box; width follows the aspect, limited to maxW (then h shrinks). Returns the width used. */
function labQuad(G,r,x,y,z,nx,nz,h,maxW,col,glow){if(!r)return 0;let w=h*r.asp;if(maxW&&w>maxW){h*=maxW/w;w=maxW}const ux=nz,uz=-nx;const ax=x-ux*w/2,az=z-uz*w/2,bx=x+ux*w/2,bz=z+uz*w/2;
  G.quad([ax,y-h/2,az],[bx,y-h/2,bz],[bx,y+h/2,bz],[ax,y+h/2,az],[r.u0,r.vb],[r.u1,r.vb],[r.u1,r.vt],[r.u0,r.vt],col,RECT[0],glow||0);return w}
function labFinish(){if(!LAB.g)return;const used=Math.min(LAB.H,LAB.y+4);const im=LAB.g.getImageData(0,0,LAB.W,used).data;const d=new Uint8Array(LAB.W*LAB.H);for(let i=0,j=0;j<LAB.W*used;i+=4,j++)d[j]=im[i];
  const t=new THREE.DataTexture(d,LAB.W,LAB.H,THREE.RedFormat,THREE.UnsignedByteType);t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=8;t.unpackAlignment=1;t.needsUpdate=true;LAB.tex=t;
  LAB.c.width=LAB.c.height=1;LAB.g=null;LAB.c=null;
  const m=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,depthWrite:false,map:t,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4});
  m.onBeforeCompile=sh=>{sh.uniforms.uNight=U.night;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aGlow;varying float vGlow;').replace('#include <uv_vertex>','#include <uv_vertex>\nvGlow=aGlow;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uNight;varying float vGlow;').replace('#include <map_fragment>','float gkLa=texture2D(map,vUv).r;diffuseColor.a*=smoothstep(0.08,0.62,gkLa);if(diffuseColor.a<0.02)discard;')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vGlow*uNight*3.2;')};
  m.customProgramCacheKey=()=>'gkLabel';LABMAT=m}

/* ============================== geometry helpers ============================== */
/* edge frame: E={a:[x,z],ux,uz,nx,nz,L}; P(E,s,d) = point at s metres along the edge and d metres outwards */
const EP=(E,s,d)=>[E.a[0]+E.ux*s+E.nx*d,E.a[1]+E.uz*s+E.nz*d];
/* oriented box in an edge frame: s0..s1 along, d0..d1 outwards, y0..y1. faces: string of letters f(ront) b(ack) l r t(op) u(nder). UVs in metres (TM tiles). */
function ebox(G,E,s0,s1,d0,d1,y0,y1,col,tile,gl,faces){faces=faces||'flrt';const rc=RECT[tile];const A=EP(E,s0,d0),B=EP(E,s1,d0),C=EP(E,s1,d1),D=EP(E,s0,d1);const w=s1-s0,dp=d1-d0;
  if(faces.indexOf('f')>=0)G.wall(D[0],D[1],C[0],C[1],y0,y0,y1,y1,E.nx,E.nz,s0,s1,y0,y1,col,rc,gl);
  if(faces.indexOf('b')>=0)G.wall(B[0],B[1],A[0],A[1],y0,y0,y1,y1,-E.nx,-E.nz,0,w,y0,y1,col,rc,gl);
  if(faces.indexOf('l')>=0)G.wall(A[0],A[1],D[0],D[1],y0,y0,y1,y1,-E.ux,-E.uz,0,dp,y0,y1,col,rc,gl);
  if(faces.indexOf('r')>=0)G.wall(C[0],C[1],B[0],B[1],y0,y0,y1,y1,E.ux,E.uz,0,dp,y0,y1,col,rc,gl);
  if(faces.indexOf('t')>=0)G.hq([A[0],y1,A[1]],[B[0],y1,B[1]],[C[0],y1,C[1]],[D[0],y1,D[1]],[s0,d0],[s1,d0],[s1,d1],[s0,d1],col,rc,gl);
  if(faces.indexOf('u')>=0)G.hq([A[0],y0,A[1]],[B[0],y0,B[1]],[C[0],y0,C[1]],[D[0],y0,D[1]],[s0,d0],[s1,d0],[s1,d1],[s0,d1],shade(col,0.8),rc,gl,true)}
/* vertical quad in an edge frame (facing +n, or -n when back) with explicit UVs */
function eq(G,E,s0,s1,d,y0,y1,col,tile,u0,u1,v0,v1,gl,back){const A=EP(E,s0,d),B=EP(E,s1,d);G.wall(A[0],A[1],B[0],B[1],y0,y0,y1,y1,back?-E.nx:E.nx,back?-E.nz:E.nz,u0,u1,v0,v1,col,RECT[tile],gl||0)}
function insetPoly(ps,d){const n=ps.length,out=[];for(let i=0;i<n;i++){const p0=ps[(i-1+n)%n],p1=ps[i],p2=ps[(i+1)%n];const e1=[p1[0]-p0[0],p1[1]-p0[1]],e2=[p2[0]-p1[0],p2[1]-p1[1]];const l1=Math.hypot(e1[0],e1[1])||1,l2=Math.hypot(e2[0],e2[1])||1;
    const n1=[-e1[1]/l1,e1[0]/l1],n2=[-e2[1]/l2,e2[0]/l2];const a=[p1[0]+n1[0]*d,p1[1]+n1[1]*d],b=[p1[0]+n2[0]*d,p1[1]+n2[1]*d];const cr=e1[0]*e2[1]-e1[1]*e2[0];let q=a;
    if(Math.abs(cr)>1e-6*l1*l2){const s=((b[0]-a[0])*e2[1]-(b[1]-a[1])*e2[0])/cr;q=[a[0]+e1[0]*s,a[1]+e1[1]*s]}if(Math.hypot(q[0]-p1[0],q[1]-p1[1])>d*3)return null;out.push(q)}
  if(polyArea(out)<polyArea(ps)*0.3)return null;for(const q of out)if(!pip(ps,q[0],q[1]))return null;for(let i=0;i<n;i++){const a=out[i],b=out[(i+1)%n];if(Math.hypot(b[0]-a[0],b[1]-a[1])<0.3)return null}return out}
function flatPoly(G,ps,y,col,tile){const tris=triangulate([ps]);for(const t of tris){let [a,b,c]=t;const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr>0){const q=b;b=c;c=q}G.tri([a[0],y,a[1]],[b[0],y,b[1]],[c[0],y,c[1]],[a[0],a[1]],[b[0],b[1]],[c[0],c[1]],col,RECT[tile],0,true)}}

/* ============================== buildings: preparation ============================== */
function prepBuilding(b,bi){const [g10,lv,style,roof,detail,h,rv,edges,shops,name,coords]=b;let raw=unp(coords);if(raw.length<3)return null;
  let pts=[];for(let i=0;i<raw.length;i++){const p=raw[i],q=raw[(i+1)%raw.length];if(Math.hypot(p[0]-q[0],p[1]-q[1])>0.05)pts.push([p,edges[i]||0,i])}if(pts.length<3)return null;
  let ps=pts.map(p=>p[0]),F=pts.map(p=>p[1]),orig=pts.map(p=>p[2]);const area=polyArea(ps);const rev=area<0;if(rev){ps=ps.slice().reverse();const n=F.length;F=F.map((_,k)=>pts[(n-2-k+n)%n][1]);orig=orig.map((_,k)=>pts[(n-2-k+n)%n][2])}
  const myEdge={};orig.forEach((o,k)=>myEdge[o]=k);
  const n=ps.length;let cx=0,cz=0;for(const p of ps){cx+=p[0];cz+=p[1]}cx/=n;cz/=n;let gmin=Infinity,gmax=-Infinity;for(const p of ps){const y=terr(p[0],p[1]);gmin=Math.min(gmin,y);gmax=Math.max(gmax,y)}
  const E=[];for(let i=0;i<n;i++){const a=ps[i],c=ps[(i+1)%n],dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz)||1e-6;E.push({a,c,ux:dx/L,uz:dz/L,nx:dz/L,nz:-dx/L,L,i})}
  return{i:bi,ps,n,F,E,rev,myEdge,tags:b[11]||{},lv:Math.max(1,lv),style,roof,detail,h,rv,name,cx,cz,gmin,gmax,area:Math.abs(area),inF:inFocus(cx,cz),shopsE:ps.map(()=>[]),plates:[],ovr:{}}}

/* ============================== every business → a facade ============================== */
const _nrm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9α-ω]+/g,'');
const PLATECAT=/^(office|doctor|dentist|clinic|lawyer|accountant|architect|consult|psycholog|physio|notary|engineer|school|kindergarten|church|police|public|government|museum|association|ngo|coworking|insurance)/;
function collectShops(){const out=[],plates=[];const S=(BDATA.shops&&BDATA.shops.shops)||[],C=(BDATA.census&&BDATA.census.places)||[];
  const SPM={mythos:/mythos/,paul:/^paul$/,starbucks:/starbucks/,kfc:/^kfc$/,super:/βασιλοπουλ|vasilopoul|^ab$/};
  const specials={};for(const k in (MAP.special||{})){const s=MAP.special[k];if(!SPECIALSPEC[k])continue;const ss=SPECIALSPEC[k];
    specials[k]={special:k,name:ss.text+(ss.sub&&k!=='starbucks'?' '+ss.sub:''),x:s.x,z:s.z,b:s.b,door:s.door,group:ss.group,want:ss.want,minW:4,src:'special',id:k,number:'',prio:0,
      sign:{text:ss.text,sub:ss.sub,fg:ss.fg,bg:ss.bg,style:ss.style,lit:true},awn:ss.awn,frame:ss.frame,door0:ss.door,facade:{col:ss.facade,mat:'plaster'},terrace:ss.terrace||null,cat:ss.group};
    specials[k].sp=specials[k];out.push(specials[k])}
  const isSpecial=(nm,x,z)=>{const q=_nrm(nm);for(const k in specials){if(SPM[k]&&SPM[k].test(q)){const s=specials[k];if(Math.hypot(x-s.x,z-s.z)<60)return s}}return null};
  const ids=new Set(),byName=[];
  for(const r of S){if(r.x==null)continue;const sx=isSpecial(r.name,r.x,r.z)||isSpecial(r.nameLatin,r.x,r.z);if(r.osm)ids.add(r.osm);
    if(sx){sx.number=r.number||sx.number;sx.hours=r.hours;sx.street=r.street;if(r.building)sx.building=r.building;if(r.sign&&r.sign.detail)sx.signDetail=r.sign.detail;continue}
    const lv=r.level!=null?parseFloat(r.level):0;const sp=shopSpecFrom(r,'shops');sp.prio=1;sp.street=r.street;byName.push([_nrm(r.name),r.x,r.z]);
    if(lv>=1||lv<0||PLATECAT.test(r.category||''))plates.push(sp);else out.push(sp)}
  for(const p of C){if(p.tier!=='A'&&p.tier!=='B')continue;if(p.open===false)continue;if(p.osm&&ids.has(p.osm))continue;if(isSpecial(p.name,p.x,p.z)||isSpecial(p.nameLatin,p.x,p.z))continue;
    const q=_nrm(p.name);if(!q||p.unnamed)continue;let dup=false;for(const [nq,x,z] of byName){if(Math.abs(x-p.x)<45&&Math.abs(z-p.z)<45&&(nq===q||(q.length>=4&&nq.length>=4&&(nq.indexOf(q)>=0||q.indexOf(nq)>=0)))){dup=true;break}}if(dup)continue;
    byName.push([q,p.x,p.z]);const sp=shopSpecFrom(p,'census');sp.prio=p.tier==='A'?2:3;sp.street=p.street;sp.tier=p.tier;
    if(p.streetLevel===false||(PLATECAT.test(p.category||'')&&p.streetLevel!==true)||/hotel|mall|cinema|theatre/.test(p.category||'')&&false)plates.push(sp);else out.push(sp)}
  return{shops:out,plates}}

function edgeGrid(){const G=new Map(),cs=12;for(const B of BLD.list)for(const E of B.E){if(E.L<1.2)continue;const x0=Math.min(E.a[0],E.c[0]),x1=Math.max(E.a[0],E.c[0]),z0=Math.min(E.a[1],E.c[1]),z1=Math.max(E.a[1],E.c[1]);
    for(let gx=Math.floor(x0/cs);gx<=Math.floor(x1/cs);gx++)for(let gz=Math.floor(z0/cs);gz<=Math.floor(z1/cs);gz++){const k=gx*65536+gz;let a=G.get(k);if(!a)G.set(k,a=[]);a.push([B,E])}}
  return(x,z,R)=>{const seen=new Set(),res=[];for(let gx=Math.floor((x-R)/cs);gx<=Math.floor((x+R)/cs);gx++)for(let gz=Math.floor((z-R)/cs);gz<=Math.floor((z+R)/cs);gz++){const a=G.get(gx*65536+gz);if(!a)continue;
    for(const be of a){const E=be[1];if(seen.has(E))continue;seen.add(E);const B=be[0];const dx=x-E.a[0],dz=z-E.a[1];const t=clamp((dx*E.ux+dz*E.uz)/E.L,0,1);const qx=E.a[0]+E.ux*E.L*t,qz=E.a[1]+E.uz*E.L*t;const d=Math.hypot(x-qx,z-qz);if(d>R)continue;
      const side=(x-qx)*E.nx+(z-qz)*E.nz;const inside=pip(B.ps,x,z);let sc=d+(B.F[E.i]>0?0:7)+(E.L<2.6?5:E.L<4?1.5:0)+(!inside&&side<-0.5?12:0)+(B.style==='villa'?3:0)+(B.style==='church'||B.style==='station'?20:0);res.push([sc,B,E,t])}}
    res.sort((p,q)=>p[0]-q[0]);return res}}

/* MAP.pois (team:data, docs/MAP_DATA.md) already places every POI on its facade (building b, edge e, t, bay width w, house-number parity…): use it as the source of truth.
   The look of each bay comes from shops.json (matched by OSM id / name), the special-shop specs, or category-typical inference. */
function osmKey(id){const m=/^osm:([nwr])(\d+)/.exec(id||'');return m?({n:'node/',w:'way/',r:'relation/'}[m[1]]+m[2]):null}
function allocateFromPois(){const S=(BDATA.shops&&BDATA.shops.shops)||[];const byOsm=new Map(),byName=new Map();for(const r of S){if(r.osm)byOsm.set(r.osm,r);const q=_nrm(r.name);if(q){if(!byName.has(q))byName.set(q,[]);byName.get(q).push(r)}}
  const findSpec=p=>{let r=null;const k=osmKey(p.osm||p.id);if(k&&byOsm.has(k))r=byOsm.get(k);if(!r){for(const nm of[p.name,p.nameLatin]){const a=byName.get(_nrm(nm));if(a){for(const c of a)if(Math.hypot(c.x-p.x,c.z-p.z)<70){r=c;break}}if(r)break}}return r};
  let nShop=0,nPlate=0,nBsign=0;
  for(const p of MAP.pois){const B=BLD.byIdx[p.b];const bay=p.bay;if(bay!=='shop'&&bay!=='plate'&&bay!=='directory'&&bay!=='building')continue;
    if(!B){if(BLD.excluded&&BLD.excluded.has(p.b)){(BLD.landmarkPois||(BLD.landmarkPois=[])).push(p);continue}BLD.unplaced.push({name:p.name,x:p.x,z:p.z,src:p.src,reason:'map POI without a building ('+bay+')'});continue}
    const k=B.myEdge[p.e];const E=k==null?null:B.E[k];if(!E){BLD.unplaced.push({name:p.name,x:p.x,z:p.z,src:p.src,reason:'edge '+p.e+' of building '+p.b+' degenerate'});continue}
    const t=B.rev?1-p.t:p.t;const r=findSpec(p);let sp;
    if(p.special&&SPECIALSPEC[p.special]){const ss=SPECIALSPEC[p.special];sp={special:p.special,name:p.name,cat:ss.group,group:ss.group,want:p.w||ss.want,minW:3,src:'special',id:p.id,number:p.number||(r&&r.number)||'',
        sign:{text:ss.text,sub:ss.sub,fg:ss.fg,bg:ss.bg,style:ss.style,lit:true},awn:ss.awn,frame:ss.frame,facade:{col:ss.facade,mat:ss.mat||'plaster'},terrace:ss.terrace||null,door:p.door,building:r&&r.building,x:p.x,z:p.z};
      if(r){if(r.sign&&r.sign.text&&!ss.keepText){const tt=r.sign.text.split(/\s+[\u2014\u2013]\s+/);sp.sign.text=tt[0];sp.sign.sub=tt[1]||sp.sign.sub;}if(r.sign){sp.sign.fg=r.sign.textColour||sp.sign.fg;sp.sign.bg=r.sign.bgColour||sp.sign.bg;sp.sign.style=r.sign.style||sp.sign.style}
        if(r.awning&&r.awning.type)sp.awn=Object.assign({},sp.awn,{type:r.awning.type,col:r.awning.colour||sp.awn.col,stripe:r.awning.stripe||null});if(r.shopfront&&r.shopfront.frameColour)sp.frame=r.shopfront.frameColour;if(r.facade&&r.facade.colour)sp.facade={col:r.facade.colour,mat:r.facade.material||'plaster'};if(r.terrace&&r.terrace.tables)sp.terrace=Object.assign({},r.terrace,ss.terrace&&ss.terrace.screens?{screens:true}:{})}
      if(ss.keepText){sp.sign.text=ss.text;sp.sign.sub=ss.sub}}
    else if(r){sp=shopSpecFrom(r,'shops');sp.x=p.x;sp.z=p.z;sp.id=p.id}
    else{sp=shopSpecFrom({name:p.name,nameLatin:p.nameLatin,category:p.cat,x:p.x,z:p.z,number:p.number,bg:p.bg,fg:p.fg,hours:p.hours},'census');sp.id=p.id;sp.src=p.src}
    sp.street=p.street;sp.poi=p;
    if(bay==='shop'){sp.want=p.w||sp.want;sp.minW=Math.min(sp.minW||2.4,p.w||2.4);B.shopsE[E.i].push({sp,s:t*E.L,fixed:true});nShop++}
    else if(bay==='building'){(B.bsigns||(B.bsigns=[])).push({sp,E,s:t*E.L});nBsign++}
    else{sp.plateAt={E,s:t*E.L};B.plates.push(sp);nPlate++}}
  BLD.stats.fromPois={shop:nShop,plate:nPlate,building:nBsign}}
function allocateShops(){if(MAP.pois&&MAP.pois.length&&MAP.pois[0].b!==undefined){allocateFromPois();layoutEdges();return}const {shops,plates}=collectShops();const near=edgeGrid();const cap=new Map();const used=E=>cap.get(E)||0;
  const order=shops.slice().sort((p,q)=>p.prio-q.prio);
  for(const sp of order){let cand;
    if(sp.special&&BLD.byIdx[sp.b]){const B=BLD.byIdx[sp.b];cand=B.E.map(E=>{const dx=sp.x-E.a[0],dz=sp.z-E.a[1];const t=clamp((dx*E.ux+dz*E.uz)/E.L,0,1);const d=Math.hypot(sp.x-(E.a[0]+E.ux*E.L*t),sp.z-(E.a[1]+E.uz*E.L*t));return[d,B,E,t]}).sort((p,q)=>p[0]-q[0])}
    else cand=near(sp.x,sp.z,36);
    let ok=false;for(const [sc,B,E,t] of cand){const need=sp.minW+0.3;if(used(E)+need>E.L-0.5&&!(sp.special&&!used(E)))continue;cap.set(E,used(E)+need);B.shopsE[E.i].push({sp,s:t*E.L});ok=true;break}
    if(!ok)BLD.unplaced.push({name:sp.name,x:sp.x,z:sp.z,src:sp.src,reason:cand.length?'no free frontage on the facades within 36 m':'no building facade within 36 m'})}
  for(const sp of plates){const c=near(sp.x,sp.z,30);if(c.length){c[0][1].plates.push(sp)}else BLD.unplaced.push({name:sp.name,x:sp.x,z:sp.z,src:sp.src,reason:'upper-floor business: no building within 30 m'})}
  layoutEdges()}
/* 1-D layout of the shop bays on one facade edge. MAP.pois bays (fixed) keep their real centre and width (data/placement audit = truth):
   only where two real bays overlap is the overlap split at its middle; a bay is shifted only when it would otherwise become narrower than 1.6 m.
   Every deviation > 0.25 m from (edge, t, w) is logged in BLD.moved (reported by docs/BUILDINGS_IMPL.md). */
function layoutEdges(){const m=0.15,gap=0.2;
  for(const B of BLD.list)for(const E of B.E){const it=B.shopsE[E.i];if(!it.length)continue;it.sort((p,q)=>p.s-q.s);const A=E.L-2*m;
    for(const o of it){o.want=Math.min(o.sp.want||4.5,A);o.minW=Math.min(o.sp.minW||2.4,o.want);o.s0=o.s-o.want/2;o.s1=o.s+o.want/2;
      if(o.s0<m){o.s0=m;if(o.s1-o.s0<Math.min(1.6,o.want))o.s1=o.s0+Math.min(1.6,o.want)}if(o.s1>E.L-m){o.s1=E.L-m;if(o.s1-o.s0<Math.min(1.6,o.want))o.s0=o.s1-Math.min(1.6,o.want)}}
    for(let k=0;k+1<it.length;k++){const p=it[k],q=it[k+1];if(p.s1+gap>q.s0){const c=clamp((p.s1+q.s0)/2,p.s0+0.8,q.s1-0.8);p.s1=c-gap/2;q.s0=c+gap/2}}
    // safety pass: never overlap, keep >= 1.0 m, stay on the edge
    let prev=-1e9;for(const o of it){if(o.s1-o.s0<1.0)o.s1=o.s0+1.0;if(o.s0<prev+gap){const w=o.s1-o.s0;o.s0=prev+gap;o.s1=o.s0+w}prev=o.s1}
    let next=1e9;for(let k=it.length-1;k>=0;k--){const o=it[k];if(o.s1>Math.min(next-gap,E.L-0.05)){const w=o.s1-o.s0;o.s1=Math.min(next-gap,E.L-0.05);o.s0=Math.max(0.05,o.s1-w)}next=o.s0}
    for(const o of it){o.s0=Math.max(o.s0,0.05);o.s1=Math.min(Math.max(o.s1,o.s0+0.6),E.L-0.05);o.w=o.s1-o.s0;const sh=(o.s0+o.s1)/2-o.s;
      if(o.sp.poi&&(Math.abs(sh)>0.25||o.w<(o.sp.poi.w||o.want)-0.25))(BLD.moved||(BLD.moved=[])).push({name:o.sp.name,id:o.sp.id,b:B.i,e:E.i,shift:+sh.toFixed(2),w:+o.w.toFixed(2),want:o.sp.poi.w||null})}}}

/* ============================== buildings: the shell ============================== */
function bldHeights(B){const has=B.shopsE.some(a=>a.length>0);B.hasShop=has;const st=B.style;
  B.gfh=B.ovr.gfh?B.ovr.gfh:st==='station'?5.2:has?4.25:st==='neo'?3.9:st==='villa'?3.3:st==='church'?6:3.4;B.fh=st==='neo'?3.7:st==='modern'?3.35:st==='villa'?3.15:3.1;
  const o=B.ovr;if(o.floors)B.lv=o.floors;const wallH=o.eavesM||(o.heightM&&B.roof!=='hip'&&o.roof!=='hip'?o.heightM:o.heightM?o.heightM-2.2:0);if(wallH&&B.lv>1)B.fh=clamp((wallH-(o.raise||0)-B.gfh)/(B.lv-1),2.8,4.6);if(o.eavesM&&o.heightM)o.roofRise=o.heightM-o.eavesM;
  B.gy=B.gmax+0.14+(o.raise||0);B.pent=st==='apt'&&B.lv>=4&&B.area>140&&hf(B.h*29)<0.62&&!o.noPent;B.ip=B.pent?insetPoly(B.ps,2.1):null;if(!B.ip)B.pent=false;
  const lvB=B.pent?B.lv-1:B.lv;B.top=B.gy+B.gfh+(lvB-1)*B.fh;
  let roofT=B.roof;if(o.roof)roofT=o.roof;if(roofT==='hip'){const rv=B.rv;if(!rv||B.area/(rv[2]*rv[3])<(o.roof==='hip'?0.55:0.8)||rv[2]>40)roofT='flat'}
  if(roofT==='flat'&&B.rv&&(st==='neo'||st==='villa')&&B.rv[2]<30&&B.area/(B.rv[2]*B.rv[3])>0.82&&hf(B.h*7)<0.55)roofT='hip';B.roofT=roofT}

function bayTile(B,front,fl,k,i){const h2=hf(B.h*17+i*5+k*3+fl*101),st=B.style;
  if(st==='modern'||st==='school'||st==='shop')return T.office;if(st==='neo'||st==='agora'||st==='station')return h2<0.72?T.neo:T.neoC;if(st==='villa')return T.villaW;if(st==='church')return T.church;
  if(front)return B.balc?T.balc:(h2<0.75?T.win:T.balc);return h2<0.55?T.win:(h2<0.8?T.small:T.plain)}
const PARAPET=['glass','iron','solid','iron','solid'];

function buildShell(B){const ch=chunkAt(B.cx,B.cz),O=ch.o,N=bcell(B.cx,B.cz);const st=B.style,o=B.ovr;const pal=STYLE_COL[st]||STYLE_COL.apt;const wc=hexc(o.colour||pal[B.h%pal.length]);B.wc=wc;
  const gy=B.gy,gfh=B.gfh,fh=B.fh,top=B.top,base=B.gmin-0.7,lvB=B.pent?B.lv-1:B.lv;const apt=st==='apt',neo=st==='neo'||st==='agora'||st==='station';
  const paraH=B.roofT==='flat'?(apt||st==='modern'?(B.pent?1.05:0.95):0.55):0;B.balc=apt&&B.lv>=2&&(B.detail||B.inF);const ptype=o.balcony||PARAPET[B.h%PARAPET.length];
  const bayW=neo?2.8:st==='villa'?3.3:3.0;
  // lobby: the longest street-facing gap of the building
  if(st!=='church'&&st!=='station'&&st!=='agora'){let best=null;for(const E of B.E){const fr=B.F[E.i]>0?1:0;if(E.L<2.2)continue;const segs=B.shopsE[E.i];let prev=0.3;const gaps=[];for(const s of segs){gaps.push([prev,s.s0-0.1]);prev=s.s1+0.1}gaps.push([prev,E.L-0.3]);
      for(const g of gaps){const len=g[1]-g[0];if(len<1.9)continue;const sc=len*(0.4+fr)+(segs.length?2:0);if(!best||sc>best.sc)best={sc,E,s:(g[0]+g[1])/2}}}B.lobby=best}
  for(const E of B.E){const i=E.i,L=E.L;if(L<0.05)continue;addSeg(E.a[0],E.a[1],E.c[0],E.c[1],'b');const front=B.F[i]>0;
    /* ---- ground floor: shop bays + walls between them ---- */
    const segs=B.shopsE[i];let cur=0;const gapWall=(s0,s1)=>{if(s1-s0<0.03)return;groundWall(B,E,s0,s1,O,N,front,wc,base,bayW)};
    for(const sh of segs){gapWall(cur,sh.s0);shopBuild(B,E,sh,O,N,base);cur=sh.s1}gapWall(cur,L);
    if(segs.length){const s0=segs[0].s0,s1=segs[segs.length-1].s1;SHOPFRONTS.push({a:EP(E,s0,0),c:EP(E,s1,0),nx:E.nx,nz:E.nz,L:s1-s0,n:segs.length})}
    if(neo)ebox(O,E,0,L,0,0.05,base,gy+0.75,shade(wc,0.86),TM.ashlar,0,'ft')}
  /* upper floors use the footprint, or a footprint whose front edge is set back (first-floor terrace, e.g. Mythos Plus) */
  let UPS=B.ps,UE=B.E;if(o.setback&&B.lv>1){const fe=B.E.find(E=>B.shopsE[E.i].length)||B.E[0];const d=o.setback===true?2.2:o.setback;const n=B.n,ps2=B.ps.map(p=>p.slice());
    for(const k of[fe.i,(fe.i+1)%n]){ps2[k][0]-=fe.nx*d;ps2[k][1]-=fe.nz*d}if(polyArea(ps2)>B.area*0.4){UPS=ps2;UE=ps2.map((a,k)=>{const c=ps2[(k+1)%n],dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz)||1e-6;return{a,c,ux:dx/L,uz:dz/L,nx:dz/L,nz:-dx/L,L,i:k}});
      const y=gy+gfh,A=fe.a,C=fe.c,A2=ps2[fe.i],C2=ps2[(fe.i+1)%n];O.hq([A[0],y,A[1]],[C[0],y,C[1]],[C2[0],y,C2[1]],[A2[0],y,A2[1]],[0,0],[fe.L,0],[fe.L,d],[0,d],hexc('#d8d2c6'),RECT[TM.marble],0);
      ebox(O,fe,0,fe.L,-0.02,0.06,y-0.25,y,hexc('#f4f1ea'),TM.plaster,0,'ftu');const Bp=EP(fe,0.1,-0.12),Cp=EP(fe,fe.L-0.1,-0.12);ch.cut.wall(Bp[0],Bp[1],Cp[0],Cp[1],y,y,y+1.0,y+1.0,fe.nx,fe.nz,0,(fe.L-0.2)/1.6,0,1,C1,RECT[T.bBalu],0);
      ebox(O,fe,0,fe.L,-0.28,0.04,y+1.0,y+1.12,hexc('#f4f1ea'),TM.plaster,0,'flrtu');for(const ss of[0.12,fe.L-0.12])ebox(O,fe,ss-0.14,ss+0.14,-0.28,0.0,y,y+1.0,hexc('#f4f1ea'),TM.plaster,0,'flrt')}}
  B.UPS=UPS;
  for(const E of UE){const i=E.i,L=E.L;if(L<0.05)continue;const front=B.F[i]>0;
    /* ---- upper floors ---- */
    const nb=L<1.6?0:Math.max(1,Math.round(L/bayW));const wt=o.upperMat==='wood'?TM.wood:o.wallMat==='stone'?TM.ashlar:o.wallMat==='brick'?TM.brickw:null;
    for(let fl=1;fl<lvB;fl++){const y0=gy+gfh+(fl-1)*fh,y1=y0+fh;
      if(nb===0){eq(O,E,0,L,0,y0,y1,wc,wt||TM.plaster,0,L,y0,y1);continue}
      for(let k=0;k<nb;k++){const s0=L*k/nb,s1=L*(k+1)/nb;const lit=hf(B.h*13+i*7+k*11+fl*29);const gl=lit<0.3?1:lit<0.38?0.55:0;
        if(wt)punchBay(O,N,E,s0,s1,y0,y1,wc,wt,o,gl,front,B);else eq(O,E,s0,s1,0,y0,y1,wc,bayTile(B,front,fl,k,i),0,1,0,1,gl)}}
    /* ---- slabs / string courses / balconies ---- */
    const balcHere=(B.balc||o.balcony)&&front&&L>=3.4&&!o.setback;
    if(apt||st==='modern'||o.balcony)for(let fl=1;fl<lvB;fl++){const y=gy+gfh+(fl-1)*fh;
      if(balcHere){const dep=o.balcony==='wood'?1.2:0.95+hf(B.h*3+i)*0.45;const s0=0.15,s1=L-0.15;const sc=o.balcony==='wood'?hexc('#6b4a33'):shade(wc,0.96);ebox(O,E,s0,s1,0,dep,y-0.2,y,sc,o.balcony==='wood'?TM.wood:TM.concrete,0,'flrtu');
        balconyParapet(B,E,s0,s1,dep,y,o.balcony||ptype,ch,O,N,wc,fl)}
      else ebox(O,E,0,L,0,0.07,y-0.18,y,shade(wc,0.94),TM.plaster,0,'ftu')}
    if(neo||o.stringCourse)ebox(O,E,0,L,0,0.12,gy+gfh-0.16,gy+gfh,hexc(o.stringCourse||'#f7f4ec'),TM.plaster,0,'ftu');
    /* ---- parapet / cornice ---- */
    if(B.roofT==='flat'){eq(O,E,0,L,0,top,top+paraH,wc,wt||TM.plaster,0,L,top,top+paraH);eq(O,E,0,L,-0.22,top,top+paraH,shade(wc,0.88),TM.plaster,L,0,top,top+paraH,0,true);
      ebox(O,E,-0.04,L+0.04,-0.26,neo?0.3:0.05,top+paraH,top+paraH+(neo?0.2:0.07),neo?hexc('#f7f4ec'):shade(wc,1.03),TM.plaster,0,'ftu');
      if(neo)ebox(O,E,0,L,0,0.32,top-0.32,top,hexc('#f4f0e6'),TM.plaster,0,'ftu')}
    else ebox(O,E,0,L,0,0.1,top-0.25,top,neo?hexc('#f7f4ec'):shade(wc,1.02),TM.plaster,0,'ftu');
    if(o.quoins&&front)for(const ss of[0,L-0.55])ebox(O,E,ss,ss+0.55,0,0.06,gy,top,shade(wc,1.06),TM.ashlar,0,'flr');
    /* ---- near detail on the upper floors: awnings (tentes), AC units, corner pilasters ---- */
    if((B.detail||B.inF)&&!wt)upperDetail(B,E,N,wc,front,lvB,nb)}
  /* ---- penthouse ---- */
  if(B.pent){const ip=B.ip,y0=top,y1=top+fh;for(let k=0;k<ip.length;k++){const a=ip[k],c=ip[(k+1)%ip.length];const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz);if(L<0.1)continue;const E={a,c,ux:dx/L,uz:dz/L,nx:dz/L,nz:-dx/L,L};
      const nb=Math.max(1,Math.round(L/3));for(let j=0;j<nb;j++){const lit=hf(B.h*7+k*13+j);eq(O,E,L*j/nb,L*(j+1)/nb,0,y0,y1,wc,L>2.5?T.balc:T.plain,0,1,0,1,lit<0.35?1:0)}
      eq(O,E,0,L,0,y1,y1+0.45,wc,TM.plaster,0,L,y1,y1+0.45);ebox(O,E,-0.05,L+0.05,-0.2,0.35,y1+0.45,y1+0.55,shade(wc,1.03),TM.plaster,0,'ftu')}
    flatPoly(O,ip,y1+0.02,C1,TM.flatroof);flatPoly(O,B.ps,top+0.02,hexc('#d9d3c6'),TM.slabs)}
  /* ---- roof ---- */
  if(B.roofT==='hip'){const rv=UPS===B.ps?B.rv:rectOf(UPS,B.rv);hipRoof(O,rv,top,st,B.h,o)}else if(!B.pent)flatPoly(O,UPS,top+0.02,shade(hexc(['#d8d3c8','#cfcabd','#e2ded4','#c9c4b8','#d6d6d2'][B.h%5]),0.92),TM.flatroof);
  if(B.roofT==='flat'&&(B.detail||B.inF)&&B.lv>=2)roofClutter(B,ch,N);
  if(st==='agora')agoraTurrets(ch,B.ps,gy,top,B.E);
  if(st==='church')churchDome(ch,B.rv,top,B.h);
  if(st==='station')stationFront(ch,B.ps,gy,top,B.E);
  /* ---- entrance (lobby) with house number and plates of the upper-floor businesses ---- */
  const free=B.plates.filter(p=>!p.plateAt);B.plates=B.plates.filter(p=>p.plateAt);
  if(B.lobby)lobby(B,O,N,free);else if(free.length){const E=B.E.reduce((p,q)=>q.L>p.L?q:p);platesAt(B,E,E.L/2,N,free)}
  /* plates placed by the map data on a facade point: moved off shop glazing onto the nearest pier, stacked when several share a spot */
  const groups=new Map();for(const sp of B.plates){const E=sp.plateAt.E;let s=clamp(sp.plateAt.s,0.3,E.L-0.3);for(const sh of B.shopsE[E.i]){if(s>sh.s0-0.25&&s<sh.s1+0.25){s=(s-sh.s0<sh.s1-s)?sh.s0-0.25:sh.s1+0.25}}s=clamp(s,0.25,E.L-0.25);const key=E.i+':'+Math.round(s*2);if(!groups.has(key))groups.set(key,{E,s,list:[]});groups.get(key).list.push(sp)}
  for(const g of groups.values())platesAt(B,g.E,g.s,N,g.list);
  if(B.bsigns)for(const bs of B.bsigns)buildingSign(B,bs,N)}
/* the name of a whole-building POI (hotel, cinema, museum, school…): individual letters on the wall under the roof line */
function buildingSign(B,bs,N){const sp=bs.sp,E=bs.E;const y=Math.max(B.gy+B.gfh*0.85,B.top-0.75),h=B.top-B.gy>6?0.55:0.4;const s=clamp(bs.s,1,E.L-1);const P=EP(E,s,0.04);
  const dark=(B.wc[0]+B.wc[1]+B.wc[2])>1.6;const ink=hexc(dark?'#2a2a2a':'#f4efe4');const r=labText(sp.name,/hotel|museum|theatre|school/.test(sp.cat||'')?'serif':'caps',64);const w=labQuad(N.lab,r,P[0],y,P[1],E.nx,E.nz,h,Math.min(E.L-0.6,9),ink,1);
  BLD.shops.push({name:sp.name,x:EP(E,s,0)[0],z:EP(E,s,0)[1],nx:E.nx,nz:E.nz,door:EP(E,s,1.2),w,group:sp.group,cat:sp.cat,b:B.i,src:sp.src,id:sp.id,kind:'building'});placed('poi',EP(E,s,0)[0],EP(E,s,0)[1],sp.name,sp.id||sp.src)}

/* one shop bay: shell + near detail + registries (SHOPS_BUILT, SHOPFRONTS for forecourts / night light, PLACED for verification) */
function shopBuild(B,E,sh,O,N,base){shopShell(B,E,sh,O,N,base);shopNear(B,E,sh,N);const sp=sh.sp,mid=(sh.s0+sh.s1)/2,P=EP(E,mid,0),Dp=EP(E,sh.dc==null?mid:sh.dc,0.6);
  BLD.shops.push({name:sp.name,x:P[0],z:P[1],nx:E.nx,nz:E.nz,door:Dp,w:sh.s1-sh.s0,group:sp.group,cat:sp.cat,b:B.i,src:sp.src,id:sp.id,special:sp.special||null,number:sp.number||'',from:[sp.x,sp.z]});
  placed('poi',P[0],P[1],sp.name,sp.id||sp.src)}
/* ground-floor wall between shop bays (or the whole ground floor of a residential building) */
function groundWall(B,E,s0,s1,O,N,front,wc,base,bayW){const gy=B.gy,gfh=B.gfh,st=B.style;const lob=B.lobby&&B.lobby.E===E&&B.lobby.s>s0+0.9&&B.lobby.s<s1-0.9;
  if(lob){const ls=B.lobby.s;groundWall(B,E,s0,ls-1.25,O,N,front,wc,base,bayW);groundWall(B,E,ls+1.25,s1,O,N,front,wc,base,bayW);B.lobby.y=gy;return}
  eq(O,E,s0,s1,0,base,gy,shade(wc,0.84),st==='neo'?TM.ashlar:TM.plaster,s0,s1,base,gy);
  if(B.hasShop||st==='modern'){// commercial ground floor: stone/marble cladding piers
    const cl=st==='modern'?hexc('#cfd2d4'):hexc(hf(B.h*41)<0.5?'#e4ded2':'#d6d0c4');eq(O,E,s0,s1,0,gy,gy+gfh,cl,hf(B.h*43)<0.6?TM.marbleW:TM.plasterC,s0,s1,gy,gy+gfh);
    if(s1-s0>0.2&&(B.detail||B.inF))ebox(N.o,E,s0,s1,0,0.04,gy-0.02,gy+0.32,shade(cl,0.8),TM.marbleW,0,'ft');return}
  const L=s1-s0,nb=L<1.6?0:Math.max(1,Math.round(L/bayW));if(nb===0){eq(O,E,s0,s1,0,gy,gy+gfh,wc,TM.plaster,s0,s1,gy,gy+gfh);return}
  for(let k=0;k<nb;k++){const a=s0+L*k/nb,b=s0+L*(k+1)/nb;let t;if(st==='modern'||st==='school')t=T.office;else if(st==='neo'||st==='agora')t=T.neo;else if(st==='villa')t=T.villaW;else if(st==='church')t=T.church;else if(st==='station')t=T.neo;else t=front?T.win:(hf(B.h+k)<0.6?T.win:T.small);
    const lit=hf(B.h*19+E.i*3+k);eq(O,E,a,b,0,gy,gy+gfh,wc,t,0,1,0,gfh/3.1,lit<0.3?1:0)}}

function balconyParapet(B,E,s0,s1,dep,y,ptype,ch,O,N,wc,fl){const hP=1.0,L=s1-s0;
  if(ptype==='solid'){ebox(O,E,s0,s1,dep-0.12,dep,y,y+hP,wc,TM.plaster,0,'fbt');ebox(O,E,s0,s0+0.12,0,dep-0.12,y,y+hP,wc,TM.plaster,0,'lrt');ebox(O,E,s1-0.12,s1,0,dep-0.12,y,y+hP,wc,TM.plaster,0,'lrt')}
  else if(ptype==='balu'){const C=ch.cut;const A=EP(E,s0,dep),Bp=EP(E,s1,dep);C.wall(A[0],A[1],Bp[0],Bp[1],y,y,y+hP,y+hP,E.nx,E.nz,0,L/1.6,0,1,C1,RECT[T.bBalu],0);
    ebox(O,E,s0-0.05,s1+0.05,dep-0.18,dep+0.06,y+hP,y+hP+0.1,hexc('#f4f1ea'),TM.plaster,0,'flrtu')}
  else if(ptype==='glass'){const gl=hexc('#e9eef0');eq(O,E,s0,s1,dep-0.02,y+0.05,y+hP,C1,T.glassR,0,L/1.6,0,1);eq(O,E,s0,s1,dep-0.04,y+0.05,y+hP,C1,T.glassR,0,L/1.6,0,1,0,true);ebox(O,E,s0,s1,dep-0.06,dep+0.02,y+hP,y+hP+0.05,gl,TM.metalL,0,'ftu')}
  else{const C=ch.cut;const col=hexc(['#2a302c','#3a3a3a','#e8e6e0','#4a3b2c'][Math.floor(hf(B.h*5)*4)]);const A=EP(E,s0,dep),Bp=EP(E,s1,dep);C.wall(A[0],A[1],Bp[0],Bp[1],y,y,y+hP,y+hP,E.nx,E.nz,0,L/1.2,0,1,col,RECT[T.rail],0);
    const A2=EP(E,s0,0),B2=EP(E,s1,0);C.wall(A2[0],A2[1],A[0],A[1],y,y,y+hP,y+hP,-E.ux,-E.uz,0,dep/1.2,0,1,col,RECT[T.rail],0);C.wall(Bp[0],Bp[1],B2[0],B2[1],y,y,y+hP,y+hP,E.ux,E.uz,0,dep/1.2,0,1,col,RECT[T.rail],0)}}

function upperDetail(B,E,N,wc,front,lvB,nb){const gy=B.gy,gfh=B.gfh,fh=B.fh,L=E.L,i=E.i;if(L<2)return;
  for(let fl=1;fl<lvB;fl++){const y=gy+gfh+(fl-1)*fh;const hh=hf(B.h*3+fl*11+i*7);
    if(B.balc&&front&&L>=3.4&&hh<0.55){// folding-arm awning over the balcony, in one of the colours people use
      const dep=0.95+hf(B.h*3+i)*0.45+0.2;const ac=[T.awnS,T.awnG,T.awnS,T.awnR][Math.floor(hf(B.h*7+fl)*4)];const yt=y+fh-0.32,yb=y+fh-1.25;const s0=0.25,s1=L-0.25;const A=EP(E,s0,0.05),Bq=EP(E,s1,0.05),C=EP(E,s1,dep),D=EP(E,s0,dep);
      N.o.hq([A[0],yt,A[1]],[D[0],yb,D[1]],[C[0],yb,C[1]],[Bq[0],yt,Bq[1]],[0,0],[0,1],[(s1-s0)/1.6,1],[(s1-s0)/1.6,0],C1,RECT[ac],0);N.o.hq([Bq[0],yt-0.02,Bq[1]],[C[0],yb-0.02,C[1]],[D[0],yb-0.02,D[1]],[A[0],yt-0.02,A[1]],[0,0],[0,1],[(s1-s0)/1.6,1],[(s1-s0)/1.6,0],shade(C1,0.75),RECT[ac],0,true);
      eq(N.o,E,s0,s1,dep,yb-0.22,yb,C1,ac,0,(s1-s0)/1.6,0.85,1)}
    // AC units: on balconies near the wall, else hung on the wall under a window
    const nAC=hf(B.h+fl*7+i*13)<0.55?1+Math.floor(hf(B.h*5+fl+i)*2):0;for(let k=0;k<nAC;k++){const t=clamp(0.15+hf(B.h+i+fl*3+k*17)*0.7,0.1,0.9)*L;const d=B.balc&&front?0.18:0.18;const yy=B.balc&&front?y+0.02:y+0.35;
      ebox(N.o,E,t-0.4,t+0.4,0.02,d+0.14,yy,yy+0.56,hexc('#ecebe7'),TM.metalL,0,'flrt');eq(N.o,E,t-0.33,t+0.08,d+0.145,yy+0.07,yy+0.49,hexc('#8d9296'),T.rail,0,0.5,0,0.5)}
    // potted plants on balconies
    if(B.balc&&front&&L>=3.4&&hf(B.h*11+fl)<0.5){const t=L*(0.2+hf(B.h+fl*5)*0.6),Pp=EP(E,t,0.75);N.o.cyl(Pp[0],y,Pp[1],0.2,0.24,0.38,6,hexc('#a8552f'),RECT[TM.plaster],true);N.cut.cyl(Pp[0],y+0.35,Pp[1],0.32,0.1,0.7,5,hexc('#4f7a3a'),RECT[T.leaves],false)}}
  // relief on the painted window bays of street fronts: protruding sills, roller-shutter boxes, neoclassical window cornices
  if(front&&nb>0)for(let fl=1;fl<lvB;fl++){const y0=gy+gfh+(fl-1)*fh;for(let k=0;k<nb;k++){const t=bayTile(B,front,fl,k,i);const s0=L*k/nb,w=L/nb;
      if(t===T.win){ebox(N.o,E,s0+0.225*w-0.04,s0+0.775*w+0.04,0,0.07,y0+0.2*fh,y0+0.235*fh,hexc('#efece6'),TM.marble,0,'flrtu');ebox(N.o,E,s0+0.25*w,s0+0.75*w,0,0.05,y0+0.6*fh,y0+0.76*fh,shade(wc,0.97),TM.plaster,0,'flrtu')}
      else if(t===T.neo||t===T.neoC){ebox(N.o,E,s0+0.25*w,s0+0.75*w,0,0.08,y0+0.07*fh,y0+0.1*fh,hexc('#f6f3ec'),TM.marble,0,'flrtu');ebox(N.o,E,s0+0.24*w,s0+0.76*w,0,0.13,y0+0.88*fh,y0+0.93*fh,hexc('#f8f6f1'),TM.plaster,0,'flrtu')}
      else if(t===T.villaW){ebox(N.o,E,s0+0.32*w,s0+0.68*w,0,0.07,y0+0.28*fh,y0+0.31*fh,hexc('#efece6'),TM.marble,0,'flrtu')}}}
  // vertical corner pilaster on street corners of apartment blocks
  if(front&&(B.style==='apt'||B.style==='modern')){const top=B.top;ebox(N.o,E,0,0.32,0,0.06,gy+gfh,top,shade(wc,0.97),TM.plaster,0,'flr')}}

/* a bay with a punched window in a stone / brick / timber wall (buildings described by research): wall pieces, reveals, glass that glows at night, frame and sill */
function punchBay(O,N,E,s0,s1,y0,y1,wc,wt,o,gl,front,B){const w=s1-s0,ww=Math.min(o.winW||1.25,w*0.62),wh=Math.min(o.winH||(y1-y0)*0.58,(y1-y0)-1.0),ys=y0+Math.min(0.95,(y1-y0-wh)*0.62);const c=(s0+s1)/2,a=c-ww/2,b=c+ww/2,yt=ys+wh,dr=0.16;
  eq(O,E,s0,s1,0,y0,ys,wc,wt,s0,s1,y0,ys);eq(O,E,s0,s1,0,yt,y1,wc,wt,s0,s1,yt,y1);eq(O,E,s0,a,0,ys,yt,wc,wt,s0,a,ys,yt);eq(O,E,b,s1,0,ys,yt,wc,wt,b,s1,ys,yt);
  const rv=shade(wc,0.82);ebox(O,E,a,b,-dr,0,ys,yt,rv,wt,0,'');const A=EP(E,a,0),A2=EP(E,a,-dr),Bq=EP(E,b,0),B2=EP(E,b,-dr);
  O.wall(A2[0],A2[1],A[0],A[1],ys,ys,yt,yt,E.ux,E.uz,0,dr,ys,yt,rv,RECT[wt],0);O.wall(Bq[0],Bq[1],B2[0],B2[1],ys,ys,yt,yt,-E.ux,-E.uz,0,dr,ys,yt,rv,RECT[wt],0);
  O.hq([A[0],yt,A[1]],[Bq[0],yt,Bq[1]],[B2[0],yt,B2[1]],[A2[0],yt,A2[1]],[0,0],[ww,0],[ww,dr],[0,dr],rv,RECT[wt],0,true);
  eq(O,E,a,b,-dr,ys,yt,C1,T.office,0.03,0.3,0.06,0.42,gl);ebox(O,E,a-0.06,b+0.06,-0.02,0.07,ys-0.08,ys,hexc(o.sillCol||'#ece8e1'),TM.marble,0,'ftu');
  if(B.detail||B.inF){const fc=hexc(o.frameCol||'#f4f2ec');const F=N.o;ebox(F,E,a,a+0.06,-dr,-dr+0.05,ys,yt,fc,TM.metalL,0,'fr');ebox(F,E,b-0.06,b,-dr,-dr+0.05,ys,yt,fc,TM.metalL,0,'fl');ebox(F,E,c-0.03,c+0.03,-dr,-dr+0.05,ys,yt,fc,TM.metalL,0,'f');
    for(let k=1;k<=(o.panes||2);k++){const yy=ys+wh*k/((o.panes||2)+1);ebox(F,E,a,b,-dr,-dr+0.045,yy-0.02,yy+0.02,fc,TM.metalL,0,'ft')}ebox(F,E,a,b,-dr,-dr+0.05,yt-0.06,yt,fc,TM.metalL,0,'fu');
    if(o.shutters)for(const [p,q] of[[a-ww/2,a],[b,b+ww/2]])ebox(F,E,p,q,0,0.04,ys,yt,hexc(o.shutters),TM.wood,0,'flr')}}
function rectOf(ps,rv){if(!rv)return rv;const ang=rv[4],ux=Math.cos(ang),uz=Math.sin(ang);let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;for(const p of ps){const u=p[0]*ux+p[1]*uz,v=-p[0]*uz+p[1]*ux;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v)}
  const cu=(u0+u1)/2,cv=(v0+v1)/2;return[cu*ux-cv*uz,cu*uz+cv*ux,u1-u0,v1-v0,ang]}
/* flat roofs: stair bulkhead, water heaters (instanced by 50_props.js from ROOFI), AC, antennas */
const ROOFI={solar:[],ac:[],tank:[]};
function roofClutter(B,ch,N){const ps=B.ps,top=B.pent?B.top+B.fh:B.top,h=B.h;let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;for(const p of (B.pent?B.ip:ps)){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}
  const P=B.pent?B.ip:ps;
  if(B.lv>=3&&B.area>90&&!B.pent){for(let k=0;k<6;k++){const x=lerp(minx+2,maxx-2,hf(h*3+k)),z=lerp(minz+2,maxz-2,hf(h*5+k*3));if(!pip(P,x,z)||!pip(P,x+1.5,z+1.5)||!pip(P,x-1.5,z-1.5)||!pip(P,x+1.5,z-1.5)||!pip(P,x-1.5,z+1.5))continue;
      const ang=B.rv?B.rv[4]:0;ch.o.box(x,top+1.3,z,2.6,2.6,2.4,-ang,B.wc,RECT[TM.plaster]);ch.o.box(x,top+2.65,z,2.9,0.1,2.7,-ang,shade(B.wc,1.03),RECT[TM.plaster]);break}}
  let n=0;for(let k=0;k<8&&n<3;k++){const x=lerp(minx+1.2,maxx-1.2,hf(h*9+k)),z=lerp(minz+1.2,maxz-1.2,hf(h*13+k*7));if(!pip(P,x,z))continue;n++;const r=hf(h+k*3);if(r<0.6)ROOFI.solar.push([x,top,z,hf(h)*0.3+Math.PI*0.95]);else ROOFI.ac.push([x,top,z,hf(h+k)*TAU])}
  if(hf(h*31)<0.5){const x=(minx+maxx)/2,z=(minz+maxz)/2;if(pip(P,x,z)){N.o.cyl(x,top,z,0.03,0.03,3.2,4,hexc('#9aa0a6'),RECT[TM.metalL],false);N.o.box(x,top+2.6,z,1.1,0.04,0.04,hf(h)*3,hexc('#9aa0a6'),RECT[TM.metalL]);N.o.box(x,top+2.95,z,0.8,0.04,0.04,hf(h)*3,hexc('#9aa0a6'),RECT[TM.metalL])}}}

function lobby(B,O,N,plates){const E=B.lobby.E,s=B.lobby.s,gy=B.gy;const w=2.5,y1=gy+Math.min(3.1,B.gfh-0.2);
  eq(O,E,s-w/2,s+w/2,0,B.gmin-0.7,gy,shade(B.wc,0.84),TM.plaster,0,w,0,gy);
  eq(O,E,s-w/2,s+w/2,0,gy,y1,C1,T.lobby,0,1,0,1,1);eq(O,E,s-w/2,s+w/2,0,y1,gy+B.gfh,B.hasShop?hexc('#e4ded2'):B.wc,B.hasShop?TM.marbleW:TM.plaster,0,w,y1,gy+B.gfh);
  if(B.detail||B.inF){ebox(N.o,E,s-w/2-0.1,s+w/2+0.1,0,1.0,y1,y1+0.14,hexc('#eeeae2'),TM.concrete,0,'flrtu');ebox(N.o,E,s-w/2,s+w/2,0,0.5,gy-0.15,gy,hexc('#d8d4cc'),TM.marble,0,'flrt')}
  placed('entrance',EP(E,s,0)[0],EP(E,s,0)[1],B.name||'',String(B.i));if(plates&&plates.length)platesAt(B,E,s+w/2+0.35,N,plates)}
/* brass plates of the upper-floor businesses next to the entrance (each one is a real census/OSM business) */
function platesAt(B,E,s,N,list){const gy=B.gy;let k=0;for(const sp of list){const y=gy+1.75-k*0.27;if(y<gy+0.5)break;const P=EP(E,s,0.03);
    ebox(N.o,E,s-0.21,s+0.21,0,0.02,y-0.11,y+0.11,hexc('#c9a54e'),TM.metalL,0,'flrt');const r=labText(sp.name,'sans',30);const Q=EP(E,s,0.026);labQuad(N.lab,r,Q[0],y+0.02,Q[1],E.nx,E.nz,0.08,0.38,hexc('#2a1d0e'),0);
    const r2=labText((sp.cat||'').replace(/_/g,' '),'thin',22);labQuad(N.lab,r2,Q[0],y-0.06,Q[1],E.nx,E.nz,0.05,0.36,hexc('#3a2a14'),0);
    placed('poi',P[0],P[1],sp.name,sp.id||sp.src);BLD.plates.push({name:sp.name,x:P[0],z:P[1],b:B.i,cat:sp.cat,src:sp.src});k++}}

/* blue enamel house-number plates from the OSM addresses (MAP.addr = [x,z dm, number, street, building, osmId]) */
function houseNumbers(){if(!MAP.addr)return;let n=0;for(const a of MAP.addr){const B=BLD.byIdx[a[4]];const x=a[0]/10,z=a[1]/10;if(!B)continue;let best=null,bd=1e9;
    for(const E of B.E){if(E.L<1)continue;const t=clamp(((x-E.a[0])*E.ux+(z-E.a[1])*E.uz)/E.L,0,1);const qx=E.a[0]+E.ux*E.L*t,qz=E.a[1]+E.uz*E.L*t;const d=Math.hypot(x-qx,z-qz)+(B.F[E.i]>0?0:3);if(d<bd){bd=d;best=[E,t*E.L]}}
    if(!best)continue;const [E]=best;let s=clamp(best[1],0.3,E.L-0.3);for(const sh of B.shopsE[E.i])if(s>sh.s0-0.2&&s<sh.s1+0.2)s=(s-sh.s0<sh.s1-s)?sh.s0-0.18:sh.s1+0.18;s=clamp(s,0.15,E.L-0.15);
    const N=bcell(B.cx,B.cz),y=B.gy+2.45,P=EP(E,s,0);ebox(N.o,E,s-0.14,s+0.14,0,0.02,y-0.1,y+0.1,hexc('#1f4e9c'),T.white,0,'flrt');const Q=EP(E,s,0.022);
    labQuad(N.lab,labText(String(a[2]),'sans',30),Q[0],y,Q[1],E.nx,E.nz,0.14,0.24,hexc('#ffffff'),0);placed('addr',P[0],P[1],String(a[2]),a[5]||'');n++}BLD.stats.addr=n}
/* tiled hip roof with eaves, fascia board and ridge */
function hipRoof(O,rv,yb,style,h,o){o=o||{};const [cx,cz,L0,W0,ang]=rv;const e=o.eaves||0.5,L=L0+2*e,W=W0+2*e;const ux=Math.cos(ang),uz=Math.sin(ang),vx=-uz,vz=ux;const rh=o.roofRise||W*0.24;yb-=0.08;
  const P=(u,v)=>[cx+ux*u+vx*v,cz+uz*u+vz*v];const A=P(-L/2,-W/2),B=P(L/2,-W/2),C=P(L/2,W/2),D=P(-L/2,W/2);const rl=Math.max(0,L/2-W/2);const R1=P(-rl,0),R2=P(rl,0);const yr=yb+rh;
  const col=hexc(o.roofCol||['#c9673f','#b85a3a','#d07447','#a95236'][h%4]);const rc=RECT[TM.tiles];const slope=Math.hypot(W/2,rh);
  const up=(p,q,r)=>{const a=[q[0]-p[0],q[1]-p[1]],b=[r[0]-p[0],r[1]-p[1]];return a[1]*b[0]-a[0]*b[1]>0};
  const quadF=(p,q,r,s)=>{if(!up(p,q,r)){[p,q]=[q,p];[r,s]=[s,r]}O.quad([p[0],yb,p[1]],[q[0],yb,q[1]],[r[0],yr,r[1]],[s[0],yr,s[1]],[0,0],[L,0],[L/2+rl,slope],[L/2-rl,slope],col,rc,0)};
  const triF=(p,q,r)=>{if(!up(p,q,r))[p,q]=[q,p];O.tri([p[0],yb,p[1]],[q[0],yb,q[1]],[r[0],yr,r[1]],[0,0],[W,0],[W/2,slope],col,rc,0)};
  quadF(A,B,R2,R1);quadF(C,D,R1,R2);triF(B,C,R2);triF(D,A,R1);
  const fc=hexc('#f1eee7');[[A,B],[B,C],[C,D],[D,A]].forEach(([p,q])=>{const mx=(p[0]+q[0])/2-cx,mz=(p[1]+q[1])/2-cz;const l=Math.hypot(q[0]-p[0],q[1]-p[1]);O.wall(p[0],p[1],q[0],q[1],yb-0.22,yb-0.22,yb+0.02,yb+0.02,mx,mz,0,l,0,0.24,fc,RECT[TM.plaster],0);
    const ml=Math.hypot(mx,mz)||1,ix=mx/ml*e,iz=mz/ml*e;O.hq([p[0],yb-0.22,p[1]],[q[0],yb-0.22,q[1]],[q[0]-ix,yb-0.22,q[1]-iz],[p[0]-ix,yb-0.22,p[1]-iz],[0,0],[l,0],[l,e],[0,e],shade(fc,0.7),RECT[TM.plaster],0,true)});
  if(rl>0.05)O.box((R1[0]+R2[0])/2,yr+0.05,(R1[1]+R2[1])/2,rl*2+0.2,0.14,0.22,-ang,shade(col,0.85),RECT[TM.tiles]);
  if(o.chimney){const p=P(L*0.18,W*0.12);O.box(p[0],yb+rh*0.75+0.6,p[1],0.6,1.6,0.6,-ang,hexc('#e8e2d6'),RECT[TM.plaster]);O.box(p[0],yb+rh*0.75+1.45,p[1],0.75,0.1,0.75,-ang,hexc('#cfc8bb'),RECT[TM.plaster])}}

/* ============================== landmarks ============================== */
function agoraTurrets(ch,ps,gy,top,E){// the white Kifisia Agora: two round towers with red-tile cornices and pointed conical metal roofs with finials
  let best=0,bi=0;for(let i=0;i<ps.length;i++){const a=ps[i],c=ps[(i+1)%ps.length];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L>best){best=L;bi=i}}
  const a=ps[bi],c=ps[(bi+1)%ps.length];const O=ch.o;for(const p of[a,c]){const r=2.7,h1=top-gy+1.4;O.cyl(p[0],gy-0.6,p[1],r+0.08,r+0.08,1.2,20,hexc('#e9e2d2'),RECT[TM.ashlar],false,0,1);O.cyl(p[0],gy+0.6,p[1],r,r,h1-0.6,20,hexc('#f7f5ef'),RECT[T.neo],false,0,0.3);
    for(let k=0;k<6;k++){const an=k/6*TAU+0.3,wx=p[0]+Math.cos(an)*(r+0.03),wz=p[1]+Math.sin(an)*(r+0.03);const nx=Math.cos(an),nz=Math.sin(an);const ux=-nz,uz=nx;const x0=wx-ux*0.55,z0=wz-uz*0.55,x1=wx+ux*0.55,z1=wz+uz*0.55;
      O.wall(x0,z0,x1,z1,gy+0.9,gy+0.9,gy+3.6,gy+3.6,nx,nz,0,1,0,1,C1,RECT[T.neoDoor],1)}
    const yc=gy+h1;O.cyl(p[0],yc,p[1],r+0.35,r+0.35,0.28,20,hexc('#f7f5ef'),RECT[TM.plaster],false);O.cyl(p[0],yc+0.28,p[1],r+0.45,r+0.2,0.35,20,hexc('#b5532f'),RECT[TM.tiles],false);
    O.cyl(p[0],yc+0.6,p[1],r+0.1,0.12,3.6,20,hexc('#a88f5c'),RECT[TM.metalL],true);O.cyl(p[0],yc+4.15,p[1],0.12,0.0,0.9,8,hexc('#c9a24a'),RECT[TM.metalL],true);O.cyl(p[0],yc+4.25,p[1],0.16,0.16,0.14,8,hexc('#c9a24a'),RECT[TM.metalL],true);addBoxC(p[0],p[1],2.5,'b')}}
function churchDome(ch,rv,top,h){if(!rv)return;const [cx,cz,L,W,ang]=rv;const O=ch.o;const r=Math.min(W,L)*0.22;const y=top+Math.min(W,L)*0.23;O.cyl(cx,top-0.5,cz,r*1.05,r*1.05,y-top+1.3,16,hexc('#efe4cf'),RECT[T.church],false,1,0.4);
  for(let k=0;k<6;k++){const r0=r*Math.cos(k/6*Math.PI/2),r1=r*Math.cos((k+1)/6*Math.PI/2),y0=y+0.8+r*Math.sin(k/6*Math.PI/2),y1=y+0.8+r*Math.sin((k+1)/6*Math.PI/2);O.cyl(cx,y0,cz,r0,r1,y1-y0,16,hexc('#bf5f3c'),RECT[TM.tiles],k===5)}
  O.box(cx,y+0.8+r+0.5,cz,0.08,1.0,0.08,-ang,hexc('#c9a24a'),RECT[TM.metalL]);O.box(cx,y+0.8+r+0.75,cz,0.5,0.08,0.08,-ang,hexc('#c9a24a'),RECT[TM.metalL]);
  const ux=Math.cos(ang),uz=Math.sin(ang);const tx=cx-ux*(L/2-1.8),tz=cz-uz*(L/2-1.8);// bell tower on the west front
  O.box(tx,top+2.8,tz,3.0,5.6,3.0,-ang,hexc('#efe4cf'),RECT[TM.plasterW]);for(let s=0;s<4;s++){const an=-ang+s*Math.PI/2;const fx=Math.sin(an+Math.PI/2),fz=Math.cos(an+Math.PI/2);O.wall(tx+fx*1.51-fz*0.6,tz+fz*1.51+fx*0.6,tx+fx*1.51+fz*0.6,tz+fz*1.51-fx*0.6,top+3.4,top+3.4,top+5.0,top+5.0,fx,fz,0,1,0,1,C1,RECT[T.church],0)}
  O.box(tx,top+5.75,tz,3.4,0.3,3.4,-ang,hexc('#f6f0e2'),RECT[TM.plaster]);O.cyl(tx,top+5.9,tz,1.5,0.18,2.0,8,hexc('#bf5f3c'),RECT[TM.tiles],true);O.box(tx,top+8.2,tz,0.08,0.9,0.08,-ang,hexc('#c9a24a'),RECT[TM.metalL])}
function stationFront(ch,ps,gy,top,edges){// Kifisia ISAP station: yellow, white pilasters, portico with pediment, clock and the ΗΣΑΠ sign
  let bi=0,bd=-1;for(let i=0;i<ps.length;i++){const a=ps[i],c=ps[(i+1)%ps.length];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);const nx=(c[1]-a[1])/L,nz=-(c[0]-a[0])/L;const score=L*(1+(nx*0.3-nz));if(score>bd){bd=score;bi=i}}
  const a=ps[bi],c=ps[(bi+1)%ps.length];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);const nx=(c[1]-a[1])/L,nz=-(c[0]-a[0])/L;const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;const O=ch.o;const y=gy;
  const E={a,c,ux:(c[0]-a[0])/L,uz:(c[1]-a[1])/L,nx,nz,L};const yel=hexc('#e7bf55'),wh=hexc('#f6f2e8');
  for(let s=0;s<=L+0.01;s+=Math.max(2.5,L/Math.round(L/3.2)))ebox(O,E,clamp(s-0.22,0,L),clamp(s+0.22,0,L),0,0.1,y-0.3,top,wh,TM.plaster,0,'flrt');
  ebox(O,E,0,L,0,0.18,top-0.45,top,wh,TM.plaster,0,'ftu');const m=L/2;ebox(O,E,m-2.6,m+2.6,0,1.3,y,y+6.6,yel,TM.plaster,0,'flrt');
  ebox(O,E,m-2.75,m+2.75,0,1.45,y+6.6,y+6.95,wh,TM.plaster,0,'flrtu');for(const o of[-2.35,-0.9,0.9,2.35])ebox(O,E,m+o-0.2,m+o+0.2,1.3,1.42,y,y+6.6,wh,TM.plaster,0,'flrt');
  const p0=EP(E,m-2.75,1.45),p1=EP(E,m+2.75,1.45),pt=EP(E,m,1.45);O.tri([p0[0],y+6.95,p0[1]],[p1[0],y+6.95,p1[1]],[pt[0],y+8.3,pt[1]],[0,0],[5.5,0],[2.75,1.35],wh,RECT[TM.plaster],0);
  const q0=EP(E,m-2.75,0),q1=EP(E,m+2.75,0),qt=EP(E,m,0);O.quad([p0[0],y+6.95,p0[1]],[pt[0],y+8.3,pt[1]],[qt[0],y+8.3,qt[1]],[q0[0],y+6.95,q0[1]],[0,0],[1,0],[1,1],[0,1],hexc('#b5532f'),RECT[TM.tiles],0);
  O.quad([pt[0],y+8.3,pt[1]],[p1[0],y+6.95,p1[1]],[q1[0],y+6.95,q1[1]],[qt[0],y+8.3,qt[1]],[0,0],[1,0],[1,1],[0,1],hexc('#b5532f'),RECT[TM.tiles],0);
  eq(O,E,m-1.1,m+1.1,1.31,y,y+3.2,C1,T.neoDoor,0,1,0,1,1);
  signAt(ch,mx+nx*1.47,y+5.0,mz+nz*1.47,nx,nz,3.8,0.9,'station',1);signAt(ch,pt[0]+nx*0.02,y+7.45,pt[1]+nz*0.02,nx,nz,0.75,0.75,'clock',1);
  STATION.front={x:mx+nx*3,z:mz+nz*3,nx,nz}}

/* ============================== main entry ============================== */
/* building descriptions → overrides (B.ovr). Sources, best first: shops.json "building" (research, photo/description), OSM tags on the map record (b[11]),
   and later gk3/data/buildings_spec.json (research-arch) when it exists. Every override records its source in B.ovr.src (docs/BUILDINGS_IMPL.md table). */
const HEX=/#[0-9a-f]{6}/i;
function specToOvr(ov,b,src){const t=((b.facade||'')+' '+(b.balconies||'')+' '+(b.windows||'')+' '+(b.roof||'')+' '+(b.note||'')).toLowerCase();
  if(b.floors)ov.floors=b.floors;if(b.heightM)ov.heightM=b.heightM;if(b.eavesM)ov.eavesM=b.eavesM;if(b.colour)ov.colour=b.colour;if(b.raisedGroundM)ov.raise=b.raisedGroundM;
  if(b.roof){const r=b.roof.toLowerCase();ov.roof=/hip|gable|pitch|tile/.test(r)?'hip':'flat';const m=HEX.exec(b.roof);if(m)ov.roofCol=m[0];if(/chimney/.test(r))ov.chimney=true}
  if(/ashlar|limestone|stone/.test(b.facade||''))ov.wallMat='stone';if(/timber|wood/.test((b.facade||'').split(/first floor|upper/i)[1]||''))ov.upperMat='wood';if(/brick/.test(b.facade||'')&&!ov.wallMat)ov.groundMat='brick';
  if(/neoclassical|neo-classical/.test(t))ov.style='neo';
  ov.balcony=/balustrade|baluster/.test(t)?'balu':/timber balcony|wooden balcony/.test(t)?'wood':/glass/.test(b.balconies||'')?'glass':/iron|railing/.test(b.balconies||'')?'iron':ov.balcony;
  if(/set back|setback/.test(t))ov.setback=true;if(/quoin/.test(t))ov.quoins=true;if(/string course|cornice band/.test(t)){const m=/string course[^#]*(#[0-9a-f]{6})/i.exec(b.facade||'');ov.stringCourse=m?m[1]:'#ece8e1'}
  if(/shutter/.test(b.windows||''))ov.shutters='#3d6a4e';if(/small panes|small-paned|lights\)/.test(t))ov.panes=3;if(/white/.test(b.windows||''))ov.frameCol='#f4f2ec';else if(/timber|dark/.test(b.windows||''))ov.frameCol='#5a3d2a';
  ov.noPent=true;ov.src=src}
function applyBuildingSpecs(){
  for(const B of BLD.list){const tg=B.tags||{},ov=B.ovr;// OSM tags first (lowest priority: overwritten below)
    if(tg.colour){try{const c=new THREE.Color(tg.colour);ov.colour='#'+c.getHexString();ov.src='osm'}catch(e){}}
    if(tg.material){const m=String(tg.material);if(/stone/.test(m))ov.wallMat='stone';else if(/brick/.test(m))ov.wallMat='brick';else if(/wood/.test(m))ov.upperMat='wood';ov.src='osm'}
    if(tg.roofShape){ov.roof=/hip|gable|pyramid|half/.test(tg.roofShape)?'hip':tg.roofShape==='flat'?'flat':ov.roof;if(tg.roofColour){try{ov.roofCol='#'+new THREE.Color(tg.roofColour).getHexString()}catch(e){}}ov.src=ov.src||'osm'}
    if(tg.height&&+tg.height>2)ov.heightM=+tg.height}
  for(const B of BLD.list)for(const segs of B.shopsE)for(const o of segs){const sp=o.sp,b=sp.building;
    if(b){let tB=B;if(typeof b.mapBuilding==='number'&&BLD.byIdx[b.mapBuilding])tB=BLD.byIdx[b.mapBuilding];specToOvr(tB.ovr,b,'research:'+sp.name)}
    if(sp.special==='mythos'){const ov=B.ovr;ov.colour=ov.colour||SPECIALSPEC.mythos.facade;ov.gfh=4.6;ov.floors=ov.floors||2;ov.heightM=ov.heightM||8.5;ov.noPent=true}}
  if(BDATA.shops)for(const r of BDATA.shops.shops){const b=r.building;if(!b||typeof b.mapBuilding!=='number')continue;const B=BLD.byIdx[b.mapBuilding];if(B&&!B.ovr.src)specToOvr(B.ovr,b,'research:'+r.name)}
  if(typeof archApplyAll==='function')archApplyAll();
  for(const B of BLD.list){if(B.P)continue;const ov=B.ovr;if(ov.style)B.style=ov.style;if(ov.floors)B.lv=ov.floors}}
function buildBuildings(){const t0=performance.now();BLD.byIdx=[];
  /* indices are those of the full MAP.buildings (MAP.pois / MAP.special refer to them): 89_landmarks.js may hand us a filtered list, so use b._i set by bldLoad() */
  BLD.excluded=new Set();if(BLD.nAll&&MAP.buildings.length&&MAP.buildings[0]._i!=null){const seen=new Set(MAP.buildings.map(b=>b._i));for(let i=0;i<BLD.nAll;i++)if(!seen.has(i))BLD.excluded.add(i)}
  MAP.buildings.forEach((b,k)=>{const i=b._i!=null?b._i:k;const B=prepBuilding(b,i);BLD.byIdx[i]=B;if(B)BLD.list.push(B)});
  allocateShops();applyBuildingSpecs();for(const B of BLD.list){if(B.P)archHeights(B);else bldHeights(B)}
  for(const B of BLD.list){if(B.P)buildShellP(B);else buildShell(B);if(B.rv)placed('building',B.rv[0],B.rv[1],B.name||'',(B.tags&&B.tags.id)||('b'+B.i))}
  houseNumbers();
  Object.assign(BLD.stats,{buildings:BLD.list.length,shops:BLD.shops.length,plates:BLD.plates.length,unplaced:BLD.unplaced.length,ms:Math.round(performance.now()-t0),labelRows:LAB.y,labels:LAB.n,labelFull:LAB.full,arch:typeof ARCH!=='undefined'?{n:ARCH.n,matched:ARCH.matched,src:ARCH.src,cls:ARCH.cls,openings:ARCH.nOpen}:null});
  bldFinalize();console.log('[buildings] '+JSON.stringify(BLD.stats));window.__bld=BLD}
function bldFinalize(){labFinish();BGLASS=new THREE.MeshStandardMaterial({color:0x9fb2ba,roughness:0.05,metalness:0.2,transparent:true,opacity:0.22,depthWrite:false,side:THREE.DoubleSide});if(typeof useEnv==='function')useEnv(BGLASS);
  for(const c of BCELLS.values()){const add=(G,mat,sh)=>{if(!G.size())return;const m=new THREE.Mesh(G.build(),mat);m.castShadow=!!sh;m.receiveShadow=true;m.visible=false;scene.add(m);c.meshes.push(m)};
    add(c.o,MAT.atlas,true);add(c.cut,MAT.cut,false);add(c.gl,BGLASS,false);if(LABMAT)add(c.lab,LABMAT,false);
    if(c.shut.size()){const m=new THREE.Mesh(c.shut.build(),MAT.atlas);m.receiveShadow=true;m.visible=false;scene.add(m);c.shutM=m}if(c.far.size()){const m=new THREE.Mesh(c.far.build(),MAT.atlas);m.castShadow=true;m.receiveShadow=true;m.visible=true;scene.add(m);c.farM=m}c.o=c.cut=c.gl=c.lab=c.shut=c.far=null}
  if(typeof facFinalize==='function')facFinalize();
  if(typeof updateChunkVis==='function'&&!updateChunkVis._bld){const f=updateChunkVis;updateChunkVis=function(cx,cz){f(cx,cz);bldVis(cx,cz)};updateChunkVis._bld=true}}

/* ---------- legacy 2D sign atlas (kept for other modules: walls, props, rail use newSlot/signAt) ---------- */
const SG=2048,signC=document.createElement('canvas');signC.width=signC.height=SG;const sgx=signC.getContext('2d');let signSlot=0;const SLOT_W=256,SLOT_H=64,SPECIAL_SLOTS={};
function slotRect(x,y,w,h){return[(x+3)/SG,1-(y+h-3)/SG,(w-6)/SG,(h-6)/SG]}
function drawSign(x,y,w,h,text,bg,fg,style){const g=sgx;g.fillStyle=bg;g.fillRect(x,y,w,h);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  if(style==='station'){g.fillStyle='#fff';g.fillRect(x+4,y+4,w-8,h-8);g.fillStyle='#1f3c8f';g.font=`bold ${h*0.36}px Arial`;g.textAlign='center';g.fillText('ΗΣΑΠ  ΚΗΦΙΣΙΑ',x+w/2,y+h*0.47);g.font=`bold ${h*0.26}px Arial`;g.fillText('KIFISSIA',x+w/2,y+h*0.82);g.restore();return}
  if(style==='clock'){g.fillStyle='#f6f2e8';g.fillRect(x,y,w,h);g.fillStyle='#fff';g.beginPath();g.arc(x+w/2,y+h/2,h*0.44,0,TAU);g.fill();g.strokeStyle='#222';g.lineWidth=3;g.stroke();for(let k=0;k<12;k++){const a=k/12*TAU;g.beginPath();g.moveTo(x+w/2+Math.cos(a)*h*0.36,y+h/2+Math.sin(a)*h*0.36);g.lineTo(x+w/2+Math.cos(a)*h*0.41,y+h/2+Math.sin(a)*h*0.41);g.stroke()}g.beginPath();g.moveTo(x+w/2,y+h/2);g.lineTo(x+w/2,y+h*0.16);g.moveTo(x+w/2,y+h/2);g.lineTo(x+w*0.74,y+h/2);g.stroke();g.restore();return}
  if(style==='street'){g.fillStyle='#1d4f9a';g.fillRect(x,y,w,h);g.strokeStyle='#fff';g.lineWidth=2;g.strokeRect(x+3,y+3,w-6,h-6);g.fillStyle='#fff';g.textAlign='center';g.font=`bold ${h*0.34}px Arial`;g.fillText(text[0],x+w/2,y+h*0.45,w-12);g.font=`bold ${h*0.24}px Arial`;g.fillText(text[1],x+w/2,y+h*0.8,w-12);g.restore();return}
  if(style==='stop'){g.fillStyle='#c8102e';g.fillRect(x,y,w,h);g.fillStyle='#fff';g.textAlign='center';g.font=`bold ${h*0.4}px Arial`;g.fillText('STOP',x+w/2,y+h*0.64);g.restore();return}
  if(style==='board'){g.fillStyle='#0b1d4a';g.fillRect(x,y,w,h);g.fillStyle='#ffb000';g.font=`bold ${h*0.3}px Arial`;g.textAlign='left';g.fillText('1  ΠΕΙΡΑΙΑΣ',x+10,y+h*0.42);g.fillText('1  PIRAEUS',x+10,y+h*0.82);g.textAlign='right';g.fillText(text,x+w-10,y+h*0.62);g.restore();return}
  g.fillStyle=fg;let fs=Math.floor(h*0.52);g.font=`bold ${fs}px ${style==='mythos'||style==='paul'?'Georgia,serif':'Arial,Helvetica,sans-serif'}`;g.textAlign='center';g.textBaseline='middle';while(g.measureText(text).width>w-14&&fs>12){fs-=2;g.font=`bold ${fs}px Arial`}
  g.fillText(text,x+w/2,y+h/2+2);g.restore()}
let bigSlot=0;function newSlot(text,bg,fg,style,big){if(big){const idx=bigSlot++;if(idx>=8)return null;const x=(idx%4)*512,y=Math.floor(idx/4)*128;drawSign(x,y,512,128,text,bg,fg,style);return slotRect(x,y,512,128)}
  const s=32+signSlot++;if(s>=8*32)return null;const x=(s%8)*SLOT_W,y=Math.floor(s/8)*SLOT_H;drawSign(x,y,SLOT_W,SLOT_H,text,bg,fg,style);return slotRect(x,y,SLOT_W,SLOT_H)}
const BRANDS={paul:['PAUL','#20302a','#f2d27a'],mythos:['mythos plus','#141416','#f5b81c'],starbucks:['STARBUCKS COFFEE','#00704a','#ffffff'],kfc:['KFC','#c8102e','#ffffff'],super:['ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ','#ffffff','#d0021b'],station:['','#fff','#1f3c8f'],clock:['','#fff','#000']};
function brandSlot(k){if(!(k in SPECIAL_SLOTS)){const b=BRANDS[k];SPECIAL_SLOTS[k]=b?newSlot(b[0],b[1],b[2],k,true):null}return SPECIAL_SLOTS[k]}
function signAt(ch,x,y,z,nx,nz,w,h,key,glow,rc){rc=rc||brandSlot(key);if(!rc)return;const ux=-nz,uz=nx;const a=[x-ux*w/2,z-uz*w/2],b=[x+ux*w/2,z+uz*w/2];
  ch.sg.wall(a[0],a[1],b[0],b[1],y-h/2,y-h/2,y+h/2,y+h/2,nx,nz,0.002,0.998,0.002,0.998,C1,rc,glow)}
/* legacy: a map shop record [edge,t,name,bg,fg,kind] as a flat fascia sign on an edge (no longer used by this module) */
function addSign(ch,a,c,nx,nz,L,s,gy){const [ei,t,name,bg,fg,kind]=s;const px=a[0]+(c[0]-a[0])*t+nx*0.09,pz=a[1]+(c[1]-a[1])*t+nz*0.09;const rc=newSlot(name,bg,fg,kind,false);if(!rc)return;const w=clamp(name.length*0.26+1.0,2.2,Math.min(6,L*0.9));signAt(ch,px,gy+3.55,pz,nx,nz,w,0.62,null,1,rc)}
