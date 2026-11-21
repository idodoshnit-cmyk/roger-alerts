// team:cars physics test: drives the player car with driveCar() in fixed 1/30 s steps inside the page (independent of the headless frame rate),
// logs the trajectory, and takes phone-sized screenshots between segments.  node tools/cars/ptest.js <prefix> [WxH]
const {launch,ROOT}=require('../harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2]||'pt';const [W,H]=(process.argv[3]||'390x844').split('x').map(Number);const SH=process.env.GK_SHOTS||ROOT;
  const h=await launch({width:W,height:H});const out=[];const log=s=>{console.log(s);out.push(s)};
  const shot=async n=>{await h.page.waitForTimeout(1800);await h.page.screenshot({path:path.join(SH,prefix+'_'+n+'.png')});log('shot '+n+' '+JSON.stringify(await h.info()))};
  try{log('ready in '+(await h.waitReady()).toFixed(1)+'s');await h.page.evaluate(()=>document.getElementById('play').click());await h.page.waitForTimeout(2500);
    // sim(segments): each {secs, jx, jy, touch, hand}; returns samples every 0.5 s
    await h.page.evaluate(()=>{window.__sim=(segs)=>{const c=player.car;if(!c)return 'nocar';const res=[];let t=0;for(const sg of segs){const n=Math.round(sg.secs*30);for(let i=0;i<n;i++){JOY.id=sg.touch?7:null;input.brake=!!sg.hand;input.gas=false;input.rev=false;
        driveCar(1/30,sg.jx||0,sg.jy||0);t+=1/30;if(i%15===14)res.push([+t.toFixed(1),+c.x.toFixed(2),+c.z.toFixed(2),+c.yaw.toFixed(2),+(c.vf*3.6).toFixed(1),+c.vr.toFixed(2),+c.steer.toFixed(2),c.gear,Math.round(c.hp),DRV.unstuckN])}}
      JOY.id=null;input.brake=false;return res};
      window.__enter=(pred)=>{__gk.setFree(null);if(player.car)exitCar(true);let best=null,bd=1e9;for(const c of CARS){if(c.hidden||!pred(c))continue;const d=Math.hypot(c.x-player.x,c.z-player.z);if(d<bd){bd=d;best=c}}
        const c=best,S=CARTYPES[c.type],lx=Math.cos(c.yaw),lz=-Math.sin(c.yaw);player.x=c.x+lx*(S.W/2+2.4);player.z=c.z+lz*(S.W/2+2.4);const near=nearestCar()===c;carBtn();return [c.type,Math.round(c.x),Math.round(c.z),+c.yaw.toFixed(2),near,!!player.car]}});
    const run=async(name,segs)=>{const r=await h.page.evaluate(s=>__sim(s),segs);log(name+' [t,x,z,yaw,kmh,vr,steer,gear,hp,unstuck]: '+JSON.stringify(r))};
    log('enter: '+JSON.stringify(await h.page.evaluate(()=>__enter(c=>c.mode==='parked'&&!c.exotic&&CARTYPES[c.type].cls!=='moto'&&CARTYPES[c.type].L<6))));
    await shot('a0_entered');
    await run('A straight (auto-throttle)',[{secs:5,touch:1}]);await shot('a1_straight');
    await run('B right turn',[{secs:1.6,touch:1,jx:1},{secs:1.5,touch:1}]);await shot('a2_turn');
    await run('C lift finger (coast)',[{secs:4}]);
    await run('D hold brake (stop + reverse)',[{secs:3,jy:1}]);
    await run('E hold steer into kerb/wall',[{secs:7,touch:1,jx:-1}]);await shot('a3_wall');
    await run('F handbrake turn',[{secs:4,touch:1},{secs:1.5,touch:1,jx:1,hand:1},{secs:1.5,touch:1}]);await shot('a4_after_hb');
    log('enter ferrari: '+JSON.stringify(await h.page.evaluate(()=>__enter(c=>c.type==='ferrari'))));await shot('b0_ferrari');
    await run('G ferrari launch',[{secs:4,touch:1},{secs:2,touch:1,jx:0.4}]);await shot('b1_ferrari_run');
    await h.page.evaluate(()=>__gk.setTod(21.5));await shot('b2_ferrari_night');
    log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors')}
  catch(e){log('FAILED: '+e.message);log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close();fs.writeFileSync(path.join(SH,prefix+'.log'),out.join('\n'))}})();
