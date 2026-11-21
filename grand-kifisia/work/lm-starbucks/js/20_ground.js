'use strict';
/* Grand Kifisia — world state, terrain, level grid, roads + road markings, sidewalks, curbs, tree pits, stairs, areas, pitches (agent: streets; see docs/STREETS_IMPL.md) */
/* ============================== WORLD BUILD ============================== */
const STYLE_COL={apt:['#f2efe8','#ece6d8','#e6e2da','#efe6d2','#dcdcd6','#e9e1cf','#f4eee4'],neo:['#e6c58a','#e9b7a0','#efd8a2','#dcc3a2','#e8d2ba','#f1dfbd','#d7b58e','#e3c9a8'],
  villa:['#f4f1ea','#efe8dc','#f2e5cf','#e9dccb','#f5efe3'],modern:['#d9dbdd','#e4e3df','#cacdd0'],shop:['#ebe6dc','#dcd7cc'],agora:['#f6f4ee'],church:['#efe4cf'],station:['#e7bf55'],school:['#e2ddd2','#d8d2c6']};
const PARK={};const SHOPFRONTS=[];
function inShopZone(x,z,depth){for(const s of SHOPFRONTS){const dx=s.c[0]-s.a[0],dz=s.c[1]-s.a[1];const u=((x-s.a[0])*dx+(z-s.a[1])*dz)/(s.L*s.L);if(u<-0.15||u>1.15)continue;const d=(x-s.a[0])*s.nx+(z-s.a[1])*s.nz;if(d>-0.3&&d<Math.max(depth||9,(s.depth||0)+1.2))return true}return false}
function measureShopDepths(){for(const s of SHOPFRONTS){const mx=(s.a[0]+s.c[0])/2,mz=(s.a[1]+s.c[1])/2;s.depth=0;for(let k=0.5;k<=26;k+=0.5){if(lvl(mx+s.nx*k,mz+s.nz*k)>0.1){s.depth=k;break}}}}
function buildForecourts(){for(const s of SHOPFRONTS){let depth=s.depth||0;if(depth<0.8)continue;depth+=0.4;
  const ring=[[s.a[0],s.a[1]],[s.a[0]+s.nx*depth,s.a[1]+s.nz*depth],[s.c[0]+s.nx*depth,s.c[1]+s.nz*depth],[s.c[0],s.c[1]]];if(polyArea(ring)<0)ring.reverse();groundPoly([ring],0.158,T.marble,2.5,C1,6)}}
let ROADS=[],ROADNODES=new Map(),SIGNALS=[],SPECIAL={},STATION={},TRAINPATH=null,HOOPS=[],ISA={},INTER=[];
function buildTerrain(){const n=TER.nx,m=TER.nz,st=TER.step;const [bx0,bz0,bx1,bz1]=BOUNDS;
  for(let j=0;j<m-1;j++)for(let i=0;i<n-1;i++){const x0=TER.x0+i*st,z0=TER.z0+j*st,x1=x0+st,z1=z0+st;if(x1<bx0-20||x0>bx1+20||z1<bz0-20||z0>bz1+20)continue;
    const h00=tH[j*n+i],h10=tH[j*n+i+1],h01=tH[(j+1)*n+i],h11=tH[(j+1)*n+i+1];const ch=chunkAt(x0+st/2,z0+st/2).o;const g=0.9+hf(i*7+j*131)*0.2;const col=[0.82*g,0.84*g,0.74*g];
    const s=7;ch.tri([x0,h00-0.02,z0],[x0,h01-0.02,z1],[x1,h11-0.02,z1],[x0/s,z0/s],[x0/s,z1/s],[x1/s,z1/s],col,RECT[T.dryG],0);ch.tri([x0,h00-0.02,z0],[x1,h11-0.02,z1],[x1,h10-0.02,z0],[x0/s,z0/s],[x1/s,z1/s],[x1/s,z0/s],col,RECT[T.dryG],0)}
  // far ground skirt so the world doesn't end in a void
  const g=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),new THREE.MeshLambertMaterial({color:0x6f6d4c}));g.rotation.x=-Math.PI/2;g.position.set((bx0+bx1)/2,-6,(bz0+bz1)/2);scene.add(g);
  const mt=new THREE.MeshLambertMaterial({color:0x7a8270});[[2200,-2600,1400,700],[-2400,-1500,900,320],[2600,900,1000,260],[-500,-3200,1300,460],[300,2900,1500,240]].forEach(([x,z,r,h])=>{const c=new THREE.Mesh(new THREE.ConeGeometry(r,h,14),mt);c.position.set(x,h/2-8,z);scene.add(c)})}

function buildLevelGrid(){const [bx0,bz0,bx1,bz1]=BOUNDS;lvW=Math.ceil(bx1-bx0);lvH=Math.ceil(bz1-bz0);const cv=document.createElement('canvas');cv.width=lvW;cv.height=lvH;const g=cv.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,lvW,lvH);
  const path=(ring)=>{g.beginPath();ring.forEach((p,i)=>{const x=p[0]-bx0,y=p[1]-bz0;i?g.lineTo(x,y):g.moveTo(x,y)});g.closePath()};
  g.fillStyle='rgb(32,0,0)';for(const sw of MAP.sidewalks){g.beginPath();for(const r of sw){unp(r).forEach((p,i)=>{const x=p[0]-bx0,y=p[1]-bz0;i?g.lineTo(x,y):g.moveTo(x,y)});g.closePath()}g.fill('evenodd')}
  for(const a of MAP.areas){if(a[0]!=='plaza')continue;path(unp(a[1][0]));g.fill()}
  for(const r of ROADS){if(r.ty!==6)continue;g.strokeStyle='rgb(34,0,0)';g.lineWidth=r.w;g.lineCap='round';g.beginPath();r.ps.forEach((p,i)=>{i?g.lineTo(p[0]-bx0,p[1]-bz0):g.moveTo(p[0]-bx0,p[1]-bz0)});g.stroke()}
  if(STATION.platform){path(STATION.platform);g.fillStyle='rgb(130,0,0)';g.fill();const r=STATION.ramp;if(r){const gr=g.createLinearGradient(r[0][0]-bx0,r[0][1]-bz0,r[1][0]-bx0,r[1][1]-bz0);gr.addColorStop(0,'rgb(130,0,0)');gr.addColorStop(1,'rgb(32,0,0)');g.fillStyle=gr;path(r[2]);g.fill()}}
  const d=g.getImageData(0,0,lvW,lvH).data;LVL=new Float32Array(lvW*lvH);for(let i=0;i<LVL.length;i++)LVL[i]=d[i*4]/200}

/* ============================== STREET SPECS ==============================
   STREETS[name] = spec of one street (Greek OSM name): {sidewalk:'pavers|brick|slabs|marble|asph2', core:bool, …}. Built-in values are ESTIMATES from general knowledge of
   Kifisia; loadStreetSpecs(json) overlays the researched gk3/data/streets.json (format in docs/ARCHITECTURE.md) when it has been loaded. */
const STREETS={};
const CORE_STREETS=['Κασσαβέτη','Κολοκοτρώνη','Λεβίδου','Κυριαζή','Παναγίτσας','Αργυροπούλου','Γεωργίου Δροσίνη','Αγίων Θεοδώρων','Κηφισίας','Δηληγιάννη','Εμμανουήλ Μπενάκη','Χαριλάου Τρικούπη'];
const SWMAT={red_brick:'brick',grey_pavers:'pavers',marble:'marble',slabs:'slabs',asphalt:'asph2'};
/* gk3/data/streets.json is fetched at script load (it is small and arrives long before buildRoads runs); buildRoads applies it if it is there */
let STREETS_JSON=null;try{fetch('data/streets.json').then(r=>r.ok?r.json():null).then(j=>{STREETS_JSON=j}).catch(()=>{})}catch(e){}
/* gk3/data/places.json (research): landmarks and their elements with game coordinates; read by 45_trees.js / 50_props.js through placeEl() */
let PLACES_JSON=null;try{fetch('data/places.json').then(r=>r.ok?r.json():null).then(j=>{PLACES_JSON=j}).catch(()=>{})}catch(e){}
/* all research elements whose 'what' matches re (and that have x,z), optionally only of one place key */
function placeEl(re,key){const out=[];if(!PLACES_JSON||!PLACES_JSON.places)return out;for(const p of PLACES_JSON.places){if(key&&p.key!==key)continue;for(const e of p.elements||[])if(e&&typeof e.x==='number'&&typeof e.z==='number'&&re.test(e.what||''))out.push(Object.assign({place:p.key},e))}return out}
function loadStreetSpecs(j){if(!j||!j.streets)return;for(const s of j.streets){if(!s||!s.name)continue;const o=STREETS[s.name]=STREETS[s.name]||{};o.data=s;if(s.sidewalk&&SWMAT[s.sidewalk.material])o.sidewalk=SWMAT[s.sidewalk.material];
  if(s.parking)o.parking=s.parking;if(s.lanes)o.lanes=s.lanes;if(s.trees)o.trees=s.trees;if(s.lamps)o.lamps=s.lamps;if(s.bollards)o.bollards=s.bollards}}
function streetSpec(name){let o=STREETS[name];if(!o)o=STREETS[name]={};if(o.core===undefined)o.core=CORE_STREETS.indexOf(name)>=0;return o}

/* ============================== GROUND DECAL SHEET ==============================
   One cut-out material layer with a 4×4 sheet of ground decals (cast-iron covers, drain grate, arrow, tree grate, crack seal, zigzag, TAXI, fallen leaves …).
   sdCell(SDC.name) → [u0,v0,u1,v1] for rdecal()/gdecal(). */
const SDC={manhole:0,cover:1,drain:2,arrow:3,grate:4,crack:5,valve:6,dis:7,zig:8,taxi:9,leaves:10,stopT:11};
function sdCell(i){const c=i%4,r=i>>2,m=0.014;return[c/4+m,1-(r+1)/4+m,(c+1)/4-m,1-r/4-m]}
defTile('sdecal',(g,S)=>{const C=S/4;const cell=(i,fn)=>{g.save();g.translate((i%4)*C,(i>>2)*C);g.beginPath();g.rect(2,2,C-4,C-4);g.clip();fn(C);g.restore()};let sd=11;const rr=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
  cell(0,c=>{const m=c/2;g.fillStyle='#35373b';g.beginPath();g.arc(m,m,c*0.44,0,TAU);g.fill();g.strokeStyle='#64676c';g.lineWidth=2;g.beginPath();g.arc(m,m,c*0.37,0,TAU);g.stroke();g.fillStyle='#575a5f';
    for(let a=0;a<14;a++)for(let k=1;k<4;k++){const an=a/14*TAU+k*0.22;g.fillRect(m+Math.cos(an)*k*c*0.105-1.1,m+Math.sin(an)*k*c*0.105-1.1,2.2,2.2)}g.fillStyle='#7a7d82';g.fillRect(m-6,m-1.4,12,2.8)});
  cell(1,c=>{g.fillStyle='#3b3d41';g.fillRect(5,8,c-10,c-16);g.strokeStyle='#666a6f';g.lineWidth=1.5;g.strokeRect(7,10,c-14,c-20);g.beginPath();g.moveTo(c/2,10);g.lineTo(c/2,c-10);g.stroke();g.fillStyle='#585b60';for(let y=14;y<c-13;y+=5)for(let x=10+((y/5|0)%2?2.5:0);x<c-11;x+=5)g.fillRect(x,y,2,2)});
  cell(2,c=>{g.fillStyle='#4c4e52';g.fillRect(6,13,c-12,c-26);g.fillStyle='#141517';for(let x=10;x<c-11;x+=6)g.fillRect(x,16,3.3,c-32);g.strokeStyle='#73767b';g.lineWidth=1.4;g.strokeRect(6.7,13.7,c-13.4,c-27.4)});
  cell(3,c=>{g.fillStyle='#f1f0ea';g.beginPath();g.moveTo(c/2,4);g.lineTo(c*0.9,c*0.45);g.lineTo(c*0.62,c*0.45);g.lineTo(c*0.62,c-4);g.lineTo(c*0.38,c-4);g.lineTo(c*0.38,c*0.45);g.lineTo(c*0.1,c*0.45);g.closePath();g.fill();
    g.globalCompositeOperation='destination-out';for(let k=0;k<70;k++)g.fillRect(4+rr()*(c-8),4+rr()*(c-8),0.6+rr()*1.6,0.6+rr()*1.6);g.globalCompositeOperation='source-over'});
  cell(4,c=>{g.fillStyle='#3d3f42';g.fillRect(3,3,c-6,c-6);g.strokeStyle='#606368';g.lineWidth=1.4;g.strokeRect(4.2,4.2,c-8.4,c-8.4);g.globalCompositeOperation='destination-out';g.beginPath();g.arc(c/2,c/2,c*0.17,0,TAU);g.fill();
    for(let a=0;a<20;a++){g.save();g.translate(c/2,c/2);g.rotate(a/20*TAU);g.fillRect(c*0.22,-1.1,c*0.2,2.2);g.restore()}g.globalCompositeOperation='source-over'});
  cell(5,c=>{g.strokeStyle='#1c1d1f';g.lineCap='round';g.lineJoin='round';for(let k=0;k<3;k++){g.lineWidth=1+rr()*0.9;let x=8+rr()*(c-16),y=4;g.beginPath();g.moveTo(x,y);while(y<c-6){y+=4+rr()*6;x=clamp(x+(rr()-0.5)*13,5,c-5);g.lineTo(x,Math.min(y,c-4))}g.stroke()}});
  cell(6,c=>{g.fillStyle='#3f4c5f';g.beginPath();g.arc(c/2,c/2,c*0.3,0,TAU);g.fill();g.strokeStyle='#8791a0';g.lineWidth=2;g.beginPath();g.arc(c/2,c/2,c*0.19,0,TAU);g.stroke()});
  cell(7,c=>{g.fillStyle='#1f5fae';g.fillRect(4,4,c-8,c-8);g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=3;g.lineCap='round';g.beginPath();g.arc(c*0.47,c*0.2,3.6,0,TAU);g.fill();g.beginPath();g.moveTo(c*0.47,c*0.3);g.lineTo(c*0.47,c*0.52);g.lineTo(c*0.68,c*0.52);g.lineTo(c*0.76,c*0.76);g.stroke();g.beginPath();g.arc(c*0.45,c*0.62,c*0.17,0.5,TAU-1.1);g.stroke()});
  cell(8,c=>{g.strokeStyle='#efc21d';g.lineWidth=5.5;g.beginPath();g.moveTo(9,c+3);g.lineTo(c-9,c/2);g.lineTo(9,-3);g.stroke()});
  cell(9,c=>{g.fillStyle='#efc21d';g.font='bold 15px Arial';g.textAlign='center';g.textBaseline='middle';g.save();g.translate(c/2,c/2);g.scale(1.15,3.3);g.fillText('TAXI',0,0);g.restore()});
  cell(10,c=>{const cols=['#8d6c2c','#a9863a','#6f5b2b','#b8963f','#7d7a3a','#94592b'];for(let k=0;k<46;k++){g.save();g.translate(5+rr()*(c-10),5+rr()*(c-10));g.rotate(rr()*TAU);g.fillStyle=cols[(rr()*cols.length)|0];g.beginPath();g.ellipse(0,0,1.9+rr()*1.5,1.1+rr()*0.7,0,0,TAU);g.fill();g.restore()}});
  cell(11,c=>{g.fillStyle='#f1f0ea';g.font='bold 15px Arial';g.textAlign='center';g.textBaseline='middle';g.save();g.translate(c/2,c/2);g.scale(1.1,3.3);g.fillText('STOP',0,0);g.restore()});
},{cut:true,spec:.07,shin:26,nrm:'asph',nrmK:.4});

/* ============================== ROADS ============================== */
const ROAD_OFF=[0.06,0.055,0.05,0.045,0.04,0.035,0.17,0.07,0.06,0.07],PAINT_LIFT=0.016,WHITE_P=[0.93,0.93,0.9],YELLOW_P=[0.95,0.74,0.1];
let RIDX=null;const RCELL=16;
/* nearest road station: roadProj(x,z,maxd,filter) → {r, s (m along), t (m to the right of the centre line, + = right of the point order), d, tx, tz (unit tangent)} */
function roadProj(x,z,maxd,filt){if(!RIDX)return null;maxd=maxd||12;const R=Math.ceil((maxd+4)/RCELL),gx=Math.floor(x/RCELL),gz=Math.floor(z/RCELL);let best=null,bd=maxd;
  for(let ix=gx-R;ix<=gx+R;ix++)for(let iz=gz-R;iz<=gz+R;iz++){const a=RIDX.get(ix*4096+iz);if(!a)continue;for(let k=0;k<a.length;k+=2){const r=a[k],i=a[k+1];if(filt&&!filt(r))continue;const f=r.fr,p=f.ps[i],q=f.ps[i+1];const dx=q[0]-p[0],dz=q[1]-p[1],L2=dx*dx+dz*dz||1e-9;
    const u=clamp(((x-p[0])*dx+(z-p[1])*dz)/L2,0,1),qx=p[0]+dx*u,qz=p[1]+dz*u,d=Math.hypot(x-qx,z-qz);if(d<bd){bd=d;const l=Math.sqrt(L2);best={r,i,u,s:f.cs[i]+u*l,t:((x-qx)*-dz+(z-qz)*dx)/l,d,tx:dx/l,tz:dz/l,qx,qz}}}}
  return best}
/* point on a road in road coordinates → [x, y (road surface), z] */
function roadPoint(r,s,t){const f=r.fr,cs=f.cs,n=cs.length;s=clamp(s,0,f.L);let i=0;while(i<n-2&&cs[i+1]<s)i++;const u=(s-cs[i])/((cs[i+1]-cs[i])||1);const x=lerp(f.ps[i][0]+f.N[i][0]*t,f.ps[i+1][0]+f.N[i+1][0]*t,u),z=lerp(f.ps[i][1]+f.N[i][1]*t,f.ps[i+1][1]+f.N[i+1][1]*t,u);
  return[x,terr(x,z)+f.yo,z,Math.atan2(f.ps[i+1][0]-f.ps[i][0],f.ps[i+1][1]-f.ps[i][1])]}
/* rdecal: a rectangle in road coordinates (s0..s1 along, t0..t1 across), cut at the road's own quads so it lies exactly on the road mesh.
   uv = [u at t0, v at s0, u at t1, v at s1] (default: metres/1.2, for the paint tile). cut=true → alpha cut-out builder. */
function rdecal(r,s0,s1,t0,t1,tile,col,lift,uv,cut){const f=r.fr;if(!f)return;if(s0>s1){const q=s0;s0=s1;s1=q}if(t0>t1){const q=t0;t0=t1;t1=q}
  const U=uv||[t0/1.2,s0/1.2,t1/1.2,s1/1.2],S0=s0,S1=s1,T0=t0,T1=t1,hw=r.w/2;s0=Math.max(0,s0);s1=Math.min(f.L,s1);t0=Math.max(-hw,t0);t1=Math.min(hw,t1);if(s1-s0<0.005||t1-t0<0.005)return;
  const cs=f.cs,n=cs.length,ns=f.ns,lat=f.lat,H=f.H,ps=f.ps,N=f.N,rc=RECT[tile],ku=(U[2]-U[0])/(T1-T0),kv=(U[3]-U[1])/(S1-S0);lift=lift===undefined?PAINT_LIFT:lift;let i=0;while(i<n-2&&cs[i+1]<=s0)i++;
  for(;i<n-1&&cs[i]<s1;i++){const sa=Math.max(s0,cs[i]),sb=Math.min(s1,cs[i+1]);if(sb-sa<1e-4)continue;const sl=(cs[i+1]-cs[i])||1,ua=(sa-cs[i])/sl,ub=(sb-cs[i])/sl,p=ps[i],q=ps[i+1],Np=N[i],Nq=N[i+1];
    for(let j=0;j<ns;j++){const ta=Math.max(t0,lat[j]),tb=Math.min(t1,lat[j+1]);if(tb-ta<1e-4)continue;const tl=lat[j+1]-lat[j],va=(ta-lat[j])/tl,vb=(tb-lat[j])/tl,k=i*(ns+1)+j,hA=H[k],hB=H[k+ns+1],hC=H[k+ns+2],hD=H[k+1];
      const P=(u,v,s,t)=>{const x0=p[0]+Np[0]*t,z0=p[1]+Np[1]*t;return[[x0+(q[0]+Nq[0]*t-x0)*u,(v<=u?hA+u*(hB-hA)+v*(hC-hB):hA+u*(hC-hD)+v*(hD-hA))+lift,z0+(q[1]+Nq[1]*t-z0)*u],[U[0]+(t-T0)*ku,U[1]+(s-S0)*kv]]};
      const A=P(ua,va,sa,ta),B=P(ub,va,sb,ta),C=P(ub,vb,sb,tb),D=P(ua,vb,sa,tb);const ch=chunkAt(A[0][0],A[0][2]),b=cut?ch.cut:ch.o;b.tri(A[0],C[0],B[0],A[1],C[1],B[1],col,rc,0,true);b.tri(A[0],D[0],C[0],A[1],D[1],C[1],col,rc,0,true)}}}
const rline=(r,sA,sB,tC,wid,col)=>rdecal(r,sA,sB,tC-wid/2,tC+wid/2,T.paint,col||WHITE_P);
const rxline=(r,sC,tA,tB,wid,col)=>rdecal(r,sC-wid/2,sC+wid/2,tA,tB,T.paint,col||WHITE_P);
const jclear=(r,s,d)=>{for(const j of r.jn)if(Math.abs(s-j.s)<d+j.hw)return false;return true};
const xclear=(r,s,d)=>{if(r.xs)for(const x of r.xs)if(Math.abs(s-x)<d)return false;return true};
/* a free quad on the ground (sidewalk level when on a sidewalk): centre, yaw (facing sin,cos), length along yaw, width, lift above groundY */
function gdecal(cx,cz,yaw,len,wid,tile,col,lift,uv,cut){const fx=Math.sin(yaw)*len/2,fz=Math.cos(yaw)*len/2,rx=Math.cos(yaw)*wid/2,rz=-Math.sin(yaw)*wid/2;const U=uv||[0,0,1,1];const ch=chunkAt(cx,cz),b=cut?ch.cut:ch.o;
  const Pn=(a,c)=>{const x=cx+fx*a+rx*c,z=cz+fz*a+rz*c;return[x,groundY(x,z)+lift,z]};const A=Pn(-1,-1),B=Pn(1,-1),C=Pn(1,1),D=Pn(-1,1);
  b.hq(A,B,C,D,[U[0],U[1]],[U[0],U[3]],[U[2],U[3]],[U[2],U[1]],col||C1,RECT[tile],0)}

function roadTopology(){const VH=new Map(),key=p=>Math.round(p[0]*10)+','+Math.round(p[1]*10);
  ROADS.forEach((r,ri)=>{r.i=ri;r.jn=[];if(r.ty>5)return;r.ps.forEach((p,vi)=>{const k=key(p);let a=VH.get(k);if(!a)VH.set(k,a=[]);a.push(ri,vi)})});
  for(const r of ROADS){if(r.ty>5)continue;r.ps.forEach((p,vi)=>{const a=VH.get(key(p));let deg=0,ohw=0;for(let k=0;k<a.length;k+=2){const q=ROADS[a[k]],qv=a[k+1];deg+=(qv===0||qv===q.ps.length-1)?1:2;if(q!==r)ohw=Math.max(ohw,q.w/2)}
    if(deg>=3)r.jn.push({s:r.cum[vi],hw:ohw||r.w/2})})}}

/* block-paved carriageways seen in the research photos (streets.json styles.paving): Kolokotroni red-brown concrete blocks (r17/r18), Levidou pale grey blocks flush with the walkways (r19) */
const CARRIAGEWAY={'Κολοκοτρώνη':{col:'#c29a88'},'Λεβίδου':{col:'#e2ddd6'}};
function buildRoads(){if(STREETS_JSON&&!STREETS_JSON._applied){loadStreetSpecs(STREETS_JSON);STREETS_JSON._applied=1}roadTopology();RIDX=new Map();
  const SURF_T=[TM.asph,TM.pavers,TM.brick,TM.slabs,TM.gravel];
  for(const r of ROADS){if(r.side<0&&r.ty===7)continue;if(r.ty===9&&buildStairs(r))continue;const w=r.w,hw=w/2;const ps=resample(r.ps,3.5);if(ps.length<2)continue;
    const cw=CARRIAGEWAY[r.name];if(cw&&r.ty<=5){r.surf=1;r.cwCol=hexc(cw.col)}
    let tile=r.ty<=5?SURF_T[r.surf]:(r.ty===8?TM.gravel:(r.surf===4?TM.parkG:(r.ty===6?(r.surf===1?TM.pavers:TM.marble):TM.slabs)));
    if(r.ty>=3&&r.ty<=5&&r.surf===0&&hf(r.name.length*31+(r.name.charCodeAt(1)||7))<0.4)tile=TM.asphP;// some side streets have older, lighter asphalt
    const yo=ROAD_OFF[r.ty]+(r.surf===1?0.004:0),col=r.cwCol||C1,n=ps.length,cs=cumlen(ps),N=[];
    for(let i=0;i<n;i++){const a=ps[Math.max(0,i-1)],b=ps[Math.min(n-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;N.push([-dz/l,dx/l])}
    const ns=r.ty<=6?Math.max(1,Math.ceil(w/3.6)):1,lat=[];for(let j=0;j<=ns;j++)lat.push(-hw+w*j/ns);const H=new Float32Array(n*(ns+1)),X=new Float32Array(n*(ns+1)),Z=new Float32Array(n*(ns+1));
    for(let i=0;i<n;i++)for(let j=0;j<=ns;j++){const k=i*(ns+1)+j,x=ps[i][0]+N[i][0]*lat[j],z=ps[i][1]+N[i][1]*lat[j];X[k]=x;Z[k]=z;H[k]=terr(x,z)+yo}
    r.fr={ps,cs,N,lat,ns,H,yo,L:cs[n-1]};const rc=RECT[tile];
    for(let i=0;i<n-1;i++){const ch=chunkAt(ps[i][0],ps[i][1]).o;if(r.ty<=6){const a=RIDX.get(Math.floor((ps[i][0]+ps[i+1][0])/2/RCELL)*4096+Math.floor((ps[i][1]+ps[i+1][1])/2/RCELL)),e=a||[];if(!a)RIDX.set(Math.floor((ps[i][0]+ps[i+1][0])/2/RCELL)*4096+Math.floor((ps[i][1]+ps[i+1][1])/2/RCELL),e);e.push(r,i)}
      for(let j=0;j<ns;j++){const a=i*(ns+1)+j,b=a+ns+1,c=b+1,d=a+1;const A=[X[a],H[a],Z[a]],B=[X[b],H[b],Z[b]],C=[X[c],H[c],Z[c]],D=[X[d],H[d],Z[d]];
        ch.tri(A,C,B,[A[0],A[2]],[C[0],C[2]],[B[0],B[2]],col,rc,0);ch.tri(A,D,C,[A[0],A[2]],[D[0],D[2]],[C[0],C[2]],col,rc,0)}}
    // round joints at the ends (fill junction wedges)
    if(r.ty<=6)for(const p of [ps[0],ps[n-1]]){const ch=chunkAt(p[0],p[1]).o;const seg=12;for(let k=0;k<seg;k++){const a0=k/seg*TAU,a1=(k+1)/seg*TAU;const A=[p[0]+Math.cos(a0)*hw,p[1]+Math.sin(a0)*hw],B=[p[0]+Math.cos(a1)*hw,p[1]+Math.sin(a1)*hw];const Y=q=>terr(q[0],q[1])+yo-0.002;
      ch.tri([p[0],Y(p),p[1]],[B[0],Y(B),B[1]],[A[0],Y(A),A[1]],[p[0],p[1]],[B[0],B[1]],[A[0],A[1]],col,rc,0,true)}}}
  if(MAP.fillets)for(const f of MAP.fillets){const ring=unp(f);if(ring.length<3)continue;if(polyArea(ring)<0)ring.reverse();groundPoly([ring],0.043,TM.asph,1,C1,4)}
  markRoads();
  // sidewalks (real shapes, rounded corners) raised 16 cm; one material per street
  MAP.sidewalks.forEach((sw,i)=>{const rings=sw.map(r=>unp(r));if(!rings[0]||rings[0].length<3)return;let cx=0,cz=0;for(const p of rings[0]){cx+=p[0];cz+=p[1]}cx/=rings[0].length;cz/=rings[0].length;
    groundPoly(rings,0.16,TM[sidewalkMat(cx,cz)],1,C1,6)});
  // curbs: vertical face toward the road + stone top
  for(const cl of MAP.curbs){const ps=resample(unp(cl),3);for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l<0.05)continue;const nx=-dz/l,nz=dx/l;const ch=chunkAt(a[0],a[1]).o;const ya=terr(a[0],a[1]),yb=terr(b[0],b[1]);
    ch.wall(a[0],a[1],b[0],b[1],ya+0.02,yb+0.02,ya+0.165,yb+0.165,nx,nz,0,l/1.5,0,0.12,C1,RECT[T.curb],0);
    const ax=a[0]-nx*0.16,az=a[1]-nz*0.16,bx=b[0]-nx*0.16,bz=b[1]-nz*0.16;ch.hq([a[0],ya+0.167,a[1]],[b[0],yb+0.167,b[1]],[bx,yb+0.167,bz],[ax,ya+0.167,az],[0,0],[l/1.5,0],[l/1.5,0.12],[0,0.12],C1,RECT[T.curb],0)}}
  curbDrains();treePits()}
/* sidewalk material of the street nearest to a point (see STREETS / loadStreetSpecs) */
function sidewalkMat(x,z){const q=roadProj(x,z,45,r=>r.ty<=6&&r.name);if(!q)return'slabs';const sp=streetSpec(q.r.name);if(sp.sidewalk&&TM[sp.sidewalk])return sp.sidewalk;return sp.core&&Math.hypot(x-20,z-30)<420?'pavers':'slabs'}

/* ---------- road markings and asphalt detail, all in road coordinates ---------- */
function markRoads(){const car=r=>r.ty<=5&&r.fr;
  // 1. project the mapped crossings, signals and stop signs onto their roads
  const XING=[];for(const c of MAP.props.crossing){const x=c[0]/10,z=c[1]/10;const q=roadProj(x,z,8,car);if(!q){placed('crossing',x,z,'','no road');continue}const r=q.r,len=r.ty<=1?4:3;let s=q.s;
    for(const j of r.jn)if(Math.abs(s-j.s)<j.hw+0.8+len/2)s=j.s+(j.s<r.fr.L/2?1:-1)*(j.hw+1.0+len/2);// a crossing mapped on the junction node itself belongs across the arm, clear of the other street
    if(s<len/2||s>r.fr.L-len/2)s=clamp(q.s,len/2,r.fr.L-len/2);(r.xs=r.xs||[]).push(s);XING.push({r,s,len,x,z})}
  // 2. lane lines
  for(const r of ROADS){if(!car(r)||r.ty>2)continue;const L=r.fr.L,hw=r.w/2;const dash=(t,on,off)=>{for(let s=1.5;s+on<L;s+=on+off)if(jclear(r,s+on/2,5)&&xclear(r,s+on/2,5))rline(r,s,s+on,t,0.12)};
    const solid=(t,wid,col)=>{let a=null;for(let s=0;s<=L+0.01;s+=2){const ok=s<L&&jclear(r,s,2.5)&&xclear(r,s,2.6);if(ok&&a===null)a=s;if(!ok&&a!==null){if(s-a>3)rline(r,a,Math.min(L,s-2),t,wid,col);a=null}}if(a!==null&&L-a>3)rline(r,a,L,t,wid,col)};
    if(r.ty<=1){if(r.ow){const nl=Math.max(2,Math.round(r.w/3.25));for(let k=1;k<nl;k++)dash(-hw+r.w*k/nl,3,6)}else{solid(-0.14,0.12);solid(0.14,0.12);const nl=Math.max(1,Math.round(hw/3.25));for(let k=1;k<nl;k++){dash(hw*k/nl,3,6);dash(-hw*k/nl,3,6)}}
      solid(hw-0.32,0.12);solid(-hw+0.32,0.12)}
    else if(!r.ow&&r.w>=6.5)dash(0,3,6)}
  // 3. parking bays where the map parks cars (white boxes, 5.6 × 2.15 m)
  const pk=new Map();for(const p of MAP.parked){const q=roadProj(p[0]/10,p[1]/10,6,r=>car(r)&&r.ty>=2&&r.ty<=4);if(!q||Math.abs(q.t)<0.8)continue;const sd=q.t>=0?1:-1,k=q.r.i*2+(sd>0?1:0);let a=pk.get(k);if(!a)pk.set(k,a={r:q.r,sd,s:[]});a.s.push(q.s)}
  for(const a of pk.values()){const r=a.r,hw=r.w/2,sd=a.sd,L=r.fr.L;a.s.sort((x,y)=>x-y);const bays=[];const ok=s=>s>3.2&&s<L-3.2&&jclear(r,s,3.6)&&xclear(r,s,5.6);let prev=null;
    for(const s of a.s){if(prev!==null){const k=Math.round((s-prev)/5.6);if(k>=2&&Math.abs((s-prev)-k*5.6)<1.3)for(let m=1;m<k;m++)bays.push(prev+(s-prev)*m/k)}bays.push(s);prev=s}
    for(let s=a.s[0]-5.6;ok(s);s-=5.6)bays.push(s);for(let s=a.s[a.s.length-1]+5.6;ok(s);s+=5.6)bays.push(s);
    (r.park=r.park||{})[sd]=1;const tI=sd*(hw-2.15),tO=sd*(hw-0.1),ticks=new Set();
    for(const s of bays){rline(r,s-2.8,s+2.8,tI,0.1);for(const e of[s-2.8,s+2.8]){const k=Math.round(e*2);if(ticks.has(k))continue;ticks.add(k);rxline(r,e,Math.min(tI,tO),Math.max(tI,tO),0.1)}}}
  // 4. one-way arrows after junctions
  for(const r of ROADS){if(!car(r)||!r.ow||r.ty>3||r.fr.L<38)continue;if(r.ty===3&&hf(r.i*77+5)>0.4)continue;const hw=r.w/2;let t=0;if(r.park){if(r.park[1]&&!r.park[-1])t=-1.07;else if(r.park[-1]&&!r.park[1])t=1.07}
    const lanes=r.ty<=1?Math.max(2,Math.round(r.w/3.25)):1;for(let k=0;k<lanes;k++){const tc=lanes>1?-hw+r.w*(k+0.5)/lanes:t;for(let s=Math.min(16,r.fr.L*0.3);s<r.fr.L-14;s+=120)if(xclear(r,s+2.2,5))rdecal(r,s,s+4.4,tc-0.62,tc+0.62,T.sdecal,WHITE_P,PAINT_LIFT,sdCell(SDC.arrow),true)}}
  // 5. zebra crossings at their mapped positions (0.5 m stripes, 0.5 m gaps) + tactile paving on both sidewalks
  for(const c of XING){const r=c.r,hw=r.w/2,n=Math.max(2,Math.floor((r.w-0.5)/1.0));for(let i=0;i<n;i++){const t=(i-(n-1)/2)*1.0;rdecal(r,c.s-c.len/2,c.s+c.len/2,t-0.25,t+0.25,T.paint,WHITE_P)}
    for(const sd of[-1,1]){const p=roadPoint(r,c.s,sd*(hw+0.75));if(lvl(p[0],p[2])>0.1&&lvl(p[0],p[2])<0.3)gdecal(p[0],p[2],p[3],Math.min(c.len,2.4),0.8,TM.tactile,C1,0.012,[0,0,0.8,Math.min(c.len,2.4)])}
    placed('crossing',c.x,c.z,r.name,'map.props.crossing')}
  // 6. stop lines: at stop signs (approach half) and at traffic signals
  const stopLine=(r,s,dir)=>{const hw=r.w/2,pl=r.park&&r.park[1]?2.2:0.15,pm=r.park&&r.park[-1]?2.2:0.15;if(s<0.6||s>r.fr.L-0.6)return;if(r.ow)rxline(r,s,-hw+pm,hw-pl,0.4);else if(dir>0)rxline(r,s,0.1,hw-pl,0.4);else rxline(r,s,-hw+pm,-0.1,0.4)};
  for(const st of MAP.props.stop){const q=roadProj(st[0]/10,st[1]/10,8,car);if(!q)continue;const r=q.r;let js=null;for(const j of r.jn)if(js===null||Math.abs(j.s-q.s)<Math.abs(js.s-q.s))js=j;const dir=js?(js.s>=q.s?1:-1):(q.s>r.fr.L/2?1:-1);
    let s=q.s;if(js&&Math.abs(js.s-s)<js.hw+1)s=js.s-dir*(js.hw+1.2);stopLine(r,s,r.ow?1:dir);st.rs=[r.i,s,dir]}
  for(const sg of MAP.props.signal){const x=sg[0]/10,z=sg[1]/10;const seen=new Set();for(let k=0;k<4;k++){const q=roadProj(x,z,3.5,r=>car(r)&&!seen.has(r.i));if(!q)break;seen.add(q.r.i);const r=q.r;let off=4.5;for(const j of r.jn)if(Math.abs(j.s-q.s)<1.5)off=j.hw+2.2;
      for(const c of XING)if(c.r===r&&Math.abs(c.s-q.s)<off+c.len)off=Math.max(off,Math.abs(c.s-q.s)+c.len/2+1.2);
      if(q.s-off>1)stopLine(r,q.s-off,1);if(!r.ow&&q.s+off<r.fr.L-1)stopLine(r,q.s+off,-1)}}
  // 7. yellow zigzag at bus stops
  for(const b of MAP.props.bus){const q=roadProj(b[0]/10,b[1]/10,14,r=>car(r)&&r.ty<=4);if(!q)continue;const r=q.r,sd=q.t>=0?1:-1,hw=r.w/2,c=sdCell(SDC.zig);for(let k=-4;k<4;k++){const s=q.s+k*2;if(s<1||s+2>r.fr.L-1||!jclear(r,s+1,1))continue;rdecal(r,s,s+2,sd>0?hw-1.25:-hw+0.2,sd>0?hw-0.2:-hw+1.25,T.sdecal,YELLOW_P,PAINT_LIFT,c,true)}
    b.rs=[r.i,q.s,sd]}
  // 8. asphalt life: patches, trench scars, crack seal, manholes, valve covers
  for(const r of ROADS){if(!car(r)||r.surf!==0)continue;const f=r.fr,L=f.L,hw=r.w/2,mid=f.ps[f.ps.length>>1];if(!inPlay(mid[0],mid[1])&&!r.focus)continue;let h=r.i*131+7;const rn=()=>hf(h++);
    for(let k=0,n=Math.round(L/38+rn());k<n;k++){const s=rn()*L,len=1.6+rn()*4.5,wd=1+rn()*1.8,t=(rn()*2-1)*(hw-wd/2-0.2),g=0.72+rn()*0.3;rdecal(r,s,s+len,t-wd/2,t+wd/2,rn()<0.5?TM.asph2:TM.asphP,[g,g,g*1.01],0.006,[t-wd/2,s,t+wd/2,s+len])}
    for(let k=0,n=Math.round(L/70+rn()*0.8);k<n;k++){const s=rn()*L,len=8+rn()*24,wd=0.55+rn()*0.4,t=(rn()*2-1)*(hw-0.9),g=0.66+rn()*0.2;rdecal(r,s,s+len,t-wd/2,t+wd/2,TM.asph2,[g,g,g],0.008,[t-wd/2,s,t+wd/2,s+len])}
    for(let k=0,n=Math.round(L/45+rn());k<n;k++){const s=rn()*L,t=(rn()*2-1)*(hw-1.2),sz=1.6+rn()*1.6;rdecal(r,s,s+sz,t-sz/2,t+sz/2,T.sdecal,[0.5,0.5,0.5],0.011,sdCell(SDC.crack),true)}
    for(let s=6+rn()*30;s<L-2;s+=28+rn()*30){const t=(rn()*2-1)*Math.max(0.3,hw-1.4),sq=rn()<0.25,d=sq?0.7:0.66;rdecal(r,s,s+d,t-d/2,t+d/2,T.sdecal,sq?[0.8,0.8,0.82]:[0.86,0.84,0.8],0.012,sdCell(sq?SDC.cover:SDC.manhole),true)
      if(rn()<0.4){const t2=clamp(t+(rn()<0.5?1.3:-1.3),-hw+0.4,hw-0.4);rdecal(r,s+1.2,s+1.5,t2-0.15,t2+0.15,T.sdecal,[0.8,0.85,0.95],0.012,sdCell(SDC.valve),true)}}}}
/* drain grates in the gutter, every ~30 m along the mapped curb lines */
function curbDrains(){let h=991;for(const cl of MAP.curbs){const ps=unp(cl),cum=cumlen(ps),L=cum[cum.length-1];for(let s=9+hf(h++)*14;s<L-4;s+=26+hf(h++)*12){const p=atLen(ps,cum,s),q=atLen(ps,cum,s+0.5);const dx=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dx,dz)||1;
    for(const sd of[1,-1]){const x=p[0]-dz/l*0.3*sd,z=p[1]+dx/l*0.3*sd;if(lvl(x,z)>0.05)continue;const pr=roadProj(x,z,3,r=>r.ty<=5&&r.fr);if(!pr||!inPlay(x,z))break;const r=pr.r,t=clamp(pr.t,-r.w/2+0.3,r.w/2-0.3);rdecal(r,pr.s-0.3,pr.s+0.3,t-0.23,t+0.23,T.sdecal,[0.85,0.85,0.85],0.012,sdCell(SDC.drain),true);break}}}}
/* tree pits: a square of soil with a stone frame at every street tree; cast-iron grates on the shopping streets */
function treePits(){for(const t of MAP.street_trees.concat(MAP.props.tree.map(p=>[p[0],p[1],'plane']))){const x=t[0]/10,z=t[1]/10;const l=lvl(x,z);if(l<0.1||l>0.3||!inPlay(x,z))continue;const q=roadProj(x,z,14,r=>r.ty<=6&&r.fr);const yaw=q?Math.atan2(q.tx,q.tz):0,core=q&&streetSpec(q.r.name).core&&q.r.focus;
    const sz=t[2]==='orange'?0.95:1.25;gdecal(x,z,yaw,sz,sz,TM.soil,[0.78,0.72,0.64],0.006,[x,z,x+sz,z+sz]);
    for(const [a,b,ln,wd] of[[1,0,0.08,sz],[-1,0,0.08,sz],[0,1,sz,0.08],[0,-1,sz,0.08]]){const ox=(Math.sin(yaw)*a+Math.cos(yaw)*b)*(sz/2),oz=(Math.cos(yaw)*a-Math.sin(yaw)*b)*(sz/2);gdecal(x+ox,z+oz,yaw,ln,wd,T.curb,C1,0.012,[0,0,(a?wd:ln)/1.5,0.06])}
    if(core)gdecal(x,z,yaw,sz-0.1,sz-0.1,T.sdecal,[0.9,0.9,0.9],0.02,sdCell(SDC.grate),true)}}
/* stairs (highway=steps): real treads and risers that follow the slope, low stone cheek walls and a handrail */
function buildStairs(r){const ps=resample(r.ps,0.5),cs=cumlen(ps),L=cs[cs.length-1];if(L<1.5)return false;const h0=terr(ps[0][0],ps[0][1]),h1=terr(ps[ps.length-1][0],ps[ps.length-1][1]),dh=h1-h0;if(Math.abs(dh)/L<0.06)return false;
  const n=Math.max(2,Math.round(Math.abs(dh)/0.155)),run=L/n,hw=r.w/2,up=dh>0?1:-1,stone=hexc('#d8d2c6');let yPrev=null;
  for(let k=0;k<n;k++){const a=atLen(ps,cs,k*run),b=atLen(ps,cs,(k+1)*run);const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l,nx=-uz,nz=ux;const y=terr((a[0]+b[0])/2,(a[1]+b[1])/2)+0.03;const ch=chunkAt(a[0],a[1]).o;
    const aL=[a[0]+nx*hw,a[1]+nz*hw],aR=[a[0]-nx*hw,a[1]-nz*hw],bL=[b[0]+nx*hw,b[1]+nz*hw],bR=[b[0]-nx*hw,b[1]-nz*hw];
    ch.hq([aL[0],y,aL[1]],[bL[0],y,bL[1]],[bR[0],y,bR[1]],[aR[0],y,aR[1]],[0,0],[run,0],[run,r.w],[0,r.w],C1,RECT[TM.slabs],0);
    if(yPrev!==null){const e=up>0?[aL,aR]:[aL,aR];ch.wall(e[0][0],e[0][1],e[1][0],e[1][1],Math.min(y,yPrev)-0.02,Math.min(y,yPrev)-0.02,Math.max(y,yPrev),Math.max(y,yPrev),-ux*up,-uz*up,0,r.w,0,0.16,stone,RECT[TM.marble],0)}
    else ch.wall(aL[0],aL[1],aR[0],aR[1],y-0.4,y-0.4,y,y,-ux,-uz,0,r.w,0,0.4,stone,RECT[TM.marble],0);
    // cheek walls on both sides, stepping with the treads
    for(const e of[[aL,bL,nx,nz],[aR,bR,-nx,-nz]]){const A=e[0],B=e[1],ox=e[2]*0.22,oz=e[3]*0.22,yt=y+0.42;ch.wall(A[0],A[1],B[0],B[1],y-0.5,y-0.5,yt,yt,-e[2],-e[3],0,run,0,0.9,stone,RECT[TM.rubble],0);ch.wall(A[0]+ox,A[1]+oz,B[0]+ox,B[1]+oz,y-0.5,y-0.5,yt,yt,e[2],e[3],0,run,0,0.9,stone,RECT[TM.rubble],0);
      ch.hq([A[0],yt,A[1]],[B[0],yt,B[1]],[B[0]+ox,yt,B[1]+oz],[A[0]+ox,yt,A[1]+oz],[0,0],[run,0],[run,0.22],[0,0.22],hexc('#e6e2d8'),RECT[TM.marble],0)}
    chunkAt(a[0],a[1]).cut.wall(aL[0]+nx*0.11,aL[1]+nz*0.11,bL[0]+nx*0.11,bL[1]+nz*0.11,y+0.42,y+0.42,y+0.95,y+0.95,0,0,0,run/1.1,0.35,1,hexc('#2b2f33'),RECT[T.rail],0);yPrev=y}
  r.stairs={n,run};return true}
function decal(p0,p1,w,yo,tile){const dx=p1[0]-p0[0],dz=p1[1]-p0[1],l=Math.hypot(dx,dz)||1,nx=-dz/l*w/2,nz=dx/l*w/2;const ch=chunkAt(p0[0],p0[1]).o;const Y=(x,z)=>terr(x,z)+yo;
  const a=[p0[0]+nx,p0[1]+nz],b=[p1[0]+nx,p1[1]+nz],c=[p1[0]-nx,p1[1]-nz],d=[p0[0]-nx,p0[1]-nz];ch.hq([d[0],Y(d[0],d[1]),d[1]],[c[0],Y(c[0],c[1]),c[1]],[b[0],Y(b[0],b[1]),b[1]],[a[0],Y(a[0],a[1]),a[1]],[0,0],[1,0],[1,1],[0,1],[0.95,0.95,0.93],RECT[tile],0)}
function resample(ps,step){const o=[ps[0]];for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i];const l=Math.hypot(b[0]-a[0],b[1]-a[1]);const n=Math.max(1,Math.ceil(l/step));for(let k=1;k<=n;k++)o.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n])}return o}
function cumlen(ps){const c=[0];for(let i=1;i<ps.length;i++)c.push(c[i-1]+Math.hypot(ps[i][0]-ps[i-1][0],ps[i][1]-ps[i-1][1]));return c}
function atLen(ps,cum,s){s=clamp(s,0,cum[cum.length-1]);let i=1;while(i<cum.length-1&&cum[i]<s)i++;const t=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return[lerp(ps[i-1][0],ps[i][0],t),lerp(ps[i-1][1],ps[i][1],t),Math.atan2(ps[i][0]-ps[i-1][0],ps[i][1]-ps[i-1][1])]}

function buildAreas(){const K={park:[T.grass,0.03,4,[0.95,1,0.9]],garden:[T.grass,0.03,4,C1],grass:[T.grass,0.03,4,[1,1,0.95]],wood:[T.soil,0.025,5,[0.9,0.95,0.85]],scrub:[T.dryG,0.025,5,C1],
  parking:[T.asph2,0.05,5,C1],pool:[T.pool,0.32,3,C1],water:[T.water,0.12,6,C1],school:[T.concrete,0.035,4,[0.95,0.95,0.95]],sport:[T.concrete,0.04,4,C1],plaza:[T.marble,0.165,2.5,C1],rail:[T.ballast,0.03,3,C1]};
  for(const a of MAP.areas){const k=K[a[0]];if(!k)continue;const rings=a[1].map(r=>unp(r));if(rings[0].length<3)continue;groundPoly(rings,k[1],k[0],k[2],k[3],7,0);
    if(a[0]==='pool'){const ps=rings[0];for(let i=0;i<ps.length;i++){const p=ps[i],q=ps[(i+1)%ps.length];const ch=chunkAt(p[0],p[1]).o;const y=terr(p[0],p[1]);ch.wall(p[0],p[1],q[0],q[1],y,y,y+0.34,y+0.34,0,0,0,1,0,0.2,C1,RECT[T.white],0)}}
    if(a[0]==='park'||a[0]==='garden'||a[0]==='wood')PARK[a[0]]=(PARK[a[0]]||0)+1}
  // pitches with lines (ISA court lives here)
  for(const p of MAP.pitches){const [x,z,L,W,ang,sport]=p;const ca=Math.cos(ang),sa=Math.sin(ang);const corner=(u,v)=>[x+ca*u-sa*v,z+sa*u+ca*v];const ring=[corner(-L/2,-W/2),corner(L/2,-W/2),corner(L/2,W/2),corner(-L/2,W/2)];
    const col=sport==='tennis'?hexc('#3f7f5c'):sport==='soccer'?hexc('#4f8a3c'):hexc('#2f6f9f');groundPoly([ring],0.06,T.white,4,col,6,0);const y=0.075;
    const line=(u0,v0,u1,v1)=>decal(corner(u0,v0),corner(u1,v1),0.08,y,T.paint);line(-L/2,-W/2,L/2,-W/2);line(-L/2,W/2,L/2,W/2);line(-L/2,-W/2,-L/2,W/2);line(L/2,-W/2,L/2,W/2);line(0,-W/2,0,W/2);
    if(sport==='basketball'||sport==='multi'){for(const sd of[-1,1]){const hx=x+ca*(L/2-1.6)*sd,hz=z+sa*(L/2-1.6)*sd;const px=x+ca*(L/2-0.35)*sd,pz=z+sa*(L/2-0.35)*sd;const ch=chunkAt(px,pz).o;const gy=terr(px,pz);
      ch.cyl(px,gy,pz,0.09,0.09,3.3,8,hexc('#3a3d42'),RECT[T.metal],true);ch.box(x+ca*(L/2-0.55)*sd,gy+3.45,z+sa*(L/2-0.55)*sd,0.08,1.05,1.8,-ang,C1,RECT[T.white]);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(0.23,0.022,6,18),new THREE.MeshLambertMaterial({color:0xff5a1f}));rim.rotation.x=Math.PI/2;rim.position.set(hx,gy+3.05,hz);scene.add(rim);HOOPS.push({x:hx,z:hz,y:gy+3.05,isa:ISA.poly&&pip(ISA.poly,hx,hz)})}}}}

