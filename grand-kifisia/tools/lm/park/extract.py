# Extract every OSM feature inside / around the Alsos Kifisias polygon (way 32324869) from kif.osm.
import xml.etree.ElementTree as ET, json, sys, math
R=sys.argv[1]
t=ET.parse(R+'/kif.osm').getroot()
nodes={};ntags={}
for n in t.iter('node'):
    i=n.get('id');lat=float(n.get('lat'));lon=float(n.get('lon'))
    nodes[i]=((lon-23.8125)*87716,-(lat-38.0727)*110998)
    tg={x.get('k'):x.get('v') for x in n.findall('tag')}
    if tg: ntags[i]=tg
ways={}
for w in t.iter('way'):
    ways[w.get('id')]=([nd.get('ref') for nd in w.findall('nd')],{x.get('k'):x.get('v') for x in w.findall('tag')})
park=[nodes[r] for r in ways['32324869'][0]]
print('park tags',ways['32324869'][1]);print('park ring',[(round(x,1),round(z,1)) for x,z in park])
def pip(ps,x,z):
    c=False;j=len(ps)-1
    for i in range(len(ps)):
        xi,zi=ps[i];xj,zj=ps[j]
        if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi: c=not c
        j=i
    return c
def near(x,z,m):
    if pip(park,x,z): return True
    # distance to ring
    for i in range(len(park)-1):
        ax,az=park[i];bx,bz=park[i+1];dx,dz=bx-ax,bz-az;L=dx*dx+dz*dz
        tt=max(0,min(1,((x-ax)*dx+(z-az)*dz)/L)) if L else 0
        if math.hypot(ax+tt*dx-x,az+tt*dz-z)<m: return True
    return False
out={'park':park,'nodes':[],'ways':[]}
for i,tg in ntags.items():
    x,z=nodes[i]
    if near(x,z,8): out['nodes'].append({'id':i,'x':round(x,2),'z':round(z,2),'tags':tg})
for wid,(nds,tg) in ways.items():
    if wid=='32324869': continue
    pts=[nodes[r] for r in nds if r in nodes]
    if not pts: continue
    ins=sum(1 for p in pts if near(p[0],p[1],3))
    if ins: out['ways'].append({'id':wid,'tags':tg,'pts':[(round(x,2),round(z,2)) for x,z in pts],'inside':ins,'n':len(pts)})
json.dump(out,open(R+'/tools/lm/park/park_osm.json','w'),ensure_ascii=False,indent=0)
from collections import Counter
print('nodes',len(out['nodes']),Counter(tuple(sorted(k for k in n['tags'] if k in('natural','amenity','leisure','highway','man_made','historic','tourism','barrier','entrance','shop','emergency'))) for n in out['nodes']))
for n in out['nodes']:
    if n['tags'].get('natural')!='tree': print('N',n['x'],n['z'],n['tags'])
for w in out['ways']: print('W',w['id'],w['inside'],'/',w['n'],w['tags'])
