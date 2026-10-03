import numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.basePen import BasePen
from shapely.geometry import Polygon
from shapely.ops import unary_union

class FlatPen(BasePen):
    def __init__(self, gs, steps=16):
        super().__init__(gs); self.contours=[]; self.cur=[]; self.steps=steps
    def _moveTo(self,p): self.cur=[p]
    def _lineTo(self,p): self.cur.append(p)
    def _curveToOne(self,p1,p2,p3):
        p0=self.cur[-1]
        for t in np.linspace(0,1,self.steps)[1:]:
            a=(1-t)**3;b=3*(1-t)**2*t;c=3*(1-t)*t**2;d=t**3
            self.cur.append((a*p0[0]+b*p1[0]+c*p2[0]+d*p3[0], a*p0[1]+b*p1[1]+c*p2[1]+d*p3[1]))
    def _qCurveToOne(self,p1,p2):
        p0=self.cur[-1]
        for t in np.linspace(0,1,self.steps)[1:]:
            a=(1-t)**2;b=2*(1-t)*t;c=t**2
            self.cur.append((a*p0[0]+b*p1[0]+c*p2[0], a*p0[1]+b*p1[1]+c*p2[1]))
    def _closePath(self):
        if len(self.cur)>2: self.contours.append(self.cur)
        self.cur=[]
    _endPath=_closePath

FONTS = {
 'liberation': '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
}
_cache={}
def font(name):
    if name not in _cache:
        f=TTFont(FONTS[name]); _cache[name]=f
    return _cache[name]

def cap_height(name):
    f=font(name)
    os2=f['OS/2']
    ch=getattr(os2,'sCapHeight',0)
    if not ch:
        # measure H
        gs=f.getGlyphSet(); pen=FlatPen(gs); gs[f.getBestCmap()[ord('H')]].draw(pen)
        ch=max(p[1] for c in pen.contours for p in c)
    return ch, f['head'].unitsPerEm

def text_contours(text, name, tracking_em=0.0):
    """returns list of (glyph_contours) in font units, y up, with x advance incl tracking. Also returns ink bbox."""
    f=font(name); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    x=0; out=[]
    for i,ch in enumerate(text):
        g=cmap[ord(ch)]; pen=FlatPen(gs); gs[g].draw(pen)
        for c in pen.contours:
            out.append(np.array(c)+[x,0])
        x+=gs[g].width + tracking_em*upm
    return out

def contours_to_geom(contours):
    # even-odd via symmetric difference accumulation
    geom=None
    for c in contours:
        p=Polygon(c).buffer(0)
        geom=p if geom is None else geom.symmetric_difference(p)
    return geom
