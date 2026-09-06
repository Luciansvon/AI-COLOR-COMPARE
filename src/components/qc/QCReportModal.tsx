import React from 'react';
import { ROIItem, MeasuredEvidence, UnifiedMaterialReport, CorrectionParams, ImageMetadata } from '../../types';
import { X, Printer, CheckCircle2, XCircle, ShieldCheck, Layers, FileText } from 'lucide-react';

interface QCReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  masterCode: string;
  masterName: string;
  metadata: ImageMetadata;
  rois: ROIItem[];
  measuredMap: Record<string, MeasuredEvidence>;
  fusionMap: Record<string, UnifiedMaterialReport>;
  decision: 'PASS' | 'FAIL' | null;
  failReasons?: string[];
  note?: string;
  correctionParams?: CorrectionParams;
}

export const QCReportModal: React.FC<QCReportModalProps> = ({
  isOpen,
  onClose,
  productName,
  masterCode,
  masterName,
  metadata,
  rois,
  measuredMap,
  fusionMap,
  decision,
  failReasons,
  note,
  correctionParams,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const primaryRoi = rois[0];
  const primaryMeasured = primaryRoi ? measuredMap[primaryRoi.id] : undefined;
  const primaryFusion = primaryRoi ? fusionMap[primaryRoi.id] : undefined;

  const masterColorRgb = primaryMeasured?.masterRgb
    ? `rgb(${primaryMeasured.masterRgb.r}, ${primaryMeasured.masterRgb.g}, ${primaryMeasured.masterRgb.b})`
    : '#4a2f1b';
  const productColorRgb = primaryMeasured?.productRgb
    ? `rgb(${primaryMeasured.productRgb.r}, ${primaryMeasured.productRgb.g}, ${primaryMeasured.productRgb.b})`
    : '#52341e';

  const colorAccuracy = primaryMeasured
    ? Math.max(0, Math.min(100, Math.round(100 - primaryMeasured.deltaE00 * 7.5)))
    : 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-studio-900 border border-studio-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header Aksi (Tidak Ikut Dicetak) */}
        <div className="p-4 border-b border-studio-800 flex items-center justify-between bg-studio-950 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Lembar Laporan Pemeriksaan QC Studio</h3>
              <p className="text-xs text-studio-400">Format resmi siap cetak / simpan sebagai PDF untuk klien & produksi</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              id="btn-print-qc-report"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-amber-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Kertas Laporan (Tampilan Putih Formal) */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white text-gray-900 font-sans space-y-6 print:p-0">
          {/* Kop Dokumen */}
          <div className="border-b-2 border-gray-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-gray-900 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">QC-STUDIO</span>
                <h1 className="text-xl font-black tracking-tight text-gray-900">SERTIFIKAT KONSISTENSI WARNA & SERAT KAYU</h1>
              </div>
              <p className="text-xs text-gray-600 mt-1">Sistem Pengukuran Spektral & Validasi Tekstur Permukaan Furnitur</p>
            </div>
            <div className="text-right text-xs text-gray-500 font-mono">
              <div>Tanggal: {currentDate}</div>
              <div>ID Laporan: QC-{Date.now().toString().slice(-8)}</div>
            </div>
          </div>

          {/* Informasi Identitas Produk & Sampel Master */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
            <div>
              <span className="text-gray-500 block text-[11px]">Nama Produk:</span>
              <span className="font-bold text-gray-900 text-sm">{productName}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Master Fisik Acuan:</span>
              <span className="font-bold font-mono text-amber-800 text-sm">{masterCode}</span>
              <span className="text-gray-600 block text-[11px]">{masterName}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Berkas Foto Produk:</span>
              <span className="font-mono text-gray-800 truncate block">{metadata.fileName}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Kamera & Lensa:</span>
              <span className="text-gray-800 block">{metadata.cameraModel || 'Kamera Studio'}</span>
              <span className="text-gray-500 text-[10px] font-mono">{metadata.lens || 'Lensa Standar'}</span>
            </div>
          </div>

          {/* Perbandingan Visual Swatch & Status Akhir */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            {/* Swatch Berdampingan */}
            <div className="md:col-span-6 flex items-center justify-around gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-center flex-1">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-gray-400 mx-auto shadow-inner"
                  style={{ backgroundColor: masterColorRgb }}
                />
                <span className="font-bold text-xs text-gray-800 mt-2 block">Master Acuan</span>
                <span className="text-[10px] text-gray-500 font-mono">Papan Fisik</span>
              </div>

              <div className="text-center font-bold text-gray-400 text-sm">VS</div>

              <div className="text-center flex-1">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-gray-400 mx-auto shadow-inner"
                  style={{ backgroundColor: productColorRgb }}
                />
                <span className="font-bold text-xs text-gray-800 mt-2 block">Hasil Produk</span>
                <span className="text-[10px] text-gray-500 font-mono">Foto Studio</span>
              </div>
            </div>

            {/* Kotak Keputusan Utama */}
            <div className="md:col-span-6 flex flex-col justify-center items-center md:items-start p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Keputusan Akhir Operator:</span>
              <div className="flex items-center gap-2 mt-1">
                {decision === 'PASS' ? (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>PRODUK LOLOS (PASS)</span>
                  </div>
                ) : decision === 'FAIL' ? (
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-300 font-bold text-sm">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>PRODUK TIDAK LOLOS (FAIL)</span>
                  </div>
                ) : (
                  <span className="text-gray-500 italic text-sm">Belum Ditentukan</span>
                )}
              </div>
              {failReasons && failReasons.length > 0 && (
                <div className="mt-2 text-xs text-rose-700 font-medium">
                  Alasan: {failReasons.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Tabel 4 Metrik Statistik Objektif */}
          {primaryMeasured && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                1. Data Pengukuran Statistik (Standar CIEDE2000 & LBP)
              </h3>
              <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-2.5">Parameter Pengecekan</th>
                    <th className="p-2.5">Master Acuan</th>
                    <th className="p-2.5">Produk Foto</th>
                    <th className="p-2.5">Selisih</th>
                    <th className="p-2.5">Status & Toleransi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  <tr>
                    <td className="p-2.5 font-medium">Kecerahan Cahaya (L*)</td>
                    <td className="p-2.5 font-mono">{primaryMeasured.masterBrightness}%</td>
                    <td className="p-2.5 font-mono">{primaryMeasured.productBrightness}%</td>
                    <td className="p-2.5 font-mono font-bold">
                      {primaryMeasured.brightnessDiffPercent > 0 ? `+${primaryMeasured.brightnessDiffPercent}%` : `${primaryMeasured.brightnessDiffPercent}%`}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-300">
                        {Math.abs(primaryMeasured.brightnessDiffPercent) <= 5 ? 'Normal (Toleransi)' : primaryMeasured.brightnessDiffPercent > 5 ? 'Lebih Terang' : 'Lebih Gelap'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Kepekatan Rona (Saturasi)</td>
                    <td className="p-2.5 font-mono">{primaryMeasured.masterSaturation ?? 'Standar'}%</td>
                    <td className="p-2.5 font-mono">{primaryMeasured.productSaturation ?? 'Studio'}%</td>
                    <td className="p-2.5 font-mono font-bold">
                      {primaryMeasured.saturationDiffPercent > 0 ? `+${primaryMeasured.saturationDiffPercent}%` : `${primaryMeasured.saturationDiffPercent}%`}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-300">
                        {Math.abs(primaryMeasured.saturationDiffPercent) <= 4 ? 'Warna Alami' : 'Ada Selisih Rona'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Kesesuaian Warna (ΔE₀₀)</td>
                    <td className="p-2.5 font-mono">0.00</td>
                    <td className="p-2.5 font-mono">{primaryMeasured.deltaE00}</td>
                    <td className="p-2.5 font-mono font-bold">{colorAccuracy}% Akurat</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-300">
                        {primaryMeasured.deltaE00 <= 2.2 ? 'Sangat Pas (≤ 2.2)' : 'Perbedaan Tampak (> 2.2)'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Struktur & Arah Serat Kayu</td>
                    <td className="p-2.5 font-mono">100% Identik</td>
                    <td className="p-2.5 font-mono">
                      {primaryFusion ? `${(primaryFusion.textureSimilarityScore * 100).toFixed(0)}%` : '100%'}
                    </td>
                    <td className="p-2.5 font-mono font-bold">
                      {primaryFusion ? `${primaryFusion.grainAngleDiffDeg}°` : '0°'}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-300">
                        {primaryFusion?.isGrainMatching !== false ? 'Serat Cocok' : 'Beda Karakter'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Diagnosa AI Serat Kayu & Peta Petak */}
          {primaryFusion?.patchAnomaly && primaryFusion.patchAnomaly.heatmapGrid.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-700" />
                  2. Diagnosa Kecerdasan Buatan Serat Kayu (AnomalyDINO)
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {!primaryFusion.patchAnomaly.isAnomalous ? 'Lolos Pemeriksaan Petak' : 'Peringatan Anomali'}
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                {primaryFusion.patchAnomaly.summaryText}
              </p>
              <div className="text-[11px] text-gray-600 italic">
                Rekomendasi Tindakan: {primaryFusion.studioAction}
              </div>
            </div>
          )}

          {/* Saran Kalibrasi Lampu / Kamera */}
          {correctionParams && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 text-xs">
              <span className="font-bold uppercase tracking-wider text-gray-700 block mb-1">
                3. Saran Penyesuaian Lampu / Kamera Studio
              </span>
              <div className="grid grid-cols-3 gap-2 font-mono text-gray-800 mt-2">
                <div>Suhu Lampu: {correctionParams.temperatureK > 0 ? `+${correctionParams.temperatureK} K` : `${correctionParams.temperatureK} K`}</div>
                <div>Eksposur: {correctionParams.exposureEV > 0 ? `+${correctionParams.exposureEV} EV` : `${correctionParams.exposureEV} EV`}</div>
                <div>Saturasi: {correctionParams.saturation > 0 ? `+${correctionParams.saturation}%` : `${correctionParams.saturation}%`}</div>
              </div>
            </div>
          )}

          {/* Catatan & Tanda Tangan */}
          <div className="pt-4 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs text-gray-700">
            <div>
              <span className="font-bold block text-gray-800 mb-1">Catatan Tambahan Operator:</span>
              <div className="p-2 border border-gray-200 rounded min-h-[50px] bg-gray-50 italic">
                {note || 'Semua parameter warna dan pola serat kayu telah diperiksa sesuai prosedur standar operasional studio.'}
              </div>
            </div>

            <div className="flex justify-between gap-4 text-center">
              <div className="flex-1">
                <span className="block mb-10 text-gray-600">Pemeriksa (Operator Studio)</span>
                <div className="border-t border-gray-400 pt-1 font-bold">( Bima / Operator QC )</div>
              </div>
              <div className="flex-1">
                <span className="block mb-10 text-gray-600">Penerima (Mandor / Klien)</span>
                <div className="border-t border-gray-400 pt-1 font-bold">( ................................ )</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
