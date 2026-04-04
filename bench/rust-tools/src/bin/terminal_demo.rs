// QRCode 终端输出演示
// 用于测试和展示 qrcode-fast 和 qrcode-rust 的终端输出功能
//
// 使用方法:
//   cargo run --release --bin terminal-demo -- "你的文本"

use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    let text = if args.len() > 1 {
        args[1].clone()
    } else {
        "https://github.com/veaba/qrcodes".to_string()
    };

    println!("\n═══════════════════════════════════════");
    println!("  QRCode 终端输出演示");
    println!("═══════════════════════════════════════");
    println!("文本：{}\n", text);

    // ============================================
    // qrcode-fast 终端输出
    // ============================================
    println!("═══════════════════════════════════════");
    println!("  @veaba/qrcode-fast");
    println!("═══════════════════════════════════════\n");

    use qrcode_fast::{QRCode as FastQRCode, QRErrorCorrectLevel};

    let mut fast_qr = FastQRCode::with_options(QRErrorCorrectLevel::M);
    fast_qr.make_code(&text);

    println!("【1】标准终端输出 (to_terminal):");
    println!("───────────────────────────────────────");
    println!("{}", fast_qr.to_terminal(false, 1));
    println!();

    println!("【2】反转颜色 (invert=true):");
    println!("───────────────────────────────────────");
    println!("{}", fast_qr.to_terminal(true, 1));
    println!();

    println!("【3】大静区 (quietZone=3):");
    println!("───────────────────────────────────────");
    println!("{}", fast_qr.to_terminal(false, 3));
    println!();

    println!("【4】Braille 紧凑输出 (to_terminal_braille):");
    println!("───────────────────────────────────────");
    println!("{}", fast_qr.to_terminal_braille());
    println!();

    println!("【5】彩色终端输出 (绿色前景):");
    println!("───────────────────────────────────────");
    println!("{}", fast_qr.to_terminal_color("green", "white"));
    println!();

    println!("【6】彩色终端输出 (蓝色前景，黄色背景):");
    println!("───────────────────────────────────────");
    println!("{}", fast_qr.to_terminal_color("blue", "yellow"));
    println!();

    // ============================================
    // qrcode-rust 终端输出
    // ============================================
    println!("═══════════════════════════════════════");
    println!("  @veaba/qrcode-rust");
    println!("═══════════════════════════════════════\n");

    use qrcode_rust::{QRCode as RustQRCode, QRCodeOptions, QRErrorCorrectLevel as RustLevel};

    let mut rust_qr = RustQRCode::with_options(QRCodeOptions {
        width: 256,
        height: 256,
        color_dark: String::from("#000000"),
        color_light: String::from("#ffffff"),
        correct_level: RustLevel::M,
    });
    rust_qr.make_code(&text);

    println!("【1】标准终端输出 (to_terminal):");
    println!("───────────────────────────────────────");
    println!("{}", rust_qr.to_terminal(false, 1));
    println!();

    println!("【2】反转颜色 (invert=true):");
    println!("───────────────────────────────────────");
    println!("{}", rust_qr.to_terminal(true, 1));
    println!();

    println!("【3】Braille 紧凑输出 (to_terminal_braille):");
    println!("───────────────────────────────────────");
    println!("{}", rust_qr.to_terminal_braille());
    println!();

    println!("【4】彩色终端输出 (绿色前景):");
    println!("───────────────────────────────────────");
    println!("{}", rust_qr.to_terminal_color("green", "white"));
    println!();

    // ============================================
    // 信息摘要
    // ============================================
    println!("═══════════════════════════════════════");
    println!("  信息摘要");
    println!("═══════════════════════════════════════");
    println!("qrcode-fast 模块数：{}x{}", fast_qr.get_module_count(), fast_qr.get_module_count());
    println!("qrcode-rust 模块数：{}x{}", rust_qr.get_module_count(), rust_qr.get_module_count());
    println!();
}
