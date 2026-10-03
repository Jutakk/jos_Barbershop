"""Builds the master logo files in logo/ from the vector drawing reference/jos-logo.svg.

The hand-drawn wordmark (J, o, apostrophe, s) is taken from the drawing as it is, with two
repairs on the o: three stray fragments of the tracing at the top of the o are dropped, and
the step on the outer edge and the wavy inner edge at the top left of the o are bridged
with smooth curves. BARBERSHOP is set in Arial Regular and converted to outlines. The two
dashes are straight bars as thick as the Arial stem, at the same height.

Usage, from the repository root:
    python3 logo/izvor/build_svg.py
The Arial Regular font file is read from logo/izvor/fonts/Arial.TTF or from the path in
the ARIAL_TTF environment variable (see logo/izvor/README.md).
"""
import os
import re
import sys

import cairosvg
import numpy as np
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from scipy.ndimage import gaussian_filter1d
from svgelements import Matrix, Path

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bezfit import fit_ring, path_d  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
SOURCE = os.path.join(ROOT, 'reference', 'jos-logo.svg')
OUT_DIR = os.path.join(ROOT, 'logo')
PODACI = os.path.join(HERE, 'podaci')
FONT = os.environ.get('ARIAL_TTF', os.path.join(HERE, 'fonts', 'Arial.TTF'))

CANVAS = 2048
LOGO_MAX = 1260.0          # largest logo dimension in px, the rest is margin

# Paths of reference/jos-logo.svg, in file order
P_DASH_RIGHT, P_J, P_S, P_APOSTROPHE, P_STRAY_1, P_STRAY_2, P_O = 0, 1, 2, 3, 4, 5, 6
P_DASH_LEFT = 17

# BARBERSHOP, in the units of the 1500 x 1500 viewBox of reference/jos-logo.svg
CAP_HEIGHT = 73.80         # cap height measured on the rectified shop sign
BASELINE = 1080.4          # baseline measured on the rectified shop sign
TRACKING = 0.0518          # em, fitted to the letter positions of the drawing
ORIGIN_X = 560.05          # pen position of the first B, fitted to the drawing
# Dashes: length and position of the drawing without the glow of the tracing (1.6 per end),
# both at the height measured on the sign, as thick as the Arial stem
DASH_Y = 1046.0
DASH_GLOW = 1.6

H = 0.2                    # sampling step along outlines, drawing units


# ---------- repair of the o ----------

def ring(d):
    p = Path(d)
    n = int(p.length() / H)
    return np.array([[q.x, q.y] for q in (p.point(t) for t in np.linspace(0, 1, n, endpoint=False))])


def bridge(P, center, half, anchor=12.0):
    """Replace the closed outline P around `center` (half length `half`) by a C1 cubic Hermite curve."""
    n = len(P)
    j = int(np.argmin(np.sum((P - np.array(center))**2, 1)))
    a = (j - int(half / H)) % n
    b = (j + int(half / H)) % n
    k = int(anchor / H)
    ta = P[a] - P[(a - k) % n]
    ta /= np.linalg.norm(ta)
    tb = P[(b + k) % n] - P[b]
    tb /= np.linalg.norm(tb)
    L = np.linalg.norm(P[b] - P[a])
    m = int(2 * half / H)
    t = np.linspace(0, 1, m + 1)[:, None]
    B = ((2*t**3 - 3*t**2 + 1) * P[a] + (t**3 - 2*t**2 + t) * L * ta
         + (-2*t**3 + 3*t**2) * P[b] + (t**3 - t**2) * L * tb)
    Q = P.copy()
    for i in range(m + 1):
        Q[(a + i) % n] = B[i]
    return Q


def kinks(P, thr, k=8):
    """Indices where the outline turns sharper than its smoothed surroundings by more than thr degrees."""
    a = np.roll(P, k, 0)
    b = np.roll(P, -k, 0)
    v1 = P - a
    v2 = b - P
    c = np.sum(v1 * v2, 1) / (np.linalg.norm(v1, axis=1) * np.linalg.norm(v2, axis=1) + 1e-9)
    ang = np.degrees(np.arccos(np.clip(c, -1, 1)))
    base = gaussian_filter1d(np.r_[ang, ang, ang], 60)[len(ang):2 * len(ang)]
    ex = ang - base
    n = len(P)
    out = []
    for j in np.argsort(-ex):
        if ex[j] < thr:
            break
        if all(min(abs(j - s), n - abs(j - s)) > 40 for s in out):
            out.append(int(j))
    return out


def local_smooth(P, idxs, sigma=6.0, R=14.0):
    n = len(P)
    sg = sigma / H
    pad = int(4 * sg)
    X = np.vstack([P[-pad:], P, P[:pad]])
    G = np.c_[gaussian_filter1d(X[:, 0], sg), gaussian_filter1d(X[:, 1], sg)][pad:pad + n]
    s = np.arange(n) * H
    w = np.zeros(n)
    for j in idxs:
        d = np.minimum(abs(s - s[j]), n * H - abs(s - s[j]))
        w = np.maximum(w, np.exp(-(d / R)**2))
    return P + w[:, None] * (G - P)


def repaired_o(d):
    """Outer and inner outline of the o; the tiny middle subpath is a stray tracing fragment."""
    subs = list(Path(d).as_subpaths())
    outer = bridge(ring(subs[0]), (662.8, 607.5), half=22)
    inner = bridge(ring(subs[2]), (668.0, 626.0), half=55, anchor=10.0)
    for P in (outer, inner):
        for _ in range(3):
            ks = kinks(P, 3.0)
            if not ks:
                break
            P[:] = local_smooth(P, ks)
    return path_d(fit_ring(outer, 0.05, k=6, deg=30)) + path_d(fit_ring(inner, 0.05, k=6, deg=30))


# ---------- layout ----------

def fmt(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


def transform_d(d, m):
    """Path with the transform applied, absolute coordinates rounded to 0.01 px."""
    p = Path(d) * m
    p.reify()
    return re.sub(r'-?\d+(?:\.\d+)?(?:e-?\d+)?', lambda g: fmt(float(g.group())), p.d(relative=False))


def build(background):
    svg = open(SOURCE, encoding='utf-8').read()
    paths = re.findall(r'<path d="([^"]+)"/>', svg)
    wordmark = {
        'J': paths[P_J],
        'o': repaired_o(paths[P_O]),
        'apostrophe': paths[P_APOSTROPHE],
        's': paths[P_S],
    }

    font = TTFont(FONT)
    gset = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font['head'].unitsPerEm

    def bounds(g):
        bp = BoundsPen(gset)
        gset[g].draw(bp)
        return bp.bounds

    su = CAP_HEIGHT / bounds(cmap[ord('H')])[3]   # drawing units per font unit
    glyphs = []
    pen_x = 0.0
    for ch in 'BARBERSHOP':
        g = cmap[ord(ch)]
        glyphs.append((g, ORIGIN_X + pen_x * su))
        pen_x += gset[g].width + TRACKING * upm
    ink_l = glyphs[0][1] + bounds(glyphs[0][0])[0] * su
    ink_r = glyphs[-1][1] + bounds(glyphs[-1][0])[2] * su
    stem = (bounds(cmap[ord('I')])[2] - bounds(cmap[ord('I')])[0]) * su

    def extent(i):
        return Path(paths[i]).bbox()
    dl = extent(P_DASH_LEFT)
    dr = extent(P_DASH_RIGHT)
    length = ((dl[2] - dl[0]) + (dr[2] - dr[0])) / 2 - 2 * DASH_GLOW
    gap = ((ink_l - (dl[2] - DASH_GLOW)) + ((dr[0] + DASH_GLOW) - ink_r)) / 2
    dashes = [(ink_l - gap - length, ink_l - gap), (ink_r + gap, ink_r + gap + length)]

    # bounding box of the whole logo in drawing units
    xs, ys = [], []
    for d in wordmark.values():
        b = Path(d).bbox()
        xs += [b[0], b[2]]
        ys += [b[1], b[3]]
    for g, gx in glyphs:
        b = bounds(g)
        xs += [gx + b[0] * su, gx + b[2] * su]
        ys += [BASELINE - b[3] * su, BASELINE - b[1] * su]
    for x0, x1 in dashes:
        xs += [x0, x1]
        ys += [DASH_Y - stem / 2, DASH_Y + stem / 2]
    bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
    S = LOGO_MAX / max(bx1 - bx0, by1 - by0)
    ox = CANVAS / 2 - S * (bx0 + bx1) / 2
    oy = CANVAS / 2 - S * (by0 + by1) / 2
    m = Matrix(S, 0, 0, S, ox, oy)

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           f'<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS}" height="{CANVAS}" viewBox="0 0 {CANVAS} {CANVAS}">',
           "  <title>Jo's Barbershop logo</title>"]
    if background:
        out.append(f'  <rect id="background" width="{CANVAS}" height="{CANVAS}" fill="#000000"/>')
    out.append('  <g id="logo" fill="#FFFFFF">')
    out.append('    <g id="wordmark">')
    for name, d in wordmark.items():
        out.append(f'      <path id="{name}" fill-rule="evenodd" d="{transform_d(d, m)}"/>')
    out.append('    </g>')
    out.append('    <g id="barbershop">')
    for i, (g, gx) in enumerate(glyphs):
        pen = SVGPathPen(gset, ntos=fmt)
        gset[g].draw(TransformPen(pen, (su * S, 0, 0, -su * S, gx * S + ox, BASELINE * S + oy)))
        out.append(f'      <path id="letter-{i + 1}-{g}" d="{pen.getCommands()}"/>')
    for name, (x0, x1) in zip(('left', 'right'), dashes):
        out.append(f'      <rect id="dash-{name}" x="{fmt(x0 * S + ox)}" y="{fmt((DASH_Y - stem / 2) * S + oy)}" '
                   f'width="{fmt((x1 - x0) * S)}" height="{fmt(stem * S)}"/>')
    out.append('    </g>')
    out.append('  </g>')
    out.append('</svg>')
    info = dict(S=S, ox=ox, oy=oy, ink=(ink_l, ink_r), gap=gap, length=length, stem=stem)
    return '\n'.join(out) + '\n', info


def disc_on_canvas(info):
    """Centre and radius of the round shop sign in the canvas coordinates (for the 3D sign)."""
    A = np.load(os.path.join(PODACI, 'A_jos-logo2znak.npy'))      # drawing -> rectified sign
    ell = np.load(os.path.join(PODACI, 'disc_ellipse.npy'))      # cx, cy, a, b, angle on the photo
    radius_sign = ell[3] / 2 * 4                                  # rectified sign px (scale 4)
    M = np.linalg.inv(np.vstack([A, [0, 0, 1]]))[:2]
    c = M[:, :2] @ np.array([393.0, 393.0]) + M[:, 2]
    r = radius_sign / np.sqrt(abs(np.linalg.det(A[:, :2])))
    S = info['S']
    return c[0] * S + info['ox'], c[1] * S + info['oy'], r * S


if __name__ == '__main__':
    for background, name in ((True, 'jos-barbershop-logo'), (False, 'jos-barbershop-logo-transparent')):
        svg, info = build(background)
        svg_path = os.path.join(OUT_DIR, name + '.svg')
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(svg)
        cairosvg.svg2png(url=svg_path, write_to=os.path.join(OUT_DIR, name + '-2048.png'),
                         output_width=CANVAS, output_height=CANVAS)
    print('text ink %.2f..%.2f  dash gap %.2f  dash length %.2f  stem %.2f (drawing units)'
          % (info['ink'][0], info['ink'][1], info['gap'], info['length'], info['stem']))
    cx, cy, r = disc_on_canvas(info)
    print('disc centre %.1f %.1f  radius %.1f (SVG px)' % (cx, cy, r))
