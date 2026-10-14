//! 二维码验证模块
//!
//! 提供验证生成的 SVG 二维码是否可以被正确扫描的功能

/// 验证二维码是否可以被正确扫描
///
/// # 参数
/// - `svg`: SVG 字符串
/// - `expected_content`: 期望的二维码内容
///
/// # 返回
/// - `Ok(())`: 验证成功，二维码内容匹配
/// - `Err(Box<dyn Error>)`: 验证失败
#[cfg(feature = "validation")]
pub fn validate_qr_code(
    svg: &str,
    expected_content: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let svg_bytes = svg.as_bytes();
    let scanned = scan_qr_from_svg(svg_bytes)?;

    if scanned == expected_content {
        Ok(())
    } else {
        Err(format!(
            "QR code content mismatch: expected '{}', got '{}'",
            expected_content, scanned
        )
        .into())
    }
}

/// 从 SVG 解码二维码并返回其内容（用于演示与调试）。
///
/// 与 [`validate_qr_code`] 的区别：本函数把解码出的文本直接交还给调用方，
/// 便于直观展示「生成 → 渲染 → 解码」的完整链路结果。
#[cfg(feature = "validation")]
pub fn decode_qr_from_svg(svg: &str) -> Result<String, Box<dyn std::error::Error>> {
    scan_qr_from_svg(svg.as_bytes())
}

#[cfg(not(feature = "validation"))]
pub fn decode_qr_from_svg(_svg: &str) -> Result<String, Box<dyn std::error::Error>> {
    Err("Validation feature is not enabled. \
         Enable it with: cargo run --features validation"
        .into())
}

#[cfg(feature = "validation")]
fn scan_qr_from_svg(svg_bytes: &[u8]) -> Result<String, Box<dyn std::error::Error>> {
    use resvg::usvg;

    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_data(svg_bytes, &opt)?;

    let scale = 8.0;
    let size = tree.size();
    let width = (size.width() * scale) as u32;
    let height = (size.height() * scale) as u32;

    let mut pixmap =
        resvg::tiny_skia::Pixmap::new(width, height).ok_or("Failed to create pixmap")?;

    let transform = resvg::tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, transform, &mut pixmap.as_mut());

    // 将 RGBA 转换为灰度图像
    let img_data = pixmap.data();
    let mut gray_img = image::GrayImage::new(width, height);

    for (i, chunk) in img_data.chunks(4).enumerate() {
        let x = (i as u32) % width;
        let y = (i as u32) / width;
        // 简单的灰度转换: (R*3 + G*4 + B) / 8
        let gray = ((chunk[0] as u32 * 3 + chunk[1] as u32 * 4 + chunk[2] as u32) / 8) as u8;
        gray_img.put_pixel(x, y, image::Luma([gray]));
    }

    // 使用 rqrr 解码
    let mut img = rqrr::PreparedImage::prepare(gray_img);
    let grids = img.detect_grids();

    if grids.is_empty() {
        return Err("No QR code found in image".into());
    }

    // 尝试解码第一个找到的二维码
    match grids[0].decode() {
        Ok((_meta, content)) => Ok(content),
        Err(e) => Err(format!("Failed to decode QR code: {:?}", e).into()),
    }
}

#[cfg(not(feature = "validation"))]
pub fn validate_qr_code(
    _svg: &str,
    _expected_content: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    Err("Validation feature is not enabled. \
         Enable it with: cargo run --features validation"
        .into())
}

/// 检查 SVG 字符串是否看起来像一个有效的二维码 SVG
///
/// 这是一个快速检查，不进行实际的二维码解码
pub fn is_valid_qr_svg(svg: &str) -> bool {
    // 检查基本的 SVG 结构
    if !svg.contains("<svg") || !svg.contains("</svg>") {
        return false;
    }

    // 检查是否有 viewBox
    if !svg.contains("viewBox") {
        return false;
    }

    // 检查是否有路径元素
    if !svg.contains("<path") {
        return false;
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_qr_svg_valid() {
        let valid_svg = concat!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">"#,
            r##"<path d="M0 0h256v256H0z" fill="#ffffff"/>"##,
            r##"<path fill="#000000" d="M10 10h20v20h-20z"/>"##,
            r#"</svg>"#
        );

        assert!(is_valid_qr_svg(valid_svg));
    }

    #[test]
    fn test_is_valid_qr_svg_invalid_no_svg_tag() {
        let invalid_svg = r#"<div>Not an SVG</div>"#;
        assert!(!is_valid_qr_svg(invalid_svg));
    }

    #[test]
    fn test_is_valid_qr_svg_invalid_no_viewbox() {
        let invalid_svg = r#"<svg><path d="M0 0h10v10H0z"/></svg>"#;
        assert!(!is_valid_qr_svg(invalid_svg));
    }
}
