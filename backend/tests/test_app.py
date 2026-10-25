# File: backend/tests/test_app.py
import io
import numpy as np
import pytest
from PIL import Image
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services.pipeline import decode_medical_image, extract_8_quantum_angles


def _make_image_bytes(mode: str = "L", size: tuple[int, int] = (128, 128)) -> bytes:
    rng = np.random.default_rng(42)
    if mode == "L":
        arr = rng.integers(25, 225, size=size, dtype=np.uint8)
    else:
        arr = np.zeros((size[0], size[1], 3), dtype=np.uint8)
        arr[:, :, 0] = 250
        arr[:, :, 1] = 15
        arr[:, :, 2] = 90
    img = Image.fromarray(arr, mode=mode)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_decode_medical_image_valid_grayscale():
    raw_bytes = _make_image_bytes(mode="L", size=(128, 128))
    gray, meta = decode_medical_image(raw_bytes, "brain_slice.png")
    assert gray.shape == (128, 128)
    assert gray.dtype == np.uint8
    assert meta["format"] == "PNG"


def test_decode_medical_image_rejects_rgb_photo():
    rgb_bytes = _make_image_bytes(mode="RGB", size=(128, 128))
    with pytest.raises(HTTPException) as exc:
        decode_medical_image(rgb_bytes, "portrait.png")
    assert exc.value.status_code == 422


def test_preprocessing_extract_8_quantum_angles():
    with TestClient(app) as client:
        engine = client.app.state.engine
        if not engine.get_status()["preprocessors"]:
            pytest.skip("Preprocessors not yet trained in app/models/")
        sample_img = np.random.default_rng(7).integers(0, 255, size=(160, 160), dtype=np.uint8)
        angles, resized = extract_8_quantum_angles(
            sample_img, engine.std_scaler, engine.pca_transformer, engine.angle_scaler
        )
        assert resized.shape == (128, 128)
        assert angles.shape == (1, 8)
        assert np.all(angles >= -np.pi - 1e-4) and np.all(angles <= np.pi + 1e-4)


def test_analyze_endpoint_smoke():
    scan_bytes = _make_image_bytes(mode="L", size=(128, 128))
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/analyze",
            files={"file": ("test_mri.png", scan_bytes, "image/png")},
            data={"study_modality": "brain_mri"},
        )
        assert res.status_code in (200, 503)
        payload = res.json()
        if res.status_code == 200:
            assert payload["status"] == "success"
            assert payload["model"] == "available"
            assert payload["predicted_class"] in ("Normal Cell", "Tumor Cell")
            assert 0.0 <= payload["confidence"] <= 1.0
            assert isinstance(payload["explainability"], dict)
            assert payload["explainability"]["evaluated_model"] == "QSVM (qsvm_model.pkl)"
        else:
            assert payload["detail"]["model"] == "unavailable"