# draw layout.json over the warped aerial (world frame, north up) for checking
import sys,json,math
from PIL import Image,ImageDraw
R=sys.argv[1];out=sys.argv[2];P=float(sys.argv[3]) if len(sys.argv)>3 else 4
L=json.load(open(R+'/tools/lm/park/layout.json'))
a=math.radians(15.0);s=8.1;fx,fy=473,368;F=(-182.07,-12.73)
img=Image.open(R+'/ref/r05.jpg').convert('RGB')
X0,Z0,X1,Z1=-370,-115,-70,60
W,H=int((X1-X0)*P),int((Z1-Z0)*P);ca,sa=math.cos(a),math.sin(a);dx0=X0-F[0];dz0=Z0-F[1]
w=img.transform((W,H),Image.AFFINE,(s*ca/P,s*sa/P,s*(ca*dx0+sa*dz0)+fx,-s*sa/P,s*ca/P,s*(-sa*dx0+ca*dz0)+fy),resample=Image.BILINEAR).convert('RGBA')
ov=Image.new('RGBA',(W,H),(0,0,0,0));dr=ImageDraw.Draw(ov)
T=lambda p:((p[0]-X0)*P,(p[1]-Z0)*P)
dr.line([T(p) for p in L['park']+[L['park'][0]]],fill=(255,0,0,255),width=2)
col={'lawn':(80,200,60,110),'shrub':(30,120,40,120),'palm':(0,200,200,110),'rock':(150,150,150,140),'grove':(140,100,40,90),'edge':(90,70,30,80)}
for b in L['beds']:
    dr.polygon([T(p) for p in b['ring']],fill=col[b['k']],outline=(255,255,0,200) if b['hedge'] else (255,255,255,120))
for t in L['trees']:
    x,y=T(t[:2]);r=t[3]/2*P;c={'fanpalm':(0,255,255),'aleppo':(255,255,0),'cedar':(0,120,255),'plane':(255,140,0),'melia':(255,90,200),'holmoak':(0,90,0),'cypress':(0,40,0),'carob':(255,0,0),'stonepine':(200,255,0),'pittosporum':(120,200,120)}.get(t[2],(255,255,255))
    dr.ellipse([x-r,y-r,x+r,y+r],outline=c+(255,),width=2)
for bl in L['balls']:
    x,y=T(bl[:2]);dr.ellipse([x-2,y-2,x+2,y+2],fill=(0,255,0,255))
for b in L['benches']:
    x,y=T(b[:2]);dr.rectangle([x-3,y-3,x+3,y+3],fill=(160,80,20,255))
for l in L['lamps']:
    x,y=T(l);dr.ellipse([x-3,y-3,x+3,y+3],fill=(255,255,255,255))
for k,f in L['feat'].items():
    c=f.get('c') or (f.get('x'),f.get('z')) if 'c' in f or 'x' in f else f.get('a')
    x,y=T(c);dr.rectangle([x-5,y-5,x+5,y+5],outline=(255,0,255,255),width=2);dr.text((x+6,y-6),k,fill=(255,0,255,255))
Image.alpha_composite(w,ov).convert('RGB').save(out)
