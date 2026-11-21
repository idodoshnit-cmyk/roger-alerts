// Grand Kifisia — placement verification (team:data).
// Boots the game, then compares the runtime registry PLACED ([kind,x,z,name,src], see js/00_core.js placed()) with the features in MAP (kifisia_map.json).
// Usage: [GK_DIR=work/<id>/gk3] node tools/verify_placement.js [--all] [--json out.json] [--missing N]
//   --all      count features in the whole map (default: only features inside MAP.focus, the detailed play area)
//   --missing  how many missing features to list per kind (default 6)
// A feature counts as placed when a PLACED entry of a matching kind lies within 1.5 m of it, or when a PLACED entry's src equals the feature id
// (POI id like "osm:n123" / "ov:…" / "cs:…", or the OSM id at the end of a props row like "n4721277017").  See docs/MAP_DATA.md "Verification".
const {launch}=require('./harness');const fs=require('fs');
const argv=process.argv.slice(2);const ALL=argv.includes('--all');const jOut=argv.includes('--json')?argv[argv.indexOf('--json')+1]:null;
const NMISS=argv.includes('--missing')?+argv[argv.indexOf('--missing')+1]:6;const TOL=1.5;
// map kind -> PLACED kinds that satisfy it (world modules may use any of these names)
const ALIAS={shop:['shop','shopfront','sign','poi'],plate:['plate','sign','poi','shop'],poi_building:['poi_building','building_sign','sign','poi','shop'],poi_standalone:['poi_standalone','poi','kiosk','fuel','taxi','toilets','station'],
  poi_area:['poi_area','poi','area','park','playground','parking'],special:['special','shop','shopfront'],building:['building'],
  tree:['tree','street_tree','real_tree'],street_tree:['tree','street_tree'],garden_tree:['tree','garden_tree'],lamp:['lamp','street_lamp'],bollard:['bollard'],car:['car','parked','parked_car'],
  bench:['bench','seat'],basket:['basket','bin','waste_basket'],recycle:['recycle','recycling','bin'],crossing:['crossing','zebra'],signal:['signal','traffic_signal','traffic_light'],
  stop:['stop','stop_sign'],giveway:['giveway','give_way'],bus:['bus','bus_stop'],kiosk:['kiosk'],fountain:['fountain'],water:['water','drinking_water','fountain'],atm:['atm'],
  post_box:['post_box','postbox'],telephone:['telephone','phone'],vending:['vending','vending_machine'],artwork:['artwork','statue'],memorial:['memorial','plaque'],info:['info','board'],
  bike_parking:['bike_parking','bicycle_parking'],moto_parking:['moto_parking'],gate:['gate','barrier'],entrance:['entrance','door'],parking_entrance:['parking_entrance'],
  charging:['charging','charging_station'],clock:['clock'],toilets:['toilets'],taxi:['taxi','taxi_stand'],flagpole:['flagpole'],manhole:['manhole'],elevator:['elevator','lift'],
  subway_entrance:['subway_entrance','station_entrance'],play:['play','playground'],speed_sign:['speed_sign','sign'],bike_rental:['bike_rental'],seat:['seat','bench'],addr:['addr','house_number','number_plate']};
(async()=>{const h=await launch({width:640,height:360});let out;
  try{await h.play();
    out=await h.page.evaluate((ALL)=>{const M=window.__gk?window.__gk.MAP():MAP;const inF=(x,z)=>ALL||(typeof inFocus==='function'?inFocus(x,z):true);const F=[];
      const add=(kind,x,z,name,id)=>{if(inF(x,z))F.push([kind,x,z,name||'',id||''])};
      for(const q of M.pois||[]){const k=q.bay==='shop'?'shop':(q.bay==='plate'||q.bay==='directory')?'plate':q.bay==='building'?'poi_building':q.bay==='standalone'?'poi_standalone':q.bay==='area'?'poi_area':'poi_unplaced';
        if(!(ALL||q.focus))continue;const x=q.fx!=null?q.fx:q.x,z=q.fz!=null?q.fz:q.z;F.push([k,x,z,q.name||q.cat,q.id])}
      for(const k in M.special||{}){const s=M.special[k];add('special',s.x,s.z,k,'special:'+k)}
      for(const k in M.props||{})for(const it of M.props[k]){const id=typeof it[it.length-1]==='string'&&/^[nwr]\d+$/.test(it[it.length-1])?it[it.length-1]:'';const nm=typeof it[2]==='string'?it[2]:'';add(k,it[0]/10,it[1]/10,nm,id)}
      for(const it of M.street_trees||[])add('street_tree',it[0]/10,it[1]/10,it[2]);for(const it of M.lamps||[])add('lamp',it[0]/10,it[1]/10);for(const it of M.bollards||[])add('bollard',it[0]/10,it[1]/10);
      for(const it of M.parked||[])add('car',it[0]/10,it[1]/10);for(const it of M.seats||[])add('seat',it[0]/10,it[1]/10,it[4]);
      for(const it of M.addr||[])add('addr',it[0]/10,it[1]/10,it[2],it[5]);
      (M.buildings||[]).forEach((b,i)=>{if(b[6])add('building',b[6][0],b[6][1],b[9],(b[11]&&b[11].id)||('b'+i))});
      const P=(typeof PLACED!=='undefined'?PLACED:[]).map(p=>p.slice());return{F,P}},ALL);
  }catch(e){console.log('FAILED:',e.message);console.log([...new Set(h.errors)].slice(0,20).join('\n'));await h.close();process.exit(2)}
  await h.close();
  const {F,P}=out;const cell=new Map();const key=(x,z)=>Math.floor(x/4)+','+Math.floor(z/4);
  P.forEach((p,i)=>{const k=key(p[1],p[2]);if(!cell.has(k))cell.set(k,[]);cell.get(k).push(i)});const bySrc=new Map();P.forEach((p,i)=>{if(p[4]){if(!bySrc.has(p[4]))bySrc.set(p[4],[]);bySrc.get(p[4]).push(i)}});
  const used=new Uint8Array(P.length);const rows={};
  for(const f of F){const [kind,x,z,name,id]=f;const ok=ALIAS[kind]||[kind];let hit=-1;
    if(id&&bySrc.has(id))hit=bySrc.get(id)[0];
    if(hit<0){let bd=TOL;const cx=Math.floor(x/4),cz=Math.floor(z/4);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const pi of cell.get((cx+i)+','+(cz+j))||[]){const p=P[pi];if(!ok.includes(p[0]))continue;const d=Math.hypot(p[1]-x,p[2]-z);if(d<=bd){bd=d;hit=pi}}}
    const r=rows[kind]||(rows[kind]={kind,n:0,ok:0,missing:[]});r.n++;if(hit>=0){r.ok++;used[hit]=1}else r.missing.push([+x.toFixed(1),+z.toFixed(1),name,id])}
  const extra={};P.forEach((p,i)=>{if(!used[i])extra[p[0]]=(extra[p[0]]||0)+1});
  const list=Object.values(rows).sort((a,b)=>b.n-a.n);let tn=0,tok=0;
  console.log(`\nPlacement verification (${ALL?'whole map':'focus area'}; tolerance ${TOL} m; PLACED entries: ${P.length})`);
  console.log('kind                 map   placed      %');console.log('-------------------- ----- ------ ------');
  for(const r of list){tn+=r.n;tok+=r.ok;console.log(`${r.kind.padEnd(20)} ${String(r.n).padStart(5)} ${String(r.ok).padStart(6)} ${(100*r.ok/Math.max(1,r.n)).toFixed(1).padStart(5)}%`)}
  console.log('-------------------- ----- ------ ------');console.log(`${'TOTAL'.padEnd(20)} ${String(tn).padStart(5)} ${String(tok).padStart(6)} ${(100*tok/Math.max(1,tn)).toFixed(1).padStart(5)}%`);
  console.log('\nmissing (first '+NMISS+' per kind):');for(const r of list)if(r.missing.length)console.log(' ',r.kind.padEnd(16),r.missing.slice(0,NMISS).map(m=>`${m[2]||'?'}@${m[0]},${m[1]}`).join(' | '));
  console.log('\nPLACED entries not matching any map feature, by kind:',JSON.stringify(extra));
  console.log(h.errors.length?('page errors:\n'+[...new Set(h.errors)].slice(0,10).join('\n')):'page errors: none');
  if(jOut)fs.writeFileSync(jOut,JSON.stringify({generated:new Date().toISOString(),scope:ALL?'all':'focus',tolerance:TOL,placed:P.length,rows:list,unmatchedPlaced:extra},null,0));
})();
