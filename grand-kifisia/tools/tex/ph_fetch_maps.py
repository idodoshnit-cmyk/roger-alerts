#!/usr/bin/env python3
"""Download named 1K maps of any Poly Haven asset (models have per-part maps such as leaves_diff / leaves_alpha).
usage: ph_fetch_maps.py <outdir> <id> <mapkey[:fmt]> [mapkey...]     (fmt default jpg)   '*alpha*' style substrings allowed with a leading ~"""
import sys,json,os,time,urllib.request
UA={'User-Agent':'GrandKifisia-texture-pipeline/1.0 (CC0 asset fetch)'}
out,i=sys.argv[1],sys.argv[2];d=os.path.join(out,i);os.makedirs(d,exist_ok=True)
f=json.loads(urllib.request.urlopen(urllib.request.Request('https://api.polyhaven.com/files/'+i,headers=UA),timeout=60).read())
keys=[]
for a in sys.argv[3:]:
    k,_,fmt=a.partition(':');fmt=fmt or 'jpg'
    if k.startswith('~'): keys+=[(kk,fmt) for kk in f if k[1:].lower() in kk.lower() and isinstance(f[kk],dict) and '1k' in f[kk]]
    else: keys.append((k,fmt))
for k,fmt in keys:
    p=os.path.join(d,'%s_%s.%s'%(i,k,fmt))
    if os.path.exists(p): continue
    try:
        b=urllib.request.urlopen(urllib.request.Request(f[k]['1k'][fmt]['url'],headers=UA),timeout=120).read();open(p,'wb').write(b);print('ok',i,k,len(b)//1024,'KB')
    except Exception as e: print('FAIL',i,k,e)
    time.sleep(0.2)
