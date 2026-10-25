# File: backend/tests/test_brain_focus.py
import cv2
import numpy as np

from app.services.brain_focus import VERSION, brain_focus


def _head(frame=(512, 512), center=(256, 256), radius=150, seed=0):
    """Synthetic 'head': bright skull ring + textured interior on a dark noisy background."""
    rng = np.random.default_rng(seed)
    img = rng.integers(0, 6, frame, dtype=np.uint8)
    cv2.ellipse(img, center, (radius, int(radius * 1.2)), 0, 0, 360, 230, 6)                # skull
    interior = np.zeros(frame, np.uint8)
    cv2.ellipse(interior, center, (int(radius * 0.88), int(radius * 1.05)), 0, 0, 360, 255, -1)
    texture = cv2.GaussianBlur(rng.integers(40, 140, frame, dtype=np.uint8), (0, 0), 6)
    cv2.circle(texture, (center[0] + radius // 4, center[1]), radius // 6, 200, -1)          # a bright "lesion"
    img[interior > 0] = texture[interior > 0]
    return img


def test_output_contract():
    img128, mask, info = brain_focus(_head())
    assert img128.shape == (128, 128) and img128.dtype == np.uint8
    assert mask.shape == (128, 128) and mask.dtype == bool and mask.sum() > 500
    assert (img128[~mask] == 0).all()                       # skull/background removed
    assert info["version"] == VERSION and len(info["box"]) == 3


def test_invariant_to_head_size_position_and_frame():
    a, _, _ = brain_focus(_head(frame=(512, 512), center=(256, 256), radius=150, seed=1))
    b, _, _ = brain_focus(_head(frame=(300, 380), center=(140, 200), radius=80, seed=2))
    c, _, _ = brain_focus(_head(frame=(630, 630), center=(330, 300), radius=220, seed=3))
    for x, y in [(a, b), (a, c)]:
        corr = np.corrcoef(x.astype(float).ravel(), y.astype(float).ravel())[0, 1]
        assert corr > 0.6, corr                              # same layout despite different size/position/frame


def test_degenerate_inputs_do_not_crash():
    for img in (np.zeros((200, 200), np.uint8), np.full((90, 150), 120, np.uint8),
                np.random.default_rng(0).integers(0, 255, (256, 256), dtype=np.uint8)):
        out, mask, _ = brain_focus(img)
        assert out.shape == (128, 128) and mask.any()
