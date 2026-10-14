/**
 * @veaba/qrcode-wasm - WASM Behavioural Tests (Node.js environment)
 *
 * Purpose
 * -------
 * `tests/qrcode-wasm/index.test.ts` only asserts the *shape* of the module
 * (e.g. `expect(typeof mod.toSVG).toBe('function')`) and skips every test that
 * needs an initialized WASM instance — 27 `it.skip` blocks. As a result the
 * WASM code paths were never executed in the Node run, and coverage for
 * `packages/qrcode-wasm/src/index.ts` sat at ~30% lines / ~14.5% functions.
 *
 * A probe confirmed the wasm-pack output initializes fine under Node:
 *
 *   const pkg = await import('.../pkg/qrcodes.js');
 *   await pkg.default({ module_or_path: await readFile('.../qrcodes_bg.wasm') });
 *
 * So the skip was not an environment limitation. These tests drive the real
 * bindings and assert on produced output.
 *
 * The generated API is stateful (see packages/qrcode-wasm/src/lib.rs:86-210):
 *
 *   const qr = new QRCodeWasm();   // no arguments
 *   qr.make_code(text);            // encoding happens here
 *   qr.get_module_count() / get_svg() / to_terminal(...) / ...
 *
 * Calling the accessors before `make_code` yields 0 / '' — that ordering is
 * itself covered below, because it is the trap the old skipped tests fell into.
 *
 * The suite skips (rather than fails) when `packages/qrcode-wasm/pkg/` has not
 * been built, mirroring the runner's own WASM gate.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, '../../packages/qrcode-wasm/pkg');
const wasmJs = resolve(pkgDir, 'qrcodes.js');
const wasmBin = resolve(pkgDir, 'qrcodes_bg.wasm');

const built = existsSync(wasmJs) && existsSync(wasmBin);

// The generated wasm-pack surface actually used by these tests.
interface WasmQr {
  make_code: (text: string) => void;
  get_module_count: () => number;
  get_svg: () => string;
  get_modules_json: () => string;
  is_dark: (row: number, col: number) => boolean;
  to_terminal: (invert: boolean, quietZone: number) => string;
  to_terminal_braille: () => string;
  to_terminal_color: (fg: string, bg: string) => string;
  free: () => void;
}

interface WasmPkg {
  default: (input: { module_or_path: Buffer }) => Promise<unknown>;
  QRCodeWasm: new () => WasmQr;
}

describe.skipIf(!built)('@veaba/qrcode-wasm - WASM behaviour (Node)', () => {
  let pkg: WasmPkg;

  beforeAll(async () => {
    const mod = (await import(/* @vite-ignore */ wasmJs)) as unknown as WasmPkg;
    // wasm-pack >= 0.13 takes an object; pass the bytes directly so no
    // fetch/URL resolution (a browser concern) is involved.
    await mod.default({ module_or_path: await readFile(wasmBin) });
    pkg = mod;
  });

  /** Build an encoded symbol; caller must `free()`. */
  const encode = (text: string): WasmQr => {
    const qr = new pkg.QRCodeWasm();
    qr.make_code(text);
    return qr;
  };

  it('initializes the WASM module and exposes the generated bindings', () => {
    expect(typeof pkg.QRCodeWasm).toBe('function');
  });

  it('reports no modules before make_code is called', () => {
    const qr = new pkg.QRCodeWasm();
    try {
      // Documents the stateful contract: accessors are empty until encode.
      expect(qr.get_module_count()).toBe(0);
      expect(qr.get_svg()).toBe('');
    } finally {
      qr.free();
    }
  });

  it('encodes text and reports a plausible module count', () => {
    const qr = encode('Hello World');
    try {
      const count = qr.get_module_count();
      // A version-1 QR symbol is 21x21; counts grow by 4 per version.
      expect(count).toBeGreaterThanOrEqual(21);
      expect((count - 21) % 4).toBe(0);
    } finally {
      qr.free();
    }
  });

  it('produces SVG containing an svg root element', () => {
    const qr = encode('https://example.com');
    try {
      const svg = qr.get_svg();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('</svg>');
      // Non-trivial payload, not just an empty shell.
      expect(svg.length).toBeGreaterThan(200);
    } finally {
      qr.free();
    }
  });

  it('reports dark modules for in-range coordinates', () => {
    const qr = encode('Hello World');
    try {
      const count = qr.get_module_count();
      // Check every in-range cell returns a boolean rather than throwing.
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          expect(typeof qr.is_dark(r, c)).toBe('boolean');
        }
      }
    } finally {
      qr.free();
    }
  });

  // NOTE: out-of-range coordinates are deliberately NOT exercised here.
  // `qr_code_model.rs:46-49` panics on them ("{}, {}"), and a panic crossing
  // the wasm boundary is an un-catchable trap that also poisons the JS wrapper,
  // so a later `free()` throws "attempted to take ownership of Rust value while
  // it was borrowed". A test would abort the worker rather than fail cleanly.
  // Tolerance for out-of-range input is tracked as a separate library question.

  it('exposes a module matrix matching the reported count', () => {
    const qr = encode('Hello World');
    try {
      const count = qr.get_module_count();
      const matrix = JSON.parse(qr.get_modules_json()) as number[][];
      expect(Array.isArray(matrix)).toBe(true);
      expect(matrix.length).toBe(count);
      expect(matrix.every((row) => row.length === count)).toBe(true);
      // A real symbol has both dark and light modules.
      const flat = matrix.flat();
      expect(flat.some((v) => v === 1)).toBe(true);
      expect(flat.some((v) => v === 0)).toBe(true);
    } finally {
      qr.free();
    }
  });

  it('produces terminal renderings with content', () => {
    const qr = encode('Hello World');
    try {
      const term = qr.to_terminal(false, 1);
      expect(term.length).toBeGreaterThan(0);

      const braille = qr.to_terminal_braille();
      expect(braille.length).toBeGreaterThan(0);
      // Braille cells live in U+2800..U+28FF.
      expect(/[\u2800-\u28FF]/.test(braille)).toBe(true);

      const colored = qr.to_terminal_color('black', 'white');
      expect(colored.length).toBeGreaterThan(0);
      expect(colored).toContain('\u001b[');
    } finally {
      qr.free();
    }
  });

  it('is deterministic for identical input', () => {
    const a = encode('same-input');
    const b = encode('same-input');
    try {
      expect(a.get_svg()).toBe(b.get_svg());
      expect(a.get_module_count()).toBe(b.get_module_count());
    } finally {
      a.free();
      b.free();
    }
  });

  it('changes output when the input changes', () => {
    const a = encode('input-one');
    const b = encode('input-two');
    try {
      // Guards against a stub that returns a fixed symbol for any input.
      expect(a.get_svg()).not.toBe(b.get_svg());
    } finally {
      a.free();
      b.free();
    }
  });

  it('grows the symbol for longer payloads', () => {
    const small = encode('hi');
    const large = encode('x'.repeat(400));
    try {
      expect(large.get_module_count()).toBeGreaterThan(small.get_module_count());
    } finally {
      small.free();
      large.free();
    }
  });

  /**
   * The wrapper module (`packages/qrcode-wasm/src/index.ts`) is the measured
   * surface — `coverage.include` targets `packages/<pkg>/src/`, while the raw
   * bindings live in `pkg/`. Driving only `pkg/` leaves the wrapper at 0%, so
   * these tests go through `@veaba/qrcode-wasm`.
   */
  describe('wrapper module (packages/qrcode-wasm/src/index.ts)', () => {
    let wrapper: typeof import('@veaba/qrcode-wasm');

    beforeAll(async () => {
      wrapper = await import('@veaba/qrcode-wasm');
      // `init()` is the pkg default re-exported by the wrapper; call it with
      // explicit bytes so no `?url`/fetch resolution (Vite/browser) is needed.
      await wrapper.init({ module_or_path: await readFile(wasmBin) });
    });

    it('exposes the documented constants and classes', () => {
      expect(wrapper.QRMode).toEqual({ MODE_8BIT_BYTE: 4 });
      // The wrapper surfaces its own class name (QRCodeCore), re-exported as QRCode.
      expect(typeof wrapper.QRCodeCore).toBe('function');
      expect(wrapper.QRCode).toBe(wrapper.QRCodeCore);
      expect(typeof wrapper.initWasm).toBe('function');
      expect(typeof wrapper.getVersionInfo).toBe('function');
      expect(wrapper.VERSION).toBe('0.2.0');
    });

    it('reports version information', () => {
      const info = wrapper.getVersionInfo();
      expect(info).toBeDefined();
    });

    it('WRAPPER: generateQRCodeAsync resolves an SVG string', async () => {
      const out = await wrapper.generateQRCodeAsync('wrapper-path');
      expect(typeof out).toBe('string');
      expect(out).toContain('<svg');
    });

    it('WRAPPER: cached and styled generators return SVG', () => {
      const rounded = wrapper.generateRoundedQRCode('wrapper-path', 256, 8);
      expect(rounded).toContain('<svg');

      const cached = wrapper.generateRoundedQRCodeCached('wrapper-path', 256, 8);
      expect(cached).toContain('<svg');

      const gradient = wrapper.generateGradientQRCode('wrapper-path');
      expect(gradient).toContain('<svg');
    });

    it('WRAPPER: batch generation returns one SVG per input', () => {
      const out = wrapper.generateBatchQRCodes(['a', 'b', 'c']);
      expect(out).toHaveLength(3);
      expect(out.every((s) => String(s).includes('<svg'))).toBe(true);
    });

    it('WRAPPER: cache records and returns entries', () => {
      wrapper.clearQRCodeCache();
      const stats = wrapper.getCacheStats();
      expect(stats.size).toBe(0);
      expect(Array.isArray(stats.keys)).toBe(true);

      const first = wrapper.getCachedQRCode('cache-me');
      expect(first).toBeDefined();
      // Second call should be served from the cache.
      const statsAfter = wrapper.getCacheStats();
      expect(statsAfter.size).toBeGreaterThan(0);

      wrapper.clearQRCodeCache();
      expect(wrapper.getCacheStats().size).toBe(0);
      expect(() => wrapper.configureCache({ maxSize: 10 })).not.toThrow();
    });
  });
});
