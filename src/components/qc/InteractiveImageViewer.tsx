import React, { useRef, useState } from 'react';
import { ROIItem, EstimatedRecommendation } from '../../types';
import { ShieldCheck, Eye, Sparkles, Upload, RefreshCw } from 'lucide-react';

interface InteractiveImageViewerProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  rois?: ROIItem[];
  selectedRoiId?: string;
  onSelectRoi?: (id: string) => void;
  roiEstimations?: Record<string, EstimatedRecommendation>;
  isMaster?: boolean;
  isPreviewingCorrection?: boolean;
  onUploadImage?: (file: File) => void;
  uploadButtonText?: string;
}

export const InteractiveImageViewer: React.FC<InteractiveImageViewerProps> = ({
  title,
  subtitle,
  imageSrc,
  rois = [],
  selectedRoiId,
  onSelectRoi,
  roiEstimations = {},
  isMaster = false,
  isPreviewingCorrection = false,
  onUploadImage,
  uploadButtonText = 'Pilih Foto (JPG / RAW)',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputId = isMaster ? 'master-file-input' : 'product-file-input';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
  };

  return (
    <div className="flex flex-col bg-studio-900 border border-studio-800 rounded-xl overflow-hidden shadow-lg">
      <input
        type="file"
        id={inputId}
        ref={fileInputRef}
        accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png,.cr2,.cr3,.arw,.nef,.raf,.dng,.tiff"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Panel */}
      <div className="px-4 py-3 border-b border-studio-800 flex items-center justify-between bg-studio-900/80">
        <div className="flex items-center space-x-2">
          {isMaster ? (
            <div className="p-1 rounded bg-amber-500/10 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1 rounded bg-sky-500/10 text-sky-400">
              <Eye className="w-4 h-4" />
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-studio-200">
              {title}
            </h3>
            <p className="text-[11px] text-studio-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isPreviewingCorrection && (
            <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 animate-pulse">
              <Sparkles className="w-3 h-3" />
              Preview Koreksi Aktif
            </span>
          )}

          {onUploadImage && imageSrc && (
            <label
              htmlFor={inputId}
              className="px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-700 border border-studio-700 text-studio-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Ganti Foto</span>
            </label>
          )}
        </div>
      </div>

      {/* Image & ROI Container */}
      <div className="relative aspect-[4/3] bg-studio-950 flex items-center justify-center overflow-hidden select-none">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={title}
              className="w-full h-full object-contain"
            />

            {/* Overlay Kotak ROI HANYA dirender jika ada gambar */}
            {rois.map((roi) => {
              const isSelected = selectedRoiId === roi.id;
              const est = roiEstimations[roi.id];
              const isNoMaster = roi.role === 'guardrail_only';

              let borderColor = 'border-amber-400/80';
              let bgColor = 'bg-amber-400/10';
              let badgeBg = 'bg-amber-500 text-black';

              if (isNoMaster) {
                borderColor = 'border-sky-400/80';
                bgColor = 'bg-sky-400/10';
                badgeBg = 'bg-sky-600 text-white';
              } else if (est) {
                if (est.status === 'sesuai') {
                  borderColor = 'border-emerald-400/90';
                  bgColor = 'bg-emerald-400/10';
                  badgeBg = 'bg-emerald-500 text-black';
                } else if (est.status === 'perlu_dicek') {
                  borderColor = 'border-amber-400/90';
                  bgColor = 'bg-amber-400/10';
                  badgeBg = 'bg-amber-500 text-black';
                } else {
                  borderColor = 'border-rose-400/90';
                  bgColor = 'bg-rose-400/10';
                  badgeBg = 'bg-rose-500 text-white';
                }
              }

              return (
                <div
                  key={roi.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectRoi) onSelectRoi(roi.id);
                  }}
                  style={{
                    left: `${roi.box.x}%`,
                    top: `${roi.box.y}%`,
                    width: `${roi.box.width}%`,
                    height: `${roi.box.height}%`,
                  }}
                  className={`absolute cursor-pointer transition-all border-2 rounded ${borderColor} ${bgColor} ${
                    isSelected
                      ? 'ring-4 ring-amber-400/40 shadow-xl z-20 scale-[1.01]'
                      : 'hover:border-white/90 z-10'
                  }`}
                >
                  {/* Badge Label ROI */}
                  <div
                    className={`absolute -top-3 left-1 px-1.5 py-0.2 rounded text-[10px] font-medium tracking-tight shadow-md flex items-center gap-1 ${badgeBg}`}
                  >
                    <span>{roi.name}</span>
                    {isNoMaster && <span className="text-[9px] opacity-80">(Guardrail)</span>}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed transition cursor-pointer group ${
              isDragging
                ? 'border-amber-400 bg-amber-500/20'
                : 'border-studio-700 hover:border-amber-500/80 bg-studio-950/60'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-studio-900 border border-studio-800 group-hover:border-amber-500/50 flex items-center justify-center text-studio-400 group-hover:text-amber-400 mb-3.5 transition shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-studio-100 group-hover:text-amber-300 text-center">
              {uploadButtonText}
            </span>
            <div className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold group-hover:bg-amber-500 group-hover:text-black transition">
              Klik untuk Pilih Berkas Foto
            </div>
            <span className="text-[11px] text-studio-500 mt-2 text-center">
              Mendukung format JPG, JPEG, PNG, dan berkas RAW kamera studio
            </span>
          </label>
        )}
      </div>
    </div>
  );
};
