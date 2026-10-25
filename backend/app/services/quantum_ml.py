# File: backend/app/services/quantum_ml.py
import base64
from typing import Any
import cv2
import numpy as np
from fastapi import HTTPException, status


def _extract_tumor_probabilities(model: Any, feat_batch: np.ndarray) -> np.ndarray:
    """Extracts calibrated P(Tumor Cell) for a batch of 8-angle feature vectors."""
    if not hasattr(model, "predict_proba"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "model": "unavailable",
                "message": "Target model does not support calibrated predict_proba.",
            },
        )
    probs = np.asarray(model.predict_proba(feat_batch), dtype=np.float64)
    if probs.shape[1] == 2:
        return probs[:, 1]
    return np.sum(probs[:, 1:], axis=1)


def generate_heatmap(
    img_gray: np.ndarray,
    resized_128: np.ndarray,
    feat_unperturbed: np.ndarray,
    std_scaler: Any,
    pca_transformer: Any,
    angle_scaler: Any,
    target_model: Any,
    model_label: str = "QSVM (qsvm_model.pkl)",
    patch_size: int = 32,
    stride: int = 32,
) -> dict[str, Any]:
    """
    Computes sliding-window occlusion sensitivity directly on `target_model` (QSVM).
    Returns a single dictionary (not a tuple) containing the Base64 heatmap,
    explainability metadata, and the top spatial `hotspots`.
    """
    if target_model is None or std_scaler is None or pca_transformer is None or angle_scaler is None:
        return {
            "status": "unavailable",
            "evaluated_model": "unavailable",
            "heatmap_base64": None,
            "method": "Occlusion Sensitivity",
            "patch_size": patch_size,
            "stride": stride,
            "total_perturbations": 0,
            "original_width": int(img_gray.shape[1]),
            "original_height": int(img_gray.shape[0]),
            "max_importance": 0.0,
            "limitations": "Target QSVM model or preprocessing transformers are unavailable.",
            "hotspots": [],
        }

    H_orig, W_orig = img_gray.shape[:2]
    H, W = resized_128.shape
    baseline_val = float(np.median(resized_128))

    orig_tumor_prob = float(_extract_tumor_probabilities(target_model, feat_unperturbed)[0])

    perturbed_batch = []
    patch_coords = []
    for y in range(0, H - patch_size + 1, stride):
        for x in range(0, W - patch_size + 1, stride):
            perturbed = resized_128.copy()
            perturbed[y : y + patch_size, x : x + patch_size] = baseline_val
            perturbed_batch.append(perturbed.flatten())
            patch_coords.append((y, x))

    batch_arr = np.array(perturbed_batch, dtype=np.float32)
    batch_angles = angle_scaler.transform(
        pca_transformer.transform(std_scaler.transform(batch_arr))
    )
    perturbed_tumor_probs = _extract_tumor_probabilities(target_model, batch_angles)

    sensitivity_map = np.zeros((H, W), dtype=np.float32)
    count_map = np.zeros((H, W), dtype=np.float32)
    patch_importances = []

    for (y, x), p_prob in zip(patch_coords, perturbed_tumor_probs):
        importance = float(abs(orig_tumor_prob - float(p_prob)))
        sensitivity_map[y : y + patch_size, x : x + patch_size] += importance
        count_map[y : y + patch_size, x : x + patch_size] += 1.0
        patch_importances.append((importance, x + patch_size // 2, y + patch_size // 2))

    count_map[count_map == 0] = 1.0
    sensitivity_map /= count_map

    pos_sensitivity = np.maximum(sensitivity_map, 0.0)
    max_importance = float(np.max(pos_sensitivity))

    if max_importance > 1e-6:
        norm_map = (pos_sensitivity / max_importance * 255.0).astype(np.uint8)
    else:
        norm_map = np.zeros((H, W), dtype=np.uint8)

    patch_importances.sort(key=lambda item: item[0], reverse=True)
    hotspots = []
    for imp, cx, cy in patch_importances[:3]:
        if max_importance > 1e-6:
            hotspots.append({
                "x": int(cx / 128.0 * W_orig),
                "y": int(cy / 128.0 * H_orig),
                "norm_x": round(cx / 128.0, 3),
                "norm_y": round(cy / 128.0, 3),
                "intensity": round(float(imp / max_importance), 3),
                "radius": int(max(12, min(W_orig, H_orig) * 0.06)),
            })

    smoothed_map = cv2.GaussianBlur(norm_map, (15, 15), 0)
    heatmap_orig_res = cv2.resize(smoothed_map, (W_orig, H_orig), interpolation=cv2.INTER_LINEAR)
    color_hot = cv2.applyColorMap(heatmap_orig_res, cv2.COLORMAP_HOT)

    alpha = (heatmap_orig_res.astype(np.float32) / 255.0 * 220.0).astype(np.uint8)
    alpha[heatmap_orig_res < 25] = 0

    rgba = cv2.merge([color_hot[:, :, 0], color_hot[:, :, 1], color_hot[:, :, 2], alpha])
    success, encoded = cv2.imencode(".png", rgba)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to encode occlusion sensitivity heatmap.",
        )

    b64_str = base64.b64encode(encoded).decode("ascii")
    return {
        "status": "ready",
        "evaluated_model": model_label,
        "heatmap_base64": f"data:image/png;base64,{b64_str}",
        "method": f"Occlusion Sensitivity on {model_label} (Sliding-Window Perturbation)",
        "patch_size": patch_size,
        "stride": stride,
        "total_perturbations": len(perturbed_batch),
        "original_width": W_orig,
        "original_height": H_orig,
        "max_importance": round(max_importance, 5),
        "limitations": (
            f"Occlusion sensitivity computed directly on {model_label}. "
            "Highlights 8-PCA regional influence rather than pixel segmentation."
        ),
        "hotspots": hotspots,
    }