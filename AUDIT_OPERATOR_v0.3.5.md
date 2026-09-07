# Audit alur operator — 7 September 2026

Basis pemeriksaan: `origin/main` pada `8ff286c`, setelah fetch. Ruang lingkup: perhitungan frontend, arahan RGB/Canon, penggabungan bukti, simulasi, laporan, dan pergantian sesi. Ini bukan sertifikasi akurasi pengukuran warna benda fisik.

| Temuan | Dampak sebelumnya | Perbaikan |
|---|---|---|
| P1 — satuan kecerahan ambigu | L* ditulis persen, sementara selisih adalah persentase relatif. Kartu/laporan memakai ambang berbeda. | Skala 0–100; selisih poin dari pasangan angka tampil; satu helper untuk kartu/laporan. |
| P1 — hasil penggabungan mengabaikan clipping | Foto rusak bisa mendapat klaim lolos sempurna/kepercayaan tinggi. | Clipping master/produk didahulukan, saran otomatis ditahan dan diagnosis pengambilan foto dipisahkan. |
| P1 — bukti pratinjau berubah setelah diukur | Perbandingan ulang mengganti slider dengan koreksi sisa; gambar dan angka tidak lagi merujuk keadaan sama. | Ukur gambar dari salinan parameter saat klik; pertahankan slider; tandai bukti usang saat berubah; simpan basis pengukuran. |
| P1 — hasil/keputusan sesi lama | Proses asinkron dapat selesai setelah reset; keputusan masih melekat saat area berubah. | Nomor generasi pemeriksaan, reset keputusan dan sesi saat master berganti; batalkan pembacaan berkas lama. |
| P2 — tint tidak terlihat dan konflik tidak diperiksa | Operator tidak melihat perubahan hijau–magenta; dua area berlawanan tetap dirata-rata. | Slider dan angka tint, konflik tint, batas angka dan ketelitian slider. |
| P2 — arahan RGB kurang jelas | Petunjuk menyatu dalam paragraf; urutan merah mengalahkan sumbu lain; kuning tidak punya label. | Panel tiga kanal, arah dominan/kuning/belum pasti, menu Canon bersyarat, tanpa konversi palsu Lab ke langkah kamera. |

## Bukti pengujian lokal

- `npm test`: suite warna 29/29, guardrail, RGB, render kartu/laporan, dan serialisasi basis pengukuran lulus.
- `npm run build`: lulus pada v0.3.5.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 27/27 lulus; uji RAW ini tidak membuktikan penampil frontend mendekode RAW.
- Browser aplikasi lokal: unggah dua JPG menunggu tombol; klik menghasilkan data RGB. Pasangan 22.2/24.5 tampil +2.3 poin.
- Browser demo: terapkan saran, bandingkan ulang, ubah tint, keputusan menjadi nonaktif dan cetak ditahan; bandingkan ulang mengaktifkannya kembali. Kartu dan laporan sama-sama menampilkan 18.5/19.9, +1.4 poin pada skenario yang diperiksa.
- Pemeriksaan otomatis `git diff --check` ditolak lapisan persetujuan sesi (approval required / never); tidak dicatat sebagai lulus.

## Batas dan pekerjaan di luar rilis

- Belum diuji dengan Canon EOS 80D fisik, lampu studio, dan toleransi material produksi.
- Koreksi pratinjau tetap heuristik pada piksel gambar; tidak ada profil kamera terkalibrasi atau jaminan bahwa satu langkah kamera menghasilkan besar perubahan tertentu.
- Pengujian installer dan upgrade dibuktikan terpisah oleh GitHub Actions. Pengujian browser tidak membuktikan GUI installer Windows atau akurasi hasil studio.
- Pengolahan tekstur berupa perhitungan lokal/LBP dan deskriptor petak, bukan bukti model DINOv2 aktif.

Referensi menu kamera: [Canon EOS 80D, WB Shift/BKT](https://snapshot.asia.canon/indo/id/article/eos-80d-shooting-techniques-street-photographs). B/A adalah biru–amber dan G/M hijau–magenta; pemetaan arah aplikasi tetap berupa percobaan awal yang memerlukan foto ulang.
