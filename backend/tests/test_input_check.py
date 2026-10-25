# File: backend/tests/test_input_check.py
import cv2
import numpy as np

from app.services.input_check import assess_input, structural_checks

_clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))


def _prep(g):
    return cv2.resize(_clahe.apply(g), (128, 128), interpolation=cv2.INTER_AREA)


def _structured(size=(256, 256)):
    yy, xx = np.mgrid[0:size[0], 0:size[1]]
    d = ((xx - size[1] / 2) / (size[1] / 2.2)) ** 2 + ((yy - size[0] / 2) / (size[0] / 2.2)) ** 2
    return np.clip(np.where(d < 1, 120 + 60 * np.cos(d * 6), 0), 0, 255).astype(np.uint8)


def _codes(g):
    return [r["code"] for r in structural_checks(g, _prep(g))]


def test_structured_image_passes():
    assert _codes(_structured()) == []


def test_noise_is_flagged():
    noise = np.random.default_rng(0).integers(0, 255, (256, 256), dtype=np.uint8)
    assert "noise_like" in _codes(noise)


def test_blank_is_flagged():
    assert "blank_image" in _codes(np.full((200, 200), 30, np.uint8))


def test_extreme_aspect_and_tiny_are_flagged():
    assert "unusual_aspect_ratio" in _codes(np.tile(np.linspace(0, 255, 600, dtype=np.uint8), (100, 1)))
    assert "low_resolution" in _codes(cv2.resize(_structured(), (32, 32)))


def test_assess_modes_and_note():
    g = _structured()
    ok = assess_input(g, _prep(g), None, None, "warn")
    assert ok["status"] == "ok" and ok["learned_check"] == "unavailable" and ok["note"]
    off = assess_input(np.full((200, 200), 30, np.uint8), _prep(np.full((200, 200), 30, np.uint8)), None, None, "off")
    assert off["status"] == "ok" and off["learned_check"] == "off"
