// File: frontend/src/components/ResultLimitsCard.tsx
// Honest, restrained disclaimer on the technical limits of the screening result.

import React from 'react';

export const ResultLimitsCard: React.FC = () => {
  return (
    <div className="bg-white border border-[#99F6E4] rounded-xl p-4 space-y-2.5 text-xs text-slate-700 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
        <h3 className="font-semibold text-[#134E4A]">Limits of this result</h3>
      </div>

      <ul className="space-y-1.5 text-slate-600 text-[11px] leading-relaxed list-disc list-inside">
        <li>
          <strong className="text-slate-700 font-medium">Simulated 8-qubit kernel:</strong> The quantum feature map runs via statevector simulation on classical processors, not physical quantum hardware.
        </li>
        <li>
          <strong className="text-slate-700 font-medium">8 features only:</strong> Input images are downsampled and reduced via PCA to 8 continuous values, omitting fine spatial textures.
        </li>
        <li>
          <strong className="text-slate-700 font-medium">Single 2D slice:</strong> The model evaluates one cross-sectional image and does not incorporate full 3D volumetric context.
        </li>
        <li>
          <strong className="text-slate-700 font-medium">Not a medical device:</strong> This software is an exploratory research prototype for academic evaluation, not a clinical diagnostic tool.
        </li>
      </ul>
    </div>
  );
};
