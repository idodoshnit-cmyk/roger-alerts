// 89_landmarks.js — registry for hand-modelled landmark buildings (one file per landmark: js/89<letter>_lm_<id>.js, loaded after this file).
// LM.register({id, at:[[x,z],...], build(ctx){...}})
//   Every MAP building whose footprint contains one of the `at` points is NOT built by 30_buildings.js;
//   build({footprints:[{b,ps}]}) must model it completely (geometry, materials, collision via addSeg, signs).
//   A landmark file may also override any global builder function (e.g. buildISA) — it loads after all other modules.
const LM={list:[],built:[],register(o){this.list.push(o)}};
(function(){
  const dec=c=>typeof unp==='function'?unp(c):(()=>{const o=[];for(let i=0;i+1<c.length;i+=2)o.push([c[i]/10,c[i+1]/10]);return o})();
  const _bb=buildBuildings;
  buildBuildings=function(){
    const all=MAP.buildings,keep=[],fp={};
    for(const b of all){let ps;try{ps=dec(b[10])}catch(e){keep.push(b);continue}let hit=null;
      for(const L of LM.list)for(const p of (L.at||[]))if(ps.length>2&&pip(ps,p[0],p[1]))hit=L;
      if(hit)(fp[hit.id]=fp[hit.id]||[]).push({b,ps});else keep.push(b)}
    MAP.buildings=keep;try{_bb()}finally{MAP.buildings=all}
    for(const L of LM.list){try{L.build({footprints:fp[L.id]||[]});LM.built.push(L.id)}catch(e){console.error('landmark '+L.id+' failed',e)}}
  };
})();
