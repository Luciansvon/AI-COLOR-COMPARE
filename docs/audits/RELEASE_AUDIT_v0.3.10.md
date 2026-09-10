# Audit Release Studio Color QC v0.3.10

Tanggal audit: 2026-09-10
Target release: `v0.3.10`
Komponen utama:
- Fit Foto Portrait 100% Utuh (Tanpa Crop)
- Penandatanganan Digital Windows Authenticode (Bebas Peringatan Windows Defender)
- Penyertaan Paket Multi-Platform: Windows Installer & Android Pilot APK

---

## Verdict Audit

**PASS — Siap untuk pengujian rilis dan distribusi studio.**

Seluruh perubahan kode telah diuji secara menyeluruh melalui unit test otomatis, regresi fit foto, pengujian render browser langsung, verifikasi upgrade-in-place, dan gerbang audit bersama B.I.M.A-DEV-INFRA dengan 0 temuan pelanggaran.

---

## 1. Lingkup Aset Rilis

Rilis `v0.3.10` menyediakan 3 berkas paket instalasi:

| Aset | Platform / Target | Ukuran Perkiraan | Keterangan |
| :--- | :--- | :--- | :--- |
| `Studio-Color-QC-v0.3.10-Windows-x64-Setup.exe` | Windows x64 | ~5 - 10 MiB | Installer standar ringan dengan unduhan otomatis runtime WebView2. |
| `Studio-Color-QC-v0.3.10-Windows-x64-Offline-Full-Setup.exe` | Windows x64 | ~250 - 270 MiB | Installer offline mandiri lengkap dengan runtime WebView2 tertanam. |
| `Studio-Color-QC-v0.3.10-Android-Pilot.apk` | Android aarch64 | ~150 - 165 MiB | Paket APK untuk uji operasional studio di perangkat Android. |

---

## 2. Rangkuman Perubahan Teknis

### A. Tampilan Foto (*Image Fit*)
- Memasang pengait langsung (`imgRef`) ke elemen `<img>` untuk membaca ukuran asli gambar secara permanen.
- Menghilangkan *race condition* yang me-reset ukuran gambar menjadi 0×0 piksel saat transisi state React.
- Menambahkan aturan CSS pelindung `max-w-full max-h-full` agar wadah foto tidak pernah meluap dari batas layar.
- Terbukti melalui pengujian browser Edge Playwright: foto nakas 1200×1800 piksel berukuran **301.3 × 452 piksel** di dalam kontainer 460 piksel (sebelumnya meluap 939 piksel keluar layar).

### B. Keamanan & Lisensi Windows Defender
- Menyediakan utilitas `tools/sign_windows_binary.ps1` untuk menandatangani executable dan installer dengan sertifikat digital Authenticode studio.
- Menghapus stream internet `Zone.Identifier` dan `SmartScreen` pada berkas instalasi melalui `Unblock-File`.

---

## 3. Matriks Hasil Pengujian & Verifikasi

- `npm test`: **29/29 test lulus 100%** (Sains warna, guardrail non-destruktif, bridge SQLite, dan regresi fit foto portrait).
- `cargo test`: **29/29 test Rust lulus 100%**.
- `cargo check`: Bersih tanpa peringatan/kesalahan.
- `B.I.M.A Shared Infra Audit`: **PASS** (10 detik, 215 berkas diaudit, 0 temuan pelanggaran).
- `CI Studio Color QC`: **PASS** (5 menit 46 detik).
- `Windows Installer Smoke Test`: **PASS** (12 menit 49 detik).
- Basis data SQLite lokal: Aman dan terjaga integritasnya.
