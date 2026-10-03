import numpy as np, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from final_model import wordmark, text_layout
from textgeom import font
from bezfit import fit_ring, path_d
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

CANVAS = 2048
LOGO_MAX = 1260.0   # largest logo dimension in px, rest is margin

def resample_ring(P, h):
    P = np.asarray(P, float)
    if not np.allclose(P[0], P[-1]): P = np.vstack([P, P[:1]])
    s = np.r_[0, np.cumsum(np.hypot(*np.diff(P,axis=0).T))]
    n = max(24, int(s[-1]/h))
    t = np.linspace(0, s[-1], n, endpoint=False)
    return np.c_[np.interp(t,s,P[:,0]), np.interp(t,s,P[:,1])]

def layout():
    wm = wordmark(); t = text_layout()
    xs=[]; ys=[]
    for g in wm.values():
        b = g.bounds; xs += [b[0], b[2]]; ys += [b[1], b[3]]
    f = font('liberation'); gs = f.getGlyphSet()
    for g, gx, yb, s in t['glyphs']:
        bp = BoundsPen(gs); gs[g].draw(bp); x0,y0,x1,y1 = bp.bounds
        xs += [gx+x0*s, gx+x1*s]; ys += [yb-y1*s, yb-y0*s]
    for (x,y,L,th) in t['dashes']:
        xs += [x, x+L]; ys += [y, y+th]
    bx0,bx1,by0,by1 = min(xs),max(xs),min(ys),max(ys)
    S = LOGO_MAX/max(bx1-bx0, by1-by0)
    off = np.array([CANVAS/2 - S*(bx0+bx1)/2, CANVAS/2 - S*(by0+by1)/2])
    return wm, t, S, off, (bx0,by0,bx1,by1)

def build(background=True, tol=0.10):
    wm, t, S, off, bb = layout()
    out = []
    out.append('<?xml version="1.0" encoding="UTF-8"?>')
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS}" height="{CANVAS}" viewBox="0 0 {CANVAS} {CANVAS}">')
    out.append("  <title>Jo's Barbershop logo</title>")
    if background:
        out.append(f'  <rect id="background" width="{CANVAS}" height="{CANVAS}" fill="#000000"/>')
    out.append('  <g id="logo" fill="#FFFFFF">')
    out.append('    <g id="wordmark">')
    for name in ('J','o','apostrophe','s'):
        g = wm[name]; gs_ = g.geoms if hasattr(g,'geoms') else [g]
        ds = []
        for p in gs_:
            for ring in [p.exterior] + list(p.interiors):
                P = np.array(ring.coords)*S + off
                P = resample_ring(P, 0.35)
                ds.append(path_d(fit_ring(P, tol)))
        out.append(f'      <path id="{name}" fill-rule="evenodd" d="{"".join(ds)}"/>')
    out.append('    </g>')
    out.append('    <g id="barbershop">')
    f = font('liberation'); gset = f.getGlyphSet()
    for i,(g, gx, yb, s) in enumerate(t['glyphs']):
        pen = SVGPathPen(gset, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
        tp = TransformPen(pen, (s*S, 0, 0, -s*S, gx*S+off[0], yb*S+off[1]))
        gset[g].draw(tp)
        out.append(f'      <path id="letter-{i+1}-{g}" d="{pen.getCommands()}"/>')
    for i,(x,y,L,th) in enumerate(t['dashes']):
        X,Y = np.array([x,y])*S+off
        out.append(f'      <rect id="dash-{"left" if i==0 else "right"}" x="{X:.2f}" y="{Y:.2f}" width="{L*S:.2f}" height="{th*S:.2f}"/>')
    out.append('    </g>')
    out.append('  </g>')
    out.append('</svg>')
    return '\n'.join(out)+'\n', S, off, bb

if __name__ == '__main__':
    import os, cairosvg
    from final_model import PODACI
    out_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    names = {True: 'jos-barbershop-logo', False: 'jos-barbershop-logo-transparent'}
    for bg, name in names.items():
        svg, S, off, bb = build(bg)
        svg_path = os.path.join(out_dir, name + '.svg')
        open(svg_path, 'w').write(svg)
        cairosvg.svg2png(url=svg_path, write_to=os.path.join(out_dir, name + '-2048.png'),
                         output_width=CANVAS, output_height=CANVAS)
    # position of the round sign (disc) in the logo coordinates, for the 3D sign texture
    cx, cy, A, B, ang = np.load(os.path.join(PODACI, 'disc_ellipse.npy'))
    disc_r = B/2*4*S
    disc_c = np.array([393.0, 393.0])*S + off
    print('scale %.5f  offset %.2f %.2f' % (S, off[0], off[1]))
    print('disc centre %.1f %.1f  radius %.1f (SVG px)' % (disc_c[0], disc_c[1], disc_r))
