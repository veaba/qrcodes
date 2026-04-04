/*!
 * QRCode 主类
 * 对应 JS 中的 QRCode
 */
use crate::qr_code_model::QRCodeModel;
use crate::qr_rs_block::QRErrorCorrectLevel;
use crate::utils::get_ansi_color_code;

/// QRCode 限制长度表
const QR_CODE_LIMIT_LENGTH: &[[i32; 4]] = &[
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

/// 获取类型编号
pub fn get_type_number(s_text: &str, n_correct_level: QRErrorCorrectLevel) -> i32 {
    let mut n_type = 1;
    let length = get_utf8_length(s_text);

    for item in QR_CODE_LIMIT_LENGTH.iter() {
        let n_limit = match n_correct_level {
            QRErrorCorrectLevel::L => item[0],
            QRErrorCorrectLevel::M => item[1],
            QRErrorCorrectLevel::Q => item[2],
            QRErrorCorrectLevel::H => item[3],
        };

        if length <= n_limit {
            break;
        } else {
            n_type += 1;
        }
    }

    if n_type > QR_CODE_LIMIT_LENGTH.len() as i32 {
        panic!("Too long data");
    }

    n_type
}

/// 获取 UTF-8 长度
fn get_utf8_length(s_text: &str) -> i32 {
    // 使用与 JS TextEncoder 一致的方式计算 UTF-8 字节长度
    // 不添加 BOM，与 qrcode-js-shared 保持一致
    s_text.len() as i32
}

/// QRCode 选项
#[derive(Debug, Clone)]
pub struct QRCodeOptions {
    #[allow(dead_code)]
    pub width: i32,
    #[allow(dead_code)]
    pub height: i32,
    #[allow(dead_code)]
    pub type_number: i32,
    pub color_dark: String,
    pub color_light: String,
    pub correct_level: QRErrorCorrectLevel,
    pub text: String,
}

impl Default for QRCodeOptions {
    fn default() -> Self {
        QRCodeOptions {
            width: 256,
            height: 256,
            type_number: 4,
            color_dark: "#000000".to_string(),
            color_light: "#ffffff".to_string(),
            correct_level: QRErrorCorrectLevel::H,
            text: String::new(),
        }
    }
}

/// QRCode 结构体
#[derive(Debug)]
pub struct QRCode {
    pub options: QRCodeOptions,
    pub model: Option<QRCodeModel>,
}

impl QRCode {
    /// 创建新的 QRCode
    pub fn new() -> Self {
        QRCode {
            options: QRCodeOptions::default(),
            model: None,
        }
    }

    /// 使用选项创建
    pub fn with_options(options: QRCodeOptions) -> Self {
        let mut qr = QRCode {
            options,
            model: None,
        };

        if !qr.options.text.is_empty() {
            qr.make_code(&qr.options.text.clone());
        }

        qr
    }

    /// 生成 QRCode
    pub fn make_code(&mut self, text: &str) {
        let type_number = get_type_number(text, self.options.correct_level);
        let mut model = QRCodeModel::new(type_number, self.options.correct_level);
        model.add_data(text);
        model.make();
        self.model = Some(model);
        self.options.text = text.to_string();
    }

    /// 获取模块数据
    pub fn get_modules(&self) -> Option<&Vec<Vec<Option<bool>>>> {
        self.model.as_ref().map(|m| &m.modules)
    }

    /// 获取模块数量
    pub fn get_module_count(&self) -> i32 {
        self.model.as_ref().map_or(0, |m| m.get_module_count())
    }

    /// 判断指定位置是否为深色
    pub fn is_dark(&self, row: i32, col: i32) -> bool {
        self.model.as_ref().is_some_and(|m| m.is_dark(row, col))
    }

    /// 将 QRCode 渲染为终端可显示的字符画
    pub fn to_terminal(&self, invert: bool, quiet_zone: i32) -> String {
        let dark_char = if invert { ' ' } else { '█' };
        let light_char = if invert { '█' } else { ' ' };
        let dark_module = dark_char.to_string().repeat(2);
        let light_module = light_char.to_string().repeat(2);

        let mut lines: Vec<String> = Vec::new();
        let count = self.get_module_count();
        let total_width = ((count + quiet_zone * 2) * 2) as usize;

        // 添加顶部静区
        for _ in 0..quiet_zone {
            lines.push(light_char.to_string().repeat(total_width));
        }

        // 渲染 QRCode 模块
        for row in 0..count {
            let mut line = light_char.to_string().repeat((quiet_zone * 2) as usize);
            for col in 0..count {
                if self.is_dark(row, col) {
                    line.push_str(&dark_module);
                } else {
                    line.push_str(&light_module);
                }
            }
            line.push_str(&light_char.to_string().repeat((quiet_zone * 2) as usize));
            lines.push(line);
        }

        // 添加底部静区
        for _ in 0..quiet_zone {
            lines.push(light_char.to_string().repeat(total_width));
        }

        lines.join("\n")
    }

    /// 使用 Braille 字符渲染更紧凑的终端二维码
    pub fn to_terminal_braille(&self) -> String {
        let braille_base = 0x2800;
        let mut result = String::new();
        let rows = self.get_module_count() as usize;
        let cols = rows;

        for y in (0..rows).step_by(4) {
            let mut line = String::new();
            for x in (0..cols).step_by(2) {
                let mut braille: u32 = 0;
                // 左列 4 个像素
                for dy in 0..4 {
                    if y + dy < rows && self.is_dark((y + dy) as i32, x as i32) {
                        braille |= 1 << dy;
                    }
                }
                // 右列 4 个像素
                for dy in 0..4 {
                    if y + dy < rows && x + 1 < cols && self.is_dark((y + dy) as i32, (x + 1) as i32) {
                        braille |= 1 << (4 + dy);
                    }
                }
                line.push(std::char::from_u32(braille_base + braille).unwrap_or(' '));
            }
            result.push_str(&line);
            result.push('\n');
        }

        result.trim_end().to_string()
    }

    /// 带颜色的终端输出（使用 ANSI 转义序列）
    pub fn to_terminal_color(&self, fg_color: &str, bg_color: &str) -> String {
        let fg_code = get_ansi_color_code(fg_color, false);
        let bg_code = get_ansi_color_code(bg_color, true);
        let reset = "\x1b[0m";

        let mut result = format!("{}{}", bg_code, fg_code);
        let count = self.get_module_count();

        for row in 0..count {
            for col in 0..count {
                if self.is_dark(row, col) {
                    result.push_str("██");
                } else {
                    result.push_str("  ");
                }
            }
            if row < count - 1 {
                result.push('\n');
            }
        }

        result.push_str(reset);
        result
    }
}

impl Default for QRCode {
    fn default() -> Self {
        Self::new()
    }
}
