"""Street-address model for central Kifisia.
Builds, per OSM street, an axis polyline and a monotone map house number -> arc length (per parity side),
from exact OSM addr:housenumber points plus (noisier) addressed points of Overture / Foursquare.
geocode(street, number) -> dict(lat, lon, x, z, errM, how) or None."""
import json, os, re, math, difflib, collections, statistics
from common import *
from shapely.geometry import LineString, MultiLineString, Point, Polygon
from shapely.ops import linemerge
from shapely.strtree import STRtree

# ---------- street name canonicalisation ----------
def phon(s):
    """Phonetic key tolerant to transliteration variants (Kiriazi/Kyriazi, Kifissias/Kifisias, Levidou/Lebidou)."""
    s = norm_street(s)
    s = translit(s).lower(); s = strip_acc(s)
    s = re.sub(r'[^a-z ]', ' ', s)
    for a, b in (('ph','f'),('th','t'),('ch','h'),('kh','h'),('ou','u'),('oy','u'),('ei','i'),('oi','i'),('ai','e'),('y','i'),('mp','b'),('nt','d'),('gk','g'),('ng','g'),('gg','g'),('ks','x'),('w','o'),('c','k'),('ee','i'),('av','af'),('ev','ef'),('b','v'),('q','k')):
        s = s.replace(a, b)
    s = s.replace('h', '')
    s = re.sub(r'(.)\1+', r'\1', s)
    return re.sub(r'\s+', ' ', s).strip()

_PREF = r'^(λεωφορος|λεωφόρος|λεωφ|λεωφ\.|λεω|λ\.|οδος|οδός|οδ\.|leoforos|leof|leof\.|l\.|avenue|ave|av\.|odos|od\.|str|str\.|street|plateia|πλατεια|πλατεία|πλ\.|pl\.)\s+'
def norm_street(s):
    s = (s or '').strip()
    s = re.sub(r'[,;].*$', '', s)
    low = s
    for _ in range(3):
        n = re.sub(_PREF, '', low, flags=re.I)
        if n == low: break
        low = n
    low = re.sub(r'\s+(avenue|ave|av|str|street|st|leoforos|λεωφόρος|λεωφορος|οδός)\.?$', '', low, flags=re.I)
    return low.strip()

def parse_address(a):
    """'Λεωφ. Κηφισίας 238-240' -> ('Λεωφ. Κηφισίας', 238, '238-240'); returns (street, int|None, raw number)."""
    if not a: return (None, None, None)
    a = a.strip()
    a = re.sub(r'\b(1[0-9]{2})\s?([0-9]{2})\b.*$', '', a) if re.search(r'\b14[5-6]\s?[0-9]{2}\b', a) else a  # strip postcode + tail
    a = re.sub(r'(κηφισι[άα]|kifis+ia|kefalari|κεφαλ[άα]ρι|αθ[ήη]να|athens|greece|ελλ[άα]δα|attica|αττικ[ήη])\s*$', '', a, flags=re.I).strip(' ,')
    m = re.match(r'^\s*(\d+[A-Za-zΑ-Ωα-ω]?(?:\s*[-–&]\s*\d+)?)\s*,?\s+(.+)$', a)   # "17 Spetson"
    if m and not re.search(r'\d', m.group(2)):
        raw, street = m.group(1), m.group(2)
    else:
        m = re.match(r'^(.*?[^\d\s])\s*,?\s*(\d+\s?[A-Za-zΑ-Ωα-ω]?(?:\s*[-–&]\s*\d+\s?[A-Za-zΑ-Ωα-ω]?)?)\b(.*)$', a)
        if not m: return (a, None, None)
        street, raw = m.group(1), m.group(2)
    num = int(re.match(r'\d+', raw).group(0))
    street = street.strip(' ,.-')
    street = re.sub(r'\s*&.*$', '', street)
    if num > 600: return (street, None, raw)
    return (street, num, raw.strip())

class AddrModel:
    def __init__(self):
        self.map = load_map()
        self.streets_raw = json.load(open(os.path.join(WORK, 'osm_streets.json'), encoding='utf-8'))
        self.axis = {}      # name -> LineString (metres)
        self.keys = {}      # phon key -> name
        self.lasttok = collections.defaultdict(set)
        for name, ws in self.streets_raw.items():
            lines = [LineString([P(a, b) for a, b in w['pts']]) for w in ws if len(w['pts']) > 1]
            if not lines: continue
            self.axis[name] = self._axis(lines)
            for alias in {name, *(w.get('name_en') or '' for w in ws)}:
                if alias:
                    k = phon(alias); self.keys.setdefault(k, name)
                    toks = k.split()
                    if toks: self.lasttok[toks[-1]].add(name)
        # manual aliases (common directory spellings)
        for alias, name in (('Γ. Κυριαζή', 'Κυριαζή'), ('Γεωργίου Κυριαζή', 'Κυριαζή'), ('Kyriazi', 'Κυριαζή'), ('Λεωφόρος Κηφισίας', 'Κηφισίας'), ('Kifissias', 'Κηφισίας'),
                            ('Χαρ. Τρικούπη', 'Χαριλάου Τρικούπη'), ('Τρικούπη', 'Χαριλάου Τρικούπη'), ('Δροσίνη', 'Γεωργίου Δροσίνη'), ('Λαμπράκη', 'Γρηγορίου Λαμπράκη'),
                            ('Εμμανουήλ Μπενάκη', 'Εμμανουήλ Μπενάκη'), ('Kassaveti', 'Κασσαβέτη'), ('Kasaveti', 'Κασσαβέτη'), ('Cassaveti', 'Κασσαβέτη'),
                            ('Panagitsas', 'Παναγίτσας'), ('Αγ. Δημητρίου', 'Αγίου Δημητρίου'), ('Αγ. Θεοδώρων', 'Αγίων Θεοδώρων'), ('Αγ. Τρύφωνος', 'Αγίου Τρύφωνος'),
                            ('Ιακώβου', 'Μητροπολίτου Ιακώβου'), ('Μητρ. Ιακώβου', 'Μητροπολίτου Ιακώβου'), ('Πλατάνου', 'Πλατεία Πλατάνου')):
            if name in self.axis: self.keys[phon(alias)] = name
        # buildings for facade snapping
        self.bpolys = []
        for b in self.map['buildings']:
            c = unp(b[10])
            if len(c) >= 3:
                try:
                    pg = Polygon(c)
                    if not pg.is_valid: pg = pg.buffer(0)
                    if pg.area > 4: self.bpolys.append(pg)
                except Exception: pass
        self.btree = STRtree(self.bpolys)
        self.models = {}
        self.anchors = collections.defaultdict(list)  # name -> [(num, s, side, w, src, x, z)]

    def _axis(self, lines):
        ml = linemerge(MultiLineString(lines))
        comps = list(ml.geoms) if ml.geom_type == 'MultiLineString' else [ml]
        comps.sort(key=lambda g: -g.length)
        ax = list(comps[0].coords); rest = comps[1:]
        changed = True
        while changed and rest:
            changed = False
            for end in (0, -1):
                e = ax[end]; best = None
                for c in rest:
                    cc = list(c.coords)
                    for rev in (False, True):
                        q = cc[::-1] if rev else cc
                        d = math.hypot(q[0][0] - e[0], q[0][1] - e[1])
                        if d < 25 and (best is None or c.length > best[0].length):
                            # must continue away from the axis (not double back = other carriageway)
                            a2 = ax[end - 1] if end == -1 else ax[1]
                            v1 = (e[0] - a2[0], e[1] - a2[1]); v2 = (q[-1][0] - q[0][0], q[-1][1] - q[0][1])
                            if v1[0] * v2[0] + v1[1] * v2[1] > 0: best = (c, q)
                if best:
                    rest.remove(best[0])
                    ax = ax + best[1] if end == -1 else best[1][::-1] + ax
                    changed = True
        return LineString(ax)

    def street(self, s):
        """Resolve a free-text street name to an OSM street name (or None)."""
        if not s: return None
        k = phon(s)
        if not k: return None
        if k in self.keys: return self.keys[k]
        toks = k.split()
        # drop first-name initials: "g kiriazi"
        t2 = ' '.join(t for t in toks if len(t) > 1)
        if t2 in self.keys: return self.keys[t2]
        cand = difflib.get_close_matches(k, list(self.keys), n=1, cutoff=0.86)
        if cand: return self.keys[cand[0]]
        if toks and len(toks[-1]) > 4 and len(self.lasttok.get(toks[-1], ())) == 1:
            return next(iter(self.lasttok[toks[-1]]))
        cand = difflib.get_close_matches(toks[-1], list(self.lasttok), n=1, cutoff=0.88) if toks and len(toks[-1]) > 5 else None
        if cand and len(self.lasttok[cand[0]]) == 1: return next(iter(self.lasttok[cand[0]]))
        return None

    def project(self, name, x, z):
        ax = self.axis[name]; p = Point(x, z)
        s = ax.project(p); q = ax.interpolate(s); d = p.distance(q)
        a = ax.interpolate(max(0, s - 1)); b = ax.interpolate(min(ax.length, s + 1))
        cr = (b.x - a.x) * (z - a.y) - (b.y - a.y) * (x - a.x)
        return s, d, (1 if cr > 0 else -1)

    def add_anchor(self, street, num, lat, lon, w, src):
        name = self.street(street)
        if not name or num is None: return False
        x, z = P(lat, lon)
        s, d, side = self.project(name, x, z)
        if d > 70: return False
        ax = self.axis[name]
        if (s <= 0.5 or s >= ax.length - 0.5) and d > 25: return False
        self.anchors[name].append((num, s, side, w, src, x, z, d))
        return True

    def fit(self):
        for name, A in self.anchors.items():
            ex = [a for a in A if a[4] == 'osm']
            # combine noisy anchors per number: median s; drop if far from robust trend
            byn = collections.defaultdict(list)
            for a in A:
                if a[4] != 'osm': byn[a[0]].append(a)
            pts = [(a[0], a[1], 3.0, 'osm') for a in ex]
            for n, L in byn.items():
                if any(e[0] == n for e in ex): continue
                ss = sorted(l[1] for l in L)
                med = ss[len(ss) // 2]
                # agreement bonus
                close = [l for l in L if abs(l[1] - med) < 25]
                pts.append((n, statistics.mean(l[1] for l in close), 0.5 + 0.5 * min(len(close), 4), 'noisy'))
            if len(pts) < 2:
                self.models[name] = {'pts': pts, 'ok': False}; continue
            # Theil-Sen slope/intercept
            sl = []
            for i in range(len(pts)):
                for j in range(i + 1, len(pts)):
                    if pts[i][0] != pts[j][0]:
                        wgt = int(round(pts[i][2] * pts[j][2]))
                        sl += [(pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0])] * max(1, wgt)
            if not sl:
                self.models[name] = {'pts': pts, 'ok': False}; continue
            b = statistics.median(sl)
            a0 = statistics.median([p[1] - b * p[0] for p in pts for _ in range(max(1, int(round(p[2]))))])
            res = [abs(p[1] - (a0 + b * p[0])) for p in pts]
            mad = statistics.median(res) if res else 0
            thr = max(35.0, 3.5 * mad)
            keep = [p for p, r in zip(pts, res) if p[3] == 'osm' or r <= thr]
            keep.sort()
            # isotonic (PAVA) in direction of slope
            sign = 1 if b >= 0 else -1
            blocks = [[p[0], sign * p[1], p[2], 1] for p in keep]  # num(sum*w), val, w, count
            vals = [[sign * p[1] * p[2], p[2], [p]] for p in keep]
            st = []
            for v in vals:
                st.append(v)
                while len(st) > 1 and st[-2][0] / st[-2][1] > st[-1][0] / st[-1][1]:
                    b2 = st.pop(); b1 = st.pop()
                    st.append([b1[0] + b2[0], b1[1] + b2[1], b1[2] + b2[2]])
            iso = []
            for blk in st:
                v = sign * blk[0] / blk[1]
                for p in blk[2]: iso.append((p[0], v, p[3], p[1]))
            # side per parity
            sv = {0: 0.0, 1: 0.0}
            for a in A:
                sv[a[0] % 2] += a[2] * a[3] * (3 if a[4] == 'osm' else 1)
            if sv[0] == 0 and sv[1] != 0: sv[0] = -sv[1]
            if sv[1] == 0 and sv[0] != 0: sv[1] = -sv[0]
            if sv[0] * sv[1] > 0:  # conflict: trust the stronger, flip the weaker
                if abs(sv[0]) >= abs(sv[1]): sv[1] = -sv[0]
                else: sv[0] = -sv[1]
            self.models[name] = {'ok': True, 'iso': iso, 'slope': b, 'icpt': a0, 'side': {0: 1 if sv[0] > 0 else -1, 1: 1 if sv[1] > 0 else -1},
                                 'n_osm': len(ex), 'n_noisy': len(keep) - len(ex), 'mad': mad, 'dropped': len(pts) - len(keep)}

    def _s_of(self, name, num, skip=None):
        """arc length for a number + error estimate. skip: an (num, s) OSM anchor to leave out (cross-validation)."""
        M = self.models.get(name)
        if not M or not M.get('ok'): return None
        iso = [p for p in M['iso'] if not (skip and p[0] == skip[0] and abs(p[3] - skip[1]) < 0.01)]
        if not iso: return None
        exact = [p for p in iso if p[0] == num]
        if exact:
            p = exact[0]
            return (p[3] if p[2] == 'osm' else p[1]), (5.0 if p[2] == 'osm' else 18.0), ('exact-osm' if p[2] == 'osm' else 'exact-noisy')
        def bracket(cands):
            lo = [p for p in cands if p[0] < num]; hi = [p for p in cands if p[0] > num]
            return (max(lo, key=lambda p: p[0]) if lo else None, min(hi, key=lambda p: p[0]) if hi else None)
        same = [p for p in iso if p[0] % 2 == num % 2]
        lo, hi = bracket(same)
        lo2, hi2 = bracket(iso)
        # prefer same-parity bracket if both ends are near in number; else any-parity bracket
        if not (lo and hi and hi[0] - lo[0] <= 12):
            if lo2 and hi2 and (not (lo and hi) or (hi2[0] - lo2[0]) < (hi[0] - lo[0])): lo, hi = lo2, hi2
        if lo and hi:
            t = (num - lo[0]) / (hi[0] - lo[0])
            s = lo[1] + t * (hi[1] - lo[1])
            gap = abs(hi[1] - lo[1])
            err = 6 + 0.35 * gap * (2 * min(t, 1 - t) + 0.3) + (0 if lo[2] == 'osm' else 6) + (0 if hi[2] == 'osm' else 6)
            return s, min(err, 60), 'interp'
        near = lo or hi or lo2 or hi2
        if near is None: return None
        dn = abs(num - near[0])
        slope = M['slope'] if abs(M['slope']) > 0.5 else (4.0 if M['slope'] >= 0 else -4.0)
        slope = max(-12, min(12, slope))
        s = near[1] + slope * (num - near[0])
        return s, min(12 + 3.0 * dn + (0 if near[2] == 'osm' else 8), 90), 'extrap'

    def facade_point(self, name, s, side):
        ax = self.axis[name]
        s = max(0.0, min(ax.length, s))
        q = ax.interpolate(s)
        a = ax.interpolate(max(0, s - 1)); b = ax.interpolate(min(ax.length, s + 1))
        dx, dz = b.x - a.x, b.y - a.y; L = math.hypot(dx, dz) or 1
        nx, nz = -dz / L * side, dx / L * side   # left normal * side (side=+1 => cross>0)
        ray = LineString([(q.x + nx * 2, q.y + nz * 2), (q.x + nx * 32, q.y + nz * 32)])
        best = None
        for i in self.btree.query(ray):
            g = self.bpolys[i].exterior.intersection(ray)
            if g.is_empty: continue
            d = g.distance(Point(q.x, q.y))
            if best is None or d < best: best = d
        if best is None:
            # nearest building on that side within 25 m
            p = Point(q.x + nx * 9, q.y + nz * 9)
            cand = [(self.bpolys[i].distance(p), i) for i in self.btree.query(p.buffer(22))]
            if cand:
                d, i = min(cand)
                e = self.bpolys[i].exterior; pt = e.interpolate(e.project(p))
                return pt.x, pt.y, 'near-building'
            return q.x + nx * 8, q.y + nz * 8, 'no-building'
        d = best + 1.5
        return q.x + nx * d, q.y + nz * d, 'facade'

    def geocode(self, street, num, skip=None):
        name = self.street(street)
        if not name or num is None: return None
        r = self._s_of(name, num, skip)
        if r is None: return None
        s, err, how = r
        M = self.models[name]
        ax = self.axis[name]
        if s < -15 or s > ax.length + 15: err += 25
        side = M['side'][num % 2]
        x, z, fh = self.facade_point(name, s, side)
        lat, lon = LL(x, z)
        if fh != 'facade': err += 5
        return {'street': name, 'lat': lat, 'lon': lon, 'x': x, 'z': z, 'errM': round(err, 1), 'how': how + '/' + fh, 's': s, 'side': side}

def build_model(verbose=False):
    AM = AddrModel()
    osm_addr = json.load(open(os.path.join(WORK, 'osm_addr.json'), encoding='utf-8'))
    n = collections.Counter()
    for a in osm_addr:
        if not a.get('street'): continue
        m = re.match(r'\d+', a['number'] or '')
        if not m: continue
        n['osm'] += AM.add_anchor(a['street'], int(m.group(0)), a['lat'], a['lon'], 3.0, 'osm')
    # Overture
    ov = os.path.join(ROOT, 'tools', 'data', 'src', 'overture_places_2026-11-18.geojson')
    if os.path.exists(ov):
        for f in json.load(open(ov, encoding='utf-8'))['features']:
            pr = f['properties']
            if pr.get('confidence', 0) < 0.5: continue
            ad = (pr.get('addresses') or [{}])[0].get('freeform')
            st, num, raw = parse_address(ad)
            if num is None: continue
            lon, lat = f['geometry']['coordinates']
            n['overture'] += AM.add_anchor(st, num, lat, lon, 1.0, 'overture')
    fq = os.path.join(RAW, 'fsq_places_2025-02-06.json')
    if os.path.exists(fq):
        for r in json.load(open(fq, encoding='utf-8'))['rows']:
            st, num, raw = parse_address(r.get('address'))
            if num is None: continue
            n['fsq'] += AM.add_anchor(st, num, r['latitude'], r['longitude'], 1.0, 'fsq')
    AM.fit()
    if verbose: print('anchors', dict(n))
    return AM

if __name__ == '__main__':
    AM = build_model(True)
    # leave-one-out validation on OSM anchors
    errs = []; per = collections.defaultdict(list)
    for name, A in AM.anchors.items():
        for a in A:
            if a[4] != 'osm': continue
            g = AM.geocode(name, a[0], skip=(a[0], a[1]))
            if not g: continue
            e = math.hypot(g['x'] - a[5], g['z'] - a[6]); es = abs(g['s'] - a[1])
            errs.append((e, es, g['errM'], name, a[0], g['how'])); per[name].append(e)
    errs.sort()
    E = [e[0] for e in errs]
    print('LOO n=%d median=%.1f p75=%.1f p90=%.1f max=%.1f' % (len(E), statistics.median(E), E[int(len(E) * .75)], E[int(len(E) * .9)], E[-1]))
    for name in ('Κασσαβέτη', 'Λεβίδου', 'Κολοκοτρώνη', 'Κυριαζή', 'Κηφισίας', 'Αργυροπούλου', 'Παναγίτσας', 'Παπαδιαμάντη'):
        M = AM.models.get(name)
        if M and M.get('ok'):
            print(name, 'osm', M['n_osm'], 'noisy', M['n_noisy'], 'dropped', M['dropped'], 'slope %.1f m/num' % M['slope'], 'mad %.0f' % M['mad'], 'side', M['side'], 'LOO med %.1f' % (statistics.median(per[name]) if per[name] else -1), 'axis %.0f m' % AM.axis[name].length)
    print('worst', [(round(e[0]), e[3], e[4], e[5], e[2]) for e in errs[-12:]])
    # calibration of error estimate
    ratio = sorted(e[0] / e[2] for e in errs)
    print('err/estimate median %.2f p90 %.2f' % (ratio[len(ratio)//2], ratio[int(len(ratio)*.9)]))
    for t in ('Κηφισίας 238', 'Kassaveti 19', 'Λεβίδου 2', 'Kiriazi 21', 'Γ. Κυριαζή 36 Β', 'Λεωφ. Κηφισίας 238-240', 'Kolokotroni 35 Kifissia', '17 Spetson', 'Αργυροπουλου 1-3&λεβιδου'):
        st, num, raw = parse_address(t)
        print(t, '->', st, num, raw, AM.street(st), AM.geocode(st, num) and {k: (round(v, 1) if isinstance(v, float) else v) for k, v in AM.geocode(st, num).items() if k in ('x', 'z', 'errM', 'how')})
