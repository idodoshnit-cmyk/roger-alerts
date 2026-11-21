'use strict';
/* Grand Kifisia — walk-in shop interiors (team:interiors). BUILT FILE: authored in work/interiors/src/*.js, see docs/INTERIORS.md.
   Public: INTERIORS (registry), buildInteriors(), enterInterior(key), exitInterior(instant), updateInteriors(dt); flag player.interior (key | null).
   One interior is alive at a time. It is built when the player walks in (during the fade) and disposed when they leave, so it costs nothing at boot.
   A cell is authored in LOCAL metres: origin = centre of the street door on the inner face of the front wall, +z = out to the street (the real door normal),
   -z = into the shop, +x = to your right as you walk in, y = height above the floor. The cell sits far outside the map (x,z = 3400) where terr() is constant
   and is rotated to the compass orientation of the real shopfront.
   The module is self-contained (own geometry builder, own photo-texture array, own materials, own light rig); it only reads these globals, all feature-detected:
   scene, renderer, camera, Q, player, ph, terr, addSeg, grid, INTER, SPECIAL, MAP, Ped, randomLook, SHOPS, openShop, subtitle, sfx, tod, camYaw. */
const INTERIORS={};
function buildInteriors(){return INTERIORS._?INTERIORS._.boot():null}
function enterInterior(key,opt){return INTERIORS._?INTERIORS._.enter(key,opt):null}
function exitInterior(instant){return INTERIORS._?INTERIORS._.exit(instant):null}
function updateInteriors(dt){/* kept for callers of the first draft: the module ticks itself through its updateCamera wrapper */}
(function(){
const PI=Math.PI,TAU2=PI*2;
const cl=(v,a,b)=>v<a?a:v>b?b:v,ss=t=>t<=0?0:t>=1?1:t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
const hash=n=>{n=Math.imul(n^61^(n>>>16),9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return(n>>>0)/4294967296};
function strHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
/* deterministic random stream */
function RNG(seed){let s=seed>>>0||1;const f=()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};f.r=(a,b)=>a+f()*(b-a);f.i=(a,b)=>Math.floor(a+f()*(b-a+1));f.p=a=>a[Math.floor(f()*a.length)];return f}
/* colours are authored as sRGB hex and converted to linear, because vertex colours multiply the (linear) texture */
const _hx={};
function hx(h){let c=_hx[h];if(!c){if(h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];const n=parseInt(h.slice(1),16),f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)};c=_hx[h]=[f(n>>16&255),f(n>>8&255),f(n&255)]}return c}
const mul=(c,f)=>[c[0]*f,c[1]*f,c[2]*f],WH=[1,1,1];
const col=c=>typeof c==='string'?hx(c):(c||WH);
function hexMix(a,b,t){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),f=s=>Math.round(mix(A>>s&255,B>>s&255,t));return'#'+((1<<24)|(f(16)<<16)|(f(8)<<8)|f(0)).toString(16).slice(1)}
function lum(h){const n=parseInt(h.slice(1),16);return((n>>16&255)*0.299+(n>>8&255)*0.587+(n&255)*0.114)/255}

const IN={X0:3400,Z0:3400,alive:null,busy:false,ret:null,U:{arr:{value:null},nrm:{value:null},glow:{value:2.2},day:{value:new THREE.Color(1,1,1)},nite:{value:0}},
  mat:{},hidden:[],saved:null,clock:0,stats:{},gen:{},doors:[],cfg:{people:true},Y0:0};

/* ============================== TEXTURES: one WebGL2 array of 512² photo layers per interior ==============================
   interiors/c*.jpg (4x4 cells of 512², sRGB colour) and n*.jpg (cells of 256²: R,G = tangent normal, B = gloss), CC0 Poly Haven photos + generated tiles,
   packed by work/interiors/tools/build_tex.py. Only the layers an interior uses are uploaded; runtime-painted layers (labels, food, fabrics…) join the same array. */
const TX={man:null,manP:null,where:null};
function loadManifest(){if(!TX.manP)TX.manP=fetch('interiors/manifest.json').then(r=>r.ok?r.json():null).catch(()=>null).then(m=>{TX.man=m;TX.where={};if(m)m.colour.forEach((sh,si)=>sh.l.forEach((n,i)=>TX.where[n]=[si,i]));return m});return TX.manP}
function loadImg(url){return new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=url})}
const PAINT={};/* name -> {fn(ctx,S), gloss:0..1, bump?:fn(ctx,S) grey height} : runtime-painted layers */
const FALLBACK={fl:'#b9a488',tile:'#e6e3dc',wood:'#8a6238',oak:'#c39a62',walnut:'#6e4a2c',plaster:'#e2e0db',brick:'#9a5a44',marble:'#e6e4df',steel:'#b9bcc0',leather:'#6b3f22',ceil:'#e6e5e1',carpet:'#b0b0b0'};
const LAY={names:[],ix:{},stamp:1};
function layId(name){let i=LAY.ix[name];if(i===undefined){i=LAY.ix[name]=LAY.names.length;LAY.names.push(name)}return i}
function layReset(){LAY.names=[];LAY.ix={};LAY.stamp++;layId('flat')}
/* material tile: {l: layer name, m: metres per repeat}; cached */
const _mt={};
function M(name,m){const k=name+(m?'@'+m:'');let t=_mt[k];if(!t){const meta=TX.man&&TX.man.meta[name];t=_mt[k]={l:name,m:m||(meta?meta.m:1)}}return t}
/* sub-cell i of an n x n sheet layer (labels, food…): stretched once over a face */
const _sub={};
function SUB(name,n,i,ins){const k=name+n+'_'+i;let s=_sub[k];if(!s){const cs=1/n,cx=i%n,cy=Math.floor(i/n)%n,e=ins==null?0.006:ins;s=_sub[k]={l:name,m:1,rc:[cx*cs+e,1-(cy+1)*cs+e,cs-2*e,cs-2*e]}}return s}
async function buildArrays(names){const S=cl((typeof Q!=='undefined'&&Q.tex)||512,256,512),NS=S/2,n=Math.max(1,names.length);
  const cdat=new Uint8Array(n*S*S*4),ndat=new Uint8Array(n*NS*NS*4);
  const mk=s=>{const c=document.createElement('canvas');c.width=c.height=s;return[c,c.getContext('2d',{willReadFrequently:true})]};
  const [cc,cg]=mk(S),[nc,ng]=mk(NS),[pc,pg]=mk(S);cg.imageSmoothingQuality='high';ng.imageSmoothingQuality='high';
  const man=await loadManifest(),need={};
  names.forEach((nm,i)=>{if(PAINT[nm])return;const w=TX.where[nm];if(w)(need[w[0]]=need[w[0]]||[]).push([i,w[1]])});
  const sheets=Object.keys(need),imgs=await Promise.all(sheets.map(si=>Promise.all([loadImg('interiors/'+man.colour[si].f),loadImg('interiors/'+man.normal[si].f)])));
  const put=(g,s,dat,i)=>{const d=g.getImageData(0,0,s,s).data;dat.set(d,i*s*s*4)};
  const flat=(i,c,gloss)=>{cg.setTransform(1,0,0,1,0,0);cg.fillStyle=c;cg.fillRect(0,0,S,S);put(cg,S,cdat,i);ng.setTransform(1,0,0,1,0,0);ng.fillStyle=`rgb(128,128,${Math.round(gloss*255)})`;ng.fillRect(0,0,NS,NS);put(ng,NS,ndat,i)};
  names.forEach((nm,i)=>{const P=PAINT[nm];if(P){pg.setTransform(1,0,0,1,0,0);pg.globalAlpha=1;pg.clearRect(0,0,S,S);pg.fillStyle='#fff';pg.fillRect(0,0,S,S);pg.save();P.fn(pg,S);pg.restore();
      cg.setTransform(1,0,0,-1,0,S);cg.drawImage(pc,0,0);put(cg,S,cdat,i);
      ng.setTransform(1,0,0,1,0,0);ng.fillStyle=`rgb(128,128,${Math.round((P.gloss==null?0.3:P.gloss)*255)})`;ng.fillRect(0,0,NS,NS);
      if(P.gmap){pg.setTransform(1,0,0,1,0,0);pg.clearRect(0,0,S,S);pg.save();P.gmap(pg,S);pg.restore();ng.setTransform(1,0,0,-1,0,NS);ng.drawImage(pc,0,0,S,S,0,0,NS,NS)}put(ng,NS,ndat,i)}
    else if(!TX.where[nm]){const fb=Object.keys(FALLBACK).find(k=>nm.indexOf(k)>=0);flat(i,fb?FALLBACK[fb]:'#c4c4c4',0.3)}});
  sheets.forEach((si,k)=>{const [ci,ni]=imgs[k],CS=man.S,CN=man.NS;for(const [i,cell] of need[si]){const sx=cell%4,sy=Math.floor(cell/4);
      if(ci){cg.setTransform(1,0,0,-1,0,S);cg.drawImage(ci,sx*CS,sy*CS,CS,CS,0,0,S,S);put(cg,S,cdat,i)}else{const nm=names[i],fb=Object.keys(FALLBACK).find(q=>nm.indexOf(q)>=0);flat(i,fb?FALLBACK[fb]:'#c4c4c4',0.3)}
      if(ni){ng.setTransform(1,0,0,-1,0,NS);ng.drawImage(ni,sx*CN,sy*CN,CN,CN,0,0,NS,NS);put(ng,NS,ndat,i)}}});
  const tex=(data,s,srgb,an)=>{const t=new THREE.DataArrayTexture(data,s,s,n);t.format=THREE.RGBAFormat;t.type=THREE.UnsignedByteType;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
    t.generateMipmaps=true;t.anisotropy=Math.min(an,renderer.capabilities.getMaxAnisotropy());if(srgb)t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;return t};
  return{col:tex(cdat,S,true,(typeof Q!=='undefined'&&Q.aniso)||4),nrm:tex(ndat,NS,false,2),bytes:Math.round((n*S*S*4+n*NS*NS*4)*4/3),layers:n,size:S}}

/* ============================== MATERIALS ============================== */
function litMat(){const m=new THREE.MeshPhongMaterial({vertexColors:true,shininess:42});m.specular.setRGB(0.32,0.32,0.32);m.fog=false;
  m.onBeforeCompile=sh=>{sh.uniforms.uArr=IN.U.arr;sh.uniforms.uNrm=IN.U.nrm;sh.uniforms.uGlow=IN.U.glow;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aL;attribute float aGlow;varying vec3 vT;varying float vGlow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvT=vec3(uv,aL);vGlow=aGlow;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform mediump sampler2DArray uArr;uniform mediump sampler2DArray uNrm;uniform float uGlow;varying vec3 vT;varying float vGlow;')
      .replace('#include <map_fragment>','vec3 gkT=vec3(vT.xy,floor(vT.z+0.5));vec4 texel=texture(uArr,gkT);vec4 ngl=texture(uNrm,gkT);diffuseColor.rgb*=texel.rgb;')
      .replace('#include <specularmap_fragment>','float specularStrength=ngl.b;')
      .replace('#include <normal_fragment_maps>','{vec2 mN=(ngl.xy*2.0-1.0)*1.25;vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);vec2 s0=dFdx(vT.xy),s1=dFdy(vT.xy);vec3 q1p=cross(q1,normal),q0p=cross(normal,q0);vec3 Tg=q1p*s0.x+q0p*s1.x,Bt=q1p*s0.y+q0p*s1.y;float det=max(dot(Tg,Tg),dot(Bt,Bt));float sc=det==0.0?0.0:faceDirection*inversesqrt(det);normal=normalize(Tg*(mN.x*sc)+Bt*(mN.y*sc)+normal*sqrt(max(0.0,1.0-dot(mN,mN))));}')
      .replace('#include <lights_phong_fragment>','#include <lights_phong_fragment>\nmaterial.specularShininess=shininess*(0.2+2.8*ngl.b);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vGlow*uGlow;')};
  m.customProgramCacheKey=()=>'gkInteriorLit';return m}
/* unlit boards / screens / light boxes / window panoramas. aGlow: 0 = constant, 1 = multiplied by the daylight colour, 0.5 = multiplied by the night factor */
function boardMat(){const m=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,fog:false});
  m.onBeforeCompile=sh=>{sh.uniforms.uDay=IN.U.day;sh.uniforms.uNite=IN.U.nite;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aGlow;varying float vGlow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGlow=aGlow;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGlow;uniform vec3 uDay;uniform float uNite;')
      .replace('#include <color_fragment>','#include <color_fragment>\nif(vGlow>0.75)diffuseColor.rgb*=uDay;else if(vGlow>0.25)diffuseColor.rgb*=uNite;')};
  m.customProgramCacheKey=()=>'gkInteriorBoard';return m}
function materials(){if(IN.mat.lit)return;IN.mat.lit=litMat();IN.mat.board=boardMat();
  IN.mat.glass=new THREE.MeshPhongMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:0.2,shininess:160,side:THREE.DoubleSide,depthWrite:false});IN.mat.glass.specular.setRGB(0.9,0.9,0.9);IN.mat.glass.fog=false}


/* ============================== GEOMETRY BUILDER (local metres, transform stack, smooth normals where it matters) ============================== */
class IB{constructor(){this.p=[];this.n=[];this.u=[];this.c=[];this.l=[];this.g=[];this.i=[];this.vc=0;this.m=[1,0,0,0,1,0,0,0,1,0,0,0];this.st=[]}
  static mul(a,b){return[a[0]*b[0]+a[1]*b[3]+a[2]*b[6],a[0]*b[1]+a[1]*b[4]+a[2]*b[7],a[0]*b[2]+a[1]*b[5]+a[2]*b[8],a[3]*b[0]+a[4]*b[3]+a[5]*b[6],a[3]*b[1]+a[4]*b[4]+a[5]*b[7],a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6],a[6]*b[1]+a[7]*b[4]+a[8]*b[7],a[6]*b[2]+a[7]*b[5]+a[8]*b[8],a[0]*b[9]+a[1]*b[10]+a[2]*b[11]+a[9],a[3]*b[9]+a[4]*b[10]+a[5]*b[11]+a[10],a[6]*b[9]+a[7]*b[10]+a[8]*b[11]+a[11]]}
  /* push a local frame: translate, then rotate about Y (ry), X (rx), Z (rz). Inside a frame with ry, local +z points to (sin ry, cos ry). */
  push(x,y,z,ry,rx,rz){this.st.push(this.m);let l=[1,0,0,0,1,0,0,0,1,x||0,y||0,z||0];
    if(ry){const c=Math.cos(ry),s=Math.sin(ry);l=IB.mul(l,[c,0,s,0,1,0,-s,0,c,0,0,0])}if(rx){const c=Math.cos(rx),s=Math.sin(rx);l=IB.mul(l,[1,0,0,0,c,-s,0,s,c,0,0,0])}if(rz){const c=Math.cos(rz),s=Math.sin(rz);l=IB.mul(l,[c,-s,0,s,c,0,0,0,1,0,0,0])}
    this.m=IB.mul(this.m,l);return this}
  pop(){this.m=this.st.pop();return this}
  /* transform a local point of the current frame to cell coordinates */
  at(x,y,z){const m=this.m;return[m[0]*x+m[1]*y+m[2]*z+m[9],m[3]*x+m[4]*y+m[5]*z+m[10],m[6]*x+m[7]*y+m[8]*z+m[11]]}
  v(x,y,z,nx,ny,nz,u,w,c,t,gl){const m=this.m;this.p.push(m[0]*x+m[1]*y+m[2]*z+m[9],m[3]*x+m[4]*y+m[5]*z+m[10],m[6]*x+m[7]*y+m[8]*z+m[11]);this.n.push(m[0]*nx+m[1]*ny+m[2]*nz,m[3]*nx+m[4]*ny+m[5]*nz,m[6]*nx+m[7]*ny+m[8]*nz);
    if(t.st!==LAY.stamp){t.li=layId(t.l);t.st=LAY.stamp}const rc=t.rc;if(rc){u=rc[0]+u*rc[2];w=rc[1]+w*rc[3]}
    this.u.push(u,w);this.c.push(c[0],c[1],c[2]);this.l.push(t.li);this.g.push(gl||0);return this.vc++}
  /* flat quad, counter-clockwise seen from the front */
  quad(a,b,c,d,ua,ub,uc,ud,col,t,gl){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=d[0]-a[0],vy=d[1]-a[1],vz=d[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const o=this.v(a[0],a[1],a[2],nx,ny,nz,ua[0],ua[1],col,t,gl);this.v(b[0],b[1],b[2],nx,ny,nz,ub[0],ub[1],col,t,gl);this.v(c[0],c[1],c[2],nx,ny,nz,uc[0],uc[1],col,t,gl);this.v(d[0],d[1],d[2],nx,ny,nz,ud[0],ud[1],col,t,gl);this.i.push(o,o+1,o+2,o,o+2,o+3);return this}
  /* quad with the tile stretched once over it (or the sub-range uv=[u0,v0,u1,v1]); ds = double sided */
  face(a,b,c,d,col,t,o){o=o||{};const q=o.uv||[0,0,1,1];this.quad(a,b,c,d,[q[0],q[1]],[q[2],q[1]],[q[2],q[3]],[q[0],q[3]],col,t,o.gl);if(o.ds)this.quad(b,a,d,c,[q[2],q[1]],[q[0],q[1]],[q[0],q[3]],[q[2],q[3]],col,t,o.gl);return this}
  /* upright rectangle centred at x,y,z facing local +z (after ry), w x h, texture stretched once. o:{ry,rx,gl,uv,ds} */
  panel(x,y,z,w,h,col,t,o){o=o||{};this.push(x,y,z,o.ry||0,o.rx||0);this.face([-w/2,-h/2,0],[w/2,-h/2,0],[w/2,h/2,0],[-w/2,h/2,0],col,t,o);return this.pop()}
  tri(a,b,c,ua,ub,uc,col,t,gl){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const o=this.v(a[0],a[1],a[2],nx,ny,nz,ua[0],ua[1],col,t,gl);this.v(b[0],b[1],b[2],nx,ny,nz,ub[0],ub[1],col,t,gl);this.v(c[0],c[1],c[2],nx,ny,nz,uc[0],uc[1],col,t,gl);this.i.push(o,o+1,o+2);return this}
  /* box: centre x,z, bottom y0. o: {ry, f:'xXzZtb' faces (+x,-x,+z,-z,top,bottom; default all but bottom), gl, rot (turn the texture 90°), fit:[nu,nv] (stretch the tile nu x nv times per side face),
     k (uv scale), tt/tc (other tile/colour for the top), bev (chamfer the 4 vertical edges, metres)} */
  box(cx,y0,cz,sx,sy,sz,col,t,o){o=o||{};if(o.ry){this.push(cx,0,cz,o.ry);cx=0;cz=0}const f=o.f||'xXzZt',gl=o.gl||0,k=o.k||1/(t.m||1),x0=cx-sx/2,x1=cx+sx/2,z0=cz-sz/2,z1=cz+sz/2,y1=y0+sy,fit=o.fit;
    const side=(a,b,c,d,L)=>{let U=fit?fit[0]:L*k,V=fit?fit[1]:sy*k;if(o.rot)this.quad(a,b,c,d,[0,0],[0,U],[V,U],[V,0],col,t,gl);else this.quad(a,b,c,d,[0,0],[U,0],[U,V],[0,V],col,t,gl)};
    if(f.indexOf('x')>=0)side([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],sz);if(f.indexOf('X')>=0)side([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],sz);
    if(f.indexOf('z')>=0)side([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],sx);if(f.indexOf('Z')>=0)side([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],sx);
    const tt=o.tt||t,tc=o.tc||col,kt=o.tt?1/(tt.m||1):k;
    if(f.indexOf('t')>=0){const U=fit&&!o.tt?fit[0]:sx*kt,V=fit&&!o.tt?fit[1]:sz*kt;if(o.rot)this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,0],[0,U],[V,U],[V,0],tc,tt,gl);else this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,0],[U,0],[U,V],[0,V],tc,tt,gl)}
    if(f.indexOf('b')>=0)this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,0],[sx*k,0],[sx*k,sz*k],[0,sz*k],col,t,gl);
    if(o.ry)this.pop();return this}
  /* vertical cylinder / cone with smooth normals. o: {cap, capB, gl, a0, a1 (arc), k} */
  cyl(cx,y0,cz,r0,r1,h,seg,col,t,o){o=o||{};const gl=o.gl||0,k=o.k||1/(t.m||1),a0=o.a0||0,a1=o.a1==null?TAU2:o.a1,sl=(r0-r1)/(h||1e-6),nl=Math.hypot(1,sl),b=this.vc,C=Math.max(r0,r1)*(a1-a0)*k;
    for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg,c=Math.cos(a),s=Math.sin(a),u=C*i/seg;this.v(cx+c*r0,y0,cz+s*r0,c/nl,sl/nl,s/nl,u,0,col,t,gl);this.v(cx+c*r1,y0+h,cz+s*r1,c/nl,sl/nl,s/nl,u,h*k,col,t,gl)}
    for(let i=0;i<seg;i++){const o2=b+i*2;this.i.push(o2,o2+1,o2+3,o2,o2+3,o2+2)}
    const cap=(y,r,up)=>{const c0=this.v(cx,y,cz,0,up,0,0.5,0.5,col,o.tt||t,gl);for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg;this.v(cx+Math.cos(a)*r,y,cz+Math.sin(a)*r,0,up,0,0.5+Math.cos(a)*(o.capFit?0.5:r*k),0.5+Math.sin(a)*(o.capFit?0.5:r*k),o.tc||col,o.tt||t,gl)}for(let i=0;i<seg;i++){if(up>0)this.i.push(c0,c0+2+i,c0+1+i);else this.i.push(c0,c0+1+i,c0+2+i)}};
    if(o.cap&&r1>0)cap(y0+h,r1,1);if(o.capB&&r0>0)cap(y0,r0,-1);return this}
  /* tube between two points (r at a, o.r1 at b) */
  tube(a,b,r,seg,col,t,o){o=o||{};const gl=o.gl||0,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1e-6,ax=dx/L,ay=dy/L,az=dz/L;let ux=-az,uy=0,uz=ax;if(Math.abs(ay)>0.99){ux=1;uy=0;uz=0}const ul=Math.hypot(ux,uy,uz);ux/=ul;uy/=ul;uz/=ul;
    const vx=ay*uz-az*uy,vy=az*ux-ax*uz,vz=ax*uy-ay*ux,k=1/(t.m||1),r1=o.r1==null?r:o.r1,base=this.vc;
    for(let i=0;i<=seg;i++){const an=i/seg*TAU2,c=Math.cos(an),s=Math.sin(an),nx=ux*c+vx*s,ny=uy*c+vy*s,nz=uz*c+vz*s,u=i/seg*TAU2*r*k;this.v(a[0]+nx*r,a[1]+ny*r,a[2]+nz*r,nx,ny,nz,u,0,col,t,gl);this.v(b[0]+nx*r1,b[1]+ny*r1,b[2]+nz*r1,nx,ny,nz,u,L*k,col,t,gl)}
    for(let i=0;i<seg;i++){const o2=base+i*2;this.i.push(o2,o2+3,o2+1,o2,o2+2,o2+3)}return this}
  /* ellipsoid (o.p0..p1 = polar range, 0 = top) */
  ball(cx,cy,cz,rx,ry,rz,sw,sh,col,t,o){o=o||{};const gl=o.gl||0,k=o.k||1/(t.m||1),base=this.vc,p0=o.p0||0,p1=o.p1==null?PI:o.p1;
    for(let j=0;j<=sh;j++){const ph=p0+(p1-p0)*j/sh,sp=Math.sin(ph),cp=Math.cos(ph);for(let i=0;i<=sw;i++){const th=i/sw*TAU2,c=Math.cos(th),s=Math.sin(th);let nx=c*sp/rx,ny=cp/ry,nz=s*sp/rz;const l=Math.hypot(nx,ny,nz)||1;
      this.v(cx+c*sp*rx,cy+cp*ry,cz+s*sp*rz,nx/l,ny/l,nz/l,o.fit?i/sw:i/sw*TAU2*rx*k,o.fit?1-j/sh:j/sh*PI*ry*k,col,t,gl)}}
    for(let j=0;j<sh;j++)for(let i=0;i<sw;i++){const a=base+j*(sw+1)+i,b=a+sw+1;this.i.push(a,a+1,b+1,a,b+1,b)}return this}
  /* surface of revolution: prof = [[r,y],...] bottom to top */
  lathe(cx,y0,cz,prof,seg,col,t,o){o=o||{};const gl=o.gl||0,k=o.k||1/(t.m||1),n=prof.length,base=this.vc,nr=[],ny=[];let len=0;const vv=[0];
    for(let j=0;j<n;j++){const a=prof[Math.max(0,j-1)],b=prof[Math.min(n-1,j+1)];let dr=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dr,dy)||1;nr.push(dy/l);ny.push(-dr/l);if(j){len+=Math.hypot(prof[j][0]-prof[j-1][0],prof[j][1]-prof[j-1][1]);vv.push(len)}}
    let rm=0;for(const q of prof)rm=Math.max(rm,q[0]);
    for(let j=0;j<n;j++)for(let i=0;i<=seg;i++){const an=i/seg*TAU2,c=Math.cos(an),s=Math.sin(an);this.v(cx+c*prof[j][0],y0+prof[j][1],cz+s*prof[j][0],c*nr[j],ny[j],s*nr[j],o.fit?i/seg:i/seg*TAU2*rm*k,o.fit?vv[j]/len:vv[j]*k,col,t,gl)}
    for(let j=0;j<n-1;j++)for(let i=0;i<seg;i++){const a=base+j*(seg+1)+i,b=a+seg+1;this.i.push(a,b,b+1,a,b+1,a+1)}return this}
  /* tessellated horizontal rectangle (floor: up=1, ceiling: up=-1) */
  grid(x0,z0,x1,z1,y,step,col,t,o){o=o||{};const up=o.up===-1?-1:1,gl=o.gl||0,k=1/(t.m||1),nx=Math.max(1,Math.round((x1-x0)/step)),nz=Math.max(1,Math.round((z1-z0)/step)),base=this.vc;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=x0+(x1-x0)*i/nx,z=z0+(z1-z0)*j/nz;if(o.rot)this.v(x,y,z,0,up,0,-z*k,x*k,col,t,gl);else this.v(x,y,z,0,up,0,x*k,-z*k,col,t,gl)}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){if(o.skip&&o.skip(x0+(x1-x0)*(i+0.5)/nx,z0+(z1-z0)*(j+0.5)/nz))continue;const a=base+j*(nx+1)+i,b=a+nx+1;if(up>0)this.i.push(a,b,b+1,a,b+1,a+1);else this.i.push(a,b+1,b,a,a+1,b+1)}return this}
  /* tessellated vertical wall from A to B, visible from the side where A is on the LEFT; holes = [[s0,s1,y0,y1],...] in metres along the wall */
  wall(ax,az,bx,bz,y0,y1,col,t,o){o=o||{};const gl=o.gl||0,k=1/(t.m||1),dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,nx=-uz,nz=ux,holes=o.holes||[],step=o.step||0.7;
    const S=[0,L],Y=[y0,y1];for(let s=step;s<L-0.05;s+=step)S.push(s);for(const yy of(o.ys||[0.12,0.45,1.0,1.7,2.4]))if(yy>y0+0.02&&yy<y1-0.02)Y.push(yy);for(const h of holes){S.push(h[0],h[1]);Y.push(h[2],h[3])}
    const uq=a=>{a.sort((p,q)=>p-q);const r=[];for(const v of a)if(!r.length||v-r[r.length-1]>0.004)r.push(v);return r};const ss2=uq(S.filter(s=>s>=0&&s<=L)),ys=uq(Y.filter(v=>v>=y0&&v<=y1));
    for(let i=0;i<ss2.length-1;i++)for(let j=0;j<ys.length-1;j++){const sm=(ss2[i]+ss2[i+1])/2,ym=(ys[j]+ys[j+1])/2;let inH=false;for(const h of holes)if(sm>h[0]&&sm<h[1]&&ym>h[2]&&ym<h[3]){inH=true;break}if(inH)continue;
      const xa=ax+ux*ss2[i],za=az+uz*ss2[i],xb=ax+ux*ss2[i+1],zb=az+uz*ss2[i+1],o2=this.vc,u0=(o.u0||0)+ss2[i]*k,u1=(o.u0||0)+ss2[i+1]*k;
      this.v(xa,ys[j],za,nx,0,nz,u0,ys[j]*k,col,t,gl);this.v(xb,ys[j],zb,nx,0,nz,u1,ys[j]*k,col,t,gl);this.v(xb,ys[j+1],zb,nx,0,nz,u1,ys[j+1]*k,col,t,gl);this.v(xa,ys[j+1],za,nx,0,nz,u0,ys[j+1]*k,col,t,gl);this.i.push(o2,o2+1,o2+2,o2,o2+2,o2+3)}return this}
  tris(){return this.i.length/3}
  build(kind){const n=this.vc,g=new THREE.BufferGeometry(),nor=new Int8Array(n*3),gl=new Uint8Array(n);
    for(let i=0;i<n*3;i+=3){const l=Math.hypot(this.n[i],this.n[i+1],this.n[i+2])||1;nor[i]=Math.round(this.n[i]/l*127);nor[i+1]=Math.round(this.n[i+1]/l*127);nor[i+2]=Math.round(this.n[i+2]/l*127)}
    for(let i=0;i<n;i++)gl[i]=Math.round(cl(this.g[i],0,1)*255);
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3,true));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));g.setAttribute('aGlow',new THREE.BufferAttribute(gl,1,true));if(kind==='lit')g.setAttribute('aL',new THREE.BufferAttribute(new Uint8Array(this.l),1,false));
    g.setIndex(new THREE.BufferAttribute(n>65535?new Uint32Array(this.i):new Uint16Array(this.i),1));g.computeBoundingSphere();this.p=this.n=this.u=this.c=this.l=this.g=this.i=null;return g}}

/* ============================== BOARD TEXTURE (per interior: menu boards, screens, posters, signs, the street seen through the windows) ============================== */
class IBoard{constructor(w,h){this.w=w;this.h=h;this.cv=document.createElement('canvas');this.cv.width=w;this.cv.height=h;this.g=this.cv.getContext('2d');this.g.fillStyle='#000';this.g.fillRect(0,0,w,h);
    this.g.fillStyle='#fff';this.g.fillRect(0,0,16,16);this.white={rc:[4/w,1-12/h,8/w,8/h],l:'flat',m:1};this.x=20;this.y=0;this.rowH=16;this.full=false}
  /* allocate w x h pixels and paint them with fn(ctx,w,h); returns a tile usable with IB.face/panel on the board mesh */
  paint(w,h,fn){const P=2;w=Math.round(w);h=Math.round(h);if(this.x+w+2*P>this.w){this.x=0;this.y+=this.rowH+1;this.rowH=0}if(this.y+h+2*P>this.h){if(!this.full)console.warn('interior board atlas full');this.full=true;return this.white}
    const x=this.x+P,y=this.y+P,g=this.g;g.save();g.beginPath();g.rect(x-P,y-P,w+2*P,h+2*P);g.clip();g.translate(x,y);g.textBaseline='alphabetic';g.textAlign='left';fn(g,w,h);g.restore();this.x+=w+2*P;this.rowH=Math.max(this.rowH,h+2*P);
    return{rc:[x/this.w,1-(y+h)/this.h,w/this.w,h/this.h],l:'flat',m:1}}}
const F_SANS="'Inter','Helvetica Neue',Arial,sans-serif",F_HEAD="'Bebas Neue','Barlow Condensed','Arial Narrow',Impact,sans-serif",F_SERIF="Georgia,'Times New Roman',serif",F_SCRIPT="'Brush Script MT','Segoe Script','Snell Roundhand',cursive";
function font(px,w,fam){return`${w||700} ${px}px ${fam||F_SANS}`}
function text(g,s,x,y,f,c,al,maxW){g.font=f;g.fillStyle=c;g.textAlign=al||'left';g.textBaseline='alphabetic';if(maxW)g.fillText(s,x,y,maxW);else g.fillText(s,x,y)}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath()}
/* fit a line of text into maxW by shrinking the font; returns the size used */
function fitText(g,s,x,y,px,w,fam,c,al,maxW){let p=px;g.font=font(p,w,fam);while(p>6&&g.measureText(s).width>maxW){p-=1;g.font=font(p,w,fam)}g.fillStyle=c;g.textAlign=al||'left';g.textBaseline='alphabetic';g.fillText(s,x,y);return p}


/* ============================== RUNTIME-PAINTED LAYERS (join the photo layers in the array) ============================== */
function pnoise(g,S,n,a,seed){const r=RNG(seed||5);for(let i=0;i<n;i++){g.fillStyle=r()<0.5?`rgba(0,0,0,${a*r()})`:`rgba(255,255,255,${a*r()})`;const s=1+r()*3;g.fillRect(r()*S,r()*S,s,s)}}
PAINT.flat={gloss:0.1,fn(g,S){pnoise(g,S,900,0.03,3)}};
PAINT.semi={gloss:0.5,fn(g,S){pnoise(g,S,500,0.02,4)}};
PAINT.gloss={gloss:0.93,fn(g,S){}};
PAINT.emit={gloss:0.0,fn(g,S){}};
/* 8x8 product labels: boxes, cans, packs. Each cell has its own colour scheme and pseudo typography (no real brands) */
PAINT.labels={gloss:0.45,fn(g,S){const r=RNG(77),n=8,c=S/n,pal=['#c8102e','#005eb8','#ffd100','#2e7d32','#f4f1ea','#ff7a00','#6a1b9a','#00a3ad','#3e2723','#e91e63','#1b1b1f','#8bc34a','#f5e6c8','#0d47a1','#b71c1c','#fafafa'];
  for(let i=0;i<64;i++){const x=(i%n)*c,y=Math.floor(i/n)*c,bg=r.p(pal),fg=lum(bg)>0.6?r.p(['#1b1b1f','#c8102e','#0d47a1','#2e7d32']):r.p(['#ffffff','#ffd100','#f4f1ea']);g.fillStyle=bg;g.fillRect(x,y,c,c);const st=r.i(0,4);
    g.fillStyle=fg;if(st===0){g.fillRect(x,y+c*0.3,c,c*0.34);g.fillStyle=bg}else if(st===1){g.beginPath();g.ellipse(x+c/2,y+c*0.45,c*0.38,c*0.24,0,0,TAU2);g.fill();g.fillStyle=bg}else if(st===2){g.fillRect(x,y,c,c*0.22);g.fillRect(x,y+c*0.8,c,c*0.2)}else if(st===3){g.beginPath();g.moveTo(x,y+c*0.75);g.lineTo(x+c,y+c*0.45);g.lineTo(x+c,y+c);g.lineTo(x,y+c);g.fill()}
    g.fillRect(x+c*0.2,y+c*0.4,c*0.6,c*0.07);g.fillRect(x+c*0.3,y+c*0.52,c*0.4,c*0.04);g.fillStyle=st===2?fg:(lum(bg)>0.6?'#333':'#fff');g.fillRect(x+c*0.25,y+c*0.64,c*0.5,c*0.03);
    g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;g.strokeRect(x+0.5,y+0.5,c-1,c-1)}}};
/* 4x4 pastry / bread / food tops */
PAINT.pastry={gloss:0.3,fn(g,S){const c=S/4,r=RNG(9);const cell=(i,fn)=>{g.save();g.translate((i%4)*c,Math.floor(i/4)*c);g.beginPath();g.rect(0,0,c,c);g.clip();fn();g.restore()};
  const crust=(a,b)=>{const gr=g.createLinearGradient(0,0,c,c);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,c,c);for(let k=0;k<160;k++){g.fillStyle=`rgba(${r()<0.5?'70,35,10':'255,220,150'},${0.10*r()})`;g.beginPath();g.ellipse(r()*c,r()*c,2+r()*5,1+r()*2,r()*3,0,TAU2);g.fill()}};
  cell(0,()=>{crust('#d99a48','#b8742a');g.strokeStyle='rgba(110,55,15,.55)';g.lineWidth=c*0.05;for(let k=-2;k<8;k++){g.beginPath();g.moveTo(k*c*0.2,0);g.lineTo(k*c*0.2+c*0.35,c);g.stroke()}});/* croissant layers */
  cell(1,()=>{crust('#c98a3c','#a86a26');g.strokeStyle='rgba(245,225,180,.8)';g.lineWidth=c*0.045;for(let k=0;k<5;k++){g.beginPath();g.moveTo(c*0.08+k*c*0.2,c*0.15);g.lineTo(c*0.2+k*c*0.2,c*0.85);g.stroke()}});/* baguette scores */
  cell(2,()=>{crust('#e9d3a0','#d9b877');const fr=['#b3122a','#7a1030','#f0b429','#3a6b1f','#f2e9d0'];for(let k=0;k<26;k++){g.fillStyle=r.p(fr);g.beginPath();g.arc(r()*c,r()*c,c*0.07+r()*c*0.04,0,TAU2);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(r()*c,r()*c,c*0.015,0,TAU2);g.fill()}});/* fruit tart */
  cell(3,()=>{g.fillStyle='#4a2714';g.fillRect(0,0,c,c);g.strokeStyle='#6b3a1c';g.lineWidth=c*0.04;for(let k=0;k<5;k++){g.beginPath();g.arc(c/2,c/2,c*0.1*(k+1),0,TAU2);g.stroke()}g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(c*0.35,c*0.3,c*0.15,c*0.06,-0.6,0,TAU2);g.fill()});/* chocolate glaze */
  cell(4,()=>{crust('#f0d9a8','#e3c181');g.fillStyle='rgba(255,255,255,.85)';for(let k=0;k<60;k++){g.beginPath();g.arc(r()*c,r()*c,c*0.012+r()*c*0.012,0,TAU2);g.fill()}});/* sugar dusted */
  cell(5,()=>{crust('#c79552','#a26c2e');g.fillStyle='#3b1f0f';for(let k=0;k<22;k++){g.beginPath();g.ellipse(r()*c,r()*c,c*0.045,c*0.035,r()*3,0,TAU2);g.fill()}});/* choc-chip cookie */
  cell(6,()=>{g.fillStyle='#f6f0e2';g.fillRect(0,0,c,c);g.fillStyle='#e7c9d3';g.fillRect(0,c*0.3,c,c*0.12);g.fillStyle='#8c5a2b';g.fillRect(0,c*0.62,c,c*0.14);g.fillStyle='#f2e3b8';g.fillRect(0,c*0.76,c,c*0.24)});/* layered cake side */
  cell(7,()=>{crust('#b98045','#8a5a26');for(let k=0;k<70;k++){g.fillStyle=r.p(['#f3e7c9','#e6d3a0','#2b1a0e']);g.beginPath();g.ellipse(r()*c,r()*c,c*0.02,c*0.012,r()*3,0,TAU2);g.fill()}});/* seeded loaf */
  cell(8,()=>{g.fillStyle='#f4efe4';g.fillRect(0,0,c,c);const cs=['#c0392b','#58a03c','#f1c40f','#e8dcc0','#7b3f1d'];for(let k=0;k<5;k++){g.fillStyle=cs[k];g.fillRect(0,c*(0.12+k*0.16),c,c*0.12)}});/* sandwich filling side */
  cell(9,()=>{g.fillStyle='#e6b85c';g.fillRect(0,0,c,c);for(let k=0;k<50;k++){g.fillStyle=r.p(['#f3d488','#d99a3a','#f7e3a6']);g.fillRect(r()*c,r()*c,c*0.3,c*0.05)}});/* fries */
  cell(10,()=>{crust('#c8873a','#9a5a1e');for(let k=0;k<90;k++){g.fillStyle=`rgba(${r()<0.5?'235,190,110':'90,45,12'},.5)`;g.beginPath();g.arc(r()*c,r()*c,c*0.03+r()*c*0.03,0,TAU2);g.fill()}});/* fried chicken crust */
  cell(11,()=>{g.fillStyle='#f3efe6';g.fillRect(0,0,c,c);for(let k=0;k<40;k++){g.fillStyle=r.p(['#d8402c','#5d9c3a','#f0c53a','#8a4a8f','#f7f3ea','#2f2f2f']);g.beginPath();g.ellipse(r()*c,r()*c,c*0.07,c*0.04,r()*3,0,TAU2);g.fill()}});/* salad */
  cell(12,()=>{g.fillStyle='#f7f5ef';g.fillRect(0,0,c,c);g.fillStyle='rgba(120,160,90,.5)';for(let k=0;k<40;k++){g.beginPath();g.arc(r()*c,r()*c,c*0.012,0,TAU2);g.fill()}});/* tzatziki / cream */
  cell(13,()=>{g.fillStyle='#c62f22';g.fillRect(0,0,c,c);for(let k=0;k<30;k++){g.fillStyle=r.p(['#e04a35','#a82318','#f0d9a0']);g.beginPath();g.arc(r()*c,r()*c,c*0.06,0,TAU2);g.fill()}});/* tomato */
  cell(14,()=>{crust('#e8d5a8','#d4b97c');g.fillStyle='rgba(120,70,20,.35)';for(let k=0;k<24;k++){g.beginPath();g.ellipse(r()*c,r()*c,c*0.06,c*0.04,r()*3,0,TAU2);g.fill()}});/* pita */
  cell(15,()=>{g.fillStyle='#3a2416';g.fillRect(0,0,c,c);for(let k=0;k<200;k++){g.fillStyle=r.p(['#5b3a22','#2a1a10','#7a5234']);g.beginPath();g.ellipse(r()*c,r()*c,c*0.03,c*0.02,r()*3,0,TAU2);g.fill()}})/* coffee beans */}};
/* gyro meat: stacked slices, tinted by the vertex colour */
PAINT.meat={gloss:0.55,fn(g,S){const r=RNG(31);g.fillStyle='#d8c0a0';g.fillRect(0,0,S,S);for(let y=0;y<S;y+=S/26){const h=S/26*(0.7+r()*0.7);for(let x=0;x<S;){const w=S*(0.05+r()*0.14);const v=150+r()*90;g.fillStyle=`rgb(${v},${v*0.82|0},${v*0.62|0})`;g.fillRect(x,y,w+1,h);if(r()<0.4){g.fillStyle='rgba(60,25,8,.55)';g.fillRect(x,y+h*0.7,w,h*0.35)}x+=w}}
  for(let k=0;k<700;k++){g.fillStyle=`rgba(45,18,5,${0.25*r()})`;g.beginPath();g.ellipse(r()*S,r()*S,2+r()*9,1+r()*3,0,0,TAU2);g.fill()}for(let k=0;k<160;k++){g.fillStyle='rgba(255,240,210,.35)';g.fillRect(r()*S,r()*S,1+r()*6,1)}}};
/* 4x4 cloth patterns (white-ish base so the vertex colour tints them) */
PAINT.cloth={gloss:0.04,fn(g,S){const c=S/4,r=RNG(15);for(let i=0;i<16;i++){const x=(i%4)*c,y=Math.floor(i/4)*c;g.save();g.beginPath();g.rect(x,y,c,c);g.clip();g.translate(x,y);g.fillStyle='#f2f0ec';g.fillRect(0,0,c,c);const st=i%8;
      if(st===1){g.fillStyle='rgba(0,0,0,.35)';for(let k=0;k<c;k+=c/8)g.fillRect(k,0,c/16,c)}else if(st===2){g.fillStyle='rgba(0,0,0,.28)';for(let k=0;k<c;k+=c/6){g.fillRect(k,0,c/12,c);g.fillRect(0,k,c,c/12)}}
      else if(st===3){g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=1;for(let k=-c;k<c;k+=5){g.beginPath();g.moveTo(k,0);g.lineTo(k+c,c);g.stroke()}}else if(st===4){g.fillStyle='rgba(0,0,0,.3)';for(let k=0;k<60;k++){g.beginPath();g.arc(r()*c,r()*c,c*0.025,0,TAU2);g.fill()}}
      else if(st===5){g.fillStyle='rgba(0,0,0,.25)';for(let k=0;k<c;k+=c/10)g.fillRect(0,k,c,c/30)}else if(st===6){g.strokeStyle='rgba(0,0,0,.18)';for(let k=0;k<c;k+=4){g.beginPath();g.moveTo(0,k);for(let q=0;q<=c;q+=4)g.lineTo(q,k+((q/4)%2?2:-2));g.stroke()}}
      else if(st===7){g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,c*0.4,c,c*0.2)}
      for(let k=0;k<300;k++){g.fillStyle=`rgba(0,0,0,${0.05*r()})`;g.fillRect(r()*c,r()*c,1,2)}g.restore()}}};
/* 4x4: rows of book spines (cells 0-7), magazines / records / frames (8-15) */
PAINT.books={gloss:0.25,fn(g,S){const c=S/4,r=RNG(52),pal=['#7a1f1f','#1f3a5f','#2f5d3a','#c9a227','#e8e2d0','#3a2a4d','#b85c2e','#1d1d1f','#8c8c8c','#0e6b6b','#d9d0bd','#5a1e3a'];
  for(let i=0;i<16;i++){const x0=(i%4)*c,y0=Math.floor(i/4)*c;g.save();g.beginPath();g.rect(x0,y0,c,c);g.clip();g.translate(x0,y0);g.fillStyle='#2a2018';g.fillRect(0,0,c,c);
    if(i<8){for(let x=0;x<c;){const w=c*(0.05+r()*0.09),h=c*(0.78+r()*0.2),col=r.p(pal);g.fillStyle=col;g.fillRect(x,c-h,w-1,h);g.fillStyle=lum(col)>0.5?'rgba(0,0,0,.6)':'rgba(255,255,255,.7)';g.fillRect(x+w*0.3,c-h+h*0.15,w*0.3,h*0.45);g.fillRect(x+1,c-h*0.14,w-3,2);x+=w}}
    else{const col=r.p(pal);g.fillStyle=col;g.fillRect(0,0,c,c);g.fillStyle=lum(col)>0.5?'#222':'#f2efe6';g.fillRect(c*0.1,c*0.08,c*0.8,c*0.16);g.fillStyle=r.p(pal);g.fillRect(c*0.1,c*0.3,c*0.8,c*0.5);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(c*0.1,c*0.85,c*0.5,c*0.04)}
    g.restore()}}};
/* 4x4 produce: top views of crates packed with fruit and vegetables */
PAINT.produce={gloss:0.35,fn(g,S){const c=S/4,r=RNG(63),kinds=[['#f28c1c','#d96f0c'],['#c8202a','#8e121c'],['#e23b2e','#b7261d'],['#f4d21f','#d8b40e'],['#7cb342','#558b2f'],['#d32f2f','#f9a825'],['#f1dd38','#cdb81f'],['#b98d5a','#8d6a3f'],['#5b2a6e','#3d1a4b'],['#8bc34a','#33691e'],['#e8e0c8','#cfc4a2'],['#ff8f5a','#e0683a'],['#a5d06a','#6d9c3a'],['#7b1e2b','#4d1019'],['#f5f0e0','#ddd5bd'],['#3f7d2a','#27521a']];
  for(let i=0;i<16;i++){const x0=(i%4)*c,y0=Math.floor(i/4)*c,[a,b]=kinds[i],rad=c*(i===4||i===9||i===15?0.16:0.085);g.save();g.beginPath();g.rect(x0,y0,c,c);g.clip();g.translate(x0,y0);g.fillStyle=b;g.fillRect(0,0,c,c);
    for(let y=rad*0.6;y<c+rad;y+=rad*1.7)for(let x=rad*0.6+((Math.round(y/rad)%2)?rad*0.8:0);x<c+rad;x+=rad*1.8){const gx=x+r.r(-2,2),gy=y+r.r(-2,2),gr=g.createRadialGradient(gx-rad*0.3,gy-rad*0.3,rad*0.1,gx,gy,rad);gr.addColorStop(0,hexMix(a,'#ffffff',0.35));gr.addColorStop(0.5,a);gr.addColorStop(1,b);g.fillStyle=gr;g.beginPath();g.arc(gx,gy,rad,0,TAU2);g.fill()}
    g.restore()}}};
/* vertical half-round timber slats (white base; tint with oak) */
PAINT.slats={gloss:0.3,fn(g,S){const n=16,w=S/n;for(let i=0;i<n;i++){const gr=g.createLinearGradient(i*w,0,(i+1)*w,0);gr.addColorStop(0,'#5a5148');gr.addColorStop(0.18,'#cfc7bd');gr.addColorStop(0.5,'#ffffff');gr.addColorStop(0.82,'#cbc2b6');gr.addColorStop(1,'#4d463e');g.fillStyle=gr;g.fillRect(i*w,0,w+1,S)}const r=RNG(8);for(let k=0;k<500;k++){g.fillStyle=`rgba(90,60,30,${0.08*r()})`;g.fillRect(r()*S,r()*S,1,10+r()*50)}}};
/* perforated / slotted metal: vents, speaker grilles, baskets, hood filters */
PAINT.grille={gloss:0.6,fn(g,S){g.fillStyle='#d6d8da';g.fillRect(0,0,S,S);g.fillStyle='#2a2b2d';const n=24,c=S/n;for(let y=0;y<n;y++)for(let x=0;x<n;x++){g.fillRect(x*c+c*0.15,y*c+c*0.3,c*0.7,c*0.4)}}};
/* keyboard / control panel / buttons sheet 4x4 */
PAINT.panel={gloss:0.5,fn(g,S){const c=S/4,r=RNG(21);for(let i=0;i<16;i++){const x0=(i%4)*c,y0=Math.floor(i/4)*c;g.save();g.translate(x0,y0);g.fillStyle=i<4?'#1c1d20':i<8?'#e9e9e6':i<12?'#2b2f36':'#c9ccd0';g.fillRect(0,0,c,c);
    if(i%4===0){const k=6;for(let y=0;y<k;y++)for(let x=0;x<k;x++){g.fillStyle=i<8&&i>=4?'#c8c8c4':'#3a3d44';g.fillRect(c*0.08+x*c*0.14,c*0.08+y*c*0.14,c*0.11,c*0.11)}}
    else if(i%4===1){g.fillStyle='#0d1b2a';g.fillRect(c*0.08,c*0.08,c*0.84,c*0.5);g.fillStyle='#3fd27a';g.fillRect(c*0.14,c*0.16,c*0.5,c*0.06);g.fillStyle='#e0e6ee';g.fillRect(c*0.14,c*0.3,c*0.7,c*0.04);g.fillRect(c*0.14,c*0.4,c*0.4,c*0.04);for(let x=0;x<4;x++){g.fillStyle=r.p(['#d9534f','#f0ad4e','#5cb85c','#5bc0de']);g.fillRect(c*0.1+x*c*0.21,c*0.68,c*0.16,c*0.2)}}
    else if(i%4===2){for(let k=0;k<3;k++){g.fillStyle='#888c92';g.beginPath();g.arc(c*(0.2+k*0.3),c*0.3,c*0.1,0,TAU2);g.fill();g.fillStyle='#222';g.fillRect(c*(0.2+k*0.3)-1,c*0.2,2,c*0.1)}g.fillStyle='#d33';g.beginPath();g.arc(c*0.2,c*0.72,c*0.05,0,TAU2);g.fill();g.fillStyle='#3c3';g.beginPath();g.arc(c*0.4,c*0.72,c*0.05,0,TAU2);g.fill()}
    else{g.strokeStyle=i<8&&i>=4?'#999':'#555';g.lineWidth=2;for(let y=0;y<8;y++){g.beginPath();g.moveTo(c*0.08,c*0.1+y*c*0.11);g.lineTo(c*0.92,c*0.1+y*c*0.11);g.stroke()}}
    g.restore()}}};
/* small square mosaic / woven mat patterns used on rugs: 2x2 */
PAINT.rug={gloss:0.02,fn(g,S){const c=S/2,r=RNG(33);const sch=[['#7a2e2e','#d9c7a3','#2d3a4f'],['#2f4858','#e8dcc4','#b5651d'],['#8a8f98','#e9e6df','#44474d'],['#3d5a45','#e3d9c0','#a0522d']];
  for(let i=0;i<4;i++){const [a,b,d]=sch[i];g.save();g.translate((i%2)*c,Math.floor(i/2)*c);g.fillStyle=a;g.fillRect(0,0,c,c);g.strokeStyle=b;g.lineWidth=c*0.03;g.strokeRect(c*0.06,c*0.06,c*0.88,c*0.88);g.strokeStyle=d;g.strokeRect(c*0.12,c*0.12,c*0.76,c*0.76);
    g.fillStyle=b;for(let k=0;k<5;k++){g.save();g.translate(c/2,c*(0.25+k*0.125));g.rotate(PI/4);g.fillRect(-c*0.05,-c*0.05,c*0.1,c*0.1);g.restore()}for(let k=0;k<1500;k++){g.fillStyle=`rgba(0,0,0,${0.06*r()})`;g.fillRect(r()*c,r()*c,2,1)}g.restore()}}};

/* ============================== FURNITURE KIT (local metres; y = 0 is the finished floor) ==============================
   Every builder writes into the current build context X: X.L (lit, photo array), X.B (unlit boards), X.G (glass), X.bd (board canvas atlas),
   X.segs (collision, local), X.pools (baked light pools), X.pl (real point lights), X.ppl (people), X.use (interactions). */
let X=null;
const t_=n=>M(n),FLAT=M('flat'),GLOSS=M('gloss'),SEMI=M('semi'),EMIT=M('emit');
function seg(ax,az,bx,bz,kind){X.segs.push([ax,az,bx,bz,kind||'p'])}
/* rectangle collision around a footprint centred at cx,cz (sx along local x before rotation ry) */
function colBox(cx,cz,sx,sz,ry,kind){const c=Math.cos(ry||0),s=Math.sin(ry||0),P=[[-sx/2,-sz/2],[sx/2,-sz/2],[sx/2,sz/2],[-sx/2,sz/2]].map(([x,z])=>[cx+x*c+z*s,cz-x*s+z*c]);for(let i=0;i<4;i++){const a=P[i],b=P[(i+1)%4];seg(a[0],a[1],b[0],b[1],kind)}}
function colRound(cx,cz,r){const n=8;for(let i=0;i<n;i++){const a=i/n*TAU2,b=(i+1)/n*TAU2;seg(cx+Math.cos(a)*r,cz+Math.sin(a)*r,cx+Math.cos(b)*r,cz+Math.sin(b)*r)}}
/* a baked warm light pool: brightens vertex colours around (x,y,z) */
function pool(x,y,z,hex,i,r){X.pools.push({x,y,z,c:hx(hex||'#ffd9a8'),i:i==null?1:i,r:r||4})}
/* a real point light (max 3 per interior; specular sparkle + moving people get lit) */
function plight(x,y,z,hex,i,d){if(X.pl.length<3)X.pl.push({x,y,z,c:hex||'#ffd2a0',i:i||1,d:d||9})}
function use(x,z,label,fn,r){X.use.push({x,z,label,fn,r:r||1.4})}
function person(spec,x,z,yaw,act,opt){if(X.ppl.length<6)X.ppl.push({spec,x,z,yaw,act,opt})}

/* ---------- small helpers that paint into the board atlas ---------- */
function boardTile(w,h,fn){return X.bd.paint(w,h,fn)}
/* text panel on the board mesh. o:{fg,bg,font,size,w (px per m),glow:0 const|1 day|0.5 night,ry,align,pad,sub} */
function textPanel(x,y,z,w,h,s,o){o=o||{};const ppm=o.ppm||160,W=Math.min(1000,Math.max(16,w*ppm)),H=Math.min(400,Math.max(8,h*ppm*(W/(w*ppm))));
  const tl=boardTile(W,H,(g,W,H)=>{if(o.bg){g.fillStyle=o.bg;g.fillRect(0,0,W,H)}else g.clearRect(0,0,W,H);const lines=String(s).split('\n'),n=lines.length,lh=H/(n+(o.sub?0.6:0.25));
    lines.forEach((ln,i)=>fitText(g,ln,o.align==='left'?W*0.05:W/2,lh*(i+0.82)+(o.top||0),Math.round(lh*(o.scale||0.78)),o.w||700,o.fam||F_SANS,o.fg||'#fff',o.align==='left'?'left':'center',W*0.92))});
  X.B.panel(x,y,z,w,h,WH,tl,{ry:o.ry||0,gl:o.glow==null?0:o.glow});return tl}
function picture(x,y,z,w,h,ry,paint,frameHex){const fr=0.035;X.L.push(x,y,z,ry||0);X.L.box(0,-h/2-fr,-0.015,w+fr*2,h+fr*2,0.03,hx(frameHex||'#2a2420'),M('wood_dark'),{fit:[1,1]});X.L.pop();
  const tl=boardTile(Math.round(w*170),Math.round(h*170),paint);X.B.panel(x+Math.sin(ry||0)*0.006,y,z+Math.cos(ry||0)*0.006,w,h,WH,tl,{ry:ry||0});
  /* boards sit 1 mm in front of the frame: shift along the facing */
  return tl}

/* ---------- ROOM SHELL ----------
   o:{x0,x1,d,h, floor:[tile,hex], wall:[tile,hex], wains:{h,tile,hex}?, ceil:[tile,hex], door:{x,w,h}, win:[[x0,x1,y0,y1],...] (front wall), skirt:hex,
      side windows: winL/winR [[z0,z1,y0,y1]]} — walls are collision kind 'b' (the camera stops at them) */
function room(o){const {x0,x1,d,h}=o,L=X.L,fl=o.floor||['fl_stone','#ffffff'],wl=o.wall||['plaster','#f2efe8'],ce=o.ceil||['ceiling','#f4f2ee'];X.box={x0,x1,z0:-d,z1:0,h};
  L.grid(x0,-d,x1,0,0,1.2,hx(fl[1]),M(fl[0]),{rot:o.floorRot});
  L.grid(x0,-d,x1,0,h,1.6,hx(ce[1]),M(ce[0]),{up:-1});
  const door=o.door||{x:0,w:1.9,h:2.25};const fh=[[x1-(door.x+door.w/2),x1-(door.x-door.w/2),-0.01,door.h]];for(const w of(o.win||[]))fh.push([x1-w[1],x1-w[0],w[2],w[3]]);
  /* back wall (holesB in metres from x0), left wall runs z=0 -> -d (s=-z), right wall -d -> 0 (s=z+d), front wall x1 -> x0 (s=x1-x) */
  const W=[[x0,-d,x1,-d,o.holesB||[]],[x0,0,x0,-d,(o.winL||[]).map(q=>[-q[1],-q[0],q[2],q[3]])],[x1,-d,x1,0,(o.winR||[]).map(q=>[q[0]+d,q[1]+d,q[2],q[3]])],[x1,0,x0,0,fh]];
  for(const [ax,az,bx,bz,holes] of W){const wa=o.wains;if(wa){L.wall(ax,az,bx,bz,0,wa.h,hx(wa.hex),M(wa.tile),{holes,ys:[0.12,0.5]});L.wall(ax,az,bx,bz,wa.h,h,hx(wl[1]),M(wl[0]),{holes,ys:[1.7,2.4]});
      if(wa.rail!==false){const dx=bx-ax,dz=bz-az,Ln=Math.hypot(dx,dz),ux=dx/Ln,uz=dz/Ln,nx=-uz,nz=ux;let s0=0;const cuts=holes.filter(q=>q[2]<wa.h+0.04).map(q=>[q[0],q[1]]).sort((a,b)=>a[0]-b[0]);cuts.push([Ln,Ln]);
        for(const c of cuts){if(c[0]-s0>0.05){const m=(s0+c[0])/2;L.box(ax+ux*m+nx*0.012,wa.h-0.02,az+uz*m+nz*0.012,c[0]-s0,0.045,0.025,hx(wa.railHex||'#6b4a2e'),M('wood_dark'),{ry:Math.atan2(ux,uz)+PI/2})}s0=Math.max(s0,c[1])}}}
    else L.wall(ax,az,bx,bz,0,h,hx(wl[1]),M(wl[0]),{holes});
    seg(ax,az,bx,bz,'b');
    if(o.skirt!==false){const dx=bx-ax,dz=bz-az,Ln=Math.hypot(dx,dz),ux=dx/Ln,uz=dz/Ln,nx=-uz,nz=ux;let s0=0;const cuts=holes.filter(q=>q[2]<0.1).map(q=>[q[0],q[1]]).sort((a,b)=>a[0]-b[0]);cuts.push([Ln,Ln]);
      for(const c of cuts){if(c[0]-s0>0.05){const m=(s0+c[0])/2;L.box(ax+ux*m+nx*0.008,0,az+uz*m+nz*0.008,c[0]-s0,0.09,0.016,hx(o.skirt||'#3a3633'),SEMI,{ry:Math.atan2(ux,uz)+PI/2,f:'zt'})}s0=Math.max(s0,c[1])}}}
  /* cornice shadow line */
  return X.box}

/* the street seen through the front glass: a soft daylight painting on the board mesh (multiplied by the daylight colour) */
function streetView(x0,x1,y0,y1,z,seed){const r=RNG(seed||3),W=Math.round(cl((x1-x0)*90,128,900)),H=Math.round(cl((y1-y0)*90,64,400));
  const tl=boardTile(W,H,(g,W,H)=>{const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#dfe9f2');sky.addColorStop(0.55,'#f4efe6');sky.addColorStop(1,'#cdbfae');g.fillStyle=sky;g.fillRect(0,0,W,H);
    /* opposite facades */let x=-r()*40;while(x<W){const w=60+r()*120,top=H*(0.05+r()*0.25),c=['#efe6d6','#e8d7bf','#f3efe7','#dcc7a8','#e9dfd0','#cdb79a'][r.i(0,5)];g.fillStyle=c;g.fillRect(x,top,w,H*0.62-top);
      g.fillStyle='rgba(70,80,90,.35)';for(let wy=top+12;wy<H*0.5;wy+=26)for(let wx=x+8;wx<x+w-14;wx+=22)g.fillRect(wx,wy,11,15);g.fillStyle=['#2f4f3a','#7a2e22','#22303f','#5e4630'][r.i(0,3)];g.fillRect(x+4,H*0.5,w-8,H*0.12);x+=w+2}
    /* trees */for(let k=0;k<4;k++){const tx=r()*W,ty=H*(0.15+r()*0.2);const gr=g.createRadialGradient(tx,ty,4,tx,ty,60+r()*40);gr.addColorStop(0,'rgba(86,112,60,.85)');gr.addColorStop(1,'rgba(86,112,60,0)');g.fillStyle=gr;g.fillRect(tx-110,ty-110,220,220)}
    /* pavement and road */g.fillStyle='#b8aa98';g.fillRect(0,H*0.62,W,H*0.16);g.fillStyle='#7d7a77';g.fillRect(0,H*0.78,W,H*0.22);g.fillStyle='#d9d4cc';g.fillRect(0,H*0.775,W,3);
    /* parked cars and passers-by as soft blobs */for(let k=0;k<3;k++){const cx=r()*W;g.fillStyle=['#2b3440','#9ea3a8','#6d1f1f','#e9e9e9'][r.i(0,3)];rrect(g,cx,H*0.8,80,26,10);g.fill()}
    for(let k=0;k<4;k++){const px=r()*W;g.fillStyle='rgba(40,40,45,.55)';g.fillRect(px,H*0.5,8,H*0.24);g.beginPath();g.arc(px+4,H*0.48,5,0,TAU2);g.fill()}
    g.filter='blur(2px)';g.drawImage(g.canvas,0,0,1,1,0,0,1,1);g.filter='none';const veil=g.createLinearGradient(0,0,0,H);veil.addColorStop(0,'rgba(255,255,255,.35)');veil.addColorStop(1,'rgba(255,255,255,.08)');g.fillStyle=veil;g.fillRect(0,0,W,H)});
  X.B.face([x1,y0,z],[x0,y0,z],[x0,y1,z],[x1,y1,z],WH,tl,{gl:1})}

/* front glazing + door seen from inside: frames (hex), glass panes (G), handles, an EXIT sign above the door and the street beyond */
function frontage(o){const L=X.L,fr=hx(o.frame||'#1a1a1c'),door=o.door,b=X.box,ft=0.05;
  const panes=(o.win||[]).concat([[door.x-door.w/2,door.x+door.w/2,0,door.h]]);
  streetView(b.x0,b.x1,-0.3,Math.min(b.h,4.2),1.6,o.seed);
  for(const [a0,a1,y0,y1] of panes){/* frame */L.box((a0+a1)/2,y1,-0.03,a1-a0+ft*2,ft,0.08,fr,SEMI);if(y0>0.02)L.box((a0+a1)/2,y0-ft,-0.03,a1-a0+ft*2,ft,0.08,fr,SEMI);
    L.box(a0-ft/2,Math.max(0,y0-ft),-0.03,ft,y1-y0+ft*(y0>0.02?2:1),0.08,fr,SEMI);L.box(a1+ft/2,Math.max(0,y0-ft),-0.03,ft,y1-y0+ft*(y0>0.02?2:1),0.08,fr,SEMI);
    X.G.face([a1,y0,0.02],[a0,y0,0.02],[a0,y1,0.02],[a1,y1,0.02],hx('#cfe0e6'),FLAT);
    /* glazing bars */if(o.bars&&a1-a0>1.2){const n=Math.round((a1-a0)/(o.bars.w||1.2));for(let i=1;i<n;i++){const x=a0+(a1-a0)*i/n;L.box(x,y0,-0.02,0.035,y1-y0,0.05,fr,SEMI)}for(const yy of(o.bars.y||[]))if(yy>y0&&yy<y1)L.box((a0+a1)/2,yy,-0.02,a1-a0,0.035,0.05,fr,SEMI)}}
  /* door leaves */const dl=door.w/2;for(const s of[-1,1]){const cx=door.x+s*dl/2;L.box(cx+s*(dl/2-0.03),0,-0.02,0.06,door.h,0.05,fr,SEMI);L.box(cx,0,-0.02,dl,0.12,0.05,fr,SEMI);
    L.tube([door.x+s*0.09,0.55,-0.08],[door.x+s*0.09,1.75,-0.08],0.017,8,hx('#c8ccd0'),M('steel'));L.box(door.x+s*0.09,0.6,-0.05,0.03,0.03,0.05,hx('#c8ccd0'),M('steel'));L.box(door.x+s*0.09,1.7,-0.05,0.03,0.03,0.05,hx('#c8ccd0'),M('steel'))}
  L.box(door.x,0,0.0,door.w+0.1,0.012,0.12,hx('#8a8d90'),M('steel'));
  /* doormat */L.box(door.x,0,-0.65,Math.min(1.6,door.w),0.012,0.9,hx(o.mat||'#2a2a2a'),M('carpet'),{f:'xXzZt'});
  /* EXIT sign (glowing) */const ey=Math.min(door.h+0.32,b.h-0.2);L.box(door.x,ey-0.12,-0.04,0.42,0.18,0.06,hx('#f2f2f2'),SEMI);
  textPanel(door.x,ey-0.03,-0.075,0.38,0.14,'EXIT · ΕΞΟΔΟΣ',{bg:'#0f8a3c',fg:'#ffffff',ppm:400,scale:0.62});
  pool(door.x,2,-1.2,'#dfe8ff',0.35,4)}

/* ---------- TABLES, CHAIRS, SEATING ---------- */
function table(x,z,o){o=o||{};const L=X.L,h=o.h||0.75,w=o.w||0.7,d=o.d||w,top=o.top||M('marble'),tc=hx(o.topHex||'#ffffff'),bc=hx(o.base||'#1b1b1d'),ry=o.ry||0;L.push(x,0,z,ry);
  if(o.round){L.cyl(0,h-0.03,0,w/2,w/2,0.03,20,tc,top,{cap:true,capFit:true});}else L.box(0,h-0.03,0,w,0.03,d,tc,top,{fit:[1,1],tt:top});
  if(o.legs===4){const lx=w/2-0.05,lz=d/2-0.05;for(const [a,b] of[[lx,lz],[-lx,lz],[lx,-lz],[-lx,-lz]])L.box(a,0,b,0.04,h-0.03,0.04,bc,o.legT||SEMI);L.box(0,h-0.1,lz,w-0.1,0.07,0.02,bc,o.legT||SEMI);L.box(0,h-0.1,-lz,w-0.1,0.07,0.02,bc,o.legT||SEMI)}
  else{L.cyl(0,0.02,0,0.035,0.035,h-0.05,8,bc,SEMI);for(let i=0;i<4;i++){const a=i*PI/2+PI/4;L.push(0,0,0,a);L.box(0,0,0.18,0.05,0.035,0.36,bc,SEMI);L.pop()}L.cyl(0,h-0.07,0,0.1,0.1,0.04,10,bc,SEMI,{cap:true})}
  if(o.lay){const r=RNG(Math.round(x*97+z*13));/* napkin holder, salt/pepper, a glass */L.box(0.0,h,0,0.1,0.09,0.05,hx('#c9ccd0'),M('steel'));L.box(0,h+0.01,0,0.08,0.075,0.04,hx('#ffffff'),FLAT,{f:'t'});
    L.cyl(0.11,h,0.04,0.018,0.016,0.07,8,hx('#f4f4f4'),GLOSS,{cap:true});L.cyl(0.15,h,0.04,0.018,0.016,0.07,8,hx('#2a2a2a'),GLOSS,{cap:true});
    if(o.lay>1)for(const s of[-1,1]){L.cyl(s*w*0.28,h,s*d*0.2,0.12,0.12,0.012,16,hx('#fbfbf8'),GLOSS,{cap:true,tc:hx(o.plateRim||'#fbfbf8')});L.cyl(-s*w*0.3,h,-s*d*0.05,0.032,0.036,0.11,10,hx('#dfeaea'),GLOSS,{cap:false})}}
  L.pop();if(!o.nocol){if(o.round)colRound(x,z,w/2*0.9);else colBox(x,z,w*0.9,d*0.9,ry)}}
/* chair facing yaw (the direction a seated person looks); style 'wood'|'arm'|'bistro'|'metal'|'stool'|'wish'|'plastic'|'office' */
function chair(x,z,yaw,o){o=o||{};const L=X.L,st=o.style||'wood',fc=hx(o.frame||(st==='metal'?'#2a2a2c':st==='bistro'?'#c9a24a':st==='plastic'?'#e8e6e0':'#5a3a24')),sc=hx(o.seat||'#5c6044'),ft=st==='metal'||st==='bistro'?SEMI:M(o.wood||'walnut');
  L.push(x,0,z,yaw);const sh=st==='stool'?0.76:0.45,sw=st==='arm'?0.5:0.44;
  if(st==='stool'){L.cyl(0,sh-0.04,0,0.18,0.18,0.06,14,sc,M('leather'),{cap:true});L.cyl(0,0,0,0.2,0.2,0.02,14,fc,SEMI,{cap:true});L.cyl(0,0.02,0,0.03,0.03,sh-0.06,8,fc,M('steel'));L.cyl(0,0.3,0,0.17,0.17,0.02,14,fc,M('steel'));L.pop();if(!o.nocol)colRound(x,z,0.2);return}
  const lg=0.035,hx2=sw/2-0.03;for(const [a,b] of[[hx2,0.18],[-hx2,0.18],[hx2,-0.18],[-hx2,-0.18]])L.box(a,0,b,lg,sh-0.03,lg,fc,ft);
  if(st==='plastic')L.box(0,sh-0.04,0,sw,0.04,0.44,fc,SEMI);else{L.box(0,sh-0.05,0,sw,0.03,0.44,fc,ft);L.box(0,sh-0.03,0.01,sw-0.04,0.05,0.4,sc,st==='wish'?M('cane'):st==='bistro'?M('cane'):M('fabric'),{bev:0.01})}
  /* back */const by=sh+0.02,bh=st==='arm'?0.3:0.42;if(st==='arm'){L.tube([-hx2,by+bh,-0.2],[hx2,by+bh,-0.2],0.022,8,fc,ft);L.tube([-hx2,by+bh,-0.2],[-hx2,by+0.18,0.16],0.02,8,fc,ft);L.tube([hx2,by+bh,-0.2],[hx2,by+0.18,0.16],0.02,8,fc,ft);
      L.tube([-hx2,sh,0.18],[-hx2,by+0.18,0.16],0.018,6,fc,ft);L.tube([hx2,sh,0.18],[hx2,by+0.18,0.16],0.018,6,fc,ft);for(const s of[-1,1])L.tube([s*hx2,sh,-0.2],[s*hx2,by+bh,-0.2],0.02,6,fc,ft)}
  else if(st==='wish'){L.tube([-hx2,sh,-0.2],[-hx2*0.9,by+bh,-0.22],0.018,6,fc,ft);L.tube([hx2,sh,-0.2],[hx2*0.9,by+bh,-0.22],0.018,6,fc,ft);L.tube([-hx2*0.9,by+bh,-0.22],[hx2*0.9,by+bh,-0.22],0.03,8,fc,ft);L.tube([0,sh,-0.2],[-hx2*0.6,by+bh,-0.22],0.012,5,fc,ft);L.tube([0,sh,-0.2],[hx2*0.6,by+bh,-0.22],0.012,5,fc,ft)}
  else{for(const s of[-1,1])L.box(s*hx2,sh-0.02,-0.2,lg,bh,lg,fc,ft);L.box(0,by+bh-0.1,-0.205,sw-0.03,st==='bistro'?0.18:0.1,0.025,st==='bistro'?hx('#e6dcc3'):fc,st==='bistro'?M('cane'):ft);if(st!=='metal')L.box(0,by+0.1,-0.205,sw-0.04,0.05,0.02,fc,ft)}
  L.pop();if(!o.nocol)colBox(x,z,0.4,0.4,yaw);X.seats.push({x,z,yaw,h:sh})}
/* built-in banquette centred at x,z, length len along local x after ry; the seat faces +z (back against a wall at local z = -d/2) */
function banquette(x,z,len,ry,o){o=o||{};const L=X.L,dep=o.d||0.55;L.push(x,0,z,ry||0);L.box(0,0,0,len,0.37,dep,hx(o.base||'#a8736a'),M(o.baseT||'tile_kitkat'),{f:'zXxt'});
  L.box(0,0.37,0.02,len,0.09,dep-0.04,hx(o.seat||'#5c6044'),M('fabric'));L.box(0,0.46,-dep/2+0.06,len,0.5,0.12,hx(o.back||o.seat||'#5c6044'),M('fabric'));
  const cs=o.cushions;if(cs){const n=Math.max(1,Math.floor(len/0.5));for(let i=0;i<n;i++){const xx=-len/2+(i+0.5)*(len/n);L.push(xx,0.47,-dep/2+0.2,0,-0.22);L.box(0,0,0,0.42,0.42,0.12,hx(cs[i%cs.length]),M('fabric'));L.pop()}}
  L.pop();colBox(x,z,len,dep,ry||0);const c=Math.cos(ry||0),s2=Math.sin(ry||0);for(let t=-len/2+0.4;t<=len/2-0.3;t+=0.75)X.seats.push({x:x+t*c+0.08*s2,z:z-t*s2+0.08*c,yaw:ry||0,h:0.46,ban:true})}
/* armchair / lounge chair */
function armchair(x,z,yaw,o){o=o||{};const L=X.L,c=hx(o.hex||'#6b3f22'),t=M(o.tile||'leather');L.push(x,0,z,yaw);L.box(0,0.08,0,0.78,0.34,0.78,c,t,{bev:0.04});L.box(0,0.42,0.03,0.6,0.1,0.62,c,t,{bev:0.04});
  L.box(0,0.42,-0.33,0.78,0.48,0.14,c,t,{bev:0.04});for(const s of[-1,1])L.box(s*0.33,0.42,0,0.12,0.22,0.78,c,t,{bev:0.03});for(const [a,b] of[[0.34,0.34],[-0.34,0.34],[0.34,-0.34],[-0.34,-0.34]])L.box(a,0,b,0.04,0.08,0.04,hx('#222'),SEMI);
  L.pop();colBox(x,z,0.74,0.74,yaw);X.seats.push({x,z,yaw,h:0.44})}

/* ---------- COUNTERS, CASES, SHELVES ---------- */
/* counter body: centre x,z, length along local x after ry, the customer side is +z (after ry). o:{h,d,front:[tile,hex],top:[tile,hex],kick} */
function counter(x,z,len,ry,o){o=o||{};const L=X.L,h=o.h||1.05,d=o.d||0.65,fr=o.front||['wood_dark','#ffffff'],tp=o.top||['marble','#ffffff'];L.push(x,0,z,ry||0);
  L.box(0,0,0.03,len-0.02,0.1,d-0.12,hx('#151515'),SEMI,{f:'zxX'});L.box(0,0.1,0,len,h-0.14,d,hx(fr[1]),M(fr[0]),{f:'zxXZ',rot:o.rot});
  L.box(0,h-0.04,0.02,len+0.06,0.04,d+0.08,hx(tp[1]),M(tp[0]),{f:'xXzZt',fit:o.topFit});
  if(o.ledge){L.box(0,h,d/2-0.08,len,0.25,0.03,hx(tp[1]),M(tp[0]));L.box(0,h+0.25,d/2-0.12,len+0.04,0.03,0.22,hx(tp[1]),M(tp[0]))}
  L.pop();colBox(x,z,len+0.06,d+0.08,ry||0)}
/* refrigerated display case with curved glass. fill(L, i, x, y, z) draws goods on shelf i at local positions */
function displayCase(x,z,len,ry,o){o=o||{};const L=X.L,h=o.h||1.25,d=o.d||0.8,base=hx(o.base||'#1f1f22');L.push(x,0,z,ry||0);
  L.box(0,0,0,len,0.85,d,base,M(o.baseT||'wood_black'),{f:'zxXZ'});L.box(0,0.85,0,len+0.02,0.03,d,hx('#d9dadc'),M('steel'));
  const shelves=o.shelves||2;for(let i=0;i<shelves;i++){const y=0.88+i*0.17,zz=-0.08-i*0.14;L.box(0,y,zz,len-0.06,0.012,d*0.62-i*0.12,hx('#e8eef0'),GLOSS);if(o.fill)o.fill(L,i,len-0.14,y+0.012,zz,d*0.58-i*0.12)}
  /* glass: sloped front + top */X.G.face([-len/2,0.88,d/2],[len/2,0.88,d/2],[len/2,h,d/2-0.28],[-len/2,h,d/2-0.28],hx('#d8ecf0'),FLAT);X.G.face([-len/2,h,d/2-0.28],[len/2,h,d/2-0.28],[len/2,h,-d/2+0.05],[-len/2,h,-d/2+0.05],hx('#d8ecf0'),FLAT);
  for(const s of[-1,1]){X.G.face(s<0?[-len/2,0.88,-d/2]:[len/2,0.88,d/2],s<0?[-len/2,0.88,d/2]:[len/2,0.88,-d/2],s<0?[-len/2,h,d/2-0.28]:[len/2,h,-d/2+0.05],s<0?[-len/2,h,-d/2+0.05]:[len/2,h,d/2-0.28],hx('#d8ecf0'),FLAT)}
  L.box(0,h,0,len,0.025,0.05,hx('#c4c6c8'),M('steel'));L.box(0,h-0.02,-d/2+0.04,len,0.03,0.06,hx('#fff4dd'),EMIT,{gl:0.9});
  L.pop();colBox(x,z,len,d,ry||0)}
/* products on a shelf board: a row of boxes/bottles/jars between x0..x1 at height y, depth dz (centre z), max height hmax */
function goods(x0,x1,y,zc,dep,hmax,r,kind){const L=X.L;let x=x0;while(x<x1-0.04){const k=kind||r.p(['box','box','bottle','jar','can','box']);
    if(k==='box'){const w=r.r(0.07,0.2),h=Math.min(hmax,r.r(0.12,0.32)),d=Math.min(dep,r.r(0.06,0.2));if(x+w>x1)break;const lb=SUB('labels',8,r.i(0,63));const n=Math.max(1,Math.floor(dep/(d+0.01)));
      for(let i=0;i<Math.min(n,2);i++)L.box(x+w/2,y,zc+dep/2-d/2-i*(d+0.01),w-0.006,h,d,WH,lb,{fit:[1,1],f:i?'t':'zxXt'});x+=w}
    else if(k==='bottle'||k==='can'||k==='jar'){const rad=k==='bottle'?r.r(0.03,0.045):k==='can'?0.033:r.r(0.035,0.055),h=Math.min(hmax,k==='bottle'?r.r(0.22,0.32):k==='can'?0.115:r.r(0.09,0.16)),n=Math.max(1,Math.floor(rad*2.2*6/(rad*2.2)));const cnt=r.i(2,4);
      const lb=SUB('labels',8,r.i(0,63));const gc=k==='bottle'?hx(r.p(['#2e6b3a','#d9e8e8','#5a2a12','#e8e2d0','#173a5e'])):WH;
      for(let i=0;i<cnt&&x+rad*2<x1;i++){const cx=x+rad;for(let j=0;j<2;j++){const cz=zc+dep/2-rad-0.01-j*(rad*2+0.01);if(k==='bottle'){L.cyl(cx,y,cz,rad,rad,h*0.62,8,gc,GLOSS);L.cyl(cx,y+h*0.62,cz,rad,rad*0.35,h*0.18,8,gc,GLOSS);L.cyl(cx,y+h*0.8,cz,rad*0.35,rad*0.3,h*0.2,6,hx(r.p(['#c8102e','#f4f1ea','#ffd100','#1b1b1f'])),SEMI,{cap:true});
            if(j===0)L.cyl(cx,y+h*0.2,cz,rad*1.01,rad*1.01,h*0.3,8,WH,lb,{a0:0,a1:PI,k:1/(rad*PI)})}
          else{L.cyl(cx,y,cz,rad,rad,h,10,j?hx('#d0d2d4'):WH,j?M('steel'):lb,{cap:true,tt:M('steel'),tc:hx('#c8c8c8'),k:1/(rad*TAU2)})}}x+=rad*2+0.006}x+=0.01}
    else x+=0.05;x+=r.r(0.004,0.02)}}
/* shelving: wall unit (o.wall=true: back panel, one face) or gondola (two faces). Centre x,z, length along local x after ry, faces +z (and -z for gondola). */
function shelving(x,z,len,ry,o){o=o||{};if(o.flat==null&&!o.goods&&len>3.5)o.flat=true;const L=X.L,h=o.h||1.9,d=o.d||(o.wall?0.45:0.9),n=o.n||5,col=hx(o.hex||'#e9e9e6'),r=RNG(o.seed||Math.round(x*31+z*17)),t=o.tile?M(o.tile):SEMI;L.push(x,0,z,ry||0);
  L.box(0,0,0,len,0.12,d,hx(o.kick||'#3a3a3c'),SEMI,{f:'zZxXt'});L.box(0,0.12,o.wall?-d/2+0.02:0,len,h-0.12,o.wall?0.04:0.05,col,t,{f:o.wall?'z':'zZ'});for(const s of[-1,1])L.box(s*(len/2-0.015),0.12,0,0.03,h-0.12,d,col,t);
  L.box(0,h-0.02,0,len,0.03,d,col,t);
  const faces=o.wall?[1]:[1,-1];for(const f of faces){L.push(0,0,0,f<0?PI:0);for(let i=0;i<n;i++){const y=0.14+i*(h-0.25)/n;L.box(0,y,d/4,len-0.04,0.022,d/2-0.04,col,t);
      L.box(0,y-0.03,d/2-0.02,len-0.04,0.035,0.01,hx(o.strip||'#f5f5f2'),FLAT,{f:'z'});/* price strip */
      if(o.flat){/* long runs: one packed row of products per shelf (texture of labels) + a few loose 3D items at the ends */const sh=((h-0.25)/n-0.06)*r.r(0.7,0.92);L.box(0,y+0.022,d/4,len-0.3,sh,d/2-0.08,WH,M(o.flatT||'labels',r.r(0.55,0.75)),{f:'zt'});goods(-len/2+0.04,-len/2+0.15,y+0.022,d/4,d/2-0.06,(h-0.25)/n-0.05,r,o.kind);goods(len/2-0.15,len/2-0.04,y+0.022,d/4,d/2-0.06,(h-0.25)/n-0.05,r,o.kind)}
      else if(o.fill!==false)(o.goods||goods)(-len/2+0.04,len/2-0.04,y+0.022,d/4,d/2-0.06,(h-0.25)/n-0.05,r,o.kind,i)}L.pop()}
  if(o.header){const tl=textPanel(0,h+0.16,o.wall?-d/2+0.06:0.03,Math.min(len,2.4),0.26,o.header,{bg:o.headerBg||'#c8102e',fg:'#fff',ppm:220});if(!o.wall)X.B.panel(0,h+0.16,-0.03,Math.min(len,2.4),0.26,WH,tl,{ry:PI})}
  L.pop();colBox(x,z,len,d,ry||0)}
/* upright glass-door fridge, w wide, facing +z after ry; contents bottles/cans; lit inside */
function fridge(x,z,w,ry,o){o=o||{};const L=X.L,h=o.h||2.0,d=0.75,r=RNG(o.seed||Math.round(x*13+z*7));L.push(x,0,z,ry||0);
  L.box(0,0,0,w,h,d,hx(o.hex||'#1c1c1e'),SEMI,{f:'xXZt'});L.box(0,0,d/2-0.02,w,0.18,0.04,hx('#2a2a2c'),SEMI,{f:'zt'});L.box(0,h-0.25,d/2-0.02,w,0.25,0.04,hx(o.header||'#c8102e'),SEMI,{f:'z'});
  L.box(0,0.18,-d/2+0.06,w-0.08,h-0.45,0.02,hx('#f4f6f8'),EMIT,{f:'z',gl:0.55});
  for(let i=0;i<5;i++){const y=0.22+i*0.31;L.box(0,y,0,w-0.08,0.015,d-0.15,hx('#dfe4e8'),GLOSS);goods(-w/2+0.05,w/2-0.05,y+0.015,0,d-0.2,0.28,r,o.kind||r.p(['bottle','can','bottle']))}
  const nd=Math.max(1,Math.round(w/0.7));for(let i=0;i<nd;i++){const x0=-w/2+i*w/nd;X.G.face([x0+0.03,0.2,d/2],[x0+w/nd-0.03,0.2,d/2],[x0+w/nd-0.03,h-0.27,d/2],[x0+0.03,h-0.27,d/2],hx('#e0f0f4'),FLAT);
    L.box(x0+0.015,0.18,d/2,0.03,h-0.43,0.03,hx('#8d9094'),M('steel'));L.box(x0+w/nd-0.015,0.18,d/2,0.03,h-0.43,0.03,hx('#8d9094'),M('steel'));L.box(x0+w/nd-0.07,0.7,d/2+0.03,0.025,0.6,0.03,hx('#c8ccd0'),M('steel'))}
  if(o.label)textPanel(0,h-0.125,d/2+0.005,w*0.9,0.18,o.label,{fg:'#fff',ppm:220});
  L.pop();colBox(x,z,w,d,ry||0);pool(x+Math.sin(ry||0)*0.6,1.0,z+Math.cos(ry||0)*0.6,'#e8f4ff',0.25,1.6)}

/* ---------- LIGHTS, DECOR ---------- */
function pendant(x,y,z,o){o=o||{};const L=X.L,len=o.len||0.8,c=hx(o.hex||'#1b1b1d'),st=o.style||'dome';L.tube([x,y,z],[x,y-len,z],0.004,4,hx('#111'),FLAT);
  if(st==='dome'){L.lathe(x,y-len-0.2,z,[[0.17,0],[0.16,0.06],[0.11,0.15],[0.04,0.2],[0.02,0.21]],14,c,SEMI);L.ball(x,y-len-0.17,z,0.055,0.055,0.055,8,6,hx('#fff3d6'),EMIT,{gl:1})}
  else if(st==='bulb'){L.cyl(x,y-len-0.04,z,0.02,0.02,0.04,8,hx('#b08a50'),SEMI);L.ball(x,y-len-0.1,z,0.06,0.075,0.06,10,7,hx('#ffd9a0'),EMIT,{gl:1})}
  else if(st==='cyl'){L.cyl(x,y-len-0.3,z,0.09,0.09,0.3,12,c,SEMI);L.cyl(x,y-len-0.3,z,0.08,0.08,0.01,12,hx('#fff3d6'),EMIT,{gl:1,capB:true})}
  else if(st==='cone'){L.lathe(x,y-len-0.28,z,[[0.14,0],[0.03,0.28]],14,c,SEMI);L.cyl(x,y-len-0.29,z,0.12,0.12,0.012,14,hx('#fff3d6'),EMIT,{gl:1,capB:true})}
  pool(x,y-len-0.4,z,o.light||'#ffcf96',o.i==null?0.55:o.i,o.r||2.8)}
function downlight(x,y,z,o){o=o||{};X.L.cyl(x,y-0.005,z,o.r||0.07,o.r||0.07,0.005,12,hx('#fff6e4'),EMIT,{gl:1,capB:true});if(o.pool!==false)pool(x,y-1.1,z,o.light||'#ffe2b8',o.i==null?0.4:o.i,o.rad||2.6)}
/* a linear LED / fluorescent fixture */
function strip(x,y,z,len,ry,o){o=o||{};X.L.push(x,y,z,ry||0);X.L.box(0,-0.05,0,len,0.05,o.w||0.12,hx('#e8e8e6'),SEMI,{f:'xXzZb'});X.L.box(0,-0.052,0,len-0.04,0.004,(o.w||0.12)-0.03,hx(o.c||'#fdfcf6'),EMIT,{gl:1,f:'b'});X.L.pop();
  for(let s=-len/2+0.6;s<=len/2-0.5;s+=1.4)pool(x+Math.cos(ry||0)*s,y-1.2,z-Math.sin(ry||0)*s,o.light||'#fff4e2',o.i==null?0.35:o.i,2.8)}
function plant(x,z,o){o=o||{};const L=X.L,h=o.h||1.4,r=RNG(Math.round(x*77+z*31)),pot=hx(o.pot||'#8f8f8c');L.cyl(x,0,z,0.2,0.24,0.4,12,pot,M(o.potT||'fl_concrete'),{cap:true,tt:M('fl_concrete'),tc:hx('#3b2c20')});
  const lc=[hx('#3f6b2a'),hx('#4f7d33'),hx('#2f5a22')];for(let i=0;i<(o.n||14);i++){const a=r()*TAU2,el=0.35+r()*0.9,len=0.25+r()*h*0.5,bx=x+Math.cos(a)*0.05,bz=z+Math.sin(a)*0.05,by=0.4+r()*h*0.35,tx=bx+Math.cos(a)*Math.cos(el)*len*0.7,tz=bz+Math.sin(a)*Math.cos(el)*len*0.7,ty=by+Math.sin(el)*len;
    L.tube([bx,0.38,bz],[tx,ty,tz],0.008,4,hx('#4a3a22'),FLAT);L.ball(tx,ty,tz,0.07+r()*0.07,0.05+r()*0.04,0.07+r()*0.07,6,4,lc[i%3],M('fabric'))}colRound(x,z,0.24)}
/* bottles/jars/cups on a counter etc. */
function cup(x,y,z,o){o=o||{};X.L.cyl(x,y,z,0.035,0.045,0.11,10,hx(o.hex||'#ffffff'),GLOSS);X.L.cyl(x,y+0.11,z,0.047,0.047,0.012,10,hx(o.lid||'#ffffff'),SEMI,{cap:true})}
function till(x,y,z,ry,o){o=o||{};const L=X.L;L.push(x,y,z,ry||0);L.box(0,0,0,0.38,0.08,0.34,hx('#222326'),SEMI);L.cyl(0,0.08,-0.05,0.03,0.03,0.18,8,hx('#2a2a2c'),SEMI);
  L.push(0,0.3,-0.04,0,-0.35);L.box(0,-0.12,0,0.36,0.24,0.03,hx('#1a1a1c'),SEMI);X.L.box(0,-0.11,0.016,0.32,0.2,0.002,WH,SUB('panel',4,o.scr||1),{f:'z',fit:[1,1],gl:0.8});L.pop();
  L.box(0.3,0,0.08,0.09,0.05,0.16,hx('#2a2b2e'),SEMI);L.box(0.3,0.05,0.07,0.08,0.002,0.1,WH,SUB('panel',4,8),{f:'t',fit:[1,1]});/* card terminal */L.pop()}
function coffeeMachine(x,y,z,ry,o){o=o||{};const L=X.L,w=o.w||0.85,c=hx(o.hex||'#c9ccd0');L.push(x,y,z,ry||0);L.box(0,0,0,w,0.48,0.55,c,M('steel'),{bev:0.02});L.box(0,0.48,0,w,0.04,0.55,hx('#2a2a2c'),SEMI);
  const g=Math.max(2,Math.round(w/0.3));for(let i=0;i<g;i++){const gx=-w/2+(i+0.5)*w/g;L.box(gx,0.18,0.3,0.1,0.05,0.08,hx('#1b1b1d'),SEMI);L.tube([gx,0.2,0.33],[gx,0.2,0.48],0.012,6,hx('#1b1b1d'),SEMI);L.box(gx,0.3,0.28,0.04,0.04,0.04,hx('#e05a2a'),EMIT,{gl:0.5})}
  L.box(0,0.02,0.24,w-0.1,0.02,0.12,hx('#8d9094'),M('grille'));for(let i=0;i<5;i++)L.cyl(-w/2+0.1+i*0.12,0.52,0,0.04,0.035,0.08,8,hx('#fafafa'),GLOSS);
  L.tube([w/2-0.08,0.35,0.28],[w/2-0.04,0.12,0.36],0.008,5,hx('#d0d0d0'),M('steel'));L.pop();
  /* grinder */L.push(x+Math.cos(ry||0)*(w/2+0.22),y,z-Math.sin(ry||0)*(w/2+0.22),ry||0);L.box(0,0,0,0.2,0.32,0.3,hx('#2a2a2c'),SEMI);L.lathe(0,0.32,0,[[0.07,0],[0.09,0.18],[0.06,0.2]],10,hx('#3b2a1d'),GLOSS);L.pop()}
/* small framed menu / price board (black frame, white sheet) painted from rows */
function menuSheet(x,y,z,w,h,ry,title,rows,o){o=o||{};const fr=0.03;X.L.push(x,y,z,ry||0);X.L.box(0,-h/2-fr,-0.02,w+fr*2,h+fr*2,0.03,hx(o.frame||'#111111'),SEMI);X.L.pop();
  const tl=boardTile(Math.round(w*300),Math.round(h*300),(g,W,H)=>{g.fillStyle=o.bg||'#f7f5ef';g.fillRect(0,0,W,H);const fg=o.fg||'#151515',ac=o.ac||'#b0772a';fitText(g,title,W/2,H*0.075,Math.round(W*0.085),800,o.fam||F_HEAD,ac,'center',W*0.9);
    g.fillStyle=ac;g.fillRect(W*0.08,H*0.095,W*0.84,2);const n=rows.length,lh=Math.min(H*0.86/n,W*0.075);rows.forEach((r,i)=>{const yy=H*0.13+lh*(i+0.8);if(r[1]==null){fitText(g,r[0],W*0.07,yy,Math.round(lh*0.62),800,F_SANS,ac,'left',W*0.86);return}
      fitText(g,r[0],W*0.07,yy,Math.round(lh*0.5),600,F_SANS,fg,'left',W*0.66);g.font=font(Math.round(lh*0.5),800,F_SANS);g.textAlign='right';g.fillStyle=fg;g.fillText(typeof r[1]==='number'?r[1].toFixed(2).replace('.',',')+' €':r[1],W*0.93,yy);
      if(r[2]){fitText(g,r[2],W*0.07,yy+lh*0.36,Math.round(lh*0.3),400,F_SANS,'#666','left',W*0.86)}})});
  X.B.panel(x+Math.sin(ry||0)*0.002,y,z+Math.cos(ry||0)*0.002,w,h,WH,tl,{ry:ry||0,gl:o.glow==null?0:o.glow});return tl}
/* lit menu board above a counter: dark panels with columns of items (like a fast-food / café board) */
function menuBoard(x,y,z,w,h,ry,o){X.L.push(x,y,z,ry||0);X.L.box(0,-h/2-0.04,-0.06,w+0.08,h+0.08,0.06,hx(o.frame||'#151515'),SEMI);X.L.pop();
  const W=Math.round(Math.min(1000,w*260)),H=Math.round(W*h/w);const cols=o.cols||[{title:o.title,rows:o.rows}];
  const tl=boardTile(W,H,(g,W,H)=>{g.fillStyle=o.bg||'#141414';g.fillRect(0,0,W,H);if(o.paintBg)o.paintBg(g,W,H);const cw=W/cols.length;cols.forEach((c,ci)=>{const x0=ci*cw;if(ci){g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x0,H*0.06,2,H*0.88)}
      fitText(g,c.title,x0+cw/2,H*0.13,Math.round(H*0.09),800,o.fam||F_HEAD,o.ac||'#f5b81c','center',cw*0.9);const n=c.rows.length,lh=Math.min(H*0.8/n,H*0.1);
      c.rows.forEach((r,i)=>{const yy=H*0.2+lh*(i+0.75);fitText(g,r[0],x0+cw*0.06,yy,Math.round(lh*0.56),600,F_SANS,o.fg||'#f4f1ea','left',cw*0.66);if(r[1]!=null){g.font=font(Math.round(lh*0.56),800,F_SANS);g.fillStyle=o.pc||o.ac||'#f5b81c';g.textAlign='right';g.fillText(typeof r[1]==='number'?r[1].toFixed(2).replace('.',',')+'€':r[1],x0+cw*0.95,yy)}})})});
  X.B.panel(x+Math.sin(ry||0)*0.001,y,z+Math.cos(ry||0)*0.001,w,h,WH,tl,{ry:ry||0,gl:0});pool(x+Math.sin(ry||0)*0.6,y-0.6,z+Math.cos(ry||0)*0.6,'#fff1dc',0.18,2.2)}
/* clothes rail with hanging garments */
function clothesRail(x,z,len,ry,o){o=o||{};const L=X.L,r=RNG(o.seed||Math.round(x*29+z*11)),h=o.h||1.55,pal=o.pal||['#1d2433','#e8e2d6','#8c1c24','#3a4a3a','#c8b28a','#2b2b2e','#6d7f99','#f2efe9','#a35a3c'];L.push(x,0,z,ry||0);
  for(const s of[-1,1]){L.cyl(s*len/2,0,0,0.018,0.018,h,8,hx('#c8ccd0'),M('steel'));L.box(s*len/2,0,0,0.05,0.02,0.45,hx('#c8ccd0'),M('steel'))}L.tube([-len/2,h,0],[len/2,h,0],0.014,8,hx('#c8ccd0'),M('steel'));
  for(let xx=-len/2+0.08;xx<len/2-0.05;xx+=r.r(0.05,0.09)){const c=hx(r.p(pal)),gl=r.r(0.55,o.long?1.1:0.8),cw=r.r(0.36,0.46);L.push(xx,h-0.05,0,PI/2+r.r(-0.08,0.08));L.box(0,-gl,0,cw,gl,0.025,c,M('cloth'),{fit:[1,1]});L.box(0,-0.06,0,cw*0.7,0.05,0.03,c,M('cloth'));L.pop();
    L.tube([xx,h,0],[xx,h-0.06,0],0.004,3,hx('#999'),FLAT)}
  L.pop();colBox(x,z,len+0.1,0.55,ry||0)}
/* low display table / plinth with folded goods */
function displayTable(x,z,w,d,ry,o){o=o||{};const L=X.L,r=RNG(Math.round(x*41+z*3)),h=o.h||0.8;L.push(x,0,z,ry||0);L.box(0,0,0,w,h,d,hx(o.hex||'#e8e2d6'),M(o.tile||'oak_white'));
  if(o.items!==false)for(let i=0;i<(o.n||6);i++){const kind=o.kind||'fold';const px=r.r(-w/2+0.15,w/2-0.15),pz=r.r(-d/2+0.12,d/2-0.12);if(kind==='fold'){const c=hx(r.p(o.pal||['#1d2433','#e8e2d6','#8c1c24','#c8b28a','#6d7f99','#2b2b2e']));for(let k=0;k<r.i(2,4);k++)L.box(px,h+k*0.035,pz,0.3,0.035,0.24,c,M('cloth'),{fit:[1,1]})}
      else if(kind==='shoe'){const c=hx(r.p(['#1a1a1a','#6b3f22','#e9e6df','#8c1c24','#c8b28a']));L.push(px,h,pz,r()*PI);L.box(0,0,0,0.1,0.03,0.27,hx('#efefef'),FLAT);L.box(0,0.03,-0.03,0.095,0.07,0.2,c,M('leather'),{bev:0.02});L.box(0,0.03,0.07,0.09,0.04,0.08,c,M('leather'));L.pop()}
      else if(kind==='box'){L.box(px,h,pz,r.r(0.12,0.3),r.r(0.05,0.2),r.r(0.1,0.25),WH,SUB('labels',8,r.i(0,63)),{fit:[1,1]})}
      else if(kind==='book'){L.box(px,h,pz,0.17,0.025*r.i(2,6),0.24,WH,SUB('books',4,r.i(8,15)),{fit:[1,1],rot:true})}}
  L.pop();colBox(x,z,w,d,ry||0)}
/* wall of book / product spines on shelves (fast: one textured face per shelf row) */
function spineWall(x,z,len,ry,o){o=o||{};const L=X.L,h=o.h||2.1,n=o.n||6,d=o.d||0.32,r=RNG(Math.round(x*7+z*5));L.push(x,0,z,ry||0);L.box(0,0,0,len,h,d,hx(o.hex||'#5a3c26'),M(o.tile||'wood_dark'),{f:'zxXt'});
  for(let i=0;i<n;i++){const y=0.1+i*(h-0.15)/n,sh=(h-0.15)/n-0.04;const k=Math.max(1,Math.round(len/0.45));for(let j=0;j<k;j++){const sx=-len/2+0.03+(len-0.06)*j/k;L.box(sx+(len-0.06)/k/2,y,d/2-0.01-0.13,(len-0.06)/k-0.004,sh,0.24,WH,SUB(o.sheet||'books',4,o.cells?r.p(o.cells):r.i(0,7)),{fit:[1,1],f:'zt'})}
    L.box(0,y-0.03,d/2-0.14,len-0.02,0.03,0.28,hx(o.hex||'#5a3c26'),M(o.tile||'wood_dark'),{f:'zt'})}L.pop();colBox(x,z,len,d,ry||0)}
function mirror(x,y,z,w,h,ry,o){o=o||{};X.L.push(x,y,z,ry||0);X.L.box(0,-h/2-0.03,-0.02,w+0.06,h+0.06,0.025,hx(o.frame||'#1a1a1a'),SEMI);X.L.box(0,-h/2,0.005,w,h,0.003,hx('#c9d2d6'),GLOSS,{f:'z'});X.L.pop()}
/* rug: thin textured slab */
function rug(x,z,w,d,ry,cell){X.L.box(x,0,z,w,0.008,d,WH,SUB('rug',2,cell||0),{ry:ry||0,fit:[1,1],f:'xXzZt'})}

/* ============================== CELL BUILD, BAKE, ENTER / EXIT, HOOKS ============================== */
const TPL={};/* template name -> {build(def,r)} ; specials register their own build */
/* world <-> local for the live cell */
function L2W(lx,lz){const c=Math.cos(IN.ry),s=Math.sin(IN.ry);return{x:IN.X0+lx*c+lz*s,z:IN.Z0-lx*s+lz*c}}
function W2L(wx,wz){const c=Math.cos(IN.ry),s=Math.sin(IN.ry),dx=wx-IN.X0,dz=wz-IN.Z0;return{x:dx*c-dz*s,z:dx*s+dz*c}}
/* baked lighting: ambient * cheap AO + warm pools. Writes into the lit builder's colour array before build() */
function bake(ib,box,pools,amb){const P=ib.p,N=ib.n,C=ib.c,G=ib.g,n=ib.vc,a=amb||0.62,h=box?box.h:3.2;
  for(let i=0;i<n;i++){if(G[i]>0.3)continue;const x=P[i*3],y=P[i*3+1],z=P[i*3+2],nx=N[i*3],ny=N[i*3+1],nz=N[i*3+2];
    let ao=1;if(box){const dw=Math.min(x-box.x0,box.x1-x,z-box.z0,box.z1-z);ao*=0.8+0.2*ss(dw/0.7);if(y<0.6)ao*=0.78+0.22*ss(y/0.6);if(y>h-0.5)ao*=0.86+0.14*ss((h-y)/0.5)}
    if(ny<-0.7&&y<1.2)ao*=0.55;/* undersides of furniture */
    let r=a*ao,g=a*ao,b=a*ao*0.96;
    for(const p of pools){const dx=p.x-x,dy=p.y-y,dz=p.z-z,d2=dx*dx+dy*dy+dz*dz,R2=p.r*p.r;if(d2>=R2)continue;const d=Math.sqrt(d2)||1e-4,f=(1-d2/R2),w=f*f*p.i*(0.3+0.7*Math.max(0,(dx*nx+dy*ny+dz*nz)/d));r+=p.c[0]*w;g+=p.c[1]*w;b+=p.c[2]*w}
    C[i*3]*=r;C[i*3+1]*=g;C[i*3+2]*=b}}
function newCtx(def){return{def,L:new IB(),B:new IB(),G:new IB(),bd:new IBoard(2048,def.boardH||1024),segs:[],pools:[],pl:[],ppl:[],use:[],seats:[],box:null,anim:[],extra:[]}}
/* build the cell of def; resolves to the live record */
async function buildCell(def){materials();layReset();const ctx=X=newCtx(def);const r=RNG(def.seed||strHash(def.key));
  await loadManifest();
  (def.build||TPL[def.tpl]&&TPL[def.tpl].build||TPL.generic.build)(def,r);
  if(!ctx.box)room({x0:-2.5,x1:2.5,d:6,h:3.2,door:{x:0,w:1.8,h:2.2}});
  const t0=performance.now();bake(ctx.L,ctx.box,ctx.pools,def.amb);
  const arr=await buildArrays(LAY.names.slice());IN.U.arr.value=arr.col;IN.U.nrm.value=arr.nrm;
  const grp=new THREE.Group();grp.name='interior:'+def.key;const mk=(ib,mat,kind)=>{if(!ib.vc)return null;const tris=ib.tris(),m=new THREE.Mesh(ib.build(kind),mat);m.frustumCulled=false;m.matrixAutoUpdate=false;m.userData.tris=tris;grp.add(m);return m};
  const lit=mk(ctx.L,IN.mat.lit,'lit');
  const btex=new THREE.CanvasTexture(ctx.bd.cv);btex.encoding=THREE.sRGBEncoding;btex.anisotropy=4;btex.flipY=true;const bmat=IN.mat.board.clone();bmat.onBeforeCompile=IN.mat.board.onBeforeCompile;bmat.customProgramCacheKey=IN.mat.board.customProgramCacheKey;bmat.map=btex;
  const brd=mk(ctx.B,bmat,'board');if(brd)brd.renderOrder=1;const gls=mk(ctx.G,IN.mat.glass,'glass');if(gls)gls.renderOrder=3;
  for(const a of ctx.anim)if(a.ib){bake(a.ib,null,ctx.pools.map(q=>Object.assign({},q,{x:q.x-a.pos[0],y:q.y-a.pos[1],z:q.z-a.pos[2]})),def.amb);a.mesh=new THREE.Mesh(a.ib.build('lit'),IN.mat.lit);a.mesh.position.set(a.pos[0],a.pos[1],a.pos[2]);a.mesh.frustumCulled=false;grp.add(a.mesh)}
  /* light rig: ambient + hemisphere + up to 3 point lights; the world's sun/sky lights are hidden while inside */
  const A=new THREE.AmbientLight(new THREE.Color(def.ambHex||'#fff3e6'),def.ambI==null?0.82:def.ambI);grp.add(A);
  const H=new THREE.HemisphereLight(new THREE.Color('#fff4e8'),new THREE.Color('#5a4a3c'),def.hemiI==null?0.32:def.hemiI);grp.add(H);
  for(const l of ctx.pl){const p=new THREE.PointLight(new THREE.Color(l.c),l.i,l.d,2);p.position.set(l.x,l.y,l.z);grp.add(p)}
  grp.rotation.y=IN.ry;grp.position.set(IN.X0,IN.Y0,IN.Z0);grp.updateMatrixWorld(true);for(const m of grp.children)if(m.isMesh){m.matrixAutoUpdate=false;m.updateMatrix();m.updateMatrixWorld(true)}
  const live={def,grp,ctx,btex,bmat,arr,segs:[],inter:[],ppl:[],tris:(lit?lit.userData.tris:0)+(brd?brd.userData.tris:0)+(gls?gls.userData.tris:0),bakeMs:Math.round(performance.now()-t0)};
  /* collision in world coordinates */
  for(const s of ctx.segs){const a=L2W(s[0],s[1]),b=L2W(s[2],s[3]);const before=collectSeg(a,b);addSeg(a.x,a.z,b.x,b.z,s[4]);live.segs.push(...newSegs(before,a,b))}
  X=null;return live}
/* track the segment objects addSeg created so they can be removed again */
function collectSeg(a,b){const ks=cellsOf(a,b),m=new Map();for(const k of ks){const arr=grid.get(k);m.set(k,arr?arr.length:0)}return m}
function cellsOf(a,b){const C=typeof CELL!=='undefined'?CELL:8,ks=[];for(let gx=Math.floor(Math.min(a.x,b.x)/C);gx<=Math.floor(Math.max(a.x,b.x)/C);gx++)for(let gz=Math.floor(Math.min(a.z,b.z)/C);gz<=Math.floor(Math.max(a.z,b.z)/C);gz++)ks.push(gx*65536+gz);return ks}
function newSegs(before){const out=[];for(const [k,n] of before){const arr=grid.get(k);if(arr)for(let i=n;i<arr.length;i++)out.push([k,arr[i]])}return out}
function removeSegs(list){for(const [k,s] of list){const arr=grid.get(k);if(!arr)continue;const i=arr.indexOf(s);if(i>=0)arr.splice(i,1);if(!arr.length)grid.delete(k)}}

/* ---------- live cell: show / tick / dispose ---------- */
const keep=new Set();
function hideWorld(live){IN.hidden=[];keep.clear();keep.add(live.grp);if(typeof ph!=='undefined'&&ph)keep.add(ph.root);for(const p of live.ppl)keep.add(p.h.root);
  for(const o of scene.children){if(keep.has(o)||!o.visible)continue;o.visible=false;IN.hidden.push(o)}}
function showWorld(){for(const o of IN.hidden)o.visible=true;IN.hidden=[]}
function spawnPeople(live){if(!IN.cfg.people||typeof Ped==='undefined')return;for(const q of live.ctx.ppl){try{const h=new Ped(q.spec,true);const w=L2W(q.x,q.z);const rec={h,x:w.x,z:w.z,yaw:IN.ry+q.yaw,act:q.act,opt:q.opt,look:q.look,y:IN.Y0+(q.y||0)};
      h.root.position.set(rec.x,rec.y,rec.z);h.root.rotation.y=rec.yaw;if(q.act)h.play(q.act,q.opt);if(q.prop&&h.setProp)h.setProp(q.prop);live.ppl.push(rec);h.root.visible=true;if(scene.children.indexOf(h.root)<0)scene.add(h.root)}catch(e){console.warn('interior person failed',e)}}}
function tickCell(dt){const live=IN.alive;if(!live)return;IN.clock+=dt;
  for(const a of live.ctx.anim)a.fn(dt,IN.clock);
  const hx2=typeof player!=='undefined'?player.x:0,hz=typeof player!=='undefined'?player.z:0;
  for(const p of live.ppl){p.h.root.position.set(p.x,p.y,p.z);p.h.root.rotation.y=p.yaw;if(p.look&&p.h.lookAt){const d=Math.hypot(hx2-p.x,hz-p.z);if(d<4)p.h.lookAt(hx2,player.y+1.55,hz);else p.h.lookAt(null)}p.h.update(dt,0,false)}
  /* daylight in the windows */const night=typeof SKY!=='undefined'&&SKY.night!=null?SKY.night:0;const day=1-night;IN.U.day.value.setRGB(0.07+0.93*day,0.08+0.9*day,0.12+0.84*day);IN.U.nite.value=0.35+0.65*night;
  if(typeof SKY!=='undefined')SKY.indoorExposure=live.def.expo||0.95}
function disposeCell(live){removeSegs(live.segs);for(const it of live.inter){const i=INTER.indexOf(it);if(i>=0)INTER.splice(i,1)}
  for(const p of live.ppl){try{p.h.dispose?p.h.dispose():scene.remove(p.h.root)}catch(e){}}
  scene.remove(live.grp);live.grp.traverse(o=>{if(o.isMesh){o.geometry.dispose()}});live.btex.dispose();live.bmat.dispose();live.arr.col.dispose();live.arr.nrm.dispose();IN.U.arr.value=null;IN.U.nrm.value=null}

/* ---------- registry ---------- */
function shopKey(name,x,z){return'g'+strHash(String(name)+'|'+Math.round(x)+'|'+Math.round(z)).toString(36)}
function register(def){def.key=def.key||shopKey(def.name,def.door.x,def.door.z);if(INTERIORS[def.key])return INTERIORS[def.key];
  def.ry=Math.atan2(def.door.nx,def.door.nz);def.category=def.category||def.cat||def.tpl;def.seed=def.seed||strHash(def.key);
  if(!def.menu)def.menu=makeMenu(def);
  /* counter / entrance / exit / bounds in cell coordinates are filled by the template's plan() (cheap, no geometry) */
  const pl=(def.plan||TPL[def.tpl]&&TPL[def.tpl].plan||TPL.generic.plan)(def,RNG(def.seed));def.local=pl;
  Object.defineProperty(def,'counter',{get(){const q=IN.alive&&IN.alive.def===def?L2W(pl.counter[0],pl.counter[1]):null;return q},enumerable:false});
  def.entrance=null;def.exit={x:def.door.x+def.door.nx*1.3,z:def.door.z+def.door.nz*1.3};def.bounds=pl.bounds;
  INTERIORS[def.key]=def;return def}

/* ---------- enter / exit ---------- */
function fade(on){const f=document.getElementById('fade');if(f)f.style.opacity=on?1:0}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function enter(key,opt){opt=opt||{};const def=INTERIORS[key];if(!def||IN.busy)return false;if(IN.alive&&IN.alive.def===def)return true;IN.busy=true;
  try{if(IN.alive)await exit(true,true);if(typeof sfx==='function')try{sfx('door')}catch(e){}
    if(!opt.instant){fade(1);await wait(620)}
    if(typeof player!=='undefined'){player.spd=0;if(player.car){IN.busy=false;fade(0);return false}}
    IN.Y0=typeof terr==='function'?terr(IN.X0,IN.Z0):0;IN.ry=def.ry;
    const t0=performance.now();const live=await buildCell(def);live.buildMs=Math.round(performance.now()-t0);
    scene.add(live.grp);IN.alive=live;spawnPeople(live);
    /* interactions inside */const loc=def.local;
    const add=(lx,lz,label,fn,r)=>{const w=L2W(lx,lz);const it={x:w.x,z:w.z,r:r||1.5,label,fn,when:()=>player.interior===key&&!IN.busy};INTER.push(it);live.inter.push(it)};
    add(loc.door[0],-0.45,'Leave '+def.name,()=>exit(),1.0);
    if(typeof shopDesc!=='function')add(loc.counter[0],loc.counter[1],def.orderLabel||(def.menu&&def.menu.items.length?(def.tpl==='minimarket'||def.tpl==='supermarket'?'Pay at the till':'Order at the counter'):'Ask at the counter'),()=>order(def),1.6);
    for(const u of live.ctx.use)add(u.x,u.z,u.label,u.fn,u.r);
    /* player in */const sp=L2W(loc.door[0],-1.7);player.x=sp.x;player.z=sp.z;player.y=IN.Y0;player.vy=0;player.yaw=IN.ry+PI;if(typeof camYaw!=='undefined')camYaw=player.yaw;
    IN.ret={x:def.door.x+def.door.nx*1.1,z:def.door.z+def.door.nz*1.1,yaw:Math.atan2(def.door.nx,def.door.nz)};
    if(typeof CAMS!=='undefined')CAMS.ok=false;player.mv=0;player.interior=key;IN.saveDist=typeof camDist!=='undefined'?camDist:4.6;if(typeof camDist!=='undefined')camDist=Math.min(IN.saveDist,def.camDist||3.1);
    hideWorld(live);if(typeof camera!=='undefined'){camera.position.set(sp.x-Math.sin(player.yaw)*2.5,IN.Y0+1.9,sp.z-Math.cos(player.yaw)*2.5)}
    tickCell(0);IN.stats[key]={tris:live.tris,build:live.buildMs,bake:live.bakeMs,layers:live.arr.layers,texMB:+(live.arr.bytes/1048576).toFixed(1),calls:live.grp.children.filter(o=>o.isMesh).length,people:live.ppl.length};
    if(typeof subtitle==='function')subtitle(def.welcome||(def.name+(def.sub?' · '+def.sub:'')),2.6);
    if(typeof gameEvent==='function')try{gameEvent('interior',{key,enter:true})}catch(e){}
    if(!opt.instant){await wait(60);fade(0)}return true}
  catch(e){console.error('interior failed',e);if(IN.alive){try{disposeCell(IN.alive)}catch(_){}IN.alive=null}if(typeof player!=='undefined')player.interior=null;showWorld();fade(0);return false}
  finally{IN.busy=false}}
async function exit(instant,inner){const live=IN.alive;if(!live)return;if(IN.busy&&!inner)return;if(!inner)IN.busy=true;
  try{if(!instant){if(typeof sfx==='function')try{sfx('door')}catch(e){}fade(1);await wait(560)}
    disposeCell(live);IN.alive=null;showWorld();const key=live.def.key;
    if(typeof player!=='undefined'){player.interior=null;if(IN.ret&&!inner){player.x=IN.ret.x;player.z=IN.ret.z;player.y=groundY(player.x,player.z);player.vy=0;player.yaw=IN.ret.yaw;if(typeof camYaw!=='undefined')camYaw=player.yaw;if(typeof CAMS!=='undefined')CAMS.ok=false;
        if(typeof camera!=='undefined')camera.position.set(player.x-Math.sin(player.yaw)*4,player.y+2.2,player.z-Math.cos(player.yaw)*4)}}
    if(typeof camDist!=='undefined'&&IN.saveDist)camDist=IN.saveDist;
    if(typeof updateChunkVis==='function'&&typeof camera!=='undefined')updateChunkVis(player.x,player.z);
    if(typeof gameEvent==='function')try{gameEvent('interior',{key,enter:false})}catch(e){}
    if(!instant){await wait(80);fade(0)}}
  finally{if(!inner)IN.busy=false}}
/* the counter: the game's shop sheet (SHOPS / openShop owned by the gameplay module) */
function order(def){if(typeof shopDesc==='function'&&IN.openShop){IN.openShop(def.key);return}if(typeof openShop!=='function'||typeof SHOPS==='undefined'){if(typeof subtitle==='function')subtitle('The counter is closed.',2);return}
  const k='i:'+def.key;const m=def.menu;SHOPS[k]={t:m.title||def.name,s:m.sub||'',items:m.items.map(it=>it.slice())};IN.openShop(k)}

/* ---------- hooks into the game (installed once at boot; every name feature-detected) ---------- */
function installHooks(){if(IN.hooked)return;IN.hooked=true;
  if(typeof updateCamera==='function'){const orig=updateCamera;IN.updateCamera0=orig;updateCamera=function(dt){orig(dt);if(IN.alive&&player.interior)clampCam();tickCell(dt);if(!player.interior)nearDoor()}}
  if(typeof updatePeople==='function'){const o=updatePeople;updatePeople=function(){if(player.interior)return;return o.apply(this,arguments)}}
  if(typeof updateTraffic==='function'){const o=updateTraffic;updateTraffic=function(){if(player.interior)return;return o.apply(this,arguments)}}
  if(typeof openShop==='function'){const o=openShop;IN.openShop=o;openShop=function(k){if(!player.interior&&typeof k==='string'&&INTERIORS[k]&&INTERIORS[k].special){enter(k);return}return o.apply(this,arguments)}}
  if(typeof respawn==='function'){const o=respawn;respawn=function(){if(player.interior)exit(true);return o.apply(this,arguments)}}
  /* one street-door interaction whose position follows the nearest shop door */
  if(typeof INTER!=='undefined')INTER.push({get x(){return IN.nd?IN.nd.px:1e9},get z(){return IN.nd?IN.nd.pz:1e9},r:1.9,label:()=>IN.nd?(IN.nd.verb||'Enter')+' '+IN.nd.def.name:'',fn:()=>{if(IN.nd)enter(IN.nd.def.key)},when:()=>!!IN.nd&&!player.interior&&!player.car})}
function clampCam(){const b=IN.alive.ctx.box;if(!b)return;const p=camera.position,l=W2L(p.x,p.z);const m=0.22;let lx=cl(l.x,b.x0+m,b.x1-m),lz=cl(l.z,b.z0+m,b.z1-m);
  if(IN.alive.def.camZone){const q=IN.alive.def.camZone(lx,lz);lx=q[0];lz=q[1]}
  let moved=false;if(lx!==l.x||lz!==l.z){const w=L2W(lx,lz);p.x=w.x;p.z=w.z;moved=true}const y=cl(p.y,IN.Y0+0.6,IN.Y0+b.h-0.18);if(y!==p.y){p.y=y;moved=true}if(moved)camera.lookAt(player.x,player.y+1.45,player.z)}
/* nearest street door within reach (spatial hash of DOORS) */
const DOORS=[],DH=new Map();
function addDoor(d){DOORS.push(d);const k=Math.floor(d.px/8)*65536+Math.floor(d.pz/8);let a=DH.get(k);if(!a)DH.set(k,a=[]);a.push(d)}
function nearDoor(){IN.nd=null;if(typeof player==='undefined'||player.car)return;let best=null,bd=2.0;const gx=Math.floor(player.x/8),gz=Math.floor(player.z/8);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=DH.get((gx+i)*65536+gz+j);if(!a)continue;for(const d of a){const dd=Math.hypot(d.px-player.x,d.pz-player.z);if(dd<bd){bd=dd;best=d}}}IN.nd=best}

/* ============================== EVERY SHOP DOOR: map shopfronts + shops.json + census.json -> registry entries ============================== */
/* category (OSM shop/amenity value, shops.json or census category) -> template */
const CAT2TPL={cafe:'cafe',coffee:'cafe',tea:'cafe',ice_cream:'cafe',bar:'bar',pub:'bar',nightclub:'bar',biergarten:'bar',restaurant:'restaurant',taverna:'restaurant',food_court:'restaurant',
  fast_food:'fastfood',bakery:'bakery',confectionery:'bakery',patisserie:'bakery',pastry:'bakery',chocolate:'bakery',deli:'minimarket',food_shop:'minimarket',
  clothes:'clothes',boutique:'clothes',fashion:'clothes',lingerie:'clothes',bridal:'clothes',kids:'clothes',sports:'clothes',vintage:'clothes',second_hand:'clothes',mall:'clothes',department_store:'clothes',
  shoes:'shoes',bag:'shoes',bags_accessories:'shoes',fashion_accessories:'shoes',leather:'shoes',
  jewelry:'jewellery',jewellery:'jewellery',watches:'jewellery',pawnbroker:'jewellery',
  cosmetics:'cosmetics',perfumery:'cosmetics',beauty:'salon',hairdresser:'salon',barber:'salon',nails:'salon',massage:'salon',tattoo:'salon',
  optician:'optician',pharmacy:'pharmacy',chemist:'pharmacy',medical_supply:'pharmacy',
  bank:'bank',bureau_de_change:'bank',money_exchange:'bank',estate_agent:'office',travel_agent:'office',travel:'office',accountant:'office',insurance:'office',lawyer:'office',
  doctors:'office',clinic:'office',dentist:'office',energy_supplier:'office',post_courier:'office',post_office:'office',diplomatic:'office',driving_school:'office',
  supermarket:'minimarket',convenience:'minimarket',greengrocer:'minimarket',butcher:'minimarket',wine:'minimarket',wine_spirits:'minimarket',alcohol:'minimarket',kiosk:'minimarket',kiosk_tobacco_betting:'minimarket',tobacco:'minimarket',e_cigarette:'minimarket','e-cigarette':'minimarket',
  books:'books',bookshop:'books',stationery:'books',newsagent:'books',music:'books',
  electronics:'electronics',mobile_phone:'electronics',telecom:'electronics',computer:'electronics',electronics_repair:'electronics',repair:'electronics',photo:'electronics',camera:'electronics',
  gallery:'gallery',art:'gallery',arts_centre:'gallery',museum:'gallery',crafts_hobby:'gallery',frame:'gallery',
  hotel:'hotel',guest_house:'hotel',home:'home',services:'office',shop:'generic',bags:'shoes',coffee_tea:'cafe',finance:'bank',health_shop:'pharmacy',tickets:'office',betting:'minimarket',department_store:'clothes',florist:'home',
  interior_decoration:'home',home_decor:'home',furniture:'home',bed:'home',bathroom_furnishing:'home',carpets:'home',houseware:'home',gift:'home',gifts:'home',florist:'home',toys:'home',pet:'home',hardware:'home',locksmith:'home',dry_cleaning:'home',laundry:'home'};
const NOENTER={church:1,atm:1,fuel:1,police:1,funeral:1,place_of_worship:1,parking:1,bowling:0};
/* plausible menus / price lists by template (euro). Real lists from gk3/data/shops.json win when the shop has them. */
const MENUS={
  cafe:['Coffee bar',[['Freddo espresso',3.2],['Freddo cappuccino',3.6],['Greek coffee',2.5],['Cappuccino',3.4],['Frappé',3.0],['Fresh orange juice',4.2],['Croissant',2.4],['Club sandwich',8.5],['Cheesecake',5.5]]],
  bar:['Bar',[['Draft beer 0.4 l',5.5],['Glass of wine',7.0],['Cocktail',11.0],['Soft drink',3.5],['Water',1.0],['Freddo espresso',3.8],['Bowl of nuts',3.0]]],
  restaurant:['Kitchen',[['Greek salad',9.5],['Tzatziki',4.8],['Grilled chicken fillet',12.5],['Moussaka',13.0],['Pasta of the day',11.0],['Beef burger with fries',12.0],['House wine 0.5 l',8.0],['Water 1 l',1.5]]],
  fastfood:['Menu',[['Burger',5.9],['Cheeseburger meal',8.9],['Chicken wrap',6.2],['Fries',2.9],['Nuggets x6',5.4],['Soft drink',2.2],['Ice cream',2.5]]],
  bakery:['Counter',[['Koulouri',0.7],['Tyropita',2.4],['Spanakopita',2.6],['Croissant',1.9],['Loaf of bread',1.6],['Bougatsa',3.0],['Freddo espresso',2.2],['Chocolate éclair',2.8],['Box of cookies',6.5]]],
  clothes:['Shop',[['T-shirt',29],['Shirt',49],['Jeans',69],['Dress',89],['Knit sweater',79],['Jacket',149],['Belt',35],['Cap',25]]],
  shoes:['Shop',[['Sneakers',95],['Loafers',129],['Sandals',69],['Boots',169],['Leather bag',139],['Socks (3 pairs)',15],['Shoe care kit',18]]],
  jewellery:['Shop',[['Silver ring',65],['Gold earrings',240],['Pendant necklace',180],['Bracelet',120],['Watch',390],['Cufflinks',90]]],
  cosmetics:['Shop',[['Lipstick',24],['Mascara',27],['Perfume 50 ml',85],['Face cream',39],['Shampoo',12],['Nail polish',11],['Hand cream',9]]],
  salon:['Price list',[['Haircut',25],['Wash & blow-dry',20],['Beard trim',12],['Colour',55],['Manicure',18],['Pedicure',25]]],
  optician:['Shop',[['Sunglasses',140],['Reading glasses',45],['Frames',180],['Contact lenses (month)',35],['Eye test',20],['Lens cleaning kit',8]]],
  pharmacy:['Pharmacy',[['Paracetamol 500 mg',2.8],['Sun cream SPF50',16.5],['Plasters',3.9],['Vitamin C',7.5],['Throat lozenges',5.2],['Hand sanitiser',3.5],['Water 0.5 l',0.5]]],
  bank:['Services',[['Withdraw €20',0],['Withdraw €50',0],['Ask about an account',0]]],
  office:['Front desk',[['Ask for information',0],['Book an appointment',0]]],
  minimarket:['Shop',[['Water 0.5 l',0.5],['Soft drink 330 ml',1.3],['Crisps',1.8],['Chocolate bar',1.5],['Ice cream',2.2],['Sandwich',3.2],['Chewing gum',1.2],['Newspaper',2.0]]],
  books:['Shop',[['Paperback',12.9],['Notebook',4.5],['Pen set',6.0],['Map of Athens',7.5],['Comic',8.9],['Magazine',4.0]]],
  electronics:['Shop',[['Phone case',19],['Charging cable',15],['Earbuds',49],['Power bank',29],['Screen protector',12],['SIM card',5]]],
  gallery:['Gallery',[['Exhibition catalogue',20],['Art print',35],['Postcard set',8],['Small painting',450]]],
  hotel:['Reception',[['Coffee at the lobby bar',4.5],['Fresh orange juice',5.5],['Club sandwich',14],['Room for one night',160]]],
  home:['Shop',[['Scented candle',18],['Cushion',29],['Vase',39],['Picture frame',15],['Bouquet',25],['Gift wrap',3]]],
  generic:['Shop',[['Small item',5],['Gift',15],['Bag',2]]]};
function normName(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9Ͱ-Ͽ]+/g,'')}
function makeMenu(def){const base=MENUS[def.tpl]||MENUS.generic;let items=null;
  if(def.special&&typeof SHOPS!=='undefined'&&SHOPS[def.key])items=SHOPS[def.key].items.map(i=>i.slice());
  if(def.data&&Array.isArray(def.data.items)&&def.data.items.length){const tag=items&&items.find(i=>i[2])?items.find(i=>i[2])[2]:'';items=def.data.items.filter(i=>i&&i[0]&&isFinite(i[1])).map(i=>{const it=[String(i[0]),+i[1]];if(def.key==='mythos'&&/gyro|souvlaki|skewer|kebab|pita|plate|tortilla|bowl/i.test(it[0]))it.push('gyro');return it})}
  if(!items)items=base[1].map(i=>i.slice());
  const sub=def.data?[def.data.street,def.data.number].filter(Boolean).join(' '):(def.cat||'').replace(/_/g,' ');
  return{title:def.name,sub:sub||base[0],items}}
/* nearest building edge to (x,z): returns {px,pz,nx,nz,L,b,ei,t,depth} */
const EDGES={h:new Map(),list:[]};
function polyA(ps){let s=0;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];s+=a[0]*b[1]-b[0]*a[1]}return s/2}
function unpk(c){if(typeof unp==='function')return unp(c);const o=[];for(let i=0;i+1<c.length;i+=2)o.push([c[i]/10,c[i+1]/10]);return o}
function bPoly(bi){const b=MAP.buildings[bi];let ps=unpk(b[10]);if(polyA(ps)<0)ps=ps.slice().reverse();return ps}
function indexEdges(){for(let bi=0;bi<MAP.buildings.length;bi++){const ps=bPoly(bi),n=ps.length;for(let i=0;i<n;i++){const a=ps[i],c=ps[(i+1)%n],L=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L<1.2)continue;const e={a,c,L,nx:(c[1]-a[1])/L,nz:-(c[0]-a[0])/L,bi,ei:i};EDGES.list.push(e);
      const x0=Math.floor(Math.min(a[0],c[0])/16),x1=Math.floor(Math.max(a[0],c[0])/16),z0=Math.floor(Math.min(a[1],c[1])/16),z1=Math.floor(Math.max(a[1],c[1])/16);for(let gx=x0;gx<=x1;gx++)for(let gz=z0;gz<=z1;gz++){const k=gx*65536+gz;let q=EDGES.h.get(k);if(!q)EDGES.h.set(k,q=[]);q.push(e)}}}}
function snapEdge(x,z,maxD){const gx=Math.floor(x/16),gz=Math.floor(z/16);let best=null,bd=maxD||12;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const q=EDGES.h.get((gx+i)*65536+gz+j);if(!q)continue;
    for(const e of q){const dx=e.c[0]-e.a[0],dz=e.c[1]-e.a[1],u=cl(((x-e.a[0])*dx+(z-e.a[1])*dz)/(e.L*e.L),0.08,0.92),px=e.a[0]+dx*u,pz=e.a[1]+dz*u,d=Math.hypot(px-x,pz-z)*(((x-px)*e.nx+(z-pz)*e.nz)>=-0.5?1:1.6);if(d<bd){bd=d;best={e,u,px,pz}}}}return best}
/* how deep the building goes behind a door (metres), by stepping inwards through the footprint */
function depthAt(bi,px,pz,nx,nz){const ps=bPoly(bi);const inside=(x,z)=>typeof pip==='function'?pip(ps,x,z):false;let d=0;for(let k=0.6;k<=30;k+=0.5){if(!inside(px-nx*k,pz-nz*k))break;d=k}return d}
/* map v3: MAP.pois has every shop bay on its facade (fx,fz,nx,nz,w,b) — preferred when present */
function osmRef(id){const m=/^osm:([nwr])(\d+)/.exec(id||'');return m?({n:'node/',w:'way/',r:'relation/'}[m[1]]+m[2]):null}
function buildDoorsPois(){indexEdges();const DATA=(IN.shopsData&&IN.shopsData.shops)||[],byOsm=new Map(),byName=new Map();for(const s of DATA){if(s.osm)byOsm.set(s.osm,s);for(const k of new Set([normName(s.name),normName(s.nameLatin)])){if(!k)continue;if(!byName.has(k))byName.set(k,[]);byName.get(k).push(s)}}
  const findData=p=>{const o=osmRef(p.id);if(o&&byOsm.has(o))return byOsm.get(o);for(const k of[normName(p.name),normName(p.nameLatin)]){const q=byName.get(k);if(!q)continue;let best=null,bd=60;for(const s of q){if(s.x==null)continue;const d=Math.hypot(s.x-p.fx,s.z-p.fz);if(d<bd){bd=d;best=s}}if(best)return best}return null};
  const C=new Map();if(IN.census&&IN.census.places)for(const c of IN.census.places)C.set(c.id,c);
  const mk=o=>{const def=register(o);addDoor({def,px:o.door.x+o.door.nx*0.85,pz:o.door.z+o.door.nz*0.85});return def};
  for(const sp of SPECIALS){const s=MAP.special&&MAP.special[sp.key];if(!s)continue;const P=s.poi!=null?MAP.pois[s.poi]:null,data=(P&&findData(P))||(sp.find?DATA.find(sp.find):null);
    mk(Object.assign({},sp,{door:{x:s.x+s.nx*0.06,z:s.z+s.nz*0.06,nx:s.nx,nz:s.nz},data,special:true,w:sp.w||(s.interior&&s.interior.width)||s.w||8,d:sp.d||(s.interior&&s.interior.depth)||14}))}
  for(const p of MAP.pois){if(p.special||p.fx==null)continue;if(['shop','building','standalone'].indexOf(p.bay)<0)continue;const cat=p.cat||p.tag||'shop';if(NOENTER[cat])continue;
    const data=findData(p),cen=p.census&&C.get(p.census);const name=(data&&data.name)||p.name||p.nameLatin||'Shop';const tpl=CAT2TPL[(data&&data.category)||cat]||CAT2TPL[cat]||'generic';
    const dep=p.b!=null&&MAP.buildings[p.b]?depthAt(p.b,p.fx,p.fz,p.nx,p.nz):0;
    mk({name:String(name),cat:(data&&data.category)||cat,tpl,door:{x:p.fx+p.nx*0.06,z:p.fz+p.nz*0.06,nx:p.nx,nz:p.nz},w:cl(p.w||5,3.2,12),d:cl(dep||8,4,18),data,bg:p.bg,fg:p.fg,poi:p.id})}
  IN.doorCount=DOORS.length}
function buildDoors(){if(typeof MAP==='undefined'||!MAP||!MAP.buildings)return;if(Array.isArray(MAP.pois)&&MAP.pois.length&&MAP.pois[0].fx!=null)return buildDoorsPois();indexEdges();
  const DATA=(IN.shopsData&&IN.shopsData.shops)||[],byName=new Map();for(const s of DATA){const k=normName(s.nameLatin||s.name);if(!byName.has(k))byName.set(k,[]);byName.get(k).push(s);const k2=normName(s.name);if(k2!==k){if(!byName.has(k2))byName.set(k2,[]);byName.get(k2).push(s)}}
  const used=new Set(),findData=(name,x,z,r)=>{const q=byName.get(normName(name));if(!q)return null;let best=null,bd=r||60;for(const s of q){if(s.x==null)continue;const d=Math.hypot(s.x-x,s.z-z);if(d<bd){bd=d;best=s}}return best};
  const mk=(o)=>{const def=register(o);const d={def,px:o.door.x+o.door.nx*0.85,pz:o.door.z+o.door.nz*0.85,verb:o.special?'Enter':'Enter'};addDoor(d);return def};
  /* 1. the five specials + Sephora/Hondos are handled in their own files (SPECIALS) */
  for(const sp of SPECIALS){const s=MAP.special&&MAP.special[sp.key];if(!s)continue;const data=sp.find?DATA.find(sp.find):null;if(data)used.add(data);
    mk(Object.assign({},sp,{door:{x:s.door[0],z:s.door[1],nx:s.nx,nz:s.nz},data,special:true,w:sp.w||8,d:sp.d||14}))}
  /* 2. shop signs that the map places on building edges */
  const taken=[];const near=(x,z,r)=>taken.some(t=>Math.hypot(t[0]-x,t[1]-z)<r);
  for(const k in INTERIORS){const d=INTERIORS[k];taken.push([d.door.x,d.door.z])}
  for(let bi=0;bi<MAP.buildings.length;bi++){const b=MAP.buildings[bi],shops=b[8];if(!shops||!shops.length)continue;let ps=unpk(b[10]);const flip=polyA(ps)<0;if(flip)ps=ps.slice().reverse();const n=ps.length;
    const perEdge={};for(const s of shops){let ei=s[0];if(flip)ei=(n-2-ei+n)%n;(perEdge[ei]=perEdge[ei]||[]).push(s)}
    for(const ei in perEdge){const a=ps[+ei],c=ps[(+ei+1)%n];if(!a||!c)continue;const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz);if(L<0.5)continue;const nx=dz/L,nz=-dx/L,list=perEdge[ei];
      for(const s of list){const [,t,name,bg,fg,kind]=s;if(['mythos','paul','starbucks','kfc','super'].indexOf(kind)>=0)continue;if(NOENTER[kind])continue;const x=a[0]+dx*t,z=a[1]+dz*t;if(near(x,z,1.5))continue;
        const data=findData(name,x,z,60);if(data)used.add(data);const cat=(data&&data.category)||kind;const w=cl(L/list.length,3.2,11),dep=cl(depthAt(bi,x,z,nx,nz)||8,4,18);
        mk({name:String(name||'Shop'),cat,tpl:CAT2TPL[cat]||'generic',door:{x:x+nx*0.06,z:z+nz*0.06,nx,nz},w,d:dep,data,bg,fg});taken.push([x,z])}}}
  /* 3. researched shops (gk3/data/shops.json) the map does not sign: snap to the nearest facade */
  for(const s of DATA){if(used.has(s)||s.x==null||NOENTER[s.category])continue;const q=snapEdge(s.x,s.z,14);if(!q)continue;if(near(q.px,q.pz,1.6))continue;const e=q.e;
    mk({name:s.nameLatin&&/[a-z]/i.test(s.nameLatin)&&!/[Ͱ-Ͽ]/.test(s.name)?s.name:(s.name||s.nameLatin),cat:s.category,tpl:CAT2TPL[s.category]||'generic',door:{x:q.px+e.nx*0.06,z:q.pz+e.nz*0.06,nx:e.nx,nz:e.nz},w:cl(Math.min(e.L,7),3.4,9),d:cl(depthAt(e.bi,q.px,q.pz,e.nx,e.nz)||8,4,16),data:s});taken.push([q.px,q.pz])}
  /* 4. census (gk3/data/census.json): tiers A/B, street level, open */
  const C=(IN.census&&IN.census.places)||[];let nc=0;for(const p of C){if(p.x==null||(p.tier!=='A'&&p.tier!=='B')||p.streetLevel===false||p.open===false||p.inPlayable===false||NOENTER[p.category])continue;
    const q=snapEdge(p.x,p.z,10);if(!q||near(q.px,q.pz,2.2))continue;const e=q.e;mk({name:p.name||p.nameLatin||'Shop',cat:p.category,tpl:CAT2TPL[p.category]||'generic',door:{x:q.px+e.nx*0.06,z:q.pz+e.nz*0.06,nx:e.nx,nz:e.nz},w:cl(Math.min(e.L,6.5),3.4,8),d:cl(depthAt(e.bi,q.px,q.pz,e.nx,e.nz)||7,4,14),data:p.items?p:null,census:p});taken.push([q.px,q.pz]);nc++}
  IN.doorCount=DOORS.length}
/* API for the gameplay agent: get (or create) the interior of any shop record {name, x, z, category} or a door {x,z,nx,nz} */
INTERIORS.generic=function(shop){if(!shop)return null;if(shop.key&&INTERIORS[shop.key])return INTERIORS[shop.key];const x=shop.x!=null?shop.x:shop.door&&shop.door.x,z=shop.z!=null?shop.z:shop.door&&shop.door.z;
  let best=null,bd=6;for(const d of DOORS){const dd=Math.hypot(d.def.door.x-x,d.def.door.z-z)*(normName(d.def.name)===normName(shop.name)?0.3:1);if(dd<bd){bd=dd;best=d.def}}if(best)return best;
  const q=snapEdge(x,z,14);if(!q)return null;const e=q.e,cat=shop.category||shop.cat||'generic';return register({name:shop.name||'Shop',cat,tpl:CAT2TPL[cat]||'generic',door:{x:q.px,z:q.pz,nx:e.nx,nz:e.nz},w:cl(Math.min(e.L,7),3.4,9),d:cl(depthAt(e.bi,q.px,q.pz,e.nx,e.nz)||8,4,16),data:shop.items?shop:null})};

/* ============================== GENERIC INTERIORS: one deterministic room per shop, by category ==============================
   Sized from the real frontage (def.w) and the depth of the footprint behind the door (def.d). Colours and floor/wall materials follow
   gk3/data/shops.json (interior.palette / floor / walls) when the shop has them, else the category style below. */
const STY={/* floor, wall, ceil, counter front, counter top, accent, light colour, staff */
  cafe:{fl:['fl_wood','#ffffff'],wall:['plaster','#efe7da'],wa:{h:1.1,tile:'tile_subway',hex:'#f4f1ea'},ce:['ceiling','#f2efe9'],cf:['wood_dark','#ffffff'],ct:['marble','#ffffff'],acc:'#2f4a3a',lt:'#ffd4a0',h:3.4},
  bar:{fl:['fl_parquet','#8a7060'],wall:['brick','#b07a62'],ce:['planks_black','#ffffff'],cf:['panels_dark','#ffffff'],ct:['wood_table','#6a4a34'],acc:'#1d1d22',lt:'#ffb870',h:3.4,amb:0.45},
  restaurant:{fl:['fl_terracotta','#ffffff'],wall:['plaster','#efe6d6'],wa:{h:1.0,tile:'panels',hex:'#ffffff'},ce:['ceiling','#f2efe9'],cf:['wood_dark','#ffffff'],ct:['marble','#ffffff'],acc:'#7a3a26',lt:'#ffcf96',h:3.4},
  fastfood:{fl:['fl_large','#ffffff'],wall:['tile_white','#ffffff'],ce:['ceil_grid','#ffffff'],cf:['panels_dark','#ffffff'],ct:['steel','#ffffff'],acc:'#c8102e',lt:'#fff2dc',h:3.2,amb:0.72},
  bakery:{fl:['fl_cream','#ffffff'],wall:['tile_subway','#f6f0e4'],ce:['ceiling','#f2efe9'],cf:['oak','#ffffff'],ct:['marble','#ffffff'],acc:'#8a5a2b',lt:'#ffd9a8',h:3.3},
  clothes:{fl:['fl_wood','#e8ddd0'],wall:['plaster2','#f5f4f1'],ce:['ceiling','#f7f7f5'],cf:['oak_white','#ffffff'],ct:['oak_white','#ffffff'],acc:'#1b1b1d',lt:'#fff6ea',h:3.6,amb:0.74},
  shoes:{fl:['fl_concrete','#e6e2dc'],wall:['plaster2','#f3f1ee'],ce:['ceiling','#f7f7f5'],cf:['oak','#ffffff'],ct:['oak','#ffffff'],acc:'#2a2a2c',lt:'#fff4e2',h:3.5,amb:0.72},
  jewellery:{fl:['fl_mosaic','#ffffff'],wall:['wall_beige','#efe6d8'],ce:['ceiling','#f7f5f0'],cf:['walnut','#ffffff'],ct:['marble_beige','#ffffff'],acc:'#b8963a',lt:'#fff1d8',h:3.3},
  cosmetics:{fl:['fl_large','#ffffff'],wall:['plaster2','#ffffff'],ce:['ceiling','#ffffff'],cf:['wood_black','#ffffff'],ct:['marble','#ffffff'],acc:'#111111',lt:'#ffffff',h:3.4,amb:0.8},
  salon:{fl:['fl_checkbw','#ffffff'],wall:['plaster','#f1ece6'],ce:['ceiling','#f5f3f0'],cf:['wood_black','#ffffff'],ct:['marble','#ffffff'],acc:'#1d1d1f',lt:'#fff4e6',h:3.2,amb:0.74},
  optician:{fl:['fl_wood','#efe6da'],wall:['plaster2','#f6f6f4'],ce:['ceiling','#f7f7f5'],cf:['oak_white','#ffffff'],ct:['oak_white','#ffffff'],acc:'#1d3a5f',lt:'#ffffff',h:3.2,amb:0.78},
  pharmacy:{fl:['fl_lino','#ffffff'],wall:['plaster2','#ffffff'],ce:['ceil_grid','#ffffff'],cf:['oak_white','#ffffff'],ct:['marble','#ffffff'],acc:'#2e9a46',lt:'#ffffff',h:3.2,amb:0.8},
  bank:{fl:['fl_granite','#ffffff'],wall:['plaster','#ecebe7'],ce:['ceil_grid','#ffffff'],cf:['panels','#ffffff'],ct:['marble_beige','#ffffff'],acc:'#0d3b6e',lt:'#ffffff',h:3.3,amb:0.76},
  office:{fl:['carpet','#9a9690'],wall:['plaster','#ecebe7'],ce:['ceil_grid','#ffffff'],cf:['panels','#ffffff'],ct:['wood_fine','#ffffff'],acc:'#3a3f46',lt:'#ffffff',h:3.0,amb:0.74},
  minimarket:{fl:['fl_lino','#e8e8e6'],wall:['plaster2','#f4f4f2'],ce:['ceil_grid','#ffffff'],cf:['panels_dark','#ffffff'],ct:['steel','#ffffff'],acc:'#d7262d',lt:'#ffffff',h:3.2,amb:0.8},
  books:{fl:['fl_plank','#ffffff'],wall:['plaster','#efe8dc'],ce:['ceiling','#f2efe9'],cf:['walnut','#ffffff'],ct:['walnut','#ffffff'],acc:'#5a3c26',lt:'#ffd9a8',h:3.4},
  electronics:{fl:['fl_large','#d8d8d8'],wall:['plaster2','#f7f7f7'],ce:['ceiling','#ffffff'],cf:['oak_white','#ffffff'],ct:['oak_white','#ffffff'],acc:'#1b1b1d',lt:'#ffffff',h:3.3,amb:0.8},
  gallery:{fl:['fl_concrete','#ffffff'],wall:['plaster2','#ffffff'],ce:['ceiling','#ffffff'],cf:['oak_white','#ffffff'],ct:['oak_white','#ffffff'],acc:'#222',lt:'#fff8ee',h:3.8,amb:0.8},
  hotel:{fl:['fl_stone','#ffffff'],wall:['wall_beige','#efe4d2'],wa:{h:1.0,tile:'panels',hex:'#ffffff'},ce:['ceiling','#f5f1ea'],cf:['walnut','#ffffff'],ct:['marble_beige','#ffffff'],acc:'#6b4a2e',lt:'#ffd4a0',h:3.8},
  home:{fl:['fl_parquet','#ffffff'],wall:['plaster','#efe9e0'],ce:['ceiling','#f5f3ee'],cf:['oak','#ffffff'],ct:['oak','#ffffff'],acc:'#6b5a48',lt:'#ffe2b8',h:3.4},
  generic:{fl:['fl_stone','#ffffff'],wall:['plaster','#efece6'],ce:['ceiling','#f5f3ee'],cf:['oak','#ffffff'],ct:['marble','#ffffff'],acc:'#444',lt:'#fff0dc',h:3.3}};
/* shops.json interior text -> photo materials */
function styleFor(def){const s=Object.assign({},STY[def.tpl]||STY.generic,def.sty||{}),it=def.data&&def.data.interior;if(!it||def.sty)return s;const f=String(it.floor||'').toLowerCase(),w=String(it.walls||'').toLowerCase(),pal=Array.isArray(it.palette)?it.palette.filter(c=>/^#[0-9a-f]{6}$/i.test(c)):[];
  const F=[['herringbone','fl_parquet'],['parquet','fl_parquet'],['plank','fl_plank'],['oak','fl_wood'],['wood','fl_wood'],['laminate','fl_laminate'],['terrazzo','fl_terrazzo'],['marble','fl_mosaic'],['granite','fl_granite'],['terracotta','fl_terracotta'],['brick','fl_terracotta'],['concrete','fl_concrete'],['cement','fl_concrete'],['vinyl','fl_lino'],['lino','fl_lino'],['carpet','carpet'],['check','fl_checkbw'],['black and white','fl_checkbw'],['porcelain','fl_large'],['tile','fl_large'],['stone','fl_stone']];
  for(const [k,v] of F)if(f.indexOf(k)>=0){s.fl=[v,'#ffffff'];break}
  const Wm=[['brick','brick_paint'],['exposed brick','brick'],['subway','tile_subway'],['tile','tile_white'],['panel','panels'],['wood','panels'],['concrete','plaster'],['marble','marble']];for(const [k,v] of Wm)if(w.indexOf(k)>=0){s.wall=[v,s.wall[1]];break}
  if(pal.length){const light=pal.filter(c=>lum(c)>0.72),dark=pal.filter(c=>lum(c)<0.35),mid=pal.filter(c=>lum(c)>=0.35&&lum(c)<=0.72);if(light[0])s.wall=[s.wall[0],light[0]];if(mid[0])s.acc=mid[0];else if(dark[0])s.acc=dark[0];s.pal=pal}
  return s}
/* layout without geometry: frontage, door, counter, bounds */
function genericPlan(def,r){const W=cl(def.w||5,3.2,def.special?26:14),D=cl(def.d||8,4,def.special?22:20),st=Object.assign({},STY[def.tpl]||STY.generic,def.sty||{}),h=st.h||3.3,x0=-W/2,x1=W/2;let dx=0;
  if(W>5.5)dx=[-1,0,1][r.i(0,2)]*(W/2-1.6);dx=cl(dx,x0+1.1,x1-1.1);const dw=W<4?1.0:1.8;
  const t=def.tpl;let counter,side=0;
  if(t==='cafe'||t==='bakery'||t==='bar'||t==='pharmacy'||t==='minimarket'){side=dx>0?-1:1;/* counter along the side wall away from the door */}
  const cz=-D+1.25;counter=side?[side>0?x1-1.9:x0+1.9,cl(-D*0.55,-D+1.6,-2.4)]:[cl(-dx*0.3,x0+1.2,x1-1.2),cz+0.75];
  if(t==='minimarket'||t==='supermarket'){side=dx>0?-1:1;counter=[dx+side*1.6,-2.0]}
  return{W,D,h,x0,x1,door:[dx,dw],counter,side,bounds:{x0,x1,z0:-D,z1:0,h}}}
/* staff spec: tinted street avatar or a role avatar */
function staffSpec(r,tint){const ids=['f02','m07','f08','m03','f12','m11','f05','m09'];return{av:ids[r.i(0,ids.length-1)],tint:tint||['#1b1b1d','#1b1b1d'],scale:r.r(0.97,1.03)}}
const CUST=['m01','m02','m03','m04','m06','m08','m10','m12','m13','m14','m17','m20','f01','f02','f03','f05','f07','f09','f11','f13','f14','f15','f17','fp2','biz_m','biz_f'];let custN=0;
function customer(r){/* a different street avatar for every customer in the room (no repeats within an interior) */const ok=typeof PPL!=='undefined'&&PPL.av?CUST.filter(id=>PPL.av[id]):CUST;if(!ok.length)return typeof randomLook==='function'?randomLook():{fem:r()<0.5};
  const used=new Set(X?X.ppl.map(p=>p.spec&&p.spec.av):[]);let c=ok.filter(id=>!used.has(id));if(!c.length)c=ok;return{av:c[(r.i(0,c.length-1)+(custN++))%c.length],scale:r.r(0.96,1.04),build:r.r(0.95,1.06)}}
TPL.generic={plan:genericPlan,build(def,r){const P=def.local,st=styleFor(def),{W,D,h,x0,x1}=P,[dx,dw]=P.door,L=X.L,t=def.tpl;
  /* front: shop window both sides of the door */const win=[];const wy0=t==='bank'||t==='office'?0.9:0.35;if(dx-dw/2-0.25>x0+0.5)win.push([x0+0.25,dx-dw/2-0.2,wy0,Math.min(2.9,h-0.5)]);if(dx+dw/2+0.25<x1-0.5)win.push([dx+dw/2+0.2,x1-0.25,wy0,Math.min(2.9,h-0.5)]);
  room({x0,x1,d:D,h,floor:st.fl,wall:st.wall,wains:st.wa,ceil:st.ce,door:{x:dx,w:dw,h:2.3},win,skirt:st.skirt||'#3a3633'});
  frontage({door:{x:dx,w:dw,h:2.3},win,frame:st.frame||(def.fg&&lum(def.fg)<0.3?def.fg:'#1c1c1e'),seed:def.seed});
  /* shop name on the back wall (the real name, as on the street sign) */const bg=def.bg&&/^#[0-9a-f]{6}$/i.test(def.bg)?def.bg:null,fg=def.fg&&/^#[0-9a-f]{6}$/i.test(def.fg)?def.fg:null;
  const nameW=Math.min(W-1.0,Math.max(1.6,def.name.length*0.2));
  if(bg){L.box(0,h-0.95,-D+0.04,nameW+0.2,0.6,0.06,hx(bg),SEMI,{f:'zxXt'})}textPanel(0,h-0.65,-D+(bg?0.105:0.02),nameW,0.42,def.name,{fg:bg?(fg||'#ffffff'):(st.acc||'#222'),fam:/[Ͱ-Ͽ]/.test(def.name)?F_SANS:(t==='jewellery'||t==='hotel'||t==='restaurant'?F_SERIF:F_SANS),w:700,ppm:260,glow:0});
  /* lights: rows of downlights / tracks */const lt=st.lt;const nr=Math.max(1,Math.round(W/2.6)),nz=Math.max(2,Math.round(D/2.4));for(let i=0;i<nr;i++)for(let j=0;j<nz;j++){const lx=x0+W*(i+0.5)/nr,lz=-D*(j+0.5)/nz;
      if(t==='restaurant'||t==='cafe'||t==='bakery'||t==='bar'||t==='hotel'||t==='books'||t==='home')(j%2===0)?pendant(lx,h,lz,{len:h-2.35,style:['dome','bulb','cone','cyl'][def.seed%4],hex:st.acc,light:lt,i:t==='bar'?0.55:0.45}):downlight(lx,h,lz,{light:lt,i:0.32});
      else if(t==='minimarket'||t==='pharmacy'||t==='office'||t==='bank'||t==='fastfood')strip(lx,h,lz,Math.min(2.4,D/nz*0.8),PI/2,{light:lt,i:0.32});else downlight(lx,h,lz,{light:lt,i:0.42,r:0.06})}
  plight(0,h-0.3,-D*0.35,lt,0.5,Math.max(8,D));plight(0,h-0.3,-D*0.8,lt,0.35,Math.max(8,D*0.8));
  (FILL[t]||FILL.generic)(def,r,P,st);
  /* customers browsing / waiting (1-3) */const nC=t==='bank'||t==='office'?1:r.i(1,Math.min(3,Math.floor(W*D/18)+1));for(let i=0;i<nC;i++){const cx=r.r(x0+0.8,x1-0.8),cz=r.r(-D+2.6,-1.8);person(customer(r),cx,cz,r.r(-PI,PI),r.p(['idle','look_around','phone','text','idle']),null)}}};
/* counter + till + staff behind it; returns the counter frame */
function serviceCounter(P,st,o){o=o||{};const {W,D,x0,x1}=P,[cx,cz]=P.counter,side=P.side,len=o.len||Math.min(W-1.2,o.maxLen||3.2);let x,z,ry,sx,sz,sy;
  if(side){ry=side>0?-PI/2:PI/2;const L2=Math.min(D-3.2,o.len||4.2);x=side>0?x1-1.15:x0+1.15;z=cz;counter(x,z,L2,ry,{h:o.h||1.05,front:st.cf,top:st.ct});sx=side>0?x1-0.45:x0+0.45;sz=z;sy=ry;
    if(o.till!==false)till(x+(side>0?0.05:-0.05),o.h||1.05,z+L2*0.3,ry);return{x,z,ry,len:L2,staff:[sx,sz,sy]}}
  ry=0;x=cl(cx,x0+len/2+0.3,x1-len/2-0.3);z=cz-0.75;counter(x,z,len,0,{h:o.h||1.05,front:st.cf,top:st.ct});if(o.till!==false)till(x+len*0.25,o.h||1.05,z-0.05,0);return{x,z,ry,len,staff:[x,z-0.75,0]}}
function staffAt(c,r,spec,act){person(spec||staffSpec(r),c.staff[0],c.staff[1],c.staff[2],act||'idle',null);X.ppl[X.ppl.length-1].look=true}
const FILL={
  cafe(def,r,P,st){const c=serviceCounter(P,st,{len:3.6});const L=X.L;L.push(c.x,1.05,c.z,c.ry);coffeeMachine(-c.len*0.25,0,-0.1,PI);L.pop();
    /* pastry case section (in front of the counter) */displayCase(c.x+Math.sin(c.ry)*0.0+(c.ry?0:-c.len*0.3+0.6),c.z+(c.ry?(c.len*0.25):0)+Math.cos(c.ry)*0.72,1.2,c.ry,{h:1.2,fill:pastryFill(r)});
    backBoard(P,st,def,c);staffAt(c,r,staffSpec(r,[st.acc,'#1b1b1d']),'idle');seating(P,r,st,{style:'bistro',round:true,tbl:0.6})},
  bar(def,r,P,st){const c=serviceCounter(P,st,{len:4.4,h:1.1});const L=X.L;/* stools along the bar and back-lit bottle shelves */const n=Math.floor(c.len/0.65);
    for(let i=0;i<n;i++){const t=-c.len/2+0.35+i*(c.len/n),cs=Math.cos(c.ry),sn=Math.sin(c.ry);chair(c.x+t*cs+sn*0.7,c.z-t*sn+cs*0.7,c.ry+PI,{style:'stool',seat:'#3a2418'})}
    bottleWall(c,P,r);staffAt(c,r,null,'idle');seating(P,r,st,{style:'wood',round:true,tbl:0.6,frame:'#2a1c14',seat:'#5a2a1a'})},
  restaurant(def,r,P,st){const c=serviceCounter(P,st,{len:2.4});backBoard(P,st,def,c);staffAt(c,r,'waiter','idle');pictures(P,r);seating(P,r,st,{style:r()<0.5?'wood':'arm',lay:2,tbl:0.8,topT:r()<0.5?'marble':'wood_table'})},
  fastfood(def,r,P,st){const c=serviceCounter(P,st,{len:Math.min(P.W-1.2,4.4)});screens(P,c,def,st);staffAt(c,r,staffSpec(r,[st.acc,'#1b1b1d']),'idle');seating(P,r,st,{style:'plastic',frame:'#d8d4cc',tbl:0.7,topT:'wood_table'})},
  bakery(def,r,P,st){const c=serviceCounter(P,st,{len:4.4,h:0.95});const cs=Math.cos(c.ry),sn=Math.sin(c.ry);displayCase(c.x+sn*0.02,c.z+cs*0.02,Math.min(c.len,3.6),c.ry,{h:1.3,d:0.75,shelves:2,fill:pastryFill(r)});
    breadRack(c,P,r);staffAt(c,r,'chef','idle');seating(P,r,st,{style:'bistro',round:true,tbl:0.55,max:4})},
  clothes(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:1.8,h:1.0});staffAt(c,r,staffSpec(r),'idle');
    for(let z=-1.8;z>-D+2.8;z-=1.7){clothesRail(x0+0.45,z,1.4,PI/2,{long:r()<0.4});clothesRail(x1-0.45,z,1.4,-PI/2,{long:r()<0.4})}
    if(W>4.6)for(let z=-2.4;z>-D+3.4;z-=2.6)displayTable(0,z,Math.min(1.6,W-3.4),0.9,0,{n:8});
    fittingRooms(P,r,st);mirror(x0+0.03,1.2,-D*0.5,0.6,1.7,PI/2)},
  shoes(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:1.6,h:1.0});staffAt(c,r,staffSpec(r),'idle');
    shelving(x0+0.25,-D/2+0.6,D-3.4,PI/2,{wall:true,d:0.35,n:6,goods:shoeGoods,hex:'#f2efe9',tile:'oak_white'});shelving(x1-0.25,-D/2+0.6,D-3.4,-PI/2,{wall:true,d:0.35,n:6,goods:shoeGoods,hex:'#f2efe9',tile:'oak_white'});
    for(let z=-2.6;z>-D+3.2;z-=2.8){displayTable(0,z,Math.min(1.4,W-3.2),0.8,0,{kind:'shoe',n:7,h:0.45,hex:'#d8cbb8'});}
    for(let z=-2.0;z>-D+3;z-=3.4)banquette(x0+1.1,z,1.0,PI/2,{seat:'#3a3a3c',base:'#d8cbb8',baseT:'oak'})},
  jewellery(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:Math.min(W-1.4,2.6),h:0.95});staffAt(c,r,staffSpec(r,['#1b1b1d','#1b1b1d']),'idle');
    for(let z=-2;z>-D+2.8;z-=1.8){displayCase(x0+0.55,z,1.4,PI/2,{h:1.05,d:0.6,shelves:1,base:'#3a2a1d',baseT:'walnut',fill:jewelFill(r)});displayCase(x1-0.55,z,1.4,-PI/2,{h:1.05,d:0.6,shelves:1,base:'#3a2a1d',baseT:'walnut',fill:jewelFill(r)})}
    chair(c.x-0.5,c.z+0.75,PI,{style:'arm',seat:'#6b1f2a'});chair(c.x+0.5,c.z+0.75,PI,{style:'arm',seat:'#6b1f2a'});plant(x1-0.5,-0.9,{h:1.2})},
  cosmetics(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:2.0,h:1.0});staffAt(c,r,staffSpec(r,['#111','#111']),'idle');
    shelving(x0+0.25,-D/2+0.5,D-3.0,PI/2,{wall:true,d:0.4,n:6,kind:'jar',hex:'#ffffff',kick:'#111'});shelving(x1-0.25,-D/2+0.5,D-3.0,-PI/2,{wall:true,d:0.4,n:6,kind:'bottle',hex:'#ffffff',kick:'#111'});
    if(W>4.4)for(let z=-2.4;z>-D+3.2;z-=2.6)shelving(0,z,Math.min(1.8,W-3.4),0,{h:1.35,n:3,kind:'jar',hex:'#111111'});mirror(x0+0.04,1.4,-1.6,0.7,0.9,PI/2,{frame:'#d9c7a3'})},
  salon(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:1.4,h:1.05});const n=Math.max(2,Math.floor((D-3.5)/1.3));
    for(let i=0;i<n;i++){const z=-2.4-i*1.3;mirror(x0+0.04,1.45,z,0.7,1.0,PI/2,{frame:'#c9a961'});X.L.box(x0+0.2,0.8,z,0.4,0.04,0.9,hx('#1b1b1d'),SEMI);chair(x0+0.85,z,-PI/2,{style:'arm',frame:'#1b1b1d',seat:'#1b1b1d'});
      if(i===0)person(customer(r),x0+0.85,z,-PI/2,'sit_table',{seatH:0.45})}
    staffAt({staff:[x0+1.4,-2.4,-PI/2]},r,staffSpec(r,['#1b1b1d','#1b1b1d']),'idle');armchair(x1-0.6,-1.6,-PI/2,{hex:'#3a3a3c',tile:'fabric'});X.L.box(x1-0.6,0,-2.5,0.5,0.45,0.5,hx('#c9a961'),M('oak'))},
  optician(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:1.6,h:0.95});staffAt(c,r,staffSpec(r),'idle');
    shelving(x0+0.2,-D/2+0.5,D-3.0,PI/2,{wall:true,d:0.22,n:7,goods:frameGoods,hex:'#f4f4f2',tile:'oak_white'});shelving(x1-0.2,-D/2+0.5,D-3.0,-PI/2,{wall:true,d:0.22,n:7,goods:frameGoods,hex:'#f4f4f2',tile:'oak_white'});
    table(0,-D*0.55,{w:1.2,d:0.7,top:M('oak_white'),legs:4,base:'#e8e8e6'});chair(-0.3,-D*0.55+0.55,PI,{style:'metal'});chair(0.3,-D*0.55+0.55,PI,{style:'metal'});mirror(0,1.3,-D+0.03,0.5,0.8,0)},
  pharmacy(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:Math.min(4,D-3.4)});staffAt(c,r,{av:'f08',tint:['#ffffff','#e8e8e6']},'idle');
    const ws=c.ry>0?-1:1;shelving(c.ry<0?x1-0.25:x0+0.25,c.z,Math.min(5,D-2.6),c.ry,{wall:true,d:0.4,n:6,kind:'box',hex:'#ffffff'});
    shelving(c.ry<0?x0+0.25:x1-0.25,-D/2+0.4,D-3.0,-c.ry,{wall:true,d:0.4,n:5,kind:'box',hex:'#ffffff'});
    /* green cross */const cr=boardTile(128,128,(g,W,H)=>{g.fillStyle='#2e9a46';g.fillRect(W*0.34,0,W*0.32,H);g.fillRect(0,H*0.34,W,H*0.32)});X.B.panel(0,P.h-0.6,-D+0.03,0.6,0.6,WH,cr,{gl:0})},
  bank(def,r,P,st){const {W,D,x0,x1}=P;const n=Math.max(1,Math.min(3,Math.floor((W-1)/1.6)));for(let i=0;i<n;i++){const x=x0+(W/n)*(i+0.5);counter(x,-D+1.5,1.4,0,{h:1.05,front:st.cf,top:st.ct});X.G.face([x-0.68,1.05,-D+1.5],[x+0.68,1.05,-D+1.5],[x+0.68,1.9,-D+1.5],[x-0.68,1.9,-D+1.5],hx('#d8ecf0'),FLAT);
      X.L.push(x,1.05,-D+1.25,0);monitor(0,0,0,PI);X.L.pop();person(staffSpec(r,['#0d3b6e','#1b1b1d']),x,-D+0.9,0,'idle',null)}
    P.counter=[x0+W/(2*n),-D+2.3];/* queue display + waiting chairs */textPanel(x1-0.9,2.3,-D+0.04,1.2,0.4,'A 042 → 2',{bg:'#111',fg:'#ff4a3a',ppm:200,glow:0});for(let i=0;i<3;i++)chair(x0+0.5,-2.2-i*0.6,PI/2,{style:'metal',seat:'#0d3b6e'});plant(x1-0.5,-1.0)},
  office(def,r,P,st){const {W,D,x0,x1}=P;const n=Math.max(1,Math.min(3,Math.floor((D-3)/2.4)));for(let i=0;i<n;i++){const z=-2.8-i*2.4,x=i%2?x1-1.2:x0+1.2;table(x,z,{w:1.4,d:0.75,top:M('wood_fine'),legs:4,base:'#2a2a2c'});X.L.push(x,0.75,z-0.15,0);monitor(0,0,0,0);X.L.pop();
      chair(x,z-0.7,0,{style:'metal',seat:'#2a2a2c'});chair(x-0.35,z+0.65,PI,{style:'metal',seat:st.acc});chair(x+0.35,z+0.65,PI,{style:'metal',seat:st.acc});if(i===0)person(staffSpec(r,['#3a3f46','#1b1b1d']),x,z-0.7,0,'sit_table',{seatH:0.45})}
    P.counter=[x0+1.2,-2.8+0.95];pictures(P,r);plant(x1-0.5,-1.0)},
  minimarket(def,r,P,st){const {W,D,x0,x1}=P;const [dx]=P.door;const side=P.side;const cX=dx+side*1.6;counter(cX,-2.2,1.6,side>0?-PI/2:PI/2,{h:0.95,front:st.cf,top:st.ct});till(cX,0.95,-2.0,side>0?-PI/2:PI/2);person(staffSpec(r,[st.acc,'#1b1b1d']),cX+side*0.7,-2.2,side>0?-PI/2:PI/2,'idle',null);X.ppl[X.ppl.length-1].look=true;P.counter=[cX-side*0.75,-2.2];
    fridge(side>0?x0+0.45:x1-0.45,-D/2-0.4,Math.min(3.6,D-4),side>0?PI/2:-PI/2,{label:'COLD DRINKS',header:st.acc});
    const nA=Math.max(1,Math.floor((W-1.6)/1.9));for(let i=0;i<nA;i++){const x=x0+0.9+(W-1.8)*(i+0.5)/nA;if(Math.abs(x-cX)<1.2&&nA<2)continue;shelving(x,-D/2-1.0,Math.min(D-5,6),PI/2,{h:1.6,n:4,d:0.8})}
    shelving(0,-D+0.3,W-1.2,0,{wall:true,d:0.45,n:5});/* gum and sweets on the counter */X.L.box(cX,0.95,-2.65,0.4,0.25,0.25,WH,SUB('labels',8,r.i(0,63)),{fit:[1,1],ry:side>0?-PI/2:PI/2})},
  books(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:1.6,h:1.0});staffAt(c,r,staffSpec(r),'idle');spineWall(x0+0.17,-D/2+0.6,D-3,PI/2,{n:6});spineWall(x1-0.17,-D/2+0.6,D-3,-PI/2,{n:6});
    for(let z=-2.4;z>-D+3;z-=2.4)displayTable(0,z,Math.min(1.5,W-2.8),0.9,0,{kind:'book',n:12,h:0.78,hex:'#6b4a2e',tile:'walnut'});armchair(x1-1.0,-D+2.6,-PI*0.75,{hex:'#6b3f22'});rug(0,-D*0.5,Math.min(2,W-2),2.6,0,1)},
  electronics(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:2.2,h:1.0});staffAt(c,r,staffSpec(r,['#1b4f9c','#1b1b1d']),'idle');
    shelving(x0+0.22,-D/2+0.5,D-3,PI/2,{wall:true,d:0.3,n:6,goods:phoneGoods,hex:'#f7f7f7'});shelving(x1-0.22,-D/2+0.5,D-3,-PI/2,{wall:true,d:0.3,n:6,goods:phoneGoods,hex:'#f7f7f7'});
    for(let z=-2.4;z>-D+3;z-=2.4){const w=Math.min(2.0,W-3);X.L.box(0,0,z,w,0.9,0.8,hx('#e9e7e2'),M('oak_white'));for(let k=0;k<4;k++)device(-w/2+0.25+k*(w-0.5)/3,0.9,z,r)}},
  gallery(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:1.4,h:0.95});staffAt(c,r,staffSpec(r,['#111','#111']),'idle');
    for(let z=-1.8;z>-D+2;z-=2.2){painting(x0+0.02,1.55,z,r.r(0.8,1.4),r.r(0.6,1.1),PI/2,r);painting(x1-0.02,1.55,z,r.r(0.8,1.4),r.r(0.6,1.1),-PI/2,r)}
    banquette(0,-D*0.5,1.4,0,{d:0.45,base:'#e9e7e2',baseT:'oak_white',seat:'#2a2a2c',back:'#2a2a2c'});for(let z=-1.5;z>-D+1.5;z-=1.5)for(const s of[-1,1])pool(s*(W/2-0.3),2.2,z,'#fff4e0',0.5,1.8)},
  hotel(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:Math.min(W-1.6,3.0),h:1.1});staffAt(c,r,staffSpec(r,['#1b1b1d','#1b1b1d']),'idle');
    rug(0,-D*0.45,Math.min(3,W-1.8),Math.min(3.2,D-4),0,0);armchair(-0.9,-D*0.45,PI/2,{});armchair(0.9,-D*0.45,-PI/2,{});table(0,-D*0.45,{w:0.8,d:0.5,h:0.42,top:M('marble_beige'),legs:4,base:'#6b4a2e'});
    plant(x0+0.5,-1,{h:1.8});plant(x1-0.5,-1,{h:1.8});pictures(P,r);pendant(0,P.h,-D*0.45,{len:1.0,style:'bulb',i:0.7,r:3.5})},
  home(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:1.6,h:0.95});staffAt(c,r,staffSpec(r),'idle');
    shelving(x0+0.25,-D/2+0.5,D-3,PI/2,{wall:true,d:0.4,n:4,goods:homeGoods,hex:'#e8dfd2',tile:'oak'});shelving(x1-0.25,-D/2+0.5,D-3,-PI/2,{wall:true,d:0.4,n:4,goods:homeGoods,hex:'#e8dfd2',tile:'oak'});
    for(let z=-2.4;z>-D+3;z-=2.6)displayTable(0,z,Math.min(1.6,W-3),0.9,0,{kind:'box',n:6,hex:'#cbb59a',tile:'oak'});rug(0,-D*0.5,Math.min(2.2,W-2.4),1.6,0,3)},
  generic(def,r,P,st){const {W,D,x0,x1}=P;const c=serviceCounter(P,st,{len:2.0});staffAt(c,r,staffSpec(r),'idle');shelving(x0+0.25,-D/2+0.5,D-3,PI/2,{wall:true,d:0.4,n:5});shelving(x1-0.25,-D/2+0.5,D-3,-PI/2,{wall:true,d:0.4,n:5});
    if(W>4.4)for(let z=-2.6;z>-D+3;z-=2.8)displayTable(0,z,Math.min(1.4,W-3.2),0.8,0,{kind:'box',n:6})}};
/* ---- fillers ---- */
function seating(P,r,st,o){const {W,D,x0,x1}=P,[dx]=P.door;const tw=o.tbl||0.7,cnt=[];let n=0;const side=P.side;
  /* tables along the free wall and the middle, leaving a 1.1 m aisle from the door */
  const zs=[];for(let z=-1.9;z>-D+2.2;z-=1.6)zs.push(z);const xsCand=[x0+0.75,x1-0.75];if(W>6)xsCand.push(0);
  for(const z of zs)for(const x of xsCand){if(side&&((side>0&&x>x1-2.6)||(side<0&&x<x0+2.6)))continue;if(Math.abs(x-dx)<1.1&&z>-3.2)continue;if(!P.side&&z<-D+3.0)continue;if(o.max&&n>=o.max)break;
    table(x,z,{w:tw,d:tw,round:o.round,lay:o.lay||1,top:M(o.topT||'marble'),plateRim:st.acc});const ax=x<0?1:-1;
    chair(x,z+tw/2+0.32,PI,{style:o.style,frame:o.frame,seat:o.seat||st.acc});chair(x,z-tw/2-0.32,0,{style:o.style,frame:o.frame,seat:o.seat||st.acc});
    if(n<2&&r()<0.75){person(customer(r),x,z-tw/2-0.32,0,'sit_table',{seatH:0.45})}n++}}
function backBoard(P,st,def,c){const m=def.menu.items.slice(0,9),w=Math.min(P.W-1.2,2.6),h=1.1;const half=Math.ceil(m.length/2);
  if(P.side){const x=P.side>0?P.x1-0.03:P.x0+0.03;menuBoard(x,2.35,c.z,w,h,P.side>0?-PI/2:PI/2,{cols:[{title:'MENU',rows:m.slice(0,half)},{title:' ',rows:m.slice(half)}],ac:'#f5d48a'})}
  else menuBoard(c.x,2.4,-P.D+0.08,w,h,0,{cols:[{title:'MENU',rows:m.slice(0,half)},{title:' ',rows:m.slice(half)}],ac:'#f5d48a'})}
function screens(P,c,def,st){const m=def.menu.items,n=Math.min(3,Math.max(1,Math.floor(c.len/1.3)));for(let i=0;i<n;i++){const part=m.slice(i*3,i*3+3);if(!part.length)break;const x=c.x-c.len/2+(i+0.5)*c.len/n;
    menuBoard(x,2.45,-P.D+0.1,Math.min(1.15,c.len/n-0.1),0.68,0,{cols:[{title:['TODAY','MENUS','EXTRAS'][i],rows:part}],bg:'#101010',ac:'#ffffff',pc:'#ffd23a',paintBg:(g,W,H)=>{g.fillStyle=st.acc;g.fillRect(0,0,W,H*0.18)}})}}
function pictures(P,r){const {D,x0,x1}=P;for(let z=-2.2;z>-D+2;z-=2.6){for(const s of[-1,1]){const x=s<0?x0+0.03:x1-0.03;if(r()<0.35)continue;painting(x,1.65,z,0.7,0.5,s<0?PI/2:-PI/2,r,true)}}}
function painting(x,y,z,w,h,ry,r,photo){picture(x,y,z,w,h,ry,(g,W,H)=>{const rr=RNG(Math.round(x*100+z*37));if(photo){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#d8d0c0');gr.addColorStop(1,'#8a8070');g.fillStyle=gr;g.fillRect(0,0,W,H);g.fillStyle='rgba(40,35,30,.6)';
      for(let k=0;k<5;k++){const bx=rr()*W,bw=W*rr.r(0.1,0.3),bh=H*rr.r(0.2,0.6);g.fillRect(bx,H-bh-H*0.15,bw,bh)}g.fillStyle='rgba(60,55,45,.7)';g.fillRect(0,H*0.85,W,H*0.15);g.strokeStyle='#f4efe4';g.lineWidth=W*0.04;g.strokeRect(0,0,W,H);return}
    const pal=[['#1d3557','#e63946','#f1faee','#a8dadc'],['#264653','#2a9d8f','#e9c46a','#f4a261'],['#3d405b','#e07a5f','#f2cc8f','#81b29a'],['#0b090a','#b1a7a6','#e5383b','#f5f3f4']][rr.i(0,3)];g.fillStyle=pal[2];g.fillRect(0,0,W,H);
    for(let k=0;k<7;k++){g.fillStyle=pal[rr.i(0,3)];g.globalAlpha=0.85;if(rr()<0.5)g.fillRect(rr()*W,rr()*H,rr()*W*0.5,rr()*H*0.5);else{g.beginPath();g.arc(rr()*W,rr()*H,rr()*W*0.25,0,TAU2);g.fill()}}g.globalAlpha=1},photo?'#e8e2d6':'#1a1a1a')}
function fittingRooms(P,r,st){const {W,D,x0,x1}=P;const n=W>5?2:1,w=1.1;for(let i=0;i<n;i++){const x=x1-0.6-i*(w+0.1)-w/2+0.5;const z=-D+0.6;X.L.box(x-w/2,0,z,0.05,2.3,1.1,hx('#efece6'),M('oak_white'));X.L.box(x+w/2,0,z,0.05,2.3,1.1,hx('#efece6'),M('oak_white'));
    for(let k=0;k<7;k++){const xx=x-w/2+0.08+k*(w-0.16)/6;X.L.box(xx,0.06,z+0.55+((k%2)?0.03:0),(w-0.1)/7+0.03,2.1,0.02,hx(st.acc==='#1b1b1d'?'#2b2b2e':'#8a7a66'),M('cloth'),{fit:[1,1]})}X.L.tube([x-w/2,2.2,z+0.56],[x+w/2,2.2,z+0.56],0.012,6,hx('#c8ccd0'),M('steel'));colBox(x,z,w,1.1,0)}}
function bottleWall(c,P,r){const cs=Math.cos(c.ry),sn=Math.sin(c.ry),bx=c.staff[0]-sn*0.4,bz=c.staff[1]-cs*0.4;X.L.push(bx,0,bz,c.ry);X.L.box(0,0.9,-0.05,c.len,1.4,0.04,hx('#fff1d6'),EMIT,{gl:0.35,f:'z'});
  for(let i=0;i<3;i++){const y=1.0+i*0.42;X.L.box(0,y,0.08,c.len,0.025,0.26,hx('#d8dadc'),GLOSS);goods(-c.len/2+0.05,c.len/2-0.05,y+0.025,0.08,0.22,0.34,r,'bottle')}X.L.pop();pool(bx+sn*0.5,1.5,bz+cs*0.5,'#ffb46a',0.5,2.4)}
function breadRack(c,P,r){const cs=Math.cos(c.ry),sn=Math.sin(c.ry),bx=c.staff[0]-sn*0.35,bz=c.staff[1]-cs*0.35;X.L.push(bx,0,bz,c.ry);X.L.box(0,0,-0.1,c.len,2.2,0.04,hx('#ffffff'),M('oak'),{f:'z'});
  for(let i=0;i<5;i++){const y=0.9+i*0.3;X.L.box(0,y,0.08,c.len,0.025,0.32,hx('#ffffff'),M('oak'));for(let x=-c.len/2+0.15;x<c.len/2-0.1;x+=r.r(0.12,0.3)){if(r()<0.5){X.L.push(x,y+0.06,0.1,0,0,PI/2);X.L.ball(0,0,0,0.05,0.3,0.06,8,5,WH,SUB('pastry',4,1),{fit:true});X.L.pop()}else X.L.ball(x,y+0.07,0.1,0.11,0.07,0.09,8,5,WH,SUB('pastry',4,r.p([7,10,4])),{fit:true})}}X.L.pop()}
function pastryFill(r){return(L,i,len,y,z,dep)=>{for(let x=-len/2+0.08;x<len/2-0.06;x+=0.13){const k=r.p([0,0,2,3,4,5,6]);if(k===6){L.box(x,y,z,0.1,0.07,0.1,WH,SUB('pastry',4,6),{fit:[1,1],tt:SUB('pastry',4,3)})}else if(k===0){L.push(x,y+0.03,z,r.r(-0.3,0.3),0,PI/2);L.ball(0,0,0,0.03,0.07,0.035,8,5,WH,SUB('pastry',4,0),{fit:true});L.pop()}
      else L.cyl(x,y,z,0.05,0.048,0.03,12,hx('#e8c890'),SUB('pastry',4,14),{cap:true,tt:SUB('pastry',4,k),capFit:true})}}}
function jewelFill(r){return(L,i,len,y,z,dep)=>{L.box(0,y,z,len,0.03,dep,hx('#1b1b1d'),M('fabric'));for(let x=-len/2+0.08;x<len/2-0.05;x+=0.12){const c=r()<0.5?'#e8c66a':'#d8dade';L.cyl(x,y+0.03,z,0.018,0.018,0.006,10,hx(c),M('steel'),{cap:true});L.ball(x+0.04,y+0.04,z+0.04,0.008,0.008,0.008,6,4,hx('#ffffff'),GLOSS)}}}
function shoeGoods(x0,x1,y,zc,dep,hmax,r){const L=X.L;for(let x=x0+0.06;x<x1-0.15;x+=0.3){const c=hx(r.p(['#1a1a1a','#6b3f22','#e9e6df','#8c1c24','#c8b28a','#3a4a6a']));L.push(x+0.08,y,zc,PI/2+r.r(-0.1,0.1));L.box(0,0,0,0.1,0.03,0.27,hx('#efefef'),FLAT);L.box(0,0.03,-0.03,0.095,0.07,0.2,c,M('leather'));L.box(0,0.03,0.07,0.09,0.04,0.08,c,M('leather'));L.pop()}}
function frameGoods(x0,x1,y,zc,dep,hmax,r){const L=X.L;for(let x=x0+0.05;x<x1-0.14;x+=0.17){const c=hx(r.p(['#111','#5a3a24','#b8963a','#c8c8c8','#7a1f2b','#1d3a5f']));L.box(x+0.06,y+0.04,zc,0.13,0.045,0.012,c,GLOSS);L.box(x+0.06,y+0.0,zc+0.02,0.13,0.004,0.06,hx('#e8e8e8'),FLAT)}}
function phoneGoods(x0,x1,y,zc,dep,hmax,r){const L=X.L;for(let x=x0+0.05;x<x1-0.1;x+=0.18){L.push(x+0.04,y,zc,0,-0.2);L.box(0,0,0,0.075,0.15,0.01,hx('#1b1b1d'),GLOSS);L.box(0,0.008,0.006,0.066,0.135,0.001,WH,SUB('panel',4,r.p([1,5,9,13])),{fit:[1,1],gl:0.6,f:'z'});L.pop();L.box(x+0.04,y,zc+0.05,0.12,0.02,0.06,hx('#efefef'),FLAT)}}
function homeGoods(x0,x1,y,zc,dep,hmax,r){const L=X.L;for(let x=x0+0.1;x<x1-0.12;x+=r.r(0.2,0.35)){const k=r.i(0,2),c=hx(r.p(['#e9e2d6','#c8b28a','#6b7f6a','#a35a3c','#3a4a5a','#f4f1ea']));if(k===0)L.lathe(x,y,zc,[[0.05,0],[0.08,0.08],[0.06,0.18],[0.035,0.24],[0.04,0.26]],10,c,GLOSS);else if(k===1)L.cyl(x,y,zc,0.045,0.045,0.09,10,c,SEMI,{cap:true});else L.box(x,y,zc,0.2,0.16,0.05,c,SEMI)}}
function monitor(x,y,z,ry){const L=X.L;L.push(x,y,z,ry);L.box(0,0,0,0.2,0.015,0.15,hx('#222'),SEMI);L.box(0,0.015,0,0.03,0.2,0.03,hx('#222'),SEMI);L.box(0,0.15,0.02,0.5,0.3,0.025,hx('#1b1b1d'),SEMI);L.box(0,0.165,0.033,0.47,0.27,0.001,WH,SUB('panel',4,5),{fit:[1,1],gl:0.6,f:'z'});L.pop()}
function device(x,y,z,r){const L=X.L;L.push(x,y,z,r.r(-0.3,0.3),-PI/2+0.3);L.box(0,0,0,0.08,0.16,0.01,hx('#1b1b1d'),GLOSS);L.box(0,0.008,0.006,0.07,0.145,0.001,WH,SUB('panel',4,r.p([1,5,9,13])),{fit:[1,1],gl:0.7,f:'z'});L.pop();L.box(x,y,z,0.12,0.03,0.1,hx('#d8d8d8'),M('steel'))}

/* ============================== MYTHOS PLUS (Kassaveti 13) — hand-made after docs/research/INTERIORS.md §1 ==============================
   Two rooms in a row: the grill hall (x -4.6..+1.9, z 0..-13; open kitchen on the LEFT behind an L-shaped beige finger-tile counter, terracotta
   brick floor, ochre tiled vault at the street end, two gyro spits in the street window) and the "garden in" courtyard hall (x -4.9..+4.6,
   z -13.2..-27; timber posts and beams, cream fabric roof, pine floor, pink-tile banquettes, marble tables). */
function wallQ(ax,az,bx,bz,y0,y1,tile,hex,holes,kind){X.L.wall(ax,az,bx,bz,y0,y1,hx(hex),M(tile),{holes:holes||[]});if(kind!==false)seg(ax,az,bx,bz,kind||'b')}
const MY={x0:-4.6,x1:1.9,d1:13,gx0:-4.9,gx1:4.6,gz0:-13.2,gz1:-27,h1:4.2,vault:4.0,crown:4.7,h2:3.7};
const MYTHOS_MENU=[['Pork gyro pita',4.5,'gyro'],['Chicken gyro pita',4.5,'gyro'],['Pork souvlaki pita',4.5,'gyro'],['Chicken souvlaki pita',4.5,'gyro'],['Kebab pita',4.5,'gyro'],['Veal pita',4.9,'gyro'],
  ['Gyro tortilla (double filling)',7.0,'gyro'],['Pork skewer (with small pita)',3.2,'gyro'],['Chicken thigh skewer',3.2,'gyro'],['Gyro plate, pork or chicken',11.9,'gyro'],['Souvlaki plate, 3 skewers',11.9,'gyro'],
  ['Mythos Plus bowl',6.9,'gyro'],['Fresh hand-cut fries',4.9,''],['Greek salad',9.9,''],['Tzatziki',4.9,''],['Coca-Cola 330 ml',2.0,'drink'],['Avra water 0.5 l',0.5,'drink'],['Alfa beer 330 ml',2.5,'drink']];
function mythosPlan(def){return{W:6.5,D:27,h:MY.h1,x0:MY.gx0,x1:MY.gx1,door:[0,1.9],counter:[-0.45,-3.0],side:0,bounds:{x0:MY.gx0,x1:MY.gx1,z0:MY.gz1,z1:0,h:MY.h1}}}
function mythosCamZone(lx,lz){/* union of the two halls */if(lz>MY.gz0+0.2){return[cl(lx,MY.x0+0.22,MY.x1-0.22),lz]}return[cl(lx,MY.gx0+0.22,MY.gx1-0.22),cl(lz,MY.gz1+0.22,0)]}
function vaultY(x){const c=(MY.x0+MY.x1)/2,hw=(MY.x1-MY.x0)/2,u=cl((x-c)/hw,-1,1);return MY.vault+(MY.crown-MY.vault)*Math.sqrt(1-u*u)}
function mythosBuild(def,r){const L=X.L,B=X.B;const {x0,x1,d1,gx0,gx1,gz0,gz1,h1,h2}=MY;
  X.box={x0:gx0,x1:gx1,z0:gz1,z1:0,h:h1};
  /* ---------------- GRILL HALL: floor, walls ---------------- */
  L.grid(x0,-d1,x1,0,0,1.0,hx('#b8775a'),M('fl_terracotta'),{rot:true});
  /* right wall: white-painted brick */wallQ(x1,-d1,x1,0,0,h1,'brick_paint','#efece6');
  /* left wall: beige vertical finger tiles to 2.1 m, concrete-effect panels above */X.L.wall(x0,0,x0,-d1,0,2.1,hx('#dcbd8f'),M('tile_kitkat',1.0),{});seg(x0,0,x0,-d1,'b');wallQ(x0,0,x0,-d1,2.1,h1,'plaster','#bdb8ad',null,false);
  for(let z=-1.2;z>-d1;z-=1.2)L.box(x0+0.004,2.1,z,0.008,h1-2.1,0.012,hx('#8f8a80'),FLAT,{f:'x'});
  /* front wall (street): screen + double door + fanlight */
  const scr=[-4.3,-0.95],dW=1.9;wallQ(x1,0,x0,0,0,2.95,'plaster','#c27a55',[[x1-scr[1],x1-scr[0],0.05,2.9],[x1-0.95,x1+0.95,-0.01,2.9]]);
  /* the fanlight: glass up to the vault, black radial bars */streetView(x0,x1,-0.2,MY.crown,1.6,def.seed);
  const fanN=14;for(let i=0;i<fanN;i++){const xa=x0+(x1-x0)*i/fanN,xb=x0+(x1-x0)*(i+1)/fanN;X.G.face([xb,2.95,0.02],[xa,2.95,0.02],[xa,vaultY(xa),0.02],[xb,vaultY(xb),0.02],hx('#d6e6ea'),FLAT)}
  for(let i=1;i<7;i++){const a=PI*i/7,cx=(x0+x1)/2,ex=cx-Math.cos(a)*3.25;L.tube([cx,2.95,-0.02],[ex,vaultY(ex)-0.02,-0.02],0.02,4,hx('#141416'),SEMI)}L.box((x0+x1)/2,2.92,-0.02,x1-x0,0.06,0.06,hx('#141416'),SEMI);
  /* arch ring (orange terracotta brick tile) seen from inside as the vault's front edge */for(let i=0;i<24;i++){const xa=x0+(x1-x0)*i/24,xb=x0+(x1-x0)*(i+1)/24;L.quad([xa,vaultY(xa),-0.0],[xb,vaultY(xb),-0.0],[xb,vaultY(xb),-0.25],[xa,vaultY(xa),-0.25],[0,0],[0.3,0],[0.3,0.1],[0,0.1],hx('#a8521f'),M('brick'))}
  frontage({door:{x:0,w:dW,h:2.25},win:[[scr[0],scr[1],0.05,2.9]],frame:'#141416',bars:{w:1.15,y:[1.05,2.25]},seed:def.seed,mat:'#1b1b1b'});
  L.box(0,2.25,-0.02,dW,0.05,0.06,hx('#141416'),SEMI);X.G.face([0.95,2.3,0.02],[-0.95,2.3,0.02],[-0.95,2.9,0.02],[0.95,2.9,0.02],hx('#d6e6ea'),FLAT);
  /* ---------------- ceiling: ochre tiled barrel vault (first 4 m), timber boards beyond ---------------- */
  const vz=-4.0,NV=20;for(let i=0;i<NV;i++){const xa=x0+(x1-x0)*i/NV,xb=x0+(x1-x0)*(i+1)/NV,ya=vaultY(xa),yb=vaultY(xb);L.quad([xa,ya,0],[xa,ya,vz],[xb,yb,vz],[xb,yb,0],[xa/0.6,0],[xa/0.6,vz/0.6],[xb/0.6,vz/0.6],[xb/0.6,0],hx('#d29c2c'),M('tile_subway'))}
  /* tympanum closing the vault at z=-4 down to the timber ceiling */for(let i=0;i<NV;i++){const xa=x0+(x1-x0)*i/NV,xb=x0+(x1-x0)*(i+1)/NV;L.quad([xb,h1,vz],[xa,h1,vz],[xa,vaultY(xa),vz],[xb,vaultY(xb),vz],[0,0],[1,0],[1,0.2],[0,0.2],hx('#bdb8ad'),M('plaster'))}
  /* side walls under the vault spring */wallQ(x1,-4,x1,0,h1,MY.vault,'brick_paint','#efece6',null,false);
  L.grid(x0,-d1,x1,vz,h1,1.2,hx('#c08e5e'),M('fl_plank'),{up:-1,rot:true});
  /* exposed black ducts + lighting track with wood-bodied spots along the aisle */L.tube([x0+0.9,h1-0.35,-4.2],[x0+0.9,h1-0.35,-d1+0.2],0.16,10,hx('#1a1a1c'),SEMI);L.tube([x1-0.6,h1-0.25,-4.2],[x1-0.6,h1-0.25,-d1+0.2],0.09,8,hx('#1a1a1c'),SEMI);
  L.box(0.45,h1-0.05,-6.5,0.04,0.04,13.0,hx('#151515'),SEMI,{f:'xXb'});for(let k=0;k<12;k++){const z=-0.6-k*0.62*1.6;if(z<-d1+0.4)break;L.cyl(0.45,h1-0.32,z,0.045,0.045,0.24,10,hx('#a8784a'),M('oak'));L.cyl(0.45,h1-0.322,z,0.035,0.035,0.004,10,hx('#fff2d0'),EMIT,{gl:1,capB:true});pool(0.4,1.2,z,'#ffcf8a',0.32,2.2)}
  /* ---------------- the L-shaped counter: beige finger tiles, cream stone top ---------------- */
  const cf=['tile_kitkat','#dcbd8f'],ct=['marble','#f1ebde'];
  counter((x0-1.6)/2,-1.1,-1.6-x0,0,{h:1.10,d:0.7,front:cf,top:ct});/* front leg (customer side faces the street glass) */
  L.cyl(-1.6,0.1,-1.45,0.36,0.36,0.96,12,hx('#dcbd8f'),M('tile_kitkat'),{a0:-PI/2,a1:0});L.cyl(-1.6,1.06,-1.45,0.4,0.4,0.04,12,hx('#f1ebde'),M('marble'),{a0:-PI/2,a1:0,cap:true});
  counter(-1.25,-2.45,2.5,PI/2,{h:1.10,d:0.7,front:cf,top:ct});/* till zone */
  /* raised pass: half-round oak slats facing the aisle */const pz0=-3.7,pz1=-8.7;counter(-1.25,(pz0+pz1)/2,pz0-pz1,PI/2,{h:1.35,d:0.7,front:['slats','#c49565'],top:ct});
  counter(-1.25,-10.1,2.8,PI/2,{h:1.10,d:0.7,front:cf,top:ct});
  /* on the counter: take-away boxes, glasses, water bottles, plates, cutlery bucket, paper bags */
  for(let k=0;k<7;k++)L.box(-4.25,1.1+k*0.07,-1.1,0.24,0.065,0.24,hx('#b98a5a'),M('plywood'),{fit:[1,1]});for(let k=0;k<5;k++)L.box(-3.85,1.1+k*0.07,-1.1,0.2,0.065,0.2,hx('#c49a66'),M('plywood'),{fit:[1,1]});
  for(let k=0;k<7;k++)L.cyl(-3.3+k*0.075,1.1,-1.0,0.03,0.03,0.21,8,hx('#e8f2f4'),GLOSS,{cap:true}),L.cyl(-3.3+k*0.075,1.31,-1.0,0.014,0.014,0.03,6,hx('#1f5fbf'),SEMI,{cap:true});
  for(let k=0;k<6;k++)L.cyl(-2.55,1.1+k*0.018,-1.15,0.13,0.13,0.016,16,hx('#fbfaf6'),GLOSS,{cap:true,tc:k===5?hx('#c9962e'):hx('#fbfaf6')});
  L.cyl(-2.15,1.1,-1.05,0.07,0.06,0.16,10,hx('#c8ccd0'),M('steel'));for(let k=0;k<6;k++)L.tube([-2.15,1.2,-1.05],[-2.15+Math.cos(k)*0.04,1.33,-1.05+Math.sin(k)*0.04],0.004,3,hx('#d0d2d4'),M('steel'));
  for(let k=0;k<4;k++){L.push(-1.25,1.1,-1.75-k*0.02,PI/2);L.box(0,k*0.004,0,0.24,0.004,0.32,hx('#c49a66'),M('plywood'));L.pop()}
  till(-1.3,1.10,-3.0,PI/2,{scr:1});L.cyl(-1.15,1.10,-2.55,0.06,0.06,0.13,12,hx('#e8f2f4'),GLOSS);/* tip jar */
  textPanel(-0.885,0.85,-3.0,0.5,0.18,'ORDER HERE',{bg:'#141416',fg:'#f5b81c',ppm:300,ry:PI/2});
  /* plated dishes waiting on the pass */for(let k=0;k<4;k++){const z=-4.4-k*1.1;L.cyl(-1.25,1.35,z,0.15,0.15,0.016,16,hx('#fbfaf6'),GLOSS,{cap:true,tc:hx('#fbfaf6')});L.cyl(-1.25,1.366,z,0.1,0.08,0.03,12,WH,SUB('pastry',4,k%2?9:11),{cap:true,tt:SUB('pastry',4,k%2?9:14),capFit:true});
    if(k%2===0){L.push(-1.25,1.39,z+0.02,0,0,PI/2);L.ball(0,0,0,0.03,0.08,0.035,8,5,WH,SUB('pastry',4,14),{fit:true});L.pop()}}
  for(let k=0;k<5;k++)L.cyl(-1.25,1.1+k*0.018,-9.4,0.13,0.13,0.016,16,hx('#fbfaf6'),GLOSS,{cap:true,tc:k===4?hx('#c9962e'):hx('#fbfaf6')});for(const z of[-10.0,-10.5]){L.box(-1.25,1.1,z,0.26,0.1,0.18,hx('#1b1b1b'),M('cane'));L.box(-1.25,1.2,z,0.22,0.02,0.14,hx('#ffffff'),M('fabric'))}
  /* ---------------- kitchen line along the left wall ---------------- */
  const kx=x0+0.42;/* gyro spits */for(const [i,z] of[[0,-2.0],[1,-2.75]]){L.push(kx,0,z,PI/2);L.box(0,0,0,0.62,0.85,0.7,hx('#c8ccd0'),M('steel'));L.box(0,0.85,-0.3,0.62,1.1,0.08,hx('#b9bcc0'),M('steel'));for(const s of[-1,1])L.box(s*0.3,0.85,-0.05,0.03,1.1,0.55,hx('#b9bcc0'),M('steel'));L.box(0,1.95,-0.05,0.64,0.06,0.62,hx('#b9bcc0'),M('steel'));
      L.box(0,1.05,-0.24,0.42,0.72,0.02,hx('#ff7a2a'),EMIT,{gl:1});for(let k=0;k<6;k++)L.box(0,1.08+k*0.12,-0.225,0.4,0.012,0.01,hx('#5a2410'),FLAT,{f:'z'});L.box(0,0.86,0.06,0.3,0.04,0.3,hx('#8a8d90'),M('steel'));L.pop();
    pool(kx+0.4,1.4,z,'#ff8a3a',0.85,2.4);const ib=new IB(),pc=i?hx('#e0aa66'):hx('#c07a40');ib.cyl(0,0,0,0.006,0.006,0.95,6,hx('#d0d2d4'),M('steel'));ib.lathe(0,0.08,0,[[0.07,0],[0.11,0.05],[0.14,0.25],[0.165,0.5],[0.175,0.68],[0.15,0.74],[0.04,0.78]],18,pc,M('meat'),{fit:true});
    const a={ib,pos:[kx+0.08,0.9,z],fn:(dt)=>{if(a.mesh)a.mesh.rotation.y+=dt*0.22}};X.anim.push(a)}
  /* char-grill with skewers, griddle, fryer, toppings well, sink, under-counter fridges */
  const eq=(z0,z1,top)=>{L.box(kx,0,(z0+z1)/2,0.78,0.88,z0-z1,hx('#c8ccd0'),M('steel'));L.box(kx,0.88,(z0+z1)/2,0.8,0.02,z0-z1+0.02,hx('#d0d2d4'),M('steel'));if(top)top((z0+z1)/2,z0-z1)};
  eq(-3.25,-4.45,(z,w)=>{L.box(kx,0.9,z,0.62,0.04,w-0.12,hx('#1b1b1b'),M('grille'));L.box(kx,0.905,z,0.58,0.02,w-0.16,hx('#ff5a1a'),EMIT,{gl:0.55});for(let k=0;k<8;k++){const sz=z-w/2+0.12+k*(w-0.24)/7;L.tube([kx-0.32,0.97,sz],[kx+0.3,0.97,sz],0.005,4,hx('#c0c0c0'),M('steel'));for(let q=0;q<5;q++)L.box(kx-0.18+q*0.08,0.95,sz,0.06,0.04,0.04,hx('#8a4a22'),M('meat'))}pool(kx+0.3,1.2,z,'#ff7a30',0.6,2.0)});
  eq(-4.55,-5.35,(z,w)=>{L.box(kx,0.9,z,0.66,0.02,w-0.08,hx('#3a3a3a'),GLOSS);for(let k=0;k<3;k++)L.cyl(kx-0.05,0.92,z-0.2+k*0.2,0.11,0.11,0.01,14,WH,SUB('pastry',4,14),{cap:true,capFit:true})});
  eq(-5.45,-6.15,(z,w)=>{for(const s of[-1,1]){L.box(kx,0.86,z+s*0.16,0.5,0.03,0.26,hx('#c79a3a'),GLOSS);L.box(kx+0.05,0.95,z+s*0.16,0.3,0.12,0.22,hx('#9a9da0'),M('grille'))}});
  eq(-6.25,-7.45,(z,w)=>{const cs=[13,12,9,11,14,15];for(let k=0;k<6;k++){L.box(kx+0.08,0.86,z-w/2+0.12+k*(w-0.2)/6+0.08,0.28,0.04,0.16,hx('#d8dadc'),M('steel'));L.box(kx+0.08,0.88,z-w/2+0.12+k*(w-0.2)/6+0.08,0.24,0.02,0.13,WH,SUB('pastry',4,cs[k]),{f:'t',fit:[1,1]})}
    L.box(kx+0.25,0.9,z,0.3,0.015,0.9,hx('#e8e2d0'),M('plywood'));L.cyl(kx-0.25,0.95,z,0.06,0.06,0.4,12,hx('#f4efe0'),FLAT)});
  eq(-7.55,-8.25,(z,w)=>{L.box(kx,0.82,z,0.5,0.08,0.45,hx('#a8acb0'),GLOSS);L.tube([kx-0.25,0.9,z],[kx-0.25,1.25,z],0.012,6,hx('#d0d2d4'),M('steel'));L.tube([kx-0.25,1.25,z],[kx-0.05,1.25,z],0.012,6,hx('#d0d2d4'),M('steel'))});
  eq(-8.35,-11.6,(z,w)=>{for(let k=0;k<3;k++)L.box(kx+0.39,0.25,z-w/2+0.55+k*1.05,0.02,0.4,0.9,hx('#b0b4b8'),M('steel'));for(let k=0;k<6;k++)L.cyl(kx-0.05+(k%2)*0.2,0.9,z-1.2+k*0.45,0.12,0.12,0.25,12,hx('#c8ccd0'),M('steel'))});
  seg(x0+0.82,-1.5,x0+0.82,-11.6,'p');
  /* extraction hood with a warm LED line under its front edge */L.box(x0+0.48,2.0,-6.6,0.96,0.5,9.6,hx('#c8ccd0'),M('steel'),{f:'xzZb'});L.box(x0+0.9,1.99,-6.6,0.05,0.012,9.5,hx('#fff0c8'),EMIT,{gl:1,f:'b'});for(let z=-2.2;z>-11;z-=1.4)pool(x0+0.7,1.0,z,'#ffe2a8',0.35,1.8);
  /* wall above the hood: corten emblems + three menu boards */
  emblem(x0+0.02,3.3,-4.4,0.8,true);emblem(x0+0.02,3.25,-10.0,0.45,false);
  const B1=MYTHOS_MENU;menuSheet(x0+0.03,3.25,-6.2,0.75,1.6,PI/2,'ΤΥΛΙΧΤΑ · WRAPS',[['pita 4,50 € · τορτίγια 7,00 €',null],['ΓΥΡΟΣ ΧΟΙΡΙΝΟΣ',4.5],['ΓΥΡΟΣ ΚΟΤΟΠΟΥΛΟ',4.5],['ΚΑΛΑΜΑΚΙ ΧΟΙΡΙΝΟ',4.5],['ΚΑΛΑΜΑΚΙ ΚΟΤΟΠΟΥΛΟ',4.5],['ΚΕΜΠΑΠ',4.5],['ΚΕΜΠΑΠ ΚΟΤΟΠΟΥΛΟ',4.5],['ΜΟΣΧΑΡΙ ΓΑΛΑΚΤΟΣ',4.9],['ΜΠΙΦΤΕΚΙ ΜΟΣΧΑΡΙ',4.5],['ΜΠΙΦΤΕΚΙ ΚΟΤΟΠΟΥΛΟ',4.5],['ΛΟΥΚΑΝΙΚΟ',4.5],['ΚΟΤΟΠΟΥΛΟ ΠΑΝΕ',4.5],['ΤΟ ΑΠΙΤΟ ΤΥΛΙΧΤΟ',7.9],['VEGGIE · ΦΑΛΑΦΕΛ · ΧΑΛΟΥΜΙ',4.2]],{ac:'#9a5a1e'});
  menuSheet(x0+0.03,3.25,-7.05,0.75,1.6,PI/2,'ΚΑΛΑΜΑΚΙΑ · ΜΕΡΙΔΕΣ',[['ΧΟΙΡΙΝΟ',3.2],['ΚΟΤΟΠΟΥΛΟ ΜΠΟΥΤΙ',3.2],['ΜΠΡΙΖΟΛΟΚΑΛΑΜΟ',3.9],['ΜΟΣΧΑΡΙ ΓΑΛΑΚΤΟΣ',3.9],['ΜΕΡΙΔΕΣ',null],['ΓΥΡΟΣ ΧΟΙΡΙΝΟΣ / ΚΟΤ.',11.9],['ΚΑΛΑΜΑΚΙ (3 τεμ.)',11.9],['ΚΕΜΠΑΠ ΓΙΑΟΥΡΤΛΟΥ',11.9],['ΜΠΩΛ MYTHOS PLUS',6.9],['ΠΙΤΑ ΔΙΑΒΟΛΟΥ',11.9],['ΠΛΑΤΩ ΚΡΕΑΤΩΝ',28.9],['TOMAHAWK 800γρ.',19.9],['RIB EYE',24.9]],{ac:'#9a5a1e'});
  menuSheet(x0+0.03,3.25,-7.9,0.75,1.6,PI/2,'ΟΡΕΚΤΙΚΑ · ΣΑΛΑΤΕΣ',[['ΤΖΑΤΖΙΚΙ',4.9],['ΤΥΡΟΚΑΥΤΕΡΗ',4.9],['ΦΕΤΑ ΛΑΔΟΡΙΓΑΝΗ',4.9],['ΦΡΕΣΚΕΣ ΠΑΤΑΤΕΣ',4.9],['ΨΗΤΟ ΤΑΛΑΓΑΝΙ',6.9],['ΕΛΛΗΝΙΚΗ',9.9],['ΚΑΙΣΑΡΑ',11.9],['ΝΤΑΚΟΣ',9.9],['ΑΝΑΨΥΚΤΙΚΑ 330ml',2.0],['ΑΥΡΑ ΝΕΡΟ 500ml',0.5],['ΑΛΦΑ · HEINEKEN',2.5]],{ac:'#9a5a1e'});
  /* fairy lights next to the big emblem */for(let k=0;k<26;k++){const z=-3.4-k*0.08,y=4.0-Math.sin(k*0.5)*0.15-k*0.01;L.ball(x0+0.05,y,z,0.012,0.012,0.012,4,3,hx('#ffd27a'),EMIT,{gl:1})}
  /* ---------------- end of the aisle: timber portal + yellow neon "garden in" ---------------- */
  const pr=[-0.7,1.5];wallQ(x0,-d1,x1,-d1,0,h1,'panels','#c58a50',[[pr[0]-x0,pr[1]-x0,0,2.3]]);L.box((pr[0]+pr[1])/2,2.3,-d1,pr[1]-pr[0]+0.2,0.18,0.25,hx('#a87548'),M('oak'));for(const x of pr)L.box(x+(x<0?-0.08:0.08),0,-d1,0.16,2.3,0.25,hx('#a87548'),M('oak'));
  L.box(0.4,2.55,-d1+0.03,1.9,0.7,0.03,hx('#151515'),M('grille'),{f:'z'});
  const neon=boardTile(760,280,(g,W,H)=>{g.clearRect(0,0,W,H);g.font=`italic 400 ${H*0.62}px ${F_SCRIPT}`;g.textAlign='center';g.textBaseline='middle';g.shadowColor='#ffb21a';g.shadowBlur=H*0.12;g.lineWidth=H*0.05;g.strokeStyle='#ffe65a';g.strokeText('garden in',W/2,H*0.52);g.shadowBlur=H*0.05;g.fillStyle='#fff6b0';g.fillText('garden in',W/2,H*0.52)});
  B.panel(0.4,2.92,-d1+0.06,1.6,0.6,WH,neon,{gl:0});pool(0.4,2.6,-d1+0.8,'#ffd84a',0.75,2.8);
  for(let k=0;k<34;k++){const a=k/34*TAU2,ex=0.4+Math.cos(a)*1.05,ey=2.92+Math.sin(a)*0.45;L.ball(ex,ey,-d1+0.07,0.06+r()*0.04,0.04,0.04,5,3,hx(k%5===0?'#7a1f2b':'#3f6b2a'),M('fabric'))}
  L.ball(-0.1,2.12,-d1+0.06,0.05,0.04,0.05,8,4,hx('#f4f4f4'),GLOSS,{p0:PI/2});L.ball(0.9,2.12,-d1+0.06,0.05,0.04,0.05,8,4,hx('#f4f4f4'),GLOSS,{p0:PI/2});
  /* ---------------- GARDEN IN: the courtyard hall ---------------- */
  L.grid(gx0,gz1,gx1,gz0,0,1.0,hx('#a8764a'),M('fl_plank'));
  /* connection floor under the portal */L.box((pr[0]+pr[1])/2,0,(gz0-d1)/2,pr[1]-pr[0],0.004,gz0+d1,hx('#a8764a'),M('fl_plank'),{f:'t'});seg(pr[0],-d1,pr[0],gz0,'b');seg(pr[1],-d1,pr[1],gz0,'b');
  /* south wall of the hall (behind the grill hall), with the portal */wallQ(gx0,gz0,gx1,gz0,0,h2,'tile_subway','#efedea',[[pr[0]-gx0,pr[1]-gx0,0,2.3]],'b');
  L.wall(gx0,gz0+0.01,gx1,gz0+0.01,0,1.45,hx('#ad7a70'),M('tile_kitkat'),{holes:[[pr[0]-gx0,pr[1]-gx0,0,2.3]]});
  /* pine-clad section with the corten ring "M" */L.box(3.1,0,gz0-0.04,2.5,h2,0.04,hx('#c08a52'),M('panels'),{f:'Z'});emblemS(3.1,2.2,gz0-0.07,0.6);
  /* west wall: dusty-pink tile dado + white brick-format tile above */wallQ(gx0,gz0,gx0,gz1,0,1.45,'tile_kitkat','#ad7a70');wallQ(gx0,gz0,gx0,gz1,1.45,h2,'tile_subway','#e0ddd8',null,false);
  /* north + east: full-height black-framed glazing, transom at 2.4 */
  const glazeWall=(ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,Ln=Math.hypot(dx,dz),ux=dx/Ln,uz=dz/Ln,nx=-uz,nz=ux,ry=Math.atan2(nx,nz);seg(ax,az,bx,bz,'b');
    /* daylight beyond */const sw=boardTile(Math.round(Ln*60),Math.round(h2*60),(g,W,H)=>{const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#eef3f6');gr.addColorStop(0.6,'#e9eee4');gr.addColorStop(1,'#9aa58a');g.fillStyle=gr;g.fillRect(0,0,W,H);const rr=RNG(Math.round(Ln*10));
      for(let k=0;k<9;k++){const tx=rr()*W,ty=H*rr.r(0.2,0.5);const t2=g.createRadialGradient(tx,ty,2,tx,ty,H*0.35);t2.addColorStop(0,'rgba(70,100,55,.8)');t2.addColorStop(1,'rgba(70,100,55,0)');g.fillStyle=t2;g.fillRect(tx-H*0.4,ty-H*0.4,H*0.8,H*0.8)}
      if(Math.abs(nz)>0.5){g.fillStyle='#f4f1ea';g.fillRect(W*0.1,H*0.35,W*0.26,H*0.18);g.fillStyle='#7a1f2b';g.font=`italic 700 ${H*0.09}px ${F_SCRIPT}`;g.textAlign='center';g.fillText('Βάρσος 1892',W*0.23,H*0.47)}});
    B.face([bx-nx*1.4,0,bz-nz*1.4],[ax-nx*1.4,0,az-nz*1.4],[ax-nx*1.4,h2,az-nz*1.4],[bx-nx*1.4,h2,bz-nz*1.4],WH,sw,{gl:1});
    X.G.face([ax,0,az],[bx,0,bz],[bx,h2,bz],[ax,h2,az],hx('#d8e8ec'),FLAT,{ds:true});
    const n=Math.round(Ln/1.1);for(let i=0;i<=n;i++){const t=i/n*Ln;L.box(ax+ux*t,0,az+uz*t,0.05,h2,0.07,hx('#141416'),SEMI,{ry})}for(const y of[0,2.4,h2-0.06])L.box((ax+bx)/2,y,(az+bz)/2,Ln,0.06,0.07,hx('#141416'),SEMI,{ry:ry+PI/2})};
  glazeWall(gx1,gz1,gx0,gz1);glazeWall(gx1,gz0,gx1,gz1);
  /* timber structure: posts on a 3.4 m grid, beams, knee braces, cream fabric roof in soft waves, disc lamps under the beams */
  const pc=hx('#b07a4a'),pt=M('oak');const bxs=[gx0+0.1,gx0+3.25,gx0+6.4,gx1-0.1],bzs=[gz0-0.1,gz0-3.5,gz0-6.9,gz0-10.3,gz1+0.1];
  for(const z of bzs){L.box((gx0+gx1)/2,h2-0.25,z,gx1-gx0,0.25,0.2,pc,pt);for(let x=gx0+0.6;x<gx1-0.3;x+=1.1){L.cyl(x,h2-0.27,z,0.15,0.15,0.02,14,hx('#f4f2ee'),SEMI,{capB:true});L.ball(x,h2-0.32,z,0.04,0.045,0.04,8,5,hx('#ffe2b0'),EMIT,{gl:1})}}
  for(const x of bxs)L.box(x,h2-0.25,(gz0+gz1)/2,0.2,0.25,gz0-gz1,pc,pt);
  for(const x of[gx0+3.25,gx0+6.4])for(const z of[gz0-3.5,gz0-6.9,gz0-10.3]){L.box(x,0,z,0.2,h2-0.25,0.2,pc,pt);colBox(x,z,0.24,0.24,0);for(const s of[-1,1])L.tube([x,h2-0.9,z],[x,h2-0.3,z+s*0.6],0.05,4,pc,pt)}
  for(let i=0;i<bzs.length-1;i++){const za=bzs[i],zb=bzs[i+1],n=4;for(let k=0;k<n;k++){const z0=za+(zb-za)*k/n,z1=za+(zb-za)*(k+1)/n,s0=Math.sin(k/n*PI)*0.12,s1=Math.sin((k+1)/n*PI)*0.12;
      L.quad([gx0,h2-0.25-s1,z1],[gx1,h2-0.25-s1,z1],[gx1,h2-0.25-s0,z0],[gx0,h2-0.25-s0,z0],[0,z1/0.5],[(gx1-gx0)/0.5,z1/0.5],[(gx1-gx0)/0.5,z0/0.5],[0,z0/0.5],hx('#e6d9c2'),M('fabric'))}}
  L.grid(gx0,gz1,gx1,gz0,h2,2,hx('#2a2420'),FLAT,{up:-1});
  for(let z=gz0-1.7;z>gz1;z-=3.4)pool(0,2.6,z,'#ffd7a0',0.55,4.5);for(let z=gz0-1.7;z>gz1;z-=3.4)pool(-3,2.6,z,'#ffd7a0',0.45,3.8);
  /* wall lights + sepia photographs of old Kifisia on the west wall */
  for(let z=gz0-1.6;z>gz1+0.8;z-=3.0){L.cyl(gx0+0.03,2.6,z,0.125,0.125,0.04,14,hx('#f3ead8'),EMIT,{gl:0.8});pool(gx0+0.4,2.4,z,'#ffd9a8',0.3,1.6)}
  const photos=[['amaxa',gz0-3.2],['villa',gz0-6.6],['platanos',gz0-10.0]];for(const [k,z] of photos)picture(gx0+0.025,2.2,z,1.3,0.65,PI/2,(g,W,H)=>sepia(g,W,H,k),'#8a6a44');
  /* ---------------- furniture ---------------- */
  banquette(gx0+0.3,(gz0+gz1)/2,Math.abs(gz1-gz0)-0.6,PI/2,{base:'#ad7a70',seat:'#5c6044',back:'#5c6044',cushions:['#b48c86','#cfc6b0','#5c6044']});
  banquette((gx0+1.6)/2-0.2,gz1+0.3,3.0,0,{base:'#ad7a70',seat:'#5c6044',back:'#5c6044',cushions:['#cfc6b0','#b48c86','#5c6044']});
  /* bamboo in troughs along the glazing */for(let x=gx0+3.0;x<gx1-0.6;x+=1.3)bamboo(x,gz1+0.35);for(let z=gz0-1.4;z>gz1+1;z-=1.3)bamboo(gx1-0.35,z);
  const tbl=(x,z,big,wood)=>table(x,z,{w:big?1.2:0.7,d:0.7,top:wood?M('walnut'):M('marble'),topHex:'#ffffff',base:'#18181a',lay:2,plateRim:'#c9962e'});
  /* two-tops along the banquette, four-tops in the middle */const seats=[];
  for(let z=gz0-1.0;z>gz1+1.8;z-=1.6){tbl(gx0+1.25,z,false,false);chair(gx0+1.95,z,-PI/2,{style:r()<0.5?'arm':'wish',frame:'#4a2a17',seat:'#5c6044'})}
  for(const z of[gz0-2.0,gz0-5.2,gz0-8.4]){for(const x of[-1.4,1.6]){tbl(x,z,true,r()<0.3);for(const s of[-1,1]){chair(x-0.3,z+s*0.62,s>0?PI:0,{style:'wish',frame:'#c49a66',seat:'#c49a66',wood:'oak'});chair(x+0.3,z+s*0.62,s>0?PI:0,{style:'arm',frame:'#4a2a17',seat:'#5c6044'})}}}
  /* ---------------- lights (real point lights: vault, aisle, garden) ---------------- */
  plight(-1.4,3.6,-1.6,'#ffcf8a',1.1,9);plight(0.3,3.2,-8.0,'#ffd090',0.8,9);plight(0,3.0,gz0-6.5,'#ffd7a0',1.0,12);
  pool(-1.4,3.9,-2.0,'#ffc070',0.8,4.5);pool(0,1.6,-6,'#ffd9a8',0.25,6);
  /* ---------------- people ---------------- */
  person({av:'m07',tint:['#1b1b1d','#2a2420'],scale:1.0},x0+1.15,-2.35,-PI/2,'idle',null);/* carver at the spits */
  person({av:'m11',tint:['#1b1b1d','#2a2420']},x0+1.15,-4.0,-PI/2,'idle',null);/* grill cook */
  person({av:'f08',tint:['#1b1b1d','#2a2420']},-1.95,-3.0,PI/2,'idle',null);X.ppl[X.ppl.length-1].look=true;/* cashier at the till */
  X.ppl.push({spec:customer(r),x:gx0+1.95,z:gz0-2.6,yaw:-PI/2,act:'sit_table',opt:{seatH:0.45}});X.ppl.push({spec:customer(r),x:-1.7,z:gz0-5.2-0.62,yaw:0,act:'sit_table',opt:{seatH:0.45}});X.ppl.push({spec:customer(r),x:1.3,z:gz0-8.4+0.62,yaw:PI,act:'sit_table',opt:{seatH:0.45}})}
/* corten ring emblem with a three-pronged fork and a blocky "M" (big) or a plain ring + M (small); on a wall facing +x */
function emblem(x,y,z,R,big){const L=X.L,c=hx('#a86a34'),t=M('plaster');const n=28,a0=0.25,a1=TAU2-0.55;for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/n,b=a0+(a1-a0)*(i+1)/n;L.tube([x+0.06,y+Math.sin(a)*R,z+Math.cos(a)*R],[x+0.06,y+Math.sin(b)*R,z+Math.cos(b)*R],0.028,5,c,t)}
  if(big){const fa=a0,fx=z+Math.cos(fa)*R,fy=y+Math.sin(fa)*R;for(let k=-1;k<=1;k++)L.tube([x+0.06,fy,fx],[x+0.06,fy-0.16+Math.abs(k)*0.02,fx+0.22+k*0.03],0.012,4,c,t)}
  const s=R*0.62;L.push(x+0.05,y,z,PI/2);for(const [bx,bw] of[[-s*0.5,s*0.22],[s*0.5,s*0.22]])L.box(bx,-s*0.55,0,bw,s*1.1,0.04,c,t);L.push(-s*0.25,s*0.1,0,0,0,-0.55);L.box(0,-s*0.35,0,s*0.2,s*0.75,0.04,c,t);L.pop();L.push(s*0.25,s*0.1,0,0,0,0.55);L.box(0,-s*0.35,0,s*0.2,s*0.75,0.04,c,t);L.pop();L.pop();
  pool(x+0.6,y,z,'#ffcf8a',0.25,1.6)}
function emblemS(x,y,z,R){const L=X.L,c=hx('#a86a34'),t=M('plaster');const n=24;for(let i=0;i<n;i++){const a=i/n*TAU2,b=(i+1)/n*TAU2;L.tube([x+Math.cos(a)*R,y+Math.sin(a)*R,z],[x+Math.cos(b)*R,y+Math.sin(b)*R,z],0.025,5,c,t)}
  const s=R*0.6;L.push(x,y,z-0.01,PI);for(const bx of[-s*0.5,s*0.5])L.box(bx,-s*0.55,0,s*0.2,s*1.1,0.04,c,t);L.push(-s*0.25,s*0.1,0,0,0,-0.55);L.box(0,-s*0.35,0,s*0.18,s*0.75,0.04,c,t);L.pop();L.push(s*0.25,s*0.1,0,0,0,0.55);L.box(0,-s*0.35,0,s*0.18,s*0.75,0.04,c,t);L.pop();L.pop()}
function bamboo(x,z){const L=X.L,r=RNG(Math.round(x*50+z*9));L.box(x,0,z,0.4,0.45,1.1,hx('#8f8f8c'),M('fl_concrete'),{f:'xXzZt'});colBox(x,z,0.42,1.12,0);for(let k=0;k<9;k++){const bx=x+r.r(-0.12,0.12),bz=z+r.r(-0.45,0.45),h=r.r(1.4,1.9);L.cyl(bx,0.45,bz,0.012,0.01,h-0.4,5,hx('#7a8a3a'),SEMI);for(let q=0;q<4;q++)L.ball(bx+r.r(-0.15,0.15),0.45+h*r.r(0.45,0.95),bz+r.r(-0.15,0.15),r.r(0.1,0.16),0.06,r.r(0.1,0.16),6,3,hx(r.p(['#4f7a2e','#5f8a36','#3f6a26'])),M('fabric'))}}
/* sepia photographs (painted): the Kifisia carriage, a neoclassical villa, Platanos square */
function sepia(g,W,H,k){const r=RNG(k.length*31);const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#e8dcc0');gr.addColorStop(1,'#a89272');g.fillStyle=gr;g.fillRect(0,0,W,H);g.fillStyle='rgba(60,45,30,.75)';g.strokeStyle='rgba(60,45,30,.75)';
  if(k==='amaxa'){g.fillRect(W*0.45,H*0.45,W*0.22,H*0.2);g.lineWidth=3;for(const wx of[0.49,0.63]){g.beginPath();g.arc(W*wx,H*0.7,H*0.08,0,TAU2);g.stroke()}g.fillRect(W*0.2,H*0.5,W*0.2,H*0.1);for(const lx of[0.22,0.27,0.34,0.38])g.fillRect(W*lx,H*0.6,3,H*0.18);g.fillRect(W*0.36,H*0.42,W*0.05,H*0.1);
    for(let i=0;i<6;i++){const tx=W*(0.05+i*0.17),gr2=g.createRadialGradient(tx,H*0.25,2,tx,H*0.25,H*0.3);gr2.addColorStop(0,'rgba(70,55,35,.55)');gr2.addColorStop(1,'rgba(70,55,35,0)');g.fillStyle=gr2;g.fillRect(tx-H*0.3,0,H*0.6,H*0.6)}}
  else if(k==='villa'){g.fillRect(W*0.2,H*0.3,W*0.6,H*0.5);g.fillStyle='#e8dcc0';for(let i=0;i<6;i++)g.fillRect(W*(0.24+i*0.09),H*0.45,W*0.03,H*0.35);g.fillStyle='rgba(60,45,30,.85)';g.beginPath();g.moveTo(W*0.18,H*0.3);g.lineTo(W*0.5,H*0.12);g.lineTo(W*0.82,H*0.3);g.fill();g.fillRect(W*0.12,H*0.75,W*0.06,H*0.07);g.fillRect(W*0.82,H*0.75,W*0.06,H*0.07)}
  else{g.fillStyle='rgba(60,45,30,.8)';g.fillRect(W*0.47,H*0.3,W*0.06,H*0.55);const t=g.createRadialGradient(W*0.5,H*0.22,4,W*0.5,H*0.22,W*0.38);t.addColorStop(0,'rgba(55,42,28,.85)');t.addColorStop(1,'rgba(55,42,28,0)');g.fillStyle=t;g.fillRect(0,0,W,H*0.7);
    g.fillStyle='rgba(50,38,25,.8)';for(let i=0;i<14;i++){const px=r()*W,ph=H*r.r(0.14,0.2);g.fillRect(px,H*0.86-ph,W*0.012,ph);g.beginPath();g.arc(px+W*0.006,H*0.86-ph-H*0.025,H*0.025,0,TAU2);g.fill()}}
  const v=g.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,W*0.7);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(40,25,10,.45)');g.fillStyle=v;g.fillRect(0,0,W,H);g.strokeStyle='#f4ecd8';g.lineWidth=W*0.03;g.strokeRect(0,0,W,H)}

/* ============================== THE FIVE SPECIAL SHOPS (MAP.special) ==============================
   Mythos Plus is hand-made (70_mythos.js). PAUL, Starbucks, KFC and AB Vasilopoulos use the category templates with their own sizes and colour schemes
   until their hand-made rooms land (see docs/INTERIORS.md, known gaps). */
const SPECIALS=[
  {key:'mythos',name:'Mythos Plus',sub:'Restaurant · Grill · Kassaveti 13',tpl:'restaurant',plan:mythosPlan,build:mythosBuild,camZone:mythosCamZone,find:s=>s.osm==='node/10098110169'||/mythos/i.test(s.name),
   menu:{title:'Mythos Plus',sub:'Kassaveti 13 · prices from mythosplus.gr/menu',items:MYTHOS_MENU},boardH:2048,expo:1.0,amb:0.5,ambI:0.8,welcome:'Mythos Plus — order at the till on your left.',orderLabel:'Order at the till'},
  {key:'paul',name:'PAUL',sub:'Boulangerie · Levidou 4',tpl:'bakery',w:9.5,d:12,find:s=>/^paul$/i.test(s.name),sty:{fl:['fl_checkbw','#ffffff'],wall:['panels_dark','#ffffff'],wa:null,cf:['wood_black','#ffffff'],ct:['marble','#ffffff'],acc:'#1b1b1d',lt:'#ffd4a0',h:3.6},bg:'#1b1b1d',fg:'#f0e6d2'},
  {key:'starbucks',name:'Starbucks',sub:'Kassaveti 19 courtyard',tpl:'cafe',w:6.4,d:13.8,amb:0.85,ambI:0.95,expo:1.1,sty:{fl:['fl_wood','#d8c4a8'],wall:['plaster','#efe9df'],wa:{h:1.1,tile:'panels_dark',hex:'#ffffff'},cf:['wood_dark','#ffffff'],ct:['wood_table','#ffffff'],acc:'#00704a',lt:'#ffd9a8',h:3.6},bg:'#00704a',fg:'#ffffff'},
  {key:'kfc',name:'KFC',sub:'Kifisias Ave 238 · Mela arcade',tpl:'fastfood',w:9,d:15,sty:{fl:['fl_large','#ffffff'],wall:['tile_white','#ffffff'],cf:['panels_dark','#ffffff'],ct:['steel','#ffffff'],acc:'#c8102e',lt:'#fff2dc',h:3.3,amb:0.74},bg:'#c8102e',fg:'#ffffff'},
  {key:'super',name:'AB Vasilopoulos',sub:'Levidou 2 / Kassaveti 8',tpl:'minimarket',w:20,d:18,find:s=>/βασιλόπουλος|vasilopoulos/i.test(s.name),sty:{acc:'#0a4ea1',h:3.6},bg:'#0a4ea1',fg:'#ffffff',orderLabel:'Pay at the checkout'},
  {key:'sephora',name:'SEPHORA',sub:'Levidou 8',tpl:'cosmetics',w:7.5,d:16,sty:{fl:['fl_large','#ffffff'],wall:['plaster2','#ffffff'],cf:['wood_black','#ffffff'],ct:['wood_black','#ffffff'],acc:'#000000',lt:'#ffffff',h:3.2,amb:0.82},bg:'#000000',fg:'#ffffff'}];

/* ============================== HAND-MADE BRAND INTERIORS (docs/research/INTERIORS.md §2–6) ==============================
   Starbucks (Kassaveti 19 courtyard pavilion), PAUL (Levidou 4), KFC (Kifisias 238, Mela arcade), AB Vasilopoulos (Levidou 2), SEPHORA (Levidou 8).
   Insides are brand-TYPICAL (no photos of these branches' interiors exist in the research); sizes, layout and palettes follow the research plans. */
const pl=(W,D,h,dx,dw,counter)=>({W,D,h,x0:-W/2,x1:W/2,door:[dx,dw],counter,side:0,bounds:{x0:-W/2,x1:W/2,z0:-D,z1:0,h}});
function winsFor(P,dx,dw,y0,y1){const w=[];if(dx-dw/2-0.3>P.x0+0.4)w.push([P.x0+0.2,dx-dw/2-0.15,y0,y1]);if(dx+dw/2+0.3<P.x1-0.4)w.push([dx+dw/2+0.15,P.x1-0.2,y0,y1]);return w}
function shell(P,o){const [dx,dw]=P.door,win=o.win||winsFor(P,dx,dw,o.wy0==null?0.3:o.wy0,o.wy1||Math.min(2.8,P.h-0.4));room({x0:P.x0,x1:P.x1,d:P.D,h:P.h,floor:o.floor,wall:o.wall,wains:o.wains,ceil:o.ceil,door:{x:dx,w:dw,h:o.dh||2.3},win,skirt:o.skirt,holesB:o.holesB});
  frontage({door:{x:dx,w:dw,h:o.dh||2.3},win,frame:o.frame||'#1c1c1e',bars:o.bars,seed:o.seed});return win}
/* ---------------- STARBUCKS ---------------- */
TPL.sbux={plan:()=>pl(6.4,13.8,3.0,-1.2,1.6,[0.75,-4.0]),build(def,r){const P=def.local,L=X.L;
  shell(P,{floor:['fl_plank','#7a5a44'],wall:['panels','#ffffff'],wains:{h:1.2,tile:'brick',hex:'#c88a70',rail:false},ceil:['oak','#e8d8c8'],frame:'#2a2018',seed:def.seed});
  L.wall(P.x0,-P.D+0.01,P.x1,-P.D+0.01,0,P.h,hx('#a86a50'),M('brick'),{});/* back wall brick */
  for(let z=-0.5;z>-P.D;z-=0.7)L.box(0,P.h-0.16,z,P.W,0.16,0.1,hx('#6a4a36'),M('wood_dark'),{f:'zZb'});/* exposed joists */
  /* bar: front counter (vertical dark slats, dark stone top), vitrine at the till, back counter with 2 espresso machines */
  const cx=1.55;counter(cx,-3.95,0.9,-PI/2,{h:1.05,d:0.75,front:['slats','#4a3426'],top:['marble','#3a3a3a']});displayCase(cx,-5.15,1.4,-PI/2,{h:1.3,d:0.75,shelves:3,base:'#3a2a1d',baseT:'wood_dark',fill:pastryFill(r)});
  counter(cx,-8.15,4.6,-PI/2,{h:1.05,d:0.75,front:['slats','#4a3426'],top:['marble','#3a3a3a']});seg(cx-0.375,-10.45,P.x1,-10.45);seg(cx,-3.5,cx,-3.0);
  counter(2.9,-7.0,7.0,-PI/2,{h:0.92,d:0.55,front:['wood_dark','#ffffff'],top:['steel','#ffffff']});
  coffeeMachine(2.9,0.92,-5.4,-PI/2,{w:0.85});coffeeMachine(2.9,0.92,-7.4,-PI/2,{w:0.85});
  for(let k=0;k<3;k++){const y=1.55+k*0.35;L.box(3.05,y,-6.6,0.25,0.025,5.6,hx('#4a3426'),M('wood_dark'));for(let z=-4.0;z>-9.2;z-=0.16)cup(3.05,y+0.025,z,{hex:k===1?'#ffffff':'#f2efe8',lid:'#ffffff'})}
  till(cx-0.02,1.05,-3.9,-PI/2,{scr:5});textPanel(cx-0.39,0.8,-3.95,0.62,0.16,'ORDER HERE',{bg:'#1e6b57',fg:'#ffffff',ppm:300,ry:-PI/2});
  textPanel(cx-0.39,1.3,-9.7,0.5,0.14,'PICK-UP',{bg:'#2b2b2b',fg:'#ffffff',ppm:300,ry:-PI/2});for(let k=0;k<3;k++)cup(cx-0.1,1.05,-9.4-k*0.12,{hex:'#ffffff',lid:'#1b1b1b'});
  /* chalk menu board above the back counter */const m=def.menu.items;menuBoard(P.x1-0.02,2.45,-6.6,2.4,0.7,-PI/2,{cols:[{title:'Espresso',rows:m.slice(0,Math.ceil(m.length/2))},{title:'Cold & Food',rows:m.slice(Math.ceil(m.length/2))}],bg:'#20201e',ac:'#f2efe6',fg:'#e8e4da',pc:'#f2efe6',fam:F_SERIF});
  textPanel(-1.6,2.45,-P.D+0.03,1.6,0.3,'STARBUCKS COFFEE',{bg:'#1e6b57',fg:'#ffffff',ppm:240,fam:F_SANS});
  for(let z=-4.0;z>-10.2;z-=1.2)pendant(cx,P.h-0.16,z,{len:0.65,style:'cone',hex:'#1b1b1b',light:'#ffc98a',i:0.5,r:2.2});
  /* stair to the first floor along the left wall (foot at z -9, rising toward the back) */for(let k=0;k<13;k++){const z=-9-k*0.33,y=0.175*(k+1);if(y>P.h)break;L.box(P.x0+0.5,y-0.04,z,0.95,0.04,0.33,hx('#5a4030'),M('wood_dark'));L.box(P.x0+0.5,0,z+0.16,0.95,y-0.04,0.02,hx('#3a2a1d'),M('wood_dark'),{f:'z'})}
  L.box(P.x0+0.98,0,-11.1,0.04,P.h,4.4,hx('#3a2a1d'),M('wood_dark'));L.tube([P.x0+1.0,1.05,-9],[P.x0+1.0,3.1,-12.9],0.025,6,hx('#1b1b1b'),SEMI);colBox(P.x0+0.5,-11.3,1.0,4.6,0);
  /* seating: 4 round tables, communal table by the front glazing, 2 leather armchairs */
  for(const [x,z] of[[-2.3,-3.6],[-0.7,-4.6],[-2.3,-6.0],[-0.7,-7.2]]){table(x,z,{w:0.6,round:true,top:M('wood_table'),base:'#1b1b1b',lay:1});chair(x,z+0.55,PI,{style:'wood',frame:'#3a2a1d',seat:'#3a2a1d',wood:'wood_dark'});chair(x,z-0.55,0,{style:'wood',frame:'#3a2a1d',seat:'#3a2a1d',wood:'wood_dark'})}
  table(-1.3,-1.6,{w:2.4,d:0.9,legs:4,top:M('wood_table'),base:'#1b1b1b',lay:1});for(const s of[-1,1])for(let k=-1;k<=1;k++)chair(-1.3+k*0.75,-1.6+s*0.7,s>0?PI:0,{style:'wood',frame:'#3a2a1d',seat:'#3a2a1d',wood:'wood_dark'});
  armchair(-2.5,-8.2,PI*0.6,{hex:'#5a3420'});armchair(-1.0,-8.6,-PI*0.6,{hex:'#5a3420'});plant(P.x1-0.45,-1.2,{h:1.3,pot:'#2b2b2b'});
  for(let z=-3;z>-8;z-=2.5){L.cyl(P.x0+0.03,2.1,z,0.09,0.09,0.03,10,hx('#ffe2b0'),EMIT,{gl:0.8});pool(P.x0+0.4,1.9,z,'#ffcf96',0.35,1.8)}
  plight(0,2.7,-3,'#ffcf96',0.6,8);plight(0.5,2.7,-8,'#ffcf96',0.55,8);
  const ap=['#1e6b57','#1b1b1b'];person({av:'f05',tint:ap},2.3,-4.0,-PI/2,'idle',null);X.ppl[X.ppl.length-1].look=true;person({av:'m09',tint:ap},2.3,-7.2,-PI/2,'idle',null);
  person(customer(r),-0.7,-5.15,0,'sit_table',{seatH:0.45});person(customer(r),-2.3,-6.55,0,'sit_table',{seatH:0.45});person(customer(r),cx-0.95,-4.3,PI/2,'phone',null)}};
/* ---------------- PAUL ---------------- */
TPL.paulB={plan:()=>pl(9.5,7.4,3.4,2.4,1.8,[2.0,-4.6]),build(def,r){const P=def.local,L=X.L;
  shell(P,{floor:['fl_checkbw','#ffffff'],wall:['plaster','#efe6d2'],wains:{h:1.1,tile:'panels_dark',hex:'#6a5040',railHex:'#2b1d14'},ceil:['ceiling','#f2ece0'],frame:'#1b1b1b',seed:def.seed,holesB:[[0.35,1.25,0,2.2]]});
  /* staff door to the bakehouse */L.box(P.x0+0.8,0,-P.D+0.02,0.9,2.2,0.03,hx('#2b1d14'),M('wood_dark'));L.box(P.x0+1.1,1.0,-P.D+0.06,0.12,0.03,0.04,hx('#c9a961'),M('steel'));
  /* vitrine across the room: viennoiserie | sandwiches | pâtisserie */const vx=(-4.2+1.5)/2,vl=5.7;displayCase(vx,-5.5,vl,0,{h:1.35,d:0.85,shelves:3,base:'#2b1d14',baseT:'wood_dark',fill:(Lb,i,len,y,z,dep)=>{
      const seg3=len/3;for(let x=-len/2+0.08;x<len/2-0.06;x+=0.13){const part=Math.floor((x+len/2)/seg3);if(part===0){Lb.push(x,y+0.03,z,r.r(-0.3,0.3),0,PI/2);Lb.ball(0,0,0,0.03,0.07,0.035,8,5,WH,SUB('pastry',4,i?1:0),{fit:true});Lb.pop()}
        else if(part===1){Lb.box(x,y,z,0.11,0.05,0.16,WH,SUB('pastry',4,8),{fit:[1,1],tt:SUB('pastry',4,14)})}else{const k=r.p([2,3,6,4]);if(i===0&&r()<0.5){for(let q=0;q<3;q++)Lb.cyl(x,y+q*0.022,z,0.022,0.022,0.02,10,hx(r.p(['#f2b8c6','#c8e6a0','#f6e27a','#a77bc8','#8a5a2b','#f4f1ea'])),SEMI,{cap:true})}else Lb.cyl(x,y,z,0.05,0.048,0.03,12,hx('#e8c890'),SUB('pastry',4,14),{cap:true,tt:SUB('pastry',4,k),capFit:true})}}}});
  seg(-4.2,-5.5,P.x0,-5.5);seg(1.5,-5.9,1.5,-P.D);counter(2.0,-5.5,1.0,0,{h:1.05,d:0.85,front:['wood_dark','#6a5040'],top:['marble','#ffffff']});till(2.0,1.05,-5.6,0,{scr:1});seg(2.5,-5.9,2.5,-P.D);
  /* the bread wall: dark racks with wicker baskets of baguettes and round loaves */const bx=-1.7,bl=5.0;L.push(bx,0,-P.D+0.25,0);L.box(0,0,-0.2,bl,2.4,0.08,hx('#2b1d14'),M('wood_dark'));for(const s of[-1,1])L.box(s*bl/2,0,0,0.06,2.4,0.4,hx('#2b1d14'),M('wood_dark'));
  for(let k=0;k<4;k++){const y=0.75+k*0.42;L.box(0,y,0,bl,0.03,0.4,hx('#2b1d14'),M('wood_dark'));for(let x=-bl/2+0.35;x<bl/2-0.3;x+=0.62){L.box(x,y+0.03,0,0.52,0.12,0.32,hx('#8b5a2b'),M('cane'));
      if(k===3){for(let q=0;q<4;q++){L.push(x-0.18+q*0.12,y+0.3,-0.05,0,-0.25,0);L.ball(0,0,0,0.035,0.3,0.035,8,5,WH,SUB('pastry',4,1),{fit:true});L.pop()}}else for(let q=0;q<3;q++)L.ball(x-0.15+q*0.15,y+0.18,0,0.08,0.06,0.08,8,5,WH,SUB('pastry',4,r.p([7,10,4])),{fit:true})}}L.pop();
  L.box(bx,2.55,-P.D+0.05,bl,0.5,0.04,hx('#2b1d14'),SEMI);textPanel(bx,2.8,-P.D+0.075,bl*0.92,0.42,'PAUL — Maison de Qualité depuis 1889',{fg:'#d9c48a',fam:F_SERIF,w:700,ppm:200});
  coffeeMachine(1.25,0.92,-P.D+0.4,0,{w:0.7});counter(1.3,-P.D+0.35,1.6,0,{h:0.92,d:0.5,front:['wood_dark','#6a5040'],top:['marble','#ffffff']});fridge(3.4,-P.D+0.42,1.1,0,{label:'JUS FRAIS',header:'#2b1d14',kind:'bottle',h:1.9});
  /* café seating: 6 marble bistro tables with cane chairs, dark green leather banquette on the left wall */
  banquette(P.x0+0.3,-2.4,3.4,PI/2,{base:'#2b1d14',baseT:'wood_dark',seat:'#2f4a36',back:'#2f4a36'});for(const z of[-1.2,-2.4,-3.6]){table(P.x0+1.1,z,{w:0.6,round:true,top:M('marble'),base:'#1b1b1b',lay:1});chair(P.x0+1.7,z,-PI/2,{style:'bistro',frame:'#2b1d14',seat:'#c8a878'})}
  for(const [x,z] of[[-1.6,-1.6],[-0.1,-3.2],[-1.9,-3.6]]){table(x,z,{w:0.6,round:true,top:M('marble'),base:'#1b1b1b',lay:1});chair(x-0.5,z,PI/2,{style:'bistro',frame:'#2b1d14',seat:'#c8a878'});chair(x+0.5,z,-PI/2,{style:'bistro',frame:'#2b1d14',seat:'#c8a878'})}
  /* window display shelves with loaves and a cake stand */for(const w of[[P.x0+0.2,0.85]]){}L.box(-1.5,0.3,-0.35,4.6,0.04,0.45,hx('#2b1d14'),M('wood_dark'));for(let x=-3.6;x<0.6;x+=0.42)L.ball(x,0.4,-0.35,0.12,0.08,0.1,8,5,WH,SUB('pastry',4,r.p([7,10])),{fit:true});colBox(-1.5,-0.35,4.6,0.45,0);
  for(const [x,z,ry] of[[P.x0+0.03,-1.3,PI/2],[P.x0+0.03,-3.6,PI/2]])picture(x,1.8,z,0.6,0.45,ry,(g,W,H)=>sepia(g,W,H,'villa'),'#2b1d14');
  for(let x=-3.8;x<1.6;x+=1.4)pendant(x,P.h,-5.5,{len:0.9,style:'bulb',light:'#ffd09a',i:0.5,r:2.6});for(const z of[-1.5,-3.5])pendant(-1.0,P.h,z,{len:1.0,style:'dome',hex:'#b08a50',i:0.4});
  plight(-1,3.0,-5.2,'#ffd09a',0.7,8);plight(-1,3.0,-2,'#ffd09a',0.5,8);
  const ap=['#1b1b1b','#1b1b1b'];person({av:'f12',tint:ap},-0.5,-6.4,0,'idle',null);X.ppl[X.ppl.length-1].look=true;person({av:'m03',tint:ap},2.0,-6.4,0,'idle',null);X.ppl[X.ppl.length-1].look=true;
  person(customer(r),P.x0+1.7,-2.4,-PI/2,'sit_table',{seatH:0.45});person(customer(r),-0.6,-3.2,PI/2,'sit_table',{seatH:0.45});person(customer(r),-0.8,-4.7,PI,'idle',null)}};
/* ---------------- KFC ---------------- */
TPL.kfcB={plan:()=>pl(9,15,3.6,0.6,1.8,[-1.0,-8.3]),build(def,r){const P=def.local,L=X.L;
  shell(P,{floor:['fl_large','#6a6a6c'],wall:['plaster2','#f6f6f4'],ceil:['ceiling','#f4f4f2'],frame:'#1a1a1a',seed:def.seed,wy0:0.4,wy1:3.1,bars:{w:1.4,y:[]}});
  /* counter across the room at z -9: red front with white stripes, white top, 4 tills */const cz=-9;counter(0,cz,7.0,0,{h:1.05,d:0.8,front:['tile_kitkat','#d8102e'],top:['marble','#ffffff']});for(let k=0;k<4;k++)till(-2.6+k*1.75,1.05,cz-0.05,0,{scr:k%2?5:1});
  L.box(0,0.12,cz+0.41,7.0,0.03,0.01,hx('#ff3a4a'),EMIT,{gl:1,f:'z'});seg(-3.5,cz,P.x0,cz);seg(3.5,cz,P.x1,cz);
  /* 4 digital menu screens above the counter */const m=def.menu.items;for(let k=0;k<4;k++){const part=m.slice(k*2,k*2+2);menuBoard(-2.7+k*1.8,2.5,-P.D+0.08,1.0,0.56,0,{cols:[{title:['BUCKETS','BURGERS','WRAPS','SIDES'][k],rows:part.length?part:[[' ',null]]}],bg:'#141414',ac:'#ffffff',pc:'#ffd23a',paintBg:(g,W,H)=>{g.fillStyle='#e4002b';g.fillRect(0,0,W,H*0.2)}})}
  /* feature wall: red and white vertical stripes behind the counter */const st=boardTile(512,256,(g,W,H)=>{for(let i=0;i<16;i++){g.fillStyle=i%2?'#ffffff':'#e4002b';g.fillRect(i*W/16,0,W/16+1,H)}});X.L.box(0,0,-P.D+0.03,P.W,0.01,0.01,WH,FLAT);X.B.face([P.x0,0.0,-P.D+0.03],[P.x1,0.0,-P.D+0.03],[P.x1,P.h,-P.D+0.03],[P.x0,P.h,-P.D+0.03],WH,st,{gl:0});
  /* kitchen line: fryers, holding cabinet with orange heat lamps, drinks dispenser */for(let k=0;k<5;k++){const x=-3.2+k*1.3;L.box(x,0,-12.4,1.1,0.92,0.75,hx('#c8ccd0'),M('steel'));}
  L.box(-0.6,0.92,-12.4,2.4,0.6,0.6,hx('#b9bcc0'),M('steel'));L.box(-0.6,1.05,-12.08,2.2,0.35,0.02,hx('#ff8a30'),EMIT,{gl:0.8,f:'z'});pool(-0.6,1.4,-11.6,'#ff8a3a',0.6,2.2);L.box(2.2,0.92,-12.4,1.0,0.7,0.6,hx('#1b1b1d'),SEMI);for(let k=0;k<4;k++)L.box(1.85+k*0.23,1.25,-12.08,0.08,0.18,0.06,hx(k%2?'#1f5fbf':'#2e9a46'),GLOSS);
  for(let z=-10;z>-14;z-=1.4)strip(0,P.h,z,4,0,{light:'#fff6e8',i:0.35});
  /* self-order kiosks on the left wall, condiment station on the right */for(let k=0;k<3;k++){const z=-4.2-k*0.8;L.push(P.x0+0.22,0,z,PI/2);L.box(0,0,0,0.6,0.08,0.4,hx('#1a1a1a'),SEMI);L.box(0,0.08,0,0.12,0.8,0.12,hx('#2a2a2c'),SEMI);L.box(0,0.85,0.02,0.55,0.95,0.06,hx('#1a1a1a'),SEMI);L.box(0,0.92,0.052,0.48,0.82,0.002,WH,SUB('panel',4,13),{f:'z',fit:[1,1],gl:0.8});L.pop();colBox(P.x0+0.22,z,0.4,0.62,0)}
  counter(P.x1-0.35,-6.0,1.6,-PI/2,{h:0.95,d:0.5,front:['tile_white','#ffffff'],top:['steel','#ffffff']});for(let k=0;k<4;k++)L.box(P.x1-0.35,0.95,-5.5-k*0.32,0.18,0.22,0.14,hx(k%2?'#e4002b':'#f4f1ea'),SEMI);
  /* seating: 6 four-tops, bench along the left wall with 2-tops, high bar along the street window with stools */
  for(const [x,z] of[[-0.4,-3.0],[1.9,-3.0],[-0.4,-5.4],[1.9,-5.4],[-0.4,-7.4],[1.9,-7.4]]){table(x,z,{w:1.0,d:0.7,legs:4,top:M('wood_table'),base:'#1a1a1a'});for(const s of[-1,1])for(const q of[-1,1])chair(x+q*0.27,z+s*0.58,s>0?PI:0,{style:'metal',frame:'#1a1a1a',seat:'#e4002b'})}
  banquette(P.x0+0.3,-1.9,2.6,PI/2,{base:'#1a1a1a',baseT:'wood_black',seat:'#e4002b',back:'#e4002b'});for(const z of[-1.3,-2.6]){table(P.x0+1.05,z,{w:0.65,d:0.6,legs:4,top:M('wood_table'),base:'#1a1a1a'});chair(P.x0+1.65,z,-PI/2,{style:'metal',frame:'#1a1a1a',seat:'#e4002b'})}
  L.box(2.9,1.0,-0.45,3.0,0.04,0.4,hx('#a0703c'),M('wood_table'));L.box(2.9,0,-0.6,3.0,1.0,0.04,hx('#1a1a1a'),SEMI);colBox(2.9,-0.45,3.0,0.4,0);for(let k=0;k<4;k++)chair(1.7+k*0.8,-0.95,PI,{style:'stool',frame:'#1a1a1a',seat:'#e4002b'});
  /* black graphic panels with food words */textPanel(P.x0+0.02,2.4,-2.2,2.0,0.7,'HOT & CRISPY',{bg:'#1a1a1a',fg:'#ffffff',ry:PI/2,ppm:200,fam:F_HEAD});textPanel(P.x1-0.02,2.4,-3.2,2.2,0.7,'FRESH CHICKEN',{bg:'#1a1a1a',fg:'#ffffff',ry:-PI/2,ppm:200,fam:F_HEAD});
  for(const [x,z] of[[-0.4,-3],[1.9,-3],[-0.4,-5.4],[1.9,-5.4],[-0.4,-7.4],[1.9,-7.4]])pendant(x,P.h,z,{len:1.3,style:'cone',hex:'#1a1a1a',light:'#fff0dc',i:0.45});for(let z=-1.5;z>-8.5;z-=2.5)downlight(-2.6,P.h,z,{light:'#fff4e6',i:0.35});
  plight(0,3.2,-4,'#fff2e0',0.7,10);plight(0,3.2,-9.5,'#fff2e0',0.6,8);
  const uni=['#1a1a1a','#e4002b'];person({av:'f02',tint:uni},-1.0,cz-0.8,0,'idle',null);X.ppl[X.ppl.length-1].look=true;person({av:'m11',tint:uni},1.6,cz-0.8,0,'idle',null);person({av:'m07',tint:['#1a1a1a','#1a1a1a']},-0.6,-11.7,PI,'idle',null);
  person(customer(r),-0.67,-5.4-0.58,0,'sit_table',{seatH:0.45});person(customer(r),2.17,-3.0+0.58,PI,'sit_table',{seatH:0.45});person(customer(r),-1.0,-7.9,PI,'idle',null)}};
/* ---------------- AB VASILOPOULOS ---------------- */
TPL.abB={plan:()=>pl(26,18,3.2,0,2.4,[3.6,-3.4]),build(def,r){const P=def.local,L=X.L;
  shell(P,{floor:['fl_large','#ecebe8'],wall:['plaster2','#f6f6f4'],ceil:['ceil_grid','#ffffff'],frame:'#9aa0a6',seed:def.seed,dh:2.5,wy0:0.25,wy1:2.6});
  /* checkouts on the right: belt + till, cigarettes/sweets rack behind */for(let k=0;k<3;k++){const x=2.6+k*2.0;L.box(x,0,-3.4,0.8,0.85,2.8,hx('#2b2f36'),SEMI);L.box(x,0.85,-3.0,0.6,0.02,2.0,hx('#1b1b1d'),M('rubber'));L.box(x,0.85,-4.4,0.8,0.03,0.6,hx('#c8ccd0'),M('steel'));till(x-0.15,0.88,-4.4,-PI/2,{scr:1});colBox(x,-3.4,0.8,2.8,0);
    person({av:k?'f08':'f13',tint:['#0a4ea1','#1b1b1d']},x+0.7,-4.4,-PI/2,'idle',null);if(k===0)X.ppl[X.ppl.length-1].look=true;if(k>0)X.ppl.pop()}
  shelving(5.0,-0.6,5.5,PI,{wall:true,d:0.35,n:5,flat:true,h:1.8});
  /* produce: tilted crates on stepped stands (2 islands + a wall unit) */const crate=(x,z,ry,w)=>{L.push(x,0,z,ry);L.box(0,0,0,w,0.55,1.2,hx('#8a6a44'),M('plywood'));for(let k=0;k<Math.floor(w/0.5);k++){const cx=-w/2+0.25+k*0.5;for(const [zz,yy] of[[0.3,0.7],[-0.25,0.9]]){L.push(cx,yy,zz,0,-0.35);L.box(0,0,0,0.46,0.12,0.5,hx('#a8845a'),M('plywood'),{f:'xXzZ'});L.box(0,0.1,0,0.42,0.005,0.46,WH,SUB('produce',4,r.i(0,15)),{fit:[1,1],f:'t'});L.pop()}}L.pop();colBox(x,z,w,1.2,ry)};
  crate(-6,-3.0,0,3.0);crate(-9.8,-3.0,0,3.0);crate(P.x0+0.65,-6.5,PI/2,4.5);shelving(-9.5,-0.55,3.0,PI,{wall:true,h:1.4,n:3,d:0.5,flat:true,flatT:'pastry'});
  /* six aisles: gondolas along z with packed shelves and promo stacks at the ends */const cats=['ΖΥΜΑΡΙΚΑ · ΡΥΖΙ','ΛΑΔΙ · ΚΟΝΣΕΡΒΕΣ','ΠΡΩΙΝΟ · ΚΑΦΕΣ','ΣΝΑΚ · ΜΠΙΣΚΟΤΑ','ΑΝΑΨΥΚΤΙΚΑ · ΚΡΑΣΙΑ','ΚΑΘΑΡΙΣΤΙΚΑ'],cols=['#0a4ea1','#d7262d','#3f8f3a','#f39c12','#0a4ea1','#7b3fa0'];
  for(let k=0;k<6;k++){const x=-8.6+k*2.75;if(x>9.5)break;shelving(x,-11.3,9.0,PI/2,{h:1.75,n:5,d:0.9,flat:true,kind:k===4?'bottle':null,header:null});L.box(x,0,-6.4,0.9,0.6,0.7,WH,SUB('labels',8,r.i(0,63)),{fit:[1,1]});colBox(x,-6.4,0.9,0.7,0);
    const sg=boardTile(360,90,(g,W,H)=>{g.fillStyle=cols[k];g.fillRect(0,0,W,H);fitText(g,cats[k],W/2,H*0.66,Math.round(H*0.5),800,F_SANS,'#ffffff','center',W*0.92)});X.L.tube([x,P.h,-9],[x,2.75,-9],0.004,3,hx('#555'),FLAT);X.B.panel(x,2.6,-9,1.6,0.4,WH,sg,{ry:0});X.B.panel(x,2.6,-9.001,1.6,0.4,WH,sg,{ry:PI})}
  /* back wall: open dairy / chilled cabinets with lit shelves, freezer corner */const fx0=-10,fl=13;L.push(-3.5,0,-P.D+0.45,0);L.box(0,0,0,fl,2.0,0.85,hx('#e8e8e6'),SEMI,{f:'xXt'});L.box(0,0.1,0.2,fl,0.55,0.4,hx('#0a4ea1'),SEMI,{f:'z'});
  for(let k=0;k<5;k++){const y=0.7+k*0.26;L.box(0,y,0.05,fl-0.1,0.02,0.6,hx('#f4f6f8'),GLOSS);L.box(0,y+0.02,0.05,fl-0.3,0.2,0.5,WH,M('labels',0.6),{f:'zt'})}L.box(0,1.98,0.3,fl,0.02,0.2,hx('#f8fbff'),EMIT,{gl:1,f:'b'});L.pop();colBox(-3.5,-P.D+0.45,fl,0.85,0);pool(-3.5,1.4,-P.D+1.4,'#eef6ff',0.45,6);
  textPanel(-3.5,2.45,-P.D+0.03,4,0.42,'ΓΑΛΑΚΤΟΚΟΜΙΚΑ · ΤΥΡΙΑ',{bg:'#0a4ea1',fg:'#ffffff',ppm:150});
  for(let k=0;k<3;k++){L.box(6.5+k*2.1,0,-P.D+0.6,1.9,0.85,0.9,hx('#f2f2f0'),SEMI);X.G.face([5.6+k*2.1,0.86,-P.D+0.15],[7.4+k*2.1,0.86,-P.D+0.15],[7.4+k*2.1,0.86,-P.D+1.05],[5.6+k*2.1,0.86,-P.D+1.05],hx('#d8ecf0'),FLAT);L.box(6.5+k*2.1,0.6,-P.D+0.6,1.8,0.2,0.8,WH,M('labels',0.5),{f:'t'});colBox(6.5+k*2.1,-P.D+0.6,1.9,0.9,0)}
  /* deli / cheese counter on the right wall with a clerk */displayCase(P.x1-1.4,-10,4.0,-PI/2,{h:1.3,d:0.9,shelves:2,base:'#0a4ea1',baseT:'panels_dark',fill:(Lb,i,len,y,z,dep)=>{for(let x=-len/2+0.1;x<len/2-0.1;x+=0.32)Lb.box(x,y,z,0.26,0.07,0.2,hx(r.p(['#f4e8c0','#e8c890','#c8584a','#f2f0e8'])),SEMI)}});person({av:'m03',tint:['#ffffff','#1b1b1d']},P.x1-0.5,-10,-PI/2,'idle',null);
  textPanel(P.x1-0.03,2.4,-10,3.0,0.4,'ΑΛΛΑΝΤΙΚΑ · ΤΥΡΙΑ',{bg:'#d7262d',fg:'#fff',ry:-PI/2,ppm:150});
  /* baskets and trolleys at the door */for(let k=0;k<4;k++)L.box(-2.0,k*0.12,-1.0,0.45,0.12,0.33,hx('#d7262d'),M('grille'),{f:'xXzZt'});colBox(-2.0,-1.0,0.5,0.4,0);
  for(let i=0;i<5;i++)for(let j=0;j<4;j++)strip(-10+i*5,P.h,-2.5-j*4.2,3.6,PI/2,{light:'#f6faff',i:0.3});plight(-3,2.9,-6,'#f6faff',0.6,14);plight(4,2.9,-12,'#f6faff',0.6,14);
  person(customer(r),-6.0,-4.4,PI,'idle',null);person(customer(r),-3.1,-10.5,PI/2,'look_around',null)}};
/* ---------------- SEPHORA ---------------- */
TPL.sephB={plan:()=>pl(7.5,16,3.2,0,1.9,[1.9,-11.1]),build(def,r){const P=def.local,L=X.L;
  shell(P,{floor:['fl_large','#f4f4f4'],wall:['plaster2','#ffffff'],ceil:['ceiling','#ffffff'],frame:'#111111',seed:def.seed,skirt:'#111111'});
  const stripes=boardTile(512,256,(g,W,H)=>{for(let i=0;i<24;i++){g.fillStyle=i%2?'#ffffff':'#000000';g.fillRect(i*W/24,0,W/24+1,H)}});
  for(const s of[-1,1])X.B.face(s<0?[P.x0+0.01,0,0]:[P.x1-0.01,0,-1.6],s<0?[P.x0+0.01,0,-1.6]:[P.x1-0.01,0,0],s<0?[P.x0+0.01,P.h,-1.6]:[P.x1-0.01,P.h,0],s<0?[P.x0+0.01,P.h,0]:[P.x1-0.01,P.h,-1.6],WH,stripes,{gl:0});
  X.B.face([0.8,0,-P.D+0.02],[P.x1,0,-P.D+0.02],[P.x1,P.h,-P.D+0.02],[0.8,P.h,-P.D+0.02],WH,stripes,{gl:0});
  /* perimeter brand bays with lit shelves: make-up left, fragrance right */for(const s of[-1,1]){const x=s<0?P.x0+0.25:P.x1-0.25;for(let z=-2.2;z>-P.D+3.4;z-=1.25){shelving(x,z,1.2,s<0?PI/2:-PI/2,{wall:true,d:0.42,n:5,h:2.4,flat:true,kind:s<0?'jar':'bottle',hex:'#111111',kick:'#000'});X.L.box(x+(s<0?0.2:-0.2),2.25,z,0.02,0.12,1.1,WH,FLAT,{});}
    textPanel(s<0?P.x0+0.03:P.x1-0.03,2.75,-6.5,2.4,0.3,s<0?'MAKE-UP':'FRAGRANCE',{fg:'#000',ry:s<0?PI/2:-PI/2,ppm:200});for(let z=-2.2;z>-P.D+3.4;z-=1.25)pool(x+(s<0?0.5:-0.5),1.5,z,'#ffffff',0.3,1.4)}
  /* three low gondolas down the middle */for(let k=0;k<3;k++)shelving(0,-3.6-k*3.3,3.0,PI/2,{h:1.4,n:3,d:0.8,flat:true,kind:k===1?'box':'jar',hex:k===1?'#f4f4f4':'#111111'});
  /* tills: black gloss counter back right, bags behind; make-up chair + mirror back left */counter(1.9,-12,2.4,0,{h:1.0,d:0.6,front:['wood_black','#111111'],top:['wood_black','#111111']});till(1.6,1.0,-12.05,0,{scr:1});
  for(let k=0;k<6;k++)L.box(1.2+k*0.28,1.1,-P.D+0.08,0.24,0.3,0.1,hx(k%2?'#111':'#fff'),SEMI);
  chair(-2.3,-12.6,PI*0.15,{style:'stool',frame:'#111',seat:'#111'});mirror(-2.6,1.55,-P.D+0.03,0.8,1.0,0,{frame:'#111'});for(let k=0;k<5;k++)L.ball(-2.95+k*0.17,2.1,-P.D+0.06,0.03,0.03,0.03,6,4,hx('#fff6e0'),EMIT,{gl:1});
  for(let i=0;i<3;i++)for(let j=0;j<6;j++)downlight(-2.2+i*2.2,P.h,-1.5-j*2.4,{light:'#ffffff',i:0.35});plight(0,2.8,-5,'#ffffff',0.6,10);plight(0,2.8,-12,'#ffffff',0.5,8);
  textPanel(0,2.8,-P.D+0.03,2.4,0.4,'SEPHORA',{fg:'#000',ppm:220,fam:F_SANS});
  const uni=['#111111','#111111'];person({av:'f11',tint:uni},1.9,-12.75,0,'idle',null);X.ppl[X.ppl.length-1].look=true;person({av:'f03',tint:uni},-2.0,-8.0,PI/2,'idle',null);
  person(customer(r),-2.6,-5.0,-PI/2,'look_around',null);person(customer(r),2.4,-9.0,PI/2,'idle',null)}};
for(const s of SPECIALS){const T={paul:'paulB',starbucks:'sbux',kfc:'kfcB',super:'abB',sephora:'sephB'}[s.key];if(T){s.plan=TPL[T].plan;s.build=TPL[T].build}}

/* ============================== BOOT ============================== */
async function boot(){if(IN.booted)return IN.booted;IN.booted=(async()=>{const t0=performance.now();
    const get=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);const [sh,ce]=await Promise.all([get('data/shops.json'),get('data/census.json'),loadManifest()]);IN.shopsData=sh;IN.census=ce;
    try{buildDoors()}catch(e){console.error('interiors: doors failed',e)}installHooks();IN.bootMs=Math.round(performance.now()-t0);return DOORS.length})();return IN.booted}
Object.defineProperty(INTERIORS,'_',{value:{boot,enter,exit,IN,DOORS,TPL,stats:IN.stats,tick:tickCell,L2W,W2L},enumerable:false});
Object.defineProperty(INTERIORS,'generic',{value:INTERIORS.generic,enumerable:false});

})();
