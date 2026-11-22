from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ModelName(str, Enum):
    RESNET50 = "resnet50"
    MOBILENET_V3_LARGE = "mobilenet_v3_large"
    VIT_B_16 = "vit_b_16"


class AttackMethod(str, Enum):
    FGSM = "FGSM"
    PGD = "PGD"


class ProtectionMode(str, Enum):
    STANDARD = "standard"
    STRONG = "strong"


PROTECTION_MODE_MAX_EPSILON = {
    ProtectionMode.STANDARD: 0.06,
    ProtectionMode.STRONG: 0.125,
}


class CloakParameters(BaseModel):
    model: ModelName = Field(default=ModelName.RESNET50, description="Target pretrained ImageNet classifier")
    attack: AttackMethod = Field(default=AttackMethod.FGSM, description="Adversarial attack algorithm")
    protection_mode: ProtectionMode = Field(
        default=ProtectionMode.STANDARD,
        description="Standard (max eps 0.06) or Strong (max eps 0.125)",
    )
    strength: float = Field(
        default=0.5,
        ge=0.05,
        le=1.0,
        description="Normalized perturbation strength multiplier in [0.05, 1.0]",
    )

    @property
    def epsilon(self) -> float:
        return round(self.strength * PROTECTION_MODE_MAX_EPSILON[self.protection_mode], 6)


class TransferabilityParameters(BaseModel):
    source_model: ModelName = Field(default=ModelName.RESNET50)
    attack: AttackMethod = Field(default=AttackMethod.PGD)
    protection_mode: ProtectionMode = Field(default=ProtectionMode.STANDARD)
    strength: float = Field(default=0.5, ge=0.05, le=1.0)
    target_models: Optional[list[ModelName]] = None

    @property
    def epsilon(self) -> float:
        return round(self.strength * PROTECTION_MODE_MAX_EPSILON[self.protection_mode], 6)
