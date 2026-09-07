import React from 'react';
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
    <header className="min-h-16 border-b border-studio-800 bg-studio-900/95 backdrop-blur-md px-3 sm:px-6 py-2 flex flex-wrap items-center gap-2 sm:gap-4 sticky top-0 z-30">
      {/* Brand & System Title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <img
          src="/app-icon.png"
          alt="Studio QC"
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover shadow-md border border-studio-700 bg-white shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
              <span className="sm:hidden">Studio Color QC</span>
              <span className="hidden sm:inline">Studio Color Consistency &amp; Material QC</span>
            </h1>
            <span className="text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-studio-800 text-studio-300 border border-studio-700 shrink-0">
              v0.3.1
            </span>
          </div>
          <p className="hidden sm:block text-xs text-studio-400 truncate">
            Pemeriksa Konsistensi Warna Furnitur Terhadap Master Fisik
          </p>
        </div>
      </div>

      {/* Center: Selected Master Badge */}
      <div className="order-3 sm:order-none w-full sm:w-auto flex items-center justify-center gap-2 bg-studio-950/80 border border-studio-800 rounded-lg px-2.5 sm:px-3.5 py-1.5 shadow-sm min-w-0">
        <span className="text-[11px] sm:text-xs text-studio-400 flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Master Aktif:</span>
          <span className="inline sm:hidden">Master:</span>
        </span>
        <button
          onClick={onOpenMasterLibrary}
          aria-label={`Ganti master aktif, ${currentMaster.code} ${currentMaster.name}`}
          className="flex items-center gap-2 min-w-0 max-w-[min(70vw,28rem)] text-[11px] sm:text-xs font-mono font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded px-2 sm:px-2.5 py-1 transition-all"
          title="Klik untuk mengganti papan master fisik"
        >
          <span className="truncate">{currentMaster.code} — {currentMaster.name}</span>
          <Sliders className="w-3 h-3 ml-1 opacity-70" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenHistory}
          aria-label={`Buka riwayat QC${historyCount > 0 ? `, ${historyCount} catatan` : ''}`}
          className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-studio-200 bg-studio-800 hover:bg-studio-700 border border-studio-700 rounded-lg px-2 sm:px-3 py-1.5 transition-all"
        >
          <History className="w-4 h-4 text-studio-400" />
          <span className="hidden sm:inline">Riwayat QC</span>
          <span className="sm:hidden">Riwayat</span>
          {historyCount > 0 && (
            <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] px-1.5 py-0.2 rounded-full border border-amber-500/30">
              {historyCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
