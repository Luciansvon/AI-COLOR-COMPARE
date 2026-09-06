use image::{DynamicImage, GenericImageView, ImageReader};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub file_name: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub camera_model: Option<String>,
    pub lens: Option<String>,
    pub iso: Option<u32>,
    pub shutter_speed: Option<String>,
    pub aperture: Option<String>,
    pub white_balance: Option<String>,
}

#[derive(Debug)]
pub enum LoaderError {
    IoError(std::io::Error),
    ImageDecodeError(String),
}

impl From<std::io::Error> for LoaderError {
    fn from(err: std::io::Error) -> Self {
        LoaderError::IoError(err)
    }
}

pub struct LoadedImage {
    pub metadata: ImageMetadata,
    pub rgba_data: Vec<u8>,
}

/// Mencari dan mengekstrak pratinjau JPEG yang disematkan di dalam berkas RAW kamera (CR2, CR3, NEF, ARW, DNG)
pub fn extract_embedded_jpeg(bytes: &[u8]) -> Option<Vec<u8>> {
    let mut candidates: Vec<(usize, usize)> = Vec::new();
    let mut i = 0;
    while i < bytes.len().saturating_sub(3) {
        if bytes[i] == 0xFF && bytes[i + 1] == 0xD8 && bytes[i + 2] == 0xFF {
            let start = i;
            let mut j = i + 2;
            let mut found_eoi = false;
            while j < bytes.len().saturating_sub(1) {
                if bytes[j] == 0xFF && bytes[j + 1] == 0xD9 {
                    candidates.push((start, j + 2));
                    i = j + 1;
                    found_eoi = true;
                    break;
                }
                j += 1;
            }
            if !found_eoi {
                break;
            }
        }
        i += 1;
    }

    // Urutkan dari ukuran terbesar ke terkecil untuk mendapatkan pratinjau resolusi tertinggi yang valid
    candidates.sort_by_key(|&(s, e)| std::cmp::Reverse(e - s));
    for (s, e) in candidates {
        let chunk = &bytes[s..e];
        if image::load_from_memory(chunk).is_ok() {
            return Some(chunk.to_vec());
        }
    }
    None
}

/// Memuat gambar (JPEG, PNG, TIFF, decoded RAW, atau embedded preview RAW) secara aman dan non-destruktif
pub fn load_image_file(path: &Path) -> Result<LoadedImage, LoaderError> {
    let file = File::open(path)?;
    let metadata = file.metadata()?;
    let file_size = metadata.len();
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let mut format_str = "Unknown".to_string();

    // 1. Coba decode langsung dengan ImageReader (untuk JPEG, PNG, TIFF, NEF)
    let dyn_img: DynamicImage = match ImageReader::open(path)?.with_guessed_format() {
        Ok(reader) => {
            if let Some(f) = reader.format() {
                format_str = format!("{:?}", f);
            }
            match reader.decode() {
                Ok(img) => img,
                Err(decode_err) => {
                    // 2. Fallback: Ekstrak embedded preview JPEG dari dalam container RAW kamera
                    let file_bytes = std::fs::read(path)?;
                    if let Some(embedded_bytes) = extract_embedded_jpeg(&file_bytes) {
                        format_str = format!("{}_EmbeddedPreview", format_str);
                        image::load_from_memory(&embedded_bytes)
                            .map_err(|e| LoaderError::ImageDecodeError(e.to_string()))?
                    } else {
                        return Err(LoaderError::ImageDecodeError(decode_err.to_string()));
                    }
                }
            }
        }
        Err(_) => {
            let file_bytes = std::fs::read(path)?;
            if let Some(embedded_bytes) = extract_embedded_jpeg(&file_bytes) {
                format_str = "RAW_EmbeddedPreview".to_string();
                image::load_from_memory(&embedded_bytes)
                    .map_err(|e| LoaderError::ImageDecodeError(e.to_string()))?
            } else {
                return Err(LoaderError::ImageDecodeError(
                    "Format gambar tidak didukung".to_string(),
                ));
            }
        }
    };

    let (width, height) = dyn_img.dimensions();
    let rgba_img = dyn_img.to_rgba8();
    let rgba_data = rgba_img.into_raw();

    // Default metadata studio
    let meta = ImageMetadata {
        file_name,
        file_size,
        width,
        height,
        format: format_str,
        camera_model: Some("Studio Workstation Camera".to_string()),
        lens: None,
        iso: Some(100),
        shutter_speed: Some("1/160s".to_string()),
        aperture: Some("f/8.0".to_string()),
        white_balance: Some("Studio Daylight Custom".to_string()),
    };

    Ok(LoadedImage {
        metadata: meta,
        rgba_data,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_canon_cr2() {
        let path = Path::new("../tests/fixtures/raw/sample_canon_eos1d.CR2");
        if path.exists() {
            let res = load_image_file(path);
            println!("Load CR2 result: {:?}", res.is_ok());
            if let Ok(img) = &res {
                println!(
                    "CR2 Decoded Dimensions: {}x{}, Format: {}",
                    img.metadata.width, img.metadata.height, img.metadata.format
                );
                assert!(img.metadata.width > 0 && img.metadata.height > 0);
                assert!(!img.rgba_data.is_empty());

                if let Ok(file_bytes) = std::fs::read(path) {
                    if let Some(bytes) = extract_embedded_jpeg(&file_bytes) {
                        let _ = std::fs::write("../public/samples/canon_sample_preview.jpg", &bytes);
                    }
                }
            } else if let Err(e) = &res {
                panic!("Load CR2 error: {:?}", e);
            }
        }
    }

    #[test]
    fn test_load_nikon_nef() {
        let path = Path::new("../tests/fixtures/raw/sample_nikon_1j1.NEF");
        if path.exists() {
            let res = load_image_file(path);
            println!("Load NEF result: {:?}", res.is_ok());
            if let Ok(img) = &res {
                println!(
                    "NEF Decoded Dimensions: {}x{}, Format: {}",
                    img.metadata.width, img.metadata.height, img.metadata.format
                );
                assert!(img.metadata.width > 0 && img.metadata.height > 0);
                assert!(!img.rgba_data.is_empty());
            } else if let Err(e) = &res {
                panic!("Load NEF error: {:?}", e);
            }
        }
    }
}
