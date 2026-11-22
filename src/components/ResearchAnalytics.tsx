import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, BookOpen, Filter } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import {
  MODEL_BY_ID,
  REPORTED_ATTACK_COMPARISON,
  REPORTED_BENCHMARK_SUMMARY,
  REPORTED_BUDGET_CURVE,
  REPORTED_MODEL_PROFILES,
} from '../data/researchData';

export const ResearchAnalytics: React.FC = () => {
  const { sessionRuns, latestTransferability } = useApp();
  const [attackFilter, setAttackFilter] = useState<'ALL' | 'FGSM' | 'PGD'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'Standard' | 'Strong'>('ALL');

  const filteredBudgetData =
    modeFilter === 'ALL'
      ? REPORTED_BUDGET_CURVE
      : REPORTED_BUDGET_CURVE.filter((row) => row.mode === modeFilter);

  const liveQualityRows = sessionRuns.map((r, idx) => ({
    run: `#${sessionRuns.length - idx}`,
    fileName: r.fileName,
    model: MODEL_BY_ID[r.model]?.name || r.model,
    attack: r.attack,
    epsilon: r.epsilon,
    ssim: r.ssim,
    confidenceDropPct: Number((r.confidence_drop * 100).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00D4FF]">
            <BookOpen className="h-3.5 w-3.5" />
            Published Experimental Findings · 240 Unseen Imagenette Photographs
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">
            Research Analytics Dashboard
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            Empirical metrics below summarize the project report&apos;s controlled evaluation across
            240 unseen Imagenette images and 720 cross-model transferability experiments, kept
            distinct from your live session runs.
          </p>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#101A2E] p-1">
            <span className="px-2 text-[11px] text-slate-400 inline-flex items-center gap-1">
              <Filter className="h-3 w-3" /> Attack:
            </span>
            {(['ALL', 'FGSM', 'PGD'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAttackFilter(opt)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  attackFilter === opt
                    ? 'bg-[#397BFF] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#101A2E] p-1">
            <span className="px-2 text-[11px] text-slate-400">Mode:</span>
            {(['ALL', 'Standard', 'Strong'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setModeFilter(opt)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  modeFilter === opt
                    ? 'bg-[#397BFF] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section A: FGSM vs PGD Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="glass-surface rounded-xl p-6 lg:col-span-6">
          <h3 className="text-base font-semibold text-white">
            A. Attack Comparison — FGSM vs. PGD Misclassification Rate
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Reported benchmark misclassification range: 2.5%–4.2% at default setting rising to
            8.3%–13.3% at literature-typical perturbation budget.
          </p>
          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORTED_ATTACK_COMPARISON} margin={{ top: 10, right: 16, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="setting" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#080D1B',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {(attackFilter === 'ALL' || attackFilter === 'FGSM') && (
                  <Bar
                    dataKey="fgsmMisclassification"
                    name="FGSM Misclassification (%)"
                    fill="#397BFF"
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {(attackFilter === 'ALL' || attackFilter === 'PGD') && (
                  <Bar
                    dataKey="pgdMisclassification"
                    name="PGD (10-iter) Misclassification (%)"
                    fill="#00D4FF"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section C: Perturbation Budget Analysis */}
        <div className="glass-surface rounded-xl p-6 lg:col-span-6">
          <h3 className="text-base font-semibold text-white">
            C. Perturbation Budget Trade-Off (ε vs. SSIM &amp; Misclassification)
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Higher perturbation budgets increase misclassification pressure while lowering mean SSIM
            within the reported 0.88–0.996 envelope.
          </p>
          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredBudgetData} margin={{ top: 10, right: 12, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="budgetLabel" stroke="#94A3B8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} unit="%" />
                <YAxis yAxisId="right" orientation="right" domain={[0.84, 1]} stroke="#00D4FF" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#080D1B',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="misclassificationHigh"
                  name="Upper Misclassification (%)"
                  fill="#397BFF"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="meanSsim"
                  name="Mean SSIM"
                  stroke="#00D4FF"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section B: Model Comparison Table */}
      <div className="glass-surface rounded-xl p-6">
        <h3 className="text-base font-semibold text-white">
          B. Supported Classifier Architecture Comparison
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Structural complexity and reported evaluation ranges across the three pretrained ImageNet
          classifiers.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Model</th>
                <th className="py-2.5 px-4 font-medium">Family</th>
                <th className="py-2.5 px-4 text-right font-medium">Parameters</th>
                <th className="py-2.5 px-4 font-medium">Default Setting Range</th>
                <th className="py-2.5 px-4 font-medium">Literature Budget Range</th>
                <th className="py-2.5 px-4 font-medium">Reported Mean SSIM</th>
                <th className="py-2.5 pl-4 font-medium">Gradient Cost Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {REPORTED_MODEL_PROFILES.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/30">
                  <td className="py-3 pr-4 font-semibold text-white">{row.model}</td>
                  <td className="py-3 px-4 text-slate-300">{row.architecture}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#00D4FF] tabular-nums">
                    {row.parametersM.toFixed(1)}M
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200 tabular-nums">
                    {row.defaultRangeLabel}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200 tabular-nums">
                    {row.literatureRangeLabel}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200 tabular-nums">{row.ssimBand}</td>
                  <td className="py-3 pl-4 text-slate-400">{row.gradientComplexity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section D: Cross-Model Transferability Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="glass-surface rounded-xl p-6 lg:col-span-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                D. Cross-Model Transferability Matrix
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Reported overall cross-model transferability:{' '}
                <span className="font-mono text-[#00D4FF] font-semibold">
                  {REPORTED_BENCHMARK_SUMMARY.crossModelTransferabilityPercent}%
                </span>{' '}
                across {REPORTED_BENCHMARK_SUMMARY.crossModelExperimentsCount} experiments.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 text-left font-medium">Source ↓ / Target →</th>
                  <th className="py-2.5 px-3 font-medium">ResNet-50</th>
                  <th className="py-2.5 px-3 font-medium">MobileNetV3-Large</th>
                  <th className="py-2.5 px-3 font-medium">ViT-B/16</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                {(['resnet50', 'mobilenet_v3_large', 'vit_b_16'] as const).map((srcId) => (
                  <tr key={srcId}>
                    <td className="py-3 px-3 text-left font-sans font-semibold text-white">
                      {MODEL_BY_ID[srcId].name}
                    </td>
                    {(['resnet50', 'mobilenet_v3_large', 'vit_b_16'] as const).map((tgtId) => {
                      const isSelf = srcId === tgtId;
                      // Check if user ran a live transferability test matching this pair
                      const liveMatch =
                        latestTransferability?.source_model === srcId
                          ? latestTransferability.results.find((r) => r.target_model === tgtId)
                          : undefined;

                      return (
                        <td
                          key={`${srcId}-${tgtId}`}
                          className={`py-3 px-3 rounded ${
                            isSelf
                              ? 'bg-[#397BFF]/15 text-[#00D4FF]'
                              : liveMatch?.misclassified
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-[#080D1B]/60 text-slate-300'
                          }`}
                        >
                          {liveMatch ? (
                            <span>
                              Live: {liveMatch.misclassified ? 'Transferred' : 'Retained'}
                            </span>
                          ) : isSelf ? (
                            <span>White-Box Target</span>
                          ) : (
                            <span className="text-slate-400">9.72% avg*</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            *The project report documents an aggregate 9.72% cross-model transferability across 720
            experiments without fabricating unmeasured pairwise cell numbers. Run &ldquo;Evaluate
            Cross-Model Transferability&rdquo; from the Results view to populate live per-pair
            outcomes for your uploaded photograph.
          </p>
        </div>

        {/* Section E: Image Quality, JPEG Attenuation & FaceNet Caveat */}
        <div className="glass-surface rounded-xl p-6 lg:col-span-5 flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-base font-semibold text-white">
              E. Image Quality &amp; Robustness Findings
            </h3>
            <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="rounded-lg border border-slate-800 bg-[#080D1B]/70 p-4">
                <p className="font-semibold text-white">Visual Similarity (SSIM)</p>
                <p className="mt-1 text-slate-400">
                  Mean SSIM across benchmark settings ranged from{' '}
                  <span className="font-mono text-[#00D4FF]">0.88</span> (higher perturbation
                  budgets) to <span className="font-mono text-[#00D4FF]">0.996</span> (default
                  low-epsilon protection), confirming resolution decoupling preserves visual
                  sharpness.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#080D1B]/70 p-4">
                <p className="font-semibold text-white">JPEG Compression Attenuation</p>
                <p className="mt-1 text-slate-400">{REPORTED_BENCHMARK_SUMMARY.jpegFinding}</p>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">FaceNet Evaluation Result</p>
                  <p className="mt-1 text-amber-100/85">
                    {REPORTED_BENCHMARK_SUMMARY.faceRecognitionFinding}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {liveQualityRows.length > 0 && (
            <div className="border-t border-slate-800 pt-4">
              <p className="text-xs font-semibold text-emerald-400 mb-2">
                Your Live Session Quality Summary ({liveQualityRows.length} runs)
              </p>
              <p className="font-mono text-xs text-slate-300 tabular-nums">
                Mean Live SSIM:{' '}
                {(
                  liveQualityRows.reduce((s, r) => s + r.ssim, 0) / liveQualityRows.length
                ).toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
