// 五方 SVG 生成性能对比 —— 权威口径测量器 + SVG 落盘
//
// 用途：
//   1. 生成权威文件 (docs/public/benchmark_speedup_verified.json) 中
//      「五方对比」三个新用例的测量数据（纠错级别 H，与 veaba 默认一致）。
//   2. 把每个实现每次生成的 SVG 落盘到 docs/public/bench/svg/，
//      供人工扫描验证。该目录已 gitignore。
//
// 命名约定（便于人工核对）：
//   <前缀>_<用例>_<序号>.svg
//   前缀: fast / rust / kennytm
//   序号: 第 n 次生成（0 起），默认只落前 SAVE_RUNS 次，避免刷屏
//
// 用法:
//   cargo run --release --bin five-way-rust-h
//   cargo run --release --bin five-way-rust-h -- --save-all   # 落全部 100 次

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

const RUNS: u32 = 100;
const WARMUP: u32 = 20;
/// 默认落盘的次数（0..SAVE_RUNS）。--save-all 时等于 RUNS。
const SAVE_RUNS: u32 = 5;

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

fn svg_dir() -> PathBuf {
    // 从 bench/rust-tools 上溯到仓库根
    let mut d = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    d.pop(); // bench
    d.pop(); // repo root
    d.push("docs/public/bench/svg");
    d
}

fn save(dir: &Path, prefix: &str, case: &str, idx: u32, svg: &str) {
    let name = format!("{}_{}_{}.svg", prefix, case, idx);
    if let Err(e) = fs::write(dir.join(&name), svg) {
        eprintln!("⚠️  写入 {} 失败: {}", name, e);
    }
}

fn bench_fast(text: &str, case: &str, dir: &Path, save_all: bool) -> Stats {
    for _ in 0..WARMUP {
        let mut qr = qrcode_fast::QRCode::new();
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());
    }
    let limit = if save_all { RUNS } else { SAVE_RUNS };
    let mut times = Vec::with_capacity(RUNS as usize);
    let mut last_svg = String::new();
    let mut last_mod = 0i32;
    let mut last_ver = 0i32;
    for i in 0..RUNS {
        let start = Instant::now();
        let mut qr = qrcode_fast::QRCode::new();
        qr.make_code(text);
        let svg = qr.get_svg();
        let elapsed = start.elapsed().as_secs_f64() * 1_000_000.0;
        if i < limit {
            save(dir, "fast", case, i, &svg);
        }
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

fn bench_rust(text: &str, case: &str, dir: &Path, save_all: bool) -> Stats {
    for _ in 0..WARMUP {
        let mut qr = qrcode_rust::QRCode::new();
        qr.make_code(text);
        std::hint::black_box(qr.get_svg());
    }
    let limit = if save_all { RUNS } else { SAVE_RUNS };
    let mut times = Vec::with_capacity(RUNS as usize);
    let mut last_svg = String::new();
    let mut last_mod = 0i32;
    let mut last_ver = 0i32;
    for i in 0..RUNS {
        let start = Instant::now();
        let mut qr = qrcode_rust::QRCode::new();
        qr.make_code(text);
        let svg = qr.get_svg();
        let elapsed = start.elapsed().as_secs_f64() * 1_000_000.0;
        if i < limit {
            save(dir, "rust", case, i, &svg);
        }
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

fn bench_kennytm(text: &str, case: &str, dir: &Path, save_all: bool) -> Stats {
    for _ in 0..WARMUP {
        let code = qrcode_kennytm::QrCode::new(text).unwrap();
        std::hint::black_box(code.render::<qrcode_kennytm::render::svg::Color>().build());
    }
    let limit = if save_all { RUNS } else { SAVE_RUNS };
    let mut times = Vec::with_capacity(RUNS as usize);
    let mut last_svg = String::new();
    let mut last_mod = 0i32;
    let mut last_ver = 0i32;
    for i in 0..RUNS {
        let start = Instant::now();
        let code = qrcode_kennytm::QrCode::new(text).unwrap();
        let svg = code.render::<qrcode_kennytm::render::svg::Color>().build();
        let elapsed = start.elapsed().as_secs_f64() * 1_000_000.0;
        if i < limit {
            save(dir, "kennytm", case, i, &svg);
        }
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
    let save_all = std::env::args().any(|a| a == "--save-all");
    let dir = svg_dir();
    fs::create_dir_all(&dir).expect("无法创建 SVG 输出目录");

    println!("===FIVEWAY_JSON_BEGIN===");
    println!("{{");
    println!("  \"runtime\": \"rust\",");
    println!("  \"ec_level\": \"H\",");
    println!("  \"runs\": {},", RUNS);
    println!("  \"warmup\": {},", WARMUP);
    println!("  \"metric\": \"avg_us\",");
    println!("  \"svg_dir\": \"docs/public/bench/svg\",");
    println!("  \"results\": [");
    let mut first_case = true;
    for case in &CASES {
        if !first_case {
            println!(",");
        }
        first_case = false;
        println!("  {{");
        println!("    \"case\": \"{}\",", case.name);
        println!("    \"bytes\": {},", case.text.len());
        println!("    \"impls\": [");
        let mut first = true;
        emit(
            "qrcode-fast",
            &bench_fast(case.text, case.name, &dir, save_all),
            &mut first,
        );
        println!();
        emit(
            "qrcode-rust",
            &bench_rust(case.text, case.name, &dir, save_all),
            &mut first,
        );
        println!();
        emit(
            "kennytm",
            &bench_kennytm(case.text, case.name, &dir, save_all),
            &mut first,
        );
        println!();
        print!("    ]\n  }}");
    }
    println!();
    println!("  ]");
    println!("}}");
    println!("===FIVEWAY_JSON_END===");
}
