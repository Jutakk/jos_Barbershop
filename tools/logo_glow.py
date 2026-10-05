"""
The glow of the logo on the shop sign, baked into a texture, so the 3D scene needs no bloom pass over the whole
screen in every frame (that pass was most of the work of the graphics card and made the hover late).
Same steps as the UnrealBloomPass the scene used (three.js r186: threshold 1.0, strength 0.5, radius 0.05, level
factors 1, 0.55, 0.18, 0.05, 0): the parts of the logo brighter than 1 (the logo is drawn with colour 1.6), five
blur levels each half the size of the one before, added together. Worked out at the size the logo has on the
screen in the first view (the 2048 px canvas of the logo about SCREEN px wide), then enlarged to the texture.
scene.js lays it over both faces of the disc with additive blending.

    pip install pillow numpy scipy
    python3 tools/logo_glow.py

Output: theme/jos-barbershop/assets/images/logo-glow.webp
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'theme/jos-barbershop/assets/images/logo-texture.webp'
OUT = ROOT / 'theme/jos-barbershop/assets/images/logo-glow.webp'
SIZE = 512               # px of the glow texture (the glow is soft, more is not needed)
SCREEN = 190             # px on the screen of the 2048 px logo canvas in the first view (disc about 160 px high)
LOGO = 1.6               # colour of the logo in the scene
THRESHOLD = 1.0          # only what is brighter glows
STRENGTH = 0.5
RADIUS = 0.05
FACTORS = [1.0, 0.55, 0.18, 0.05, 0.0]
KERNELS = [6, 10, 14, 18, 22]   # blur of each level, sigma = kernel / 3 px of that level
PAD = 4                  # the glow reaches past the canvas: worked out on a canvas this many times larger
EDGE = 0.86              # from this part of the half width the glow fades to 0 at the edge of the texture
GAIN = 0.7               # matched by eye to the bloom on the screen


def half(image):
    """Next smaller level: half the size, every pixel the mean of four (as the linear sampling of the pass)."""
    h, w = image.shape
    return image[: h // 2 * 2, : w // 2 * 2].reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))


def main():
    alpha = np.asarray(Image.open(SOURCE).convert('RGBA'), dtype=np.float64)[..., 3] / 255.0

    # the logo as the screen shows it: every pixel of the first level (half the screen) the mean of the logo under it
    level0 = SCREEN // 2
    small = np.asarray(Image.fromarray(alpha.astype(np.float32), 'F').resize((level0, level0), Image.BOX)) * LOGO
    bright = np.where(small >= THRESHOLD, small, 0.0)

    # on a larger canvas, so the wide levels do not run into the edge
    size = level0 * PAD
    start = (size - level0) // 2
    image = np.zeros((size, size))
    image[start:start + level0, start:start + level0] = bright

    lerp = [f + (1.2 - 2 * f) * RADIUS for f in FACTORS]
    glow = np.zeros_like(image)
    current = image
    for level, kernel in enumerate(KERNELS):
        if level:
            current = half(current)
        current = gaussian_filter(current, kernel / 3.0, mode='constant', truncate=3.0)
        back = zoom(current, size / current.shape[0], order=1, grid_mode=True, mode='grid-constant')[: size, : size]
        glow += 3.0 * STRENGTH * lerp[level] * back

    glow = glow[start:start + level0, start:start + level0]
    glow *= GAIN
    glow = zoom(glow, SIZE / level0, order=3, grid_mode=True, mode='nearest')
    glow = np.clip(glow, 0.0, 1.0)

    # fades out before the edge of the texture: no hard border on the bracket or the paper
    y, x = np.mgrid[0:SIZE, 0:SIZE]
    r = np.maximum(np.abs(x - (SIZE - 1) / 2), np.abs(y - (SIZE - 1) / 2)) / (SIZE / 2)
    t = np.clip((1.0 - r) / (1.0 - EDGE), 0.0, 1.0)
    glow *= t * t * (3 - 2 * t)

    # stored in sRGB (finer steps in the dark), scene.js reads it back to linear light
    srgb = np.where(glow <= 0.0031308, glow * 12.92, 1.055 * np.power(glow, 1 / 2.4) - 0.055)
    gray = np.round(srgb * 255).astype(np.uint8)
    Image.fromarray(gray, 'L').convert('RGB').save(OUT, 'WEBP', lossless=True, quality=100, method=6)
    print(OUT, f'{OUT.stat().st_size / 1024:.0f} KB', 'max', round(float(glow.max()), 3))


if __name__ == '__main__':
    main()
