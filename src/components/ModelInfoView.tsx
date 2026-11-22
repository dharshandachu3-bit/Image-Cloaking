import React from 'react';
import { ArrowRight, CheckCircle2, Cpu, Layers } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import type { ModelId } from '../types';

interface ModelInfoViewProps {
  onSelectForStudio: () => void;
}

export const ModelInfoView: React.FC<ModelInfoViewProps> = ({ onSelectForStudio }) => {
  const { backendModels, backendStatus, selectedModel, setSelectedModel } = useApp();

  const handleChoose = (id: ModelId) => {
    setSelectedModel(id);
    onSelectForStudio();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Pretrained AI Model Catalog</h2>
        <p className="mt-1 text-xs text-slate-400 max-w-2xl">
          All three vision backbones use official Torchvision ImageNet-1K pretrained weights,
          differentiable ImageNet normalization, and PyTorch forward hooks for real 7×7 spatial
          activation map extraction.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {backendModels.map((model) => {
          const isSelected = selectedModel === model.id;
          return (
            <div
              key={model.id}
              className={`glass-surface rounded-xl p-6 flex flex-col justify-between ${
                isSelected ? 'ring-1 ring-[#397BFF]' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{model.architecture}</span>
                  <span className="font-mono text-[#00D4FF] tabular-nums">{model.parameters}</span>
                </div>

                <h3 className="mt-3 font-display text-xl font-bold text-white">{model.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{model.description}</p>

                <dl className="mt-6 divide-y divide-slate-800/80 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-slate-500">Pretrained Weights</dt>
                    <dd className="font-mono text-slate-200">{model.weights}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-slate-500">Working Tensor Size</dt>
                    <dd className="font-mono text-slate-200">{model.input_size}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-slate-500 shrink-0">Activation Hook</dt>
                    <dd className="font-mono text-slate-200 text-right">{model.activation_layer}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-slate-500">Backend Cache Status</dt>
                    <dd className="font-medium">
                      {backendStatus !== 'connected' ? (
                        <span className="text-slate-500">Backend Offline</span>
                      ) : model.loaded ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Cached in RAM
                        </span>
                      ) : (
                        <span className="text-slate-300">Lazy Load Ready</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                type="button"
                onClick={() => handleChoose(model.id)}
                className={`mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-[#397BFF] text-white hover:bg-[#2B68E8]'
                    : 'border border-slate-700 bg-[#080D1B] text-slate-200 hover:border-[#397BFF] hover:text-white'
                }`}
              >
                {isSelected ? 'Selected — Open Studio' : `Use ${model.name} in Studio`}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Preprocessing & Normalization Spec */}
      <div className="glass-surface rounded-xl p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4FF]">
            <Cpu className="h-4 w-4" />
            <span>Differentiable ImageNet Normalization</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Rather than perturbing in normalized space where bounds distort across RGB channels, the
            PyTorch engine keeps the 224×224 working tensor in pixel range [0, 1] and applies
            differentiable channel normalization inside the forward graph:
          </p>
          <pre className="mt-3 rounded-lg border border-slate-800 bg-[#080D1B] p-3 font-mono text-[11px] text-slate-300 overflow-x-auto">
            mean = (0.485, 0.456, 0.406) · std = (0.229, 0.224, 0.225)
          </pre>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4FF]">
            <Layers className="h-4 w-4" />
            <span>Activation Map Extraction Hooks</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            For CNNs (ResNet-50 and MobileNetV3-Large), channel-averaged ReLU feature maps are
            extracted from the final 7×7 spatial stage. For Vision Transformer (ViT-B/16), the 196
            non-CLS patch tokens from <code className="font-mono text-slate-200">encoder.ln</code>{' '}
            are reshaped to 14×14 and adaptively pooled to 7×7.
          </p>
        </div>
      </div>
    </div>
  );
};
