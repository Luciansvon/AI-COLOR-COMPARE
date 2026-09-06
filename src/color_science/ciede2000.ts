// Implementasi CIEDE2000 (ΔE00) Berdasarkan Standar CIE & Sharma et al. (2005)
import { Lab } from './transforms';

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Menghitung perbedaan warna ΔE00 antara dua nilai warna CIE Lab
 * kL, kC, kH default adalah 1.0 (standar grafis dan industri)
 */
export function calculateDeltaE00(
  lab1: Lab,
  lab2: Lab,
  kL: number = 1.0,
  kC: number = 1.0,
  kH: number = 1.0
): number {
  const { l: l1, a: a1, b: b1 } = lab1;
  const { l: l2, a: a2, b: b2 } = lab2;

  // 1. Hitung C1, C2, dan Cbar
  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const cBar = (c1 + c2) / 2;

  // 2. Faktor G
  const cBar7 = Math.pow(cBar, 7);
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + Math.pow(25, 7))));

  // 3. Modifikasi koordinat a'
  const a1Prime = (1 + g) * a1;
  const a2Prime = (1 + g) * a2;

  // 4. Hitung C'1 dan C'2
  const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  // 5. Hitung sudut h'1 dan h'2 dalam derajat (0 - 360)
  let h1Prime = deg(Math.atan2(b1, a1Prime));
  if (h1Prime < 0) h1Prime += 360;

  let h2Prime = deg(Math.atan2(b2, a2Prime));
  if (h2Prime < 0) h2Prime += 360;

  // 6. Hitung delta L', delta C', dan delta h'
  const deltaLPrime = l2 - l1;
  const deltaCPrime = c2Prime - c1Prime;

  let deltaHPrimeDegrees = 0;
  if (c1Prime * c2Prime !== 0) {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) {
      deltaHPrimeDegrees = diff;
    } else if (diff > 180) {
      deltaHPrimeDegrees = diff - 360;
    } else {
      deltaHPrimeDegrees = diff + 360;
    }
  }
  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(rad(deltaHPrimeDegrees / 2));

  // 7. Hitung rata-rata L'bar, C'bar, dan h'bar
  const lBarPrime = (l1 + l2) / 2;
  const cBarPrime = (c1Prime + c2Prime) / 2;

  let hBarPrime = 0;
  if (c1Prime * c2Prime === 0) {
    hBarPrime = h1Prime + h2Prime;
  } else {
    const diff = Math.abs(h1Prime - h2Prime);
    const sum = h1Prime + h2Prime;
    if (diff <= 180) {
      hBarPrime = sum / 2;
    } else if (sum < 360) {
      hBarPrime = (sum + 360) / 2;
    } else {
      hBarPrime = (sum - 360) / 2;
    }
  }

  // 8. Hitung T
  const t =
    1 -
    0.17 * Math.cos(rad(hBarPrime - 30)) +
    0.24 * Math.cos(rad(2 * hBarPrime)) +
    0.32 * Math.cos(rad(3 * hBarPrime + 6)) -
    0.20 * Math.cos(rad(4 * hBarPrime - 63));

  // 9. Hitung faktor koreksi bobot SL, SC, SH, dan RT
  const deltaTheta = 30 * Math.exp(-Math.pow((hBarPrime - 275) / 25, 2));
  const cBarPrime7 = Math.pow(cBarPrime, 7);
  const rc = 2 * Math.sqrt(cBarPrime7 / (cBarPrime7 + Math.pow(25, 7)));

  const lBarPrimeMinus50Sq = Math.pow(lBarPrime - 50, 2);
  const sL = 1 + (0.015 * lBarPrimeMinus50Sq) / Math.sqrt(20 + lBarPrimeMinus50Sq);
  const sC = 1 + 0.045 * cBarPrime;
  const sH = 1 + 0.015 * cBarPrime * t;

  const rT = -Math.sin(rad(2 * deltaTheta)) * rc;

  // 10. Hitung total ΔE00
  const lTerm = deltaLPrime / (kL * sL);
  const cTerm = deltaCPrime / (kC * sC);
  const hTerm = deltaHPrime / (kH * sH);

  const deltaE00Sq =
    Math.pow(lTerm, 2) +
    Math.pow(cTerm, 2) +
    Math.pow(hTerm, 2) +
    rT * cTerm * hTerm;

  return Math.sqrt(Math.max(0, deltaE00Sq));
}
