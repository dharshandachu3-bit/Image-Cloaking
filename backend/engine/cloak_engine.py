import time
import torch
import torch.nn.functional as F
from PIL import Image

from engine.attacks import compute_adversarial_perturbation
from engine.metrics import (
    compute_activation_delta_map,
    compute_image_quality_metrics,
    extract_7x7_activation_map,
)
from engine.models import MODEL_REGISTRY_META, model_manager
from engine.preprocessing import (
    create_working_tensor,
    normalize_imagenet,
    pil_to_float_tensor,
    tensor_to_pil,
)
from engine.resolution import apply_resolution_decoupling
from schemas.request import CloakParameters, ModelName
from schemas.response import CloakResponse, PredictionSummary
from services.image_service import (
    build_amplified_difference_image,
    pil_to_base64_png,
)

RESEARCH_DISCLAIMER = (
    "Adversarial perturbations target pretrained ImageNet classifiers (ResNet-50, "
    "MobileNetV3-Large, ViT-B/16) and are not guaranteed to defeat every recognition "
    "model, JPEG re-compression pipeline, or facial-recognition system."
)


def classify_working_tensor(
    model_name: ModelName,
    working_x: torch.Tensor,
) -> PredictionSummary:
    model, categories = model_manager.get_model(model_name)
    with torch.no_grad():
        logits = model(normalize_imagenet(working_x))
        probs = F.softmax(logits, dim=1).squeeze(0)
        top_probs, top_indices = torch.topk(probs, k=5)

    top5 = [
        {
            "class_id": int(idx.item()),
            "label": categories[int(idx.item())],
            "confidence": round(float(prob.item()), 6),
        }
        for prob, idx in zip(top_probs, top_indices)
    ]

    primary = top5[0]
    return PredictionSummary(
        class_id=primary["class_id"],
        label=primary["label"],
        confidence=primary["confidence"],
        top5=top5,
    )


def execute_cloaking_pipeline(
    original_image: Image.Image,
    params: CloakParameters,
) -> CloakResponse:
    """
    Full resolution-decoupled adversarial cloaking pipeline executed strictly in memory.
    """
    t0 = time.perf_counter()
    device = model_manager.device
    orig_w, orig_h = original_image.size

    # 1. Load cached pretrained model
    model, _ = model_manager.get_model(params.model)

    # 2. Prepare full-resolution tensor and 224x224 working representation
    original_full_tensor = pil_to_float_tensor(original_image, device)
    working_orig = create_working_tensor(original_image, device)

    # 3. Classify original image and extract original 7x7 activation map
    original_pred = classify_working_tensor(params.model, working_orig)
    activation_orig = extract_7x7_activation_map(model, params.model, working_orig)

    # 4. Generate adversarial perturbation at 224x224 using PyTorch gradients
    epsilon = params.epsilon
    perturbation_224, pgd_iters, pgd_step = compute_adversarial_perturbation(
        model=model,
        working_x=working_orig,
        original_class_id=original_pred.class_id,
        attack=params.attack,
        epsilon=epsilon,
    )

    # 5. Apply resolution decoupling: resize perturbation to (orig_h, orig_w) and add to original
    cloaked_full_tensor, _ = apply_resolution_decoupling(
        original_tensor=original_full_tensor,
        perturbation_224=perturbation_224,
    )
    cloaked_pil = tensor_to_pil(cloaked_full_tensor)

    # Verify exact original dimensions are preserved
    assert cloaked_pil.size == (orig_w, orig_h), "Resolution decoupling must preserve original dimensions."

    # 6. Reclassify the final exported cloaked image (after resolution decoupling & uint8 quantization)
    working_cloaked = create_working_tensor(cloaked_pil, device)
    cloaked_pred = classify_working_tensor(params.model, working_cloaked)
    activation_cloaked = extract_7x7_activation_map(model, params.model, working_cloaked)
    activation_delta = compute_activation_delta_map(activation_orig, activation_cloaked)

    # 7. Compute real image quality and prediction shift metrics
    ssim_score, psnr_score, l_inf_norm = compute_image_quality_metrics(original_image, cloaked_pil)

    # Measure confidence drop on the original predicted class
    with torch.no_grad():
        cloaked_logits = model(normalize_imagenet(working_cloaked))
        cloaked_probs = F.softmax(cloaked_logits, dim=1).squeeze(0)
        cloaked_conf_on_orig_class = float(cloaked_probs[original_pred.class_id].item())

    confidence_drop = round(original_pred.confidence - cloaked_conf_on_orig_class, 6)
    misclassified = cloaked_pred.class_id != original_pred.class_id

    # 8. Build amplified visual difference image and encode PNGs in memory
    diff_factor = 12
    diff_pil = build_amplified_difference_image(original_image, cloaked_pil, amplification=diff_factor)
    cloaked_b64 = pil_to_base64_png(cloaked_pil)
    diff_b64 = pil_to_base64_png(diff_pil)

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    return CloakResponse(
        model=params.model.value,
        model_name=MODEL_REGISTRY_META[params.model]["name"],
        attack=params.attack.value,
        protection_mode=params.protection_mode.value,
        strength=params.strength,
        epsilon=epsilon,
        pgd_iterations=pgd_iters,
        pgd_step_size=round(pgd_step, 6) if pgd_step is not None else None,
        original_prediction=original_pred,
        cloaked_prediction=cloaked_pred,
        confidence_drop=confidence_drop,
        misclassified=misclassified,
        ssim=ssim_score,
        psnr=psnr_score,
        l_inf_norm=l_inf_norm,
        processing_time_ms=elapsed_ms,
        original_resolution={"width": orig_w, "height": orig_h},
        cloaked_image_base64=cloaked_b64,
        amplified_diff_base64=diff_b64,
        diff_amplification_factor=diff_factor,
        activation_map_original=activation_orig,
        activation_map_cloaked=activation_cloaked,
        activation_map_delta=activation_delta,
        disclaimer=RESEARCH_DISCLAIMER,
    )
