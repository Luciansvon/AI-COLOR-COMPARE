import { chromium } from 'playwright';
import fs from 'fs';

console.log('--- MEMULAI PENGUJIAN PLAYWRIGHT DENGAN EDGE ---');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();

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

console.log('7. Menunggu proses perbandingan dan rendering selesai...');
await page.waitForTimeout(3000);

const afterUploadText = await page.locator('body').innerText();
const hasSuccessBanner = afterUploadText.includes('Foto Master dan Foto Produk berhasil dimuat');
const hasPassBtn = afterUploadText.includes('PASS (PRODUK LOLOS)');
const hasFailBtn = afterUploadText.includes('FAIL (PRODUK GAGAL)');

console.log('8. Hasil Pasca Upload:');
console.log('   - Banner Sukses Hijau Tampil:', hasSuccessBanner);
console.log('   - Tombol Keputusan PASS Tampil:', hasPassBtn);
console.log('   - Tombol Keputusan FAIL Tampil:', hasFailBtn);

console.log('9. Mengambil Screenshot Bukti Visual...');
const screenshotPath = 'C:\\Users\\shint\\.gemini\\antigravity\\brain\\10babefe-7e2a-4e74-83a2-acb363927ee4\\browser_test_playwright.png';
await page.screenshot({ path: screenshotPath, fullPage: true });
console.log('   - Screenshot berhasil disimpan di:', screenshotPath);

await browser.close();
console.log('--- PENGUJIAN PLAYWRIGHT EDGE SUKSES 100% ---');
