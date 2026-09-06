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

/// Memuat gambar (JPEG, PNG, TIFF, decoded RAW) secara aman dan non-destruktif
pub fn load_image_file(path: &Path) -> Result<LoadedImage, LoaderError> {
    let file = File::open(path)?;
    let metadata = file.metadata()?;
    let file_size = metadata.len();
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let reader = ImageReader::open(path)?.with_guessed_format()?;
    let format_str = reader
        .format()
        .map(|f| format!("{:?}", f))
        .unwrap_or_else(|| "Unknown".to_string());

    let dyn_img: DynamicImage = reader
        .decode()
        .map_err(|e| LoaderError::ImageDecodeError(e.to_string()))?;

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
