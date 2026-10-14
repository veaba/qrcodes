#!/usr/bin/env node

/**
 * Cross-platform test runner for monorepo
 *
 * Usage:
 *   node scripts/test.js              - Run all tests
 *   node scripts/test.js --browser    - Run browser tests
 *   node scripts/test.js --browser --headed - Browser tests, visible window
 *   node scripts/test.js --coverage   - Run with coverage
 *   node scripts/test.js --watch      - Watch mode
 *   node scripts/test.js --shared     - Test qrcode-js-shared only
 *   node scripts/test.js --js         - Test qrcode-js only
 *   node scripts/test.js --node       - Test qrcode-node only
 *   node scripts/test.js --wasm       - Test qrcode-wasm only
 *   node scripts/test.js --bun        - Test qrcode-bun via the Bun runtime
 *   node scripts/test.js --list       - List test suites without running them
 *
 * Test discovery
 * --------------
 * Tests live in `tests/<suite>/` at the repository root (see AGENTS.md and
 * tests/README.md), NOT in `packages/<pkg>/src/`. A suite directory is
 * considered testable when it exists and contains at least one non-browser
 * `*.test.{ts,js}` file.
 *
 * Both the default and the `--browser` discovery step operate on the same
 * environment gate: when the toolchain a suite needs is unavailable (Bun,
 * Playwright, the WASM build output), the suite is reported as skipped and
 * excluded from the run. It never silently reports success for a suite it did
 * not execute.
 */

import { execFileSync } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log('━'.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('━'.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logSkip(message) {
  log(`○ ${message}`, 'yellow');
}

/**
 * The single source of truth for test suites.
 *
 * - `name`      : directory name under `tests/`
 * - `pkg`       : package directory under `packages/` used for module resolution
 * - `flags`     : CLI flags selecting this suite
 * - `bunNative` : run with `bun test` instead of vitest (Bun resolves
 *                 `vitest` imports natively through its compatibility layer)
 * - `requires`  : environment gate; a missing requirement skips the suite
 */
const SUITES = [
  { name: 'qrcode-shared', pkg: 'qrcode-js-shared', flags: ['--shared'] },
  { name: 'qrcode-js', pkg: 'qrcode-js', flags: ['--js'] },
  { name: 'qrcode-node', pkg: 'qrcode-node', flags: ['--node'] },
  {
    name: 'qrcode-wasm',
    pkg: 'qrcode-wasm',
    flags: ['--wasm'],
    requires: 'wasm-pkg',
  },
  {
    name: 'qrcode-bun',
    pkg: 'qrcode-bun',
    flags: ['--bun'],
    bunNative: true,
    requires: 'bun',
  },
];

const TEST_FILE_RE = /\.test\.(ts|js)$/;
const BROWSER_TEST_FILE_RE = /\.browser\.test\.(ts|js)$/;

function listFiles(dir, { recursive = false } = {}) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) out.push(...listFiles(full, { recursive }));
      continue;
    }
    out.push(full);
  }
  return out;
}

/** Absolute path of a suite's directory under `tests/`. */
function suiteDir(suite) {
  return resolve(rootDir, 'tests', suite.name);
}

/** Non-browser test files belonging to a suite. */
function suiteTestFiles(suite) {
  return listFiles(suiteDir(suite)).filter(
    (f) => TEST_FILE_RE.test(f) && !BROWSER_TEST_FILE_RE.test(f)
  );
}

/** Browser test files belonging to a suite. */
function suiteBrowserTestFiles(suite) {
  return listFiles(suiteDir(suite)).filter((f) => BROWSER_TEST_FILE_RE.test(f));
}

function hasExecutable(cmd) {
  try {
    execFileSync(cmd, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Evaluate a suite's environment gate.
 * Returns `{ ok: true }` or `{ ok: false, reason }`.
 */
function checkRequirement(suite) {
  if (!suite.requires) return { ok: true };

  if (suite.requires === 'bun') {
    return hasExecutable('bun')
      ? { ok: true }
      : { ok: false, reason: 'bun not installed' };
  }

  if (suite.requires === 'wasm-pkg') {
    const pkgDir = resolve(rootDir, 'packages', suite.pkg, 'pkg');
    const wasmJs = join(pkgDir, 'qrcodes.js');
    const wasmBin = join(pkgDir, 'qrcodes_bg.wasm');
    if (!existsSync(wasmJs) || !existsSync(wasmBin)) {
      return {
        ok: false,
        reason: 'WASM build output missing — run: pnpm run build:wasm',
      };
    }
    return { ok: true };
  }

  return { ok: true };
}

/**
 * Resolve every suite against the filesystem + environment.
 *
 * Returns an array of `{ suite, available, reason, files }`. A suite whose
 * directory or requirement is missing is returned with `available: false` so
 * the caller can report it instead of dropping it silently.
 */
function resolveSuites(suites, { browser = false } = {}) {
  return suites.map((suite) => {
    const files = browser ? suiteBrowserTestFiles(suite) : suiteTestFiles(suite);
    if (files.length === 0) {
      return {
        suite,
        available: false,
        reason: browser
          ? 'no *.browser.test.{ts,js} file'
          : 'no *.test.{ts,js} file',
        files,
      };
    }
    const req = checkRequirement(suite);
    if (!req.ok) {
      return { suite, available: false, reason: req.reason, files };
    }
    return { suite, available: true, reason: null, files };
  });
}

// Parse command line arguments
function parseArgs(args) {
  const options = {
    browser: false,
    coverage: false,
    watch: false,
    listOnly: false,
    headed: false,
    selectors: [],
    // True when the user typed suite flags that matched nothing. Such a run
    // must fail loudly rather than silently widening to "all suites".
    unknownSelector: false,
    // True when the invocation itself is invalid (removed flag, bad usage).
    invalidUsage: false,
  };

  for (const arg of args) {
    switch (arg) {
      case '--browser':
      case '-b':
        options.browser = true;
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--list':
        options.listOnly = true;
        break;
      case '--headed':
        // Cross-platform replacement for the POSIX-only `HEADED=1 vitest ...`
        // form, which failed on Windows with
        // "'HEADED' is not recognized as an internal or external command".
        // vitest.config.browser.ts reads process.env.HEADED.
        options.headed = true;
        break;
      case '--all':
        // Run all suites (default)
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--ts':
        // Deprecated alias — `--ts` named a runtime, not the suite it ran.
        // Kept as a hard error with migration guidance rather than a silent
        // alias, so stale invocations are noticed instead of lingering.
        logError('--ts has been removed. Use --bun (suite: qrcode-bun).');
        options.invalidUsage = true;
        break;
      default:
        if (arg.startsWith('--')) {
          const matched = SUITES.filter((s) => s.flags.includes(arg));
          if (matched.length === 0) {
            logWarning(`Unknown option: ${arg}`);
            options.unknownSelector = true;
          } else {
            for (const s of matched) {
              if (!options.selectors.includes(s.name)) options.selectors.push(s.name);
            }
          }
        }
    }
  }

  return options;
}

/**
 * Select the suites this invocation should run.
 *
 * With explicit selectors, a suite named on the command line is always
 * reported (available or not) — never dropped without a message. Without
 * selectors, every discoverable suite is included.
 *
 * If the user typed only unrecognised suite flags, the selection is empty on
 * purpose: `main` treats that as an error. Widening to "all suites" there
 * would make a typo look like a passing full run.
 */
function selectSuites(options) {
  if (options.selectors.length === 0) {
    return options.unknownSelector ? [] : SUITES;
  }
  return SUITES.filter((s) => options.selectors.includes(s.name));
}

function printHelp() {
  log('Usage: node scripts/test.js [options]', 'bright');
  console.log();
  log('Options:', 'bright');
  console.log('  --browser, -b    Run browser tests (vitest.config.browser.ts)');
  console.log('  --coverage, -c   Collect coverage');
  console.log('  --watch, -w      Watch mode');
  console.log('  --headed         Run browser tests with a visible browser');
  console.log('  --list           List suites and exit without running');
  console.log('  --all            Run every suite (default)');
  console.log();
  log('Suite selectors:', 'bright');
  for (const s of SUITES) {
    console.log(`  ${s.flags.join(', ').padEnd(16)} ${s.name}`);
  }
  console.log();
  log('Unknown --flags are reported as warnings, never applied as filters.', 'cyan');
  log('A run that would execute no suites exits non-zero.', 'cyan');
}

/** Build the vitest invocation for a set of resolved suites. */
function buildVitestArgs({ browser, coverage, watch, dirs }) {
  const args = [];

  // Always use the local vitest binary — never the network.
  args.push('exec', 'vitest');

  if (!watch) args.push('run');
  args.push('--config', browser ? 'vitest.config.browser.ts' : 'vitest.config.ts');

  // Positional filters must be relative paths — vitest matches them against
  // the include globs, and absolute paths never match.
  //
  // Pass the suite DIRECTORY, not a `*.browser.test.{ts,js}` pattern: with
  // `shell: false` nothing expands the braces, and vitest receives the
  // literal string as a filter that matches no file ("No test files found").
  // The config's own `include` already narrows to browser tests.
  for (const dir of dirs) {
    args.push(`tests/${dir}/`);
  }

  if (coverage) args.push('--coverage');

  return args;
}

/** Run one command, returning true on success. */
function run(label, cmd, args, extraEnv = {}) {
  const startTime = Date.now();
  log(`Running: ${cmd} ${args.join(' ')}`, 'blue');
  try {
    execFileSync(cmd, args, {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
      shell: false,
    });
    logSuccess(`${label} passed (${Date.now() - startTime}ms)`);
    return true;
  } catch {
    logError(`${label} failed (${Date.now() - startTime}ms)`);
    return false;
  }
}

// Main test runner
async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.invalidUsage) {
    logError('Invalid usage — aborting without running tests.');
    process.exit(2);
  }

  logSection('QRCode Monorepo Test Runner');
  log(`Mode: ${options.browser ? 'Browser' : 'Node.js'}`, 'blue');
  log(`Coverage: ${options.coverage ? 'Enabled' : 'Disabled'}`, 'blue');
  log(`Watch: ${options.watch ? 'Enabled' : 'Disabled'}`, 'blue');

  const selected = selectSuites(options);
  const resolved = resolveSuites(selected, { browser: options.browser });

  const runnable = resolved.filter((r) => r.available);
  const skipped = resolved.filter((r) => !r.available);

  // Report the plan — this is the line that used to print an empty list.
  const runnableNames = runnable.map((r) => r.suite.name);
  log(
    `Suites: ${runnableNames.length > 0 ? runnableNames.join(', ') : '(none)'}`,
    'blue'
  );
  log(`Test files: ${runnable.reduce((n, r) => n + r.files.length, 0)}`, 'blue');

  for (const s of skipped) {
    logSkip(`Skipping ${s.suite.name}: ${s.reason}`);
  }

  if (options.listOnly) {
    logSection('Suite List');
    for (const r of resolved) {
      const state = r.available ? 'ready' : `skipped (${r.reason})`;
      log(`  ${r.suite.name.padEnd(16)} ${r.files.length} file(s)  ${state}`);
    }
    process.exit(skipped.length > 0 && runnable.length === 0 ? 1 : 0);
  }

  // Refuse to run when nothing is executable. Reporting "all passed" for an
  // empty run is exactly the failure mode this runner must not repeat.
  if (runnable.length === 0) {
    const detail =
      skipped.length > 0
        ? skipped.map((s) => `  - ${s.suite.name}: ${s.reason}`).join('\n')
        : '  (no suites matched the given selectors)';
    logSection('Test Summary');
    logError('No runnable test suites.');
    console.log(detail);
    process.exit(1);
  }

  logSection('Running tests');

  let allPassed = true;

  // Vitest suites (Node.js environment) — run as a single invocation.
  const vitestSuites = runnable.filter((r) => !r.suite.bunNative);
  if (vitestSuites.length > 0) {
    const args = buildVitestArgs({
      browser: options.browser,
      coverage: options.coverage,
      watch: options.watch,
      dirs: vitestSuites.map((r) => r.suite.name),
    });
    const label = options.browser ? 'Browser tests' : 'Node.js tests';
    allPassed = run(label, 'pnpm', args, options.headed ? { HEADED: '1' } : {}) && allPassed;
  }

  // Bun-native suites — one invocation per suite, files passed explicitly so
  // the run is scoped to that suite.
  for (const r of runnable.filter((x) => x.suite.bunNative)) {
    const bunArgs = ['test', ...r.files];
    if (options.coverage) bunArgs.push('--coverage');
    allPassed = run(`${r.suite.name} (bun)`, 'bun', bunArgs) && allPassed;
  }

  // Print summary
  logSection('Test Summary');
  if (allPassed) {
    logSuccess(`All tests passed! (${runnable.length} suite(s) executed)`);
    if (skipped.length > 0) {
      logWarning(`${skipped.length} suite(s) skipped — see above`);
    }
    process.exit(0);
  } else {
    logError('Some tests failed!');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run
main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
