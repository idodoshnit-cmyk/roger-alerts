// Materials/sky test runner (same view syntax as tools/shot.js, plus quality preset, HUD hiding, per-view eval and frame-accurate waiting).
// usage: node tools/tex/mshot.js <prefix> '<views json>|file' [WxH] [low|medium|high|auto] [nohud] [noaa]
// It waits for rendered FRAMES instead of wall-clock time, so it stays correct when the shared machine is slow (SwiftShader can need seconds per frame).
const {launch,ROOT}=require('../harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2]||'m';let views=process.argv[3]||'[{"name":"start"}]';if(fs.existsSync(views))views=fs.readFileSync(views,'utf8');views=JSON.parse(views);const [W,H]=(process.argv[4]||'900x420').split('x').map(Number);const q=process.argv[5],nohud=process.argv.includes('nohud'),noaa=process.argv.includes('noaa');
  const t00=Date.now();const h=await launch({width:W,height:H});const page=h.page;page.setDefaultTimeout(600000);console.log('browser slot after',((Date.now()-t00)/1000).toFixed(0)+'s');
  try{
    if((q&&q!=='auto')||noaa){await page.evaluate(([q,noaa])=>{const s={fps:false};if(q&&q!=='auto')s.q=q;if(noaa)s.aa=false;localStorage.setItem('gk2_settings',JSON.stringify(s))},[q,noaa]);await page.reload()}
    const secs=await h.waitReady(900000);console.log('loaded in',secs.toFixed(1)+'s');for(const l of h.logs.filter(l=>l.startsWith('[load]')&&!/undefined/.test(l)))console.log(' ',l);
    await page.evaluate(()=>{window.__fc=0;const f=()=>{window.__fc++;requestAnimationFrame(f)};requestAnimationFrame(f);document.getElementById('play').click()});
    const frames=async n=>{const f0=await page.evaluate(()=>window.__fc);await page.waitForFunction(([f0,n])=>window.__fc>=f0+n,[f0,n],{timeout:600000,polling:250})};
    await frames(3);
    console.log('TEX',JSON.stringify(await page.evaluate(()=>typeof TEX==='undefined'?null:({size:TEX.size,nsize:TEX.nsize,layers:TEX.layers,nlayers:TEX.nlayers,MB:+(TEX.bytes/1048576).toFixed(1),aniso:TEX.aniso,pr:pixelRatio,sh:Q.sh,dist:Q.dist}))));
    if(nohud)await page.addStyleTag({content:'.ui,#mm,#topr,#pauseBtn,#btns,#joyZone,#sub,#obj,#banner,#bUse,#fps{display:none!important}'});
    const places=await page.evaluate(()=>{const g=window.__gk,M=g.MAP(),S=g.SPECIAL(),o={};for(const k in S)o[k]={x:S[k].door[0],z:S[k].door[1],nx:S[k].nx,nz:S[k].nz,fx:S[k].x,fz:S[k].z};for(const k in M.key)if(!o[k])o[k]={x:M.key[k][0],z:M.key[k][1]};o.isa={x:M.isa.gate[0],z:M.isa.gate[1]};o.spawn={x:g.player.x,z:g.player.z};return o});
    for(const v of views){if(v.at){const p=places[v.at];if(!p){console.log('unknown place',v.at);continue}const d=v.dist||12,s=v.side||0,hh=v.h||1.7;if(p.nx!==undefined)v.cam=[p.x+p.nx*d-p.nz*s,hh,p.z+p.nz*d+p.nx*s,p.fx,v.th||2.6,p.fz];else{const a=v.ang||0.6;v.cam=[p.x+Math.cos(a)*d,hh,p.z+Math.sin(a)*d,p.x,v.th||2,p.z]}}
      const t0=Date.now();
      await page.evaluate(v=>{const g=window.__gk;if(v.tod!=null)g.setTod(v.tod);if(v.eval)(0,eval)(v.eval);
        if(v.player){g.player.x=v.player[0];g.player.z=v.player[1];g.player.y=g.groundY(v.player[0],v.player[1]);if(v.yaw!=null){g.player.yaw=v.yaw;if(typeof camYaw!=='undefined')camYaw=v.yaw}}
        if(v.cam){const [x,y,z,tx,ty,tz]=v.cam;const f=()=>{g.camera.position.set(x,g.terr(x,z)+y,z);g.camera.lookAt(tx,g.terr(tx,tz)+ty,tz)};g.setFree(f);f();if(v.fov){g.camera.fov=v.fov;g.camera.updateProjectionMatrix()}}else g.setFree(null);
        const sh=document.getElementById('sheet');if(sh&&v.keepSheet!==true)sh.hidden=true;
        if(typeof updateChunkVis==='function'){updateChunkVis(g.camera.position.x,g.camera.position.z);if(typeof updateLOD==='function')updateLOD()}},v);
      await frames(v.frames||4);
      const f=path.join(process.env.GK_SHOTS||path.join(ROOT,'shots'),prefix+'_'+v.name+'.png');await page.screenshot({path:f});
      console.log(v.name,'->',path.relative(ROOT,f),JSON.stringify(await h.info()),((Date.now()-t0)/1000).toFixed(1)+'s')}
    console.log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors');const w=[...new Set(h.logs.filter(l=>l.startsWith('warn')))];if(w.length)console.log(w.slice(0,12).join('\n'))}
  catch(e){console.log('FAILED:',e.message);console.log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close()}})();
