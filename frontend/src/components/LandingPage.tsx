// File: frontend/src/components/LandingPage.tsx
// Academic research project landing page for QSVM-Med.
// Light teal theme, restrained typography, zero marketing superlatives.

import React, { useState, useEffect } from 'react';
import {
  PROJECT_TITLE,
  NAV_LINKS,
  HERO,
  PROBLEM,
  APPROACH_STEPS,
  SYSTEM_STACK,
  LIMITATIONS,
  TEAM_NAME,
  TEAM_MEMBERS,
  COLLEGE_LOGO_SLOT,
  FOOTER,
} from '../constants/landingContent';

interface BenchmarkMetrics {
  status: string;
  dataset_name: string;
  total_test_samples: number;
  split?: string;
  qsvm?: {
    model_name: string;
    accuracy: number;
    recall: number;
    specificity: number;
    roc_auc: number;
    avg_inference_latency_ms?: number;
  };
  classical_svm?: {
    model_name: string;
    accuracy: number;
    recall: number;
    specificity: number;
    roc_auc: number;
    avg_inference_latency_ms?: number;
  };
}

interface LandingPageProps {
  onScanClick: () => void;
  onOpenArchitectureModal?: () => void;
  onNavigatePrivacy: () => void;
  onNavigateTerms: () => void;
}

const PipelineDiagram: React.FC = () => {
  return (
    <div className="w-full bg-white border border-[#99F6E4] rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="text-[11px] font-mono text-[#0F766E] uppercase tracking-wider mb-2 font-semibold">
        Pipeline architecture
      </div>
      <svg
        viewBox="0 0 540 300"
        className="w-full h-auto select-none"
        aria-label="QSVM Med preprocessing and quantum kernel pipeline diagram"
      >
        <defs>
          <marker
            id="tealArrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#0F766E" />
          </marker>
        </defs>

        {/* Step 1: Input Axial MRI Slice */}
        <g transform="translate(15, 20)">
          <rect
            width="145"
            height="115"
            rx="8"
            fill="#FFFFFF"
            stroke="#99F6E4"
            strokeWidth="1.5"
          />
          <text x="12" y="24" fill="#0F766E" fontSize="10" fontFamily="monospace" fontWeight="600">
            01. SCAN INPUT
          </text>
          <text x="12" y="44" fill="#134E4A" fontSize="11" fontWeight="600">
            Axial Brain Slice
          </text>
          <text x="12" y="62" fill="#475569" fontSize="9.5">
            Raw grayscale raster
          </text>
          <text x="12" y="78" fill="#475569" fontSize="9.5">
            JPEG / PNG / DICOM
          </text>
          <rect x="12" y="88" width="121" height="16" rx="4" fill="#F0FDFA" />
          <text x="18" y="100" fill="#0F766E" fontSize="8.5" fontFamily="monospace">
            Matrix: 128×128 px
          </text>
        </g>

        {/* Arrow 1 -> 2 */}
        <line
          x1="160"
          y1="78"
          x2="190"
          y2="78"
          stroke="#0F766E"
          strokeWidth="1.5"
          markerEnd="url(#tealArrow)"
        />

        {/* Step 2: Head Mask & Normalization */}
        <g transform="translate(195, 20)">
          <rect
            width="150"
            height="115"
            rx="8"
            fill="#FFFFFF"
            stroke="#99F6E4"
            strokeWidth="1.5"
          />
          <text x="12" y="24" fill="#0F766E" fontSize="10" fontFamily="monospace" fontWeight="600">
            02. PREPROCESS
          </text>
          <text x="12" y="44" fill="#134E4A" fontSize="11" fontWeight="600">
            Crop & CLAHE
          </text>
          <text x="12" y="62" fill="#475569" fontSize="9.5">
            Otsu cranial mask
          </text>
          <text x="12" y="78" fill="#475569" fontSize="9.5">
            Contrast equalization
          </text>
          <rect x="12" y="88" width="126" height="16" rx="4" fill="#F0FDFA" />
          <text x="18" y="100" fill="#0F766E" fontSize="8.5" fontFamily="monospace">
            StandardScaler fit
          </text>
        </g>

        {/* Arrow 2 -> 3 */}
        <line
          x1="345"
          y1="78"
          x2="375"
          y2="78"
          stroke="#0F766E"
          strokeWidth="1.5"
          markerEnd="url(#tealArrow)"
        />

        {/* Step 3: PCA to 8 Features */}
        <g transform="translate(380, 20)">
          <rect
            width="145"
            height="115"
            rx="8"
            fill="#FFFFFF"
            stroke="#99F6E4"
            strokeWidth="1.5"
          />
          <text x="12" y="24" fill="#0F766E" fontSize="10" fontFamily="monospace" fontWeight="600">
            03. DIM REDUCTION
          </text>
          <text x="12" y="44" fill="#134E4A" fontSize="11" fontWeight="600">
            PCA to 8 Features
          </text>
          <text x="12" y="62" fill="#475569" fontSize="9.5">
            16,384 px → 8 values
          </text>
          <text x="12" y="78" fill="#475569" fontSize="9.5">
            Scales to [-π, +π] rad
          </text>
          <rect x="12" y="88" width="121" height="16" rx="4" fill="#F0FDFA" />
          <text x="18" y="100" fill="#0F766E" fontSize="8.5" fontFamily="monospace">
            θ0, θ1, ..., θ7
          </text>
        </g>

        {/* Diagonal Down Arrow Step 3 -> Step 4 */}
        <line
          x1="452"
          y1="135"
          x2="452"
          y2="165"
          stroke="#0F766E"
          strokeWidth="1.5"
          markerEnd="url(#tealArrow)"
        />

        {/* Step 4: Quantum Kernel Simulation (ZZFeatureMap) */}
        <g transform="translate(290, 170)">
          <rect
            width="235"
            height="115"
            rx="8"
            fill="#FFFFFF"
            stroke="#99F6E4"
            strokeWidth="1.5"
          />
          <text x="14" y="24" fill="#0F766E" fontSize="10" fontFamily="monospace" fontWeight="600">
            04. QUANTUM KERNEL
          </text>
          <text x="14" y="44" fill="#134E4A" fontSize="11" fontWeight="600">
            8 Qubit ZZFeatureMap
          </text>
          <text x="14" y="62" fill="#475569" fontSize="9.5">
            Qiskit statevector simulation
          </text>
          <text x="14" y="78" fill="#475569" fontSize="9.5">
            Evaluates pairwise fidelity: |⟨ψ(x)|ψ(x')⟩|²
          </text>
          <rect x="14" y="88" width="207" height="16" rx="4" fill="#F0FDFA" />
          <text x="20" y="100" fill="#0F766E" fontSize="8.5" fontFamily="monospace">
            256 dimensional complex Hilbert state space
          </text>
        </g>

        {/* Left Arrow Step 4 -> Step 5 */}
        <line
          x1="290"
          y1="228"
          x2="255"
          y2="228"
          stroke="#0F766E"
          strokeWidth="1.5"
          markerEnd="url(#tealArrow)"
        />

        {/* Step 5: SVM Classifier & Platt Scaling */}
        <g transform="translate(15, 170)">
          <rect
            width="235"
            height="115"
            rx="8"
            fill="#FFFFFF"
            stroke="#99F6E4"
            strokeWidth="1.5"
          />
          <text x="14" y="24" fill="#0F766E" fontSize="10" fontFamily="monospace" fontWeight="600">
            05. CLASSIFICATION
          </text>
          <text x="14" y="44" fill="#134E4A" fontSize="11" fontWeight="600">
            Calibrated SVM Decision
          </text>
          <text x="14" y="62" fill="#475569" fontSize="9.5">
            Support Vector Machine on kernel
          </text>
          <text x="14" y="78" fill="#475569" fontSize="9.5">
            Platt scaling for posterior probabilities
          </text>
          <rect x="14" y="88" width="207" height="16" rx="4" fill="#F0FDFA" />
          <text x="20" y="100" fill="#0F766E" fontSize="8.5" fontFamily="monospace">
            Tumor / No tumor probability
          </text>
        </g>
      </svg>
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onScanClick,
  onNavigatePrivacy,
  onNavigateTerms,
}) => {
  const [benchmark, setBenchmark] = useState<BenchmarkMetrics | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState<boolean>(true);
  const [benchmarkError, setBenchmarkError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchBenchmark = async () => {
      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
            ? import.meta.env.VITE_API_BASE_URL
            : 'https://qsvm-med.onrender.com';

        const res = await fetch(`${API_BASE_URL}/api/v1/benchmark`);
        if (!res.ok) {
          throw new Error('Failed to fetch benchmark');
        }
        const data = await res.json();
        if (isMounted) {
          setBenchmark(data);
          setBenchmarkLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setBenchmark(null);
          setBenchmarkError(true);
          setBenchmarkLoading(false);
        }
      }
    };

    fetchBenchmark();

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDFA] text-slate-700 font-sans selection:bg-[#99F6E4] selection:text-[#134E4A] antialiased">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#F0FDFA]/95 backdrop-blur-sm border-b border-[#99F6E4]/70 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between">
          <a
            href="#"
            className="flex items-center gap-2 text-[#134E4A] font-semibold text-lg tracking-tight hover:text-[#0F766E] transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
            <span>{PROJECT_TITLE}</span>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#134E4A]">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="hover:text-[#0F766E] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onScanClick}
            className="px-4 py-2 bg-[#0F766E] hover:bg-[#134E4A] text-white text-xs sm:text-sm font-medium rounded-xl transition-colors"
          >
            {HERO.primaryButton}
          </button>
        </div>
      </header>

      {/* Main Content Container (Max width ~1100px, generous whitespace) */}
      <main className="max-w-[1100px] mx-auto px-4 sm:px-8">
        {/* Hero Section */}
        <section className="py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#134E4A] leading-tight tracking-tight">
              {HERO.h1}
            </h1>
            <p className="text-base text-slate-700 leading-relaxed">
              {HERO.subtitle}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onScanClick}
                className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#134E4A] text-white text-sm font-medium rounded-xl transition-colors"
              >
                {HERO.primaryButton}
              </button>
              <a
                href="#results"
                onClick={(e) => scrollToSection(e, '#results')}
                className="px-5 py-2.5 border border-[#0F766E] text-[#0F766E] hover:bg-[#CCFBF1]/40 text-sm font-medium rounded-xl transition-colors inline-block"
              >
                {HERO.secondaryButton}
              </a>
            </div>
          </div>

          {/* Right side: Clean SVG pipeline diagram */}
          <div className="lg:col-span-6">
            <PipelineDiagram />
          </div>
        </section>

        {/* Section 1: Problem */}
        <section id="problem" className="py-14 border-t border-[#99F6E4]/70 space-y-4">
          <h2 className="text-2xl font-semibold text-[#134E4A]">
            {PROBLEM.heading}
          </h2>
          <div className="space-y-3 text-slate-700 leading-relaxed text-sm sm:text-base max-w-3xl">
            {PROBLEM.text.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* Section 2: Approach */}
        <section id="approach" className="py-14 border-t border-[#99F6E4]/70 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold text-[#134E4A]">Approach</h2>
            <span className="text-xs font-mono text-[#0F766E]">
              5 step experimental pipeline
            </span>
          </div>

          <div className="space-y-3">
            {APPROACH_STEPS.map((item) => (
              <div
                key={item.step}
                className="p-4 bg-white border border-[#99F6E4] rounded-xl flex items-start gap-4"
              >
                <div className="w-7 h-7 rounded-lg bg-[#CCFBF1] text-[#0F766E] font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#134E4A]">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: System Stack */}
        <section id="stack" className="py-14 border-t border-[#99F6E4]/70 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold text-[#134E4A]">System stack</h2>
            <span className="text-xs font-mono text-[#0F766E]">
              Core software and modeling components
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SYSTEM_STACK.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-white border border-[#99F6E4] rounded-xl space-y-1.5"
              >
                <span className="text-[11px] font-mono text-[#0F766E] uppercase font-semibold block">
                  {item.category}
                </span>
                <h3 className="text-sm font-semibold text-[#134E4A]">
                  {item.tech}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Results (Fetch GET /api/v1/benchmark at runtime) */}
        <section id="results" className="py-14 border-t border-[#99F6E4]/70 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-[#134E4A]">Results</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Side by side empirical performance on held out test data.
            </p>
          </div>

          {benchmarkLoading ? (
            <div className="p-8 bg-white border border-[#99F6E4] rounded-xl text-center text-xs font-mono text-slate-600">
              Loading benchmark data from backend...
            </div>
          ) : benchmarkError || !benchmark || !benchmark.qsvm || !benchmark.classical_svm ? (
            <div className="p-6 bg-white border border-[#99F6E4] rounded-xl text-center space-y-2">
              <span className="text-sm font-semibold text-slate-700 block">
                Benchmark unavailable
              </span>
              <p className="text-xs text-slate-500">
                The benchmark metrics endpoint could not be reached or returned incomplete data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dataset Metadata Box */}
              <div className="p-4 bg-white border border-[#99F6E4] rounded-xl text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#99F6E4]/50 pb-2">
                  <span className="font-semibold text-[#134E4A]">Dataset:</span>
                  <span className="text-slate-600">{benchmark.dataset_name}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#134E4A]">Test set size:</span>
                  <span className="font-mono text-slate-700">
                    {benchmark.total_test_samples.toLocaleString()} slices
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#134E4A]">Preprocessing:</span>
                  <span className="text-slate-600">
                    Head crop mask, CLAHE normalization, StandardScaler, PCA to 8 components
                  </span>
                </div>
              </div>

              {/* Side by side Metrics Comparison Table */}
              <div className="bg-white border border-[#99F6E4] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#CCFBF1]/40 border-b border-[#99F6E4] text-[#134E4A]">
                        <th className="py-3 px-4 font-semibold">Metric</th>
                        <th className="py-3 px-4 font-semibold">
                          QSVM (8 Qubit Simulated Kernel)
                        </th>
                        <th className="py-3 px-4 font-semibold">
                          Classical SVM (Tuned RBF)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#99F6E4]/40 font-mono text-xs sm:text-sm">
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-700">
                          Accuracy
                        </td>
                        <td className="py-3 px-4 text-[#0F766E] font-semibold">
                          {(benchmark.qsvm.accuracy * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {(benchmark.classical_svm.accuracy * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-700">
                          Recall (Sensitivity)
                        </td>
                        <td className="py-3 px-4 text-[#0F766E] font-semibold">
                          {(benchmark.qsvm.recall * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {(benchmark.classical_svm.recall * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-700">
                          Specificity
                        </td>
                        <td className="py-3 px-4 text-[#0F766E] font-semibold">
                          {(benchmark.qsvm.specificity * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {(benchmark.classical_svm.specificity * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-700">
                          ROC AUC
                        </td>
                        <td className="py-3 px-4 text-[#0F766E] font-semibold">
                          {benchmark.qsvm.roc_auc.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {benchmark.classical_svm.roc_auc.toFixed(3)}
                        </td>
                      </tr>
                      {benchmark.qsvm.avg_inference_latency_ms !== undefined &&
                        benchmark.classical_svm.avg_inference_latency_ms !== undefined && (
                          <tr>
                            <td className="py-3 px-4 font-sans font-medium text-slate-700">
                              Average inference latency
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {benchmark.qsvm.avg_inference_latency_ms} ms
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {benchmark.classical_svm.avg_inference_latency_ms} ms
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Required Caption */}
              <p className="text-xs text-slate-600">
                Measured on the held-out test split.
              </p>
            </div>
          )}
        </section>

        {/* Section 4: Limitations (Honest, visible section) */}
        <section id="limitations" className="py-14 border-t border-[#99F6E4]/70 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-[#134E4A]">Scope and limitations</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Key technical constraints, methodological boundaries, and failure modes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIMITATIONS.map((lim, idx) => (
              <div
                key={idx}
                className="p-4 bg-white border border-[#99F6E4] rounded-xl space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                  <h3 className="text-sm font-semibold text-[#134E4A]">
                    {lim.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-3.5">
                  {lim.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Team */}
        <section id="team" className="py-14 border-t border-[#99F6E4]/70 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold text-[#134E4A]">{TEAM_NAME}</h2>
            <span className="text-xs font-mono text-[#0F766E]">
              Academic project contributors
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TEAM_MEMBERS.map((member, idx) => (
              <div
                key={idx}
                className="p-4 bg-white border border-[#99F6E4] rounded-xl space-y-1.5"
              >
                <h3 className="text-sm font-semibold text-[#134E4A]">
                  {member.name}
                </h3>
                <span className="text-xs font-mono text-[#0F766E] block font-medium">
                  {member.role}
                </span>
                {member.note && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {member.note}
                  </p>
                )}
              </div>
            ))}
          </div>

          {COLLEGE_LOGO_SLOT.enabled && (
            <div className="p-4 bg-white border border-[#99F6E4] rounded-xl flex items-center justify-between text-xs text-slate-600">
              <span>{COLLEGE_LOGO_SLOT.institutionName}</span>
              {COLLEGE_LOGO_SLOT.logoUrl && (
                <img
                  src={COLLEGE_LOGO_SLOT.logoUrl}
                  alt={COLLEGE_LOGO_SLOT.institutionName}
                  className="h-8 object-contain"
                />
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#99F6E4]/70 bg-[#F0FDFA] py-8 px-4 sm:px-8 mt-12">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="space-y-1 text-center sm:text-left">
            <div>{FOOTER.copyright}</div>
            <div className="font-semibold text-slate-700">{FOOTER.disclaimer}</div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={onNavigatePrivacy}
              className="text-[#0F766E] hover:text-[#134E4A] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={onNavigateTerms}
              className="text-[#0F766E] hover:text-[#134E4A] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
