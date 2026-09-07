use crate::color_science::conflict::{calculate_recommended_correction, CorrectionConflict, CorrectionParams, ROIInput};
use crate::color_science::metrics::{
    check_reference_quality, compare_stats, evaluate_master_consistency, extract_roi_stats,
    EstimatedRecommendation, MeasuredEvidence, PixelDataStats, ReferenceQualityReport,
};
use crate::raw_engine::export::{export_srgb_jpeg, get_safe_export_path};
use crate::storage::db::{Database, MasterRecord, SavedQCRecord};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;
use std::sync::Mutex;
use tauri::State;

use crate::texture_engine::{analyze_roi_texture_and_fusion, ComprehensiveRoiAnalysis};

pub struct AppState {
    pub db: Mutex<Database>,
}

// Batas tetap mencegah alokasi tak terkendali, tetapi mencakup foto kamera umum 24 MP.
// Mesin tekstur membuat beberapa buffer grayscale sehingga 32 MP lebih aman untuk desktop CPU-first.
const MAX_ANALYSIS_PIXELS: usize = 33_554_432;
const MAX_EXPORT_PIXELS: usize = 33_554_432;
const MAX_ROIS_PER_REQUEST: usize = 256;
const MAX_TEXT_LENGTH: usize = 4096;

fn validate_required_text(label: &str, value: &str, max_length: usize) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{} tidak boleh kosong", label));
    }
    if value.chars().count() > max_length {
        return Err(format!("{} terlalu panjang (maksimal {} karakter)", label, max_length));
    }
    Ok(())
}

fn validate_finite(label: &str, value: f64) -> Result<(), String> {
    if value.is_finite() {
        Ok(())
    } else {
        Err(format!("{} harus berupa angka yang valid", label))
    }
}

fn validate_pixel_dimensions(width: u32, height: u32, max_pixels: usize) -> Result<usize, String> {
    if width == 0 || height == 0 {
        return Err("Lebar dan tinggi harus lebih besar dari nol".to_string());
    }

    let pixels = (width as usize)
        .checked_mul(height as usize)
        .ok_or_else(|| "Dimensi terlalu besar".to_string())?;
    if pixels > max_pixels {
        return Err(format!(
            "Dimensi terlalu besar: maksimal {} piksel per permintaan",
            max_pixels
        ));
    }
    Ok(pixels)
}

fn validate_rgba_buffer(label: &str, data: &[u8]) -> Result<(), String> {
    if data.is_empty() {
        return Err(format!("Buffer {} kosong", label));
    }
    if data.len() % 4 != 0 {
        return Err(format!(
            "Buffer {} bukan RGBA8 valid: panjang {} bukan kelipatan 4",
            label,
            data.len()
        ));
    }
    if data.len() / 4 > MAX_ANALYSIS_PIXELS {
        return Err(format!(
            "Buffer {} terlalu besar: maksimal {} piksel",
            label, MAX_ANALYSIS_PIXELS
        ));
    }
    Ok(())
}

fn resolve_analysis_dimensions(payload: &AnalyzeRoiInput) -> Result<(usize, usize), String> {
    validate_rgba_buffer("master", &payload.master_rgba)?;
    validate_rgba_buffer("produk", &payload.product_rgba)?;

    if payload.master_rgba.len() != payload.product_rgba.len() {
        return Err(format!(
            "Ukuran buffer master ({}) dan produk ({}) harus sama untuk analisis berpasangan",
            payload.master_rgba.len(),
            payload.product_rgba.len()
        ));
    }

    match (payload.width, payload.height) {
        (Some(width), Some(height)) => {
            let pixel_count = validate_pixel_dimensions(width, height, MAX_ANALYSIS_PIXELS)?;

            let expected_len = pixel_count
                .checked_mul(4)
                .ok_or_else(|| "Dimensi ROI terlalu besar".to_string())?;

            if payload.master_rgba.len() != expected_len {
                return Err(format!(
                    "Dimensi {}x{} membutuhkan {} byte RGBA, tetapi menerima {} byte",
                    width,
                    height,
                    expected_len,
                    payload.master_rgba.len()
                ));
            }

            Ok((width as usize, height as usize))
        }
        (None, None) => {
            let pixel_count = payload.master_rgba.len() / 4;
            if pixel_count > MAX_ANALYSIS_PIXELS {
                return Err(format!(
                    "ROI terlalu besar: maksimal {} piksel",
                    MAX_ANALYSIS_PIXELS
                ));
            }
            let side = (pixel_count as f64).sqrt() as usize;
            if side.checked_mul(side) != Some(pixel_count) {
                return Err(
                    "width dan height wajib diberikan untuk ROI yang bukan persegi".to_string(),
                );
            }
            Ok((side, side))
        }
        _ => Err("width dan height harus diberikan bersama-sama".to_string()),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeRoiInput {
    pub master_rgba: Vec<u8>,
    pub product_rgba: Vec<u8>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeRoiOutput {
    pub master_stats: PixelDataStats,
    pub product_stats: PixelDataStats,
    pub measured: MeasuredEvidence,
    pub estimated: EstimatedRecommendation,
    pub master_quality: ReferenceQualityReport,
    pub texture_analysis: Option<ComprehensiveRoiAnalysis>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ROIItemPayload {
    pub id: String,
    pub name: String,
    pub role: String,
    pub measured: Option<MeasuredEvidence>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MasterConsistencyOutput {
    pub is_consistent: bool,
    pub delta_e00: f64,
    pub warning: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportJpegPayload {
    pub output_directory: String,
    pub base_filename: String,
    pub rgb_pixels: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub quality: Option<u8>,
}

fn validate_master_payload(master: &MasterRecord) -> Result<(), String> {
    validate_required_text("ID master", &master.id, MAX_TEXT_LENGTH)?;
    validate_required_text("Kode master", &master.code, MAX_TEXT_LENGTH)?;
    validate_required_text("Nama master", &master.name, MAX_TEXT_LENGTH)?;
    validate_required_text("Kategori master", &master.category, 64)?;
    validate_required_text("Waktu pembuatan master", &master.created_at, MAX_TEXT_LENGTH)?;

    for (label, value) in [
        ("nominal_l", master.nominal_l),
        ("nominal_a", master.nominal_a),
        ("nominal_b", master.nominal_b),
    ] {
        if let Some(value) = value {
            validate_finite(label, value)?;
        }
    }
    Ok(())
}

fn parse_json_field(label: &str, value: &str) -> Result<Value, String> {
    let parsed: Value = serde_json::from_str(value)
        .map_err(|err| format!("{} bukan JSON valid: {}", label, err))?;
    Ok(parsed)
}

fn validate_qc_payload(record: &SavedQCRecord) -> Result<(), String> {
    validate_required_text("ID riwayat QC", &record.id, MAX_TEXT_LENGTH)?;
    validate_required_text("ID sesi", &record.session_id, MAX_TEXT_LENGTH)?;
    validate_required_text("Waktu riwayat QC", &record.timestamp, MAX_TEXT_LENGTH)?;
    validate_required_text("Nama produk", &record.product_name, MAX_TEXT_LENGTH)?;
    validate_required_text("Kode master", &record.master_code, MAX_TEXT_LENGTH)?;
    validate_required_text("Nama berkas sumber", &record.source_image_name, MAX_TEXT_LENGTH)?;

    if record.final_decision != "PASS" && record.final_decision != "FAIL" {
        return Err("Keputusan akhir QC harus PASS atau FAIL".to_string());
    }
    let metadata = parse_json_field("metadata_json", &record.metadata_json)?;
    if !metadata.is_object() {
        return Err("metadata_json memiliki bentuk JSON yang tidak sesuai".to_string());
    }

    let rois = parse_json_field("rois_json", &record.rois_json)?;
    let Some(rois) = rois.as_array() else {
        return Err("rois_json memiliki bentuk JSON yang tidak sesuai".to_string());
    };
    if rois.iter().any(|item| {
        item.as_object()
            .and_then(|object| object.get("roi"))
            .and_then(Value::as_object)
            .is_none()
    }) {
        return Err("rois_json memiliki item ROI yang tidak sesuai".to_string());
    }

    if let Some(value) = record.global_correction_json.as_deref() {
        if !parse_json_field("global_correction_json", value)?.is_object() {
            return Err("global_correction_json memiliki bentuk JSON yang tidak sesuai".to_string());
        }
    }
    if let Some(value) = record.conflict_check_json.as_deref() {
        if !parse_json_field("conflict_check_json", value)?.is_object() {
            return Err("conflict_check_json memiliki bentuk JSON yang tidak sesuai".to_string());
        }
    }
    if let Some(value) = record.fail_reasons_json.as_deref() {
        let fail_reasons = parse_json_field("fail_reasons_json", value)?;
        let Some(fail_reasons) = fail_reasons.as_array() else {
            return Err("fail_reasons_json memiliki bentuk JSON yang tidak sesuai".to_string());
        };
        if fail_reasons.iter().any(|reason| !reason.is_string()) {
            return Err("fail_reasons_json harus berisi teks".to_string());
        }
    }
    Ok(())
}

fn validate_measured_evidence(measured: &MeasuredEvidence) -> Result<(), String> {
    for (label, value) in [
        ("delta_e00", measured.delta_e00),
        ("delta_l", measured.delta_l),
        ("delta_a", measured.delta_a),
        ("delta_b", measured.delta_b),
        ("master_brightness", measured.master_brightness),
        ("product_brightness", measured.product_brightness),
        ("brightness_diff_percent", measured.brightness_diff_percent),
        ("contrast_diff_percent", measured.contrast_diff_percent),
        ("saturation_diff_percent", measured.saturation_diff_percent),
    ] {
        validate_finite(label, value)?;
    }
    Ok(())
}

fn validate_roi_payloads(rois: &[ROIItemPayload]) -> Result<(), String> {
    if rois.len() > MAX_ROIS_PER_REQUEST {
        return Err(format!(
            "Jumlah ROI terlalu banyak: maksimal {} ROI",
            MAX_ROIS_PER_REQUEST
        ));
    }
    for roi in rois {
        validate_required_text("ID ROI", &roi.id, MAX_TEXT_LENGTH)?;
        validate_required_text("Nama ROI", &roi.name, MAX_TEXT_LENGTH)?;
        if roi.role != "master_backed" && roi.role != "guardrail_only" {
            return Err(format!("Peran ROI {} tidak dikenal", roi.id));
        }
        if let Some(measured) = roi.measured.as_ref() {
            validate_measured_evidence(measured)?;
        }
    }
    Ok(())
}

// ---------------- TAURI COMMANDS ----------------

#[tauri::command]
pub fn list_masters_cmd(state: State<AppState>) -> Result<Vec<MasterRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_masters().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_master_cmd(state: State<AppState>, master: MasterRecord) -> Result<(), String> {
    validate_master_payload(&master)?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.insert_master(&master).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn analyze_roi_cmd(payload: AnalyzeRoiInput) -> Result<AnalyzeRoiOutput, String> {
    let (w, h) = resolve_analysis_dimensions(&payload)?;
    let master_stats = extract_roi_stats(&payload.master_rgba);
    let product_stats = extract_roi_stats(&payload.product_rgba);

    let master_quality = check_reference_quality(&master_stats);
    let (measured, mut estimated) = compare_stats(&master_stats, &product_stats);

    if master_quality.confidence_penalty {
        estimated.confidence = "Rendah".to_string();
        estimated.explanation.push_str(" (Perhatian: Kualitas foto master panel memiliki peringatan teknis).");
    }

    let texture_analysis = if w >= 4 && h >= 4 {
        Some(analyze_roi_texture_and_fusion(
            &payload.master_rgba,
            &payload.product_rgba,
            w,
            h,
            &measured,
        ))
    } else {
        None
    };

    Ok(AnalyzeRoiOutput {
        master_stats,
        product_stats,
        measured,
        estimated,
        master_quality,
        texture_analysis,
    })
}

#[tauri::command]
pub fn analyze_texture_cmd(payload: AnalyzeRoiInput) -> Result<ComprehensiveRoiAnalysis, String> {
    let (w, h) = resolve_analysis_dimensions(&payload)?;

    if w < 4 || h < 4 {
        return Err("Ukuran ROI terlalu kecil untuk analisis tekstur (minimal 4x4 piksel)".to_string());
    }

    let master_stats = extract_roi_stats(&payload.master_rgba);
    let product_stats = extract_roi_stats(&payload.product_rgba);
    let (measured, _) = compare_stats(&master_stats, &product_stats);

    Ok(analyze_roi_texture_and_fusion(
        &payload.master_rgba,
        &payload.product_rgba,
        w,
        h,
        &measured,
    ))
}

#[tauri::command]
pub fn calculate_correction_cmd(
    rois: Vec<ROIItemPayload>,
) -> Result<(CorrectionParams, CorrectionConflict), String> {
    validate_roi_payloads(&rois)?;
    let inputs: Vec<ROIInput> = rois
        .iter()
        .map(|r| ROIInput {
            id: &r.id,
            name: &r.name,
            role: &r.role,
            measured: r.measured.as_ref(),
        })
        .collect();

    Ok(calculate_recommended_correction(&inputs))
}

#[tauri::command]
pub fn check_master_consistency_cmd(
    in_frame_rgba: Vec<u8>,
    separate_rgba: Vec<u8>,
) -> Result<MasterConsistencyOutput, String> {
    validate_rgba_buffer("master in-frame", &in_frame_rgba)?;
    validate_rgba_buffer("master terpisah", &separate_rgba)?;
    let in_frame_stats = extract_roi_stats(&in_frame_rgba);
    let separate_stats = extract_roi_stats(&separate_rgba);

    let (is_consistent, delta_e00, warning) =
        evaluate_master_consistency(&in_frame_stats, &separate_stats);

    Ok(MasterConsistencyOutput {
        is_consistent,
        delta_e00,
        warning,
    })
}

#[tauri::command]
pub fn save_qc_record_cmd(state: State<AppState>, record: SavedQCRecord) -> Result<(), String> {
    validate_qc_payload(&record)?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.insert_qc_record(&record).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_qc_records_cmd(state: State<AppState>) -> Result<Vec<SavedQCRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_qc_records().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_jpeg_cmd(payload: ExportJpegPayload) -> Result<String, String> {
    let pixel_count = validate_pixel_dimensions(payload.width, payload.height, MAX_EXPORT_PIXELS)?;
    let expected_len = pixel_count
        .checked_mul(3)
        .ok_or_else(|| "Dimensi ekspor terlalu besar".to_string())?;
    if payload.rgb_pixels.len() != expected_len {
        return Err(format!(
            "Buffer RGB tidak cocok dengan dimensi: butuh {} byte, menerima {}",
            expected_len,
            payload.rgb_pixels.len()
        ));
    }
    if payload.base_filename.trim().is_empty() {
        return Err("Nama file ekspor tidak boleh kosong".to_string());
    }

    let dir = Path::new(&payload.output_directory);
    let safe_path = get_safe_export_path(dir, &payload.base_filename, "jpg");

    let quality = payload.quality.unwrap_or(95).clamp(1, 100);
    let exported_path = export_srgb_jpeg(
        &safe_path,
        &payload.rgb_pixels,
        payload.width,
        payload.height,
        quality,
    )
    .map_err(|e| format!("{:?}", e))?;

    Ok(exported_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_master() -> MasterRecord {
        MasterRecord {
            id: "master-test".to_string(),
            code: "TEST-01".to_string(),
            name: "Master Uji".to_string(),
            category: "wood".to_string(),
            description: None,
            nominal_l: Some(40.0),
            nominal_a: Some(8.0),
            nominal_b: Some(14.0),
            created_at: "2026-09-07T00:00:00Z".to_string(),
        }
    }

    fn valid_qc_record() -> SavedQCRecord {
        SavedQCRecord {
            id: "qc-test".to_string(),
            session_id: "session-test".to_string(),
            timestamp: "2026-09-07T00:00:00Z".to_string(),
            product_name: "Produk Uji".to_string(),
            master_code: "TEST-01".to_string(),
            source_image_name: "produk.jpg".to_string(),
            metadata_json: "{}".to_string(),
            rois_json: "[]".to_string(),
            global_correction_json: None,
            conflict_check_json: None,
            final_decision: "PASS".to_string(),
            fail_reasons_json: None,
            operator_note: None,
        }
    }

    #[test]
    fn test_validation_rejects_oversized_dimensions_before_buffer_work() {
        let result = validate_pixel_dimensions(6000, 6000, MAX_ANALYSIS_PIXELS);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("maksimal"));
    }

    #[test]
    fn test_validation_rejects_invalid_persisted_payloads() {
        let mut master = valid_master();
        master.nominal_l = Some(f64::NAN);
        assert!(validate_master_payload(&master).is_err());

        let mut record = valid_qc_record();
        record.final_decision = "UNKNOWN".to_string();
        assert!(validate_qc_payload(&record).is_err());

        record = valid_qc_record();
        record.rois_json = "{rusak".to_string();
        assert!(validate_qc_payload(&record).is_err());

        record = valid_qc_record();
        record.rois_json = "[null]".to_string();
        assert!(validate_qc_payload(&record).is_err());

        record = valid_qc_record();
        record.fail_reasons_json = Some("[null]".to_string());
        assert!(validate_qc_payload(&record).is_err());
    }

    #[test]
    fn test_validation_rejects_invalid_roi_role_and_non_finite_measurement() {
        let mut rois = vec![ROIItemPayload {
            id: "roi-1".to_string(),
            name: "Area uji".to_string(),
            role: "role-tidak-dikenal".to_string(),
            measured: None,
        }];
        assert!(validate_roi_payloads(&rois).is_err());

        rois[0].role = "master_backed".to_string();
        rois[0].measured = Some(MeasuredEvidence {
            delta_e00: f64::INFINITY,
            delta_l: 0.0,
            delta_a: 0.0,
            delta_b: 0.0,
            master_brightness: 1.0,
            product_brightness: 1.0,
            brightness_diff_percent: 0.0,
            contrast_diff_percent: 0.0,
            saturation_diff_percent: 0.0,
            shadow_clipped: false,
            highlight_clipped: false,
        });
        assert!(validate_roi_payloads(&rois).is_err());
    }
}
