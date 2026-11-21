// team:data: one browser session = runtime sign dump (like dump_signs.js) + street views.  Usage: GK_DIR=… GK_SHOTS=… node tools/data/dump_and_shoot.js out.json prefix 'views-json'
const {launch}=require('../harness');const fs=require('fs');const [out,prefix,vj]=process.argv.slice(2);const views=JSON.parse(vj||'[]');
(async()=>{const h=await launch({width:900,height:420});const d={};
  try{await h.play();
    Object.assign(d,await h.page.evaluate(()=>{const r=v=>Math.round(v*100)/100;const S=(typeof BLD!=='undefined'&&BLD.shops)||[];
      return{signs:S.map(s=>({name:s.name,x:r(s.x),z:r(s.z),nx:r(s.nx||0),nz:r(s.nz||0),w:r(s.w||0),b:s.b,src:s.src,id:s.id||'',special:s.special||null,number:s.number||'',kind:s.kind||'shop',cat:s.cat||''})),
        unplaced:((typeof BLD!=='undefined'&&BLD.unplaced)||[]).map(u=>({name:u.name,src:u.src,reason:u.reason})),landmarkPois:((typeof BLD!=='undefined'&&BLD.landmarkPois)||[]).map(p=>({name:p.name,id:p.id,b:p.b})),
        stats:(typeof BLD!=='undefined'&&BLD.stats)||{},meta:MAP.meta?{generated:MAP.meta.generated,counts:MAP.meta.counts}:null}}));
    console.log('signs',d.signs.length,'unplaced',d.unplaced.length,'landmarkPois',d.landmarkPois.length);
    for(const v of views){const f=await h.shot(prefix+'_'+v.name,v);const i=await h.info();console.log('shot',f,JSON.stringify(i))}
  }catch(e){console.log('FAILED:',e.message)}
  d.errors=[...new Set(h.errors)].slice(0,20);await h.close();fs.writeFileSync(out,JSON.stringify(d));console.log('errors',d.errors.length,d.errors.slice(0,5).join(' | '))})();
