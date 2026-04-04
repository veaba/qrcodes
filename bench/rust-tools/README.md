# rust-tools

Rust QRCode 验证、对比和测试工具集合。

## 📦 说明

此 crate 是 Rust 生态的基准测试和验证工具集，包含：

- 性能对比（veaba vs kennytm）
- 二维码验证（可扫描性检测）
- 调试工具（矩阵对比、数据分析）

## 🚀 快速开始

### 生成并验证二维码

```bash
cargo run --release --features validation --bin fast-qr -- "Hello World"
```

### 性能对比

```bash
cargo run --release --bin compare-svgs -- "Hello World"
```

### 查看基准测试报告

```bash
cargo run --bin benchmark-report
```

## 🛠️ 可用工具

### 对比测试

| 工具 | 功能 | 示例 |
|------|------|------|
| `compare-svgs` | veaba vs kennytm 性能对比 | `cargo run --bin compare-svgs -- "text"` |
| `compare-impls` | 实现对比 | `cargo run --bin compare-impls` |
| `compare-matrix` | 矩阵对比 | `cargo run --bin compare-matrix` |

### 验证工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `validate-qr` | 生成并验证 | `cargo run --features validation --bin validate-qr -- "text"` |
| `verify-kennytm` | 验证 kennytm | `cargo run --features validation --bin verify-kennytm -- "text"` |
| `validate-external-svg` | 验证外部 SVG | `cargo run --bin validate-external-svg -- file.svg "text"` |

### 生成工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `simple-qr` | 默认渲染 | `cargo run --bin simple-qr -- "text"` |
| `fast-qr` | 优化渲染 | `cargo run --bin fast-qr -- "text"` |
| `veaba-qr` | veaba 实现 | `cargo run --bin veaba-qr -- "text"` |
| `terminal-demo` | 终端输出演示 | `cargo run --bin terminal_demo -- "text"` |

### 测试工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `test-qrcode-rust` | qrcode-rust 集成测试（26 项） | `cargo run --bin test_qrcode_rust` |
| `test-qrcode-fast` | qrcode-fast 集成测试（26 项） | `cargo run --bin test_qrcode_fast` |
| `test-terminal-rust` | qrcode-rust 终端输出测试（27 项） | `cargo run --bin test_terminal_rust` |
| `test-terminal-fast` | qrcode-fast 终端输出测试（27 项） | `cargo run --bin test_terminal_fast` |
| `terminal-demo` | 终端输出演示 | `cargo run --bin terminal_demo -- "text"` |

测试覆盖：
- 基础功能：基本创建、带选项创建、模块访问、SVG 生成
- 二维码结构：位置探测图案、定时图案
- 纠错级别：L/M/Q/H 四级别、RS 块
- 边界情况：空字符串、长文本
- 字符串生成：URL、中文、数字、特殊字符、混合内容、Email、JSON
- SVG 输出：路径元素、viewBox、颜色设置、不同文本对比
- 终端输出：标准输出、Braille、彩色、反转、静区

终端输出测试覆盖：
- 标准终端输出：基本输出、方块字符、空格、多行、行列对齐
- 反转颜色：不同输出、仍包含方块
- 静区：静区大小、边缘空格
- Braille 输出：盲文字符、紧凑性
- 彩色输出：ANSI 转义序列、前景色/背景色
- 不同内容：中文、URL、长文本
- 纠错级别：L/M/Q/H 四级

| 工具 | 功能 | 示例 |
|------|------|------|
| `benchmark-report` | 显示报告 | `cargo run --bin benchmark-report` |
| `benchmark-full` | 完整基准测试 | `cargo run --bin benchmark-full` |
| `benchmark-kennytm` | kennytm 基准测试 | `cargo run --bin benchmark-kennytm` |

### 调试工具

| 工具 | 功能 |
|------|------|
| `debug-qr` | 调试二维码生成 |
| `debug-compare` | 对比调试 |
| `debug-data` | 数据调试 |
| `debug-finder` | Finder pattern 调试 |
| `debug-map` | 地图调试 |
| `debug-matrix` | 矩阵调试 |

## 📊 基准测试

```bash
cargo bench --bench svg_benchmark
```

## 🔧 特性

- `validation` (默认启用): 启用二维码验证功能（需要 resvg, rqrr, image）

## 📈 性能数据

参见 `BENCHMARK_REPORT.md` 或运行 `benchmark-report` 工具。

## 📁 Bench 目录结构

```shell
bench/
├── backend-benchmark/    # 后端包 PK 测试 (Node.js/Bun/Rust)
├── rust-tools/              # Rust 工具集（本目录）
├── frontend-benchmark/      # 前端性能测试
└── kennytm-qrcode/          # kennytm/qrcode git submodule
```

## 📝 迁移历史

- **2026-02-06**: 合并 `bench/compare_rust` 功能（删除原目录）
- **2026-01-31**: 从 `packages/qrcode-fast` 迁移至此
