'use strict';
/* Grand Kifisia — audio (WebAudio synth: engine, effects) */
/* ============================== AUDIO ============================== */
let AC=null,engOsc=null,engGain=null;
function audio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();engOsc=AC.createOscillator();engOsc.type='sawtooth';engGain=AC.createGain();engGain.gain.value=0;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=600;engOsc.connect(f).connect(engGain).connect(AC.destination);engOsc.start()}catch(e){}}
function engine(v,thr){if(!engOsc)return;engOsc.frequency.setTargetAtTime(38+v*4.2+Math.abs(thr)*14,AC.currentTime,0.1);engGain.gain.setTargetAtTime(player.car?0.035+Math.min(0.03,v*0.002):0,AC.currentTime,0.15)}
function sfx(k,v){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();const now=AC.currentTime;let f=440,d=0.15,vol=0.06,type='sine';
  if(k==='crash'){type='square';f=70;d=0.35;vol=Math.min(0.18,0.03+v*0.006)}else if(k==='thud'){type='triangle';f=90;d=0.2;vol=0.12}else if(k==='door'){type='square';f=180;d=0.08;vol=0.05}else if(k==='buy'){f=880;d=0.12}else if(k==='pass'){f=523;d=0.5;vol=0.08}else if(k==='fail'){type='sawtooth';f=160;d=0.6;vol=0.06}else if(k==='horn'){type='square';f=392;d=0.35;vol=0.07}else if(k==='swish'){type='triangle';f=1200;d=0.18}
  o.type=type;o.frequency.setValueAtTime(f,now);if(k==='pass'){o.frequency.setValueAtTime(659,now+0.15);o.frequency.setValueAtTime(784,now+0.3)}g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(0.0001,now+d);o.connect(g).connect(AC.destination);o.start(now);o.stop(now+d+0.02)}


