import React, { useState, useEffect } from 'react';
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

  // Muat data dari SQLite via Tauri saat aplikasi dibuka
  useEffect(() => {
    async function loadData() {
      const storedMasters = await getMastersFromStorage();
      if (storedMasters && storedMasters.length > 0) {
        setMasters(storedMasters);
        setCurrentMasterId(storedMasters[0].id);
      }

      const storedRecords = await getQCRecordsFromStorage();
      if (storedRecords && storedRecords.length > 0) {
        setHistoryRecords(storedRecords);
      }
    }
    loadData();
  }, []);

  const currentMaster = masters.find((m) => m.id === currentMasterId) || masters[0];

  const handleAddNewMaster = async (newMasterData: Omit<MasterIdentity, 'id' | 'createdAt'>) => {
    const newMaster: MasterIdentity = {
      ...newMasterData,
      id: `master-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const persisted = await persistMasterToStorage(newMaster);
    if (isTauriEnvironment() && !persisted) {
      showToast(`Master "${newMaster.code}" gagal disimpan. Data tidak ditambahkan agar UI tidak berbeda dengan database.`, 'error');
      return;
    }

    setMasters((prev) => [...prev, newMaster]);
    setCurrentMasterId(newMaster.id);
    showToast(
      isTauriEnvironment()
        ? `Master baru "${newMaster.code} — ${newMaster.name}" berhasil disimpan ke database.`
        : `Master "${newMaster.code} — ${newMaster.name}" ditambahkan sementara untuk sesi pratinjau browser.`,
      'success'
    );
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
    <div className="operator-readable min-h-screen bg-studio-950 text-studio-100 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        currentMaster={currentMaster}
        onOpenMasterLibrary={() => setIsMasterModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={historyRecords.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 md:px-8 pt-6 md:pt-8">
        <MainQCScreen
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
          className={`fixed bottom-6 right-6 z-50 bg-studio-900 text-base font-semibold px-5 py-4 rounded-xl shadow-2xl flex items-center gap-2 ${
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
