/**
 * @veaba/qrcode-js - Unit Tests
 * Tests for browser-compatible QRCode library
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QRCode,
  QRCodeCore,
  QRErrorCorrectLevel,
  QRMode,
  generateRoundedQRCode,
  generateQRCodeWithLogoArea,
  generateGradientQRCode,
  generateWechatStyleQRCode,
  generateDouyinStyleQRCode,
  generateAlipayStyleQRCode,
  generateXiaohongshuStyleQRCode,
  generateCyberpunkStyleQRCode,
  generateRetroStyleQRCode,
  generateMinimalStyleQRCode,
  generateBatchQRCodes,
  generateQRCodeAsync,
  generateBatchAsync,
  getCachedQRCode,
  clearQRCodeCache,
  getCacheStats,
} from '../../packages/qrcode-js/src/index.ts';

describe('@veaba/qrcode-js - QRCodeCore Class', () => {
  it('should create QRCodeCore with text', () => {
    const qr = new QRCodeCore('Hello World');
    expect(qr.text).toBe('Hello World');
    expect(qr.moduleCount).toBeGreaterThan(0);
  });

  it('should use default error correction level H', () => {
    const qr = new QRCodeCore('test');
    expect(qr.correctLevel).toBe(QRErrorCorrectLevel.H);
  });

  it('should accept custom error correction level', () => {
    const qr = new QRCodeCore('test', QRErrorCorrectLevel.L);
    expect(qr.correctLevel).toBe(QRErrorCorrectLevel.L);
  });

  it('should have typeNumber property', () => {
    const qr = new QRCodeCore('test');
    expect(qr.typeNumber).toBeGreaterThan(0);
  });

  it('should isDark return boolean', () => {
    const qr = new QRCodeCore('test');
    expect(typeof qr.isDark(0, 0)).toBe('boolean');
  });

  it('should getModuleCount return correct value', () => {
    const qr = new QRCodeCore('test');
    expect(qr.getModuleCount()).toBe(qr.moduleCount);
  });

  it('should toSVG generate valid SVG string', () => {
    const qr = new QRCodeCore('test');
    const svg = qr.toSVG(256);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should toStyledSVG generate SVG with options', () => {
    const qr = new QRCodeCore('test');
    const svg = qr.toStyledSVG({
      size: 256,
      colorDark: '#FF0000',
      colorLight: '#FFFFFF',
      borderRadius: 8,
    });
    expect(svg).toContain('#FF0000');
    expect(svg).toContain('#FFFFFF');
  });

  it('should toStyledSVG with gradient', () => {
    const qr = new QRCodeCore('test');
    const svg = qr.toStyledSVG({
      size: 256,
      gradient: { color1: '#667eea', color2: '#764ba2' },
    });
    expect(svg).toContain('linearGradient');
  });

  it('should toStyledSVG with quiet zone', () => {
    const qr = new QRCodeCore('test');
    const svg = qr.toStyledSVG({ quietZone: 4 });
    expect(svg).toContain('<svg');
  });
});

describe('@veaba/qrcode-js - QRCode Class', () => {
  it('should create QRCode with text', () => {
    const qr = new QRCode('Hello World');
    expect(qr.text).toBe('Hello World');
    expect(qr.moduleCount).toBeGreaterThan(0);
  });

  it('should use default error correction level H', () => {
    const qr = new QRCode('test');
    expect(qr.correctLevel).toBe(QRErrorCorrectLevel.H);
  });

  it('should accept custom error correction level', () => {
    const qr = new QRCode('test', QRErrorCorrectLevel.L);
    expect(qr.correctLevel).toBe(QRErrorCorrectLevel.L);
  });

  it('should have typeNumber property', () => {
    const qr = new QRCode('test');
    expect(qr.typeNumber).toBeGreaterThan(0);
  });

  it('should isDark return boolean', () => {
    const qr = new QRCode('test');
    expect(typeof qr.isDark(0, 0)).toBe('boolean');
  });

  it('should getModuleCount return correct value', () => {
    const qr = new QRCode('test');
    expect(qr.getModuleCount()).toBe(qr.moduleCount);
  });

  it('should toSVG generate valid SVG string', () => {
    const qr = new QRCode('test');
    const svg = qr.toSVG(256);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('@veaba/qrcode-js - Constants', () => {
  it('should export QRErrorCorrectLevel enum', () => {
    expect(QRErrorCorrectLevel.L).toBe(1);
    expect(QRErrorCorrectLevel.M).toBe(0);
    expect(QRErrorCorrectLevel.Q).toBe(3);
    expect(QRErrorCorrectLevel.H).toBe(2);
  });

  it('should export QRMode constant', () => {
    expect(QRMode.MODE_8BIT_BYTE).toBe(4);
  });
});

describe('@veaba/qrcode-js - Style Generator Functions', () => {
  it('generateRoundedQRCode should return SVG', () => {
    const svg = generateRoundedQRCode('test', 256, 8);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('generateQRCodeWithLogoArea should return SVG with logo area', () => {
    const svg = generateQRCodeWithLogoArea('test', 256, 0.2);
    expect(svg).toContain('<svg');
    expect(svg).toContain('rect');
  });

  it('generateGradientQRCode should return SVG with gradient', () => {
    const svg = generateGradientQRCode('test', 256, '#667eea', '#764ba2');
    expect(svg).toContain('linearGradient');
    expect(svg).toContain('#667eea');
  });

  it('generateWechatStyleQRCode should use WeChat green', () => {
    const svg = generateWechatStyleQRCode('test', 256);
    expect(svg).toContain('#07C160');
  });

  it('generateDouyinStyleQRCode should use Douyin colors', () => {
    const svg = generateDouyinStyleQRCode('test', 256);
    expect(svg).toContain('#00F2EA');
  });

  it('generateAlipayStyleQRCode should use Alipay blue', () => {
    const svg = generateAlipayStyleQRCode('test', 256);
    expect(svg).toContain('#1677FF');
  });

  it('generateXiaohongshuStyleQRCode should use Xiaohongshu red', () => {
    const svg = generateXiaohongshuStyleQRCode('test', 256);
    expect(svg).toContain('#FF2442');
  });

  it('generateCyberpunkStyleQRCode should use cyberpunk colors', () => {
    const svg = generateCyberpunkStyleQRCode('test', 256);
    expect(svg).toContain('#FF00FF');
    expect(svg).toContain('#00FFFF');
  });

  it('generateRetroStyleQRCode should use retro colors', () => {
    const svg = generateRetroStyleQRCode('test', 256);
    expect(svg).toContain('#8B4513');
  });

  it('generateMinimalStyleQRCode should use minimal colors', () => {
    const svg = generateMinimalStyleQRCode('test', 256);
    expect(svg).toContain('#333333');
  });
});

describe('@veaba/qrcode-js - Batch Generation', () => {
  it('generateBatchQRCodes should return array of SVGs', () => {
    const svgs = generateBatchQRCodes(['test1', 'test2', 'test3']);
    expect(svgs).toHaveLength(3);
    svgs.forEach(svg => {
      expect(svg).toContain('<svg');
    });
  });

  it('generateBatchQRCodes should accept options', () => {
    const svgs = generateBatchQRCodes(['test'], { size: 128, correctLevel: QRErrorCorrectLevel.L });
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toContain('<svg');
  });
});

describe('@veaba/qrcode-js - Async Generation', () => {
  it('generateQRCodeAsync should return Promise with SVG', async () => {
    const svg = await generateQRCodeAsync('test');
    expect(svg).toContain('<svg');
  });

  it('generateQRCodeAsync should accept options', async () => {
    const svg = await generateQRCodeAsync('test', { size: 128 });
    expect(svg).toContain('<svg');
  });

  it('generateBatchAsync should return Promise with array', async () => {
    const svgs = await generateBatchAsync(['test1', 'test2']);
    expect(svgs).toHaveLength(2);
    svgs.forEach(svg => {
      expect(svg).toContain('<svg');
    });
  });
});

describe('@veaba/qrcode-js - Cache Management', () => {
  beforeEach(() => {
    clearQRCodeCache();
  });

  it('should create and cache QRCode if not exists', () => {
    const cached = getCachedQRCode('test', QRErrorCorrectLevel.H);
    expect(cached).toBeDefined();
    expect(cached.text).toBe('test');
    expect(cached.correctLevel).toBe(QRErrorCorrectLevel.H);
  });

  it('should return cached QRCode if exists', () => {
    const qr1 = getCachedQRCode('test', QRErrorCorrectLevel.H);
    const qr2 = getCachedQRCode('test', QRErrorCorrectLevel.H);
    expect(qr1).toBe(qr2); // Same instance
  });

  it('should cache generated QRCode', () => {
    const qr = new QRCodeCore('test');
    qr.toSVG();
    const stats = getCacheStats();
    expect(typeof stats).toBe('object');
  });

  it('should clear cache', () => {
    getCachedQRCode('test', QRErrorCorrectLevel.H);
    clearQRCodeCache();
    const stats = getCacheStats();
    expect(stats.size).toBe(0);
  });
});

describe('@veaba/qrcode-js - Edge Cases', () => {
  it('should handle empty string', () => {
    const qr = new QRCodeCore('');
    expect(qr.text).toBe('');
    expect(qr.moduleCount).toBeGreaterThan(0);
  });

  it('should handle unicode characters', () => {
    const qr = new QRCodeCore('你好世界🌍');
    expect(qr.text).toBe('你好世界🌍');
    const svg = qr.toSVG();
    expect(svg).toContain('<svg');
  });

  it('should handle very long text', () => {
    const longText = 'a'.repeat(1000);
    const qr = new QRCodeCore(longText);
    expect(qr.text).toBe(longText);
  });

  it('should handle URL', () => {
    const url = 'https://example.com/path?query=value';
    const qr = new QRCodeCore(url);
    expect(qr.text).toBe(url);
  });
});

describe('@veaba/qrcode-js - URL String Tests', () => {
  const testUrls = [
    'http://127.0.0.1:8080/106p.zip',
    'http://127.0.0.1:8080/%E9%80%89%E7%89%87.zip',
  ];

  it('should generate QR codes for test URLs', () => {
    for (const url of testUrls) {
      const qr = new QRCodeCore(url, QRErrorCorrectLevel.H);
      expect(qr.text).toBe(url);
      expect(qr.moduleCount).toBeGreaterThan(0);
      const svg = qr.toSVG();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('should generate styled QR codes for test URLs', () => {
    for (const url of testUrls) {
      const roundedSvg = generateRoundedQRCode(url, 256, 8);
      expect(roundedSvg).toContain('<svg');
      const gradientSvg = generateGradientQRCode(url, 256, '#667eea', '#764ba2');
      expect(gradientSvg).toContain('<svg');
    }
  });

  it('should generate consistent module counts for test URLs', () => {
    for (const url of testUrls) {
      const qr1 = new QRCodeCore(url, QRErrorCorrectLevel.H);
      const qr2 = new QRCodeCore(url, QRErrorCorrectLevel.H);
      expect(qr1.moduleCount).toBe(qr2.moduleCount);
    }
  });

  it('should batch generate QR codes for test URLs', () => {
    const svgs = generateBatchQRCodes(testUrls, { size: 256, correctLevel: QRErrorCorrectLevel.H });
    expect(svgs).toHaveLength(2);
    svgs.forEach(svg => {
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  it('should async generate QR codes for test URLs', async () => {
    for (const url of testUrls) {
      const svg = await generateQRCodeAsync(url, { size: 256, correctLevel: QRErrorCorrectLevel.H });
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });
});

describe('@veaba/qrcode-js - Terminal Output', () => {
  describe('toTerminal()', () => {
    it('should generate terminal string for simple text', () => {
      const qr = new QRCodeCore('Hello', QRErrorCorrectLevel.L);
      const terminal = qr.toTerminal();
      expect(terminal).toBeDefined();
      expect(typeof terminal).toBe('string');
      expect(terminal.length).toBeGreaterThan(0);
    });

    it('should contain block characters', () => {
      const qr = new QRCodeCore('Test', QRErrorCorrectLevel.M);
      const terminal = qr.toTerminal();
      expect(terminal).toContain('█');
      expect(terminal).toContain(' ');
    });

    it('should have correct dimensions (with default quietZone=1)', () => {
      const qr = new QRCodeCore('QR Code Test', QRErrorCorrectLevel.H);
      const terminal = qr.toTerminal();
      const lines = terminal.split('\n');
      expect(lines.length).toBe(qr.moduleCount + 2);
      expect(lines[0].length).toBe((qr.moduleCount + 2) * 2);
    });

    it('should add quiet zone when specified', () => {
      const qr = new QRCodeCore('Test', QRErrorCorrectLevel.L);
      const quietZone = 2;
      const terminal = qr.toTerminal(false, quietZone);
      const lines = terminal.split('\n');
      const expectedHeight = qr.moduleCount + quietZone * 2;
      const expectedWidth = (qr.moduleCount + quietZone * 2) * 2;
      expect(lines.length).toBe(expectedHeight);
      expect(lines[0].length).toBe(expectedWidth);
    });

    it('should have visual square aspect ratio (width = 2x height)', () => {
      const qr = new QRCodeCore('Aspect Ratio Test', QRErrorCorrectLevel.M);
      const terminal = qr.toTerminal();
      const lines = terminal.split('\n');
      const height = lines.length;
      const width = lines[0].length;
      expect(width).toBe(height * 2);
    });

    it('should invert colors when invert=true', () => {
      const qr = new QRCodeCore('Invert Test', QRErrorCorrectLevel.M);
      const normal = qr.toTerminal(false);
      const inverted = qr.toTerminal(true);
      expect(normal).not.toBe(inverted);
      const normalBlocks = (normal.match(/█/g) || []).length;
      const invertedBlocks = (inverted.match(/█/g) || []).length;
      expect(normalBlocks).not.toBe(invertedBlocks);
    });

    it('should generate consistent output for same input', () => {
      const qr1 = new QRCodeCore('Consistent Test', QRErrorCorrectLevel.H);
      const qr2 = new QRCodeCore('Consistent Test', QRErrorCorrectLevel.H);
      expect(qr1.toTerminal()).toBe(qr2.toTerminal());
    });
  });

  describe('toTerminalBraille()', () => {
    it('should generate braille output', () => {
      const qr = new QRCodeCore('Braille Test', QRErrorCorrectLevel.M);
      const braille = qr.toTerminalBraille();
      expect(braille).toBeDefined();
      expect(typeof braille).toBe('string');
      expect(braille.length).toBeGreaterThan(0);
    });

    it('should contain braille characters', () => {
      const qr = new QRCodeCore('Test', QRErrorCorrectLevel.L);
      const braille = qr.toTerminalBraille();
      const brailleRegex = /[\u2800-\u28FF]/;
      expect(braille).toMatch(brailleRegex);
    });

    it('should be more compact than regular terminal output', () => {
      const qr = new QRCodeCore('Compact Test', QRErrorCorrectLevel.H);
      const terminal = qr.toTerminal();
      const braille = qr.toTerminalBraille();
      const terminalLines = terminal.split('\n').length;
      const brailleLines = braille.split('\n').length;
      expect(brailleLines).toBeLessThan(terminalLines);
    });
  });

  describe('toTerminalColor()', () => {
    it('should generate colored terminal output', () => {
      const qr = new QRCodeCore('Color Test', QRErrorCorrectLevel.M);
      const colored = qr.toTerminalColor();
      expect(colored).toBeDefined();
      expect(typeof colored).toBe('string');
      expect(colored).toContain('\x1b[');
    });

    it('should contain ANSI reset code', () => {
      const qr = new QRCodeCore('Reset Test', QRErrorCorrectLevel.L);
      const colored = qr.toTerminalColor();
      expect(colored).toContain('\x1b[0m');
    });

    it('should support different foreground colors', () => {
      const qr = new QRCodeCore('Color Test', QRErrorCorrectLevel.M);
      const black = qr.toTerminalColor('black');
      const red = qr.toTerminalColor('red');
      const blue = qr.toTerminalColor('blue');
      expect(black).toContain('\x1b[30m');
      expect(red).toContain('\x1b[31m');
      expect(blue).toContain('\x1b[34m');
    });

    it('should support background colors', () => {
      const qr = new QRCodeCore('BG Test', QRErrorCorrectLevel.L);
      const colored = qr.toTerminalColor('black', 'white');
      expect(colored).toContain('\x1b[47m');
    });
  });
});
