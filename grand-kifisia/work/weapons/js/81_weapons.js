'use strict';
/* Grand Kifisia — weapons (owner: weapons agent; API in docs/WEAPONS.md).
   OWNER_BRIEF item 16 (replaces the paintball-only rule): realistic-looking pistol / SMG / rifle with recoil, muzzle flash, shell ejection, impact dust,
   procedural gunshot sounds and reloads — but NO blood, gore, corpses or killing: a person who is hit is knocked down, stays down a few seconds, gets up and runs.
   Weapons are put away automatically (and cannot fire) indoors, in a car, inside or within 150 m of the school (ISA), in missions that forbid them
   (school missions always), while talking or busy. Children, named CAST characters, the homeless man and the police are never targets:
   aim-assist ignores them, the trigger is blocked while the reticle is on them, and shots pass through them without any effect.
   The paint marker survives only as the loaner of the "Alsos Paintball" match.
   Contents: definitions · state + save · meshes (guns, tracers, casings, flash, decals) · input + HUD · aiming + aim-assist · firing (hitscan bullets / paint projectiles)
   · reactions (knockdown, panic, wanted level, police) · shop · range · paintball match mission. */

/* ============================== DEFINITIONS ============================== */
const PAINT=[0xff2f92,0xffe21f,0x3be36f,0x2aa9ff,0xff7b1c,0xb05cff];
const WDEF={
  fists:{id:'fists',name:'Fists',key:'Digit1'},
  /* hitscan firearms (look real; no blood — hits knock people down). rate = rounds/s, recoil = camera kick (rad), range = m */
  pistol:{id:'pistol',name:'Pistol',key:'Digit2',mag:15,start:45,rate:5.5,auto:false,spread:0.006,reload:1.45,pose:'pistol',recoil:0.032,kick:0.3,range:90,price:60,snd:'pistol',flash:0.2,casing:[0.0048,0.019],eject:2.4},
  smg:{id:'smg',name:'SMG',key:'Digit3',mag:30,start:90,rate:13,auto:true,spread:0.016,reload:2.0,pose:'rifle',recoil:0.016,kick:0.2,range:80,price:150,snd:'smg',flash:0.24,casing:[0.0048,0.019],eject:2.8},
  rifle:{id:'rifle',name:'Rifle',key:'Digit4',mag:30,start:90,rate:9,auto:true,spread:0.007,reload:2.4,pose:'rifle',recoil:0.026,kick:0.38,range:140,price:250,snd:'rifle',flash:0.36,casing:[0.0052,0.045],eject:3.2},
  /* the paintball match loaner: a real projectile with drag and drop */
  paint:{id:'paint',name:'Paint Marker',mag:40,start:-1,rate:9,auto:true,speed:88,drag:0.010,spread:0.014,reload:2.3,pose:'rifle',splat:0.23,recoil:0.008,kick:0.16,range:70,loanOnly:true}
};
const WORDER=['fists','pistol','smg','rifle'];
const W_AMMOBOX={pistol:30,smg:60,rifle:30};
/* the paint range and the paintball field: the round clearing in the west of the Alsos Kifisias (OSM way 32324869), ~55 m from the station.
   Chosen from the free space between the grove beds, trees, benches and buildings of the lm-park layout (work/weapons/free.py). */
const WZONE={x:-336,z:-56,ang:0.26,r:30};

/* ============================== STATE ============================== */
const WPN={ready:false,cur:'fists',owned:{fists:1},ammo:{},holster:null,aiming:false,fireDown:false,fireEdge:false,aimDown:false,aimLatch:false,lastFire:-9,cool:0,reload:0,
  col:0,bloom:0,still:0,mis:0,misT:0,guard:null,fines:0,lastFine:-1e9,shots:0,hits:0,loan:null,outT:0,target:null,prot:null,simT:0,msgT:{},wheel:false,gun:{},muz:new THREE.Vector3(),
  aimP:new THREE.Vector3()};
function wSave(){try{if(typeof SAVE==='undefined')return;SAVE.flags=SAVE.flags||{};const a={};for(const k in WPN.ammo)a[k]=[WPN.ammo[k].mag,WPN.ammo[k].res];SAVE.flags.wpn={owned:WPN.owned,ammo:a,cur:WPN.cur,fines:WPN.fines,best:WPN.best||0}}catch(e){}}
function wLoad(){try{const s=typeof SAVE!=='undefined'&&SAVE.flags&&SAVE.flags.wpn;if(!s)return;Object.assign(WPN.owned,s.owned||{});for(const k in s.ammo||{})WPN.ammo[k]={mag:s.ammo[k][0],res:s.ammo[k][1]};
  if(s.cur&&WPN.owned[s.cur])WPN.cur=s.cur;WPN.fines=s.fines||0;WPN.best=s.best||0}catch(e){}}
function wGive(id,quiet){const D=WDEF[id];if(!D)return;const had=!!WPN.owned[id];WPN.owned[id]=1;if(!WPN.ammo[id])WPN.ammo[id]={mag:D.mag,res:D.start<0?-1:Math.max(0,D.start-D.mag)};
  else if(!had){WPN.ammo[id].mag=D.mag}wSelect(id,true);wSave();if(!quiet)wToast(D.name+' — tap the weapon slot (or 1–4) to switch.','star')}
function wAddAmmo(n,id){const ids=id?[id]:['pistol','smg','rifle'];let ok=false;for(const k of ids){if(!WPN.owned[k])continue;const A=WPN.ammo[k];if(A&&A.res>=0){A.res+=n;ok=true}}wSave();return ok}
function wToast(t,icon){if(typeof toast==='function')toast(t,icon||'info');else if(typeof subtitle==='function')subtitle(t,2.5)}
function wOnce(key,secs,fn){const now=WPN.simT;if((WPN.msgT[key]||-1e9)>now)return;WPN.msgT[key]=now+secs;fn()}
const wArmed=()=>WPN.cur!=='fists'&&!!WDEF[WPN.cur];
const wAmmo=()=>WPN.loan?WPN.loan.ammo:WPN.ammo[WPN.cur];
const wDef=()=>WDEF[WPN.loan?WPN.loan.id:WPN.cur];

/* ============================== RULES ============================== */
function wDistPoly(poly,x,z){if(typeof distToPoly==='function')return distToPoly(poly,x,z);let bd=1e9;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1e-9,u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1),d=Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u);if(d<bd)bd=d}return bd}
/* true inside the ISA campus or within 150 m of it (also used for the player's position by tests) */
function nearSchool(x,z){if(typeof MAP==='undefined'||!MAP||!MAP.isa)return false;const g=MAP.isa.gate;if(g&&Math.hypot(x-g[0],z-g[1])<150)return true;
  const poly=(typeof ISA!=='undefined'&&ISA.poly)||null;return !!poly&&(pip(poly,x,z)||wDistPoly(poly,x,z)<150)}
/* why weapons are not allowed right now (null = allowed) */
function weaponBlock(){const p=player;if(p.car)return'car';if(p.interior)return'indoors';if(nearSchool(p.x,p.z))return'school';
  const m=typeof mission!=='undefined'?mission:null;if(m&&(m.M.noWeapons||m.id==='school'||m.id==='isa'||m.id==='stranger'))return'mission';
  if(typeof DLG!=='undefined'&&DLG.open)return'talk';if(p.ball)return'ball';if(p.busy>0||p.knock>0||p.frozen)return'busy';
  if(typeof weaponsAllowed==='function'&&!weaponsAllowed())return'busy';return null}
const W_BLOCKMSG={indoors:'Weapons stay holstered inside shops.',school:'No weapons at or near the school — holstered.',mission:'Not during this mission — weapon holstered.',car:null,talk:null,ball:null,busy:null};
/* people the game may never target: children, named CAST characters, the homeless man, the police officer */
function wProtected(n){if(!n)return true;if(n.wTeam)return false;if(typeof isProtected==='function'&&isProtected(n))return true;const h=n.h||n;
  return !!(n.protected||n.cast||(h&&(h.protected||(h.av&&h.av.age==='child'))))}

/* ============================== AUDIO (WebAudio synth) ============================== */
const WA={buf:null,out:null};
function wAud(){if(typeof AC==='undefined'||!AC)return null;if(!WA.buf){const n=AC.sampleRate|0,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;WA.buf=b;WA.out=AC.createGain();WA.out.gain.value=1;WA.out.connect(AC.destination)}
  WA.out.gain.value=SETTINGS.vol==null?0.8:SETTINGS.vol;return AC}
function wNoise(t0,dur,type,f,q,vol,f2){const ac=AC,s=ac.createBufferSource();s.buffer=WA.buf;s.loopStart=Math.random()*0.5;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t0);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t0+dur);fl.Q.value=q||0.7;
  const g=ac.createGain();g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+0.004);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);s.connect(fl).connect(g).connect(WA.out);s.start(t0,Math.random()*0.4);s.stop(t0+dur+0.02)}
function wTone(t0,dur,type,f,f2,vol){const ac=AC,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);o.connect(g).connect(WA.out);o.start(t0);o.stop(t0+dur+0.02)}
/* k: pop|rifle|water|splat|splash|thud|click|reload|ding|buzz|whistle|hitme; d = distance in metres from the listener */
function wSnd(k,d){const ac=wAud();if(!ac)return;const t=ac.currentTime,a=d==null?1:clamp(6/(6+d*d*0.06),0,1);if(a<0.03)return;
  if(k==='pop'||k==='rifle'){const r=k==='rifle';wNoise(t,0.05,'bandpass',r?2100:1700,0.9,0.22*a);wTone(t,0.07,'sine',r?170:140,55,0.18*a);wNoise(t+0.01,0.09,'highpass',3500,0.5,0.05*a)}
  else if(k==='water'){wNoise(t,0.09,'lowpass',2600,0.6,0.07*a,1400)}
  else if(k==='splat'){wNoise(t,0.11,'lowpass',1300,1.2,0.2*a,260);wTone(t,0.05,'triangle',220,90,0.06*a)}
  else if(k==='splash'){wNoise(t,0.14,'highpass',1800,0.4,0.05*a)}
  else if(k==='thud'){wTone(t,0.08,'sine',120,60,0.12*a);wNoise(t,0.06,'lowpass',700,0.8,0.08*a)}
  else if(k==='click'){wTone(t,0.02,'square',1800,900,0.05*a)}
  else if(k==='reload'){wTone(t,0.025,'square',1400,700,0.05);wNoise(t+0.18,0.06,'bandpass',900,1.5,0.08);wTone(t+0.32,0.03,'square',1100,600,0.05)}
  else if(k==='ding'){wTone(t,0.35,'sine',1320,1310,0.09);wTone(t,0.25,'sine',2640,2600,0.03)}
  else if(k==='buzz'){wTone(t,0.45,'square',196,190,0.05)}
  else if(k==='whistle'){const o=ac.createOscillator(),g=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();o.type='sine';o.frequency.value=2300;l.frequency.value=28;lg.gain.value=120;l.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.08,t+0.02);g.gain.setValueAtTime(0.08,t+0.5);g.gain.exponentialRampToValueAtTime(0.0001,t+0.62);o.connect(g).connect(WA.out);o.start(t);l.start(t);o.stop(t+0.65);l.stop(t+0.65)}
  else if(k==='pistol'||k==='smg'||k==='rifle'){const R=k==='rifle',S=k==='smg',v=R?1:S?0.75:0.85;
    wNoise(t,0.022,'highpass',R?2600:1900,0.5,0.55*v*a);wNoise(t,R?0.2:0.15,'lowpass',R?3200:2400,0.6,0.42*v*a,R?380:320);wTone(t,R?0.16:0.12,'sine',R?95:115,40,0.45*v*a);
    wNoise(t+0.03,R?0.9:0.6,'lowpass',800,0.5,0.08*v*a,250);wNoise(t+0.16+Math.random()*0.06,0.35,'bandpass',520,0.8,0.05*v*a)}
  else if(k==='impact'){wNoise(t,0.05,'bandpass',2200,1.1,0.12*a);wNoise(t,0.09,'lowpass',600,0.8,0.06*a)}
  else if(k==='ric'){wNoise(t,0.04,'highpass',3000,0.6,0.08*a);if(Math.random()<0.5)wTone(t+0.01,0.22,'sine',2600+Math.random()*900,900,0.025*a)}
  else if(k==='casing'){wTone(t,0.05,'sine',4200+Math.random()*900,3900,0.025*a);wTone(t+0.07,0.04,'sine',3800,3600,0.012*a)}
  else if(k==='mag'){wTone(t,0.02,'square',900,500,0.05);wNoise(t+0.02,0.08,'bandpass',1400,1.2,0.06);wNoise(t+0.55,0.05,'lowpass',700,1,0.1);wTone(t+0.57,0.03,'square',700,400,0.05)}
  else if(k==='rack'){wNoise(t,0.04,'bandpass',2600,1.5,0.08);wNoise(t+0.12,0.05,'bandpass',1900,1.5,0.1)}
  else if(k==='hitme'){wNoise(t,0.16,'lowpass',900,1,0.25,200);wTone(t,0.12,'sine',90,45,0.2)}}

/* ============================== MESHES ============================== */
/* merge simple parts into one vertex-coloured BufferGeometry (no BufferGeometryUtils in the page) */
function wMerge(parts){let n=0;const gs=parts.map(p=>{let g=p.g.index?p.g.toNonIndexed():p.g.clone();if(p.m)g.applyMatrix4(p.m);n+=g.attributes.position.count;return[g,new THREE.Color(p.c)]});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;for(const[g,c]of gs){const P=g.attributes.position.array,N=g.attributes.normal.array;pos.set(P,o*3);nor.set(N,o*3);for(let i=0;i<g.attributes.position.count;i++){col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b}o+=g.attributes.position.count;g.dispose()}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(pos,3));G.setAttribute('normal',new THREE.BufferAttribute(nor,3));G.setAttribute('color',new THREE.BufferAttribute(col,3));return G}
const _wm=new THREE.Matrix4(),_wq=new THREE.Quaternion(),_wv=new THREE.Vector3(),_wv2=new THREE.Vector3(),_wv3=new THREE.Vector3(),_ws=new THREE.Vector3(1,1,1),_we=new THREE.Euler();
function wBox(sx,sy,sz,x,y,z,c,ry){_we.set(0,ry||0,0);return{g:new THREE.BoxGeometry(sx,sy,sz),m:new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(_we),new THREE.Vector3(1,1,1)),c}}
function wCylX(r,len,x0,y,z,c,seg){const g=new THREE.CylinderGeometry(r,r,len,seg||12);g.rotateZ(-Math.PI/2);return{g,m:new THREE.Matrix4().makeTranslation(x0+len/2,y,z),c}}
function wSph(sx,sy,sz,x,y,z,c){const g=new THREE.SphereGeometry(1,14,10);g.scale(sx,sy,sz);return{g,m:new THREE.Matrix4().makeTranslation(x,y,z),c}}
/* hand space (docs/CHARACTERS.md): +x along the fingers = barrel, +z towards the thumb = top of the gun, y = thickness */
/* ---------- realistic-looking firearms (hand space: +x barrel, +z top of the gun, y = thickness; the grip sits at the origin) ---------- */
function wStipple(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const im=g.createImageData(64,64);for(let i=0;i<im.data.length;i+=4){const v=110+Math.random()*90;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}g.putImageData(im,0,0);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);return t}
function wGunMesh(id){const metal=[],poly=[],clear=[];let muz,port;const M=(p)=>metal.push(p),P=(p)=>poly.push(p);
  if(id==='pistol'){/* polymer-frame 9 mm service pistol, 186 mm long */
    M(wBox(0.186,0.026,0.031,0.062,0,0.077,0x1c1e21));/* slide */for(let i=0;i<7;i++)M(wBox(0.003,0.0275,0.022,-0.02+i*0.0065,0,0.079,0x0d0e10));/* rear serrations */
    M(wBox(0.006,0.004,0.006,0.148,0,0.095,0x0d0e10));M(wBox(0.008,0.02,0.006,-0.024,0,0.095,0x0d0e10));M(wBox(0.002,0.006,0.002,-0.024,0,0.099,0xe8e8e0));/* sights + rear dot */
    M(wBox(0.03,0.0262,0.012,0.04,0,0.083,0x4a4d52));/* ejection port */M(wCylX(0.0068,0.012,0.149,0,0.075,0x0a0a0a,10));/* muzzle bore */
    P(wBox(0.16,0.028,0.022,0.06,0,0.052,0x24272b));/* frame */P(wBox(0.04,0.024,0.006,0.115,0,0.04,0x24272b));/* accessory rail */
    P(wBox(0.05,0.008,0.004,0.04,0,0.02,0x24272b));P(wBox(0.004,0.008,0.03,0.064,0,0.035,0x24272b));/* trigger guard */M(wBox(0.004,0.006,0.016,0.032,0,0.033,0x111214));/* trigger */
    P(wBox(0.05,0.03,0.112,-0.004,0,-0.012,0x2a2d31,0.3));/* grip */P(wBox(0.054,0.032,0.01,-0.02,0,-0.068,0x18191b,0.3));/* magazine floor plate */P(wBox(0.012,0.031,0.03,0.016,0,0.03,0x2a2d31));
    muz=[0.156,0,0.075];port=[0.04,-0.016,0.09]}
  else if(id==='smg'){/* compact 9 mm submachine gun with a folding stock */
    M(wBox(0.3,0.048,0.052,0.08,0,0.06,0x1d1f22));/* receiver */M(wCylX(0.022,0.12,0.23,0,0.06,0x26282b,14));/* barrel shroud */for(let i=0;i<5;i++)M(wBox(0.012,0.046,0.006,0.25+i*0.02,0,0.084,0x111214));
    M(wCylX(0.0085,0.05,0.35,0,0.06,0x141516,10));M(wCylX(0.0055,0.006,0.398,0,0.06,0x050505,8));/* barrel + bore */
    M(wBox(0.03,0.02,0.02,0.3,0,0.096,0x111214));M(wCylX(0.012,0.02,-0.03,0,0.098,0x111214,12));/* front post + rear drum sight */
    M(wBox(0.05,0.05,0.008,0.06,0,0.087,0x34373b));/* cocking tube top */
    P(wBox(0.036,0.034,0.115,0.0,0,-0.01,0x26292d,0.28));/* grip */P(wBox(0.05,0.008,0.006,0.035,0,0.022,0x26292d));
    { const g=new THREE.BoxGeometry(0.034,0.028,0.17);const m=new THREE.Matrix4().compose(new THREE.Vector3(0.12,0,-0.03),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-0.22,0)),new THREE.Vector3(1,1,1));M({g,m,c:0x15171a})}/* curved magazine */
    P(wBox(0.07,0.04,0.045,0.22,0,0.02,0x26292d));/* handguard */
    M(wCylX(0.006,0.2,-0.22,0.016,0.06,0x2a2c2f,8));M(wCylX(0.006,0.2,-0.22,-0.016,0.06,0x2a2c2f,8));P(wBox(0.02,0.05,0.09,-0.225,0,0.045,0x1b1d20));/* stock rods + butt */
    muz=[0.4,0,0.06];port=[0.12,-0.025,0.07]}
  else if(id==='rifle'){/* 5.56 mm carbine with a red-dot sight */
    M(wBox(0.26,0.046,0.05,0.08,0,0.07,0x26292c));/* upper receiver */M(wBox(0.2,0.026,0.012,0.08,0,0.1,0x1b1d20));for(let i=0;i<14;i++)M(wBox(0.006,0.028,0.004,-0.01+i*0.014,0,0.107,0x0f1011));/* top rail */
    P(wBox(0.19,0.044,0.05,0.06,0,0.026,0x2b2e32));/* lower receiver */P(wBox(0.04,0.032,0.115,-0.005,0,-0.025,0x202326,0.32));/* grip */
    { const g=new THREE.BoxGeometry(0.06,0.026,0.19);const m=new THREE.Matrix4().compose(new THREE.Vector3(0.115,0,-0.055),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-0.18,0)),new THREE.Vector3(1,1,1));M({g,m,c:0x3a3b34})}/* curved magazine */
    { const g=new THREE.CylinderGeometry(0.03,0.03,0.29,8);g.rotateZ(-Math.PI/2);P({g,m:new THREE.Matrix4().makeTranslation(0.355,0,0.068),c:0x23262a})}/* octagonal handguard */for(let i=0;i<6;i++)P(wBox(0.022,0.062,0.008,0.24+i*0.045,0,0.07,0x16181a));
    M(wCylX(0.0095,0.13,0.5,0,0.068,0x141516,10));M(wCylX(0.013,0.045,0.6,0,0.068,0x0e0f10,8));M(wCylX(0.0055,0.006,0.643,0,0.068,0x050505,8));/* barrel + flash hider + bore */
    M(wCylX(0.017,0.06,0.04,0,0.135,0x15171a,16));M(wBox(0.03,0.03,0.022,0.07,0,0.115,0x15171a));/* red-dot optic + mount */M(wCylX(0.0145,0.002,0.1,0,0.135,0x7a2a2a,16));
    M(wCylX(0.016,0.18,-0.24,0,0.065,0x1b1d20,12));/* buffer tube */P(wBox(0.16,0.04,0.085,-0.2,0,0.045,0x202326));P(wBox(0.02,0.042,0.11,-0.285,0,0.04,0x111214));/* stock + butt pad */
    P(wBox(0.05,0.008,0.006,0.03,0,0.0,0x2b2e32));M(wBox(0.004,0.006,0.016,0.03,0,0.008,0x111214));/* trigger guard + trigger */
    muz=[0.648,0,0.068];port=[0.09,-0.025,0.075]}
  else if(id==='paint'){poly.push(wBox(0.26,0.042,0.07,0.05,0,0.045,0x23272c),wBox(0.18,0.044,0.016,0.06,0,0.02,0x2aa9ff),wBox(0.042,0.032,0.1,0.0,0,-0.03,0x16181c,0.15),wBox(0.035,0.03,0.08,0.15,0,-0.015,0x16181c),
      wCylX(0.014,0.29,0.18,0,0.055,0x30353b),wCylX(0.0155,0.02,0.47,0,0.055,0xff6a00),wCylX(0.036,0.22,-0.3,0,0.02,0x1f6fd1,14),wCylX(0.02,0.06,-0.08,0,0.02,0x9aa3ad),wCylX(0.012,0.05,-0.02,0,0.09,0x23272c));
    clear.push(wSph(0.085,0.065,0.07,0.0,0,0.15,0xffd21f));muz=[0.49,0,0.055];port=null}
  const grp=new THREE.Group();
  if(metal.length){const mm=new THREE.Mesh(wMerge(metal),new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.32,metalness:0.85}));mm.castShadow=true;grp.add(mm);if(typeof useEnv==='function')try{useEnv(mm.material);mm.material.envMapIntensity=1.1}catch(e){}}
  if(poly.length){const pm=new THREE.Mesh(wMerge(poly),new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.68,metalness:0.05,bumpMap:WPN.stip,bumpScale:0.6}));pm.castShadow=true;grp.add(pm)}
  if(clear.length){const cm=new THREE.Mesh(wMerge(clear),new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.15,metalness:0,transparent:true,opacity:0.78,depthWrite:false}));grp.add(cm)}
  grp.userData.muz=new THREE.Vector3(muz[0],muz[1],muz[2]);grp.userData.port=port?new THREE.Vector3(port[0],port[1],port[2]):null;grp.visible=false;scene.add(grp);return grp}

/* splat atlas: 2×2 cells of 256 px — three paint splats with spikes and satellite droplets, one soft water splash; white + alpha (instance colour tints it) */
function wSplatTex(){const S=512,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');let seed=11;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  for(let k=0;k<4;k++){const cx=(k%2)*256+128,cy=(k>>1)*256+128,water=k===3;g.save();g.beginPath();g.rect(cx-128,cy-128,256,256);g.clip();g.fillStyle='#fff';
    const R0=water?60:44,N=48,ph=[r()*6,r()*6,r()*6];g.beginPath();for(let i=0;i<=N;i++){const a=i/N*TAU,rr=R0*(1+0.16*Math.sin(a*3+ph[0])+0.1*Math.sin(a*5+ph[1])+0.06*Math.sin(a*11+ph[2])+(water?0:0.08*(r()-0.5)));const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?g.lineTo(x,y):g.moveTo(x,y)}g.fill();
    if(!water){const ns=10+Math.floor(r()*7);for(let i=0;i<ns;i++){const a=r()*TAU,L=R0*(1.25+r()*0.9),w=4+r()*7;g.beginPath();g.moveTo(cx+Math.cos(a-0.22)*R0*0.8,cy+Math.sin(a-0.22)*R0*0.8);g.lineTo(cx+Math.cos(a)*L,cy+Math.sin(a)*L);g.lineTo(cx+Math.cos(a+0.22)*R0*0.8,cy+Math.sin(a+0.22)*R0*0.8);g.fill();
        g.beginPath();g.arc(cx+Math.cos(a)*L,cy+Math.sin(a)*L,w*0.55,0,TAU);g.fill()}
      for(let i=0;i<26;i++){const a=r()*TAU,d=R0*(1.15+r()*1.35),rr=1+r()*4.5;g.beginPath();g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,rr,0,TAU);g.fill()}
      /* thickness: a darker rim and a glossy lighter core */
      g.globalCompositeOperation='source-atop';const gr=g.createRadialGradient(cx-8,cy-10,4,cx,cy,R0*1.9);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.45,'rgba(236,236,236,1)');gr.addColorStop(1,'rgba(185,185,185,1)');g.fillStyle=gr;g.fillRect(cx-128,cy-128,256,256)}
    else{for(let i=0;i<14;i++){const a=r()*TAU,d=R0*(1.1+r()*0.8),rr=3+r()*8;g.beginPath();g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,rr,0,TAU);g.fill()}}
    g.restore()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
function wDecalMesh(cap,tex,water){const geo=new THREE.PlaneGeometry(1,1);const ofs=new THREE.InstancedBufferAttribute(new Float32Array(cap*2),2);geo.setAttribute('wofs',ofs);
  const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-6,roughness:water?0.08:0.3,metalness:0,opacity:water?0.5:1});
  mat.onBeforeCompile=sh=>{sh.vertexShader='attribute vec2 wofs;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_UV\n vUv=vUv*0.5+wofs;\n#endif')};mat.customProgramCacheKey=()=>'wdecal';
  if(typeof useEnv==='function')try{useEnv(mat);mat.envMapIntensity=water?1.2:0.5}catch(e){}
  const im=new THREE.InstancedMesh(geo,mat,cap);im.count=0;im.frustumCulled=false;im.receiveShadow=true;im.renderOrder=2;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.setColorAt(0,new THREE.Color(1,1,1));scene.add(im);return{im,ofs,cap,n:0,next:0,rec:new Array(cap)}}
function wBallMesh(cap,r,mat){const g=new THREE.SphereGeometry(r,10,8);const im=new THREE.InstancedMesh(g,mat,cap);im.count=0;im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.setColorAt(0,new THREE.Color(1,1,1));scene.add(im);return im}
function wInitMeshes(){WPN.tex=wSplatTex();WPN.dec=wDecalMesh(360,WPN.tex,false);WPN.wet=wDecalMesh(140,WPN.tex,true);WPN.body=wDecalMesh(60,WPN.tex,false);
  /* paintballs (17.3 mm, drawn motion-blurred along the velocity), water drops, spray droplets */
  WPN.ballIM=wBallMesh(96,1,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));WPN.dropIM=wBallMesh(160,1,new THREE.MeshBasicMaterial({color:0xcfe8ff,transparent:true,opacity:0.55,depthWrite:false}));
  WPN.sprIM=wBallMesh(240,1,new THREE.MeshBasicMaterial({color:0xffffff}));
  WPN.stip=wStipple();for(const id of['pistol','smg','rifle','paint'])WPN.gun[id]=wGunMesh(id);wFxInit()}

/* ============================== DECALS ============================== */
const _wc=new THREE.Color(),_wn=new THREE.Vector3(),_wu=new THREE.Vector3(),_wb=new THREE.Vector3(),_wbm=new THREE.Matrix4(),_wp=new THREE.Vector3();
/* orientation: z = surface normal, x = the direction the ball was travelling along the surface (splats stretch at grazing angles) */
function wDecalMatrix(out,px,py,pz,nx,ny,nz,vx,vy,vz,size,spin,stretch){_wn.set(nx,ny,nz).normalize();_wu.set(vx,vy,vz);_wu.addScaledVector(_wn,-_wu.dot(_wn));
  if(_wu.lengthSq()<1e-6){_wu.set(Math.abs(_wn.y)<0.9?0:1,Math.abs(_wn.y)<0.9?1:0,0);_wu.addScaledVector(_wn,-_wu.dot(_wn))}_wu.normalize();if(spin){_wu.applyAxisAngle(_wn,spin)}_wb.crossVectors(_wn,_wu);
  _wbm.makeBasis(_wu,_wb,_wn);_wq.setFromRotationMatrix(_wbm);_wv.set(px+nx*0.004,py+ny*0.004,pz+nz*0.004);_ws.set(size*stretch,size,1);out.compose(_wv,_wq,_ws);_ws.set(1,1,1);return out}
function wAddDecal(D,rec){const i=D.next;D.next=(D.next+1)%D.cap;if(D.n<D.cap)D.n++;D.im.count=D.n;D.rec[i]=rec;const cell=rec.water?3:Math.floor(Math.random()*3);D.ofs.setXY(i,(cell%2)*0.5,(cell>>1)*0.5);D.ofs.needsUpdate=true;
  _wc.setHex(rec.col);if(rec.water)_wc.setRGB(0.25,0.27,0.3);D.im.setColorAt(i,_wc);D.im.instanceColor.needsUpdate=true;wDecalSet(D,i,rec);return i}
function wDecalSet(D,i,rec){let px=rec.x,py=rec.y,pz=rec.z,nx=rec.nx,ny=rec.ny,nz=rec.nz,vx=rec.vx,vy=rec.vy,vz=rec.vz;
  if(rec.car){const c=rec.car,co=Math.cos(c.yaw),si=Math.sin(c.yaw);px=c.x+co*rec.lx+si*rec.lz;pz=c.z-si*rec.lx+co*rec.lz;py=(c.y||0)+rec.ly;nx=co*rec.nlx+si*rec.nlz;nz=-si*rec.nlx+co*rec.nlz;ny=rec.nly;
    const vx0=vx;vx=co*vx0+si*vz;vz=-si*vx0+co*vz;rec.cx=c.x;rec.cz=c.z;rec.cyaw=c.yaw}
  let s=rec.size;if(rec.water&&rec.life!=null)s*=clamp(rec.life/rec.life0*1.6,0,1);
  wDecalMatrix(_wm,px,py,pz,nx,ny,nz,vx,vy,vz,s,rec.spin,rec.stretch);D.im.setMatrixAt(i,_wm);D.im.instanceMatrix.needsUpdate=true}
function wDecalsTick(dt){/* paint on cars follows the car; water dries */
  const D=WPN.dec;for(let i=0;i<D.n;i++){const r=D.rec[i];if(r&&r.car&&(r.car.x!==r.cx||r.car.z!==r.cz||r.car.yaw!==r.cyaw))wDecalSet(D,i,r)}
  const W=WPN.wet;for(let i=0;i<W.n;i++){const r=W.rec[i];if(!r||r.life<=0)continue;r.life-=dt;if(r.car||((r.life*4|0)!==((r.life+dt)*4|0)))wDecalSet(W,i,r)}}

/* paint on people: follows a bone of the skeleton (bonePos) — removed when the person despawns or after 2 minutes */
const W_BONES=typeof BN!=='undefined'?[BN.SPINE1,BN.SPINE2,BN.PELVIS,BN.LUP,BN.RUP,BN.LFORE,BN.RFORE,BN.LTHIGH,BN.RTHIGH,BN.LCALF,BN.RCALF]:[];
function wBodySplat(n,px,py,pz,vx,vy,vz,col){const h=n.h;if(!h||!h.root)return;const r=h.root,yaw=r.rotation.y,co=Math.cos(yaw),si=Math.sin(yaw);let bone=-1,bd=1e9,bx=r.position.x,by=r.position.y+1.2,bz=r.position.z;
  if(typeof h.bonePos==='function'&&h.wp)for(const b of W_BONES){h.bonePos(b,_wp);const d=_wp.distanceToSquared(_wv.set(px,py,pz));if(d<bd){bd=d;bone=b;bx=_wp.x;by=_wp.y;bz=_wp.z}}
  /* offset and normal in the root's frame (inverse yaw) */
  let ox=px-bx,oy=py-by,oz=pz-bz;let nx=-vx,nz=-vz;const nl=Math.hypot(nx,nz)||1;nx/=nl;nz/=nl;ox+=nx*0.03;oz+=nz*0.03;
  const lx=ox*co-oz*si,lz=ox*si+oz*co,nlx=nx*co-nz*si,nlz=nx*si+nz*co;
  wAddDecal(WPN.body,{n,bone,lx,ly:oy,lz,nlx,nly:0,nlz,x:px,y:py,z:pz,nx,ny:0,nz,vx:0,vy:1,vz:0,size:0.36+Math.random()*0.1,spin:Math.random()*TAU,stretch:1,col,t:0})}
function wBodyTick(dt){const D=WPN.body;let any=false;for(let i=0;i<D.n;i++){const r=D.rec[i];if(!r||r.dead)continue;r.t+=dt;const h=r.n.h;
    const gone=!h||!h.root||!h.root.parent||r.t>120;
    if(gone||!h.root.visible){if(gone)r.dead=true;_wm.makeScale(0,0,0);D.im.setMatrixAt(i,_wm);any=true;continue}
    const rt=h.root,co=Math.cos(rt.rotation.y),si=Math.sin(rt.rotation.y);let bx=rt.position.x,by=rt.position.y+1.2,bz=rt.position.z;if(r.bone>=0&&typeof h.bonePos==='function'){h.bonePos(r.bone,_wp);bx=_wp.x;by=_wp.y;bz=_wp.z}
    const px=bx+co*r.lx+si*r.lz,pz=bz-si*r.lx+co*r.lz,py=by+r.ly,nx=co*r.nlx+si*r.nlz,nz=-si*r.nlx+co*r.nlz;
    wDecalMatrix(_wm,px,py,pz,nx,0,nz,0,1,0,r.size,r.spin,1);D.im.setMatrixAt(i,_wm);any=true}
  if(any)D.im.instanceMatrix.needsUpdate=true}

/* ============================== PROJECTILES ============================== */
const WB=[],WS=[];/* active balls / spray droplets */
function wSpawnBall(x,y,z,vx,vy,vz,o){if(WB.length>=95)WB.shift();WB.push({x,y,z,vx,vy,vz,px:x,py:y,pz:z,life:o.water?1.6:3.2,col:o.col,water:!!o.water,team:o.team||'p',owner:o.owner||null,drag:o.drag||0.01,size:o.size||0.2,age:0})}
function wSpray(x,y,z,nx,ny,nz,col,n,spd){const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;for(let i=0;i<n;i++){if(WS.length>=238)WS.shift();/* random direction in the hemisphere around the normal */
    let rx=Math.random()*2-1,ry=Math.random()*2-1,rz=Math.random()*2-1;const rl=Math.hypot(rx,ry,rz)||1;rx/=rl;ry/=rl;rz/=rl;const up=0.5+Math.random()*0.6,s=spd*(0.4+Math.random()*0.8);
    let vx=nx*up+rx*0.85,vy=ny*up+ry*0.85,vz=nz*up+rz*0.85;const vl=Math.hypot(vx,vy,vz)||1;WS.push({x:x+nx*0.01,y:y+ny*0.01,z:z+nz*0.01,vx:vx/vl*s,vy:vy/vl*s+0.6,vz:vz/vl*s,life:0.3+Math.random()*0.35,col,r:0.005+Math.random()*0.011})}}
/* 2D ray against the collision grid (building / garden-wall / fence segments): returns {t,s} of the first crossing (t 0..1) or null */
function wRay(ax,az,bx,bz,kinds){stamp++;let best=1,bs=null;const dx=bx-ax,dz=bz-az;const gx0=Math.floor(Math.min(ax,bx)/CELL),gx1=Math.floor(Math.max(ax,bx)/CELL),gz0=Math.floor(Math.min(az,bz)/CELL),gz1=Math.floor(Math.max(az,bz)/CELL);
  if((gx1-gx0+1)*(gz1-gz0+1)>400)return null;
  for(let gx=gx0;gx<=gx1;gx++)for(let gz=gz0;gz<=gz1;gz++){const a=grid.get(gx*65536+gz);if(!a)continue;
    for(let i=0;i<a.length;i++){const s=a[i];if(s.s===stamp)continue;s.s=stamp;if(kinds.indexOf(s.kind)<0)continue;
      const ex=s.bx-s.ax,ez=s.bz-s.az,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const t=((s.ax-ax)*ez-(s.az-az)*ex)/den,u=((s.ax-ax)*dz-(s.az-az)*dx)/den;if(t>=0&&t<best&&u>=0&&u<=1){best=t;bs=s}}}
  return bs?{t:best,s:bs}:null}
const W_WALLH={b:40,w:1.7,f:1.1,p:1.0};
/* everybody a ball can hit: [{n (record with h,x,z), team?}] — bystanders (never protected ones), the match bots and the player (only for bot paint) */
function wPeople(){const L=[];if(typeof NPCS!=='undefined')for(const n of NPCS){if(!n.h||!n.h.root||!n.h.root.visible||n.state==='down'||wProtected(n))continue;L.push(n)}
  if(WPN.match)for(const b of WPN.match.bots)if(b.state!=='out')L.push(b);return L}
function wHitScan(b,ax,ay,az,bx,by,bz,people){let best=null,bt=1;const dx=bx-ax,dy=by-ay,dz=bz-az,L2=dx*dx+dz*dz||1e-9;
  /* people: a vertical capsule r 0.27 m from the feet to the head */
  const bteam=b.team==='p'?'blue':b.team;for(const n of people){if(n.wTeam){if(!WPN.match||n.wTeam===bteam)continue}else if(b.team!=='p')continue;const hx=n.h.root.position.x,hz=n.h.root.position.z,hy=n.h.root.position.y;
    const t=clamp(((hx-ax)*dx+(hz-az)*dz)/L2,0,1),cx=ax+dx*t-hx,cz=az+dz*t-hz;if(cx*cx+cz*cz>0.075)continue;const y=ay+dy*t-hy,H=1.72*(n.h.root.scale.y||1)*(n.crouch?0.62:1);if(y<0.05||y>H)continue;
    if(t<bt){bt=t;const l=Math.hypot(cx,cz)||1;best={t,kind:'person',n,nx:cx/l,ny:0,nz:cz/l}}}
  if(b.team==='orange'&&WPN.outT<=0&&!player.car&&!player.interior){const hx=player.x,hz=player.z,hy=player.y;const t=clamp(((hx-ax)*dx+(hz-az)*dz)/L2,0,1),cx=ax+dx*t-hx,cz=az+dz*t-hz;
    if(cx*cx+cz*cz<0.08){const y=ay+dy*t-hy;if(y>0.05&&y<1.75&&t<bt){bt=t;best={t,kind:'player',nx:0,ny:0,nz:0}}}}
  /* cars (oriented boxes) */
  if(typeof CARS!=='undefined')for(const c of CARS){const ex=bx-c.x,ez=bz-c.z;if(ex*ex+ez*ez>16)continue;const T_=CARTYPES[c.type];if(!T_)continue;const co=Math.cos(c.yaw),si=Math.sin(c.yaw);
    const lx=ex*co-ez*si,lz=ex*si+ez*co,ly=by-(c.y||0);const hw=T_.W/2,hl=T_.L/2;if(Math.abs(lx)<hw&&Math.abs(lz)<hl&&ly>0.3&&ly<T_.H){
      const px=hw-Math.abs(lx),pz=hl-Math.abs(lz),py=T_.H-ly;let nlx=0,nly=0,nlz=0;if(py<px&&py<pz)nly=1;else if(px<pz)nlx=Math.sign(lx);else nlz=Math.sign(lz);
      if(0.999<bt){bt=0.999;best={t:0.999,kind:'car',c,lx,ly:Math.min(ly,T_.H-0.01),lz,nlx,nly,nlz,nx:co*nlx+si*nlz,ny:nly,nz:-si*nlx+co*nlz}}}}
  /* walls: buildings, garden walls and low props (2D segments with a height) */
  const w=wRay(ax,az,bx,bz,'bwp');if(w&&w.t<bt){const y=ay+dy*w.t;const gy=groundY(ax+dx*w.t,az+dz*w.t);if(y<gy+W_WALLH[w.s.kind]){const s=w.s;let nx=-(s.bz-s.az),nz=s.bx-s.ax;const l=Math.hypot(nx,nz)||1;nx/=l;nz/=l;if(nx*dx+nz*dz>0){nx=-nx;nz=-nz}
    bt=w.t;best={t:w.t,kind:'wall',nx,ny:0,nz,s}}}
  /* the ground */
  const g1=groundY(bx,bz);if(by<g1){const g0=groundY(ax,az);const t=clamp((ay-g0)/Math.max(1e-6,(ay-g0)-(by-g1)),0,1);if(t<bt){bt=t;best={t,kind:'ground',nx:0,ny:1,nz:0}}}
  /* paint range targets and field bunkers */
  if(WRANGE.built){const h=wRangeHit(ax,ay,az,bx,by,bz);if(h&&h.t<bt){bt=h.t;best=h}}
  if(WPN.match&&WPN.match.field){const h=wBunkerHit(ax,ay,az,bx,by,bz);if(h&&h.t<bt){bt=h.t;best=h}}
  return best}
function wBallsTick(dt){if(!WB.length&&!WS.length)return;const people=WB.length?wPeople():null;
  for(let i=WB.length-1;i>=0;i--){const b=WB[i];b.age+=dt;const sp=Math.hypot(b.vx,b.vy,b.vz);const sub=clamp(Math.ceil(sp*dt/1.1),1,6),h=dt/sub;let dead=false;
    for(let k=0;k<sub&&!dead;k++){const v=Math.hypot(b.vx,b.vy,b.vz),kd=b.drag*v;b.vx-=b.vx*kd*h;b.vz-=b.vz*kd*h;b.vy-=(9.81+b.vy*kd)*h;
      const ax=b.x,ay=b.y,az=b.z,nx=ax+b.vx*h,ny=ay+b.vy*h,nz=az+b.vz*h;const hit=wHitScan(b,ax,ay,az,nx,ny,nz,people);
      if(hit){const t=hit.t;const px=ax+(nx-ax)*t,py=ay+(ny-ay)*t,pz=az+(nz-az)*t;wImpact(b,hit,px,py,pz);dead=true}else{b.px=ax;b.py=ay;b.pz=az;b.x=nx;b.y=ny;b.z=nz}}
    b.life-=dt;if(dead||b.life<=0)WB.splice(i,1)}
  for(let i=WS.length-1;i>=0;i--){const s=WS[i];s.life-=dt;s.vy-=9.81*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;if(s.life<=0||s.y<groundY(s.x,s.z)-0.02)WS.splice(i,1)}}
function wBallsDraw(){let nb=0,nd=0;const BI=WPN.ballIM,DI=WPN.dropIM,SI=WPN.sprIM;
  for(const b of WB){const v=Math.hypot(b.vx,b.vy,b.vz)||1;/* motion blur: stretch the sphere along the velocity over ~1/120 s */
    const len=Math.max(b.water?0.03:0.0087,Math.min(b.water?0.25:0.6,v/120)),r=b.water?0.022:0.0087*1.6;_wv.set(b.vx/v,b.vy/v,b.vz/v);_wq.setFromUnitVectors(_wv2.set(0,0,1),_wv);_ws.set(r,r,len*0.5);
    _wm.compose(_wv3.set(b.x-_wv.x*len*0.5,b.y-_wv.y*len*0.5,b.z-_wv.z*len*0.5),_wq,_ws);if(b.water){if(nd<160){DI.setMatrixAt(nd,_wm);nd++}}else{BI.setMatrixAt(nb,_wm);_wc.setHex(b.col);BI.setColorAt(nb,_wc);nb++}}
  _ws.set(1,1,1);let ns=0;for(const s of WS){_ws.set(s.r,s.r,s.r);_wm.compose(_wv.set(s.x,s.y,s.z),_wq.identity(),_ws);SI.setMatrixAt(ns,_wm);_wc.setHex(s.col);SI.setColorAt(ns,_wc);ns++}_ws.set(1,1,1);
  BI.count=nb;DI.count=Math.min(nd,160);SI.count=ns;if(nb){BI.instanceMatrix.needsUpdate=true;BI.instanceColor.needsUpdate=true}if(nd)DI.instanceMatrix.needsUpdate=true;if(ns){SI.instanceMatrix.needsUpdate=true;SI.instanceColor.needsUpdate=true}}

/* a ball lands */
function wImpact(b,hit,px,py,pz){const d=Math.hypot(px-camera.position.x,pz-camera.position.z);const zone=wInZone(px,pz);
  if(hit.kind==='person'){wHitPerson(hit.n,b,px,py,pz);return}
  if(hit.kind==='player'){wPlayerHit(b);return}
  if(hit.kind==='target'){wRangeScore(hit,b,px,py,pz);return}
  wSnd(b.water?'splash':'splat',d);
  const size=b.size*(0.85+Math.random()*0.35),vx=b.vx,vy=b.vy,vz=b.vz,vl=Math.hypot(vx,vy,vz)||1,cosi=Math.abs((vx*hit.nx+vy*hit.ny+vz*hit.nz)/vl),stretch=clamp(1/Math.max(0.42,cosi),1,2.1);
  const rec={x:px,y:py,z:pz,nx:hit.nx,ny:hit.ny,nz:hit.nz,vx,vy,vz,size:size*2.6,spin:(Math.random()-0.5)*0.5,stretch,col:b.col,water:b.water};
  if(hit.kind==='car'){Object.assign(rec,{car:hit.c,lx:hit.lx+hit.nlx*0.004,ly:hit.ly+hit.nly*0.004,lz:hit.lz+hit.nlz*0.004,nlx:hit.nlx,nly:hit.nly,nlz:hit.nlz});
    const co=Math.cos(hit.c.yaw),si=Math.sin(hit.c.yaw);rec.vx=vx*co-vz*si;rec.vz=vx*si+vz*co;rec.size*=0.8;if(!b.water&&b.team==='p'&&!zone)wMischief(7,'car')}
  else if(!b.water&&b.team==='p'&&!zone)wMischief(hit.kind==='ground'?0.6:1.6,'wall');
  if(b.water){rec.life0=rec.life=18+Math.random()*10;wAddDecal(WPN.wet,rec);wSpray(px,py,pz,hit.nx,hit.ny,hit.nz,0xcfe8ff,3,1.2)}
  else{wAddDecal(WPN.dec,rec);wSpray(px,py,pz,hit.nx,hit.ny,hit.nz,b.col,7,2.4)}
  if(b.team==='p')wStartle(px,pz,b.water?2:3.5,null)}

/* ============================== FIREARM EFFECTS: muzzle flash, tracers, casings, bullet holes, dust and sparks ============================== */
function wFlashTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.translate(64,64);const gr=g.createRadialGradient(0,0,0,0,0,60);gr.addColorStop(0,'rgba(255,250,225,1)');gr.addColorStop(0.18,'rgba(255,214,120,.95)');gr.addColorStop(0.5,'rgba(255,140,40,.45)');gr.addColorStop(1,'rgba(255,90,0,0)');
  g.fillStyle=gr;for(let i=0;i<7;i++){g.rotate(TAU/7+Math.random()*0.3);g.beginPath();g.moveTo(-7,0);g.lineTo(0,-(34+Math.random()*26));g.lineTo(7,0);g.fill()}g.beginPath();g.arc(0,0,24,0,TAU);g.fill();const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
function wPuffTex(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');for(let i=0;i<14;i++){const x=32+(Math.random()-0.5)*26,y=32+(Math.random()-0.5)*26,r=8+Math.random()*12;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
/* bullet hole: dark core, chipped rim, pale dust ring (white tinted per surface); 4 variants in a 2×2 atlas */
function wHoleTex(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');for(let k=0;k<4;k++){const cx=(k%2)*128+64,cy=(k>>1)*128+64;g.save();g.beginPath();g.rect(cx-64,cy-64,128,128);g.clip();
    const dust=g.createRadialGradient(cx,cy,6,cx,cy,52);dust.addColorStop(0,'rgba(235,228,214,.9)');dust.addColorStop(0.5,'rgba(220,212,198,.45)');dust.addColorStop(1,'rgba(220,212,198,0)');g.fillStyle=dust;g.fillRect(cx-64,cy-64,128,128);
    g.fillStyle='rgba(120,112,100,.9)';g.beginPath();for(let i=0;i<=20;i++){const a=i/20*TAU,r=13+Math.random()*7;i?g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):g.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}g.fill();
    g.fillStyle='rgba(18,16,15,1)';g.beginPath();for(let i=0;i<=16;i++){const a=i/16*TAU,r=6+Math.random()*3;i?g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):g.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}g.fill();
    g.strokeStyle='rgba(60,55,50,.7)';g.lineWidth=1.2;for(let i=0;i<5;i++){const a=Math.random()*TAU;g.beginPath();g.moveTo(cx+Math.cos(a)*9,cy+Math.sin(a)*9);g.lineTo(cx+Math.cos(a+0.2)*(22+Math.random()*16),cy+Math.sin(a+0.2)*(22+Math.random()*16));g.stroke()}g.restore()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
const WTR=[],WCS=[],WPF=[],WSK=[];/* tracers, casings, dust puffs, sparks */
function wFxInit(){WPN.flash=new THREE.Sprite(new THREE.SpriteMaterial({map:wFlashTex(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,toneMapped:false,fog:false}));WPN.flash.visible=false;scene.add(WPN.flash);WPN.flashT=0;
  WPN.flash2=new THREE.Sprite(WPN.flash.material.clone());WPN.flash2.visible=false;scene.add(WPN.flash2);
  WPN.holes=wDecalMesh(320,wHoleTex(),false);WPN.holes.im.material.roughness=0.9;WPN.holes.im.material.metalness=0;
  WPN.trIM=wBallMesh(24,1,new THREE.MeshBasicMaterial({color:0xffd9a0,toneMapped:false,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false}));
  WPN.skIM=wBallMesh(120,1,new THREE.MeshBasicMaterial({color:0xffc060,toneMapped:false}));
  {const g=new THREE.CylinderGeometry(1,1,1,8);g.rotateX(Math.PI/2);const im=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({color:0xc8952e,metalness:1,roughness:0.28}),80);im.count=0;im.frustumCulled=false;im.castShadow=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(im);WPN.csIM=im;if(typeof useEnv==='function')try{useEnv(im.material)}catch(e){}}
  const pt=wPuffTex();WPN.puffs=[];for(let i=0;i<10;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:pt,transparent:true,depthWrite:false,color:0xcfc6b5}));sp.visible=false;scene.add(sp);WPN.puffs.push(sp)}WPN.puffI=0}
function wPuff(x,y,z,col,size){const sp=WPN.puffs[WPN.puffI=(WPN.puffI+1)%WPN.puffs.length];sp.position.set(x,y,z);sp.material.color.setHex(col);sp.material.opacity=0.85;sp.material.rotation=Math.random()*TAU;sp.visible=true;sp.userData={t:0,s:size||0.35,vy:0.35};sp.scale.setScalar(0.05)}
function wSparks(x,y,z,nx,ny,nz,n){for(let i=0;i<n;i++){if(WSK.length>=118)WSK.shift();let rx=Math.random()*2-1,ry=Math.random()*2-1,rz=Math.random()*2-1;const rl=Math.hypot(rx,ry,rz)||1;const s=3+Math.random()*5;
    WSK.push({x,y,z,vx:(nx*0.8+rx/rl)*s,vy:(ny*0.8+ry/rl)*s+1,vz:(nz*0.8+rz/rl)*s,life:0.12+Math.random()*0.2})}}
function wEject(D){const g=WPN.gun[D.id];if(!g||!g.visible||!g.userData.port)return;_wv.copy(g.userData.port).applyMatrix4(g.matrixWorld);const yaw=player.yaw,rx=-Math.cos(yaw),rz=Math.sin(yaw),fx=Math.sin(yaw),fz=Math.cos(yaw);const e=D.eject||2.5;
  if(WCS.length>=79)WCS.shift();WCS.push({x:_wv.x,y:_wv.y,z:_wv.z,vx:rx*e*(0.8+Math.random()*0.4)-fx*0.6,vy:1.6+Math.random()*1.2,vz:rz*e*(0.8+Math.random()*0.4)-fz*0.6,ax:Math.random()*TAU,ay:Math.random()*TAU,sx:(Math.random()-0.5)*40,sy:(Math.random()-0.5)*40,life:9,b:0,r:D.casing[0],l:D.casing[1]})}
function wFxTick(dt){/* flash */if(WPN.flashT>0){WPN.flashT-=dt;if(WPN.flashT<=0){WPN.flash.visible=false;WPN.flash2.visible=false}}
  for(let i=WTR.length-1;i>=0;i--){const t=WTR[i];t.d+=dt*t.v;if(t.d>=t.L)WTR.splice(i,1)}
  for(let i=WSK.length-1;i>=0;i--){const s=WSK[i];s.life-=dt;s.vy-=9.81*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;if(s.life<=0)WSK.splice(i,1)}
  for(let i=WCS.length-1;i>=0;i--){const c=WCS[i];c.life-=dt;if(c.life<=0){WCS.splice(i,1);continue}if(c.b>=3)continue;c.vy-=9.81*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.ax+=c.sx*dt;c.ay+=c.sy*dt;
    const gy=groundY(c.x,c.z)+c.r;if(c.y<gy){c.y=gy;c.b++;c.vy=-c.vy*0.32;c.vx*=0.45;c.vz*=0.45;c.sx*=0.4;c.sy*=0.4;if(c.b===1)wSnd('casing',Math.hypot(c.x-camera.position.x,c.z-camera.position.z));if(c.b>=3){c.ax=Math.PI/2;c.vy=0}}}
  for(const sp of WPN.puffs){if(!sp.visible)continue;const u=sp.userData;u.t+=dt;const k=u.t/0.9;if(k>=1){sp.visible=false;continue}sp.scale.setScalar(0.05+u.s*Math.sqrt(k)*1.6);sp.material.opacity=0.85*(1-k);sp.position.y+=u.vy*dt}
  /* draw */let n=0;const TI=WPN.trIM;for(const t of WTR){const a=Math.max(0,t.d-2.2),b=Math.min(t.L,t.d);if(b<=a)continue;const len=b-a;_wv.set(t.dx,t.dy,t.dz);_wq.setFromUnitVectors(_wv2.set(0,0,1),_wv);_ws.set(0.011,0.011,len*0.5);
    _wm.compose(_wv3.set(t.x+t.dx*(a+len/2),t.y+t.dy*(a+len/2),t.z+t.dz*(a+len/2)),_wq,_ws);TI.setMatrixAt(n++,_wm)}TI.count=n;if(n)TI.instanceMatrix.needsUpdate=true;
  n=0;const SK=WPN.skIM;for(const s of WSK){_ws.set(0.006,0.006,0.03);const l=Math.hypot(s.vx,s.vy,s.vz)||1;_wv.set(s.vx/l,s.vy/l,s.vz/l);_wq.setFromUnitVectors(_wv2.set(0,0,1),_wv);_wm.compose(_wv3.set(s.x,s.y,s.z),_wq,_ws);SK.setMatrixAt(n++,_wm)}SK.count=n;if(n)SK.instanceMatrix.needsUpdate=true;
  n=0;const CI=WPN.csIM;for(const c of WCS){_we.set(c.ax,c.ay,0);_wq.setFromEuler(_we);_ws.set(c.r,c.r,c.l);_wm.compose(_wv3.set(c.x,c.y,c.z),_wq,_ws);CI.setMatrixAt(n++,_wm)}CI.count=n;if(n)CI.instanceMatrix.needsUpdate=true;_ws.set(1,1,1)}

/* ---------- a hitscan shot: march the ray in 1.5 m steps against people, cars, walls and the ground ---------- */
function wShot(D,M,dir){const L=D.range;const people=wPeople();let hit=null,hp=null;const st=1.5,n=Math.ceil(L/st);const fake={team:'p',vx:dir.x,vy:dir.y,vz:dir.z};
  for(let k=0;k<n&&!hit;k++){const a=k*st,b=Math.min(L,a+st);const ax=M.x+dir.x*a,ay=M.y+dir.y*a,az=M.z+dir.z*a,bx=M.x+dir.x*b,by=M.y+dir.y*b,bz=M.z+dir.z*b;const h=wHitScan(fake,ax,ay,az,bx,by,bz,people);
    if(h){hit=h;hp=[ax+(bx-ax)*h.t,ay+(by-ay)*h.t,az+(bz-az)*h.t]}}
  const end=hp||[M.x+dir.x*L,M.y+dir.y*L,M.z+dir.z*L];const dist=Math.hypot(end[0]-M.x,end[1]-M.y,end[2]-M.z);
  if(Math.random()<(D.id==='pistol'?0.5:0.7))WTR.push({x:M.x,y:M.y,z:M.z,dx:dir.x,dy:dir.y,dz:dir.z,L:dist,d:0.4,v:420});if(WTR.length>22)WTR.shift();
  if(!hit)return null;const[px,py,pz]=end,cd=Math.hypot(px-camera.position.x,pz-camera.position.z);
  if(hit.kind==='person'){wKnock(hit.n,px,pz);return hit}
  if(hit.kind==='target'){wRangeScore(hit,{team:'p',col:0xd8d0c0},px,py,pz);return hit}
  if(hit.kind==='player')return hit;
  /* surface */const metal=hit.kind==='car';const col=hit.kind==='ground'?0x8a8378:hit.kind==='car'?0x9aa0a6:0xcfc6b5;
  const rec={x:px,y:py,z:pz,nx:hit.nx,ny:hit.ny,nz:hit.nz,vx:dir.x,vy:dir.y,vz:dir.z,size:(metal?0.07:0.1)+Math.random()*0.03,spin:Math.random()*TAU,stretch:1,col:metal?0x6d7175:0xffffff};
  if(metal){Object.assign(rec,{car:hit.c,lx:hit.lx+hit.nlx*0.004,ly:hit.ly+hit.nly*0.004,lz:hit.lz+hit.nlz*0.004,nlx:hit.nlx,nly:hit.nly,nlz:hit.nlz});const co=Math.cos(hit.c.yaw),si=Math.sin(hit.c.yaw);rec.vx=dir.x*co-dir.z*si;rec.vz=dir.x*si+dir.z*co}
  if(hit.kind!=='ground'||Math.random()<0.7)wAddDecal(WPN.holes,rec);
  wPuff(px+hit.nx*0.05,py+hit.ny*0.05,pz+hit.nz*0.05,col,metal?0.18:0.32);if(metal||Math.random()<0.35)wSparks(px,py,pz,hit.nx,hit.ny,hit.nz,metal?7:3);
  wSnd(metal?'ric':'impact',cd);if(!wInZone(px,pz)&&metal)wHeat(5);return hit}
/* a person is hit: knocked down (no blood, no injury shown), stays down a few seconds, gets up and runs */
const W_SCREAM=['Run!','Gun!','Oh my God!','Get down!','Help!','Police!','Everybody run!'];
function wKnock(n,px,pz){if(wProtected(n))return;const cd=Math.hypot(px-camera.position.x,pz-camera.position.z);wSnd('thud',cd);WPN.hits++;wHitMarker();
  if(!n.static&&n.state!=='down'){n.state='down';n.timer=3.2+Math.random()*1.8;n.panic=9;if(n.h.play)n.h.play('lie');n.wDown=WPN.simT}
  else if(typeof npcReact==='function')npcReact(n,'hit',player.x,player.z);else n.panic=Math.max(n.panic||0,6);
  if(!wInZone(px,pz))wHeat(40);if(typeof STATS!=='undefined')STATS.knocked=(STATS.knocked||0)+1;if(typeof gameEvent==='function')gameEvent('shotHit',{npc:n})}
/* gunfire carries: walkers within 45 m run away, seated people within 25 m react; a few shout */
function wPanic(x,z){if(typeof NPCS==='undefined')return;let said=0;for(const n of NPCS){if(!n.h||!n.h.root.visible||n.state==='down')continue;const d=Math.hypot(n.x-x,n.z-z);if(d>45)continue;if(wProtected(n)&&d>25)continue;
    if(!n.static){n.panic=Math.max(n.panic||0,7)}else if(d<25&&(!n.wNear||WPN.simT-n.wNear>3)){n.wNear=WPN.simT;if(typeof npcReact==='function')npcReact(n,'near',x,z)}
    if(said<2&&d<30&&(!n.wSaid||WPN.simT-n.wSaid>5)&&Math.random()<0.2){n.wSaid=WPN.simT;said++;wBubble(n,pick(W_SCREAM),1.8)}}}

/* ============================== REACTIONS ============================== */
const W_LINES={hit:['Hey! Watch it!','Seriously? This is a new shirt!','Is that paint?!','Not cool!','Are you kidding me?','My mother is going to kill me.','Ha! Okay, you got me.','Paintball? Here? Really?','I am calling the police!','Ela re! Stop that!','It better wash off…','Unbelievable.'],
  wet:['Hey! I am soaked!','Water? Oh, come on!','At least it is hot today…','Very funny.','Ha! Refreshing.'],near:['Whoa!','What was that?','Careful!','Hey!']};
const WBUB=[];
function wBubble(n,text,secs){const box=$('wBub');if(!box)return;let o=WBUB.find(b=>b.n===n);if(!o){if(WBUB.length>=3){const x=WBUB.shift();x.el.remove()}const el=document.createElement('div');el.className='wbub';box.appendChild(el);o={n,el,t:0};WBUB.push(o)}
  o.el.textContent=text;o.t=secs||2.4;o.el.classList.add('on')}
function wBubTick(dt){for(let i=WBUB.length-1;i>=0;i--){const o=WBUB[i];o.t-=dt;const h=o.n.h;if(o.t<=0||!h||!h.root||!h.root.visible||player.interior){o.el.remove();WBUB.splice(i,1);continue}
    _wv.set(h.root.position.x,h.root.position.y+2.05*(h.root.scale.y||1),h.root.position.z);_wv.project(camera);const vis=_wv.z<1&&Math.abs(_wv.x)<1.1&&Math.abs(_wv.y)<1.1;o.el.style.display=vis?'':'none';
    if(vis){o.el.style.transform=`translate(${((_wv.x+1)/2*innerWidth).toFixed(0)}px,${((1-_wv.y)/2*innerHeight).toFixed(0)}px) translate(-50%,-100%)`;o.el.style.opacity=Math.min(1,o.t*2)}}}
/* a bystander is hit by paint or water: never hurt — they flinch, complain, laugh or hurry off, and wear the paint */
function wHitPerson(n,b,px,py,pz){if(wProtected(n))return;
  if(n.wTeam){wBotHit(n,b,px,py,pz);return}
  const d=Math.hypot(px-camera.position.x,pz-camera.position.z);wSnd(b.water?'splash':'splat',d);
  if(!b.water)wBodySplat(n,px,py,pz,b.vx,b.vy,b.vz,b.col);wSpray(px,py,pz,-b.vx/90,0.3,-b.vz/90,b.water?0xcfe8ff:b.col,b.water?3:5,1.6);
  let ok=true;if(typeof npcReact==='function'){ok=npcReact(n,'hit',player.x,player.z)!==false}
  else if(!n.static){n.panic=Math.max(n.panic||0,5);if(typeof ACTIONS!=='undefined'&&ACTIONS.flinch&&n.h.play)n.h.play('flinch',true)}
  if(!ok)return;if(b.team==='p'){WPN.hits++;wHitMarker();if(!wInZone(px,pz))wMischief(b.water?12:28,'person');if(typeof STATS!=='undefined')STATS.splats=(STATS.splats||0)+1}
  if(!n.wSaid||WPN.simT-n.wSaid>3){n.wSaid=WPN.simT;wBubble(n,pick(b.water?W_LINES.wet:W_LINES.hit),2.6);if(typeof gameEvent==='function')gameEvent('paintHit',{npc:n,water:b.water})}}
/* shots landing close by startle people (walkers hurry away) */
function wStartle(x,z,r,except){if(typeof NPCS==='undefined')return;for(const n of NPCS){if(n===except||!n.h||!n.h.root.visible||wProtected(n))continue;const d=Math.hypot(n.x-x,n.z-z);if(d>r)continue;
    if(n.wNear&&WPN.simT-n.wNear<2.5)continue;n.wNear=WPN.simT;if(typeof npcReact==='function')npcReact(n,'near',x,z);else if(!n.static)n.panic=Math.max(n.panic||0,2.5);
    if(Math.random()<0.25&&(!n.wSaid||WPN.simT-n.wSaid>4)){n.wSaid=WPN.simT;wBubble(n,pick(W_LINES.near),1.6)}}}
function wInZone(x,z){return (WRANGE.on||WPN.match)&&Math.hypot(x-WZONE.x,z-WZONE.z)<WZONE.r}
/* ---------- mischief meter → the municipal police walk you down and fine you ---------- */
function wHeat(v){return wMischief(v)}
function wMischief(v,why){if(WPN.guard&&WPN.guard.state==='leave')return;WPN.mis=Math.min(100,WPN.mis+v);WPN.misT=0;if(WPN.mis>=W_POLICE&&!WPN.guard)wGuardSpawn()}
const W_POLICE=60;const wStars=()=>WPN.guard?Math.max(1,WPN.guard.stars||1):WPN.mis>=85?3:WPN.mis>=50?2:WPN.mis>=20?1:0;
function wMisTick(dt){WPN.misT+=dt;if(!WPN.guard&&WPN.misT>10&&WPN.mis>0)WPN.mis=Math.max(0,WPN.mis-dt*4);const el=$('wMis');if(!el)return;const show=WPN.mis>0.5||!!WPN.guard;if(el.hidden===show)el.hidden=!show;
  if(show){$('wMisF').style.width=Math.round(WPN.guard?100:WPN.mis)+'%';el.classList.toggle('hot',WPN.mis>70||!!WPN.guard);const st=wStars();const k='W'+st+(WPN.guard?'p':'');if($('wMisL')._k!==k){$('wMisL')._k=k;$('wMisL').innerHTML=(WPN.guard?'POLICE ':'WANTED ')+'<b class="st">'+'★'.repeat(st)+'</b><b class="st0">'+'★'.repeat(3-st)+'</b>'}}}
function wGuardSpawn(){if(typeof Ped!=='function'||!PPL||!PPL.ready){WPN.mis=60;return}
  const px=player.x,pz=player.z,back=camYaw+Math.PI;let sx=null,sz=null;
  outer:for(const r of[26,20,32,14])for(let k=0;k<16;k++){const a=back+(k%2?1:-1)*Math.ceil(k/2)*0.35,x=px+Math.sin(a)*r,z=pz+Math.cos(a)*r;
    if(typeof inPlay==='function'&&!inPlay(x,z))continue;if(nearSchool(x,z))continue;const p={x,z};if(collide(p,0.45))continue;if(rayHit(px,pz,x,z)<0.999)continue;sx=x;sz=z;break outer}
  if(sx==null){sx=px+Math.sin(back)*6;sz=pz+Math.cos(back)*6}
  let h;try{h=new Ped(PPL.av&&PPL.av.guard?'guard':{fem:false},true)}catch(e){WPN.mis=60;return}h.protected=true;h.root.position.set(sx,groundY(sx,sz),sz);
  WPN.guard={stars:wStars(),h,x:sx,z:sz,yaw:Math.atan2(px-sx,pz-sz),state:'come',t:0,lost:0,stuck:0,lx:sx,lz:sz,static:true,protected:true,name:'Municipal Police'};
  wToast('Police! An officer is coming for you — holster the weapon.','warn');if(typeof stinger==='function')try{stinger('fail')}catch(e){}}
function wGuardTick(dt){const g=WPN.guard;if(!g)return;g.t+=dt;const h=g.h;const dx=player.x-g.x,dz=player.z-g.z,d=Math.hypot(dx,dz);let spd=0;
  if(g.state==='come'){const away=player.car||player.interior||d>90||(typeof mission!=='undefined'&&mission);if(away){g.lost+=dt;if(g.lost>8){wGuardEnd(true);return}}else g.lost=0;
    if(d<1.7&&!player.car&&!player.interior){g.state='talk';h.stop&&h.stop();wGuardTalk();}
    else{spd=d>12?3.4:1.55;const ux=dx/(d||1),uz=dz/(d||1);const p={x:g.x+ux*spd*dt,z:g.z+uz*spd*dt};for(let i=0;i<2;i++)if(!collide(p,0.35,['t']))break;g.x=p.x;g.z=p.z;g.yaw=g.yaw+wrapA(Math.atan2(ux,uz)-g.yaw)*(1-Math.exp(-8*dt));
      g.stuck+=dt;if(g.stuck>2){if(Math.hypot(g.x-g.lx,g.z-g.lz)<0.6&&d>4){const a=Math.atan2(-dx,-dz);for(const r of[7,5,3]){const x=player.x+Math.sin(a)*r,z=player.z+Math.cos(a)*r;if(!collide({x,z},0.4)&&rayHit(player.x,player.z,x,z)>0.999){g.x=x;g.z=z;break}}}g.stuck=0;g.lx=g.x;g.lz=g.z}}}
  else if(g.state==='talk'){g.yaw=g.yaw+wrapA(Math.atan2(dx,dz)-g.yaw)*(1-Math.exp(-6*dt));if(!(typeof DLG!=='undefined'&&DLG.open)&&g.t>g.talkT+0.5){wGuardPay()}}
  else if(g.state==='leave'){spd=1.5;const a=g.leaveA;const p={x:g.x+Math.sin(a)*spd*dt,z:g.z+Math.cos(a)*spd*dt};collide(p,0.35,['t']);g.x=p.x;g.z=p.z;g.yaw=a;if(g.t>g.leaveT+14||d>40){wGuardEnd(false);return}}
  g.x2=g.x;h.root.position.set(g.x,groundY(g.x,g.z),g.z);h.root.rotation.y=g.yaw;h.update(dt,spd,false)}
function wGuardTalk(){const g=WPN.guard;g.talkT=g.t;const fine=50*Math.max(1,g.stars||1)*(1+Math.min(3,WPN.simT-WPN.lastFine<300?WPN.fines:0));g.fine=fine;if(g.h.play)g.h.play('talk');if(g.h.lookAt)g.h.lookAt(player.x,player.y+1.6,player.z);
  const txt=`Weapon down! You are frightening the whole street. That is a ${money2(fine)} fine, and the weapon stays holstered. Practise at the range in the Alsos — next time you come to the station with me.`;
  if(typeof say==='function')say('Municipal Police',txt,[{t:`Pay the fine (${money2(fine)})`,f:()=>wGuardPay()},{t:'Sorry, officer.',f:()=>wGuardPay()}],{npc:g});else wGuardPay()}
function wGuardPay(){const g=WPN.guard;if(!g||g.state==='leave')return;if(typeof dlgClose==='function'&&typeof DLG!=='undefined'&&DLG.open)dlgClose();const amt=Math.min(player.money,g.fine||40);
  if(amt>0&&typeof addMoney==='function')addMoney(-amt,'Fine');WPN.fines++;WPN.lastFine=WPN.simT;WPN.mis=0;wSelect('fists',true);wSave();if(g.h.stop)g.h.stop();if(g.h.lookAt)g.h.lookAt(null);
  g.state='leave';g.leaveT=g.t;g.leaveA=Math.atan2(g.x-player.x,g.z-player.z);wToast(amt>0?`Fined ${money2(amt)} by the police.`:'The officer lets you off with a warning.','warn')}
function wGuardEnd(lost){const g=WPN.guard;if(!g)return;try{g.h.dispose()}catch(e){if(g.h.root.parent)g.h.root.parent.remove(g.h.root)}WPN.guard=null;if(lost){WPN.mis=40;wToast('You lost the police — for now.','info')}}

/* ============================== PLAYER: equip, pose, aim, fire ============================== */
function wSelect(id,quiet){if(!WDEF[id]||!WPN.owned[id])return false;if(WPN.loan)return false;if(WPN.cur===id)return true;WPN.cur=id;WPN.reload=0;WPN.cool=0.25;if(!quiet&&id!=='fists')wSnd('rack');wSave();wHud(true);return true}
function wCycle(dir){const own=WORDER.filter(k=>WPN.owned[k]);if(own.length<2){if(own.length<=1)wOnce('nogun',4,()=>wToast('No weapons yet — Fun Ocean Outdoors on Kifisias Ave (no. 228) sells them.','info'));return}let i=own.indexOf(WPN.cur);i=(i+(dir||1)+own.length)%own.length;wSelect(own[i])}
function wReload(){const D=wDef(),A=wAmmo();if(D.id==='fists'||!A||WPN.reload>0)return;if(A.mag>=D.mag)return;if(A.res===0){wOnce('noammo',3,()=>wToast('Out of ammunition — Fun Ocean Outdoors (Kifisias 228) sells boxes.','info'));return}WPN.reload=D.reload;wSnd(D.speed?'reload':'mag')}
/* where the muzzle is: the marker in the right hand (chars' handWorld), or a plain shoulder / hip position on older character builds */
const _whp=new THREE.Vector3(),_whq=new THREE.Quaternion(),_wfb=new THREE.Quaternion(),_wbasis=new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0));
function wPlaceGun(gun,aim,dt){if(!ph||!ph.root)return false;let ok=false;if(typeof ph.handWorld==='function'&&ph.handWorld('R',_whp,_whq)){gun.position.copy(_whp);gun.quaternion.copy(_whq);ok=true}
  if(!ok){const r=ph.root,yaw=r.rotation.y,co=Math.cos(yaw),si=Math.sin(yaw);const lx=aim?-0.17:-0.21,ly=aim?1.36:0.98,lz=aim?0.4:0.22;gun.position.set(r.position.x+co*lx+si*lz,r.position.y+ly,r.position.z-si*lx+co*lz);
    _wfb.setFromRotationMatrix(_wbasis);_we.set(aim?(ph.aimPitch||0):0.55,yaw,0,'YXZ');_wq.setFromEuler(_we);gun.quaternion.copy(_wq).multiply(_wfb)}
  gun.updateMatrixWorld(true);return true}
function wMuzzle(out){const D=wDef();const g=WPN.gun[D.id];if(g&&g.visible){out.copy(g.userData.muz).applyMatrix4(g.matrixWorld);return out}const r=ph.root;return out.set(r.position.x+Math.sin(player.yaw)*0.5-Math.cos(player.yaw)*0.17,r.position.y+1.38,r.position.z+Math.cos(player.yaw)*0.5+Math.sin(player.yaw)*0.17)}
let _wCarry=null;
function wPose(armed,aim){if(!ph)return;const D=wDef();let want=null;if(armed&&typeof ACTIONS!=='undefined'){const k=(aim?'aim_':'hold_')+(D.pose||'pistol');if(ACTIONS[k])want=k}
  if(want!==_wCarry){_wCarry=want;if(typeof ph.setCarry==='function'){ph.setCarry(want);if(want&&typeof ph.setProp==='function')ph.setProp(null)}}
  if('aimPitch' in ph||armed)ph.aimPitch=aim?WPN.pitch:0}
/* what is under the reticle: the best valid target for aim-assist, and whether a protected person is in the line of fire */
function wScanTarget(){const ray=aimRay();const o=ray.o,d=ray.d;const D=wDef();let best=null,bs=1e9,prot=null,pt=1e9;const touch=typeof inputMode!=='undefined'&&inputMode==='touch';const cone=touch?0.075:0.03;
  const test=(n,isProt)=>{const r=n.h.root;const cx=r.position.x,cy=r.position.y+1.2*(r.scale.y||1)*(n.crouch?0.6:1),cz=r.position.z;const vx=cx-o.x,vy=cy-o.y,vz=cz-o.z,t=vx*d.x+vy*d.y+vz*d.z;if(t<1.5||t>D.range+5)return;
    const px=vx-d.x*t,py=vy-d.y*t,pz=vz-d.z*t,perp=Math.hypot(px,py,pz);if(isProt){if(perp<0.5+t*0.012&&t<pt){pt=t;prot=n}return}const ang=perp/t;if(ang<cone&&perp<2.2){const s=ang*t*0.15+ang;if(s<bs){bs=s;best={n,x:cx,y:cy,z:cz,t}}}};
  if(typeof NPCS!=='undefined')for(const n of NPCS){if(!n.h||!n.h.root||!n.h.root.visible)continue;test(n,wProtected(n))}
  if(WPN.guard)test(WPN.guard,true);if(WPN.match)for(const b of WPN.match.bots)if(b.state!=='out')test(b,b.wTeam==='blue');
  /* a wall between the camera and the person hides them */
  const wallT=(()=>{const L=D.range+5;const w=wRay(o.x,o.z,o.x+d.x*L,o.z+d.z*L,'b');return w?w.t*L:1e9})();
  if(best&&best.t>wallT)best=null;if(prot&&pt>wallT)prot=null;if(prot&&best&&best.t<pt-1)prot=null;/* a valid target in front of a protected person is fine (the ball stops at the first) */
  WPN.target=best;WPN.prot=prot;return best}
function wAssist(dt){const t=WPN.target;if(!t||WPN.prot)return;if(!(typeof inputMode!=='undefined'&&inputMode==='touch'))return;const ray=aimRay(),o=ray.o,d=ray.d;
  const want=Math.atan2(t.x-o.x,t.z-o.z),cur=Math.atan2(d.x,d.z),dy=wrapA(want-cur);const wantP=Math.atan2(t.y-o.y,Math.hypot(t.x-o.x,t.z-o.z)),curP=Math.asin(clamp(d.y,-1,1));
  const k=1-Math.exp(-(WPN.fireDown?7:4)*dt);camYaw+=dy*k;camPitch=clamp(camPitch-(wantP-curP)*k,typeof PITCH_MIN!=='undefined'?PITCH_MIN:-0.6,typeof PITCH_MAX!=='undefined'?PITCH_MAX:1.2)}
/* where the reticle points in the world: first wall / ground along the camera ray (people are handled by aim-assist) */
function wAimPoint(out){const ray=aimRay(),o=ray.o,d=ray.d,D=wDef();const L=D.range;let tEnd=L;const w=wRay(o.x,o.z,o.x+d.x*L,o.z+d.z*L,'bw');if(w)tEnd=Math.min(tEnd,w.t*L);
  for(let t=2;t<tEnd;t+=0.75){const y=o.y+d.y*t;if(y<groundY(o.x+d.x*t,o.z+d.z*t)){tEnd=t;break}}
  if(WPN.target&&WPN.target.t<tEnd+1){out.set(WPN.target.x,WPN.target.y,WPN.target.z);return out}return out.set(o.x+d.x*tEnd,o.y+d.y*tEnd,o.z+d.z*tEnd)}
function wFire(){const D=wDef(),A=wAmmo();if(WPN.reload>0||!A)return;if(WPN.prot){wOnce('prot',2.5,()=>{wToast('Not a target — you never aim at people who are not part of the game.','info')});wSnd('click');return}
  if(A.mag<=0){wSnd('click');wReload();return}A.mag--;WPN.cool=1/D.rate;WPN.lastFire=WPN.simT;
  const M=wMuzzle(WPN.muz),T=wAimPoint(WPN.aimP);let dx,dy,dz;
  if(D.speed){const hx=T.x-M.x,hz=T.z-M.z,hd=Math.hypot(hx,hz)||1e-3;const th=wLob(hd,T.y-M.y,D.speed,D.drag);dx=hx/hd*Math.cos(th);dz=hz/hd*Math.cos(th);dy=Math.sin(th)}/* paint: lob solved for gravity + drag */
  else{dx=T.x-M.x;dy=T.y-M.y;dz=T.z-M.z;const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l}
  const moving=Math.min(1,player.spd/2.6),sp=D.spread*(1+moving*1.4+WPN.bloom)*(WPN.still>0.6?0.6:1);const a=Math.random()*TAU,r=sp*Math.sqrt(-2*Math.log(Math.max(1e-6,Math.random())))*0.7;
  _wv.set(dx,dy,dz).normalize();_wu.set(-_wv.z,0,_wv.x).normalize();_wb.crossVectors(_wu,_wv);_wv.addScaledVector(_wu,Math.cos(a)*r).addScaledVector(_wb,Math.sin(a)*r).normalize();
  WPN.bloom=Math.min(1.5,WPN.bloom+(D.auto?0.1:0.22));const kick=D.recoil*(0.75+Math.random()*0.5);camPitch-=kick;WPN.kickBack=(WPN.kickBack||0)+kick*0.65;camYaw+=(Math.random()-0.5)*D.recoil*0.5;camShake=Math.max(camShake,D.kick*0.3);
  WPN.shots++;if(typeof STATS!=='undefined')STATS.shots=(STATS.shots||0)+1;
  if(D.speed){const col=WPN.loan&&WPN.loan.col!=null?WPN.loan.col:PAINT[WPN.col%PAINT.length];wSpawnBall(M.x,M.y,M.z,_wv.x*D.speed,_wv.y*D.speed,_wv.z*D.speed,{col,drag:D.drag,team:'p',size:D.splat});wSnd('rifle',0);wStartle(M.x+_wv.x*6,M.z+_wv.z*6,6,null)}
  else{const dir=_wv.clone();wShot(D,M,dir);wSnd(D.snd,0);
    /* muzzle flash: two crossed billboards for one frame or two */const f=WPN.flash,f2=WPN.flash2;f.position.set(M.x+dir.x*0.05,M.y+dir.y*0.05,M.z+dir.z*0.05);f.scale.setScalar(D.flash*(0.8+Math.random()*0.45));f.material.rotation=Math.random()*TAU;f.visible=true;
    f2.position.set(M.x+dir.x*(0.08+D.flash*0.25),M.y+dir.y*(0.08+D.flash*0.25),M.z+dir.z*(0.08+D.flash*0.25));f2.scale.setScalar(D.flash*0.55);f2.material.rotation=Math.random()*TAU;f2.visible=true;WPN.flashT=0.045;
    wEject(D);if(!wInZone(player.x,player.z)){wPanic(player.x,player.z);wHeat(7)}}
  if(A.mag===0&&A.res!==0)setTimeout(()=>wReload(),D.auto?120:250)}
/* elevation angle that lands a ball (speed v, quadratic drag) on a point dist metres away and dh higher: 5 secant steps on a coarse simulation */
function wLobY(th,dist,v,drag){let vx=Math.cos(th)*v,vy=Math.sin(th)*v,x=0,y=0;const h=1/90;for(let i=0;i<400&&x<dist;i++){const sp=Math.hypot(vx,vy),kd=drag*sp;vx-=vx*kd*h;vy-=(9.81+vy*kd)*h;const nx=x+vx*h;if(nx>=dist){const f=(dist-x)/(nx-x);return y+vy*h*f}x=nx;y+=vy*h}return -99}
function wLob(dist,dh,v,drag){let th=Math.atan2(dh,dist);for(let k=0;k<5;k++){const y=wLobY(th,dist,v,drag);if(y<-90){th=Math.min(0.78,th+0.15);continue}const e=dh-y;if(Math.abs(e)<0.005)break;th=Math.min(0.78,th+e/dist*Math.cos(th)*Math.cos(th))}return th}
/* ============================== HUD: buttons, slot, wheel, reticle ============================== */
const W_SVG={fists:'<path d="M14 30c-3-1-5-4-5-8v-6c0-2 1.5-3 3-3s3 1 3 3v-3c0-2 1.5-3 3-3s3 1 3 3v-1c0-2 1.5-3 3-3s3 1 3 3v1c0-2 1.5-3 3-3s3 1 3 3v9c0 6-4 10-10 10z" fill="currentColor"/>',
  pistol:'<path d="M7 11h31v5h-1v2H24l-1.5 2.5h-3.5l-2.6 12H9.5l3.6-14H7z" fill="currentColor"/><path d="M19 19h4l-1 3h-4z" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  smg:'<path d="M3 15h4v-3h2v3h24v-2h6v3h5v2h-5v3H24l-2 3h-4l-1.2 9h-5l1.2-9H9v1.5H3z" fill="currentColor"/><path d="M26 21h4.5l2.5 10h-4z" fill="currentColor"/>',
  rifle:'<path d="M1 16l6-2h6v-2h18v2h9v1.5h7v2h-7V19H31l-2 2h-2l-1 2h-3l-1.2 7h-4.4l1.4-7H13l-6 3H1z" fill="currentColor"/><rect x="17" y="8" width="8" height="3.5" rx="1.5" fill="currentColor"/><path d="M24.5 21h4.5l3 9h-4.5z" fill="currentColor"/>',
  paint:'<path d="M2 18h9v-3h22v6h-8l-1 8h-5l1-8h-8v3H2z" fill="currentColor"/><ellipse cx="19" cy="10" rx="6" ry="4" fill="#ffd21f"/><rect x="33" y="16" width="12" height="3" fill="currentColor"/>'};
function wIcon(id,w){return `<svg viewBox="0 0 48 36" width="${w||40}" height="${Math.round((w||40)*0.75)}" aria-hidden="true">${W_SVG[id]}</svg>`}
function wBuildUI(){if($('wPad'))return;const css=document.createElement('style');css.id='wCss';css.textContent=`
#wPad{position:absolute;inset:0;pointer-events:none}
#wFire{right:-4px;bottom:84px;width:68px;height:68px;font-size:13px;border-color:rgba(255,200,50,.85);background:rgba(11,14,18,.55)}
#wFire svg{width:34px;height:26px}#wAimB{right:134px;bottom:118px;width:52px;height:52px;font-size:11px}#wRel{right:140px;bottom:66px;width:44px;height:44px;font-size:13px}
#wAimB.on{background:rgba(255,200,50,.92);color:#111}
body:not(.armed) #wFire,body:not(.armed) #wAimB,body:not(.armed) #wRel{display:none}body.armed #bAct{visibility:hidden}
#wslot{pointer-events:auto;cursor:pointer;align-items:center}#wslot svg{display:block;color:#f3f1ea}#wslot:after{content:'';width:0;height:0;border:4px solid transparent;border-top-color:var(--gold);margin:4px 0 -4px 2px}
#wslot.hol{opacity:.55}#wslot.rel #wAmmo{color:var(--gold)}
#wRet{position:fixed;left:50%;top:50%;width:0;height:0;z-index:6;pointer-events:none;display:none;--s:9px}
body.aim.armed #wRet{display:block}#wRet i{position:absolute;background:#fff;box-shadow:0 0 2px #000,0 0 1px #000;transition:transform .06s}
#wRet .a{width:2px;height:8px;left:-1px;top:calc(-8px - var(--s))}#wRet .b{width:2px;height:8px;left:-1px;top:var(--s)}#wRet .c{width:8px;height:2px;top:-1px;left:calc(-8px - var(--s))}#wRet .d{width:8px;height:2px;top:-1px;left:var(--s)}
#wRet .e{width:4px;height:4px;left:-2px;top:-2px;border-radius:50%}#wRet.tgt i{background:#ff4d3d}#wRet.no i{background:#9aa3ad}
#wRet .x{display:none;width:22px;height:22px;left:-11px;top:-11px;background:none;box-shadow:none;border:2px solid #fff;border-radius:50%;opacity:.9}#wRet .x:after{content:'';position:absolute;left:8px;top:-3px;width:2px;height:24px;background:#fff;transform:rotate(45deg)}
#wRet.no .x{display:block}#wRet.no .a,#wRet.no .b,#wRet.no .c,#wRet.no .d,#wRet.no .e{display:none}
#wRet b{position:absolute;left:-60px;width:120px;top:22px;text-align:center;font:700 11px var(--f-cond);letter-spacing:.14em;text-transform:uppercase;color:#fff;text-shadow:var(--out)}
#wRet .hm{display:block;position:absolute;left:-12px;top:-12px;width:24px;height:24px;opacity:0;background:none;box-shadow:none}
#wRet .hm:before,#wRet .hm:after{content:'';position:absolute;left:11px;top:-2px;width:2px;height:28px;background:#fff;box-shadow:0 0 2px #000}#wRet .hm:before{transform:rotate(45deg)}#wRet .hm:after{transform:rotate(-45deg)}
#wRet.hit .hm{animation:whm .28s}@keyframes whm{0%{opacity:1;transform:scale(.7)}100%{opacity:0;transform:scale(1.25)}}
#wWheel{position:fixed;inset:0;z-index:12;background:radial-gradient(circle at center,rgba(11,14,18,.55),rgba(11,14,18,.82));display:flex;align-items:center;justify-content:center;pointer-events:auto}
#wWheel .ring{position:relative;width:min(78vw,300px);height:min(78vw,300px);border-radius:50%;border:2px solid rgba(255,255,255,.18)}
#wWheel button{position:absolute;width:42%;height:30%;border-radius:14px;border:2px solid rgba(255,255,255,.3);background:rgba(20,26,34,.92);color:#f3f1ea;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:700 12px var(--f-cond);letter-spacing:.1em;text-transform:uppercase}
#wWheel button small{font:400 15px var(--f-big);letter-spacing:.04em;color:var(--dim)}
#wWheel button.cur{border-color:var(--gold);box-shadow:0 0 0 2px rgba(255,200,50,.4) inset}#wWheel button.lock{opacity:.35}
#wWheel .n{left:29%;top:-4%}#wWheel .e{right:-8%;top:35%}#wWheel .s{left:29%;bottom:-4%}#wWheel .w{left:-8%;top:35%}
#wWheel .mid{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:400 22px var(--f-big);letter-spacing:.08em;color:var(--gold);text-align:center;line-height:1}
#wWheel .mid small{display:block;font:600 10px var(--f-ui);color:var(--dim);letter-spacing:0;margin-top:4px;max-width:110px}
#wMis{position:absolute;right:calc(var(--sar) + 64px);top:calc(var(--sat) + 96px);width:120px;font:700 10px var(--f-cond);letter-spacing:.16em;text-align:right;text-shadow:var(--out)}
#wMis i{display:block;height:5px;margin-top:2px;background:rgba(255,255,255,.18);border-radius:3px;overflow:hidden}#wMis i b{display:block;height:100%;width:0;background:#ffb020;transition:width .2s}
#wMis .st{color:var(--gold)}#wMis .st0{color:rgba(255,255,255,.25)}#wMis span{font-size:12px}#wMis.hot{color:#ff6b5b}#wMis.hot i b{background:#ff4d3d;animation:wpulse .6s infinite alternate}@keyframes wpulse{to{opacity:.45}}
#wBub{position:fixed;inset:0;pointer-events:none;z-index:5;overflow:hidden}.wbub{position:absolute;left:0;top:0;white-space:nowrap;font:600 12.5px/1.2 var(--f-ui);color:#111;background:#fff;padding:5px 9px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.4)}
.wbub:after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-top-color:#fff;border-bottom:0}
#wOut{position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .5s}
body.cine #wRet,body.cine #wMis,body.dlgOpen #wPad{display:none!important}
@media (orientation:portrait){#wMis{top:calc(var(--sat) + 104px)}}`;document.head.appendChild(css);
  const pad=$('btnsFoot');const wp=document.createElement('div');wp.id='wPad';wp.innerHTML=`<button class="btn" id="wFire" type="button">${wIcon('pistol',34)}</button><button class="btn" id="wAimB" type="button">Aim</button><button class="btn" id="wRel" type="button">R</button>`;
  if(pad)pad.appendChild(wp);
  const ret=document.createElement('div');ret.id='wRet';ret.innerHTML='<i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><i class="e"></i><i class="x"></i><i class="hm"></i><b id="wRetL"></b>';document.body.appendChild(ret);
  const mis=document.createElement('div');mis.id='wMis';mis.hidden=true;mis.innerHTML='<span id="wMisL">WANTED</span><i><b id="wMisF"></b></i>';($('hud')||document.body).appendChild(mis);
  const bub=document.createElement('div');bub.id='wBub';document.body.appendChild(bub);
  const out=document.createElement('div');out.id='wOut';document.body.appendChild(out);
  const wh=document.createElement('div');wh.id='wWheel';wh.hidden=true;document.body.appendChild(wh);
  wh.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.w){if(!WPN.owned[b.dataset.w]){wToast(WDEF[b.dataset.w].name+' — sold at Fun Ocean Outdoors (Kifisias Ave 228).','info');return}wSelect(b.dataset.w)}wWheel(false)});
  const fire=$('wFire');let fid=null;
  fire.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();if(fid!==null)return;const t=e.changedTouches[0];fid=t.identifier;WPN.fireDown=true;WPN.fireEdge=true;fire.classList.add('on');WPN.fx=t.clientX;WPN.fy=t.clientY;WPN.ft=e.timeStamp;if(typeof setInputMode==='function')setInputMode('touch');if(typeof audioOn==='function')audioOn()},{passive:false});
  /* the fire button doubles as a look pad: drag the thumb while firing to steer the aim */
  fire.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===fid){if(typeof lookBy==='function')lookBy((t.clientX-WPN.fx)*0.8,(t.clientY-WPN.fy)*0.8,e.timeStamp-WPN.ft);WPN.fx=t.clientX;WPN.fy=t.clientY;WPN.ft=e.timeStamp}},{passive:false});
  const fend=e=>{for(const t of e.changedTouches)if(t.identifier===fid){fid=null;WPN.fireDown=false;fire.classList.remove('on')}};fire.addEventListener('touchend',fend);fire.addEventListener('touchcancel',fend);
  fire.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();WPN.fireDown=true;WPN.fireEdge=true;const u=()=>{WPN.fireDown=false;removeEventListener('mouseup',u)};addEventListener('mouseup',u)});
  const tap=(el,fn)=>{el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();fn()},{passive:false});el.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();fn()})};
  tap($('wAimB'),()=>{WPN.aimLatch=!WPN.aimLatch});tap($('wRel'),()=>wReload());
  const slot=$('wslot');if(slot){slot.setAttribute('role','button');slot.setAttribute('aria-label','Choose a weapon');tap(slot,()=>wWheel(!WPN.wheel))}
  /* keyboard + mouse: 1–4 pick, Q next, R reload, right mouse / K aim, left click (armed) or J fires — captured before the game's own keys */
  addEventListener('keydown',e=>{if(!running||e.repeat||(e.target&&e.target.tagName==='INPUT'))return;const c=e.code;if(typeof MENU!=='undefined'&&MENU.open)return;if(typeof DLG!=='undefined'&&DLG.open)return;if($('sheet')&&!$('sheet').hidden)return;
    if(WPN.wheel&&(c==='Escape'||c==='Tab')){wWheel(false);e.stopImmediatePropagation();e.preventDefault();return}
    const k=WORDER.findIndex(id=>WDEF[id].key===c);if(k>=0){if(WPN.owned[WORDER[k]])wSelect(WORDER[k]);else wToast(WDEF[WORDER[k]].name+' — not in your bag yet.','info');return}
    if(c==='KeyQ'){wCycle(e.shiftKey?-1:1);return}if(c==='KeyR'){wReload();return}if(c==='KeyK'){WPN.aimLatch=!WPN.aimLatch;return}
    if(c==='KeyJ'&&wArmed()&&!player.car){WPN.fireDown=true;WPN.fireEdge=true;e.stopImmediatePropagation()}},true);
  addEventListener('keyup',e=>{if(e.code==='KeyJ')WPN.fireDown=false});
  const touchEl=$('touch');if(touchEl){touchEl.addEventListener('mousedown',e=>{if(!running)return;if(e.button===2){WPN.aimDown=true}else if(e.button===0&&wArmed()&&!player.car&&!WPN.holster){WPN.fireDown=true;WPN.fireEdge=true}});
    addEventListener('mouseup',e=>{if(e.button===2)WPN.aimDown=false;else if(e.button===0)WPN.fireDown=false})}
  addEventListener('blur',()=>{WPN.fireDown=WPN.aimDown=false})}
function wWheel(on){WPN.wheel=!!on;const wh=$('wWheel');if(!wh)return;if(on){const pos=['n','e','s','w'];
    wh.innerHTML=`<div class="ring">${WORDER.map((id,i)=>{const A=WPN.ammo[id],D=WDEF[id];const am=!WPN.owned[id]?(D.price?money2(D.price):''):id!=='fists'?(A.res<0?'∞':A.mag+' / '+A.res):'';return`<button type="button" class="${pos[i]}${WPN.cur===id?' cur':''}${WPN.owned[id]?'':' lock'}" data-w="${id}">${wIcon(id,44)}<span>${D.name}</span><small>${am}</small></button>`}).join('')}
      <div class="mid">WEAPONS<small>Never near the school, never indoors.</small></div></div>`}wh.hidden=!on}
let _wHudK='';
function wHud(force){const D=wDef(),A=wAmmo();const any=Object.keys(WPN.owned).length>1||!!WPN.loan;document.body.classList.toggle('armed',wArmed()&&!WPN.holster||!!WPN.loan&&!WPN.holster);
  if(!any){if(_wHudK!=='none'&&typeof hudWeapon==='function'){hudWeapon(null);_wHudK='none'}return}
  const am=D.id==='fists'?'':WPN.reload>0?'RELOAD':A.res<0?Math.round(A.mag/D.mag*100)+'%':A.mag+' / '+A.res;const k=D.id+am+(WPN.holster||'');if(k===_wHudK&&!force)return;_wHudK=k;
  if(typeof hudWeapon==='function'){hudWeapon(D.name,am);const s=$('wslot');if(s){s.classList.toggle('hol',!!WPN.holster&&D.id!=='fists');s.classList.toggle('rel',WPN.reload>0);let ic=s.querySelector('svg');const html=wIcon(D.id,30);if(!ic||s.dataset.ic!==D.id){if(ic)ic.remove();s.insertAdjacentHTML('afterbegin',html);s.dataset.ic=D.id}}}
  const f=$('wFire');if(f&&f.dataset.ic!==D.id){f.dataset.ic=D.id;f.innerHTML=wIcon(D.id==='fists'?'pistol':D.id,34)}}
function wRetTick(){const el=$('wRet');if(!el)return;const no=!!WPN.prot,tg=!no&&!!WPN.target;if(el._no!==no){el._no=no;el.classList.toggle('no',no);$('wRetL').textContent=no?'Not a target':''}if(el._tg!==tg){el._tg=tg;el.classList.toggle('tgt',tg)}
  const s=Math.round(7+WPN.bloom*10+Math.min(1,player.spd/2.6)*8);if(el._s!==s){el._s=s;el.style.setProperty('--s',s+'px')}}
function wHitMarker(){const el=$('wRet');if(!el)return;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')}

/* ============================== MAIN TICK ============================== */
function wInit(){if(WPN.ready)return;if(typeof scene==='undefined'||!scene||!ph||typeof MAP==='undefined'||!MAP)return;WPN.ready=true;wLoad();wInitMeshes();wBuildUI();wShopsInit();wRangeInit();wHud(true)}
function wTick(dt){wInit();if(!WPN.ready)return;WPN.simT+=dt;const D=wDef();
  /* 1. the rules */
  const blk=weaponBlock();if(blk!==WPN.holster){const was=WPN.holster;WPN.holster=blk;if(blk&&wArmed()&&!was){const m=W_BLOCKMSG[blk];if(m)wOnce('blk'+blk,20,()=>wToast(m,'info'))}if(blk){WPN.fireDown=false;WPN.aimLatch=false}wHud(true)}
  const armed=(wArmed()||!!WPN.loan)&&!WPN.holster&&WPN.outT<=0;
  /* 2. aim mode: hold fire / aim, or the aim toggle */
  if(armed&&(WPN.fireDown||WPN.aimDown||WPN.aimLatch||WPN.simT-WPN.lastFire<0.6))WPN.aimHold=0.35;else WPN.aimHold=Math.max(0,(WPN.aimHold||0)-dt);
  const aim=armed&&WPN.aimHold>0;if(aim!==WPN.aiming){WPN.aiming=aim;if(typeof setAimMode==='function')setAimMode(aim)}
  const ab=$('wAimB');if(ab&&ab._on!==WPN.aimLatch){ab._on=WPN.aimLatch;ab.classList.toggle('on',WPN.aimLatch)}
  /* 3. pose + marker in the hand */
  if(aim){const r=aimRay();WPN.pitch=clamp(-Math.asin(clamp(r.d.y,-1,1))+0.05,-0.85,0.85)}
  wPose(armed,aim);for(const id in WPN.gun){const g=WPN.gun[id],show=armed&&id===D.id&&ph&&ph.root.visible&&!player.car;if(g.visible!==show)g.visible=show;if(show)wPlaceGun(g,aim,dt)}
  /* 4. targets, assist, fire */
  WPN.cool-=dt;WPN.bloom=Math.max(0,WPN.bloom-dt*(WPN.fireDown?1.2:2.6));WPN.still=player.spd<0.3?WPN.still+dt:0;
  if(aim){wScanTarget();wAssist(dt)}else{WPN.target=null;WPN.prot=null}
  if(WPN.reload>0){WPN.reload-=dt;if(WPN.reload<=0){WPN.reload=0;const A=wAmmo();const n=A.res<0?D.mag-A.mag:Math.min(D.mag-A.mag,A.res);A.mag+=n;if(A.res>0)A.res-=n;WPN.col++;wSave()}}
  if(armed&&WPN.fireDown&&WPN.cool<=0&&(D.auto||WPN.fireEdge)&&(WPN.aimHold>0.3||WPN.simT-WPN.lastFire<1)&&Math.abs(wrapA(player.yaw-camYaw))<0.6){WPN.fireEdge=false;wFire()}
  if(!armed)WPN.fireEdge=false;
  /* fists: the fire button punches (the game's own punch) */
  if(!armed&&WPN.fireEdge){WPN.fireEdge=false}
  /* 5. world */
  if(WPN.kickBack>0){const r=WPN.kickBack*(1-Math.exp(-9*dt));camPitch+=r;WPN.kickBack-=r;if(WPN.kickBack<1e-4)WPN.kickBack=0}
  wFxTick(dt);wBallsTick(dt);wBallsDraw();wDecalsTick(dt);wBodyTick(dt);wBubTick(dt);wMisTick(dt);wGuardTick(dt);wRangeTick(dt);if(WPN.match)wMatchTick(dt);if(WPN.outT>0)wOutTick(dt);
  wHud();if(aim)wRetTick();if(WPN.wheel&&(player.car||!running))wWheel(false)}
FRAME_HOOKS.push(dt=>{try{wTick(dt)}catch(e){if((WPN.err=(WPN.err||0)+1)<6)console.error('weapons',e&&e.stack||e)}});

/* ============================== SHOPS ============================== */
/* Imaginarium (toy store, Levidou 2 — Overture/Foursquare) and Fun Ocean Outdoors (sporting goods, Kifisias 228 — Overture) sell markers and paint.
   Items are added to the shop's own interior menu (ordering at the counter, docs/INTERIORS.md); with no interiors module, a USE action at the door opens the shop sheet. */
const W_SHOPS=[{re:/fun ocean/i,name:'Fun Ocean Outdoors',cat:'sports',xz:[-93.05,105.83],items:[['Pistol (9 mm, 15-round magazine)',60,'w:pistol'],['SMG (9 mm, 30-round magazine)',150,'w:smg'],['Rifle (5.56 mm carbine, red-dot sight)',250,'w:rifle'],
  ['Pistol ammunition, box of 30',8,'w:ammo_pistol'],['SMG ammunition, box of 60',12,'w:ammo_smg'],['Rifle ammunition, box of 30',15,'w:ammo_rifle']]}];
function wShopsInit(){const I=typeof INTERIORS!=='undefined'?INTERIORS:null;
  for(const S of W_SHOPS){let key=null,door=null;if(I){for(const k in I){const e=I[k];if(!e||typeof e!=='object'||!e.name)continue;if(S.re.test(e.name)){key=k;break}}
      if(!key&&typeof I.generic==='function'){try{const e=I.generic({name:S.name,x:S.xz[0],z:S.xz[1],category:S.cat});if(e)for(const k in I)if(I[k]===e){key=k;break}}catch(err){}}}
    if(MAP&&MAP.pois){const p=MAP.pois.find(p=>S.re.test(p.name||''));if(p&&p.door)door=p.door}if(!door)door=S.xz;S.door=door;S.key=key;
    if(key){const e=I[key];const menu=e.menu||{title:e.name,sub:'',items:[]};const have=new Set((menu.items||[]).map(it=>it[2]));menu.items=(menu.items||[]).concat(S.items.filter(it=>!have.has(it[2])));if(!menu.sub)menu.sub='Outdoors & sporting goods · Kifisias 228';e.menu=menu}
    else if(typeof INTER!=='undefined')INTER.push({x:door[0],z:door[1],r:2.2,label:()=>'Shop at '+S.name,fn:()=>openShop({key:'w_'+S.name,name:S.name,category:S.cat,items:S.items},S.name)})}
  if(typeof onGame==='function')onGame('buy',d=>{if(!d||!d.tag||String(d.tag).slice(0,2)!=='w:')return;d.eat=false;const t=d.tag.slice(2);
    if(WDEF[t]){const had=WPN.owned[t];wGive(t,true);if(had){wAddAmmo(W_AMMOBOX[t]||30,t);wToast('+'+(W_AMMOBOX[t]||30)+' rounds for the '+WDEF[t].name+'.','star')}else wToast(WDEF[t].name+' bought — holstered while you are inside. Tap the weapon slot to switch.','star')}
    else if(t.slice(0,5)==='ammo_'){const id=t.slice(5),n=W_AMMOBOX[id]||30;if(WPN.owned[id]){wAddAmmo(n,id);wToast('+'+n+' rounds for the '+WDEF[id].name+'.','star')}else wToast('Ammunition bought — but you have no '+(WDEF[id]?WDEF[id].name:'gun')+' yet.','info')}
    if(typeof subtitle==='function')subtitle('Bought: '+d.item+'.',2.5);wHud(true)});
  /* first walk past the toy shop: a hint */
  if(typeof INTER!=='undefined')FRAME_HOOKS.push(()=>{if(WPN.hinted||!W_SHOPS[0].door||Object.keys(WPN.owned).length>1)return;const d=W_SHOPS[0].door;if(Math.hypot(player.x-d[0],player.z-d[1])<9&&!player.car){WPN.hinted=true;wToast('Fun Ocean Outdoors sells pistols, SMGs and rifles — practise at the shooting range in the Alsos.','info')}})}

/* ============================== PAINT RANGE (Alsos) ==============================
   A pop-up range stall in the Alsos clearing: €5 for 60 s with a loaner rifle and unlimited paint. Pop-up targets (5 / 10 points, centre ring) and two sliders (15).
   Prize: €1 per 10 points (max €30). Events: gameEvent('rangeStart'), gameEvent('rangeEnd',{score,prize,best}). API: WRANGE.start(), WRANGE.on, WRANGE.score. */
const WRANGE={built:false,on:false,score:0,t:0,targets:[],grp:null,best:0,
  start(){return wRangeStart()},stop(){return wRangeEnd('quit')}};
function wZoneAxes(){const a=WZONE.ang;return{ux:Math.cos(a),uz:Math.sin(a),vx:-Math.sin(a),vz:Math.cos(a)}}
function wZP(u,v){const A=wZoneAxes();return[WZONE.x+A.ux*u+A.vx*v,WZONE.z+A.uz*u+A.vz*v]}
function wTargetTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#f4efe2';g.fillRect(0,0,128,128);const rings=[[60,'#f4efe2'],[50,'#1c1f24'],[38,'#f4efe2'],[26,'#d6332a'],[14,'#ffd21f']];
  for(const[r,col]of rings){g.fillStyle=col;g.beginPath();g.arc(64,64,r,0,TAU);g.fill()}g.strokeStyle='#1c1f24';g.lineWidth=3;g.strokeRect(1.5,1.5,125,125);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
function wSignTex(lines,w,h,bg,fg){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
  lines.forEach((l,i)=>{g.font=l[1];g.fillText(l[0],w/2,h*(i+1)/(lines.length+1))});const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
function wRangeInit(){const[sx,sz]=wZP(-11,0);WRANGE.stall={x:sx,z:sz};
  if(typeof INTER!=='undefined')INTER.push({x:sx,z:sz,r:2.4,label:()=>WRANGE.on?'Stop the range round':'Shooting range — €5 for 60 s',fn:()=>{if(WRANGE.on)wRangeEnd('quit');else wRangeStart()},when:()=>!WPN.match&&!(typeof mission!=='undefined'&&mission)});
  if(typeof placed==='function')try{placed('shooting_range',sx,sz,'Shooting range (pop-up)','weapons')}catch(e){}}
/* the stall + target line meshes are built when the player comes within 140 m, and dropped beyond 220 m */
function wRangeBuild(){if(WRANGE.built)return;WRANGE.built=true;const grp=new THREE.Group();WRANGE.grp=grp;scene.add(grp);const A=wZoneAxes(),yaw=Math.atan2(A.ux,A.uz);
  const std=(c,r)=>new THREE.MeshStandardMaterial({color:c,roughness:r==null?0.7:r});const box=(w,h,d,m,u,v,y,ry)=>{const[x,z]=wZP(u,v);const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);me.position.set(x,groundY(x,z)+y,z);me.rotation.y=yaw+(ry||0);me.castShadow=true;me.receiveShadow=true;grp.add(me);return me};
  /* pop-up gazebo 3 × 3 m (white canopy, orange valance), counter, sign, rope line */
  const white=std(0xf2f0ea,0.85),orange=std(0xff7b1c,0.8),grey=std(0x9aa3ad,0.5),dark=std(0x2b2f36,0.6);
  for(const du of[-1.45,1.45])for(const dv of[-1.45,1.45]){const[x,z]=wZP(-12+du,dv);const p=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,2.4,8),grey);p.position.set(x,groundY(x,z)+1.2,z);grp.add(p)}
  {const[x,z]=wZP(-12,0);const roof=new THREE.Mesh(new THREE.ConeGeometry(2.12,0.7,4,1),white);roof.position.set(x,groundY(x,z)+2.75,z);roof.rotation.y=yaw+Math.PI/4;roof.castShadow=true;grp.add(roof)}
  for(const[du,dv,w,ry]of[[-1.5,0,3,0],[1.5,0,3,0],[0,-1.5,3,Math.PI/2],[0,1.5,3,Math.PI/2]])box(w,0.22,0.02,orange,-12+du,dv,2.3,ry);
  box(2.2,0.95,0.6,dark,-11.4,0,0.475);box(2.3,0.04,0.64,white,-11.4,0,0.97);
  {const t=wSignTex([['SHOOTING RANGE','700 50px "Barlow Condensed",Arial'],['€5 · 60 SECONDS · PRIZES','600 26px Arial']],512,160,'#10151b','#ffc832');const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.6),new THREE.MeshBasicMaterial({map:t}));
    for(const[uu,ry]of[[-11.09,0],[-11.71,Math.PI]]){const mm=m.clone();const[x,z]=wZP(uu,0);mm.position.set(x,groundY(x,z)+0.55,z);mm.rotation.y=yaw+ry;grp.add(mm)}}
  {const[x0,z0]=wZP(-9.6,-6),[x1,z1]=wZP(-9.6,6);const L=Math.hypot(x1-x0,z1-z0);const rope=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,L),new THREE.MeshStandardMaterial({color:0xffd21f,roughness:0.6}));rope.position.set((x0+x1)/2,groundY((x0+x1)/2,(z0+z1)/2)+0.75,(z0+z1)/2);rope.rotation.y=yaw+Math.PI/2;grp.add(rope);
    for(const v of[-6,0,6]){const[x,z]=wZP(-9.6,v);const p=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.04,0.8,8),dark);p.position.set(x,groundY(x,z)+0.4,z);grp.add(p)}}
  /* backstop net behind the targets */
  {const[x,z]=wZP(10.5,0);const net=new THREE.Mesh(new THREE.PlaneGeometry(13,3),new THREE.MeshStandardMaterial({color:0x1d2a22,transparent:true,opacity:0.55,side:THREE.DoubleSide,roughness:0.9,depthWrite:false}));net.position.set(x,groundY(x,z)+1.5,z);net.rotation.y=yaw;grp.add(net);
    for(const v of[-6.5,0,6.5]){const[px,pz]=wZP(10.5,v);const p=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,3.1,8),dark);p.position.set(px,groundY(px,pz)+1.55,pz);grp.add(p)}}
  /* targets: 0.5 m boards on a post, hinged at the bottom (pop up / fall back) */
  const ttex=wTargetTex(),tmat=new THREE.MeshStandardMaterial({map:ttex,roughness:0.8,side:THREE.DoubleSide}),pmat=std(0x5b4a36,0.9);
  const slots=[[-3,-4.2],[-1,1.5],[1.5,-1.6],[3.5,3.8],[5,-4.5],[7,0.6],[8.5,-2.8],[8,4.6]];WRANGE.targets=[];
  slots.forEach(([u,v],i)=>{const[x,z]=wZP(u,v);const g=new THREE.Group();g.position.set(x,groundY(x,z),z);g.rotation.y=yaw+Math.PI;const hinge=new THREE.Group();hinge.position.y=0.55;g.add(hinge);
    const b=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5),tmat);b.position.y=0.25;b.castShadow=true;hinge.add(b);const post=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.55,0.05),pmat);post.position.y=0.275;g.add(post);grp.add(g);
    WRANGE.targets.push({g,hinge,u,v,up:0,want:0,life:0,move:false,x,z,i})});
  /* two sliders running across on a rail */
  for(const[u,y]of[[6,1.05],[9.5,1.25]]){const[x0,z0]=wZP(u,-5),[x1,z1]=wZP(u,5);const L=Math.hypot(x1-x0,z1-z0);const rail=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,L),grey);rail.position.set((x0+x1)/2,groundY((x0+x1)/2,(z0+z1)/2)+y+0.33,(z0+z1)/2);rail.rotation.y=yaw+Math.PI/2;grp.add(rail);
    const g=new THREE.Group();const hinge=new THREE.Group();hinge.position.y=y;g.add(hinge);const b=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.42),tmat);b.position.y=0.1;hinge.add(b);g.rotation.y=yaw+Math.PI;grp.add(g);
    WRANGE.targets.push({g,hinge,u,v:0,up:0,want:0,life:0,move:true,ph:Math.random()*6,y,x:x0,z:z0})}
  WRANGE.targets.forEach(t=>{t.hinge.rotation.z=0;t.hinge.rotation.x=-Math.PI/2*0.98})}
function wRangeDrop(){if(!WRANGE.built||WRANGE.on)return;WRANGE.built=false;WRANGE.grp.traverse(o=>{if(o.geometry)o.geometry.dispose()});scene.remove(WRANGE.grp);WRANGE.grp=null;WRANGE.targets=[]}
function wRangeStart(){if(WRANGE.on)return false;if(typeof mission!=='undefined'&&mission){wToast('Finish your mission first.','info');return false}const b=weaponBlock();if(b&&b!=='busy'){wToast(W_BLOCKMSG[b]||'Not now.','info');return false}
  if(typeof spend==='function'&&!spend(5,'Shooting range'))return false;wRangeBuild();WRANGE.on=true;WRANGE.score=0;WRANGE.t=60;WRANGE.hits=0;WRANGE.shots0=WPN.shots;WRANGE.spawnT=0.6;
  WPN.loan={id:wArmed()?WPN.cur:'pistol',ammo:{mag:WDEF[wArmed()?WPN.cur:'pistol'].mag,res:-1}};WPN.cool=0.3;WPN.aimLatch=false;const[x,z]=wZP(-8.6,0),A=wZoneAxes();if(typeof placePlayer==='function')placePlayer(x,z,Math.atan2(A.ux,A.uz));else{player.x=x;player.z=z}camYaw=Math.atan2(A.ux,A.uz);camPitch=0.08;
  WRANGE.targets.forEach(t=>{t.want=0;t.life=0});if(typeof objective==='function')objective('Shooting range: hit the targets — <b>0</b> points');if(typeof hudTimer==='function')hudTimer(60,10);wSnd('whistle');
  if(typeof banner==='function')banner('SHOOTING RANGE','60 seconds · hold FIRE to aim and shoot');if(typeof gameEvent==='function')gameEvent('rangeStart',{});wHud(true);return true}
function wRangeEnd(why){if(!WRANGE.on)return;WRANGE.on=false;WPN.loan=null;if(typeof hudTimer==='function')hudTimer(null);if(typeof objective==='function')objective(null);WRANGE.targets.forEach(t=>t.want=0);
  const s=WRANGE.score,prize=why==='quit'?0:Math.min(30,Math.floor(s/10));const best=Math.max(WPN.best||0,s);const rec=s>(WPN.best||0)&&s>0;WPN.best=best;wSave();
  if(why!=='quit'){wSnd('buzz');if(typeof banner==='function')banner('TIME',`${s} points${rec?' · new best':''}`,false,prize?'+'+money2(prize):'');if(prize&&typeof addMoney==='function')setTimeout(()=>addMoney(prize,'Shooting range'),900)}
  else wToast(why==='left'?'You left the firing line — round over.':'Range round stopped.','info');if(typeof gameEvent==='function')gameEvent('rangeEnd',{score:s,prize,best,why});wHud(true)}
function wRangeTick(dt){const st=WRANGE.stall;if(!st)return;const d=Math.hypot(player.x-st.x,player.z-st.z);if(!WRANGE.built&&d<140&&!player.interior)wRangeBuild();else if(WRANGE.built&&d>220)wRangeDrop();if(!WRANGE.built)return;
  const T=WRANGE.targets;if(WRANGE.on){WRANGE.t-=dt;if(typeof hudTimer==='function')hudTimer(WRANGE.t,10);if(WRANGE.t<=0){wRangeEnd('time');}
    else{const[lx,lz]=wZP(-8.6,0);if(Math.hypot(player.x-lx,player.z-lz)>14||player.car||player.interior){wRangeEnd('left')}
      WRANGE.spawnT-=dt;const upN=T.filter(t=>t.want).length;if(WRANGE.spawnT<=0&&upN<3){WRANGE.spawnT=0.35+Math.random()*0.7;const free=T.filter(t=>!t.want&&t.up<0.05);if(free.length){const t=pick(free);t.want=1;t.life=t.move?3.4:1.5+Math.random()*1.3;t.ph=Math.random()*6}}}}
  for(const t of T){if(t.want){t.life-=dt;if(t.life<=0)t.want=0}t.up+=((t.want?1:0)-t.up)*(1-Math.exp(-(t.want?14:9)*dt));t.hinge.rotation.x=-Math.PI/2*0.98*(1-t.up);
    if(t.move){t.ph+=dt*1.25;const v=Math.sin(t.ph)*4.6;const[x,z]=wZP(t.u,v);t.g.position.set(x,groundY(x,z),z);t.x=x;t.z=z;t.v=v}}}
/* ray vs the standing target boards (planes facing the firing line) */
function wRangeHit(ax,ay,az,bx,by,bz){const A=wZoneAxes();let best=null;for(const t of WRANGE.targets){if(t.up<0.8)continue;const cx=t.g.position.x,cz=t.g.position.z;
    const da=(ax-cx)*A.ux+(az-cz)*A.uz,db=(bx-cx)*A.ux+(bz-cz)*A.uz;if(da>0||db<0)continue;const s=da/(da-db);const px=ax+(bx-ax)*s,py=ay+(by-ay)*s,pz=az+(bz-az)*s;
    const side=(px-cx)*A.vx+(pz-cz)*A.vz,cy=t.g.position.y+(t.move?t.y+0.1:0.8),h=py-cy;const half=t.move?0.21:0.25;if(Math.abs(side)<half&&Math.abs(h)<half&&(!best||s<best.t))best={t:s,kind:'target',tg:t,r:Math.hypot(side,h)/half,nx:-A.ux,ny:0,nz:-A.uz}}return best}
function wRangeScore(hit,b,px,py,pz){const t=hit.tg;wSpray(px,py,pz,hit.nx,0.2,hit.nz,b.col,8,2.2);if(b.team!=='p'){return}
  const pts=t.move?15:hit.r<0.25?10:5;if(WRANGE.on){WRANGE.score+=pts;WRANGE.hits++;if(typeof objective==='function')objective(`Shooting range: hit the targets — <b>${WRANGE.score}</b> points`)}
  t.want=0;t.life=0;wSnd('ding',0);wHitMarker();if(WRANGE.on&&typeof toast==='function'&&pts>=10)toast(pts===15?'Slider! +15':'Bullseye! +10','star')}

/* ============================== PAINTBALL MATCH (mission) ==============================
   "Alsos Paintball": 3 v 3 on a pop-up field in the Alsos clearing with inflatable bunkers. Hit = out for 10 s; first team to 8 hits wins.
   The bots are adult players in team bibs (blue = yours, orange); they take cover, peek, shoot with honest inaccuracy, put their hands up when hit. */
const W_FIRST=8;
const W_BUNK=[/* [u, v, kind, size] — mirrored for the other half */[0,0,'cyl',1.0],[-4.5,3.2,'box',1.1],[-4.5,-3.2,'cone',0.9],[-8,0.2,'cyl',0.8],[-6.2,5.6,'snake',2.6],[-2.2,-5.4,'cyl',0.7],[-2.3,1.8,'cone',0.7]];
const W_BCOL={cyl:0xffd21f,box:0x2aa9ff,cone:0xff2f92,snake:0x1d1f24};
function wFieldBuild(m){const grp=new THREE.Group();scene.add(grp);const A=wZoneAxes(),yaw=Math.atan2(A.ux,A.uz);const B=[];
  for(const[u,v,k,s]of W_BUNK)for(const sg of(u===0&&v===0?[1]:[1,-1]))B.push({u:u*sg,v:v*sg,k,s});
  for(const b of B){const[x,z]=wZP(b.u,b.v),gy=groundY(x,z);let me,h;const mat=new THREE.MeshStandardMaterial({color:W_BCOL[b.k],roughness:0.45,metalness:0});
    if(b.k==='cyl'){h=1.25;me=new THREE.Mesh(new THREE.CylinderGeometry(b.s*0.55,b.s*0.62,h,18),mat);me.position.set(x,gy+h/2,z);b.r=b.s*0.6}
    else if(b.k==='cone'){h=1.35;me=new THREE.Mesh(new THREE.ConeGeometry(b.s*0.8,h,3),mat);me.position.set(x,gy+h/2,z);me.rotation.y=yaw;b.r=b.s*0.6}
    else if(b.k==='box'){h=1.3;me=new THREE.Mesh(new THREE.BoxGeometry(b.s,h,b.s*1.4),mat);me.position.set(x,gy+h/2,z);me.rotation.y=yaw;b.hw=b.s/2;b.hd=b.s*0.7}
    else{h=0.8;me=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,b.s*2,14),mat);me.rotation.z=Math.PI/2;me.rotation.y=yaw;const g=new THREE.Group();g.add(me);g.position.set(x,gy+0.4,z);me=g;b.hw=b.s;b.hd=0.4;b.snake=1}
    b.h=h;b.x=x;b.z=z;me.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});grp.add(me)}
  /* boundary: posts with a rope + team flags at the bases */
  const L=13,W=8;const post=new THREE.MeshStandardMaterial({color:0x2b2f36,roughness:0.6}),rope=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.7});
  const corners=[[-L,-W],[L,-W],[L,W],[-L,W]];for(let i=0;i<4;i++){const[u0,v0]=corners[i],[u1,v1]=corners[(i+1)%4];const n=Math.max(1,Math.round(Math.hypot(u1-u0,v1-v0)/4.4));
    for(let k=0;k<n;k++){const ua=u0+(u1-u0)*k/n,va=v0+(v1-v0)*k/n,ub=u0+(u1-u0)*(k+1)/n,vb=v0+(v1-v0)*(k+1)/n;const[xa,za]=wZP(ua,va),[xb,zb]=wZP(ub,vb);
      const p=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.1,6),post);p.position.set(xa,groundY(xa,za)+0.55,za);grp.add(p);const len=Math.hypot(xb-xa,zb-za);
      const r=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,len),rope);r.position.set((xa+xb)/2,(groundY(xa,za)+groundY(xb,zb))/2+1.0,(za+zb)/2);r.rotation.y=Math.atan2(xb-xa,zb-za);grp.add(r)}}
  for(const[u,col]of[[-L+0.6,0x2a6fff],[L-0.6,0xff7b1c]]){const[x,z]=wZP(u,0);const p=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,2.6,6),post);p.position.set(x,groundY(x,z)+1.3,z);grp.add(p);
    const f=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.55),new THREE.MeshStandardMaterial({color:col,side:THREE.DoubleSide,roughness:0.8}));f.position.set(x+A.vx*0.45,groundY(x,z)+2.3,z+A.vz*0.45);f.rotation.y=yaw;grp.add(f)}
  m.o.field={grp,B,L,W};WPN.match=m.o}
function wFieldDrop(o){if(!o||!o.field)return;o.field.grp.traverse(x=>{if(x.geometry)x.geometry.dispose();if(x.material)x.material.dispose()});scene.remove(o.field.grp);o.field=null}
/* ray vs bunkers (cylinders as circles, boxes / snakes as oriented rectangles, up to their height) */
function wBunkerHit(ax,ay,az,bx,by,bz){const F=WPN.match.field;const A=wZoneAxes();let best=null;
  for(const b of F.B){const ex=bx-b.x,ez=bz-b.z;if(ex*ex+ez*ez>16)continue;const gy=groundY(b.x,b.z);if(by>gy+b.h)continue;
    if(b.r){if(ex*ex+ez*ez<b.r*b.r){const l=Math.hypot(ex,ez)||1;const t=0.999;if(!best||t<best.t)best={t,kind:'wall',nx:ex/l,ny:0,nz:ez/l}}}
    else{const lu=ex*A.ux+ez*A.uz,lv=ex*A.vx+ez*A.vz;if(Math.abs(lu)<b.hd&&Math.abs(lv)<b.hw){const pu=b.hd-Math.abs(lu),pv=b.hw-Math.abs(lv);let nx,nz;if(pu<pv){nx=A.ux*Math.sign(lu);nz=A.uz*Math.sign(lu)}else{nx=A.vx*Math.sign(lv);nz=A.vz*Math.sign(lv)}
      if(!best||0.999<best.t)best={t:0.999,kind:'wall',nx,ny:0,nz}}}}return best}
/* line of sight between two points (y heights) across the bunkers */
function wLOS(ax,ay,az,bx,by,bz){const F=WPN.match&&WPN.match.field;if(!F)return true;const A=wZoneAxes();const n=Math.ceil(Math.hypot(bx-ax,bz-az)/0.4);
  for(let i=1;i<n;i++){const t=i/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t,y=ay+(by-ay)*t;for(const b of F.B){const ex=x-b.x,ez=z-b.z;if(ex*ex+ez*ez>9)continue;if(y>groundY(b.x,b.z)+b.h)continue;
      if(b.r){if(ex*ex+ez*ez<b.r*b.r)return false}else{const lu=ex*A.ux+ez*A.uz,lv=ex*A.vx+ez*A.vz;if(Math.abs(lu)<b.hd&&Math.abs(lv)<b.hw)return false}}}return true}
/* push a circle (player / bot) out of the bunkers */
function wBunkerPush(p,r){const F=WPN.match&&WPN.match.field;if(!F)return;const A=wZoneAxes();for(const b of F.B){const ex=p.x-b.x,ez=p.z-b.z;if(ex*ex+ez*ez>16)continue;
    if(b.r){const d=Math.hypot(ex,ez),R=b.r+r;if(d<R&&d>1e-4){p.x=b.x+ex/d*R;p.z=b.z+ez/d*R}}
    else{let lu=ex*A.ux+ez*A.uz,lv=ex*A.vx+ez*A.vz;const hu=b.hd+r,hv=b.hw+r;if(Math.abs(lu)<hu&&Math.abs(lv)<hv){if(hu-Math.abs(lu)<hv-Math.abs(lv))lu=Math.sign(lu||1)*hu;else lv=Math.sign(lv||1)*hv;p.x=b.x+A.ux*lu+A.vx*lv;p.z=b.z+A.uz*lu+A.vz*lv}}}}
/* cover spots: beside each bunker on the side facing the team's own base */
function wCoverSpots(o,team){const s=team==='blue'?-1:1;const L=[];for(const b of o.field.B){const r=(b.r||Math.max(b.hd,0.5))+0.55;L.push({u:b.u+s*r,v:b.v,b,adv:-s*b.u,key:b.u+','+b.v})}return L.sort((a,c)=>c.adv-a.adv)}
const W_TEAMCOL={blue:'#2a6fff',orange:'#ff7b1c'};
function wSpawnBots(o){o.bots=[];const look=(i)=>{let s=null;try{s=typeof randomLook==='function'?randomLook(i%2?'f':'m'):{fem:!!(i%2)}}catch(e){s={fem:!!(i%2)}}return s};
  const teams=['blue','blue','orange','orange','orange'];teams.forEach((team,i)=>{const spec=Object.assign({},look(i));spec.tint=[W_TEAMCOL[team],null];let h;try{h=new Ped(spec,false)}catch(e){return}
    const b={h,wTeam:team,i,x:0,z:0,yaw:0,state:'adv',t:0,cover:null,target:null,shootT:0,out:0,crouch:false,wiped:0,acc:0,name:null,static:true};wBotRespawn(o,b,true);o.bots.push(b)})}
function wBotBase(team,k){const s=team==='blue'?-1:1;return wZP(s*11.4,(k%3-1)*2.6)}
function wBotRespawn(o,b,first){const k=o.bots?o.bots.indexOf(b):b.i;const[x,z]=wBotBase(b.wTeam,b.i);b.x=x;b.z=z;const A=wZoneAxes();b.yaw=Math.atan2(A.ux*(b.wTeam==='blue'?1:-1),A.uz*(b.wTeam==='blue'?1:-1));b.state='adv';b.t=0;b.cover=null;b.crouch=false;
  if(b.h.stop)b.h.stop();if(b.h.setCarry){const k2=typeof ACTIONS!=='undefined'&&ACTIONS.hold_rifle?'hold_rifle':null;b.h.setCarry(k2)}
  /* clear the paint on this bot */const D=WPN.body;if(D)for(let i=0;i<D.n;i++){const r=D.rec[i];if(r&&r.n===b){r.dead=true;_wm.makeScale(0,0,0);D.im.setMatrixAt(i,_wm);D.im.instanceMatrix.needsUpdate=true}}}
function wBotHit(b,ball,px,py,pz){const o=WPN.match;if(!o||b.state==='out'||ball.team===b.wTeam)return;wSnd('splat',Math.hypot(px-camera.position.x,pz-camera.position.z));wBodySplat(b,px,py,pz,ball.vx,ball.vy,ball.vz,ball.col);wSpray(px,py,pz,-ball.vx/90,0.3,-ball.vz/90,ball.col,6,1.6);
  b.state='out';b.out=10;b.crouch=false;if(b.h.stop)b.h.stop();if(b.h.setCarry)b.h.setCarry(null);if(typeof ACTIONS!=='undefined'&&ACTIONS.hands_up&&b.h.play)b.h.play('hands_up');
  if(ball.team==='p'||ball.team==='blue'){o.blue++;if(ball.team==='p'){WPN.hits++;wHitMarker();o.mine=(o.mine||0)+1}}else o.orange++;
  wBubble(b,pick(['I\'m out!','Hit! Out!','Ah — got me.','Nice shot!','Out, out!']),1.8);if(ball.team==='p'&&typeof toast==='function')toast(`Hit! ${o.blue} – ${o.orange}`,'star')}
function wPlayerHit(b){const o=WPN.match;if(!o||WPN.outT>0)return;o.orange++;WPN.outT=10;wSnd('hitme',0);if(typeof camShake!=='undefined')camShake=Math.max(camShake,0.5);
  const el=$('wOut');if(el){const c='#'+b.col.toString(16).padStart(6,'0');el.style.background=`radial-gradient(circle at ${30+Math.random()*40}% ${30+Math.random()*40}%, ${c}cc 0, ${c}88 12%, transparent 34%)`;el.style.opacity=1;setTimeout(()=>{el.style.opacity=0},1400)}
  if(typeof banner==='function')banner('YOU\'RE OUT','Back in 10 seconds',true);if(typeof ACTIONS!=='undefined'&&ACTIONS.hands_up&&ph.play)ph.play('hands_up');player.frozen=true;WPN.fireDown=false;
  setTimeout(()=>{if(!WPN.match)return;const[x,z]=wBotBase('blue',1);const A=wZoneAxes();if(typeof placePlayer==='function')placePlayer(x,z,Math.atan2(A.ux,A.uz))},1500)}
function wOutTick(dt){WPN.outT-=dt;if(WPN.outT<=0||!WPN.match){WPN.outT=0;player.frozen=false;if(ph&&ph.override==='hands_up')ph.stop();if(WPN.match&&typeof toast==='function')toast('Back in!','star')}}
function wMatchTick(dt){const o=WPN.match;if(!o||!o.live)return;const A=wZoneAxes();
  /* keep the player inside the boundary rope (soft) and out of the bunkers */
  {const p={x:player.x,z:player.z};wBunkerPush(p,0.32);player.x=p.x;player.z=p.z}
  for(const b of o.bots){b.t+=dt;const h=b.h;let spd=0;const enemies=[];if(b.wTeam==='orange'){if(WPN.outT<=0)enemies.push({x:player.x,z:player.z,y:player.y,me:true});}for(const e of o.bots)if(e.wTeam!==b.wTeam&&e.state!=='out')enemies.push({x:e.x,z:e.z,y:groundY(e.x,e.z),bot:e,crouch:e.crouch});
    if(b.state==='out'){b.out-=dt;const sv=b.wTeam==='blue'?-1:1;const[tx,tz]=wZP(sv*7,o.field.W+1.6);const dx=tx-b.x,dz=tz-b.z,d=Math.hypot(dx,dz);if(d>0.5&&b.out<9){spd=1.4;b.x+=dx/d*spd*dt;b.z+=dz/d*spd*dt;b.yaw=Math.atan2(dx,dz)}
      if(b.out<=0){wBotRespawn(o,b);}}
    else if(b.state==='adv'){if(!b.cover){const spots=wCoverSpots(o,b.wTeam).filter(s=>!o.bots.some(x=>x!==b&&x.cover===s.key));const pickN=Math.min(spots.length,3+Math.floor(b.t/8));const s=spots[Math.floor(Math.random()*Math.min(pickN,spots.length))]||spots[0];
        if(s){b.cover=s.key;b.cu=s.u;b.cv=s.v}}
      const[tx,tz]=wZP(b.cu||0,b.cv||0);const dx=tx-b.x,dz=tz-b.z,d=Math.hypot(dx,dz);if(d<0.35){b.state='cover';b.t=0;b.wait=1+Math.random()*2;b.crouch=true;if(b.h.play&&typeof ACTIONS!=='undefined'&&ACTIONS.crouch)b.h.play('crouch')}
      else{spd=3.2;const p={x:b.x+dx/d*spd*dt,z:b.z+dz/d*spd*dt};wBunkerPush(p,0.3);b.x=p.x;b.z=p.z;b.yaw=b.yaw+wrapA(Math.atan2(dx,dz)-b.yaw)*(1-Math.exp(-10*dt))}}
    else if(b.state==='cover'){if(b.t>b.wait){b.state='peek';b.t=0;b.crouch=false;if(b.h.stop)b.h.stop();if(b.h.setCarry&&typeof ACTIONS!=='undefined'&&ACTIONS.aim_rifle){b.h.setCarry('aim_rifle')}b.peekT=1.4+Math.random()*1.6;b.target=null;b.aimErr=0.09+Math.random()*0.06}}
    else if(b.state==='peek'){const gy=groundY(b.x,b.z);let best=null,bd=1e9;for(const e of enemies){const d=Math.hypot(e.x-b.x,e.z-b.z);if(d>30)continue;if(!wLOS(b.x,gy+1.45,b.z,e.x,e.y+(e.crouch?0.7:1.2),e.z))continue;if(d<bd){bd=d;best=e}}
      if(best){b.yaw=b.yaw+wrapA(Math.atan2(best.x-b.x,best.z-b.z)-b.yaw)*(1-Math.exp(-9*dt));b.aimErr=Math.max(0.03,b.aimErr-dt*0.05);b.shootT-=dt;
        if(b.shootT<=0&&b.t>0.45){b.shootT=0.16+Math.random()*0.22;const sx=b.x+Math.sin(b.yaw)*0.5,sz=b.z+Math.cos(b.yaw)*0.5,sy=gy+1.38,ty=best.y+(best.crouch?0.75:1.15);const sp=82;let dx,dy,dz;{const hx=best.x-sx,hz=best.z-sz,hd=Math.hypot(hx,hz)||1e-3;const th=wLob(hd,ty-sy,sp,0.011);dx=hx/hd*Math.cos(th);dz=hz/hd*Math.cos(th);dy=Math.sin(th)}const e=b.aimErr,a1=(Math.random()-0.5)*2*e,a2=(Math.random()-0.5)*1.4*e;_wv.set(dx,dy,dz);_wu.set(-dz,0,dx).normalize();_wv.addScaledVector(_wu,a1);_wv.y+=a2;_wv.normalize();
          wSpawnBall(sx,sy,sz,_wv.x*sp,_wv.y*sp,_wv.z*sp,{col:b.wTeam==='blue'?0x2aa9ff:0xff7b1c,team:b.wTeam,drag:0.011,size:0.2});wSnd('rifle',Math.hypot(sx-camera.position.x,sz-camera.position.z))}}
      if(b.t>b.peekT){if(Math.random()<0.4){b.state='adv';b.cover=null;b.t=0;if(b.h.setCarry&&typeof ACTIONS!=='undefined'&&ACTIONS.hold_rifle){b.h.setCarry('hold_rifle')}}else{b.state='cover';b.t=0;b.wait=0.8+Math.random()*1.8;b.crouch=true;if(b.h.play&&typeof ACTIONS!=='undefined'&&ACTIONS.crouch)b.h.play('crouch')}}}
    if(b.state!=='out'){const p={x:b.x,z:b.z};wBunkerPush(p,0.3);b.x=p.x;b.z=p.z}
    h.aimPitch=0;h.root.position.set(b.x,groundY(b.x,b.z),b.z);h.root.rotation.y=b.yaw;h.update(dt,spd,false)}
  /* the player's own team colour */
  if(WPN.loan)WPN.loan.col=0x2aa9ff}
function wMatchEnd(o){if(!o)return;o.live=false;for(const b of o.bots||[]){try{b.h.dispose()}catch(e){if(b.h.root.parent)b.h.root.parent.remove(b.h.root)}}o.bots=[];wFieldDrop(o);if(WPN.match===o)WPN.match=null;WPN.loan=null;WPN.outT=0;player.frozen=false;
  for(let i=WB.length-1;i>=0;i--)if(WB[i].team!=='p')WB.splice(i,1);wHud(true)}
function wRegisterMission(){if(typeof MISSIONS==='undefined'||MISSIONS.some(m=>m.id==='paintball'))return;const entry=()=>{const[x,z]=wZP(-13.5,3.4);return{x,z}};
  MISSIONS.push({id:'paintball',title:'Alsos Paintball',icon:'P',sub:'Alsos Kifisias · pop-up paintball match',giver:'Coach Eleni',reward:50,onFoot:true,
    brief:`A pop-up paintball match in the Alsos clearing: three against three, inflatable bunkers, washable paint, goggles for everyone. A hit means you are out for 10 seconds. First team to ${W_FIRST} hits wins. Marker and paint are provided.`,
    at:entry,
    setup(m){m.o.blue=0;m.o.orange=0;m.o.mine=0},
    cleanup(m){wMatchEnd(m.o)},
    retry(m){wMatchEnd(m.o);m.o.blue=0;m.o.orange=0},
    bonus(m){return m.o.orange===0?[20,'Flawless: not one hit against you']:m.o.mine>=5?[10,`${m.o.mine} hits by you`]:null},
    after:['Coach Eleni','Good game! Same time next Saturday — and keep the paint in the park.'],
    steps:[
      {type:'goto',text:'Go to the paintball field in the <b>Alsos</b> (by the station)',at:entry,r:3.5,onFoot:true,checkpoint:true},
      {text:'Get ready — the match starts in a moment',checkpoint:true,
        enter(m){if(!m.o.field)wFieldBuild(m);if(!m.o.bots||!m.o.bots.length)wSpawnBots(m.o);m.o.blue=0;m.o.orange=0;m.o.mine=0;m.o.live=false;m.o.cd=3.2;
          const[x,z]=wBotBase('blue',1),A=wZoneAxes();if(typeof placePlayer==='function')placePlayer(x,z,Math.atan2(A.ux,A.uz));camYaw=Math.atan2(A.ux,A.uz);WPN.loan={id:'paint',ammo:{mag:40,res:-1},col:0x2aa9ff};wHud(true);
          for(const b of m.o.bots)wBotRespawn(m.o,b);if(typeof subtitle==='function')subtitle('Goggles on. Blue team with you, orange at the far end. Hit means out for ten seconds.',4,'Coach Eleni')},
        tick(m,dt){m.o.cd-=dt;for(const b of m.o.bots){b.h.root.position.set(b.x,groundY(b.x,b.z),b.z);b.h.root.rotation.y=b.yaw;b.h.update(dt,0,false)}},
        done(m){if(m.o.cd<=0){m.o.live=true;wSnd('whistle');if(typeof banner==='function')banner('GO!','First to '+W_FIRST);return true}return false}},
      {text:m=>`Paintball · <b style="color:#5b9bff">BLUE ${m.o.blue}</b> – <b style="color:#ff9a4d">${m.o.orange} ORANGE</b> · first to ${W_FIRST}`,
        done(m){return m.o.blue>=W_FIRST},
        fail(m){if(m.o.orange>=W_FIRST)return'The orange team reached '+W_FIRST+' first.';const[x,z]=wZP(0,0);if(Math.hypot(player.x-x,player.z-z)>34||player.car)return'You left the field.';return null},
        exit(m){m.o.live=false}}]})}
addEventListener('load',()=>{try{wRegisterMission()}catch(e){console.error('weapons mission',e)}});

/* ============================== DEBUG / TEST HOOK ============================== */
window.__wpn={WPN,WDEF,WRANGE,WB,WTR,WCS,heat:wHeat,stars:wStars,shot:wShot,give:wGive,select:wSelect,fire:wFire,reload:wReload,block:weaponBlock,nearSchool,isProtectedTarget:wProtected,mischief:wMischief,
  rangeStart:wRangeStart,rangeEnd:wRangeEnd,zone:WZONE,zp:wZP,scan:wScanTarget,spawnBall:wSpawnBall,people:wPeople,tick:wTick,shops:W_SHOPS};
