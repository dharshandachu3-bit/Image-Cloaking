export type ModelId = 'resnet50' | 'mobilenet_v3_large' | 'vit_b_16';
export type AttackMethod = 'FGSM' | 'PGD';
export type ProtectionMode = 'standard' | 'strong';

export type DashboardTab =
  | 'dashboard'
  | 'studio'
  | 'results'
  | 'history'
  | 'models'
  | 'analytics'
  | 'settings'
  | 'profile';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  institution: string;
  role: string;
  createdAt: string;
  saveHistoryByDefault: boolean;
  authMode: 'firebase' | 'development';
}

export interface BackendHealth {
  status: string;
  device: string;
  cuda_available: boolean;
  loaded_models: string[];
  torch_version: string;
  max_upload_mb: number;
}

export interface ModelCatalogItem {
  id: ModelId;
  name: string;
  architecture: string;
  parameters: string;
  input_size: string;
  weights: string;
  description: string;
  activation_layer: string;
  loaded?: boolean;
}

export interface PredictionTopItem {
  class_id: number;
  label: string;
  confidence: number;
}

export interface PredictionSummary {
  class_id: number;
  label: string;
  confidence: number;
  top5: PredictionTopItem[];
}

export interface CloakResult {
  id: string;
  createdAt: string;
  fileName: string;
  originalDataUrl: string;
  model: ModelId;
  model_name: string;
  attack: AttackMethod;
  protection_mode: ProtectionMode;
  strength: number;
  epsilon: number;
  pgd_iterations: number | null;
  pgd_step_size: number | null;
  original_prediction: PredictionSummary;
  cloaked_prediction: PredictionSummary;
  confidence_drop: number;
  misclassified: boolean;
  ssim: number;
  psnr: number;
  l_inf_norm: number;
  processing_time_ms: number;
  original_resolution: {
    width: number;
    height: number;
  };
  cloaked_image_base64: string;
  amplified_diff_base64: string;
  diff_amplification_factor: number;
  activation_map_original: number[][];
  activation_map_cloaked: number[][];
  activation_map_delta: number[][];
  disclaimer: string;
}

export interface TransferabilityTargetResult {
  target_model: ModelId;
  target_model_name: string;
  original_label: string;
  original_confidence: number;
  cloaked_label: string;
  cloaked_confidence: number;
  confidence_drop: number;
  misclassified: boolean;
  is_source_model: boolean;
}

export interface TransferabilityResult {
  source_model: ModelId;
  attack: AttackMethod;
  protection_mode: ProtectionMode;
  epsilon: number;
  ssim: number;
  processing_time_ms: number;
  transfer_success_count: number;
  transfer_target_count: number;
  transfer_rate: number;
  results: TransferabilityTargetResult[];
}

export interface HistoryItem {
  id: string;
  createdAt: string;
  fileName: string;
  model: ModelId;
  attack: AttackMethod;
  protectionMode: ProtectionMode;
  strength: number;
  epsilon: number;
  originalClass: string;
  cloakedClass: string;
  originalConfidence: number;
  cloakedConfidence: number;
  confidenceDrop: number;
  ssim: number;
  processingTimeMs: number;
  width: number;
  height: number;
  misclassified: boolean;
  status: 'completed' | 'failed';
  originalThumbnail?: string;
  cloakedThumbnail?: string;
  diffThumbnail?: string;
  activationMapOriginal?: number[][];
  activationMapCloaked?: number[][];
}
