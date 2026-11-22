import torch
import torch.nn.functional as F
from typing import Tuple


def apply_resolution_decoupling(
    original_tensor: torch.Tensor,
    perturbation_224: torch.Tensor,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Resolution-Decoupling Technique:
    1. Preserve the uploaded image's exact original dimensions (H, W).
    2. Receive the adversarial perturbation computed at the 224x224 model resolution.
    3. Bilinearly resize the perturbation delta to match (H, W).
    4. Add the resized perturbation directly to the original full-resolution photograph.
    5. Clip resulting pixel values to the valid [0.0, 1.0] image range.

    Returns:
        cloaked_full_tensor: (1, 3, H, W) tensor at exact original dimensions.
        effective_delta_full: (1, 3, H, W) post-clipping difference (cloaked - original).
    """
    _, _, orig_h, orig_w = original_tensor.shape

    resized_perturbation = F.interpolate(
        perturbation_224,
        size=(orig_h, orig_w),
        mode="bilinear",
        align_corners=False,
    )

    cloaked_full = torch.clamp(original_tensor + resized_perturbation, 0.0, 1.0)
    effective_delta = cloaked_full - original_tensor
    return cloaked_full, effective_delta
