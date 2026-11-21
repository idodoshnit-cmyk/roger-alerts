# side-by-side ref|game: python3 match.py out.jpg ref.png game.png [game2.png ...]  (height 600, labels)
import sys
from PIL import Image, ImageDraw
out=sys.argv[1];ims=[Image.open(p).convert('RGB') for p in sys.argv[2:]];H=600
ims=[i.resize((round(i.width*H/i.height),H)) for i in ims];W=sum(i.width for i in ims)+8*(len(ims)-1)
c=Image.new('RGB',(W,H+28),(20,20,20));d=ImageDraw.Draw(c);x=0
for k,(i,p) in enumerate(zip(ims,sys.argv[2:])):
  c.paste(i,(x,28));d.text((x+6,8),('REFERENCE (reference only): ' if k==0 else 'GAME: ')+p.split('/')[-1],fill=(255,255,255));x+=i.width+8
c.save(out,quality=85);print(out,c.size)
