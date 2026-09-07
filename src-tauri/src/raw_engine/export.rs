use image::ColorType;
use std::fs::{self, File, OpenOptions};
use std::io::{self, BufWriter, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug)]
pub enum ExportError {
    IoError(io::Error),
    ImageError(String),
    InvalidInput(String),
}

impl From<io::Error> for ExportError {
    fn from(err: io::Error) -> Self {
        ExportError::IoError(err)
    }
}

fn sanitize_export_basename(base_name: &str) -> String {
    let cleaned: String = base_name
        .trim()
        .chars()
        .map(|c| {
            if c.is_control() || matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
                '_'
            } else {
                c
            }
        })
        .collect();

    let cleaned = cleaned.trim_matches(|c| c == '.' || c == ' ').to_string();
    if cleaned.is_empty() {
        "export".to_string()
    } else {
        cleaned
    }
}

/// Menemukan path file yang aman tanpa menimpa file yang sudah ada (REQ-EXPORT-004 & File Safety)
pub fn get_safe_export_path(base_dir: &Path, base_name: &str, extension: &str) -> PathBuf {
    let safe_name = sanitize_export_basename(base_name);
    let mut candidate = base_dir.join(format!("{}.{}", safe_name, extension));
    let mut counter = 1;

    while candidate.exists() {
        candidate = base_dir.join(format!("{} ({}).{}", safe_name, counter, extension));
        counter += 1;
    }

    candidate
}

fn validate_export_input(rgb_pixels: &[u8], width: u32, height: u32) -> Result<(), ExportError> {
    if width == 0 || height == 0 {
        return Err(ExportError::InvalidInput(
            "Dimensi ekspor harus lebih besar dari nol".to_string(),
        ));
    }
    let expected_len = (width as usize)
        .checked_mul(height as usize)
        .and_then(|pixels| pixels.checked_mul(3))
        .ok_or_else(|| ExportError::InvalidInput("Dimensi ekspor terlalu besar".to_string()))?;
    if rgb_pixels.len() != expected_len {
        return Err(ExportError::InvalidInput(format!(
            "Buffer RGB tidak cocok dengan dimensi: butuh {} byte, menerima {}",
            expected_len,
            rgb_pixels.len()
        )));
    }
    Ok(())
}

fn create_unique_temp_file(parent: &Path) -> Result<(PathBuf, File), ExportError> {
    for _ in 0..8 {
        let temp_path = parent.join(format!(
            ".tmp_export_{}_{}.jpg",
            std::process::id(),
            Uuid::new_v4()
        ));
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)
        {
            Ok(file) => return Ok((temp_path, file)),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(ExportError::IoError(error)),
        }
    }

    Err(ExportError::IoError(io::Error::new(
        io::ErrorKind::AlreadyExists,
        "Tidak dapat membuat nama berkas sementara yang unik",
    )))
}

/// Ekspor non-destruktif ke file JPEG sRGB baru menggunakan penulisan atomik (atomic temp file write)
pub fn export_srgb_jpeg(
    output_path: &Path,
    rgb_pixels: &[u8],
    width: u32,
    height: u32,
    quality: u8,
) -> Result<PathBuf, ExportError> {
    validate_export_input(rgb_pixels, width, height)?;

    let parent = output_path
        .parent()
        .unwrap_or_else(|| Path::new("."));

    if !parent.exists() {
        fs::create_dir_all(parent)?;
    }

    // Tulis ke berkas sementara terlebih dahulu agar atomik dan aman dari interupsi.
    let (temp_path, file) = create_unique_temp_file(parent)?;

    let encode_result = (|| -> Result<(), ExportError> {
        let mut writer = BufWriter::new(file);
        {
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, quality.clamp(1, 100));
            encoder
                .encode(rgb_pixels, width, height, ColorType::Rgb8.into())
                .map_err(|e| ExportError::ImageError(e.to_string()))?;
        }
        writer.flush()?;
        writer.get_ref().sync_all()?;
        writer
            .into_inner()
            .map_err(|error| ExportError::IoError(error.into_error()))?;
        Ok(())
    })();

    if let Err(err) = encode_result {
        let _ = fs::remove_file(&temp_path);
        return Err(err);
    }

    // hard_link membuat target baru tanpa menimpa berkas yang muncul akibat race.
    // Setelah link berhasil, berkas sementara dihapus; data tetap berada di target.
    let link_result = fs::hard_link(&temp_path, output_path);
    let _ = fs::remove_file(&temp_path);
    link_result?;

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
    fn test_export_path_sanitizes_traversal_and_windows_chars() {
        let temp_dir = std::env::temp_dir();
        let path = get_safe_export_path(&temp_dir, "../folder\\bad:name", "jpg");
        assert_eq!(path.parent().unwrap(), temp_dir.as_path());
        let file_name = path.file_name().unwrap().to_string_lossy();
        assert!(!file_name.contains(".."));
        assert!(!file_name.contains('/'));
        assert!(!file_name.contains('\\'));
        assert!(!file_name.contains(':'));
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

    #[test]
    fn test_export_rejects_rgb_length_mismatch_without_creating_file() {
        let temp_dir = std::env::temp_dir().join("studio_qc_export_invalid_input_test");
        let _ = fs::create_dir_all(&temp_dir);
        let out_path = temp_dir.join("invalid_output.jpg");

        let result = export_srgb_jpeg(&out_path, &[128u8; 3], 2, 2, 90);

        assert!(matches!(result, Err(ExportError::InvalidInput(_))));
        assert!(!out_path.exists());
        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_export_does_not_overwrite_existing_target() {
        let temp_dir = std::env::temp_dir().join("studio_qc_export_no_clobber_test");
        let _ = fs::create_dir_all(&temp_dir);
        let out_path = temp_dir.join("existing_output.jpg");
        let original = b"existing-bytes";
        fs::write(&out_path, original).expect("Gagal menulis target uji");

        let rgb_data = vec![128u8; 4 * 4 * 3];
        let result = export_srgb_jpeg(&out_path, &rgb_data, 4, 4, 90);

        assert!(result.is_err());
        assert_eq!(fs::read(&out_path).expect("Gagal membaca target uji"), original);
        let temp_files: Vec<_> = fs::read_dir(&temp_dir)
            .expect("Gagal membaca direktori uji")
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().starts_with(".tmp_export_"))
            .collect();
        assert!(temp_files.is_empty(), "Berkas sementara tidak dibersihkan");
        let _ = fs::remove_dir_all(temp_dir);
    }
}
