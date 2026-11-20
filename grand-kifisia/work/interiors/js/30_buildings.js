'use strict';
/* Grand Kifisia — buildings, roofs, landmark buildings, sign atlas */
/* ---------- buildings ---------- */
function buildBuildings(){
  for(const b of MAP.buildings){const [gmin10,lv,style,roof,detail,h,rectv,edges,shops,name,coords]=b;let ps=unp(coords);if(ps.length<3)continue;
    if(polyArea(ps)<0)ps=ps.reverse();// make CCW (positive area) so outward normal of edge a->b is (dz,-dx)
    const flip=polyArea(unp(coords))<0;const E=flip?edges.slice().reverse():edges;// edges reversed with order (edge i -> edge n-2-i)
    const edgeF=i=>{if(!flip)return edges[i]||0;const n=ps.length;return edges[(n-2-i+n)%n]||0};
    const pal=STYLE_COL[style]||STYLE_COL.apt;const wc=hexc(pal[h%pal.length]);
    let gmin=Infinity,gmax=-Infinity;for(const p of ps){const y=terr(p[0],p[1]);gmin=Math.min(gmin,y);gmax=Math.max(gmax,y)}
    const hasShop=shops.length>0||edges.some(e=>e===2);const gfh=(hasShop||style==='shop')?4.2:(style==='station'?5.2:3.2);const fh=style==='neo'?3.5:3.1;const gy=gmax+0.12;
    const top=gy+gfh+(lv-1)*fh;const para=roof==='flat'?0.65:0.25;const base=gmin-0.6;
    const cx=ps.reduce((s,p)=>s+p[0],0)/ps.length,cz=ps.reduce((s,p)=>s+p[1],0)/ps.length;const ch=chunkAt(cx,cz);const O=ch.o;
    const bayW=style==='neo'?2.7:style==='villa'?3.3:3.0;const pilotis=style==='apt'&&!hasShop&&lv>=3&&(h%10)<3;
    const n=ps.length;const shopEdges={};for(const s of shops){let ei=s[0];if(flip)ei=(n-2-ei+n)%n;(shopEdges[ei]=shopEdges[ei]||[]).push(s)}
    for(let i=0;i<n;i++){const a=ps[i],c=ps[(i+1)%n];const dx=c[0]-a[0],dz=c[1]-a[1],L=Math.hypot(dx,dz);if(L<0.05)continue;const nx=dz/L,nz=-dx/L;addSeg(a[0],a[1],c[0],c[1],'b');
      const f=edgeF(i);
      // plinth below the ground floor
      O.wall(a[0],a[1],c[0],c[1],base,base,gy,gy,nx,nz,0,L/3,0,(gy-base)/3,shade(wc,0.82),RECT[style==='neo'||style==='station'?T.ashlar:T.plaster],0);
      const nb=L<1.6?0:Math.max(1,Math.round(L/bayW));
      if(nb===0){O.wall(a[0],a[1],c[0],c[1],gy,gy,top+para,top+para,nx,nz,0,L/3,0,(top+para-gy)/3,wc,RECT[T.plaster],0);continue}
      const doorBay=Math.floor(nb/2);
      for(let k=0;k<nb;k++){const t0=k/nb,t1=(k+1)/nb;const ax=a[0]+dx*t0,az=a[1]+dz*t0,bx=a[0]+dx*t1,bz=a[1]+dz*t1;const hh=hf(h*31+i*7+k);
        // ground floor
        let tile,col=wc,glow=0;
        if(f===2&&(style!=='villa')){tile=[T.shopA,T.shopB,T.cafe,T.shopB,T.shopA,T.shutter][Math.floor(hh*6)];col=C1;glow=tile===T.shutter?0:1}
        else if(style==='station'){tile=k===doorBay?T.neoDoor:T.neo}
        else if(pilotis&&f>0){tile=k===doorBay?T.lobby:T.pilotis;col=k===doorBay?wc:C1;glow=k===doorBay?1:0}
        else if(f>0&&k===doorBay){tile=style==='neo'||style==='villa'||style==='agora'?T.neoDoor:(style==='modern'?T.office:T.lobby);glow=tile===T.lobby?1:0}
        else if(style==='modern'||style==='school'){tile=T.office}
        else if(style==='neo'||style==='agora'){tile=hh<0.7?T.neo:T.neoC}
        else if(style==='villa'){tile=T.villaW}
        else if(style==='church'){tile=T.church;glow=0}
        else tile=hh<0.6?T.win:(hh<0.85?T.small:T.plain);
        if(tile===T.win||tile===T.neo||tile===T.villaW||tile===T.office||tile===T.small)glow=hh>0.72?1:0;
        O.wall(ax,az,bx,bz,gy,gy,gy+gfh,gy+gfh,nx,nz,0,1,0,1,col,RECT[tile],glow);
        // upper floors
        for(let fl=1;fl<lv;fl++){const y0=gy+gfh+(fl-1)*fh,y1=y0+fh;const h2=hf(h*17+i*5+k*3+fl*101);let t2;
          if(style==='modern'||style==='school'||style==='shop')t2=T.office;else if(style==='neo'||style==='agora'||style==='station')t2=h2<0.75?T.neo:T.neoC;else if(style==='villa')t2=T.villaW;else if(style==='church')t2=T.church;
          else t2=f>0?(h2<0.7?T.balc:T.win):(h2<0.55?T.win:(h2<0.8?T.small:T.plain));
          O.wall(ax,az,bx,bz,y0,y0,y1,y1,nx,nz,0,1,0,1,wc,RECT[t2],h2>0.7?1:0)}}
      // parapet / cornice band
      O.wall(a[0],a[1],c[0],c[1],top,top,top+para,top+para,nx,nz,0,L/3,0,para/3,style==='neo'||style==='agora'?C1:wc,RECT[style==='neo'||style==='agora'||style==='station'?T.trim:T.plaster],0);
      if(roof==='flat')O.wall(c[0],c[1],a[0],a[1],top,top,top+para,top+para,-nx,-nz,0,L/3,0,para/3,shade(wc,0.9),RECT[T.plaster],0);
      // balconies on street-facing upper floors of apartment blocks
      if(detail&&style==='apt'&&f>0&&lv>=2&&L>=4){const rtype=h%3;const ux=dx/L,uz=dz/L,dep=1.15;
        for(let fl=1;fl<lv;fl++){const y=gy+gfh+(fl-1)*fh;const s0=0.25,s1=L-0.25;const p0=[a[0]+ux*s0,a[1]+uz*s0],p1=[a[0]+ux*s1,a[1]+uz*s1],q0=[p0[0]+nx*dep,p0[1]+nz*dep],q1=[p1[0]+nx*dep,p1[1]+nz*dep];
          const sc=shade(wc,0.97);O.quad([p0[0],y,p0[1]],[p1[0],y,p1[1]],[q1[0],y,q1[1]],[q0[0],y,q0[1]],[0,0],[1,0],[1,1],[0,1],sc,RECT[T.plaster],0);
          O.quad([q0[0],y-0.18,q0[1]],[q1[0],y-0.18,q1[1]],[p1[0],y-0.18,p1[1]],[p0[0],y-0.18,p0[1]],[0,0],[1,0],[1,1],[0,1],shade(wc,0.75),RECT[T.plaster],0);
          O.wall(q0[0],q0[1],q1[0],q1[1],y-0.18,y-0.18,y,y,nx,nz,0,L/3,0,0.06,sc,RECT[T.plaster],0);
          O.wall(p0[0],p0[1],q0[0],q0[1],y-0.18,y-0.18,y,y,-ux,-uz,0,0.4,0,0.06,sc,RECT[T.plaster],0);O.wall(p1[0],p1[1],q1[0],q1[1],y-0.18,y-0.18,y,y,ux,uz,0,0.4,0,0.06,sc,RECT[T.plaster],0);
          if(rtype===0){ch.cut.wall(q0[0],q0[1],q1[0],q1[1],y,y,y+1.0,y+1.0,nx,nz,0,L/1.2,0,1,hexc('#2a302c'),RECT[T.rail],0)}
          else{const rt=rtype===1?T.glassR:T.plaster;O.wall(q0[0],q0[1],q1[0],q1[1],y,y,y+1.0,y+1.0,nx,nz,0,L/3,0,0.33,rtype===1?C1:wc,RECT[rt],0);O.wall(q1[0],q1[1],q0[0],q0[1],y,y,y+1.0,y+1.0,-nx,-nz,0,L/3,0,0.33,shade(wc,0.85),RECT[T.plaster],0)}
          // awnings (tentes)
          if(hf(h*3+fl*11+i)<0.45&&fl<lv){const at=[T.awnS,T.awnG,T.awnS,T.awnR][h%4];const yt=y+fh-0.3,yb=y+fh-1.35;const e0=[p0[0]+nx*(dep+0.15),p0[1]+nz*(dep+0.15)],e1=[p1[0]+nx*(dep+0.15),p1[1]+nz*(dep+0.15)];
            O.hq([p0[0],yt,p0[1]],[e0[0],yb,e0[1]],[e1[0],yb,e1[1]],[p1[0],yt,p1[1]],[0,0],[0,1],[L/1.6,1],[L/1.6,0],C1,RECT[at],0);O.hq([p1[0],yt-0.02,p1[1]],[e1[0],yb-0.02,e1[1]],[e0[0],yb-0.02,e0[1]],[p0[0],yt-0.02,p0[1]],[0,0],[0,1],[L/1.6,1],[L/1.6,0],shade(C1,0.72),RECT[at],0,true)}
          // air-conditioner units
          if(hf(h+fl*7+i*13)<0.5){const t=0.2+hf(h+i+fl)*0.6;const ax2=a[0]+dx*t+nx*0.45,az2=a[1]+dz*t+nz*0.45;O.box(ax2,y+0.3,az2,0.8,0.55,0.3,Math.atan2(nx,nz),hexc('#e9e9e6'),RECT[T.plain])}}}
      if(f===2&&style!=='villa')SHOPFRONTS.push({a:[a[0],a[1]],c:[c[0],c[1]],nx,nz,L});
      // shop fascia + awnings for shopfronts
      if(f===2&&style!=='villa'&&detail){const ux=dx/L,uz=dz/L;if(hf(h*5+i)<0.35){const at=[T.awnS,T.awnG,T.awnR][Math.floor(hf(h+i*3)*3)];const yt=gy+3.05,yb=gy+2.55,d1=1.3;
        O.hq([a[0],yt,a[1]],[a[0]+nx*d1,yb,a[1]+nz*d1],[c[0]+nx*d1,yb,c[1]+nz*d1],[c[0],yt,c[1]],[0,0],[0,1],[L/1.6,1],[L/1.6,0],C1,RECT[at],0);O.hq([c[0],yt-0.02,c[1]],[c[0]+nx*d1,yb-0.02,c[1]+nz*d1],[a[0]+nx*d1,yb-0.02,a[1]+nz*d1],[a[0],yt-0.02,a[1]],[0,0],[0,1],[L/1.6,1],[L/1.6,0],shade(C1,0.72),RECT[at],0,true)}}
      // shop signs from real OSM shops
      if(shopEdges[i])for(const s of shopEdges[i])addSign(ch,a,c,nx,nz,L,s,gy);
    }
    // roofs
    let roofT=roof;if(roofT==='flat'&&rectv&&(style==='apt'||style==='modern'||style==='shop')&&lv<=3&&rectv[2]<32){const fill=Math.abs(polyArea(ps))/(rectv[2]*rectv[3]);if(fill>0.82&&hf(h*7)<0.42)roofT='hip'}
    if(roofT==='hip'&&rectv){if(roof==='flat'){/* parapet was built for a flat roof: cap it */}hipRoof(O,rectv,top+para,style,h)}else{const tris=triangulate([ps]);for(const t of tris){let [a2,b2,c2]=t;const cr=(b2[0]-a2[0])*(c2[1]-a2[1])-(b2[1]-a2[1])*(c2[0]-a2[0]);if(cr>0){const q=b2;b2=c2;c2=q}
      O.tri([a2[0],top,a2[1]],[b2[0],top,b2[1]],[c2[0],top,c2[1]],[a2[0]/4,a2[1]/4],[b2[0]/4,b2[1]/4],[c2[0]/4,c2[1]/4],C1,RECT[T.flatroof],0,true)}
      if(detail&&lv>=2)roofClutter(ch,ps,top,h)}
    if(style==='agora')agoraTurrets(ch,ps,gy,top,E);
    if(style==='church')churchDome(ch,rectv,top,h);
    if(style==='station')stationFront(ch,ps,gy,top,E);
  }}
function hipRoof(O,rv,yb,style,h){const [cx,cz,L0,W0,ang]=rv;const e=0.45,L=L0+2*e,W=W0+2*e;const ux=Math.cos(ang),uz=Math.sin(ang),vx=-uz,vz=ux;const rh=W*0.23;
  const P=(u,v)=>[cx+ux*u+vx*v,cz+uz*u+vz*v];const A=P(-L/2,-W/2),B=P(L/2,-W/2),C=P(L/2,W/2),D=P(-L/2,W/2);const rl=Math.max(0,L/2-W/2);const R1=P(-rl,0),R2=P(rl,0);const yr=yb+rh;
  const col=shade(hexc(['#c9673f','#b85a3a','#d07447','#a95236'][h%4]),1);const rc=RECT[T.tiles];const slope=Math.hypot(W/2,rh);
  const face=(p,q,r,s,tri)=>{if(tri){O.tri([p[0],yb,p[1]],[q[0],yb,q[1]],[r[0],yr,r[1]],[0,0],[W/2,0],[W/4,slope/2],col,rc,0)}else O.quad([p[0],yb,p[1]],[q[0],yb,q[1]],[r[0],yr,r[1]],[s[0],yr,s[1]],[0,0],[L/2,0],[L/2-(L-2*rl)/4,slope/2],[(L-2*rl)/4,slope/2],col,rc,0)};
  // orient faces so normals point up/out
  const up=(p,q,r)=>{const a=[q[0]-p[0],0,q[1]-p[1]],b=[r[0]-p[0],yr-yb,r[1]-p[1]];return a[2]*b[0]-a[0]*b[2]>0};
  const quadF=(p,q,r,s)=>{if(up(p,q,r))face(p,q,r,s);else face(q,p,s,r)};const triF=(p,q,r)=>{if(up(p,q,r))face(p,q,r,null,true);else face(q,p,r,null,true)};
  quadF(A,B,R2,R1);quadF(C,D,R1,R2);triF(B,C,R2);triF(D,A,R1);
  const fc=style==='neo'&&h%3===0?hexc('#8e2f22'):hexc('#f1eee7');[[A,B],[B,C],[C,D],[D,A]].forEach(([p,q])=>{const mx=(p[0]+q[0])/2-cx,mz=(p[1]+q[1])/2-cz;O.wall(p[0],p[1],q[0],q[1],yb-0.28,yb-0.28,yb,yb,mx,mz,0,1,0,0.1,fc,RECT[T.trim],0);
    O.quad([p[0],yb-0.28,p[1]],[q[0],yb-0.28,q[1]],[q[0]-mx*0.04,yb-0.28,q[1]-mz*0.04],[p[0]-mx*0.04,yb-0.28,p[1]-mz*0.04],[0,0],[1,0],[1,1],[0,1],shade(fc,0.6),RECT[T.white],0)})}
const ROOFI={solar:[],ac:[],tank:[]};
function roofClutter(ch,ps,top,h){let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;for(const p of ps){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1])}
  const tries=6;let placed=0;for(let k=0;k<tries&&placed<3;k++){const x=lerp(minx+1.2,maxx-1.2,hf(h*9+k)),z=lerp(minz+1.2,maxz-1.2,hf(h*13+k*7));if(!pip(ps,x,z))continue;placed++;
    const r=hf(h+k*3);if(r<0.55){ROOFI.solar.push([x,top,z,hf(h)*0.3+Math.PI*0.95])}else ROOFI.ac.push([x,top,z,hf(h+k)*TAU])}}
function agoraTurrets(ch,ps,gy,top,edges){// the white Kifisia Agora: two round towers with conical roofs
  let best=0,bi=0;for(let i=0;i<ps.length;i++){const a=ps[i],c=ps[(i+1)%ps.length];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L>best){best=L;bi=i}}
  const a=ps[bi],c=ps[(bi+1)%ps.length];const O=ch.o;for(const p of[a,c]){O.cyl(p[0],gy-0.5,p[1],2.6,2.6,top-gy+1.6,16,hexc('#f6f4ee'),RECT[T.neo],false,0,0.33);
    O.cyl(p[0],top+1.1,p[1],2.85,2.85,0.35,16,hexc('#c65f3d'),RECT[T.tiles],false);O.cyl(p[0],top+1.45,p[1],2.7,0.15,3.2,16,hexc('#b7955a'),RECT[T.metalL],true);O.cyl(p[0],top+4.6,p[1],0.18,0.0,0.6,8,hexc('#c9a24a'),RECT[T.white],true);addBoxC(p[0],p[1],2.4,'b')}}
function churchDome(ch,rv,top,h){if(!rv)return;const [cx,cz,L,W,ang]=rv;const O=ch.o;const r=Math.min(W,L)*0.22;const y=top+Math.min(W,L)*0.23;O.cyl(cx,y-0.5,cz,r,r,1.8,16,hexc('#efe4cf'),RECT[T.church],false,1,0.4);
  for(let k=0;k<6;k++){const r0=r*Math.cos(k/6*Math.PI/2),r1=r*Math.cos((k+1)/6*Math.PI/2),y0=y+1.3+r*Math.sin(k/6*Math.PI/2),y1=y+1.3+r*Math.sin((k+1)/6*Math.PI/2);O.cyl(cx,y0,cz,r0,r1,y1-y0,16,hexc('#bf5f3c'),RECT[T.tiles],k===5)}
  const ux=Math.cos(ang),uz=Math.sin(ang);for(const sd of[-1,1]){const tx=cx+ux*(L/2-1.6)*sd*-1+(-uz)*(W/2-1.6),tz=cz+uz*(L/2-1.6)*sd*-1+ux*(W/2-1.6);O.box(tx,top+2.5,tz,3.0,5,3.0,-ang,hexc('#efe4cf'),RECT[T.church]);O.cyl(tx,top+5,tz,2.1,0.2,2.2,4,hexc('#bf5f3c'),RECT[T.tiles],true)}}
function stationFront(ch,ps,gy,top,edges){// Kifisia ISAP station: yellow, white pilasters, portico with clock and the blue ΗΣΑΠ sign
  let bi=0,bd=-1;for(let i=0;i<ps.length;i++){const a=ps[i],c=ps[(i+1)%ps.length];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);const nx=(c[1]-a[1])/L,nz=-(c[0]-a[0])/L;const score=L*(1+(nx*0.3-nz));if(score>bd){bd=score;bi=i}}
  const a=ps[bi],c=ps[(bi+1)%ps.length];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);const nx=(c[1]-a[1])/L,nz=-(c[0]-a[0])/L;const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;const O=ch.o;const y=gy;
  const ang=Math.atan2(nx,nz);O.box(mx+nx*0.7,y+3.3,mz+nz*0.7,4.6,6.6,1.4,ang,hexc('#e7bf55'),RECT[T.neo]);
  // pediment
  const ux=(c[0]-a[0])/L,uz=(c[1]-a[1])/L;const p0=[mx+nx*1.42-ux*2.5,mz+nz*1.42-uz*2.5],p1=[mx+nx*1.42+ux*2.5,mz+nz*1.42+uz*2.5],pt=[mx+nx*1.42,mz+nz*1.42];
  O.tri([p0[0],y+6.6,p0[1]],[p1[0],y+6.6,p1[1]],[pt[0],y+8.0,pt[1]],[0,0],[1,0],[0.5,0.4],hexc('#f6f2e8'),RECT[T.trim],0);O.tri([p1[0],y+6.6,p1[1]],[p0[0],y+6.6,p0[1]],[pt[0],y+8.0,pt[1]],[0,0],[1,0],[0.5,0.4],hexc('#f6f2e8'),RECT[T.trim],0);
  [[-2.35],[2.35]].forEach(([o])=>O.box(mx+nx*1.43+ux*o,y+3.3,mz+nz*1.43+uz*o,0.35,6.6,0.12,ang,hexc('#f6f2e8'),RECT[T.trim]));
  signAt(ch,mx+nx*1.5,y+5.2,mz+nz*1.5,nx,nz,3.8,0.9,'station',1);signAt(ch,pt[0]+nx*0.02,y+7.05,pt[1]+nz*0.02,nx,nz,0.8,0.8,'clock',1);
  STATION.front={x:mx+nx*3,z:mz+nz*3,nx,nz}}

/* ---------- signs (separate canvas atlas, lit at night) ---------- */
const SG=2048,signC=document.createElement('canvas');signC.width=signC.height=SG;const sgx=signC.getContext('2d');let signSlot=0;const SLOT_W=256,SLOT_H=64,SPECIAL_SLOTS={};
function slotRect(x,y,w,h){return[(x+3)/SG,1-(y+h-3)/SG,(w-6)/SG,(h-6)/SG]}
function drawSign(x,y,w,h,text,bg,fg,style){const g=sgx;g.fillStyle=bg;g.fillRect(x,y,w,h);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  if(style==='starbucks'){g.fillStyle='#ffffff';g.beginPath();g.arc(x+h/2,y+h/2,h*0.38,0,TAU);g.fill();g.fillStyle='#00704a';g.beginPath();g.arc(x+h/2,y+h/2,h*0.3,0,TAU);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x+h/2,y+h/2,h*0.14,0,TAU);g.fill();x+=h*0.55;w-=h*0.55}
  if(style==='kfc'){g.fillStyle='#fff';for(let k=0;k<6;k++)g.fillRect(x+k*w/6,y+h-10,w/12,10)}
  if(style==='station'){g.fillStyle='#fff';g.fillRect(x+4,y+4,w-8,h-8);g.fillStyle='#1f3c8f';g.font=`bold ${h*0.36}px Arial`;g.textAlign='center';g.fillText('ΗΣΑΠ  ΚΗΦΙΣΙΑ',x+w/2,y+h*0.47);g.font=`bold ${h*0.26}px Arial`;g.fillText('KIFISSIA',x+w/2,y+h*0.82);g.restore();return}
  if(style==='clock'){g.fillStyle='#f6f2e8';g.fillRect(x,y,w,h);g.fillStyle='#fff';g.beginPath();g.arc(x+w/2,y+h/2,h*0.44,0,TAU);g.fill();g.strokeStyle='#222';g.lineWidth=3;g.stroke();g.beginPath();g.moveTo(x+w/2,y+h/2);g.lineTo(x+w/2,y+h*0.16);g.moveTo(x+w/2,y+h/2);g.lineTo(x+w*0.74,y+h/2);g.stroke();g.restore();return}
  if(style==='street'){g.fillStyle='#1d4f9a';g.fillRect(x,y,w,h);g.strokeStyle='#fff';g.lineWidth=2;g.strokeRect(x+3,y+3,w-6,h-6);g.fillStyle='#fff';g.textAlign='center';g.font=`bold ${h*0.34}px Arial`;g.fillText(text[0],x+w/2,y+h*0.45,w-12);g.font=`bold ${h*0.24}px Arial`;g.fillText(text[1],x+w/2,y+h*0.8,w-12);g.restore();return}
  if(style==='stop'){g.fillStyle='#c8102e';g.fillRect(x,y,w,h);g.fillStyle='#fff';g.textAlign='center';g.font=`bold ${h*0.4}px Arial`;g.fillText('STOP',x+w/2,y+h*0.64);g.restore();return}
  if(style==='board'){g.fillStyle='#0b1d4a';g.fillRect(x,y,w,h);g.fillStyle='#ffb000';g.font=`bold ${h*0.3}px Arial`;g.textAlign='left';g.fillText('1  ΠΕΙΡΑΙΑΣ',x+10,y+h*0.42);g.fillText('1  PIRAEUS',x+10,y+h*0.82);g.textAlign='right';g.fillText(text,x+w-10,y+h*0.62);g.restore();return}
  g.fillStyle=fg;let fs=Math.floor(h*0.52);g.font=`bold ${fs}px ${style==='mythos'||style==='paul'?'Georgia,serif':'Arial,Helvetica,sans-serif'}`;g.textAlign='center';g.textBaseline='middle';while(g.measureText(text).width>w-14&&fs>12){fs-=2;g.font=`bold ${fs}px Arial`}
  g.fillText(text,x+w/2,y+h/2+2);g.restore()}
let bigSlot=0;function newSlot(text,bg,fg,style,big){if(big){const idx=bigSlot++;if(idx>=8)return null;const x=(idx%4)*512,y=Math.floor(idx/4)*128;drawSign(x,y,512,128,text,bg,fg,style);return slotRect(x,y,512,128)}
  const s=32+signSlot++;if(s>=8*32)return null;const x=(s%8)*SLOT_W,y=Math.floor(s/8)*SLOT_H;drawSign(x,y,SLOT_W,SLOT_H,text,bg,fg,style);return slotRect(x,y,SLOT_W,SLOT_H)}
const BRANDS={paul:['PAUL','#141414','#e8d3a0'],mythos:['MYTHOS plus','#151515','#f2c14e'],starbucks:['STARBUCKS COFFEE','#00704a','#ffffff'],kfc:['KFC','#c8102e','#ffffff'],super:['ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ','#ffffff','#d0021b'],station:['','#fff','#1f3c8f'],clock:['','#fff','#000']};
function brandSlot(k){if(!SPECIAL_SLOTS[k]){const b=BRANDS[k];SPECIAL_SLOTS[k]=null;SPECIAL_SLOTS[k]=newSlot(b[0],b[1],b[2],k,true)}return SPECIAL_SLOTS[k]}
function signAt(ch,x,y,z,nx,nz,w,h,key,glow,rc){rc=rc||brandSlot(key);if(!rc)return;const ux=-nz,uz=nx;const a=[x-ux*w/2,z-uz*w/2],b=[x+ux*w/2,z+uz*w/2];
  ch.sg.wall(a[0],a[1],b[0],b[1],y-h/2,y-h/2,y+h/2,y+h/2,nx,nz,0.002,0.998,0.002,0.998,C1,rc,glow)}
function addSign(ch,a,c,nx,nz,L,s,gy){const [ei,t,name,bg,fg,kind]=s;const px=a[0]+(c[0]-a[0])*t+nx*0.09,pz=a[1]+(c[1]-a[1])*t+nz*0.09;const special=BRANDS[kind]?kind:null;
  if(special){const w=Math.min(L*0.95,special==='kfc'?4.2:6.4),h=special==='kfc'?1.1:1.0;ch.o.box(px-nx*0.04,gy+3.6,pz-nz*0.04,w+0.2,h+0.18,0.16,Math.atan2(nx,nz),hexc(BRANDS[special][1]),RECT[T.white]);signAt(ch,px+nx*0.05,gy+3.6,pz+nz*0.05,nx,nz,w,h,special,1);return}
  const rc=newSlot(name,bg,fg,kind,false);if(!rc)return;const w=clamp(name.length*0.26+1.0,2.2,Math.min(6,L*0.9)),h=0.62;signAt(ch,px,gy+3.55,pz,nx,nz,w,h,null,1,rc)}

