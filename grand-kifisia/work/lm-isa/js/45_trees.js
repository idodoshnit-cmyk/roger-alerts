'use strict';
/* Grand Kifisia — trees (agent: streets; see docs/STREETS_IMPL.md)
   Every tree of the map (MAP.street_trees, MAP.props.tree, MAP.garden_trees) is drawn at its real position by species, at real size:
   - plane   (Platanus, the avenues, Kassaveti, Platanos square): pale mottled trunk splitting at ~3.5 m into 3–4 limbs, open crown, 13–17 m (×0.9–1.3)
   - orange  (bitter orange, Citrus aurantium, pruned round on the pavements): 1.5 m trunk, dense ball crown with fruit, 3.5–4 m
   - pine    (Aleppo pine, gardens and the Alsos): tall leaning trunk, flat irregular umbrella of needle tufts, 12–15 m
   - cypress (Mediterranean cypress): narrow column, 10–13 m;  cedar: layered cone, 11 m;  olive: gnarled 4–5 m;  palm: Washingtonia/Phoenix 9 m
   Branching trees are grown from a seeded skeleton (trunk → limbs → branches → twigs as real tapered tubes) with alpha-cut leaf cards clustered at the twig tips,
   using the photo foliage layers of 10_atlas.js (T.leaves, leafPine, leafOlive, leafOrange, leafCypress, leafPalm) and MAT.leaf, which sways in the wind.
   Three LOD tiers per species (near: full skeleton; mid: limbs + bigger cards; far: trunk + few big cards), drawn through distance pools:
   one InstancedMesh per tier and species for the whole world, refilled by updateTreeLOD(cx,cz) from updateChunkVis(). */
const TREE={};
/* seeded random */
function trng(seed){let s=(Math.floor(seed)%2147483646+2147483646)%2147483646+1;return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
const v3n=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]};
const v3x=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/* rotate direction d by angle a away from itself, toward azimuth phi */
function tilt(d,a,phi){const u=v3n(Math.abs(d[1])<0.95?v3x(d,[0,1,0]):v3x(d,[1,0,0])),v=v3x(d,u);const c=Math.cos(a),s=Math.sin(a),cp=Math.cos(phi),sp=Math.sin(phi);
  return v3n([d[0]*c+(u[0]*cp+v[0]*sp)*s,d[1]*c+(u[1]*cp+v[1]*sp)*s,d[2]*c+(u[2]*cp+v[2]*sp)*s])}
/* tapered tube along pts with radii rads (parallel-transport frames), uv in metres / rep */
function tube(g,pts,rads,sides,col,rc,rep){const n=pts.length;if(n<2)return;let prevU=null;const rings=[];let vacc=0;
  for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];const t=v3n([b[0]-a[0],b[1]-a[1],b[2]-a[2]]);let u;
    if(!prevU)u=v3n(Math.abs(t[1])<0.95?v3x(t,[0,1,0]):v3x(t,[1,0,0]));else{const d=prevU[0]*t[0]+prevU[1]*t[1]+prevU[2]*t[2];u=v3n([prevU[0]-t[0]*d,prevU[1]-t[1]*d,prevU[2]-t[2]*d])}prevU=u;const v=v3x(u,t);
    if(i>0)vacc+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]);const o=g.vc,r=rads[i],circ=TAU*Math.max(r,0.05);
    for(let j=0;j<=sides;j++){const an=j/sides*TAU,c=Math.cos(an),s=Math.sin(an);const nx=u[0]*c+v[0]*s,ny=u[1]*c+v[1]*s,nz=u[2]*c+v[2]*s;g.v(pts[i][0]+nx*r,pts[i][1]+ny*r,pts[i][2]+nz*r,nx,ny,nz,j/sides*circ/rep[0],vacc/rep[1],col,rc,0)}rings.push(o)}
  for(let i=0;i<n-1;i++){const A=rings[i],B=rings[i+1];for(let j=0;j<sides;j++){const a=A+j,b=A+j+1,c=B+j+1,d=B+j;g.i.push(a,c,b,a,d,c)}}}
/* one alpha-cut leaf card: centre p, size s, random orientation; normal blends "out of the crown" with up, so light wraps round the crown */
function leafCard(g,p,s,R,crown,col,rc,uvK,flat){const a=R()*TAU,tl=(R()-0.5)*(flat?0.5:1.6);const ax=[Math.cos(a),0,Math.sin(a)];const up=tilt([0,1,0],flat?1.35+(R()-0.5)*0.3:Math.abs(tl),a+Math.PI/2);
  const bx=v3n(v3x(up,ax));const ay=v3x(ax,bx);let N=v3n([p[0]-crown[0],(p[1]-crown[1])*1.2+crown[3]*0.45,p[2]-crown[2]]);
  const P=(u,w)=>[p[0]+ax[0]*u*s+ay[0]*w*s,p[1]+ax[1]*u*s+ay[1]*w*s,p[2]+ax[2]*u*s+ay[2]*w*s];const q=[P(-0.5,-0.5),P(0.5,-0.5),P(0.5,0.5),P(-0.5,0.5)];const u0=R(),v0=R(),k=s/uvK;
  const c=shade(col,0.8+0.35*R()+0.18*clamp((p[1]-crown[1])/crown[3],-1,1));const o=g.vc;g.v(q[0][0],q[0][1],q[0][2],N[0],N[1],N[2],u0,v0,c,rc,0);g.v(q[1][0],q[1][1],q[1][2],N[0],N[1],N[2],u0+k,v0,c,rc,0);
  g.v(q[2][0],q[2][1],q[2][2],N[0],N[1],N[2],u0+k,v0+k,c,rc,0);g.v(q[3][0],q[3][1],q[3][2],N[0],N[1],N[2],u0,v0+k,c,rc,0);g.i.push(o,o+1,o+2,o,o+2,o+3)}
/* skeleton growth for branching species. P: {trunkH,trunkR,lean,trunkSegs, limbs:[n,angleDeg,len], levels:[[n,angleDeg,lenK,radK],…], wob, photo, droop, cl:[n,radius,card]} */
function growSkeleton(P,seed){const R=trng(seed),B=[];const lean=tilt([0,1,0],P.lean*(0.6+0.4*R()),R()*TAU);
  const branch=(p,d,len,r,lvl,segs)=>{const pts=[p],rads=[r];let dir=d,q=p;for(let i=1;i<=segs;i++){dir=v3n([dir[0]+(R()-0.5)*P.wob,dir[1]+(R()-0.5)*P.wob+P.photo*(lvl>0?1:0.3)-(lvl>=2?P.droop:0),dir[2]+(R()-0.5)*P.wob]);
      q=[q[0]+dir[0]*len/segs,q[1]+dir[1]*len/segs,q[2]+dir[2]*len/segs];pts.push(q);rads.push(r*(1-0.42*i/segs))}
    const b={pts,rads,lvl,tips:[]};B.push(b);const L=P.levels[lvl];
    if(L){const n=L[0];for(let k=0;k<n;k++){const t=n===1?1:0.5+0.5*(k+1)/n;const idx=Math.min(segs,Math.max(1,Math.round(t*segs)));const phi=(k*2.4+R()*0.9)+(lvl*1.3);
        branch(pts[idx],tilt(dir,(L[1]*(0.75+0.5*R()))*Math.PI/180,phi),len*L[2]*(0.8+0.4*R()),rads[idx]*L[3],lvl+1,Math.max(2,segs-1))}}
    else b.tips.push(q,pts[Math.max(1,segs-1)])};
  const top=[lean[0]*P.trunkH,P.trunkH*lean[1],lean[2]*P.trunkH],tp=[],tr=[];for(let i=0;i<=P.trunkSegs;i++){const t=i/P.trunkSegs;const bend=Math.sin(t*Math.PI)*P.lean*0.6;tp.push([top[0]*t+bend*Math.cos(seed),top[1]*t,top[2]*t+bend*Math.sin(seed)]);tr.push(P.trunkR*(1-0.3*t)*(i===0?1.35:1))}
  tp.unshift([0,-0.3,0]);tr.unshift(P.trunkR*1.4);B.push({pts:tp,rads:tr,lvl:-1,tips:[]});
  const [nl,ang,len]=P.limbs;for(let k=0;k<nl;k++){const phi=k/nl*TAU+R()*0.8;branch(tp[tp.length-1],tilt(lean,ang*(0.8+0.4*R())*Math.PI/180,phi),len*(0.85+0.3*R()),P.trunkR*0.62,0,P.limbSegs||4)}
  let cx=0,cy=0,cz=0,cn=0,ymin=1e9,ymax=-1e9;for(const b of B)for(const t of b.tips){cx+=t[0];cy+=t[1];cz+=t[2];cn++;ymin=Math.min(ymin,t[1]);ymax=Math.max(ymax,t[1])}
  return{B,crown:[cx/cn,cy/cn,cz/cn,Math.max(1,(ymax-ymin)/2)],R}}
/* emit a skeleton at a LOD: 0 near (all tubes, normal cards), 1 mid (trunk + limbs, ½ clusters, bigger cards), 2 far (trunk only, ¼ clusters, big cards) */
function emitSkeleton(S,P,lod,wood,leaf){const R=trng(77+lod*13),bark=RECT[T[P.bark]||T.bark],lt=RECT[T[P.leaf]||T.leaves],bc=hexc(P.barkC),lc=hexc(P.leafC);const maxL=lod===0?9:lod===1?0:-1;
  for(const b of S.B){if(b.lvl>maxL)continue;const sides=b.lvl<0?(lod===0?8:lod===1?5:4):b.lvl===0?(lod===0?6:4):b.lvl===1?4:3;const rads=lod===0?b.rads:b.rads.map(r=>r*1.1);tube(wood,b.pts,rads,sides,bc,bark,P.barkRep||[1.2,1.4])}
  const [cn,cr,cs]=P.cl;let k=0;const step=lod===0?1:lod===1?2:4,grow=lod===0?1:lod===1?1.5:2.1;
  for(const b of S.B)for(const t of b.tips){if((k++)%step)continue;const n=lod===2?Math.max(3,cn-1):cn;for(let i=0;i<n;i++){const o=[t[0]+(R()-0.5)*2*cr*grow*0.8,t[1]+(R()-0.3)*cr*grow*0.9,t[2]+(R()-0.5)*2*cr*grow*0.8];leafCard(leaf,o,cs*grow*(0.75+0.5*R()),R,S.crown,lc,lt,P.uvK||2,P.flat)}}}
const TSPEC={
  plane:{trunkH:3.6,trunkR:0.36,lean:0.08,trunkSegs:3,limbs:[4,30,6.2],limbSegs:4,levels:[[3,36,0.58,0.62],[2,40,0.55,0.6]],wob:0.32,photo:0.22,droop:0.12,cl:[11,1.4,2.2],bark:'bark',barkC:'#c8bfa8',leaf:'leaves',leafC:'#7ea456',barkRep:[1.1,1.3]},
  pine:{trunkH:8.2,trunkR:0.3,lean:0.2,trunkSegs:5,limbs:[5,62,4.0],limbSegs:3,levels:[[3,42,0.6,0.6]],wob:0.35,photo:0.16,droop:0.0,cl:[15,1.5,3.0],bark:'barkPine',barkC:'#7d6d60',leaf:'leafPine',leafC:'#6f9150',flat:true,barkRep:[1.0,1.0]},
  olive:{trunkH:1.5,trunkR:0.24,lean:0.3,trunkSegs:3,limbs:[4,40,2.3],limbSegs:3,levels:[[3,42,0.6,0.6]],wob:0.55,photo:0.12,droop:0.1,cl:[7,0.75,1.3],bark:'barkDark',barkC:'#8d877a',leaf:'leafOlive',leafC:'#a3b088',uvK:1.5}};
function branchingTree(kind,variant){const P=TSPEC[kind],S=growSkeleton(P,kind.length*1009+variant*7919+17),out=[];
  for(let lod=0;lod<3;lod++){const w=new GB(),l=new GB();emitSkeleton(S,P,lod,w,l);out.push(lod===0?{solid:w.build(),leaf:l.build()}:{leaf:mergeGB(w,l)})}return out}
/* mid/far tiers draw trunk + leaves in ONE leaf-material mesh (one draw call) */
function mergeGB(a,b){const g=new GB();for(const s of[a,b]){const o=g.vc;g.p.push(...s.p);g.n.push(...s.n);g.u.push(...s.u);g.c.push(...s.c);g.r.push(...s.r);g.g.push(...s.g);for(const i of s.i)g.i.push(i+o);g.vc+=s.vc}return g.build()}
/* non-branching species: crown volume + cards */
function shapedTree(kind){const out=[];for(let lod=0;lod<3;lod++){const w=new GB(),l=new GB(),R=trng(kind.length*31+lod),cut=lod===0?1:lod===1?0.55:0.3,sides=lod===0?8:lod===1?6:4;
  if(kind==='orange'){tube(w,[[0,-0.3,0],[0.03,1.0,0],[0,1.65,0.02]],[0.13,0.11,0.09],lod?4:6,hexc('#7d705c'),RECT[T.barkDark],[1,1]);
    const crown=[0,2.75,0,1.25];const ico=new THREE.IcosahedronGeometry(1,lod===2?0:1),p=ico.attributes.position;for(let i=0;i<p.count;i+=3){const o=w.vc;for(let k=0;k<3;k++){const x=p.getX(i+k),y=p.getY(i+k),z=p.getZ(i+k),j=0.9+0.18*hf(Math.floor((x*7+y*13+z*17)*1000)&0xffff);
      const nn=v3n([x,y+0.15,z]);w.v(x*1.45*j,2.75+y*1.25*j,z*1.45*j,nn[0],nn[1],nn[2],x*1.2+z*0.6,y*1.2,shade(hexc('#5d8a3a'),0.85+0.2*(y+1)/2),RECT[T.orangeF],0)}w.i.push(o,o+1,o+2)}
    for(let k=0,n=Math.round(30*cut);k<n;k++){const th=R()*TAU,ph=Math.acos(1-2*R());const p2=[Math.sin(ph)*Math.cos(th)*1.5,2.75+Math.cos(ph)*1.3,Math.sin(ph)*Math.sin(th)*1.5];leafCard(l,p2,0.95/Math.sqrt(cut),R,crown,hexc('#6f9c45'),RECT[T.leafOrange],1.2)}}
  if(kind==='cypress'){const H=11;tube(w,[[0,-0.3,0],[0,1.2,0]],[0.24,0.2],5,hexc('#6f5a44'),RECT[T.barkDark],[1,1]);const prof=t=>Math.sin(Math.min(1,t*1.15)*Math.PI*0.92)*1.05+0.08;const crown=[0,H/2,0,H/2];
    for(let k=0;k<7;k++){const y0=0.6+k*H/7,y1=0.6+(k+1)*H/7;w.cyl(0,y0,0,prof(k/7),prof((k+1)/7),y1-y0,sides,shade(hexc('#4d6a3c'),0.85+k*0.03),RECT[T.hedge],k===6,0,0.7)}
    for(let k=0,n=Math.round(46*cut);k<n;k++){const t=R(),y=0.9+t*H*0.97,r=prof(Math.min(0.99,(y-0.6)/H))*1.02,a=R()*TAU;leafCard(l,[Math.cos(a)*r,y,Math.sin(a)*r],1.3/Math.sqrt(cut),R,crown,hexc('#5f7f45'),RECT[T.leafCypress],1.5)}}
  if(kind==='cedar'){tube(w,[[0,-0.3,0],[0,9.5,0]],[0.34,0.12],5,hexc('#6e5a46'),RECT[T.barkDark],[1,1]);const crown=[0,6,0,4];
    for(let k=0;k<4;k++){const y=2.4+k*2.2,r=3.6-k*0.75;w.cyl(0,y,0,r,r*0.25,2.3,sides+1,shade(hexc('#3f5f4a'),0.9+k*0.05),RECT[T.hedge],true,0,0.6);
      for(let m=0,n=Math.round(14*cut);m<n;m++){const a=R()*TAU,rr=r*(0.55+0.45*R());leafCard(l,[Math.cos(a)*rr,y+0.3+R()*0.9,Math.sin(a)*rr],1.5/Math.sqrt(cut),R,crown,hexc('#4f6f52'),RECT[T.leafPine],2,true)}}}
  if(kind==='palm'){const H=8.4,lean=R()*0.4;const tp=[];for(let i=0;i<=6;i++){const t=i/6;tp.push([Math.sin(t*1.5)*lean,-0.3+t*(H+0.3),0])}tube(w,tp,tp.map((_,i)=>i===0?0.42:0.34-i*0.012),lod?5:8,hexc('#9a8466'),RECT[T.barkPalm],[1.2,1.5]);
    const top=tp[6],crown=[top[0],top[1],top[2],1.5];const nf=lod===2?7:lod===1?10:14;for(let k=0;k<nf;k++){const a=k/nf*TAU+R()*0.3,dx=Math.cos(a),dz=Math.sin(a),el=0.35+R()*0.5-(k%3)*0.25;
      const p0=top,p1=[top[0]+dx*1.6,top[1]+el*1.1+0.5,top[2]+dz*1.6],p2=[top[0]+dx*3.4,top[1]+el*0.6-0.6,top[2]+dz*3.4];const sx=-dz*0.9,sz=dx*0.9,lt=RECT[T.leafPalm],c=shade(hexc('#7e9a52'),0.85+0.3*R());
      l.quad([p0[0]-sx*0.3,p0[1],p0[2]-sz*0.3],[p1[0]-sx,p1[1],p1[2]-sz],[p1[0]+sx,p1[1],p1[2]+sz],[p0[0]+sx*0.3,p0[1],p0[2]+sz*0.3],[0,0],[0,0.55],[0.6,0.55],[0.6,0],c,lt,0);
      l.quad([p1[0]-sx,p1[1],p1[2]-sz],[p2[0]-sx*0.3,p2[1],p2[2]-sz*0.3],[p2[0]+sx*0.3,p2[1],p2[2]+sz*0.3],[p1[0]+sx,p1[1],p1[2]+sz],[0,0.55],[0,1.1],[0.6,1.1],[0.6,0.55],c,lt,0)}
    w.cyl(top[0],top[1]-0.9,top[2],0.36,0.5,0.9,6,hexc('#8a7a5a'),RECT[T.barkPalm],false)}
  out.push(lod===0?{solid:w.build(),leaf:l.build()}:{leaf:mergeGB(w,l)})}return out}
function treeGeo(kind,variant){const key=kind+(variant||0);if(!TREE[key])TREE[key]=TSPEC[kind]?branchingTree(kind,variant||0):shapedTree(kind);return TREE[key]}

/* ---------- distance pools (shared with any module: lodPool(list, tiers) / updateTreeLOD) ----------
   list: [[x,y,z,yaw,scale,stretchXZ,shade],…]; tiers: [{geo, mat, d (max distance m), cast}] near → far */
const LODP=[];
function lodPool(list,tiers){if(!list.length)return null;const n=list.length,mat=new Float32Array(n*16),xz=new Float32Array(n*2),col=new Float32Array(n*3),m=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0);
  list.forEach((p,i)=>{q.setFromAxisAngle(Y,p[3]||0);pv.set(p[0],p[1],p[2]);const s=p[4]||1,a=p[5]||1;sv.set(s*a,s,s*a);m.compose(pv,q,sv);m.toArray(mat,i*16);xz[i*2]=p[0];xz[i*2+1]=p[2];const v=p[6]||1;col[i*3]=v;col[i*3+1]=v*1.02;col[i*3+2]=v*0.95});
  const P={mat,xz,col,n,tiers:tiers.map(t=>{const ms=[];for(const [geo,mt] of t.geos){if(!geo)continue;const im=new THREE.InstancedMesh(geo,mt,n);im.count=0;im.frustumCulled=false;im.receiveShadow=false;im.castShadow=!!t.cast;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.setColorAt(0,new THREE.Color(1,1,1));scene.add(im);ms.push(im)}return{d:t.d,cast:!!t.cast,ms}})};LODP.push(P);return P}
let _tlodX=1e9,_tlodZ=1e9;
function updateTreeLOD(cx,cz,force){if(!force&&Math.abs(cx-_tlodX)<3&&Math.abs(cz-_tlodZ)<3)return;_tlodX=cx;_tlodZ=cz;const far=(typeof Q!=='undefined'?Q.dist:240)+50,lowK=typeof Q!=='undefined'&&Q.dist<200?0.75:1;
  for(const P of LODP){const T_=P.tiers,nt=T_.length,cnt=new Int32Array(nt),lim=T_.map((t,i)=>{const d=i===nt-1?Math.min(far,t.d||far):t.d*lowK;return d*d});
    for(let i=0;i<P.n;i++){const dx=P.xz[i*2]-cx,dz=P.xz[i*2+1]-cz,d=dx*dx+dz*dz;for(let k=0;k<nt;k++){if(d<lim[k]){const c=cnt[k]++;for(const im of T_[k].ms){im.instanceMatrix.array.set(P.mat.subarray(i*16,i*16+16),c*16);im.instanceColor.array.set(P.col.subarray(i*3,i*3+3),c*3)}break}}}
    for(let k=0;k<nt;k++)for(const im of T_[k].ms){im.count=cnt[k];im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.castShadow=T_[k].cast&&Q.sh>0}}}

const TREEMAT=()=>MAT.atlas;
/* legacy per-192 m cell registry: other modules (75_npc.js terrace furniture) push instanced meshes into treeChunk(x,z).props; updateChunkVis() shows them by distance */
const TREECH=new Map();function treeChunk(x,z){const k=Math.floor(x/192)+','+Math.floor(z/192);let c=TREECH.get(k);if(!c){c={k,cx:(Math.floor(x/192)+0.5)*192,cz:(Math.floor(z/192)+0.5)*192,detail:[],props:[]};TREECH.set(k,c)}return c}
const TREE_D={plane:[60,130],pine:[60,140],olive:[45,100],orange:[40,95],cypress:[50,120],cedar:[50,120],palm:[55,130]};
function plantTrees(){const per={};const add=(x,z,kind,s,v)=>{const key=kind+'|'+(v||0);(per[key]=per[key]||{kind,v:v||0,list:[]}).list.push([x,terr(x,z),z,hf(Math.floor(x*13+z*7))*TAU,s,0.88+hf(Math.floor(x*5+z*3))*0.24,0.86+hf(Math.floor(x*3+z*11))*0.26])};
  for(const t of MAP.street_trees){const x=t[0]/10,z=t[1]/10,sp=t[2]==='orange'?'orange':'plane';add(x,z,sp,0.9+hf(t[0]*3+t[1])*0.4,sp==='plane'?(hf(t[0]+t[1]*7)<0.5?0:1):0);addBoxC(x,z,sp==='plane'?0.32:0.16,'t');placed('tree',x,z,t[2],'map.street_trees')}
  for(const t of MAP.props.tree){const x=t[0]/10,z=t[1]/10;add(x,z,'plane',1.25,1);addBoxC(x,z,0.45,'t');placed('tree',x,z,'plane','map.props.tree')}
  const dens=Q.trees;for(const t of MAP.garden_trees){if(hf(t[0]*7+t[1]*3)>dens)continue;const x=t[0]/10,z=t[1]/10;if(inShopZone(x,z,10))continue;const sp=TREE_D[t[2]]?t[2]:'plane';add(x,z,sp,0.85+hf(t[0]+t[1]*5)*0.5,sp==='plane'?(hf(t[1])<0.5?0:1):0);placed('tree',x,z,t[2],'map.garden_trees')}
  // the old plane tree of Platanos square (landmark; position estimated at the centre of the square)
  {const el=typeof placeEl==='function'?placeEl(/old plane tree/i):[];const p=el.length?[el[0].x,el[0].z]:[-68.1,14.2];// research places.json (crown ~20 m, trunk 1.2-1.5 m)
    add(p[0],p[1],'plane',1.6,0);addBoxC(p[0],p[1],0.65,'t');placed('tree',p[0],p[1],'old plane tree of Platanos','places.json')}
  for(const key in per){const e=per[key];const G=treeGeo(e.kind,e.v),d=TREE_D[e.kind]||[60,130];
    lodPool(e.list,[{geos:[[G[0].solid,MAT.atlas],[G[0].leaf,MAT.leaf]],d:d[0],cast:true},{geos:[[G[1].leaf,MAT.leaf]],d:d[1],cast:true},{geos:[[G[2].leaf,MAT.leaf]],d:0,cast:false}])}
  updateTreeLOD(MAP.key.spawn?MAP.key.spawn[0]:0,MAP.key.spawn?MAP.key.spawn[1]:0,true)}
