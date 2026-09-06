// Ekstraksi Pixel ROI dari Gambar & Penerapan Preview Koreksi Non-Destruktif

import { ROIBox, CorrectionParams } from '../types';
import { extractROIStats, PixelDataStats } from '../color_science/metrics';

/**
 * Memuat gambar dari URL/DataURL ke objek HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Ekstraksi statistik warna (Lab, RGB, Kecerahan, Kontras) dari area ROI tertentu pada gambar
 */
export async function extractStatsFromImageROI(
  imageSource: string | HTMLImageElement,
  box: ROIBox
): Promise<PixelDataStats> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;

  const totalWidth = img.naturalWidth || img.width;
  const totalHeight = img.naturalHeight || img.height;

  // Hitung koordinat piksel berdasarkan persentase ROI
  const pixelX = Math.round((box.x / 100) * totalWidth);
  const pixelY = Math.round((box.y / 100) * totalHeight);
  const pixelW = Math.max(1, Math.round((box.width / 100) * totalWidth));
  const pixelH = Math.max(1, Math.round((box.height / 100) * totalHeight));

  const clampedX = Math.max(0, Math.min(totalWidth - 1, pixelX));
  const clampedY = Math.max(0, Math.min(totalHeight - 1, pixelY));
  const clampedW = Math.max(1, Math.min(totalWidth - clampedX, pixelW));
  const clampedH = Math.max(1, Math.min(totalHeight - clampedY, pixelH));

  // Alokasikan canvas HANYA sebesar ukuran ROI untuk menghemat memori (CPU-first 8GB RAM)
  const canvas = document.createElement('canvas');
  canvas.width = clampedW;
  canvas.height = clampedH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Gagal mendapatkan konteks 2D canvas');

  ctx.drawImage(img, clampedX, clampedY, clampedW, clampedH, 0, 0, clampedW, clampedH);
  const imageData = ctx.getImageData(0, 0, clampedW, clampedH);
  return extractROIStats(imageData.data);
}

/**
 * Ekstraksi piksel dan dimensi ROI untuk analisis warna dan tekstur serat kayu (Fase P1)
 */
export async function extractPixelsFromImageROI(
  imageSource: string | HTMLImageElement,
  box: ROIBox
): Promise<{ data: Uint8ClampedArray; width: number; height: number; stats: PixelDataStats }> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;

  const totalWidth = img.naturalWidth || img.width;
  const totalHeight = img.naturalHeight || img.height;

  const pixelX = Math.round((box.x / 100) * totalWidth);
  const pixelY = Math.round((box.y / 100) * totalHeight);
  const pixelW = Math.max(1, Math.round((box.width / 100) * totalWidth));
  const pixelH = Math.max(1, Math.round((box.height / 100) * totalHeight));

  const clampedX = Math.max(0, Math.min(totalWidth - 1, pixelX));
  const clampedY = Math.max(0, Math.min(totalHeight - 1, pixelY));
  const clampedW = Math.max(1, Math.min(totalWidth - clampedX, pixelW));
  const clampedH = Math.max(1, Math.min(totalHeight - clampedY, pixelH));

  const canvas = document.createElement('canvas');
  canvas.width = clampedW;
  canvas.height = clampedH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Gagal mendapatkan konteks 2D canvas');

  ctx.drawImage(img, clampedX, clampedY, clampedW, clampedH, 0, 0, clampedW, clampedH);
  const imageData = ctx.getImageData(0, 0, clampedW, clampedH);
  const stats = extractROIStats(imageData.data);

  return {
    data: imageData.data,
    width: clampedW,
    height: clampedH,
    stats,
  };
}

/**
 * Menghasilkan preview gambar yang sudah disesuaikan dengan parameter koreksi
 * NON-DESTRUCTIVE: Hanya memanipulasi canvas sementara dan menghasilkan DataURL baru
 */
export async function renderCorrectedPreview(
  originalSrc: string,
  correction: CorrectionParams
): Promise<string> {
  const img = await loadImage(originalSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return originalSrc;

  // Gambar foto asli
  ctx.drawImage(img, 0, 0);

  // Jika tidak ada koreksi yang diaktifkan, kembalikan gambar asli
  if (
    correction.temperatureK === 0 &&
    correction.tint === 0 &&
    correction.exposureEV === 0 &&
    correction.brightness === 0 &&
    correction.saturation === 0 &&
    correction.contrast === 0
  ) {
    return originalSrc;
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Faktor kalkulasi
  // Exposure EV: 2^(EV)
  const expMultiplier = Math.pow(2, correction.exposureEV);
  const tempShift = correction.temperatureK / 50; // Pergeseran suhu hangat/dingin
  const tintShift = correction.tint * 0.5;
  const satMultiplier = 1 + correction.saturation / 100;
  const brightnessOffset = correction.brightness * 1.2;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure & Brightness
    r = r * expMultiplier + brightnessOffset;
    g = g * expMultiplier + brightnessOffset;
    b = b * expMultiplier + brightnessOffset;

    // 2. White Balance (Temperature: Merah/Kuning vs Biru)
    r += tempShift * 0.8;
    g += tempShift * 0.2 - tintShift * 0.5;
    b -= tempShift * 1.0;

    // 3. Saturation (Peningkatan selisih dari nilai abu-abu)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * satMultiplier;
    g = gray + (g - gray) * satMultiplier;
    b = gray + (b - gray) * satMultiplier;

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}


/**
 * Menjamin hasil ekspor benar-benar berupa byte JPEG, termasuk ketika preview
 * belum memiliki koreksi dan sumber awalnya PNG/WebP.
 */
export async function convertImageToJpegDataUrl(
  source: string,
  quality: number = 0.95
): Promise<string> {
  if (!source) throw new Error('Sumber gambar ekspor kosong');

  const img = await loadImage(source);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (width <= 0 || height <= 0) throw new Error('Dimensi gambar ekspor tidak valid');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal mendapatkan konteks canvas untuk ekspor JPEG');

  // JPEG tidak punya alpha. Gunakan putih sebagai latar yang eksplisit.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const safeQuality = Math.max(0.1, Math.min(1, quality));
  const dataUrl = canvas.toDataURL('image/jpeg', safeQuality);
  if (!dataUrl.startsWith('data:image/jpeg')) {
    throw new Error('Browser gagal menghasilkan data JPEG');
  }
  return dataUrl;
}
