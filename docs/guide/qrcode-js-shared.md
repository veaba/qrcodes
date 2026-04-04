# @veaba/qrcode-js-shared

**注意：** 这是一个内部私有包，不对外发布。所有功能都通过其他公开包（`@veaba/qrcode-js`、`@veaba/qrcode-node`、`@veaba/qrcode-bun`）自动提供，无需单独安装。

共享核心库，包含 QRCode 生成的核心算法、类型定义和工具函数。所有其他包都依赖此库。

## 核心功能

### 1. QRCodeCore - 核心类

```typescript
import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-js';
// 功能通过公开包提供

// 创建 QRCode
const qr = new QRCodeCore('https://github.com/veaba/qrcodes', QRErrorCorrectLevel.H);

// 获取 SVG
const svg = qr.toSVG(256);

// 获取样式化 SVG
const styledSvg = qr.toStyledSVG({
  size: 256,
  borderRadius: 8,
  gradient: { color1: '#667eea', color2: '#764ba2' }
});
```

### 2. 预设样式函数

```typescript
import {
  generateRoundedQRCode,
  generateGradientQRCode,
  generateQRCodeWithLogoArea
} from '@veaba/qrcode-js';
// 功能通过公开包提供

// 圆角 QRCode
const svg1 = generateRoundedQRCode('https://github.com/veaba/qrcodes', 256, 8);

// 渐变 QRCode
const svg2 = generateGradientQRCode('https://github.com/veaba/qrcodes', 256, '#667eea', '#764ba2');

// 带 Logo 区域
const svg3 = generateQRCodeWithLogoArea('https://github.com/veaba/qrcodes', 256, 0.2);
```

### 3. 批量生成

```typescript
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-js';

const texts = ['url1', 'url2', 'url3'];

// 批量生成
const svgs = texts.map(text => {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toSVG(256);
});
```

## 类型定义

### QRCodeOptions

```typescript
interface QRCodeOptions {
  text: string;
  correctLevel?: QRErrorCorrectLevel;
  size?: number;
  colorDark?: string;
  colorLight?: string;
}
```

### StyledSVGOptions

```typescript
interface StyledSVGOptions {
  size?: number;
  colorDark?: string;
  colorLight?: string;
  borderRadius?: number;
  gradient?: { color1: string; color2: string } | null;
  quietZone?: number;
  logoRegions?: Array<{ row: number; col: number; size: number }>;
}
```

### QRCodeResult

```typescript
interface QRCodeResult {
  text: string;
  svg: string;
  moduleCount: number;
}
```

## 常量

### 纠错级别

```typescript
enum QRErrorCorrectLevel {
  L = 1,  // ~7% 容错
  M = 0,  // ~15% 容错
  Q = 3,  // ~25% 容错
  H = 2   // ~30% 容错
}
```

### QR 模式

```typescript
const QRMode = {
  MODE_8BIT_BYTE: 4
};
```

## 使用场景

### 1. 基础生成场景

```typescript
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-js';

// 电商网站：商品二维码
function getProductQRCode(productId: string) {
  const qr = new QRCode(`https://shop.com/p/${productId}`, QRErrorCorrectLevel.H);
  return qr.toSVG(256);
}
```

### 2. 批量生成场景

```typescript
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-bun';

// 活动门票：批量生成
const tickets = Array.from({ length: 1000 }, (_, i) => ({
  id: `TICKET-${i}`,
  url: `https://event.com/ticket/${i}`
}));

// 批量生成
const qrCodes = tickets.map(t => {
  const qr = new QRCode(t.url, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({ size: 256, borderRadius: 4 });
});
```

### 3. 服务端渲染

```typescript
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-node';

// Next.js / Nuxt.js 服务端渲染
export async function getServerSideProps() {
  const qr = new QRCode('https://github.com/veaba/qrcodes', QRErrorCorrectLevel.H);
  return {
    props: {
      qrSvg: qr.toSVG(256)
    }
  };
}
```

## 性能提示

1. **批量生成**：使用 `Array.map` 批量生成而不是循环调用单条生成
2. **异步处理**：大量生成时考虑使用异步处理避免阻塞主线程
3. **合理选择运行时**：根据场景选择 Node.js、Bun 或浏览器版本

## 架构位置

`@veaba/qrcode-js-shared` 是项目的内部核心库，所有 JavaScript/TypeScript 包都基于它构建。你不需要直接安装或导入此包，所有功能都通过公开包自动提供。

```
内部核心（私有，不对外发布）
└── @veaba/qrcode-js-shared
    ├── QRCodeCore (核心算法)
    ├── 预设样式函数
    └── 工具函数
         │
         ├──► @veaba/qrcode-js (浏览器 JS)
         ├──► @veaba/qrcode-node (Node.js)
         └──► @veaba/qrcode-bun (Bun)
```

## 公开包 API 统一

所有公开包提供一致的 API：

```typescript
// 任意公开包
import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-js';
// 或 import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-node';
// 或 import { QRCode, QRErrorCorrectLevel } from '@veaba/qrcode-bun';

const qr = new QRCode('text', QRErrorCorrectLevel.H);
const svg = qr.toSVG(256);
const styledSvg = qr.toStyledSVG({ size: 256, borderRadius: 8 });
```
