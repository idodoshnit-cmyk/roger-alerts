// Stand-alone character viewer for fast iteration on avatars and animation (loads only three.js + js/60_people.js, boots in ~3 s).
//   const V = await require('./viewer').open({ game: <dir with js/60_people.js and models/>, width, height });
//   await V.eval(fn, arg)  -> runs in the page;   await V.shot(file)   -> PNG screenshot;   await V.close()
// In the page:  VW.strip({av,play,speed,t0,dt,n,view,spacing,...})  lays out n copies of a person, each at a different time of the same
// motion, so that ONE screenshot is a frame strip.  VW.clear(), VW.cam(view, cx, cy, halfHeight), VW.person(spec) are also available.
'use strict';
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), NPM = path.join(ROOT, 'npm/package');
const MIME = { '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.html': 'text/html' };
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#888}canvas{display:block}</style></head><body><canvas id="c"></canvas>
<script src="/three.min.js"></script>
<script>
'use strict';
const TAU=Math.PI*2, clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, sstep=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
let _s=7; const rnd=()=>{_s=_s+0x6D2B79F5|0;let t=Math.imul(_s^_s>>>15,1|_s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const R=(a,b)=>a+rnd()*(b-a), pick=a=>a[Math.floor(rnd()*a.length)];
const hf=n=>{n=Math.imul(n^61^(n>>>16),9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return(n>>>0)/4294967296};
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,preserveDrawingBuffer:true});renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.82;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9fb4c8);
const hemi=new THREE.HemisphereLight(0xcfe3ff,0x6b6150,0.55);scene.add(hemi);scene.add(new THREE.AmbientLight(0xffffff,0.12));
const sun=new THREE.DirectionalLight(0xfff0d8,1.1);sun.position.set(-6,14,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-14;sc.right=14;sc.top=14;sc.bottom=-14;sc.far=60;sun.shadow.bias=-0.0012;sun.shadow.normalBias=0.03;scene.add(sun);scene.add(sun.target);
let camera=new THREE.OrthographicCamera(-4,4,2,-2,0.1,200);
const Q={real:99,sh:1024};const NPCS=[];
let GROUND=(x,z)=>0;function groundY(x,z){return GROUND(x,z)}const terr=groundY;
// checker ground: 1 m squares with a 25 cm sub-grid (to see feet slide)
const gc=document.createElement('canvas');gc.width=gc.height=256;{const g=gc.getContext('2d');for(let i=0;i<2;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#8f8a80':'#a39e93';g.fillRect(i*128,j*128,128,128)}g.strokeStyle='rgba(0,0,0,.18)';for(let k=0;k<8;k++){g.beginPath();g.moveTo(k*32,0);g.lineTo(k*32,256);g.moveTo(0,k*32);g.lineTo(256,k*32);g.stroke()}}
const gt=new THREE.CanvasTexture(gc);gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.repeat.set(40,40);gt.encoding=THREE.sRGBEncoding;
let groundMesh=new THREE.Mesh(new THREE.PlaneGeometry(80,80,80,80),new THREE.MeshLambertMaterial({map:gt}));groundMesh.rotation.x=-Math.PI/2;groundMesh.receiveShadow=true;scene.add(groundMesh);
</script>
<script src="/js/60_people.js"></script>
<script>
'use strict';
const VW={people:[],
  async init(){await loadReal();return{avatars:PPL.ids.length,clips:Object.keys(PPL.clips).length}},
  clear(){for(const p of VW.people)p.dispose();VW.people=[];for(const o of VW.extra||[])scene.remove(o);VW.extra=[]},
  setGround(fnSrc){GROUND=eval(fnSrc);const g=groundMesh.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,GROUND(x,-y))}p.needsUpdate=true;g.computeVertexNormals()},
  // view: 'side' (camera on +x looking -x: character facing +z walks to the LEFT of the image... we flip so that forward is to the right), 'front', 'q' (3/4), 'top'
  cam(view,cx,cy,cz,hh,persp){const a=innerWidth/innerHeight;if(persp){camera=new THREE.PerspectiveCamera(persp,a,0.1,200)}else{camera=new THREE.OrthographicCamera(-hh*a,hh*a,hh,-hh,0.1,200)}
    const d=persp?hh/Math.tan(persp*Math.PI/360):30;const dir={side:[-1,0.12,0],front:[0,0.12,1],back:[0,0,-1],q:[-0.7,0.25,0.7],q2:[0.7,0.25,0.7],top:[0,1,0.001],side2:[1,0,0]}[view]||view;const l=Math.hypot(dir[0],dir[1],dir[2]);
    camera.position.set(cx+dir[0]/l*d,cy+dir[1]/l*d,cz+dir[2]/l*d);camera.lookAt(cx,cy,cz);camera.updateProjectionMatrix();sun.target.position.set(cx,0,cz);sun.position.set(cx-6,14,cz+9)},
  person(spec,x,z,yaw){const p=new Person(spec,true);p.root.position.set(x||0,groundY(x||0,z||0),z||0);p.root.rotation.y=yaw||0;VW.people.push(p);return p},
  // advance one person by exact steps; moving characters travel along their facing at 'speed'
  advance(p,T,speed,air,step){step=step||1/60;let t=0;while(t<T-1e-9){const d=Math.min(step,T-t);if(speed){p.root.position.x+=Math.sin(p.root.rotation.y)*speed*d;p.root.position.z+=Math.cos(p.root.rotation.y)*speed*d;p.root.position.y=groundY(p.root.position.x,p.root.position.z)}p.update(d,speed||0,!!air);t+=d}},
  // o: {av, spec, play, opt, speed, t0, dt, n, view, spacing, yaw, hh, cy, carry, look:[x,y,z] (relative), ground}
  strip(o){VW.clear();const n=o.n||8,view=o.view||'side',sp=o.spacing||(view==='side'||view==='side2'?1.25:1.0),yaw=o.yaw||0;const out=[];
    for(let k=0;k<n;k++){const off=(k-(n-1)/2)*sp;const along=view==='side'||view==='side2';const x=along?0:off,z=along?(view==='side'?off:-off):0;
      const p=VW.person(Object.assign({av:o.av,seed:o.seed==null?1000:o.seed},o.spec||{}),x,z,yaw);if(o.carry)p.setCarry(o.carry);if(o.pre)VW.advance(p,o.pre,o.preSpeed||0,false);
      if(o.play)p.play(o.play,o.opt);const T=(o.t0||0)+k*(o.dt||0.1);const x0=p.root.position.x,z0=p.root.position.z;if(o.look)p.lookAt(x+o.look[0],o.look[1],z+o.look[2]);
      VW.advance(p,T,o.speed||0,o.air);if(o.stop){p.stop();VW.advance(p,o.stop+k*(o.dt2||0),0,false)}
      p.root.position.x=x;p.root.position.z=z;p.root.position.y=groundY(x,z);p.update(0,o.speed||0,o.air);out.push(T)}
    VW.cam(view,0,o.cy==null?0.95:o.cy,0,o.hh||1.15,o.persp);return out},
  // film: ONE person simulated continuously; n frames rendered side by side into the canvas (camera follows the person).
  // o: {av, spec, speed | speedFn:'t=>..', yawFn:'t=>..', t0, dt, n, view, hh, cy, play, playAt, stopAt, air:[t0,t1,vy0], carry, look:[x,y,z] absolute, ground}
  film(o){VW.clear();const n=o.n||8,W=innerWidth,H=innerHeight,w=Math.floor(W/n);const p=VW.person(Object.assign({av:o.av,seed:o.seed==null?1000:o.seed},o.spec||{}),o.x||0,o.z||0,o.yaw||0);if(o.carry)p.setCarry(o.carry);if(o.look)p.lookAt(o.look[0],o.look[1],o.look[2]);
    const sf=o.speedFn?eval(o.speedFn):(()=>o.speed||0),yf=o.yawFn?eval(o.yawFn):null;let t=0,played=false,stopped=false,vy=0,inAir=false;const log=[];
    const step=d=>{const sp=sf(t);if(yf)p.root.rotation.y=yf(t);p.root.position.x+=Math.sin(p.root.rotation.y)*sp*d;p.root.position.z+=Math.cos(p.root.rotation.y)*sp*d;const g=groundY(p.root.position.x,p.root.position.z);
      if(o.air&&t>=o.air[0]&&!inAir&&!o._jumped){inAir=true;o._jumped=true;vy=o.air[1]}if(inAir){vy-=19*d;p.root.position.y+=vy*d;if(p.root.position.y<=g){p.root.position.y=g;inAir=false}}else p.root.position.y=g;
      if(o.play&&!played&&t>=(o.playAt||0)){p.play(o.play,o.opt);played=true}if(o.stopAt!=null&&!stopped&&t>=o.stopAt){p.stop();stopped=true}p.update(d,sp,inAir);t+=d};
    const run=T=>{while(t<T-1e-9)step(Math.min(1/60,T-t))};
    renderer.setScissorTest(true);renderer.autoClear=true;
    for(let k=0;k<n;k++){run((o.t0||0)+k*(o.dt||0.1));const a=w/H,hh=o.hh||1.2;const r=p.root.position;const cyy=(o.follow===false?0:r.y)+(o.cy==null?0.95:o.cy);
      const save=[innerWidth,innerHeight];VW.cam2(o.view||'side',r.x,cyy,r.z,hh,a);p.root.updateMatrixWorld(true);renderer.setViewport(k*w,0,w,H);renderer.setScissor(k*w,0,w,H);renderer.render(scene,camera);log.push([+t.toFixed(3),+r.z.toFixed(3),+p.g.toFixed(3)])}
    renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);return log},
  cam2(view,cx,cy,cz,hh,a){camera=new THREE.OrthographicCamera(-hh*a,hh*a,hh,-hh,0.1,200);const dir={side:[-1,0.12,0],front:[0,0.12,1],back:[0,0.1,-1],q:[-0.7,0.25,0.7],q2:[0.7,0.25,0.7],top:[0,1,0.001],side2:[1,0.12,0]}[view]||view;const l=Math.hypot(dir[0],dir[1],dir[2]),d=30;
    camera.position.set(cx+dir[0]/l*d,cy+dir[1]/l*d,cz+dir[2]/l*d);camera.lookAt(cx,cy,cz);camera.updateProjectionMatrix();sun.target.position.set(cx,cy-0.95,cz);sun.position.set(cx-6,cy+13,cz+9);sun.target.updateMatrixWorld()},
  render(){for(const p of VW.people)p.root.updateMatrixWorld(true);renderer.render(scene,camera);return{calls:renderer.info.render.calls,tris:renderer.info.render.triangles}},
};
</script></body></html>`;
// machine-wide limit on simultaneous headless browsers: same lock protocol as tools/harness.js (.locks/slotN)
const LOCKS = path.join(ROOT, '.locks'), MAXB = 3;
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return false; } }
async function acquireSlot() { fs.mkdirSync(LOCKS, { recursive: true }); const t0 = Date.now();
  for (;;) { for (let i = 0; i < MAXB; i++) { const d = path.join(LOCKS, 'slot' + i); try { fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'pid'), String(process.pid)); return d; } catch (e) {
        try { const pid = +fs.readFileSync(path.join(d, 'pid'), 'utf8'); const age = Date.now() - fs.statSync(d).mtimeMs; if (!alive(pid) || age > 45 * 60 * 1000) fs.rmSync(d, { recursive: true, force: true }); } catch (e2) { try { if (Date.now() - fs.statSync(d).mtimeMs > 60000) fs.rmSync(d, { recursive: true, force: true }); } catch (e3) {} } } }
    if (Date.now() - t0 > 40 * 60 * 1000) throw new Error('no free browser slot after 40 minutes'); await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500)); } }
function releaseSlot(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} }
async function open(opt = {}) {
  const slot = await acquireSlot(); process.on('exit', () => releaseSlot(slot)); for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { releaseSlot(slot); process.exit(1); });
  const GAME = path.resolve(opt.game || path.join(ROOT, 'work/chars/gk3'));
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/') { r.setHeader('content-type', 'text/html'); r.end(PAGE); return; }
    const f = u === '/three.min.js' ? path.join(NPM, 'build/three.min.js') : path.join(GAME, u);
    fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end('nf'); return; } r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(d); }); });
  await new Promise(res => srv.listen(0, res));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: opt.width || 1600, height: opt.height || 420 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push('PAGEERR ' + e.message + ' @ ' + ((e.stack || '').split('\n')[1] || '').trim()));
  page.on('console', m => { const t = m.text(); if (/GPU stall|willReadFrequently/.test(t)) return; if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + t.slice(0, 300)); else if (opt.verbose) console.log('[page]', t); });
  page.on('response', rs => { if (rs.status() >= 400) errors.push('HTTP ' + rs.status() + ' ' + rs.url()); });
  await page.goto(`http://localhost:${srv.address().port}/`);
  const info = await page.evaluate(() => VW.init());
  const V = { page, errors, info,
    eval: (fn, arg) => page.evaluate(fn, arg),
    // people are invisible (alpha-tested) until their texture atlas has arrived: wait for every texture in use, then two more frames
    async texReady() { await page.evaluate(() => VW.render()); await page.waitForFunction(() => { for (const id in PPL.av) { const a = PPL.av[id]; for (const t of [a.tex, a.texHi, a.texLo]) if (t && t.isTexture && !(t.image && (t.image.complete !== false) && (t.image.width > 0))) return false; if (a.texPending) return false; } return true; }, null, { timeout: 30000 }); await page.waitForTimeout(120); },
    async shot(file, wait) { await V.texReady(); const st = await page.evaluate(() => VW.render()); await page.screenshot({ path: file }); return st; },
    async strip(file, o) { const ts = await page.evaluate(o => VW.strip(o), o); const st = await V.shot(file, o.wait); return { ts, st }; },
    async film(file, o) { if (o.ground) await page.evaluate(g => VW.setGround(g), o.ground); await page.evaluate(o => { VW.clear(); VW.person(Object.assign({ av: o.av }, o.spec || {}), 0, 0, 0); VW.cam('side', 0, 1, 0, 1.2); VW.render(); }, o); await V.texReady(); const log = await page.evaluate(o => VW.film(o), o); await page.screenshot({ path: file }); return log; },
    async close() { try { await browser.close(); } finally { srv.close(); releaseSlot(slot); } } };
  return V;
}
module.exports = { open, ROOT };
// CLI:  node viewer.js out.png '{"av":"m16","speed":1.3,"dt":0.12,"n":8,"view":"side"}' [WxH]
if (require.main === module) (async () => {
  const [W, H] = (process.argv[4] || '1600x420').split('x').map(Number); const V = await open({ width: W, height: H });
  try { let o = JSON.parse(process.argv[3] || '{"av":"m16"}'); if (!Array.isArray(o)) o = [o]; let i = 0;
    for (const s of o) { const f = process.argv[2].replace(/\.png$/, '') + (o.length > 1 ? '_' + (s.name || i) : '') + '.png'; if (s.film) { const lg = await V.film(f, s); console.log(path.basename(f), 't,z,phase: ' + lg.map(e => e.join('/')).join(' ')); } else { const r = await V.strip(f, s); console.log(path.basename(f), JSON.stringify(r.st), 't=' + r.ts.map(t => t.toFixed(2)).join(',')); } i++; }
    if (V.errors.length) console.log('ERRORS:\n' + [...new Set(V.errors)].slice(0, 20).join('\n')); } catch (e) { console.log('FAILED', e.message, '\n', V.errors.join('\n')); } finally { await V.close(); }
})();
