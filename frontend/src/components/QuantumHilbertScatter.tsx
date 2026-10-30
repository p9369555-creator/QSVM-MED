// File: frontend/src/components/QuantumHilbertScatter.tsx
// Quantum Hilbert state space schematic projection in light teal design system.
// Retitled "Schematic, not a true projection", without synthetic tumor/normal clusters.

import React from 'react';

interface QuantumHilbertScatterProps {
  pcaAngles?: number[];
  isLoading?: boolean;
}

export const QuantumHilbertScatter: React.FC<QuantumHilbertScatterProps> = ({
  pcaAngles = [],
  isLoading = false,
}) => {
  // Map first two rotation angles [-pi, pi] to SVG space [15, 85]
  let stateX = 50;
  let stateY = 50;
  const hasAngles = pcaAngles.length >= 2;

  if (hasAngles) {
    const a0 = pcaAngles[0];
    const a1 = pcaAngles[1];
    stateX = Math.max(15, Math.min(85, 50 + (a0 / Math.PI) * 35));
    stateY = Math.max(15, Math.min(85, 50 - (a1 / Math.PI) * 35));
  }

  return (
    <div className="bg-white border border-[#99F6E4] rounded-xl p-5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <div>
          <h3 className="text-sm font-semibold text-[#134E4A]">
            Quantum Hilbert State Space (256-D)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono block">
            Schematic, not a true projection
          </span>
        </div>
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]">
          dim = 256
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-44 bg-[#F8FAFC] border border-[#99F6E4]/70 rounded-lg overflow-hidden flex items-center justify-center select-none">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full select-none"
          aria-label="Quantum Hilbert State Space 2D Schematic"
        >
          {/* Subtle Background Coordinate Grid */}
          <defs>
            <pattern id="qsvmGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#CCFBF1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#qsvmGrid)" />

          {/* Central Coordinate Axes */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="#99F6E4" strokeWidth="0.8" strokeDasharray="1,1" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="#99F6E4" strokeWidth="0.8" strokeDasharray="1,1" />

          {/* Theoretical Quantum Decision Hyperplane Line */}
          <line
            x1="12"
            y1="82"
            x2="88"
            y2="18"
            stroke="#0F766E"
            strokeWidth="1.2"
            strokeDasharray="3,3"
            opacity="0.6"
          />

          {/* Axis Labels */}
          <text x="92" y="47" fill="#64748B" fontSize="3.5" fontFamily="monospace">
            Re
          </text>
          <text x="52" y="8" fill="#64748B" fontSize="3.5" fontFamily="monospace">
            Im
          </text>

          {/* Statevector Point |ψ⟩ if angles available */}
          {hasAngles && !isLoading && (
            <g transform={`translate(${stateX}, ${stateY})`}>
              {/* Outer pulsing ring */}
              <circle
                cx="0"
                cy="0"
                r="7"
                fill="none"
                stroke="#0F766E"
                strokeWidth="0.8"
                strokeDasharray="2,1.5"
                opacity="0.8"
              />
              <circle cx="0" cy="0" r="3.2" fill="#0F766E" />
              <circle cx="0" cy="0" r="1.2" fill="#FFFFFF" />

              {/* Label */}
              <text
                x="8"
                y="1.5"
                fill="#134E4A"
                fontSize="4"
                fontWeight="bold"
                fontFamily="monospace"
              >
                State |ψ⟩
              </text>
              <text
                x="8"
                y="5.5"
                fill="#0F766E"
                fontSize="3"
                fontFamily="monospace"
              >
                θ₀:{pcaAngles[0] >= 0 ? `+${pcaAngles[0].toFixed(2)}` : pcaAngles[0].toFixed(2)}
              </text>
            </g>
          )}

          {!hasAngles && !isLoading && (
            <text
              x="50"
              y="52"
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="3.8"
              fontFamily="sans-serif"
            >
              Awaiting scan inference...
            </text>
          )}
        </svg>

        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center font-mono text-xs text-[#0F766E]">
            Evaluating 8-qubit quantum kernel...
          </div>
        )}
      </div>

      {/* Honest Schematic Caption */}
      <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
        Schematic 2D projection of the 8-qubit ZZFeatureMap statevector |ψ(x)⟩ across the 256-dimensional complex Hilbert feature space.
      </p>
    </div>
  );
};
