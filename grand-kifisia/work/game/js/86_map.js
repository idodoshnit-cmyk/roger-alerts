'use strict';
/* Grand Kifisia — vector map drawn from MAP data (shared by the radar and the pause-menu map), points of interest,
   routing on the real road graph (route()), waypoints and GPS state. See docs/GAMEPLAY.md. */

/* ============================== MAP GEOMETRY (Path2D, world metres) ============================== */
const MAPV={ready:false,areas:{},roads:[],labels:[],cells:new Map(),tile:null,tctx:null,tcx:1e9,tcz:1e9,bbox:[0,0,1,1]};
const POIS=[];// every named shop / amenity from the map: {x,z,nx,nz,name,kind,cat,b,special}
const PLACES=[];// landmarks shown on the map: {x,z,name,icon,col}
const MAPCOL={bg:'#10151b',side:'#222932',bld:'#2d3643',bldS:'#4a5564',park:'#1f4d2f',grass:'#255239',wood:'#173f27',scrub:'#2c3f2a',water:'#2a78b8',pool:'#3aa7d8',plaza:'#3b414a',parking:'#262c35',
  school:'#2a3040',sport:'#2a3040',rail:'#1a1f26',platform:'#4a4f58',pitch:'#2b5d7a',garden:'#225032'};
const ROADSTYLE=[/*0 primary*/['#f0c95c','#5d4a18',1],['#dfe5ec','#454d57',1],['#d3dae2','#454d57',1],['#a3adb9','#3a424c',1],['#a3adb9','#3a424c',1],['#737d8a','#30373f',0.8],
  /*6 pedestrian*/['#c2b28a','#4e452c',1],['#8a94a1',null,0.5],['#8a94a1',null,0.5],['#8a94a1',null,0.5]];
const POICAT={restaurant:'food',fast_food:'food',mythos:'food',kfc:'food',cafe:'cafe',coffee:'cafe',starbucks:'cafe',paul:'cafe',confectionery:'cafe',tea:'cafe',chocolate:'cafe',bar:'cafe',
  super:'market',clothes:'fashion',shoes:'fashion',bag:'fashion',jewelry:'fashion',fashion_accessories:'fashion',watches:'fashion',vintage:'fashion',optician:'fashion',gift:'fashion',
  cosmetics:'beauty',perfumery:'beauty',beauty:'beauty',hairdresser:'beauty',bank:'bank',bureau_de_change:'bank',hotel:'hotel',pharmacy:'health',clinic:'health',
  cinema:'culture',gallery:'culture',arts_centre:'culture',books:'culture'};
const CATSTYLE={food:['#ff8a3d','fork','Food'],cafe:['#c9925a','cup','Café & bakery'],market:['#5fd068','cart','Supermarket'],fashion:['#e879b9','bag','Shops'],beauty:['#b48cff','spark','Beauty'],bank:['#4fd1c5','euro','Bank'],
  hotel:['#6aa8ff','bed','Hotel'],health:['#ff6b6b','cross','Pharmacy'],culture:['#ffd166','film','Culture'],other:['#8a94a1','dot','Other'],
  station:['#ffffff','train','Station'],school:['#9ad0ff','cap','School'],park:['#6bd08a','tree','Park'],square:['#d9d4c7','dot','Square'],mission:['#ffc832','star','Mission'],sport:['#ff9f43','ball','Court']};
const latin=s=>isGreek(s)?greeklish(s):s;
function mapPoly(P,ring){for(let i=0;i<ring.length;i++){const p=ring[i];i?P.lineTo(p[0],p[1]):P.moveTo(p[0],p[1])}P.closePath()}
function buildMapCanvas(){const [bx0,bz0,bx1,bz1]=BOUNDS;
  let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9;for(const r of playPolys)for(const p of r){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}MAPV.bbox=[minx,minz,maxx,maxz];
  MAPV.dim=new Path2D();MAPV.dim.rect(bx0-500,bz0-500,bx1-bx0+1000,bz1-bz0+1000);for(const r of playPolys)mapPoly(MAPV.dim,r);
  for(const a of MAP.areas){const k=a[0];if(!MAPCOL[k])continue;const P=MAPV.areas[k]||(MAPV.areas[k]=new Path2D());mapPoly(P,unp(a[1][0]))}
  {const P=MAPV.areas.pitch||(MAPV.areas.pitch=new Path2D());for(const p of MAP.pitches){const [x,z,L,W,ang]=p,ca=Math.cos(ang),sa=Math.sin(ang),c=(u,v)=>[x+ca*u-sa*v,z+sa*u+ca*v];mapPoly(P,[c(-L/2,-W/2),c(L/2,-W/2),c(L/2,W/2),c(-L/2,W/2)])}}
  MAPV.side=new Path2D();for(const sw of MAP.sidewalks)for(const r of sw)mapPoly(MAPV.side,unp(r));
  /* roads grouped by (class, width) so each group is one stroke call */
  const groups=new Map();ROADS.forEach((r,ri)=>{if(r.side<0&&r.ty===7)return;const w=Math.round(r.w*2)/2,key=r.ty+'|'+w;let g=groups.get(key);if(!g){g={ty:r.ty,w,P:new Path2D()};groups.set(key,g)}r.ps.forEach((p,i)=>{i?g.P.lineTo(p[0],p[1]):g.P.moveTo(p[0],p[1])})});
  MAPV.roads=[...groups.values()].sort((a,b)=>(b.ty-a.ty)||(a.w-b.w));
  MAPV.rail=new Path2D();for(const r of MAP.rail)unp(r).forEach((p,i)=>{i?MAPV.rail.lineTo(p[0],p[1]):MAPV.rail.moveTo(p[0],p[1])});
  if(STATION.platform){MAPV.plat=new Path2D();mapPoly(MAPV.plat,STATION.platform)}
  const specialB={};for(const k in SPECIAL)if(SPECIAL[k]&&SPECIAL[k].b!=null)specialB[SPECIAL[k].b]=k;
  MAPV.bldAll=new Path2D();MAPV.bldS=new Path2D();
  MAP.buildings.forEach((b,bi)=>{const co=unp(b[10]);if(co.length<3)return;mapPoly(specialB[bi]?MAPV.bldS:MAPV.bldAll,co);
    let cx=0,cz=0;for(const p of co){cx+=p[0];cz+=p[1]}cx/=co.length;cz/=co.length;const ck=Math.floor(cx/160)+','+Math.floor(cz/160);let cell=MAPV.cells.get(ck);if(!cell){cell={P:new Path2D(),x:Math.floor(cx/160)*160,z:Math.floor(cz/160)*160};MAPV.cells.set(ck,cell)}mapPoly(cell.P,co);
    /* points of interest: every shop sign in the map data */
    for(const s of (b[8]||[])){const e=s[0],a=co[e],c=co[(e+1)%co.length];if(!a||!c||!s[2])continue;const x=a[0]+(c[0]-a[0])*s[1],z=a[1]+(c[1]-a[1])*s[1];const l=Math.hypot(c[0]-a[0],c[1]-a[1])||1;let nx=-(c[1]-a[1])/l,nz=(c[0]-a[0])/l;if(pip(co,x+nx*0.8,z+nz*0.8)){nx=-nx;nz=-nz}
      const kind=s[5]||'',sp=SPECIAL[kind]?kind:null;POIS.push({x:sp?SPECIAL[sp].door[0]:x+nx*0.9,z:sp?SPECIAL[sp].door[1]:z+nz*0.9,nx:sp?SPECIAL[sp].nx:nx,nz:sp?SPECIAL[sp].nz:nz,name:sp?({mythos:'Mythos Plus',paul:'PAUL',starbucks:'Starbucks',kfc:'KFC',super:'AB Vasilopoulos'}[sp]):latin(s[2]),kind,cat:POICAT[kind]||'other',b:bi,special:sp})}});
  if(MAP.isa&&MAP.isa.poly){MAPV.isa=new Path2D();mapPoly(MAPV.isa,unp(MAP.isa.poly))}
  /* street-name labels (Latin letters), most important streets first */
  const seenL=[];ROADS.forEach(r=>{if(!r.name||r.ty>6||r.L<28)return;const m=atLen(r.ps,r.cum,r.L/2),a0=atLen(r.ps,r.cum,Math.max(0,r.L/2-12)),a1=atLen(r.ps,r.cum,Math.min(r.L,r.L/2+12));MAPV.labels.push({t:latin(r.name),x:m[0],z:m[1],a:Math.atan2(a1[1]-a0[1],a1[0]-a0[0]),L:r.L,ty:r.ty})});
  MAPV.labels.sort((a,b)=>(a.ty-b.ty)||(b.L-a.L));
  /* landmarks */
  const K=MAP.key||{};const add=(k,name,cat)=>{if(K[k])PLACES.push({x:K[k][0],z:K[k][1],name,cat})};
  add('platanos','Platanos Square','square');add('alsos','Alsos Kifisias','park');add('agora','Kifisia Agora','fashion');add('goulandris','Goulandris Museum','culture');add('kefalari','Kefalari Square','square');add('church','Church','square');
  {const s=STATION.front||(K.station&&{x:K.station[0],z:K.station[1]});if(s)PLACES.push({x:s.x,z:s.z,name:'Kifisia Station · Line 1',cat:'station'})}
  if(MAP.isa)PLACES.push({x:MAP.isa.gate[0],z:MAP.isa.gate[1],name:'International School of Athens',cat:'school'});
  for(const p of MAP.pitches)if(p[5]==='multi'||p[5]==='basketball')PLACES.push({x:p[0],z:p[1],name:'Basketball court',cat:'sport',minor:true});
  MAPV.tile=document.createElement('canvas');MAPV.tile.width=MAPV.tile.height=640;MAPV.tctx=MAPV.tile.getContext('2d');mapC=MAPV.tile;
  navBuild();MAPV.ready=true}
/* draw the base map into a 2D context whose transform already maps world metres to pixels (pxm = pixels per metre) */
function drawMapBase(g,pxm,radar,vx0,vz0,vx1,vz1){const A=MAPV.areas,fill=(P,c,rule)=>{if(P){g.fillStyle=c;rule?g.fill(P,rule):g.fill(P)}};
  for(const k of['parking','school','sport','rail','plaza','scrub','grass','garden','park','wood','water','pool','pitch'])fill(A[k],MAPCOL[k]);
  if(!radar)fill(MAPV.side,MAPCOL.side,'evenodd');
  g.lineCap='round';g.lineJoin='round';
  if(!radar)for(const gr of MAPV.roads){const st=ROADSTYLE[gr.ty];if(!st[1])continue;g.strokeStyle=st[1];g.lineWidth=Math.max(gr.w*st[2]+1.6,(gr.ty<=2?5:3.4)/pxm);g.stroke(gr.P)}
  for(const gr of MAPV.roads){const st=ROADSTYLE[gr.ty];if(gr.ty>=7){if(radar)continue;g.strokeStyle=st[0];g.lineWidth=Math.max(1.2,1.3/pxm);g.setLineDash([3,3]);g.stroke(gr.P);g.setLineDash([]);continue}
    g.strokeStyle=radar?(gr.ty===0?'#e9cf7e':gr.ty<=2?'#d9dee5':gr.ty===6?'#b9ab88':'#8f99a6'):st[0];g.lineWidth=radar?Math.max(gr.w*0.9,(gr.ty<=2?3.2:2.2)/pxm):Math.max(gr.w*st[2],(gr.ty<=2?3.2:2)/pxm);g.stroke(gr.P)}
  if(MAPV.plat)fill(MAPV.plat,MAPCOL.platform);
  g.strokeStyle='#0b0e12';g.lineWidth=Math.max(2.6,3/pxm);g.stroke(MAPV.rail);g.strokeStyle='#cfd5dc';g.lineWidth=Math.max(1.1,1.4/pxm);g.setLineDash([4,4]);g.stroke(MAPV.rail);g.setLineDash([]);
  g.fillStyle=radar?'#39424f':MAPCOL.bld;g.strokeStyle='#4a5565';g.lineWidth=Math.max(0.35,0.7/pxm);
  for(const c of MAPV.cells.values()){if(c.x>vx1+60||c.x+220<vx0||c.z>vz1+60||c.z+220<vz0)continue;g.fill(c.P);if(!radar&&pxm>0.9)g.stroke(c.P)}
  if(!radar){g.fillStyle=MAPCOL.bldS;g.fill(MAPV.bldS);g.strokeStyle='#ffc832';g.lineWidth=Math.max(0.5,1.2/pxm);g.stroke(MAPV.bldS);
    if(MAPV.isa){g.fillStyle='rgba(120,180,255,.10)';g.fill(MAPV.isa);g.strokeStyle='rgba(154,208,255,.8)';g.lineWidth=Math.max(0.6,1.4/pxm);g.setLineDash([5,3]);g.stroke(MAPV.isa);g.setLineDash([])}}
  g.fillStyle=radar?'rgba(6,8,12,.5)':'rgba(6,8,12,.62)';g.fill(MAPV.dim,'evenodd')}
/* radar tile: a north-up bitmap around the player, re-rendered only when the player has moved away from its centre */
const TILE_PXM=2,TILE_SPAN=320;
function radarTile(x,z){if(!MAPV.ready)return null;if(Math.abs(x-MAPV.tcx)<24&&Math.abs(z-MAPV.tcz)<24)return MAPV.tile;MAPV.tcx=x;MAPV.tcz=z;const g=MAPV.tctx,h=TILE_SPAN/2;g.setTransform(1,0,0,1,0,0);g.fillStyle='#161b22';g.fillRect(0,0,640,640);
  g.setTransform(TILE_PXM,0,0,TILE_PXM,-(x-h)*TILE_PXM,-(z-h)*TILE_PXM);drawMapBase(g,TILE_PXM,true,x-h,z-h,x+h,z+h);return MAPV.tile}
/* small pictograms, drawn in a unit box centred on (x,y) with radius r */
function mapIcon(g,ic,x,y,r){g.save();g.translate(x,y);g.scale(r,r);g.lineWidth=0.2;g.lineCap='round';g.lineJoin='round';g.beginPath();
  if(ic==='fork'){g.moveTo(-0.35,-0.7);g.lineTo(-0.35,0.7);g.moveTo(-0.6,-0.7);g.lineTo(-0.6,-0.2);g.lineTo(-0.1,-0.2);g.lineTo(-0.1,-0.7);g.moveTo(0.45,0.7);g.lineTo(0.45,-0.7);g.quadraticCurveTo(0.05,-0.3,0.45,0.05);g.stroke()}
  else if(ic==='cup'){g.moveTo(-0.6,-0.35);g.lineTo(0.3,-0.35);g.lineTo(0.2,0.55);g.lineTo(-0.5,0.55);g.closePath();g.fill();g.beginPath();g.arc(0.38,0,0.26,-1.2,1.2);g.stroke();g.beginPath();g.moveTo(-0.3,-0.75);g.lineTo(-0.3,-0.55);g.moveTo(0,-0.75);g.lineTo(0,-0.55);g.stroke()}
  else if(ic==='cart'){g.moveTo(-0.75,-0.6);g.lineTo(-0.5,-0.6);g.lineTo(-0.3,0.2);g.lineTo(0.5,0.2);g.lineTo(0.7,-0.35);g.lineTo(-0.42,-0.35);g.stroke();g.beginPath();g.arc(-0.2,0.52,0.14,0,TAU);g.arc(0.42,0.52,0.14,0,TAU);g.fill()}
  else if(ic==='bag'){g.rect(-0.5,-0.25,1,0.85);g.fill();g.beginPath();g.arc(0,-0.25,0.3,Math.PI,0);g.stroke()}
  else if(ic==='spark'){for(let i=0;i<4;i++){const a=i*Math.PI/4;g.moveTo(Math.cos(a)*0.7,Math.sin(a)*0.7);g.lineTo(-Math.cos(a)*0.7,-Math.sin(a)*0.7)}g.stroke()}
  else if(ic==='euro'){g.arc(0.1,0,0.55,0.7,TAU-0.7);g.moveTo(-0.7,-0.15);g.lineTo(0.15,-0.15);g.moveTo(-0.7,0.15);g.lineTo(0.15,0.15);g.stroke()}
  else if(ic==='bed'){g.moveTo(-0.7,-0.5);g.lineTo(-0.7,0.6);g.moveTo(-0.7,0.25);g.lineTo(0.7,0.25);g.lineTo(0.7,0.6);g.stroke();g.beginPath();g.rect(-0.45,-0.15,0.4,0.3);g.rect(0.02,-0.02,0.66,0.2);g.fill()}
  else if(ic==='cross'){g.rect(-0.2,-0.65,0.4,1.3);g.rect(-0.65,-0.2,1.3,0.4);g.fill()}
  else if(ic==='film'){g.rect(-0.65,-0.45,1.3,0.9);g.stroke();g.beginPath();g.moveTo(-0.2,-0.22);g.lineTo(0.3,0);g.lineTo(-0.2,0.22);g.closePath();g.fill()}
  else if(ic==='train'){g.rect(-0.5,-0.7,1,1.05);g.fill();g.beginPath();g.moveTo(-0.3,0.4);g.lineTo(-0.55,0.75);g.moveTo(0.3,0.4);g.lineTo(0.55,0.75);g.stroke();g.globalCompositeOperation='destination-out';g.beginPath();g.rect(-0.34,-0.52,0.68,0.36);g.fill();g.beginPath();g.arc(-0.25,0.12,0.1,0,TAU);g.arc(0.25,0.12,0.1,0,TAU);g.fill()}
  else if(ic==='cap'){g.moveTo(0,-0.55);g.lineTo(0.8,-0.15);g.lineTo(0,0.25);g.lineTo(-0.8,-0.15);g.closePath();g.fill();g.beginPath();g.moveTo(-0.45,0.1);g.lineTo(-0.45,0.45);g.quadraticCurveTo(0,0.75,0.45,0.45);g.lineTo(0.45,0.1);g.stroke()}
  else if(ic==='tree'){g.arc(0,-0.2,0.5,0,TAU);g.fill();g.beginPath();g.moveTo(0,0.2);g.lineTo(0,0.75);g.stroke()}
  else if(ic==='ball'){g.arc(0,0,0.62,0,TAU);g.moveTo(-0.62,0);g.lineTo(0.62,0);g.moveTo(0,-0.62);g.lineTo(0,0.62);g.stroke()}
  else if(ic==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?0.34:0.8;i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.closePath();g.fill()}
  else if(ic==='pin'){g.arc(0,-0.2,0.45,0,TAU);g.fill()}
  else{g.arc(0,0,0.32,0,TAU);g.fill()}
  g.restore()}
function mapBadge(g,x,y,r,col,ic,letter){g.fillStyle='rgba(8,11,16,.9)';g.beginPath();g.arc(x,y,r+1.5,0,TAU);g.fill();g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.fillStyle=g.strokeStyle='#10151b';
  if(letter){g.font=`700 ${Math.round(r*1.35)}px "Barlow Condensed",Inter,Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(letter,x,y+r*0.08)}else mapIcon(g,ic,x,y,r*0.72)}
function mapText(g,t,x,y,px,col,align,weight){g.font=`${weight||600} ${px}px Inter,Arial,sans-serif`;g.textAlign=align||'left';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=Math.max(3,px*0.3);g.strokeStyle='rgba(8,11,16,.92)';g.strokeText(t,x,y);g.fillStyle=col||'#fff';g.fillText(t,x,y)}

/* ============================== ROUTING ON THE ROAD GRAPH ==============================
   Every polyline vertex is a node (junctions share exact coordinates in the map data), every polyline segment an edge. */
const NAV={id:new Map(),x:[],z:[],adj:[],ok:false};
function navBuild(){const nid=(p)=>{const k=Math.round(p[0]*10)+','+Math.round(p[1]*10);let i=NAV.id.get(k);if(i===undefined){i=NAV.x.length;NAV.id.set(k,i);NAV.x.push(p[0]);NAV.z.push(p[1]);NAV.adj.push([])}return i};
  ROADS.forEach((r,ri)=>{if(r.side<0&&r.ty===7)return;r._n=[];for(const p of r.ps)r._n.push(nid(p));for(let i=0;i<r.ps.length-1;i++){const a=r._n[i],b=r._n[i+1],l=Math.hypot(r.ps[i+1][0]-r.ps[i][0],r.ps[i+1][1]-r.ps[i][1]);if(a===b)continue;NAV.adj[a].push({to:b,l,ri,fw:1});NAV.adj[b].push({to:a,l,ri,fw:-1})}});NAV.ok=true}
const navWalkOK=r=>!(r.side<0&&r.ty===7),navDriveOK=r=>r.ty<=5&&r.side>=0;
const navCost=(r,l,drive)=>drive?l*(r.ty===0?0.8:r.ty<=2?0.9:r.ty===5?1.5:1):l*(r.ty===9?1.3:r.ty===6?0.9:1);
/* nearest point on a road the mode may use: {ri,i,u,x,z,d} */
function navNearest(x,z,drive,maxD){let best=null,bd=maxD||400;const ok=drive?navDriveOK:navWalkOK;for(let ri=0;ri<ROADS.length;ri++){const r=ROADS[ri];if(!r._n||!ok(r))continue;const ps=r.ps;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];if((a[0]<x-bd&&b[0]<x-bd)||(a[0]>x+bd&&b[0]>x+bd)||(a[1]<z-bd&&b[1]<z-bd)||(a[1]>z+bd&&b[1]>z+bd))continue;
    const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1e-9,u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1),qx=a[0]+dx*u,qz=a[1]+dz*u,d=Math.hypot(x-qx,z-qz);if(d<bd){bd=d;best={ri,i,u,x:qx,z:qz,d}}}}return best}
/* shortest path between two world points. mode 'walk' (default) or 'drive' (driveable roads, one-way respected).
   Returns {pts:[[x,z],…], len} (pts starts at the snapped start point and ends at the snapped destination) or null. */
function route(ax,az,bx,bz,mode){if(!NAV.ok)return null;const drive=mode==='drive';const A=navNearest(ax,az,drive),B=navNearest(bx,bz,drive);if(!A||!B)return null;
  const ok=drive?navDriveOK:navWalkOK;const rA=ROADS[A.ri],rB=ROADS[B.ri];const segL=(r,i)=>Math.hypot(r.ps[i+1][0]-r.ps[i][0],r.ps[i+1][1]-r.ps[i][1]);
  const dirOK=(r,fw)=>!drive||!r.ow||(r.ow===1?fw>0:fw<0);
  if(A.ri===B.ri&&A.i===B.i&&dirOK(rA,B.u>=A.u?1:-1)){return{pts:[[A.x,A.z],[B.x,B.z]],len:Math.hypot(B.x-A.x,B.z-A.z)}}
  const n=NAV.x.length,dist=new Float32Array(n).fill(1e12),prev=new Int32Array(n).fill(-1),heap=[];
  const push=(v,d)=>{heap.push([d,v]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;const t=heap[p];heap[p]=heap[i];heap[i]=t;i=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;const t=heap[m];heap[m]=heap[i];heap[i]=t;i=m}}return top};
  {const l=segL(rA,A.i);if(dirOK(rA,-1)){const v=rA._n[A.i],d=navCost(rA,l*A.u,drive);if(d<dist[v]){dist[v]=d;push(v,d)}}if(dirOK(rA,1)){const v=rA._n[A.i+1],d=navCost(rA,l*(1-A.u),drive);if(d<dist[v]){dist[v]=d;push(v,d)}}}
  const lB=segL(rB,B.i),b0=rB._n[B.i],b1=rB._n[B.i+1];let bestEnd=-1,bestD=1e12;
  while(heap.length){const [d,v]=pop();if(d>dist[v])continue;if(d>=bestD)break;
    if(v===b0&&dirOK(rB,1)){const t=d+navCost(rB,lB*B.u,drive);if(t<bestD){bestD=t;bestEnd=v}}if(v===b1&&dirOK(rB,-1)){const t=d+navCost(rB,lB*(1-B.u),drive);if(t<bestD){bestD=t;bestEnd=v}}
    const ad=NAV.adj[v];for(let k=0;k<ad.length;k++){const e=ad[k],r=ROADS[e.ri];if(!ok(r)||!dirOK(r,e.fw))continue;const nd=d+navCost(r,e.l,drive);if(nd<dist[e.to]){dist[e.to]=nd;prev[e.to]=v;push(e.to,nd)}}}
  if(bestEnd<0)return drive?route(ax,az,bx,bz,'walk'):null;
  const pts=[[B.x,B.z]];for(let v=bestEnd;v>=0;v=prev[v])pts.push([NAV.x[v],NAV.z[v]]);pts.push([A.x,A.z]);pts.reverse();let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return{pts,len}}

/* ============================== GPS ==============================
   The GPS guides to the active mission objective (mission.target()), or else to the waypoint the player set on the map. */
const GPS={wp:null,pts:null,len:0,remain:0,i:0,px:0,pz:0,key:'',t:0,dest:null,kind:''};
function setWaypoint(x,z,label,quiet){GPS.wp={x,z,label:label||'Waypoint'};GPS.key='';if(!quiet){toast('GPS set: '+(label||'Waypoint'),'pin');if(typeof uiSound==='function')uiSound('wp')}}
function clearWaypoint(quiet){if(GPS.wp&&!quiet)toast('Waypoint removed','pin');GPS.wp=null;GPS.key=''}
function gpsDest(){if(typeof mission!=='undefined'&&mission){if(mission.gps===false)return null;const t=mission.target&&mission.target();if(t)return{x:t.x,z:t.z,kind:'obj',path:mission.path||null,drive:t.drive}}
  return GPS.wp?{x:GPS.wp.x,z:GPS.wp.z,kind:'wp'}:null}
function gpsUpdate(dt){const p=player.car||player,d=gpsDest();GPS.dest=d;if(!d){GPS.pts=null;GPS.key='';return}
  if(d.kind==='wp'&&Math.hypot(d.x-p.x,d.z-p.z)<9){clearWaypoint(true);toast('You have arrived','pin');if(typeof uiSound==='function')uiSound('ok');GPS.pts=null;return}
  GPS.t-=dt;const drive=!!player.car;const key=d.kind+'|'+Math.round(d.x/4)+'|'+Math.round(d.z/4)+'|'+(drive?1:0)+'|'+(d.path?'p':'');
  let off=0;if(GPS.pts){const q=gpsProject(p.x,p.z);off=q.d}
  if(key!==GPS.key||(GPS.t<=0&&off>16)||!GPS.pts){GPS.key=key;GPS.t=1.5;let r=null;
    if(d.path){r={pts:d.path,len:0}}else r=route(p.x,p.z,d.x,d.z,drive?'drive':'walk');
    if(r){const pts=r.pts.slice();const l=pts[pts.length-1];if(Math.hypot(l[0]-d.x,l[1]-d.z)>1.5&&!d.path)pts.push([d.x,d.z]);GPS.pts=pts;GPS.cum=cumlen(pts);GPS.len=GPS.cum[GPS.cum.length-1]}else{GPS.pts=[[p.x,p.z],[d.x,d.z]];GPS.cum=cumlen(GPS.pts);GPS.len=GPS.cum[1]}
    gpsProject(p.x,p.z)}
  GPS.kind=d.kind;GPS.remain=Math.max(0,GPS.len-(GPS.cum[GPS.i]+Math.hypot(GPS.px-GPS.pts[GPS.i][0],GPS.pz-GPS.pts[GPS.i][1])))+(d.path?0:0)}
/* nearest point of the current route to (x,z): sets GPS.i (segment), GPS.px/pz; returns {d} */
const _gp={d:0};
function gpsProject(x,z){const ps=GPS.pts;let bd=1e9,bi=0,bx=ps[0][0],bz=ps[0][1];for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1e-9,u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1),qx=a[0]+dx*u,qz=a[1]+dz*u,d=(x-qx)*(x-qx)+(z-qz)*(z-qz);if(d<bd){bd=d;bi=i;bx=qx;bz=qz}}
  GPS.i=bi;GPS.px=bx;GPS.pz=bz;_gp.d=Math.sqrt(bd);return _gp}
/* stroke the remaining route in a context whose transform maps world metres to pixels */
function gpsStroke(g,pxm,col,wpx){const ps=GPS.pts;if(!ps)return;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(GPS.px,GPS.pz);for(let i=GPS.i+1;i<ps.length;i++)g.lineTo(ps[i][0],ps[i][1]);
  g.strokeStyle='rgba(8,11,16,.85)';g.lineWidth=(wpx+3)/pxm;g.stroke();g.strokeStyle=col;g.lineWidth=wpx/pxm;g.stroke()}
const gpsColor=()=>GPS.kind==='wp'?'#39b6ff':'#ffc832';

/* ============================== NAMES OF PLACES ============================== */
let streetCache={t:'',r:null};
function streetName(){const p=player.car||player;const n=navNearestNamed(p.x,p.z);return n?latin(n):'Kifisia'}
function navNearestNamed(x,z,maxD){let best='',bd=maxD||30;for(const r of ROADS){if(!r.name||r.ty>6)continue;const ps=r.ps;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];if((a[0]<x-bd&&b[0]<x-bd)||(a[0]>x+bd&&b[0]>x+bd)||(a[1]<z-bd&&b[1]<z-bd)||(a[1]>z+bd&&b[1]>z+bd))continue;const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1,u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1),d=Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u);if(d<bd){bd=d;best=r.name}}}return best}
const DISTRICTS=[['Kifisia Centre','platanos',260],['Station','station',170],['Alsos','alsos',120],['Kefalari','kefalari',230],['Kolokotroni','agora',170]];
function districtName(){const p=player.car||player;if(player.interior){const P=POIS.find(q=>q.special===player.interior);return P?P.name:'Indoors'}
  if(MAP.isa&&Math.hypot(p.x-MAP.isa.gate[0],p.z-MAP.isa.gate[1])<150)return'ISA · Kefalari';let best='Kifisia',bd=1e9;for(const [n,k,r] of DISTRICTS){const q=MAP.key[k];if(!q)continue;const d=Math.hypot(p.x-q[0],p.z-q[1])/r;if(d<1&&d<bd){bd=d;best=n}}return best}

/* ============================== BIG MAP (pause menu) ============================== */
const BM={c:null,g:null,cx:0,cz:0,s:1,w:0,h:0,dpr:1,ptr:new Map(),moved:0,t0:0,pd:0,legend:false,raf:0,minS:0.3,maxS:7};
function bigMapOpen(canvas){BM.c=canvas;BM.g=canvas.getContext('2d');const p=player.car||player;BM.cx=p.x;BM.cz=p.z;bigMapResize();BM.s=clamp(Math.min(BM.w,BM.h)/380,BM.minS,BM.maxS);bigMapDraw();
  if(canvas._gkBound)return;canvas._gkBound=true;
  const pos=e=>{const r=canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);const q=pos(e);BM.ptr.set(e.pointerId,q);if(BM.ptr.size===1){BM.moved=0;BM.t0=performance.now()}else BM.moved=99;BM.pd=0;e.preventDefault()});
  canvas.addEventListener('pointermove',e=>{const o=BM.ptr.get(e.pointerId);if(!o)return;const q=pos(e);
    if(BM.ptr.size===1){BM.cx-=(q[0]-o[0])/BM.s;BM.cz-=(q[1]-o[1])/BM.s;BM.moved+=Math.abs(q[0]-o[0])+Math.abs(q[1]-o[1])}
    else if(BM.ptr.size===2){const other=[...BM.ptr.entries()].find(v=>v[0]!==e.pointerId)[1];const d0=Math.hypot(o[0]-other[0],o[1]-other[1]),d1=Math.hypot(q[0]-other[0],q[1]-other[1]);const mx=(q[0]+other[0])/2,mz=(q[1]+other[1])/2;if(d0>8)bigMapZoom(d1/d0,mx,mz);BM.cx-=(q[0]-o[0])/2/BM.s;BM.cz-=(q[1]-o[1])/2/BM.s}
    BM.ptr.set(e.pointerId,q);bigMapClamp();bigMapQueue();e.preventDefault()});
  const up=e=>{const o=BM.ptr.get(e.pointerId);if(!o)return;BM.ptr.delete(e.pointerId);if(BM.ptr.size===0&&BM.moved<9&&performance.now()-BM.t0<450)bigMapTap(o[0],o[1])};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>BM.ptr.delete(e.pointerId));
  canvas.addEventListener('wheel',e=>{const q=pos(e);bigMapZoom(Math.exp(-e.deltaY*0.0016),q[0],q[1]);bigMapQueue();e.preventDefault()},{passive:false})}
function bigMapResize(){const c=BM.c;if(!c)return;const r=c.getBoundingClientRect();BM.dpr=Math.min(2,window.devicePixelRatio||1);BM.w=Math.max(50,r.width);BM.h=Math.max(50,r.height);c.width=Math.round(BM.w*BM.dpr);c.height=Math.round(BM.h*BM.dpr);
  const b=MAPV.bbox;BM.minS=Math.min(BM.w/(b[2]-b[0]+80),BM.h/(b[3]-b[1]+80))}
function bigMapClamp(){const b=MAPV.bbox;BM.cx=clamp(BM.cx,b[0]-40,b[2]+40);BM.cz=clamp(BM.cz,b[1]-40,b[3]+40)}
function bigMapZoom(f,sx,sy){const s0=BM.s,s1=clamp(s0*f,BM.minS,BM.maxS);if(sx==null){sx=BM.w/2;sy=BM.h/2}const wx=BM.cx+(sx-BM.w/2)/s0,wz=BM.cz+(sy-BM.h/2)/s0;BM.s=s1;BM.cx=wx-(sx-BM.w/2)/s1;BM.cz=wz-(sy-BM.h/2)/s1;bigMapClamp()}
function bigMapQueue(){if(BM.raf)return;BM.raf=requestAnimationFrame(()=>{BM.raf=0;bigMapDraw()})}
function bigMapCentre(){const p=player.car||player;BM.cx=p.x;BM.cz=p.z;BM.s=Math.max(BM.s,1.4);bigMapQueue()}
function bigMapTap(sx,sy){const wx=BM.cx+(sx-BM.w/2)/BM.s,wz=BM.cz+(sy-BM.h/2)/BM.s;const R=18/BM.s;
  if(GPS.wp&&Math.hypot(GPS.wp.x-wx,GPS.wp.z-wz)<R){clearWaypoint();bigMapAfterWp();return}
  let label=null,tx=wx,tz=wz;/* tapping a place or a shop names the waypoint after it */
  let bd=R*1.4;for(const P of PLACES){const d=Math.hypot(P.x-wx,P.z-wz);if(d<bd){bd=d;label=P.name;tx=P.x;tz=P.z}}
  for(const P of POIS){if(!P.special&&BM.s<1.6)continue;const d=Math.hypot(P.x-wx,P.z-wz);if(d<bd){bd=d;label=P.name;tx=P.x;tz=P.z}}
  if(typeof MISSIONS!=='undefined')for(const m of MISSIONS){const a=m.at();const d=Math.hypot(a.x-wx,a.z-wz);if(d<bd){bd=d;label=m.title;tx=a.x;tz=a.z}}
  if(!inPlay(tx,tz)){toast('That is outside Grand Kifisia','pin');return}
  if(!label){const n=navNearestNamed(tx,tz,40);label=n?latin(n):'Waypoint'}
  setWaypoint(tx,tz,label);bigMapAfterWp()}
function bigMapAfterWp(){GPS.t=0;try{gpsUpdate(0)}catch(e){}bigMapDraw();if(typeof menuMapInfo==='function')menuMapInfo()}
function bigMapDraw(){const g=BM.g;if(!g||!MAPV.ready)return;const W=BM.w,H=BM.h,s=BM.s,d=BM.dpr;g.setTransform(d,0,0,d,0,0);g.fillStyle=MAPCOL.bg;g.fillRect(0,0,W,H);
  const vx0=BM.cx-W/2/s,vx1=BM.cx+W/2/s,vz0=BM.cz-H/2/s,vz1=BM.cz+H/2/s;const SX=x=>(x-BM.cx)*s+W/2,SY=z=>(z-BM.cz)*s+H/2;
  g.setTransform(d*s,0,0,d*s,d*(W/2-BM.cx*s),d*(H/2-BM.cz*s));drawMapBase(g,s,false,vx0,vz0,vx1,vz1);
  if(GPS.pts&&GPS.dest)gpsStroke(g,s,gpsColor(),4.5);
  g.setTransform(d,0,0,d,0,0);const vis=(x,z,m)=>x>vx0-m&&x<vx1+m&&z>vz0-m&&z<vz1+m;
  /* street names */
  const placed=[];const fs=s>2.4?13:s>1.1?12:11;g.font=`600 ${fs}px Inter,Arial,sans-serif`;
  for(const L of MAPV.labels){if(!vis(L.x,L.z,0))continue;if(L.ty>2&&s<0.75)continue;if(L.ty>3&&s<1.3)continue;const tw=g.measureText(L.t).width;if(L.L*s<tw+16)continue;const X=SX(L.x),Y=SY(L.z);let ok=true;for(const q of placed){const dd=Math.hypot(q[0]-X,q[1]-Y);if(dd<(q[2]+tw)/2+6||(q[3]===L.t&&dd<240)){ok=false;break}}if(!ok)continue;placed.push([X,Y,tw,L.t]);
    let a=L.a;if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;g.save();g.translate(X,Y);g.rotate(a);mapText(g,L.t,0,0,fs,L.ty===0?'#fff3cf':'#eef2f6','center',L.ty<=2?700:600);g.restore()}
  /* shops */
  const taken=[];const free=(X,Y,r)=>{for(const q of taken)if(Math.abs(q[0]-X)<q[2]+r&&Math.abs(q[1]-Y)<14)return false;return true};
  if(s>=1.5)for(const P of POIS){if(P.special||!vis(P.x,P.z,5))continue;const st=CATSTYLE[P.cat]||CATSTYLE.other,X=SX(P.x),Y=SY(P.z);if(s>=2.6){mapBadge(g,X,Y,7,st[0],st[1])}else{g.fillStyle=st[0];g.beginPath();g.arc(X,Y,2.6,0,TAU);g.fill()}}
  if(s>=3.4){for(const P of POIS){if(P.special||!vis(P.x,P.z,5))continue;const X=SX(P.x),Y=SY(P.z);const tw=P.name.length*5.6;if(!free(X+10+tw/2,Y,tw/2))continue;taken.push([X+10+tw/2,Y,tw/2]);mapText(g,P.name,X+10,Y,10.5,'#cfd6de')}}
  /* landmarks and the five famous shops */
  for(const P of PLACES){if(!vis(P.x,P.z,10))continue;if(P.minor&&s<1.2)continue;const st=CATSTYLE[P.cat]||CATSTYLE.other,X=SX(P.x),Y=SY(P.z);mapBadge(g,X,Y,9,st[0],st[1]);if(s>=0.7&&!P.minor)mapText(g,P.name,X+13,Y,11.5,'#fff','left',700)}
  for(const P of POIS){if(!P.special||!vis(P.x,P.z,10))continue;const st=CATSTYLE[P.cat]||CATSTYLE.other,X=SX(P.x),Y=SY(P.z);mapBadge(g,X,Y,9,st[0],st[1]);if(s>=1)mapText(g,P.name,X+13,Y,11.5,'#fff','left',700)}
  /* missions */
  if(typeof MISSIONS!=='undefined')for(const m of MISSIONS){const a=m.at();if(!vis(a.x,a.z,10))continue;const X=SX(a.x),Y=SY(a.z),act=mission&&mission.id===m.id;mapBadge(g,X,Y,11,SAVE.done[m.id]&&!act?'#8fa08f':'#ffc832',null,m.icon);if(s>=0.6)mapText(g,m.title,X+15,Y,12,act?'#ffc832':'#fff','left',800)}
  /* destination + waypoint */
  const dd=GPS.dest;if(dd&&dd.kind==='obj'){const X=SX(dd.x),Y=SY(dd.z);g.save();g.translate(X,Y);g.rotate(Math.PI/4);g.fillStyle='#10151b';g.fillRect(-8.5,-8.5,17,17);g.fillStyle='#ffc832';g.fillRect(-6.5,-6.5,13,13);g.restore()}
  if(GPS.wp){const X=SX(GPS.wp.x),Y=SY(GPS.wp.z);g.fillStyle='#10151b';g.beginPath();g.moveTo(X,Y+2);g.lineTo(X-9,Y-13);g.arc(X,Y-16,9.5,Math.PI*0.9,Math.PI*2.1);g.closePath();g.fill();g.fillStyle='#39b6ff';g.beginPath();g.moveTo(X,Y);g.lineTo(X-6.5,Y-12);g.arc(X,Y-16,7.5,Math.PI*0.9,Math.PI*2.1);g.closePath();g.fill();g.fillStyle='#10151b';g.beginPath();g.arc(X,Y-16,2.8,0,TAU);g.fill();mapText(g,GPS.wp.label,X+13,Y-16,11.5,'#9fdcff','left',700)}
  /* player */
  {const p=player.car||player,X=SX(p.x),Y=SY(p.z),yaw=player.car?player.car.yaw:player.yaw;g.save();g.translate(X,Y);g.rotate(Math.PI-yaw);g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(0,0,17,0,TAU);g.fill();g.fillStyle='#fff';g.strokeStyle='#10151b';g.lineWidth=2.5;g.beginPath();g.moveTo(0,-12);g.lineTo(8.5,9);g.lineTo(0,4.5);g.lineTo(-8.5,9);g.closePath();g.stroke();g.fill();g.restore()}
  /* scale bar + north */
  {let m=50;for(const c of[20,50,100,200,500])if(c*s>=60){m=c;break}const x=14,y=H-16;g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(x,y-5);g.lineTo(x,y);g.lineTo(x+m*s,y);g.lineTo(x+m*s,y-5);g.stroke();mapText(g,m+' m',x+m*s+8,y-3,11,'#fff');mapText(g,'N',W-22,26,13,'#fff','center',800);g.fillStyle='#ff4d3d';g.beginPath();g.moveTo(W-22,4);g.lineTo(W-17,15);g.lineTo(W-27,15);g.closePath();g.fill()}}
