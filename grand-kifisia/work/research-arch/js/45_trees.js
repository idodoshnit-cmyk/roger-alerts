'use strict';
/* Grand Kifisia — trees (instanced) */
/* ---------- trees (instanced per chunk) ---------- */
const TREE={};
function treeGeo(kind){const g=new GB(),lf=new GB();const leafC=k=>hexc(k);
  /* leaf cards: crossed alpha-cut quads scattered on an ellipsoid, normals pointing out of the crown so light wraps like real foliage */
  const cards=(cx,cy,cz,rx,ry,rz,n,size,col,seed)=>{for(let k=0;k<n;k++){const u=hf(seed*97+k*13),v=hf(seed*31+k*7),w=hf(seed*17+k*29);const th=u*TAU,ph=Math.acos(1-2*v);const r=0.55+0.45*Math.cbrt(w);
      const px=cx+Math.sin(ph)*Math.cos(th)*rx*r,py=cy+Math.cos(ph)*ry*r*0.9,pz=cz+Math.sin(ph)*Math.sin(th)*rz*r;const nx=(px-cx)/rx,ny=(py-cy)/ry+0.35,nz=(pz-cz)/rz;const nl=Math.hypot(nx,ny,nz)||1;const N=[nx/nl,ny/nl,nz/nl];
      const sz=size*(0.75+0.5*hf(seed+k*3));const a=hf(k*7+seed)*TAU,tilt=(hf(k*11+seed)-0.5)*1.2;const ax=Math.cos(a),az=Math.sin(a);const bx=-az*Math.sin(tilt),by=Math.cos(tilt),bz=ax*Math.sin(tilt);
      const P=(s1,s2)=>[px+ax*s1*sz+bx*s2*sz,py+by*s2*sz,pz+az*s1*sz+bz*s2*sz];const c=shade(col,0.78+0.4*hf(k+seed*5)+0.15*((py-cy)/ry));
      const q=[P(-0.5,-0.5),P(0.5,-0.5),P(0.5,0.5),P(-0.5,0.5)];const o=lf.v(q[0][0],q[0][1],q[0][2],N[0],N[1],N[2],0,0,c,RECT[T.leaves],0);lf.v(q[1][0],q[1][1],q[1][2],N[0],N[1],N[2],1,0,c,RECT[T.leaves],0);lf.v(q[2][0],q[2][1],q[2][2],N[0],N[1],N[2],1,1,c,RECT[T.leaves],0);lf.v(q[3][0],q[3][1],q[3][2],N[0],N[1],N[2],0,1,c,RECT[T.leaves],0);lf.i.push(o,o+1,o+2,o,o+2,o+3)}};const blob=(cx,cy,cz,rx,ry,rz,col,tile,det)=>{const ico=new THREE.IcosahedronGeometry(1,det||0);const pos=ico.attributes.position;const nor=ico.attributes.normal;
    for(let i=0;i<pos.count;i+=3){const P=[];for(let k=0;k<3;k++){const x=pos.getX(i+k),y=pos.getY(i+k),z=pos.getZ(i+k);const j=0.82+0.32*hf(Math.floor((x*7+y*13+z*17)*1000)&0xffff);P.push([cx+x*rx*j,cy+y*ry*j,cz+z*rz*j])}
      const fn=g.nrm(P[0],P[1],P[2]);const Nn=P.map(q=>{const nx=(q[0]-cx)/rx,ny=(q[1]-cy)/ry,nz=(q[2]-cz)/rz;const l=Math.hypot(nx,ny,nz)||1;const a=[nx/l*0.75+fn[0]*0.25,ny/l*0.75+fn[1]*0.25+0.12,nz/l*0.75+fn[2]*0.25];const l2=Math.hypot(...a);return[a[0]/l2,a[1]/l2,a[2]/l2]});
      const sh=0.82+0.3*hf(i)+0.12*((P[0][1]-cy)/ry);g.triN(P[0],P[1],P[2],Nn[0],Nn[1],Nn[2],[P[0][0]/1.5,P[0][1]/1.5],[P[1][0]/1.5,P[1][1]/1.5],[P[2][0]/1.5,P[2][2]/1.5],shade(col,sh),RECT[tile],0)}};
  const trunk=(h,r0,r1,col,tile)=>g.cyl(0,-0.3,0,r0,r1,h+0.3,7,col||hexc('#9a8f7a'),RECT[tile||T.bark],false,0,0.6);
  if(kind==='plane'){trunk(4.6,0.38,0.24);g.cyl(0,4.2,0,0.22,0.08,2.6,5,hexc('#9a8f7a'),RECT[T.bark],false);blob(0,6.9,0,2.9,2.1,2.9,shade(leafC('#5f8540'),0.7),T.hedge,1);blob(1.2,7.9,0.6,2.0,1.5,2.0,shade(leafC('#6b9248'),0.7),T.hedge);cards(0,7.1,0,3.9,2.9,3.9,46,2.1,leafC('#86ad5c'),1);cards(1.4,8.2,0.7,2.6,2.0,2.6,18,1.8,leafC('#93b866'),2)}
  if(kind==='pine'){trunk(7.8,0.32,0.2,hexc('#8a6a4d'));blob(0,9.2,0,3.8,1.3,3.8,shade(leafC('#4a6a35'),0.7),T.hedge);cards(0,9.3,0,4.8,1.8,4.8,40,2.0,leafC('#5f8a45'),3);cards(1.8,8.7,1.2,2.8,1.2,2.8,12,1.7,leafC('#557d3d'),4)}
  if(kind==='cypress'){trunk(1.2,0.22,0.18,hexc('#6f5a44'));const seg=8,H=10.5;for(let k=0;k<7;k++){const y0=0.6+k*H/7,y1=0.6+(k+1)*H/7;const prof=t=>Math.sin(Math.min(1,t*1.15)*Math.PI*0.92)*1.15+0.05;g.cyl(0,y0,0,prof(k/7),prof((k+1)/7),y1-y0,seg,shade(hexc('#3e5a33'),0.9+k*0.03),RECT[T.hedge],k===6,0,0.7)}}
  if(kind==='palm'){trunk(7.5,0.36,0.28,hexc('#8b7458'));for(let k=0;k<11;k++){const a=k/11*TAU;const dx=Math.cos(a),dz=Math.sin(a);const p0=[0,7.5,0],p1=[dx*2.4,8.3,dz*2.4],p2=[dx*4.2,7.0,dz*4.2];const sx=-dz*0.75,sz=dx*0.75;
    g.quad([p0[0]-sx*0.3,p0[1],p0[2]-sz*0.3],[p1[0]-sx,p1[1],p1[2]-sz],[p1[0]+sx,p1[1],p1[2]+sz],[p0[0]+sx*0.3,p0[1],p0[2]+sz*0.3],[0,0],[0,1],[1,1],[1,0],hexc('#5f8a3a'),RECT[T.hedge],0);g.quad([p1[0]-sx,p1[1],p1[2]-sz],[p2[0]-sx*0.3,p2[1],p2[2]-sz*0.3],[p2[0]+sx*0.3,p2[1],p2[2]+sz*0.3],[p1[0]+sx,p1[1],p1[2]+sz],[0,0],[0,1],[1,1],[1,0],hexc('#6d9644'),RECT[T.hedge],0);
    g.quad([p0[0]+sx*0.3,p0[1]-0.05,p0[2]+sz*0.3],[p1[0]+sx,p1[1]-0.05,p1[2]+sz],[p1[0]-sx,p1[1]-0.05,p1[2]-sz],[p0[0]-sx*0.3,p0[1]-0.05,p0[2]-sz*0.3],[0,0],[0,1],[1,1],[1,0],hexc('#4f7430'),RECT[T.hedge],0);g.quad([p1[0]+sx,p1[1]-0.05,p1[2]+sz],[p2[0]+sx*0.3,p2[1]-0.05,p2[2]+sz*0.3],[p2[0]-sx*0.3,p2[1]-0.05,p2[2]-sz*0.3],[p1[0]-sx,p1[1]-0.05,p1[2]-sz],[0,0],[0,1],[1,1],[1,0],hexc('#4f7430'),RECT[T.hedge],0)}}
  if(kind==='orange'){trunk(1.7,0.13,0.1,hexc('#7a6a55'));blob(0,2.6,0,1.45,1.25,1.45,leafC('#5c8a3a'),T.orangeF,1);cards(0,2.65,0,1.7,1.45,1.7,16,0.95,leafC('#6a9a44'),5)}
  if(kind==='olive'){trunk(1.9,0.22,0.14,hexc('#6f6656'));blob(0.3,3.0,0,1.8,1.1,1.6,shade(leafC('#7d8a5e'),0.8),T.hedge);cards(0,3.1,0,2.4,1.6,2.2,24,1.4,leafC('#9fae80'),6)}
  if(kind==='cedar'){trunk(2.2,0.34,0.2,hexc('#6e5a46'));for(let k=0;k<4;k++){const y=2.6+k*2.2,r=3.6-k*0.75;g.cyl(0,y,0,r,r*0.25,2.3,9,shade(hexc('#3f5f4a'),0.9+k*0.05),RECT[T.hedge],true,0,0.6)}}
  return{solid:g.build(),leaf:lf.size()?lf.build():null}}
const TREEMAT=()=>MAT.atlas;
const TREECH=new Map();function treeChunk(x,z){const k=Math.floor(x/192)+','+Math.floor(z/192);let c=TREECH.get(k);if(!c){c={k,cx:(Math.floor(x/192)+0.5)*192,cz:(Math.floor(z/192)+0.5)*192,detail:[],props:[]};TREECH.set(k,c)}return c}
function plantTrees(){const per={};const add=(x,z,kind,s)=>{const c=treeChunk(x,z);const k=c.k+'|'+kind;(per[k]=per[k]||{c,kind,list:[]}).list.push([x,z,s])};
  for(const t of MAP.street_trees){const x=t[0]/10,z=t[1]/10;add(x,z,t[2],0.9+hf(t[0]*3+t[1])*0.4);addBoxC(x,z,0.25,'t');placed('tree',x,z,t[2],'map.street_trees')}
  for(const t of MAP.props.tree){const x=t[0]/10,z=t[1]/10;add(x,z,'plane',1.25);addBoxC(x,z,0.4,'t');placed('tree',x,z,'plane','map.props.tree')}
  const dens=Q.trees;for(const t of MAP.garden_trees){if(hf(t[0]*7+t[1]*3)>dens)continue;const x=t[0]/10,z=t[1]/10;if(inShopZone(x,z,10))continue;add(x,z,t[2],0.95+hf(t[0]+t[1]*5)*0.6)}
  // the old plane tree of Platanos square
  if(MAP.key.platanos)add(MAP.key.platanos[0]+6,MAP.key.platanos[1]-4,'plane',1.9);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0),col=new THREE.Color();
  for(const key in per){const e=per[key];if(!TREE[e.kind])TREE[e.kind]=treeGeo(e.kind);const G=TREE[e.kind];
    for(const [geo,mat] of [[G.solid,MAT.atlas],[G.leaf,MAT.leaf]]){if(!geo)continue;const im=new THREE.InstancedMesh(geo,mat,e.list.length);
      e.list.forEach((t,i)=>{q.setFromAxisAngle(Y,hf(Math.floor(t[0]*13+t[1]*7))*TAU);pv.set(t[0],terr(t[0],t[1]),t[1]);sv.setScalar(t[2]);m.compose(pv,q,sv);im.setMatrixAt(i,m);const v=0.85+hf(Math.floor(t[0]*3+t[1]*11))*0.3;col.setRGB(v,v*1.02,v*0.95);im.setColorAt(i,col)});
      im.castShadow=true;im.receiveShadow=false;im.frustumCulled=false;e.c.detail.push(im);scene.add(im)}}}

