import React, { useRef, useState, useEffect } from 'react';
import { ROIItem, ROIBox, EstimatedRecommendation } from '../../types';
import {
  ShieldCheck,
  Eye,
  Sparkles,
  Upload,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Crosshair,
  Move,
} from 'lucide-react';

interface InteractiveImageViewerProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  rois?: ROIItem[];
  selectedRoiId?: string;
  onSelectRoi?: (id: string) => void;
  onUpdateRoiBox?: (id: string, newBox: ROIBox, isFinal?: boolean) => void;
  roiEstimations?: Record<string, EstimatedRecommendation>;
  isMaster?: boolean;
  isPreviewingCorrection?: boolean;
  onUploadImage?: (file: File) => void;
  uploadButtonText?: string;
  isEditableRoi?: boolean;
}

const SUPPORTED_UPLOAD_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_UPLOAD_EXTENSION = /\.(jpe?g|png|webp)$/i;

function validateUploadFile(file: File): string | null {
  if (SUPPORTED_UPLOAD_MIME.has(file.type) || SUPPORTED_UPLOAD_EXTENSION.test(file.name)) {
    return null;
  }

  return 'Format ini belum bisa diproses langsung. Gunakan JPG, PNG, atau WebP. RAW harus melalui decoder native terlebih dahulu.';
}

type DragState =
  | { type: 'pan'; startX: number; startY: number; initialPan: { x: number; y: number } }
  | {
      type: 'roi-move';
      roiId: string;
      startX: number;
      startY: number;
      initialBox: ROIBox;
      wrapperRect: DOMRect;
    }
  | {
      type: 'roi-resize';
      roiId: string;
      handle: 'tl' | 'tr' | 'bl' | 'br';
      startX: number;
      startY: number;
      initialBox: ROIBox;
      wrapperRect: DOMRect;
    }
  | {
      type: 'draw';
      startXPercent: number;
      startYPercent: number;
      wrapperRect: DOMRect;
    };

export const InteractiveImageViewer: React.FC<InteractiveImageViewerProps> = ({
  title,
  subtitle,
  imageSrc,
  rois = [],
  selectedRoiId,
  onSelectRoi,
  onUpdateRoiBox,
  roiEstimations = {},
  isMaster = false,
  isPreviewingCorrection = false,
  onUploadImage,
  uploadButtonText = 'Pilih Foto (JPG / PNG / WebP)',
  isEditableRoi = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputId = isMaster ? 'master-file-input' : 'product-file-input';

  // Status Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mode Alat Interaktif: 'select' (Pilih/Geser Kotak), 'pan' (Geser Foto), 'draw' (Tarik Kotak Baru)
  const [toolMode, setToolMode] = useState<'select' | 'pan' | 'draw'>('select');

  // Status Dragging Mouse & Ref Kotak Terakhir
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeDragBox, setActiveDragBox] = useState<{ id: string; box: ROIBox } | null>(null);
  const [drawingBox, setDrawingBox] = useState<ROIBox | null>(null);
  const lastBoxRef = useRef<{ id: string; box: ROIBox } | null>(null);

  const onUpdateRoiBoxRef = useRef(onUpdateRoiBox);
  onUpdateRoiBoxRef.current = onUpdateRoiBox;
  const roisRef = useRef(rois);
  roisRef.current = rois;
  const selectedRoiIdRef = useRef(selectedRoiId);
  selectedRoiIdRef.current = selectedRoiId;

  // Reset zoom & pan saat gambar berganti
  useEffect(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    setDrawingBox(null);
  }, [imageSrc]);

  // Handler Zoom
  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(4.0, Math.round((z + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => {
      const next = Math.max(1.0, Math.round((z - 0.25) * 100) / 100);
      if (next === 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((z) => Math.min(4.0, Math.round((z + 0.25) * 100) / 100));
    } else {
      setZoomLevel((z) => {
        const next = Math.max(1.0, Math.round((z - 0.25) * 100) / 100);
        if (next === 1.0) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        setUploadError(validationError);
      } else {
        setUploadError(null);
        onUploadImage(file);
      }
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onUploadImage) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        setUploadError(validationError);
      } else {
        setUploadError(null);
        onUploadImage(file);
      }
    }
  };

  const handleStartMoveBox = (e: React.MouseEvent, roi: ROIItem) => {
    if (!isEditableRoi || toolMode === 'pan' || toolMode === 'draw') return;
    e.preventDefault();
    e.stopPropagation();

    if (!imageWrapperRef.current) return;
    const wrapperRect = imageWrapperRef.current.getBoundingClientRect();

    if (onSelectRoi) onSelectRoi(roi.id);

    lastBoxRef.current = { id: roi.id, box: { ...roi.box } };
    setActiveDragBox({ id: roi.id, box: { ...roi.box } });
    setDragState({
      type: 'roi-move',
      roiId: roi.id,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...roi.box },
      wrapperRect,
    });
  };

  const handleStartResize = (
    e: React.MouseEvent,
    roiId: string,
    handle: 'tl' | 'tr' | 'bl' | 'br',
    currentBox: ROIBox
  ) => {
    if (!isEditableRoi) return;
    e.preventDefault();
    e.stopPropagation();

    if (!imageWrapperRef.current) return;
    const wrapperRect = imageWrapperRef.current.getBoundingClientRect();

    if (onSelectRoi) onSelectRoi(roiId);

    lastBoxRef.current = { id: roiId, box: { ...currentBox } };
    setActiveDragBox({ id: roiId, box: { ...currentBox } });
    setDragState({
      type: 'roi-resize',
      roiId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...currentBox },
      wrapperRect,
    });
  };

  const handleMouseDownOnContainer = (e: React.MouseEvent) => {
    if (!imageSrc) return;

    if (toolMode === 'pan' || (zoomLevel > 1.0 && toolMode !== 'draw')) {
      e.preventDefault();
      setDragState({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialPan: { ...panOffset },
      });
      return;
    }

    if (toolMode === 'draw' && imageWrapperRef.current && isEditableRoi) {
      e.preventDefault();
      const rect = imageWrapperRef.current.getBoundingClientRect();
      const startXPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const startYPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      setDrawingBox({
        x: Number(startXPercent.toFixed(1)),
        y: Number(startYPercent.toFixed(1)),
        width: 0,
        height: 0,
      });

      setDragState({
        type: 'draw',
        startXPercent,
        startYPercent,
        wrapperRect: rect,
      });
    }
  };

  useEffect(() => {
    if (!dragState) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      if (dragState.type === 'pan') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setPanOffset({
          x: dragState.initialPan.x + dx,
          y: dragState.initialPan.y + dy,
        });
        return;
      }

      if (dragState.type === 'roi-move') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const dPercentX = (dx / dragState.wrapperRect.width) * 100;
        const dPercentY = (dy / dragState.wrapperRect.height) * 100;

        const newX = Math.max(0, Math.min(100 - dragState.initialBox.width, dragState.initialBox.x + dPercentX));
        const newY = Math.max(0, Math.min(100 - dragState.initialBox.height, dragState.initialBox.y + dPercentY));

        const updatedBox: ROIBox = {
          ...dragState.initialBox,
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1)),
        };

        lastBoxRef.current = { id: dragState.roiId, box: updatedBox };
        setActiveDragBox({ id: dragState.roiId, box: updatedBox });
        return;
      }

      if (dragState.type === 'roi-resize') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const dPercentX = (dx / dragState.wrapperRect.width) * 100;
        const dPercentY = (dy / dragState.wrapperRect.height) * 100;

        let { x, y, width, height } = dragState.initialBox;
        const minSize = 4;

        if (dragState.handle === 'br') {
          width = Math.max(minSize, Math.min(100 - x, dragState.initialBox.width + dPercentX));
          height = Math.max(minSize, Math.min(100 - y, dragState.initialBox.height + dPercentY));
        } else if (dragState.handle === 'tr') {
          const proposedY = dragState.initialBox.y + dPercentY;
          const clampedY = Math.max(0, Math.min(dragState.initialBox.y + dragState.initialBox.height - minSize, proposedY));
          height = dragState.initialBox.height + (dragState.initialBox.y - clampedY);
          y = clampedY;
          width = Math.max(minSize, Math.min(100 - x, dragState.initialBox.width + dPercentX));
        } else if (dragState.handle === 'bl') {
          const proposedX = dragState.initialBox.x + dPercentX;
          const clampedX = Math.max(0, Math.min(dragState.initialBox.x + dragState.initialBox.width - minSize, proposedX));
          width = dragState.initialBox.width + (dragState.initialBox.x - clampedX);
          x = clampedX;
          height = Math.max(minSize, Math.min(100 - y, dragState.initialBox.height + dPercentY));
        } else if (dragState.handle === 'tl') {
          const proposedX = dragState.initialBox.x + dPercentX;
          const clampedX = Math.max(0, Math.min(dragState.initialBox.x + dragState.initialBox.width - minSize, proposedX));
          width = dragState.initialBox.width + (dragState.initialBox.x - clampedX);
          x = clampedX;
          const proposedY = dragState.initialBox.y + dPercentY;
          const clampedY = Math.max(0, Math.min(dragState.initialBox.y + dragState.initialBox.height - minSize, proposedY));
          height = dragState.initialBox.height + (dragState.initialBox.y - clampedY);
          y = clampedY;
        }

        const updatedBox: ROIBox = {
          x: Number(x.toFixed(1)),
          y: Number(y.toFixed(1)),
          width: Number(width.toFixed(1)),
          height: Number(height.toFixed(1)),
        };

        lastBoxRef.current = { id: dragState.roiId, box: updatedBox };
        setActiveDragBox({ id: dragState.roiId, box: updatedBox });
        return;
      }

      if (dragState.type === 'draw') {
        const currPercentX = Math.max(0, Math.min(100, ((e.clientX - dragState.wrapperRect.left) / dragState.wrapperRect.width) * 100));
        const currPercentY = Math.max(0, Math.min(100, ((e.clientY - dragState.wrapperRect.top) / dragState.wrapperRect.height) * 100));

        const x = Math.min(dragState.startXPercent, currPercentX);
        const y = Math.min(dragState.startYPercent, currPercentY);
        const width = Math.abs(currPercentX - dragState.startXPercent);
        const height = Math.abs(currPercentY - dragState.startYPercent);

        setDrawingBox({
          x: Number(x.toFixed(1)),
          y: Number(y.toFixed(1)),
          width: Number(width.toFixed(1)),
          height: Number(height.toFixed(1)),
        });
      }
    };

    const handleGlobalMouseUp = () => {
      // Jika baru selesai menggeser atau mengubah ukuran kotak, kirim pembaruan final
      if (lastBoxRef.current && onUpdateRoiBoxRef.current) {
        onUpdateRoiBoxRef.current(lastBoxRef.current.id, lastBoxRef.current.box, true);
        lastBoxRef.current = null;
      }
      setActiveDragBox(null);

      if (dragState.type === 'draw' && drawingBox) {
        if (drawingBox.width >= 3 && drawingBox.height >= 3) {
          const targetRoiId = selectedRoiIdRef.current || roisRef.current[0]?.id;
          if (targetRoiId && onUpdateRoiBoxRef.current) {
            onUpdateRoiBoxRef.current(targetRoiId, drawingBox, true);
          }
        }
        setDrawingBox(null);
        setToolMode('select');
      }

      setDragState(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState, drawingBox]);

  return (
    <div className="flex flex-col bg-studio-900 border border-studio-800 rounded-2xl overflow-hidden shadow-xl">
      <input
        type="file"
        id={inputId}
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Panel */}
      <div className="px-4 py-3 border-b border-studio-800 flex flex-wrap items-center justify-between gap-2 bg-studio-900/90">
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
          {isMaster ? (
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-studio-100 truncate">
              {title}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-studio-400 truncate max-w-[200px] sm:max-w-md" title={subtitle}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isPreviewingCorrection && (
            <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 animate-pulse">
              <Sparkles className="w-3 h-3" />
              Preview Koreksi
            </span>
          )}

          {/* Kontrol Zoom & Alat Interaktif */}
          {imageSrc && (
            <div className="flex items-center space-x-1 bg-studio-950 px-2 py-1 rounded-xl border border-studio-800 text-xs">
              <span className="font-mono text-[11px] text-amber-300 font-bold px-1.5">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                type="button"
                id={`btn-zoom-out-${inputId}`}
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1.0}
                title="Perkecil Tampilan (-)"
                className="p-1 rounded-lg hover:bg-studio-800 text-studio-300 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id={`btn-zoom-in-${inputId}`}
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4.0}
                title="Perbesar Tampilan (+)"
                className="p-1 rounded-lg hover:bg-studio-800 text-studio-300 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id={`btn-zoom-reset-${inputId}`}
                onClick={handleResetZoom}
                title="Kembalikan ke Ukuran Normal (Pas Layar)"
                className="px-1.5 py-0.5 rounded-lg hover:bg-studio-800 text-studio-400 hover:text-white text-[10px] font-medium flex items-center gap-1 transition"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Reset</span>
              </button>

              {isEditableRoi && (
                <>
                  <div className="w-[1px] h-3.5 bg-studio-800 mx-1" />

                  <button
                    type="button"
                    id={`btn-tool-select-${inputId}`}
                    onClick={() => setToolMode('select')}
                    title="Pilih & Geser Kotak Area Kayu"
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${
                      toolMode === 'select'
                        ? 'bg-amber-500 text-black font-bold shadow-sm'
                        : 'text-studio-400 hover:text-white hover:bg-studio-800'
                    }`}
                  >
                    <Move className="w-3 h-3" />
                    <span>Geser Area</span>
                  </button>

                  <button
                    type="button"
                    id={`btn-tool-draw-${inputId}`}
                    onClick={() => setToolMode('draw')}
                    title="Tarik Kotak Baru Bebas di Foto"
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${
                      toolMode === 'draw'
                        ? 'bg-amber-500 text-black font-bold shadow-sm ring-2 ring-amber-500/30'
                        : 'text-studio-400 hover:text-white hover:bg-studio-800'
                    }`}
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Tarik Kotak</span>
                  </button>

                  {zoomLevel > 1.0 && (
                    <button
                      type="button"
                      id={`btn-tool-pan-${inputId}`}
                      onClick={() => setToolMode('pan')}
                      title="Geser Tampilan Foto Saat Diperbesar"
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${
                        toolMode === 'pan'
                          ? 'bg-sky-500 text-black font-bold shadow-sm'
                          : 'text-studio-400 hover:text-white hover:bg-studio-800'
                      }`}
                    >
                      <Hand className="w-3 h-3" />
                      <span>Geser Foto</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {onUploadImage && imageSrc && (
            <label
              htmlFor={inputId}
              className="px-2.5 py-1 rounded-xl bg-studio-800 hover:bg-studio-700 border border-studio-700 text-studio-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Ganti Foto</span>
            </label>
          )}
        </div>
      </div>

      {/* Image & ROI Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDownOnContainer}
        className={`relative aspect-[16/10] max-h-[350px] min-h-[190px] sm:min-h-[240px] bg-studio-950 flex items-center justify-center overflow-hidden select-none ${
          toolMode === 'draw'
            ? 'cursor-crosshair'
            : toolMode === 'pan' || (zoomLevel > 1.0 && dragState?.type === 'pan')
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-default'
        }`}
      >
        {imageSrc ? (
          <div
            ref={imageWrapperRef}
            className="relative inline-flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: dragState ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <img
              src={imageSrc}
              alt={title}
              className="max-w-full max-h-full block object-contain pointer-events-none select-none"
              draggable={false}
            />

            {/* Overlay Kotak-Kotak Area (ROI) */}
            {rois.map((roi) => {
              const isSelected = selectedRoiId === roi.id;
              const est = roiEstimations[roi.id];
              const isNoMaster = roi.role === 'guardrail_only';

              let borderColor = 'border-amber-400/90';
              let bgColor = 'bg-amber-400/10';
              let badgeBg = 'bg-amber-500 text-black';

              if (isNoMaster) {
                borderColor = 'border-sky-400/90';
                bgColor = 'bg-sky-400/10';
                badgeBg = 'bg-sky-600 text-white';
              } else if (est) {
                if (est.status === 'sesuai') {
                  borderColor = 'border-emerald-400/90';
                  bgColor = 'bg-emerald-400/15';
                  badgeBg = 'bg-emerald-500 text-black';
                } else if (est.status === 'perlu_dicek') {
                  borderColor = 'border-amber-400/90';
                  bgColor = 'bg-amber-400/15';
                  badgeBg = 'bg-amber-500 text-black';
                } else {
                  borderColor = 'border-rose-400/90';
                  bgColor = 'bg-rose-400/15';
                  badgeBg = 'bg-rose-500 text-white';
                }
              }

              const displayBox = activeDragBox && activeDragBox.id === roi.id ? activeDragBox.box : roi.box;

              return (
                <div
                  key={roi.id}
                  onMouseDown={(e) => handleStartMoveBox(e, { ...roi, box: displayBox })}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectRoi) onSelectRoi(roi.id);
                  }}
                  style={{
                    left: `${displayBox.x}%`,
                    top: `${displayBox.y}%`,
                    width: `${displayBox.width}%`,
                    height: `${displayBox.height}%`,
                  }}
                  className={`absolute transition-colors border-2 rounded ${borderColor} ${bgColor} ${
                    isEditableRoi && toolMode !== 'pan' ? 'cursor-move' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'ring-4 ring-amber-400/40 shadow-2xl z-20 scale-[1.005]'
                      : 'hover:border-white/90 z-10'
                  }`}
                >
                  {/* Lencana Nama Area */}
                  <div
                    className={`absolute -top-3 left-1 px-1.5 py-0.2 rounded text-[10px] font-bold tracking-tight shadow-md flex items-center gap-1 ${badgeBg}`}
                  >
                    <span>{roi.name}</span>
                    {isNoMaster && <span className="text-[9px] opacity-80">(Guardrail)</span>}
                  </div>

                  {/* 4 Titik Pegangan Sudut (Corner Resize Handles) untuk Area Terpilih */}
                  {isSelected && isEditableRoi && toolMode !== 'pan' && (
                    <>
                      {/* Titik Kiri Atas (TL) */}
                      <div
                        onMouseDown={(e) => handleStartResize(e, roi.id, 'tl', displayBox)}
                        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize shadow-lg hover:scale-125 z-30 transition-transform"
                        title="Tarik sudut untuk ubah ukuran area"
                      />
                      {/* Titik Kanan Atas (TR) */}
                      <div
                        onMouseDown={(e) => handleStartResize(e, roi.id, 'tr', displayBox)}
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize shadow-lg hover:scale-125 z-30 transition-transform"
                        title="Tarik sudut untuk ubah ukuran area"
                      />
                      {/* Titik Kiri Bawah (BL) */}
                      <div
                        onMouseDown={(e) => handleStartResize(e, roi.id, 'bl', displayBox)}
                        className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize shadow-lg hover:scale-125 z-30 transition-transform"
                        title="Tarik sudut untuk ubah ukuran area"
                      />
                      {/* Titik Kanan Bawah (BR) */}
                      <div
                        onMouseDown={(e) => handleStartResize(e, roi.id, 'br', displayBox)}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize shadow-lg hover:scale-125 z-30 transition-transform"
                        title="Tarik sudut untuk ubah ukuran area"
                      />

                      {/* Panduan Arah Geser */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="bg-black/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-amber-500/40">
                          <Move className="w-3 h-3" /> Geser Kotak
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Kotak Sementara saat Menggambar Baru (Draw Mode) */}
            {drawingBox && (
              <div
                style={{
                  left: `${drawingBox.x}%`,
                  top: `${drawingBox.y}%`,
                  width: `${drawingBox.width}%`,
                  height: `${drawingBox.height}%`,
                }}
                className="absolute border-2 border-dashed border-amber-400 bg-amber-400/20 rounded z-30 pointer-events-none"
              >
                <div className="absolute -top-3 left-1 px-1.5 py-0.2 rounded bg-amber-400 text-black text-[10px] font-bold">
                  Area Baru ({drawingBox.width}% × {drawingBox.height}%)
                </div>
              </div>
            )}
          </div>
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 border-2 border-dashed transition cursor-pointer group ${
              isDraggingFile
                ? 'border-amber-400 bg-amber-500/20'
                : 'border-studio-700 hover:border-amber-500/80 bg-studio-950/60'
            }`}
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-studio-900 border border-studio-800 group-hover:border-amber-500/50 flex items-center justify-center text-studio-400 group-hover:text-amber-400 mb-2 sm:mb-3.5 transition shadow-inner">
              <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-studio-100 group-hover:text-amber-300 text-center px-2">
              {uploadButtonText}
            </span>
            <div className="mt-2 sm:mt-2.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-[11px] font-semibold group-hover:bg-amber-500 group-hover:text-black transition shadow-sm">
              Klik untuk Pilih Berkas Foto
            </div>
            <span className="text-[10px] sm:text-[11px] text-studio-500 mt-1.5 sm:mt-2 text-center px-2">
              Mendukung JPG, PNG, dan WebP.
            </span>
          </label>
        )}
      </div>

      {uploadError && (
        <div className="px-4 py-2.5 bg-rose-950/40 border-t border-rose-500/30 text-[11px] text-rose-300">
          {uploadError}
        </div>
      )}

      {/* Footer Bantuan Interaktif */}
      {imageSrc && (
        <div className="px-4 py-2 bg-studio-950/90 border-t border-studio-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-studio-400">
          <div className="flex items-center space-x-1.5">
            <span className="text-amber-400 font-bold">💡 Tips:</span>
            <span>
              {toolMode === 'draw'
                ? 'Tahan dan tarik mouse di atas foto untuk menandai area kayu baru yang mau dicek.'
                : isEditableRoi
                ? 'Gunakan tombol (+) (-) atau scroll mouse untuk perbesar foto. Geser kotak kuning atau tarik sudutnya ke bagian kayu yang diinginkan.'
                : 'Gunakan tombol (+) (-) atau scroll mouse untuk perbesar foto acuan.'}
            </span>
          </div>

          {zoomLevel > 1.0 && (
            <span className="text-studio-500 font-mono text-[10px] shrink-0">
              {toolMode === 'pan'
                ? '🖐️ Tahan & geser mouse untuk menggeser foto'
                : 'Foto diperbesar — Anda bisa geser tampilan foto'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
