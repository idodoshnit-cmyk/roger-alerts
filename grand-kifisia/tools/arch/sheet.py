"""contact sheet: sheet.py out.jpg cols cellW file[:label] ..."""
import sys
from PIL import Image, ImageDraw
out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = sys.argv[4:]
ims = []
for it in items:
    f, _, lab = it.partition('::')
    im = Image.open(f).convert('RGB'); r = cw / im.width; im = im.resize((cw, int(im.height * r)))
    ims.append((im, lab or f.split('/')[-1]))
ch = max(i.height for i, _ in ims)
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * cw, rows * (ch + 18)), (30, 30, 30)); d = ImageDraw.Draw(S)
for k, (im, lab) in enumerate(ims):
    x, y = (k % cols) * cw, (k // cols) * (ch + 18)
    S.paste(im, (x, y + 18)); d.text((x + 4, y + 3), lab[:90], fill=(255, 255, 0))
S.save(out, quality=85)
