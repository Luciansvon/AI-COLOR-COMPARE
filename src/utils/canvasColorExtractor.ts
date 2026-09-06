// Ekstraksi Pixel ROI dari Gambar & Penerapan Preview Koreksi Non-Destruktif

import { ROIBox, CorrectionParams } from '../types';
import { extractROIStats, PixelDataStats } from '../color_science/metrics';

/**
 * Memuat gambar dari URL/DataURL ke objek HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
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

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Gagal mendapatkan konteks 2D canvas');

  ctx.drawImage(img, 0, 0);

  // Hitung koordinat piksel berdasarkan persentase ROI
  const pixelX = Math.round((box.x / 100) * canvas.width);
  const pixelY = Math.round((box.y / 100) * canvas.height);
  const pixelW = Math.max(1, Math.round((box.width / 100) * canvas.width));
  const pixelH = Math.max(1, Math.round((box.height / 100) * canvas.height));

  const clampedX = Math.max(0, Math.min(canvas.width - 1, pixelX));
  const clampedY = Math.max(0, Math.min(canvas.height - 1, pixelY));
  const clampedW = Math.min(canvas.width - clampedX, pixelW);
  const clampedH = Math.min(canvas.height - clampedY, pixelH);

  const imageData = ctx.getImageData(clampedX, clampedY, clampedW, clampedH);
  return extractROIStats(imageData.data);
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
