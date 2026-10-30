// File: frontend/src/components/TumorCoordinatesCard.tsx
// Restyled research card displaying model sensitivity peaks with data honesty.

import React, { useState } from 'react';
import {
  Crosshair,
  Compass,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

interface TumorCoordinatesCardProps {
  resultData: any | null;
  onFocusLesion?: () => void;
}

export const TumorCoordinatesCard: React.FC<TumorCoordinatesCardProps> = ({
  resultData,
}) => {
  const [showSecondaryFoci, setShowSecondaryFoci] = useState<boolean>(false);

  if (!resultData) return null;

  const hotspots = Array.isArray(resultData.quantum_heatmap) ? resultData.quantum_heatmap : [];
  const primarySpot = hotspots.length > 0 ? hotspots[0] : null;
  const secondarySpots = hotspots.slice(1);

  const isTumorPredicted =
    resultData.predicted_class === 'Tumor Cell' ||
    resultData.predicted_class === 'Tumor' ||
    Boolean(resultData.tumor_coordinates?.detected);

  const normalProb = resultData.probabilities?.normal !== undefined
    ? (resultData.probabilities.normal * 100).toFixed(1)
    : ((1 - (resultData.confidence || 0.5)) * 100).toFixed(1);

  const tumorProb = resultData.probabilities?.tumor !== undefined
    ? (resultData.probabilities.tumor * 100).toFixed(1)
    : ((resultData.confidence || 0.5) * 100).toFixed(1);

  const displayProb = isTumorPredicted ? tumorProb : normalProb;

  // Real lesion focus from tumor coordinates (only populated when a tumor is confirmed)
  const lesionCenter = isTumorPredicted
    ? (resultData.tumor_coordinates?.primary_lesion?.center || primarySpot)
    : null;
  const lesionRadius = isTumorPredicted
    ? (resultData.tumor_coordinates?.primary_lesion?.diameter_pixels
        ? Math.round(resultData.tumor_coordinates.primary_lesion.diameter_pixels / 2)
        : primarySpot?.radius)
    : null;
  const lesionBoundingBox = isTumorPredicted
    ? resultData.tumor_coordinates?.primary_lesion?.bounding_box
    : null;
  const activeIntensity = isTumorPredicted ? primarySpot?.intensity : null;
  const activeSecondarySpots = isTumorPredicted ? secondarySpots : [];

  const brainCentroid =
    resultData.tumor_coordinates?.brain_centroid ||
    resultData.explainability?.brain_centroid ||
    null;

  return (
    <div className="p-5 space-y-4 font-sans text-xs border border-[#99F6E4] bg-white rounded-xl shadow-xs w-full overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#99F6E4]/70 pb-3">
        <div className="flex items-center gap-2">
          <Crosshair
            className={`w-4 h-4 ${isTumorPredicted ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}
          />
          <h2 className="text-xs font-semibold text-[#134E4A] uppercase tracking-wider font-mono">
            Model sensitivity peaks
          </h2>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            isTumorPredicted
              ? 'bg-rose-50 text-[#B91C1C] border-rose-200'
              : 'bg-emerald-50 text-[#15803D] border-emerald-200'
          }`}
        >
          {isTumorPredicted ? 'Peak sensitivity active' : 'No tumor detected'}
        </span>
      </div>

      {/* Grid of Peak Properties */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
        {/* Centroid Coordinate */}
        <div className="bg-[#F0FDFA] p-3 rounded-lg border border-[#99F6E4]/70 min-w-0">
          <span className="text-[10px] text-slate-500 uppercase block mb-1 font-sans font-medium">
            Centroid (X, Y)
          </span>
          <div className="text-sm font-semibold text-[#134E4A] truncate">
            {lesionCenter ? (
              <>
                X: {lesionCenter.x} <span className="text-[#99F6E4]">|</span> Y: {lesionCenter.y}
              </>
            ) : (
              'None'
            )}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
            {lesionCenter?.norm_x !== undefined
              ? `Norm: (${(lesionCenter.norm_x * 100).toFixed(1)}%, ${(lesionCenter.norm_y * 100).toFixed(1)}%)`
              : 'None'}
          </span>
        </div>

        {/* Spot Span */}
        <div className="bg-[#F0FDFA] p-3 rounded-lg border border-[#99F6E4]/70 min-w-0">
          <span className="text-[10px] text-slate-500 uppercase block mb-1 font-sans font-medium">
            Hotspot Span (W × H)
          </span>
          <div className="text-sm font-semibold text-[#0F766E] truncate">
            {lesionBoundingBox ? (
              `${lesionBoundingBox.width} × ${lesionBoundingBox.height} px`
            ) : lesionRadius ? (
              `${lesionRadius * 2} × ${lesionRadius * 2} px`
            ) : (
              'None'
            )}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
            {lesionBoundingBox ? (
              `Area: ~${lesionBoundingBox.width * lesionBoundingBox.height} px²`
            ) : lesionRadius ? (
              `Area: ~${Math.round(Math.PI * lesionRadius * lesionRadius)} px²`
            ) : (
              'None'
            )}
          </span>
        </div>

        {/* Box Bounds */}
        <div className="bg-[#F0FDFA] p-3 rounded-lg border border-[#99F6E4]/70 min-w-0">
          <span className="text-[10px] text-slate-500 uppercase block mb-1 font-sans font-medium">
            Bounds [Xmin, Xmax]
          </span>
          <div className="text-xs font-medium text-slate-700 truncate">
            {lesionBoundingBox ? (
              `X: [${lesionBoundingBox.x_min}, ${lesionBoundingBox.x_max}]`
            ) : lesionRadius && lesionCenter ? (
              `X: [${Math.max(0, lesionCenter.x - lesionRadius)}, ${lesionCenter.x + lesionRadius}]`
            ) : (
              'None'
            )}
          </div>
          <div className="text-xs font-medium text-slate-700 mt-0.5 truncate">
            {lesionBoundingBox ? (
              `Y: [${lesionBoundingBox.y_min}, ${lesionBoundingBox.y_max}]`
            ) : lesionRadius && lesionCenter ? (
              `Y: [${Math.max(0, lesionCenter.y - lesionRadius)}, ${lesionCenter.y + lesionRadius}]`
            ) : (
              'None'
            )}
          </div>
        </div>

        {/* Peak Sensitivity */}
        <div className="bg-[#F0FDFA] p-3 rounded-lg border border-[#99F6E4]/70 min-w-0">
          <span className="text-[10px] text-slate-500 uppercase block mb-1 font-sans font-medium">
            Peak Sensitivity
          </span>
          <div className="text-sm font-semibold text-[#134E4A] truncate">
            {activeIntensity !== null && activeIntensity !== undefined ? (
              `${(activeIntensity * 100).toFixed(1)}%`
            ) : (
              'None'
            )}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
            {lesionRadius ? `Radius: ~${lesionRadius} px` : 'None'}
          </span>
        </div>
      </div>

      {/* Prediction Summary Block */}
      <div
        className={`p-3.5 rounded-lg border flex items-start gap-3 ${
          isTumorPredicted
            ? 'bg-rose-50/60 border-rose-200 text-slate-700'
            : 'bg-emerald-50/60 border-emerald-200 text-slate-700'
        }`}
      >
        {isTumorPredicted ? (
          <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
        )}
        <div className="text-xs leading-relaxed">
          <strong
            className={`block mb-0.5 font-semibold ${
              isTumorPredicted ? 'text-[#B91C1C]' : 'text-[#15803D]'
            }`}
          >
            {isTumorPredicted
              ? `Tumor predicted (${displayProb}% probability)`
              : `No tumor predicted (${displayProb}% probability)`}
          </strong>
          <span className="text-slate-600 text-[11px]">
            {isTumorPredicted
              ? 'The simulated 8 qubit quantum kernel evaluated the slice projection against the support vectors. Occlusion sensitivity highlights regions influencing model confidence.'
              : 'The simulated 8 qubit quantum kernel and baseline analysis confirm normal neuro cranial baseline with no focal pathological mass.'}
          </span>
        </div>
      </div>

      {/* Cranial Baseline Symmetry Origin */}
      <div className="p-3 bg-[#F0FDFA] rounded-lg border border-[#99F6E4]/70 flex justify-between items-center text-xs font-mono">
        <span className="text-slate-600 font-sans">Cranial Baseline Symmetry Origin X/Y:</span>
        <span className="text-[#134E4A] font-semibold">
          {brainCentroid ? `X: ${brainCentroid.x} px, Y: ${brainCentroid.y} px` : 'None'}
        </span>
      </div>

      {/* Secondary Hotspot Accordion (only for detected lesions) */}
      {activeSecondarySpots.length > 0 && (
        <div className="border border-[#99F6E4]/70 rounded-lg overflow-hidden font-mono">
          <button
            type="button"
            onClick={() => setShowSecondaryFoci(!showSecondaryFoci)}
            className="w-full px-3 py-2 bg-[#F0FDFA] hover:bg-[#CCFBF1]/40 flex items-center justify-between text-left text-xs text-[#134E4A] transition-colors"
          >
            <span className="flex items-center gap-1.5 font-sans font-medium">
              <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
              Additional sensitivity peaks ({activeSecondarySpots.length})
            </span>
            {showSecondaryFoci ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {showSecondaryFoci && (
            <div className="p-3 bg-white space-y-2 border-t border-[#99F6E4]/70 text-xs">
              {activeSecondarySpots.map((spot: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#F0FDFA] border border-[#99F6E4]/50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[#0F766E] font-semibold mr-2">Spot #{idx + 2}</span>
                    <span className="text-slate-700">
                      X: {spot.x} px, Y: {spot.y} px
                    </span>
                    {spot.radius && (
                      <span className="text-slate-500 ml-2">
                        (Radius: {spot.radius} px)
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[#0F766E] font-semibold">
                      {(spot.intensity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TumorCoordinatesCard;
