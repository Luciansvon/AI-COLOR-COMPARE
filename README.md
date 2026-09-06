# Studio Color Consistency & Material QC System

<div align="center">
  <img src="public/app-icon.png" width="128" height="128" alt="Studio Color QC Logo" />
  <p><strong>Aplikasi Desktop Windows untuk Konsistensi Warna & Kontrol Kualitas Material Furnitur Studio</strong></p>
  <p><em>Repositori Resmi: <a href="https://github.com/Luciansvon/AI-COLOR-COMPARE">Luciansvon/AI-COLOR-COMPARE</a></em></p>
</div>

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

Untuk memverifikasi keakuratan rumus warna CIEDE2000, pendeteksi konflik koreksi, database SQLite, dan pengamanan berkas:
```bash
# Uji Sains Warna & Integritas File
npm test

# Uji Native Core Rust & Database SQLite
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## 🛡️ Prinsip Keamanan & Desain Produk

1. **Physical Master adalah Acuan Utama**: Sistem membandingkan foto produk terhadap sampel master fisik kayu yang dipilih secara manual oleh operator.
2. **Otoritas Mutlak Operator**: Keputusan Lolos (**PASS**) atau Gagal (**FAIL**) sepenuhnya berada di tangan operator studio.
3. **Keaslian File 100% Terjaga (Non-Destructive)**: Berkas asli kamera tidak pernah ditimpa atau diubah.
4. **Pendeteksi Konflik Koreksi**: Mencegah fitur otomatis jika penyesuaian warna pada satu bagian kayu justru merusak bagian kayu lainnya.
5. **Ringan & CPU-First**: Berjalan cepat pada komputer standar kantor studio (RAM 8 GB tanpa kartu grafis khusus).
