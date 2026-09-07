import { MeasuredEvidence } from '../types';

export type RgbBias = 'balanced' | 'red' | 'green' | 'blue' | 'yellow' | 'uncertain';

export interface RgbBalanceAnalysis {
  available: boolean;
  bias: RgbBias;
  label: string;
  deltaSharePercent: { r: number; g: number; b: number };
  summary: string;
  cameraAction: string;
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function normalizedShares(rgb: { r: number; g: number; b: number }) {
  if (![rgb.r, rgb.g, rgb.b].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) return null;
  const total = rgb.r + rgb.g + rgb.b;
  if (total <= 0) return null;

  return {
    r: rgb.r / total,
    g: rgb.g / total,
    b: rgb.b / total,
  };
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} poin persen`;
}

/**
 * Analisis RGB yang tahan terhadap perubahan exposure global.
 *
 * Nilai R/G/B tidak dibandingkan langsung karena material kayu memang bisa memiliki
 * kanal merah lebih tinggi secara alami. Yang dibandingkan adalah PROPORSI kanal RGB
 * produk terhadap master fisik pada ROI yang sama.
 *
 * Arah koreksi Canon EOS 80D divalidasi lagi dengan sumbu Lab:
 * - deltaA +  => produk lebih merah/magenta => arah koreksi G (Green)
 * - deltaA -  => produk lebih hijau         => arah koreksi M (Magenta)
 * - deltaB +  => produk lebih kuning/hangat => arah koreksi B (Blue)
 * - deltaB -  => produk lebih biru/dingin   => arah koreksi A (Amber)
 *
 * Besaran langkah kamera tidak ditebak dari Lab. Operator diminta mulai 1 langkah,
 * foto ulang, lalu bandingkan kembali agar tetap berbasis bukti nyata.
 */
export function analyzeRgbBalance(measured: MeasuredEvidence): RgbBalanceAnalysis {
  if (!measured.masterRgb || !measured.productRgb) {
    return {
      available: false,
      bias: 'balanced',
      label: 'Data RGB belum tersedia',
      deltaSharePercent: { r: 0, g: 0, b: 0 },
      summary: 'Data RGB master dan produk belum tersedia untuk area ini.',
      cameraAction: 'Tidak ada koreksi RGB yang disarankan.',
    };
  }

  const master = normalizedShares(measured.masterRgb);
  const product = normalizedShares(measured.productRgb);

  if (!master || !product || ![measured.deltaA, measured.deltaB].every(Number.isFinite)) {
    return {
      available: false,
      bias: 'balanced',
      label: 'Data RGB tidak valid',
      deltaSharePercent: { r: 0, g: 0, b: 0 },
      summary: 'Nilai RGB area terlalu gelap atau kosong untuk dianalisis dengan aman.',
      cameraAction: 'Pilih ulang area yang memiliki informasi warna cukup.',
    };
  }

  const rawDelta = {
    r: (product.r - master.r) * 100,
    g: (product.g - master.g) * 100,
    b: (product.b - master.b) * 100,
  };
  const delta = { r: round1(rawDelta.r), g: round1(rawDelta.g), b: round1(rawDelta.b) };

  const maxAbs = Math.max(Math.abs(rawDelta.r), Math.abs(rawDelta.g), Math.abs(rawDelta.b));
  const chromaShift = Math.sqrt(measured.deltaA * measured.deltaA + measured.deltaB * measured.deltaB);

  let bias: RgbBias = 'balanced';

  // Jangan memaksa label warna jika pergeseran RGB dan Lab sama-sama sangat kecil.
  if (!(maxAbs <= 1.2 && chromaShift <= 2.0)) {
    // Pilih sumbu dominan; merah tidak boleh selalu mengalahkan biru yang lebih kuat.
    const candidates: Array<[RgbBias, number]> = [];
    if (measured.deltaA >= 1.5 && rawDelta.r > 0) candidates.push(['red', measured.deltaA / 1.5]);
    if (measured.deltaA <= -1.5 && rawDelta.g > 0) candidates.push(['green', -measured.deltaA / 1.5]);
    if (measured.deltaB <= -1.8 && rawDelta.b > 0) candidates.push(['blue', -measured.deltaB / 1.8]);
    if (measured.deltaB >= 1.8 && rawDelta.b < 0) candidates.push(['yellow', measured.deltaB / 1.8]);
    candidates.sort((a, b) => b[1] - a[1]);
    bias = candidates[0]?.[0] ?? 'uncertain';
  }

  const severity = maxAbs > 2.5 ? 'Cenderung' : 'Sedikit';
  const label =
    bias === 'red'
      ? `${severity} Kemerahan`
      : bias === 'green'
      ? `${severity} Kehijauan`
      : bias === 'blue'
      ? `${severity} Kebiruan`
      : bias === 'yellow'
      ? `${severity} Kekuningan`
      : bias === 'uncertain'
      ? 'Arah Warna Belum Pasti'
      : 'Warna Seimbang';

  const summary = `${label}. Perubahan proporsi terhadap master: R ${signed(delta.r)}, G ${signed(delta.g)}, B ${signed(delta.b)}.`;

  if (measured.clippingWarning?.highlightClipped || measured.clippingWarning?.shadowClipped) {
    return {
      available: true,
      bias,
      label,
      deltaSharePercent: delta,
      summary,
      cameraAction: 'Periksa eksposur, silau, atau area terlalu gelap pada foto master dan produk terlebih dahulu. Koreksi White Balance setelah clipping hilang.',
    };
  }

  if (bias === 'balanced' || bias === 'uncertain') {
    return {
      available: true,
      bias,
      label,
      deltaSharePercent: delta,
      summary,
      cameraAction: bias === 'balanced'
        ? 'RGB sudah seimbang terhadap master. Pertahankan White Balance kamera.'
        : 'Arah RGB dan Lab belum cukup konsisten. Samakan area pembanding dan pencahayaan, lalu foto ulang sebelum mengubah White Balance.',
    };
  }

  const directions: string[] = [];

  if (measured.deltaB >= 1.8) directions.push('B (Blue / lebih dingin)');
  if (measured.deltaB <= -1.8) directions.push('A (Amber / lebih hangat)');
  if (measured.deltaA >= 1.5) directions.push('G (Green)');
  if (measured.deltaA <= -1.5) directions.push('M (Magenta)');

  return {
    available: true,
    bias,
    label,
    deltaSharePercent: delta,
    summary,
    cameraAction: `Jika memakai Canon EOS 80D: buka Menu Pemotretan 2 → WB Shift/Bkt. Coba 1 langkah dari posisi saat ini ke ${directions.join(' + ')}, foto ulang, lalu bandingkan lagi. Ini percobaan awal, bukan angka koreksi kamera yang sudah dikalibrasi.`,
  };
}
