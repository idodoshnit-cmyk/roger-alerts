#!/usr/bin/env python3
"""List likely duplicate pairs in the build set (tiers A+B) of a census file. Usage: dupcheck.py [census.json]"""
import json, math, unicodedata, re, sys
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'gk3/data/census.json'))
def n(s):
    s = unicodedata.normalize('NFD', s.lower()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn'); return re.sub(r'[^\w]', '', s)
P = [e for e in d['places'] if e['tier'] in 'AB']; k = 0
for i, a in enumerate(P):
    for b in P[i + 1:]:
        dd = math.hypot(a['x'] - b['x'], a['z'] - b['z']); na, nb = n(a['name']), n(b['name'])
        if dd < 80 and (na == nb or (len(na) > 4 and len(nb) > 4 and (na in nb or nb in na))):
            k += 1; print(round(dd), '|', a['name'], a.get('osm'), a['sources'][:2], '|', b['name'], b.get('osm'), b['sources'][:2])
print(k, 'pairs')
