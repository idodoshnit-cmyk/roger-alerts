'use strict';
/* Grand Kifisia — time of day: sun and moon, sky dome, haze, lights, exposure, environment map, street-lamp light map.
   The sun follows the real path for Kifisia (38.07°N) on a mid-August day in local summer time: sunrise ≈ 06:44, solar noon ≈ 13:29,
   sunset ≈ 20:14. Everything else (sky colours, light colours, fog, exposure, lamps) is keyed on the sun's elevation. See docs/MATERIALS.md. */
let tod=16.5,todRate=1/60;// game hours per real second (1 game minute per second)
const sunV=new THREE.Vector3(0.3,0.8,0.5),moonV=new THREE.Vector3(0.40,0.62,0.68).normalize(),lightV=new THREE.Vector3();
const SKY={lat:38.074*Math.PI/180,decl:14*Math.PI/180,noon:13.48,elev:45,night:0,lamps:false,envElev:-99,envNight:-9,envT:0,indoorExposure:0.8,farN:0,farX:1e9,farZ:1e9,farL:new THREE.Vector3()};
function sunDir(h,out){const H=(h-SKY.noon)*Math.PI/12,sl=Math.sin(SKY.lat),cl=Math.cos(SKY.lat);const sinE=clamp(sl*Math.sin(SKY.decl)+cl*Math.cos(SKY.decl)*Math.cos(H),-1,1),cE=Math.sqrt(1-sinE*sinE);
  const As=Math.atan2(Math.sin(H),Math.cos(H)*sl-Math.tan(SKY.decl)*cl);out.set(-Math.sin(As)*cE,sinE,Math.cos(As)*cE);return Math.asin(sinE)*180/Math.PI}
/* keyframes over the sun's elevation in degrees */
const KE=[-18,-8,-3,0,4,10,25,60];
const KEY={
  zen:[[.014,.018,.040],[.030,.050,.125],[.075,.14,.32],[.13,.24,.50],[.17,.32,.62],[.19,.37,.70],[.16,.38,.77],[.12,.35,.79]],          // display colours of the dome
  hor:[[.082,.068,.074],[.115,.12,.19],[.30,.34,.48],[.56,.58,.66],[.72,.74,.78],[.78,.80,.83],[.74,.83,.92],[.71,.82,.94]],
  horSun:[[.082,.068,.074],[.40,.22,.15],[.98,.50,.22],[1.0,.64,.30],[1.0,.80,.52],[1.0,.90,.72],[.90,.92,.94],[.84,.89,.96]],
  glow:[0,.8,1,1,.9,.6,.25,.1],
  cloud:[[.06,.065,.09],[.13,.13,.2],[.55,.36,.36],[.95,.66,.5],[1,.86,.72],[1,.96,.9],[1,1,1],[1,1,1]],
  sunI:[0,0,0,.42,1.4,2.0,2.45,2.6],sunC:[[1,.5,.22],[1,.5,.22],[1,.5,.22],[1,.50,.22],[1,.64,.38],[1,.80,.58],[1,.93,.80],[1,.97,.90]],     // lights (linear)
  hemiI:[.22,.27,.50,.68,.80,.90,.97,1.0],hemiS:[[.24,.31,.58],[.27,.34,.62],[.40,.46,.74],[.62,.62,.78],[.72,.74,.88],[.72,.80,.98],[.70,.81,1],[.69,.80,1]],
  hemiG:[[.17,.13,.10],[.18,.14,.11],[.3,.24,.2],[.5,.38,.28],[.55,.44,.33],[.52,.46,.38],[.5,.46,.40],[.5,.46,.40]],
  expo:[1.0,1.0,.95,.82,.70,.62,.54,.52],disc:[0,0,0,.9,1,1,1,1]};
const _k3=[0,0,0];
function kf(e,a){if(e<=KE[0])return a[0];for(let i=1;i<KE.length;i++)if(e<=KE[i]){const t=(e-KE[i-1])/(KE[i]-KE[i-1]);return a[i-1]+(a[i]-a[i-1])*t}return a[a.length-1]}
function kf3(e,a,out){let i=1;if(e<=KE[0]){out[0]=a[0][0];out[1]=a[0][1];out[2]=a[0][2];return out}while(i<KE.length-1&&e>KE[i])i++;const t=clamp((e-KE[i-1])/(KE[i]-KE[i-1]),0,1),p=a[i-1],q=a[i];out[0]=p[0]+(q[0]-p[0])*t;out[1]=p[1]+(q[1]-p[1])*t;out[2]=p[2]+(q[2]-p[2])*t;return out}

/* ---------- sky dome: writes display colour directly; its horizon is exactly the fog colour so that distance fades into the sky ---------- */
const SKYU={uZen:{value:new THREE.Vector3()},uHor:{value:new THREE.Vector3()},uHorSun:{value:new THREE.Vector3()},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Vector3(1,.9,.7)},uMoonDir:{value:moonV.clone()},uCloud:{value:new THREE.Vector3(1,1,1)},
  uGlow:{value:0},uStars:{value:0},uTime:{value:0},uSunVis:{value:1},uLin:{value:0},uMoon:{value:0},uCloudAmt:{value:0}};
const SKY_VS=`varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);gl_Position=p.xyww;}`;
const SKY_FS=`precision highp float;
uniform vec3 uZen,uHor,uHorSun,uSunDir,uSunCol,uMoonDir,uCloud;uniform float uGlow,uStars,uTime,uSunVis,uLin,uMoon,uCloudAmt;varying vec3 vDir;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=0.5;}return s;}
void main(){
 vec3 d=normalize(vDir);float h=d.y;
 float sg=max(dot(normalize(d.xz+vec2(1e-5)),normalize(uSunDir.xz+vec2(1e-5))),0.0);sg=sg*sg*sg*uGlow;
 vec3 hor=mix(uHor,uHorSun,sg);float hc=clamp(h,0.0,1.0);
 vec3 col=mix(uHor,uZen,pow(hc,0.45));
 float g1=sg*exp(-hc*8.0),g2=sg*(exp(-hc*3.0)-exp(-hc*8.0));
 col=mix(col,uHorSun,g1);col=mix(col,uHorSun*vec3(1.0,1.12,1.25)+vec3(0.0,0.03,0.08),g2*0.55);
 float sd=max(dot(d,uSunDir),0.0);
 col+=uSunCol*(pow(sd,6.0)*0.10+pow(sd,48.0)*0.20+pow(sd,700.0)*0.55)*uSunVis;
 if(h>0.0){
  vec2 cp=d.xz/(h+0.16);
  float c=fbm(cp*1.25+uTime*vec2(0.004,0.0015));float c2=fbm(cp*3.3-uTime*vec2(0.003,0.002)+c*1.7);
  float dens=smoothstep(0.50,0.80,c*0.62+c2*0.38+uCloudAmt)*smoothstep(0.015,0.20,h);
  vec3 cc=mix(uCloud,hor,0.22)+uSunCol*pow(sd,10.0)*0.22*uSunVis;
  if(uStars>0.01){vec2 sp=vec2(atan(d.z,d.x)*40.0,asin(clamp(h,-1.0,1.0))*64.0);vec2 ip=floor(sp),fp=fract(sp)-0.5;float r=h21(ip);
   float st=step(0.962,r)*smoothstep(0.15,0.0,length(fp+(vec2(h21(ip+3.1),h21(ip+7.7))-0.5)*0.6))*(0.35+0.65*h21(ip+1.7));
   col+=vec3(0.85,0.92,1.0)*st*uStars*smoothstep(0.03,0.30,h);}
  float md=max(dot(d,uMoonDir),0.0);col+=vec3(0.96,0.95,0.86)*(smoothstep(0.99962,0.99978,md)+pow(md,260.0)*0.10)*uMoon;
  col=mix(col,cc,dens*0.78);
 }
 col=mix(col,vec3(1.0,0.97,0.86),smoothstep(0.99972,0.99990,sd)*uSunVis);
 // far ridges of Mt Penteli (east) and Mt Parnitha (north-west) in the haze
 float az=atan(d.x,-d.z);
 float ridge=0.012+max(0.0,0.098*exp(-pow((az-1.50)/0.55,2.0))+0.085*exp(-pow((az+0.75)/0.70,2.0))+0.010*sin(az*9.0+1.0)+0.005*sin(az*23.0)+0.003*sin(az*57.0+2.0));
 float mm=smoothstep(ridge+0.0025,ridge-0.0025,h);
 col=mix(col,mix(hor*vec3(0.52,0.60,0.74),hor,0.30+0.55*smoothstep(ridge,0.0,h)),mm);
 if(h<0.0)col=hor;
 if(uLin>0.0)col=pow(col,vec3(2.2))*uLin;
 gl_FragColor=vec4(col,1.0);
}`;
const skyMat=new THREE.ShaderMaterial({uniforms:SKYU,vertexShader:SKY_VS,fragmentShader:SKY_FS,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false});
const skyDome=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),skyMat);skyDome.frustumCulled=false;skyDome.renderOrder=900;skyDome.matrixAutoUpdate=false;scene.add(skyDome);

/* ---------- environment map for reflective materials (cars): the same dome rendered into a PMREM, refreshed as the light changes ---------- */
const ENV={tex:null,rt:null,pm:null,scene:null,mats:[],u:null,ground:null};
function useEnv(mat){if(ENV.mats.indexOf(mat)<0)ENV.mats.push(mat);if(ENV.tex){mat.envMap=ENV.tex;mat.needsUpdate=true}return mat}
function skyEnv(force){if(!ENV.pm){ENV.pm=new THREE.PMREMGenerator(renderer);ENV.scene=new THREE.Scene();ENV.u={};for(const k in SKYU)ENV.u[k]=SKYU[k];ENV.u=Object.assign({},ENV.u,{uLin:{value:0.9}});
    const m=new THREE.ShaderMaterial({uniforms:ENV.u,vertexShader:SKY_VS,fragmentShader:SKY_FS,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false});const d=new THREE.Mesh(skyDome.geometry,m);d.frustumCulled=false;d.renderOrder=900;ENV.scene.add(d);
    ENV.ground=new THREE.Mesh(new THREE.CircleGeometry(60,24),new THREE.MeshBasicMaterial({color:0x222222}));ENV.ground.rotation.x=-Math.PI/2;ENV.ground.position.y=-1.2;ENV.scene.add(ENV.ground)}
  else if(!force&&ENV.tex)return ENV.tex;
  const day=clamp((SKY.elev+4)/14,0,1);ENV.ground.material.color.setRGB(0.02+0.16*day,0.02+0.155*day,0.022+0.15*day);
  const old=ENV.rt;ENV.rt=ENV.pm.fromScene(ENV.scene,0.015,0.1,200);ENV.tex=ENV.rt.texture;for(const m of ENV.mats)m.envMap=ENV.tex;if(old)old.dispose();SKY.envElev=SKY.elev;SKY.envNight=SKY.night;return ENV.tex}

/* ---------- street-lamp light map: top-down texture of lamp light (R = warm street lamps, G = white light: shop windows, floodlights) and
   terrain height (B), sampled by the world material so that every lit surface near a lamp is really lit at night ---------- */
/* addLight(x, z, radiusM, kind, strength) — register a light for the night light map while the world is being built (or later: the map is rebuilt, ~0.1 s).
   kind 0 = warm street lamp, 1 = white light (shop windows, floodlights, kiosks). If nobody registers kind-0 lights the lamps of MAP.lamps are used. */
const LIGHTS=[];function addLight(x,z,r,kind,a){LIGHTS.push([x,z,r||12,kind?1:0,a===undefined?0.85:a]);SKY.lamps=false}
function buildLampMap(){const [bx0,bz0,bx1,bz1]=BOUNDS,res=1.5,w=Math.ceil((bx1-bx0)/res),h=Math.ceil((bz1-bz0)/res);const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#000';g.fillRect(0,0,w,h);g.globalCompositeOperation='lighter';
  const blob=(x,z,r,ch,a)=>{const px=(x-bx0)/res,py=(z-bz0)/res,pr=r/res,col=ch?'0,255,0':'255,0,0';const gr=g.createRadialGradient(px,py,0,px,py,pr);gr.addColorStop(0,`rgba(${col},${a})`);gr.addColorStop(0.3,`rgba(${col},${a*0.55})`);gr.addColorStop(0.65,`rgba(${col},${a*0.16})`);gr.addColorStop(1,`rgba(${col},0)`);g.fillStyle=gr;g.fillRect(px-pr,py-pr,pr*2,pr*2)};
  for(const l of LIGHTS)blob(l[0],l[1],l[2],l[3],l[4]);
  if(!LIGHTS.some(l=>l[3]===0))for(const l of MAP.lamps){const x=l[0]/10,z=l[1]/10;if(l[2]===2){const yaw=l[3]+(l[4]>0?Math.PI:0);blob(x+Math.sin(yaw)*1.7,z+Math.cos(yaw)*1.7,17,0,0.8)}else blob(x,z,l[2]===0?12:11,0,0.85)}
  if(typeof EXTRA!=='undefined'&&EXTRA.lamp2)for(const e of EXTRA.lamp2)blob(e[0],e[1],24,1,0.8);
  if(typeof SHOPFRONTS!=='undefined')for(const s of SHOPFRONTS){const d=5.5,ax=(s.a[0]-bx0)/res,az=(s.a[1]-bz0)/res,cx=(s.c[0]-bx0)/res,cz=(s.c[1]-bz0)/res,nx=s.nx*d/res,nz=s.nz*d/res;const gr=g.createLinearGradient(ax,az,ax+nx,az+nz);gr.addColorStop(0,'rgba(0,255,0,.5)');gr.addColorStop(0.4,'rgba(0,255,0,.2)');gr.addColorStop(1,'rgba(0,255,0,0)');g.fillStyle=gr;g.beginPath();g.moveTo(ax,az);g.lineTo(cx,cz);g.lineTo(cx+nx,cz+nz);g.lineTo(ax+nx,az+nz);g.fill()}
  const im=g.getImageData(0,0,w,h),d=im.data;let h0=1e9,h1=-1e9;for(let i=0;i<tH.length;i++){if(tH[i]<h0)h0=tH[i];if(tH[i]>h1)h1=tH[i]}const hr=Math.max(1,h1-h0);
  for(let j=0,p=0;j<h;j++){const z=bz0+(j+0.5)*res;for(let i=0;i<w;i++,p+=4){d[p+2]=Math.round(clamp((terr(bx0+(i+0.5)*res,z)-h0)/hr,0,1)*255);d[p+3]=255;if(i===0||j===0||i===w-1||j===h-1)d[p]=d[p+1]=0}}// black border: nothing outside the map (interior cells) is lit by street lamps
  const t=new THREE.DataTexture(new Uint8Array(d.buffer),w,h,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;
  if(U.lamp.value)U.lamp.value.dispose();U.lamp.value=t;U.lampR.value.set(bx0,bz0,1/(w*res),1/(h*res));U.lampH.value.set(h0,hr);SKY.lamps=true}

/* ---------- per-frame update ---------- */
function worldBuilt(){for(const c of chunks.values())return c.o===null;return false}
const _lr=new THREE.Vector3(),_lu=new THREE.Vector3(),_lp=new THREE.Vector3(),_cf=new THREE.Vector3(),_UP=new THREE.Vector3(0,1,0);
/* aim a shadow-casting light at (cx,cy,cz); the centre is snapped to shadow-map texels in light space */
function placeShadow(light,half,size,cx,cy,cz){const ts=2*half/size;_lr.crossVectors(_UP,lightV).normalize();_lu.crossVectors(lightV,_lr);_lp.set(cx,cy,cz);const a=Math.round(_lp.dot(_lr)/ts)*ts,b=Math.round(_lp.dot(_lu)/ts)*ts,c=_lp.dot(lightV);
  _lp.set(_lr.x*a+_lu.x*b+lightV.x*c,_lr.y*a+_lu.y*b+lightV.y*c,_lr.z*a+_lu.z*b+lightV.z*c);light.position.set(_lp.x+lightV.x*200,_lp.y+lightV.y*200,_lp.z+lightV.z*200);light.target.position.copy(_lp);light.target.updateMatrixWorld();light.updateMatrixWorld()}
function updateSky(dt){tod=(tod+dt*todRate+24)%24;const e=SKY.elev=sunDir(tod,sunV);U.time.value+=dt;SKYU.uTime.value+=dt;
  if(!SKY.lamps&&MAP&&TER&&worldBuilt())buildLampMap();
  // dome
  SKYU.uZen.value.fromArray(kf3(e,KEY.zen,_k3));const hc=kf3(e,KEY.hor,_k3);SKYU.uHor.value.fromArray(hc);scene.fog.color.setRGB(hc[0],hc[1],hc[2]);
  const hs=kf3(e,KEY.horSun,_k3),gl=kf(e,KEY.glow);SKYU.uHorSun.value.fromArray(hs);SKYU.uGlow.value=gl;U.fogSun.value.set(hs[0],hs[1],hs[2],gl);
  const hl=Math.hypot(sunV.x,sunV.z)||1;U.sunXZ.value.set(sunV.x/hl,sunV.z/hl);SKYU.uSunDir.value.copy(sunV);
  const sc=kf3(e,KEY.sunC,_k3);SKYU.uSunCol.value.set(sc[0],sc[1]*0.95+0.05,sc[2]*0.9+0.1);SKYU.uSunVis.value=kf(e,KEY.disc);
  const night=SKY.night=clamp((2-e)/7,0,1);const deep=clamp((-4-e)/8,0,1);SKYU.uStars.value=deep*0.6;SKYU.uMoon.value=deep;SKYU.uCloud.value.fromArray(kf3(e,KEY.cloud,_k3));
  // lights: the one directional light is the sun by day and the moon at night
  const sI=kf(e,KEY.sunI),mI=0.24*deep;
  if(sI>0.001||mI<=0){lightV.copy(sunV);if(lightV.y<0.035){lightV.y=0.035;lightV.normalize()}sun.intensity=sI;sun.color.setRGB(sc[0],sc[1],sc[2])}else{lightV.copy(moonV);sun.intensity=mI;sun.color.setRGB(0.50,0.62,1.0)}
  const hsC=kf3(e,KEY.hemiS,_k3);hemi.color.setRGB(hsC[0],hsC[1],hsC[2]);const hg=kf3(e,KEY.hemiG,_k3);hemi.groundColor.setRGB(hg[0],hg[1],hg[2]);hemi.intensity=kf(e,KEY.hemiI);amb.intensity=0.07;
  renderer.toneMappingExposure=player.interior?SKY.indoorExposure:kf(e,KEY.expo);
  // night switches: window glow, lamp heads, lamp light on the ground
  U.night.value=night;U.lampC.value.setRGB(1.25,0.86,0.47);U.shopC.value.setRGB(1.0,0.90,0.74);if(poolMesh)poolMesh.material.opacity=night*0.22;
  // sky colours seen in reflections (linear)
  const z=SKYU.uZen.value,k=1.45;U.skyZ.value.setRGB(Math.pow(z.x,2.2)*k,Math.pow(z.y,2.2)*k,Math.pow(z.z,2.2)*k);U.skyH.value.setRGB(Math.pow(hc[0],2.2)*k,Math.pow(hc[1],2.2)*k,Math.pow(hc[2],2.2)*k);
  const gd=0.012+0.11*clamp((e+4)/14,0,1);U.skyG.value.setRGB(gd,gd*0.96,gd*0.9);
  // shadow boxes: a tight one around what the camera looks at (every frame) and a wide one (every few frames), both snapped to their shadow-map texels so shadows do not crawl
  if(Q.sh){const p=player.car||player,gy=(TER?terr(p.x,p.z):0)+3;camera.getWorldDirection(_cf);const fl=Math.hypot(_cf.x,_cf.z)||1,fx=_cf.x/fl,fz=_cf.z/fl,cx=camera.position.x,cz=camera.position.z;
    const n=Q.shN||55;placeShadow(sun,n,Q.sh,cx+fx*n*0.62,gy,cz+fz*n*0.62);
    if(Q.sh2&&sun2.visible){const f=Q.shF||125,tx=cx+fx*f*0.5,tz=cz+fz*f*0.5;if(--SKY.farN<=0||Math.hypot(tx-SKY.farX,tz-SKY.farZ)>f*0.14||SKY.farL.dot(lightV)<0.99985){placeShadow(sun2,f,Q.sh2,tx,gy,tz);sun2.shadow.needsUpdate=true;SKY.farN=8;SKY.farX=tx;SKY.farZ=tz;SKY.farL.copy(lightV)}}}
  else{const p=player.car||player;sun.position.set(p.x+lightV.x*200,lightV.y*200,p.z+lightV.z*200);sun.target.position.set(p.x,0,p.z);sun.target.updateMatrixWorld()}
  // refresh the reflection environment when the light has changed enough
  if(ENV.pm&&dt>0){SKY.envT-=dt;const thr=(e>-10&&e<14)?1.2:4;if(SKY.envT<=0&&(Math.abs(e-SKY.envElev)>thr||Math.abs(night-SKY.envNight)>0.1)){skyEnv(true);SKY.envT=Q===QP.low?12:4}}}
