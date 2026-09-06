from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old in text:
        if text.count(old) != 1:
            raise RuntimeError(f"Patch {path}: target unik ditemukan {text.count(old)} kali")
        write(path, text.replace(old, new, 1))
        return
    if new in text:
        return
    raise RuntimeError(f"Patch {path}: target tidak ditemukan: {old[:120]!r}")


def replace_all(path: str, old: str, new: str) -> None:
    text = read(path)
    if old in text:
        write(path, text.replace(old, new))
        return
    if new in text:
        return
    raise RuntimeError(f"Patch {path}: target tidak ditemukan: {old[:120]!r}")


def regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count == 1:
        write(path, updated)
        return
    if replacement in text:
        return
    raise RuntimeError(f"Patch regex {path} gagal: {pattern!r}")


def append_once(path: str, marker: str, block: str) -> None:
    text = read(path)
    if marker in text:
        return
    write(path, text.rstrip() + "\n\n" + block.strip() + "\n")


# 1. Layer keterbacaan low vision, aktif untuk seluruh aplikasi operator.
append_once(
    "src/index.css",
    "Operator Low-Vision Readability Layer",
    r"""
/* Operator Low-Vision Readability Layer
 * Minimum teks operasional 16px. Angka bukti utama jauh lebih besar.
 */
.operator-readable {
  font-size: 1rem;
  line-height: 1.55;
}

.operator-readable [class~="text-[8px]"],
.operator-readable [class~="text-[9px]"],
.operator-readable [class~="text-[10px]"],
.operator-readable [class~="text-[11px]"],
.operator-readable .text-xs {
  font-size: 1rem !important;
  line-height: 1.5 !important;
}

.operator-readable .text-sm {
  font-size: 1.125rem !important;
  line-height: 1.5 !important;
}

.operator-readable .text-base {
  font-size: 1.25rem !important;
  line-height: 1.45 !important;
}

.operator-readable .text-lg {
  font-size: 1.375rem !important;
  line-height: 1.4 !important;
}

.operator-readable .text-xl {
  font-size: 1.5rem !important;
  line-height: 1.35 !important;
}

.operator-readable .text-2xl {
  font-size: 1.75rem !important;
  line-height: 1.3 !important;
}

.operator-readable .text-3xl {
  font-size: 2rem !important;
  line-height: 1.2 !important;
}

.operator-readable .operator-number {
  font-size: clamp(1.9rem, 2.5vw, 2.6rem) !important;
  line-height: 1.05 !important;
  font-weight: 800 !important;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.operator-readable button,
.operator-readable label[class*="cursor-pointer"],
.operator-readable [role="button"] {
  min-height: 3rem;
}

.operator-readable button {
  min-width: 3rem;
}

.operator-readable input:not([type="range"]),
.operator-readable textarea,
.operator-readable select {
  font-size: 1rem !important;
  line-height: 1.5 !important;
  min-height: 3rem;
}

.operator-readable input[type="range"] {
  height: 0.8rem !important;
}

.operator-readable :where(button, input, textarea, select, [role="button"]):focus-visible {
  outline: 3px solid #fbbf24 !important;
  outline-offset: 3px !important;
}

.operator-readable p,
.operator-readable li {
  max-width: 80ch;
}

.operator-readable ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

@media (max-width: 760px) {
  .operator-readable button,
  .operator-readable label[class*="cursor-pointer"] {
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .operator-readable *,
  .operator-readable *::before,
  .operator-readable *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
""",
)

replace_once(
    "src/App.tsx",
    'className="min-h-screen bg-studio-950 text-studio-100 flex flex-col font-sans"',
    'className="operator-readable min-h-screen bg-studio-950 text-studio-100 flex flex-col font-sans"',
)
replace_once(
    "src/App.tsx",
    '<main className="flex-1 px-6 pt-6">',
    '<main className="flex-1 px-4 md:px-8 pt-6 md:pt-8">',
)
replace_once(
    "src/App.tsx",
    'bg-studio-900 text-xs font-medium px-4 py-3 rounded-xl',
    'bg-studio-900 text-base font-semibold px-5 py-4 rounded-xl',
)

# 2. Main workflow UI: lebih lega, tidak memadatkan tiga ROI ke tiga kolom kecil.
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    'className="space-y-6 max-w-7xl mx-auto pb-12"',
    'className="space-y-8 max-w-[1600px] mx-auto pb-16"',
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    "rois.length === 1 ? 'w-full' : 'grid grid-cols-1 md:grid-cols-3 gap-4'",
    "rois.length === 1 ? 'w-full' : 'grid grid-cols-1 xl:grid-cols-2 gap-6'",
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'w-full md:w-1/3 p-3 rounded-xl border transition-all',
    'w-full md:w-1/3 p-4 min-h-24 rounded-xl border transition-all',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
    'w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'text-[10px] uppercase tracking-wider font-semibold opacity-75',
    'text-base uppercase tracking-wide font-bold opacity-90',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'text-xs font-bold truncate',
    'text-lg font-bold leading-snug',
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    'className="text-sm font-semibold uppercase tracking-wider text-studio-200"',
    'className="text-2xl font-bold text-white"',
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    'className="text-base font-bold text-white">\n                  Keputusan Akhir Produk (Operator Authority)',
    'className="text-2xl font-extrabold text-white">\n                  Keputusan Akhir Produk',
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    'className="text-xs text-studio-400 mt-1 max-w-xl leading-relaxed"',
    'className="text-base text-studio-300 mt-2 max-w-3xl leading-relaxed"',
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """              <button
                onClick={() => handleProductDecision('PASS')}
                className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
""",
    """              <button
                id="btn-final-pass"
                onClick={() => handleProductDecision('PASS')}
                className={`px-8 py-4 rounded-xl text-lg font-extrabold uppercase tracking-wide flex items-center gap-3 transition-all shadow-lg ${
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """              <button
                onClick={() => handleProductDecision('FAIL')}
                className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
""",
    """              <button
                id="btn-final-fail"
                onClick={() => handleProductDecision('FAIL')}
                className={`px-8 py-4 rounded-xl text-lg font-extrabold uppercase tracking-wide flex items-center gap-3 transition-all shadow-lg ${
""",
)

# 3. Evidence: angka utama besar, maksimum dua kolom, Delta E ditampilkan apa adanya.
replace_once(
    "src/components/qc/EvidenceCard.tsx",
    """  // Kalkulasi persentase akurasi warna dari deltaE00 (skala 0 - 100%)
  const colorAccuracyPercent = measured
    ? Math.max(0, Math.min(100, Math.round(100 - measured.deltaE00 * 7.5)))
    : 100;

""",
    "",
)
replace_once(
    "src/components/qc/EvidenceCard.tsx",
    'className="text-base font-bold text-white tracking-wide"',
    'className="text-2xl font-extrabold text-white tracking-tight"',
)
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'w-14 h-14 rounded-xl border-2',
    'w-20 h-20 rounded-xl border-2',
)
replace_once(
    "src/components/qc/EvidenceCard.tsx",
    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5',
    'grid grid-cols-1 lg:grid-cols-2 gap-5',
)
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'text-sm font-bold font-mono text-studio-200',
    'operator-number font-bold font-mono text-studio-100',
)
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'text-base font-bold font-mono text-emerald-400',
    'operator-number font-bold font-mono text-emerald-300',
)
replace_once(
    "src/components/qc/EvidenceCard.tsx",
    """                  <span className="text-[10px] text-studio-500 block">Tingkat Kecocokan</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="operator-number font-bold font-mono text-emerald-300">{colorAccuracyPercent}%</span>
                    <span className="text-xs text-studio-400 font-medium">Akurat</span>
                  </div>
""",
    """                  <span className="text-base text-studio-300 block">Skor Selisih Warna</span>
                  <div className="flex items-end justify-center gap-2 mt-1">
                    <span className="operator-number font-bold font-mono text-amber-300">{measured.deltaE00}</span>
                    <span className="text-base text-studio-300 font-semibold pb-1">Delta E00</span>
                  </div>
                  <p className="text-base text-studio-400 mt-2">
                    {measured.deltaE00 <= 2.2
                      ? 'Dalam toleransi standar'
                      : measured.deltaE00 <= 4.5
                      ? 'Perlu dicek operator'
                      : 'Perbedaan warna jelas'}
                  </p>
""",
)
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'Peta Petak Serat Kayu AI (AnomalyDINO / PatchCore Heatmap Grid)',
    'Peta Perbedaan Serat (Analisis Patch Deterministik)',
)
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'Peta Petak Serat Kayu AI (AnomalyDINO)',
    'Peta Perbedaan Serat',
)

# 4. Image viewer: judul dan resize handles lebih mudah dilihat/ditangkap.
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    'className="text-xs font-bold uppercase tracking-wider text-studio-100"',
    'className="text-xl font-extrabold text-white"',
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    'className="text-[11px] text-studio-400 truncate max-w-xs"',
    'className="text-base text-studio-300 max-w-xl leading-snug"',
)
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    'w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full',
    'w-5 h-5 bg-white border-2 border-amber-500 rounded-full',
)
replace_all("src/components/qc/InteractiveImageViewer.tsx", '-top-1.5 -left-1.5 w-5 h-5', '-top-2.5 -left-2.5 w-5 h-5')
replace_all("src/components/qc/InteractiveImageViewer.tsx", '-top-1.5 -right-1.5 w-5 h-5', '-top-2.5 -right-2.5 w-5 h-5')
replace_all("src/components/qc/InteractiveImageViewer.tsx", '-bottom-1.5 -left-1.5 w-5 h-5', '-bottom-2.5 -left-2.5 w-5 h-5')
replace_all("src/components/qc/InteractiveImageViewer.tsx", '-bottom-1.5 -right-1.5 w-5 h-5', '-bottom-2.5 -right-2.5 w-5 h-5')

# 5. Panel koreksi dan modal dibuat lega; global readability layer menangani teks kecilnya.
replace_once(
    "src/components/qc/CorrectionPanel.tsx",
    'className="flex items-center justify-between border-b border-studio-800 pb-3"',
    'className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-studio-800 pb-4"',
)
replace_once(
    "src/components/qc/CorrectionPanel.tsx",
    'className="text-sm font-semibold text-white">Rekomendasi Koreksi Warna',
    'className="text-2xl font-bold text-white">Rekomendasi Koreksi Warna',
)
replace_once(
    "src/components/qc/CorrectionPanel.tsx",
    'grid grid-cols-1 md:grid-cols-3 gap-4 pt-1',
    'grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2',
)
replace_once(
    "src/components/qc/CorrectionPanel.tsx",
    'className="pt-2 border-t border-studio-800 flex items-center justify-between"',
    'className="pt-4 border-t border-studio-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"',
)
replace_once("src/components/qc/DecisionModal.tsx", 'max-w-md w-full p-6', 'max-w-2xl w-full p-6 md:p-8')
replace_once("src/components/qc/DecisionModal.tsx", 'space-y-2 max-h-56 overflow-y-auto pr-1', 'space-y-3 max-h-[50vh] overflow-y-auto pr-2')
replace_once("src/components/qc/DecisionModal.tsx", 'w-4 h-4 rounded border flex items-center justify-center', 'w-6 h-6 rounded border-2 flex items-center justify-center')
replace_once("src/components/qc/DecisionModal.tsx", 'rows={2}', 'rows={4}')
replace_once("src/components/master/MasterLibraryModal.tsx", 'max-w-xl w-full p-6', 'max-w-3xl w-full p-6 md:p-8')
replace_all("src/components/master/MasterLibraryModal.tsx", 'grid grid-cols-2 gap-3', 'grid grid-cols-1 md:grid-cols-2 gap-4')

# 6. Browser test: hard assertions untuk min font, target utama, dan reflow 200%.
test_path = "tests/test_browser.mjs"
test = read(test_path)
if "viewport: { width: 1440, height: 1000 }" not in test:
    test = test.replace(
        "const page = await browser.newPage();",
        "const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });\nfs.mkdirSync('test-artifacts', { recursive: true });",
        1,
    )

test = test.replace("const hasHeatmap = latestText.includes('PETA PETAK SERAT KAYU AI');", "const hasHeatmap = latestText.includes('PETA PERBEDAAN SERAT');")
test = test.replace("console.log('   - Peta Petak Serat Kayu AI (AnomalyDINO) Tampil:', hasHeatmap);", "console.log('   - Peta Perbedaan Serat Deterministik Tampil:', hasHeatmap);")
test = re.sub(r"const screenshotPath = .*?;", "const screenshotPath = 'test-artifacts/browser_test_playwright.png';", test, count=1)
test = re.sub(r"const reportScreenshotPath = .*?;", "const reportScreenshotPath = 'test-artifacts/qc_certificate_report_verified.png';", test, count=1)

marker = "// ACCESSIBILITY READABILITY ASSERTIONS"
if marker not in test:
    insertion = "console.log('13. Mengambil Screenshot Bukti Visual Layar Utama...');"
    assertions = r"""
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
"""
    if insertion not in test:
        raise RuntimeError("Titik sisip accessibility assertions tidak ditemukan")
    test = test.replace(insertion, assertions, 1)
    test = test.replace("console.log('14. Menguji Modal Laporan Pemeriksaan QC", "console.log('15. Menguji Modal Laporan Pemeriksaan QC", 1)

write(test_path, test)
print("Patch layout low-vision v2 selesai diterapkan.")
