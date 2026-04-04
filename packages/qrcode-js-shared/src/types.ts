/**
 * 统一的 QRCode 类型定义
 * 确保后端三个子包（qrcode-node, qrcode-rust, qrcode-bun）API 一致
 */

// ============ 基础常量 ============

export enum QRErrorCorrectLevel {
  L = 1,  // 低 (~7%)
  M = 0,  // 中 (~15%)
  Q = 3,  // 较高 (~25%)
  H = 2   // 高 (~30%)
}

export const QRMode = {
  MODE_8BIT_BYTE: 4
} as const;

// ============ 选项接口 ============

export interface QRCodeOptions {
  /** 二维码文本内容 */
  text: string;
  /** 错误纠正级别 */
  correctLevel?: QRErrorCorrectLevel;
  /** 二维码尺寸（像素） */
  size?: number;
  /** 深色颜色 */
  colorDark?: string;
  /** 浅色颜色 */
  colorLight?: string;
}

export interface StyledSVGOptions {
  /** 尺寸 */
  size?: number;
  /** 深色颜色 */
  colorDark?: string;
  /** 浅色颜色 */
  colorLight?: string;
  /** 圆角半径 */
  borderRadius?: number;
  /** 渐变配置 */
  gradient?: { color1: string; color2: string } | null;
  /** 静默区大小 */
  quietZone?: number;
  /** Logo 区域 */
  logoRegions?: Array<{ row: number; col: number; size: number }>;
}

export interface QRCodeResult {
  /** 文本内容 */
  text: string;
  /** SVG 字符串 */
  svg: string;
  /** 模块数量 */
  moduleCount: number;
}

// ============ QRCode 类接口（抽象） ============

export interface IQRCode {
  /** 文本内容 */
  readonly text: string;
  /** 错误纠正级别 */
  readonly correctLevel: QRErrorCorrectLevel;
  /** 版本号 */
  readonly typeNumber: number;
  /** 模块数量 */
  readonly moduleCount: number;

  /** 检查指定位置是否为深色模块 */
  isDark(row: number, col: number): boolean;
  /** 获取模块数量 */
  getModuleCount(): number;
  /** 生成 SVG */
  toSVG(size?: number): string;
  /** 生成带样式的 SVG */
  toStyledSVG(options?: StyledSVGOptions): string;
  /** 生成终端字符画 */
  toTerminal(invert?: boolean, quietZone?: number): string;
  /** 生成 Braille 终端字符画 */
  toTerminalBraille(): string;
  /** 生成彩色终端字符画 */
  toTerminalColor(fgColor?: string, bgColor?: string): string;
}

// ============ 样式生成函数类型 ============

export type GenerateQRCodeFunction = (text: string, size?: number) => string;

export type GenerateStyledQRCodeFunction = (
  text: string,
  size?: number,
  ...args: any[]
) => string;

// ============ 批量/异步生成类型 ============

export type GenerateBatchFunction = (
  texts: string[],
  options?: Partial<QRCodeOptions>
) => string[];

export type GenerateBatchAsyncFunction = (
  texts: string[],
  options?: Partial<QRCodeOptions>
) => Promise<string[]>;

export type GenerateQRCodeAsyncFunction = (
  text: string,
  options?: Partial<QRCodeOptions>
) => Promise<string>;

// ============ 后端统一 API 接口 ============

/**
 * 后端 QRCode 包必须实现的统一接口
 */
export interface IBackendQRCodePackage {
  // 常量
  QRErrorCorrectLevel: typeof QRErrorCorrectLevel;
  QRMode: typeof QRMode;
  
  // QRCode 类
  QRCode: new (text: string, correctLevel?: QRErrorCorrectLevel) => IQRCode;
  
  // 样式生成函数
  generateRoundedQRCode: GenerateStyledQRCodeFunction;
  generateQRCodeWithLogoArea: GenerateStyledQRCodeFunction;
  generateGradientQRCode: GenerateStyledQRCodeFunction;
  generateWechatStyleQRCode: GenerateQRCodeFunction;
  generateDouyinStyleQRCode: GenerateQRCodeFunction;
  generateAlipayStyleQRCode: GenerateQRCodeFunction;
  generateXiaohongshuStyleQRCode: GenerateQRCodeFunction;
  generateCyberpunkStyleQRCode: GenerateQRCodeFunction;
  generateRetroStyleQRCode: GenerateQRCodeFunction;
  generateMinimalStyleQRCode: GenerateQRCodeFunction;
  
  // 批量/异步生成
  generateBatchQRCodes: GenerateBatchFunction;
  generateQRCodeAsync: GenerateQRCodeAsyncFunction;
  generateBatchAsync: GenerateBatchAsyncFunction;
}

// ============ 平台特定扩展 ============

/**
 * Node.js 平台特定接口
 */
export interface INodeQRCode extends IQRCode {
  /** 生成 PNG Buffer */
  toPNGBuffer(size?: number): Buffer;
}

/**
 * Bun 平台特定接口
 */
export interface IBunQRCode extends IQRCode {
  /** 保存到文件 */
  saveToFile(filepath: string, size?: number): Promise<void>;
  /** 保存 PNG 到文件 */
  savePNGToFile(filepath: string, size?: number): Promise<void>;
  /** 获取模块数据为 JSON */
  getModulesJSON(): string;
}
