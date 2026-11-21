import json,sys
from PIL import Image,ImageDraw
M=json.load(open(sys.argv[1]))
X0,Z0,X1,Z1=110,20,230,120; S=8
W,H=(X1-X0)*S,(Z1-Z0)*S
im=Image.new('RGB',(W,H),(235,235,230)); d=ImageDraw.Draw(im)
P=lambda x,z:((x-X0)*S,(z-Z0)*S)
def ring(c): return [P(c[i]/10,c[i+1]/10) for i in range(0,len(c)-1,2)]
for r in M['roads']:
  pts=ring(r[8:]); w=max(1,int(r[3]*S/1)) if r[3] else 4
  d.line(pts,fill=(150,150,150),width=max(2,int((r[3] or 3)*S)))
for sw in M['sidewalks']:
  try: d.polygon(ring(sw[0]),outline=(200,120,120))
  except: pass
for a in M['areas']:
  for rg in a[1]:
    try: d.polygon(ring(rg),outline=(60,160,60)); d.text(ring(rg)[0],str(a[0]),fill=(0,120,0))
    except: pass
for w in M['walls']:
  d.line(ring(w[1]),fill=(120,60,20),width=2)
for i,b in enumerate(M['buildings']):
  pts=ring(b[10])
  if any(X0<p[0]/S+X0<X1 and Z0<p[1]/S+Z0<Z1 for p in pts):
    d.polygon(pts,outline=(0,0,0),fill=(255,230,200) if i in (425,426) else (220,210,200))
    cx=sum(p[0] for p in pts)/len(pts); cz=sum(p[1] for p in pts)/len(pts); d.text((cx,cz),'b%d'%i,fill=(0,0,200))
for t in M['street_trees']+M['garden_trees']:
  x,z=t[0]/10 if t[0]>2000 else t[0],t[1]
for k in ('street_trees','garden_trees'):
  for t in M[k]:
    x,z=t[0],t[1]
    x,z=x/10,z/10
    if X0<x<X1 and Z0<z<Z1: d.ellipse([P(x-1,z-1),P(x+1,z+1)],fill=(0,140,0))
for l in M['lamps']:
  x,z=l[0]/10,l[1]/10
  if X0<x<X1 and Z0<z<Z1: d.rectangle([P(x-.3,z-.3),P(x+.3,z+.3)],fill=(255,0,0))
for pz in M.get('pois',[])[:0]: pass
for x in range(X0,X1,10):
  d.line([P(x,Z0),P(x,Z0+1)],fill=(0,0,0)); d.text(P(x,Z0+1),str(x),fill=(0,0,0))
for z in range(Z0,Z1,10):
  d.line([P(X0,z),P(X0+1,z)],fill=(0,0,0)); d.text(P(X0+1,z),str(z),fill=(0,0,0))
im.save(sys.argv[2])
print(M['street_trees'][:3],M['lamps'][:2], M['walls'][0][:3])
