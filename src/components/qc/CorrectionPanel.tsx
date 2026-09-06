import React from 'react';
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
  const updateField = (field: keyof CorrectionParams, value: number) => {
    onChangeParams({ ...params, [field]: value });
  };

  const hasAnyCorrection =
    params.temperatureK !== 0 ||
    params.tint !== 0 ||
    params.exposureEV !== 0 ||
    params.brightness !== 0 ||
    params.contrast !== 0 ||
    params.saturation !== 0;

  return (
    <div className="bg-studio-900 border border-studio-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header Panel Koreksi */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-studio-800 pb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Rekomendasi Koreksi Warna</h3>
            <p className="text-xs text-studio-400">
              Penyesuaian non-destruktif untuk mendekatkan foto ke master panel
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

      {/* Deteksi Konflik Koreksi (REQ-CONFLICT-001 s/d REQ-CONFLICT-003) */}
      {conflict.hasConflict && conflict.details && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-rose-400">
            <AlertOctagon className="w-4 h-4" />
            <span>KONFLIK KOREKSI TERDETEKSI (Auto-Correct Dinonaktifkan)</span>
          </div>
          <p className="text-rose-300 leading-relaxed">{conflict.details.reason}</p>
          <div className="text-[11px] text-rose-400/80 mt-1 font-mono">
            Saran: Jangan memaksakan koreksi global satu gambar. Periksa pencahayaan studio setempat atau pastikan lot kayu kedua bagian tidak berbeda.
          </div>
        </div>
      )}

      {/* Rekomendasi Nilai Kalkulasi */}
      {!conflict.hasConflict && (
        <div className="bg-studio-950 p-3 rounded-lg border border-studio-800/80 flex items-center justify-between">
          <div className="text-xs text-studio-300">
            <span className="font-semibold text-amber-300">Saran Sistem: </span>
            {recommended.temperatureK !== 0 && `Suhu ${recommended.temperatureK > 0 ? `+${recommended.temperatureK}` : recommended.temperatureK} K, `}
            {recommended.exposureEV !== 0 && `Eksposur ${recommended.exposureEV > 0 ? `+${recommended.exposureEV}` : recommended.exposureEV} EV, `}
            {recommended.saturation !== 0 && `Saturasi ${recommended.saturation > 0 ? `+${recommended.saturation}` : recommended.saturation}%`}
            {recommended.temperatureK === 0 && recommended.exposureEV === 0 && recommended.saturation === 0 && 'Warna sudah sangat dekat dengan master, tidak perlu penyesuaian besar.'}
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

      {/* Kontrol Slider Manual */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
        {/* Suhu Warna (Temperature) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Suhu Warna (K)</span>
            <span className="font-mono text-studio-200">
              {params.temperatureK > 0 ? `+${params.temperatureK}` : params.temperatureK} K
            </span>
          </div>
          <input
            type="range"
            min="-800"
            max="800"
            step="25"
            value={params.temperatureK}
            onChange={(e) => updateField('temperatureK', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500 font-mono">
            <span>Lebih Dingin/Biru</span>
            <span>Lebih Hangat/Kuning</span>
          </div>
        </div>

        {/* Eksposur (EV) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Eksposur (EV)</span>
            <span className="font-mono text-studio-200">
              {params.exposureEV > 0 ? `+${params.exposureEV}` : params.exposureEV} EV
            </span>
          </div>
          <input
            type="range"
            min="-1.5"
            max="1.5"
            step="0.05"
            value={params.exposureEV}
            onChange={(e) => updateField('exposureEV', Number(e.target.value))}
            className="w-full h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-studio-500 font-mono">
            <span>Lebih Gelap</span>
            <span>Lebih Terang</span>
          </div>
        </div>

        {/* Kepekatan / Saturasi */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-studio-300 font-medium">Saturasi (%)</span>
            <span className="font-mono text-studio-200">
              {params.saturation > 0 ? `+${params.saturation}` : params.saturation}%
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="2"
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

      {/* Tombol Ekspor JPEG Non-Destruktif (REQ-EXPORT-001 s/d REQ-EXPORT-005) */}
      <div className="pt-4 border-t border-studio-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="text-[11px] text-studio-400">
          <span className="font-medium text-studio-300">Prinsip Keaslian:</span> Berkas asli (RAW/JPEG) kamera tidak akan pernah disentuh atau ditimpa. Ekspor akan menghasilkan berkas JPEG sRGB baru yang bersih.
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
