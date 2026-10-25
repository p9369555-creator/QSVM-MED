# File: backend/app/services/brain_focus.py
"""
Brain-focused preprocessing ("brain_focus_v1").

Why: in the Kaggle brain-MRI data, image size alone predicts tumor vs no-tumor with ~93% accuracy
(tumor scans are almost all 512x512; no-tumor scans come from other sources). A model fed whole frames
can learn the SOURCE (framing, head size/position, resolution, scanner contrast) instead of anatomy.

What it does, in order (everything is approximate - this is NOT clinical-grade skull stripping):
  1. pad to a square and resize to 256x256 (no aspect distortion)
  2. find the head (threshold + largest blob + hole fill), then an eroded "brain interior" mask
     (~10% of the head diameter removed to drop skull / scalp)
  3. crop a square around the head, so head size and position no longer vary
  4. downsample to 64x64 (equalises resolution differences between sources), then
     rescale intensities inside the brain to 1st-99th percentile (removes brightness/contrast style)
  5. CLAHE inside the brain, zero everything outside it, upsample to 128x128

Output is a 128x128 uint8 image, so the rest of the pipeline (StandardScaler -> PCA(8) -> angles) is unchanged.
"""
from typing import Any

import cv2
import numpy as np

VERSION = "brain_focus_v1"
WORK = 256          # working resolution for mask finding
FEAT = 64           # resolution used for the content (equalises sharpness across sources)
OUT = 128
MARGIN = 0.06       # extra border around the head box
ERODE_FRACTION = 0.10


def _masks(work: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    blur = cv2.GaussianBlur(work, (5, 5), 0)
    otsu, _ = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = (blur > max(8.0, 0.45 * otsu)).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n > 1:
        mask = (labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    padded = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    flood = padded.copy()
    cv2.floodFill(flood, np.zeros((padded.shape[0] + 2, padded.shape[1] + 2), np.uint8), (0, 0), 1)
    head = mask | (1 - flood[1:-1, 1:-1])

    diameter = 2.0 * np.sqrt(max(1.0, float(head.sum())) / np.pi)
    r = max(3, int(round(ERODE_FRACTION * diameter)))
    brain = cv2.erode(head, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    if brain.sum() < 0.10 * head.sum():
        brain = head
    return head, brain


def brain_focus(img_gray: np.ndarray) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    """
    Returns (img128 uint8, brain_mask128 bool, info). `info["box"]` = (x0, y0, side) of the crop in the
    ORIGINAL image's pixel coordinates (used to map heatmaps back onto the uploaded image).
    """
    h, w = img_gray.shape[:2]
    s = max(h, w)
    square = cv2.copyMakeBorder(img_gray, 0, s - h, 0, s - w, cv2.BORDER_CONSTANT, value=0)
    work = cv2.resize(square, (WORK, WORK), interpolation=cv2.INTER_AREA)
    head, brain = _masks(work)

    ys, xs = np.where(head > 0)
    if len(xs) == 0:
        x0, x1, y0, y1 = 0, WORK, 0, WORK
    else:
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    side = int(round(max(x1 - x0, y1 - y0) * (1.0 + 2 * MARGIN)))
    side = max(side, 32)
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    bx0, by0 = int(round(cx - side / 2.0)), int(round(cy - side / 2.0))

    pad = side
    work_p = cv2.copyMakeBorder(work, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    brain_p = cv2.copyMakeBorder(brain, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    crop = work_p[by0 + pad: by0 + pad + side, bx0 + pad: bx0 + pad + side]
    bcrop = brain_p[by0 + pad: by0 + pad + side, bx0 + pad: bx0 + pad + side]

    small = cv2.resize(crop, (FEAT, FEAT), interpolation=cv2.INTER_AREA)
    bsmall = cv2.resize(bcrop.astype(np.uint8), (FEAT, FEAT), interpolation=cv2.INTER_NEAREST).astype(bool)
    if bsmall.sum() < 20:
        bsmall = np.ones_like(bsmall)

    vals = small[bsmall].astype(np.float32)
    lo, hi = np.percentile(vals, 1), np.percentile(vals, 99)
    norm = np.clip((small.astype(np.float32) - lo) / (hi - lo + 1e-6), 0.0, 1.0)
    norm8 = (norm * 255.0).astype(np.uint8)
    norm8 = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4)).apply(norm8)
    norm8[~bsmall] = 0

    img128 = cv2.resize(norm8, (OUT, OUT), interpolation=cv2.INTER_CUBIC)
    mask128 = cv2.resize(bsmall.astype(np.uint8), (OUT, OUT), interpolation=cv2.INTER_NEAREST).astype(bool)
    img128[~mask128] = 0

    scale = s / float(WORK)                      # work-space -> original-image pixels
    info = {"box": (float(bx0 * scale), float(by0 * scale), float(side * scale)), "version": VERSION}
    return img128, mask128, info
