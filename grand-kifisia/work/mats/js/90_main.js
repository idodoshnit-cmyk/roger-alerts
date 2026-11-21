'use strict';
/* Grand Kifisia — input (touch, keyboard, mouse), main loop, loading slideshow, boot sequence.
   Owners: input + main loop: game agent. boot(): shared — other agents add single lines to it. */
/* ============================== INPUT ==============================
   Touch: the half of the screen on the movement side is a floating analogue stick, everything else is drag-to-look (with inertia).
   Every touch is tracked by its identifier, so move + look + a button work at the same time. Buttons stop their own touches. */
const DEBUG=location.hash==='#debug';
const joyEl=$('joy'),knob=$('knob'),touchEl=$('touch');
const JOY={id:null,cx:0,cy:0,R:52,idle:0},LOOK={id:null,x:0,y:0,t:0,vx:0,vy:0},MOUSE={down:false,x:0,y:0,t:0};
const moveSide=(x,y)=>(SETTINGS.lefty?x>innerWidth*0.5:x<innerWidth*0.5)&&y>innerHeight*0.28;
function audioOn(){audio();if(typeof ambStart==='function')ambStart()}
function lookBy(dx,dy,ms){const k=0.0052*(SETTINGS.sens||1)*clamp(900/Math.max(innerWidth,innerHeight),0.75,1.5),ay=-dx*k,ap=dy*k*0.6*(SETTINGS.invY?-1:1);
  camYaw+=ay;camPitch=clamp(camPitch+ap,PITCH_MIN,PITCH_MAX);lastDrag=performance.now();HUDS.look+=Math.abs(ay)+Math.abs(ap);
  if(ms>0){const s=1000/Math.max(8,ms);LOOK.vx+=(ay*s-LOOK.vx)*0.5;LOOK.vy+=(ap*s-LOOK.vy)*0.5}}
function joySet(t){let dx=t.clientX-JOY.cx,dy=t.clientY-JOY.cy,d=Math.hypot(dx,dy);const R=JOY.R,lim=R*1.35;
  if(d>lim){const k=(d-lim)/d;JOY.cx+=dx*k;JOY.cy+=dy*k;joyEl.style.left=JOY.cx+'px';joyEl.style.top=JOY.cy+'px';dx=t.clientX-JOY.cx;dy=t.clientY-JOY.cy;d=lim}/* the base follows a thumb that drifts away */
  const c=Math.min(1,d/R),dz=0.14;let m=c<=dz?0:Math.pow((c-dz)/(1-dz),1.2);
  if(d>1e-3){input.jx=dx/d*m;input.jy=player.car?0:dy/d*m}else input.jx=input.jy=0;/* in a car the stick only steers; the pedals do the rest */
  const kd=Math.min(d,R);knob.style.transform=d>1e-3?`translate(${(dx/d*kd).toFixed(1)}px,${(dy/d*kd).toFixed(1)}px)`:''}
function joyEnd(){JOY.id=null;input.jx=input.jy=0;joyEl.hidden=true}
touchEl.addEventListener('touchstart',e=>{e.preventDefault();setInputMode('touch');audioOn();if(cutSkip&&HUDS.cine)return;
  for(const t of e.changedTouches){if(JOY.id===null&&moveSide(t.clientX,t.clientY)&&running&&!DLG.open){JOY.id=t.identifier;JOY.cx=t.clientX;JOY.cy=t.clientY;joyEl.style.left=JOY.cx+'px';joyEl.style.top=JOY.cy+'px';joyEl.hidden=false;knob.style.transform='';input.jx=input.jy=0}
    else if(LOOK.id===null){LOOK.id=t.identifier;LOOK.x=t.clientX;LOOK.y=t.clientY;LOOK.t=e.timeStamp;LOOK.vx=LOOK.vy=0;input.looking=true;CAMS.lvx=CAMS.lvy=0}}},{passive:false});
touchEl.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier===JOY.id)joySet(t);else if(t.identifier===LOOK.id){lookBy(t.clientX-LOOK.x,t.clientY-LOOK.y,e.timeStamp-LOOK.t);LOOK.x=t.clientX;LOOK.y=t.clientY;LOOK.t=e.timeStamp}}},{passive:false});
const touchEnd=e=>{for(const t of e.changedTouches){if(t.identifier===JOY.id)joyEnd();else if(t.identifier===LOOK.id){LOOK.id=null;input.looking=MOUSE.down;if(e.timeStamp-LOOK.t<80){CAMS.lvx=clamp(LOOK.vx,-9,9);CAMS.lvy=clamp(LOOK.vy,-4,4)}}}};
touchEl.addEventListener('touchend',touchEnd);touchEl.addEventListener('touchcancel',touchEnd);
/* mouse: hold a button and drag to look, wheel to zoom */
touchEl.addEventListener('mousedown',e=>{MOUSE.down=true;MOUSE.x=e.clientX;MOUSE.y=e.clientY;MOUSE.t=e.timeStamp;input.looking=true;CAMS.lvx=CAMS.lvy=0;audioOn();e.preventDefault()});
addEventListener('mouseup',()=>{if(MOUSE.down){MOUSE.down=false;input.looking=LOOK.id!==null}});
addEventListener('mousemove',e=>{if(!MOUSE.down)return;lookBy(e.clientX-MOUSE.x,e.clientY-MOUSE.y,0);MOUSE.x=e.clientX;MOUSE.y=e.clientY});
addEventListener('wheel',e=>{if(!running||MENU.open)return;camDist=clamp(camDist*Math.exp(e.deltaY*0.0012),2.4,8.5);e.preventDefault()},{passive:false});
addEventListener('contextmenu',e=>e.preventDefault());addEventListener('gesturestart',e=>e.preventDefault());addEventListener('dblclick',e=>e.preventDefault());
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;input.gas=input.rev=input.brake=false;if(JOY.id!==null)joyEnd()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(running)saveGame()}else last=performance.now()});
addEventListener('pagehide',()=>{if(!booting)saveGame()});
/* keyboard */
addEventListener('keydown',e=>{const c=e.code;if(e.target&&e.target.tagName==='INPUT')return;keys[c]=true;if(!e.repeat&&inputMode!=='kb'&&c!=='Escape')setInputMode('kb');
  if(c==='Space'||c==='Tab'||c.startsWith('Arrow'))e.preventDefault();if(e.repeat)return;
  if(cutSkip&&HUDS.cine&&(c==='Escape'||c==='Enter'||c==='Space')){cutSkip();return}
  if(MENU.open){if(c==='Escape'||c==='KeyM'||c==='KeyP'||c==='Tab')closeMenu();else menuKey(c);return}
  if(!$('sheet').hidden){if(c==='Escape'&&!sheetModal)closeSheet();else if(c==='Enter'){const b=$('card').querySelector('.cta');if(b)b.click()}return}
  if(!running)return;
  if(DLG.open){if(c==='Digit1'||c==='Digit2'||c==='Digit3')dlgPick(+c.slice(5)-1);else if(c==='Enter'||c==='Space'||c==='KeyE')dlgPick(0);else if(c==='Escape')dlgClose();return}
  if(c==='KeyF')carBtn();else if(c==='KeyE'||c==='Enter')use();else if(c==='KeyJ'||c==='KeyH')act();else if(c==='Space'){if(!player.car)jump()}else if(c==='KeyM')openMenu('map');else if(c==='Escape'||c==='KeyP'||c==='Tab')openMenu();
  else if(c==='KeyC'){camYaw=player.car?player.car.yaw:player.yaw;lastDrag=0}});
addEventListener('keyup',e=>{keys[e.code]=false});
/* on-screen buttons: down() on press, up() on release of the same touch */
function bind(id,down,up){const el=$(id);let tid=null;
  el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();if(tid!==null)return;tid=e.changedTouches[0].identifier;if(up!==false)el.classList.add('on');setInputMode('touch');audioOn();down()},{passive:false});
  const end=e=>{for(const t of e.changedTouches)if(t.identifier===tid){tid=null;if(up!==false)el.classList.remove('on');if(up)up()}};
  el.addEventListener('touchend',e=>{e.preventDefault();end(e)},{passive:false});el.addEventListener('touchcancel',end);
  el.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();audioOn();down();if(up){const u=()=>{up();removeEventListener('mouseup',u)};addEventListener('mouseup',u)}})}
bind('bCar',()=>carBtn());bind('bExit',()=>carBtn());bind('bJump',()=>jump());bind('bSprint',()=>{input.sprint=!input.sprint;JOY.idle=0},false);bind('bAct',()=>act());bind('bHorn',()=>act());
bind('bGas',()=>input.gas=true,()=>input.gas=false);bind('bBrake',()=>input.rev=true,()=>input.rev=false);bind('bHand',()=>input.brake=true,()=>input.brake=false);
bind('bUse',()=>use());bind('radar',()=>openMenu('map'));bind('pauseBtn',()=>openMenu());bind('skip',()=>{if(cutSkip)cutSkip()});
function carBtn(){if(!running||player.frozen||DLG.open||player.busy>0)return;if(player.car){const c=player.car;exitCar();if(!player.car)gameEvent('exitCar',{car:c})}
  else if(!player.interior){enterCar();if(player.car){STATS.cars++;input.sprint=false;gameEvent('enterCar',{car:player.car})}}}
function jump(){if(!running||DLG.open)return;if(playerJump()&&typeof ambJump==='function')ambJump()}
function act(){if(!running||player.frozen||DLG.open)return;
  if(player.car){sfx('horn');for(const p of NPCS)if(!p.static&&Math.hypot(p.x-player.x,p.z-player.z)<15)p.panic=3;gameEvent('horn',{});return}
  if(player.ball){if(typeof shootBall==='function')shootBall();return}
  if(player.busy>0||player.interior||player.air)return;
  ph.play('punch',true);STATS.punches++;setTimeout(()=>{if(ph.override==='punch')ph.stop()},550);const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);
  for(const p of NPCS){if(p.static||p.state==='down')continue;const dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);if(d<1.5&&(dx*fx+dz*fz)>0){setTimeout(()=>{p.state='down';p.timer=4;p.panic=6;p.h.play('lie');sfx('thud');gameEvent('punch',{npc:p})},180);break}}}
/* per-frame input upkeep: the sprint toggle lets go when the stick has been released for a moment */
function inputTick(dt){if(input.sprint){if(Math.hypot(input.jx,input.jy)<0.3&&!keys.KeyW&&!keys.ArrowUp){JOY.idle+=dt;if(JOY.idle>0.7)input.sprint=false}else JOY.idle=0}}

/* ============================== MAIN LOOP ==============================
   step(dt) advances the whole simulation by dt seconds (also used by scripted tests through __gk.step); frame() adds rendering. */
let last=performance.now(),frames=0,fpsT=0,fpsV=60,visT=0,booting=true,simT=0,errN=0,saveT2=0,titleShown=false;
const DBG={manual:false};
function step(dt,now){
  if(running){simT+=dt;updateSky(dt);inputTick(dt);updatePlayer(dt);updateTraffic(dt,player.x,player.z,now/1000);updatePeople(dt,player.x,player.z);updateTrain(dt);missionTick(dt);interactions();
    for(let i=0;i<FRAME_HOOKS.length;i++)FRAME_HOOKS[i](dt);if(typeof ambienceTick==='function')ambienceTick(dt);saveT2+=dt;if(saveT2>15){saveT2=0;saveGame()}}
  else if(booting&&MAP)updateSky(0);
  if(running||freeCam)updateCamera(dt);flushCars();
  visT-=dt;if(visT<=0){visT=0.35;updateChunkVis(camera.position.x,camera.position.z);updateLenses(now/1000);updateLOD()}
  hudUpdate(dt)}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,Math.max(0,(now-last)/1000));last=now;
  if(!DBG.manual){try{step(dt,now)}catch(e){if(errN++<8)console.error(e&&e.stack||e)}}
  if(!titleShown&&!$('play').hidden){titleShown=true;titleReady()}
  if(MENU.open&&!MENU.title&&MENU.drawn++>2)return;/* the pause menu covers the screen: stop drawing the world (saves the battery) */
  renderer.render(scene,camera);if(typeof postFX==='function')postFX();// mats: bloom + vignette (82_sky.js)
  frames++;fpsT+=dt;if(fpsT>=1){fpsV=frames/fpsT;frames=0;fpsT=0;if(SETTINGS.fps)$('fps').textContent=Math.round(fpsV)+' fps · '+pixelRatio.toFixed(2)+'x · '+renderer.info.render.calls+' draws · '+Math.round(renderer.info.render.triangles/1000)+'k tris';
    /* adaptive resolution keeps it smooth */
    if(SETTINGS.q==='auto'&&running){const mx=Math.min(window.devicePixelRatio||1,1.5);if(fpsV<(Q.fpsLo||40)&&pixelRatio>(Q.prMin||0.6)){pixelRatio=Math.max(Q.prMin||0.6,pixelRatio-0.1);renderer.setPixelRatio(pixelRatio);resize()}else if(fpsV>57&&pixelRatio<mx){pixelRatio=Math.min(mx,pixelRatio+0.05);renderer.setPixelRatio(pixelRatio);resize()}}}}
addEventListener('resize',()=>{radarResize();if(MENU.open&&MENU.tab==='map'){bigMapResize();bigMapDraw()}});

/* loading-screen slideshow with real Kifisia photos */
(function(){const caps=['Platanos Square','Kifisia ISAP station','Kassaveti Street','Kolokotroni Street','Kifisia from above','Line 1 platforms'];
  const tips=['Kassaveti and Levidou are two of the oldest shopping streets in the northern suburbs of Athens.','Line 1 (ΗΣΑΠ) starts at Kifisia. Neratziotissa, a few stops south, is the stop for The Mall Athens.','Yellow taxis wait at Platanos Square, next to the old plane tree.','Mythos Plus on Kassaveti has been serving gyros in Kifisia since 2003.','Gold beams mark missions. Tap the radar for the full map, your missions and the settings.','Tap anywhere on the map to set a GPS waypoint — the route follows the real streets.'];
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
  await tick();setLoad(0.08,'Loading the stone, plaster and asphalt of Kifisia…');await initMaterials(p=>setLoad(0.08+0.1*p));paintChar();// mats: photo texture array + world materials (10_atlas.js)
  signTex=new THREE.CanvasTexture(signC);signTex.encoding=THREE.sRGBEncoding;signTex.anisotropy=4;MAT.signs=atlasMat(signTex,false);
  const chT=new THREE.CanvasTexture(chC);chT.encoding=THREE.sRGBEncoding;charMat=new THREE.MeshLambertMaterial({map:chT,vertexColors:true,side:THREE.DoubleSide});
  updateSky(0);const env=skyEnv();// mats: reflection environment rendered from the sky (82_sky.js); useEnv(material) keeps a material's envMap in sync with the time of day
  carMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.38,metalness:0.25,envMap:env,envMapIntensity:0.9,side:THREE.DoubleSide});useEnv(carMat);
  await tick();setLoad(0.18,'Shaping the hills of Kifisia…');buildTerrain();buildRail();buildLevelGrid();
  await tick();setLoad(0.28,'Laying asphalt, pavers and marble…');buildRoads();buildAreas();
  await tick();setLoad(0.45,`Building ${MAP.buildings.length} buildings…`);if(typeof bldLoad==='function')await bldLoad();/* buildings: loads data/shops.json + census.json */buildBuildings();
  if(typeof buildInteriors==='function')buildInteriors();/* interiors (35_interiors.js): every shop door becomes enterable; rooms are built lazily on entry */
  await tick();setLoad(0.6,'Garden walls, railings and hedges…');measureShopDepths();buildWalls();buildForecourts();buildISA();buildPlatform();buildFurniture();
  await tick();setLoad(0.7,'Planting plane trees, pines and cypresses…');plantTrees();buildProps();
  await tick();setLoad(0.8,'Uploading to the graphics card…');{const im=sgx.getImageData(0,0,SG,SG),d=im.data;for(let i=3;i<d.length;i+=4)if(d[i]===255)d[i]=128;sgx.putImageData(im,0,0)}signTex.needsUpdate=true;finalize();buildMapCanvas();
  await tick();setLoad(0.88,'Parking cars, starting the trains…');makeClips();initCars();buildTrain();
  const tcol=['#d9d9d9','#1e1e1e','#7a0f16','#284b7a','#5b6b5e','#e8e2d4','#3a3f47','#8d99ae','#ffffff','#9aa0a6','#2f4f6f','#b8b0a0'];const types=['hatch','hatch','hatch','sedan','suv','hatch','sedan'];
  const P=MAP.key.platanos;MAP.parked.forEach((p,i)=>{const x=p[0]/10,z=p[1]/10;const nearPl=Math.hypot(x-P[0],z-P[1])<45;const ty=nearPl&&i%2===0?'taxi':(hf(i*7)<0.04?'van':types[i%types.length]);addCar(ty,x,z,p[2]===undefined?0:Math.PI/2-p[2],ty==='taxi'?'#f2c200':(ty==='van'?'#f2f2f0':tcol[i%tcol.length]),'parked')});
  for(const t in carMeshes)if(carMeshes[t].n)carMeshes[t].cdirty=true;/* data: skip car types with no instance (instanceColor is null) */
  await tick();setLoad(0.94,'Filling the streets with people…');
  setLoad(0.95,'Bringing the people of Kifisia to life…');try{await loadReal()}catch(e){console.warn('realistic people unavailable',e)}
  ph=new Ped({fem:false,skin:'#d9a47c',hair:'#2c1d14',hairStyle:'short',shirt:'#ffffff',pants:'#2b3445',shoes:'#f2f2f2',sleeves:'short',face:1,height:1.0,build:1.0,beard:true,cap:false},true);
  respawn();{const m=SPECIAL.mythos;player.yaw=Math.atan2(m.x-player.x,m.z-player.z);camYaw=player.yaw}
  spawnPeople(player.x,player.z);for(let k=0;k<16;k++){const c=addCar(k%3===0?'taxi':pick(['hatch','sedan','suv','hatch']),0,0,0,k%3===0?'#f2c200':pick(tcol),'traffic');if(c){c.cruise=R(7,10.5);c.vf=c.cruise;placeTraffic(c,player.x,player.z,25,220)}}
  for(const t in carMeshes)if(carMeshes[t].n)carMeshes[t].cdirty=true;/* data: skip car types with no instance (instanceColor is null) */flushCars();
  TRAIN.state='away';TRAIN.next=20;placeTrain();applyQuality();updateSky(0);updateChunkVis(player.x,player.z);titleCam();
  setLoad(1,'Kifisia is ready.');$('play').hidden=false;$('loadRow').hidden=true;
}catch(err){console.error(err);$('loadTxt').textContent='Could not load Kifisia: '+err.message}}
/* debug hook for the test harness (page opened with #debug) */
if(DEBUG)window.__gk={REAL,RealHuman,POSES,player,camera,scene,renderer,get mission(){return mission},startMission,SPECIAL:()=>SPECIAL,STATION,MAP:()=>MAP,setTod:v=>tod=v,setFree:f=>freeCam=f,terr,groundY,TRAIN,ISA,NPCS,CARS,use:()=>use(),useTarget:()=>useTarget,
  input,keys,SAVE,STATS,GPS,HUDS,DLG,MENU,CAMS,MISSIONS,DBG,INTER,step:(dt,n)=>{for(let i=0;i<(n||1);i++)step(dt,performance.now())},get running(){return running},set running(v){running=v},get tod(){return tod},get camYaw(){return camYaw},set camYaw(v){camYaw=v},
  route,setWaypoint,clearWaypoint,say,dlgPick,openMenu,closeMenu,menuTab,openShop,placePlayer,startGame,opening:()=>openingCinematic(),act:()=>act(),jump:()=>jump(),carBtn:()=>carBtn(),failMission,retryMission,quitMission,missionNext,gameEvent,castNpc:typeof castNpc==='function'?castNpc:null};
resize();requestAnimationFrame(frame);boot();
