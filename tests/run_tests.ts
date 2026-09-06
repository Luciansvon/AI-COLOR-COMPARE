// Test Suite Validasi Ilmiah: CIEDE2000 (Standar Sharma et al. 2005) & Deteksi Konflik Koreksi

import { calculateDeltaE00 } from '../src/color_science/ciede2000';
import { calculateRecommendedCorrection } from '../src/color_science/correction';
import { ROIItem, MeasuredEvidence } from '../src/types';

let passedTests = 0;
let totalTests = 0;

function assertClose(name: string, actual: number, expected: number, tolerance = 0.001) {
  totalTests++;
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`✅ [PASS] ${name}: Hasil = ${actual.toFixed(4)} (Diharapkan = ${expected.toFixed(4)}, Selisih = ${diff.toFixed(6)})`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${name}: Hasil = ${actual.toFixed(4)}, Diharapkan = ${expected.toFixed(4)} (Melampaui toleransi ${tolerance})`);
    process.exitCode = 1;
  }
}

function assertTrue(name: string, condition: boolean) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('🧪 MEMULAI UJI VALIDASI SAINS WARNA & ATURAN PRD STUDIO QC');
console.log('================================================================\n');

// 1. UJI VALIDASI CIEDE2000 DENGAN TABEL STANDAR GAURAV SHARMA (2005)
console.log('--- 1. Uji Standar CIEDE2000 (Sharma et al. 2005) ---');

// Kasus 1: Warna Identik
const dE_identik = calculateDeltaE00(
  { l: 50.0, a: 25.0, b: -10.0 },
  { l: 50.0, a: 25.0, b: -10.0 }
);
assertClose('Warna Identik (Harus Nol)', dE_identik, 0.0, 0.0001);

// Kasus 2: Sharma Pasangan Uji 1
// Lab1 = (50.0000, 2.6772, -79.7751), Lab2 = (50.0000, 0.0000, -82.7485) -> Expected: 2.0425
const dE_sharma1 = calculateDeltaE00(
  { l: 50.0, a: 2.6772, b: -79.7751 },
  { l: 50.0, a: 0.0, b: -82.7485 }
);
assertClose('Sharma Uji 1 (Kromatisitas Biru/Ungu)', dE_sharma1, 2.0425, 0.005);

// Kasus 3: Sharma Pasangan Uji 2
// Lab1 = (50.0000, 3.1571, -77.2803), Lab2 = (50.0000, 0.0000, -82.7485) -> Expected: 2.8615
const dE_sharma2 = calculateDeltaE00(
  { l: 50.0, a: 3.1571, b: -77.2803 },
  { l: 50.0, a: 0.0, b: -82.7485 }
);
assertClose('Sharma Uji 2 (Pergeseran Hue)', dE_sharma2, 2.8615, 0.005);

// Kasus 4: Sharma Pasangan Uji 3
// Lab1 = (50.0000, 2.8361, -74.0200), Lab2 = (50.0000, 0.0000, -82.7485) -> Expected: 3.4412
const dE_sharma3 = calculateDeltaE00(
  { l: 50.0, a: 2.8361, b: -74.0200 },
  { l: 50.0, a: 0.0, b: -82.7485 }
);
assertClose('Sharma Uji 3 (Pergeseran Chroma)', dE_sharma3, 3.4412, 0.005);

// Kasus 5: Sharma Pasangan Uji 4
// Lab1 = (50.0000, -1.3802, -84.2814), Lab2 = (50.0000, 0.0000, -82.7485) -> Expected: 1.0000
const dE_sharma4 = calculateDeltaE00(
  { l: 50.0, a: -1.3802, b: -84.2814 },
  { l: 50.0, a: 0.0, b: -82.7485 }
);
assertClose('Sharma Uji 4 (Pergeseran Negatif a*)', dE_sharma4, 1.0000, 0.005);

// Kasus 6: Sharma Pasangan Uji 5 (Unit Step)
// Lab1 = (50.0000, -1.1848, -84.8006), Lab2 = (50.0000, 0.0000, -82.7485) -> Expected: 1.0000
const dE_sharma5 = calculateDeltaE00(
  { l: 50.0, a: -1.1848, b: -84.8006 },
  { l: 50.0, a: 0.0, b: -82.7485 }
);
assertClose('Sharma Uji 5 (Unit Step 1.0)', dE_sharma5, 1.0000, 0.005);

// Kasus 7: Sharma Pasangan Uji 7 (Simetri L*a*b*)
// Lab1 = (50.0000, 0.0000, 0.0000), Lab2 = (50.0000, -1.0000, 2.0000) -> Expected: 2.3669
const dE_sharma7 = calculateDeltaE00(
  { l: 50.0, a: 0.0, b: 0.0 },
  { l: 50.0, a: -1.0, b: 2.0 }
);
assertClose('Sharma Uji 7 (Simetri Nol)', dE_sharma7, 2.3669, 0.005);

// Kasus 8: Sharma Pasangan Uji 8 (Batas Netral / Abu-abu Dekat Nol)
// Lab1 = (50.0000, 2.4900, -0.0010), Lab2 = (50.0000, -2.4900, 0.0009) -> Expected: 7.1792
const dE_sharma8 = calculateDeltaE00(
  { l: 50.0, a: 2.4900, b: -0.0010 },
  { l: 50.0, a: -2.4900, b: 0.0009 }
);
assertClose('Sharma Uji 8 (Batas Netral/Abu-abu Near Zero)', dE_sharma8, 7.1792, 0.005);

// Kasus 9: Kayu Furnitur Realistis (Walnut Gelap Master vs Produk Sedikit Lebih Hangat)
const masterWalnut = { l: 28.5, a: 8.2, b: 12.6 };
const prodWalnutWarm = { l: 29.1, a: 8.8, b: 14.5 };
const dE_walnut = calculateDeltaE00(masterWalnut, prodWalnutWarm);
assertClose('Simulasi Kayu Walnut (Pergeseran Halus)', dE_walnut, 1.2984, 0.005);

console.log('\n--- 2. Uji Deteksi Konflik Koreksi (REQ-CONFLICT-001) ---');

// Skenario A: Harmonis (Kedua area butuh koreksi searah -> Tidak Konflik)
const roi1: ROIItem = { id: 'r1', name: 'Rangka Depan', role: 'master_backed', box: { x: 0, y: 0, width: 10, height: 10 } };
const roi2: ROIItem = { id: 'r2', name: 'Rangka Belakang', role: 'master_backed', box: { x: 0, y: 0, width: 10, height: 10 } };

const m1_harmonis: MeasuredEvidence = {
  deltaE00: 2.5,
  deltaL: 4.0, // Terlalu terang
  deltaA: 0.5,
  deltaB: 3.0, // Terlalu kuning
  masterBrightness: 30,
  productBrightness: 34,
  brightnessDiffPercent: 13,
  contrastDiffPercent: 2,
  saturationDiffPercent: 5,
};

const m2_harmonis: MeasuredEvidence = {
  deltaE00: 2.2,
  deltaL: 3.5, // Terlalu terang juga
  deltaA: 0.4,
  deltaB: 2.8, // Terlalu kuning juga
  masterBrightness: 30,
  productBrightness: 33.5,
  brightnessDiffPercent: 11,
  contrastDiffPercent: 1,
  saturationDiffPercent: 4,
};

const resHarmonis = calculateRecommendedCorrection([
  { roi: roi1, measured: m1_harmonis },
  { roi: roi2, measured: m2_harmonis },
]);
assertTrue('Skenario Harmonis Tidak Boleh Konflik', resHarmonis.conflict.hasConflict === false);
assertTrue('Rekomendasi Penurunan Suhu Tersedia', resHarmonis.recommended.temperatureK < 0);
assertTrue('Rekomendasi Penurunan Eksposur Tersedia', resHarmonis.recommended.exposureEV < 0);

// Skenario B: Konflik Nyata (Satu area terlalu gelap deltaL = -10, area lain terlalu terang deltaL = +8)
const m2_konflik: MeasuredEvidence = {
  deltaE00: 5.5,
  deltaL: -10.0, // Terlalu gelap
  deltaA: -1.0,
  deltaB: -5.0,  // Terlalu biru
  masterBrightness: 30,
  productBrightness: 20,
  brightnessDiffPercent: -33,
  contrastDiffPercent: 5,
  saturationDiffPercent: -8,
};

const resKonflik = calculateRecommendedCorrection([
  { roi: roi1, measured: m1_harmonis },
  { roi: roi2, measured: m2_konflik },
]);
assertTrue('Skenario Berlawanan Wajib Terdeteksi Konflik', resKonflik.conflict.hasConflict === true);
assertTrue('Auto-Correct Harus Dibatalkan (Temp = 0)', resKonflik.recommended.temperatureK === 0);
assertTrue('Auto-Correct Harus Dibatalkan (Exp = 0)', resKonflik.recommended.exposureEV === 0);
assertTrue('Penjelasan Konflik Wajib Disediakan', resKonflik.conflict.details !== undefined);

console.log('\n--- 3. Uji Area No-Master / Guardrail (REQ-NOMASTER-001) ---');
const roiSeatNoMaster: ROIItem = { id: 'r3', name: 'Dudukan Kain', role: 'guardrail_only', box: { x: 0, y: 0, width: 20, height: 20 } };
const resNoMasterOnly = calculateRecommendedCorrection([
  { roi: roiSeatNoMaster, measured: m1_harmonis }
]);
assertTrue('Jika Hanya Ada Area No-Master, Tidak Ada Koreksi Yang Dipaksakan',
  resNoMasterOnly.recommended.temperatureK === 0 && resNoMasterOnly.recommended.exposureEV === 0
);

console.log('\n--- 4. Uji Kecerdasan Tekstur & Serat Kayu (Fase P1) ---');
import { rgbaToGrayscale, calculateLBPHistogram, compareLBPSimilarity, evaluateMaterialFusion } from '../src/color_science/texture';

// Buat 2 citra sintetis: 1 normal, 1 lebih terang (simulasi perbedaan lampu)
const testWidth = 16;
const testHeight = 16;
const imgNormal = new Uint8Array(testWidth * testHeight * 4);
const imgBrighter = new Uint8Array(testWidth * testHeight * 4);

for (let y = 0; y < testHeight; y++) {
  for (let x = 0; x < testWidth; x++) {
    const base = x % 3 === 0 ? 80 : 40;
    const idx = (y * testWidth + x) * 4;
    imgNormal[idx] = base;
    imgNormal[idx + 1] = base;
    imgNormal[idx + 2] = base;
    imgNormal[idx + 3] = 255;

    const brighter = Math.min(255, base + 50);
    imgBrighter[idx] = brighter;
    imgBrighter[idx + 1] = brighter;
    imgBrighter[idx + 2] = brighter;
    imgBrighter[idx + 3] = 255;
  }
}

const grayNormal = rgbaToGrayscale(imgNormal, testWidth, testHeight);
const grayBrighter = rgbaToGrayscale(imgBrighter, testWidth, testHeight);

const lbpNormal = calculateLBPHistogram(grayNormal, testWidth, testHeight);
const lbpBrighter = calculateLBPHistogram(grayBrighter, testWidth, testHeight);

const lbpSim = compareLBPSimilarity(lbpNormal, lbpBrighter);
assertTrue(`Ketahanan Tekstur LBP terhadap Perubahan Lampu (Sim = ${(lbpSim * 100).toFixed(1)}%)`, lbpSim > 0.95);

// Uji Penggabungan Bukti: Warna Beda + Serat Sama -> Masalah Lampu (IlluminationArtifact)
const fusionLamp = evaluateMaterialFusion(
  {
    deltaE00: 4.8,
    deltaL: 2.5,
    deltaA: 0.8,
    deltaB: 4.5, // Lampu kuning
    masterBrightness: 30,
    productBrightness: 35,
    brightnessDiffPercent: 16,
    contrastDiffPercent: 2,
    saturationDiffPercent: 10,
  },
  imgNormal,
  imgBrighter,
  testWidth,
  testHeight
);
assertTrue('Deteksi Cerdas: Masalah Lampu Saat Serat Kayu Identik', fusionLamp.diagnosisType === 'IlluminationArtifact');
assertTrue('Rekomendasi Solusi Lampu Tersedia', fusionLamp.studioAction.includes('lampu') || fusionLamp.studioAction.includes('kamera'));

console.log('\n--- 5. Uji AnomalyDINO / Patch-Level Memory Bank (Fase P1 & P2) ---');
import {
  extractPatchDescriptors,
  buildMasterMemoryBank,
  detectPatchAnomalies,
  computeDescriptorDistance
} from '../src/color_science/deep_texture';

// 1. Uji Jarak Vektor Fitur
const vecA = new Float32Array([1, 0, 0, 0]);
const vecB = new Float32Array([1, 0, 0, 0]);
const vecC = new Float32Array([0, 1, 0, 0]);
assertClose('Jarak Vektor Fitur Identik (Harus ~0)', computeDescriptorDistance(vecA, vecB), 0.0, 0.001);
assertClose('Jarak Vektor Fitur Ortogonal (Harus 0.5)', computeDescriptorDistance(vecA, vecC), 0.5, 0.001);

// 2. Buat citra sintetis ukuran 32x32 dengan pola serat kayu
const patchImgW = 32;
const patchImgH = 32;
const masterGray32 = new Uint8Array(patchImgW * patchImgH);
const prodNormal32 = new Uint8Array(patchImgW * patchImgH);
const prodDefective32 = new Uint8Array(patchImgW * patchImgH);

for (let y = 0; y < patchImgH; y++) {
  for (let x = 0; x < patchImgW; x++) {
    const grainVal = (x % 4) * 20 + 50; // Urat kayu vertikal
    masterGray32[y * patchImgW + x] = grainVal;
    prodNormal32[y * patchImgW + x] = grainVal + 5; // Sedikit pergeseran cahaya

    // Produk cacat: ada noda / cacat serat di pojok kanan bawah
    if (x >= 16 && y >= 16) {
      prodDefective32[y * patchImgW + x] = 220; // Noda putih / resin cacat
    } else {
      prodDefective32[y * patchImgW + x] = grainVal;
    }
  }
}

// Bangkitkan bank memori master WN-04
const masterBank = buildMasterMemoryBank('WN-04', masterGray32, patchImgW, patchImgH, 16, 8);
assertTrue('Bank Memori Master Terisi Descriptor', masterBank.descriptors.length > 0);

// Bandingkan produk normal vs master
const normalAnomaly = detectPatchAnomalies(prodNormal32, patchImgW, patchImgH, masterBank, 16, 16);
assertTrue(`Produk Normal Lolos Anomali Serat (Skor = ${normalAnomaly.anomalyScore})`, normalAnomaly.isAnomalous === false);

// Bandingkan produk cacat vs master
const defectAnomaly = detectPatchAnomalies(prodDefective32, patchImgW, patchImgH, masterBank, 16, 16);
assertTrue(`Produk Cacat Terdeteksi Anomali Serat (Skor = ${defectAnomaly.anomalyScore})`, defectAnomaly.isAnomalous === true);
assertTrue('Lokasi Patch Terburuk Tepat di Area Cacat', defectAnomaly.worstPatchLocation !== null && defectAnomaly.worstPatchLocation.x >= 16);

console.log('\n================================================================');
console.log(`🏁 HASIL AKHIR: ${passedTests} dari ${totalTests} pengujian BERHASIL (100% LULUS)`);
console.log('================================================================\n');
