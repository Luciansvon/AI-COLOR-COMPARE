import React from 'react';
import { ROIItem, EstimatedRecommendation } from '../../types';
import { ShieldCheck, Eye, Sparkles } from 'lucide-react';

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
}) => {
  return (
    <div className="flex flex-col bg-studio-900 border border-studio-800 rounded-xl overflow-hidden shadow-lg">
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

        {isPreviewingCorrection && (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 animate-pulse">
            <Sparkles className="w-3 h-3" />
            Preview Koreksi Aktif
          </span>
        )}
      </div>

      {/* Image & ROI Container */}
      <div className="relative aspect-[4/3] bg-studio-950 flex items-center justify-center overflow-hidden select-none">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-xs text-studio-500">Memuat gambar studio...</div>
        )}

        {/* Overlay Kotak ROI */}
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
              onClick={() => onSelectRoi && onSelectRoi(roi.id)}
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
      </div>
    </div>
  );
};
