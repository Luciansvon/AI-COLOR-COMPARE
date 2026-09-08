import assert from 'node:assert/strict';
import { calculateDeltaE00 } from '../src/color_science/ciede2000';
import { calculateRecommendedCorrection } from '../src/color_science/correction';
import { applyCorrectionToRgb } from '../src/color_science/imageCorrection';
import { compareStats, extractROIStats } from '../src/color_science/metrics';
import { calculateTextureStrength, evaluateMaterialFusion, rgbaToGrayscale } from '../src/color_science/texture';
import { rgbToLab } from '../src/color_science/transforms';
import type { ROIItem } from '../src/types';

const width = 32;
const height = 32;
const makeSurface = (rgb: [number, number, number], noise: (x: number, y: number) => number) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const offset = noise(x, y);
      pixels.set([
        Math.max(0, Math.min(255, rgb[0] + offset)),
        Math.max(0, Math.min(255, rgb[1] + offset)),
        Math.max(0, Math.min(255, rgb[2] + offset)),
        255,
      ], index);
    }
  }
  return pixels;
};

const masterSmooth = makeSurface([118, 82, 48], (x, y) => ((x * 7 + y * 11) % 5) - 2);
const productSmooth = makeSurface([143, 98, 58], (x, y) => ((x * 13 + y * 3) % 7) - 3);
const masterStrength = calculateTextureStrength(rgbaToGrayscale(masterSmooth, width, height), width, height);
const productStrength = calculateTextureStrength(rgbaToGrayscale(productSmooth, width, height), width, height);
assert.equal(masterStrength.isSmooth, true);
assert.equal(productStrength.isSmooth, true);

const smoothComparison = compareStats(extractROIStats(masterSmooth), extractROIStats(productSmooth));
const smoothFusion = evaluateMaterialFusion(smoothComparison.measured, masterSmooth, productSmooth, width, height);
assert.equal(smoothFusion.surfaceMode, 'smooth');
assert.equal(smoothFusion.isGrainMatching, true, 'Dua permukaan halus tidak boleh divonis beda serat karena noise.');
assert.equal(smoothFusion.grainAngleDiffDeg, 0);
assert.equal(smoothFusion.patchAnomaly, undefined, 'Analisis petak serat tidak dipaksakan pada permukaan halus.');
assert.match(smoothFusion.title, /Permukaan Sama-sama Halus/);

const striped = makeSurface([118, 82, 48], (x) => x % 4 < 2 ? -35 : 35);
const mixedFusion = evaluateMaterialFusion(
  compareStats(extractROIStats(masterSmooth), extractROIStats(striped)).measured,
  masterSmooth, striped, width, height
);
assert.equal(mixedFusion.surfaceMode, 'mixed');
assert.equal(mixedFusion.isGrainMatching, false, 'Halus vs berpola tetap perlu diperiksa.');

const roi: ROIItem = { id: 'smooth', name: 'Permukaan Halus', role: 'master_backed', box: { x: 0, y: 0, width: 100, height: 100 } };
const colorResult = calculateRecommendedCorrection([{ roi, measured: smoothComparison.measured }]);
const masterRgb = smoothComparison.measured.masterRgb!;
const productRgb = smoothComparison.measured.productRgb!;
const corrected = applyCorrectionToRgb(productRgb.r, productRgb.g, productRgb.b, colorResult.recommended);
const before = calculateDeltaE00(rgbToLab(masterRgb), rgbToLab(productRgb));
const after = calculateDeltaE00(rgbToLab(masterRgb), rgbToLab(corrected));
assert.ok(after < before * 0.45, `Saran harus mendekatkan warna nyata secara berarti (${before.toFixed(2)} -> ${after.toFixed(2)}).`);
assert.ok(after < before, 'Saran tervalidasi tidak boleh memperburuk warna rata-rata.');

const magenta = applyCorrectionToRgb(100, 100, 100, { temperatureK: 0, tint: 40, exposureEV: 0, brightness: 0, contrast: 0, saturation: 0 });
assert.ok(magenta.r > magenta.g && magenta.b > magenta.g, 'Tint magenta menggeser merah dan biru relatif terhadap hijau.');

console.log(`PASS: permukaan halus tahan noise; halus vs berpola dibedakan; koreksi warna membaik ${before.toFixed(2)} -> ${after.toFixed(2)} ΔE00.`);
