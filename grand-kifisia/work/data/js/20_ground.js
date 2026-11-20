'use strict';
/* Grand Kifisia — world state, terrain, level grid, roads, sidewalks, areas, pitches */
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

function buildRoads(){
  const SURF_T=[T.asph,T.pavers,T.brick,T.slabs,T.gravel],OFF=[0.06,0.055,0.05,0.045,0.04,0.035,0.17,0.07,0.06,0.07];
  for(const r of ROADS){if(r.side<0&&r.ty===7)continue;const w=r.w,hw=w/2;const ps=resample(r.ps,3.5);if(ps.length<2)continue;
    const tile=r.ty<=5?SURF_T[r.surf]:(r.ty===8?T.gravel:(r.surf===4?T.parkG:(r.ty===6?(r.surf===1?T.pavers:T.marble):T.slabs)));const yo=OFF[r.ty]+(r.surf===1?0.004:0);const sc=r.ty<=5&&r.surf===0?6:2.5;const col=C1;
    const L=[],Rr=[];for(let i=0;i<ps.length;i++){const a=ps[Math.max(0,i-1)],b=ps[Math.min(ps.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;L.push([ps[i][0]-dz*hw,ps[i][1]+dx*hw]);Rr.push([ps[i][0]+dz*hw,ps[i][1]-dx*hw])}
    for(let i=0;i<ps.length-1;i++){const ch=chunkAt(ps[i][0],ps[i][1]).o;const Y=p=>terr(p[0],p[1])+yo;const a=L[i],b=L[i+1],c=Rr[i+1],d=Rr[i];
      ch.hq([d[0],Y(d),d[1]],[c[0],Y(c),c[1]],[b[0],Y(b),b[1]],[a[0],Y(a),a[1]],[d[0]/sc,d[1]/sc],[c[0]/sc,c[1]/sc],[b[0]/sc,b[1]/sc],[a[0]/sc,a[1]/sc],col,RECT[tile],0)}
    // round joints at the ends (fill junction wedges)
    if(r.ty<=6)for(const p of [ps[0],ps[ps.length-1]]){const ch=chunkAt(p[0],p[1]).o;const seg=10;for(let k=0;k<seg;k++){const a0=k/seg*TAU,a1=(k+1)/seg*TAU;const A=[p[0]+Math.cos(a0)*hw,p[1]+Math.sin(a0)*hw],B=[p[0]+Math.cos(a1)*hw,p[1]+Math.sin(a1)*hw];const Y=q=>terr(q[0],q[1])+yo-0.002;
      ch.tri([p[0],Y(p),p[1]],[B[0],Y(B),B[1]],[A[0],Y(A),A[1]],[p[0]/sc,p[1]/sc],[B[0]/sc,B[1]/sc],[A[0]/sc,A[1]/sc],col,RECT[tile],0,true)}}
    // centre line on two-way main roads, away from junctions
    if(r.ty<=2&&!r.ow&&w>=7){const cum=cumlen(ps),Lt=cum[cum.length-1];for(let s=12;s<Lt-12;s+=8.5){const p0=atLen(ps,cum,s),p1=atLen(ps,cum,s+3.2);decal(p0,p1,0.13,0.075,T.paint)}}}
  // zebra crossings at their real OSM positions
  for(const c of MAP.props.crossing){const x=c[0]/10,z=c[1]/10,ang=c[2],w=c[3];const dx=Math.cos(ang),dz=Math.sin(ang);const n=Math.max(2,Math.floor((w-0.6)/1.0));for(let i=0;i<n;i++){const o=(i-(n-1)/2)*1.0;const cx=x-dz*o,cz=z+dx*o;decal([cx-dx*1.6,cz-dz*1.6],[cx+dx*1.6,cz+dz*1.6],0.5,0.08,T.paint)}}
  // stop lines at signals
  for(const s of MAP.props.signal){const x=s[0]/10,z=s[1]/10,ang=s[2],w=s[3];const dx=Math.cos(ang),dz=Math.sin(ang);for(const sd of[-1,1]){const cx=x+dx*sd*4.5,cz=z+dz*sd*4.5;decal([cx-dz*w*0.45,cz+dx*w*0.45],[cx+dz*w*0.45,cz-dx*w*0.45],0.35,0.08,T.paint)}}
  // sidewalks (real shapes, rounded corners) raised 16 cm
  MAP.sidewalks.forEach((sw,i)=>{const rings=sw.map(r=>unp(r));if(!rings[0]||rings[0].length<3)return;const c=rings[0][0];const ctr=Math.hypot(c[0]+40,c[1]-20)<300||(c[0]>180&&c[0]<420&&c[1]>-60&&c[1]<120);
    const tile=ctr?(hf(i*13)<0.6?T.brick:T.pavers):(hf(i*13)<0.7?T.slabs:T.pavers);groundPoly(rings,0.16,tile,tile===T.slabs?3:2,C1,6)});
  // curbs: vertical face toward the road + marble top
  for(const cl of MAP.curbs){const ps=resample(unp(cl),3);for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l<0.05)continue;const nx=-dz/l,nz=dx/l;const ch=chunkAt(a[0],a[1]).o;const ya=terr(a[0],a[1]),yb=terr(b[0],b[1]);
    ch.wall(a[0],a[1],b[0],b[1],ya+0.03,yb+0.03,ya+0.165,yb+0.165,nx,nz,0,l/1.5,0,0.12,C1,RECT[T.curb],0);
    const ax=a[0]-nx*0.16,az=a[1]-nz*0.16,bx=b[0]-nx*0.16,bz=b[1]-nz*0.16;ch.hq([a[0],ya+0.167,a[1]],[b[0],yb+0.167,b[1]],[bx,yb+0.167,bz],[ax,ya+0.167,az],[0,0],[l/1.5,0],[l/1.5,0.12],[0,0.12],C1,RECT[T.curb],0)}}}
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

