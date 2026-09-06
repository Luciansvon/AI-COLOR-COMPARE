use crate::color_science::conflict::{calculate_recommended_correction, CorrectionConflict, CorrectionParams, ROIInput};
use crate::color_science::metrics::{
    check_reference_quality, compare_stats, evaluate_master_consistency, extract_roi_stats,
    EstimatedRecommendation, MeasuredEvidence, PixelDataStats, ReferenceQualityReport,
};
use crate::raw_engine::export::{export_srgb_jpeg, get_safe_export_path};
use crate::storage::db::{Database, MasterRecord, SavedQCRecord};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use tauri::State;

use crate::texture_engine::{analyze_roi_texture_and_fusion, ComprehensiveRoiAnalysis};

pub struct AppState {
    pub db: Mutex<Database>,
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
            if width == 0 || height == 0 {
                return Err("Lebar dan tinggi ROI harus lebih besar dari nol".to_string());
            }

            let expected_len = (width as usize)
                .checked_mul(height as usize)
                .and_then(|pixels| pixels.checked_mul(4))
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

// ---------------- TAURI COMMANDS ----------------

#[tauri::command]
pub fn list_masters_cmd(state: State<AppState>) -> Result<Vec<MasterRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_masters().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_master_cmd(state: State<AppState>, master: MasterRecord) -> Result<(), String> {
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
    if payload.width == 0 || payload.height == 0 {
        return Err("Dimensi ekspor harus lebih besar dari nol".to_string());
    }
    let expected_len = (payload.width as usize)
        .checked_mul(payload.height as usize)
        .and_then(|pixels| pixels.checked_mul(3))
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
