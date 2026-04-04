mod qr_8bit_byte;
mod qr_bit_buffer;
mod qr_code;
mod qr_code_model;
mod qr_math;
mod qr_polynomial;
mod qr_rs_block;
mod qr_util;
mod utils;

// 新增模块
mod canvas_renderer;
mod qr_generator;
mod qr_styled;

use qr_code::{QRCode, QRCodeOptions};
use qr_rs_block::QRErrorCorrectLevel;
use wasm_bindgen::prelude::*;

// 导出新增模块
pub use canvas_renderer::{render_qrcode_batch_pixels, render_qrcode_to_pixels, CanvasRenderer};
#[cfg(feature = "parallel")]
pub use qr_generator::generate_qrcode_parallel;
pub use qr_generator::is_parallel_supported;
pub use qr_generator::{generate_qrcode_batch, generate_qrcode_fast, QRCodeGenerator};
pub use qr_styled::{
    generate_alipay_style_qrcode, generate_cyberpunk_style_qrcode, generate_douyin_style_qrcode,
    generate_gradient_qrcode, generate_minimal_style_qrcode, generate_qrcode_with_logo_area,
    generate_retro_style_qrcode, generate_rounded_qrcode, generate_wechat_style_qrcode,
    generate_xiaohongshu_style_qrcode, QRCodeStyle, StyledQRCode,
};

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// 初始化 panic hook
#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// 初始化线程池（用于并行计算）
#[wasm_bindgen]
pub fn init_thread_pool(num_threads: usize) -> Result<(), JsValue> {
    #[cfg(feature = "parallel")]
    {
        wasm_bindgen_rayon::init_thread_pool(num_threads)
            .map_err(|e| JsValue::from_str(&format!("Failed to init thread pool: {:?}", e)))
    }
    #[cfg(not(feature = "parallel"))]
    {
        let _ = num_threads;
        Err(JsValue::from_str("Parallel feature not enabled"))
    }
}

/// 错误纠正级别
#[wasm_bindgen]
#[derive(Debug, Clone, Copy)]
pub enum CorrectLevel {
    L = 1,
    M = 0,
    Q = 3,
    H = 2,
}

impl From<CorrectLevel> for QRErrorCorrectLevel {
    fn from(level: CorrectLevel) -> Self {
        match level {
            CorrectLevel::L => QRErrorCorrectLevel::L,
            CorrectLevel::M => QRErrorCorrectLevel::M,
            CorrectLevel::Q => QRErrorCorrectLevel::Q,
            CorrectLevel::H => QRErrorCorrectLevel::H,
        }
    }
}

/// QRCode WASM 包装器（向后兼容）
#[wasm_bindgen]
pub struct QRCodeWasm {
    qr: QRCode,
}

#[wasm_bindgen]
impl QRCodeWasm {
    /// 创建新的 QRCode
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        QRCodeWasm { qr: QRCode::new() }
    }

    /// 使用选项创建 QRCode
    pub fn with_options(width: i32, height: i32, correct_level: CorrectLevel) -> Self {
        let options = QRCodeOptions {
            width,
            height,
            correct_level: correct_level.into(),
            ..Default::default()
        };
        QRCodeWasm {
            qr: QRCode::with_options(options),
        }
    }

    /// 生成 QRCode
    pub fn make_code(&mut self, text: &str) {
        self.qr.make_code(text);
    }

    /// 获取模块数量
    pub fn get_module_count(&self) -> i32 {
        self.qr.get_module_count()
    }

    /// 判断指定位置是否为深色
    pub fn is_dark(&self, row: i32, col: i32) -> bool {
        self.qr.is_dark(row, col)
    }

    /// 获取模块数据作为 JSON 字符串
    pub fn get_modules_json(&self) -> String {
        if let Some(modules) = self.qr.get_modules() {
            let mut result = String::from("[");
            for (i, row) in modules.iter().enumerate() {
                if i > 0 {
                    result.push(',');
                }
                result.push('[');
                for (j, &cell) in row.iter().enumerate() {
                    if j > 0 {
                        result.push(',');
                    }
                    result.push_str(if cell.unwrap_or(false) { "1" } else { "0" });
                }
                result.push(']');
            }
            result.push(']');
            result
        } else {
            String::from("[]")
        }
    }

    /// 获取 SVG 字符串
    pub fn get_svg(&self) -> String {
        let count = self.qr.get_module_count();
        if count == 0 {
            return String::new();
        }

        let size = 256;
        let cell_size = size / count;
        let actual_size = cell_size * count;
        let offset = (size - actual_size) / 2; // 居中偏移

        let mut svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {} {}" width="{}" height="{}">"#,
            size, size, size, size
        );

        // 背景
        svg.push_str(&format!(
            r#"<rect width="{}" height="{}" fill="{}"/>"#,
            size, size, self.qr.options.color_light
        ));

        // 使用 rect 绘制每个模块，确保定位图案正确显示
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

    // ===== 终端显示方法 =====

    /// 将 QRCode 渲染为终端可显示的字符画
    /// @param invert - 是否反转颜色（默认 false）
    /// @param quietZone - 静区大小（默认 1）
    #[wasm_bindgen]
    pub fn to_terminal(&self, invert: bool, quiet_zone: i32) -> String {
        self.qr.to_terminal(invert, quiet_zone)
    }

    /// 使用 Braille 字符渲染更紧凑的终端二维码
    #[wasm_bindgen]
    pub fn to_terminal_braille(&self) -> String {
        self.qr.to_terminal_braille()
    }

    /// 带颜色的终端输出（使用 ANSI 转义序列）
    /// @param fgColor - 前景色（深色模块颜色）
    /// @param bgColor - 背景色（浅色模块颜色）
    #[wasm_bindgen]
    pub fn to_terminal_color(&self, fg_color: String, bg_color: String) -> String {
        self.qr.to_terminal_color(&fg_color, &bg_color)
    }
}

impl Default for QRCodeWasm {
    fn default() -> Self {
        Self::new()
    }
}

/// 生成 QRCode 并返回模块数据（向后兼容）
#[wasm_bindgen]
pub fn generate_qrcode(text: &str, correct_level: CorrectLevel) -> QRCodeWasm {
    let mut qr = QRCodeWasm::with_options(256, 256, correct_level);
    qr.make_code(text);
    qr
}

/// 获取版本号
#[wasm_bindgen]
pub fn version() -> String {
    String::from("v0.2.0")
}

/// 获取版本信息
#[wasm_bindgen]
pub fn get_version_info() -> String {
    String::from(
        r#"{
        "version": "0.2.0",
        "features": [
            "basic_qrcode",
            "batch_generation",
            "styled_qrcode",
            "canvas_renderer",
            "instance_reuse"
        ]
    }"#,
    )
}

/// 简单的问候函数
#[wasm_bindgen]
pub fn greet() {
    web_sys::console::log_1(&"Hello from qrcodes v0.2.0!".into());
}
