//! @veaba/qrcode-rust - Pure Rust QRCode Generator
//!
//! A pure Rust QRCode generator library.
//! Provides consistent API with qrcode-node and qrcode-bun.

// 本地模块：核心 QRCode 实现（特有，不共享）
mod qr_code;

// 从 qrcode-rust-shared 重新导出
pub use qrcode_rust_shared::{
    qr_8bit_byte::QR8bitByte,
    qr_bit_buffer::BitBuffer,
    qr_code_model::{get_type_number, QRErrorCorrectLevel, QRMode, PATTERN_POSITION_TABLE},
    qr_math::QRMath,
    qr_polynomial::Polynomial,
    qr_rs_block::{get_rs_blocks, QRRSBlock},
    qr_util::{get_bch_digit, get_length_in_bits},
};

// 重新导出本地模块
pub use qr_code::{QRCode, QRCodeOptions};

// ============================================
// QRCode Native 包装器
// ============================================

pub struct QRCodeNative {
    qr: QRCode,
}

impl QRCodeNative {
    pub fn new(text: &str, correct_level: QRErrorCorrectLevel) -> Self {
        let mut qr = QRCode::with_options(QRCodeOptions {
            width: 256,
            height: 256,
            color_dark: String::from("#000000"),
            color_light: String::from("#ffffff"),
            correct_level,
        });
        qr.make_code(text);
        QRCodeNative { qr }
    }

    pub fn module_count(&self) -> i32 {
        self.qr.get_module_count()
    }

    pub fn get_module_count(&self) -> i32 {
        self.qr.get_module_count()
    }

    pub fn is_dark(&self, row: i32, col: i32) -> bool {
        self.qr.is_dark(row, col)
    }

    pub fn to_svg(&self, size: i32) -> String {
        let count = self.qr.get_module_count();
        if count == 0 {
            return String::new();
        }

        let cell_size = size / count;
        let actual_size = cell_size * count;
        let offset = (size - actual_size) / 2;

        let mut svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {} {}" width="{}" height="{}">"#,
            size, size, size, size
        );

        svg.push_str(&format!(
            r#"<rect width="{}" height="{}" fill="{}"/>"#,
            size, size, self.qr.options.color_light
        ));

        for row in 0..count {
            for col in 0..count {
                if self.qr.is_dark(row, col) {
                    svg.push_str(&format!(
                        r#"<rect x="{}" y="{}" width="{}" height="{}" fill="{}"/>"#,
                        col * cell_size + offset,
                        row * cell_size + offset,
                        cell_size,
                        cell_size,
                        self.qr.options.color_dark
                    ));
                }
            }
        }

        svg.push_str("</svg>");
        svg
    }
}

impl Default for QRCodeNative {
    fn default() -> Self {
        Self::new("", QRErrorCorrectLevel::H)
    }
}
