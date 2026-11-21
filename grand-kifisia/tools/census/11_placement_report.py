"""Writes docs/research/PLACEMENT_AUDIT.md from gk3/data/placement_audit.json + work/research-census/placement/audit_tables.json.
Usage: python3 tools/census/11_placement_report.py   (run 09_placement_audit.py and 10_placement_plot.py first)"""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

A = json.load(open(os.path.join(ROOT, 'gk3', 'data', 'placement_audit.json'), encoding='utf-8'))
T = json.load(open(os.path.join(WORK, 'placement', 'audit_tables.json'), encoding='utf-8'))
M = json.load(open(os.path.join(ROOT, A['map']), encoding='utf-8'))
TPL = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'placement_static.tmpl'), encoding='utf-8').read()
S = A['summary']; signs = A['signs']
BAD = ['DUPLICATE', 'WRONG_SIDE', 'WRONG_STREET', 'WRONG_BUILDING', 'SHIFTED', 'CLOSED']
LAT = {'Κασσαβέτη': 'Kassaveti', 'Λεβίδου': 'Levidou', 'Κυριαζή': 'Kyriazi', 'Κολοκοτρώνη': 'Kolokotroni', 'Κηφισίας': 'Kifisias Avenue',
       'Πλατεία Πλατάνου': 'Platanos square', 'Αργυροπούλου': 'Argyropoulou', 'Όθωνος': 'Othonos', 'Δηληγιάννη': 'Deligianni'}

def esc(s):
    return str(s if s is not None else '').replace('|', '/').replace('\n', ' ')

def verdict(fl):
    b = [f for f in BAD if f in fl]
    if b: return '**' + ' + '.join(b) + '**'
    if 'UNVERIFIED' in fl: return 'unverified'
    if 'MISSING' in fl: return '**MISSING in game**'
    extra = [f for f in fl if f in ('SINGLE_LISTING', 'ON_OSM_BAY')]
    return 'ok' + (' (' + ', '.join(f.lower() for f in extra) + ')' if extra else '')

def n_bad(rows):
    return sum(1 for r in rows if r['type'] == 'game' and any(f in r['flags'] for f in BAD))

out = []
P = out.append
def metrics(AU):
    sg = AU['signs']; Su = AU['summary']
    osm_ = [s for s in sg if s['truth'] and s['truth']['kind'] == 'osm' and 'DUPLICATE' not in s['flags']]
    dl_ = sorted(s['delta'] for s in osm_ if s['delta'] is not None)
    f_ = collections.Counter(f for s in sg for f in s['flags'])
    nb = sum(1 for s in sg if any(f in s['flags'] for f in BAD))
    o4 = sum(1 for s in osm_ if any(f in s['flags'] for f in ('WRONG_SIDE', 'WRONG_BUILDING', 'SHIFTED')))
    return dict(signs=len(sg), nbad=nb, pbad=round(100 * nb / max(1, len(sg))), dup=f_['DUPLICATE'], side=f_['WRONG_SIDE'], street=f_['WRONG_STREET'],
                bld=f_['WRONG_BUILDING'], shift=f_['SHIFTED'], closed=f_['CLOSED'], squat=f_['ON_OSM_BAY'], single=f_['SINGLE_LISTING'], unver=f_['UNVERIFIED'],
                missing=Su['missing'], nosm=len(dl_), osm4=o4, osmmed=dl_[len(dl_) // 2] if dl_ else '–', osmp90=dl_[int(len(dl_) * 0.9)] if dl_ else '–')
ctx = metrics(A)
BEF = os.path.join(WORK, 'placement', 'before_0850.json')
if os.path.exists(BEF):
    for k, v in metrics(json.load(open(BEF, encoding='utf-8'))).items(): ctx['b_' + k] = v
ctx.update(generated=A['generated'], mapgen=M['meta']['generated'], mapcensus=M['meta']['sources'].get('census'), census=A['version'].split('-')[0],
           taddr=S['truth'].get('address', 0), tsingle=S['truth'].get('single', 0), tosm=S['truth'].get('osm', 0), tnone=S['truth'].get('none', 0))
# remaining problems, grouped by game building -> truth building
grp = collections.defaultdict(list)
for s_ in signs:
    b_ = [f for f in BAD if f in s_['flags']]
    if not b_: continue
    grp[(s_['game']['b'], (s_.get('tf') or {}).get('b'), s_['street'])].append(s_)
rem = []
if grp:
    rem.append('| game building → real building | street | signs | misplaced signs (Δ m, truth kind) |')
    rem.append('|---|---|---:|---|')
    for (gb, tb, st), L_ in sorted(grp.items(), key=lambda kv: -len(kv[1])):
        items = ', '.join(f"{esc(s_['name'])[:28]} ({s_['delta'] if s_['delta'] is not None else '–'}, {s_['truth']['kind'] if s_['truth'] else 'none'}{', ' + '/'.join(f.lower() for f in BAD if f in s_['flags'] and f not in ('SHIFTED', 'WRONG_BUILDING')) if any(f in s_['flags'] for f in ('WRONG_SIDE', 'WRONG_STREET', 'DUPLICATE', 'CLOSED')) else ''})" for s_ in sorted(L_, key=lambda s_: -(s_['delta'] or 0)))
        rem.append(f"| b{gb} → b{tb} | {LAT.get(st, esc(st) or '–')} | {len(L_)} | {items} |")
else:
    rem.append('None.')
ctx['remaining'] = '\n'.join(rem)
acc = []
for k_, lab in (('dup', 'DUPLICATE'), ('side', 'WRONG_SIDE'), ('street', 'WRONG_STREET'), ('closed', 'CLOSED')):
    acc.append(f"{lab} {ctx[k_]} {'(met)' if ctx[k_] == 0 else '(NOT met)'}")
acc.append(f"OSM > 4 m {ctx['osm4']} of {ctx['nosm']}")
ctx['accept'] = '; '.join(acc)
big = sorted(grp.items(), key=lambda kv: -len(kv[1]))[:3]
vb = (f"**Now:** {ctx['signs']} signs, {ctx['nbad']} ({ctx['pbad']} %) still misplaced. "
      f"Duplicates {ctx.get('b_dup','?')} → {ctx['dup']}, wrong side {ctx.get('b_side','?')} → {ctx['side']}, wrong street {ctx.get('b_street','?')} → {ctx['street']}, "
      f"OSM shops more than 4 m off {ctx.get('b_osm4','?')} → {ctx['osm4']} (median {ctx['osmmed']} m). ")
if big:
    vb += 'The remaining misplacements are concentrated on a few crowded blocks: ' + '; '.join(
        f"b{gb}→b{tb} ({LAT.get(st, st or '?')}, {len(L_)} signs)" for (gb, tb, st), L_ in big) + ' — see section 4. '
vb += (f"{ctx['missing']} real businesses (OSM-named shops or verified addresses) have no sign (section 9). "
       f"The sign count fell from {ctx.get('b_signs','?')} to {ctx['signs']} because Overture-only records without a verified address are no longer built (ORDERS item 16 rule); "
       "growing the verified set (more directory evidence) is how the count comes back up without guessing.")
ctx['verdict_now'] = vb
head = TPL
for k, v in ctx.items(): head = head.replace('{{' + k + '}}', str(v))
P(head)

# ---- owner-named shops
P('\n## 6. The owner-named shops\n')
P('| shop | game sign (x, z) | building | real position source | Δ m | verdict |')
P('|---|---|---|---|---|---|')
want = ['sephora', 'starbucks', 'paul', 'super', 'kfc', 'mythos']
named = ['Ralph Lauren', 'Hondos', 'Zara', 'Kotsovolos', 'Κωτσόβολος', 'Massimo', 'Tsantilis', 'Τσανταλής', 'Mikel', 'Alpha Bank', 'Everest', 'Goody', 'Gap', 'Sugarfree']
for s in signs:
    q = M['pois'][s['qi']]
    if q.get('special') in want or any(n.lower() in (s['name'] or '').lower() for n in named):
        if q.get('special'): pass
        elif not any(f in s['flags'] for f in BAD) and (s['street'] not in LAT): continue
        tr = s['truth']
        src = (tr['kind'] + (' ' + (s['osm'] or '') if tr['kind'] == 'osm' else ' ' + esc(tr.get('street')) + ' ' + esc(tr.get('number')))) if tr else 'none'
        P(f"| {esc(s['name'])}{' (special ' + q['special'] + ')' if q.get('special') else ''} | {s['game']['fx']:.1f}, {s['game']['fz']:.1f} | b{s['game']['b']} | {src} | {s['delta'] if s['delta'] is not None else '–'} | {verdict(s['flags'])} |")

# ---- per street tables = per-shop verification (OWNER DIRECTIVE 13:05)
P('\n## 7. Per-shop verification, street by street (OWNER DIRECTIVE 13:05: "go one by one")\n')
P('Every shop sign in the core streets, plus every real business without a sign and every sign removed since the 08:50 map. One table per side of the street, rows in **real order** '
  '(`s` = metres along the OSM street axis; real position carried to its facade). `game #` = rank of the sign in the game\'s order on that side (a non-monotone column = an order swap). '
  'Address source: [web] = the shop\'s own site / brand store locator, [vrisko.gr] = Greek yellow-pages listing, OSM = surveyed by OpenStreetMap mappers, Foursquare / Overture = open place datasets '
  '(Overture sub-source in brackets). No Google Maps / Street View data is used.\n')
P('**Status**: `verified` = drawn where the cited sources put it (OSM within 4 m of its shopfront, or a verified address within its error on the right building, street and side); '
  '`verified (moved)` = was misplaced in the 08:50 map and is right now; `misplaced → move` = still wrong (move to the real x, z); `unverified (weak listing)` = census tier B (one fresh listing, or sources that do not confirm each other), drawn on free frontage; '
  '`missing → add` = real (OSM or verified address) but no sign; `removed (…)` = was drawn in the 08:50 map, not any more (duplicate / closed / no listing / single listing) — '
  '`removed (VERIFIED - should be rebuilt)` means the removal was wrong.\n')
stc = collections.Counter(r['status'] for t in T['tables'].values() for r in t['rows'])
P('| status | rows |'); P('|---|---:|')
for k_, v_ in stc.most_common(): P(f'| {k_} | {v_} |')
P('')
for st in ['Κασσαβέτη', 'Λεβίδου', 'Κυριαζή', 'Κολοκοτρώνη', 'Αργυροπούλου', 'Κηφισίας', 'Πλατεία Πλατάνου', 'Όθωνος', 'Δηληγιάννη']:
    t = T['tables'].get(st)
    if not t: continue
    rows = t['rows']
    sc = collections.Counter(r['status'].split(' (')[0].split(' →')[0] for r in rows)
    P(f"### {LAT[st]} ({st}) — {sum(r['type']=='game' for r in rows)} signs: " + ', '.join(f'{v} {k}' for k, v in sc.most_common()) +
      f"; order swaps among precisely-known signs: {t['inversions']} of {t['pairs']} pairs\n")
    for sk in (1, -1):
        R = [r for r in rows if (r.get('sideKeyReal') if r.get('sideKeyReal') is not None else r['sideKey']) == sk]
        if not R: continue
        comp = collections.Counter(r.get('sideReal') or r.get('sideGame') for r in R).most_common(1)[0][0]
        par = collections.Counter(r.get('parReal') or r.get('parGame') for r in R).most_common(1)[0][0]
        P(f"**{comp} side** ({par or '?'} numbers)\n")
        G_ = sorted([r for r in R if r['type'] == 'game'], key=lambda r: r['sGame'])
        grank = {id(r): i + 1 for i, r in enumerate(G_)}
        R.sort(key=lambda r: r['sReal'] if r.get('sReal') is not None else r.get('sGame', 0))
        P('| s | No. | shop | address source | game # | game x, z | real x, z | Δ m | status |')
        P('|---:|---|---|---|---:|---|---|---:|---|')
        for r in R:
            sv = r['sReal'] if r.get('sReal') is not None else r.get('sGame', '')
            gxz = f"{r['fx']:.1f}, {r['fz']:.1f}" if r.get('fx') is not None and r['type'] != 'missing' else '–'
            rxz = f"{r['tfx']:.1f}, {r['tfz']:.1f}" if r.get('tfx') is not None else '–'
            gr = grank.get(id(r), '–')
            st_ = r['status']
            if st_.startswith(('misplaced', 'missing', 'removed (VERIFIED')): st_ = '**' + st_ + '**'
            P(f"| {sv} | {esc(r.get('number'))} | {esc(r['name'])} | {r.get('cite') or '–'} | {gr} | {gxz} | {rxz} | {r['delta'] if r.get('delta') is not None else ''} | {st_} |")
        P('')

# ---- duplicates list
P('\n## 8. Duplicate signs (same business drawn twice)\n')
P('| duplicate sign (id) | game x, z | real place is the sign | distance to the real place m |')
P('|---|---|---|---:|')
for s in sorted([s for s in signs if 'DUPLICATE' in s['flags']], key=lambda s: -(s['delta'] or 0)):
    P(f"| {esc(s['name'])} ({s['id'][:22]}) | {s['game']['fx']:.1f}, {s['game']['fz']:.1f} | {s.get('dupOf','')} | {s['delta'] if s['delta'] is not None else ''} |")

P('\n## 9. Real businesses with no game sign\n')
P('| kind | id | name | street no. | truth facade (x, z) |')
P('|---|---|---|---|---|')
for m in A['missing']:
    tf = m.get('tf') or {}
    P(f"| {m['kind']} | {m['id']} | {esc(m['name'])} | {esc(m.get('street'))} {esc(m.get('number'))} | {tf.get('fx', m['x'])}, {tf.get('fz', m['z'])} |")

B0 = '<!-- BEGIN Part A (research-census, generated by tools/census/11_placement_report.py: do not edit inside; other agents write their sections outside these markers) -->'
B1 = '<!-- END Part A (research-census) -->'
OLDMARK = '<!-- BEGIN sections by other agents (kept verbatim by 11_placement_report.py; append below this line) -->'
DOC = os.path.join(ROOT, 'docs', 'research', 'PLACEMENT_AUDIT.md')
before_txt, after_txt = '', '\n'
if os.path.exists(DOC):
    old_ = open(DOC, encoding='utf-8').read()
    if B0 in old_ and B1 in old_:
        before_txt = old_[:old_.index(B0)]; after_txt = old_[old_.index(B1) + len(B1):]
    elif OLDMARK in old_:
        after_txt = '\n' + old_[old_.index(OLDMARK) + len(OLDMARK):].lstrip('\n')
    else:
        # unknown layout (another agent rewrote the file): keep everything that is not our old generated text below our block
        k = old_.find('\n## B')
        after_txt = '\n' + (old_[k + 1:] if k >= 0 else '')
open(DOC, 'w', encoding='utf-8').write(before_txt + B0 + '\n' + '\n'.join(out) + '\n' + B1 + after_txt)
print('wrote', DOC)
