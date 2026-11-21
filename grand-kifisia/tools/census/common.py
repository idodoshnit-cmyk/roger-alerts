"""Shared helpers for the census pipeline (research-census)."""
import json, math, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK = os.path.join(ROOT, 'work', 'research-census')
RAW = os.path.join(WORK, 'raw')
LAT0, LON0 = 38.0727, 23.8125
KX, KZ = 87716.0, 110998.0
BBOX = (23.804, 38.0675, 23.8265, 38.0795)  # W,S,E,N of kif.osm

def P(lat, lon):
    return ((lon - LON0) * KX, -(lat - LAT0) * KZ)

def LL(x, z):
    return (LAT0 - z / KZ, LON0 + x / KX)

def load_map():
    return json.load(open(os.path.join(ROOT, 'gk3', 'kifisia_map.json')))

def unp(flat):
    return [(flat[i] / 10.0, flat[i + 1] / 10.0) for i in range(0, len(flat), 2)]

def pip(pt, poly):
    x, z = pt; ins = False; n = len(poly)
    for i in range(n):
        x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % n]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1:
            ins = not ins
    return ins

_GR = {
 'α':'a','β':'v','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i','θ':'th','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y','φ':'f','χ':'ch','ψ':'ps','ω':'o'}
_DIG = [('ου','ou'),('αι','ai'),('ει','ei'),('οι','oi'),('μπ','b'),('ντ','nt'),('γκ','gk'),('γγ','ng'),('τσ','ts'),('τζ','tz')]

def strip_acc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def translit(s):
    """Greek -> Latin (ELOT 743-like, simplified), keeps case style roughly."""
    if not s: return s
    out = []
    low = strip_acc(s)
    i = 0
    while i < len(low):
        ch = low[i]; l = ch.lower()
        two = low[i:i+2].lower()
        r = None
        if two in ('αυ','ευ'):
            nxt = low[i+2:i+3].lower()
            v = 'f' if nxt and nxt in 'θκξπσςτφχψ' or nxt in ('', ' ') else 'v'
            r = ('a' if two[0]=='α' else 'e') + v; step = 2
        else:
            for a, b in _DIG:
                if two == a:
                    r = b; step = 2
                    if a == 'μπ' and i > 0 and low[i-1].isalpha(): r = 'mp'
                    break
        if r is None:
            if l in _GR: r = _GR[l]; step = 1
            else: r = ch; step = 1; out.append(r); i += step; continue
        if ch.isupper():
            r = r.upper() if (i + step < len(low) and low[i+step].isupper()) or (i>0 and low[i-1].isupper()) else r.capitalize()
        out.append(r); i += step
    return ''.join(out)

def has_greek(s):
    return bool(s) and any('Ͱ' <= c <= 'Ͽ' or 'ἀ' <= c <= '῿' for c in s)

def norm(s):
    """Normalised key for name matching: transliterated, lower, alnum only."""
    if not s: return ''
    s = translit(s).lower()
    s = strip_acc(s)
    s = s.replace('&', ' and ')
    s = re.sub(r"[^a-z0-9]+", ' ', s)
    s = re.sub(r'\b(kifisia|kifissia|kifisias|kifissias|kefalari|sa|ae|ee|oe|ike|epe|the|store|shop|stores)\b', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])

def jdump(obj, path, **kw):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, **kw)
    json.load(open(tmp, encoding='utf-8'))
    os.replace(tmp, path)
