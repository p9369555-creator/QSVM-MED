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


def _head_and_brain_masks(img_gray: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    (head_mask, brain_mask) as 128x128 booleans, built from the RAW image (CLAHE brightens background noise).
    head = whole head incl. skull/scalp; brain = head eroded by ~10% of its diameter (approx. intracranial area).
    """
    small = cv2.resize(img_gray, (128, 128), interpolation=cv2.INTER_AREA)
    blur = cv2.GaussianBlur(small, (5, 5), 0)
    otsu, _ = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = (blur > max(8.0, 0.45 * otsu)).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n > 1:                                            # keep only the largest bright blob (the head)
        mask = (labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    # Fill interior holes (dark ventricles etc.). The frame is padded first so that ALL background touching
    # the frame is connected; otherwise a head touching the top and bottom edges splits the background in
    # two and one side is wrongly treated as a "hole" inside the head.
    padded = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    flood = padded.copy()
    cv2.floodFill(flood, np.zeros((padded.shape[0] + 2, padded.shape[1] + 2), np.uint8), (0, 0), 1)
    head = mask | (1 - flood[1:-1, 1:-1])

    diameter = 2.0 * np.sqrt(max(1.0, float(head.sum())) / np.pi)
    r = max(2, int(round(0.10 * diameter)))
    brain = cv2.erode(head, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    if brain.sum() < 0.10 * head.sum():                  # tiny/odd mask: fall back to the head mask
        brain = head
    return head.astype(bool), brain.astype(bool)


def generate_heatmap(
    img_gray: np.ndarray,
    resized_128: np.ndarray,
    feat_unperturbed: np.ndarray,
    std_scaler: Any,
    pca_transformer: Any,
    angle_scaler: Any,
    target_model: Any,
    model_label: str = "QSVM (qsvm_model.pkl)",
    patch_size: int = 24,
    stride: int = 8,
    predicted_idx: int = 1,
) -> dict[str, Any]:
    """
    Occlusion sensitivity on `target_model`: how much does the PREDICTED class' probability DROP when a
    local region is blurred out? (Regions that support the prediction.)

    Improvements over the first version: overlapping 24px windows (stride 8) instead of 16 coarse 32px
    blocks; blur-fill instead of a flat median (no artificial edges); only the brain interior is shown, and
    the share of sensitivity that fell OUTSIDE it (skull rim/background) is reported openly rather than hidden.
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
    fill = cv2.GaussianBlur(resized_128, (0, 0), sigmaX=10)          # blur-occlusion (no hard edges)

    def pred_prob(p_tumor):
        return p_tumor if predicted_idx == 1 else 1.0 - p_tumor

    orig_pred_prob = float(pred_prob(_extract_tumor_probabilities(target_model, feat_unperturbed)[0]))

    perturbed_batch, patch_coords = [], []
    for y in range(0, H - patch_size + 1, stride):
        for x in range(0, W - patch_size + 1, stride):
            perturbed = resized_128.copy()
            perturbed[y: y + patch_size, x: x + patch_size] = fill[y: y + patch_size, x: x + patch_size]
            perturbed_batch.append(perturbed.flatten())
            patch_coords.append((y, x))

    batch_arr = np.array(perturbed_batch, dtype=np.float32)
    batch_angles = angle_scaler.transform(pca_transformer.transform(std_scaler.transform(batch_arr)))
    perturbed_probs = pred_prob(_extract_tumor_probabilities(target_model, batch_angles))

    sens = np.zeros((H, W), dtype=np.float32)
    count = np.zeros((H, W), dtype=np.float32)
    for (y, x), p in zip(patch_coords, perturbed_probs):
        drop = max(0.0, orig_pred_prob - float(p))                   # only evidence FOR the prediction
        sens[y: y + patch_size, x: x + patch_size] += drop
        count[y: y + patch_size, x: x + patch_size] += 1.0
    sens /= np.maximum(count, 1.0)
    sens = cv2.GaussianBlur(sens, (0, 0), sigmaX=3)

    head_mask, mask = _head_and_brain_masks(img_gray)
    total = float(sens.sum())
    outside_share = float(sens[~mask].sum() / total) if total > 1e-9 else 0.0
    sens_head = np.where(mask, sens, 0.0)
    max_importance = float(sens_head.max())

    if max_importance > 1e-6:
        norm_map = (sens_head / max_importance * 255.0).astype(np.uint8)
    else:
        norm_map = np.zeros((H, W), dtype=np.uint8)

    # up to 3 DISTINCT hotspots (suppress neighbours within 20px), each at least 35% of the peak
    hotspots, work = [], sens_head.copy()
    for _ in range(3):
        if max_importance <= 1e-6:
            break
        cy, cx = np.unravel_index(int(np.argmax(work)), work.shape)
        val = float(work[cy, cx])
        if val < 0.35 * max_importance:
            break
        hotspots.append({
            "x": int(cx / 128.0 * W_orig),
            "y": int(cy / 128.0 * H_orig),
            "norm_x": round(float(cx) / 128.0, 3),
            "norm_y": round(float(cy) / 128.0, 3),
            "intensity": round(val / max_importance, 3),
            "radius": int(max(12, min(W_orig, H_orig) * 0.06)),
        })
        cv2.circle(work, (int(cx), int(cy)), 20, 0.0, -1)

    heatmap_orig_res = cv2.resize(norm_map, (W_orig, H_orig), interpolation=cv2.INTER_CUBIC)
    color_hot = cv2.applyColorMap(heatmap_orig_res, cv2.COLORMAP_HOT)
    alpha = (heatmap_orig_res.astype(np.float32) / 255.0 * 200.0).astype(np.uint8)
    alpha[heatmap_orig_res < 40] = 0

    rgba = cv2.merge([color_hot[:, :, 0], color_hot[:, :, 1], color_hot[:, :, 2], alpha])
    success, encoded = cv2.imencode(".png", rgba)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to encode occlusion sensitivity heatmap.",
        )

    limitations = (
        f"Occlusion sensitivity on {model_label}: shows brain-interior regions whose blurring lowers the predicted class' "
        "probability. The model sees only 8 global PCA values of raw pixels, so this is NOT a tumor "
        "segmentation or locator."
    )
    warning = None
    if outside_share > 0.5:
        warning = (f"{outside_share:.0%} of the model's sensitivity was on the skull/scalp rim or background, "
                   "not the brain interior, so this prediction leans on head outline rather than tissue. "
                   "Treat it with extra suspicion.")

    return {
        "status": "ready",
        "evaluated_model": model_label,
        "heatmap_base64": f"data:image/png;base64,{base64.b64encode(encoded).decode('ascii')}",
        "method": f"Occlusion Sensitivity on {model_label} (overlapping {patch_size}px windows, blur fill, brain interior only)",
        "patch_size": patch_size,
        "stride": stride,
        "total_perturbations": len(perturbed_batch),
        "original_width": W_orig,
        "original_height": H_orig,
        "max_importance": round(max_importance, 5),
        "outside_head_importance_share": round(outside_share, 3),
        "warning": warning,
        "limitations": limitations,
        "hotspots": hotspots,
    }
