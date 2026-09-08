# Audit Release Studio Color QC v0.3.8

Tanggal audit: 2026-09-08

Target release: `v0.3.8`
Target commit: `3058b790aedf73fe71ea9989651bc98d5f9cb34d`
Perubahan utama: `c95cf8cd495db11a3f8670b58b1ecbd627529ab8` (`fix: handle smooth surfaces and validate color correction`)

## Verdict

**CONDITIONAL PASS untuk uji studio, belum layak dianggap production-verified tanpa manual smoke test.**

Release, asset, CI, build Rust/TypeScript, installer standar, upgrade-in-place, dan pembuatan Offline Full semuanya berhasil di GitHub Actions. Risiko terbesar bukan build failure, tetapi bagian yang memang belum diuji workflow: instalasi + launch Offline Full, launch aplikasi setelah upgrade, foto RAW/studio nyata, konsistensi preview vs export, serta perilaku WebView2/SmartScreen pada PC studio.

## 1. Asset Windows

Release `v0.3.8` memiliki **dua installer Windows x64** dan filename-nya jelas/tidak tertukar:

| Asset | Ukuran | Fungsi |
|---|---:|---|
| `Studio-Color-QC-v0.3.8-Windows-x64-Setup.exe` | 5,344,590 bytes / ~5.10 MiB | Installer ringan. WebView2 memakai `downloadBootstrapper`. |
| `Studio-Color-QC-v0.3.8-Windows-x64-Offline-Full-Setup.exe` | 267,346,128 bytes / ~254.96 MiB | Installer full offline. WebView2 Runtime ikut dibundel melalui `offlineInstaller`. |

Offline Full sekitar **50.02x** lebih besar, dengan tambahan ~249.86 MiB. Selisih ini masuk akal karena config Offline Full mengubah `webviewInstallMode` dari `downloadBootstrapper` menjadi `offlineInstaller`; core aplikasi tetap berasal dari source/build yang sama.

SHA-256 yang dipublikasikan GitHub:

- Standard: `6b93663a3d8b6c4b9039f1ee561ac841e3fa752924d2163851551393648458e9`
- Offline Full: `f0aca58183f8a6192cb77a6918a71f9775660573eea57be192ad3d3464ef0921`

Catatan: field metadata `label` GitHub kosong, tetapi **nama file asset sudah benar dan tidak ambigu**.

## 2. Standard vs Offline Full

### Standard / lightweight

Config normal menggunakan:

```json
"webviewInstallMode": {
  "type": "downloadBootstrapper",
  "silent": true
}
```

Konsekuensi:

- installer sangat kecil;
- jika WebView2 belum ada, proses instalasi bergantung pada bootstrap/download runtime;
- PC studio tanpa koneksi internet atau koneksi diblokir perlu diuji manual.

Workflow juga memberi size guard `<= 60 MB`, sehingga WebView2 offline tidak boleh ikut terbawa tanpa sengaja.

### Offline Full

Override config menggunakan:

```json
"webviewInstallMode": {
  "type": "offlineInstaller",
  "silent": true
}
```

Konsekuensi:

- WebView2 Runtime dibundel;
- cocok untuk PC studio tanpa internet;
- ukuran ~255 MiB memang expected;
- **workflow hanya membangun file ini. Tidak ada langkah install, launch, upgrade, atau smoke test untuk Offline Full.**

## 3. Release notes vs perubahan nyata

### Sesuai dengan code

- Deteksi permukaan halus ditambahkan pada engine TypeScript dan Rust.
- Dua permukaan halus tidak dipaksa memakai LBP/grain noise sebagai bukti arah serat.
- Mode `smooth`, `mixed`, `textured` ditambahkan ke fusion report.
- UI/report menampilkan `Permukaan halus` dan `Arah serat: Tidak berlaku` saat relevan.
- Koreksi warna sekarang memvalidasi kandidat memakai `applyCorrectionToRgb` + Lab + CIEDE2000, yaitu jalur transformasi yang sama dengan preview/export.
- Temperature, tint, exposure, saturation disempurnakan hanya jika error warna turun.
- Tint positif sekarang menaikkan R+B relatif terhadap G sehingga arah magenta/hijau konsisten dengan transformasi RGB.
- Guardrail exposure no-master tetap membatasi exposure.
- Konflik antar-ROI tetap men-zero-kan rekomendasi otomatis.
- Test baru `smooth_surface_and_color.test.ts` memang masuk ke `npm test`.

### Sesuai dengan workflow

Run release `v0.3.8` berhasil untuk:

- frontend/regression tests;
- RGB operator test;
- frontend build;
- Rust tests;
- `cargo check`;
- standard NSIS build;
- upgrade-in-place `v0.3.7 -> v0.3.8`;
- Offline Full NSIS build;
- publish release.

Upgrade test memastikan registry Windows hanya memiliki **1** `Studio Color QC` dan versinya `0.3.8`.

### Catatan wording release notes

Release notes menyebut kasus sintetis menurunkan `7.07 -> 0.00 Delta E 2000`.

Test yang tersimpan di repo **tidak mengunci angka 0.00 sebagai acceptance criterion**. Assertion-nya hanya mewajibkan hasil setelah koreksi:

- lebih kecil dari 45% error awal; dan
- tidak boleh lebih buruk dari error awal.

Jadi angka `7.07 -> 0.00` valid sebagai hasil run sintetis tertentu, tetapi jangan dianggap jaminan bahwa semua foto nyata akan mencapai ΔE00 = 0.

## 4. Gap / risiko tertinggi

### P0-1 — Offline Full belum benar-benar di-install dan di-launch

Workflow hanya `build -> copy -> upload`. Ini gap terbesar karena file 267 MB justru installer yang kemungkinan dipakai untuk studio offline.

### P0-2 — Upgrade test tidak membuka aplikasi

Workflow membuktikan installer overwrite registry dengan benar, tetapi tidak membuktikan app hasil upgrade bisa launch tanpa blank/white screen.

### P0-3 — Tidak ada foto studio nyata di regression test

Smooth-surface test memakai gambar sintetis 32x32 dengan noise terkontrol. Belum membuktikan threshold `isSmooth` aman terhadap:

- noise ISO Canon EOS 80D;
- highlight/specular;
- gradient lampu;
- tekstur finishing tipis;
- compression/RAW development;
- shadow yang tidak merata.

### P0-4 — Koreksi warna sintetis belum membuktikan preview = export pada file studio nyata

Algoritme sudah memakai transformasi yang sama secara code path, tetapi perlu cek output file final. Risiko praktisnya: preview terlihat benar, hasil export bergeser atau clipping/saturation muncul pada area lain.

### P0-5 — WebView2 behavior pada PC studio

Standard installer sangat bergantung pada kondisi WebView2 + network. Offline Full menghindari dependency download, tetapi justru belum di-smoke-test.

### P1 — SmartScreen / Authenticode

Workflow release tidak menunjukkan langkah code-signing Windows eksplisit. Jangan menganggap installer bebas warning hanya karena GitHub Actions sukses. Perlu cek Properties -> Digital Signatures dan perilaku Windows SmartScreen/antivirus di PC studio.

## 5. Manual checks wajib sebelum dipakai operator

Urutan minimum:

1. **PC studio offline / clean condition:** install `Offline-Full-Setup.exe`, launch aplikasi, tutup, launch lagi.
2. **PC existing v0.3.7:** install v0.3.8 di atasnya, cek hanya satu app, shortcut benar, setting/data operator tetap ada, lalu launch.
3. **Standard installer:** coba saat WebView2 sudah ada; lalu tes kondisi WebView2 belum ada dengan internet tersedia/terblokir.
4. **Canon EOS 80D + master panel asli:** buka RAW/foto nyata yang memang dipakai studio.
5. Uji minimal 3 kategori ROI: `permukaan halus`, `serat kayu jelas`, `halus vs berpola`.
6. Pastikan permukaan halus tidak lagi mendapat klaim arah serat palsu.
7. Ambil kasus warna terlalu merah, hijau, dan biru; pastikan rekomendasi RGB arah koreksinya masuk akal bagi operator.
8. Terapkan rekomendasi, lalu bandingkan **preview vs file export** dan hitung/lihat evidence sebelum-sesudah.
9. Uji multi-ROI yang sengaja konflik; rekomendasi otomatis harus dibatalkan/zero.
10. Uji highlight clipping, shadow clipping, dan area guardrail-only agar exposure tidak merusak area tanpa master.
11. Cek Windows SmartScreen/Defender dan Digital Signatures pada **kedua** installer.
12. Reboot PC, launch ulang, pastikan tidak ada duplikat instalasi/shortcut/proses startup aneh.

## 6. Gate sebelum studio rollout

Release boleh dipakai operator setelah semua P0 berikut lolos:

- [ ] Offline Full install + launch tanpa internet
- [ ] Upgrade v0.3.7 -> v0.3.8 di PC nyata dan app tetap launch
- [ ] Tidak ada duplicate app/shortcut/install entry
- [ ] Canon EOS 80D real-photo smoke test lolos
- [ ] Smooth surface tidak false-positive sebagai grain
- [ ] Textured surface tetap terbaca sebagai textured
- [ ] Preview correction konsisten dengan exported image
- [ ] Multi-ROI conflict tetap memblok koreksi otomatis
- [ ] Guardrail exposure tetap aman
- [ ] SmartScreen/AV behavior diketahui dan dapat diterima

Jika satu P0 gagal: **BLOCK studio rollout dan kembali ke IDENTIFIKASI -> FIX -> TEST.**
