import React, { useState } from 'react';
import { Check, Copy, RefreshCw, Server, Shield } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { DEFAULT_FASTAPI_URL } from '../services/api';

export const SettingsView: React.FC = () => {
  const {
    user,
    authMode,
    apiBaseUrl,
    setApiBaseUrl,
    backendStatus,
    backendHealth,
    backendError,
    refreshBackendHealth,
    updateUserProfile,
  } = useApp();

  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleSaveBackendUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    setSaveFeedback(null);
    try {
      setApiBaseUrl(urlInput);
      const ok = await refreshBackendHealth(urlInput);
      setSaveFeedback(
        ok
          ? 'Connected to FastAPI PyTorch backend successfully.'
          : 'URL saved, but the backend did not respond to GET /health yet.'
      );
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Invalid URL');
    }
  };

  const handleToggleDefaultHistory = async (enabled: boolean) => {
    try {
      await updateUserProfile({ saveHistoryByDefault: enabled });
    } catch {
      // Handled gracefully
    }
  };

  const copySnippet = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlock(key);
      window.setTimeout(() => setCopiedBlock(null), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const localSnippet = `cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload`;

  const dockerSnippet = `cd backend
docker build -t cloak-vision-api .
docker run -p 8000:8000 -e ALLOWED_ORIGINS="http://localhost:3000" cloak-vision-api`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Settings &amp; Backend Setup</h2>
        <p className="mt-1 text-xs text-slate-400">
          Configure the Python FastAPI + PyTorch inference endpoint, privacy defaults, and
          deployment environment.
        </p>
      </div>

      {/* FastAPI Backend URL Configuration */}
      <section className="glass-surface rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 h-5 w-5 text-[#00D4FF]" />
            <div>
              <h3 className="text-base font-semibold text-white">FastAPI PyTorch Backend URL</h3>
              <p className="mt-1 text-xs text-slate-400">
                Point the frontend to your local Uvicorn server or a deployed Render / Cloud Run
                FastAPI instance.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-medium shrink-0 ${
              backendStatus === 'connected'
                ? 'text-emerald-400'
                : backendStatus === 'checking'
                ? 'text-[#00D4FF]'
                : 'text-amber-400'
            }`}
          >
            {backendStatus === 'connected'
              ? 'Connected'
              : backendStatus === 'checking'
              ? 'Checking...'
              : 'Offline'}
          </span>
        </div>

        <form onSubmit={handleSaveBackendUrl} className="space-y-3">
          <label htmlFor="settings-api-url" className="block text-xs font-medium text-slate-300">
            API Base URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="settings-api-url"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={DEFAULT_FASTAPI_URL}
              className="flex-1 rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 font-mono text-xs text-white focus:border-[#397BFF] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#397BFF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2B68E8] whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Save &amp; Test Health
            </button>
          </div>
          {urlError && <p className="text-xs text-rose-400">{urlError}</p>}
          {saveFeedback && <p className="text-xs text-[#00D4FF]">{saveFeedback}</p>}
          {backendStatus === 'offline' && backendError && (
            <p className="text-xs text-amber-300/90">{backendError}</p>
          )}
        </form>

        {backendHealth && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800 pt-4 text-xs">
            <div>
              <p className="text-slate-500">Execution Device</p>
              <p className="mt-1 font-mono text-white uppercase">{backendHealth.device}</p>
            </div>
            <div>
              <p className="text-slate-500">PyTorch Version</p>
              <p className="mt-1 font-mono text-white">{backendHealth.torch_version}</p>
            </div>
            <div>
              <p className="text-slate-500">Max Upload Limit</p>
              <p className="mt-1 font-mono text-white">{backendHealth.max_upload_mb} MB</p>
            </div>
            <div>
              <p className="text-slate-500">Loaded Models</p>
              <p className="mt-1 font-mono text-white">
                {backendHealth.loaded_models.length > 0
                  ? backendHealth.loaded_models.join(', ')
                  : 'Lazy on demand'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Privacy & Ephemeral Processing Controls */}
      <section className="glass-surface rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Privacy &amp; Storage Policy</h3>
            <p className="mt-1 text-xs text-slate-400">
              Uploaded images are always processed ephemerally in FastAPI RAM and never written to
              server disk.
            </p>
          </div>
        </div>

        <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-[#080D1B]/60 p-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-white">
              Opt-in to save cloaked summaries in Image History by default
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Off by default. When disabled, you must manually check the consent box in Cloaking
              Studio to retain a record.
            </p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(user?.saveHistoryByDefault)}
            onChange={(e) => void handleToggleDefaultHistory(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-[#080D1B] text-[#397BFF]"
          />
        </label>

        <div className="text-xs text-slate-400 border-t border-slate-800 pt-4">
          Active Authentication Mode:{' '}
          <span className="font-medium text-white">
            {authMode === 'firebase'
              ? 'Firebase Authentication (Production)'
              : 'Development Auth Mode (Server scrypt + Memory Bearer Token)'}
          </span>
        </div>
      </section>

      {/* Complete Deployment & Run Instructions */}
      <section className="glass-surface rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-white">
            Running &amp; Deploying the Python FastAPI Backend
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Because PyTorch pretrained models (ResNet-50, MobileNetV3-Large, ViT-B/16) require a
            Python runtime with Torch/Torchvision installed, run the included{' '}
            <code className="font-mono text-slate-200">/backend</code> service locally or deploy it
            via Docker to Render, Railway, or Google Cloud Run.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-200">Option 1 — Local Python Virtualenv</span>
              <button
                type="button"
                onClick={() => void copySnippet('local', localSnippet)}
                className="inline-flex items-center gap-1 text-[#00D4FF] hover:underline"
              >
                {copiedBlock === 'local' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedBlock === 'local' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-lg border border-slate-800 bg-[#080D1B] p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              {localSnippet}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-200">Option 2 — Docker Container</span>
              <button
                type="button"
                onClick={() => void copySnippet('docker', dockerSnippet)}
                className="inline-flex items-center gap-1 text-[#00D4FF] hover:underline"
              >
                {copiedBlock === 'docker' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedBlock === 'docker' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-lg border border-slate-800 bg-[#080D1B] p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              {dockerSnippet}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
