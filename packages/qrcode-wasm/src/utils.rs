#[allow(dead_code)]
pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// 获取 ANSI 颜色代码
#[allow(dead_code)]
pub fn get_ansi_color_code(color: &str, is_background: bool) -> String {
    let color_map: &[(&str, u8)] = &[
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
        .find(|(name, _)| name.to_lowercase() == color.to_lowercase())
        .map(|(_, code)| *code)
        .unwrap_or(37);

    let code = if is_background {
        base_code + 10
    } else {
        base_code
    };
    format!("\x1b[{}m", code)
}
