import React, { useState } from 'react';
import { KernelPreview } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

interface KernelHeatmapProps {
  kernelData: KernelPreview | null;
  matrixSample?: number[][];
  title?: string;
  subtitle?: string;
}

export const KernelHeatmap: React.FC<KernelHeatmapProps> = ({
  kernelData,
  matrixSample,
  title = "Quantum Fidelity Kernel Matrix Heatmap",
  subtitle = "Pairwise Quantum State Overlaps K(x_i, x_j) = |⟨ψ(x_j)|ψ(x_i)⟩|²"
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number; val: number } | null>(null);

  const matrix = kernelData?.kernel_matrix || matrixSample || [];
  const dim = matrix.length;

  // Color mapping from deep obsidian navy (0.0) to vivid coral (#F02F34) (1.0)
  const getFidelityColor = (val: number) => {
    // val is in [0, 1]
    const clamped = Math.max(0, Math.min(1, val));
    // Interpolate: 
    // at 0: rgb(15, 23, 42)
    // at 1: rgb(240, 47, 52)
    const r = Math.round(15 + clamped * (240 - 15));
    const g = Math.round(23 + clamped * (47 - 23));
    const b = Math.round(42 + clamped * (52 - 42));
    const opacity = 0.25 + clamped * 0.75;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  if (dim === 0) {
    return (
      <Card>
        <CardHeader title={title} subtitle={subtitle} />
        <div className="py-12 text-center text-slate-500 font-mono text-sm">
          No quantum kernel matrix computed yet. Configure parameters and run computation.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          kernelData && (
            <div className="flex items-center gap-2">
              <Badge variant={kernelData.is_symmetric ? "success" : "danger"}>
                {kernelData.is_symmetric ? "Symmetric: Yes (K = Kᵀ)" : "Asymmetric"}
              </Badge>
              <Badge variant={kernelData.is_positive_semidefinite ? "success" : "warning"}>
                {kernelData.is_positive_semidefinite ? "PSD: Verified (λ ≥ 0)" : "PSD Warning"}
              </Badge>
            </div>
          )
        }
      />

      {/* Metrics Row */}
      {kernelData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800 flex items-center gap-3">
            <Clock className="w-5 h-5 text-coral-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Compute Latency</span>
              <span className="text-sm font-mono font-bold text-slate-200">{kernelData.compute_time_seconds}s</span>
            </div>
          </div>
          <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Diagonal Overlap</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{kernelData.diagonal_mean.toFixed(2)} (1.00)</span>
            </div>
          </div>
          <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Matrix Dimension</span>
            <span className="text-sm font-mono font-bold text-sand-300">{dim} × {dim} samples</span>
          </div>
          <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Fidelity Range</span>
            <span className="text-sm font-mono font-bold text-quantum-cyan">
              [{kernelData.min_value.toFixed(3)}, {kernelData.max_value.toFixed(3)}]
            </span>
          </div>
        </div>
      )}

      {/* Interactive Matrix Grid */}
      <div className="flex flex-col items-center justify-center p-4 bg-obsidian-950 rounded-xl border border-obsidian-800 overflow-x-auto">
        <div className="inline-block">
          {/* Column Indices */}
          <div className="flex pl-8 mb-1">
            {matrix.map((_, colIdx) => (
              <div key={colIdx} className="w-8 text-center font-mono text-[10px] text-slate-500">
                x_{colIdx}
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          {matrix.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center">
              {/* Row Index */}
              <div className="w-8 pr-2 text-right font-mono text-[10px] text-slate-500">
                x_{rIdx}
              </div>

              {/* Cells */}
              <div className="flex gap-[2px] mb-[2px]">
                {row.map((val, cIdx) => (
                  <div
                    key={cIdx}
                    onMouseEnter={() => setHoveredCell({ i: rIdx, j: cIdx, val })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ backgroundColor: getFidelityColor(val) }}
                    className="w-8 h-8 rounded-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-125 hover:z-20 border border-black/30 shadow-inner"
                  >
                    <span className="text-[9px] font-mono font-semibold text-white drop-shadow">
                      {val.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Heatmap Legend */}
        <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
          <span>Orthogonal (0.0)</span>
          <div className="h-3 w-40 rounded-full bg-gradient-to-r from-slate-900 via-rose-900 to-coral-500 border border-obsidian-700" />
          <span>Identical / Max Overlap (1.0)</span>
        </div>

        {/* Inspection Tooltip pill */}
        <div className="mt-3 font-mono text-xs text-sand-300">
          {hoveredCell ? (
            <span>
              Sample Pair (x_{hoveredCell.i}, x_{hoveredCell.j}) ➜ Quantum Fidelity = <strong className="text-coral-400 text-sm">{hoveredCell.val.toFixed(4)}</strong>
            </span>
          ) : (
            <span className="text-slate-500">Hover over any matrix cell to inspect quantum fidelity overlap.</span>
          )}
        </div>
      </div>
    </Card>
  );
};
