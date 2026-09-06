import React, { useState, useEffect } from 'react';
import {
  MasterIdentity,
  ROIItem,
  MeasuredEvidence,
  EstimatedRecommendation,
  ROIDecision,
  CorrectionParams,
  CorrectionConflict,
  QCRecord,
  ImageMetadata,
  UnifiedMaterialReport,
} from '../../types';
import { InteractiveImageViewer } from './InteractiveImageViewer';
import { EvidenceCard } from './EvidenceCard';
import { CorrectionPanel } from './CorrectionPanel';
import { DecisionModal } from './DecisionModal';
import { extractPixelsFromImageROI, renderCorrectedPreview } from '../../utils/canvasColorExtractor';
import { compareStats } from '../../color_science/metrics';
import { calculateRecommendedCorrection } from '../../color_science/correction';
import { evaluateMaterialFusion } from '../../color_science/texture';
import { generateWoodTextureImage } from '../../utils/imageGenerator';
import { Check, X, Upload, Sparkles, AlertTriangle, ShieldCheck, Camera } from 'lucide-react';

interface MainQCScreenProps {
  currentMaster: MasterIdentity;
  onSaveQCRecord: (record: QCRecord) => void;
}

// Default ROI untuk produk kursi furnitur (Rangka Kayu, Sandaran Tangan, Dudukan Kain Guardrail)
const DEFAULT_ROIS: ROIItem[] = [
  {
    id: 'roi-frame',
    name: 'Rangka Kayu (Frame)',
    role: 'master_backed',
    box: { x: 27, y: 16, width: 9, height: 48 }, // Petak vertikal tiang kayu
  },
  {
    id: 'roi-armrest',
    name: 'Sandaran Tangan (Armrest)',
    role: 'master_backed',
    box: { x: 20, y: 43, width: 13, height: 7 }, // Petak horizontal kayu sandaran
  },
  {
    id: 'roi-seat',
    name: 'Dudukan Kain (Fabric)',
    role: 'guardrail_only', // NO MASTER
    box: { x: 30, y: 52, width: 40, height: 12 }, // Petak kain
  },
];

export const MainQCScreen: React.FC<MainQCScreenProps> = ({
  currentMaster,
  onSaveQCRecord,
}) => {
  // State Gambar
  const [masterImageSrc, setMasterImageSrc] = useState<string>('');
  const [productImageSrc, setProductImageSrc] = useState<string>('');
  const [previewImageSrc, setPreviewImageSrc] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('scenario-wb');
  const [productName, setProductName] = useState<string>('Nordic Dining Chair (Lot #2026-A)');

  // State ROI & Analisis
  const [rois] = useState<ROIItem[]>(DEFAULT_ROIS);
  const [selectedRoiId, setSelectedRoiId] = useState<string>('roi-frame');
  const [roiMeasured, setRoiMeasured] = useState<Record<string, MeasuredEvidence>>({});
  const [roiEstimated, setRoiEstimated] = useState<Record<string, EstimatedRecommendation>>({});
  const [roiFusion, setRoiFusion] = useState<Record<string, UnifiedMaterialReport>>({});

  // State Keputusan Operator
  const [roiDecisions, setRoiDecisions] = useState<Record<string, ROIDecision>>({});
  const [productDecision, setProductDecision] = useState<'PASS' | 'FAIL' | null>(null);

  // State Koreksi & Konflik
  const [correctionParams, setCorrectionParams] = useState<CorrectionParams>({
    temperatureK: 0,
    tint: 0,
    exposureEV: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  const [recommendedCorrection, setRecommendedCorrection] = useState<CorrectionParams>({
    temperatureK: 0,
    tint: 0,
    exposureEV: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  const [correctionConflict, setCorrectionConflict] = useState<CorrectionConflict>({ hasConflict: false });
  const [isPreviewingCorrection, setIsPreviewingCorrection] = useState<boolean>(false);

  // Modal Alasan FAIL
  const [failModalOpen, setFailModalOpen] = useState<boolean>(false);
  const [failTarget, setFailTarget] = useState<{ type: 'roi' | 'product'; id?: string; name: string }>({
    type: 'product',
    name: 'Produk Keseluruhan',
  });

  // Metadata Gambar
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata>({
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

  // 1. Muat Gambar Master dan Produk berdasarkan skenario simulasi
  useEffect(() => {
    // Bangkitkan gambar master panel fisik
    const masterImg = generateWoodTextureImage('#3d2b1f', '#24170f', {
      isChairComposition: false,
    });
    setMasterImageSrc(masterImg);

    // Bangkitkan skenario produk
    loadScenario(selectedScenario);
  }, [currentMaster.code]);

  const loadScenario = (scenarioKey: string) => {
    setSelectedScenario(scenarioKey);
    setIsPreviewingCorrection(false);

    let prodImg = '';
    if (scenarioKey === 'scenario-match') {
      // Sangat sesuai dengan master
      prodImg = generateWoodTextureImage('#3e2c20', '#251810', {
        isChairComposition: true,
        brightnessOffset: 2,
        warmthOffset: 3,
      });
    } else if (scenarioKey === 'scenario-wb') {
      // Masalah Lampu / White Balance: Terlalu hangat/kuning (+warmth)
      prodImg = generateWoodTextureImage('#462d18', '#2b1b0e', {
        isChairComposition: true,
        warmthOffset: 28, // Terlalu kuning
        brightnessOffset: 6,
      });
    } else if (scenarioKey === 'scenario-material') {
      // Material salah: Terlalu gelap dan rona kemerahan
      prodImg = generateWoodTextureImage('#28160e', '#160b06', {
        isChairComposition: true,
        brightnessOffset: -28,
        warmthOffset: -10,
      });
    } else if (scenarioKey === 'scenario-conflict') {
      // Skenario khusus memicu konflik koreksi
      prodImg = generateWoodTextureImage('#42261a', '#22130c', {
        isChairComposition: true,
        brightnessOffset: 12,
        warmthOffset: 35,
      });
    } else if (scenarioKey === 'scenario-canon-raw') {
      // Sampel Nyata Kamera Canon RAW (.CR2) dari open dataset
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
    } else if (scenarioKey === 'scenario-nikon-raw') {
      // Sampel Nyata Kamera Nikon RAW (.NEF) dari open dataset
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
    }

    setProductImageSrc(prodImg);
    setPreviewImageSrc(prodImg);
  };

  // 2. Jalankan Analisis Setiap Kali Gambar atau Master Berubah
  useEffect(() => {
    if (!masterImageSrc || !productImageSrc) return;

    const runAnalysis = async () => {
      const measuredMap: Record<string, MeasuredEvidence> = {};
      const estimatedMap: Record<string, EstimatedRecommendation> = {};
      const fusionMap: Record<string, UnifiedMaterialReport> = {};

      // Ambil piksel dan statistik master panel (area tengah papan master)
      const masterExtract = await extractPixelsFromImageROI(masterImageSrc, {
        x: 25,
        y: 25,
        width: 50,
        height: 50,
      });

      for (const roi of rois) {
        const prodExtract = await extractPixelsFromImageROI(productImageSrc, roi.box);

        if (roi.role === 'master_backed') {
          const res = compareStats(masterExtract.stats, prodExtract.stats);

          // Simulasi konflik jika pada skenario konflik: buat armrest memiliki arah berlawanan
          if (selectedScenario === 'scenario-conflict' && roi.id === 'roi-armrest') {
            res.measured.deltaL = 12.4; // Terlalu terang
            res.measured.deltaB = -8.2; // Terlalu dingin
          }

          // Analisis Penggabungan Bukti Tekstur & Serat Kayu (Fase P1)
          const fusion = evaluateMaterialFusion(
            res.measured,
            masterExtract.data,
            prodExtract.data,
            masterExtract.width,
            masterExtract.height,
            prodExtract.width,
            prodExtract.height
          );

          fusionMap[roi.id] = fusion;
          measuredMap[roi.id] = res.measured;
          estimatedMap[roi.id] = res.estimated;
        } else {
          // No Master (Guardrail Only): Rekam statistik tanpa skor perbandingan material
          measuredMap[roi.id] = {
            deltaE00: 0,
            deltaL: 0,
            deltaA: 0,
            deltaB: 0,
            masterBrightness: 0,
            productBrightness: Number(prodExtract.stats.brightness.toFixed(1)),
            brightnessDiffPercent: 0,
            contrastDiffPercent: 0,
            saturationDiffPercent: 0,
            clippingWarning: {
              shadowClipped: prodExtract.stats.shadowClippingRatio > 0.05,
              highlightClipped: prodExtract.stats.highlightClippingRatio > 0.05,
            },
          };
        }
      }

      setRoiMeasured(measuredMap);
      setRoiEstimated(estimatedMap);
      setRoiFusion(fusionMap);

      // Hitung rekomendasi koreksi global dan deteksi konflik
      const pairs = rois.map((r) => ({ roi: r, measured: measuredMap[r.id] }));
      const corrResult = calculateRecommendedCorrection(pairs);
      setRecommendedCorrection(corrResult.recommended);
      setCorrectionConflict(corrResult.conflict);

      // Set default slider ke rekomendasi jika tidak konflik
      if (!corrResult.conflict.hasConflict) {
        setCorrectionParams(corrResult.recommended);
      } else {
        setCorrectionParams({
          temperatureK: 0,
          tint: 0,
          exposureEV: 0,
          brightness: 0,
          contrast: 0,
          saturation: 0,
        });
      }
    };

    runAnalysis();
  }, [masterImageSrc, productImageSrc, selectedScenario]);

  // 3. Render Preview Koreksi Non-Destruktif saat Slider Berubah
  useEffect(() => {
    if (!productImageSrc) return;

    if (!isPreviewingCorrection) {
      setPreviewImageSrc(productImageSrc);
      return;
    }

    renderCorrectedPreview(productImageSrc, correctionParams).then((res) => {
      setPreviewImageSrc(res);
    });
  }, [correctionParams, isPreviewingCorrection, productImageSrc]);

  // Handler Keputusan Operator Per-ROI
  const handleRoiDecision = (roiId: string, decision: 'PASS' | 'FAIL') => {
    if (decision === 'PASS') {
      setRoiDecisions((prev) => ({
        ...prev,
        [roiId]: { roiId, decision: 'PASS' },
      }));
    } else {
      const targetRoi = rois.find((r) => r.id === roiId);
      setFailTarget({
        type: 'roi',
        id: roiId,
        name: `Area: ${targetRoi?.name || 'Area'}`,
      });
      setFailModalOpen(true);
    }
  };

  // Handler Keputusan Produk Akhir
  const handleProductDecision = (decision: 'PASS' | 'FAIL') => {
    if (decision === 'PASS') {
      setProductDecision('PASS');
      saveFinalRecord('PASS', []);
    } else {
      setFailTarget({
        type: 'product',
        name: productName,
      });
      setFailModalOpen(true);
    }
  };

  // Konfirmasi Alasan FAIL dari Modal
  const handleConfirmFail = (reasons: string[], note: string) => {
    if (failTarget.type === 'roi' && failTarget.id) {
      setRoiDecisions((prev) => ({
        ...prev,
        [failTarget.id!]: {
          roiId: failTarget.id!,
          decision: 'FAIL',
          failReason: reasons.join(', '),
          note,
        },
      }));
    } else {
      setProductDecision('FAIL');
      saveFinalRecord('FAIL', reasons, note);
    }
  };

  // Simpan Riwayat QC (REQ-HISTORY-001)
  const saveFinalRecord = (decision: 'PASS' | 'FAIL', failReasons: string[], note?: string) => {
    const record: QCRecord = {
      id: `qc-${Date.now()}`,
      sessionId: 'sess-studio-01',
      timestamp: new Date().toISOString(),
      productName,
      masterCode: currentMaster.code,
      sourceImageName: imageMetadata.fileName,
      metadata: imageMetadata,
      rois: rois.map((r) => ({
        roi: r,
        measured: roiMeasured[r.id],
        estimated: roiEstimated[r.id],
        unifiedFusion: roiFusion[r.id],
        operatorDecision: roiDecisions[r.id],
      })),
      globalCorrection: correctionParams,
      conflictCheck: correctionConflict,
      finalProductDecision: {
        decision,
        failReasons,
        note,
        timestamp: new Date().toISOString(),
      },
    };

    onSaveQCRecord(record);
  };

  // Ekspor JPEG sRGB Non-Destruktif (REQ-EXPORT-001 s/d REQ-EXPORT-005)
  const handleExportJpeg = () => {
    const link = document.createElement('a');
    link.download = `${imageMetadata.fileName.replace(/\.[^/.]+$/, '')}_corrected_srgb.jpg`;
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Skenario Uji Coba Cepat (Fitur khusus ramah liburan untuk Mas Bima) */}
      <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-studio-300 uppercase tracking-wider">
            Skenario Simulasi Studio:
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => loadScenario('scenario-match')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-match'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              1. Finishing Sesuai (Lolos)
            </button>
            <button
              onClick={() => loadScenario('scenario-wb')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-wb'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              2. Masalah Lampu / WB
            </button>
            <button
              onClick={() => loadScenario('scenario-material')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-material'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              3. Material Berbeda (Cacat)
            </button>
            <button
              onClick={() => loadScenario('scenario-conflict')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-conflict'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              4. Uji Konflik Koreksi
            </button>
            <button
              onClick={() => loadScenario('scenario-canon-raw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-canon-raw'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              5. Canon Asli (.CR2)
            </button>
            <button
              onClick={() => loadScenario('scenario-nikon-raw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-nikon-raw'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              6. Nikon Asli (.NEF)
            </button>
          </div>
        </div>

        {/* Input Unggah Foto Nyata (Kamera Studio) */}
        <label className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 border border-studio-700 text-xs font-medium text-studio-200 flex items-center gap-1.5 transition">
          <Upload className="w-3.5 h-3.5 text-amber-400" />
          <span>Buka Foto Kamera (RAW/JPEG)</span>
          <input
            type="file"
            accept=".cr2,.cr3,.arw,.nef,.raf,.dng,.jpg,.jpeg,.png,.tiff"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Grid 2 Penampil Gambar (Master vs Produk) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Papan Master Fisik Acuan */}
        <InteractiveImageViewer
          title="Papan Master Fisik Acuan"
          subtitle={`Master Code: ${currentMaster.code} — ${currentMaster.name}`}
          imageSrc={masterImageSrc}
          isMaster={true}
        />

        {/* Kolom Kanan: Foto Produk Studio */}
        <InteractiveImageViewer
          title="Foto Produk Studio"
          subtitle={imageMetadata.fileName}
          imageSrc={previewImageSrc}
          rois={rois}
          selectedRoiId={selectedRoiId}
          onSelectRoi={setSelectedRoiId}
          roiEstimations={roiEstimated}
          isPreviewingCorrection={isPreviewingCorrection}
        />
      </div>

      {/* Metadata Pengambilan Gambar (EXIF Studio) */}
      <div className="bg-studio-900 border border-studio-800 rounded-xl px-4 py-3 text-xs text-studio-400 flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center space-x-2 text-studio-300">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="font-semibold">{imageMetadata.cameraModel}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Lensa: <b className="text-studio-200">{imageMetadata.lens}</b></span>
          <span>ISO: <b className="text-studio-200">{imageMetadata.iso}</b></span>
          <span>Speed: <b className="text-studio-200">{imageMetadata.shutterSpeed}</b></span>
          <span>Aperture: <b className="text-studio-200">{imageMetadata.aperture}</b></span>
          <span>WB: <b className="text-studio-200">{imageMetadata.whiteBalance}</b></span>
        </div>
      </div>

      {/* Bagian Perbandingan Per Area (ROI) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-studio-200">
            Perbandingan Per Area Produk (ROI)
          </h3>
          <span className="text-xs text-studio-400">
            Klik area untuk fokus atau pilih tombol Lolos/Gagal per area
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rois.map((roi) => (
            <EvidenceCard
              key={roi.id}
              roi={roi}
              measured={roiMeasured[roi.id]}
              estimated={roiEstimated[roi.id]}
              unifiedFusion={roiFusion[roi.id]}
              operatorDecision={roiDecisions[roi.id]}
              onOperatorDecision={handleRoiDecision}
              isSelected={selectedRoiId === roi.id}
              onSelect={() => setSelectedRoiId(roi.id)}
            />
          ))}
        </div>
      </div>

      {/* Panel Rekomendasi Koreksi & Deteksi Konflik */}
      <CorrectionPanel
        params={correctionParams}
        recommended={recommendedCorrection}
        conflict={correctionConflict}
        onChangeParams={setCorrectionParams}
        onApplyRecommended={() => setCorrectionParams(recommendedCorrection)}
        onReset={() =>
          setCorrectionParams({
            temperatureK: 0,
            tint: 0,
            exposureEV: 0,
            brightness: 0,
            contrast: 0,
            saturation: 0,
          })
        }
        isPreviewing={isPreviewingCorrection}
        onTogglePreview={() => setIsPreviewingCorrection(!isPreviewingCorrection)}
        onExportJpeg={handleExportJpeg}
      />

      {/* Panel Keputusan Akhir Produk (FINAL PRODUCT DECISION - REQ-QC-002) */}
      <div className="bg-gradient-to-r from-studio-900 via-studio-850 to-studio-900 border border-studio-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white">
              Keputusan Akhir Produk (Operator Authority)
            </h3>
            {productDecision && (
              <span
                className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  productDecision === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                STATUS: {productDecision}
              </span>
            )}
          </div>
          <p className="text-xs text-studio-400 mt-1 max-w-xl leading-relaxed">
            Sesuai prinsip sistem (INV-003), rekomendasi sistem bukan penentu mutlak. Operator menentukan apakah produk ini lolos QC studio secara keseluruhan atau memerlukan perbaikan/pemotretan ulang.
          </p>
        </div>

        {/* Tombol Keputusan Akhir */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => handleProductDecision('PASS')}
            className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
              productDecision === 'PASS'
                ? 'bg-emerald-500 text-black shadow-emerald-500/30 scale-105'
                : 'bg-studio-800 text-studio-200 hover:bg-emerald-600 hover:text-white border border-studio-700'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            PASS (PRODUK LOLOS)
          </button>

          <button
            onClick={() => handleProductDecision('FAIL')}
            className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
              productDecision === 'FAIL'
                ? 'bg-rose-600 text-white shadow-rose-600/30 scale-105'
                : 'bg-studio-800 text-studio-200 hover:bg-rose-600 hover:text-white border border-studio-700'
            }`}
          >
            <X className="w-4 h-4 stroke-[3]" />
            FAIL (PRODUK GAGAL)
          </button>
        </div>
      </div>

      {/* Modal Dialog Alasan FAIL */}
      <DecisionModal
        isOpen={failModalOpen}
        onClose={() => setFailModalOpen(false)}
        targetName={failTarget.name}
        onConfirmFail={handleConfirmFail}
      />
    </div>
  );
};
