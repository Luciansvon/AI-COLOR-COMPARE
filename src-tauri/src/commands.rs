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
    let master_stats = extract_roi_stats(&payload.master_rgba);
    let product_stats = extract_roi_stats(&payload.product_rgba);

    let master_quality = check_reference_quality(&master_stats);
    let (measured, mut estimated) = compare_stats(&master_stats, &product_stats);

    if master_quality.confidence_penalty {
        estimated.confidence = "Rendah".to_string();
        estimated.explanation.push_str(" (Perhatian: Kualitas foto master panel memiliki peringatan teknis).");
    }

    let (w, h) = if let (Some(w), Some(h)) = (payload.width, payload.height) {
        (w as usize, h as usize)
    } else {
        let count = payload.master_rgba.len() / 4;
        let side = (count as f64).sqrt().round() as usize;
        (side, side)
    };

    let texture_analysis = if w >= 4 && h >= 4 && payload.master_rgba.len() >= w * h * 4 && payload.product_rgba.len() >= w * h * 4 {
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
    let (w, h) = if let (Some(w), Some(h)) = (payload.width, payload.height) {
        (w as usize, h as usize)
    } else {
        let count = payload.master_rgba.len() / 4;
        let side = (count as f64).sqrt().round() as usize;
        (side, side)
    };

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
    let dir = Path::new(&payload.output_directory);
    let safe_path = get_safe_export_path(dir, &payload.base_filename, "jpg");

    let quality = payload.quality.unwrap_or(95);
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
