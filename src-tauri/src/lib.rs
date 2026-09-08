// Studio Color Consistency & Material QC System - Core Shared Library
// Mendukung Windows Desktop dan Android Mobile

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
use tauri::Manager;

pub fn get_db_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> PathBuf {
    // Pada Android atau sistem modern, gunakan app_data_dir dari Tauri
    if let Ok(app_dir) = app.path().app_data_dir() {
        let _ = fs::create_dir_all(&app_dir);
        return app_dir.join("studio_qc.db");
    }
    // Fallback Windows lama jika app_data_dir tidak tersedia
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let dir = PathBuf::from(app_data).join("StudioColorQC");
        let _ = fs::create_dir_all(&dir);
        dir.join("studio_qc.db")
    } else {
        PathBuf::from("studio_qc.db")
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = get_db_path(app.handle());
            let db = Database::new(&db_path).unwrap_or_else(|err| {
                panic!(
                    "Gagal membuka database persisten di {}: {}. Aplikasi dihentikan agar data QC tidak diam-diam tersimpan hanya di RAM.",
                    db_path.display(),
                    err
                )
            });

            let state = AppState {
                db: Mutex::new(db),
            };
            app.manage(state);
            Ok(())
        })
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
        .expect("Gagal menjalankan aplikasi Studio Color QC");
}
