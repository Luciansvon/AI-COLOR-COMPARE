# Bukti paket Android Pilot v0.3.11

## Identitas paket

- Nama paket: `com.studio.colorqc`
- Versi Android: `0.3.11` (kode `3011`)
- Arsitektur: ARM64 (`arm64-v8a`), Android minimum 24, target 36
- Jenis: varian release, diperkecil dengan R8, tidak dapat-debug, cleartext dinonaktifkan
- Berkas: `Studio-Color-QC-v0.3.11-Android-Pilot.apk` — 17.256.225 bita
- SHA-256 APK: `8a136451684ea4b75fc249f6036a33959085bb0716926f765382cc38695d84d0`

## Pemeriksaan

- `npm test`: seluruh pengujian sains warna dan rangkaian regresi Android lulus. Pengujian regresi mencakup benturan urutan pengukuran area, formulir FAIL ketika simpan gagal, transfer ekspor bertahap, pembatalan, dan pemisahan pratinjau dari resolusi pengukuran/ekspor.
- `npm run build`: lulus untuk kode sumber rilis; bundle akhir `index-B7eV-5zf.js`.
- `cargo test`: 29 lulus, 0 gagal. `cargo check` dan kompilasi pustaka Android ARM64 setelah pembaruan versi juga lulus.
- Kompilasi Kotlin serta pengemasan Gradle `:app:assembleArm64Release` lulus.
- `apksigner verify`: tanda tangan v2 terverifikasi. Sidik SHA-256 sertifikat uji `7cddacb091feb949cfae50d32cbb783198aa1a8b98bc483dbe29626109d7fa29`.
- Seluruh segmen ELF `LOAD` pustaka native memakai alignment `0x4000` (16 KiB); hash pustaka yang dikemas sama dengan hasil Cargo.
- `zipalign -c -P 16 -v 4`: verifikasi berhasil untuk APK bertanda tangan.
- SHA-256 dan nama berkas aset tercantum di `SHA256SUMS-v0.3.11-android-pilot.txt`.

Pengujian fungsi `npm test` dan 29 tes Cargo dijalankan pada kode fungsi final sebelum pembaruan nomor versi. Sesudah metadata dinaikkan ke 0.3.11, build frontend, `cargo check`, kompilasi Android ARM64, kompilasi Kotlin, dan pengemasan APK release dijalankan kembali dan lulus.

Sertifikat APK uji berbeda dari sertifikat v0.3.10 (`d6240a3dcc5d209b5c2f8622338cf3704a08a15aaaab7ff9aad42d51ee03f337`), sehingga paket ini tidak dapat memperbarui instalasi lama secara langsung. Tidak ada ponsel atau emulator yang terhubung saat pemeriksaan; SAF, penyimpanan cloud, dialog cetak, dan pemasangan belum diuji langsung pada perangkat.
