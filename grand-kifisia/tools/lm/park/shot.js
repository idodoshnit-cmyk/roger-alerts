// lm-park screenshot runner: node shot.js prefix views.json [WxH]  (GK_DIR/GK_SHOTS env as in tools/shot.js). Clicks Play via DOM (robust under load).
const {launch,ROOT}=require('../../harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2];let views=process.argv[3];if(fs.existsSync(views))views=fs.readFileSync(views,'utf8');views=JSON.parse(views);const [W,H]=(process.argv[4]||'1000x600').split('x').map(Number);
const h=await launch({width:W,height:H});try{const s=await h.waitReady();console.log('ready',s.toFixed(0)+'s');
 await h.page.evaluate(()=>document.getElementById('play').click());await h.page.waitForTimeout(2500);
 await h.page.evaluate(()=>{for(const id of['menu','sheet','pause','title'])try{const e=document.getElementById(id);if(e)e.hidden=true}catch(e){}});
 const st=await h.page.evaluate(()=>{try{return JSON.stringify({lm:LM.built,park:window.PARKLM?PARKLM.stats:null})}catch(e){return 'x '+e.message}});console.log('state',st);
 for(const v of views){if(v.eval){console.log('eval',v.name,await h.page.evaluate(v.eval));continue}await h.view(v);const f=path.join(process.env.GK_SHOTS,prefix+'_'+v.name+'.png');await h.page.screenshot({path:f,timeout:240000});console.log(v.name,path.relative(ROOT,f),JSON.stringify(await h.info()))}
 console.log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors')}
catch(e){console.log('FAILED:',e.message);console.log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close()}})();
