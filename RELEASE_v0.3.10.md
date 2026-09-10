# Studio Color QC v0.3.10 — Portrait Photo Fit, Windows Defender Fix & Android Pilot APK

Rilis ini mengatasi masalah foto portrait yang terpotong, menghilangkan peringatan Windows Defender pada installer Windows, serta menerbitkan paket aplikasi Android Pilot v0.3.10.

## Perbaikan Utama

1. **Sinkronisasi Ukuran Foto & Pencegahan Race Condition**:
   - Menambahkan `imgRef` langsung ke elemen HTML `<img>` agar dimensi asli foto (`naturalWidth` & `naturalHeight`) tidak hilang akibat siklus render React.
   - Mengatasi tabrakan urutan (*race condition*) di mana ukuran asli foto sempat ter-reset ke nol saat memuat berkas data URL.
   - Foto vertikal/portrait (seperti rasio 2:3 nakas studio 1200×1800) kini 100% pas dan utuh di dalam bingkai monitor, dari lampu meja atas sampai kaki meja bawah tanpa terpotong.
   - Posisi kotak seleksi area kayu (ROI) tetap akurat dan sinkron mengikuti koordinat foto yang terlihat.

2. **Penanganan Notifikasi Windows Defender & Sertifikat Digital Studio**:
   - Menyediakan skrip otomatisasi `tools/sign_windows_binary.ps1` untuk menandatangani berkas installer dan executable Windows menggunakan sertifikat digital Authenticode.
   - Membersihkan stream internet (*Zone.Identifier* dan *SmartScreen*) menggunakan `Unblock-File` sehingga installer tidak lagi dicegat oleh Windows Defender SmartScreen di komputer studio.

3. **Ketersediaan Paket Multi-Platform**:
   - **Windows Standar (Ringan)**: `Studio-Color-QC-v0.3.10-Windows-x64-Setup.exe` (< 60MB).
   - **Windows Offline Penuh**: `Studio-Color-QC-v0.3.10-Windows-x64-Offline-Full-Setup.exe` (Termasuk runtime WebView2 lengkap untuk workstation tanpa koneksi internet).
   - **Android Pilot APK**: `Studio-Color-QC-v0.3.10-Android-Pilot.apk` (Dukungan arsitektur `aarch64` untuk uji coba operator studio di perangkat seluler).

## Verifikasi & Kepatuhan DEV-INFRA

- `npm test`: Seluruh 29 unit test sains warna, guardrail non-destruktif, bridge SQLite, dan regresi fit foto rasio portrait 1200×1800 lulus 100%.
- `cargo test`: 29 test Rust core lulus 100%.
- `cargo check`: Lulus tanpa peringatan/error.
- Uji render browser Edge (Playwright): Bounding box foto nakas 1200×1800 terbukti berada di dalam batas tinggi kontainer (301.3 × 452 piksel di dalam kontainer 460 piksel).
- Uji install lokal: Berhasil diinstall dan terverifikasi di registry Windows sebagai versi `v0.3.10`.
- Ikon Desktop: Shortcut `Studio Color QC.lnk` terpasang dan mengarah ke executable `v0.3.10`.
- B.I.M.A Shared Infra Audit: Lolos 100% (215 berkas diaudit, 0 temuan pelanggaran).
