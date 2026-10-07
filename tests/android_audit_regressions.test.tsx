// Reproduksi alur kritis pada komponen React; tidak menjalankan APK atau perangkat Android.
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MainQCScreen } from '../src/components/qc/MainQCScreen';
import { InteractiveImageViewer } from '../src/components/qc/InteractiveImageViewer';
import { DecisionModal } from '../src/components/qc/DecisionModal';
import { INITIAL_MASTERS } from '../src/data/initialMasters';

const pendingImageLoads: Array<() => void> = [];
const measuredCrops: Array<{ source: string; x: number; y: number; width: number; height: number }> = [];
class TestImage {
  naturalWidth = 100;
  naturalHeight = 100;
  source = '';
  onload = () => {};
  set src(value: string) {
    this.source = value;
    pendingImageLoads.push(() => this.onload());
  }
}

class TestReader {
  onload: (event: unknown) => void = () => {};
  abort() {}
  readAsDataURL(file: { name: string }) {
    this.onload({ target: { result: `data:image/png;${file.name}` } });
  }
}

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  Image: TestImage,
  FileReader: TestReader,
  window: {
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
  },
  document: {
    activeElement: null,
    body: { style: { overflow: '' } },
    addEventListener() {},
    removeEventListener() {},
    createElement(tag: string) {
      assert.equal(tag, 'canvas');
      return {
        width: 0,
        height: 0,
        getContext() {
          let sampledColor = [120, 90, 60, 255];
          return {
            drawImage(image: TestImage, x: number, y: number, width: number, height: number) {
              measuredCrops.push({ source: image.source, x, y, width, height });
              if (image.source.includes('product.png') && x === 25) {
                sampledColor = [145, 108, 68, 255];
              }
            },
            getImageData(_x: number, _y: number, width: number, height: number) {
              const data = new Uint8ClampedArray(width * height * 4);
              for (let offset = 0; offset < data.length; offset += 4) data.set(sampledColor, offset);
              return { data };
            },
          };
        },
      };
    },
  },
});

const savedRecords: any[] = [];
let screen: any;
await act(async () => {
  screen = create(<MainQCScreen currentMaster={INITIAL_MASTERS[0]} onSaveQCRecord={async (record) => {
    savedRecords.push(record);
    return true;
  }} />);
});

await act(async () => {
  const viewers = screen.root.findAllByType(InteractiveImageViewer);
  viewers[0].props.onUploadImage({ name: 'master.png', type: 'image/png', size: 1 });
  viewers[1].props.onUploadImage({ name: 'product.png', type: 'image/png', size: 1 });
});

let firstComparison!: Promise<boolean>;
act(() => {
  firstComparison = screen.root.findByProps({ id: 'btn-start-compare' }).props.onClick();
});
assert.ok(pendingImageLoads.length > 0, 'Pengukuran awal menunggu foto selesai didekode.');

const changedBox = { x: 70, y: 70, width: 20, height: 20 };
await act(async () => {
  screen.root.findAllByType(InteractiveImageViewer)[1]
    .props.onUpdateRoiBox('roi-center', { x: 60, y: 60, width: 25, height: 25 }, false);
});
await act(async () => {
  screen.root.findAllByType(InteractiveImageViewer)[1]
    .props.onUpdateRoiBox('roi-center', changedBox, true);
});

// Setiap pemuatan yang tertunda diselesaikan; pekerjaan lama boleh selesai,
// tetapi hanya pengukuran dengan kotak terbaru yang boleh membuka keputusan.
for (let step = 0; step < 40; step++) {
  await act(async () => {
    // Ambil pemuatan terbaru lebih dulu agar perhitungan baru selesai sebelum yang lama.
    // Pekerjaan lama kemudian dibiarkan selesai paling akhir untuk menguji pembatalan generasi.
    pendingImageLoads.pop()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
await act(async () => { await firstComparison; });

const passButton = screen.root.findAllByType('button').find((button: any) =>
  button.children.includes('PASS (PRODUK LOLOS)'));
assert.ok(passButton, 'Tombol keputusan produk tersedia setelah pengukuran baru selesai.');
assert.equal(passButton.props.disabled, false, 'Keputusan baru aktif setelah pengukuran area terbaru selesai.');
await act(async () => { await passButton.props.onClick(); });
assert.equal(savedRecords.length, 1);

const productCrops = measuredCrops.filter((crop) => crop.source.includes('product.png'));
const newProductCropIndex = productCrops.findIndex((crop) => crop.x === 70);
const staleProductCropIndex = productCrops.findLastIndex((crop) => crop.x === 25);
assert.ok(newProductCropIndex >= 0, 'Pengukuran terbaru memakai kotak ROI terbaru.');
assert.ok(staleProductCropIndex > newProductCropIndex,
  'Pekerjaan lama dibiarkan menyelesaikan ekstraksi setelah pengukuran terbaru.');
assert.deepEqual(productCrops[newProductCropIndex], {
  source: 'data:image/png;product.png', x: 70, y: 70, width: 20, height: 20,
}, 'Ekstraksi baru membaca ROI yang benar sebelum ekstraksi lama selesai.');
assert.deepEqual(savedRecords[0].rois[0].roi.box, changedBox,
  'Kotak pada riwayat sama dengan kotak yang dipakai untuk mengukur.');
assert.deepEqual(savedRecords[0].rois[0].measured.productRgb, { r: 120, g: 90, b: 60 },
  'Pekerjaan lama yang selesai terakhir tidak menimpa angka hasil baru.');
await act(async () => { screen.unmount(); });

async function makeUploadedScreen() {
  let tree: any;
  await act(async () => {
    tree = create(<MainQCScreen currentMaster={INITIAL_MASTERS[0]} onSaveQCRecord={async (record) => {
      savedRecords.push(record);
      return true;
    }} />);
  });
  await act(async () => {
    const viewers = tree.root.findAllByType(InteractiveImageViewer);
    viewers[0].props.onUploadImage({ name: 'master.png', type: 'image/png', size: 1 });
    viewers[1].props.onUploadImage({ name: 'product.png', type: 'image/png', size: 1 });
  });
  act(() => { tree.root.findByProps({ id: 'btn-start-compare' }).props.onClick(); });
  return tree;
}

async function drainImageLoads() {
  for (let step = 0; step < 40; step++) {
    await act(async () => {
      pendingImageLoads.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function savePass(tree: any) {
  const button = tree.root.findAllByType('button').find((candidate: any) =>
    candidate.children.includes('PASS (PRODUK LOLOS)'));
  assert.ok(button && !button.props.disabled, 'Keputusan dibuka setelah pengukuran yang dibatalkan diganti.');
  await act(async () => { await button.props.onClick(); });
}

// Perubahan area master saat foto masih didekode harus mengganti pengukuran lama.
measuredCrops.length = 0;
savedRecords.length = 0;
let masterTree = await makeUploadedScreen();
const changedMasterBox = { x: 70, y: 70, width: 20, height: 20 };
await act(async () => {
  masterTree.root.findAllByType(InteractiveImageViewer)[0]
    .props.onUpdateRoiBox('roi-master-ref', { x: 60, y: 60, width: 25, height: 25 }, false);
});
await act(async () => {
  masterTree.root.findAllByType(InteractiveImageViewer)[0]
    .props.onUpdateRoiBox('roi-master-ref', changedMasterBox, true);
});
await drainImageLoads();
await savePass(masterTree);
const latestMasterCrop = measuredCrops.filter((crop) => crop.source.includes('master.png')).at(-1);
assert.deepEqual(
  { x: latestMasterCrop?.x, y: latestMasterCrop?.y, width: latestMasterCrop?.width, height: latestMasterCrop?.height },
  { x: 70, y: 70, width: 20, height: 20 },
  'Foto master diukur memakai kotak terbaru setelah geser sementara dan pelepasan.'
);
await act(async () => { masterTree.unmount(); });

// Perubahan preset saat dekode tertunda juga harus membatalkan pengukuran sebelumnya.
measuredCrops.length = 0;
savedRecords.length = 0;
let presetTree = await makeUploadedScreen();
await act(async () => {
  const fullSurfaceButton = presetTree.root.findAllByType('button').find((button: any) =>
    button.children.includes('📐 Seluruh Permukaan'));
  assert.ok(fullSurfaceButton);
  fullSurfaceButton.props.onClick();
});
await drainImageLoads();
await savePass(presetTree);
const latestPresetProductCrop = measuredCrops.filter((crop) => crop.source.includes('product.png')).at(-1);
assert.deepEqual(
  { x: latestPresetProductCrop?.x, y: latestPresetProductCrop?.y, width: latestPresetProductCrop?.width, height: latestPresetProductCrop?.height },
  { x: 5, y: 5, width: 90, height: 90 },
  'Preset area penuh saat dekode tertunda mengganti hasil hitungan dan riwayat.'
);
assert.deepEqual(savedRecords[0].rois[0].roi.box, { x: 5, y: 5, width: 90, height: 90 });
await act(async () => { presetTree.unmount(); });

let saveAttempt = 0;
let resolveFirstSave!: (saved: boolean) => void;
const firstSave = new Promise<boolean>((resolve) => { resolveFirstSave = resolve; });
let dialogClosed = false;
let modal: any;
await act(async () => {
  modal = create(<DecisionModal isOpen targetName="Produk uji" onClose={() => { dialogClosed = true; }}
    onConfirmFail={async () => {
      saveAttempt++;
      if (saveAttempt === 1) return firstSave;
      if (saveAttempt === 2) throw new Error('penyimpanan gagal');
      return true;
    }} />);
});
await act(async () => {
  modal.root.findAllByType('input')[0].props.onChange();
  modal.root.findByType('textarea').props.onChange({ target: { value: 'Catatan operator' } });
});
const confirmFail = () => modal.root.findAllByType('button').at(-1);
await act(async () => { confirmFail()!.props.onClick(); await Promise.resolve(); });
assert.equal(confirmFail()!.props.disabled, true, 'Konfirmasi terkunci selama penyimpanan berjalan.');
assert.equal(modal.root.findAllByType('button')[0].props.disabled, true, 'Tombol tutup terkunci selama penyimpanan berjalan.');
await act(async () => { modal.root.findAllByType('button')[0].props.onClick(); });
assert.equal(dialogClosed, false, 'Dialog tidak menutup sebelum kegagalan simpan dilaporkan.');
await act(async () => { resolveFirstSave(false); await firstSave; });
assert.equal(modal.root.findByType('textarea').props.value, 'Catatan operator', 'Catatan tetap tersedia saat simpan gagal.');
assert.ok(modal.root.findAllByProps({ role: 'alert' }).length > 0, 'Kegagalan simpan dijelaskan ke operator.');

await act(async () => { confirmFail()!.props.onClick(); await Promise.resolve(); });
assert.equal(dialogClosed, false, 'Dialog tetap terbuka jika penyimpanan melempar galat.');
assert.equal(modal.root.findByType('textarea').props.value, 'Catatan operator', 'Catatan tetap tersedia jika penyimpanan melempar galat.');

await act(async () => {
  modal.update(<DecisionModal isOpen={false} targetName="Produk uji" onClose={() => { dialogClosed = true; }}
    onConfirmFail={async () => true} />);
  await Promise.resolve();
});
dialogClosed = false;
await act(async () => {
  modal.update(<DecisionModal isOpen targetName="Produk uji" onClose={() => { dialogClosed = true; }}
    onConfirmFail={async () => true} />);
  await Promise.resolve();
});
assert.equal(modal.root.findAllByProps({ role: 'alert' }).length, 0, 'Pesan galat lama dibersihkan saat dialog dibuka lagi.');
assert.equal(modal.root.findByType('textarea').props.value, '', 'Formulir baru dimulai tanpa catatan dari sesi sebelumnya.');
await act(async () => {
  modal.root.findAllByType('input')[0].props.onChange();
  modal.root.findByType('textarea').props.onChange({ target: { value: 'Catatan baru' } });
});
await act(async () => { confirmFail()!.props.onClick(); await Promise.resolve(); });
assert.equal(dialogClosed, true, 'Dialog menutup setelah penyimpanan berhasil.');
await act(async () => { modal.unmount(); });

console.log('LULUS: hasil ROI selalu cocok dengan kotak tersimpan; formulir FAIL menunggu simpan dan mempertahankan catatan saat gagal.');
