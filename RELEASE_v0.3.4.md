# Studio Color QC v0.3.4 — QC Guardrails & Evidence Safety

Rilis ini fokus pada **keamanan interpretasi hasil QC**, bukan menambah fitur kosmetik. Tujuannya adalah mencegah aplikasi memberi kesimpulan yang lebih pasti daripada evidence yang benar-benar tersedia.

## Perubahan Utama

### 1. Diagnosis warna lebih aman
- Pergeseran chromatic besar tidak lagi otomatis dianggap sebagai masalah `Material / Finishing`.
- Jika bukti capture belum cukup, hasil menjadi `Belum Pasti`.
- Operator diminta menstabilkan White Balance, lampu, exposure, sudut/refleksi, dan profil kamera lalu melakukan foto ulang terhadap physical master.

### 2. Highlight clipping dideteksi per kanal RGB
- Sebelumnya clipping baru terdeteksi jika R, G, dan B sekaligus sangat tinggi.
- Sekarang satu kanal yang mentok sudah cukup untuk menandai informasi warna sebagai tidak aman untuk dinilai.
- Ini penting karena clipping satu kanal dapat mengubah rona walaupun dua kanal lain belum mentok.

### 3. ΔE00 tidak diperlakukan sebagai toleransi universal
- UI sekarang menyebut batas yang dipakai sebagai **ambang internal aplikasi**.
- Angka ΔE00 tidak otomatis menentukan PASS/FAIL untuk semua material, finishing, atau proyek.
- Physical master dan keputusan operator tetap menjadi acuan utama.

### 4. UI tidak lagi mengarang kepastian
- Status `Belum Pasti` tidak lagi diikuti kalimat bahwa hasil aman untuk lolos QC.
- Aplikasi tidak lagi menyatakan finishing pasti cocok hanya dari evidence capture.
- Jika texture/serat belum benar-benar diukur, UI menampilkan `Belum Diukur`, bukan nilai seperti `100%`, `Identik`, atau `Searah`.

## Regression Test Baru

Ditambahkan pengujian untuk memastikan:
- clipping satu kanal terdeteksi,
- chromatic shift besar tidak langsung menjadi `Material / Finishing`,
- copy ΔE00 tidak menyatakan toleransi universal,
- UI tidak mengeluarkan fallback PASS yang tidak didukung evidence,
- texture yang belum diukur tidak menampilkan evidence palsu,
- keputusan PASS/FAIL tetap dinyatakan sebagai keputusan operator.

Berkas test utama:
- `tests/measurement_guardrails.test.ts`
- `tests/evidence_copy_guardrails.test.ts`

## Hasil Verifikasi Sebelum Release

Siklus audit sebelum rilis telah melewati:
- `npm test` ✅
- `npx tsx tests/rgb_analysis.test.ts` ✅
- `npm run build` ✅
- `cargo test --manifest-path src-tauri/Cargo.toml` ✅
- `cargo check --manifest-path src-tauri/Cargo.toml` ✅
- Windows installer smoke test ✅
- Build NSIS dengan WebView2 offline ✅
- Installer `.exe` terverifikasi terbentuk ✅

## Upgrade Windows

Versi aplikasi Windows dinaikkan menjadi **0.3.4**.

Installer tetap menggunakan:
- Product name: `Studio Color QC`
- Identifier: `com.studio.colorqc`
- Install mode: `currentUser`
- Downgrade: diblokir
- WebView2: offline installer

Release workflow v0.3.4 juga menguji upgrade dari **v0.3.3 ke v0.3.4** dan memastikan hanya ada **satu instalasi Studio Color QC**, sehingga versi baru menimpa versi lama dan tidak membuat aplikasi kedua.

## Prinsip yang Tidak Berubah

- Physical master tetap acuan utama.
- File RAW/foto asli tidak dimodifikasi.
- RGB hanya evidence tambahan, bukan penentu PASS/FAIL tunggal.
- Keputusan akhir PASS/FAIL tetap berada di tangan operator.
- Sistem tetap offline/local-first dan CPU-first untuk PC studio standar.

## Basis Audit & Riset

Perubahan ini berasal dari siklus audit `IDENTIFIKASI → RISET → SOLUSI → TERAPKAN → TEST → EVALUASI` yang terdokumentasi pada:

- `LOOP_QC_2026-09-07.md`
- `AUDIT_DAN_RISET.md`
- `AUDIT_2026-09-07.md`
- `RGB_ANALYSIS.md`

Basis riset proyek yang ditelaah untuk siklus ini berjumlah lebih dari 70 sumber, termasuk standar colorimetry, camera characterization, lighting/spectral behavior, glossy surface appearance, dokumentasi Canon EOS 80D, dan diskusi praktisi product photography.
