#!/usr/bin/env python3
"""Download 1K JPG maps of Poly Haven (CC0) textures.
usage: ph_fetch.py <outdir> <maps: diff,nor,rough,disp,ao> <id> [id...]
Each asset goes into its own directory <outdir>/<id>/ ; a meta json with the real-world size is written next to it."""
import sys,json,os,time,urllib.request
UA={'User-Agent':'GrandKifisia-texture-pipeline/1.0 (CC0 asset fetch)'}
MAPK={'diff':['Diffuse','diff','Color'],'nor':['nor_gl'],'rough':['Rough','rough'],'disp':['Displacement','disp'],'ao':['AO','ao'],'arm':['arm']}
def get(u,binary=False,tries=3):
    for k in range(tries):
        try:
            r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read()
            return r if binary else json.loads(r)
        except Exception as e:
            err=e;time.sleep(2+3*k)
    raise err
out=sys.argv[1];maps=sys.argv[2].split(',');ids=sys.argv[3:]
allmeta=json.load(open(os.path.join(os.path.dirname(out.rstrip('/')),'ph_textures.json'))) if os.path.exists(os.path.join(os.path.dirname(out.rstrip('/')),'ph_textures.json')) else {}
for i in ids:
    d=os.path.join(out,i);os.makedirs(d,exist_ok=True)
    need=[m for m in maps if not os.path.exists(os.path.join(d,'%s_%s.jpg'%(i,m)))]
    if not need: continue
    try: f=get('https://api.polyhaven.com/files/'+i)
    except Exception as e: print('FAIL files',i,e);continue
    for m in need:
        ent=None
        for k in MAPK[m]:
            if k in f: ent=f[k];break
        if not ent: print('  no map',m,'for',i,list(f.keys()));continue
        try:
            u=ent['1k']['jpg']['url'];b=get(u,True);open(os.path.join(d,'%s_%s.jpg'%(i,m)),'wb').write(b);print('ok',i,m,len(b)//1024,'KB')
        except Exception as e: print('FAIL',i,m,e)
    if i in allmeta:
        a=allmeta[i];json.dump({'id':i,'name':a.get('name'),'dimensions_mm':a.get('dimensions'),'authors':a.get('authors'),'source':'https://polyhaven.com/a/'+i,'licence':'CC0'},open(os.path.join(d,'meta.json'),'w'))
    time.sleep(0.25)
