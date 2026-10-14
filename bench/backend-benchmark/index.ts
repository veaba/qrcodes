/**
 * 后端 QRCode 包 PK 基准测试
 * 对比 @veaba/qrcode-node、@veaba/qrcode-bun、@veaba/qrcode-fast、@veaba/qrcode-rust
 * 以及外部包 bench/kennytm-qrcode
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 测试配置
const CONFIG = {
  warmupRuns: 10,
  benchmarkRuns: 1000,
  batchSizes: [10, 100, 1000],
  outputDir: path.join(__dirname, '../../docs/public'),
};

// 测试数据
const TEST_TEXTS = {
  short: 'https://a.co',
  medium: 'https://github.com/veaba/qrcodes',
  long: 'https://example.com/very/long/path/with/many/segments?param1=value1&param2=value2&param3=value3',
  unicode: 'https://例子.com/测试路径?参数=值',
};

// 包信息
const PACKAGES = {
  node: {
    name: '@veaba/qrcode-node',
    description: 'Node.js QRCode 实现',
    color: '#339933',
    icon: '🟢',
  },
  bun: {
    name: '@veaba/qrcode-bun',
    description: 'Bun QRCode 实现',
    color: '#fbf0df',
    icon: '🥟',
  },
  fast: {
    name: '@veaba/qrcode-fast',
    description: 'Rust 优化版 QRCode',
    color: '#dea584',
    icon: '⚡',
  },
  rust: {
    name: '@veaba/qrcode-rust',
    description: 'Rust QRCode 实现',
    color: '#dea584',
    icon: '🦀',
  },
  kennytm: {
    name: 'kennytm-qrcode',
    description: '社区流行的 Rust QRCode',
    color: '#6b7280',
    icon: '📦',
  },
};

interface BenchmarkResult {
  name: string;
  ops: number;
  avgTime: number; // microseconds
  category: 'single' | 'batch' | 'svg' | 'error_level';
}

interface PackageResult {
  packageName: string;
  version: string;
  runtime: string;
  runtimeVersion: string;
  results: BenchmarkResult[];
}

interface PKBenchmarkSuite {
  timestamp: string;
  environment: {
    platform: string;
    cpu: string;
    nodeVersion?: string;
    bunVersion?: string;
    rustVersion?: string;
  };
  packages: PackageResult[];
  comparison: ComparisonResult[];
}

interface ComparisonResult {
  testName: string;
  category: string;
  results: {
    package: string;
    ops: number;
    avgTime: number;
    rank: number;
  }[];
  winner: string;
  speedup: number; // 最快相对于最慢的倍数
}

/**
 * 内联 Node.js 基准测试配置和数据
 */
const NODE_CONFIG = {
  warmupRuns: 10,
  benchmarkRuns: 1000,
  batchSizes: [10, 100, 1000],
};

const NODE_TEST_TEXTS = {
  short: 'https://example.com',
  medium: 'https://github.com/veaba/qrcodes',
  long: 'https://example.com/very/long/path/with/many/parameters?foo=bar&baz=qux&key=value&another=parameter',
  unicode: 'https://例子.com/测试路径?参数=值',
};

interface NodeBenchmarkResult {
  name: string;
  ops: number;
  time: number;
  avgTime: number;
  memoryDelta?: number;
}

/**
 * 运行 Node.js 基准测试
 * 直接在 backend-benchmark 中执行，不依赖外部文件
 */
async function benchmarkNode(): Promise<PackageResult | null> {
  try {
    console.log('🟢 测试 @veaba/qrcode-node...');

    // 动态导入 qrcode-node 模块（使用相对路径）
    let QRCode: any, generateBatchQRCodes: any, generateQRCodeAsync: any;
    let QRErrorCorrectLevel: any;

    try {
      // 尝试多种导入方式
      const module = await import('../../packages/qrcode-node/dist/index.js')
        .catch(() => import('@veaba/qrcode-node'));
      QRCode = module.QRCode;
      generateBatchQRCodes = module.generateBatchQRCodes;
      generateQRCodeAsync = module.generateQRCodeAsync;
      QRErrorCorrectLevel = module.QRErrorCorrectLevel;
    } catch (importError: any) {
      console.log('  ⚠️ 无法导入 @veaba/qrcode-node 模块');
      console.log('  错误详情:', importError?.message || importError);
      console.log('  提示: 确保 packages/qrcode-node/dist 目录存在');
      return null;
    }

    if (!QRCode) {
      console.log('  ⚠️ QRCode 类未找到');
      return null;
    }

    const results: NodeBenchmarkResult[] = [];

    // 辅助函数：测量内存
    const measureMemory = (): number => {
      if (global.gc) (global as any).gc();
      return process.memoryUsage().heapUsed;
    };

    // 辅助函数：运行单次基准测试
    const runBenchmark = (name: string, fn: () => void, runs: number): NodeBenchmarkResult => {
      // 预热
      for (let i = 0; i < NODE_CONFIG.warmupRuns; i++) fn();

      const memBefore = measureMemory();
      const start = performance.now();
      for (let i = 0; i < runs; i++) fn();
      const time = performance.now() - start;
      const memAfter = measureMemory();

      return {
        name,
        ops: Math.round((runs / time) * 1000),
        time,
        avgTime: time / runs,
        memoryDelta: memAfter - memBefore,
      };
    };

    // 测试 1: 单条生成性能
    console.log('  📊 测试单条生成性能...');
    for (const [type, text] of Object.entries(NODE_TEST_TEXTS)) {
      const result = runBenchmark(
        `单条生成 (${type})`,
        () => {
          const qr = new QRCode(text, QRErrorCorrectLevel.H);
          qr.toSVG();
        },
        NODE_CONFIG.benchmarkRuns
      );
      results.push(result);
    }

    // 测试 2: 批量生成性能
    console.log('  📊 测试批量生成性能...');
    for (const batchSize of NODE_CONFIG.batchSizes) {
      const texts = Array.from({ length: batchSize }, (_, i) => `https://example.com/item${i}`);
      const result = runBenchmark(
        `批量生成 (${batchSize} 条)`,
        () => generateBatchQRCodes(texts),
        Math.max(10, Math.floor(1000 / batchSize))
      );
      result.ops = Math.round(result.ops * batchSize);
      results.push(result);
    }

    // 测试 3: SVG 输出
    console.log('  📊 测试 SVG 输出...');
    const text = NODE_TEST_TEXTS.medium;
    {
      const result = runBenchmark(
        'SVG 输出',
        () => {
          const qr = new QRCode(text, QRErrorCorrectLevel.H);
          qr.toSVG();
        },
        NODE_CONFIG.benchmarkRuns
      );
      results.push(result);
    }

    return {
      packageName: PACKAGES.node.name,
      version: '1.0.0',
      runtime: 'Node.js',
      runtimeVersion: process.version,
      results: results.map((r) => ({
        name: r.name,
        ops: r.ops,
        avgTime: r.avgTime * 1000, // convert ms to µs
        category: categorizeTest(r.name),
      })),
    };
  } catch (error) {
    console.error('  ❌ Node.js 基准测试失败:', error);
    return null;
  }
}

/**
 * 内联 Bun 基准测试配置和数据
 */
const BUN_CONFIG = {
  warmupRuns: 10,
  benchmarkRuns: 1000,
  batchSizes: [10, 100, 1000],
};

const BUN_TEST_TEXTS = {
  short: 'https://example.com',
  medium: 'https://github.com/veaba/qrcodes',
  long: 'https://example.com/very/long/path/with/many/parameters?foo=bar&baz=qux&key=value&another=parameter',
  unicode: 'https://例子.com/测试路径?参数=值',
};

interface BunBenchmarkResult {
  name: string;
  ops: number;
  time: number;
  avgTime: number;
  memoryDelta?: number;
}

/**
 * 运行 Bun 基准测试
 * 直接在 backend-benchmark 中执行，不依赖外部文件
 */
async function benchmarkBun(): Promise<PackageResult | null> {
  try {
    console.log('🥟 测试 @veaba/qrcode-bun...');

    // 检查是否安装了 Bun
    let bunVersion: string;
    try {
      bunVersion = execSync('bun --version', { stdio: 'pipe', encoding: 'utf-8' }).trim();
    } catch {
      console.log('  ⚠️ Bun 未安装，跳过测试');
      return null;
    }

    // 动态导入 qrcode-bun 模块（使用相对路径）
    let QRCode: any, generateBatchQRCodes: any;

    try {
      // 尝试多种导入方式 - 注意：Bun 包需要 .ts 扩展名
      const module = await import('../../packages/qrcode-bun/src/index.ts')
        .catch(() => import('@veaba/qrcode-bun'));
      QRCode = module.QRCode;
      generateBatchQRCodes = module.generateBatchQRCodes;
    } catch (importError: any) {
      console.log('  ⚠️ 无法导入 @veaba/qrcode-bun 模块');
      console.log('  错误详情:', importError?.message || importError);
      console.log('  提示: Bun 包只能在 Bun 运行时中使用，或在 Node.js 中使用 tsx 加载');
      return null;
    }

    if (!QRCode) {
      console.log('  ⚠️ QRCode 类未找到');
      return null;
    }

    const results: BunBenchmarkResult[] = [];

    // 测试 1: 单条生成性能
    console.log('  📊 测试单条生成性能...');
    for (const [type, text] of Object.entries(BUN_TEST_TEXTS)) {
      // 预热
      for (let i = 0; i < BUN_CONFIG.warmupRuns; i++) {
        const qr = new QRCode(text);
        qr.toSVG();
      }

      // 正式测试
      const start = performance.now();
      for (let i = 0; i < BUN_CONFIG.benchmarkRuns; i++) {
        const qr = new QRCode(text);
        qr.toSVG();
      }
      const time = performance.now() - start;

      results.push({
        name: `单条生成 (${type})`,
        ops: Math.round((BUN_CONFIG.benchmarkRuns / time) * 1000),
        time,
        avgTime: time / BUN_CONFIG.benchmarkRuns,
      });
    }

    // 测试 2: 批量生成性能
    console.log('  📊 测试批量生成性能...');
    for (const batchSize of BUN_CONFIG.batchSizes) {
      const texts = Array.from({ length: batchSize }, (_, i) => `https://example.com/item${i}`);

      // 预热
      for (let i = 0; i < BUN_CONFIG.warmupRuns; i++) {
        generateBatchQRCodes(texts);
      }

      const runs = Math.max(10, Math.floor(1000 / batchSize));
      const start = performance.now();
      for (let i = 0; i < runs; i++) {
        generateBatchQRCodes(texts);
      }
      const time = performance.now() - start;

      results.push({
        name: `批量生成 (${batchSize} 条)`,
        ops: Math.round((runs * batchSize / time) * 1000),
        time,
        avgTime: time / runs,
      });
    }

    // 测试 3: SVG 输出
    console.log('  📊 测试 SVG 输出...');
    const text = BUN_TEST_TEXTS.medium;
    {
      for (let i = 0; i < BUN_CONFIG.warmupRuns; i++) {
        const qr = new QRCode(text);
        qr.toSVG();
      }

      const start = performance.now();
      for (let i = 0; i < BUN_CONFIG.benchmarkRuns; i++) {
        const qr = new QRCode(text);
        qr.toSVG();
      }
      const time = performance.now() - start;

      results.push({
        name: 'SVG 输出',
        ops: Math.round((BUN_CONFIG.benchmarkRuns / time) * 1000),
        time,
        avgTime: time / BUN_CONFIG.benchmarkRuns,
      });
    }

    return {
      packageName: PACKAGES.bun.name,
      version: '1.0.0',
      runtime: 'Bun',
      runtimeVersion: bunVersion,
      results: results.map((r) => ({
        name: r.name,
        ops: r.ops,
        avgTime: r.avgTime * 1000, // convert ms to µs
        category: categorizeTest(r.name),
      })),
    };
  } catch (error) {
    console.error('  ❌ Bun 基准测试失败:', error);
    return null;
  }
}

/**
 * 运行 Rust 基准测试 (qrcode-fast)
 * 使用标准化的测试名称以便跨包对比
 */
async function benchmarkFast(): Promise<PackageResult | null> {
  try {
    console.log('⚡ 测试 @veaba/qrcode-fast...');

    const pkgPath = path.join(__dirname, '../../packages/qrcode-fast');

    // 检查包是否存在
    if (!fs.existsSync(pkgPath)) {
      console.log('  ⚠️ qrcode-fast 包不存在，跳过测试');
      return null;
    }

    // 检查 Cargo.toml 中是否有 bench 配置
    const cargoToml = path.join(pkgPath, 'Cargo.toml');
    if (!fs.existsSync(cargoToml)) {
      console.log('  ⚠️ Cargo.toml 不存在，跳过测试');
      return null;
    }

    const cargoContent = fs.readFileSync(cargoToml, 'utf-8');
    if (!cargoContent.includes('[[bench]]') && !cargoContent.includes('[bench]')) {
      console.log('  ⚠️ 未配置基准测试，跳过');
      return null;
    }

    console.log('  🔄 运行 cargo bench (可能需要 1-2 分钟)...');

    // 运行 cargo bench，使用更短的超时时间
    let output: string;
    try {
      output = execSync('cargo bench 2>&1', {
        cwd: pkgPath,
        encoding: 'utf-8',
        timeout: 120000, // 2 分钟超时
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (execError: any) {
      // 检查是否是编译错误
      if (execError.stdout && (
        execError.stdout.includes('error[E0583]') ||
        execError.stdout.includes('error: could not compile')
      )) {
        console.log('  ⚠️ Rust 代码编译失败，可能正在重构中');
        console.log('  提示: 跳过 qrcode-fast 基准测试');
        return null;
      }
      if (execError.killed || execError.signal === 'SIGTERM') {
        console.log('  ⚠️ cargo bench 超时 (120秒)，跳过测试');
        console.log('  提示: Rust 基准测试可能需要更长时间，请稍后手动运行');
        return null;
      }
      console.log('  ⚠️ cargo bench 执行失败:', execError?.message || '未知错误');
      return null;
    }

    // 解析输出
    const rawResults = parseRustBenchmarkOutput(output, ['fast']);

    if (rawResults.length === 0) {
      console.log('  ⚠️ 未能解析基准测试结果');
      return null;
    }

    console.log(`  ✅ 解析到 ${rawResults.length} 个测试结果`);

    // 映射到标准化测试名称
    const nameMapping: Record<string, { name: string; category: BenchmarkResult['category'] }> = {
      'fast_single_generation': { name: '单条生成 (medium)', category: 'single' },
      'fast_batch_100': { name: '批量生成 (100 条)', category: 'batch' },
      'fast_svg_generation': { name: 'SVG 输出', category: 'svg' },
      'fast_error_levels/L': { name: '纠错级别 L (低)', category: 'error_level' },
      'fast_error_levels/M': { name: '纠错级别 M (中)', category: 'error_level' },
      'fast_error_levels/Q': { name: '纠错级别 Q (较高)', category: 'error_level' },
      'fast_error_levels/H': { name: '纠错级别 H (高)', category: 'error_level' },
      'fast_text_lengths/short_12chars': { name: '单条生成 (short)', category: 'single' },
      'fast_text_lengths/medium_36chars': { name: '单条生成 (medium)', category: 'single' },
      'fast_text_lengths/long_98chars': { name: '单条生成 (long)', category: 'single' },
    };

    const results: BenchmarkResult[] = [];
    for (const r of rawResults) {
      const mapping = nameMapping[r.name];
      if (mapping) {
        results.push({
          name: mapping.name,
          ops: r.ops,
          avgTime: r.avgTime,
          category: mapping.category,
        });
      }
    }

    // 获取 Rust 版本
    let rustVersion = 'unknown';
    try {
      rustVersion = execSync('rustc --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch { }

    return {
      packageName: PACKAGES.fast.name,
      version: '1.0.0',
      runtime: 'Rust',
      runtimeVersion: rustVersion,
      results,
    };
  } catch (error) {
    console.error('  ❌ qrcode-fast 基准测试失败:', error);
    return null;
  }
}

/**
 * 解析 Rust benchmark 输出 (Criterion 格式)
 * Criterion 输出格式: "veaba_single_generation time:   [63.747 µs 64.392 µs 65.077 µs]"
 */
function parseRustBenchmarkOutput(output: string, prefixes: string[]): Array<{ name: string; ops: number; avgTime: number }> {
  const results: Array<{ name: string; ops: number; avgTime: number }> = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // 匹配 Criterion 格式: "test_name time:   [low mean high]" 或 "test_name time:   [low mean high]"
    const match = line.match(/^([\w/]+)\s+time:\s+\[[\d.]+\s+([\d.]+)\s+(µs|ms|ns|s)\s/);
    if (match) {
      const [, testName, timeValue, unit] = match;

      // 检查是否匹配任一前缀
      const matchesPrefix = prefixes.some(prefix =>
        testName.toLowerCase().startsWith(prefix.toLowerCase())
      );

      if (!matchesPrefix) {
        continue;
      }

      // 转换时间为微秒
      let avgTime = parseFloat(timeValue);
      switch (unit) {
        case 'ns': avgTime = avgTime / 1000; break;
        case 'µs': break;
        case 'ms': avgTime = avgTime * 1000; break;
        case 's': avgTime = avgTime * 1000000; break;
      }

      // 计算 ops/s
      const ops = Math.round(1000000 / avgTime);

      results.push({
        name: testName,
        ops,
        avgTime,
      });
    }
  }

  return results;
}

/**
 * 分类测试名称
 */
function categorizeTest(name: string): BenchmarkResult['category'] {
  const lower = name.toLowerCase();
  if (lower.includes('batch')) return 'batch';
  if (lower.includes('svg')) return 'svg';
  if (lower.includes('error') || lower.includes('level')) return 'error_level';
  return 'single';
}

/**
 * 生成对比结果
 */
function generateComparison(packages: PackageResult[]): ComparisonResult[] {
  const comparisons: ComparisonResult[] = [];

  // 获取所有测试名称
  const allTestNames = new Set<string>();
  for (const pkg of packages) {
    for (const r of pkg.results) {
      allTestNames.add(r.name);
    }
  }

  // 对每个测试进行对比
  for (const testName of allTestNames) {
    const testResults: ComparisonResult['results'] = [];

    for (const pkg of packages) {
      const result = pkg.results.find(r => r.name === testName);
      if (result) {
        testResults.push({
          package: pkg.packageName,
          ops: result.ops,
          avgTime: result.avgTime,
          rank: 0, // 稍后计算
        });
      }
    }

    if (testResults.length === 0) continue;

    // 按 ops 排序（越高越好）
    testResults.sort((a, b) => b.ops - a.ops);

    // 设置排名
    testResults.forEach((r, i) => { r.rank = i + 1; });

    // 计算速度提升倍数
    const fastest = testResults[0];
    const slowest = testResults[testResults.length - 1];
    const speedup = slowest.ops > 0 ? fastest.ops / slowest.ops : 1;

    const category = packages
      .flatMap(p => p.results)
      .find(r => r.name === testName)?.category || 'single';

    comparisons.push({
      testName,
      category,
      results: testResults,
      winner: fastest.package,
      speedup,
    });
  }

  // 按类别和测试名称排序
  comparisons.sort((a, b) => {
    const catOrder = { single: 0, batch: 1, svg: 2, error_level: 3 };
    if (catOrder[a.category] !== catOrder[b.category]) {
      return catOrder[a.category] - catOrder[b.category];
    }
    return a.testName.localeCompare(b.testName);
  });

  return comparisons;
}

/**
 * 打印对比结果
 */
function printResults(suite: PKBenchmarkSuite): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 后端 QRCode 包 PK 基准测试结果');
  console.log(`⏰ ${suite.timestamp}`);
  console.log(`${'='.repeat(80)}\n`);

  // 环境信息
  console.log('🖥️  测试环境:');
  console.log(`   平台: ${suite.environment.platform}`);
  if (suite.environment.nodeVersion) {
    console.log(`   Node.js: ${suite.environment.nodeVersion}`);
  }
  if (suite.environment.bunVersion) {
    console.log(`   Bun: ${suite.environment.bunVersion}`);
  }
  if (suite.environment.rustVersion) {
    console.log(`   Rust: ${suite.environment.rustVersion}`);
  }
  console.log();

  // 参与的包
  console.log('📦 参与测试的包:');
  for (const pkg of suite.packages) {
    const icon = Object.values(PACKAGES).find(p => p.name === pkg.packageName)?.icon || '📦';
    console.log(`   ${icon} ${pkg.packageName} (${pkg.runtime} ${pkg.runtimeVersion})`);
  }
  console.log();

  // 对比结果
  console.log(`${'─'.repeat(80)}`);
  console.log('🏆 对比结果\n');

  let currentCategory = '';
  const categoryNames = {
    single: '📝 单条生成',
    batch: '📚 批量生成',
    svg: '🎨 SVG 生成',
    error_level: '🔧 纠错级别',
  };

  for (const comp of suite.comparison) {
    if (comp.category !== currentCategory) {
      currentCategory = comp.category;
      console.log(`\n${categoryNames[comp.category] || comp.category}:`);
    }

    console.log(`\n  ${comp.testName}:`);
    for (const result of comp.results) {
      const icon = result.rank === 1 ? '🏆' : `  ${result.rank}`;
      const pkg = Object.values(PACKAGES).find(p => p.name === result.package);
      const pkgIcon = pkg?.icon || '📦';
      console.log(`    ${icon} ${pkgIcon} ${result.package}`);
      console.log(`       ${result.ops.toLocaleString()} ops/s | ${result.avgTime.toFixed(2)} µs/op`);
    }
    console.log(`    📈 速度提升: ${comp.speedup.toFixed(2)}x`);
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

/**
 * 保存结果到 JSON 文件
 */
function saveResults(suite: PKBenchmarkSuite): void {
  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 按 GOVERNANCE.md §4.3，docs/public/ 下的数据文件必须声明 _status。
  // 本套件只测 Node.js 与 Bun，不含 Rust，因此是次要来源而非权威。
  const STATUS_NOTE =
    'Node.js 与 Bun 的对比测量；仅覆盖这两个 JS 运行时，不含 Rust 实现，' +
    '因此不能用来推导与 kennytm 的倍数。与权威文件 benchmark_speedup_verified.json ' +
    '口径不同，不可混用。';

  // 保存完整结果
  const outputPath = path.join(CONFIG.outputDir, 'backend_benchmark_pk.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ _status: 'secondary-source', _note: STATUS_NOTE, ...suite }, null, 2)
  );
  console.log(`💾 结果已保存到: ${outputPath}`);

  // 保存简化版结果（用于前端展示）
  const summary = {
    timestamp: suite.timestamp,
    environment: suite.environment,
    summary: suite.comparison.map(c => ({
      testName: c.testName,
      category: c.category,
      winner: c.winner,
      speedup: c.speedup,
      top3: c.results.slice(0, 3).map(r => ({
        package: r.package,
        ops: r.ops,
        avgTime: r.avgTime,
      })),
    })),
  };

  const summaryPath = path.join(CONFIG.outputDir, 'backend_benchmark_pk_summary.json');
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        _status: 'secondary-source',
        _superseded_by: 'backend_benchmark_pk.json',
        _note:
          'backend_benchmark_pk.json 的摘要切片，覆盖范围更窄。引用请优先使用完整文件，' +
          '并与权威文件 benchmark_speedup_verified.json 区分口径。',
        ...summary,
      },
      null,
      2
    )
  );
  console.log(`💾 摘要已保存到: ${summaryPath}`);
}

// 全局变量：缓存 comparison_bench 的输出，避免重复运行
let comparisonBenchOutput: string | null = null;
let comparisonBenchRunTimestamp: number | null = null;

/**
 * 运行 comparison_bench 并缓存结果
 */
async function runComparisonBenchOnce(): Promise<string | null> {
  // 如果 5 秒内已经运行过，直接返回缓存的结果
  if (comparisonBenchOutput && comparisonBenchRunTimestamp &&
    Date.now() - comparisonBenchRunTimestamp < 5000) {
    return comparisonBenchOutput;
  }

  const pkgPath = path.join(__dirname, '../../packages/qrcode-rust');

  try {
    console.log('  🔄 运行 cargo bench --bench comparison_bench (可能需要 1-2 分钟)...');

    const output = execSync('cargo bench --bench comparison_bench 2>&1', {
      cwd: pkgPath,
      encoding: 'utf-8',
      timeout: 120000, // 2 分钟超时
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // 缓存结果
    comparisonBenchOutput = output;
    comparisonBenchRunTimestamp = Date.now();

    return output;
  } catch (execError: any) {
    // 检查是否是编译错误
    if (execError.stdout && (
      execError.stdout.includes('error[E0583]') ||
      execError.stdout.includes('error: could not compile')
    )) {
      console.log('  ⚠️ Rust 代码编译失败，可能正在重构中');
      console.log('  提示: 跳过 Rust 基准测试');
      return null;
    }
    if (execError.killed || execError.signal === 'SIGTERM') {
      console.log('  ⚠️ cargo bench 超时 (120秒)，跳过测试');
      return null;
    }
    console.log('  ⚠️ cargo bench 执行失败:', execError?.message || '未知错误');
    return null;
  }
}

/**
 * 运行完整的 PK 基准测试
 */
async function runPKBenchmark(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           🚀 后端 QRCode 包 PK 基准测试套件                                  ║');
  console.log('║           Backend QRCode Package PK Benchmark Suite                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  const suite: PKBenchmarkSuite = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: process.platform,
      cpu: process.arch,
      nodeVersion: process.version,
    },
    packages: [],
    comparison: [],
  };

  // 运行各包基准测试
  console.log('─'.repeat(80));
  console.log('开始运行各包基准测试...\n');

  const nodeResult = await benchmarkNode();
  if (nodeResult) suite.packages.push(nodeResult);

  const bunResult = await benchmarkBun();
  if (bunResult) {
    suite.packages.push(bunResult);
    suite.environment.bunVersion = bunResult.runtimeVersion;
  }

  const fastResult = await benchmarkFast();
  if (fastResult) {
    suite.packages.push(fastResult);
    suite.environment.rustVersion = fastResult.runtimeVersion;
  }

  // 运行 comparison_bench 一次，然后复用结果
  const comparisonOutput = await runComparisonBenchOnce();
  if (comparisonOutput) {
    // 解析 veaba 的结果
    const veabaResults = parseRustBenchmarkOutput(comparisonOutput, ['veaba']);

    // 映射到标准化测试名称
    const veabaNameMapping: Record<string, { name: string; category: BenchmarkResult['category'] }> = {
      'veaba_single_generation': { name: '单条生成 (medium)', category: 'single' },
      'veaba_batch_100': { name: '批量生成 (100 条)', category: 'batch' },
      'veaba_svg_generation': { name: 'SVG 输出', category: 'svg' },
      'veaba_error_levels/L': { name: '纠错级别 L (低)', category: 'error_level' },
      'veaba_error_levels/M': { name: '纠错级别 M (中)', category: 'error_level' },
      'veaba_error_levels/Q': { name: '纠错级别 Q (较高)', category: 'error_level' },
      'veaba_error_levels/H': { name: '纠错级别 H (高)', category: 'error_level' },
      'veaba_text_lengths/short_12chars': { name: '单条生成 (short)', category: 'single' },
      'veaba_text_lengths/medium_36chars': { name: '单条生成 (medium)', category: 'single' },
      'veaba_text_lengths/long_98chars': { name: '单条生成 (long)', category: 'single' },
    };

    const veabaBenchmarkResults: BenchmarkResult[] = [];
    for (const r of veabaResults) {
      const mapping = veabaNameMapping[r.name];
      if (mapping) {
        veabaBenchmarkResults.push({
          name: mapping.name,
          ops: r.ops,
          avgTime: r.avgTime,
          category: mapping.category,
        });
      }
    }

    if (veabaBenchmarkResults.length > 0) {
      let rustVersion = 'unknown';
      try {
        rustVersion = execSync('rustc --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      } catch { }

      const rustResult: PackageResult = {
        packageName: PACKAGES.rust.name,
        version: '1.0.0',
        runtime: 'Rust',
        runtimeVersion: rustVersion,
        results: veabaBenchmarkResults,
      };
      suite.packages.push(rustResult);
      if (!suite.environment.rustVersion) {
        suite.environment.rustVersion = rustVersion;
      }
    }

    // 解析 kennytm 的结果
    const kennytmResults = parseRustBenchmarkOutput(comparisonOutput, ['kennytm']);

    // 映射到标准化测试名称
    const kennytmNameMapping: Record<string, { name: string; category: BenchmarkResult['category'] }> = {
      'kennytm_single_generation': { name: '单条生成 (medium)', category: 'single' },
      'kennytm_batch_100': { name: '批量生成 (100 条)', category: 'batch' },
      'kennytm_svg_generation': { name: 'SVG 输出', category: 'svg' },
      'kennytm_error_levels/L': { name: '纠错级别 L (低)', category: 'error_level' },
      'kennytm_error_levels/M': { name: '纠错级别 M (中)', category: 'error_level' },
      'kennytm_error_levels/Q': { name: '纠错级别 Q (较高)', category: 'error_level' },
      'kennytm_error_levels/H': { name: '纠错级别 H (高)', category: 'error_level' },
      'kennytm_text_lengths/short_12chars': { name: '单条生成 (short)', category: 'single' },
      'kennytm_text_lengths/medium_36chars': { name: '单条生成 (medium)', category: 'single' },
      'kennytm_text_lengths/long_98chars': { name: '单条生成 (long)', category: 'single' },
    };

    const kennytmBenchmarkResults: BenchmarkResult[] = [];
    for (const r of kennytmResults) {
      const mapping = kennytmNameMapping[r.name];
      if (mapping) {
        kennytmBenchmarkResults.push({
          name: mapping.name,
          ops: r.ops,
          avgTime: r.avgTime,
          category: mapping.category,
        });
      }
    }

    if (kennytmBenchmarkResults.length > 0) {
      let rustVersion = 'unknown';
      try {
        rustVersion = execSync('rustc --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      } catch { }

      const kennytmResult: PackageResult = {
        packageName: PACKAGES.kennytm.name,
        version: '0.14.0',
        runtime: 'Rust',
        runtimeVersion: rustVersion,
        results: kennytmBenchmarkResults,
      };
      suite.packages.push(kennytmResult);
    }
  }

  // 生成对比结果
  console.log('\n─'.repeat(80));
  console.log('生成对比结果...\n');
  suite.comparison = generateComparison(suite.packages);

  // 打印结果
  printResults(suite);

  // 保存结果
  console.log('─'.repeat(80));
  saveResults(suite);

  console.log('\n✅ 基准测试完成！\n');
}

// 运行基准测试
runPKBenchmark().catch(console.error);
