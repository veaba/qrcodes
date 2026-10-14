//! QR Code Model - Shared constants and types

/// QR Code 模式
pub struct QRMode;

impl QRMode {
    pub const MODE_NUMBER: i32 = 1;
    pub const MODE_ALPHA_NUM: i32 = 2;
    pub const MODE_8BIT_BYTE: i32 = 4;
    pub const MODE_KANJI: i32 = 8;
}

/// 错误纠正级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum QRErrorCorrectLevel {
    L = 1, // 低 (~7%)
    M = 0, // 中 (~15%)
    Q = 3, // 高 (~25%)
    #[default]
    H = 2, // 最高 (~30%)
}

/// 位置调整图案位置表 (完整 40 版本)
pub const PATTERN_POSITION_TABLE: &[[i32; 7]] = &[
    [0, 0, 0, 0, 0, 0, 0],
    [6, 18, 0, 0, 0, 0, 0],
    [6, 22, 0, 0, 0, 0, 0],
    [6, 26, 0, 0, 0, 0, 0],
    [6, 30, 0, 0, 0, 0, 0],
    [6, 34, 0, 0, 0, 0, 0],
    [6, 22, 38, 0, 0, 0, 0],
    [6, 24, 42, 0, 0, 0, 0],
    [6, 26, 46, 0, 0, 0, 0],
    [6, 28, 50, 0, 0, 0, 0],
    [6, 30, 54, 0, 0, 0, 0],
    [6, 32, 58, 0, 0, 0, 0],
    [6, 34, 62, 0, 0, 0, 0],
    [6, 26, 46, 66, 0, 0, 0],
    [6, 26, 48, 70, 0, 0, 0],
    [6, 26, 50, 74, 0, 0, 0],
    [6, 30, 54, 78, 0, 0, 0],
    [6, 30, 56, 82, 0, 0, 0],
    [6, 30, 58, 86, 0, 0, 0],
    [6, 34, 62, 90, 0, 0, 0],
    [6, 28, 50, 72, 94, 0, 0],
    [6, 26, 50, 74, 98, 0, 0],
    [6, 30, 54, 78, 102, 0, 0],
    [6, 28, 54, 80, 106, 0, 0],
    [6, 32, 58, 84, 110, 0, 0],
    [6, 30, 58, 86, 114, 0, 0],
    [6, 34, 62, 90, 118, 0, 0],
    [6, 26, 50, 74, 98, 122, 0],
    [6, 30, 54, 78, 102, 126, 0],
    [6, 26, 52, 78, 104, 130, 0],
    [6, 30, 56, 82, 108, 134, 0],
    [6, 34, 60, 86, 112, 138, 0],
    [6, 30, 58, 86, 114, 142, 0],
    [6, 34, 62, 90, 118, 146, 0],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
];

/// 完整容量表 (40 版本 x 4 纠错级别)
pub const QR_CODE_LIMIT_LENGTH: &[[i32; 4]] = &[
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

/// 获取类型号 (完整版本，支持 40 个版本)
///
/// `QR_CODE_LIMIT_LENGTH` 存放的是**最终可用字节数**（已扣除模式指示符与长度字段），
/// 与 QR 标准 (ISO/IEC 18004) byte 模式容量表逐项一致，因此直接与文本长度比较即可。
/// 早期实现额外加了 2 字节头部，导致每个版本边界都比标准保守 2 字节。
pub fn get_type_number(text: &str, correct_level: QRErrorCorrectLevel) -> i32 {
    let length = text.len();
    let level_map = [1, 0, 3, 2];
    let level_index = level_map[correct_level as usize];

    for (i, limits) in QR_CODE_LIMIT_LENGTH.iter().enumerate() {
        let limit = limits[level_index as usize];
        if length as i32 <= limit {
            return (i + 1) as i32;
        }
    }
    40 // 最大版本号
}

/// 快速版本：获取最小版本号 (支持全部 1-40 版本，用于 qrcode-fast)
///
/// 语义与 [`get_type_number`] 完全一致，等价于 `get_type_number(text, level)`。
///
/// 历史上此函数有两处缺陷，均已修复：
///   1. 曾用 `take(10)` 把版本上限锁在 Version 10，导致超过 v10 容量的输入
///      （例如 H 级下 >119 字节）会选到容量不足的版本，生成无法解码的二维码；
///   2. 曾把「模式指示符 + 长度字段」的 2 字节重复计入，使每个版本边界
///      比 QR 标准保守 2 字节（`QR_CODE_LIMIT_LENGTH` 已扣除此头部）。
pub fn get_min_version(text_len: usize, level: QRErrorCorrectLevel) -> i32 {
    let level_idx = match level {
        QRErrorCorrectLevel::L => 0,
        QRErrorCorrectLevel::M => 1,
        QRErrorCorrectLevel::Q => 2,
        QRErrorCorrectLevel::H => 3,
    };

    for (i, limits) in QR_CODE_LIMIT_LENGTH.iter().enumerate() {
        if text_len as i32 <= limits[level_idx] {
            return (i + 1) as i32;
        }
    }
    40 // 最大版本号
}

/// 获取位置调整图案位置
pub fn get_pattern_position(type_number: i32) -> Vec<i32> {
    let pos = &PATTERN_POSITION_TABLE[(type_number - 1) as usize];
    pos.iter().copied().filter(|&x| x > 0).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_correct_level_values() {
        assert_eq!(QRErrorCorrectLevel::L as i32, 1);
        assert_eq!(QRErrorCorrectLevel::M as i32, 0);
        assert_eq!(QRErrorCorrectLevel::Q as i32, 3);
        assert_eq!(QRErrorCorrectLevel::H as i32, 2);
    }

    #[test]
    fn test_get_type_number_basic() {
        // "Hello" (5 chars) with H level should fit in version 1
        let version = get_type_number("Hello", QRErrorCorrectLevel::H);
        assert!((1..=40).contains(&version));
    }

    #[test]
    fn test_get_min_version_fast() {
        // Short text should fit in version 1-2
        let v = get_min_version(5, QRErrorCorrectLevel::H);
        assert!((1..=40).contains(&v));
    }

    /// 回归测试：get_min_version 曾因 off-by-one（返回数组索引而非版本号）
    /// 且未预留 2 字节头部，导致长文本选小版本、容量不足、二维码无法解码。
    ///
    /// 另：该函数曾用 `take(10)` 把上限锁在 Version 10，导致 H 级下 >119 字节
    /// 无法生成可解码的二维码。现已放开至全表 40 个版本。
    #[test]
    fn test_get_min_version_matches_full_version() {
        // fast 版必须与完整版 get_type_number 在所有长度上完全一致
        for len in 0..=3000usize {
            for level in [
                QRErrorCorrectLevel::L,
                QRErrorCorrectLevel::M,
                QRErrorCorrectLevel::Q,
                QRErrorCorrectLevel::H,
            ] {
                let text = "a".repeat(len);
                let full = get_type_number(&text, level);
                let fast = get_min_version(len, level);

                assert_eq!(
                    fast, full,
                    "len={len} level={level:?}: fast={fast} full={full}"
                );
            }
        }
    }

    /// 回归测试：确保各版本容量边界处的版本选择正确。
    ///
    /// 容量表存放的是最终可用字节数（已扣除头部），因此 `len == limit` 应仍
    /// 停留在该版本，`len == limit + 1` 才升级。曾错误地额外加 2 字节头部。
    #[test]
    fn test_get_min_version_capacity_boundaries() {
        // QR v1-M 容量 = 14 字节（标准值）
        assert_eq!(get_min_version(14, QRErrorCorrectLevel::M), 1);
        assert_eq!(get_min_version(15, QRErrorCorrectLevel::M), 2);

        // v1-H 容量 = 7
        assert_eq!(get_min_version(7, QRErrorCorrectLevel::H), 1);
        assert_eq!(get_min_version(8, QRErrorCorrectLevel::H), 2);

        // 32 字符（"https://github.com/veaba/qrcodes"）
        let v32 = get_min_version(32, QRErrorCorrectLevel::M);
        assert!(v32 >= 2, "32 字节需要至少 Version 2, 实得 {v32}");

        // 71 字符
        let v71 = get_min_version(71, QRErrorCorrectLevel::M);
        assert!(v71 >= 4, "71 字节需要至少 Version 4, 实得 {v71}");

        // 超出全部 40 个版本容量时应返回上限 40
        assert_eq!(get_min_version(5000, QRErrorCorrectLevel::H), 40);
    }

    /// 回归测试：Version 10 上限导致的长度天花板。
    /// 曾出现 H 级下 120 字节即无法解码；放开后应精确对齐 QR 标准容量。
    #[test]
    fn test_get_min_version_covers_all_versions() {
        // QR 标准：v10-H 容量 = 119 字节，v11-H 容量 = 137 字节
        assert_eq!(get_min_version(119, QRErrorCorrectLevel::H), 10);
        assert_eq!(get_min_version(120, QRErrorCorrectLevel::H), 11);
        assert_eq!(get_min_version(137, QRErrorCorrectLevel::H), 11);
        assert_eq!(get_min_version(138, QRErrorCorrectLevel::H), 12);

        // 远超旧的 10 上限，应继续正常升版
        assert!(get_min_version(500, QRErrorCorrectLevel::H) > 10);
        assert!(get_min_version(1000, QRErrorCorrectLevel::L) > 10);

        // QR 标准：v40-L 容量 = 2953 字节
        assert_eq!(get_min_version(2953, QRErrorCorrectLevel::L), 40);
    }

    #[test]
    fn test_get_pattern_position() {
        let pos = get_pattern_position(2);
        assert_eq!(pos, vec![6, 18]);

        let pos = get_pattern_position(7);
        assert_eq!(pos, vec![6, 22, 38]);
    }
}
