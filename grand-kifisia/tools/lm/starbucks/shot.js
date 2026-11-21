// node tools/lm/starbucks/shot.js prefix views.json [WxH] — like tools/shot.js but robust play click + Starbucks stats
const {launch,ROOT}=require('../../harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2]||'s';let views=process.argv[3];if(fs.existsSync(views))views=fs.readFileSync(views,'utf8');views=JSON.parse(views);const [W,H]=(process.argv[4]||'1100x620').split('x').map(Number);
const h=await launch({width:W,height:H});try{const s=await h.waitReady();console.log('ready',s);
 const st=await h.page.evaluate(()=>{const p=document.getElementById('play');const r=p.getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {rect:[r.x,r.y,r.width,r.height],top:e&&(e.id||e.className||e.tagName)}});console.log('play',JSON.stringify(st));
 await h.page.evaluate(()=>document.getElementById('play').click());await h.page.waitForTimeout(2000);
 console.log('SB',JSON.stringify(await h.page.evaluate(()=>{const s=window.LM_STARBUCKS;return s?{built:s.built,ms:s.ms,edges:s.edges,door:s.door,seats:s.seats,court:s.court&&{tris:s.court.tris,y:s.court.y},roof:s.roof,F:s.F&&{dW:s.F.dW,dB:s.F.dB,dM:s.F.dM,sS:s.F.sS,sN:s.F.sN,yF:s.F.yF}}:null})));
 console.log('LM',JSON.stringify(await h.page.evaluate(()=>typeof LM!=='undefined'?LM.built:null)));
 const SH=process.env.GK_SHOTS||path.join(ROOT,'shots');for(const v of views){await h.view(v);const f=path.join(SH,prefix+'_'+v.name+'.png');await h.page.screenshot({path:f,timeout:300000});console.log(v.name,path.relative(ROOT,f),JSON.stringify(await h.info()))}
 if(process.env.EVAL)console.log('EVAL',JSON.stringify(await h.page.evaluate(process.env.EVAL)));
 console.log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors')}
catch(e){console.log('FAILED:',e.message);console.log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close()}})();
