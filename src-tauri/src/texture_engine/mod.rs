// Modul Utama Texture Engine (P1: Grain & Material Intelligence)

pub mod traditional;
pub mod grain_direction;
pub mod fusion;

use serde::{Deserialize, Serialize};
use traditional::{extract_traditional_texture, TraditionalTextureReport};
use grain_direction::{calculate_grain_direction, GrainDirectionReport};
use fusion::{evaluate_material_fusion, UnifiedMaterialReport};
use crate::color_science::metrics::MeasuredEvidence;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComprehensiveRoiAnalysis {
    pub texture_report: TraditionalTextureReport,
    pub grain_report: GrainDirectionReport,
    pub unified_fusion: UnifiedMaterialReport,
}

/// Menjalankan analisis komprehensif (Warna + Tekstur + Serat Kayu) pada pasangan master & produk
pub fn analyze_roi_texture_and_fusion(
    master_rgba: &[u8],
    product_rgba: &[u8],
    width: usize,
    height: usize,
    color_measured: &MeasuredEvidence,
) -> ComprehensiveRoiAnalysis {
    let master_texture = extract_traditional_texture(master_rgba, width, height);
    let product_texture = extract_traditional_texture(product_rgba, width, height);

    let master_gray = traditional::rgba_to_grayscale(master_rgba, width, height);
    let product_gray = traditional::rgba_to_grayscale(product_rgba, width, height);

    let master_grain = calculate_grain_direction(&master_gray, width, height);
    let product_grain = calculate_grain_direction(&product_gray, width, height);

    let unified_fusion = evaluate_material_fusion(
        color_measured,
        &master_texture,
        &product_texture,
        &master_grain,
        &product_grain,
    );

    ComprehensiveRoiAnalysis {
        texture_report: product_texture,
        grain_report: product_grain,
        unified_fusion,
    }
}
