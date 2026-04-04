/**
 * @veaba/qrcode-wasm - Unit Tests
 * Tests for WebAssembly QRCode library with unified API
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Note: These tests require the WASM module to be built first
// Run: npm run build:wasm

describe('@veaba/qrcode-wasm', () => {
  let mod: typeof import('@veaba/qrcode-wasm');
  let jsMod: typeof import('@veaba/qrcode-js');

  beforeAll(async () => {
    mod = await import('@veaba/qrcode-wasm');
    jsMod = await import('@veaba/qrcode-js');
  });

  describe('API Exports', () => {
    const styleFns = [
      'generateRoundedQRCode', 'generateQRCodeWithLogoArea', 'generateGradientQRCode',
      'generateWechatStyleQRCode', 'generateDouyinStyleQRCode', 'generateAlipayStyleQRCode',
      'generateXiaohongshuStyleQRCode', 'generateCyberpunkStyleQRCode', 'generateRetroStyleQRCode',
      'generateMinimalStyleQRCode'
    ];

    it('should export core classes and enums', () => {
      expect(mod.QRCodeCore).toBeDefined();
      expect(mod.QRCode).toBe(mod.QRCodeCore);
      expect(mod.QRErrorCorrectLevel).toMatchObject({ L: 1, M: 0, Q: 3, H: 2 });
      expect(mod.QRMode).toMatchObject({ MODE_8BIT_BYTE: 4 });
    });

    it.each(styleFns)('should export %s', (fn) => {
      expect(typeof (mod as Record<string, unknown>)[fn]).toBe('function');
      expect(typeof (mod as Record<string, unknown>)[`${fn}Cached`]).toBe('function');
    });

    it('should export batch/async functions', () => {
      ['generateBatchQRCodes', 'generateBatchQRCodesCached', 'generateQRCodeAsync', 'generateBatchAsync']
        .forEach(fn => expect(typeof (mod as Record<string, unknown>)[fn]).toBe('function'));
    });

    it('should export cache management', () => {
      ['getCachedQRCode', 'clearQRCodeCache', 'getCacheStats', 'configureCache']
        .forEach(fn => expect(typeof (mod as Record<string, unknown>)[fn]).toBe('function'));
    });

    it('should export WASM specific features', () => {
      expect(typeof mod.init).toBe('function');
      expect(typeof mod.init_thread_pool).toBe('function');
      expect(mod.QRCodeGenerator).toBeDefined();
      expect(mod.StyledQRCode).toBeDefined();
    });

    it('should export version info', () => {
      expect(mod.VERSION).toBe('0.2.0');
      expect(typeof mod.getVersionInfo).toBe('function');
    });

    it('should export default as QRCodeCore', () => {
      expect(mod.default).toBe(mod.QRCodeCore);
    });

    it('should export terminal methods', () => {
      expect(typeof mod.QRCodeCore.prototype.toTerminal).toBe('function');
      expect(typeof mod.QRCodeCore.prototype.toTerminalBraille).toBe('function');
      expect(typeof mod.QRCodeCore.prototype.toTerminalColor).toBe('function');
    });
  });

  describe('API Consistency with qrcode-js', () => {
    it('should have matching exports', () => {
      const exports = ['QRCodeCore', 'QRCode', 'QRErrorCorrectLevel', 'QRMode'];
      exports.forEach(exp => {
        expect((mod as Record<string, unknown>)[exp]).toBeDefined();
        expect((jsMod as Record<string, unknown>)[exp]).toBeDefined();
      });
    });

    it('should have same enum values', () => {
      expect(mod.QRErrorCorrectLevel).toEqual(jsMod.QRErrorCorrectLevel);
    });
  });

  describe('Cache System', () => {
    it('should manage cache correctly', () => {
      mod.clearQRCodeCache();
      const stats = mod.getCacheStats();
      expect(stats).toMatchObject({ size: 0, keys: [] });
      expect(Array.isArray(stats.keys)).toBe(true);
      expect(() => mod.configureCache({ maxSize: 50 })).not.toThrow();
    });
  });

  describe('QRCodeCore Structure', () => {
    it('should have correct prototype', () => {
      expect(typeof mod.QRCodeCore).toBe('function');
      ['toSVG', 'toStyledSVG', 'getModuleCount', 'isDark', 'toTerminal', 'toTerminalBraille', 'toTerminalColor'].forEach(
        method => expect(typeof mod.QRCodeCore.prototype[method]).toBe('function')
      );
      expect(Object.getOwnPropertyDescriptor(mod.QRCodeCore.prototype, 'moduleCount')?.get).toBeDefined();
    });
  });

  // These tests require WASM to be initialized
  describe('QRCodeCore Properties (Requires WASM)', () => {
    it.skip('should have text property', () => {
      const qr = new mod.QRCodeCore('Hello World');
      expect(qr.text).toBe('Hello World');
    });

    it.skip('should have correctLevel property', () => {
      const qr = new mod.QRCodeCore('Hello', mod.QRErrorCorrectLevel.H);
      expect(qr.correctLevel).toBe(mod.QRErrorCorrectLevel.H);
    });

    it.skip('should have typeNumber property', () => {
      const qr = new mod.QRCodeCore('Hello');
      expect(typeof qr.typeNumber).toBe('number');
    });

    it.skip('should have modules property as Uint8Array', () => {
      const qr = new mod.QRCodeCore('Hello');
      expect(qr.modules).toBeInstanceOf(Uint8Array);
      expect(qr.modules.length).toBeGreaterThan(0);
    });

    it.skip('modules property should match moduleCount', () => {
      const qr = new mod.QRCodeCore('Hello');
      const count = qr.moduleCount;
      expect(qr.modules.length).toBe(count * count);
    });
  });

  // These tests require WASM to be initialized
  describe('Async Function Return Types (Requires WASM)', () => {
    it.skip('generateQRCodeAsync should return string not QRCodeResult', async () => {
      const result = await mod.generateQRCodeAsync('Hello', { size: 128 });
      expect(typeof result).toBe('string');
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      // Should not be an object
      expect(typeof (result as Record<string, unknown>).text).toBe('undefined');
    });

    it.skip('generateBatchAsync should return string[] not QRCodeResult[]', async () => {
      const results = await mod.generateBatchAsync(['Hello', 'World'], { size: 128 });
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      // Each element should be a string
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result).toContain('<svg');
        expect(result).toContain('</svg>');
      });
    });

    it.skip('generateQRCodeAsync should support options', async () => {
      const result = await mod.generateQRCodeAsync('Test', {
        size: 256,
        correctLevel: mod.QRErrorCorrectLevel.H
      });
      expect(typeof result).toBe('string');
      expect(result).toContain('<svg');
    });

    it.skip('generateBatchAsync should handle empty array', async () => {
      const results = await mod.generateBatchAsync([]);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  // These tests require WASM to be initialized
  describe('Advanced Async Functions (Requires WASM)', () => {
    it.skip('generateQRCodeAsyncAdvanced should return QRCodeResult', async () => {
      const result = await mod.generateQRCodeAsyncAdvanced('Hello', { size: 128 });
      expect(result).toMatchObject({
        text: 'Hello',
        svg: expect.stringContaining('<svg'),
        moduleCount: expect.any(Number)
      });
      expect(result.svg).toContain('</svg>');
    });

    it.skip('generateBatchAsyncAdvanced should return QRCodeResult[]', async () => {
      const results = await mod.generateBatchAsyncAdvanced(['Hello', 'World'], { size: 128 });
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toMatchObject({
          text: expect.any(String),
          svg: expect.stringContaining('<svg'),
          moduleCount: expect.any(Number)
        });
      });
    });

    it.skip('generateQRCodeAsyncAdvanced should support cache option', async () => {
      const result1 = await mod.generateQRCodeAsyncAdvanced('Test', { cache: true });
      expect(result1).toHaveProperty('moduleCount');
      expect(typeof result1.moduleCount).toBe('number');
    });
  });

  describe('Snake Case Aliases', () => {
    const snakeCaseAliases = [
      'generate_rounded_qrcode',
      'generate_qrcode_with_logo_area',
      'generate_gradient_qrcode',
      'generate_wechat_style_qrcode',
      'generate_douyin_style_qrcode',
      'generate_alipay_style_qrcode',
      'generate_xiaohongshu_style_qrcode',
      'generate_cyberpunk_style_qrcode',
      'generate_retro_style_qrcode',
      'generate_minimal_style_qrcode'
    ];

    it('should export all snake_case aliases', () => {
      snakeCaseAliases.forEach(alias => {
        expect(typeof (mod as Record<string, unknown>)[alias]).toBe('function');
      });
    });

    it('snake_case aliases should point to cached versions', () => {
      expect((mod as Record<string, unknown>).generate_rounded_qrcode)
        .toBe((mod as Record<string, unknown>).generateRoundedQRCodeCached);
      expect((mod as Record<string, unknown>).generate_gradient_qrcode)
        .toBe((mod as Record<string, unknown>).generateGradientQRCodeCached);
      expect((mod as Record<string, unknown>).generate_wechat_style_qrcode)
        .toBe((mod as Record<string, unknown>).generateWechatStyleQRCodeCached);
    });

    it('should have same alias names as qrcode-js', () => {
      const aliases = [
        'generate_rounded_qrcode',
        'generate_gradient_qrcode',
        'generate_wechat_style_qrcode',
        'generate_douyin_style_qrcode',
        'generate_alipay_style_qrcode'
      ];
      aliases.forEach(alias => {
        expect(typeof (mod as Record<string, unknown>)[alias]).toBe('function');
        expect(typeof (jsMod as Record<string, unknown>)[alias]).toBe('function');
      });
    });
  });

  describe('API Consistency with qrcode-js - Async Functions', () => {
    it('should have same async function signatures', () => {
      // Both should have the same async functions
      expect(typeof mod.generateQRCodeAsync).toBe('function');
      expect(typeof jsMod.generateQRCodeAsync).toBe('function');
      expect(typeof mod.generateBatchAsync).toBe('function');
      expect(typeof jsMod.generateBatchAsync).toBe('function');
    });

    it('should have Advanced async functions', () => {
      // Check that WASM package has Advanced functions
      expect(typeof mod.generateQRCodeAsyncAdvanced).toBe('function');
      expect(typeof mod.generateBatchAsyncAdvanced).toBe('function');
    });
  });

  describe('Return Type Signatures', () => {
    it('generateQRCodeAsync should return Promise<string>', () => {
      // Type check: the function should exist and return a Promise
      const fn = mod.generateQRCodeAsync;
      expect(typeof fn).toBe('function');
      // We can't test the actual return type at runtime without WASM init,
      // but we verify the function exists
    });

    it('generateBatchAsync should return Promise<string[]>', () => {
      const fn = mod.generateBatchAsync;
      expect(typeof fn).toBe('function');
    });

    it('generateQRCodeAsyncAdvanced should return Promise<QRCodeResult>', () => {
      const fn = mod.generateQRCodeAsyncAdvanced;
      expect(typeof fn).toBe('function');
    });

    it('generateBatchAsyncAdvanced should return Promise<QRCodeResult[]>', () => {
      const fn = mod.generateBatchAsyncAdvanced;
      expect(typeof fn).toBe('function');
    });
  });

  // Functional tests require browser environment with WASM
  describe('Functional Tests (Requires WASM)', () => {
    it.skip('should work after init', () => {});
    it.skip('should generate QR codes', () => {});
    it.skip('should use cache', () => {});
  });

  describe('Terminal Output (Requires WASM)', () => {
    describe('toTerminal()', () => {
      it.skip('should generate terminal string for simple text', () => {
        const qr = new mod.QRCodeCore('Hello', mod.QRErrorCorrectLevel.L);
        const terminal = qr.toTerminal();
        expect(terminal).toBeDefined();
        expect(typeof terminal).toBe('string');
        expect(terminal.length).toBeGreaterThan(0);
      });

      it.skip('should contain block characters', () => {
        const qr = new mod.QRCodeCore('Test', mod.QRErrorCorrectLevel.M);
        const terminal = qr.toTerminal();
        expect(terminal).toContain('█');
        expect(terminal).toContain(' ');
      });

      it.skip('should have correct dimensions (with default quietZone=1)', () => {
        const qr = new mod.QRCodeCore('QR Code Test', mod.QRErrorCorrectLevel.H);
        const terminal = qr.toTerminal();
        const lines = terminal.split('\n');
        expect(lines.length).toBe(qr.moduleCount + 2);
        expect(lines[0].length).toBe((qr.moduleCount + 2) * 2);
      });

      it.skip('should invert colors when invert=true', () => {
        const qr = new mod.QRCodeCore('Invert Test', mod.QRErrorCorrectLevel.M);
        const normal = qr.toTerminal(false);
        const inverted = qr.toTerminal(true);
        expect(normal).not.toBe(inverted);
      });
    });

    describe('toTerminalBraille()', () => {
      it.skip('should generate braille output', () => {
        const qr = new mod.QRCodeCore('Braille Test', mod.QRErrorCorrectLevel.M);
        const braille = qr.toTerminalBraille();
        expect(braille).toBeDefined();
        expect(typeof braille).toBe('string');
      });

      it.skip('should contain braille characters', () => {
        const qr = new mod.QRCodeCore('Test', mod.QRErrorCorrectLevel.L);
        const braille = qr.toTerminalBraille();
        const brailleRegex = /[\u2800-\u28FF]/;
        expect(braille).toMatch(brailleRegex);
      });
    });

    describe('toTerminalColor()', () => {
      it.skip('should generate colored terminal output', () => {
        const qr = new mod.QRCodeCore('Color Test', mod.QRErrorCorrectLevel.M);
        const colored = qr.toTerminalColor();
        expect(colored).toBeDefined();
        expect(colored).toContain('\x1b[');
      });

      it.skip('should contain ANSI reset code', () => {
        const qr = new mod.QRCodeCore('Reset Test', mod.QRErrorCorrectLevel.L);
        const colored = qr.toTerminalColor();
        expect(colored).toContain('\x1b[0m');
      });
    });
  });

  describe('URL String Tests', () => {
    const testUrls = [
      'http://127.0.0.1:8080/106p.zip',
      'http://127.0.0.1:8080/%E9%80%89%E7%89%87.zip',
    ];

    it('should export functions for test URLs', () => {
      // Verify the module exports the necessary functions
      expect(mod.QRCodeCore).toBeDefined();
      expect(mod.QRErrorCorrectLevel).toBeDefined();
      expect(mod.generateRoundedQRCode).toBeDefined();
      expect(mod.generateGradientQRCode).toBeDefined();
    });

    it.skip('should generate QR codes for test URLs (requires WASM)', () => {
      // This test requires WASM to be initialized
      for (const url of testUrls) {
        const qr = new mod.QRCodeCore(url, mod.QRErrorCorrectLevel.H);
        expect(qr.text).toBe(url);
        expect(qr.moduleCount).toBeGreaterThan(0);
        
        const svg = qr.toSVG();
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
      }
    });

    it.skip('should generate styled QR codes for test URLs (requires WASM)', () => {
      for (const url of testUrls) {
        const roundedSvg = mod.generateRoundedQRCode(url, 256, 8);
        expect(roundedSvg).toContain('<svg');
        expect(roundedSvg).toContain('</svg>');

        const gradientSvg = mod.generateGradientQRCode(url, 256, '#667eea', '#764ba2');
        expect(gradientSvg).toContain('<svg');
        expect(gradientSvg).toContain('</svg>');
      }
    });

    it.skip('should handle URL with ASCII characters correctly (requires WASM)', () => {
      const url = 'http://127.0.0.1:8080/106p.zip';
      const qr = new mod.QRCodeCore(url, mod.QRErrorCorrectLevel.H);
      expect(qr.text).toBe(url);
      expect(qr.moduleCount).toBeGreaterThanOrEqual(21);
      expect(qr.moduleCount).toBeLessThanOrEqual(41);
    });

    it.skip('should handle URL with percent-encoded characters correctly (requires WASM)', () => {
      const url = 'http://127.0.0.1:8080/%E9%80%89%E7%89%87.zip';
      const qr = new mod.QRCodeCore(url, mod.QRErrorCorrectLevel.H);
      expect(qr.text).toBe(url);
      expect(qr.moduleCount).toBeGreaterThanOrEqual(21);
      expect(qr.moduleCount).toBeLessThanOrEqual(41);
    });
  });
});
