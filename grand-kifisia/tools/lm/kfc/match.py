# python3 -I match.py out.jpg refimg gameimg [refimg gameimg ...] — rows of ref | game, each 420 px high, labelled
import sys
from PIL import Image, ImageDraw
out=sys.argv[1]; pairs=list(zip(sys.argv[2::2],sys.argv[3::2])); H=420; rows=[]
for r,g in pairs:
    ims=[Image.open(p).convert('RGB') for p in (r,g)]; ims=[i.resize((int(i.width*H/i.height),H)) for i in ims]
    row=Image.new('RGB',(sum(i.width for i in ims)+6,H),'white'); x=0
    for i,lab in zip(ims,('REFERENCE (Commons 4102, C messier, CC BY-SA 4.0)','GAME')):
        row.paste(i,(x,0)); d=ImageDraw.Draw(row); d.rectangle([x,0,x+len(lab)*7+8,16],fill='black'); d.text((x+4,2),lab,fill='white'); x+=i.width+6
    rows.append(row)
W=max(r.width for r in rows); img=Image.new('RGB',(W,sum(r.height+6 for r in rows)),'white'); y=0
for r in rows: img.paste(r,(0,y)); y+=r.height+6
img.save(out,quality=85); print(out,img.size)
