import json,sys
from PIL import Image,ImageDraw
R=sys.argv[1]; out=sys.argv[2]
m=json.load(open(R+'/gk3/kifisia_map.json'))
X0,Z0,X1,Z1=0,-30,200,130; S=6
im=Image.new('RGB',((X1-X0)*S,(Z1-Z0)*S),(235,235,230)); d=ImageDraw.Draw(im)
P=lambda x,z:((x-X0)*S,(z-Z0)*S)
def pts(c): return [(c[i]/10,c[i+1]/10) for i in range(0,len(c)-1,2)]
for sw in m['sidewalks']:
  for k,ring in enumerate(sw):
    d.polygon([P(*p) for p in pts(ring)],fill=(200,200,200) if k==0 else (235,235,230))
for r in m['roads']:
  p=pts(r[8:]); w=r[3]
  d.line([P(*q) for q in p],fill=(90,90,90),width=max(1,int(w*S/10*10/10)))
  if r[1]>=0 and len(p)>1: d.text(P(*p[len(p)//2]),m['names'][r[1]],fill=(0,0,200))
for i,b in enumerate(m['buildings']):
  p=pts(b[10]); 
  if not any(X0<x<X1 and Z0<z<Z1 for x,z in p): continue
  d.polygon([P(*q) for q in p],outline=(150,30,30),fill=(240,200,180))
  cx=sum(x for x,z in p)/len(p); cz=sum(z for x,z in p)/len(p)
  d.text(P(cx,cz),'b%d L%d'%(i,b[1]),fill=(0,0,0))
for k,v in m['special'].items():
  d.ellipse([P(v['door'][0]-1,v['door'][1]-1),P(v['door'][0]+1,v['door'][1]+1)],fill=(0,160,0)); d.text(P(*v['door']),k,fill=(0,120,0))
j=m['key']['junction']; d.ellipse([P(j[0]-1.5,j[1]-1.5),P(j[0]+1.5,j[1]+1.5)],fill=(255,0,255))
for x in range(X0,X1,10): d.line([P(x,Z0),P(x,Z0+2)],fill=0); d.text(P(x,Z0+2),str(x),fill=0)
for z in range(Z0,Z1,10): d.line([P(X0,z),P(X0+2,z)],fill=0); d.text(P(X0+2,z),str(z),fill=0)
im.save(out)
