import xml.etree.ElementTree as ET, json, sys
T=ET.parse(sys.argv[1]).getroot()
N={}
for n in T.findall('node'):
    N[n.get('id')]=(float(n.get('lon')),float(n.get('lat')),{t.get('k'):t.get('v') for t in n.findall('tag')})
def xz(lon,lat): return ((lon-23.8125)*87716, -(lat-38.0727)*110998)
X0,X1,Z0,Z1=790,990,-530,-320
out=[]
for n,(lo,la,tg) in N.items():
    x,z=xz(lo,la)
    if tg and X0<x<X1 and Z0<z<Z1: out.append(('node',n,round(x,1),round(z,1),tg))
for w in T.findall('way'):
    nds=[nd.get('ref') for nd in w.findall('nd')]
    pts=[xz(N[r][0],N[r][1]) for r in nds if r in N]
    if not pts: continue
    if not any(X0<x<X1 and Z0<z<Z1 for x,z in pts): continue
    tg={t.get('k'):t.get('v') for t in w.findall('tag')}
    out.append(('way',w.get('id'),[(round(x,1),round(z,1)) for x,z in pts],tg))
for r in T.findall('relation'):
    tg={t.get('k'):t.get('v') for t in r.findall('tag')}
    mem=[(m.get('type'),m.get('ref'),m.get('role')) for m in r.findall('member')]
    ids={o[1] for o in out}
    if any(m[1] in ids for m in mem): out.append(('rel',r.get('id'),mem[:20],tg))
for o in out: print(json.dumps(o,ensure_ascii=False))
