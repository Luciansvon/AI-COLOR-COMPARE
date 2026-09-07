# Studio Color Consistency & Material QC System

<div align="center">
  <img src="public/app-icon.png" width="128" height="128" alt="Studio Color QC Logo" />
  <p><strong>Aplikasi Desktop Windows untuk Konsistensi Warna & Kontrol Kualitas Material Furnitur Studio</strong></p>
  <p><em>Repositori Resmi: <a href="https://github.com/Luciansvon/AI-COLOR-COMPARE">Luciansvon/AI-COLOR-COMPARE</a></em></p>
</div>

---

## 🎨 Analisis RGB untuk Operator Studio

Mulai v0.3.3, hasil QC menerjemahkan pergeseran RGB menjadi bahasa sederhana untuk operator:

- **Warna Seimbang**
- **Sedikit / Cenderung Kemerahan**
- **Sedikit / Cenderung Kehijauan**
- **Sedikit / Cenderung Kebiruan**

Sistem tidak membandingkan angka R, G, dan B mentah karena kayu coklat memang secara alami memiliki kanal merah lebih tinggi. Yang dibandingkan adalah **proporsi RGB produk terhadap master fisik pada ROI yang sama**, lalu arah warnanya divalidasi lagi dengan sumbu Lab.

Untuk kamera studio **Canon EOS 80D**, aplikasi memberi arah koreksi White Balance Correction yang mudah dibaca, misalnya **B (Blue)**, **A (Amber)**, **G (Green)**, atau **M (Magenta)**. Sistem hanya menyarankan mulai dari 1 langkah lalu foto ulang dan bandingkan lagi; jumlah langkah tidak ditebak dari angka Lab.

Dokumentasi lengkap: [RGB_ANALYSIS.md](RGB_ANALYSIS.md)

---

## 🔄 Instalasi & Pembaruan Windows

Rilis Windows memakai installer **NSIS current-user** dengan identitas aplikasi tetap:

- Product name: `Studio Color QC`
- Identifier: `com.studio.colorqc`
- Install mode: `currentUser`

Saat installer versi baru dijalankan di PC yang sudah memiliki Studio Color QC, instalasi lama **di-upgrade / ditimpa di lokasi aplikasi yang sama**, bukan membuat aplikasi kedua. Downgrade ke versi lebih lama juga diblokir.

> Catatan: rilis lama berbentuk executable portable tidak dihitung sebagai instalasi Windows. Upgrade-in-place berlaku untuk jalur installer NSIS mulai v0.3.2 dan seterusnya.

---

## 💡 Cara Menjalankan Aplikasi

### Mode 1: Pratinjau Web Cepat (Browser)
Sangat praktis untuk mencoba tampilan dan simulasi langsung di peramban:
```bash
npm run dev
```
Buka di browser: `http://localhost:3000`

### Mode 2: Aplikasi Desktop Asli Windows (Tauri 2)
Menjalankan aplikasi dalam jendela native Windows terintegrasi dengan backend Rust dan database SQLite:
```bash
npm run desktop:dev
```

---

## 🧪 Pengujian Kualitas & Sains Warna Otomatis

Untuk memverifikasi keakuratan rumus warna CIEDE2000, pendeteksi konflik koreksi, database SQLite, pengamanan berkas, dan diagnosis RGB:
```bash
# Uji Sains Warna & Integritas File
npm test

# Uji khusus analisis RGB
npx tsx tests/rgb_analysis.test.ts

# Uji Native Core Rust & Database SQLite
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## 🛡️ Prinsip Keamanan & Desain Produk

1. **Physical Master adalah Acuan Utama**: Sistem membandingkan foto produk terhadap sampel master fisik kayu yang dipilih secara manual oleh operator.
2. **Otoritas Mutlak Operator**: Keputusan Lolos (**PASS**) atau Gagal (**FAIL**) sepenuhnya berada di tangan operator studio.
3. **Keaslian File 100% Terjaga (Non-Destructive)**: Berkas asli kamera tidak pernah ditimpa atau diubah.
4. **Pendeteksi Konflik Koreksi**: Mencegah fitur otomatis jika penyesuaian warna pada satu bagian kayu justru merusak bagian kayu lainnya.
5. **RGB Bukan Penentu PASS/FAIL Tunggal**: RGB hanya menjelaskan arah pergeseran warna. Keputusan QC tetap memakai keseluruhan bukti seperti ΔE00, Lab, brightness, texture, dan pemeriksaan operator.
6. **Ringan & CPU-First**: Berjalan cepat pada komputer standar kantor studio (RAM 8 GB tanpa kartu grafis khusus).
