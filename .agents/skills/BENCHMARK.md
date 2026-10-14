# QRCode 基准测试开发指南

> ⚠️ **基准相关强制约束**（[章程](../../GOVERNANCE.md) §3.2、§4）：
>
> 1. **正确性优先于性能** —— 基准数字只有在产物正确的前提下才有意义。
>    涉及编码/布局的改动必须用**独立解码器**验证产物
>    （`resvg` 渲染 + `rqrr` 解码），不得只检查"图长得像二维码"。
> 2. **性能数字的单一事实来源**是 `docs/public/benchmark_speedup_verified.json`。
>    所有文档必须引用它，不得单独维护数字副本。
> 3. **作废的数字不得直接删除**，须登记进该文件的 `deprecated_claims`。
> 4. 修改数字后必须运行 `node scripts/check-perf-claims.js`。
> 5. **诊断程序用完即删**；有长期价值的提升为
>    `bench/rust-tools/tests/` 下的回归测试。

## 快速开始

### 运行所有基准测试

```bash
# 一键运行所有测试（前端 + 后端 + PK）
pnpm run benchmark

# 单独运行各维度测试
pnpm run benchmark:frontend    # 前端测试
pnpm run benchmark:backend     # 后端测试
pnpm run benchmark:pk          # PK 多包对比
```

### 直接运行特定测试

```bash
# 前端基准测试（推荐）
cd bench/frontend-benchmark
node benchmark.cjs

# 前端基准测试（TypeScript 版本，需先构建）
cd bench/frontend-benchmark
npx tsx index.ts

# Node.js 后端测试
cd packages/qrcode-node
node benchmark/index.js

# Bun 后端测试
cd packages/qrcode-bun
bun run benchmark/index.ts

# Rust 基准测试
cd packages/qrcode-rust
cargo bench

# PK 基准测试（对比 3 个包：Node.js + Bun + Rust）
cd bench/backend-benchmark
npx tsx index.ts      # 完整测试（包含 Rust，耗时约 5 分钟）
npx tsx index-fast.ts # 快速测试（使用缓存的 Rust 结果）
```

### 使用 rust-tools 验证 SVG

```bash
# 生成并验证二维码 SVG
cd bench/rust-tools
cargo run --release --features validation --bin veaba-qr -- "你的文本"

# 测试现有的 SVG 文件
cargo run --release --features validation --bin test-svgs

# 验证 kennytm 生成的二维码
cargo run --release --features validation --bin validate-qr -- "你的文本"
```

## SVG 生成性能基准测试

### 一键运行

```bash
# 快速测试（10次运行）
pnpm bench:svg:rust:quick

# 完整测试（100次运行）
pnpm bench:svg:rust

# 运行所有测试（包括 JS，默认只运行 Rust）
pnpm bench:svg:quick
pnpm bench:svg
```

### 测试内容

对比以下包的 SVG 生成性能：

- `kennytm-qrcode` - 社区参考库
- `@veaba/qrcode-rust` - 纯 Rust 实现
- `@veaba/qrcode-fast` - 极致性能优化版

### 测试用例

| 名称 | 文本 | 版本 | 模块数 |
|------|------|------|--------|
| Simple | "Hello World" | 1 | 21x21 |
| Complex | "Test QR Code 123" | 3 | 25x25 |
| URL | "<https://github.com/veaba/qrcodes>" | 3 | 29x29 |
| Long | 长文本 | 6 | 37x37 |

### 输出文件

运行后生成以下文件：

**SVG 文件** (`docs/public/bench/benchmark-output/`):

- `{测试名}_{包名}.svg` - 各包生成的二维码 SVG

**JSON 报告** (`docs/public/`):

- `benchmark_svg_rust.json` - 详细性能数据

**测试报告文档**:

- `docs/bench/svg-benchmark.mdx` - 完整的测试报告

### 实现细节

#### 脚本文件

- `scripts/benchmark-svg-rust.js` - Rust 包测试脚本
- `scripts/benchmark-svg-js.js` - JS 包测试脚本（Windows 有兼容性问题）
- `scripts/benchmark-svg.js` - 综合测试脚本
- `bench/rust-tools/src/bin/benchmark_full.rs` - Rust 基准测试程序

#### 关键特性

1. **自动验证**: 使用 `resvg` + `rqrr` 验证生成的 SVG 可扫描性
2. **可配置输出目录**: Rust 程序支持 `--output-dir` 参数
3. **JSON 报告**: 自动复制到 `docs/public/` 供前端使用
4. **性能对比**: 显示相对于 kennytm-qrcode 的速度提升倍数

#### 添加新的测试用例

编辑 `bench/rust-tools/src/bin/benchmark_full.rs`:

```rust
const TEST_CASES: &[(&str, &str)] = &[
    ("Simple", "Hello World"),
    ("Complex", "Test QR Code 123"),
    ("URL", "https://github.com/veaba/qrcodes"),
    ("Long", "Email: test@example.com | Phone: +1-234-567-8900 | Address: 123 Main St"),
    ("NewCase", "你的新测试文本"),  // 添加新用例
];
```

## 添加新的基准测试

### 1. 为现有包添加新的测试项

#### Node.js/Bun 包

编辑 `packages/qrcode-node/benchmark/index.ts` 或 `packages/qrcode-bun/benchmark/index.ts`:

```typescript
// 在 benchmarkNODE 或 benchmarkBUN 函数中添加
const newResult = runBenchmark(
  '新测试项名称',
  () => {
    // 测试代码
    const qr = new QRCodeCore(TEST_TEXTS.medium, QRErrorCorrectLevel.H);
    qr.toSVG();
  },
  CONFIG.benchmarkRuns
);
results.push(newResult);
```

#### Rust 包

编辑 `packages/qrcode-rust/benches/comparison_bench.rs`:

```rust
fn bench_new_test(c: &mut Criterion) {
    let text = "https://github.com/veaba/qrcodes";
    
    c.bench_function("veaba_new_test", |b| {
        b.iter(|| {
            let qr = QRCode::new(text).unwrap();
            black_box(qr.to_svg(256));
        });
    });
}

// 添加到 criterion_group!
criterion_group!(benches, bench_new_test, /* ...其他测试 */);
```

### 2. 添加新的对比包

编辑 `bench/backend-benchmark/index.ts`:

```typescript
// 1. 在 PACKAGES 中添加包信息
const PACKAGES = {
  // ... 现有包
  newpackage: {
    name: '@veaba/qrcode-new',
    description: '新包描述',
    color: '#ff0000',
    icon: '🆕',
  },
};

// 2. 添加基准测试函数
async function benchmarkNewPackage(): Promise<PackageResult | null> {
  try {
    console.log('🆕 测试 @veaba/qrcode-new...');
    
    // 运行测试...
    
    return {
      packageName: PACKAGES.newpackage.name,
      version: '1.0.0',
      runtime: 'Node.js', // 或 'Rust', 'Bun'
      runtimeVersion: process.version,
      results: [...],
    };
  } catch (error) {
    console.error('  ❌ 新包基准测试失败:', error);
    return null;
  }
}

// 3. 在 runPKBenchmark 中调用
const newResult = await benchmarkNewPackage();
if (newResult) suite.packages.push(newResult);
```

### 4. 添加 Rust 包到 PK 测试

如果要将新的 Rust 包添加到 PK 测试，需要：

1. **创建 benchmark 文件**：`packages/qrcode-new/benches/comparison_bench.rs`
2. **配置 Cargo.toml**：添加 `[[bench]]` 配置
3. **使用标准测试名称**：确保测试名称与 Node.js/Bun 包的测试名称一致，例如：
   - `单条生成 (short/medium/long)`
   - `批量生成 (100 条)`
   - `SVG 输出`
   - `纠错级别 L/M/Q/H`
4. **在 index.ts 中添加映射**：

```typescript
const nameMapping: Record<string, { name: string; category: BenchmarkResult['category'] }> = {
  'new_single_generation': { name: '单条生成 (medium)', category: 'single' },
  'new_svg_generation': { name: 'SVG 输出', category: 'svg' },
  // ...
};
```

### 3. 添加新的测试维度

#### 步骤 1: 在各包中添加测试

确保所有包都实现了相同名称的测试项。

#### 步骤 2: 更新分类函数

编辑 `bench/backend-benchmark/index.ts`:

```typescript
function categorizeTest(name: string): BenchmarkResult['category'] {
  const lower = name.toLowerCase();
  if (lower.includes('batch')) return 'batch';
  if (lower.includes('svg')) return 'svg';
  if (lower.includes('error')) return 'error_level';
  if (lower.includes('newdimension')) return 'new_dimension'; // 添加新分类
  return 'single';
}
```

#### 步骤 3: 更新前端组件

编辑 `docs/components/PKBenchmarkDashboard.tsx`:

```typescript
const CATEGORY_NAMES: Record<string, string> = {
  single: '📝 单条生成',
  batch: '📚 批量生成',
  svg: '🎨 SVG 生成',
  error_level: '🔧 纠错级别',
  new_dimension: '🆕 新维度', // 添加新分类名称
};
```

## 基准测试最佳实践

### 1. 预热

始终进行预热，避免冷启动影响结果：

```typescript
// 预热
for (let i = 0; i < CONFIG.warmupRuns; i++) {
  fn();
}

// 正式测试
const start = performance.now();
for (let i = 0; i < runs; i++) {
  fn();
}
```

### 2. 防止编译器优化（Rust）

使用 `black_box` 防止编译器优化掉测试代码：

```rust
use criterion::black_box;

b.iter(|| {
    let qr = QRCode::new(black_box(text)).unwrap();
    black_box(qr.to_svg(256));
});
```

### 3. 内存测量

Node.js/Bun 中可以测量内存使用：

```typescript
const before = process.memoryUsage().heapUsed;
// ... 运行测试
const after = process.memoryUsage().heapUsed;
const memoryDelta = after - before;
```

### 4. 标准化输出

确保所有包输出相同格式的结果，便于对比：

```typescript
interface BenchmarkResult {
  name: string;        // 测试项名称（统一命名）
  ops: number;         // 每秒操作数
  avgTime: number;     // 平均耗时（统一单位：微秒）
  category: string;    // 分类（统一分类名）
}
```

## 调试基准测试

### 查看详细输出

```bash
# Node.js/Bun - 添加调试日志
DEBUG=1 npx tsx index.ts

# Rust - 显示详细输出
cargo bench -- --verbose
```

### 检查 JSON 输出

```bash
# 格式化查看 JSON 结果
cat docs/public/backend_benchmark_pk.json | jq '.'
```

### 验证数据加载

在浏览器控制台检查：

```javascript
fetch('/backend_benchmark_pk.json')
  .then(r => r.json())
  .then(data => console.log(data));
```

## 常见问题

### Q: 基准测试结果不一致？

A: 可能原因：

- 系统负载：确保测试时没有其他高负载程序运行
- 电源管理：笔记本电脑请连接电源并设置为高性能模式
- 温度节流：长时间运行可能导致 CPU 降频

### Q: Rust 测试编译失败？

A: 检查：

```bash
# 确保使用 release 模式
cargo bench  # 自动使用 release

# 检查依赖
cargo check

# 清理并重建
cargo clean && cargo bench
```

### Q: 前端组件不显示数据？

A: 检查：

1. JSON 文件是否存在于 `docs/public/`
2. 文件路径是否正确（以 `/` 开头）
3. JSON 格式是否有效
4. 浏览器控制台是否有错误

### Q: 如何添加图表？

A: 使用 `BenchmarkCharts.tsx` 中的现有组件：

```tsx
import { BarChart, ComparisonTable } from '../components/BenchmarkCharts';

// 柱状图
<BarChart data={data} title="性能对比" />

// 对比表格
<ComparisonTable data={data} />
```

## 基准测试输出

### JSON 数据文件

所有基准测试结果保存在 `docs/public/`：

| 文件 | 说明 | 典型大小 |
|------|------|---------|
| `frontend_benchmark_result.json` | 前端 @veaba/qrcode-js 测试结果 | ~2 KB |
| `benchmark_node_result.json` | Node.js 后端测试结果 | ~2.5 KB |
| `benchmark_bun_result.json` | Bun 后端测试结果 | ~2.8 KB |
| `backend_benchmark_pk.json` | PK 完整对比结果 | ~13 KB |
| `backend_benchmark_pk_summary.json` | PK 摘要结果 | ~7 KB |
| `benchmark_summary.json` | 所有测试汇总 | ~0.1 KB |
| `benchmark_svg_rust.json` | SVG 生成测试原始数据 | ~5 KB |

### 文档报告

- `docs/bench/index.mdx` - 基准测试总览
- `docs/bench/front-bench.mdx` - 前端基准测试报告
- `docs/bench/backend-bench.mdx` - 后端基准测试报告（Node.js vs Bun）
- `docs/bench/backend-pk.mdx` - PK 多包对比报告
- `docs/bench/compare-rust.mdx` - Rust 包对比报告
- `docs/bench/svg-benchmark.mdx` - SVG 生成基准测试报告

### 可视化组件

- `docs/components/BenchmarkCharts.tsx` - 图表组件（柱状图、对比表）
- `docs/components/PKBenchmarkDashboard.tsx` - PK 对比仪表盘

## 最新基准测试结果（2026-02-02）

### 后端包性能对比

| 包 | 单条生成 (ops/s) | SVG 输出 (ops/s) | 纠错级别 H (ops/s) |
|---|-----------------|-----------------|-------------------|
| `@veaba/qrcode-fast` | 54,283 | 92,486 | 47,436 |
| `@veaba/qrcode-bun` | 18,902 | 18,003 | 20,170 |
| `@veaba/qrcode-node` | 12,078 | 10,150 | 11,179 |

### Rust 包对比（vs kennytm-qrcode）

| 测试项 | @veaba/qrcode-rust | kennytm-qrcode | 速度提升 |
|--------|-------------------|----------------|----------|
| 单条生成 | ~54.4 µs | ~454.6 µs | **8.4x** |
| 批量 100 条 | ~4.21 ms | ~34.12 ms | **8.1x** |
| 纠错级别 L | ~29.6 µs | ~323.9 µs | **10.9x** |

### SVG 验证结果

使用 `bench/rust-tools` 验证工具：

- ✅ `@veaba/qrcode-rust` - 生成的 SVG 可通过标准二维码扫描器正确解码
- ✅ `@veaba/qrcode-fast` - 生成的 SVG 可通过标准二维码扫描器正确解码

> 此前记录的「复杂文本（版本 3+）Reed-Solomon 校验失败」已于 2026-03-20 修复。
> 根因是共享的 `RS_BLOCK_TABLE` 中 v15-H 为占位符、`get_min_version` 的版本上限与头部重复计入、
> `qrcode-rust` 缺少 v7+ 版本信息、`qrcode-fast` 对齐图案坐标表越界。
> 现两个包均覆盖全部 40 个版本，H 级最大 1273 字节（QR 标准上限），与 JS 实现一致。
> 复现：`cargo run --release --features validation --bin scan-max`

验证命令：

```bash
cd bench/rust-tools
cargo run --release --features validation --bin veaba-qr -- "Hello World"
```

### SVG 生成性能对比

| 测试用例 | kennytm (µs) | qrcode-rust (µs) | qrcode-fast (µs) | fast 加速比 |
|---------|-------------|-----------------|-----------------|------------|
| Simple | ~230 | ~32 | ~11 | **~21x** |
| Complex | ~350 | ~37 | ~17 | **~21x** |
| URL | ~470 | ~55 | ~23 | **~20x** |
| Long | ~870 | ~90 | ~40 | **~22x** |

## 参考

- [Criterion.rs 文档](https://bheisler.github.io/criterion.rs/book/)
- [Rspress 文档](https://rspress.dev/)
- 项目中的示例代码：
  - `bench/frontend-benchmark/benchmark.cjs`
  - `bench/backend-benchmark/index.ts`
  - `docs/components/PKBenchmarkDashboard.tsx`
  - `bench/rust-tools/src/bin/veaba_qr.rs`
