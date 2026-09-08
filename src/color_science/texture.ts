// Modul Ekstraksi Tekstur & Serat Kayu di Sisi Klien (TypeScript)
// Memastikan konsistensi 100% dengan mesin native Rust (P1 Texture Engine)

import { MeasuredEvidence, TextureEvidence, UnifiedMaterialReport } from '../types';
import { buildMasterMemoryBank, detectPatchAnomalies, MasterMemoryBank } from './deep_texture';
import { analyzeRgbBalance } from './rgb_analysis';

/**
 * Konversi RGBA ke Grayscale 8-bit (Rec. 601)
 */
export function rgbaToGrayscale(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

/**
 * Menghitung histogram Local Binary Pattern (LBP) 8-tetangga
 * Invarian terhadap perubahan kecerahan linier (lampu studio lebih terang/gelap)
 */
export function calculateLBPHistogram(gray: Uint8Array, width: number, height: number): number[] {
  const hist = new Array(256).fill(0);
  if (width < 3 || height < 3) return hist;

  let totalPixels = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = gray[y * width + x];
      let pattern = 0;

      const neighbors = [
        gray[(y - 1) * width + (x - 1)],
        gray[(y - 1) * width + x],
        gray[(y - 1) * width + (x + 1)],
        gray[y * width + (x + 1)],
        gray[(y + 1) * width + (x + 1)],
        gray[(y + 1) * width + x],
        gray[(y + 1) * width + (x - 1)],
        gray[y * width + (x - 1)],
      ];

      for (let i = 0; i < 8; i++) {
        if (neighbors[i] >= center) {
          pattern |= 1 << i;
        }
      }

      hist[pattern]++;
      totalPixels++;
    }
  }

  if (totalPixels > 0) {
    for (let i = 0; i < 256; i++) {
      hist[i] /= totalPixels;
    }
  }

  return hist;
}

/**
 * Menghitung kemiripan histogram LBP (Histogram Intersection)
 */
export function compareLBPSimilarity(hist1: number[], hist2: number[]): number {
  let intersection = 0;
  const len = Math.min(256, Math.min(hist1.length, hist2.length));
  for (let i = 0; i < len; i++) {
    intersection += Math.min(hist1[i], hist2[i]);
  }
  return Math.max(0, Math.min(1, intersection));
}

/**
 * Menghitung arah dominan dan keteraturan serat kayu menggunakan gradien Sobel
 */
export function calculateGrainDirection(
  gray: Uint8Array,
  width: number,
  height: number
): { dominantAngle: number; coherence: number; isDirectional: boolean } {
  if (width < 3 || height < 3) {
    return { dominantAngle: 0, coherence: 0, isDirectional: false };
  }

  const NUM_BINS = 18;
  const orientationHist = new Array(NUM_BINS).fill(0);
  let totalMag = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p00 = gray[(y - 1) * width + (x - 1)];
      const p02 = gray[(y - 1) * width + (x + 1)];
      const p10 = gray[y * width + (x - 1)];
      const p12 = gray[y * width + (x + 1)];
      const p20 = gray[(y + 1) * width + (x - 1)];
      const p22 = gray[(y + 1) * width + (x + 1)];

      const gx = (p02 + 2 * p12 + p22) - (p00 + 2 * p10 + p20);

      const p01 = gray[(y - 1) * width + x];
      const p21 = gray[(y + 1) * width + x];

      const gy = (p20 + 2 * p21 + p22) - (p00 + 2 * p01 + p02);

      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > 10) {
        let angleRad = Math.atan2(gy, gx) + Math.PI / 2;
        while (angleRad < 0) angleRad += Math.PI;
        while (angleRad >= Math.PI) angleRad -= Math.PI;

        const angleDeg = (angleRad * 180) / Math.PI;
        const bin = Math.min(NUM_BINS - 1, Math.floor(angleDeg / 10));

        orientationHist[bin] += mag;
        totalMag += mag;
      }
    }
  }

  if (totalMag <= 1e-6) {
    return { dominantAngle: 0, coherence: 0, isDirectional: false };
  }

  let maxVal = 0;
  let dominantBin = 0;
  for (let b = 0; b < NUM_BINS; b++) {
    if (orientationHist[b] > maxVal) {
      maxVal = orientationHist[b];
      dominantBin = b;
    }
  }

  const dominantAngle = dominantBin * 10 + 5;
  const prevBin = dominantBin === 0 ? NUM_BINS - 1 : dominantBin - 1;
  const nextBin = dominantBin === NUM_BINS - 1 ? 0 : dominantBin + 1;
  const dominantEnergy = orientationHist[dominantBin] + orientationHist[prevBin] * 0.5 + orientationHist[nextBin] * 0.5;

  const coherence = Math.max(0, Math.min(1, dominantEnergy / totalMag));
  const isDirectional = coherence >= 0.25;

  return { dominantAngle, coherence, isDirectional };
}

/**
 * Menghitung selisih sudut orientasi serat kayu (0 - 90 derajat)
 */
export function calculateGrainAngleDiff(angle1: number, angle2: number): number {
  const diff = Math.abs(angle1 - angle2);
  const normalized = diff % 180;
  return normalized > 90 ? 180 - normalized : normalized;
}

/**
 * Mengukur kekuatan pola permukaan. LBP tidak stabil pada citra yang hampir
 * rata karena noise kamera kecil dapat berubah menjadi pola biner yang berbeda.
 */
export function calculateTextureStrength(
  gray: Uint8Array,
  width: number,
  height: number
): { meanGradient: number; strongEdgeRatio: number; isSmooth: boolean } {
  if (width < 3 || height < 3) {
    return { meanGradient: 0, strongEdgeRatio: 0, isSmooth: true };
  }

  let gradientSum = 0;
  let strongEdges = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx = gray[y * width + x + 1] - gray[y * width + x - 1];
      const gy = gray[(y + 1) * width + x] - gray[(y - 1) * width + x];
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      gradientSum += magnitude;
      if (magnitude >= 18) strongEdges++;
      count++;
    }
  }

  const meanGradient = gradientSum / Math.max(1, count);
  const strongEdgeRatio = strongEdges / Math.max(1, count);
  return {
    meanGradient,
    strongEdgeRatio,
    isSmooth: meanGradient < 7 && strongEdgeRatio < 0.025,
  };
}

/**
 * Penggabungan Bukti (Evidence Fusion): Warna + Serat Kayu
 */
export function evaluateMaterialFusion(
  colorMeasured: MeasuredEvidence,
  masterRgba: Uint8ClampedArray | Uint8Array,
  productRgba: Uint8ClampedArray | Uint8Array,
  masterWidth: number,
  masterHeight: number,
  productWidth: number = masterWidth,
  productHeight: number = masterHeight,
  masterBank?: MasterMemoryBank
): UnifiedMaterialReport {
  const masterGray = rgbaToGrayscale(masterRgba, masterWidth, masterHeight);
  const prodGray = rgbaToGrayscale(productRgba, productWidth, productHeight);

  const masterLbp = calculateLBPHistogram(masterGray, masterWidth, masterHeight);
  const prodLbp = calculateLBPHistogram(prodGray, productWidth, productHeight);

  let textureSim = compareLBPSimilarity(masterLbp, prodLbp);
  const masterStrength = calculateTextureStrength(masterGray, masterWidth, masterHeight);
  const productStrength = calculateTextureStrength(prodGray, productWidth, productHeight);
  const bothSmooth = masterStrength.isSmooth && productStrength.isSmooth;
  const oneSmooth = masterStrength.isSmooth !== productStrength.isSmooth;
  const surfaceMode: 'smooth' | 'textured' | 'mixed' = bothSmooth ? 'smooth' : oneSmooth ? 'mixed' : 'textured';

  const masterGrain = calculateGrainDirection(masterGray, masterWidth, masterHeight);
  const prodGrain = calculateGrainDirection(prodGray, productWidth, productHeight);

  let grainDiff = calculateGrainAngleDiff(masterGrain.dominantAngle, prodGrain.dominantAngle);
  if (bothSmooth) {
    textureSim = 1;
    grainDiff = 0;
  }
  const isGrainMatching = bothSmooth || (!oneSmooth && textureSim >= 0.82 &&
    (!masterGrain.isDirectional || !prodGrain.isDirectional || grainDiff <= 35));
  const isColorMatching = colorMeasured.deltaE00 <= 2.2;
  const rgbBalance = analyzeRgbBalance(colorMeasured);

  // Analisis Patch Anomaly AnomalyDINO / PatchCore
  let patchResult;
  if (!bothSmooth && masterWidth >= 16 && masterHeight >= 16 && productWidth >= 16 && productHeight >= 16) {
    const bank = masterBank || buildMasterMemoryBank('MASTER_CURRENT', masterGray, masterWidth, masterHeight, 16, 8);
    patchResult = detectPatchAnomalies(prodGray, productWidth, productHeight, bank, 16, 16);
  }

  const textureEvidence = {
    textureSimilarityScore: Number(textureSim.toFixed(2)),
    grainAngleDiffDeg: Math.round(grainDiff),
    isGrainMatching,
    surfaceMode,
    patchAnomaly: patchResult,
  };
  if (colorMeasured.clippingWarning?.highlightClipped || colorMeasured.clippingWarning?.shadowClipped) {
    return {
      ...textureEvidence,
      diagnosisType: 'CaptureUncertain',
      title: 'Perbaiki Foto Sebelum Menilai',
      primaryCause: 'Informasi Warna Terpotong',
      humanExplanation: 'Area pada foto master atau produk terlalu silau/gelap. Kemiripan angka belum cukup untuk menilai warna dan bahan.',
      studioAction: 'Perbaiki eksposur, lampu, atau pantulan; foto ulang master dan produk sebelum mengubah White Balance.',
      confidenceLevel: 'Rendah',
    };
  }

  if (isColorMatching && isGrainMatching) {
    return {
      diagnosisType: 'Conforming',
      title: bothSmooth ? 'Warna dan Permukaan Halus Mendekati Master' : 'Warna dan Serat Mendekati Master',
      primaryCause: 'Kemiripan Foto Terukur',
      humanExplanation: bothSmooth
        ? 'Warna mendekati master dan kedua area terukur sebagai permukaan halus tanpa pola serat yang cukup untuk dibandingkan. Periksa juga permukaan fisik dan toleransi proyek.'
        : 'Warna dan tekstur foto mendekati master menurut ambang internal aplikasi. Periksa juga permukaan fisik dan toleransi proyek.',
      studioAction:
        rgbBalance.available && rgbBalance.bias !== 'balanced'
          ? `Untuk mencoba menyamakan arah warna: ${rgbBalance.cameraAction} Keputusan PASS/FAIL tetap milik operator.`
          : 'Pertahankan pengambilan foto yang konsisten. Keputusan PASS/FAIL tetap milik operator.',
      confidenceLevel: 'Tinggi',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: true,
      surfaceMode,
      patchAnomaly: patchResult,
    };
  } else if (!isColorMatching && isGrainMatching) {
    const cause =
      Math.abs(colorMeasured.deltaB) > 3.0
        ? 'Suhu Warna Lampu Studio (White Balance)'
        : Math.abs(colorMeasured.deltaL) > 4.0
        ? 'Intensitas Cahaya / Eksposur Kamera'
        : 'Pencahayaan Studio';

    return {
      diagnosisType: 'IlluminationArtifact',
      title: bothSmooth ? 'Warna Bergeser, Permukaan Sama-sama Halus' : 'Warna Bergeser, Tekstur Mendekati Master',
      primaryCause: cause,
      humanExplanation: bothSmooth
        ? 'Kedua area sama-sama halus tanpa pola serat yang cukup untuk dibandingkan, tetapi warnanya bergeser. Kehalusan ini belum membuktikan bahan sama atau memastikan penyebabnya adalah lampu.'
        : `Skor kemiripan tekstur foto ${(textureSim * 100).toFixed(0)}%, tetapi warna bergeser. Skor ini belum membuktikan bahan sama atau memastikan penyebabnya adalah lampu.`,
      studioAction: rgbBalance.available
        ? `Periksa lampu dan referensi netral terlebih dahulu. ${rgbBalance.cameraAction}`
        : 'Periksa lampu, eksposur, dan White Balance kamera; foto ulang terhadap master sebelum menyimpulkan bahan berbeda.',
      confidenceLevel: 'Sedang',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: true,
      surfaceMode,
      patchAnomaly: patchResult,
    };
  } else if (!isColorMatching && !isGrainMatching) {
    return {
      diagnosisType: 'MaterialMismatch',
      title: 'Warna dan Tekstur Perlu Diperiksa',
      primaryCause: 'Penyebab Belum Pasti',
      humanExplanation: 'Warna dan pola permukaan foto berbeda dari master. Sudut, pencahayaan, skala area, dan bahan perlu diperiksa sebelum menyimpulkan penyebabnya.',
      studioAction: 'Samakan kondisi foto dan area pembanding terlebih dahulu. Jika perbedaan tetap terlihat, periksa bahan bersama bagian finishing.',
      confidenceLevel: 'Sedang',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: false,
      surfaceMode,
      patchAnomaly: patchResult,
    };
  } else {
    return {
      diagnosisType: 'SpeciesOrGrainMismatch',
      title: 'Perbedaan Jenis / Arah Urat Kayu',
      primaryCause: 'Karakter Serat Kayu Berbeda',
      humanExplanation: 'Warna foto mendekati master, tetapi pola tekstur berbeda. Periksa arah serat, skala area, dan sudut pengambilan foto sebelum menentukan jenis bahan.',
      studioAction: 'Periksa apakah grade atau arah potongan kayu sudah sesuai dengan standar katalog furnitur. Jangan ubah White Balance hanya untuk menutupi perbedaan serat.',
      confidenceLevel: 'Sedang',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: false,
      surfaceMode,
      patchAnomaly: patchResult,
    };
  }
}
