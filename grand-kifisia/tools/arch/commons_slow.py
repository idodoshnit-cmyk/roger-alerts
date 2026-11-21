"""Slow, polite Wikimedia Commons crawler for Kifisia building photos (research-arch).
- >= 12 s between API requests, 240 s back-off when the API says we are rate limited; honest UA, no login.
- Stage 'list': geosearch tiles + full-text search + category members -> work/research-arch/commons_titles.json
- Stage 'info': imageinfo (thumb url 1280, licence, artist, coords, categories) for titles in a list file -> commons_info.json
- Stage 'get' : download thumbnails for titles listed in work/research-arch/want.txt into docs/research/img/arch/commons/
Usage: python3 -I commons_slow.py list|info|get
"""
import json, os, sys, time, re, urllib.request, urllib.parse, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WD = os.path.join(ROOT, 'work', 'research-arch')
UA = 'GrandKifisiaResearchBot/1.0 (non-commercial offline game research; python urllib)'
API = 'https://commons.wikimedia.org/w/api.php'
GAP = 12

_last = [0.0]
def api(**q):
    q['format'] = 'json'
    url = API + '?' + urllib.parse.urlencode(q)
    for attempt in range(8):
        w = GAP - (time.time() - _last[0])
        if w > 0: time.sleep(w)
        _last[0] = time.time()
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60).read().decode('utf8', 'replace')
            if 'too many requests' in raw.lower() and not raw.lstrip().startswith('{'):
                print('rate limited, sleeping', flush=True); time.sleep(240); continue
            return json.loads(raw)
        except Exception as ex:
            print('err', ex, flush=True); time.sleep(120 if '429' in str(ex) else 30)
    return {}

def load(name, default):
    p = os.path.join(WD, name)
    return json.load(open(p)) if os.path.exists(p) else default
def save(name, obj):
    json.dump(obj, open(os.path.join(WD, name), 'w'), ensure_ascii=False, indent=0)

def stage_list():
    T = load('commons_titles.json', {'done': [], 'titles': {}})
    for t, v in load('commons_geo.json', {}).items(): T['titles'].setdefault(t, {'lat': v['lat'], 'lon': v['lon'], 'via': 'geo'})
    W, E, S, N = 23.798, 23.832, 38.064, 38.083
    jobs = []
    for i in range(4):
        for j in range(3):
            w = W + (E - W) * i / 4; e = W + (E - W) * (i + 1) / 4; s = S + (N - S) * j / 3; n = S + (N - S) * (j + 1) / 3
            jobs.append(('geo%d%d' % (i, j), dict(action='query', list='geosearch', gsbbox=f'{n}|{w}|{s}|{e}', gsnamespace=6, gslimit=500)))
    for term in ['Κηφισιά', 'Κηφισιάς', 'Kifisia', 'Kifissia', 'Kifisias Avenue', 'Κεφαλάρι']:
        jobs.append(('s:' + term, dict(action='query', list='search', srsearch=term, srnamespace=6, srlimit=500)))
    for cat in ['Kifisia', 'Buildings in Kifisia', 'Neoclassical architecture in Kifisia', 'Villas in Kifisia', 'Streets in Kifisia',
                'Kifisia metro station', 'Churches in Kifisia', 'Kefalari', 'Platanos Square (Kifisia)']:
        jobs.append(('c:' + cat, dict(action='query', list='categorymembers', cmtitle='Category:' + cat, cmlimit=500, cmtype='file|subcat')))
    for key, q in jobs:
        if key in T['done']: continue
        r = api(**q)
        if not r: print('fail', key); continue
        qq = r.get('query', {})
        n = 0
        for x in qq.get('geosearch', []):
            T['titles'].setdefault(x['title'], {'lat': x['lat'], 'lon': x['lon'], 'via': key}); n += 1
        for x in qq.get('search', []):
            T['titles'].setdefault(x['title'], {'via': key}); n += 1
        for x in qq.get('categorymembers', []):
            if x['ns'] == 6: T['titles'].setdefault(x['title'], {'via': key}); n += 1
            elif x['ns'] == 14: T.setdefault('subcats', []).append(x['title'])
        T['done'].append(key); save('commons_titles.json', T)
        print(key, n, len(T['titles']), flush=True)

def stage_info():
    T = load('commons_titles.json', {'titles': {}})
    I = load('commons_info.json', {})
    want = [t for t in T['titles'] if t not in I and re.search(r'\.(jpe?g|png|tiff?|webp)$', t, re.I)]
    sel = os.path.join(WD, 'info_want.txt')
    if os.path.exists(sel): want = [l.strip() for l in open(sel) if l.strip() and l.strip() not in I]
    for k in range(0, len(want), 40):
        batch = want[k:k + 40]
        r = api(action='query', prop='imageinfo|coordinates|categories', titles='|'.join(batch), iiprop='url|extmetadata|size',
                iiurlwidth=1280, iiextmetadatafilter='LicenseShortName|Artist|ImageDescription|DateTimeOriginal', cllimit=500, colimit=500)
        for p in r.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {})
            I[p['title']] = dict(thumb=ii.get('thumburl'), url=ii.get('descriptionurl'), w=ii.get('width'), h=ii.get('height'),
                                 lic=em.get('LicenseShortName', {}).get('value'), artist=re.sub('<[^>]+>', '', em.get('Artist', {}).get('value', ''))[:120],
                                 desc=re.sub('<[^>]+>', '', em.get('ImageDescription', {}).get('value', ''))[:300], date=em.get('DateTimeOriginal', {}).get('value'),
                                 coord=[(c['lat'], c['lon']) for c in p.get('coordinates', [])][:1], cats=[c['title'][9:] for c in p.get('categories', [])])
        save('commons_info.json', I); print('info', k + len(batch), '/', len(want), flush=True)

def stage_get():
    I = load('commons_info.json', {})
    out = os.path.join(ROOT, 'docs', 'research', 'img', 'arch', 'commons'); os.makedirs(out, exist_ok=True)
    for l in open(os.path.join(WD, 'want.txt')):
        t = l.strip()
        if not t or t not in I or not I[t].get('thumb'): continue
        base = re.sub(r'[^0-9A-Za-zΑ-Ωα-ωάέήίόύώϊϋΐΰΆΈΉΊΌΎΏ_.-]+', '_', t[5:])[:80]
        fn = os.path.join(out, base if base.lower().endswith(('.jpg', '.jpeg', '.png')) else base + '.jpg')
        if os.path.exists(fn): continue
        for attempt in range(4):
            try:
                time.sleep(6)
                data = urllib.request.urlopen(urllib.request.Request(I[t]['thumb'], headers={'User-Agent': UA}), timeout=90).read()
                if len(data) < 5000: raise Exception('small %d' % len(data))
                open(fn, 'wb').write(data); print('got', fn, len(data), flush=True); break
            except Exception as ex:
                print('err', t, ex, flush=True); time.sleep(60)

if __name__ == '__main__':
    {'list': stage_list, 'info': stage_info, 'get': stage_get}[sys.argv[1]]()
