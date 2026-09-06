use image::ColorType;
use std::fs::{self, File};
use std::io::{self, BufWriter};
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum ExportError {
    IoError(io::Error),
    ImageError(String),
}

impl From<io::Error> for ExportError {
    fn from(err: io::Error) -> Self {
        ExportError::IoError(err)
    }
}

/// Menemukan path file yang aman tanpa menimpa file yang sudah ada (REQ-EXPORT-004 & File Safety)
pub fn get_safe_export_path(base_dir: &Path, base_name: &str, extension: &str) -> PathBuf {
    let mut candidate = base_dir.join(format!("{}.{}", base_name, extension));
    let mut counter = 1;

    while candidate.exists() {
        candidate = base_dir.join(format!("{} ({}).{}", base_name, counter, extension));
        counter += 1;
    }

    candidate
}

/// Ekspor non-destruktif ke file JPEG sRGB baru menggunakan penulisan atomik (atomic temp file write)
pub fn export_srgb_jpeg(
    output_path: &Path,
    rgb_pixels: &[u8],
    width: u32,
    height: u32,
    quality: u8,
) -> Result<PathBuf, ExportError> {
    let parent = output_path
        .parent()
        .unwrap_or_else(|| Path::new("."));

    if !parent.exists() {
        fs::create_dir_all(parent)?;
    }

    // Tulis ke berkas sementara terlebih dahulu agar atomik dan aman dari interupsi
    let temp_path = parent.join(format!(
        ".tmp_export_{}_{}",
        std::process::id(),
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
    ));

    {
        let file = File::create(&temp_path)?;
        let writer = BufWriter::new(file);

        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(writer, quality);
        encoder
            .encode(rgb_pixels, width, height, ColorType::Rgb8.into())
            .map_err(|e| ExportError::ImageError(e.to_string()))?;
    }

    // Rename atomik ke target akhir
    fs::rename(&temp_path, output_path)?;

    Ok(output_path.to_path_buf())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_export_path_generation() {
        let temp_dir = std::env::temp_dir();
        let path1 = get_safe_export_path(&temp_dir, "test_file_unique_xyz", "jpg");
        assert_eq!(path1.extension().unwrap(), "jpg");
    }

    #[test]
    fn test_atomic_export_srgb_jpeg() {
        let temp_dir = std::env::temp_dir().join("studio_qc_export_test");
        let _ = fs::create_dir_all(&temp_dir);

        let out_path = temp_dir.join("test_output.jpg");
        let rgb_data = vec![128u8; 100 * 100 * 3]; // 100x100 abu-abu

        let res = export_srgb_jpeg(&out_path, &rgb_data, 100, 100, 90);
        assert!(res.is_ok());
        assert!(out_path.exists());

        // Bersihkan
        let _ = fs::remove_file(out_path);
        let _ = fs::remove_dir(temp_dir);
    }
}
