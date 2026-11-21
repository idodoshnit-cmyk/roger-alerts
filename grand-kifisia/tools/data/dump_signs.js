// Grand Kifisia — dump every shop sign the running game actually built (team:data, placement audit).
// Usage: [GK_DIR=work/<id>/gk3] node tools/data/dump_signs.js out.json
// Output: {signs:[{name,x,z,nx,nz,w,b,src,id,special,number,street,kind}], unplaced:[…], landmarkPois:[…], stats}
const {launch}=require('../harness');const fs=require('fs');const out=process.argv[2]||'signs.json';
(async()=>{const h=await launch({width:480,height:270});let d;
  try{await h.play();
    d=await h.page.evaluate(()=>{const r=v=>Math.round(v*100)/100;
      const S=(typeof BLD!=='undefined'&&BLD.shops)||[];
      return{signs:S.map(s=>({name:s.name,x:r(s.x),z:r(s.z),nx:r(s.nx||0),nz:r(s.nz||0),w:r(s.w||0),b:s.b,src:s.src,id:s.id||'',special:s.special||null,number:s.number||'',kind:s.kind||'shop',cat:s.cat||''})),
        unplaced:((typeof BLD!=='undefined'&&BLD.unplaced)||[]).map(u=>({name:u.name,x:r(u.x||0),z:r(u.z||0),src:u.src,reason:u.reason})),
        landmarkPois:((typeof BLD!=='undefined'&&BLD.landmarkPois)||[]).map(p=>({name:p.name,id:p.id,b:p.b,x:p.fx,z:p.fz})),
        stats:(typeof BLD!=='undefined'&&BLD.stats)||{},mapMeta:MAP.meta||null}});
  }catch(e){console.log('FAILED:',e.message)}
  d=d||{};d.errors=[...new Set(h.errors)].slice(0,20);await h.close();fs.writeFileSync(out,JSON.stringify(d));
  console.log('signs',(d.signs||[]).length,'unplaced',(d.unplaced||[]).length,'landmarkPois',(d.landmarkPois||[]).length,'errors',d.errors.length);})();
