'use strict';
/* Grand Kifisia — vehicles (team:cars). Procedural LOFTED car bodies (cross-sections along the car: wheel arches, bonnet/roof/boot curvature,
   A/B/C pillars, inset glass, seams, grille, light clusters, Greek plates), instanced with a near and a far LOD, one shared wheel mesh,
   working lights (head/tail/brake/indicator/reverse) that glow at night with headlight pools on the road, exotic cars, scooters, and the Line 1 train.
   Public API (docs/VEHICLES.md): CARTYPES, CARS, carMeshes, addCar, syncCar, flushCars, carPush, initCars, attachDriver, seatPos, vehiclesReady,
   carLights, TRAIN, buildTrain, placeTrain, updateTrain. */

/* ------------------------------------------------------------------ helpers */
const lin=h=>{const c=new THREE.Color(h);c.convertSRGBToLinear();return[c.r,c.g,c.b]};
/* smooth keyframe curve: keys [[u,y,corner?]] with u = 0 rear … 1 front; returns f(z) for z in metres (-L/2 … L/2). Monotone-limited cubic Hermite. */
function vCurve(keys,L){const n=keys.length,zs=keys.map(k=>(k[0]-0.5)*L),ys=keys.map(k=>k[1]),ml=new Float64Array(n),mr=new Float64Array(n);
  for(let i=0;i<n;i++){const d0=i>0?(ys[i]-ys[i-1])/((zs[i]-zs[i-1])||1e-6):null,d1=i<n-1?(ys[i+1]-ys[i])/((zs[i+1]-zs[i])||1e-6):null;
    if(d0===null){ml[i]=mr[i]=d1}else if(d1===null){ml[i]=mr[i]=d0}else if(keys[i][2]){ml[i]=d0;mr[i]=d1}
    else if(d0*d1<=0){ml[i]=mr[i]=0}else{const s=Math.sign(d0),m=Math.min(Math.abs(d0+d1)/2,3*Math.min(Math.abs(d0),Math.abs(d1)));ml[i]=mr[i]=s*m}}
  return z=>{if(z<=zs[0])return ys[0];if(z>=zs[n-1])return ys[n-1];let i=1;while(zs[i]<z)i++;const h=zs[i]-zs[i-1],t=(z-zs[i-1])/h,t2=t*t,t3=t2*t;
    return(2*t3-3*t2+1)*ys[i-1]+(t3-2*t2+t)*h*mr[i-1]+(-2*t3+3*t2)*ys[i]+(t3-t2)*h*ml[i]}}
/* vertex builder: position, normal, colour (linear), aux = (material kind, light group, plateU, plateV), dw = dent weights (front, rear) */
const VK={fixed:0,paint:1,chrome:2,gloss:3};
class VB{constructor(){this.p=[];this.n=[];this.c=[];this.a=[];this.i=[];this.vc=0}
  v(p,n,col,aux){this.p.push(p[0],p[1],p[2]);this.n.push(n[0],n[1],n[2]);this.c.push(col[0],col[1],col[2]);this.a.push(aux[0],aux[1],aux[2],aux[3]);return this.vc++}
  /* quad a,b,c,d with optional per-vertex normals; winding fixed so the face looks along the given normal */
  quad(a,b,c,d,col,aux,na,nb,nc,nd,auxs){const fn=vnrm(a,b,c,d);if(!na){na=nb=nc=nd=fn}const s=fn[0]*(na[0]+nc[0])+fn[1]*(na[1]+nc[1])+fn[2]*(na[2]+nc[2]);
    const A=auxs||[aux,aux,aux,aux];const o=this.vc;this.v(a,na,col,A[0]);this.v(b,nb,col,A[1]);this.v(c,nc,col,A[2]);this.v(d,nd,col,A[3]);
    if(s>=0)this.i.push(o,o+1,o+2,o,o+2,o+3);else this.i.push(o,o+2,o+1,o,o+3,o+2)}
  tri(a,b,c,col,aux,n){const fn=vnrm(a,b,c,c);const N=n||fn;const s=fn[0]*N[0]+fn[1]*N[1]+fn[2]*N[2];const o=this.vc;this.v(a,N,col,aux);this.v(b,N,col,aux);this.v(c,N,col,aux);if(s>=0)this.i.push(o,o+1,o+2);else this.i.push(o,o+2,o+1)}
  /* box centred at c, size s, rotated rx about X then ry about Y */
  box(c,s,col,aux,rx,ry,faces){const hx=s[0]/2,hy=s[1]/2,hz=s[2]/2,cx=Math.cos(rx||0),sx=Math.sin(rx||0),cy=Math.cos(ry||0),sy=Math.sin(ry||0);
    const T=(x,y,z)=>{const y1=y*cx-z*sx,z1=y*sx+z*cx;return[c[0]+x*cy+z1*sy,c[1]+y1,c[2]-x*sy+z1*cy]};const N=(x,y,z)=>{const p=T(x,y,z),o=T(0,0,0);return[p[0]-o[0],p[1]-o[1],p[2]-o[2]]};
    const F=[[[1,0,0],[[hx,-hy,-hz],[hx,hy,-hz],[hx,hy,hz],[hx,-hy,hz]]],[[-1,0,0],[[-hx,-hy,hz],[-hx,hy,hz],[-hx,hy,-hz],[-hx,-hy,-hz]]],[[0,1,0],[[-hx,hy,-hz],[-hx,hy,hz],[hx,hy,hz],[hx,hy,-hz]]],
      [[0,-1,0],[[-hx,-hy,hz],[-hx,-hy,-hz],[hx,-hy,-hz],[hx,-hy,hz]]],[[0,0,1],[[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz],[-hx,-hy,hz]]],[[0,0,-1],[[-hx,-hy,-hz],[-hx,hy,-hz],[hx,hy,-hz],[hx,-hy,-hz]]]];
    F.forEach((f,k)=>{if(faces&&faces.indexOf(k)<0)return;const n=N(f[0][0],f[0][1],f[0][2]);const q=f[1].map(p=>T(p[0],p[1],p[2]));this.quad(q[0],q[1],q[2],q[3],Array.isArray(col[0])?col[k]:col,aux,n,n,n,n)})}
  /* cylinder along X (wheels, lamps): centre c, radius r, half width hw */
  cylX(c,r,hw,seg,col,aux,capOut){for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;const P=(a,x)=>[c[0]+x,c[1]+Math.sin(a)*r,c[2]+Math.cos(a)*r];const n0=[0,Math.sin(a0),Math.cos(a0)],n1=[0,Math.sin(a1),Math.cos(a1)];
    this.quad(P(a0,-hw),P(a1,-hw),P(a1,hw),P(a0,hw),col,aux,n0,n1,n1,n0);if(capOut)this.tri([c[0]+hw*capOut,c[1],c[2]],P(a0,hw*capOut),P(a1,hw*capOut),col,aux,[capOut,0,0])}}
  build(L){const n=this.vc,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setAttribute('aux',new THREE.Float32BufferAttribute(this.a,4));
    const dw=new Float32Array(n*2);if(L){const h=L/2;for(let i=0;i<n;i++){const z=this.p[i*3+2];dw[i*2]=sstep((z-(h-0.95))/0.95);dw[i*2+1]=sstep((-(h-0.95)-z)/0.95)}}
    g.setAttribute('dw',new THREE.BufferAttribute(dw,2));g.setIndex(n>65535?new THREE.Uint32BufferAttribute(this.i,1):new THREE.Uint16BufferAttribute(this.i,1));g.computeBoundingSphere();return g}}
function vnrm(a,b,c,d){const ux=c[0]-a[0],uy=c[1]-a[1],uz=c[2]-a[2],vx=d[0]-b[0],vy=d[1]-b[1],vz=d[2]-b[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  if(Math.abs(nx)+Math.abs(ny)+Math.abs(nz)<1e-12){const wx=b[0]-a[0],wy=b[1]-a[1],wz=b[2]-a[2];nx=wy*uz-wz*uy;ny=wz*ux-wx*uz;nz=wx*uy-wy*ux}const l=Math.hypot(nx,ny,nz)||1;return[nx/l,ny/l,nz/l]}
const AUX0=[0,0,-1,0];const ax=(k,lg,pu,pv)=>[k,lg||0,pu===undefined?-1:pu,pv||0];

/* ------------------------------------------------------------------ car types */
/* Every car is described by profiles along its length (u: 0 = rear bumper … 1 = front bumper):
   bot = underside, belt = shoulder / window base (= bonnet and boot edge where there is no cabin), top = greenhouse top (≤ belt where there is no cabin),
   hw = plan half-width fraction. Glass zones: windshield (wsT … wsB), side windows (rwT … wsT) minus pillars `pil`, rear window (rwB … rwT). */
const CARTYPES={};
const COLS={white:'#eceeef',pearl:'#e4e1d8',silver:'#a9adb2',grey:'#6b6f74',dgrey:'#3a3d42',black:'#131416',red:'#8e1418',blue:'#1f3d6e',navy:'#1a2236',green:'#33473a',beige:'#b9ad94',brown:'#4a3328',yellow:'#f2c200',orange:'#d4561c',sky:'#5d86b0',bronze:'#7c6a52'};
const PAL_COMMON=['white','white','white','silver','silver','silver','grey','grey','dgrey','black','black','black','red','blue','navy','pearl','beige','green','sky','brown','bronze','white','silver','grey'];
function defCar(k,S){S.key=k;S.cls=S.cls||'car';S.track=S.track||S.W-0.27;S.ww=S.ww||0.205;S.ra=S.ra||S.wr+0.055;S.zf=S.L/2-S.fo;S.zr=S.zf-S.wb;
  S.rwf=S.rwf||0.76;S.crR=S.crR===undefined?0.03:S.crR;S.crB=S.crB===undefined?0.035:S.crB;S.sx=S.sx||[0.955,0.988,1,0.993,0.972,0.945];S.pil=S.pil||[];if(S.pilBlack===undefined)S.pilBlack=1;S.doors=S.doors||[];
  if(S.bot){S.fbot=vCurve(S.bot,S.L);S.fbelt=vCurve(S.belt,S.L);S.ftop=vCurve(S.top,S.L);S.fhw=vCurve(S.hw,S.L)}
  S.wheels=S.wheels||[[-S.track/2,S.zf,1],[S.track/2,S.zf,1],[-S.track/2,S.zr,0],[S.track/2,S.zr,0]];
  S.seat=S.seat||[0.36,0.5,0];S.seat[0]=Math.abs(S.seat[0]);S.seats=S.seats||[S.seat,[-S.seat[0],S.seat[1],S.seat[2]],[S.seat[0],S.seat[1]+0.03,S.seat[2]-0.85],[-S.seat[0],S.seat[1]+0.03,S.seat[2]-0.85]];
  S.door=S.door||{hinge:[-S.W/2+0.04,0,S.seat[2]+0.62],len:1.05};S.dyn=Object.assign({acc:6.5,vmax:48,brake:11,grip:1,steer:0.62,mass:1200,cg:0.55,eng:{idle:820,red:6300,gears:5,voice:'i4',vol:1}},S.dyn||{});
  S.cap=S.cap||60;CARTYPES[k]=S;return S}
/* everyday Athens mix */
defCar('mini',{name:'Supermini',L:3.62,W:1.66,H:1.50,wb:2.32,fo:0.71,wr:0.29,ww:0.185,rwf:0.8,crR:0.025,
  bot:[[0,0.43],[0.04,0.33],[0.1,0.215],[0.9,0.215],[0.97,0.3],[1,0.36]],
  belt:[[0,0.94],[0.05,0.99],[0.16,1.0],[0.5,0.975],[0.74,0.945],[0.8,0.92],[0.92,0.85],[0.985,0.75],[1,0.66]],
  top:[[0,0.95],[0.02,1.16],[0.07,1.41],[0.13,1.48],[0.3,1.5],[0.52,1.49],[0.6,1.43],[0.67,1.3],[0.785,0.94,1],[0.795,0]],
  hw:[[0,0.87],[0.025,0.94],[0.07,0.985],[0.16,1],[0.82,1],[0.93,0.97],[0.985,0.9],[1,0.83]],
  wsB:0.785,wsT:0.6,rwT:0.1,rwB:0.004,pil:[[0.405,0.45],[0.1,0.2]],doors:[0.69,0.43,0.255],bon:0.79,hl:{w:0.36,h:0.14,round:1},tl:{w:0.2,h:0.24},gr:{w:0.5,y0:0.5,y1:0.58},seat:[-0.35,0.52,-0.08],cap:120,
  dyn:{acc:5.4,vmax:44,steer:0.66,mass:950,eng:{idle:880,red:6400,gears:5,voice:'i3',vol:0.8}}});
defCar('hatch',{name:'Hatchback',L:4.05,W:1.75,H:1.46,wb:2.56,fo:0.84,wr:0.31,rwf:0.76,
  bot:[[0,0.42],[0.035,0.33],[0.1,0.215],[0.9,0.215],[0.97,0.3],[1,0.36]],
  belt:[[0,0.93],[0.05,0.985],[0.16,1.0],[0.5,0.97],[0.76,0.935],[0.82,0.915],[0.93,0.84],[0.985,0.73],[1,0.64]],
  top:[[0,0.95],[0.04,1.12],[0.1,1.31],[0.165,1.41],[0.3,1.452],[0.5,1.46],[0.6,1.435],[0.66,1.35],[0.79,0.935,1],[0.8,0]],
  hw:[[0,0.86],[0.02,0.935],[0.06,0.985],[0.15,1],[0.82,1],[0.93,0.975],[0.985,0.9],[1,0.83]],
  wsB:0.79,wsT:0.62,rwT:0.15,rwB:0.004,pil:[[0.405,0.452],[0.15,0.275]],doors:[0.695,0.43,0.255],bon:0.795,hl:{w:0.42,h:0.12},tl:{w:0.28,h:0.2},gr:{w:0.66,y0:0.47,y1:0.6},seat:[-0.36,0.5,-0.05],cap:200});
defCar('sedan',{name:'Saloon',L:4.62,W:1.78,H:1.46,wb:2.68,fo:0.93,wr:0.315,rwf:0.75,
  bot:[[0,0.42],[0.04,0.32],[0.1,0.215],[0.9,0.215],[0.97,0.3],[1,0.37]],
  belt:[[0,0.86],[0.03,0.95],[0.12,0.995],[0.3,1.0],[0.5,0.97],[0.73,0.93],[0.8,0.905],[0.93,0.83],[0.985,0.72],[1,0.63]],
  top:[[0.19,0],[0.2,1.0,1],[0.28,1.27],[0.35,1.41],[0.45,1.455],[0.58,1.45],[0.64,1.38],[0.72,1.13],[0.79,0.935,1],[0.8,0]],
  hw:[[0,0.88],[0.02,0.94],[0.06,0.985],[0.15,1],[0.84,1],[0.93,0.975],[0.985,0.9],[1,0.83]],
  wsB:0.79,wsT:0.6,rwT:0.35,rwB:0.2,pil:[[0.49,0.53],[0.35,0.385]],doors:[0.715,0.51,0.3],bon:0.795,boot:0.2,hl:{w:0.45,h:0.11},tl:{w:0.38,h:0.14},gr:{w:0.72,y0:0.47,y1:0.58},seat:[-0.37,0.5,0.1],cap:160,
  dyn:{acc:6.2,vmax:52,mass:1350,eng:{idle:780,red:6000,gears:6,voice:'i4',vol:1}}});
defCar('taxi',Object.assign({},CARTYPES.sedan,{key:'taxi',name:'Athens taxi',taxi:1,fixedCol:'#f5c400',cap:70,dyn:{acc:5.8,vmax:50,mass:1380,eng:{idle:760,red:4800,gears:6,voice:'diesel',vol:1}}}));
defCar('exec',{name:'Executive saloon',L:4.96,W:1.87,H:1.47,wb:2.98,fo:0.86,wr:0.34,ww:0.235,rwf:0.74,chromeTrim:1,pilBlack:1,
  bot:[[0,0.4],[0.04,0.31],[0.1,0.2],[0.9,0.2],[0.97,0.28],[1,0.36]],
  belt:[[0,0.88],[0.03,0.97],[0.12,1.01],[0.3,1.0],[0.5,0.975],[0.7,0.945],[0.79,0.92],[0.93,0.85],[0.985,0.75],[1,0.65]],
  top:[[0.17,0],[0.18,1.01,1],[0.27,1.3],[0.34,1.43],[0.45,1.47],[0.57,1.465],[0.63,1.4],[0.7,1.16],[0.765,0.95,1],[0.775,0]],
  hw:[[0,0.89],[0.02,0.945],[0.06,0.985],[0.15,1],[0.84,1],[0.93,0.975],[0.985,0.91],[1,0.85]],
  wsB:0.765,wsT:0.585,rwT:0.335,rwB:0.18,pil:[[0.475,0.51],[0.335,0.37]],doors:[0.705,0.49,0.29],bon:0.77,boot:0.18,hl:{w:0.48,h:0.1},tl:{w:0.42,h:0.13},gr:{w:0.5,y0:0.48,y1:0.66,chrome:1},seat:[-0.38,0.5,0.0],cap:70,
  dyn:{acc:7.8,vmax:68,mass:1700,grip:1.08,eng:{idle:700,red:6500,gears:8,voice:'i6',vol:1.1}}});
defCar('suv',{name:'Crossover',L:4.42,W:1.83,H:1.6,wb:2.66,fo:0.9,wr:0.345,ww:0.225,rwf:0.78,clad:1,rails:1,
  bot:[[0,0.48],[0.04,0.38],[0.1,0.26],[0.9,0.26],[0.97,0.36],[1,0.44]],
  belt:[[0,1.02],[0.05,1.08],[0.16,1.1],[0.5,1.07],[0.76,1.03],[0.82,1.0],[0.93,0.93],[0.985,0.83],[1,0.74]],
  top:[[0,1.02],[0.012,1.2],[0.045,1.48],[0.09,1.575],[0.2,1.6],[0.5,1.6],[0.6,1.575],[0.66,1.48],[0.79,1.03,1],[0.8,0]],
  hw:[[0,0.88],[0.02,0.94],[0.06,0.985],[0.15,1],[0.84,1],[0.93,0.975],[0.985,0.91],[1,0.85]],
  wsB:0.79,wsT:0.62,rwT:0.075,rwB:0.004,pil:[[0.41,0.455],[0.075,0.17]],doors:[0.69,0.435,0.25],bon:0.795,hl:{w:0.44,h:0.1},tl:{w:0.3,h:0.16},gr:{w:0.7,y0:0.56,y1:0.72},seat:[-0.37,0.62,-0.02],cap:110,
  dyn:{acc:6.0,vmax:50,mass:1450,cg:0.65,eng:{idle:800,red:5200,gears:6,voice:'diesel',vol:1}}});
defCar('suvL',{name:'Large SUV',L:4.92,W:1.96,H:1.76,wb:2.98,fo:0.93,wr:0.375,ww:0.25,rwf:0.82,clad:1,rails:1,pilBlack:1,chromeTrim:1,sx:[0.965,0.99,1,0.996,0.98,0.955],
  bot:[[0,0.52],[0.04,0.42],[0.1,0.29],[0.9,0.29],[0.97,0.4],[1,0.48]],
  belt:[[0,1.08],[0.05,1.15],[0.16,1.17],[0.5,1.15],[0.76,1.12],[0.82,1.1],[0.93,1.04],[0.985,0.94],[1,0.84]],
  top:[[0,1.08],[0.01,1.3],[0.035,1.66],[0.07,1.74],[0.2,1.76],[0.5,1.76],[0.62,1.74],[0.67,1.64],[0.795,1.12,1],[0.805,0]],
  hw:[[0,0.9],[0.02,0.95],[0.05,0.99],[0.12,1],[0.86,1],[0.94,0.98],[0.985,0.93],[1,0.88]],
  wsB:0.795,wsT:0.635,rwT:0.06,rwB:0.004,pil:[[0.44,0.48],[0.2,0.235],[0.06,0.1]],doors:[0.705,0.46,0.27],bon:0.8,hl:{w:0.48,h:0.11},tl:{w:0.32,h:0.15},gr:{w:0.86,y0:0.62,y1:0.86,chrome:1},seat:[-0.4,0.7,-0.05],cap:60,
  dyn:{acc:7.0,vmax:60,mass:2200,cg:0.72,grip:0.95,eng:{idle:680,red:5800,gears:8,voice:'v8',vol:1.15}}});
defCar('van',{name:'Delivery van',L:4.98,W:1.98,H:2.0,wb:3.0,fo:0.98,wr:0.34,ww:0.22,rwf:0.93,crR:0.02,sx:[0.975,0.995,1,0.998,0.99,0.975],
  bot:[[0,0.5],[0.03,0.42],[0.08,0.3],[0.9,0.3],[0.97,0.38],[1,0.45]],
  belt:[[0,1.05],[0.03,1.08],[0.6,1.07],[0.8,1.05],[0.86,1.02],[0.94,0.97],[0.99,0.88],[1,0.8]],
  top:[[0,1.06],[0.004,1.85],[0.02,1.97],[0.1,2.0],[0.66,2.0],[0.72,1.95],[0.86,1.03,1],[0.87,0]],
  hw:[[0,0.93],[0.012,0.975],[0.04,0.995],[0.1,1],[0.86,1],[0.94,0.98],[0.985,0.92],[1,0.86]],
  wsB:0.86,wsT:0.73,rwT:0.0,rwB:0.0,pil:[[0,0.6],[0.6,0.615]],doors:[0.785,0.6,0.59],bon:0.865,hl:{w:0.36,h:0.16},tl:{w:0.16,h:0.4,vertical:1},gr:{w:0.95,y0:0.5,y1:0.7},seat:[-0.42,0.85,0.95],cap:50,
  dyn:{acc:4.8,vmax:42,mass:1900,cg:0.8,grip:0.9,steer:0.58,eng:{idle:760,red:4500,gears:6,voice:'diesel',vol:1.1}}});
defCar('bus',{name:'City bus',L:12.0,W:2.55,H:3.05,wb:5.9,fo:2.75,wr:0.5,ww:0.3,track:2.1,ra:0.58,rwf:0.975,crR:0.03,crB:0.02,sx:[0.985,0.997,1,1,0.997,0.99],livery:'bus',
  bot:[[0,0.42],[0.01,0.36],[0.03,0.33],[0.97,0.33],[0.99,0.36],[1,0.4]],
  belt:[[0,1.12],[0.5,1.12],[1,1.12]],
  top:[[0,1.15],[0.002,2.8],[0.012,2.97],[0.03,3.0],[0.97,3.0],[0.988,2.97],[0.9975,2.75],[1,1.16]],
  hw:[[0,0.965],[0.006,0.99],[0.02,1],[0.98,1],[0.994,0.99],[1,0.965]],
  wsB:1,wsT:0.996,rwT:0.004,rwB:0,capF:'glass',capR:'glass',
  pil:[[0.004,0.06],[0.135,0.15],[0.25,0.265],[0.365,0.38],[0.47,0.485],[0.6,0.615],[0.715,0.73],[0.81,0.825],[0.95,0.97]],doorGlass:[[0.86,0.95],[0.49,0.59]],doors:[],hl:{w:0.34,h:0.14},tl:{w:0.2,h:0.36,vertical:1},gr:{w:1.6,y0:0.5,y1:0.62},seat:[-0.75,1.35,5.1],cap:6,
  wheels:[[-1.05,3.25,1],[1.05,3.25,1],[-0.95,-2.65,0],[0.95,-2.65,0]],
  dyn:{acc:2.6,vmax:24,mass:12000,cg:1.1,grip:0.75,steer:0.6,eng:{idle:600,red:2400,gears:4,voice:'bus',vol:1.2}}});
CARTYPES.bus.wheels.forEach(w=>{w.push(0.5)});


/* exotic, drivable cars (the owner: "put in a Ferrari and crazy cars that you can drive"); neutral names, own handling, top speed and engine note */
defCar('wedge',{name:'Furia V12',exotic:1,L:4.62,W:2.03,H:1.13,wb:2.7,fo:1.08,wr:0.345,ww:0.27,rwf:0.6,crR:0.02,crB:-0.05,pilBlack:1,two:1,sx:[0.93,0.975,1,0.99,0.96,0.92],
  bot:[[0,0.3],[0.05,0.2],[0.12,0.125],[0.9,0.125],[0.97,0.14],[1,0.18]],
  belt:[[0,0.86],[0.06,0.95],[0.2,0.985],[0.3,0.955],[0.45,0.87],[0.6,0.8],[0.75,0.74],[0.9,0.66],[0.97,0.54],[1,0.4]],
  top:[[0.05,0],[0.06,0.95,1],[0.25,1.045],[0.36,1.12],[0.42,1.135],[0.47,1.12],[0.66,0.79,1],[0.67,0]],
  hw:[[0,0.9],[0.03,0.96],[0.1,1],[0.85,0.99],[0.95,0.95],[1,0.84]],
  wsB:0.66,wsT:0.47,rwT:0.36,rwB:0.25,louvre:[0.07,0.245],pil:[],doors:[0.635,0.41],scoop:[0.27,0.4],hl:{w:0.4,h:0.065},tl:{w:0.55,h:0.055},gr:{w:1.25,y0:0.2,y1:0.3},seat:[0.4,0.3,0.0],cap:4,
  dyn:{acc:11.5,vmax:92,brake:13,grip:1.28,steer:0.56,mass:1575,cg:0.42,eng:{idle:1000,red:8500,gears:7,voice:'v12',vol:1.3}}});
defCar('ferrari',Object.assign({},CARTYPES.wedge,{key:'ferrari',name:'Ferrari 458 Italia',L:4.53,W:1.94,H:1.21,wb:2.65,fo:1.113,wr:0.358,ww:0.247,track:1.647,wheels:null,model:'models/ferrari.json',wheelKind:'ferrari',noDriver:0,
  seat:[0.33,0.3,-0.12],seats:null,cap:3,dyn:{acc:11,vmax:90,brake:13.5,grip:1.3,steer:0.58,mass:1485,cg:0.42,eng:{idle:1000,red:9000,gears:7,voice:'v8',vol:1.35}}}));
defCar('coupe',{name:'Cobalto RS',exotic:1,L:4.52,W:1.85,H:1.3,wb:2.45,fo:1.03,wr:0.34,ww:0.25,rwf:0.7,crR:0.03,crB:-0.045,pilBlack:0,two:0,
  bot:[[0,0.36],[0.05,0.26],[0.12,0.15],[0.9,0.15],[0.97,0.2],[1,0.27]],
  belt:[[0,0.84],[0.05,0.95],[0.2,0.975],[0.35,0.935],[0.55,0.88],[0.7,0.84],[0.85,0.79],[0.95,0.7],[1,0.54]],
  top:[[0.05,0],[0.06,0.97,1],[0.2,1.1],[0.4,1.27],[0.47,1.3],[0.53,1.28],[0.68,0.85,1],[0.69,0]],
  hw:[[0,0.9],[0.03,0.96],[0.12,1],[0.8,0.985],[0.93,0.94],[1,0.8]],
  wsB:0.68,wsT:0.53,rwT:0.4,rwB:0.18,qwR:[0.31,0.4],pil:[],doors:[0.64,0.42],hl:{w:0.22,h:0.2,round:1},tl:{w:0.8,h:0.06,bar:1},gr:{w:0.9,y0:0.3,y1:0.38},seat:[0.38,0.36,-0.05],cap:4,
  dyn:{acc:10.2,vmax:85,brake:13,grip:1.2,steer:0.6,mass:1480,cg:0.45,eng:{idle:900,red:8200,gears:7,voice:'f6',vol:1.25}}});
defCar('offroad',{name:'Titan 4x4',exotic:1,L:4.82,W:1.93,H:1.97,wb:2.89,fo:0.8,wr:0.4,ww:0.27,rwf:0.935,crR:0.01,crB:0.015,pilBlack:1,chromeTrim:0,sx:[0.99,0.998,1,1,0.997,0.99],
  bot:[[0,0.52],[0.03,0.46],[0.1,0.43],[0.9,0.43],[0.97,0.46],[1,0.52]],
  belt:[[0,1.12],[0.5,1.12],[0.84,1.1],[0.97,1.07],[1,1.02]],
  top:[[0,1.13],[0.004,1.9],[0.02,1.95],[0.1,1.97],[0.64,1.97],[0.665,1.95],[0.72,1.12,1],[0.73,0]],
  hw:[[0,0.97],[0.008,0.995],[0.02,1],[0.97,1],[0.995,0.985],[1,0.96]],
  wsB:0.72,wsT:0.665,rwT:0.016,rwB:0.001,pil:[[0.016,0.11],[0.44,0.47]],doors:[0.69,0.455,0.26],hl:{w:0.24,h:0.24,round:1},tl:{w:0.14,h:0.36,vertical:1},gr:{w:0.95,y0:0.66,y1:0.98,chrome:1},seat:[0.42,0.82,-0.1],cap:4,
  spare:1,dyn:{acc:8.6,vmax:61,brake:11,grip:0.98,steer:0.6,mass:2560,cg:0.86,eng:{idle:700,red:6200,gears:9,voice:'v8',vol:1.35}}});
defCar('cabrio',{name:'Riviera Spider',exotic:1,L:4.6,W:1.86,H:1.28,wb:2.7,fo:0.9,wr:0.335,ww:0.245,rwf:0.8,crR:0.02,crB:0.0,pilBlack:0,chromeTrim:1,
  bot:[[0,0.36],[0.04,0.28],[0.1,0.17],[0.9,0.17],[0.97,0.24],[1,0.3]],
  belt:[[0,0.86],[0.04,0.92],[0.15,0.95],[0.35,0.93],[0.55,0.9],[0.7,0.86],[0.85,0.8],[0.95,0.71],[1,0.58]],
  top:[[0.575,0],[0.58,1.25,1],[0.6,1.235],[0.66,0.875,1],[0.67,0]],
  hw:[[0,0.89],[0.03,0.95],[0.1,0.99],[0.2,1],[0.85,1],[0.94,0.97],[0.985,0.9],[1,0.82]],
  wsB:0.66,wsT:0.58,rwT:0.24,rwB:0.24,open:[0.235,0.58],pil:[],doors:[0.64,0.4],hl:{w:0.44,h:0.085},tl:{w:0.42,h:0.1},gr:{w:0.62,y0:0.36,y1:0.5,chrome:1},seat:[0.38,0.38,0.05],seatCol:'#8a5a3a',cap:4,
  dyn:{acc:9.2,vmax:76,brake:12,grip:1.14,steer:0.6,mass:1680,cg:0.5,eng:{idle:750,red:7200,gears:8,voice:'v8',vol:1.2}}});
CARTYPES.offroad.wheels.push([0,-CARTYPES.offroad.L/2-0.13,0,0.37,0.92,Math.PI/2,'spare']);


/* ------------------------------------------------------------------ two-wheelers (scooters everywhere in Athens, delivery riders with a top box, motorbikes) */
/* elliptical lump lofted along z: secs = [[z, yCentre, halfHeight, halfWidth], …]; flatBottom squares the lower half */
function vLump(b,secs,col,aux,seg,flat){seg=seg||10;const R=secs.map(s=>{const pts=[];for(let i=0;i<seg;i++){const a=i/seg*TAU;let y=Math.sin(a),x=Math.cos(a);if(flat&&y<0)y=Math.max(y,-0.55);pts.push([x*s[3],s[1]+y*s[2],s[0]])}return pts});
  for(let k=0;k<R.length-1;k++)for(let i=0;i<seg;i++){const i2=(i+1)%seg;const A=R[k][i],B=R[k+1][i],C=R[k+1][i2],D=R[k][i2];const nA=[Math.cos(i/seg*TAU),Math.sin(i/seg*TAU),0],nC=[Math.cos(i2/seg*TAU),Math.sin(i2/seg*TAU),0];b.quad(A,B,C,D,col,aux,nA,nA,nC,nC)}
  for(const e of[0,R.length-1]){const r=R[e],z=secs[e][0],fz=e===0?-1:1;const cy=secs[e][1];for(let i=0;i<seg;i++){const i2=(i+1)%seg;b.tri([0,cy,z],r[i],r[i2],col,aux,[0,0,fz])}}}
function vTube(b,a,c,r,col,aux){const dx=c[0]-a[0],dy=c[1]-a[1],dz=c[2]-a[2],L=Math.hypot(dx,dy,dz);const m=[(a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2];b.box(m,[r*2,L,r*2],col,aux,Math.atan2(dz,dy),0)}
function buildBike(S){const b=new VB(),f=new VB();const P=[1,1,1],D=lin('#111214'),G=lin('#2a2c2f'),M=lin('#9a9ea3'),SEAT=lin('#151515'),HL=lin('#dfe3e6'),TL=lin('#8a0a12'),AMB=lin('#7a4a08');const zf=S.zf,zr=S.zr,r=S.wr;
  const paint=ax(VK.paint),fixed=ax(VK.fixed),gloss=ax(VK.gloss),chrome=ax(VK.chrome);
  if(S.kind==='scooter'){
    vLump(b,[[zf+0.05,r+0.12,0.035,0.08],[zf-0.12,r+0.2,0.04,0.09],[zf-0.28,r+0.12,0.03,0.07]],P,paint,8);// front mudguard
    vTube(b,[0,r,zf],[0,1.0,zf-0.2],0.028,M,chrome);
    vLump(b,[[zf-0.06,0.62,0.3,0.2],[zf-0.13,0.66,0.36,0.23],[zf-0.24,0.64,0.32,0.21]],P,paint,10);// leg shield
    b.box([0,0.36,(zf-0.3+zr+0.52)/2],[0.34,0.07,zf-0.3-zr-0.52],[G,G,SEAT,D,G,G],fixed);// floorboard
    vLump(b,[[zr+0.62,0.5,0.1,0.15],[zr+0.48,0.6,0.2,0.19],[zr+0.15,0.62,0.22,0.19],[zr-0.08,0.66,0.16,0.14],[zr-0.17,0.7,0.08,0.09]],P,paint,10,1);// rear body
    vLump(b,[[zr+0.64,0.8,0.04,0.12],[zr+0.5,0.85,0.06,0.16],[zr+0.05,0.86,0.06,0.16],[zr-0.12,0.86,0.04,0.12]],SEAT,fixed,8);// seat
    b.box([0,1.02,zf-0.22],[0.66,0.03,0.03],D,fixed);for(const s of[-1,1]){b.box([s*0.34,1.02,zf-0.22],[0.04,0.04,0.12],D,fixed);vTube(b,[s*0.22,1.04,zf-0.22],[s*0.27,1.25,zf-0.24],0.008,D,fixed);b.box([s*0.27,1.27,zf-0.24],[0.1,0.06,0.02],lin('#2a3238'),chrome)}
    vLump(b,[[zf-0.12,1.03,0.07,0.13],[zf-0.22,1.06,0.08,0.15],[zf-0.32,1.04,0.06,0.12]],P,paint,8);// headset
    b.box([0,1.02,zf-0.105],[0.14,0.06,0.02],HL,ax(VK.chrome,1));for(const s of[-1,1])b.box([s*0.1,0.98,zf-0.11],[0.05,0.03,0.02],AMB,ax(VK.gloss,s<0?5:4));
    b.box([0,0.92,zf-0.35],[0.2,0.1,0.02],lin('#202224'),gloss);// dash
    b.box([0,0.68,zr-0.215],[0.12,0.05,0.02],TL,ax(VK.gloss,2));b.box([0,0.62,zr-0.2],[0.08,0.025,0.02],TL,ax(VK.gloss,3));for(const s of[-1,1])b.box([s*0.11,0.66,zr-0.2],[0.04,0.03,0.02],AMB,ax(VK.gloss,s<0?4:5));
    b.box([0.04,0.3,zr+0.25],[0.12,0.18,0.5],G,fixed);b.box([-0.1,0.32,zr+0.05],[0.06,0.06,0.3],M,chrome);// engine + exhaust
    {const z=zr-0.17,y0=0.48;b.quad([0.09,y0,z],[-0.09,y0,z],[-0.09,y0+0.06,z],[0.09,y0+0.06,z],lin('#f4f4f2'),fixed,[0,0,-1],[0,0,-1],[0,0,-1],[0,0,-1],plateAux())}
    if(S.topbox){const TB=lin(S.topbox);b.box([0,1.06,zr-0.02],[0.42,0.36,0.4],TB,gloss);b.box([0,0.88,zr-0.02],[0.2,0.04,0.2],D,fixed)}}
  else{// naked motorbike
    vTube(b,[0.06,r,zf],[0.07,1.0,zf-0.24],0.025,M,chrome);vTube(b,[-0.06,r,zf],[-0.07,1.0,zf-0.24],0.025,M,chrome);
    vLump(b,[[zf+0.04,r+0.06,0.03,0.08],[zf-0.12,r+0.13,0.03,0.08]],P,paint,8);
    vLump(b,[[0.5,0.88,0.06,0.12],[0.38,0.95,0.12,0.18],[0.12,0.96,0.12,0.19],[0.0,0.9,0.08,0.14]],P,paint,10,1);// tank
    vLump(b,[[0.0,0.86,0.04,0.14],[-0.4,0.88,0.05,0.14],[-0.62,0.92,0.04,0.1]],SEAT,fixed,8);
    vLump(b,[[-0.55,0.93,0.05,0.1],[-0.8,0.98,0.04,0.06],[-0.88,0.98,0.02,0.04]],P,paint,8);
    b.box([0,0.52,0.1],[0.32,0.34,0.5],G,chrome);b.box([0,0.72,0.1],[0.24,0.12,0.4],D,fixed);vTube(b,[0.12,0.35,0.0],[0.16,0.45,-0.75],0.045,M,chrome);
    vTube(b,[0,0.95,0.45],[0,0.6,-0.55],0.03,D,fixed);vTube(b,[0,0.45,-0.2],[0,r,zr],0.035,D,fixed);
    b.box([0,1.03,zf-0.27],[0.78,0.03,0.03],D,fixed);vLump(b,[[zf-0.13,0.98,0.09,0.09],[zf-0.2,0.98,0.1,0.1],[zf-0.26,0.98,0.07,0.07]],D,gloss,10);b.box([0,0.98,zf-0.125],[0.13,0.13,0.01],HL,ax(VK.chrome,1));
    for(const s of[-1,1])b.box([s*0.12,0.9,zf-0.2],[0.04,0.03,0.04],AMB,ax(VK.gloss,s<0?5:4));
    b.box([0,0.92,-0.9],[0.1,0.04,0.03],TL,ax(VK.gloss,2));for(const s of[-1,1])b.box([s*0.1,0.88,-0.88],[0.04,0.025,0.03],AMB,ax(VK.gloss,s<0?4:5));
    {const z=-0.92,y0=0.72;b.quad([0.09,y0,z],[-0.09,y0,z],[-0.09,y0+0.06,z],[0.09,y0+0.06,z],lin('#f4f4f2'),fixed,[0,0,-1],[0,0,-1],[0,0,-1],[0,0,-1],plateAux())}}
  // far LOD: a few boxes
  f.box([0,0.62,(zf+zr)/2],[0.32,0.5,S.L*0.7],P,paint);f.box([0,0.95,zf-0.2],[0.6,0.1,0.1],D,fixed);for(const w of S.wheels)f.cylX([0,w[3]||r,w[1]],w[3]||r,S.ww/2,6,D,fixed,1);
  if(S.topbox)f.box([0,1.06,zr-0.02],[0.42,0.36,0.4],lin(S.topbox),gloss);
  const body=b.build(S.L),fb=f.build(S.L);return{body,glass:null,far:{body:fb}}}
function defBike(k,S){S.cls='moto';S.track=0;S.ra=0;S.build=buildBike;S.wheels=[[0,S.L/2-S.fo,1,S.wr],[0,S.L/2-S.fo-S.wb,0,S.wr]];S.seats=[S.seat,[0,S.seat[1]+0.04,S.seat[2]-0.32]];S.pilBlack=0;S.door={hinge:[0,0,0],len:0};return defCar(k,S)}
defBike('scooter',{name:'Scooter',kind:'scooter',L:1.95,W:0.7,H:1.2,wb:1.34,fo:0.34,wr:0.27,ww:0.1,seat:[0,0.74,-0.36],steerVis:0.6,cap:90,dyn:{acc:4.6,vmax:29,brake:9,grip:1.05,steer:0.5,mass:260,cg:0.6,eng:{idle:1500,red:8500,gears:1,voice:'scooter',vol:0.75}}});
defBike('scooterD',Object.assign({},CARTYPES.scooter,{key:'scooterD',name:'Delivery scooter',topbox:'#d42a2e',cap:30}));
defBike('moto',{name:'Motorbike',kind:'moto',L:2.1,W:0.8,H:1.12,wb:1.45,fo:0.36,wr:0.31,ww:0.15,seat:[0,0.8,-0.28],steerVis:0.6,cap:20,dyn:{acc:8.5,vmax:62,brake:11,grip:1.1,steer:0.48,mass:380,cg:0.62,eng:{idle:1200,red:11000,gears:6,voice:'moto',vol:1.1}}});

/* ------------------------------------------------------------------ loft */
/* left-half cross-section at z: 13 points j0…j12 (x ≤ 0) written into r[0..25] */
function carRing(S,z,r,noArch){const L=S.L,u=z/L+0.5;const hw=S.W/2*S.fhw(z),b=S.fbot(z),bl=S.fbelt(z),tp=Math.max(bl,S.ftop(z));let yb=b;
  if(!noArch)for(const w of S.wheels){if(w[0]>0||w[6])continue;const dz=z-w[1],ra=S.ra;if(Math.abs(dz)<ra){const y=(w[3]||S.wr)+Math.sqrt(ra*ra-dz*dz);if(y>yb)yb=y}}
  yb=Math.min(yb,bl-0.07);const sh=bl-yb,gh=Math.max(0,tp-bl-0.012),g=clamp((tp-bl)/0.3,0,1),rhw=hw*lerp(0.935,S.rwf,g),cr=lerp(S.crB,S.crR,g),ins=Math.min(0.3,hw*0.36),sx=S.sx;
  const P=[[-(hw-ins),b],[-(hw-ins),yb],[-hw*sx[0],yb],[-hw*sx[1],yb+sh*0.2],[-hw*sx[2],yb+sh*0.55],[-hw*sx[3],yb+sh*0.86],[-hw*sx[4],bl],[-hw*sx[5],bl+0.012],
    [-(lerp(hw*sx[5],rhw,0.5)+hw*0.012*g),bl+0.012+gh*0.5],[-rhw,bl+0.012+gh*0.94],[-rhw*0.9,bl+0.012+gh*0.99+cr*0.35],[-rhw*0.5,bl+0.012+gh+cr*0.82],[0,bl+0.012+gh+cr]];
  for(let j=0;j<13;j++){r[j*2]=P[j][0];r[j*2+1]=P[j][1]}r[26]=b;r[27]=bl;r[28]=tp;r[29]=hw;r[30]=yb;return r}
const segJ=s=>s<12?s:s<24?23-s:-1;
function ringPt(r,k){if(k<=12)return[r[k*2],r[k*2+1]];const j=24-k;return[-r[j*2],r[j*2+1]]}
/* point on the half ring at fractional parameter t (0…12), side -1 left / +1 right */
function ringT(r,t,side){const i=Math.min(11,Math.max(0,Math.floor(t))),f=clamp(t-i,0,1);const x=lerp(r[i*2],r[i*2+2],f),y=lerp(r[i*2+1],r[i*2+3],f);return[side<0?x:-x,y]}
function inZ(u,a,b){return u>Math.min(a,b)&&u<Math.max(a,b)}
/* what a body panel is at station-mid u, ring segment j */
function panelKind(S,u,j,cab){
  if(j<0||j<=1)return'black';
  if(S.doorGlass&&j>=2&&j<=6)for(const d of S.doorGlass)if(inZ(u,d[0],d[1]))return'glass';
  if(j===2||(j===3&&S.clad==='high'))return S.clad?'clad':'paint';
  if(j<=6){if(S.scoop&&(j===4||j===5)&&inZ(u,S.scoop[0],S.scoop[1]))return'black';return'paint'}
  if(!cab)return S.open&&inZ(u,S.open[0],S.open[1])&&j>=7?'skip':'paint';
  if(S.open&&inZ(u,S.open[0],S.open[1]))return j>=7?'skip':'paint';
  if(u>S.wsT&&u<S.wsB){if(j>=7)return'glass';return'paint'}/* side glass runs forward to the windscreen; the A-pillar is a slim strip along ring point 9 (carDetails) */
  if(u>=S.rwT&&u<=S.wsT){if(j>=9)return S.roofCol?'roof':'paint';for(const p of S.pil)if(inZ(u,p[0],p[1]))return S.pilBlack&&p[1]-p[0]<0.07&&p[0]>S.rwT+0.04?'black':'paint';return'glass'}
  if(u>S.rwB&&u<S.rwT){if(j>=9)return'glass';if(j===7&&S.qwR&&inZ(u,S.qwR[0],S.qwR[1]))return'glass';return'paint'}
  if(S.louvre&&inZ(u,S.louvre[0],S.louvre[1])&&j>=9)return'black';
  return S.roofCol&&j>=9?'roof':'paint'}
/* station list along the car */
function carStations(S,lod){const L=S.L,zs=[];const N=lod?7:S.nearN||24;for(let i=0;i<=N;i++){const u=i/N;zs.push((lerp(u,0.5-0.5*Math.cos(Math.PI*u),0.55)-0.5)*L)}
  const add=u=>zs.push((u-0.5)*L);const keys=[S.wsB,S.wsT,S.rwT,S.rwB];if(!lod){S.pil.forEach(p=>keys.push(p[0],p[1]));if(S.doorGlass)S.doorGlass.forEach(p=>keys.push(p[0],p[1]));if(S.open)keys.push(S.open[0],S.open[1]);S.extraU&&keys.push(...S.extraU);if(S.cls==='car'&&S.doors.length>=2)keys.push(S.doors[0],S.doors[1])}
  keys.forEach(u=>{if(u>0.001&&u<0.999)add(u)});
  for(const w of S.wheels){if(w[0]>0||w[6])continue;const ra=S.ra;const ks=lod?[-1.001,-0.999,0,0.999,1.001]:[-1.002,-0.998,-0.85,-0.6,-0.3,0,0.3,0.6,0.85,0.998,1.002];for(const k of ks)zs.push(w[1]+k*ra)}
  zs.push(-L/2,L/2);zs.sort((a,b)=>a-b);const o=[];for(const z of zs){if(z<-L/2-1e-6||z>L/2+1e-6)continue;if(!o.length||z-o[o.length-1]>(lod?0.03:0.006))o.push(z)}o[0]=-L/2;o[o.length-1]=L/2;return o}
function kindCol(S,kind,u,j){const LV=S.livery;if(LV==='bus'){if(kind==='glass'||kind==='black'||kind==='clad')return null;const y=j;return y<=3?lin('#1f5fa8'):(y===4?lin('#2c78c8'):lin('#f1f3f2'))}return null}
const BLACK=lin('#0d0e10'),CLAD=lin('#1b1c1e'),TRIM=lin('#08090a'),CHR=lin('#c8ccd0'),GLASSC=lin('#0e1418');
function buildCarGeo(S,lod){const body=new VB(),glass=new VB();const zs=carStations(S,lod);const NS=zs.length;const R=zs.map(z=>carRing(S,z,new Float64Array(31)));
  const ringIdx=lod?[0,1,2,4,6,7,9,11,12,13,15,17,18,20,22,23,24]:null;// far LOD ring subset (full ring is 25 points)
  const K=lod?ringIdx.length:25;const kAt=q=>lod?ringIdx[q]:q;
  const P=(i,q)=>{const p=ringPt(R[i],kAt(q));return[p[0],p[1],zs[i]]};
  // smooth grid normals
  const N=[];const cy=i=>(R[i][26]+R[i][28])/2;
  for(let i=0;i<NS;i++){N.push([]);for(let q=0;q<K;q++){const a=P(Math.max(0,i-1),q),b=P(Math.min(NS-1,i+1),q),c=P(i,(q+K-1)%K),d=P(i,(q+1)%K);
    const tz=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],tr=[d[0]-c[0],d[1]-c[1],d[2]-c[2]];let n=[tr[1]*tz[2]-tr[2]*tz[1],tr[2]*tz[0]-tr[0]*tz[2],tr[0]*tz[1]-tr[1]*tz[0]];
    const p=P(i,q);const ref=[p[0],p[1]-cy(i),p[2]*0.15];if(n[0]*ref[0]+n[1]*ref[1]+n[2]*ref[2]<0)n=[-n[0],-n[1],-n[2]];const l=Math.hypot(n[0],n[1],n[2])||1;N[i].push([n[0]/l,n[1]/l,n[2]/l])}}
  const paint=[1,1,1];
  for(let i=0;i<NS-1;i++){const um=((zs[i]+zs[i+1])/2)/S.L+0.5;const cab=Math.min(R[i][28]-R[i][27],R[i+1][28]-R[i+1][27])>0.025;
    for(let q=0;q<K;q++){const q2=(q+1)%K;const k0=kAt(q);if(!lod&&k0===24&&q2!==0)continue;const j=lod?(k0===24?-1:segJ(k0)):(k0===24?-1:segJ(k0));
      let kind=panelKind(S,um,j,cab);if(kind==='skip')continue;
      const a=P(i,q),b=P(i+1,q),c=P(i+1,q2),d=P(i,q2);
      const lc=kindCol(S,kind,um,j);
      if(kind==='glass'&&!lod&&S.cls==='car'&&S.doors.length>=2&&q>=12&&q<24&&um>S.doors[1]&&um<S.doors[0]&&(j===7||j===8)){/* driver's door glass: drawn by the door */}
      if(kind==='glass'){if(lod){body.quad(a,b,c,d,GLASSC,ax(VK.gloss),N[i][q],N[i+1][q],N[i+1][q2],N[i][q2]);continue}
        const off=(p,n)=>[p[0]-n[0]*0.012,p[1]-n[1]*0.012,p[2]-n[2]*0.012];glass.quad(off(a,N[i][q]),off(b,N[i+1][q]),off(c,N[i+1][q2]),off(d,N[i][q2]),C1,AUX0,N[i][q],N[i+1][q],N[i+1][q2],N[i][q2]);
        // dark rubber reveal behind the glass so the opening never shows the sky through it at grazing angles is handled by the interior
        continue}
      let col=paint,aux=ax(VK.paint);const isDoor=!lod&&S.cls==='car'&&S.doors.length>=2&&q>=12&&q<24&&j>=2&&j<=8&&um>S.doors[1]&&um<S.doors[0];
      if(kind==='black'){col=j<=1?BLACK:TRIM;aux=ax(j<=1?VK.fixed:VK.gloss)}else if(kind==='clad'){col=CLAD;aux=ax(VK.fixed)}else if(kind==='roof'){col=lin(S.roofCol);aux=ax(VK.gloss)}
      if(lc){col=lc;aux=ax(VK.gloss)}if(isDoor)aux=[aux[0],aux[1],-1,5];
      const flat=j<=1||j<0;if(flat)body.quad(a,b,c,d,col,aux);else body.quad(a,b,c,d,col,aux,N[i][q],N[i+1][q],N[i+1][q2],N[i][q2])}}
  // end caps (front fascia z=+L/2, tail panel z=-L/2): lower part paint, upper part (above the belt) paint or glass
  for(const e of [0,NS-1]){const r=R[e],z=zs[e],fz=e===0?-1:1;const lower=[],upper=[];for(let k=0;k<=7;k++)lower.push(ringPt(r,k));for(let k=17;k<=24;k++)lower.push(ringPt(r,k));
    for(let k=7;k<=17;k++)upper.push(ringPt(r,k));
    const fan=(pts,col,aux,dst)=>{let cx=0,cyy=0;pts.forEach(p=>{cx+=p[0];cyy+=p[1]});cx/=pts.length;cyy/=pts.length;for(let k=0;k<pts.length;k++){const p=pts[k],q=pts[(k+1)%pts.length];dst.tri([cx,cyy,z],[p[0],p[1],z],[q[0],q[1],z],col,aux,[0,0,fz])}};
    const capKind=e===0?S.capR:S.capF;const LVc=S.livery==='bus'?lin('#f1f3f2'):null;
    fan(lower,LVc||paint,LVc?ax(VK.gloss):ax(VK.paint),body);
    if(r[28]-r[27]>0.05){if(capKind==='glass'&&!lod){const zz=z-fz*0.012;let cx=0,cyy=0;upper.forEach(p=>{cx+=p[0];cyy+=p[1]});cx/=upper.length;cyy/=upper.length;
        for(let k=0;k<upper.length-1;k++){const p=upper[k],q=upper[k+1];const sh=(p0)=>[cx+(p0[0]-cx)*0.94,cyy+(p0[1]-cyy)*0.9];const P0=sh(p),Q0=sh(q);glass.tri([cx,cyy,zz],[P0[0],P0[1],zz],[Q0[0],Q0[1],zz],C1,AUX0,[0,0,fz]);
          body.quad([p[0],p[1],z],[q[0],q[1],z],[Q0[0],Q0[1],z],[P0[0],P0[1],z],TRIM,ax(VK.gloss),[0,0,fz],[0,0,fz],[0,0,fz],[0,0,fz])}}
      else fan(upper,capKind==='glass'?GLASSC:(LVc||paint),capKind==='glass'?ax(VK.gloss):(LVc?ax(VK.gloss):ax(VK.paint)),body)}}
  if(!lod)carDetails(S,body,glass,R,zs);else carFarDetails(S,body,R,zs);
  return{body:body.build(S.L),glass:lod?null:glass.build(0)}}
/* surface patch on the loft (lights, seams, trim): z range, ring parameter range t0…t1 on one side, offset along the normal */
function carPatch(vb,S,z0,z1,t0,t1,side,nz,nt,off,col,aux,auxFn){const G=[];for(let a=0;a<=nz;a++){const z=lerp(z0,z1,a/nz);const r=carRing(S,z,new Float64Array(31));const row=[];for(let b=0;b<=nt;b++){const p=ringT(r,lerp(t0,t1,b/nt),side);row.push([p[0],p[1],z])}G.push(row)}
  const cyv=(G[0][0][1]+G[0][nt][1])/2;
  const nrm=(a,b)=>{const p=G[a][b],pz=G[Math.min(nz,a+1)][b],mz=G[Math.max(0,a-1)][b],pt=G[a][Math.min(nt,b+1)],mt=G[a][Math.max(0,b-1)];
    let tz=[pz[0]-mz[0],pz[1]-mz[1],pz[2]-mz[2]],tt=[pt[0]-mt[0],pt[1]-mt[1],pt[2]-mt[2]];if(Math.hypot(...tz)<1e-9)tz=[0,0,1];let n=[tt[1]*tz[2]-tt[2]*tz[1],tt[2]*tz[0]-tt[0]*tz[2],tt[0]*tz[1]-tt[1]*tz[0]];
    const ref=[p[0],(p[1]-cyv)*0.6,p[2]*0.25];if(n[0]*ref[0]+n[1]*ref[1]+n[2]*ref[2]<0)n=n.map(v=>-v);const l=Math.hypot(...n)||1;return n.map(v=>v/l)};
  const NN=G.map((row,a)=>row.map((p,b)=>nrm(a,b)));const O=(a,b)=>{const p=G[a][b],n=NN[a][b];return[p[0]+n[0]*off,p[1]+n[1]*off,p[2]+n[2]*off]};
  for(let a=0;a<nz;a++)for(let b=0;b<nt;b++){const A=auxFn?[auxFn(a/nz,b/nt),auxFn((a+1)/nz,b/nt),auxFn((a+1)/nz,(b+1)/nt),auxFn(a/nz,(b+1)/nt)]:null;
    vb.quad(O(a,b),O(a+1,b),O(a+1,b+1),O(a,b+1),col,aux,NN[a][b],NN[a+1][b],NN[a+1][b+1],NN[a][b+1],A)}}
/* flat rectangle on an end cap (front +1 / rear -1), x0..x1, y0..y1 */
function capRect(vb,S,end,x0,x1,y0,y1,col,aux,off,auxs){const z=end*(S.L/2+(off||0.004));const n=[0,0,end];vb.quad([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],col,aux,n,n,n,n,auxs)}
function plateAux(k,lg){const f=(u,v)=>[VK.fixed,lg||0,u,v];return[f(0,0),f(1,0),f(1,1),f(0,1)]}
function carDetails(S,b,gl,R,zs){const L=S.L,H=L/2;const rF=carRing(S,H,new Float64Array(31)),rR=carRing(S,-H,new Float64Array(31));const hwF=rF[29],hwR=rR[29],blF=rF[27],blR=rR[27],bF=rF[26],bR=rR[26];
  const HL=lin('#dfe3e6'),HSG=lin('#6c7277'),DRL=lin('#e9eef2'),TL=lin('#8a0a12'),AMB=lin('#7a4a08'),REV=lin('#c9c9c9'),PLW=lin('#f4f4f2'),DRK=lin('#050506');
  const u2z=u=>(u-0.5)*L;
  // ---- seams (door cut lines, bonnet, boot)
  if(S.cls==='car'){for(const u of S.doors){const z=u2z(u);for(const s of[-1,1])carPatch(b,S,z-0.0035,z+0.0035,2.2,6.9,s,1,5,0.0018,TRIM,ax(VK.fixed))}
    if(S.bon){const z=u2z(S.bon);for(const s of[-1,1]){carPatch(b,S,z-0.0035,z+0.0035,6.4,12,s,1,4,0.0018,TRIM,ax(VK.fixed));carPatch(b,S,z,H-0.12,6.35,6.5,s,4,1,0.0018,TRIM,ax(VK.fixed))}}
    if(S.boot){const z=u2z(S.boot);for(const s of[-1,1]){carPatch(b,S,z-0.0035,z+0.0035,6.4,12,s,1,4,0.0018,TRIM,ax(VK.fixed));carPatch(b,S,-H+0.1,z,6.35,6.5,s,3,1,0.0018,TRIM,ax(VK.fixed))}}
    // window-line trim along the belt (chrome on premium cars)
    if(S.wsT>S.rwT+0.05){const z0=u2z(Math.max(S.rwB,S.rwT-0.02)),z1=u2z(S.wsB-0.01);for(const s of[-1,1])carPatch(b,S,z0,z1,6.92,7.12,s,6,1,0.002,S.chromeTrim?CHR:TRIM,ax(S.chromeTrim?VK.chrome:VK.gloss))}
    // A-pillars: slim body-colour strips along the windscreen's side edges
    if(S.wsB<1&&S.wsB-S.wsT>0.05){const z0=u2z(S.wsT)-0.012,z1=u2z(S.wsB)-0.004;for(const s of[-1,1])carPatch(b,S,z0,z1,8.72,9.1,s,8,1,0.006,S.pilBlack&&S.exotic?TRIM:[1,1,1],S.pilBlack&&S.exotic?ax(VK.gloss):ax(VK.paint))}
    // door handles
    for(const u of S.doors.slice(1)){const z=u2z(u)+0.1;const r=carRing(S,z,new Float64Array(31));for(const s of[-1,1]){const p=ringT(r,5.55,s);b.box([p[0]+s*0.012,p[1],z],[0.03,0.028,0.15],S.chromeTrim?CHR:(S.clad?TRIM:[1,1,1]),ax(S.chromeTrim?VK.chrome:(S.clad?VK.gloss:VK.paint)))}}
    if(S.doors.length===2){/* coupé: one handle */}
  }
  // ---- headlights: flat cluster on the fascia + wrap round the corner
  const hl=S.hl||{w:0.4,h:0.12};const hy1=blF-0.018,hy0=hy1-hl.h;
  for(const s of[-1,1]){const xo=s*(hwF*0.94),xi=s*(hwF*0.94-hl.w);const ind=s<0?5:4;
    if(hl.round){const cx=(xo+xi)/2,cyc=(hy0+hy1)/2,rr=Math.min(hl.h,hl.w)*0.5;for(let k=0;k<10;k++){const a0=k/10*TAU,a1=(k+1)/10*TAU;b.tri([cx,cyc,H+0.006],[cx+Math.cos(a0)*rr,cyc+Math.sin(a0)*rr,H+0.006],[cx+Math.cos(a1)*rr,cyc+Math.sin(a1)*rr,H+0.006],HL,ax(VK.chrome,1),[0,0,1])}
      capRect(b,S,1,xo-s*0.02,xo-s*0.07,hy0-0.05,hy0-0.02,AMB,ax(VK.gloss,ind),0.005)}
    else{/* modern cluster: smoked chrome housing (glows with the headlights), bright projector lens, LED daytime-running strip along the lower edge */
      const xm=lerp(xo,xi,0.12);capRect(b,S,1,xo,xm,hy0+hl.h*0.25,hy1,AMB,ax(VK.gloss,ind));capRect(b,S,1,xm,xi,hy0,hy1,HSG,ax(VK.chrome,1));
      const pr=Math.min(hl.h*0.36,0.05),pc=lerp(xm,xi,0.62);capRect(b,S,1,pc-pr,pc+pr,hy0+hl.h*0.5-pr,hy0+hl.h*0.5+pr,HL,ax(VK.chrome,1),0.006);
      capRect(b,S,1,xo,xi,hy0,hy0+0.014,DRL,ax(VK.gloss,8),0.006);capRect(b,S,1,xi-s*0.012,xi,hy0,hy1,DRL,ax(VK.gloss,8),0.006)}
    // wrap: the light cluster continues round the front corner (housing + DRL line)
    carPatch(b,S,H-0.16,H-0.004,5.0,6.6,s,3,3,0.003,HSG,ax(VK.chrome,1));carPatch(b,S,H-0.15,H-0.004,5.0,5.25,s,3,1,0.0045,DRL,ax(VK.gloss,8));
    // side repeater on the front wing
    if(S.cls==='car'){const z=S.zf+S.ra+0.12;carPatch(b,S,z,z+0.06,4.6,4.85,s,1,1,0.003,AMB,ax(VK.gloss,ind))}}
  // ---- grille, lower intake, fog lamps, splitter, front plate
  const gr=S.gr||{w:0.6,y0:0.45,y1:0.58};capRect(b,S,1,-gr.w/2,gr.w/2,gr.y0,Math.min(gr.y1,blF-0.03),DRK,ax(VK.gloss));
  for(let k=1;k<4;k++){const y=lerp(gr.y0,Math.min(gr.y1,blF-0.03),k/4);capRect(b,S,1,-gr.w/2+0.02,gr.w/2-0.02,y-0.006,y+0.006,gr.chrome?CHR:lin('#202225'),ax(gr.chrome?VK.chrome:VK.gloss),0.007)}
  if(gr.chrome){capRect(b,S,1,-gr.w/2-0.015,gr.w/2+0.015,Math.min(gr.y1,blF-0.03),Math.min(gr.y1,blF-0.03)+0.015,CHR,ax(VK.chrome),0.007);capRect(b,S,1,-gr.w/2-0.015,gr.w/2+0.015,gr.y0-0.015,gr.y0,CHR,ax(VK.chrome),0.007)}
  const iy0=bF+0.035,iy1=Math.min(bF+0.15,gr.y0-0.04);capRect(b,S,1,-hwF*0.62,hwF*0.62,iy0,iy1,DRK,ax(VK.gloss));
  for(const s of[-1,1])capRect(b,S,1,s*hwF*0.72,s*hwF*0.84,iy0+0.02,iy1-0.01,lin('#bfc3c6'),ax(VK.chrome),0.006);
  capRect(b,S,1,-hwF*0.85,hwF*0.85,bF,bF+0.03,DRK,ax(VK.fixed),0.008);
  if(S.cls==='car'){const py0=iy1+0.01,pw=0.52;capRect(b,S,1,-pw/2,pw/2,py0,py0+0.11,PLW,ax(VK.fixed),0.01,plateAux())}
  // ---- tail lights, reverse, rear indicators, plate, bumper, exhaust, third brake light
  const tl=S.tl||{w:0.3,h:0.15};const ty1=blR-0.02,ty0=ty1-tl.h;
  for(const s of[-1,1]){const xo=-s*(hwR*0.95),xi=-s*(hwR*0.95-tl.w);const ind=s<0?4:5;
    if(tl.vertical){capRect(b,S,-1,xo,xi,ty0,ty1-tl.h*0.45,TL,ax(VK.gloss,2));capRect(b,S,-1,xo,xi,ty1-tl.h*0.45,ty1-tl.h*0.25,AMB,ax(VK.gloss,ind));capRect(b,S,-1,xo,xi,ty1-tl.h*0.25,ty1,REV,ax(VK.gloss,6))}
    else{const xm=lerp(xo,xi,0.62),xm2=lerp(xo,xi,0.82);capRect(b,S,-1,xo,xm,ty0,ty1,TL,ax(VK.gloss,2));capRect(b,S,-1,xm,xm2,ty0,ty1,AMB,ax(VK.gloss,ind));capRect(b,S,-1,xm2,xi,ty0,ty1,REV,ax(VK.gloss,6))}
    carPatch(b,S,-H+0.004,-H+0.13,4.9,6.5,s,2,3,0.003,TL,ax(VK.gloss,2));
    capRect(b,S,-1,-s*hwR*0.82,-s*hwR*0.7,bR+0.07,bR+0.1,TL,ax(VK.gloss,0),0.006)}
  if(S.cls==='car'){const py0=S.rwB>0.05?ty0-0.16:bR+0.2,pw=0.52;capRect(b,S,-1,pw/2,-pw/2,py0,py0+0.11,PLW,ax(VK.fixed),0.01,plateAux())}
  capRect(b,S,-1,hwR*0.88,-hwR*0.88,bR,bR+0.065,DRK,ax(VK.fixed),0.008);
  if(S.cls==='car'&&S.key!=='bus'){const ex=-hwR*0.55;b.box([ex,bR+0.04,-H-0.03],[0.07,0.07,0.12],lin('#3b3d40'),ax(VK.chrome))}
  {const z=u2z(S.rwT>0.02?S.rwT:0.004)-0.015;if(S.rwT>0.02&&S.rwT<0.5)for(const s of[-1,1])carPatch(b,S,z-0.02,z+0.004,11.3,12,s,1,1,0.004,TL,ax(VK.gloss,3))}
  // ---- mirrors (paint housing, dark glass facing back, indicator repeater on top)
  if(S.cls==='car'&&S.wsB<1){const zM=u2z(S.wsB)-0.2;const r=carRing(S,zM,new Float64Array(31));for(const s of[-1,1]){const p=ringT(r,6.95,s);const mx=p[0]+s*0.12,my=p[1]+0.1;
      b.box([mx,my,zM],[0.17,0.105,0.085],[1,1,1],ax(VK.paint),0.08,-s*0.18);b.box([mx-s*0.005,my,zM-0.044],[0.15,0.082,0.006],lin('#2a3238'),ax(VK.chrome),0.08,-s*0.18);b.box([p[0]+s*0.04,p[1]+0.045,zM+0.01],[0.09,0.035,0.05],TRIM,ax(VK.gloss),0,-s*0.3);b.box([mx+s*0.02,my-0.045,zM+0.01],[0.08,0.012,0.04],lin('#7a4a08'),ax(VK.gloss,s<0?5:4))}}
  // ---- wipers
  if(S.wsB<1&&S.cls==='car'){const z=u2z(S.wsB)-0.03;const r=carRing(S,z,new Float64Array(31));for(const s of[-1,1]){const p=ringT(r,9.5,-1);const y=r[27]+0.03;b.box([s*0.25-0.12,y,z],[0.55,0.015,0.02],TRIM,ax(VK.fixed),0,s*0.1)}}
  // ---- roof rails, shark-fin antenna, taxi sign
  if(S.rails){const z0=u2z(S.rwT+0.03),z1=u2z(S.wsT-0.03);for(const s of[-1,1])carPatch(b,S,z0,z1,10.0,10.25,s,5,1,0.03,S.chromeTrim?CHR:TRIM,ax(S.chromeTrim?VK.chrome:VK.gloss))}
  if(S.cls==='car'&&!S.open&&S.key!=='bus'&&S.key!=='van'){const z=u2z(S.rwT+0.04);const r=carRing(S,z,new Float64Array(31));const y=r[28]+0.03;b.box([0,y+0.025,z],[0.06,0.06,0.16],S.taxi?[1,1,1]:TRIM,ax(S.taxi?VK.paint:VK.gloss),-0.25)}
  if(S.taxi){const z=u2z((S.rwT+S.wsT)/2+0.02);const r=carRing(S,z,new Float64Array(31));const y=r[28]+S.crR;
    b.box([0,y+0.025,z],[0.5,0.05,0.2],lin('#202020'),ax(VK.gloss));const w=0.62,h=0.15,y0=y+0.05,d=0.2;
    const sgn=(zz,flip)=>{const n=[0,0,flip];const A=[[VK.fixed,7,2,0],[VK.fixed,7,3,0],[VK.fixed,7,3,1],[VK.fixed,7,2,1]];const x0=flip>0?-w/2:w/2,x1=-x0;b.quad([x0,y0,zz],[x1,y0,zz],[x1,y0+h,zz],[x0,y0+h,zz],[1,1,1],AUX0,n,n,n,n,A)};
    sgn(z+d/2,1);sgn(z-d/2,-1);b.box([0,y0+h+0.004,z],[w,0.008,d],lin('#f4f4f0'),ax(VK.fixed,7));for(const s of[-1,1])b.box([s*w/2,y0+h/2,z],[0.004,h,d],lin('#f4f4f0'),ax(VK.fixed,7))}
  // ---- interior: dashboard, seats, steering wheel, door cards, parcel shelf
  if(S.key!=='bus'){const IN=lin('#16171a'),SEAT=lin(S.seatCol||'#24252a'),DASH=lin('#101113');const st=S.seat;const zW=u2z(Math.min(S.wsB,0.99));const rW=carRing(S,zW-0.25,new Float64Array(31));const blW=rW[27],hwW=rW[29];
    b.box([0,blW-0.08,zW-0.28],[hwW*1.75,0.2,0.42],DASH,ax(VK.fixed));
    for(const sx of [st[0],-st[0]]){b.box([sx,st[1]-0.04,st[2]+0.02],[0.48,0.13,0.5],SEAT,ax(VK.fixed));b.box([sx,st[1]+0.3,st[2]-0.22],[0.48,0.6,0.11],SEAT,ax(VK.fixed),-0.22);b.box([sx,st[1]+0.68,st[2]-0.3],[0.26,0.17,0.09],SEAT,ax(VK.fixed),-0.22)}
    if(S.seats.length>2&&!S.two){const rz=st[2]-0.85;b.box([0,st[1]-0.02,rz],[hwW*1.6,0.13,0.48],SEAT,ax(VK.fixed));b.box([0,st[1]+0.3,rz-0.24],[hwW*1.6,0.58,0.11],SEAT,ax(VK.fixed),-0.2)}
    // steering wheel (8-sided ring) ahead of the driver
    const wc=[st[0],st[1]+0.38,st[2]+0.5],wr=0.185;for(let k=0;k<8;k++){const a0=k/8*TAU,a1=(k+1)/8*TAU;const p0=[wc[0]+Math.cos(a0)*wr,wc[1]+Math.sin(a0)*wr*0.42,wc[2]+Math.sin(a0)*wr*0.9],p1=[wc[0]+Math.cos(a1)*wr,wc[1]+Math.sin(a1)*wr*0.42,wc[2]+Math.sin(a1)*wr*0.9];
      const m=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2];b.box(m,[Math.hypot(p1[0]-p0[0],p1[2]-p0[2],p1[1]-p0[1])+0.02,0.03,0.03],IN,ax(VK.fixed),0,Math.atan2(p1[2]-p0[2],p1[0]-p0[0])*-1)}
    b.box([wc[0],wc[1]-0.02,wc[2]+0.06],[0.06,0.06,0.2],IN,ax(VK.fixed),-0.9);
    // door cards and the rear bulkhead hide the far side's back faces
    const cz0=u2z(Math.max(S.rwB,S.rwT-0.04)),cz1=zW-0.1;for(const s of[-1,1]){const x=s*(hwW-0.07);const n=[-s,0,0];b.quad([x,R[0][26]+0.1,cz0],[x,R[0][26]+0.1,cz1],[x,blW+0.01,cz1],[x,blW+0.01,cz0],IN,ax(VK.fixed),n,n,n,n)}
    {const n=[0,0,1];const y0=R[0][26]+0.1,y1=S.rwB>0.1?blW+0.05:blW+0.35;b.quad([hwW-0.07,y0,cz0],[-(hwW-0.07),y0,cz0],[-(hwW-0.07),y1,cz0],[hwW-0.07,y1,cz0],IN,ax(VK.fixed),n,n,n,n)}
    {const n=[0,1,0];b.quad([-(hwW-0.07),R[0][26]+0.12,cz0],[hwW-0.07,R[0][26]+0.12,cz0],[hwW-0.07,R[0][26]+0.12,cz1],[-(hwW-0.07),R[0][26]+0.12,cz1],IN,ax(VK.fixed),n,n,n,n)}
    // headliner (seen from below through the side glass)
    {const z0=u2z(S.rwT+0.015),z1=u2z(S.wsT-0.015);const ra=carRing(S,z0,new Float64Array(31)),rb=carRing(S,z1,new Float64Array(31));if(z1>z0+0.2&&ra[28]-ra[27]>0.2&&rb[28]-rb[27]>0.2){const y=Math.min(ra[28],rb[28])-0.05,n=[0,-1,0],w=Math.min(ra[29],rb[29])*S.rwf*0.9;b.quad([-w,y,z0],[-w,y,z1],[w,y,z1],[w,y,z0],lin('#3a3833'),ax(VK.fixed),n,n,n,n)}}}
  else busInterior(S,b);
}
function busInterior(S,b){const IN=lin('#30353c'),SEAT=lin('#2d5d9e');const H=S.L/2;
  {const n=[0,1,0];b.quad([-1.1,0.62,-H+0.3],[1.1,0.62,-H+0.3],[1.1,0.62,H-0.4],[-1.1,0.62,H-0.4],lin('#3a3f45'),ax(VK.fixed),n,n,n,n)}
  for(let z=-H+1.2;z<H-3.2;z+=0.85)for(const s of[-1,1])if(!(z>-1.3&&z<0.9&&s>0)){b.box([s*0.75,1.05,z],[0.85,0.1,0.45],SEAT,ax(VK.fixed));b.box([s*0.75,1.35,z-0.2],[0.85,0.55,0.08],SEAT,ax(VK.fixed))}
  {const n=[0,-1,0];b.quad([-1.2,2.82,-H+0.2],[-1.2,2.82,H-0.2],[1.2,2.82,H-0.2],[1.2,2.82,-H+0.2],lin('#d9dad6'),ax(VK.fixed),n,n,n,n)}
  for(const s of[-1,1]){const n=[-s,0,0],x=s*1.2;b.quad([x,0.62,-H+0.2],[x,0.62,H-0.2],[x,1.1,H-0.2],[x,1.1,-H+0.2],IN,ax(VK.fixed),n,n,n,n)}
  // destination display (amber LED, light group 9) and the blue OASA-style band above the windscreen
  const z=H+0.006;b.quad([-0.95,2.62,z],[0.95,2.62,z],[0.95,2.86,z],[-0.95,2.86,z],lin('#1a1206'),ax(VK.gloss,9),[0,0,1],[0,0,1],[0,0,1],[0,0,1]);
  b.box([0,1.9,H-0.45],[0.2,0.6,0.2],IN,ax(VK.fixed))}
function carFarDetails(S,b,R,zs){const H=S.L/2;const rF=carRing(S,H,new Float64Array(31)),rR=carRing(S,-H,new Float64Array(31));const hl=S.hl||{w:0.4,h:0.12},tl=S.tl||{w:0.3,h:0.15};
  for(const s of[-1,1]){capRect(b,S,1,s*rF[29]*0.94,s*(rF[29]*0.94-hl.w),rF[27]-0.02-hl.h,rF[27]-0.02,lin('#dfe3e6'),ax(VK.chrome,1),0.01);capRect(b,S,-1,-s*rR[29]*0.95,-s*(rR[29]*0.95-tl.w),rR[27]-0.02-tl.h,rR[27]-0.02,lin('#8a0a12'),ax(VK.gloss,2),0.01)}
  const D=lin('#050506');for(const w of S.wheels){if(w[6])continue;const r=w[3]||S.wr;b.cylX([w[0]+(w[0]<0?0.02:-0.02),r,w[1]],r,S.ww/2,7,D,ax(VK.fixed),w[0]<0?-1:1)}}

/* ------------------------------------------------------------------ wheel, driver, pool geometry */
function wheelGeo(spokes){const b=new VB();const seg=14,TY=lin('#1a1b1d'),SW=lin('#232427'),RIM=lin('#b5b9bd'),BAR=lin('#2b2d30'),HUB=lin('#8e9296');
  // tyre profile (x across the width, r radius), outer face at +x
  const prof=[[-0.42,0.66],[-0.5,0.82],[-0.44,0.97],[-0.36,1.0],[0.36,1.0],[0.44,0.97],[0.5,0.82],[0.42,0.66]];
  for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;for(let k=0;k<prof.length-1;k++){const p=prof[k],q=prof[k+1];const P=(a,pp)=>[pp[0],Math.sin(a)*pp[1],Math.cos(a)*pp[1]];
    const nx=-(q[1]-p[1]),nr=(q[0]-p[0]);const nl=Math.hypot(nx,nr)||1;const N=a=>[nx/nl,Math.sin(a)*nr/nl,Math.cos(a)*nr/nl];const col=(k===3)?TY:SW;b.quad(P(a0,p),P(a0,q),P(a1,q),P(a1,p),col,ax(VK.fixed),N(a0),N(a0),N(a1),N(a1))}}
  // barrel (dark, recessed) and the rim lip
  for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;const P=(a,x,r)=>[x,Math.sin(a)*r,Math.cos(a)*r];b.tri(P(0,0.08,0),P(a0,0.08,0.66),P(a1,0.08,0.66),BAR,ax(VK.fixed),[1,0,0]);
    b.quad(P(a0,0.42,0.66),P(a1,0.42,0.66),P(a1,0.4,0.58),P(a0,0.4,0.58),RIM,ax(VK.chrome),[1,0,0],[1,0,0],[1,0,0],[1,0,0]);
    b.quad(P(a0,0.4,0.58),P(a1,0.4,0.58),P(a1,0.1,0.6),P(a0,0.1,0.6),BAR,ax(VK.fixed),[0,-Math.sin(a0),-Math.cos(a0)],[0,-Math.sin(a1),-Math.cos(a1)],[0,-Math.sin(a1),-Math.cos(a1)],[0,-Math.sin(a0),-Math.cos(a0)])}
  // spokes
  const ns=spokes||5;for(let s=0;s<ns;s++){const a=s/ns*TAU;const w0=0.13,w1=0.07;const P=(r,w,x)=>[x,Math.sin(a)*r+Math.cos(a)*w,Math.cos(a)*r-Math.sin(a)*w];
    const A=P(0.12,w0,0.43),B=P(0.12,-w0,0.43),C=P(0.6,-w1,0.41),D=P(0.6,w1,0.41);b.quad(A,B,C,D,RIM,ax(VK.chrome),[1,0,0],[1,0,0],[1,0,0],[1,0,0]);
    const A2=P(0.12,w0,0.2),D2=P(0.6,w1,0.2),B2=P(0.12,-w0,0.2),C2=P(0.6,-w1,0.2);b.quad(A2,A,D,D2,RIM,ax(VK.chrome));b.quad(B,B2,C2,C,RIM,ax(VK.chrome))}
  for(let i=0;i<8;i++){const a0=i/8*TAU,a1=(i+1)/8*TAU;b.tri([0.46,0,0],[0.44,Math.sin(a0)*0.15,Math.cos(a0)*0.15],[0.44,Math.sin(a1)*0.15,Math.cos(a1)*0.15],HUB,ax(VK.chrome),[1,0,0])}
  return b.build(0)}
function driverGeo(){const b=new VB();const SK=lin('#c08a68'),HR=lin('#2a1d16'),P=[1,1,1],PNT=lin('#2b3038');
  b.box([0,0.3,-0.06],[0.4,0.52,0.24],P,ax(VK.paint),-0.2);// torso (shirt colour = instance colour)
  b.box([0,0.62,0.0],[0.12,0.08,0.12],SK,ax(VK.fixed));
  // head: low octagonal prism with a hair cap
  for(let k=0;k<8;k++){const a0=k/8*TAU,a1=(k+1)/8*TAU,r=0.1;const p=(a,y,rr)=>[Math.sin(a)*rr,y,0.02+Math.cos(a)*rr*1.1];
    b.quad(p(a0,0.66,r*0.85),p(a1,0.66,r*0.85),p(a1,0.8,r),p(a0,0.8,r),SK,ax(VK.fixed));b.quad(p(a0,0.8,r),p(a1,0.8,r),p(a1,0.9,r*0.92),p(a0,0.9,r*0.92),Math.cos(a0+0.4)<-0.2?HR:SK,ax(VK.fixed));
    b.tri([0,0.95,0.01],p(a0,0.9,r*0.95),p(a1,0.9,r*0.95),HR,ax(VK.fixed))}
  for(const s of[-1,1]){b.box([s*0.2,0.35,0.12],[0.08,0.08,0.32],P,ax(VK.paint),0.5);b.box([s*0.15,0.42,0.33],[0.07,0.07,0.2],SK,ax(VK.fixed),-0.2);b.box([s*0.11,0.02,0.2],[0.13,0.13,0.42],PNT,ax(VK.fixed))}
  return b.build(0)}
function poolTex(){const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');const im=g.createImageData(64,128);
  for(let y=0;y<128;y++)for(let x=0;x<64;x++){const v=y/127,u=(x-31.5)/31.5;const spread=0.18+0.82*v;const a=Math.max(0,1-Math.abs(u)/spread);const fall=Math.pow(Math.sin(Math.PI*Math.min(1,v*1.08)),0.8)*(1-v*0.55);const k=Math.pow(a,1.6)*fall;
    const i=(y*64+x)*4;im.data[i]=255;im.data[i+1]=236;im.data[i+2]=200;im.data[i+3]=Math.round(255*k)}g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
/* plate atlas: 8×16 cells of 128×32 px; cell 127 is the taxi roof sign */
const PLATE_LET='ABEHIKMNOPTXYZ';
function plateTex(){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');let s=12345;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};
  for(let i=0;i<128;i++){const x=(i%8)*128,y=Math.floor(i/8)*32;
    if(i===127){g.fillStyle='#f6f3e6';g.fillRect(x,y,128,32);g.fillStyle='#111';g.font='bold 24px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('TAXI',x+64,y+17);continue}
    g.fillStyle='#fbfbf8';g.fillRect(x+1,y+1,126,30);g.strokeStyle='#1b1b1b';g.lineWidth=2;g.strokeRect(x+2,y+2,124,28);g.fillStyle='#1f45a8';g.fillRect(x+3,y+3,15,26);
    g.fillStyle='#ffd400';for(let k=0;k<8;k++){const a=k/8*TAU;g.fillRect(x+10+Math.cos(a)*4.5-0.7,y+11+Math.sin(a)*4.5-0.7,1.5,1.5)}g.fillStyle='#fff';g.font='bold 8px Arial';g.textAlign='center';g.fillText('GR',x+10.5,y+26);
    const L3=[0,0,0].map(()=>PLATE_LET[Math.floor(r()*PLATE_LET.length)]).join(''),N4=String(1000+Math.floor(r()*8999));g.fillStyle='#111';g.font='bold 20px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(L3+'-'+N4,x+72,y+17)}
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}

/* ------------------------------------------------------------------ materials (one shared body shader for every vehicle mesh) */
const VU={uTime:{value:0},uNight:{value:0},uPlate:{value:null}};
function vehicleMaterial(){const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.24,metalness:0.42,envMapIntensity:1.05});
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,VU);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aux;attribute vec2 dw;attribute vec4 iLit;attribute vec4 iMisc;varying vec4 vAux;varying vec4 vLit;varying vec2 vMisc;varying float vHide;')
      .replace('#include <color_vertex>',`#if defined(USE_COLOR)
  vColor=color;
  #ifdef USE_INSTANCING_COLOR
  float pnt=step(0.5,aux.x)*step(aux.x,1.5);vColor=mix(color,color*instanceColor,pnt);
  #endif
#endif
vAux=aux;vLit=iLit;vMisc=vec2(mod(iMisc.x,1000.0),iMisc.w);vHide=step(999.5,iMisc.x)*step(aux.z,-0.5)*step(4.5,aux.w);`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
transformed+=vec3(sin(position.y*23.0)*0.03,-0.06,-0.3)*dw.x*iMisc.y*(0.7+0.3*sin(position.x*13.0+position.y*9.0));
transformed+=vec3(sin(position.y*19.0)*0.03,-0.05,0.26)*dw.y*iMisc.z*(0.7+0.3*sin(position.x*11.0+position.y*7.0));`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uTime;uniform float uNight;uniform sampler2D uPlate;varying vec4 vAux;varying vec4 vLit;varying vec2 vMisc;varying float vHide;')
      .replace('#include <color_fragment>',`#include <color_fragment>
if(vHide>0.5)discard;
float pk=vAux.x;float isPaint=step(0.5,pk)*step(pk,1.5);float isChrome=step(1.5,pk)*step(pk,2.5);float isGloss=step(2.5,pk);
if(vAux.z>-0.5){float cell=vAux.z>=1.5?127.0:floor(vMisc.x+0.5);float pu=vAux.z>=1.5?vAux.z-2.0:vAux.z;vec2 c=vec2(mod(cell,8.0),floor(cell/8.0));
  vec2 puv=vec2(c.x+0.02+pu*0.96,15.0-c.y+0.06+vAux.w*0.88)/vec2(8.0,16.0);vec3 tc=texture2D(uPlate,puv).rgb;diffuseColor.rgb=pow(tc,vec3(2.2));}`)
      .replace('#include <roughnessmap_fragment>','float roughnessFactor=isPaint*roughness+isChrome*0.16+isGloss*0.22+(1.0-isPaint-isChrome-isGloss)*0.74;')
      .replace('#include <metalnessmap_fragment>','float metalnessFactor=isPaint*metalness+isChrome*0.95;')
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
{float lg=floor(vAux.y+0.5);if(lg>0.5){float blink=step(0.5,fract(uTime*1.42));float ind=floor(vLit.z+0.5);float lOn=(ind==1.0||ind==3.0)?1.0:0.0;float rOn=(ind==2.0||ind==3.0)?1.0:0.0;vec3 e=vec3(0.0);
  if(lg<1.5)e=vec3(1.0,0.95,0.84)*(0.03+vLit.x*3.2);
  else if(lg<2.5)e=vec3(1.0,0.04,0.02)*(0.02+vLit.x*0.9+vLit.y*2.6);
  else if(lg<3.5)e=vec3(1.0,0.03,0.02)*(vLit.y*3.0);
  else if(lg<4.5)e=vec3(1.0,0.42,0.02)*(blink*lOn*3.0);
  else if(lg<5.5)e=vec3(1.0,0.42,0.02)*(blink*rOn*3.0);
  else if(lg<6.5)e=vec3(1.0,0.98,0.95)*(vLit.w*2.2);
  else if(lg<7.5)e=diffuseColor.rgb*(0.25+uNight*1.6)*(0.4+0.6*vMisc.y);
  else if(lg<8.5)e=vec3(0.9,0.95,1.0)*(vMisc.y*2.4);
  else if(lg<9.5){e=vec3(1.0,0.5,0.04)*(0.6+0.8*uNight)*vMisc.y;}
  totalEmissiveRadiance+=e;}}`);
  };m.customProgramCacheKey=()=>'gkveh1';return m}

/* ------------------------------------------------------------------ instancing */
let carMat=null,carMeshes={},CARS=[];
const VEH={near:45,nearMax:24,t:0,last:0,ready:true,pending:0,frust:new THREE.Frustum(),pm:new THREE.Matrix4(),sph:new THREE.Sphere(),cand:[],mats:null,wheels:{},driver:null,pool:null,ids:0};
const _vm1=new THREE.Matrix4(),_vm2=new THREE.Matrix4(),_vm3=new THREE.Matrix4(),_vq=new THREE.Quaternion(),_vq2=new THREE.Quaternion(),_vv=new THREE.Vector3(),_vs=new THREE.Vector3(),_vX=new THREE.Vector3(1,0,0),_vY=new THREE.Vector3(0,1,0);
function instAttrs(geo,cap){geo.setAttribute('iLit',new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('iMisc',new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4).setUsage(THREE.DynamicDrawUsage))}
function mkInst(geo,mat,cap,shadow){const im=new THREE.InstancedMesh(geo,mat,cap);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.setColorAt(0,new THREE.Color(1,1,1));im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.count=0;im.visible=false;im.frustumCulled=false;im.castShadow=!!shadow;im.receiveShadow=true;scene.add(im);return im}
function initVehicleMats(){if(VEH.mats)return VEH.mats;VU.uPlate.value=plateTex();const body=vehicleMaterial();
  const glass=new THREE.MeshStandardMaterial({color:0x0b1015,roughness:0.05,metalness:0.1,transparent:true,opacity:0.66,envMapIntensity:1.7,depthWrite:false,side:THREE.DoubleSide});
  const pool=new THREE.MeshBasicMaterial({map:poolTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0x000000,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  if(typeof useEnv==='function'){useEnv(body);useEnv(glass)}else if(carMat&&carMat.envMap){body.envMap=carMat.envMap;glass.envMap=carMat.envMap}
  VEH.mats={body,glass,pool};return VEH.mats}
function setupType(k){const S=CARTYPES[k];if(carMeshes[k])return carMeshes[k];const M=initVehicleMats();let near,far;
  if(S.build){const g=S.build(S);near=g;far=g.far||g}else{const n=buildCarGeo(S,0),f=buildCarGeo(S,1);near=n;far=f}
  const NC=Math.min(S.cap,40);instAttrs(near.body,NC);instAttrs(far.body,S.cap);
  const cm={S,near:mkInst(near.body,M.body,NC,true),glass:near.glass?mkInst(near.glass,M.glass,NC,false):null,far:mkInst(far.body,M.body,S.cap,true),n:0,nn:0,nf:0,tris:{near:near.body.index.count/3+(near.glass?near.glass.index.count/3:0),far:far.body.index.count/3}};
  const wk=S.wheelKind||'std';if(!VEH.wheels[wk]){const g=wheelGeo(5);const WC=wk==='std'?256:64;instAttrs(g,WC);VEH.wheels[wk]={im:mkInst(g,M.body,WC,true),n:0}}cm.wheel=VEH.wheels[wk];
  carMeshes[k]=cm;if(S.model)loadModelType(k);return cm}

/* glTF-derived models shipped as JSON (models/ferrari.json, built by tools/cars/ferrari_build.js): the loft stands in until it has loaded */
function vB64(s,T){const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new T(u.buffer)}
function geoFromPack(p,L){const g=new THREE.BufferGeometry();const pos=vB64(p.pos,Float32Array),nor=vB64(p.nor,Int8Array),c8=vB64(p.col,Uint8Array),a8=vB64(p.aux,Int8Array),idx=vB64(p.idx,Uint16Array);
  const col=new Float32Array(c8.length);for(let i=0;i<c8.length;i++){const v=c8[i]/255;col[i]=v*v}const aux=new Float32Array(a8.length);for(let i=0;i<a8.length;i++)aux[i]=a8[i];
  const n=pos.length/3,dw=new Float32Array(n*2);if(L){const h=L/2;for(let i=0;i<n;i++){const z=pos[i*3+2];dw[i*2]=sstep((z-(h-0.95))/0.95);dw[i*2+1]=sstep((-(h-0.95)-z)/0.95)}}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3,true));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('aux',new THREE.BufferAttribute(aux,4));g.setAttribute('dw',new THREE.BufferAttribute(dw,2));
  g.setIndex(new THREE.BufferAttribute(idx,1));g.computeBoundingSphere();return g}
function loadModelType(k){const S=CARTYPES[k];if(!S.model||S.loading)return;S.loading=true;VEH.pending++;
  fetch(S.model).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(J=>{const cm=carMeshes[k];if(!cm)return;const NC=cm.near.instanceMatrix.count;
    const nb=geoFromPack(J.near,S.L);instAttrs(nb,NC);cm.near.geometry.dispose();cm.near.geometry=nb;if(cm.glass){const gg=geoFromPack(J.glass,0);cm.glass.geometry.dispose();cm.glass.geometry=gg}
    const fb=geoFromPack(J.far,S.L);instAttrs(fb,cm.far.instanceMatrix.count);cm.far.geometry.dispose();cm.far.geometry=fb;
    if(J.wheelGeo&&S.wheelKind){const wg=geoFromPack(J.wheelGeo,0);instAttrs(wg,64);const W=VEH.wheels[S.wheelKind];if(W){W.im.geometry.dispose();W.im.geometry=wg}}
    cm.tris={near:J.near.nt+J.glass.nt,far:J.far.nt};S.loaded=true}).catch(e=>console.warn('vehicle model unavailable',S.model,e)).finally(()=>{VEH.pending--})}
function initCars(){const M=initVehicleMats();
  if(!VEH.driver){const g=driverGeo();instAttrs(g,64);VEH.driver={im:mkInst(g,M.body,64,false),n:0}}
  if(!VEH.pool){const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);g.translate(0,0,0.5);VEH.pool={im:new THREE.InstancedMesh(g,M.pool,48),n:0};VEH.pool.im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);VEH.pool.im.frustumCulled=false;VEH.pool.im.count=0;VEH.pool.im.renderOrder=2;scene.add(VEH.pool.im)}
  for(const k in CARTYPES)if(!CARTYPES[k].lazy)setupType(k);
  if(typeof initExotics==='function')initExotics()}

/* exotic cars parked at believable spots: next to the spawn junction, on Kassaveti, outside the hotels and villas toward Kefalari */
const EXOTIC_SPOTS=[{type:'ferrari',alt:'wedge',at:'junction',col:'#c8101a'},{type:'wedge',at:'kassaveti',col:'#f28a00'},{type:'coupe',at:'kefalari',col:'#b9bcc0',off:[0,0]},{type:'offroad',at:'kefalari',col:'#121314',off:[60,-40]},{type:'cabrio',at:'platanos',col:'#1d3f74',off:[30,40]}];
function initExotics(){if(!MAP||!MAP.parked||VEH.exoticsDone)return;VEH.exoticsDone=true;const used=[];
  const anchor=s=>{if(s.at==='kassaveti'){for(const r of ROADS)if(/Κασσαβ/.test(r.name)){const m=r.ps[Math.floor(r.ps.length/2)];return m}}const k=MAP.key[s.at]||MAP.key.platanos;return[k[0]+(s.off?s.off[0]:0),k[1]+(s.off?s.off[1]:0)]};
  for(const s of EXOTIC_SPOTS){const type=CARTYPES[s.type]?s.type:s.alt;if(!type||!CARTYPES[type])continue;const a=anchor(s);if(!a)continue;let best=null,bd=1e9;
    MAP.parked.forEach((p,i)=>{if(used.indexOf(i)>=0)return;const x=p[0]/10,z=p[1]/10;const d=Math.hypot(x-a[0],z-a[1]);if(d<bd){bd=d;best=i}});if(best===null||bd>140)continue;used.push(best);
    const p=MAP.parked[best],x=p[0]/10,z=p[1]/10,yaw=p[2]===undefined?0:Math.PI/2-p[2];const c=addCar(type,x,z,yaw,s.col,'show');if(!c)continue;c.mode='parked';c.exotic=true;CLAIMED.push([x,z,3.2]);VEH.exotics=(VEH.exotics||[]).concat([c])}}


/* the driver's door of the car being entered / left: a separate articulated part (the body hides its door panels meanwhile) */
function doorGeo(S){if(S._door!==undefined)return S._door;if(S.cls!=='car'||S.doors.length<2||S.build){S._door=null;return null}const b=new VB();const z0=(S.doors[1]-0.5)*S.L,z1=(S.doors[0]-0.5)*S.L;
  carPatch(b,S,z0,z1,2.0,7.0,1,6,6,0,[1,1,1],ax(VK.paint));carPatch(b,S,z0,z1,7.0,S.wsT>S.doors[1]?8.9:7.0,1,6,2,-0.004,GLASSC,ax(VK.gloss));
  const rr=carRing(S,(z0+z1)/2,new Float64Array(31));const x=-rr[0*2]+0,xi=rr[29]-0.09;{const n=[-1,0,0];b.quad([xi,rr[26]+0.1,z0],[xi,rr[26]+0.1,z1],[xi,rr[27],z1],[xi,rr[27],z0],lin('#16171a'),ax(VK.fixed),n,n,n,n)}
  const g=b.build(0);const hz=carRing(S,z1,new Float64Array(31));const hx=hz[29]*0.99;g.translate(-hx,0,-z1);const nv=g.attributes.position.count;g.setAttribute('iLit',new THREE.BufferAttribute(new Float32Array(nv*4),4));g.setAttribute('iMisc',new THREE.BufferAttribute(new Float32Array(nv*4),4));
  S._door={g,hx,hz:z1};return S._door}
function carDoor(c){c.doorT=1.25}
function updateDoors(dt){let any=null;for(const c of [player.car,VEH.lastDoorCar]){if(!c||!(c.doorT>0))continue;c.doorT=Math.max(0,c.doorT-dt);const t=1.25-c.doorT;c.doorA=t<0.45?sstep(t/0.45):sstep(c.doorT/0.6);any=c}
  if(player.car)VEH.lastDoorCar=player.car;
  if(!VEH.doorMesh){VEH.doorMesh=new THREE.Mesh(new THREE.BufferGeometry(),VEH.mats.body);VEH.doorMesh.matrixAutoUpdate=false;VEH.doorMesh.castShadow=true;VEH.doorMesh.visible=false;scene.add(VEH.doorMesh)}
  const D=VEH.doorMesh;if(!any||!(any.doorA>0.02)){D.visible=false;if(any&&any.doorT<=0)any.doorA=0;return}const S=CARTYPES[any.type];const dg=doorGeo(S);if(!dg){D.visible=false;any.doorA=0;return}
  if(D.geometry!==dg.g){D.geometry=dg.g}const col=dg.g.attributes.color;if(dg.colFor!==any.id){const a=col.array,cc=any.color;for(let i=0;i<a.length;i+=3){const k=dg.g.attributes.aux.array[(i/3)*4];if(k===1){a[i]=cc.r;a[i+1]=cc.g;a[i+2]=cc.b}}col.needsUpdate=true;dg.colFor=any.id}
  _vm1.fromArray(any.m);_vm2.makeRotationY(-1.15*any.doorA);_vm2.setPosition(dg.hx,0,dg.hz);D.matrix.multiplyMatrices(_vm1,_vm2);D.matrixWorldNeedsUpdate=true;D.visible=true}
function vehiclesReady(){return VEH.pending<=0}
/* parked-slot variety: boot asks for the five basic types; the street mix is richer */
function carVariant(type,x,z){const h=hf(Math.round(x*7.3)*31+Math.round(z*5.1)*17);if(type==='hatch')return h<0.42?'mini':'hatch';if(type==='sedan')return h<0.28?'exec':'sedan';if(type==='suv')return h<0.36?'suvL':'suv';return type}
const CLAIMED=[];
function scooterRow(x,z,yaw){const n=3+Math.floor(hf(Math.round(x*3)+Math.round(z*7))*2);const fx=Math.sin(yaw),fz=Math.cos(yaw);for(let i=0;i<n;i++){const o=(i-(n-1)/2)*0.85;const t=hf(i*31+Math.round(x*5))<0.18?'scooterD':hf(i*17+Math.round(z*3))<0.15?'moto':'scooter';addCar(t,x+fx*o,z+fz*o,yaw+Math.PI/2+(hf(i*7+Math.round(x))-0.5)*0.25,null,'row')}}// parking spots taken by special vehicles (exotics, scooter rows)
function addCar(type,x,z,yaw,color,mode){mode=mode||'parked';if(mode==='parked'){for(const c of CLAIMED)if(Math.hypot(c[0]-x,c[1]-z)<(c[2]||3))return null;if((type==='hatch'||type==='sedan')&&hf(Math.round(x*11)*7+Math.round(z*13))<0.09){scooterRow(x,z,yaw||0);return null}type=carVariant(type,x,z)}
  if(mode==='row')mode='parked';
  if(!CARTYPES[type])type='hatch';const cm=setupType(type);if(cm.n>=cm.S.cap)return null;cm.n++;const S=cm.S;
  let col=color;if(S.fixedCol)col=S.fixedCol;else if(!col||(mode==='parked'&&type!=='taxi'&&hf(VEH.ids*13+7)<0.5))col=COLS[PAL_COMMON[Math.floor(hf(VEH.ids*29+3)*PAL_COMMON.length)]];
  const c={type,id:VEH.ids++,x,z,yaw:yaw||0,y:0,pitch:0,roll:0,sp:0,sr:0,sh:0,vf:0,vr:0,steer:0,mode,color:new THREE.Color(col).convertSRGBToLinear(),hp:100,spin:0,plate:VEH.ids%127,dmgF:0,dmgR:0,brk:false,ind:0,
    m:new Float32Array(16),mg:new Float32Array(16),door:0,driver:null,_d2:0};
  if(mode==='traffic'||mode==='player')c.occ=1;CARS.push(c);syncCar(c);return c}
function seatPos(c,k){const S=CARTYPES[c.type];const s=S.seats[k||0]||S.seat;return s}
/* characters agent hook: seat a person (THREE.Object3D) in a car; null removes. The generic driver silhouette is hidden while someone is attached. */
function attachDriver(c,person,seat){if(!c)return;if(!c.riders)c.riders=[];c.riders=c.riders.filter(r=>r.seat!==(seat||0));if(person){c.riders.push({o:person,seat:seat||0});person.matrixAutoUpdate=false}c.driver=c.riders.find(r=>r.seat===0)?c.riders.find(r=>r.seat===0).o:null}
function composeYXZ(o,x,y,z,yaw,pitch,roll){const a=Math.cos(pitch),b=Math.sin(pitch),c=Math.cos(yaw),d=Math.sin(yaw),e=Math.cos(roll),f=Math.sin(roll);const ce=c*e,cf=c*f,de=d*e,df=d*f;
  o[0]=ce+df*b;o[4]=de*b-cf;o[8]=a*d;o[1]=a*f;o[5]=a*e;o[9]=-b;o[2]=cf*b-de;o[6]=df+ce*b;o[10]=a*c;o[3]=0;o[7]=0;o[11]=0;o[12]=x;o[13]=y;o[14]=z;o[15]=1}
function syncCar(c){if(!c.fixY)c.y=terr(c.x,c.z);composeYXZ(c.mg,c.x,c.y,c.z,c.yaw,c.pitch,c.roll);composeYXZ(c.m,c.x,c.y+(c.sh||0),c.z,c.yaw,c.pitch+(c.sp||0),c.roll+(c.sr||0));c.dirty=true}
/* lights state for a car: [head, brake, indicator(0 none/1 left/2 right/3 hazard), reverse] */
function carLights(c,night,out){const run=c.mode==='traffic'||c.mode==='player'||c.mode==='bus';out[0]=run&&(night>0.22||c.lightsOn)?1:0;out[1]=run&&c.brk?1:0;out[2]=c.ind||0;out[3]=run&&c.vf<-0.4?1:0;return out}
const _lit=[0,0,0,0];
function writeInst(im,n,c,night){im.instanceMatrix.array.set(c.m,n*16);const ca=im.instanceColor.array;ca[n*3]=c.color.r;ca[n*3+1]=c.color.g;ca[n*3+2]=c.color.b;
  const g=im.geometry,L=g.attributes.iLit.array,Mi=g.attributes.iMisc.array;carLights(c,night,_lit);L[n*4]=_lit[0];L[n*4+1]=_lit[1];L[n*4+2]=_lit[2];L[n*4+3]=_lit[3];
  Mi[n*4]=c.plate+(c.doorA>0.02?1000:0);Mi[n*4+1]=c.dmgF;Mi[n*4+2]=c.dmgR;Mi[n*4+3]=(c.mode==='traffic'||c.mode==='player'||c.mode==='bus')?1:0}
function finishInst(im,n){im.count=n;im.visible=n>0;if(n>0){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;const g=im.geometry;if(g.attributes.iLit){g.attributes.iLit.needsUpdate=true;g.attributes.iMisc.needsUpdate=true}}}
function flushCars(){if(!VEH.driver||!VEH.pool)return;const now=performance.now()/1000;const dt=VEH.last?Math.min(0.1,now-VEH.last):0;VEH.last=now;VEH.t+=dt;VU.uTime.value=VEH.t;
  const night=(typeof U!=='undefined'&&U.night)?U.night.value:0;VU.uNight.value=night;if(typeof updateLoose==='function'&&dt>0)updateLoose(dt);
  const qn=typeof Q!=='undefined'&&Q?(Q.sh===0?30:Q.pr>1.2?70:45):45,qmax=typeof Q!=='undefined'&&Q?(Q.sh===0?14:Q.pr>1.2?40:24):24;const farD=typeof Q!=='undefined'&&Q&&Q.dist?Q.dist:260;
  camera.updateMatrixWorld();VEH.pm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);VEH.frust.setFromProjectionMatrix(VEH.pm);const cx=camera.position.x,cz=camera.position.z;
  for(const k in carMeshes){const m=carMeshes[k];m.nn=0;m.nf=0}for(const k in VEH.wheels)VEH.wheels[k].n=0;VEH.driver.n=0;VEH.pool.n=0;const cand=VEH.cand;cand.length=0;
  for(const c of CARS){if(c.hidden)continue;const S=CARTYPES[c.type];if(c.vf)c.spin=(c.spin+c.vf*dt/S.wr)%TAU;
    const dx=c.x-cx,dz=c.z-cz,d2=dx*dx+dz*dz;if(d2>farD*farD&&c!==player.car)continue;VEH.sph.center.set(c.x,c.y+S.H*0.5,c.z);VEH.sph.radius=S.L*0.6+3;if(!VEH.frust.intersectsSphere(VEH.sph))continue;
    c._d2=d2;if(d2<qn*qn||c===player.car||S.L>8&&d2<(qn*1.6)**2)cand.push(c);else{const cm=carMeshes[c.type];writeInst(cm.far,cm.nf++,c,night)}}
  cand.sort((a,b)=>a._d2-b._d2);
  for(let i=0;i<cand.length;i++){const c=cand[i],cm=carMeshes[c.type];if((i>=qmax&&c!==player.car)||cm.nn>=cm.near.instanceMatrix.count){writeInst(cm.far,cm.nf++,c,night);continue}
    writeInst(cm.near,cm.nn,c,night);if(cm.glass)cm.glass.instanceMatrix.array.set(c.m,cm.nn*16);cm.nn++;nearExtras(c,cm,night)}
  for(const k in carMeshes){const m=carMeshes[k];finishInst(m.near,m.nn);if(m.glass){m.glass.count=m.nn;m.glass.visible=m.nn>0;if(m.nn)m.glass.instanceMatrix.needsUpdate=true}finishInst(m.far,m.nf)}
  for(const k in VEH.wheels)finishInst(VEH.wheels[k].im,VEH.wheels[k].n);finishInst(VEH.driver.im,VEH.driver.n);
  const P=VEH.pool;P.im.count=P.n;P.im.visible=P.n>0&&night>0.05;P.im.material.color.setScalar(0.55*night);if(P.n)P.im.instanceMatrix.needsUpdate=true;
  updateDoors(dt);if(typeof updateVehicleFX==='function')updateVehicleFX(dt);if(typeof vehAudioTick==='function')vehAudioTick(dt)}
const _wv=new Float32Array(16);
function nearExtras(c,cm,night){const S=cm.S;_vm1.fromArray(c.mg);
  // wheels: ground matrix × position × steer × spin × size
  const W=cm.wheel;for(const w of S.wheels){if(W.n>=W.im.instanceMatrix.count)break;const r=w[3]||S.wr;const left=w[0]<0;const steer=w[2]?-(c.steer||0)*(S.steerVis||1):0;
    _vq.setFromAxisAngle(_vY,w[5]!==undefined?w[5]:steer+(left?Math.PI:0));_vq2.setFromAxisAngle(_vX,w[6]?0:(left?-c.spin:c.spin));_vq.multiply(_vq2);_vv.set(w[0],r+(w[4]||0),w[1]);_vs.set(S.ww,r,r);_vm2.compose(_vv,_vq,_vs);_vm3.multiplyMatrices(_vm1,_vm2);
    _vm3.toArray(W.im.instanceMatrix.array,W.n*16);const g=W.im.geometry.attributes;g.iLit.array.fill(0,W.n*4,W.n*4+4);g.iMisc.array.fill(0,W.n*4,W.n*4+4);W.n++}
  // generic driver silhouette in moving cars (hidden when the characters module attached a real person)
  if(c.driver){_vm2.makeTranslation(S.seat[0],S.seat[1],S.seat[2]);_vm3.multiplyMatrices(_vm1.fromArray(c.m),_vm2);c.driver.matrix.copy(_vm3);c.driver.matrixWorldNeedsUpdate=true;_vm1.fromArray(c.mg)}
  else if((c.occ||c.mode==='traffic'||c.mode==='player'||c.mode==='bus')&&VEH.driver.n<64&&!S.noDriver){const D=VEH.driver;_vm2.makeTranslation(S.seat[0],S.seat[1]-0.05,S.seat[2]);_vm3.multiplyMatrices(_vm1.fromArray(c.m),_vm2);_vm3.toArray(D.im.instanceMatrix.array,D.n*16);
    const sc=hf(c.id*7+1),col=_drvCol[Math.floor(sc*_drvCol.length)];D.im.instanceColor.array.set(col,D.n*3);D.n++;_vm1.fromArray(c.mg)}
  if(c.riders)for(const r of c.riders){if(r.seat===0)continue;const s=S.seats[r.seat];if(!s)continue;_vm2.makeTranslation(s[0],s[1],s[2]);_vm3.multiplyMatrices(_vm1.fromArray(c.m),_vm2);r.o.matrix.copy(_vm3);r.o.matrixWorldNeedsUpdate=true;_vm1.fromArray(c.mg)}
  // headlight pool on the road
  if(night>0.05&&(c.mode==='traffic'||c.mode==='player'||c.mode==='bus'||c.lightsOn)&&VEH.pool.n<48){const sz=S.L>8?1.3:1;_vv.set(0,0.07,S.L/2-0.2);_vq.identity();_vs.set(4.2*sz,1,11*sz);_vm2.compose(_vv,_vq,_vs);_vm3.multiplyMatrices(_vm1,_vm2);_vm3.toArray(VEH.pool.im.instanceMatrix.array,VEH.pool.n*16);VEH.pool.n++}}
const _drvCol=['#2b3a55','#efefef','#1c1c1c','#6d2a2a','#3d5a40','#8a7a62','#2d4f7c','#b8b8b8','#5a3b5e','#c7a76a'].map(lin);
/* push a point (player/NPC) out of a car's footprint */
function carPush(c,p,r){if(c.hidden)return false;const dx=p.x-c.x,dz=p.z-c.z;if(dx*dx+dz*dz>64)return false;const co=Math.cos(c.yaw),si=Math.sin(c.yaw);let lx=dx*co-dz*si,lz=dx*si+dz*co;const T_=CARTYPES[c.type];const hx=T_.W/2+r,hz=T_.L/2+r;
  if(Math.abs(lx)<hx&&Math.abs(lz)<hz){if(hx-Math.abs(lx)<hz-Math.abs(lz))lx=Math.sign(lx||1)*hx;else lz=Math.sign(lz||1)*hz;p.x=c.x+co*lx+si*lz;p.z=c.z-si*lx+co*lz;return true}return false}

/* ============================== TRAIN ============================== */
/* Athens Line 1 (ex-ISAP) stock as far as public descriptions allow: white/silver bodies with the green Line 1 stripe, four pairs of sliding doors
   per side per car, cab ends with a big windscreen and head/tail lamps, bogies, third-rail shoes (no pantograph). Five cars; doors open at the platform. */
const TRAIN={cars:[],s:-400,state:'away',t:0,doors:0,doorMesh:null,chimed:false,warned:false};
const TRAIN_DOORS=[-6.3,-2.1,2.1,6.3],TRAIN_L=17.2,TRAIN_W=2.85,TRAIN_Y0=1.05,TRAIN_Y1=4.0;
function trainGeo(cabF,cabR){const b=new VB();const W=TRAIN_W/2,L=TRAIN_L/2,y0=TRAIN_Y0,y1=TRAIN_Y1;const WH=lin('#e8eae6'),GR=lin('#159a48'),GRD=lin('#0c6b31'),WIN=lin('#0b1116'),DK=lin('#1b1d20'),GY=lin('#8d9196'),IN=lin('#c9ccc6'),SEAT=lin('#2f6db0');
  const F=ax(VK.fixed),G=ax(VK.gloss),C=ax(VK.chrome);
  // body cross-section (half): bottom, side, tumblehome, roof
  const prof=[[W,y0],[W,y0+1.0],[W*1.0,y0+2.05],[W*0.97,y0+2.55],[W*0.88,y1-0.12],[W*0.6,y1-0.02],[0,y1+0.02]];
  const colAt=(k,z)=>{if(k===0)return null;return k===2||k===3?null:WH};
  // side panels between doors (doorways left open for the leaves), window band, stripe
  const segs=[];let z0=-L;for(const d of TRAIN_DOORS){segs.push([z0,d-0.66]);z0=d+0.66}segs.push([z0,L]);
  for(const sd of[-1,1]){const n=[sd,0,0];
    for(const [a,c] of segs){const x=sd*W;const q=(ya,yb,col,aux)=>b.quad([x,ya,a],[x,ya,c],[x,yb,c],[x,yb,a],col,aux,n,n,n,n);
      q(y0,y0+0.42,WH,G);q(y0+0.42,y0+0.6,GR,G);q(y0+0.6,y0+0.95,WH,G);
      // windows with pillars
      const len=c-a;const nw=Math.max(1,Math.round(len/1.6));for(let i=0;i<nw;i++){const za=a+len*i/nw,zb=a+len*(i+1)/nw;const m=0.12;b.quad([x,y0+0.95,za],[x,y0+0.95,za+m],[x,y0+2.05,za+m],[x,y0+2.05,za],WH,G,n,n,n,n);b.quad([x,y0+0.95,zb-m],[x,y0+0.95,zb],[x,y0+2.05,zb],[x,y0+2.05,zb-m],WH,G,n,n,n,n);
        b.quad([x*0.995,y0+0.95,za+m],[x*0.995,y0+0.95,zb-m],[x*0.995,y0+2.05,zb-m],[x*0.995,y0+2.05,za+m],WIN,G,n,n,n,n)}
      q(y0+2.05,y0+2.12,GRD,G)}
    // above the doorways and the doorway frames + dark interior behind them
    for(const d of TRAIN_DOORS){const x=sd*W;b.quad([x,y0+2.0,d-0.66],[x,y0+2.0,d+0.66],[x,y0+2.12,d+0.66],[x,y0+2.12,d-0.66],GRD,G,n,n,n,n);
      const xi=sd*(W-0.25);const ni=[sd,0,0];b.quad([xi,y0,d-0.66],[xi,y0,d+0.66],[xi,y0+2.0,d+0.66],[xi,y0+2.0,d-0.66],IN,F,ni,ni,ni,ni);
      for(const e of[-1,1]){const ze=d+e*0.66;const ne=[0,0,-e];b.quad([x,y0,ze],[xi,y0,ze],[xi,y0+2.0,ze],[x,y0,ze].map((v,i)=>i===1?y0+2.0:v),GY,F,ne,ne,ne,ne)}
      b.quad([x,y0+0.02,d-0.66],[xi,y0+0.02,d-0.66],[xi,y0+0.02,d+0.66],[x,y0+0.02,d+0.66],GY,F,[0,1,0],[0,1,0],[0,1,0],[0,1,0])}
    // upper body (above the windows) and roof
    for(let k=2;k<prof.length-1;k++){const p0=prof[k],p1=prof[k+1];const A=[sd*p0[0],p0[1],-L],B=[sd*p0[0],p0[1],L],Cc=[sd*p1[0],p1[1],L],D=[sd*p1[0],p1[1],-L];const nn=[sd*(p1[1]-p0[1]),-(p1[0]-p0[0])*1,0];const l=Math.hypot(nn[0],nn[1]);const N=[nn[0]/l*1,Math.abs(nn[1]/l),0];b.quad(A,B,Cc,D,k>=4?lin('#c8cbcd'):WH,k>=4?C:G,N,N,N,N)}}
  // ends: cab (windscreen, lamps, number box) or gangway end
  for(const e of[-1,1]){const z=e*L,n=[0,0,e];const cab=e>0?cabF:cabR;const pts=prof.map(p=>[p[0],p[1]]);
    const poly=[...pts.map(p=>[-p[0],p[1]]),...pts.slice(0,-1).reverse()];let cx=0,cy=0;poly.forEach(p=>{cx+=p[0];cy+=p[1]});cx/=poly.length;cy/=poly.length;
    for(let k=0;k<poly.length;k++){const p=poly[k],q=poly[(k+1)%poly.length];b.tri([cx,cy,z],[p[0],p[1],z],[q[0],q[1],z],WH,G,n)}
    const zz=z+e*0.01;const rect=(x0,x1,ya,yb,col,aux)=>b.quad([x0,ya,zz],[x1,ya,zz],[x1,yb,zz],[x0,yb,zz],col,aux,n,n,n,n);
    if(cab){rect(-1.2,1.2,y0+1.1,y0+2.3,WIN,G);rect(-1.3,1.3,y0+0.42,y0+0.6,GR,G);rect(-0.6,0.6,y0+2.42,y0+2.68,lin('#140c04'),ax(VK.gloss,9));
      for(const sx of[-1,1]){rect(sx*1.0,sx*1.22,y0+0.72,y0+0.9,lin('#e6e8ea'),ax(VK.chrome,1));rect(sx*0.72,sx*0.9,y0+0.72,y0+0.9,lin('#8a0a12'),ax(VK.gloss,2))}
      b.box([0,y0-0.1,z+e*0.15],[2.2,0.25,0.3],DK,F)}
    else{rect(-0.55,0.55,y0,y0+2.1,DK,F);b.box([0,y0+1.05,z+e*0.2],[1.2,2.2,0.4],DK,F)}}
  // underframe, bogies with wheels, collector shoes
  b.box([0,y0-0.35,0],[TRAIN_W*0.86,0.55,TRAIN_L*0.92],DK,F);
  for(const bz of[-6.0,6.0]){b.box([0,0.55,bz],[2.3,0.3,2.7],lin('#26282b'),F);for(const wz of[-1.1,1.1])for(const sx of[-1,1])b.cylX([sx*0.72,0.43,bz+wz],0.43,0.07,10,lin('#3a3c3f'),C,sx);for(const sx of[-1,1])b.box([sx*1.45,0.28,bz],[0.12,0.06,0.5],GY,C)}
  // interior: floor, seats along the windows, grab poles
  b.quad([-W+0.1,y0+0.02,-L+0.2],[W-0.1,y0+0.02,-L+0.2],[W-0.1,y0+0.02,L-0.2],[-W+0.1,y0+0.02,L-0.2],lin('#545a60'),F,[0,1,0],[0,1,0],[0,1,0],[0,1,0]);
  for(const [a,c] of segs)for(const sd of[-1,1])if(c-a>2){b.box([sd*(W-0.45),y0+0.45,(a+c)/2],[0.5,0.1,c-a-0.4],SEAT,F);b.box([sd*(W-0.22),y0+0.8,(a+c)/2],[0.08,0.6,c-a-0.4],SEAT,F)}
  {const n=[0,-1,0];b.quad([-W+0.1,y0+2.3,-L+0.2],[-W+0.1,y0+2.3,L-0.2],[W-0.1,y0+2.3,L-0.2],[W-0.1,y0+2.3,-L+0.2],lin('#e3e4df'),ax(VK.fixed,7),n,n,n,n)}
  const g=b.build(0);const nv=g.attributes.position.count;g.setAttribute('iLit',new THREE.BufferAttribute(new Float32Array(nv*4).fill(1),4));g.setAttribute('iMisc',new THREE.BufferAttribute(new Float32Array(nv*4).map((v,i)=>i%4===3?1:0),4));return g}
function buildTrain(){const M=initVehicleMats();const mid=trainGeo(false,false),end0=trainGeo(false,true),end1=trainGeo(true,false);
  for(let k=0;k<5;k++){const geo=k===0?end0:k===4?end1:mid;const m=new THREE.Mesh(geo,M.body);m.castShadow=true;m.receiveShadow=true;m.visible=false;scene.add(m);TRAIN.cars.push(m)}
  // sliding door leaves: one instanced mesh for the whole train (5 cars × 2 sides × 4 doors × 2 leaves)
  const db=new VB();const WH=lin('#e8eae6'),WIN=lin('#0b1116');db.box([0,1.0,0],[0.04,2.0,0.64],WH,ax(VK.gloss));for(const sx of[-1,1])db.quad([sx*0.022,1.05,-0.22],[sx*0.022,1.05,0.22],[sx*0.022,1.85,0.22],[sx*0.022,1.85,-0.22],WIN,ax(VK.gloss),[sx,0,0],[sx,0,0],[sx,0,0],[sx,0,0]);
  const dg=db.build(0);const nd=80;instAttrs(dg,nd);dg.attributes.iLit.array.fill(0);const im=new THREE.InstancedMesh(dg,M.body,nd);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.castShadow=true;im.visible=false;scene.add(im);TRAIN.doorMesh=im}
const _tm=new THREE.Matrix4(),_tm2=new THREE.Matrix4();
function placeTrain(){const tp=TRAINPATH;if(!tp)return;const vis=TRAIN.state!=='away';let n=0;const dm=TRAIN.doorMesh;const open=sstep(TRAIN.doors)*0.62;
  TRAIN.cars.forEach((m,k)=>{const sF=TRAIN.s+k*17.6+0.5,sB=TRAIN.s+k*17.6+16.7;const a=atLen(tp.ps,tp.cum,sF),b=atLen(tp.ps,tp.cum,sB);const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;m.position.set(x,terr(x,z)+0.02,z);m.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);m.visible=vis;
    if(dm&&vis){m.updateMatrix();for(const sd of[-1,1])for(const d of TRAIN_DOORS)for(const e of[-1,1]){_tm2.makeTranslation(sd*(TRAIN_W/2-0.03),TRAIN_Y0,d+e*(0.33+open));_tm.multiplyMatrices(m.matrix,_tm2);_tm.toArray(dm.instanceMatrix.array,n*16);n++}}});
  if(dm){dm.count=n;dm.visible=vis&&n>0;dm.instanceMatrix.needsUpdate=true}}
function updateTrain(dt){const tp=TRAINPATH;if(!tp)return;TRAIN.t+=dt;const Lmax=tp.cum[tp.cum.length-1]-95;const near=TRAIN.cars[2]&&Math.hypot(TRAIN.cars[2].position.x-player.x,TRAIN.cars[2].position.z-player.z)<70;
  if(TRAIN.state==='away'){TRAIN.s=Lmax;TRAIN.doors=0;if(TRAIN.t>(TRAIN.next||25)){TRAIN.state='arrive';TRAIN.t=0}}
  else if(TRAIN.state==='arrive'){const target=4;const d=TRAIN.s-target;const v=Math.max(1.2,Math.min(14,Math.sqrt(Math.max(0,d)*1.6)));TRAIN.v=v;TRAIN.s-=v*dt;if(TRAIN.s<=target){TRAIN.s=target;TRAIN.state='dwell';TRAIN.t=0;TRAIN.chimed=false;TRAIN.warned=false;subtitle('Line 1 train to Piraeus now at the platform.',3)}}
  else if(TRAIN.state==='dwell'){TRAIN.v=0;const hold=TRAIN.hold?9999:45;if(TRAIN.t>0.8&&!TRAIN.chimed){TRAIN.chimed=true;if(near)sfx('chime')}
    if(TRAIN.t>hold-3.5&&!TRAIN.warned){TRAIN.warned=true;if(near)sfx('depart')}TRAIN.doors=clamp(TRAIN.doors+(TRAIN.t>0.8&&TRAIN.t<hold-2?1:-1)*dt/1.6,0,1);
    if(TRAIN.t>hold){TRAIN.state='depart';TRAIN.t=0;TRAIN.v=0;TRAIN.doors=0}}
  else if(TRAIN.state==='depart'){TRAIN.v=Math.min(16,(TRAIN.v||0)+1.1*dt);TRAIN.s+=TRAIN.v*dt;if(TRAIN.s>Lmax){TRAIN.state='away';TRAIN.t=0;TRAIN.next=60+Math.random()*40}}
  placeTrain()}
