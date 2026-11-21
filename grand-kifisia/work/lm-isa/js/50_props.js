'use strict';
/* Grand Kifisia — street furniture (agent: streets; see docs/STREETS_IMPL.md)
   Lamps, bollards, benches, bins, traffic lights, stop signs, bus shelters, kiosks (periptera), fountains, street-name plates.
   Every model is built in real metres after the local designs seen in the reference photos of Kifisia (ref/r11 Platanos, r16 Kassaveti, r17 Kolokotroni, r19 Levidou):
   - lamp0  Athens cast-iron lantern: black fluted base, slim post, four-sided tapered lantern with a pyramid cap and finial (≈ 4.0 m)          — Kolokotroni, Levidou
   - lamp1  dark-green cast-iron post with a white opal globe (≈ 3.95 m)                                                                       — Kassaveti
   - lamp2  galvanised 8 m road column with a curved outreach arm and a flat LED head                                                          — Kifisias Ave, car parks, courts
   - bollard 'band': black steel tube Ø 14 cm × 95 cm with a yellow reflective band (the Athens standard)                                      — Levidou, most streets
     bollard 'ball': dark-green cast post with a ball top (≈ 90 cm)                                                                            — Kassaveti
   - 1100 l wheeled municipal bins (dark grey refuse, blue recycling) standing at the kerb, as everywhere in Athens.
   Real map features are drawn through distance-LOD instance pools (one near + one far InstancedMesh per model kind for the whole world, refilled every
   visibility tick by updatePropLOD(), called from updateChunkVis()), so thousands of bollards cost two draw calls. */

/* ---------- geometry helpers (all in metres, local origin at ground level, model faces local +z) ---------- */
/* surface of revolution: prof = [[r,y],…] bottom→top; smooth around, faceted along the profile (crisp cast-iron mouldings) */
function lathe(g,prof,seg,col,rc,gl,ox,oz){ox=ox||0;oz=oz||0;for(let k=0;k<prof.length-1;k++){const [r0,y0]=prof[k],[r1,y1]=prof[k+1];const dr=r1-r0,dy=y1-y0,l=Math.hypot(dr,dy);if(l<1e-5)continue;const nr=dy/l,ny=-dr/l;const o=g.vc;
  for(let j=0;j<=seg;j++){const a=j/seg*TAU,c=Math.cos(a),s=Math.sin(a);g.v(ox+c*r0,y0,oz+s*r0,c*nr,ny,s*nr,j/seg*2,y0,col,rc,gl);g.v(ox+c*r1,y1,oz+s*r1,c*nr,ny,s*nr,j/seg*2,y1,col,rc,gl)}
  for(let j=0;j<seg;j++){const A=o+j*2,B=A+1,C=A+3,D=A+2;g.i.push(A,B,C,A,C,D)}}}
/* sphere with smooth normals */
function ball(g,cx,cy,cz,r,col,rc,gl,det,sy){const ico=new THREE.IcosahedronGeometry(1,det||1),p=ico.attributes.position;sy=sy||1;for(let i=0;i<p.count;i+=3){const o=g.vc;for(let k=0;k<3;k++){const x=p.getX(i+k),y=p.getY(i+k),z=p.getZ(i+k);g.v(cx+x*r,cy+y*r*sy,cz+z*r,x,y,z,x*0.5+0.5,y*0.5+0.5,col,rc,gl)}g.i.push(o,o+1,o+2)}ico.dispose()}
/* quad that faces away from point c (outward) */
function oquad(g,a,b,d2,e,cx,cy,cz,col,rc,gl,uv){const n=g.nrm(a,b,d2),mx=(a[0]+d2[0])/2-cx,my=(a[1]+d2[1])/2-cy,mz=(a[2]+d2[2])/2-cz;const U=uv||[[0,0],[1,0],[1,1],[0,1]];
  if(n[0]*mx+n[1]*my+n[2]*mz>=0)g.quad(a,b,d2,e,U[0],U[1],U[2],U[3],col,rc,gl);else g.quad(e,d2,b,a,U[3],U[2],U[1],U[0],col,rc,gl)}
/* square frustum (4 sides, optional caps) from half-size b at y0 to half-size t at y1, rotated by rot around y */
function sqfrust(g,cx,cz,y0,y1,b,t,col,rc,gl,rot,caps,bz,tz){rot=rot||0;bz=bz===undefined?b:bz;tz=tz===undefined?t:tz;const c=Math.cos(rot),s=Math.sin(rot);const P=(x,z,y)=>[cx+x*c+z*s,y,cz-x*s+z*c];
  const B=[P(-b,-bz,y0),P(b,-bz,y0),P(b,bz,y0),P(-b,bz,y0)],T_=[P(-t,-tz,y1),P(t,-tz,y1),P(t,tz,y1),P(-t,tz,y1)],cy=(y0+y1)/2;
  for(let i=0;i<4;i++){const j=(i+1)%4;oquad(g,B[i],B[j],T_[j],T_[i],cx,cy,cz,col,rc,gl,[[0,0],[1,0],[1,1],[0,1]])}
  if(caps&1)oquad(g,T_[0],T_[1],T_[2],T_[3],cx,y0-1,cz,col,rc,gl);if(caps&2)oquad(g,B[0],B[1],B[2],B[3],cx,y1+1,cz,col,rc,gl)}

/* square rod between two points (struts, arms, frames) */
function rod(g,a,b,w,col,rc,gl){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1,d=[dx/l,dy/l,dz/l];let u=Math.abs(d[1])<0.9?[d[2],0,-d[0]]:[1,0,0];const ul=Math.hypot(u[0],u[1],u[2]);u=[u[0]/ul*w/2,u[1]/ul*w/2,u[2]/ul*w/2];
  const v=[(d[1]*u[2]-d[2]*u[1]),(d[2]*u[0]-d[0]*u[2]),(d[0]*u[1]-d[1]*u[0])];const C=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];const P=(p,su,sv)=>[p[0]+u[0]*su+v[0]*sv,p[1]+u[1]*su+v[1]*sv,p[2]+u[2]*su+v[2]*sv];
  const S=[[1,1],[-1,1],[-1,-1],[1,-1]];for(let i=0;i<4;i++){const s0=S[i],s1=S[(i+1)%4];oquad(g,P(a,s0[0],s0[1]),P(a,s1[0],s1[1]),P(b,s1[0],s1[1]),P(b,s0[0],s0[1]),C[0],C[1],C[2],col,rc,gl)}}
const ADDL=(x,z,r,k,a)=>{if(typeof addLight==='function')addLight(x,z,r,k,a)};
/* ---------- instance helper kept for other modules (75_npc.js uses it for terrace furniture) ---------- */
function instanced(geo,mat,list,cast){if(!list.length)return null;const im=new THREE.InstancedMesh(geo,mat,list.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3(1,1,1),Y=new THREE.Vector3(0,1,0);
  list.forEach((p,i)=>{q.setFromAxisAngle(Y,p[3]||0);pv.set(p[0],p[1],p[2]);sv.setScalar(p[4]||1);m.compose(pv,q,sv);im.setMatrixAt(i,m)});im.castShadow=!!cast;im.receiveShadow=false;im.frustumCulled=false;scene.add(im);return im}

/* ---------- the models ---------- */
const PCOL={iron:hexc('#1b1d1f'),ironG:hexc('#163022'),galv:hexc('#9aa0a5'),glow:hexc('#fff1cf'),yellow:hexc('#e8b417'),wood:hexc('#9a6a3e'),binG:hexc('#3a3e40'),binB:hexc('#1f5fae'),dkgrey:hexc('#3d4247')};
function propGeo(kind,far){const g=new GB(),M=RECT[T.metal],ML=RECT[T.metalL],W=RECT[T.white],I=PCOL.iron,G=PCOL.ironG;
  if(kind==='lamp0'){// Athens lantern
    if(far){g.cyl(0,0,0,0.13,0.06,3.2,5,I,M,false);sqfrust(g,0,0,3.2,3.75,0.12,0.19,PCOL.glow,W,1,Math.PI/4,0);sqfrust(g,0,0,3.75,4.0,0.24,0.0,I,M,0,Math.PI/4,2);return g.build()}
    lathe(g,[[0.17,0],[0.17,0.07],[0.145,0.1],[0.135,0.42],[0.15,0.45],[0.15,0.5],[0.1,0.56],[0.08,0.72],[0.07,0.76],[0.062,1.0],[0.05,3.0],[0.068,3.03],[0.068,3.09],[0.045,3.12],[0.06,3.16],[0.1,3.2],[0.0,3.21]],10,I,M,0);
    for(let k=0;k<4;k++){const a=k/4*TAU,c=Math.cos(a),s=Math.sin(a);rod(g,[c*0.05,2.84,s*0.05],[c*0.15,3.19,s*0.15],0.022,I,M,0)}// cast struts under the lantern
    sqfrust(g,0,0,3.21,3.76,0.115,0.185,PCOL.glow,W,1,Math.PI/4,0);
    for(let k=0;k<4;k++){const a=k/4*TAU,c=Math.cos(a),s=Math.sin(a);rod(g,[c*0.163,3.21,s*0.163],[c*0.262,3.76,s*0.262],0.024,I,M,0)}// corner frames (lantern rotated 45° → corners on the axes)
    sqfrust(g,0,0,3.18,3.22,0.13,0.13,I,M,0,Math.PI/4,3);sqfrust(g,0,0,3.75,3.79,0.215,0.215,I,M,0,Math.PI/4,3);sqfrust(g,0,0,3.79,4.0,0.235,0.02,I,M,0,Math.PI/4,0);
    ball(g,0,4.04,0,0.04,I,M,0,0);return g.build()}
  if(kind==='lamp1'){// green post + opal globe
    if(far){g.cyl(0,0,0,0.15,0.06,3.45,5,G,M,false);ball(g,0,3.72,0,0.26,PCOL.glow,W,1,0);return g.build()}
    lathe(g,[[0.2,0],[0.2,0.09],[0.17,0.13],[0.155,0.16],[0.155,0.55],[0.175,0.58],[0.175,0.63],[0.11,0.7],[0.085,0.85],[0.075,0.9],[0.065,1.5],[0.082,1.54],[0.082,1.6],[0.06,1.64],[0.052,3.25],[0.075,3.3],[0.075,3.36],[0.05,3.39],[0.09,3.44],[0.09,3.48],[0,3.49]],12,G,M,0);
    for(let k=0;k<8;k++){const a=k/8*TAU;g.box(Math.cos(a)*0.158,0.355,Math.sin(a)*0.158,0.03,0.36,0.03,-a,G,M)}// flutes of the base
    ball(g,0,3.73,0,0.25,PCOL.glow,W,1,2);return g.build()}
  if(kind==='lamp2'){// road column + arm + LED head (head toward local +x)
    if(far){g.cyl(0,0,0,0.11,0.06,8,5,PCOL.galv,ML,false);g.box(0.9,8.0,0,1.8,0.08,0.1,0,PCOL.galv,ML);g.box(1.9,7.95,0,0.62,0.1,0.26,0,PCOL.glow,W,1,1);return g.build()}
    g.cyl(0,0,0,0.2,0.2,0.5,8,hexc('#7d8287'),RECT[T.concrete],true);g.cyl(0,0.5,0,0.11,0.065,7.4,8,PCOL.galv,ML,false);
    let px=0,py=7.6;for(let k=1;k<=7;k++){const a=k/7*Math.PI/2,nx=(1-Math.cos(a))*0.9,ny=7.6+Math.sin(a)*0.45;rod(g,[px,py,0],[nx,ny,0],0.07,PCOL.galv,ML,0);px=nx;py=ny}
    rod(g,[px,py,0],[1.75,py+0.04,0],0.065,PCOL.galv,ML,0);sqfrust(g,2.05,0,py-0.06,py+0.06,0.36,0.33,hexc('#8c9196'),ML,0,0,1,0.16,0.14);g.box(2.05,py-0.07,0,0.6,0.02,0.24,0,PCOL.glow,W,1,1);return g.build()}
  if(kind==='bollard'){// black tube + yellow reflective band
    if(far){g.cyl(0,0,0,0.07,0.07,0.74,5,I,M,false);g.cyl(0,0.74,0,0.07,0.07,0.09,5,PCOL.yellow,W,false);g.cyl(0,0.83,0,0.07,0.05,0.12,5,I,M,true);return g.build()}
    g.cyl(0,0,0,0.072,0.07,0.74,8,I,M,false);g.cyl(0,0.74,0,0.0705,0.0705,0.09,8,PCOL.yellow,W,false);g.cyl(0,0.83,0,0.07,0.068,0.09,8,I,M,false);lathe(g,[[0.068,0.92],[0.06,0.945],[0.035,0.96],[0,0.965]],8,I,M,0);return g.build()}
  if(kind==='bollardB'){// dark-green cast bollard with ball top (Kassaveti)
    if(far){g.cyl(0,0,0,0.075,0.06,0.78,5,G,M,false);ball(g,0,0.84,0,0.075,G,M,0,0);return g.build()}
    lathe(g,[[0.09,0],[0.09,0.06],[0.075,0.09],[0.07,0.7],[0.08,0.72],[0.08,0.76],[0.045,0.78]],8,G,M,0);ball(g,0,0.845,0,0.075,G,M,0,1);return g.build()}
  if(kind==='bench'){// wooden slats on black cast-iron ends; sitter faces +z, seat 0.46 m
    const wd=PCOL.wood,WD=RECT[T.wood];
    if(far){g.box(0,0.45,0,1.8,0.06,0.42,0,wd,WD);g.box(0,0.72,-0.24,1.8,0.34,0.05,-0.0,wd,WD);for(const sx of[-0.82,0.82])g.box(sx,0.3,-0.02,0.07,0.6,0.5,0,I,M);return g.build()}
    for(let k=0;k<4;k++)g.box(0,0.45,-0.17+k*0.115,1.8,0.035,0.09,0,wd,WD);
    for(let k=0;k<3;k++){const y=0.6+k*0.12,z=-0.25-k*0.035;g.box(0,y,z,1.8,0.09,0.03,0,wd,WD)}
    for(const sx of[-0.8,0.8]){g.box(sx,0.215,0.17,0.05,0.43,0.05,0,I,M);g.box(sx,0.215,-0.2,0.05,0.43,0.05,0,I,M);g.box(sx,0.42,-0.01,0.05,0.05,0.44,0,I,M);
      g.box(sx,0.62,-0.27,0.05,0.42,0.045,0,I,M);g.box(sx,0.64,0.1,0.05,0.04,0.4,0,I,M);g.box(sx,0.53,0.27,0.045,0.2,0.045,0,I,M)}
    return g.build()}
  if(kind==='basket'){// municipal litter bin on a post (dark green)
    if(far){g.box(0,0.62,0,0.42,0.75,0.42,0,G,M);return g.build()}
    g.cyl(0,0,0,0.05,0.05,1.0,6,G,M,true);sqfrust(g,0,0.13,0.28,0.95,0.2,0.22,G,M,0,0,2);sqfrust(g,0,0.13,0.95,1.04,0.235,0.18,G,M,0,0,1);
    g.box(0,0.98,0.13+0.215,0.26,0.07,0.012,0,hexc('#0c0d0e'),M);return g.build()}
  if(kind==='bin'||kind==='recycle'){// 1100 l four-wheel container: 1.37 × 1.07 m, 1.31 m to the lid
    const c=kind==='bin'?PCOL.binG:PCOL.binB,lid=kind==='bin'?shade(PCOL.binG,0.8):hexc('#e8b417');
    if(far){sqfrust(g,0,0,0.2,1.2,0.62,0.68,c,ML,0,0,1,0.47,0.53);return g.build()}
    sqfrust(g,0,0,0.2,1.2,0.62,0.685,c,ML,0,0,2,0.46,0.53);sqfrust(g,0,0,1.2,1.31,0.69,0.69,lid,ML,0,0,1,0.55,0.55);
    g.box(0,1.12,0.565,1.1,0.05,0.08,0,shade(c,0.7),ML);for(const sx of[-0.5,0.5])for(const sz of[-0.35,0.35]){g.box(sx,0.16,sz,0.08,0.08,0.08,0,I,M);g.cyl(sx,0.02,sz,0.085,0.085,0.06,8,hexc('#151515'),M,true)}
    return g.build()}
  if(kind==='signal'){// grey pole, black head with back plate and visors (lenses are a separate instanced mesh)
    if(far){g.cyl(0,0,0,0.075,0.075,3.0,5,PCOL.galv,ML,false);g.box(0,3.25,0,0.32,0.95,0.24,0,I,M);return g.build()}
    g.cyl(0,0,0,0.12,0.09,0.3,8,PCOL.galv,ML,false);g.cyl(0,0.3,0,0.076,0.07,2.75,8,PCOL.galv,ML,false);g.box(0,3.25,-0.05,0.3,0.92,0.2,0,I,M);g.box(0,3.25,-0.16,0.5,1.1,0.02,0,hexc('#202224'),M);
    for(let k=0;k<3;k++){const y=3.25+0.3-k*0.3+0.12;g.box(0,y,0.13,0.25,0.02,0.17,0,I,M);for(const sx of[-0.12,0.12])g.box(sx,y-0.06,0.13,0.015,0.12,0.17,0,I,M)}
    g.box(0,2.95,-0.02,0.1,0.1,0.1,0,PCOL.galv,ML);return g.build()}
  if(kind==='stopsign'){// pole + red octagon (STOP lettering is a sign-atlas quad in front)
    g.cyl(0,0,0,0.035,0.035,2.6,6,PCOL.galv,ML,true);const R=0.4;for(let k=0;k<8;k++){const a0=(k+0.5)/8*TAU,a1=(k+1.5)/8*TAU;g.tri([0,2.2,0.045],[Math.cos(a0)*R,2.2+Math.sin(a0)*R,0.045],[Math.cos(a1)*R,2.2+Math.sin(a1)*R,0.045],[0.5,0.5],[0,0],[1,0],hexc('#c8102e'),W,0);
      g.tri([0,2.2,0.035],[Math.cos(a1)*R,2.2+Math.sin(a1)*R,0.035],[Math.cos(a0)*R,2.2+Math.sin(a0)*R,0.035],[0.5,0.5],[0,0],[1,0],hexc('#9aa0a5'),ML,0)}return g.build()}
  if(kind==='scooter'){// parked 125 cc scooter, faces +z
    const body=hexc('#d9d9d6'),blk=hexc('#18191a');g.cyl(0,0.24,0.62,0.24,0.24,0.09,10,blk,M,true);g.cyl(0,0.22,-0.58,0.22,0.22,0.09,10,blk,M,true);
    sqfrust(g,0,-0.25,0.32,0.62,0.17,0.19,body,W,0,0,1,0.45,0.4);g.box(0,0.75,-0.3,0.3,0.1,0.62,0,blk,M);g.box(0,0.42,0.18,0.3,0.12,0.42,0,body,W);sqfrust(g,0,0.5,0.45,1.0,0.2,0.16,body,W,0,0,1,0.1,0.08);
    g.box(0,1.05,0.47,0.66,0.04,0.04,0,blk,M);g.box(0,0.65,0.72,0.08,0.06,0.08,0,hexc('#f2f2e6'),W,1,0.3);return g.build()}
  if(kind==='solar'){g.box(0,0.5,-0.5,1.0,0.06,2.0,0,C1,RECT[T.solar]);g.cyl(0,1.0,0.6,0.25,0.25,1.6,8,hexc('#d9d9d6'),ML,true);g.box(0,0.25,0,0.9,0.5,0.06,0,hexc('#9a9a96'),ML);return g.build()}
  if(kind==='ac'){g.box(0,0.35,0,0.9,0.6,0.35,0,hexc('#e6e6e3'),RECT[T.plain]);return g.build()}
  return g.build()}

/* ---------- distance-LOD instance pools ----------
   PPOOL[kind] = {mat: Float32Array(16·n) world matrices, xz: Float32Array(2·n), n, near: InstancedMesh, far: InstancedMesh|null, dN, dF, cast}
   updatePropLOD(cx,cz) copies the instances within dN into `near` and those within dF into `far`. */
const PPOOL={};
const PROP_D={lamp0:[95,210],lamp1:[95,210],lamp2:[120,240],bollard:[55,120],bollardB:[55,120],bench:[60,150],basket:[50,120],bin:[70,170],recycle:[70,170],signal:[110,220],stopsign:[80,0],scooter:[60,0],solar:[0,200],ac:[0,170]};
function propPool(kind,list,cast){if(!list.length)return;const n=list.length,mat=new Float32Array(n*16),xz=new Float32Array(n*2),m=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3(1,1,1),Y=new THREE.Vector3(0,1,0);
  list.forEach((p,i)=>{q.setFromAxisAngle(Y,p[3]||0);pv.set(p[0],p[1],p[2]);sv.setScalar(p[4]||1);m.compose(pv,q,sv);m.toArray(mat,i*16);xz[i*2]=p[0];xz[i*2+1]=p[2]});
  const d=PROP_D[kind]||[80,160],mk=geo=>{const im=new THREE.InstancedMesh(geo,MAT.atlas,n);im.count=0;im.frustumCulled=false;im.receiveShadow=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(im);return im};
  const P=PPOOL[kind]={mat,xz,n,dN:d[0],dF:d[1],cast:!!cast,near:d[0]>0?mk(propGeo(kind,false)):null,far:d[1]>0?mk(propGeo(kind,true)):null};if(P.near)P.near.castShadow=!!cast;return P}
let _plodX=1e9,_plodZ=1e9;
function updatePropLOD(cx,cz,force){if(!force&&Math.abs(cx-_plodX)<4&&Math.abs(cz-_plodZ)<4)return;_plodX=cx;_plodZ=cz;const scale=typeof Q!=='undefined'&&Q.dist?Math.min(1,Q.dist/240):1;
  for(const k in PPOOL){const P=PPOOL[k],dn=P.dN*P.dN*Math.max(0.6,scale),df=P.dF*P.dF*scale*scale,src=P.mat,xz=P.xz;let nn=0,nf=0;const an=P.near?P.near.instanceMatrix.array:null,af=P.far?P.far.instanceMatrix.array:null;
    for(let i=0;i<P.n;i++){const dx=xz[i*2]-cx,dz=xz[i*2+1]-cz,d=dx*dx+dz*dz;if(an&&d<dn){an.set(src.subarray(i*16,i*16+16),nn*16);nn++}else if(af&&d<df){af.set(src.subarray(i*16,i*16+16),nf*16);nf++}}
    if(P.near){P.near.count=nn;P.near.instanceMatrix.needsUpdate=true;P.near.castShadow=P.cast&&Q.sh>0}if(P.far){P.far.count=nf;P.far.instanceMatrix.needsUpdate=true}}}

/* ---------- street-spec lookups ---------- */
function streetAt(x,z,maxd){if(typeof roadProj!=='function')return null;const q=roadProj(x,z,maxd||14,r=>r.ty<=6&&r.name);return q?q.r.name:null}
function bollardStyle(x,z){const nm=streetAt(x,z,12);if(!nm)return'bollard';const sp=typeof streetSpec==='function'?streetSpec(nm):{};const st=sp.bollards&&sp.bollards.style;
  if(st)return /ball|green|cast/i.test(st)?'bollardB':'bollard';return nm==='Κασσαβέτη'?'bollardB':'bollard'}
/* nearest walkable line (any road, footway or path) → {x,z} of the closest point */
function nearestWay(x,z,maxd){let best=null,bd=maxd||25;for(const r of ROADS){const ps=r.ps;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];if(Math.min(a[0],b[0])>x+bd||Math.max(a[0],b[0])<x-bd||Math.min(a[1],b[1])>z+bd||Math.max(a[1],b[1])<z-bd)continue;
  const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1,u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1),qx=a[0]+dx*u,qz=a[1]+dz*u,d=Math.hypot(x-qx,z-qz)-(r.w||2)/2;if(d<bd){bd=d;best={x:qx,z:qz,r,tx:dx/Math.sqrt(L2),tz:dz/Math.sqrt(L2),d}}}}return best}

let lensMesh=null,poolMesh=null;const LENS=[];
function buildLightPools(){/* street-lamp light now comes from the night light map of 82_sky.js (addLight / MAP.lamps); kept as a no-op for old callers */}
function buildProps(){const L={lamp0:[],lamp1:[],lamp2:[],bollard:[],bollardB:[],bench:[],basket:[],bin:[],recycle:[],signal:[],stopsign:[],scooter:[]};
  for(const l of MAP.lamps){const x=l[0]/10,z=l[1]/10,st=l[2]|0;L['lamp'+st].push([x,groundY(x,z),z,st===2?l[3]+(l[4]>0?Math.PI:0)-Math.PI/2:hf(l[0]+l[1])*TAU]);addBoxC(x,z,st===1?0.17:0.15,'p');placed('lamp',x,z,'','map.lamps')}
  for(const e of EXTRA.lamp2){L.lamp2.push([e[0],terr(e[0],e[1]),e[1],hf(e[0])*TAU]);addBoxC(e[0],e[1],0.18,'p')}
  for(const b of MAP.bollards){const x=b[0]/10,z=b[1]/10;L[bollardStyle(x,z)].push([x,groundY(x,z),z,0]);placed('bollard',x,z,'','map.bollards')}
  // benches face the nearest walkway (path, pavement or street); NPCs sit on them through SEATS (75_npc.js)
  for(const b of MAP.props.bench){const x=b[0]/10,z=b[1]/10;const w=nearestWay(x,z,30);let yaw=hf(b[0])*TAU;if(w){if(w.d>0.4)yaw=Math.atan2(w.x-x,w.z-z);else yaw=Math.atan2(-w.tz,w.tx)}
    L.bench.push([x,groundY(x,z),z,yaw]);addSeg(x-Math.cos(yaw)*0.9,z+Math.sin(yaw)*0.9,x+Math.cos(yaw)*0.9,z-Math.sin(yaw)*0.9,'p');placed('bench',x,z,'','map.props.bench');
    if(typeof SEATS!=='undefined')for(const k of[-0.45,0.45])SEATS.push({x:x+Math.cos(yaw)*k-Math.sin(yaw)*0.07,z:z-Math.sin(yaw)*k-Math.cos(yaw)*0.07,yaw,seatH:0.46,kind:'bench',group:'bench'+b[0]+','+b[1]})}
  for(const b of MAP.props.basket){const x=b[0]/10,z=b[1]/10;const w=nearestWay(x,z,12);L.basket.push([x,groundY(x,z),z,w?Math.atan2(w.x-x,w.z-z):0]);addBoxC(x,z,0.15,'p');placed('bin',x,z,'litter','map.props.basket')}
  for(const b of MAP.props.recycle){const x=b[0]/10,z=b[1]/10;const q=typeof roadProj==='function'?roadProj(x,z,10,r=>r.ty<=5):null;L.recycle.push([x,groundY(x,z),z,q?Math.atan2(q.tx,q.tz)+Math.PI/2:hf(b[1])*TAU]);addBoxC(x,z,0.6,'p');placed('bin',x,z,'recycling','map.props.recycle')}
  // ESTIMATED (not in open data): 1100 l refuse bins at the kerb of residential streets, roughly every 70 m on alternate sides; skips junctions, crossings, bays
  if(typeof roadPoint==='function')for(const r of ROADS){if(!r.fr||r.ty<3||r.ty>4||r.w<5.5||r.fr.L<30)continue;const mid=r.fr.ps[r.fr.ps.length>>1];if(!inFocus(mid[0],mid[1]))continue;let h=r.i*53+11;
    for(let s=18+hf(h++)*30;s<r.fr.L-12;s+=55+hf(h++)*40){const sd=hf(h++)<0.5?1:-1;if(r.park&&r.park[sd])continue;if(typeof jclear==='function'&&(!jclear(r,s,6)||!xclear(r,s,6)))continue;const p=roadPoint(r,s,sd*(r.w/2-0.62));const x=p[0],z=p[2];
      if(lvl(x,z)>0.05||collide({x,z},0.7,null))continue;const blue=hf(h++)<0.35;(blue?L.recycle:L.bin).push([x,p[1]-0.02,z,p[3]+Math.PI/2*sd]);addBoxC(x,z,0.6,'p')}}
  // ESTIMATED: parked scooters along the shopping streets (very common in Kifisia)
  MAP.street_trees.forEach((t,i)=>{if(i%17===3&&inFocus(t[0]/10,t[1]/10)){const x=t[0]/10,z=t[1]/10;const q=typeof roadProj==='function'?roadProj(x,z,10,r=>r.ty<=5):null;if(!q)return;const sd=q.t>=0?1:-1,hw=q.r.w/2;if(q.r.park&&q.r.park[sd])return;
    const p=roadPoint(q.r,q.s+1.6,sd*(hw-0.55));if(lvl(p[0],p[2])>0.05||collide({x:p[0],z:p[2]},0.5,null))return;L.scooter.push([p[0],p[1],p[2],p[3]+(sd>0?0.25:Math.PI-0.25)])}});
  // traffic lights at the real junctions: a pole on each side of the street
  for(const s of MAP.props.signal){const x=s[0]/10,z=s[1]/10,ang=s[2],w=s[3];const dx=Math.cos(ang),dz=Math.sin(ang);placed('signal',x,z,'','map.props.signal');for(const sd of[-1,1]){let px=x+dx*sd*5-dz*sd*(w/2+0.9),pz=z+dz*sd*5+dx*sd*(w/2+0.9);
    const yaw=Math.atan2(-dx*sd,-dz*sd);L.signal.push([px,groundY(px,pz),pz,yaw]);LENS.push({x:px,z:pz,y:groundY(px,pz)+3.25,yaw,ang,group:null});addBoxC(px,pz,0.12,'p')}}
  for(const s of MAP.props.stop){const x=s[0]/10,z=s[1]/10,ang=s[2],w=s[3];const px=x-Math.sin(ang)*(w/2+0.8),pz=z+Math.cos(ang)*(w/2+0.8);const nx=-Math.cos(ang),nz=-Math.sin(ang);L.stopsign.push([px,groundY(px,pz),pz,Math.atan2(nx,nz)]);
    const ch=chunkAt(px,pz);signAt(ch,px+nx*0.052,groundY(px,pz)+2.2,pz+nz*0.052,nx,nz,0.56,0.56,null,0,stopSlot());addBoxC(px,pz,0.06,'p');placed('stop_sign',x,z,'','map.props.stop')}
  for(const k in L)if(L[k].length)propPool(k,L[k],k.startsWith('lamp')||k==='signal'||k==='bench');
  if(typeof ROOFI!=='undefined'){propPool('solar',ROOFI.solar.map(p=>[p[0],p[1],p[2],p[3]]),false);propPool('ac',ROOFI.ac.map(p=>[p[0],p[1],p[2],p[3]]),false)}
  updatePropLOD(MAP.key.spawn?MAP.key.spawn[0]:0,MAP.key.spawn?MAP.key.spawn[1]:0,true);
  // signal lenses: one instanced mesh, colour per instance updated by the junction cycle
  const lg=new THREE.SphereGeometry(0.1,8,6);lensMesh=new THREE.InstancedMesh(lg,new THREE.MeshBasicMaterial({color:0xffffff}),Math.max(1,LENS.length*3));const m=new THREE.Matrix4();
  LENS.forEach((l,i)=>{for(let k=0;k<3;k++){const fx=Math.sin(l.yaw),fz=Math.cos(l.yaw);m.makeTranslation(l.x+fx*0.13,l.y+0.3-k*0.3,l.z+fz*0.13);lensMesh.setMatrixAt(i*3+k,m);lensMesh.setColorAt(i*3+k,new THREE.Color(0x222222))}});lensMesh.count=LENS.length*3;lensMesh.frustumCulled=false;scene.add(lensMesh);
  // group lenses into junctions (signals within 35 m share one cycle)
  const groups=[];for(const l of LENS){let g=groups.find(g=>Math.hypot(g.x-l.x,g.z-l.z)<35);if(!g){g={x:l.x,z:l.z,ang:l.ang,off:hf(groups.length*97)*30};groups.push(g)}l.group=g;l.axis=Math.abs(Math.cos(l.ang-g.ang))>0.7?0:1}SIGNALS=groups}
let _stopSlot=null;function stopSlot(){if(!_stopSlot)_stopSlot=newSlot('STOP','#c8102e','#fff','stop');return _stopSlot}
function signalState(g,axis,t){const c=(t+g.off)%44;const ph=c<19?0:c<22?0.5:c<41?1:1.5;if(axis===0)return ph===0?'g':ph===0.5?'a':'r';return ph===1?'g':ph===1.5?'a':'r'}
function updateLenses(t){if(!lensMesh||!LENS.length)return;const col=new THREE.Color();LENS.forEach((l,i)=>{const s=signalState(l.group,l.axis,t);lensMesh.setColorAt(i*3,col.setHex(s==='r'?0xff2a1a:0x2a0a08));lensMesh.setColorAt(i*3+1,col.setHex(s==='a'?0xffb400:0x2a2008));lensMesh.setColorAt(i*3+2,col.setHex(s==='g'?0x2aff7a:0x082a14))});lensMesh.instanceColor.needsUpdate=true}

/* ---------- bus stops, kiosks, fountains, street-name plates (few, so they are chunk geometry) ---------- */
function buildFurniture(){
  // bus stops: OASA-type shelter (galvanised frame, glass back and end panel, perch bench, lit advert panel) where the pavement is deep enough, otherwise only the stop pole.
  for(const b of MAP.props.bus){const x=b[0]/10,z=b[1]/10;const r=nearestRoad(x,z);if(!r)continue;const ch=chunkAt(x,z),O=ch.o;const y=groundY(x,z);const nx=r.nx,nz=r.nz,ux=-nz,uz=nx,ang=Math.atan2(nx,nz);placed('bus_stop',x,z,b[2]||'','map.props.bus');
    const P=(u,v)=>[x+ux*u-nx*v,z+uz*u-nz*v];// u along the kerb, v away from the road
    const deep=lvl(P(0,1.7)[0],P(0,1.7)[1])>0.1&&lvl(P(-1.8,1.6)[0],P(-1.8,1.6)[1])>0.1&&lvl(P(1.8,1.6)[0],P(1.8,1.6)[1])>0.1&&!collide({x:P(0,1.3)[0],z:P(0,1.3)[1]},0.9,null);
    const pole=P(2.6,0.15),fr=PCOL.dkgrey;
    if(deep){const v0=0.55,v1=1.75;for(const u of[-1.75,1.75])for(const v of[v0,v1]){const p=P(u,v);O.box(p[0],y+1.2,p[1],0.07,2.4,0.07,ang,fr,RECT[T.metalL])}
      const rf=P(0,(v0+v1)/2);O.box(rf[0],y+2.44,rf[1],3.8,0.07,1.6,ang,hexc('#c9cdd1'),RECT[T.metalL]);const rf2=P(0,v0-0.08);O.box(rf2[0],y+2.42,rf2[1],3.8,0.14,0.05,ang,fr,RECT[T.metalL]);
      const bk=P(0,v1);O.box(bk[0],y+1.3,bk[1],3.45,1.9,0.025,ang,hexc('#b9cbd2'),RECT[T.glassR]);O.box(bk[0],y+0.3,bk[1],3.45,0.06,0.05,ang,fr,RECT[T.metalL]);O.box(bk[0],y+2.25,bk[1],3.45,0.06,0.05,ang,fr,RECT[T.metalL]);
      const sdp=P(-1.75,(v0+v1)/2);O.box(sdp[0],y+1.3,sdp[1],0.03,1.9,1.1,ang,hexc('#b9cbd2'),RECT[T.glassR]);
      const ad=P(1.75,(v0+v1)/2+0.05);O.box(ad[0],y+1.15,ad[1],0.16,1.85,1.15,ang,fr,RECT[T.metalL]);const adf=P(1.75+0.085,(v0+v1)/2+0.05);
      ch.o.wall(adf[0]-nx*0.5,adf[1]-nz*0.5,adf[0]+nx*0.5,adf[1]+nz*0.5,y+0.35,y+0.35,y+1.95,y+1.95,ux,uz,0,1,0,1,C1,RECT[T.ad],1);
      const bn=P(0,v1-0.28);O.box(bn[0],y+0.62,bn[1],2.2,0.05,0.22,ang,hexc('#aeb4b9'),RECT[T.metalL]);for(const u of[-0.9,0.9]){const q=P(u,v1-0.15);O.box(q[0],y+0.31,q[1],0.05,0.62,0.05,ang,fr,RECT[T.metalL])}
      const a=P(-1.75,v1),c=P(1.75,v1);addSeg(a[0],a[1],c[0],c[1],'p');const e=P(-1.75,v0);addSeg(a[0],a[1],e[0],e[1],'p');const f=P(1.75,v0);addSeg(c[0],c[1],f[0],f[1],'p');
      ADDL(P(0,1.1)[0],P(0,1.1)[1],5,1,0.5)}
    O.cyl(pole[0],y,pole[1],0.04,0.04,2.75,8,PCOL.galv,RECT[T.metalL],true);addBoxC(pole[0],pole[1],0.06,'p');
    O.box(pole[0]+nx*0.0,y+2.42,pole[1],0.66,0.62,0.03,ang,hexc('#1d4f9a'),RECT[T.white]);
    signAt(ch,pole[0]+nx*0.02,y+2.42,pole[1]+nz*0.02,nx,nz,0.6,0.3,null,1,busSlot());signAt(ch,pole[0]-nx*0.02,y+2.42,pole[1]-nz*0.02,-nx,-nz,0.6,0.3,null,1,busSlot());
    const ns=stopNameSlot(b[2]);if(ns){O.box(pole[0],y+1.98,pole[1],0.86,0.26,0.025,ang,hexc('#1d4f9a'),RECT[T.white]);signAt(ch,pole[0]+nx*0.016,y+1.98,pole[1]+nz*0.016,nx,nz,0.82,0.23,null,1,ns);signAt(ch,pole[0]-nx*0.016,y+1.98,pole[1]-nz*0.016,-nx,-nz,0.82,0.23,null,1,ns)}}
  // kiosks (periptera): booth with magazine-covered walls under a deep overhanging roof, drinks fridge, ice-cream freezer and a newspaper stand in front
  for(const k of MAP.props.kiosk){const x=k[0]/10,z=k[1]/10;const r=nearestRoad(x,z);const nx=r?r.nx:0,nz=r?r.nz:1,ux=-nz,uz=nx,ang=Math.atan2(nx,nz);const ch=chunkAt(x,z);const y=groundY(x,z);const O=ch.o;placed('kiosk',x,z,k[2]||'','map.props.kiosk');
    const P=(u,v)=>[x+ux*u+nx*v,z+uz*u+nz*v];// v toward the street
    O.box(x,y+0.06,z,1.9,0.12,1.7,ang,hexc('#8f9397'),RECT[T.concrete]);O.box(x,y+1.25,z,1.6,2.3,1.4,ang,hexc('#e2ddd0'),RECT[T.stuccoL]);
    const f=P(0,0.705);O.wall(f[0]-ux*0.8,f[1]-uz*0.8,f[0]+ux*0.8,f[1]+uz*0.8,y+0.15,y+0.15,y+2.35,y+2.35,nx,nz,0,1,0,1,C1,RECT[T.kiosk],1);
    for(const sd of[-1,1]){const s=P(sd*0.805,0);O.wall(s[0]-nx*0.7,s[1]-nz*0.7,s[0]+nx*0.7,s[1]+nz*0.7,y+0.15,y+0.15,y+2.35,y+2.35,ux*sd,uz*sd,0,0.9,0,1,C1,RECT[T.kiosk],0.6)}
    const rf=P(0,0.25);O.box(rf[0],y+2.48,rf[1],2.9,0.14,2.5,ang,hexc('#f0eee8'),RECT[T.white]);O.box(rf[0],y+2.405,rf[1],2.92,0.02,2.52,ang,hexc('#1e4c8f'),RECT[T.white]);
    const sg=P(0,0.25);O.box(sg[0],y+2.75,sg[1],2.0,0.4,0.9,ang,hexc('#1e4c8f'),RECT[T.white]);const ks=kioskSlot(k[2]);if(ks){const sf=P(0,0.25+0.452);signAt(ch,sf[0],y+2.75,sf[1],nx,nz,1.9,0.36,null,1,ks)}
    const fr=P(1.25,0.35);O.box(fr[0],y+0.95,fr[1],0.66,1.9,0.66,ang,hexc('#c8102e'),RECT[T.white]);const frf=P(1.25,0.35+0.335);O.wall(frf[0]-ux*0.28,frf[1]-uz*0.28,frf[0]+ux*0.28,frf[1]+uz*0.28,y+0.3,y+0.3,y+1.7,y+1.7,nx,nz,0,1,0,1,hexc('#cfe3ea'),RECT[T.glassR],1);
    const ic=P(-0.2,1.3);O.box(ic[0],y+0.42,ic[1],1.05,0.84,0.62,ang,hexc('#f4f4f2'),RECT[T.white]);O.box(ic[0],y+0.855,ic[1],1.0,0.03,0.58,ang,hexc('#bcd3db'),RECT[T.glassR],1,1);
    const ns=P(-1.2,0.5);O.box(ns[0],y+0.55,ns[1],0.5,1.1,0.4,ang,hexc('#d9d4c7'),RECT[T.ad]);
    addBoxC(x,z,0.95,'b');addBoxC(fr[0],fr[1],0.34,'p');addBoxC(ic[0],ic[1],0.4,'p');ADDL(P(0,1.4)[0],P(0,1.4)[1],6,1,0.6);
    INTER.push({type:'kiosk',x:P(0,2.1)[0],z:P(0,2.1)[1],label:'Buy a frappé'})}
  // fountains: octagonal marble basin with a moving water surface and a central bowl (amenity=fountain), or a cast-iron drinking fountain (drinking_water)
  for(const f of MAP.props.fountain){const x=f[0]/10,z=f[1]/10;const ch=chunkAt(x,z);const y=groundY(x,z);placed('fountain',x,z,'','map.props.fountain');
    if(f[2]){const R=1.7,stone=hexc('#ddd6c8');for(let k=0;k<8;k++){const a0=(k+0.5)/8*TAU,a1=(k+1.5)/8*TAU;const A=[x+Math.cos(a0)*R,z+Math.sin(a0)*R],B=[x+Math.cos(a1)*R,z+Math.sin(a1)*R],nx=Math.cos((k+1)/8*TAU),nz=Math.sin((k+1)/8*TAU);
        ch.o.wall(A[0],A[1],B[0],B[1],y-0.05,y-0.05,y+0.5,y+0.5,nx,nz,0,1.3,0,0.55,stone,RECT[TM.marble],0);const Ai=[x+Math.cos(a0)*(R-0.22),z+Math.sin(a0)*(R-0.22)],Bi=[x+Math.cos(a1)*(R-0.22),z+Math.sin(a1)*(R-0.22)];
        ch.o.wall(Ai[0],Ai[1],Bi[0],Bi[1],y+0.1,y+0.1,y+0.5,y+0.5,-nx,-nz,0,1.2,0,0.4,stone,RECT[TM.marble],0);ch.o.hq([A[0],y+0.5,A[1]],[B[0],y+0.5,B[1]],[Bi[0],y+0.5,Bi[1]],[Ai[0],y+0.5,Ai[1]],[0,0],[1.3,0],[1.3,0.22],[0,0.22],shade(stone,1.04),RECT[TM.marble],0);
        ch.o.tri([x,y+0.38,z],[Bi[0],y+0.38,Bi[1]],[Ai[0],y+0.38,Ai[1]],[x/3,z/3],[Bi[0]/3,Bi[1]/3],[Ai[0]/3,Ai[1]/3],C1,RECT[T.water],0,true)}
      const g=new GB();lathe(g,[[0.32,0],[0.3,0.12],[0.18,0.2],[0.14,0.9],[0.2,0.98],[0.55,1.05],[0.6,1.16],[0.5,1.18],[0.16,1.26],[0.1,1.5],[0.14,1.56],[0,1.6]],14,stone,RECT[TM.marble],0,0,0);
      const gm=g.build();const pos=gm.attributes.position;for(let i=0;i<pos.count;i++)pos.setXYZ(i,pos.getX(i)+x,pos.getY(i)+y+0.1,pos.getZ(i)+z);const ms=new THREE.Mesh(gm,MAT.atlas);ms.castShadow=true;ms.receiveShadow=true;scene.add(ms);ch.meshes&&ch.meshes.push(ms);
      ch.o.cyl(x,y+1.16,z,0.48,0.48,0.01,14,C1,RECT[T.water],true);addBoxC(x,z,R,'p')}
    else{const g=new GB(),I=hexc('#2b3a33');lathe(g,[[0.2,0],[0.2,0.08],[0.14,0.12],[0.12,0.75],[0.16,0.8],[0.16,0.86],[0.1,0.9],[0.1,1.0],[0.0,1.02]],10,I,RECT[T.metal],0);g.box(0.13,0.82,0,0.18,0.04,0.04,0,hexc('#b08d57'),RECT[T.metalL]);
      g.cyl(0.28,0.0,0,0.22,0.24,0.22,10,hexc('#c9c2b4'),RECT[TM.marble],true);const gm=g.build();const pos=gm.attributes.position;for(let i=0;i<pos.count;i++)pos.setXYZ(i,pos.getX(i)+x,pos.getY(i)+y,pos.getZ(i)+z);const ms=new THREE.Mesh(gm,MAT.atlas);ms.castShadow=true;scene.add(ms);ch.meshes&&ch.meshes.push(ms);addBoxC(x,z,0.2,'p')}}
  // blue street-name plates (Greek + Latin) at junction corners in the focus area
  const done=new Set();for(const [k,lst] of ROADNODES){if(lst.length<3)continue;const ns=[...new Set(lst.map(e=>ROADS[e.ri]).filter(r=>r.ty<=4&&r.name).map(r=>r.name))];if(!ns.length)continue;const [x,z]=k.split(',').map(v=>+v/10);if(!inFocus(x,z))continue;
    const key=Math.round(x/25)+','+Math.round(z/25);if(done.has(key))continue;done.add(key);let best=null;for(let a=0;a<12;a++){const px=x+Math.cos(a/12*TAU)*7.5,pz=z+Math.sin(a/12*TAU)*7.5;if(lvl(px,pz)>0.1&&!collide({x:px,z:pz},0.3,null)){best=[px,pz];break}}if(!best)continue;
    const ch=chunkAt(best[0],best[1]);const y=groundY(best[0],best[1]);ch.o.cyl(best[0],y,best[1],0.04,0.04,2.9,8,PCOL.galv,RECT[T.metalL],true);addBoxC(best[0],best[1],0.05,'p');
    ns.slice(0,2).forEach((nm,ii)=>{const rd=lst.map(e=>ROADS[e.ri]).find(r=>r.name===nm);const p0=rd.ps[0],p1=rd.ps[rd.ps.length-1];const dx=p1[0]-p0[0],dz=p1[1]-p0[1],l=Math.hypot(dx,dz)||1;const nx=-dz/l,nz=dx/l;
      const rc=streetSlot(nm);if(rc){ch.o.box(best[0],y+2.6-ii*0.38,best[1],1.24,0.36,0.03,Math.atan2(nx,nz),hexc('#1d4f9a'),RECT[T.white]);signAt(ch,best[0]+nx*0.02,y+2.6-ii*0.38,best[1]+nz*0.02,nx,nz,1.2,0.34,null,0,rc);signAt(ch,best[0]-nx*0.02,y+2.6-ii*0.38,best[1]-nz*0.02,-nx,-nz,1.2,0.34,null,0,rc)}})}}
let _busSlot=null;function busSlot(){if(!_busSlot)_busSlot=newSlot('ΣΤΑΣΗ','#1d4f9a','#fff','plain');return _busSlot}
const STOPSLOTS={};function stopNameSlot(nm){if(!nm)return null;if(!(nm in STOPSLOTS))STOPSLOTS[nm]=newSlot([nm.toUpperCase(),greeklish(nm).toUpperCase()],'#1d4f9a','#fff','street');return STOPSLOTS[nm]}
let _kioskSlot={};function kioskSlot(nm){const t=nm&&nm.length>2&&!/^kiosk$/i.test(nm)?nm:'ΠΕΡΙΠΤΕΡΟ';if(!(t in _kioskSlot))_kioskSlot[t]=newSlot(t,'#1e4c8f','#ffffff','plain');return _kioskSlot[t]}
const STREETSLOTS={};function streetSlot(nm){if(!(nm in STREETSLOTS))STREETSLOTS[nm]=newSlot([nm.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,''),greeklish(nm).toUpperCase()],'#1d4f9a','#fff','street');return STREETSLOTS[nm]}
function nearestRoad(x,z,maxd){maxd=maxd||30;let best=null;for(const r of ROADS){if(r.ty>4)continue;const ps=r.ps;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];if(Math.abs(a[0]-x)>maxd+80&&Math.abs(b[0]-x)>maxd+80)continue;const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;const u=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1);const qx=a[0]+dx*u,qz=a[1]+dz*u;const d=Math.hypot(x-qx,z-qz);
  if(d<maxd&&(!best||d<best.d)){const l=Math.sqrt(L2);let nx=-dz/l,nz=dx/l;if((qx-x)*nx+(qz-z)*nz<0){nx=-nx;nz=-nz}best={d,r,nx,nz,qx,qz,ang:Math.atan2(dz,dx)}}}}return best}
