import assert from 'node:assert/strict';
import { analyzeRgbBalance } from '../src/color_science/rgb_analysis';
import { MeasuredEvidence } from '../src/types';

function measured(overrides: Partial<MeasuredEvidence>): MeasuredEvidence {
  return {
    deltaE00: 3,
    deltaL: 0,
    deltaA: 0,
    deltaB: 0,
    masterBrightness: 50,
    productBrightness: 50,
    brightnessDiffPercent: 0,
    contrastDiffPercent: 0,
    saturationDiffPercent: 0,
    masterRgb: { r: 120, g: 80, b: 40 },
    productRgb: { r: 120, g: 80, b: 40 },
    clippingWarning: { shadowClipped: false, highlightClipped: false },
    ...overrides,
  };
}

// Exposure global berubah, tetapi proporsi RGB sama. Harus tetap dianggap seimbang.
{
  const result = analyzeRgbBalance(
    measured({
      deltaL: 12,
      masterRgb: { r: 120, g: 80, b: 40 },
      productRgb: { r: 180, g: 120, b: 60 },
    })
  );
  assert.equal(result.bias, 'balanced');
  assert.equal(result.label, 'Warna Seimbang');
}

// Produk lebih merah/magenta dibanding master.
{
  const result = analyzeRgbBalance(
    measured({
      deltaA: 4.2,
      deltaB: 0.8,
      productRgb: { r: 145, g: 75, b: 35 },
    })
  );
  assert.equal(result.bias, 'red');
  assert.match(result.label, /Kemerahan/);
  assert.match(result.cameraAction, /G \(Green\)/);
}

// Produk lebih hijau dibanding master.
{
  const result = analyzeRgbBalance(
    measured({
      deltaA: -4.5,
      deltaB: 0.3,
      productRgb: { r: 110, g: 100, b: 40 },
    })
  );
  assert.equal(result.bias, 'green');
  assert.match(result.label, /Kehijauan/);
  assert.match(result.cameraAction, /M \(Magenta\)/);
}

// Produk lebih biru/dingin dibanding master.
{
  const result = analyzeRgbBalance(
    measured({
      deltaA: 0.4,
      deltaB: -5.2,
      productRgb: { r: 112, g: 75, b: 58 },
    })
  );
  assert.equal(result.bias, 'blue');
  assert.match(result.label, /Kebiruan/);
  assert.match(result.cameraAction, /A \(Amber/);
}

// Clipping harus mengalahkan saran WB agar operator tidak mengoreksi data yang rusak.
{
  const result = analyzeRgbBalance(
    measured({
      deltaA: 4,
      productRgb: { r: 145, g: 75, b: 35 },
      clippingWarning: { shadowClipped: false, highlightClipped: true },
    })
  );
  assert.match(result.cameraAction, /eksposur|silau/i);
}

console.log('RGB analysis tests: PASS');
