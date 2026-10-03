import numpy as np, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scipy.interpolate import splprep, splev, PchipInterpolator
from shapely import affinity
from shapely.geometry import Polygon
from shapely.ops import unary_union
from model_decal import build
from strokes import stroke_polygon
from textgeom import *

PODACI = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'podaci')
A = np.load(os.path.join(PODACI, 'A_decal2rect1.npy'))   # decal px -> rect1 px
SC = 2.5                            # rect10 -> rect1
TXT = json.load(open(os.path.join(PODACI, 'textfit.json')))['liberation']  # h, trk, x, yb, sig (rect10)

def tf(P): return P@A[:,:2].T + A[:,2]
def aff(g): return affinity.affine_transform(g, [A[0,0],A[0,1],A[1,0],A[1,1],A[0,2],A[1,2]])

def resample_curve(P, smooth, step=0.25):
    tck,u = splprep(P.T, s=smooth, k=3)
    uu=np.linspace(0,1,8000); C=np.array(splev(uu,tck)).T
    S=np.r_[0,np.cumsum(np.hypot(*np.diff(C,axis=0).T))]
    n=int(S[-1]/step); us=np.interp(np.linspace(0,S[-1],n),S,uu)
    C=np.array(splev(us,tck)).T; d=np.array(splev(us,tck,der=1)).T; d/=np.linalg.norm(d,axis=1,keepdims=True)
    N=np.c_[-d[:,1],d[:,0]]; S=np.r_[0,np.cumsum(np.hypot(*np.diff(C,axis=0).T))]
    return C,N,S

from scipy.interpolate import UnivariateSpline
from fitdecal import clean, fit

def to_rect1(C,N,W):
    L2,R2 = tf(C+N*W[:,None]/2), tf(C-N*W[:,None]/2); C2=(L2+R2)/2
    d=np.gradient(C2,axis=0); d/=np.linalg.norm(d,axis=1,keepdims=True); n2=np.c_[-d[:,1],d[:,0]]
    return C2, np.abs(np.sum((L2-R2)*n2,1))

def stroke_xy(ys, xs, ws, sx, swt, y0, y1, wfun=None, step=0.25):
    """smooth stroke parameterised by y (monotonic). returns C,N,W on [y0,y1] going from y0 to y1"""
    o=np.argsort(ys); ys,xs,ws,sx=ys[o],xs[o],ws[o],sx[o]
    fx=UnivariateSpline(ys,xs,w=1/sx,s=len(ys))
    fw=UnivariateSpline(ys,ws,w=1/swt[o] if np.ndim(swt) else np.full(len(ys),1/swt),s=len(ys))
    yy=np.linspace(y0,y1,4000); xx=fx(yy)
    P=np.c_[xx,yy]; S=np.r_[0,np.cumsum(np.hypot(*np.diff(P,axis=0).T))]
    n=int(S[-1]/step); t=np.linspace(0,S[-1],n)
    yy=np.interp(t,S,yy); C=np.c_[fx(yy),yy]
    d=np.c_[fx.derivative()(yy),np.ones_like(yy)]*np.sign(y1-y0); d/=np.linalg.norm(d,axis=1,keepdims=True)
    N=np.c_[-d[:,1],d[:,0]]
    W=np.clip(fw(yy),0,None) if wfun is None else wfun(yy, fw)
    return C,N,W

def J_parts():
    # --- main: axis = gently curved top + straight middle + slight angle near the bottom,
    #     fitted to the J edges on the rectified sign (podaci/j_axis_params.npy);
    #     widths are perpendicular widths measured on the sign
    pa = np.load(os.path.join(PODACI, 'j_axis_params.npy'))
    def axis_x(yy):
        a_, b_, c_, yk, s1, d_, yt, s2 = pa
        sp = lambda z: np.logaddexp(0, z)
        return a_ + b_*(yy-400) + c_*s1*sp((yy-yk)/s1) + d_*s2*sp((yt-yy)/s2)
    y_top, y_tip = 128.8, 627.0
    yy = np.linspace(y_top, y_tip, 20000)
    P = np.c_[axis_x(yy), yy]
    S = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
    t = np.linspace(0, S[-1], int(S[-1]/0.25))
    yy = np.interp(t, S, yy)
    Cm = np.c_[axis_x(yy), yy]
    d = np.gradient(Cm, axis=0); d /= np.linalg.norm(d, axis=1, keepdims=True)
    Nm = np.c_[-d[:,1], d[:,0]]
    kn_y = np.array([128.8,150,175,200,250,330,370,400,430,460,486,500,515,530,545,560,575,590,603,615,627.0])
    kn_w = np.array([16.2,17.8,19.0,19.5,19.6,19.8,19.4,18.9,18.2,17.1,15.0,14.0,12.8,11.5,10.0,8.7,7.2,5.6,4.0,2.2,0.0])
    Wm = PchipInterpolator(kn_y, kn_w)(np.clip(yy, kn_y[0], 627))
    Wm[-1] = 0
    main = stroke_polygon(Cm,Nm,Wm,start='round',end='tip')
    # --- entry: follows the measured combined left edge of the window photo, then fades inside the main stroke
    ent = [(139.8,187.6,0.6)] + clean('J_entry', ylim=(110,186)) + [
        (179.45,100,5.5),(181.95,94.5,5.5),(184.4,89,5.5),(186.15,83.3,5.5),(188.1,77.5,5.5),
        (190.2,72,5.4),(192.5,66.5,5.0),(194.3,62.8,4.2)]
    Ce,Ne,Se,We = fit(ent, sig=0.30, wsig=0.30)
    Ce2,We2 = to_rect1(Ce,Ne,We)
    ys,xs,ws = Ce2[:,1],Ce2[:,0],We2
    sx=np.full(len(ys),0.45); sw=np.full(len(ys),0.45)
    y_start = Ce2[0,1]; y_end = Ce2[-1,1]
    def wfun_e(yy, fw):
        w=np.clip(fw(yy),0,None)
        st=(y_start-yy)<14
        w[st]=w[st]*((y_start-yy[st])/14.0)**0.9
        en=(yy-y_end)<10
        w[en]=w[en]*np.clip((yy[en]-y_end)/10.0,0,1)**0.7
        return w
    Ce3,Ne3,We3 = stroke_xy(ys,xs,ws,sx,sw,y_start,y_end,wfun=wfun_e)
    We3[0]=0; We3[-1]=0
    entry = stroke_polygon(Ce3,Ne3,We3,start='tip',end='tip')
    return main, entry, (Cm,Nm,Wm), (Ce3,Ne3,We3)

def apostrophe():
    P = np.array([(435.3,246.0),(434.4,257),(433.5,268),(432.7,278),(432.0,288),(431.7,297),(431.6,306.5)])
    C,N,S = resample_curve(P, smooth=0.5)
    kn_y = np.array([246,252,256,260,264,268,272,276,280,284,288,292,296,300,304,306.5])
    kn_w = np.array([0,0.7,1.0,1.4,1.7,2.0,2.2,2.4,2.6,2.8,3.0,2.9,2.5,1.9,1.0,0])
    W = PchipInterpolator(kn_y,kn_w)(np.clip(C[:,1],246,306.5))
    W[0]=0; W[-1]=0
    return stroke_polygon(C,N,W,start='tip',end='tip')

def wordmark():
    m = build()
    jm, je, (Cm,Nm,Wm), _ = J_parts()
    J = unary_union([jm, je]).buffer(0.6, resolution=32).buffer(-0.6, resolution=32)
    # top region only: the left edge runs straight from the round tip down to where the
    # entry stroke has joined and the stroke widens
    from shapely.geometry import box
    yc = Cm[0,1]; x0,y0,x1,y1 = J.bounds
    outer = box(x0-5, y0-5, x1+5, yc+48); inner = box(x0-5, y0-5, x1+5, yc+38)
    top = J.intersection(outer).convex_hull.intersection(outer)
    J = unary_union([J.difference(inner), top.intersection(outer)])
    from ringsmooth import smooth_geom
    raw = {'J': J, 'o': aff(m['o']), 'apostrophe': apostrophe(), 's': aff(m['s'])}
    return {k: smooth_geom(v, h=0.2, sigma=1.2, corner_deg=40.0) for k, v in raw.items()}

def text_layout():
    """BARBERSHOP + dashes, rect1 px. Returns dict with glyph contour lists (font units->rect1) and dash rects."""
    h,trk,x,yb,sig = TXT[:5]
    name='liberation'; ch,upm = cap_height(name)
    s = h/ch/SC                      # rect1 px per font unit
    x/=SC; yb/=SC
    f=font(name); gs=f.getGlyphSet(); cmap=f.getBestCmap()
    glyphs=[]; pen_x=0.0
    for c in 'BARBERSHOP':
        g=cmap[ord(c)]
        glyphs.append((g, x + pen_x*s, yb, s))
        pen_x += gs[g].width + trk*upm
    # ink extents
    first_lsb = 168; ink_l = x + first_lsb*s
    last = glyphs[-1]; ink_r = last[1] + 1258*s   # P xmax
    em = upm*s; stem = 191*s
    yc = yb - 633*s
    # measured dash starts (rect10): left xa=739.75 (len 90.42), right xa=1625.16
    gap_r = 1625.16/SC - ink_r
    gap_l = ink_l - (739.75+90.42)/SC
    gap = (gap_l+gap_r)/2
    L = em
    dashes = [(ink_l-gap-L, yc-stem/2, L, stem), (ink_r+gap, yc-stem/2, L, stem)]
    return dict(glyphs=glyphs, dashes=dashes, s=s, em=em, stem=stem, gap=gap, gap_l=gap_l, gap_r=gap_r,
                ink=(ink_l, ink_r), cap_top=yb-ch*s, baseline=yb, trk=trk)

if __name__=='__main__':
    t=text_layout()
    print({k:v for k,v in t.items() if k!='glyphs'})
    w=wordmark()
    for k,g in w.items(): print(k, g.geom_type, 'bounds', [round(b,1) for b in g.bounds], 'area', round(g.area,1))
