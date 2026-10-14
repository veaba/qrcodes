// 批量独立解码验证：扫描 docs/public/bench/svg/ 下由五方基准落盘的 SVG，
// 逐个用外部解码器 (resvg 渲染 + rqrr 解码) 还原内容，并与该用例的原始文本比对。
//
// 存在意义：落盘的 SVG 是「人工扫码验证」的凭据。本工具把它变成可复现的自动检查，
// 覆盖全部五方（含 node / bun —— validate-all 只覆盖 Rust 三方）。
//
// 运行方式:
//   cargo run --release --features validation --bin validate-svg-dir
//   cargo run --release --features validation --bin validate-svg-dir -- <目录>
//
// 命名约定（由 five-way-rust-h / five-way-js 写入）:
//   <前缀>_<用例>_<序号>.svg
//   前缀: fast | rust | kennytm | node | bun
//   用例: short | url | long
//
// 退出码: 0 = 全部通过（或目录不存在）；1 = 存在失败/无法识别的文件。

use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::path::PathBuf;

use rust_tools::validation::decode_qr_from_svg;

/// 与 five_way_rust_h.rs / five-way-js.mjs 中的 CASES 严格一致。
const CASES: [(&str, &str); 3] = [
    ("short", "hello world"),
    ("url", "https://qrcodes.veaba.me/"),
    (
        "long",
        "多引擎 QRCodes，高性能 QRCode 库，支持 WASM、Node.js、Bun 和 Rust 的多运行时 QRCode 解决方案",
    ),
];

/// 已知实现前缀，用于识别文件名与统计覆盖。
const PREFIXES: [&str; 5] = ["fast", "rust", "kennytm", "node", "bun"];

fn default_dir() -> PathBuf {
    let mut d = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    d.pop(); // bench
    d.pop(); // repo root
    d.push("docs/public/bench/svg");
    d
}

fn case_text(name: &str) -> Option<&'static str> {
    CASES.iter().find(|(n, _)| *n == name).map(|(_, t)| *t)
}

fn main() {
    let dir = env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(default_dir);

    println!("═══════════════════════════════════════════════════════════════");
    println!("  落盘 SVG 独立解码验证 (resvg 渲染 + rqrr 解码)");
    println!("═══════════════════════════════════════════════════════════════");
    println!("目录: {}", dir.display());

    if !dir.is_dir() {
        // 该目录已在 .gitignore 中，未跑过基准的环境本就不会有。
        println!();
        println!("ℹ️  目录不存在，跳过（需先运行 five-way-rust-h / five-way-js --save-svg 生成）");
        return;
    }

    let mut svgs: Vec<PathBuf> = match fs::read_dir(&dir) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().is_some_and(|x| x == "svg"))
            .collect(),
        Err(e) => {
            eprintln!("❌ 无法读取目录: {}", e);
            std::process::exit(1);
        }
    };
    svgs.sort();

    if svgs.is_empty() {
        println!();
        println!("ℹ️  目录内没有 .svg 文件，跳过");
        return;
    }

    println!("发现 {} 个 SVG", svgs.len());
    println!();

    let mut pass = 0usize;
    let mut failures: Vec<(String, String)> = Vec::new();
    // 前缀 -> 已通过数，用于报告覆盖情况
    let mut per_prefix: BTreeMap<&str, usize> = BTreeMap::new();

    for path in &svgs {
        let file = path.file_name().and_then(|s| s.to_str()).unwrap_or("<?>");

        // 解析 <前缀>_<用例>_<序号>.svg
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
        let parts: Vec<&str> = stem.split('_').collect();
        if parts.len() != 3 {
            failures.push((
                file.to_string(),
                "文件名不符合 <前缀>_<用例>_<序号>.svg".into(),
            ));
            continue;
        }
        let (prefix, case_name, _idx) = (parts[0], parts[1], parts[2]);

        if !PREFIXES.contains(&prefix) {
            failures.push((file.to_string(), format!("未知实现前缀 '{}'", prefix)));
            continue;
        }
        let Some(expected) = case_text(case_name) else {
            failures.push((file.to_string(), format!("未知用例名 '{}'", case_name)));
            continue;
        };

        let svg = match fs::read_to_string(path) {
            Ok(s) => s,
            Err(e) => {
                failures.push((file.to_string(), format!("读取失败: {}", e)));
                continue;
            }
        };

        match decode_qr_from_svg(&svg) {
            Ok(decoded) if decoded == expected => {
                pass += 1;
                *per_prefix.entry(prefix).or_insert(0) += 1;
            }
            Ok(decoded) => failures.push((
                file.to_string(),
                format!("内容不匹配：期望 {:?}，实际 {:?}", expected, decoded),
            )),
            Err(e) => failures.push((file.to_string(), format!("解码失败: {}", e))),
        }
    }

    println!("── 覆盖情况 ──");
    for p in PREFIXES {
        let n = per_prefix.get(p).copied().unwrap_or(0);
        println!("   {:<10} 通过 {}", p, n);
    }
    println!();

    println!("═══════════════════════════════════════════════════════════════");
    if failures.is_empty() {
        println!("✅ 全部 {} 个 SVG 均可被独立解码器还原为原始文本", pass);
    } else {
        println!("❌ {} 个通过，{} 个失败：", pass, failures.len());
        println!();
        for (file, why) in &failures {
            println!("   {} — {}", file, why);
        }
        println!();
        println!("失败的 SVG 不是合法可解码的二维码，其性能数字不代表真实产物。");
        std::process::exit(1);
    }

    // 目录存在但覆盖不全时给出提示（不算失败）
    let expected_total = PREFIXES.len() * CASES.len();
    let distinct_ok = per_prefix.len();
    if distinct_ok < PREFIXES.len() {
        println!();
        println!(
            "ℹ️  仅覆盖 {} / {} 个实现（期望组合数 {}）",
            distinct_ok,
            PREFIXES.len(),
            expected_total
        );
    }
}
