# 性能对比

本文档提供各运行时的详细性能对比数据，帮助你选择最适合的包。

## 测试环境

- **平台**: Windows x64
- **Rust**: v1.89.0 (release, opt-level 3)
- **数据**: 2026-03-20 重新测量

## 综合性能对比

> 本页仅呈现 **Rust 三方**的端到端 SVG 基准（`bench/rust-tools` 的 `verify-speedup`，100 次运行平均）。
> 早期文档中基于伪数据构建的 18.4 μs / 54,283 ops/s 等数字已撤回。
>
> Node.js 与 Bun 的对比**已删除**：该对比同时变动「运行时」与「实现」两个变量，无法归因
> （详见 [基准测试](../bench/) 页面的说明）。

### 单条生成性能

Rust 两列的 ops/s 由「Hello World」用例的平均耗时按 `1e6 ÷ 18.5 µs ≈ 54,054` 换算得到；
原始数据见 [`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json)。

| 实现 | 平均耗时 | 换算吞吐量 | 相对性能 |
|------|---------|-----------|---------|
| `@veaba/qrcode-fast` | 18.5 μs | ~54,054 ops/s | 🥇 最快 |
| `@veaba/qrcode-rust` | 32.1 μs | ~31,153 ops/s | 🥈 很快 |
| `kennytm-qrcode` | 210.4 μs | ~4,753 ops/s | 基准 |

```
单条生成 - Hello World (µs，越低越好)

qrcode-fast:     ████                                        18.5 µs
qrcode-rust:     ███████                                     32.1 µs
kennytm-qrcode:  ███████████████████████████████████████████ 210.4 µs
```

### 批量生成性能 (1000 条)

**不提供**。`bench/rust-tools` 目前没有覆盖 1000 条批量场景的程序，
而此前表中「Rust 原生 ~25,000 ops/s / ~40 ms」一行无法溯源到任何基准文件，已删除。
历史上此处的 Node.js / Bun 两行同属已删除的对比。

### Rust 包对比（vs kennytm-qrcode）

**测试方法**：端到端 SVG 生成（`make_code` + `get_svg`），同进程内三方实现依次测量，每个用例预热 20 次后取 100 次运行的算术平均值；产物经 resvg 渲染 + rqrr 独立解码验证。环境：Windows x64 / Rust 1.89.0 / release。

| 测试用例 | 输入长度 | @veaba/qrcode-rust | kennytm-qrcode | 速度提升 |
|---------|---------|-------------------|----------------|----------|
| Hello World | 11 B | **32.1 µs** | 210.4 µs | **6.6x** |
| Test QR Code 123 | 17 B | **41.3 µs** | 324.1 µs | **7.8x** |
| URL | 31 B | **53.2 µs** | 453.3 µs | **8.5x** |
| Long | 74 B | **130.2 µs** | 826.2 µs | **6.2x** |

**结论**: `@veaba/qrcode-rust` 比 `kennytm-qrcode` 快 **6-9 倍**

完整数据（唯一权威来源）：[`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json)

复现命令：

```bash
cd bench/rust-tools
cargo run --release --bin verify-speedup
```

## 详细测试数据

### @veaba/qrcode-rust (原生)

```
single_generation:     time:   [50.915 µs 51.030 µs 51.156 µs]  (~19,608 ops/s)
batch_generation_100:  time:   [3.9972 ms 4.0068 ms 4.0165 ms]  (~24,959 ops/s)
svg_generation:        time:   [34.599 µs 34.742 µs 34.894 µs]  (~28,780 ops/s)
error_level_L:         time:   [28.890 µs 28.974 µs 29.058 µs]  (~34,518 ops/s)
error_level_M:         time:   [28.605 µs 28.712 µs 28.837 µs]  (~34,827 ops/s)
error_level_Q:         time:   [40.171 µs 40.480 µs 40.829 µs]  (~24,703 ops/s)
error_level_H:         time:   [41.606 µs 41.960 µs 42.347 µs]  (~23,832 ops/s)
```

### @veaba/qrcode-fast (Rust 优化版)

**测试方法**：端到端 SVG 生成（`make_code` + `get_svg`），同进程预热 20 次后取 100 次运行的算术平均值；产物经 resvg 渲染 + rqrr 独立解码，必须还原为原始文本。环境：Windows x64 / Rust 1.89.0 / release。

| 测试用例 | 输入长度 | 平均时间 | 换算吞吐量（1e6 ÷ µs） |
|---------|---------|----------|---------------------|
| Hello World | 11 B | 18.5 µs | ~54,054 ops/s |
| Test QR Code 123 | 17 B | 19.8 µs | ~50,505 ops/s |
| URL | 31 B | 24.2 µs | ~41,322 ops/s |
| Long | 74 B | 64.4 µs | ~15,528 ops/s |

完整数据（唯一权威来源）：[`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json)

```bash
cd bench/rust-tools
cargo run --release --bin verify-speedup
```

> 本表取代了此前一个**生成伪数据**（产物并非真实二维码）的构建所产出的 18.42 µs / 10.81 µs / 92,486 ops/s 等数字。
> 当前实现生成的是可被独立解码验证的真实二维码，两个包均覆盖 **Version 1-40**，在 H 级别下最大可解码长度 **1273 字节**（QR 标准上限），
> 长度上限不再有差异（详见本节末尾的「能力范围」）。

## Node.js vs Bun

**不提供对比**。历史上此处给出的 Bun 领先 19.3%-171.4% 来自两个来源：
「生成伪数据」的构建，以及同时变动「运行时」与「实现」两个变量的对比
（`@veaba/qrcode-node` 与 `@veaba/qrcode-bun` 是两套不同的实现，前者封装 `@veaba/qrcode-js-shared`，
后者自带独立实现）。两者都无法支撑任何运行时结论，已删除。

> 若需重新建立该对比，必须先**固定实现**（两个运行时加载同一份源码），
> 并在独立进程中多轮重复取中位数，否则混淆变量依然存在。

## 纠错级别性能

不同纠错级别对性能的影响。Rust 一列旧的 28.97 / 28.71 / 40.48 / 41.96 µs 数据来自已撤回的旧基准，
此处不再列出，请参考上文基于实测用例的 Rust 数据。

> ⚠️ 历史上此处列出过 Bun / Node.js 两列。该对比同时变动了「运行时」与「实现」两个变量
> （`@veaba/qrcode-node` 与 `@veaba/qrcode-bun` 是两套不同的实现），无法归因，已删除。

## 内存使用

### 包大小对比

| 包 | 压缩后 | 解压后 | 说明 |
|----|-------|-------|------|
| @veaba/qrcode-js | 8 KB | 15 KB | 纯 JS |
| @veaba/qrcode-wasm | 25 KB | 80 KB | 含 .wasm |
| @veaba/qrcode-node | 10 KB | 20 KB | 服务端 |
| @veaba/qrcode-bun | 10 KB | 20 KB | 服务端 |

## 启动时间

| 运行时 | 冷启动 | 热启动 | 说明 |
|--------|-------|-------|------|
| Rust | 0 ms | 0 ms | 原生代码 |
| Bun | 10 ms | 5 ms | 快速启动 |
| Node.js | 50 ms | 30 ms | 需加载模块 |
| WASM | 100 ms | 0 ms | 首次需初始化 |

## 选择建议

### 根据场景选择

| 场景 | 推荐包 | 原因 |
|------|-------|------|
| 前端生产环境 | @veaba/qrcode-js | 包小，无需 WASM 初始化 |
| 前端高性能 | @veaba/qrcode-wasm | 浏览器中更快 |
| Node.js 后端 | @veaba/qrcode-node | 支持 PNG，生态丰富 |
| Bun 后端 | @veaba/qrcode-bun | 原生 Bun 实现，启动快 |
| Rust 项目 | @veaba/qrcode-rust | 极致性能，比 kennytm 快 6-9 倍 |
| 边缘计算 | @veaba/qrcode-bun | 启动快，批量性能优 |

### 根据性能需求选择

| 性能需求 | 推荐运行时 | 预期 ops/s |
|---------|-----------|-----------|
| 极致性能 | Rust 原生 (@veaba/qrcode-fast) | 54,054（由 18.5 µs 换算） |
| 生产 Rust | @veaba/qrcode-rust | 31,153（由 32.1 µs 换算） |
| 前端高性能 | WASM | 未统一测量 |
| 一般需求 | Node.js / Bun | 未统一测量 |

### 根据功能需求选择

| 功能需求 | 推荐包 |
|---------|-------|
| PNG 输出 | @veaba/qrcode-node / @veaba/qrcode-bun |
| 样式化 SVG | 任意包（都支持） |
| 批量生成 | @veaba/qrcode-bun / @veaba/qrcode-rust |
| 最小包体积 | @veaba/qrcode-js |
| SVG 验证 | 使用 bench/rust-tools |

## SVG 验证

使用 `bench/rust-tools` 验证生成的 SVG：

```bash
cd bench/rust-tools
cargo run --release --features validation --bin veaba-qr -- "Hello World"

# 输出示例：
# 📦 @veaba/qrcode-rust
# ⏱️  生成耗时: 66.7µs
# 🔍 验证中...
# ✅ 验证通过！
```

验证结果：

- ✅ `@veaba/qrcode-fast`、`@veaba/qrcode-rust` 与 `kennytm-qrcode` - 生成的 SVG 均可通过标准二维码扫描器（rqrr）独立解码还原为原始文本
- ✅ 两个 Rust 包现已覆盖 **Version 1-40**，在纠错级别 **H** 下**最大可解码长度 1273 字节**（QR 标准上限），与 JS 实现能力对齐
- ✅ 实例复用已修复：同一个 `QRCode` 实例反复编码不同长度的文本也能正确解码

复现：

```bash
cd bench/rust-tools
cargo run --release --features validation --bin scan-max   # 1..1400 字节逐点扫描
```

> 此前文档中「qrcode-fast 生成伪数据、仅用于性能测试」的说法已不成立：两个包现在都生成可被独立解码的真实二维码，且**长文本正确性问题均已修复**。历史缺陷（`get_min_version` 的 `take(10)` 版本上限、`RS_BLOCK_TABLE` v15-H 占位符、`qrcode-fast` 对齐图案坐标表误用 v11 坐标、`qrcode-rust` 的 `setup_type_number` 空实现与实例复用未重置版本号）记录在 [`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json) 的 `fixed_defects` 字段中，能力上限见同文件的 `capability` 字段。

## 能力范围

| 包 | 版本范围 | H 级别最大可解码长度 | 实例复用 | 验证方式 |
|----|---------|------------------|---------|---------|
| `@veaba/qrcode-fast` | Version 1-40 | **1273 字节** | ✅ 正常 | resvg 渲染 + rqrr 独立解码 |
| `@veaba/qrcode-rust` | Version 1-40 | **1273 字节** | ✅ 正常 | resvg 渲染 + rqrr 独立解码 |

```bash
cd bench/rust-tools
cargo run --release --features validation --bin scan-max            # 全长度扫描 (1..1400 字节)
cargo run --release --bin verify-capacity-table                     # 容量表 vs QR 标准 (160 项)
cargo test --release --features validation --test qr_validity       # 正确性回归测试
node ../../scripts/check-rs-blocks.js                               # RS 分块表 vs QR 标准
```

## 优化建议

### 1. 使用缓存

所有公开包都内置缓存系统：

```typescript
// 浏览器环境
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-js';

const qr = new QRCode('https://example.com', QRErrorCorrectLevel.H);
// 实例可复用
```

### 2. 批量生成

```typescript
// Bun 批量生成
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-bun';

const texts = Array.from({ length: 1000 }, (_, i) => `https://example.com/${i}`);
const svgs = texts.map(text => {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toSVG(256);
});
```

### 3. 复用实例

```typescript
// WASM 中复用实例
const qr = new QRCode('text', QRErrorCorrectLevel.H);
// 复用同一实例
```

## 基准测试运行

### Node.js

```bash
cd packages/qrcode-node
node benchmark/index.js
```

### Bun

```bash
cd packages/qrcode-bun
bun run benchmark/index.ts
```

### Rust

```bash
cd packages/qrcode-rust
cargo bench --bench comparison_bench

# 使用 rust-tools 验证
cd bench/rust-tools
cargo run --release --features validation --bin veaba-qr -- "你的文本"
```

## 更新记录

- **2026-03-20**: 修复 Rust 实现的长文本正确性缺陷，能力对齐 QR 标准与 JS 实现
  - `qrcode-rust-shared` 的 `get_min_version` 不再用 `take(10)` 把版本锁在 Version 10，并移除了重复计入头部的 `+2`，现覆盖全部 40 个版本（与 QR 标准 160/160 项吻合）
  - `qrcode-rust-shared` 与 `qrcode-js-shared` 的 `RS_BLOCK_TABLE` v15-H 占位符已修正为 `[11,36,12,7,37,13]`
  - `qrcode-rust` 的 `setup_type_number` 由空实现补齐为 BCH(18,6) 版本信息写入（生成多项式 0x1F25），v7+ 可正常解码
  - `qrcode-rust` 的 `make_code` 现重置 `type_number`，实例复用不再产出无法解码的二维码
  - `qrcode-fast` 的 `get_pattern_position` 改用手册权威坐标表，v11+ 不再误用 v11 的坐标
  - 实测结论：两个包均覆盖 **Version 1-40**，H 级别**最大可解码长度 1273 字节**，与 JS 实现一致；由 `scan-max`（1..1400 字节逐点扫描 + 独立解码）、`verify-capacity-table`（容量表 160/160 项与 QR 标准一致）、`scripts/check-rs-blocks.js`（RS 分块表 160/160 项吻合标准）及 `tests/qr_validity.rs`（11 项全部通过）验证
  - 性能倍数不受影响，仍为 qrcode-fast vs kennytm **11-19 倍**、qrcode-rust vs kennytm **6-9 倍**、qrcode-fast vs qrcode-rust **1.7-2.2 倍**
- **2026-03-20**: Rust 性能数据重新测量，撤回基于伪数据构建的结论
  - 旧数字（18.4 µs / 51.0 µs / 54,283 ops/s / 92,486 ops/s 以及 8-10 倍、37-75 倍、13.0x-17.1x、2.5x-4.4x 等）来源是一个「生成伪数据」的构建，产物并非真实二维码，现已全部替换
  - 改用 `bench/rust-tools` 的 `verify-speedup` 端到端 SVG 基准（100 次运行平均，产物经独立解码验证），权威数据见 [`benchmark_speedup_verified.json`](https://github.com/veaba/qrcodes/blob/main/docs/public/benchmark_speedup_verified.json)
  - 更新头条倍数：qrcode-fast vs kennytm **11-19 倍**，qrcode-rust vs kennytm **6-9 倍**，qrcode-fast vs qrcode-rust **1.7-2.2 倍**
- **2026-03-20（后续）**: 新增三个用例并登记进权威文件，头条倍数区间被拉宽
  - 新增用例：`HelloWorld`（`hello world`，11 B）、`SiteUrl`（`https://qrcodes.veaba.me/`，25 B）、`CjkLong`（中文长文本，115 B），H 级，与原有四例同一口径
  - 实测极值由 11-19x 拉宽为 **9-19x**（`qrcode-fast` vs kennytm）、`1.7-2.2x` 拉宽为 **1.5-2.2x**（vs `qrcode-rust`）；`qrcode-rust` vs kennytm 仍为 **6-9x**
  - 旧区间（11-19x / 1.7-2.2x）已登记进权威文件的 `deprecated_claims`，全仓引用同步更新
  - 新增 `five-way-rust-h` / `five-way-js --ec=H --save-svg`，产物 SVG 落盘于 `docs/public/bench/svg/`（已 gitignore），供人工扫码核对
- **2026-03-20**: 删除 Node.js / Bun 对比（其数据来自 `backend_benchmark_pk.json`，该文件已删除）
  - 原对比同时变动「运行时」与「实现」两个变量，无法归因到任一因素；且仓库内另有两份独立抽样得出相反结论
  - 「Bun 比 Node.js 快 19%-171%」等数字来自已撤回的伪数据构建，同样删除
- **2026-02-02**: 更新测试数据，基于最新基准测试
  - 添加了 `@veaba/qrcode-fast` 的性能数据
  - 添加了与 `kennytm-qrcode` 的对比数据
  - 添加了 SVG 验证说明
- **2026-02-01**: 初始测试数据

*数据可能因硬件和版本不同有所差异*
