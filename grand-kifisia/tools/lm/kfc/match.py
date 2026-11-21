#!/usr/bin/env python3
# python3 tools/lm/kfc/match.py out.jpg ref.jpg[:x0,y0,x1,y1] game.png [label]  -> side-by-side ref | game, both scaled to 560 px high
import sys
from PIL import Image,ImageDraw
out,ref,game=sys.argv[1:4];lab=sys.argv[4] if len(sys.argv)>4 else ''
rp=ref.split(':');im=Image.open(rp[0]).convert('RGB')
if len(rp)>1:im=im.crop(tuple(int(v) for v in rp[1].split(',')))
g=Image.open(game).convert('RGB');H=560
a=im.resize((int(im.width*H/im.height),H));b=g.resize((int(g.width*H/g.height),H))
o=Image.new('RGB',(a.width+b.width+8,H+24),(20,20,20));o.paste(a,(0,24));o.paste(b,(a.width+8,24))
d=ImageDraw.Draw(o);d.text((6,5),'REFERENCE (Commons 4102, C messier, CC BY-SA 4.0)',fill=(255,255,255));d.text((a.width+14,5),'GAME '+lab,fill=(255,255,255))
o.save(out,quality=85)
