use super::metrics::MeasuredEvidence;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionParams {
    pub temperature_k: i32,
    pub tint: i32,
    pub exposure_ev: f64,
    pub brightness: i32,
    pub contrast: i32,
    pub saturation: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictDetail {
    pub improved_roi: String,
    pub worsened_roi: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionConflict {
    pub has_conflict: bool,
    pub details: Option<ConflictDetail>,
}

pub struct ROIInput<'a> {
    pub id: &'a str,
    pub name: &'a str,
    pub role: &'a str, // "master_backed" | "guardrail_only"
    pub measured: Option<&'a MeasuredEvidence>,
}

/// Menghitung rekomendasi koreksi global & mendeteksi konflik antar-ROI (REQ-CORR-001 & REQ-CONFLICT-001)
pub fn calculate_recommended_correction(rois: &[ROIInput]) -> (CorrectionParams, CorrectionConflict) {
    let master_backed: Vec<&ROIInput> = rois
        .iter()
        .filter(|r| r.role == "master_backed" && r.measured.is_some())
        .collect();

    if master_backed.is_empty() {
        return (
            CorrectionParams {
                temperature_k: 0,
                tint: 0,
                exposure_ev: 0.0,
                brightness: 0,
                contrast: 0,
                saturation: 0,
            },
            CorrectionConflict {
                has_conflict: false,
                details: None,
            },
        );
    }

    struct Target {
        name: String,
        temp_target: i32,
        tint_target: i32,
        exp_target: f64,
        sat_target: i32,
    }

    let targets: Vec<Target> = master_backed
        .iter()
        .map(|r| {
            let m = r.measured.unwrap();
            let temp_target = (-m.delta_b * 65.0).round() as i32;
            let tint_target = (-m.delta_a * 2.5).round() as i32;
            let exp_target = ((-m.delta_l * 0.035) * 100.0).round() / 100.0;
            let sat_target = (-m.saturation_diff_percent * 0.5).round() as i32;

            Target {
                name: r.name.to_string(),
                temp_target,
                tint_target,
                exp_target,
                sat_target,
            }
        })
        .collect();

    let mut has_conflict = false;
    let mut conflict_detail = None;

    for i in 0..targets.len() {
        for j in (i + 1)..targets.len() {
            let a = &targets[i];
            let b = &targets[j];

            // Konflik Eksposur: Satu butuh lebih terang (+EV), satu butuh lebih gelap (-EV) dengan selisih > 0.4 EV
            if a.exp_target.signum() != b.exp_target.signum()
                && a.exp_target.abs() > 0.1
                && b.exp_target.abs() > 0.1
                && (a.exp_target - b.exp_target).abs() > 0.4
            {
                has_conflict = true;
                let improved = if a.exp_target > 0.0 { &a.name } else { &b.name };
                let worsened = if a.exp_target > 0.0 { &b.name } else { &a.name };
                conflict_detail = Some(ConflictDetail {
                    improved_roi: improved.clone(),
                    worsened_roi: worsened.clone(),
                    reason: format!(
                        "Koreksi pencahayaan yang memperbaiki {} akan membuat {} menjadi terlalu silau/terang.",
                        improved, worsened
                    ),
                });
                break;
            }

            // Konflik Suhu: Satu terlalu kuning (+temp), satu terlalu biru (-temp) dengan selisih > 250K
            if a.temp_target.signum() != b.temp_target.signum()
                && a.temp_target.abs() > 50
                && b.temp_target.abs() > 50
                && (a.temp_target - b.temp_target).abs() > 250
            {
                has_conflict = true;
                conflict_detail = Some(ConflictDetail {
                    improved_roi: a.name.clone(),
                    worsened_roi: b.name.clone(),
                    reason: format!(
                        "Koreksi temperatur warna berlawanan arah antara {} dan {}. Menandakan perbedaan material atau pantulan cahaya setempat.",
                        a.name, b.name
                    ),
                });
                break;
            }
        }
        if has_conflict {
            break;
        }
    }

    if has_conflict {
        return (
            CorrectionParams {
                temperature_k: 0,
                tint: 0,
                exposure_ev: 0.0,
                brightness: 0,
                contrast: 0,
                saturation: 0,
            },
            CorrectionConflict {
                has_conflict: true,
                details: conflict_detail,
            },
        );
    }

    let n = targets.len() as f64;
    let avg_temp = (targets.iter().map(|t| t.temp_target).sum::<i32>() as f64 / n).round() as i32;
    let avg_tint = (targets.iter().map(|t| t.tint_target).sum::<i32>() as f64 / n).round() as i32;
    let avg_exp = ((targets.iter().map(|t| t.exp_target).sum::<f64>() / n) * 100.0).round() / 100.0;
    let avg_sat = (targets.iter().map(|t| t.sat_target).sum::<i32>() as f64 / n).round() as i32;

    (
        CorrectionParams {
            temperature_k: avg_temp,
            tint: avg_tint,
            exposure_ev: avg_exp,
            brightness: 0,
            contrast: 0,
            saturation: avg_sat,
        },
        CorrectionConflict {
            has_conflict: false,
            details: None,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_harmonic_correction() {
        let m1 = MeasuredEvidence {
            delta_e00: 2.5,
            delta_l: 4.0,
            delta_a: 0.5,
            delta_b: 3.0,
            master_brightness: 30.0,
            product_brightness: 34.0,
            brightness_diff_percent: 13.0,
            contrast_diff_percent: 2.0,
            saturation_diff_percent: 5.0,
            shadow_clipped: false,
            highlight_clipped: false,
        };

        let rois = vec![ROIInput {
            id: "r1",
            name: "Rangka Depan",
            role: "master_backed",
            measured: Some(&m1),
        }];

        let (params, conflict) = calculate_recommended_correction(&rois);
        assert!(!conflict.has_conflict);
        assert!(params.temperature_k < 0);
        assert!(params.exposure_ev < 0.0);
    }

    #[test]
    fn test_conflict_detection() {
        let m1 = MeasuredEvidence {
            delta_e00: 2.5,
            delta_l: 6.0, // Terlalu terang
            delta_a: 0.0,
            delta_b: 0.0,
            master_brightness: 30.0,
            product_brightness: 36.0,
            brightness_diff_percent: 20.0,
            contrast_diff_percent: 0.0,
            saturation_diff_percent: 0.0,
            shadow_clipped: false,
            highlight_clipped: false,
        };

        let m2 = MeasuredEvidence {
            delta_e00: 4.0,
            delta_l: -8.0, // Terlalu gelap
            delta_a: 0.0,
            delta_b: 0.0,
            master_brightness: 30.0,
            product_brightness: 22.0,
            brightness_diff_percent: -26.0,
            contrast_diff_percent: 0.0,
            saturation_diff_percent: 0.0,
            shadow_clipped: false,
            highlight_clipped: false,
        };

        let rois = vec![
            ROIInput {
                id: "r1",
                name: "Rangka",
                role: "master_backed",
                measured: Some(&m1),
            },
            ROIInput {
                id: "r2",
                name: "Sandaran Tangan",
                role: "master_backed",
                measured: Some(&m2),
            },
        ];

        let (params, conflict) = calculate_recommended_correction(&rois);
        assert!(conflict.has_conflict);
        assert_eq!(params.temperature_k, 0);
        assert_eq!(params.exposure_ev, 0.0);
        assert!(conflict.details.is_some());
    }
}
