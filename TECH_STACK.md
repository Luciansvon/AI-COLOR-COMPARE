# Keputusan Arsitektur & Model AI (TECH_STACK.md) — Diperbarui Berdasarkan Riset Komunitas (50+ Sumber)

## 1. Kesimpulan Riset Komunitas & Paper
Riset mendalam dari komunitas (Reddit r/computervision, GitHub Anomalib, paper WACV 2024/2025, Hugging Face) membuktikan bahwa:
- **DINOv2 Cosine Global Standar Kurang Efektif**: Mengubah seluruh gambar ROI menjadi 1 angka kemiripan global menghancurkan detail lokal serat/urat kayu dan tidak peka terhadap cacat kecil.
- **Kayu Memiliki Variasi Alami yang Unik**: Model AI kayu tidak boleh digabung menjadi satu model universal (*universal wood model*), karena variasi urat kayu alami akan dianggap cacat. Setiap identitas master (misal: `WN-04 Walnut Dark`, `OA-02 Oak`) wajib memiliki bank memori referensi sendiri.

---

## 2. Peringkat Model & Arsitektur Rekomendasi

| Peringkat | Metode / Model | Peran & Alasan |
| :--- | :--- | :--- |
| 🥇 **Utama (P1)** | **AnomalyDINO + DINOv2-S** | Membandingkan serat kayu per kotak kecil (*patch-level deep nearest neighbor*). Tanpa perlu *training* ulang, sangat akurat mendeteksi bagian serat yang menyimpang terhadap master fisik. Bisa jalan di CPU (`--faiss_on_cpu`). |
| 🥈 **Pendamping (P1)** | **DISTS** (*Deep Image Structure and Texture Similarity*) | Sangat toleran terhadap sudut foto/posisi papan master yang sedikit berbeda atau pantulan cahaya, fokus pada kesamaan struktur dan tekstur visual. |
| 🥉 **Masa Depan (P2)** | **EfficientAD** | Model inspeksi anomali industri sangat cepat. Cocok diterapkan nanti setelah studio mengumpulkan ratusan riwayat foto produk bagus (*good samples*). |
| 4 | **Tekstur Tradisional (Gabor / LBP / Edge)** | Penjelasan matematis dasar yang transparan dan mudah diaudit. |
| ❌ *Ditolak* | **Model Bahasa/VLM (Qwen, Gemma Vision)** | Terlalu berat, lambat, dan tidak cocok untuk tugas perbandingan visual presisi. |
| ❌ *Ditolak* | **CLIP / MobileCLIP2 / SigLIP** | Lisensi MobileCLIP terbatas non-komersial Apple, dan model teks-gambar tidak dibutuhkan untuk perbandingan fisik master. |
| ⏳ *Ditunda* | **DINOv3-S** | Masih ada kendala ekspor ONNX aktif dan lisensi non-Apache. |

---

## 3. Alur Kerja Lengkap Sistem (Color + Texture + Anomaly)

```text
Foto RAW / Gambar Produk
           │
 ┌─────────┴─────────────────────────────────────────┐
 │                                                   │
 ▼                                                   ▼
[PIPA WARNA (Matematika P0 - Tanpa AI)]     [PIPA TEKSTUR & ANOMALI (P1)]
- Nilai Lab & ΔE00                           - Normalisasi Cahaya / Grayscale
- Selisih Komponen (ΔL, Δa, Δb)              - DISTS (Kemiripan Tekstur)
- Kecerahan, Kontras, Saturasi               - AnomalyDINO (Pengecekan Kotak Patch)
- Analisis Relatif White Balance & Eksposur  - Bank Memori Khusus Per Kode Master (WN-04)
 │                                                   │
 └─────────────────────────┬─────────────────────────┘
                           │
                           ▼
               [Penggabungan Bukti (Evidence Fusion)]
                           │
 ┌─────────────────────────┴─────────────────────────┐
 │                                                   │
 ▼                                                   ▼
Warna Beda + Serat Sama                     Warna Beda + Serat Beda
(Kemungkinan: Lampu / WB / Kamera)          (Kemungkinan: Bahan / Finishing Salah)
                           │
                           ▼
          [Rekomendasi Sistem & Tingkat Keyakinan]
                           │
                           ▼
          [KEPUTUSAN AKHIR OPERATOR (PASS / FAIL)]
```

---

## 4. Rencana Implementasi Bertahap
1. **Tahap P0 (Fokus Saat Ini)**:
   - Matematika warna murni (Lab, ΔE00, kontras, saturasi, eksposur).
   - Penanganan file gambar/RAW non-destruktif.
   - Antarmuka kerja operator (pilih master, atur area ROI, tombol PASS/FAIL, alasan FAIL, ekspor hasil).
2. **Tahap P1**:
   - Integrasi DISTS dan AnomalyDINO (DINOv2-S patch) via ONNX Runtime CPU.
   - Bank memori patch per identitas kode master.
