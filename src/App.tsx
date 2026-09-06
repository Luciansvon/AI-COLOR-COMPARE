import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { MainQCScreen } from './components/qc/MainQCScreen';
import { MasterLibraryModal } from './components/master/MasterLibraryModal';
import { QCHistoryView } from './components/history/QCHistoryView';
import { INITIAL_MASTERS } from './data/initialMasters';
import { MasterIdentity, QCRecord } from './types';
import { CheckCircle } from 'lucide-react';

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

  const currentMaster = masters.find((m) => m.id === currentMasterId) || masters[0];

  const handleAddNewMaster = (newMasterData: Omit<MasterIdentity, 'id' | 'createdAt'>) => {
    const newMaster: MasterIdentity = {
      ...newMasterData,
      id: `master-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMasters((prev) => [...prev, newMaster]);
    setCurrentMasterId(newMaster.id);
    showToast(`Master baru "${newMaster.code} — ${newMaster.name}" berhasil ditambahkan & dipilih.`);
  };

  const handleSaveQCRecord = (record: QCRecord) => {
    setHistoryRecords((prev) => [record, ...prev]);
    showToast(`Keputusan QC produk berhasil disimpan ke riwayat studio!`);
  };

  const showToast = (msg: string) => {
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

      {/* Main Content Area */}
      <main className="flex-1 px-6 pt-6">
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
        <div className="fixed bottom-6 right-6 z-50 bg-studio-900 border border-emerald-500/40 text-emerald-300 text-xs font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
