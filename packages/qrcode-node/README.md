# @veaba/qrcode-node

Node.js 专用的 QRCode 生成器 - 纯 JavaScript 实现。

## 简介

基于 `@veaba/qrcode-js-shared` 核心库构建，专为 Node.js 环境优化，支持生成 SVG 和 PNG Buffer。

## 安装

```bash
npm install @veaba/qrcode-node
# 或
pnpm add @veaba/qrcode-node
# 或
yarn add @veaba/qrcode-node
```

## 特性

- 🚀 **Node.js 优化** - 纯 JavaScript 实现，无浏览器依赖
- 🖼️ **位图输出** - `toPNGBuffer()` 返回 **BMP** 格式 Buffer（注意：函数名是历史命名，实际不是 PNG）
- 🚀 **SVG 支持** - 生成矢量图形
- 🚀 **高性能** - 使用 Uint8Array 优化内存
- 🚀 **多种样式** - 内置多种流行风格
- 🚀 **TypeScript** - 完整的类型支持

## 使用方法

### 基础用法

```typescript
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-node';

// 创建 QRCode 实例
const qr = new QRCode('Hello World', QRErrorCorrectLevel.H);

// 生成 SVG
const svg = qr.toSVG(256);

// 生成位图 Buffer（⚠️ 实际是 BMP，不是 PNG）
const bmpBuffer = qr.toPNGBuffer(256);

// 保存到文件
import { writeFileSync } from 'fs';
writeFileSync('qrcode.svg', svg);
writeFileSync('qrcode.bmp', bmpBuffer);   // 注意扩展名是 .bmp
```

### 样式生成

```typescript
import {
  generateRoundedQRCode,
  generateGradientQRCode,
  generateWechatStyleQRCode,
  generateDouyinStyleQRCode
} from '@veaba/qrcode-node';

// 圆角二维码
const svg1 = generateRoundedQRCode('Hello', 256, 8);

// 渐变二维码
const svg2 = generateGradientQRCode('Hello', 256, '#667eea', '#764ba2');

// 微信风格
const svg3 = generateWechatStyleQRCode('Hello');

// 抖音风格
const svg4 = generateDouyinStyleQRCode('Hello');
```

### 支持的样式

| 函数 | 说明 |
|------|------|
| `generateRoundedQRCode(text, size, radius)` | 圆角二维码 |
| `generateQRCodeWithLogoArea(text, size, logoRatio)` | 带 Logo 区域 |
| `generateGradientQRCode(text, size, color1, color2)` | 渐变二维码 |
| `generateWechatStyleQRCode(text, size)` | 微信风格（绿色） |
| `generateDouyinStyleQRCode(text, size)` | 抖音风格（蓝红渐变） |
| `generateAlipayStyleQRCode(text, size)` | 支付宝风格 |
| `generateXiaohongshuStyleQRCode(text, size)` | 小红书风格（红色） |
| `generateCyberpunkStyleQRCode(text, size)` | 赛博朋克风格 |
| `generateRetroStyleQRCode(text, size)` | 复古风格 |
| `generateMinimalStyleQRCode(text, size)` | 极简风格 |

### 自定义样式

```typescript
const qr = new QRCode('Hello World');

const svg = qr.toStyledSVG({
  size: 256,
  colorDark: '#000000',      // 深色颜色
  colorLight: '#ffffff',     // 浅色颜色
  borderRadius: 8,           // 圆角半径
  quietZone: 2,              // 静默区大小
  gradient: {                // 渐变（可选）
    color1: '#667eea',
    color2: '#764ba2'
  }
});
```

### 批量和异步生成

```typescript
import {
  generateBatchQRCodes,
  generateQRCodeAsync,
  generateBatchAsync
} from '@veaba/qrcode-node';

// 批量生成
const texts = ['text1', 'text2', 'text3'];
const svgs = generateBatchQRCodes(texts, { size: 256 });

// 异步生成
const svg = await generateQRCodeAsync('Hello', { size: 256 });

// 批量异步生成
const svgs = await generateBatchAsync(['text1', 'text2'], { size: 256 });
```

### 完整示例：生成并保存文件

```typescript
import { QRCode, generateGradientQRCode } from '@veaba/qrcode-node';
import { writeFileSync } from 'fs';
import { join } from 'path';

// 生成基础二维码
const qr = new QRCode('https://github.com/veaba/qrcodes');
const svg = qr.toSVG(512);
writeFileSync(join(process.cwd(), 'qrcode.svg'), svg);

// 生成渐变二维码
const gradientSvg = generateGradientQRCode(
  'https://github.com/veaba/qrcodes',
  512,
  '#667eea',
  '#764ba2'
);
writeFileSync(join(process.cwd(), 'qrcode-gradient.svg'), gradientSvg);

// 生成位图
const bmpBuffer = qr.toPNGBuffer(512);
writeFileSync(join(process.cwd(), 'qrcode.bmp'), bmpBuffer);

console.log('QRCode 生成完成！');
```

## API 文档

### QRCode 类

#### 构造函数

```typescript
new QRCode(text: string, correctLevel?: QRErrorCorrectLevel)
```

#### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `isDark(row: number, col: number)` | `boolean` | 检查指定位置是否为黑色模块 |
| `getModuleCount()` | `number` | 获取模块数量 |
| `toSVG(size?: number)` | `string` | 生成 SVG |
| `toStyledSVG(options?: StyledSVGOptions)` | `string` | 生成带样式的 SVG |
| `toPNGBuffer(size?: number)` | `Buffer` | 生成位图 Buffer（**BMP 格式**，非 PNG） |

### 类型定义

```typescript
enum QRErrorCorrectLevel {
  L = 1,  // 低 (~7%)
  M = 0,  // 中 (~15%)
  Q = 3,  // 较高 (~25%)
  H = 2   // 高 (~30%)
}

interface StyledSVGOptions {
  size?: number;
  colorDark?: string;
  colorLight?: string;
  borderRadius?: number;
  gradient?: { color1: string; color2: string } | null;
  quietZone?: number;
}
```

## 依赖

- `@veaba/qrcode-js-shared` - 核心共享库

## 性能测试

基准测试位于 `bench/backend-benchmark`：

```bash
cd bench/backend-benchmark
npx tsx index.ts        # 完整测试
npx tsx index-fast.ts   # 快速测试
```

## 环境要求

- Node.js >= 16.0.0（见 `package.json` 的 `engines`）

## License

MIT

## 历史迁移

- **2026-02-06**: 基准测试从 `packages/qrcode-node/benchmark/` 迁移至 `bench/backend-benchmark`，保持包目录干净。
