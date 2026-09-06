import React, { useState } from 'react';
import { ROIItem, MeasuredEvidence, EstimatedRecommendation, ROIDecision, UnifiedMaterialReport } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, ShieldAlert, Check, X, Sparkles, Compass } from 'lucide-react';

interface EvidenceCardProps {
  roi: ROIItem;
  measured?: MeasuredEvidence;
  estimated?: EstimatedRecommendation;
  unifiedFusion?: UnifiedMaterialReport;
  operatorDecision?: ROIDecision;
  onOperatorDecision: (roiId: string, decision: 'PASS' | 'FAIL') => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  roi,
  measured,
  estimated,
  unifiedFusion,
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
        {!isNoMaster && (unifiedFusion || estimated) && (
          <div className="text-right">
            {unifiedFusion ? (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  unifiedFusion.diagnosisType === 'Conforming'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : unifiedFusion.diagnosisType === 'IlluminationArtifact'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : unifiedFusion.diagnosisType === 'SpeciesOrGrainMismatch'
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {unifiedFusion.diagnosisType === 'Conforming' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {unifiedFusion.diagnosisType === 'IlluminationArtifact' && <Sparkles className="w-3.5 h-3.5" />}
                {unifiedFusion.diagnosisType === 'SpeciesOrGrainMismatch' && <Compass className="w-3.5 h-3.5" />}
                {unifiedFusion.diagnosisType === 'MaterialMismatch' && <XCircle className="w-3.5 h-3.5" />}
                {unifiedFusion.title}
              </span>
            ) : estimated && (
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
            )}
            <div className="text-[10px] text-studio-400 mt-1 font-mono">
              Keyakinan: <span className="text-studio-200">{unifiedFusion?.confidenceLevel || estimated?.confidence}</span>
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

      {/* Tafsiran Ramah Studio (Bahasa Sehari-hari & Penggabungan Bukti P1) */}
      {!isNoMaster && (unifiedFusion || estimated) && (
        <div className="p-3.5 rounded-xl bg-studio-950/80 border border-studio-800/80 mb-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-studio-400 text-[11px] font-medium uppercase tracking-wider">
              Diagnosa Studio:
            </span>
            <span className="font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full text-[11px] border border-amber-500/20">
              {unifiedFusion?.primaryCause || estimated?.primaryCause}
            </span>
          </div>
          <p className="text-studio-200 leading-relaxed font-medium">
            {unifiedFusion?.humanExplanation || estimated?.explanation}
          </p>

          {/* Kotak Rekomendasi Tindakan Studio Cepat */}
          <div className="pt-2 border-t border-studio-800/60 flex items-start gap-2 text-studio-300">
            <span className="text-amber-400 font-bold shrink-0">💡 Solusi:</span>
            <span>
              {unifiedFusion?.studioAction || (
                estimated?.primaryCause.toLowerCase().includes('lampu') || estimated?.primaryCause.toLowerCase().includes('white balance')
                  ? 'Cukup sesuaikan pencahayaan studio atau setelan suhu warna di kamera. Bahan finishing kayu sebenarnya sudah cocok.'
                  : estimated?.primaryCause.toLowerCase().includes('material')
                  ? 'Periksa fisik sampel produk ke tim finishing kayu karena arah perbedaan warnanya bukan dari pencahayaan kamera.'
                  : estimated?.primaryCause.toLowerCase().includes('eksposur')
                  ? 'Atur intensitas lampu studio atau kecepatan rana (shutter speed) agar tingkat terangnya sama dengan master panel.'
                  : 'Pencahayaan dan warna sudah seimbang. Hasil foto siap diproses dan aman untuk lolos QC.'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Rangkuman Kondisi Visual & Serat Kayu (Ramah Pengguna) */}
      {measured && (
        <div className="mb-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-studio-400 mb-2 flex items-center justify-between">
            <span>Rangkuman Visual vs Master Kayu Fisik</span>
            <span className="text-[10px] text-emerald-400 font-normal">terverifikasi objektif</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* 1. Kesesuaian Warna */}
            <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col justify-between">
              <div className="text-[10px] text-studio-400 font-medium">Warna & Rona</div>
              <div className="my-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                  measured.deltaE00 <= 2.2
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : measured.deltaE00 <= 4.5
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {measured.deltaE00 <= 2.2 ? 'Sangat Pas' : measured.deltaE00 <= 4.5 ? 'Beda Tipis' : 'Beda Jelas'}
                </span>
              </div>
              <div className="text-[10px] text-studio-400">
                {measured.deltaE00 <= 2.2 ? 'Hampir identik' : measured.deltaE00 <= 4.5 ? 'Masih wajar' : 'Tampak beda'}
              </div>
            </div>

            {/* 2. Karakter Serat Kayu (P1 Intelligence) */}
            <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col justify-between">
              <div className="text-[10px] text-studio-400 font-medium">Serat Kayu</div>
              <div className="my-1">
                {unifiedFusion ? (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                    unifiedFusion.isGrainMatching
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {unifiedFusion.isGrainMatching ? '🪵 Serat Cocok' : '⚠️ Beda Serat'}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-studio-300">🪵 Standar</span>
                )}
              </div>
              <div className="text-[10px] text-studio-400">
                {unifiedFusion
                  ? `${(unifiedFusion.textureSimilarityScore * 100).toFixed(0)}% Identik`
                  : 'Pola teratur'}
              </div>
            </div>

            {/* 3. Pencahayaan / Terang-Gelap */}
            <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col justify-between">
              <div className="text-[10px] text-studio-400 font-medium">Pencahayaan</div>
              <div className="text-xs font-bold text-studio-100 my-1">
                {Math.abs(measured.brightnessDiffPercent) <= 3
                  ? '💡 Cahaya Pas'
                  : measured.brightnessDiffPercent > 3
                  ? `☀️ Lebih Terang (+${measured.brightnessDiffPercent}%)`
                  : `🌑 Lebih Gelap (${measured.brightnessDiffPercent}%)`}
              </div>
              <div className="text-[10px] text-studio-400">
                {Math.abs(measured.brightnessDiffPercent) <= 3 ? 'Kecerahan seimbang' : measured.brightnessDiffPercent > 3 ? 'Kurangi lampu' : 'Tambah lampu'}
              </div>
            </div>

            {/* 4. Kepekatan Warna / Saturasi */}
            <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col justify-between">
              <div className="text-[10px] text-studio-400 font-medium">Kepekatan Warna</div>
              <div className="text-xs font-bold text-studio-100 my-1">
                {Math.abs(measured.saturationDiffPercent) <= 4
                  ? '🎨 Warna Alami'
                  : measured.saturationDiffPercent > 4
                  ? `🎨 Lebih Pekat (+${measured.saturationDiffPercent}%)`
                  : `🎨 Agak Pucat (${measured.saturationDiffPercent}%)`}
              </div>
              <div className="text-[10px] text-studio-400">
                {Math.abs(measured.saturationDiffPercent) <= 4 ? 'Ketebalan warna pas' : measured.saturationDiffPercent > 4 ? 'Warna lebih menyala' : 'Warna kurang pekat'}
              </div>
            </div>

            {/* 5. Kilau & Kontras */}
            <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col justify-between">
              <div className="text-[10px] text-studio-400 font-medium">Kontras Permukaan</div>
              <div className="text-xs font-bold text-studio-100 my-1">
                {Math.abs(measured.contrastDiffPercent) <= 4
                  ? '✨ Kontras Pas'
                  : measured.contrastDiffPercent > 4
                  ? `✨ Lebih Tajam (+${measured.contrastDiffPercent}%)`
                  : `✨ Lebih Lembut (${measured.contrastDiffPercent}%)`}
              </div>
              <div className="text-[10px] text-studio-400">
                {Math.abs(measured.contrastDiffPercent) <= 4 ? 'Tekstur terlihat natural' : measured.contrastDiffPercent > 4 ? 'Bayangan lebih pekat' : 'Cenderung datar'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Peringatan Silau / Gelap Ekstrem */}
      {measured?.clippingWarning?.highlightClipped && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Perhatian: Ada pantulan lampu terlalu silau di area ini (perlu difusi lampu).</span>
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
            <div className="mt-2 p-3 bg-studio-950 rounded-xl border border-studio-800 font-mono text-xs text-studio-300 space-y-2">
              <div className="flex items-center justify-between border-b border-studio-800/60 pb-1.5 text-[11px]">
                <span className="text-studio-400">Skor Selisih Standar CIEDE2000 (ΔE₀₀):</span>
                <span className="font-bold text-amber-300">{measured.deltaE00}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-studio-900/80 p-2 rounded-lg border border-studio-800/40">
                  <span className="text-studio-500 text-[10px] block">ΔL* (Terang-Gelap):</span>
                  <span className="font-semibold text-studio-100">{measured.deltaL > 0 ? `+${measured.deltaL}` : measured.deltaL}</span>
                </div>
                <div className="bg-studio-900/80 p-2 rounded-lg border border-studio-800/40">
                  <span className="text-studio-500 text-[10px] block">Δa* (Merah-Hijau):</span>
                  <span className="font-semibold text-studio-100">{measured.deltaA > 0 ? `+${measured.deltaA}` : measured.deltaA}</span>
                </div>
                <div className="bg-studio-900/80 p-2 rounded-lg border border-studio-800/40">
                  <span className="text-studio-500 text-[10px] block">Δb* (Kuning-Biru):</span>
                  <span className="font-semibold text-studio-100">{measured.deltaB > 0 ? `+${measured.deltaB}` : measured.deltaB}</span>
                </div>
              </div>
              {unifiedFusion && (
                <div className="pt-2 border-t border-studio-800/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-studio-500 block">Kemiripan Tekstur LBP:</span>
                    <span className="font-semibold text-emerald-300">{(unifiedFusion.textureSimilarityScore * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-studio-500 block">Selisih Sudut Serat:</span>
                    <span className="font-semibold text-studio-200">{unifiedFusion.grainAngleDiffDeg}° ({unifiedFusion.grainAngleDiffDeg <= 20 ? 'Searah' : 'Menyimpang'})</span>
                  </div>
                </div>
              )}
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
