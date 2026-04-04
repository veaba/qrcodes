//! QR Code Fast - 极致性能版本
//!
//! 目标：在 SVG 生成性能上超越 kennytm/qrcode
//!
//! 注意：验证和比较工具已迁移到 bench/rust-tools

// 本地模块：核心 QRCode 实现（特有，不共享）
mod qr_code;

// 从 qrcode-rust-shared 重新导出
pub use qrcode_rust_shared::{
    qr_8bit_byte::QR8bitByte,
    qr_bit_buffer::BitBuffer,
    qr_code_model::{get_min_version, QRErrorCorrectLevel, QRErrorCorrectLevel as CorrectLevel},
    qr_math::QRMath,
    qr_polynomial::Polynomial,
    qr_rs_block::get_rs_blocks,
    qr_util::get_bch_digit,
};

// 重新导出本地模块
pub use qr_code::{QRCode, QRCodeOptions};

// 重新导出，保持 API 兼容
pub use qr_code::QRCode as QRCodeWasm;
