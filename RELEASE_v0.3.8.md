# Studio Color QC v0.3.8

Rilis ini memperbaiki analisis permukaan halus dan membuat penerapan koreksi warna lebih sesuai dengan foto master.

## Deteksi permukaan halus

- Permukaan polos tanpa serat dominan kini dikenali sebagai permukaan halus.
- Noise kamera ringan tidak lagi dipaksa masuk ke perbandingan pola LBP sebagai serat.
- Dua permukaan halus dinilai dari kelas permukaannya tanpa membuat klaim arah serat palsu.
- Permukaan halus dibanding permukaan berpola tetap ditandai berbeda.
- Tampilan operator dan laporan menulis `Permukaan halus` serta `Arah serat: Tidak berlaku`.
- Logika yang sama diterapkan pada engine TypeScript dan Rust.

## Koreksi warna

- Rekomendasi awal diuji ulang menggunakan transformasi RGB yang sama dengan preview dan ekspor.
- Parameter temperature, tint, exposure, dan saturation disempurnakan hanya ketika hasil CIEDE2000 membaik.
- Tint magenta/hijau kini mengubah keseimbangan kanal merah, hijau, dan biru secara konsisten.
- Guardrail exposure pada area tanpa master tetap dihormati.
- Konflik antar-area tetap membatalkan koreksi otomatis.

## Pengujian

- Seluruh rangkaian test frontend dan koreksi lulus.
- Seluruh pengujian Rust lulus.
- Kasus regresi membuktikan permukaan halus tahan terhadap noise ringan dan tidak tertukar dengan permukaan berpola.
- Kasus koreksi sintetis menurunkan perbedaan warna dari 7,07 menjadi 0,00 Delta E 2000.
- Build TypeScript, Vite, dan EXE Tauri lulus.
- Workflow menguji upgrade v0.3.7 ke v0.3.8 dan memastikan hanya ada satu instalasi.

## Batas pengujian

Pengujian visual dengan foto studio dilakukan oleh Bima. Keputusan akhir PASS/FAIL tetap milik operator.
