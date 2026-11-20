'use strict';
/* Grand Kifisia — input, main loop, loading slideshow, boot sequence */
/* ============================== INPUT ============================== */
const joyEl=$('joy'),knob=$('knob'),zone=$('joyZone');let joyId=null,jcx=0,jcy=0,dragId=null,dx0=0,dy0=0;
zone.addEventListener('touchstart',e=>{const t=e.changedTouches[0];joyId=t.identifier;jcx=t.clientX;jcy=t.clientY;joyEl.style.left=jcx+'px';joyEl.style.top=jcy+'px';joyEl.hidden=false;knob.style.transform='';e.preventDefault()},{passive:false});
zone.addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier!==joyId)continue;let dx=t.clientX-jcx,dy=t.clientY-jcy;const d=Math.hypot(dx,dy),mx=60;if(d>mx){dx=dx/d*mx;dy=dy/d*mx}input.jx=dx/mx;input.jy=dy/mx;knob.style.transform=`translate(${dx}px,${dy}px)`}e.preventDefault()},{passive:false});
const jEnd=e=>{for(const t of e.changedTouches){if(t.identifier===joyId){joyId=null;input.jx=input.jy=0;joyEl.hidden=true}}};zone.addEventListener('touchend',jEnd);zone.addEventListener('touchcancel',jEnd);
canvas.addEventListener('touchstart',e=>{for(const t of e.changedTouches){if(dragId===null){dragId=t.identifier;dx0=t.clientX;dy0=t.clientY}}},{passive:true});
canvas.addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===dragId){camYaw-=(t.clientX-dx0)*0.007;camPitch=clamp(camPitch+(t.clientY-dy0)*0.004,-0.15,1.05);dx0=t.clientX;dy0=t.clientY;lastDrag=performance.now()}}e.preventDefault()},{passive:false});
canvas.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===dragId)dragId=null});
let md=false;canvas.addEventListener('mousedown',e=>{md=true;dx0=e.clientX;dy0=e.clientY});addEventListener('mouseup',()=>md=false);
addEventListener('mousemove',e=>{if(!md)return;camYaw-=(e.clientX-dx0)*0.005;camPitch=clamp(camPitch+(e.clientY-dy0)*0.003,-0.15,1.05);dx0=e.clientX;dy0=e.clientY;lastDrag=performance.now()});
addEventListener('keydown',e=>{keys[e.code]=true;if(!running)return;if(e.code==='KeyF')carBtn();if(e.code==='KeyE')use();if(e.code==='KeyJ')act();if(e.code==='Space'){jump();e.preventDefault()}if(e.code==='KeyM')openMap();if(e.code==='Escape')openPause()});
addEventListener('keyup',e=>{keys[e.code]=false});
function bind(id,down,up){const el=$(id);el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();el.classList.add('on');audio();down()},{passive:false});el.addEventListener('touchend',e=>{e.preventDefault();el.classList.remove('on');if(up)up()},{passive:false});
  el.addEventListener('mousedown',e=>{e.preventDefault();audio();down();const u=()=>{if(up)up();removeEventListener('mouseup',u)};addEventListener('mouseup',u)})}
bind('bCar',()=>carBtn());bind('bJump',()=>{if(player.car)input.brake=true;else jump()},()=>input.brake=false);bind('bSprint',()=>input.sprint=true,()=>input.sprint=false);bind('bAct',()=>act());bind('bMap',()=>openMap());bind('bUse',()=>use());
$('pauseBtn').onclick=openPause;$('mapClose').onclick=closeSheet;$('bigmap').addEventListener('click',e=>{if(e.target.id==='bigmap')closeSheet()});
function carBtn(){if(!running)return;if(player.car)exitCar();else enterCar()}
function jump(){if(!running||player.car||player.busy>0||player.air)return;player.vy=5.2;player.air=true}
function act(){if(!running)return;if(player.car){sfx('horn');for(const p of NPCS)if(!p.static&&Math.hypot(p.x-player.x,p.z-player.z)<15)p.panic=3;return}if(player.ball){if(useTarget&&/Shoot|Release/.test(useTarget.label))shoot();return}
  ph.play('punch',true);setTimeout(()=>{if(ph.override==='punch')ph.stop()},550);const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);
  for(const p of NPCS){if(p.static||p.state==='down')continue;const dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);if(d<1.5&&(dx*fx+dz*fz)>0){setTimeout(()=>{p.state='down';p.timer=4;p.panic=6;p.h.play('lie');sfx('thud')},180);break}}}

/* ============================== MAIN LOOP ============================== */
let last=performance.now(),acc=0,frames=0,fpsT=0,fpsV=60,ftEMA=16,visT=0,hudT=0,clockT=0,booting=true;
function frame(now){const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(running){updateSky(dt);updatePlayer(dt);updateTraffic(dt,player.x,player.z,now/1000);updatePeople(dt,player.x,player.z);updateTrain(dt);missionTick(dt);interactions()}
  else if(booting&&MAP){updateSky(dt*0)}
  if(running||freeCam)updateCamera(dt);flushCars();
  visT-=dt;if(visT<=0){visT=0.35;updateChunkVis(camera.position.x,camera.position.z);updateLenses(now/1000);updateLOD()}
  if(subT>0){subT-=dt;if(subT<=0)$('sub').style.opacity=0}if(banT>0){banT-=dt;if(banT<=0)$('banner').style.opacity=0}
  if(running){hudT-=dt;drawMinimap();if(cashT>0)cashT-=dt;if(hudT<=0){hudT=0.25;if(cashT<=0)$('money').textContent='€'+player.money.toFixed(2);const h=Math.floor(tod),m=Math.floor((tod%1)*60);$('clock').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');$('street').textContent=streetName();
    $('bCar').textContent=player.car?'Exit':'Car';$('bCar').style.opacity=player.car||nearestCar()?1:0.45;$('bAct').textContent=player.car?'Horn':(player.ball?'Shoot':'Punch');$('bJump').textContent=player.car?'Brake':'Jump';$('bSprint').style.visibility=player.car?'hidden':'visible'}}
  renderer.render(scene,camera);
  // adaptive resolution keeps it smooth
  const ft=performance.now()-now;ftEMA=ftEMA*0.95+(dt*1000)*0.05;frames++;fpsT+=dt;if(fpsT>=1){fpsV=frames/fpsT;frames=0;fpsT=0;if(SETTINGS.fps)$('fps').textContent=Math.round(fpsV)+' fps · '+pixelRatio.toFixed(2)+'x · '+renderer.info.render.calls+' draws';
    if(SETTINGS.q==='auto'&&running){if(fpsV<40&&pixelRatio>0.6){pixelRatio=Math.max(0.6,pixelRatio-0.1);renderer.setPixelRatio(pixelRatio);resize()}else if(fpsV>57&&pixelRatio<Math.min(window.devicePixelRatio||1,1.5)){pixelRatio=Math.min(Math.min(window.devicePixelRatio||1,1.5),pixelRatio+0.05);renderer.setPixelRatio(pixelRatio);resize()}}}
  requestAnimationFrame(frame)}

/* loading-screen slideshow with real Kifisia photos */
(function(){const caps=['Platanos Square','Kifisia ISAP station','Kassaveti Street','Kolokotroni Street','Kifisia from above','Line 1 platforms'];
  const tips=['Kassaveti and Levidou are two of the oldest shopping streets in the northern suburbs of Athens.','Line 1 (ΗΣΑΠ) starts at Kifisia. Neratziotissa, a few stops south, is the stop for The Mall Athens.','Yellow taxis wait at Platanos Square, next to the old plane tree.','Mythos Plus on Kassaveti has been serving gyros in Kifisia since 2003.','Walk into a yellow marker to start a mission. Pause to change graphics quality.'];
  const box=$('slides');caps.forEach((c,i)=>{const d=document.createElement('div');d.className='sl'+(i===0?' on':'');d.style.backgroundImage=`url(photos/k${i}.jpg)`;d.style.animationDelay=(-i*3)+'s';box.appendChild(d)});
  let i=0;const iv=setInterval(()=>{if($('start').hidden){clearInterval(iv);return}const s=box.children;s[i].classList.remove('on');i=(i+1)%s.length;s[i].classList.add('on');$('slideCap').textContent=caps[i];$('tip').textContent=tips[i%tips.length]},5200)})();
/* title fly-over */
function titleCam(){let t=0;freeCam=(dt)=>{t+=dt*0.04;const P=MAP.key.platanos;const r=95;const x=P[0]+60+Math.cos(t)*r,z=P[1]+Math.sin(t)*r;camera.position.set(x,terr(x,z)+42,z);camera.lookAt(P[0]+60,terr(P[0],P[1])+4,P[1])}}

/* ============================== BOOT ============================== */
async function boot(){try{
  setLoad(0.04,'Loading the map of Kifisia…');const res=await fetch('kifisia_map.json');if(!res.ok)throw new Error('map '+res.status);MAP=await res.json();
  TER=MAP.terrain;tH=new Float32Array(TER.h.length);for(let i=0;i<tH.length;i++)tH[i]=TER.h[i]/100;BOUNDS=MAP.bounds;focusPolys=MAP.focus.map(r=>unp(r));playPolys=MAP.playable.map(r=>unp(r));
  ROADS=MAP.roads.map(r=>{const ps=unp(r,8);const o={ty:r[0],name:MAP.names[r[1]]||'',ow:r[2],w:r[3],surf:r[4],side:r[5],sw:r[6],focus:r[7],ps};o.cum=cumlen(ps);o.L=o.cum[o.cum.length-1];o.k0=r[8]+','+r[9];o.k1=r[r.length-2]+','+r[r.length-1];return o});
  ROADS.forEach((r,i)=>{for(const [k,end] of[[r.k0,0],[r.k1,1]]){let a=ROADNODES.get(k);if(!a)ROADNODES.set(k,a=[]);a.push({ri:i,end})}});
  SPECIAL=MAP.special;ISA.poly=unp(MAP.isa.poly);
  await tick();setLoad(0.1,'Painting streets, walls and windows…');paintAtlas();paintChar();
  atlasTex=new THREE.CanvasTexture(atlasC);atlasTex.encoding=THREE.sRGBEncoding;atlasTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());atlasTex.generateMipmaps=true;atlasTex.minFilter=THREE.LinearMipmapLinearFilter;
  signTex=new THREE.CanvasTexture(signC);signTex.encoding=THREE.sRGBEncoding;signTex.anisotropy=4;
  MAT.atlas=atlasMat(atlasTex,false);MAT.cut=atlasMat(atlasTex,true);MAT.leaf=atlasMat(atlasTex,true);MAT.leaf.customProgramCacheKey=()=>'atlasLeaf';MAT.signs=atlasMat(signTex,false);
  const chT=new THREE.CanvasTexture(chC);chT.encoding=THREE.sRGBEncoding;charMat=new THREE.MeshLambertMaterial({map:chT,vertexColors:true,side:THREE.DoubleSide});
  const pm=new THREE.PMREMGenerator(renderer);const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x9fb4c8);const eg=new THREE.Mesh(new THREE.SphereGeometry(10,16,8),new THREE.MeshBasicMaterial({color:0x5a5550,side:THREE.BackSide}));eg.scale.y=0.5;eg.position.y=-5;envScene.add(eg);const env=pm.fromScene(envScene,0.04).texture;
  carMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.38,metalness:0.25,envMap:env,envMapIntensity:0.9,side:THREE.DoubleSide});
  await tick();setLoad(0.18,'Shaping the hills of Kifisia…');buildTerrain();buildRail();buildLevelGrid();
  await tick();setLoad(0.28,'Laying asphalt, pavers and marble…');buildRoads();buildAreas();
  await tick();setLoad(0.45,`Building ${MAP.buildings.length} buildings…`);buildBuildings();
  await tick();setLoad(0.6,'Garden walls, railings and hedges…');measureShopDepths();buildWalls();buildForecourts();buildISA();buildPlatform();buildFurniture();
  await tick();setLoad(0.7,'Planting plane trees, pines and cypresses…');plantTrees();buildProps();
  await tick();setLoad(0.8,'Uploading to the graphics card…');{const im=sgx.getImageData(0,0,SG,SG),d=im.data;for(let i=3;i<d.length;i+=4)if(d[i]===255)d[i]=128;sgx.putImageData(im,0,0)}signTex.needsUpdate=true;finalize();buildMapCanvas();
  await tick();setLoad(0.88,'Parking cars, starting the trains…');makeClips();initCars();buildTrain();
  const tcol=['#d9d9d9','#1e1e1e','#7a0f16','#284b7a','#5b6b5e','#e8e2d4','#3a3f47','#8d99ae','#ffffff','#9aa0a6','#2f4f6f','#b8b0a0'];const types=['hatch','hatch','hatch','sedan','suv','hatch','sedan'];
  const P=MAP.key.platanos;MAP.parked.forEach((p,i)=>{const x=p[0]/10,z=p[1]/10;const nearPl=Math.hypot(x-P[0],z-P[1])<45;const ty=nearPl&&i%2===0?'taxi':(hf(i*7)<0.04?'van':types[i%types.length]);addCar(ty,x,z,p[2]===undefined?0:Math.PI/2-p[2],ty==='taxi'?'#f2c200':(ty==='van'?'#f2f2f0':tcol[i%tcol.length]),'parked')});
  for(const t in carMeshes)carMeshes[t].cdirty=true;
  await tick();setLoad(0.94,'Filling the streets with people…');
  setLoad(0.95,'Bringing the people of Kifisia to life…');try{await loadReal()}catch(e){console.warn('realistic people unavailable',e)}
  ph=new Ped({fem:false,skin:'#d9a47c',hair:'#2c1d14',hairStyle:'short',shirt:'#ffffff',pants:'#2b3445',shoes:'#f2f2f2',sleeves:'short',face:1,height:1.0,build:1.0,beard:true,cap:false},true);
  respawn();{const m=SPECIAL.mythos;player.yaw=Math.atan2(m.x-player.x,m.z-player.z);camYaw=player.yaw}
  spawnPeople(player.x,player.z);for(let k=0;k<16;k++){const c=addCar(k%3===0?'taxi':pick(['hatch','sedan','suv','hatch']),0,0,0,k%3===0?'#f2c200':pick(tcol),'traffic');if(c){c.cruise=R(7,10.5);c.vf=c.cruise;placeTraffic(c,player.x,player.z,25,220)}}
  for(const t in carMeshes)carMeshes[t].cdirty=true;flushCars();
  TRAIN.state='away';TRAIN.next=20;placeTrain();applyQuality();updateSky(0);updateChunkVis(player.x,player.z);titleCam();
  setLoad(1,'Kifisia is ready.');$('play').hidden=false;$('loadRow').hidden=true;
}catch(err){console.error(err);$('loadTxt').textContent='Could not load Kifisia: '+err.message}}
$('play').onclick=()=>{audio();$('start').hidden=true;freeCam=null;running=true;booting=false;last=performance.now();lastMarker=performance.now()+6000;$('money').textContent='€'+player.money.toFixed(2);['mm','topr','pauseBtn','btns','joyZone'].forEach(id=>$(id).hidden=false);$('fps').hidden=!SETTINGS.fps;
  camera.position.set(player.x-Math.sin(camYaw)*5,player.y+3,player.z-Math.cos(camYaw)*5);subtitle('Welcome to Kifisia. Yellow markers start missions — or open the pause menu.',4.5);
  try{if(matchMedia('(pointer:coarse)').matches&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}};
if(location.hash==='#debug')window.__gk={REAL,RealHuman,POSES,player,camera,scene,renderer,get mission(){return mission},startMission,SPECIAL:()=>SPECIAL,STATION,MAP:()=>MAP,setTod:v=>tod=v,setFree:f=>freeCam=f,terr,groundY,TRAIN,ISA,NPCS,CARS,use:()=>use(),useTarget:()=>useTarget};
resize();requestAnimationFrame(frame);boot();
