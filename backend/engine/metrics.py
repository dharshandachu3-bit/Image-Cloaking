import math
from typing import List, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from skimage.metrics import structural_similarity as skimage_ssim

from engine.preprocessing import normalize_imagenet
from schemas.request import ModelName


def compute_image_quality_metrics(
    original_pil: Image.Image,
    cloaked_pil: Image.Image,
) -> Tuple[float, float, float]:
    """
    Calculate real Structural Similarity Index (SSIM), Peak Signal-to-Noise Ratio (PSNR),
    and realized L-infinity pixel perturbation norm between original and cloaked images.
    """
    orig_arr = np.asarray(original_pil, dtype=np.float32) / 255.0
    cloak_arr = np.asarray(cloaked_pil, dtype=np.float32) / 255.0

    min_dim = min(orig_arr.shape[0], orig_arr.shape[1])
    win_size = min(7, min_dim if min_dim % 2 == 1 else min_dim - 1)
    win_size = max(3, win_size)

    ssim_value = float(
        skimage_ssim(
            orig_arr,
            cloak_arr,
            data_range=1.0,
            channel_axis=2,
            win_size=win_size,
        )
    )

    mse = float(np.mean((orig_arr - cloak_arr) ** 2))
    psnr_value = 100.0 if mse <= 1e-12 else float(10.0 * math.log10(1.0 / mse))
    l_inf_norm = float(np.max(np.abs(orig_arr - cloak_arr)))

    return round(ssim_value, 6), round(psnr_value, 2), round(l_inf_norm, 6)


def extract_7x7_activation_map(
    model: nn.Module,
    model_name: ModelName,
    working_x: torch.Tensor,
) -> List[List[float]]:
    """
    Extract a real 7x7 spatial activation map from the target pretrained model
    using PyTorch forward hooks:
      - ResNet-50: mean channel activation magnitude of layer4 (7x7x2048 -> 7x7)
      - MobileNetV3-Large: mean channel activation magnitude of features[-1] (7x7x960 -> 7x7)
      - ViT-B/16: L2 norm of 196 patch tokens (14x14) from encoder.ln pooled to 7x7
    Values are normalized to [0, 1] for heatmap visualization.
    """
    captured = {}

    def hook_fn(_module, _inputs, output):
        captured["feat"] = output.detach()

    if model_name == ModelName.RESNET50:
        handle = model.layer4.register_forward_hook(hook_fn)
    elif model_name == ModelName.MOBILENET_V3_LARGE:
        handle = model.features[-1].register_forward_hook(hook_fn)
    elif model_name == ModelName.VIT_B_16:
        handle = model.encoder.ln.register_forward_hook(hook_fn)
    else:
        raise ValueError(f"Unsupported model for activation extraction: {model_name}")

    try:
        with torch.no_grad():
            _ = model(normalize_imagenet(working_x))
    finally:
        handle.remove()

    feat = captured.get("feat")
    if feat is None:
        raise RuntimeError(f"Failed to capture activation tensor for {model_name.value}")

    if model_name == ModelName.VIT_B_16:
        # feat shape: (1, 197, 768) -> discard CLS token at index 0 -> (1, 196, 768)
        patch_tokens = feat[:, 1:, :]
        token_energy = torch.norm(patch_tokens, dim=-1)  # (1, 196)
        grid_side = int(math.isqrt(token_energy.shape[1]))
        spatial = token_energy.view(1, 1, grid_side, grid_side)
    else:
        # CNN feature map shape: (1, C, H, W) -> ReLU energy averaged across channels
        spatial = torch.mean(torch.relu(feat), dim=1, keepdim=True)

    pooled = F.adaptive_avg_pool2d(spatial, (7, 7)).squeeze(0).squeeze(0)
    min_val = float(pooled.min().item())
    max_val = float(pooled.max().item())

    if max_val - min_val > 1e-8:
        norm_map = (pooled - min_val) / (max_val - min_val)
    else:
        norm_map = torch.zeros_like(pooled)

    matrix = norm_map.cpu().numpy().tolist()
    return [[round(float(v), 4) for v in row] for row in matrix]


def compute_activation_delta_map(
    orig_map: List[List[float]],
    cloaked_map: List[List[float]],
) -> List[List[float]]:
    """
    Compute absolute spatial shift |A_cloaked - A_original| normalized to [0, 1].
    """
    a = np.asarray(orig_map, dtype=np.float32)
    b = np.asarray(cloaked_map, dtype=np.float32)
    diff = np.abs(b - a)
    max_v = float(diff.max())
    if max_v > 1e-8:
        diff = diff / max_v
    return [[round(float(v), 4) for v in row] for row in diff.tolist()]
