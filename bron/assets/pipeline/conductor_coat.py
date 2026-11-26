# The conductor's coat texture (art direction: one long coat in #D9452B, no shirt or tie in view):
# m005_body_red.jpg (Business_Male_01's suit, recoloured by prep.py) -> m005_body_coat.jpg
#   python3 bron/assets/pipeline/conductor_coat.py
# Every piece of cloth becomes the conductor red, keeping the folds; the shirt front, collar and cuffs become flat red; hands and shoes stay.
# The tie and shirt collar sit in the shoe block of the texture: their triangles (UVs, image y down) were taken from the posed model
# (conductor_tie_uv.json) and are painted red too.
import json, os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rocketbox")
a = np.asarray(Image.open(os.path.join(D, "m005_body_red.jpg")).convert("RGB")).astype(np.float32) / 255
H, W, _ = a.shape; yy, xx = np.mgrid[0:H, 0:W]
lum = a @ [0.299, 0.587, 0.114]; mx = a.max(-1); mn = a.min(-1); sat = (mx - mn) / (mx + 1e-6)
hands = (yy > 0.82 * H) & ((xx < 0.255 * W) | (xx > 0.745 * W))
shoes = (yy > 0.795 * H) & (xx > 0.25 * W) & (xx < 0.725 * W) & (mx < 0.15)
red = (sat > 0.45) & (a[..., 0] > a[..., 1] * 1.5) & ~hands
white = (sat < 0.25) & (lum > 0.35) & ~hands & ~shoes
cloth = ~hands & ~shoes
med = np.median(a[..., 0][red])
det = np.where(red, np.clip(a[..., 0] / med, 0.72, 1.22), 1.0)
det = np.where(white, np.clip(0.9 + 0.15 * (lum - 0.8), 0.85, 1.0), det)
base = np.array([217, 69, 43]) / 255.0
out = a.copy(); m = cloth & (red | white | (~red & ~white & (mx > 0.08)))
out[m] = np.clip(base * det[m][:, None], 0, 1); out[shoes] = [0.03, 0.025, 0.025]
notch = (xx > 420) & (xx < 610) & (yy > 420) & (yy < 620) & (out[..., 0] < 0.9 * base[0])   # the dark edge round the open collar: closed
out[notch] = base * 0.9
im = Image.fromarray((out * 255).astype(np.uint8))
mask = Image.new("L", im.size, 0); d = ImageDraw.Draw(mask)
for tri in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "conductor_tie_uv.json"))): d.polygon([(u * W, v * H) for u, v in tri], fill=255)
im.paste(Image.new("RGB", im.size, tuple(int(c * 255 * 0.86) for c in base)), (0, 0), mask.filter(ImageFilter.MaxFilter(5)))
im.save(os.path.join(D, "m005_body_coat.jpg"), quality=82)
