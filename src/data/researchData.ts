import type { ModelCatalogItem, ModelId, ProtectionMode } from '../types';

export const PROTECTION_MODES: Record<
  ProtectionMode,
  {
    id: ProtectionMode;
    label: string;
    maxEpsilon: number;
    summary: string;
    visualImpact: string;
  }
> = {
  standard: {
    id: 'standard',
    label: 'Standard Protection',
    maxEpsilon: 0.06,
    summary: 'Prioritizes near-imperceptible photographic fidelity with a bounded perturbation ceiling of ε ≤ 0.06.',
    visualImpact: 'High visual fidelity (reported benchmark SSIM typically 0.94–0.996)',
  },
  strong: {
    id: 'strong',
    label: 'Strong Protection',
    maxEpsilon: 0.125,
    summary: 'Allows stronger perturbation budgets up to ε ≤ 0.125 for higher misclassification pressure.',
    visualImpact: 'Subtle high-frequency grain may become visible near flat gradients (SSIM down to ~0.88)',
  },
};

export const MODEL_CATALOG: ModelCatalogItem[] = [
  {
    id: 'resnet50',
    name: 'ResNet-50',
    architecture: 'Deep Residual Convolutional Network',
    parameters: '25.6M',
    input_size: '224 × 224',
    weights: 'IMAGENET1K_V2',
    description:
      '50-layer residual CNN using bottleneck skip connections to stabilize deep gradient flow. Captures hierarchical edge, texture, and object-part features ending in a 7×7×2048 spatial grid.',
    activation_layer: 'layer4 (7×7 spatial activation map)',
  },
  {
    id: 'mobilenet_v3_large',
    name: 'MobileNetV3-Large',
    architecture: 'Depthwise-Separable Mobile CNN',
    parameters: '5.5M',
    input_size: '224 × 224',
    weights: 'IMAGENET1K_V2',
    description:
      'Compact mobile vision backbone combining inverted residual blocks, squeeze-and-excitation attention, and Hard-Swish activations. Sensitive to localized high-frequency perturbations.',
    activation_layer: 'features[-1] (7×7 spatial activation map)',
  },
  {
    id: 'vit_b_16',
    name: 'Vision Transformer (ViT-B/16)',
    architecture: 'Patch-Based Self-Attention Transformer',
    parameters: '86.6M',
    input_size: '224 × 224',
    weights: 'IMAGENET1K_V1',
    description:
      'Divides the 224×224 working representation into 196 non-overlapping 16×16 pixel patches and computes global multi-head self-attention across 12 transformer layers.',
    activation_layer: 'encoder.ln (14×14 patch tokens pooled to 7×7)',
  },
];

export const MODEL_BY_ID: Record<ModelId, ModelCatalogItem> = {
  resnet50: MODEL_CATALOG[0],
  mobilenet_v3_large: MODEL_CATALOG[1],
  vit_b_16: MODEL_CATALOG[2],
};

/**
 * Published Experimental Context from the Project Report (Section 14).
 * Strictly separated from live session metrics and clearly presented as
 * previously reported findings on 240 unseen Imagenette photographs.
 */
export const REPORTED_BENCHMARK_SUMMARY = {
  datasetName: 'Imagenette (10 ImageNet classes)',
  unseenImagesCount: 240,
  crossModelExperimentsCount: 720,
  defaultSettingMisclassificationRange: '2.5% – 4.2%',
  literatureBudgetMisclassificationRange: '8.3% – 13.3%',
  meanSsimRange: '0.88 – 0.996',
  crossModelTransferabilityPercent: 9.72,
  jpegFinding:
    'Lossy JPEG re-compression attenuates high-frequency adversarial perturbations and reduces misclassification effectiveness.',
  faceRecognitionFinding:
    'In the reported face-recognition evaluation using FaceNet, zero identity changes were recorded. This system targets pretrained general ImageNet classifiers and is not a universal defense against facial-recognition systems.',
};

/**
 * Structured chart datasets strictly bounded to the reported experimental ranges
 * (240 unseen Imagenette photographs, 2.5–4.2% default, 8.3–13.3% literature budget,
 * SSIM 0.88–0.996, 9.72% overall cross-model transferability across 720 runs).
 */
export const REPORTED_ATTACK_COMPARISON = [
  {
    setting: 'Default Setting',
    fgsmMisclassification: 2.5,
    pgdMisclassification: 4.2,
    fgsmSsim: 0.996,
    pgdSsim: 0.991,
    fgsmRelativeCost: 1.0,
    pgdRelativeCost: 10.0,
  },
  {
    setting: 'Literature Budget',
    fgsmMisclassification: 8.3,
    pgdMisclassification: 13.3,
    fgsmSsim: 0.912,
    pgdSsim: 0.88,
    fgsmRelativeCost: 1.0,
    pgdRelativeCost: 10.0,
  },
];

export const REPORTED_BUDGET_CURVE = [
  {
    budgetLabel: 'Default (Low ε)',
    mode: 'Standard',
    epsilon: 0.015,
    misclassificationLow: 2.5,
    misclassificationHigh: 4.2,
    meanSsim: 0.996,
  },
  {
    budgetLabel: 'Standard Ceiling',
    mode: 'Standard',
    epsilon: 0.06,
    misclassificationLow: 5.4,
    misclassificationHigh: 8.3,
    meanSsim: 0.945,
  },
  {
    budgetLabel: 'Literature Budget',
    mode: 'Strong',
    epsilon: 0.125,
    misclassificationLow: 8.3,
    misclassificationHigh: 13.3,
    meanSsim: 0.88,
  },
];

export const REPORTED_MODEL_PROFILES = [
  {
    model: 'ResNet-50',
    id: 'resnet50' as ModelId,
    architecture: 'Residual CNN',
    parametersM: 25.6,
    defaultRangeLabel: '2.5% – 4.2%',
    literatureRangeLabel: '8.3% – 13.3%',
    ssimBand: '0.88 – 0.996',
    gradientComplexity: 'Moderate (50 layers)',
  },
  {
    model: 'MobileNetV3-Large',
    id: 'mobilenet_v3_large' as ModelId,
    architecture: 'Depthwise CNN',
    parametersM: 5.5,
    defaultRangeLabel: '2.5% – 4.2%',
    literatureRangeLabel: '8.3% – 13.3%',
    ssimBand: '0.88 – 0.996',
    gradientComplexity: 'Fast (5.5M params)',
  },
  {
    model: 'ViT-B/16',
    id: 'vit_b_16' as ModelId,
    architecture: 'Vision Transformer',
    parametersM: 86.6,
    defaultRangeLabel: '2.5% – 4.2%',
    literatureRangeLabel: '8.3% – 13.3%',
    ssimBand: '0.88 – 0.996',
    gradientComplexity: 'High (12 self-attention blocks)',
  },
];

export const GENERATED_ASSETS = {
  heroShield: '/src/assets/images/hero_adversarial_shield_1795344805755.jpg',
  sampleCamera: '/src/assets/images/sample_original_camera_1795344807234.jpg',
  sampleArchitecture: '/src/assets/images/sample_original_architecture_1795344805877.jpg',
  researcherAvatar: '/src/assets/images/avatar_researcher_1795344805939.jpg',
};
