use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Xyz {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Lab {
    pub l: f64, // 0.0 - 100.0
    pub a: f64, // -128.0 to +127.0
    pub b: f64, // -128.0 to +127.0
}

// Standar Iluminan D65 (2 derajat pengamat standar CIE 1931)
const D65_XN: f64 = 95.047;
const D65_YN: f64 = 100.000;
const D65_ZN: f64 = 108.883;

pub fn srgb_to_linear(c: u8) -> f64 {
    let v = c as f64 / 255.0;
    if v <= 0.04045 {
        v / 12.92
    } else {
        ((v + 0.055) / 1.055).powf(2.4)
    }
}

pub fn linear_to_srgb(v: f64) -> u8 {
    let clamped = v.clamp(0.0, 1.0);
    let c = if clamped <= 0.0031308 {
        12.92 * clamped
    } else {
        1.055 * clamped.powf(1.0 / 2.4) - 0.055
    };
    (c * 255.0).round() as u8
}

pub fn rgb_to_xyz(rgb: &Rgb) -> Xyz {
    let r_lin = srgb_to_linear(rgb.r);
    let g_lin = srgb_to_linear(rgb.g);
    let b_lin = srgb_to_linear(rgb.b);

    let x = (r_lin * 0.4124564 + g_lin * 0.3575761 + b_lin * 0.1804375) * 100.0;
    let y = (r_lin * 0.2126729 + g_lin * 0.7151522 + b_lin * 0.0721750) * 100.0;
    let z = (r_lin * 0.0193339 + g_lin * 0.1191920 + b_lin * 0.9503041) * 100.0;

    Xyz { x, y, z }
}

fn f_xyz(t: f64) -> f64 {
    let delta: f64 = 6.0 / 29.0;
    if t > delta.powi(3) {
        t.cbrt()
    } else {
        t / (3.0 * delta.powi(2)) + 4.0 / 29.0
    }
}

pub fn xyz_to_lab(xyz: &Xyz) -> Lab {
    let fx = f_xyz(xyz.x / D65_XN);
    let fy = f_xyz(xyz.y / D65_YN);
    let fz = f_xyz(xyz.z / D65_ZN);

    let l = (116.0 * fy - 16.0).max(0.0);
    let a = 500.0 * (fx - fy);
    let b = 200.0 * (fy - fz);

    Lab { l, a, b }
}

pub fn rgb_to_lab(rgb: &Rgb) -> Lab {
    xyz_to_lab(&rgb_to_xyz(rgb))
}

pub fn lab_to_xyz(lab: &Lab) -> Xyz {
    let fy = (lab.l + 16.0) / 116.0;
    let fx = lab.a / 500.0 + fy;
    let fz = fy - lab.b / 200.0;

    let inv_f = |t: f64| -> f64 {
        let delta: f64 = 6.0 / 29.0;
        if t > delta {
            t.powi(3)
        } else {
            3.0 * delta.powi(2) * (t - 4.0 / 29.0)
        }
    };

    let x = D65_XN * inv_f(fx);
    let y = D65_YN * inv_f(fy);
    let z = D65_ZN * inv_f(fz);

    Xyz { x, y, z }
}

pub fn xyz_to_rgb(xyz: &Xyz) -> Rgb {
    let x = xyz.x / 100.0;
    let y = xyz.y / 100.0;
    let z = xyz.z / 100.0;

    let r_lin = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g_lin = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b_lin = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

    Rgb {
        r: linear_to_srgb(r_lin),
        g: linear_to_srgb(g_lin),
        b: linear_to_srgb(b_lin),
    }
}

pub fn lab_to_rgb(lab: &Lab) -> Rgb {
    xyz_to_rgb(&lab_to_xyz(lab))
}
