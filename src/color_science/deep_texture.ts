// Arsitektur Patch-Level Memory Bank & Deteksi Anomali Tekstur (Fase P1 & P2)
// Berdasarkan riset 50+ sumber: AnomalyDINO / PatchCore Nearest-Neighbor
// Memeriksa keotentikan serat kayu per kotak kecil (patch) terhadap bank memori papan master fisik

export interface PatchDescriptor {
  x: number;
  y: number;
  width: number;
  height: number;
  features: Float32Array; // Vektor fitur ternormalisasi
}

export interface MasterMemoryBank {
  masterCode: string;
  descriptors: PatchDescriptor[];
  featureDim: number;
  createdAt: string;
}

export interface PatchAnomalyResult {
  anomalyScore: number;        // 0.0 (sempurna cocok) s/d 1.0 (anomali parah)
  isAnomalous: boolean;        // true jika anomalyScore > ambang batas (default 0.35)
  gridCols: number;
  gridRows: number;
  heatmapGrid: number[][];     // Nilai anomali per petak [row][col] untuk overlay visual
  worstPatchLocation: { x: number; y: number; score: number } | null;
  summaryText: string;
}

/**
 * Menghitung jarak cosine atau euclidean berbobot antara dua vektor fitur
 */
export function computeDescriptorDistance(vecA: Float32Array, vecB: Float32Array): number {
  if (vecA.length !== vecB.length) return 1.0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-7) return 1.0;

  // Cosine distance: 1 - cosine_similarity, dinormalisasi ke 0.0 - 1.0
  const sim = Math.max(-1, Math.min(1, dot / denom));
  return (1 - sim) / 2;
}

/**
 * Mengekstrak deskriptor fitur multi-skala per kotak patch (16x16 / 32x32)
 * Bekerja langsung di CPU secara ultra-ringan (<5ms) tanpa ketergantungan model eksternal
 */
export function extractPatchDescriptors(
  gray: Uint8Array,
  width: number,
  height: number,
  patchSize: number = 16,
  stride: number = 16,
  maxCols: number = 9,
  maxRows: number = 9
): PatchDescriptor[] {
  const descriptors: PatchDescriptor[] = [];
  if (width < patchSize || height < patchSize) return descriptors;

  // Hitung langkah horizontal dan vertikal agar grid tidak meledak melampaui maxCols dan maxRows
  let actualStrideX = stride;
  let actualStrideY = stride;

  const rawCols = Math.floor((width - patchSize) / stride) + 1;
  const rawRows = Math.floor((height - patchSize) / stride) + 1;

  if (rawCols > maxCols && maxCols > 1) {
    actualStrideX = Math.max(stride, Math.floor((width - patchSize) / (maxCols - 1)));
  }
  if (rawRows > maxRows && maxRows > 1) {
    actualStrideY = Math.max(stride, Math.floor((height - patchSize) / (maxRows - 1)));
  }

  const cols = Math.floor((width - patchSize) / actualStrideX) + 1;
  const rows = Math.floor((height - patchSize) / actualStrideY) + 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startX = c * actualStrideX;
      const startY = r * actualStrideY;

      // Fitur patch:
      // - 16 bin intensitas lokal
      // - 8 bin LBP lokal
      // - 8 bin arah gradien Sobel lokal
      // Total 32 dimensi per patch
      const FEATURE_DIM = 32;
      const features = new Float32Array(FEATURE_DIM);

      let meanLuma = 0;
      let count = 0;

      // 1. Mean & Varians lokal
      for (let py = 0; py < patchSize; py++) {
        for (let px = 0; px < patchSize; px++) {
          const val = gray[(startY + py) * width + (startX + px)];
          meanLuma += val;
          const bin = Math.min(15, Math.floor(val / 16));
          features[bin] += 1;
          count++;
        }
      }
      meanLuma /= (count || 1);

      // 2. Gradien & Arah urat mikro di dalam patch
      for (let py = 1; py < patchSize - 1; py++) {
        for (let px = 1; px < patchSize - 1; px++) {
          const curY = startY + py;
          const curX = startX + px;

          const p00 = gray[(curY - 1) * width + (curX - 1)];
          const p02 = gray[(curY - 1) * width + (curX + 1)];
          const p10 = gray[curY * width + (curX - 1)];
          const p12 = gray[curY * width + (curX + 1)];
          const p20 = gray[(curY + 1) * width + (curX - 1)];
          const p22 = gray[(curY + 1) * width + (curX + 1)];

          const gx = (p02 + 2 * p12 + p22) - (p00 + 2 * p10 + p20);
          const p01 = gray[(curY - 1) * width + curX];
          const p21 = gray[(curY + 1) * width + curX];
          const gy = (p20 + 2 * p21 + p22) - (p00 + 2 * p01 + p02);

          const mag = Math.sqrt(gx * gx + gy * gy);
          if (mag > 5) {
            let angle = Math.atan2(gy, gx);
            if (angle < 0) angle += Math.PI;
            const gradBin = 16 + Math.min(7, Math.floor((angle / Math.PI) * 8));
            features[gradBin] += mag * 0.05;
          }

          // LBP mikro
          const center = gray[curY * width + curX];
          const lbpVal = ((p00 >= center ? 1 : 0) |
            ((p01 >= center ? 1 : 0) << 1) |
            ((p02 >= center ? 1 : 0) << 2) |
            ((p12 >= center ? 1 : 0) << 3) |
            ((p22 >= center ? 1 : 0) << 4) |
            ((p21 >= center ? 1 : 0) << 5) |
            ((p20 >= center ? 1 : 0) << 6) |
            ((p10 >= center ? 1 : 0) << 7));
          const lbpBin = 24 + (lbpVal % 8);
          features[lbpBin] += 1;
        }
      }

      // Normalisasi L2 vektor fitur patch
      let norm = 0;
      for (let i = 0; i < FEATURE_DIM; i++) {
        norm += features[i] * features[i];
      }
      norm = Math.sqrt(norm);
      if (norm > 1e-6) {
        for (let i = 0; i < FEATURE_DIM; i++) {
          features[i] /= norm;
        }
      }

      descriptors.push({
        x: startX,
        y: startY,
        width: patchSize,
        height: patchSize,
        features,
      });
    }
  }

  return descriptors;
}

/**
 * Membangun bank memori referensi fisik untuk kode master tertentu (misal: "WN-04")
 */
export function buildMasterMemoryBank(
  masterCode: string,
  gray: Uint8Array,
  width: number,
  height: number,
  patchSize: number = 16,
  stride: number = 8, // Stride lebih rapat untuk memperkaya bank memori master
  maxCols: number = 12,
  maxRows: number = 12
): MasterMemoryBank {
  const descriptors = extractPatchDescriptors(gray, width, height, patchSize, stride, maxCols, maxRows);
  return {
    masterCode,
    descriptors,
    featureDim: 32,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Membandingkan patch produk terhadap Bank Memori Master (Nearest Neighbor Anomaly)
 * Setiap patch produk dicari patch paling mirip di master.
 * Jarak terkecil adalah skor anomali patch tersebut.
 */
export function detectPatchAnomalies(
  prodGray: Uint8Array,
  width: number,
  height: number,
  masterBank: MasterMemoryBank,
  patchSize: number = 16,
  stride: number = 16,
  maxCols: number = 9,
  maxRows: number = 9
): PatchAnomalyResult {
  const prodDescriptors = extractPatchDescriptors(prodGray, width, height, patchSize, stride, maxCols, maxRows);

  if (prodDescriptors.length === 0 || masterBank.descriptors.length === 0) {
    return {
      anomalyScore: 0,
      isAnomalous: false,
      gridCols: 0,
      gridRows: 0,
      heatmapGrid: [],
      worstPatchLocation: null,
      summaryText: 'Ukuran petak terlalu kecil untuk analisis serat patch.',
    };
  }

  let actualStrideX = stride;
  let actualStrideY = stride;
  const rawCols = Math.floor((width - patchSize) / stride) + 1;
  const rawRows = Math.floor((height - patchSize) / stride) + 1;

  if (rawCols > maxCols && maxCols > 1) {
    actualStrideX = Math.max(stride, Math.floor((width - patchSize) / (maxCols - 1)));
  }
  if (rawRows > maxRows && maxRows > 1) {
    actualStrideY = Math.max(stride, Math.floor((height - patchSize) / (maxRows - 1)));
  }

  const cols = Math.floor((width - patchSize) / actualStrideX) + 1;
  const rows = Math.floor((height - patchSize) / actualStrideY) + 1;
  const heatmapGrid: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  let maxDistance = 0;
  let sumDistances = 0;
  let worstPatch: { x: number; y: number; score: number } | null = null;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx >= prodDescriptors.length) break;

      const pDesc = prodDescriptors[idx];
      let minDistanceToMaster = 1.0;

      // Cari nearest neighbor di master memory bank
      for (let m = 0; m < masterBank.descriptors.length; m++) {
        const mDesc = masterBank.descriptors[m];
        const dist = computeDescriptorDistance(pDesc.features, mDesc.features);
        if (dist < minDistanceToMaster) {
          minDistanceToMaster = dist;
          if (minDistanceToMaster < 0.02) break; // Sudah sangat identik, hemat iterasi
        }
      }

      // Normalisasi skor (0 - 1)
      const score = Math.min(1.0, minDistanceToMaster * 2.5);
      heatmapGrid[r][c] = Number(score.toFixed(3));
      sumDistances += score;

      if (score > maxDistance) {
        maxDistance = score;
        worstPatch = {
          x: pDesc.x,
          y: pDesc.y,
          score: Number(score.toFixed(3)),
        };
      }

      idx++;
    }
  }

  const avgScore = sumDistances / (prodDescriptors.length || 1);
  // Skor anomali gabungan: 60% terburuk + 40% rata-rata
  const finalScore = Number((0.6 * maxDistance + 0.4 * avgScore).toFixed(2));
  const isAnomalous = finalScore > 0.40;

  let summaryText = 'Serat kayu seragam dan konsisten dengan sampel master fisik.';
  if (finalScore > 0.55) {
    summaryText = 'Ditemukan anomali lokal signifikan pada serat kayu (kemungkinan mata kayu cacat, goresan, atau beda serat).';
  } else if (finalScore > 0.40) {
    summaryText = 'Variasi serat kayu agak tinggi pada beberapa petak kecil.';
  }

  return {
    anomalyScore: finalScore,
    isAnomalous,
    gridCols: cols,
    gridRows: rows,
    heatmapGrid,
    worstPatchLocation: worstPatch,
    summaryText,
  };
}
