"""research-arch: polite downloader for open-licence photos WITHOUT the (rate-limited) Commons API.
Commons: the upload path is /<md5[0]>/<md5[:2]>/<File_name>; we fetch the standard 960px thumbnail (fallback: original).
Flickr (via Openverse records): the record's direct image url.  >= 30 s between requests, honest UA.
Usage: python3 -I tools/arch/commons_thumbs.py <wanted.json>   (list of {"title": "File:..."} or {"title":..,"url":..,"source":"flickr",...})
Writes docs/research/img/arch/commons/<slug>.jpg and work/research-arch/commons_dl.json (title, url, local, ok)."""
import json, os, sys, time, hashlib, re, urllib.request, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'docs', 'research', 'img', 'arch', 'commons'); os.makedirs(OUT, exist_ok=True)
LOG = os.path.join(ROOT, 'work', 'research-arch', 'commons_dl.json')
UA = 'GrandKifisiaResearch/1.0 (non-commercial offline game research; python urllib)'
done = json.load(open(LOG)) if os.path.exists(LOG) else {}
def slug(t):
    t = re.sub(r'^File:', '', t); t = re.sub(r'\.[A-Za-z]+$', '', t)
    s = re.sub(r'[^0-9A-Za-zͰ-Ͽ]+', '_', t).strip('_')[:70]
    return s
import subprocess
def get(url):
    # curl (same honest UA): python-urllib requests are answered 429 by the Wikimedia edge even at 1 request
    r = subprocess.run(['curl', '-s', '-m', '90', '-A', UA, '-w', '\n%{http_code}', url], capture_output=True)
    body, _, code = r.stdout.rpartition(b'\n')
    if code.strip() != b'200': raise Exception('HTTP %s' % code.decode().strip())
    return body
last = 0
N429 = [0]
for w in json.load(open(sys.argv[1])):
    t = w['title']
    if done.get(t, {}).get('ok'): continue
    fn = os.path.join(OUT, slug(t) + '.jpg')
    if w.get('source') == 'flickr':
        urls = [w['url']]
    else:
        name = re.sub(r'^File:', '', t).replace(' ', '_')
        h = hashlib.md5(name.encode('utf8')).hexdigest()
        q = urllib.parse.quote(name)
        base = 'https://upload.wikimedia.org/wikipedia/commons/'
        urls = [base + 'thumb/%s/%s/%s/960px-%s' % (h[0], h[:2], q, q) + ('.jpg' if name.lower().endswith(('.png', '.svg', '.tif', '.tiff')) else ''),
                base + '%s/%s/%s' % (h[0], h[:2], q)]
    rec = {'title': t, 'local': os.path.relpath(fn, ROOT), 'ok': False}
    ui = 0
    while ui < len(urls):
        u = urls[ui]
        time.sleep(max(0, 30 - (time.time() - last))); last = time.time()
        try:
            d = get(u)
            if len(d) < 3000 or (d[:2] != b'\xff\xd8' and d[:4] != b'\x89PNG'): raise Exception('not an image %d' % len(d))
            if len(d) > 8_000_000: raise Exception('too big')
            open(fn, 'wb').write(d); rec.update(ok=True, url=u, bytes=len(d)); rec.pop('err', None); break
        except Exception as ex:
            rec['err'] = str(ex)[:120]
            if '429' in str(ex):
                N429[0] += 1
                if N429[0] > 8: print('429 x8 - giving up for now', flush=True); json.dump(done, open(LOG, 'w'), ensure_ascii=False, indent=1); sys.exit(2)
                print('429 - honouring Retry-After: sleeping 660 s', flush=True); time.sleep(660); last = time.time(); continue
            ui += 1
    for k in ('creator', 'license', 'landing', 'x', 'z'):
        if k in w: rec[k] = w[k]
    done[t] = rec
    print('ok' if rec['ok'] else 'FAIL', t, rec.get('err', ''), flush=True)
    json.dump(done, open(LOG, 'w'), ensure_ascii=False, indent=1)
print('DONE', sum(1 for r in done.values() if r['ok']), '/', len(done))
