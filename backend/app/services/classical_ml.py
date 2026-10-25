# File: backend/app/services/classical_ml.py
from typing import Any

from app.services.pipeline import decode_medical_image, extract_8_quantum_angles
from app.services.qsvm_engine import QSVMEngine

_engine: QSVMEngine | None = None


def _get_engine() -> QSVMEngine:
    """Lazily load the trained models once when this helper is used outside the FastAPI app."""
    global _engine
    if _engine is None:
        _engine = QSVMEngine()
        _engine.load_models()
    return _engine


def process_image_classical(image_bytes: bytes, filename: str = "", engine: QSVMEngine | None = None) -> dict[str, Any]:
    """
    Runs ONLY the calibrated classical SVM on a scan (no QSVM, no heatmap).
    (The old version imported a PipelineOrchestrator class that never existed.)
    """
    engine = engine or _get_engine()
    gray_img, meta = decode_medical_image(image_bytes, filename)
    feat_angles, _ = extract_8_quantum_angles(
        gray_img, engine.std_scaler, engine.pca_transformer, engine.angle_scaler
    )
    idx, probs = engine.predict_calibrated_binary(
        engine.classical_svm, feat_angles, "classical_baseline_svm.pkl"
    )
    labels = ["Normal Cell", "Tumor Cell"]
    return {
        "predicted_class": labels[idx],
        "confidence": round(float(probs[idx]), 4),
        "probabilities": {"normal": round(float(probs[0]), 4), "tumor": round(float(probs[1]), 4)},
        "pca_angles": [round(float(a), 4) for a in feat_angles[0]],
        "source_format": meta.get("format"),
    }
