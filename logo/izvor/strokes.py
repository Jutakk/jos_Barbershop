import numpy as np
from scipy.interpolate import splprep, splev, UnivariateSpline
from shapely.geometry import Polygon
from shapely.ops import unary_union

def _arclen(P):
    return np.r_[0, np.cumsum(np.hypot(*np.diff(P,axis=0).T))]

def centerline(pts, closed=False, smooth=0.0, step=0.2):
    P = np.array(pts, float)
    if closed:
        P = np.vstack([P, P[:1]])
    tck,u = splprep(P.T, s=smooth, per=1 if closed else 0, k=3)
    uu = np.linspace(0,1,4000); xy = np.array(splev(uu,tck)).T
    s = _arclen(xy)
    n = max(8,int(s[-1]/step))
    us = np.interp(np.linspace(0,s[-1],n), s, uu)
    C = np.array(splev(us,tck)).T
    d = np.array(splev(us,tck,der=1)).T
    d /= np.linalg.norm(d,axis=1,keepdims=True)
    N = np.c_[-d[:,1], d[:,0]]
    S = _arclen(C)
    return C, N, S

def width_profile(S, knots):
    """knots: list of (t, w) with t in [0,1] fraction of length; monotone cubic interpolation."""
    from scipy.interpolate import PchipInterpolator
    t = np.array([k[0] for k in knots]); w = np.array([k[1] for k in knots])
    f = PchipInterpolator(t, w)
    return np.clip(f(S/S[-1]), 0, None)

def stroke_polygon(C, N, W, start='tip', end='tip', capres=24):
    L = C + N*W[:,None]/2
    R = C - N*W[:,None]/2
    ring = list(L)
    if end == 'round':
        c = C[-1]; r = W[-1]/2; n0 = N[-1]
        a0 = np.arctan2(n0[1], n0[0])
        d = C[-1]-C[-2]; d/=np.linalg.norm(d)
        # sweep from +n to -n through forward direction
        sgn = np.sign(np.cross(n0, d)) or 1
        for a in np.linspace(0, np.pi, capres)[1:-1]:
            ang = a0 + sgn*a
            ring.append(c + r*np.array([np.cos(ang), np.sin(ang)]))
    ring += list(R[::-1])
    if start == 'round':
        c = C[0]; r = W[0]/2; n0 = -N[0]
        a0 = np.arctan2(n0[1], n0[0])
        d = C[0]-C[1]; d/=np.linalg.norm(d)
        sgn = np.sign(np.cross(n0, d)) or 1
        for a in np.linspace(0, np.pi, capres)[1:-1]:
            ang = a0 + sgn*a
            ring.append(c + r*np.array([np.cos(ang), np.sin(ang)]))
    return Polygon(ring).buffer(0)

def ring_polygon(C, N, W):
    outer = C + N*W[:,None]/2
    inner = C - N*W[:,None]/2
    a = Polygon(outer).buffer(0); b = Polygon(inner).buffer(0)
    big, small = (a,b) if a.area > b.area else (b,a)
    return big.difference(small)
