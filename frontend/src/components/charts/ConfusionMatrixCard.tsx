import React from 'react';
import { Card, CardHeader } from '../ui/Card';

interface ConfusionMatrixCardProps {
  title: string;
  matrix: number[][];
  classes: string[];
  colorScheme?: 'coral' | 'cyan';
}

export const ConfusionMatrixCard: React.FC<ConfusionMatrixCardProps> = ({
  title,
  matrix,
  classes,
  colorScheme = 'coral'
}) => {
  if (!matrix || matrix.length === 0) {
    return (
      <Card>
        <CardHeader title={title} />
        <div className="py-8 text-center text-slate-500 font-mono text-xs">No confusion matrix data available.</div>
      </Card>
    );
  }

  // Calculate total samples
  const total = matrix.flat().reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader title={title} subtitle="Rows: True Classes • Columns: Predicted Classes" />

      <div className="flex flex-col items-center justify-center p-3">
        {/* Column Headers (Predicted) */}
        <div className="flex items-center mb-1">
          <div className="w-24 text-right pr-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            True \ Pred
          </div>
          <div className="flex gap-2">
            {classes.map((cls, idx) => (
              <div key={idx} className="w-24 text-center font-mono text-xs font-bold text-slate-300 truncate px-1">
                {cls}
              </div>
            ))}
          </div>
        </div>

        {/* Matrix Rows */}
        {matrix.map((row, rIdx) => (
          <div key={rIdx} className="flex items-center mb-2">
            {/* Row Label (True) */}
            <div className="w-24 text-right pr-3 font-mono text-xs font-bold text-slate-300 truncate">
              {classes[rIdx] || `Class ${rIdx}`}
            </div>

            {/* Matrix Cells */}
            <div className="flex gap-2">
              {row.map((val, cIdx) => {
                const isDiagonal = rIdx === cIdx;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';

                let bgClass = "bg-obsidian-900 border-obsidian-800 text-slate-400";
                if (isDiagonal) {
                  bgClass = colorScheme === 'coral'
                    ? "bg-coral-500/20 border-coral-500/40 text-coral-300"
                    : "bg-quantum-cyan/20 border-quantum-cyan/40 text-quantum-cyan";
                } else if (val > 0) {
                  bgClass = "bg-rose-950/40 border-rose-900/40 text-rose-400";
                }

                return (
                  <div
                    key={cIdx}
                    className={`w-24 h-16 rounded-lg border flex flex-col items-center justify-center transition-all ${bgClass}`}
                  >
                    <span className="font-mono text-lg font-bold">{val}</span>
                    <span className="text-[10px] opacity-70 font-mono">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
