use super::transforms::Lab;
use std::f64::consts::PI;

#[inline]
fn rad(deg: f64) -> f64 {
    deg * PI / 180.0
}

#[inline]
fn deg(rad: f64) -> f64 {
    rad * 180.0 / PI
}

/// Menghitung perbedaan warna ΔE00 antara dua nilai warna CIE Lab
/// Menggunakan standar CIEDE2000 resmi (Sharma et al. 2005)
pub fn calculate_delta_e00(lab1: &Lab, lab2: &Lab, k_l: f64, k_c: f64, k_h: f64) -> f64 {
    let l1 = lab1.l;
    let a1 = lab1.a;
    let b1 = lab1.b;

    let l2 = lab2.l;
    let a2 = lab2.a;
    let b2 = lab2.b;

    // 1. Hitung C1, C2, dan Cbar
    let c1 = (a1 * a1 + b1 * b1).sqrt();
    let c2 = (a2 * a2 + b2 * b2).sqrt();
    let c_bar = (c1 + c2) / 2.0;

    // 2. Faktor G
    let c_bar7 = c_bar.powi(7);
    let g = 0.5 * (1.0 - (c_bar7 / (c_bar7 + 25.0_f64.powi(7))).sqrt());

    // 3. Modifikasi koordinat a'
    let a1_prime = (1.0 + g) * a1;
    let a2_prime = (1.0 + g) * a2;

    // 4. Hitung C'1 dan C'2
    let c1_prime = (a1_prime * a1_prime + b1 * b1).sqrt();
    let c2_prime = (a2_prime * a2_prime + b2 * b2).sqrt();

    // 5. Hitung sudut h'1 dan h'2 dalam derajat (0 - 360)
    let mut h1_prime = deg(b1.atan2(a1_prime));
    if h1_prime < 0.0 {
        h1_prime += 360.0;
    }

    let mut h2_prime = deg(b2.atan2(a2_prime));
    if h2_prime < 0.0 {
        h2_prime += 360.0;
    }

    // 6. Hitung delta L', delta C', dan delta h'
    let delta_l_prime = l2 - l1;
    let delta_c_prime = c2_prime - c1_prime;

    let mut delta_h_prime_degrees = 0.0;
    if c1_prime * c2_prime != 0.0 {
        let diff = h2_prime - h1_prime;
        if diff.abs() <= 180.0 {
            delta_h_prime_degrees = diff;
        } else if diff > 180.0 {
            delta_h_prime_degrees = diff - 360.0;
        } else {
            delta_h_prime_degrees = diff + 360.0;
        }
    }
    let delta_h_prime = 2.0 * (c1_prime * c2_prime).sqrt() * rad(delta_h_prime_degrees / 2.0).sin();

    // 7. Hitung rata-rata L'bar, C'bar, dan h'bar
    let l_bar_prime = (l1 + l2) / 2.0;
    let c_bar_prime = (c1_prime + c2_prime) / 2.0;

    let h_bar_prime = if c1_prime * c2_prime == 0.0 {
        h1_prime + h2_prime
    } else {
        let diff = (h1_prime - h2_prime).abs();
        let sum = h1_prime + h2_prime;
        if diff <= 180.0 {
            sum / 2.0
        } else if sum < 360.0 {
            (sum + 360.0) / 2.0
        } else {
            (sum - 360.0) / 2.0
        }
    };

    // 8. Hitung T
    let t = 1.0
        - 0.17 * rad(h_bar_prime - 30.0).cos()
        + 0.24 * rad(2.0 * h_bar_prime).cos()
        + 0.32 * rad(3.0 * h_bar_prime + 6.0).cos()
        - 0.20 * rad(4.0 * h_bar_prime - 63.0).cos();

    // 9. Hitung faktor koreksi bobot SL, SC, SH, dan RT
    let delta_theta = 30.0 * (-((h_bar_prime - 275.0) / 25.0).powi(2)).exp();
    let c_bar_prime7 = c_bar_prime.powi(7);
    let rc = 2.0 * (c_bar_prime7 / (c_bar_prime7 + 25.0_f64.powi(7))).sqrt();

    let l_bar_prime_minus_50_sq = (l_bar_prime - 50.0).powi(2);
    let s_l = 1.0 + (0.015 * l_bar_prime_minus_50_sq) / (20.0 + l_bar_prime_minus_50_sq).sqrt();
    let s_c = 1.0 + 0.045 * c_bar_prime;
    let s_h = 1.0 + 0.015 * c_bar_prime * t;

    let r_t = -rad(2.0 * delta_theta).sin() * rc;

    // 10. Hitung total ΔE00
    let l_term = delta_l_prime / (k_l * s_l);
    let c_term = delta_c_prime / (k_c * s_c);
    let h_term = delta_h_prime / (k_h * s_h);

    let delta_e00_sq = l_term.powi(2) + c_term.powi(2) + h_term.powi(2) + r_t * c_term * h_term;

    delta_e00_sq.max(0.0).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identical_colors() {
        let c = Lab { l: 50.0, a: 25.0, b: -10.0 };
        let de = calculate_delta_e00(&c, &c, 1.0, 1.0, 1.0);
        assert!((de - 0.0).abs() < 1e-6);
    }

    #[test]
    fn test_sharma_pair_1() {
        let lab1 = Lab { l: 50.0000, a: 2.6772, b: -79.7751 };
        let lab2 = Lab { l: 50.0000, a: 0.0000, b: -82.7485 };
        let de = calculate_delta_e00(&lab1, &lab2, 1.0, 1.0, 1.0);
        assert!((de - 2.0425).abs() < 0.001);
    }

    #[test]
    fn test_sharma_pair_2() {
        let lab1 = Lab { l: 50.0000, a: 3.1571, b: -77.2803 };
        let lab2 = Lab { l: 50.0000, a: 0.0000, b: -82.7485 };
        let de = calculate_delta_e00(&lab1, &lab2, 1.0, 1.0, 1.0);
        assert!((de - 2.8615).abs() < 0.001);
    }

    #[test]
    fn test_sharma_pair_3() {
        let lab1 = Lab { l: 50.0000, a: 2.8361, b: -74.0200 };
        let lab2 = Lab { l: 50.0000, a: 0.0000, b: -82.7485 };
        let de = calculate_delta_e00(&lab1, &lab2, 1.0, 1.0, 1.0);
        assert!((de - 3.4412).abs() < 0.001);
    }
}
