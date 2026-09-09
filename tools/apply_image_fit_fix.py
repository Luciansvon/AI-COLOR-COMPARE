from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIEWER = ROOT / "src/components/qc/InteractiveImageViewer.tsx"
PACKAGE = ROOT / "package.json"
PACKAGE_LOCK = ROOT / "package-lock.json"
TAURI = ROOT / "src-tauri/tauri.conf.json"
CARGO = ROOT / "src-tauri/Cargo.toml"
CARGO_LOCK = ROOT / "src-tauri/Cargo.lock"
FIT_HELPER = ROOT / "src/utils/imageFit.ts"
FIT_TEST = ROOT / "tests/image_fit.test.ts"
RELEASE_NOTES = ROOT / "RELEASE_v0.3.9.md"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: pola wajib muncul tepat 1x, ditemukan {count}x")
    return text.replace(old, new, 1)


def patch_viewer() -> None:
    text = VIEWER.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "import { ROIItem, ROIBox, EstimatedRecommendation } from '../../types';\n",
        "import { ROIItem, ROIBox, EstimatedRecommendation } from '../../types';\nimport { calculateContainFit } from '../../utils/imageFit';\n",
        "import helper image fit",
    )

    text = replace_once(
        text,
        "  const containerRef = useRef<HTMLDivElement>(null);\n\n  const [isDraggingFile, setIsDraggingFile] = useState(false);",
        "  const containerRef = useRef<HTMLDivElement>(null);\n\n  // Ukuran dasar 100% selalu berarti seluruh foto masuk ke frame tanpa crop.\n  // Wrapper mengikuti area foto yang benar-benar terlihat supaya koordinat ROI tetap presisi.\n  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });\n  const [fitSize, setFitSize] = useState<{ width: number; height: number } | null>(null);\n\n  const [isDraggingFile, setIsDraggingFile] = useState(false);",
        "state ukuran foto",
    )

    text = replace_once(
        text,
        "  useEffect(() => {\n    setZoomLevel(1.0);\n    setPanOffset({ x: 0, y: 0 });\n    setDrawingBox(null);\n  }, [imageSrc]);\n\n  // Handler Zoom",
        "  useEffect(() => {\n    setZoomLevel(1.0);\n    setPanOffset({ x: 0, y: 0 });\n    setDrawingBox(null);\n    setNaturalSize({ width: 0, height: 0 });\n    setFitSize(null);\n  }, [imageSrc]);\n\n  // Hitung ukuran contain secara eksplisit. CSS object-contain saja tidak cukup karena\n  // frame punya batas tinggi dan overflow-hidden pada WebView Windows/Android.\n  useEffect(() => {\n    if (!imageSrc || !containerRef.current || naturalSize.width <= 0 || naturalSize.height <= 0) return;\n\n    const container = containerRef.current;\n    const updateFit = () => {\n      const style = window.getComputedStyle(container);\n      const paddingX = Number.parseFloat(style.paddingLeft || '0') + Number.parseFloat(style.paddingRight || '0');\n      const paddingY = Number.parseFloat(style.paddingTop || '0') + Number.parseFloat(style.paddingBottom || '0');\n      const availableWidth = Math.max(1, container.clientWidth - paddingX);\n      const availableHeight = Math.max(1, container.clientHeight - paddingY);\n      const next = calculateContainFit(naturalSize.width, naturalSize.height, availableWidth, availableHeight);\n\n      setFitSize((prev) => {\n        if (prev && Math.abs(prev.width - next.width) < 0.5 && Math.abs(prev.height - next.height) < 0.5) return prev;\n        return next;\n      });\n    };\n\n    updateFit();\n    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateFit) : null;\n    observer?.observe(container);\n    window.addEventListener('resize', updateFit);\n\n    return () => {\n      observer?.disconnect();\n      window.removeEventListener('resize', updateFit);\n    };\n  }, [imageSrc, naturalSize.width, naturalSize.height]);\n\n  // Handler Zoom",
        "efek hitung contain",
    )

    text = replace_once(
        text,
        "            ? 'min-h-[220px] max-h-[52vh] sm:max-h-[460px] py-1'",
        "            ? 'h-[52vh] min-h-[220px] max-h-[460px] py-1'",
        "tinggi frame eksplisit",
    )

    text = replace_once(
        text,
        "            style={{\n              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,",
        "            style={{\n              width: fitSize ? `${fitSize.width}px` : undefined,\n              height: fitSize ? `${fitSize.height}px` : undefined,\n              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,",
        "ukuran wrapper fit",
    )

    text = replace_once(
        text,
        "              className=\"max-w-full max-h-[50vh] sm:max-h-[440px] w-auto h-auto block object-contain pointer-events-none select-none\"\n              draggable={false}",
        "              className=\"max-w-full max-h-full w-auto h-auto block object-contain pointer-events-none select-none\"\n              style={fitSize ? { width: '100%', height: '100%' } : undefined}\n              onLoad={(event) => {\n                const { naturalWidth, naturalHeight } = event.currentTarget;\n                if (naturalWidth > 0 && naturalHeight > 0) {\n                  setNaturalSize({ width: naturalWidth, height: naturalHeight });\n                }\n              }}\n              draggable={false}",
        "gambar fit dan onLoad",
    )

    VIEWER.write_text(text, encoding="utf-8")


def write_fit_helper() -> None:
    FIT_HELPER.write_text(
        """export interface FitSize {\n  width: number;\n  height: number;\n}\n\n/**\n * Menghitung ukuran gambar mode contain tanpa crop.\n * Skala dibatasi maksimal 1 agar gambar kecil tidak dipaksa membesar.\n */\nexport function calculateContainFit(\n  naturalWidth: number,\n  naturalHeight: number,\n  containerWidth: number,\n  containerHeight: number\n): FitSize {\n  if (naturalWidth <= 0 || naturalHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {\n    return { width: 0, height: 0 };\n  }\n\n  const scale = Math.min(1, containerWidth / naturalWidth, containerHeight / naturalHeight);\n  return {\n    width: naturalWidth * scale,\n    height: naturalHeight * scale,\n  };\n}\n""",
        encoding="utf-8",
    )


def write_fit_test() -> None:
    FIT_TEST.write_text(
        """import assert from 'node:assert/strict';\nimport { calculateContainFit } from '../src/utils/imageFit';\n\nconst nearly = (a: number, b: number) => Math.abs(a - b) < 0.01;\n\nconst landscape = calculateContainFit(6000, 4000, 650, 440);\nassert.ok(nearly(landscape.width, 650));\nassert.ok(landscape.height <= 440);\nassert.ok(nearly(landscape.width / landscape.height, 1.5));\n\nconst portrait = calculateContainFit(3000, 5000, 650, 440);\nassert.ok(portrait.width <= 650);\nassert.ok(nearly(portrait.height, 440));\nassert.ok(nearly(portrait.width / portrait.height, 0.6));\n\nconst ultraWide = calculateContainFit(8000, 1000, 650, 440);\nassert.ok(nearly(ultraWide.width, 650));\nassert.ok(ultraWide.height <= 440);\n\nconst ultraTall = calculateContainFit(1000, 8000, 650, 440);\nassert.ok(ultraTall.width <= 650);\nassert.ok(nearly(ultraTall.height, 440));\n\nconst small = calculateContainFit(320, 200, 650, 440);\nassert.deepEqual(small, { width: 320, height: 200 });\n\nconst invalid = calculateContainFit(0, 200, 650, 440);\nassert.deepEqual(invalid, { width: 0, height: 0 });\n\nconsole.log('PASS image-fit: landscape, portrait, ekstrem, dan gambar kecil seluruhnya contain tanpa crop.');\n""",
        encoding="utf-8",
    )


def bump_version_and_test_script() -> None:
    package = PACKAGE.read_text(encoding="utf-8")
    package = replace_once(package, '  "version": "0.3.8",', '  "version": "0.3.9",', "package version")
    package = replace_once(
        package,
        "tsx tests/smooth_surface_and_color.test.ts\"",
        "tsx tests/smooth_surface_and_color.test.ts && tsx tests/image_fit.test.ts\"",
        "package image-fit test",
    )
    PACKAGE.write_text(package, encoding="utf-8")

    package_lock = PACKAGE_LOCK.read_text(encoding="utf-8")
    if package_lock.count('"version": "0.3.8"') < 2:
        raise RuntimeError("package-lock: versi root 0.3.8 tidak ditemukan 2x")
    package_lock = package_lock.replace('"version": "0.3.8"', '"version": "0.3.9"', 2)
    PACKAGE_LOCK.write_text(package_lock, encoding="utf-8")

    tauri = TAURI.read_text(encoding="utf-8")
    tauri = replace_once(tauri, '  "version": "0.3.8",', '  "version": "0.3.9",', "tauri version")
    TAURI.write_text(tauri, encoding="utf-8")

    cargo = CARGO.read_text(encoding="utf-8")
    cargo = replace_once(cargo, 'version = "0.3.8"', 'version = "0.3.9"', "cargo version")
    CARGO.write_text(cargo, encoding="utf-8")

    cargo_lock = CARGO_LOCK.read_text(encoding="utf-8")
    cargo_lock = replace_once(
        cargo_lock,
        'name = "studio-color-qc"\nversion = "0.3.8"',
        'name = "studio-color-qc"\nversion = "0.3.9"',
        "cargo lock app version",
    )
    CARGO_LOCK.write_text(cargo_lock, encoding="utf-8")


def write_release_notes() -> None:
    RELEASE_NOTES.write_text(
        """# Studio Color QC v0.3.9 — Full Photo Fit Fix\n\n## Perbaikan utama\n- Foto Master dan Produk pada viewer Windows sekarang selalu tampil utuh pada zoom 100% tanpa terpotong frame.\n- Ukuran dasar dihitung dari rasio asli gambar dan ruang viewer, bukan hanya batas CSS.\n- Kotak area QC tetap mengikuti area gambar nyata karena wrapper disamakan dengan ukuran foto yang benar-benar terlihat.\n- Resize jendela menghitung ulang ukuran fit secara otomatis.\n- Zoom di atas 100% tetap boleh memotong viewport secara sengaja untuk inspeksi detail.\n\n## Cakupan rilis\nRilis ini membangun installer Windows EXE. Perbaikan berada di UI bersama sehingga juga siap dipakai build Android berikutnya, tetapi v0.3.9 ini tidak menerbitkan APK baru.\n\n## Verifikasi\n- Unit regression untuk landscape, portrait, ultra-wide, ultra-tall, dan gambar kecil.\n- npm test\n- npm run build\n- cargo test\n- cargo check\n- Build NSIS Windows standar\n- B.I.M.A Shared Infra Audit melalui PR sebelum merge\n""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    patch_viewer()
    write_fit_helper()
    write_fit_test()
    bump_version_and_test_script()
    write_release_notes()
    print("Patch image-fit v0.3.9 diterapkan.")
