"""Deep Learning & Computer Vision engine (NumPy only).

* convolution studio — real 2-D cross-correlation (as CNN layers compute it), ReLU and max-pooling on
  procedurally drawn images or a learner's own drawing, plus a bank of classic kernels
* attention lens     — scaled dot-product self-attention softmax(QKᵀ/√d) with interpretable heads
* dream machine      — feature visualisation: gradient ascent on the input image to maximise one
  channel of a small conv net whose first layer is a Gabor filter bank (the edge/stripe detectors
  real CNNs learn first). Produces the famously surreal "what does this neuron want to see" images.
"""
from __future__ import annotations

import base64
import math
import struct
import zlib

import numpy as np

SIZE = 32

# ------------------------------------------------------------------ images
def _canvas() -> np.ndarray:
    return np.zeros((SIZE, SIZE), dtype=float)


def _line(img: np.ndarray, x0: float, y0: float, x1: float, y1: float, w: float = 1.6) -> None:
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    px, py = x1 - x0, y1 - y0
    t = np.clip(((xx - x0) * px + (yy - y0) * py) / (px * px + py * py + 1e-9), 0, 1)
    d = np.hypot(xx - (x0 + t * px), yy - (y0 + t * py))
    img[:] = np.maximum(img, np.clip(w + 0.5 - d, 0, 1))


def make_image(name: str = "seven") -> np.ndarray:
    img = _canvas()
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    if name == "seven":
        _line(img, 8, 7, 24, 7); _line(img, 24, 7, 13, 26); _line(img, 12, 16, 21, 16, 1.2)
    elif name == "circle":
        r = np.hypot(xx - 15.5, yy - 15.5)
        img[:] = np.clip(1.6 - np.abs(r - 9), 0, 1)
    elif name == "checker":
        img[:] = (((xx // 6) + (yy // 6)) % 2).astype(float)
    elif name == "house":
        _line(img, 7, 15, 16, 6); _line(img, 16, 6, 25, 15); _line(img, 9, 15, 9, 26); _line(img, 23, 15, 23, 26)
        _line(img, 9, 26, 23, 26); _line(img, 14, 26, 14, 20); _line(img, 18, 26, 18, 20); _line(img, 14, 20, 18, 20, 1.0)
    elif name == "smile":
        r = np.hypot(xx - 15.5, yy - 15.5)
        img[:] = np.clip(1.4 - np.abs(r - 12), 0, 1)
        img[:] = np.maximum(img, np.clip(2.4 - np.hypot(xx - 11, yy - 12), 0, 1))
        img[:] = np.maximum(img, np.clip(2.4 - np.hypot(xx - 20, yy - 12), 0, 1))
        mouth = np.hypot(xx - 15.5, yy - 15) - 7
        img[:] = np.maximum(img, np.where(yy > 18, np.clip(1.3 - np.abs(mouth), 0, 1), 0))
    elif name == "letter":
        _line(img, 8, 26, 16, 6); _line(img, 16, 6, 24, 26); _line(img, 11, 18, 21, 18)
    elif name == "stripes":
        img[:] = (np.sin(xx * 0.9) > 0).astype(float)
    elif name == "gradient":
        img[:] = xx / (SIZE - 1)
    else:
        raise ValueError(f"unknown image '{name}'")
    return np.clip(img, 0, 1)


IMAGES = ["seven", "circle", "house", "smile", "letter", "checker", "stripes", "gradient"]

KERNELS = {
    "identity": [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
    "blur": [[1 / 9] * 3] * 3,
    "gaussian": [[1 / 16, 2 / 16, 1 / 16], [2 / 16, 4 / 16, 2 / 16], [1 / 16, 2 / 16, 1 / 16]],
    "sharpen": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    "edges": [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
    "vertical": [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    "horizontal": [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    "emboss": [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
}


def conv2d(img: np.ndarray, k: np.ndarray) -> np.ndarray:
    """'Same'-size 2-D cross-correlation with zero padding (what deep-learning libraries call convolution)."""
    kh, kw = k.shape
    pad = np.pad(img, ((kh // 2, kh // 2), (kw // 2, kw // 2)))
    win = np.lib.stride_tricks.sliding_window_view(pad, (kh, kw))
    return np.einsum("ijkl,kl->ij", win, k)


def maxpool(x: np.ndarray, s: int = 2) -> np.ndarray:
    h, w = x.shape[0] // s * s, x.shape[1] // s * s
    return x[:h, :w].reshape(h // s, s, w // s, s).max(axis=(1, 3))


def _r(a: np.ndarray, d: int = 3) -> list:
    return np.round(a, d).tolist()


def convolve_lab(image: str = "seven", kernel: str = "vertical", custom: list | None = None, pixels: list | None = None,
                 relu: bool = True, pool: bool = True) -> dict:
    if pixels:
        arr = np.clip(np.asarray(pixels, dtype=float), 0, 1)
        if arr.shape != (SIZE, SIZE):
            raise ValueError(f"pixels must be {SIZE}×{SIZE}")
        img = arr
    else:
        img = make_image(image)
    if kernel == "custom":
        k = np.asarray(custom or KERNELS["identity"], dtype=float)
        if k.shape != (3, 3):
            raise ValueError("custom kernel must be 3×3")
        k = np.clip(k, -10, 10)
    elif kernel in KERNELS:
        k = np.asarray(KERNELS[kernel], dtype=float)
    else:
        raise ValueError(f"unknown kernel '{kernel}'")
    out = conv2d(img, k)
    act = np.maximum(out, 0) if relu else out
    pooled = maxpool(act) if pool else act
    bank = {name: _r(np.maximum(conv2d(img, np.asarray(kk, float)), 0), 2) for name, kk in KERNELS.items() if name != "identity"}
    return {"image": _r(img, 2), "kernel": _r(k, 4), "kernel_name": kernel, "conv": _r(out), "activation": _r(act),
            "pooled": _r(pooled), "relu": relu, "pool": pool, "size": SIZE, "bank": bank,
            "stats": {"min": round(float(out.min()), 3), "max": round(float(out.max()), 3), "active": round(float((act > 0.05).mean()), 3)},
            "params": 9 + 1}


# ------------------------------------------------------------------ attention
def _trigrams(word: str) -> list[str]:
    w = f"#{word}#"
    return [w[i:i + 3] for i in range(len(w) - 2)] or [w]


def _embed(word: str, d: int = 48) -> np.ndarray:
    v = np.zeros(d)
    for g in _trigrams(word):
        h = zlib.crc32(g.encode())
        v[h % d] += 1.0 if (h >> 8) & 1 else -1.0
        v[(h >> 12) % d] += 0.5
    n = np.linalg.norm(v)
    return v / n if n else v


def _posenc(n: int, d: int = 16) -> np.ndarray:
    pos = np.arange(n)[:, None]
    i = np.arange(d // 2)[None, :]
    ang = pos / (10000 ** (2 * i / d))
    pe = np.zeros((n, d))
    pe[:, 0::2], pe[:, 1::2] = np.sin(ang), np.cos(ang)
    return pe


def _softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x = x - np.nanmax(x, axis=axis, keepdims=True)
    e = np.exp(x)
    e = np.where(np.isfinite(e), e, 0)
    return e / e.sum(axis=axis, keepdims=True)


HEADS = {
    "similar": "Similar-word head — queries match keys of other tokens with similar spelling/meaning features",
    "previous": "Previous-token head — each token looks one step back (a pattern real transformers learn)",
    "local": "Positional head — attends to nearby positions via sinusoidal position encodings",
}


def attention_lab(sentence: str = "the cat sat on the mat because the cat was tired", temperature: float = 1.0, causal: bool = False) -> dict:
    tokens = [t for t in "".join(c.lower() if c.isalnum() or c == "'" else " " for c in str(sentence)).split()][:14]
    if len(tokens) < 2:
        raise ValueError("type at least two words")
    n = len(tokens)
    T = max(0.1, min(5.0, float(temperature)))
    X = np.stack([_embed(t) for t in tokens])
    P = _posenc(n)
    heads = {}
    # similar-word head: Q = K = X (identity projections), self excluded
    s = (X @ X.T) * 6.0
    np.fill_diagonal(s, -np.inf)
    heads["similar"] = s
    # previous-token head: query of position i matches key "position i-1" via a shift of the position code
    shift = np.zeros((n, n))
    for i in range(n):
        shift[i, max(0, i - 1)] = 1.0
    q = shift @ P
    heads["previous"] = (q @ P.T) * 1.2
    # local head: positions attend to themselves and neighbours, decaying with distance (dot product of encodings)
    heads["local"] = (P @ P.T) * 0.9
    out = {}
    d = X.shape[1]
    for name, scores in heads.items():
        sc = scores / (math.sqrt(d) / 6.928 if name == "similar" else 1.0) / T
        if causal:
            mask = np.triu(np.ones((n, n), dtype=bool), 1)
            sc = np.where(mask, -np.inf, sc)
        if name == "similar" and causal:
            sc[0, 0] = 0.0  # the first token has nothing earlier to look at
        A = _softmax(sc, axis=1)
        out[name] = {"weights": _r(A, 4), "focus": [int(np.argmax(A[i])) for i in range(n)], "description": HEADS[name],
                     "entropy": [round(float(-(A[i][A[i] > 0] * np.log2(A[i][A[i] > 0])).sum()), 3) for i in range(n)]}
    return {"tokens": tokens, "heads": out, "temperature": T, "causal": causal, "d_model": d,
            "similarity": _r(X @ X.T, 3)}


# ------------------------------------------------------------------ dream machine (feature visualisation)
def _gabor_bank(k: int = 7) -> np.ndarray:
    """12 Gabor filters (4 orientations × 3 colour pairings) — shape (12, 3, k, k)."""
    half = k // 2
    yy, xx = np.mgrid[-half:half + 1, -half:half + 1].astype(float)
    filters = []
    colours = [np.array([1.0, -0.5, -0.5]), np.array([-0.5, 1.0, -0.5]), np.array([-0.5, -0.5, 1.0])]
    for ci, col in enumerate(colours):
        for oi in range(4):
            th = math.pi * oi / 4
            xr = xx * math.cos(th) + yy * math.sin(th)
            yr = -xx * math.sin(th) + yy * math.cos(th)
            lam = 3.2 + ci * 0.8
            g = np.exp(-(xr ** 2 + 0.6 * yr ** 2) / (2 * 2.2 ** 2)) * np.cos(2 * math.pi * xr / lam)
            g -= g.mean()
            g /= np.abs(g).sum()
            filters.append(col[:, None, None] * g[None])
    return np.stack(filters)


def _conv_multi(x: np.ndarray, w: np.ndarray) -> np.ndarray:
    """x: (C,H,W), w: (O,C,k,k) → (O,H,W), same padding."""
    k = w.shape[-1]
    pad = np.pad(x, ((0, 0), (k // 2, k // 2), (k // 2, k // 2)), mode="reflect")
    win = np.lib.stride_tricks.sliding_window_view(pad, (k, k), axis=(1, 2))  # (C,H,W,k,k)
    return np.einsum("chwij,ocij->ohw", win, w, optimize=True)


def _conv_multi_T(g: np.ndarray, w: np.ndarray) -> np.ndarray:
    """Gradient of _conv_multi w.r.t. its input (zero-padding approximation): (O,H,W) → (C,H,W)."""
    wt = np.flip(w, axis=(2, 3)).transpose(1, 0, 2, 3)
    k = w.shape[-1]
    pad = np.pad(g, ((0, 0), (k // 2, k // 2), (k // 2, k // 2)))
    win = np.lib.stride_tricks.sliding_window_view(pad, (k, k), axis=(1, 2))
    return np.einsum("ohwij,coij->chw", win, wt, optimize=True)


PALETTES = {
    "natural": None,
    "neon": [(0.02, 0.0, 0.08), (0.36, 0.0, 0.62), (0.95, 0.1, 0.65), (0.2, 0.95, 1.0), (1.0, 1.0, 0.85)],
    "aurora": [(0.0, 0.03, 0.06), (0.0, 0.35, 0.4), (0.15, 0.85, 0.55), (0.6, 0.45, 1.0), (0.95, 0.95, 1.0)],
    "magma": [(0.0, 0.0, 0.02), (0.32, 0.06, 0.45), (0.78, 0.18, 0.42), (0.99, 0.55, 0.25), (0.99, 0.99, 0.75)],
    "ocean": [(0.0, 0.02, 0.1), (0.0, 0.2, 0.45), (0.0, 0.55, 0.75), (0.5, 0.9, 0.95), (1.0, 1.0, 1.0)],
}


def _colourise(x: np.ndarray, palette: str) -> np.ndarray:
    """x: (3,H,W) raw image → (H,W,3) uint8."""
    img = x.transpose(1, 2, 0)
    img = (img - img.mean()) / (img.std() + 1e-8)
    img = np.clip(0.5 + 0.18 * img, 0, 1)
    if PALETTES.get(palette):
        stops = np.array(PALETTES[palette])
        lum = img @ np.array([0.3, 0.45, 0.25])
        lum = (lum - lum.min()) / (np.ptp(lum) + 1e-8)
        hue = (img[..., 0] - img[..., 2]) * 0.35
        t = np.clip(lum + hue, 0, 1) * (len(stops) - 1)
        i0 = np.floor(t).astype(int).clip(0, len(stops) - 2)
        f = (t - i0)[..., None]
        img = stops[i0] * (1 - f) + stops[i0 + 1] * f
    else:  # boost saturation for the dreamy look
        grey = img.mean(axis=2, keepdims=True)
        img = np.clip(grey + 1.8 * (img - grey), 0, 1)
    return (img * 255).astype(np.uint8)


def png_data_url(rgb: np.ndarray) -> str:
    h, w, _ = rgb.shape
    raw = b"".join(b"\x00" + rgb[y].tobytes() for y in range(h))
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    return "data:image/png;base64," + base64.b64encode(png).decode()


def _upsample(x: np.ndarray, f: int = 2) -> np.ndarray:
    return x.repeat(f, axis=1).repeat(f, axis=2)


def dream_lab(layer: int = 2, channel: int = 3, steps: int = 36, seed: int = 7, palette: str = "neon", size: int = 64,
              jitter: int = 2, smooth: float = 0.25) -> dict:
    layer = 1 if int(layer) == 1 else 2
    size = int(size) if int(size) in (48, 64, 80) else 64
    steps = max(8, min(60, int(steps)))
    if palette not in PALETTES:
        raise ValueError("unknown palette")
    rng = np.random.default_rng(int(seed))
    w1 = _gabor_bank()
    w2 = np.random.default_rng(1234).normal(0, 1, (8, 12, 3, 3))
    w2 /= np.abs(w2).sum(axis=(1, 2, 3), keepdims=True)
    channels = 12 if layer == 1 else 8
    channel = int(channel) % channels
    small = size // 2
    x = rng.normal(0, 0.1, (3, small, small))
    frames, scores = [], []
    plan = [(small, steps // 2), (size, steps - steps // 2)]  # two octaves: coarse then fine
    done = 0
    for octave, (res, n_steps) in enumerate(plan):
        if octave:
            x = _upsample(x) + rng.normal(0, 0.02, (3, res, res))
        for _ in range(n_steps):
            ox, oy = rng.integers(-jitter, jitter + 1, 2) if jitter else (0, 0)
            xs = np.roll(x, (int(ox), int(oy)), axis=(1, 2))
            a1 = _conv_multi(xs, w1)
            r1 = np.maximum(a1, 0)
            if layer == 1:
                target = r1[channel]
                g1 = np.zeros_like(a1)
                g1[channel] = (a1[channel] > 0) / target.size
            else:
                a2 = _conv_multi(r1, w2)
                target = np.maximum(a2[channel], 0)
                g2 = np.zeros_like(a2)
                g2[channel] = (a2[channel] > 0) / target.size
                g1 = _conv_multi_T(g2, w2) * (a1 > 0)
            score = float(target.mean())
            grad = _conv_multi_T(g1, w1)
            grad = np.roll(grad, (-int(ox), -int(oy)), axis=(1, 2))
            grad /= np.abs(grad).mean() + 1e-8
            x += 0.08 * grad
            if smooth:  # gentle blur = image prior that keeps patterns smooth and organic
                x = (1 - smooth) * x + smooth * (np.roll(x, 1, 1) + np.roll(x, -1, 1) + np.roll(x, 1, 2) + np.roll(x, -1, 2)) / 4
            x = np.clip(x, -3, 3)
            done += 1
            scores.append(round(score, 5))
            if done in (1, steps // 6, steps // 3, steps // 2, (2 * steps) // 3, steps):
                frames.append({"step": done, "png": png_data_url(_colourise(_upsample(x) if x.shape[1] < size else x, palette))})
    # tile preview of every channel of the chosen layer (what each filter responds to)
    return {"layer": layer, "channel": channel, "channels": channels, "steps": steps, "palette": palette, "size": size,
            "frames": frames, "scores": scores, "final": frames[-1]["png"], "activation_gain": round(scores[-1] / (abs(scores[0]) + 1e-6), 1)}
