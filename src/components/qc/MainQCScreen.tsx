import React, { useState, useEffect } from 'react';
import {
  MasterIdentity,
  ROIItem,
  ROIBox,
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
import { Check, X, Upload, Sparkles, AlertTriangle, ShieldCheck, Camera, CheckCircle2, FolderOpen, Search, RefreshCw, ArrowRight } from 'lucide-react';

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
    box: { x: 27, y: 16, width: 9, height: 48 },
  },
  {
    id: 'roi-armrest',
    name: 'Sandaran Tangan (Armrest)',
    role: 'master_backed',
    box: { x: 20, y: 43, width: 13, height: 7 },
  },
  {
    id: 'roi-seat',
    name: 'Dudukan Kain (Fabric)',
    role: 'guardrail_only',
    box: { x: 30, y: 52, width: 40, height: 12 },
  },
];

const ROI_PRESETS = {
  center: [
    {
      id: 'roi-center',
      name: 'Area Utama Kayu (Tengah)',
      role: 'master_backed' as const,
      box: { x: 25, y: 25, width: 50, height: 50 },
    },
  ],
  multi: DEFAULT_ROIS,
  full: [
    {
      id: 'roi-full',
      name: 'Seluruh Permukaan Kayu (Full)',
      role: 'master_backed' as const,
      box: { x: 5, y: 5, width: 90, height: 90 },
    },
  ],
};

export const MainQCScreen: React.FC<MainQCScreenProps> = ({
  currentMaster,
  onSaveQCRecord,
}) => {
  // Mode Aplikasi: 'upload' (Unggah foto sendiri) atau 'demo' (Simulasi contoh)
  const [appMode, setAppMode] = useState<'upload' | 'demo'>('upload');

  // State Gambar
  const [masterImageSrc, setMasterImageSrc] = useState<string>('');
  const [masterFileName, setMasterFileName] = useState<string>('');
  const [productImageSrc, setProductImageSrc] = useState<string>('');
  const [previewImageSrc, setPreviewImageSrc] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('scenario-wb');
  const [productName, setProductName] = useState<string>('Produk Uji Studio');

  // State ROI & Analisis
  const [roiPreset, setRoiPreset] = useState<'center' | 'multi' | 'full' | 'custom'>('center');
  const [rois, setRois] = useState<ROIItem[]>(ROI_PRESETS.center);
  const [selectedRoiId, setSelectedRoiId] = useState<string>('roi-center');
  const [masterRoiBox, setMasterRoiBox] = useState<ROIBox>({ x: 25, y: 25, width: 50, height: 50 });
  const masterRois: ROIItem[] = [
    {
      id: 'roi-master-ref',
      name: 'Area Acuan Master',
      role: 'master_backed',
      box: masterRoiBox,
    },
  ];
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

  // State Modal & Preview
  const [isPreviewingCorrection, setIsPreviewingCorrection] = useState<boolean>(false);
  const [failModalOpen, setFailModalOpen] = useState<boolean>(false);
  const [failTarget, setFailTarget] = useState<{
    type: 'roi' | 'product';
    id?: string;
    name: string;
  }>({ type: 'product', name: '' });

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

  // Status Proses Perbandingan:
  // 'idle' (Foto belum lengkap)
  // 'ready' (Foto sudah lengkap, siap ditekan tombolnya)
  // 'analyzing' (Sedang memeriksa piksel warna & tekstur)
  // 'completed' (Selesai dibandingkan, hasil siap dilihat)
  const [comparisonStatus, setComparisonStatus] = useState<'idle' | 'ready' | 'analyzing' | 'completed'>('idle');

  // 1. Muat Gambar hanya jika pengguna memilih Mode Demo Simulasi
  useEffect(() => {
    if (appMode === 'demo') {
      const masterImg = generateWoodTextureImage('#3d2b1f', '#24170f', {
        isChairComposition: false,
      });
      setMasterImageSrc(masterImg);
      setMasterFileName(`${currentMaster.code}_simulasi_master.png`);
      loadScenario(selectedScenario);
    }
  }, [appMode, currentMaster.code]);

  const switchRoiPreset = (preset: 'center' | 'multi' | 'full' | 'custom') => {
    setRoiPreset(preset);
    if (preset !== 'custom') {
      const newRois = ROI_PRESETS[preset];
      setRois(newRois);
      setSelectedRoiId(newRois[0].id);
      if (comparisonStatus === 'completed' && masterImageSrc && productImageSrc) {
        executeComparison(masterImageSrc, productImageSrc, newRois);
      }
    }
  };

  // Handler saat pengguna menggeser atau mengubah ukuran kotak area di foto
  const handleUpdateRoiBox = (roiId: string, newBox: ROIBox, isFinal: boolean = true) => {
    setRoiPreset('custom');
    const updatedRois = rois.map((r) => (r.id === roiId ? { ...r, box: newBox } : r));
    setRois(updatedRois);

    // Hitung ulang perbandingan HANYA saat isFinal true (saat mouse dilepas)
    // dan gunakan silent update agar status comparisonStatus tidak berubah ke 'analyzing'
    // yang menyebabkan layar berkedip/naik-turun (layout shift).
    if (isFinal && comparisonStatus === 'completed' && masterImageSrc && productImageSrc) {
      executeComparison(masterImageSrc, productImageSrc, updatedRois, true);
    }
  };

  // Handler saat pengguna menggeser atau mengubah ukuran kotak area foto master
  const handleUpdateMasterRoiBox = (newBox: ROIBox, isFinal: boolean = true) => {
    setMasterRoiBox(newBox);
    if (isFinal && comparisonStatus === 'completed' && masterImageSrc && productImageSrc) {
      executeComparison(masterImageSrc, productImageSrc, rois, true, newBox);
    }
  };

  const handleMasterUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setMasterImageSrc(dataUrl);
      setMasterFileName(file.name);
      if (productImageSrc) {
        setComparisonStatus('ready');
      } else {
        setComparisonStatus('idle');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProductUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setProductImageSrc(dataUrl);
      setPreviewImageSrc(dataUrl);
      setImageMetadata((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        format: file.type || 'Decoded Image File (JPG/RAW)',
      }));
      if (masterImageSrc) {
        setComparisonStatus('ready');
      } else {
        setComparisonStatus('idle');
      }
    };
    reader.readAsDataURL(file);
  };

  const executeComparison = async (
    overrideMaster?: string,
    overrideProduct?: string,
    overrideRois?: ROIItem[],
    silentUpdate: boolean = false,
    overrideMasterBox?: ROIBox
  ) => {
    const mSrc = overrideMaster || masterImageSrc;
    const pSrc = overrideProduct || productImageSrc;
    const activeRois = overrideRois || rois;
    const activeMasterBox = overrideMasterBox || masterRoiBox;

    if (!mSrc || !pSrc) return;

    // HANYA ubah status menjadi 'analyzing' jika bukan silent update dan belum 'completed'.
    // Ini mencegah area hasil di bawah menghilang dan menyebabkan layar naik-turun.
    if (!silentUpdate && comparisonStatus !== 'completed') {
      setComparisonStatus('analyzing');
    }

    try {
      const measuredMap: Record<string, MeasuredEvidence> = {};
      const estimatedMap: Record<string, EstimatedRecommendation> = {};
      const fusionMap: Record<string, UnifiedMaterialReport> = {};

      // Ambil piksel dan statistik master panel dari area yang dipilih (activeMasterBox)
      const masterExtract = await extractPixelsFromImageROI(mSrc, activeMasterBox);

      for (const roi of activeRois) {
        const prodExtract = await extractPixelsFromImageROI(pSrc, roi.box);

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
      const pairs = activeRois.map((r) => ({ roi: r, measured: measuredMap[r.id] }));
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

      setComparisonStatus('completed');
    } catch (err) {
      console.error('Gagal melakukan ekstraksi dan perbandingan piksel:', err);
      setComparisonStatus('ready');
    }
  };

  const loadScenario = (scenarioKey: string) => {
    setSelectedScenario(scenarioKey);
    setIsPreviewingCorrection(false);
    setAppMode('demo');
    let mImg = masterImageSrc;
    if (!mImg) {
      mImg = generateWoodTextureImage('#3d2b1f', '#24170f', {
        isChairComposition: false,
      });
      setMasterImageSrc(mImg);
      setMasterFileName(`${currentMaster.code}_simulasi_master.png`);
    }

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
    executeComparison(mImg, prodImg);
  };

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
      {/* Pilihan Mode Kerja: Mode Uji Foto Sendiri (Default) vs Mode Demo Simulasi */}
      <div className="bg-studio-900 border border-studio-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setAppMode('upload');
              setMasterImageSrc('');
              setMasterFileName('');
              setProductImageSrc('');
              setPreviewImageSrc('');
              setRoiMeasured({});
              setRoiEstimated({});
              setRoiFusion({});
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              appMode === 'upload'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            1. Mode Uji Foto Sendiri (JPG / RAW)
          </button>

          <button
            onClick={() => {
              setAppMode('demo');
              loadScenario('scenario-match');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              appMode === 'demo'
                ? 'bg-studio-800 text-amber-300 border border-amber-500/40 shadow-lg'
                : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            2. Mode Contoh Demo Studio
          </button>
        </div>

        {/* Jika mode demo aktif, tampilkan 6 tombol skenario cepat */}
        {appMode === 'demo' && (
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
            <button
              onClick={() => loadScenario('scenario-match')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-match'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              1. Sesuai
            </button>
            <button
              onClick={() => loadScenario('scenario-wb')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-wb'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              2. Lampu / WB
            </button>
            <button
              onClick={() => loadScenario('scenario-material')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-material'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              3. Material Cacat
            </button>
            <button
              onClick={() => loadScenario('scenario-conflict')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-conflict'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              4. Konflik
            </button>
            <button
              onClick={() => loadScenario('scenario-canon-raw')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-canon-raw'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              5. Canon CR2
            </button>
            <button
              onClick={() => loadScenario('scenario-nikon-raw')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedScenario === 'scenario-nikon-raw'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
              }`}
            >
              6. Nikon NEF
            </button>
          </div>
        )}

        {/* Jika mode unggah aktif, tampilkan pilihan preset area kayu */}
        {appMode === 'upload' && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-studio-400">Pilihan Area Uji:</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => switchRoiPreset('center')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  roiPreset === 'center'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
                }`}
              >
                🎯 Area Tengah
              </button>
              <button
                onClick={() => switchRoiPreset('multi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  roiPreset === 'multi'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
                }`}
              >
                🪑 Multi-Area
              </button>
              <button
                onClick={() => switchRoiPreset('full')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  roiPreset === 'full'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
                }`}
              >
                📐 Seluruh Permukaan
              </button>
              <button
                onClick={() => switchRoiPreset('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  roiPreset === 'custom'
                    ? 'bg-amber-500 text-black font-bold shadow-md'
                    : 'bg-studio-950 text-studio-400 hover:text-white border border-studio-800'
                }`}
              >
                <span>✏️ Area Bebas (Manual)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bilah Alur Kerja 3 Langkah Studio (Studio Workflow Stepper) */}
      <div className="bg-studio-900/90 border border-studio-800 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Langkah 1 */}
          <div
            className={`flex items-center space-x-3 w-full md:w-1/3 p-3 rounded-xl border transition-all ${
              masterImageSrc && productImageSrc
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-studio-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                masterImageSrc && productImageSrc
                  ? 'bg-emerald-500 text-black'
                  : 'bg-amber-500 text-black'
              }`}
            >
              {masterImageSrc && productImageSrc ? '✓' : '1'}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-semibold opacity-75">
                Langkah 1
              </div>
              <div className="text-xs font-bold truncate">
                {masterImageSrc && productImageSrc
                  ? 'Foto Siap (Master & Produk)'
                  : 'Masukkan Dua Foto (Kiri & Kanan)'}
              </div>
            </div>
          </div>

          <div className="hidden md:block text-studio-600 font-bold text-sm">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Langkah 2 */}
          <div
            className={`flex items-center space-x-3 w-full md:w-1/3 p-3 rounded-xl border transition-all ${
              comparisonStatus === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : comparisonStatus === 'ready'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 animate-pulse'
                : comparisonStatus === 'analyzing'
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : 'bg-studio-950/40 border-studio-800 text-studio-500'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                comparisonStatus === 'completed'
                  ? 'bg-emerald-500 text-black'
                  : comparisonStatus === 'ready'
                  ? 'bg-amber-500 text-black'
                  : 'bg-studio-800 text-studio-400'
              }`}
            >
              {comparisonStatus === 'completed' ? '✓' : '2'}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-semibold opacity-75">
                Langkah 2
              </div>
              <div className="text-xs font-bold truncate">
                {comparisonStatus === 'completed'
                  ? 'Selesai Dibandingkan'
                  : comparisonStatus === 'analyzing'
                  ? 'Sedang Memeriksa Piksel...'
                  : comparisonStatus === 'ready'
                  ? 'Siap Ditekan (Bandingkan)'
                  : 'Tekan Tombol Bandingkan'}
              </div>
            </div>
          </div>

          <div className="hidden md:block text-studio-600 font-bold text-sm">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Langkah 3 */}
          <div
            className={`flex items-center space-x-3 w-full md:w-1/3 p-3 rounded-xl border transition-all ${
              productDecision
                ? productDecision === 'PASS'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : comparisonStatus === 'completed'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-studio-950/40 border-studio-800 text-studio-500'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                productDecision
                  ? productDecision === 'PASS'
                    ? 'bg-emerald-500 text-black'
                    : 'bg-rose-500 text-white'
                  : 'bg-studio-800 text-studio-400'
              }`}
            >
              {productDecision ? '✓' : '3'}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-semibold opacity-75">
                Langkah 3
              </div>
              <div className="text-xs font-bold truncate">
                {productDecision
                  ? `Keputusan: ${productDecision === 'PASS' ? 'Lolos (PASS)' : 'Gagal (FAIL)'}`
                  : comparisonStatus === 'completed'
                  ? 'Tentukan Keputusan Studio'
                  : 'Keputusan Akhir (PASS/FAIL)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2 Penampil Gambar (Master vs Produk) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Papan Master Fisik Acuan */}
        <InteractiveImageViewer
          title="1. Foto Papan Master Acuan (Kiri)"
          subtitle={masterFileName ? `Berkas: ${masterFileName}` : 'Langkah 1: Klik kotak ini untuk memilih foto sampel master kayu (JPG/RAW)'}
          imageSrc={masterImageSrc}
          isMaster={true}
          rois={masterRois}
          selectedRoiId="roi-master-ref"
          onUpdateRoiBox={(_, newBox, isFinal) => handleUpdateMasterRoiBox(newBox, isFinal)}
          isEditableRoi={true}
          onUploadImage={handleMasterUpload}
          uploadButtonText="Pilih / Unggah Foto Master Kayu (JPG / RAW)"
        />

        {/* Kolom Kanan: Foto Produk Studio */}
        <InteractiveImageViewer
          title="2. Foto Produk Studio yang Mau Dicek (Kanan)"
          subtitle={imageMetadata.fileName && productImageSrc ? `Berkas: ${imageMetadata.fileName}` : 'Langkah 1: Klik kotak ini untuk memilih foto produk yang mau dicek (JPG/RAW)'}
          imageSrc={previewImageSrc}
          rois={rois}
          selectedRoiId={selectedRoiId}
          onSelectRoi={setSelectedRoiId}
          onUpdateRoiBox={handleUpdateRoiBox}
          isEditableRoi={true}
          roiEstimations={roiEstimated}
          isPreviewingCorrection={isPreviewingCorrection}
          onUploadImage={handleProductUpload}
          uploadButtonText="Pilih / Unggah Foto Produk Studio (JPG / RAW)"
        />
      </div>

      {/* Banner Panduan jika foto belum lengkap dimasukkan */}
      {(!masterImageSrc || !productImageSrc) && (
        <div className="bg-gradient-to-br from-studio-900 to-studio-950 border border-amber-500/30 rounded-2xl p-5 text-center shadow-xl space-y-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Silakan Masukkan Foto Master dan Foto Produk (Format JPG Didukung)
            </h4>
            <p className="text-xs text-studio-400 max-w-lg mx-auto mt-1 leading-relaxed">
              Pilih foto di kedua kotak di atas, atau klik tombol cepat di bawah. Sistem tidak akan membandingkan sebelum Anda menekan tombol bandingkan.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <label
              htmlFor="master-file-input"
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition flex items-center gap-2 ${
                masterImageSrc
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border-amber-500/40 shadow-md'
              }`}
            >
              {masterImageSrc ? `✅ Master Terpasang: ${masterFileName}` : '📁 1. Klik untuk Masukkan Foto Master (Kiri)'}
            </label>
            <label
              htmlFor="product-file-input"
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition flex items-center gap-2 ${
                productImageSrc
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-white border-sky-500/40 shadow-md'
              }`}
            >
              {productImageSrc ? `✅ Produk Terpasang: ${imageMetadata.fileName}` : '📁 2. Klik untuk Masukkan Foto Produk (Kanan)'}
            </label>
          </div>
        </div>
      )}

      {/* PANEL TOMBOL AKSI UTAMA (Action Center) */}
      <div className="bg-gradient-to-r from-studio-900 via-studio-850 to-studio-900 border border-studio-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-studio-300">
              Status Pengecekan Studio:
            </span>
            {comparisonStatus === 'idle' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-studio-800 text-studio-400 border border-studio-700">
                ⏳ Menunggu Foto Lengkap
              </span>
            )}
            {comparisonStatus === 'ready' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                👉 Siap Dibandingkan!
              </span>
            )}
            {comparisonStatus === 'analyzing' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                ⚙️ Sedang Memeriksa Piksel & Serat...
              </span>
            )}
            {comparisonStatus === 'completed' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ✅ Selesai Dibandingkan!
              </span>
            )}
          </div>
          <p className="text-xs text-studio-400">
            {comparisonStatus === 'idle'
              ? 'Langkah 1: Masukkan foto master (kiri) dan foto produk (kanan) di atas.'
              : comparisonStatus === 'ready'
              ? 'Langkah 2: Kedua foto sudah siap! Klik tombol kuning di samping untuk mulai membandingkan warna dan serat kayu.'
              : comparisonStatus === 'analyzing'
              ? 'Sistem sedang membaca piksel warna CIEDE2000 dan pola serat kayu LBP...'
              : 'Pemeriksaan selesai. Rincian hasil perbandingan dan tombol keputusan tersedia di bawah.'}
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center space-x-3 shrink-0">
          {comparisonStatus === 'idle' && (
            <button
              disabled
              className="px-6 py-3.5 rounded-xl bg-studio-800 text-studio-500 border border-studio-700/50 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-not-allowed opacity-70"
            >
              <span>⏳ Masukkan Kedua Foto Dulu</span>
            </button>
          )}

          {comparisonStatus === 'ready' && (
            <button
              id="btn-start-compare"
              onClick={() => executeComparison()}
              className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-xl shadow-amber-500/20 scale-105 hover:scale-110 active:scale-100"
            >
              <Search className="w-4 h-4 stroke-[3]" />
              <span>🔍 KLIK UNTUK BANDINGKAN SEKARANG</span>
            </button>
          )}

          {comparisonStatus === 'analyzing' && (
            <button
              disabled
              className="px-8 py-3.5 rounded-xl bg-sky-600/80 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 cursor-wait shadow-lg"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>MEMERIKSA WARNA & SERAT...</span>
            </button>
          )}

          {comparisonStatus === 'completed' && (
            <button
              id="btn-recompare"
              onClick={() => executeComparison()}
              className="px-5 py-3 rounded-xl bg-studio-800 hover:bg-studio-700 text-studio-200 hover:text-white border border-studio-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Bandingkan Ulang</span>
            </button>
          )}
        </div>
      </div>

      {/* Jika status SUDAH selesai dibandingkan, tampilkan hasil perbandingan */}
      {comparisonStatus === 'completed' && (
        <>
          {/* Banner Status Berhasil Dimuat */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-2 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Foto Master dan Foto Produk berhasil dimuat! Hasil analisis perbandingan warna dan serat kayu tersaji di bawah:</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              QC Aktif
            </span>
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
                {rois.length === 1
                  ? 'Analisis kesesuaian warna dan serat kayu pada area yang diuji'
                  : 'Klik kartu area untuk menyorot area pada foto'}
              </span>
            </div>

            <div className={rois.length === 1 ? 'w-full' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
              {rois.map((roi) => (
                <EvidenceCard
                  key={roi.id}
                  roi={roi}
                  measured={roiMeasured[roi.id]}
                  estimated={roiEstimated[roi.id]}
                  unifiedFusion={roiFusion[roi.id]}
                  isSingleArea={rois.length === 1}
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
        </>
      )}

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
