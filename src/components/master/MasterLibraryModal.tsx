import React, { useState } from 'react';
import { MasterIdentity } from '../../types';
import { X, Plus, ShieldCheck, Check, Info } from 'lucide-react';
import { useModalAccessibility } from '../common/useModalAccessibility';

interface MasterLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  masters: MasterIdentity[];
  selectedMasterId: string;
  onSelectMaster: (masterId: string) => void;
  onAddNewMaster: (master: Omit<MasterIdentity, 'id' | 'createdAt'>) => Promise<boolean>;
}

export const MasterLibraryModal: React.FC<MasterLibraryModalProps> = ({
  isOpen,
  onClose,
  masters,
  selectedMasterId,
  onSelectMaster,
  onAddNewMaster,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    setIsSaving(true);
    let saved = false;
    try {
      saved = await onAddNewMaster({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        category: 'wood',
        description: newDesc.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }

    if (!saved) return;

    setNewCode('');
    setNewName('');
    setNewDesc('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="master-library-title"
        tabIndex={-1}
        className="bg-studio-900 border border-studio-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-studio-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="master-library-title" className="text-sm font-semibold text-white">Daftar Papan Master Fisik</h3>
              <p className="text-xs text-studio-400">
                Pilih sampel fisik acuan untuk perbandingan warna produk
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup daftar master" className="p-1 rounded text-studio-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informasi Prinsip PRD (INV-001 & REQ-MASTER-002) */}
        <div className="p-3 bg-studio-950 rounded-lg border border-studio-800 text-xs text-studio-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Prinsip Master Fisik:</span> Master panel adalah acuan kebenaran utama. Sistem tidak menebak master secara otomatis; operator studio yang menentukan master mana yang seharusnya dicocokkan dengan produk.
          </div>
        </div>

        {/* Form Tambah Master Baru */}
        {isAdding ? (
          <form onSubmit={handleCreate} className="p-4 bg-studio-950 rounded-lg border border-studio-800 space-y-3">
            <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Tambah Identitas Master Fisik Baru
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-master-code" className="text-[11px] text-studio-400 block mb-1">Kode Master (Contoh: WN-05)</label>
                <input
                  id="new-master-code"
                  type="text"
                  required
                  placeholder="Kode Master..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-studio-900 border border-studio-700 rounded p-2 text-xs text-white uppercase font-mono"
                />
              </div>
              <div>
                <label htmlFor="new-master-name" className="text-[11px] text-studio-400 block mb-1">Nama / Finishing</label>
                <input
                  id="new-master-name"
                  type="text"
                  required
                  placeholder="Contoh: Walnut Natural Semi-Gloss"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-studio-900 border border-studio-700 rounded p-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-master-description" className="text-[11px] text-studio-400 block mb-1">Keterangan Tambahan</label>
              <input
                id="new-master-description"
                type="text"
                placeholder="Catatan papan sampel fisik di rak studio..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-studio-900 border border-studio-700 rounded p-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded text-xs text-studio-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Master'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            id="btn-add-new-master"
            className="w-full py-2 border border-dashed border-studio-700 hover:border-amber-400/60 rounded-lg text-xs font-semibold text-studio-300 hover:text-amber-300 flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Identitas Master Baru
          </button>
        )}

        {/* Daftar Master */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {masters.map((m) => {
            const isSelected = m.id === selectedMasterId;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => {
                  onSelectMaster(m.id);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-lg border flex items-center justify-between cursor-pointer transition select-none ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-studio-800 bg-studio-950/40 text-studio-300 hover:border-studio-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {m.referenceImageUrl ? (
                    <img
                      src={m.referenceImageUrl}
                      alt={m.name}
                      className="w-9 h-9 rounded object-cover border border-studio-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-[#3d2b1f] border border-studio-700 flex items-center justify-center text-[10px] font-bold text-amber-300 shrink-0">
                      {m.code.slice(0, 2)}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-amber-400 text-xs px-2 py-0.5 rounded bg-studio-900 border border-studio-800">
                        {m.code}
                      </span>
                      <span className="font-semibold text-sm text-white">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-studio-400">
                      <span>Toleransi: ΔE ≤ {m.toleranceDeltaE || 2.2}</span>
                      {m.description && <span>• {m.description}</span>}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 font-mono">
                    <Check className="w-4 h-4" />
                    <span>Dipilih</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
