import { MeasuredEvidence } from '../types';

// Hitung dari angka yang ditampilkan agar Master 20 → Produk 30 selalu +10 poin.
export function brightnessComparison(measured: MeasuredEvidence) {
  const difference = Number((measured.productBrightness - measured.masterBrightness).toFixed(1));
  return {
    difference,
    text: `${difference > 0 ? '+' : ''}${difference.toFixed(1)} poin`,
    label: Math.abs(difference) <= 3 ? 'Cahaya Pas' : difference > 0 ? 'Lebih Terang' : 'Lebih Gelap',
  };
}
