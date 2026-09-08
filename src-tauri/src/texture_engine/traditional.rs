// Modul Ekstraksi Tekstur Tradisional: LBP (Local Binary Pattern) & GLCM
// Dirancang tahan terhadap perubahan pencahayaan/kecerahan (Illumination Invariant)

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlcmFeatures {
    pub contrast: f64,
    pub homogeneity: f64,
    pub energy: f64,
    pub dissimilarity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraditionalTextureReport {
    pub lbp_histogram: Vec<f64>,
    pub glcm: GlcmFeatures,
    pub average_roughness: f64,
    pub mean_gradient: f64,
    pub strong_edge_ratio: f64,
    pub is_smooth: bool,
}

/// Mengukur kekuatan pola nyata agar noise kamera pada permukaan polos tidak
/// diperlakukan sebagai serat. Ambang disamakan dengan engine TypeScript aktif.
pub fn calculate_texture_strength(gray: &[u8], width: usize, height: usize) -> (f64, f64, bool) {
    if width < 3 || height < 3 || gray.len() < width * height {
        return (0.0, 0.0, true);
    }

    let mut gradient_sum = 0.0;
    let mut strong_edges = 0usize;
    let mut samples = 0usize;

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let gx = gray[y * width + x + 1] as f64 - gray[y * width + x - 1] as f64;
            let gy = gray[(y + 1) * width + x] as f64 - gray[(y - 1) * width + x] as f64;
            let magnitude = (gx * gx + gy * gy).sqrt();
            gradient_sum += magnitude;
            if magnitude >= 18.0 {
                strong_edges += 1;
            }
            samples += 1;
        }
    }

    let mean_gradient = gradient_sum / samples.max(1) as f64;
    let strong_edge_ratio = strong_edges as f64 / samples.max(1) as f64;
    let is_smooth = mean_gradient < 7.0 && strong_edge_ratio < 0.025;
    (mean_gradient, strong_edge_ratio, is_smooth)
}

/// Mengubah buffer RGBA menjadi citra derajat keabuan (grayscale 8-bit)
pub fn rgba_to_grayscale(rgba: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut gray = Vec::with_capacity(width * height);
    for chunk in rgba.chunks_exact(4) {
        let r = chunk[0] as f64;
        let g = chunk[1] as f64;
        let b = chunk[2] as f64;
        // Standar luminansi Rec.601
        let luma = (0.299 * r + 0.587 * g + 0.114 * b).round() as u8;
        gray.push(luma);
    }
    gray
}

/// Menghitung Local Binary Pattern (LBP) 8-tetangga
/// Nilai LBP invarian terhadap perubahan kecerahan linier/monotonik (lampu studio lebih terang/gelap)
pub fn calculate_lbp_histogram(gray: &[u8], width: usize, height: usize) -> Vec<f64> {
    let mut hist = vec![0.0f64; 256];
    if width < 3 || height < 3 {
        return hist;
    }

    let mut total_pixels = 0.0f64;

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let center = gray[y * width + x];
            let mut pattern: u8 = 0;

            // 8 tetangga searah jarum jam mulai dari kiri atas (-1, -1)
            let neighbors = [
                (x - 1, y - 1),
                (x, y - 1),
                (x + 1, y - 1),
                (x + 1, y),
                (x + 1, y + 1),
                (x, y + 1),
                (x - 1, y + 1),
                (x - 1, y),
            ];

            for (i, &(nx, ny)) in neighbors.iter().enumerate() {
                if gray[ny * width + nx] >= center {
                    pattern |= 1 << i;
                }
            }

            hist[pattern as usize] += 1.0;
            total_pixels += 1.0;
        }
    }

    // Normalisasi histogram LBP sehingga total = 1.0
    if total_pixels > 0.0 {
        for val in hist.iter_mut() {
            *val /= total_pixels;
        }
    }

    hist
}

/// Menghitung kemiripan histogram LBP (Histogram Intersection)
/// Mengembalikan nilai 0.0 (sangat berbeda) hingga 1.0 (serat identik)
pub fn compare_lbp_similarity(hist1: &[f64], hist2: &[f64]) -> f64 {
    let mut intersection = 0.0f64;
    for i in 0..256.min(hist1.len()).min(hist2.len()) {
        intersection += hist1[i].min(hist2[i]);
    }
    intersection.clamp(0.0, 1.0)
}

/// Menghitung matriks ko-okurensi tingkat keabuan (GLCM) sederhana pada jarak d=1, sudut 0 derajat
pub fn calculate_glcm_features(gray: &[u8], width: usize, height: usize) -> GlcmFeatures {
    if width < 2 || height < 1 {
        return GlcmFeatures {
            contrast: 0.0,
            homogeneity: 1.0,
            energy: 1.0,
            dissimilarity: 0.0,
        };
    }

    // Mengurangi level abu-abu ke 16 bin untuk efisiensi CPU dan kestabilan statistik
    const BINS: usize = 16;
    let mut glcm = [[0.0f64; BINS]; BINS];
    let mut total_pairs = 0.0f64;

    for y in 0..height {
        for x in 0..width - 1 {
            let i = (gray[y * width + x] / 16) as usize;
            let j = (gray[y * width + (x + 1)] / 16) as usize;
            glcm[i][j] += 1.0;
            total_pairs += 1.0;
        }
    }

    if total_pairs == 0.0 {
        return GlcmFeatures {
            contrast: 0.0,
            homogeneity: 1.0,
            energy: 1.0,
            dissimilarity: 0.0,
        };
    }

    // Normalisasi GLCM
    for row in glcm.iter_mut() {
        for cell in row.iter_mut() {
            *cell /= total_pairs;
        }
    }

    let mut contrast = 0.0f64;
    let mut homogeneity = 0.0f64;
    let mut energy = 0.0f64;
    let mut dissimilarity = 0.0f64;

    for i in 0..BINS {
        for j in 0..BINS {
            let p = glcm[i][j];
            let diff = (i as f64 - j as f64).abs();
            contrast += diff.powi(2) * p;
            dissimilarity += diff * p;
            homogeneity += p / (1.0 + diff);
            energy += p * p;
        }
    }

    GlcmFeatures {
        contrast,
        homogeneity,
        energy,
        dissimilarity,
    }
}

/// Ekstraksi seluruh fitur tekstur tradisional dari buffer RGBA
pub fn extract_traditional_texture(rgba: &[u8], width: usize, height: usize) -> TraditionalTextureReport {
    let gray = rgba_to_grayscale(rgba, width, height);
    let lbp_histogram = calculate_lbp_histogram(&gray, width, height);
    let glcm = calculate_glcm_features(&gray, width, height);
    let (mean_gradient, strong_edge_ratio, is_smooth) = calculate_texture_strength(&gray, width, height);

    // Kekasaran permukaan didekati dari rata-rata kontras dan dissimilarity
    let average_roughness = ((glcm.contrast + glcm.dissimilarity * 2.0) / 3.0).clamp(0.0, 100.0);

    TraditionalTextureReport {
        lbp_histogram,
        glcm,
        average_roughness,
        mean_gradient,
        strong_edge_ratio,
        is_smooth,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lbp_identical_textures() {
        // Citra sintetis bergaris serat kayu
        let width = 16;
        let height = 16;
        let mut img1 = vec![0u8; width * height * 4];
        for y in 0..height {
            for x in 0..width {
                let v = if x % 2 == 0 { 180 } else { 120 };
                let idx = (y * width + x) * 4;
                img1[idx] = v;
                img1[idx + 1] = v;
                img1[idx + 2] = v;
                img1[idx + 3] = 255;
            }
        }

        let report1 = extract_traditional_texture(&img1, width, height);
        let sim = compare_lbp_similarity(&report1.lbp_histogram, &report1.lbp_histogram);
        assert!((sim - 1.0).abs() < 1e-6, "Tekstur identik harus memiliki kemiripan 1.0");
    }

    #[test]
    fn test_lbp_illumination_invariance() {
        // Citra 1: Pola serat normal
        let width = 16;
        let height = 16;
        let mut img1 = vec![0u8; width * height * 4];
        // Citra 2: Pola serat persis sama tetapi terpapar lampu studio jauh lebih terang (+50 luma)
        let mut img2 = vec![0u8; width * height * 4];

        for y in 0..height {
            for x in 0..width {
                let base = if x % 3 == 0 { 80 } else { 40 };
                let idx = (y * width + x) * 4;

                img1[idx] = base;
                img1[idx + 1] = base;
                img1[idx + 2] = base;
                img1[idx + 3] = 255;

                // Lampu studio lebih terang (+50)
                let brighter = (base + 50).min(255);
                img2[idx] = brighter;
                img2[idx + 1] = brighter;
                img2[idx + 1] = brighter;
                img2[idx + 3] = 255;
            }
        }

        let report1 = extract_traditional_texture(&img1, width, height);
        let report2 = extract_traditional_texture(&img2, width, height);

        let sim = compare_lbp_similarity(&report1.lbp_histogram, &report2.lbp_histogram);
        println!("Kemiripan LBP beda pencahayaan: {}", sim);
        assert!(sim > 0.95, "LBP harus tetap mendekati 1.0 meskipun pencahayaan lampu studio berbeda (Illumination Invariance)");
    }

    #[test]
    fn test_smooth_surface_ignores_minor_camera_noise() {
        let width = 32;
        let height = 32;
        let mut image = vec![0u8; width * height * 4];
        for y in 0..height {
            for x in 0..width {
                let value = 128i16 + ((x * 7 + y * 11) % 5) as i16 - 2;
                let idx = (y * width + x) * 4;
                image[idx] = value as u8;
                image[idx + 1] = value as u8;
                image[idx + 2] = value as u8;
                image[idx + 3] = 255;
            }
        }

        let report = extract_traditional_texture(&image, width, height);
        assert!(report.is_smooth, "Noise kecil pada permukaan polos harus tetap diklasifikasikan halus");
    }
}
