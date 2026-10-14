# Testing Guide

This document describes how to run tests for the `@veaba/qrcode` monorepo.

## Prerequisites

Install dependencies:

```bash
pnpm install
```

## Test Commands

### Run All Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm test:coverage
```

Measures `packages/*/src` and writes `coverage/lcov.info`.

`qrcode-bun` is **excluded** from this report and measured separately, because
it runs under the real Bun runtime and Bun does not report to the v8 provider:

```bash
pnpm test:coverage:bun
```

This writes `coverage/bun/lcov.info`. CI runs both and uploads both files to
Codecov (`.github/workflows/ci.yml`).

| Report | Command | Covers |
|--------|---------|--------|
| vitest / v8 | `pnpm test:coverage` | `packages/*/src` except `qrcode-bun` |
| Bun | `pnpm test:coverage:bun` | `packages/qrcode-bun/src` |

### Run Browser Tests

```bash
pnpm test:browser
```

Run browser tests with a visible browser window (cross-platform; no `HEADED=1`
prefix needed):

```bash
pnpm test:browser:ui
```

### Run Unit Tests Only

`pnpm test:unit` is an alias for the full runner and covers every suite —
including `qrcode-bun` under the real Bun runtime when Bun is installed.

```bash
pnpm test:unit
```

## Test Specific Packages

Each selector maps to one suite directory under `tests/`.

| Command | Suite |
|---------|-------|
| `pnpm test:shared` | `tests/qrcode-shared/` |
| `pnpm test:js` | `tests/qrcode-js/` |
| `pnpm test:node` | `tests/qrcode-node/` |
| `pnpm test:wasm` | `tests/qrcode-wasm/` |
| `pnpm test:bun` | `tests/qrcode-bun/` (real Bun runtime) |

```bash
pnpm test:shared
```

## Test Script Options

You can also use the test script directly:

```bash
node scripts/test.js [options]
```

Options:

- `--browser` / `-b` - Run browser tests
- `--headed` - Run browser tests with a visible browser window
- `--coverage` / `-c` - Enable coverage report (measures `packages/*/src`)
- `--watch` / `-w` - Watch mode
- `--list` - List suites and exit without running
- `--shared` - Test qrcode-js-shared only
- `--js` - Test qrcode-js only
- `--node` - Test qrcode-node only
- `--wasm` - Test qrcode-wasm only
- `--bun` - Test qrcode-bun via the Bun runtime
- `--help` / `-h` - Show usage

Removed: `--ts` (and `pnpm test:ts`). It named a runtime rather than the suite
it ran; use `--bun` / `pnpm test:bun` instead. The runner rejects it with a
migration message and exit code 2.

> The runner exits non-zero when a run would execute no suites, rather than
> reporting success for an empty run.

## Browser Mode Tests

For browser-specific tests, use the browser config:

```bash
vitest --config vitest.config.browser.ts
```

## Package-Specific Test Locations

Tests live under `tests/<suite>/` at the repository root — **not** in
`packages/*/src/`.

| Suite | Test Location |
|---------|---------------|
| qrcode-js-shared | `tests/qrcode-shared/` |
| qrcode-node | `tests/qrcode-node/` |
| qrcode-bun | `tests/qrcode-bun/` |
| qrcode-js | `tests/qrcode-js/` |
| qrcode-wasm | `tests/qrcode-wasm/` (`*.browser.test.ts` for browser mode) |

## CI/CD

The tests are designed to run in CI/CD environments:

```yaml
- run: pnpm install
- run: pnpm test:unit
```

## Notes

- WASM packages require `wasm-pack` to be built before testing; the suite is
  skipped with an actionable message when `packages/qrcode-wasm/pkg/` is missing
- Bun tests require the Bun runtime; the suite is skipped when Bun is absent
- Browser tests use Playwright via `@vitest/browser`
- Coverage measures `packages/*/src` and is split across two reporters:
  - the vitest/v8 report **excludes** `packages/qrcode-bun/src/index.ts`. Bun
    does not report to the v8 provider, which previously emitted a 693-line
    record with every counter at 0 (function name `(empty-report)`) and dragged
    the project total down while concealing that the code is well covered.
  - `pnpm test:coverage:bun` produces the real Bun numbers — 98.31% functions /
    100% lines for that same file.
- Pure re-export modules are excluded from coverage. `packages/qrcode-js/src/index.ts`
  is 88 lines of `export { ... } from '@veaba/qrcode-js-shared'` with no
  executable statement of its own, so instrumentation recorded a single
  `DA:1,1` line and reported a meaningless 100%. The implementation is measured
  where it lives, in `packages/qrcode-js-shared/src`.
