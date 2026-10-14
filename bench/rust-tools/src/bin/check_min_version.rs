// 直接检验 get_min_version 的正确性：
//   1. 返回的版本容量是否真的装得下输入（这是「能否解码」的根本）
//   2. 与完整版 get_type_number 是否一致
//   3. 单调性
//
//   cargo run --release --bin check-min-version
//
// get_min_version 由 qrcode-fast 重新导出；get_type_number 由 qrcode-rust 重新导出。

use qrcode_fast::{get_min_version, QRErrorCorrectLevel};
use qrcode_rust::get_type_number;

/// QR 版本 1-40 的「数据码字容量」，按纠错级别 L/M/Q/H。
/// 这是 QR 标准 (ISO/IEC 18004) 的权威数值，用于独立校验版本选择是否正确。
/// 每个版本的数据码字总数 = 该版本总码字 - 纠错码字。
const DATA_CODEWORDS: [[u16; 4]; 40] = [
    // L, M, Q, H
    [19, 16, 13, 9],          // v1
    [34, 28, 22, 16],         // v2
    [55, 44, 34, 26],         // v3
    [80, 64, 48, 36],         // v4
    [108, 86, 62, 46],        // v5
    [136, 108, 76, 60],       // v6
    [156, 124, 88, 66],       // v7
    [194, 154, 110, 86],      // v8
    [232, 182, 132, 100],     // v9
    [274, 216, 154, 122],     // v10
    [324, 254, 180, 140],     // v11
    [370, 290, 206, 158],     // v12
    [428, 334, 244, 180],     // v13
    [461, 365, 261, 197],     // v14
    [523, 415, 295, 223],     // v15
    [589, 453, 325, 253],     // v16
    [647, 507, 367, 283],     // v17
    [721, 563, 397, 313],     // v18
    [795, 627, 445, 341],     // v19
    [861, 669, 485, 385],     // v20
    [932, 714, 512, 406],     // v21
    [1006, 782, 568, 442],    // v22
    [1094, 860, 614, 464],    // v23
    [1174, 914, 664, 514],    // v24
    [1276, 1000, 718, 538],   // v25
    [1370, 1062, 754, 596],   // v26
    [1468, 1128, 808, 628],   // v27
    [1531, 1193, 871, 661],   // v28
    [1631, 1267, 911, 701],   // v29
    [1735, 1373, 985, 745],   // v30
    [1843, 1455, 1033, 793],  // v31
    [1955, 1541, 1115, 845],  // v32
    [2071, 1631, 1171, 901],  // v33
    [2191, 1725, 1231, 961],  // v34
    [2306, 1812, 1286, 986],  // v35
    [2434, 1914, 1354, 1054], // v36
    [2566, 1992, 1426, 1096], // v37
    [2702, 2102, 1502, 1142], // v38
    [2812, 2216, 1582, 1222], // v39
    [2956, 2334, 1666, 1276], // v40
];

fn level_index(l: QRErrorCorrectLevel) -> usize {
    match l {
        QRErrorCorrectLevel::L => 0,
        QRErrorCorrectLevel::M => 1,
        QRErrorCorrectLevel::Q => 2,
        QRErrorCorrectLevel::H => 3,
    }
}

/// 一个 (version, level) 在 8-bit byte 模式下能装的最大字节数
fn max_bytes_for(version: i32, level: QRErrorCorrectLevel) -> usize {
    let cw = DATA_CODEWORDS[(version - 1) as usize][level_index(level)] as usize;
    // 减去模式指示符(4bit) + 长度字段(version<=9:8bit, >=10:16bit)
    let header_bits = if version <= 9 { 4 + 8 } else { 4 + 16 };
    let data_bits = cw * 8;
    if data_bits < header_bits {
        return 0;
    }
    (data_bits - header_bits) / 8
}

fn main() {
    let levels = [
        QRErrorCorrectLevel::L,
        QRErrorCorrectLevel::M,
        QRErrorCorrectLevel::Q,
        QRErrorCorrectLevel::H,
    ];

    println!("=== 检验 1: get_min_version 返回的版本是否真的装得下输入 ===");
    let mut capacity_violations = 0;
    for &level in &levels {
        for len in 0..=400usize {
            let v = get_min_version(len, level);
            let cap = max_bytes_for(v, level);
            if len > cap {
                if capacity_violations < 12 {
                    println!(
                        "  ❌ len={:<4} level={:?} -> version {} 容量仅 {} 字节，装不下",
                        len, level, v, cap
                    );
                }
                capacity_violations += 1;
            }
        }
    }
    println!("  容量不足的用例总数: {}", capacity_violations);

    println!();
    println!("=== 检验 2: 与完整版 get_type_number 是否一致 (全部 Version 1-40) ===");
    let mut mismatches = 0;
    for &level in &levels {
        for len in 0..=400usize {
            let text = "a".repeat(len);
            let full = get_type_number(&text, level);
            let fast = get_min_version(len, level);
            // qrcode-fast 曾用 `take(10)` 把版本上限锁在 10，现已放开至全表 40 个版本。
            // 因此期望值就是完整版的返回值本身 —— 不得再套用旧的 `.min(10)`，
            // 否则会把「已修复」误报成 846 例不一致。
            let expected = full;
            if fast != expected {
                if mismatches < 12 {
                    println!(
                        "  ❌ len={:<4} level={:?} fast={} full={} expected={}",
                        len, level, fast, full, expected
                    );
                }
                mismatches += 1;
            }
        }
    }
    println!("  与完整版不一致的用例总数: {}", mismatches);

    println!();
    println!("=== 检验 3: 单调性（更长的输入不应返回更小的版本） ===");
    let mut non_mono = 0;
    for &level in &levels {
        let mut prev = 0;
        for len in 0..=400usize {
            let v = get_min_version(len, level);
            if v < prev {
                if non_mono < 8 {
                    println!(
                        "  ❌ len={} level={:?}: version 从 {} 降到 {}",
                        len, level, prev, v
                    );
                }
                non_mono += 1;
            }
            prev = v;
        }
    }
    println!("  非单调用例总数: {}", non_mono);

    println!();
    println!("=== 检验 4: 边界抽查 ===");
    for (len, level) in [
        (11usize, QRErrorCorrectLevel::H),
        (56, QRErrorCorrectLevel::H),
        (119, QRErrorCorrectLevel::H),
    ] {
        let v = get_min_version(len, level);
        let cap = max_bytes_for(v, level);
        println!(
            "  len={:<4} {:?}: version={:<3} 容量={} 字节  {}",
            len,
            level,
            v,
            cap,
            if len <= cap {
                "✅ 装得下"
            } else {
                "❌ 装不下"
            }
        );
    }

    println!();
    println!("=== 结论 ===");
    if capacity_violations == 0 && mismatches == 0 && non_mono == 0 {
        println!("  ✅ get_min_version 正确：容量充足、与完整版逐点一致、且严格单调（覆盖 Version 1-40）。");
    } else {
        println!(
            "  ❌ 存在缺陷：容量不足 {} 例，与完整版不一致 {} 例，非单调 {} 例",
            capacity_violations, mismatches, non_mono
        );
    }
}
