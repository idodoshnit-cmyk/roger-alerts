'use strict';
/* Grand Kifisia — utilities, renderer, quality presets, geometry builder (GB), chunks, collision grid, map-data helpers */
const $=id=>document.getElementById(id);
const TAU=Math.PI*2, clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, sstep=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
let _s=7; const rnd=()=>{_s=_s+0x6D2B79F5|0;let t=Math.imul(_s^_s>>>15,1|_s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const R=(a,b)=>a+rnd()*(b-a), pick=a=>a[Math.floor(rnd()*a.length)];
const hf=n=>{n=Math.imul(n^61^(n>>>16),9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return(n>>>0)/4294967296};
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const store={get(k,d){try{const v=localStorage.getItem('gk2_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('gk2_'+k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tick=()=>new Promise(r=>setTimeout(r,0));
let _lt=performance.now();function setLoad(p,t){$('loadFill').style.width=Math.round(p*100)+'%';if(t)$('loadTxt').textContent=t;if(location.hash==='#debug'){const n=performance.now();console.log('[load] '+((n-_lt)/1000).toFixed(2)+'s → '+t);_lt=n}}

/* Greek → Latin (ELOT 743, simplified) for street names in the HUD and signs */
function greeklish(s){if(!s)return'';const a=s.normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
  const dig={'ΟΥ':'OU','ΑΙ':'AI','ΕΙ':'EI','ΟΙ':'OI','ΜΠ':'MP','ΝΤ':'NT','ΓΚ':'GK','ΓΓ':'NG','ΑΥ':'AV','ΕΥ':'EV','ΘΘ':'TH'};
  const one={'Α':'A','Β':'V','Γ':'G','Δ':'D','Ε':'E','Ζ':'Z','Η':'I','Θ':'TH','Ι':'I','Κ':'K','Λ':'L','Μ':'M','Ν':'N','Ξ':'X','Ο':'O','Π':'P','Ρ':'R','Σ':'S','Σ':'S','Τ':'T','Υ':'Y','Φ':'F','Χ':'CH','Ψ':'PS','Ω':'O'};
  let o='';for(let i=0;i<a.length;i++){const d=a.substr(i,2);if(dig[d]){o+=dig[d];i++;continue}o+=one[a[i]]!==undefined?one[a[i]]:a[i]}
  return o.replace(/\b(\w)(\w*)/g,(m,f,r)=>f+r.toLowerCase())}
const isGreek=s=>/[Ͱ-Ͽ]/.test(s||'');

/* ============================== RENDERER ============================== */
/* Quality presets. pr: max pixel ratio, sh: sun shadow map size (0 = no shadows), shN: half-width (m) of the near shadow box, sh2/shF: map size and half-width of the far
   shadow cascade (0 = single cascade), dist: view distance (m), trees: garden tree density, real: realistic characters,
   tex: material layer size, ntex: normal-map layer size (0 = no normal mapping), aniso: anisotropic filtering, aa: multisampling (also SETTINGS.aa=false). */
const SETTINGS=Object.assign({q:'auto',fps:false},store.get('settings',{}));
const QP={low:{pr:0.7,sh:0,sh2:0,shN:40,shF:0,dist:170,trees:0.45,real:4,tex:256,ntex:0,aniso:2,aa:false},
  medium:{pr:1.0,sh:1024,sh2:1024,shN:30,shF:125,dist:240,trees:0.75,real:8,tex:512,ntex:256,aniso:4,aa:true},
  high:{pr:1.4,sh:2048,sh2:2048,shN:36,shF:150,dist:320,trees:1,real:14,tex:512,ntex:512,aniso:8,aa:true}};
let Q=QP[SETTINGS.q==='auto'?(Math.min(screen.width,screen.height)<500&&(navigator.hardwareConcurrency||4)<=4?'low':'medium'):SETTINGS.q]||QP.medium;
const canvas=$('c');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:Q.aa&&SETTINGS.aa!==false,powerPreference:'high-performance',stencil:false});}
catch(e){$('loadTxt').textContent='This device could not start 3D graphics (WebGL).';throw e}
const GL2=renderer.capabilities.isWebGL2;
if(!GL2)$('loadTxt').textContent='This browser has no WebGL 2, which the game needs. Please update your browser or try another device.';
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.6;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(60,1,0.3,900);
scene.fog=new THREE.Fog(0xb8c8d6,70,420);// colour and range are driven by 82_sky.js / applyQuality()
const hemi=new THREE.HemisphereLight(0x8fbaff,0x80756a,0.95);scene.add(hemi);
const amb=new THREE.AmbientLight(0xffffff,0.07);scene.add(amb);
const sun=new THREE.DirectionalLight(0xfff0d8,2.7);sun.castShadow=true;scene.add(sun);scene.add(sun.target);
/* Second shadow cascade of the SAME sun: a wide, coarse box that is refreshed every few frames (82_sky.js). Its intensity stays 0 — the patched light loop below
   applies the sun's light exactly once and blends the two shadow maps. Do not add other shadow-casting DirectionalLights to the scene. */
const sun2=new THREE.DirectionalLight(0xffffff,0);sun2.castShadow=true;sun2.shadow.autoUpdate=false;scene.add(sun2);scene.add(sun2.target);
/* Shader patches shared by EVERY lit material (world, people, cars, interiors), applied before any material is compiled:
   1. soft shadows with 3×3 taps and smooth (quadratic) weights instead of three's 4×4 taps: 9 texture reads per pixel instead of 16;
   2. two shadow cascades for one sun, cross-faded at the edge of the near box, and faded out at the edge of the far box. */
(function(){const C=THREE.ShaderChunk;let s=C.shadowmap_pars_fragment;const a=s.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )'),b=s.indexOf('#elif defined( SHADOWMAP_TYPE_VSM )');
  if(a>0&&b>a)C.shadowmap_pars_fragment=s.slice(0,a)+`#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 gkTs = vec2( 1.0 ) / shadowMapSize; vec2 gkT = shadowCoord.xy * shadowMapSize; vec2 gkC = floor( gkT ); vec2 gkG = gkT - gkC; vec2 gkU = ( gkC + 0.5 ) * gkTs;
			vec3 gkWx = vec3( 0.5 * ( 1.0 - gkG.x ) * ( 1.0 - gkG.x ), 0.5 + gkG.x * ( 1.0 - gkG.x ), 0.5 * gkG.x * gkG.x );
			vec3 gkWy = vec3( 0.5 * ( 1.0 - gkG.y ) * ( 1.0 - gkG.y ), 0.5 + gkG.y * ( 1.0 - gkG.y ), 0.5 * gkG.y * gkG.y );
			shadow = gkWy.x * ( gkWx.x * texture2DCompare( shadowMap, gkU + vec2( - gkTs.x, - gkTs.y ), shadowCoord.z ) + gkWx.y * texture2DCompare( shadowMap, gkU + vec2( 0.0, - gkTs.y ), shadowCoord.z ) + gkWx.z * texture2DCompare( shadowMap, gkU + vec2( gkTs.x, - gkTs.y ), shadowCoord.z ) )
				+ gkWy.y * ( gkWx.x * texture2DCompare( shadowMap, gkU + vec2( - gkTs.x, 0.0 ), shadowCoord.z ) + gkWx.y * texture2DCompare( shadowMap, gkU, shadowCoord.z ) + gkWx.z * texture2DCompare( shadowMap, gkU + vec2( gkTs.x, 0.0 ), shadowCoord.z ) )
				+ gkWy.z * ( gkWx.x * texture2DCompare( shadowMap, gkU + vec2( - gkTs.x, gkTs.y ), shadowCoord.z ) + gkWx.y * texture2DCompare( shadowMap, gkU + vec2( 0.0, gkTs.y ), shadowCoord.z ) + gkWx.z * texture2DCompare( shadowMap, gkU + vec2( gkTs.x, gkTs.y ), shadowCoord.z ) );
		`+s.slice(b);else console.warn('shadow filter patch not applied');
  s=C.lights_fragment_begin;const i0=s.indexOf('DirectionalLight directionalLight;'),i1=s.indexOf('#pragma unroll_loop_end',i0);
  if(i0>0&&i1>i0){const head=i0+'DirectionalLight directionalLight;'.length,end=i1+'#pragma unroll_loop_end'.length;
    C.lights_fragment_begin=s.slice(0,head)+`
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS == 2
	{
		vec3 gkC0 = vDirectionalShadowCoord[ 0 ].xyz / vDirectionalShadowCoord[ 0 ].w; vec2 gkE0 = abs( gkC0.xy - 0.5 );
		float gkW = ( gkC0.z > 1.0 ) ? 0.0 : 1.0 - smoothstep( 0.42, 0.49, max( gkE0.x, gkE0.y ) );
		float gkS = 1.0;
		if ( receiveShadow ) {
			float gkS0 = 1.0, gkS1 = 1.0;
			if ( gkW > 0.0 ) gkS0 = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
			if ( gkW < 1.0 ) { vec3 gkC1 = vDirectionalShadowCoord[ 1 ].xyz / vDirectionalShadowCoord[ 1 ].w; vec2 gkE1 = abs( gkC1.xy - 0.5 );
				gkS1 = mix( 1.0, getShadow( directionalShadowMap[ 1 ], directionalLightShadows[ 1 ].shadowMapSize, directionalLightShadows[ 1 ].shadowBias, directionalLightShadows[ 1 ].shadowRadius, vDirectionalShadowCoord[ 1 ] ), 1.0 - smoothstep( 0.40, 0.49, max( gkE1.x, gkE1.y ) ) ); }
			gkS = mix( gkS1, gkS0, gkW );
		}
		directionalLight = directionalLights[ 0 ];
		getDirectionalLightInfo( directionalLight, geometry, directLight );
		directLight.color *= gkS;
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_start
	for ( int i = 2; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, geometry, directLight );
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
	#else`+s.slice(head,end)+`
	#endif`+s.slice(end)}else console.warn('shadow cascade patch not applied')})();
/* uniforms shared by the world material and the sky (10_atlas.js, 82_sky.js) */
const U={night:{value:0},time:{value:0},noiseL:{value:0},lamp:{value:null},lampR:{value:new THREE.Vector4(0,0,1,1)},lampH:{value:new THREE.Vector2(0,1)},lampC:{value:new THREE.Color(0,0,0)},shopC:{value:new THREE.Color(0,0,0)},
  skyZ:{value:new THREE.Color(0.1,0.2,0.5)},skyH:{value:new THREE.Color(0.5,0.6,0.8)},skyG:{value:new THREE.Color(0.1,0.1,0.1)},fogSun:{value:new THREE.Vector4(1,1,1,0)},sunXZ:{value:new THREE.Vector2(1,0)},haze:{value:0.0005}};
let pixelRatio=Math.min(window.devicePixelRatio||1,Q.pr);
function applyQuality(){renderer.setPixelRatio(pixelRatio);const on=Q.sh>0;sun.castShadow=on;sun2.visible=on&&Q.sh2>0;
  for(const [l,size,half] of [[sun,Q.sh,Q.shN||55],[sun2,Q.sh2||0,Q.shF||125]]){if(!size)continue;l.shadow.mapSize.set(size,size);if(l.shadow.map){l.shadow.map.dispose();l.shadow.map=null}
    const s=l.shadow.camera,texel=2*half/size;s.left=-half;s.right=half;s.top=half;s.bottom=-half;s.near=1;s.far=420;s.updateProjectionMatrix();l.shadow.bias=-0.00004-texel*0.0004;l.shadow.normalBias=texel*1.1;l.shadow.needsUpdate=true}
  camera.far=Q.dist*1.35;scene.fog.far=Q.dist-8;scene.fog.near=Q.dist*0.6;camera.updateProjectionMatrix();resize();if(typeof texQuality==='function')texQuality()}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);

/* ============================== GEOMETRY BUILDER ============================== */
class GB{constructor(){this.p=[];this.n=[];this.u=[];this.c=[];this.r=[];this.g=[];this.i=[];this.vc=0}
  v(x,y,z,nx,ny,nz,u,w,col,rc,gl){this.p.push(x,y,z);this.n.push(nx,ny,nz);this.u.push(u,w);this.c.push(col[0],col[1],col[2]);this.r.push(rc[0],rc[1],rc[2],rc[3]);this.g.push(gl||0);return this.vc++}
  nrm(a,b,c){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;return[nx/l,ny/l,nz/l]}
  tri(a,b,c,ua,ub,uc,col,rc,gl,flat){const n=flat?[0,1,0]:this.nrm(a,b,c);const o=this.v(a[0],a[1],a[2],n[0],n[1],n[2],ua[0],ua[1],col,rc,gl);this.v(b[0],b[1],b[2],n[0],n[1],n[2],ub[0],ub[1],col,rc,gl);this.v(c[0],c[1],c[2],n[0],n[1],n[2],uc[0],uc[1],col,rc,gl);this.i.push(o,o+1,o+2)}
  quad(a,b,c,d,ua,ub,uc,ud,col,rc,gl){const n=this.nrm(a,b,c);const o=this.v(a[0],a[1],a[2],n[0],n[1],n[2],ua[0],ua[1],col,rc,gl);this.v(b[0],b[1],b[2],n[0],n[1],n[2],ub[0],ub[1],col,rc,gl);this.v(c[0],c[1],c[2],n[0],n[1],n[2],uc[0],uc[1],col,rc,gl);this.v(d[0],d[1],d[2],n[0],n[1],n[2],ud[0],ud[1],col,rc,gl);this.i.push(o,o+1,o+2,o,o+2,o+3)}
  /* horizontal-ish quad forced to face up (or down) */
  triN(a,b,c,na,nb,nc,ua,ub,uc,col,rc,gl){const o=this.v(a[0],a[1],a[2],na[0],na[1],na[2],ua[0],ua[1],col,rc,gl);this.v(b[0],b[1],b[2],nb[0],nb[1],nb[2],ub[0],ub[1],col,rc,gl);this.v(c[0],c[1],c[2],nc[0],nc[1],nc[2],uc[0],uc[1],col,rc,gl);this.i.push(o,o+1,o+2)}
  hq(a,b,c,d,ua,ub,uc,ud,col,rc,gl,down){const n=this.nrm(a,b,c);if((n[1]<0)!==!!down)this.quad(d,c,b,a,ud,uc,ub,ua,col,rc,gl);else this.quad(a,b,c,d,ua,ub,uc,ud,col,rc,gl)}
  /* vertical quad from (ax,az)->(bx,bz) between heights, facing the side given by normal (nx,nz) */
  wall(ax,az,bx,bz,y0a,y0b,y1a,y1b,nx,nz,u0,u1,v0,v1,col,rc,gl){const fx=-(bz-az),fz=bx-ax;if(fx*nx+fz*nz>=0)this.quad([ax,y0a,az],[bx,y0b,bz],[bx,y1b,bz],[ax,y1a,az],[u0,v0],[u1,v0],[u1,v1],[u0,v1],col,rc,gl);
    else this.quad([bx,y0b,bz],[ax,y0a,az],[ax,y1a,az],[bx,y1b,bz],[u0,v0],[u1,v0],[u1,v1],[u0,v1],col,rc,gl)}
  box(cx,cy,cz,sx,sy,sz,ry,col,rc,uvs,gl){const c=Math.cos(ry),s=Math.sin(ry),hx=sx/2,hz=sz/2;const P=(x,z)=>[cx+x*c+z*s,cz-x*s+z*c];
    const pts=[P(-hx,-hz),P(hx,-hz),P(hx,hz),P(-hx,hz)],y0=cy-sy/2,y1=cy+sy/2,k=uvs||1;
    for(let i=0;i<4;i++){const a=pts[i],b=pts[(i+1)%4];const mx=(a[0]+b[0])/2-cx,mz=(a[1]+b[1])/2-cz;const L=Math.hypot(b[0]-a[0],b[1]-a[1]);this.wall(a[0],a[1],b[0],b[1],y0,y0,y1,y1,mx,mz,0,L*k,0,sy*k,col,rc,gl)}
    this.quad([pts[0][0],y1,pts[0][1]],[pts[3][0],y1,pts[3][1]],[pts[2][0],y1,pts[2][1]],[pts[1][0],y1,pts[1][1]],[0,0],[0,sz*k],[sx*k,sz*k],[sx*k,0],col,rc,gl)}
  cyl(cx,y0,cz,r0,r1,h,seg,col,rc,cap,gl,uvs){const k=uvs||1;for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;const c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
    this.quad([cx+c0*r0,y0,cz+s0*r0],[cx+c0*r1,y0+h,cz+s0*r1],[cx+c1*r1,y0+h,cz+s1*r1],[cx+c1*r0,y0,cz+s1*r0],[i/seg*k*2,0],[i/seg*k*2,h*k],[(i+1)/seg*k*2,h*k],[(i+1)/seg*k*2,0],col,rc,gl);
    if(cap&&r1>0)this.tri([cx,y0+h,cz],[cx+c1*r1,y0+h,cz+s1*r1],[cx+c0*r1,y0+h,cz+s0*r1],[0.5,0.5],[0.5+c1*0.5,0.5+s1*0.5],[0.5+c0*0.5,0.5+s0*0.5],col,rc,gl)}}
  size(){return this.vc}
  build(){const n=this.vc,g=new THREE.BufferGeometry();const nor=new Int8Array(n*3),col=new Uint8Array(n*3),rc=new Uint16Array(n*4),gl=new Uint8Array(n);
    for(let i=0;i<n*3;i++){nor[i]=Math.round(clamp(this.n[i],-1,1)*127);col[i]=Math.round(clamp(this.c[i],0,1)*255)}for(let i=0;i<n*4;i++)rc[i]=Math.round(clamp(this.r[i],0,1)*65535);for(let i=0;i<n;i++)gl[i]=Math.round(clamp(this.g[i],0,1)*255);
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3,true));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
    g.setAttribute('color',new THREE.BufferAttribute(col,3,true));g.setAttribute('aRect',new THREE.BufferAttribute(rc,4,true));g.setAttribute('aGlow',new THREE.BufferAttribute(gl,1,true));
    g.setIndex(new THREE.BufferAttribute(n>65535?new Uint32Array(this.i):new Uint16Array(this.i),1));g.computeBoundingSphere();this.p=this.n=this.u=this.c=this.r=this.g=this.i=null;return g}}
const hexc=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b]};
const C1=[1,1,1];
function shade(c,f){return[c[0]*f,c[1]*f,c[2]*f]}

/* chunked world */
const CH=96, chunks=new Map();
function chunkAt(x,z){const k=Math.floor(x/CH)+','+Math.floor(z/CH);let c=chunks.get(k);if(!c){c={k,cx:(Math.floor(x/CH)+0.5)*CH,cz:(Math.floor(z/CH)+0.5)*CH,o:new GB(),cut:new GB(),sg:new GB(),meshes:[],detail:[]};chunks.set(k,c)}return c}

/* ============================== PLACEMENT REGISTRY ==============================
   Every real-world feature that a module places in the world registers itself here, so tools/verify_placement.js can
   prove that each map feature (shop, bench, bus stop, tree…) exists in the game at its real coordinates.
   placed(kind, x, z, name?, srcId?) — kind is the map feature class, e.g. 'poi','bench','bin','bus_stop','crossing','signal','tree','kiosk','fountain','lamp'. */
const PLACED=[];
function placed(kind,x,z,name,src){PLACED.push([kind,Math.round(x*10)/10,Math.round(z*10)/10,name||'',src||'']);}

/* ============================== COLLISION ============================== */
const CELL=8,grid=new Map();let stamp=0;
function addSeg(ax,az,bx,bz,kind){const s={ax,az,bx,bz,kind,s:0};const x0=Math.min(ax,bx),x1=Math.max(ax,bx),z0=Math.min(az,bz),z1=Math.max(az,bz);
  for(let gx=Math.floor(x0/CELL);gx<=Math.floor(x1/CELL);gx++)for(let gz=Math.floor(z0/CELL);gz<=Math.floor(z1/CELL);gz++){const k=gx*65536+gz;let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(s)}}
function addBoxC(x,z,r,kind){addSeg(x-r,z-r,x+r,z-r,kind);addSeg(x+r,z-r,x+r,z+r,kind);addSeg(x+r,z+r,x-r,z+r,kind);addSeg(x-r,z+r,x-r,z-r,kind)}
function collide(p,r,skip){stamp++;let hit=null;
  for(let gx=Math.floor((p.x-r)/CELL);gx<=Math.floor((p.x+r)/CELL);gx++)for(let gz=Math.floor((p.z-r)/CELL);gz<=Math.floor((p.z+r)/CELL);gz++){const a=grid.get(gx*65536+gz);if(!a)continue;
    for(const s of a){if(s.s===stamp)continue;s.s=stamp;if(skip&&skip.indexOf(s.kind)>=0)continue;const dx=s.bx-s.ax,dz=s.bz-s.az,L2=dx*dx+dz*dz||1e-9;const u=clamp(((p.x-s.ax)*dx+(p.z-s.az)*dz)/L2,0,1);
      const qx=s.ax+dx*u,qz=s.az+dz*u,ex=p.x-qx,ez=p.z-qz,d=Math.hypot(ex,ez);if(d<r){hit=s;if(d>1e-5){p.x=qx+ex/d*r;p.z=qz+ez/d*r}else{const L=Math.sqrt(L2);p.x=qx-dz/L*r;p.z=qz+dx/L*r}}}}
  return hit}
function rayHit(ax,az,bx,bz){stamp++;let best=1;const dx=bx-ax,dz=bz-az,n=Math.ceil(Math.hypot(dx,dz)/CELL)+1;
  for(let k=0;k<=n;k++){const x=ax+dx*k/n,z=az+dz*k/n;for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){const a=grid.get((Math.floor(x/CELL)+ox)*65536+Math.floor(z/CELL)+oz);if(!a)continue;
    for(const s of a){if(s.s===stamp||s.kind!=='b')continue;s.s=stamp;const ex=s.bx-s.ax,ez=s.bz-s.az,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const t=((s.ax-ax)*ez-(s.az-az)*ex)/den,u=((s.ax-ax)*dz-(s.az-az)*dx)/den;if(t>0&&t<best&&u>=0&&u<=1)best=t}}}
  return best}

/* ============================== MAP DATA ============================== */
let MAP,TER,tH,BOUNDS,LVL,lvW,lvH,mapC,focusPolys=[],playPolys=[];
const unp=(a,f)=>{const o=[];for(let i=f||0;i+1<a.length;i+=2)o.push([a[i]/10,a[i+1]/10]);return o};
function terr(x,z){const fi=(x-TER.x0)/TER.step,fj=(z-TER.z0)/TER.step;const i0=clamp(Math.floor(fi),0,TER.nx-2),j0=clamp(Math.floor(fj),0,TER.nz-2);const a=clamp(fi-i0,0,1),b=clamp(fj-j0,0,1);const n=TER.nx;
  return(tH[j0*n+i0]*(1-a)+tH[j0*n+i0+1]*a)*(1-b)+(tH[(j0+1)*n+i0]*(1-a)+tH[(j0+1)*n+i0+1]*a)*b}
function lvl(x,z){const px=Math.floor(x-BOUNDS[0]),py=Math.floor(z-BOUNDS[1]);if(px<0||py<0||px>=lvW||py>=lvH)return 0;return LVL[py*lvW+px]}
function groundY(x,z){return terr(x,z)+lvl(x,z)}
function pip(ps,x,z){let ins=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if(((a[1]>z)!==(b[1]>z))&&(x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]))ins=!ins}return ins}
const inFocus=(x,z)=>focusPolys.some(p=>pip(p,x,z));
const inPlay=(x,z)=>playPolys.some(p=>pip(p,x,z));
function polyArea(ps){let s=0;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];s+=a[0]*b[1]-b[0]*a[1]}return s/2}
function triangulate(rings){const outer=rings[0].map(p=>new THREE.Vector2(p[0],p[1]));const holes=rings.slice(1).map(h=>h.map(p=>new THREE.Vector2(p[0],p[1])));
  let tris;try{tris=THREE.ShapeUtils.triangulateShape(outer,holes)}catch(e){return[]}const all=rings[0].concat(...rings.slice(1));return tris.map(t=>[all[t[0]],all[t[1]],all[t[2]]])}
function subdiv(a,b,c,maxL,out){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);const m=Math.max(ab,bc,ca);
  if(m<=maxL||out.length>40000){out.push(a,b,c);return}if(m===ab){const p=[(a[0]+b[0])/2,(a[1]+b[1])/2];subdiv(a,p,c,maxL,out);subdiv(p,b,c,maxL,out)}else if(m===bc){const p=[(b[0]+c[0])/2,(b[1]+c[1])/2];subdiv(a,b,p,maxL,out);subdiv(a,p,c,maxL,out)}else{const p=[(c[0]+a[0])/2,(c[1]+a[1])/2];subdiv(a,b,p,maxL,out);subdiv(p,b,c,maxL,out)}}
/* lay a ground polygon on the terrain */
function groundPoly(rings,yoff,tile,scale,col,maxL,gl,fixedLvl){const tris=triangulate(rings);for(const t of tris){const out=[];subdiv(t[0],t[1],t[2],maxL||7,out);
  for(let i=0;i<out.length;i+=3){let a=out[i],b=out[i+1],c=out[i+2];const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr>0){const t2=b;b=c;c=t2}
    const ch=chunkAt((a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3).o;const Y=p=>terr(p[0],p[1])+yoff;
    ch.tri([a[0],Y(a),a[1]],[b[0],Y(b),b[1]],[c[0],Y(c),c[1]],[a[0]/scale,a[1]/scale],[b[0]/scale,b[1]/scale],[c[0]/scale,c[1]/scale],col,RECT[tile],gl||0,true)}}}

