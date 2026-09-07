// Jembatan Komunikasi Antara Frontend React dan Core Native Rust (Tauri IPC)

import { invoke } from '@tauri-apps/api/core';
import type { MasterIdentity, QCRecord } from '../types';
import { INITIAL_MASTERS } from '../data/initialMasters';

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
};

export type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

type BridgeErrorCode = 'ipc_error' | 'invalid_response';

export class StorageBridgeError extends Error {
  readonly command: string;
  readonly code: BridgeErrorCode;

  constructor(command: string, code: BridgeErrorCode, message: string) {
    super(message);
    this.name = 'StorageBridgeError';
    this.command = command;
    this.code = code;
  }
}

export type TauriStorageBridgeDependencies = {
  isTauri?: () => boolean;
  invoke?: TauriInvoke;
  warn?: (message: string, error?: unknown) => void;
};

type InvokeOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: StorageBridgeError };

type JsonRecord = Record<string, unknown>;

const defaultInvoke: TauriInvoke = <T>(command: string, args?: Record<string, unknown>) =>
  invoke<T>(command, args);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, command: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new StorageBridgeError(command, 'invalid_response', `Respons ${command} memiliki ${field} yang tidak valid.`);
  }
  return value;
}

function optionalNumber(value: unknown, field: string, command: string): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new StorageBridgeError(command, 'invalid_response', `Respons ${command} memiliki ${field} yang tidak valid.`);
  }
  return value;
}

function mapMasterRecord(value: unknown, command: string, index: number): MasterIdentity {
  if (!isRecord(value)) {
    throw new StorageBridgeError(command, 'invalid_response', `Data master ke-${index + 1} bukan objek yang valid.`);
  }

  const category = requiredString(value.category, 'category', command) as MasterIdentity['category'];
  if (!['wood', 'metal', 'fabric', 'leather', 'other'].includes(category)) {
    throw new StorageBridgeError(command, 'invalid_response', `Data master ke-${index + 1} memiliki kategori yang tidak dikenal.`);
  }

  const nominalL = optionalNumber(value.nominal_l, 'nominal_l', command);
  const nominalA = optionalNumber(value.nominal_a, 'nominal_a', command);
  const nominalB = optionalNumber(value.nominal_b, 'nominal_b', command);
  const hasCompleteLab = nominalL !== undefined && nominalA !== undefined && nominalB !== undefined;
  const hasPartialLab = [nominalL, nominalA, nominalB].some((value) => value !== undefined) && !hasCompleteLab;
  if (hasPartialLab) {
    throw new StorageBridgeError(command, 'invalid_response', `Data master ke-${index + 1} memiliki Lab yang tidak lengkap.`);
  }

  return {
    id: requiredString(value.id, 'id', command),
    code: requiredString(value.code, 'code', command),
    name: requiredString(value.name, 'name', command),
    category,
    description: typeof value.description === 'string' && value.description.length > 0 ? value.description : undefined,
    nominalLab: hasCompleteLab ? { l: nominalL, a: nominalA, b: nominalB } : undefined,
    createdAt: requiredString(value.created_at, 'created_at', command),
  };
}

function parseJsonField<T>(value: unknown, field: string, command: string): T {
  if (typeof value !== 'string') {
    throw new StorageBridgeError(command, 'invalid_response', `Kolom ${field} dari ${command} bukan JSON teks.`);
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new StorageBridgeError(command, 'invalid_response', `Kolom ${field} dari ${command} rusak dan tidak dapat dibaca.`);
  }
}

function mapQCRecord(value: unknown, command: string, index: number): QCRecord {
  if (!isRecord(value)) {
    throw new StorageBridgeError(command, 'invalid_response', `Riwayat QC ke-${index + 1} bukan objek yang valid.`);
  }

  const decision = requiredString(value.final_decision, 'final_decision', command);
  if (decision !== 'PASS' && decision !== 'FAIL') {
    throw new StorageBridgeError(command, 'invalid_response', `Riwayat QC ke-${index + 1} memiliki keputusan akhir yang tidak dikenal.`);
  }

  const metadata = parseJsonField<QCRecord['metadata']>(value.metadata_json, 'metadata_json', command);
  const rois = parseJsonField<QCRecord['rois']>(value.rois_json, 'rois_json', command);
  const globalCorrection = value.global_correction_json
    ? parseJsonField<NonNullable<QCRecord['globalCorrection']>>(value.global_correction_json, 'global_correction_json', command)
    : undefined;
  const conflictCheck = value.conflict_check_json
    ? parseJsonField<NonNullable<QCRecord['conflictCheck']>>(value.conflict_check_json, 'conflict_check_json', command)
    : undefined;
  const failReasons = value.fail_reasons_json
    ? parseJsonField<string[]>(value.fail_reasons_json, 'fail_reasons_json', command)
    : [];

  if (!Array.isArray(rois) || !Array.isArray(failReasons)) {
    throw new StorageBridgeError(command, 'invalid_response', `Riwayat QC ke-${index + 1} memiliki struktur JSON yang tidak sesuai.`);
  }
  if (!isRecord(metadata) || !rois.every((item) => isRecord(item) && isRecord(item.roi))) {
    throw new StorageBridgeError(command, 'invalid_response', `Riwayat QC ke-${index + 1} memiliki metadata atau ROI yang rusak.`);
  }
  if (!failReasons.every((reason) => typeof reason === 'string')) {
    throw new StorageBridgeError(command, 'invalid_response', `Riwayat QC ke-${index + 1} memiliki alasan FAIL yang rusak.`);
  }

  return {
    id: requiredString(value.id, 'id', command),
    sessionId: requiredString(value.session_id, 'session_id', command),
    timestamp: requiredString(value.timestamp, 'timestamp', command),
    productName: requiredString(value.product_name, 'product_name', command),
    masterCode: requiredString(value.master_code, 'master_code', command),
    // Versi lama dapat menyimpan nama sumber kosong. Pertahankan riwayatnya dengan label
    // jujur agar data tidak hilang dan operator tidak mengira nama itu diketahui.
    sourceImageName: typeof value.source_image_name === 'string' && value.source_image_name.trim().length > 0
      ? value.source_image_name
      : 'Nama berkas tidak tercatat',
    metadata,
    rois,
    globalCorrection,
    conflictCheck,
    finalProductDecision: {
      decision,
      failReasons,
      note: typeof value.operator_note === 'string' && value.operator_note.length > 0 ? value.operator_note : undefined,
      timestamp: requiredString(value.timestamp, 'timestamp', command),
    },
  };
}

/**
 * Membuat bridge dengan dependensi yang dapat diganti saat tes.
 * Pada runtime nyata, bridge memakai invoke Tauri bawaan.
 */
export function createTauriStorageBridge(dependencies: TauriStorageBridgeDependencies = {}) {
  const runtimeIsTauri = dependencies.isTauri ?? isTauriEnvironment;
  const runtimeInvoke = dependencies.invoke ?? defaultInvoke;
  const warn = dependencies.warn ?? ((message: string, error?: unknown) => console.warn(message, error));

  async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<InvokeOutcome<T>> {
    if (!runtimeIsTauri()) {
      return {
        ok: false,
        error: new StorageBridgeError(command, 'ipc_error', `Command ${command} hanya tersedia di aplikasi desktop.`),
      };
    }

    try {
      // Command Rust yang bertipe Result<(), String> memang dikirim Tauri sebagai null saat sukses.
      // Status sukses ditentukan dari tidak adanya exception IPC, bukan dari isi nilai return.
      return { ok: true, value: await runtimeInvoke<T>(command, args) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const bridgeError = new StorageBridgeError(command, 'ipc_error', `Gagal menjalankan command ${command}: ${message}`);
      warn(`[Tauri IPC] ${bridgeError.message}`, error);
      return { ok: false, error: bridgeError };
    }
  }

  async function getMastersFromStorage(): Promise<MasterIdentity[]> {
    const command = 'list_masters_cmd';
    const result = await invokeTauri<unknown[]>(command);
    if (!result.ok) {
      if (!runtimeIsTauri()) return INITIAL_MASTERS;
      throw result.error;
    }
    if (!Array.isArray(result.value)) {
      throw new StorageBridgeError(command, 'invalid_response', 'Daftar master dari database bukan array.');
    }
    return result.value.map((master, index) => mapMasterRecord(master, command, index));
  }

  async function persistMasterToStorage(master: MasterIdentity): Promise<boolean> {
    const payload = {
      id: master.id,
      code: master.code,
      name: master.name,
      category: master.category,
      description: master.description || null,
      nominal_l: master.nominalLab?.l ?? null,
      nominal_a: master.nominalLab?.a ?? null,
      nominal_b: master.nominalLab?.b ?? null,
      created_at: master.createdAt,
    };

    const result = await invokeTauri<void>('add_master_cmd', { master: payload });
    return result.ok;
  }

  async function persistQCRecordToStorage(record: QCRecord): Promise<boolean> {
    if (!record.finalProductDecision) {
      warn('[Storage] QC record ditolak karena keputusan akhir operator belum tersedia.');
      return false;
    }

    const payload = {
      id: record.id,
      session_id: record.sessionId,
      timestamp: record.timestamp,
      product_name: record.productName,
      master_code: record.masterCode,
      source_image_name: record.sourceImageName,
      metadata_json: JSON.stringify(record.metadata),
      rois_json: JSON.stringify(record.rois),
      global_correction_json: record.globalCorrection ? JSON.stringify(record.globalCorrection) : null,
      conflict_check_json: record.conflictCheck ? JSON.stringify(record.conflictCheck) : null,
      final_decision: record.finalProductDecision.decision,
      fail_reasons_json: record.finalProductDecision.failReasons.length > 0
        ? JSON.stringify(record.finalProductDecision.failReasons)
        : null,
      operator_note: record.finalProductDecision.note || null,
    };

    const result = await invokeTauri<void>('save_qc_record_cmd', { record: payload });
    return result.ok;
  }

  async function getQCRecordsFromStorage(): Promise<QCRecord[]> {
    const command = 'list_qc_records_cmd';
    const result = await invokeTauri<unknown[]>(command);
    if (!result.ok) {
      if (!runtimeIsTauri()) return [];
      throw result.error;
    }
    if (!Array.isArray(result.value)) {
      throw new StorageBridgeError(command, 'invalid_response', 'Daftar riwayat QC dari database bukan array.');
    }
    return result.value.map((record, index) => mapQCRecord(record, command, index));
  }

  return {
    getMastersFromStorage,
    persistMasterToStorage,
    persistQCRecordToStorage,
    getQCRecordsFromStorage,
  };
}

const defaultBridge = createTauriStorageBridge();

export const getMastersFromStorage = defaultBridge.getMastersFromStorage;
export const persistMasterToStorage = defaultBridge.persistMasterToStorage;
export const persistQCRecordToStorage = defaultBridge.persistQCRecordToStorage;
export const getQCRecordsFromStorage = defaultBridge.getQCRecordsFromStorage;
