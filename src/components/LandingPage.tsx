import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Cpu,
  EyeOff,
  Layers,
  Lock,
  Shield,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  GENERATED_ASSETS,
  MODEL_CATALOG,
  REPORTED_BENCHMARK_SUMMARY,
} from '../data/researchData';
import { ImageCompareSlider } from './ImageCompareSlider';

interface LandingPageProps {
  onStartCloaking: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartCloaking,
  onOpenAuth,
  isAuthenticated,
}) => {
  const [previewSample, setPreviewSample] = useState<'camera' | 'architecture'>('camera');

  const activeSampleImage =
    previewSample === 'camera'
      ? GENERATED_ASSETS.sampleCamera
      : GENERATED_ASSETS.sampleArchitecture;

  return (
    <div className="min-h-screen bg-[#080D1B] text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080D1B]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            CloakVision
          </a>

          {/* Zone 2: 4 Concise Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            <a
              href="#technology"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
            <a
              href="#attacks"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              FGSM &amp; PGD
            </a>
            <a
              href="#models"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Models
            </a>
            <a
              href="#research"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Research Findings
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={onStartCloaking}
              className="inline-flex items-center gap-2 rounded-lg bg-[#397BFF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2B68E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] whitespace-nowrap shrink-0"
            >
              {isAuthenticated ? 'Open Workspace' : 'Start Cloaking'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-800/70">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[620px] rounded-full bg-[#397BFF]/10 blur-[130px]"
          />
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
            <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
              <div className="flex flex-col justify-center lg:col-span-6">
                <p className="text-xs font-medium tracking-wide text-[#00D4FF]">
                  Artificial Intelligence &amp; Machine Learning Research Platform
                </p>

                <h1 className="mt-4 font-display text-[clamp(2.25rem,4vw,3.65rem)] font-bold leading-[1.08] tracking-tight text-white">
                  Privacy-Preserving Image Cloaking
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300">
                  Protect your photographs from automated AI image classification using
                  resolution-decoupled adversarial perturbations. Built on PyTorch pretrained
                  backbones with real gradient optimization and exact pixel-dimension preservation.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={onStartCloaking}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#397BFF] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#2B68E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] whitespace-nowrap shrink-0"
                  >
                    Start Cloaking
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <a
                    href="#technology"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#101A2E]/80 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
                  >
                    Explore Technology
                  </a>

                  {!isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="text-sm font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline px-2 py-2 whitespace-nowrap shrink-0"
                    >
                      Sign In
                    </button>
                  )}
                </div>

                {/* Unboxed inline metadata — Zero-Pill Discipline */}
                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
                  <span>FGSM &amp; 10-Step PGD</span>
                  <span aria-hidden="true">·</span>
                  <span>ResNet-50, MobileNetV3-Large, ViT-B/16</span>
                  <span aria-hidden="true">·</span>
                  <span>Zero Resizing or Cropping</span>
                </div>
              </div>

              {/* Hero Optical Protection Visual */}
              <div className="lg:col-span-6 flex items-stretch">
                <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#101A2E] glow-border">
                  <img
                    src={GENERATED_ASSETS.heroShield}
                    alt="Optical prism refracting light through an adversarial perturbation lattice"
                    referrerPolicy="no-referrer"
                    className="h-full min-h-[300px] w-full object-cover"
                  />
                  {/* Subtle animated optical scan line */}
                  <motion.div
                    aria-hidden="true"
                    initial={{ y: '-10%' }}
                    animate={{ y: '110%' }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-[#00D4FF]/15 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080D1B]/95 via-[#080D1B]/65 to-transparent p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-white">Resolution-Decoupled Perturbation</p>
                        <p className="mt-0.5 text-slate-300">
                          224×224 gradient synthesis upsampled onto native photographic resolution
                        </p>
                      </div>
                      <span className="font-mono tabular-nums text-[#00D4FF]">
                        L∞ Budget ε ≤ 0.125
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width Empirical Evidence Strip */}
            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-800/90 bg-slate-800/80 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-[#101A2E]/90 p-5">
                <p className="text-xs text-slate-400">Benchmark Evaluation Corpus</p>
                <p className="mt-1.5 font-mono text-2xl font-semibold text-white tabular-nums">
                  {REPORTED_BENCHMARK_SUMMARY.unseenImagesCount} Images
                </p>
                <p className="mt-1 text-xs text-slate-400">Unseen Imagenette test photographs</p>
              </div>
              <div className="bg-[#101A2E]/90 p-5">
                <p className="text-xs text-slate-400">Reported Mean SSIM Range</p>
                <p className="mt-1.5 font-mono text-2xl font-semibold text-[#00D4FF] tabular-nums">
                  {REPORTED_BENCHMARK_SUMMARY.meanSsimRange}
                </p>
                <p className="mt-1 text-xs text-slate-400">Structural fidelity preserved across runs</p>
              </div>
              <div className="bg-[#101A2E]/90 p-5">
                <p className="text-xs text-slate-400">Reported Misclassification</p>
                <p className="mt-1.5 font-mono text-2xl font-semibold text-white tabular-nums">
                  {REPORTED_BENCHMARK_SUMMARY.literatureBudgetMisclassificationRange}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  At literature budget ({REPORTED_BENCHMARK_SUMMARY.defaultSettingMisclassificationRange} default)
                </p>
              </div>
              <div className="bg-[#101A2E]/90 p-5">
                <p className="text-xs text-slate-400">Cross-Model Transferability</p>
                <p className="mt-1.5 font-mono text-2xl font-semibold text-white tabular-nums">
                  {REPORTED_BENCHMARK_SUMMARY.crossModelTransferabilityPercent}%
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Measured across {REPORTED_BENCHMARK_SUMMARY.crossModelExperimentsCount} experiments
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Visual Demonstration: Original vs Cloaked */}
        <section id="technology" className="border-b border-slate-800/70 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <p className="text-xs font-medium text-[#00D4FF]">Visual Fidelity Inspection</p>
                  <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
                    Imperceptible to Human Vision, Disruptive to Classifier Gradients
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  Deep neural classifiers rely on high-dimensional texture and gradient decision
                  boundaries that diverge from human visual perception. By computing a bounded L∞
                  perturbation δ aligned with the sign of the classification loss gradient, we nudge
                  an image across model decision boundaries while keeping visual distortion subtle.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewSample('camera')}
                    className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                      previewSample === 'camera'
                        ? 'bg-[#397BFF] text-white'
                        : 'border border-slate-700 bg-[#101A2E] text-slate-300 hover:text-white'
                    }`}
                  >
                    Sample 1: Optical Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSample('architecture')}
                    className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                      previewSample === 'architecture'
                        ? 'bg-[#397BFF] text-white'
                        : 'border border-slate-700 bg-[#101A2E] text-slate-300 hover:text-white'
                    }`}
                  >
                    Sample 2: Cathedral Facade
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-5 text-xs leading-relaxed text-slate-400">
                  <p className="font-semibold text-slate-200">Illustrative Preview Notice</p>
                  <p className="mt-1">
                    Drag the divider to inspect how resolution-decoupled cloaking retains natural
                    sharpness and native aspect ratio. To execute real PyTorch inference, SSIM
                    scoring, and 7×7 activation extraction on your own photograph, launch the
                    Cloaking Studio.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7">
                <ImageCompareSlider
                  originalSrc={activeSampleImage}
                  cloakedSrc={activeSampleImage}
                  originalLabel="Original High-Resolution Input"
                  cloakedLabel="Illustrative Cloaked Preview (Native W × H)"
                  applyIllustrativePerturbationFilter
                />
              </div>
            </div>
          </div>
        </section>

        {/* How the System Works — Editorial Numbered Architecture */}
        <section className="border-b border-slate-800/70 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#00D4FF]">Core Technical Contribution</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
                How Resolution-Decoupled Cloaking Works
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Standard adversarial scripts resize and crop user photographs down to 224×224 pixels,
                destroying photographic detail. Our pipeline decouples gradient computation from
                final image export.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: '01. Preserve Original Geometry',
                  icon: Layers,
                  body: 'The uploaded PNG, JPEG, or WebP photograph is validated in RAM and held at its exact native width and height without cropping.',
                },
                {
                  step: '02. 224×224 Gradient Synthesis',
                  icon: Cpu,
                  body: 'A 224×224 working representation is normalized for ImageNet and passed through the chosen pretrained PyTorch classifier to compute loss gradients.',
                },
                {
                  step: '03. Upsample & Composite Delta',
                  icon: Sliders,
                  body: 'The bounded perturbation tensor δ is bilinearly resized to the original image dimensions, added pixel-wise to the clean photograph, and clipped to [0, 1].',
                },
                {
                  step: '04. Re-Evaluate & Export PNG',
                  icon: EyeOff,
                  body: 'The cloaked image is reclassified to measure real confidence drop, SSIM, and 7×7 activation shifts, then exported losslessly at its original resolution.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="glass-surface-subtle rounded-xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <Icon className="h-5 w-5 text-[#00D4FF]" />
                      <h3 className="mt-4 font-display text-base font-semibold text-white">
                        {item.step}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FGSM vs PGD Mathematical Comparison */}
        <section id="attacks" className="border-b border-slate-800/70 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#00D4FF]">Adversarial Optimization Methods</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
                Single-Step FGSM vs. Iterative PGD
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="glass-surface rounded-xl p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold text-white">
                    FGSM — Fast Gradient Sign Method
                  </h3>
                  <span className="font-mono text-xs text-[#00D4FF]">1 Gradient Pass</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Applies a single linear perturbation step in the direction of the gradient sign of
                  the cross-entropy loss with respect to the input pixels.
                </p>
                <div className="mt-5 rounded-lg border border-slate-800 bg-[#080D1B] p-4 font-mono text-xs text-slate-200 overflow-x-auto">
                  x_adv = clip(x + ε · sign(∇_x J(θ, norm(x), y)), 0, 1)
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-800 pt-5 text-xs">
                  <div>
                    <p className="text-slate-400">Primary Advantage</p>
                    <p className="mt-1 font-medium text-slate-200">
                      Rapid execution suitable for real-time interactive cloaking
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Perturbation Budget</p>
                    <p className="mt-1 font-mono text-slate-200 tabular-nums">
                      ε = strength × max_ε
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-surface rounded-xl p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold text-white">
                    PGD — Projected Gradient Descent
                  </h3>
                  <span className="font-mono text-xs text-[#397BFF]">10 Iterations · α = ε / 4</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Iteratively refines the perturbation over 10 gradient updates using step size α =
                  ε / 4, projecting the cumulative delta back onto the L∞ ε-ball after every step.
                </p>
                <div className="mt-5 rounded-lg border border-slate-800 bg-[#080D1B] p-4 font-mono text-xs text-slate-200 overflow-x-auto">
                  x^(t+1) = Π_(x+S) (x^(t) + (ε/4) · sign(∇_x J(θ, norm(x^(t)), y)))
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-800 pt-5 text-xs">
                  <div>
                    <p className="text-slate-400">Primary Advantage</p>
                    <p className="mt-1 font-medium text-slate-200">
                      Stronger non-linear optimization against deep decision boundaries
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Computational Trade-Off</p>
                    <p className="mt-1 font-mono text-slate-200 tabular-nums">
                      ~10× forward/backward passes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Pretrained AI Models */}
        <section id="models" className="border-b border-slate-800/70 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#00D4FF]">Pretrained Torchvision Backbones</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
                Three Distinct Vision Architectures
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                Evaluate white-box cloaking and cross-architecture transferability across residual
                convolutions, depthwise mobile networks, and global self-attention transformers.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {MODEL_CATALOG.map((model) => (
                <div key={model.id} className="glass-surface rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span>{model.architecture}</span>
                      <span className="font-mono text-[#00D4FF] tabular-nums">{model.parameters}</span>
                    </div>
                    <h3 className="mt-3 font-display text-xl font-bold text-white">{model.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      {model.description}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">Weights</span>
                      <span className="text-slate-300">{model.weights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">Working Input</span>
                      <span className="text-slate-300">{model.input_size}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-sans text-slate-500 shrink-0">Activation Hook</span>
                      <span className="text-slate-300 truncate">{model.activation_layer}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Research Findings, Privacy & Honest Scientific Scope */}
        <section id="research" className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="glass-surface rounded-xl p-8 lg:col-span-7">
                <div className="flex items-center gap-2 text-xs font-medium text-[#00D4FF]">
                  <Sparkles className="h-4 w-4" />
                  <span>Published Experimental Context &amp; Limitations</span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-bold text-white">
                  Transparent Scientific Reporting
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Our academic evaluation tested resolution-decoupled adversarial perturbations on{' '}
                  <span className="font-mono text-white">240</span> unseen Imagenette photographs
                  and <span className="font-mono text-white">720</span> cross-model transferability
                  runs. These empirical results represent prior benchmark observations—not guaranteed
                  outcomes for every uploaded photograph.
                </p>

                <dl className="mt-6 divide-y divide-slate-800 text-sm">
                  <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <dt className="text-slate-400">Default Setting Misclassification</dt>
                    <dd className="font-mono text-white tabular-nums">
                      {REPORTED_BENCHMARK_SUMMARY.defaultSettingMisclassificationRange}
                    </dd>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <dt className="text-slate-400">Literature-Typical Perturbation Budget</dt>
                    <dd className="font-mono text-white tabular-nums">
                      {REPORTED_BENCHMARK_SUMMARY.literatureBudgetMisclassificationRange}
                    </dd>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <dt className="text-slate-400">Mean Structural Similarity (SSIM)</dt>
                    <dd className="font-mono text-[#00D4FF] tabular-nums">
                      {REPORTED_BENCHMARK_SUMMARY.meanSsimRange}
                    </dd>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <dt className="text-slate-400">Cross-Model Transferability (720 runs)</dt>
                    <dd className="font-mono text-white tabular-nums">
                      {REPORTED_BENCHMARK_SUMMARY.crossModelTransferabilityPercent}%
                    </dd>
                  </div>
                  <div className="py-3 space-y-1">
                    <dt className="text-slate-400">JPEG Compression &amp; Facial Recognition Scope</dt>
                    <dd className="text-xs leading-relaxed text-slate-300">
                      {REPORTED_BENCHMARK_SUMMARY.jpegFinding}{' '}
                      {REPORTED_BENCHMARK_SUMMARY.faceRecognitionFinding}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="glass-surface rounded-xl p-8 lg:col-span-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                    <Lock className="h-4 w-4" />
                    <span>Privacy &amp; Security Architecture</span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-bold text-white">
                    Ephemeral Processing by Default
                  </h2>
                  <ul className="mt-5 space-y-4 text-sm text-slate-300">
                    <li className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#397BFF]" />
                      <span>
                        Uploaded photographs are decoded and perturbed strictly in RAM buffers with
                        immediate garbage collection—zero server-side disk retention.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#397BFF]" />
                      <span>
                        Image history saving is disabled by default and requires your explicit
                        opt-in consent per upload or in Settings.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#397BFF]" />
                      <span>
                        Strict 10 MB upload cap, Pillow container verification, and DecompressionBomb
                        dimension guards protect backend execution.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 border-t border-slate-800 pt-6">
                  <button
                    type="button"
                    onClick={onStartCloaking}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#397BFF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2B68E8]"
                  >
                    Launch Cloaking Studio
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060A15] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-sm font-bold text-white">
              Privacy-Preserving Image Cloaking
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Academic AI &amp; ML Engineering Project · Resolution-Decoupled Adversarial Perturbations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <a href="#technology" className="hover:text-white transition-colors">
              Methodology
            </a>
            <a href="#attacks" className="hover:text-white transition-colors">
              FGSM &amp; PGD
            </a>
            <a href="#models" className="hover:text-white transition-colors">
              Pretrained Models
            </a>
            <button
              type="button"
              onClick={onStartCloaking}
              className="text-[#00D4FF] hover:underline"
            >
              Open Studio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
