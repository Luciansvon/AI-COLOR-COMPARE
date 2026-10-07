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

#[cfg(target_os = "android")]
struct AndroidIoState(tauri::plugin::PluginHandle<tauri::Wry>);

fn android_io_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri::plugin::Builder::<tauri::Wry>::new("android_io")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle = api.register_android_plugin("com.studio.colorqc", "AndroidIoPlugin")?;
                app.manage(AndroidIoState(handle));
            }
            #[cfg(not(target_os = "android"))]
            let _ = (app, api);
            Ok(())
        })
        .build()
}

async fn call_android_io(
    app: tauri::AppHandle,
    command: &'static str,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    #[cfg(target_os = "android")]
    {
        return app
            .state::<AndroidIoState>()
            .0
            .run_mobile_plugin_async(command, payload)
            .await
            .map_err(|error| error.to_string());
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, command, payload);
        Err("Penyimpanan native ini hanya tersedia pada Android.".to_string())
    }
}

#[tauri::command]
async fn android_io_begin_export(
    app: tauri::AppHandle,
    file_name: String,
    mime_type: String,
    total_bytes: u64,
) -> Result<serde_json::Value, String> {
    call_android_io(
        app,
        "beginExport",
        serde_json::json!({ "fileName": file_name, "mimeType": mime_type, "totalBytes": total_bytes }),
    )
    .await
}

#[tauri::command]
async fn android_io_append_export_chunk(
    app: tauri::AppHandle,
    export_id: String,
    base64: String,
    offset: u64,
) -> Result<serde_json::Value, String> {
    call_android_io(
        app,
        "appendExportChunk",
        serde_json::json!({ "exportId": export_id, "base64": base64, "offset": offset }),
    )
    .await
}

#[tauri::command]
async fn android_io_save_export(
    app: tauri::AppHandle,
    export_id: String,
) -> Result<serde_json::Value, String> {
    call_android_io(app, "saveExport", serde_json::json!({ "exportId": export_id })).await
}

#[tauri::command]
async fn android_io_abort_export(
    app: tauri::AppHandle,
    export_id: String,
) -> Result<serde_json::Value, String> {
    call_android_io(app, "abortExport", serde_json::json!({ "exportId": export_id })).await
}

#[tauri::command]
async fn android_io_print_report(
    app: tauri::AppHandle,
    html: String,
    job_name: String,
) -> Result<serde_json::Value, String> {
    call_android_io(
        app,
        "printReport",
        serde_json::json!({ "html": html, "jobName": job_name }),
    )
    .await
}

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
        .plugin(android_io_plugin())
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
            android_io_begin_export,
            android_io_append_export_chunk,
            android_io_save_export,
            android_io_abort_export,
            android_io_print_report,
        ])
        .run(tauri::generate_context!())
        .expect("Gagal menjalankan aplikasi Studio Color QC");
}
