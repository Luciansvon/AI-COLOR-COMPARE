import { MeasuredEvidence } from '../types';

export type RgbBias = 'balanced' | 'red' | 'green' | 'blue';

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
  const total = rgb.r + rgb.g + rgb.b;
  if (total <= 0) return null;

  return {
    r: rgb.r / total,
    g: rgb.g / total,
    b: rgb.b / total,
  };
}

function signed(value: number): string {
  return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
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

  if (!master || !product) {
    return {
      available: false,
      bias: 'balanced',
      label: 'Data RGB tidak valid',
      deltaSharePercent: { r: 0, g: 0, b: 0 },
      summary: 'Nilai RGB area terlalu gelap atau kosong untuk dianalisis dengan aman.',
      cameraAction: 'Pilih ulang area yang memiliki informasi warna cukup.',
    };
  }

  const delta = {
    r: round1((product.r - master.r) * 100),
    g: round1((product.g - master.g) * 100),
    b: round1((product.b - master.b) * 100),
  };

  const maxAbs = Math.max(Math.abs(delta.r), Math.abs(delta.g), Math.abs(delta.b));
  const chromaShift = Math.sqrt(measured.deltaA * measured.deltaA + measured.deltaB * measured.deltaB);

  let bias: RgbBias = 'balanced';

  // Jangan memaksa label warna jika pergeseran RGB dan Lab sama-sama sangat kecil.
  if (!(maxAbs <= 1.2 && chromaShift <= 2.0)) {
    // Lab dipakai sebagai validasi arah supaya diagnosis RGB tidak tertipu karakter alami kayu.
    if (measured.deltaA >= 1.5 && delta.r > 0) {
      bias = 'red';
    } else if (measured.deltaA <= -1.5 && delta.g > 0) {
      bias = 'green';
    } else if (measured.deltaB <= -1.8 && delta.b > 0) {
      bias = 'blue';
    } else {
      const ranked: Array<[Exclude<RgbBias, 'balanced'>, number]> = [
        ['red', delta.r],
        ['green', delta.g],
        ['blue', delta.b],
      ].sort((a, b) => b[1] - a[1]);

      if (ranked[0][1] > 1.2) bias = ranked[0][0];
    }
  }

  const severity = maxAbs > 2.5 ? 'Cenderung' : 'Sedikit';
  const label =
    bias === 'red'
      ? `${severity} Kemerahan`
      : bias === 'green'
      ? `${severity} Kehijauan`
      : bias === 'blue'
      ? `${severity} Kebiruan`
      : 'Warna Seimbang';

  const summary = `${label}. Perubahan proporsi terhadap master: R ${signed(delta.r)}, G ${signed(delta.g)}, B ${signed(delta.b)}.`;

  if (measured.clippingWarning?.highlightClipped || measured.clippingWarning?.shadowClipped) {
    return {
      available: true,
      bias,
      label,
      deltaSharePercent: delta,
      summary,
      cameraAction: 'Periksa eksposur, silau, atau area terlalu gelap terlebih dahulu. Koreksi White Balance setelah clipping hilang.',
    };
  }

  if (bias === 'balanced') {
    return {
      available: true,
      bias,
      label,
      deltaSharePercent: delta,
      summary,
      cameraAction: 'RGB sudah seimbang terhadap master. Pertahankan White Balance kamera.',
    };
  }

  const directions: string[] = [];

  if (measured.deltaB > 1.8) directions.push('B (Blue / lebih dingin)');
  if (measured.deltaB < -1.8) directions.push('A (Amber / lebih hangat)');
  if (measured.deltaA > 1.5) directions.push('G (Green)');
  if (measured.deltaA < -1.5) directions.push('M (Magenta)');

  // Fallback jika pergeseran RGB terlihat tetapi nilai Lab berada dekat ambang.
  if (directions.length === 0) {
    if (bias === 'red') directions.push('G (Green)');
    if (bias === 'green') directions.push('M (Magenta)');
    if (bias === 'blue') directions.push('A (Amber / lebih hangat)');
  }

  return {
    available: true,
    bias,
    label,
    deltaSharePercent: delta,
    summary,
    cameraAction: `Canon EOS 80D: mulai 1 langkah White Balance Correction ke ${directions.join(' + ')}, foto ulang, lalu bandingkan lagi.`,
  };
}
