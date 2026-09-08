// Tes komponen di memori: tidak membuka browser, aplikasi, atau installer.
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { MainQCScreen } from '../src/components/qc/MainQCScreen';
import { CorrectionPanel } from '../src/components/qc/CorrectionPanel';
import { InteractiveImageViewer } from '../src/components/qc/InteractiveImageViewer';
import { QCReportModal } from '../src/components/qc/QCReportModal';
import { INITIAL_MASTERS } from '../src/data/initialMasters';
import { ZERO_CORRECTION } from '../src/color_science/correction';
import { hasActiveCorrection } from '../src/color_science/imageCorrection';
import { convertImageToJpegDataUrl, renderCorrectedPreview } from '../src/utils/canvasColorExtractor';
import type { QCRecord } from '../src/types';

let encodes = 0;
let missingContext = false;
let lastDownload = '';
class TestImage {
  naturalWidth = 16;
  naturalHeight = 16;
  color = [120, 90, 60, 255];
  onload = () => {};
  set src(source: string) {
    this.color = source.startsWith('data:image/jpeg;base64,')
      ? JSON.parse(Buffer.from(source.split(',')[1], 'base64').toString())
      : source.includes('product') ? [145, 108, 68, 255] : [120, 90, 60, 255];
    queueMicrotask(() => this.onload());
  }
}
class TestReader {
  onload: (event: unknown) => void = () => {};
  abort() {}
  readAsDataURL(file: File) {
    this.onload({ target: { result: `data:image/png;${file.name}` } });
  }
}

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  Image: TestImage,
  FileReader: TestReader,
  window: { addEventListener() {}, removeEventListener() {} },
  document: {
    createElement(tag: string) {
      if (tag === 'a') return { href: '', click() { lastDownload = this.href; } };
      assert.equal(tag, 'canvas');
      let color = [255, 255, 255, 255];
      const context = {
        fillStyle: '',
        fillRect() {},
        drawImage(img: TestImage) { color = [...img.color]; },
        getImageData(_x: number, _y: number, width: number, height: number) {
          return { data: new Uint8ClampedArray(Array.from({ length: width * height }, () => color).flat()) };
        },
        putImageData(image: { data: Uint8ClampedArray }) { color = [...image.data.slice(0, 4)]; },
      };
      return {
        width: 0, height: 0,
        getContext: () => missingContext ? null : context,
        toDataURL() {
          encodes++;
          return `data:image/jpeg;base64,${Buffer.from(JSON.stringify(color)).toString('base64')}`;
        },
      };
    },
  },
});

const correction = { ...ZERO_CORRECTION, brightness: 17, contrast: 12, tint: -8 };
encodes = 0;
const preview = await renderCorrectedPreview('data:image/png;product', correction);
assert.equal(encodes, 1);
encodes = 0;
assert.equal(await convertImageToJpegDataUrl('data:image/png;product', 0.95, correction), preview);
assert.equal(encodes, 1, 'Ekspor mengompres sekali dari sumber asli.');
assert.equal(await renderCorrectedPreview('data:image/png;product', ZERO_CORRECTION), 'data:image/png;product');
assert.match(await convertImageToJpegDataUrl('data:image/png;product', 0.95, ZERO_CORRECTION), /^data:image\/jpeg/);
missingContext = true;
await assert.rejects(renderCorrectedPreview('data:image/png;product', correction), /canvas/);
missingContext = false;

const records: QCRecord[] = [];
let tree: ReactTestRenderer;
await act(async () => {
  tree = create(<MainQCScreen currentMaster={INITIAL_MASTERS[0]} onSaveQCRecord={async (record) => {
    records.push(record);
    return true;
  }} />);
});
const panel = () => tree.root.findByType(CorrectionPanel).props;
const pass = () => tree.root.findAllByType('button').find((button) =>
  button.children.includes('PASS (PRODUK LOLOS)'))!;
const compare = async () => {
  await act(async () => {
    await tree.root.findByProps({ id: 'btn-recompare' }).props.onClick();
  });
};
await act(async () => {
  const viewers = tree.root.findAllByType(InteractiveImageViewer);
  viewers[0].props.onUploadImage({ name: 'master.png', type: 'image/png', size: 10 });
  viewers[1].props.onUploadImage({ name: 'product.png', type: 'image/png', size: 10 });
});
await act(async () => { await tree.root.findByProps({ id: 'btn-start-compare' }).props.onClick(); });
const recommendation = { ...panel().recommended };
assert.ok(hasActiveCorrection(recommendation), 'Fixture harus menghasilkan saran koreksi.');
assert.deepEqual(panel().params, recommendation);

await act(async () => { panel().onReset(); });
assert.deepEqual(panel().params, ZERO_CORRECTION, 'Reset manual bertahan setelah efek komponen.');
await compare();
assert.deepEqual(panel().params, recommendation, 'Pengukuran ulang identik tetap mengisi saran.');
await compare();
assert.deepEqual(panel().params, recommendation, 'Saran tidak hilang pada pengukuran ketiga.');

assert.equal(pass().props.disabled, false);
assert.deepEqual(tree.root.findByType(QCReportModal).props.correctionParams, ZERO_CORRECTION,
  'Laporan foto asli tidak mengaku memakai saran yang belum diukur.');
await act(async () => { panel().onTogglePreview(); });
assert.equal(pass().props.disabled, true, 'Preview berubah: keputusan harus ditahan.');
assert.equal(tree.root.findAllByProps({ id: 'btn-open-qc-report' }).length, 0);
await act(async () => { await pass().props.onClick(); });
assert.equal(records.length, 0, 'Handler juga menolak penyimpanan dengan bukti lama.');
await compare();
assert.equal(pass().props.disabled, false);
assert.deepEqual(panel().params, recommendation, 'Pengukuran preview tidak mengganti slider dengan saran sisa.');
await act(async () => { await pass().props.onClick(); });
assert.equal(records.length, 1);
assert.equal(records[0].metadata.measurementSource, 'corrected');
assert.deepEqual(records[0].metadata.measurementCorrection, recommendation);

await act(async () => { panel().onChangeParams(correction); });
assert.equal(pass().props.disabled, true, 'Mengubah slider setelah pengukuran menahan keputusan.');
await compare();
assert.equal(pass().props.disabled, false);
assert.deepEqual(tree.root.findByType(QCReportModal).props.correctionParams, correction);
encodes = 0;
await act(async () => {
  await Promise.all([panel().onExportJpeg(), panel().onExportJpeg()]);
});
assert.equal(encodes, 1, 'Tombol ekspor harus memakai satu kali kompresi.');
assert.equal(lastDownload, preview, 'Preview dan ekspor memakai piksel koreksi yang sama.');
assert.equal(panel().exportFeedback.status, 'success');
assert.match(panel().exportFeedback.message, /product_corrected_srgb.jpg.*Permintaan unduhan dikirim/);
assert.ok(tree.root.findAllByProps({ role: 'status' }).some((node) => node.children.includes(panel().exportFeedback.message)),
  'Notifikasi unduhan tampil dekat tombol ekspor.');
missingContext = true;
await act(async () => { await panel().onExportJpeg(); });
assert.equal(panel().exportFeedback.status, 'error');
assert.ok(tree.root.findAllByProps({ role: 'alert' }).some((node) => node.children.includes(panel().exportFeedback.message)));
missingContext = false;
await act(async () => { await panel().onExportJpeg(); });
assert.equal(panel().exportFeedback.status, 'success', 'Ekspor bisa dicoba ulang setelah gagal.');
await act(async () => { panel().onTogglePreview(); });
assert.equal(pass().props.disabled, true, 'Kembali ke asli membatalkan bukti preview terkoreksi.');
await compare();
assert.equal(pass().props.disabled, false);
await act(async () => { panel().onReset(); panel().onTogglePreview(); });
assert.equal(pass().props.disabled, false, 'Preview nol sama dengan foto asli yang sudah diukur.');
await act(async () => { tree.unmount(); });
console.log('PASS: saran berulang, reset, validitas keputusan/laporan, dan jalur ekspor satu kompresi.');
