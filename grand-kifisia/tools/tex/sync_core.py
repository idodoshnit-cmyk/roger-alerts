#!/usr/bin/env python3
"""mats: copy ONLY the renderer block (from '/* Quality presets.' up to 'function resize(){') and GB.build() of work/mats/gk3/js/00_core.js into MAIN's 00_core.js,
leaving every other line of main's file as it is (other agents edit the rest). Prints what changed."""
import os,sys
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
mine=open(os.path.join(root,'work/mats/gk3/js/00_core.js'),encoding='utf8').read(); mp=os.path.join(root,'gk3/js/00_core.js'); main=open(mp,encoding='utf8').read()
def block(s,a,b):
    i=s.index(a); j=s.index(b,i); return i,j
out=main
for a,b in [('/* Quality presets.','function resize(){'),('  build(){','const hexc=')]:
    i,j=block(mine,a,b); k,l=block(out,a,b)
    if out[k:l]!=mine[i:j]: out=out[:k]+mine[i:j]+out[l:]; print('replaced block',a.strip()[:30])
if out!=main:
    open(mp,'w',encoding='utf8').write(out); print('main 00_core.js updated')
else: print('main already up to date')
rest_same = True
print('files identical now:', out==mine)
