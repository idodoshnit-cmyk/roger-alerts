'use strict';
/* Grand Kifisia — game events, shops, dialogue, talking to people, contextual interactions, mission framework.
   The missions themselves live in 87b_mission_data.js. Formats and APIs: docs/GAMEPLAY.md. */

/* ============================== GAME EVENTS ==============================
   gameEvent(name,data) is called for things missions react to: 'buy' {shop,item,tag,price,eat}, 'talk' {npc}, 'enterCar' {car}, 'exitCar' {car},
   'use' {label}, 'punch' {npc}, 'interior' {key}.   onGame(name,fn) subscribes from any module. */
const GEV={};
function onGame(name,fn){(GEV[name]=GEV[name]||[]).push(fn)}
function gameEvent(name,data){data=data||{};if(mission&&mission.step){const s=mission.step;if(s.on&&s.on[name])s.on[name](mission,data);if(mission&&mission.M.on&&mission.M.on[name])mission.M.on[name](mission,data)}const l=GEV[name];if(l)for(const f of l)f(data);return data}

/* ============================== SHEETS (cards over the paused game) ============================== */
let sheetModal=false;
function sheet(html,modal){$('card').innerHTML=html;$('sheet').hidden=false;sheetModal=!!modal;running=false;if(typeof uiSound==='function')uiSound('open')}
function closeSheet(){$('sheet').hidden=true;sheetModal=false;if($('start').hidden&&(typeof MENU==='undefined'||!MENU.open)){running=true;last=performance.now()}}
$('sheet').addEventListener('click',e=>{if(e.target.id==='sheet'&&!sheetModal)closeSheet()});

/* ============================== SHOPS ============================== */
const SHOPS={mythos:{t:'Mythos Plus',s:'Gyro & souvlaki · Kassaveti',items:[['Pita gyro, pork',3.8,'gyro'],['Pita gyro, chicken',3.8,'gyro'],['Souvlaki skewer',2.2,'food'],['Gyro plate with fries',11.5,'gyro'],['Coca-Cola can',1.8,'drink']]},
 starbucks:{t:'Starbucks',s:'Coffee · Kassaveti',items:[['Freddo espresso',4.3,'coffee'],['Freddo cappuccino',4.6,'coffee'],['Caramel Frappuccino',5.9,'coffee'],['Chocolate cookie',2.6,'food']]},
 kfc:{t:'KFC',s:'Kifisias Avenue',items:[['Bucket, 8 pieces',14.9,'food'],['Zinger burger',6.9,'food'],['Twister wrap',6.2,'food'],['Fries',2.9,'food']]},
 super:{t:'AB Vasilopoulos',s:'Supermarket · Levidou',items:[['Water 1.5 L',0.6,'drink'],['Crisps',2.1,'food'],['Ice cream',2.9,'food'],['Energy drink',1.9,'drink']]},
 paul:{t:'PAUL',s:'Bakery · Kassaveti',items:[['Croissant',2.4,'food'],['Pain au chocolat',2.7,'food'],['Espresso',2.2,'coffee'],['Ham & cheese baguette',5.9,'food']]},
 kiosk:{t:'Periptero',s:'Street kiosk',items:[['Frappé, sketos, with milk',2.5,'coffee'],['Water 0.5 L',0.5,'drink'],['Chewing gum',1.2,'food'],['Sesame koulouri',0.8,'food']]},
 g_cafe:{s:'Café',items:[['Freddo espresso',3.8,'coffee'],['Cappuccino',3.9,'coffee'],['Fresh orange juice',4.5,'drink'],['Toast',3.2,'food']]},
 g_food:{s:'Kitchen',items:[['Dish of the day',12.5,'food'],['Greek salad',8.5,'food'],['Soft drink',2.5,'drink']]},
 g_fast:{s:'Take-away',items:[['Sandwich',4.2,'food'],['Cheese pie',2.6,'food'],['Soft drink',1.9,'drink']]},
 g_sweet:{s:'Pâtisserie',items:[['Ice cream, two scoops',4.0,'food'],['Baklava',3.5,'food'],['Espresso',2.4,'coffee']]}};
const EATLINES={gyro:'Pita gyro with tzatziki, tomato, onion and fries inside. Perfect.',food:'That hit the spot.',coffee:'Cold, strong, exactly right.',drink:'Refreshing.'};
function openShop(k,name){const S=SHOPS[k];if(!S)return;const title=name||S.t||'Shop';const need=mission&&mission.step&&mission.step.needs&&mission.step.needs.shop===k?mission.step.needs:null;
  const cheapest=need?Math.min(...S.items.filter(it=>it[2]===need.tag).map(it=>it[1])):0;const free=need&&player.money<cheapest;
  sheet(`<div class="eyebrow">${esc(S.s)}</div><h2>${esc(title)}</h2><p>You have <b class="cash">${money2(player.money)}</b>${free?' — not enough, but the man at the till waves it off: <b>“This one is on the house.”</b>':''}</p><div class="list">${S.items.map((it,i)=>{const f=free&&it[2]===need.tag;return`<button type="button" class="item${need&&it[2]===need.tag?' hot':''}" data-i="${i}"><span class="nm">${esc(it[0])}</span>${need&&it[2]===need.tag?'<span class="tag live">Mission</span>':''}<span class="pr">${f?'FREE':money2(it[1])}</span></button>`}).join('')}</div><div class="row"><button class="cta alt" id="sX" type="button">Leave</button></div>`);
  $('card').querySelectorAll('.item').forEach(b=>b.onclick=()=>{const it=S.items[+b.dataset.i];const f=free&&it[2]===need.tag;if(!f&&!spend(it[1],it[0])){b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),400);return}if(f)sfx('buy');closeSheet();
    const ev=gameEvent('buy',{shop:k,item:it[0],tag:it[2],price:f?0:it[1],eat:true});
    if(it[2]==='gyro')STATS.gyros++;if(it[2]==='coffee')STATS.coffees++;
    if(ev.eat){player.health=Math.min(100,player.health+(it[2]==='drink'||it[2]==='coffee'?10:25));if(it[2]==='gyro'||it[2]==='food'){player.busy=2.4;ph.play('eat');setTimeout(()=>{if(ph.override==='eat'||player.busy<=0)ph.stop()},2400)}subtitle(EATLINES[it[2]]||('Bought: '+it[0]),3)}});
  $('sX').onclick=closeSheet}
/* every café / restaurant / take-away in the map data becomes a place you can order at */
let shopsReady=false;
function initShops(){if(shopsReady||!MAPV.ready)return;shopsReady=true;const G={cafe:'g_cafe',coffee:'g_cafe',bar:'g_cafe',tea:'g_cafe',restaurant:'g_food',fast_food:'g_fast',confectionery:'g_sweet',chocolate:'g_sweet'};
  for(const P of POIS){if(P.special||!G[P.kind])continue;const x=P.x+P.nx*0.6,z=P.z+P.nz*0.6;INTER.push({x,z,r:2.4,label:'Order at '+P.name,fn:()=>openShop(G[P.kind],P.name)})}}

/* ============================== DIALOGUE ==============================
   say(who, text, choices?, opt?) shows the dialogue panel. choices = [{t:'reply', f:()=>…}] (max 3); without choices the panel
   has a Continue button. A choice's f may call say() again (conversation continues) — otherwise the dialogue closes.
   opt: {npc} the person spoken to (they turn to the player, the camera frames both). dlgClose() ends it. */
const DLG={open:false,npc:null,choices:null,seq:0,yaw:null,type:null};
function say(who,text,choices,opt){opt=opt||{};const first=!DLG.open;DLG.open=true;DLG.seq++;if(opt.npc!==undefined)DLG.npc=opt.npc;DLG.choices=choices&&choices.length?choices.slice(0,3):[{t:'Continue',f:null,cont:true}];
  player.frozen=true;input.jx=input.jy=0;$('dlg').hidden=false;document.body.classList.add('talking');$('dlgWho').textContent=who||'';$('dlgWho').hidden=!who;
  const tx=$('dlgTxt');tx.textContent='';DLG.type={el:tx,s:String(text),i:0,t:0};
  const box=$('dlgCh');box.innerHTML='';DLG.choices.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='dch'+(c.cont?' cont':'');b.innerHTML=`<kbd>${i+1}</kbd><span></span>`;b.lastChild.textContent=c.t;b.onclick=e=>{e.stopPropagation();dlgPick(i)};box.appendChild(b)});
  if(first){const n=DLG.npc;if(n){const a=Math.atan2(n.x-player.x,n.z-player.z);player.yaw=a;DLG.yaw=a+0.55*(wrapA(camYaw-a)>=0?1:-1);if(!n.static){n.prevState=n.state==='talk'?n.prevState:n.state;n.state='talk';n.h.play('talk')}n.timer=99}else DLG.yaw=null;camBoomMax=3.3;if(typeof uiSound==='function')uiSound('open')}
  if(typeof uiSound==='function')uiSound('talk')}
function dlgPick(i){if(!DLG.open)return;if(DLG.type&&DLG.type.i<DLG.type.s.length){DLG.type.i=DLG.type.s.length;DLG.type.el.textContent=DLG.type.s;return}const c=DLG.choices[i];if(!c)return;const seq=DLG.seq;if(typeof uiSound==='function')uiSound('click');if(c.f)c.f();if(DLG.seq===seq)dlgClose()}
function dlgClose(){if(!DLG.open)return;DLG.open=false;$('dlg').hidden=true;document.body.classList.remove('talking');player.frozen=false;camBoomMax=1e9;const n=DLG.npc;if(n){n.timer=n.static?0:2.5}DLG.npc=null;DLG.type=null}
function dlgTick(dt){if(!DLG.open)return;const ty=DLG.type;if(ty&&ty.i<ty.s.length){ty.t+=dt*55;const n=Math.min(ty.s.length,Math.floor(ty.t));if(n!==ty.i){ty.i=n;ty.el.textContent=ty.s.slice(0,n)}}
  if(DLG.yaw!=null&&performance.now()-lastDrag>900)camYaw+=wrapA(DLG.yaw-camYaw)*(1-Math.exp(-dt*2.2));
  const n=DLG.npc;if(n&&Math.hypot(n.x-player.x,n.z-player.z)>7)dlgClose()}

/* ---------- ordinary people ---------- */
const NAMES_M=['Giorgos','Nikos','Kostas','Dimitris','Yannis','Panos','Stavros','Thanasis','Alexis','Christos','Vasilis','Manolis'],NAMES_F=['Maria','Eleni','Katerina','Sofia','Dimitra','Anna','Georgia','Ioanna','Christina','Despina','Vaso','Natalia'];
const GREETS=['Yia sou! Can I help you?','Ela, tell me.','Kalimera! You look a bit lost.','Yes? Sorry, I am in a small hurry.','Hello, hello. What do you need?','Yia! Nice day for a walk, eh?'];
const GREETS_N=['Kalispera. Out late tonight?','Good evening! Everything all right?','Yia sou. Quiet at this hour, isn’t it?'];
const SMALLTALK=['Have you tried the frappé at the periptero? Sketos, with milk. Trust me.','I have lived on Levidou for forty years. Everything changed, except the plane tree in the square.','The train to Piraeus? Half the time it is late, half the time it is very late.','Kassaveti on a Saturday morning — you cannot walk, everyone is out for coffee.','My English is siga-siga… slowly, slowly. But we understand each other, no?','My grandson goes to the international school up the hill. He comes home speaking three languages.','Watch out for the scooters. They ride on the pavement here as if it were a road.','Ela, I am late for my coffee at Kefalari. Again.','In August everyone leaves for the islands and Kifisia is finally quiet.','You will find it, don’t worry. Kifisia is small — everything is ten minutes from the square.','Mythos for a gyro, PAUL for a croissant. That is the Kifisia diet.','Up here it is always two degrees cooler than downtown. That is why the old Athenians built their summer houses here.','If you want shade, go to the Alsos, the little park by the station. Pines everywhere.','Parking in Kifisia? Forget it. I walk.','My yiayia says the bougatsa was better in her day. She says that about everything.','They film here sometimes — the old villas look good on camera.'];
const SMALLTALK_N=['At night you can hear the last train from here. I like that sound.','Careful walking home, the pavements here are older than me.','The bakery starts at five. If you are still awake then, the first koulouri is the best one.'];
const ASKPLACES=[['Mythos Plus','mythos'],['the train station','@station'],['Starbucks','starbucks'],['PAUL','paul'],['the AB supermarket','super'],['KFC','kfc'],['Platanos Square','#platanos'],['the Alsos park','#alsos'],['Kefalari Square','#kefalari'],['the international school','@isa']];
function placeXZ(k){if(k[0]==='#'){const q=MAP.key[k.slice(1)];return q?{x:q[0],z:q[1]}:null}if(k==='@station')return STATION.front?{x:STATION.front.x,z:STATION.front.z}:{x:MAP.key.station[0],z:MAP.key.station[1]};if(k==='@isa')return{x:MAP.isa.gate[0],z:MAP.isa.gate[1]};const s=SPECIAL[k];return s?{x:s.door[0],z:s.door[1]}:null}
/* one natural sentence of directions from the player to (x,z), based on the real route */
function directionsTo(x,z){const r=route(player.x,player.z,x,z,'walk');const d=r?r.len:Math.hypot(x-player.x,z-player.z);const mins=Math.max(1,Math.round(d/75));let via='';
  if(r&&r.pts.length>2){const cum=cumlen(r.pts),m=atLen(r.pts,cum,r.len*0.45),n=navNearestNamed(m[0],m[1],25);if(n)via=latin(n)}
  const rel=wrapA(Math.atan2(x-player.x,z-player.z)-player.yaw);const side=Math.abs(rel)<0.6?'straight ahead of you':Math.abs(rel)>2.4?'behind you':rel>0?'to your left':'to your right';
  const dist=d<60?'just here, '+side:d<1000?`about ${Math.round(d/10)*10} metres`:`about ${(d/1000).toFixed(1)} kilometres`;
  return d<60?`It is ${dist}.`:via?`Take ${via} — ${dist}, ${mins} minute${mins>1?'s':''} on foot. It starts ${side}.`:`It is ${dist} ${side}, ${mins} minute${mins>1?'s':''} on foot.`}
function npcName(p){if(!p.name)p.name=(p.h&&p.h.look&&p.h.look.fem?pick(NAMES_F):pick(NAMES_M));return p.name}
function talkTo(p){const name=npcName(p);p.talks=(p.talks||0)+1;if(p.talks===1)STATS.talked++;gameEvent('talk',{npc:p});
  if(typeof p.dialog==='function'){p.dialog(p);return}
  const night=tod<6||tod>21;const greet=p.lines&&p.lines.length?p.lines[(p.talks-1)%p.lines.length]:(night?GREETS_N:GREETS)[(Math.floor(Math.abs(p.x*7+p.z*3))+p.talks)%(night?GREETS_N:GREETS).length];
  const root=()=>say(name,greet,[{t:'Where can I find…?',f:ask},{t:'How is it going?',f:chat},{t:'Never mind. Yia sou!',f:null}],{npc:p});
  const chat=()=>{const L=night&&p.talks%2?SMALLTALK_N:SMALLTALK;const i=(p.talks*7+Math.floor(Math.abs(p.x*3))+(p.chat=(p.chat||0)+1))%L.length;say(name,L[i],[{t:'Where can I find…?',f:ask},{t:'Take care!',f:null}])};
  const ask=()=>{const opts=[];if(mission&&mission.target){const t=mission.target();if(t)opts.push({t:'…the place I am heading to?',f:()=>tell('That',t,null)})}
      const start=(Math.floor(Math.abs(p.z))+p.talks*2+(p.asks=(p.asks||0)+1)*2)%ASKPLACES.length;for(let k=0;k<ASKPLACES.length&&opts.length<3;k++){const a=ASKPLACES[(start+k)%ASKPLACES.length],q=placeXZ(a[1]);if(!q||Math.hypot(q.x-player.x,q.z-player.z)<25)continue;opts.push({t:'…'+a[0]+'?',f:()=>tell(a[0][0].toUpperCase()+a[0].slice(1),q,a[0])})}
      say(name,'Sure. Where do you want to go?',opts)};
  const tell=(label,q,wp)=>{if(wp)setWaypoint(q.x,q.z,wp[0].toUpperCase()+wp.slice(1));say(name,`${label}? ${directionsTo(q.x,q.z)}`,[{t:'Efcharisto — thank you!',f:null},{t:'One more thing…',f:root}])};
  root()}
function nearestPerson(r){let best=null,bd=r;for(const p of NPCS){if(p.state==='down'||!p.h||!p.h.root.visible)continue;const d=Math.hypot(p.x-player.x,p.z-player.z);if(d<bd){bd=d;best=p}}return best}

/* ============================== CONTEXTUAL INTERACTIONS ============================== */
let useTarget=null;const _opts=[];
const hasInterior=k=>typeof INTERIORS!=='undefined'&&INTERIORS&&!!INTERIORS[k];
function interactions(){useTarget=null;if(!running)return;const p=player;if(player.car||DLG.open||player.busy>0||player.frozen||HUDS.cine){showUse(null);return}const near=(x,z,r)=>Math.hypot(x-p.x,z-p.z)<r;
  if(!shopsReady)initShops();const opts=_opts;opts.length=0;
  /* mission step first */
  if(mission&&mission.step&&!mission.over){const s=mission.step,m=mission;if(s.type==='interact'){const a=s.at(m);if(a&&near(a.x,a.z,s.r||2.6))opts.push({label:typeof s.label==='function'?s.label(m):s.label,fn:()=>{if(s.use&&s.use(m)===false)return;if(mission===m&&m.step===s)missionNext()}})}
    if(s.opts)s.opts(m,opts,near)}
  /* the five famous shops: order at the door — or inside at the counter when a walk-in interior exists */
  for(const k of['mythos','starbucks','kfc','super','paul']){const s=SPECIAL[k];if(!s)continue;const lbl={mythos:'Order at Mythos Plus',starbucks:'Order at Starbucks',kfc:'Order at KFC',super:'Shop at AB',paul:'Order at PAUL'}[k];
    if(hasInterior(k)){const I=INTERIORS[k];if(player.interior===k){const c=I.counter||I.till||I.order;const cx=c?(c.x!==undefined?c.x:c[0]):null,cz=c?(c.z!==undefined?c.z:c[1]):null;if(cx==null||near(cx,cz,2.6))opts.push({label:lbl.replace(/ at.*/,'')+' at the counter',fn:()=>openShop(k),low:cx==null})}}
    else if(!player.interior&&near(s.door[0],s.door[1],3.2))opts.push({label:lbl,fn:()=>openShop(k)})}
  /* generic registry: any module may INTER.push({x,z,r?,label,fn,when?}) — entries without fn are street kiosks */
  for(let i=0;i<INTER.length;i++){const it=INTER[i];if(!near(it.x,it.z,it.r||2.2))continue;if(it.when&&!it.when())continue;if(it.fn)opts.push({label:typeof it.label==='function'?it.label():it.label,fn:it.fn});else opts.push({label:'Buy at the periptero',fn:()=>openShop('kiosk')})}
  if(!mission&&TRAIN.state==='dwell'&&!opts.length&&lvl(p.x,p.z)>0.4){for(const c of TRAIN.cars){if(Math.hypot(c.position.x-p.x,c.position.z-p.z)<9.5){opts.push({label:'Ride Line 1',fn:()=>{const M=MISSIONS.find(m=>m.id==='train');if(M)missionOffer(M)}});break}}}
  if(!player.ball){const np=nearestPerson(2.3);if(np&&!np.noTalk)opts.push({label:np.useLabel||('Talk'+(np.name?' to '+np.name:'')),fn:()=>talkTo(np),low:true})}
  let best=null;for(const o of opts)if(!o.low){best=o;break}useTarget=best||opts[0]||null;showUse(useTarget)}
function showUse(t){const b=$('bUse');const lbl=t?t.label:null;if(HUDS.last.use===lbl)return;HUDS.last.use=lbl;if(!t){b.hidden=true;return}b.hidden=false;$('useTxt').textContent=t.label;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')}
function use(){if(DLG.open){dlgPick(0);return}if(useTarget){HUDS.uses++;const t=useTarget;gameEvent('use',{label:t.label});if(typeof uiSound==='function')uiSound('click');t.fn()}}

/* ============================== MISSION FRAMEWORK ==============================
   MISSIONS is a list of data objects (see docs/GAMEPLAY.md). A running mission is `mission`:
   {id, M, i (step index), step, t, st, data, timer, cp (checkpoint), target(), path, gps, blips, over} */
let mission=null,lastMarker=0;const MISSIONS=[];const done=SAVE.done;
const missionById=id=>MISSIONS.find(m=>m.id===id);
function missionsByDistance(){const p=player.car||player;return MISSIONS.map(m=>{const a=m.at();return[Math.hypot(a.x-p.x,a.z-p.z),m]}).sort((a,b)=>a[0]-b[0]).map(a=>a[1])}
function rewardFor(M){return SAVE.done[M.id]?Math.round(M.reward*0.5):M.reward}
/* briefing card */
function missionOffer(M){const first=!SAVE.done[M.id];sheet(`<div class="eyebrow">${esc(M.giver?M.giver+' · ':'')}${esc(M.sub)}</div><h2>${esc(M.title)}</h2><p>${esc(M.brief)}</p>
  <div class="facts"><div><span>Reward</span><b class="cash">${money2(rewardFor(M))}</b></div>${M.timeLabel?`<div><span>When</span><b>${esc(M.timeLabel)}</b></div>`:''}<div><span>Status</span><b>${first?'New':'Replay · half pay'}</b></div></div>
  <div class="row"><button class="cta" id="bGo" type="button">Start mission</button><button class="cta alt" id="bNo" type="button">Not now</button></div>`);
  $('bGo').onclick=()=>{closeSheet();startMission(M.id)};$('bNo').onclick=()=>{closeSheet();lastMarker=performance.now()+7000}}
function briefing(M){missionOffer(M)}
/* pick the street-side angle for an establishing shot: the direction around (x,z) with the longest clear view */
function clearAngle(x,z,r){let best=0,bs=-1;for(let k=0;k<16;k++){const a=k/16*TAU;let s=1;for(const da of[0,0.25,0.5])s=Math.min(s,camRay(x,z,x+Math.cos(a+da)*r,z+Math.sin(a+da)*r,false));if(s>bs+1e-3){bs=s;best=a}}return best}
function fadeCut(fn,ms){const f=$('fade');f.classList.add('quick');f.style.opacity=1;setTimeout(()=>{try{fn()}finally{requestAnimationFrame(()=>{f.style.opacity=0;setTimeout(()=>f.classList.remove('quick'),300)})}},ms||240)}
function startMission(id,opt){opt=opt||{};const M=missionById(id);if(!M)return;if(mission)missionCleanup();if(player.car&&M.onFoot){exitCar(true)}
  dlgClose();const m=mission={id,M,i:-1,step:null,t:0,st:0,data:{},timer:null,cp:null,target:null,path:null,gps:true,blips:null,over:false,quiet:true,todRate0:null,get stage(){return this.i}};
  if(M.time!=null){m.tod0=tod;tod=M.time}if(M.todRate!=null&&typeof todRate!=='undefined'){m.todRate0=todRate;todRate=M.todRate}
  if(M.setup)M.setup(m);clearWaypoint(true);
  const begin=()=>{if(mission!==m)return;m.quiet=false;missionGoto(opt.step||0)};
  if(opt.skipIntro){banner(M.title.toUpperCase(),M.sub);begin();return}
  const f=(M.focus?M.focus(m):null)||M.steps[0].at&&M.steps[0].at(m)||{x:player.x,z:player.z};const gy=groundY(f.x,f.z),a0=clearAngle(f.x,f.z,24),dir=hf(Math.round(f.x*3+f.z))<0.5?1:-1;
  player.frozen=true;if(typeof stinger==='function')stinger('intro');
  camCut(3.4,(t)=>{const e=sstep(t),a=a0+dir*(0.1+e*0.42),r=lerp(25,17,e),h=lerp(11,5.5,e);const x=f.x+Math.cos(a)*r,z=f.z+Math.sin(a)*r;camera.position.set(x,Math.max(gy+h,groundY(x,z)+2.5),z);camera.lookAt(f.x,gy+1.8,f.z);if(camera.fov!==50){camera.fov=50;camera.updateProjectionMatrix()}},{title:M.title,sub:M.sub})
    .then(()=>{player.frozen=false;updateChunkVis(player.x,player.z);begin()});
  updateChunkVis(f.x,f.z)}
function missionText(m){const s=m.step;if(!s)return;const t=typeof s.text==='function'?s.text(m):s.text;objective(t||null)}
function missionGoto(i,retry){const m=mission;if(!m)return;const prev=m.step;if(prev&&prev.exit&&!retry)prev.exit(m);if(i>=m.M.steps.length){missionPass();return}
  const s=m.M.steps[i];m.i=i;m.step=s;m.st=0;m.target=s.at?()=>s.at(m):null;m.path=null;m.gps=s.gps!==false;m.blips=s.blips?()=>s.blips(m):null;
  if(s.time!=null&&!retry)m.timer=s.time;else if(s.time===null)m.timer=null;
  if(s.checkpoint&&!retry){const c=player.car;m.cp={i,x:player.x,z:player.z,yaw:player.yaw,timer:m.timer,tod:tod,data:JSON.parse(JSON.stringify(m.data)),car:!!c}}
  if(s.enter)s.enter(m,!!retry);if(mission!==m)return;missionText(m);hudTimer(m.timer);
  if(s.say&&!retry){const l=typeof s.say==='function'?s.say(m):s.say;if(l)subtitle(l[1],l[2]||4.5,l[0])}}
function missionNext(){if(mission)missionGoto(mission.i+1)}
function missionTick(dt){dlgTick(dt);markers();const m=mission;
  if(!m){if(performance.now()>lastMarker&&!player.car&&!DLG.open&&running)for(const M of MISSIONS){if(M.hidden&&M.hidden())continue;const a=M.at();if(Math.hypot(a.x-player.x,a.z-player.z)<1.7){lastMarker=performance.now()+6000;missionOffer(M);break}}return}
  if(m.over||m.quiet||!m.step)return;m.t+=dt;m.st+=dt;const s=m.step;
  if(m.timer!=null&&!s.pauseTimer){m.timer-=dt;hudTimer(m.timer,s.warnAt);if(m.timer<=0){failMission(typeof m.M.timeFail==='function'?m.M.timeFail(m):(m.M.timeFail||'Out of time.'));return}}
  if(m.M.tick)m.M.tick(m,dt);if(mission!==m||m.over)return;
  if(s.tick)s.tick(m,dt);if(mission!==m||m.over||m.step!==s)return;
  if(s.fail){const r=s.fail(m);if(r){failMission(r);return}}
  if(typeof s.text==='function')missionText(m);
  if(s.type==='goto'){const a=s.at(m),p=s.inCar?player.car:(player.car||player);if(a&&p&&Math.hypot(a.x-p.x,a.z-p.z)<(s.r||3)&&(!s.stop||Math.abs((player.car&&player.car.vf)||0)<1.2)&&(!s.done||s.done(m,dt)))missionNext()}
  else if(s.type!=='interact'&&s.done&&s.done(m,dt))missionNext()}
function missionCleanup(){const m=mission;if(!m)return;if(m.step&&m.step.exit){try{m.step.exit(m)}catch(e){console.error(e)}}if(m.M.cleanup){try{m.M.cleanup(m)}catch(e){console.error(e)}}
  if(m.todRate0!=null&&typeof todRate!=='undefined')todRate=m.todRate0;mission=null;objective(null);hudTimer(null);hudGauge(null);hudDetect(null);$('meter').hidden=true;player.ball=false;player.frozen=false;lastMarker=performance.now()+6000}
function missionPass(){const m=mission;if(!m||m.over)return;m.over=true;const M=m.M;let pay=rewardFor(M),extra='';if(M.bonus){const b=M.bonus(m);if(b&&b[0]){pay+=b[0];extra=b[1]}}
  const secs=Math.round(m.t);missionCleanup();SAVE.done[M.id]=(SAVE.done[M.id]||0)+1;STATS.passed++;if(!SAVE.best[M.id]||secs<SAVE.best[M.id])SAVE.best[M.id]=secs;
  banner('MISSION COMPLETE',M.title,false,'+'+money2(pay)+(extra?'  ·  '+extra:''));setTimeout(()=>addMoney(pay,M.title),900);if(M.after)setTimeout(()=>subtitle(M.after[1],5,M.after[0]),4300);saveGame();
  const left=MISSIONS.filter(x=>!SAVE.done[x.id]).length;setTimeout(()=>toast(left?`${left} mission${left>1?'s':''} still to do — check the map`:'Every mission done. Kifisia is yours.','star'),5200)}
function failMission(reason){const m=mission;if(!m||m.over)return;m.over=true;STATS.failed++;dlgClose();$('meter').hidden=true;banner('MISSION FAILED',reason||'',true);
  setTimeout(()=>{if(mission!==m)return;sheet(`<div class="eyebrow bad">Mission failed</div><h2>${esc(m.M.title)}</h2><p>${esc(reason||'')}</p><div class="row"><button class="cta" id="fR" type="button">Try again${m.cp&&m.cp.i>0?' from checkpoint':''}</button><button class="cta alt" id="fQ" type="button">Quit mission</button></div>`,true);
    $('fR').onclick=()=>{closeSheet();retryMission()};$('fQ').onclick=()=>{closeSheet();quitMission()}},1700)}
function retryMission(){const m=mission;if(!m)return;const M=m.M,cp=m.cp||{i:0,x:player.x,z:player.z,yaw:player.yaw,timer:null,tod:tod,data:{}};
  fadeCut(()=>{if(mission!==m)return;if(m.step&&m.step.exit){try{m.step.exit(m)}catch(e){}}if(player.car&&!cp.car)exitCar(true);m.data=JSON.parse(JSON.stringify(cp.data));m.over=false;m.timer=cp.timer;if(M.time!=null)tod=cp.tod;
    hudGauge(null);hudDetect(null);$('meter').hidden=true;player.ball=false;player.busy=0;player.knock=0;player.frozen=false;ph.root.visible=true;ph.stop();
    if(!cp.car||!player.car)placePlayer(cp.x,cp.z,cp.yaw);if(M.retry)M.retry(m,cp);missionGoto(cp.i,true);hudTimer(m.timer)})}
function quitMission(){if(!mission)return;const t=mission.M.title;missionCleanup();toast('Mission abandoned: '+t,'info');saveGame()}
/* compatibility with older callers */
function endMission(ok,silent){if(!mission)return;if(ok)missionPass();else if(silent)missionCleanup();else failMission(mission.fail||'')}

/* ---------- world markers: mission starts and the current objective ---------- */
const MK={ready:false,starts:[],obj:null};
function markerInit(){MK.ready=true;const gc=document.createElement('canvas');gc.width=4;gc.height=64;const gg=gc.getContext('2d'),gr=gg.createLinearGradient(0,64,0,0);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.25,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');gg.fillStyle=gr;gg.fillRect(0,0,4,64);const gt=new THREE.CanvasTexture(gc);
  const beamG=new THREE.CylinderGeometry(1.05,1.05,1,28,1,true);beamG.translate(0,0.5,0);const ringG=new THREE.TorusGeometry(1.05,0.055,6,36);ringG.rotateX(Math.PI/2);
  const mk=(col,r,h)=>{const g=new THREE.Group();const beam=new THREE.Mesh(beamG,new THREE.MeshBasicMaterial({color:col,map:gt,transparent:true,opacity:0.55,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));beam.scale.set(r,h,r);const ring=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:col,fog:false}));ring.scale.setScalar(r);ring.position.y=0.06;g.add(beam,ring);g.visible=false;g.userData={beam,ring};scene.add(g);return g};
  MISSIONS.forEach(M=>{const g=mk(0xffc832,1,2.2);const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.fillStyle='#ffc832';x.beginPath();x.arc(48,48,44,0,TAU);x.fill();x.fillStyle='#10151b';x.beginPath();x.arc(48,48,37,0,TAU);x.fill();x.fillStyle='#ffc832';x.font='700 54px "Barlow Condensed",Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(M.icon,48,51);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthWrite:false,fog:false}));sp.scale.set(0.9,0.9,1);sp.position.y=2.75;g.add(sp);MK.starts.push({M,g})});
  MK.obj=mk(0xffc832,0.75,9)}
function markers(){if(!MK.ready){if(!MAPV.ready||!MISSIONS.length)return;markerInit()}const t=performance.now()/1000;
  for(const s of MK.starts){const show=!mission&&!player.interior&&!(s.M.hidden&&s.M.hidden());s.g.visible=show;if(show){const a=s.M.at();s.g.position.set(a.x,groundY(a.x,a.z),a.z);s.g.userData.ring.rotation.y=t*0.8;s.g.userData.beam.material.opacity=0.42+Math.sin(t*2.4)*0.1}}
  const o=MK.obj;let tg=null;if(mission&&!mission.over&&!mission.quiet&&mission.target&&mission.step&&mission.step.marker!==false)tg=mission.target();
  if(tg&&!player.interior){o.visible=true;const r=mission.step.mr||0.75;o.position.set(tg.x,groundY(tg.x,tg.z),tg.z);o.userData.beam.scale.set(r,9,r);o.userData.ring.scale.setScalar(r*(1+Math.sin(t*3)*0.06));o.userData.beam.material.opacity=0.4+Math.sin(t*3)*0.12}else o.visible=false}
