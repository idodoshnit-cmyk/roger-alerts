#!/usr/bin/env python3
"""Compose the per-avatar texture atlases (768x512 RGBA WebP) from the down-sized Rocketbox colour maps.
Usage: build_tex.py jobs.json     jobs = [{id, out, layout:{kind:[x,y,w,h]}, src:{kind:png path}, mask:png|null}]
Alpha channel: 255 everywhere except in the 'opacity' slot (hair / eyelash cards), where it is the cut-out coverage.
RGB of transparent hair texels is bled outwards from the opaque ones so bilinear filtering never picks up a dark fringe."""
import sys, json, os
import numpy as np
from PIL import Image, ImageFilter
AW, AH = 768, 512
def bleed(im):
    a = np.asarray(im, dtype=np.float32) / 255.0
    rgb, al = a[..., :3].copy(), a[..., 3]
    known = (al > 0.2).astype(np.float32)
    acc = rgb * known[..., None]
    out = rgb.copy(); filled = known.copy()
    for r in (1, 2, 4, 8, 16, 32):
        pm = np.asarray(Image.fromarray((np.clip(acc, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0
        kb = np.asarray(Image.fromarray((known * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0
        ok = (kb > 0.02) & (filled < 0.5)
        out[ok] = pm[ok] / kb[ok][..., None]; filled[ok] = 1
    if filled.min() < 0.5:
        mean = (acc.sum((0, 1)) / max(1.0, known.sum()))
        out[filled < 0.5] = mean
    res = np.dstack([np.clip(out, 0, 1), al])
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')
def cloth_mask(body, head):
    """Alpha for the body slot: 255 = skin / background (never tinted), 160 = clothing (takes the per-person tint in the shader).
    Skin = pixels whose chroma is close to the cheeks of the head texture; cleaned with median filters so no speckles remain."""
    hd = np.asarray(head.convert('RGB').resize((256, 256), Image.BOX), dtype=np.float32)
    ch = np.concatenate([hd[112:140, 92:116].reshape(-1, 3), hd[112:140, 140:164].reshape(-1, 3)])
    sk = np.median(ch, axis=0); ss = sk.sum() + 1e-3; sr, sg = sk[0] / ss, sk[1] / ss; sl = ss / 3
    b = np.asarray(body.convert('RGB').resize((512, 512), Image.LANCZOS), dtype=np.float32)
    s = b.sum(2) + 1e-3; r, g = b[..., 0] / s, b[..., 1] / s; lum = s / 3
    skin = (np.abs(r - sr) < 0.045) & (np.abs(g - sg) < 0.028) & (lum > sl * 0.42) & (lum < sl * 1.5) & (lum > 28)
    skin = skin & (b[..., 0] > b[..., 1] + 6) & (b[..., 1] > b[..., 2] - 2)
    m = Image.fromarray((skin * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(9)).filter(ImageFilter.MedianFilter(9)).filter(ImageFilter.MaxFilter(5))
    skin = np.asarray(m) > 127
    bg = lum < 6
    out = np.where(skin | bg, 255, 160).astype(np.uint8)
    return Image.fromarray(out, 'L')
def main():
    jobs = json.load(open(sys.argv[1])); total = 0
    for j in jobs:
        at = Image.new('RGBA', (AW, AH), (128, 128, 128, 255))
        for kind, rc in j['layout'].items():
            x, y, w, h = [int(round(v)) for v in rc]
            src = j['src'].get(kind)
            if not src or not os.path.exists(src):
                print('  MISSING texture', j['id'], kind); continue
            im = Image.open(src)
            if kind in ('opacity', 'glasses'):
                im = bleed(im.convert('RGBA').resize((w, h), Image.LANCZOS))
            else:
                im = im.convert('RGB').resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.0, 35, 2)).convert('RGBA')
            at.paste(im, (x, y))
        if len(j['layout']) < 3:  # unused slot: fill with the average body colour so mip-maps do not bleed grey
            body = at.crop((0, 0, 512, 512)).resize((1, 1), Image.BOX).getpixel((0, 0))
            at.paste((body[0], body[1], body[2], 255), (512, 256, 768, 512))
        if not (j.get('mask') and os.path.exists(j['mask'])) and j.get('tintMask') and j['src'].get('head') and os.path.exists(j['src']['head']) and os.path.exists(j['src'].get('body', '')):
            m = cloth_mask(Image.open(j['src']['body']), Image.open(j['src']['head']))
            if j.get('debug'): m.save(j['debug'])
            r, g, b, a = at.split(); a.paste(m, (0, 0)); at = Image.merge('RGBA', (r, g, b, a))
        if j.get('mask') and os.path.exists(j['mask']):
            m = Image.open(j['mask']).convert('L').resize((512, 512), Image.BILINEAR)
            r, g, b, a = at.split(); a.paste(m, (0, 0)); at = Image.merge('RGBA', (r, g, b, a))
        os.makedirs(os.path.dirname(j['out']), exist_ok=True)
        at.save(j['out'], 'WEBP', quality=j.get('q', 80), method=6, exact=True)
        total += os.path.getsize(j['out'])
        print('  tex', j['id'], os.path.getsize(j['out']))
    print('textures:', len(jobs), 'files', total, 'bytes')
main()
