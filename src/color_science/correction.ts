// Mesin Rekomendasi Koreksi & Pendeteksi Konflik Antar-Area (ROI)

import { ROIItem, MeasuredEvidence, CorrectionParams, CorrectionConflict } from '../types';

export const ZERO_CORRECTION: CorrectionParams = {
  temperatureK: 0, tint: 0, exposureEV: 0, brightness: 0, contrast: 0, saturation: 0,
};

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export interface ROIAnalysisPair {
  roi: ROIItem;
  measured?: MeasuredEvidence;
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
    } else if (m.productBrightness + safeAvgExp * 25 < 5) {
      // Batasi penurunan eksposur agar guardrail tidak terlalu gelap / crushed (<5)
      const minAllowedExp = Math.min(2, Number(((5 - m.productBrightness) / 25).toFixed(2)));
      if (safeAvgExp < minAllowedExp) {
        safeAvgExp = minAllowedExp;
      }
    }
  }

  return {
    recommended: {
      temperatureK: hasConflict ? 0 : clamp(avgTemp, 800),
      tint: hasConflict ? 0 : clamp(avgTint, 100),
      exposureEV: hasConflict ? 0 : clamp(safeAvgExp, 1.5),
      brightness: 0,
      contrast: 0,
      saturation: hasConflict ? 0 : clamp(avgSat, 50),
    },
    conflict: {
      hasConflict,
      details: conflictDetails,
    },
  };
}
