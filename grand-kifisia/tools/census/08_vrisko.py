#!/usr/bin/env python3
"""Harvest vrisko.gr (Greek yellow pages) category listings for Kifisia.
robots.txt (checked 2026-11-21) allows /dir/ for all agents. One request every 3 s, raw HTML cached in work/research-census/raw/vrisko/.
Parses the schema.org JSON-LD ItemList on each page (name, streetAddress, locality, telephone, geo).
Usage: 08_vrisko.py slug [slug ...]   (pages already cached are not fetched again)
Writes work/research-census/raw/vrisko/vrisko_items.json (all items ever parsed, deduplicated by @id)."""
import sys, os, re, json, time, subprocess, math
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
D = os.path.join(ROOT, 'work', 'research-census', 'raw', 'vrisko')
os.makedirs(D, exist_ok=True)
OUT = os.path.join(D, 'vrisko_items.json')
items = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}

def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 5000: return open(path, encoding='utf-8', errors='replace').read()
    time.sleep(3)
    r = subprocess.run(['curl', '-s', '-m', '30', '-A', 'Mozilla/5.0', '-o', path, '-w', '%{http_code}', url], capture_output=True, text=True)
    if r.stdout.strip() != '200':
        print('  HTTP', r.stdout.strip(), url); 
        if os.path.exists(path): os.remove(path)
        return None
    return open(path, encoding='utf-8', errors='replace').read()

def parse(h, slug):
    out = []
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try: j = json.loads(m.group(1))
        except Exception: continue
        js = j if isinstance(j, list) else (j.get('@graph') or [j])
        for j in js:
            if j.get('@type') != 'ItemList': continue
            for li in j.get('itemListElement', []):
                it = li.get('item') or {}
                ad = it.get('address') or {}
                geo = (it.get('location') or {}).get('geo') or {}
                out.append(dict(id=it.get('@id'), type=it.get('@type'), name=it.get('name'), desc=(it.get('description') or '')[:300],
                                street=ad.get('streetAddress'), locality=ad.get('addressLocality'), postcode=ad.get('postalCode'),
                                phone=it.get('telephone'), url=it.get('url'), lat=float(geo['latitude']) if geo.get('latitude') else None,
                                lon=float(geo['longitude']) if geo.get('longitude') else None, sponsored='/advdetails/' in (it.get('@id') or ''), slug=slug))
    return out

for slug in sys.argv[1:]:
    page = 1; total = None; got = 0
    while True:
        url = f'https://www.vrisko.gr/dir/{slug}/kifisia/' + (f'?page={page - 1}' if page > 1 else '')  # the site's pager is 0-based after page 1
        h = fetch(url, os.path.join(D, f'{slug}_p{page}.html'))
        if h is None: break
        if total is None:
            m = re.search(r'mainCountResultsTitle"> : (\d+)', h); total = int(m.group(1)) if m else 0
        L = parse(h, slug)
        org = [x for x in L if not x['sponsored']]
        for x in L:
            k = x['id'] or (x['name'] + str(x['street']))
            if k in items:
                if slug not in items[k]['slugs']: items[k]['slugs'].append(slug)
            else:
                x['slugs'] = [slug]; items[k] = x
        got += len(L)
        if not org or got >= total or page >= 30: break
        page += 1
    print(slug, 'total', total, 'parsed', got, 'pages', page)
    json.dump(items, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('items', len(items))
