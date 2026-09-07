# Studio Color QC v0.3.5

## Angka perbandingan lebih jelas

- Kecerahan ditampilkan pada skala 0–100, bukan persen.
- Selisih dihitung dari pasangan angka yang terlihat: master 20 dan produk 30 menghasilkan **+10 poin**. Persentase relatif untuk pasangan tersebut adalah +50%, bukan +15%.
- Kartu dan laporan cetak menggunakan perhitungan serta ambang kecerahan yang sama (±3 poin sebagai ambang internal).
- Nilai kepekatan warna diberi satuan C*; selisih persentasenya ditandai relatif terhadap master.

## Panduan RGB untuk operator

- Panel khusus menampilkan arah merah, hijau, biru, atau kuning dibanding master dan perubahan proporsi setiap kanal.
- Arah campuran memakai sumbu dominan. Data yang tidak konsisten tidak diberi klaim "Warna Seimbang".
- Petunjuk Canon EOS 80D menjelaskan menu WB Shift/Bkt. dan arah G/M serta B/A. Percobaan dimulai satu langkah lalu foto ulang; jumlah langkah bukan hasil kalibrasi kamera.
- Model kamera belum dibaca otomatis dari foto. Angka slider merupakan simulasi aplikasi, bukan parameter kamera yang harus disalin.

## Perbaikan audit

- Slider hijau–magenta tersedia, termasuk nilai rekomendasinya. Batas dan ketelitian slider sesuai nilai yang dipakai.
- Konflik hijau–magenta antararea menahan koreksi global.
- Clipping pada master maupun produk menahan saran otomatis; hasil penggabungan bukti tidak lagi menyatakan lolos sempurna dari foto rusak.
- Klaim bahwa bahan pasti sama/berbeda hanya dari tekstur dan warna foto dilunakkan sesuai bukti yang tersedia.
- Perbandingan ulang mengukur pratinjau dari parameter saat itu tanpa mengganti slider dengan koreksi sisa.
- Perubahan pratinjau setelah diukur menahan keputusan dan cetak sampai dibandingkan ulang.
- Hasil proses lama tidak boleh menimpa sesi baru. Keputusan lama dibersihkan saat perbandingan berubah; mengganti master memulai sesi baru.
- Riwayat menyimpan basis pengukuran (foto asli/pratinjau terkoreksi) dan parameter pratinjau terkait.
- Ekspor membangkitkan gambar dari parameter terbaru; berkas sumber tetap terpisah.
- Nomor versi tampilan mengikuti konfigurasi aplikasi Windows.

## Verifikasi dan batasnya

Pengujian lokal mencakup regresi perhitungan, tampilan kartu/laporan, bridge penyimpanan, build frontend, serta 27 pengujian Rust. Alur browser mencakup demo, slider, perbandingan ulang, penahanan keputusan saat data usang, dan kesamaan angka laporan.

Workflow rilis menjalankan kembali pengujian dan build installer NSIS, lalu menguji upgrade v0.3.4 ke v0.3.5 dengan satu entri instalasi. Lihat hasil GitHub Actions untuk bukti rilis yang dipublikasikan.

Pengujian di kamera Canon EOS 80D fisik, lampu studio, dan foto produksi belum dilakukan. Rilis ini tidak menambah decoder RAW pada penampil frontend atau kalibrasi warna kamera. Keputusan PASS/FAIL tetap di tangan operator.

Referensi arah menu kamera: [Canon — Teknik Pemotretan EOS 80D](https://snapshot.asia.canon/indo/id/article/eos-80d-shooting-techniques-street-photographs).
