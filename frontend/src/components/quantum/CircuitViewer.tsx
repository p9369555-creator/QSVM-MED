import React, { useState } from 'react';
import { CircuitPreview } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Copy, Check, Eye, Code, Terminal } from 'lucide-react';

interface CircuitViewerProps {
  preview: CircuitPreview;
  onRefresh?: () => void;
}

export const CircuitViewer: React.FC<CircuitViewerProps> = ({ preview }) => {
  const [viewMode, setViewMode] = useState<'visual' | 'ascii' | 'qasm'>('visual');
  const [copied, setCopied] = useState(false);
  const [hoveredGate, setHoveredGate] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Quantum Circuit Architecture"
        subtitle={`Feature Map: ${preview.feature_map_type} • ${preview.num_qubits} Qubits • Depth: ${preview.circuit_depth}`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-obsidian-900 border border-obsidian-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'visual' ? 'bg-coral-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Visual
              </button>
              <button
                onClick={() => setViewMode('ascii')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'ascii' ? 'bg-coral-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> ASCII
              </button>
              <button
                onClick={() => setViewMode('qasm')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'qasm' ? 'bg-coral-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> OpenQASM
              </button>
            </div>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Gates</span>
          <span className="text-xl font-mono font-bold text-coral-400">{preview.gate_count}</span>
        </div>
        <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Hilbert Dimension</span>
          <span className="text-xl font-mono font-bold text-sand-300">2^{preview.num_qubits} = {Math.pow(2, preview.num_qubits)}</span>
        </div>
        <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Single-Qubit Rotations</span>
          <span className="text-xl font-mono font-bold text-quantum-cyan">{preview.gates_breakdown?.['Rz'] || 0}</span>
        </div>
        <div className="p-3 bg-obsidian-900/80 rounded-lg border border-obsidian-800">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Entangling CNOTs</span>
          <span className="text-xl font-mono font-bold text-indigo-400">{preview.gates_breakdown?.['CX'] || 0}</span>
        </div>
      </div>

      {/* Viewport */}
      {viewMode === 'visual' && (
        <div className="p-5 bg-obsidian-950 rounded-xl border border-obsidian-800 overflow-x-auto min-h-[220px]">
          <div className="inline-flex flex-col gap-8 min-w-full">
            {Array.from({ length: preview.num_qubits }).map((_, qIdx) => (
              <div key={qIdx} className="flex items-center gap-4 relative">
                {/* Qubit Label */}
                <div className="w-16 flex items-center justify-between font-mono text-xs font-bold text-sand-300 pr-2">
                  <span>|0⟩</span>
                  <span className="text-slate-400">q_{qIdx}</span>
                </div>

                {/* Wire & Gate Line */}
                <div className="flex-1 flex items-center relative py-4">
                  {/* Background wire line */}
                  <div className="absolute inset-x-0 h-[2px] bg-obsidian-700 top-1/2 -translate-y-1/2 z-0" />

                  {/* Gates on this wire */}
                  <div className="flex items-center gap-6 z-10 px-4">
                    {/* Initial H gate */}
                    <div
                      onMouseEnter={() => setHoveredGate(`Hadamard on qubit ${qIdx}: (|0⟩+|1⟩)/√2`)}
                      onMouseLeave={() => setHoveredGate(null)}
                      className="w-10 h-10 rounded-lg bg-obsidian-800 border border-quantum-cyan/50 text-quantum-cyan font-bold font-mono text-sm flex items-center justify-center shadow-md cursor-pointer hover:scale-110 hover:border-quantum-cyan transition-all"
                    >
                      H
                    </div>

                    {/* Repetitions */}
                    {Array.from({ length: preview.circuit_depth }).map((_, rIdx) => (
                      <React.Fragment key={rIdx}>
                        {/* Rz gate */}
                        <div
                          onMouseEnter={() => setHoveredGate(`Repetition ${rIdx+1}: Rz(2·x_${qIdx}) phase shift on qubit ${qIdx}`)}
                          onMouseLeave={() => setHoveredGate(null)}
                          className="px-3 h-10 rounded-lg bg-coral-500/15 border border-coral-500/60 text-coral-400 font-bold font-mono text-xs flex items-center justify-center shadow-md cursor-pointer hover:scale-105 hover:bg-coral-500/30 transition-all"
                        >
                          Rz(x_{qIdx})
                        </div>

                        {/* Entanglement representation */}
                        {preview.feature_map_type !== 'ZFeatureMap' && preview.num_qubits > 1 && (
                          <div className="flex items-center gap-2">
                            {qIdx === 0 && (
                              <div
                                onMouseEnter={() => setHoveredGate(`CNOT Entangler: Control q_0, Target q_1 with phase rotation exp(i·ZZ)`)}
                                onMouseLeave={() => setHoveredGate(null)}
                                className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-cyan-glow cursor-pointer"
                              >
                                ●
                              </div>
                            )}
                            {qIdx === 1 && (
                              <div
                                onMouseEnter={() => setHoveredGate(`ZZ Interaction target on q_1: exp(i·2(π-x0)(π-x1)·Z0Z1)`)}
                                onMouseLeave={() => setHoveredGate(null)}
                                className="px-2.5 h-9 rounded-lg bg-indigo-950 border border-indigo-400 text-indigo-300 font-mono text-xs flex items-center justify-center cursor-pointer shadow-md"
                              >
                                ZZ(x₀,x₁)
                              </div>
                            )}
                            {qIdx > 1 && (
                              <div className="w-12 h-[2px] bg-obsidian-700" />
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Measurement / State vector symbol */}
                    <div className="w-8 h-8 rounded bg-obsidian-800 border border-sand-400/40 text-sand-300 font-mono text-xs flex items-center justify-center">
                      ⟨ψ|
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Gate Inspector Banner */}
          <div className="mt-6 pt-3 border-t border-obsidian-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-mono text-sand-300">
              {hoveredGate || "Hover over any gate to inspect mathematical transformation."}
            </span>
            <span className="text-slate-500 text-[11px]">Hardware target: Qiskit Aer Statevector Simulator</span>
          </div>
        </div>
      )}

      {viewMode === 'ascii' && (
        <div className="relative">
          <pre className="p-4 bg-obsidian-950 rounded-xl border border-obsidian-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre leading-relaxed max-h-[350px]">
            {preview.qiskit_diagram_ascii || "// No ASCII diagram generated."}
          </pre>
          <button
            onClick={() => handleCopy(preview.qiskit_diagram_ascii)}
            className="absolute top-3 right-3 p-2 bg-obsidian-800 hover:bg-obsidian-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy ASCII"}
          </button>
        </div>
      )}

      {viewMode === 'qasm' && (
        <div className="relative">
          <pre className="p-4 bg-obsidian-950 rounded-xl border border-obsidian-800 font-mono text-xs text-quantum-cyan overflow-x-auto whitespace-pre leading-relaxed max-h-[350px]">
            {preview.qasm_code || "// No OpenQASM generated."}
          </pre>
          <button
            onClick={() => handleCopy(preview.qasm_code)}
            className="absolute top-3 right-3 p-2 bg-obsidian-800 hover:bg-obsidian-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy QASM"}
          </button>
        </div>
      )}

      {/* Feature Map Explanation */}
      <div className="mt-4 p-4 rounded-xl bg-obsidian-900/50 border border-obsidian-800/80 text-xs text-slate-300 leading-relaxed">
        <span className="font-bold text-coral-400 block mb-1">Quantum State Encoding Mechanism:</span>
        {preview.explanation}
      </div>
    </Card>
  );
};
