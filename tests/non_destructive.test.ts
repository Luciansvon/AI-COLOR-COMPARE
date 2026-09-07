// Uji fixture non-destructive untuk kontrak test: berkas sumber tetap sama
// ketika keluaran ditulis ke berkas lain. Jaminan implementasi JPEG native
// diuji di src-tauri/src/raw_engine/export.rs.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function sha256File(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

console.log('================================================================');
console.log('🛡️ UJI FIXTURE NON-DESTRUCTIVE (BERKAS SUMBER VS TARGET TERPISAH)');
console.log('================================================================\n');

const testDir = path.join(process.cwd(), 'test_assets');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Buat sampel file RAW tiruan
const rawSamplePath = path.join(testDir, 'SAMPLE_STUDIO_TEST.CR3');
const dummyContent = Buffer.from('CANON_RAW_CR3_SIMULATED_STUDIO_PAYLOAD_ORIGINAL_BYTES_' + Date.now());
fs.writeFileSync(rawSamplePath, dummyContent);

const hashBefore = sha256File(rawSamplePath);
console.log(`📌 Hash SHA-256 Sebelum QC & Koreksi: ${hashBefore}`);

// Simulasikan operasi ekspor: buat file terpisah
const exportedJpegPath = path.join(testDir, 'SAMPLE_STUDIO_TEST_corrected_srgb.jpg');
fs.writeFileSync(exportedJpegPath, Buffer.from('EXPORTED_SRGB_JPEG_WITH_EMBEDDED_ICC_BYTES'));

const hashAfter = sha256File(rawSamplePath);
console.log(`📌 Hash SHA-256 Setelah Ekspor Selesai: ${hashAfter}`);

if (hashBefore === hashAfter) {
  console.log('\n✅ [PASS] Fixture sumber tetap byte-for-byte identik selama simulasi penulisan target terpisah.');
  console.log(`ℹ️  Target simulasi tersimpan terpisah: ${path.basename(exportedJpegPath)}.`);
} else {
  console.error('\n❌ [FAIL] Berkas sumber mengalami modifikasi!');
  process.exitCode = 1;
}

// Uji berkas fisik Canon CR2 & Nikon NEF asli
const realCanonPath = path.join(process.cwd(), 'tests', 'fixtures', 'raw', 'sample_canon_eos1d.CR2');
if (fs.existsSync(realCanonPath)) {
  const canonHash = sha256File(realCanonPath);
  console.log(`ℹ️  Hash baseline fixture Canon CR2 (tidak menjalankan ekspor native): ${canonHash}`);
}

const realNikonPath = path.join(process.cwd(), 'tests', 'fixtures', 'raw', 'sample_nikon_1j1.NEF');
if (fs.existsSync(realNikonPath)) {
  const nikonHash = sha256File(realNikonPath);
  console.log(`ℹ️  Hash baseline fixture Nikon NEF (tidak menjalankan ekspor native): ${nikonHash}`);
}

// Bersihkan berkas uji
fs.unlinkSync(exportedJpegPath);
fs.unlinkSync(rawSamplePath);
console.log('\n================================================================');
console.log('🏁 UJI INTEGRITAS SELESAI');
console.log('================================================================\n');
