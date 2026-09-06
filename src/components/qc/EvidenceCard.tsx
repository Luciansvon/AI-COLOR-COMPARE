import React, { useState } from 'react';
import { ROIItem, MeasuredEvidence, EstimatedRecommendation, ROIDecision } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, ShieldAlert, Check, X } from 'lucide-react';

interface EvidenceCardProps {
  roi: ROIItem;
  measured?: MeasuredEvidence;
  estimated?: EstimatedRecommendation;
  operatorDecision?: ROIDecision;
  onOperatorDecision: (roiId: string, decision: 'PASS' | 'FAIL') => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  roi,
  measured,
  estimated,
  operatorDecision,
  onOperatorDecision,
  isSelected,
  onSelect,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const isNoMaster = roi.role === 'guardrail_only';

  return (
    <div
      onClick={onSelect}
      className={`border rounded-xl p-4 transition-all cursor-pointer ${
        isSelected
          ? 'border-amber-500/80 bg-studio-900 ring-2 ring-amber-500/20 shadow-md'
          : 'border-studio-800 bg-studio-900/60 hover:bg-studio-900/90'
      }`}
    >
      {/* Header Kartu ROI */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold text-white">{roi.name}</h4>
            {isNoMaster ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Guardrail (Tanpa Master)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-800 text-studio-400 border border-studio-700">
                Master-Backed
              </span>
            )}
          </div>
          <p className="text-xs text-studio-400 mt-0.5">
            {isNoMaster
              ? 'Area pembanding non-kayu untuk memastikan koreksi tidak merusak bahan ini.'
              : 'Dibandingkan langsung terhadap papan master kayu fisik studio.'}
          </p>
        </div>

        {/* Status Rekomendasi Sistem (Bagi Master-Backed) */}
        {!isNoMaster && estimated && (
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                estimated.status === 'sesuai'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : estimated.status === 'perlu_dicek'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
            >
              {estimated.status === 'sesuai' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {estimated.status === 'perlu_dicek' && <AlertTriangle className="w-3.5 h-3.5" />}
              {estimated.status === 'tidak_sesuai' && <XCircle className="w-3.5 h-3.5" />}
              {estimated.label}
            </span>
            <div className="text-[10px] text-studio-400 mt-1 font-mono">
              Keyakinan: <span className="text-studio-200">{estimated.confidence}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bagian Area No-Master (Sesuai REQ-NOMASTER-001) */}
      {isNoMaster && (
        <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/30 text-xs text-sky-200 flex items-start gap-2 mb-3">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Perlindungan Kualitas:</span> Area ini tidak memiliki sampel master kayu, sehingga sistem tidak menetapkan status Lolos/Gagal pada bahan ini. Area ini diawasi agar koreksi warna tidak membuatnya terlalu terang atau rusak.
          </div>
        </div>
      )}

      {/* Tafsiran Bahasa Manusia (Estimated Explanation) */}
      {!isNoMaster && estimated && (
        <div className="p-3 rounded-lg bg-studio-950/70 border border-studio-800/60 mb-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-studio-400 text-[11px] font-medium uppercase tracking-wider">
              Kemungkinan Penyebab:
            </span>
            <span className="font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded text-[11px] border border-amber-500/20">
              {estimated.primaryCause}
            </span>
          </div>
          <p className="text-studio-300 leading-relaxed">{estimated.explanation}</p>
        </div>
      )}

      {/* Bukti Terukur (Measured Evidence) - Sesuai REQ-OUTPUT-001 */}
      {measured && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-studio-400 mb-2 flex items-center justify-between">
            <span>Bukti Terukur (Measured Evidence)</span>
            <span className="text-[10px] text-studio-500 lowercase font-normal">data pasti tanpa tebakan</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-800/60">
              <div className="text-[10px] text-studio-400">Selisih Warna (ΔE00)</div>
              <div className={`text-base font-mono font-bold mt-0.5 ${
                measured.deltaE00 <= 2.2
                  ? 'text-emerald-400'
                  : measured.deltaE00 <= 4.5
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {measured.deltaE00}
              </div>
            </div>

            <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-800/60">
              <div className="text-[10px] text-studio-400">Selisih Kecerahan</div>
              <div className="text-base font-mono font-bold text-studio-200 mt-0.5">
                {measured.brightnessDiffPercent > 0 ? `+${measured.brightnessDiffPercent}%` : `${measured.brightnessDiffPercent}%`}
              </div>
            </div>

            <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-800/60">
              <div className="text-[10px] text-studio-400">Selisih Kontras</div>
              <div className="text-base font-mono font-bold text-studio-200 mt-0.5">
                {measured.contrastDiffPercent > 0 ? `+${measured.contrastDiffPercent}%` : `${measured.contrastDiffPercent}%`}
              </div>
            </div>

            <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-800/60">
              <div className="text-[10px] text-studio-400">Selisih Kepekatan/Saturasi</div>
              <div className="text-base font-mono font-bold text-studio-200 mt-0.5">
                {measured.saturationDiffPercent > 0 ? `+${measured.saturationDiffPercent}%` : `${measured.saturationDiffPercent}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Peringatan Clipping (Jika Terlalu Gelap / Silau) */}
      {measured?.clippingWarning?.highlightClipped && (
        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Area ini terdeteksi terlalu silau / cahaya terpotong (Highlight Clipping).</span>
        </div>
      )}

      {/* Progressive Disclosure: Detail Teknis (REQ-UI-004) */}
      {measured && (
        <div className="mb-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTechnicalDetails(!showTechnicalDetails);
            }}
            className="flex items-center space-x-1.5 text-xs text-studio-400 hover:text-studio-200 font-medium transition-colors"
          >
            <span>{showTechnicalDetails ? 'Tutup Detail Teknis' : 'Lihat Detail Teknis (Lab & Rincian)'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechnicalDetails && (
            <div className="mt-2 p-3 bg-studio-950 rounded-lg border border-studio-800 font-mono text-xs text-studio-300 grid grid-cols-3 gap-2">
              <div>
                <span className="text-studio-500 text-[10px] block">ΔL* (Terang-Gelap):</span>
                <span className="font-semibold text-studio-100">{measured.deltaL > 0 ? `+${measured.deltaL}` : measured.deltaL}</span>
              </div>
              <div>
                <span className="text-studio-500 text-[10px] block">Δa* (Merah-Hijau):</span>
                <span className="font-semibold text-studio-100">{measured.deltaA > 0 ? `+${measured.deltaA}` : measured.deltaA}</span>
              </div>
              <div>
                <span className="text-studio-500 text-[10px] block">Δb* (Kuning-Biru):</span>
                <span className="font-semibold text-studio-100">{measured.deltaB > 0 ? `+${measured.deltaB}` : measured.deltaB}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keputusan Operator Per-ROI (REQ-QC-001) */}
      {!isNoMaster && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-3 border-t border-studio-800/80 flex items-center justify-between"
        >
          <span className="text-xs text-studio-400 font-medium">
            Keputusan Operator:
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOperatorDecision(roi.id, 'PASS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                operatorDecision?.decision === 'PASS'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-studio-800 text-studio-300 hover:bg-emerald-500/20 hover:text-emerald-300 border border-studio-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              PASS (Lolos)
            </button>

            <button
              onClick={() => onOperatorDecision(roi.id, 'FAIL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                operatorDecision?.decision === 'FAIL'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-studio-800 text-studio-300 hover:bg-rose-500/20 hover:text-rose-300 border border-studio-700'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              FAIL (Gagal)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
