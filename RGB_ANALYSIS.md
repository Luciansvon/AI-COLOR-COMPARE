# Analisis RGB Operator — Canon EOS 80D

## Tujuan

Fitur ini menjawab pertanyaan operator studio secara langsung:

- Apakah foto produk **kemerahan**?
- Apakah foto produk **kehijauan**?
- Apakah foto produk **kebiruan**?
- Atau warnanya sudah **seimbang terhadap master**?

Fitur RGB adalah **evidence tambahan**, bukan pengganti ΔE00, Lab, analisis serat, maupun keputusan operator.

---

## Kenapa angka RGB mentah tidak dibandingkan langsung

Kayu walnut, mahoni, atau finishing coklat secara alami dapat memiliki nilai kanal merah lebih tinggi daripada hijau dan biru. Karena itu aturan seperti `R harus mendekati G dan B` akan menghasilkan diagnosis palsu.

Sistem memakai alur berikut:

```text
RGB MASTER           RGB PRODUK
    │                    │
    ▼                    ▼
Normalisasi proporsi kanal R/G/B
    │                    │
    └────────┬───────────┘
             ▼
Bandingkan perubahan proporsi
             │
             ▼
Validasi arah dengan Δa* dan Δb*
             │
             ▼
Seimbang / Kemerahan / Kehijauan / Kebiruan
             │
             ▼
Panduan White Balance Canon EOS 80D
```

Normalisasi proporsi membuat perubahan exposure global jauh lebih kecil pengaruhnya. Contoh, `120/80/40` dan `180/120/60` memiliki proporsi warna yang sama walaupun foto kedua lebih terang.

---

## Bahasa hasil untuk operator

Aplikasi menggunakan label:

- `Warna Seimbang`
- `Sedikit Kemerahan`
- `Cenderung Kemerahan`
- `Sedikit Kehijauan`
- `Cenderung Kehijauan`
- `Sedikit Kebiruan`
- `Cenderung Kebiruan`

Contoh hasil:

```text
Cenderung Kemerahan.
Perubahan proporsi terhadap master:
R +3.8% | G -1.9% | B -1.9%

Canon EOS 80D:
mulai 1 langkah White Balance Correction ke G (Green),
foto ulang, lalu bandingkan lagi.
```

Angka persen adalah **perubahan proporsi kanal terhadap master**, bukan persentase keyakinan dan bukan tebakan AI.

---

## Pemetaan Canon EOS 80D

Canon EOS 80D menyediakan White Balance Correction pada dua sumbu:

- `B ↔ A` = Blue ↔ Amber
- `G ↔ M` = Green ↔ Magenta

Interpretasi sistem:

| Bukti warna | Arah koreksi awal |
|---|---|
| Terlalu kuning / hangat (`Δb* +`) | ke `B` |
| Terlalu biru / dingin (`Δb* -`) | ke `A` |
| Terlalu merah / magenta (`Δa* +`) | ke `G` |
| Terlalu hijau (`Δa* -`) | ke `M` |

Aplikasi **tidak mengubah nilai Lab menjadi jumlah langkah kamera secara langsung**. Saran selalu dimulai dari **1 langkah**, kemudian operator melakukan foto ulang dan perbandingan ulang. Ini mencegah aplikasi mengarang skala koreksi yang belum dikalibrasi khusus untuk setup lampu studio tersebut.

Referensi kamera resmi:
- Canon EOS 80D support: https://www.usa.canon.com/support/p/eos-80d

---

## Guardrail

### 1. Clipping didahulukan
Jika ROI terlalu silau atau terlalu gelap, aplikasi tidak langsung menyuruh mengubah White Balance. Operator diminta memperbaiki exposure, pantulan, atau pencahayaan terlebih dahulu.

### 2. RGB bukan penentu PASS / FAIL
Kemerahan, kehijauan, atau kebiruan belum tentu berarti material salah. Sistem tetap menggabungkan:

- ΔE00
- ΔL*, Δa*, Δb*
- brightness
- saturation
- texture / grain
- clipping
- physical master
- keputusan operator

### 3. Material mismatch tidak ditutupi setting kamera
Jika warna dan struktur material sama-sama berbeda dari master, aplikasi tidak menyarankan kamera sebagai solusi utama. Operator diarahkan memeriksa bahan / finishing.

---

## Pembaruan aplikasi Windows

Mulai v0.3.3 konfigurasi installer dibuat eksplisit untuk upgrade-in-place:

```text
productName : Studio Color QC
identifier  : com.studio.colorqc
installMode : currentUser
```

`allowDowngrades` dinonaktifkan. Installer baru harus memperbarui instalasi Studio Color QC yang sama, bukan membuat entri aplikasi kedua.

Referensi Tauri 2:
- https://v2.tauri.app/distribute/windows-installer/
- https://v2.tauri.app/reference/config/
