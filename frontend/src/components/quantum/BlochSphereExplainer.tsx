import React, { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Atom, Compass, Layers, Zap } from 'lucide-react';

export const BlochSphereExplainer: React.FC = () => {
  const [testAngle, setTestAngle] = useState<number>(1.57); // ~ pi / 2

  // Qubit state calculation: |psi> = cos(theta/2)|0> + sin(theta/2)|1>
  const alpha = Math.cos(testAngle / 2);
  const beta = Math.sin(testAngle / 2);
  const prob0 = Math.pow(alpha, 2);
  const prob1 = Math.pow(beta, 2);

  // SVG coordinates on sphere projection (circle radius 50)
  const cx = 80;
  const cy = 80;
  const r = 55;
  const stateX = cx + r * Math.sin(testAngle);
  const stateY = cy - r * Math.cos(testAngle);

  return (
    <Card className="glass-panel">
      <CardHeader
        title="Quantum Feature Encoding & Bloch Geometry"
        subtitle="Bridging Classical Features to Quantum Hilbert Space Representations"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Interactive Bloch Visualizer */}
        <div className="flex flex-col items-center p-4 bg-obsidian-950 rounded-xl border border-obsidian-800">
          <svg className="w-48 h-48" viewBox="0 0 160 160">
            {/* Outer sphere */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#202C48" strokeWidth="1.5" />
            <ellipse cx={cx} cy={cy} rx={r} ry={18} fill="none" stroke="#202C48" strokeWidth="1" strokeDasharray="3 3" />
            
            {/* Z axis */}
            <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy + r + 8} stroke="#475569" strokeWidth="1" />
            <text x={cx - 10} y={cy - r - 10} fill="#94A3B8" fontSize="10" fontFamily="monospace">|0⟩</text>
            <text x={cx - 10} y={cy + r + 18} fill="#94A3B8" fontSize="10" fontFamily="monospace">|1⟩</text>

            {/* X axis */}
            <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="#475569" strokeWidth="1" />
            <text x={cx + r + 10} y={cy + 4} fill="#94A3B8" fontSize="9" fontFamily="monospace">|+⟩</text>

            {/* Statevector Arrow */}
            <line x1={cx} y1={cy} x2={stateX} y2={stateY} stroke="#F02F34" strokeWidth="2.5" />
            <circle cx={stateX} cy={stateY} r="4" fill="#F02F34" className="filter drop-shadow-[0_0_8px_#F02F34]" />
            <circle cx={cx} cy={cy} r="2" fill="#94A3B8" />
          </svg>

          {/* Angle Slider */}
          <div className="w-full mt-3">
            <div className="flex justify-between text-xs text-slate-400 font-mono mb-1">
              <span>Input Feature x: 0</span>
              <span className="text-coral-400 font-bold">θ = {testAngle.toFixed(2)} rad</span>
              <span>π ≈ 3.14</span>
            </div>
            <input
              type="range"
              min="0"
              max="3.1415"
              step="0.05"
              value={testAngle}
              onChange={(e) => setTestAngle(parseFloat(e.target.value))}
              className="w-full accent-coral-500 cursor-pointer"
            />
          </div>

          {/* Probabilities Output */}
          <div className="grid grid-cols-2 gap-3 w-full mt-3">
            <div className="p-2 bg-obsidian-900 rounded border border-obsidian-800 text-center">
              <span className="text-[10px] text-slate-400 block font-mono">P(|0⟩) = cos²(θ/2)</span>
              <span className="text-xs font-mono font-bold text-sand-300">{(prob0 * 100).toFixed(1)}%</span>
            </div>
            <div className="p-2 bg-obsidian-900 rounded border border-obsidian-800 text-center">
              <span className="text-[10px] text-slate-400 block font-mono">P(|1⟩) = sin²(θ/2)</span>
              <span className="text-xs font-mono font-bold text-coral-400">{(prob1 * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Conceptual Explanations */}
        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="p-3 bg-obsidian-900/60 rounded-lg border border-obsidian-800">
            <div className="flex items-center gap-2 text-coral-400 font-bold mb-1">
              <Compass className="w-4 h-4 shrink-0" />
              <span>1. Classical-to-Quantum Mapping:</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Each normalized feature value <code className="text-sand-300 font-mono">x_i ∈ [0, π]</code> parameterizes single-qubit rotation gates <code className="text-coral-400 font-mono">Rz(2x_i)</code> or <code className="text-quantum-cyan font-mono">Ry(x_i)</code>, positioning the quantum state on the Bloch Sphere.
            </p>
          </div>

          <div className="p-3 bg-obsidian-900/60 rounded-lg border border-obsidian-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
              <Layers className="w-4 h-4 shrink-0" />
              <span>2. Multi-Qubit Entanglement:</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              In <code className="text-sand-300 font-mono">ZZFeatureMap</code>, pairwise features interact via <code className="text-indigo-400 font-mono">exp(i·2(π-x_i)(π-x_j)·Z_i·Z_j)</code>. This entangles qubits, mapping classical data into an exponentially large <code className="text-quantum-cyan font-mono">2^n</code>-dimensional Hilbert space.
            </p>
          </div>

          <div className="p-3 bg-obsidian-900/60 rounded-lg border border-obsidian-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <Zap className="w-4 h-4 shrink-0" />
              <span>3. Quantum Kernel Trick:</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Instead of explicitly constructing vectors in 2^n dimensions, the quantum computer evaluates the transition overlap fidelity <code className="text-emerald-400 font-mono">K(x, y) = |⟨ψ(y)|ψ(x)⟩|²</code>. An SVM classifier then finds the optimal maximum-margin separating hyperplane.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
