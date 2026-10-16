# 📦 发布流程

> 如何将 @veaba/qrcode 生态包发布到 npm 和 crates.io

**发布统一走 GitHub Actions（Release workflow）**，不在本地手工 `npm publish`。
本地只需要写变更集，其余由 CI 完成。

---

## 📋 目录

1. [发布通道总览](#发布通道总览)
2. [三种发布场景](#三种发布场景)
3. [标准发布流程](#标准发布流程)
4. [版本号如何流转](#版本号如何流转)
5. [手工发布（应急）](#手工发布应急)
6. [验证发布](#验证发布)
7. [常见问题](#常见问题)

---

## 发布通道总览

| 通道 | 包 | 版本号来源 | 发布者 |
|------|-----|-----------|--------|
| **npm** | `@veaba/qrcode-js`、`qrcode-node`、`qrcode-wasm`、`qrcode-bun` | `package.json` | `changesets/action` |
| **crates.io** | `qrcode-rust-shared`、`qrcode-rust`、`qrcode-fast` | `Cargo.toml` | `cargo publish` |

> `@veaba/qrcode-js-shared`、`@veaba/qrcode-rust`、`@veaba/qrcode-fast`、
> `@veaba/qrcode-rust-shared` 均为 `"private": true`，**不发布到 npm**。

**关键区别**：npm 版本只认 `package.json`，crate 版本只认 `Cargo.toml`。
两者唯一的桥梁是 `scripts/sync-cargo-version.js`。

---

## 三种发布场景

### 场景 1：npm + crate 一起发

**适用**：改动同时涉及 JS/TS 包和 Rust crate 源码。

```bash
# 1) 写变更集，勾选 JS 包 + 三个 rust 包
pnpm changeset:add
pnpm changeset:status

# 2) 提交并合并进 main
# 3) Actions → Release → Run workflow（branch = main）
```

CI 依次：构建 5 个包 → 发布 crate → `changeset version` 生成
"chore: version packages" PR。

### 场景 2：只发 npm

**适用**：只改 JS/TS，Rust 源码零改动。**这是最常见的情况。**

```bash
pnpm changeset:add      # 只勾 JS 包，不要勾 rust 包
pnpm changeset:status
# 合并 main → Actions → Release → Run workflow
```

crate 因为 `Cargo.toml` 版本未变，会被"版本已存在"检查跳过。

### 场景 3：只发 crate

**适用**：只改 Rust 源码，不动 JS 包。

Changesets 驱动不了纯 crate 发布（它只改 `package.json`），因此需要手工推进
`Cargo.toml` 版本：

```bash
# 1) 手工修改三个 Cargo.toml 的 version
#    注意：必须同时改「自身 version」和「qrcode-rust-shared 依赖行」！
#    见下方「版本号如何流转」的警告

# 2) 验证依赖可解析（这一步必须通过）
cargo metadata --format-version 1 > $null && echo "解析 OK"

# 3) 提交
git add packages/*/Cargo.toml Cargo.lock
git commit -m "chore(release): bump rust crates to X.Y.Z"

# 4) 合并 main → Actions → Release → Run workflow
```

> ⚠️ 下次跑 `ci:version` 时，`sync-cargo-version.js` 会以 `package.json`
> 为准覆盖 `Cargo.toml`。若 npm 版本低于你手工设置的 crate 版本，
> 该覆盖会把 crate 版本**拉回去**。纯 crate 发布后请留意这点。

---

## 标准发布流程

`changesets/action` 只看一件事：**仓库里还有没有未消费的 `.changeset/*.md`**。

```
有 changeset   → 走 version 分支：改版本号 + 删 changeset + 开/更新 PR（不发布）
没有 changeset → 走 publish 分支：真正发布                         （发布）
```

完整链路：

```
1. pnpm changeset:add              # 写变更说明（不改版本、不发布）
        ↓
2. 合并到 main
        ↓
3. Actions → Release → Run workflow
        ↓
   bot 开 "chore: version packages" PR
        ↓
4. 合并该 PR   ← ⚠️ 此步骤本身不会触发任何 workflow
        ↓
5. 再点一次 Release → changeset 已空 → 真正发布 npm + crates.io
```

> ⚠️ **第 4 步不会自动触发第 5 步。**
> `release.yml` 的触发器只有 `workflow_dispatch` 和 `issue_comment`，
> **没有 `push: branches: [main]`**。官方 changesets 模板包含该触发器，
> 合并 version PR 后会自动发布；本仓库缺失，因此**必须手动再点一次**。

### 触发方式

| 方式 | 操作 |
|------|------|
| 手动 | Actions → Release → Run workflow |
| 评论 | 在任意 issue / PR 下评论 `/release` |

---

## 版本号如何流转

```
.changeset/*.md
      ↓ changeset version
package.json                     ← npm 版本来源
      ↓ scripts/sync-cargo-version.js
      ↓ （仅对 qrcode-rust / qrcode-fast / qrcode-rust-shared）
Cargo.toml                       ← crate 版本来源
```

### 语义化版本规范

| 版本类型 | 说明 | 示例 |
|---------|------|------|
| major | 破坏性更新 | 1.0.0 → 2.0.0 |
| minor | 新功能，向后兼容 | 1.0.0 → 1.1.0 |
| patch | bug 修复 | 1.0.0 → 1.0.1 |

### ⚠️ 依赖行版本必须同步

`sync-cargo-version.js` 会同时更新两处：

```toml
[package]
version = "0.3.0"                    # ← ① 自身版本

[dependencies]
qrcode-rust-shared = { path = "../qrcode-rust-shared", version = "0.3.0" }   # ← ② 依赖约束
```

**只改 ① 会导致发布失败。** cargo 把 `version = "0.1.3"` 解读为 `^0.1.3`
（即 `>=0.1.3, <0.2.0`）。当 `qrcode-rust-shared` 自身升到 `0.2.0+` 时约束无法
满足，`cargo metadata` 报错：

```
error: failed to select a version for the requirement `qrcode-rust-shared = "^0.1.3"`
candidate versions found which didn't match: 0.3.0
required by package `qrcode-rust v0.3.0`
```

该错误会在 `pnpm install` 触发 `packages/qrcode-wasm` 的 `prepare` 脚本时爆发，
**报错前缀指向 `qrcode-wasm`，但真正的问题在 `qrcode-rust/Cargo.toml`**
（`qrcode-wasm` 并不依赖 `qrcode-rust-shared`，它只是恰好第一个调用
`cargo metadata`）。历史上因此排查困难，详见 git 记录 `4fda6a6`。

### 发布前自检

```bash
# 1) 同步版本
pnpm run version:sync

# 2) 验证依赖可解析
#    注意：不能加 --no-deps！该参数会跳过依赖解析，永远返回 0，抓不到此问题
cargo metadata --format-version 1 > $null && echo "cargo 解析 OK"
```

### crate 发布顺序

必须遵守依赖顺序，且 `qrcode-rust-shared` 生效后才轮到另外两个：

```
qrcode-rust-shared  →  sleep 30（等索引）  →  qrcode-rust  →  qrcode-fast
```

CI 会先查 crates.io API，**仅在版本已存在时跳过**；认证失败、依赖解析失败等
真实错误会让 job 失败，不再被静默吞掉。

---

## 手工发布（应急）

CI 不可用时（如 token 失效、网络故障）可在本地应急发布。

### 1. 发布 npm 包

```bash
# 注意：qrcode-js-shared 是私有包，不发布
# 按依赖顺序：js → node / bun / wasm

cd packages/qrcode-js
pnpm run build
npm pack --dry-run        # 先检查包内容
npm publish --access public

# wasm 需要先进 pkg 目录
cd packages/qrcode-wasm
pnpm run build
cd pkg && npm publish --access public
```

### 2. 发布 Rust crate

```bash
# 首次需登录
cargo login

# 按依赖顺序，每步之间等待 crates.io 索引更新
cargo publish -p qrcode-rust-shared
sleep 30
cargo publish -p qrcode-rust
cargo publish -p qrcode-fast
```

> 发布前务必先跑 `cargo metadata --format-version 1` 确认依赖可解析。
> crates.io 上的包名**不带** `@veaba` 前缀。

---

## 验证发布

⚠️ **CI 显示 success 不等于 crate 发布成功**。crates.io 的发布曾经因
`continue-on-error` 掩盖 403 认证失败而呈现"假绿"。**必须直接查 registry 确认。**

### 1. 查询 npm

```bash
npm view @veaba/qrcode-js version
npm view @veaba/qrcode-node version
npm view @veaba/qrcode-wasm version
npm view @veaba/qrcode-bun version

# 或走 registry API
curl -s https://registry.npmjs.org/@veaba%2Fqrcode-js | jq -r '."dist-tags".latest'
```

### 2. 查询 crates.io

```bash
for c in qrcode-rust-shared qrcode-rust qrcode-fast; do
  echo -n "$c = "
  curl -s "https://crates.io/api/v1/crates/$c" | jq -r .crate.max_version
done
```

> 注意：crates.io API **要求 User-Agent 头**，否则返回 403：
> `curl -s -A "veaba/qrcodes" https://crates.io/api/v1/crates/qrcode-rust`

### 3. 安装测试

```bash
mkdir test-install && cd test-install
npm init -y
npm install @veaba/qrcode-node
```

```javascript
// test.mjs
import { QRCode } from '@veaba/qrcode-node';
const qr = new QRCode('https://github.com/veaba/qrcodes');
console.log(qr.toSVG());
```

---

## 常见问题

### Q1: CI 显示成功，但 crate 没有新版

**原因**：旧版 `release.yml` 给三个 `cargo publish` step 加了
`continue-on-error: true` + `|| echo "May already exist"`，
把 403 认证失败、依赖解析失败等真实错误全部伪装成"版本已存在"。

**解决**：现已改为"先查 crates.io API，仅版本已存在时跳过"，其余错误会让
job 失败。若仍遇到，直接查 registry 确认实际版本。

### Q2: `failed to publish ... status 403 Forbidden: authentication failed`

**原因**：`CARGO_REGISTRY_TOKEN` secret 失效或过期。

**解决**：

```bash
# 到 https://crates.io/settings/tokens 生成新 token（需 publish-update 权限）
gh secret set CARGO_REGISTRY_TOKEN --repo veaba/qrcodes
```

### Q3: `failed to select a version for the requirement qrcode-rust-shared`

**原因**：`Cargo.toml` 的依赖行版本落后于 `qrcode-rust-shared` 自身版本，
或该版本**尚未成功发布到 crates.io**（如因 403 失败）。

**解决**：

```bash
pnpm run version:sync
cargo metadata --format-version 1 > $null && echo "解析 OK"
```
若 `qrcode-rust-shared` 目标版本确实还没发布成功，先单独修好它的发布。

### Q4: 合并 version PR 后没有自动发布

**原因**：`release.yml` 缺少 `push` 触发器。

**解决**：手动再点一次 Release（此时 changeset 已空，会走 publish 分支）。
如需自动化，给 workflow 加上 `on.push.branches: [main]`。

### Q5: 本地跑 `sync-cargo-version.js` 没反应

**原因**：`package.json` 与 `Cargo.toml` 版本已一致，脚本幂等，会打印
"已是最新"。

### Q6: WASM 包发布失败

**原因**：`pkg` 目录未正确生成。

**解决**：

```bash
cd packages/qrcode-wasm
pnpm run build
cat pkg/package.json      # 确认存在
```

### Q7: 2FA 验证失败（手工发布时）

```bash
npm publish --otp 123456
```

---

## 发布检查清单

```
[ ] 已添加变更集（pnpm changeset:add）
[ ] 变更集勾选的包与实际改动一致
[ ] 三道门槛本地通过：
      cargo fmt --all -- --check
      cargo clippy --workspace --all-targets -- -D warnings
      cargo test --workspace --release
[ ] 若涉及 crate：cargo metadata --format-version 1 通过（不加 --no-deps）
[ ] 若涉及 crate：依赖行版本已同步
[ ] 合并 main → 点 Release → 合并 version PR → 再点 Release
[ ] 发布后用 registry API 核实 npm 与 crates.io 实际版本
```

---

## 相关命令速查

```bash
# 变更集
pnpm changeset:add          # 添加变更集
pnpm changeset:status       # 查看状态
pnpm ci:version             # CI 用：changeset version + 同步 Cargo.toml + install
pnpm ci:publish             # CI 用：changeset publish
pnpm run version:sync       # 仅同步 package.json 版本到 Cargo.toml

# 本地验证
cargo metadata --format-version 1 > $null && echo OK   # 依赖解析（勿加 --no-deps）
npm pack --dry-run                                      # 检查包内容

# 查询线上版本
npm view @veaba/qrcode-js version
curl -s -A "veaba/qrcodes" https://crates.io/api/v1/crates/qrcode-rust | jq -r .crate.max_version

# 废弃 / 撤回
npm deprecate @veaba/qrcode-js@1.0.0 "message"
npm unpublish @veaba/qrcode-js@1.0.0     # 仅 24 小时内
cargo yank --version 0.1.0 -p qrcode-rust
```

---

## 联系支持

- 🐙 GitHub: <https://github.com/veaba/qrcodes/issues>
