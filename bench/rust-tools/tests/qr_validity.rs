//! 二维码正确性回归测试
//!
//! 锁定核心不变量：**生成的二维码必须能被独立解码器还原为原始文本**。
//!
//! 背景：本仓库曾长期缺少这项校验，导致两个 Rust 实现静默产出无法解码的二维码
//! （短链接即失效、v7+ 缺版本信息、实例复用沿用旧版本号、容量表 v15-H 为占位符），
//! 而文档中的性能数字仍显示正常。
//!
//! 运行：
//!   cargo test --release --features validation --test qr_validity

#![cfg(feature = "validation")]

use rust_tools::validation::{decode_qr_from_svg, validate_qr_code};

/// 用独立解码器还原内容，并要求与原文逐字节一致。
fn assert_decodes(svg: &str, expected: &str, label: &str) {
    match decode_qr_from_svg(svg) {
        Ok(decoded) => assert_eq!(decoded, expected, "{label}: 解码内容与原文不一致"),
        Err(e) => panic!("{label}: 解码失败 ({e})"),
    }
}

// ============================================================
// 1. 全实现基础能力：短文本三方都必须可解码
// ============================================================

#[test]
fn short_text_all_implementations_decode() {
    let texts = [
        "Hello World",
        "Test QR Code 123",
        "https://github.com/veaba/qrcodes",
    ];

    for text in texts {
        let mut fast = qrcode_fast::QRCode::new();
        fast.make_code(text);
        assert_decodes(&fast.get_svg(), text, &format!("qrcode-fast {text:?}"));

        let mut rust = qrcode_rust::QRCode::new();
        rust.make_code(text);
        assert_decodes(&rust.get_svg(), text, &format!("qrcode-rust {text:?}"));

        let kennytm = qrcode_kennytm::QrCode::new(text).unwrap();
        let svg = kennytm
            .render::<qrcode_kennytm::render::svg::Color>()
            .build();
        assert_decodes(&svg, text, &format!("kennytm {text:?}"));
    }
}

/// 单字符输入（含非 ASCII）曾报告过失败，此处固定其行为。
#[test]
fn single_character_inputs_decode() {
    for text in ["A", "1", "a", "!", "@", " ", "中", "😀"] {
        let mut rust = qrcode_rust::QRCode::new();
        rust.make_code(text);
        assert_decodes(
            &rust.get_svg(),
            text,
            &format!("qrcode-rust 单字符 {text:?}"),
        );

        let mut fast = qrcode_fast::QRCode::new();
        fast.make_code(text);
        assert_decodes(
            &fast.get_svg(),
            text,
            &format!("qrcode-fast 单字符 {text:?}"),
        );
    }
}

// ============================================================
// 2. 长度覆盖：两个 Rust 实现都必须达到 QR 标准上限
// ============================================================

/// 覆盖各纠错级别与各版本区间的代表性长度。
///
/// 特别包含历史上失败的区间：
///   - 14 字节（qrcode-fast 因头部重复计入而选错版本）
///   - 57~119 字节（qrcode-rust 因 take(10) 与缺失版本信息而失败）
///   - 120~1273 字节（两个包曾完全无法覆盖）
#[test]
fn both_implementations_cover_full_length_range() {
    let lengths = [1, 7, 14, 30, 57, 62, 87, 119, 120, 137, 200, 445, 800, 1273];

    for len in lengths {
        let text: String = "A".repeat(len);

        let mut fast = qrcode_fast::QRCode::new();
        fast.make_code(&text);
        assert_decodes(&fast.get_svg(), &text, &format!("qrcode-fast {len} 字节"));

        let mut rust = qrcode_rust::QRCode::new();
        rust.make_code(&text);
        assert_decodes(&rust.get_svg(), &text, &format!("qrcode-rust {len} 字节"));
    }
}

/// 超出全部 40 个版本容量时不应产出二维码，而应被拒绝或明确失败。
///
/// 此处只断言「不崩溃」：超限行为由各自实现决定（返回空串或产出不可解码的码）。
#[test]
fn oversized_input_does_not_panic() {
    let text: String = "A".repeat(5000);

    let mut fast = qrcode_fast::QRCode::new();
    fast.make_code(&text);
    let _ = fast.get_svg();

    let mut rust = qrcode_rust::QRCode::new();
    rust.make_code(&text);
    let _ = rust.get_svg();
}

// ============================================================
// 3. 实例复用：历史上 qrcode-rust 在此静默产出坏码
// ============================================================

/// 复用同一实例、由短到长连续编码，每一步都必须可解码。
///
/// 缺陷根因：`make_impl` 仅在 `type_number == 0` 时计算版本号，
/// 复用时会沿用旧的小版本号，导致后续输出完全无法解码。
#[test]
fn instance_reuse_across_increasing_lengths() {
    let texts = [
        "short",
        "a-much-longer-text-that-needs-a-bigger-version-number",
        "https://example.com/products/2026/spring?utm_source=newsletter&utm_medium=email",
    ];

    let mut rust = qrcode_rust::QRCode::new();
    for text in texts {
        rust.make_code(text);
        assert_decodes(&rust.get_svg(), text, &format!("qrcode-rust 复用 {text:?}"));
    }

    let mut fast = qrcode_fast::QRCode::new();
    for text in texts {
        fast.make_code(text);
        assert_decodes(&fast.get_svg(), text, &format!("qrcode-fast 复用 {text:?}"));
    }
}

/// 复用实例时由长到短同样必须正确。
#[test]
fn instance_reuse_across_decreasing_lengths() {
    let texts = [
        "https://example.com/products/2026/spring?utm_source=newsletter&utm_medium=email",
        "medium length text",
        "short",
    ];

    let mut rust = qrcode_rust::QRCode::new();
    for text in texts {
        rust.make_code(text);
        assert_decodes(
            &rust.get_svg(),
            text,
            &format!("qrcode-rust 递减复用 {text:?}"),
        );
    }
}

// ============================================================
// 4. 真实场景与非 ASCII
// ============================================================

#[test]
fn real_world_payloads_decode() {
    let cases = [
        ("短链接", "https://a.co/x"),
        (
            "带参数营销链接",
            "https://example.com/products/2026/spring?utm_source=newsletter",
        ),
        (
            "中文",
            "这是一段中文内容，用于验证二维码在中文下的表现是否正常",
        ),
        (
            "vCard",
            "BEGIN:VCARD\nVERSION:3.0\nFN:张三\nTEL:+8613800138000\nEND:VCARD",
        ),
        ("emoji", "Hello 👋 世界 🌏 QRCode ✅"),
        ("JSON", r#"{"id":12345,"name":"测试","active":true}"#),
    ];

    for (label, text) in cases {
        let mut rust = qrcode_rust::QRCode::new();
        rust.make_code(text);
        assert_decodes(&rust.get_svg(), text, &format!("qrcode-rust {label}"));

        let mut fast = qrcode_fast::QRCode::new();
        fast.make_code(text);
        assert_decodes(&fast.get_svg(), text, &format!("qrcode-fast {label}"));
    }
}

// ============================================================
// 5. 纠错级别：四个级别都必须可解码
// ============================================================

#[test]
fn all_error_correction_levels_decode() {
    use qrcode_rust::{QRCodeOptions, QRErrorCorrectLevel};

    let text = "https://github.com/veaba/qrcodes";

    for level in [
        QRErrorCorrectLevel::L,
        QRErrorCorrectLevel::M,
        QRErrorCorrectLevel::Q,
        QRErrorCorrectLevel::H,
    ] {
        let options = QRCodeOptions {
            correct_level: level,
            ..Default::default()
        };

        let mut qr = qrcode_rust::QRCode::with_options(options);
        qr.make_code(text);
        assert_decodes(&qr.get_svg(), text, &format!("qrcode-rust {level:?}"));
    }
}

// ============================================================
// 6. 版本选择必须与 QR 标准容量一致
// ============================================================

/// 版本选择结果必须与完整版 `get_type_number` 完全一致，
/// 且不得低于 `take(10)` 时代的旧上限。
#[test]
fn version_selection_matches_full_implementation() {
    use qrcode_fast::QRErrorCorrectLevel;

    for level in [
        QRErrorCorrectLevel::L,
        QRErrorCorrectLevel::M,
        QRErrorCorrectLevel::Q,
        QRErrorCorrectLevel::H,
    ] {
        for len in [1usize, 7, 14, 57, 119, 120, 500, 1273] {
            let text = "A".repeat(len);
            let full = qrcode_rust::get_type_number(&text, level);
            let fast = qrcode_fast::get_min_version(len, level);
            assert_eq!(
                fast, full,
                "len={len} {level:?}: get_min_version={fast} 与 get_type_number={full} 不一致"
            );
        }
    }
}

// ============================================================
// 7. 解码器自身有效性（防止测试空转）
// ============================================================

/// 用错误内容校验时必须失败 —— 证明解码器真的在比对内容，
/// 而不是恒定返回 Ok 让测试变成空转。
#[test]
fn decoder_actually_verifies_content() {
    let text = "https://github.com/veaba/qrcodes";
    let mut qr = qrcode_rust::QRCode::new();
    qr.make_code(text);
    let svg = qr.get_svg();

    assert!(validate_qr_code(&svg, text).is_ok(), "正确内容应当通过");
    assert!(
        validate_qr_code(&svg, "this is definitely not the content").is_err(),
        "错误内容必须被拒绝，否则解码校验形同虚设"
    );
}

/// kennytm 参考实现作为对照基准，全程可解码。
#[test]
fn kennytm_reference_decodes_across_lengths() {
    for len in [1usize, 10, 60, 120, 200, 500] {
        let text: String = "A".repeat(len);
        let qr = qrcode_kennytm::QrCode::new(&text).unwrap();
        let svg = qr.render::<qrcode_kennytm::render::svg::Color>().build();
        assert_decodes(&svg, &text, &format!("kennytm {len} 字节"));
    }
}

// ============================================================
// 8. 落盘 SVG 的回归（由 validate-svg-dir 扫描同一目录）
//
// 背景：五方对比会把 SVG 落盘到 docs/public/bench/svg/ 供人工扫码。
// 该目录已在 .gitignore 中，因此这里**不**假设它存在 —— 不存在就跳过，
// 保证干净 clone 上测试仍然通过。
//
// 已确证并修复的缺陷（2026-03-20 由 validate-svg-dir 首次发现，独立解码器确认）：
//   1. @veaba/qrcode-bun 的 setup_type_number 为空实现 → v7+ 缺版本信息，DataEcc 失败。
//   2. qrcode-js-shared 与 qrcode-bun 的 PATTERN_POSITION_TABLE 从 v22 起整体错位一行
//      （多了一条重复的 v22 行）→ v22+ 对齐图案位置错误。
// 修复后五方全部用例均可解码，本测试**不再豁免任何实现**。
// ============================================================

/// 落盘目录路径（不存在时返回 None，调用方据此跳过）。
fn persisted_dir() -> Option<std::path::PathBuf> {
    let mut dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    dir.pop();
    dir.pop();
    dir.push("docs/public/bench/svg");
    dir.is_dir().then_some(dir)
}

/// 读取落盘目录中的一个 SVG（不存在则返回 None）。
fn read_persisted(dir: &std::path::Path, prefix: &str, case: &str) -> Option<String> {
    let p = dir.join(format!("{prefix}_{case}_0.svg"));
    std::fs::read_to_string(p).ok()
}

const FIVE_CASES: [(&str, &str); 3] = [
    ("short", "hello world"),
    ("url", "https://qrcodes.veaba.me/"),
    (
        "long",
        "多引擎 QRCodes，高性能 QRCode 库，支持 WASM、Node.js、Bun 和 Rust 的多运行时 QRCode 解决方案",
    ),
];

/// 五方 + 全部三个用例的落盘 SVG 都必须可解码。
///
/// 这是本仓库历史上最容易失守的不变量：性能数据看着正常，
/// 产物却扫不出来。任何实现回归都会在此失败。
#[test]
fn persisted_svgs_all_decode() {
    let Some(dir) = persisted_dir() else {
        eprintln!("跳过：docs/public/bench/svg 不存在（需先跑五方基准并 --save-svg）");
        return;
    };

    let mut checked = 0usize;
    for prefix in ["fast", "rust", "kennytm", "node", "bun"] {
        for (case, text) in FIVE_CASES {
            if let Some(svg) = read_persisted(&dir, prefix, case) {
                assert_decodes(&svg, text, &format!("落盘 {prefix}_{case}"));
                checked += 1;
            }
        }
    }

    // 目录存在却一个都没读到，说明命名约定变了 —— 不能静默通过。
    assert!(
        checked > 0,
        "落盘目录存在但未匹配到任何 SVG，命名约定可能已变更"
    );
}
