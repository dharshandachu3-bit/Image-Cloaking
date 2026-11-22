import React, { useState } from 'react';
import { Download, Eye, Lock, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { MODEL_BY_ID } from '../data/researchData';
import type { CloakResult, HistoryItem } from '../types';

interface ImageHistoryViewProps {
  onOpenResult: () => void;
  onOpenStudio: () => void;
}

export const ImageHistoryView: React.FC<ImageHistoryViewProps> = ({
  onOpenResult,
  onOpenStudio,
}) => {
  const {
    historyItems,
    sessionRuns,
    setLatestResult,
    setLatestFile,
    setLatestTransferability,
    deleteHistoryItem,
    clearAllHistory,
  } = useApp();

  const [query, setQuery] = useState('');
  const [attackFilter, setAttackFilter] = useState<'ALL' | 'FGSM' | 'PGD'>('ALL');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = historyItems.filter((item) => {
    const matchesAttack = attackFilter === 'ALL' || item.attack === attackFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.fileName.toLowerCase().includes(q) ||
      item.originalClass.toLowerCase().includes(q) ||
      item.cloakedClass.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q);
    return matchesAttack && matchesQuery;
  });

  const handleInspect = (item: HistoryItem) => {
    // Check if full-resolution session run is still in memory
    const fullRun = sessionRuns.find(
      (r) => r.fileName === item.fileName && r.epsilon === item.epsilon && r.ssim === item.ssim
    );

    if (fullRun) {
      setLatestResult(fullRun);
      onOpenResult();
      return;
    }

    // Reconstruct inspectable result from saved opt-in thumbnails & metrics
    const reconstructed: CloakResult = {
      id: item.id,
      createdAt: item.createdAt,
      fileName: item.fileName,
      originalDataUrl: item.originalThumbnail || '',
      model: item.model,
      model_name: MODEL_BY_ID[item.model]?.name || item.model,
      attack: item.attack,
      protection_mode: item.protectionMode,
      strength: item.strength,
      epsilon: item.epsilon,
      pgd_iterations: item.attack === 'PGD' ? 10 : null,
      pgd_step_size: item.attack === 'PGD' ? Number((item.epsilon / 4).toFixed(5)) : null,
      original_prediction: {
        class_id: 0,
        label: item.originalClass,
        confidence: item.originalConfidence,
        top5: [],
      },
      cloaked_prediction: {
        class_id: item.misclassified ? 1 : 0,
        label: item.cloakedClass,
        confidence: item.cloakedConfidence,
        top5: [],
      },
      confidence_drop: item.confidenceDrop,
      misclassified: item.misclassified,
      ssim: item.ssim,
      psnr: 0,
      l_inf_norm: item.epsilon,
      processing_time_ms: item.processingTimeMs,
      original_resolution: { width: item.width, height: item.height },
      cloaked_image_base64: item.cloakedThumbnail || '',
      amplified_diff_base64: item.diffThumbnail || '',
      diff_amplification_factor: 12,
      activation_map_original: item.activationMapOriginal || [],
      activation_map_cloaked: item.activationMapCloaked || [],
      activation_map_delta: [],
      disclaimer:
        'Adversarial perturbations target pretrained ImageNet classifiers and are not guaranteed to defeat every recognition model or facial-recognition system.',
    };

    setLatestFile(null);
    setLatestTransferability(null);
    setLatestResult(reconstructed);
    onOpenResult();
  };

  const handleDownload = (item: HistoryItem) => {
    const fullRun = sessionRuns.find(
      (r) => r.fileName === item.fileName && r.epsilon === item.epsilon && r.ssim === item.ssim
    );
    const src = fullRun?.cloaked_image_base64 || item.cloakedThumbnail;
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    const base = item.fileName.replace(/\.[^/.]+$/, '');
    link.download = `${base}_cloaked_${item.model}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Image History</h2>
          <p className="mt-1 text-xs text-slate-400">
            Opt-in saved cloaking records. Private photographs are never stored unless you
            explicitly enable history saving in Cloaking Studio or Settings.
          </p>
        </div>

        {historyItems.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await clearAllHistory();
                    setConfirmClear(false);
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Confirm Delete All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear History
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search & Attack Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by filename, class, or model..."
            className="w-full rounded-lg border border-slate-800 bg-[#101A2E] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#397BFF] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#101A2E] p-1 self-start sm:self-auto">
          {(['ALL', 'FGSM', 'PGD'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAttackFilter(opt)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                attackFilter === opt ? 'bg-[#397BFF] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-surface rounded-xl p-12 text-center">
          <Lock className="mx-auto h-7 w-7 text-[#00D4FF]" />
          <h3 className="mt-3 font-display text-lg font-semibold text-white">
            {historyItems.length === 0 ? 'No Saved History Entries' : 'No Matching History Entries'}
          </h3>
          <p className="mt-2 mx-auto max-w-md text-xs leading-relaxed text-slate-400">
            {historyItems.length === 0
              ? 'By default, photographs are processed ephemerally in RAM and discarded. Check "Save summary to Image History" in the Cloaking Studio when you wish to keep a record.'
              : 'Try adjusting your search query or attack method filter.'}
          </p>
          {historyItems.length === 0 && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="mt-5 rounded-lg bg-[#397BFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2B68E8]"
            >
              Open Cloaking Studio
            </button>
          )}
        </div>
      ) : (
        <div className="glass-surface rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#080D1B]/60 text-slate-400">
                  <th className="py-3 pl-5 pr-3 font-medium">Thumbnails</th>
                  <th className="py-3 px-3 font-medium">File &amp; Timestamp</th>
                  <th className="py-3 px-3 font-medium">Model / Attack / Mode</th>
                  <th className="py-3 px-3 font-medium">Prediction Change</th>
                  <th className="py-3 px-3 text-right font-medium">SSIM</th>
                  <th className="py-3 px-3 text-right font-medium">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 overflow-hidden rounded border border-slate-700 bg-[#080D1B]">
                          {item.originalThumbnail ? (
                            <img
                              src={item.originalThumbnail}
                              alt="Original thumbnail"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                              Orig
                            </span>
                          )}
                        </div>
                        <div className="h-10 w-10 overflow-hidden rounded border border-[#397BFF]/40 bg-[#080D1B]">
                          {item.cloakedThumbnail ? (
                            <img
                              src={item.cloakedThumbnail}
                              alt="Cloaked thumbnail"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                              Cloak
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-white max-w-[180px] truncate">{item.fileName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <p className="font-medium text-slate-200">
                        {MODEL_BY_ID[item.model]?.name || item.model}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {item.attack} · {item.protectionMode === 'strong' ? 'Strong' : 'Standard'} ·
                        ε={item.epsilon.toFixed(4)}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <span>{item.originalClass}</span>
                      <span className="mx-1.5 text-slate-500">→</span>
                      <span className={item.misclassified ? 'text-emerald-400' : 'text-slate-400'}>
                        {item.cloakedClass}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#00D4FF] tabular-nums">
                      {item.ssim.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={
                          item.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {item.status === 'completed' ? 'Completed' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInspect(item)}
                          title="View Results"
                          className="rounded-md border border-slate-700 p-1.5 text-slate-300 hover:border-[#397BFF] hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          title="Download Cloaked Image"
                          className="rounded-md border border-slate-700 p-1.5 text-slate-300 hover:border-[#00D4FF] hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteHistoryItem(item.id)}
                          title="Delete History Entry"
                          className="rounded-md border border-slate-700 p-1.5 text-rose-400 hover:border-rose-500 hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
