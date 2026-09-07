import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/common/Header';
import { MainQCScreen } from './components/qc/MainQCScreen';
import { MasterLibraryModal } from './components/master/MasterLibraryModal';
import { QCHistoryView } from './components/history/QCHistoryView';
import { INITIAL_MASTERS } from './data/initialMasters';
import { MasterIdentity, QCRecord } from './types';
import { AlertCircle, CheckCircle } from 'lucide-react';
import {
  getMastersFromStorage,
  getQCRecordsFromStorage,
  persistMasterToStorage,
  persistQCRecordToStorage,
  isTauriEnvironment,
} from './services/tauriBridge';

export const App: React.FC = () => {
  // State Master Library
  const [masters, setMasters] = useState<MasterIdentity[]>(INITIAL_MASTERS);
  const [currentMasterId, setCurrentMasterId] = useState<string>(INITIAL_MASTERS[0].id);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState<boolean>(false);

  // State Riwayat QC
  const [historyRecords, setHistoryRecords] = useState<QCRecord[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // State Pesan Notifikasi Sederhana
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<'success' | 'error'>('success');
  const [storageLoadError, setStorageLoadError] = useState<string | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [storageRetryKey, setStorageRetryKey] = useState(0);
  const didChangeMasterRef = useRef(false);

  // Muat data dari SQLite via Tauri saat aplikasi dibuka
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoadingStorage(true);
      try {
        const storedMasters = await getMastersFromStorage();
        if (!cancelled && storedMasters && storedMasters.length > 0) {
          setMasters(storedMasters);
          if (!didChangeMasterRef.current) {
            setCurrentMasterId(storedMasters[0].id);
          }
        }

        const storedRecords = await getQCRecordsFromStorage();
        if (!cancelled && storedRecords && storedRecords.length > 0) {
          setHistoryRecords(storedRecords);
        }
        if (!cancelled) setStorageLoadError(null);
      } catch (error) {
        console.error('[Storage] Gagal memuat data awal:', error);
        if (!cancelled) {
          setStorageLoadError('Database lokal belum bisa dibaca. Tampilan memakai data awal sesi sampai koneksi dicoba lagi.');
          showToast('Database lokal belum bisa dibaca.', 'error');
        }
      } finally {
        if (!cancelled) setIsLoadingStorage(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [storageRetryKey]);

  const currentMaster = masters.find((m) => m.id === currentMasterId) || masters[0];

  const handleAddNewMaster = async (newMasterData: Omit<MasterIdentity, 'id' | 'createdAt'>): Promise<boolean> => {
    const newMaster: MasterIdentity = {
      ...newMasterData,
      id: `master-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    let persisted = false;
    try {
      persisted = await persistMasterToStorage(newMaster);
    } catch (error) {
      console.error('[Storage] Gagal menyimpan master:', error);
      showToast(`Master "${newMaster.code}" gagal disimpan.`, 'error');
      return false;
    }
    if (isTauriEnvironment() && !persisted) {
      showToast(`Master "${newMaster.code}" gagal disimpan. Data tidak ditambahkan agar UI tidak berbeda dengan database.`, 'error');
      return false;
    }

    setMasters((prev) => [...prev, newMaster]);
    didChangeMasterRef.current = true;
    setCurrentMasterId(newMaster.id);
    showToast(
      isTauriEnvironment()
        ? `Master baru "${newMaster.code} — ${newMaster.name}" berhasil disimpan ke database.`
        : `Master "${newMaster.code} — ${newMaster.name}" ditambahkan sementara untuk sesi pratinjau browser.`,
      'success'
    );
    return true;
  };

  const handleSaveQCRecord = async (record: QCRecord): Promise<boolean> => {
    const persisted = await persistQCRecordToStorage(record);
    if (isTauriEnvironment() && !persisted) {
      showToast('Keputusan QC gagal disimpan. Status akhir tidak akan dikunci agar data tidak menipu operator.', 'error');
      return false;
    }

    setHistoryRecords((prev) => [record, ...prev]);
    showToast(
      isTauriEnvironment()
        ? 'Keputusan QC produk berhasil disimpan ke riwayat studio.'
        : 'Keputusan QC tersimpan sementara di sesi pratinjau browser.',
      'success'
    );
    return true;
  };

  const showToast = (msg: string, kind: 'success' | 'error' = 'success') => {
    setToastKind(kind);
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-studio-950 text-studio-100 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        currentMaster={currentMaster}
        onOpenMasterLibrary={() => setIsMasterModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={historyRecords.length}
      />

      {!isTauriEnvironment() && (
        <div className="mx-3 sm:mx-6 mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200 flex flex-wrap items-center justify-between gap-2">
          <span>Mode pratinjau browser: perubahan hanya berlaku selama sesi ini.</span>
          <span className="font-mono text-[10px] text-sky-300/80">Penyimpanan permanen: aplikasi desktop</span>
        </div>
      )}

      {storageLoadError && (
        <div className="mx-3 sm:mx-6 mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{storageLoadError}</span>
          <button
            type="button"
            onClick={() => setStorageRetryKey((value) => value + 1)}
            disabled={isLoadingStorage}
            className="rounded-md border border-rose-400/40 px-2.5 py-1 font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
          >
            {isLoadingStorage ? 'Mencoba...' : 'Coba lagi'}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-6 pt-6">
        <MainQCScreen
          key={currentMaster.id}
          currentMaster={currentMaster}
          onSaveQCRecord={handleSaveQCRecord}
        />
      </main>

      {/* Modal Master Library */}
      <MasterLibraryModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        masters={masters}
        selectedMasterId={currentMasterId}
        onSelectMaster={(id) => {
          didChangeMasterRef.current = true;
          setCurrentMasterId(id);
          const m = masters.find((item) => item.id === id);
          if (m) showToast(`Master acuan diganti ke: ${m.code} — ${m.name}`);
        }}
        onAddNewMaster={handleAddNewMaster}
      />

      {/* Modal Riwayat QC */}
      <QCHistoryView
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        records={historyRecords}
      />

      {/* Toast Notification Sederhana */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-studio-900 text-xs font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 ${
            toastKind === 'error'
              ? 'border border-rose-500/50 text-rose-300'
              : 'border border-emerald-500/40 text-emerald-300'
          }`}
        >
          {toastKind === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
