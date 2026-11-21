"""research-arch: download Openverse thumbnails (polite, 8 s apart) for selected results.
Usage: python3 -I tools/arch/ov_thumbs.py  -> reads work/research-arch/ov/p_*.json,q_*.json, selects by title regex, writes
docs/research/img/arch/ov/<slug>.jpg and work/research-arch/ov/meta.json (licence, creator, landing url)."""
import json, glob, os, re, time, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WD = os.path.join(ROOT, 'work', 'research-arch', 'ov'); OUT = os.path.join(ROOT, 'docs', 'research', 'img', 'arch', 'ov')
UA = 'GrandKifisiaResearchBot/1.0 (non-commercial offline game research; python urllib)'
SEL = re.compile(r'panoramio|lunch in Kifisia|Sidewalks are useless|Old House in Kifisia|Spring at Kifisia|Gloria Jean|Night walk at Kifisia|Mihalaria|Platanou|Agora-Kifissias|Kifisia-collage|Naos-kifisia|Kinimatografoi|Pavlos Melas House|telephone booth|Graffiti in Kifisia|Kifisias Street|A house at Kifisia', re.I)
SKIP = re.compile(r'snow|likeio', re.I)
os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(WD, 'meta.json'))) if os.path.exists(os.path.join(WD, 'meta.json')) else {}
seen = set()
for f in sorted(glob.glob(os.path.join(WD, 'q_*.json'))) + sorted(glob.glob(os.path.join(WD, 'p_*.json'))):
    for r in json.load(open(f)).get('results', []):
        if r['id'] in seen or not SEL.search(r['title']) or SKIP.search(r['title']): continue
        seen.add(r['id'])
        slug = re.sub(r'[^0-9A-Za-z]+', '_', re.sub(r'^File:', '', r['title']))[:60].strip('_') + '_' + r['id'][:6]
        fn = os.path.join(OUT, slug + '.jpg')
        meta[slug] = dict(title=r['title'], creator=r.get('creator'), license=r['license'], license_version=r.get('license_version'),
                          source=r['source'], landing=r['foreign_landing_url'], url=r.get('url'), id=r['id'])
        if os.path.exists(fn): continue
        for a in range(3):
            try:
                time.sleep(8)
                d = urllib.request.urlopen(urllib.request.Request('https://api.openverse.org/v1/images/%s/thumb/?full_size=true' % r['id'], headers={'User-Agent': UA}), timeout=90).read()
                if len(d) < 4000: raise Exception('small %d' % len(d))
                open(fn, 'wb').write(d); print('got', slug, len(d), flush=True); break
            except Exception as ex:
                print('err', slug, ex, flush=True); time.sleep(40)
        json.dump(meta, open(os.path.join(WD, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
json.dump(meta, open(os.path.join(WD, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
print('DONE', len(meta))
