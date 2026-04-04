/**
 * @veaba/qrcode-bun - QRCode generator optimized for Bun runtime
 * 
 * Backend unified API implementation for Bun runtime.
 * Provides consistent API with qrcode-node and qrcode-rust.
 */

// Bun-optimized utilities
const encoder = new TextEncoder();

// ============================================
// 基础常量 - 与统一 API 一致
// ============================================

export enum QRErrorCorrectLevel {
  L = 1,
  M = 0,
  Q = 3,
  H = 2
}

export const QRMode = { MODE_8BIT_BYTE: 4 } as const;

// ============================================
// 类型定义 - 统一接口
// ============================================

export interface QRCodeOptions {
  text: string;
  correctLevel?: QRErrorCorrectLevel;
  size?: number;
  colorDark?: string;
  colorLight?: string;
}

export interface StyledSVGOptions {
  size?: number;
  colorDark?: string;
  colorLight?: string;
  borderRadius?: number;
  gradient?: { color1: string; color2: string } | null;
  quietZone?: number;
  logoRegions?: Array<{ row: number; col: number; size: number }>;
}

export interface QRCodeResult {
  text: string;
  svg: string;
  moduleCount: number;
}

// ============================================
// 内部实现
// ============================================

// Galois Field 数学运算
class QRMath {
  static EXP_TABLE = new Uint8Array(256);
  static LOG_TABLE = new Uint8Array(256);

  static {
    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
  }

  static glog(n: number): number {
    if (n < 1) throw new Error(`glog(${n})`);
    return QRMath.LOG_TABLE[n];
  }

  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return QRMath.EXP_TABLE[n];
  }
}

// 多项式类
class Polynomial {
  coeffs: Uint8Array;

  constructor(coeffs: number[] | Uint8Array) {
    let start = 0;
    const input = coeffs instanceof Uint8Array ? coeffs : new Uint8Array(coeffs);
    while (start < input.length - 1 && input[start] === 0) start++;
    this.coeffs = input.slice(start);
  }

  get length(): number { return this.coeffs.length; }
  get(i: number): number { return this.coeffs[i]; }

  multiply(other: Polynomial): Polynomial {
    const result = new Uint8Array(this.length + other.length - 1);
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < other.length; j++) {
        result[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(other.get(j)));
      }
    }
    return new Polynomial(result);
  }

  mod(e: Polynomial): Polynomial {
    if (this.length - e.length < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Uint8Array(this.coeffs);
    for (let i = 0; i < e.length; i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new Polynomial(num).mod(e);
  }
}

function getErrorCorrectPolynomial(ecCount: number): Polynomial {
  let poly = new Polynomial([1]);
  for (let i = 0; i < ecCount; i++) {
    poly = poly.multiply(new Polynomial([1, QRMath.gexp(i)]));
  }
  return poly;
}

// 常量表
const PATTERN_POSITION_TABLE: ReadonlyArray<ReadonlyArray<number>> = [
  [],
  [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
  [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94], [6, 28, 50, 72, 98], [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
];

const QRCodeLimitLength: ReadonlyArray<ReadonlyArray<number>> = [
  [17, 14, 11, 7], [32, 26, 20, 14], [53, 42, 32, 24],
  [78, 62, 46, 34], [106, 84, 60, 44], [134, 106, 74, 58],
  [154, 122, 86, 64], [192, 152, 108, 84], [230, 180, 130, 98],
  [271, 213, 151, 119], [321, 251, 177, 137], [367, 287, 203, 155],
  [425, 331, 241, 177], [458, 362, 258, 194], [520, 412, 292, 220],
  [586, 450, 322, 250], [644, 504, 364, 280], [718, 560, 394, 310],
  [792, 624, 442, 338], [858, 666, 482, 382], [929, 711, 509, 403],
  [1003, 779, 565, 439], [1091, 857, 611, 461], [1171, 911, 661, 511],
  [1273, 997, 715, 535], [1367, 1059, 751, 593], [1465, 1125, 805, 625],
  [1528, 1190, 868, 658], [1628, 1264, 908, 698], [1732, 1370, 982, 742],
  [1840, 1452, 1030, 790], [1952, 1538, 1112, 842], [2068, 1628, 1168, 898],
  [2188, 1722, 1228, 958], [2303, 1809, 1283, 983], [2431, 1911, 1351, 1051],
  [2563, 1989, 1423, 1093], [2699, 2099, 1499, 1139], [2809, 2213, 1579, 1219],
  [2953, 2331, 1663, 1273]
];

const RS_BLOCK_TABLE: ReadonlyArray<ReadonlyArray<number>> = [
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
  [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
  [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
  [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
  [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
  [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
  [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
  [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12],
  [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
  [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
  [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
  [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
  [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
  [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
  [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
  [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
  [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
  [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
  [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
  [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
  [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
  [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
  [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
  [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
  [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
  [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
  [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
  [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
  [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
  [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
  [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
  [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
  [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]
];

interface RSBlock {
  totalCount: number;
  dataCount: number;
}

function getRSBlocks(typeNumber: number, errorCorrectLevel: QRErrorCorrectLevel): RSBlock[] {
  const levelMap: Record<number, number> = { 1: 0, 0: 1, 3: 2, 2: 3 };
  const index = (typeNumber - 1) * 4 + levelMap[errorCorrectLevel];
  const rsBlock = RS_BLOCK_TABLE[index] || RS_BLOCK_TABLE[0];
  const list: RSBlock[] = [];
  const length = Math.floor(rsBlock.length / 3);
  for (let i = 0; i < length; i++) {
    const count = rsBlock[i * 3];
    const totalCount = rsBlock[i * 3 + 1];
    const dataCount = rsBlock[i * 3 + 2];
    for (let j = 0; j < count; j++) {
      list.push({ totalCount, dataCount });
    }
  }
  return list;
}

function getTypeNumber(text: string, correctLevel: QRErrorCorrectLevel): number {
  let type = 1;
  const length = encoder.encode(text).length;
  const levelMap: Record<number, number> = { 1: 0, 0: 1, 3: 2, 2: 3 };
  for (let i = 0; i < QRCodeLimitLength.length; i++) {
    const limit = QRCodeLimitLength[i][levelMap[correctLevel]];
    if (length <= limit) break;
    type++;
  }
  return type;
}

// 位缓冲区
class BitBuffer {
  buffer: Uint8Array = new Uint8Array(256);
  length = 0;

  put(num: number, len: number): void {
    for (let i = 0; i < len; i++) {
      this.putBit(((num >>> (len - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean): void {
    const bufIndex = this.length >> 3;
    if (bufIndex >= this.buffer.length) {
      const newBuffer = new Uint8Array(this.buffer.length * 2);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length & 7);
    }
    this.length++;
  }

  toArray(): Uint8Array {
    const byteLength = (this.length + 7) >> 3;
    return this.buffer.slice(0, byteLength);
  }
}

// ============================================
// QRCode 类 - 统一接口实现
// ============================================

export class QRCode {
  readonly text: string;
  readonly correctLevel: QRErrorCorrectLevel;
  readonly typeNumber: number;
  readonly moduleCount: number;
  private modules: Array<Uint8Array>;

  constructor(text: string, correctLevel: QRErrorCorrectLevel = QRErrorCorrectLevel.H) {
    this.text = text;
    this.correctLevel = correctLevel;
    this.typeNumber = getTypeNumber(text, correctLevel);
    this.moduleCount = this.typeNumber * 4 + 17;
    // 使用 255 作为未初始化的标记，0=白色，1=黑色
    this.modules = Array.from({ length: this.moduleCount }, () =>
      new Uint8Array(this.moduleCount).fill(255)
    );
    this.make();
  }

  // ----- 统一方法 -----
  isDark(row: number, col: number): boolean {
    return this.modules[row][col] === 1;
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  toSVG(size: number = 256): string {
    const cellSize = Math.floor(size / this.moduleCount);
    const actualSize = cellSize * this.moduleCount;

    // 使用 path 合并所有黑色模块，提高兼容性和渲染性能
    let path = '';
    for (let row = 0; row < this.moduleCount; row++) {
      for (let col = 0; col < this.moduleCount; col++) {
        if (this.isDark(row, col)) {
          const x = col * cellSize;
          const y = row * cellSize;
          path += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${actualSize} ${actualSize}" width="${actualSize}" height="${actualSize}"><rect width="${actualSize}" height="${actualSize}" fill="white"/><path d="${path}" fill="black"/></svg>`;
  }

  toStyledSVG(options: StyledSVGOptions = {}): string {
    const {
      size = 256,
      colorDark = '#000000',
      colorLight = '#ffffff',
      borderRadius = 0,
      gradient = null,
      quietZone = 0
    } = options;

    const count = this.moduleCount;
    const totalCount = count + quietZone * 2;
    const cellSize = Math.floor(size / totalCount);
    const actualSize = cellSize * totalCount;
    const offset = (size - actualSize) / 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;

    if (gradient) {
      svg += `<defs>
        <linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.color1}" />
          <stop offset="100%" style="stop-color:${gradient.color2}" />
        </linearGradient>
      </defs>`;
    }

    const bgRadius = Math.min(borderRadius, size / 8);
    svg += `<rect width="${size}" height="${size}" fill="${colorLight}" rx="${bgRadius}" ry="${bgRadius}"/>`;

    const fillColor = gradient ? 'url(#qrGradient)' : colorDark;
    const radius = Math.min(borderRadius, Math.floor(cellSize / 4));

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (this.isDark(row, col)) {
          const x = (col + quietZone) * cellSize + offset;
          const y = (row + quietZone) * cellSize + offset;

          if (radius > 0) {
            svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fillColor}" rx="${radius}" ry="${radius}"/>`;
          } else {
            svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fillColor}"/>`;
          }
        }
      }
    }

    svg += '</svg>';
    return svg;
  }

  // ----- Bun 特有方法 -----
  async saveToFile(filepath: string, size: number = 256): Promise<void> {
    const svg = this.toSVG(size);
    await Bun.write(filepath, svg);
  }

  async savePNGToFile(filepath: string, size: number = 256): Promise<void> {
    const pngData = this.createPNGBuffer(size);
    await Bun.write(filepath, pngData);
  }

  getModulesJSON(): string {
    const arr: number[][] = [];
    for (let row = 0; row < this.moduleCount; row++) {
      const rowArr: number[] = [];
      for (let col = 0; col < this.moduleCount; col++) {
        rowArr.push(this.isDark(row, col) ? 1 : 0);
      }
      arr.push(rowArr);
    }
    return JSON.stringify(arr);
  }

  // ----- 终端显示方法 -----
  /**
   * 将 QRCode 渲染为终端可显示的字符画
   * @param invert - 是否反转颜色（默认 false）
   * @param quietZone - 静区大小（默认 1）
   * @returns 终端字符画字符串
   */
  toTerminal(invert = false, quietZone = 1): string {
    const darkChar = invert ? ' ' : '█';
    const lightChar = invert ? '█' : ' ';
    const darkModule = darkChar.repeat(2);
    const lightModule = lightChar.repeat(2);

    const lines: string[] = [];
    const totalWidth = (this.moduleCount + quietZone * 2) * 2;

    // 添加顶部静区
    for (let q = 0; q < quietZone; q++) {
      lines.push(lightChar.repeat(totalWidth));
    }

    // 渲染 QRCode 模块
    for (let row = 0; row < this.moduleCount; row++) {
      let line = lightChar.repeat(quietZone * 2);
      for (let col = 0; col < this.moduleCount; col++) {
        line += this.isDark(row, col) ? darkModule : lightModule;
      }
      line += lightChar.repeat(quietZone * 2);
      lines.push(line);
    }

    // 添加底部静区
    for (let q = 0; q < quietZone; q++) {
      lines.push(lightChar.repeat(totalWidth));
    }

    return lines.join('\n');
  }

  /**
   * 使用 Braille 字符渲染更紧凑的终端二维码
   * 每个字符表示 2x4 像素（宽 x 高）
   * @returns Braille 字符画字符串
   */
  toTerminalBraille(): string {
    // Braille 字符 Unicode: U+2800 到 U+28FF
    // 位映射：1 2 4 8 (左列从上到下), 16 32 64 128 (右列从上到下)
    const brailleBase = 0x2800;

    let result = '';
    const rows = this.moduleCount;
    const cols = this.moduleCount;

    for (let y = 0; y < rows; y += 4) {
      let line = '';
      for (let x = 0; x < cols; x += 2) {
        let braille = 0;
        // 左列 4 个像素
        for (let dy = 0; dy < 4; dy++) {
          if (y + dy < rows && this.isDark(y + dy, x)) {
            braille |= 1 << dy;
          }
        }
        // 右列 4 个像素
        for (let dy = 0; dy < 4; dy++) {
          if (y + dy < rows && x + 1 < cols && this.isDark(y + dy, x + 1)) {
            braille |= 1 << (4 + dy);
          }
        }
        line += String.fromCharCode(brailleBase + braille);
      }
      result += line + '\n';
    }

    return result.trimEnd();
  }

  /**
   * 带颜色的终端输出（使用 ANSI 转义序列）
   * @param fgColor - 前景色（深色模块颜色），支持 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white' 或 RGB
   * @param bgColor - 背景色（浅色模块颜色）
   * @returns 带 ANSI 颜色的终端字符画
   */
  toTerminalColor(fgColor = 'black', bgColor = 'white'): string {
    const fgCode = this.getAnsiColorCode(fgColor, false);
    const bgCode = this.getAnsiColorCode(bgColor, true);
    const reset = '\x1b[0m';

    let result = `${bgCode}${fgCode}`;

    for (let row = 0; row < this.moduleCount; row++) {
      for (let col = 0; col < this.moduleCount; col++) {
        if (this.isDark(row, col)) {
          result += '██';
        } else {
          result += '  ';
        }
      }
      if (row < this.moduleCount - 1) {
        result += '\n';
      }
    }

    result += reset;
    return result;
  }

  private getAnsiColorCode(color: string, isBackground: boolean): string {
    const colorMap: Record<string, number> = {
      black: 30, red: 31, green: 32, yellow: 33,
      blue: 34, magenta: 35, cyan: 36, white: 37
    };

    const baseCode = colorMap[color.toLowerCase()] ?? 37;
    return `\x1b[${isBackground ? baseCode + 10 : baseCode}m`;
  }

  private createPNGBuffer(size: number): Uint8Array {
    const cellSize = Math.floor(size / this.moduleCount);
    const actualSize = cellSize * this.moduleCount;
    const rowSize = ((actualSize * 24 + 31) >> 5) << 2;
    const imageDataSize = rowSize * actualSize;
    const fileSize = 54 + imageDataSize;

    const buffer = new Uint8Array(fileSize);
    const view = new DataView(buffer.buffer);

    buffer[0] = 0x42;
    buffer[1] = 0x4D;
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, actualSize, true);
    view.setInt32(22, actualSize, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, imageDataSize, true);

    let offset = 54;
    for (let y = actualSize - 1; y >= 0; y--) {
      const row = Math.floor(y / cellSize);
      let rowOffset = 0;
      for (let x = 0; x < actualSize; x++) {
        const col = Math.floor(x / cellSize);
        const isDark = row < this.moduleCount && col < this.moduleCount && this.isDark(row, col);
        const color = isDark ? 0 : 255;
        buffer[offset++] = color;
        buffer[offset++] = color;
        buffer[offset++] = color;
        rowOffset += 3;
      }
      while (rowOffset % 4 !== 0) {
        buffer[offset++] = 0;
        rowOffset++;
      }
    }

    return buffer;
  }

  private make(): void {
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo();
    if (this.typeNumber >= 7) this.setupTypeNumber();
    this.mapData();
  }

  private setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r < 8; r++) {
      const absR = row + r;
      if (absR < 0 || absR >= this.moduleCount) continue;
      for (let c = -1; c < 8; c++) {
        const absC = col + c;
        if (absC < 0 || absC >= this.moduleCount) continue;
        const inPattern = (r >= 0 && r < 7 && c >= 0 && c < 7);
        if (!inPattern) {
          this.modules[absR][absC] = 0; // 白色（quiet zone）
        } else {
          const isDark = (r === 0 || r === 6 || c === 0 || c === 6) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          this.modules[absR][absC] = isDark ? 1 : 0; // 1=黑色, 0=白色
        }
      }
    }
  }

  private setupPositionAdjustPattern(): void {
    const pos = PATTERN_POSITION_TABLE[this.typeNumber - 1];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== 255) continue; // 如果已被设置则跳过
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            this.modules[row + r][col + c] =
              (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) ? 1 : 0;
          }
        }
      }
    }
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] === 255) this.modules[r][6] = (r & 1) === 0 ? 1 : 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] === 255) this.modules[6][c] = (c & 1) === 0 ? 1 : 0;
    }
  }

  private setupTypeInfo(): void {
    const g15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    const g15Mask = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
    const maskPattern = 0;
    let data = (this.correctLevel << 3) | maskPattern;
    let d = data << 10;

    while (this.getBCHDigit(d) - this.getBCHDigit(g15) >= 0) {
      d ^= g15 << (this.getBCHDigit(d) - this.getBCHDigit(g15));
    }

    data = ((data << 10) | d) ^ g15Mask;

    for (let i = 0; i < 15; i++) {
      const bit = (data >> i) & 1;
      const dark = bit === 1;
      if (i < 6) {
        this.modules[i][8] = dark ? 1 : 0;
      } else if (i < 8) {
        this.modules[i + 1][8] = dark ? 1 : 0;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = dark ? 1 : 0;
      }
    }

    for (let i = 0; i < 15; i++) {
      const bit = (data >> i) & 1;
      const dark = bit === 1;
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = dark ? 1 : 0;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = dark ? 1 : 0;
      } else {
        this.modules[8][15 - i - 1] = dark ? 1 : 0;
      }
    }

    this.modules[this.moduleCount - 8][8] = 1;
  }

  private getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }

  private setupTypeNumber(): void {
    // 简化版本
  }

  private mapData(): void {
    const data = this.createData();
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === 255) { // 只填充未初始化的位置
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            if (((row + col - c) & 1) === 0) dark = !dark;
            this.modules[row][col - c] = dark ? 1 : 0;
            bitIndex--;
            if (bitIndex < 0) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private createData(): Uint8Array {
    const rsBlocks = getRSBlocks(this.typeNumber, this.correctLevel);
    const buffer = new BitBuffer();

    buffer.put(QRMode.MODE_8BIT_BYTE, 4);
    const textBytes = encoder.encode(this.text);
    buffer.put(textBytes.length, this.getLengthInBits());
    for (const byte of textBytes) buffer.put(byte, 8);

    let totalDataCount = 0;
    for (const block of rsBlocks) totalDataCount += block.dataCount;

    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while ((buffer.length & 7) !== 0) buffer.putBit(false);
    while (buffer.length < totalDataCount * 8) {
      buffer.put(0xEC, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    const data = buffer.toArray();
    let offset = 0;
    const maxDcCount = Math.max(...rsBlocks.map(b => b.dataCount));
    const maxEcCount = Math.max(...rsBlocks.map(b => b.totalCount - b.dataCount));

    const dcdata: Uint8Array[] = [];
    const ecdata: Uint8Array[] = [];

    for (const block of rsBlocks) {
      const dcCount = block.dataCount;
      const ecCount = block.totalCount - dcCount;

      dcdata.push(data.slice(offset, offset + dcCount));
      offset += dcCount;

      const rsPoly = getErrorCorrectPolynomial(ecCount);
      const rawPoly = new Polynomial([
        ...dcdata[dcdata.length - 1],
        ...new Uint8Array(ecCount)
      ]);
      const modPoly = rawPoly.mod(rsPoly);

      const ec = new Uint8Array(ecCount);
      for (let i = 0; i < ecCount; i++) {
        const modIndex = i + modPoly.length - ecCount;
        ec[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
      ecdata.push(ec);
    }

    const result = new Uint8Array(maxDcCount * rsBlocks.length + maxEcCount * rsBlocks.length);
    let resultIdx = 0;

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) result[resultIdx++] = dcdata[r][i];
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) result[resultIdx++] = ecdata[r][i];
      }
    }

    return result;
  }

  private getLengthInBits(): number {
    if (this.typeNumber < 10) return 8;
    return 16;
  }
}

// ============================================
// 样式化 QRCode 生成函数 - 统一命名
// ============================================

export function generateRoundedQRCode(text: string, size: number = 256, radius: number = 8): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({ borderRadius: radius, quietZone: 2 });
}

export function generateQRCodeWithLogoArea(text: string, size: number = 256, logoRatio: number = 0.2): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  const count = qr.getModuleCount();
  const logoCells = Math.floor(count * logoRatio);
  const logoStart = Math.floor((count - logoCells) / 2);
  return qr.toStyledSVG({
    size,
    quietZone: 2,
    logoRegions: [{ row: logoStart, col: logoStart, size: logoCells }]
  });
}

export function generateGradientQRCode(text: string, size: number = 256, color1: string = '#667eea', color2: string = '#764ba2'): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({ size, gradient: { color1, color2 }, quietZone: 2 });
}

export function generateWechatStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#07C160',
    colorLight: '#ffffff',
    borderRadius: 4,
    quietZone: 2
  });
}

export function generateDouyinStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#00F2EA',
    colorLight: '#000000',
    gradient: { color1: '#00F2EA', color2: '#FF0050' },
    borderRadius: 6,
    quietZone: 2
  });
}

export function generateAlipayStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#1677FF',
    colorLight: '#ffffff',
    borderRadius: 4,
    quietZone: 2
  });
}

export function generateXiaohongshuStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#FF2442',
    colorLight: '#ffffff',
    borderRadius: 12,
    quietZone: 2
  });
}

export function generateCyberpunkStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#FF00FF',
    colorLight: '#0a0a0a',
    gradient: { color1: '#FF00FF', color2: '#00FFFF' },
    borderRadius: 2,
    quietZone: 2
  });
}

export function generateRetroStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#8B4513',
    colorLight: '#F5F5DC',
    borderRadius: 0,
    quietZone: 2
  });
}

export function generateMinimalStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#333333',
    colorLight: '#fafafa',
    borderRadius: 16,
    quietZone: 2
  });
}

// ============================================
// 批量/异步生成 - 统一接口
// ============================================

export function generateBatchQRCodes(texts: string[], options: Partial<QRCodeOptions> = {}): string[] {
  return texts.map(text => {
    const qr = new QRCode(text, options.correctLevel || QRErrorCorrectLevel.H);
    return qr.toSVG(options.size || 256);
  });
}

export async function generateQRCodeAsync(text: string, options: Partial<QRCodeOptions> = {}): Promise<string> {
  const qr = new QRCode(text, options.correctLevel || QRErrorCorrectLevel.H);
  return qr.toSVG(options.size || 256);
}

export async function generateBatchAsync(texts: string[], options: Partial<QRCodeOptions> = {}): Promise<string[]> {
  return Promise.all(texts.map(text => generateQRCodeAsync(text, options)));
}

// ============================================
// 默认导出
// ============================================
export default QRCode;
