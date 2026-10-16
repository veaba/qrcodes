# @veaba/qrcode-wasm

WebAssembly QRCode 生成器 - 基于 Rust 编译，提供优秀的 QRCode 生成性能。

## 简介

基于 Rust 实现并编译为 WebAssembly 的 QRCode 生成器，提供接近原生的执行速度。

与 `@veaba/qrcode-js` 提供**完全一致的 API**，方便在两个包之间无缝切换。

## 特性

- ⚡ **高性能** - Rust + WASM 提供接近原生的执行速度
- 💾 **可选缓存** - LRU 缓存支持，重复文本性能提升 10 倍+
- 🎨 **丰富样式** - 支持 10+ 种个性样式
- 📦 **批量生成** - 支持批量异步生成
- 🖼️ **SVG 输出** - 生成矢量图形，清晰锐利
- 🔧 **TypeScript 支持** - 包含类型定义文件
- 🔄 **API 统一** - 与 `@veaba/qrcode-js` 完全一致的 API

> ⚠️ **关于并行**：Cargo 中 `parallel` feature 默认**未启用**
> （`default = ['console_error_panic_hook']`），且构建脚本未传入该 feature。
> 常规构建产物不含多线程能力。`init_thread_pool` / `is_parallel_supported`
> 仅在以 `--features parallel` 自行构建后才可用。

## 安装

```bash
npm install @veaba/qrcode-wasm
# 或
pnpm add @veaba/qrcode-wasm
# 或
yarn add @veaba/qrcode-wasm
```

## 使用方法

### 自动检测构建工具

`@veaba/qrcode-wasm` 现在**自动检测** Vite、Webpack、Parcel 等构建工具环境：

- **Vite**: 自动使用 `?url` 导入 WASM 文件
- **Webpack/Parcel**: 使用默认 WASM 加载方式
- **无需配置**: 所有环境使用相同的 API

### 基础用法（统一 API）

```typescript
import { initWasm, QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-wasm';

// 初始化 WASM（自动检测 Vite/Webpack/Parcel 环境）
await initWasm();

// 创建 QRCode 实例（与 qrcode-js 相同的 API）
const qr = new QRCodeCore('Hello World', QRErrorCorrectLevel.H);

// 获取 SVG
const svg = qr.toSVG(256);

// 插入到页面
document.getElementById('qrcode').innerHTML = svg;
```

### 使用缓存（推荐）

```typescript
import {
  initWasm,
  generateRoundedQRCodeCached,
  clearQRCodeCache,
  getCacheStats 
} from '@veaba/qrcode-wasm';

await initWasm();

// 第一次生成会缓存
const svg1 = generateRoundedQRCodeCached('https://example.com', 256, 8);

// 第二次生成直接从缓存读取，速度提升 10 倍+
const svg2 = generateRoundedQRCodeCached('https://example.com', 256, 8);

// 查看缓存状态
console.log(getCacheStats()); // { size: 1, maxSize: 100, keys: [...] }

// 清空缓存
clearQRCodeCache();
```

### 样式化二维码

```typescript
import {
  initWasm,
  generateWechatStyleQRCode,
  generateDouyinStyleQRCode,
  generateCyberpunkStyleQRCode 
} from '@veaba/qrcode-wasm';

await initWasm();

// 微信风格
const wechatQR = generateWechatStyleQRCode('https://weixin.qq.com', 256);

// 抖音风格
const douyinQR = generateDouyinStyleQRCode('https://douyin.com', 256);

// 赛博朋克风格
const cyberQR = generateCyberpunkStyleQRCode('https://example.com', 256);
```

### 批量生成

```typescript
import { initWasm, generateBatchQRCodes, generateBatchQRCodesCached } from '@veaba/qrcode-wasm';

await initWasm();

const texts = [
  'https://example.com/1',
  'https://example.com/2',
  // ... 更多
];

// 非缓存版本
const svgs = generateBatchQRCodes(texts, { size: 256 });

// 缓存版本
const svgsCached = generateBatchQRCodesCached(texts, { size: 256 });
```

### 异步生成

```typescript
import { initWasm, generateQRCodeAsync, generateBatchAsync } from '@veaba/qrcode-wasm';

await initWasm();

// 单个异步生成
const result = await generateQRCodeAsync('https://example.com', {
  size: 256,
  cache: true // 启用缓存
});
console.log(result.svg);

// 批量异步生成
const results = await generateBatchAsync(texts, {
  size: 256,
  cache: true
});
```

## 底层 WASM API（可选）

如果需要更底层的控制，可使用 `QRCodeGenerator`：

```typescript
import { initWasm, QRCodeGenerator, CorrectLevel } from '@veaba/qrcode-wasm';

await initWasm();

// 创建可复用的生成器
const gen = new QRCodeGenerator();

// 设置选项
gen.set_options(256, 256, CorrectLevel.H);

// 生成单个 QRCode
gen.generate('https://github.com/veaba/qrcodes/1');
const svg1 = gen.get_svg();

// 复用同一实例生成另一个（性能更好）
gen.generate('https://github.com/veaba/qrcodes/2');
const svg2 = gen.get_svg();
```

> **说明**：`QRCodeGenerator` 是 `index.ts` 中唯一对外导出的底层生成器。
> Rust 侧的 `QRCodeWasm` 与 `CanvasRenderer` **未从 TypeScript 入口 re-export**，
> 因此无法从 `@veaba/qrcode-wasm` 直接 import。
> 需要这两者请直接使用 `pkg/` 下的 wasm 产物，或自行扩展 `src/index.ts` 的导出。

## API

### 统一 API（与 qrcode-js 一致）

| 类/函数 | 说明 |
|---------|------|
| `QRCodeCore` | 核心 QRCode 类 |
| `QRErrorCorrectLevel` | 纠错级别枚举 |
| `generateRoundedQRCode` / `generateRoundedQRCodeCached` | 圆角二维码 |
| `generateGradientQRCode` / `generateGradientQRCodeCached` | 渐变二维码 |
| `generateWechatStyleQRCode` / `generateWechatStyleQRCodeCached` | 微信风格 |
| `generateDouyinStyleQRCode` / `generateDouyinStyleQRCodeCached` | 抖音风格 |
| `generateBatchQRCodes` / `generateBatchQRCodesCached` | 批量生成 |
| `generateQRCodeAsync` | 异步生成 |
| `getCachedQRCode` | 获取缓存 |
| `clearQRCodeCache` | 清空缓存 |

### 底层 WASM API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `new()` | 创建实例 | `QRCodeWasm` |
| `with_options(w, h, level)` | 带选项创建 | `QRCodeWasm` |
| `make_code(text)` | 生成 QRCode | `void` |
| `get_svg()` | 获取 SVG | `string` |
| `get_module_count()` | 获取模块数 | `number` |
| `get_modules_json()` | 获取模块数据 | `string` |
| `is_dark(row, col)` | 判断模块颜色 | `boolean` |

## 与 @veaba/qrcode-js 的对比

| 特性 | @veaba/qrcode-wasm | @veaba/qrcode-js |
|------|-------------------|------------------|
| 初始化 | 需要异步 | 即时 |
| 兼容性 | 现代浏览器 | 现代浏览器 |
| API | 统一 ✅ | 统一 ✅ |

选择 `@veaba/qrcode-wasm`：

- ✅ 高频批量生成
- ✅ 希望与 Rust 侧共用同一套编码实现
- ✅ 现代浏览器环境

选择 `@veaba/qrcode-js`：

- ✅ 不想处理 WASM 的异步初始化
- ✅ 对包体积敏感

## 性能

本 README **不再维护独立的性能数字**。历史版本曾列出 `ops/s` 对比表，
但未注明可复现命令，已随实现演进失效。

- 权威数据：[`docs/public/benchmark_speedup_verified.json`](../../docs/public/benchmark_speedup_verified.json)
- Rust 侧复现：`cd bench/rust-tools && cargo run --release --bin verify-speedup`
- 前端各包互比：见 `bench/frontend-benchmark/README.md`

## 开发

### 环境要求

- Rust
- wasm-pack
- Node.js

### 构建

```bash
# 安装 wasm-pack
cargo install wasm-pack

# 构建 WASM
wasm-pack build --target web

# 构建 Node.js 版本
wasm-pack build --target nodejs
```

### 运行测试

```bash
# Rust 测试
cargo test

# TypeScript 测试
npm test
```

### 构建发布版本

```bash
# 优化构建
wasm-pack build --release --target web
```

## 性能测试

基准测试已迁移到 `bench/frontend-benchmark`：

```bash
cd bench/frontend-benchmark
node benchmark.cjs           # 测试 qrcode-js
npx tsx wasm.benchmark.ts    # 测试 qrcode-wasm
cargo run --bin benchmark    # 测试 Rust 原生性能
```

## 相关包

- `@veaba/qrcode-js` - 纯 JavaScript 版本（API 一致）
- `@veaba/qrcode-node` - Node.js 版本
- `@veaba/qrcode-bun` - Bun 运行时版本
- `@veaba/qrcode-js-shared` - 共享核心库

## License

MIT

## 历史迁移

- **2026-02-06**: 基准测试从 `packages/qrcode-wasm/benchmark/` 和 `packages/qrcode-wasm/src/bin/benchmark.rs` 迁移至 `bench/frontend-benchmark/`，保持包目录干净。
