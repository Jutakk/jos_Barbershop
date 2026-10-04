"""
360 photo of the shop for the theme. The photo stays a real photo: it is only enlarged to twice its size
with Lanczos and sharpened very gently (no AI, which made it look painted), the place where the left and
right edge of the photo meet is smoothed, then it is written as WebP for computers (4096 px wide) and
for phones (2048 px wide).

    pip install pillow numpy
    python3 tools/panorama.py images/google-maps-28.webp

Output: theme/jos-barbershop/assets/images/lokal-360.webp and lokal-360-mobile.webp
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'theme/jos-barbershop/assets/images'
SEAM = 24                                        # px on each side over which the step at the edges is smoothed
SHARPEN = ImageFilter.UnsharpMask(radius=1.4, percent=35, threshold=2)


def smooth_seam(image):
    img = np.asarray(image).astype(np.float32)
    step = (img[:, 0] - img[:, -1]) / 2
    for i in range(SEAM):
        share = 1 - i / SEAM
        img[:, i] -= step * share
        img[:, -1 - i] += step * share
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    photo = Image.open(sys.argv[1]).convert('RGB')
    width, height = photo.size
    big = photo.resize((width * 2, height * 2), Image.LANCZOS).filter(SHARPEN)
    smooth_seam(big).save(OUT / 'lokal-360.webp', 'WEBP', quality=86, method=6)
    smooth_seam(photo).save(OUT / 'lokal-360-mobile.webp', 'WEBP', quality=90, method=6)
    print(big.size, 'and', photo.size, 'written to', OUT)
