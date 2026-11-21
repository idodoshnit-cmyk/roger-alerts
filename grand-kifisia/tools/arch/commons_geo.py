"""Wikimedia Commons geosearch (namespace File) over the play area, tiled; >=6 s between requests; honest UA.
Writes work/research-arch/commons_geo.json  {title: {lat, lon}}"""
import json, os, time, urllib.request, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UA = 'GrandKifisiaResearchBot/1.0 (non-commercial offline game research; python urllib)'
OUT = os.path.join(ROOT, 'work', 'research-arch', 'commons_geo.json')
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
W, E, S, N = 23.798, 23.832, 38.064, 38.083
nx, ny = 4, 3
for i in range(nx):
    for j in range(ny):
        w = W + (E - W) * i / nx; e = W + (E - W) * (i + 1) / nx
        s = S + (N - S) * j / ny; n = S + (N - S) * (j + 1) / ny
        q = dict(action='query', list='geosearch', gsbbox=f'{n}|{w}|{s}|{e}', gsnamespace=6, gslimit=500, format='json')
        url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(q)
        for attempt in range(3):
            try:
                r = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60))
                break
            except Exception as ex:
                print('err', ex); time.sleep(20)
        g = r.get('query', {}).get('geosearch', [])
        if 'error' in r: print(r['error'])
        for x in g: res[x['title']] = dict(lat=x['lat'], lon=x['lon'])
        print(i, j, len(g), len(res), flush=True)
        json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=0)
        time.sleep(7)
