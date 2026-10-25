// File: frontend/src/components/ModelComparisonDashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Cpu,
  CheckCircle,
  Layers,
  RefreshCw,
  Database,
  AlertCircle
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
          : 'http://localhost:8000';

      const res = await fetch(`${API_BASE_URL}/api/v1/benchmark`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Server returned HTTP ${res.status}`);
      }
      setBenchmark(data);
    } catch (err: any) {
      setBenchmark(null);
      setErrorMsg(err.message || 'Unable to load benchmark_metrics.json from backend.');
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
      <div className="clinical-card p-12 text-center font-mono text-xs text-sky-400 flex flex-col items-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span>Loading held-out test set metrics from benchmark_metrics.json...</span>
      </div>
    );
  }

  if (errorMsg || !benchmark) {
    return (
      <div className="clinical-card p-8 space-y-4 font-mono">
        <button
          onClick={onBackToScan}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-sky-400" /> Back to Workspace
        </button>
        <div className="p-6 bg-rose-950/30 border border-rose-800/50 rounded-lg text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm text-white mb-1">Benchmark Metrics Unavailable (HTTP 503)</strong>
            <p>{errorMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  const qsvm = benchmark.qsvm;
  const classical = benchmark.classical_svm;

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <div className="clinical-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToScan}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-200 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-sky-400" /> Back to Scan Workspace
          </button>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Held-Out Test Benchmark: Calibrated QSVM vs. GridSearch Classical SVM
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              {benchmark.dataset_name} • Test N = {benchmark.total_test_samples} ({benchmark.split})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded border bg-emerald-950/50 border-emerald-800/50 text-emerald-400 flex items-center gap-1.5">
            <Database className="w-3 h-3" /> Loaded from benchmark_metrics.json
          </span>
          <button
            onClick={fetchBenchmarkData}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 font-mono">
        {[
          { label: 'Test Accuracy', qVal: `${(qsvm.accuracy * 100).toFixed(1)}%`, cVal: `${(classical.accuracy * 100).toFixed(1)}%`, delta: benchmark.deltas.accuracy_delta },
          { label: 'Tumor Recall', qVal: `${(qsvm.recall * 100).toFixed(1)}%`, cVal: `${(classical.recall * 100).toFixed(1)}%`, delta: benchmark.deltas.recall_delta },
          { label: 'Tumor Precision', qVal: `${(qsvm.precision * 100).toFixed(1)}%`, cVal: `${(classical.precision * 100).toFixed(1)}%`, delta: benchmark.deltas.precision_delta },
          { label: 'F1-Score', qVal: `${(qsvm.f1_score * 100).toFixed(1)}%`, cVal: `${(classical.f1_score * 100).toFixed(1)}%`, delta: benchmark.deltas.f1_delta },
          { label: 'Test ROC-AUC', qVal: qsvm.roc_auc.toFixed(3), cVal: classical.roc_auc.toFixed(3), delta: benchmark.deltas.roc_auc_delta },
          { label: 'Support Vectors', qVal: `${qsvm.support_vectors_count} SVs`, cVal: `${classical.support_vectors_count} SVs`, delta: benchmark.deltas.support_vector_reduction }
        ].map((item, idx) => (
          <div key={idx} className="clinical-card p-4 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">{item.label}</span>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-sky-400">{item.qVal}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  {item.delta}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">Classical: {item.cVal}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2x2 Confusion Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { model: qsvm, icon: <Cpu className="w-4 h-4 text-sky-400" />, badge: '8 Qubits • dim=256' },
          { model: classical, icon: <Layers className="w-4 h-4 text-slate-400" />, badge: '0 Qubits • dim=8' }
        ].map(({ model, icon, badge }, i) => (
          <div key={i} className="clinical-card p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {icon} {model.model_name}
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{model.kernel_name}</p>
              </div>
              <span className="text-xs font-mono text-sky-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded">
                {badge}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono">
              <div className="grid grid-cols-3 gap-2 text-center text-xs items-center">
                <div></div>
                <div className="text-[10px] text-slate-400 uppercase py-1 border-b border-slate-800">Pred: Normal</div>
                <div className="text-[10px] text-slate-400 uppercase py-1 border-b border-slate-800">Pred: Tumor</div>

                <div className="text-[10px] text-slate-400 uppercase text-left pl-2">Actual: Normal</div>
                <div className="bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 p-3 rounded font-bold text-sm">
                  {model.confusion_matrix.matrix[0][0]} <span className="block text-[9px] font-normal">TN</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 text-amber-300 p-3 rounded font-bold text-sm">
                  {model.confusion_matrix.matrix[0][1]} <span className="block text-[9px] font-normal">FP</span>
                </div>

                <div className="text-[10px] text-slate-400 uppercase text-left pl-2">Actual: Tumor</div>
                <div className="bg-slate-900 border border-slate-800 text-rose-300 p-3 rounded font-bold text-sm">
                  {model.confusion_matrix.matrix[1][0]} <span className="block text-[9px] font-normal">FN</span>
                </div>
                <div className="bg-sky-950/50 border border-sky-700/50 text-sky-300 p-3 rounded font-bold text-sm">
                  {model.confusion_matrix.matrix[1][1]} <span className="block text-[9px] font-normal">TP</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ROC Curve & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 clinical-card p-6 flex flex-col justify-between">
          <h4 className="text-sm font-bold text-white mb-4">Held-Out Test ROC Curves</h4>
          <div className="relative w-full aspect-square max-h-[260px] mx-auto bg-[#06090e] border border-slate-800 rounded-lg p-4">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <line x1="0" y1="100" x2="100" y2="0" stroke="#475569" strokeWidth="0.6" strokeDasharray="2,2" />
              <polyline fill="none" stroke="#94a3b8" strokeWidth="1.5" points={toSvgPoints(classical.roc_curve)} />
              <polyline fill="none" stroke="#38bdf8" strokeWidth="2.2" points={toSvgPoints(qsvm.roc_curve)} />
            </svg>
          </div>
          <div className="flex justify-between text-[11px] font-mono mt-4 pt-3 border-t border-slate-800">
            <span className="text-sky-400">● QSVM (AUC = {qsvm.roc_auc.toFixed(3)})</span>
            <span className="text-slate-400">● Tuned SVM (AUC = {classical.roc_auc.toFixed(3)})</span>
          </div>
        </div>

        <div className="lg:col-span-7 clinical-card p-6 space-y-3">
          <h4 className="text-sm font-bold text-white mb-2">Evaluation Protocol Notes</h4>
          {(benchmark.quantum_advantage_notes || []).map((note: string, i: number) => (
            <div key={i} className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};