// CLI: node tools/shot.js [prefix] [viewsJsonFile|inline JSON] [WxH]
// Loads the game, presses play, then for each view takes shots/<prefix>_<name>.png and prints render stats + any errors.
// Named places usable instead of coordinates: add "at":"mythos|paul|starbucks|kfc|super|platanos|station|isa|junction" with optional dist/side/h.
const {launch,ROOT}=require('./harness');const fs=require('fs'),path=require('path');
(async()=>{const prefix=process.argv[2]||'s';let views=process.argv[3]||'[{"name":"start"}]';if(fs.existsSync(views))views=fs.readFileSync(views,'utf8');views=JSON.parse(views);const [W,H]=(process.argv[4]||'900x420').split('x').map(Number);
  const h=await launch({width:W,height:H});try{const secs=await h.play();console.log('loaded in',secs.toFixed(1)+'s');for(const l of h.logs.filter(l=>l.startsWith('[load]')))console.log(' ',l);
    const places=await h.page.evaluate(()=>{const g=window.__gk,M=g.MAP(),S=g.SPECIAL(),o={};for(const k in S)o[k]={x:S[k].door[0],z:S[k].door[1],nx:S[k].nx,nz:S[k].nz,fx:S[k].x,fz:S[k].z};for(const k in M.key)if(!o[k])o[k]={x:M.key[k][0],z:M.key[k][1]};o.isa={x:M.isa.gate[0],z:M.isa.gate[1]};o.spawn={x:g.player.x,z:g.player.z};return o});
    for(const v of views){if(v.at){const p=places[v.at];if(!p){console.log('unknown place',v.at);continue}const d=v.dist||12,s=v.side||0,hh=v.h||1.7;if(p.nx!==undefined)v.cam=[p.x+p.nx*d-p.nz*s,hh,p.z+p.nz*d+p.nx*s,p.fx,v.th||2.6,p.fz];else{const a=v.ang||0.6;v.cam=[p.x+Math.cos(a)*d,hh,p.z+Math.sin(a)*d,p.x,v.th||2,p.z]}}
      const f=await h.shot(prefix+'_'+v.name,v);console.log(v.name,'->',path.relative(ROOT,f),JSON.stringify(await h.info()))}
    console.log(h.errors.length?('ERRORS:\n'+[...new Set(h.errors)].slice(0,25).join('\n')):'no errors');console.log('places:',JSON.stringify(places))}
  catch(e){console.log('FAILED:',e.message);console.log([...new Set(h.errors)].slice(0,25).join('\n'))}finally{await h.close()}})();
