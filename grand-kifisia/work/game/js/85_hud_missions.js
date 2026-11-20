'use strict';
/* Grand Kifisia — HUD, minimap, missions, talking, shops, menus */
/* ============================== HUD ============================== */
let subT=0,banT=0,cashT=0;
function cashFlash(a,b){const el=$('money');el.style.transition='transform .25s';el.style.transform='scale(1.35)';el.style.color='#c8ff9c';let t=0;const iv=setInterval(()=>{t+=0.05;const v=a+(b-a)*Math.min(1,t/1.2);el.textContent='€'+v.toFixed(2);if(t%0.2<0.05)sfx('buy');if(t>=1.2){clearInterval(iv);el.style.transform='';el.style.color=''}},50);cashT=1.4}
function subtitle(t,s){const e=$('sub');e.textContent=t;e.style.opacity=1;subT=s||3}
function banner(t,s,fail){const e=$('banner');e.querySelector('.t').textContent=t;e.querySelector('.s').textContent=s||'';e.classList.toggle('fail',!!fail);e.style.opacity=1;banT=3.2;sfx(fail?'fail':'pass')}
function objective(html,timer){const e=$('obj');if(!html){e.hidden=true;return}e.hidden=false;e.innerHTML=html+(timer!=null?`<span id="objTimer">${timer}</span>`:'')}
const mmc=$('mmc'),mmx=mmc.getContext('2d');
function drawMinimap(){const W=300,c=mmx,p=player.car||player;c.save();c.clearRect(0,0,W,W);c.beginPath();c.arc(W/2,W/2,W/2-8,0,TAU);c.clip();c.fillStyle='#24282d';c.fillRect(0,0,W,W);
  const sc=player.car?1.1:1.7;c.translate(W/2,W/2);c.rotate(camYaw+Math.PI);c.scale(sc,sc);c.drawImage(mapC,-(p.x-BOUNDS[0]),-(p.z-BOUNDS[1]));
  const blip=(x,z,col,r,ch)=>{c.save();c.translate(x-p.x,z-p.z);c.rotate(-(camYaw+Math.PI));c.fillStyle=col;c.beginPath();c.arc(0,0,r/sc,0,TAU);c.fill();if(ch){c.fillStyle='#111';c.font=`bold ${11/sc}px Inter,Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(ch,0,0.5/sc)}c.restore()};
  for(const m of MISSIONS){if(mission||!m.at)continue;const a=m.at();const d=Math.hypot(a.x-p.x,a.z-p.z);let x=a.x,z=a.z;const lim=78/sc*0.95;if(d>lim){x=p.x+(a.x-p.x)/d*lim;z=p.z+(a.z-p.z)/d*lim}blip(x,z,done[m.id]?'#7a8a7a':'#ffcf3f',9,m.icon)}
  if(mission&&mission.target){const tg=mission.target();if(tg){const d=Math.hypot(tg.x-p.x,tg.z-p.z);let x=tg.x,z=tg.z;const lim=78/sc*0.95;if(d>lim){x=p.x+(tg.x-p.x)/d*lim;z=p.z+(tg.z-p.z)/d*lim}blip(x,z,'#ffcf3f',8)}}
  c.restore();
  // ring with health arc + north marker
  c.save();c.lineWidth=7;c.strokeStyle='rgba(0,0,0,.65)';c.beginPath();c.arc(W/2,W/2,W/2-5,0,TAU);c.stroke();c.strokeStyle=player.health<35?'#e2463b':'#5fd068';c.beginPath();c.arc(W/2,W/2,W/2-5,Math.PI*0.75,Math.PI*0.75+Math.PI*1.5*player.health/100);c.stroke();
  const na=camYaw+Math.PI/2;c.fillStyle='#fff';c.font='bold 18px Inter,Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('N',W/2+Math.cos(na)*(W/2-22),W/2+Math.sin(na)*(W/2-22));
  c.translate(W/2,W/2);c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=2;c.beginPath();const pyaw=(player.car?player.car.yaw:player.yaw)-camYaw;c.rotate(-pyaw);c.moveTo(0,-11);c.lineTo(8,9);c.lineTo(0,4);c.lineTo(-8,9);c.closePath();c.fill();c.stroke();c.restore()}
function buildMapCanvas(){const [bx0,bz0,bx1,bz1]=BOUNDS;const W=Math.ceil(bx1-bx0),H=Math.ceil(bz1-bz0);mapC=document.createElement('canvas');mapC.width=W;mapC.height=H;const g=mapC.getContext('2d');g.fillStyle='#3a4038';g.fillRect(0,0,W,H);
  const path=r=>{g.beginPath();r.forEach((p,i)=>{i?g.lineTo(p[0]-bx0,p[1]-bz0):g.moveTo(p[0]-bx0,p[1]-bz0)});g.closePath()};
  const AC={park:'#3f6e3a',garden:'#456f3c',grass:'#4a7840',wood:'#35592f',scrub:'#55603f',parking:'#4b4f55',pool:'#3aa7d8',water:'#3d8fbf',school:'#5a5850',sport:'#55534c',plaza:'#8d887c',rail:'#4a4744',platform:'#77736b',pitch:'#3d6f8f'};
  for(const a of MAP.areas){const c=AC[a[0]];if(!c)continue;g.fillStyle=c;path(unp(a[1][0]));g.fill()}
  g.fillStyle='#6d6a64';for(const sw of MAP.sidewalks){g.beginPath();for(const r of sw){unp(r).forEach((p,i)=>{i?g.lineTo(p[0]-bx0,p[1]-bz0):g.moveTo(p[0]-bx0,p[1]-bz0)});g.closePath()}g.fill('evenodd')}
  g.lineCap='round';g.lineJoin='round';for(const r of ROADS){if(r.side<0&&r.ty===7)continue;g.strokeStyle=r.ty<=5?(r.ty<=2?'#c9c4b6':'#a9a59a'):'#8c8577';g.lineWidth=r.ty<=5?r.w:Math.max(1.5,r.w);g.beginPath();r.ps.forEach((p,i)=>{i?g.lineTo(p[0]-bx0,p[1]-bz0):g.moveTo(p[0]-bx0,p[1]-bz0)});g.stroke()}
  g.fillStyle='#24272b';g.strokeStyle='#15171a';g.lineWidth=0.8;for(const b of MAP.buildings){path(unp(b[10]));g.fill();g.stroke()}
  g.strokeStyle='#d8d8d8';g.setLineDash([5,4]);g.lineWidth=2;for(const r of MAP.rail){g.beginPath();unp(r).forEach((p,i)=>{i?g.lineTo(p[0]-bx0,p[1]-bz0):g.moveTo(p[0]-bx0,p[1]-bz0)});g.stroke()}g.setLineDash([]);
  // dim everything outside the playable area
  g.save();g.fillStyle='rgba(10,12,16,.62)';g.beginPath();g.rect(0,0,W,H);for(const r of playPolys){r.forEach((p,i)=>{i?g.lineTo(p[0]-bx0,p[1]-bz0):g.moveTo(p[0]-bx0,p[1]-bz0)});g.closePath()}g.fill('evenodd');g.restore()}
function openMap(){if(!$('start').hidden)return;const bm=$('bigmap');bm.hidden=false;running=false;const c=$('bmc');const [bx0,bz0,bx1,bz1]=BOUNDS;let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;for(const r of playPolys)for(const p of r){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}
  const w=maxx-minx,h=maxz-minz;const s=Math.min(innerWidth*0.96/w,innerHeight*0.88/h);c.width=Math.round(w*s*1.5);c.height=Math.round(h*s*1.5);c.style.width=w*s+'px';c.style.height=h*s+'px';const g=c.getContext('2d');const k=s*1.5;
  g.fillStyle='#1b1e22';g.fillRect(0,0,c.width,c.height);g.drawImage(mapC,minx-bx0,minz-bz0,w,h,0,0,c.width,c.height);const P=(x,z)=>[(x-minx)*k,(z-minz)*k];
  const lab=(x,z,t,col,ic)=>{const [X,Y]=P(x,z);g.fillStyle=col;g.beginPath();g.arc(X,Y,10,0,TAU);g.fill();if(ic){g.fillStyle='#111';g.font='bold 12px Inter,Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(ic,X,Y+1)}g.font='bold 13px Inter,Arial';g.textAlign='left';g.lineWidth=4;g.strokeStyle='rgba(0,0,0,.85)';g.strokeText(t,X+14,Y+4);g.fillStyle='#fff';g.fillText(t,X+14,Y+4)};
  for(const m of MISSIONS){const a=m.at();lab(a.x,a.z,m.title,done[m.id]?'#7a8a7a':'#ffcf3f',m.icon)}
  const pl=[['Starbucks',SPECIAL.starbucks],['KFC',SPECIAL.kfc],['AB Supermarket',SPECIAL.super],['PAUL',SPECIAL.paul]];for(const [t,s] of pl)if(s)lab(s.x,s.z,t,'#3d8bfd','');
  lab(MAP.key.platanos[0],MAP.key.platanos[1],'Platanos Square','#c9c4b6','');lab(MAP.key.alsos[0],MAP.key.alsos[1],'Alsos Kifisias','#5fd068','');
  const p=player.car||player;const [X,Y]=P(p.x,p.z);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=3;g.beginPath();g.arc(X,Y,8,0,TAU);g.fill();g.stroke()}
function streetName(){const p=player.car||player;let best='',bd=26;for(const r of ROADS){if(!r.name||r.ty>6)continue;const ps=r.ps;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];if(Math.abs(a[0]-p.x)>120&&Math.abs(b[0]-p.x)>120)continue;const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;const u=clamp(((p.x-a[0])*dx+(p.z-a[1])*dz)/L2,0,1);const d=Math.hypot(p.x-a[0]-dx*u,p.z-a[1]-dz*u);if(d<bd){bd=d;best=r.name}}}
  return best?greeklish(best):'Kifisia'}

/* ============================== MISSIONS ============================== */
let mission=null;const done=store.get('done',{});player.money=store.get('money',40);
const MISSIONS=[
 {id:'gyro',title:'Gyro Run',icon:'G',sub:'Mythos Plus · Kassaveti',reward:20,intro:'You are starving. Walk to Mythos Plus on Kassaveti and get a pita gyro.',at:()=>({x:SPECIAL.mythos.door[0]+SPECIAL.mythos.nx*3,z:SPECIAL.mythos.door[1]+SPECIAL.mythos.nz*3})},
 {id:'isa',title:'After Hours',icon:'B',sub:'International School of Athens · closed',reward:60,intro:'It is almost midnight and ISA is locked. Get to the school, climb the fence, grab the basketball and sink three shots. Do not let the guard see you.',at:()=>({x:MAP.isa.gate[0],z:MAP.isa.gate[1]})},
 {id:'train',title:'Line 1 to the Mall',icon:'M',sub:'Kifisia station · ΗΣΑΠ',reward:30,intro:'You are meeting everyone at The Mall Athens. Walk to Kifisia station, buy a ticket, validate it and get on the Line 1 train to Piraeus.',at:()=>({x:STATION.front?STATION.front.x:MAP.key.station[0],z:STATION.front?STATION.front.z:MAP.key.station[1]})}];
function openMissions(){if(!$('start').hidden)return;running=false;const rows=MISSIONS.map((m,i)=>`<button type="button" class="item" data-i="${i}"><span><div class="nm">${esc(m.title)}</div><div class="sb">${esc(m.sub)} · €${m.reward}</div></span><span class="tag ${mission&&mission.id===m.id?'live':done[m.id]?'done':''}">${mission&&mission.id===m.id?'Active':done[m.id]?'Done':'New'}</span></button>`).join('');
  sheet(`<div class="eyebrow">Grand Kifisia</div><h2>Missions</h2><p>Walk into a yellow marker on the map to start, or pick one here.</p><div class="list">${rows}</div><p style="font-size:13px">Your 17 friends join in the next update, each with their own missions.</p><div class="row"><button class="cta" id="mX" type="button">Resume</button>${mission?'<button class="cta alt" id="mQ" type="button">Quit mission</button>':''}</div>`);
  $('card').querySelectorAll('.item').forEach(b=>b.onclick=()=>briefing(MISSIONS[+b.dataset.i]));$('mX').onclick=closeSheet;if($('mQ'))$('mQ').onclick=()=>{endMission(false,true);closeSheet()}}
function briefing(m){running=false;sheet(`<div class="eyebrow">${esc(m.sub)}</div><h2>${esc(m.title)}</h2><p>${esc(m.intro)}</p><p style="color:var(--money);font-weight:800">Reward €${m.reward}</p><div class="row"><button class="cta" id="bGo" type="button">Start mission</button><button class="cta alt" id="bNo" type="button">Not now</button></div>`);
  $('bGo').onclick=()=>{closeSheet();startMission(m.id)};$('bNo').onclick=()=>{closeSheet();lastMarker=performance.now()+6000}}
let lastMarker=0;
function startMission(id){if(mission)endMission(false,true);const M=MISSIONS.find(m=>m.id===id);mission={id,stage:0,t:0,M};banner(M.title.toUpperCase(),M.sub);
  if(id==='gyro'){mission.target=()=>({x:SPECIAL.mythos.door[0],z:SPECIAL.mythos.door[1]});objective('Go to <b>Mythos Plus</b> on Kassaveti and buy a <b>pita gyro</b>.')}
  if(id==='train'){mission.target=()=>STATION.machine;objective('Walk to <b>Kifisia station</b> and buy a ticket at the <b>ticket machine</b>.');TRAIN.hold=false;if(TRAIN.state==='away'){TRAIN.next=Math.min(TRAIN.next||20,TRAIN.t+40)}}
  if(id==='isa'){tod=23.6;mission.target=()=>({x:MAP.isa.gate[0],z:MAP.isa.gate[1]});objective('It\'s 23:40. Get to the <b>International School of Athens</b>.');setupISA()}}
function endMission(ok,silent){const m=mission;mission=null;objective(null);$('meter').hidden=true;$('detect').hidden=true;meter=null;player.ball=false;if(ISA.ball){ISA.ball.visible=false}if(ISA.guard){ISA.guard.h.root.visible=false}
  if(!m)return;if(ok){const from=player.money;player.money=Math.round((player.money+m.M.reward)*100)/100;done[m.id]=true;store.set('done',done);store.set('money',player.money);banner('MISSION COMPLETE',`${m.M.title}   +€${m.M.reward.toFixed(2)}`);cashFlash(from,player.money)}else if(!silent)banner('MISSION FAILED',m.fail||'',true)}
function missionTick(dt){const p=player.car||player;
  if(!mission){if(performance.now()>lastMarker&&!player.car)for(const m of MISSIONS){const a=m.at();if(Math.hypot(a.x-player.x,a.z-player.z)<2.2){lastMarker=performance.now()+4000;briefing(m);break}}markers();return}
  markers();const m=mission;m.t+=dt;
  if(m.id==='train'){if(m.stage===2){if(TRAIN.state==='dwell'||TRAIN.state==='arrive'){objective('Get on the <b>train to Piraeus</b> — stand by a door.');m.target=()=>{const c=TRAIN.cars[2];return c?{x:c.position.x,z:c.position.z}:STATION.mid}}else{objective('Wait on the platform for the <b>next train</b>.');m.target=()=>({x:STATION.mid[0],z:STATION.mid[1]})}}}
  if(m.id==='isa')isaTick(dt)}
const markerMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,1.2,24,1,true),new THREE.MeshBasicMaterial({color:0xffcf3f,transparent:true,opacity:0.45,side:THREE.DoubleSide,depthWrite:false}));scene.add(markerMesh);
const markerPool=[];for(let i=0;i<3;i++){const mm=markerMesh.clone();mm.material=markerMesh.material;scene.add(mm);markerPool.push(mm)}markerMesh.visible=false;
function markers(){const t=performance.now()/1000;markerPool.forEach(m=>m.visible=false);if(mission){const tg=mission.target&&mission.target();if(tg){const m=markerPool[0];m.visible=true;m.position.set(tg.x,groundY(tg.x,tg.z)+0.6+Math.sin(t*3)*0.06,tg.z);m.scale.set(1,1,1)}return}
  MISSIONS.forEach((M,i)=>{const a=M.at();const m=markerPool[i];m.visible=!player.car;m.position.set(a.x,groundY(a.x,a.z)+0.6+Math.sin(t*3+i)*0.06,a.z)})}

/* talking to people */
const NAMES_M=['Giorgos','Nikos','Kostas','Dimitris','Yannis','Panos','Stavros','Thanasis','Alexis','Christos','Vasilis','Manolis'],NAMES_F=['Maria','Eleni','Katerina','Sofia','Dimitra','Anna','Georgia','Ioanna','Christina','Despina','Vaso','Natalia'];
const SMALLTALK=['Yia sou! Hot one today, eh?','Have you tried the frappé at the kiosk? Sketos, with milk. Trust me.','I have lived on Levidou for forty years. Everything changed, except the plane tree.','The 1 to Piraeus? Half the time it is late, half the time it is very late.','Kassaveti on a Saturday morning — you cannot walk, everyone is out for coffee.','Den milao Agglika poli kala… sorry, sorry!','My grandson goes to ISA. Very expensive, very fancy.','Watch the scooters. They drive on the pavement here like it is a road.','Ela, ela — I am late for my coffee at Kefalari.','In summer everyone leaves for the islands and Kifisia is finally quiet.','You look lost, agori mou. Kifisia is small, you will find it.','Mythos for gyro, Paul for a croissant. That is the Kifisia diet.'];
function directionTo(x,z){const p=player;const dx=x-p.x,dz=z-p.z;const d=Math.hypot(dx,dz);const rel=wrapA(Math.atan2(dx,dz)-p.yaw);let dir=Math.abs(rel)<0.5?'straight ahead':Math.abs(rel)>2.5?'behind you':rel>0?'to your left':'to your right';
  const card=['south','south-east','east','north-east','north','north-west','west','south-west'][((Math.round(Math.atan2(dx,dz)/(Math.PI/4))%8)+8)%8];return `${Math.round(d/10)*10||10} metres ${dir} (${card})`}
function npcLine(p){if(!p.name)p.name=(p.h.look&&p.h.look.fem?pick(NAMES_F):pick(NAMES_M));p.talks=(p.talks||0)+1;
  if(mission&&mission.target){const t=mission.target();if(t&&p.talks%2===1)return`You are looking for something? It is ${directionTo(t.x,t.z)}.`}
  const spots=[['Mythos Plus','mythos'],['PAUL','paul'],['Starbucks','starbucks'],['KFC','kfc'],['the AB supermarket','super']];const sp=spots[(p.talks+Math.floor(p.x))%spots.length];const S=SPECIAL[sp[1]];
  if(S&&p.talks%3===2)return`${sp[0]}? ${directionTo(S.door[0],S.door[1])}.`;
  if(p.talks%3===0&&STATION.front)return`The station is ${directionTo(STATION.front.x,STATION.front.z)}. Trains every ten minutes, more or less.`;
  return SMALLTALK[(p.talks*7+Math.floor(Math.abs(p.x*3)))%SMALLTALK.length]}
function talkTo(p){p.prevState=p.state==='talk'?p.prevState:p.state;if(!p.static){p.state='talk';p.timer=6;p.h.play('talk')}player.yaw=Math.atan2(p.x-player.x,p.z-player.z);player.spd=0;const line=npcLine(p);subtitle(`${p.name}: “${line}”`,5.5)}
function nearestPerson(r){let best=null,bd=r;for(const p of NPCS){if(p.state==='down'||!p.h.root.visible)continue;const d=Math.hypot(p.x-player.x,p.z-player.z);if(d<bd){bd=d;best=p}}return best}

/* interactions (contextual button) */
let useTarget=null;
function interactions(){useTarget=null;if(!running)return;const p=player;if(player.car){showUse(null);return}const near=(x,z,r)=>Math.hypot(x-p.x,z-p.z)<r;
  const opts=[];
  for(const k of['mythos','starbucks','kfc','super','paul']){const s=SPECIAL[k];if(s&&near(s.door[0],s.door[1],3.2))opts.push({label:{mythos:'Order at Mythos Plus',starbucks:'Order at Starbucks',kfc:'Order at KFC',super:'Shop at AB',paul:'Order at PAUL'}[k],fn:()=>openShop(k)})}
  /* generic interaction registry: any module may INTER.push({x,z,r?,label (string or ()=>string),fn,when?:()=>bool}) — entries without fn are kiosks */
  for(const it of INTER){if(!near(it.x,it.z,it.r||2.2))continue;if(it.when&&!it.when())continue;if(it.fn){opts.push({label:typeof it.label==='function'?it.label():it.label,fn:it.fn});continue}
    opts.push({label:it.label,fn:()=>{if(player.money<2.5){subtitle('Not enough money.',2);return}player.money-=2.5;sfx('buy');subtitle('Frappé, sketos, me gala. €2.50',2.5);player.health=Math.min(100,player.health+10)}})}
  if(mission&&mission.id==='train'){const m=mission;if(m.stage===0&&STATION.machine&&near(STATION.machine.x,STATION.machine.z,2.3))opts.push({label:'Buy ticket €1.20',fn:()=>{if(player.money<1.2){subtitle('You need €1.20.',2);return}player.money=Math.round((player.money-1.2)*100)/100;sfx('buy');m.stage=1;m.target=()=>STATION.validator;objective('Validate your ticket at the <b>yellow validator</b>.')}});
    if(m.stage===1&&STATION.validator&&near(STATION.validator.x,STATION.validator.z,2.2))opts.push({label:'Validate ticket',fn:()=>{sfx('buy');m.stage=2;subtitle('Beep. Ticket valid for 90 minutes.',2.5)}});
    if(m.stage===2&&TRAIN.state==='dwell'){for(const c of TRAIN.cars){if(Math.hypot(c.position.x-p.x,c.position.z-p.z)<9.5&&Math.abs(groundY(p.x,p.z)-terr(p.x,p.z))>0.4){opts.push({label:'Board the train',fn:boardTrain});break}}}}
  if(mission&&mission.id==='isa')isaInteract(opts,near);
  if(!mission&&TRAIN.state==='dwell'&&!opts.length){for(const c of TRAIN.cars){if(Math.hypot(c.position.x-p.x,c.position.z-p.z)<9.5&&lvl(p.x,p.z)>0.4){opts.push({label:'Ride to Piraeus?',fn:()=>subtitle('Start the "Line 1 to the Mall" mission to ride.',2.5)});break}}}
  if(!opts.length&&!player.ball){const np=nearestPerson(2.4);if(np)opts.push({label:'Talk',fn:()=>talkTo(np)})}
  useTarget=opts[0]||null;showUse(useTarget)}
function showUse(t){const b=$('bUse');if(!t){b.hidden=true;return}b.hidden=false;$('useTxt').textContent=t.label}
function use(){if(useTarget)useTarget.fn()}
const SHOPS={mythos:{t:'Mythos Plus',s:'Gyro & souvlaki · Kassaveti',items:[['Pita gyro (pork)',3.8,'gyro'],['Pita gyro (chicken)',3.8,'gyro'],['Souvlaki skewer',2.2,'gyro'],['Gyro plate',11.5,'gyro'],['Coca-Cola can',1.8,'drink']]},
 starbucks:{t:'Starbucks',s:'Kassaveti 19',items:[['Freddo espresso',4.3,''],['Freddo cappuccino',4.6,''],['Caramel Frappuccino',5.9,''],['Cookie',2.6,'']]},
 kfc:{t:'KFC',s:'Kifisias Ave 238–240',items:[['Bucket, 8 pieces',14.9,''],['Zinger burger',6.9,''],['Twister wrap',6.2,''],['Fries',2.9,'']]},
 super:{t:'AB Vasilopoulos',s:'Levidou 2',items:[['Water 1.5 L',0.6,''],['Chips',2.1,''],['Ice cream',2.9,''],['Energy drink',1.9,'']]},
 paul:{t:'PAUL',s:'Boulangerie · Kassaveti',items:[['Croissant',2.4,''],['Pain au chocolat',2.7,''],['Espresso',2.2,''],['Ham & cheese baguette',5.9,'']]}};
function openShop(k){const S=SHOPS[k];running=false;sheet(`<div class="eyebrow">${esc(S.s)}</div><h2>${esc(S.t)}</h2><p>You have €${player.money.toFixed(2)}</p><div class="list">${S.items.map((it,i)=>`<button type="button" class="item" data-i="${i}"><span class="nm">${esc(it[0])}</span><span class="pr">€${it[1].toFixed(2)}</span></button>`).join('')}</div><div class="row"><button class="cta alt" id="sX" type="button">Leave</button></div>`);
  $('card').querySelectorAll('.item').forEach(b=>b.onclick=()=>{const it=S.items[+b.dataset.i];if(player.money<it[1]){subtitle('Not enough money.',2);return}player.money=Math.round((player.money-it[1])*100)/100;store.set('money',player.money);sfx('buy');player.health=Math.min(100,player.health+15);closeSheet();
    if(it[2]==='gyro'){player.busy=2.4;ph.play('eat');setTimeout(()=>ph.stop(),2400);subtitle('Pita gyro with tzatziki, tomato, onion and fries inside. Perfect.',3);if(mission&&mission.id==='gyro')setTimeout(()=>{if(mission&&mission.id==='gyro')endMission(true)},2300)}else subtitle('Bought: '+it[0],2)});$('sX').onclick=closeSheet}
function boardTrain(){const m=mission;m.stage=3;objective(null);running=true;player.busy=99;ph.root.visible=false;TRAIN.hold=false;TRAIN.state='dwell';TRAIN.t=46;subtitle('Doors closing. Next stop: KAT.',3);sfx('door');
  const c0=TRAIN.cars[2].position.clone();let tt=0;freeCam=(dt)=>{tt+=dt;const p=TRAIN.cars[2].position;const side=STATION.side||1;const mid=atLen(TRAINPATH.ps,TRAINPATH.cum,40);const ox=-Math.cos(mid[2])*side*14,oz=Math.sin(mid[2])*side*14;camera.position.lerp(new THREE.Vector3(c0.x+ox,terr(c0.x,c0.z)+5,c0.z+oz),Math.min(1,dt*2));camera.lookAt(p.x,terr(p.x,p.z)+2,p.z);
    if(tt>7.5&&m.stage===3){m.stage=4;$('fade').style.opacity=1;setTimeout(()=>{freeCam=null;player.busy=0;ph.root.visible=true;const s=STATION.front||{x:MAP.key.station[0],z:MAP.key.station[1]};player.x=s.x;player.z=s.z;player.y=groundY(s.x,s.z);$('fade').style.opacity=0;endMission(true);subtitle('Line 1: Kifisia → KAT → Marousi → Neratziotissa for The Mall Athens.',4.5)},900)}}}

/* ISA after-hours: fence climb, guard with flashlight, basketball */
let meter=null;
function setupISA(){ISA.poly=unp(MAP.isa.poly);if(!ISA.ball){ISA.ball=new THREE.Mesh(new THREE.SphereGeometry(0.12,14,10),new THREE.MeshLambertMaterial({color:0xd8641e}));scene.add(ISA.ball)}
  const hoop=HOOPS.find(h=>h.isa)||HOOPS[HOOPS.length-1];ISA.hoop=hoop;const court=MAP.pitches.find(p=>hoop&&Math.hypot(p[0]-hoop.x,p[1]-hoop.z)<25)||[MAP.isa.gate[0],MAP.isa.gate[1]];ISA.court={x:court[0],z:court[1]};
  ISA.ball.visible=true;ISA.ball.position.set(ISA.court.x,groundY(ISA.court.x,ISA.court.z)+0.12,ISA.court.z);ISA.score=0;ISA.detect=0;
  if(!ISA.guard){const h=new Ped({fem:false,skin:'#c08a62',hair:'#1b1410',hairStyle:'buzz',shirt:'#1b2a3a',pants:'#1b2a3a',shoes:'#111',sleeves:'long',cap:true,capColor:'#1b2a3a',face:2,height:1.04,build:1.15,beard:false},true);ISA.guard={h,a:0};
    const fl=new THREE.Mesh(new THREE.ConeGeometry(3.2,11,20,1,true),new THREE.MeshBasicMaterial({color:0xfff3b0,transparent:true,opacity:0.16,depthWrite:false,side:THREE.DoubleSide}));fl.geometry.translate(0,-5.5,0);fl.rotation.x=-Math.PI/2;fl.position.set(0,1.3,0.3);h.root.add(fl)}
  ISA.guard.h.root.visible=true}
function isaInteract(opts,near){const m=mission;if(!ISA.poly)return;const inside=pip(ISA.poly,player.x,player.z);
  // near the fence: offer to climb
  let best=null,bd=1.6;const ps=ISA.poly;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz;const u=clamp(((player.x-a[0])*dx+(player.z-a[1])*dz)/L2,0,1);const qx=a[0]+dx*u,qz=a[1]+dz*u;const d=Math.hypot(player.x-qx,player.z-qz);if(d<bd){bd=d;best={qx,qz}}}
  if(best)opts.push({label:inside?'Climb out':'Climb the fence',fn:()=>climbFence(best,inside)});
  if(m.stage===3&&player.ball&&ISA.hoop&&near(ISA.hoop.x,ISA.hoop.z,8))opts.unshift({label:meter?'Release!':'Shoot',fn:shoot})}
function climbFence(q,inside){const dx=q.qx-player.x,dz=q.qz-player.z,l=Math.hypot(dx,dz)||1;const tx=q.qx+dx/l*1.0,tz=q.qz+dz/l*1.0;player.busy=1.1;player.yaw=Math.atan2(dx,dz);ph.play('climb',true);sfx('swish');
  const sx=player.x,sz=player.z;let t=0;const step=()=>{t+=1/30;const u=Math.min(1,t/1.0);player.x=lerp(sx,tx,u);player.z=lerp(sz,tz,u);player.y=groundY(player.x,player.z)+Math.sin(u*Math.PI)*2.2;if(u<1)setTimeout(step,33);else{ph.stop();player.y=groundY(player.x,player.z);
    if(mission&&mission.id==='isa'){if(!inside&&mission.stage<=1){mission.stage=2;objective('You\'re in. Grab the <b>basketball</b> on the court. Stay out of the <b>flashlight</b>.');mission.target=()=>({x:ISA.ball.position.x,z:ISA.ball.position.z})}else if(inside&&mission.stage===4){endMission(true)}}}};step()}
function shoot(){const h=ISA.hoop;const d=Math.hypot(h.x-player.x,h.z-player.z);if(!meter){meter={t:0,zone:clamp(0.36-d*0.03,0.1,0.32)};$('mZone').style.left=(50-meter.zone*50)+'%';$('mZone').style.width=(meter.zone*100)+'%';$('meter').hidden=false;player.yaw=Math.atan2(h.x-player.x,h.z-player.z);return}
  const v=(Math.sin(meter.t*3.4)+1)/2;const hit=Math.abs(v-0.5)<meter.zone/2;$('meter').hidden=true;meter=null;player.ball=false;ph.play('shoot',true);player.busy=0.9;setTimeout(()=>ph.stop(),900);
  ISA.throw={t:0,from:new THREE.Vector3(player.x,player.y+2.2,player.z),to:new THREE.Vector3(h.x,h.y,h.z),hit,miss:new THREE.Vector3((Math.random()-0.5)*1.4,0,(Math.random()-0.5)*1.4)};sfx('swish')}
function isaTick(dt){const m=mission;if(!ISA.poly)return;ISA.inside=pip(ISA.poly,player.x,player.z);const g=ISA.guard;
  if(m.stage===0&&Math.hypot(player.x-MAP.isa.gate[0],player.z-MAP.isa.gate[1])<14){m.stage=1;objective('The gate is locked. Find a spot and <b>climb the fence</b>.');m.target=()=>({x:MAP.isa.gate[0],z:MAP.isa.gate[1]})}
  // guard patrol around the court with a flashlight
  if(g){g.a+=dt*0.32;const gx=ISA.court.x+Math.cos(g.a)*11,gz=ISA.court.z+Math.sin(g.a*1.3)*7;const dx=gx-(g.x||gx),dz=gz-(g.z||gz);g.x=gx;g.z=gz;g.yaw=Math.atan2(dx,dz)||g.yaw||0;g.h.root.position.set(gx,groundY(gx,gz),gz);g.h.root.rotation.y=g.yaw;g.h.update(dt,1.3,false);
    if(ISA.inside&&m.stage>=2){const px=player.x-gx,pz=player.z-gz,d=Math.hypot(px,pz);const ang=Math.acos(clamp((px*Math.sin(g.yaw)+pz*Math.cos(g.yaw))/(d||1),-1,1));const seen=d<10.5&&ang<0.42&&rayHit(gx,gz,player.x,player.z)>=1;
      ISA.detect=clamp(ISA.detect+(seen?dt*(1.6-d*0.08):-dt*0.5),0,1);$('detect').hidden=ISA.detect<=0;$('detectFill').style.width=(ISA.detect*100)+'%';if(ISA.detect>=1){m.fail='The security guard caught you.';const gate=MAP.isa.gate;endMission(false);player.x=gate[0];player.z=gate[1];const q={x:player.x,z:player.z};for(let k=0;k<60&&pip(ISA.poly,q.x,q.z);k++)q.z+=1;player.x=q.x;player.z=q.z;return}}}
  if(m.stage===2&&ISA.ball.visible&&Math.hypot(ISA.ball.position.x-player.x,ISA.ball.position.z-player.z)<1.2){m.stage=3;player.ball=true;objective('Sink <b>3 baskets</b> (0/3). Tap <b>Shoot</b>, then tap again when the bar is in the green.');m.target=()=>({x:ISA.hoop.x,z:ISA.hoop.z})}
  if(player.ball){ISA.ball.position.set(player.x+Math.sin(player.yaw)*0.45,player.y+0.35+Math.abs(Math.sin(performance.now()/170))*0.55,player.z+Math.cos(player.yaw)*0.45)}
  if(meter){meter.t+=dt;const v=(Math.sin(meter.t*3.4)+1)/2;$('mNeedle').style.left=`calc(${v*100}% - 2px)`}
  if(ISA.throw){const th=ISA.throw;th.t+=dt*1.25;const u=Math.min(1,th.t);const to=th.hit?th.to:th.to.clone().add(th.miss);ISA.ball.position.lerpVectors(th.from,to,u);ISA.ball.position.y+=Math.sin(u*Math.PI)*2.6;
    if(u>=1){ISA.throw=null;if(th.hit){ISA.score++;sfx('pass');subtitle(['Swish!','Nothing but net.','Bucket!'][ISA.score-1]||'Score!',1.5)}else{sfx('thud');subtitle('Rim out.',1.2)}ISA.ball.position.set(th.to.x+(Math.random()-0.5)*2,groundY(th.to.x,th.to.z)+0.12,th.to.z+1.5);
      if(ISA.score>=3){m.stage=4;objective('Three for three. Now <b>climb back out</b> before the guard notices.');m.target=()=>({x:MAP.isa.gate[0],z:MAP.isa.gate[1]})}else{m.stage=2;objective(`Grab the ball and shoot again (<b>${ISA.score}/3</b>).`);m.target=()=>({x:ISA.ball.position.x,z:ISA.ball.position.z})}}}}

/* ============================== MENUS ============================== */
let running=false;
function sheet(html){$('card').innerHTML=html;$('sheet').hidden=false}
function closeSheet(){$('sheet').hidden=true;$('bigmap').hidden=true;if($('start').hidden){running=true;last=performance.now()}}
$('sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
function openPause(){if(!$('start').hidden)return;running=false;const q=SETTINGS.q;sheet(`<div class="eyebrow">Paused</div><h2>Grand Kifisia</h2><div class="list">
  <button type="button" class="item" id="pM"><span class="nm">Missions</span><span class="sb" style="margin-left:auto">${MISSIONS.filter(m=>done[m.id]).length}/3 done</span></button>
  <button type="button" class="item" id="pMap"><span class="nm">Map</span></button></div>
  <p style="margin:14px 0 6px;color:var(--text);font-weight:800">Graphics</p><div class="seg" id="seg">${['auto','low','medium','high'].map(k=>`<button type="button" data-q="${k}" class="${q===k?'on':''}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div>
  <p style="font-size:12px">Auto lowers resolution when the frame rate drops. High adds full shadows and more trees.</p>
  <label class="row" style="font-size:13px;color:var(--dim);margin:8px 0 14px"><input type="checkbox" id="fpsT" ${SETTINGS.fps?'checked':''}> Show frame rate</label>
  <p style="font-size:12px">Controls: left side moves, right side turns the camera. Keyboard: WASD, Shift sprint, Space jump/handbrake, F car, E use, J punch/horn, M map.</p>
  <div class="row"><button class="cta" id="pR" type="button">Resume</button></div>`);
  $('pR').onclick=closeSheet;$('pM').onclick=openMissions;$('pMap').onclick=()=>{closeSheet();openMap()};$('fpsT').onchange=e=>{SETTINGS.fps=e.target.checked;store.set('settings',SETTINGS);$('fps').hidden=!SETTINGS.fps};
  $('seg').querySelectorAll('button').forEach(b=>b.onclick=()=>{SETTINGS.q=b.dataset.q;store.set('settings',SETTINGS);Q=QP[SETTINGS.q==='auto'?'medium':SETTINGS.q];pixelRatio=Math.min(window.devicePixelRatio||1,Q.pr);applyQuality();openPause()})}

