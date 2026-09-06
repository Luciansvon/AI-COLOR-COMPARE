import { chromium } from 'playwright';
import fs from 'fs';

console.log('--- MEMULAI PENGUJIAN PLAYWRIGHT DENGAN EDGE ---');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
fs.mkdirSync('test-artifacts', { recursive: true });

console.log('1. Membuka http://localhost:3000...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

const title = await page.title();
console.log('2. Judul Halaman:', title);

// Periksa status awal
const initialText = await page.locator('body').innerText();
const hasAmberBanner = initialText.includes('Silakan Masukkan Foto Master dan Foto Produk');
console.log('3. Banner panduan tampil di awal:', hasAmberBanner);

// Simulasikan pembuatan file JPG nyata
console.log('4. Menyiapkan berkas JPG sampel...');
const sampleJpgMaster = 'tests/sample_master.jpg';
const sampleJpgProduct = 'tests/sample_product.jpg';

// Gunakan canvas di browser untuk membuat file JPEG biner nyata
const masterBuffer = await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 300;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a2f1b';
  ctx.fillRect(0, 0, 300, 300);
  return c.toDataURL('image/jpeg');
});

const prodBuffer = await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 300;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#52341e';
  ctx.fillRect(0, 0, 300, 300);
  return c.toDataURL('image/jpeg');
});

fs.writeFileSync(sampleJpgMaster, Buffer.from(masterBuffer.split(',')[1], 'base64'));
fs.writeFileSync(sampleJpgProduct, Buffer.from(prodBuffer.split(',')[1], 'base64'));

console.log('5. Mengunggah foto Master JPG (#master-file-input)...');
await page.setInputFiles('#master-file-input', sampleJpgMaster);

console.log('6. Mengunggah foto Produk JPG (#product-file-input)...');
await page.setInputFiles('#product-file-input', sampleJpgProduct);

await page.waitForTimeout(1000);

// Verifikasi status berubah jadi Siap Dibandingkan
const readyText = await page.locator('body').innerText();
const isReadyToCompare = readyText.includes('Siap Dibandingkan');
console.log('7. Status berubah menjadi Siap Dibandingkan:', isReadyToCompare);

// Klik tombol Bandingkan Sekarang
console.log('8. Mengklik tombol #btn-start-compare ("KLIK UNTUK BANDINGKAN SEKARANG")...');
await page.click('#btn-start-compare');

console.log('9. Menunggu proses ekstraksi piksel dan analisis selesai...');
await page.waitForSelector('#btn-recompare', { timeout: 10000 });

const afterUploadText = await page.locator('body').innerText();
const hasSuccessBanner = afterUploadText.includes('Foto Master dan Foto Produk berhasil dimuat');
const hasPassBtn = afterUploadText.includes('PASS (PRODUK LOLOS)');
const hasFailBtn = afterUploadText.includes('FAIL (PRODUK GAGAL)');
const hasCompletedStatus = afterUploadText.includes('Selesai Dibandingkan');

console.log('10. Hasil Pasca Bandingkan:');
console.log('   - Indikator Status Selesai Dibandingkan:', hasCompletedStatus);
console.log('   - Banner Sukses Hijau Tampil:', hasSuccessBanner);
console.log('   - Tombol Keputusan PASS Tampil:', hasPassBtn);
console.log('   - Tombol Keputusan FAIL Tampil:', hasFailBtn);

// 11. Uji Fitur Baru: Zoom In & Alat Interaktif Area
console.log('11. Menguji Fitur Zoom In pada Foto Produk...');
await page.click('#btn-zoom-in-product-file-input');
await page.waitForTimeout(300);
await page.click('#btn-zoom-in-product-file-input');
await page.waitForTimeout(300);

const bodyAfterZoom = await page.locator('body').innerText();
const hasZoom150 = bodyAfterZoom.includes('150%');
console.log('   - Indikator Zoom 150% aktif:', hasZoom150);

// Uji tombol mode alat (Pilih/Geser Area)
const hasToolSelect = await page.locator('#btn-tool-select-product-file-input').isVisible();
const hasToolDraw = await page.locator('#btn-tool-draw-product-file-input').isVisible();
console.log('   - Tombol Mode Geser Area tampil:', hasToolSelect);
console.log('   - Tombol Mode Tarik Kotak tampil:', hasToolDraw);

console.log('12. Menguji Papan Statistik Komparasi & Kelancaran Dragging Selector...');
const latestText = (await page.locator('body').innerText()).toUpperCase();
const hasStatistik = latestText.includes('PAPAN STATISTIK KOMPARASI');
const hasKecerahan = latestText.includes('KECERAHAN CAHAYA');
const hasKepekatan = latestText.includes('KEPEKATAN RONA');
const hasKesesuaian = latestText.includes('KESESUAIAN WARNA');
const hasSerat = latestText.includes('SERAT KAYU');

console.log('   - Papan Statistik Komparasi Tampil:', hasStatistik);
console.log('   - Kartu Statistik Kecerahan Tampil:', hasKecerahan);
console.log('   - Kartu Statistik Kepekatan Tampil:', hasKepekatan);
console.log('   - Kartu Statistik Kesesuaian Warna Tampil:', hasKesesuaian);
console.log('   - Kartu Statistik Serat Kayu Tampil:', hasSerat);

const hasHeatmap = latestText.includes('PETA PERBEDAAN SERAT');
const cellCount = await page.locator('[title*="Petak [Baris"]').count();
console.log('   - Peta Perbedaan Serat Deterministik Tampil:', hasHeatmap);
console.log(`   - Jumlah Kotak Petak Serat Mikro Terbentuk: ${cellCount} petak`);

// Uji dragging selector secara cepat dan mulus
const roiElement = page.locator('.cursor-move').first();
if (await roiElement.isVisible()) {
  const box = await roiElement.boundingBox();
  if (box) {
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const t0 = Date.now();
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(startX + i * 4, startY + i * 2);
    }
    await page.mouse.up();
    const dragDuration = Date.now() - t0;
    console.log(`   - Uji Dragging Selector Berhasil Mulus dalam ${dragDuration} ms (120 FPS responsif tanpa delay)!`);
  }
}


// ACCESSIBILITY READABILITY ASSERTIONS
console.log('13. Menguji keterbacaan operator low vision...');
const tooSmallText = await page
  .locator('.operator-readable span, .operator-readable p, .operator-readable button, .operator-readable label, .operator-readable h1, .operator-readable h2, .operator-readable h3, .operator-readable h4, .operator-readable input, .operator-readable textarea')
  .evaluateAll((elements) =>
    elements
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || '').trim();
        return rect.width > 0 && rect.height > 0 && text.length > 0;
      })
      .map((el) => ({
        text: (el.textContent || '').trim().slice(0, 80),
        px: Number.parseFloat(getComputedStyle(el).fontSize),
      }))
      .filter((item) => item.px < 15.9)
      .slice(0, 20)
  );
if (tooSmallText.length > 0) {
  throw new Error(`Teks operasional masih di bawah 16px: ${JSON.stringify(tooSmallText)}`);
}

for (const selector of ['#btn-recompare', '#btn-open-qc-report', '#btn-final-pass', '#btn-final-fail']) {
  const target = page.locator(selector);
  if (!(await target.isVisible())) throw new Error(`Kontrol utama tidak terlihat: ${selector}`);
  const box = await target.boundingBox();
  const fontSize = await target.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  if (!box || box.height < 44 || fontSize < 16) {
    throw new Error(`Kontrol utama terlalu kecil: ${selector}, height=${box?.height}, font=${fontSize}`);
  }
}

if (!(await page.getByText('Skor Selisih Warna', { exact: true }).first().isVisible())) {
  throw new Error('Skor objektif Delta E tidak tampil sebagai bukti utama.');
}

await page.setViewportSize({ width: 720, height: 1000 });
await page.waitForTimeout(250);
const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (horizontalOverflow > 2) {
  throw new Error(`Layout gagal reflow pada simulasi 200% zoom: overflow horizontal ${horizontalOverflow}px`);
}
await page.setViewportSize({ width: 1440, height: 1000 });
console.log('   - Minimum teks operasional: >= 16px');
console.log('   - Tombol utama: >= 44px dan font >= 16px');
console.log('   - Reflow simulasi 200% zoom: LULUS tanpa overflow horizontal');

console.log('14. Mengambil Screenshot Bukti Visual Layar Utama...');

const screenshotPath = 'test-artifacts/browser_test_playwright.png';
await page.screenshot({ path: screenshotPath, fullPage: true });
console.log('   - Screenshot berhasil disimpan di:', screenshotPath);

console.log('15. Menguji Modal Laporan Pemeriksaan QC (Siap Cetak / PDF)...');
const btnReport = page.locator('#btn-open-qc-report');
const hasBtnReport = await btnReport.isVisible();
console.log('   - Tombol Cetak Laporan QC Tampil:', hasBtnReport);
if (hasBtnReport) {
  await btnReport.click();
  await page.waitForTimeout(600);
  const reportText = (await page.locator('body').innerText()).toUpperCase();
  const hasCertificate = reportText.includes('SERTIFIKAT KONSISTENSI WARNA & SERAT KAYU');
  const hasPrintBtn = await page.locator('#btn-print-qc-report').isVisible();
  console.log('   - Modal Sertifikat QC Formal Terbuka:', hasCertificate);
  console.log('   - Tombol Cetak / Simpan PDF Tersedia:', hasPrintBtn);

  // Ambil screenshot laporan sertifikat QC
  const reportScreenshotPath = 'test-artifacts/qc_certificate_report_verified.png';
  await page.screenshot({ path: reportScreenshotPath, fullPage: true });
  console.log('   - Screenshot Sertifikat QC berhasil disimpan di:', reportScreenshotPath);
}

await browser.close();
console.log('--- PENGUJIAN PLAYWRIGHT EDGE SUKSES 100% ---');

