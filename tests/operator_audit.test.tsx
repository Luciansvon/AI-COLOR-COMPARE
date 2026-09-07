import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculateRecommendedCorrection, ZERO_CORRECTION } from '../src/color_science/correction';
import { compareStats, extractROIStats } from '../src/color_science/metrics';
import { evaluateMaterialFusion } from '../src/color_science/texture';
import { brightnessComparison } from '../src/utils/measurementDisplay';
import { EvidenceCard } from '../src/components/qc/EvidenceCard';
import { CorrectionPanel } from '../src/components/qc/CorrectionPanel';
import { QCReportModal } from '../src/components/qc/QCReportModal';
import { MeasuredEvidence, ROIItem } from '../src/types';

const roi: ROIItem = { id: 'test', name: 'Area Uji', role: 'master_backed', box: { x: 0, y: 0, width: 100, height: 100 } };
const base: MeasuredEvidence = {
  deltaE00: 1, deltaL: 10, deltaA: 0, deltaB: 0,
  masterBrightness: 20, productBrightness: 30, brightnessDiffPercent: 50,
  saturationDiffPercent: 0, contrastDiffPercent: 0,
  masterRgb: { r: 120, g: 80, b: 40 }, productRgb: { r: 120, g: 80, b: 40 },
};
assert.equal(brightnessComparison(base).text, '+10.0 poin');
assert.equal(brightnessComparison({ ...base, masterBrightness: 30, productBrightness: 20 }).text, '-10.0 poin');
assert.equal(brightnessComparison({ ...base, masterBrightness: 0 }).text, '+30.0 poin');
assert.equal(brightnessComparison({ ...base, masterBrightness: 20.1, productBrightness: 20.2 }).text, '+0.1 poin');

const card = renderToStaticMarkup(<EvidenceCard roi={roi} measured={base} />);
assert.match(card, /20 \/ 100/);
assert.match(card, /30 \/ 100/);
assert.match(card, /\+10.0 poin/);
assert.doesNotMatch(card, /20%|30%|50%/);
assert.match(card, /Panduan RGB operator/);
const report = renderToStaticMarkup(<QCReportModal isOpen onClose={() => {}} productName="Uji" masterCode="M1" masterName="Master"
  metadata={{ fileName: 'uji.png', fileSize: 10, format: 'PNG' }} rois={[roi]} measuredMap={{ test: base }} fusionMap={{}} decision={null} />);
assert.match(report, /\+10.0 poin/);
assert.match(report, /Lebih Terang/);
assert.doesNotMatch(report, /20%|30%|50%/);
const guardrail = renderToStaticMarkup(<EvidenceCard roi={{ ...roi, role: 'guardrail_only' }} measured={base} />);
assert.doesNotMatch(guardrail, /Panduan RGB operator|Warna Seimbang|Papan Statistik Komparasi/);

// Rona merah dan hijau di area berbeda memerlukan koreksi yang berlawanan.
const conflict = calculateRecommendedCorrection([
  { roi, measured: { ...base, deltaL: 0, deltaA: 5 } },
  { roi: { ...roi, id: 'other', name: 'Area Lain' }, measured: { ...base, deltaL: 0, deltaA: -5 } },
]);
assert.equal(conflict.conflict.hasConflict, true);
assert.match(conflict.conflict.details!.reason, /hijau–magenta/);
assert.deepEqual(conflict.recommended, ZERO_CORRECTION);
const extreme = calculateRecommendedCorrection([{ roi, measured: { ...base, deltaB: 100, deltaA: -100, deltaL: -100, saturationDiffPercent: 200 } }]);
assert.equal(extreme.recommended.temperatureK, -800);
assert.equal(extreme.recommended.tint, 100);
assert.equal(extreme.recommended.exposureEV, 1.5);
assert.equal(extreme.recommended.saturation, -50);

const clippedPixels = new Uint8ClampedArray(16 * 16 * 4);
const normalPixels = new Uint8ClampedArray(16 * 16 * 4);
for (let i = 0; i < clippedPixels.length; i += 4) {
  clippedPixels.set([255, 170, 90, 255], i);
  normalPixels.set([120, 80, 40, 255], i);
}
const clippedMaster = compareStats(extractROIStats(clippedPixels), extractROIStats(normalPixels));
assert.equal(clippedMaster.measured.clippingWarning?.highlightClipped, true);
assert.equal(clippedMaster.estimated.confidence, 'Rendah');
assert.equal(calculateRecommendedCorrection([{ roi, measured: clippedMaster.measured }]).conflict.hasConflict, true);
const clippedFusion = evaluateMaterialFusion({ ...base, clippingWarning: { highlightClipped: true, shadowClipped: false } }, clippedPixels, clippedPixels, 16, 16);
assert.equal(clippedFusion.diagnosisType, 'CaptureUncertain');
assert.equal(clippedFusion.confidenceLevel, 'Rendah');
const conforming = evaluateMaterialFusion({ ...base, deltaL: 0 }, normalPixels, normalPixels, 16, 16);
assert.doesNotMatch(JSON.stringify(conforming), /Lolos Sempurna|Aman untuk dipotret|terbukti identik/);

const panel = renderToStaticMarkup(<CorrectionPanel params={{ ...ZERO_CORRECTION, tint: -10 }} recommended={{ ...ZERO_CORRECTION, tint: -10 }}
  conflict={{ hasConflict: false }} onChangeParams={() => {}} onApplyRecommended={() => {}} onReset={() => {}}
  isPreviewing={false} onTogglePreview={() => {}} onExportJpeg={() => {}} />);
assert.match(panel, /Hijau–Magenta -10/);
assert.match(panel, /aria-label="Hijau–Magenta simulasi"/);
assert.doesNotMatch(panel, /tidak perlu penyesuaian|Tidak ada penyesuaian/);
console.log('Audit operator: angka layar/laporan, RGB, konflik tint, batas slider, dan clipping master lulus.');
