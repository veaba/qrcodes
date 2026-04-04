# @veaba/qrcode-rust

> Pure Rust QR Code Generator

[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 简介

使用纯 Rust 语言实现的高性能 QRCode 生成器，是 `@veaba/qrcode-js` 的 Rust 移植版本。提供一致的 API 设计，支持生成可扫描的二维码 SVG 输出。

## 特性

- ✅ **纯 Rust 实现** - 无外部依赖，易于集成
- ✅ **QRCode 生成** - 支持 1-40 版本的 QRCode 生成
- ✅ **SVG 输出** - 高质量矢量图形输出
- ✅ **4 级纠错** - 支持 L/M/Q/H 四种错误纠正级别
- ✅ **UTF-8 支持** - 完整的 Unicode 字符支持
- ✅ **扫描验证** - 生成的二维码可通过标准扫码器识别
- ✅ **高性能** - 相比 JS 版本有显著的性能提升

## 状态

✅ **生产就绪** - 核心功能完整，已通过实际扫描验证

### 功能完成度

| 功能        | 状态      | 说明                   |
|-------------|-----------|------------------------|
| QRCode 生成 | ✅ 完成    | 支持 1-40 版本         |
| SVG 输出    | ✅ 完成    | 支持自定义尺寸和颜色   |
| 错误纠正    | ✅ 完成    | L/M/Q/H 四级别         |
| UTF-8 编码  | ✅ 完成    | 支持 Unicode 字符      |
| 扫描验证    | ✅ 通过    | 已通过 rqrr 扫描器验证 |
| PNG 输出    | 🚧 计划中 | 需要图像库支持         |
| WASM 支持   | 🚧 计划中 | 通过 qrcode-wasm 提供  |

## 安装

```toml
[dependencies]
qrcode-rust = "0.1"
```

## 快速开始

```rust
use qrcode_rust::{QRCode, QRCodeOptions, QRErrorCorrectLevel};

fn main() {
    // 基础用法
    let mut qr = QRCode::new();
    qr.make_code("Hello World");

    // 带选项的用法
    let mut qr = QRCode::with_options(QRCodeOptions {
        width: 256,
        height: 256,
        color_dark: String::from("#000000"),
        color_light: String::from("#ffffff"),
        correct_level: QRErrorCorrectLevel::M,
    });
    qr.make_code("https://github.com/veaba/qrcodes");

    // 生成 SVG
    let svg = qr.get_svg();
    println!("{}", svg);
}
```

### 终端输出

```rust
use qrcode_rust::{QRCode, QRErrorCorrectLevel};

let mut qr = QRCode::with_options(QRErrorCorrectLevel::M);
qr.make_code("https://example.com");

// 标准终端输出
println!("{}", qr.to_terminal(false, 1));

// Braille 紧凑输出
println!("{}", qr.to_terminal_braille());

// 彩色终端输出
println!("{}", qr.to_terminal_color("green", "white"));
```

## API 文档

### QRCode

#### `new()`

创建默认配置的 QRCode 实例。

```rust
let mut qr = QRCode::new();
qr.make_code("Hello World");
```

#### `with_options(options: QRCodeOptions)`

创建带配置的 QRCode 实例。

```rust
let qr = QRCode::with_options(QRCodeOptions {
    width: 512,
    height: 512,
    color_dark: String::from("#FF0000"),
    color_light: String::from("#FFFFFF"),
    correct_level: QRErrorCorrectLevel::H,
});
```

#### `make_code(text: &str)`

生成指定文本的 QRCode。

```rust
qr.make_code("Your text here");
```

#### `get_svg() -> String`

获取 SVG 格式的 QRCode。

```rust
let svg = qr.get_svg();
std::fs::write("output.svg", svg).unwrap();
```

#### `is_dark(row: i32, col: i32) -> bool`

检查指定位置的模块是否为深色。

```rust
if qr.is_dark(0, 0) {
    println!("左上角模块是深色");
}
```

#### `get_module_count() -> i32`

获取 QRCode 的模块数量。

```rust
let count = qr.get_module_count();
println!("QRCode 是 {}x{} 模块", count, count);
```

### QRCodeOptions

```rust
pub struct QRCodeOptions {
    pub width: i32,           // SVG 宽度（像素）
    pub height: i32,          // SVG 高度（像素）
    pub color_dark: String,   // 深色模块颜色
    pub color_light: String,  // 浅色背景颜色
    pub correct_level: QRErrorCorrectLevel,  // 错误纠正级别
}
```

### QRErrorCorrectLevel

错误纠正级别枚举：

```rust
pub enum QRErrorCorrectLevel {
    L = 1,  // ~7% 纠错能力
    M = 0,  // ~15% 纠错能力
    Q = 3,  // ~25% 纠错能力
    H = 2,  // ~30% 纠错能力
}
```

## 开发

### 构建

```bash
cd packages/qrcode-rust
cargo build
```

### 运行测试

包内的单元测试已迁移至 `bench/rust-tools`，使用集成测试工具运行：

```bash
cd ../../bench/rust-tools

# 运行 qrcode-rust 集成测试
cargo run --release --bin test_qrcode_rust
```

预期输出：
```
═══════════════════════════════════════
  @veaba/qrcode-rust 集成测试套件
═══════════════════════════════════════
  通过：15
  失败：0
  总计：15
✅ @veaba/qrcode-rust 所有测试通过！
```

### 验证工具

项目包含完整的验证工具，可以验证生成的 QRCode 是否能被正确扫描：

```bash
cd ../../bench/rust-tools

# 验证生成结果
cargo run --release --features validation --bin veaba-qr -- "你的文本"

# 终端输出演示
cargo run --release --bin terminal_demo -- "Hello World"

# 运行集成测试
cargo run --release --bin test_qrcodes
```

### 调试示例

```bash
# 运行调试示例
cargo run --example debug_a
cargo run --example debug_compare

# 生成测试 SVG
cargo run --example test_visual
```

## 性能

在 M 级别下，生成 "Hello World" 的性能对比：

| 实现        | 生成时间 | 模块大小   |
|-------------|----------|------------|
| qrcode-rust | ~75µs    | 21x21 (v1) |
| qrcode-js   | ~200µs   | 21x21 (v1) |

*测试环境：Windows 11, Ryzen 9 5900X, release 模式*

## 架构

```
src/
├── lib.rs              # 库入口，重新导出公共 API
├── qr_code.rs          # QRCode 核心实现
├── qr_code_model.rs    # 数据模型和常量表
├── qr_math.rs          # Galois Field 数学运算
├── qr_polynomial.rs    # 多项式和 Reed-Solomon 纠错
├── qr_rs_block.rs      # RS 块配置
├── qr_util.rs          # 工具函数
├── qr_bit_buffer.rs    # 位缓冲区
├── qr_8bit_byte.rs     # 8位字节数据编码
└── examples/           # 示例代码
    ├── debug_a.rs
    ├── debug_compare.rs
    └── test_visual.rs
```

## 已知限制

1. **单字符边界情况** - 某些单字符输入（如 "A"）可能导致验证失败，多字符输入工作正常
2. **PNG 输出** - 目前仅支持 SVG，PNG 输出需要额外的图像库依赖
3. **WASM 编译** - WASM 版本通过 `@veaba/qrcode-wasm` 包提供

## 版本兼容性

- Rust 1.70+
- 无外部依赖
- 支持 `std` 环境

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 相关项目

- [@veaba/qrcode-js](https://github.com/veaba/qrcodes) - TypeScript/JavaScript 版本
- [@veaba/qrcode-wasm](https://github.com/veaba/qrcodes) - WebAssembly 版本
- [@veaba/qrcode-fast](https://github.com/veaba/qrcodes) - 高性能 Rust 优化版本
- [@veaba/qrcode-node](https://github.com/veaba/qrcodes) - Node.js 版本
- [@veaba/qrcode-bun](https://github.com/veaba/qrcodes) - Bun 运时版本

## 变更日志

### 0.1.0 (当前)

- ✅ 核心 QRCode 生成功能
- ✅ SVG 输出支持
- ✅ 四级错误纠正
- ✅ UTF-8/Unicode 支持
- ✅ 完整的单元测试
- ✅ 扫描验证通过

### 历史变更

- **2026-02-06**: 删除 `examples/` 目录，功能由 `bench/rust-tools` 覆盖，保持包目录干净。
- **2026-04-05**: 删除包内 `#[cfg(test)]` 测试代码，迁移至 `bench/rust-tools/src/bin/test_qrcodes.rs` 统一测试。

### 待办事项

- [ ] 修复单字符边界情况
- [ ] 添加 PNG 输出支持
- [ ] 优化内存使用
- [ ] 添加更多样式选项
