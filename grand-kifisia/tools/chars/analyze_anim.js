// Check how constant bone translations are, in the source hierarchy and after re-parenting (thighs→Pelvis, clavicles→Spine2).
const {readGLB,Q,M,scene}=require('./lib');const f=process.argv[2];const sc=scene(readGLB(f));console.log(f,'dur',sc.duration.toFixed(3),'keys',sc.nkeys);
const names=['Bip01','Bip01 Pelvis','Bip01 Spine','Bip01 Spine1','Bip01 Spine2','Bip01 Neck','Bip01 Head','Bip01 L Clavicle','Bip01 L UpperArm','Bip01 L Thigh','Bip01 L Calf','Bip01 L Foot','Bip01 L Toe0','MotionExtractionHelper','Bip01 Footsteps'];
const repar={'Bip01 L Thigh':'Bip01 Pelvis','Bip01 L Clavicle':'Bip01 Spine2'};
const st={};const n=Math.max(2,Math.round(sc.duration*24)+1);
for(let k=0;k<n;k++){const t=k/(n-1)*sc.duration;const W=sc.world(t);
  for(const nm of names){const i=sc.byName[nm];if(i===undefined)continue;const l=sc.local(i,t);(st[nm]=st[nm]||{lo:[1e9,1e9,1e9],hi:[-1e9,-1e9,-1e9],wlo:[1e9,1e9,1e9],whi:[-1e9,-1e9,-1e9],rlo:[1e9,1e9,1e9],rhi:[-1e9,-1e9,-1e9]});
    const wp=M.pos(W[i]);for(let c=0;c<3;c++){st[nm].lo[c]=Math.min(st[nm].lo[c],l.t[c]);st[nm].hi[c]=Math.max(st[nm].hi[c],l.t[c]);st[nm].wlo[c]=Math.min(st[nm].wlo[c],wp[c]);st[nm].whi[c]=Math.max(st[nm].whi[c],wp[c])}
    if(repar[nm]){const p=sc.byName[repar[nm]];const lp=M.pt(M.inv(W[p]),wp);for(let c=0;c<3;c++){st[nm].rlo[c]=Math.min(st[nm].rlo[c],lp[c]);st[nm].rhi[c]=Math.max(st[nm].rhi[c],lp[c])}}}}
const f3=a=>a.map(x=>x.toFixed(3)).join(',');
for(const nm of names){const s=st[nm];if(!s)continue;console.log(nm.padEnd(24),'local t range',f3(s.lo),'..',f3(s.hi),' world',f3(s.wlo),'..',f3(s.whi),repar[nm]?' reparented '+f3(s.rlo)+' .. '+f3(s.rhi):'')}
