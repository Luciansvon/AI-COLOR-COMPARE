// Memastikan pratinjau kecil tidak mengubah ukuran ukur maupun ekspor sumber asli.
import assert from 'node:assert/strict';
import {
  convertImageToJpegBlob,
  convertImageToJpegDataUrl,
  createImagePreviewSource,
  createPlatformPreviewSource,
  extractPixelsFromImageROI,
  renderCorrectedPreview,
} from '../src/utils/canvasColorExtractor';
import { ZERO_CORRECTION } from '../src/color_science/correction';

const drawSizes: Array<{ canvasWidth: number; canvasHeight: number; sourceWidth: number; sourceHeight: number }> = [];
class LargeImage {
  naturalWidth = 6000;
  naturalHeight = 4000;
  width = this.naturalWidth;
  height = this.naturalHeight;
  onload = () => {};
  set src(_value: string) { queueMicrotask(() => this.onload()); }
}

Object.assign(globalThis, {
  Image: LargeImage,
  document: {
    createElement(tag: string) {
      assert.equal(tag, 'canvas');
      const canvas = {
        width: 0,
        height: 0,
        getContext() {
          let color = [120, 90, 60, 255];
          return {
            fillStyle: '',
            fillRect() {},
            drawImage(_image: LargeImage, ...args: number[]) {
              drawSizes.push({
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                sourceWidth: args[2],
                sourceHeight: args[3],
              });
            },
            getImageData() { return { data: new Uint8ClampedArray(color) }; },
            putImageData(imageData: { data: Uint8ClampedArray }) { color = Array.from(imageData.data.slice(0, 4)); },
          };
        },
        toDataURL() { return `data:image/jpeg;base64,${canvas.width}x${canvas.height}`; },
        toBlob(callback: (blob: Blob | null) => void) {
          callback(new Blob([`${canvas.width}x${canvas.height}`], { type: 'image/jpeg' }));
        },
      };
      return canvas;
    },
  },
});

const source = 'data:image/jpeg;base64,large-source';
const preview = await createImagePreviewSource(source);
assert.match(preview, /2048x1365$/, 'Pratinjau layar dibatasi sampai sisi terpanjang 2048 piksel.');
const androidDisplayPreview = await createPlatformPreviewSource(source, true);
assert.match(androidDisplayPreview, /2048x1365$/, 'Pratinjau Android dibatasi sampai sisi terpanjang 2048 piksel.');
assert.equal(await createPlatformPreviewSource(source, false), source,
  'Pratinjau Windows tetap memakai foto penuh seperti sebelumnya.');
const activeCorrection = { ...ZERO_CORRECTION, brightness: 10 };
const correctedAndroidPreview = await renderCorrectedPreview(source, activeCorrection, 2048);
assert.match(correctedAndroidPreview, /2048x1365$/, 'Pratinjau koreksi Android tetap dibatasi ukurannya.');
const correctedWindowsPreview = await renderCorrectedPreview(source, activeCorrection);
assert.match(correctedWindowsPreview, /6000x4000$/, 'Pratinjau koreksi Windows mempertahankan ukuran penuh.');

const measuredCorrection = await convertImageToJpegDataUrl(source, 0.95, activeCorrection);
assert.match(measuredCorrection, /6000x4000$/, 'Foto terkoreksi untuk pengukuran mempertahankan resolusi penuh.');
const exported = await convertImageToJpegBlob(source, 0.95, activeCorrection);
assert.equal(await exported.text(), '6000x4000', 'JPEG ekspor tetap memakai resolusi sumber penuh.');

const roi = await extractPixelsFromImageROI(source, { x: 50, y: 25, width: 10, height: 10 });
assert.deepEqual({ width: roi.width, height: roi.height }, { width: 600, height: 400 },
  'Piksel pengukuran ROI diambil dari ukuran asli, bukan pratinjau.');
assert.ok(drawSizes.some((size) => size.canvasWidth === 600 && size.canvasHeight === 400),
  'Kanvas ukur menggunakan dimensi ROI asli yang sesuai persentase operator.');

console.log('LULUS: pratinjau dikurangi ukurannya, sedangkan pengukuran ROI dan JPEG ekspor tetap memakai sumber penuh.');
