import numpy as np
from scipy.ndimage import gaussian_filter1d
from shapely.geometry import Polygon, MultiPolygon

def _resample(P, h):
    P = np.vstack([P, P[:1]])
    s = np.r_[0, np.cumsum(np.hypot(*np.diff(P,axis=0).T))]
    n = max(16, int(s[-1]/h))
    t = np.linspace(0, s[-1], n, endpoint=False)
    return np.c_[np.interp(t, s, P[:,0]), np.interp(t, s, P[:,1])]

def _turn(P, k):
    a = np.roll(P, k, 0); b = np.roll(P, -k, 0)
    v1 = P - a; v2 = b - P
    c = np.sum(v1*v2,1)/(np.linalg.norm(v1,axis=1)*np.linalg.norm(v2,axis=1)+1e-12)
    return np.degrees(np.arccos(np.clip(c,-1,1)))

def smooth_ring(coords, h=0.2, sigma=1.2, corner_deg=40.0):
    P = _resample(np.array(coords)[:-1], h)
    n = len(P); k = max(2, int(0.8/h))
    ang = _turn(P, k)
    # corners: local maxima above threshold
    cand = np.where(ang > corner_deg)[0]
    corners = []
    for i in cand:
        w = ang[[(i+j) % n for j in range(-k, k+1)]]
        if ang[i] >= w.max(): corners.append(i)
    # merge close corners
    corners = sorted(set(corners))
    merged = []
    for c in corners:
        if not merged or (c - merged[-1]) > 2*k: merged.append(c)
    if merged and (merged[0] + n - merged[-1]) <= 2*k and len(merged) > 1: merged.pop()
    sig = sigma/h
    if not merged:
        X = np.vstack([P[-3*int(sig)-3:], P, P[:3*int(sig)+3]])
        Xs = np.c_[gaussian_filter1d(X[:,0], sig), gaussian_filter1d(X[:,1], sig)]
        out = Xs[3*int(sig)+3: 3*int(sig)+3+n]
    else:
        out = P.copy()
        m = len(merged)
        for a_i in range(m):
            a = merged[a_i]; b = merged[(a_i+1) % m]
            idx = [(a + j) % n for j in range(((b - a) % n) + 1)] if m > 1 else [(a + j) % n for j in range(n+1)]
            seg = P[idx]
            if len(seg) < 5: continue
            pad = min(len(seg)-1, 3*int(sig)+3)
            # odd reflection keeps endpoints fixed
            left = 2*seg[0] - seg[1:pad+1][::-1]
            right = 2*seg[-1] - seg[-pad-1:-1][::-1]
            X = np.vstack([left, seg, right])
            Xs = np.c_[gaussian_filter1d(X[:,0], sig), gaussian_filter1d(X[:,1], sig)]
            Xs = Xs[pad:pad+len(seg)]
            # blend weight: keep exact near the corners
            for jj, ii in enumerate(idx[1:-1], start=1):
                out[ii] = Xs[jj]
    return out

def smooth_geom(g, **kw):
    gs = g.geoms if hasattr(g, 'geoms') else [g]
    res = []
    for p in gs:
        ext = smooth_ring(np.array(p.exterior.coords), **kw)
        holes = [smooth_ring(np.array(r.coords), **kw) for r in p.interiors]
        res.append(Polygon(ext, holes).buffer(0))
    return res[0] if len(res) == 1 else MultiPolygon(res)
