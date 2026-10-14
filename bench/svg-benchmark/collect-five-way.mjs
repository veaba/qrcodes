#!/usr/bin/env node

/**
 * 五方 SVG 生成性能对比 —— 采集器
 *
 * 依次运行三个 harness，把它们的 JSON 合并为一份数据文件：
 *
 *   bench/rust-tools   five-way-rust-m   → qrcode-fast / qrcode-rust / kennytm
 *   five-way-js.mjs    --target=node     → qrcode-node
 *   five-way-js.mjs    --target=bun      → qrcode-bun
 *
 * 输出: docs/public/benchmark_svg_five_way.json
 *
 * 口径（与两个 harness 内部保持一致）:
 *   - 统一纠错级别 M（veaba 包默认 H、kennytm 默认 M，不对齐则产物规模不同、不可比）
 *   - 计时窗口 = 构造 + 编码 + SVG 渲染（端到端）
 *   - 预热 20 次 + 测量 100 次，报 avg / median / min / p95
 *
 * 用法:
 *   node bench/svg-benchmark/collect-five-way.mjs
 *   node bench/svg-benchmark/collect-five-way.mjs --skip-rust   # 复用已有 Rust 数据，跳过 cargo
 *   node bench/svg-benchmark/collect-five-way.mjs --skip-bun    # 未安装 Bun 时（复用已有数据）
 *   node bench/svg-benchmark/collect-five-way.mjs --skip-node   # 只测 Bun 时
 *
 * 注意: --skip-* 会从已有的数据文件中**复用**对应实现的结果，
 *       而不是把它们从输出里丢掉（否则会把数据文件写残）。
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = path.join(ROOT, 'docs/public/benchmark_svg_five_way.json');
const RUST_MANIFEST = path.join(ROOT, 'bench/rust-tools/Cargo.toml');

const BEGIN = '===FIVEWAY_JSON_BEGIN===';
const END = '===FIVEWAY_JSON_END===';

const skipRust = process.argv.includes('--skip-rust');
const skipNode = process.argv.includes('--skip-node');
const skipBun = process.argv.includes('--skip-bun');

/** 从 harness 输出中截取标记区间内的 JSON */
function extractJson(stdout, label) {
  const b = stdout.indexOf(BEGIN);
  const e = stdout.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    throw new Error(
      `${label}: 输出中未找到 ${BEGIN} / ${END} 标记。若 harness 崩了，请单独运行它以查看错误。`
    );
  }
  const raw = stdout.slice(b + BEGIN.length, e).trim();
  return JSON.parse(raw);
}

function run(label, file, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${file} ${args.join(' ')}`);
  let stdout;
  try {
    stdout = execFileSync(file, args, {
      cwd: opts.cwd ?? ROOT,
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch (err) {
    if (err.stdout) stdout = String(err.stdout);
    else throw new Error(`${label} 执行失败: ${err.message}`);
  }
  return extractJson(stdout, label);
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

/** JS 侧输出的是 ms，Rust 侧是 µs —— 统一换算成 µs */
function toMicros(v, unit) {
  return unit === 'ms' ? v * 1000 : v;
}

/** 把 JS harness 的 payload 归一化成 { impl, avg_us, ... } 列表 */
function normalizeJs(payload, implName) {
  return payload.results.map((r) => ({
    impl: implName,
    runtime: payload.runtime_version,
    case: r.case,
    bytes: r.bytes,
    avg_us: toMicros(r.avg_ms, 'ms'),
    median_us: toMicros(r.median_ms, 'ms'),
    min_us: toMicros(r.min_ms, 'ms'),
    p95_us: toMicros(r.p95_ms, 'ms'),
    module_count: r.module_count,
    svg_bytes: r.svg_bytes,
  }));
}

function main() {
  console.log('五方 SVG 生成性能采集器');
  console.log('='.repeat(60));

  const sources = [];
  const rows = [];

  /** --skip-* 时复用上次已落盘的结果，避免把数据文件写残 */
  function loadExisting() {
    if (!fs.existsSync(OUTPUT)) return null;
    try {
      return JSON.parse(fs.readFileSync(OUTPUT, 'utf-8'));
    } catch {
      return null;
    }
  }
  const previous = loadExisting();
  const reuse = (impls) => {
    if (!previous) {
      throw new Error(
        `--skip 需要已有数据文件可复用，但 ${path.relative(ROOT, OUTPUT)} 不存在或无法解析。请先完整跑一次。`
      );
    }
    const kept = previous.results.filter((r) => impls.includes(r.impl));
    if (kept.length === 0) {
      throw new Error(`--skip 未能在已有数据文件中找到 ${impls.join(' / ')}，请先完整跑一次。`);
    }
    const found = [...new Set(kept.map((r) => r.impl))];
    console.log(`\n♻️  复用已有数据: ${found.join(', ')}`);
    return kept;
  };

  // ---- Rust 三方（同进程）----
  if (skipRust) {
    console.log('\n⏭  跳过 Rust（--skip-rust），复用已有数据');
    rows.push(...reuse(['qrcode-fast', 'qrcode-rust', 'kennytm']));
  } else {
    if (!has('cargo')) {
      throw new Error('未找到 cargo。请安装 Rust 工具链，或加 --skip-rust 复用已有数据。');
    }
    const rust = run(
      'Rust 三方（统一 M 级，同进程）',
      'cargo',
      ['run', '--release', '--bin', 'five-way-rust-m', '--manifest-path', RUST_MANIFEST]
    );
    sources.push({ source: 'five-way-rust-m', ...rust });
    for (const c of rust.results) {
      for (const impl of c.impls) {
        rows.push({
          impl: impl.impl,
          runtime: 'Rust (同进程)',
          case: c.case,
          bytes: c.bytes,
          avg_us: impl.avg_us,
          median_us: impl.median_us,
          min_us: impl.min_us,
          p95_us: impl.p95_us,
          module_count: impl.module_count,
          svg_bytes: impl.svg_bytes,
        });
      }
    }
  }

  // ---- Node ----
  if (skipNode) {
    console.log('\n⏭  跳过 Node（--skip-node），复用已有数据');
    rows.push(...reuse(['qrcode-node']));
  } else {
    const node = run('Node.js', process.execPath, [
      path.join(__dirname, 'five-way-js.mjs'),
      '--target=node',
      '--ec=M',
    ]);
    sources.push({ source: 'five-way-js', ...node });
    rows.push(...normalizeJs(node, 'qrcode-node'));
  }

  // ---- Bun ----
  if (skipBun) {
    console.log('\n⏭  跳过 Bun（--skip-bun）');
  } else if (!has('bun')) {
    console.log('\n⚠️  未找到 bun，跳过。Bun 数据将缺失（图表会自动隐藏该列）。');
  } else {
    const bun = run('Bun', 'bun', [
      path.join(__dirname, 'five-way-js.mjs'),
      '--target=bun',
      '--ec=M',
    ]);
    sources.push({ source: 'five-way-js', ...bun });
    rows.push(...normalizeJs(bun, 'qrcode-bun'));
  }

  // ---- 一致性检查：三方模块数必须相同，否则说明纠错级别没对齐 ----
  const byCase = new Map();
  for (const r of rows) {
    if (!byCase.has(r.case)) byCase.set(r.case, new Map());
    byCase.get(r.case).set(r.impl, r.module_count);
  }
  const warnings = [];
  for (const [caseName, m] of byCase) {
    const uniq = new Set(m.values());
    if (uniq.size > 1) {
      warnings.push(
        `用例 "${caseName}" 的模块数不一致: ${[...m.entries()]
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')} —— 纠错级别可能未对齐，跨实现比较无效`
      );
    }
  }

  const payload = {
    _status: 'secondary-source',
    _note:
      '五方 SVG 生成性能实测（fast / rust / kennytm / node / bun），统一纠错级别 M。' +
      'Rust 三方在同一进程内依次测量；node 与 bun 各自独立进程。' +
      '跨语言（JS vs Rust）的倍数不予提供——不同进程、不同 GC/JIT、不同计时原语（performance.now() vs Instant::now()），相除没有意义。' +
      '另注意 qrcode-node 与 qrcode-bun 是两套不同实现，二者差异主要反映实现而非运行时。' +
      '权威口径仍为 benchmark_speedup_verified.json。',
    generated_at: new Date().toISOString(),
    generator: 'bench/svg-benchmark/collect-five-way.mjs',
    methodology: {
      ec_level: 'M',
      warmup: 20,
      runs: 100,
      metric: 'avg_us',
      unit: 'µs（越低越好）',
      timer_js: 'performance.now()',
      timer_rust: 'Instant::now()',
      rust_shared_process: true,
      js_separate_process: true,
    },
    cases: [...byCase.keys()],
    results: rows,
    warnings,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n');

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 已写入 ${path.relative(ROOT, OUTPUT)}`);
  console.log(`   实现: ${[...new Set(rows.map((r) => r.impl))].join(', ')}`);
  console.log(`   用例: ${[...byCase.keys()].join(', ')}`);
  if (warnings.length) {
    console.log('\n⚠️  一致性警告:');
    warnings.forEach((w) => console.log('   - ' + w));
    process.exitCode = 1;
  } else {
    console.log('   ✅ 各用例模块数一致（纠错级别已对齐）');
  }
}

main();
