# File: backend/app/services/input_check.py
"""
Input sanity checks for uploaded scans.

IMPORTANT: no check here can PROVE an image is a brain MRI. They only catch images that are
obviously unsuitable, and (if a validated detector exists) images that look unlike the
training data. A scan that passes is NOT confirmed to be a brain MRI.

Layer 1 - structural checks (always on, no training data needed):
    blank / constant image, extreme aspect ratio, very low resolution, noise-like image.
Layer 2 - learned "unlike the training data" check (only used when app/models/ood_detector.pkl
    exists AND was validated by build_ood_detector.py against non-brain probe images).
"""
from typing import Any

import numpy as np

MIN_SIDE_PX = 64
ASPECT_RANGE = (0.5, 2.0)
MIN_INTENSITY_STD = 10.0
MIN_NEIGHBOUR_CORR = 0.5

NOTE = "These checks cannot confirm the image is a brain MRI; they only catch clearly unsuitable inputs."


def _neighbour_correlation(img: np.ndarray) -> float:
    a = img[:, :-1].astype(np.float64).ravel()
    b = img[:, 1:].astype(np.float64).ravel()
    if a.std() < 1e-9 or b.std() < 1e-9:
        return 1.0
    return float(np.corrcoef(a, b)[0, 1])


def structural_checks(gray_img: np.ndarray, resized_128: np.ndarray) -> list[dict[str, str]]:
    reasons: list[dict[str, str]] = []
    h, w = gray_img.shape[:2]

    if float(gray_img.std()) < MIN_INTENSITY_STD:
        reasons.append({"code": "blank_image",
                        "message": "The image is almost uniform (blank or nearly blank)."})
    if min(h, w) < MIN_SIDE_PX:
        reasons.append({"code": "low_resolution",
                        "message": f"Very low resolution ({w}x{h}px); at least {MIN_SIDE_PX}px per side is expected."})
    aspect = w / max(1, h)
    if not (ASPECT_RANGE[0] <= aspect <= ASPECT_RANGE[1]):
        reasons.append({"code": "unusual_aspect_ratio",
                        "message": f"Unusual shape ({w}x{h}px). Brain MRI slices are close to square."})
    if _neighbour_correlation(resized_128) < MIN_NEIGHBOUR_CORR:
        reasons.append({"code": "noise_like",
                        "message": "The image looks like random noise rather than an anatomical scan."})
    return reasons


def learned_scores(resized_128: np.ndarray, std_scaler: Any, detector: dict) -> dict[str, float]:
    flat = resized_128.flatten().reshape(1, -1).astype(np.float32)
    z = std_scaler.transform(flat)
    pca = detector["pca"]
    p = pca.transform(z)
    k = p.shape[1]
    mahal = float(np.sqrt(np.sum(p ** 2 / pca.explained_variance_)) / np.sqrt(k))
    resid = float(np.linalg.norm(z - pca.inverse_transform(p)) / np.sqrt(z.shape[1]))
    return {"distance": round(mahal, 3), "residual": round(resid, 3)}


def assess_input(
    gray_img: np.ndarray,
    resized_128: np.ndarray,
    std_scaler: Any,
    detector: dict | None,
    mode: str = "warn",
) -> dict[str, Any]:
    if mode == "off":
        return {"status": "ok", "mode": "off", "reasons": [], "learned_check": "off", "note": NOTE}

    reasons = structural_checks(gray_img, resized_128)

    learned_state = "unavailable"
    scores = None
    if detector is not None and std_scaler is not None:
        if detector.get("validated"):
            learned_state = "active"
            scores = learned_scores(resized_128, std_scaler, detector)
            if (scores["distance"] > detector["distance_threshold"]
                    or scores["residual"] > detector["residual_threshold"]):
                reasons.append({
                    "code": "unlike_training_data",
                    "message": "This image looks statistically unlike the brain MRI scans the model was trained on "
                               "(different organ, modality, or scanner). The prediction is unreliable.",
                })
        else:
            learned_state = "not_validated"

    return {
        "status": "warning" if reasons else "ok",
        "mode": mode,
        "reasons": reasons,
        "learned_check": learned_state,
        "scores": scores,
        "note": NOTE,
    }
