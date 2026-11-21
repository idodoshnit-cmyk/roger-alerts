// team:cars traffic watch + vehicle beauty shots. node tools/cars/ttest.js <prefix> [WxH]
// Traffic is advanced with __gk.step (fixed 1/30 s steps, independent of the headless frame rate) and checked for teleports and overlaps.
const {launch,ROOT}=require('../harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2]||'tt';const [W,H]=(process.argv[3]||'1000x560').split('x').map(Number);const SH=process.env.GK_SHOTS||ROOT;
  const h=await launch({width:W,height:H});const out=[];const log=s=>{console.log(s);out.push(s)};
  const shot=async(n,cam,tod)=>{await h.page.evaluate(([cam,tod])=>{const g=window.__gk;if(tod!=null)g.setTod(tod);const [x,y,z,tx,ty,tz]=cam;g.setFree(()=>{g.camera.position.set(x,g.terr(x,z)+y,z);g.camera.lookAt(tx,g.terr(tx,tz)+ty,tz)})},[cam,tod]);
    await h.page.waitForTimeout(1500);await h.page.screenshot({path:path.join(SH,prefix+'_'+n+'.png')});log('shot '+n+' '+JSON.stringify(await h.info()))};
  try{log('ready in '+(await h.waitReady()).toFixed(1)+'s');await h.page.evaluate(()=>document.getElementById('play').click());await h.page.waitForTimeout(2500);
    const sp=await h.page.evaluate(()=>[player.x,player.z]);log('spawn '+JSON.stringify(sp));
    // --- traffic watch: 40 s of game time sampled every second
    const samples=[];for(let i=0;i<40;i++){const r=await h.page.evaluate(()=>{__gk.step(1/30,30);return CARS.filter(c=>!c.hidden&&(c.mode==='traffic'||c.mode==='bus')).map(c=>[c.id,c.type,+c.x.toFixed(1),+c.z.toFixed(1),+c.yaw.toFixed(2),+c.vf.toFixed(1),c.ind||0])});samples.push(r)}
    let tele=0,over=0,moving=0,stopped=0;const ids=new Set();for(let i=0;i<samples.length;i++){const m=new Map(samples[i].map(r=>[r[0],r]));for(const r of samples[i]){ids.add(r[0]);if(Math.abs(r[5])>0.5)moving++;else stopped++}
      if(i>0)for(const r of samples[i-1]){const q=m.get(r[0]);if(q&&Math.hypot(q[2]-r[2],q[3]-r[3])>22){tele++;log('jump '+JSON.stringify([r,q]))}}
      const a=samples[i];for(let j=0;j<a.length;j++)for(let k=j+1;k<a.length;k++){if(Math.hypot(a[j][2]-a[k][2],a[j][3]-a[k][3])<1.6){over++;if(over<6)log('overlap t='+i+' '+JSON.stringify([a[j],a[k]]))}}}
    log(`traffic: ${ids.size} vehicles seen, active per sample ${samples.map(s=>s.length).join(',')}; moving ${moving} / stopped ${stopped} car-samples; jumps>22m/s ${tele}; overlaps ${over}`);
    log('sample last: '+JSON.stringify(samples[samples.length-1].slice(0,12)));
    await shot('top_spawn',[sp[0],60,sp[1]+0.5,sp[0],0,sp[1]],13);
    const pl=await h.page.evaluate(()=>MAP.key.platanos);await shot('top_platanos',[pl[0],55,pl[1]+0.5,pl[0],0,pl[1]],13);
    // --- beauty shots of the exotics and of parked rows / taxis
    const ex=await h.page.evaluate(()=>(VEH.exotics||[]).map(c=>[c.type,c.x,c.z,c.yaw]));log('exotics '+JSON.stringify(ex.map(e=>[e[0],Math.round(e[1]),Math.round(e[2])])));
    for(const [t,x,z,y] of ex.slice(0,5)){const fx=Math.sin(y),fz=Math.cos(y),lx=Math.cos(y),lz=-Math.sin(y);await shot('ex_'+t,[x+fx*4.2+lx*2.6,1.3,z+fz*4.2+lz*2.6,x,0.55,z],13)}
    const f=ex[0];if(f){const [t,x,z,y]=f;await shot('ex_'+t+'_night',[x+Math.sin(y)*4.5+Math.cos(y)*2.5,1.4,z+Math.cos(y)*4.5-Math.sin(y)*2.5,x,0.5,z],21.5)}
    const row=await h.page.evaluate(()=>{const c=CARS.find(c=>c.mode==='row'&&!c.hidden&&c.type==='scooterD')||CARS.find(c=>c.mode==='row');return c?[c.x,c.z,c.yaw]:null});
    if(row)await shot('scooters',[row[0]+Math.sin(row[2])*3.2+1.2,1.5,row[1]+Math.cos(row[2])*3.2+1.2,row[0],0.5,row[1]],13);
    const tx=await h.page.evaluate(()=>{const c=CARS.find(c=>c.type==='taxi'&&c.mode==='parked');return c?[c.x,c.z,c.yaw]:null});
    if(tx)await shot('taxi',[tx[0]+Math.sin(tx[2])*5+2.5,1.6,tx[1]+Math.cos(tx[2])*5+2.5,tx[0],0.6,tx[1]],13);
    log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors')}
  catch(e){log('FAILED: '+e.message);log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close();fs.writeFileSync(path.join(SH,prefix+'.log'),out.join('\n'))}})();
