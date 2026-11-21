#!/usr/bin/env python3
"""side-by-side ref|game: sbs.py out.jpg ref1 game1 [ref2 game2 ...] (each row scaled to height 420)"""
import sys
from PIL import Image,ImageDraw
out=sys.argv[1];pairs=list(zip(sys.argv[2::2],sys.argv[3::2]));H=420;rows=[]
for r,g in pairs:
    ims=[Image.open(p).convert('RGB') for p in (r,g)];ims=[i.resize((int(i.width*H/i.height),H),Image.LANCZOS) for i in ims]
    row=Image.new('RGB',(sum(i.width for i in ims)+8,H),'white');x=0
    for i in ims: row.paste(i,(x,0));x+=i.width+8
    rows.append(row)
W=max(r.width for r in rows);img=Image.new('RGB',(W,sum(r.height+8 for r in rows)),'white');y=0
for r in rows: img.paste(r,(0,y));y+=r.height+8
img.save(out,quality=85);print(out,img.size)
