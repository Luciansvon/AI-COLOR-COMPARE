// Memeriksa alur potongan Tauri secara lokal; tidak memanggil penyimpanan atau perangkat Android.
import assert from 'node:assert/strict';
import { saveBlobToAndroid } from '../src/services/androidExports';

type Payload = Record<string, unknown>;
let nativeInvoke: (command: string, payload: Payload) => Promise<unknown>;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { userAgent: 'Android WebView test' },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { __TAURI_INTERNALS__: { invoke: (command: string, payload: Payload) => nativeInvoke(command, payload) } },
});

const content = new Uint8Array([0, 17, 34, 51, 68, 85, 102, 119]);
const blob = new Blob([content], { type: 'image/jpeg' });
const hash = 'a'.repeat(64);

const calls: Array<{ command: string; payload: Payload }> = [];
nativeInvoke = async (command, payload) => {
  calls.push({ command, payload });
  if (command === 'android_io_begin_export') return { exportId: 'run-success', chunkBytes: 3 };
  if (command === 'android_io_append_export_chunk') {
    const chunk = Buffer.from(String(payload.base64), 'base64');
    return { bytesWritten: Number(payload.offset) + chunk.length };
  }
  if (command === 'android_io_save_export') {
    return { status: 'saved', fileName: 'photo.jpg', bytesWritten: content.length, sha256: hash };
  }
  throw new Error(`Command tidak dikenal: ${command}`);
};
const saved = await saveBlobToAndroid(blob, 'photo.jpg', 'image/jpeg');
assert.equal(saved.status, 'saved');
const successChunks = calls.filter((call) => call.command === 'android_io_append_export_chunk');
assert.equal(successChunks.length, 3, 'Blob dibagi menjadi potongan kecil yang berurutan.');
assert.deepEqual(successChunks.map((call) => call.payload.offset), [0, 3, 6], 'Offset potongan selalu berurutan.');
assert.deepEqual(
  Buffer.concat(successChunks.map((call) => Buffer.from(String(call.payload.base64), 'base64'))),
  Buffer.from(content),
  'Isi potongan sama persis dengan bita Blob asal.'
);

calls.length = 0;
nativeInvoke = async (command, payload) => {
  calls.push({ command, payload });
  if (command === 'android_io_begin_export') return { exportId: 'run-cancel', chunkBytes: 16 };
  if (command === 'android_io_append_export_chunk') return { bytesWritten: content.length };
  if (command === 'android_io_save_export') return { status: 'cancelled', reason: 'Batal oleh operator.' };
  if (command === 'android_io_abort_export') return { status: 'aborted' };
  throw new Error(`Command tidak dikenal: ${command}`);
};
const cancelled = await saveBlobToAndroid(blob, 'photo.jpg', 'image/jpeg');
assert.equal(cancelled.status, 'cancelled', 'Batal dari pemilih tujuan tidak dianggap berhasil.');
assert.equal(calls.some((call) => call.command === 'android_io_abort_export'), false,
  'Android sudah membersihkan sesi yang batal dari pemilih tujuan.');

calls.length = 0;
nativeInvoke = async (command, payload) => {
  calls.push({ command, payload });
  if (command === 'android_io_begin_export') return { exportId: 'run-chunk-error', chunkBytes: 3 };
  if (command === 'android_io_append_export_chunk') throw new Error('Potongan gagal.');
  if (command === 'android_io_abort_export') return { status: 'aborted' };
  throw new Error(`Command tidak dikenal: ${command}`);
};
await assert.rejects(saveBlobToAndroid(blob, 'photo.jpg', 'image/jpeg'), /Potongan gagal/);
assert.ok(calls.some((call) => call.command === 'android_io_abort_export'),
  'Sesi ditutup jika penulisan salah satu potongan gagal.');

calls.length = 0;
nativeInvoke = async (command, payload) => {
  calls.push({ command, payload });
  if (command === 'android_io_begin_export') return { exportId: 'run-bad-start', chunkBytes: 0 };
  if (command === 'android_io_abort_export') return { status: 'aborted' };
  throw new Error(`Command tidak dikenal: ${command}`);
};
await assert.rejects(saveBlobToAndroid(blob, 'photo.jpg', 'image/jpeg'), /tidak menyiapkan sesi/);
assert.ok(calls.some((call) => call.command === 'android_io_abort_export'),
  'Sesi ditutup jika Android memberi ukuran potongan yang tidak valid.');

calls.length = 0;
nativeInvoke = async (command, payload) => {
  calls.push({ command, payload });
  if (command === 'android_io_begin_export') return { exportId: 'run-bad-result', chunkBytes: 16 };
  if (command === 'android_io_append_export_chunk') return { bytesWritten: content.length };
  if (command === 'android_io_save_export') {
    return { status: 'saved', fileName: 'photo.jpg', bytesWritten: content.length - 1, sha256: hash };
  }
  throw new Error(`Command tidak dikenal: ${command}`);
};
await assert.rejects(saveBlobToAndroid(blob, 'photo.jpg', 'image/jpeg'), /Verifikasi berkas Android/);
assert.equal(calls.some((call) => call.command === 'android_io_abort_export'), false,
  'Sesi native sudah selesai dibersihkan saat jawaban tersimpan tidak cocok; tidak dikirim abort kedua.');

console.log('LULUS: transfer potongan, batal, gagal tulis, begin tidak lengkap, dan hasil simpan yang tidak cocok.');
