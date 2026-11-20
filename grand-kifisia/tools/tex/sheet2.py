#!/usr/bin/env python3
"""Contact sheet labelled by file name. usage: sheet2.py <out.jpg> <cell px> <cols> <file> [file...]"""
import sys,os
from PIL import Image,ImageDraw
out=sys.argv[1];cell=int(sys.argv[2]);cols=int(sys.argv[3]);fs=sys.argv[4:]
rows=(len(fs)+cols-1)//cols;sh=Image.new('RGB',(cols*cell,rows*(cell+14)),(20,20,20));dr=ImageDraw.Draw(sh)
for k,f in enumerate(fs):
    try: im=Image.open(f).convert('RGB').resize((cell,cell),Image.LANCZOS)
    except Exception as e: print('bad',f,e);continue
    x=(k%cols)*cell;y=(k//cols)*(cell+14);sh.paste(im,(x,y));dr.text((x+3,y+cell+1),os.path.splitext(os.path.basename(f))[0][:int(cell/6.2)],fill=(255,255,120))
sh.save(out,quality=88);print(out,sh.size)
