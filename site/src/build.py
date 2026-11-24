#!/usr/bin/env python3
"""Builds site/index.html (photos as files) and site/preview.html (one self-contained file, photos inlined)."""
import base64, json, os, re, html
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.dirname(HERE)
FONTS = '/tmp/claude-0/-home-user-roger-alerts/45eef871-2a3c-5aef-b601-1db71b584edd/scratchpad/fonts5'
if os.path.isdir(os.path.join(HERE, 'fonts')): FONTS = os.path.join(HERE, 'fonts')
rd = lambda n: open(os.path.join(HERE, n), encoding='utf-8').read()
inv = {os.path.basename(i['file'])[:-5]: i for i in json.load(open(os.path.join(SITE, 'img/work/inventory.json')))}

# (tab, file, caption, tag, alt, focus x, focus y)
WORK = [
 ('kitchens','kitchen-navy-masked','Kitchen respray, navy','Masked up','Kitchen fully masked with plastic sheeting and tape, part way through spraying navy',.5,.5),
 ('kitchens','kitchen-navy-ovens','Kitchen respray, navy','Finished','The same kitchen finished: navy shaker units around a double oven',.5,.5),
 ('kitchens','kitchen-navy-wide','Kitchen respray, navy','Finished','Navy spray-painted shaker kitchen, wide view',.5,.5),
 ('kitchens','kitchen-navy-front','Kitchen respray, navy','Finished','Navy spray-painted kitchen units with white worktop',.5,.5),
 ('kitchens','kitchen-green-spraying','Kitchen respray, sage','Mid-spray','Decorator on steps spraying masked kitchen units under a roof lantern',.5,.42),
 ('kitchens','kitchen-green-lantern','Kitchen respray, sage','Finished','The same kitchen finished in sage green under the roof lantern',.5,.5),
 ('kitchens','kitchen-green-garden','Kitchen respray, sage','Finished','Sage green kitchen with tall units and a view to the garden',.5,.5),
 ('kitchens','kitchen-green-island','Kitchen respray, sage','Finished','Sage green kitchen island with brass cup handles',.5,.5),
 ('kitchens','spraying-unit','Spraying a tall unit','Mid-spray','Decorator wearing a respirator spraying a tall white unit inside a masked spray area',.5,.42),
 ('wallpaper','wallpaper-jungle','Jungle wallpaper','','Jungle and leopard patterned wallpaper next to a rustic plank door',.5,.5),
 ('wallpaper','wallpaper-birds','Bird wallpaper, cloakroom','','Dark botanical bird wallpaper on a cloakroom feature wall',.5,.36),
 ('wallpaper','wallpaper-floral','Floral wallpaper','','Grey floral wallpaper in a living room',.5,.5),
 ('wallpaper','wallpaper-mural','Photo mural','','Large black and white photographic wall mural above a radiator',.5,.45),
 ('wallpaper','wallpaper-stars','Star wallpaper, bedroom','','Grey wallpaper with white stars on a bedroom wall',.5,.5),
 ('interiors','landing-sage-chandelier','Landing, sage green','','Sage green galleried landing with mahogany balustrade and chandelier',.5,.5),
 ('interiors','landing-sage-doors','Landing and woodwork','','Sage green landing with white panelled doors and architraves',.5,.5),
 ('interiors','room-sage-frenchdoors','Walls and woodwork','','Sage green room with white woodwork and dark glazed French doors',.5,.5),
 ('interiors','panelling-mauve','Panelling, mauve','','Mauve painted wall panelling in a bedroom',.5,.5),
 ('interiors','loft-white-beams','Loft, white','','Freshly painted white loft room with grey beams',.5,.5),
 ('exteriors','exterior-grey-house','Render, pale grey','','Detached house with pale grey painted render and dark window frames',.5,.5),
 ('exteriors','exterior-blue-door','Front door, pale blue','','Brick entrance with a pale blue painted front door and white surround',.5,.6),
 ('exteriors','exterior-cream-house','Render, cream','','Cream painted rendered house front with sash windows',.5,.5),
 ('exteriors','exterior-cream-extension','Extension, cream','','Cream painted rendered extension with bifold doors',.5,.5),
 ('exteriors','exterior-dark-terrace','Terrace, dark grey','','Terrace painted dark grey with white windows',.5,.5),
 ('exteriors','exterior-white-house','Render, white','','White painted rendered house with a black garage door',.5,.5),
 ('exteriors','exterior-grey-render','Render, grey','','Rear of a house with grey painted render above brick',.5,.4),
 ('exteriors','commercial-unit','Commercial unit','Mid-job','Commercial brick unit with shutters masked and ladders up',.5,.5),
]
TABS = [
 ('kitchens','Kitchens','Kitchen spray painting','Doors off, everything masked, then sprayed. Same kitchen, new colour.',
  ['Everything masked and protected','Sanded, filled and primed first','Sprayed, so no brush marks']),
 ('wallpaper','Wallpaper','Wallpapering','Designer papers, murals and feature walls.',
  ['Old paper stripped, walls made good','Measured properly, so less waste','Feature walls are our most-asked-for job']),
 ('interiors','Interiors','Interior painting','Walls, ceilings, woodwork, doors and banisters.',
  ['Floors and furniture covered','Sanded, filled and repaired before paint','Farrow & Ball, Dulux, Crown, Johnstone’s, Armstead']),
 ('exteriors','Exteriors','Exterior and commercial','Render, masonry, doors, gates and commercial units.',
  ['Cracked render repaired, not painted over','Exterior paints made for the weather','Shops, offices and units too']),
]
CARD_A = [('kitchen-green-lantern','Kitchen respray, sage',.5,.5),('wallpaper-birds','Bird wallpaper',.5,.35),('landing-sage-chandelier','Landing, sage green',.45,.5),('exterior-blue-door','Front door, pale blue',.5,.55),('kitchen-navy-ovens','Kitchen respray, navy',.42,.5),('wallpaper-jungle','Jungle wallpaper',.6,.5),('exterior-grey-house','Render, pale grey',.5,.5)]
CARD_B = [('kitchen-green-island','',.5,.5),('wallpaper-stars','',.5,.5),('kitchen-navy-front','',.5,.5),('room-sage-frenchdoors','',.6,.5),('panelling-mauve','',.5,.5),('exterior-cream-house','',.5,.5),('wallpaper-floral','',.5,.5)]
e = lambda s: html.escape(s, quote=True)
ALT = {w[1]: w[4] for w in WORK}

def card(items, lead):
    out = []
    for k, (n, cap, fx, fy) in enumerate(items):
        i = inv[n]; first = k == 0
        out.append(f'          <img{" class=\"on\"" if first else ""} src="img/work/{n}.webp" width="{i["w"]}" height="{i["h"]}" alt="{e(ALT[n]) if lead else ""}" data-cap="{e(cap)}" style="object-position:{fx*100:g}% {fy*100:g}%" {"fetchpriority=\"high\"" if first and lead else "loading=\"lazy\""} decoding="async">')
    return '\n'.join(out)

tabs = '\n'.join(f'          <button class="tab" role="tab" type="button" id="tab-{t[0]}" data-tab="{t[0]}" aria-controls="panel-{t[0]}" aria-selected="{"true" if k==0 else "false"}"{"" if k==0 else " tabindex=\"-1\""}>{e(t[1])}</button>' for k, t in enumerate(TABS))
panels = []; strips = []
NL = chr(10)
for k, (key, label, title, blurb, pts) in enumerate(TABS):
    th = []
    for gi, w in enumerate(WORK):
        if w[0] != key: continue
        i = inv[w[1]]
        extra = (", " + e(w[3].lower())) if w[3] else ""
        th.append('            <button type="button" data-i="%d" aria-label="Show photo: %s%s"><img src="img/work/%s.webp" width="%d" height="%d" alt="%s" loading="lazy" decoding="async" style="object-position:%g%% %g%%"></button>'
                  % (gi, e(w[2]), extra, w[1], i["w"], i["h"], e(w[4]), w[5] * 100, w[6] * 100))
    hid = "" if k == 0 else " hidden"
    strips.append('          <div class="thumbs" data-tab="%s" role="group" aria-label="%s photos"%s>' % (key, e(label), hid) + NL + NL.join(th) + NL + '          </div>')
    li = NL.join('              <li><svg class="i" aria-hidden="true"><use href="#i-check"/></svg>%s</li>' % e(pt) for pt in pts)
    panels.append('          <div class="panel" role="tabpanel" id="panel-%s" data-tab="%s" aria-labelledby="tab-%s"%s>' % (key, key, key, hid) + NL +
                  '            <h3>%s</h3>' % e(title) + NL + '            <p>%s</p>' % e(blurb) + NL + '            <ul class="pts">' + NL + li + NL + '            </ul>' + NL + '          </div>')
data = [dict(t=w[0], n=w[1], cap=w[2], tag=w[3], alt=w[4], fx=w[5], fy=w[6], w=inv[w[1]]['w'], h=inv[w[1]]['h']) for w in WORK]

css = rd('styles.css')
css = re.sub(r'\{\{font:([^}]+)\}\}', lambda m: base64.b64encode(open(os.path.join(FONTS, m.group(1) + '.woff2'), 'rb').read()).decode(), css)
js = rd('fluid.js') + '\n' + rd('app.js')
assert '</script' not in js.lower()
page = rd('index.src.html')
for a, b in [('/*CSS*/', css), ('<!--CARD_A-->', card(CARD_A, True)), ('<!--CARD_B-->', card(CARD_B, False)), ('<!--TABS-->', tabs), ('<!--PANELS-->', NL.join(panels)), ('<!--THUMBS-->', NL.join(strips)),
             ('<!--DATA-->', '<script>window.__WORK=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';</script>'), ('/*JS*/', js)]:
    assert a in page, a
    page = page.replace(a, b)
open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(page)

# ---- self-contained preview: every photo inlined once, <img src> filled in before the app starts ----
names = sorted(set(re.findall(r'img/work/([a-z0-9-]+)\.webp', page)))
uri = {n: 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(SITE, 'img/work', n + '.webp'), 'rb').read()).decode() for n in names}
prev = re.sub(r'(<img\b[^>]*?)\ssrc="img/work/([a-z0-9-]+)\.webp"', r'\1 data-img="\2"', page)
boot = '<script>window.__IMG=' + json.dumps(uri, separators=(',', ':')) + ';[].forEach.call(document.querySelectorAll("img[data-img]"),function(i){i.src=window.__IMG[i.getAttribute("data-img")]});</script>'
prev = prev.replace('<script>window.__WORK=', boot + '\n<script>window.__WORK=', 1)
open(os.path.join(SITE, 'preview.html'), 'w', encoding='utf-8').write(prev)
print('index.html', len(page) // 1024, 'KB | preview.html', len(prev) // 1024, 'KB |', len(names), 'photos')
