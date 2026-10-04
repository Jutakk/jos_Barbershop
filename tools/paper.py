"""
Paper for the background of the site, made from images/white-paper-texture.jpg: a square tile that repeats
without a seam and without bands (the uneven light of the photo is taken out), with a softer grain. The theme repeats it on the page (style.scss)
and around the 3D scene (scene.js).

    pip install pillow numpy
    python3 tools/paper.py

Output: theme/jos-barbershop/assets/images/paper.webp
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'images/white-paper-texture.jpg'
OUT = ROOT / 'theme/jos-barbershop/assets/images/paper.webp'
SIZE = 1024          # px of the square tile
GRAIN = 0.55         # strength of the grain, 1 = as in the photo
FLAT = 40            # px: light and shade wider than this are taken out, so repeated tiles show no bands


def flatten(img, repeated):
    """Take out the uneven light of the photo: subtract a wide blur and keep only the grain on the even
    mean. A repeated tile is blurred around its edges as if repeated, the photo as if mirrored."""
    h, w = img.shape[:2]
    if repeated:
        tiled = np.tile(img, (3, 3, 1))
    else:
        row = np.concatenate([img[:, ::-1], img, img[:, ::-1]], axis=1)
        tiled = np.concatenate([row[::-1], row, row[::-1]], axis=0)
    blurred = np.asarray(
        Image.fromarray(np.clip(tiled, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(FLAT))
    ).astype(np.float32)[h:2 * h, w:2 * w]
    return img - blurred + img.mean(axis=(0, 1))


def seamless(img):
    """Cross-fade the tile with itself moved by half: its edges then come from the middle of the photo,
    which runs on without a break when the tile is repeated."""
    h, w = img.shape[:2]
    moved = np.roll(img, (h // 2, w // 2), axis=(0, 1))
    y = np.minimum(np.arange(h), h - 1 - np.arange(h)) / (h / 4)
    x = np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w / 4)
    keep = np.clip(np.minimum.outer(y, x), 0, 1)
    keep = keep * keep * (3 - 2 * keep)
    return img * keep[..., None] + moved * (1 - keep[..., None])


if __name__ == '__main__':
    photo = Image.open(SOURCE).convert('RGB')
    side = min(photo.size)
    left, top = (photo.width - side) // 2, (photo.height - side) // 2
    square = photo.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)
    # the light first, so the halves that seamless() puts together have the same brightness
    img = flatten(seamless(flatten(np.asarray(square).astype(np.float32), False)), True)
    mean = img.mean(axis=(0, 1))
    img = mean + (img - mean) * GRAIN
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT, 'WEBP', quality=80, method=6)
    print(OUT, OUT.stat().st_size, 'bytes, mean', mean.round())
