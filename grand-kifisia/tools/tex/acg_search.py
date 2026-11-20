#!/usr/bin/env python3
"""List ambientCG materials for a query: id, name, real size (cm), tags.  usage: acg_search.py <query> [limit]"""
import sys,json,urllib.request,urllib.parse
q=sys.argv[1];lim=int(sys.argv[2]) if len(sys.argv)>2 else 40
u='https://ambientcg.com/api/v2/full_json?type=Material&sort=Popular&limit=%d&q=%s&include=dimensionData,tagData,displayData'%(lim,urllib.parse.quote(q))
req=urllib.request.Request(u,headers={'User-Agent':'GrandKifisia-texture-pipeline/1.0 (CC0 asset fetch)'})
d=json.load(urllib.request.urlopen(req,timeout=40))
print(q,'->',d.get('numberOfResults'))
for a in d['foundAssets']:
    print('  %-22s %-28s %sx%s cm  %s'%(a['assetId'],a.get('displayName','')[:28],a.get('dimensionX'),a.get('dimensionY'),','.join(a.get('tags',[])[:9])))
