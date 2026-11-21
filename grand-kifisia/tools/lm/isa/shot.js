// lm-isa screenshot script: node shot.js prefix views.json [WxH]  (env GK_DIR, GK_SHOTS)
const {launch}=require('../../harness.js');const fs=require('fs');
(async()=>{const prefix=process.argv[2]||'s';let views=process.argv[3];if(fs.existsSync(views))views=fs.readFileSync(views,'utf8');views=JSON.parse(views);
 const [W,H]=(process.argv[4]||'1000x560').split('x').map(Number);const h=await launch({width:W,height:H});
 try{const s=await h.waitReady();console.log('ready',s);
  await h.page.evaluate(()=>{const b=document.getElementById('play');b.click()});await h.page.waitForTimeout(2500);
  const pre=await h.page.evaluate(()=>{const o={};try{o.isalm=JSON.stringify({built:ISALM.built,GF:ISALM.GF,Yc:ISALM.Yc,gate:ISALM.gate,hoops:ISALM.hoops,court:ISALM.court})}catch(e){o.err=e.message}try{o.lm=LM.built}catch(e){}return o});console.log(JSON.stringify(pre));
  if(process.env.EVAL){console.log('EVAL',JSON.stringify(await h.page.evaluate(process.env.EVAL)))}
  for(const v of views){await h.shot(prefix+'_'+v.name,v);console.log(v.name,JSON.stringify(await h.info()))}
 }catch(e){console.log('FAILED',e.message)}
 console.log('ERRORS',h.errors.slice(0,30).join('\n'));console.log('LOGS',h.logs.filter(l=>/isa|lm-|landmark/i.test(l)).slice(0,20).join('\n'));await h.close()})();
