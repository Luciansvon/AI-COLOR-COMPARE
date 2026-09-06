import React, { useState } from 'react';
import { MasterIdentity } from '../../types';
import { X, Plus, ShieldCheck, Check, Info, Image as ImageIcon, Upload } from 'lucide-react';

interface MasterLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  masters: MasterIdentity[];
  selectedMasterId: string;
  onSelectMaster: (masterId: string) => void;
  onAddNewMaster: (master: Omit<MasterIdentity, 'id' | 'createdAt'>) => void;
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
  const [newCategory, setNewCategory] = useState<'wood' | 'metal' | 'fabric' | 'leather' | 'other'>('wood');
  const [newDesc, setNewDesc] = useState('');
  const [newTolerance, setNewTolerance] = useState('2.2');
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    onAddNewMaster({
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      category: newCategory,
      description: newDesc.trim() || undefined,
      referenceImageUrl: newImagePreview || undefined,
      toleranceDeltaE: parseFloat(newTolerance) || 2.2,
    });

    setNewCode('');
    setNewName('');
    setNewDesc('');
    setNewTolerance('2.2');
    setNewImagePreview(null);
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-studio-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Daftar Papan Master Fisik (Master Library)</h3>
              <p className="text-xs text-studio-400">
                Pilih sampel fisik acuan untuk perbandingan warna produk
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-studio-400 hover:text-white">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-studio-400 block mb-1">Kode Master (Contoh: WN-05)</label>
                <input
                  type="text"
                  required
                  placeholder="Kode Master..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-studio-900 border border-studio-700 rounded p-2 text-xs text-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-studio-400 block mb-1">Nama / Finishing</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Walnut Natural Semi-Gloss"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-studio-900 border border-studio-700 rounded p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-studio-400 block mb-1">Toleransi Selisih (ΔE₀₀)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10.0"
                  required
                  value={newTolerance}
                  onChange={(e) => setNewTolerance(e.target.value)}
                  className="w-full bg-studio-900 border border-studio-700 rounded p-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-studio-400 block mb-1">Foto Sampel Papan Master (Opsional)</label>
                <label className="w-full bg-studio-900 hover:bg-studio-800 border border-studio-700 rounded p-2 text-xs text-studio-300 flex items-center justify-center gap-1.5 cursor-pointer truncate">
                  <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{newImagePreview ? 'Foto Terpilih ✅' : 'Pilih Berkas Foto...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {newImagePreview && (
              <div className="flex items-center gap-2 p-2 bg-studio-900/90 rounded border border-studio-800">
                <img src={newImagePreview} alt="Pratinjau Master" className="w-10 h-10 object-cover rounded border border-studio-700" />
                <span className="text-[11px] text-emerald-400 font-medium">Foto master fisik siap dijadikan acuan visual!</span>
              </div>
            )}

            <div>
              <label className="text-[11px] text-studio-400 block mb-1">Keterangan Tambahan</label>
              <input
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
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition"
              >
                Simpan Master
              </button>
            </div>
          </form>
        ) : (
          <button
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
              <div
                key={m.id}
                onClick={() => {
                  onSelectMaster(m.id);
                  onClose();
                }}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition select-none ${
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
