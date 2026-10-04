"""
Ground floor of the facade of Jo's Barbershop as a line drawing for the 3D hero.

All measurements are pixels of the rectified photo images/fasada.jpg (podaci/H_rect.npy turns the photo
into a straight elevation; one pixel there is one pixel of the photo at the sign). u goes to the right,
v goes down. The ground floor is regular: four round arches on one spacing (window, window, door,
window from the left), rusticated wall with course joints every 47.5 px, wedge joints around the arches
and a cornice on top.

Output:
  theme/jos-barbershop/assets/js/facade.js   line segments in sign units (disc radius = 1), the time at
                                              which each segment is drawn when the page loads, the arches
  fasada/fasada-prizemlje.svg                 the flat elevation, for checking
  python3 fasada/build_facade.py --check     also writes fasada/provjera.png, the lines on the photo

3D convention (scene.js): the wall is the plane of the wall plate of the sign. Each point is
[depth, y, z]: depth is how far the point lies behind the wall face (negative = in front of it),
y is up, z runs along the wall. Looking at the facade from the street, its right side comes
towards the camera (+z), its left side goes away (-z).

The street goes on beyond the building: on the right every horizontal line runs on into the distance,
on the left only some of them. These lines are split into pieces that get longer and longer, so they
seem to rush away like the perspective.

Drawing order when the page loads, like an architect draws:
  1. outline: the cornice lines and the ground line grow from the sign to both ends and on into the
     distance, then the left edge of the building is drawn from top to bottom;
  2. arches, one after the other, starting with the two next to the sign: each outline is drawn from
     the ground up both jambs at once and meets at the crown;
  3. joints, arch by arch in the same order, from the top down; the courses at the ends run on.
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
ARCH_DOOR = 2                   # from the left: window, window, door, window
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

# ---- lines beyond the building
BEYOND = 4000.0                 # px, far enough to fade out in the fog
BEYOND_FIRST = 60.0             # first piece of such a line; every next piece is longer
BEYOND_GROWTH = 1.6
BEYOND_LEFT = [279.0, 284.5, 337.5, 472.0, 567.0, Y_GROUND]   # the lines that run on at the left end

# ---- drawing schedule, in parts of the whole drawing (0 to 1 before normalising)
OUTLINE_GROW = 0.30             # the longest cornice line grows from the sign to its end in this time
EDGE_TIME = 0.08                # an edge of the building, top to bottom
ARCH_START = 0.22               # first arch
ARCH_STAGGER = 0.09             # next arch starts this much later
ARCH_TIME = 0.16                # one arch outline, from the ground to the crown
REVEAL_DELAY = 0.04             # the window frame in the reveal follows the wall face
DETAIL_TIME = 0.05              # transom and thresholds, after the outline
JOINT_START = 0.45              # joints of the first arch
JOINT_STAGGER = 0.09
JOINT_CASCADE = 0.14            # joints of one arch, from the top course to the ground
JOINT_TIME = 0.06               # one joint
BEYOND_TIME = 0.03              # one piece of a line beyond the building


def arch_centres():
    return [ARCH_FIRST + ARCH_STEP * i for i in range(ARCH_COUNT)]


def on_band(dx):
    """v of the arch band edge at horizontal offset dx from the arch centre."""
    return Y_SPRING - math.sqrt(R_BAND * R_BAND - dx * dx)


def build():
    """Returns strokes: dicts with the points (u, v, d) in facade pixels (d in disc radii) and their role."""
    strokes = []
    centres = arch_centres()

    def add(kind, pts, **extra):
        strokes.append({'kind': kind, 'pts': pts, **extra})

    def line(kind, u1, v1, u2, v2, d1=0.0, d2=None, **extra):
        add(kind, [(u1, v1, d1), (u2, v2, d1 if d2 is None else d2)], **extra)

    def half_outline(cx, r, side, d):
        """One side of an arch outline: from the ground up the jamb and along the arc to the crown."""
        pts = [(cx + side * r, Y_GROUND, d), (cx + side * r, Y_SPRING, d)]
        n = ARC_STEPS // 2
        for i in range(1, n + 1):
            a = math.radians(90 * i / n)
            pts.append((cx + side * r * math.cos(a), Y_SPRING - r * math.sin(a), d))
        return pts

    def beyond(u, v, d, direction, after):
        """A line running on from the end of the building at u into the distance, in longer and longer pieces."""
        pts = [(u, v, d)]
        step, gone = BEYOND_FIRST, 0.0
        while gone < BEYOND:
            gone = min(BEYOND, gone + step)
            pts.append((u + direction * gone, v, d))
            step *= BEYOND_GROWTH
        add('beyond', pts, end=u, v=v, after=after, arch=0 if direction < 0 else ARCH_COUNT - 1)

    # 1. outline: cornice and ground grow from the sign to both ends and on, the left edge top to bottom
    depth_at = dict(CORNICE)
    for v, d in CORNICE + [(Y_GROUND, 0.0)]:
        line('grow', ORIGIN[0], v, X_LEFT, v, d)
        line('grow', ORIGIN[0], v, X_RIGHT, v, d)
        beyond(X_RIGHT, v, d, 1, 'grow')
    for v in BEYOND_LEFT:
        beyond(X_LEFT, v, depth_at.get(v, 0.0), -1, 'grow' if v in depth_at or v == Y_GROUND else 'joint')
    for (v1, d1), (v2, d2) in zip(CORNICE, CORNICE[1:]):
        line('edge', X_LEFT, v1, X_LEFT, v2, d1, d2, end=X_LEFT)
    line('edge', X_LEFT, CORNICE[-1][0], X_LEFT, Y_GROUND, end=X_LEFT)
    for v in COURSES:
        beyond(X_RIGHT, v, 0.0, 1, 'joint')

    # 2. arches
    for i, cx in enumerate(centres):
        for side in (-1, 1):
            add('arch', half_outline(cx, R_OPENING, side, 0.0), arch=i)
            add('arch', half_outline(cx, R_BAND, side, 0.0), arch=i)
            add('arch', half_outline(cx, R_OPENING, side, REVEAL), arch=i, delay=REVEAL_DELAY)
            line('detail', cx + side * R_OPENING, Y_GROUND, cx + side * R_OPENING, Y_GROUND, 0.0, REVEAL, arch=i)
        line('detail', cx - R_OPENING, Y_TRANSOM, cx + R_OPENING, Y_TRANSOM, REVEAL, arch=i)

    # 3. joints: keystone and wedge joints of every arch
    for i, cx in enumerate(centres):
        key_low = on_band(KEY_HALF)
        line('joint', cx - KEY_HALF, KEY_TOP, cx + KEY_HALF, KEY_TOP)
        line('joint', cx - KEY_HALF, KEY_TOP, cx - KEY_HALF, key_low)
        line('joint', cx + KEY_HALF, KEY_TOP, cx + KEY_HALF, key_low)
        for side in (-1, 1):
            for (dx1, v1), (dx2, v2) in (UPPER_JOINT, MIDDLE_JOINT, LOWER_JOINT):
                v1 = on_band(dx1) if v1 is None else v1
                line('joint', cx + side * dx1, v1, cx + side * dx2, v2)

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
            line('joint', u1, v, u2, v)

    # piers between the arches: a vertical joint in the middle of the third and the last course
    for a, b in zip(centres, centres[1:]):
        x = (a + b) / 2
        line('joint', x, COURSES[3], x, COURSES[4])
        line('joint', x, COURSES[5], x, Y_GROUND)

    # right end: vertical joints in every other course
    x = RIGHT_END_JOINT
    line('joint', x, KEY_TOP, x, COURSES[0])
    line('joint', x, COURSES[1], x, COURSES[2])
    line('joint', x, COURSES[3], x, COURSES[4])
    line('joint', x, COURSES[5], x, Y_GROUND)
    return strokes


def length3(p, q):
    return math.dist((p[0], p[1], p[2] * SCALE), (q[0], q[1], q[2] * SCALE))


def stroke_length(pts):
    return sum(length3(p, q) for p, q in zip(pts, pts[1:]))


def arch_order():
    """Arch indices from the one nearest to the sign outwards."""
    return sorted(range(ARCH_COUNT), key=lambda i: abs(arch_centres()[i] - ORIGIN[0]))


def nearest_arch(pts):
    u = sum(p[0] for p in pts) / len(pts)
    return min(range(ARCH_COUNT), key=lambda i: abs(arch_centres()[i] - u))


def schedule(strokes):
    """Gives every stroke its start time and duration, then splits it into timed segments, normalised to 0..1."""
    rank = {arch: k for k, arch in enumerate(arch_order())}
    longest_grow = max(stroke_length(s['pts']) for s in strokes if s['kind'] == 'grow')
    grow_speed = longest_grow / OUTLINE_GROW
    top, bottom = KEY_TOP, Y_GROUND
    timed = []
    for s in strokes:
        pts = s['pts']
        kind = s['kind']
        if kind == 'grow':
            start, duration = 0.0, stroke_length(pts) / grow_speed
        elif kind == 'edge':
            start, duration = abs(s['end'] - ORIGIN[0]) / grow_speed, EDGE_TIME
        elif kind == 'beyond':
            if s['after'] == 'grow':
                start = abs(s['end'] - ORIGIN[0]) / grow_speed
            else:
                # after the course at the end of the building has been drawn
                depth = (s['v'] - top) / (bottom - top)
                start = JOINT_START + rank[s['arch']] * JOINT_STAGGER + depth * JOINT_CASCADE + JOINT_TIME
            duration = BEYOND_TIME * (len(pts) - 1)
        elif kind == 'arch':
            start = ARCH_START + rank[s['arch']] * ARCH_STAGGER + s.get('delay', 0.0)
            duration = ARCH_TIME
        elif kind == 'detail':
            start = ARCH_START + rank[s['arch']] * ARCH_STAGGER + ARCH_TIME
            duration = DETAIL_TIME
        else:
            # joints: arch by arch, inside one arch from the top course down; drawn from top or from the arch
            if pts[-1][1] < pts[0][1]:
                pts = pts[::-1]
            depth = (min(p[1] for p in pts) - top) / (bottom - top)
            start = JOINT_START + rank[nearest_arch(pts)] * JOINT_STAGGER + depth * JOINT_CASCADE
            duration = JOINT_TIME
        total = stroke_length(pts)
        t = 0.0
        for p, q in zip(pts, pts[1:]):
            # lines beyond the building: every piece takes the same time, so the far pieces rush away
            part = 1 / (len(pts) - 1) if kind == 'beyond' else length3(p, q) / total
            timed.append((p, q, start + t * duration, start + (t + part) * duration))
            t += part
    end = max(seg[3] for seg in timed)
    return [(p, q, t0 / end, t1 / end) for p, q, t0, t1 in timed]


def to_sign_units(p):
    u, v, d = p
    return (d, (ORIGIN[1] - v) / SCALE, (u - ORIGIN[0]) / SCALE)


def fmt(x):
    s = f'{x:.3f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def js_rows(numbers, per_row):
    rows = [', '.join(numbers[i:i + per_row]) for i in range(0, len(numbers), per_row)]
    return ',\n\t'.join(rows)


def write_js(segs):
    lines, times = [], []
    for p, q, t0, t1 in segs:
        lines += [fmt(c) for c in to_sign_units(p)] + [fmt(c) for c in to_sign_units(q)]
        times += [fmt(t0), fmt(t1)]
    arches = []
    for i, cx in enumerate(arch_centres()):
        z = fmt((cx - ORIGIN[0]) / SCALE)
        arches.append(f'\t{{ z: {z}, door: {"true" if i == ARCH_DOOR else "false"} }},')
    y = lambda v: fmt((ORIGIN[1] - v) / SCALE)  # noqa: E731
    OUT_JS.write_text(
        '// Ground floor of the facade, made by fasada/build_facade.py from images/fasada.jpg. Do not edit by hand.\n'
        '// All lengths in disc radii. depth: behind the wall face (negative = in front of it); y: up from the\n'
        '// wall plate of the sign; z: along the wall, 0 at the wall plate, positive towards the right of the facade.\n'
        '\n'
        '// six numbers per segment: depth, y, z of the start and of the end\n'
        f'export const FACADE_LINES = new Float32Array([\n\t{js_rows(lines, 12)},\n]);\n'
        '\n'
        '// two numbers per segment: when its drawing starts and ends, 0..1 of the drawing on page load\n'
        f'export const FACADE_DRAW = new Float32Array([\n\t{js_rows(times, 16)},\n]);\n'
        '\n'
        '// the four arches from left to right: window, window, door, window\n'
        'export const FACADE_ARCHES = [\n' + '\n'.join(arches) + '\n];\n'
        '\n'
        '// every arch: springing line, radius of the opening, depth of the reveal, ground, top of the keystone,\n'
        '// half width of the arch band\n'
        f'export const FACADE_ARCH = {{ spring: {y(Y_SPRING)}, radius: {fmt(R_OPENING / SCALE)}, '
        f'reveal: {fmt(REVEAL)}, ground: {y(Y_GROUND)}, top: {y(KEY_TOP)}, band: {fmt(R_BAND / SCALE)} }};\n',
        encoding='utf-8',
    )


def write_svg(segs):
    x0, y0, x1, y1 = X_LEFT - 20, 260, X_RIGHT + 20, Y_GROUND + 20
    paths = []
    for p, q, _, _ in segs:
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
    for p, q, _, _ in segs:
        colour = (60, 230, 255) if p[2] <= 0 else (255, 160, 60)
        cv2.line(big, (round(p[0] * z), round(p[1] * z)), (round(q[0] * z), round(q[1] * z)), colour, 1, cv2.LINE_AA)
    cv2.imwrite(str(ROOT / 'fasada/provjera.png'), big)


if __name__ == '__main__':
    segments = schedule(build())
    write_js(segments)
    write_svg(segments)
    if '--check' in sys.argv:
        write_check(segments)
    print(len(segments), 'segments')
