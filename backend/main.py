import gc
import os
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from engine.cloak_engine import execute_cloaking_pipeline
from engine.models import model_manager
from schemas.request import (
    AttackMethod,
    CloakParameters,
    ModelName,
    ProtectionMode,
    TransferabilityParameters,
)
from schemas.response import (
    CloakResponse,
    HealthResponse,
    ModelsResponse,
    TransferabilityResponse,
)
from services.evaluation_service import evaluate_cross_model_transferability
from utils.validation import validate_and_load_image

app = FastAPI(
    title="Privacy-Preserving Image Cloaking API",
    description=(
        "FastAPI + PyTorch adversarial perturbation engine implementing resolution-decoupled "
        "FGSM and PGD cloaking for ResNet-50, MobileNetV3-Large, and ViT-B/16."
    ),
    version="1.0.0",
)

# Explicit CORS origins (configurable via ALLOWED_ORIGINS env var)
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173",
)
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.run\.app|https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        device=str(model_manager.device),
        cuda_available=torch.cuda.is_available(),
        loaded_models=model_manager.get_loaded_model_ids(),
        torch_version=torch.__version__,
        max_upload_mb=10,
    )


@app.get("/models", response_model=ModelsResponse)
async def list_supported_models() -> ModelsResponse:
    return ModelsResponse(models=model_manager.list_models())


@app.post("/cloak", response_model=CloakResponse)
async def cloak_image(
    file: UploadFile = File(..., description="Input photograph (PNG, JPEG, or WebP, max 10 MB)"),
    model: ModelName = Form(default=ModelName.RESNET50),
    attack: AttackMethod = Form(default=AttackMethod.FGSM),
    protection_mode: ProtectionMode = Form(default=ProtectionMode.STANDARD),
    strength: float = Form(default=0.5),
) -> CloakResponse:
    if not (0.05 <= strength <= 1.0):
        raise HTTPException(
            status_code=422,
            detail="Strength must be between 0.05 and 1.0.",
        )

    params = CloakParameters(
        model=model,
        attack=attack,
        protection_mode=protection_mode,
        strength=strength,
    )

    image, _ = await validate_and_load_image(file)

    try:
        result = execute_cloaking_pipeline(original_image=image, params=params)
        return result
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="Insufficient GPU memory while processing this image. Try a smaller image or CPU execution.",
        )
    except MemoryError:
        raise HTTPException(
            status_code=507,
            detail="Insufficient system memory to process this image.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Adversarial cloaking failed: {exc}",
        )
    finally:
        # Privacy-first ephemeral processing: release image buffers immediately
        try:
            image.close()
        except Exception:
            pass
        gc.collect()


@app.post("/evaluate/transferability", response_model=TransferabilityResponse)
async def evaluate_transferability(
    file: UploadFile = File(..., description="Input photograph (PNG, JPEG, or WebP, max 10 MB)"),
    source_model: ModelName = Form(default=ModelName.RESNET50),
    attack: AttackMethod = Form(default=AttackMethod.PGD),
    protection_mode: ProtectionMode = Form(default=ProtectionMode.STANDARD),
    strength: float = Form(default=0.5),
) -> TransferabilityResponse:
    if not (0.05 <= strength <= 1.0):
        raise HTTPException(
            status_code=422,
            detail="Strength must be between 0.05 and 1.0.",
        )

    params = TransferabilityParameters(
        source_model=source_model,
        attack=attack,
        protection_mode=protection_mode,
        strength=strength,
    )

    image, _ = await validate_and_load_image(file)

    try:
        return evaluate_cross_model_transferability(original_image=image, params=params)
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="Insufficient GPU memory during cross-model transferability evaluation.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Transferability evaluation failed: {exc}",
        )
    finally:
        try:
            image.close()
        except Exception:
            pass
        gc.collect()
