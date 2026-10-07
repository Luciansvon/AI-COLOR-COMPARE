# Studio Color QC v0.3.11 — Android Pilot (prarilis)

Paket uji Android ARM64 yang membawa perbaikan audit Android Pilot. Rilis ini tidak menyertakan installer Windows.

## Perbaikan

- Hasil ukur mengikuti area foto yang tersimpan. Pengukuran lama yang selesai belakangan tidak dapat mengganti bukti terbaru.
- Formulir keputusan FAIL menunggu penyimpanan; catatan tetap tersedia bila simpan gagal.
- Simpan JPEG, ZIP, dan JSON memakai pemilih dokumen Android serta pemeriksaan hasil tulis sebelum aplikasi menyatakan berhasil.
- Cetak memakai dialog PrintManager Android. Aplikasi tidak mengklaim PDF sudah tersimpan hanya karena dialog terbuka.
- Pratinjau Android dibatasi maksimum 2048 piksel; pengukuran dan ekspor tetap memakai foto penuh.
- APK ARM64 menggunakan `versionName 0.3.11`, `versionCode 3011`, dan dukungan penyelarasan halaman 16 KiB.

## Catatan pemasangan dan pengujian

APK ini ditandatangani dengan sertifikat uji Android Debug lokal, bukan sertifikat produksi. Sidik SHA-256 sertifikatnya `7cddacb091feb949cfae50d32cbb783198aa1a8b98bc483dbe29626109d7fa29`; sertifikat APK v0.3.10 adalah `d6240a3dcc5d209b5c2f8622338cf3704a08a15aaaab7ff9aad42d51ee03f337`. Karena berbeda, APK ini bukan pembaruan langsung untuk instalasi v0.3.10. Jangan menghapus aplikasi lama untuk mencoba paket ini; gunakan perangkat uji lain atau emulator yang belum memiliki v0.3.10.

APK ini belum diuji pada ponsel. Pemilih penyimpanan, layanan cetak, dan perilaku instalasi masih perlu diuji langsung pada perangkat Android.

SHA-256 APK: `8a136451684ea4b75fc249f6036a33959085bb0716926f765382cc38695d84d0`. Pemeriksaan dan checksum pendukung tersedia di aset rilis.
