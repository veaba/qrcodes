# @veaba/qrcode-js-shared

QRCode 生成器的共享核心库（私有包）。

## 简介

这是一个**私有子包**（`"private": true`），为以下包提供共享的核心功能：

- `@veaba/qrcode-js` - 浏览器 JavaScript 版本
- `@veaba/qrcode-wasm` - WebAssembly 版本
- `@veaba/qrcode-node` - Node.js 版本
- `@veaba/qrcode-bun` - Bun 运行时版本

## 核心功能

### 数学运算

- **QRMath** - Galois Field 数学运算（对数/指数表）
- **Polynomial** - 多项式类（乘法、取模运算）

### 常量

- **QRMode** - QRCode 模式常量
- **QRErrorCorrectLevel** - 错误纠正级别枚举（L, M, Q, H）
- **PATTERN_POSITION_TABLE** - 位置调整图案位置表
- **QRCodeLimitLength** - 容量表
- **RS_BLOCK_TABLE** - RS 块表

### 核心类

#### QRCodeCore

QRCode 核心实现类，使用 Uint8Array 优化内存使用。

```typescript
import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-js-shared';

const qr = new QRCodeCore('Hello World', QRErrorCorrectLevel.H);

// 获取模块数量
const count = qr.getModuleCount();

// 检查某个位置是否为黑色模块
const isDark = qr.isDark(row, col);

// 生成 SVG
const svg = qr.toSVG(256);

// 生成带样式的 SVG
const styledSvg = qr.toStyledSVG({
  size: 256,
  colorDark: '#000000',
  colorLight: '#ffffff',
  borderRadius: 8,
  quietZone: 2
});
```

### 样式化生成函数

```typescript
import {
  generateRoundedQRCode,
  generateGradientQRCode,
  generateWechatStyleQRCode,
  generateDouyinStyleQRCode,
  // ... 更多
} from '@veaba/qrcode-js-shared';

// 圆角二维码
const svg1 = generateRoundedQRCode('Hello', 256, 8);

// 渐变二维码
const svg2 = generateGradientQRCode('Hello', 256, '#667eea', '#764ba2');

// 微信风格
const svg3 = generateWechatStyleQRCode('Hello');

// 抖音风格
const svg4 = generateDouyinStyleQRCode('Hello');
```

### 批量/异步生成

```typescript
import {
  generateBatchQRCodes,
  generateQRCodeAsync,
  generateBatchAsync
} from '@veaba/qrcode-js-shared';

// 批量生成
const svgs = generateBatchQRCodes(['text1', 'text2', 'text3']);

// 异步生成
const svg = await generateQRCodeAsync('Hello');

// 批量异步生成
const svgs = await generateBatchAsync(['text1', 'text2']);
```

### 缓存系统

```typescript
import {
  getCachedQRCode,
  clearQRCodeCache,
  getCacheStats,
  configureCache,
  generateRoundedQRCodeCached
} from '@veaba/qrcode-js-shared';

// 获取缓存的 QRCode
const qr = getCachedQRCode('text', QRErrorCorrectLevel.H);

// 使用缓存的样式生成
const svg = generateRoundedQRCodeCached('text', 256, 8);

// 查看缓存统计
const stats = getCacheStats();
console.log(stats); // { size: 1, maxSize: 100, keys: [...] }

// 清空缓存
clearQRCodeCache();

// 配置缓存
configureCache({ maxSize: 200, enabled: true });
```

## 技术特点

- **TypedArray 优化**: 使用 Uint8Array 代替二维数组，内存更高效
- **SVG Path 合并**: 减少 DOM 节点数，提升渲染性能
- **LRU 缓存**: 内置缓存系统（`configureCache` 可配置 `maxSize` / `enabled`）
- **TypeScript 支持**: 完整的类型定义
- **单一实现**: `@veaba/qrcode-js`、`@veaba/qrcode-node` 等包均复用此处实现

> 性能数字不在此维护。权威数据见
> [`docs/public/benchmark_speedup_verified.json`](../../docs/public/benchmark_speedup_verified.json)。

## 注意事项

这是一个**私有包**（`"private": true`），不对外发布到 npm，仅供 workspace 内部使用。

如需在项目中使用，请安装以下公开包之一：

- `@veaba/qrcode-js` - 浏览器 JavaScript 版本
- `@veaba/qrcode-wasm` - WebAssembly 版本
- `@veaba/qrcode-node` - Node.js 版本
- `@veaba/qrcode-bun` - Bun 运行时版本

## 相关包

- `@veaba/qrcode-js` - 浏览器 JavaScript 版本
- `@veaba/qrcode-wasm` - WebAssembly 版本
- `@veaba/qrcode-node` - Node.js 版本
- `@veaba/qrcode-bun` - Bun 运行时版本
- `@veaba/qrcode-rust` - 纯 Rust 版本
- `@veaba/qrcode-fast` - 高性能 Rust 版本

## License

MIT
