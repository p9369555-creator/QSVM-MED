// File: frontend/src/components/ModelComparisonDashboard.tsx
// Restyled research benchmark view comparing QSVM with Classical SVM in light teal theme.

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Cpu,
  CheckCircle,
  RefreshCw,
  Database,
  AlertCircle,
} from 'lucide-react';

interface ModelComparisonDashboardProps {
  onBackToScan: () => void;
}

export const ModelComparisonDashboard: React.FC<ModelComparisonDashboardProps> = ({ onBackToScan }) => {
  const [benchmark, setBenchmark] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBenchmarkData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
          ? import.meta.env.VITE_API_BASE_URL
          : 'https://qsvm-med.onrender.com';

      const res = await fetch(`${API_BASE_URL}/api/v1/benchmark`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Server returned HTTP ${res.status}`);
      }
      setBenchmark(data);
    } catch (err: any) {
      setBenchmark(null);
      setErrorMsg(err.message || 'Benchmark unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmarkData();
  }, []);

  const toSvgPoints = (curve: Array<{ fpr: number; tpr: number }>) =>
    curve.map((pt) => `${(pt.fpr * 100).toFixed(1)},${(100 - pt.tpr * 100).toFixed(1)}`).join(' ');

  if (loading) {
    return (
      <div className="bg-white border border-[#99F6E4] rounded-xl p-12 text-center font-mono text-xs text-[#0F766E] flex flex-col items-center gap-3 shadow-xs">
        <RefreshCw className="w-5 h-5 animate-spin text-[#0F766E]" />
        <span>Loading held-out test split benchmark metrics from server...</span>
      </div>
    );
  }

  if (errorMsg || !benchmark) {
    return (
      <div className="bg-white border border-[#99F6E4] rounded-xl p-8 space-y-4 font-sans shadow-xs">
        <button
          onClick={onBackToScan}
          className="px-3.5 py-2 bg-white hover:bg-[#CCFBF1]/40 border border-[#99F6E4] rounded-lg text-xs text-[#134E4A] font-medium flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#0F766E]" /> Back to scan demo
        </button>
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-slate-700 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm text-[#134E4A] mb-1">Benchmark unavailable</strong>
            <p className="text-slate-600">{errorMsg || 'Could not load benchmark metrics.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const qsvm = benchmark.qsvm;
  const classical = benchmark.classical_svm;

  return (
    <div className="space-y-5 font-sans text-slate-700">
      {/* Top Banner */}
      <div className="bg-white border border-[#99F6E4] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToScan}
            className="px-3.5 py-2 bg-white hover:bg-[#CCFBF1]/40 border border-[#99F6E4] rounded-lg text-xs text-[#134E4A] font-medium flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#0F766E]" /> Back to scan demo
          </button>
          <div>
            <h2 className="text-base font-semibold text-[#134E4A] tracking-tight">
              Held out test benchmark: QSVM vs. Classical SVM
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {benchmark.dataset_name} • Test samples = {benchmark.total_test_samples}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg border bg-[#F0FDFA] border-[#99F6E4] text-[#0F766E] flex items-center gap-1.5 font-medium">
            <Database className="w-3 h-3" /> benchmark_metrics.json
          </span>
          <button
            onClick={fetchBenchmarkData}
            className="p-2 bg-white hover:bg-[#CCFBF1]/40 border border-[#99F6E4] rounded-lg text-slate-600 hover:text-[#0F766E] transition-colors"
            title="Refresh benchmark data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5 font-mono">
        {[
          { label: 'Test Accuracy', qVal: `${(qsvm.accuracy * 100).toFixed(1)}%`, cVal: `${(classical.accuracy * 100).toFixed(1)}%`, delta: benchmark.deltas?.accuracy_delta || '+0.0%' },
          { label: 'Tumor Recall', qVal: `${(qsvm.recall * 100).toFixed(1)}%`, cVal: `${(classical.recall * 100).toFixed(1)}%`, delta: benchmark.deltas?.recall_delta || '+0.0%' },
          { label: 'Tumor Precision', qVal: `${(qsvm.precision * 100).toFixed(1)}%`, cVal: `${(classical.precision * 100).toFixed(1)}%`, delta: benchmark.deltas?.precision_delta || '+0.0%' },
          { label: 'F1 Score', qVal: `${(qsvm.f1_score * 100).toFixed(1)}%`, cVal: `${(classical.f1_score * 100).toFixed(1)}%`, delta: benchmark.deltas?.f1_delta || '+0.0%' },
          { label: 'Test ROC AUC', qVal: qsvm.roc_auc.toFixed(3), cVal: classical.roc_auc.toFixed(3), delta: benchmark.deltas?.roc_auc_delta || '+0.000' },
          { label: 'Support Vectors', qVal: `${qsvm.support_vectors_count} SVs`, cVal: `${classical.support_vectors_count} SVs`, delta: benchmark.deltas?.support_vector_reduction || '0%' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-[#99F6E4] rounded-xl p-3.5 flex flex-col justify-between min-w-0 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-sans font-medium">{item.label}</span>
            <div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-xl font-bold text-[#0F766E]">{item.qVal}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0FDFA] border border-[#99F6E4] text-[#134E4A]">
                  {item.delta}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1 truncate">Classical: {item.cVal}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2x2 Confusion Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-mono">
        {[
          { model: qsvm, icon: <Cpu className="w-4 h-4 text-[#0F766E]" />, badge: '8 Qubits • dim=256' },
          { model: classical, icon: <Database className="w-4 h-4 text-[#134E4A]" />, badge: 'Euclidean • dim=8' }
        ].map(({ model, icon, badge }, i) => (
          <div key={i} className="bg-white border border-[#99F6E4] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#99F6E4]/70 pb-3">
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="text-xs font-semibold text-[#134E4A] uppercase tracking-wider">{model.model_name}</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E]">
                {badge}
              </span>
            </div>

            <div className="p-3 bg-[#F0FDFA] rounded-lg border border-[#99F6E4]/70">
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono items-center">
                <div></div>
                <div className="text-[10px] text-slate-500 py-1 font-sans font-medium">Pred: Normal</div>
                <div className="text-[10px] text-slate-500 py-1 font-sans font-medium">Pred: Tumor</div>

                <div className="text-[10px] text-slate-500 text-left pl-1 font-sans font-medium">Actual: Normal</div>
                <div className="bg-white border border-emerald-300 text-[#15803D] p-2.5 rounded-lg font-bold shadow-xs">
                  {model.confusion_matrix.matrix[0][0]} <span className="block text-[9px] font-normal text-slate-500 font-sans">True Normal</span>
                </div>
                <div className="bg-white border border-rose-300 text-[#B91C1C] p-2.5 rounded-lg font-bold shadow-xs">
                  {model.confusion_matrix.matrix[0][1]} <span className="block text-[9px] font-normal text-slate-500 font-sans">False Tumor</span>
                </div>

                <div className="text-[10px] text-slate-500 text-left pl-1 font-sans font-medium">Actual: Tumor</div>
                <div className="bg-white border border-slate-200 text-slate-600 p-2.5 rounded-lg font-bold shadow-xs">
                  {model.confusion_matrix.matrix[1][0]} <span className="block text-[9px] font-normal text-slate-500 font-sans">False Normal</span>
                </div>
                <div className="bg-white border border-teal-300 text-[#0F766E] p-2.5 rounded-lg font-bold shadow-xs">
                  {model.confusion_matrix.matrix[1][1]} <span className="block text-[9px] font-normal text-slate-500 font-sans">True Tumor</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ROC Curve & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white border border-[#99F6E4] rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <h4 className="text-xs font-semibold text-[#134E4A] uppercase tracking-wider mb-3 font-mono">Held out test ROC curves</h4>
          <div className="relative w-full aspect-square max-h-[260px] mx-auto bg-[#F0FDFA] border border-[#99F6E4] rounded-lg p-4 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-hidden">
              <line x1="0" y1="100" x2="100" y2="0" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2,2" />
              <polyline fill="none" stroke="#64748B" strokeWidth="1.5" points={toSvgPoints(classical.roc_curve)} />
              <polyline fill="none" stroke="#0F766E" strokeWidth="2.4" points={toSvgPoints(qsvm.roc_curve)} />
            </svg>
          </div>
          <div className="flex justify-between text-[11px] font-mono mt-4 pt-3 border-t border-[#99F6E4]/70">
            <span className="text-[#0F766E] font-semibold">● QSVM (AUC = {qsvm.roc_auc.toFixed(3)})</span>
            <span className="text-slate-600">● Tuned SVM (AUC = {classical.roc_auc.toFixed(3)})</span>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#99F6E4] rounded-xl p-5 space-y-3 font-sans shadow-xs">
          <h4 className="text-xs font-semibold text-[#134E4A] uppercase tracking-wider mb-2 font-mono">
            Model evaluation notes
          </h4>
          {(benchmark.quantum_advantage_notes || []).map((note: string, i: number) => (
            <div key={i} className="p-3 bg-[#F0FDFA] rounded-lg border border-[#99F6E4]/70 flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed">{note}</p>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 pt-2 border-t border-[#99F6E4]/50">
            Measured on the held out test split.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelComparisonDashboard;
