from typing import List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    device: str
    cuda_available: bool
    loaded_models: List[str]
    torch_version: str
    max_upload_mb: int = 10


class ModelInfo(BaseModel):
    id: str
    name: str
    architecture: str
    parameters: str
    input_size: str
    weights: str
    description: str
    activation_layer: str
    loaded: bool = False


class ModelsResponse(BaseModel):
    models: List[ModelInfo]


class PredictionSummary(BaseModel):
    class_id: int
    label: str
    confidence: float
    top5: List[dict]


class CloakResponse(BaseModel):
    model: str
    model_name: str
    attack: str
    protection_mode: str
    strength: float
    epsilon: float
    pgd_iterations: Optional[int] = None
    pgd_step_size: Optional[float] = None
    original_prediction: PredictionSummary
    cloaked_prediction: PredictionSummary
    confidence_drop: float
    misclassified: bool
    ssim: float
    psnr: float
    l_inf_norm: float
    processing_time_ms: float
    original_resolution: dict = Field(..., description="Original width and height preserved via resolution decoupling")
    cloaked_image_base64: str
    amplified_diff_base64: str
    diff_amplification_factor: int
    activation_map_original: List[List[float]]
    activation_map_cloaked: List[List[float]]
    activation_map_delta: List[List[float]]
    disclaimer: str


class TransferabilityTargetResult(BaseModel):
    target_model: str
    target_model_name: str
    original_label: str
    original_confidence: float
    cloaked_label: str
    cloaked_confidence: float
    confidence_drop: float
    misclassified: bool
    is_source_model: bool


class TransferabilityResponse(BaseModel):
    source_model: str
    attack: str
    protection_mode: str
    epsilon: float
    ssim: float
    processing_time_ms: float
    transfer_success_count: int
    transfer_target_count: int
    transfer_rate: float
    results: List[TransferabilityTargetResult]
