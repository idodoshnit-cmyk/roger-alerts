#!/usr/bin/env python3
"""Minimal binary-FBX reader (enough to list Objects and Connections). Usage: fbxdump.py file.fbx"""
import struct, sys, zlib
def read_node(b, o, v):
    if v >= 7500:
        end, nprops, plen = struct.unpack_from('<QQQ', b, o); o += 24
    else:
        end, nprops, plen = struct.unpack_from('<III', b, o); o += 12
    nl = b[o]; o += 1
    name = b[o:o+nl].decode('latin1'); o += nl
    if end == 0: return None, o
    props = []; p = o
    for _ in range(nprops):
        t = chr(b[p]); p += 1
        if t in 'YCIFDL':
            fmt = {'Y':'<h','C':'<b','I':'<i','F':'<f','D':'<d','L':'<q'}[t]
            props.append(struct.unpack_from(fmt, b, p)[0]); p += struct.calcsize(fmt)
        elif t in 'fdlib':
            n, enc, cl = struct.unpack_from('<III', b, p); p += 12
            props.append(('arr', t, n)); p += cl
        elif t in 'SR':
            n = struct.unpack_from('<I', b, p)[0]; p += 4
            props.append(b[p:p+n].decode('latin1') if t == 'S' else ('raw', n)); p += n
        else: raise Exception('type ' + t)
    o += plen; kids = []
    while o < end:
        k, o = read_node(b, o, v)
        if k is None: break
        kids.append(k)
    return (name, props, kids), end
def load(fn):
    b = open(fn, 'rb').read(); v = struct.unpack_from('<I', b, 23)[0]; o = 27; top = []
    while o < len(b) - 200:
        n, o = read_node(b, o, v)
        if n is None: break
        top.append(n)
    return v, top
if __name__ == '__main__':
    v, top = load(sys.argv[1]); print('version', v)
    for n in top:
        if n[0] == 'Objects':
            for k in n[2]:
                nm = k[1][1].replace('\x00\x01', '::') if len(k[1]) > 1 else ''
                extra = ''
                if k[0] == 'Geometry':
                    for c in k[2]:
                        if c[0] in ('Vertices', 'PolygonVertexIndex'): extra += ' %s=%s' % (c[0], c[1][0][2])
                if k[0] in ('Geometry', 'Model', 'Material', 'Texture', 'AnimationStack', 'Deformer') and not (k[0] == 'Deformer' and 'Cluster' in str(k[1][-1])) and not (k[0]=='Model' and k[1][-1]=='LimbNode' and '-v' not in sys.argv):
                    print(k[0], nm, k[1][-1], extra)
        if n[0] == 'Takes' or n[0] == 'GlobalSettings':
            def walk(x, d=0):
                if x[0] in ('P',) and x[1] and x[1][0] in ('TimeSpanStart','TimeSpanStop','UpAxis','FrontAxis','UnitScaleFactor','TimeMode','CustomFrameRate','OriginalUnitScaleFactor'): print(' ' * d, x[1])
                for c in x[2]: walk(c, d + 1)
            walk(n)
