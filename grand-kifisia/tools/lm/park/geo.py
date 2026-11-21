# Warp aerial r05 into world frame (north-up, 4 px/m) and overlay OSM, to georeference it.
import sys,json,math
from PIL import Image,ImageDraw
R=sys.argv[1];a=math.radians(float(sys.argv[2]));s=float(sys.argv[3]);fx,fy=float(sys.argv[4]),float(sys.argv[5]);out=sys.argv[6]
F=(-182.07,-12.73);img=Image.open(R+'/ref/r05.jpg').convert('RGB')
X0,Z0,X1,Z1,P=-370,-115,-70,60,4
W,H=int((X1-X0)*P),int((Z1-Z0)*P)
# inverse: world->image. world-F = R(a)*(u,v)/s  => (u,v)= s*R(-a)*(dw)
ca,sa=math.cos(a),math.sin(a)
# affine for PIL: output pixel (ox,oy) -> world (X0+ox/P, Z0+oy/P) -> image
# u = s*( ca*dx + sa*dz), v = s*(-sa*dx + ca*dz)
dx0=X0-F[0];dz0=Z0-F[1]
A=s*ca/P; B=s*sa/P; C=s*(ca*dx0+sa*dz0)+fx
D=-s*sa/P; E=s*ca/P; G=s*(-sa*dx0+ca*dz0)+fy
w=img.transform((W,H),Image.AFFINE,(A,B,C,D,E,G),resample=Image.BILINEAR)
d=json.load(open(R+'/tools/lm/park/park_osm.json'))
dr=ImageDraw.Draw(w)
T=lambda p:((p[0]-X0)*P,(p[1]-Z0)*P)
dr.line([T(p) for p in d['park']],fill=(255,0,0),width=2)
for wy in d['ways']:
    col=(255,255,0) if wy['tags'].get('highway') in('footway','steps') else (0,255,255)
    dr.line([T(p) for p in wy['pts']],fill=col,width=2)
for n in d['nodes']:
    x,y=T((n['x'],n['z']));dr.ellipse([x-4,y-4,x+4,y+4],outline=(255,0,255),width=2)
# roads from map
m=json.load(open(R+'/gk3/kifisia_map.json'))
for r in m['roads']:
    pts=[(r[i]/10,r[i+1]/10) for i in range(8,len(r)-1,2)]
    if any(X0<x<X1 and Z0<z<Z1 for x,z in pts): dr.line([T(p) for p in pts],fill=(0,128,255),width=1)
for gx in range(-360,-60,20):
    dr.line([T((gx,Z0)),T((gx,Z1))],fill=(255,255,255) if gx%100==0 else (120,120,120),width=1)
for gz in range(-100,60,20): dr.line([T((X0,gz)),T((X1,gz))],fill=(255,255,255) if gz%100==0 else (120,120,120),width=1)
w.save(out)
