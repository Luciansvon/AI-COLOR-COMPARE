# Studio Color Consistency & Material QC System (MVP P0)

Aplikasi desktop studio foto furnitur untuk membandingkan hasil foto produk terhadap **sampel fisik asli (master panel)** secara akurat, objektif, dan terukur.

---

## 💡 Cara Menjalankan Aplikasi

1. Buka terminal (PowerShell atau Command Prompt) di folder proyek ini:
   ```bash
   npm run dev
   ```
2. Buka browser dan ketik alamat:
   ```text
   http://localhost:3000
   ```
3. Aplikasi siap digunakan!

---

## 🧪 Menguji Sistem (Uji Validasi Otomatis)

Untuk memastikan rumus matematika warna ($\Delta E_{00}$), pendeteksi konflik koreksi, dan pengamanan berkas foto bekerja 100% sempurna:
```bash
npm test
```

---

## 🎯 Fitur Utama untuk Mas Bima & Tim Studio

1. **Perbandingan 2 Gambar Berdampingan:**
   - Sisi Kiri: Foto papan master kayu fisik acuan studio (misal `WN-04 Walnut Dark Satin`).
   - Sisi Kanan: Foto produk furnitur dengan kotak area (ROI) yang bisa diklik.

2. **Bukti Terukur vs Tafsiran Logis (Tanpa Angka Palsu):**
   - **Bukti Pasti**: Selisih warna nyata ($\Delta E_{00}$), selisih terang-gelap, kontras, dan kepekatan warna.
   - **Tafsiran Sistem**: Memberi tahu apakah beda warna kemungkinan karena lampu studio/kamera atau bahan finishing kayunya.

3. **Keputusan Akhir 100% di Tangan Operator:**
   - Tombol **PASS (Lolos)** dan **FAIL (Gagal)** tersedia per area dan per produk.
   - Jika memilih FAIL, wajib memilih alasan (seperti: warna terlalu kuning, terlalu gelap, serat beda, atau kilau silau).

4. **Koreksi Warna & Pendeteksi Konflik Pintar:**
   - Ada penggeser Suhu Warna, Eksposur, dan Saturasi dengan tombol **Preview Koreksi**.
   - Jika satu foto memiliki dua bagian kayu yang arah warnanya berlawanan (satu terlalu gelap, satu terlalu silau), sistem otomatis memberi tahu adanya **Konflik Koreksi** dan menonaktifkan fitur otomatis agar foto tidak rusak.

5. **Aman & Tidak Merusak Berkas Asli (Non-Destructive):**
   - Berkas foto asli kamera tidak akan pernah disentuh atau ditimpa.
   - Hasil ekspor akan disimpan sebagai berkas foto JPEG sRGB baru yang bersih.

6. **Bisa Dicoba Langsung dari Rumah:**
   - Tersedia 4 tombol simulasi di bagian atas layar untuk menguji skenario nyata (Lolos, Masalah Lampu, Material Beda, dan Konflik Koreksi).
