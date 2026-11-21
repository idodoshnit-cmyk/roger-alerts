const {launch}=require(process.env.ROOT+'/tools/harness.js');
(async()=>{const h=await launch({width:900,height:500});try{const s=await h.waitReady();console.log('ready',s);
 const info=await h.page.evaluate(()=>{const b=document.getElementById('play');const r=b.getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return {rect:[r.x,r.y,r.width,r.height],hidden:b.hidden,disp:getComputedStyle(b).display,vis:getComputedStyle(b).visibility,top:e&&(e.id||e.className||e.tagName),txt:document.getElementById('loadTxt').textContent,JN:window.JN&&{built:JN.built,warn:JN.warn,tris:JN.tris,ms:JN.ms,signs:JN.signs}}});
 console.log(JSON.stringify(info,null,1));console.log('errors',h.errors.slice(0,10));}catch(e){console.log('ERR',e.message.slice(0,2000))}finally{await h.close()}})();
