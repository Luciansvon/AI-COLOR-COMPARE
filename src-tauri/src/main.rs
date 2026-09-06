// Studio Color Consistency & Material QC System - Windows Desktop Core
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod color_science;
pub mod commands;
pub mod raw_engine;
pub mod storage;
pub mod texture_engine;

use commands::*;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use storage::db::Database;

fn get_db_path() -> PathBuf {
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let dir = PathBuf::from(app_data).join("StudioColorQC");
        let _ = fs::create_dir_all(&dir);
        dir.join("studio_qc.db")
    } else {
        PathBuf::from("studio_qc.db")
    }
}

fn main() {
    let db_path = get_db_path();
    let db = Database::new(&db_path).unwrap_or_else(|_| {
        Database::memory().expect("Gagal menginisialisasi database fallback memory")
    });

    let state = AppState {
        db: Mutex::new(db),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            list_masters_cmd,
            add_master_cmd,
            analyze_roi_cmd,
            analyze_texture_cmd,
            calculate_correction_cmd,
            check_master_consistency_cmd,
            save_qc_record_cmd,
            list_qc_records_cmd,
            export_jpeg_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("Terjadi kesalahan saat menjalankan aplikasi Tauri Studio Color QC");
}
