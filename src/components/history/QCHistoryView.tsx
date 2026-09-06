import React from 'react';
import { QCRecord } from '../../types';
import { History, X, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';

interface QCHistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  records: QCRecord[];
  onClearHistory?: () => void;
}

export const QCHistoryView: React.FC<QCHistoryViewProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  if (!isOpen) return null;

  const exportHistoryJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `studio_qc_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-studio-800 flex items-center justify-between bg-studio-900">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Riwayat Keputusan QC Studio</h3>
              <p className="text-xs text-studio-400">
                Catatan terverifikasi untuk kalibrasi dan audit konsistensi warna
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {records.length > 0 && (
              <button
                onClick={exportHistoryJson}
                className="px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-studio-200 text-xs font-semibold flex items-center gap-1.5 border border-studio-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Ekspor JSON
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded text-studio-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Daftar Riwayat */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-12 text-studio-500 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Belum ada riwayat keputusan QC yang disimpan.
            </div>
          ) : (
            records.map((rec) => {
              const isPass = rec.finalProductDecision?.decision === 'PASS';
              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl bg-studio-950 border border-studio-800 space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white text-sm">{rec.productName}</span>
                        <span className="font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                          Ref: {rec.masterCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-studio-500 mt-0.5 font-mono">
                        {new Date(rec.timestamp).toLocaleString('id-ID')} | File: {rec.sourceImageName}
                      </div>
                    </div>

                    {/* Keputusan Produk Akhir */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
                          isPass
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {isPass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        PRODUK: {rec.finalProductDecision?.decision || 'BELUM DIPUTUSKAN'}
                      </span>
                    </div>
                  </div>

                  {/* Detail Keputusan Per Area (ROI) */}
                  <div className="bg-studio-900/80 p-3 rounded-lg border border-studio-800/80 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-studio-400">
                      Evaluasi Per Area:
                    </div>
                    <div className="space-y-1.5">
                      {rec.rois.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-studio-800/50 last:border-0"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-studio-200 font-medium">{item.roi.name}</span>
                            {item.measured && (
                              <span className="text-[11px] font-mono text-studio-400">
                                (ΔE00: {item.measured.deltaE00})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 font-mono text-[11px]">
                            <span className="text-studio-400">
                              Saran: {item.estimated?.label || '-'}
                            </span>
                            <span
                              className={`font-semibold px-1.5 py-0.5 rounded ${
                                item.operatorDecision?.decision === 'PASS'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : item.operatorDecision?.decision === 'FAIL'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'text-studio-500'
                              }`}
                            >
                              Operator: {item.operatorDecision?.decision || '-'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alasan Gagal Jika Produk / ROI FAIL */}
                  {rec.finalProductDecision?.failReasons && rec.finalProductDecision.failReasons.length > 0 && (
                    <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/30 text-[11px] text-rose-300">
                      <span className="font-semibold text-rose-400">Alasan FAIL: </span>
                      {rec.finalProductDecision.failReasons.join(', ')}
                      {rec.finalProductDecision.note && (
                        <span className="block mt-1 text-rose-300/80 italic">
                          "Catatan: {rec.finalProductDecision.note}"
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
