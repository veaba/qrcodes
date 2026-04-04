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
      include: ['tests/**/*.ts', 'tests/**/*.js'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.{ts,js}'],
    },
  },
});
