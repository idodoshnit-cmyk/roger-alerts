import json,sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
R=sys.argv[1]
m=json.load(open(R+'/gk3/kifisia_map.json'))
cx,cz,S=float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4])
fig,ax=plt.subplots(figsize=(12,12))
def up(c): return [(c[i]/10,c[i+1]/10) for i in range(0,len(c)-1,2)]
for r in m['roads']:
    ps=up(r[8:]); xs=[p[0] for p in ps]; zs=[p[1] for p in ps]
    if any(abs(x-cx)<S and abs(z-cz)<S for x,z in ps):
        ax.plot(xs,zs,'-',color='#bbb',lw=max(1,r[3]/10*2) if r[3] else 1,zorder=1)
        ax.text(xs[len(xs)//2],zs[len(zs)//2],m['names'][r[1]] if r[1]>=0 else '',fontsize=7,color='blue')
for s in m.get('sidewalks',[]):
    for ring in s[:1]:
        ps=up(ring)
        if any(abs(x-cx)<S and abs(z-cz)<S for x,z in ps):
            ax.fill([p[0] for p in ps],[p[1] for p in ps],color='#eee',zorder=0)
for i,b in enumerate(m['buildings']):
    ps=up(b[10])
    if any(abs(x-cx)<S and abs(z-cz)<S for x,z in ps):
        ax.fill([p[0] for p in ps],[p[1] for p in ps],color='#fca' if i==305 else '#ddd',ec='k',lw=.6,zorder=2)
        mx=sum(p[0] for p in ps)/len(ps); mz=sum(p[1] for p in ps)/len(ps)
        ax.text(mx,mz,f'b{i} L{b[1]}',fontsize=7,zorder=5)
        if i==305:
            for k,(x,z) in enumerate(ps): ax.text(x,z,str(k),fontsize=8,color='r',zorder=6)
for t in m.get('street_trees',[]):
    if abs(t[0]/10-cx)<S and abs(t[1]/10-cz)<S: ax.plot(t[0]/10,t[1]/10,'go',ms=3)
for k,v in m['key'].items():
    if abs(v[0]-cx)<S and abs(v[1]-cz)<S: ax.plot(v[0],v[1],'r*'); ax.text(v[0],v[1],k,color='r')
for p in m.get('pois',[]):
    try:
        x,z=p['x'],p['z']
        if abs(x-cx)<S and abs(z-cz)<S: ax.plot(x,z,'m.',ms=3); ax.text(x,z,p.get('name',''),fontsize=5,color='m')
    except Exception: pass
ax.set_xlim(cx-S,cx+S); ax.set_ylim(cz+S,cz-S); ax.set_aspect('equal'); ax.grid(alpha=.3)
plt.savefig(sys.argv[5],dpi=90,bbox_inches='tight')
