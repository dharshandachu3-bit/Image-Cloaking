import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  GitCompare,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { MODEL_BY_ID } from '../data/researchData';
import { requestTransferabilityEvaluation } from '../services/api';
import { ActivationMapPanel } from './ActivationMapPanel';
import { ImageCompareSlider } from './ImageCompareSlider';

interface CloakResultsViewProps {
  onBackToStudio: () => void;
}

export const CloakResultsView: React.FC<CloakResultsViewProps> = ({ onBackToStudio }) => {
  const {
    apiBaseUrl,
    latestResult,
    latestFile,
    latestTransferability,
    setLatestTransferability,
  } = useApp();

  const [isEvaluatingTransfer, setIsEvaluatingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!latestResult) {
    return (
      <div className="glass-surface rounded-xl p-12 text-center">
        <h2 className="font-display text-xl font-bold text-white">No Cloaking Result Loaded</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
          Upload a photograph and execute FGSM or PGD cloaking in the Cloaking Studio to inspect
          original vs. cloaked comparisons, SSIM metrics, and 7×7 activation maps.
        </p>
        <button
          type="button"
          onClick={onBackToStudio}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#397BFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2B68E8]"
        >
          Go to Cloaking Studio
        </button>
      </div>
    );
  }

  const modelMeta = MODEL_BY_ID[latestResult.model];

  const handleDownloadCloakedPng = () => {
    setDownloadError(null);
    try {
      const link = document.createElement('a');
      link.href = latestResult.cloaked_image_base64;
      const baseName = latestResult.fileName.replace(/\.[^/.]+$/, '');
      link.download = `${baseName}_cloaked_${latestResult.model}_${latestResult.attack.toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setDownloadError('Could not trigger PNG download in this browser.');
    }
  };

  const handleRunTransferability = async () => {
    if (!latestFile) {
      setTransferError(
        'Original uploaded file handle is unavailable for this saved history item. Re-upload in Cloaking Studio to run live cross-model transferability.'
      );
      return;
    }
    setTransferError(null);
    setIsEvaluatingTransfer(true);
    try {
      const res = await requestTransferabilityEvaluation({
        baseUrl: apiBaseUrl,
        file: latestFile,
        sourceModel: latestResult.model,
        attack: latestResult.attack,
        protectionMode: latestResult.protection_mode,
        strength: latestResult.strength,
      });
      setLatestTransferability(res);
    } catch (err) {
      setTransferError(
        err instanceof Error ? err.message : 'Cross-model transferability evaluation failed.'
      );
    } finally {
      setIsEvaluatingTransfer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cloak Another Photograph
          </button>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-white">
            Cloaking Evaluation Results
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {latestResult.fileName} · {latestResult.model_name} · {latestResult.attack} ·{' '}
            {latestResult.protection_mode === 'strong' ? 'Strong Mode' : 'Standard Mode'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRunTransferability}
            disabled={isEvaluatingTransfer || !latestFile}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#101A2E] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-[#00D4FF]/60 hover:text-white disabled:opacity-50 whitespace-nowrap"
          >
            {isEvaluatingTransfer ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#00D4FF]" />
            ) : (
              <GitCompare className="h-4 w-4 text-[#00D4FF]" />
            )}
            Evaluate Cross-Model Transferability
          </button>

          <button
            type="button"
            onClick={handleDownloadCloakedPng}
            className="inline-flex items-center gap-2 rounded-lg bg-[#397BFF] px-5 py-2.5 text-xs font-bold tracking-wide text-white hover:bg-[#2B68E8] whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            DOWNLOAD CLOAKED IMAGE
          </button>
        </div>
      </div>

      {downloadError && (
        <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
          {downloadError}
        </div>
      )}

      {/* Classification Shift Outcome Summary */}
      <div className="glass-surface rounded-xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
          <div className="flex items-start gap-3">
            {latestResult.misclassified ? (
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
            )}
            <div>
              <h3 className="text-base font-semibold text-white">
                {latestResult.misclassified
                  ? 'Target Classifier Prediction Disrupted'
                  : 'Top-1 Class Retained — Confidence Perturbed'}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {latestResult.misclassified
                  ? `${latestResult.model_name} shifted top-1 prediction from "${latestResult.original_prediction.label}" to "${latestResult.cloaked_prediction.label}".`
                  : `${latestResult.model_name} kept "${latestResult.original_prediction.label}" at top-1 with a ${(latestResult.confidence_drop * 100).toFixed(2)}% confidence drop. Try PGD or higher strength if stronger disruption is required.`}
              </p>
            </div>
          </div>

          <div className="font-mono text-xs text-slate-300 tabular-nums shrink-0">
            Resolution Preserved:{' '}
            <span className="text-[#00D4FF] font-semibold">
              {latestResult.original_resolution.width} × {latestResult.original_resolution.height} px
            </span>
          </div>
        </div>

        {/* Core Quantitative Metrics Grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <p className="text-xs text-slate-400">Original Predicted Class</p>
            <p className="mt-1 text-sm font-semibold text-white truncate">
              {latestResult.original_prediction.label}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
              {(latestResult.original_prediction.confidence * 100).toFixed(2)}% conf
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Cloaked Predicted Class</p>
            <p
              className={`mt-1 text-sm font-semibold truncate ${
                latestResult.misclassified ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {latestResult.cloaked_prediction.label}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
              {(latestResult.cloaked_prediction.confidence * 100).toFixed(2)}% conf
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Confidence Drop (Orig Class)</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#00D4FF] tabular-nums">
              {(latestResult.confidence_drop * 100).toFixed(2)}%
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
              ε = {latestResult.epsilon.toFixed(5)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Visual Quality (SSIM)</p>
            <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
              {latestResult.ssim.toFixed(4)}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
              PSNR {latestResult.psnr.toFixed(2)} dB
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Processing Time</p>
            <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
              {(latestResult.processing_time_ms / 1000).toFixed(2)}s
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
              L∞ realized {latestResult.l_inf_norm.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Comparison Slider */}
      <div className="glass-surface rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              Interactive Original vs. Cloaked Comparison
            </h3>
            <p className="text-xs text-slate-400">
              Drag the vertical handle or use Left/Right arrow keys to inspect perceptual fidelity
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            SSIM {latestResult.ssim.toFixed(4)} · Exact {latestResult.original_resolution.width}×
            {latestResult.original_resolution.height}
          </span>
        </div>

        <ImageCompareSlider
          originalSrc={latestResult.originalDataUrl}
          cloakedSrc={latestResult.cloaked_image_base64}
          originalLabel={`Original (${latestResult.original_prediction.label})`}
          cloakedLabel={`Cloaked (${latestResult.cloaked_prediction.label})`}
          aspectClassName="aspect-[16/10]"
        />
      </div>

      {/* Three Dedicated Image Panels: Original, Cloaked, Amplified Difference */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-surface rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">1. Original Image</span>
            <span className="font-mono text-slate-400 tabular-nums">
              {latestResult.original_resolution.width}×{latestResult.original_resolution.height}
            </span>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-800 bg-[#080D1B]">
            <img
              src={latestResult.originalDataUrl}
              alt="Original input photograph"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="glass-surface rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">2. Cloaked Image (PNG)</span>
            <span className="font-mono text-[#00D4FF] tabular-nums">
              SSIM {latestResult.ssim.toFixed(4)}
            </span>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-800 bg-[#080D1B]">
            <img
              src={latestResult.cloaked_image_base64}
              alt="Cloaked output photograph with adversarial perturbation"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="glass-surface rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">3. Amplified Difference Image</span>
            <span className="font-mono text-slate-400 tabular-nums">
              {latestResult.diff_amplification_factor}× |Cloaked − Orig|
            </span>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-800 bg-[#080D1B]">
            <img
              src={latestResult.amplified_diff_base64}
              alt="Amplified pixel difference map showing perturbation structure"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Top-5 Class Distribution Table */}
      {latestResult.original_prediction.top5?.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-surface rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Original Top-5 Predictions ({latestResult.model_name})
            </h3>
            <div className="space-y-2.5">
              {latestResult.original_prediction.top5.map((item) => (
                <div key={`orig-${item.class_id}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 truncate pr-4">{item.label}</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      {(item.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#397BFF]"
                      style={{ width: `${Math.min(100, item.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-surface rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Cloaked Top-5 Predictions ({latestResult.model_name})
            </h3>
            <div className="space-y-2.5">
              {latestResult.cloaked_prediction.top5.map((item) => (
                <div key={`cloak-${item.class_id}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 truncate pr-4">{item.label}</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      {(item.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#00D4FF]"
                      style={{ width: `${Math.min(100, item.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real 7x7 Activation Map Visualization */}
      {latestResult.activation_map_original?.length === 7 &&
        latestResult.activation_map_cloaked?.length === 7 && (
          <ActivationMapPanel
            originalMap={latestResult.activation_map_original}
            cloakedMap={latestResult.activation_map_cloaked}
            deltaMap={latestResult.activation_map_delta}
            overlayImageSrc={latestResult.cloaked_image_base64}
            modelName={latestResult.model_name}
            activationLayerLabel={modelMeta?.activation_layer}
          />
        )}

      {/* Live Cross-Model Transferability Evaluation Section */}
      {transferError && (
        <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-200">
          {transferError}
        </div>
      )}

      {latestTransferability && (
        <div className="glass-surface rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                Live Cross-Model Transferability Evaluation
              </h3>
              <p className="text-xs text-slate-400">
                Perturbation synthesized on {MODEL_BY_ID[latestTransferability.source_model]?.name}{' '}
                tested across all three pretrained architectures
              </p>
            </div>
            <span className="font-mono text-xs text-[#00D4FF] tabular-nums">
              Cross-Model Transfer: {latestTransferability.transfer_success_count}/
              {latestTransferability.transfer_target_count} ({latestTransferability.transfer_rate}%)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Target Architecture</th>
                  <th className="py-2.5 px-4 font-medium">Original Prediction</th>
                  <th className="py-2.5 px-4 font-medium">Cloaked Prediction</th>
                  <th className="py-2.5 px-4 text-right font-medium">Conf. Drop</th>
                  <th className="py-2.5 pl-4 text-right font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {latestTransferability.results.map((row) => (
                  <tr key={row.target_model} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-4 font-medium text-white">
                      {row.target_model_name}
                      {row.is_source_model && (
                        <span className="ml-2 text-[11px] font-normal text-[#00D4FF]">(Source)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {row.original_label}{' '}
                      <span className="font-mono text-slate-500 tabular-nums">
                        ({(row.original_confidence * 100).toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {row.cloaked_label}{' '}
                      <span className="font-mono text-slate-500 tabular-nums">
                        ({(row.cloaked_confidence * 100).toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200 tabular-nums">
                      {(row.confidence_drop * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 pl-4 text-right font-medium">
                      {row.misclassified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Misclassified
                        </span>
                      ) : (
                        <span className="text-slate-400">Retained</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Honest Academic Disclaimer */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-5 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="text-xs leading-relaxed text-amber-100/90">
          <p className="font-semibold text-amber-200">Scientific Limitation &amp; Scope Notice</p>
          <p className="mt-1">
            {latestResult.disclaimer ||
              'Adversarial cloaking targets pretrained ImageNet classification models and is not guaranteed to defeat every recognition model, social-media JPEG re-compression pipeline, or facial-recognition system.'}
          </p>
        </div>
      </div>
    </div>
  );
};
