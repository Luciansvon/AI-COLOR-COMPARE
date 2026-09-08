// Mesin Rekomendasi Koreksi & Pendeteksi Konflik Antar-Area (ROI)

import { ROIItem, MeasuredEvidence, CorrectionParams, CorrectionConflict } from '../types';
import { applyCorrectionToRgb } from './imageCorrection';
import { rgbToLab } from './transforms';
import { calculateDeltaE00 } from './ciede2000';

export const ZERO_CORRECTION: CorrectionParams = {
  temperatureK: 0, tint: 0, exposureEV: 0, brightness: 0, contrast: 0, saturation: 0,
};

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export interface ROIAnalysisPair {
  roi: ROIItem;
  measured?: MeasuredEvidence;
}

type RgbEvidencePair = { master: { r: number; g: number; b: number }; product: { r: number; g: number; b: number } };

function reliableRgbEvidence(measured: MeasuredEvidence): RgbEvidencePair | null {
  const master = measured.masterRgb;
  const product = measured.productRgb;
  if (!master || !product || ![master.r, master.g, master.b, product.r, product.g, product.b].every(Number.isFinite)) return null;

  // Mean Lab dan Lab dari mean RGB tidak identik pada permukaan berpola, tetapi
  // arahnya harus tetap cukup dekat. Data sintetis/tidak lengkap memakai fallback lama.
  const masterLab = rgbToLab(master);
  const productLab = rgbToLab(product);
  const consistent = Math.abs((productLab.l - masterLab.l) - measured.deltaL) <= 6 &&
    Math.abs((productLab.a - masterLab.a) - measured.deltaA) <= 6 &&
    Math.abs((productLab.b - masterLab.b) - measured.deltaB) <= 6;
  return consistent ? { master, product } : null;
}

function correctionError(evidence: RgbEvidencePair[], params: CorrectionParams): number {
  return evidence.reduce((sum, pair) => {
    const corrected = applyCorrectionToRgb(pair.product.r, pair.product.g, pair.product.b, params);
    return sum + calculateDeltaE00(rgbToLab(pair.master), rgbToLab(corrected));
  }, 0) / evidence.length;
}

/**
 * Memeriksa kembali hasil saran melalui transformasi piksel yang benar-benar
 * dipakai preview/ekspor. Saran hanya digeser jika skor warna rata-rata membaik.
 */
export function refineCorrectionAgainstMeasuredRgb(
  pairs: ROIAnalysisPair[],
  initial: CorrectionParams,
  exposureBounds: { min: number; max: number } = { min: -1.5, max: 1.5 }
): CorrectionParams {
  const evidence = pairs.map((pair) => pair.measured && reliableRgbEvidence(pair.measured)).filter(Boolean) as RgbEvidencePair[];
  if (evidence.length === 0) return initial;

  const bounds = {
    temperatureK: { min: -800, max: 800 },
    tint: { min: -100, max: 100 },
    exposureEV: exposureBounds,
    saturation: { min: -50, max: 50 },
  };
  const steps = {
    temperatureK: [400, 200, 100, 50, 25, 10],
    tint: [50, 25, 10, 5, 2, 1],
    exposureEV: [0.5, 0.25, 0.1, 0.05, 0.02, 0.01],
    saturation: [25, 10, 5, 2, 1, 1],
  } as const;
  const fields = Object.keys(steps) as (keyof typeof steps)[];
  const zero = { ...ZERO_CORRECTION };
  let best = { ...initial, brightness: 0, contrast: 0 };
  let bestError = correctionError(evidence, best);
  const zeroError = correctionError(evidence, zero);
  if (zeroError < bestError) {
    best = zero;
    bestError = zeroError;
  }

  for (let round = 0; round < 6; round++) {
    for (const field of fields) {
      for (const direction of [-1, 1]) {
        const bound = bounds[field];
        const raw = best[field] + direction * steps[field][round];
        const value = Math.max(bound.min, Math.min(bound.max, raw));
        const candidate = { ...best, [field]: value };
        const error = correctionError(evidence, candidate);
        if (error + 1e-6 < bestError) {
          best = candidate;
          bestError = error;
        }
      }
    }
  }

  return {
    temperatureK: Math.round(best.temperatureK),
    tint: Math.round(best.tint),
    exposureEV: Number(best.exposureEV.toFixed(2)),
    brightness: 0,
    contrast: 0,
    saturation: Math.round(best.saturation),
  };
}

/**
 * Menghitung estimasi parameter koreksi global untuk mendekatkan foto produk ke master panel
 */
export function calculateRecommendedCorrection(pairs: ROIAnalysisPair[]): {
  recommended: CorrectionParams;
  conflict: CorrectionConflict;
} {
  const masterBackedPairs = pairs.filter((p) => p.roi.role === 'master_backed' && p.measured);

  // Jika tidak ada area yang memiliki master, tidak ada target koreksi yang bisa disarankan
  if (masterBackedPairs.length === 0) {
    return {
      recommended: {
        temperatureK: 0,
        tint: 0,
        exposureEV: 0,
        brightness: 0,
        contrast: 0,
        saturation: 0,
      },
      conflict: { hasConflict: false },
    };
  }

  const clippedPair = pairs.find((p) => p.measured?.clippingWarning?.highlightClipped || p.measured?.clippingWarning?.shadowClipped);
  if (clippedPair) {
    return {
      recommended: { ...ZERO_CORRECTION },
      conflict: { hasConflict: true, details: {
        improvedROI: clippedPair.roi.name,
        worsenedROI: clippedPair.roi.name,
        reason: `Foto master atau produk pada ${clippedPair.roi.name} memiliki area silau/terlalu gelap. Perbaiki pengambilan foto sebelum menerapkan saran otomatis.`,
      } },
    };
  }

  // 1. Estimasi untuk pratinjau aplikasi, bukan kalibrasi Kelvin/langkah kamera.
  // Jika produk lebih kuning (deltaB > 0), turunkan temperatur (negatif). 1 unit deltaB ≈ ~60K
  // Jika produk lebih terang (deltaL > 0), turunkan exposure (negatif). 1 unit deltaL ≈ ~0.03 EV
  const individualCorrections = masterBackedPairs.map((p) => {
    const m = p.measured!;
    const tempTarget = -Math.round(m.deltaB * 65);
    const tintTarget = -Math.round(m.deltaA * 2.5);
    const expTarget = Number((-m.deltaL * 0.035).toFixed(2));
    const satTarget = -Math.round(m.saturationDiffPercent * 0.5);

    return {
      roiId: p.roi.id,
      roiName: p.roi.name,
      deltaL: m.deltaL,
      deltaB: m.deltaB,
      tempTarget,
      tintTarget,
      expTarget,
      satTarget,
    };
  });

  // 2. Cek konflik antar-ROI (REQ-CONFLICT-001)
  // Konflik terjadi jika satu ROI butuh koreksi berlawanan arah secara signifikan terhadap ROI lain
  let hasConflict = false;
  let conflictDetails: { improvedROI: string; worsenedROI: string; reason: string } | undefined;

  for (let i = 0; i < individualCorrections.length; i++) {
    for (let j = i + 1; j < individualCorrections.length; j++) {
      const a = individualCorrections[i];
      const b = individualCorrections[j];

      // Konflik Eksposur: Satu butuh sangat terang (+EV), satu butuh sangat gelap (-EV)
      if (a.expTarget * b.expTarget < 0 && Math.abs(a.expTarget - b.expTarget) > 0.4) {
        hasConflict = true;
        const improved = a.expTarget > 0 ? a.roiName : b.roiName;
        const worsened = a.expTarget > 0 ? b.roiName : a.roiName;
        conflictDetails = {
          improvedROI: improved,
          worsenedROI: worsened,
          reason: `Menerangkan ${improved} akan membuat ${worsened} semakin terang. Periksa pencahayaan tiap area.`,
        };
        break;
      }

      // Konflik Suhu Warna: Satu terlalu kuning, satu terlalu biru
      if (a.tempTarget * b.tempTarget < 0 && Math.abs(a.tempTarget - b.tempTarget) > 250) {
        hasConflict = true;
        conflictDetails = {
          improvedROI: a.roiName,
          worsenedROI: b.roiName,
          reason: `Koreksi temperatur warna berlawanan arah antara ${a.roiName} dan ${b.roiName}. Perbedaan ini menandakan variasi material atau pantulan cahaya setempat.`,
        };
        break;
      }

      if (a.tintTarget * b.tintTarget < 0 && Math.abs(a.tintTarget - b.tintTarget) > 7.5) {
        hasConflict = true;
        conflictDetails = {
          improvedROI: a.roiName,
          worsenedROI: b.roiName,
          reason: `Arah hijau–magenta berlawanan antara ${a.roiName} dan ${b.roiName}. Satu setelan White Balance tidak dapat memperbaiki keduanya sekaligus. Periksa lampu, pantulan, dan bahan tiap area.`,
        };
        break;
      }
    }
    if (hasConflict) break;
  }

  // 3. Rata-rata tiap area dengan bobot yang sama.
  const avgTemp = Math.round(
    individualCorrections.reduce((acc, c) => acc + c.tempTarget, 0) / individualCorrections.length
  );
  const avgTint = Math.round(
    individualCorrections.reduce((acc, c) => acc + c.tintTarget, 0) / individualCorrections.length
  );
  const avgExp = Number(
    (
      individualCorrections.reduce((acc, c) => acc + c.expTarget, 0) / individualCorrections.length
    ).toFixed(2)
  );
  const avgSat = Math.round(
    individualCorrections.reduce((acc, c) => acc + c.satTarget, 0) / individualCorrections.length
  );

  // 4. Periksa Guardrail untuk No-Master ROI (REQ-NOMASTER-002, REQ-NOMASTER-003)
  let safeAvgExp = avgExp;
  let minimumSafeExp = -1.5;
  let maximumSafeExp = 1.5;
  const noMasterPairs = pairs.filter((p) => p.roi.role === 'guardrail_only' && p.measured);
  for (const nm of noMasterPairs) {
    const m = nm.measured!;
    // Jika koreksi global akan membuat area no-master menjadi over-saturated atau clipped
    if (m.productBrightness + safeAvgExp * 25 > 95) {
      // Batasi kenaikan eksposur agar guardrail tidak silau putih / blown out (>95)
      const maxAllowedExp = Math.max(-2, Number(((95 - m.productBrightness) / 25).toFixed(2)));
      if (safeAvgExp > maxAllowedExp) {
        safeAvgExp = maxAllowedExp;
      }
      maximumSafeExp = Math.min(maximumSafeExp, maxAllowedExp);
    } else if (m.productBrightness + safeAvgExp * 25 < 5) {
      // Batasi penurunan eksposur agar guardrail tidak terlalu gelap / crushed (<5)
      const minAllowedExp = Math.min(2, Number(((5 - m.productBrightness) / 25).toFixed(2)));
      if (safeAvgExp < minAllowedExp) {
        safeAvgExp = minAllowedExp;
      }
      minimumSafeExp = Math.max(minimumSafeExp, minAllowedExp);
    }
  }

  const initialRecommendation: CorrectionParams = {
    temperatureK: hasConflict ? 0 : clamp(avgTemp, 800),
    tint: hasConflict ? 0 : clamp(avgTint, 100),
    exposureEV: hasConflict ? 0 : clamp(safeAvgExp, 1.5),
    brightness: 0,
    contrast: 0,
    saturation: hasConflict ? 0 : clamp(avgSat, 50),
  };
  const recommended = hasConflict ? initialRecommendation : refineCorrectionAgainstMeasuredRgb(
    masterBackedPairs,
    initialRecommendation,
    { min: minimumSafeExp, max: maximumSafeExp }
  );

  return {
    recommended,
    conflict: {
      hasConflict,
      details: conflictDetails,
    },
  };
}
