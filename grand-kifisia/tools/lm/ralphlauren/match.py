# python3 match.py out.jpg H "label1=path1[@crop x0,y0,x1,y1]" "label2=path2[@crop]" ...  -> side-by-side strip, each panel scaled to height H
import sys
from PIL import Image, ImageDraw
out, H = sys.argv[1], int(sys.argv[2]); panels = []
for a in sys.argv[3:]:
    lab, p = a.split('=', 1); crop = None
    if '@' in p: p, c = p.split('@'); crop = tuple(int(v) for v in c.split(','))
    im = Image.open(p).convert('RGB')
    if crop: im = im.crop(crop)
    im = im.resize((max(1, int(im.width * H / im.height)), H), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 8 + 7 * len(lab), 16], fill=(0, 0, 0)); d.text((4, 2), lab, fill=(255, 255, 0)); panels.append(im)
W = sum(p.width for p in panels) + 6 * (len(panels) - 1); o = Image.new('RGB', (W, H), (255, 255, 255)); x = 0
for p in panels: o.paste(p, (x, 0)); x += p.width + 6
o.save(out, quality=88); print(out, o.size)
