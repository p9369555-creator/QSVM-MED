# File: backend/app/api/routes.py
import json
import os
import time
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.core.config import (
    BENCHMARK_JSON_PATH,
    authenticate_user,
    settings,
    verify_token_dependency,
)
from app.schemas.diagnostic import AnalysisResponse, LoginRequest, TokenResponse
from app.services.qsvm_engine import QSVMEngine

router = APIRouter()


def get_engine(request: Request) -> QSVMEngine:
    engine: QSVMEngine | None = getattr(request.app.state, "engine", None)
    if engine is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"model": "unavailable", "message": "QSVMEngine not initialized."},
        )
    return engine


@router.get("/")
def root(engine: QSVMEngine = Depends(get_engine)):
    return {
        "status": "online",
        "service": settings.APP_TITLE,
        "version": settings.APP_VERSION,
        "models": engine.get_status(),
    }


@router.get("/health")
@router.get("/api/health")
def health_check(engine: QSVMEngine = Depends(get_engine)):
    st = engine.get_status()
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "model": st["qsvm_model"],
        "details": st,
    }


@router.post("/api/v1/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    token = authenticate_user(payload.username, payload.password)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_SECONDS,
    )


@router.get("/api/v1/benchmark")
def get_model_benchmark(engine: QSVMEngine = Depends(get_engine)):
    if engine.benchmark_metrics is None and os.path.exists(BENCHMARK_JSON_PATH):
        with open(BENCHMARK_JSON_PATH, "r", encoding="utf-8") as f:
            engine.benchmark_metrics = json.load(f)

    if engine.benchmark_metrics is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Benchmark metrics file (benchmark_metrics.json) not found. "
                "Run `python train_brain_mri.py` on the real dataset first."
            ),
        )
    return engine.benchmark_metrics


@router.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze_medical_image(
    file: UploadFile = File(...),
    study_modality: str = Form("brain_mri"),
    engine: QSVMEngine = Depends(get_engine),
    _user: dict | None = Depends(verify_token_dependency),
):
    image_bytes = await file.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds the {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
        )
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    return engine.analyze_scan(image_bytes, file.filename or "")