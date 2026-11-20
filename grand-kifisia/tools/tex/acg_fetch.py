#!/usr/bin/env python3
"""Download ambientCG (CC0) 1K-JPG zips and extract the maps we use.
usage: acg_fetch.py <outdir> <id> [id...]   -> <outdir>/<id>/<id>_{Color,NormalGL,Roughness,Opacity,Displacement,AmbientOcclusion}.jpg|png + meta.json"""
import sys,os,io,json,time,zipfile,urllib.request
UA={'User-Agent':'GrandKifisia-texture-pipeline/1.0 (CC0 asset fetch)'}
KEEP=('Color','NormalGL','Roughness','Opacity','Displacement','AmbientOcclusion','TONEMAPPED')
out=sys.argv[1]
for i in sys.argv[2:]:
    d=os.path.join(out,i)
    if os.path.exists(os.path.join(d,'meta.json')): continue
    os.makedirs(d,exist_ok=True)
    try:
        b=urllib.request.urlopen(urllib.request.Request('https://ambientcg.com/get?file=%s_1K-JPG.zip'%i,headers=UA),timeout=180).read()
        z=zipfile.ZipFile(io.BytesIO(b));names=[]
        for n in z.namelist():
            base=os.path.basename(n)
            if not base or not base.lower().endswith(('.jpg','.jpeg','.png')): continue
            if not any(k in base for k in KEEP): continue
            safe=''.join(c for c in base if c.isalnum() or c in '._-')
            open(os.path.join(d,safe),'wb').write(z.read(n));names.append(safe)
        json.dump({'id':i,'files':names,'source':'https://ambientcg.com/a/'+i,'licence':'CC0','zip_kb':len(b)//1024},open(os.path.join(d,'meta.json'),'w'))
        print('ok',i,len(b)//1024,'KB',len(names),'files',flush=True)
    except Exception as e: print('FAIL',i,e,flush=True)
    time.sleep(0.3)
