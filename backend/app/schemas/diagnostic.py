# File: backend/app/schemas/diagnostic.py
from typing import Any
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class HotspotPoint(BaseModel):
    x: int
    y: int
    norm_x: float
    norm_y: float
    intensity: float
    radius: int


class ExplainabilityBlock(BaseModel):
    status: str
    evaluated_model: str
    heatmap_base64: str | None
    method: str
    patch_size: int
    stride: int
    total_perturbations: int
    original_width: int
    original_height: int
    max_importance: float
    limitations: str
    hotspots: list[HotspotPoint] = []
    tumor_coordinates: dict[str, Any] | None = None


class AnalysisResponse(BaseModel):
    status: str
    model: str
    total_latency_ms: int
    anatomical_region: str
    predicted_class: str
    confidence: float
    quantum_heatmap: list[HotspotPoint]
    pca_angles: list[float]
    probabilities: dict[str, float]
    cell_analysis: dict[str, int]
    explainability: dict[str, Any]
    side_by_side: dict[str, Any]
    tumor_coordinates: dict[str, Any] | None = None
    input_check: dict[str, Any] | None = None