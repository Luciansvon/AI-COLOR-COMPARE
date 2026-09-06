use super::ciede2000::calculate_delta_e00;
use super::transforms::{rgb_to_lab, Lab, Rgb};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PixelDataStats {
    pub mean_lab: Lab,
    pub mean_rgb: Rgb,
    pub brightness: f64,
    pub contrast: f64,
    pub saturation: f64,
    pub shadow_clipping_ratio: f64,
    pub highlight_clipping_ratio: f64,
    pub pixel_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenceQualityReport {
    pub is_valid: bool,
    pub warnings: Vec<String>,
    pub confidence_penalty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasuredEvidence {
    pub delta_e00: f64,
    pub delta_l: f64,
    pub delta_a: f64,
    pub delta_b: f64,
    pub master_brightness: f64,
    pub product_brightness: f64,
    pub brightness_diff_percent: f64,
    pub contrast_diff_percent: f64,
    pub saturation_diff_percent: f64,
    pub shadow_clipped: bool,
    pub highlight_clipped: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimatedRecommendation {
    pub status: String, // "sesuai" | "perlu_dicek" | "tidak_sesuai"
    pub label: String,
    pub confidence: String, // "Tinggi" | "Sedang" | "Rendah"
    pub primary_cause: String,
    pub explanation: String,
}

/// Ekstraksi statistik warna dari buffer pixel RGBA
pub fn extract_roi_stats(rgba_pixels: &[u8]) -> PixelDataStats {
    let pixel_count = rgba_pixels.len() / 4;
    if pixel_count == 0 {
        return PixelDataStats {
            mean_lab: Lab { l: 0.0, a: 0.0, b: 0.0 },
            mean_rgb: Rgb { r: 0, g: 0, b: 0 },
            brightness: 0.0,
            contrast: 0.0,
            saturation: 0.0,
            shadow_clipping_ratio: 0.0,
            highlight_clipping_ratio: 0.0,
            pixel_count: 0,
        };
    }

    let mut sum_r: u64 = 0;
    let mut sum_g: u64 = 0;
    let mut sum_b: u64 = 0;
    let mut sum_l = 0.0;
    let mut sum_a = 0.0;
    let mut sum_b_lab = 0.0;
    let mut sum_sat = 0.0;
    let mut shadow_clipped: usize = 0;
    let mut highlight_clipped: usize = 0;

    let mut l_values = Vec::with_capacity(pixel_count);

    for i in 0..pixel_count {
        let idx = i * 4;
        let r = rgba_pixels[idx];
        let g = rgba_pixels[idx + 1];
        let b = rgba_pixels[idx + 2];

        sum_r += r as u64;
        sum_g += g as u64;
        sum_b += b as u64;

        if r < 5 && g < 5 && b < 5 {
            shadow_clipped += 1;
        }
        if r > 250 && g > 250 && b > 250 {
            highlight_clipped += 1;
        }

        let lab = rgb_to_lab(&Rgb { r, g, b });
        l_values.push(lab.l);
        sum_l += lab.l;
        sum_a += lab.a;
        sum_b_lab += lab.b;

        let sat = (lab.a * lab.a + lab.b * lab.b).sqrt();
        sum_sat += sat;
    }

    let mean_l = sum_l / pixel_count as f64;
    let mean_a = sum_a / pixel_count as f64;
    let mean_b = sum_b_lab / pixel_count as f64;

    let mut sum_variance = 0.0;
    for l in &l_values {
        sum_variance += (l - mean_l).powi(2);
    }
    let contrast = (sum_variance / pixel_count as f64).sqrt();

    PixelDataStats {
        mean_lab: Lab { l: mean_l, a: mean_a, b: mean_b },
        mean_rgb: Rgb {
            r: (sum_r / pixel_count as u64) as u8,
            g: (sum_g / pixel_count as u64) as u8,
            b: (sum_b / pixel_count as u64) as u8,
        },
        brightness: mean_l,
        contrast,
        saturation: sum_sat / pixel_count as f64,
        shadow_clipping_ratio: shadow_clipped as f64 / pixel_count as f64,
        highlight_clipping_ratio: highlight_clipped as f64 / pixel_count as f64,
        pixel_count,
    }
}

/// Pemeriksaan Kualitas Master Referensi (REQ-REF-001 & REQ-REF-002)
pub fn check_reference_quality(stats: &PixelDataStats) -> ReferenceQualityReport {
    let mut warnings = Vec::new();
    let mut confidence_penalty = false;
    let mut is_valid = true;

    if stats.pixel_count < 100 {
        warnings.push("Area sampel master terlalu kecil (kurang dari 100 piksel).".to_string());
        confidence_penalty = true;
    }

    if stats.brightness > 92.0 || stats.highlight_clipping_ratio > 0.08 {
        warnings.push("Master terdeteksi overexposure atau terdapat pantulan kilau/silau berlebih.".to_string());
        confidence_penalty = true;
    }

    if stats.brightness < 8.0 || stats.shadow_clipping_ratio > 0.10 {
        warnings.push("Master terdeteksi underexposure parah (terlalu gelap).".to_string());
        confidence_penalty = true;
    }

    if stats.highlight_clipping_ratio > 0.25 || stats.shadow_clipping_ratio > 0.35 {
        is_valid = false;
        warnings.push("Kualitas foto master tidak memadai untuk evaluasi QC berkeyakinan tinggi.".to_string());
    }

    ReferenceQualityReport {
        is_valid,
        warnings,
        confidence_penalty,
    }
}

/// Evaluasi Kontradiksi Antara In-Frame Master vs Separate Session Master (AC-009)
pub fn evaluate_master_consistency(in_frame_stats: &PixelDataStats, separate_stats: &PixelDataStats) -> (bool, f64, Option<String>) {
    let delta_e = calculate_delta_e00(&in_frame_stats.mean_lab, &separate_stats.mean_lab, 1.0, 1.0, 1.0);
    if delta_e > 3.5 {
        (
            false,
            delta_e,
            Some(format!(
                "Peringatan Konflik Referensi: In-frame master dan master terpisah berbeda signifikan (ΔE00: {:.2}). Kondisi pemotretan sesi tampaknya telah berubah. Disarankan mengambil foto referensi baru.",
                delta_e
            )),
        )
    } else {
        (true, delta_e, None)
    }
}

/// Membandingkan area produk terhadap master fisik
pub fn compare_stats(
    master_stats: &PixelDataStats,
    product_stats: &PixelDataStats,
) -> (MeasuredEvidence, EstimatedRecommendation) {
    let delta_e00 = calculate_delta_e00(&master_stats.mean_lab, &product_stats.mean_lab, 1.0, 1.0, 1.0);
    let delta_l = product_stats.mean_lab.l - master_stats.mean_lab.l;
    let delta_a = product_stats.mean_lab.a - master_stats.mean_lab.a;
    let delta_b = product_stats.mean_lab.b - master_stats.mean_lab.b;

    let brightness_diff_percent = if master_stats.brightness > 0.0 {
        ((product_stats.brightness - master_stats.brightness) / master_stats.brightness) * 100.0
    } else {
        0.0
    };

    let contrast_diff_percent = if master_stats.contrast > 0.0 {
        ((product_stats.contrast - master_stats.contrast) / master_stats.contrast) * 100.0
    } else {
        0.0
    };

    let saturation_diff_percent = if master_stats.saturation > 0.0 {
        ((product_stats.saturation - master_stats.saturation) / master_stats.saturation) * 100.0
    } else {
        0.0
    };

    let shadow_clipped = product_stats.shadow_clipping_ratio > 0.05;
    let highlight_clipped = product_stats.highlight_clipping_ratio > 0.05;

    let measured = MeasuredEvidence {
        delta_e00: (delta_e00 * 100.0).round() / 100.0,
        delta_l: (delta_l * 100.0).round() / 100.0,
        delta_a: (delta_a * 100.0).round() / 100.0,
        delta_b: (delta_b * 100.0).round() / 100.0,
        master_brightness: (master_stats.brightness * 10.0).round() / 10.0,
        product_brightness: (product_stats.brightness * 10.0).round() / 10.0,
        brightness_diff_percent: (brightness_diff_percent * 10.0).round() / 10.0,
        contrast_diff_percent: (contrast_diff_percent * 10.0).round() / 10.0,
        saturation_diff_percent: (saturation_diff_percent * 10.0).round() / 10.0,
        shadow_clipped,
        highlight_clipped,
    };

    let is_chromatic_shift_significant = delta_a.abs() > 2.0 || delta_b.abs() > 2.5;
    let is_lightness_shift_significant = delta_l.abs() > 3.0;

    let (status, label, mut confidence, primary_cause, mut explanation) = if delta_e00 <= 2.2 {
        (
            "sesuai".to_string(),
            "Kemungkinan Sesuai".to_string(),
            if shadow_clipped || highlight_clipped { "Sedang".to_string() } else { "Tinggi".to_string() },
            "Pencahayaan / White Balance".to_string(),
            "Perbedaan warna sangat kecil (ΔE00 dalam toleransi aman). Mata manusia hampir tidak dapat melihat selisih rona.".to_string(),
        )
    } else if delta_e00 <= 4.5 {
        let cause = if is_lightness_shift_significant && !is_chromatic_shift_significant {
            "Pencahayaan / White Balance".to_string()
        } else if delta_b.abs() > 2.5 && delta_a.abs() < 2.0 {
            "Pencahayaan / White Balance".to_string()
        } else {
            "Belum Pasti".to_string()
        };

        let expl = if is_lightness_shift_significant && !is_chromatic_shift_significant {
            format!(
                "Perbedaan utama didominasi oleh kecerahan foto ({}). Kemungkinan besar disebabkan oleh intensitas lampu studio atau setelan eksposur.",
                if delta_l > 0.0 { "foto produk lebih terang" } else { "foto produk lebih gelap" }
            )
        } else if delta_b.abs() > 2.5 && delta_a.abs() < 2.0 {
            format!(
                "Perbedaan warna terlihat pada suhu kehangatan ({}). Kemungkinan besar disebabkan oleh White Balance lampu studio.",
                if delta_b > 0.0 { "terlihat sedikit lebih hangat/kuning" } else { "terlihat lebih dingin/biru" }
            )
        } else {
            "Terdapat pergeseran rona warna sekaligus kecerahan sedang. Perlu pengecekan visual lebih cermat oleh operator.".to_string()
        };

        ("perlu_dicek".to_string(), "Perlu Dicek".to_string(), "Sedang".to_string(), cause, expl)
    } else {
        let cause = if is_chromatic_shift_significant {
            "Material / Finishing".to_string()
        } else {
            "Pencahayaan / White Balance".to_string()
        };

        let expl = if is_chromatic_shift_significant {
            format!(
                "Perbedaan warna cukup nyata (ΔE00: {:.2}). Karakter rona kayu tampak berbeda dari master panel fisik. Ada indikasi perbedaan lapisan finishing atau lot kayu.",
                delta_e00
            )
        } else {
            format!(
                "Perbedaan sangat dipengaruhi oleh pencahayaan ekstrem (ΔL*: {:.2}). Disarankan memeriksa setelan lampu studio sebelum memutuskan material cacat.",
                delta_l
            )
        };

        ("tidak_sesuai".to_string(), "Kemungkinan Tidak Sesuai".to_string(), "Sedang".to_string(), cause, expl)
    };

    if shadow_clipped || highlight_clipped {
        confidence = "Rendah".to_string();
        explanation.push_str(" (Peringatan: Terdapat area piksel terpotong/silau sehingga tingkat keyakinan diturunkan).");
    }

    let estimated = EstimatedRecommendation {
        status,
        label,
        confidence,
        primary_cause,
        explanation,
    };

    (measured, estimated)
}
