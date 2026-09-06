# Profil Pengguna (Bima)

## Latar Belakang & Pemahaman
- **Nama**: Bima.
- **Tingkat Pemahaman Koding**: Tidak paham fundamental koding atau istilah teknis yang rumit.
- **Gaya Komunikasi yang Disukai**:
  - Bahasa Indonesia santun, jelas, dan mudah dipahami (dilarang menggunakan bahasa asing/Inggris).
  - Gunakan analogi dunia nyata atau penjelasan visual to-the-point tanpa jargon yang membingungkan.
  - Penjelasan langkah demi langkah yang praktis.
  - **Tampilan Output User-Friendly**: Bima menginginkan output (baik di layar aplikasi maupun dalam respon penjelasan) disajikan sesederhana mungkin bagi orang awam foto/furnitur, tanpa rumus matematika rumit seperti simbol delta E atau istilah teknis yang bikin pusing. Ganti dengan kata sehari-hari (misal: 'Warna Pas', 'Agak Kemerahan', 'Sedikit Lebih Terang').
  - **Kepastian Alur & Tombol Aksi Nyata**: Bima bingung jika aplikasi berjalan otomatis tanpa tombol aksi yang jelas. Harus ada tombol tindakan yang tegas (misal: tombol besar **'Bandingkan Sekarang'**) serta **indikator status 3 langkah** yang gamblang (Langkah 1: Masukkan Foto -> Langkah 2: Tekan Tombol Bandingkan -> Langkah 3: Hasil & Keputusan). Hindari proses otomatis diam-diam yang membuat pengguna bertanya-tanya apakah foto sudah dibandingkan atau belum.
  - **Tata Letak Perbandingan Visual & Swatch Warna**: Bima menyukai kartu perbandingan yang lapang dan proporsional (melebar penuh jika mode 1 area), menampilkan kotak sampel warna visual (*swatch*) Master vs Produk berdampingan agar perbedaannya bisa dilihat kasat mata tanpa menebak angka, serta menghindari tombol keputusan ganda (tombol keputusan akhir cukup satu di panel bawah).
  - **Interaksi Foto (Perbesar Gambar & Pilih Area Mandiri)**: Bima membutuhkan fitur memperbesar gambar (*zoom in/out* & *pan*) untuk melihat pori dan serat kayu secara mendalam, serta kebebasan memilih/menggeser area kotak pindai (*interactive ROI box*) agar pengukuran warna dan serat kayu menjadi sangat akurat sesuai bagian furnitur yang diinginkan.
  - **Ekspektasi Sampel Dinamis (*Live Dynamic Swatch*)**: Bima ingin kepastian bahwa kotak sampel warna (*swatch*) dan angka diagnosanya benar-benar berubah secara dinamis mengikuti objek yang diarahkan oleh kotak seleksi.
  - **Konsistensi Pemilihan Area Master & Produk**: Bima mengharapkan foto Master acuan juga bisa dipilih dan digeser areanya (*selectable ROI*) sama persis seperti foto produk, agar operator bisa memilih bagian papan master yang paling bersih atau menghindari stiker label/tepi papan yang terpotong.
  - **Layout Berbasis Statistik (Dashboard Komparasi Bersih)**: Bima menginginkan tampilan hasil perbandingan disajikan dengan **format statistik yang rapi dan terstruktur** (seperti kartu-kartu metrik statistik atau tabel statistik visual), bukan tumpukan kotak teks narasi yang kaku. Statistik membandingkan langsung data Master vs Produk vs Selisih & Status (misal: Kecerahan, Kepekatan Rona, Warna, dan Serat Kayu) dengan visualisasi warna yang menyatu secara elegan sehingga langsung terbaca dalam satu lirikan.
  - **Respon Visual & Animasi Nyata pada Tombol Tindakan**: Bima membutuhkan respon visual yang tegas saat tombol aksi ditekan (terutama tombol **'Bandingkan Ulang'**). Jangan biarkan proses berjalan instan tanpa animasi/feedback visual, karena pengguna akan merasa tombolnya mati/rusak. Tombol harus menampilkan animasi ikon berputar (*spinner*), teks status sedang memproses, dan tanda sukses singkat setelah selesai.

## Prinsip Kerja Bersama
- **Jangan Auto-Approve Plan**: Setiap perencanaan (plan) harus disajikan untuk ditinjau dan disetujui Bima terlebih dahulu.
- **Jujur & Tidak Mengarang**: Jika ada keterbatasan teknis atau hal yang belum bisa dilakukan, katakan apa adanya.
- **Jangan Asal Bertindak**: Jangan langsung mengeksekusi tindakan besar jika Bima hanya bertanya atau belum memberi instruksi mulai.
- **Informasi Selalu Terupdate**: Memberikan data faktual dan kondisi terkini.

## Proyek: Studio Color Consistency & Material QC System
- **Tujuan**: Membantu studio foto furnitur mengecek apakah warna produk di foto sesuai dengan sampel kayu fisik asli (master panel), membedakan apakah selisih warna akibat pencahayaan/setting kamera atau memang bahannya yang beda.
- **Peran Bima**: Operator / pengambil keputusan utama (keputusan PASS/FAIL akhir ada di tangan manusia).
- **Kondisi Teknis Studio**: Bima belum hafal/lupa tipe kamera dan format RAW studio, saat ini sedang libur di rumah. Bima menyarankan mengunduh berkas RAW sampel kamera nyata dari internet (open dataset) agar pengujian tetap bisa berjalan tanpa harus menunggu kembali ke studio fisik.
- **Strategi AI & Arsitektur (Sudah Ditetapkan & Divalidasi Komunitas)**:
  - **Tahap P0**: Tanpa AI (100% perhitungan matematika warna murni: Lab, ΔE00, kecerahan, kontras, saturasi, relative WB/eksposur).
  - **Tahap P1 (Model Visual Unggulan)**:
    1. **AnomalyDINO + DINOv2-S**: Membandingkan serat kayu per petak kecil (*patch*) terhadap memori papan master fisik secara *one-shot* di CPU, bukan sekadar skor kemiripan global.
    2. **DISTS**: Mengukur kemiripan struktur dan tekstur permukaan yang kebal terhadap sedikit pergeseran sudut atau pantulan lampu.
    3. **Memori Per Master**: Bank referensi dipisah per kode master (misal WN-04 punya bank memori sendiri) agar variasi alami urat kayu tidak dianggap cacat.
- **Status Implementasi Terkini**:
  - **Fase P0 (Selesai 100%)**: Sains warna deterministik, proteksi berkas kamera non-destruktif (SHA-256 identik), ekspor atomik, dan database SQLite lokal.
  - **Fase P1 (Selesai 100%)**: Kecerdasan tekstur LBP (invarian terhadap lampu), deteksi sudut serat kayu Sobel, penggabungan bukti (Evidence Fusion), Patch Memory Bank (AnomalyDINO / nearest-neighbor) per kode master fisik, serta antarmuka ramah pengguna studio tanpa rumus rumit.
  - **Alur Uji Pengguna (Pembaruan Terkini)**: Alur kerja kini bersih di awal tanpa pengecekan prematur. Tersedia tombol dan dropzone unggah foto Master acuan langsung (format JPG & RAW didukung penuh). Hasil analisis baru diproses setelah kedua foto siap.
  - **Biner Windows**: `src-tauri/target/release/studio-color-qc.exe` (9.7 MB) siap dijalankan mandiri di PC Windows studio.
  - **GitHub Remote**: Tersinkronisasi penuh di branch `main` repositori `https://github.com/Luciansvon/AI-COLOR-COMPARE`.
