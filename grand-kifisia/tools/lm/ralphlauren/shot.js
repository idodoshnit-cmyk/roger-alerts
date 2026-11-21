// lm-ralphlauren screenshot runner: node shot.js prefix views.json [WxH]  (GK_DIR/GK_SHOTS as tools/shot.js). Clicks #play via JS if the normal click times out.
const {launch}=require('../../harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2]||'s';const views=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));const [W,H]=(process.argv[4]||'900x420').split('x').map(Number);
  const h=await launch({width:W,height:H});try{const s=await h.waitReady();console.log('ready in',s.toFixed(1)+'s');
    try{await h.page.click('#play',{timeout:20000})}catch(e){console.log('click timeout -> JS click; overlay:',await h.page.evaluate(()=>{const b=document.getElementById('play').getBoundingClientRect();const el=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return el?(el.id||el.className||el.tagName):'none'}));await h.page.evaluate(()=>document.getElementById('play').click())}
    await h.page.waitForTimeout(1500);
    const st=await h.page.evaluate(()=>({lm:typeof LM!=='undefined'?LM.built:null,rl:typeof RL_VILLA!=='undefined'?RL_VILLA.Y0:null}));console.log('LM',JSON.stringify(st));
    const SH=process.env.GK_SHOTS;for(const v of views){await h.view(v);const f=path.join(SH,prefix+'_'+v.name+(v.jpg?'.jpg':'.png'));let ok=false;for(let k=0;k<3&&!ok;k++){try{await h.page.screenshot({path:f,timeout:240000});ok=true}catch(e){console.log('shot retry',v.name,e.message.split('\n')[0])}}console.log(v.name,'->',f,JSON.stringify(await h.info()))}
    if(process.env.EVAL){console.log('EVAL',JSON.stringify(await h.page.evaluate(process.env.EVAL)))}
    console.log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors')}
  catch(e){console.log('FAILED:',e.message);console.log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close()}})();
