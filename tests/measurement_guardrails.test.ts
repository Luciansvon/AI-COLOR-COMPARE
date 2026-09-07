import assert from 'node:assert/strict';
import { compareStats, extractROIStats, PixelDataStats } from '../src/color_science/metrics';

// Satu kanal yang mentok harus dianggap clipping untuk pekerjaan warna.
{
  const pixels: number[] = [];
  for (let i = 0; i < 20; i++) {
    pixels.push(255, 140, 80, 255);
  }

  const stats = extractROIStats(pixels);
  assert.equal(stats.highlightClippingRatio, 1);
}

function stats(overrides: Partial<PixelDataStats>): PixelDataStats {
  return {
    meanLab: { l: 50, a: 5, b: 10 },
    meanRgb: { r: 120, g: 90, b: 60 },
    brightness: 50,
    contrast: 5,
    saturation: 12,
    shadowClippingRatio: 0,
    highlightClippingRatio: 0,
    ...overrides,
  };
}

// Pergeseran kromatik besar dari satu capture tidak boleh langsung divonis
// sebagai masalah material/finishing. Capture harus divalidasi lebih dulu.
{
  const master = stats({});
  const product = stats({
    meanLab: { l: 50, a: 35, b: 10 },
    meanRgb: { r: 180, g: 70, b: 50 },
    saturation: 36,
  });

  const result = compareStats(master, product);
  assert.ok(result.measured.deltaE00 > 4.5);
  assert.equal(result.estimated.primaryCause, 'Belum Pasti');
  assert.match(result.estimated.explanation, /belum cukup|foto ulang|capture terkontrol/i);
}

// Ambang kecil aplikasi adalah guardrail internal, bukan klaim toleransi universal.
{
  const result = compareStats(stats({}), stats({}));
  assert.equal(result.estimated.status, 'sesuai');
  assert.match(result.estimated.explanation, /bukan toleransi universal/i);
}

console.log('Measurement guardrail tests: PASS');
