import assert from 'node:assert/strict';
import { applyCorrectionToRgb, hasActiveCorrection } from '../src/color_science/imageCorrection';
import type { CorrectionParams } from '../src/types';

const ZERO: CorrectionParams = {
  temperatureK: 0,
  tint: 0,
  exposureEV: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

assert.equal(hasActiveCorrection(ZERO), false, 'Koreksi nol harus dianggap tidak aktif.');

const brighter = applyCorrectionToRgb(80, 80, 80, { ...ZERO, brightness: 20 });
assert.ok(brighter.r > 80 && brighter.g > 80 && brighter.b > 80, 'Brightness positif harus menerangkan piksel.');

const darker = applyCorrectionToRgb(160, 160, 160, { ...ZERO, brightness: -20 });
assert.ok(darker.r < 160 && darker.g < 160 && darker.b < 160, 'Brightness negatif harus menggelapkan piksel.');

const highContrastDark = applyCorrectionToRgb(80, 80, 80, { ...ZERO, contrast: 50 });
const highContrastLight = applyCorrectionToRgb(180, 180, 180, { ...ZERO, contrast: 50 });
assert.ok(highContrastDark.r < 80, 'Kontras positif harus mendorong piksel gelap makin gelap.');
assert.ok(highContrastLight.r > 180, 'Kontras positif harus mendorong piksel terang makin terang.');

const warm = applyCorrectionToRgb(120, 120, 120, { ...ZERO, temperatureK: 500 });
assert.ok(warm.r > warm.b, 'Temperatur positif harus menggeser hasil lebih hangat.');

const magentaTint = applyCorrectionToRgb(120, 120, 120, { ...ZERO, tint: 40 });
assert.ok(magentaTint.g < 120, 'Tint positif harus mengurangi kanal hijau relatif.');

const exposed = applyCorrectionToRgb(60, 60, 60, { ...ZERO, exposureEV: 1 });
assert.ok(exposed.r >= 119 && exposed.r <= 121, 'Exposure +1 EV harus mendekati dua kali intensitas sebelum clipping.');

const saturated = applyCorrectionToRgb(160, 100, 80, { ...ZERO, saturation: 40 });
assert.ok((saturated.r - saturated.b) > (160 - 80), 'Saturasi positif harus memperlebar perbedaan kanal warna.');

console.log('PASS: koreksi preview/ekspor menerapkan exposure, brightness, WB, saturation, dan contrast.');
