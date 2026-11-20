'use strict';
/* Grand Kifisia — HUD: radar with GPS route, cash, health, clock, street/district, objective, timer, gauges, subtitles with speaker,
   toasts, banner, objective pointer, cinematic bars, onboarding hints. Public functions are listed in docs/GAMEPLAY.md. */
let running=false;// true while the simulation runs (false in menus, shop sheets and on the title screen)
let inputMode=(('ontouchstart' in window)||(window.matchMedia&&matchMedia('(pointer:coarse)').matches))?'touch':'kb';
function setInputMode(m){if(m===inputMode)return;inputMode=m;document.body.classList.toggle('touch',m==='touch');document.body.classList.toggle('kb',m!=='touch');HUDS.onbKey=''}
const HUDS={sub:0,ban:0,cash:null,shown:-1,tick:0,last:{},view:58,toasts:[],hurt:0,onb:null,onbT:0,onbKey:'',onbShown:0,look:0,uses:0,mapOpened:0,gauge:null,timer:null,cine:false,street:'',wptOn:false};
const _hv=new THREE.Vector3();
const money2=v=>'€'+(Math.round(v*100)/100).toFixed(2);
function setTxt(id,t){if(HUDS.last[id]!==t){HUDS.last[id]=t;$(id).textContent=t}}

/* ---------- text feedback ---------- */
function subtitle(t,s,who){if(!t){$('sub').classList.remove('on');HUDS.sub=0;return}$('subWho').textContent=who?who:'';$('subWho').hidden=!who;$('subTxt').textContent=t;$('sub').classList.add('on');HUDS.sub=s||3}
function banner(t,s,fail,extra){const e=$('banner');e.querySelector('.t').textContent=t;e.querySelector('.s').textContent=s||'';const r=e.querySelector('.r');r.textContent=extra||'';r.hidden=!extra;e.classList.toggle('fail',!!fail);e.classList.remove('on');void e.offsetWidth;e.classList.add('on');HUDS.ban=fail?3.4:4.2;
  if(typeof stinger==='function'&&AC)stinger(fail?'fail':'pass');else sfx(fail?'fail':'pass')}
function objective(html,timer){const e=$('obj');if(!html){$('objBox').hidden=true;HUDS.last.obj='';return}$('objBox').hidden=false;if(HUDS.last.obj!==html){const was=HUDS.last.obj;HUDS.last.obj=html;e.innerHTML=html;e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');if(was!==undefined&&typeof stinger==='function'&&running)stinger('obj')}
  if(timer!==undefined)hudTimer(timer)}
/* mm:ss countdown under the objective; pass null to hide */
function hudTimer(secs,warnAt){const e=$('objTimer');if(secs==null){e.hidden=true;HUDS.timer=null;return}e.hidden=false;const s=Math.max(0,Math.ceil(secs));const t=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');if(HUDS.timer!==t){HUDS.timer=t;e.textContent=t}e.classList.toggle('warn',secs<=(warnAt==null?20:warnAt))}
/* labelled bar under the objective (car condition, noise…); v = 0..1; pass null to hide */
function hudGauge(label,v,col){const e=$('gauge');if(label==null){e.hidden=true;return}e.hidden=false;setTxt('gaugeLbl',label);$('gaugeFill').style.width=Math.round(clamp(v,0,1)*100)+'%';$('gaugeFill').style.background=col||'';}
function hudDetect(v){const e=$('detect');if(v==null||v<=0){e.hidden=true;return}e.hidden=false;$('detectFill').style.width=Math.round(clamp(v,0,1)*100)+'%';e.classList.toggle('hot',v>0.6)}
function toast(text,icon){const box=$('toasts');const el=document.createElement('div');el.className='toast';el.innerHTML=`<i class="ti ${icon||'info'}"></i><span></span>`;el.lastChild.textContent=text;box.appendChild(el);HUDS.toasts.push({el,t:3.6});while(HUDS.toasts.length>3){const o=HUDS.toasts.shift();o.el.remove()}requestAnimationFrame(()=>el.classList.add('on'))}
/* ---------- money ---------- */
function addMoney(delta,label){delta=Math.round(delta*100)/100;if(!delta)return;const from=HUDS.shown<0?player.money:HUDS.shown;player.money=Math.max(0,Math.round((player.money+delta)*100)/100);if(delta>0)STATS.earned+=delta;else STATS.spent-=delta;
  HUDS.cash={from,to:player.money,t:0,dur:clamp(Math.abs(delta)*0.035,0.45,1.5),tick:0};const d=$('cashDelta');d.textContent=(delta>0?'+':'−')+money2(Math.abs(delta)).slice(0)+(label?'  '+label:'');d.className=delta>0?'plus':'minus';void d.offsetWidth;d.classList.add('on');$('money').classList.toggle('up',delta>0);$('money').classList.toggle('down',delta<0);
  if(typeof saveGame==='function')saveGame()}
/* pay for something; returns false (and tells the player) when there is not enough money */
function spend(amount,label){if(player.money+1e-6<amount){subtitle('Not enough money — you need '+money2(amount)+'.',2.2);if(typeof uiSound==='function')uiSound('no');return false}addMoney(-amount,label);sfx('buy');return true}
function cashFlash(a,b){HUDS.cash={from:a,to:b,t:0,dur:1.2,tick:0}}
function hudHurt(n){HUDS.hurt=Math.min(1,HUDS.hurt+n/40+0.25);if(SETTINGS.haptics&&navigator.vibrate){try{navigator.vibrate(Math.min(120,20+n*3))}catch(e){}}}
/* ---------- cinematic bars (cut-scenes, mission intros) ---------- */
function cinema(on,title,sub){HUDS.cine=!!on;document.body.classList.toggle('cine',!!on);$('cineT').textContent=title||'';$('cineS').textContent=sub||''}
function hudShow(on){$('hud').hidden=!on}

/* ---------- radar ---------- */
const RAD={c:$('mmc'),g:null,px:0,d:1};
function radarResize(){const css=$('radar').clientWidth||118;RAD.d=Math.min(2,window.devicePixelRatio||1);const px=Math.round(css*RAD.d);if(px!==RAD.px){RAD.px=px;RAD.c.width=RAD.c.height=px}RAD.g=RAD.c.getContext('2d')}
function drawMinimap(){if(!RAD.g||!MAPV.ready)return;const g=RAD.g,W=RAD.px,p=player.car||player,d=RAD.d;
  const want=player.interior?26:player.car?lerp(72,120,clamp(Math.abs(player.car.vf||0)/26,0,1)):58;HUDS.view+=(want-HUDS.view)*0.04;const R=HUDS.view,pxm=W/2/R,cx=W/2,cy=W*0.57,phi=camYaw+Math.PI,co=Math.cos(phi),si=Math.sin(phi);
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#161b22';g.fillRect(0,0,W,W);
  const tile=radarTile(p.x,p.z);g.translate(cx,cy);g.rotate(phi);g.scale(pxm,pxm);g.translate(-p.x,-p.z);
  if(!player.interior){g.imageSmoothingQuality='high';g.drawImage(tile,MAPV.tcx-TILE_SPAN/2,MAPV.tcz-TILE_SPAN/2,TILE_SPAN,TILE_SPAN)}
  if(GPS.pts&&GPS.dest&&!player.interior)gpsStroke(g,pxm,gpsColor(),3.4*d);
  g.setTransform(1,0,0,1,0,0);
  const edge=9*d,blip=(x,z,pin)=>{const rx=x-p.x,rz=z-p.z;let sx=(rx*co-rz*si)*pxm,sy=(rx*si+rz*co)*pxm;let X=cx+sx,Y=cy+sy;const out=X<edge||X>W-edge||Y<edge||Y>W-edge;if(out){if(!pin)return null;/* clamp along the ray from the centre to the frame */
      const kx=sx>0?(W-edge-cx)/sx:sx<0?(edge-cx)/sx:1e9,ky=sy>0?(W-edge-cy)/sy:sy<0?(edge-cy)/sy:1e9,k=Math.min(kx,ky);X=cx+sx*k;Y=cy+sy*k}_bl[0]=X;_bl[1]=Y;_bl[2]=out;return _bl};
  /* places worth knowing about */
  for(let i=0;i<PLACES.length;i++){const P=PLACES[i];if(P.minor)continue;const q=blip(P.x,P.z,false);if(q){const st=CATSTYLE[P.cat]||CATSTYLE.other;mapBadge(g,q[0],q[1],6.5*d,st[0],st[1])}}
  for(let i=0;i<POIS.length;i++){const P=POIS[i];if(!P.special)continue;const q=blip(P.x,P.z,false);if(q){const st=CATSTYLE[P.cat]||CATSTYLE.other;mapBadge(g,q[0],q[1],6.5*d,st[0],st[1])}}
  if(typeof MISSIONS!=='undefined'){if(!mission){let n=0;for(const m of missionsByDistance()){if(m.hidden&&m.hidden())continue;const a=m.at();const q=blip(a.x,a.z,n<3);if(q)mapBadge(g,q[0],q[1],(q[2]?7:8.5)*d,SAVE.done[m.id]?'#8fa08f':'#ffc832',null,m.icon);n++}}
    else{if(mission.blips)for(const b of mission.blips()){const q=blip(b.x,b.z,!!b.pin);if(q){g.fillStyle='rgba(8,11,16,.9)';g.beginPath();g.arc(q[0],q[1],5.5*d,0,TAU);g.fill();g.fillStyle=b.col||'#ff4d3d';g.beginPath();g.arc(q[0],q[1],4*d,0,TAU);g.fill()}}}}
  const D=GPS.dest;if(D){const q=blip(D.x,D.z,true);if(q){const s=(q[2]?5.5:7)*d,pulse=1+Math.sin(performance.now()/260)*0.12;g.save();g.translate(q[0],q[1]);g.rotate(Math.PI/4);g.fillStyle='rgba(8,11,16,.95)';g.fillRect(-s*pulse-1.5*d,-s*pulse-1.5*d,(s*pulse+1.5*d)*2,(s*pulse+1.5*d)*2);g.fillStyle=gpsColor();g.fillRect(-s*pulse,-s*pulse,s*pulse*2,s*pulse*2);g.restore()}}
  /* north */
  {const k=Math.min((W/2-10*d)/Math.max(1e-3,Math.abs(si)),(cy-10*d)/Math.max(1e-3,Math.abs(co)),1e5);let nx=cx+si*k,ny=cy-co*k;if(-co>0)ny=Math.min(ny,W-10*d);nx=clamp(nx,10*d,W-10*d);ny=clamp(ny,10*d,W-10*d);g.fillStyle='rgba(8,11,16,.85)';g.beginPath();g.arc(nx,ny,7.5*d,0,TAU);g.fill();g.fillStyle='#fff';g.font=`700 ${Math.round(10.5*d)}px "Barlow Condensed",Inter,Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('N',nx,ny+0.5*d)}
  /* player arrow (view cone hint + arrow) */
  g.save();g.translate(cx,cy);g.rotate(-((player.car?player.car.yaw:player.yaw)-camYaw));const a=7.5*d;g.fillStyle='#fff';g.strokeStyle='#0b0e12';g.lineWidth=2*d;g.lineJoin='round';g.beginPath();g.moveTo(0,-a*1.25);g.lineTo(a*0.85,a*0.9);g.lineTo(0,a*0.45);g.lineTo(-a*0.85,a*0.9);g.closePath();g.stroke();g.fill();g.restore();
  if(HUDS.hurt>0.01){g.fillStyle=`rgba(255,60,40,${HUDS.hurt*0.35})`;g.fillRect(0,0,W,W)}}
const _bl=[0,0,false];

/* ---------- pointer to the objective / waypoint in the 3D view ---------- */
function hudPointer(){const el=$('wpt'),D=GPS.dest;const p=player.car||player;if(!D||HUDS.cine||player.interior||!running){if(HUDS.wptOn){HUDS.wptOn=false;el.hidden=true}return}
  const dist=Math.hypot(D.x-p.x,D.z-p.z);if(dist<5){if(HUDS.wptOn){HUDS.wptOn=false;el.hidden=true}return}
  _hv.set(D.x,groundY(D.x,D.z)+2.6,D.z).project(camera);const W=innerWidth,H=innerHeight;let x=(_hv.x*0.5+0.5)*W,y=(-_hv.y*0.5+0.5)*H;const behind=_hv.z>1;
  const mx=26,mt=58,mb=H>W?230:74;let off=behind||x<mx||x>W-mx||y<mt||y>H-mb,ang=0;
  if(off){let dx=x-W/2,dy=y-H/2;if(behind){dx=-dx;dy=Math.abs(dy)+H}const k=Math.min((W/2-mx)/Math.max(1,Math.abs(dx)),(dy<0?(H/2-mt):(H/2-mb))/Math.max(1,Math.abs(dy)));x=W/2+dx*k;y=H/2+dy*k;ang=Math.atan2(dy,dx)}
  if(!HUDS.wptOn){HUDS.wptOn=true;el.hidden=false}el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;el.classList.toggle('off',off);el.classList.toggle('wp',D.kind==='wp');$('wptIc').style.transform=off?`rotate(${(ang+Math.PI/2).toFixed(2)}rad)`:'';
  const t=dist>=1000?(dist/1000).toFixed(1)+' km':Math.round(dist/5)*5+' m';if(HUDS.last.wptD!==t){HUDS.last.wptD=t;$('wptD').textContent=t}}

/* ---------- onboarding: one small hint at a time, gone for good once done ---------- */
const ONB=[
 {id:'move',t:'Drag the <b>left side</b> of the screen to walk. Push further to run.',k:'<b>W A S D</b> to move',done:s=>STATS.walked-s.w>7},
 {id:'look',t:'Drag the <b>right side</b> to look around.',k:'Hold the <b>mouse button</b> and drag to look around',done:()=>HUDS.look>1.3},
 {id:'sprint',t:'Tap <b>SPRINT</b> to go faster.',k:'Hold <b>Shift</b> to sprint · <b>Space</b> jumps',done:()=>player.spd>PMOVE.RUN+1},
 {id:'use',t:'Walk up to a person or a door — a <b>gold button</b> appears. Tap it.',k:'Walk up to a person or a door and press <b>E</b>',done:()=>HUDS.uses>0},
 {id:'car',t:'Stand next to any car and tap <b>CAR</b> to drive it.',k:'Stand next to any car and press <b>F</b> to drive it',done:()=>STATS.cars>0||!!player.car},
 {id:'map',t:'Tap the <b>radar</b> for the map, missions and settings.',k:'Press <b>M</b> for the map, missions and settings',done:()=>HUDS.mapOpened>0}];
function onboardTick(dt){const f=SAVE.flags.onb||(SAVE.flags.onb={});const el=$('hint');
  if(HUDS.cine||(typeof DLG!=='undefined'&&DLG.open)||(typeof mission!=='undefined'&&mission&&mission.quiet)){el.classList.remove('on');return}
  if(!HUDS.onb){const next=ONB.find(o=>!f[o.id]);if(!next){el.classList.remove('on');return}HUDS.onbT+=dt;if(HUDS.onbT<1.2)return;HUDS.onb={o:next,w:STATS.walked,t:0};HUDS.onbKey=''}
  const cur=HUDS.onb;cur.t+=dt;const key=cur.o.id+inputMode;if(HUDS.onbKey!==key){HUDS.onbKey=key;el.innerHTML=inputMode==='touch'?cur.o.t:cur.o.k;el.classList.add('on')}
  if(cur.o.done(cur)||cur.t>40){f[cur.o.id]=1;HUDS.onb=null;HUDS.onbT=0;el.classList.remove('on');if(cur.t<=40&&typeof uiSound==='function')uiSound('ok')}}

/* ---------- per-frame HUD update (called from the main loop) ---------- */
function hudUpdate(dt){
  if(HUDS.sub>0){HUDS.sub-=dt;if(HUDS.sub<=0)$('sub').classList.remove('on')}
  if(HUDS.ban>0){HUDS.ban-=dt;if(HUDS.ban<=0)$('banner').classList.remove('on')}
  for(let i=HUDS.toasts.length-1;i>=0;i--){const o=HUDS.toasts[i];o.t-=dt;if(o.t<=0){o.el.classList.remove('on');const el=o.el;setTimeout(()=>el.remove(),350);HUDS.toasts.splice(i,1)}}
  if(!running)return;
  /* cash: count towards the real balance (also catches changes made by other modules) */
  if(!HUDS.cash&&HUDS.shown!==player.money){if(HUDS.shown<0){HUDS.shown=player.money;setTxt('money',money2(player.money))}else HUDS.cash={from:HUDS.shown,to:player.money,t:0,dur:0.6,tick:0}}
  if(HUDS.cash){const c=HUDS.cash;c.t+=dt;const u=Math.min(1,c.t/c.dur),e=1-Math.pow(1-u,3);HUDS.shown=u>=1?c.to:c.from+(c.to-c.from)*e;setTxt('money',money2(HUDS.shown));c.tick-=dt;if(c.tick<=0&&u<1){c.tick=0.07;if(typeof uiSound==='function')uiSound('coin')}
    if(u>=1){HUDS.cash=null;HUDS.shown=player.money;$('money').classList.remove('up','down')}}
  if(HUDS.hurt>0){HUDS.hurt=Math.max(0,HUDS.hurt-dt*1.6);$('vign').style.boxShadow=HUDS.hurt>0.01?`inset 0 0 ${Math.round(60+HUDS.hurt*90)}px rgba(255,40,20,${(HUDS.hurt*0.55).toFixed(2)})`:''}
  drawMinimap();hudPointer();gpsUpdate(dt);onboardTick(dt);
  HUDS.tick-=dt;if(HUDS.tick>0)return;HUDS.tick=0.2;
  const h=Math.floor(tod),m=Math.floor((tod%1)*60);setTxt('clock',String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'));
  setTxt('street',player.interior?districtName():streetName());setTxt('district',player.interior?'Indoors':districtName());
  const hp=Math.round(clamp(player.health,0,100));if(HUDS.last.hp!==hp){HUDS.last.hp=hp;$('hpFill').style.width=hp+'%';$('hp').classList.toggle('low',hp<35)}
  const inCar=!!player.car;if(HUDS.last.inCar!==inCar){HUDS.last.inCar=inCar;$('btnsFoot').hidden=inCar;$('btnsCar').hidden=!inCar;document.body.classList.toggle('driving',inCar)}
  if(!inCar){const near=!!nearestCar()&&!player.interior;if(HUDS.last.nearCar!==near){HUDS.last.nearCar=near;$('bCar').classList.toggle('dim',!near)}const sp=!!input.sprint;if(HUDS.last.sp!==sp){HUDS.last.sp=sp;$('bSprint').classList.toggle('on',sp)}
    const act=player.ball?'SHOOT':'PUNCH';setTxt('bActL',act)}
  else{const v=Math.round(Math.abs(player.car.vf||0)*3.6);setTxt('speedo',v+'');}
  if(HUDS.last.spd!==inCar){HUDS.last.spd=inCar;$('speedBox').hidden=!inCar}}
