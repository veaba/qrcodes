// QRCode Fast 集成测试工具
// 用于测试 @veaba/qrcode-fast 的功能正确性
//
// 使用方法:
//   cargo run --release --bin test-qrcode-fast

use qrcode_fast::{QRCode, QRErrorCorrectLevel};

fn main() {
    println!("═══════════════════════════════════════");
    println!("  @veaba/qrcode-fast 集成测试套件");
    println!("═══════════════════════════════════════\n");

    let mut passed = 0;
    let failed = 0;

    // ============================================
    // 基础功能测试
    // ============================================
    println!("📦 基础功能测试\n");

    run_test("基本创建", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello World");
        assert!(qr.module_count > 0, "模块数应该大于 0");
        assert!(qr.type_number > 0, "类型号应该大于 0");
    });
    passed += 1;

    run_test("带选项创建", || {
        let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
        qr.make_code("Test");
        assert_eq!(qr.options.correct_level, QRErrorCorrectLevel::H);
    });
    passed += 1;

    run_test("模块访问不越界", || {
        let mut qr = QRCode::new();
        qr.make_code("Test");
        let count = qr.module_count;
        for row in 0..count {
            for col in 0..count {
                let _ = qr.is_dark(row, col);
            }
        }
    });
    passed += 1;

    run_test("模块越界返回 false", || {
        let mut qr = QRCode::new();
        qr.make_code("Test");
        let count = qr.module_count;
        assert!(!qr.is_dark(count, 0), "越界访问应该返回 false");
        assert!(!qr.is_dark(-1, 0), "负索引应该返回 false");
        assert!(!qr.is_dark(0, count), "越界列应该返回 false");
    });
    passed += 1;

    run_test("SVG 生成", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let svg = qr.get_svg();
        assert!(!svg.is_empty(), "SVG 不应该为空");
        assert!(svg.contains("<svg"), "SVG 应该包含 <svg 标签");
        assert!(svg.contains("</svg>"), "SVG 应该包含 </svg> 标签");
    });
    passed += 1;

    // ============================================
    // 二维码结构测试
    // ============================================
    println!("\n📦 二维码结构测试\n");

    run_test("位置探测图案", || {
        let mut qr = QRCode::new();
        qr.make_code("Test");
        let count = qr.module_count;

        // 左上角
        assert!(qr.is_dark(0, 0), "左上角 (0,0) 应该是深色");
        assert!(qr.is_dark(0, 6), "左上角 (0,6) 应该是深色");
        assert!(qr.is_dark(6, 0), "左上角 (6,0) 应该是深色");
        assert!(qr.is_dark(6, 6), "左上角 (6,6) 应该是深色");

        // 右上角
        assert!(qr.is_dark(0, count - 1), "右上角应该是深色");
        assert!(qr.is_dark(0, count - 7), "右上角应该是深色");
        assert!(qr.is_dark(6, count - 1), "右上角应该是深色");
        assert!(qr.is_dark(6, count - 7), "右上角应该是深色");

        // 左下角
        assert!(qr.is_dark(count - 1, 0), "左下角应该是深色");
        assert!(qr.is_dark(count - 7, 0), "左下角应该是深色");
        assert!(qr.is_dark(count - 1, 6), "左下角应该是深色");
        assert!(qr.is_dark(count - 7, 6), "左下角应该是深色");
    });
    passed += 1;

    run_test("定时图案", || {
        let mut qr = QRCode::new();
        qr.make_code("Test");
        let count = qr.module_count;

        for col in 8..count - 8 {
            let expected = col % 2 == 0;
            assert_eq!(
                qr.is_dark(6, col),
                expected,
                "水平定时图案在 (6,{}) 不匹配",
                col
            );
        }

        for row in 8..count - 8 {
            let expected = row % 2 == 0;
            assert_eq!(
                qr.is_dark(row, 6),
                expected,
                "垂直定时图案在 ({},6) 不匹配",
                row
            );
        }
    });
    passed += 1;

    // ============================================
    // 纠错级别测试
    // ============================================
    println!("\n📦 纠错级别测试\n");

    run_test("不同纠错级别", || {
        let test_data = "Hello World";
        for level in [
            QRErrorCorrectLevel::L,
            QRErrorCorrectLevel::M,
            QRErrorCorrectLevel::Q,
            QRErrorCorrectLevel::H,
        ] {
            let mut qr = QRCode::with_options(level);
            qr.make_code(test_data);
            assert!(qr.module_count > 0, "纠错级别应该生成有效的二维码");
        }
    });
    passed += 1;

    run_test("RS 块", || {
        use qrcode_fast::get_rs_blocks;
        for level in [
            QRErrorCorrectLevel::L,
            QRErrorCorrectLevel::M,
            QRErrorCorrectLevel::Q,
            QRErrorCorrectLevel::H,
        ] {
            let blocks = get_rs_blocks(1, level);
            assert!(!blocks.is_empty(), "类型号 1 纠错级别应该有 RS 块");
            let blocks = get_rs_blocks(2, level);
            assert!(!blocks.is_empty(), "类型号 2 纠错级别应该有 RS 块");
            let blocks = get_rs_blocks(10, level);
            assert!(!blocks.is_empty(), "类型号 10 纠错级别应该有 RS 块");
        }
    });
    passed += 1;

    // ============================================
    // 边界情况测试
    // ============================================
    println!("\n📦 边界情况测试\n");

    run_test("空字符串", || {
        let mut qr = QRCode::new();
        qr.make_code("");
        assert!(qr.module_count > 0, "空字符串也应该生成二维码");
    });
    passed += 1;

    run_test("长文本", || {
        let long_text = "a".repeat(100);
        let mut qr = QRCode::new();
        qr.make_code(&long_text);
        assert!(qr.module_count > 0, "长文本应该生成二维码");
        assert!(qr.type_number > 1, "长文本应该使用更高的类型号");
    });
    passed += 1;

    // ============================================
    // 字符串生成测试
    // ============================================
    println!("\n📦 字符串生成测试\n");

    run_test("URL 字符串", || {
        let mut qr = QRCode::new();
        qr.make_code("https://github.com/veaba/qrcodes");
        assert!(qr.module_count > 0, "URL 应该生成二维码");
        let svg = qr.get_svg();
        assert!(!svg.is_empty(), "URL 应该生成有效的 SVG");
    });
    passed += 1;

    run_test("中文字符串", || {
        let mut qr = QRCode::new();
        qr.make_code("你好世界");
        assert!(qr.module_count > 0, "中文应该生成二维码");
        let svg = qr.get_svg();
        assert!(!svg.is_empty(), "中文应该生成有效的 SVG");
    });
    passed += 1;

    run_test("数字字符串", || {
        let mut qr = QRCode::new();
        qr.make_code("1234567890");
        assert!(qr.module_count > 0, "数字应该生成二维码");
    });
    passed += 1;

    run_test("特殊字符", || {
        let mut qr = QRCode::new();
        qr.make_code("!@#$%^&*()_+-=[]{}|;':\",./<>?");
        assert!(qr.module_count > 0, "特殊字符应该生成二维码");
    });
    passed += 1;

    run_test("混合内容", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello 世界！123");
        assert!(qr.module_count > 0, "混合内容应该生成二维码");
    });
    passed += 1;

    run_test("Email 格式", || {
        let mut qr = QRCode::new();
        qr.make_code("test@example.com");
        assert!(qr.module_count > 0, "Email 应该生成二维码");
    });
    passed += 1;

    run_test("JSON 数据", || {
        let json = r#"{"name":"test","value":123}"#;
        let mut qr = QRCode::new();
        qr.make_code(json);
        assert!(qr.module_count > 0, "JSON 应该生成二维码");
        let svg = qr.get_svg();
        assert!(svg.contains("<svg"), "JSON 应该生成有效的 SVG");
    });
    passed += 1;

    // ============================================
    // SVG 输出测试
    // ============================================
    println!("\n📦 SVG 输出测试\n");

    run_test("SVG 包含路径", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let svg = qr.get_svg();
        assert!(svg.contains("<path"), "SVG 应该包含路径元素");
    });
    passed += 1;

    run_test("SVG viewBox", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let svg = qr.get_svg();
        assert!(svg.contains("viewBox"), "SVG 应该包含 viewBox 属性");
    });
    passed += 1;

    run_test("不同文本生成不同 SVG", || {
        let mut qr1 = QRCode::new();
        qr1.make_code("Hello");
        let svg1 = qr1.get_svg();

        let mut qr2 = QRCode::new();
        qr2.make_code("World");
        let svg2 = qr2.get_svg();

        assert_ne!(svg1, svg2, "不同文本应该生成不同的 SVG");
    });
    passed += 1;

    // ============================================
    // 终端输出测试
    // ============================================
    println!("\n📦 终端输出测试\n");

    run_test("标准终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "终端输出不应该为空");
        assert!(terminal.contains('█'), "终端输出应该包含方块字符");
    });
    passed += 1;

    run_test("Braille 输出", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let braille = qr.to_terminal_braille();
        assert!(!braille.is_empty(), "Braille 输出不应该为空");
        assert!(
            braille
                .chars()
                .any(|c| ('\u{2800}'..='\u{28FF}').contains(&c)),
            "Braille 输出应该包含 Braille 字符"
        );
    });
    passed += 1;

    run_test("彩色终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let colored = qr.to_terminal_color("black", "white");
        assert!(!colored.is_empty(), "彩色终端输出不应该为空");
        assert!(
            colored.contains("\x1b["),
            "彩色终端输出应该包含 ANSI 转义序列"
        );
    });
    passed += 1;

    run_test("反转颜色", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let normal = qr.to_terminal(false, 1);
        let inverted = qr.to_terminal(true, 1);
        assert_ne!(normal, inverted, "反转颜色应该产生不同的输出");
    });
    passed += 1;

    run_test("静区大小", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let qz1 = qr.to_terminal(false, 1);
        let qz3 = qr.to_terminal(false, 3);
        let lines1 = qz1.lines().count();
        let lines3 = qz3.lines().count();
        assert!(lines3 > lines1, "更大的静区应该产生更多的行数");
    });
    passed += 1;

    // ============================================
    // 总结
    // ============================================
    println!("\n═══════════════════════════════════════");
    println!("  测试总结");
    println!("═══════════════════════════════════════");
    println!("  通过：{}", passed);
    println!("  失败：{}", failed);
    println!("  总计：{}", passed + failed);
    println!("═══════════════════════════════════════\n");

    if failed > 0 {
        std::process::exit(1);
    } else {
        println!("✅ @veaba/qrcode-fast 所有测试通过！\n");
    }
}

fn run_test<F>(name: &str, test_fn: F)
where
    F: FnOnce(),
{
    print!("  - {} ... ", name);
    std::io::Write::flush(&mut std::io::stdout()).ok();

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(test_fn));

    match result {
        Ok(_) => println!("✅"),
        Err(_) => {
            println!("❌");
            std::process::exit(1);
        }
    }
}
