// Modul Penggabungan Bukti (Evidence Fusion): Warna (P0) + Serat Kayu (P1)
// Menghasilkan diagnosa studio definitif untuk membedakan masalah lampu vs masalah bahan

use crate::color_science::metrics::MeasuredEvidence;
use super::traditional::{TraditionalTextureReport, compare_lbp_similarity};
use super::grain_direction::{GrainDirectionReport, calculate_grain_angle_difference};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MaterialDiagnosisType {
    Conforming,                 // Warna Sesuai + Serat Sesuai
    IlluminationArtifact,       // Warna Beda + Serat Sesuai (Lampu / WB)
    MaterialMismatch,           // Warna Beda + Serat Beda (Bahan / Finishing)
    SpeciesOrGrainMismatch,     // Warna Sesuai + Serat Beda (Jenis Kayu / Urat)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedMaterialReport {
    pub diagnosis_type: MaterialDiagnosisType,
    pub title: String,
    pub primary_cause: String,
    pub human_explanation: String,
    pub studio_action: String,
    pub confidence_level: String, // "Tinggi", "Sedang", "Rendah"
    pub texture_similarity_score: f64, // 0.0 s/d 1.0 (LBP & GLCM)
    pub grain_angle_diff_deg: f64,
    pub is_grain_matching: bool,
    pub surface_mode: String,
}

/// Menggabungkan bukti pengukuran warna (P0) dan tekstur (P1) menjadi diagnosa tunggal yang komprehensif
pub fn evaluate_material_fusion(
    color_measured: &MeasuredEvidence,
    master_texture: &TraditionalTextureReport,
    product_texture: &TraditionalTextureReport,
    master_grain: &GrainDirectionReport,
    product_grain: &GrainDirectionReport,
) -> UnifiedMaterialReport {
    // 1. Hitung kesamaan tekstur LBP
    let lbp_sim = compare_lbp_similarity(&master_texture.lbp_histogram, &product_texture.lbp_histogram);

    // 2. Hitung selisih kekasaran GLCM
    let roughness_diff = (master_texture.average_roughness - product_texture.average_roughness).abs();
    let roughness_penalty = (roughness_diff / 50.0).clamp(0.0, 0.25);

    let both_smooth = master_texture.is_smooth && product_texture.is_smooth;
    let one_smooth = master_texture.is_smooth != product_texture.is_smooth;
    let surface_mode = if both_smooth { "smooth" } else if one_smooth { "mixed" } else { "textured" };

    // LBP tidak stabil pada bidang tanpa pola. Dua bidang halus dibandingkan
    // sebagai kelas permukaan yang sama, bukan dari noise pikselnya.
    let texture_similarity_score = if both_smooth {
        1.0
    } else {
        (lbp_sim - roughness_penalty).clamp(0.0, 1.0)
    };

    // 3. Selisih arah urat kayu
    let measured_grain_angle_diff = calculate_grain_angle_difference(
        master_grain.dominant_angle_deg,
        product_grain.dominant_angle_deg,
    );
    let grain_angle_diff_deg = if both_smooth { 0.0 } else { measured_grain_angle_diff };

    // Toleransi: Serat dianggap cocok jika skor tekstur >= 0.82
    let is_texture_matching = texture_similarity_score >= 0.82;
    let is_grain_matching = both_smooth || (!one_smooth
        && is_texture_matching
        && (!master_grain.is_directional || !product_grain.is_directional || grain_angle_diff_deg <= 35.0));

    // Evaluasi warna (CIEDE2000 batas toleransi studio 2.5)
    let is_color_matching = color_measured.delta_e00 <= 2.5;

    // 4. Logika Penggabungan Bukti
    if is_color_matching && is_grain_matching {
        UnifiedMaterialReport {
            diagnosis_type: MaterialDiagnosisType::Conforming,
            title: "Sangat Cocok (Lolos Sempurna)".to_string(),
            primary_cause: "Kesesuaian Material Terpenuhi".to_string(),
            human_explanation: "Warna, gelap-terang, dan karakter serat kayu sangat sesuai dengan master panel fisik.".to_string(),
            studio_action: "Aman untuk dipotret dan lolos QC studio. Tidak memerlukan penyesuaian apapun.".to_string(),
            confidence_level: "Tinggi".to_string(),
            texture_similarity_score,
            grain_angle_diff_deg,
            is_grain_matching: true,
            surface_mode: surface_mode.to_string(),
        }
    } else if !is_color_matching && is_grain_matching {
        // KASUS UTAMA STUDIO: Serat kayu identik, warna beda -> Masalah Lampu/Kamera
        let cause = if color_measured.delta_b.abs() > 3.0 {
            "Suhu Warna Lampu Studio (White Balance)"
        } else if color_measured.delta_l.abs() > 4.0 {
            "Intensitas Cahaya / Eksposur Kamera"
        } else {
            "Pencahayaan Studio"
        };

        UnifiedMaterialReport {
            diagnosis_type: MaterialDiagnosisType::IlluminationArtifact,
            title: "Penyimpangan Cahaya Kamera (Bahan Sesuai)".to_string(),
            primary_cause: cause.to_string(),
            human_explanation: format!(
                "Struktur pori-pori dan serat kayu terbukti identik dengan master fisik (kemiripan {:.0}%), namun warna bergeser akibat kondisi pemotretan.",
                texture_similarity_score * 100.0
            ),
            studio_action: "Cukup atur ulang lampu studio atau geser parameter warna kamera. Bahan finishing kayu tidak perlu diubah.".to_string(),
            confidence_level: "Tinggi".to_string(),
            texture_similarity_score,
            grain_angle_diff_deg,
            is_grain_matching: true,
            surface_mode: surface_mode.to_string(),
        }
    } else if !is_color_matching && !is_grain_matching {
        // KASUS CACAT FISIK: Warna beda dan serat juga beda -> Bahan / Finishing Salah
        UnifiedMaterialReport {
            diagnosis_type: MaterialDiagnosisType::MaterialMismatch,
            title: "Ketidaksesuaian Bahan / Finishing".to_string(),
            primary_cause: "Bahan Kayu / Formula Finishing Berbeda".to_string(),
            human_explanation: "Perbedaan visual bukan berasal dari lampu kamera. Pola permukaan, tekstur, dan warna fisik berbeda dari sampel master.".to_string(),
            studio_action: "Laporkan ke bagian produksi atau finishing kayu untuk pengecekan lot bahan.".to_string(),
            confidence_level: "Tinggi".to_string(),
            texture_similarity_score,
            grain_angle_diff_deg,
            is_grain_matching: false,
            surface_mode: surface_mode.to_string(),
        }
    } else {
        // KASUS SPESIES BEDA: Warna mirip tapi serat beda
        UnifiedMaterialReport {
            diagnosis_type: MaterialDiagnosisType::SpeciesOrGrainMismatch,
            title: "Perbedaan Jenis / Arah Urat Kayu".to_string(),
            primary_cause: "Karakter Serat Kayu Berbeda".to_string(),
            human_explanation: "Warna dasar tampak mendekati master, tetapi struktur pori dan urat kayu menunjukkan karakter kayu yang berbeda.".to_string(),
            studio_action: "Periksa apakah grade atau arah potongan kayu sudah sesuai dengan standar katalog furnitur.".to_string(),
            confidence_level: "Sedang".to_string(),
            texture_similarity_score,
            grain_angle_diff_deg,
            is_grain_matching: false,
            surface_mode: surface_mode.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fusion_illumination_artifact() {
        // Simulasi warna bergeser cukup jauh (deltaE00 = 4.2) karena lampu hangat
        let color = MeasuredEvidence {
            delta_e00: 4.2,
            delta_l: 2.1,
            delta_a: 1.0,
            delta_b: 4.0, // Sangat kuning
            master_brightness: 30.0,
            product_brightness: 32.0,
            brightness_diff_percent: 6.0,
            contrast_diff_percent: 2.0,
            saturation_diff_percent: 8.0,
            shadow_clipped: false,
            highlight_clipped: false,
        };

        // Tekstur identik (LBP hist sama)
        let dummy_hist = vec![1.0 / 256.0; 256];
        let master_tex = TraditionalTextureReport {
            lbp_histogram: dummy_hist.clone(),
            glcm: super::super::traditional::GlcmFeatures {
                contrast: 1.2,
                homogeneity: 0.8,
                energy: 0.5,
                dissimilarity: 0.8,
            },
            average_roughness: 1.0,
            mean_gradient: 12.0,
            strong_edge_ratio: 0.2,
            is_smooth: false,
        };
        let prod_tex = master_tex.clone();

        let grain = GrainDirectionReport {
            dominant_angle_deg: 90.0,
            grain_coherence: 0.6,
            is_directional: true,
        };

        let report = evaluate_material_fusion(&color, &master_tex, &prod_tex, &grain, &grain);
        println!("Hasil Penggabungan Bukti: {:?}", report);

        assert_eq!(report.diagnosis_type, MaterialDiagnosisType::IlluminationArtifact);
        assert!(report.human_explanation.contains("identik"));
    }

    #[test]
    fn test_smooth_surfaces_do_not_use_grain_noise() {
        let color = MeasuredEvidence {
            delta_e00: 4.2,
            delta_l: 2.1,
            delta_a: 1.0,
            delta_b: 4.0,
            master_brightness: 30.0,
            product_brightness: 32.0,
            brightness_diff_percent: 6.0,
            contrast_diff_percent: 2.0,
            saturation_diff_percent: 8.0,
            shadow_clipped: false,
            highlight_clipped: false,
        };
        let smooth = TraditionalTextureReport {
            lbp_histogram: vec![0.0; 256],
            glcm: super::super::traditional::GlcmFeatures {
                contrast: 0.0,
                homogeneity: 1.0,
                energy: 1.0,
                dissimilarity: 0.0,
            },
            average_roughness: 0.0,
            mean_gradient: 1.0,
            strong_edge_ratio: 0.0,
            is_smooth: true,
        };
        let master_grain = GrainDirectionReport {
            dominant_angle_deg: 0.0,
            grain_coherence: 0.0,
            is_directional: false,
        };
        let product_grain = GrainDirectionReport {
            dominant_angle_deg: 90.0,
            grain_coherence: 0.0,
            is_directional: false,
        };

        let report = evaluate_material_fusion(&color, &smooth, &smooth, &master_grain, &product_grain);
        assert_eq!(report.diagnosis_type, MaterialDiagnosisType::IlluminationArtifact);
        assert_eq!(report.surface_mode, "smooth");
        assert!(report.is_grain_matching);
    }
}
