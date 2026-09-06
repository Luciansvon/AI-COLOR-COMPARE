// Definisi Tipe Data Inti Sistem Studio Color QC

export type MasterIdentity = {
  id: string;
  code: string;           // Contoh: "WN-04"
  name: string;           // Contoh: "Walnut Dark Satin"
  category: 'wood' | 'metal' | 'fabric' | 'leather' | 'other';
  referenceImageUrl?: string;
  nominalLab?: { l: number; a: number; b: number };
  description?: string;
  createdAt: string;
};

export type ROIBox = {
  x: number;      // persentase 0 - 100
  y: number;      // persentase 0 - 100
  width: number;  // persentase 0 - 100
  height: number; // persentase 0 - 100
};

export type ROIItem = {
  id: string;
  name: string;                   // Contoh: "Rangka Walnut", "Dudukan Kain"
  box: ROIBox;
  masterId?: string;              // Kosong jika ROI tanpa master (REQ-ROI-004)
  role: 'master_backed' | 'guardrail_only';
};

export type MeasuredEvidence = {
  deltaE00: number;               // Selisih warna CIEDE2000
  deltaL: number;                 // Selisih kecerahan (+ lebih terang, - lebih gelap)
  deltaA: number;                 // Selisih merah-hijau (+ lebih merah, - lebih hijau)
  deltaB: number;                 // Selisih kuning-biru (+ lebih kuning/hangat, - lebih biru/dingin)
  masterBrightness: number;
  productBrightness: number;
  brightnessDiffPercent: number;
  contrastDiffPercent: number;
  saturationDiffPercent: number;
  clippingWarning?: {
    shadowClipped: boolean;
    highlightClipped: boolean;
  };
};

export type EstimatedRecommendation = {
  status: 'sesuai' | 'perlu_dicek' | 'tidak_sesuai';
  label: 'Kemungkinan Sesuai' | 'Perlu Dicek' | 'Kemungkinan Tidak Sesuai';
  confidence: 'Tinggi' | 'Sedang' | 'Rendah';
  primaryCause: 'Material / Finishing' | 'Pencahayaan / White Balance' | 'Refleksi / Sudut' | 'Belum Pasti';
  explanation: string;
};

export type CorrectionParams = {
  temperatureK: number;   // Selisih Kelvin, misal -150 K
  tint: number;           // -100 s/d +100
  exposureEV: number;     // Misal -0.15 EV
  brightness: number;     // -50 s/d +50
  contrast: number;       // -50 s/d +50
  saturation: number;     // -50 s/d +50
};

export type CorrectionConflict = {
  hasConflict: boolean;
  details?: {
    improvedROI: string;
    worsenedROI: string;
    reason: string;
  };
};

export type ROIDecision = {
  roiId: string;
  decision: 'PASS' | 'FAIL';
  failReason?: string;
  note?: string;
};

export type ProductDecision = {
  decision: 'PASS' | 'FAIL';
  failReasons: string[];
  note?: string;
  timestamp: string;
};

export type ImageMetadata = {
  fileName: string;
  fileSize: number;
  format: string;
  cameraModel?: string;
  lens?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: string;
  whiteBalance?: string;
  capturedAt?: string;
};

export type QCRecord = {
  id: string;
  sessionId: string;
  timestamp: string;
  productName: string;
  masterCode: string;
  sourceImageName: string;
  metadata: ImageMetadata;
  rois: {
    roi: ROIItem;
    measured?: MeasuredEvidence;
    estimated?: EstimatedRecommendation;
    operatorDecision?: ROIDecision;
  }[];
  globalCorrection?: CorrectionParams;
  conflictCheck?: CorrectionConflict;
  finalProductDecision?: ProductDecision;
};
