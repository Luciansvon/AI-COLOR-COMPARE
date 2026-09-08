// Ekstraksi Pixel ROI dari Gambar & Penerapan Preview Koreksi Non-Destruktif

import { ROIBox, CorrectionParams } from '../types';
import { extractROIStats, PixelDataStats } from '../color_science/metrics';
import { applyCorrectionToRgb, hasActiveCorrection } from '../color_science/imageCorrection';

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
 * Menghasilkan preview gambar yang sudah disesuaikan dengan parameter koreksi.
 * Preview dan ekspor memakai transformasi piksel yang sama agar hasil tidak berbeda.
 */
export async function renderCorrectedPreview(
  originalSrc: string,
  correction: CorrectionParams
): Promise<string> {
  if (!hasActiveCorrection(correction)) {
    return originalSrc;
  }
  return convertImageToJpegDataUrl(originalSrc, 0.95, correction);
}

/**
 * Menjamin hasil ekspor benar-benar berupa byte JPEG, termasuk ketika preview
 * belum memiliki koreksi dan sumber awalnya PNG/WebP.
 */
export async function convertImageToJpegDataUrl(
  source: string,
  quality: number = 0.95,
  correction?: CorrectionParams
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

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  if (correction && hasActiveCorrection(correction)) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const corrected = applyCorrectionToRgb(data[i], data[i + 1], data[i + 2], correction);
      data[i] = corrected.r;
      data[i + 1] = corrected.g;
      data[i + 2] = corrected.b;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const safeQuality = Math.max(0.1, Math.min(1, quality));
  const dataUrl = canvas.toDataURL('image/jpeg', safeQuality);
  if (!dataUrl.startsWith('data:image/jpeg')) {
    throw new Error('Browser gagal menghasilkan data JPEG');
  }
  return dataUrl;
}
