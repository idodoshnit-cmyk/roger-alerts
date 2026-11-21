// Standalone vehicle studio for fast iteration on gk3/js/70_vehicles.js (no world, loads in a few seconds).
// Usage: GK_DIR=<game dir> node tools/cars/viewer.js <outPrefix> '<json>' [WxH]
//   json: {"types":["hatch","taxi"], "views":["f34","side","r34","top"], "night":false, "lod":"near"|"far", "grid":[cols,rows], "extra":"js to eval after setup"}
//   One PNG per type: <outPrefix>_<type>.png, a contact sheet of the requested views (grid tiles).
// Uses the same machine-wide browser slot protocol as tools/harness.js (.locks/slotN).
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),GAME=process.env.GK_DIR||path.join(ROOT,'work/cars/gk3'),NPM=path.join(ROOT,'npm/package');
const LOCKS=path.join(ROOT,'.locks'),MAXB=3;
function alive(pid){try{process.kill(pid,0);return true}catch(e){return false}}
async function acquireSlot(){fs.mkdirSync(LOCKS,{recursive:true});const t0=Date.now();
  for(;;){for(let i=0;i<MAXB;i++){const d=path.join(LOCKS,'slot'+i);try{fs.mkdirSync(d);fs.writeFileSync(path.join(d,'pid'),String(process.pid));return d}catch(e){
        try{const pid=+fs.readFileSync(path.join(d,'pid'),'utf8');const age=Date.now()-fs.statSync(d).mtimeMs;if(!alive(pid)||age>45*60*1000){fs.rmSync(d,{recursive:true,force:true})}}catch(e2){try{if(Date.now()-fs.statSync(d).mtimeMs>60000)fs.rmSync(d,{recursive:true,force:true})}catch(e3){}}}}
    if(Date.now()-t0>40*60*1000)throw new Error('no free browser slot after 40 minutes');await new Promise(r=>setTimeout(r,3000+Math.random()*2000))}}
function releaseSlot(d){try{fs.rmSync(d,{recursive:true,force:true})}catch(e){}}
const PAGE=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style></head><body>
<canvas id="c"></canvas><div id="loadTxt"></div><div id="loadFill"></div>
<script src="/three/build/three.min.js"></script>
<script src="/js/00_core.js"></script>
<script>
// ---- stubs for the parts of the game the vehicles module touches ----
TER={x0:-2000,z0:-2000,step:4000,nx:2,nz:2,h:[0,0,0,0]};tH=new Float32Array(4);BOUNDS=[0,0,0,0];lvW=0;lvH=0;LVL=new Uint8Array(1);
var tod=13,MAT={},player={x:0,z:0,y:0,car:null},NPCS=[],running=true,ROADS=[],SIGNALS=[];
function subtitle(){} function sfx(){} function engine(){} function useEnv(m){ENVM.push(m);if(ENVT)m.envMap=ENVT;return m}
var ENVM=[],ENVT=null;
function studioEnv(night){const pm=new THREE.PMREMGenerator(renderer);const sc=new THREE.Scene();
  const g=new THREE.SphereGeometry(100,32,16);const col=[];const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i)/100;let c;if(night){c=y>0?[0.004+0.004*(1-y),0.006+0.006*(1-y),0.014+0.01*(1-y)]:[0.004,0.004,0.004]}
    else{const t=Math.max(0,y);c=y>0?[0.55-0.42*t,0.68-0.38*t,0.9-0.25*t]:[0.10,0.095,0.09];const az=Math.atan2(p.getZ(i),p.getX(i));const sunb=Math.exp(-((az-0.6)*(az-0.6))*3)*Math.exp(-((y-0.5)*(y-0.5))*8)*2.5;c=[c[0]+sunb,c[1]+sunb*0.95,c[2]+sunb*0.85];
      if(y>-0.02&&y<0.16){const b=0.5+0.5*Math.sin(az*9)+0.3*Math.sin(az*23);const k=b>0.6?0.35:1;c=[c[0]*k,c[1]*k,c[2]*k]}}
    col.push(c[0],c[1],c[2])}
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));sc.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,toneMapped:false})));
  const rt=pm.fromScene(sc,0.02,0.1,300);ENVT=rt.texture;for(const m of ENVM){m.envMap=ENVT;m.needsUpdate=true}
  scene.background=new THREE.Color(night?0x05070c:0x9db6d0);scene.fog.color.copy(scene.background);return ENVT}
function studioLight(night){hemi.intensity=night?0.12:0.95;amb.intensity=night?0.03:0.07;sun.intensity=night?0.18:2.7;sun.color.setHex(night?0x8fa8ff:0xfff0d8);U.night.value=night?1:0;renderer.toneMappingExposure=night?0.9:0.6;
  for(const [l,half] of [[sun,22],[sun2,60]]){l.position.set(30,55,38);l.target.position.set(0,0,0);l.target.updateMatrixWorld();const s=l.shadow.camera;s.left=-half;s.right=half;s.top=half;s.bottom=-half;s.near=1;s.far=200;s.updateProjectionMatrix();l.shadow.mapSize.set(2048,2048);l.shadow.bias=-0.0002;l.shadow.normalBias=0.03;l.shadow.needsUpdate=true}
  sun2.visible=true}
</script>
__SCRIPTS__
<script>
Q=QP.high;scene.fog.near=300;scene.fog.far=900;camera.far=1200;
const gm=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0x3c3d40,roughness:0.92}));gm.rotation.x=-Math.PI/2;gm.receiveShadow=true;scene.add(gm);
// lane-ish markings for scale: 1 m grid ticks
{const g=new THREE.BufferGeometry();const v=[];for(let i=-40;i<=40;i++){v.push(i,0.004,-0.03,i,0.004,0.03, -0.03,0.004,i,0.03,0.004,i)}g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));scene.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x8a8a8a})))}
window.__ready=false;window.__err=null;
window.studio=function(cfg){try{
  studioEnv(!!cfg.night);studioLight(!!cfg.night);tod=cfg.night?23:13;
  carMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.38,metalness:0.25,envMap:ENVT,envMapIntensity:0.9,side:THREE.DoubleSide});
  if(typeof makeClips==='function'){}
  initCars();window.__cars={};
  cfg.types.forEach((t,i)=>{const c=addCar(t,i*8,0,cfg.yaw||0,cfg.colors&&cfg.colors[i]||null,cfg.mode||'parked');window.__cars[t]=c});
  if(cfg.extra)eval(cfg.extra);
  window.__ready=true}catch(e){window.__err=String(e.stack||e)}};
window.renderSheet=function(type,views,cols,rows,lod,night){const c=window.__cars[type];const W=innerWidth,H=innerHeight;renderer.setSize(W,H,false);renderer.setPixelRatio(1);renderer.setScissorTest(true);
  const T_=CARTYPES[type];const L=T_.L,Hh=T_.H;const cx=c.x,cz=c.z;
  const V={f34:[cx+L*0.62+0.9,1.25,cz+L*0.85+1.2, cx,Hh*0.42,cz+0.2],side:[cx+L*1.25+1.2,1.0,cz, cx,Hh*0.45,cz],r34:[cx-L*0.6-1.0,1.5,cz-L*0.85-1.3, cx,Hh*0.42,cz-0.2],top:[cx+0.01,L*1.5+2.5,cz, cx,0,cz],
    front:[cx,0.9,cz+L*1.3+1.5,cx,Hh*0.45,cz],rear:[cx,0.9,cz-L*1.3-1.5,cx,Hh*0.45,cz],low:[cx+L*0.5+0.4,0.45,cz+L*0.6+0.5,cx,Hh*0.4,cz+0.4],sideR:[cx-L*1.25-1.2,1.0,cz, cx,Hh*0.45,cz],close:[cx+1.6,1.15,cz+L*0.5+1.0,cx+0.3,0.7,cz+L*0.3],far:[cx+L*4,6,cz+L*5,cx,Hh*0.4,cz]};
  if(typeof updateCarLOD==='function'){window.__lodForce=lod||'near'}
  views.forEach((vn,i)=>{const v=V[vn]||V.f34;const tw=Math.floor(W/cols),th=Math.floor(H/rows);const col=i%cols,row=Math.floor(i/cols);renderer.setViewport(col*tw,H-(row+1)*th,tw,th);renderer.setScissor(col*tw,H-(row+1)*th,tw,th);
    camera.fov=vn==='top'?32:36;camera.aspect=tw/th;camera.updateProjectionMatrix();camera.position.set(v[0],v[1],v[2]);camera.up.set(0,1,0);if(vn==='top')camera.up.set(1,0,0);camera.lookAt(v[3],v[4],v[5]);camera.updateMatrixWorld();
    if(typeof updateCarLOD==='function')updateCarLOD(true);if(typeof updateVehicles==='function')updateVehicles(0.016);if(typeof flushCars==='function')flushCars();
    if(i===0){sun.shadow.needsUpdate=true;sun2.shadow.needsUpdate=true}
    renderer.render(scene,camera)});
  const r=renderer.info.render;return {calls:r.calls,tris:r.triangles}};
</script></body></html>`;
(async()=>{const prefix=process.argv[2]||'v';const cfg=JSON.parse(process.argv[3]||'{}');const [W,H]=(process.argv[4]||'1280x720').split('x').map(Number);
  const scripts=(cfg.scripts||['js/70_vehicles.js']).map(s=>`<script src="/${s}"></script>`).join('\n');
  const slot=await acquireSlot();process.on('exit',()=>releaseSlot(slot));
  const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u==='/'){r.setHeader('content-type','text/html');r.end(PAGE.replace('__SCRIPTS__',scripts));return}
    const f=u.startsWith('/three/')?path.join(NPM,u.slice(7)):path.join(GAME,u);fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;r.end('nf');return}r.setHeader('content-type',/\.js$/.test(f)?'application/javascript':/\.json$/.test(f)?'application/json':'application/octet-stream');r.end(d)})});
  await new Promise(res=>srv.listen(0,res));const port=srv.address().port;
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  try{const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});const errors=[];
    page.on('pageerror',e=>errors.push('PAGEERR '+e.message+' @ '+((e.stack||'').split('\n')[1]||'').trim()));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||cfg.verbose)errors.push(m.type()+': '+m.text().slice(0,400))});
    await page.goto(`http://localhost:${port}/`);await page.waitForTimeout(500);if(!(await page.evaluate(()=>typeof window.studio==='function'))){console.log('PAGE BROKEN:\n'+errors.join('\n'));return}
    await page.evaluate(cfg=>window.studio(cfg),cfg);
    const t0=Date.now();for(;;){const st=await page.evaluate(()=>({r:window.__ready&&(typeof vehiclesReady!=='function'||vehiclesReady()),e:window.__err}));if(st.e){console.log('STUDIO ERROR',st.e);break}if(st.r)break;if(Date.now()-t0>60000){console.log('timeout');break}await page.waitForTimeout(300)}
    const views=cfg.views||['f34','side','r34','top'];const cols=(cfg.grid&&cfg.grid[0])||2,rows=(cfg.grid&&cfg.grid[1])||Math.ceil(views.length/cols);
    for(const t of cfg.types){const info=await page.evaluate(([t,views,cols,rows,lod,night])=>{try{return window.renderSheet(t,views,cols,rows,lod,night)}catch(e){return 'ERR '+(e.stack||e)}},[t,views,cols,rows,cfg.lod,cfg.night]);
      const f=prefix+'_'+t+'.png';await page.screenshot({path:f});console.log(t,'->',f,JSON.stringify(info))}
    if(cfg.eval){console.log('eval:',JSON.stringify(await page.evaluate(cfg.eval)))}
    console.log(errors.length?('ERRORS:\n'+[...new Set(errors)].slice(0,20).join('\n')):'no errors')}
  finally{await browser.close();srv.close();releaseSlot(slot)}})();
