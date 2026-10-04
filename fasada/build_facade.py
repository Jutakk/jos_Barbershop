"""
Ground floor of the facade of Jo's Barbershop as a line drawing for the 3D hero.

All measurements are pixels of the rectified photo images/fasada.jpg (podaci/H_rect.npy turns the photo
into a straight elevation; one pixel there is one pixel of the photo at the sign). u goes to the right,
v goes down. The ground floor is regular: four round arches on one spacing, rusticated wall with
course joints every 47.5 px, wedge joints around the arches and a cornice on top.

Output:
  theme/jos-barbershop/assets/js/facade.js   line segments in sign units (disc radius = 1)
  fasada/fasada-prizemlje.svg                 the flat elevation, for checking
  python3 fasada/build_facade.py --check     also writes fasada/provjera.png, the lines on the photo

3D convention (scene.js): the wall is the plane of the wall plate of the sign. Each point is
[depth, y, z]: depth is how far the point lies behind the wall face (negative = in front of it),
y is up, z runs along the wall. Looking at the facade from the street, its right side comes
towards the camera (+z), its left side goes away (-z).
"""
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_JS = ROOT / 'theme/jos-barbershop/assets/js/facade.js'
OUT_SVG = ROOT / 'fasada/fasada-prizemlje.svg'

# ---- scale and the point where the sign is fixed to the wall
SCALE = 37.5                    # px per disc radius (the sign has a radius of 37.5 px on the photo)
ORIGIN = (790.0, 430.0)         # wall plate of the sign

# ---- building
X_LEFT = 70.0                   # left end of the white ground floor wall
X_RIGHT = 1053.0                # right corner, next to the pink neighbour
Y_GROUND = 712.0

# ---- arches
ARCH_FIRST = 198.2              # centre of the first arch
ARCH_STEP = 237.6               # spacing of the arches
ARCH_COUNT = 4
Y_SPRING = 492.0                # springing line (top of the jambs)
R_OPENING = 60.0                # edge of the opening in the wall face
R_BAND = 72.0                   # outer edge of the smooth arch band
REVEAL = 0.8                    # depth of the reveal to the window frame, in disc radii
Y_TRANSOM = 512.0               # frame between the arched top light and the window

# ---- joints, as offsets from the arch centre
KEY_TOP = 386.0                 # top of the keystone
KEY_HALF = 20.0
UPPER_JOINT = ((40.0, None), (66.0, 386.0))      # from the band up to the keystone level
MIDDLE_JOINT = ((59.5, None), (80.5, 424.5))     # from the band up to the first course
LOWER_JOINT = ((71.6, 484.0), (86.0, 472.0))     # from the band near the springing to the second course
COURSES = [424.5, 472.0, 519.5, 567.0, 614.5, 662.0]
RIGHT_END_JOINT = 1022.0        # vertical joints in the right end, every other course

# ---- cornice between ground floor and first floor: (v, depth); negative depth = projecting
CORNICE = [
    (279.0, 0.0),               # meets the wall of the first floor
    (284.5, -0.78),             # front edge of the crown
    (289.0, -0.78),
    (297.5, -0.72),
    (301.0, -0.66),
    (314.5, -0.62),             # drip edge of the corona
    (321.0, -0.35),
    (330.0, -0.2),
    (335.0, -0.08),
    (337.5, 0.0),               # meets the ground floor wall
]

ARC_STEPS = 32                  # segments of a half circle


def arch_centres():
    return [ARCH_FIRST + ARCH_STEP * i for i in range(ARCH_COUNT)]


def on_band(dx):
    """v of the arch band edge at horizontal offset dx from the arch centre."""
    return Y_SPRING - math.sqrt(R_BAND * R_BAND - dx * dx)


def build():
    """Returns a list of segments ((u, v, d), (u, v, d)) in facade pixels, d in disc radii."""
    segs = []

    def line(u1, v1, u2, v2, d1=0.0, d2=None):
        segs.append(((u1, v1, d1), (u2, v2, d1 if d2 is None else d2)))

    def arc(cx, r, a0, a1, d=0.0, steps=ARC_STEPS):
        # angles in degrees, 0 = right, 90 = top
        n = max(2, round(steps * abs(a1 - a0) / 180))
        pts = []
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + r * math.cos(a), Y_SPRING - r * math.sin(a)))
        for p, q in zip(pts, pts[1:]):
            line(p[0], p[1], q[0], q[1], d)

    centres = arch_centres()

    # cornice
    for v, d in CORNICE:
        line(X_LEFT, v, X_RIGHT, v, d)
    for u in (X_LEFT, X_RIGHT):
        for (v1, d1), (v2, d2) in zip(CORNICE, CORNICE[1:]):
            line(u, v1, u, v2, d1, d2)

    # building edges and ground
    line(X_LEFT, CORNICE[-1][0], X_LEFT, Y_GROUND)
    line(X_RIGHT, CORNICE[-1][0], X_RIGHT, Y_GROUND)

    # arches
    for cx in centres:
        # opening in the wall face and the window frame at the back of the reveal
        for d in (0.0, REVEAL):
            arc(cx, R_OPENING, 180, 0, d)
            line(cx - R_OPENING, Y_SPRING, cx - R_OPENING, Y_GROUND, d)
            line(cx + R_OPENING, Y_SPRING, cx + R_OPENING, Y_GROUND, d)
        for side in (-1, 1):
            line(cx + side * R_OPENING, Y_GROUND, cx + side * R_OPENING, Y_GROUND, 0.0, REVEAL)
        line(cx - R_OPENING, Y_TRANSOM, cx + R_OPENING, Y_TRANSOM, REVEAL)

        # smooth band around the arch, running down to the ground
        arc(cx, R_BAND, 180, 0)
        line(cx - R_BAND, Y_SPRING, cx - R_BAND, Y_GROUND)
        line(cx + R_BAND, Y_SPRING, cx + R_BAND, Y_GROUND)

        # keystone
        key_low = on_band(KEY_HALF)
        line(cx - KEY_HALF, KEY_TOP, cx + KEY_HALF, KEY_TOP)
        line(cx - KEY_HALF, KEY_TOP, cx - KEY_HALF, key_low)
        line(cx + KEY_HALF, KEY_TOP, cx + KEY_HALF, key_low)

        # wedge joints, mirrored on both sides
        for side in (-1, 1):
            for (dx1, v1), (dx2, v2) in (UPPER_JOINT, MIDDLE_JOINT, LOWER_JOINT):
                v1 = on_band(dx1) if v1 is None else v1
                line(cx + side * dx1, v1, cx + side * dx2, v2)

    # course joints between the arches and at both ends
    mid_x, low_x = MIDDLE_JOINT[1][0], LOWER_JOINT[1][0]
    spans = [(X_LEFT, centres[0])] + list(zip(centres, centres[1:])) + [(centres[-1], X_RIGHT)]
    for i, (a, b) in enumerate(spans):
        left_is_arch = i > 0
        right_is_arch = i < len(spans) - 1
        for v in COURSES:
            inset = mid_x if v == COURSES[0] else low_x if v == COURSES[1] else R_BAND
            u1 = a + inset if left_is_arch else a
            u2 = b - inset if right_is_arch else b
            line(u1, v, u2, v)

    # piers between the arches: a vertical joint in the middle of the third and the last course
    for a, b in zip(centres, centres[1:]):
        x = (a + b) / 2
        line(x, COURSES[3], x, COURSES[4])
        line(x, COURSES[5], x, Y_GROUND)

    # right end: vertical joints in every other course
    x = RIGHT_END_JOINT
    line(x, KEY_TOP, x, COURSES[0])
    line(x, COURSES[1], x, COURSES[2])
    line(x, COURSES[3], x, COURSES[4])
    line(x, COURSES[5], x, Y_GROUND)

    line(X_LEFT, Y_GROUND, X_RIGHT, Y_GROUND)
    return segs


def to_sign_units(p):
    u, v, d = p
    return (d, (ORIGIN[1] - v) / SCALE, (u - ORIGIN[0]) / SCALE)


def fmt(x):
    s = f'{x:.3f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def write_js(segs):
    numbers = []
    for p, q in segs:
        numbers += [fmt(c) for c in to_sign_units(p)]
        numbers += [fmt(c) for c in to_sign_units(q)]
    rows = [', '.join(numbers[i:i + 12]) for i in range(0, len(numbers), 12)]
    body = ',\n\t'.join(rows)
    OUT_JS.write_text(
        '// Ground floor of the facade as line segments, made by fasada/build_facade.py from images/fasada.jpg.\n'
        '// Do not edit by hand. Six numbers per segment: depth, y, z of both ends, in disc radii.\n'
        '// depth: behind the wall face (negative = in front of it); y: up; z: along the wall,\n'
        '// 0 at the wall plate of the sign, positive towards the right side of the facade.\n'
        f'export const FACADE_LINES = new Float32Array([\n\t{body},\n]);\n',
        encoding='utf-8',
    )


def write_svg(segs):
    x0, y0, x1, y1 = X_LEFT - 20, 260, X_RIGHT + 20, Y_GROUND + 20
    paths = []
    for p, q in segs:
        if abs(p[0] - q[0]) < 1e-6 and abs(p[1] - q[1]) < 1e-6:
            continue
        stroke = '#f3f0ea' if p[2] <= 0 and q[2] <= 0 else '#a39d94'
        paths.append(f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="{stroke}"/>')
    OUT_SVG.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" '
        f'width="{2 * (x1 - x0)}" height="{2 * (y1 - y0)}">\n'
        f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" fill="#0d0c0c"/>\n'
        '<g stroke-width="0.8" stroke-linecap="round">\n' + '\n'.join(paths) + '\n</g>\n'
        f'<circle cx="{ORIGIN[0] - 30}" cy="{ORIGIN[1] - 5}" r="{SCALE}" fill="none" stroke="#c9a66b" stroke-width="0.8"/>\n'
        '</svg>\n',
        encoding='utf-8',
    )


def write_check(segs):
    import cv2
    import numpy as np
    H = np.load(ROOT / 'fasada/podaci/H_rect.npy')
    photo = cv2.imread(str(ROOT / 'images/fasada.jpg'))
    rect = cv2.warpPerspective(photo, H, (1080, 720), flags=cv2.INTER_CUBIC)
    z = 2
    big = cv2.resize(rect, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC)
    big = (big * 0.55).astype('uint8')
    for p, q in segs:
        colour = (60, 230, 255) if p[2] <= 0 else (255, 160, 60)
        cv2.line(big, (round(p[0] * z), round(p[1] * z)), (round(q[0] * z), round(q[1] * z)), colour, 1, cv2.LINE_AA)
    cv2.imwrite(str(ROOT / 'fasada/provjera.png'), big)


if __name__ == '__main__':
    segments = build()
    write_js(segments)
    write_svg(segments)
    if '--check' in sys.argv:
        write_check(segments)
    print(len(segments), 'segments')
