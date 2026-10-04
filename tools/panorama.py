"""
360 photo of the shop for the theme: sharpened to twice its size with Real-ESRGAN, the place where the
left and right edge of the photo meet is smoothed, then written as WebP for computers (4096 px wide)
and for phones (2048 px wide).

    pip install spandrel pillow numpy
    curl -L -o RealESRGAN_x2plus.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth
    python3 tools/panorama.py images/google-maps-28.webp RealESRGAN_x2plus.pth

Output: theme/jos-barbershop/assets/images/lokal-360.webp and lokal-360-mobile.webp
"""
import sys
from pathlib import Path

import numpy as np
import spandrel
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'theme/jos-barbershop/assets/images'
PAD = 32          # px taken from the other side of the photo, so the tiles see the photo going round
TILE = 256
OVERLAP = 24
SEAM = 24         # px on each side over which the step where the edges meet is smoothed


def upscale(src, model):
    scale = model.scale
    height, width, _ = src.shape
    img = np.concatenate([src[:, -PAD:], src, src[:, :PAD]], axis=1)
    img = np.pad(img, ((PAD, PAD), (0, 0), (0, 0)), mode='reflect')
    h, w, _ = img.shape
    out = np.zeros((h * scale, w * scale, 3), np.float32)
    weight = np.zeros((h * scale, w * scale, 1), np.float32)
    feather = OVERLAP * scale
    for y in range(0, h - OVERLAP, TILE - 2 * OVERLAP):
        for x in range(0, w - OVERLAP, TILE - 2 * OVERLAP):
            y1, x1 = min(y + TILE, h), min(x + TILE, w)
            tile = torch.from_numpy(img[y:y1, x:x1].transpose(2, 0, 1).copy()).unsqueeze(0)
            with torch.no_grad():
                result = model(tile).squeeze(0).clamp(0, 1).numpy().transpose(1, 2, 0)
            th, tw = result.shape[:2]
            wy = np.minimum(np.arange(th) + 1, np.arange(th)[::-1] + 1).clip(max=feather) / feather
            wx = np.minimum(np.arange(tw) + 1, np.arange(tw)[::-1] + 1).clip(max=feather) / feather
            tile_weight = (wy[:, None] * wx[None, :])[..., None].astype(np.float32)
            out[y * scale:y1 * scale, x * scale:x1 * scale] += result * tile_weight
            weight[y * scale:y1 * scale, x * scale:x1 * scale] += tile_weight
    out /= np.maximum(weight, 1e-6)
    return out[PAD * scale:(PAD + height) * scale, PAD * scale:(PAD + width) * scale]


def smooth_seam(img):
    step = (img[:, 0] - img[:, -1]) / 2
    for i in range(SEAM):
        share = 1 - i / SEAM
        img[:, i] -= step * share
        img[:, -1 - i] += step * share
    return img


if __name__ == '__main__':
    torch.set_num_threads(4)
    model = spandrel.ModelLoader().load_from_file(sys.argv[2]).eval()
    photo = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32) / 255
    big = smooth_seam(upscale(photo, model) * 255)
    image = Image.fromarray(np.clip(big, 0, 255).astype(np.uint8))
    image.save(OUT / 'lokal-360.webp', 'WEBP', quality=82, method=6)
    image.resize((image.width // 2, image.height // 2), Image.LANCZOS).save(OUT / 'lokal-360-mobile.webp', 'WEBP', quality=84, method=6)
    print(image.size, 'written to', OUT)
