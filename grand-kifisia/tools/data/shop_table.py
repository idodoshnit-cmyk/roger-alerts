#!/usr/bin/env python3
"""Grand Kifisia - per-shop verification table (OWNER DIRECTIVE 13:05 "verify shops one by one"), team:data.
Every business on the core streets, built or not, with: name | street + number | address source | game x,z | real x,z | delta m | status.
Usage: python3 tools/data/shop_table.py MAP.json OUT.md
  real x,z : OSM-surveyed point (OSM), the verified address position (census), or the listing coordinate (not built)
  game x,z : centre of the shopfront bay / name plate the map tells the renderer to build
  delta    : distance ALONG the facade between the real point (projected onto the bay's facade line) and the bay, 0 when the bay covers it
             (the perpendicular part is the shop point's depth inside the building and is not an error)
  status   : verified (OSM survey | address exact | address interpolated | two-source listing) / moved (built > 4 m along the facade from its real point) /
             removed (closed, duplicate) / unverified (no verifiable address: not built)
"""
import json, math, re, sys, collections, unicodedata
ROOT = '/tmp/claude-0/-home-user-roger-alerts/1b3b0d86-8923-5c5e-87ff-3268c67302f8/scratchpad'
M = json.load(open(sys.argv[1])); OUT = sys.argv[2]
C = {c['id']: c for c in json.load(open(ROOT + '/gk3/data/census.json'))['places']}
names = M['names']
CORE = ['Κασσαβέτη', 'Λεβίδου', 'Κυριαζή', 'Κολοκοτρώνη', 'Αργυροπούλου', 'Κηφισίας', 'Πλατεία Πλατάνου', 'Όθωνος', 'Δηληγιάννη']
LAT = {'Κασσαβέτη': 'Kassaveti', 'Λεβίδου': 'Levidou', 'Κυριαζή': 'Kyriazi', 'Κολοκοτρώνη': 'Kolokotroni', 'Αργυροπούλου': 'Argyropoulou', 'Κηφισίας': 'Kifisias Ave',
       'Πλατεία Πλατάνου': 'Platanos square', 'Όθωνος': 'Othonos', 'Δηληγιάννη': 'Deligianni'}
def sa(s): return ''.join(c for c in unicodedata.normalize('NFD', s or '') if unicodedata.category(c) != 'Mn').lower()
def core_of(st):
    a = sa(st)
    for c in CORE:
        if sa(c) in a or (c == 'Κηφισίας' and 'kifis' in a) or (c == 'Λεβίδου' and 'levidou' in a) or (c == 'Κασσαβέτη' and 'kassavet' in a) or (c == 'Κολοκοτρώνη' and 'kolokotron' in a) \
           or (c == 'Αργυροπούλου' and 'argyropoul' in a) or (c == 'Κυριαζή' and 'kyriaz' in a) or (c == 'Όθωνος' and 'othonos' in a) or (c == 'Δηληγιάννη' and 'deligian' in a): return c
    return None
def hn(v):
    m = re.match(r'^\s*(\d+)', str(v or '')); return int(m.group(1)) if m else 9999
def srcs(c):
    out = []
    for s in (c or {}).get('sources') or []:
        k = str(s).split(':')[0]
        out.append({'fsq': 'Foursquare OS Places', 'overture': 'Overture', 'vrisko': 'vrisko.gr', 'osm': 'OSM', 'web': 'web/official site'}.get(k, k))
    return ', '.join(sorted(set(out)))
def along(q):
    """delta along the facade between the real point and the bay"""
    if q.get('fx') is None: return None
    ux, uz = -(q.get('nz') or 0), (q.get('nx') or 0)
    s = (q['x'] - q['fx']) * ux + (q['z'] - q['fz']) * uz
    return max(0.0, abs(s) - (q.get('w') or 0) / 2)
rows = []
for q in M['pois']:
    st = core_of(q.get('street') or '') or (core_of(names[q['facing']]) if q.get('facing') is not None and q['facing'] >= 0 else None)
    if not st or not q.get('focus'): continue
    if q.get('bay') == 'area': continue
    c = C.get(q.get('census'))
    if q['src'] in ('osm', 'address') or q['id'].startswith('special:'):
        src = 'OSM survey (%s)' % (q.get('osm') or q['id']).replace('osm:', '') if (q['src'] == 'osm' or q.get('osm')) else 'address (%s)' % (q.get('posMethod') or 'research')
        if q['id'] == 'special:sephora': src = 'address Levidou 8 (Overture + census web source; even = east side by OSM house-number parity)'
        if c and srcs(c): src += '; also ' + srcs(c)
        how = 'OSM survey'
    else:
        src = srcs(c) or 'census'; how = {'address-exact': 'address = surveyed OSM number', 'address-interp': 'address interpolated between surveyed numbers', 'address-listings': 'two-source listing on its street'}.get(q.get('posMethod'), q.get('posMethod') or '')
    d = along(q) if q.get('bay') == 'shop' else None
    bay = q.get('bay')
    if bay == 'shop': status = ('verified (%s)' % how) if d is not None and d <= 4 else 'moved %.1f m along the facade (crowded frontage; %s)' % (d or 0, how)
    elif bay == 'directory': status = 'verified (%s), name on the building directory board (frontage full)' % how
    elif bay == 'plate': status = 'verified (%s), door plate (upper floor / office)' % how
    elif bay == 'building': status = 'verified (%s), sign over the building entrance' % how
    else: status = 'verified (%s), free-standing (%s)' % (how, bay)
    rows.append((st, hn(q.get('number')), q['name'] or q['cat'], '%s %s' % (LAT[st], q.get('number') or ''), src,
                 '%.1f, %.1f' % (q['fx'], q['fz']) if q.get('fx') is not None else '-', '%.1f, %.1f' % (q['x'], q['z']), '%.1f' % d if d is not None else '', status))
    for dup in q.get('dups', []):
        rows.append((st, hn(q.get('number')), q['name'], '%s %s' % (LAT[st], q.get('number') or ''), dup.replace('osm:', 'OSM '), '-', '', '', 'removed (duplicate of %s, same name < 60 m)' % q['id'].replace('osm:', '')))
A = M['meta'].get('audit', {})
for x in A.get('censusUnbuilt', []):
    st = core_of(x.get('street') or '')
    if not st: continue
    c = C.get(x.get('id')) or {}
    if not c.get('inFocus', True): continue
    rows.append((st, hn(x.get('number')), x['name'], '%s %s' % (LAT[st], x.get('number') or ''), srcs(c) or 'census', '-', '%.1f, %.1f' % (x['x'], x['z']) if x.get('x') is not None else '', '',
                 'unverified, not built: ' + x['why']))
for c in C.values():
    st = core_of(c.get('street') or '')
    if not st or not c.get('inFocus'): continue
    if c.get('tier') == 'X' or c.get('open') is False:
        rows.append((st, hn(c.get('number')), c['name'], '%s %s' % (LAT[st], c.get('number') or ''), srcs(c), '-', '%.1f, %.1f' % (c['x'], c['z']), '', 'removed (reported closed, census tier X)'))
    elif c.get('tier') == 'C':
        rows.append((st, hn(c.get('number')), c['name'], '%s %s' % (LAT[st], c.get('number') or ''), srcs(c), '-', '%.1f, %.1f' % (c['x'], c['z']), '', 'unverified (old/weak listing, census tier C): not built'))
for x in A.get('overtureUnbuilt', []):
    st = core_of(x.get('addr') or '')
    if not st: continue
    rows.append((st, hn(re.sub(r'^\D*', '', x.get('addr') or '')), x['name'], x.get('addr') or '', 'Overture only (confidence %.2f)' % (x.get('conf') or 0), '-', '%.1f, %.1f' % (x['x'], x['z']), '',
                 'unverified (Overture only, no census confirmation): not built'))
rows.sort(key=lambda r: (CORE.index(r[0]), r[1], r[2]))
cnt = collections.Counter(r[8].split(' (')[0].split(',')[0].split(' ')[0] for r in rows)
md = ['## D. Per-shop verification table (team:data, generated by tools/data/shop_table.py from the integrated map)', '',
      'Every business on the core streets (Kassaveti, Levidou, Kyriazi, Kolokotroni, Argyropoulou, Kifisias Ave, Platanos square, Othonos, Deligianni) inside the play area, built or not. '
      '`real x,z` = OSM-surveyed point, or the verified address position (census), or the listing coordinate (not built). `game x,z` = the bay / plate the renderer builds. '
      '`delta` = distance along the facade between the real point and the shopfront bay (0 when the bay covers it). Totals: ' + ', '.join('%s %d' % kv for kv in cnt.most_common()) + '.', '']
for st in CORE:
    rs = [r for r in rows if r[0] == st]
    if not rs: continue
    md += ['### %s (%s) — %d entries' % (LAT[st], st, len(rs)), '', '| name | street no. | address source | game x,z | real x,z | delta m | status |', '|---|---|---|---|---|---|---|']
    for r in rs: md.append('| ' + ' | '.join(str(v).replace('|', '/') for v in r[2:]) + ' |')
    md.append('')
open(OUT, 'w').write('\n'.join(md) + '\n')
print(len(rows), dict(cnt))
