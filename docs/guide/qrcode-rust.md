# @veaba/qrcode-rust

原生 Rust 实现的 QRCode 生成库，提供所有包中最高的性能，比流行的 `kennytm-qrcode` 快 **8-10 倍**。

## 安装

### 作为依赖

```toml
[dependencies]
qrcode-rust = { git = "https://github.com/veaba/qrcodes", package = "qrcode-rust" }
```

### 本地路径

```toml
[dependencies]
qrcode-rust = { path = "packages/qrcode-rust" }
```

## 基础使用

### 创建 QRCode

```rust
use qrcode_rust::{QRCode, QRErrorCorrectLevel};

fn main() {
    // 创建 QRCode 实例
    let mut qr = QRCode::new("https://github.com/veaba/qrcodes");
    qr.options.correct_level = QRErrorCorrectLevel::H;
    
    // 获取 SVG
    let svg = qr.get_svg();
    println!("{}", svg);
}
```

### 指定纠错级别

```rust
use qrcode_rust::{QRCode, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::new("https://github.com/veaba/qrcodes");
    
    // 设置纠错级别
    qr.options.correct_level = QRErrorCorrectLevel::H;
    
    let svg = qr.get_svg();
    println!("{}", svg);
}
```

## 输出格式

### SVG 输出

```rust
use qrcode_rust::{QRCode, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::new("https://github.com/veaba/qrcodes");
    qr.options.correct_level = QRErrorCorrectLevel::H;
    
    // 获取 SVG 字符串
    let svg = qr.get_svg();
    
    // 保存到文件
    std::fs::write("qrcode.svg", svg).expect("Failed to write file");
}
```

### 获取模块数据

```rust
use qrcode_rust::QRCode;

fn main() {
    let mut qr = QRCode::new("https://github.com/veaba/qrcodes");
    
    // 获取模块数量
    let count = qr.get_module_count();
    println!("Module count: {}", count);
    
    // 获取模块数据
    if let Some(modules) = qr.get_modules() {
        for row in 0..count {
            for col in 0..count {
                let is_dark = modules[row as usize][col as usize].unwrap_or(false);
                print!("{}", if is_dark { "██" } else { "  " });
            }
            println!();
        }
    }
}
```

### 自定义渲染

```rust
use qrcode_rust::QRCode;

fn render_to_console(qr: &QRCode) {
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

fn main() {
    let mut qr = QRCode::new("Hello, Rust!");
    render_to_console(&qr);
}
```

### 终端输出（Terminal Output）

```rust
use qrcode_rust::{QRCode, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::new("https://example.com");

    // 标准终端输出
    println!("{}", qr.to_terminal(false, 1));

    // 反转颜色
    println!("{}", qr.to_terminal(true, 1));

    // 大静区
    println!("{}", qr.to_terminal(false, 3));

    // Braille 紧凑输出
    println!("{}", qr.to_terminal_braille());

    // 彩色输出
    println!("{}", qr.to_terminal_color("green", "white"));
}
```

#### 终端输出示例

标准输出：
```
  ██████████████    ██████████████    ██████████████
  ██          ██  ██  ██████  ██████  ██          ██
  ██  ██████  ██      ████      ████  ██  ██████  ██
  ██████████████  ██  ██  ██  ██  ██  ██████████████
```

Braille 输出：
```
⠟⣝⠝⠏⡌⡒⢱⢮⠃⠟⣝⠝⠏
⡇⡕⡅⠇⠟⠥⠔⠮⠍⡇⡕⡅⠇
⣭⣕⢿⠅⡎⢪⣡⣄⠬⣹⡑⡡⠌
```

#### 支持的颜色

`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`

#### 使用场景

- 在 CI/CD 日志中显示二维码
- TUI 应用中直接渲染
- 快速预览二维码内容

## 批量生成

### 顺序生成

```rust
use qrcode_rust::QRCode;

fn main() {
    let texts: Vec<String> = (0..100)
        .map(|i| format!("https://github.com/veaba/qrcodes/{}", i))
        .collect();
    
    let mut results = Vec::new();
    
    for text in &texts {
        let mut qr = QRCode::new(text);
        results.push(qr.get_svg());
    }
    
    println!("Generated {} QR codes", results.len());
}
```

### 并行生成（使用 Rayon）

```rust
use qrcode_rust::QRCode;
use rayon::prelude::*;

fn main() {
    let texts: Vec<String> = (0..10000)
        .map(|i| format!("https://github.com/veaba/qrcodes/{}", i))
        .collect();
    
    // 并行生成
    let results: Vec<String> = texts
        .par_iter()
        .map(|text| {
            let mut qr = QRCode::new(text);
            qr.get_svg()
        })
        .collect();
    
    println!("Generated {} QR codes", results.len());
}
```

## Web 服务

### Actix-web 示例

```rust
use actix_web::{get, web, App, HttpResponse, HttpServer};
use qrcode_rust::{QRCode, QRErrorCorrectLevel};

#[get("/qrcode")]
async fn generate_qrcode(query: web::Query<QRCodeQuery>) -> HttpResponse {
    let text = query.text.clone().unwrap_or_else(|| "https://github.com/veaba/qrcodes".to_string());
    
    let mut qr = QRCode::new(&text);
    qr.options.correct_level = QRErrorCorrectLevel::H;
    
    let svg = qr.get_svg();
    
    HttpResponse::Ok()
        .content_type("image/svg+xml")
        .body(svg)
}

#[derive(serde::Deserialize)]
struct QRCodeQuery {
    text: Option<String>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(generate_qrcode)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Axum 示例

```rust
use axum::{
    extract::Query,
    response::Html,
    routing::get,
    Router,
};
use qrcode_rust::{QRCode, QRErrorCorrectLevel};
use serde::Deserialize;

#[derive(Deserialize)]
struct QRCodeParams {
    text: Option<String>,
}

async fn generate_qrcode(Query(params): Query<QRCodeParams>) -> Html<String> {
    let text = params.text.unwrap_or_else(|| "https://github.com/veaba/qrcodes".to_string());
    
    let mut qr = QRCode::new(&text);
    qr.options.correct_level = QRErrorCorrectLevel::H;
    
    Html(qr.get_svg())
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/qrcode", get(generate_qrcode));
    
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("Server running on http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}
```

## 自定义选项

### 颜色配置

```rust
use qrcode_rust::{QRCode, QRCodeOptions, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::new("https://github.com/veaba/qrcodes");
    
    // 自定义颜色
    qr.options.color_dark = "#FF0000".to_string();
    qr.options.color_light = "#FFFFFF".to_string();
    qr.options.correct_level = QRErrorCorrectLevel::H;
    
    let svg = qr.get_svg();
    std::fs::write("red-qrcode.svg", svg).unwrap();
}
```

## 性能优化

### 复用实例

```rust
use qrcode_rust::QRCode;

fn main() {
    // 复用同一个实例（注意：每次调用 get_svg 会基于当前状态）
    let texts = vec![
        "https://github.com/veaba/qrcodes/1",
        "https://github.com/veaba/qrcodes/2",
        "https://github.com/veaba/qrcodes/3",
    ];
    
    for text in &texts {
        let mut qr = QRCode::new(text);
        let _svg = qr.get_svg();
        // 处理 svg...
    }
}
```

## 基准测试

运行内置基准测试：

```bash
cd packages/qrcode-rust
cargo bench --bench comparison_bench
```

### 使用 bench/rust-tools

使用 `bench/rust-tools` 进行验证和终端输出演示：

```bash
cd bench/rust-tools

# 终端输出演示
cargo run --release --bin terminal_demo -- "Hello World"

# 验证生成结果
cargo run --release --features validation --bin veaba-qr -- "Hello World"
```

预期结果（基于实际测试，2026-02-02）：

```
single_generation     time:   [50.915 µs 51.030 µs 51.156 µs]  (~19,608 ops/s)
batch_generation_100  time:   [3.9972 ms 4.0068 ms 4.0165 ms]  (~24,959 ops/s)
svg_generation        time:   [34.599 µs 34.742 µs 34.894 µs]  (~28,780 ops/s)
error_level_L         time:   [28.890 µs 28.974 µs 29.058 µs]  (~34,518 ops/s)
error_level_M         time:   [28.605 µs 28.712 µs 28.837 µs]  (~34,827 ops/s)
error_level_Q         time:   [40.171 µs 40.480 µs 40.829 µs]  (~24,703 ops/s)
error_level_H         time:   [41.606 µs 41.960 µs 42.347 µs]  (~23,832 ops/s)
```

## 与 kennytm-qrcode 的性能对比

| 测试项 | @veaba/qrcode-rust | kennytm-qrcode | 速度提升 |
|--------|-------------------|----------------|----------|
| 单条生成 | ~51.0 µs | ~438.3 µs | **8.6x** |
| 批量 100 条 | ~4.01 ms | ~32.13 ms | **8.0x** |
| 纠错级别 L | ~29.0 µs | ~306.5 µs | **10.6x** |
| 纠错级别 H | ~42.0 µs | ~446.2 µs | **10.6x** |

**结论**: `@veaba/qrcode-rust` 比 `kennytm-qrcode` 快 **8-10 倍**

## SVG 验证

使用 `bench/rust-tools` 验证生成的 SVG：

```bash
cd bench/rust-tools
cargo run --release --features validation --bin veaba-qr -- "Hello World"
```

输出示例：
```
🚀 @veaba QRCode 生成器
═══════════════════════════════════════
文本: Hello World

📦 @veaba/qrcode-rust
───────────────────────────────────────
⏱️  生成耗时: 66.7µs
📐 二维码版本: 1 (21x21 模块)
📄 SVG 大小: 13798 bytes
🔍 验证中...
✅ 验证通过！
```

## 性能数据

基于实际基准测试（2026-02-02）：

| 测试项 | 平均时间 | 吞吐量 |
|--------|----------|--------|
| 单条生成 | ~51.0 µs | ~19,608 ops/s |
| SVG 生成 | ~34.7 µs | ~28,780 ops/s |
| 批量 100 条 | ~4.01 ms | ~24,959 ops/s |
| 纠错级别 L | ~29.0 µs | ~34,518 ops/s |
| 纠错级别 M | ~28.7 µs | ~34,827 ops/s |
| 纠错级别 Q | ~40.5 µs | ~24,703 ops/s |
| 纠错级别 H | ~42.0 µs | ~23,832 ops/s |

*测试环境：Rust 1.89.0, Windows*

## API 参考

### QRCode 结构

```rust
pub struct QRCode {
    pub options: QRCodeOptions,
    pub type_number: i32,
    pub module_count: i32,
    pub modules: Vec<Vec<Option<bool>>>,
    pub data_cache: Option<Vec<i32>>,
    pub data_list: Vec<QR8bitByte>,
}
```

### 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `QRCode::new(text)` | 创建实例 | `QRCode` |
| `get_module_count()` | 获取模块数 | `i32` |
| `get_modules()` | 获取模块数据 | `Option<&Vec<Vec<Option<bool>>>>` |
| `is_dark(row, col)` | 判断模块颜色 | `bool` |
| `get_svg()` | 获取 SVG | `String` |
| `to_terminal(invert, quiet_zone)` | 终端输出 | `String` |
| `to_terminal_braille()` | Braille 终端 | `String` |
| `to_terminal_color(fg, bg)` | 彩色终端 | `String` |

### QRErrorCorrectLevel

```rust
pub enum QRErrorCorrectLevel {
    L = 1,  // ~7%
    M = 0,  // ~15%
    Q = 3,  // ~25%
    H = 2,  // ~30%
}
```

## 何时使用原生 Rust？

- ✅ 已经是 Rust 项目
- ✅ 追求极致性能（比 kennytm 快 8-10 倍）
- ✅ 需要内存安全保证
- ✅ 批量生成任务（可使用 Rayon 并行）
- ✅ 嵌入式或资源受限环境

## 与 WASM 的关系

```
Rust 源码 (packages/qrcode-rust/src/)
    │
    ├── 编译为原生库 ──► @veaba/qrcode-rust (Rust 项目使用)
    │
    └── 编译为 WASM ───► @veaba/qrcode-wasm (浏览器使用)
```

同一份 Rust 代码，编译为两种目标：

- **原生库**：最高性能，无 WASM 开销
- **WASM**：浏览器运行，跨平台

## 更新记录

### 2026-02-02

- 更新了基准测试数据
- 添加了与 `kennytm-qrcode` 的性能对比
- 添加了 SVG 验证说明
- 修复了 `rust-tools` 中的 crate 名称问题
