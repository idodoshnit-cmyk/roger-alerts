"""Top-down overlays for the placement audit: game signs vs real (OSM / verified address) positions, lines for every delta > 4 m.
Reads gk3/data/placement_audit.json + gk3/kifisia_map.json; writes docs/research/img/placement/*.png. Usage: python3 tools/census/10_placement_plot.py"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MPoly
from matplotlib.collections import PatchCollection

A = json.load(open(os.path.join(ROOT, 'gk3', 'data', 'placement_audit.json'), encoding='utf-8'))
M = json.load(open(os.path.join(ROOT, A['map']), encoding='utf-8'))
S = json.load(open(os.path.join(WORK, 'osm_streets.json'), encoding='utf-8'))
IMGD = os.path.join(ROOT, 'docs', 'research', 'img', 'placement'); os.makedirs(IMGD, exist_ok=True)
TOL = A['tolerance']
polys = [unp(b[10]) for b in M['buildings']]

def short(n, k=18):
    n = n or '?'
    return n if len(n) <= k else n[:k - 1] + '…'

COL = {'WRONG_STREET': '#c2255c', 'WITHIN': '#adb5bd', 'WRONG_SIDE': '#d0021b', 'WRONG_BUILDING': '#e8590c', 'SHIFTED': '#f59f00', 'DUPLICATE': '#ae3ec9', 'CLOSED': '#000000'}

def draw(ax, x0, z0, x1, z1, title, label_all=False):
    pts = []
    for c in polys:
        if any(x0 - 5 <= x <= x1 + 5 and z0 - 5 <= z <= z1 + 5 for x, z in c): pts.append(MPoly(c, closed=True))
    ax.add_collection(PatchCollection(pts, facecolor='#e9e6e0', edgecolor='#9a958c', linewidth=0.5))
    for nm, ws in S.items():
        for w in ws:
            xy = [P(a, b) for a, b in w['pts']]
            ax.plot([p[0] for p in xy], [p[1] for p in xy], color='#b8c7d9', lw=0.8, zorder=1)
    for s in A['signs']:
        gx, gz = s['game']['fx'], s['game']['fz']
        tf = s.get('tf'); fl = set(s['flags'])
        inb = x0 <= gx <= x1 and z0 <= gz <= z1
        tin = tf and x0 <= tf['fx'] <= x1 and z0 <= tf['fz'] <= z1
        if not (inb or tin): continue
        kind = s['truth']['kind'] if s.get('truth') else None
        if 'UNVERIFIED' in fl:
            ax.scatter([gx], [gz], s=10, marker='s', facecolor='none', edgecolor='#868e96', lw=0.7, zorder=3)
            continue
        gcol = '#e599f7' if 'SINGLE_LISTING' in fl and not (fl & {'WRONG_SIDE', 'WRONG_BUILDING', 'WRONG_STREET', 'SHIFTED', 'DUPLICATE', 'CLOSED'}) else '#d0021b' if (fl & {'WRONG_SIDE', 'WRONG_BUILDING', 'WRONG_STREET', 'SHIFTED', 'DUPLICATE', 'CLOSED'}) else '#2b8a3e'
        ax.scatter([gx], [gz], s=16, marker='s', color=gcol, zorder=4)
        if tf:
            mk = 'o' if kind == 'osm' else '^' if kind == 'address' else 'v'
            tc = '#1c7ed6' if kind == 'osm' else '#0ca678' if kind == 'address' else '#66d9e8'
            ax.scatter([tf['fx']], [tf['fz']], s=18, marker=mk, color=tc, zorder=5, edgecolor='white', lw=0.3)
            if s['delta'] is not None and s['delta'] > TOL:
                f = next((k for k in ('DUPLICATE', 'WRONG_SIDE', 'WRONG_BUILDING', 'WRONG_STREET', 'SHIFTED', 'CLOSED') if k in fl), 'WITHIN')
                ax.plot([gx, tf['fx']], [gz, tf['fz']], color=COL[f], lw=1.0 if f != 'SHIFTED' else 0.8, ls='--' if f == 'DUPLICATE' else '-', zorder=4)
                if inb and f != 'WITHIN' and (s['delta'] > 6 or f != 'SHIFTED'):
                    ax.annotate(short(s['name']) + f' {s["delta"]:.0f}m', (gx, gz), fontsize=5.2, color=COL[f], xytext=(2, 2), textcoords='offset points', zorder=6)
            elif label_all and inb:
                ax.annotate(short(s['name'], 14), (gx, gz), fontsize=4.6, color='#2b8a3e', xytext=(2, -5), textcoords='offset points', zorder=6)
    for m in A['missing']:
        tf = m.get('tf') or {'fx': m['x'], 'fz': m['z']}
        if x0 <= tf['fx'] <= x1 and z0 <= tf['fz'] <= z1:
            ax.scatter([tf['fx']], [tf['fz']], s=30, marker='x', color='black', zorder=6)
            ax.annotate('MISSING ' + short(m['name']), (tf['fx'], tf['fz']), fontsize=5.2, color='black', xytext=(2, -6), textcoords='offset points')
    ax.set_xlim(x0, x1); ax.set_ylim(z1, z0)  # z grows south -> north up
    ax.set_aspect('equal'); ax.set_title(title, fontsize=9)
    ax.tick_params(labelsize=6); ax.grid(color='#eeeeee', lw=0.4)

def legend(fig):
    from matplotlib.lines import Line2D
    h = [Line2D([], [], marker='s', color='#2b8a3e', ls='', label='game sign, correct (<= 4 m)'),
         Line2D([], [], marker='s', color='#d0021b', ls='', label='game sign, misplaced'),
         Line2D([], [], marker='s', color='#e599f7', ls='', label='game sign, single listing (within its error)'),
         Line2D([], [], color=COL['WITHIN'], label='delta > 4 m but within the address error'),
         Line2D([], [], marker='s', mfc='none', mec='#868e96', ls='', label='game sign, address unverified'),
         Line2D([], [], marker='o', color='#1c7ed6', ls='', label='real: OSM surveyed (at its facade)'),
         Line2D([], [], marker='^', color='#0ca678', ls='', label='real: verified address (census best position)'),
         Line2D([], [], marker='v', color='#66d9e8', ls='', label='real: single listing (census best position)'),
         Line2D([], [], color=COL['WRONG_SIDE'], label='delta: wrong side of street'),
         Line2D([], [], color=COL['WRONG_BUILDING'], label='delta: wrong building'),
         Line2D([], [], color=COL['WRONG_STREET'], label='delta: faces the wrong street'),
         Line2D([], [], color=COL['SHIFTED'], label='delta: same building, shifted > 4 m'),
         Line2D([], [], color=COL['DUPLICATE'], ls='--', label='duplicate sign (line to the real place)'),
         Line2D([], [], marker='x', color='black', ls='', label='real business with no game sign')]
    fig.legend(handles=h, loc='lower center', ncol=4, fontsize=6.5, frameon=False)

VIEWS = [  # name, x0, z0, x1, z1 (game metres; z grows south, north is up in the images)
    ('kassaveti_west_platanos', -110, -30, 90, 130),
    ('spawn_kassaveti_east', 70, -10, 250, 120),
    ('kyriazi', 30, 40, 150, 175),
    ('levidou_south', 80, -90, 260, 70),
    ('levidou_north', 80, -235, 260, -80),
    ('kifisias_north', -160, -255, 40, -60),
    ('kifisias_south', -160, -75, 40, 135),
    ('kolokotroni_argyropoulou_west', 140, -200, 340, 35),
    ('kolokotroni_argyropoulou_east', 330, -200, 630, 35),
]

def bounds_of_signs():
    xs = [s['game']['fx'] for s in A['signs']]; zs = [s['game']['fz'] for s in A['signs']]
    return min(xs), min(zs), max(xs), max(zs)

if __name__ == '__main__':
    only = sys.argv[1:]
    # overview
    x0, z0, x1, z1 = bounds_of_signs()
    fig, ax = plt.subplots(figsize=(13, 13 * (z1 - z0 + 40) / (x1 - x0 + 40)))
    draw(ax, x0 - 20, z0 - 20, x1 + 20, z1 + 20, 'Placement audit overview — game sign → real position, lines for delta > 4 m (map ' + str(A['mapV'] or '') + ')')
    legend(fig); fig.tight_layout(rect=(0, 0.05, 1, 1)); fig.savefig(os.path.join(IMGD, 'overview.png'), dpi=110); plt.close(fig)
    for nm, a, b, c, d in VIEWS:
        if only and nm not in only: continue
        fig, ax = plt.subplots(figsize=(11, 11 * (d - b) / (c - a)))
        draw(ax, a, b, c, d, nm.replace('_', ' ') + '  (x %d..%d, z %d..%d m)' % (a, c, b, d), label_all=True)
        legend(fig); fig.tight_layout(rect=(0, 0.06, 1, 1)); fig.savefig(os.path.join(IMGD, nm + '.png'), dpi=130); plt.close(fig)
    print('wrote', IMGD)
