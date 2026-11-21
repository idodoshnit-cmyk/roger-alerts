"""fitcam.py corr.json : fit camera pose (x,h,z,yaw,pitch,hfov) by random-restart coordinate descent to point correspondences
corr.json = {"W":960,"H":720,"init":[x,h,z,yaw,pitch,hfov], "pts":[[x,yAboveTerrain,z,u,v],...], "lines":[{"road":"Κηφισίας","px":[[u,v],..]}]}"""
import sys, json, math, random, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = json.load(open(os.path.join(ROOT, 'gk3', 'kifisia_map.json'))); T = M['terrain']
def terr(x, z):
    gx = (x - T['x0']) / T['step']; gz = (z - T['z0']) / T['step']
    i = max(0, min(T['nx'] - 2, int(gx))); j = max(0, min(T['nz'] - 2, int(gz))); fx = min(1, max(0, gx - i)); fz = min(1, max(0, gz - j))
    h = T['h']; n = T['nx']
    return ((h[j*n+i]*(1-fx)+h[j*n+i+1]*fx)*(1-fz)+(h[(j+1)*n+i]*(1-fx)+h[(j+1)*n+i+1]*fx)*fz)/100
C = json.load(open(sys.argv[1])); W, H = C['W'], C['H']
road_pts = {}
for L in C.get('lines', []):
    P = []
    if L['road'] == '@train':
        t = M['train']; P = [(t[i]/10, t[i+1]/10) for i in range(0, len(t)-1, 2)]
    else:
        ni = M['names'].index(L['road'])
        for r in M['roads']:
            if r[1] == ni:
                P += [(r[i]/10, r[i+1]/10) for i in range(8, len(r)-1, 2)]
    # densify
    road_pts[L['road']] = [(x, terr(x, z), z) for x, z in P]
def proj(p, X):
    cx, ch, cz, yaw, pitch, hfov = p; cy = terr(cx, cz) + ch
    f = (W/2)/math.tan(math.radians(hfov/2)); ya, pa = math.radians(yaw), math.radians(pitch)
    fwd = (math.sin(ya)*math.cos(pa), math.sin(pa), -math.cos(ya)*math.cos(pa)); right = (math.cos(ya), 0, math.sin(ya))
    up = (right[1]*fwd[2]-right[2]*fwd[1], right[2]*fwd[0]-right[0]*fwd[2], right[0]*fwd[1]-right[1]*fwd[0])
    if up[1] < 0: up = tuple(-u for u in up)
    dx, dy, dz = X[0]-cx, X[1]-cy, X[2]-cz
    zc = dx*fwd[0]+dy*fwd[1]+dz*fwd[2]
    if zc < 1: return None
    return (W/2 + f*(dx*right[0]+dy*right[1]+dz*right[2])/zc, H/2 - f*(dx*up[0]+dy*up[1]+dz*up[2])/zc)
def err(p):
    e = 0
    for x, y, z, u, v in C['pts']:
        q = proj(p, (x, terr(x, z)+y, z))
        e += 1e6 if q is None else (q[0]-u)**2 + (q[1]-v)**2
    for L in C.get('lines', []):
        pr = [proj(p, X) for X in road_pts[L['road']]]; pr = [q for q in pr if q]
        segs = list(zip(pr, pr[1:]))
        for u, v in L['px']:
            best = 1e9
            for a, b in segs:
                if math.hypot(a[0]-b[0], a[1]-b[1]) > 400: continue
                ax, ay = b[0]-a[0], b[1]-a[1]; l2 = ax*ax+ay*ay or 1
                t = max(0, min(1, ((u-a[0])*ax+(v-a[1])*ay)/l2)); best = min(best, (a[0]+t*ax-u)**2+(a[1]+t*ay-v)**2)
            e += min(best, 1e5)
    return e
best = list(C['init']); be = err(best); steps = [8, 8, 8, 6, 4, 6]
for it in range(4000):
    k = random.randrange(6); cand = best[:]; cand[k] += random.gauss(0, steps[k])
    cand[5] = max(40, min(95, cand[5])); cand[1] = max(2, cand[1])
    ce = err(cand)
    if ce < be: best, be = cand, ce
    if it % 1000 == 999: steps = [s*0.6 for s in steps]
print(json.dumps([round(v, 2) for v in best]), 'rms px', round(math.sqrt(be/ max(1, len(C['pts']) + sum(len(L['px']) for L in C.get('lines', [])))), 1))
