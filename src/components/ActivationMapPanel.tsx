import React, { useState } from 'react';
import { Eye, Grid3X3 } from 'lucide-react';

interface ActivationMapPanelProps {
  originalMap: number[][];
  cloakedMap: number[][];
  deltaMap?: number[][];
  overlayImageSrc?: string;
  modelName: string;
  activationLayerLabel?: string;
}

/**
 * Blue-to-red scientific colormap for normalized activation values in [0, 1].
 */
function valueToHeatmapColor(val: number, alpha = 1): string {
  const v = Math.max(0, Math.min(1, val));
  let r = 0;
  let g = 0;
  let b = 0;

  if (v < 0.25) {
    const t = v / 0.25;
    r = Math.round(18 + t * 12);
    g = Math.round(48 + t * 125);
    b = Math.round(168 + t * 87);
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    r = Math.round(30 + t * 18);
    g = Math.round(173 + t * 55);
    b = Math.round(255 - t * 135);
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    r = Math.round(48 + t * 202);
    g = Math.round(228 - t * 28);
    b = Math.round(120 - t * 100);
  } else {
    const t = (v - 0.75) / 0.25;
    r = Math.round(250 - t * 12);
    g = Math.round(200 - t * 158);
    b = Math.round(20 + t * 24);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildFallbackDelta(a: number[][], b: number[][]): number[][] {
  let maxDiff = 0;
  const raw = a.map((row, r) =>
    row.map((val, c) => {
      const d = Math.abs((b[r]?.[c] ?? 0) - val);
      if (d > maxDiff) maxDiff = d;
      return d;
    })
  );
  if (maxDiff <= 1e-8) return raw;
  return raw.map((row) => row.map((v) => Number((v / maxDiff).toFixed(4))));
}

export const ActivationMapPanel: React.FC<ActivationMapPanelProps> = ({
  originalMap,
  cloakedMap,
  deltaMap,
  overlayImageSrc,
  modelName,
  activationLayerLabel,
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [overlaySource, setOverlaySource] = useState<'original' | 'cloaked' | 'delta'>('cloaked');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.58);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const computedDelta = deltaMap ?? buildFallbackDelta(originalMap, cloakedMap);

  const renderGrid = (matrix: number[][], title: string, subtitle: string) => (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-7 gap-1 rounded-lg border border-slate-800 bg-[#080D1B] p-2">
        {matrix.map((row, rIdx) =>
          row.map((val, cIdx) => {
            const isHovered = hoveredCell?.row === rIdx && hoveredCell?.col === cIdx;
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                onMouseEnter={() => setHoveredCell({ row: rIdx, col: cIdx })}
                onMouseLeave={() => setHoveredCell(null)}
                className={`aspect-square rounded-[3px] flex items-center justify-center transition-transform duration-150 ${
                  isHovered ? 'scale-105 ring-2 ring-white z-10' : ''
                }`}
                style={{ backgroundColor: valueToHeatmapColor(val, 0.92) }}
                title={`Cell [${rIdx}, ${cIdx}]: ${val.toFixed(3)}`}
              >
                <span className="font-mono text-[10px] font-medium text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)] tabular-nums">
                  {val.toFixed(2)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const activeOverlayMatrix =
    overlaySource === 'original'
      ? originalMap
      : overlaySource === 'cloaked'
      ? cloakedMap
      : computedDelta;

  return (
    <section className="glass-surface rounded-xl p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h3 className="text-lg font-semibold text-white">7×7 Spatial Activation Map Analysis</h3>
          <p className="mt-1 text-sm text-slate-400">
            Extracted directly from PyTorch forward hooks on {modelName}
            {activationLayerLabel ? ` · ${activationLayerLabel}` : ''}.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#080D1B] p-1 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'side-by-side'
                ? 'bg-[#397BFF] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            7×7 Matrices
          </button>
          {overlayImageSrc && (
            <button
              type="button"
              onClick={() => setViewMode('overlay')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'overlay'
                  ? 'bg-[#397BFF] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Image Overlay
            </button>
          )}
        </div>
      </div>

      {/* Blue-to-Red Color Scale Legend & Synchronized Cell Inspector */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>Low Activation (0.00)</span>
          <div
            className="h-2.5 w-44 rounded-full border border-slate-700/80"
            style={{
              background:
                'linear-gradient(90deg, #1230A8 0%, #1EADFF 28%, #30E478 52%, #FAC814 76%, #EE2A2C 100%)',
            }}
          />
          <span>Peak Activation (1.00)</span>
        </div>

        <div className="font-mono tabular-nums text-slate-300">
          {hoveredCell ? (
            <span>
              Cell [{hoveredCell.row}, {hoveredCell.col}] · Orig{' '}
              {(originalMap[hoveredCell.row]?.[hoveredCell.col] ?? 0).toFixed(3)} · Cloaked{' '}
              {(cloakedMap[hoveredCell.row]?.[hoveredCell.col] ?? 0).toFixed(3)} · Shift{' '}
              {(computedDelta[hoveredCell.row]?.[hoveredCell.col] ?? 0).toFixed(3)}
            </span>
          ) : (
            <span className="text-slate-500">Hover any 7×7 spatial cell to inspect activation shift</span>
          )}
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {renderGrid(originalMap, 'Original Activation Map', 'Pre-perturbation spatial attention focus')}
          {renderGrid(cloakedMap, 'Cloaked Activation Map', 'Post-perturbation shifted feature response')}
          {renderGrid(computedDelta, 'Absolute Activation Shift', 'Normalized |A_cloaked − A_original|')}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#080D1B] aspect-[4/3]">
              <img
                src={overlayImageSrc}
                alt="Base photograph for 7x7 activation overlay"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
              <div
                className="absolute inset-0 grid grid-cols-7 grid-rows-7 pointer-events-none"
                style={{ opacity: overlayOpacity }}
              >
                {activeOverlayMatrix.map((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <div
                      key={`ov-${rIdx}-${cIdx}`}
                      style={{
                        backgroundColor: valueToHeatmapColor(val, 0.85),
                        filter: 'blur(6px)',
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Active Overlay Layer
              </label>
              <div className="flex items-center gap-1 rounded-lg bg-[#080D1B] p-1 border border-slate-800">
                {(
                  [
                    { id: 'original', label: 'Original' },
                    { id: 'cloaked', label: 'Cloaked' },
                    { id: 'delta', label: 'Spatial Shift' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOverlaySource(tab.id)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      overlaySource === tab.id
                        ? 'bg-[#397BFF] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 font-medium">Heatmap Opacity</span>
                <span className="font-mono tabular-nums text-[#00D4FF]">
                  {Math.round(overlayOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.9}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="precision-slider w-full"
              />
            </div>

            <div className="border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-400 space-y-2">
              <p>
                Warm red and amber regions denote high spatial energy in the model&apos;s final feature
                tensor before classification pooling.
              </p>
              <p>
                Effective perturbations disperse or relocate peak activations away from discriminative
                object features without altering human-perceivable composition.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
