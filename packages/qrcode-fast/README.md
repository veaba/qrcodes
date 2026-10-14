# qrcode-fast 🚀

> **高性能 Rust QRCode 生成库**
>
> 🔥 **比 kennytm/qrcode 快 9-19 倍！**

[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/Performance-9--19x%20faster-red.svg)]()

---

## 🚀 使用方法

### 作为库使用

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

let mut qr = QRCode::with_options(QRErrorCorrectLevel::H);
qr.make_code("Hello World");
let svg = qr.get_svg();
```

### 终端输出

```rust
use qrcode_fast::{QRCode, QRErrorCorrectLevel};

let mut qr = QRCode::with_options(QRErrorCorrectLevel::M);
qr.make_code("https://example.com");

// 标准终端输出
println!("{}", qr.to_terminal(false, 1));

// Braille 紧凑输出
println!("{}", qr.to_terminal_braille());

// 彩色终端输出
println!("{}", qr.to_terminal_color("green", "white"));
```

### 使用命令行工具

工具已迁移到 `bench/rust-tools`：

```bash
cd bench/rust-tools

# 生成并验证二维码
cargo run --release --features validation --bin fast-qr -- "Hello World"

# 终端输出演示
cargo run --release --bin terminal_demo -- "Hello World"

# 性能对比
cargo run --release --bin compare-svgs -- "Hello World"
```

## 📊 性能

端到端 SVG 生成，同机同进程 100 次取平均，产物经独立解码验证（Rust 1.89.0, release）：

| 场景 | kennytm/qrcode | qrcode-fast | 速度比 |
|------|----------------|-------------|--------|
| Hello World (11B) | 210.4 µs | **18.5 µs** | **11.4x** |
| Test QR Code 123 (17B) | 324.1 µs | **19.8 µs** | **16.2x** |
| URL (31B) | 453.3 µs | **24.2 µs** | **18.8x** |
| 长文本 (74B) | 826.2 µs | **64.4 µs** | **12.5x** |

对比 `@veaba/qrcode-rust` 快 **1.5-2.2 倍**。

> 权威数据：[`docs/public/benchmark_speedup_verified.json`](../../docs/public/benchmark_speedup_verified.json)
> 复现：`cd bench/rust-tools && cargo run --release --bin verify-speedup`

> ✅ **能力范围**：覆盖 **Version 1-40**，纠错级别 **H** 下**最大可解码长度 1273 字节**（QR 标准上限），
> 与 `@veaba/qrcode-rust` 及 JS 实现一致。产物经 resvg 渲染 + rqrr **独立解码**验证，实例复用同样正常工作。
> 历史上曾因 `get_min_version` 的 `take(10)` 与对齐图案坐标表缺陷导致长文本不可解码，**均已修复**（见
> [`docs/public/benchmark_speedup_verified.json`](../../docs/public/benchmark_speedup_verified.json) 的 `fixed_defects`）。
> 复现：`cd bench/rust-tools && cargo run --release --features validation --bin scan-max`

## 🏆 核心优化

1. **扁平内存布局** - `Vec<u8>` 替代 `Vec<Vec<Option<bool>>>`
2. **预分配容量** - 避免动态扩容
3. **快速数字转换** - 自定义 `push_i32()` 替代 `format!`
4. **批量路径生成** - 减少系统调用

## 📁 文件结构

```
packages/qrcode-fast/
├── Cargo.toml          # 精简后的配置
├── src/
│   ├── lib.rs          # 库入口
│   ├── qr_code.rs      # 核心实现
│   └── qr_code_model.rs # 数据模型
└── benches/            # 基准测试
```

## 🛠️ 工具迁移说明

原 `src/bin/` 下的工具已迁移至 `bench/rust-tools/src/bin/`：

| 原位置 | 新位置 |
|--------|--------|
| `src/bin/svg_gen.rs` | `bench/rust-tools/src/bin/svg_gen.rs` |
| `src/bin/compare_svgs.rs` | `bench/rust-tools/src/bin/compare_svgs.rs` |
| `src/bin/validate_qr.rs` | `bench/rust-tools/src/bin/validate_qr.rs` |
| `src/bin/fast_qr.rs` | `bench/rust-tools/src/bin/fast_qr.rs` |
| `src/bin/simple_qr.rs` | `bench/rust-tools/src/bin/simple_qr.rs` |
| `src/bin/verify_kennytm.rs` | `bench/rust-tools/src/bin/verify_kennytm.rs` |
| `src/bin/verified_qr.rs` | `bench/rust-tools/src/bin/verified_qr.rs` |
| `src/bin/terminal_demo.rs` | `bench/rust-tools/src/bin/terminal_demo.rs` |
| `src/validation.rs` | `bench/rust-tools/src/validation.rs` |

## 🧪 测试说明

包内的单元测试已迁移至 `bench/rust-tools`，使用集成测试工具运行：

```bash
cd ../../bench/rust-tools

# 运行 qrcode-fast 集成测试
cargo run --release --bin test_qrcode_fast
```

预期输出：
```
═══════════════════════════════════════
  @veaba/qrcode-fast 集成测试套件
═══════════════════════════════════════
  通过：16
  失败：0
  总计：16
✅ @veaba/qrcode-fast 所有测试通过！
```

## 📝 历史迁移

- **2026-02-06**: 删除 `examples/` 目录，其中 `generate_svg.rs` 为 mock 实现，`test_qrcode_fast.rs` 和 `test_ec.rs` 功能由 `bench/rust-tools` 覆盖，保持包目录干净。
- **2026-04-05**: 删除包内 `#[cfg(test)]` 测试代码，迁移至 `bench/rust-tools/src/bin/test_qrcodes.rs` 统一测试。

## 📄 License

MIT License - 详见 [LICENSE](../../LICENSE)
