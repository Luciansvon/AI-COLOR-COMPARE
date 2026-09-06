from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_all(path: str, old: str, new: str) -> None:
    text = read(path)
    if old in text:
        write(path, text.replace(old, new))
        return
    if new in text:
        return
    raise RuntimeError(f"Patch {path!r} gagal: target tidak ditemukan: {old[:100]!r}")


def append_once(path: str, marker: str, block: str) -> None:
    text = read(path)
    if marker in text:
        return
    write(path, text.rstrip() + "\n\n" + block.strip() + "\n")


# -----------------------------------------------------------------------------
# 1) Layer keterbacaan default untuk operator low vision.
#    Semua teks operasional minimum 16 px. Angka bukti utama jauh lebih besar.
# -----------------------------------------------------------------------------
append_once(
    "src/index.css",
    "Operator Low-Vision Readability Layer",
    r"""
/* Operator Low-Vision Readability Layer
 * Prinsip: layar QC harus terbaca tanpa mengandalkan zoom browser sebagai satu-satunya jalan keluar.
 * Detail kecil tetap ada, tetapi tidak boleh jatuh di bawah 16px pada layar utama operator.
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

/* Scrollbar sedikit lebih besar agar lebih mudah dilihat dan ditangkap mouse. */
.operator-readable ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

@media (max-width: 760px) {
  .operator-readable {
    font-size: 1rem;
  }

  .operator-readable button,
  .operator-readable label[class*="cursor-pointer"] {
    width: 100%;
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

replace_all(
    "src/App.tsx",
    'className="min-h-screen bg-studio-950 text-studio-100 flex flex-col font-sans"',
    'className="operator-readable min-h-screen bg-studio-950 text-studio-100 flex flex-col font-sans"',
)
replace_all(
    "src/App.tsx",
    '<main className="flex-1 px-6 pt-6">',
    '<main className="flex-1 px-4 md:px-8 pt-6 md:pt-8">',
)
replace_all(
    "src/App.tsx",
    'bg-studio-900 text-xs font-medium px-4 py-3 rounded-xl',
    'bg-studio-900 text-base font-semibold px-5 py-4 rounded-xl',
)


# -----------------------------------------------------------------------------
# 2) Main QC: longgarkan layout dan prioritaskan status/angka/tindakan operator.
# -----------------------------------------------------------------------------
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'className="space-y-6 max-w-7xl mx-auto pb-12"',
    'className="space-y-8 max-w-[1600px] mx-auto pb-16"',
)
replace_all(
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
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'className="text-sm font-semibold uppercase tracking-wider text-studio-200"',
    'className="text-2xl font-bold text-white"',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'className="text-base font-bold text-white">\n                  Keputusan Akhir Produk (Operator Authority)',
    'className="text-2xl font-extrabold text-white">\n                  Keputusan Akhir Produk',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'className="text-xs text-studio-400 mt-1 max-w-xl leading-relaxed"',
    'className="text-base text-studio-300 mt-2 max-w-3xl leading-relaxed"',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${',
    'id="btn-final-pass"\n                className={`px-8 py-4 rounded-xl text-lg font-extrabold uppercase tracking-wide flex items-center gap-3 transition-all shadow-lg ${',
)
# Kedua tombol awalnya punya class identik. Setelah PASS berubah, target yang tersisa adalah FAIL.
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${',
    'id="btn-final-fail"\n                className={`px-8 py-4 rounded-xl text-lg font-extrabold uppercase tracking-wide flex items-center gap-3 transition-all shadow-lg ${',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold uppercase tracking-wider',
    'px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-lg font-extrabold uppercase tracking-wide',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'px-8 py-3.5 rounded-xl bg-sky-600/80 text-white text-xs font-bold uppercase tracking-wider',
    'px-8 py-4 rounded-xl bg-sky-600/80 text-white text-lg font-bold uppercase tracking-wide',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider',
    'px-6 py-4 rounded-xl text-base font-bold uppercase tracking-wide',
)
replace_all(
    "src/components/qc/MainQCScreen.tsx",
    'px-5 py-3 rounded-xl bg-studio-800 hover:bg-studio-700 text-studio-200 hover:text-white border border-studio-700 text-xs font-bold uppercase tracking-wider',
    'px-6 py-4 rounded-xl bg-studio-800 hover:bg-studio-700 text-studio-100 hover:text-white border border-studio-600 text-base font-bold uppercase tracking-wide',
)


# -----------------------------------------------------------------------------
# 3) EvidenceCard: angka objektif jadi pusat perhatian, 4 kolom padat jadi 2 kolom.
#    Hapus persentase akurasi buatan dan tampilkan Delta-E apa adanya.
# -----------------------------------------------------------------------------
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    """  // Kalkulasi persentase akurasi warna dari deltaE00 (skala 0 - 100%)
  const colorAccuracyPercent = measured
    ? Math.max(0, Math.min(100, Math.round(100 - measured.deltaE00 * 7.5)))
    : 100;

""",
    "",
)
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'className="text-base font-bold text-white tracking-wide"',
    'className="text-2xl font-extrabold text-white tracking-tight"',
)
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'w-14 h-14 rounded-xl border-2',
    'w-20 h-20 rounded-xl border-2',
)
replace_all(
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
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    """                  <span className=\"text-[10px] text-studio-500 block\">Tingkat Kecocokan</span>
                  <div className=\"flex items-center justify-center gap-1.5\">
                    <span className=\"text-base font-bold font-mono text-emerald-400\">{colorAccuracyPercent}%</span>
                    <span className=\"text-xs text-studio-400 font-medium\">Akurat</span>
                  </div>
""",
    """                  <span className=\"text-base text-studio-300 block\">Skor Selisih Warna</span>
                  <div className=\"flex items-end justify-center gap-2 mt-1\">
                    <span className=\"operator-number font-bold font-mono text-amber-300\">{measured.deltaE00}</span>
                    <span className=\"text-base text-studio-300 font-semibold pb-1\">Delta E00</span>
                  </div>
                  <p className=\"text-base text-studio-400 mt-2\">
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
replace_all(
    "src/components/qc/EvidenceCard.tsx",
    'className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 mb-3"',
    'className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/50 text-rose-200 text-base flex items-center gap-3 mb-4"',
)


# -----------------------------------------------------------------------------
# 4) Penampil gambar: judul dan kontrol lebih terbaca, handle ROI lebih besar.
# -----------------------------------------------------------------------------
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    'className="text-xs font-bold uppercase tracking-wider text-studio-100"',
    'className="text-xl font-extrabold text-white"',
)
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    'className="text-[11px] text-studio-400 truncate max-w-xs"',
    'className="text-base text-studio-300 max-w-xl leading-snug"',
)
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    'w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full',
    'w-5 h-5 bg-white border-2 border-amber-500 rounded-full',
)
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    '-top-1.5 -left-1.5 w-5 h-5',
    '-top-2.5 -left-2.5 w-5 h-5',
)
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    '-top-1.5 -right-1.5 w-5 h-5',
    '-top-2.5 -right-2.5 w-5 h-5',
)
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    '-bottom-1.5 -left-1.5 w-5 h-5',
    '-bottom-2.5 -left-2.5 w-5 h-5',
)
replace_all(
    "src/components/qc/InteractiveImageViewer.tsx",
    '-bottom-1.5 -right-1.5 w-5 h-5',
    '-bottom-2.5 -right-2.5 w-5 h-5',
)


# -----------------------------------------------------------------------------
# 5) Panel koreksi, FAIL modal, dan Master Library dibuat lega.
# -----------------------------------------------------------------------------
replace_all(
    "src/components/qc/CorrectionPanel.tsx",
    'className="flex items-center justify-between border-b border-studio-800 pb-3"',
    'className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-studio-800 pb-4"',
)
replace_all(
    "src/components/qc/CorrectionPanel.tsx",
    'className="text-sm font-semibold text-white">Rekomendasi Koreksi Warna',
    'className="text-2xl font-bold text-white">Rekomendasi Koreksi Warna',
)
replace_all(
    "src/components/qc/CorrectionPanel.tsx",
    'grid grid-cols-1 md:grid-cols-3 gap-4 pt-1',
    'grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2',
)
replace_all(
    "src/components/qc/CorrectionPanel.tsx",
    'className="pt-2 border-t border-studio-800 flex items-center justify-between"',
    'className="pt-4 border-t border-studio-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"',
)
replace_all(
    "src/components/qc/DecisionModal.tsx",
    'max-w-md w-full p-6',
    'max-w-2xl w-full p-6 md:p-8',
)
replace_all(
    "src/components/qc/DecisionModal.tsx",
    'space-y-2 max-h-56 overflow-y-auto pr-1',
    'space-y-3 max-h-[50vh] overflow-y-auto pr-2',
)
replace_all(
    "src/components/qc/DecisionModal.tsx",
    'w-4 h-4 rounded border flex items-center justify-center',
    'w-6 h-6 rounded border-2 flex items-center justify-center',
)
replace_all(
    "src/components/qc/DecisionModal.tsx",
    'rows={2}',
    'rows={4}',
)
replace_all(
    "src/components/master/MasterLibraryModal.tsx",
    'max-w-xl w-full p-6',
    'max-w-3xl w-full p-6 md:p-8',
)
replace_all(
    "src/components/master/MasterLibraryModal.tsx",
    'grid grid-cols-2 gap-3',
    'grid grid-cols-1 md:grid-cols-2 gap-4',
)


# -----------------------------------------------------------------------------
# 6) Browser test sekarang benar-benar memblokir regresi keterbacaan/reflow.
# -----------------------------------------------------------------------------
replace_all(
    "tests/test_browser.mjs",
    "const page = await browser.newPage();",
    "const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });\nfs.mkdirSync('test-artifacts', { recursive: true });",
)
replace_all(
    "tests/test_browser.mjs",
    "const hasHeatmap = latestText.includes('PETA PETAK SERAT KAYU AI');",
    "const hasHeatmap = latestText.includes('PETA PERBEDAAN SERAT');",
)
replace_all(
    "tests/test_browser.mjs",
    "console.log('   - Peta Petak Serat Kayu AI (AnomalyDINO) Tampil:', hasHeatmap);",
    "console.log('   - Peta Perbedaan Serat Deterministik Tampil:', hasHeatmap);",
)
replace_all(
    "tests/test_browser.mjs",
    "const screenshotPath = 'C:\\\\Users\\\\shint\\\\.gemini\\\\antigravity\\\\brain\\\\10babefe-7e2a-4e74-83a2-acb363927ee4\\\\browser_test_playwright.png';",
    "const screenshotPath = 'test-artifacts/browser_test_playwright.png';",
)
replace_all(
    "tests/test_browser.mjs",
    "const reportScreenshotPath = 'C:\\\\Users\\\\shint\\\\.gemini\\\\antigravity\\\\brain\\\\10babefe-7e2a-4e74-83a2-acb363927ee4\\\\qc_certificate_report_verified.png';",
    "const reportScreenshotPath = 'test-artifacts/qc_certificate_report_verified.png';",
)

browser_test = read("tests/test_browser.mjs")
marker = "// ACCESSIBILITY READABILITY ASSERTIONS"
if marker not in browser_test:
    insertion_point = "console.log('13. Mengambil Screenshot Bukti Visual Layar Utama...');"
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

const objectiveDelta = page.locator('text=Skor Selisih Warna').first();
if (!(await objectiveDelta.isVisible())) {
  throw new Error('Skor objektif Delta E tidak tampil sebagai bukti utama.');
}

// 720px mensimulasikan reflow kira-kira setara 200% zoom dari desktop 1440px.
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
    if insertion_point not in browser_test:
        raise RuntimeError("Titik sisip accessibility test tidak ditemukan")
    browser_test = browser_test.replace(insertion_point, assertions, 1)
    # Sesuaikan nomor log modal agar urut.
    browser_test = browser_test.replace("console.log('14. Menguji Modal Laporan Pemeriksaan QC", "console.log('15. Menguji Modal Laporan Pemeriksaan QC", 1)
    write("tests/test_browser.mjs", browser_test)

print("Patch layout aksesibel operator selesai diterapkan.")
