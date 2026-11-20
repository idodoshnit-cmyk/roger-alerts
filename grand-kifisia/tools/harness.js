// Headless test harness for Grand Kifisia. Usage from a scenario script:
//   const {launch}=require('./harness'); const h=await launch({width:900,height:420}); await h.play(); await h.shot('name',{cam:[x,yAboveGround,z,tx,tyAboveGround,tz],tod:13}); await h.close();
// The game is served from ../gk3 wrapped in the same skeleton the publish step adds. three.js CDN requests are answered from ../npm/package.
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),GAME=process.env.GK_DIR||path.join(ROOT,'gk3'),NPM=path.join(ROOT,'npm/package'),SHOTS=process.env.GK_SHOTS||path.join(ROOT,'shots');
const MIME={'.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.css':'text/css','.wasm':'application/wasm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.html':'text/html'};
// Machine-wide limit on simultaneous headless browsers (many agents share 4 cores / 15 GB): at most MAXB at once, the rest wait their turn.
const LOCKS=path.join(ROOT,'.locks'),MAXB=3;
function alive(pid){try{process.kill(pid,0);return true}catch(e){return false}}
async function acquireSlot(){fs.mkdirSync(LOCKS,{recursive:true});const t0=Date.now();
  for(;;){for(let i=0;i<MAXB;i++){const d=path.join(LOCKS,'slot'+i);try{fs.mkdirSync(d);fs.writeFileSync(path.join(d,'pid'),String(process.pid));return d}catch(e){
        try{const pid=+fs.readFileSync(path.join(d,'pid'),'utf8');const age=Date.now()-fs.statSync(d).mtimeMs;if(!alive(pid)||age>45*60*1000){fs.rmSync(d,{recursive:true,force:true})}}catch(e2){try{if(Date.now()-fs.statSync(d).mtimeMs>60000)fs.rmSync(d,{recursive:true,force:true})}catch(e3){}}}}
    if(Date.now()-t0>40*60*1000)throw new Error('no free browser slot after 40 minutes');await new Promise(r=>setTimeout(r,3000+Math.random()*2000))}}
function releaseSlot(d){try{fs.rmSync(d,{recursive:true,force:true})}catch(e){}}
async function launch(opt={}){
  const slot=await acquireSlot();process.on('exit',()=>releaseSlot(slot));for(const sig of['SIGINT','SIGTERM'])process.on(sig,()=>{releaseSlot(slot);process.exit(1)});
  const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0].split('#')[0]);
    if(u==='/'){r.setHeader('content-type','text/html');r.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>'+fs.readFileSync(path.join(GAME,'index.html'),'utf8')+'</body></html>');return}
    const f=path.join(GAME,u);if(!f.startsWith(GAME)){r.statusCode=403;r.end();return}
    fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;r.end('not found');return}r.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');r.end(d)})});
  await new Promise(res=>srv.listen(0,res));const port=srv.address().port;
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:opt.width||900,height:opt.height||420},deviceScaleFactor:1});
  await page.route('**/cdn.jsdelivr.net/npm/three@0.147.0/**',rt=>{const f=rt.request().url().split('three@0.147.0/')[1].split('?')[0];try{rt.fulfill({body:fs.readFileSync(path.join(NPM,f)),contentType:'application/javascript'})}catch(e){rt.abort()}});
  await page.route('**/fonts.googleapis.com/**',rt=>rt.fulfill({body:'',contentType:'text/css'}));
  const errors=[],logs=[];page.on('pageerror',e=>errors.push('PAGEERR '+e.message+' @ '+((e.stack||'').split('\n')[1]||'').trim()));
  page.on('console',m=>{const t=m.text();if(/GPU stall|willReadFrequently/.test(t))return;if(m.type()==='error')errors.push('console.error: '+t.slice(0,400));else if(m.type()==='warning')logs.push('warn: '+t.slice(0,300));else if(/^\[load\]/.test(t)||opt.verbose)logs.push(t.slice(0,300))});
  page.on('requestfailed',rq=>{const u=rq.url();if(!/fonts\.g/.test(u))errors.push('REQUEST FAILED '+u)});
  page.on('response',rs=>{if(rs.status()>=400)errors.push('HTTP '+rs.status()+' '+rs.url())});
  const t0=Date.now();await page.goto(`http://localhost:${port}/#debug`);
  const h={page,errors,logs,port,
    async waitReady(timeout=420000){const end=Date.now()+timeout;while(Date.now()<end){const st=await page.evaluate(()=>({play:!document.getElementById('play').hidden,txt:document.getElementById('loadTxt').textContent}));if(st.play)return (Date.now()-t0)/1000;if(/Could not/.test(st.txt))throw new Error('BOOT FAILED: '+st.txt+'\n'+errors.join('\n'));await page.waitForTimeout(1000)}throw new Error('load timeout\n'+errors.join('\n'))},
    async play(){const s=await h.waitReady();await page.click('#play');await page.waitForTimeout(1500);return s},
    // view: {cam:[x,yAbove,z,tx,tyAbove,tz]} free camera (heights are metres above the terrain) | {player:[x,z],yaw} teleport and use the normal chase camera | tod: hour 0-24 | wait: ms
    async view(v={}){await page.evaluate(v=>{const g=window.__gk;if(v.tod!=null)g.setTod(v.tod);if(v.player){g.player.x=v.player[0];g.player.z=v.player[1];g.player.y=g.groundY(v.player[0],v.player[1]);if(v.yaw!=null)g.player.yaw=v.yaw}
      if(v.cam){const [x,y,z,tx,ty,tz]=v.cam;g.setFree(()=>{g.camera.position.set(x,g.terr(x,z)+y,z);g.camera.lookAt(tx,g.terr(tx,tz)+ty,tz)})}else g.setFree(null);const sh=document.getElementById('sheet');if(sh&&v.keepSheet!==true)sh.hidden=true},v);await page.waitForTimeout(v.wait||2200)},
    async shot(name,v){if(v)await h.view(v);const f=path.join(SHOTS,name+'.png');await page.screenshot({path:f});return f},
    async info(){return page.evaluate(()=>{const r=window.__gk.renderer.info;return{calls:r.render.calls,tris:r.render.triangles,geometries:r.memory.geometries,textures:r.memory.textures}})},
    async close(){try{await browser.close()}finally{srv.close();releaseSlot(slot)}}};
  return h}
module.exports={launch,GAME,SHOTS,ROOT};
