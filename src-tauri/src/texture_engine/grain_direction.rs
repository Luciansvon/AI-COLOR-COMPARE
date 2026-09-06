// Modul Analisis Arah & Keteraturan Serat Kayu (Grain Direction & Coherence)
// Menggunakan gradien Sobel untuk mendeteksi orientasi dominan urat kayu

use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrainDirectionReport {
    pub dominant_angle_deg: f64,
    pub grain_coherence: f64, // 0.0 (acak/non-serat) s/d 1.0 (serat lurus sangat jelas)
    pub is_directional: bool,
}

/// Menghitung sudut dan koherensi arah serat kayu dari citra keabuan
pub fn calculate_grain_direction(gray: &[u8], width: usize, height: usize) -> GrainDirectionReport {
    if width < 3 || height < 3 {
        return GrainDirectionReport {
            dominant_angle_deg: 0.0,
            grain_coherence: 0.0,
            is_directional: false,
        };
    }

    // 18 bin orientasi untuk sudut 0 s/d 180 derajat (kelipatan 10 derajat)
    const NUM_BINS: usize = 18;
    let mut orientation_hist = [0.0f64; NUM_BINS];
    let mut total_magnitude = 0.0f64;

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            // Kernel Sobel Horisontal Gx
            let p00 = gray[(y - 1) * width + (x - 1)] as f64;
            let p02 = gray[(y - 1) * width + (x + 1)] as f64;
            let p10 = gray[y * width + (x - 1)] as f64;
            let p12 = gray[y * width + (x + 1)] as f64;
            let p20 = gray[(y + 1) * width + (x - 1)] as f64;
            let p22 = gray[(y + 1) * width + (x + 1)] as f64;

            let gx = (p02 + 2.0 * p12 + p22) - (p00 + 2.0 * p10 + p20);

            // Kernel Sobel Vertikal Gy
            let p01 = gray[(y - 1) * width + x] as f64;
            let p21 = gray[(y + 1) * width + x] as f64;

            let gy = (p20 + 2.0 * p21 + p22) - (p00 + 2.0 * p01 + p02);

            let mag = (gx * gx + gy * gy).sqrt();
            if mag > 10.0 {
                // Sudut gradien tegak lurus dengan arah serat fisik kayu
                // Jadi arah serat = sudut gradien + 90 derajat
                let mut angle_rad = gy.atan2(gx) + (PI / 2.0);
                while angle_rad < 0.0 {
                    angle_rad += PI;
                }
                while angle_rad >= PI {
                    angle_rad -= PI;
                }

                let angle_deg = angle_rad * 180.0 / PI;
                let bin = ((angle_deg / 10.0).floor() as usize).min(NUM_BINS - 1);

                orientation_hist[bin] += mag;
                total_magnitude += mag;
            }
        }
    }

    if total_magnitude <= 1e-6 {
        return GrainDirectionReport {
            dominant_angle_deg: 0.0,
            grain_coherence: 0.0,
            is_directional: false,
        };
    }

    // Temukan bin dengan magnitudo tertinggi
    let mut max_val = 0.0f64;
    let mut dominant_bin = 0;
    for (bin, &val) in orientation_hist.iter().enumerate() {
        if val > max_val {
            max_val = val;
            dominant_bin = bin;
        }
    }

    let dominant_angle_deg = dominant_bin as f64 * 10.0 + 5.0;
    // Koherensi: perbandingan energi arah dominan (+ tetangga) terhadap total energi
    let prev_bin = if dominant_bin == 0 { NUM_BINS - 1 } else { dominant_bin - 1 };
    let next_bin = if dominant_bin == NUM_BINS - 1 { 0 } else { dominant_bin + 1 };
    let dominant_energy = orientation_hist[dominant_bin] + orientation_hist[prev_bin] * 0.5 + orientation_hist[next_bin] * 0.5;

    let grain_coherence = (dominant_energy / total_magnitude).clamp(0.0, 1.0);
    let is_directional = grain_coherence >= 0.25;

    GrainDirectionReport {
        dominant_angle_deg,
        grain_coherence,
        is_directional,
    }
}

/// Menghitung selisih sudut arah serat kayu antara master dan produk (0 - 90 derajat)
pub fn calculate_grain_angle_difference(angle1: f64, angle2: f64) -> f64 {
    let diff = (angle1 - angle2).abs();
    let normalized = diff % 180.0;
    if normalized > 90.0 {
        180.0 - normalized
    } else {
        normalized
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vertical_grain_detection() {
        let width = 32;
        let height = 32;
        let mut gray = vec![128u8; width * height];

        // Buat pola garis vertikal kuat (serat tegak lurus sumbu Y)
        for y in 0..height {
            for x in 0..width {
                if x % 4 == 0 {
                    gray[y * width + x] = 220;
                } else {
                    gray[y * width + x] = 80;
                }
            }
        }

        let report = calculate_grain_direction(&gray, width, height);
        println!("Hasil arah serat vertikal: {:?}", report);
        assert!(report.is_directional);
        // Serat vertikal memiliki sudut mendekati 90 derajat
        assert!((report.dominant_angle_deg - 90.0).abs() <= 20.0);
        assert!(report.grain_coherence > 0.4);
    }
}
