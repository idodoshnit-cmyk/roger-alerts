#!/usr/bin/env python3
"""Dump the whole ambientCG catalogue (id, type, size, tags) to a json for local grepping. usage: acg_catalog.py <out.json>"""
import sys,json,time,urllib.request
UA={'User-Agent':'GrandKifisia-texture-pipeline/1.0 (CC0 asset fetch)'}
out=[];off=0
while True:
    u='https://ambientcg.com/api/v2/full_json?sort=Alphabet&limit=250&offset=%d&include=dimensionData,tagData'%off
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60))
    fa=d.get('foundAssets',[])
    for a in fa: out.append({'id':a['assetId'],'type':a.get('dataType'),'x':a.get('dimensionX'),'y':a.get('dimensionY'),'tags':a.get('tags',[]),'method':a.get('creationMethod')})
    print(off,len(fa),d.get('numberOfResults'),flush=True)
    if len(fa)<250: break
    off+=250;time.sleep(0.4)
json.dump(out,open(sys.argv[1],'w'));print(len(out),'assets')
