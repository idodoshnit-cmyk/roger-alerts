"""gettext.py URL [grep-regex] : fetch a page (honest UA), strip HTML, print text (or lines matching regex with context)."""
import sys, re, html, urllib.request
u = sys.argv[1]
raw = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'GrandKifisiaResearchBot/1.0 (non-commercial offline game research)'}), timeout=60).read().decode('utf8', 'replace')
raw = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', raw)
imgs = re.findall(r'<img[^>]+src="([^"]+)"', raw)
t = html.unescape(re.sub(r'<[^>]+>', '\n', raw))
lines = [re.sub(r'\s+', ' ', l).strip() for l in t.split('\n')]
lines = [l for l in lines if len(l) > 2]
if len(sys.argv) > 2:
    rx = re.compile(sys.argv[2], re.I)
    for i, l in enumerate(lines):
        if rx.search(l): print('…', ' | '.join(lines[max(0, i - 1):i + 2])[:700])
else:
    print('\n'.join(lines)[:12000])
if '--img' in sys.argv: print('\n'.join(imgs[:80]))
