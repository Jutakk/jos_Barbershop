import numpy as np, json, os
from scipy.interpolate import splprep, splev, UnivariateSpline
from scipy.ndimage import median_filter
from strokes import *

PODACI = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'podaci')
M = json.load(open(os.path.join(PODACI, 'meas.json')))
BLUR = 1.4

def clean(name, con=30, wmax=None, ylim=None, drop=None):
    pts=[]
    ms = M[name]
    w = np.array([m['w'] for m in ms]); wm = median_filter(w, 7, mode='nearest')
    for m,wmed in zip(ms,wm):
        if m['con']<con: continue
        if abs(m['w']-wmed) > 1.2: continue
        if ylim and not (ylim[0] <= m['y'] <= ylim[1]): continue
        if drop and drop(m): continue
        wt = np.sqrt(max(m['w']**2 - BLUR**2, 0.3))
        pts.append((m['x'], m['y'], wt))
    return pts

def fit(points, closed=False, sig=0.35, wsig=0.35, step=0.2):
    P = np.array(points, float)
    keep = np.r_[True, np.hypot(*np.diff(P[:,:2],axis=0).T) > 0.3]
    P = P[keep]
    if closed and np.hypot(*(P[0,:2]-P[-1,:2])) < 0.3: P = P[:-1]
    xy = P[:,:2]
    if closed: xy_ = np.vstack([xy, xy[:1]])
    else: xy_ = xy
    tck,u = splprep(xy_.T, s=len(xy_)*sig**2, per=1 if closed else 0, k=3)
    uu = np.linspace(0,1,6000); C = np.array(splev(uu,tck)).T
    S = np.r_[0, np.cumsum(np.hypot(*np.diff(C,axis=0).T))]
    n = int(S[-1]/step)
    us = np.interp(np.linspace(0,S[-1],n), S, uu)
    C = np.array(splev(us,tck)).T
    d = np.array(splev(us,tck,der=1)).T; d/=np.linalg.norm(d,axis=1,keepdims=True)
    N = np.c_[-d[:,1], d[:,0]]
    S = np.r_[0, np.cumsum(np.hypot(*np.diff(C,axis=0).T))]
    idx = np.array([np.argmin(np.sum((C-p)**2,1)) for p in xy])
    sw = S[idx]; ww = P[:,2]
    o = np.argsort(sw); sw, ww = sw[o], ww[o]
    sw_u, inv = np.unique(np.round(sw,3), return_inverse=True)
    ww_u = np.array([ww[inv==i].mean() for i in range(len(sw_u))])
    if closed:
        L=S[-1]
        sw_e = np.r_[sw_u-L, sw_u, sw_u+L]; ww_e = np.r_[ww_u,ww_u,ww_u]
        f = UnivariateSpline(sw_e, ww_e, s=len(sw_e)*wsig**2)
    else:
        f = UnivariateSpline(sw_u, ww_u, s=len(sw_u)*wsig**2)
    W = np.clip(f(S), 0.2, None)
    return C, N, S, W

def taper(S, W, start=None, end=None, p=1.0):
    """smooth taper to a sharp point: f(u)=1-(1-u)^2 (finite tip angle, no kink where it starts)"""
    W = W.copy()
    if start:
        u = np.clip(S/start, 0, 1); W = W*(1-(1-u)**2)
    if end:
        u = np.clip((S[-1]-S)/end, 0, 1); W = W*(1-(1-u)**2)
    return W
