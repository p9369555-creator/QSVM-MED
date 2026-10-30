// File: frontend/src/components/PrivacyPolicyPage.tsx
// Research prototype privacy notice in light teal theme.
// Plain language, zero marketing or unsubstantiated regulatory claims.

import React, { useEffect } from 'react';
import { Shield, ArrowLeft, Lock, HardDrive, RefreshCw } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Privacy Policy • QSVM Med';
  }, []);

  return (
    <div className="min-h-screen bg-[#F0FDFA] text-slate-700 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#99F6E4] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#CCFBF1] border border-[#99F6E4] flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#0F766E]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#134E4A]">
              QSVM Med Privacy Policy
            </h1>
            <span className="text-[11px] text-slate-500 font-mono block">
              Academic Research Prototype Data Handling
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#CCFBF1]/40 border border-[#99F6E4] text-xs font-medium text-[#134E4A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to demo</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-6 sm:p-10 space-y-6 flex-grow text-xs leading-relaxed">
        {/* Executive Summary */}
        <div className="p-5 rounded-xl bg-white border border-[#99F6E4] shadow-sm space-y-2">
          <span className="text-[#0F766E] font-mono font-semibold text-xs uppercase tracking-wider block">
            Data handling summary
          </span>
          <p className="text-slate-600 text-xs leading-relaxed">
            QSVM Med is an academic research demonstration. Uploaded MRI slices are processed in server memory to calculate 8 PCA feature projections and simulated quantum kernel metrics. Uploaded image files are not permanently stored in a persistent database or shared with third parties.
          </p>
          <span className="text-[11px] text-slate-400 font-mono block pt-1">
            Last updated: October 2026 • QSVM Med Research Team
          </span>
        </div>

        {/* Section 1: Upload Processing */}
        <section className="bg-white border border-[#99F6E4] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#134E4A]">
            <HardDrive className="w-4 h-4 text-[#0F766E]" />
            <h2>1. Ephemeral memory processing</h2>
          </div>
          <p className="text-slate-600">
            When you upload a brain MRI slice, the image is parsed into a temporary memory buffer to extract intensity values, downsample to 128×128 pixels, and compute 8 principal components. Processing takes place in active memory during the lifetime of the HTTP request. Once the inference response is returned to your browser, image buffers in memory are freed.
          </p>
        </section>

        {/* Section 2: De-identification & Local Demo */}
        <section className="bg-white border border-[#99F6E4] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#134E4A]">
            <Lock className="w-4 h-4 text-[#0F766E]" />
            <h2>2. No personal health information</h2>
          </div>
          <p className="text-slate-600">
            This prototype is designed exclusively for evaluating machine learning algorithms on public, deidentified benchmark datasets (such as Kaggle research splits). Users should never upload identifiable patient medical records, protected personal health files, or unanonymized clinical scans to this experimental prototype.
          </p>
        </section>

        {/* Section 3: Browser Session & Authentication */}
        <section className="bg-white border border-[#99F6E4] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#134E4A]">
            <RefreshCw className="w-4 h-4 text-[#0F766E]" />
            <h2>3. Client session tokens</h2>
          </div>
          <p className="text-slate-600">
            Demonstration access uses short-lived JSON Web Tokens (JWT) stored in your browser session storage. These tokens expire automatically and are used solely to control API rate limits and authenticated demonstration endpoints. No tracking cookies or advertising trackers are embedded.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#99F6E4] bg-white py-4 px-6 text-center text-[11px] text-slate-500 font-mono">
        Research prototype. Not for clinical use. • Team 5 Qubits
      </footer>
    </div>
  );
};
