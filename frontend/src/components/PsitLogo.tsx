// File: frontend/src/components/PsitLogo.tsx
import React from 'react';

interface PsitLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  onClick?: () => void;
}

export const PsitLogo: React.FC<PsitLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  onClick,
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const titleSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const subtitleSize = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[11px]' : 'text-[10px]';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      title="Pranveer Singh Institute of Technology (PSIT), Kanpur"
    >
      {/* Official-style PSIT Emblem SVG */}
      <div className={`relative ${iconSize} flex-shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#0c1829] via-[#0E1114] to-[#1a1208] border border-[#F59E0B]/50 shadow-md shadow-[#F59E0B]/10 p-1`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Shield Border */}
          <path
            d="M 50 5 L 88 20 C 88 55 68 85 50 95 C 32 85 12 55 12 20 Z"
            fill="#0A0D14"
            stroke="#F59E0B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Inner Accent Infill */}
          <path
            d="M 50 12 L 82 25 C 82 52 65 77 50 86 C 35 77 18 52 18 25 Z"
            fill="rgba(245, 158, 11, 0.08)"
            stroke="#D97706"
            strokeWidth="1.2"
          />

          {/* Academic Laurel / Gear Motif */}
          <circle
            cx="50"
            cy="46"
            r="22"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />

          {/* Quantum Orbiting Ring (representing PSIT Quantum Research) */}
          <ellipse
            cx="50"
            cy="46"
            rx="26"
            ry="9"
            transform="rotate(-25 50 46)"
            stroke="#38BDF8"
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />

          {/* Torch / Flame & Book of Knowledge */}
          <path
            d="M 50 26 C 52 32 56 35 50 44 C 44 35 48 32 50 26 Z"
            fill="#F59E0B"
          />
          <path
            d="M 40 52 C 45 49 48 50 50 53 C 52 50 55 49 60 52 L 60 58 C 55 55 52 56 50 59 C 48 56 45 55 40 58 Z"
            fill="#E5E7EB"
          />

          {/* "PSIT" Monogram in Shield */}
          <text
            x="50"
            y="72"
            fill="#F59E0B"
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
            letterSpacing="1"
          >
            PSIT
          </text>

          {/* "KANPUR" Banner at base */}
          <rect x="26" y="78" width="48" height="9" rx="2" fill="#F59E0B" />
          <text
            x="50"
            y="85"
            fill="#050607"
            fontSize="6.5"
            fontWeight="900"
            fontFamily="monospace"
            textAnchor="middle"
            letterSpacing="1"
          >
            KANPUR
          </text>
        </svg>

        {/* Live amber pulse dot */}
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F59E0B] border-2 border-[#050607] animate-pulse" />
      </div>

      {/* Brand Text Details */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`${titleSize} font-bold text-white font-mono tracking-wider flex items-center gap-1.5`}>
            PSIT <span className="text-[#F59E0B]">KANPUR</span>
          </span>
          <span className="px-1.5 py-0.2 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 text-[9px] font-mono font-bold uppercase tracking-wider hidden sm:inline">
            ESTD. 2004
          </span>
        </div>
        {showSubtitle && (
          <span className={`${subtitleSize} text-[#9CA3AF] font-sans leading-tight mt-0.5`}>
            Pranveer Singh Institute of Technology • <span className="text-[#D1D5DB] font-mono text-[10px]">Quantum Research</span>
          </span>
        )}
      </div>
    </div>
  );
};
