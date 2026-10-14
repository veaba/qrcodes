# @veaba/qrcode-fast

极致性能优化的 Rust QRCode 生成库，采用一维数组存储、预分配内存、内联函数等优化技术，比 `@veaba/qrcode-rust` 快 **1.5-2.2 倍**，比社区流行的 `kennytm-qrcode` 快 **9-19 倍**。

## 安装

### 作为依赖

```toml
[dependencies]
qrcode-fast = { git = "https://github.com/veaba/qrcodes", package = "qrcode-fast" }
```

### 本地路径

```toml
[dependencies]
qrcode-fast = { path = "packages/qrcode-fast" }
```

## 基础使用

### 创建 QRCode

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

fn main() {
    // 创建 QRCode 实例，指定纠错级别
    let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
    qr.make_code("https://github.com/veaba/qrcodes");

    // 获取 SVG
    let svg = qr.get_svg();
    println!("{}", svg);
}
```

### 不同纠错级别

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

fn main() {
    let texts = vec!["Hello", "World", "QRCode"];

    for level in [QRErrorCorrectLevel::L, QRErrorCorrectLevel::M,
                  QRErrorCorrectLevel::Q, QRErrorCorrectLevel::H] {
        let mut qr = QRCode::with_options(level);
        qr.make_code(&texts.join(" "));
        let svg = qr.get_svg();
        // 保存或使用 svg...
    }
}
```

## 输出格式

### SVG 输出（推荐）

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
    qr.make_code("https://github.com/veaba/qrcodes");

    // 获取 SVG 字符串
    let svg = qr.get_svg();

    // 保存到文件
    std::fs::write("qrcode.svg", svg).expect("Failed to write file");
    println!("SVG saved to qrcode.svg");
}
```

### 获取模块数据

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::with_options(QRErrorCorrectLevel::M);
    qr.make_code("Hello, Fast QRCode!");

    // 获取模块数量
    let count = qr.get_module_count();
    println!("Module count: {}x{}", count, count);

    // 终端渲染
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

### 终端输出（Terminal Output）

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

fn main() {
    let mut qr = QRCode::with_options(QRErrorCorrectLevel::M);
    qr.make_code("https://example.com");

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

## 批量生成

### 顺序生成

```rust
use qrcode_fast::QRCode;

fn main() {
    let texts: Vec<String> = (0..100)
        .map(|i| format!("https://github.com/veaba/qrcodes/{}", i))
        .collect();

    let start = std::time::Instant::now();

    let results: Vec<String> = texts
        .iter()
        .map(|text| {
            let mut qr = QRCode::new();
            qr.make_code(text);
            qr.get_svg()
        })
        .collect();

    let duration = start.elapsed();
    println!("Generated {} QR codes in {:?}", results.len(), duration);
    println!("Average: {:.2} µs per QR code", duration.as_micros() as f64 / results.len() as f64);
}
```

### 并行生成（使用 Rayon）

```rust
use qrcode_fast::QRCode;
use rayon::prelude::*;

fn main() {
    let texts: Vec<String> = (0..10000)
        .map(|i| format!("https://github.com/veaba/qrcodes/{}", i))
        .collect();

    let start = std::time::Instant::now();

    // 并行生成，充分利用多核性能
    let results: Vec<String> = texts
        .par_iter()
        .map(|text| {
            let mut qr = QRCode::new();
            qr.make_code(text);
            qr.get_svg()
        })
        .collect();

    let duration = start.elapsed();
    println!("Generated {} QR codes in {:?}", results.len(), duration);
    println!("Throughput: {:.0} QR codes/second", results.len() as f64 / duration.as_secs_f64());
}
```

## Web 服务

### Actix-web 示例

```rust
use actix_web::{get, web, App, HttpResponse, HttpServer};
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

#[get("/qrcode")]
async fn generate_qrcode(query: web::Query<QRCodeQuery>) -> HttpResponse {
    let text = query.text.clone().unwrap_or_else(|| "https://github.com/veaba/qrcodes".to_string());

    let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
    qr.make_code(&text);

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
use qrcode_fast::{QRCode, QRErrorCorrectLevel};
use serde::Deserialize;

#[derive(Deserialize)]
struct QRCodeParams {
    text: Option<String>,
}

async fn generate_qrcode(Query(params): Query<QRCodeParams>) -> Html<String> {
    let text = params.text.unwrap_or_else(|| "https://github.com/veaba/qrcodes".to_string());

    let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
    qr.make_code(&text);

    Html(qr.get_svg())
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/qrcode", get(generate_qrcode));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();

    println!("QRCode Server running on http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}
```

## 性能优化技术

### 1. 一维数组存储

```rust
// qrcode-fast 使用一维 Vec<u8> 存储
modules: Vec<u8>  // 0=未设置, 1=深色, 2=已设置浅色

// 访问方式：idx = row * module_count + col
let idx = (row as usize) * (self.module_count as usize) + (col as usize);
```

**优势**：
- 连续内存布局，CPU 缓存友好
- 单次内存分配
- 减少指针跳转开销

### 2. 精确的容量预分配

```rust
// 统计深色模块数量，精确预分配 SVG 字符串容量
let dark_count: usize = self.modules.iter().map(|&m| (m == 1) as usize).sum();
let path_capacity = dark_count * 25;  // 每个模块约 25 字节
let mut svg = String::with_capacity(200 + path_capacity);
```

**优势**：避免动态扩容，减少内存重分配

### 3. 内联数字转换

```rust
#[inline(always)]
fn push_i32(s: &mut String, mut n: i32) {
    // 自定义数字转字符串，避免 format! 开销
    let mut buf = [0u8; 10];
    let mut i = 10;
    while n > 0 {
        i -= 1;
        buf[i] = (n % 10) as u8 + b'0';
        n /= 10;
    }
    s.push_str(unsafe { std::str::from_utf8_unchecked(&buf[i..]) });
}
```

**优势**：比 `to_string()` 或 `format!` 快约 3-5 倍

## 与其他库的性能对比

### 测试方法

端到端 SVG 生成（`make_code` + `get_svg`），在同一进程内按固定顺序依次测量 `@veaba/qrcode-fast`、`@veaba/qrcode-rust`、`kennytm-qrcode` 三方实现；每个用例预热 20 次后取 **100 次运行的算术平均值**。产物会经 resvg 渲染 + rqrr 独立解码，必须还原为原始文本才算有效样本。测试环境：Windows x64 / Rust 1.89.0 / release (opt-level 3)。

### SVG 生成性能（端到端，100 次运行平均）

| 测试用例 | 输入长度 | @veaba/qrcode-fast | @veaba/qrcode-rust | kennytm-qrcode | fast vs kennytm | rust vs kennytm | fast vs rust |
|---------|---------|-------------------|-------------------|----------------|-----------------|-----------------|--------------|
| Hello World | 11 B | **18.5 µs** | 32.1 µs | 210.4 µs | **11.4x** | 6.6x | **1.74x** |
| Test QR Code 123 | 17 B | **19.8 µs** | 41.3 µs | 324.1 µs | **16.2x** | 7.8x | **2.08x** |
| URL | 31 B | **24.2 µs** | 53.2 µs | 453.3 µs | **18.8x** | 8.5x | **2.20x** |
| Long | 74 B | **64.4 µs** | 130.2 µs | 826.2 µs | **12.5x** | 6.2x | **2.02x** |

### 对比总结

| 对比 | 速度提升 |
|------|----------|
| `@veaba/qrcode-fast` vs `kennytm-qrcode` | **9-19 倍** |
| `@veaba/qrcode-rust` vs `kennytm-qrcode` | **6-9 倍** |
| `@veaba/qrcode-fast` vs `@veaba/qrcode-rust` | **1.5-2.2 倍** |

完整数据（唯一权威来源）：[`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json)

复现命令：

```bash
cd bench/rust-tools
cargo run --release --bin verify-speedup
```

> 以上数字仅代表本机结果，不同 CPU 与编译器版本会有差异，倍数应视为量级参考。
>
> ⚠️ 此前文档中的 `ops/s` 表格与 37-75 倍等结论来自一个「生成伪数据」的构建，产物并非真实二维码，现已全部撤回。
> 当前实现生成的是可被独立解码验证的真实二维码，覆盖全部 40 个版本（详见下文「能力范围」）。

## 基准测试

运行内置基准测试：

```bash
cd packages/qrcode-fast
cargo bench --bench comparison_bench
```

### 使用 bench/rust-tools

使用 `bench/rust-tools` 进行 SVG 性能对比和终端输出演示：

```bash
cd bench/rust-tools

# 终端输出演示
cargo run --release --bin terminal_demo -- "Hello World"

# 完整基准测试
cargo run --release --features validation --bin benchmark-full
```

### SVG 基准测试

使用 `bench/rust-tools` 进行 SVG 性能对比：

```bash
cd bench/rust-tools
cargo run --release --features validation --bin benchmark-full
```

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

📦 @veaba/qrcode-fast
───────────────────────────────────────
⏱️  生成耗时: 48.6µs
📐 二维码版本: 1 (21x21 模块)
📄 SVG 大小: 4187 bytes
🔍 验证中...
✅ 验证通过！
```

## API 参考

### QRCode 结构

```rust
pub struct QRCode {
    pub options: QRCodeOptions,
    pub module_count: i32,
    pub type_number: i32,
    modules: Vec<u8>,  // 一维数组：modules[row * module_count + col]
    data_list: Vec<QR8bitByte>,
}
```

### QRCodeOptions

```rust
#[derive(Clone)]
pub struct QRCodeOptions {
    pub color_dark: String,
    pub color_light: String,
    pub correct_level: QRErrorCorrectLevel,
}
```

### QRErrorCorrectLevel

```rust
pub enum QRErrorCorrectLevel {
    L = 1,  // ~7% 纠错
    M = 0,  // ~15% 纠错
    Q = 3,  // ~25% 纠错
    H = 2,  // ~30% 纠错
}
```

### 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `QRCode::new()` | 创建默认实例 | `QRCode` |
| `QRCode::with_options(level)` | 创建实例并指定纠错级别 | `QRCode` |
| `make_code(text)` | 生成二维码 | `()` |
| `get_svg()` | 获取 SVG 字符串 | `String` |
| `get_module_count()` | 获取模块数量 | `i32` |
| `is_dark(row, col)` | 判断指定位置是否为深色 | `bool` |
| `to_terminal(invert, quiet_zone)` | 终端输出 | `String` |
| `to_terminal_braille()` | Braille 终端 | `String` |
| `to_terminal_color(fg, bg)` | 彩色终端 | `String` |

## 何时使用 @veaba/qrcode-fast？

### 推荐使用场景

- ✅ 追求极致性能（比 qrcode-rust 快 1.5-2.2 倍）
- ✅ 大批量生成任务
- ✅ 高并发 Web 服务
- ✅ 嵌入式或资源受限环境
- ✅ 需要 SVG 输出的场景

### 与 @veaba/qrcode-rust 的选择

| 场景 | 推荐包 | 原因 |
|------|--------|------|
| 极致性能 | `@veaba/qrcode-fast` | 最快的生成速度 |
| 功能完整 | `@veaba/qrcode-rust` | API 更完整，兼容性好 |

### 架构关系

```
Rust 源码
    │
    ├── @veaba/qrcode-rust ──► 功能完整，API 兼容性好
    │
    └── @veaba/qrcode-fast ──► 极致优化，性能优先
```

两个包采用相同的 QRCode 算法，主要区别在于：

1. **数据结构**：fast 使用一维数组，rust 使用二维数组
2. **内存分配**：fast 精确预分配，rust 估算预分配
3. **字符串构建**：fast 自定义内联函数，rust 使用 `write!` 宏
4. **函数内联**：fast 使用 `#[inline(always)]`，rust 使用默认内联

## 性能数据

基于实际基准测试（2026-03-20，Windows x64，Rust 1.89.0，release）。下表吞吐量一列由左侧平均耗时按 `1e6 ÷ 平均耗时(µs)` 换算得到，仅为便于对照，不是独立测量的 ops/s。

| 测试用例 | 输入长度 | 平均时间 | 换算吞吐量 |
|--------|---------|----------|-----------|
| Hello World | 11 B | 18.5 µs | ~54,054 ops/s |
| Test QR Code 123 | 17 B | 19.8 µs | ~50,505 ops/s |
| URL | 31 B | 24.2 µs | ~41,322 ops/s |
| Long | 74 B | 64.4 µs | ~15,528 ops/s |

完整数据（唯一权威来源）：[`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json)

复现命令：

```bash
cd bench/rust-tools
cargo run --release --bin verify-speedup
```

### 能力范围

`@veaba/qrcode-fast` 现覆盖 **Version 1-40**，在纠错级别 **H** 下**最大可解码长度 1273 字节**（QR 标准上限），与 `qrcode-rust`、JS 实现完全一致。

- ✅ 全长度产物均可通过 resvg 渲染 + rqrr **独立解码**还原为原始文本
- ✅ 实例复用正常：同一个 `QRCode` 实例反复编码不同长度的文本也能正确解码

历史缺陷（已修复，此处保留以供参考）：

- `get_pattern_position` 曾使用本地坐标表，其中 `_ => [6, 30, 54]` 让所有 **v11+** 版本误用 v11 的对齐图案坐标（例如 v12 应为 `[6, 32, 58]`），且最多只能表达 3 个坐标，无法表示 4 坐标的版本。现已改用共享的权威坐标表（覆盖 v1-v40）。
- 底层 `qrcode-rust-shared` 的 `get_min_version` 曾用 `take(10)` 把版本锁死在 Version 10，导致输入超过约 119 字节时选到容量不足的版本；`RS_BLOCK_TABLE` 的 v15-H 也曾是占位符。两者均已修正。

明细见权威数据文件的 `fixed_defects` 字段，能力上限见 `capability` 字段。

复现：

```bash
cd bench/rust-tools
cargo run --release --features validation --bin scan-max      # 全长度扫描 (1..1400 字节)
cargo test --release --features validation --test qr_validity # 正确性回归测试
```

## 编译优化

确保使用 release 配置以获得最佳性能：

```toml
[profile.release]
opt-level = 3      # 最高优化级别
lto = true         # 链接时优化
codegen-units = 1  # 单个编译单元，更好的优化
```

编译命令：

```bash
cargo build --release
```

## 更新记录

### 2026-03-20

- **性能数据重新测量并全面修订**：改用 `bench/rust-tools` 的 `verify-speedup` 端到端 SVG 基准（100 次运行平均，产物经独立解码验证）
- 新增「测试方法」小节与权威数据文件 [`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json) 的链接
- 新增「已知限制」说明：当时 Version 10 上限导致 120 字节以上输入无法解码（**该问题已于同日修复**，章节已改写为「能力范围」）

### 2026-02-03

- 新增 `@veaba/qrcode-fast` 文档
- 添加性能对比数据
- 添加使用示例和最佳实践
