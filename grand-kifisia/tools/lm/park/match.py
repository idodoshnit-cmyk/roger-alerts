# side-by-side: georeferenced aerial r05 (warped to world, north up) | game top view (cam 140 m above (-182,-10), fov 60) -> match image
# usage: python3 match.py ROOT game_top.png out.jpg [label]
import sys,math
from PIL import Image,ImageDraw
R,G,OUT=sys.argv[1:4];lab=sys.argv[4] if len(sys.argv)>4 else ''
g=Image.open(G).convert('RGB');W,H=g.size
half=140*math.tan(math.radians(30));Pm=H/(2*half);cx,cz=-182.0,-10.5
X0=cx-W/2/Pm;Z0=cz-H/2/Pm
a=math.radians(15.0);s=8.1;fx,fy=473,368;F=(-182.07,-12.73);ca,sa=math.cos(a),math.sin(a);dx0=X0-F[0];dz0=Z0-F[1];P=Pm
img=Image.open(R+'/ref/r05.jpg').convert('RGB')
w=img.transform((W,H),Image.AFFINE,(s*ca/P,s*sa/P,s*(ca*dx0+sa*dz0)+fx,-s*sa/P,s*ca/P,s*(-sa*dx0+ca*dz0)+fy),resample=Image.BILINEAR)
out=Image.new('RGB',(W*2+10,H+28),(20,20,20));out.paste(w,(0,28));out.paste(g,(W+10,28))
d=ImageDraw.Draw(out);d.text((8,8),'REFERENCE: Commons "Alsos Kifisias 4106.jpg" (C messier, CC BY-SA 4.0), georeferenced, north up',fill=(255,255,255))
d.text((W+18,8),'GAME (lm-park) same window, north up '+lab,fill=(255,255,255))
out.save(OUT,quality=88);print(OUT,W,H,Pm)
