import time
from typing import List
import torch
import torch.nn.functional as F
from PIL import Image

from engine.attacks import compute_adversarial_perturbation
from engine.cloak_engine import classify_working_tensor
from engine.metrics import compute_image_quality_metrics
from engine.models import MODEL_REGISTRY_META, model_manager
from engine.preprocessing import (
    create_working_tensor,
    normalize_imagenet,
    pil_to_float_tensor,
    tensor_to_pil,
)
from engine.resolution import apply_resolution_decoupling
from schemas.request import ModelName, TransferabilityParameters
from schemas.response import TransferabilityResponse, TransferabilityTargetResult


def evaluate_cross_model_transferability(
    original_image: Image.Image,
    params: TransferabilityParameters,
) -> TransferabilityResponse:
    """
    Generate an adversarial perturbation against source_model, apply resolution decoupling,
    and evaluate whether the resulting cloaked image transfers to other pretrained architectures
    (ResNet-50, MobileNetV3-Large, ViT-B/16).
    """
    t0 = time.perf_counter()
    device = model_manager.device

    source_model, _ = model_manager.get_model(params.source_model)
    original_full_tensor = pil_to_float_tensor(original_image, device)
    working_orig = create_working_tensor(original_image, device)

    source_orig_pred = classify_working_tensor(params.source_model, working_orig)

    epsilon = params.epsilon
    perturbation_224, _, _ = compute_adversarial_perturbation(
        model=source_model,
        working_x=working_orig,
        original_class_id=source_orig_pred.class_id,
        attack=params.attack,
        epsilon=epsilon,
    )

    cloaked_full_tensor, _ = apply_resolution_decoupling(
        original_tensor=original_full_tensor,
        perturbation_224=perturbation_224,
    )
    cloaked_pil = tensor_to_pil(cloaked_full_tensor)
    working_cloaked = create_working_tensor(cloaked_pil, device)

    ssim_score, _, _ = compute_image_quality_metrics(original_image, cloaked_pil)

    targets = params.target_models or [
        ModelName.RESNET50,
        ModelName.MOBILENET_V3_LARGE,
        ModelName.VIT_B_16,
    ]

    results: List[TransferabilityTargetResult] = []
    cross_success = 0
    cross_total = 0

    for target_name in targets:
        orig_pred = classify_working_tensor(target_name, working_orig)
        cloak_pred = classify_working_tensor(target_name, working_cloaked)

        target_model, _ = model_manager.get_model(target_name)
        with torch.no_grad():
            probs = F.softmax(target_model(normalize_imagenet(working_cloaked)), dim=1).squeeze(0)
            conf_on_orig = float(probs[orig_pred.class_id].item())

        misclassified = cloak_pred.class_id != orig_pred.class_id
        is_source = target_name == params.source_model
        if not is_source:
            cross_total += 1
            if misclassified:
                cross_success += 1

        results.append(
            TransferabilityTargetResult(
                target_model=target_name.value,
                target_model_name=MODEL_REGISTRY_META[target_name]["name"],
                original_label=orig_pred.label,
                original_confidence=orig_pred.confidence,
                cloaked_label=cloak_pred.label,
                cloaked_confidence=cloak_pred.confidence,
                confidence_drop=round(orig_pred.confidence - conf_on_orig, 6),
                misclassified=misclassified,
                is_source_model=is_source,
            )
        )

    transfer_rate = round((cross_success / cross_total) * 100.0, 2) if cross_total > 0 else 0.0
    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    return TransferabilityResponse(
        source_model=params.source_model.value,
        attack=params.attack.value,
        protection_mode=params.protection_mode.value,
        epsilon=epsilon,
        ssim=ssim_score,
        processing_time_ms=elapsed_ms,
        transfer_success_count=cross_success,
        transfer_target_count=cross_total,
        transfer_rate=transfer_rate,
        results=results,
    )
