import React, { useState } from 'react';
import { ROIItem, MeasuredEvidence, EstimatedRecommendation, UnifiedMaterialReport } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, ShieldAlert, Sparkles, Compass, ArrowRight, BarChart3, Layers, Scan } from 'lucide-react';

interface EvidenceCardProps {
  roi: ROIItem;
  measured?: MeasuredEvidence;
  estimated?: EstimatedRecommendation;
  unifiedFusion?: UnifiedMaterialReport;
  isSelected?: boolean;
  onSelect?: () => void;
  isSingleArea?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  roi,
  measured,
  estimated,
  unifiedFusion,
  isSelected,
  onSelect,
  isSingleArea = false,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const isNoMaster = roi.role === 'guardrail_only';

  // Format warna swatch Master & Produk
  const masterColorRgb = measured?.masterRgb
    ? `rgb(${measured.masterRgb.r}, ${measured.masterRgb.g}, ${measured.masterRgb.b})`
    : '#4a2f1b';
  const productColorRgb = measured?.productRgb
    ? `rgb(${measured.productRgb.r}, ${measured.productRgb.g}, ${measured.productRgb.b})`
    : '#52341e';

  return (
    <div
      onClick={onSelect}
      className={`border rounded-2xl p-5 md:p-6 transition-all cursor-pointer overflow-hidden relative ${
        isSelected
          ? 'border-amber-500/80 bg-studio-900 ring-2 ring-amber-500/20 shadow-2xl'
          : 'border-studio-800 bg-studio-900/70 hover:bg-studio-900/90'
      }`}
    >
      {/* 1. Header Kartu & Lencana Diagnosa Utama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-studio-800/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <h4 className="text-base font-bold text-white tracking-wide">{roi.name}</h4>
            {isNoMaster ? (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Guardrail (Bukan Kayu)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Area Master Kayu
              </span>
            )}
          </div>
          <p className="text-xs text-studio-400 mt-1">
            {isNoMaster
              ? 'Area pembanding non-kayu untuk memastikan koreksi warna tidak merusak bahan ini.'
              : 'Hasil komparasi statistik warna dan tekstur serat terhadap sampel fisik master.'}
          </p>
        </div>

        {/* Lencana Status Utama */}
        {!isNoMaster && (unifiedFusion || estimated) && (
          <div className="shrink-0">
            {unifiedFusion ? (
              <div
                className={`inline-flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-full border shadow-sm ${
                  unifiedFusion.diagnosisType === 'Conforming'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : unifiedFusion.diagnosisType === 'IlluminationArtifact'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : unifiedFusion.diagnosisType === 'SpeciesOrGrainMismatch'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                }`}
              >
                {unifiedFusion.diagnosisType === 'Conforming' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {unifiedFusion.diagnosisType === 'IlluminationArtifact' && <Sparkles className="w-4 h-4 text-amber-400" />}
                {unifiedFusion.diagnosisType === 'SpeciesOrGrainMismatch' && <Compass className="w-4 h-4 text-purple-400" />}
                {unifiedFusion.diagnosisType === 'MaterialMismatch' && <XCircle className="w-4 h-4 text-rose-400" />}
                <span>{unifiedFusion.title}</span>
              </div>
            ) : (
              <div className="text-xs font-bold text-studio-300">
                {estimated?.label}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Baris Komparasi Sampel Visual & Solusi Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
        {/* Kolom Swatch Warna Berdampingan */}
        {measured && (
          <div className="lg:col-span-4 bg-studio-950/90 p-4 rounded-xl border border-studio-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-studio-400 mb-2">
              <span>Sampel Visual</span>
              <span className="text-[10px] text-studio-500 font-mono">Piksel Nyata</span>
            </div>

            <div className="flex items-center justify-around gap-2 py-1 my-auto">
              {/* Swatch Master */}
              <div className="text-center flex-1 flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-xl border-2 border-studio-700 shadow-md transition transform hover:scale-105"
                  style={{ backgroundColor: masterColorRgb }}
                  title={`Master: ${masterColorRgb}`}
                />
                <span className="text-[11px] font-bold text-studio-300 mt-2 block">Master Kayu</span>
                <span className="text-[10px] font-mono text-studio-500">L* {measured.masterBrightness}%</span>
              </div>

              {/* Panah Pembanding */}
              <div className="text-studio-600 font-bold flex flex-col items-center px-1">
                <ArrowRight className="w-4 h-4 text-studio-400" />
                <span className="text-[8px] text-studio-500 mt-0.5 uppercase tracking-wider">vs</span>
              </div>

              {/* Swatch Produk */}
              <div className="text-center flex-1 flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-xl border-2 border-studio-700 shadow-md transition transform hover:scale-105"
                  style={{ backgroundColor: productColorRgb }}
                  title={`Produk: ${productColorRgb}`}
                />
                <span className="text-[11px] font-bold text-studio-300 mt-2 block">Produk Studio</span>
                <span className="text-[10px] font-mono text-studio-500">L* {measured.productBrightness}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Kolom Diagnosa & Solusi Praktis Studio */}
        <div className={measured ? 'lg:col-span-8' : 'col-span-12'}>
          <div className="bg-studio-950/90 p-4 rounded-xl border border-studio-800/80 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-studio-400">
                Diagnosa Studio:
              </span>
              <span className="font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full text-xs border border-amber-500/20">
                {unifiedFusion?.primaryCause || estimated?.primaryCause || 'Analisis Studio'}
              </span>
            </div>

            <p className="text-xs text-studio-200 leading-relaxed font-medium">
              {unifiedFusion?.humanExplanation || estimated?.explanation || 'Warna dan serat kayu telah diperiksa terhadap master acuan.'}
            </p>

            <div className="pt-2.5 border-t border-studio-800/80 flex items-start gap-2 text-xs text-studio-300">
              <span className="text-amber-400 font-bold shrink-0">💡 Solusi:</span>
              <span className="leading-relaxed">
                {unifiedFusion?.studioAction || (
                  estimated?.primaryCause.toLowerCase().includes('lampu') || estimated?.primaryCause.toLowerCase().includes('white balance')
                    ? 'Cukup sesuaikan pencahayaan studio atau setelan suhu warna di kamera. Bahan finishing kayu sebenarnya sudah cocok.'
                    : estimated?.primaryCause.toLowerCase().includes('material')
                    ? 'Periksa fisik sampel produk ke tim finishing kayu karena arah perbedaan warnanya bukan dari pencahayaan kamera.'
                    : estimated?.primaryCause.toLowerCase().includes('eksposur')
                    ? 'Atur intensitas lampu studio atau kecepatan rana (shutter speed) agar tingkat terangnya sama dengan master panel.'
                    : 'Pencahayaan dan warna sudah seimbang. Hasil foto aman untuk lolos QC studio.'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PAPAN STATISTIK KOMPARASI (THE CORE STATS DASHBOARD) */}
      {measured && (
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-studio-400 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              Papan Statistik Komparasi (Master vs Produk)
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Data Metrik Objektif</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KARTU STATISTIK 1: KECERAHAN CAHAYA */}
            <div className="bg-studio-950 p-4 rounded-xl border border-studio-800/90 hover:border-studio-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-studio-400">
                    💡 Kecerahan Cahaya
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      Math.abs(measured.brightnessDiffPercent) <= 3
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : measured.brightnessDiffPercent > 3
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}
                  >
                    {Math.abs(measured.brightnessDiffPercent) <= 3
                      ? 'Cahaya Pas'
                      : measured.brightnessDiffPercent > 3
                      ? 'Lebih Terang'
                      : 'Lebih Gelap'}
                  </span>
                </div>

                {/* Angka Perbandingan Master vs Produk */}
                <div className="grid grid-cols-2 gap-2 bg-studio-900/80 p-2.5 rounded-lg border border-studio-800/60 my-2 text-center">
                  <div>
                    <span className="text-[10px] text-studio-500 block">Master Fisik</span>
                    <span className="text-sm font-bold font-mono text-studio-200">{measured.masterBrightness}%</span>
                  </div>
                  <div className="border-l border-studio-800 pl-2">
                    <span className="text-[10px] text-studio-500 block">Produk Foto</span>
                    <span className="text-sm font-bold font-mono text-studio-200">{measured.productBrightness}%</span>
                  </div>
                </div>
              </div>

              {/* Selisih & Keterangan */}
              <div className="pt-2 border-t border-studio-800/60 flex items-center justify-between text-[11px]">
                <span className="text-studio-400">Selisih Cahaya:</span>
                <span
                  className={`font-bold font-mono ${
                    Math.abs(measured.brightnessDiffPercent) <= 3
                      ? 'text-emerald-400'
                      : measured.brightnessDiffPercent > 3
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                >
                  {measured.brightnessDiffPercent > 0 ? `+${measured.brightnessDiffPercent}%` : `${measured.brightnessDiffPercent}%`}
                </span>
              </div>
            </div>

            {/* KARTU STATISTIK 2: KEPEKATAN RONA (SATURASI) */}
            <div className="bg-studio-950 p-4 rounded-xl border border-studio-800/90 hover:border-studio-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-studio-400">
                    🌈 Kepekatan Rona
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      Math.abs(measured.saturationDiffPercent) <= 4
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : measured.saturationDiffPercent > 4
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}
                  >
                    {Math.abs(measured.saturationDiffPercent) <= 4
                      ? 'Warna Alami'
                      : measured.saturationDiffPercent > 4
                      ? 'Lebih Pekat'
                      : 'Agak Pucat'}
                  </span>
                </div>

                {/* Angka Perbandingan Master vs Produk */}
                <div className="grid grid-cols-2 gap-2 bg-studio-900/80 p-2.5 rounded-lg border border-studio-800/60 my-2 text-center">
                  <div>
                    <span className="text-[10px] text-studio-500 block">Master Fisik</span>
                    <span className="text-sm font-bold font-mono text-studio-200">
                      {measured.masterSaturation !== undefined ? `${measured.masterSaturation}%` : 'Standar'}
                    </span>
                  </div>
                  <div className="border-l border-studio-800 pl-2">
                    <span className="text-[10px] text-studio-500 block">Produk Foto</span>
                    <span className="text-sm font-bold font-mono text-studio-200">
                      {measured.productSaturation !== undefined ? `${measured.productSaturation}%` : 'Studio'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selisih & Keterangan */}
              <div className="pt-2 border-t border-studio-800/60 flex items-center justify-between text-[11px]">
                <span className="text-studio-400">Selisih Kepekatan:</span>
                <span
                  className={`font-bold font-mono ${
                    Math.abs(measured.saturationDiffPercent) <= 4
                      ? 'text-emerald-400'
                      : measured.saturationDiffPercent > 4
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                >
                  {measured.saturationDiffPercent > 0 ? `+${measured.saturationDiffPercent}%` : `${measured.saturationDiffPercent}%`}
                </span>
              </div>
            </div>

            {/* KARTU STATISTIK 3: KESESUAIAN WARNA FISIK */}
            <div className="bg-studio-950 p-4 rounded-xl border border-studio-800/90 hover:border-studio-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-studio-400">
                    🎨 Kesesuaian Warna
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      measured.deltaE00 <= 2.2
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : measured.deltaE00 <= 4.5
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {measured.deltaE00 <= 2.2 ? 'Sangat Pas' : measured.deltaE00 <= 4.5 ? 'Beda Tipis' : 'Beda Jelas'}
                  </span>
                </div>

                {/* Angka Skor Utama */}
                <div className="bg-studio-900/80 p-2.5 rounded-lg border border-studio-800/60 my-2 text-center">
                  <span className="text-[10px] text-studio-500 block">Evaluasi Toleransi Warna</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className={`text-base font-bold font-mono ${
                        measured.deltaE00 <= 2.2
                          ? 'text-emerald-400'
                          : measured.deltaE00 <= 4.5
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      ΔE {measured.deltaE00.toFixed(2)}
                    </span>
                    <span className="text-xs text-studio-400 font-medium">
                      {measured.deltaE00 <= 2.2 ? 'Sangat Pas' : measured.deltaE00 <= 4.5 ? 'Beda Tipis' : 'Beda Jelas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selisih & Keterangan */}
              <div className="pt-2 border-t border-studio-800/60 flex items-center justify-between text-[11px]">
                <span className="text-studio-400">Toleransi Acuan:</span>
                <span className="font-bold font-mono text-studio-200">≤ 2.2 ΔE₀₀</span>
              </div>
            </div>

            {/* KARTU STATISTIK 4: STRUKTUR SERAT & TEKSTUR KAYU */}
            <div className="bg-studio-950 p-4 rounded-xl border border-studio-800/90 hover:border-studio-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-studio-400">
                    🪵 Serat Kayu
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      unifiedFusion?.isGrainMatching !== false
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {unifiedFusion?.isGrainMatching !== false ? 'Serat Cocok' : 'Beda Serat'}
                  </span>
                </div>

                {/* Angka Skor Utama */}
                <div className="bg-studio-900/80 p-2.5 rounded-lg border border-studio-800/60 my-2 text-center">
                  <span className="text-[10px] text-studio-500 block">Kemiripan Pori & Urat</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {unifiedFusion ? `${(unifiedFusion.textureSimilarityScore * 100).toFixed(0)}%` : '100%'}
                    </span>
                    <span className="text-xs text-studio-400 font-medium">Identik</span>
                  </div>
                </div>
              </div>

              {/* Selisih & Keterangan */}
              <div className="pt-2 border-t border-studio-800/60 flex items-center justify-between text-[11px]">
                <span className="text-studio-400">Arah Alur Kayu:</span>
                <span className="font-bold font-mono text-studio-200">
                  {unifiedFusion ? `${unifiedFusion.grainAngleDiffDeg}° (${unifiedFusion.grainAngleDiffDeg <= 20 ? 'Searah' : 'Miring'})` : 'Searah'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Peta Petak Serat Kayu AI (AnomalyDINO / PatchCore Heatmap Grid) */}
      {!isNoMaster && unifiedFusion?.patchAnomaly && unifiedFusion.patchAnomaly.heatmapGrid.length > 0 && (
        <div className="bg-studio-950/90 p-4 rounded-xl border border-studio-800/80 mb-5 space-y-3 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-studio-800/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded bg-amber-500/10 text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white tracking-wide">
                  Peta Petak Serat Kayu (Analisis Tekstur Petak / LBP)
                </span>
                <span className="text-[10px] text-studio-400 block font-normal">
                  Pemeriksaan pori & serat kayu per petak mikro terhadap master fisik
                </span>
              </div>
            </div>

            {/* Status Keseluruhan Petak */}
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  !unifiedFusion.patchAnomaly.isAnomalous
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {!unifiedFusion.patchAnomaly.isAnomalous
                  ? '✅ Semua Petak Cocok'
                  : '⚠️ Ada Petak Berbeda'}
              </span>
            </div>
          </div>

          {/* Grid Visualisasi Petak & Keterangan */}
          <div className="flex flex-col md:flex-row items-center gap-5 pt-1">
            {/* Tampilan Kotak-Kotak Petak */}
            <div className="bg-studio-900/90 p-2.5 rounded-xl border border-studio-800/60 flex flex-col gap-1 shadow-inner max-w-full overflow-hidden shrink-0">
              {unifiedFusion.patchAnomaly.heatmapGrid.map((row, rIdx) => {
                const maxCols = Math.max(row.length, 1);
                // Ukuran dinamis per petak: jika 9 kolom -> 20px (w-5 h-5), jika lebih lebar -> mengecil otomatis agar selalu pas dalam wadah
                const cellSize = Math.max(10, Math.min(20, Math.floor(220 / maxCols)));
                return (
                  <div key={`row-${rIdx}`} className="flex gap-1 justify-center">
                    {row.map((score, cIdx) => {
                      const isIdentical = score < 0.25;
                      const isNaturalVariation = score >= 0.25 && score <= 0.45;
                      const isDefect = score > 0.45;

                      return (
                        <div
                          key={`cell-${rIdx}-${cIdx}`}
                          title={`Petak [Baris ${rIdx + 1}, Kolom ${cIdx + 1}]: Skor Selisih ${(score * 100).toFixed(0)}%`}
                          style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                          className={`rounded transition-transform hover:scale-125 cursor-help flex items-center justify-center text-[9px] font-mono font-bold shrink-0 ${
                            isIdentical
                              ? 'bg-emerald-500/70 text-emerald-100 border border-emerald-400/40'
                              : isNaturalVariation
                              ? 'bg-amber-500/70 text-amber-100 border border-amber-400/40'
                              : 'bg-rose-500/80 text-rose-100 border border-rose-400/50 animate-pulse'
                          }`}
                        >
                          {isDefect ? '!' : ''}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Keterangan Warna Ramah Pengguna Studio */}
            <div className="flex-1 space-y-2 text-xs">
              <p className="text-studio-300 font-medium leading-relaxed">
                {unifiedFusion.patchAnomaly.summaryText}
              </p>

              {/* Panduan Warna */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-studio-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span>Serat Sangat Cocok</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  <span>Variasi Serat Alami</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                  <span>Serat Asing / Cacat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Peringatan Silau / Gelap Ekstrem */}
      {measured?.clippingWarning?.highlightClipped && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Perhatian: Ada pantulan lampu terlalu silau di area ini (disarankan memakai diffuser lampu).</span>
        </div>
      )}

      {/* 4. Progressive Disclosure: Detail Teknis Laboratorium (Bisa Dibuka-Tutup) */}
      {measured && (
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTechnicalDetails(!showTechnicalDetails);
            }}
            className="flex items-center space-x-1.5 text-xs text-studio-400 hover:text-amber-300 font-medium transition-colors pt-2"
          >
            <span>{showTechnicalDetails ? 'Tutup Detail Laboratorium' : 'Lihat Detail Angka Laboratorium (Delta E, Lab, Serat)'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechnicalDetails && (
            <div className="mt-3 p-4 bg-studio-950 rounded-xl border border-studio-800 font-mono text-xs text-studio-300 space-y-3">
              <div className="flex items-center justify-between border-b border-studio-800/60 pb-2 text-xs">
                <span className="text-studio-400">Skor Selisih Standar CIEDE2000 (ΔE₀₀):</span>
                <span className="font-bold text-amber-300">{measured.deltaE00}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-studio-900 p-2.5 rounded-lg border border-studio-800/50">
                  <span className="text-studio-500 text-[10px] block">ΔL* (Terang-Gelap):</span>
                  <span className="font-semibold text-studio-100">{measured.deltaL > 0 ? `+${measured.deltaL}` : measured.deltaL}</span>
                </div>
                <div className="bg-studio-900 p-2.5 rounded-lg border border-studio-800/50">
                  <span className="text-studio-500 text-[10px] block">Δa* (Merah-Hijau):</span>
                  <span className="font-semibold text-studio-100">{measured.deltaA > 0 ? `+${measured.deltaA}` : measured.deltaA}</span>
                </div>
                <div className="bg-studio-900 p-2.5 rounded-lg border border-studio-800/50">
                  <span className="text-studio-500 text-[10px] block">Δb* (Kuning-Biru):</span>
                  <span className="font-semibold text-studio-100">{measured.deltaB > 0 ? `+${measured.deltaB}` : measured.deltaB}</span>
                </div>
              </div>
              {unifiedFusion && (
                <div className="pt-2 border-t border-studio-800/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-studio-500 block">Kemiripan Tekstur LBP:</span>
                    <span className="font-semibold text-emerald-300">{(unifiedFusion.textureSimilarityScore * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-studio-500 block">Kemiringan Sudut Serat:</span>
                    <span className="font-semibold text-studio-200">{unifiedFusion.grainAngleDiffDeg}° ({unifiedFusion.grainAngleDiffDeg <= 20 ? 'Searah' : 'Menyimpang'})</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
