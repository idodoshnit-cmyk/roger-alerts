'use strict';
/* Grand Kifisia — time of day, sun, sky and fog */
/* ============================== TIME OF DAY ============================== */
let tod=16.5,todRate=1/60;// game hours per real second (1 game minute per second)
const sunV=new THREE.Vector3();
function updateSky(dt){tod=(tod+dt*todRate)%24;const h=tod;const a=(h-6)/12*Math.PI;const elev=Math.sin(a)*1.15;const az=a;
  sunV.set(Math.cos(az)*Math.cos(Math.max(elev,-0.3)),Math.sin(elev),-0.35-Math.sin(az)*0.25).normalize();skyU.sunPosition.value.copy(sunV);
  const day=clamp((elev+0.08)/0.35,0,1);const dusk=clamp(1-Math.abs(elev-0.05)/0.25,0,1)*(elev>-0.15?1:0);
  sun.intensity=lerp(0.0,0.95,day);sun.color.setRGB(1,lerp(0.62,0.95,clamp(elev*3,0,1)),lerp(0.42,0.86,clamp(elev*3,0,1)));
  hemi.intensity=lerp(0.24,0.46,day);hemi.color.setRGB(lerp(0.35,0.78,day),lerp(0.42,0.86,day),lerp(0.7,1.0,day));amb.intensity=lerp(0.22,0.05,day);
  U.night.value=clamp(1-day*1.4,0,1);if(poolMesh)poolMesh.material.opacity=U.night.value*0.85;renderer.toneMappingExposure=lerp(0.62,0.74,day);
  const fogC=new THREE.Color().setRGB(lerp(0.07,0.6,day),lerp(0.09,0.72,day),lerp(0.15,0.88,day));fogC.lerp(new THREE.Color(0.85,0.6,0.45),dusk*0.45);scene.fog.color.copy(fogC);
  skyU.rayleigh.value=lerp(0.4,1.7,day);sky.material.uniforms.turbidity.value=lerp(1.2,2.2,day);
  const p=player.car||player;const lx=p.x,lz=p.z;sun.position.set(lx+sunV.x*160,Math.max(20,sunV.y*160),lz+sunV.z*160);sun.target.position.set(lx,0,lz);sun.target.updateMatrixWorld()}

