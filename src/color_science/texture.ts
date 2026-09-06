// Modul Ekstraksi Tekstur & Serat Kayu di Sisi Klien (TypeScript)
// Memastikan konsistensi 100% dengan mesin native Rust (P1 Texture Engine)

import { MeasuredEvidence, TextureEvidence, UnifiedMaterialReport } from '../types';

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
 * Penggabungan Bukti (Evidence Fusion): Warna + Serat Kayu
 */
export function evaluateMaterialFusion(
  colorMeasured: MeasuredEvidence,
  masterRgba: Uint8ClampedArray | Uint8Array,
  productRgba: Uint8ClampedArray | Uint8Array,
  masterWidth: number,
  masterHeight: number,
  productWidth: number = masterWidth,
  productHeight: number = masterHeight
): UnifiedMaterialReport {
  const masterGray = rgbaToGrayscale(masterRgba, masterWidth, masterHeight);
  const prodGray = rgbaToGrayscale(productRgba, productWidth, productHeight);

  const masterLbp = calculateLBPHistogram(masterGray, masterWidth, masterHeight);
  const prodLbp = calculateLBPHistogram(prodGray, productWidth, productHeight);

  const textureSim = compareLBPSimilarity(masterLbp, prodLbp);

  const masterGrain = calculateGrainDirection(masterGray, masterWidth, masterHeight);
  const prodGrain = calculateGrainDirection(prodGray, productWidth, productHeight);

  const grainDiff = calculateGrainAngleDiff(masterGrain.dominantAngle, prodGrain.dominantAngle);
  const isGrainMatching = textureSim >= 0.82 && (!masterGrain.isDirectional || grainDiff <= 35);
  const isColorMatching = colorMeasured.deltaE00 <= 2.5;

  if (isColorMatching && isGrainMatching) {
    return {
      diagnosisType: 'Conforming',
      title: 'Sangat Cocok (Lolos Sempurna)',
      primaryCause: 'Kesesuaian Material Terpenuhi',
      humanExplanation: 'Warna, gelap-terang, dan karakter serat kayu sangat sesuai dengan master panel fisik.',
      studioAction: 'Aman untuk dipotret dan lolos QC studio. Tidak memerlukan penyesuaian apapun.',
      confidenceLevel: 'Tinggi',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: true,
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
      title: 'Penyimpangan Cahaya Kamera (Bahan Sesuai)',
      primaryCause: cause,
      humanExplanation: `Struktur pori-pori dan serat kayu terbukti identik dengan master fisik (kemiripan ${(textureSim * 100).toFixed(0)}%), namun warna bergeser akibat kondisi pemotretan.`,
      studioAction: 'Cukup atur ulang lampu studio atau geser parameter warna kamera. Bahan finishing kayu tidak perlu diubah.',
      confidenceLevel: 'Tinggi',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: true,
    };
  } else if (!isColorMatching && !isGrainMatching) {
    return {
      diagnosisType: 'MaterialMismatch',
      title: 'Ketidaksesuaian Bahan / Finishing',
      primaryCause: 'Bahan Kayu / Formula Finishing Berbeda',
      humanExplanation: 'Perbedaan visual bukan berasal dari lampu kamera. Pola permukaan, tekstur, dan warna fisik berbeda dari sampel master.',
      studioAction: 'Laporkan ke bagian produksi atau finishing kayu untuk pengecekan lot bahan.',
      confidenceLevel: 'Tinggi',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: false,
    };
  } else {
    return {
      diagnosisType: 'SpeciesOrGrainMismatch',
      title: 'Perbedaan Jenis / Arah Urat Kayu',
      primaryCause: 'Karakter Serat Kayu Berbeda',
      humanExplanation: 'Warna dasar tampak mendekati master, tetapi struktur pori dan urat kayu menunjukkan karakter kayu yang berbeda.',
      studioAction: 'Periksa apakah grade atau arah potongan kayu sudah sesuai dengan standar katalog furnitur.',
      confidenceLevel: 'Sedang',
      textureSimilarityScore: Number(textureSim.toFixed(2)),
      grainAngleDiffDeg: Math.round(grainDiff),
      isGrainMatching: false,
    };
  }
}
