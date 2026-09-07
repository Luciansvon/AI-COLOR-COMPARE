import assert from 'node:assert/strict';
import {
  createTauriStorageBridge,
  StorageBridgeError,
} from '../src/services/tauriBridge';
import type { MasterIdentity, QCRecord } from '../src/types';

const master: MasterIdentity = {
  id: 'master-bridge-test',
  code: 'BT-01',
  name: 'Master Bridge Uji',
  category: 'wood',
  nominalLab: { l: 40, a: 8, b: 14 },
  createdAt: '2026-09-07T00:00:00Z',
};

const qcRecord: QCRecord = {
  id: 'qc-bridge-test',
  sessionId: 'session-bridge-test',
  timestamp: '2026-09-07T00:00:00Z',
  productName: 'Produk Bridge Uji',
  masterCode: 'BT-01',
  sourceImageName: 'produk.jpg',
  metadata: {
    fileName: 'produk.jpg',
    fileSize: 12,
    format: 'JPEG',
  },
  rois: [],
  finalProductDecision: {
    decision: 'PASS',
    failReasons: [],
    timestamp: '2026-09-07T00:00:00Z',
  },
};

async function assertStorageError(action: () => Promise<unknown>, expectedCommand: string) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof StorageBridgeError);
    assert.equal(error.command, expectedCommand);
    assert.equal(error.code, 'ipc_error');
    return true;
  });
}

async function main() {
  const calledCommands: string[] = [];
  const successfulBridge = createTauriStorageBridge({
    isTauri: () => true,
    invoke: async <T>(command: string) => {
      calledCommands.push(command);
      // Tauri mengirim null untuk Rust Result<(), String> yang sukses.
      return undefined as T;
    },
  });

  assert.equal(await successfulBridge.persistMasterToStorage(master), true);
  assert.equal(await successfulBridge.persistQCRecordToStorage(qcRecord), true);
  assert.deepEqual(calledCommands, ['add_master_cmd', 'save_qc_record_cmd']);

  let storedPayload: unknown;
  const roundTripBridge = createTauriStorageBridge({
    isTauri: () => true,
    invoke: async <T>(command: string, args?: Record<string, unknown>) => {
      if (command === 'save_qc_record_cmd') { storedPayload = args?.record; return undefined as T; }
      return [storedPayload] as T;
    },
  });
  const correction = { temperatureK: 100, tint: -5, exposureEV: 0.1, saturation: 2, brightness: 0, contrast: 0 };
  await roundTripBridge.persistQCRecordToStorage({ ...qcRecord, metadata: {
    ...qcRecord.metadata, measurementSource: 'corrected', measurementCorrection: correction,
  } });
  const restored = (await roundTripBridge.getQCRecordsFromStorage())[0];
  assert.equal(restored.metadata.measurementSource, 'corrected');
  assert.deepEqual(restored.metadata.measurementCorrection, correction);

  const emptyDbBridge = createTauriStorageBridge({
    isTauri: () => true,
    invoke: async <T>(command: string) => {
      if (command === 'list_masters_cmd' || command === 'list_qc_records_cmd') return [] as T;
      throw new Error(`Command tidak diharapkan: ${command}`);
    },
  });
  assert.deepEqual(await emptyDbBridge.getMastersFromStorage(), []);
  assert.deepEqual(await emptyDbBridge.getQCRecordsFromStorage(), []);

  const failedReadBridge = createTauriStorageBridge({
    isTauri: () => true,
    invoke: async <T>() => {
      throw new Error('database terkunci');
    },
  });
  await assertStorageError(() => failedReadBridge.getMastersFromStorage(), 'list_masters_cmd');
  await assertStorageError(() => failedReadBridge.getQCRecordsFromStorage(), 'list_qc_records_cmd');

  const malformedHistoryBridge = createTauriStorageBridge({
    isTauri: () => true,
    invoke: async <T>() => ([{
      id: 'qc-rusak',
      session_id: 'sesi',
      timestamp: '2026-09-07T00:00:00Z',
      product_name: 'Produk',
      master_code: 'BT-01',
      source_image_name: '',
      metadata_json: '{}',
      rois_json: '[null]',
      global_correction_json: null,
      conflict_check_json: null,
      final_decision: 'PASS',
      fail_reasons_json: null,
      operator_note: null,
    }] as T),
  });
  await assert.rejects(
    () => malformedHistoryBridge.getQCRecordsFromStorage(),
    (error: unknown) => error instanceof StorageBridgeError && error.code === 'invalid_response',
  );

  const browserBridge = createTauriStorageBridge({ isTauri: () => false });
  assert.equal((await browserBridge.getMastersFromStorage()).length, 3);
  assert.deepEqual(await browserBridge.getQCRecordsFromStorage(), []);

  console.log('✅ [PASS] Regresi bridge Tauri: null sukses, kegagalan baca, respons kosong, dan JSON rusak.');
}

main().catch((error) => {
  console.error('❌ [FAIL] Regresi bridge Tauri:', error);
  process.exitCode = 1;
});
