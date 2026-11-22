import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Clock, Cpu, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import {
  MODEL_BY_ID,
  REPORTED_ATTACK_COMPARISON,
  REPORTED_BENCHMARK_SUMMARY,
} from '../data/researchData';
import type { DashboardTab } from '../types';

interface OverviewDashboardProps {
  onNavigate: (tab: DashboardTab) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate }) => {
  const { sessionRuns, historyItems, selectedModel, backendStatus, backendHealth } = useApp();

  // Merge unique live records from current session + opt-in history without fabricating data
  const seenIds = new Set<string>();
  const combinedLive = [
    ...sessionRuns.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      fileName: r.fileName,
      model: r.model,
      attack: r.attack,
      protectionMode: r.protection_mode,
      epsilon: r.epsilon,
      ssim: r.ssim,
      processingTimeMs: r.processing_time_ms,
      originalClass: r.original_prediction.label,
      cloakedClass: r.cloaked_prediction.label,
      misclassified: r.misclassified,
      status: 'completed' as const,
    })),
    ...historyItems.map((h) => ({
      id: h.id,
      createdAt: h.createdAt,
      fileName: h.fileName,
      model: h.model,
      attack: h.attack,
      protectionMode: h.protectionMode,
      epsilon: h.epsilon,
      ssim: h.ssim,
      processingTimeMs: h.processingTimeMs,
      originalClass: h.originalClass,
      cloakedClass: h.cloakedClass,
      misclassified: h.misclassified,
      status: h.status,
    })),
  ].filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  const totalProcessed = combinedLive.length;
  const successfulCount = combinedLive.filter((r) => r.status === 'completed').length;
  const avgSsim =
    totalProcessed > 0
      ? combinedLive.reduce((acc, r) => acc + r.ssim, 0) / totalProcessed
      : null;
  const avgLatencyMs =
    totalProcessed > 0
      ? combinedLive.reduce((acc, r) => acc + r.processingTimeMs, 0) / totalProcessed
      : null;

  // Live timeline series (strictly from real user runs)
  const timelineData = [...combinedLive]
    .reverse()
    .map((run, idx) => ({
      run: `#${idx + 1}`,
      ssim: Number(run.ssim.toFixed(4)),
      latencySec: Number((run.processingTimeMs / 1000).toFixed(2)),
      epsilon: run.epsilon,
    }));

  // Live prediction outcome counts
  const misclassifiedCount = combinedLive.filter((r) => r.misclassified).length;
  const retainedCount = totalProcessed - misclassifiedCount;
  const liveOutcomeData = [
    { label: 'Class Disrupted', count: misclassifiedCount },
    { label: 'Top-1 Retained', count: retainedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Live User KPI Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Workspace Overview</h2>
          <p className="text-xs text-slate-400 mt-1">
            Live telemetry reflects only images processed by your connected PyTorch backend during
            this session or saved opt-in history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('studio')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#397BFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2B68E8] self-start sm:self-auto whitespace-nowrap"
        >
          Open Cloaking Studio
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="glass-surface rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Processed</span>
            <ImageIcon className="h-4 w-4 text-[#00D4FF]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {totalProcessed}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Live backend runs</p>
        </div>

        <div className="glass-surface rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Successfully Cloaked</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {successfulCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {totalProcessed > 0
              ? `${misclassifiedCount} class shifts observed`
              : 'Awaiting first upload'}
          </p>
        </div>

        <div className="glass-surface rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Average SSIM</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-[#00D4FF] tabular-nums">
            {avgSsim !== null ? avgSsim.toFixed(4) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Live structural similarity</p>
        </div>

        <div className="glass-surface rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Processing Time</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {avgLatencyMs !== null ? `${(avgLatencyMs / 1000).toFixed(2)}s` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {backendStatus === 'connected'
              ? `Device: ${backendHealth?.device.toUpperCase()}`
              : 'Backend offline'}
          </p>
        </div>

        <div className="glass-surface rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Selected AI Model</span>
            <Cpu className="h-4 w-4 text-[#397BFF]" />
          </div>
          <p className="mt-2 text-base font-bold text-white truncate">
            {MODEL_BY_ID[selectedModel].name}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {MODEL_BY_ID[selectedModel].parameters} · {MODEL_BY_ID[selectedModel].weights}
          </p>
        </div>
      </div>

      {/* Live Processing Charts vs Published Research Baseline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Live Session Quality & Latency Chart */}
        <div className="glass-surface rounded-xl p-6 lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                Live Session Image Quality (SSIM) Over Runs
              </h3>
              <p className="text-xs text-slate-400">
                Real-time user statistics · Populates automatically as images are cloaked
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-400">Live User Data</span>
          </div>

          {timelineData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ssimFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="run" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[0.75, 1]} stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#080D1B',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ssim"
                    name="SSIM"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    fill="url(#ssimFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-[#080D1B]/50 p-6 text-center">
              <p className="text-sm font-medium text-slate-300">No live cloaking runs recorded yet</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                This dashboard never displays fabricated user statistics. Process an image in the
                Cloaking Studio to chart your live SSIM and timing telemetry.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="mt-4 rounded-lg border border-slate-700 bg-[#101A2E] px-4 py-2 text-xs font-semibold text-white hover:border-[#397BFF]"
              >
                Process First Photograph
              </button>
            </div>
          )}
        </div>

        {/* Published Research Reference: FGSM vs PGD Comparison */}
        <div className="glass-surface rounded-xl p-6 lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                FGSM vs. PGD Misclassification Rate (%)
              </h3>
              <p className="text-xs text-slate-400">
                Published Benchmark · {REPORTED_BENCHMARK_SUMMARY.unseenImagesCount} unseen Imagenette photos
              </p>
            </div>
            <span className="text-xs font-medium text-[#00D4FF]">Published Research</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={REPORTED_ATTACK_COMPARISON}
                margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
              >
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
                <Bar dataKey="fgsmMisclassification" name="FGSM (%)" fill="#397BFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pgdMisclassification" name="PGD (%)" fill="#00D4FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Live Prediction Shifts & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="glass-surface rounded-xl p-6 lg:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Live Prediction Shifts</h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">{totalProcessed} runs</span>
          </div>
          {totalProcessed > 0 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liveOutcomeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis type="number" allowDecimals={false} stroke="#94A3B8" fontSize={11} />
                  <YAxis type="category" dataKey="label" stroke="#94A3B8" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#080D1B',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Images" fill="#397BFF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500 py-10 text-center">
              Prediction disruption counts appear here after real inference runs complete.
            </p>
          )}
        </div>

        <div className="glass-surface rounded-xl p-6 lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Recent Cloaking Activity</h3>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs text-[#00D4FF] hover:underline"
            >
              View Image History
            </button>
          </div>

          {combinedLive.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 bg-[#080D1B]/40 py-10 text-center text-xs text-slate-400">
              No recent activity yet. Processed runs from your connected backend will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3 font-medium">File</th>
                    <th className="py-2 px-3 font-medium">Model / Attack</th>
                    <th className="py-2 px-3 font-medium">Prediction Shift</th>
                    <th className="py-2 px-3 text-right font-medium">SSIM</th>
                    <th className="py-2 pl-3 text-right font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {combinedLive.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 pr-3 font-medium text-white max-w-[160px] truncate">
                        {item.fileName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {MODEL_BY_ID[item.model]?.name || item.model} · {item.attack}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {item.originalClass} →{' '}
                        <span className={item.misclassified ? 'text-emerald-400' : 'text-slate-400'}>
                          {item.cloakedClass}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#00D4FF] tabular-nums">
                        {item.ssim.toFixed(4)}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono text-slate-400 tabular-nums">
                        {(item.processingTimeMs / 1000).toFixed(2)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
