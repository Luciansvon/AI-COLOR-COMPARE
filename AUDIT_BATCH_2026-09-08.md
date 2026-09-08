# Audit v0.3.6 dan ekspor batch — 8 September 2026

Sumber audit: `origin/main` dan tag `v0.3.6` pada commit `943d9ef4825634260e583178961ee02cb1fdf060`, setelah `git fetch --prune --tags`. Checkout awal bersih pada v0.3.5, kemudian diperbarui dengan fast-forward.

Rilis resmi terbaru yang diperiksa: [Studio Color QC v0.3.6](https://github.com/Luciansvon/AI-COLOR-COMPARE/releases/tag/v0.3.6), terbit 7 September 2026. [Workflow rilis](https://github.com/Luciansvon/AI-COLOR-COMPARE/actions/runs/34133855847) dan [CI](https://github.com/Luciansvon/AI-COLOR-COMPARE/actions/runs/34133855884) berstatus sukses. Dua aset tersedia: installer standar 5.28 MB dan Offline Full 267.29 MB. Status ini adalah bukti pemeriksaan GitHub, bukan pengujian installer di komputer pengguna.

## Temuan dan perbaikan lokal

| Prioritas | Masalah pada sumber v0.3.6 | Perbaikan |
| --- | --- | --- |
| P1 | Sesudah pengukuran foto asli, preview terkoreksi dapat dinyalakan sementara keputusan/laporan masih memakai bukti asli. Pemeriksaan lama hanya memeriksa perubahan bila pengukuran sebelumnya sudah terkoreksi. | Bandingkan parameter pengukuran dengan parameter foto yang ditampilkan, pada kedua arah asli–preview. Tahan keputusan dan laporan sampai diukur ulang. |
| P1 | Membandingkan ulang sumber asli mengosongkan slider. Efek panel tidak mengisi ulang bila saran JSON sama dengan saran sebelumnya. | Isi saran langsung saat pengukuran asli selesai. Reset manual bertahan sampai pengukuran baru. Pengukuran preview mempertahankan slider yang digunakan. |
| P2 | Jalur ekspor mengubah sumber menjadi JPEG terkoreksi lalu mendekode/mengompres JPEG itu lagi. | Preview terkoreksi, ekspor tunggal, dan batch memakai fungsi encoder koreksi yang sama dengan satu kompresi dari sumber. Kegagalan konteks canvas sekarang menghasilkan galat, bukan diam-diam mengembalikan foto asli. |
| P2 | Laporan menerima slider saat ini meski pengukuran berasal dari foto asli, dan tidak menampilkan brightness/kontras. | Laporan menerima snapshot parameter pengukuran; kedua parameter tambahan ikut dicantumkan. |
| P3 | Versi akar package-lock dan paket aplikasi di Cargo.lock masih 0.3.5. | Sinkron dengan versi sumber 0.3.6. |

## Fitur batch yang diminta

- Foto produk aktif menjadi acuan; slider akhirnya disalin sekali ketika ekspor ditekan.
- Acuan dan foto tambahan diekspor sebagai JPEG di dalam satu ZIP, berikut catatan parameter JSON.
- Nama berkas disanitasi dan duplikat dibedakan tanpa menimpa entri sebelumnya.
- Progres, pembatalan, validasi format/ukuran, dan galat per nama foto tersedia.
- Batch berhenti jika satu foto gagal; tidak mengunduh hasil parsial.
- URL sementara dilepas. Foto sumber tidak ditulis ulang dan tidak dikirim ke layanan luar.
- Maksimal 50 foto termasuk acuan, input dan hasil JPEG masing-masing 200 MB. Foto diproses berurutan.
- Koreksi seragam tidak menyamakan pencahayaan yang berbeda dan tidak melakukan QC otomatis untuk seluruh batch.

## Verifikasi

- `npm test`: lulus seluruh rangkaian, termasuk 29 pengujian dasar sains warna, bridge penyimpanan, guardrail, RGB, laporan, koreksi piksel, alur komponen, dan batch.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 27 lulus, 0 gagal.
- `npm run build`: lulus TypeScript dan Vite.
- `npx --yes @tauri-apps/cli@2.11.4 build --no-bundle`: lulus; EXE Windows berhasil dibuat ulang setelah konfigurasi ikon final.
- `git diff --check`: lulus pada perubahan kode yang diperiksa.
- `tests/correction_flow.test.tsx`: komponen React berjalan di memori dengan Image/canvas pengganti, tanpa browser. Memeriksa saran berulang, reset, keputusan/laporan yang ditahan, serta satu kali kompresi melalui tombol ekspor.
- `tests/batch_export.test.ts`: membuat dan membaca arsip ZIP nyata; encoder JPEG diganti fixture untuk memeriksa snapshot koreksi, acuan, nama duplikat, byte sumber, pembersihan URL, gagal, batal, dan batas ukuran. Ini tidak membuktikan kualitas JPEG visual.

Live test browser/aplikasi, pengunduhan melalui WebView2, penilaian warna nyata, performa puluhan foto kamera, dan uji upgrade installer tidak dijalankan sesuai permintaan Bima. Pengujian tersebut diserahkan kepada Bima. Perubahan ini belum dipublikasikan ke GitHub Release; installer resmi v0.3.6 tetap berisi sumber sebelum perbaikan ini.

## EXE lokal untuk Bima

- Berkas: `release-artifacts/Studio-Color-QC-v0.3.6-Audit-Batch.exe` (13.08 MB), bukan installer atau rilis resmi baru. Versi internal masih 0.3.6.
- SHA-256: `FCAC9C4278EEE8321BCBECA5B2C1A1755643CEF9472C99BB8BD5A32BC9974F83`.
- Ikon QC yang sama dengan logo aplikasi ditetapkan secara eksplisit untuk bundel, installer, dan uninstaller. Tauri Windows menggunakan ICO tersebut sebagai ikon jendela bawaan.
- Ikon EXE berhasil diekstrak dengan `System.Drawing.Icon.ExtractAssociatedIcon` dan diperiksa secara visual: logo QC. Bukti: `release-artifacts/embedded-icon.png`. Proses ini membaca resource berkas tanpa menjalankan aplikasi.
- Installer baru tidak dibangun; pengaturan ikonnya belum diverifikasi pada installer hasil baru.

## Pemeriksaan manual Bima

Pembaruan notifikasi ekspor: ekspor JPEG tunggal menampilkan status proses, permintaan unduhan, dan kegagalan langsung di bawah tombol. Klik ganda ditahan selama proses berlangsung. Mengganti foto/mode membatalkan hasil ekspor yang masih tertunda. Pesan unduhan tidak mengklaim berkas telah tersimpan karena jalur unduhan browser/WebView2 tidak memberikan konfirmasi penyimpanan. Tes komponen untuk pesan sukses, galat, percobaan ulang, dan klik ganda lulus; live test tetap diserahkan kepada Bima.

EXE terbaru yang memuat notifikasi: `release-artifacts/Studio-Color-QC-Audit-Batch-Notif.exe` (13,079,552 byte). Build Tauri `--no-bundle` lulus. SHA-256: `B21849FC0273491E26D77E9C4FBF73DEBD568E8F675D05BF9B9A60E76FEF1338`. Berkas uji sebelumnya dipertahankan.

1. Bandingkan foto, reset slider, lalu bandingkan ulang: saran harus kembali terisi.
2. Nyalakan preview: keputusan ditahan sampai Bandingkan Ulang selesai.
3. Pilih beberapa sudut foto produk yang sama, ekspor ZIP, lalu bandingkan hasilnya secara visual.
4. Pastikan acuan ikut, jumlah JPEG tepat, nama ganda mendapat nomor, dan unduhan ZIP bisa dibuka.
5. Coba batal atau satu foto rusak: tidak boleh muncul ZIP parsial.
