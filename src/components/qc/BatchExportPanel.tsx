import React, { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle, X } from 'lucide-react';
import type { CorrectionParams } from '../../types';
import { createBatchExport, validateBatch, MAX_BATCH_PHOTOS, BatchProgress } from '../../services/batchExport';
import { isAndroidTauriEnvironment, saveBlobToAndroid } from '../../services/androidExports';

interface BatchExportPanelProps {
  referenceSource: string;
  referenceName: string;
  params: CorrectionParams;
}

export const BatchExportPanel: React.FC<BatchExportPanelProps> = ({ referenceSource, referenceName, params }) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [transferPercent, setTransferPercent] = useState<number | null>(null);
  const [waitingForDestination, setWaitingForDestination] = useState(false);
  const running = useRef<AbortController | null>(null);

  useEffect(() => {
    setPhotos([]);
    setProgress(null);
    setMessage('');
    setError('');
    setTransferPercent(null);
    setWaitingForDestination(false);
    return () => { running.current?.abort(); running.current = null; };
  }, [referenceSource, referenceName]);

  const exportBatch = async () => {
    if (running.current) return;
    const controller = new AbortController();
    running.current = controller;
    setError('');
    setMessage('');
    setTransferPercent(null);
    setWaitingForDestination(false);
    setProgress({ completed: 0, total: photos.length + 1, name: referenceName });
    try {
      const result = await createBatchExport([
        { name: referenceName, source: referenceSource },
        ...photos.map((file) => ({ name: file.name, source: file })),
      ], params, { signal: controller.signal, onProgress: (value) => {
        if (running.current === controller && !controller.signal.aborted) setProgress(value);
      } });
      if (controller.signal.aborted || running.current !== controller) return;
      if (isAndroidTauriEnvironment()) {
        const saved = await saveBlobToAndroid(result.blob, result.filename, 'application/zip', (completed, total) => {
          if (running.current !== controller || controller.signal.aborted) return;
          setWaitingForDestination(false);
          setTransferPercent(Math.floor((completed / total) * 100));
        }, () => {
          if (running.current === controller) {
            setTransferPercent(null);
            setWaitingForDestination(true);
          }
        }, controller.signal);
        if (controller.signal.aborted || running.current !== controller) return;
        setMessage(saved.status === 'saved'
          ? `ZIP tersimpan dan diverifikasi: ${saved.fileName} (${saved.bytesWritten?.toLocaleString('id-ID')} bita).`
          : 'Penyimpanan ZIP dibatalkan. Tidak ada ZIP yang dinyatakan tersimpan.');
      } else {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setMessage(`ZIP berisi ${photos.length + 1} foto dan catatan koreksi siap diunduh. Periksa folder unduhan.`);
      }
    } catch (cause) {
      if (running.current !== controller) return;
      if (controller.signal.aborted) setMessage('Ekspor dibatalkan. Foto asli tetap tersedia.');
      else setError(cause instanceof Error ? cause.message : 'Ekspor batch gagal. Coba lagi.');
    } finally {
      if (running.current === controller) {
        running.current = null;
        setProgress(null);
        setTransferPercent(null);
        setWaitingForDestination(false);
      }
    }
  };

  return (
    <section className="bg-studio-900 border border-studio-800 rounded-xl p-5 space-y-3" aria-label="Ekspor batch satu produk">
      <div>
        <h3 className="text-sm font-semibold text-white">Pakai Koreksi Ini ke Foto Lain</h3>
        <p className="text-xs text-studio-400 mt-1">
          Acuan: <span className="text-studio-200 break-all">{referenceName}</span>. Nilai slider saat tombol ekspor ditekan dipakai sama untuk semua foto.
          Pilih foto lain dari produk dan pencahayaan yang sama.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className={`text-xs rounded-lg border border-studio-700 px-3 py-2 ${progress ? 'opacity-50' : 'cursor-pointer hover:bg-studio-800'}`}>
          Pilih Foto Tambahan
          <input aria-label="Foto tambahan untuk batch" type="file" accept=".jpg,.jpeg,.png,.webp" multiple
            className="sr-only" disabled={progress !== null}
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (!selected.length) return;
              try {
                validateBatch([{ name: referenceName, source: referenceSource }, ...selected.map((file) => ({ name: file.name, source: file }))]);
                setPhotos(selected);
                setError('');
                setMessage('');
              } catch (cause) { setError(cause instanceof Error ? cause.message : 'Foto tidak valid.'); }
            }} />
        </label>
        <span className="text-xs text-studio-400">{photos.length} foto tambahan · acuan ikut dalam ZIP</span>
      </div>
      {photos.length > 0 && <ul className="max-h-32 overflow-auto text-xs text-studio-300 space-y-1">
        {photos.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
          <span className="truncate">{file.name}</span>
          <button type="button" aria-label={`Hapus ${file.name} dari batch`} disabled={progress !== null}
            onClick={() => { setPhotos((current) => current.filter((_, i) => i !== index)); setMessage(''); }}
            className="p-1 hover:text-rose-300 disabled:opacity-40"><X className="w-3 h-3" /></button>
        </li>)}
      </ul>}
      <p className="text-[11px] text-studio-500">JPG, PNG, WebP · maksimal {MAX_BATCH_PHOTOS} foto termasuk acuan, total 200 MB. Berkas asli tetap utuh.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={exportBatch} disabled={!photos.length || progress !== null}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          {progress ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {waitingForDestination
            ? 'Pilih lokasi penyimpanan Android...'
            : transferPercent !== null
              ? `Menulis ZIP ${transferPercent}%...`
              : progress ? `Memproses ${progress.completed}/${progress.total} foto` : `Ekspor Acuan + ${photos.length} Foto ke ZIP`}
        </button>
        {progress && !waitingForDestination && <button type="button" className="text-xs text-studio-300 hover:text-white" onClick={() => running.current?.abort()}>Batalkan</button>}
      </div>
      {progress && <p role="status" className="text-xs text-studio-400 break-all">
        {waitingForDestination
          ? 'Gunakan tombol Batal di pemilih Android untuk membatalkan penyimpanan.'
          : transferPercent !== null
            ? `Mengirim berkas ZIP melalui potongan kecil (${transferPercent}%). Foto asli tetap utuh.`
            : `${progress.name} · Koreksi batch dikunci saat ekspor dimulai.`}
      </p>}
      {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    </section>
  );
};
