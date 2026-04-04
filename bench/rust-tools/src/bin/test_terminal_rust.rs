// QRCode Rust 终端输出测试工具
// 专门测试 @veaba/qrcode-rust 的终端输出功能
//
// 使用方法:
//   cargo run --release --bin test-terminal-rust

use qrcode_rust::{QRCode, QRCodeOptions, QRErrorCorrectLevel};

fn main() {
    println!("═══════════════════════════════════════");
    println!("  @veaba/qrcode-rust 终端输出测试");
    println!("═══════════════════════════════════════\n");

    let mut passed = 0;

    // ============================================
    // 标准终端输出测试
    // ============================================
    println!("📦 标准终端输出测试\n");

    run_test("基本终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "终端输出不应该为空");
    });
    passed += 1;

    run_test("包含方块字符", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 1);
        assert!(terminal.contains('█'), "终端输出应该包含方块字符");
    });
    passed += 1;

    run_test("包含空格", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 1);
        assert!(terminal.contains(' '), "终端输出应该包含空格");
    });
    passed += 1;

    run_test("多行输出", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 1);
        let lines: Vec<&str> = terminal.lines().collect();
        assert!(lines.len() > 1, "终端输出应该是多行的");
    });
    passed += 1;

    run_test("行列对齐", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 1);
        let lines: Vec<&str> = terminal.lines().collect();

        // 使用字符数而不是字节数（█ 在 UTF-8 中占 3 字节，但只有 1 个字符）
        let first_chars = lines[0].chars().count();
        for line in &lines {
            if !line.is_empty() {
                assert_eq!(line.chars().count(), first_chars, "所有行字符数应该一致");
            }
        }
    });
    passed += 1;

    // ============================================
    // 反转颜色测试
    // ============================================
    println!("\n📦 反转颜色测试\n");

    run_test("反转颜色产生不同输出", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let normal = qr.to_terminal(false, 1);
        let inverted = qr.to_terminal(true, 1);
        assert_ne!(normal, inverted, "反转颜色应该产生不同的输出");
    });
    passed += 1;

    run_test("反转后仍包含方块", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let inverted = qr.to_terminal(true, 1);
        assert!(inverted.contains('█'), "反转后仍应包含方块字符");
    });
    passed += 1;

    // ============================================
    // 静区测试
    // ============================================
    println!("\n📦 静区测试\n");

    run_test("静区 1", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 1);
        let lines: Vec<&str> = terminal.lines().collect();
        assert!(lines.len() >= 21, "静区 1 应该至少有 21 行");
    });
    passed += 1;

    run_test("静区 3 比静区 1 行数多", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let qz1 = qr.to_terminal(false, 1);
        let qz3 = qr.to_terminal(false, 3);
        let lines1 = qz1.lines().count();
        let lines3 = qz3.lines().count();
        assert!(lines3 > lines1, "静区 3 应该比静区 1 行数多");
    });
    passed += 1;

    run_test("大静区边缘是空格", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let terminal = qr.to_terminal(false, 3);
        let lines: Vec<&str> = terminal.lines().collect();
        // 第一行应该是空格（静区）
        assert!(lines[0].trim().is_empty(), "第一行应该是静区（空格）");
    });
    passed += 1;

    // ============================================
    // Braille 输出测试
    // ============================================
    println!("\n📦 Braille 输出测试\n");

    run_test("Braille 输出不为空", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let braille = qr.to_terminal_braille();
        assert!(!braille.is_empty(), "Braille 输出不应该为空");
    });
    passed += 1;

    run_test("Braille 包含盲文字符", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let braille = qr.to_terminal_braille();
        assert!(
            braille
                .chars()
                .any(|c| ('\u{2800}'..='\u{28FF}').contains(&c)),
            "Braille 输出应该包含 Braille 字符"
        );
    });
    passed += 1;

    run_test("Braille 比标准输出更紧凑", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let standard = qr.to_terminal(false, 1);
        let braille = qr.to_terminal_braille();
        let standard_lines = standard.lines().count();
        let braille_lines = braille.lines().count();
        assert!(braille_lines < standard_lines, "Braille 应该更紧凑");
    });
    passed += 1;

    run_test("Braille 多行输出", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let braille = qr.to_terminal_braille();
        let lines: Vec<&str> = braille.lines().collect();
        assert!(lines.len() > 1, "Braille 输出应该是多行的");
    });
    passed += 1;

    // ============================================
    // 彩色终端输出测试
    // ============================================
    println!("\n📦 彩色终端输出测试\n");

    run_test("彩色输出不为空", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let colored = qr.to_terminal_color("black", "white");
        assert!(!colored.is_empty(), "彩色输出不应该为空");
    });
    passed += 1;

    run_test("包含 ANSI 转义序列", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let colored = qr.to_terminal_color("black", "white");
        assert!(colored.contains("\x1b["), "彩色输出应该包含 ANSI 转义序列");
    });
    passed += 1;

    run_test("包含重置序列", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let colored = qr.to_terminal_color("black", "white");
        assert!(
            colored.contains("\x1b[0m") || colored.contains("[0m"),
            "彩色输出应该包含重置序列"
        );
    });
    passed += 1;

    run_test("不同前景色", || {
        let colors = [
            "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
        ];
        for color in colors {
            let mut qr = QRCode::new();
            qr.make_code("Test");
            let colored = qr.to_terminal_color(color, "white");
            assert!(!colored.is_empty(), "颜色 {} 应该生成输出", color);
        }
    });
    passed += 1;

    run_test("不同背景色", || {
        let colors = [
            "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
        ];
        for color in colors {
            let mut qr = QRCode::new();
            qr.make_code("Test");
            let colored = qr.to_terminal_color("black", color);
            assert!(!colored.is_empty(), "背景色 {} 应该生成输出", color);
        }
    });
    passed += 1;

    run_test("自定义颜色组合", || {
        let mut qr = QRCode::new();
        qr.make_code("Hello");
        let colored = qr.to_terminal_color("green", "yellow");
        assert!(colored.contains("\x1b["), "应该包含 ANSI 转义序列");
    });
    passed += 1;

    // ============================================
    // 不同内容测试
    // ============================================
    println!("\n📦 不同内容测试\n");

    run_test("中文终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code("你好世界");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "中文应该生成终端输出");
    });
    passed += 1;

    run_test("URL 终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code("https://github.com/veaba/qrcodes");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "URL 应该生成终端输出");
    });
    passed += 1;

    run_test("长文本终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code(&"a".repeat(100));
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "长文本应该生成终端输出");
    });
    passed += 1;

    // ============================================
    // 不同纠错级别测试
    // ============================================
    println!("\n📦 不同纠错级别测试\n");

    run_test("L 级别终端输出", || {
        let mut qr = QRCode::with_options(QRCodeOptions {
            width: 256,
            height: 256,
            color_dark: String::from("#000000"),
            color_light: String::from("#ffffff"),
            correct_level: QRErrorCorrectLevel::L,
        });
        qr.make_code("Test");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "L 级别应该生成终端输出");
    });
    passed += 1;

    run_test("M 级别终端输出", || {
        let mut qr = QRCode::with_options(QRCodeOptions {
            width: 256,
            height: 256,
            color_dark: String::from("#000000"),
            color_light: String::from("#ffffff"),
            correct_level: QRErrorCorrectLevel::M,
        });
        qr.make_code("Test");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "M 级别应该生成终端输出");
    });
    passed += 1;

    run_test("Q 级别终端输出", || {
        let mut qr = QRCode::with_options(QRCodeOptions {
            width: 256,
            height: 256,
            color_dark: String::from("#000000"),
            color_light: String::from("#ffffff"),
            correct_level: QRErrorCorrectLevel::Q,
        });
        qr.make_code("Test");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "Q 级别应该生成终端输出");
    });
    passed += 1;

    run_test("H 级别终端输出", || {
        let mut qr = QRCode::with_options(QRCodeOptions {
            width: 256,
            height: 256,
            color_dark: String::from("#000000"),
            color_light: String::from("#ffffff"),
            correct_level: QRErrorCorrectLevel::H,
        });
        qr.make_code("Test");
        let terminal = qr.to_terminal(false, 1);
        assert!(!terminal.is_empty(), "H 级别应该生成终端输出");
    });
    passed += 1;

    // ============================================
    // 打印示例输出
    // ============================================
    println!("\n📦 示例输出\n");

    run_test("打印标准终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code("https://github.com/veaba/qrcodes");
        let terminal = qr.to_terminal(false, 1);
        println!("\n标准终端输出:\n{}\n", terminal);
    });
    passed += 1;

    run_test("打印 Braille 输出", || {
        let mut qr = QRCode::new();
        qr.make_code("https://github.com/veaba/qrcodes");
        let braille = qr.to_terminal_braille();
        println!("\nBraille 输出:\n{}\n", braille);
    });
    passed += 1;

    run_test("打印彩色终端输出", || {
        let mut qr = QRCode::new();
        qr.make_code("https://github.com/veaba/qrcodes");
        let colored = qr.to_terminal_color("green", "yellow");
        println!("\n彩色终端输出:\n{}\n", colored);
    });
    passed += 1;

    // ============================================
    // 总结
    // ============================================
    println!("\n═══════════════════════════════════════");
    println!("  测试总结");
    println!("═══════════════════════════════════════");
    println!("  通过：{}", passed);
    println!("  总计：{}", passed);
    println!("═══════════════════════════════════════\n");

    println!("✅ @veaba/qrcode-rust 终端输出所有测试通过！\n");
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
