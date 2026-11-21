'use strict';
/* Grand Kifisia — vehicle & effect audio (team:cars). Pure WebAudio synthesis, no files. Starts only after the first user gesture (audio()).
   Player engine: layered oscillators (firing frequency from rpm and cylinder count, sub, rasp) + filtered noise (intake/exhaust), load-dependent filter,
   gear shifts, tyre squeal, wind, scrape. Traffic: three positional engine voices for the nearest moving vehicles. Train rumble, door chime, departure tone.
   API: audio(), engine(speed, throttle, info?), sfx(name, value?), vehAudioTick(dt) (called from flushCars), trainSound(dist, speed), hornFor(type). */
let AC=null;
const VA={out:null,noise:null,eng:null,tyre:null,wind:null,scrape:null,traffic:[],train:null,ready:false,t:0,lastVol:-1};
function audio(){if(AC){if(AC.state==='suspended')AC.resume();return}try{AC=new (window.AudioContext||window.webkitAudioContext)();vaInit()}catch(e){AC=null}}
function vaVol(){return typeof SETTINGS!=='undefined'&&SETTINGS.vol!=null?clamp(SETTINGS.vol,0,1):0.8}
function vaNoiseBuf(){const n=AC.sampleRate*2,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);let p=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;p=p*0.6+w*0.4;d[i]=w*0.6+p*0.4}return b}
function vaLoop(type,f,q,dst){const s=AC.createBufferSource();s.buffer=VA.noise;s.loop=true;s.playbackRate.value=0.8+Math.random()*0.4;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1;const g=AC.createGain();g.gain.value=0;s.connect(fl).connect(g).connect(dst||VA.out);s.start();return{s,f:fl,g}}
function vaOsc(type,f,dst){const o=AC.createOscillator();o.type=type;o.frequency.value=f;const g=AC.createGain();g.gain.value=0;o.connect(g).connect(dst);o.start();return{o,g}}
function vaShaper(k){const ws=AC.createWaveShaper();const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(x*k)/Math.tanh(k)}ws.curve=c;return ws}
function vaInit(){const comp=AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(AC.destination);VA.out=AC.createGain();VA.out.gain.value=vaVol();VA.out.connect(comp);VA.noise=vaNoiseBuf();
  // ---- player engine
  const E={};E.bus=AC.createGain();E.bus.gain.value=0;E.lp=AC.createBiquadFilter();E.lp.type='lowpass';E.lp.Q.value=0.9;E.sh=vaShaper(2.2);E.bus.connect(E.sh).connect(E.lp).connect(VA.out);
  E.fire=vaOsc('sawtooth',40,E.bus);E.sub=vaOsc('square',20,E.bus);E.rasp=vaOsc('sawtooth',80,E.bus);E.rasp.o.detune.value=9;E.hi=vaOsc('triangle',160,E.bus);
  E.air=vaLoop('bandpass',300,1.4,E.bus);E.clat=vaLoop('highpass',2400,0.7,E.bus);
  // amplitude modulation at the firing rate gives the "putt" of individual cylinders
  E.am=AC.createGain();E.am.gain.value=1;E.bus.disconnect();E.bus.connect(E.am);E.am.connect(E.sh);E.lfo=AC.createOscillator();E.lfo.type='sine';E.lfo.frequency.value=10;E.lfoG=AC.createGain();E.lfoG.gain.value=0;E.lfo.connect(E.lfoG).connect(E.am.gain);E.lfo.start();
  VA.eng=E;
  VA.tyre=vaLoop('bandpass',2100,7);VA.wind=vaLoop('lowpass',500,0.7);VA.scrape=vaLoop('bandpass',3200,3);VA.rumble=vaLoop('lowpass',140,0.8);
  // ---- traffic voices (positional)
  for(let i=0;i<3;i++){const g=AC.createGain();g.gain.value=0;const pan=AC.createStereoPanner?AC.createStereoPanner():null;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600;if(pan){g.connect(pan).connect(VA.out)}else g.connect(VA.out);
    const o1=AC.createOscillator();o1.type='sawtooth';const o2=AC.createOscillator();o2.type='square';const g2=AC.createGain();g2.gain.value=0.45;o1.connect(lp);o2.connect(g2).connect(lp);lp.connect(g);o1.start();o2.start();
    const n=vaLoop('lowpass',900,0.7,g);VA.traffic.push({g,pan,lp,o1,o2,n,car:null})}
  // ---- train
  VA.train={r:vaLoop('lowpass',90,1.2),s:vaLoop('bandpass',1800,9)};
  VA.ready=true}
/* voices: cylinders, cylinder-firing multiplier, timbre */
const VOICES={i3:{cyl:3,sub:0.35,rasp:0.5,hi:0.15,air:0.5,clat:0,sh:2.4,lp:1.0},i4:{cyl:4,sub:0.3,rasp:0.45,hi:0.12,air:0.45,clat:0,sh:2.0,lp:1.0},i6:{cyl:6,sub:0.25,rasp:0.35,hi:0.25,air:0.35,clat:0,sh:1.6,lp:1.25},
  v8:{cyl:8,sub:0.6,rasp:0.55,hi:0.15,air:0.45,clat:0,sh:3.2,lp:0.9},v10:{cyl:10,sub:0.4,rasp:0.7,hi:0.45,air:0.5,clat:0,sh:3.0,lp:1.6},v12:{cyl:12,sub:0.35,rasp:0.6,hi:0.55,air:0.45,clat:0,sh:2.6,lp:1.8},
  f6:{cyl:6,sub:0.45,rasp:0.65,hi:0.3,air:0.5,clat:0,sh:3.4,lp:1.35},diesel:{cyl:4,sub:0.45,rasp:0.3,hi:0.05,air:0.3,clat:0.5,sh:1.8,lp:0.75},bus:{cyl:6,sub:0.7,rasp:0.25,hi:0.03,air:0.35,clat:0.45,sh:1.6,lp:0.55},
  scooter:{cyl:1,sub:0.1,rasp:0.8,hi:0.35,air:0.6,clat:0.1,sh:3.5,lp:2.2},moto:{cyl:2,sub:0.5,rasp:0.7,hi:0.3,air:0.5,clat:0,sh:3.4,lp:1.4}};
/* engine(speed m/s, throttle -1..1, info from the driving model: {rpm,idle,red,load,gear,voice,slip,scrape,shift,on,vol}) */
function engine(v,thr,info){if(!VA.ready)return;const t=AC.currentTime,E=VA.eng;const on=!!(info&&info.on&&player.car);
  if(!on){E.bus.gain.setTargetAtTime(0,t,0.12);VA.tyre.g.gain.setTargetAtTime(0,t,0.08);VA.wind.g.gain.setTargetAtTime(0,t,0.2);VA.scrape.g.gain.setTargetAtTime(0,t,0.05);return}
  const V=VOICES[info.voice]||VOICES.i4;const rpm=info.rpm||800,red=info.red||6000,rf=clamp((rpm-(info.idle||800))/(red-(info.idle||800)),0,1),load=clamp(info.load||0,0,1);
  const f0=rpm/60*V.cyl/2;// firing frequency (four-stroke)
  E.fire.o.frequency.setTargetAtTime(f0,t,0.03);E.sub.o.frequency.setTargetAtTime(f0*0.5,t,0.03);E.rasp.o.frequency.setTargetAtTime(f0*2,t,0.03);E.hi.o.frequency.setTargetAtTime(f0*3.01,t,0.03);E.lfo.frequency.setTargetAtTime(Math.max(4,f0*0.5),t,0.05);
  const vol=(info.vol||1)*0.11;E.fire.g.gain.setTargetAtTime(0.55,t,0.05);E.sub.g.gain.setTargetAtTime(V.sub*(0.5+0.5*load),t,0.05);E.rasp.g.gain.setTargetAtTime(V.rasp*(0.25+0.75*load)*(0.4+0.6*rf),t,0.05);E.hi.g.gain.setTargetAtTime(V.hi*rf*(0.3+0.7*load),t,0.05);
  E.air.f.frequency.setTargetAtTime(f0*3,t,0.05);E.air.g.gain.setTargetAtTime(V.air*(0.15+0.85*load)*(0.3+rf),t,0.05);E.clat.g.gain.setTargetAtTime(V.clat*(0.4+0.4*load)*(1-rf*0.5),t,0.05);E.lfoG.gain.setTargetAtTime(V.clat?0.35:0.18,t,0.1);
  E.lp.frequency.setTargetAtTime((350+rf*2600+load*1400)*V.lp,t,0.05);E.bus.gain.setTargetAtTime(vol*(0.55+0.3*load+0.25*rf)*(info.shift?0.55:1),t,info.shift?0.015:0.06);
  // tyres, wind, scrape
  VA.tyre.g.gain.setTargetAtTime(v>2.5?clamp((info.slip||0)-0.12,0,1)*0.16:0,t,0.05);VA.tyre.f.frequency.setTargetAtTime(1700+Math.random()*700+v*8,t,0.05);
  VA.wind.g.gain.setTargetAtTime(Math.min(0.14,(v/42)*(v/42)*0.14),t,0.2);VA.wind.f.frequency.setTargetAtTime(300+v*22,t,0.2);
  VA.scrape.g.gain.setTargetAtTime(clamp(info.scrape||0,0,1)*0.2,t,0.03);
  if(info.shift)vaBlip('shift')}
function vaBlip(k){const t=AC.currentTime;if(k==='shift'){const o=AC.createOscillator(),g=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(70,t+0.08);g.gain.setValueAtTime(0.04,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.1);o.connect(g).connect(VA.out);o.start(t);o.stop(t+0.12)}}
function vaNoiseHit(t,dur,f,q,vol,type,f2){const s=AC.createBufferSource();s.buffer=VA.noise;s.playbackRate.value=0.7+Math.random()*0.6;const fl=AC.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+dur);fl.Q.value=q||1;const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(fl).connect(g).connect(VA.out);s.start(t,Math.random()*1.5);s.stop(t+dur+0.05)}
function vaTone(t,type,f,f2,dur,vol,att){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2&&f2!==f)o.frequency.exponentialRampToValueAtTime(f2,t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(att||0.005));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(VA.out);o.start(t);o.stop(t+dur+0.05)}
function hornFor(type){const S=typeof CARTYPES!=='undefined'?CARTYPES[type]:null;return S?(S.key==='bus'?'bus':S.cls==='moto'?'scooter':S.exotic?'sport':'car'):'car'}
function sfx(k,v){if(!AC||!VA.ready)return;const t=AC.currentTime;
  if(k==='crash'){const s=clamp((v||5)/20,0.15,1);vaNoiseHit(t,0.5+s*0.4,900+s*1500,0.7,0.35*s,'lowpass',120);vaTone(t,'sine',90,40,0.35,0.3*s);if(s>0.45)for(let i=0;i<6;i++)vaNoiseHit(t+0.05+Math.random()*0.35,0.08,4000+Math.random()*3000,6,0.06*s,'bandpass');return}
  if(k==='thud'){vaTone(t,'sine',110,55,0.22,0.25);vaNoiseHit(t,0.12,500,1,0.12,'lowpass');return}
  if(k==='door'){vaNoiseHit(t,0.16,260,1.2,0.22,'lowpass',90);vaTone(t+0.005,'square',70,50,0.08,0.06);vaNoiseHit(t,0.03,3000,2,0.05,'bandpass');return}
  if(k==='horn'){const ty=v||(player.car?hornFor(player.car.type):'car');const H={car:[[415,0.07],[523,0.06]],sport:[[440,0.07],[554,0.06],[660,0.04]],scooter:[[660,0.06],[700,0.03]],bus:[[247,0.09],[311,0.08],[370,0.05]]}[ty]||[[415,0.07],[523,0.06]];
    for(const [f,a] of H){const o=AC.createOscillator(),g=AC.createGain(),fl=AC.createBiquadFilter();o.type='square';o.frequency.value=f;fl.type='bandpass';fl.frequency.value=f*2;fl.Q.value=1.2;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(a,t+0.02);g.gain.setValueAtTime(a,t+0.42);g.gain.exponentialRampToValueAtTime(0.0001,t+0.5);o.connect(fl).connect(g).connect(VA.out);o.start(t);o.stop(t+0.55)}return}
  if(k==='tick'){vaNoiseHit(t,0.02,3500,4,0.05,'bandpass');return}
  if(k==='chime'){vaTone(t,'sine',659,659,0.9,0.12,0.01);vaTone(t+0.45,'sine',523,523,1.2,0.12,0.01);return}
  if(k==='depart'){for(let i=0;i<5;i++)vaTone(t+i*0.32,'square',1046,1046,0.16,0.035);return}
  if(k==='brakeAir'){vaNoiseHit(t,0.6,2500,0.8,0.12,'highpass');return}
  if(k==='buy'){vaTone(t,'sine',880,880,0.12,0.08);vaTone(t+0.09,'sine',1318,1318,0.18,0.07);return}
  if(k==='pass'){vaTone(t,'triangle',523,523,0.2,0.1);vaTone(t+0.15,'triangle',659,659,0.2,0.1);vaTone(t+0.3,'triangle',784,784,0.45,0.1);return}
  if(k==='fail'){vaTone(t,'sawtooth',220,140,0.6,0.07);return}
  if(k==='swish'){vaNoiseHit(t,0.2,1500,2,0.1,'bandpass',4000);return}
  vaTone(t,'sine',440,440,0.15,0.06)}
/* per-frame: master volume, traffic voices, the train (called from flushCars) */
function vehAudioTick(dt){if(!VA.ready)return;const t=AC.currentTime;const vol=vaVol();if(Math.abs(vol-VA.lastVol)>0.01){VA.out.gain.setTargetAtTime(vol,t,0.05);VA.lastVol=vol}
  VA.t-=dt;if(VA.t>0)return;VA.t=0.1;const cx=camera.position.x,cz=camera.position.z;
  // nearest moving vehicles (not the player's)
  const best=[];for(const c of CARS){if(c===player.car||c.hidden||!(c.mode==='traffic'||c.mode==='bus'))continue;const d=Math.hypot(c.x-cx,c.z-cz);if(d>45)continue;best.push([d,c]);}best.sort((a,b)=>a[0]-b[0]);
  const fx=-Math.sin(camYawSafe()),fz=-Math.cos(camYawSafe());
  VA.traffic.forEach((V,i)=>{const e=best[i];if(!e){V.g.gain.setTargetAtTime(0,t,0.2);return}const [d,c]=e;const S=CARTYPES[c.type];const voice=VOICES[S.dyn.eng.voice]||VOICES.i4;const v=Math.abs(c.vf);
    const rpm=S.dyn.eng.idle+(S.dyn.eng.red*0.55-S.dyn.eng.idle)*clamp(v/14,0,1);const f0=rpm/60*voice.cyl/2;V.o1.frequency.setTargetAtTime(f0,t,0.1);V.o2.frequency.setTargetAtTime(f0*0.5,t,0.1);V.lp.frequency.setTargetAtTime(300+v*40,t,0.1);
    const a=(S.L>8?0.09:0.045)/(1+d*d/60)*(0.5+0.5*clamp(v/10,0,1));V.g.gain.setTargetAtTime(a,t,0.15);V.n.g.gain.setTargetAtTime(0.5*clamp(v/12,0,1),t,0.15);
    if(V.pan){const dx=c.x-cx,dz=c.z-cz;const rx=-fz,rz=fx;V.pan.pan.setTargetAtTime(clamp((dx*rx+dz*rz)/(d+2),-0.9,0.9),t,0.1)}});
  // train
  if(typeof TRAIN!=='undefined'&&TRAIN.cars&&TRAIN.cars.length){let d=1e9;for(const m of TRAIN.cars){if(!m.visible)continue;d=Math.min(d,Math.hypot(m.position.x-cx,m.position.z-cz))}const sp=TRAIN.state==='arrive'||TRAIN.state==='depart'?(TRAIN.v||8):0;
    trainSound(d,sp)}}
function camYawSafe(){return typeof camYaw!=='undefined'?camYaw:0}
function trainSound(d,sp){if(!VA.ready)return;const t=AC.currentTime;const k=d<1e8?1/(1+d*d/900):0;VA.train.r.g.gain.setTargetAtTime(k*clamp(sp/10,0.1,1)*0.5,t,0.3);VA.train.r.f.frequency.setTargetAtTime(60+sp*8,t,0.3);VA.train.s.g.gain.setTargetAtTime(TRAIN.state==='arrive'&&sp<5?k*0.05:0,t,0.2)}
