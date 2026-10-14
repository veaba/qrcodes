# SVG 性能基准测试

本目录包含 QRCode SVG 生成性能的基准测试脚本。

## 测试内容

对比以下包的 SVG 生成性能：

### Rust 包

- `kennytm-qrcode` - 社区参考实现
- `@veaba/qrcode-rust` - Rust 实现
- `@veaba/qrcode-fast` - 优化的 Rust 实现

### JavaScript 包

- `@veaba/qrcode-node` - Node.js 实现
- `@veaba/qrcode-bun` - Bun 实现

## 快速开始

```bash
# 运行所有 SVG 测试
pnpm bench:svg

# 仅运行 Rust 测试
pnpm bench:svg:rust
pnpm bench:svg:rust:quick    # 快速模式 (10次)

# 仅运行 JS 测试
pnpm bench:svg:js
pnpm bench:svg:js:node       # 仅 Node.js
pnpm bench:svg:js:bun        # 仅 Bun
```

## 直接运行

```bash
# 从项目根目录运行
node bench/svg-benchmark/index.js
node bench/svg-benchmark/rust.js
node bench/svg-benchmark/node-bun.js
```

## 五方对比（统一纠错级别 M）

三个 harness 的产物由采集器合并为一份数据文件，供文档页 `/bench/svg-benchmark` 的交互式图表读取：

```bash
# 一条命令跑完三个 harness 并写入 docs/public/benchmark_svg_five_way.json
pnpm bench:svg:five-way
```

| 文件 | 职责 |
| ---- | ---- |
| `collect-five-way.mjs` | 采集器：依次运行下列三个 harness，合并 JSON，并校验各用例模块数一致 |
| `five-way-js.mjs` | JS 侧测量器（`--target=node` / `--target=bun`，`--ec=M`） |
| `../rust-tools/src/bin/five_way_rust_m.rs` | Rust 侧测量器（fast / rust / kennytm，同进程，M 级） |

参数：

- `--skip-rust`：复用已编译的 Rust 产物，跳过 `cargo run`
- `--skip-bun`：未安装 Bun 时使用；图表会自动隐藏 Bun 行

> 采集器在两个 harness 的 stdout 中按 `===FIVEWAY_JSON_BEGIN===` / `===FIVEWAY_JSON_END===`
> 标记截取 JSON。若 harness 报错，请单独运行它查看原因。

## 输出文件

- **SVG 文件**: `docs/public/bench/benchmark-output/*.svg`
- **五方数据**: `docs/public/benchmark_svg_five_way.json`
- **Rust 三方专项**: `docs/public/benchmark_svg_rust.json`

## 测试说明

### Rust 测试

- 包含 SVG 生成和验证（使用 resvg + rqrr）
- 验证生成的二维码能否被正确扫描
- 支持快速模式（10次运行）和完整模式（100次运行）

### JavaScript 测试

- 仅测试 SVG 生成性能
- 不包含验证（需要额外的验证工具）
- 测试 Node.js 和 Bun 两个运行时

## 命令行选项

```bash
# Rust 测试
node bench/svg-benchmark/rust.js --quick       # 快速模式
node bench/svg-benchmark/rust.js --skip-build  # 跳过构建

# JS 测试
node bench/svg-benchmark/node-bun.js --node          # 仅 Node.js
node bench/svg-benchmark/node-bun.js --bun           # 仅 Bun
node bench/svg-benchmark/node-bun.js --all           # 全部运行
```
