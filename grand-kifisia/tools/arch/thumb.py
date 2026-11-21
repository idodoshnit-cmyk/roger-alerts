"""thumb.py outdir width "File:Title.jpg" ... : download Commons thumbnails straight from upload.wikimedia.org (md5 path, no API), 6 s apart."""
import sys, os, hashlib, time, urllib.request, urllib.parse, re
out, W = sys.argv[1], int(sys.argv[2]); os.makedirs(out, exist_ok=True)
UA = 'GrandKifisiaResearchBot/1.0 (non-commercial offline game research; python urllib)'
for t in sys.argv[3:]:
    name = t[5:] if t.startswith('File:') else t
    name = name.replace(' ', '_')
    h = hashlib.md5(name.encode()).hexdigest()
    q = urllib.parse.quote(name)
    url = f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{W}px-{q}'
    if name.lower().endswith(('.tif', '.tiff')): url += '.jpg'
    fn = os.path.join(out, re.sub(r'[\s,()]+', '_', name))
    if os.path.exists(fn): print('have', fn); continue
    try:
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=90).read()
        open(fn, 'wb').write(data); print('got', fn, len(data), flush=True)
    except Exception as ex:
        print('err', name, ex, flush=True)
    time.sleep(6)
