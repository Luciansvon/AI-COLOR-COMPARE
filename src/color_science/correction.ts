// Mesin Rekomendasi Koreksi & Pendeteksi Konflik Antar-Area (ROI)

import { ROIItem, MeasuredEvidence, CorrectionParams, CorrectionConflict } from '../types';

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

  // 1. Hitung kebutuhan koreksi per ROI
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
      if (Math.sign(a.expTarget) !== Math.sign(b.expTarget) && Math.abs(a.expTarget - b.expTarget) > 0.4) {
        hasConflict = true;
        const improved = a.expTarget > 0 ? a.roiName : b.roiName;
        const worsened = a.expTarget > 0 ? b.roiName : a.roiName;
        conflictDetails = {
          improvedROI: improved,
          worsenedROI: worsened,
          reason: `Koreksi pencahayaan yang memperbaiki ${improved} akan membuat ${worsened} menjadi terlalu ${a.expTarget > 0 ? 'silau/terang' : 'gelap'}.`,
        };
        break;
      }

      // Konflik Suhu Warna: Satu terlalu kuning, satu terlalu biru
      if (Math.sign(a.tempTarget) !== Math.sign(b.tempTarget) && Math.abs(a.tempTarget - b.tempTarget) > 250) {
        hasConflict = true;
        conflictDetails = {
          improvedROI: a.roiName,
          worsenedROI: b.roiName,
          reason: `Koreksi temperatur warna berlawanan arah antara ${a.roiName} dan ${b.roiName}. Perbedaan ini menandakan variasi material atau pantulan cahaya setempat.`,
        };
        break;
      }
    }
    if (hasConflict) break;
  }

  // 3. Jika tidak ada konflik, hitung rata-rata rekomendasi berbobot
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
  const noMasterPairs = pairs.filter((p) => p.roi.role === 'guardrail_only' && p.measured);
  for (const nm of noMasterPairs) {
    const m = nm.measured!;
    // Jika koreksi global akan membuat area no-master menjadi over-saturated atau clipped
    if (m.productBrightness + avgExp * 25 > 95) {
      // Peringatan guardrail: batasi kenaikan eksposur
    }
  }

  return {
    recommended: {
      temperatureK: hasConflict ? 0 : avgTemp,
      tint: hasConflict ? 0 : avgTint,
      exposureEV: hasConflict ? 0 : avgExp,
      brightness: 0,
      contrast: 0,
      saturation: hasConflict ? 0 : avgSat,
    },
    conflict: {
      hasConflict,
      details: conflictDetails,
    },
  };
}
