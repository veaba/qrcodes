#!/usr/bin/env node

/**
 * Normalize `coverage/lcov.info` paths for Codecov.
 *
 * Why this exists
 * ---------------
 * The lcov writer in `istanbul-reports` (lib/lcovonly/index.js:33) builds the
 * `SF:` record with `path.relative(projectRoot, filePath)`, which yields
 * BACKSLASH separators on Windows:
 *
 *   SF:packages\qrcode-js\src\index.ts
 *
 * Codecov matches coverage entries against repository paths, which always use
 * `/`. Backslash paths do not match, so a locally generated report uploaded
 * from Windows contributes nothing (silently, as a 0% or unknown file).
 *
 * This is upstream behavior and is not configurable through vitest, so the
 * generated file is normalized after the fact — the same pattern the repo
 * already uses for other generated output.
 *
 * Only `SF:` lines are rewritten. Every other lcov field (FN/FNDA/DA/BRDA) is
 * either numeric or a function name, so no separator substitution can touch
 * them — the rewrite is deliberately narrower than a whole-file replace.
 *
 * Usage:
 *   node scripts/fix-coverage-paths.js [--check] [--file <path>]
 *
 *   --check        : report what would change and exit non-zero if any file
 *                    needs rewriting; do not modify anything.
 *   --file <path>  : operate on a specific lcov file (default: the vitest
 *                    report at coverage/lcov.info). Used for the Bun report,
 *                    which lands in coverage/bun/lcov.info.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const fileFlag = argv.indexOf('--file');
const LCOV_PATH =
  fileFlag !== -1 && argv[fileFlag + 1]
    ? resolve(rootDir, argv[fileFlag + 1])
    : resolve(rootDir, 'coverage', 'lcov.info');

/** Path shown in messages, relative to the repo root. */
const displayPath = LCOV_PATH.startsWith(rootDir)
  ? LCOV_PATH.slice(rootDir.length + 1).split('\\').join('/')
  : LCOV_PATH;

function main() {
  if (!existsSync(LCOV_PATH)) {
    console.error(`✗ lcov file not found: ${displayPath}`);
    console.error('  Run `pnpm test:coverage` (or :bun) first.');
    process.exit(1);
  }

  const original = readFileSync(LCOV_PATH, 'utf8');
  const lines = original.split('\n');

  let rewritten = 0;
  const out = lines.map((line) => {
    if (!line.startsWith('SF:')) return line;
    // `includes` avoids the stateful-lastIndex pitfall of a global regex.
    if (!line.includes('\\')) return line;
    rewritten++;
    return line.split('\\').join('/');
  });

  if (rewritten === 0) {
    console.log('✓ lcov paths already use "/" — nothing to do');
    return;
  }

  if (checkOnly) {
    console.error(`✗ ${rewritten} SF: record(s) use "\\" separators`);
    for (const line of out.filter((l) => l.startsWith('SF:'))) {
      console.error(`    ${line}`);
    }
    console.error('  Run `node scripts/fix-coverage-paths.js` to normalize.');
    process.exit(1);
  }

  writeFileSync(LCOV_PATH, out.join('\n'), 'utf8');
  console.log(`✓ normalized ${rewritten} SF: path(s) to "/" in ${displayPath}`);
}

main();
