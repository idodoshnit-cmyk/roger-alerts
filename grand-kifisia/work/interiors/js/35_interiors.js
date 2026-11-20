'use strict';
/* Grand Kifisia — walk-in shop interiors: Mythos Plus, PAUL, Starbucks, KFC, AB Vasilopoulos.
   Public interface (see docs/INTERIORS.md): INTERIORS, buildInteriors(), enterInterior(k), exitInterior(), updateInteriors(dt),
   interiorFocus(), drawInteriorMap(ctx,W); flag player.interior (key or null).
   Each interior is a closed "cell" far outside the map (x,z >= 3200 where terr() is constant), authored in LOCAL coordinates:
   origin = centre of the street door on the inner face of the front wall, +z = out to the street (the real door normal), -z = into the shop,
   +x = right-hand side when you walk in. The cell group is rotated so the compass orientation equals the real shopfront.
   The module is self-contained on purpose (own geometry builder IB, own texture atlas, own materials, own light rig) so that it keeps working while
   the world materials / sky / characters / HUD are being rewritten by other modules. It only relies on: scene, renderer, camera, player, terr(),
   addSeg(), INTER, SPECIAL, Ped, subtitle()/objective()/sfx()/openShop() (all feature-detected). */

/* ============================== REGISTRY & STATE ============================== */
const INTERIORS={};
const IN={KEYS:['mythos','paul','starbucks','kfc','super'],X0:3200,Z0:3200,STEP:400,busy:false,ret:null,root:null,tex:{},mat:{},img:{},
  U:{glow:{value:2.4},day:{value:new THREE.Color(1,1,1)},nite:{value:0},pnight:{value:0}},S:{on:false,vis:[],lit:[]},pts:[],hemi:null,amb:null,
  clock:0,lastT:0,errs:0,raw:false,stats:{},portal:null,cfg:{portalDoor:true,people:true,capture:true}};

/* colours: authored as sRGB hex, converted to linear because vertex colours are multiplied in linear space */
const _ihx={};
function ihx(h){let c=_ihx[h];if(!c){const n=parseInt(h.slice(1),16);c=_ihx[h]=[Math.pow((n>>16&255)/255,2.2),Math.pow((n>>8&255)/255,2.2),Math.pow((n&255)/255,2.2)]}return c}
const imul=(c,f)=>[c[0]*f,c[1]*f,c[2]*f];
const IWH=[1,1,1];
const iss=t=>t<=0?0:t>=1?1:t*t*(3-2*t);

/* ============================== TEXTURE ATLAS (own; 2048², 8x8 cells of 256 px, 8 px wrap gutter) ==============================
   Offline part (photo/procedural materials with normal + gloss) ships as interiors/tiles_c.jpg + interiors/tiles_n.jpg (built by the pipeline in
   work/interiors/tools/build_atlas.py from CC0 Poly Haven textures); the runtime part (labels, packaging, food sheets) is painted with canvas.
   If the images are missing every tile falls back to a flat colour, so the interior still works. */
const IT={},IT_AT=2048,IT_TS=256,IT_PAD=8;
function itDef(name,col,row,span,m,fb,gl){const s=IT_TS*span,inn=s-2*IT_PAD,x=col*IT_TS+IT_PAD,y=row*IT_TS+IT_PAD;
  IT[name]={name,rc:[x/IT_AT,1-(y+inn)/IT_AT,inn/IT_AT,inn/IT_AT],m,px:[x,y,inn],cell:[col*IT_TS,row*IT_TS,s],fb,gl}}
[/* name, col,row, span, metres per repeat, fallback colour, gloss */
 ['floorA',0,0,2,1.2,'#b8b1a5',0.6],['floorChk',2,0,2,0.9,'#8a8780',0.7],['floorWood',4,0,2,1.7,'#a9824f',0.4],['floorSup',6,0,2,1.2,'#d2cdc2',0.75],
 ['quarry',0,2,1,0.6,'#8a4a35',0.35],['subway',1,2,1,0.6,'#ecebe6',0.85],['plaster',2,2,1,1.0,'#e6e3dc',0.06],['ceil',3,2,1,1.2,'#e9e8e3',0.03],
 ['steel',4,2,1,0.8,'#b4b7ba',0.8],['chrome',5,2,1,0.3,'#d5d8dc',1.0],['oak',6,2,1,1.2,'#c39a62',0.3],['walnut',7,2,1,1.2,'#6e4a2c',0.35],
 ['blackwood',0,3,1,1.2,'#1c1b1a',0.35],['darkwood',1,3,1,0.6,'#3a271a',0.4],['marble',2,3,1,0.9,'#e4e1da',0.8],['terrazzo',3,3,1,0.8,'#cfc8ba',0.6],
 ['concrete',4,3,1,1.5,'#9d9a94',0.3],['leather',5,3,1,0.4,'#6b3f22',0.5],['vinyl',6,3,1,0.3,'#e8e6e1',0.55],['fabric',7,3,1,0.25,'#d9d6cf',0.02],
 ['rubber',0,4,1,0.4,'#222324',0.15],['plywood',1,4,1,0.5,'#c9a877',0.2],['wicker',2,4,1,0.2,'#b98d55',0.15],['flat',3,4,1,1,'#ffffff',0.08],
 ['gloss',4,4,1,1,'#ffffff',0.9],['grill',5,4,1,0.5,'#2b2a29',0.55],['meatP',6,4,1,0.5,'#8a4f2c',0.5],['meatC',7,4,1,0.5,'#b98148',0.5],
 ['crust',0,5,1,0.25,'#c98f45',0.25],['fried',1,5,1,0.15,'#c2853a',0.3],['fries',2,5,1,0.2,'#e2b450',0.3],['chunky',3,5,1,0.12,'#f2f0ea',0.35],
 ['leaf',4,5,1,0.3,'#3f6a2c',0.2],['cardboard',5,5,1,0.5,'#b99668',0.05],['louvre',6,5,1,0.3,'#9da1a4',0.6],['slat',7,5,1,0.4,'#b48a55',0.25],
 /* runtime-painted sheets */
 ['lblA',0,6,1,1,'#cfcfcf',0.3],['lblB',1,6,1,1,'#cfcfcf',0.3],['lblC',2,6,1,1,'#cfcfcf',0.3],['lblD',3,6,1,1,'#cfcfcf',0.3],
 ['bottles',4,6,1,1,'#cfcfcf',0.7],['pastry',5,6,1,1,'#d9b77a',0.3],['misc',6,6,1,1,'#bbbbbb',0.3],['paper',7,6,1,0.3,'#f1ede4',0.05],
 ['r0',0,7,1,1,'#bbbbbb',0.3],['r1',1,7,1,1,'#bbbbbb',0.3],['r2',2,7,1,1,'#bbbbbb',0.3],['r3',3,7,1,1,'#bbbbbb',0.3]
].forEach(a=>itDef(...a));
/* sub-tile i of an n x n sheet (labels): its own rect so it can repeat on its own */
const _itSub={};
function itSub(name,n,i,m){const k=name+n+'_'+i;let s=_itSub[k];if(!s){const t=IT[name],cs=t.px[2]/n,cx=i%n,cy=Math.floor(i/n),ins=3;const x=t.px[0]+cx*cs+ins,y=t.px[1]+cy*cs+ins,w=cs-2*ins;
  s=_itSub[k]={name:k,rc:[x/IT_AT,1-(y+w)/IT_AT,w/IT_AT,w/IT_AT],m:m||1,px:[x,y,w],sub:[t.px[0]+cx*cs,t.px[1]+cy*cs,cs]}}return s}
function inLoadImages(){if(IN.img.started)return;IN.img.started=true;IN.img.n=0;const done=()=>{if(++IN.img.n===2){IN.img.ok=IN.img.c.naturalWidth>0&&IN.img.g.naturalWidth>0;IN.img.done=true;if(IN.cv)inCompose()}};
  for(const k of['c','g']){const im=new Image();im.onload=done;im.onerror=done;im.src='interiors/tiles_'+(k==='c'?'c':'n')+'.jpg';IN.img[k]=im}}
function inAtlas(){if(IN.cv)return;IN.cv=document.createElement('canvas');IN.cv.width=IN.cv.height=IT_AT;IN.cn=document.createElement('canvas');IN.cn.width=IN.cn.height=IT_AT/2;
  IN.tex.c=new THREE.CanvasTexture(IN.cv);IN.tex.c.encoding=THREE.sRGBEncoding;IN.tex.c.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());IN.tex.c.minFilter=THREE.LinearMipmapLinearFilter;
  IN.tex.n=new THREE.CanvasTexture(IN.cn);IN.tex.n.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());IN.tex.n.minFilter=THREE.LinearMipmapLinearFilter;inCompose()}
function inCompose(){const g=IN.cv.getContext('2d'),gn=IN.cn.getContext('2d');
  for(const k in IT){const t=IT[k],c=t.cell;g.fillStyle=t.fb;g.fillRect(c[0],c[1],c[2],c[2]);gn.fillStyle=`rgb(128,128,${Math.round(t.gl*255)})`;gn.fillRect(c[0]/2,c[1]/2,c[2]/2,c[2]/2)}
  if(IN.img.ok){g.drawImage(IN.img.c,0,0,IT_AT,IT_AT);gn.drawImage(IN.img.g,0,0,IT_AT/2,IT_AT/2)}
  inPaintRuntime(g,gn);IN.tex.c.needsUpdate=true;IN.tex.n.needsUpdate=true}
/* paint one runtime tile: fn(ctx,S) draws on an S x S scratch canvas; stamped 3x3 into the cell so the gutter wraps */
let _itTmp=null;
function itPaint(g,gn,name,fn,gloss){const t=IT[name],S=t.px[2];if(!_itTmp){_itTmp=document.createElement('canvas')}_itTmp.width=_itTmp.height=S;const tg=_itTmp.getContext('2d');tg.clearRect(0,0,S,S);fn(tg,S);
  const c=t.cell;g.save();g.beginPath();g.rect(c[0],c[1],c[2],c[2]);g.clip();for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)g.drawImage(_itTmp,t.px[0]+ox*S,t.px[1]+oy*S);g.restore();
  gn.fillStyle=`rgb(128,128,${Math.round((gloss==null?t.gl:gloss)*255)})`;gn.fillRect(c[0]/2,c[1]/2,c[2]/2,c[2]/2)}

/* ============================== MATERIALS ============================== */
function inLitMat(cut){const m=new THREE.MeshPhongMaterial({map:IN.tex.c,normalMap:IN.tex.n,vertexColors:true,shininess:46,side:cut?THREE.DoubleSide:THREE.FrontSide});
  m.specular.setRGB(0.36,0.36,0.36);m.fog=false;m.normalScale.set(1,1);
  m.onBeforeCompile=sh=>{sh.uniforms.uGlow=IN.U.glow;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aRect;attribute float aGlow;varying vec4 vRect;varying float vGlow;').replace('#include <uv_vertex>','#include <uv_vertex>\nvRect=aRect;vGlow=aGlow;');
    const s=(t)=>GL2?`textureGrad(${t},auv,adx,ady)`:`texture2D(${t},auv)`;
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 vRect;varying float vGlow;uniform float uGlow;')
      .replace('#include <map_fragment>',`vec2 auv=vRect.xy+fract(vUv)*vRect.zw;vec2 adx=dFdx(vUv)*vRect.zw,ady=dFdy(vUv)*vRect.zw;vec4 texel=${s('map')};vec4 ngl=${s('normalMap')};diffuseColor.rgb*=texel.rgb;${cut?'if(texel.a<0.5)discard;':''}`)
      .replace('#include <specularmap_fragment>','float specularStrength=ngl.b*ngl.b;')
      .replace('#include <normal_fragment_maps>','vec3 mapN=vec3((ngl.xy*2.0-1.0)*normalScale,0.0);mapN.z=sqrt(max(0.0,1.0-dot(mapN.xy,mapN.xy)));normal=perturbNormal2Arb(-vViewPosition,normal,mapN,faceDirection);')
      .replace('#include <lights_phong_fragment>','#include <lights_phong_fragment>\nmaterial.specularShininess=shininess*(0.25+2.6*ngl.b);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vGlow*uGlow;')};
  m.customProgramCacheKey=()=>cut?'gkInCut':'gkInLit';return m}
/* unlit boards / screens / light boxes / daylight panels. aGlow: 0 = constant, 1 = multiplied by the daylight colour, 0.5 = night-only */
function inGlowMat(){const m=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,fog:false});
  m.onBeforeCompile=sh=>{sh.uniforms.uDay=IN.U.day;sh.uniforms.uNite=IN.U.nite;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aGlow;varying float vGlow;').replace('#include <uv_vertex>','#include <uv_vertex>\nvGlow=aGlow;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGlow;uniform vec3 uDay;uniform float uNite;')
      .replace('#include <color_fragment>','#include <color_fragment>\nif(vGlow>0.75)diffuseColor.rgb*=uDay;else if(vGlow>0.25)diffuseColor.rgb*=uNite;')};
  m.customProgramCacheKey=()=>'gkInGlow';return m}
function inMaterials(){if(IN.mat.lit)return;inAtlas();IN.mat.lit=inLitMat(false);IN.mat.cut=inLitMat(true);
  IN.mat.glass=new THREE.MeshPhongMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:0.17,shininess:140,side:THREE.DoubleSide,depthWrite:false});IN.mat.glass.specular.setRGB(0.9,0.9,0.9);IN.mat.glass.fog=false}

/* ============================== GEOMETRY BUILDER (local coordinates, transform stack, smooth normals) ============================== */
class IB{constructor(){this.p=[];this.n=[];this.u=[];this.c=[];this.r=[];this.g=[];this.i=[];this.vc=0;this.m=[1,0,0,0,1,0,0,0,1,0,0,0];this.st=[]}
  static mul(a,b){return[a[0]*b[0]+a[1]*b[3]+a[2]*b[6],a[0]*b[1]+a[1]*b[4]+a[2]*b[7],a[0]*b[2]+a[1]*b[5]+a[2]*b[8],a[3]*b[0]+a[4]*b[3]+a[5]*b[6],a[3]*b[1]+a[4]*b[4]+a[5]*b[7],a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6],a[6]*b[1]+a[7]*b[4]+a[8]*b[7],a[6]*b[2]+a[7]*b[5]+a[8]*b[8],a[0]*b[9]+a[1]*b[10]+a[2]*b[11]+a[9],a[3]*b[9]+a[4]*b[10]+a[5]*b[11]+a[10],a[6]*b[9]+a[7]*b[10]+a[8]*b[11]+a[11]]}
  /* push a local frame: translate, then rotate about Y (ry), X (rx) or Z (rz) */
  push(x,y,z,ry,rx,rz){this.st.push(this.m);let l=[1,0,0,0,1,0,0,0,1,x||0,y||0,z||0];
    if(ry){const c=Math.cos(ry),s=Math.sin(ry);l=IB.mul(l,[c,0,s,0,1,0,-s,0,c,0,0,0])}if(rx){const c=Math.cos(rx),s=Math.sin(rx);l=IB.mul(l,[1,0,0,0,c,-s,0,s,c,0,0,0])}if(rz){const c=Math.cos(rz),s=Math.sin(rz);l=IB.mul(l,[c,-s,0,s,c,0,0,0,1,0,0,0])}
    this.m=IB.mul(this.m,l);return this}
  pop(){this.m=this.st.pop();return this}
  v(x,y,z,nx,ny,nz,u,w,col,t,gl){const m=this.m;this.p.push(m[0]*x+m[1]*y+m[2]*z+m[9],m[3]*x+m[4]*y+m[5]*z+m[10],m[6]*x+m[7]*y+m[8]*z+m[11]);this.n.push(m[0]*nx+m[1]*ny+m[2]*nz,m[3]*nx+m[4]*ny+m[5]*nz,m[6]*nx+m[7]*ny+m[8]*nz);
    this.u.push(u,w);this.c.push(col[0],col[1],col[2]);const rc=t.rc;this.r.push(rc[0],rc[1],rc[2],rc[3]);this.g.push(gl||0);return this.vc++}
  /* flat quad, counter-clockwise seen from the front */
  quad(a,b,c,d,ua,ub,uc,ud,col,t,gl){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=d[0]-a[0],vy=d[1]-a[1],vz=d[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const o=this.v(a[0],a[1],a[2],nx,ny,nz,ua[0],ua[1],col,t,gl);this.v(b[0],b[1],b[2],nx,ny,nz,ub[0],ub[1],col,t,gl);this.v(c[0],c[1],c[2],nx,ny,nz,uc[0],uc[1],col,t,gl);this.v(d[0],d[1],d[2],nx,ny,nz,ud[0],ud[1],col,t,gl);this.i.push(o,o+1,o+2,o,o+2,o+3);return this}
  /* quad with the tile stretched once over it (uv 0..1, or the sub-range uv=[u0,v0,u1,v1]); ds = double sided */
  face(a,b,c,d,col,t,o){o=o||{};const q=o.uv||[0,0,1,1];this.quad(a,b,c,d,[q[0],q[1]],[q[2],q[1]],[q[2],q[3]],[q[0],q[3]],col,t,o.gl);if(o.ds)this.quad(b,a,d,c,[q[2],q[1]],[q[0],q[1]],[q[0],q[3]],[q[2],q[3]],col,t,o.gl);return this}
  tri(a,b,c,ua,ub,uc,col,t,gl){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const o=this.v(a[0],a[1],a[2],nx,ny,nz,ua[0],ua[1],col,t,gl);this.v(b[0],b[1],b[2],nx,ny,nz,ub[0],ub[1],col,t,gl);this.v(c[0],c[1],c[2],nx,ny,nz,uc[0],uc[1],col,t,gl);this.i.push(o,o+1,o+2);return this}
  /* box: centre x,z, bottom y0. o: {ry, f:'xXzZtb' faces (+x,-x,+z,-z,top,bottom; default all but bottom), gl, rot (turn the texture 90°), fit:[nu,nv] (stretch tile nu x nv times per face), k (uv scale), tt/tc (other tile/colour for the top)} */
  box(cx,y0,cz,sx,sy,sz,col,t,o){o=o||{};if(o.ry){this.push(cx,0,cz,o.ry);cx=0;cz=0}const f=o.f||'xXzZt',gl=o.gl||0,k=o.k||1/(t.m||1),x0=cx-sx/2,x1=cx+sx/2,z0=cz-sz/2,z1=cz+sz/2,y1=y0+sy,fit=o.fit;
    const side=(a,b,c,d,L)=>{let U=fit?fit[0]:L*k,V=fit?fit[1]:sy*k;if(o.rot)this.quad(a,b,c,d,[0,0],[0,U],[V,U],[V,0],col,t,gl);else this.quad(a,b,c,d,[0,0],[U,0],[U,V],[0,V],col,t,gl)};
    if(f.indexOf('x')>=0)side([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],sz);if(f.indexOf('X')>=0)side([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],sz);
    if(f.indexOf('z')>=0)side([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],sx);if(f.indexOf('Z')>=0)side([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],sx);
    const tt=o.tt||t,tc=o.tc||col,kt=o.tt?1/(tt.m||1):k;
    if(f.indexOf('t')>=0){const U=fit&&!o.tt?fit[0]:sx*kt,V=fit&&!o.tt?fit[1]:sz*kt;if(o.rot)this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,0],[0,U],[V,U],[V,0],tc,tt,gl);else this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,0],[U,0],[U,V],[0,V],tc,tt,gl)}
    if(f.indexOf('b')>=0)this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,0],[sx*k,0],[sx*k,sz*k],[0,sz*k],col,t,gl);
    if(o.ry)this.pop();return this}
  /* vertical cylinder / cone with smooth normals. o: {cap, capB, gl, a0, a1 (arc), k} */
  cyl(cx,y0,cz,r0,r1,h,seg,col,t,o){o=o||{};const gl=o.gl||0,k=o.k||1/(t.m||1),a0=o.a0||0,a1=o.a1==null?TAU:o.a1,sl=(r0-r1)/(h||1e-6),nl=Math.hypot(1,sl),b=this.vc,C=Math.max(r0,r1)*(a1-a0)*k;
    for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg,c=Math.cos(a),s=Math.sin(a),u=C*i/seg;this.v(cx+c*r0,y0,cz+s*r0,c/nl,sl/nl,s/nl,u,0,col,t,gl);this.v(cx+c*r1,y0+h,cz+s*r1,c/nl,sl/nl,s/nl,u,h*k,col,t,gl)}
    for(let i=0;i<seg;i++){const o2=b+i*2;this.i.push(o2,o2+1,o2+3,o2,o2+3,o2+2)}
    const cap=(y,r,up)=>{const c0=this.v(cx,y,cz,0,up,0,0.5,0.5,col,t,gl);for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg;this.v(cx+Math.cos(a)*r,y,cz+Math.sin(a)*r,0,up,0,0.5+Math.cos(a)*r*k,0.5+Math.sin(a)*r*k,col,t,gl)}for(let i=0;i<seg;i++){if(up>0)this.i.push(c0,c0+2+i,c0+1+i);else this.i.push(c0,c0+1+i,c0+2+i)}};
    if(o.cap&&r1>0)cap(y0+h,r1,1);if(o.capB&&r0>0)cap(y0,r0,-1);return this}
  /* tube between two points */
  tube(a,b,r,seg,col,t,o){o=o||{};const gl=o.gl||0,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1e-6,ax=dx/L,ay=dy/L,az=dz/L;let ux=-az,uy=0,uz=ax;if(Math.abs(ay)>0.99){ux=1;uy=0;uz=0}const ul=Math.hypot(ux,uy,uz);ux/=ul;uy/=ul;uz/=ul;
    const vx=ay*uz-az*uy,vy=az*ux-ax*uz,vz=ax*uy-ay*ux,k=1/(t.m||1),r1=o.r1==null?r:o.r1,base=this.vc;
    for(let i=0;i<=seg;i++){const an=i/seg*TAU,c=Math.cos(an),s=Math.sin(an),nx=ux*c+vx*s,ny=uy*c+vy*s,nz=uz*c+vz*s,u=i/seg*TAU*r*k;this.v(a[0]+nx*r,a[1]+ny*r,a[2]+nz*r,nx,ny,nz,u,0,col,t,gl);this.v(b[0]+nx*r1,b[1]+ny*r1,b[2]+nz*r1,nx,ny,nz,u,L*k,col,t,gl)}
    for(let i=0;i<seg;i++){const o2=base+i*2;this.i.push(o2,o2+3,o2+1,o2,o2+2,o2+3)}return this}
  /* ellipsoid */
  ball(cx,cy,cz,rx,ry,rz,sw,sh,col,t,o){o=o||{};const gl=o.gl||0,k=o.k||1/(t.m||1),base=this.vc,p0=o.p0||0,p1=o.p1==null?Math.PI:o.p1;
    for(let j=0;j<=sh;j++){const ph=p0+(p1-p0)*j/sh,sp=Math.sin(ph),cp=Math.cos(ph);for(let i=0;i<=sw;i++){const th=i/sw*TAU,c=Math.cos(th),s=Math.sin(th);let nx=c*sp/rx,ny=cp/ry,nz=s*sp/rz;const l=Math.hypot(nx,ny,nz)||1;
      this.v(cx+c*sp*rx,cy+cp*ry,cz+s*sp*rz,nx/l,ny/l,nz/l,i/sw*TAU*rx*k,j/sh*Math.PI*ry*k,col,t,gl)}}
    for(let j=0;j<sh;j++)for(let i=0;i<sw;i++){const a=base+j*(sw+1)+i,b=a+sw+1;this.i.push(a,a+1,b+1,a,b+1,b)}return this}
  /* surface of revolution: prof = [[r,y],...] bottom to top */
  lathe(cx,y0,cz,prof,seg,col,t,o){o=o||{};const gl=o.gl||0,k=o.k||1/(t.m||1),n=prof.length,base=this.vc,nr=[],ny=[];let len=0;const vv=[0];
    for(let j=0;j<n;j++){const a=prof[Math.max(0,j-1)],b=prof[Math.min(n-1,j+1)];let dr=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dr,dy)||1;nr.push(dy/l);ny.push(-dr/l);if(j){len+=Math.hypot(prof[j][0]-prof[j-1][0],prof[j][1]-prof[j-1][1]);vv.push(len)}}
    let rm=0;for(const q of prof)rm=Math.max(rm,q[0]);
    for(let j=0;j<n;j++)for(let i=0;i<=seg;i++){const an=i/seg*TAU,c=Math.cos(an),s=Math.sin(an);this.v(cx+c*prof[j][0],y0+prof[j][1],cz+s*prof[j][0],c*nr[j],ny[j],s*nr[j],i/seg*TAU*rm*k,vv[j]*k,col,t,gl)}
    for(let j=0;j<n-1;j++)for(let i=0;i<seg;i++){const a=base+j*(seg+1)+i,b=a+seg+1;this.i.push(a,b,b+1,a,b+1,a+1)}return this}
  /* tessellated horizontal rectangle (floor: up=1, ceiling: up=-1) */
  grid(x0,z0,x1,z1,y,step,col,t,o){o=o||{};const up=o.up===-1?-1:1,gl=o.gl||0,k=1/(t.m||1),nx=Math.max(1,Math.round((x1-x0)/step)),nz=Math.max(1,Math.round((z1-z0)/step)),base=this.vc;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=x0+(x1-x0)*i/nx,z=z0+(z1-z0)*j/nz;this.v(x,y,z,0,up,0,x*k,-z*k,col,t,gl)}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){if(o.skip&&o.skip(x0+(x1-x0)*(i+0.5)/nx,z0+(z1-z0)*(j+0.5)/nz))continue;const a=base+j*(nx+1)+i,b=a+nx+1;if(up>0)this.i.push(a,b,b+1,a,b+1,a+1);else this.i.push(a,b+1,b,a,a+1,b+1)}return this}
  /* tessellated vertical wall from A to B, seen from the side where A is on the left; holes = [[s0,s1,y0,y1],...] in metres along the wall */
  wall(ax,az,bx,bz,y0,y1,col,t,o){o=o||{};const gl=o.gl||0,k=1/(t.m||1),dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,nx=-uz,nz=ux,holes=o.holes||[],step=o.step||0.6;
    const S=[0,L],Y=[y0,y1];for(let s=step;s<L-0.05;s+=step)S.push(s);for(const yy of(o.ys||[0.12,0.45,1.0,1.7,2.4]))if(yy>y0+0.02&&yy<y1-0.02)Y.push(yy);for(const h of holes){S.push(h[0],h[1]);Y.push(h[2],h[3])}
    const uq=a=>{a.sort((p,q)=>p-q);const r=[];for(const v of a)if(!r.length||v-r[r.length-1]>0.004)r.push(v);return r};const ss=uq(S.filter(s=>s>=0&&s<=L)),ys=uq(Y.filter(v=>v>=y0&&v<=y1));
    for(let i=0;i<ss.length-1;i++)for(let j=0;j<ys.length-1;j++){const sm=(ss[i]+ss[i+1])/2,ym=(ys[j]+ys[j+1])/2;let inH=false;for(const h of holes)if(sm>h[0]&&sm<h[1]&&ym>h[2]&&ym<h[3]){inH=true;break}if(inH)continue;
      const xa=ax+ux*ss[i],za=az+uz*ss[i],xb=ax+ux*ss[i+1],zb=az+uz*ss[i+1],o2=this.vc;
      this.v(xa,ys[j],za,nx,0,nz,ss[i]*k,ys[j]*k,col,t,gl);this.v(xb,ys[j],zb,nx,0,nz,ss[i+1]*k,ys[j]*k,col,t,gl);this.v(xb,ys[j+1],zb,nx,0,nz,ss[i+1]*k,ys[j+1]*k,col,t,gl);this.v(xa,ys[j+1],za,nx,0,nz,ss[i]*k,ys[j+1]*k,col,t,gl);this.i.push(o2,o2+1,o2+2,o2,o2+2,o2+3)}return this}
  tris(){return this.i.length/3}
  build(kind){const n=this.vc,g=new THREE.BufferGeometry(),nor=new Int8Array(n*3),col=new Uint16Array(n*3),gl=new Uint8Array(n);
    for(let i=0;i<n*3;i+=3){const l=Math.hypot(this.n[i],this.n[i+1],this.n[i+2])||1;nor[i]=Math.round(this.n[i]/l*127);nor[i+1]=Math.round(this.n[i+1]/l*127);nor[i+2]=Math.round(this.n[i+2]/l*127);
      col[i]=Math.round(clamp(this.c[i],0,1)*65535);col[i+1]=Math.round(clamp(this.c[i+1],0,1)*65535);col[i+2]=Math.round(clamp(this.c[i+2],0,1)*65535)}
    for(let i=0;i<n;i++)gl[i]=Math.round(clamp(this.g[i],0,1)*255);
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3,true));g.setAttribute('color',new THREE.BufferAttribute(col,3,true));g.setAttribute('aGlow',new THREE.BufferAttribute(gl,1,true));
    if(kind==='glow'){/* uv = final coordinates in the board texture */const uv=new Float32Array(n*2);for(let i=0;i<n;i++){uv[i*2]=this.r[i*4]+this.u[i*2]*this.r[i*4+2];uv[i*2+1]=this.r[i*4+1]+this.u[i*2+1]*this.r[i*4+3]}g.setAttribute('uv',new THREE.BufferAttribute(uv,2))}
    else{g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));if(kind!=='glass'){const rc=new Uint16Array(n*4);for(let i=0;i<n*4;i++)rc[i]=Math.round(clamp(this.r[i],0,1)*65535);g.setAttribute('aRect',new THREE.BufferAttribute(rc,4,true))}}
    g.setIndex(new THREE.BufferAttribute(n>65535?new Uint32Array(this.i):new Uint16Array(this.i),1));g.computeBoundingSphere();this.p=this.n=this.u=this.c=this.r=this.g=this.i=null;return g}}

/* ============================== BOARD TEXTURE (per interior: menu boards, screens, posters, street panorama) ============================== */
class IBoard{constructor(w,h){this.w=w;this.h=h;this.cv=document.createElement('canvas');this.cv.width=w;this.cv.height=h;this.g=this.cv.getContext('2d');this.g.fillStyle='#000';this.g.fillRect(0,0,w,h);this.x=0;this.y=0;this.rowH=0;
    this.g.fillStyle='#fff';this.g.fillRect(0,0,16,16);this.white={rc:[4/w,1-12/h,8/w,8/h],m:1};this.x=20;this.rowH=16}
  /* allocate w x h pixels, paint with fn(ctx,w,h) (origin at the region), returns a tile-like {rc} */
  paint(w,h,fn){const P=3;if(this.x+w+2*P>this.w){this.x=0;this.y+=this.rowH+2;this.rowH=0}if(this.y+h+2*P>this.h){console.warn('interior board atlas full');return this.white}
    const x=this.x+P,y=this.y+P,g=this.g;g.save();g.beginPath();g.rect(x-P,y-P,w+2*P,h+2*P);g.clip();g.translate(x,y);fn(g,w,h);g.restore();this.x+=w+2*P;this.rowH=Math.max(this.rowH,h+2*P);
    const r={rc:[x/this.w,1-(y+h)/this.h,w/this.w,h/this.h],m:1,px:[x,y,w,h]};return r}
  tex(){if(!this.t){this.t=new THREE.CanvasTexture(this.cv);this.t.encoding=THREE.sRGBEncoding;this.t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());this.t.minFilter=THREE.LinearMipmapLinearFilter}return this.t}}
/* canvas text helpers */
function bFont(px,w,fam){return`${w||700} ${px}px ${fam||"Inter,'Helvetica Neue',Arial,sans-serif"}`}
const B_HEAD="'Bebas Neue','Arial Narrow',Impact,sans-serif",B_SERIF="Georgia,'Times New Roman',serif";
function bText(g,s,x,y,font,col,al,maxW){g.font=font;g.fillStyle=col;g.textAlign=al||'left';g.textBaseline='alphabetic';if(maxW)g.fillText(s,x,y,maxW);else g.fillText(s,x,y)}
function bRound(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath()}

/* ============================== BUILD CONTEXT ============================== */
class IK{constructor(I){this.I=I;this.o=new IB();this.c=new IB();this.g=new IB();this.x=new IB();this.solids=[];this.lamps=[];this.dyn=[];this.B=new IBoard(2048,1024);this.peopleDef=[];this.acts=[];this.tick=[];this.plan=[]}
  /* collision + contact shadow + minimap: axis-aligned rect in local coordinates. o: {h (height, default 1), k (shadow strength), sp (spread), noCol, y0, kind, tag} */
  solid(x0,z0,x1,z1,o){o=o||{};const s={x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1),y0:o.y0||0,h:o.h==null?1:o.h,k:o.k==null?0.42:o.k,sp:o.sp||0.2,tag:o.tag||''};this.solids.push(s);
    if(!o.noCol){const I=this.I,P=[[s.x0,s.z0],[s.x1,s.z0],[s.x1,s.z1],[s.x0,s.z1]].map(q=>I.toWorld(q[0],q[1]));for(let i=0;i<4;i++){const a=P[i],b=P[(i+1)%4];addSeg(a.x,a.z,b.x,b.z,o.kind||'w')}}
    if(!o.noMap)this.plan.push([s.x0,s.z0,s.x1,s.z1,o.tag||'']);return s}
  lamp(x,y,z,col,p,r){this.lamps.push({x,y,z,c:col||[1,0.93,0.82],p:p==null?0.5:p,r:r||1.6})}
  /* unlit quad from the board texture: centre x,y,z, size w x h, facing +z rotated by ry. o: {glow:0|1|0.5, col, ds, uv, rx (tilt back)} */
  sign(rect,x,y,z,w,h,ry,o){o=o||{};const g=this.g;g.push(x,y,z,ry||0,o.rx||0);g.face([-w/2,-h/2,0],[w/2,-h/2,0],[w/2,h/2,0],[-w/2,h/2,0],o.col||IWH,rect,{gl:o.glow||0,ds:o.ds,uv:o.uv});g.pop();return this}
  /* interaction at a local point */
  act(lx,lz,r,label,fn){const I=this.I,w=I.toWorld(lx,lz),it={x:w.x,z:w.z,r:r||1.5,label,fn,when:()=>player.interior===I.key&&!IN.busy,interior:I.key};INTER.push(it);this.acts.push(it);return it}
  person(def){this.peopleDef.push(def)}}

/* ============================== BAKED LIGHT (vertex colours): ambient occlusion at wall/floor junctions, contact shadows, lamp pools ============================== */
function inBake(K,b,amb){const I=K.I,p=b.p,n=b.n,c=b.c,g=b.g,H=I.h,x0=I.lx0,x1=I.lx1,z0=I.lz0,z1=I.lz1,occ=K.solids,lamps=K.lamps;amb=amb==null?0.6:amb;
  for(let i=0;i<b.vc;i++){if(g[i]>0)continue;const x=p[i*3],y=p[i*3+1],z=p[i*3+2],nx=n[i*3],ny=n[i*3+1],nz=n[i*3+2];let ao=1;
    if(x>x0-0.05&&x<x1+0.05&&z>z0-0.05&&z<z1+0.05){const dx=Math.min(x-x0,x1-x),dz=Math.min(z-z0,z1-z),dw=Math.min(dx,dz);
      if(ny>0.6){if(y<0.07){ao*=0.72+0.28*iss(dw/0.8);for(const s of occ){if(s.y0>0.3||s.k<=0)continue;const ex=Math.max(s.x0-x,0,x-s.x1),ez=Math.max(s.z0-z,0,z-s.z1),d=Math.hypot(ex,ez);if(d<1.2)ao*=1-s.k*Math.exp(-d/s.sp)}}else ao*=0.9+0.1*iss(dw/0.35)}
      else if(ny<-0.6){ao*=y>H-0.12?0.8+0.2*iss(dw/0.9):0.6}
      else{ao*=(0.8+0.2*iss(y/0.4))*(0.86+0.14*iss((H-y)/0.7));const dc=Math.abs(nx)>Math.abs(nz)?dz:dx;ao*=0.8+0.2*iss(dc/0.7)}}
    let r=amb*ao,gg=amb*ao,bb=amb*ao;const sa=Math.sqrt(ao);
    for(const l of lamps){const lx=l.x-x,ly=l.y-y,lz=l.z-z,d2=lx*lx+ly*ly+lz*lz;if(d2>l.r*l.r*16)continue;const d=Math.sqrt(d2)||1e-4,w=Math.max(0,(nx*lx+ny*ly+nz*lz)/d*0.8+0.2)*l.p/(1+d2/(l.r*l.r))*sa;r+=w*l.c[0];gg+=w*l.c[1];bb+=w*l.c[2]}
    c[i*3]*=Math.min(1,r);c[i*3+1]*=Math.min(1,gg);c[i*3+2]*=Math.min(1,bb)}}
