#!/usr/bin/env python3
"""Refresh a private working copy from main, keeping the files you own.
Usage: tools/syncwork.py <id> <owned path or dir> [more...]
Copies every file of main gk3/ into work/<id>/gk3/ EXCEPT paths you list as owned (files, or directories ending with /)."""
import sys,os,shutil,hashlib
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));wid=sys.argv[1];owned=[p.rstrip('/') for p in sys.argv[2:]]
src=os.path.join(root,'gk3');dst=os.path.join(root,'work',wid,'gk3');n=0
def is_owned(rel): return any(rel==o or rel.startswith(o+'/') for o in owned)
for d,_,fs in os.walk(src):
    for f in fs:
        p=os.path.join(d,f);rel=os.path.relpath(p,src)
        if is_owned(rel): continue
        q=os.path.join(dst,rel);os.makedirs(os.path.dirname(q),exist_ok=True)
        if not os.path.exists(q) or open(p,'rb').read()!=open(q,'rb').read(): shutil.copy2(p,q);n+=1;print('updated',rel)
with open(os.path.join(root,'work',wid,'base.md5'),'w') as out:
    for d,_,fs in sorted(os.walk(src)):
        for f in sorted(fs):
            p=os.path.join(d,f);out.write(hashlib.md5(open(p,'rb').read()).hexdigest()+'  ./'+os.path.relpath(p,src)+'\n')
print(n,'files refreshed from main; base snapshot updated')
