import type { CorrectionParams } from '../types';

export type RGBPixel = { r: number; g: number; b: number };

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export const hasActiveCorrection = (correction: CorrectionParams): boolean =>
  correction.temperatureK !== 0 ||
  correction.tint !== 0 ||
  correction.exposureEV !== 0 ||
  correction.brightness !== 0 ||
  correction.contrast !== 0 ||
  correction.saturation !== 0;

/**
 * Transformasi piksel tunggal yang dipakai bersama oleh preview dan ekspor JPEG.
 * Urutan: exposure/brightness -> white balance -> saturation -> contrast.
 */
export function applyCorrectionToRgb(
  r0: number,
  g0: number,
  b0: number,
  correction: CorrectionParams
): RGBPixel {
  const expMultiplier = Math.pow(2, correction.exposureEV);
  const brightnessOffset = correction.brightness * 1.2;
  const tempShift = correction.temperatureK / 50;
  const tintShift = correction.tint * 0.5;
  const satMultiplier = 1 + correction.saturation / 100;
  const contrastMultiplier = 1 + correction.contrast / 100;

  let r = r0 * expMultiplier + brightnessOffset;
  let g = g0 * expMultiplier + brightnessOffset;
  let b = b0 * expMultiplier + brightnessOffset;

  r += tempShift * 0.8;
  g += tempShift * 0.2 - tintShift * 0.5;
  b -= tempShift;

  // Tint positif berarti magenta: merah dan biru naik relatif terhadap hijau.
  // Tint negatif berarti hijau. Sebelumnya hanya kanal hijau yang digeser,
  // sehingga warna hasil dapat kehilangan keseimbangan meski arah slider benar.
  r += tintShift * 0.25;
  b += tintShift * 0.25;

  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  r = gray + (r - gray) * satMultiplier;
  g = gray + (g - gray) * satMultiplier;
  b = gray + (b - gray) * satMultiplier;

  r = 128 + (r - 128) * contrastMultiplier;
  g = 128 + (g - 128) * contrastMultiplier;
  b = 128 + (b - 128) * contrastMultiplier;

  return {
    r: clampChannel(r),
    g: clampChannel(g),
    b: clampChannel(b),
  };
}
