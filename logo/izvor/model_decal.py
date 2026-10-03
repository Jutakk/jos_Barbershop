import numpy as np
from fitdecal import *
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

def build(tail_tip=None, tail_extra=None):
    out = {}
    # J main
    top = [(196.0,61.0,8.6),(194.6,66,9.0),(193.4,71.5,9.2),(192.1,77.3,9.3),(190.8,83.1,9.4),(189.6,89,9.4),(188.4,95,9.4),(187.2,101,9.4)]
    body = clean('J_main', ylim=(105,330))
    pts = top + body
    if tail_extra: pts += tail_extra
    if tail_tip: pts += [tail_tip]
    C,N,S,W = fit(pts, sig=0.45, wsig=0.4)
    W = taper(S, W, end=(S[-1]-np.interp(312, C[:,1], S)) if tail_tip else 8, p=1.0)
    out['J_main'] = stroke_polygon(C,N,W,start='round',end='tip')
    out['_J_main'] = (C,N,S,W)
    # J entry
    ent = [(139.8,187.6,0.6)] + clean('J_entry', ylim=(110,186)) + [(179.6,100,5.6),(183.4,90.5,5.6),(186.6,82,5.4),(189.6,74,5.0),(192.0,68,4.6)]
    C,N,S,W = fit(ent, sig=0.35, wsig=0.35)
    W = taper(S, W, start=7, end=3, p=0.9)
    out['J_entry'] = stroke_polygon(C,N,W,start='tip',end='tip')
    out['_J_entry'] = (C,N,S,W)
    # o
    C,N,S,W = fit(clean('o'), closed=True, sig=0.45, wsig=0.75)
    out['o'] = ring_polygon(C,N,W)
    out['_o'] = (C,N,S,W)
    # s
    sp = [(256.0,159.0,0.5)] + clean('s') + [(220.6,217.6,0.6)]
    C,N,S,W = fit(sp, sig=0.5, wsig=0.85)
    W = taper(S, W, start=12, end=7)
    out['s'] = stroke_polygon(C,N,W,start='tip',end='tip')
    out['_s'] = (C,N,S,W)
    return out
