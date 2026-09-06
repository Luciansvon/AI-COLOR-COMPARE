// Studio Color Consistency & Material QC System - Windows Desktop Core
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Terjadi kesalahan saat menjalankan aplikasi Tauri Studio Color QC");
}
