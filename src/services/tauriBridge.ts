// Jembatan Komunikasi Antara Frontend React dan Core Native Rust (Tauri IPC)

import { invoke } from '@tauri-apps/api/core';
import { MasterIdentity, QCRecord } from '../types';
import { INITIAL_MASTERS } from '../data/initialMasters';

// Deteksi apakah aplikasi berjalan di dalam runtime desktop Tauri
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
};

// Panggil invoke Tauri secara aman dengan fallback
async function invokeTauri<T>(cmd: string, args?: Record<string, any>): Promise<T | null> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<T>(cmd, args);
    } catch (err) {
      console.warn(`[Tauri IPC] Gagal memanggil command ${cmd}:`, err);
      return null;
    }
  }
  return null;
}

/**
 * Mengambil daftar master dari database lokal SQLite via Rust Tauri
 */
export async function getMastersFromStorage(): Promise<MasterIdentity[]> {
  const res = await invokeTauri<any[]>('list_masters_cmd');
  if (res && Array.isArray(res) && res.length > 0) {
    return res.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      category: m.category,
      description: m.description || undefined,
      nominalLab:
        m.nominal_l !== null && m.nominal_a !== null && m.nominal_b !== null
          ? { l: m.nominal_l, a: m.nominal_a, b: m.nominal_b }
          : undefined,
      createdAt: m.created_at,
    }));
  }

  // Fallback ke data bawaan jika di web browser dev
  return INITIAL_MASTERS;
}

/**
 * Menyimpan identitas master baru ke database lokal SQLite
 */
export async function persistMasterToStorage(master: MasterIdentity): Promise<boolean> {
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

  const res = await invokeTauri<void>('add_master_cmd', { master: payload });
  return res !== null;
}

/**
 * Menyimpan catatan riwayat keputusan QC ke database lokal SQLite
 */
export async function persistQCRecordToStorage(record: QCRecord): Promise<boolean> {
  if (!record.finalProductDecision) {
    console.warn('[Storage] QC record ditolak karena keputusan akhir operator belum tersedia.');
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

  const res = await invokeTauri<void>('save_qc_record_cmd', { record: payload });
  return res !== null;
}

/**
 * Membaca riwayat keputusan QC yang tersimpan di database lokal SQLite
 */
export async function getQCRecordsFromStorage(): Promise<QCRecord[]> {
  const res = await invokeTauri<any[]>('list_qc_records_cmd');
  if (res && Array.isArray(res)) {
    return res.map((r) => {
      let meta = {};
      let rois = [];
      let globalCorr = undefined;
      let conflictCheck = undefined;
      let failReasons = [];

      try { meta = JSON.parse(r.metadata_json); } catch (_) {}
      try { rois = JSON.parse(r.rois_json); } catch (_) {}
      try { if (r.global_correction_json) globalCorr = JSON.parse(r.global_correction_json); } catch (_) {}
      try { if (r.conflict_check_json) conflictCheck = JSON.parse(r.conflict_check_json); } catch (_) {}
      try { if (r.fail_reasons_json) failReasons = JSON.parse(r.fail_reasons_json); } catch (_) {}

      return {
        id: r.id,
        sessionId: r.session_id,
        timestamp: r.timestamp,
        productName: r.product_name,
        masterCode: r.master_code,
        sourceImageName: r.source_image_name,
        metadata: meta as any,
        rois: rois,
        globalCorrection: globalCorr,
        conflictCheck: conflictCheck,
        finalProductDecision: {
          decision: r.final_decision as 'PASS' | 'FAIL',
          failReasons: failReasons,
          note: r.operator_note || undefined,
          timestamp: r.timestamp,
        },
      };
    });
  }

  return [];
}
