#!/usr/bin/env node

/**
 * 五方 SVG 生成性能对比 —— JS 侧测量器（Node.js / Bun）
 *
 * 口径（与 Rust 侧 five-way-rust 保持一致）：
 *   - 计时窗口 = 构造 + 编码 + SVG 渲染（端到端，与库的公开用法一致）
 *   - 每个用例预热 WARMUP 次，正式测量 RUNS 次
 *   - 报平均值 / 中位数 / 最小值 / P95
 *   - 结果以 JSON 写到 stdout 的标记区间内，由 collect 脚本解析
 *
 * 用法:
 *   node  bench/svg-benchmark/five-way-js.mjs --target=node
 *   bun   bench/svg-benchmark/five-way-js.mjs --target=bun
 *   ...   --save-svg --target=node   # 额外把 SVG 落盘供人工验证
 *
 * SVG 落盘（--save-svg）：
 *   docs/public/bench/svg/<前缀>_<用例>_<序号>.svg
 *   前缀: node / bun；序号为第 n 次生成。该目录已 gitignore。
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import * as fs from 'node:fs';
import * as path from 'node:path';

const RUNS = 100;
const WARMUP = 20;
/** 默认落盘的次数 */
const SAVE_RUNS = 5;

// bench/ 不是 pnpm workspace 成员，无法用包名解析，故按路径导入。
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SVG_DIR = path.join(ROOT, 'docs/public/bench/svg');

const CASES = [
  { name: 'short', text: 'hello world' },
  { name: 'url', text: 'https://qrcodes.veaba.me/' },
  {
    name: 'long',
    text: '多引擎 QRCodes，高性能 QRCode 库，支持 WASM、Node.js、Bun 和 Rust 的多运行时 QRCode 解决方案',
  },
];

const target = process.argv.find((a) => a.startsWith('--target='))?.split('=')[1];
// --ec=M 时统一使用纠错级别 M（veaba 包默认 H，kennytm 默认 M，需对齐后才公平）
const EC = process.argv.find((a) => a.startsWith('--ec='))?.split('=')[1];
// QRErrorCorrectLevel: L=1, M=0, Q=3, H=2
const EC_MAP = { L: 1, M: 0, Q: 3, H: 2 };
const ecLevel = EC ? EC_MAP[EC.toUpperCase()] : undefined;

function makeQr(QRCode, text) {
  return ecLevel === undefined ? new QRCode(text) : new QRCode(text, ecLevel);
}

const SAVE_SVG = process.argv.includes('--save-svg');
const SAVE_ALL = process.argv.includes('--save-all');
const PREFIX = target; // node | bun

function saveSvg(caseName, idx, svg) {
  const name = `${PREFIX}_${caseName}_${idx}.svg`;
  try {
    fs.writeFileSync(path.join(SVG_DIR, name), svg);
  } catch (e) {
    console.error(`⚠️  写入 ${name} 失败: ${e.message}`);
  }
}

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function loadQrCode() {
  if (target === 'bun') {
    const entry = path.join(ROOT, 'packages/qrcode-bun/src/index.ts');
    const mod = await import(pathToFileURL(entry).href);
    return mod.QRCode;
  }
  if (target === 'node') {
    const entry = path.join(ROOT, 'packages/qrcode-node/dist/index.js');
    const mod = await import(pathToFileURL(entry).href);
    return mod.QRCode;
  }
  throw new Error(`未知 target: ${target}（应为 node 或 bun）`);
}

async function main() {
  const QRCode = await loadQrCode();
  const results = [];

  if (SAVE_SVG) {
    fs.mkdirSync(SVG_DIR, { recursive: true });
  }

  for (const c of CASES) {
    // 预热，让 JIT 与分配器进入稳态
    for (let i = 0; i < WARMUP; i++) {
      const qr = makeQr(QRCode, c.text);
      qr.toSVG(256);
    }

    const saveLimit = SAVE_ALL ? RUNS : SAVE_RUNS;
    const times = [];
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      const qr = makeQr(QRCode, c.text);
      const svg = qr.toSVG(256);
      const t1 = performance.now();
      // 防止被优化掉
      if (svg.length === 0) throw new Error('empty svg');
      if (SAVE_SVG && i < saveLimit) saveSvg(c.name, i, svg);
      times.push(t1 - t0);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;

    // 顺便记录一次产物信息（模块数、SVG 字节数），便于核对两侧是否同版本
    const probe = makeQr(QRCode, c.text);
    const probeSvg = probe.toSVG(256);

    results.push({
      case: c.name,
      bytes: new TextEncoder().encode(c.text).length,
      runs: RUNS,
      warmup: WARMUP,
      avg_ms: avg,
      median_ms: percentile(sorted, 50),
      min_ms: sorted[0],
      p95_ms: percentile(sorted, 95),
      module_count: probe.moduleCount,
      svg_bytes: new TextEncoder().encode(probeSvg).length,
    });
  }

  const payload = {
    runtime: target,
    runtime_version:
      target === 'bun' ? (globalThis.Bun?.version ?? 'unknown') : process.version,
    ec_level: EC ? EC.toUpperCase() : 'default',
    runs: RUNS,
    warmup: WARMUP,
    metric: 'avg_ms',
    results,
  };

  process.stdout.write('===FIVEWAY_JSON_BEGIN===\n');
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  process.stdout.write('===FIVEWAY_JSON_END===\n');
}

main().catch((e) => {
  console.error('❌ 测量失败:', e.message);
  process.exit(1);
});
