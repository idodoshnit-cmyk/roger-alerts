// team:cars scenario runner: node tools/cars/gtest.js <prefix> <scenario.json>
// scenario: {views:[shot views as tools/shot.js], drive:{frames, every(ms), steps:[{t:sec, jx, jy, brake}] , tod}, traffic:{secs, every, cam:[x,h,z,tx,th,tz]}, evals:[js...]}
const {launch,ROOT}=require('../harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2]||'t';let sc=process.argv[3]||'{}';if(fs.existsSync(sc))sc=fs.readFileSync(sc,'utf8');sc=JSON.parse(sc);const [W,H]=(sc.size||'1000x500').split('x').map(Number);
  const h=await launch({width:W,height:H});const out=[];const log=s=>{console.log(s);out.push(s)};
  try{const secs=await h.waitReady();log('ready in '+secs.toFixed(1)+'s');
    const fps=await h.page.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else r(n/3)};requestAnimationFrame(f)}));log('title fps '+fps.toFixed(2));
    await h.page.evaluate(()=>document.getElementById('play').click());await h.page.waitForTimeout(2500);
    log('started; errors so far: '+h.errors.length);
    const P=await h.page.evaluate(()=>{const g=window.__gk,M=g.MAP(),o={};for(const k in M.key)o[k]=M.key[k];o.spawn=[g.player.x,g.player.z];return o});
    for(const v of (sc.views||[])){if(v.at){const p=P[v.at];const a=v.ang||0.6,d=v.dist||12;v.cam=[p[0]+Math.cos(a)*d,v.h||2,p[1]+Math.sin(a)*d,p[0],v.th||1,p[1]]}const f=await h.shot(prefix+'_'+v.name,v);log(v.name+' -> '+path.basename(f)+' '+JSON.stringify(await h.info()))}
    for(const e of (sc.evals||[])){try{log('eval: '+JSON.stringify(await h.page.evaluate(e)))}catch(err){log('eval error '+err.message)}}
    if(sc.drive){const D=sc.drive;if(D.tod!=null)await h.page.evaluate(t=>window.__gk.setTod(t),D.tod);
      if(D.setup)log('setup: '+JSON.stringify(await h.page.evaluate(D.setup)));
      const t0=Date.now();const s0=await h.page.evaluate(()=>simT);let k=0;const steps=D.steps||[];for(let i=0;i<(D.frames||10);i++){const t=D.clock==='sim'?(await h.page.evaluate(()=>simT))-s0:(Date.now()-t0)/1000;let st=steps[0]||{};for(const s of steps)if(t>=s.t)st=s;
        await h.page.evaluate(s=>{input.jx=s.jx||0;input.gas=(s.jy||0)<0;input.rev=(s.jy||0)>0;input.brake=!!s.brake;if(s.js)eval(s.js)},st);await h.page.waitForTimeout(D.every||300);
        const r=await h.page.evaluate(()=>{const c=player.car;if(!c)return{nocar:1,x:player.x,z:player.z};return{x:+c.x.toFixed(2),z:+c.z.toFixed(2),y:+c.y.toFixed(2),yaw:+c.yaw.toFixed(3),v:+c.vf.toFixed(2),vr:+c.vr.toFixed(2),g:c.gear,st:+c.steer.toFixed(2),p:+(c.pitch+c.sp).toFixed(3),r:+(c.roll+c.sr).toFixed(3),hp:Math.round(c.hp),un:DRV.unstuckN,rpm:Math.round(DRV.eng.rpm),slip:+DRV.eng.slip.toFixed(2)}});
        log('t='+((Date.now()-t0)/1000).toFixed(1)+' sim='+t.toFixed(1)+' '+JSON.stringify(r));if(D.shotEvery&&i%D.shotEvery===0){await h.page.screenshot({path:path.join(process.env.GK_SHOTS||ROOT,prefix+'_d'+String(k++).padStart(2,'0')+'.png')})}}}
    if(sc.traffic){const T=sc.traffic;const [x,y,z,tx,ty,tz]=T.cam;await h.page.evaluate(([x,y,z,tx,ty,tz])=>{const g=window.__gk;g.setFree(()=>{g.camera.position.set(x,g.terr(x,z)+y,z);g.camera.lookAt(tx,g.terr(tx,tz)+ty,tz)})},T.cam);
      let k=0;for(let i=0;i<T.n;i++){await h.page.waitForTimeout(T.every||1000);const r=await h.page.evaluate(()=>CARS.filter(c=>!c.hidden&&(c.mode==='traffic'||c.mode==='bus')).map(c=>[c.id,c.type,+c.x.toFixed(1),+c.z.toFixed(1),+c.vf.toFixed(1),c.ind,c.ri]));
        log('traffic '+i+' '+JSON.stringify(r));if(T.shotEvery&&i%T.shotEvery===0)await h.page.screenshot({path:path.join(process.env.GK_SHOTS||ROOT,prefix+'_tr'+String(k++).padStart(2,'0')+'.png')})}}
    log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors')}
  catch(e){log('FAILED: '+e.message);log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close();fs.writeFileSync(path.join(process.env.GK_SHOTS||ROOT,prefix+'.log'),out.join('\n'))}})();
