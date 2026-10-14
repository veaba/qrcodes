#!/usr/bin/env node

/**
 * QRCode SVG 生成性能基准测试 (综合脚本)
 *
 * 对比所有包：
 * - Rust: kennytm-qrcode, @veaba/qrcode-rust, @veaba/qrcode-fast
 * - JS: @veaba/qrcode-node, @veaba/qrcode-bun
 *
 * 使用方法:
 *   pnpm bench:svg              # 运行所有测试
 *   pnpm bench:svg:rust         # 仅运行 Rust 测试
 *   pnpm bench:svg:js           # 仅运行 JS 测试
 *   pnpm bench:svg:quick        # 快速模式 (10次运行)
 *   pnpm bench:svg:full         # 完整模式 (100次运行)
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const scriptDir = __dirname;

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

// 主函数
async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  const runRust = args.includes('--rust') || args.includes('rust');
  const runJs = args.includes('--js') || args.includes('js');
  const quickMode = args.includes('--quick') || args.includes('quick');
  const fullMode = args.includes('--full') || args.includes('full');
  const skipBuild = args.includes('--skip-build');

  // 如果没有指定具体包，默认只运行 Rust（JS 测试有平台兼容性问题）
  const runAll = !runRust && !runJs;
  const effectiveRunRust = runAll || runRust;
  const effectiveRunJs = runJs;

  logSection('QRCode SVG 生成性能基准测试');

  log('\n📦 测试包:', 'cyan');
  if (effectiveRunRust) {
    log('  Rust:');
    log('    - kennytm-qrcode (社区参考)');
    log('    - @veaba/qrcode-rust');
    log('    - @veaba/qrcode-fast');
  }
  if (effectiveRunJs) {
    log('  JavaScript:');
    log('    - @veaba/qrcode-node');
    log('    - @veaba/qrcode-bun');
    log('  ⚠️  注意: JS 测试在 Windows 上可能有兼容性问题');
  }

  log('\n⚙️  模式:', 'cyan');
  if (fullMode) {
    log('  - 完整模式 (100次运行)');
  } else if (quickMode) {
    log('  - 快速模式 (10次运行)');
  } else {
    log('  - 默认模式 (Rust: 100次, JS: 100次)');
  }

  // 运行 Rust 测试
  if (effectiveRunRust) {
    logSection('Rust 包性能测试');

    const rustArgs = [];
    if (quickMode) rustArgs.push('--quick');
    if (skipBuild) rustArgs.push('--skip-build');

    try {
      execSync(`node "${path.join(scriptDir, 'rust.js')}" ${rustArgs.join(' ')}`, {
        stdio: 'inherit',
        cwd: rootDir
      });
    } catch (error) {
      log('❌ Rust 测试失败', 'red');
    }
  }

  // 运行 JS 测试
  if (effectiveRunJs) {
    logSection('JavaScript 包性能测试');

    const jsArgs = ['--all'];
    if (skipBuild) jsArgs.push('--skip-build');

    try {
      execSync(`node "${path.join(scriptDir, 'js.js')}" ${jsArgs.join(' ')}`, {
        stdio: 'inherit',
        cwd: rootDir
      });
    } catch (error) {
      log('❌ JS 测试失败', 'red');
    }
  }

  // 显示总结
  logSection('测试完成');

  log('\n📁 输出目录:', 'cyan');
  log('  - SVG 文件: docs/public/bench/benchmark-output/');
  log('  - JSON 报告: docs/public/benchmark_svg_rust.json');

  log('\n💡 提示:', 'cyan');
  log('  - 使用浏览器打开 SVG 文件查看生成的二维码');
  log('  - 使用手机扫描验证二维码可扫描性');
  log('  - Rust 测试包含验证 (resvg + rqrr)');
  log('  - JS 测试不包含验证');
}

main().catch(error => {
  log(`\n❌ 错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
