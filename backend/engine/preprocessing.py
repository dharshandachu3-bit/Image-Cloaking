import torch
import numpy as np
from PIL import Image
from torchvision import transforms

# Standard ImageNet channel normalization constants used by Torchvision pretrained models
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
MODEL_INPUT_SIZE = (224, 224)


def pil_to_float_tensor(image: Image.Image, device: torch.device) -> torch.Tensor:
    """
    Convert an RGB PIL Image to a (1, 3, H, W) float32 tensor in [0, 1] without cropping or resizing.
    """
    arr = np.asarray(image, dtype=np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)
    return tensor.to(device)


def create_working_tensor(image: Image.Image, device: torch.device) -> torch.Tensor:
    """
    Create the 224x224 working representation in [0, 1] pixel space for model input
    and perturbation calculation (without center-cropping, preserving full scene framing).
    """
    working_pil = image.resize(MODEL_INPUT_SIZE, Image.Resampling.BILINEAR)
    return pil_to_float_tensor(working_pil, device)


def normalize_imagenet(tensor_01: torch.Tensor) -> torch.Tensor:
    """
    Differentiable ImageNet normalization so PyTorch autograd flows cleanly
    back to [0, 1] pixel space for L-infinity perturbation bounds.
    """
    mean = torch.tensor(IMAGENET_MEAN, device=tensor_01.device, dtype=tensor_01.dtype).view(1, 3, 1, 1)
    std = torch.tensor(IMAGENET_STD, device=tensor_01.device, dtype=tensor_01.dtype).view(1, 3, 1, 1)
    return (tensor_01 - mean) / std


def tensor_to_pil(tensor_01: torch.Tensor) -> Image.Image:
    """
    Convert a (1, 3, H, W) float32 tensor in [0, 1] back to an RGB uint8 PIL Image.
    """
    clipped = torch.clamp(tensor_01.detach().cpu(), 0.0, 1.0).squeeze(0)
    arr = (clipped.permute(1, 2, 0).numpy() * 255.0).round().astype(np.uint8)
    return Image.fromarray(arr, mode="RGB")
