# @veaba/qrcode-wasm

## 0.1.2

### Patch Changes

- fix(qrcode-js): getTypeNumber + setupTypeNumber

## 0.1.1

### Patch Changes

- fix: as same as qrcode-js-shared

## 0.1.0

### Minor Changes

- release: v0.1.0

## 0.0.8

### Patch Changes

- fix(wasm-pack): pass a single object instead

## 0.0.7

### Patch Changes

- Auto-detect Vite environment for seamless integration

  The package now automatically detects Vite environment and loads WASM accordingly:

  - **Vite**: Uses `?url` import for proper asset handling
  - **Webpack/Parcel/Node**: Uses default WASM loading

  Users no longer need special configuration or subpath imports:

  ```typescript
  import initWasm, {
    QRCodeCore,
    QRErrorCorrectLevel,
  } from "@veaba/qrcode-wasm";

  await initWasm(); // Auto-detects environment
  const qr = new QRCodeCore("https://example.com", QRErrorCorrectLevel.H);
  ```

  Works out of the box in all major bundlers.

- Add Vite support via subpath export

  Users can now import from `@veaba/qrcode-wasm/vite` for seamless Vite integration:

  ```typescript
  import initWasm, {
    QRCodeCore,
    QRErrorCorrectLevel,
  } from "@veaba/qrcode-wasm/vite";

  await initWasm();
  const qr = new QRCodeCore("https://example.com", QRErrorCorrectLevel.H);
  const svg = qr.toSVG(256);
  ```

  No additional Vite configuration or plugins required.

  The standard import (`@veaba/qrcode-wasm`) continues to work for non-Vite environments.

## 0.0.6

### Patch Changes

- release: v0.0.6

## 0.0.5

### Patch Changes

- release v0.0.5

## 0.0.4

### Patch Changes

- ebc2e52: release v0.0.3

## 0.0.3

### Patch Changes

- Fix npm publish issues

  - Remove provenance config (not supported in local publish)
  - Fix wasm package name to @veaba/qrcode-wasm
  - Add build script to qrcode-bun
  - Bump version to 0.0.2 for already published packages

## 0.0.1

### Patch Changes

- 1a17ee8: Initialize npm packages to alpha version 0.0.1-alpha
