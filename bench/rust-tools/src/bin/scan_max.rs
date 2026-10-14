// 扫描两个 Rust 实现的最大可解码长度（H 级），确认是否覆盖到 QR 标准上限。
//
//   cargo run --release --features validation --bin scan-max

use rust_tools::validation::validate_qr_code;

fn main() {
    // QR v40-H 标准上限 = 1273 字节
    println!("QR 标准 H 级上限: v40 = 1273 字节");
    println!();

    for (name, f) in [("qrcode-fast", true), ("qrcode-rust", false)] {
        let mut max_ok = 0usize;
        let mut first_fail = None;
        for len in 1..=1400usize {
            let text: String = "A".repeat(len);
            let (svg, ver) = if f {
                let mut qr = qrcode_fast::QRCode::new();
                qr.make_code(&text);
                (qr.get_svg(), qr.type_number)
            } else {
                let mut qr = qrcode_rust::QRCode::new();
                qr.make_code(&text);
                (qr.get_svg(), qr.type_number)
            };
            if validate_qr_code(&svg, &text).is_ok() {
                max_ok = len;
            } else if first_fail.is_none() {
                first_fail = Some((len, ver));
                break;
            }
        }
        match first_fail {
            Some((len, ver)) => println!(
                "{:<14} 最大可解码 {} 字节，{} 字节起失败 (version {})",
                name, max_ok, len, ver
            ),
            None => println!("{:<14} 全部 1400 字节均可解码 ✅", name),
        }
    }
}
