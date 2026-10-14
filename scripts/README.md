# 项目脚本

> **注意**: 基准测试脚本已迁移到 `bench/` 目录。请查看 `bench/README.md` 获取基准测试指南。

## 脚本清单

本目录存放**仓库级自动化**（可被 CI 调用），按用途分两类：

### 一致性校验（CI 强制执行）

| 脚本 | 用途 | 检查的不变量 |
|------|------|-------------|
| `check-perf-claims.js` | 性能倍数一致性 | 文档中的任何倍数必须能在权威文件找到出处 |
| `check-repo-hygiene.js` | 仓库卫生 | 无调试产物/生成资产；agent 文档链接有效；数据文件声明 `_status` |
| `check-rs-blocks.js` | RS 分块表校验 | JS 与 Rust 两份 `RS_BLOCK_TABLE` 各 160 项均符合 QR 标准 |

```bash
pnpm run check:all          # 前两者
node scripts/check-rs-blocks.js
```

### 流程工具

| 脚本 | 用途 |
|------|------|
| `test.js` | 跨平台测试运行器 |
| `clean.js` | 清理构建产物 |
| `publish-check.js` | 发布前检查 |
| `publish.js` | 批量发布脚本 |
| `sync-cargo-version.js` | 同步 package.json 版本到 Cargo.toml |

## 编写约定

新增本目录脚本时：

1. **路径按脚本自身位置解析**，不要依赖当前工作目录：
   ```js
   const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
   ```
2. **校验类脚本用 `check-` 前缀**
3. **只校验不变量**，不要维护「历史错误清单」或「允许的目录清单」（见 `GOVERNANCE.md` §1.2.1）
4. **写之前先确认现有工具链是否已覆盖**（见 `GOVERNANCE.md` §1.2.2）
5. 在本文件的清单中登记

## 版本同步脚本

`sync-cargo-version.js` 用于在 changeset 更新版本后，自动将 `package.json` 中的版本同步到对应的 `Cargo.toml` 文件。

### 已同步的包

| package.json | Cargo.toml |
|--------------|------------|
| `packages/qrcode-rust-shared/package.json` | `packages/qrcode-rust-shared/Cargo.toml` |
| `packages/qrcode-rust/package.json` | `packages/qrcode-rust/Cargo.toml` |
| `packages/qrcode-fast/package.json` | `packages/qrcode-fast/Cargo.toml` |

### 手动运行

```bash
pnpm run version:sync
```

## 快速参考

### 测试

```bash
pnpm test              # 运行所有测试（含 qrcode-bun 真实 Bun 套件）
pnpm test:unit         # 同上，test 的别名
pnpm test:browser      # 浏览器测试
pnpm test:shared       # 仅 qrcode-js-shared
pnpm test:js           # 仅 qrcode-js
pnpm test:node         # 仅 qrcode-node
pnpm test:wasm         # 仅 qrcode-wasm
pnpm test:bun          # 仅 qrcode-bun
```

> `pnpm test:ts` 已移除，请用 `pnpm test:bun`。传入 `--ts` 会报错并以退出码 2 中止。

### 版本管理

```bash
pnpm changeset:add      # 添加变更集
pnpm ci:version         # 升级版本 + 同步 Cargo.toml + 更新 lockfile
pnpm run version:sync   # 手动同步版本到 Cargo.toml
```

### 发布

```bash
pnpm run publish:check    # 发布前检查
pnpm run publish:dry-run  # 预览发布
pnpm run publish:all      # 发布所有 npm 包
```

### 基准测试（已迁移）

基准测试脚本现在位于 `bench/` 目录：

```bash
# 后端基准测试
pnpm run benchmark
node bench/scripts/run.js

# SVG 性能测试
pnpm bench:svg
node bench/svg-benchmark/index.js
```

查看 `bench/README.md` 获取完整的基准测试文档。
