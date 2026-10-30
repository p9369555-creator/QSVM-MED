// File: frontend/src/components/MedicalScanViewer.tsx
// Research-grade 2D slice viewer with interactive Heatmap toggle, Show/Hide Coordinates, and light teal controls.

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Crosshair,
  Sliders,
  Move,
  Eye,
  CheckCircle,
  AlertCircle,
  Target,
} from 'lucide-react';

interface TumorCoordinatePoint {
  x: number;
  y: number;
  norm_x: number;
  norm_y: number;
}

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  width: number;
  height: number;
  norm_x_min: number;
  norm_y_min: number;
  norm_x_max: number;
  norm_y_max: number;
}

interface LesionFocus {
  focus_id: number;
  center: TumorCoordinatePoint;
  bounding_box: BoundingBox;
  area_pixels: number;
  diameter_pixels: number;
  peak_intensity: number;
  anatomical_region: string;
  hemisphere: string;
  cranial_quadrant: string;
  contour_points?: number[][];
  norm_contour_points?: number[][];
}

interface TumorCoordinatesData {
  detected: boolean;
  status: string;
  primary_lesion: LesionFocus | null;
  all_foci: LesionFocus[];
  normal_reference_focus?: LesionFocus | null;
  brain_centroid?: TumorCoordinatePoint;
  total_foci_count: number;
}

export interface MedicalScanViewerProps {
  previewUrl: string | null;
  resultData: any | null;
  showHeatmap: boolean;
  setShowHeatmap: (val: boolean) => void;
  showCoordinates: boolean;
  setShowCoordinates: (val: boolean) => void;
  heatmapOpacity: number;
  setHeatmapOpacity: (val: number) => void;
  viewMode: 'overlay' | 'original' | 'heatmap_only';
  setViewMode: (mode: 'overlay' | 'original' | 'heatmap_only') => void;
  focusTrigger?: number;
  selectedFile?: File | null;
}

export const MedicalScanViewer: React.FC<MedicalScanViewerProps> = ({
  previewUrl,
  resultData,
  showHeatmap,
  setShowHeatmap,
  showCoordinates,
  setShowCoordinates,
  heatmapOpacity,
  setHeatmapOpacity,
  viewMode,
  setViewMode,
  focusTrigger,
  selectedFile,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [uploadTimestamp, setUploadTimestamp] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Update upload timestamp when a new file is uploaded
  useEffect(() => {
    if (selectedFile) {
      const now = new Date();
      setUploadTimestamp(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } else {
      setUploadTimestamp(null);
    }
  }, [selectedFile]);

  // Extract coordinates data from result
  const tumorCoordinates: TumorCoordinatesData | null =
    resultData?.tumor_coordinates || resultData?.explainability?.tumor_coordinates || null;
  const primaryLesion: LesionFocus | null = tumorCoordinates?.primary_lesion || null;
  const isTumorPredicted: boolean =
    resultData?.predicted_class === 'Tumor Cell' ||
    resultData?.predicted_class === 'Tumor' ||
    Boolean(tumorCoordinates?.detected);

  const origWidth =
    resultData?.explainability?.original_width ||
    imageRef.current?.naturalWidth ||
    (previewUrl ? 512 : 'None');
  const origHeight =
    resultData?.explainability?.original_height ||
    imageRef.current?.naturalHeight ||
    (previewUrl ? 512 : 'None');

  const origWidthNum = typeof origWidth === 'number' ? origWidth : 512;
  const origHeightNum = typeof origHeight === 'number' ? origHeight : 512;

  // Real file metadata
  const fileExt = useMemo(() => {
    if (!selectedFile?.name) return 'None';
    const parts = selectedFile.name.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() : 'None';
  }, [selectedFile]);

  const fileSizeKb = useMemo(() => {
    if (!selectedFile?.size) return 'None';
    return (selectedFile.size / 1024).toFixed(1);
  }, [selectedFile]);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(6.0, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(0.75, Number((prev - 0.25).toFixed(2)));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  // Center & zoom in onto primary hotspot/lesion if available
  const handleFocusOnLesion = useCallback(() => {
    if (!primaryLesion) return;
    const normX = primaryLesion.center.norm_x;
    const normY = primaryLesion.center.norm_y;
    const targetZoom = 2.25;

    if (containerRef.current && imageRef.current) {
      const imgWidth = imageRef.current.clientWidth;
      const imgHeight = imageRef.current.clientHeight;

      const offsetX = -(normX - 0.5) * imgWidth * targetZoom;
      const offsetY = -(normY - 0.5) * imgHeight * targetZoom;

      setZoomLevel(targetZoom);
      setPan({ x: offsetX, y: offsetY });
    } else {
      setZoomLevel(targetZoom);
    }
  }, [primaryLesion]);

  useEffect(() => {
    if (focusTrigger && primaryLesion) {
      handleFocusOnLesion();
    }
  }, [focusTrigger, primaryLesion, handleFocusOnLesion]);

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, [previewUrl]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomStep = e.deltaY < 0 ? 0.2 : -0.2;
    setZoomLevel((prev) => {
      const next = Math.max(0.75, Math.min(6.0, Number((prev + zoomStep).toFixed(2))));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Pan / Drag handling
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`bg-white border border-[#99F6E4] rounded-xl shadow-xs flex flex-col overflow-hidden w-full transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative'
      }`}
    >
      {/* Viewer Header / Toolbar */}
      <div className="px-4 py-3 border-b border-[#99F6E4]/70 bg-[#F0FDFA] flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-[#99F6E4] text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setViewMode('overlay');
                setShowHeatmap(true);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'overlay'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#134E4A] hover:bg-[#CCFBF1]/40'
              }`}
            >
              Overlay
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('original');
                setShowHeatmap(false);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'original'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#134E4A] hover:bg-[#CCFBF1]/40'
              }`}
            >
              MRI Scan
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('heatmap_only');
                setShowHeatmap(true);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'heatmap_only'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#134E4A] hover:bg-[#CCFBF1]/40'
              }`}
            >
              Heatmap
            </button>
          </div>

          {/* Real Prediction Badge */}
          {resultData ? (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                isTumorPredicted
                  ? 'bg-rose-50 text-[#B91C1C] border-rose-200'
                  : 'bg-emerald-50 text-[#15803D] border-emerald-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isTumorPredicted ? 'bg-[#B91C1C]' : 'bg-[#15803D]'
                }`}
              />
              <span>
                {isTumorPredicted ? 'Prediction: Tumor' : 'Prediction: No tumor'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono hidden sm:inline">
              Waiting for scan
            </div>
          )}
        </div>

        {/* Center: Interactive Heatmap Toggle & Show/Hide Coordinates Button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Heatmap Checkbox / Toggle Button */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#134E4A] hover:text-[#0F766E] bg-white px-2.5 py-1 rounded-lg border border-[#99F6E4] shadow-xs transition-colors">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => {
                setShowHeatmap(e.target.checked);
                if (e.target.checked && viewMode === 'original') {
                  setViewMode('overlay');
                }
              }}
              className="rounded border-[#99F6E4] text-[#0F766E] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
              Heatmap
            </span>
          </label>

          {/* Show / Hide Coordinates Toggle Button */}
          <button
            type="button"
            onClick={() => setShowCoordinates(!showCoordinates)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
              showCoordinates
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white text-[#134E4A] border-[#99F6E4] hover:bg-[#CCFBF1]/40'
            }`}
            title="Toggle spatial coordinates & sensitivity hotspot markers"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{showCoordinates ? 'Hide Coordinates' : 'Show Coordinates'}</span>
          </button>

          {/* Heatmap Opacity Slider */}
          {showHeatmap && viewMode !== 'original' && (
            <div className="hidden md:flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#99F6E4] shadow-xs">
              <Sliders className="w-3 h-3 text-[#0F766E]" />
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
                title={`Heatmap Opacity: ${Math.round(heatmapOpacity * 100)}%`}
              />
              <span className="text-[10px] text-slate-600 w-7 font-mono font-medium">
                {Math.round(heatmapOpacity * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Right: Zoom & Viewer Tools */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#99F6E4] text-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.75}
            className="p-1.5 text-slate-600 hover:text-[#0F766E] hover:bg-[#CCFBF1]/40 rounded-md disabled:opacity-30 transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-0.5 min-w-[48px] text-center font-mono text-xs text-[#0F766E] font-medium hover:bg-[#CCFBF1]/30 rounded cursor-pointer"
            title="Reset zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 6.0}
            className="p-1.5 text-slate-600 hover:text-[#0F766E] hover:bg-[#CCFBF1]/40 rounded-md disabled:opacity-30 transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#99F6E4] mx-0.5" />

          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 text-slate-600 hover:text-[#0F766E] hover:bg-[#CCFBF1]/40 rounded-md transition-colors cursor-pointer"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {primaryLesion && (
            <button
              type="button"
              onClick={handleFocusOnLesion}
              className="p-1.5 text-[#B91C1C] hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              title="Focus directly on primary lesion center"
            >
              <Target className="w-3.5 h-3.5 animate-pulse" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-600 hover:text-[#0F766E] hover:bg-[#CCFBF1]/40 rounded-md transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`relative flex-grow flex items-center justify-center bg-[#070B11] overflow-hidden select-none ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'min-h-[460px] max-h-[600px]'
        } ${zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        style={{ touchAction: 'none' }}
      >
        {/* Real Corner Readout */}
        {previewUrl && (
          <>
            {/* Top-Left: Clean File & Matrix Readout */}
            <div className="absolute top-3 left-3 pointer-events-none font-mono text-[10px] text-slate-300 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-700/60 z-10 shadow-xs flex items-center gap-2">
              <span>FILE: {selectedFile?.name || 'None'}</span>
              <span className="text-slate-500">•</span>
              <span>{origWidth} × {origHeight} px</span>
            </div>

            {/* Bottom-Right: 2D Slice Viewer Badge */}
            <div className="absolute bottom-3 right-3 pointer-events-none font-mono text-[10px] text-teal-300 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-teal-700/60 z-10 flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-teal-400" />
              <span>2D slice viewer</span>
            </div>
          </>
        )}

        {previewUrl ? (
          <div
            className="relative transition-transform duration-75 ease-out select-none will-change-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Base MRI Image */}
            <img
              ref={imageRef}
              src={previewUrl}
              alt="Brain MRI Slice"
              draggable={false}
              className={`max-h-[55vh] max-w-full object-contain pointer-events-none select-none rounded shadow-xl ${
                viewMode === 'heatmap_only' ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {/* Sensitivity Map Layer */}
            {resultData?.explainability?.heatmap_base64 &&
              showHeatmap &&
              viewMode !== 'original' && (
                <img
                  src={resultData.explainability.heatmap_base64}
                  alt="Model Sensitivity Heatmap"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none rounded mix-blend-screen"
                  style={{
                    opacity: viewMode === 'heatmap_only' ? 1.0 : heatmapOpacity,
                  }}
                />
              )}

            {/* Precision SVG Overlay for Coordinates & Hotspots (only rendered when tumor is detected) */}
            {showCoordinates && isTumorPredicted && (
              <svg
                viewBox={`0 0 ${origWidthNum} ${origHeightNum}`}
                className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-visible"
              >
                <defs>
                  <filter id="tumorGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Primary Lesion Annotations & Bounding Box */}
                {primaryLesion && (
                  <g className="tumor-annotation-group">
                    {/* Lesion Contour Polygon */}
                    {primaryLesion.contour_points && primaryLesion.contour_points.length > 2 && (
                      <polygon
                        points={primaryLesion.contour_points.map((pt) => `${pt[0]},${pt[1]}`).join(' ')}
                        fill="rgba(185, 28, 28, 0.18)"
                        stroke="#B91C1C"
                        strokeWidth={Math.max(1.5, origWidthNum / 350)}
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Bounding Box with Corner Calipers */}
                    {primaryLesion.bounding_box && (
                      <g>
                        <rect
                          x={primaryLesion.bounding_box.x_min}
                          y={primaryLesion.bounding_box.y_min}
                          width={primaryLesion.bounding_box.width}
                          height={primaryLesion.bounding_box.height}
                          fill="none"
                          stroke="#B91C1C"
                          strokeWidth={Math.max(1.8, origWidthNum / 300)}
                          strokeDasharray="5 3"
                          filter="url(#tumorGlow)"
                        />

                        {(() => {
                          const { x_min, y_min, x_max, y_max } = primaryLesion.bounding_box;
                          const cLen = Math.min(18, Math.max(8, origWidthNum * 0.03));
                          const sw = Math.max(2.2, origWidthNum / 250);
                          return (
                            <g stroke="#38BDF8" strokeWidth={sw} fill="none">
                              <polyline points={`${x_min},${y_min + cLen} ${x_min},${y_min} ${x_min + cLen},${y_min}`} />
                              <polyline points={`${x_max - cLen},${y_min} ${x_max},${y_min} ${x_max},${y_min + cLen}`} />
                              <polyline points={`${x_min},${y_max - cLen} ${x_min},${y_max} ${x_min + cLen},${y_max}`} />
                              <polyline points={`${x_max - cLen},${y_max} ${x_max},${y_max} ${x_max},${y_max - cLen}`} />
                            </g>
                          );
                        })()}
                      </g>
                    )}

                    {/* Centroid Reticle / Crosshair */}
                    <g filter="url(#tumorGlow)">
                      <circle
                        cx={primaryLesion.center.x}
                        cy={primaryLesion.center.y}
                        r={Math.max(16, origWidthNum * 0.045)}
                        fill="none"
                        stroke="#B91C1C"
                        strokeWidth="1.6"
                      />
                      <circle
                        cx={primaryLesion.center.x}
                        cy={primaryLesion.center.y}
                        r={Math.max(6, origWidthNum * 0.018)}
                        fill="rgba(185, 28, 28, 0.25)"
                        stroke="#38BDF8"
                        strokeWidth="1.2"
                      />
                      <line
                        x1={primaryLesion.center.x - Math.max(22, origWidthNum * 0.06)}
                        y1={primaryLesion.center.y}
                        x2={primaryLesion.center.x + Math.max(22, origWidthNum * 0.06)}
                        y2={primaryLesion.center.y}
                        stroke="#38BDF8"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={primaryLesion.center.x}
                        y1={primaryLesion.center.y - Math.max(22, origWidthNum * 0.06)}
                        x2={primaryLesion.center.x}
                        y2={primaryLesion.center.y + Math.max(22, origWidthNum * 0.06)}
                        stroke="#38BDF8"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={primaryLesion.center.x}
                        cy={primaryLesion.center.y}
                        r="3.5"
                        fill="#B91C1C"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    </g>

                    {/* Floating Coordinate Badge */}
                    {(() => {
                      const fontSize = Math.max(11, origWidthNum * 0.024);
                      const text = `TUMOR [X: ${primaryLesion.center.x}, Y: ${primaryLesion.center.y}] • ${primaryLesion.bounding_box?.width || 0}×${primaryLesion.bounding_box?.height || 0}px`;
                      const badgeW = text.length * (fontSize * 0.62);
                      const badgeH = fontSize * 1.8;

                      // Smart boundary clamping & flipping if near the top
                      let badgeX = primaryLesion.bounding_box?.x_min ?? (primaryLesion.center.x - badgeW / 2);
                      badgeX = Math.max(8, Math.min(origWidthNum - badgeW - 8, badgeX));

                      const boxYMin = primaryLesion.bounding_box?.y_min ?? primaryLesion.center.y;
                      const boxYMax = primaryLesion.bounding_box?.y_max ?? primaryLesion.center.y;
                      let badgeY = boxYMin - 8;
                      if (badgeY - badgeH < 6) {
                        badgeY = boxYMax + badgeH + 8;
                      }
                      badgeY = Math.max(badgeH + 6, Math.min(origHeightNum - 6, badgeY));

                      return (
                        <g>
                          <rect
                            x={badgeX}
                            y={badgeY - badgeH + 4}
                            width={badgeW}
                            height={badgeH}
                            rx="4"
                            fill="#0B1120"
                            stroke="#B91C1C"
                            strokeWidth="1.2"
                            opacity="0.94"
                          />
                          <text
                            x={badgeX + 8}
                            y={badgeY - 2}
                            fill="#ffffff"
                            fontSize={fontSize}
                            fontFamily="monospace"
                            fontWeight="600"
                          >
                            <tspan fill="#B91C1C">● </tspan>
                            {text}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* Secondary Satellite Foci */}
                {tumorCoordinates?.all_foci &&
                  tumorCoordinates.all_foci.slice(1).map((focus, idx) => (
                    <g key={idx} opacity="0.85">
                      <circle
                        cx={focus.center.x}
                        cy={focus.center.y}
                        r={Math.max(12, origWidthNum * 0.035)}
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="1.4"
                        strokeDasharray="3 2"
                      />
                      <circle cx={focus.center.x} cy={focus.center.y} r="2.5" fill="#38BDF8" />
                      <text
                        x={focus.center.x + 14}
                        y={focus.center.y + 4}
                        fill="#38BDF8"
                        fontSize={Math.max(10, origWidthNum * 0.02)}
                        fontFamily="monospace"
                      >
                        Satellite #{focus.focus_id} [X: {focus.center.x}, Y: {focus.center.y}]
                      </text>
                    </g>
                  ))}

                {/* Hotspot Markers from real quantum_heatmap */}
                {!primaryLesion &&
                  Array.isArray(resultData?.quantum_heatmap) &&
                  resultData.quantum_heatmap.map((spot: any, idx: number) => {
                    const cx = (spot.norm_x ?? 0.5) * origWidthNum;
                    const cy = (spot.norm_y ?? 0.5) * origHeightNum;
                    const r = Math.max(14, origWidthNum * 0.045);
                    return (
                      <g key={idx}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill="rgba(185, 28, 28, 0.12)"
                          stroke={idx === 0 ? '#B91C1C' : '#0F766E'}
                          strokeWidth="1.6"
                          strokeDasharray="4 2"
                        />
                        <circle cx={cx} cy={cy} r="3" fill="#B91C1C" />
                        <line x1={cx - r - 6} y1={cy} x2={cx + r + 6} y2={cy} stroke="#38BDF8" strokeWidth="1" />
                        <line x1={cx} y1={cy - r - 6} x2={cx} y2={cy + r + 6} stroke="#38BDF8" strokeWidth="1" />
                        <text
                          x={cx + r + 6}
                          y={cy + 4}
                          fill="#FFFFFF"
                          fontSize={Math.max(10, origWidthNum * 0.022)}
                          fontFamily="monospace"
                        >
                          Spot #{idx + 1} [X: {Math.round(cx)}, Y: {Math.round(cy)}]
                        </text>
                      </g>
                    );
                  })}
              </svg>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-sans text-xs gap-3">
            <Layers className="w-8 h-8 text-teal-600/60" />
            <span className="text-slate-300 font-medium">Awaiting brain MRI slice upload</span>
            <span className="text-[11px] text-slate-500 font-mono">
              JPEG, PNG, or DICOM supported
            </span>
          </div>
        )}

        {/* Pan Hint */}
        {zoomLevel > 1 && (
          <div className="absolute bottom-12 left-4 bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-md px-2.5 py-1 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 pointer-events-none z-10">
            <Move className="w-3 h-3 text-teal-400" />
            <span>Click & drag to pan • Scroll to zoom</span>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-2.5 bg-[#F0FDFA] border-t border-[#99F6E4]/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600">
        <div className="flex items-center gap-3">
          <span>Resolution: {origWidth} × {origHeight} px</span>
          <span className="text-[#99F6E4]">|</span>
          <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
        </div>

        {primaryLesion ? (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-[#B91C1C] animate-ping" />
            <span className="text-slate-600 font-sans">Lesion coordinates:</span>
            <span className="text-[#B91C1C] font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              X: {primaryLesion.center.x} px, Y: {primaryLesion.center.y} px
            </span>
            {primaryLesion.anatomical_region && (
              <span className="text-slate-500 hidden md:inline">
                ({primaryLesion.anatomical_region})
              </span>
            )}
          </div>
        ) : resultData ? (
          <div
            className={`flex items-center gap-1.5 text-xs font-sans font-medium ${
              isTumorPredicted ? 'text-[#B91C1C]' : 'text-[#15803D]'
            }`}
          >
            {isTumorPredicted ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-[#B91C1C]" />
                <span>Model output: Tumor</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Model output: No tumor</span>
              </>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 font-sans">Ready for scan input</span>
        )}
      </div>
    </div>
  );
};

export default MedicalScanViewer;
