# Studio Color QC v0.3.9 — Full Photo Fit Fix

## Perbaikan utama
- Foto Master dan Produk pada viewer Windows sekarang selalu tampil utuh pada zoom 100% tanpa terpotong frame.
- Ukuran dasar dihitung dari rasio asli gambar dan ruang viewer, bukan hanya batas CSS.
- Kotak area QC tetap mengikuti area gambar nyata karena wrapper disamakan dengan ukuran foto yang benar-benar terlihat.
- Resize jendela menghitung ulang ukuran fit secara otomatis.
- Zoom di atas 100% tetap boleh memotong viewport secara sengaja untuk inspeksi detail.

## Cakupan rilis
Rilis ini membangun installer Windows EXE. Perbaikan berada di UI bersama sehingga juga siap dipakai build Android berikutnya, tetapi v0.3.9 ini tidak menerbitkan APK baru.

## Verifikasi
- Unit regression untuk landscape, portrait, ultra-wide, ultra-tall, dan gambar kecil.
- npm test
- npm run build
- cargo test
- cargo check
- Build NSIS Windows standar
- B.I.M.A Shared Infra Audit melalui PR sebelum merge
