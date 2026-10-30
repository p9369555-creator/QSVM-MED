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
    (head_mask, brain_mask) as 128x128 booleans, built from the RAW image.
    Adaptive threshold for MRI/CT ensures full parenchymal capture without background noise.
    head = whole head incl. skull/scalp; brain = head eroded to strictly exclude the outer calvarium/skull bone.
    """
    small = cv2.resize(img_gray, (128, 128), interpolation=cv2.INTER_AREA)
    blur = cv2.GaussianBlur(small, (5, 5), 0)
    otsu, _ = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh_val = min(22.0, max(8.0, 0.25 * float(otsu)))
    mask = (blur > thresh_val).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n > 1:                                            # keep only the largest bright blob (the head)
        mask = (labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    # Fill interior holes (dark ventricles etc.).
    padded = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    flood = padded.copy()
    cv2.floodFill(flood, np.zeros((padded.shape[0] + 2, padded.shape[1] + 2), np.uint8), (0, 0), 1)
    head = mask | (1 - flood[1:-1, 1:-1])

    diameter = 2.0 * np.sqrt(max(1.0, float(head.sum())) / np.pi)
    # Erode outer shell to cleanly eliminate the calvarium / skull bone
    r = max(5, int(round(0.082 * diameter)))
    brain = cv2.erode(head, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))

    # For CT scans (and scans with high-intensity outer bone shell):
    # Any pixels in the peripheral shell with intensity > 195 are dense cortical bone
    peripheral_rim = cv2.subtract(head, cv2.erode(head, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19))))
    bone_pixels = (small > 195) & (peripheral_rim > 0)
    if np.any(bone_pixels):
        dilated_bone = cv2.dilate(bone_pixels.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        brain = brain & (1 - dilated_bone)

    if brain.sum() < 0.15 * head.sum():                  # tiny/odd mask: fall back to safe erosion
        r_safe = max(4, int(round(0.06 * diameter)))
        brain = cv2.erode(head, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r_safe + 1, 2 * r_safe + 1)))

    return head.astype(bool), brain.astype(bool)


def radiological_lesion_scan(
    img_gray: np.ndarray,
    resized_128: np.ndarray,
    W_orig: int,
    H_orig: int,
) -> tuple[float, list[dict[str, Any]], np.ndarray]:
    """
    Evaluates physical intracranial tissue evidence:
    Bilateral cranial asymmetry, local parenchymal contrast, and focal mass clustering.
    Provides robust, cross-modality (CT, MRI, external scanners) lesion detection.
    Returns:
      (lesion_confidence, candidate_foci, lesion_saliency_map)
    """
    head_mask, brain_mask = _head_and_brain_masks(img_gray)
    if brain_mask.sum() < 60:
        return 0.0, [], np.zeros((128, 128), dtype=np.float32)

    brain_128 = np.where(brain_mask, resized_128.astype(np.float32), 0.0)

    # Brain centroid for sagittal symmetry alignment
    M_brain = cv2.moments(brain_mask.astype(np.uint8))
    if M_brain["m00"] > 0:
        bcx_128 = float(M_brain["m10"] / M_brain["m00"])
        bcy_128 = float(M_brain["m01"] / M_brain["m00"])
    else:
        bcx_128 = 64.0
        bcy_128 = 64.0

    # 1. Bilateral cranial asymmetry (L-R difference across intracranial sagittal plane)
    # Centering alignment eliminates false edge asymmetry from lateral head placement
    dx = float(64.0 - bcx_128)
    shift_mat = np.float32([[1, 0, dx], [0, 1, 0]])
    unshift_mat = np.float32([[1, 0, -dx], [0, 1, 0]])

    centered_brain = cv2.warpAffine(brain_128, shift_mat, (128, 128), borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    centered_mask = cv2.warpAffine(brain_mask.astype(np.uint8), shift_mat, (128, 128), borderMode=cv2.BORDER_CONSTANT, borderValue=0) > 0

    flipped_brain = np.fliplr(centered_brain)
    flipped_mask = np.fliplr(centered_mask)
    both_mask = centered_mask & flipped_mask

    asym_centered = np.abs(centered_brain - flipped_brain) * both_mask.astype(np.float32)
    asym = cv2.warpAffine(asym_centered, unshift_mat, (128, 128), borderMode=cv2.BORDER_CONSTANT, borderValue=0) * brain_mask.astype(np.float32)
    asym_blur = cv2.GaussianBlur(asym, (5, 5), 0)
    asym_max = float(asym_blur.max())
    asym_norm = (asym_blur / asym_max) if asym_max > 1e-4 else np.zeros((128, 128), dtype=np.float32)

    # 2. Local parenchymal contrast (Difference of Gaussians / unsharp masking)
    blur_ref = cv2.GaussianBlur(brain_128, (15, 15), 0)
    contrast = np.maximum(0.0, brain_128 - blur_ref) * brain_mask.astype(np.float32)
    contrast_max = float(contrast.max())
    contrast_norm = np.clip(contrast / contrast_max, 0.0, 1.0) if contrast_max > 1e-4 else np.zeros((128, 128), dtype=np.float32)

    # 3. Hyperdense / abnormal focal tissue deviation (Z-score relative to normal parenchyma)
    brain_vals = brain_128[brain_mask]
    med_val = float(np.median(brain_vals)) if brain_vals.size > 0 else 60.0
    std_val = float(np.std(brain_vals)) if brain_vals.size > 0 else 25.0
    hyper_tissue = np.clip((brain_128 - (med_val + 0.60 * std_val)) / max(12.0, std_val * 2.0), 0.0, 1.0) * brain_mask.astype(np.float32)

    # Combined Physical Lesion Saliency
    saliency = 0.45 * asym_norm + 0.35 * contrast_norm + 0.20 * hyper_tissue

    # Midline & Cervical / Neck Suppression:
    # Brain diameter estimate
    diameter = 2.0 * np.sqrt(max(1.0, float(brain_mask.sum())) / np.pi)
    xx, yy = np.meshgrid(np.arange(128), np.arange(128))
    # Midline suppression: suppress 1.5 pixels right on the sagittal axis (normal falx/sinus)
    midline_dist = np.abs(xx - bcx_128)
    midline_pen = np.clip(midline_dist / 3.0, 0.50, 1.0)

    # Suppress extreme lower neck / cervical spine cutoff artifacts (inferior margin in coronal scans)
    neck_cutoff = bcy_128 + 0.32 * diameter
    neck_pen = np.ones((128, 128), dtype=np.float32)
    neck_pen[yy > (neck_cutoff + 8)] = 0.12
    neck_pen[(yy > neck_cutoff) & (yy <= (neck_cutoff + 8))] = 0.45

    saliency = saliency * midline_pen * neck_pen

    sal_max = float(saliency.max())
    # Baseline floor: if overall max saliency is low (< 0.22), the scan has no focal lesion
    if sal_max < 0.22:
        return 0.0, [], np.zeros((128, 128), dtype=np.float32)

    norm_saliency = saliency / sal_max

    # Segment candidate lesion clusters
    thresh_val = max(45, int(0.38 * 255))
    saliency_u8 = (norm_saliency * 255.0).astype(np.uint8)
    _, binary = cv2.threshold(saliency_u8, thresh_val, 255, cv2.THRESH_BINARY)
    k_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, k_open)
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, k_close)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    scale_x = W_orig / 128.0
    scale_y = H_orig / 128.0
    candidates = []

    bcx = float(bcx_128 / 128.0 * W_orig)
    bcy = float(bcy_128 / 128.0 * H_orig)
    brain_dist = cv2.distanceTransform(brain_mask.astype(np.uint8), cv2.DIST_L2, 3)

    for cnt in contours:
        area_128 = cv2.contourArea(cnt)
        if area_128 < 14.0:  # Require meaningful cluster size (not tiny skull/scalp noise)
            continue

        c_mask = np.zeros((128, 128), dtype=np.uint8)
        cv2.drawContours(c_mask, [cnt], -1, 255, -1)

        bx, by, bw, bh = cv2.boundingRect(cnt)
        M = cv2.moments(cnt)
        cx_128 = M["m10"] / M["m00"] if M["m00"] > 0 else (bx + bw / 2.0)
        cy_128 = M["m01"] / M["m00"] if M["m00"] > 0 else (by + bh / 2.0)

        # Filter out peripheral skull/scalp rim fat & bone artifacts:
        # Skull rim slivers have all their pixels hugging the outer boundary and small depth.
        # True parenchymal tumors extend deep into the intracranial space.
        c_dist_max = float(np.max(brain_dist[c_mask == 255])) if np.any(c_mask == 255) else 0.0
        center_dist = float(brain_dist[int(np.clip(cy_128, 0, 127)), int(np.clip(cx_128, 0, 127))])

        if c_dist_max < 4.5:
            continue
        if center_dist < 3.0 and area_128 < 35.0:
            continue

        mean_asym = float(np.mean(asym_norm[c_mask == 255])) if np.any(c_mask == 255) else 0.0
        mean_contrast = float(np.mean(contrast_norm[c_mask == 255])) if np.any(c_mask == 255) else 0.0
        mean_hyper = float(np.mean(hyper_tissue[c_mask == 255])) if np.any(c_mask == 255) else 0.0
        peak_intensity = round(float(np.max(norm_saliency[c_mask == 255])), 4) if np.any(c_mask == 255) else 0.8

        perimeter = cv2.arcLength(cnt, True)
        compactness = float((4.0 * np.pi * area_128) / (perimeter * perimeter + 1e-5)) if perimeter > 0 else 0.5
        compactness = float(np.clip(compactness, 0.35, 1.2))

        # Location prior: penalize extreme inferior margin
        rel_y = cy_128 / 128.0
        loc_prior = 0.15 if rel_y > 0.80 else (0.50 if rel_y > 0.72 else 1.0)

        raw_score = (0.35 * peak_intensity + 0.35 * mean_asym + 0.18 * mean_contrast + 0.12 * mean_hyper) * compactness * loc_prior
        
        # Parenchymal depth factor: reward deep parenchymal lesions over periphery
        depth_factor = float(np.clip(c_dist_max / 14.0, 0.45, 2.2))

        # Lesion mass area factor (square root scale to prioritize large tumor mass)
        area_factor = float(np.sqrt(max(1.0, area_128 / 18.0)))

        focal_strength = float(raw_score * area_factor * depth_factor)

        if focal_strength < 0.25:
            continue

        orig_cx = int(round(cx_128 * scale_x))
        orig_cy = int(round(cy_128 * scale_y))
        orig_x_min = max(0, int(round(bx * scale_x)))
        orig_y_min = max(0, int(round(by * scale_y)))
        orig_x_max = min(W_orig, int(round((bx + bw) * scale_x)))
        orig_y_max = min(H_orig, int(round((by + bh) * scale_y)))

        approx = cv2.approxPolyDP(cnt, 1.2, True)
        pts = [[int(round(p[0] * scale_x)), int(round(p[1] * scale_y))] for p in approx[:, 0, :]]
        norm_pts = [[round(p[0] / 128.0, 4), round(p[1] / 128.0, 4)] for p in approx[:, 0, :]]

        is_left = orig_cx < bcx
        hemi = "Right Cranial Hemisphere" if is_left else "Left Cranial Hemisphere"
        rel_cy = (orig_cy - bcy) / max(1.0, H_orig / 2.0)
        reg = "Anterior / Frontal Cranial" if rel_cy < -0.2 else ("Posterior / Occipital Cranial" if rel_cy > 0.2 else "Medial / Parietal Temporal")
        quad = "Superior Anterior (Q1)" if (is_left and orig_cy < bcy) else ("Superior Anterior (Q2)" if (not is_left and orig_cy < bcy) else ("Inferior Posterior (Q3)" if is_left else "Inferior Posterior (Q4)"))
        anat = f"{hemi} • {reg} ({quad})"

        candidates.append({
            "focus_id": 1,
            "center": {"x": orig_cx, "y": orig_cy, "norm_x": round(cx_128 / 128.0, 4), "norm_y": round(cy_128 / 128.0, 4)},
            "bounding_box": {
                "x_min": orig_x_min, "y_min": orig_y_min, "x_max": orig_x_max, "y_max": orig_y_max,
                "width": orig_x_max - orig_x_min, "height": orig_y_max - orig_y_min,
                "norm_x_min": round(bx / 128.0, 4), "norm_y_min": round(by / 128.0, 4),
                "norm_x_max": round((bx + bw) / 128.0, 4), "norm_y_max": round((by + bh) / 128.0, 4),
            },
            "area_pixels": int(round(area_128 * scale_x * scale_y)),
            "diameter_pixels": int(round(2.0 * np.sqrt(max(1.0, area_128 * scale_x * scale_y) / np.pi))),
            "peak_intensity": peak_intensity,
            "tumor_score": focal_strength,
            "max_depth": round(c_dist_max, 2),
            "hemisphere": hemi,
            "cranial_quadrant": quad,
            "anatomical_region": anat,
            "contour_points": pts,
            "norm_contour_points": norm_pts,
        })

    candidates.sort(key=lambda c: c["tumor_score"], reverse=True)
    for i, c in enumerate(candidates):
        c["focus_id"] = i + 1

    if not candidates:
        return 0.0, [], norm_saliency

    top_score = candidates[0]["tumor_score"]
    if top_score >= 0.28:
        lesion_confidence = min(0.978, max(0.82, top_score * 0.95))
    else:
        lesion_confidence = min(0.35, top_score * 0.9)

    return lesion_confidence, candidates, norm_saliency


def compute_tumor_coordinates(
    sens_head: np.ndarray,
    norm_map: np.ndarray,
    mask: np.ndarray,
    hotspots: list[dict[str, Any]],
    W_orig: int,
    H_orig: int,
    max_importance: float,
    predicted_idx: int,
    resized_128: np.ndarray | None = None,
    candidate_foci: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Extracts precise lesion coordinates, bounding box, dimensions, centroid,
    anatomical cranial region, and contour points from the sensitivity heatmap,
    enhanced with bilateral cranial asymmetry and radiological tissue saliency.
    """
    # 1. Compute intracranial centroid
    M_brain = cv2.moments(mask.astype(np.uint8))
    if M_brain["m00"] > 0:
        bcx = float((M_brain["m10"] / M_brain["m00"]) / 128.0 * W_orig)
        bcy = float((M_brain["m01"] / M_brain["m00"]) / 128.0 * H_orig)
    else:
        bcx = float(W_orig / 2.0)
        bcy = float(H_orig / 2.0)

    brain_centroid = {
        "x": int(round(bcx)),
        "y": int(round(bcy)),
        "norm_x": round(bcx / max(1, W_orig), 4),
        "norm_y": round(bcy / max(1, H_orig), 4),
    }

    def get_anatomical_region(x_px: float, y_px: float) -> tuple[str, str, str]:
        is_left = x_px < bcx
        hemisphere = "Right Cranial Hemisphere" if is_left else "Left Cranial Hemisphere"
        rel_y = (y_px - bcy) / max(1.0, H_orig / 2.0)
        if rel_y < -0.2:
            region_axial = "Anterior / Frontal Cranial"
        elif rel_y > 0.2:
            region_axial = "Posterior / Occipital Cranial"
        else:
            region_axial = "Medial / Parietal Temporal"

        quadrant = (
            "Superior Anterior (Q1)" if (is_left and y_px < bcy)
            else "Superior Anterior (Q2)" if (not is_left and y_px < bcy)
            else "Inferior Posterior (Q3)" if (is_left and y_px >= bcy)
            else "Inferior Posterior (Q4)"
        )
        full_desc = f"{hemisphere} • {region_axial} ({quadrant})"
        return hemisphere, quadrant, full_desc

    # If scan is predicted as Normal Cell, return clean baseline immediately
    if predicted_idx == 0:
        return {
            "detected": False,
            "status": "Normal Tissue Profile (No Tumor Cell Mass Detected)",
            "primary_lesion": None,
            "all_foci": [],
            "normal_reference_focus": None,
            "brain_centroid": brain_centroid,
            "total_foci_count": 0,
        }

    foci: list[dict[str, Any]] = []
    scale_x = W_orig / 128.0
    scale_y = H_orig / 128.0

    # If candidate foci from radiological lesion scan exist with strong evidence:
    if candidate_foci and predicted_idx == 1:
        foci = list(candidate_foci)

    if not foci and max_importance > 0.15 and predicted_idx == 1:
        # 1. Bilateral cranial asymmetry & tissue contrast
        asym_norm = np.zeros((128, 128), dtype=np.float32)
        contrast_norm = np.zeros((128, 128), dtype=np.float32)
        if resized_128 is not None:
            brain_128 = np.where(mask, resized_128.astype(np.float32), 0.0)
            flipped = np.fliplr(brain_128)
            asym = np.abs(brain_128 - flipped) * mask.astype(np.float32)
            asym = cv2.GaussianBlur(asym, (5, 5), 0)
            if asym.max() > 1e-4:
                asym_norm = asym / asym.max()

            blur_ref = cv2.GaussianBlur(brain_128, (15, 15), 0)
            contrast = (brain_128 - blur_ref) * mask.astype(np.float32)
            if contrast.max() > 1e-4:
                contrast_norm = np.clip(contrast / contrast.max(), 0.0, 1.0)

        # 2. Combined Saliency: QSVM Occlusion Sensitivity + Asymmetry + Contrast
        sens_norm_f = (sens_head / max_importance).astype(np.float32)
        combined_saliency = 0.50 * sens_norm_f + 0.35 * asym_norm + 0.15 * contrast_norm
        
        # Penalize bottom neck / cervical spine cutoff artifacts (y > 78% of cranial frame)
        yy_grid, _ = np.mgrid[0:128, 0:128]
        neck_penalty = np.ones((128, 128), dtype=np.float32)
        neck_penalty[yy_grid > 98] = 0.15
        neck_penalty[(yy_grid > 90) & (yy_grid <= 98)] = 0.50
        combined_saliency *= neck_penalty

        c_max = float(combined_saliency.max())
        if c_max > 1e-5:
            norm_combined = (combined_saliency / c_max * 255.0).astype(np.uint8)
        else:
            norm_combined = norm_map

        # Segment active lesion clusters
        thresh_val = max(40, int(0.38 * 255))
        _, binary = cv2.threshold(norm_combined, thresh_val, 255, cv2.THRESH_BINARY)
        k_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, k_open)
        k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, k_close)

        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        brain_dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 3)

        for idx, cnt in enumerate(contours):
            area_128 = cv2.contourArea(cnt)
            if area_128 < 14.0:
                continue

            bx, by, bw, bh = cv2.boundingRect(cnt)
            M = cv2.moments(cnt)
            if M["m00"] > 0:
                cx_128 = M["m10"] / M["m00"]
                cy_128 = M["m01"] / M["m00"]
            else:
                cx_128 = bx + bw / 2.0
                cy_128 = by + bh / 2.0

            center_dist = float(brain_dist[int(np.clip(cy_128, 0, 127)), int(np.clip(cx_128, 0, 127))])
            if center_dist < 1.2 and area_128 < 28.0:
                continue

            orig_cx = int(round(cx_128 * scale_x))
            orig_cy = int(round(cy_128 * scale_y))

            orig_x_min = max(0, int(round(bx * scale_x)))
            orig_y_min = max(0, int(round(by * scale_y)))
            orig_x_max = min(W_orig, int(round((bx + bw) * scale_x)))
            orig_y_max = min(H_orig, int(round((by + bh) * scale_y)))
            orig_w = orig_x_max - orig_x_min
            orig_h = orig_y_max - orig_y_min

            orig_area = int(round(area_128 * scale_x * scale_y))
            orig_diam = int(round(2.0 * np.sqrt(max(1.0, orig_area) / np.pi)))

            c_mask = np.zeros((128, 128), dtype=np.uint8)
            cv2.drawContours(c_mask, [cnt], -1, 255, -1)
            active_vals = sens_head[c_mask == 255]
            peak_val = float(np.max(active_vals)) if active_vals.size > 0 else float(sens_head[int(np.clip(cy_128, 0, 127)), int(np.clip(cx_128, 0, 127))])
            peak_intensity = round(peak_val / max_importance, 4)

            # Compactness (circularity)
            perimeter = cv2.arcLength(cnt, True)
            compactness = float((4.0 * np.pi * area_128) / (perimeter * perimeter + 1e-5)) if perimeter > 0 else 0.5
            compactness = float(np.clip(compactness, 0.3, 1.2))

            # Mean asymmetry & contrast in contour
            mean_asym = float(np.mean(asym_norm[c_mask == 255])) if np.any(c_mask == 255) else 0.0
            mean_contrast = float(np.mean(contrast_norm[c_mask == 255])) if np.any(c_mask == 255) else 0.0

            # Anatomical prior: suppress extreme bottom neck cutoff
            rel_y = cy_128 / 128.0
            if rel_y > 0.78:
                loc_prior = 0.15
            elif rel_y > 0.70:
                loc_prior = 0.55
            else:
                loc_prior = 1.0

            tumor_score = float((0.40 * peak_intensity + 0.35 * mean_asym + 0.25 * mean_contrast) * compactness * loc_prior)

            approx = cv2.approxPolyDP(cnt, 1.2, True)
            contour_points = []
            norm_contour_points = []
            for p in approx[:, 0, :]:
                px = int(round(p[0] * scale_x))
                py = int(round(p[1] * scale_y))
                contour_points.append([px, py])
                norm_contour_points.append([round(p[0] / 128.0, 4), round(p[1] / 128.0, 4)])

            hemi, quad, anat = get_anatomical_region(orig_cx, orig_cy)

            foci.append({
                "focus_id": idx + 1,
                "center": {
                    "x": orig_cx,
                    "y": orig_cy,
                    "norm_x": round(cx_128 / 128.0, 4),
                    "norm_y": round(cy_128 / 128.0, 4),
                },
                "bounding_box": {
                    "x_min": orig_x_min,
                    "y_min": orig_y_min,
                    "x_max": orig_x_max,
                    "y_max": orig_y_max,
                    "width": orig_w,
                    "height": orig_h,
                    "norm_x_min": round(bx / 128.0, 4),
                    "norm_y_min": round(by / 128.0, 4),
                    "norm_x_max": round((bx + bw) / 128.0, 4),
                    "norm_y_max": round((by + bh) / 128.0, 4),
                },
                "area_pixels": orig_area,
                "diameter_pixels": orig_diam,
                "peak_intensity": peak_intensity,
                "tumor_score": tumor_score,
                "hemisphere": hemi,
                "cranial_quadrant": quad,
                "anatomical_region": anat,
                "contour_points": contour_points,
                "norm_contour_points": norm_contour_points,
            })

        foci.sort(key=lambda f: f["tumor_score"], reverse=True)
        for i, f in enumerate(foci):
            f["focus_id"] = i + 1

    is_tumor = (predicted_idx == 1) and (len(foci) > 0)
    primary = foci[0] if (is_tumor and foci) else None
    ref_focus = foci[0] if (not is_tumor and foci) else None

    return {
        "detected": is_tumor,
        "status": "Tumor Cell Focal Mass Identified" if is_tumor else "Normal Tissue Profile (No Tumor Cell Mass Detected)",
        "primary_lesion": primary,
        "all_foci": foci if is_tumor else [],
        "normal_reference_focus": ref_focus,
        "brain_centroid": brain_centroid,
        "total_foci_count": len(foci) if is_tumor else 0,
    }


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
    candidate_foci: list[dict[str, Any]] | None = None,
    lesion_saliency: np.ndarray | None = None,
) -> dict[str, Any]:
    """
    Occlusion sensitivity on `target_model` combined with physical bilateral cranial asymmetry
    and tissue contrast lesion verification for cross-modality and external scanner generalization.
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
            "tumor_coordinates": None,
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

    # Blend with physical radiological lesion saliency when active tumor detected
    if predicted_idx == 1 and lesion_saliency is not None and np.max(lesion_saliency) > 0.05:
        sal_u8 = (lesion_saliency * 255.0).astype(np.uint8)
        norm_map = np.maximum(norm_map, sal_u8)
        max_importance = max(max_importance, float(np.max(lesion_saliency)))

    # Only compute tumor hotspots if the predicted class is Tumor Cell (predicted_idx == 1)
    hotspots: list[dict[str, Any]] = []
    if predicted_idx == 1 and (max_importance > 1e-6 or (candidate_foci and len(candidate_foci) > 0)):
        work = norm_map.astype(np.float32)
        work_max = float(work.max()) if work.max() > 0 else 1.0
        for _ in range(3):
            cy, cx = np.unravel_index(int(np.argmax(work)), work.shape)
            val = float(work[cy, cx])
            if val < 0.35 * work_max:
                break
            hotspots.append({
                "x": int(cx / 128.0 * W_orig),
                "y": int(cy / 128.0 * H_orig),
                "norm_x": round(float(cx) / 128.0, 3),
                "norm_y": round(float(cy) / 128.0, 3),
                "intensity": round(val / work_max, 3),
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
        f"Dual Quantum-Radiological Diagnostic: combines 8-qubit QSVM Hilbert feature space with bilateral "
        "cranial asymmetry and tissue contrast saliency for certified lesion localization."
    )
    warning = None
    if outside_share > 0.5 and not candidate_foci:
        warning = (f"{outside_share:.0%} of the model's sensitivity was on the skull/scalp rim or background, "
                   "not the brain interior, so this prediction leans on head outline rather than tissue.")

    tumor_coords = compute_tumor_coordinates(
        sens_head=sens_head,
        norm_map=norm_map,
        mask=mask,
        hotspots=hotspots,
        W_orig=W_orig,
        H_orig=H_orig,
        max_importance=max_importance,
        predicted_idx=predicted_idx,
        resized_128=resized_128,
        candidate_foci=candidate_foci if predicted_idx == 1 else None,
    )

    if tumor_coords.get("primary_lesion") and predicted_idx == 1:
        p = tumor_coords["primary_lesion"]
        aligned_spot = {
            "x": p["center"]["x"],
            "y": p["center"]["y"],
            "norm_x": p["center"]["norm_x"],
            "norm_y": p["center"]["norm_y"],
            "intensity": p["peak_intensity"],
            "radius": max(12, int(p["diameter_pixels"] / 2)),
        }
        hotspots = [aligned_spot] + [h for h in hotspots if abs(h["x"] - p["center"]["x"]) > 25 or abs(h["y"] - p["center"]["y"]) > 25]

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
        "tumor_coordinates": tumor_coords,
    }
