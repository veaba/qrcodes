# qrcode-fast 🚀

> **高性能 Rust QRCode 生成库**
>
> 🔥 **比 kennytm/qrcode 快 3 倍！**

[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/Performance-3x%20faster-red.svg)]()

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

| 场景 | kennytm/qrcode | qrcode-fast | 速度比 |
|------|----------------|-------------|--------|
| 短文本 (11B) | ~16 µs | **~5 µs** | **3x** |
| URL (36B) | ~32 µs | **~10 µs** | **3x** |
| 长文本 (109B) | ~66 µs | **~20 µs** | **3x** |

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
| `src/bin/benchmark_report.rs` | `bench/rust-tools/src/bin/benchmark_report.rs` |
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
