import React from 'react';
import { Layers, ShieldCheck, History, Sliders, Camera } from 'lucide-react';
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
    <header className="h-16 border-b border-studio-800 bg-studio-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & System Title */}
      <div className="flex items-center space-x-3">
        <img
          src="/app-icon.png"
          alt="Studio QC"
          className="w-10 h-10 rounded-lg object-cover shadow-md border border-studio-700 bg-white"
        />
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-semibold text-white tracking-wide">
              Studio Color Consistency & Material QC
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-studio-800 text-studio-300 border border-studio-700">
              v0.1 P0 Core
            </span>
          </div>
          <p className="text-xs text-studio-400">
            Pemeriksa Konsistensi Warna Furnitur Terhadap Master Fisik
          </p>
        </div>
      </div>

      {/* Center: Selected Master Badge */}
      <div className="flex items-center space-x-3 bg-studio-950/80 border border-studio-800 rounded-lg px-3.5 py-1.5 shadow-sm">
        <span className="text-xs text-studio-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Master Aktif:
        </span>
        <button
          onClick={onOpenMasterLibrary}
          className="flex items-center space-x-2 text-xs font-mono font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded px-2.5 py-1 transition-all"
          title="Klik untuk mengganti papan master fisik"
        >
          <span>{currentMaster.code} — {currentMaster.name}</span>
          <Sliders className="w-3 h-3 ml-1 opacity-70" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenHistory}
          className="flex items-center space-x-2 text-xs font-medium text-studio-200 bg-studio-800 hover:bg-studio-700 border border-studio-700 rounded-lg px-3 py-1.5 transition-all"
        >
          <History className="w-4 h-4 text-studio-400" />
          <span>Riwayat QC</span>
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
