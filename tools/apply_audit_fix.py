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
    if text.count(old) != 1:
        raise RuntimeError(f"Patch {path!r} gagal: blok target ditemukan {text.count(old)} kali, seharusnya 1")
    write(path, text.replace(old, new, 1))


# -----------------------------------------------------------------------------
# 1) Frontend storage: jangan melaporkan sukses jika SQLite gagal menyimpan.
# -----------------------------------------------------------------------------
replace_once(
    "src/App.tsx",
    "import { CheckCircle } from 'lucide-react';",
    "import { AlertCircle, CheckCircle } from 'lucide-react';",
)
replace_once(
    "src/App.tsx",
    "  persistQCRecordToStorage,\n} from './services/tauriBridge';",
    "  persistQCRecordToStorage,\n  isTauriEnvironment,\n} from './services/tauriBridge';",
)
replace_once(
    "src/App.tsx",
    "  const [toastMessage, setToastMessage] = useState<string | null>(null);",
    "  const [toastMessage, setToastMessage] = useState<string | null>(null);\n  const [toastKind, setToastKind] = useState<'success' | 'error'>('success');",
)
replace_once(
    "src/App.tsx",
    """  const handleAddNewMaster = async (newMasterData: Omit<MasterIdentity, 'id' | 'createdAt'>) => {
    const newMaster: MasterIdentity = {
      ...newMasterData,
      id: `master-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMasters((prev) => [...prev, newMaster]);
    setCurrentMasterId(newMaster.id);
    await persistMasterToStorage(newMaster);
    showToast(`Master baru \"${newMaster.code} — ${newMaster.name}\" berhasil ditambahkan & disimpan ke database.`);
  };

  const handleSaveQCRecord = async (record: QCRecord) => {
    setHistoryRecords((prev) => [record, ...prev]);
    await persistQCRecordToStorage(record);
    showToast(`Keputusan QC produk berhasil disimpan ke riwayat studio!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };
""",
    """  const handleAddNewMaster = async (newMasterData: Omit<MasterIdentity, 'id' | 'createdAt'>) => {
    const newMaster: MasterIdentity = {
      ...newMasterData,
      id: `master-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const persisted = await persistMasterToStorage(newMaster);
    if (isTauriEnvironment() && !persisted) {
      showToast(`Master \"${newMaster.code}\" gagal disimpan. Data tidak ditambahkan agar UI tidak berbeda dengan database.`, 'error');
      return;
    }

    setMasters((prev) => [...prev, newMaster]);
    setCurrentMasterId(newMaster.id);
    showToast(
      isTauriEnvironment()
        ? `Master baru \"${newMaster.code} — ${newMaster.name}\" berhasil disimpan ke database.`
        : `Master \"${newMaster.code} — ${newMaster.name}\" ditambahkan sementara untuk sesi pratinjau browser.`,
      'success'
    );
  };

  const handleSaveQCRecord = async (record: QCRecord): Promise<boolean> => {
    const persisted = await persistQCRecordToStorage(record);
    if (isTauriEnvironment() && !persisted) {
      showToast('Keputusan QC gagal disimpan. Status akhir tidak akan dikunci agar data tidak menipu operator.', 'error');
      return false;
    }

    setHistoryRecords((prev) => [record, ...prev]);
    showToast(
      isTauriEnvironment()
        ? 'Keputusan QC produk berhasil disimpan ke riwayat studio.'
        : 'Keputusan QC tersimpan sementara di sesi pratinjau browser.',
      'success'
    );
    return true;
  };

  const showToast = (msg: string, kind: 'success' | 'error' = 'success') => {
    setToastKind(kind);
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };
""",
)
replace_once(
    "src/App.tsx",
    """      {toastMessage && (
        <div className=\"fixed bottom-6 right-6 z-50 bg-studio-900 border border-emerald-500/40 text-emerald-300 text-xs font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce\">
          <CheckCircle className=\"w-4 h-4 text-emerald-400 shrink-0\" />
          <span>{toastMessage}</span>
        </div>
      )}
""",
    """      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-studio-900 text-xs font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 ${
            toastKind === 'error'
              ? 'border border-rose-500/50 text-rose-300'
              : 'border border-emerald-500/40 text-emerald-300'
          }`}
        >
          {toastKind === 'error' ? (
            <AlertCircle className=\"w-4 h-4 text-rose-400 shrink-0\" />
          ) : (
            <CheckCircle className=\"w-4 h-4 text-emerald-400 shrink-0\" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}
""",
)

# -----------------------------------------------------------------------------
# 2) Bridge: keputusan tanpa final decision tidak boleh masuk DB sebagai UNSET.
# -----------------------------------------------------------------------------
replace_once(
    "src/services/tauriBridge.ts",
    """export async function persistQCRecordToStorage(record: QCRecord): Promise<boolean> {
  const payload = {
""",
    """export async function persistQCRecordToStorage(record: QCRecord): Promise<boolean> {
  if (!record.finalProductDecision) {
    console.warn('[Storage] QC record ditolak karena keputusan akhir operator belum tersedia.');
    return false;
  }

  const payload = {
""",
)
replace_once(
    "src/services/tauriBridge.ts",
    "    final_decision: record.finalProductDecision?.decision || 'UNSET',",
    "    final_decision: record.finalProductDecision.decision,",
)
replace_once(
    "src/services/tauriBridge.ts",
    "    fail_reasons_json: record.finalProductDecision?.failReasons\n      ? JSON.stringify(record.finalProductDecision.failReasons)\n      : null,\n    operator_note: record.finalProductDecision?.note || null,",
    "    fail_reasons_json: record.finalProductDecision.failReasons.length > 0\n      ? JSON.stringify(record.finalProductDecision.failReasons)\n      : null,\n    operator_note: record.finalProductDecision.note || null,",
)

# -----------------------------------------------------------------------------
# 3) Upload image: UI webview hanya menerima format yang benar-benar dapat didekode.
#    RAW tetap tidak dimodifikasi, tetapi tidak lagi dipura-pura bisa dibaca oleh <img>.
# -----------------------------------------------------------------------------
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    """type DragState =
""",
    """const SUPPORTED_UPLOAD_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_UPLOAD_EXTENSION = /\\.(jpe?g|png|webp)$/i;

function validateUploadFile(file: File): string | null {
  if (SUPPORTED_UPLOAD_MIME.has(file.type) || SUPPORTED_UPLOAD_EXTENSION.test(file.name)) {
    return null;
  }

  return 'Format ini belum bisa diproses langsung. Gunakan JPG, PNG, atau WebP. RAW harus melalui decoder native terlebih dahulu.';
}

type DragState =
""",
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    "  uploadButtonText = 'Pilih Foto (JPG / RAW)',",
    "  uploadButtonText = 'Pilih Foto (JPG / PNG / WebP)',",
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    "  const [isDraggingFile, setIsDraggingFile] = useState(false);",
    "  const [isDraggingFile, setIsDraggingFile] = useState(false);\n  const [uploadError, setUploadError] = useState<string | null>(null);",
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };
""",
    """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        setUploadError(validationError);
      } else {
        setUploadError(null);
        onUploadImage(file);
      }
    }
    if (e.target) {
      e.target.value = '';
    }
  };
""",
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    """  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
  };
""",
    """  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onUploadImage) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        setUploadError(validationError);
      } else {
        setUploadError(null);
        onUploadImage(file);
      }
    }
  };
""",
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    "accept=\"image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png,.cr2,.cr3,.arw,.nef,.raf,.dng,.tiff\"",
    "accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\"",
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    "              Mendukung format JPG, JPEG, PNG, dan berkas RAW kamera studio",
    "              Mendukung JPG, PNG, dan WebP. RAW belum diproses langsung oleh penampil ini.",
)
replace_once(
    "src/components/qc/InteractiveImageViewer.tsx",
    """      {/* Footer Bantuan Interaktif */}
      {imageSrc && (
""",
    """      {uploadError && (
        <div className=\"px-4 py-2.5 bg-rose-950/40 border-t border-rose-500/30 text-[11px] text-rose-300\">
          {uploadError}
        </div>
      )}

      {/* Footer Bantuan Interaktif */}
      {imageSrc && (
""",
)

# -----------------------------------------------------------------------------
# 4) JPEG export harus benar-benar JPEG, bukan sekadar nama file .jpg.
# -----------------------------------------------------------------------------
canvas_path = "src/utils/canvasColorExtractor.ts"
canvas_text = read(canvas_path)
if "export async function convertImageToJpegDataUrl" not in canvas_text:
    canvas_text += """

/**
 * Menjamin hasil ekspor benar-benar berupa byte JPEG, termasuk ketika preview
 * belum memiliki koreksi dan sumber awalnya PNG/WebP.
 */
export async function convertImageToJpegDataUrl(
  source: string,
  quality: number = 0.95
): Promise<string> {
  if (!source) throw new Error('Sumber gambar ekspor kosong');

  const img = await loadImage(source);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (width <= 0 || height <= 0) throw new Error('Dimensi gambar ekspor tidak valid');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal mendapatkan konteks canvas untuk ekspor JPEG');

  // JPEG tidak punya alpha. Gunakan putih sebagai latar yang eksplisit.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const safeQuality = Math.max(0.1, Math.min(1, quality));
  const dataUrl = canvas.toDataURL('image/jpeg', safeQuality);
  if (!dataUrl.startsWith('data:image/jpeg')) {
    throw new Error('Browser gagal menghasilkan data JPEG');
  }
  return dataUrl;
}
"""
    write(canvas_path, canvas_text)

replace_once(
    "src/components/qc/MainQCScreen.tsx",
    "import { extractPixelsFromImageROI, renderCorrectedPreview } from '../../utils/canvasColorExtractor';",
    "import { convertImageToJpegDataUrl, extractPixelsFromImageROI, renderCorrectedPreview } from '../../utils/canvasColorExtractor';",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    "  onSaveQCRecord: (record: QCRecord) => void;",
    "  onSaveQCRecord: (record: QCRecord) => Promise<boolean>;",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """  const [imageMetadata, setImageMetadata] = useState<ImageMetadata>({
    fileName: 'STUDIO_RAW_IMG_1024.CR3',
    fileSize: 32450000,
    format: 'Canon RAW (CR3) / Decoded Studio Buffer',
    cameraModel: 'Canon EOS R5 Studio Workstation',
    lens: 'RF 50mm f/1.2L USM',
    iso: 100,
    shutterSpeed: '1/160s',
    aperture: 'f/8.0',
    focalLength: '50mm',
    whiteBalance: 'Custom Studio Daylight (5200K)',
    capturedAt: '2026-09-06T09:15:00Z',
  });
""",
    """  const [imageMetadata, setImageMetadata] = useState<ImageMetadata>({
    fileName: '',
    fileSize: 0,
    format: 'Belum ada foto',
    cameraModel: 'Metadata kamera belum dibaca dari file ini',
    lens: 'Tidak tersedia',
    whiteBalance: 'Tidak tersedia',
  });
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """      setImageMetadata((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        format: file.type || 'Decoded Image File (JPG/RAW)',
      }));
""",
    """      setImageMetadata({
        fileName: file.name,
        fileSize: file.size,
        format: file.type || 'Berkas gambar terdekode',
        cameraModel: 'Metadata kamera belum dibaca dari file ini',
        lens: 'Tidak tersedia',
        whiteBalance: 'Tidak tersedia',
      });
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """    overrideRois?: ROIItem[],
    silentUpdate: boolean = false,
    overrideMasterBox?: ROIBox
  ) => {
""",
    """    overrideRois?: ROIItem[],
    silentUpdate: boolean = false,
    overrideMasterBox?: ROIBox,
    overrideScenario?: string
  ) => {
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    "    const activeMasterBox = overrideMasterBox || masterRoiBox;",
    "    const activeMasterBox = overrideMasterBox || masterRoiBox;\n    const activeScenario = overrideScenario ?? selectedScenario;",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    "          if (selectedScenario === 'scenario-conflict' && roi.id === 'roi-armrest') {",
    "          if ((overrideScenario !== undefined || appMode === 'demo') && activeScenario === 'scenario-conflict' && roi.id === 'roi-armrest') {",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    "    executeComparison(mImg, prodImg);",
    "    executeComparison(mImg, prodImg, undefined, false, undefined, scenarioKey);",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """      // Sampel Nyata Kamera Canon RAW (.CR2) dari open dataset
      prodImg = '/samples/canon_sample_preview.jpg';
      setImageMetadata({
        fileName: 'sample_canon_eos1d.CR2',
        fileSize: 6953301,
        format: 'Canon RAW (CR2) / Decoded Studio Buffer',
        cameraModel: 'Canon EOS-1D Mark II Studio Workstation',
        lens: 'EF 50mm f/1.4 USM',
        iso: 200,
        shutterSpeed: '1/250s',
        aperture: 'f/5.6',
        focalLength: '50mm',
        whiteBalance: 'Custom Studio Daylight (5500K)',
        capturedAt: '2026-09-06T10:00:00Z',
      });
""",
    """      // Sampel CR2 ditampilkan lewat JPEG preview tertanam, bukan data sensor RAW linear.
      prodImg = '/samples/canon_sample_preview.jpg';
      setImageMetadata({
        fileName: 'sample_canon_eos1d.CR2 (embedded preview)',
        fileSize: 6953301,
        format: 'JPEG preview tertanam dari sampel Canon CR2; bukan decode RAW linear',
        cameraModel: 'Tidak diverifikasi dari EXIF pada jalur demo ini',
        lens: 'Tidak diverifikasi',
        whiteBalance: 'Tidak diverifikasi',
      });
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """      // Sampel Nyata Kamera Nikon RAW (.NEF) dari open dataset
      prodImg = '/samples/nikon_sample_preview.jpg';
      setImageMetadata({
        fileName: 'sample_nikon_1j1.NEF',
        fileSize: 11254575,
        format: 'Nikon Electronic Format (NEF) / Decoded Studio Buffer',
        cameraModel: 'Nikon 1 J1 Studio Camera',
        lens: '1 NIKKOR 10-30mm f/3.5-5.6 VR',
        iso: 100,
        shutterSpeed: '1/160s',
        aperture: 'f/8.0',
        focalLength: '18.5mm',
        whiteBalance: 'Studio Flash Preset',
        capturedAt: '2026-09-06T10:05:00Z',
      });
""",
    """      // Sampel NEF ditampilkan lewat JPEG preview tertanam, bukan data sensor RAW linear.
      prodImg = '/samples/nikon_sample_preview.jpg';
      setImageMetadata({
        fileName: 'sample_nikon_1j1.NEF (embedded preview)',
        fileSize: 11254575,
        format: 'JPEG preview tertanam dari sampel Nikon NEF; bukan decode RAW linear',
        cameraModel: 'Tidak diverifikasi dari EXIF pada jalur demo ini',
        lens: 'Tidak diverifikasi',
        whiteBalance: 'Tidak diverifikasi',
      });
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """  const handleProductDecision = (decision: 'PASS' | 'FAIL') => {
    if (decision === 'PASS') {
      setProductDecision('PASS');
      saveFinalRecord('PASS', []);
    } else {
""",
    """  const handleProductDecision = async (decision: 'PASS' | 'FAIL') => {
    if (decision === 'PASS') {
      const saved = await saveFinalRecord('PASS', []);
      if (saved) setProductDecision('PASS');
    } else {
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """  const handleConfirmFail = (reasons: string[], note: string) => {
""",
    """  const handleConfirmFail = async (reasons: string[], note: string) => {
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """    } else {
      setProductDecision('FAIL');
      saveFinalRecord('FAIL', reasons, note);
    }
  };

  // Simpan Riwayat QC (REQ-HISTORY-001)
  const saveFinalRecord = (decision: 'PASS' | 'FAIL', failReasons: string[], note?: string) => {
""",
    """    } else {
      const saved = await saveFinalRecord('FAIL', reasons, note);
      if (saved) setProductDecision('FAIL');
    }
  };

  // Simpan Riwayat QC (REQ-HISTORY-001)
  const saveFinalRecord = async (decision: 'PASS' | 'FAIL', failReasons: string[], note?: string): Promise<boolean> => {
""",
)
replace_once(
    "src/components/qc/MainQCScreen.tsx",
    """    onSaveQCRecord(record);
  };

  // Ekspor JPEG sRGB Non-Destruktif (REQ-EXPORT-001 s/d REQ-EXPORT-005)
  const handleExportJpeg = () => {
    const link = document.createElement('a');
    link.download = `${imageMetadata.fileName.replace(/\\.[^/.]+$/, '')}_corrected_srgb.jpg`;
    link.href = previewImageSrc || productImageSrc;
    link.click();
  };

  // Handler Unggah Berkas Foto Lokal (Mendukung RAW & JPEG)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setProductImageSrc(dataUrl);
      setPreviewImageSrc(dataUrl);
      setImageMetadata((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        format: file.type || 'Decoded Image File',
      }));
    };
    reader.readAsDataURL(file);
  };
""",
    """    return onSaveQCRecord(record);
  };

  // Ekspor JPEG sRGB Non-Destruktif (REQ-EXPORT-001 s/d REQ-EXPORT-005)
  const handleExportJpeg = async () => {
    const source = previewImageSrc || productImageSrc;
    if (!source) return;

    try {
      const jpegDataUrl = await convertImageToJpegDataUrl(source, 0.95);
      const baseName = (imageMetadata.fileName || 'studio_qc_export').replace(/\\.[^/.]+$/, '');
      const link = document.createElement('a');
      link.download = `${baseName}_corrected_srgb.jpg`;
      link.href = jpegDataUrl;
      link.click();
    } catch (err) {
      console.error('Gagal mengekspor JPEG yang valid:', err);
    }
  };
""",
)

# Label upload harus sesuai kemampuan aktual frontend.
main_path = "src/components/qc/MainQCScreen.tsx"
main_text = read(main_path)
for old, new in [
    ("1. Mode Uji Foto Sendiri (JPG / RAW)", "1. Mode Uji Foto Sendiri (JPG / PNG / WebP)"),
    ("5. Canon CR2", "5. Canon CR2 Preview"),
    ("6. Nikon NEF", "6. Nikon NEF Preview"),
    ("foto sampel master kayu (JPG/RAW)", "foto sampel master kayu (JPG/PNG/WebP)"),
    ("Pilih / Unggah Foto Master Kayu (JPG / RAW)", "Pilih / Unggah Foto Master Kayu (JPG / PNG / WebP)"),
    ("foto produk yang mau dicek (JPG/RAW)", "foto produk yang mau dicek (JPG/PNG/WebP)"),
    ("Pilih / Unggah Foto Produk Studio (JPG / RAW)", "Pilih / Unggah Foto Produk Studio (JPG / PNG / WebP)"),
]:
    if old not in main_text:
        raise RuntimeError(f"Label target tidak ditemukan: {old}")
    main_text = main_text.replace(old, new)
write(main_path, main_text)

# Metadata optional jangan tampil sebagai teks 'undefined'.
for old, new in [
    ("{imageMetadata.cameraModel}", "{imageMetadata.cameraModel || 'Tidak tersedia'}"),
    ("{imageMetadata.lens}</b>", "{imageMetadata.lens || 'Tidak tersedia'}</b>"),
    ("{imageMetadata.iso}</b>", "{imageMetadata.iso ?? 'N/A'}</b>"),
    ("{imageMetadata.shutterSpeed}</b>", "{imageMetadata.shutterSpeed || 'N/A'}</b>"),
    ("{imageMetadata.aperture}</b>", "{imageMetadata.aperture || 'N/A'}</b>"),
    ("{imageMetadata.whiteBalance}</b>", "{imageMetadata.whiteBalance || 'Tidak tersedia'}</b>"),
]:
    replace_once(main_path, old, new)

# -----------------------------------------------------------------------------
# 5) RAW loader: jangan pernah mengarang EXIF/kamera yang tidak benar-benar dibaca.
# -----------------------------------------------------------------------------
replace_once(
    "src-tauri/src/raw_engine/loader.rs",
    """    // Default metadata studio
    let meta = ImageMetadata {
        file_name,
        file_size,
        width,
        height,
        format: format_str,
        camera_model: Some(\"Studio Workstation Camera\".to_string()),
        lens: None,
        iso: Some(100),
        shutter_speed: Some(\"1/160s\".to_string()),
        aperture: Some(\"f/8.0\".to_string()),
        white_balance: Some(\"Studio Daylight Custom\".to_string()),
    };
""",
    """    // Loader ini belum mengekstrak EXIF. Jangan mengisi metadata kamera dengan nilai tebakan.
    let meta = ImageMetadata {
        file_name,
        file_size,
        width,
        height,
        format: format_str,
        camera_model: None,
        lens: None,
        iso: None,
        shutter_speed: None,
        aperture: None,
        white_balance: None,
    };
""",
)
replace_once(
    "src-tauri/src/raw_engine/loader.rs",
    """                if let Ok(file_bytes) = std::fs::read(path) {
                    if let Some(bytes) = extract_embedded_jpeg(&file_bytes) {
                        let _ = std::fs::write(\"../public/samples/canon_sample_preview.jpg\", &bytes);
                    }
                }
""",
    """                if let Ok(file_bytes) = std::fs::read(path) {
                    if let Some(bytes) = extract_embedded_jpeg(&file_bytes) {
                        assert!(image::load_from_memory(&bytes).is_ok());
                    }
                }
""",
)

# -----------------------------------------------------------------------------
# 6) Database: tidak boleh fallback diam-diam ke RAM dan migrasi tak boleh ditandai
#    sukses jika ALTER TABLE gagal.
# -----------------------------------------------------------------------------
replace_once(
    "src-tauri/src/main.rs",
    """    let db = Database::new(&db_path).unwrap_or_else(|_| {
        Database::memory().expect(\"Gagal menginisialisasi database fallback memory\")
    });
""",
    """    let db = Database::new(&db_path).unwrap_or_else(|err| {
        panic!(
            \"Gagal membuka database persisten di {}: {}. Aplikasi dihentikan agar data QC tidak diam-diam tersimpan hanya di RAM.\",
            db_path.display(),
            err
        )
    });
""",
)
replace_once(
    "src-tauri/src/storage/db.rs",
    """            )
            .unwrap_or(0);
""",
    """            )?;
""",
)
replace_once(
    "src-tauri/src/storage/db.rs",
    """                )
                .unwrap_or(false);

            if !has_col {
                let _ = self.conn.execute(
                    \"ALTER TABLE masters ADD COLUMN texture_profile_json TEXT;\",
                    [],
                );
            }
""",
    """                )?;

            if !has_col {
                self.conn.execute(
                    \"ALTER TABLE masters ADD COLUMN texture_profile_json TEXT;\",
                    [],
                )?;
            }
""",
)

# -----------------------------------------------------------------------------
# 7) Tauri IPC: validasi buffer sebelum statistik/tekstur untuk mencegah panic dan
#    hasil matematis dari dimensi palsu.
# -----------------------------------------------------------------------------
replace_once(
    "src-tauri/src/commands.rs",
    """pub struct AppState {
    pub db: Mutex<Database>,
}
""",
    """pub struct AppState {
    pub db: Mutex<Database>,
}

fn validate_rgba_buffer(label: &str, data: &[u8]) -> Result<(), String> {
    if data.is_empty() {
        return Err(format!(\"Buffer {} kosong\", label));
    }
    if data.len() % 4 != 0 {
        return Err(format!(
            \"Buffer {} bukan RGBA8 valid: panjang {} bukan kelipatan 4\",
            label,
            data.len()
        ));
    }
    Ok(())
}

fn resolve_analysis_dimensions(payload: &AnalyzeRoiInput) -> Result<(usize, usize), String> {
    validate_rgba_buffer(\"master\", &payload.master_rgba)?;
    validate_rgba_buffer(\"produk\", &payload.product_rgba)?;

    if payload.master_rgba.len() != payload.product_rgba.len() {
        return Err(format!(
            \"Ukuran buffer master ({}) dan produk ({}) harus sama untuk analisis berpasangan\",
            payload.master_rgba.len(),
            payload.product_rgba.len()
        ));
    }

    match (payload.width, payload.height) {
        (Some(width), Some(height)) => {
            if width == 0 || height == 0 {
                return Err(\"Lebar dan tinggi ROI harus lebih besar dari nol\".to_string());
            }

            let expected_len = (width as usize)
                .checked_mul(height as usize)
                .and_then(|pixels| pixels.checked_mul(4))
                .ok_or_else(|| \"Dimensi ROI terlalu besar\".to_string())?;

            if payload.master_rgba.len() != expected_len {
                return Err(format!(
                    \"Dimensi {}x{} membutuhkan {} byte RGBA, tetapi menerima {} byte\",
                    width,
                    height,
                    expected_len,
                    payload.master_rgba.len()
                ));
            }

            Ok((width as usize, height as usize))
        }
        (None, None) => {
            let pixel_count = payload.master_rgba.len() / 4;
            let side = (pixel_count as f64).sqrt() as usize;
            if side.checked_mul(side) != Some(pixel_count) {
                return Err(
                    \"width dan height wajib diberikan untuk ROI yang bukan persegi\".to_string(),
                );
            }
            Ok((side, side))
        }
        _ => Err(\"width dan height harus diberikan bersama-sama\".to_string()),
    }
}
""",
)
replace_once(
    "src-tauri/src/commands.rs",
    """pub fn analyze_roi_cmd(payload: AnalyzeRoiInput) -> Result<AnalyzeRoiOutput, String> {
    let master_stats = extract_roi_stats(&payload.master_rgba);
""",
    """pub fn analyze_roi_cmd(payload: AnalyzeRoiInput) -> Result<AnalyzeRoiOutput, String> {
    let (w, h) = resolve_analysis_dimensions(&payload)?;
    let master_stats = extract_roi_stats(&payload.master_rgba);
""",
)
replace_once(
    "src-tauri/src/commands.rs",
    """    let (w, h) = if let (Some(w), Some(h)) = (payload.width, payload.height) {
        (w as usize, h as usize)
    } else {
        let count = payload.master_rgba.len() / 4;
        let side = (count as f64).sqrt().round() as usize;
        (side, side)
    };

    let texture_analysis = if w >= 4 && h >= 4 && payload.master_rgba.len() >= w * h * 4 && payload.product_rgba.len() >= w * h * 4 {
""",
    """    let texture_analysis = if w >= 4 && h >= 4 {
""",
)
replace_once(
    "src-tauri/src/commands.rs",
    """pub fn analyze_texture_cmd(payload: AnalyzeRoiInput) -> Result<ComprehensiveRoiAnalysis, String> {
    let (w, h) = if let (Some(w), Some(h)) = (payload.width, payload.height) {
        (w as usize, h as usize)
    } else {
        let count = payload.master_rgba.len() / 4;
        let side = (count as f64).sqrt().round() as usize;
        (side, side)
    };

""",
    """pub fn analyze_texture_cmd(payload: AnalyzeRoiInput) -> Result<ComprehensiveRoiAnalysis, String> {
    let (w, h) = resolve_analysis_dimensions(&payload)?;

""",
)
replace_once(
    "src-tauri/src/commands.rs",
    """pub fn check_master_consistency_cmd(
    in_frame_rgba: Vec<u8>,
    separate_rgba: Vec<u8>,
) -> Result<MasterConsistencyOutput, String> {
    let in_frame_stats = extract_roi_stats(&in_frame_rgba);
""",
    """pub fn check_master_consistency_cmd(
    in_frame_rgba: Vec<u8>,
    separate_rgba: Vec<u8>,
) -> Result<MasterConsistencyOutput, String> {
    validate_rgba_buffer(\"master in-frame\", &in_frame_rgba)?;
    validate_rgba_buffer(\"master terpisah\", &separate_rgba)?;
    let in_frame_stats = extract_roi_stats(&in_frame_rgba);
""",
)
replace_once(
    "src-tauri/src/commands.rs",
    """pub fn export_jpeg_cmd(payload: ExportJpegPayload) -> Result<String, String> {
    let dir = Path::new(&payload.output_directory);
""",
    """pub fn export_jpeg_cmd(payload: ExportJpegPayload) -> Result<String, String> {
    if payload.width == 0 || payload.height == 0 {
        return Err(\"Dimensi ekspor harus lebih besar dari nol\".to_string());
    }
    let expected_len = (payload.width as usize)
        .checked_mul(payload.height as usize)
        .and_then(|pixels| pixels.checked_mul(3))
        .ok_or_else(|| \"Dimensi ekspor terlalu besar\".to_string())?;
    if payload.rgb_pixels.len() != expected_len {
        return Err(format!(
            \"Buffer RGB tidak cocok dengan dimensi: butuh {} byte, menerima {}\",
            expected_len,
            payload.rgb_pixels.len()
        ));
    }
    if payload.base_filename.trim().is_empty() {
        return Err(\"Nama file ekspor tidak boleh kosong\".to_string());
    }

    let dir = Path::new(&payload.output_directory);
""",
)
replace_once(
    "src-tauri/src/commands.rs",
    "    let quality = payload.quality.unwrap_or(95);",
    "    let quality = payload.quality.unwrap_or(95).clamp(1, 100);",
)

# -----------------------------------------------------------------------------
# 8) Export path: cegah traversal/karakter ilegal Windows dan bersihkan temp file
#    jika encoding gagal.
# -----------------------------------------------------------------------------
replace_once(
    "src-tauri/src/raw_engine/export.rs",
    """/// Menemukan path file yang aman tanpa menimpa file yang sudah ada (REQ-EXPORT-004 & File Safety)
pub fn get_safe_export_path(base_dir: &Path, base_name: &str, extension: &str) -> PathBuf {
    let mut candidate = base_dir.join(format!(\"{}.{}\", base_name, extension));
""",
    """fn sanitize_export_basename(base_name: &str) -> String {
    let cleaned: String = base_name
        .trim()
        .chars()
        .map(|c| {
            if c.is_control() || matches!(c, '/' | '\\\\' | ':' | '*' | '?' | '\"' | '<' | '>' | '|') {
                '_'
            } else {
                c
            }
        })
        .collect();

    let cleaned = cleaned.trim_matches(|c| c == '.' || c == ' ').to_string();
    if cleaned.is_empty() {
        \"export\".to_string()
    } else {
        cleaned
    }
}

/// Menemukan path file yang aman tanpa menimpa file yang sudah ada (REQ-EXPORT-004 & File Safety)
pub fn get_safe_export_path(base_dir: &Path, base_name: &str, extension: &str) -> PathBuf {
    let safe_name = sanitize_export_basename(base_name);
    let mut candidate = base_dir.join(format!(\"{}.{}\", safe_name, extension));
""",
)
replace_once(
    "src-tauri/src/raw_engine/export.rs",
    "        candidate = base_dir.join(format!(\"{} ({}).{}\", base_name, counter, extension));",
    "        candidate = base_dir.join(format!(\"{} ({}).{}\", safe_name, counter, extension));",
)
replace_once(
    "src-tauri/src/raw_engine/export.rs",
    """    {
        let file = File::create(&temp_path)?;
        let writer = BufWriter::new(file);

        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(writer, quality);
        encoder
            .encode(rgb_pixels, width, height, ColorType::Rgb8.into())
            .map_err(|e| ExportError::ImageError(e.to_string()))?;
    }

    // Rename atomik ke target akhir
""",
    """    let encode_result = (|| -> Result<(), ExportError> {
        let file = File::create(&temp_path)?;
        let writer = BufWriter::new(file);
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(writer, quality);
        encoder
            .encode(rgb_pixels, width, height, ColorType::Rgb8.into())
            .map_err(|e| ExportError::ImageError(e.to_string()))?;
        Ok(())
    })();

    if let Err(err) = encode_result {
        let _ = fs::remove_file(&temp_path);
        return Err(err);
    }

    // Rename atomik ke target akhir
""",
)
replace_once(
    "src-tauri/src/raw_engine/export.rs",
    """    #[test]
    fn test_atomic_export_srgb_jpeg() {
""",
    """    #[test]
    fn test_export_path_sanitizes_traversal_and_windows_chars() {
        let temp_dir = std::env::temp_dir();
        let path = get_safe_export_path(&temp_dir, \"../folder\\\\bad:name\", \"jpg\");
        assert_eq!(path.parent().unwrap(), temp_dir.as_path());
        let file_name = path.file_name().unwrap().to_string_lossy();
        assert!(!file_name.contains(\"..\"));
        assert!(!file_name.contains('/'));
        assert!(!file_name.contains('\\\\'));
        assert!(!file_name.contains(':'));
    }

    #[test]
    fn test_atomic_export_srgb_jpeg() {
""",
)

# -----------------------------------------------------------------------------
# 9) Repo hygiene + CI permanen.
# -----------------------------------------------------------------------------
replace_once(
    ".gitignore",
    "# Node dependencies\nnode_modules\ndist\ndist-ssr\n*.local",
    "# Node dependencies\nnode_modules\ndist\ndist-ssr\n*.local\n*.tsbuildinfo",
)

tracked_tsbuild = ROOT / "tsconfig.tsbuildinfo"
if tracked_tsbuild.exists():
    tracked_tsbuild.unlink()

ci_path = ROOT / ".github" / "workflows" / "ci.yml"
ci_path.parent.mkdir(parents=True, exist_ok=True)
ci_path.write_text(
    """name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build

  rust-core:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Uji Rust core
        run: cargo test --manifest-path src-tauri/Cargo.toml
      - name: Periksa kompilasi Rust
        run: cargo check --manifest-path src-tauri/Cargo.toml
""",
    encoding="utf-8",
)

print("Patch audit selesai diterapkan.")
