# Rust API

`qrcode-rust` 和 `qrcode-fast` 是原生 Rust QRCode 生成库，提供极致的性能和完整的类型安全。

## 包对比

| 包名 | 性能 | 特点 | 适用场景 |
|------|------|------|----------|
| `qrcode-fast` | 🔥 极致 | 比 kennytm 快 9-19 倍 | 追求极致性能 |
| `qrcode-rust` | ⚡ 快速 | 比 kennytm 快 6-9 倍，功能完整 | 标准 Rust 项目 |

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

> 本节所有数字均取自权威数据文件 [`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json)。
> 历史上这里曾出现 37-75 倍等大幅倍率，那些数字来自一个「生成伪数据」的构建，产物并非真实二维码，已全部撤回。

### 测量口径

- **指标**：端到端 SVG 生成（`make_code` + `get_svg()` / kennytm 的 `render().build()`），三方实现同一进程内依次测量
- **采样**：每个用例预热 20 次后重复 100 次，取算术平均值
- **正确性**：使用 resvg 渲染 + rqrr 独立解码，必须还原为原始文本
- **环境**：Windows x64，rustc 1.89.0，release (opt-level 3)
- **复现命令**：

  ```bash
  cd bench/rust-tools && cargo run --release --bin verify-speedup
  ```

### 端到端 SVG 生成（平均值，越低越好）

| 用例 | 文本长度 | qrcode-fast | qrcode-rust | kennytm-qrcode | fast vs kennytm | rust vs kennytm | fast vs rust |
|------|---------|-------------|-------------|----------------|-----------------|-----------------|--------------|
| Simple (`Hello World`) | 11 B | **18.5 µs** | 32.1 µs | 210.4 µs | **11.4x** | 6.6x | 1.74x |
| Complex (`Test QR Code 123`) | 17 B | **19.8 µs** | 41.3 µs | 324.1 µs | **16.2x** | 7.8x | 2.08x |
| URL (`https://github.com/veaba/qrcodes`) | 31 B | **24.2 µs** | 53.2 µs | 453.3 µs | **18.8x** | 8.5x | 2.20x |
| Long (`Email: test@... Address: 123 Main St`) | 74 B | **64.4 µs** | 130.2 µs | 826.2 µs | **12.5x** | 6.2x | 2.02x |

**汇总倍率区间**（`benchmark_speedup_verified.json` 的 `headline` 字段）：

| 对比 | 倍率区间 |
|------|---------|
| `qrcode-fast` vs `kennytm-qrcode` | **9-19 倍** |
| `qrcode-rust` vs `kennytm-qrcode` | **6-9 倍** |
| `qrcode-fast` vs `qrcode-rust` | **1.5-2.2 倍** |

同一份数据折算成吞吐量（由上表 µs 经 `1e6 / µs` 换算得出，仅作参考）：

| 用例 | qrcode-fast | qrcode-rust | kennytm-qrcode |
|------|-------------|-------------|----------------|
| Simple | ~54,054 ops/s | ~31,153 ops/s | ~4,753 ops/s |
| Complex | ~50,505 ops/s | ~24,213 ops/s | ~3,086 ops/s |
| URL | ~41,322 ops/s | ~18,797 ops/s | ~2,206 ops/s |
| Long | ~15,528 ops/s | ~7,680 ops/s | ~1,210 ops/s |

> ⚠️ 上述倍率为**单机单次测量**结果，不同 CPU 与编译器版本会有差异，应视为量级参考而非精确承诺，
> 也不表示 `qrcode-fast` 在任何基准排行榜上都是第一名。

### 能力范围

`benchmark_speedup_verified.json` 的 `capability` 字段记录了当前的真实能力上限：

- **qrcode-fast** 与 **qrcode-rust** 均覆盖 **Version 1-40**，在纠错级别 **H** 下**最大可解码长度 1273 字节**（QR 标准上限）
- 两者已与 JS 实现对齐，长度上限不再有差异；实例复用（同一 `QRCode` 反复编码不同长度文本）同样正常工作
- 验证方式为**独立解码**：产物经 resvg 渲染 + rqrr 解码，必须还原为原始文本

历史上曾存在一系列长度与正确性缺陷（`get_min_version` 的 `take(10)` 把版本锁在 Version 10、`RS_BLOCK_TABLE` 的 v15-H 占位符、`qrcode-fast` 对齐图案坐标表误用 v11 坐标、`qrcode-rust` 的 `setup_type_number` 空实现与实例复用未重置版本号），它们**均已修复**，明细见权威数据文件的 `fixed_defects` 数组。

复现全长度扫描：

```bash
cd bench/rust-tools
cargo run --release --features validation --bin scan-max   # 1..1400 字节逐点扫描
```

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
