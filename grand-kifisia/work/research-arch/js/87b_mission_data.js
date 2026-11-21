'use strict';
/* Grand Kifisia — the missions (data + their small bespoke pieces). Format and how to add one: docs/GAMEPLAY.md.
   Everything here goes through the framework in 87_missions.js: MISSIONS.push({id,title,icon,sub,reward,brief,at(),steps:[…],…}). */

/* ============================== HELPERS ============================== */
const XZ=a=>({x:a[0],z:a[1]});
/* a free spot on the pavement near (x,z), between r0 and r1 metres away */
function paveNear(x,z,r0,r1,anyGround){for(let r=r0||0;r<=(r1||8);r+=1.1)for(let k=0;k<14;k++){const a=k/14*TAU+r*0.7,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;if((anyGround||lvl(px,pz)>0.1)&&inPlay(px,pz)&&!collide({x:px,z:pz},0.7,null))return{x:px,z:pz};if(r===0)break}return anyGround?{x,z}:paveNear(x,z,r0,r1,true)}
const poiNamed=re=>POIS.find(P=>re.test(P.name))||null;
/* mission-owned people (not part of the street crowd): {h,x,z,yaw} */
function mPed(spec,x,z,yaw,action,opt){let h;try{h=new Ped(spec,true)}catch(e){h=new Ped(randomLook(),true)}h.root.position.set(x,groundY(x,z),z);h.root.rotation.y=yaw||0;if(action)h.play(action,opt);return{h,x,z,yaw:yaw||0}}
function mPedTick(p,dt,spd){if(!p)return;p.h.root.position.set(p.x,groundY(p.x,p.z),p.z);p.h.root.rotation.y=p.yaw;p.h.update(dt,spd||0,false)}
function mPedFree(p){if(!p||!p.h)return;try{p.h.dispose()}catch(e){p.h.root.visible=false}}
const faceTo=(p,x,z)=>Math.atan2(x-p.x,z-p.z);
/* tweens on the simulation clock: tween(seconds, u=>…, done) */
const TWEENS=[];function tween(secs,fn,done){TWEENS.push({t:0,secs,fn,done})}
FRAME_HOOKS.push(dt=>{for(let i=TWEENS.length-1;i>=0;i--){const o=TWEENS[i];o.t+=dt;const u=Math.min(1,o.t/o.secs);o.fn(u);if(u>=1){TWEENS.splice(i,1);if(o.done)o.done()}}});
const mythosDoor=()=>XZ(SPECIAL.mythos.door);
const stationDoorPt=()=>STATION.front?{x:STATION.front.x,z:STATION.front.z}:XZ(MAP.key.station);

/* ============================== THE SCHOOL FENCE (always climbable, so nobody is ever locked in or out) ============================== */
function fenceNear(){const ps=ISA.poly;if(!ps)return null;let best=null,bd=1.7;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1,u=clamp(((player.x-a[0])*dx+(player.z-a[1])*dz)/L2,0.02,0.98),qx=a[0]+dx*u,qz=a[1]+dz*u,d=Math.hypot(player.x-qx,player.z-qz);if(d<bd){bd=d;best={x:qx,z:qz}}}return best}
function climbFence(q){const dx=q.x-player.x,dz=q.z-player.z,l=Math.hypot(dx,dz)||1,tx=q.x+dx/l*1.15,tz=q.z+dz/l*1.15,sx=player.x,sz=player.z,y0=groundY(sx,sz),y1=groundY(tx,tz);
  player.busy=1.3;player.yaw=Math.atan2(dx,dz);ph.play('climb',true);sfx('swish');
  tween(1.15,u=>{const e=sstep(u);player.x=lerp(sx,tx,e);player.z=lerp(sz,tz,e);player.y=lerp(y0,y1,e)+Math.sin(u*Math.PI)*2.15},()=>{ph.stop();placePlayer(tx,tz,null,true);player.busy=0;if(typeof ambLand==='function')ambLand();gameEvent('fence',{inside:pip(ISA.poly,tx,tz)})})}
onGame('interactions',d=>{if(player.interior||player.ball)return;const q=fenceNear();if(q)d.opts.push({label:ISA.inside?'Climb out over the fence':'Climb the fence',fn:()=>climbFence(q),low:!(mission&&mission.id==='isa')})});

/* ============================== 1 · GYRO RUN ============================== */
MISSIONS.push({id:'gyro',title:'Gyro Run',icon:'G',sub:'Mythos Plus · Kassaveti',giver:'Nikos',reward:20,onFoot:true,
  brief:'Nikos is keeping a spot at Platanos Square and he is starving. Get two pita gyros from Mythos Plus — and bring them over while they are still hot.',
  at:()=>{const s=SPECIAL.mythos;return paveNear(s.door[0]+s.nx*4.5-s.nz*3.5,s.door[1]+s.nz*4.5+s.nx*3.5,0,6)},
  setup(m){const P=MAP.key.platanos,sp=paveNear(P[0]+5,P[1]+3,1.5,12);m.o.spot=sp;m.o.nikos=mPed({av:'m09',tint:['#3b5b8c',null],seed:9},sp.x,sp.z,0,'wait')},
  tick(m,dt){const n=m.o.nikos;if(!n)return;const d=Math.hypot(player.x-n.x,player.z-n.z);if(d<25){n.yaw+=wrapA(faceTo(n,player.x,player.z)-n.yaw)*Math.min(1,dt*4);if(d<12&&m.i===2&&!m.o.waved){m.o.waved=1;n.h.play('wave');after(2.2,()=>{if(n.h.override==='wave')n.h.play('wait')})}}mPedTick(n,dt)},
  cleanup(m){mPedFree(m.o.nikos);hudGauge(null)},
  steps:[
   {type:'goto',checkpoint:true,text:'Go to <b>Mythos Plus</b> on Kassaveti.',at:mythosDoor,r:3.6,say:['Nikos','Two with everything. And hurry — I am fading away here.',4.5]},
   {text:()=>hasInterior('mythos')&&player.interior!=='mythos'?'Go into <b>Mythos Plus</b> and order at the counter.':'Order a <b>pita gyro</b> to take away.',at:mythosDoor,needs:{shop:'mythos',tag:'gyro'},
    on:{buy(m,d){if(d.shop!=='mythos'||d.tag!=='gyro')return;d.eat=false;subtitle('Two pita gyros, wrapped in paper. They smell unbelievable.',3.5);missionNext()}}},
   {type:'goto',onFoot:true,checkpoint:true,time:80,warnAt:15,text:'Bring the gyros to <b>Nikos</b> at Platanos Square while they are <b>hot</b>.',at:m=>m.o.spot,r:2.4,
    tick(m){const h=clamp(m.timer/80,0,1);m.data.hot=h;hudGauge('Hot',h,h>0.5?'#ff8a3d':h>0.25?'#ffc832':'#6aa8ff')},exit(m){hudGauge(null)}},
   {text:'Lunch at Platanos Square.',gps:false,enter(m){m.timer=null;hudTimer(null);const n=m.o.nikos;player.yaw=faceTo(player,n.x,n.z);
      say('Nikos',m.data.hot>0.5?'Ela! Still steaming. You are a hero, file mou.':'Hm. Lukewarm. But I am too hungry to complain — thanks.',[{t:'Kali orexi!',f:()=>{m.data.eat=1}}]);},
    tick(m){if(m.data.eat===1&&!DLG.open){m.data.eat=2;player.busy=2.8;ph.play('eat');m.o.nikos.h.play('eat');STATS.gyros++;after(2.8,()=>{if(ph.override==='eat')ph.stop();if(mission===m)m.data.eat=3})}},done:m=>m.data.eat===3}],
  timeFail:'The gyros went cold. Nikos bought a koulouri instead.',
  bonus:m=>m.data.hot>0.5?[5,'Still hot']:null,
  after:['Nikos','Next round is on me. Probably.']});

/* ============================== 2 · LINE 1 TO THE MALL ============================== */
function platformSpot(){const m=STATION.mid,s=STATION.side||1;return m?{x:m[0]-Math.cos(m[2])*s*5,z:m[1]+Math.sin(m[2])*s*5}:stationDoorPt()}
function trainDoor(){let best=null,bd=1e9;for(const c of TRAIN.cars){const d=Math.hypot(c.position.x-player.x,c.position.z-player.z);if(d<bd){bd=d;best=c}}return best?{x:best.position.x,z:best.position.z,d:bd}:null}
function boardTrain(m){const car=TRAIN.cars[Math.min(2,TRAIN.cars.length-1)],c0=car.position.clone(),side=STATION.side||1,mid=STATION.mid;
  player.busy=99;ph.root.visible=false;TRAIN.hold=false;TRAIN.state='dwell';TRAIN.t=42;sfx('door');subtitle('Stand clear of the closing doors, please.',3,'Line 1');STATS.rides++;
  const ox=-Math.cos(mid[2])*side*13,oz=Math.sin(mid[2])*side*13,cy=terr(c0.x,c0.z);let first=true;
  camCut(10,(t,dt)=>{const p=car.position;if(first){first=false;camera.position.set(c0.x+ox,cy+3.2,c0.z+oz)}camera.position.y+=(cy+5.5-camera.position.y)*Math.min(1,dt*0.5);camera.lookAt(p.x,cy+2.2,p.z);if(camera.fov!==46){camera.fov=46;camera.updateProjectionMatrix()}},{title:'Line 1',sub:'Kifisia → KAT → Marousi → Neratziotissa'})
   .then(()=>fadeCut(()=>{if(mission!==m)return;player.busy=0;ph.root.visible=true;const s=paveNear(stationDoorPt().x,stationDoorPt().z,0,6);placePlayer(s.x,s.z);tod=(tod+3)%24;m.data.arrived=1}))}
MISSIONS.push({id:'train',title:'Line 1 to the Mall',icon:'M',sub:'Kifisia station · Line 1',reward:30,onFoot:true,noWeapons:true,
  brief:'Everyone is meeting at The Mall Athens. Walk to Kifisia station, buy a ticket, validate it and take the Line 1 train towards Piraeus — the mall is at the Neratziotissa stop.',
  at:()=>paveNear(stationDoorPt().x,stationDoorPt().z,0,6),
  cleanup(m){TRAIN.hold=false;if(player.busy>50){player.busy=0;ph.root.visible=true}},
  steps:[
   {type:'interact',checkpoint:true,text:'Buy a ticket at the <b>ticket machine</b> in Kifisia station.',at:()=>STATION.machine||stationDoorPt(),r:2.6,label:'Buy a ticket · €1.20',
    use(m){if(player.money<1.2)subtitle('The machine swallows your last coins and prints a ticket anyway. Lucky day.',3.5);else{addMoney(-1.2,'Ticket');subtitle('One 90-minute ticket.',2.5)}sfx('buy')}},
   {type:'interact',text:'Validate the ticket at the <b>yellow validator</b>.',at:()=>STATION.validator||stationDoorPt(),r:2.4,label:'Validate the ticket',use(){if(typeof uiSound==='function')uiSound('beep');subtitle('Beep. Valid for 90 minutes.',2.5)}},
   {checkpoint:true,text:()=>TRAIN.state==='dwell'?'<b>Board the train</b> to Piraeus — walk up to a carriage.':TRAIN.state==='arrive'?'The train is pulling in. Stand back from the platform edge.':'Wait on the platform for the <b>next train</b>.',
    at:()=>{if(TRAIN.state==='dwell'){const d=trainDoor();if(d)return d}return platformSpot()},marker:false,
    tick(m){if(TRAIN.state==='away'&&(TRAIN.next||25)-TRAIN.t>14)TRAIN.next=TRAIN.t+14;if(TRAIN.state==='dwell')TRAIN.hold=true},
    opts(m,opts){if(TRAIN.state!=='dwell'||lvl(player.x,player.z)<0.4)return;const d=trainDoor();if(d&&d.d<9.5)opts.unshift({label:'Board the train',fn:()=>{if(mission===m)missionNext()}})}},
   {gps:false,text:null,enter(m){boardTrain(m)},done:m=>!!m.data.arrived}],
  after:['You','Three hours, two ice creams and one cinema ticket later: back in Kifisia.']});

/* ============================== 3 · WALK TO SCHOOL ============================== */
const SCHOOL={pts:null,cum:null,legs:[
  [165,'Kassaveti Street. The cafés are only just putting their chairs out.'],
  [285,'Levidou behind you — now Kolokotroni Street, the long one, all the way to Kefalari.'],
  [560,'Halfway along Kolokotroni. Shop windows on both sides, nobody awake yet.'],
  [850,'Filadelfeos Street. The Theoxenia Palace hotel — Kefalari Square is just ahead.'],
  [985,'Kefalari Square. Across the square, then Charilaou Trikoupi and Diligianni.'],
  [1160,'Artemidos Street. The school is at the end of the road.']]};
function schoolInit(){if(SCHOOL.pts)return;SCHOOL.pts=unp(MAP.route);SCHOOL.cum=cumlen(SCHOOL.pts);SCHOOL.L=SCHOOL.cum[SCHOOL.cum.length-1]}
function schoolPt(s){schoolInit();const p=atLen(SCHOOL.pts,SCHOOL.cum,Math.min(s,SCHOOL.L));return{x:p[0],z:p[1]}}
(function(){const T=420,steps=[];
  SCHOOL.legs.forEach((l,i)=>steps.push({type:'goto',onFoot:true,checkpoint:true,r:11,mr:3.5,time:i===0?T:undefined,warnAt:45,at:()=>schoolPt(l[0]),path:()=>(schoolInit(),SCHOOL.pts),
    text:()=>player.car?'<b>On foot!</b> Leave the car — this is the walk to school.':`Walk to school: <b>${i<2?'Kassaveti and Levidou':i<4?'along Kolokotroni':i<5?'Kefalari Square':'up Artemidos'}</b>. The bell rings at <b>08:30</b>.`,
    say:i===0?['You','07:50 at Platanos Square. The bell at ISA rings at 08:30 — move.',4.5]:['You',SCHOOL.legs[i-1][1],4.5]}));
  steps.push({type:'goto',onFoot:true,checkpoint:true,r:7,mr:3,warnAt:45,at:()=>XZ(MAP.isa.gate),path:()=>(schoolInit(),SCHOOL.pts),text:'The gate of the <b>International School of Athens</b> is right ahead. Run!',say:['You',SCHOOL.legs[SCHOOL.legs.length-1][1],4.5]});
  MISSIONS.push({id:'school',title:'Walk to School',icon:'S',sub:'Platanos Square → International School of Athens',reward:35,time:7.833,todRate:(40/60)/T,timeLabel:'07:50',onFoot:true,noWeapons:true,
    brief:'Monday, 07:50. The first bell at the International School of Athens rings at 08:30 and you are still at Platanos Square. Walk the real way to school: Kassaveti, Levidou, the whole of Kolokotroni, Kefalari Square and up Artemidos — 1.3 kilometres.',
    at:()=>{schoolInit();return paveNear(SCHOOL.pts[0][0]-4,SCHOOL.pts[0][1]-6,0,8)},
    focus:()=>XZ(MAP.key.platanos),steps,
    retry(m,cp){const a=m.M.steps[cp.i].at(m),need=Math.hypot(a.x-cp.x,a.z-cp.z);let rest=0;schoolInit();const q=navNearestRoute(cp.x,cp.z);rest=(SCHOOL.L-q)/4.7+12;m.timer=Math.max(m.timer||0,rest,need/4.7+10)},
    timeFail:'08:30. The bell rang and the gate closed without you.',
    bonus:m=>m.timer>70?[10,'Early bird']:null,
    passed(){if(typeof uiSound==='function')uiSound('bell')},
    after:['Ms. Papadaki','Just in time. Kalimera — in you go.']})})();
/* distance along the school route of the point nearest to (x,z) */
function navNearestRoute(x,z){const ps=SCHOOL.pts,cum=SCHOOL.cum;let bd=1e9,bs=0;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1e-9,u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1),d=Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u);if(d<bd){bd=d;bs=cum[i]+u*Math.sqrt(L2)}}return bs}

/* ============================== 4 · A GYRO FOR A STRANGER ============================== */
const STRANGER={n:null,story:0,
  lines:['Kalimera, my friend. Do not mind me — I am only watching Kifisia go by.','Forty years I set type for a newspaper downtown. Lead letters, one by one. Then the machines came.','The girls from the shop bring me water when it is hot. Good kids.'],
  tale:['I was a typesetter. Forty years of other people’s headlines, backwards and in lead. I can still read a page in a mirror faster than you can read it straight.',
    'When the paper closed I thought: a few months. Then the crisis came, then the rent, then my Maria got ill. Things go slowly, and then they go all at once.',
    'But look — the plane trees, the people, the smell from Mythos. A man can lose a house and still keep his manners. Thank you for asking. Not many do.']};
function strangerNpc(){if(STRANGER.n)return STRANGER.n;let n=typeof castNpc==='function'?castNpc('homeless'):null;
  if(!n){/* fallback when the characters module has no such cast member: a man sitting against the wall beside the cosmetics store */
    const P=poiNamed(/sephora/i)||poiNamed(/hondos/i),K=MAP.key.sephora;let x=K?K[0]:268,z=K?K[1]:-1,yaw=0;if(P&&!K){x=P.x-P.nz*2.6-P.nx*0.25;z=P.z+P.nx*2.6-P.nz*0.25;yaw=Math.atan2(P.nx,P.nz)}
    let h;try{h=new Ped({av:'m05',tint:['#8d8a80','#6f6a62'],posture:0.1},true)}catch(e){h=new Ped(randomLook(),true)}h.root.position.set(x,groundY(x,z),z);h.root.rotation.y=yaw;try{h.play('sit_ground')}catch(e){}
    n={h,x,z,yaw,state:'still',static:'sit_ground',name:'Mr. Lefteris',lines:STRANGER.lines,timer:0,panic:0,helped:{}};NPCS.push(n)}
  n.dialog=strangerTalk;n.noPunch=true;n.useLabel='Talk to '+(n.name||'Mr. Lefteris');STRANGER.n=n;return n}
function strangerGive(what){const r=typeof castGive==='function'&&castNpc('homeless')?castGive('homeless',what):null;return r&&r.line?r.line:(what==='food'?'For me? …Thank you. I will remember this, my friend.':'God bless you, paidi mou. Truly.')}
function strangerTalk(p){const name=p.name||'Mr. Lefteris',m=mission&&mission.id==='stranger'?mission:null,o={npc:p};
  if(m){if(m.i===0){strangerAsk(m,p);return}if(m.i===2){strangerHand(m,p);return}say(name,'Take your time, my friend. I am not going anywhere.',null,o);return}
  const l=(typeof npcSay==='function'&&npcSay(p))||STRANGER.lines[(p.talks-1)%STRANGER.lines.length];
  const coin=()=>{if(player.money<1){say(name,'Keep it, paidi mou. Today you need it more than I do.',null);return}addMoney(-1,'Given');STATS.given+=1;say(name,strangerGive('coin'),[{t:'Na eisai kala.',f:null}])};
  const tale=()=>{const i=STRANGER.story++%STRANGER.tale.length;say(name,STRANGER.tale[i],i<STRANGER.tale.length-1?[{t:'And then?',f:tale},{t:'Thank you for telling me.',f:null}]:[{t:'Thank you for telling me.',f:null}])};
  const food=()=>say(name,'I would not say no to a pita from Mythos… with everything. But only if it is no trouble.',[{t:'No trouble at all. Wait here.',f:()=>{dlgClose();startMission('stranger',{skipIntro:true,step:1})}},{t:'Maybe later.',f:null}]);
  say(name,l,[{t:'Give him €1',f:coin},{t:'Ask about his life',f:tale},{t:SAVE.done.stranger?'Bring him lunch again?':'Can I get you something to eat?',f:food}],o)}
function strangerAsk(m,p){say(p.name,'Kalimera. You look like someone with a question.',[{t:'Have you eaten today?',f:()=>say(p.name,'Since yesterday? A koulouri. I would not say no to a pita from Mythos… with everything. But only if it is no trouble.',[{t:'No trouble at all. Wait here.',f:()=>{dlgClose();if(mission===m)missionNext()}}])}],{npc:p})}
function strangerHand(m,p){m.data.given=1;say(p.name,strangerGive('food'),[{t:'Kali orexi, Mr. Lefteris.',f:()=>say(p.name,'You know what the best part is? Not the gyro. That somebody stopped. Have a beautiful day, my friend.',[{t:'You too. See you around.',f:()=>{dlgClose();m.data.done=1}}])}],{npc:p});
  try{if(p.h.setProp)p.h.setProp('pita')}catch(e){}}
MISSIONS.push({id:'stranger',title:'A Gyro for a Stranger',icon:'L',sub:'Kolokotroni · beside the cosmetics store',giver:'Mr. Lefteris',reward:25,onFoot:true,noWeapons:true,
  brief:'An old man sits beside the cosmetics store on Kolokotroni and watches Kifisia go by. His name is Mr. Lefteris. Ask him if he has eaten today — and do something about the answer.',
  at:()=>{const n=strangerNpc(),f=Math.sin(n.yaw||0),g=Math.cos(n.yaw||0);return paveNear(n.x+f*1.9-g*1.6,n.z+g*1.9+f*1.6,0,5)},
  focus:()=>{const n=strangerNpc();return{x:n.x,z:n.z}},
  cleanup(m){const n=STRANGER.n;if(n&&m.data.given){after(40,()=>{try{if(n.h.setProp)n.h.setProp(null)}catch(e){}})}},
  steps:[
   {type:'interact',checkpoint:true,text:'Talk to <b>Mr. Lefteris</b>, the man sitting beside the cosmetics store.',at:()=>strangerNpc(),r:2.7,label:'Talk to Mr. Lefteris',use(m){talkTo(strangerNpc());return false}},
   {checkpoint:true,text:()=>hasInterior('mythos')&&player.interior!=='mythos'?'Go into <b>Mythos Plus</b> and order a <b>pita gyro</b> for Mr. Lefteris.':'Buy a <b>pita gyro</b> at <b>Mythos Plus</b> for Mr. Lefteris.',at:mythosDoor,needs:{shop:'mythos',tag:'gyro'},
    say:['You','Mythos is two minutes down Kolokotroni and Levidou. He will have it hot.',4],
    on:{buy(m,d){if(d.shop!=='mythos'||d.tag!=='gyro')return;d.eat=false;subtitle('One pita gyro with everything, wrapped to go.',3);missionNext()}}},
   {type:'interact',checkpoint:true,text:'Bring the gyro back to <b>Mr. Lefteris</b>.',at:()=>strangerNpc(),r:2.7,label:'Give him the gyro',use(m){talkTo(strangerNpc());return false}},
   {gps:false,text:null,done:m=>!!m.data.done&&!DLG.open}],
  on:{},
  after:['Eleni · shop assistant','We saw that from the window. Take this — we collected it for the next person who stops. Today that was you.']});
/* step 2 of the mission is entered at index 2 → strangerTalk() hands the food over */

/* ============================== 5 · AFTER HOURS AT ISA ============================== */
const HOOP={ball:null,guard:null,G:9.8};
function isaCourt(o){const hs=HOOPS.filter(h=>h.isa);const gate=MAP.isa.gate;let hoop=null,bd=-1;for(const h of(hs.length?hs:HOOPS)){const d=Math.hypot(h.x-gate[0],h.z-gate[1]);if(d>bd){bd=d;hoop=h}}
  o.hoop=hoop;let pit=null,pd=1e9;for(const p of MAP.pitches){const d=Math.hypot(p[0]-hoop.x,p[1]-hoop.z);if(d<pd){pd=d;pit=p}}
  o.court=pit&&pd<30?{x:pit[0],z:pit[1],L:pit[2],W:pit[3],a:pit[4]}:{x:hoop.x,z:hoop.z+6,L:24,W:14,a:Math.PI/2}}
function isaSetup(m){const o=m.o;isaCourt(o);
  if(!HOOP.ball){HOOP.ball=new THREE.Mesh(new THREE.SphereGeometry(0.12,16,12),new THREE.MeshLambertMaterial({color:0xd8641e,emissive:0x3a1a08}));scene.add(HOOP.ball)}
  if(!HOOP.guard){let h;try{h=new Ped('guard',true)}catch(e){h=new Ped({fem:false,cap:true},true)}
    const fl=new THREE.Mesh(new THREE.ConeGeometry(3.4,11.5,24,1,true),new THREE.MeshBasicMaterial({color:0xfff0b0,transparent:true,opacity:0.13,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false}));fl.geometry.translate(0,-5.75,0);fl.rotation.x=-Math.PI/2-0.1;fl.position.set(0.18,1.25,0.35);
    const piv=new THREE.Group();piv.add(fl);h.root.add(piv);HOOP.guard={h,piv,a:0,x:0,z:0,yaw:0}}
  o.ball=HOOP.ball;o.guard=HOOP.guard;o.ball.visible=true;o.guard.h.root.visible=true;isaReset(m)}
function isaReset(m){const o=m.o,c=o.court;o.ball.position.set(c.x,groundY(c.x,c.z)+0.12,c.z);o.th=null;o.meter=null;o.det=0;o.seenT=0;hudDetect(null);$('meter').hidden=true;player.ball=false;player.hold=false;
  /* the guard starts on the far side of his round from the player */
  const g=o.guard,ca=Math.cos(c.a),sa=Math.sin(c.a),lx=(player.x-c.x)*ca+(player.z-c.z)*sa,lz=-(player.x-c.x)*sa+(player.z-c.z)*ca;g.a=Math.atan2(lz,lx)+Math.PI;isaGuardPos(o)}
function isaGuardPos(o){const c=o.court,g=o.guard,ca=Math.cos(c.a),sa=Math.sin(c.a),ru=c.L/2-1.2,rv=c.W/2+2.6,u=Math.cos(g.a)*ru,v=Math.sin(g.a)*rv;g.x=c.x+ca*u-sa*v;g.z=c.z+sa*u+ca*v;
  const du=-Math.sin(g.a)*ru,dv=Math.cos(g.a)*rv;g.yaw=Math.atan2(ca*du-sa*dv,sa*du+ca*dv);g.ru=ru;g.rv=rv}
function isaTick(m,dt){const o=m.o,g=o.guard,c=o.court,b=o.ball;if(!g)return;
  /* guard: walks his round at walking pace, sweeping the torch from side to side */
  isaGuardPos(o);const sp=1.45,ds=Math.hypot(Math.sin(g.a)*g.ru,Math.cos(g.a)*g.rv)||1;g.a+=sp*dt/ds;const sweep=Math.sin(m.t*0.8)*0.45;g.piv.rotation.y=sweep;
  g.h.root.position.set(g.x,groundY(g.x,g.z),g.z);g.h.root.rotation.y=g.yaw;g.h.update(dt,sp,false);
  if(m.i>=2&&ISA.inside){const px=player.x-g.x,pz=player.z-g.z,d=Math.hypot(px,pz)||1,ty=g.yaw+sweep,ang=Math.acos(clamp((px*Math.sin(ty)+pz*Math.cos(ty))/d,-1,1));
    const seen=d<11&&ang<0.4&&rayHit(g.x,g.z,player.x,player.z)>=1;o.det=clamp(o.det+(seen?dt*(1.7-d*0.09):-dt*0.45),0,1);hudDetect(o.det);if(o.det>m.data.maxDet)m.data.maxDet=o.det;
    if(seen&&o.det>0.45&&m.t>o.seenT){o.seenT=m.t+6;subtitle('Hey! Is somebody there?',2.5,'Security guard')}
    if(o.det>=1){failMission('The security guard caught you in his torch beam.');return}}else if(o.det>0){o.det=Math.max(0,o.det-dt*0.5);hudDetect(o.det)}
  /* ball in hand: dribble beside the player (or held up while aiming) */
  if(player.ball&&!o.th){const s=Math.sin(player.yaw),co=Math.cos(player.yaw);if(o.meter){b.position.set(player.x+s*0.25,player.y+1.95,player.z+co*0.25)}
    else{o.drib=(o.drib||0)+dt*(player.mv>3?7.5:5.6);const hgt=Math.abs(Math.sin(o.drib));if(hgt<0.12&&!o.dribS){o.dribS=1;if(typeof uiSound==='function')uiSound('bounce')}else if(hgt>0.5)o.dribS=0;b.position.set(player.x+s*0.42-co*0.28,player.y+0.14+hgt*0.72,player.z+co*0.42+s*0.28)}}
  /* aim meter */
  if(o.meter){o.meter.t+=dt;const ph_=(o.meter.t*o.meter.spd)%2,v=ph_<1?ph_:2-ph_;o.meter.v=v;$('mNeedle').style.left=`calc(${(v*100).toFixed(1)}% - 2px)`;if(o.meter.t>7){o.meter=null;$('meter').hidden=true;player.hold=false}}
  /* ball in flight */
  const th=o.th;if(th){const gy=groundY(b.position.x,b.position.z)+0.12;th.t+=dt;th.vy-=HOOP.G*dt;b.position.x+=th.vx*dt;b.position.y+=th.vy*dt;b.position.z+=th.vz*dt;
    if(!th.at&&th.t>=th.T){th.at=1;const h=o.hoop;if(th.hit){b.position.set(h.x,h.y-0.05,h.z);th.vx*=0.12;th.vz*=0.12;th.vy=-2.6;isaScore(m,th.perfect)}
      else{const a=Math.random()*TAU;th.vx=Math.cos(a)*2.2-th.vx*0.25;th.vz=Math.sin(a)*2.2-th.vz*0.25;th.vy=2.4;if(typeof uiSound==='function')uiSound('rim');subtitle(pick(['Rim out.','Off the iron.','So close.']),1.4)}}
    if(b.position.y<gy){b.position.y=gy;if(th.vy<-1.2){th.vy=-th.vy*0.55;th.vx*=0.7;th.vz*=0.7;if(typeof uiSound==='function')uiSound('bounce')}else{th.vy=0;th.vx*=1-Math.min(1,dt*3);th.vz*=1-Math.min(1,dt*3);if(th.at&&Math.hypot(th.vx,th.vz)<0.25)o.th=null}}
    if(th.t>9)o.th=null;if(!o.th&&ISA.poly&&!pip(ISA.poly,b.position.x,b.position.z))b.position.set(c.x,groundY(c.x,c.z)+0.12,c.z)}
  /* pick the ball up by walking over it */
  if(m.i===2&&!player.ball&&!o.th&&player.busy<=0&&Math.hypot(b.position.x-player.x,b.position.z-player.z)<1.25){player.ball=true;o.drib=0;if(typeof uiSound==='function')uiSound('bounce')}}
function isaScore(m,perfect){const o=m.o;m.data.score++;STATS.baskets++;if(m.cp)m.cp.data.score=m.data.score;if(typeof uiSound==='function')uiSound('net');if(SETTINGS.haptics&&navigator.vibrate){try{navigator.vibrate(perfect?[30,40,60]:40)}catch(e){}}
  subtitle(perfect?pick(['Nothing but net!','Perfect release.','Swish!']):pick(['Bucket!','It drops.','Good — off the glass.']),1.8);if(m.data.score<3)toast(m.data.score+' / 3 baskets','ball')}
/* the SHOOT button: first press starts the aim meter, second press releases the shot */
function shootBall(){const m=mission;if(!m||m.id!=='isa'||!player.ball||player.busy>0||m.over)return;const o=m.o,h=o.hoop,d=Math.hypot(h.x-player.x,h.z-player.z);
  if(!o.meter){if(d>9.5){subtitle('Too far out — get closer to the hoop.',1.8);return}if(d<1.7){subtitle('Too close — take a step back.',1.8);return}
    const zone=clamp(0.36-d*0.024,0.13,0.32);o.meter={t:0,zone,spd:1.25+d*0.09,v:0};$('mZone').style.left=(50-zone*50)+'%';$('mZone').style.width=(zone*100)+'%';$('mPerf').style.left=(50-zone*9)+'%';$('mPerf').style.width=(zone*18)+'%';$('meter').hidden=false;player.hold=true;player.yaw=player.hdg=Math.atan2(h.x-player.x,h.z-player.z);return}
  const err=Math.abs(o.meter.v-0.5),hit=err<o.meter.zone/2,perfect=err<o.meter.zone*0.09;$('meter').hidden=true;o.meter=null;player.hold=false;player.ball=false;ph.play('shoot',true);player.busy=0.85;after(0.85,()=>{if(ph.override==='shoot')ph.stop()});sfx('swish');
  const b=o.ball,fx=b.position.x,fy=player.y+2.3,fz=b.position.z;let tx=h.x,tz=h.z,ty=h.y+0.06;if(!hit){const k=(o.meter&&0)||((err-0.0)*1.2),a=Math.random()*TAU;tx+=Math.cos(a)*(0.26+k*0.3);tz+=Math.sin(a)*(0.26+k*0.3)}
  const T=0.78+d*0.055;b.position.set(fx,fy,fz);o.th={t:0,T,vx:(tx-fx)/T,vz:(tz-fz)/T,vy:(ty-fy)/T+0.5*HOOP.G*T,hit,perfect,at:0}}
MISSIONS.push({id:'isa',title:'After Hours',icon:'B',sub:'International School of Athens · closed',reward:60,time:23.66,todRate:0.0015,timeLabel:'23:40',onFoot:true,noWeapons:true,
  brief:'It is almost midnight and the International School of Athens is locked. Get to the school, climb the fence, find the basketball on the real court and sink three shots. One guard walks his round with a torch — stay out of the beam.',
  at:()=>paveNear(MAP.isa.gate[0]-3.5,MAP.isa.gate[1],0,7,true),
  focus:()=>XZ(MAP.isa.gate),
  setup(m){m.data.score=0;m.data.maxDet=0;isaSetup(m)},
  tick:isaTick,
  retry(m){isaReset(m)},
  cleanup(m){const o=m.o;if(o.ball)o.ball.visible=false;if(o.guard)o.guard.h.root.visible=false;hudDetect(null);$('meter').hidden=true;player.ball=false;player.hold=false},
  steps:[
   {type:'goto',checkpoint:true,text:'It is 23:40 and the school is locked. Get to the <b>International School of Athens</b>.',at:()=>XZ(MAP.isa.gate),r:15,say:['You','One game. Three baskets. In and out before anyone notices.',4.5]},
   {text:'The gate is locked. Walk up to the fence and <b>climb over</b>.',at:()=>XZ(MAP.isa.gate),marker:false,done:()=>!!ISA.inside&&player.busy<=0},
   {checkpoint:true,text:m=>player.ball?(m.o.meter?'Tap <b>SHOOT</b> again when the needle is in the <b>green</b>.':`Get within range of the <b>hoop</b> and tap <b>SHOOT</b>. Baskets: <b>${m.data.score} / 3</b>`):`Pick up the <b>basketball</b>. Stay out of the <b>torch beam</b>. Baskets: <b>${m.data.score} / 3</b>`,
    at:m=>player.ball?{x:m.o.hoop.x,z:m.o.hoop.z}:{x:m.o.ball.position.x,z:m.o.ball.position.z},mr:0.6,gps:false,
    say:['You','There is the ball, in the middle of the court. Watch the guard.',4],
    opts(m,opts){if(player.ball&&Math.hypot(m.o.hoop.x-player.x,m.o.hoop.z-player.z)<9.5)opts.unshift({label:m.o.meter?'Release!':'Shoot',fn:shootBall})},
    done:m=>m.data.score>=3&&!m.o.th},
   {text:'Three baskets. Now <b>climb back out</b> before the guard comes round again.',at:()=>XZ(MAP.isa.gate),marker:false,enter(m){player.ball=false},done:()=>!ISA.inside&&player.busy<=0}],
  bonus:m=>m.data.maxDet<0.25?[15,'Never seen']:null,
  passed(){after(4.6,()=>fadeCut(()=>{tod=8.5;subtitle('The next morning.',3.5)},500))},
  after:['You','Nobody will ever believe this.']});

/* ============================== 6 · KEFALARI VALET ============================== */
const CARNAMES={hatch:'hatchback',sedan:'saloon',suv:'SUV',taxi:'taxi',van:'van'};
const exoticType=()=>Object.keys(CARTYPES).find(k=>CARTYPES[k].exotic||CARTYPES[k].supercar||/ferrari|lambo|super|sport|exotic|gt|roadster|coupe/i.test(k+' '+(CARTYPES[k].name||'')))||null;
const carName=c=>{const T_=CARTYPES[c.type]||{};return T_.name||CARNAMES[c.type]||c.type};
function valetStart(){const s=SPECIAL.starbucks;return paveNear(s.door[0]+s.nx*3.5+s.nz*5,s.door[1]+s.nz*3.5-s.nx*5,0,6)}
function valetHotel(){const P=poiNamed(/semiramis/i)||poiNamed(/theoxenia/i)||poiNamed(/pentelikon/i);const q=P?{x:P.x,z:P.z,name:P.name.replace(/,.*/,'')}:{x:MAP.key.kefalari[0],z:MAP.key.kefalari[1],name:'Kefalari Square'};const r=navNearest(q.x,q.z,true,120);q.dx=r?r.x:q.x;q.dz=r?r.z:q.z;return q}
function valetPickCar(a){const ex=exoticType();let best=null,bd=1e9;for(const c of CARS){if(c.mode!=='parked'&&c.mode!=='free')continue;const d=Math.hypot(c.x-a.x,c.z-a.z);if(d>450)continue;const w=d*(ex&&c.type===ex?0.2:1);if(w<bd){bd=w;best=c}}return best}
MISSIONS.push({id:'valet',title:'Kefalari Valet',icon:'V',sub:'Kassaveti → Kefalari',giver:'Mrs. Alexiou',reward:80,
  brief:'Mrs. Alexiou has a table waiting at a hotel in Kefalari and no time to drive. Take her car from Kassaveti to the hotel entrance — on time, and without a scratch. Every bump comes off your fee.',
  at:valetStart,
  setup(m){const a=valetStart(),c=valetPickCar(a);m.o.car=c;m.o.hotel=valetHotel();m.data.cond=1;if(!c)return;m.data.c0=[c.x,c.z,c.yaw];m.o.lady=mPed('biz_f',a.x,a.z,faceTo(a,player.x,player.z),'phone');const h=m.o.hotel,sp=paveNear(h.x,h.z,0,7);m.o.doorman=mPed('biz_m',sp.x,sp.z,faceTo(sp,h.dx,h.dz),'wait')},
  focus:m=>m.o.car?{x:m.o.car.x,z:m.o.car.z}:null,
  tick(m,dt){mPedTick(m.o.lady,dt);mPedTick(m.o.doorman,dt);if(!m.o.car){toast('No car is parked nearby right now — try again in a moment.','info');quitMission()}},
  retry(m){const c=m.o.car,p=m.data.c0;if(player.car===c)exitCar(true);c.x=p[0];c.z=p[1];c.yaw=p[2];c.vf=0;c.vr=0;c.mode='parked';syncCar(c);m.data.cond=1;m.o.pv=0;hudGauge(null)},
  cleanup(m){mPedFree(m.o.lady);mPedFree(m.o.doorman);hudGauge(null)},
  steps:[
   {checkpoint:true,text:m=>`Get into Mrs. Alexiou’s <b>${carName(m.o.car)}</b>.`,at:m=>({x:m.o.car.x,z:m.o.car.z}),mr:1.6,
    say:m=>['Mrs. Alexiou',`The ${carName(m.o.car)}, just there. The ${m.o.hotel.name}, please — and if I find one scratch, I will know.`,5],
    tick(m){if(player.car&&player.car!==m.o.car&&m.st>1&&!m.o.wrong){m.o.wrong=1;subtitle('Wrong car. Hers is the one with the gold marker.',3)}},done:m=>player.car===m.o.car},
   {type:'goto',inCar:true,stop:true,r:9,mr:4,text:m=>player.car===m.o.car?`Drive to the <b>${m.o.hotel.name}</b> near Kefalari. Stop at the entrance. <b>No scratches.</b>`:'Get back into <b>the car</b>.',
    at:m=>player.car===m.o.car?{x:m.o.hotel.dx,z:m.o.hotel.dz,drive:true}:{x:m.o.car.x,z:m.o.car.z},
    enter(m,retry){const c=m.o.car,h=m.o.hotel,r=route(c.x,c.z,h.dx,h.dz,'drive');m.timer=Math.round((r?r.len:900)/8.2+45);m.data.T=m.timer;m.o.pv=0;m.o.cool=0;m.o.cs=camShake;hudGauge('Condition',m.data.cond,'#8fe38a')},
    tick(m,dt){const c=m.o.car;if(player.car!==c){m.o.pv=0;return}const v=c.vf||0,pv=m.o.pv||0;m.o.cool-=dt;let hit=0;
      if(Math.abs(pv)>1.5&&v*pv<0&&Math.abs(v)<Math.abs(pv))hit=Math.abs(pv)*0.032;else if(Math.abs(pv)>3&&Math.abs(v)<Math.abs(pv)*0.68)hit=Math.abs(pv)*0.02;else if(camShake>m.o.cs+0.15)hit=camShake*0.18;
      m.o.cs=camShake;m.o.pv=v;if(hit>0&&m.o.cool<=0){m.o.cool=0.5;m.data.cond=Math.max(0,m.data.cond-Math.max(0.04,hit));hudGauge('Condition',m.data.cond,m.data.cond>0.6?'#8fe38a':m.data.cond>0.3?'#ffc832':'#ff4d3d');hudHurt(8);toast(pick(['That will show.','Careful!','There goes the paintwork.']),'info')}},
    fail:m=>m.data.cond<=0?'The car is a wreck. Mrs. Alexiou is going to need a taxi — and a lawyer.':null,exit(m){}},
   {gps:false,text:null,enter(m){m.timer=null;hudTimer(null);const c=m.o.car;c.vf=0;if(player.car===c)exitCar(true);const d=m.o.doorman;if(d)player.yaw=faceTo(player,d.x,d.z);const k=m.data.cond;
      say('Doorman · '+m.o.hotel.name,k>=0.95?'Not a mark on it. Bravo — Mrs. Alexiou will be pleased.':k>=0.6?'A few new marks… I will park it in the shade and hope she does not look too closely.':'Panagia mou. I will tell her it was like this when it arrived.',[{t:k>=0.95?'Always a pleasure.':'Thank you. Kalo vradi!',f:()=>{m.data.done=1}}])},
    done:m=>!!m.data.done&&!DLG.open}],
  timeFail:'Too slow. Mrs. Alexiou lost her table — and you lost the job.',
  bonus:m=>m.data.cond>=0.95?[25,'Not a scratch']:m.data.cond<0.6?[-Math.round((0.6-m.data.cond)*60),'Repairs']:null,
  after:['Mrs. Alexiou','You drive better than my husband. Do not tell him I said so.']});
