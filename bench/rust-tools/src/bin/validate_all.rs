// 独立解码验证：用外部码表(rqrr)解码三方实现生成的 SVG，确认内容正确。
//
// 运行方式:
//   cargo run --release --features validation --bin validate-all
//
// 这直接回答一个问题：性能数字所对应的产物，到底是不是「真的二维码」。

use rust_tools::validation::validate_qr_code;

struct Case {
    name: &'static str,
    text: &'static str,
}

fn main() {
    let cases = [
        Case {
            name: "Simple",
            text: "Hello World",
        },
        Case {
            name: "Complex",
            text: "Test QR Code 123",
        },
        Case {
            name: "URL",
            text: "https://github.com/veaba/qrcodes",
        },
        Case {
            name: "Long",
            text: "Email: test@example.com | Phone: +1-234-567-8900 | Address: 123 Main St",
        },
    ];

    println!("╔══════════════════════════════════════════════════════════════════════════╗");
    println!("║   独立解码验证 (resvg 渲染 + rqrr 解码) — 产物是否为可扫描的真实二维码   ║");
    println!("╚══════════════════════════════════════════════════════════════════════════╝");
    println!();

    let mut all_pass = true;

    for case in &cases {
        println!("── {} ── {:?}", case.name, case.text);

        let fast_svg = {
            let mut qr = qrcode_fast::QRCode::new();
            qr.make_code(case.text);
            qr.get_svg()
        };
        let rust_svg = {
            let mut qr = qrcode_rust::QRCode::new();
            qr.make_code(case.text);
            qr.get_svg()
        };
        let kennytm_svg = {
            let code = qrcode_kennytm::QrCode::new(case.text).unwrap();
            code.render::<qrcode_kennytm::render::svg::Color>().build()
        };

        let fast_ok = report("qrcode-fast", &fast_svg, case.text);
        let rust_ok = report("qrcode-rust", &rust_svg, case.text);
        let kennytm_ok = report("kennytm-qrcode", &kennytm_svg, case.text);

        all_pass = all_pass && fast_ok && rust_ok && kennytm_ok;
        println!();
    }

    println!("══════════════════════════════════════════════════════════════════════════");
    if all_pass {
        println!("✅ 全部实现生成的 SVG 均可被独立解码器还原为原始文本");
    } else {
        println!("❌ 存在无法解码或内容不匹配的实现 —— 其性能数字不代表真实二维码生成");
    }
}

fn report(label: &str, svg: &str, expected: &str) -> bool {
    match validate_qr_code(svg, expected) {
        Ok(()) => {
            println!("   ✅ {:<16} 解码匹配原始文本", label);
            true
        }
        Err(e) => {
            println!("   ❌ {:<16} 验证失败: {}", label, e);
            false
        }
    }
}
