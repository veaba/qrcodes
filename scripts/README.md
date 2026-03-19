# 项目脚本

> **注意**: 基准测试脚本已迁移到 `bench/` 目录。请查看 `bench/README.md` 获取基准测试指南。

## 剩余脚本

本目录保留以下项目级脚本：

| 脚本 | 用途 |
|------|------|
| `test.js` | 跨平台测试运行器 |
| `publish-check.js` | 发布前检查 |
| `publish.js` | 批量发布脚本 |
| `sync-cargo-version.js` | 同步 package.json 版本到 Cargo.toml |

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
pnpm test              # 运行所有测试
pnpm test:unit         # 单元测试
pnpm test:browser      # 浏览器测试
```

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
