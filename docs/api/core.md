# QRCodeCore

`QRCodeCore` 是项目的核心 QRCode 生成类。它通过以下公开包提供：

- **`@veaba/qrcode-js`** - 浏览器环境
- **`@veaba/qrcode-node`** - Node.js 环境
- **`@veaba/qrcode-bun`** - Bun 环境

所有公开包都导出相同的 API，`QRCodeCore` 是内部私有包 `@veaba/qrcode-js-shared` 的核心类。

## 构造函数

```typescript
constructor(
  text: string,
  correctLevel: QRErrorCorrectLevel = QRErrorCorrectLevel.H
)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | `string` | 是 | 要编码的文本 |
| `correctLevel` | `QRErrorCorrectLevel` | 否 | 纠错级别，默认 `H` |

### 示例

```typescript
// 浏览器环境
import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-js';

// Node.js 环境
// import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-node';

// Bun 环境
// import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-bun';

// 默认纠错级别 H
const qr1 = new QRCodeCore('https://github.com/veaba/qrcodes');

// 指定纠错级别
const qr2 = new QRCodeCore('https://github.com/veaba/qrcodes', QRErrorCorrectLevel.M);
```

## 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `text` | `string` | 编码的文本 |
| `correctLevel` | `QRErrorCorrectLevel` | 纠错级别 |
| `typeNumber` | `number` | QRCode 版本号 (1-40) |
| `moduleCount` | `number` | 模块数量 (17 + 4 * typeNumber) |
| `modules` | `Uint8Array` | 模块数据（一维数组） |

## 方法

### toSVG

生成 SVG 字符串。

```typescript
toSVG(size: number = 256): string
```

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `size` | `number` | 否 | SVG 尺寸，默认 256 |

#### 返回值

`string` - SVG XML 字符串

#### 示例

```typescript
const qr = new QRCodeCore('https://github.com/veaba/qrcodes');

// 默认 256x256
const svg1 = qr.toSVG();

// 自定义尺寸
const svg2 = qr.toSVG(512);
```

#### 输出示例

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" fill="white"/>
  <path d="M0,0h8v8h-8zM8,0h8v8h-8z..." fill="black"/>
</svg>
```

### toStyledSVG

生成带样式的 SVG 字符串。

```typescript
toStyledSVG(options: StyledSVGOptions = {}): string
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `size` | `number` | 否 | 256 | SVG 尺寸 |
| `colorDark` | `string` | 否 | '#000000' | 深色模块颜色 |
| `colorLight` | `string` | 否 | '#ffffff' | 浅色模块颜色 |
| `borderRadius` | `number` | 否 | 0 | 圆角半径 |
| `gradient` | `object\|null` | 否 | null | 渐变色配置 |
| `quietZone` | `number` | 否 | 0 | 静默区大小（模块数） |
| `logoRegions` | `array` | 否 | [] | Logo 留白区域 |

#### 示例

```typescript
const qr = new QRCodeCore('https://github.com/veaba/qrcodes');

// 基础样式
const svg1 = qr.toStyledSVG({
  size: 256,
  colorDark: '#000000',
  colorLight: '#ffffff'
});

// 圆角 QRCode
const svg2 = qr.toStyledSVG({
  size: 256,
  borderRadius: 8
});

// 渐变 QRCode
const svg3 = qr.toStyledSVG({
  size: 256,
  gradient: {
    color1: '#667eea',
    color2: '#764ba2'
  }
});

// 带 Logo 区域
const svg4 = qr.toStyledSVG({
  size: 256,
  quietZone: 2,
  logoRegions: [{ row: 8, col: 8, size: 5 }]
});
```

### getModuleCount

获取 QRCode 模块数量。

```typescript
getModuleCount(): number
```

#### 返回值

`number` - 模块数量（例如：Version 2 为 25）

#### 示例

```typescript
const qr = new QRCodeCore('https://github.com/veaba/qrcodes');
console.log(qr.getModuleCount()); // 25
```

### isDark

判断指定位置的模块是否为深色。

```typescript
isDark(row: number, col: number): boolean
```

#### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `row` | `number` | 行索引（0 到 moduleCount-1） |
| `col` | `number` | 列索引（0 到 moduleCount-1） |

#### 返回值

`boolean` - true 表示深色，false 表示浅色

#### 示例

```typescript
const qr = new QRCodeCore('https://github.com/veaba/qrcodes');
const count = qr.getModuleCount();

// 遍历所有模块
for (let row = 0; row < count; row++) {
  for (let col = 0; col < count; col++) {
    if (qr.isDark(row, col)) {
      console.log(`Dark module at (${row}, ${col})`);
    }
  }
}
```

### toTerminal

将 QRCode 渲染为终端可显示的字符画。每个模块使用 2 个字符宽度，以补偿终端字符的高宽比（约 2:1）。

```typescript
toTerminal(invert = false, quietZone = 1): string
```

#### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `invert` | `boolean` | `false` | 是否反转颜色 |
| `quietZone` | `number` | `1` | 静区大小（模块数） |

#### 返回值

`string` - 终端字符画字符串

#### 示例

```typescript
const qr = new QRCodeCore('https://example.com');

// 标准终端输出
console.log(qr.toTerminal());

// 反转颜色（白底黑字）
console.log(qr.toTerminal(true));

// 大静区
console.log(qr.toTerminal(false, 3));
```

#### 输出示例

```
  ██████████████    ██████████████    ██████████████
  ██          ██  ██  ██████  ██████  ██          ██
  ██  ██████  ██      ████      ████  ██  ██████  ██
  ██  ██████  ██        ████  ████    ██  ██████  ██
  ██  ██████  ██  ██        ██████    ██  ██████  ██
  ██          ██          ████████    ██          ██
  ██████████████  ██  ██  ██  ██  ██  ██████████████
```

### toTerminalBraille

使用 Braille 字符渲染更紧凑的终端二维码。每个 Braille 字符表示 2x4 像素（宽 x 高），输出高度约为标准终端的 1/4。

```typescript
toTerminalBraille(): string
```

#### 返回值

`string` - Braille 字符画字符串

#### 示例

```typescript
const qr = new QRCodeCore('https://example.com');
console.log(qr.toTerminalBraille());
```

#### 输出示例

```
⠟⣝⠝⠏⡌⡒⢱⢮⠃⠟⣝⠝⠏
⡇⡕⡅⠇⠟⠥⠔⠮⠍⡇⡕⡅⠇
⣭⣕⢿⠅⡎⢪⣡⣄⠬⣹⡑⡡⠌
```

### toTerminalColor

带颜色的终端输出（使用 ANSI 转义序列）。

```typescript
toTerminalColor(fgColor = 'black', bgColor = 'white'): string
```

#### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fgColor` | `string` | `'black'` | 前景色（深色模块颜色） |
| `bgColor` | `string` | `'white'` | 背景色（浅色模块颜色） |

#### 支持的颜色

`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`

#### 返回值

`string` - 带 ANSI 颜色的终端字符画

#### 示例

```typescript
const qr = new QRCodeCore('https://example.com');

// 绿色前景
console.log(qr.toTerminalColor('green'));

// 蓝色前景，黄色背景
console.log(qr.toTerminalColor('blue', 'yellow'));
```

## 静态方法

`QRCodeCore` 没有静态方法，但公开包提供了相关的工具函数（如 `generateBatchQRCodes`）。

## 完整示例

### 基础使用

```typescript
import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-js';
// Node.js: import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-node';

const qr = new QRCodeCore('https://github.com/veaba/qrcodes', QRErrorCorrectLevel.H);

// 获取基础 SVG
const svg = qr.toSVG(256);
document.getElementById('qrcode').innerHTML = svg;
```

### 自定义样式

```typescript
import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-js';

const qr = new QRCodeCore('https://github.com/veaba/qrcodes', QRErrorCorrectLevel.H);

const styledSvg = qr.toStyledSVG({
  size: 300,
  colorDark: '#1a1a1a',
  colorLight: '#f5f5f5',
  borderRadius: 12,
  quietZone: 4,
  gradient: {
    color1: '#667eea',
    color2: '#764ba2'
  }
});

document.getElementById('qrcode').innerHTML = styledSvg;
```

### 自定义渲染

```typescript
import { QRCodeCore, QRErrorCorrectLevel } from '@veaba/qrcode-js';

const qr = new QRCodeCore('https://github.com/veaba/qrcodes', QRErrorCorrectLevel.H);
const count = qr.getModuleCount();

// 创建 Canvas 自定义渲染
const canvas = document.createElement('canvas');
canvas.width = count * 10;
canvas.height = count * 10;
const ctx = canvas.getContext('2d')!;

for (let row = 0; row < count; row++) {
  for (let col = 0; col < count; col++) {
    ctx.fillStyle = qr.isDark(row, col) ? '#000' : '#fff';
    ctx.fillRect(col * 10, row * 10, 10, 10);
  }
}

document.body.appendChild(canvas);
```

## 性能提示

1. **复用实例**：如果只需要改变样式而不改变内容，复用同一个实例
2. **使用缓存**：对于重复文本，使用 `getCachedQRCode`
3. **批量生成**：使用 `generateBatchQRCodes` 而不是循环创建实例

```typescript
// 不推荐：循环创建
const svgs = texts.map(text => {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toSVG(256);
});

// 推荐：批量生成
import { generateBatchQRCodes } from '@veaba/qrcode-js';
// Node.js: import { generateBatchQRCodes } from '@veaba/qrcode-node';
const svgs = generateBatchQRCodes(texts, { size: 256 });
```
