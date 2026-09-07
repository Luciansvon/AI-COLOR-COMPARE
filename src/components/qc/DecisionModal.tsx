import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { useModalAccessibility } from '../common/useModalAccessibility';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string; // Misal: "Produk Dining Chair" atau "Area Rangka Kayu"
  onConfirmFail: (reasons: string[], note: string) => void;
}

const FAIL_REASONS = [
  'Warna terlalu hangat / kekuningan dibanding master',
  'Warna terlalu dingin / kebiruan dibanding master',
  'Terlalu terang / over-exposed',
  'Terlalu gelap / under-exposed',
  'Finishing / rona warna tidak sesuai sampel fisik',
  'Tekstur / alur serat kayu berbeda karakter',
  'Pantulan kilau / refleksi lampu mengganggu',
  'Lainnya',
];

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  targetName,
  onConfirmFail,
}) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const dialogRef = useModalAccessibility(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) {
      setSelectedReasons([]);
      setNote('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleConfirm = () => {
    if (selectedReasons.length === 0) return;
    onConfirmFail(selectedReasons, note);
    setSelectedReasons([]);
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-modal-title"
        tabIndex={-1}
        className="bg-studio-900 border border-studio-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-studio-800 pb-3">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 font-semibold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span id="decision-modal-title">Pencatatan Alasan FAIL (Gagal QC)</span>
            </div>
            <p className="text-xs text-studio-300 mt-1">
              Target: <span className="font-semibold text-white">{targetName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pencatatan alasan gagal"
            className="p-1 rounded text-studio-400 hover:text-white hover:bg-studio-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-studio-400">
          Sesuai aturan studio, saat menetapkan status <span className="text-rose-400 font-semibold">FAIL</span>, operator wajib memilih minimal 1 alasan di bawah ini untuk audit data:
        </p>

        {/* Daftar Pilihan Alasan Terstruktur (REQ-FAIL-001) */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {FAIL_REASONS.map((reason) => {
            const isChecked = selectedReasons.includes(reason);
            return (
              <label
                key={reason}
                htmlFor={`fail-reason-${reason.replace(/\W+/g, '-').toLowerCase()}`}
                className={`flex items-center space-x-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                  isChecked
                    ? 'border-rose-500 bg-rose-500/10 text-rose-200'
                    : 'border-studio-800 bg-studio-950/60 text-studio-300 hover:border-studio-700'
                }`}
              >
                <input
                  id={`fail-reason-${reason.replace(/\W+/g, '-').toLowerCase()}`}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleReason(reason)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                    isChecked ? 'border-rose-500 bg-rose-500 text-white' : 'border-studio-700 bg-studio-900'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{reason}</span>
              </label>
            );
          })}
        </div>

        {/* Catatan Tambahan Bebas (REQ-FAIL-002) */}
        <div className="space-y-1.5">
          <label htmlFor="fail-operator-note" className="text-xs text-studio-400">
            Catatan Tambahan Operator (Opsional):
          </label>
          <textarea
            id="fail-operator-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Perbedaan terlihat jelas pada bagian sambungan bawah dekat kaki kursi..."
            rows={2}
            className="w-full bg-studio-950 border border-studio-800 rounded-lg p-2.5 text-xs text-studio-100 placeholder:text-studio-600 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-studio-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-studio-300 hover:text-white hover:bg-studio-800 transition"
          >
            Batal
          </button>
          <button
            disabled={selectedReasons.length === 0}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition"
          >
            Konfirmasi Keputusan FAIL
          </button>
        </div>
      </div>
    </div>
  );
};
