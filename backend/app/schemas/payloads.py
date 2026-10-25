from pydantic import BaseModel, Field
from typing import List

class HeatmapCoordinate(BaseModel):
    x: int
    y: int
    radius: float

class QPUTelemetry(BaseModel):
    circuit_depth: int
    execution_time_ms: float
    qpu_backend_name: str

class AnalysisResponse(BaseModel):
    status: str = "success"
    classical_baseline_score: float
    quantum_heatmap: List[HeatmapCoordinate]
    telemetry: QPUTelemetry
    total_latency_ms: float