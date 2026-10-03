"""Schneider (Graphics Gems) cubic Bezier fitting for polylines, with corner splitting for closed rings."""
import numpy as np

def _bez(ctrl, t):
    t = np.asarray(t)[:,None]; p0,p1,p2,p3 = ctrl
    return (1-t)**3*p0 + 3*(1-t)**2*t*p1 + 3*(1-t)*t**2*p2 + t**3*p3
def _bez1(ctrl, t):
    t = np.asarray(t)[:,None]; p0,p1,p2,p3 = ctrl
    return 3*(1-t)**2*(p1-p0) + 6*(1-t)*t*(p2-p1) + 3*t**2*(p3-p2)
def _bez2(ctrl, t):
    t = np.asarray(t)[:,None]; p0,p1,p2,p3 = ctrl
    return 6*(1-t)*(p2-2*p1+p0) + 6*t*(p3-2*p2+p1)

def _chord(P):
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(P,axis=0).T))]
    return d/d[-1] if d[-1] > 0 else d

def _gen(P, u, t1, t2):
    p0, p3 = P[0], P[-1]
    A1 = t1[None,:]*(3*(1-u)**2*u)[:,None]
    A2 = t2[None,:]*(3*(1-u)*u**2)[:,None]
    C = np.array([[np.sum(A1*A1), np.sum(A1*A2)],[np.sum(A1*A2), np.sum(A2*A2)]])
    base = _bez([p0,p0,p3,p3], u)
    tmp = P - base
    X = np.array([np.sum(A1*tmp), np.sum(A2*tmp)])
    det = C[0,0]*C[1,1]-C[0,1]*C[1,0]
    seg = np.linalg.norm(p3-p0)
    if abs(det) > 1e-12:
        a1 = (X[0]*C[1,1]-X[1]*C[0,1])/det
        a2 = (C[0,0]*X[1]-C[1,0]*X[0])/det
    else:
        a1 = a2 = seg/3
    eps = 1e-6*seg
    if a1 < eps or a2 < eps:
        a1 = a2 = seg/3
    return np.array([p0, p0+t1*a1, p3+t2*a2, p3])

def _reparam(ctrl, P, u):
    d = _bez(ctrl,u)-P; d1 = _bez1(ctrl,u); d2 = _bez2(ctrl,u)
    num = np.sum(d*d1,1); den = np.sum(d1*d1,1)+np.sum(d*d2,1)
    with np.errstate(divide='ignore', invalid='ignore'):
        nu = u - np.where(np.abs(den)>1e-12, num/den, 0)
    nu = np.clip(nu, 0, 1)
    return nu

def _err(ctrl, P, u):
    d = np.sum((_bez(ctrl,u)-P)**2,1)
    i = int(np.argmax(d)); return d[i], i

def fit_open(P, tol, t1=None, t2=None):
    P = np.asarray(P, float)
    if len(P) == 2:
        seg = np.linalg.norm(P[1]-P[0])/3
        t1 = t1 if t1 is not None else (P[1]-P[0])/np.linalg.norm(P[1]-P[0])
        t2 = t2 if t2 is not None else (P[0]-P[1])/np.linalg.norm(P[1]-P[0])
        return [np.array([P[0], P[0]+t1*seg, P[1]+t2*seg, P[1]])]
    if t1 is None:
        v = P[min(2,len(P)-1)]-P[0]; t1 = v/np.linalg.norm(v)
    if t2 is None:
        v = P[-1-min(2,len(P)-1)]-P[-1]; t2 = v/np.linalg.norm(v)
    u = _chord(P)
    ctrl = _gen(P, u, t1, t2)
    e, i = _err(ctrl, P, u)
    if e < tol*tol: return [ctrl]
    if e < (4*tol)**2:
        for _ in range(20):
            u = _reparam(ctrl, P, u)
            ctrl = _gen(P, u, t1, t2)
            e, i = _err(ctrl, P, u)
            if e < tol*tol: return [ctrl]
    i = min(max(i,1), len(P)-2)
    tc = P[i-1]-P[i+1]; n = np.linalg.norm(tc)
    tc = tc/n if n > 0 else (P[i-1]-P[i])/np.linalg.norm(P[i-1]-P[i])
    return fit_open(P[:i+1], tol, t1, tc) + fit_open(P[i:], tol, -tc, t2)

def corners(P, k=4, deg=35.0):
    n = len(P)
    a = np.roll(P, k, 0); b = np.roll(P, -k, 0)
    v1 = P-a; v2 = b-P
    c = np.sum(v1*v2,1)/(np.linalg.norm(v1,axis=1)*np.linalg.norm(v2,axis=1)+1e-12)
    ang = np.degrees(np.arccos(np.clip(c,-1,1)))
    idx = []
    for i in np.where(ang > deg)[0]:
        w = ang[[(i+j) % n for j in range(-k, k+1)]]
        if ang[i] >= w.max() and (not idx or i-idx[-1] > 2*k): idx.append(i)
    if len(idx) > 1 and idx[0]+n-idx[-1] <= 2*k: idx.pop()
    return idx

def fit_ring(P, tol, k=4, deg=35.0):
    P = np.asarray(P, float)
    if np.allclose(P[0], P[-1]): P = P[:-1]
    cs = corners(P, k, deg)
    n = len(P)
    if not cs:
        # split at two far apart points, smooth tangents there
        i0 = 0; i1 = n//2
        def tan(i):
            v = P[(i-1) % n] - P[(i+1) % n]; return v/np.linalg.norm(v)
        s1 = np.vstack([P[i0:i1+1]]); s2 = np.vstack([P[i1:], P[:1]])
        return fit_open(s1, tol, -tan(i0), tan(i1)) + fit_open(s2, tol, -tan(i1), tan(i0))
    segs = []
    for j in range(len(cs)):
        a = cs[j]; b = cs[(j+1) % len(cs)]
        idx = [(a+m) % n for m in range(((b-a) % n) + 1)] if len(cs) > 1 else [(a+m) % n for m in range(n+1)]
        segs += fit_open(P[idx], tol)
    return segs

def path_d(curves, fmt='%.2f'):
    p0 = curves[0][0]
    out = ['M' + (fmt % p0[0]) + ' ' + (fmt % p0[1])]
    for c in curves:
        out.append('C' + ' '.join((fmt % c[i][0]) + ' ' + (fmt % c[i][1]) for i in (1,2,3)))
    out.append('Z')
    return ''.join(out)
