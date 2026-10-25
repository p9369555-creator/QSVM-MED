// File: frontend/src/App.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ModelComparisonDashboard } from './components/ModelComparisonDashboard';
import {
  Upload,
  X,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Activity,
  BarChart2,
  Cpu,
  ArrowRight,
  Target,
  Shield
} from 'lucide-react';

const FontStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    .font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    html { scroll-behavior: smooth; background-color: #080c14; }
    body { background-color: #080c14; color: #f1f5f9; overflow-x: hidden; }
    .clinical-card { background: #0d131f; border: 1px solid #1e293b; border-radius: 10px; }
    .clinical-grid {
      background-image:
        linear-gradient(to right, rgba(30, 41, 59, 0.25) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(30, 41, 59, 0.25) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    @keyframes medicalScanBeam {
      0% { top: 0%; opacity: 0.85; }
      50% { opacity: 1; }
      100% { top: 100%; opacity: 0.85; }
    }
    .medical-scan-beam {
      position: absolute; left: 0; right: 0; height: 2px;
      background: #38bdf8; box-shadow: 0 0 10px #38bdf8, 0 0 20px #0284c7;
      animation: medicalScanBeam 1.6s ease-in-out infinite alternate;
      z-index: 30; pointer-events: none;
    }
  `}} />
);

const FeatureSpacePlot = ({ resultData, isLoading }: { resultData: any | null; isLoading: boolean }) => {
  const computeLiveCoords = () => {
    if (!resultData?.probabilities) return null;
    const pNorm = Number(resultData.probabilities.normal ?? 0.5);
    const pTumor = Number(resultData.probabilities.tumor ?? 0.5);
    const angles: number[] = resultData.pca_angles || [];
    const shiftX = angles.length >= 2 ? ((angles[0] + angles[1]) / (2 * Math.PI)) * 6 : 0;
    const shiftY = angles.length >= 4 ? ((angles[2] + angles[3]) / (2 * Math.PI)) * 6 : 0;
    return {
      x: Math.max(12, Math.min(88, 30 * pNorm + 70 * pTumor + shiftX)),
      y: Math.max(12, Math.min(88, 70 * pNorm + 30 * pTumor + shiftY)),
    };
  };

  const targetCoords = computeLiveCoords();
  const pcaAngles: number[] = resultData?.pca_angles || [];

  return (
    <div className="flex-grow flex flex-col justify-between">
      <p className="text-slate-400 text-xs leading-relaxed mb-4">
        Projecting 8-dimensional PCA vectors into a 256-dimensional complex Hilbert space via the Qiskit Fidelity Quantum Kernel.
      </p>
      <div className="relative w-full aspect-square bg-[#06090e] border border-slate-800 rounded-lg overflow-hidden">
        <div className="absolute inset-0 clinical-grid"></div>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <circle cx="30" cy="70" r="22" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="0.8" />
          <circle cx="70" cy="30" r="22" fill="rgba(239, 68, 68, 0.08)" stroke="rgba(239, 68, 68, 0.35)" strokeWidth="0.8" />
          <line x1="15" y1="15" x2="85" y2="85" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="0.7" strokeDasharray="2.5,2.5" />
          {targetCoords && !isLoading && (
            <>
              <circle cx={targetCoords.x} cy={targetCoords.y} r="2.8" fill="#38bdf8" />
              <circle cx={targetCoords.x} cy={targetCoords.y} r="6.5" fill="none" stroke="#38bdf8" strokeWidth="0.9" />
            </>
          )}
        </svg>
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 z-10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        )}
      </div>

      {pcaAngles.length > 0 && (
        <div className="mt-3 p-3 bg-slate-950 rounded border border-slate-800 font-mono">
          <span className="text-[10px] text-sky-400 uppercase block mb-1.5 font-semibold">
            8-Qubit ZZFeatureMap Angles (rad)
          </span>
          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            {pcaAngles.slice(0, 8).map((angle, idx) => (
              <div key={idx} className="bg-[#06090e] px-1.5 py-1 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-500">Q{idx}:</span>
                <span className="text-slate-200">{angle >= 0 ? `+${angle.toFixed(2)}` : angle.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function DoctorLogin({
  onSuccessfulLogin,
  onBack,
}: {
  onSuccessfulLogin: (token: string) => void;
  onBack: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
          ? import.meta.env.VITE_API_BASE_URL
          : 'http://localhost:8000';

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed.');
      }

      sessionStorage.setItem('qsvm_jwt', data.access_token);
      onSuccessfulLogin(data.access_token);
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center font-sans p-4 relative">
      <FontStyles />
      <button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-white text-xs font-mono">
        ← Return
      </button>
      <div className="max-w-md w-full clinical-card p-8">
        <h1 className="text-xl font-bold text-white mb-1 text-center">Researcher Authentication</h1>
        <p className="text-slate-400 text-xs font-mono text-center mb-6">JWT-Protected Diagnostic Suite</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Researcher ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#06090e] border border-slate-800 text-white rounded-md p-3 font-mono text-xs"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Passkey</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#06090e] border border-slate-800 text-white rounded-md p-3 font-mono text-xs"
              required
            />
          </div>
          {error && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded text-center font-mono">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-md text-xs font-mono uppercase"
          >
            {isSubmitting ? 'Authenticating...' : 'Authenticate'}
          </button>
        </form>
      </div>
    </div>
  );
}

function QuantumUploadDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'scan' | 'benchmark'>('scan');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showRoi, setShowRoi] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.65);
  const [viewMode, setViewMode] = useState<'overlay' | 'original' | 'heatmap_only'>('overlay');
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage('File exceeds 15MB backend limit.');
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
      setResultData(null);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResultData(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    canvas.width = img.clientWidth || 300;
    canvas.height = img.clientHeight || 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showRoi || !Array.isArray(resultData?.quantum_heatmap)) return;
    resultData.quantum_heatmap.forEach((spot: any, idx: number) => {
      const cx = spot.norm_x * canvas.width;
      const cy = spot.norm_y * canvas.height;
      const r = Math.max(14, Math.min(canvas.width, canvas.height) * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = idx === 0 ? '#38bdf8' : '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  };

  useEffect(() => {
    drawHeatmap();
  }, [resultData, previewUrl, showRoi, zoomLevel]);

  const handleAnalyzeClick = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setErrorMessage(null);
    setResultData(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3600000);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('study_modality', 'brain_mri');

      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
          ? import.meta.env.VITE_API_BASE_URL
          : 'http://localhost:8000';

      const token = sessionStorage.getItem('qsvm_jwt');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg =
          typeof data.detail === 'object'
            ? (data.detail.model === 'input_rejected'
                ? data.detail.message
                : `${data.detail.message} (model: ${data.detail.model})`)
            : data.detail || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      setResultData(data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setErrorMessage(err.message || 'Backend connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const normalCount = resultData?.cell_analysis?.normal ?? 0;
  const tumorCount = resultData?.cell_analysis?.tumor ?? 0;
  const totalCells = Math.max(1, normalCount + tumorCount);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 font-sans flex flex-col">
      <FontStyles />
      <header className="h-16 border-b border-slate-800 bg-[#0a0f1a] flex items-center justify-between px-6">
        <h1 className="text-sm font-bold text-white">QSVM Brain Tumor MRI Diagnostic Suite</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-3 py-1.5 rounded text-xs font-mono ${activeTab === 'scan' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
          >
            Brain MRI Scan
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-1.5 rounded text-xs font-mono ${activeTab === 'benchmark' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
          >
            Test Set Benchmark
          </button>
        </div>
        <button onClick={onLogout} className="text-xs font-mono text-slate-400 hover:text-white">Exit</button>
      </header>

      {activeTab === 'benchmark' ? (
        <main className="p-6 max-w-[1600px] mx-auto w-full">
          <ModelComparisonDashboard onBackToScan={() => setActiveTab('scan')} />
        </main>
      ) : (
        <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full">
          <div className="lg:col-span-4 space-y-6">
            <div className="clinical-card p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,.dcm,.dicom"
                onChange={handleFileChange}
                className="hidden"
              />
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-slate-700 hover:border-sky-500 rounded-lg p-8 text-center cursor-pointer bg-slate-950/60"
                >
                  <Upload className="w-6 h-6 mx-auto mb-2 text-sky-400" />
                  <span className="text-xs text-white block">Select Axial Brain MRI Scan (Max 15MB)</span>
                </div>
              ) : (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center">
                  <span className="text-xs font-mono truncate">{selectedFile.name}</span>
                  <button onClick={handleClearImage} className="text-rose-400"><X className="w-4 h-4" /></button>
                </div>
              )}

              <button
                onClick={handleAnalyzeClick}
                disabled={isLoading || !selectedFile}
                className="w-full mt-4 py-3 rounded-md font-mono text-xs uppercase bg-sky-600 hover:bg-sky-500 disabled:bg-slate-900 text-white"
              >
                {isLoading ? 'Running Calibrated QSVM...' : 'Analyze Brain MRI'}
              </button>

              {errorMessage && (
                <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/40 text-rose-300 rounded text-xs font-mono">
                  {errorMessage}
                </div>
              )}
            </div>

            {resultData && (
              <div className="clinical-card p-6 space-y-4 font-mono">
                {resultData.input_check?.status === 'warning' && (
                  <div className="p-3 bg-amber-950/40 border border-amber-700/50 text-amber-300 rounded text-xs">
                    <span className="block font-bold uppercase mb-1">Input warning - result may be unreliable</span>
                    {resultData.input_check.reasons.map((r: any) => (
                      <span key={r.code} className="block">- {r.message}</span>
                    ))}
                  </div>
                )}
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Predicted Class</span>
                  <span className={`text-xl font-bold ${resultData.predicted_class === 'Normal Cell' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {resultData.predicted_class}
                  </span>
                  <span className="block text-xs text-sky-400 mt-1">
                    Platt-Calibrated Confidence: {(resultData.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase mb-2">Normal vs. Tumor Cell Proportion</span>
                  <div className="w-full h-2.5 bg-slate-900 rounded overflow-hidden flex">
                    <div style={{ width: `${(normalCount / totalCells) * 100}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${(tumorCount / totalCells) * 100}%` }} className="bg-rose-500 h-full" />
                  </div>
                  <div className="flex justify-between text-[11px] pt-2">
                    <span className="text-emerald-400">Normal: {(resultData.probabilities.normal * 100).toFixed(1)}%</span>
                    <span className="text-rose-400">Tumor: {(resultData.probabilities.tumor * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 clinical-card p-4 flex flex-col">
            <div className="relative flex-grow bg-[#05080f] flex items-center justify-center min-h-[420px] overflow-hidden rounded">
              {previewUrl ? (
                <div className="relative" style={{ transform: `scale(${zoomLevel})` }}>
                  <img ref={imageRef} src={previewUrl} alt="Scan" style={{ maxHeight: '60vh' }} onLoad={drawHeatmap} />
                  {resultData?.explainability?.heatmap_base64 && showHeatmap && viewMode !== 'original' && (
                    <img
                      src={resultData.explainability.heatmap_base64}
                      alt="QSVM Occlusion Heatmap"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                      style={{ opacity: heatmapOpacity }}
                    />
                  )}
                  <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-600">No Active MRI Scan</span>
              )}
            </div>
            {resultData?.explainability && (
              <div className="pt-3 text-[10px] font-mono text-slate-400">
                Heatmap Source: <strong className="text-sky-400">{resultData.explainability.evaluated_model}</strong>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 clinical-card p-4 flex flex-col">
            <FeatureSpacePlot resultData={resultData} isLoading={isLoading} />
          </div>
        </main>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'login' | 'dashboard'>('dashboard');
  if (view === 'login') {
    return <DoctorLogin onSuccessfulLogin={() => setView('dashboard')} onBack={() => setView('dashboard')} />;
  }
  return <QuantumUploadDashboard onLogout={() => setView('login')} />;
}