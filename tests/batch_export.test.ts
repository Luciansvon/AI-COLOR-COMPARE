import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { createBatchExport, validateBatch, MAX_BATCH_PHOTOS, MAX_BATCH_BYTES } from '../src/services/batchExport';
import { ZERO_CORRECTION } from '../src/color_science/correction';
import type { CorrectionParams } from '../src/types';

// Menguji arsip ZIP nyata dengan encoder pengganti; bukan uji visual JPEG/browser.
const jpeg = 'data:image/jpeg;base64,/9j/2Q==';
const params = { ...ZERO_CORRECTION, brightness: 12, contrast: 8, tint: -9 };
const snapshot = { ...params };
const image = new File([new Uint8Array([1, 2, 3, 4])], 'chair.png', { type: 'image/png' });
const original = new Uint8Array(await image.arrayBuffer());
const photos = [
  { name: 'chair.jpg', source: 'data:image/png;reference' },
  { name: image.name, source: image },
  { name: 'CHAIR.webp', source: 'data:image/webp;third' },
  { name: '../chair.jpg', source: 'data:image/jpeg;fourth' },
];
const used: CorrectionParams[] = [];
const sources: string[] = [];
const progress: number[] = [];
const result = await createBatchExport(photos, params, {
  onProgress: ({ completed }) => progress.push(completed),
  encode: async (source, quality, correction) => {
    sources.push(source);
    used.push({ ...correction! });
    assert.equal(quality, 0.95);
    params.brightness = -40;
    photos[2].name = 'changed.jpg';
    return jpeg;
  },
});
assert.equal(used.length, 4);
used.forEach((correction) => assert.deepEqual(correction, snapshot, 'Semua foto memakai snapshot awal.'));
assert.equal(sources[0], 'data:image/png;reference');
assert.match(sources[1], /^blob:/);
await assert.rejects(fetch(sources[1]), 'URL sementara sudah dilepas setelah foto diproses.');
assert.deepEqual(new Uint8Array(await image.arrayBuffer()), original, 'Berkas input tidak berubah.');
assert.equal(result.blob.type, 'application/zip');
assert.equal(result.filename, 'chair_batch_koreksi.zip');
const archive = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
assert.deepEqual(Object.keys(archive), [
  'chair_corrected_srgb.jpg', 'chair_corrected_srgb_2.jpg', 'CHAIR_corrected_srgb_3.jpg',
  '_chair_corrected_srgb.jpg', 'koreksi-batch.json',
]);
const manifest = JSON.parse(strFromU8(archive['koreksi-batch.json']));
assert.equal(manifest.referencePhoto, 'chair.jpg');
assert.equal(manifest.photos[2].source, 'CHAIR.webp');
assert.deepEqual(manifest.correction, snapshot);
for (const entry of manifest.photos) assert.deepEqual(archive[entry.output], new Uint8Array([255, 216, 255, 217]));
assert.equal(progress[0], 0);
assert.equal(progress.at(-1), 4);

let failedUrl = '';
await assert.rejects(createBatchExport(photos.slice(0, 2), snapshot, {
  encode: async (source) => {
    if (source.startsWith('blob:')) { failedUrl = source; throw new Error('Foto rusak'); }
    return jpeg;
  },
}), /chair.png: Foto rusak.*ZIP belum dibuat/);
await assert.rejects(fetch(failedUrl));

const controller = new AbortController();
let processed = 0;
await assert.rejects(createBatchExport(photos, snapshot, {
  signal: controller.signal,
  encode: async () => { processed++; controller.abort(); return jpeg; },
}), { name: 'AbortError' });
assert.equal(processed, 1, 'Pembatalan tidak melanjutkan foto kedua.');
await assert.rejects(createBatchExport(photos, snapshot, { encode: async () => 'data:image/png;base64,AAAA' }), /bukan JPEG/);
assert.throws(() => validateBatch(photos.slice(0, 1)), /minimal satu foto tambahan/);
assert.throws(() => validateBatch(Array.from({ length: MAX_BATCH_PHOTOS + 1 }, () => photos[0])), /Maksimal 50/);
assert.throws(() => validateBatch([photos[0], { name: 'raw.CR2', source: new File(['raw'], 'raw.CR2') }]), /JPG, PNG, atau WebP/);
assert.throws(() => validateBatch([photos[0], { name: 'large.jpg', source: { size: MAX_BATCH_BYTES + 1 } as File }]), /200 MB/);
console.log('PASS: batch mengunci koreksi, menyertakan acuan, menjaga nama unik, membuat ZIP, membersihkan URL, serta menangani gagal/batal/batas ukuran.');
