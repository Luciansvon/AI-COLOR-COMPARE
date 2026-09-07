import React, { useEffect, useRef } from 'react';
import { CorrectionParams, CorrectionConflict } from '../../types';
import { Sliders, AlertOctagon, Sparkles, RotateCcw, Download, Eye, EyeOff } from 'lucide-react';

interface CorrectionPanelProps {
  params: CorrectionParams;
  recommended: CorrectionParams;
  conflict: CorrectionConflict;
  onChangeParams: (newParams: CorrectionParams) => void;
  onApplyRecommended: () => void;
  onReset: () => void;
  isPreviewing: boolean;
  onTogglePreview: () => void;
  onExportJpeg: () => void;
}

const hasCorrection = (params: CorrectionParams) =>
  params.temperatureK !== 0 ||
  params.tint !== 0 ||
  params.exposureEV !== 0 ||
  params.brightness !== 0 ||
  params.contrast !== 0 ||
  params.saturation !== 0;

export const CorrectionPanel: React.FC<CorrectionPanelProps> = ({
  params,
  recommended,
  conflict,
  onChangeParams,
  onApplyRecommended,
  onReset,
  isPreviewing,
  onTogglePreview,
  onExportJpeg,
}) => {
  const lastAutoAppliedRecommendation = useRef('');

  const updateField = (field: keyof CorrectionParams, value: number) => {
    onChangeParams({ ...params, [field]: value });
  };

  const hasAnyCorrection = hasCorrection(params);
  const hasRecommendedCorrection = hasCorrection(recommended);
  const recommendedKey = JSON.stringify(recommended);

  // Pulihkan perilaku v0.3.4: saran baru mengisi slider sekali setelah perbandingan.
  // Jika operator menekan Reset atau mengubah slider manual, nilainya tidak dipaksa balik lagi.
  useEffect(() => {
    if (conflict.hasConflict || !hasRecommendedCorrection) {
      lastAutoAppliedRecommendation.current = '';
      return;
    }

    if (!hasAnyCorrection && lastAutoAppliedRecommendation.current !== recommendedKey) {
      lastAutoAppliedRecommendation.current = recommendedKey;
      onChangeParams({ ...recommended });
    }
  }, [recommendedKey, recommended, conflict.hasConflict, hasAnyCorrection, hasRecommendedCorrection, onChangeParams]);

  return (
    <div className="bg-studio-900 border border-studio-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-studio-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Simulasi Koreksi Foto</h3>
            <p className="text-xs text-studio-400">
              Slider aktif mengikuti saran terakhir dan dipakai sama untuk preview serta ekspor JPEG.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasAnyCorrection && (
            <button
              onClick={onReset}
              className="text-xs text-studio-400 hover:text-studio-200 px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-700 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

          <button
            onClick={onTogglePreview}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              isPreviewing
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-studio-800 hover:bg-studio-700 text-studio-200 border border-studio-700'
            }`}
          >
            {isPreviewing ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isPreviewing ? 'Sedang Preview Koreksi' : 'Preview Koreksi'}
          </button>
        </div>
      </div>

      {conflict.hasConflict && conflict.details && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-rose-400">
            <AlertOctagon className="w-4 h-4" />
            <span>SARAN OTOMATIS DITAHAN</span>
          </div>
          <p className="text-rose-300 leading-relaxed">{conflict.details.reason}</p>
          <div className="text-[11px] text-rose-400/80 mt-1 font-mono">
            Saran: Jangan memaksakan koreksi global satu gambar. Periksa pencahayaan studio setempat atau pastikan lot kayu kedua bagian tidak berbeda.
          </div>
        </div>
      )}

      {!conflict.hasConflict && (
        <div className="bg-studio-950 p-3 rounded-lg border border-studio-800/80 flex items-center justify-between">
          <div className="text-xs text-studio-300">
            <span className="font-semibold text-amber-300">Saran Sistem: </span>
            {recommended.temperatureK !== 0 && `Suhu ${recommended.temperatureK > 0 ? `+${recommended.temperatureK}` : recommended.temperatureK} K, `}
            {recommended.tint !== 0 && `Hijau–Magenta ${recommended.tint > 0 ? '+' : ''}${recommended.tint}, `}
            {recommended.exposureEV !== 0 && `Eksposur ${recommended.exposureEV > 0 ? `+${recommended.exposureEV}` : recommended.exposureEV} EV, `}
            {recommended.brightness !== 0 && `Brightness ${recommended.brightness > 0 ? '+' : ''}${recommended.brightness}, `}
            {recommended.contrast !== 0 && `Kontras ${recommended.contrast > 0 ? '+' : ''}${recommended.contrast}, `}
            {recommended.saturation !== 0 && `Saturasi ${recommended.saturation > 0 ? `+${recommended.saturation}` : recommended.saturation}%`}
            {!hasRecommendedCorrection && 'Tidak ada penyesuaian pratinjau yang disarankan.'}
          </div>
          <button
            onClick={onApplyRecommended}
            className="text-xs font-semibold px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black transition flex items-center gap-1 shrink-0 ml-2"
          >
            <Sparkles className="w-3 h-3" />
            Terapkan Saran
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Suhu Warna (K)</span>
            <span className="font-mono text-studio-200">
              {params.temperatureK > 0 ? `+${params.temperatureK}` : params.temperatureK} K
            </span>
          </div>
          <input
            aria-label="Suhu warna simulasi"
            type="range"
            min="-800"
            max="800"
            step="1"
            value={params.temperatureK}
            onChange={(e) => updateField('temperatureK', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500 font-mono">
            <span>Lebih Dingin/Biru</span>
            <span>Lebih Hangat/Kuning</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Hijau–Magenta</span>
            <span className="font-mono text-studio-200">{params.tint > 0 ? '+' : ''}{params.tint}</span>
          </div>
          <input
            aria-label="Hijau–Magenta simulasi"
            type="range"
            min="-100"
            max="100"
            step="1"
            value={params.tint}
            onChange={(e) => updateField('tint', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500">
            <span>Lebih Hijau</span><span>Lebih Magenta</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Eksposur (EV)</span>
            <span className="font-mono text-studio-200">
              {params.exposureEV > 0 ? `+${params.exposureEV}` : params.exposureEV} EV
            </span>
          </div>
          <input
            aria-label="Eksposur simulasi"
            type="range"
            min="-1.5"
            max="1.5"
            step="0.01"
            value={params.exposureEV}
            onChange={(e) => updateField('exposureEV', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500 font-mono">
            <span>Lebih Gelap</span>
            <span>Lebih Terang</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Brightness</span>
            <span className="font-mono text-studio-200">{params.brightness > 0 ? '+' : ''}{params.brightness}</span>
          </div>
          <input
            aria-label="Brightness simulasi"
            type="range"
            min="-50"
            max="50"
            step="1"
            value={params.brightness}
            onChange={(e) => updateField('brightness', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500">
            <span>Lebih Gelap</span><span>Lebih Terang</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Kontras</span>
            <span className="font-mono text-studio-200">{params.contrast > 0 ? '+' : ''}{params.contrast}</span>
          </div>
          <input
            aria-label="Kontras simulasi"
            type="range"
            min="-50"
            max="50"
            step="1"
            value={params.contrast}
            onChange={(e) => updateField('contrast', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500">
            <span>Lebih Flat</span><span>Lebih Tegas</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Saturasi (%)</span>
            <span className="font-mono text-studio-200">
              {params.saturation > 0 ? `+${params.saturation}` : params.saturation}%
            </span>
          </div>
          <input
            aria-label="Saturasi simulasi"
            type="range"
            min="-50"
            max="50"
            step="1"
            value={params.saturation}
            onChange={(e) => updateField('saturation', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500 font-mono">
            <span>Meredup</span>
            <span>Maju/Pekat</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-studio-800 flex items-center justify-between">
        <div className="text-[11px] text-studio-400">
          <span className="font-medium text-studio-300">Prinsip Keaslian:</span> Berkas asli kamera tidak disentuh. Preview dan ekspor memakai parameter koreksi aktif yang sama.
        </div>

        <button
          onClick={onExportJpeg}
          className="px-4 py-2 rounded-lg bg-studio-800 hover:bg-studio-700 text-studio-100 text-xs font-semibold flex items-center gap-2 border border-studio-700 transition"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          Ekspor JPEG Terkoreksi (sRGB)
        </button>
      </div>
    </div>
  );
};
