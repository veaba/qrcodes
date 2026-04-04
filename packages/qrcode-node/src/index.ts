/**
 * @veaba/qrcode-node - Pure JavaScript QRCode generator for Node.js
 * 
 * Backend unified API implementation for Node.js runtime.
 * Provides consistent API with qrcode-bun and qrcode-rust.
 */

import {
  QRCodeCore,
  QRErrorCorrectLevel,
  QRMode,
  QRCodeOptions,
  StyledSVGOptions,
  QRCodeResult,
  IQRCode,
  INodeQRCode,
  generateRoundedQRCode as _generateRoundedQRCode,
  generateQRCodeWithLogoArea as _generateQRCodeWithLogoArea,
  generateGradientQRCode as _generateGradientQRCode,
  generateWechatStyleQRCode as _generateWechatStyleQRCode,
  generateDouyinStyleQRCode as _generateDouyinStyleQRCode,
  generateAlipayStyleQRCode as _generateAlipayStyleQRCode,
  generateXiaohongshuStyleQRCode as _generateXiaohongshuStyleQRCode,
  generateCyberpunkStyleQRCode as _generateCyberpunkStyleQRCode,
  generateRetroStyleQRCode as _generateRetroStyleQRCode,
  generateMinimalStyleQRCode as _generateMinimalStyleQRCode,
  generateBatchQRCodes as _generateBatchQRCodes,
  generateQRCodeAsync as _generateQRCodeAsync,
  generateBatchAsync as _generateBatchAsync,
} from '@veaba/qrcode-js-shared';

// ============================================
// 导出统一常量
// ============================================
export { QRErrorCorrectLevel, QRMode };
export type { QRCodeOptions, StyledSVGOptions, QRCodeResult, IQRCode, INodeQRCode };

// ============================================
// QRCode 类 - 统一接口实现
// ============================================

export class QRCode implements INodeQRCode {
  private _core: QRCodeCore;

  constructor(text: string, correctLevel: QRErrorCorrectLevel = QRErrorCorrectLevel.H) {
    this._core = new QRCodeCore(text, correctLevel);
  }

  // ----- 统一属性 -----
  get text(): string { return this._core.text; }
  get correctLevel(): QRErrorCorrectLevel { return this._core.correctLevel; }
  get typeNumber(): number { return this._core.typeNumber; }
  get moduleCount(): number { return this._core.moduleCount; }

  // ----- 统一方法 -----
  isDark(row: number, col: number): boolean {
    return this._core.isDark(row, col);
  }

  getModuleCount(): number {
    return this._core.getModuleCount();
  }

  toSVG(size: number = 256): string {
    return this._core.toSVG(size);
  }

  toStyledSVG(options: StyledSVGOptions = {}): string {
    return this._core.toStyledSVG(options);
  }

  // ----- 终端显示方法 -----
  /**
   * 将 QRCode 渲染为终端可显示的字符画
   * @param invert - 是否反转颜色（默认 false）
   * @param quietZone - 静区大小（默认 1）
   * @returns 终端字符画字符串
   */
  toTerminal(invert = false, quietZone = 1): string {
    return this._core.toTerminal(invert, quietZone);
  }

  /**
   * 使用 Braille 字符渲染更紧凑的终端二维码
   * @returns Braille 字符画字符串
   */
  toTerminalBraille(): string {
    return this._core.toTerminalBraille();
  }

  /**
   * 带颜色的终端输出（使用 ANSI 转义序列）
   * @param fgColor - 前景色（深色模块颜色）
   * @param bgColor - 背景色（浅色模块颜色）
   * @returns 带 ANSI 颜色的终端字符画
   */
  toTerminalColor(fgColor = 'black', bgColor = 'white'): string {
    return this._core.toTerminalColor(fgColor, bgColor);
  }

  // ----- Node.js 特有方法 -----
  toPNGBuffer(size: number = 256): Buffer {
    const cellSize = Math.floor(size / this._core.moduleCount);
    const actualSize = cellSize * this._core.moduleCount;

    // Create simple bitmap data
    const rowSize = Math.ceil(actualSize / 8) * 8;
    const imageSize = rowSize * actualSize;
    const fileSize = 54 + imageSize;

    const buffer = Buffer.alloc(fileSize);

    // BMP file header
    buffer.write('BM', 0); // Signature
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(54, 10); // Data offset

    // DIB header
    buffer.writeUInt32LE(40, 14); // DIB header size
    buffer.writeInt32LE(actualSize, 18); // Width
    buffer.writeInt32LE(actualSize, 22); // Height
    buffer.writeUInt16LE(1, 26); // Color planes
    buffer.writeUInt16LE(24, 28); // Bits per pixel
    buffer.writeUInt32LE(0, 30); // Compression
    buffer.writeUInt32LE(imageSize, 34); // Image size
    buffer.writeInt32LE(2835, 38); // Horizontal resolution
    buffer.writeInt32LE(2835, 42); // Vertical resolution
    buffer.writeUInt32LE(0, 46); // Colors
    buffer.writeUInt32LE(0, 50); // Important colors

    // Pixel data (bottom to top)
    let offset = 54;
    for (let y = actualSize - 1; y >= 0; y--) {
      const row = Math.floor(y / cellSize);
      for (let x = 0; x < actualSize; x++) {
        const col = Math.floor(x / cellSize);
        const isDark = row < this._core.moduleCount && col < this._core.moduleCount && this._core.isDark(row, col);
        const color = isDark ? 0 : 255;
        buffer[offset++] = color; // B
        buffer[offset++] = color; // G
        buffer[offset++] = color; // R
      }
      // Padding to 4-byte boundary
      while ((offset - 54) % 4 !== 0) {
        buffer[offset++] = 0;
      }
    }

    return buffer;
  }
}

// ============================================
// 样式化 QRCode 生成函数 - 统一命名
// ============================================

export function generateRoundedQRCode(text: string, size: number = 256, radius: number = 8): string {
  return _generateRoundedQRCode(text, size, radius);
}

export function generateQRCodeWithLogoArea(text: string, size: number = 256, logoRatio: number = 0.2): string {
  return _generateQRCodeWithLogoArea(text, size, logoRatio);
}

export function generateGradientQRCode(text: string, size: number = 256, color1: string = '#667eea', color2: string = '#764ba2'): string {
  return _generateGradientQRCode(text, size, color1, color2);
}

export function generateWechatStyleQRCode(text: string, size: number = 256): string {
  return _generateWechatStyleQRCode(text, size);
}

export function generateDouyinStyleQRCode(text: string, size: number = 256): string {
  return _generateDouyinStyleQRCode(text, size);
}

export function generateAlipayStyleQRCode(text: string, size: number = 256): string {
  return _generateAlipayStyleQRCode(text, size);
}

export function generateXiaohongshuStyleQRCode(text: string, size: number = 256): string {
  return _generateXiaohongshuStyleQRCode(text, size);
}

export function generateCyberpunkStyleQRCode(text: string, size: number = 256): string {
  return _generateCyberpunkStyleQRCode(text, size);
}

export function generateRetroStyleQRCode(text: string, size: number = 256): string {
  return _generateRetroStyleQRCode(text, size);
}

export function generateMinimalStyleQRCode(text: string, size: number = 256): string {
  return _generateMinimalStyleQRCode(text, size);
}

// ============================================
// 批量/异步生成 - 统一接口
// ============================================

export function generateBatchQRCodes(texts: string[], options: Partial<QRCodeOptions> = {}): string[] {
  return _generateBatchQRCodes(texts, options);
}

export function generateQRCodeAsync(text: string, options: Partial<QRCodeOptions> = {}): Promise<string> {
  return _generateQRCodeAsync(text, options);
}

export function generateBatchAsync(texts: string[], options: Partial<QRCodeOptions> = {}): Promise<string[]> {
  return _generateBatchAsync(texts, options);
}

// ============================================
// 默认导出
// ============================================
export default QRCode;
