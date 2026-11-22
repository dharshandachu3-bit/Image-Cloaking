import React, { useCallback, useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface ImageCompareSliderProps {
  originalSrc: string;
  cloakedSrc: string;
  originalLabel?: string;
  cloakedLabel?: string;
  altOriginal?: string;
  altCloaked?: string;
  aspectClassName?: string;
  applyIllustrativePerturbationFilter?: boolean;
}

export const ImageCompareSlider: React.FC<ImageCompareSliderProps> = ({
  originalSrc,
  cloakedSrc,
  originalLabel = 'Original Photograph',
  cloakedLabel = 'Cloaked Photograph',
  altOriginal = 'Original photograph before adversarial perturbation',
  altCloaked = 'Cloaked photograph after adversarial perturbation',
  aspectClassName = 'aspect-[4/3]',
  applyIllustrativePerturbationFilter = false,
}) => {
  const [position, setPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(2, Math.min(98, pct)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPosition((p) => Math.max(2, p - 4));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPosition((p) => Math.min(98, p + 4));
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Compare original and cloaked photographs"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`relative w-full ${aspectClassName} overflow-hidden rounded-xl border border-slate-700/60 bg-[#0B1222] select-none cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#397BFF]`}
    >
      {/* Cloaked Image (Right / Base layer) */}
      <img
        src={cloakedSrc}
        alt={altCloaked}
        referrerPolicy="no-referrer"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain bg-[#080D1B]"
        style={
          applyIllustrativePerturbationFilter
            ? { filter: 'contrast(1.015) saturate(1.02)' }
            : undefined
        }
      />

      {/* Subtle micro-grid optical hint strictly for landing illustrative demo */}
      {applyIllustrativePerturbationFilter && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0, 212, 255, 0.9) 0.6px, transparent 0.6px), radial-gradient(rgba(57, 123, 255, 0.8) 0.6px, transparent 0.6px)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 4px 4px',
          }}
        />
      )}

      {/* Original Image (Left / Clipped layer) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={originalSrc}
          alt={altOriginal}
          referrerPolicy="no-referrer"
          draggable={false}
          className="h-full w-full object-contain bg-[#080D1B]"
        />
      </div>

      {/* Divider line */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#00D4FF]/90 shadow-[0_0_12px_rgba(0,212,255,0.65)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-[#00D4FF]/80 bg-[#080D1B]/95 text-slate-100 shadow-lg">
          <MoveHorizontal className="h-4 w-4 text-[#00D4FF]" />
        </div>
      </div>

      {/* Measured contrast label scrims */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3 text-xs font-medium text-slate-100">
        <span>{originalLabel}</span>
        <span>{cloakedLabel}</span>
      </div>
    </div>
  );
};
