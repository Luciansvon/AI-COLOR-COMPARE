# Studio Color QC v0.3.6

Hotfix ini memperbaiki regresi pada v0.3.5 yang membuat preview koreksi dan hasil ekspor JPEG dapat terlihat seperti foto asli walaupun sistem sudah menghitung saran koreksi.

## Preview koreksi dipulihkan

- Saran koreksi baru kembali mengisi slider aktif setelah perbandingan selesai.
- Tombol **Preview Koreksi** memakai parameter aktif tersebut untuk menampilkan foto produk yang sudah disesuaikan.
- Reset manual tetap dihormati dan tidak langsung ditimpa ulang oleh rekomendasi lama.
- Slider **Brightness** dan **Kontras** kembali tersedia bersama Suhu Warna, Hijau–Magenta, Eksposur, dan Saturasi.

## Ekspor JPEG diperbaiki

- Preview dan ekspor JPEG sekarang memakai satu fungsi transformasi piksel yang sama.
- Brightness benar-benar diterapkan ke hasil ekspor.
- Kontras yang sebelumnya hanya ada di struktur parameter tetapi tidak diterapkan ke piksel sekarang benar-benar bekerja.
- Foto sumber tetap tidak diubah. Ekspor membuat file JPEG sRGB baru.

## Regression test

Ditambahkan pengujian khusus untuk memastikan:

- exposure mengubah intensitas sesuai EV;
- brightness positif/negatif benar-benar menerangkan atau menggelapkan;
- temperature dan tint mengubah arah kanal RGB;
- saturation mengubah jarak kanal warna;
- contrast mendorong piksel gelap/terang menjauh dari titik tengah;
- koreksi nol tetap menghasilkan kondisi tanpa transformasi.

## Installer Windows

Rilis menyediakan dua pilihan:

1. **Studio-Color-QC-v0.3.6-Windows-x64-Setup.exe** — installer utama yang jauh lebih kecil. WebView2 diunduh hanya bila Windows belum memilikinya.
2. **Studio-Color-QC-v0.3.6-Windows-x64-Offline-Full-Setup.exe** — paket penuh untuk PC studio tanpa internet, termasuk WebView2 offline.

Windows 10 modern dan Windows 11 umumnya sudah memiliki WebView2, sehingga installer standar menjadi pilihan utama. Paket Offline Full tetap disediakan untuk workstation yang benar-benar terisolasi dari internet.

## Upgrade

Workflow rilis menguji upgrade **v0.3.5 → v0.3.6** dan harus menemukan tepat satu instalasi **Studio Color QC** dengan versi 0.3.6 setelah upgrade. Identifier aplikasi tetap `com.studio.colorqc` dan mode instalasi tetap `currentUser`, sehingga versi baru menimpa versi lama dan tidak membuat aplikasi kedua.

## Prinsip QC yang tidak berubah

- physical master tetap acuan utama;
- file foto asli tetap non-destruktif;
- RGB dan koreksi preview adalah evidence/alat bantu operator;
- keputusan akhir PASS/FAIL tetap milik operator.
