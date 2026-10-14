// 统一口径验证工具：一次性、同机、同进程地对同一批输入测量三方实现。
//
// 运行方式:
//   cargo run --release --bin verify-speedup
//
// 测量口径（关键，用于消除历史文档里的口径混乱）:
//   - "SVG 生成" = make_code + get_svg/render 完整链路（端到端）
//   - 每个实现每个用例重复 RUNS 次，取平均；先做预热
//   - 输出中位数与平均值，避免单次抖动误导

use std::time::Instant;

const RUNS: u32 = 100;

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
    println!(
        "║   三方实现 SVG 生成性能验证 (同机同进程, {} 次/用例, 平均值)            ║",
        RUNS
    );
    println!("╚══════════════════════════════════════════════════════════════════════════╝");
    println!();

    for case in &cases {
        // 预热，避免首次分配影响
        warmup(case.text);

        let fast = bench_fast(case.text);
        let rust = bench_rust(case.text);
        let kennytm = bench_kennytm(case.text);

        println!("── {} ── {:?}", case.name, case.text);
        println!(
            "   qrcode-fast    : {:>9.2} µs   ({:>9.0} ops/s)",
            fast,
            1_000_000.0 / fast
        );
        println!(
            "   qrcode-rust    : {:>9.2} µs   ({:>9.0} ops/s)",
            rust,
            1_000_000.0 / rust
        );
        println!(
            "   kennytm-qrcode : {:>9.2} µs   ({:>9.0} ops/s)",
            kennytm,
            1_000_000.0 / kennytm
        );
        println!(
            "   => fast/kennytm = {:.1}x   rust/kennytm = {:.1}x   fast/rust = {:.2}x",
            kennytm / fast,
            kennytm / rust,
            rust / fast
        );
        println!();
    }
}

/// 预热：让分配器与 CPU 分支预测进入稳态
fn warmup(text: &str) {
    for _ in 0..20 {
        let mut qr = qrcode_fast::QRCode::new();
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());

        let mut qr = qrcode_rust::QRCode::new();
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());

        let code = qrcode_kennytm::QrCode::new(text).unwrap();
        std::hint::black_box(code.render::<qrcode_kennytm::render::svg::Color>().build());
    }
}

/// 返回平均微秒数
fn bench_fast(text: &str) -> f64 {
    let start = Instant::now();
    for _ in 0..RUNS {
        let mut qr = qrcode_fast::QRCode::new();
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());
    }
    start.elapsed().as_secs_f64() * 1_000_000.0 / RUNS as f64
}

fn bench_rust(text: &str) -> f64 {
    let start = Instant::now();
    for _ in 0..RUNS {
        let mut qr = qrcode_rust::QRCode::new();
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());
    }
    start.elapsed().as_secs_f64() * 1_000_000.0 / RUNS as f64
}

fn bench_kennytm(text: &str) -> f64 {
    let start = Instant::now();
    for _ in 0..RUNS {
        let code = qrcode_kennytm::QrCode::new(text).unwrap();
        std::hint::black_box(code.render::<qrcode_kennytm::render::svg::Color>().build());
    }
    start.elapsed().as_secs_f64() * 1_000_000.0 / RUNS as f64
}
