export interface FitSize {
  width: number;
  height: number;
}

/**
 * Menghitung ukuran gambar mode contain tanpa crop.
 * Skala dibatasi maksimal 1 agar gambar kecil tidak dipaksa membesar.
 */
export function calculateContainFit(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number
): FitSize {
  if (naturalWidth <= 0 || naturalHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(1, containerWidth / naturalWidth, containerHeight / naturalHeight);
  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}
