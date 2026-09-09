import assert from 'node:assert/strict';
import { calculateContainFit } from '../src/utils/imageFit';

const nearly = (a: number, b: number) => Math.abs(a - b) < 0.01;

const landscape = calculateContainFit(6000, 4000, 650, 440);
assert.ok(nearly(landscape.width, 650));
assert.ok(landscape.height <= 440);
assert.ok(nearly(landscape.width / landscape.height, 1.5));

const portrait = calculateContainFit(3000, 5000, 650, 440);
assert.ok(portrait.width <= 650);
assert.ok(nearly(portrait.height, 440));
assert.ok(nearly(portrait.width / portrait.height, 0.6));

const ultraWide = calculateContainFit(8000, 1000, 650, 440);
assert.ok(nearly(ultraWide.width, 650));
assert.ok(ultraWide.height <= 440);

const ultraTall = calculateContainFit(1000, 8000, 650, 440);
assert.ok(ultraTall.width <= 650);
assert.ok(nearly(ultraTall.height, 440));

const small = calculateContainFit(320, 200, 650, 440);
assert.deepEqual(small, { width: 320, height: 200 });

const invalid = calculateContainFit(0, 200, 650, 440);
assert.deepEqual(invalid, { width: 0, height: 0 });

console.log('PASS image-fit: landscape, portrait, ekstrem, dan gambar kecil seluruhnya contain tanpa crop.');
