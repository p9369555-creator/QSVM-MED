// File: frontend/src/components/QuantumArchitectureModal.tsx
// Academic methodology modal for QSVM Med.
// Light teal theme, plain sentence case, zero banned words.

import React from 'react';
import { X, Check } from 'lucide-react';

interface QuantumArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuantumArchitectureModal: React.FC<QuantumArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="relative w-full max-w-3xl bg-white border border-[#99F6E4] rounded-xl shadow-lg overflow-hidden my-8 text-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#99F6E4]/70 bg-[#F0FDFA]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
            <div>
              <h2 className="text-base font-semibold text-[#134E4A]">
                Methodology & System Architecture
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                QSVM Med • Simulated Quantum Kernel Architecture
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-[#CCFBF1]/40 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs leading-relaxed">
          {/* Section 1: Problem & Hypothesis */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#134E4A]">
              1. Problem and hypothesis
            </h3>
            <p className="text-slate-600">
              Healthy brain tissue and tumor tissue can exhibit overlapping pixel intensities in raw cross-sectional MRI slices. When models compress slices into small feature spaces, standard Euclidean kernels can struggle with class separation. We investigate whether a simulated quantum fidelity kernel can provide separable representations in an expanded Hilbert state space.
            </p>
          </div>

          {/* Section 2: 5-Stage Pipeline */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-[#134E4A]">
              2. Data transformation pipeline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#F0FDFA] border border-[#99F6E4] rounded-lg space-y-1">
                <span className="font-mono text-xs font-semibold text-[#0F766E] block">
                  01. Slice ingestion
                </span>
                <p className="text-slate-600 text-[11px]">
                  Grayscale axial brain MRI slices are received in JPEG, PNG, or DICOM format.
                </p>
              </div>

              <div className="p-3 bg-[#F0FDFA] border border-[#99F6E4] rounded-lg space-y-1">
                <span className="font-mono text-xs font-semibold text-[#0F766E] block">
                  02. Head crop & normalization
                </span>
                <p className="text-slate-600 text-[11px]">
                  Otsu thresholding isolates the head contour, background margins are cropped, and CLAHE normalizes local contrast.
                </p>
              </div>

              <div className="p-3 bg-[#F0FDFA] border border-[#99F6E4] rounded-lg space-y-1">
                <span className="font-mono text-xs font-semibold text-[#0F766E] block">
                  03. PCA dimensionality reduction
                </span>
                <p className="text-slate-600 text-[11px]">
                  Flattened 128×128 pixel matrices (16,384 inputs) are projected to 8 principal components with unit-variance scaling.
                </p>
              </div>

              <div className="p-3 bg-[#F0FDFA] border border-[#99F6E4] rounded-lg space-y-1">
                <span className="font-mono text-xs font-semibold text-[#0F766E] block">
                  04. Quantum statevector kernel
                </span>
                <p className="text-slate-600 text-[11px]">
                  The 8 angles configure single qubit rotations in an 8 qubit ZZFeatureMap statevector simulation to calculate fidelity inner products.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Technical Specifications */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#134E4A]">
              3. Model configuration & baseline comparison
            </h3>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Quantum kernel:</span>
                <span className="text-[#134E4A] font-semibold">ZZFeatureMap (8 qubits, linear entanglement)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Hilbert state space:</span>
                <span className="text-[#134E4A] font-semibold">Dimension = 256 (complex amplitudes)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Classical baseline:</span>
                <span className="text-[#134E4A] font-semibold">Support Vector Classifier (RBF kernel, GridSearch tuned)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Probability calibration:</span>
                <span className="text-[#134E4A] font-semibold">Platt scaling on held-out validation split</span>
              </div>
            </div>
          </div>

          {/* Section 4: Academic Limitations */}
          <div className="p-3.5 bg-[#F0FDFA] border border-[#99F6E4] rounded-lg space-y-1.5 text-[11px]">
            <span className="font-semibold text-[#134E4A] block">Experimental notes</span>
            <p className="text-slate-600">
              The quantum kernel is executed in classical software simulation using Qiskit. Predictions are global binary labels for individual 2D slices. This system is a research prototype developed for academic evaluation and is not for clinical diagnostic use.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#99F6E4]/70 bg-[#F0FDFA] flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">Team 5 Qubits</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0F766E] hover:bg-[#134E4A] text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
