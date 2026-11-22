import torch
import torch.nn as nn
from torchvision import models
from typing import Dict, Tuple, List

from schemas.request import ModelName
from schemas.response import ModelInfo


MODEL_REGISTRY_META: Dict[ModelName, dict] = {
    ModelName.RESNET50: {
        "id": ModelName.RESNET50.value,
        "name": "ResNet-50",
        "architecture": "Deep Residual Convolutional Network (CNN)",
        "parameters": "25.6M",
        "input_size": "224 × 224",
        "weights": "IMAGENET1K_V2",
        "description": "50-layer residual network with bottleneck blocks and skip connections. Extracts hierarchical spatial features culminating in a 7×7×2048 feature tensor at layer4.",
        "activation_layer": "layer4 (7×7 spatial feature map)",
    },
    ModelName.MOBILENET_V3_LARGE: {
        "id": ModelName.MOBILENET_V3_LARGE.value,
        "name": "MobileNetV3-Large",
        "architecture": "Lightweight Depthwise-Separable CNN",
        "parameters": "5.5M",
        "input_size": "224 × 224",
        "weights": "IMAGENET1K_V2",
        "description": "Hardware-aware mobile CNN using inverted residuals, squeeze-and-excitation blocks, and Hard-Swish activations. Produces a 7×7×960 final feature map.",
        "activation_layer": "features[-1] (7×7 spatial feature map)",
    },
    ModelName.VIT_B_16: {
        "id": ModelName.VIT_B_16.value,
        "name": "Vision Transformer (ViT-B/16)",
        "architecture": "Patch-Based Self-Attention Transformer",
        "parameters": "86.6M",
        "input_size": "224 × 224",
        "weights": "IMAGENET1K_V1",
        "description": "Splits images into 14×14 non-overlapping 16×16 patches processed through 12 multi-head self-attention encoder blocks. Spatial token activations are pooled to 7×7.",
        "activation_layer": "encoder.ln (14×14 patch tokens pooled to 7×7)",
    },
}


class ModelManager:
    """
    Lazily loads and caches pretrained Torchvision models on CPU or CUDA GPU.
    """

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._cache: Dict[ModelName, Tuple[nn.Module, List[str]]] = {}

    def get_loaded_model_ids(self) -> List[str]:
        return [m.value for m in self._cache.keys()]

    def list_models(self) -> List[ModelInfo]:
        loaded_ids = set(self.get_loaded_model_ids())
        return [
            ModelInfo(**meta, loaded=(meta["id"] in loaded_ids))
            for meta in MODEL_REGISTRY_META.values()
        ]

    def get_model(self, model_name: ModelName) -> Tuple[nn.Module, List[str]]:
        if model_name in self._cache:
            return self._cache[model_name]

        if model_name == ModelName.RESNET50:
            weights = models.ResNet50_Weights.IMAGENET1K_V2
            model = models.resnet50(weights=weights)
        elif model_name == ModelName.MOBILENET_V3_LARGE:
            weights = models.MobileNet_V3_Large_Weights.IMAGENET1K_V2
            model = models.mobilenet_v3_large(weights=weights)
        elif model_name == ModelName.VIT_B_16:
            weights = models.ViT_B_16_Weights.IMAGENET1K_V1
            model = models.vit_b_16(weights=weights)
        else:
            raise ValueError(f"Unsupported model: {model_name}")

        categories = list(weights.meta.get("categories", [f"class_{i}" for i in range(1000)]))
        model.eval()
        for param in model.parameters():
            param.requires_grad_(False)
        model.to(self.device)

        self._cache[model_name] = (model, categories)
        return model, categories


model_manager = ModelManager()
