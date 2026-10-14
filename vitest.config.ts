import { defineConfig } from 'vitest/config';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      '@veaba/qrcode-js': path.resolve(__dirname, 'packages/qrcode-js/src/index.ts'),
      '@veaba/qrcode-js-shared': path.resolve(__dirname, 'packages/qrcode-js-shared/dist/index.js'),
      '@veaba/qrcode-wasm': path.resolve(__dirname, 'packages/qrcode-wasm/src/index.ts'),
      '@veaba/qrcode-wasm/qrcodes': path.resolve(__dirname, 'packages/qrcode-wasm/pkg/qrcodes.js'),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,js}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.browser.test.{ts,js}', '**/demo*.{ts,js}'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      // Measure the SOURCE under test, not the test files themselves.
      // The previous value was ['tests/**/*.ts', 'tests/**/*.js'], which
      // instrumented only the test files and then excluded every
      // `*.test.{ts,js}` — leaving just the `demo.ts` helpers in the report
      // (0% across the board) while `packages/*/src/` was never instrumented
      // at all. That report was uploaded to Codecov.
      include: ['packages/*/src/**/*.{ts,js}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.{ts,js}',
        '**/types.ts',
        '**/*.d.ts',
        // Pure re-export module: packages/qrcode-js/src/index.ts is 88 lines of
        // `export { ... } from '@veaba/qrcode-js-shared'` with no executable
        // statement of its own. Instrumentation records a single
        // `DA:1,1` line, so it reported a meaningless 100% that inflated the
        // project total without testing anything. The real implementation is
        // measured where it lives — packages/qrcode-js-shared/src.
        'packages/qrcode-js/src/index.ts',
        // Measured by Bun, not v8. The qrcode-bun suite runs under the real Bun
        // runtime (see scripts/test.js, `bunNative: true`) and Bun does not
        // report to the v8 provider. v8 still emitted a 693-line record with
        // every counter at 0 and the function name "(empty-report)", which
        // dragged the project total down ~5 points while hiding that the code
        // is in fact well covered: `bun test --coverage` reports 98.31% funcs /
        // 100% lines for this same file.
        //
        // Run `pnpm test:coverage:bun` for the real number; CI uploads both
        // reports to Codecov as separate files.
        'packages/qrcode-bun/src/index.ts',
      ],
      reporter: ['text', 'lcov'],
    },
  },
});
