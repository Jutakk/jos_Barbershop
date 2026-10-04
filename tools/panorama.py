"""
360 photo of the shop for the theme. The photo stays exactly as it is, nothing is sharpened: only the place
where its left and right edge meet is smoothed, then it is written as WebP in its full size for computers
and in half the size for phones.

    pip install pillow numpy
    python3 tools/panorama.py images/google-maps-28.webp

Output: theme/jos-barbershop/assets/images/lokal-360.webp (full size, 8192 x 4096 for the current photo)
        and lokal-360-mobile.webp (half size)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'theme/jos-barbershop/assets/images'
SEAM = 24          # px on each side over which the step at the edges is smoothed (at 2048 px width)


def smooth_seam(image):
    img = np.asarray(image).astype(np.float32)
    width = max(2, round(SEAM * image.width / 2048))
    step = (img[:, 0] - img[:, -1]) / 2
    for i in range(width):
        share = 1 - i / width
        img[:, i] -= step * share
        img[:, -1 - i] += step * share
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    photo = Image.open(sys.argv[1]).convert('RGB')
    width, height = photo.size
    smooth_seam(photo).save(OUT / 'lokal-360.webp', 'WEBP', quality=78, method=6)
    half = photo.resize((width // 2, height // 2), Image.LANCZOS)
    smooth_seam(half).save(OUT / 'lokal-360-mobile.webp', 'WEBP', quality=84, method=6)
    print(photo.size, 'and', half.size, 'written to', OUT)
