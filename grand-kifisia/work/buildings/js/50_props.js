'use strict';
/* Grand Kifisia — street furniture, lamps, traffic lights, bus stops, kiosks, street signs */
/* ---------- street furniture (instanced, global) ---------- */
function instanced(geo,mat,list,cast){if(!list.length)return null;const im=new THREE.InstancedMesh(geo,mat,list.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3(1,1,1),Y=new THREE.Vector3(0,1,0);
  list.forEach((p,i)=>{q.setFromAxisAngle(Y,p[3]||0);pv.set(p[0],p[1],p[2]);sv.setScalar(p[4]||1);m.compose(pv,q,sv);im.setMatrixAt(i,m)});im.castShadow=!!cast;im.receiveShadow=false;im.frustumCulled=false;scene.add(im);return im}
function propGeo(kind){const g=new GB();const metal=hexc('#1f3a2e'),black=hexc('#1d1f22');
  if(kind==='lamp0'){g.cyl(0,0,0,0.2,0.13,0.6,8,metal,RECT[T.metal],false);g.cyl(0,0.6,0,0.07,0.06,3.2,8,metal,RECT[T.metal],false);g.box(0,4.0,0,0.42,0.6,0.42,0,hexc('#fff3c8'),RECT[T.white],1);g.cyl(0,4.3,0,0.32,0.05,0.35,4,metal,RECT[T.metal],true);g.cyl(0,3.65,0,0.12,0.24,0.06,8,metal,RECT[T.metal],false)}
  if(kind==='lamp1'){g.cyl(0,0,0,0.16,0.1,0.5,8,metal,RECT[T.metal],false);g.cyl(0,0.5,0,0.06,0.05,3.0,8,metal,RECT[T.metal],false);const ico=new THREE.IcosahedronGeometry(0.28,1),p=ico.attributes.position;for(let i=0;i<p.count;i+=3){const P=[0,1,2].map(k=>[p.getX(i+k),p.getY(i+k)+3.75,p.getZ(i+k)]);g.tri(P[0],P[1],P[2],[0,0],[1,0],[0,1],hexc('#fff8e6'),RECT[T.white],1)}}
  if(kind==='lamp2'){g.cyl(0,0,0,0.13,0.08,7.6,8,hexc('#8d9297'),RECT[T.metalL],false);g.box(0.9,7.55,0,1.9,0.1,0.12,0,hexc('#8d9297'),RECT[T.metalL]);g.box(1.75,7.42,0,0.7,0.16,0.32,0,hexc('#fff3d0'),RECT[T.white],1)}
  if(kind==='bollard'){g.cyl(0,0,0,0.09,0.08,0.62,6,black,RECT[T.metal],false);g.cyl(0,0.62,0,0.083,0.083,0.08,6,hexc('#e0b22a'),RECT[T.white],false);g.cyl(0,0.7,0,0.08,0.03,0.08,6,black,RECT[T.metal],true)}
  if(kind==='bench'){for(let k=0;k<3;k++)g.box(0,0.45,-0.15+k*0.15,1.8,0.05,0.11,0,hexc('#8a603c'),RECT[T.wood]);g.box(0,0.75,-0.27,1.8,0.32,0.05,0,hexc('#8a603c'),RECT[T.wood]);for(const sx of[-0.8,0.8]){g.box(sx,0.22,0,0.06,0.45,0.42,0,black,RECT[T.metal]);g.box(sx,0.6,-0.27,0.06,0.5,0.06,0,black,RECT[T.metal])}}
  if(kind==='basket'){g.cyl(0,0,0,0.22,0.24,0.8,8,hexc('#3b4a3f'),RECT[T.metal],true)}
  if(kind==='bin'){g.box(0,0.62,0,1.3,1.1,1.0,0,hexc('#4f5a52'),RECT[T.metalL]);g.box(0,1.2,0,1.36,0.08,1.06,0,hexc('#2f3732'),RECT[T.metal])}
  if(kind==='recycle'){g.box(0,0.62,0,1.3,1.1,1.0,0,hexc('#1f5fa8'),RECT[T.metalL]);g.box(0,1.2,0,1.36,0.08,1.06,0,hexc('#144a86'),RECT[T.metal])}
  if(kind==='solar'){g.box(0,0.5,-0.5,1.0,0.06,2.0,0,C1,RECT[T.solar]);g.cyl(0,1.0,0.6,0.25,0.25,1.6,8,hexc('#d9d9d6'),RECT[T.metalL],true);g.box(0,0.25,0,0.9,0.5,0.06,0,hexc('#9a9a96'),RECT[T.metalL])}
  if(kind==='ac'){g.box(0,0.35,0,0.9,0.6,0.35,0,hexc('#e6e6e3'),RECT[T.plain])}
  if(kind==='signal'){g.cyl(0,0,0,0.08,0.07,3.2,8,hexc('#5b6066'),RECT[T.metalL],false);g.box(0,3.25,0,0.32,0.95,0.28,0,black,RECT[T.metal])}
  if(kind==='stopsign'){g.cyl(0,0,0,0.04,0.04,2.3,6,hexc('#8d9297'),RECT[T.metalL],false)}
  if(kind==='scooter'){g.box(0,0.45,0,0.35,0.5,1.5,0,hexc('#d9d9d6'),RECT[T.white]);g.box(0,0.85,0.45,0.08,0.7,0.08,0,black,RECT[T.metal]);g.box(0,1.15,0.45,0.6,0.05,0.05,0,black,RECT[T.metal]);g.cyl(0,0,0.6,0.22,0.22,0.08,8,black,RECT[T.metal],true)}
  return g.build()}
const LENS=[];let lensMesh=null,poolMesh=null;
function buildLightPools(list){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,190,110,0.9)');gr.addColorStop(0.45,'rgba(255,160,80,0.35)');gr.addColorStop(1,'rgba(255,140,60,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
  const tex=new THREE.CanvasTexture(c);const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0});const geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);
  poolMesh=new THREE.InstancedMesh(geo,mat,list.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3();list.forEach((p,i)=>{pv.set(p[0],p[1]+0.06,p[2]);sv.set(p[3],1,p[3]);m.compose(pv,q,sv);poolMesh.setMatrixAt(i,m)});poolMesh.frustumCulled=false;poolMesh.renderOrder=2;scene.add(poolMesh)}
function buildProps(){const L={lamp0:[],lamp1:[],lamp2:[],bollard:[],bench:[],basket:[],bin:[],recycle:[],signal:[],stopsign:[],scooter:[]};
  for(const l of MAP.lamps){const x=l[0]/10,z=l[1]/10;L['lamp'+l[2]].push([x,groundY(x,z),z,l[3]+(l[4]>0?Math.PI:0)]);addBoxC(x,z,0.15,'p')}
  for(const e of EXTRA.lamp2){L.lamp2.push([e[0],terr(e[0],e[1]),e[1],0]);addBoxC(e[0],e[1],0.15,'p')}
  buildLightPools([].concat(L.lamp0.map(p=>[p[0],p[1],p[2],9]),L.lamp1.map(p=>[p[0],p[1],p[2],8]),L.lamp2.map(p=>[p[0]+Math.sin(p[3])*1.7,p[1],p[2]+Math.cos(p[3])*1.7,14])));
  for(const b of MAP.bollards){const x=b[0]/10,z=b[1]/10;L.bollard.push([x,groundY(x,z),z,0])}
  for(const b of MAP.props.bench){const x=b[0]/10,z=b[1]/10;L.bench.push([x,groundY(x,z),z,hf(b[0])*TAU])}
  for(const b of MAP.props.basket){const x=b[0]/10,z=b[1]/10;L.basket.push([x,groundY(x,z),z,0])}
  for(const b of MAP.props.recycle){const x=b[0]/10,z=b[1]/10;L.recycle.push([x,groundY(x,z),z,hf(b[1])*TAU])}
  // big street bins and scooters along residential sidewalks (Athens!)
  MAP.street_trees.forEach((t,i)=>{if(i%23===5){const x=t[0]/10+1.1,z=t[1]/10;L.bin.push([x,groundY(x,z),z,hf(i)*TAU])}if(i%17===3&&inFocus(t[0]/10,t[1]/10)){const x=t[0]/10-1.3,z=t[1]/10+0.8;L.scooter.push([x,groundY(x,z),z,hf(i*3)*TAU])}});
  // traffic lights at real junctions: pole on each side
  for(const s of MAP.props.signal){const x=s[0]/10,z=s[1]/10,ang=s[2],w=s[3];const dx=Math.cos(ang),dz=Math.sin(ang);for(const sd of[-1,1]){const px=x+dx*sd*5-dz*sd*(w/2+0.9),pz=z+dz*sd*5+dx*sd*(w/2+0.9);
    const yaw=Math.atan2(-dx*sd,-dz*sd);L.signal.push([px,groundY(px,pz),pz,yaw]);LENS.push({x:px,z:pz,y:groundY(px,pz)+3.25,yaw,ang,group:null});addBoxC(px,pz,0.12,'p')}}
  for(const s of MAP.props.stop){const x=s[0]/10,z=s[1]/10,ang=s[2],w=s[3];const px=x-Math.sin(ang)*(w/2+0.8),pz=z+Math.cos(ang)*(w/2+0.8);L.stopsign.push([px,groundY(px,pz),pz,0]);const ch=chunkAt(px,pz);const nx=-Math.cos(ang),nz=-Math.sin(ang);signAt(ch,px+nx*0.05,groundY(px,pz)+2.2,pz+nz*0.05,nx,nz,0.75,0.75,null,0,stopSlot());}
  const mats=MAT.atlas;for(const k in L){if(!L[k].length)continue;const geo=propGeo(k);const by={};for(const it of L[k]){const c=treeChunk(it[0],it[2]);(by[c.k]=by[c.k]||{c,list:[]}).list.push(it)}
    for(const key in by){const e=by[key];const im=instanced(geo,mats,e.list,false);im.userData.cast=k.startsWith('lamp')||k==='signal';e.c.props.push(im)}}
  const sol=instanced(propGeo('solar'),mats,ROOFI.solar.map(p=>[p[0],p[1],p[2],p[3]]),false),ac=instanced(propGeo('ac'),mats,ROOFI.ac.map(p=>[p[0],p[1],p[2],p[3]]),false);
  // signal lenses: one instanced mesh, colour per instance updated by the junction cycle
  const lg=new THREE.SphereGeometry(0.1,8,6);lensMesh=new THREE.InstancedMesh(lg,new THREE.MeshBasicMaterial({color:0xffffff}),LENS.length*3);const m=new THREE.Matrix4();
  LENS.forEach((l,i)=>{for(let k=0;k<3;k++){const fx=Math.sin(l.yaw),fz=Math.cos(l.yaw);m.makeTranslation(l.x+fx*0.15,l.y+0.3-k*0.3,l.z+fz*0.15);lensMesh.setMatrixAt(i*3+k,m);lensMesh.setColorAt(i*3+k,new THREE.Color(0x222222))}});lensMesh.frustumCulled=false;scene.add(lensMesh);
  // group lenses into junctions (signals within 35 m share one cycle)
  const groups=[];for(const l of LENS){let g=groups.find(g=>Math.hypot(g.x-l.x,g.z-l.z)<35);if(!g){g={x:l.x,z:l.z,ang:l.ang,off:hf(groups.length*97)*30};groups.push(g)}l.group=g;l.axis=Math.abs(Math.cos(l.ang-g.ang))>0.7?0:1}SIGNALS=groups}
let _stopSlot=null;function stopSlot(){if(!_stopSlot)_stopSlot=newSlot('STOP','#c8102e','#fff','stop');return _stopSlot}
function signalState(g,axis,t){const c=(t+g.off)%44;const ph=c<19?0:c<22?0.5:c<41?1:1.5;if(axis===0)return ph===0?'g':ph===0.5?'a':'r';return ph===1?'g':ph===1.5?'a':'r'}
function updateLenses(t){if(!lensMesh)return;const col=new THREE.Color();LENS.forEach((l,i)=>{const s=signalState(l.group,l.axis,t);lensMesh.setColorAt(i*3,col.setHex(s==='r'?0xff2a1a:0x2a0a08));lensMesh.setColorAt(i*3+1,col.setHex(s==='a'?0xffb400:0x2a2008));lensMesh.setColorAt(i*3+2,col.setHex(s==='g'?0x2aff7a:0x082a14))});lensMesh.instanceColor.needsUpdate=true}

/* bus stops, kiosks, fountains, street name signs */
function buildFurniture(){for(const b of MAP.props.bus){const x=b[0]/10,z=b[1]/10;const r=nearestRoad(x,z);if(!r)continue;const ch=chunkAt(x,z);const y=groundY(x,z);const ang=Math.atan2(r.nx,r.nz);
    const O=ch.o;O.box(x-r.nx*0.9,y+1.15,z-r.nz*0.9,3.2,2.3,0.06,ang,hexc('#9fb3bd'),RECT[T.glassR]);O.box(x,y+2.35,z,3.4,0.1,1.7,ang,hexc('#d9dcdf'),RECT[T.metalL]);for(const o of[-1.6,1.6]){const ux=-r.nz,uz=r.nx;O.box(x+ux*o,y+1.17,z+uz*o,0.08,2.34,0.08,ang,hexc('#5b6066'),RECT[T.metalL])}
    O.box(x-r.nx*0.85+(-r.nz)*1.0,y+1.2,z-r.nz*0.85+r.nx*1.0,1.0,1.7,0.12,ang,C1,RECT[T.ad],1);O.cyl(x+(-r.nz)*2.2,y,z+r.nx*2.2,0.04,0.04,2.6,6,hexc('#8d9297'),RECT[T.metalL],false);
    signAt(ch,x+(-r.nz)*2.2+r.nx*0.05,y+2.45,z+r.nx*2.2+r.nz*0.05,r.nx,r.nz,0.7,0.35,null,1,busSlot());addSeg(x-r.nx*0.9+(-r.nz)*1.6,z-r.nz*0.9+r.nx*1.6,x-r.nx*0.9-(-r.nz)*1.6,z-r.nz*0.9-r.nx*1.6,'p')}
  for(const k of MAP.props.kiosk){const x=k[0]/10,z=k[1]/10;const r=nearestRoad(x,z);const ang=r?Math.atan2(r.nx,r.nz):0;const ch=chunkAt(x,z);const y=groundY(x,z);const O=ch.o;
    O.box(x,y+1.3,z,2.3,2.6,2.0,ang,hexc('#e9e4d6'),RECT[T.stuccoL]);const nx=r?r.nx:0,nz=r?r.nz:1;O.box(x+nx*1.02,y+1.3,z+nz*1.02,2.2,2.4,0.05,ang,C1,RECT[T.kiosk],1);O.box(x+nx*0.6,y+2.75,z+nz*0.6,2.9,0.12,2.9,ang,hexc('#c8102e'),RECT[T.white]);
    O.box(x+nx*1.6,y+0.55,z+nz*1.6,1.2,1.1,0.5,ang,hexc('#f2f2f2'),RECT[T.white]);addBoxC(x,z,1.2,'b');INTER.push({type:'kiosk',x:x+nx*2.2,z:z+nz*2.2,label:'Buy a frappé'})}
  for(const f of MAP.props.fountain){const x=f[0]/10,z=f[1]/10;const ch=chunkAt(x,z);const y=groundY(x,z);if(f[2]){ch.o.cyl(x,y,z,1.6,1.6,0.6,14,hexc('#d6d0c4'),RECT[T.marble],false);ch.o.cyl(x,y+0.5,z,1.45,1.45,0.02,14,C1,RECT[T.water],true);ch.o.cyl(x,y,z,0.25,0.18,1.6,8,hexc('#d6d0c4'),RECT[T.marble],true);addBoxC(x,z,1.5,'p')}else{ch.o.cyl(x,y,z,0.18,0.15,0.95,8,hexc('#7d8a8f'),RECT[T.metalL],true)}}
  // blue street-name plates (Greek + Latin) at junction corners in the focus area
  const done=new Set();for(const [k,lst] of ROADNODES){if(lst.length<3)continue;const ns=[...new Set(lst.map(e=>ROADS[e.ri]).filter(r=>r.ty<=4&&r.name).map(r=>r.name))];if(!ns.length)continue;const [x,z]=k.split(',').map(v=>+v/10);if(!inFocus(x,z))continue;
    const key=Math.round(x/25)+','+Math.round(z/25);if(done.has(key))continue;done.add(key);let best=null;for(let a=0;a<12;a++){const px=x+Math.cos(a/12*TAU)*7.5,pz=z+Math.sin(a/12*TAU)*7.5;if(lvl(px,pz)>0.1){best=[px,pz];break}}if(!best)continue;
    const ch=chunkAt(best[0],best[1]);const y=groundY(best[0],best[1]);ch.o.cyl(best[0],y,best[1],0.04,0.04,2.9,6,hexc('#8d9297'),RECT[T.metalL],false);
    ns.slice(0,2).forEach((nm,ii)=>{const rd=lst.map(e=>ROADS[e.ri]).find(r=>r.name===nm);const p0=rd.ps[0],p1=rd.ps[rd.ps.length-1];const dx=p1[0]-p0[0],dz=p1[1]-p0[1],l=Math.hypot(dx,dz)||1;const nx=-dz/l,nz=dx/l;
      const rc=streetSlot(nm);if(rc){signAt(ch,best[0]+nx*0.03,y+2.6-ii*0.38,best[1]+nz*0.03,nx,nz,1.2,0.34,null,0,rc);signAt(ch,best[0]-nx*0.03,y+2.6-ii*0.38,best[1]-nz*0.03,-nx,-nz,1.2,0.34,null,0,rc)}})}}
let _busSlot=null;function busSlot(){if(!_busSlot)_busSlot=newSlot('ΣΤΑΣΗ','#1d4f9a','#fff','plain');return _busSlot}
const STREETSLOTS={};function streetSlot(nm){if(!(nm in STREETSLOTS))STREETSLOTS[nm]=newSlot([nm.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,''),greeklish(nm).toUpperCase()],'#1d4f9a','#fff','street');return STREETSLOTS[nm]}
function nearestRoad(x,z,maxd){maxd=maxd||30;let best=null;for(const r of ROADS){if(r.ty>4)continue;const ps=r.ps;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];if(Math.abs(a[0]-x)>maxd+80&&Math.abs(b[0]-x)>maxd+80)continue;const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;const u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1);const qx=a[0]+dx*u,qz=a[1]+dz*u;const d=Math.hypot(x-qx,z-qz);
  if(d<maxd&&(!best||d<best.d)){const l=Math.sqrt(L2);let nx=-dz/l,nz=dx/l;if((qx-x)*nx+(qz-z)*nz<0){nx=-nx;nz=-nz}best={d,r,nx,nz,qx,qz,ang:Math.atan2(dz,dx)}}}}return best}

