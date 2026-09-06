// Konversi Warna Presisi: sRGB <-> Linear RGB <-> CIE XYZ (D65) <-> CIE L*a*b*

export interface RGB {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface XYZ {
  x: number; // 0 - 100+
  y: number; // 0 - 100
  z: number; // 0 - 100+
}

export interface Lab {
  l: number; // 0 - 100 (Kecerahan / Lightness)
  a: number; // -128 - +127 (Hijau - Merah)
  b: number; // -128 - +127 (Biru - Kuning)
}

// Standar Iluminan D65 (2 derajat pengamat standar CIE 1931)
const D65_XN = 95.047;
const D65_YN = 100.000;
const D65_ZN = 108.883;

/**
 * Konversi sRGB (0-255) ke Linear RGB (0-1)
 */
export function sRGBToLinearRGB(rgb: RGB): { r: number; g: number; b: number } {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return {
    r: toLinear(rgb.r),
    g: toLinear(rgb.g),
    b: toLinear(rgb.b),
  };
}

/**
 * Konversi Linear RGB (0-1) ke sRGB (0-255)
 */
export function linearRGBToSRGB(linear: { r: number; g: number; b: number }): RGB {
  const toSRGB = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    const c = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(c * 255);
  };
  return {
    r: toSRGB(linear.r),
    g: toSRGB(linear.g),
    b: toSRGB(linear.b),
  };
}

/**
 * Konversi sRGB ke CIE XYZ
 */
export function rgbToXyz(rgb: RGB): XYZ {
  const lin = sRGBToLinearRGB(rgb);
  // Matriks transformasi sRGB ke XYZ (D65)
  const x = (lin.r * 0.4124564 + lin.g * 0.3575761 + lin.b * 0.1804375) * 100;
  const y = (lin.r * 0.2126729 + lin.g * 0.7151522 + lin.b * 0.0721750) * 100;
  const z = (lin.r * 0.0193339 + lin.g * 0.1191920 + lin.b * 0.9503041) * 100;
  return { x, y, z };
}

/**
 * Konversi CIE XYZ ke CIE L*a*b*
 */
export function xyzToLab(xyz: XYZ): Lab {
  const fx = fXYZ(xyz.x / D65_XN);
  const fy = fXYZ(xyz.y / D65_YN);
  const fz = fXYZ(xyz.z / D65_ZN);

  const l = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

function fXYZ(t: number): number {
  const delta = 6 / 29;
  return t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * Math.pow(delta, 2)) + 4 / 29;
}

/**
 * Konversi langsung sRGB ke CIE L*a*b*
 */
export function rgbToLab(rgb: RGB): Lab {
  return xyzToLab(rgbToXyz(rgb));
}

/**
 * Konversi CIE L*a*b* ke CIE XYZ
 */
export function labToXyz(lab: Lab): XYZ {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  const invF = (t: number) => {
    const delta = 6 / 29;
    return t > delta ? Math.pow(t, 3) : 3 * Math.pow(delta, 2) * (t - 4 / 29);
  };

  const x = D65_XN * invF(fx);
  const y = D65_YN * invF(fy);
  const z = D65_ZN * invF(fz);

  return { x, y, z };
}

/**
 * Konversi CIE XYZ ke sRGB
 */
export function xyzToRgb(xyz: XYZ): RGB {
  const x = xyz.x / 100;
  const y = xyz.y / 100;
  const z = xyz.z / 100;

  const r = x *  3.2404542 + y * -1.5371385 + z * -0.4985314;
  const g = x * -0.9692660 + y *  1.8760108 + z *  0.0415560;
  const b = x *  0.0556434 + y * -0.2040259 + z *  1.0572252;

  return linearRGBToSRGB({ r, g, b });
}

/**
 * Konversi CIE L*a*b* kembali ke sRGB
 */
export function labToRgb(lab: Lab): RGB {
  return xyzToRgb(labToXyz(lab));
}
