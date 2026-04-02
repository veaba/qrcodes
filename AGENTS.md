# AGENTS.md - 开发指南

> 为 AI 助手准备的开发指南，避免踩坑

## 项目概览

高性能 QRCode 生成器，支持多运行时：
- **Rust** - `qrcode-fast` (极致性能), `qrcode-rust` (功能完整)
- **WASM** - `qrcode-wasm` (浏览器)
- **JavaScript** - `qrcode-js` (浏览器), `qrcode-js-shared` (共享核心)
- **Node.js** - `qrcode-node`
- **Bun** - `qrcode-bun`

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | v20.19+ | 主要运行时 |
| pnpm | v10+ | 包管理器（已在 `packageManager` 字段指定） |
| Rust | 1.70+ | Rust 包编译 |
| wasm-pack | latest | WASM 构建工具 |

## 目录结构

```
qrcodes/
├── packages/
│   ├── qrcode-fast/          # Rust 极致性能版 (cdylib + rlib)
│   ├── qrcode-rust/          # Rust 功能完整版 (rlib)
│   ├── qrcode-wasm/          # Rust WASM 浏览器包
│   ├── qrcode-js/            # 纯 JavaScript 浏览器包
│   ├── qrcode-js-shared/     # 共享核心逻辑 (缓存、样式、QR 核心)
│   ├── qrcode-node/          # Node.js 后端包
│   └── qrcode-bun/           # Bun 后端包
├── bench/                    # 基准测试工具
├── docs/                     # Rspress 文档站点
├── tests/                    # Vitest 测试文件
├── scripts/                  # 构建/测试/发布脚本
└── .github/workflows/        # CI/CD 配置
```

## 常用命令

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
# 构建所有包
pnpm run build

# 构建特定包
pnpm --filter @veaba/qrcode-js-shared build    # 共享核心
pnpm --filter @veaba/qrcode-wasm build         # WASM (需要 wasm-pack)
pnpm --filter @veaba/qrcode-js build           # JS 浏览器包
pnpm --filter @veaba/qrcode-node build         # Node.js 包
```

### 测试

```bash
# 运行所有测试
pnpm test

# 单元测试 (Node.js 环境)
pnpm run test:unit

# 浏览器测试 (WASM 需要 Chrome)
pnpm run test:browser

# 覆盖率报告
pnpm run test:coverage

# 监视模式
pnpm run test:watch

# 测试特定包
pnpm test:shared     # qrcode-js-shared
pnpm test:node       # qrcode-node
pnpm test:ts         # qrcode-bun
```

### Rust 相关

```bash
# Rust 测试
cargo test --workspace

# Rust 代码检查
cargo clippy --workspace --all-targets -- -D warnings

# Rust 格式化检查
cargo fmt --all -- --check
```

## 测试配置

### Vitest 配置

| 配置文件 | 用途 | 测试文件模式 |
|---------|------|-------------|
| `vitest.config.ts` | 默认/Node.js 测试 | `tests/**/*.test.{ts,js}` |
| `vitest.config.browser.ts` | 浏览器/WASM 测试 | `tests/**/*.browser.test.{ts,js}` |

### 测试文件位置

| 包 | 测试文件 |
|---|---------|
| qrcode-js-shared | `tests/qrcode-shared/*.test.ts` |
| qrcode-node | `tests/qrcode-node/*.test.ts` |
| qrcode-bun | `tests/qrcode-bun/*.test.ts` |
| qrcode-js | `tests/qrcode-js/*.test.ts` |
| qrcode-wasm | `tests/qrcode-wasm/*.test.ts`, `*.browser.test.ts` |

## 包依赖关系

```
@veaba/qrcode-js        → @veaba/qrcode-js-shared (workspace:*)
@veaba/qrcode-node      → @veaba/qrcode-js-shared (workspace:*)
@veaba/qrcode-wasm      → @veaba/qrcode-js (workspace:*)
@veaba/qrcode-fast      → qrcode-rust-shared (path)
@veaba/qrcode-rust      → qrcode-rust-shared (path)
```

**构建顺序**：先构建 `qrcode-js-shared`，再构建依赖它的包。

## Rust 包说明

### qrcode-fast

- **类型**: `cdylib` + `rlib` (可生成 WASM)
- **依赖**: `qrcode-rust-shared`
- **特点**: 极致性能，比 kennytm/qrcode 快 37-75 倍

### qrcode-rust

- **类型**: `rlib`
- **依赖**: `qrcode-rust-shared`
- **特点**: 功能完整，比 kennytm/qrcode 快 8-10 倍

### qrcode-wasm

- **构建**: `wasm-pack build --target web`
- **输出**: `pkg/qrcodes_bg.wasm`, `pkg/qrcodes.js`
- **注意**: 构建后需要运行 `scripts/fix-pkg.js` 修复 `pkg/package.json`

## CI/CD

CI 配置在 `.github/workflows/ci.yml`，包含：

1. **test-ts** - TypeScript 测试 (Node 20/22, Ubuntu/Windows/macOS)
2. **test-browser** - 浏览器测试 (Ubuntu + Chrome)
3. **test-rust** - Rust 测试 (stable/beta, 全平台)
4. **test-wasm-build** - WASM 构建测试
5. **type-check** - TypeScript 类型检查
6. **security** - 安全审计
7. **lint** - Lint 检查
8. **build** - 构建验证

### CI 注意事项

- 使用 `pnpm install --frozen-lockfile` 确保依赖一致性
- 如果修改了 `package.json` 中的依赖，**必须**在本地运行 `pnpm install` 更新 `pnpm-lock.yaml` 并提交
- pnpm 版本由 `package.json` 的 `packageManager` 字段指定
- **不要**在 CI workflow 中设置 `pnpm/action-setup` 的 `version` 参数，否则会产生版本冲突错误：
  ```
  Error: Multiple versions of pnpm specified
  ```

## 常见问题

### 1. pnpm-lock.yaml 不匹配

**错误**: `ERR_PNPM_OUTDATED_LOCKFILE`

**原因**: `package.json` 修改后未更新 lockfile

**解决**:
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: update pnpm-lock.yaml"
```

### 2. WASM 构建失败

**确保已安装**:
```bash
rustup target add wasm32-unknown-unknown
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

**构建命令**:
```bash
pnpm --filter @veaba/qrcode-wasm build
```

### 3. 浏览器测试失败

**需要 Chrome/Chromium**:
```bash
# 安装 Playwright 浏览器
pnpx playwright install chromium

# CI 环境需要安装系统依赖
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 ...
```

### 4. Rust 依赖冲突

**注意**: `qrcode-fast` 和 `qrcode-rust` 都依赖 `qrcode-rust-shared`，版本必须一致。

修改版本时需要同步更新：
- `packages/qrcode-fast/Cargo.toml`
- `packages/qrcode-rust/Cargo.toml`
- `packages/qrcode-rust-shared/Cargo.toml`
- `packages/qrcode-wasm/Cargo.toml`

## 发布流程

使用 Changesets 管理所有版本（npm + crates）：

```bash
# 添加变更说明
pnpm changeset:add

# 检查变更状态
pnpm changeset:status

# 更新版本号（changesets 自动决定 npm 和 crates 的版本）
pnpm changeset:version

# 发布到 npm 和 crates.io（Release CI 自动处理）
pnpm changeset:publish
```

### Release CI 说明

Release workflow (`.github/workflows/release.yml`) 会：

1. 构建所有包
2. 读取 package.json 中的版本号（由 changesets 生成）
3. **检查 crates.io**：如果同版本已存在，跳过发布
4. 发布到 npm（通过 changesets/action）

**核心逻辑**：

```yaml
# 检查 crates.io 是否已有同版本
if cargo search qrcode-rust-shared --limit 1 | grep -q "= \"0.1.3\""; then
  echo "✅ v0.1.3 already exists, skipping"
else
  cargo publish -p qrcode-rust-shared  # 发布新版本
fi
```

### 版本管理

| 改动类型 | changesets 版本 | npm 发布 | crates 发布 |
|---------|----------------|---------|-------------|
| JS 代码改动 | 0.1.3 → 0.1.4 | ✅ 0.1.4 | ⚠️ 检测到 0.1.3 已存在 → 跳过 |
| Rust 代码改动 | 0.1.3 → 0.1.4 | ✅ 0.1.4 | ✅ 0.1.4（新） |
| 仅文档改动 | 0.1.3 → 0.1.4 | ✅ 0.1.4 | ⚠️ 检测到 0.1.3 已存在 → 跳过 |

> changesets 统一管理版本号，crates.io 发布时检测重复版本并跳过。

## 代码风格

### TypeScript

- 使用 ES Module (`"type": "module"`)
- 严格模式，完整类型定义
- 目标：ES2020+

### Rust

- Edition 2021
- 严格 lint: `-D warnings`
- 格式化：`cargo fmt`
- 检查：`cargo clippy`

## 性能基准测试

```bash
# 运行所有基准测试
pnpm run benchmark

# 后端测试
pnpm run benchmark:backend
pnpm run benchmark:node
pnpm run benchmark:bun
pnpm run benchmark:rust

# SVG 生成测试
pnpm run bench:svg:quick
pnpm run bench:svg:rust:quick
```

## 文档

```bash
# 开发模式
pnpm run docs:dev

# 构建
pnpm run docs:build

# 预览
pnpm run docs:preview
```

文档配置：`rspress.config.ts`
文档目录：`docs/`
