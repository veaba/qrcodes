#!/usr/bin/env node

/**
 * JavaScript QRCode 包 SVG 性能基准测试
 *
 * 对比:
 * - @veaba/qrcode-node
 * - @veaba/qrcode-bun
 *
 * 使用方法:
 *   node bench/svg-benchmark/node-bun.js           # 运行所有 JS 测试
 *   node bench/svg-benchmark/node-bun.js --node    # 仅运行 Node.js 测试
 *   node bench/svg-benchmark/node-bun.js --bun     # 仅运行 Bun 测试
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const outputDir = path.join(rootDir, 'docs/public/bench/benchmark-output');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(70), 'bright');
  log(`  ${title}`, 'cyan');
  log('='.repeat(70), 'bright');
}

// 确保输出目录存在
function ensureOutputDir() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

// 检查命令是否存在
function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// 构建 Node 包
function buildNodePackage() {
  log('\n🔨 构建 @veaba/qrcode-node...', 'blue');
  const nodeDir = path.join(rootDir, 'packages/qrcode-node');

  try {
    execSync('npm run build', { cwd: nodeDir, stdio: 'inherit' });
    log('✅ Node 包构建成功', 'green');
    return true;
  } catch (error) {
    log('❌ Node 包构建失败', 'red');
    return false;
  }
}

// 测试用例
const testCases = [
  { name: 'Simple', text: 'Hello World' },
  { name: 'Complex', text: 'Test QR Code 123' },
  { name: 'URL', text: 'https://github.com/veaba/qrcodes' },
];

const RUNS = 100;

// 运行 Node 基准测试 - 使用直接导入方式
async function benchmarkNode() {
  logSection('@veaba/qrcode-node 性能测试');

  ensureOutputDir();

  // 创建测试脚本文件
  const testScriptPath = path.join(outputDir, '_bench_node_test.mjs');

  const testScript = `
import { QRCode } from '@veaba/qrcode-node';
import fs from 'fs';
import { performance } from 'perf_hooks';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = process.argv[2];
const testName = process.argv[3];
const text = process.argv[4];
const runs = parseInt(process.argv[5]);

const times = [];

// 预热
for (let i = 0; i < 5; i++) {
  const qr = new QRCode(text);
  qr.toSVG(256);
}

// 测试
for (let i = 0; i < runs; i++) {
  const start = performance.now();
  const qr = new QRCode(text);
  const svg = qr.toSVG(256);
  const end = performance.now();
  times.push(end - start);
}

const avg = times.reduce((a, b) => a + b, 0) / times.length;
const min = Math.min(...times);
const max = Math.max(...times);

console.log('AVG:' + avg.toFixed(3));
console.log('MIN:' + min.toFixed(3));
console.log('MAX:' + max.toFixed(3));

// 保存 SVG
const qr = new QRCode(text);
fs.writeFileSync(path.join(outputDir, testName + '_node.svg'), qr.toSVG(256));
console.log('MODULE_COUNT:' + qr.moduleCount);
`;

  fs.writeFileSync(testScriptPath, testScript);

  const results = [];

  for (const testCase of testCases) {
    log(`\n📋 测试用例: ${testCase.name}`, 'magenta');
    log(`   文本: "${testCase.text}"`);

    try {
      // 使用 --input-type=module 运行内联脚本
      const output = execSync(
        `node "${testScriptPath}" "${outputDir}" "${testCase.name}" "${testCase.text}" ${RUNS}`,
        { encoding: 'utf-8', stdio: 'pipe', env: { ...process.env, NODE_PATH: path.join(rootDir, 'node_modules') } }
      );

      const avg = parseFloat(output.match(/AVG:([\d.]+)/)?.[1] || '0');
      const min = parseFloat(output.match(/MIN:([\d.]+)/)?.[1] || '0');
      const max = parseFloat(output.match(/MAX:([\d.]+)/)?.[1] || '0');
      const moduleCount = output.match(/MODULE_COUNT:(\d+)/)?.[1] || '0';

      log(`  ⏱️  平均时间: ${avg.toFixed(3)} ms`, 'cyan');
      log(`  ⏱️  最短时间: ${min.toFixed(3)} ms`, 'cyan');
      log(`  ⏱️  最长时间: ${max.toFixed(3)} ms`, 'cyan');
      log(`  📐 模块数: ${moduleCount}x${moduleCount}`, 'cyan');

      results.push({
        testCase: testCase.name,
        avg,
        min,
        max,
        moduleCount: parseInt(moduleCount),
      });
    } catch (error) {
      log(`  ❌ 错误: ${error.message}`, 'red');
      if (error.stderr) {
        console.error(error.stderr.toString());
      }
    }
  }

  // 清理
  try {
    fs.unlinkSync(testScriptPath);
  } catch { }

  return results;
}

// 运行 Bun 基准测试
async function benchmarkBun() {
  if (!checkCommand('bun')) {
    log('\n⚠️  Bun 未安装，跳过 Bun 测试', 'yellow');
    return [];
  }

  logSection('@veaba/qrcode-bun 性能测试');

  ensureOutputDir();

  // 创建测试脚本文件
  const testScriptPath = path.join(outputDir, '_bench_bun_test.ts');

  const testScript = `
import { QRCode } from '@veaba/qrcode-bun';
import fs from 'fs';
import path from 'path';

const outputDir = process.argv[2];
const testName = process.argv[3];
const text = process.argv[4];
const runs = parseInt(process.argv[5]);

const times = [];

// 预热
for (let i = 0; i < 5; i++) {
  const qr = new QRCode(text);
  qr.toSVG(256);
}

// 测试
for (let i = 0; i < runs; i++) {
  const start = performance.now();
  const qr = new QRCode(text);
  const svg = qr.toSVG(256);
  const end = performance.now();
  times.push(end - start);
}

const avg = times.reduce((a, b) => a + b, 0) / times.length;
const min = Math.min(...times);
const max = Math.max(...times);

console.log('AVG:' + avg.toFixed(3));
console.log('MIN:' + min.toFixed(3));
console.log('MAX:' + max.toFixed(3));

// 保存 SVG
const qr = new QRCode(text);
fs.writeFileSync(path.join(outputDir, testName + '_bun.svg'), qr.toSVG(256));
console.log('MODULE_COUNT:' + qr.moduleCount);
`;

  fs.writeFileSync(testScriptPath, testScript);

  const results = [];

  for (const testCase of testCases) {
    log(`\n📋 测试用例: ${testCase.name}`, 'magenta');
    log(`   文本: "${testCase.text}"`);

    try {
      const output = execSync(
        `bun run "${testScriptPath}" "${outputDir}" "${testCase.name}" "${testCase.text}" ${RUNS}`,
        { encoding: 'utf-8', stdio: 'pipe', cwd: rootDir }
      );

      const avg = parseFloat(output.match(/AVG:([\d.]+)/)?.[1] || '0');
      const min = parseFloat(output.match(/MIN:([\d.]+)/)?.[1] || '0');
      const max = parseFloat(output.match(/MAX:([\d.]+)/)?.[1] || '0');
      const moduleCount = output.match(/MODULE_COUNT:(\d+)/)?.[1] || '0';

      log(`  ⏱️  平均时间: ${avg.toFixed(3)} ms`, 'cyan');
      log(`  ⏱️  最短时间: ${min.toFixed(3)} ms`, 'cyan');
      log(`  ⏱️  最长时间: ${max.toFixed(3)} ms`, 'cyan');
      log(`  📐 模块数: ${moduleCount}x${moduleCount}`, 'cyan');

      results.push({
        testCase: testCase.name,
        avg,
        min,
        max,
        moduleCount: parseInt(moduleCount),
      });
    } catch (error) {
      log(`  ❌ 错误: ${error.message}`, 'red');
      if (error.stderr) {
        console.error(error.stderr.toString());
      }
    }
  }

  // 清理
  try {
    fs.unlinkSync(testScriptPath);
  } catch { }

  return results;
}

// 显示结果
function showResults(nodeResults, bunResults) {
  logSection('性能测试总结');

  log('\n📈 性能对比 (平均时间):', 'bright');

  if (nodeResults.length > 0 && bunResults.length > 0) {
    log('┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐');
    log(`│ ${'测试用例'.padEnd(19)} │ ${'Node.js (ms)'.padStart(19)} │ ${'Bun (ms)'.padStart(19)} │ ${'Bun 加速比'.padStart(19)} │`);
    log('├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤');

    for (let i = 0; i < testCases.length; i++) {
      const node = nodeResults[i];
      const bun = bunResults[i];
      if (node && bun) {
        const name = node.testCase.padEnd(19);
        const nodeTime = `${node.avg.toFixed(3)}`.padStart(19);
        const bunTime = `${bun.avg.toFixed(3)}`.padStart(19);
        const speedup = `${(node.avg / bun.avg).toFixed(2)}x`.padStart(19);
        log(`│ ${name} │ ${nodeTime} │ ${bunTime} │ ${speedup} │`);
      }
    }

    log('└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘');
  } else if (nodeResults.length > 0) {
    log('┌─────────────────────┬─────────────────────┐');
    log(`│ ${'测试用例'.padEnd(19)} │ ${'Node.js (ms)'.padStart(19)} │`);
    log('├─────────────────────┼─────────────────────┤');

    for (const r of nodeResults) {
      const name = r.testCase.padEnd(19);
      const time = `${r.avg.toFixed(3)}`.padStart(19);
      log(`│ ${name} │ ${time} │`);
    }

    log('└─────────────────────┴─────────────────────┘');
  } else if (bunResults.length > 0) {
    log('┌─────────────────────┬─────────────────────┐');
    log(`│ ${'测试用例'.padEnd(19)} │ ${'Bun (ms)'.padStart(19)} │`);
    log('├─────────────────────┼─────────────────────┤');

    for (const r of bunResults) {
      const name = r.testCase.padEnd(19);
      const time = `${r.avg.toFixed(3)}`.padStart(19);
      log(`│ ${name} │ ${time} │`);
    }

    log('└─────────────────────┴─────────────────────┘');
  }

  // 输出文件
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.svg') && (f.includes('_node') || f.includes('_bun')));
    if (files.length > 0) {
      log('\n📄 生成的 SVG 文件:', 'cyan');
      files.forEach(f => {
        const stats = fs.statSync(path.join(outputDir, f));
        log(`   - ${f} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    }
  }

  log(`\n📁 输出目录: ${outputDir}`, 'cyan');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const runNode = args.includes('--node') || args.includes('--all') || (!args.includes('--bun'));
  const runBun = args.includes('--bun') || args.includes('--all');
  const skipBuild = args.includes('--skip-build');

  logSection('JavaScript QRCode 性能基准测试');

  let nodeResults = [];
  let bunResults = [];

  // 构建
  if (!skipBuild) {
    if (runNode) {
      buildNodePackage();
    }
  } else {
    log('⏩ 跳过构建 (--skip-build)', 'yellow');
  }

  // 运行测试
  if (runNode) {
    nodeResults = await benchmarkNode();
  }

  if (runBun || args.length === 0) {
    bunResults = await benchmarkBun();
  }

  // 显示结果
  showResults(nodeResults, bunResults);

  log('\n💡 提示:', 'cyan');
  log('  - 使用浏览器打开 SVG 文件查看生成的二维码');
  log('  - 注意: JS 包生成的二维码未经过验证工具验证');
}

main().catch(error => {
  log(`\n❌ 错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
