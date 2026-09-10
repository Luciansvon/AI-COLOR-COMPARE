# Studio Color Consistency & Material QC System

<div align="center">
  <img src="public/app-icon.png" width="128" height="128" alt="Studio Color QC Logo" />
  <p><strong>Windows desktop QC untuk membandingkan warna dan material furnitur terhadap physical master.</strong></p>
  <p><em>Local-first • CPU-first • Operator tetap memegang keputusan PASS/FAIL</em></p>
</div>

---

## 📦 Status Release v0.3.10

**v0.3.10 memuat perbaikan tampilan foto portrait utuh (tanpa crop), sertifikat digital Windows Authenticode, dan paket Android Pilot APK.**

Perbaikan utama:
- **Viewer Foto Pas Utuh**: Foto berorientasi portrait (seperti rasio 2:3 nakas studio 1200×1800) tampil pas 100% di dalam layar tanpa terpotong ujung atas dan bawahnya.
- **Sertifikat Digital Studio**: Skrip `tools/sign_windows_binary.ps1` dan pembersihan stream internet menghilangkan peringatan Windows Defender SmartScreen.
- **Dukungan Multi-Platform**: Menyediakan installer Windows (standar dan offline full) serta paket APK Android Pilot v0.3.10.

Audit lengkap: [`docs/audits/RELEASE_AUDIT_v0.3.10.md`](docs/audits/RELEASE_AUDIT_v0.3.10.md)

Release notes: [`RELEASE_v0.3.10.md`](RELEASE_v0.3.10.md)

---

## 📦 Paket Instalasi v0.3.10

Release menyediakan tiga paket instalasi:

| Paket | Platform | Ukuran | Kapan dipakai |
|---|---|---:|---|
| `Studio-Color-QC-v0.3.10-Windows-x64-Setup.exe` | Windows x64 | ~5.3 MiB | PC online atau PC yang sudah memiliki WebView2 Runtime. |
| `Studio-Color-QC-v0.3.10-Windows-x64-Offline-Full-Setup.exe` | Windows x64 | ~255 MiB | PC studio workstation tanpa koneksi internet. WebView2 Runtime dibundel offline. |
| `Studio-Color-QC-v0.3.10-Android-Pilot.apk` | Android aarch64 | ~160 MiB | Perangkat seluler Android operator studio. |

Keduanya memakai NSIS `currentUser`, product name `Studio Color QC`, identifier `com.studio.colorqc`, dan versi baru menimpa instalasi lama secara bersih di lokasi yang sama.

---

## 🎯 Fungsi Utama

Studio Color QC bukan aplikasi untuk mempercantik foto. Sistem membantu operator menentukan apakah perbedaan yang terlihat kemungkinan berasal dari material/finishing atau dari kondisi capture seperti exposure, white balance, lighting, reflection, dan kamera.

Alur utamanya:

1. Pilih foto master / physical master reference.
2. Pilih foto produk.
3. Tentukan ROI material yang sebanding.
4. Sistem menghitung evidence warna dan material.
5. Operator membaca diagnosis dan rekomendasi.
6. Keputusan akhir **PASS/FAIL tetap di tangan operator**.

Evidence utama:

- Lab dan CIEDE2000 (ΔE00);
- brightness, contrast, saturation;
- clipping highlight/shadow;
- arah pergeseran RGB;
- texture / grain evidence;
- konflik antar-ROI;
- guardrail area tanpa master.

---

## 🎨 Analisis RGB untuk Operator Studio

Mulai v0.3.3, hasil QC menerjemahkan pergeseran RGB menjadi bahasa sederhana:

- **Warna Seimbang**
- **Sedikit / Cenderung Kemerahan**
- **Sedikit / Cenderung Kehijauan**
- **Sedikit / Cenderung Kebiruan**

Sistem tidak membandingkan angka R, G, dan B mentah karena kayu coklat secara alami memiliki kanal merah lebih tinggi. Yang dibandingkan adalah **proporsi RGB produk terhadap master fisik pada ROI yang sama**, lalu arahnya divalidasi dengan sumbu Lab.

Untuk kamera studio **Canon EOS 80D**, aplikasi memberi arah koreksi White Balance Correction yang mudah dibaca seperti **B (Blue)**, **A (Amber)**, **G (Green)**, atau **M (Magenta)**. Sistem menyarankan perubahan secara konservatif dan operator tetap melakukan foto ulang untuk verifikasi.

Dokumentasi: [`RGB_ANALYSIS.md`](RGB_ANALYSIS.md)

---

## 🪵 Analisis Permukaan & Serat

v0.3.8 menambahkan klasifikasi `smooth`, `textured`, dan `mixed` untuk mencegah noise kamera pada bidang polos dianggap sebagai serat kayu.

Namun real-world test menemukan sisi sebaliknya: threshold smooth saat ini dapat terlalu agresif pada serat tipis, low-contrast, soft-light, atau sedikit blur. Karena itu:

- `smooth` pada v0.3.8 **belum boleh dianggap production-trusted**;
- `textured` harus diverifikasi dengan foto nyata;
- hasil yang ambigu sebaiknya diperlakukan sebagai **belum pasti**, bukan otomatis mulus;
- release berikutnya harus menambah regression fixture serat jelas + serat tipis/low-contrast + kondisi terang/gelap/soft-light.

---

## 🛡️ Guardrail QC

Sistem sengaja membatasi kesimpulan agar operator tidak mendapat diagnosis yang lebih pasti daripada evidence yang tersedia.

- Pergeseran chromatic besar tidak otomatis divonis masalah material/finishing.
- Highlight clipping dideteksi per kanal RGB.
- ΔE00 adalah ambang internal aplikasi, bukan toleransi universal semua material/proyek.
- Diagnosis yang belum cukup bukti harus tampil sebagai **Belum Pasti**.
- RGB bukan penentu PASS/FAIL tunggal.
- File kamera asli tidak pernah ditimpa.
- Konflik antar-ROI membatalkan koreksi otomatis.
- Guardrail area tanpa master mencegah exposure global merusak area lain.

---

## 📦 Ekspor Batch

Satu foto acuan dapat dipakai sebagai basis koreksi untuk foto lain dari produk dan pencahayaan yang sama.

1. Masukkan master dan foto produk, lalu tekan **Bandingkan Sekarang**.
2. Terapkan saran atau atur slider dan periksa **Preview Koreksi**.
3. Pada **Pakai Koreksi Ini ke Foto Lain**, pilih foto tambahan.
4. Tekan **Ekspor Acuan + ... Foto ke ZIP**.

Semua foto memakai salinan parameter slider saat ekspor dimulai. Tidak ada perhitungan saran otomatis baru per foto. ZIP berisi JPEG dan `koreksi-batch.json`.

Batas batch:

- maksimal 50 foto termasuk acuan;
- total input maksimal 200 MB;
- total hasil JPEG maksimal 200 MB;
- format JPG, PNG, WebP;
- proses lokal, tanpa upload ke server.

Setelan sama tidak menjamin warna akhir identik jika lighting atau exposure tiap foto berbeda.

Audit batch: [`AUDIT_BATCH_2026-09-08.md`](AUDIT_BATCH_2026-09-08.md)

---

## 🧪 Menjalankan Test

```bash
npm test
npx tsx tests/rgb_analysis.test.ts
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Sebelum release Windows, workflow juga:

- build frontend;
- menjalankan test TypeScript;
- menjalankan test Rust;
- build installer NSIS standar;
- menguji upgrade-in-place dari versi sebelumnya;
- build installer Offline Full;
- publish GitHub Release.

**CI hijau tidak menggantikan manual test foto studio nyata.** v0.3.8 menunjukkan bahwa regression test synthetic saja belum cukup untuk memvalidasi klasifikasi texture pada kondisi studio sebenarnya.

---

## 💻 Development

### Browser preview

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

### Tauri desktop

```bash
npm run desktop:dev
```

### Production build

```bash
npm run build
npm run desktop:build
```

---

## 🧱 Stack

- React
- TypeScript
- Vite
- Tauri 2
- Rust
- SQLite
- Local-first / CPU-first

Target utama adalah PC studio kelas kantor, termasuk sistem dengan **8 GB RAM tanpa dedicated GPU**.

---

## ✅ Prinsip Produk

1. **Physical Master adalah acuan utama.**
2. **Operator memegang keputusan akhir PASS/FAIL.**
3. **Evidence tidak boleh dikarang atau dilebih-lebihkan.**
4. **File asli kamera bersifat non-destructive.**
5. **Diagnosis warna dan texture harus dapat diuji ulang.**
6. **Jika bukti lemah atau konflik, sistem harus memilih `Belum Pasti` daripada pura-pura yakin.**
7. **Real-photo regression adalah gate wajib sebelum menyatakan algoritme texture production-ready.**
