import xml.etree.ElementTree as ET, math, json
LAT0,LON0=38.0727,23.8125
KX,KZ=87716.0,110998.0
def P(lat,lon): return ((lon-LON0)*KX, -(lat-LAT0)*KZ)
def load():
    t=ET.parse('kif.osm').getroot()
    nodes={};ntags={}
    for n in t.iter('node'):
        nodes[n.get('id')]=P(float(n.get('lat')),float(n.get('lon')))
        tg={x.get('k'):x.get('v') for x in n.findall('tag')}
        if tg: ntags[n.get('id')]=tg
    ways={}
    for w in t.iter('way'):
        ways[w.get('id')]=([r.get('ref') for r in w.findall('nd')],{x.get('k'):x.get('v') for x in w.findall('tag')})
    rels=[]
    for r in t.iter('relation'):
        rels.append(([(m.get('type'),m.get('ref'),m.get('role')) for m in r.findall('member')],{x.get('k'):x.get('v') for x in r.findall('tag')}))
    return nodes,ntags,ways,rels
