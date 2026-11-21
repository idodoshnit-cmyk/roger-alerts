#!/usr/bin/env python3
"""Generate docs/research/CENSUS.md from gk3/data/census.json + work/research-census/scale_audit.json + tools/census/report_static.tmpl."""
import sys, os, json, re, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import addr as ADDR
from shapely.geometry import Point
D = json.load(open(os.path.join(ROOT, 'gk3', 'data', 'census.json'), encoding='utf-8'))
PL = D['places']; CN = D['counts']
AM = ADDR.AddrModel()
SA = json.load(open(os.path.join(WORK, 'scale_audit.json'), encoding='utf-8')) if os.path.exists(os.path.join(WORK, 'scale_audit.json')) else None
STATIC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report_static.tmpl'), encoding='utf-8').read()
EN = {'Κασσαβέτη': 'Kassaveti', 'Λεβίδου': 'Levidou', 'Κολοκοτρώνη': 'Kolokotroni', 'Κυριαζή': 'Kyriazi', 'Κηφισίας': 'Kifisias Avenue', 'Πλατεία Πλατάνου': 'Platanos square',
      'Παναγίτσας': 'Panagitsas', 'Αργυροπούλου': 'Argyropoulou', 'Παπαδιαμάντη': 'Papadiamanti', 'Γεωργίου Δροσίνη': 'Drosini', 'Αγίων Θεοδώρων': 'Agion Theodoron',
      'Χαριλάου Τρικούπη': 'Charilaou Trikoupi', 'Όθωνος': 'Othonos', 'Αδριανού': 'Adrianou', 'Δηληγιάννη': 'Deligianni', 'Μιλτιάδου': 'Miltiadou', 'Κύπρου': 'Kyprou'}
def compass(dx, dz):
    a = math.degrees(math.atan2(dx, -dz)) % 360
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][int((a + 22.5) // 45) % 8]
def srcs(e):
    return '+'.join(sorted({s.split(':')[0].replace('overture', 'OVT').replace('osm', 'OSM').replace('fsq', 'FSQ').replace('web', 'WEB') for s in e['sources']}))
def esc(s): return (s or '').replace('|', '/')
def street_table(st, full=True):
    E = [e for e in PL if e['street'] == st]
    if not E: return []
    ax = AM.axis.get(st); rows = []
    for e in E:
        s = side = None
        if ax is not None:
            s = ax.project(Point(e['x'], e['z'])); q = ax.interpolate(s); side = compass(e['x'] - q.x, e['z'] - q.y) if q.distance(Point(e['x'], e['z'])) > 1 else ''
        rows.append((s or 0, e, side))
    rows.sort(key=lambda r: r[0])
    out = []
    if ax is not None:
        c = list(ax.coords); out.append(f"Walking order along the street axis, starting at its {compass(c[0][0] - c[-1][0], c[0][1] - c[-1][1])} end (game x,z ≈ {c[0][0]:.0f},{c[0][1]:.0f}) "
                                        f"towards the {compass(c[-1][0] - c[0][0], c[-1][1] - c[0][1])} end ({c[-1][0]:.0f},{c[-1][1]:.0f}); axis length {ax.length:.0f} m. 'm' = metres from the start; 'side' = which side of the street the facade is on.")
        out.append('')
    ab = [r for r in rows if r[1]['tier'] in 'AB']
    out += ['| m | no. | name (as on the sign) | Latin | category | side | tier | position | sources |', '|---|---|---|---|---|---|---|---|---|']
    for s, e, side in ab:
        nm = esc(e['name']); lt = esc(e['nameLatin']) if e['nameLatin'] != e['name'] else ''
        fl = '' if e['streetLevel'] is not False else ' (upper floor?)'
        ad = '' if e.get('streetFrom') == 'address' or e.get('osm') else '*'
        out.append(f"| {s:.0f} | {e['number'] or '–'}{ad} | {nm} | {lt} | {e['category']}{fl} | {side} | {e['tier']} | {e['posMethod']} ±{e['posErrM']:.0f} m | {srcs(e)} |")
    c = [r for r in rows if r[1]['tier'] == 'C']; x = [r for r in rows if r[1]['tier'] == 'X']
    if c: out += ['', f"Unconfirmed old listings on this street (tier C, {len(c)}; not to be built as open shops): " + '; '.join(f"{esc(e['name'])}{' (' + e['number'] + ')' if e['number'] else ''}" for s, e, _ in c) + '.']
    if x: out += ['', f"Reported closed (tier X, {len(x)}): " + '; '.join(f"{esc(e['name'])}{' (' + e['number'] + ')' if e['number'] else ''}" for s, e, _ in x) + '.']
    return out

L = []
def sub(m):
    k = m.group(1)
    if k == 'COUNTS':
        o = ['| measure | count |', '|---|---|']
        for a, b in (('all entries in the file', CN['total']), ('tier A (confirmed)', CN['tierA']), ('tier B (one fresh listing)', CN['tierB']), ('tier C (old / weak listing, existence unknown)', CN['tierC']), ('tier X (reported closed)', CN['tierX']),
                     ('**build set = tiers A + B**', CN['buildSet']), ('build set: entries that are not in OpenStreetMap', CN['buildSetNewVsOsm']), ('build set: likely street-level shopfronts', CN['buildSetStreetLevel']),
                     ('build set inside the `playable` polygon', CN['buildSetInPlayable'])):
            o.append(f'| {a} | {b} |')
        o += ['', 'Entries per source (an entry can have several): ' + ', '.join(f'{k} {v}' for k, v in CN['bySource'].items()) + '.', '',
              'Source combinations: ' + ', '.join(f'{k} {v}' for k, v in CN['bySourceCombination'].items()) + '.', '',
              'Position method (not-closed entries): ' + ', '.join(f'{k} {v}' for k, v in CN['byPosMethod'].items()) + '.']
        return '\n'.join(o)
    if k == 'CATS':
        ab = collections.Counter(e['category'] for e in PL if e['tier'] in 'AB')
        return ', '.join(f'{k} {v}' for k, v in ab.most_common())
    if k == 'VALID':
        V = D['positionValidation']; o = ['| what was compared with the OSM survey point of the same business | n | median | 75 % | 90 % |', '|---|---|---|---|---|']
        nm = {'raw:fsq': 'Foursquare coordinate as published', 'raw:overture': 'Overture coordinate as published', 'final:geocoded': 'census position, method "geocoded" (address on OSM house numbers)',
              'final:source': 'census position, method "source" (source coordinate snapped to a facade)', 'final:all': 'census position, all non-OSM methods'}
        for kk, lab in nm.items():
            if kk in V: o.append(f"| {lab} | {V[kk]['n']} | {V[kk]['median']} m | {V[kk]['p75']} m | {V[kk]['p90']} m |")
        L = V.get('geocoderLOO')
        if L:
            o.append(f"| geocoder leave-one-out: each OSM house-number point geocoded with itself removed (the honest test of method \"geocoded\") | {L['n']} | {L['median']} m | {L['p75']} m | {L['p90']} m |")
            o += ['', 'Geocoder leave-one-out per main street (median / max error, m): ' + ', '.join(
                f"{st} {L['perStreet'][st]['median']} / {L['perStreet'][st]['max']} (n {L['perStreet'][st]['n']})" for st in
                ('Κασσαβέτη', 'Λεβίδου', 'Κολοκοτρώνη', 'Κυριαζή', 'Κηφισίας', 'Αργυροπούλου') if st in L['perStreet']) + '.',
                  '', 'Odd and even house numbers are modelled as two independent sequences when a street has enough OSM numbers on each side '
                  '(Kifisias Avenue: odd numbers run about 30–40 ahead of the even numbers opposite; Kolokotroni similar). '
                  'Before this (versions up to 202611210845) the even numbers 244–256 of Kifisias Avenue were placed up to 380 m too far north.']
        return '\n'.join(o)
    if k == 'SCALE':
        if not SA: return '(scale audit not run yet)'
        s = SA['summary']; o = [open(os.path.join(WORK, 'scale_audit.md'), encoding='utf-8').read(), '',
             f"- Survey points checked against the shipped map: {s['vertexResidual']['points']} (street junction nodes and named-building corners inside the play area); "
             f"{s['vertexResidual']['within8cm']} of them have a game vertex within 8 cm (median {s['vertexResidual']['medianM']} m, max {s['vertexResidual']['maxM']} m = the 0.1 m coordinate grid).",
             f"- Maximum relative error over the 20 pairs: {s['maxAbsRelErrPct']} % (a {SA['rows'][[abs(r['relErrPct']) for r in SA['rows']].index(s['maxAbsRelErrPct'])]['geodesicM']:.0f} m pair; rounding noise). "
             f"Pairs of 100 m or more: {s['maxAbsRelErrPct_pairsOver100m']} %. Projection formula alone (no rounding): {s['maxAbsRelErrPct_projectionOnly']} %.",
             f"- Exact WGS84 scale at the origin latitude: east–west {s['kxTrueAtOrigin']} m per degree of longitude (the game uses {s['kxUsed']:.0f}: {s['kxErrPct']} %), "
             f"north–south {s['kzTrueAtOrigin']} m per degree of latitude (the game uses {s['kzUsed']:.0f}: {s['kzErrPct']} %). "
             f"Across the map's latitude range the true east–west factor varies only from {s['kxTrueAtNorthEdge']} to {s['kxTrueAtSouthEdge']}."]
        return '\n'.join(o)
    if k == 'MAIN_STREETS':
        o = []
        for st in ('Κασσαβέτη', 'Λεβίδου', 'Κολοκοτρώνη', 'Κυριαζή', 'Κηφισίας', 'Πλατεία Πλατάνου'):
            n = sum(1 for e in PL if e['street'] == st and e['tier'] in 'AB')
            o += [f"### {EN.get(st, st)} ({st}) — {n} businesses in the build set", ''] + street_table(st) + ['']
        return '\n'.join(o)
    if k == 'OTHER_STREETS':
        cnt = collections.Counter(e['street'] for e in PL if e['tier'] in 'AB' and e['street'])
        o = []
        for st, n in cnt.most_common():
            if st in ('Κασσαβέτη', 'Λεβίδου', 'Κολοκοτρώνη', 'Κυριαζή', 'Κηφισίας', 'Πλατεία Πλατάνου'): continue
            if n >= 4:
                o += [f"### {EN.get(st) or translit(st)} ({st}) — {n}", ''] + street_table(st) + ['']
        small = [(st, n) for st, n in cnt.most_common() if n < 4]
        o += ['### Streets with fewer than 4 build-set entries', '', '| street | entries |', '|---|---|']
        for st, n in small:
            o.append(f"| {translit(st)} ({st}) | " + '; '.join(f"{esc(e['name'])}{' ' + e['number'] if e['number'] else ''} [{e['category']}, {e['tier']}]" for e in PL if e['street'] == st and e['tier'] in 'AB') + ' |')
        return '\n'.join(o)
    if k == 'HOLES':
        cnt = collections.Counter(e['street'] for e in PL if e['tier'] in 'AB')
        nonum = collections.Counter(e['street'] for e in PL if e['tier'] in 'AB' and not e['number'])
        o = ['| street | build-set entries | without a house number | position from OSM | geocoded | source coordinate only |', '|---|---|---|---|---|---|']
        for st, n in cnt.most_common(14):
            E = [e for e in PL if e['street'] == st and e['tier'] in 'AB']
            o.append(f"| {EN.get(st) or translit(st or '?')} | {n} | {nonum[st]} | {sum(1 for e in E if e.get('osm'))} | {sum(1 for e in E if e['posMethod'] == 'geocoded')} | {sum(1 for e in E if e['posMethod'] == 'source' and not e.get('osm'))} |")
        return '\n'.join(o)
    if k == 'VERSION': return f"{D['version']} (generated {D['generated']})"
    return m.group(0)
txt = re.sub(r'\{\{(\w+)\}\}', sub, STATIC)
os.makedirs(os.path.join(ROOT, 'docs', 'research'), exist_ok=True)
open(os.path.join(ROOT, 'docs', 'research', 'CENSUS.md'), 'w', encoding='utf-8').write(txt)
print('CENSUS.md', len(txt), 'chars', txt.count('\n'), 'lines')
