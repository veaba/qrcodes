#!/usr/bin/env node

/**
 * 五方 SVG 落盘 + 独立解码校验（一条命令跑完）
 *
 * 依次执行：
 *   1. Rust 三方（fast / rust / kennytm）—— five-way-rust-h（H 级，权威口径）
 *   2. Node.js                          —— five-way-js.mjs --target=node
 *   3. Bun                              —— five-way-js.mjs --target=bun
 *   4. 独立解码校验                      —— validate-svg-dir（resvg 渲染 + rqrr 解码）
 *
 * 产物: docs/public/bench/svg/<前缀>_<用例>_<序号>.svg
 *   前缀: fast | rust | kennytm | node | bun
 *   该目录已在 .gitignore 中，属本地人工验证产物，不入库。
 *
 * 用法:
 *   node bench/svg-benchmark/gen-and-validate-svg.mjs
 *   node bench/svg-benchmark/gen-and-validate-svg.mjs --all     # 每实现每用例落 100 次
 *   node bench/svg-benchmark/gen-and-validate-svg.mjs --keep    # 保留旧文件，不先清空
 *   node bench/svg-benchmark/gen-and-validate-svg.mjs --skip-bun
 *   node bench/svg-benchmark/gen-and-validate-svg.mjs --no-validate   # 只生成不校验
 *
 * 退出码: 0 = 生成且校验全部通过；1 = 任一步失败。
 */

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SVG_DIR = path.join(ROOT, 'docs/public/bench/svg');
const RUST_MANIFEST = path.join(ROOT, 'bench/rust-tools/Cargo.toml');
const JS_HARNESS = path.join(ROOT, 'bench/svg-benchmark/five-way-js.mjs');
const NODE_ENTRY = path.join(ROOT, 'packages/qrcode-node/dist/index.js');

const saveAll = process.argv.includes('--all');
const keep = process.argv.includes('--keep');
const skipBun = process.argv.includes('--skip-bun');
const skipNode = process.argv.includes('--skip-node');
const noValidate = process.argv.includes('--no-validate');

function log(msg) {
  console.log(msg);
}

function section(title) {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(64));
}

/** 命令是否可用 */
function has(cmd) {
  try {
    execFileSync(cmd, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** 运行命令，继承 stdout/stderr，返回是否成功 */
function run(label, file, args, opts = {}) {
  log(`\n▶ ${label}`);
  log(`  $ ${file} ${args.join(' ')}`);
  // Windows 上 cargo/bun 是 .exe 或 .cmd，需要 shell 才能解析；
  // 用 shell 时不再额外传 args，改为拼接后的完整命令行，避免 DEP0190。
  const useShell = process.platform === 'win32' && !path.isAbsolute(file);
  const r = useShell
    ? spawnSync(`"${file}" ${args.map((a) => `"${a}"`).join(' ')}`, {
        cwd: opts.cwd ?? ROOT,
        stdio: 'inherit',
        shell: true,
      })
    : spawnSync(file, args, {
        cwd: opts.cwd ?? ROOT,
        stdio: 'inherit',
      });
  if (r.error) {
    log(`  ❌ 无法执行: ${r.error.message}`);
    return false;
  }
  if (r.status !== 0) {
    log(`  ❌ 退出码 ${r.status}`);
    return false;
  }
  return true;
}

/** 统计目录内 SVG */
function countSvg() {
  if (!fs.existsSync(SVG_DIR)) return 0;
  return fs.readdirSync(SVG_DIR).filter((f) => f.endsWith('.svg')).length;
}

function main() {
  const t0 = Date.now();
  section('五方 SVG 落盘 + 独立解码校验');
  log(`输出目录: ${path.relative(ROOT, SVG_DIR)}`);
  log(`模式: ${saveAll ? '每实现每用例 100 次' : '每实现每用例 5 次（默认）'}`);

  // ---- 前置检查 ----
  if (!has('cargo')) {
    console.error('\n❌ 未找到 cargo，无法构建/运行 Rust 侧工具。');
    process.exit(1);
  }

  // node 侧按路径导入 dist，未构建会解析失败 —— 提前给出清晰提示
  if (!skipNode && !fs.existsSync(NODE_ENTRY)) {
    console.error(
      `\n❌ 未找到 ${path.relative(ROOT, NODE_ENTRY)}。\n` +
        '   请先构建：pnpm --filter @veaba/qrcode-js-shared build && pnpm --filter @veaba/qrcode-node build'
    );
    process.exit(1);
  }
  if (!skipBun && !has('bun')) {
    console.error('\n❌ 未找到 bun。请安装 Bun，或加 --skip-bun 只测其余四方。');
    process.exit(1);
  }

  // ---- 清理旧产物 ----
  if (fs.existsSync(SVG_DIR) && !keep) {
    const n = countSvg();
    for (const f of fs.readdirSync(SVG_DIR)) {
      if (f.endsWith('.svg')) fs.rmSync(path.join(SVG_DIR, f));
    }
    log(`\n🧹 已清空 ${n} 个旧 SVG（--keep 可保留）`);
  }
  fs.mkdirSync(SVG_DIR, { recursive: true });

  const saveFlagArgs = saveAll ? ['--save-all'] : [];

  // ---- 1. Rust 三方 ----
  section('1/4  Rust 三方（fast / rust / kennytm，H 级）');
  const rustArgs = [
    'run',
    '--release',
    '--bin',
    'five-way-rust-h',
    '--manifest-path',
    RUST_MANIFEST,
  ];
  if (saveAll) rustArgs.push('--', '--save-all');
  if (!run('Rust 三方', 'cargo', rustArgs)) {
    console.error('\n❌ Rust 侧生成失败。');
    process.exit(1);
  }

  // ---- 2. Node ----
  if (skipNode) {
    section('2/4  Node.js（已跳过）');
  } else {
    section('2/4  Node.js');
    if (!run('Node', process.execPath, [JS_HARNESS, '--target=node', '--ec=H', '--save-svg', ...saveFlagArgs])) {
      console.error('\n❌ Node 侧生成失败。');
      process.exit(1);
    }
  }

  // ---- 3. Bun ----
  if (skipBun) {
    section('3/4  Bun（已跳过）');
  } else {
    section('3/4  Bun');
    if (!run('Bun', 'bun', [JS_HARNESS, '--target=bun', '--ec=H', '--save-svg', ...saveFlagArgs])) {
      console.error('\n❌ Bun 侧生成失败。');
      process.exit(1);
    }
  }

  const total = countSvg();
  log(`\n📦 已生成 ${total} 个 SVG → ${path.relative(ROOT, SVG_DIR)}`);

  // ---- 4. 独立解码校验 ----
  section('4/4  独立解码校验（resvg + rqrr）');
  if (noValidate) {
    log('⏭  已跳过校验（--no-validate）');
    log(`\n✅ 生成完成，共 ${total} 个 SVG。`);
    log('   单独校验：pnpm run bench:svg:validate');
    return;
  }

  const ok = run('validate-svg-dir', 'cargo', [
    'run',
    '--release',
    '--features',
    'validation',
    '--bin',
    'validate-svg-dir',
    '--manifest-path',
    RUST_MANIFEST,
  ]);

  section('结果');
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (ok) {
    log(`✅ ${total} 个 SVG 全部生成并通过独立解码校验（耗时 ${secs}s）`);
    log(`   目录: ${path.relative(ROOT, SVG_DIR)}（已 gitignore，不入库）`);
  } else {
    console.error(`❌ 校验未通过 —— 存在无法解码的 SVG（耗时 ${secs}s）`);
    console.error('   这些 SVG 不是合法二维码，对应的性能数字不代表真实产物。');
    process.exit(1);
  }
}

main();
