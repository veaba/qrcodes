# Rust API

`qrcode-rust` 和 `qrcode-fast` 是原生 Rust QRCode 生成库，提供极致的性能和完整的类型安全。

## 包对比

| 包名 | 性能 | 特点 | 适用场景 |
|------|------|------|----------|
| `qrcode-fast` | 🔥 极致 | 比 kennytm 快 37-75 倍 | 追求极致性能 |
| `qrcode-rust` | ⚡ 快速 | 比 kennytm 快 8-10 倍，功能完整 | 标准 Rust 项目 |

## 安装

### qrcode-fast（推荐）

```toml
[dependencies]
qrcode-fast = "0.0.1-alpha"
```

### qrcode-rust

```toml
[dependencies]
qrcode-rust = "0.0.1-alpha"
```

## 快速开始

### qrcode-fast

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

// 创建 QRCode
let mut qr = QRCode::new();
qr.make_code("https://github.com/veaba/qrcodes");

// 生成 SVG
let svg = qr.get_svg();
println!("{}", svg);
```

### qrcode-rust

```rust
use qrcode_rust::{QRCode, QRCodeOptions, QRErrorCorrectLevel};

// 使用默认选项
let mut qr = QRCode::new();
qr.make_code("https://github.com/veaba/qrcodes");

// 或使用自定义选项
let mut qr = QRCode::with_options(QRCodeOptions {
    width: 256,
    height: 256,
    color_dark: String::from("#000000"),
    color_light: String::from("#ffffff"),
    correct_level: QRErrorCorrectLevel::H,
});
qr.make_code("Hello World");

let svg = qr.get_svg();
```

## QRCode 结构

### qrcode-fast

```rust
pub struct QRCode {
    pub options: QRCodeOptions,
    pub module_count: i32,
    pub type_number: i32,
    modules: Vec<u8>,  // 一维数组存储，0=浅色, 1=深色
    data_list: Vec<QR8bitByte>,
}
```

### qrcode-rust

```rust
pub struct QRCode {
    pub options: QRCodeOptions,
    pub type_number: i32,
    pub module_count: i32,
    pub modules: Vec<Vec<Option<bool>>>,  // 二维数组
    pub data_cache: Option<Vec<i32>>,
    pub data_list: Vec<QR8bitByte>,
}
```

## 方法

### 构造函数

#### `new()` - 创建默认实例

```rust
let mut qr = QRCode::new();
```

#### `with_options()` - 使用自定义选项

**qrcode-fast:**
```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
```

**qrcode-rust:**
```rust
use qrcode_rust::{QRCode, QRCodeOptions, QRErrorCorrectLevel};

let mut qr = QRCode::with_options(QRCodeOptions {
    width: 256,
    height: 256,
    color_dark: String::from("#000000"),
    color_light: String::from("#ffffff"),
    correct_level: QRErrorCorrectLevel::H,
});
```

### 生成方法

#### `make_code(text: &str)` - 生成 QRCode

```rust
let mut qr = QRCode::new();
qr.make_code("Hello World");
```

#### `add_data(data: &str)` - 添加数据（仅 qrcode-rust）

```rust
let mut qr = QRCode::new();
qr.add_data("Part 1");
qr.add_data("Part 2");
qr.make(""); // 触发生成
```

### 输出方法

#### `get_svg()` - 生成 SVG 字符串

```rust
let svg = qr.get_svg();
// 输出: <svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>
```

#### `is_dark(row: i32, col: i32) -> bool` - 检查模块颜色

```rust
let is_dark = qr.is_dark(0, 0);  // 检查左上角
```

- **qrcode-fast**: 越界返回 `false`
- **qrcode-rust**: 越界会 panic

#### `get_module_count() -> i32` - 获取模块数量

```rust
let count = qr.get_module_count();
// Version 2 = 25, Version 3 = 29, etc.
```

### 终端输出方法（Terminal Output）

#### `to_terminal(&self, invert: bool, quiet_zone: i32) -> String`

将 QRCode 渲染为终端可显示的字符画。每个模块使用 2 个字符宽度，以补偿终端字符的高宽比。

```rust
use qrcode_rust::QRCode;

let mut qr = QRCode::new();
qr.make_code("Hello World");

// 标准终端输出
println!("{}", qr.to_terminal(false, 1));

// 反转颜色
println!("{}", qr.to_terminal(true, 1));

// 大静区
println!("{}", qr.to_terminal(false, 3));
```

#### `to_terminal_braille(&self) -> String`

使用 Braille 字符渲染更紧凑的终端二维码。每个 Braille 字符表示 2x4 像素，输出高度约为标准的 1/4。

```rust
use qrcode_rust::QRCode;

let mut qr = QRCode::new();
qr.make_code("Hello World");

println!("{}", qr.to_terminal_braille());
```

#### `to_terminal_color(&self, fg_color: &str, bg_color: &str) -> String`

带颜色的终端输出（使用 ANSI 转义序列）。

```rust
use qrcode_rust::QRCode;

let mut qr = QRCode::new();
qr.make_code("Hello World");

// 绿色前景
println!("{}", qr.to_terminal_color("green", "white"));

// 蓝色前景，黄色背景
println!("{}", qr.to_terminal_color("blue", "yellow"));
```

支持的颜色：`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`

## QRCodeOptions

### qrcode-fast

```rust
pub struct QRCodeOptions {
    pub color_dark: String,   // 默认: "#000000"
    pub color_light: String,  // 默认: "#ffffff"
    pub correct_level: QRErrorCorrectLevel,  // 默认: H
}
```

### qrcode-rust

```rust
pub struct QRCodeOptions {
    pub width: i32,           // 默认: 256
    pub height: i32,          // 默认: 256
    pub color_dark: String,   // 默认: "#000000"
    pub color_light: String,  // 默认: "#ffffff"
    pub correct_level: QRErrorCorrectLevel,  // 默认: H
}
```

## QRErrorCorrectLevel

纠错级别枚举：

```rust
pub enum QRErrorCorrectLevel {
    L = 1,  // ~7% 容错
    M = 0,  // ~15% 容错
    Q = 3,  // ~25% 容错
    H = 2,  // ~30% 容错（默认）
}
```

## QRCodeNative（仅 qrcode-rust）

`QRCodeNative` 提供了一个更简洁的 API，与 JavaScript 包保持一致：

```rust
use qrcode_rust::{QRCodeNative, QRErrorCorrectLevel};

let qr = QRCodeNative::new("Hello World", QRErrorCorrectLevel::H);

// 生成 SVG
let svg = qr.to_svg(256);

// 检查模块
let is_dark = qr.is_dark(0, 0);
let count = qr.get_module_count();
```

### QRCodeNative 方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `new(text, correct_level)` | 创建实例 | `&str`, `QRErrorCorrectLevel` | `QRCodeNative` |
| `to_svg(size)` | 生成 SVG | `i32` | `String` |
| `to_terminal(invert, quiet_zone)` | 终端输出 | `bool`, `i32` | `String` |
| `to_terminal_braille()` | Braille 终端 | - | `String` |
| `to_terminal_color(fg, bg)` | 彩色终端 | `&str`, `&str` | `String` |
| `is_dark(row, col)` | 检查模块颜色 | `i32`, `i32` | `bool` |
| `get_module_count()` | 获取模块数 | - | `i32` |
| `module_count()` | 同上 | - | `i32` |

## 重新导出的模块

两个包都从 `qrcode-rust-shared` 重新导出了底层模块：

```rust
// qrcode-fast
pub use qrcode_rust_shared::{
    qr_8bit_byte::QR8bitByte,
    qr_bit_buffer::BitBuffer,
    qr_code_model::{get_min_version, QRErrorCorrectLevel, QRErrorCorrectLevel as CorrectLevel},
    qr_math::QRMath,
    qr_polynomial::Polynomial,
    qr_rs_block::get_rs_blocks,
    qr_util::get_bch_digit,
};

// qrcode-rust
pub use qrcode_rust_shared::{
    qr_8bit_byte::QR8bitByte,
    qr_bit_buffer::BitBuffer,
    qr_code_model::{get_type_number, QRErrorCorrectLevel, QRMode, PATTERN_POSITION_TABLE},
    qr_math::QRMath,
    qr_polynomial::Polynomial,
    qr_rs_block::{get_rs_blocks, QRRSBlock},
    qr_util::{get_bch_digit, get_length_in_bits},
};
```

## 完整示例

### 基础使用

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
    qr.make_code("https://github.com/veaba/qrcodes");
    
    let svg = qr.get_svg();
    println!("{}", svg);
    
    // 遍历模块
    let count = qr.get_module_count();
    for row in 0..count {
        for col in 0..count {
            if qr.is_dark(row, col) {
                print!("██");
            } else {
                print!("  ");
            }
        }
        println!();
    }
}
```

### 保存到文件

```rust
use std::fs;
use qrcode_fast::QRCode;

fn save_qrcode(text: &str, path: &str) -> std::io::Result<()> {
    let mut qr = QRCode::new();
    qr.make_code(text);
    
    let svg = qr.get_svg();
    fs::write(path, svg)?;
    
    Ok(())
}

fn main() {
    save_qrcode("Hello World", "qrcode.svg").unwrap();
}
```

### 自定义颜色

```rust
use qrcode_rust::{QRCode, QRCodeOptions, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::with_options(QRCodeOptions {
        width: 512,
        height: 512,
        color_dark: String::from("#1a1a1a"),
        color_light: String::from("#f5f5f5"),
        correct_level: QRErrorCorrectLevel::H,
    });
    
    qr.make_code("https://example.com");
    let svg = qr.get_svg();
    
    std::fs::write("custom_qrcode.svg", svg).unwrap();
}
```

### 批量生成

```rust
use qrcode_fast::QRCode;

fn generate_batch(texts: &[&str]) -> Vec<String> {
    texts.iter().map(|text| {
        let mut qr = QRCode::new();
        qr.make_code(text);
        qr.get_svg()
    }).collect()
}

fn main() {
    let urls = vec![
        "https://example.com/1",
        "https://example.com/2",
        "https://example.com/3",
    ];
    
    let svgs = generate_batch(&urls);
    
    for (i, svg) in svgs.iter().enumerate() {
        std::fs::write(format!("qrcode_{}.svg", i), svg).unwrap();
    }
}
```

### Web 服务器集成（Actix-web 示例）

```rust
use actix_web::{get, web, App, HttpResponse, HttpServer};
use qrcode_fast::QRCode;

#[get("/qrcode/{text}")]
async fn generate_qr(text: web::Path<String>) -> HttpResponse {
    let mut qr = QRCode::new();
    qr.make_code(&text);
    
    let svg = qr.get_svg();
    
    HttpResponse::Ok()
        .content_type("image/svg+xml")
        .body(svg)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(generate_qr))
        .bind("127.0.0.1:8080")?
        .run()
        .await
}
```

## 性能对比

### 与 kennytm/qrcode 对比

| 测试项 | qrcode-fast | kennytm-qrcode | 速度提升 |
|--------|-------------|----------------|----------|
| 单条生成 | ~18.4 µs | ~688.9 µs | **🔥 37x 更快** |
| SVG 生成 (Simple) | ~10.8 µs | ~815.8 µs | **🔥 75x 更快** |
| 纠错级别 H | ~21.1 µs | ~446.2 µs | **🔥 21x 更快** |

### 运行时性能

| 包 | 单条生成 (ops/s) | SVG 输出 (ops/s) |
|----|-----------------|-----------------|
| qrcode-fast | **54,283** | **92,486** |
| qrcode-rust | 21,635 | 28,780 |

## 选择指南

### 使用 qrcode-fast 当：
- 追求极致性能
- 需要处理大量 QRCode 生成
- 对内存使用敏感
- 不需要复杂的数据追加功能

### 使用 qrcode-rust 当：
- 需要 `QRCodeNative` 的简洁 API
- 需要自定义宽高选项
- 需要 `data_cache` 进行调试
- 需要二维模块访问

## 测试

```bash
# qrcode-fast 测试
cd packages/qrcode-fast && cargo test

# qrcode-rust 测试
cd packages/qrcode-rust && cargo test

# 运行基准测试
cargo bench
```

## 注意事项

1. **线程安全**: `QRCode` 不是 `Send` 或 `Sync`，不要在多线程间共享实例
2. **内存管理**: Rust 会自动管理内存，无需手动释放
3. **错误处理**: 无效输入会产生有效的 QRCode，但可能无法被扫描
4. **SVG 尺寸**: `get_svg()` 默认生成 256x256 的 SVG
