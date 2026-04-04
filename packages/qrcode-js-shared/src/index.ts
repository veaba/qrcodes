/**
 * Shared Core Library for QRCode Generation
 * 
 * This package contains the shared core functionality used by:
 * - qrcode-js-cache
 * - qrcode-js-perf
 * - qrcode-node
 */

// 导出统一类型定义
export * from './types.js';

// ============ Galois Field 数学运算 ============
export class QRMath {
  static EXP_TABLE: Uint8Array = new Uint8Array(256);
  static LOG_TABLE: Uint8Array = new Uint8Array(256);

  static {
    // 初始化 Galois Field 表
    for (let i = 0; i < 8; i++) this.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      this.EXP_TABLE[i] = this.EXP_TABLE[i - 4] ^ this.EXP_TABLE[i - 5] ^
        this.EXP_TABLE[i - 6] ^ this.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) this.LOG_TABLE[this.EXP_TABLE[i]] = i;
  }

  static glog(n: number): number {
    if (n < 1) throw new Error(`glog(${n})`);
    return this.LOG_TABLE[n];
  }

  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return this.EXP_TABLE[n];
  }
}

// ============ 多项式类 ============
export class Polynomial {
  coeffs: Uint8Array;

  constructor(coeffs: number[] | Uint8Array) {
    // 去除前导零
    let start = 0;
    const arr = Array.isArray(coeffs) ? coeffs : Array.from(coeffs);
    while (start < arr.length - 1 && arr[start] === 0) start++;
    this.coeffs = new Uint8Array(arr.slice(start));
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
    if (this.length - e.length < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Uint8Array(this.coeffs);
    for (let i = 0; i < e.length; i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new Polynomial(num).mod(e);
  }
}

// ============ 错误纠正多项式缓存 ============
const ecPolyCache = new Map<number, Polynomial>();

export function getErrorCorrectPolynomial(ecCount: number): Polynomial {
  if (ecPolyCache.has(ecCount)) {
    return ecPolyCache.get(ecCount)!;
  }

  let poly = new Polynomial([1]);
  for (let i = 0; i < ecCount; i++) {
    poly = poly.multiply(new Polynomial([1, QRMath.gexp(i)]));
  }

  ecPolyCache.set(ecCount, poly);
  return poly;
}

// ============ 常量 ============
export const QRMode = { MODE_8BIT_BYTE: 4 };

export enum QRErrorCorrectLevel {
  L = 1,
  M = 0,
  Q = 3,
  H = 2
}

// 位置调整图案位置表
export const PATTERN_POSITION_TABLE: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 28, 50, 72, 98],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

// 容量表
export const QRCodeLimitLength: number[][] = [
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

// RS 块表
export const RS_BLOCK_TABLE: number[][] = [
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

// ============ RS Block 接口 ============
export interface RSBlock {
  totalCount: number;
  dataCount: number;
}

// ============ 获取 RS Blocks ============
export function getRSBlocks(typeNumber: number, errorCorrectLevel: QRErrorCorrectLevel): RSBlock[] {
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

// ============ 获取 Type Number ============
export function getTypeNumber(textLength: number, errorCorrectLevel: QRErrorCorrectLevel): number {
  const levelMap: Record<number, number> = { 1: 0, 0: 1, 3: 2, 2: 3 };
  for (let typeNumber = 1; typeNumber <= 40; typeNumber++) {
    const limit = QRCodeLimitLength[typeNumber - 1][levelMap[errorCorrectLevel]];
    if (limit >= textLength) {
      return typeNumber;
    }
  }
  throw new Error('Text too long');
}

// ============ BitBuffer 类 ============
export class BitBuffer {
  buffer: number[] = [];
  length = 0;

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    this.length++;
  }
}

// ============ QRCode 选项接口 ============
export interface QRCodeOptions {
  text: string;
  correctLevel?: QRErrorCorrectLevel;
  size?: number;
  colorDark?: string;
  colorLight?: string;
}

// ============ 样式选项接口 ============
export interface StyledSVGOptions {
  size?: number;
  colorDark?: string;
  colorLight?: string;
  borderRadius?: number;
  gradient?: { color1: string; color2: string } | null;
  quietZone?: number;
  logoRegions?: Array<{ row: number; col: number; size: number }>;
}

// ============ QRCode 核心类 ============
export class QRCodeCore {
  text: string;
  correctLevel: QRErrorCorrectLevel;
  typeNumber: number;
  moduleCount: number;
  modules: Uint8Array;

  constructor(text: string, correctLevel: QRErrorCorrectLevel = QRErrorCorrectLevel.H) {
    this.text = text;
    this.correctLevel = correctLevel;
    // 计算文本长度（UTF-8 字节数）
    const textLength = new TextEncoder().encode(text).length;
    this.typeNumber = getTypeNumber(textLength, correctLevel);
    this.moduleCount = this.typeNumber * 4 + 17;
    // 使用 Uint8Array 代替二维数组，内存更高效
    // 0 = 未设置, 1 = 白色, 2 = 黑色
    this.modules = new Uint8Array(this.moduleCount * this.moduleCount);
    this.make();
  }

  // 一维索引访问
  private _idx(row: number, col: number): number {
    return row * this.moduleCount + col;
  }

  isDark(row: number, col: number): boolean {
    return this.modules[this._idx(row, col)] === 2;
  }

  setDark(row: number, col: number, dark: boolean): void {
    this.modules[this._idx(row, col)] = dark ? 2 : 1;
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  private make(): void {
    const bestMaskPattern = this.getBestMaskPattern();
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(bestMaskPattern);
    if (this.typeNumber >= 7) this.setupTypeNumber();
    this.mapData(bestMaskPattern);
  }

  private getBestMaskPattern(): number {
    let minLostPoint = Infinity;
    let bestPattern = 0;
    
    const originalModules = new Uint8Array(this.modules);
    
    for (let pattern = 0; pattern < 8; pattern++) {
      this.modules = new Uint8Array(originalModules);
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(pattern);
      if (this.typeNumber >= 7) this.setupTypeNumber();
      this.mapData(pattern);
      
      const lostPoint = this.getLostPoint();
      if (lostPoint < minLostPoint) {
        minLostPoint = lostPoint;
        bestPattern = pattern;
      }
    }
    
    this.modules = originalModules;
    return bestPattern;
  }

  private getLostPoint(): number {
    let lostPoint = 0;
    const count = this.moduleCount;
    
    // Level 1: 同色相邻模块
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        let sameCount = 0;
        const dark = this.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || count <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || count <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (this.isDark(row + r, col + c) === dark) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }
    
    // Level 2: 2x2 同色块
    for (let row = 0; row < count - 1; row++) {
      for (let col = 0; col < count - 1; col++) {
        const dark = this.isDark(row, col);
        if (this.isDark(row + 1, col) === dark &&
            this.isDark(row, col + 1) === dark &&
            this.isDark(row + 1, col + 1) === dark) {
          lostPoint += 3;
        }
      }
    }
    
    // Level 3: 特定图案
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count - 6; col++) {
        if (this.isDark(row, col) &&
            !this.isDark(row, col + 1) &&
            this.isDark(row, col + 2) &&
            this.isDark(row, col + 3) &&
            this.isDark(row, col + 4) &&
            !this.isDark(row, col + 5) &&
            this.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < count; col++) {
      for (let row = 0; row < count - 6; row++) {
        if (this.isDark(row, col) &&
            !this.isDark(row + 1, col) &&
            this.isDark(row + 2, col) &&
            this.isDark(row + 3, col) &&
            this.isDark(row + 4, col) &&
            !this.isDark(row + 5, col) &&
            this.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }
    
    // Level 4: 黑色模块比例
    let darkCount = 0;
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (this.isDark(row, col)) darkCount++;
      }
    }
    const ratio = Math.abs(100 * darkCount / count / count - 50) / 5;
    lostPoint += ratio * 10;
    
    return lostPoint;
  }

  private getMaskFunction(pattern: number): (row: number, col: number) => boolean {
    switch (pattern) {
      case 0: return (row, col) => (row + col) % 2 === 0;
      case 1: return (row) => row % 2 === 0;
      case 2: return (_, col) => col % 3 === 0;
      case 3: return (row, col) => (row + col) % 3 === 0;
      case 4: return (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
      case 5: return (row, col) => (row * col) % 2 + (row * col) % 3 === 0;
      case 6: return (row, col) => ((row * col) % 2 + (row * col) % 3) % 2 === 0;
      case 7: return (row, col) => ((row * col) % 3 + (row + col) % 2) % 2 === 0;
      default: return (row, col) => (row + col) % 2 === 0;
    }
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
          this.setDark(absR, absC, false);
        } else {
          const isDark = (r === 0 || r === 6 || c === 0 || c === 6) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          this.setDark(absR, absC, isDark);
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
        if (this.modules[this._idx(row, col)] !== 0) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            this.setDark(row + r, col + c,
              r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
          }
        }
      }
    }
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[this._idx(r, 6)] === 0) {
        this.setDark(r, 6, r % 2 === 0);
      }
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[this._idx(6, c)] === 0) {
        this.setDark(6, c, c % 2 === 0);
      }
    }
  }

  private setupTypeInfo(maskPattern: number): void {
    const g15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    const g15Mask = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
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
        this.setDark(i, 8, dark);
      } else if (i < 8) {
        this.setDark(i + 1, 8, dark);
      } else {
        this.setDark(this.moduleCount - 15 + i, 8, dark);
      }
    }

    for (let i = 0; i < 15; i++) {
      const bit = (data >> i) & 1;
      const dark = bit === 1;

      if (i < 8) {
        this.setDark(8, this.moduleCount - i - 1, dark);
      } else if (i < 9) {
        this.setDark(8, 15 - i - 1 + 1, dark);
      } else {
        this.setDark(8, 15 - i - 1, dark);
      }
    }

    this.setDark(this.moduleCount - 8, 8, true);
  }

  private getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>= 1;
    }
    return digit;
  }

  private setupTypeNumber(): void {
    const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    let d = this.typeNumber << 12;
    
    while (this.getBCHDigit(d) - this.getBCHDigit(G18) >= 0) {
      d ^= G18 << (this.getBCHDigit(d) - this.getBCHDigit(G18));
    }
    
    const bits = (this.typeNumber << 12) | d;
    
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >> i) & 1) === 1;
      // 右下角区域
      this.setDark(Math.floor(i / 3), this.moduleCount - 8 - 3 + (i % 3), dark);
      // 左下角区域
      this.setDark(this.moduleCount - 8 - 3 + (i % 3), Math.floor(i / 3), dark);
    }
  }

  private mapData(maskPattern: number): void {
    const data = this.createData();
    const maskFunc = this.getMaskFunction(maskPattern);
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[this._idx(row, col - c)] === 0) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            if (maskFunc(row, col - c)) dark = !dark;
            this.setDark(row, col - c, dark);
            bitIndex--;
            if (bitIndex === -1) {
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

  private getLengthInBits(): number {
    if (this.typeNumber >= 1 && this.typeNumber < 10) return 8;
    return 16;
  }

  private createData(): number[] {
    const rsBlocks = getRSBlocks(this.typeNumber, this.correctLevel);
    const buffer = new BitBuffer();

    buffer.put(QRMode.MODE_8BIT_BYTE, 4);
    const textBytes = new TextEncoder().encode(this.text);
    buffer.put(textBytes.length, this.getLengthInBits());
    for (const byte of textBytes) buffer.put(byte, 8);

    let totalDataCount = 0;
    for (const block of rsBlocks) totalDataCount += block.dataCount;

    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    while (buffer.length < totalDataCount * 8) {
      buffer.put(0xEC, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    const data = buffer.buffer.slice(0, Math.ceil(buffer.length / 8));
    let offset = 0;
    const maxDcCount = Math.max(...rsBlocks.map(b => b.dataCount));
    const maxEcCount = Math.max(...rsBlocks.map(b => b.totalCount - b.dataCount));

    const dcdata: number[][] = [];
    const ecdata: number[][] = [];

    for (const block of rsBlocks) {
      const dcCount = block.dataCount;
      const ecCount = block.totalCount - dcCount;

      dcdata.push(data.slice(offset, offset + dcCount));
      offset += dcCount;

      const rsPoly = getErrorCorrectPolynomial(ecCount);
      const rawPoly = new Polynomial([...dcdata[dcdata.length - 1], ...new Array(ecCount).fill(0)]);
      const modPoly = rawPoly.mod(rsPoly);

      const ec: number[] = [];
      for (let i = 0; i < ecCount; i++) {
        const modIndex = i + modPoly.length - ecCount;
        ec.push(modIndex >= 0 ? modPoly.get(modIndex) : 0);
      }
      ecdata.push(ec);
    }

    const result: number[] = [];
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) result.push(dcdata[r][i]);
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) result.push(ecdata[r][i]);
      }
    }

    return result;
  }

  // ============ SVG 生成（使用 Path 合并优化）============
  toSVG(size: number = 256): string {
    const cellSize = Math.floor(size / this.moduleCount);
    const actualSize = cellSize * this.moduleCount;

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

  // ============ 样式化 SVG（Path 合并）============
  toStyledSVG(options: StyledSVGOptions = {}): string {
    const {
      size = 256,
      colorDark = '#000000',
      colorLight = '#ffffff',
      borderRadius = 0,
      gradient = null,
      quietZone = 0,
      logoRegions = []
    } = options;

    const count = this.moduleCount;
    const totalCount = count + quietZone * 2;
    const cellSize = Math.floor(size / totalCount);
    const actualSize = cellSize * totalCount;
    const offset = (size - actualSize) / 2;

    // 生成唯一的渐变 ID，避免多个 SVG 之间的冲突
    const gradientId = gradient ? `qrGradient_${Math.random().toString(36).substr(2, 9)}` : '';

    let defs = '';
    if (gradient) {
      defs = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${gradient.color1}"/><stop offset="100%" style="stop-color:${gradient.color2}"/></linearGradient></defs>`;
    }

    const bgRadius = Math.min(borderRadius, size / 8);
    const fillColor = gradient ? `url(#${gradientId})` : colorDark;
    const radius = Math.min(borderRadius, Math.floor(cellSize / 4));

    let path = '';

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        let inLogo = false;
        for (const region of logoRegions) {
          if (row >= region.row && row < region.row + region.size &&
            col >= region.col && col < region.col + region.size) {
            inLogo = true;
            break;
          }
        }
        if (inLogo) continue;

        if (this.isDark(row, col)) {
          const x = (col + quietZone) * cellSize + offset;
          const y = (row + quietZone) * cellSize + offset;

          if (radius > 0) {
            const r = radius;
            path += `M${x + r},${y}h${cellSize - 2 * r}q${r},0 ${r},${r}v${cellSize - 2 * r}q0,${r} -${r},${r}h-${cellSize - 2 * r}q-${r},0 -${r},-${r}v-${cellSize - 2 * r}q0,-${r} ${r},-${r}z`;
          } else {
            path += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
          }
        }
      }
    }

    let logoPath = '';
    for (const region of logoRegions) {
      const x = (region.col + quietZone) * cellSize + offset;
      const y = (region.row + quietZone) * cellSize + offset;
      const s = region.size * cellSize;
      logoPath += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${colorLight}" stroke="#e0e0e0" stroke-width="2"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${defs}<rect width="${size}" height="${size}" fill="${colorLight}" rx="${bgRadius}" ry="${bgRadius}"/><path d="${path}" fill="${fillColor}"/>${logoPath}</svg>`;
  }

  // ============ 终端显示方法 ============
  /**
   * 将 QRCode 渲染为终端可显示的字符画
   * 每个模块使用 2 个字符宽度，以补偿终端字符的高宽比（约 2:1）
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
   * @param fgColor - 前景色（深色模块颜色）
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
}

// ============ 样式化 QRCode 生成函数 ============

export function generateRoundedQRCode(text: string, size: number = 256, radius: number = 8): string {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    borderRadius: radius,
    quietZone: 2
  });
}

export function generateQRCodeWithLogoArea(text: string, size: number = 256, logoRatio: number = 0.2): string {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
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
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    gradient: { color1, color2 },
    quietZone: 2
  });
}

export function generateWechatStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#07C160',
    colorLight: '#ffffff',
    borderRadius: 4,
    quietZone: 2
  });
}

export function generateDouyinStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
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
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#1677FF',
    colorLight: '#ffffff',
    borderRadius: 4,
    quietZone: 2
  });
}

export function generateXiaohongshuStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#FF2442',
    colorLight: '#ffffff',
    borderRadius: 12,
    quietZone: 2
  });
}

export function generateCyberpunkStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
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
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#8B4513',
    colorLight: '#F5F5DC',
    borderRadius: 0,
    quietZone: 2
  });
}

export function generateMinimalStyleQRCode(text: string, size: number = 256): string {
  const qr = new QRCodeCore(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#333333',
    colorLight: '#fafafa',
    borderRadius: 16,
    quietZone: 2
  });
}

// ============ 批量生成 ============
export function generateBatchQRCodes(texts: string[], options: Partial<QRCodeOptions> = {}): string[] {
  return texts.map(text => {
    const qr = new QRCodeCore(text, options.correctLevel || QRErrorCorrectLevel.H);
    return qr.toSVG(options.size || 256);
  });
}

// ============ 异步生成（简单版本）============
export function generateQRCodeAsync(text: string, options: Partial<QRCodeOptions> = {}): Promise<string> {
  return new Promise((resolve) => {
    const qr = new QRCodeCore(text, options.correctLevel || QRErrorCorrectLevel.H);
    resolve(qr.toSVG(options.size || 256));
  });
}

export function generateBatchAsync(texts: string[], options: Partial<QRCodeOptions> = {}): Promise<string[]> {
  return Promise.all(texts.map(text => generateQRCodeAsync(text, options)));
}

// ============ 缓存系统 (可选) ============

export interface CacheOptions {
  maxSize?: number;
  enabled?: boolean;
}

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private enabled: boolean;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.enabled = options.enabled !== false;
  }

  get(key: K): V | undefined {
    if (!this.enabled) return undefined;

    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (!this.enabled) return;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  get keys(): K[] {
    return Array.from(this.cache.keys());
  }
}

// QRCode 缓存
const qrCodeCache = new LRUCache<string, QRCodeCore>();

function getCacheKey(text: string, correctLevel: QRErrorCorrectLevel): string {
  return `${text}:${correctLevel}`;
}

/**
 * 获取缓存的 QRCode（如果不存在则创建并缓存）
 * @param text - QRCode 文本
 * @param correctLevel - 错误纠正级别
 * @returns QRCodeCore 实例
 */
export function getCachedQRCode(text: string, correctLevel: QRErrorCorrectLevel = QRErrorCorrectLevel.H): QRCodeCore {
  const key = getCacheKey(text, correctLevel);
  let qr = qrCodeCache.get(key);

  if (!qr) {
    qr = new QRCodeCore(text, correctLevel);
    qrCodeCache.set(key, qr);
  }

  return qr;
}

/**
 * 清除 QRCode 缓存
 */
export function clearQRCodeCache(): void {
  qrCodeCache.clear();
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): { size: number; maxSize: number; keys: string[] } {
  return {
    size: qrCodeCache.size,
    maxSize: 100,
    keys: qrCodeCache.keys
  };
}

/**
 * 配置缓存选项
 */
export function configureCache(options: CacheOptions): void {
  // 重新创建缓存以应用新选项
  Object.assign(qrCodeCache, new LRUCache<string, QRCodeCore>(options));
}

// ============ 带缓存的样式生成函数 ============

export function generateRoundedQRCodeCached(text: string, size: number = 256, radius: number = 8): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    borderRadius: radius,
    quietZone: 2
  });
}

export function generateQRCodeWithLogoAreaCached(text: string, size: number = 256, logoRatio: number = 0.2): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  const count = qr.getModuleCount();
  const logoCells = Math.floor(count * logoRatio);
  const logoStart = Math.floor((count - logoCells) / 2);

  return qr.toStyledSVG({
    size,
    quietZone: 2,
    logoRegions: [{ row: logoStart, col: logoStart, size: logoCells }]
  });
}

export function generateGradientQRCodeCached(text: string, size: number = 256, color1: string = '#667eea', color2: string = '#764ba2'): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    gradient: { color1, color2 },
    quietZone: 2
  });
}

export function generateWechatStyleQRCodeCached(text: string, size: number = 256): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#07C160',
    colorLight: '#ffffff',
    borderRadius: 4,
    quietZone: 2
  });
}

export function generateDouyinStyleQRCodeCached(text: string, size: number = 256): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#00F2EA',
    colorLight: '#000000',
    gradient: { color1: '#00F2EA', color2: '#FF0050' },
    borderRadius: 6,
    quietZone: 2
  });
}

export function generateAlipayStyleQRCodeCached(text: string, size: number = 256): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#1677FF',
    colorLight: '#ffffff',
    borderRadius: 4,
    quietZone: 2
  });
}

export function generateXiaohongshuStyleQRCodeCached(text: string, size: number = 256): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#FF2442',
    colorLight: '#ffffff',
    borderRadius: 12,
    quietZone: 2
  });
}

export function generateCyberpunkStyleQRCodeCached(text: string, size: number = 256): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#FF00FF',
    colorLight: '#0a0a0a',
    gradient: { color1: '#FF00FF', color2: '#00FFFF' },
    borderRadius: 2,
    quietZone: 2
  });
}

export function generateRetroStyleQRCodeCached(text: string, size: number = 256): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#8B4513',
    colorLight: '#F5F5DC',
    borderRadius: 0,
    quietZone: 2
  });
}

export function generateMinimalStyleQRCodeCached(text: string, size: number = 256): string {
  const qr = getCachedQRCode(text, QRErrorCorrectLevel.H);
  return qr.toStyledSVG({
    size,
    colorDark: '#333333',
    colorLight: '#fafafa',
    borderRadius: 16,
    quietZone: 2
  });
}

// ============ 批量生成（带缓存） ============

export function generateBatchQRCodesCached(texts: string[], options: Partial<QRCodeOptions> & { styled?: boolean; style?: StyledSVGOptions } = {}): string[] {
  return texts.map(text => {
    const qr = getCachedQRCode(text, options.correctLevel || QRErrorCorrectLevel.H);
    return options.styled
      ? qr.toStyledSVG({ size: options.size || 256, ...options.style })
      : qr.toSVG(options.size || 256);
  });
}

// ============ 异步生成（带缓存选项，高级版本）============

export interface AsyncQRCodeOptions extends Partial<QRCodeOptions> {
  styled?: boolean;
  style?: StyledSVGOptions;
  cache?: boolean;
}

export interface QRCodeResult {
  text: string;
  svg: string;
  moduleCount: number;
}

export function generateQRCodeAsyncAdvanced(text: string, options: AsyncQRCodeOptions = {}): Promise<QRCodeResult> {
  return new Promise((resolve, reject) => {
    // 检查是否在 Worker 中
    // @ts-ignore - WorkerGlobalScope is not in standard lib
    if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && (self as any) instanceof (self as any).constructor) {
      try {
        const useCache = options.cache !== false;
        const qr = useCache
          ? getCachedQRCode(text, options.correctLevel || QRErrorCorrectLevel.H)
          : new QRCodeCore(text, options.correctLevel || QRErrorCorrectLevel.H);
        const svg = options.styled
          ? qr.toStyledSVG({ size: options.size || 256, ...options.style })
          : qr.toSVG(options.size || 256);
        resolve({ text, svg, moduleCount: qr.getModuleCount() });
      } catch (e) {
        reject(e);
      }
    } else {
      // 在主线程中，使用 setTimeout 避免阻塞
      // @ts-ignore - using setTimeout for async operation
      setTimeout(() => {
        try {
          const useCache = options.cache !== false;
          const qr = useCache
            ? getCachedQRCode(text, options.correctLevel || QRErrorCorrectLevel.H)
            : new QRCodeCore(text, options.correctLevel || QRErrorCorrectLevel.H);
          const svg = options.styled
            ? qr.toStyledSVG({ size: options.size || 256, ...options.style })
            : qr.toSVG(options.size || 256);
          resolve({ text, svg, moduleCount: qr.getModuleCount() });
        } catch (e) {
          reject(e);
        }
      }, 0);
    }
  });
}

export function generateBatchAsyncAdvanced(texts: string[], options: AsyncQRCodeOptions = {}): Promise<QRCodeResult[]> {
  return Promise.all(texts.map(text => generateQRCodeAsyncAdvanced(text, options)));
}

// ============ 向后兼容的 snake_case 别名 ============

export const generate_rounded_qrcode = generateRoundedQRCode;
export const generate_qrcode_with_logo_area = generateQRCodeWithLogoArea;
export const generate_gradient_qrcode = generateGradientQRCode;
export const generate_wechat_style_qrcode = generateWechatStyleQRCode;
export const generate_douyin_style_qrcode = generateDouyinStyleQRCode;
export const generate_alipay_style_qrcode = generateAlipayStyleQRCode;
export const generate_xiaohongshu_style_qrcode = generateXiaohongshuStyleQRCode;
export const generate_cyberpunk_style_qrcode = generateCyberpunkStyleQRCode;
export const generate_retro_style_qrcode = generateRetroStyleQRCode;
export const generate_minimal_style_qrcode = generateMinimalStyleQRCode;

// QRCodeCore 的 snake_case 方法别名
// @ts-expect-error - Adding methods to prototype intentionally
QRCodeCore.prototype.get_module_count = QRCodeCore.prototype.getModuleCount;

// @ts-expect-error - Adding methods to prototype intentionally
QRCodeCore.prototype.get_svg = QRCodeCore.prototype.toSVG;

// @ts-expect-error - Adding methods to prototype intentionally
QRCodeCore.prototype.get_styled_svg = QRCodeCore.prototype.toStyledSVG;

// ============ QRCode 别名 ============
export { QRCodeCore as QRCode };

// ============ 版本信息 ============
export const VERSION = '1.0.0';

export function getVersionInfo(): string {
  return JSON.stringify({
    version: VERSION,
    name: '@veaba/qrcode-js-shared',
    features: [
      'basic_qrcode',
      'styled_svg',
      'batch_generation',
      'async_generation',
      'lru_cache'
    ]
  });
}

// 默认导出
export default QRCodeCore;
