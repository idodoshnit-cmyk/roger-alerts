#!/usr/bin/env python3
"""Stack strip images vertically into one sheet (optionally scaled):  sheet.py out.jpg [--w 1600] in1.png in2.png ..."""
import sys
from PIL import Image
args = sys.argv[1:]; out = args.pop(0); W = None
if args[0] == '--w': args.pop(0); W = int(args.pop(0))
ims = [Image.open(a).convert('RGB') for a in args]
if W: ims = [im.resize((W, round(im.height * W / im.width)), Image.LANCZOS) for im in ims]
sheet = Image.new('RGB', (max(i.width for i in ims), sum(i.height for i in ims)), (0, 0, 0)); y = 0
for im in ims: sheet.paste(im, (0, y)); y += im.height
sheet.save(out, quality=88)
