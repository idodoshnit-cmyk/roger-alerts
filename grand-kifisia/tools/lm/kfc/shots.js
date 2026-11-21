// node tools/lm/kfc/shots.js <prefix> <views.json> [WxH]  — like tools/shot.js but clicks #play via JS (robust under CPU contention)
// and prints LM.built + landmark warnings. Uses GK_DIR / GK_SHOTS like the harness.
const {launch}=require('../../harness');const fs=require('fs');
(async()=>{const [prefix,vf,wh]=process.argv.slice(2);const views=JSON.parse(fs.readFileSync(vf,'utf8'));const [W,H]=(wh||'1000x700').split('x').map(Number);
  const h=await launch({width:W,height:H,verbose:true});h.page.setDefaultTimeout(240000);
  try{const s=await h.waitReady();console.log('ready in',s.toFixed(0),'s');
    await h.page.evaluate(()=>document.getElementById('play').click());await h.page.waitForTimeout(2500);
    console.log('LM built:',JSON.stringify(await h.page.evaluate(()=>typeof LM!=='undefined'?LM.built:null)));
    const path=require('path');for(const v of views){await h.view(v);const f=path.join(process.env.GK_SHOTS,prefix+'_'+v.name+'.png');await h.page.screenshot({path:f,timeout:240000});console.log(v.name,'->',f,JSON.stringify(await h.info()))}
    if(process.env.GK_EVAL)console.log('EVAL:',JSON.stringify(await h.page.evaluate(process.env.GK_EVAL)));
  }catch(e){console.log('FAILED:',e.message)}
  console.log(h.errors.length?'ERRORS:\n'+[...new Set(h.errors)].slice(0,30).join('\n'):'no errors');
  for(const l of h.logs)if(/lm-kfc|landmark/.test(l))console.log(l);
  await h.close()})();
