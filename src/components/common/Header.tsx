import React from 'react';
import appConfig from '../../../src-tauri/tauri.conf.json';
import { ShieldCheck, History, Sliders } from 'lucide-react';
import { MasterIdentity } from '../../types';

interface HeaderProps {
  currentMaster: MasterIdentity;
  onOpenMasterLibrary: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMaster,
  onOpenMasterLibrary,
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.35rem)' }}
      className="border-b border-studio-800 bg-studio-900/95 backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30"
    >
      {/* Brand & System Title */}
      <div className="flex items-center gap-2 min-w-0">
        <img
          src="/app-icon.png"
          alt="Studio QC"
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg object-cover shadow-md border border-studio-700 bg-white shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-xs sm:text-base font-semibold text-white tracking-wide truncate">
              <span className="sm:hidden">Studio Color QC</span>
              <span className="hidden sm:inline">Studio Color Consistency &amp; Material QC</span>
            </h1>
            <span className="text-[9px] sm:text-[11px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-studio-800 text-studio-300 border border-studio-700 shrink-0">
              v{appConfig.version}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-studio-400 truncate">
            Pemeriksa Konsistensi Warna Furnitur Terhadap Master Fisik
          </p>
        </div>
      </div>

      {/* Right Controls: Master Pill & History Button in 1 single row */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Master Selector Button */}
        <button
          onClick={onOpenMasterLibrary}
          aria-label={`Ganti master aktif, ${currentMaster.code} ${currentMaster.name}`}
          className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-2 py-1 transition-all"
          title={`Master Acuan: ${currentMaster.code} — ${currentMaster.name} (Klik untuk ganti)`}
        >
          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="sm:hidden font-bold">{currentMaster.code}</span>
          <span className="hidden sm:inline truncate max-w-xs">{currentMaster.code} — {currentMaster.name}</span>
          <Sliders className="w-3 h-3 opacity-70 shrink-0" />
        </button>

        {/* History Button */}
        <button
          onClick={onOpenHistory}
          aria-label={`Buka riwayat QC${historyCount > 0 ? `, ${historyCount} catatan` : ''}`}
          className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-studio-200 bg-studio-800 hover:bg-studio-700 border border-studio-700 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 transition-all"
        >
          <History className="w-3.5 h-3.5 text-studio-400" />
          <span className="hidden sm:inline">Riwayat QC</span>
          {historyCount > 0 && (
            <span className="bg-amber-500/20 text-amber-300 font-mono text-[9px] px-1.5 py-0.2 rounded-full border border-amber-500/30">
              {historyCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
