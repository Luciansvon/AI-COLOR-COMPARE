import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from './tauriBridge';

export interface AndroidExportResult {
  status: 'saved' | 'cancelled';
  fileName?: string;
  bytesWritten?: number;
  sha256?: string;
  reason?: string;
}

let exportInFlight = false;

export function isAndroidTauriEnvironment(): boolean {
  return isTauriEnvironment()
    && typeof navigator !== 'undefined'
    && /Android/i.test(navigator.userAgent);
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const sliceSize = 32 * 1024;
  for (let offset = 0; offset < bytes.length; offset += sliceSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + sliceSize)));
  }
  return btoa(binary);
}

export async function saveBlobToAndroid(
  blob: Blob,
  fileName: string,
  mimeType: 'image/jpeg' | 'application/zip' | 'application/json',
  onProgress?: (completedBytes: number, totalBytes: number) => void,
  onDestinationPicker?: () => void,
  signal?: AbortSignal,
): Promise<AndroidExportResult> {
  if (!isAndroidTauriEnvironment()) throw new Error('Penyimpanan Android tidak tersedia pada lingkungan ini.');
  if (exportInFlight) throw new Error('Ekspor lain masih berjalan. Tunggu sampai selesai atau dibatalkan.');
  if (!Number.isSafeInteger(blob.size) || blob.size <= 0) throw new Error('Berkas ekspor kosong atau terlalu besar.');

  exportInFlight = true;
  let exportId = '';
  let finished = false;
  try {
    const started = await invoke<{ exportId?: string; chunkBytes?: number }>('android_io_begin_export', {
      fileName,
      mimeType,
      totalBytes: blob.size,
    });
    if (typeof started?.exportId === 'string' && started.exportId.length > 0) exportId = started.exportId;
    if (!exportId || !Number.isSafeInteger(started?.chunkBytes)
      || !started.chunkBytes || started.chunkBytes < 1 || started.chunkBytes > 512 * 1024) {
      throw new Error('Android tidak menyiapkan sesi ekspor dengan benar.');
    }

    for (let offset = 0; offset < blob.size; offset += started.chunkBytes) {
      if (signal?.aborted) throw new Error('Ekspor dibatalkan sebelum pemilih tujuan dibuka.');
      const chunk = new Uint8Array(await blob.slice(offset, offset + started.chunkBytes).arrayBuffer());
      const base64 = encodeBase64(chunk);
      const response = await invoke<{ bytesWritten?: number }>('android_io_append_export_chunk', {
        exportId,
        base64,
        offset,
      });
      if (response.bytesWritten !== offset + chunk.byteLength) {
        throw new Error('Android menerima jumlah bita yang berbeda dari berkas ekspor.');
      }
      onProgress?.(offset + chunk.byteLength, blob.size);
    }

    if (signal?.aborted) throw new Error('Ekspor dibatalkan sebelum pemilih tujuan dibuka.');
    onDestinationPicker?.();
    const result = await invoke<AndroidExportResult>('android_io_save_export', { exportId });
    if (!result || (result.status !== 'saved' && result.status !== 'cancelled')) {
      throw new Error('Android tidak mengonfirmasi hasil penyimpanan.');
    }
    finished = true;
    if (result.status === 'saved'
      && (typeof result.fileName !== 'string' || result.bytesWritten !== blob.size
        || typeof result.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(result.sha256))) {
      throw new Error('Verifikasi berkas Android tidak cocok dengan ukuran sumber.');
    }
    return result;
  } finally {
    if (exportId && !finished) {
      try { await invoke('android_io_abort_export', { exportId }); } catch { /* Sesi mungkin sudah dibersihkan oleh Android. */ }
    }
    exportInFlight = false;
  }
}
