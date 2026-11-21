#!/usr/bin/env python3
"""Grand Kifisia material pipeline: Poly Haven (CC0) photo textures -> graded 512x512 layers packed into sheets.

usage: build_layers.py <out dir (gk3/tex)> [--only name,name] [--preview dir]

Reads   texraw/ph/<id>/<id>_{diff,nor}.jpg   (tools/tex/ph_fetch.py)   and   texraw/phm/<model>/... (leaf atlases)
Writes  <out>/c<N>.webp   colour sheets, 4x4 cells of 512 px (sRGB, opaque)
        <out>/a<N>.webp   alpha sheets for the cut-out layers (grey)
        <out>/n<N>.jpg    normal sheets (R = x, G = y, OpenGL convention, v up)
        <out>/manifest.json   {S, colour:[{f,l:[names]}], alpha:[...], normal:[...], meta:{name:{m: metres per repeat, src}}}
Every layer is colour graded in linear light to a target mean (the colour the game expects for that surface) so
that swapping a source photo never changes the art direction, and low frequencies are flattened to hide tiling."""
import sys, os, json, math, random
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PH = os.path.join(ROOT, 'texraw', 'ph'); PHM = os.path.join(ROOT, 'texraw', 'phm')
S = 512
OUT = sys.argv[1]
ONLY = None; PREVIEW = None
for i, a in enumerate(sys.argv):
    if a == '--only': ONLY = set(sys.argv[i + 1].split(','))
    if a == '--preview': PREVIEW = sys.argv[i + 1]
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- colour helpers
def s2l(a): a = np.asarray(a, dtype=np.float32); return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
def l2s(a): a = np.clip(a, 0, 1); return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)
LUM = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

def wrap_blur(a, sigma):
    """Gaussian blur with wrap-around (FFT). a: HxW or HxWxC."""
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (math.pi ** 2) * (sigma ** 2) * (fx * fx + fy * fy))
    if a.ndim == 2: return np.real(np.fft.ifft2(np.fft.fft2(a) * g)).astype(np.float32)
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., c]) * g)) for c in range(a.shape[2])], -1).astype(np.float32)

def load_rgb(path, size=S, crop=None):
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    if im.size != (size, size): im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255

def grade(a, tgt=None, sat=1.0, con=1.0, flat=0.0, sharp=0.0):
    """a: sRGB float image. Works in linear light. tgt = target mean (sRGB triple)."""
    lin = s2l(a)
    if flat > 0:
        lum = lin @ LUM; low = wrap_blur(lum, a.shape[0] / 5.0); m = lum.mean()
        lin = lin * ((m / np.maximum(low, 1e-4)) ** flat)[..., None]
    lum = (lin @ LUM)[..., None]
    if sat != 1.0: lin = np.maximum(lum + (lin - lum) * sat, 0)
    if con != 1.0:
        lum = (lin @ LUM); m = np.exp(np.log(np.maximum(lum, 1e-4)).mean())
        lin = lin * ((np.maximum(lum, 1e-4) / m) ** (con - 1))[..., None]
    if tgt is not None:
        tl = s2l(np.array(tgt, dtype=np.float32)); cur = lin.reshape(-1, 3).mean(0)
        lin = lin * (tl / np.maximum(cur, 1e-5))
    out = l2s(lin)
    if sharp > 0:
        blur = wrap_blur(out, 1.0); out = np.clip(out + (out - blur) * sharp, 0, 1)
    return out.astype(np.float32)

def load_nor(path, strength=1.0, size=S, crop=None):
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    if im.size != (size, size): im = im.resize((size, size), Image.BOX if im.size[0] % size == 0 else Image.LANCZOS)
    n = np.asarray(im, dtype=np.float32) / 255 * 2 - 1
    n[..., :2] *= strength; n[..., 2] = np.maximum(n[..., 2], 0.05)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n

def height_to_normal(h, strength):
    """h: HxW height (wraps). Returns unit normals, OpenGL convention (y up = image up)."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, 1, 0) - np.roll(h, -1, 0)) * 0.5      # image row 0 is the top: +y is up
    n = np.dstack([-dx * strength, -dy * strength, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n.astype(np.float32)

def fbm(size, beta=2.0, seed=1, lo=0.0, hi=1e9):
    """tileable noise with a 1/f^beta spectrum (band limited to [lo,hi] cycles per tile), normalised to 0..1"""
    rng = np.random.default_rng(seed); w = rng.standard_normal((size, size))
    fy = np.fft.fftfreq(size)[:, None] * size; fx = np.fft.fftfreq(size)[None, :] * size
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    amp = 1.0 / f ** (beta / 2); amp[(f < lo) | (f > hi)] = 0; amp[0, 0] = 0
    n = np.real(np.fft.ifft2(np.fft.fft2(w) * amp)); n -= n.min(); n /= n.max() + 1e-9
    return n.astype(np.float32)

def to_img(a): return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))

# ---------------------------------------------------------------- photographic layers
# name: (polyhaven id, metres covered by one repeat, target mean sRGB or None, saturation, contrast, flatten, normal strength or None)
PHOTO = {
    # ground
    'asph':     ('clean_asphalt',        2.1,  (.375, .373, .372), 0.35, 1.25, 0.7, 1.0),
    'asph2':    ('asphalt_pit_lane',     2.0,  (.31, .31, .32),   0.45, 1.00, 0.6, 1.0),
    'asphP':    ('asphalt_02',           3.0,  (.37, .37, .375),  0.7,  1.05, 0.5, 1.0),
    'pavers':   ('concrete_pavers',      1.92, (.60, .59, .565),  0.8,  1.05, 0.5, 1.0),
    'brick':    ('herringbone_brick_03', 1.98, (.585, .365, .30), 1.0,  1.05, 0.5, 1.0),
    'marble':   ('marble_01',            1.5,  (.83, .82, .79),   0.25, 1.15, 0.5, 1.0),
    'slabs':    ('concrete_pavement',    1.8,  (.68, .67, .64),   0.7,  1.10, 0.5, 1.0),
    'platf':    ('concrete_tiles_02',    1.825,(.60, .60, .59),   0.6,  1.05, 0.5, 1.0),
    'gravel':   ('gravel_floor',         2.25, (.72, .64, .50),   0.9,  1.00, 0.6, 1.0),
    'parkG':    ('sandy_gravel',         2.1,  (.77, .70, .57),   0.9,  1.15, 0.5, 1.0),
    'soil':     ('forest_leaves_04',     1.5,  (.47, .37, .25),   0.9,  1.00, 0.6, 1.0),
    'grass':    ('forrest_ground_01',    2.0,  (.36, .46, .21),   1.25, 1.00, 0.7, 0.8),
    'dryG':     ('withered_grass',       2.0,  (.56, .52, .34),   1.1,  1.00, 0.7, 0.8),
    'ballast':  ('ganges_river_pebbles', 2.16, (.47, .455, .44),  0.30, 1.10, 0.6, 1.2),
    # walls
    'plaster':  ('white_stucco',         2.0,  (.875, .865, .835),1.0,  2.6,  0.3, 1.6),
    'plasterW': ('painted_plaster_wall', 2.0,  (.87, .86, .82),   0.8,  1.25, 0.3, 1.0),
    'plasterC': ('beige_wall_002',       3.0,  (.90, .82, .65),   1.0,  1.6,  0.6, 1.5),
    'concrete': ('concrete_wall_009',    1.8,  (.74, .73, .70),   0.8,  1.10, 0.4, 1.0),
    'ashlar':   ('sandstone_blocks_05',  3.0,  (.76, .71, .62),   0.9,  1.00, 0.5, 1.0),
    'rubble':   ('stone_wall',           2.0,  (.70, .66, .58),   0.9,  1.00, 0.5, 1.0),
    'brickw':   ('red_brick',            1.4,  (.62, .35, .27),   1.0,  1.00, 0.5, 1.0),
    'marbleW':  ('stone_tile_wall',      2.0,  (.86, .85, .83),   0.6,  1.10, 0.4, 1.0),
    # roofs
    'tiles':    ('ceramic_roof_01',      3.5,  (.80, .64, .52),   0.55, 1.05, 0.5, 1.0),
    'flatroof': ('granular_concrete',    2.4,  (.63, .62, .59),   0.6,  1.30, 0.4, 0.8),
    # wood / metal (tint carriers: light and nearly neutral, callers multiply their own colour)
    'wood':     ('wood_planks',          1.5,  (.84, .79, .73),   0.45, 1.00, 0.4, 1.0),
    'metal':    ('green_metal_rust',     1.0,  (.80, .80, .80),   0.0,  0.60, 0.5, 0.5),
    'metalL':   ('blue_metal_plate',     2.5,  (.80, .805, .81),  0.05, 0.60, 0.5, 0.6),
    'canopy':   ('factory_wall',         3.0,  (.26, .47, .36),   0.9,  1.00, 0.4, 1.0),
    'shutterM': ('painted_metal_shutter', 2.0, (.62, .64, .66),   0.3,  1.0,  0.4, 1.0),
    # bark
    'bark':     ('japanese_sycamore',    1.1,  (.66, .63, .55),   0.8,  1.00, 0.3, 1.0),
    'barkPine': ('pine_bark',            2.0,  (.48, .35, .27),   0.9,  1.00, 0.4, 1.0),
    'barkDark': ('bark_brown_02',        1.0,  (.40, .34, .27),   0.8,  1.00, 0.4, 1.0),
    'barkPalm': ('palm_bark',            1.86, (.52, .47, .40),   0.8,  1.00, 0.4, 1.0),
}
SOURCES = {}

COL = {}   # name -> HxWx3 sRGB float
ALP = {}   # name -> HxW float (cut-out layers)
NOR = {}   # name -> HxWx3 unit normal
META = {}  # name -> dict

def want(n): return ONLY is None or n in ONLY

def build_photo():
    for name, (pid, metres, tgt, sat, con, flat, ns) in list(PHOTO.items()) + list(SOURCES.items()):
        if not want(name): continue
        d = os.path.join(PH, pid)
        crop = None
        if pid == 'japanese_sycamore':
            crop = None  # 1.1 x 2.2 m source squeezed to a square: bark flakes become taller, which suits a trunk
        a = load_rgb(os.path.join(d, pid + '_diff.jpg'), crop=crop)
        COL[name] = grade(a, tgt, sat, con, flat, sharp=0.35)
        META[name] = {'m': metres, 'src': 'polyhaven:' + pid}
        if name in SOURCES: META[name]['source_only'] = 1
        if ns:
            p = os.path.join(d, pid + '_nor.jpg')
            if os.path.exists(p): NOR[name] = load_nor(p, ns, crop=crop)
            else: print('  (no normal map downloaded for', pid, ')')
        print('photo', name, '<-', pid)

# ---------------------------------------------------------------- generated layers (built from photos + maths)
def build_curb():
    # one metre of pale kerbstone (Kifisia kerbs are grey-white marble/concrete blocks) with a joint at each end
    a = load_rgb(os.path.join(PH, 'concrete_wall_009', 'concrete_wall_009_diff.jpg'), crop=(200, 200, 200 + 568, 200 + 568))
    a = grade(a, (.80, .79, .76), 0.5, 1.3, 0.5, sharp=0.4)
    x = np.arange(S); j = np.minimum(x, S - 1 - x)                    # distance to the vertical edges
    joint = np.clip(1 - j / 3.0, 0, 1)[None, :, None]
    a = a * (1 - 0.55 * joint)
    h = 1 - np.clip(1 - j / 5.0, 0, 1)[None, :] * np.ones((S, 1))
    COL['curb'] = a; NOR['curb'] = height_to_normal(h.astype(np.float32) * 6, 1.0); META['curb'] = {'m': 1.0, 'src': 'polyhaven:concrete_wall_009 + joints'}

def build_tactile():
    # 2x2 yellow warning tiles of 40 cm, 6x6 truncated domes each (EN/ISO blister paving)
    base = load_rgb(os.path.join(PH, 'concrete_pavement', 'concrete_pavement_diff.jpg'), crop=(60, 60, 60 + 420, 60 + 420))
    base = grade(base, (.84, .66, .16), 0.0, 1.2, 0.8)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    tile = S / 2.0; sp = tile / 6.0
    cx = (xx % sp) - sp / 2; cy = (yy % sp) - sp / 2; r = np.sqrt(cx * cx + cy * cy)
    R = sp * 0.30
    dome = np.clip((R - r) / (R * 0.45), 0, 1); dome = dome * dome * (3 - 2 * dome)       # flat-topped blister
    jx = np.minimum(xx % tile, tile - xx % tile); jy = np.minimum(yy % tile, tile - yy % tile)
    joint = np.clip(1 - np.minimum(jx, jy) / 2.5, 0, 1)
    h = dome * 5.0 - joint * 3.0
    ao = 1 - 0.28 * np.clip((r - R * 0.9) / (R * 0.6), 0, 1) * np.clip(1 - (r - R * 0.9) / (R * 1.2), 0, 1) - 0.45 * joint
    col = s2l(base) * ao[..., None] * (1 + 0.10 * dome[..., None])
    wear = fbm(S, 2.2, 5); col = col * (0.86 + 0.28 * wear[..., None])
    col = col * np.array([1, 1 - 0.10 * (wear - 0.5).mean(), 1])
    COL['tactile'] = grade(l2s(col), (.80, .62, .14)); NOR['tactile'] = height_to_normal(h, 1.3)
    META['tactile'] = {'m': 0.8, 'src': 'generated: yellow blister paving on polyhaven:concrete_pavement'}

def caustics(seed):
    a = fbm(S, 2.4, seed, 2, 40); b = fbm(S, 2.4, seed + 7, 2, 40)
    c = np.exp(-np.abs(a - b) * 26.0)
    return c

def build_water():
    # swimming pool: pale turquoise, small mosaic tiles on the floor seen through the water, sun caustics
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    g = S / 24.0
    grout = np.clip(1 - np.minimum(np.minimum(xx % g, g - xx % g), np.minimum(yy % g, g - yy % g)) / 1.2, 0, 1)
    c = caustics(11); n = fbm(S, 2.0, 3)
    base = np.array([.20, .62, .78], dtype=np.float32)
    lin = s2l(base)[None, None, :] * (0.82 + 0.3 * n[..., None]) * (1 - 0.22 * grout[..., None])
    lin = lin + c[..., None] * np.array([.16, .22, .20])
    COL['pool'] = l2s(lin); NOR['pool'] = height_to_normal(fbm(S, 2.6, 21, 3, 60) * 14 + fbm(S, 2.2, 22, 12, 120) * 4, 1.0)
    META['pool'] = {'m': 1.5, 'src': 'generated'}
    # pond / fountain water: dark green-blue, soft variation
    n2 = fbm(S, 2.6, 31)
    lin = s2l(np.array([.13, .25, .25], dtype=np.float32))[None, None, :] * (0.7 + 0.6 * n2[..., None])
    lin = lin + (fbm(S, 1.8, 33, 20, 200)[..., None] - 0.5) * 0.02
    COL['water'] = l2s(lin); NOR['water'] = height_to_normal(fbm(S, 2.4, 41, 3, 50) * 16 + fbm(S, 2.0, 42, 10, 100) * 5, 1.0)
    META['water'] = {'m': 3.0, 'src': 'generated'}

# ---------------------------------------------------------------- foliage: real leaf photographs composited into cards
def components(mask, min_area):
    """4-connected components of a boolean mask; returns list of (x0,y0,x1,y1,area)."""
    h, w = mask.shape; lab = np.zeros((h, w), np.int32); out = []; cur = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]: continue
        cur += 1; st = [(y0, x0)]; lab[y0, x0] = cur; a = 0; bx0 = bx1 = x0; by0 = by1 = y0
        while st:
            y, x = st.pop(); a += 1
            if x < bx0: bx0 = x
            if x > bx1: bx1 = x
            if y < by0: by0 = y
            if y > by1: by1 = y
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]: lab[yy, xx] = cur; st.append((yy, xx))
        if a >= min_area: out.append((bx0, by0, bx1 + 1, by1 + 1, a, cur))
    return out, lab

def sprites(diff, alpha, min_frac=0.004, max_frac=0.2, aspect=None, region=None):
    """Cut individual leaves out of a leaf atlas. Returns RGBA PIL images."""
    d = Image.open(diff).convert('RGB'); a = Image.open(alpha).convert('L')
    if a.size != d.size: a = a.resize(d.size, Image.LANCZOS)
    W, H = d.size; k = max(1, W // 512)
    am = np.asarray(a.resize((W // k, H // k), Image.BOX)) > 128
    if region:
        rm = np.zeros_like(am); x0, y0, x1, y1 = [int(v * am.shape[1]) for v in region]; rm[y0:y1, x0:x1] = True; am &= rm
    comps, lab = components(am, int(min_frac * am.size))
    out = []
    for (x0, y0, x1, y1, area, li) in comps:
        if area > max_frac * am.size: continue
        w, h = x1 - x0, y1 - y0
        if aspect and not (aspect[0] <= max(w, h) / max(1, min(w, h)) <= aspect[1]): continue
        box = (x0 * k, y0 * k, x1 * k, y1 * k)
        m = Image.fromarray(((lab[y0:y1, x0:x1] == li) * 255).astype(np.uint8)).resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
        al = Image.fromarray(np.minimum(np.asarray(a.crop(box)), np.asarray(m)))
        sp = d.crop(box).convert('RGBA'); sp.putalpha(al); out.append(sp)
    return out

def tint_sprite(sp, f, hue=(1, 1, 1)):
    a = np.asarray(sp, dtype=np.float32).copy()
    a[..., 0] *= f * hue[0]; a[..., 1] *= f * hue[1]; a[..., 2] *= f * hue[2]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

def paste_wrap(canvas, sp, x, y, wrap):
    w, h = sp.size
    offs = [(0, 0)]
    if wrap: offs = [(ox, oy) for ox in (-S, 0, S) for oy in (-S, 0, S)]
    for ox, oy in offs:
        px, py = int(x - w / 2 + ox), int(y - h / 2 + oy)
        if px + w <= 0 or py + h <= 0 or px >= S or py >= S: continue
        canvas.alpha_composite(sp, (max(px, 0), max(py, 0)), (max(-px, 0), max(-py, 0), min(w, S - px), min(h, S - py)))

def fill_under_alpha(rgb, alpha, iters=10):
    """spread colour into fully transparent texels so bilinear filtering and mipmaps never pick up black"""
    col = rgb * alpha[..., None]; w = alpha.copy()
    out = rgb.copy(); known = alpha > 0.02
    for i in range(iters):
        r = 2.0 * (1.6 ** i)
        cb = np.asarray(Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255
        wb = np.asarray(Image.fromarray((np.clip(w, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255
        ok = (wb > 0.02) & ~known
        out[ok] = cb[ok] / wb[ok][:, None]; known |= ok
        if known.all(): break
    out[~known] = out[known].mean(0) if known.any() else 0.3
    return out

def leaf_card(sp_list, n, size_px, seed, radius=0.46, hue=(1, 1, 1), depth=(0.42, 1.08), twigs=7, jitter=0.5, tgt=None, twig_col=(70, 55, 38), elong=1.0, fill=None, align=None):
    """A branch cluster seen face-on: leaves hang on a few twigs, drawn back to front with depth shading."""
    rnd = random.Random(seed)
    cv = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dr = ImageDraw.Draw(cv)
    c = S / 2
    # twigs first (mostly hidden by the leaves)
    tw = []
    for t in range(twigs):
        a = rnd.uniform(0, math.tau); L = radius * S * rnd.uniform(0.75, 1.0); bend = rnd.uniform(-0.5, 0.5)
        pts = [(c + math.cos(a + bend * s) * L * s, c + math.sin(a + bend * s) * L * s * elong) for s in [k / 12 for k in range(13)]]
        tw.append(pts); dr.line(pts, fill=twig_col + (255,), width=3)
        for k in range(3, 12, 3):
            b = a + rnd.choice([-1, 1]) * rnd.uniform(0.5, 1.0); p = pts[k]; q = (p[0] + math.cos(b) * L * 0.3, p[1] + math.sin(b) * L * 0.3)
            dr.line([p, q], fill=twig_col + (255,), width=2); tw.append([p, ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), q])
    for i in range(n):
        f = i / max(1, n - 1)                      # 0 = back, 1 = front
        pts = rnd.choice(tw); p = rnd.choice(pts)
        r = size_px * jitter * 1.6
        x = p[0] + rnd.gauss(0, r); y = p[1] + rnd.gauss(0, r)
        d = math.hypot(x - c, (y - c) / elong) / (radius * S)
        if d > 1.0 + rnd.uniform(-0.12, 0.05): continue
        sp = rnd.choice(sp_list); s = size_px * rnd.uniform(0.75, 1.25) / max(sp.size)
        ang = rnd.uniform(0, 360) if align is None else math.degrees(-math.atan2(y - c, x - c)) + align + rnd.uniform(-35, 35)
        sp2 = sp.resize((max(2, int(sp.size[0] * s)), max(2, int(sp.size[1] * s))), Image.LANCZOS).rotate(ang, Image.BICUBIC, expand=True)
        br = depth[0] + (depth[1] - depth[0]) * (f ** 1.3) * rnd.uniform(0.85, 1.1)
        hv = rnd.uniform(-0.06, 0.06)
        sp2 = tint_sprite(sp2, br, (hue[0] * (1 + hv), hue[1], hue[2] * (1 - hv)))
        paste_wrap(cv, sp2, x, y, False)
    a = np.asarray(cv, dtype=np.float32) / 255
    alpha = a[..., 3]; rgb = a[..., :3]
    if tgt is not None:
        m = alpha > 0.5; lin = s2l(rgb); cur = lin[m].mean(0); lin = lin * (s2l(np.array(tgt, dtype=np.float32)) / np.maximum(cur, 1e-4)); rgb = l2s(lin)
    rgb = fill_under_alpha(rgb.astype(np.float32), alpha)
    return rgb, alpha

def leaf_wall(sp_list, n, size_px, seed, hue=(1, 1, 1), bg=(10, 20, 9), tgt=None, extra=None):
    """Dense, tileable, opaque foliage (clipped hedge). Returns colour + a height map for the normal."""
    rnd = random.Random(seed)
    cv = Image.new('RGBA', (S, S), bg + (255,)); hv = Image.new('L', (S, S), 0)
    for i in range(n):
        f = i / (n - 1)
        sp = rnd.choice(sp_list); s = size_px * rnd.uniform(0.7, 1.3) / max(sp.size)
        sp2 = sp.resize((max(2, int(sp.size[0] * s)), max(2, int(sp.size[1] * s))), Image.LANCZOS).rotate(rnd.uniform(0, 360), Image.BICUBIC, expand=True)
        br = 0.28 + 0.80 * (f ** 1.6) * rnd.uniform(0.8, 1.12); h2 = rnd.uniform(-0.07, 0.07)
        x, y = rnd.uniform(0, S), rnd.uniform(0, S)
        paste_wrap(cv, tint_sprite(sp2, br, (hue[0] * (1 + h2), hue[1], hue[2] * (1 - h2))), x, y, True)
        hs = Image.new('RGBA', sp2.size, (int(255 * f),) * 3 + (0,)); hs.putalpha(sp2.getchannel('A'))
        hrgba = hv.convert('RGBA'); paste_wrap(hrgba, hs, x, y, True); hv = hrgba.convert('L')
        if extra and i > n * 0.55: extra(cv, rnd, i)
    rgb = np.asarray(cv.convert('RGB'), dtype=np.float32) / 255
    if tgt is not None: rgb = grade(rgb, tgt)
    h = np.asarray(hv, dtype=np.float32) / 255
    return rgb, wrap_blur(h, 1.2)

def build_foliage():
    P = lambda m, f: os.path.join(PHM, m, f)
    broad = sprites(P('shrub_01', 'shrub_01_Diffuse.jpg'), P('shrub_01', 'shrub_01_Alpha.jpg'), 0.006, 0.12, aspect=(1.0, 2.2))
    citrus = sprites(P('island_tree_01', 'island_tree_01_leaves_diff.jpg'), P('island_tree_01', 'island_tree_01_leaves_alpha.jpg'), 0.004, 0.2, aspect=(1.3, 4))
    narrow = sprites(P('shrub_02', 'shrub_02_Diffuse.jpg'), P('shrub_02', 'shrub_02_Alpha.jpg'), 0.002, 0.2, aspect=(2.2, 12))
    small = sprites(P('searsia_lucida', 'searsia_lucida_Diffuse.jpg'), P('searsia_lucida', 'searsia_lucida_Alpha.jpg'), 0.004, 0.1, aspect=(1.2, 3.2), region=(0, 0, 0.62, 0.28))
    pine = sprites(P('pine_tree_01', 'pine_tree_01_twig_diff.jpg'), P('pine_tree_01', 'pine_tree_01_twig_alpha.jpg'), 0.004, 0.2, region=(0, 0, 1, 0.62))
    fir = sprites(P('fir_tree_01', 'fir_tree_01_twig_diff.jpg'), P('fir_tree_01', 'fir_tree_01_twig_alpha.jpg'), 0.002, 0.2, region=(0.16, 0, 1, 0.8))
    frond = sprites(P('fern_02', 'fern_02_Diffuse.jpg'), P('fern_02', 'fern_02_Alpha.jpg'), 0.004, 0.3)
    print('leaf sprites: broad', len(broad), 'citrus', len(citrus), 'narrow', len(narrow), 'small', len(small), 'pine', len(pine), 'fir', len(fir), 'frond', len(frond))
    def put(name, rgb, alpha, metres, src):
        COL[name] = rgb; ALP[name] = alpha; META[name] = {'m': metres, 'src': src, 'cut': 1}
    if want('leaves'):
        rgb, al = leaf_card(broad, 330, 62, 1, tgt=(.34, .48, .20), hue=(0.95, 1.0, 0.8), twigs=8)
        put('leaves', rgb, al, 2.0, 'composited from polyhaven model:shrub_01 leaves')
    if want('leafPine'):
        rgb, al = leaf_card(pine, 150, 150, 2, tgt=(.26, .40, .20), radius=0.47, twigs=9, jitter=0.25, depth=(0.5, 1.1), align=0)
        put('leafPine', rgb, al, 2.0, 'composited from polyhaven model:pine_tree_01 needle twigs')
    if want('leafCypress'):
        rgb, al = leaf_card(fir, 260, 120, 3, tgt=(.17, .29, .16), radius=0.49, twigs=10, jitter=0.35, depth=(0.4, 1.05), align=0)
        put('leafCypress', rgb, al, 1.5, 'composited from polyhaven model:fir_tree_01 twigs')
    if want('leafOlive'):
        rgb, al = leaf_card(narrow, 420, 60, 4, tgt=(.46, .52, .38), hue=(1, 1, 1.05), twigs=9, jitter=0.4, depth=(0.5, 1.1))
        put('leafOlive', rgb, al, 1.5, 'composited from polyhaven model:shrub_02 leaves')
    if want('leafOrange'):
        def fruit(cv, rnd, i):
            if rnd.random() > 0.035: return
            r = rnd.uniform(11, 15); x, y = rnd.uniform(60, S - 60), rnd.uniform(60, S - 60)
            if math.hypot(x - S / 2, y - S / 2) > S * 0.36: return
            o = Image.new('RGBA', (int(r * 2 + 2),) * 2, (0, 0, 0, 0)); d = ImageDraw.Draw(o)
            for k in range(int(r), 0, -1):
                t = k / r; d.ellipse([r - k + 1 - (1 - t) * r * 0.3, r - k + 1 - (1 - t) * r * 0.3, r + k + 1 - (1 - t) * r * 0.3, r + k + 1 - (1 - t) * r * 0.3], fill=(int(205 + 45 * (1 - t)), int(105 + 70 * (1 - t)), int(20 + 40 * (1 - t)), 255))
            cv.alpha_composite(o, (int(x - r), int(y - r)))
        rnd = random.Random(5)
        rgb, al = leaf_card(citrus, 300, 58, 5, tgt=None, hue=(0.75, 0.95, 0.6), twigs=8, depth=(0.35, 1.0))
        # oranges are composited on top of the finished card
        cv = Image.fromarray((np.dstack([rgb, al]) * 255).astype(np.uint8), 'RGBA')
        for i in range(700): fruit(cv, rnd, i)
        a = np.asarray(cv, dtype=np.float32) / 255
        put('leafOrange', fill_under_alpha(a[..., :3].copy(), a[..., 3]), a[..., 3], 1.2, 'composited from polyhaven model:island_tree_01 leaves + drawn fruit')
    if want('leafPalm'):
        # one long pinnate frond along +v (base at the bottom), built from fern fronds
        cv = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        fr = max(frond, key=lambda s: max(s.size))
        if fr.size[0] > fr.size[1]: fr = fr.rotate(90, expand=True)
        f2 = fr.resize((int(S * 0.62), S), Image.LANCZOS)
        cv.alpha_composite(tint_sprite(f2, 0.9), (int(S * 0.19), 0))
        dr = ImageDraw.Draw(cv); dr.line([(S / 2, S), (S / 2, S * 0.05)], fill=(120, 130, 60, 255), width=5)
        a = np.asarray(cv, dtype=np.float32) / 255; al = a[..., 3]; rgb = a[..., :3]
        m = al > 0.5; lin = s2l(rgb); lin = lin * (s2l(np.array((.30, .43, .18), dtype=np.float32)) / np.maximum(lin[m].mean(0), 1e-4))
        put('leafPalm', fill_under_alpha(l2s(lin).astype(np.float32), al), al, 3.0, 'built from polyhaven model:fern_02 frond')
    if want('hedge'):
        rgb, h = leaf_wall(small + citrus[:3], 2600, 44, 7, hue=(0.8, 1.0, 0.7), tgt=(.42, .56, .27))
        COL['hedge'] = rgb; NOR['hedge'] = height_to_normal(h * 22, 1.0); META['hedge'] = {'m': 1.5, 'src': 'composited from polyhaven model leaves (searsia_lucida, island_tree_01)'}
    if want('orangeF'):
        def fruit2(cv, rnd, i):
            if rnd.random() > 0.022: return
            r = rnd.uniform(9, 12); x, y = rnd.uniform(0, S), rnd.uniform(0, S)
            o = Image.new('RGBA', (int(r * 2 + 2),) * 2, (0, 0, 0, 0)); d = ImageDraw.Draw(o)
            for k in range(int(r), 0, -1):
                t = k / r; q = (1 - t) * r * 0.3
                d.ellipse([r - k + 1 - q, r - k + 1 - q, r + k + 1 - q, r + k + 1 - q], fill=(int(205 + 45 * (1 - t)), int(105 + 70 * (1 - t)), int(20 + 40 * (1 - t)), 255))
            paste_wrap(cv, o, x, y, True)
        rgb, h = leaf_wall(citrus, 1500, 62, 8, hue=(0.7, 0.95, 0.55), tgt=None, extra=fruit2)
        lin = s2l(rgb); lin *= s2l(np.array((.38, .52, .23), dtype=np.float32)) / lin.reshape(-1, 3).mean(0); COL['orangeF'] = l2s(lin)
        NOR['orangeF'] = height_to_normal(h * 22, 1.0); META['orangeF'] = {'m': 1.5, 'src': 'composited from polyhaven model:island_tree_01 leaves + drawn fruit'}

def build_noise():
    # macro-variation layer (not a surface): R = big soft blotches, G = mid-size mottling, B = vertical grime streaks. Stored so that the
    # sRGB-decoded value is linear noise with mean 0.5.
    r = fbm(S, 2.6, 101, 1, 12); g = fbm(S, 2.0, 102, 4, 40)
    rng = np.random.default_rng(7); w = rng.standard_normal((S, S)); fy = np.fft.fftfreq(S)[:, None] * S; fx = np.fft.fftfreq(S)[None, :] * S
    amp = 1.0 / (1 + np.abs(fx) ** 1.2) * np.exp(-(fy / 3.0) ** 2); amp[0, 0] = 0
    b = np.real(np.fft.ifft2(np.fft.fft2(w) * amp)); b -= b.min(); b /= b.max()
    def eq(a):  # equalise to a flat-ish distribution centred on 0.5
        o = np.argsort(a.ravel()); e = np.empty(a.size, np.float32); e[o] = np.linspace(0, 1, a.size); e = e.reshape(a.shape)
        return 0.5 + (e - 0.5) * 0.9
    lin = np.dstack([eq(r), eq(g), eq(b)])
    COL['noise'] = l2s(lin).astype(np.float32); META['noise'] = {'m': 0, 'src': 'generated noise (macro variation)'}

# ---------------------------------------------------------------- pack
def pack(names, arrays, prefix, ext, **save):
    sheets = []
    for k in range(0, len(names), 16):
        chunk = names[k:k + 16]; rows = (len(chunk) + 3) // 4
        sh = Image.new('RGB', (S * 4, S * rows))
        for i, n in enumerate(chunk): sh.paste(arrays[n], ((i % 4) * S, (i // 4) * S))
        f = '%s%d.%s' % (prefix, k // 16, ext); sh.save(os.path.join(OUT, f), **save)
        sheets.append({'f': f, 'l': chunk}); print('  wrote', f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB', len(chunk), 'layers')
    return sheets

def main():
    build_photo()
    if want('curb'): build_curb()
    if want('tactile'): build_tactile()
    if want('pool') or want('water'): build_water()
    if want('noise'): build_noise()
    build_foliage()
    if PREVIEW:
        os.makedirs(PREVIEW, exist_ok=True)
        for n, a in COL.items():
            im = to_img(a)
            if n in ALP:
                bg = Image.new('RGB', (S, S), (150, 170, 200)); bg.paste(im, (0, 0), to_img(ALP[n])); im = bg
            im.save(os.path.join(PREVIEW, n + '.jpg'), quality=90)
        for n, a in NOR.items(): to_img(a * 0.5 + 0.5).save(os.path.join(PREVIEW, n + '_n.jpg'), quality=90)
    if ONLY: print('partial build (--only): sheets not written'); return
    for f in os.listdir(OUT):
        if f[0] in 'can' and f[1:2].isdigit(): os.remove(os.path.join(OUT, f))
    cn = list(COL.keys()); an = list(ALP.keys()); nn = list(NOR.keys())
    man = {'S': S,
           'colour': pack(cn, {n: to_img(COL[n]) for n in cn}, 'c', 'webp', quality=88, method=6),
           'alpha': pack(an, {n: to_img(np.dstack([ALP[n]] * 3)) for n in an}, 'a', 'webp', quality=92, method=6),
           'normal': pack(nn, {n: to_img(np.dstack([NOR[n][..., 0] * 0.5 + 0.5, NOR[n][..., 1] * 0.5 + 0.5, np.ones((S, S), np.float32)])) for n in nn}, 'n', 'jpg', quality=88, subsampling=0),
           'meta': META}
    json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), separators=(',', ':'))
    tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(len(cn), 'colour layers,', len(an), 'alpha,', len(nn), 'normal; total', tot // 1024, 'KB in', OUT)

main()
