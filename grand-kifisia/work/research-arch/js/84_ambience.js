'use strict';
/* Grand Kifisia — ambient sound, footsteps, UI sounds and music stingers. Everything is synthesised with WebAudio on the shared
   AudioContext AC (created by audio() in 83_audio.js on the first user gesture) and goes through one master gain (SETTINGS.vol).
   Public: ambStart(), ambienceTick(dt), ambVolume(v), uiSound(name), stinger(name), ambStep(), ambJump(), ambLand(). */
const AMB={on:false,out:null,noise:null,bed:null,hiss:null,murm:null,murm2:null,cic:null,t:0,stepD:0,side:1,birdT:3,crkT:2,dens:0,cafe:0,cafeT:0,spots:null,mW:0};
function ambLoop(freq,type,q){const s=AC.createBufferSource();s.buffer=AMB.noise;s.loop=true;s.playbackRate.value=0.6+Math.random()*0.8;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=AC.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AMB.out);s.start();return{f,g}}
function ambStart(){if(AMB.on||!AC)return;try{
  AMB.out=AC.createGain();AMB.out.gain.value=clamp(SETTINGS.vol==null?0.8:SETTINGS.vol,0,1);AMB.out.connect(AC.destination);
  const n=Math.floor(AC.sampleRate*2),b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;AMB.noise=b;
  AMB.bed=ambLoop(170,'lowpass',0.4);/* distant traffic rumble */
  AMB.hiss=ambLoop(1400,'bandpass',0.35);/* air / tyres on asphalt */
  AMB.murm=ambLoop(520,'bandpass',1.1);AMB.murm2=ambLoop(1150,'bandpass',1.6);/* café terrace voices */
  AMB.cic=ambLoop(5200,'bandpass',7);{const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=41;lg.gain.value=0;l.connect(lg);lg.connect(AMB.cic.g.gain);l.start();AMB.cicL=lg}
  AMB.on=true}catch(e){}}
function ambVolume(v){SETTINGS.vol=clamp(v,0,1);if(AMB.out)AMB.out.gain.setTargetAtTime(SETTINGS.vol,AC.currentTime,0.05)}
/* one enveloped oscillator note */
function ambTone(type,f0,f1,at,dur,vol,att){if(!AMB.on)return;const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+(at||0);o.type=type;o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(att||0.008));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(AMB.out);o.start(t);o.stop(t+dur+0.03)}
/* one filtered noise burst */
function ambBurst(freq,q,at,dur,vol,type){if(!AMB.on)return;const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain(),t=AC.currentTime+(at||0);s.buffer=AMB.noise;f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(AMB.out);s.start(t,Math.random()*1.5,dur+0.05)}
function uiSound(k){if(!AMB.on)return;
  if(k==='click')ambTone('triangle',1250,900,0,0.045,0.05);
  else if(k==='open'){ambTone('sine',420,640,0,0.09,0.05);ambBurst(2400,0.8,0,0.06,0.02)}
  else if(k==='ok'){ambTone('sine',880,880,0,0.09,0.05);ambTone('sine',1320,1320,0.08,0.16,0.05)}
  else if(k==='no')ambTone('square',196,160,0,0.16,0.035);
  else if(k==='coin'){ambTone('sine',1975,1975,0,0.05,0.035);ambTone('sine',2637,2637,0.03,0.07,0.03)}
  else if(k==='wp'){ambTone('sine',660,990,0,0.12,0.05)}
  else if(k==='talk')ambTone('sine',300+Math.random()*90,260,0,0.07,0.035);
  else if(k==='tick')ambTone('square',1000,1000,0,0.025,0.03);
  else if(k==='whistle'){ambTone('sine',2300,2500,0,0.5,0.06,0.02);ambTone('sine',2360,2560,0,0.5,0.04,0.02)}
  else if(k==='bounce'){ambTone('sine',150,70,0,0.11,0.12);ambBurst(700,0.8,0,0.05,0.04)}
  else if(k==='net'){ambBurst(3800,0.9,0,0.28,0.09);ambBurst(1800,0.7,0.03,0.2,0.05)}
  else if(k==='rim'){ambTone('triangle',620,560,0,0.22,0.07);ambTone('triangle',931,900,0,0.16,0.04)}
  else if(k==='beep'){ambTone('square',1480,1480,0,0.09,0.035);ambTone('square',1480,1480,0.14,0.09,0.035)}
  else if(k==='bell'){for(let i=0;i<4;i++){ambTone('sine',1318,1318,i*0.45,0.9,0.05);ambTone('sine',1975,1975,i*0.45,0.5,0.02)}}}
function stinger(k){if(!AMB.on){if(k==='pass'||k==='fail')sfx(k);return}
  if(k==='intro'){for(const [f,at] of[[82.4,0],[123.5,0.02],[164.8,0.5],[246.9,1.0]])ambTone('sawtooth',f,f,at,2.2-at*0.6,0.03,0.25);ambBurst(260,0.5,0,1.6,0.05,'lowpass');ambTone('sine',659,659,1.0,1.4,0.03,0.05)}
  else if(k==='obj'){ambTone('sine',784,784,0,0.14,0.05);ambTone('sine',1175,1175,0.1,0.3,0.05)}
  else if(k==='pass'){const n=[523.3,659.3,784,1046.5];n.forEach((f,i)=>{ambTone('triangle',f,f,i*0.11,0.5,0.06);ambTone('sine',f*2,f*2,i*0.11,0.3,0.02)});for(const f of[523.3,659.3,784,1046.5])ambTone('sawtooth',f/2,f/2,0.5,1.5,0.018,0.04);ambTone('sine',1568,1568,0.5,1.2,0.04)}
  else if(k==='fail'){[[392,0],[349.2,0.22],[293.7,0.44],[196,0.7]].forEach(([f,at],i)=>ambTone('sawtooth',f,f*0.97,at,i===3?1.3:0.3,0.035,0.02));ambBurst(140,0.6,0.7,1.1,0.06,'lowpass')}
  else if(k==='title'){for(const [f,at] of[[110,0],[164.8,0.3],[220,0.6],[329.6,1.2],[440,1.8]])ambTone('sawtooth',f,f,at,3.4-at,0.022,0.3);ambTone('sine',880,880,1.8,2.2,0.03,0.2)}}
/* footsteps: one step each time the player has covered a stride; timbre from the surface */
function ambStep(land){if(!AMB.on)return;const ind=!!player.interior,pave=ind||lvl(player.x,player.z)>0.05,run=player.mv>3.4,v=(land?0.14:0.05+Math.min(0.06,player.mv*0.012))*(0.85+Math.random()*0.3);AMB.side=-AMB.side;
  const f=(ind?1500:pave?1050:620)*(0.9+Math.random()*0.2)*(AMB.side>0?1:1.07);ambBurst(f,ind?1.6:1.0,0,run?0.05:0.07,v*(pave?1:1.25));ambTone('sine',ind?120:95,60,0,0.06,v*(run||land?0.9:0.5));if(pave&&!ind)ambBurst(3200,1.2,0.012,0.03,v*0.25)}
function ambJump(){ambBurst(900,0.6,0,0.12,0.03)}
function ambLand(){ambStep(true)}
function ambBird(){const n=2+Math.floor(Math.random()*4),f=2400+Math.random()*2200,far=0.25+Math.random()*0.75,sw=Math.random()<0.5;for(let i=0;i<n;i++){const d=0.05+Math.random()*0.07;ambTone('sine',f*(sw?1:1.25),f*(sw?1.3:0.9)+Math.random()*300,i*(0.09+Math.random()*0.05),d,0.018*far,0.01)}}
function ambCricket(){const f=4300+Math.random()*500,far=0.3+Math.random()*0.7;for(let k=0;k<3+Math.floor(Math.random()*3);k++)for(let i=0;i<3;i++)ambTone('sine',f,f,k*0.34+i*0.045,0.03,0.012*far,0.004)}
/* places where people sit and talk (café / restaurant terraces from the map's points of interest) */
function ambSpots(){AMB.spots=[];if(typeof POIS==='undefined')return;for(const P of POIS)if(P.cat==='food'||P.cat==='cafe')AMB.spots.push(P.x,P.z)}
function ambienceTick(dt){if(!AMB.on)return;
  /* footsteps */
  if(!player.car&&!player.air&&player.busy<=0&&player.mv>0.5){AMB.stepD+=player.mv*dt;const stride=player.mv>3.4?1.15:0.72;if(AMB.stepD>=stride){AMB.stepD-=stride;ambStep()}}else if(player.mv<0.2)AMB.stepD=0.4;
  AMB.t-=dt;if(AMB.t>0)return;const el=0.3-AMB.t;AMB.t=0.3;const now=AC.currentTime,ind=!!player.interior,p=player.car||player;
  if(!AMB.spots&&typeof MAPV!=='undefined'&&MAPV.ready)ambSpots();
  /* traffic density around the listener → city bed */
  let dens=0;for(let i=0;i<CARS.length;i++){const c=CARS[i];if(c.mode!=='traffic')continue;const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<90)dens+=(1-d/90)*clamp(Math.abs(c.vf||0)/8,0.2,1)}
  const day=tod>6.5&&tod<21,night=tod<5.5||tod>21.5,act=tod>7&&tod<23?1:0.35;AMB.dens+=(clamp(dens/3.2,0,1)-AMB.dens)*0.2;
  const mute=ind?0.25:1,inCar=player.car?0.6:1;
  AMB.bed.g.gain.setTargetAtTime((0.05+AMB.dens*0.11)*act*mute*inCar,now,0.4);AMB.hiss.g.gain.setTargetAtTime((0.006+AMB.dens*0.02)*act*mute*inCar,now,0.4);
  /* café murmur: near terraces by day/evening, and inside shops */
  AMB.cafeT-=el;if(AMB.cafeT<=0&&AMB.spots){AMB.cafeT=0.9;let c=0;const S=AMB.spots;for(let i=0;i<S.length;i+=2){const d=Math.hypot(S[i]-p.x,S[i+1]-p.z);if(d<26)c+=1-d/26}AMB.cafe=clamp(c/2.2,0,1)*(tod>8&&tod<24?1:0)}
  AMB.mW+=(Math.random()-0.5)*0.5;AMB.mW=clamp(AMB.mW,-1,1);const mg=(ind?0.035:AMB.cafe*0.04*inCar)*(1+AMB.mW*0.35);AMB.murm.g.gain.setTargetAtTime(mg,now,0.5);AMB.murm2.g.gain.setTargetAtTime(mg*0.5*(1-AMB.mW*0.4),now,0.5);AMB.murm.f.frequency.setTargetAtTime(480+AMB.mW*120,now,0.6);
  /* cicadas on warm afternoons under the trees, birds by day, crickets at night */
  const cic=!ind&&tod>11.5&&tod<19.5?0.012*inCar*sstep(1-AMB.dens):0;AMB.cic.g.gain.setTargetAtTime(cic,now,1.2);AMB.cicL.gain.setTargetAtTime(cic*0.8,now,1.2);
  if(!ind){if(day){AMB.birdT-=el;if(AMB.birdT<=0){AMB.birdT=(tod<10||tod>18?1.2:2.6)+Math.random()*4.5;ambBird()}}
    if(night||tod>20.3){AMB.crkT-=el;if(AMB.crkT<=0){AMB.crkT=0.8+Math.random()*2.6;ambCricket()}}}}
