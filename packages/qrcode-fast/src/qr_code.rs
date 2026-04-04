//! QR Code Fast Implementation
//!
//! 极致优化版本：
//! 1. 一维数组存储模块数据
//! 2. 预分配 SVG 字符串容量
//! 3. 使用内联数字转换避免 format! 开销
//! 4. 避免所有不必要的内存分配

use qrcode_rust_shared::{
    qr_8bit_byte::QR8bitByte,
    qr_bit_buffer::BitBuffer,
    qr_code_model::{get_min_version, QRErrorCorrectLevel},
    qr_polynomial::Polynomial,
    qr_rs_block::get_rs_blocks,
    qr_util::get_bch_digit,
};

/// QRCode 选项
#[derive(Clone)]
pub struct QRCodeOptions {
    pub color_dark: String,
    pub color_light: String,
    pub correct_level: QRErrorCorrectLevel,
}

impl Default for QRCodeOptions {
    fn default() -> Self {
        QRCodeOptions {
            color_dark: String::from("#000000"),
            color_light: String::from("#ffffff"),
            correct_level: QRErrorCorrectLevel::H,
        }
    }
}

/// QRCode 结构 - 极致性能版本
pub struct QRCode {
    pub options: QRCodeOptions,
    pub module_count: i32,
    pub type_number: i32,
    /// 一维数组：modules[row * module_count + col]
    /// 0 = 浅色/未设置, 1 = 深色, 2 = 已设置但浅色
    modules: Vec<u8>,
    data_list: Vec<QR8bitByte>,
}

impl QRCode {
    pub fn new() -> Self {
        QRCode {
            options: QRCodeOptions::default(),
            module_count: 0,
            type_number: 0,
            modules: Vec::new(),
            data_list: Vec::new(),
        }
    }

    /// 创建带选项的 QRCode
    pub fn with_options(correct_level: QRErrorCorrectLevel) -> Self {
        QRCode {
            options: QRCodeOptions {
                correct_level,
                ..Default::default()
            },
            module_count: 0,
            type_number: 0,
            modules: Vec::new(),
            data_list: Vec::new(),
        }
    }

    /// 生成 QRCode（完整实现）
    pub fn make_code(&mut self, text: &str) {
        self.data_list.clear();
        self.data_list.push(QR8bitByte::new(text));

        // 计算类型号
        self.type_number = get_min_version(text.len(), self.options.correct_level);
        self.module_count = self.type_number * 4 + 17;

        // 分配一维数组 (0 = 未设置/浅色, 1 = 深色)
        let count = self.module_count as usize;
        self.modules = vec![0u8; count * count];

        // 设置功能图案
        self.setup_position_probe_pattern(0, 0);
        self.setup_position_probe_pattern(self.module_count - 7, 0);
        self.setup_position_probe_pattern(0, self.module_count - 7);
        self.setup_position_adjust_pattern();
        self.setup_timing_pattern();
        self.setup_type_info(false);

        if self.type_number >= 7 {
            self.setup_type_number(false);
        }

        // 创建数据并映射
        let data = self.create_data();
        self.map_data(&data);
    }

    /// 绘制位置探测图案（三个角）
    fn setup_position_probe_pattern(&mut self, row: i32, col: i32) {
        for r in -1..=7 {
            if row + r <= -1 || self.module_count <= row + r {
                continue;
            }
            for c in -1..=7 {
                if col + c <= -1 || self.module_count <= col + c {
                    continue;
                }
                let is_dark = ((0..=6).contains(&r) && (c == 0 || c == 6))
                    || ((0..=6).contains(&c) && (r == 0 || r == 6))
                    || ((2..=4).contains(&r) && (2..=4).contains(&c));
                self.set_module(row + r, col + c, is_dark);
            }
        }
    }

    /// 设置位置调整图案
    fn setup_position_adjust_pattern(&mut self) {
        let pos = get_pattern_position(self.type_number);
        for i in 0..pos.len() {
            for j in 0..pos.len() {
                let row = pos[i];
                let col = pos[j];

                if row == 0 || col == 0 {
                    continue;
                }

                // 跳过与位置探测图案重叠的位置
                if row <= 8 && col <= 8 {
                    continue;
                }
                if row <= 8 && col >= self.module_count - 8 {
                    continue;
                }
                if row >= self.module_count - 8 && col <= 8 {
                    continue;
                }

                if self.is_module_set(row, col) {
                    continue;
                }

                for r in -2..=2 {
                    for c in -2..=2 {
                        let new_row = row + r;
                        let new_col = col + c;
                        if new_row < 0
                            || new_row >= self.module_count
                            || new_col < 0
                            || new_col >= self.module_count
                        {
                            continue;
                        }
                        let is_dark = r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0);
                        self.set_module(new_row, new_col, is_dark);
                    }
                }
            }
        }
    }

    /// 设置定时图案
    fn setup_timing_pattern(&mut self) {
        for r in 8..self.module_count - 8 {
            if !self.is_module_set(r, 6) {
                self.set_module(r, 6, r % 2 == 0);
            }
        }
        for c in 8..self.module_count - 8 {
            if !self.is_module_set(6, c) {
                self.set_module(6, c, c % 2 == 0);
            }
        }
    }

    /// 设置类型信息
    fn setup_type_info(&mut self, test: bool) {
        let g15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
        let g15_mask = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

        let mask_pattern = 0;
        let correct_level = match self.options.correct_level {
            QRErrorCorrectLevel::L => 1,
            QRErrorCorrectLevel::M => 0,
            QRErrorCorrectLevel::Q => 3,
            QRErrorCorrectLevel::H => 2,
        };

        let mut data = (correct_level << 3) | mask_pattern;
        let mut d = data << 10;

        while get_bch_digit(d) - get_bch_digit(g15) >= 0 {
            d ^= g15 << (get_bch_digit(d) - get_bch_digit(g15));
        }

        data = ((data << 10) | d) ^ g15_mask;

        // 垂直类型信息（第 8 列）- 从上到下
        for i in 0..15 {
            let bit = !test && ((data >> i) & 1) == 1;
            if i < 6 {
                self.set_module(i, 8, bit);
            } else if i < 8 {
                self.set_module(i + 1, 8, bit);
            } else {
                self.set_module(self.module_count - 15 + i, 8, bit);
            }
        }

        // 水平类型信息（第 8 行）- 从右到左
        for i in 0..15 {
            let bit = !test && ((data >> i) & 1) == 1;
            if i < 8 {
                self.set_module(8, self.module_count - 1 - i, bit);
            } else if i < 9 {
                self.set_module(8, 15 - i - 1 + 1, bit);
            } else {
                self.set_module(8, 15 - i - 1, bit);
            }
        }

        // 固定暗模块
        self.set_module(self.module_count - 8, 8, !test);
    }

    /// 设置类型号（版本 7+）
    fn setup_type_number(&mut self, _test: bool) {
        let g18 = (1 << 12)
            | (1 << 11)
            | (1 << 10)
            | (1 << 9)
            | (1 << 8)
            | (1 << 5)
            | (1 << 2)
            | (1 << 0);
        let mut data = self.type_number << 12;

        while get_bch_digit(data) - get_bch_digit(g18) >= 0 {
            data ^= g18 << (get_bch_digit(data) - get_bch_digit(g18));
        }

        data |= self.type_number << 12;

        for i in 0..18 {
            let bit = ((data >> i) & 1) == 1;
            let row = i / 3;
            let col = i % 3;
            self.set_module(self.module_count - 11 + col, row, bit);
            self.set_module(row, self.module_count - 11 + col, bit);
        }
    }

    /// 创建数据
    fn create_data(&self) -> Vec<i32> {
        let rs_blocks = get_rs_blocks(self.type_number, self.options.correct_level);

        let mut buffer = BitBuffer::new();

        for data in &self.data_list {
            buffer.put(4, 4); // MODE_8BIT_BYTE
            buffer.put(
                data.get_length() as i32,
                get_length_in_bits(4, self.type_number),
            );
            data.write(&mut buffer);
        }

        let mut total_data_count = 0;
        for block in &rs_blocks {
            total_data_count += block.data_count;
        }

        if buffer.length + 4 <= total_data_count as usize * 8 {
            buffer.put(0, 4);
        }

        while !buffer.length.is_multiple_of(8) {
            buffer.put_bit(false);
        }

        loop {
            if buffer.length >= total_data_count as usize * 8 {
                break;
            }
            buffer.put(0xEC, 8);
            if buffer.length >= total_data_count as usize * 8 {
                break;
            }
            buffer.put(0x11, 8);
        }

        let data = buffer.buffer;

        let mut offset = 0;
        let max_dc_count = rs_blocks.iter().map(|b| b.data_count).max().unwrap_or(0);
        let max_ec_count = rs_blocks
            .iter()
            .map(|b| b.total_count - b.data_count)
            .max()
            .unwrap_or(0);

        let mut dcdata: Vec<Vec<i32>> = Vec::new();
        let mut ecdata: Vec<Vec<i32>> = Vec::new();

        for block in &rs_blocks {
            let dc_count = block.data_count;
            let ec_count = block.total_count - dc_count;

            dcdata.push(data[offset as usize..(offset + dc_count) as usize].to_vec());
            offset += dc_count;

            let rs_poly = Polynomial::generate_rs_poly(ec_count);
            let dc = dcdata.last().unwrap();
            let mut raw_coeff = dc.clone();
            raw_coeff.extend(std::iter::repeat_n(0, ec_count as usize));
            let raw_poly = Polynomial::new(raw_coeff, 0);
            let mod_poly = raw_poly.r#mod(&rs_poly);

            let mut ec: Vec<i32> = Vec::with_capacity(ec_count as usize);
            for i in 0..ec_count {
                let mod_index = i + mod_poly.len() as i32 - ec_count;
                let val = if mod_index >= 0 {
                    mod_poly.get(mod_index as usize)
                } else {
                    0
                };
                ec.push(val);
            }
            ecdata.push(ec);
        }

        let mut result: Vec<i32> = Vec::new();

        for i in 0..max_dc_count {
            for item in dcdata.iter().take(rs_blocks.len()) {
                if i < item.len() as i32 {
                    result.push(item[i as usize]);
                }
            }
        }

        for i in 0..max_ec_count {
            for item in ecdata.iter().take(rs_blocks.len()) {
                if i < item.len() as i32 {
                    result.push(item[i as usize]);
                }
            }
        }

        result
    }

    /// 映射数据到模块
    fn map_data(&mut self, data: &[i32]) {
        let mut inc = -1;
        let mut row = self.module_count - 1;
        let mut bit_index = 7;
        let mut byte_index = 0;

        let mut col = self.module_count - 1;
        while col > 0 {
            if col == 6 {
                col -= 1;
            }

            loop {
                for c in 0..2 {
                    let col_idx = col - c;
                    if col_idx < 0 || col_idx >= self.module_count {
                        continue;
                    }
                    if !self.is_module_set(row, col_idx) {
                        let mut dark = false;
                        if byte_index < data.len() {
                            dark = ((data[byte_index] >> bit_index) & 1) == 1;
                        }

                        // Mask pattern 0: (row + col) % 2 == 0
                        let mask = (row + col_idx) % 2 == 0;
                        if mask {
                            dark = !dark;
                        }

                        self.set_module(row, col_idx, dark);

                        if bit_index == 0 {
                            bit_index = 7;
                            byte_index += 1;
                        } else {
                            bit_index -= 1;
                        }
                    }
                }

                row += inc;

                if row < 0 || self.module_count <= row {
                    row -= inc;
                    inc = -inc;
                    break;
                }
            }

            col -= 2;
        }
    }

    #[inline(always)]
    fn set_module(&mut self, row: i32, col: i32, is_dark: bool) {
        if row >= 0 && row < self.module_count && col >= 0 && col < self.module_count {
            let idx = (row as usize) * (self.module_count as usize) + (col as usize);
            self.modules[idx] = if is_dark { 1 } else { 2 }; // 1 = 深色, 2 = 已设置但浅色
        }
    }

    #[inline(always)]
    fn is_module_set(&self, row: i32, col: i32) -> bool {
        if row < 0 || row >= self.module_count || col < 0 || col >= self.module_count {
            return false;
        }
        let idx = (row as usize) * (self.module_count as usize) + (col as usize);
        self.modules[idx] != 0
    }

    #[inline(always)]
    pub fn is_dark(&self, row: i32, col: i32) -> bool {
        if row < 0 || row >= self.module_count || col < 0 || col >= self.module_count {
            return false;
        }
        let idx = (row as usize) * (self.module_count as usize) + (col as usize);
        self.modules[idx] == 1
    }

    /// 获取模块数量
    pub fn get_module_count(&self) -> i32 {
        self.module_count
    }

    /// 生成 SVG - 极致性能版本
    pub fn get_svg(&self) -> String {
        let count = self.module_count;
        if count == 0 {
            return String::new();
        }

        let size = 256;
        let cell_size = size / count;
        let actual_size = cell_size * count;
        let offset = (size - actual_size) / 2;
        let count_usize = count as usize;

        // 统计深色模块数量，精确预分配
        let dark_count: usize = self.modules.iter().map(|&m| (m == 1) as usize).sum();

        // 每个深色模块约 20-25 字节路径数据
        let path_capacity = dark_count * 25;
        let total_capacity = 200 + path_capacity;

        let mut svg = String::with_capacity(total_capacity);

        // SVG 头部
        svg.push_str(r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 "#);
        svg.push_str(&size.to_string());
        svg.push(' ');
        svg.push_str(&size.to_string());
        svg.push_str(r#"" width=""#);
        svg.push_str(&size.to_string());
        svg.push_str(r#"" height=""#);
        svg.push_str(&size.to_string());
        svg.push_str(r#""><path d="M0 0h"#);
        svg.push_str(&size.to_string());
        svg.push('v');
        svg.push_str(&size.to_string());
        svg.push_str(r#"H0z" fill=""#);
        svg.push_str(&self.options.color_light);
        svg.push_str(r#""/><path fill=""#);
        svg.push_str(&self.options.color_dark);
        svg.push_str(r#"" d=""#);

        // 生成路径数据
        for row in 0..count_usize {
            let row_offset = row * count_usize;
            for col in 0..count_usize {
                if self.modules[row_offset + col] == 1 {
                    let x = (col as i32) * cell_size + offset;
                    let y = (row as i32) * cell_size + offset;

                    svg.push('M');
                    Self::push_i32(&mut svg, x);
                    svg.push(' ');
                    Self::push_i32(&mut svg, y);
                    svg.push('h');
                    Self::push_i32(&mut svg, cell_size);
                    svg.push('v');
                    Self::push_i32(&mut svg, cell_size);
                    svg.push('h');
                    svg.push('-');
                    Self::push_i32(&mut svg, cell_size);
                    svg.push('z');
                }
            }
        }

        svg.push_str(r#""/></svg>"#);
        svg
    }

    /// 快速将 i32 推入字符串
    #[inline(always)]
    fn push_i32(s: &mut String, mut n: i32) {
        if n == 0 {
            s.push('0');
            return;
        }

        if n < 0 {
            s.push('-');
            n = -n;
        }

        let mut buf = [0u8; 10];
        let mut i = 10;

        while n > 0 {
            i -= 1;
            buf[i] = (n % 10) as u8 + b'0';
            n /= 10;
        }

        s.push_str(unsafe { std::str::from_utf8_unchecked(&buf[i..]) });
    }

    /// 将 QRCode 渲染为终端可显示的字符画
    /// 每个模块使用 2 个字符宽度，以补偿终端字符的高宽比（约 2:1）
    pub fn to_terminal(&self, invert: bool, quiet_zone: i32) -> String {
        let dark_char = if invert { " " } else { "█" };
        let light_char = if invert { "█" } else { " " };
        let dark_module = dark_char.repeat(2);
        let light_module = light_char.repeat(2);

        let mut lines: Vec<String> = Vec::new();
        let total_width = (self.module_count + quiet_zone * 2) * 2;

        // 添加顶部静区
        for _ in 0..quiet_zone {
            lines.push(light_char.repeat(total_width as usize));
        }

        // 渲染 QRCode 模块
        for row in 0..self.module_count {
            let mut line = light_char.repeat((quiet_zone * 2) as usize);
            for col in 0..self.module_count {
                if self.is_dark(row, col) {
                    line.push_str(&dark_module);
                } else {
                    line.push_str(&light_module);
                }
            }
            line.push_str(&light_char.repeat((quiet_zone * 2) as usize));
            lines.push(line);
        }

        // 添加底部静区
        for _ in 0..quiet_zone {
            lines.push(light_char.repeat(total_width as usize));
        }

        lines.join("\n")
    }

    /// 使用 Braille 字符渲染更紧凑的终端二维码
    /// 每个字符表示 2x4 像素（宽 x 高）
    pub fn to_terminal_braille(&self) -> String {
        let braille_base: u32 = 0x2800;
        let mut result = String::new();
        let rows = self.module_count as usize;
        let cols = self.module_count as usize;

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
                    if y + dy < rows
                        && x + 1 < cols
                        && self.is_dark((y + dy) as i32, (x + 1) as i32)
                    {
                        braille |= 1 << (4 + dy);
                    }
                }
                line.push(char::from_u32(braille_base + braille).unwrap_or(' '));
            }
            result.push_str(&line);
            result.push('\n');
        }

        result.trim_end().to_string()
    }

    /// 带颜色的终端输出（使用 ANSI 转义序列）
    pub fn to_terminal_color(&self, fg_color: &str, bg_color: &str) -> String {
        let fg_code = self.get_ansi_color_code(fg_color, false);
        let bg_code = self.get_ansi_color_code(bg_color, true);
        let reset = "\x1b[0m";

        let mut result = format!("{}{}", bg_code, fg_code);

        for row in 0..self.module_count {
            for col in 0..self.module_count {
                if self.is_dark(row, col) {
                    result.push_str("██");
                } else {
                    result.push_str("  ");
                }
            }
            if row < self.module_count - 1 {
                result.push('\n');
            }
        }

        result.push_str(reset);
        result
    }

    fn get_ansi_color_code(&self, color: &str, is_background: bool) -> String {
        let color_map: [(&str, u8); 8] = [
            ("black", 30),
            ("red", 31),
            ("green", 32),
            ("yellow", 33),
            ("blue", 34),
            ("magenta", 35),
            ("cyan", 36),
            ("white", 37),
        ];

        let base_code = color_map
            .iter()
            .find(|(name, _)| name.eq_ignore_ascii_case(color))
            .map(|(_, code)| *code)
            .unwrap_or(37);

        let code = if is_background {
            base_code + 10
        } else {
            base_code
        };
        format!("\x1b[{}m", code)
    }
}

impl Default for QRCode {
    fn default() -> Self {
        Self::new()
    }
}

/// 获取位置调整图案位置
fn get_pattern_position(type_number: i32) -> Vec<i32> {
    let table: &[i32] = match type_number {
        1 => &[0, 0, 0, 0, 0, 0, 0],
        2 => &[6, 18, 0, 0, 0, 0, 0],
        3 => &[6, 22, 0, 0, 0, 0, 0],
        4 => &[6, 26, 0, 0, 0, 0, 0],
        5 => &[6, 30, 0, 0, 0, 0, 0],
        6 => &[6, 34, 0, 0, 0, 0, 0],
        7 => &[6, 22, 38, 0, 0, 0, 0],
        8 => &[6, 24, 42, 0, 0, 0, 0],
        9 => &[6, 26, 46, 0, 0, 0, 0],
        10 => &[6, 28, 50, 0, 0, 0, 0],
        _ => &[6, 30, 54, 0, 0, 0, 0],
    };
    table.iter().take_while(|&&x| x != 0).copied().collect()
}

/// 获取长度位数
fn get_length_in_bits(_mode: i32, type_num: i32) -> i32 {
    if (1..10).contains(&type_num) {
        8
    } else {
        16
    }
}
