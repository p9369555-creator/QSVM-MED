# File: backend/app/services/pipeline.py
import io
from typing import Any
import cv2
import numpy as np
from PIL import Image
from fastapi import HTTPException, status

try:
    import pydicom
except ImportError:
    pydicom = None


def decode_medical_image(image_bytes: bytes, filename: str = "") -> tuple[np.ndarray, dict]:
    """
    Decodes DICOM or grayscale raster scans.
    Raises HTTP 422 on unreadable files, tiny images, or natural RGB photographs.
    """
    meta = {"format": "unknown", "modality": "MR"}

    is_dcm = (
        filename.lower().endswith((".dcm", ".dicom"))
        or image_bytes[:132].endswith(b"DICM")
        or image_bytes[:4] == b"DICM"
    )
    if is_dcm and pydicom is not None:
        try:
            ds = pydicom.dcmread(io.BytesIO(image_bytes), force=True)
            pixel_array = ds.pixel_array.astype(np.float32)
            slope = float(getattr(ds, "RescaleSlope", 1.0))
            intercept = float(getattr(ds, "RescaleIntercept", 0.0))
            pixel_array = pixel_array * slope + intercept

            photo_interp = str(getattr(ds, "PhotometricInterpretation", "MONOCHROME2")).strip().upper()
            if photo_interp == "MONOCHROME1":
                pixel_array = np.max(pixel_array) - pixel_array

            p_min, p_max = float(np.min(pixel_array)), float(np.max(pixel_array))
            if p_max > p_min:
                norm_img = ((pixel_array - p_min) / (p_max - p_min) * 255.0).astype(np.uint8)
            else:
                norm_img = np.zeros(pixel_array.shape, dtype=np.uint8)

            meta["format"] = "DICOM"
            return norm_img, meta
        except Exception as ex:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"DICOM Parsing Error: {ex}",
            )

    try:
        raw_img = Image.open(io.BytesIO(image_bytes))
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid image file: {ex}",
        )

    if raw_img.width < 10 or raw_img.height < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Image resolution is too small (minimum 10x10 pixels required).",
        )

    if raw_img.mode in ("RGB", "RGBA"):
        rgb_arr = np.array(raw_img.convert("RGB"), dtype=np.float32)
        r, g, b = rgb_arr[:, :, 0], rgb_arr[:, :, 1], rgb_arr[:, :, 2]
        color_diff = float(np.mean(np.abs(r - g) + np.abs(g - b) + np.abs(b - r)))
        if color_diff > 18.0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Non-medical color photo detected. Upload a grayscale Brain MRI scan.",
            )

    gray_img = np.array(raw_img.convert("L"), dtype=np.uint8)
    meta["format"] = raw_img.format or "RASTER"
    return gray_img, meta


def extract_8_quantum_angles(
    img_gray: np.ndarray,
    std_scaler: Any,
    pca_transformer: Any,
    angle_scaler: Any,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Runs CLAHE (clip 2.0, 8x8) -> 128x128 resize -> StandardScaler -> PCA(8) -> AngleScaler([-pi, pi]).
    Raises HTTP 503 if any trained transformer is missing (no SVD fallback).
    """
    if std_scaler is None or pca_transformer is None or angle_scaler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "model": "unavailable",
                "message": "Preprocessing transformers (.pkl) are not loaded on the server.",
            },
        )

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    clahe_img = clahe.apply(img_gray)
    resized_128 = cv2.resize(clahe_img, (128, 128), interpolation=cv2.INTER_AREA)
    flat_vec = resized_128.flatten().reshape(1, -1).astype(np.float32)

    feat_std = std_scaler.transform(flat_vec)
    feat_pca = pca_transformer.transform(feat_std)
    feat_angles = angle_scaler.transform(feat_pca)
    return np.asarray(feat_angles, dtype=np.float64), resized_128