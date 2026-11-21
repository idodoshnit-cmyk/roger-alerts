// usage: ROOT=.. GK_DIR=.. GK_SHOTS=.. node run.js prefix views.json [WxH]
const {launch}=require(process.env.ROOT+'/tools/harness.js');const fs=require('fs');
(async()=>{const prefix=process.argv[2]||'j';const views=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));const [W,H]=(process.argv[4]||'900x420').split('x').map(Number);
 const h=await launch({width:W,height:H});try{const s=await h.waitReady();await h.page.evaluate(()=>document.getElementById('play').click());await h.page.waitForTimeout(8000);console.log('loaded',s);
  const info=await h.page.evaluate(()=>{const g=window.__gk;const M=g.MAP();return {JN:window.JN&&{built:JN.built,warn:JN.warn,tris:JN.tris,ms:JN.ms,parts:JN.parts},LM:typeof LM!=='undefined'&&LM.built,player:[player.x,player.z,player.yaw],junction:M.key&&M.key.junction}});
  console.log(JSON.stringify(info));
  for(const v of views){const f=await h.shot(prefix+'_'+v.name,v);console.log(v.name,JSON.stringify(await h.info()))}
  console.log('errors',[...new Set(h.errors)].slice(0,20).join('\n'));}catch(e){console.log('ERR',e.message.slice(0,3000))}finally{await h.close()}})();
