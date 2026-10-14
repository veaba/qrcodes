// 权威校验：把仓库的 QR_CODE_LIMIT_LENGTH 与 QR 标准（ISO/IEC 18004）
// byte 模式容量表逐项比对，确认该表存的是**最终可用字节数**（已扣除模式
// 指示符与长度字段），而不是还带着头部的原始容量。
//
//   cargo run --release --bin verify-capacity-table
//
// 判定方式：对每个 (版本, 级别) 做**正向断言**，而不是反推边界：
//
//   cap = 标准容量(v, lvl)
//   get_min_version(cap,     lvl) == v         // 正好装得下 -> 仍是该版本
//   get_min_version(cap + 1, lvl) == v + 1     // 多 1 字节 -> 必须升版（v<40）
//
// 为什么不反推：`get_min_version` 对超出全部 40 个版本的输入**钳位返回 40**，
// 所以 v40 的边界无法通过「找最后一个返回 40 的长度」反推出来 —— 那样得到
// 的是扫描上界，而不是容量。正向断言对 v1…v39 的 156 项精确成立。
//
// 覆盖边界（诚实说明）：
//   - 断言 0 校验工具内的标准表（160 项，含 v40）能否由 ISO 数据码字数推算。
//   - 断言 1/2 校验实现的边界行为。其中 v40 的**容量数值**不可观测：v40 是
//     最大版本，其上限值改大改小都不改变任何长度所选的版本，产物也照常可解码。
//     因此本工具不对实现表的 v40 行作断言；改用 scripts/check-rs-blocks.js
//     与 tests/qr_validity.rs 覆盖该版本的实际编码正确性。
//
// 退出码：0 = 全部一致；1 = 存在不一致。

/// QR 标准 byte 模式容量，版本 1-40，列序 L,M,Q,H。
/// 来源：ISO/IEC 18004 / Thonky QR Tutorial "Character Capacities" 附录。
const STANDARD_BYTE_CAPACITY: [[u16; 4]; 40] = [
    [17, 14, 11, 7],
    [32, 26, 20, 14],
    [53, 42, 32, 24],
    [78, 62, 46, 34],
    [106, 84, 60, 44],
    [134, 106, 74, 58],
    [154, 122, 86, 64],
    [192, 152, 108, 84],
    [230, 180, 130, 98],
    [271, 213, 151, 119],
    [321, 251, 177, 137],
    [367, 287, 203, 155],
    [425, 331, 241, 177],
    [458, 362, 258, 194],
    [520, 412, 292, 220],
    [586, 450, 322, 250],
    [644, 504, 364, 280],
    [718, 560, 394, 310],
    [792, 624, 442, 338],
    [858, 666, 482, 382],
    [929, 711, 509, 403],
    [1003, 779, 565, 439],
    [1091, 857, 611, 461],
    [1171, 911, 661, 511],
    [1273, 997, 715, 535],
    [1367, 1059, 751, 593],
    [1465, 1125, 805, 625],
    [1528, 1190, 868, 658],
    [1628, 1264, 908, 698],
    [1732, 1370, 982, 742],
    [1840, 1452, 1030, 790],
    [1952, 1538, 1112, 842],
    [2068, 1628, 1168, 898],
    [2188, 1722, 1228, 958],
    [2303, 1809, 1283, 983],
    [2431, 1911, 1351, 1051],
    [2563, 1989, 1423, 1093],
    [2699, 2099, 1499, 1139],
    [2809, 2213, 1579, 1219],
    [2953, 2331, 1663, 1273],
];

/// QR 版本 1-40 的**数据码字**总数（已扣除纠错码字），列序 L,M,Q,H。
/// 来源：ISO/IEC 18004；与 `check_min_version.rs` 中的同名列一致。
///
/// 用途：独立推算 byte 模式容量，作为容量表的第二个事实来源。
const DATA_CODEWORDS: [[u16; 4]; 40] = [
    // L, M, Q, H
    [19, 16, 13, 9],
    [34, 28, 22, 16],
    [55, 44, 34, 26],
    [80, 64, 48, 36],
    [108, 86, 62, 46],
    [136, 108, 76, 60],
    [156, 124, 88, 66],
    [194, 154, 110, 86],
    [232, 182, 132, 100],
    [274, 216, 154, 122],
    [324, 254, 180, 140],
    [370, 290, 206, 158],
    [428, 334, 244, 180],
    [461, 365, 261, 197],
    [523, 415, 295, 223],
    [589, 453, 325, 253],
    [647, 507, 367, 283],
    [721, 563, 397, 313],
    [795, 627, 445, 341],
    [861, 669, 485, 385],
    [932, 714, 512, 406],
    [1006, 782, 568, 442],
    [1094, 860, 614, 464],
    [1174, 914, 664, 514],
    [1276, 1000, 718, 538],
    [1370, 1062, 754, 596],
    [1468, 1128, 808, 628],
    [1531, 1193, 871, 661],
    [1631, 1267, 911, 701],
    [1735, 1373, 985, 745],
    [1843, 1455, 1033, 793],
    [1955, 1541, 1115, 845],
    [2071, 1631, 1171, 901],
    [2191, 1725, 1231, 961],
    [2306, 1812, 1286, 986],
    [2434, 1914, 1354, 1054],
    [2566, 1992, 1426, 1096],
    [2702, 2102, 1502, 1142],
    [2812, 2216, 1582, 1222],
    [2956, 2334, 1666, 1276],
];

/// 断言 0：标准容量表自身必须能由数据码字数独立推算出来。
///
/// cap = (数据码字数 × 8 − 头部位数) / 8，头部 = 4bit 模式指示符 + 长度字段
/// （v ≤ 9 为 8bit，v ≥ 10 为 16bit），向下取整。
///
/// 这一条不读取实现，只校验**工具内的标准表**是否为真正的 ISO 数值，
/// 防止「标准表本身录错」导致断言 1/2 拿错误基准去比对（那样会一起通过或一起报错）。
///
/// 注意它**不能**校验实现表 `QR_CODE_LIMIT_LENGTH` 的 v40 行：`get_min_version`
/// 对超出全部版本的输入钳位返回 40，因此 v40 既是「正好 v40」也是「溢出兜底」，
/// 两种语义在返回值上不可区分 —— v40 行的容量值属于纯表数据，不参与版本选择，
/// 也无法通过解码行为观测。详见文件头的说明。
fn check_standard_table_self_consistent(data_codewords: &[[u16; 4]; 40]) -> usize {
    let mut bad = 0usize;
    for v in 1..=40usize {
        let header_bits: usize = if v <= 9 { 4 + 8 } else { 4 + 16 };
        for li in 0..4 {
            let bits = data_codewords[v - 1][li] as usize * 8;
            let derived = bits.saturating_sub(header_bits) / 8;
            let listed = STANDARD_BYTE_CAPACITY[v - 1][li] as usize;
            if derived != listed {
                if bad < 12 {
                    println!(
                        "  ❌ v{v:<2} {}: 推算容量={derived:<4} 表列值={listed}（数据码字 {}）",
                        ["L", "M", "Q", "H"][li],
                        data_codewords[v - 1][li]
                    );
                }
                bad += 1;
            }
        }
    }
    bad
}

fn main() {
    let levels = [
        ("L", qrcode_fast::QRErrorCorrectLevel::L),
        ("M", qrcode_fast::QRErrorCorrectLevel::M),
        ("Q", qrcode_fast::QRErrorCorrectLevel::Q),
        ("H", qrcode_fast::QRErrorCorrectLevel::H),
    ];

    println!("=== QR 标准 byte 模式容量表 vs get_min_version 正向断言 ===");
    println!("（cap 装得下 -> 仍是该版本；cap+1 装不下 -> 必须升版）");
    println!();

    // ---- 断言 0：标准表自身可由数据码字数推算（覆盖全部 40 版本，含 v40）----
    println!("[断言 0] 标准容量表 vs 数据码字数推算（独立于实现，覆盖 v1-v40）");
    let table_bad = check_standard_table_self_consistent(&DATA_CODEWORDS);
    if table_bad == 0 {
        println!("  ✅ 160 项均可由 ISO 数据码字数推算得到");
    } else {
        println!("  ❌ {table_bad} / 160 项推算不一致");
    }
    println!();

    // ---- 断言 1/2：实现（get_min_version）与标准表的边界行为一致 ----
    println!("[断言 1/2] get_min_version 在容量边界与越界处的版本选择");
    let mut checked = 0usize;
    let mut mismatches = 0usize;

    for v in 1..=40usize {
        let std_row = STANDARD_BYTE_CAPACITY[v - 1];
        for (li, (lvl_name, level)) in levels.iter().enumerate() {
            let cap = std_row[li] as usize;
            checked += 1;

            // 断言 1：容量边界处仍应选中本版本
            let at_cap = qrcode_fast::get_min_version(cap, *level);
            if at_cap != v as i32 {
                report(mismatches, v, lvl_name, cap, v as i32, at_cap, "边界处");
                mismatches += 1;
                continue;
            }

            // 断言 2：多 1 字节必须升版（v40 无更高版本，故由上一条断言 0 兜底）
            if v < 40 {
                let over = qrcode_fast::get_min_version(cap + 1, *level);
                if over != (v + 1) as i32 {
                    report(
                        mismatches,
                        v,
                        lvl_name,
                        cap + 1,
                        (v + 1) as i32,
                        over,
                        "越界处",
                    );
                    mismatches += 1;
                }
            }
        }
    }
    if mismatches == 0 {
        println!("  ✅ {checked} 项边界行为正确（v40 容量数值不可观测，见文件头说明）");
    }

    println!();
    let total_bad = table_bad + mismatches;
    if total_bad == 0 {
        println!("✅ 全部 {checked} 项与 QR 标准一致，且边界行为正确");
        std::process::exit(0);
    }
    println!("❌ 共 {total_bad} 项不合格（标准表推算 {table_bad} 项，边界行为 {mismatches} 项）");
    println!("   （容量表应存放「已扣除模式指示符与长度字段」的最终可用字节数）");
    std::process::exit(1);
}

/// 只打印前若干条，避免刷屏；`shown` 为已累计的不一致数量，计数本身不受影响。
fn report(
    shown: usize,
    version: usize,
    level: &str,
    len: usize,
    expected_version: i32,
    actual_version: i32,
    where_: &str,
) {
    if shown < 12 {
        println!(
            "  ❌ v{version:<2} {level}: {where_} len={len:<4} 期望版本={expected_version:<3} 实际={actual_version}"
        );
    }
}
