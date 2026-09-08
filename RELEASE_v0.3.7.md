# Studio Color QC v0.3.7

Rilis ini memperbaiki alur koreksi dan menambahkan ekspor batch untuk satu produk.

## Ekspor batch konsisten

- Satu foto produk menjadi acuan koreksi.
- Nilai slider acuan dikunci saat ekspor dimulai dan diterapkan sama ke semua foto tambahan.
- Foto acuan ikut dimasukkan ke ZIP bersama foto tambahan.
- ZIP menyertakan `koreksi-batch.json` berisi foto acuan, nilai koreksi, dan daftar hasil.
- Nama ganda diberi nomor sehingga hasil tidak saling menimpa.
- Maksimal 50 foto termasuk acuan dan 200 MB per batch.
- Ada indikator proses, tombol batal, dan pesan bila satu foto gagal.

## Preview, keputusan, dan laporan

- Saran koreksi kembali mengisi slider setiap pengukuran baru, termasuk bila sarannya sama.
- Reset manual tetap bertahan sampai operator menjalankan pengukuran baru.
- Keputusan dan laporan ditahan bila foto yang terlihat berbeda dari foto yang terakhir diukur.
- Laporan mencatat parameter yang benar-benar dipakai saat pengukuran, termasuk brightness dan kontras.

## Ekspor JPEG

- Preview dan ekspor memakai transformasi piksel yang sama.
- JPEG dikompres satu kali dari sumber, bukan dua kali.
- Tombol ekspor menampilkan status sedang memproses, permintaan unduhan, atau kegagalan.
- Klik ganda ditahan selama ekspor berlangsung.
- Berkas asli tidak ditulis ulang.

## Ikon aplikasi

- Logo QC dipakai secara eksplisit sebagai ikon aplikasi Windows, installer, dan uninstaller.

## Pengujian

- Seluruh rangkaian `npm test` lulus.
- 27 pengujian Rust lulus.
- Build TypeScript, Vite, dan EXE Tauri lulus.
- Workflow menguji upgrade v0.3.6 ke v0.3.7 dan memastikan hanya ada satu instalasi.

## Batas yang masih diketahui

Deteksi permukaan halus tanpa serat dan kecocokan penerapan warna pada kasus tersebut belum termasuk dalam perbaikan rilis ini. Operator tetap menjadi penentu akhir PASS/FAIL. Pengujian visual dengan foto studio dilakukan oleh Bima.
