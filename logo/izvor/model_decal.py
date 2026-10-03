import numpy as np
from fitdecal import *
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

def build():
    """o and s measured on the window photo (decal px)"""
    out = {}
    C,N,S,W = fit(clean('o'), closed=True, sig=0.45, wsig=0.75)
    out['o'] = ring_polygon(C,N,W)
    sp = [(256.0,159.0,0.5)] + clean('s') + [(220.6,217.6,0.6)]
    C,N,S,W = fit(sp, sig=0.5, wsig=0.85)
    W = taper(S, W, start=12, end=7)
    out['s'] = stroke_polygon(C,N,W,start='tip',end='tip')
    return out
