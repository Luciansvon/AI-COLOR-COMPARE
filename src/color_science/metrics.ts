// Perhitungan Metrik Pendukung: Kecerahan, Kontras, Saturasi, & Tafsiran QC

import { Lab, RGB, rgbToLab } from './transforms';
import { calculateDeltaE00 } from './ciede2000';
import { MeasuredEvidence, EstimatedRecommendation } from '../types';

export interface PixelDataStats {
  meanLab: Lab;
  meanRgb: RGB;
  brightness: number;  // 0 - 100
  contrast: number;    // Standar deviasi luminansi L*
  saturation: number;  // C* = sqrt(a^2 + b^2)
  shadowClippingRatio: number;
  highlightClippingRatio: number;
}

/**
 * Ekstraksi statistik warna dari buffer pixel RGBA suatu area (ROI)
 */
export function extractROIStats(rgbaPixels: Uint8ClampedArray | number[]): PixelDataStats {
  const pixelCount = Math.floor(rgbaPixels.length / 4);
  if (pixelCount === 0) {
    return {
      meanLab: { l: 0, a: 0, b: 0 },
      meanRgb: { r: 0, g: 0, b: 0 },
      brightness: 0,
      contrast: 0,
      saturation: 0,
      shadowClippingRatio: 0,
      highlightClippingRatio: 0,
    };
  }

  let sumR = 0, sumG = 0, sumB = 0;
  let sumL = 0, sumA = 0, sumB_Lab = 0;
  let sumSat = 0;
  let shadowClipped = 0;
  let highlightClipped = 0;

  const lValues: number[] = new Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = rgbaPixels[idx];
    const g = rgbaPixels[idx + 1];
    const b = rgbaPixels[idx + 2];

    sumR += r;
    sumG += g;
    sumB += b;

    if (r < 5 && g < 5 && b < 5) shadowClipped++;
    if (r > 250 && g > 250 && b > 250) highlightClipped++;

    const lab = rgbToLab({ r, g, b });
    lValues[i] = lab.l;
    sumL += lab.l;
    sumA += lab.a;
    sumB_Lab += lab.b;

    const sat = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    sumSat += sat;
  }

  const meanL = sumL / pixelCount;
  const meanA = sumA / pixelCount;
  const meanB = sumB_Lab / pixelCount;

  // Hitung standar deviasi L* (kontras)
  let sumVariance = 0;
  for (let i = 0; i < pixelCount; i++) {
    sumVariance += Math.pow(lValues[i] - meanL, 2);
  }
  const contrast = Math.sqrt(sumVariance / pixelCount);

  return {
    meanLab: { l: meanL, a: meanA, b: meanB },
    meanRgb: {
      r: Math.round(sumR / pixelCount),
      g: Math.round(sumG / pixelCount),
      b: Math.round(sumB / pixelCount),
    },
    brightness: meanL,
    contrast,
    saturation: sumSat / pixelCount,
    shadowClippingRatio: shadowClipped / pixelCount,
    highlightClippingRatio: highlightClipped / pixelCount,
  };
}

/**
 * Membandingkan statistik area produk terhadap master fisik
 */
export function compareStats(
  masterStats: PixelDataStats,
  productStats: PixelDataStats
): { measured: MeasuredEvidence; estimated: EstimatedRecommendation } {
  const deltaE00 = calculateDeltaE00(masterStats.meanLab, productStats.meanLab);
  const deltaL = productStats.meanLab.l - masterStats.meanLab.l;
  const deltaA = productStats.meanLab.a - masterStats.meanLab.a;
  const deltaB = productStats.meanLab.b - masterStats.meanLab.b;

  const brightnessDiffPercent =
    masterStats.brightness > 0
      ? ((productStats.brightness - masterStats.brightness) / masterStats.brightness) * 100
      : 0;

  const contrastDiffPercent =
    masterStats.contrast > 0
      ? ((productStats.contrast - masterStats.contrast) / masterStats.contrast) * 100
      : 0;

  const saturationDiffPercent =
    masterStats.saturation > 0
      ? ((productStats.saturation - masterStats.saturation) / masterStats.saturation) * 100
      : 0;

  const shadowClipped = productStats.shadowClippingRatio > 0.05;
  const highlightClipped = productStats.highlightClippingRatio > 0.05;

  const measured: MeasuredEvidence = {
    deltaE00: Number(deltaE00.toFixed(2)),
    deltaL: Number(deltaL.toFixed(2)),
    deltaA: Number(deltaA.toFixed(2)),
    deltaB: Number(deltaB.toFixed(2)),
    masterBrightness: Number(masterStats.brightness.toFixed(1)),
    productBrightness: Number(productStats.brightness.toFixed(1)),
    brightnessDiffPercent: Number(brightnessDiffPercent.toFixed(1)),
    contrastDiffPercent: Number(contrastDiffPercent.toFixed(1)),
    saturationDiffPercent: Number(saturationDiffPercent.toFixed(1)),
    masterRgb: {
      r: Math.round(masterStats.meanRgb.r),
      g: Math.round(masterStats.meanRgb.g),
      b: Math.round(masterStats.meanRgb.b),
    },
    productRgb: {
      r: Math.round(productStats.meanRgb.r),
      g: Math.round(productStats.meanRgb.g),
      b: Math.round(productStats.meanRgb.b),
    },
    clippingWarning: {
      shadowClipped,
      highlightClipped,
    },
  };

  // Logika inferensi penyebab utama (Evidence-based heuristic sesuai PRD Section 19 & 31)
  let status: 'sesuai' | 'perlu_dicek' | 'tidak_sesuai' = 'sesuai';
  let label: 'Kemungkinan Sesuai' | 'Perlu Dicek' | 'Kemungkinan Tidak Sesuai' = 'Kemungkinan Sesuai';
  let confidence: 'Tinggi' | 'Sedang' | 'Rendah' = 'Tinggi';
  let primaryCause: 'Material / Finishing' | 'Pencahayaan / White Balance' | 'Refleksi / Sudut' | 'Belum Pasti' = 'Pencahayaan / White Balance';
  let explanation = '';

  const isChromaticShiftSignificant = Math.abs(deltaA) > 2.0 || Math.abs(deltaB) > 2.5;
  const isLightnessShiftSignificant = Math.abs(deltaL) > 3.0;

  if (deltaE00 <= 2.2) {
    status = 'sesuai';
    label = 'Kemungkinan Sesuai';
    confidence = shadowClipped || highlightClipped ? 'Sedang' : 'Tinggi';
    primaryCause = 'Pencahayaan / White Balance';
    explanation = 'Perbedaan warna sangat kecil (mata manusia hampir tidak dapat melihat selisih). Nilai ΔE00 berada dalam batas toleransi aman.';
  } else if (deltaE00 <= 4.5) {
    status = 'perlu_dicek';
    label = 'Perlu Dicek';
    confidence = 'Sedang';

    if (isLightnessShiftSignificant && !isChromaticShiftSignificant) {
      primaryCause = 'Pencahayaan / White Balance';
      explanation = `Perbedaan utama didominasi oleh kecerahan foto (${deltaL > 0 ? 'foto produk lebih terang' : 'foto produk lebih gelap'}). Kemungkinan besar disebabkan oleh intensitas lampu atau setelan eksposur kamera.`;
    } else if (Math.abs(deltaB) > 2.5 && Math.abs(deltaA) < 2.0) {
      primaryCause = 'Pencahayaan / White Balance';
      explanation = `Perbedaan warna terlihat pada suhu kehangatan (${deltaB > 0 ? 'terlihat sedikit lebih hangat/kuning' : 'terlihat lebih dingin/biru'}). Kemungkinan besar disebabkan oleh White Balance lampu studio.`;
    } else {
      primaryCause = 'Belum Pasti';
      explanation = 'Terdapat pergeseran rona warna sekaligus kecerahan sedang. Perlu pengecekan visual lebih cermat oleh operator.';
    }
  } else {
    status = 'tidak_sesuai';
    label = 'Kemungkinan Tidak Sesuai';
    confidence = 'Sedang';

    if (isChromaticShiftSignificant) {
      primaryCause = 'Material / Finishing';
      explanation = `Perbedaan warna cukup nyata (ΔE00: ${deltaE00.toFixed(2)}). Karakter rona kayu tampak berbeda dari master panel fisik. Ada indikasi perbedaan lapisan finishing atau lot kayu.`;
    } else {
      primaryCause = 'Pencahayaan / White Balance';
      explanation = `Perbedaan sangat dipengaruhi oleh perbedaan pencahayaan yang ekstrem (ΔL*: ${deltaL.toFixed(2)}). Disarankan memeriksa setelan lampu studio sebelum memutuskan material cacat.`;
    }
  }

  if (shadowClipped || highlightClipped) {
    confidence = 'Rendah';
    explanation += ' (Peringatan: Terdapat area terlalu gelap/terpotong atau terlalu silau sehingga tingkat keyakinan diturunkan).';
  }

  const estimated: EstimatedRecommendation = {
    status,
    label,
    confidence,
    primaryCause,
    explanation,
  };

  return { measured, estimated };
}
