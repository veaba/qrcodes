# qrcodes

> ⚠️ **强制约束**：本仓库有[章程（GOVERNANCE.md）](../../GOVERNANCE.md)。
> 新增/修改/删除任何文件之前，先读 [`repo-governance`](./repo-governance/SKILL.md) skill。
>
> 核心红线：
> - 不得留下一次性脚本、探测程序、生成资产
> - 不得新建未在章程 §2 声明的目录
> - 提交前 `cargo fmt` / `cargo clippy -D warnings` / `cargo test` 必须通过
> - 涉及编码逻辑的改动必须用独立解码器验证产物，不能只看"图长得像二维码"

## 环境介绍

当前宿主机环境：

- `windows` 平台
- `node`:`v20.19.4`
- `bun` `1.3.0`
- `rust`: `rustc 1.89.0`

## 包介绍

这是一个 `pnpm monorepo`，包含两个维度的包，子包在 `packages` 目录下。

### 前端包

- `@veaba/qrcode-js`TypeScript 写代码，使用 `tsdown` 来打包为 bundle，直接可以在浏览器中运行, 会发布到 `npm`
- `@veaba/qrcode-wasm`，Rust wasm 代码，wasm-pack 构建，给浏览器使用, 会发布到 `npm`

注意： ``@veaba/qrcode-js` 和 `@veaba/qrcode-wasm` 的 API 必须完成一样，现在就是，如果不是需要更新 API

### 后端包

- `@veaba/qrcode-node`，node 运行时，js 写，`"type":module"`, 会发布到 `npm`
- `@veaba/qrcode-bun`，bun 运行时，ts 写, 会发布到 `npm`

### Rust Crates (纯 Rust，发布到 crates.io)

- `@veaba/qrcode-rust`， 对 `@veaba/qrcode-js` rust 化的纯 Rust 包，会发布到 `crates.io`
- `@veaba/qrcode-fast`，是对标 rust 流行的 `kennytm-qrcode` 优化的纯 Rust 包，会发布到 `crates.io`

**注意**: 这两个包是纯 Rust 库，不包含 WASM 绑定，使用 `cargo` 构建和测试。

### 共享包

- `@veaba/qrcode-js-shared`，共享的代码，不会发布到 npm，`private: true`

## 基准测试

- `/bench` 目录基准测试的代码
- `/bench/scripts` 是基准测试运行脚本
- **详细指南**: 参见 `bench/README.md`

### 基准测试结构（已整理）

```
bench/
├── backend-benchmark/          # 后端包 PK 基准测试（多包对比）
│   ├── index.ts                # 主测试脚本
│   └── package.json
├── frontend-benchmark/         # 前端包基准测试
│   └── benchmark.cjs
├── svg-benchmark/              # SVG 生成性能测试
│   ├── index.js                # 主入口
│   ├── rust.js                 # Rust 包测试
│   └── js.js                   # JS 包测试
├── scripts/                    # 基准测试运行脚本
│   └── run.js                  # 统一入口
├── kennytm-qrcode/             # 外部对比包
│   └── src/
└── rust-tools/                 # Rust 验证工具集
    ├── Cargo.toml
    └── src/
        └── bin/
            ├── veaba_qr.rs
            ├── validate_qr.rs
            └── ...
```

**注意**: `benchmark-cross-backend/` 目录已删除（功能被 PK 测试覆盖）

### rust-tools 验证工具

`bench/rust-tools` 提供二维码生成和验证功能：

#### 可用工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `veaba-qr` | 生成并验证 @veaba 二维码 | `cargo run --release --features validation --bin veaba-qr -- "Hello World"` |
| `validate-qr` | 验证 kennytm 二维码 | `cargo run --release --features validation --bin validate-qr -- "Hello World"` |
| `benchmark-full` | SVG 生成性能基准测试 | `cargo run --release --features validation --bin benchmark-full -- --quick` |

#### 验证示例

```bash
cd bench/rust-tools

# 生成并验证二维码
cargo run --release --features validation --bin veaba-qr -- "Hello World"

# 输出示例：
# 📦 @veaba/qrcode-rust
# ⏱️  生成耗时: 66.7µs
# 🔍 验证中...
# ✅ 验证通过！
```

#### SVG 生成基准测试

一键运行 SVG 生成性能测试：

```bash
# 快速测试（10次运行）
pnpm bench:svg:rust:quick

# 完整测试（100次运行）
pnpm bench:svg:rust
```

测试输出：
- **SVG 文件**: `docs/public/bench/benchmark-output/*.svg`
- **JSON 报告**: `docs/public/benchmark_svg_rust.json`
- **测试报告**: `docs/bench/svg-benchmark.mdx`

#### 修复记录

- **2026-02-02**: 修复了 `rust-tools` 中的 crate 名称问题
  - `qrcode_fast_tools` → `rust_tools`
  - 修复了 `veaba_qr.rs`、`validate_qr.rs` 中的导入
- **2026-02-02**: 添加了 `benchmark-full` 工具用于 SVG 生成性能测试

### 各包基准测试位置

| 包名 | 基准测试路径 | 测试框架 | 输出文件 |
|------|-------------|---------|---------|
| `@veaba/qrcode-node` | `packages/qrcode-node/benchmark/index.js` | 自定义 | `benchmark/benchmark_result.json` |
| `@veaba/qrcode-bun` | `packages/qrcode-bun/benchmark/index.ts` | 自定义 | `benchmark_result.json` |
| `@veaba/qrcode-js` | `bench/frontend-benchmark/benchmark.cjs` | 自定义 | `frontend_benchmark_result.json` |
| `@veaba/qrcode-rust` | `packages/qrcode-rust/benches/` | Criterion | `target/criterion/` |
| `@veaba/qrcode-fast` | `packages/qrcode-fast/benches/` | Criterion | `target/criterion/` |
| `kennytm-qrcode` | `bench/kennytm-qrcode/` | Criterion | - |

### PK 基准测试（多包对比）

PK 测试对比以下后端包：

| 包名 | 运行时 | 说明 |
|------|--------|------|
| `@veaba/qrcode-node` | Node.js | JavaScript 实现 |
| `@veaba/qrcode-bun` | Bun | TypeScript 实现 |
| `@veaba/qrcode-rust` | Rust | Rust 实现 |
| `@veaba/qrcode-fast` | Rust | 优化的 Rust 实现 |
| `kennytm-qrcode` | Rust | 社区流行的 Rust QRCode |

**测试维度**：

- 单条生成（short/medium/long/unicode）
- 批量生成（10/100/1000 条）
- SVG 输出
- 纠错级别（L/M/Q/H）

**运行命令**：

```bash
# 完整 PK 测试（包含 Rust benchmark，耗时约 5 分钟）
cd bench/backend-benchmark
npx tsx index.ts

# 快速 PK 测试（使用缓存的 Rust 结果）
npx tsx index-fast.ts
```

### 最新基准测试结果（2026-02-02）

#### 后端包性能对比

| 包 | 单条生成 (medium) | SVG 输出 | 纠错级别 H |
|---|------------------|----------|-----------|
| `@veaba/qrcode-fast` | 54,283 ops/s | 92,486 ops/s | 47,436 ops/s |
| `@veaba/qrcode-bun` | 18,902 ops/s | 18,003 ops/s | 20,170 ops/s |
| `@veaba/qrcode-node` | 12,078 ops/s | 10,150 ops/s | 11,179 ops/s |

#### Rust 包对比（@veaba/qrcode-rust vs kennytm-qrcode）

| 测试用例 | @veaba/qrcode-rust | kennytm-qrcode | 速度提升 |
|--------|-------------------|----------------|----------|
| Hello World (11B) | ~32.1 µs | ~210.4 µs | **6.6x** |
| Test QR Code 123 (17B) | ~41.3 µs | ~324.1 µs | **7.8x** |
| URL (31B) | ~53.2 µs | ~453.3 µs | **8.5x** |
| 长文本 (74B) | ~130.2 µs | ~826.2 µs | **6.2x** |

**结论**: `@veaba/qrcode-rust` 比 `kennytm-qrcode` 快 **6-9 倍**

> 权威数据: `docs/public/benchmark_speedup_verified.json`（端到端 SVG 生成，100 次平均）
> 复现: `cd bench/rust-tools && cargo run --release --bin verify-speedup`

#### SVG 验证结果

- ✅ `@veaba/qrcode-rust` - 生成的 SVG 可通过标准二维码扫描器正确解码
- ✅ `@veaba/qrcode-fast` - 生成的 SVG 可通过标准二维码扫描器正确解码
- ✅ 两个 Rust 包均覆盖 Version 1-40，H 级别最大可解码长度 1273 字节（QR 标准上限），长文本与实例复用均已验证

#### SVG 生成性能

> 权威口径：端到端 SVG 生成，同进程 100 次平均，产物经独立解码验证。
> 数据来源 `docs/public/benchmark_speedup_verified.json`，复现 `cargo run --release --bin verify-speedup`。

| 包 | 相对 kennytm 的速度 | 验证状态 |
|---|---------|---------|
| `kennytm-qrcode` | 1x (基准) | ✅ 全部通过 |
| `@veaba/qrcode-rust` | 快 6-9 倍 | ✅ 全长度通过（Version 1-40，最大 1273 字节 @ H） |
| `@veaba/qrcode-fast` | **快 9-19 倍** | ✅ 全长度通过（Version 1-40，最大 1273 字节 @ H） |

### 输出文件位置

所有基准测试结果保存在 `docs/public/` 目录：

| 文件 | 说明 | 大小(典型) |
|------|------|-----------|
| `frontend_benchmark_result.json` | 前端 @veaba/qrcode-js 测试结果 | ~2 KB |
| `benchmark_node_result.json` | Node.js 后端测试结果 | ~2.5 KB |
| `benchmark_bun_result.json` | Bun 后端测试结果 | ~2.8 KB |
| `backend_benchmark_pk.json` | PK 完整对比结果 | ~13 KB |
| `backend_benchmark_pk_summary.json` | PK 摘要结果 | ~7 KB |
| `benchmark_summary.json` | 所有测试汇总 | ~0.1 KB |
| `benchmark_svg_rust.json` | SVG 生成测试原始数据 | ~5 KB |

### bench 文档

- `/docs/bench/index.mdx` - 基准测试总览
- `/docs/bench/front-bench.mdx` - 前端包比较
- `/docs/bench/backend-bench.mdx` - 后端包比较（Node.js vs Bun）
- `/docs/bench/backend-pk.mdx` - PK 多包对比
- `/docs/bench/compare-rust.mdx` - Rust 包对比（kennytm vs qrcode-fast）
- `/docs/bench/svg-benchmark.mdx` - SVG 生成基准测试报告

## 测试

本项目使用 **Vitest** 作为测试框架，支持两种测试模式：

### 测试脚本

```bash
# 运行所有单元测试（Node.js 环境）
pnpm run test:unit

# 运行浏览器模式测试（真实 Chrome + WASM）
pnpm run test:browser

# 调试模式（显示浏览器窗口）
pnpm run test:browser:ui

# 监视模式
pnpm run test:watch

# 覆盖率报告
pnpm run test:coverage
```

### 测试模式说明

#### 1. 单元测试 (Node.js 环境)

- **配置文件**: `vitest.config.ts`
- **测试文件**: `tests/**/*.test.ts` (不包括 `.browser.test.ts`)
- **用途**: 测试 API 接口、类型定义、非 WASM 逻辑
- **特点**: 快速执行，无需浏览器环境

#### 2. 浏览器模式测试

- **配置文件**: `vitest.config.browser.ts`
- **测试文件**: `tests/**/*.browser.test.ts`
- **用途**: 测试 WASM 模块在真实浏览器环境中的功能
- **驱动**: Playwright + 系统 Chrome
- **配置要点**:
  - 使用系统 Chrome 路径避免下载浏览器
  - 配置 COOP/COEP 头支持 WASM
  - 自动加载和初始化 WASM 模块

### 测试文件结构

```
tests/
├── qrcode-js/                  # @veaba/qrcode-js 单元测试
├── qrcode-node/                # @veaba/qrcode-node 单元测试
├── qrcode-js-shared/              # @veaba/qrcode-js-shared 单元测试
├── qrcode-bun/                 # @veaba/qrcode-bun 单元测试
├── qrcode-wasm/
│   ├── index.test.ts           # WASM API 单元测试
│   ├── index.browser.test.ts   # WASM 浏览器模式测试 ⭐
│   └── pkg.test.ts             # WASM 构建产物测试
└── ...
```

### Rust 测试

```bash
# qrcode-rust 测试
cd packages/qrcode-rust && cargo test

# qrcode-fast 测试
cd packages/qrcode-fast && cargo test
```

### SVG 验证

使用 `bench/rust-tools` 中的工具验证生成的二维码：

```bash
cd bench/rust-tools

# 生成并验证 @veaba 二维码
cargo run --release --features validation --bin veaba-qr -- "Hello World"

# 验证 kennytm 二维码
cargo run --release --features validation --bin validate-qr -- "Hello World"
```

### 注意事项

1. **WASM 测试**: 浏览器模式测试需要 WASM 模块已构建 (`packages/qrcode-wasm/pkg/`)
2. **Chrome 路径**: macOS 使用 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
3. **测试隔离**: 单元测试和浏览器测试文件分开，避免重复执行
4. **输出文件**: 基准测试产生的 `svg` 文件和 `json` 放在 `/docs/public` 中

## 文档

- `/docs` 目录，包含文档，使用  `rspress` 来驱动
- `/docs/bench` 中包含下面文件
  - `/docs/bench/index.mdx` - 基准测试总览
  - `/docs/bench/front-bench.mdx` - 前端包比较
  - `/docs/bench/backend-bench.mdx` - 后端包比较
  - `/docs/bench/backend-pk.mdx` - PK 多包对比
  - `/docs/bench/compare-rust.mdx` - Rust 包对比
  - `/docs/bench/svg-benchmark.mdx` - SVG 生成基准测试
- `/docs` 中的 `.mdx` 可以使用  `react+markdown` 语法
- `/docs/public`目录，可以放一些必要的基准测试数据，比如对后端版本产生的 `json` 数据

## 更新记录

### 2026-02-07 (Vitest 浏览器模式配置)

- 配置 Vitest 浏览器模式测试 WASM 模块
  - 创建 `vitest.config.browser.ts` 浏览器测试配置
  - 使用 Playwright + 系统 Chrome 驱动测试
  - 配置 COOP/COEP 头支持 WASM 加载
- 创建 `tests/qrcode-wasm/index.browser.test.ts` 浏览器测试文件
  - 28 个功能测试覆盖 WASM 初始化、QRCode 生成、样式渲染、缓存系统
  - 优雅处理 WASM 未构建的情况
- 更新 `vitest.config.ts` 排除浏览器测试文件
- 添加 `test:browser` 和 `test:browser:ui` 脚本命令
- 更新 `README.md` 和 `skills/SKILL.md` 测试文档

### 2026-02-02

- 运行了完整的基准测试（Node.js、Bun、Rust）
- 修复了 `bench/rust-tools` 中的 crate 名称问题
- 验证了 `@veaba/qrcode-rust` 生成的 SVG 可正确解码
- 更新了所有 `docs/bench/*.mdx` 文档
- 更新了 `skills/BENCHMARK.md` 和 `skills/SKILL.md`

### 2026-02-02 (SVG 基准测试)

- 迁移基准测试脚本到 `bench/` 目录
  - `bench/scripts/run.js` - 统一基准测试入口
  - `bench/svg-benchmark/index.js` - SVG 测试主入口
  - `bench/svg-benchmark/rust.js` - Rust 包 SVG 测试
  - `bench/svg-benchmark/node-bun.js` - JS 包 SVG 测试
- 添加了 package.json scripts 命令
  - `pnpm bench:svg:rust:quick` - 快速测试
  - `pnpm bench:svg:rust` - 完整测试
- 创建了测试报告文档 `docs/bench/svg-benchmark.mdx`
- 输出路径规范
  - SVG 文件: `docs/bench/benchmark-output/`
  - JSON 报告: `docs/public/benchmark_svg_rust.json`
- 当时发现的问题（**均已于 2026-03-20 修复**）
  - `@veaba/qrcode-rust` 和 `@veaba/qrcode-fast` 在复杂文本上验证失败
  - Reed-Solomon 纠错码需要修复
  - 现状：两个包均覆盖 Version 1-40、H 级别最大可解码长度 1273 字节，产物经 rqrr 独立解码验证（详见 `docs/public/benchmark_speedup_verified.json` 的 `fixed_defects`）
