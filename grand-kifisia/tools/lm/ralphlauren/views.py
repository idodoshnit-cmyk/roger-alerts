# build shot.js views for the RL villa from local (u,y,w) camera specs
import json,sys
OX,OZ,UX,UZ=161.5,62.8,0.95281,0.30355
def W(u,w): return [round(OX+UX*u-UZ*w,2), round(OZ+UZ*u+UX*w,2)]
def cam(name,cu,cy,cw,tu,ty,tw,**k):
    a=W(cu,cw); b=W(tu,tw); v={"name":name,"cam":[a[0],cy,a[1],b[0],ty,b[1]]}; v.update(k); return v
def player(name,u,w,yaw,**k):
    a=W(u,w); v={"name":name,"player":a,"yaw":yaw}; v.update(k); return v
sets={
 'v1':[cam('front',6,1.6,17,6,6.5,0,tod=11),cam('se',15.5,1.7,8.5,6.5,6.5,-3,tod=11),cam('night',6,1.6,17,6,6.5,0,tod=21.5),
       cam('street',4,1.7,22,6,4.5,0,tod=15),cam('air',24,26,20,6,7,-6,tod=11),cam('door',3,2.2,6,3,3.5,0,tod=11)],
}
print(json.dumps(sets[sys.argv[1]]))
