import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Cpu,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Shield,
  Sliders,
  Terminal,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { MODEL_BY_ID, MODEL_CATALOG, PROTECTION_MODES } from '../data/researchData';
import { requestImageCloaking } from '../services/api';
import type { AttackMethod, ModelId, ProtectionMode } from '../types';

interface CloakingStudioProps {
  onComplete: () => void;
  onOpenSettings: () => void;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

const PROCESSING_STAGES = [
  'Uploading image',
  'Loading AI model',
  'Generating adversarial perturbation',
  'Applying cloaking',
  'Evaluating image',
  'Generating final results',
];

export const CloakingStudio: React.FC<CloakingStudioProps> = ({
  onComplete,
  onOpenSettings,
}) => {
  const {
    user,
    apiBaseUrl,
    setApiBaseUrl,
    backendStatus,
    backendHealth,
    backendError,
    refreshBackendHealth,
    selectedModel,
    setSelectedModel,
    setLatestFile,
    setLatestTransferability,
    recordCompletedRun,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [attack, setAttack] = useState<AttackMethod>('FGSM');
  const [protectionMode, setProtectionMode] = useState<ProtectionMode>('standard');
  const [strength, setStrength] = useState<number>(0.5);
  const [saveToHistory, setSaveToHistory] = useState<boolean>(Boolean(user?.saveHistoryByDefault));

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Quick backend URL editing when offline
  const [urlDraft, setUrlDraft] = useState(apiBaseUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    setUrlDraft(apiBaseUrl);
  }, [apiBaseUrl]);

  // Advance progress stage while real backend request is in flight
  useEffect(() => {
    if (!isProcessing) {
      setActiveStageIdx(0);
      return;
    }
    const timings = attack === 'PGD' ? [500, 1400, 3200, 5600, 7800] : [350, 950, 1700, 2600, 3400];
    const timers = timings.map((delay, idx) =>
      window.setTimeout(() => {
        setActiveStageIdx((curr) => Math.max(curr, idx + 1));
      }, delay)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isProcessing, attack]);

  const maxEpsilon = PROTECTION_MODES[protectionMode].maxEpsilon;
  const calculatedEpsilon = Number((strength * maxEpsilon).toFixed(5));
  const pgdStepSize = Number((calculatedEpsilon / 4).toFixed(5));
  const modelMeta = MODEL_BY_ID[selectedModel];

  const handleFileCandidate = useCallback((file: File | undefined) => {
    setValidationError(null);
    setProcessingError(null);

    if (!file) return;

    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      setValidationError(
        `Unsupported file format (${file.type || 'unknown'}). Upload a PNG, JPEG, or WebP photograph.`
      );
      return;
    }

    if (file.size === 0) {
      setValidationError('The selected file is empty.');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setValidationError(`File size (${mb} MB) exceeds the 10 MB maximum upload limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setValidationError('Unable to read image data.');
        return;
      }

      const probe = new Image();
      probe.onload = () => {
        if (probe.naturalWidth < 32 || probe.naturalHeight < 32) {
          setValidationError(
            `Image resolution (${probe.naturalWidth}×${probe.naturalHeight}) is too small. Minimum size is 32×32 px.`
          );
          return;
        }
        if (probe.naturalWidth > 8192 || probe.naturalHeight > 8192) {
          setValidationError(
            `Image resolution (${probe.naturalWidth}×${probe.naturalHeight}) exceeds the 8192 px safety cap.`
          );
          return;
        }
        setSelectedFile(file);
        setPreviewUrl(dataUrl);
        setDimensions({ width: probe.naturalWidth, height: probe.naturalHeight });
      };
      probe.onerror = () => {
        setValidationError('The file appears corrupted and could not be decoded as an image.');
      };
      probe.src = dataUrl;
    };
    reader.onerror = () => setValidationError('Failed to read the selected file.');
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileCandidate(e.dataTransfer.files?.[0]);
  };

  const clearUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setValidationError(null);
    setProcessingError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    try {
      setApiBaseUrl(urlDraft);
      await refreshBackendHealth(urlDraft);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Invalid backend URL');
    }
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(
        'cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000'
      );
      setCopiedCmd(true);
      window.setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleGenerateCloaked = async () => {
    setValidationError(null);
    setProcessingError(null);

    if (!selectedFile || !previewUrl) {
      setValidationError('Please upload a PNG, JPEG, or WebP photograph first.');
      return;
    }

    setIsProcessing(true);
    setActiveStageIdx(0);

    try {
      const result = await requestImageCloaking({
        baseUrl: apiBaseUrl,
        file: selectedFile,
        originalDataUrl: previewUrl,
        model: selectedModel,
        attack,
        protectionMode,
        strength,
      });

      setActiveStageIdx(PROCESSING_STAGES.length - 1);
      setLatestFile(selectedFile);
      setLatestTransferability(null);
      await recordCompletedRun(result, saveToHistory);
      onComplete();
    } catch (err) {
      // Strictly surface real backend failure; never fabricate a successful result
      setProcessingError(
        err instanceof Error
          ? err.message
          : 'Adversarial cloaking failed because the backend could not complete inference.'
      );
      void refreshBackendHealth();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live FastAPI Backend Connectivity Panel */}
      <div className="glass-surface rounded-xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Cpu
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                backendStatus === 'connected'
                  ? 'text-emerald-400'
                  : backendStatus === 'checking'
                  ? 'text-[#00D4FF]'
                  : 'text-amber-400'
              }`}
            />
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h2 className="text-sm font-semibold text-white">
                  PyTorch FastAPI Inference Engine
                </h2>
                <span className="text-xs text-slate-500">·</span>
                <span
                  className={`text-xs font-medium ${
                    backendStatus === 'connected'
                      ? 'text-emerald-400'
                      : backendStatus === 'checking'
                      ? 'text-[#00D4FF]'
                      : 'text-amber-400'
                  }`}
                >
                  {backendStatus === 'connected'
                    ? `Connected (${backendHealth?.device.toUpperCase()} · PyTorch ${backendHealth?.torch_version})`
                    : backendStatus === 'checking'
                    ? 'Checking backend health...'
                    : 'Backend Offline'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {backendStatus === 'connected'
                  ? `Endpoint ${apiBaseUrl} is ready for live gradient computation and resolution-decoupled cloaking.`
                  : backendError ||
                    `FastAPI server at ${apiBaseUrl} is not reachable. Start the Python backend to run real PyTorch adversarial perturbations.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void refreshBackendHealth()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080D1B] px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080D1B] px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap"
            >
              Backend Settings
            </button>
          </div>
        </div>

        {/* Helpful setup & URL reconfiguration block when FastAPI is offline */}
        {backendStatus === 'offline' && (
          <div className="mt-4 border-t border-slate-800 pt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                  <Terminal className="h-3.5 w-3.5 text-[#00D4FF]" />
                  Launch Python Backend Locally (requires Python 3.10+ &amp; PyTorch)
                </span>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="inline-flex items-center gap-1 text-[#00D4FF] hover:underline"
                >
                  {copiedCmd ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedCmd ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <pre className="rounded-lg border border-slate-800 bg-[#080D1B] px-3.5 py-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                cd backend &amp;&amp; pip install -r requirements.txt &amp;&amp; uvicorn main:app --host 0.0.0.0 --port 8000
              </pre>
            </div>

            <form onSubmit={handleQuickConnect} className="lg:col-span-5 flex flex-col justify-end">
              <label htmlFor="quick-api-url" className="text-xs font-medium text-slate-300 mb-1.5">
                FastAPI Base URL
              </label>
              <div className="flex gap-2">
                <input
                  id="quick-api-url"
                  type="url"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="http://localhost:8000"
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#080D1B] px-3 py-2 font-mono text-xs text-white focus:border-[#397BFF] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#397BFF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2B68E8] whitespace-nowrap shrink-0"
                >
                  Connect
                </button>
              </div>
              {urlError && <p className="mt-1 text-xs text-rose-400">{urlError}</p>}
            </form>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Image Upload & Preview */}
        <div className="xl:col-span-7 space-y-5">
          <div className="glass-surface rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  1. Photograph Input
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  PNG, JPEG, or WebP up to 10 MB · Native resolution preserved via resolution decoupling
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-50 whitespace-nowrap"
                  >
                    Replace Image
                  </button>
                  <button
                    type="button"
                    onClick={clearUpload}
                    disabled={isProcessing}
                    aria-label="Remove uploaded image"
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/30 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/60 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleFileCandidate(e.target.files?.[0])}
              className="hidden"
            />

            {!previewUrl ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`flex min-h-[340px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-[#00D4FF] bg-[#397BFF]/10'
                    : 'border-slate-700/80 bg-[#080D1B]/60 hover:border-[#397BFF]/70 hover:bg-[#080D1B]/90'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700 bg-[#101A2E] text-[#00D4FF]">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <p className="mt-4 font-display text-base font-semibold text-white">
                  Drag and drop a photograph here, or click to browse
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Accepts PNG, JPEG, and WebP · Maximum file size 10 MB · Min 32×32 px
                </p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#397BFF] px-4 py-2 text-xs font-semibold text-white">
                  <Upload className="h-3.5 w-3.5" />
                  Select Photograph
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#080D1B] flex items-center justify-center min-h-[300px] max-h-[420px]">
                  <img
                    src={previewUrl}
                    alt="Uploaded photograph preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[420px] w-full object-contain"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
                  <span className="font-medium text-slate-200 truncate max-w-xs">
                    {selectedFile?.name}
                  </span>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    {dimensions && (
                      <span className="text-[#00D4FF]">
                        {dimensions.width} × {dimensions.height} px
                      </span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedFile?.type.replace('image/', '').toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}

            {validationError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Resolution Decoupling Pipeline Explainer */}
          <div className="glass-surface-subtle rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4FF]">
              <Layers className="h-4 w-4" />
              <span>Active Resolution-Decoupling Guarantee</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {dimensions
                ? `Gradients will be calculated on a 224×224 working copy, upsampled bilinearly back to ${dimensions.width}×${dimensions.height} px, composited onto your original pixels, clipped to [0, 1], and exported as a lossless ${dimensions.width}×${dimensions.height} PNG.`
                : 'Your uploaded photograph will never be cropped or permanently downsized to 224×224. Perturbations are computed at model resolution and bilinearly decoupled back onto your exact original width and height.'}
            </p>
          </div>
        </div>

        {/* Right Column: Adversarial Controls & Execute */}
        <div className="xl:col-span-5 space-y-5">
          <div className="glass-surface rounded-xl p-6 space-y-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                2. Adversarial Configuration
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure target classifier, gradient optimizer, and L∞ perturbation budget
              </p>
            </div>

            {/* AI Model Selection Dropdown */}
            <div>
              <label htmlFor="model-select" className="block text-xs font-semibold text-slate-200 mb-2">
                Target Pretrained Classifier
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelId)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white focus:border-[#397BFF] focus:outline-none disabled:opacity-60"
              >
                {MODEL_CATALOG.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.parameters} · {m.weights})
                  </option>
                ))}
              </select>

              <div className="mt-3 rounded-lg border border-slate-800 bg-[#080D1B]/70 p-3.5 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-medium">
                  <span>{modelMeta.architecture}</span>
                  <span className="font-mono text-[#00D4FF] tabular-nums">{modelMeta.input_size}</span>
                </div>
                <p className="mt-1.5 leading-relaxed text-slate-400">{modelMeta.description}</p>
              </div>
            </div>

            {/* Attack Method Selection */}
            <div>
              <span className="block text-xs font-semibold text-slate-200 mb-2">
                Adversarial Attack Method
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setAttack('FGSM')}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    attack === 'FGSM'
                      ? 'border-[#397BFF] bg-[#397BFF]/15 text-white'
                      : 'border-slate-800 bg-[#080D1B]/70 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <p className="text-sm font-semibold">FGSM</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">
                    Fast Gradient Sign Method · Single step · Faster inference
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setAttack('PGD')}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    attack === 'PGD'
                      ? 'border-[#397BFF] bg-[#397BFF]/15 text-white'
                      : 'border-slate-800 bg-[#080D1B]/70 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <p className="text-sm font-semibold">PGD</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">
                    Projected Gradient Descent · 10 iterations · α = ε / 4
                  </p>
                </button>
              </div>
            </div>

            {/* Protection Mode & Strength Slider */}
            <div className="space-y-4 border-t border-slate-800 pt-5">
              <div>
                <span className="block text-xs font-semibold text-slate-200 mb-2">
                  Protection Mode (Maximum Epsilon Budget)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {(['standard', 'strong'] as const).map((modeKey) => {
                    const cfg = PROTECTION_MODES[modeKey];
                    const active = protectionMode === modeKey;
                    return (
                      <button
                        key={modeKey}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setProtectionMode(modeKey)}
                        className={`rounded-xl border p-3.5 text-left transition-colors ${
                          active
                            ? 'border-[#00D4FF]/80 bg-[#00D4FF]/10 text-white'
                            : 'border-slate-800 bg-[#080D1B]/70 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold">{cfg.label}</span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-[#00D4FF] tabular-nums">
                          max ε = {cfg.maxEpsilon}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Strength Slider + Dynamic Epsilon Formula */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <label htmlFor="strength-slider" className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                    <Sliders className="h-3.5 w-3.5 text-[#00D4FF]" />
                    Perturbation Strength
                  </label>
                  <span className="font-mono text-xs text-white tabular-nums">
                    {(strength * 100).toFixed(0)}% ({strength.toFixed(2)})
                  </span>
                </div>
                <input
                  id="strength-slider"
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  disabled={isProcessing}
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="precision-slider w-full"
                />

                <div className="mt-3 rounded-lg border border-slate-800 bg-[#080D1B] p-3.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Calculated Perturbation Budget (ε)</span>
                    <span className="font-mono text-base font-semibold text-[#00D4FF] tabular-nums">
                      ε = {calculatedEpsilon.toFixed(5)}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                    ε = {strength.toFixed(2)} × {maxEpsilon}
                    {attack === 'PGD' ? ` · PGD step α = ε/4 = ${pgdStepSize.toFixed(5)} (10 iters)` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Opt-In Storage Toggle */}
            <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#080D1B]/60 p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToHistory}
                onChange={(e) => setSaveToHistory(e.target.checked)}
                disabled={isProcessing}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-[#080D1B] text-[#397BFF] focus:ring-[#397BFF]"
              />
              <span className="text-xs leading-relaxed text-slate-300">
                <strong className="font-semibold text-white">Save summary to Image History</strong>
                <br />
                Disabled by default for privacy. When unchecked, images are processed ephemerally in
                memory and discarded after viewing.
              </span>
            </label>

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isProcessing || !selectedFile}
              onClick={handleGenerateCloaked}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#397BFF] px-5 py-3.5 text-sm font-bold tracking-wide text-white transition-all hover:bg-[#2B68E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  PROCESSING PERTURBATION...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  GENERATE CLOAKED IMAGE
                </>
              )}
            </button>

            {/* Processing Error Alert */}
            {processingError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div>
                  <p className="font-semibold text-rose-100">Backend Processing Failed</p>
                  <p className="mt-1 leading-relaxed">{processingError}</p>
                </div>
              </div>
            )}
          </div>

          {/* 6-Stage Real Processing Pipeline Feedback */}
          {isProcessing && (
            <div className="glass-surface rounded-xl p-5">
              <p className="text-xs font-semibold text-[#00D4FF] mb-3">
                Executing PyTorch Cloaking Pipeline
              </p>
              <ol className="space-y-2.5">
                {PROCESSING_STAGES.map((stage, idx) => {
                  const isDone = idx < activeStageIdx;
                  const isActive = idx === activeStageIdx;
                  return (
                    <li key={stage} className="flex items-center justify-between text-xs">
                      <span
                        className={`flex items-center gap-2.5 ${
                          isDone
                            ? 'text-emerald-400'
                            : isActive
                            ? 'text-white font-medium'
                            : 'text-slate-500'
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00D4FF]" />
                        ) : (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-600 ml-1" />
                        )}
                        {stage}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        0{idx + 1}/06
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
