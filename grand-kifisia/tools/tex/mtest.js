// Functional tests of the materials module: late defTile (spare layer + repaint), TM twins, preset switching at runtime, the no-WebGL2 message.
// usage: node tools/tex/mtest.js [prefix]     (GK_DIR / GK_SHOTS as for mshot.js)
const {launch,ROOT}=require('../harness');const path=require('path');
(async()=>{const prefix=process.argv[2]||'mt';const SH=process.env.GK_SHOTS||path.join(ROOT,'shots');
  const h=await launch({width:900,height:420});const page=h.page;page.setDefaultTimeout(600000);let fail=0;const ok=(c,msg)=>{console.log((c?'PASS ':'FAIL ')+msg);if(!c)fail++};
  try{
    await page.evaluate(()=>localStorage.setItem('gk2_settings',JSON.stringify({q:'medium',fps:false})));await page.reload();
    const secs=await h.waitReady(900000);console.log('loaded in',secs.toFixed(1)+'s');
    await page.evaluate(()=>{window.__fc=0;const f=()=>{window.__fc++;requestAnimationFrame(f)};requestAnimationFrame(f);document.getElementById('play').click()});
    const frames=async n=>{const f0=await page.evaluate(()=>window.__fc);await page.waitForFunction(([f0,n])=>window.__fc>=f0+n,[f0,n],{timeout:600000,polling:250})};
    await frames(3);await page.addStyleTag({content:'.ui,#mm,#topr,#pauseBtn,#btns,#joyZone,#sub,#obj,#banner,#bUse,#fps{display:none!important}'});
    // ---- 1. late tiles
    const r1=await page.evaluate(()=>{const g=window.__gk;const x=100,z=60,y=g.terr(x,z);const f=()=>{g.camera.position.set(x,y+1.6,z);g.camera.lookAt(x+4,y+1.4,z+4)};g.setFree(f);f();
      const free0=TEX.free.length,nl=TEX.layers;
      defTile('lateA',(gg,S,m)=>{gg.fillStyle='#103a7a';gg.fillRect(0,0,S,S);gg.fillStyle='#ffd23a';gg.font='bold 44px Arial';gg.textAlign='center';gg.fillText('LATE A',S/2,S/2);gg.strokeStyle='#fff';gg.lineWidth=6;gg.strokeRect(8,8,S-16,S-16);m.fillStyle='#fff';m.fillRect(0,0,S,S)},{spec:.05,shin:30,glowK:2});
      const mk=(id,ox,rc)=>{const b=new GB();const cx=x+4+ox*0.7,cz=z+4-ox*0.7;const dx=0.7,dz=-0.7;b.quad([cx-dx,y+0.6,cz-dz],[cx+dx,y+0.6,cz+dz],[cx+dx,y+2.6,cz+dz],[cx-dx,y+2.6,cz-dz],[0,0],[1,0],[1,1],[0,1],C1,rc,1);const mm=worldMat();mm.side=THREE.DoubleSide;const me=new THREE.Mesh(b.build(),mm);me.frustumCulled=false;scene.add(me);return me};
      mk(T.lateA,-1.6,RECT[T.lateA]);
      // TM twin: 2 m × 2 m of brick with uv in metres
      const b=new GB();const cx=x+4+1.6*0.7,cz=z+4-1.6*0.7,dx=0.7,dz=-0.7;b.quad([cx-dx,y+0.6,cz-dz],[cx+dx,y+0.6,cz+dz],[cx+dx,y+2.6,cz+dz],[cx-dx,y+2.6,cz-dz],[0,0],[2,0],[2,2],[0,2],C1,RECT[TM.brick],0);const m2=worldMat();m2.side=THREE.DoubleSide;const me=new THREE.Mesh(b.build(),m2);me.frustumCulled=false;scene.add(me);
      return{free0,free1:TEX.free.length,nl,layer:TILE[T.lateA].layer,tm:tileM(TM.brick),tb:tileM(T.brick),tp:tileM(T.win),ids:TILE.filter(Boolean).length}});
    console.log(JSON.stringify(r1));ok(r1.free1===r1.free0-1&&r1.layer>=r1.nl-r1.free0,'late defTile took a spare layer');ok(r1.tm&&r1.tm[0]===1&&r1.tb&&Math.abs(r1.tb[0]-1.98)<0.01&&r1.tp===null,'tileM()');
    await frames(4);await page.screenshot({path:path.join(SH,prefix+'_late1.png')});
    const r2=await page.evaluate(()=>{const l0=TILE[T.lateA].layer;defTile('lateA',(gg,S,m)=>{gg.fillStyle='#7a1010';gg.fillRect(0,0,S,S);gg.fillStyle='#fff';gg.font='bold 40px Arial';gg.textAlign='center';gg.fillText('REPAINTED',S/2,S/2)},{spec:.05,shin:30});
      const w=[];const cw=console.warn;console.warn=(...a)=>{w.push(a.join(' '))};for(let i=0;i<6;i++)defTile('lateX'+i,(gg,S)=>{gg.fillStyle='#0f0';gg.fillRect(0,0,S,S)},{});console.warn=cw;
      return{same:TILE[T.lateA].layer===l0,free:TEX.free.length,warns:w.length,fallback:TILE[T.lateX5].layer===TILE[T.white].layer}});
    console.log(JSON.stringify(r2));ok(r2.same,'repaint keeps its layer');ok(r2.free===0&&r2.warns>=1&&r2.fallback,'spare layers exhausted -> warning + white fallback');
    await frames(4);await page.screenshot({path:path.join(SH,prefix+'_late2.png')});
    // ---- 2. presets at runtime (what the pause menu does)
    for(const q of['low','high','medium']){await page.evaluate(q=>{SETTINGS.q=q;Q=QP[q];pixelRatio=Math.min(window.devicePixelRatio||1,Q.pr);applyQuality();window.__gk.setFree(null)},q);
      await page.waitForFunction(q=>TEX.size===(QP[q].tex)&&TEX.nsize===(QP[q].ntex||0)&&TEX.ready,q,{timeout:600000,polling:500});await frames(4);
      const st=await page.evaluate(()=>({size:TEX.size,nsize:TEX.nsize,layers:TEX.layers,nlayers:TEX.nlayers,MB:+(TEX.bytes/1048576).toFixed(1),sh:Q.sh,sun2:sun2.visible,cast:sun.castShadow,pr:pixelRatio,lateLayer:TILE[T.lateA].layer}));
      await page.screenshot({path:path.join(SH,prefix+'_q_'+q+'.png')});console.log(q,JSON.stringify(st),JSON.stringify(await h.info()));ok(st.size===({low:256,high:512,medium:512})[q],'preset '+q+' texture size')}
    console.log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors');ok(h.errors.length===0,'no page errors');
    const w=[...new Set(h.logs.filter(l=>l.startsWith('warn')))];if(w.length)console.log(w.slice(0,12).join('\n'));
    // ---- 3. no WebGL 2
    await page.addInitScript(()=>{const o=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(t==='webgl2')return null;return o.call(this,t,...a)}});
    await page.reload();await page.waitForTimeout(8000);const txt=await page.evaluate(()=>document.getElementById('loadTxt').textContent);console.log('no-webgl2 message:',JSON.stringify(txt));ok(/WebGL 2/.test(txt),'no-WebGL2 message shown');
    await page.screenshot({path:path.join(SH,prefix+'_nogl2.png')});
    console.log(fail?('FAILED '+fail+' checks'):'ALL CHECKS PASSED')}
  catch(e){console.log('FAILED:',e.message);console.log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close()}})();
