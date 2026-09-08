import { strToU8, zipSync } from 'fflate';
import type { CorrectionParams } from '../types';
import { convertImageToJpegDataUrl } from '../utils/canvasColorExtractor';

export const MAX_BATCH_PHOTOS = 50;
export const MAX_BATCH_BYTES = 200 * 1024 * 1024;
export interface BatchPhoto { name: string; source: string | File }
export interface BatchProgress { completed: number; total: number; name: string }

function safeBase(name: string) {
  return name.replace(/\.[^/.]+$/, '').replace(/[\x00-\x1f<>:"/\\|?*]/g, '_')
    .replace(/^[. ]+|[. ]+$/g, '').slice(0, 120) || 'foto';
}

export function validateBatch(photos: BatchPhoto[]): void {
  if (photos.length < 2) throw new Error('Pilih minimal satu foto tambahan selain foto acuan.');
  if (photos.length > MAX_BATCH_PHOTOS) throw new Error(`Maksimal ${MAX_BATCH_PHOTOS} foto termasuk acuan. Pisahkan menjadi beberapa batch.`);
  let bytes = 0;
  for (const photo of photos) {
    if (typeof photo.source !== 'string') {
      if (!/\.(jpe?g|png|webp)$/i.test(photo.name)) {
        throw new Error(`${photo.name}: gunakan JPG, PNG, atau WebP.`);
      }
      bytes += photo.source.size;
    } else {
      bytes += Math.ceil(photo.source.length * 0.75);
    }
  }
  if (bytes > MAX_BATCH_BYTES) throw new Error('Total foto melebihi 200 MB. Pisahkan menjadi beberapa batch.');
}

export async function createBatchExport(
  photos: BatchPhoto[],
  params: CorrectionParams,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: BatchProgress) => void;
    // Pengganti encoder hanya untuk tes unit tanpa browser.
    encode?: typeof convertImageToJpegDataUrl;
  } = {},
): Promise<{ blob: Blob; filename: string }> {
  validateBatch(photos);
  // Snapshot sebelum await: perubahan slider/daftar berikutnya tidak mencampur satu batch.
  const correction = Object.freeze({ ...params });
  const inputs = photos.map((photo) => ({ ...photo }));
  const encode = options.encode ?? convertImageToJpegDataUrl;
  const files: Record<string, Uint8Array> = Object.create(null);
  const names = new Set<string>();
  const entries: { source: string; output: string }[] = [];
  let outputBytes = 0;
  const checkCancelled = () => {
    if (options.signal?.aborted) throw new DOMException('Ekspor batch dibatalkan.', 'AbortError');
  };

  for (const [index, photo] of inputs.entries()) {
    checkCancelled();
    options.onProgress?.({ completed: index, total: inputs.length, name: photo.name });
    // Beri UI kesempatan menampilkan progres dan menerima pembatalan antar foto.
    await new Promise((resolve) => setTimeout(resolve, 0));
    checkCancelled();
    const temporaryUrl = typeof photo.source === 'string' ? null : URL.createObjectURL(photo.source);
    try {
      const jpeg = await encode(temporaryUrl ?? (photo.source as string), 0.95, correction);
      checkCancelled();
      const prefix = 'data:image/jpeg;base64,';
      if (!jpeg.startsWith(prefix)) throw new Error('Hasil foto bukan JPEG yang valid.');
      const binary = atob(jpeg.slice(prefix.length));
      outputBytes += binary.length;
      if (outputBytes > MAX_BATCH_BYTES) throw new Error('Hasil ekspor melebihi 200 MB. Kurangi jumlah foto.');
      const base = `${safeBase(photo.name)}_corrected_srgb`;
      let filename = `${base}.jpg`;
      let suffix = 2;
      while (names.has(filename.toLowerCase())) filename = `${base}_${suffix++}.jpg`;
      names.add(filename.toLowerCase());
      files[filename] = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      entries.push({ source: photo.name, output: filename });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error(`${photo.name}: ${error instanceof Error ? error.message : 'Gagal memproses foto.'} ZIP belum dibuat.`);
    } finally {
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    }
    options.onProgress?.({ completed: index + 1, total: inputs.length, name: photo.name });
  }

  checkCancelled();
  files['koreksi-batch.json'] = strToU8(JSON.stringify({
    referencePhoto: inputs[0].name,
    createdAt: new Date().toISOString(),
    correction,
    jpegQuality: 0.95,
    photos: entries,
  }, null, 2));
  // JPEG sudah terkompresi; simpan di ZIP tanpa mengompres ulang pikselnya.
  const archive = zipSync(files, { level: 0 });
  return {
    blob: new Blob([archive], { type: 'application/zip' }),
    filename: `${safeBase(inputs[0].name)}_batch_koreksi.zip`,
  };
}
