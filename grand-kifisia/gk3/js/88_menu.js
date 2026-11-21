'use strict';
/* Grand Kifisia — title menu, pause menu (MAP / BRIEF / STATS / SETTINGS / CREDITS), new-game confirmation, opening cinematic.
   Owner: game agent. Public: MENU, openMenu(tab), closeMenu(), menuTab(name), menuKey(code), menuMapInfo(), titleReady(), startGame(opts), openingCinematic().
   The pause menu is a full-screen layer: while it is open the simulation is paused (running=false) and the main loop stops drawing the world. */
const MENU={open:false,title:false,tab:'map',drawn:0,confirm:false};
const MENU_TABS=[['map','Map'],['brief','Brief'],['stats','Stats'],['settings','Settings'],['credits','Credits']];
const CREDITS_TXT=`GRAND KIFISIA
A game made by a group of friends, set in the real centre of Kifisia, Athens. Everything is 1:1 in metres, built from open map data.
Names of real businesses appear only as plain text signs at their real locations. No logos are used.

MAP AND TERRAIN
Streets, buildings, shops, trees, lamps and benches: © OpenStreetMap contributors, ODbL — openstreetmap.org/copyright
Additional places: Overture Maps Foundation (CDLA-Permissive 2.0 / ODbL)
Terrain: Copernicus EU-DEM v1.1 (© European Union, Copernicus Land Monitoring Service)

PHOTOS (loading screen)
Wikimedia Commons contributors, CC BY-SA — titles and authors listed in ref/list.json of the project

PEOPLE AND ANIMATION
Microsoft Rocketbox Avatar Library — 41 rigged avatars and 127 motion-capture clips — © Microsoft Corporation, MIT licence — github.com/microsoft/Microsoft-Rocketbox
Hand-keyed clips (punch, basketball shot, fence climb, eating, sitting, giving): original work for Grand Kifisia

MATERIALS
Poly Haven textures and foliage (asphalt, pavers, marble, plaster, stone, brick, bark, leaves…) — Poly Haven contributors, CC0 — polyhaven.com

FONTS
Bebas Neue — Dharma Type, SIL Open Font License 1.1
Barlow Condensed — Jeremy Tribby, SIL Open Font License 1.1
Inter — Rasmus Andersson, SIL Open Font License 1.1
(packaged by Fontsource, MIT)

ENGINE
three.js r147 — MIT licence — threejs.org

SOUND
All sound is synthesised live in the browser (WebAudio); no recordings are used.

Thanks to everyone who maps Kifisia on OpenStreetMap.`;

/* ---------- opening / closing ---------- */
function openMenu(tab,opt){opt=opt||{};const title=!!opt.title;if(!title&&!$('start').hidden)return;if(!title&&(HUDS.cine||player.frozen&&typeof CUT!=='undefined'&&CUT))return;
  if(typeof DLG!=='undefined'&&DLG.open&&!title)dlgClose();
  if(!$('sheet').hidden&&!title){if(typeof sheetModal!=='undefined'&&sheetModal)return;$('sheet').hidden=true;sheetModal=false}
  MENU.open=true;MENU.title=title;MENU.drawn=0;MENU.confirm=false;if(!title){running=false;for(const k in keys)keys[k]=false;input.gas=input.rev=input.brake=false;if(typeof joyEnd==='function'&&JOY.id!==null)joyEnd()}
  const m=$('menu');m.hidden=false;m.style.zIndex=title?31:'';$('menuClose').textContent=title?'Back':'Resume';
  const tabs=title?MENU_TABS.filter(t=>t[0]==='settings'||t[0]==='credits'):MENU_TABS;
  $('tabs').innerHTML=tabs.map(t=>`<button class="tab" type="button" data-t="${t[0]}">${t[1].toUpperCase()}</button>`).join('');
  $('tabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>{menuTab(b.dataset.t);if(typeof uiSound==='function')uiSound('tab')});
  if(typeof uiSound==='function')uiSound('open');
  menuTab(tab&&tabs.some(t=>t[0]===tab)?tab:(title?'settings':(MENU.tab==='credits'||MENU.tab==='settings'?'map':MENU.tab)))}
function closeMenu(){if(!MENU.open)return;MENU.open=false;$('menu').hidden=true;$('tabBody').innerHTML='';BM.c=null;BM.g=null;BM.ptr.clear();
  if(typeof uiSound==='function')uiSound('close');
  if(!MENU.title){saveGame();if($('sheet').hidden&&$('start').hidden){running=true;last=performance.now()}}MENU.title=false}
function menuTab(name){MENU.tab=name;MENU.confirm=false;$('tabs').querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.t===name));
  const on=$('tabs').querySelector('.tab.on');if(on&&on.scrollIntoView)try{on.scrollIntoView({inline:'center',block:'nearest'})}catch(e){}
  const body=$('tabBody');body.className=name==='map'?'map':'';body.scrollTop=0;
  ({map:tabMap,brief:tabBrief,stats:tabStats,settings:tabSettings,credits:tabCredits}[name]||tabMap)(body)}
function menuKey(c){const tabs=[...$('tabs').querySelectorAll('.tab')].map(b=>b.dataset.t);let i=tabs.indexOf(MENU.tab);
  if(c==='ArrowRight'||c==='KeyE'||c==='BracketRight'){menuTab(tabs[(i+1)%tabs.length]);return}
  if(c==='ArrowLeft'||c==='KeyQ'||c==='BracketLeft'){menuTab(tabs[(i-1+tabs.length)%tabs.length]);return}
  if(MENU.tab==='map'&&BM.c){if(c==='Equal'||c==='NumpadAdd'){bigMapZoom(1.35);bigMapQueue()}else if(c==='Minus'||c==='NumpadSubtract'){bigMapZoom(1/1.35);bigMapQueue()}else if(c==='KeyC'){bigMapCentre()}
    else if(c==='KeyW'||c==='KeyS'||c==='KeyA'||c==='KeyD'){const s=60/BM.s;BM.cx+=c==='KeyD'?s:c==='KeyA'?-s:0;BM.cz+=c==='KeyS'?s:c==='KeyW'?-s:0;bigMapClamp();bigMapQueue()}}}

/* ---------- MAP ---------- */
function tabMap(body){HUDS.mapOpened++;
  const cats=Object.keys(CATSTYLE).slice(0,8).map(k=>`<span><i style="background:${CATSTYLE[k][0]}"></i>${esc(CATSTYLE[k][2])}</span>`).join('');
  body.innerHTML=`<canvas id="bmc"></canvas>
   <div id="mapFind" class="mapUi"><input id="mfq" type="search" placeholder="Find a shop, café or place…" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"><div id="mfr"></div></div>
   <div id="legend" class="mapUi" hidden><span><i style="background:#ffc832"></i>Mission</span><span><i style="background:#39b6ff"></i>GPS route</span>${cats}</div>
   <div id="mapInfo" class="mapUi"></div>
   <div id="mapBtns" class="mapUi"><button class="mb" id="mZin" type="button" aria-label="Zoom in">+</button><button class="mb" id="mZout" type="button" aria-label="Zoom out">−</button>
    <button class="mb txt" id="mMe" type="button">YOU</button><button class="mb txt" id="mLeg" type="button">KEY</button><button class="mb txt" id="mClr" type="button" hidden>CLEAR</button></div>`;
  const c=$('bmc');requestAnimationFrame(()=>{if(MENU.tab!=='map'||!c.isConnected)return;bigMapOpen(c);menuMapInfo()});
  $('mZin').onclick=()=>{bigMapZoom(1.4);bigMapQueue()};$('mZout').onclick=()=>{bigMapZoom(1/1.4);bigMapQueue()};$('mMe').onclick=()=>bigMapCentre();
  $('mLeg').onclick=()=>{const l=$('legend');l.hidden=!l.hidden;$('mLeg').classList.toggle('on',!l.hidden)};
  $('mClr').onclick=()=>{clearWaypoint();bigMapAfterWp()};
  const q=$('mfq'),r=$('mfr');let hits=[];
  const show=()=>{hits=mapFind(q.value);const p=player.car||player;r.innerHTML=hits.map((h,i)=>`<button type="button" data-i="${i}"><i style="background:${h.col}"></i><b>${esc(h.name)}</b><span>${esc(h.sub)} · ${fmtDist(Math.hypot(h.x-p.x,h.z-p.z))}</span></button>`).join('')||(q.value.trim().length>1?'<p>Nothing with that name in Grand Kifisia.</p>':'');
    r.querySelectorAll('button').forEach(b=>b.onclick=()=>{const h=hits[+b.dataset.i];setWaypoint(h.x,h.z,h.name);BM.cx=h.x;BM.cz=h.z;BM.s=Math.max(BM.s,3.6);BM.hl={x:h.x,z:h.z,t:performance.now()};q.value='';r.innerHTML='';q.blur();bigMapAfterWp()})};
  q.oninput=show;q.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'&&hits[0])r.querySelector('button').click();else if(e.key==='Escape'){q.value='';r.innerHTML='';q.blur()}};
}
/* map search over every named shop / amenity (POIS) and landmark (PLACES); accents and Greek letters are folded, Greek input is transliterated */
const foldTxt=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9α-ω ]+/g,' ').trim();
function mapFind(raw){const q=foldTxt(isGreek(raw)?greeklish(raw):raw);if(q.length<2)return[];const out=[];
  const score=n=>{const f=foldTxt(n);if(f.startsWith(q))return 0;if(f.split(' ').some(w=>w.startsWith(q)))return 1;return f.includes(q)?2:-1};
  for(const P of PLACES){const sc=score(P.name);if(sc>=0)out.push({sc:sc-0.5,name:P.name,sub:'Place',x:P.x,z:P.z,col:P.col||'#ffc832'})}
  for(const P of POIS){const sc=score(P.name);if(sc<0)continue;const st=CATSTYLE[P.cat]||CATSTYLE.other;const st2=typeof navNearestNamed==='function'?navNearestNamed(P.x,P.z,25):'';
    out.push({sc,name:P.name,sub:(P.kind?String(P.kind).replace(/_/g,' '):st[2])+(st2?' · '+latin(st2):''),x:P.x,z:P.z,col:st[0]})}
  const p=player.car||player;out.sort((a,b)=>a.sc-b.sc||Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  const seen=new Set();return out.filter(h=>{const k=h.name+'|'+Math.round(h.x/20)+'|'+Math.round(h.z/20);if(seen.has(k))return false;seen.add(k);return true}).slice(0,6)}
function menuMapInfo(){const e=$('mapInfo');if(!e)return;const p=player.car||player;let h='';
  if(GPS.wp){const d=Math.hypot(GPS.wp.x-p.x,GPS.wp.z-p.z);h=`<span class="wp">GPS</span> · <b>${esc(GPS.wp.label)}</b> · ${fmtDist(GPS.len||d)}<br>Tap the pin again to clear it.`}
  else if(mission&&mission.step){const t=typeof mission.step.text==='function'?mission.step.text(mission):mission.step.text;h=`<b>${esc(mission.M.title)}</b> · ${String(t||'').replace(/<(?!\/?b>)[^>]*>/g,'')}`}
  else{const next=missionsByDistance().find(m=>!SAVE.done[m.id]&&!(m.hidden&&m.hidden()));h=`You are on <b>${esc(streetName())}</b>.<br>Tap anywhere — a street, a shop, a mission — to set a GPS route.`+(next?`<br>Nearest new mission: <b>${esc(next.title)}</b>`:'')}
  e.innerHTML=h;const cl=$('mClr');if(cl)cl.hidden=!GPS.wp}
function fmtDist(m){return m>=1000?(m/1000).toFixed(1)+' km':Math.round(m/10)*10+' m'}

/* ---------- BRIEF ---------- */
function tabBrief(body){const p=player.car||player;const list=missionsByDistance().filter(M=>!(M.hidden&&M.hidden())||SAVE.done[M.id]);
  const nDone=MISSIONS.filter(M=>SAVE.done[M.id]).length;
  const card=M=>{const live=mission&&mission.M===M,dn=!!SAVE.done[M.id],a=mAt(M),d=Math.hypot(a.x-p.x,a.z-p.z),best=SAVE.best&&SAVE.best[M.id];
    return `<div class="mcard ${live?'live':dn?'done':''}"><div class="top"><div class="mic">${esc(M.icon||'!')}</div><div><div class="ttl">${esc(M.title)}</div><div class="sb">${esc(M.sub)}${M.giver?' · '+esc(M.giver):''}</div></div>
      <span class="tag ${live?'live':dn?'done':''}" style="margin-left:auto">${live?'Active':dn?'Passed':'New'}</span></div>
      <div class="txt">${esc(M.brief||'')}</div>
      <div class="sb">${fmtDist(d)} away${M.timeLabel?' · starts '+esc(M.timeLabel):''}${best?' · best '+esc(typeof best==='number'?best.toFixed(1)+' s':String(best)):''}</div>
      <div class="foot"><span class="pay">${money2(live?M.reward:rewardFor(M))}</span>${live?`<button class="cta alt" type="button" data-a="retry" data-id="${M.id}">Retry</button><button class="cta bad" type="button" data-a="quit" data-id="${M.id}">Quit</button>`
        :`<button class="cta alt" type="button" data-a="gps" data-id="${M.id}">GPS</button><button class="cta" type="button" data-a="go" data-id="${M.id}">${dn?'Replay':'Start'}</button>`}</div></div>`};
  const act=mission?list.filter(M=>mission.M===M):[],todo=list.filter(M=>!SAVE.done[M.id]&&!act.includes(M)),dn=list.filter(M=>SAVE.done[M.id]&&!act.includes(M));
  body.innerHTML=`<div class="pane"><h3>Missions</h3><p>${nDone} of ${MISSIONS.length} passed · ${money2(STATS.earned||0)} earned so far. Replays pay half. Gold beams on the street mark where each mission starts.</p>
    ${act.length?`<h4>Active</h4><div class="grid">${act.map(card).join('')}</div>`:''}
    ${todo.length?`<h4>Available</h4><div class="grid">${todo.map(card).join('')}</div>`:''}
    ${dn.length?`<h4>Passed</h4><div class="grid">${dn.map(card).join('')}</div>`:''}</div>`;
  body.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const M=missionById(b.dataset.id);if(!M)return;const a=b.dataset.a;
    if(a==='gps'){const q=mAt(M);setWaypoint(q.x,q.z,M.title);menuTab('map')}
    else if(a==='go'){closeMenu();startMission(M.id)}
    else if(a==='retry'){closeMenu();if(typeof retryMission==='function'&&mission&&mission.cp)retryMission();else startMission(M.id,{skipIntro:true})}
    else if(a==='quit'){quitMission();menuTab('brief')}})}

/* ---------- STATS ---------- */
function tabStats(body){const S=STATS;const hm=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}h ${m}m`:`${m}m`};
  const km=v=>((v||0)/1000).toFixed(2)+' km';const nDone=MISSIONS.filter(M=>SAVE.done[M.id]).length;
  const rows=[['Cash',money2(player.money)],['Earned',money2(S.earned||0)],['Spent',money2(S.spent||0)],['Time played',hm(S.played)],
    ['Missions passed',`${nDone} / ${MISSIONS.length}`],['Missions failed',S.failed||0],['Walked',km(S.walked)],['Driven',km(S.driven)],['Top speed',Math.round(S.topSpeed||0)+' km/h'],
    ['Cars taken',S.cars||0],['People talked to',S.talked||0],['Given to people',money2(S.given||0)],['Gyros eaten',S.gyros||0],['Coffees',S.coffees||0],['Train rides',S.rides||0],['Baskets',S.baskets||0],
    ['Knocked out',S.knocked||0]];
  const pct=Math.round(100*nDone/Math.max(1,MISSIONS.length));
  body.innerHTML=`<div class="pane"><h3>Stats</h3><p>${pct}% of the missions done. Every metre counts — in Grand Kifisia one metre is one real metre of Kifisia.</p>
   <div class="stats">${rows.map(r=>`<div class="stat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div></div>`}

/* ---------- SETTINGS ---------- */
/* 'auto' resolves exactly like boot (00_core.js), or through autoQuality() if the materials module provides one */
function qAuto(){if(typeof autoQuality==='function')try{return autoQuality()}catch(e){}return Math.min(screen.width,screen.height)<500&&(navigator.hardwareConcurrency||4)<=4?'low':'medium'}
function setQuality(q){SETTINGS.q=q;saveSettings();Q=QP[q==='auto'?qAuto():q]||QP.medium;pixelRatio=Math.min(window.devicePixelRatio||1,Q.pr);applyQuality();resize()}
function tabSettings(body){const S=SETTINGS;const sw=(id,on)=>`<button class="sw ${on?'on':''}" id="${id}" type="button" role="switch" aria-checked="${!!on}"></button>`;
  const seg=['auto'].concat(Object.keys(QP)).map(q=>`<button type="button" data-q="${q}" class="${(S.q||'auto')===q?'on':''}">${q}</button>`).join('');
  body.innerHTML=`<div class="pane"><h3>Settings</h3>
   <h4>Graphics</h4>
   <div class="set"><div class="lb">Quality<small>Auto lowers the resolution when the phone struggles.</small></div><div class="seg" id="sQ">${seg}</div></div>
   <div class="set"><label for="sFps">Show frame rate</label>${sw('sFps',S.fps)}</div>
   <h4>Controls</h4>
   <div class="set"><label for="sSens">Look sensitivity<small id="sSensV">${(S.sens||1).toFixed(2)}×</small></label><input type="range" id="sSens" min="0.4" max="2.2" step="0.05" value="${S.sens||1}"></div>
   <div class="set"><label for="sInv">Invert vertical look</label>${sw('sInv',S.invY)}</div>
   <div class="set"><label for="sLefty">Left-handed layout<small>Stick on the right, buttons on the left.</small></label>${sw('sLefty',S.lefty)}</div>
   ${typeof setAutoThrottle==='function'?`<div class="set"><label for="sAuto">Auto-throttle when driving<small>Touch: while your thumb steers on the left, the car drives itself. BRAKE stops; hold it to reverse.</small></label>${sw('sAuto',DRV.auto!==false)}</div>`:''}
   <div class="set"><label for="sHap">Vibration</label>${sw('sHap',S.haptics)}</div>
   <h4>Sound and text</h4>
   <div class="set"><label for="sVol">Volume<small id="sVolV">${Math.round((S.vol==null?0.8:S.vol)*100)}%</small></label><input type="range" id="sVol" min="0" max="1" step="0.05" value="${S.vol==null?0.8:S.vol}"></div>
   <div class="set"><label for="sSubs">Subtitles</label>${sw('sSubs',S.subs!==false)}</div>
   <h4>Game</h4>
   <div class="set"><div class="lb">New game<small>Erases cash, missions, stats and position on this device.</small></div><button class="cta bad" id="sNew" type="button">New game</button></div>
   <div id="sConfirm" hidden style="padding:12px;margin-top:8px;border:1px solid var(--red);border-radius:10px;background:#2a1414">
     <p style="margin:0 0 10px"><b>Start again from the beginning?</b> Your ${money2(player.money)} and ${MISSIONS.filter(M=>SAVE.done[M.id]).length} passed missions will be gone.</p>
     <div class="row"><button class="cta bad" id="sYes" type="button">Erase and start</button><button class="cta alt" id="sNo" type="button">Keep playing</button></div></div>
   <p style="margin-top:16px;color:var(--dim);font-size:12px">Keys: WASD move · Shift sprint · Space jump · E use · F car · J punch / horn · M map · Esc menu · mouse drag to look, wheel to zoom.</p></div>`;
  $('sQ').querySelectorAll('button').forEach(b=>b.onclick=()=>{setQuality(b.dataset.q);$('sQ').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))});
  const tog=(id,key,after)=>{$(id).onclick=()=>{S[key]=!S[key];$(id).classList.toggle('on',!!S[key]);$(id).setAttribute('aria-checked',!!S[key]);saveSettings();if(after)after(S[key]);if(typeof uiSound==='function')uiSound('click')}};
  tog('sFps','fps',v=>{$('fps').hidden=!v});tog('sInv','invY');tog('sLefty','lefty',v=>document.body.classList.toggle('lefty',v));tog('sHap','haptics',v=>{if(v&&navigator.vibrate)try{navigator.vibrate(30)}catch(e){}});
  if($('sAuto'))$('sAuto').onclick=()=>{const on=setAutoThrottle(!DRV.auto);$('sAuto').classList.toggle('on',on);$('sAuto').setAttribute('aria-checked',on);if(typeof uiSound==='function')uiSound('click')};
  $('sSubs').onclick=()=>{S.subs=S.subs===false;$('sSubs').classList.toggle('on',S.subs);saveSettings()};
  $('sSens').oninput=e=>{S.sens=+e.target.value;$('sSensV').textContent=S.sens.toFixed(2)+'×'};$('sSens').onchange=saveSettings;
  $('sVol').oninput=e=>{const v=+e.target.value;if(typeof ambVolume==='function')ambVolume(v);else S.vol=v;$('sVolV').textContent=Math.round(v*100)+'%'};$('sVol').onchange=()=>{saveSettings();if(typeof uiSound==='function')uiSound('click')};
  $('sNew').onclick=()=>{$('sConfirm').hidden=false;$('sNew').disabled=true;$('sConfirm').scrollIntoView&&$('sConfirm').scrollIntoView({block:'nearest'})};
  $('sNo').onclick=()=>{$('sConfirm').hidden=true;$('sNew').disabled=false};
  $('sYes').onclick=()=>{const fromTitle=MENU.title;closeMenu();newGame(!fromTitle)}}

/* ---------- CREDITS ---------- */
function tabCredits(body){body.innerHTML=`<div class="pane"><h3>Credits</h3><div class="credits">${esc(CREDITS_TXT)}</div></div>`}

/* ---------- new game / continue ---------- */
function hasProgress(){return!!(SAVE.pos||Object.keys(SAVE.done||{}).length||(STATS.played||0)>60)}
function newGame(inGame){if(typeof mission!=='undefined'&&mission)missionCleanup();if(typeof DLG!=='undefined'&&DLG.open)dlgClose();
  wipeSave();player.money=SAVE.money;HUDS.shown=-1;HUDS.cash=null;tod=SAVE.tod;clearWaypoint(true);try{store.set('hudOnb',{})}catch(e){}if(HUDS.onbDone)HUDS.onbDone={};
  if(inGame){respawn();faceJunction();startGame({fresh:true})}else startGame({fresh:true})}
function faceJunction(){const m=SPECIAL&&SPECIAL.mythos;if(m){player.yaw=player.hdg=Math.atan2(m.x-player.x,m.z-player.z);camYaw=player.yaw}if(ph)ph.root.rotation.y=player.yaw}
/* titleReady(): called once by the main loop when loading has finished (#play visible): fills the title menu */
function titleReady(){const prog=hasProgress();$('play').textContent=prog?'Continue':'Play';$('newGame').hidden=!prog;$('tSet').hidden=false;$('tCred').hidden=false;
  if(prog){const n=Object.keys(SAVE.done||{}).length;$('saveInfo').hidden=false;$('saveInfo').innerHTML=`${money2(SAVE.money)} · ${n} of ${MISSIONS.length} missions · ${Math.round((STATS.played||0)/60)} min played`}
  $('play').onclick=()=>{audioOn();startGame({fresh:!prog})};
  $('newGame').onclick=()=>titleConfirm();
  $('tSet').onclick=()=>openMenu('settings',{title:true});$('tCred').onclick=()=>openMenu('credits',{title:true})}
function titleConfirm(){const mm=$('mainMenu');const keep=mm.innerHTML;
  mm.innerHTML=`<div style="font:600 13px/1.45 var(--f-ui);text-shadow:0 1px 3px #000;margin-bottom:4px">Erase your progress on this device and start a new game?</div>
   <button class="cta bad" id="tcYes" type="button">Erase and start</button><button class="cta alt" id="tcNo" type="button">Cancel</button>`;
  $('tcNo').onclick=()=>{mm.innerHTML=keep;titleReady()};
  $('tcYes').onclick=()=>{audioOn();mm.innerHTML=keep;newGame(false)}}
/* startGame({fresh}): leave the title screen. fresh → spawn at the junction + opening cinematic (skippable); otherwise resume at the saved spot. */
function startGame(o){o=o||{};if(MENU.open)closeMenu();$('start').hidden=true;hudShow(true);radarResize();freeCam=null;booting=false;
  if(typeof tod==='number'&&SAVE.tod!=null)tod=SAVE.tod;player.money=SAVE.money;
  const P=SAVE.pos;if(!o.fresh&&P&&isFinite(P[0])&&inPlay(P[0],P[1])&&!collide({x:P[0],z:P[1]},0.4,null)){placePlayer(P[0],P[1],P[2])}else if(o.fresh){respawn(true);faceJunction()}
  CAMS.ok=false;running=true;last=performance.now();updateChunkVis(player.x,player.z);if(!MENU.started){MENU.started=true;gameEvent('start',{fresh:!!o.fresh})}
  if(o.fresh&&!DEBUG&&!o.noIntro)openingCinematic();else if(typeof stinger==='function')stinger('obj');
  saveGame()}

/* ---------- opening cinematic: aerial sweep over Kifisia down to the spawn junction, with title cards ---------- */
function kassavetiLine(){let best=null,bl=0;for(const r of ROADS){if(!/Κασσαβ/.test(r.name)||!r.focus)continue;if(r.L>bl){bl=r.L;best=r}}return best}
async function openingCinematic(){const P=MAP.key.platanos,J={x:player.x,z:player.z},yaw=player.yaw;player.frozen=true;let skipped=false;
  const fovSet=v=>{if(Math.abs(camera.fov-v)>0.01){camera.fov=v;camera.updateProjectionMatrix()}};
  const st=MAP.key.station||(STATION&&STATION.pos?[STATION.pos.x,STATION.pos.z]:[P[0]+120,P[1]-60]);
  if(typeof stinger==='function')stinger('intro');
  /* 1 — high over the town, slow orbit around Platanos square */
  skipped=await camCut(5.2,t=>{const e=sstep(t),a=-2.2+e*0.55,r=lerp(260,200,e),h=lerp(150,120,e);const cx=(P[0]+J.x)/2,cz=(P[1]+J.z)/2;
    camera.position.set(cx+Math.cos(a)*r,terr(cx,cz)+h,cz+Math.sin(a)*r);camera.lookAt(cx,terr(cx,cz)+8,cz);fovSet(46)},{title:'GRAND KIFISIA',sub:'Kifisia · north of Athens · 1:1'});
  if(!skipped&&st){/* 2 — down over the station and the Line 1 terminus */
    const sx=st[0],sz=st[1];skipped=await camCut(4.2,t=>{const e=sstep(t),a=0.6+e*0.5,r=lerp(110,70,e),h=lerp(70,34,e);
      camera.position.set(sx+Math.cos(a)*r,terr(sx,sz)+h,sz+Math.sin(a)*r);camera.lookAt(sx,terr(sx,sz)+3,sz);fovSet(48)},{title:'KIFISIA STATION',sub:'The end of Line 1'})}
  if(!skipped){/* 3 — glide along Kassaveti towards the junction */
    const K=kassavetiLine();let A,B;if(K){const a=K.ps[0],b=K.ps[K.ps.length-1];const da=Math.hypot(a[0]-J.x,a[1]-J.z),db=Math.hypot(b[0]-J.x,b[1]-J.z);A=da>db?a:b;B=[J.x,J.z]}else{A=[P[0],P[1]];B=[J.x,J.z]}
    skipped=await camCut(4.6,t=>{const e=sstep(t);const x=lerp(A[0],B[0],e*0.75),z=lerp(A[1],B[1],e*0.75);const h=lerp(46,26,e);const dx=B[0]-A[0],dz=B[1]-A[1],L=Math.hypot(dx,dz)||1;
      camera.position.set(x-dz/L*18,terr(x,z)+h,z+dx/L*18);camera.lookAt(lerp(x,B[0],0.6),terr(B[0],B[1])+2,lerp(z,B[1],0.6));fovSet(50)},{title:'KASSAVETI',sub:'Shops, cafés and old mansions'})}
  if(!skipped){/* 4 — come down behind the player at the junction next to Mythos, AB and PAUL */
    const gy=groundY(J.x,J.z);const bx=J.x-Math.sin(yaw)*4.6,bz=J.z-Math.cos(yaw)*4.6;const sx=J.x-Math.sin(yaw+0.9)*28,sz=J.z-Math.cos(yaw+0.9)*28;
    skipped=await camCut(4.0,t=>{const e=sstep(t);const x=lerp(sx,bx,e),z=lerp(sz,bz,e),h=lerp(24,2.1,e*e*(3-2*e));
      camera.position.set(x,Math.max(gy+h,groundY(x,z)+1.2),z);camera.lookAt(J.x+Math.sin(yaw)*lerp(0,6,e),gy+lerp(1.2,1.5,e),J.z+Math.cos(yaw)*lerp(0,6,e));fovSet(lerp(50,58,e))},{title:'THE JUNCTION',sub:'Mythos · AB · PAUL — your start'})}
  player.frozen=false;camYaw=yaw;CAMS.ok=false;updateChunkVis(player.x,player.z);
  if(typeof stinger==='function')stinger('obj');toast('Welcome to Grand Kifisia. Gold beams mark missions.','star')}
/* apply stored presentation settings at load */
document.body.classList.toggle('lefty',!!SETTINGS.lefty);$('fps').hidden=!SETTINGS.fps;
