// 五方 SVG 生成性能对比 —— Rust 侧测量器（等纠错级别版）
//
// 与 five_way_rust.rs 的区别：三方统一使用纠错级别 M，
// 消除「veaba 默认 H、kennytm 默认 M」造成的产物规模差异。
//
// 用法:
//   cargo run --release --bin five-way-rust-m

use std::time::Instant;

const RUNS: u32 = 100;
const WARMUP: u32 = 20;

struct Case {
    name: &'static str,
    text: &'static str,
}

const CASES: [Case; 3] = [
    Case {
        name: "short",
        text: "hello world",
    },
    Case {
        name: "url",
        text: "https://qrcodes.veaba.me/",
    },
    Case {
        name: "long",
        text: "多引擎 QRCodes，高性能 QRCode 库，支持 WASM、Node.js、Bun 和 Rust 的多运行时 QRCode 解决方案",
    },
];

struct Stats {
    avg_us: f64,
    median_us: f64,
    min_us: f64,
    p95_us: f64,
    module_count: i32,
    svg_bytes: usize,
    version: i32,
}

fn summarize(mut times: Vec<f64>) -> (f64, f64, f64, f64) {
    times.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let avg = times.iter().sum::<f64>() / times.len() as f64;
    let median = times[times.len() / 2];
    let min = times[0];
    let idx = ((0.95 * times.len() as f64) as usize).min(times.len() - 1);
    let p95 = times[idx];
    (avg, median, min, p95)
}

fn rust_opts() -> qrcode_rust::QRCodeOptions {
    qrcode_rust::QRCodeOptions {
        correct_level: qrcode_rust::QRErrorCorrectLevel::M,
        ..Default::default()
    }
}

fn bench_fast(text: &str) -> Stats {
    for _ in 0..WARMUP {
        let mut qr = qrcode_fast::QRCode::with_options(qrcode_fast::QRErrorCorrectLevel::M);
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());
    }
    let mut times = Vec::with_capacity(RUNS as usize);
    let mut last_svg = String::new();
    let mut last_mod = 0i32;
    let mut last_ver = 0i32;
    for _ in 0..RUNS {
        let start = Instant::now();
        let mut qr = qrcode_fast::QRCode::with_options(qrcode_fast::QRErrorCorrectLevel::M);
        qr.make_code(text);
        let svg = qr.get_svg();
        let elapsed = start.elapsed().as_secs_f64() * 1_000_000.0;
        last_svg = svg;
        last_mod = qr.module_count;
        last_ver = qr.type_number;
        std::hint::black_box(&last_svg);
        times.push(elapsed);
    }
    let (avg, median, min, p95) = summarize(times);
    Stats {
        avg_us: avg,
        median_us: median,
        min_us: min,
        p95_us: p95,
        module_count: last_mod,
        svg_bytes: last_svg.len(),
        version: last_ver,
    }
}

fn bench_rust(text: &str) -> Stats {
    for _ in 0..WARMUP {
        let mut qr = qrcode_rust::QRCode::with_options(rust_opts());
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());
    }
    let mut times = Vec::with_capacity(RUNS as usize);
    let mut last_svg = String::new();
    let mut last_mod = 0i32;
    let mut last_ver = 0i32;
    for _ in 0..RUNS {
        let start = Instant::now();
        let mut qr = qrcode_rust::QRCode::with_options(rust_opts());
        qr.make_code(text);
        let svg = qr.get_svg();
        let elapsed = start.elapsed().as_secs_f64() * 1_000_000.0;
        last_svg = svg;
        last_mod = qr.module_count;
        last_ver = qr.type_number;
        std::hint::black_box(&last_svg);
        times.push(elapsed);
    }
    let (avg, median, min, p95) = summarize(times);
    Stats {
        avg_us: avg,
        median_us: median,
        min_us: min,
        p95_us: p95,
        module_count: last_mod,
        svg_bytes: last_svg.len(),
        version: last_ver,
    }
}

fn bench_kennytm(text: &str) -> Stats {
    for _ in 0..WARMUP {
        let code = qrcode_kennytm::QrCode::with_error_correction_level(
            text.as_bytes(),
            qrcode_kennytm::EcLevel::M,
        )
        .unwrap();
        std::hint::black_box(code.render::<qrcode_kennytm::render::svg::Color>().build());
    }
    let mut times = Vec::with_capacity(RUNS as usize);
    let mut last_svg = String::new();
    let mut last_mod = 0i32;
    let mut last_ver = 0i32;
    for _ in 0..RUNS {
        let start = Instant::now();
        let code = qrcode_kennytm::QrCode::with_error_correction_level(
            text.as_bytes(),
            qrcode_kennytm::EcLevel::M,
        )
        .unwrap();
        let svg = code.render::<qrcode_kennytm::render::svg::Color>().build();
        let elapsed = start.elapsed().as_secs_f64() * 1_000_000.0;
        last_svg = svg;
        last_mod = code.width() as i32;
        last_ver = match code.version() {
            qrcode_kennytm::Version::Normal(v) => v as i32,
            qrcode_kennytm::Version::Micro(_) => 0,
        };
        std::hint::black_box(&last_svg);
        times.push(elapsed);
    }
    let (avg, median, min, p95) = summarize(times);
    Stats {
        avg_us: avg,
        median_us: median,
        min_us: min,
        p95_us: p95,
        module_count: last_mod,
        svg_bytes: last_svg.len(),
        version: last_ver,
    }
}

fn emit(name: &str, s: &Stats, first: &mut bool) {
    if !*first {
        println!(",");
    }
    *first = false;
    print!(
        "    {{\n      \"impl\": \"{}\",\n      \"avg_us\": {:.2},\n      \"median_us\": {:.2},\n      \"min_us\": {:.2},\n      \"p95_us\": {:.2},\n      \"module_count\": {},\n      \"svg_bytes\": {},\n      \"version\": {}\n    }}",
        name, s.avg_us, s.median_us, s.min_us, s.p95_us, s.module_count, s.svg_bytes, s.version
    );
}

fn main() {
    println!("===FIVEWAY_JSON_BEGIN===");
    println!("{{");
    println!("  \"runtime\": \"rust\",");
    println!("  \"ec_level\": \"M\",");
    println!("  \"runs\": {},", RUNS);
    println!("  \"warmup\": {},", WARMUP);
    println!("  \"metric\": \"avg_us\",");
    println!("  \"results\": [");
    let mut first_case = true;
    for case in &CASES {
        if !first_case {
            println!(",");
        }
        first_case = false;
        println!("  {{");
        println!("    \"case\": \"{}\",", case.name);
        println!("    \"bytes\": {},", case.text.len()); // 字符串 len() 即 UTF-8 字节长度
        println!("    \"impls\": [");
        let mut first = true;
        emit("qrcode-fast", &bench_fast(case.text), &mut first);
        println!();
        emit("qrcode-rust", &bench_rust(case.text), &mut first);
        println!();
        emit("kennytm", &bench_kennytm(case.text), &mut first);
        println!();
        print!("    ]\n  }}");
    }
    println!();
    println!("  ]");
    println!("}}");
    println!("===FIVEWAY_JSON_END===");
}
