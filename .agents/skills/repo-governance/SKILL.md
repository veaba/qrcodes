---
name: repo-governance
description: 本仓库的强制性章程与文件卫生约束。任何在本仓库新增、修改、删除文件之前必须遵守。适用于所有 AI 助手与人类贡献者。当需要创建文件、新建目录、写入调试脚本、生成资产、或准备提交代码时使用。
---

# 仓库章程（强制）

> 本 skill 是 [`GOVERNANCE.md`](../../../GOVERNANCE.md) 的 agent 入口。
> **完整条文以 GOVERNANCE.md 为准**；本文件是执行摘要与自检清单。

## 0. 首要原则

**仓库里只放"有归属、有职责、有验证"的东西。**

本仓库是**生产级**开源项目，已发布到 npm 与 crates.io，有真实用户。
历史上因缺乏约束造成过真实事故（详见 GOVERNANCE.md §0）。

---

## 1. 创建任何文件之前：三问

必须全部答得上来，否则**不要创建**：

1. **职责** —— 能否用一句话说清这个文件做什么？
2. **归属** —— 它属于哪个**既有**目录？
   **不允许为单个文件新建目录。**
3. **产物** —— 它应该被提交，还是应该被 `.gitignore`？

---

## 2. 明令禁止入库的内容

```
❌ 一次性调试脚本      compare.mjs / test1.mjs / tmp.rs / scratch.*
❌ 生成的资产          *.png / *.svg / cap-out/ / output/
❌ 探测型临时程序      probe_*.rs / diag_*.rs / dump_*.rs
❌ 编辑器/工具残留      .DS_Store / *.swp / *.orig / *.rej
❌ 临时输出目录        cap-out/ / tmp/ / out/
❌ 个人草稿            scratch.* / notes.* / 未完成的实验代码
```

### 诊断程序的处理规则（最容易违规的一条）

需要临时写程序排查问题时：

1. **允许**临时创建
2. **必须在同一次会话内删除**
3. 若该排查有长期价值 → 提升为 `bench/rust-tools/tests/` 下的**回归测试**
4. 若只是一次性排查 → 用完即删

**不允许只留诊断脚本而不留回归测试。**

---

## 3. 目录职责表（中心化边界）

| 目录 | 唯一职责 | 不得放入 |
|------|----------|----------|
| `packages/*/src/` | 可发布的库代码 | 测试、基准、脚本 |
| `packages/*/tests/` | 该包的单元测试 | 跨包集成测试 |
| `bench/rust-tools/src/bin/` | 长期复用的基准/校验工具 | 一次性探针 |
| `bench/rust-tools/tests/` | 跨实现集成与正确性回归 | 单元测试 |
| `bench/rust-tools/` 根 | 工具说明与跨语言脚本 | 生成的数据 |
| `docs/public/` | **权威基准数据** | 临时输出 |
| `scripts/` | 仓库级自动化（CI 调用） | 个人工具 |

**跨语言脚本归属**：服务于 Rust 工具链的 JS 脚本 → `bench/rust-tools/*.mjs`；
服务于仓库治理的 → `scripts/`。

---

## 4. 提交前三道门槛（必须本地通过）

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --release
```

**不允许"交给 CI 去发现"。** 提交过不通过 fmt/clippy 的代码是真实发生过的。

---

## 5. 正确性优先于性能

性能数字只有在**产物正确**的前提下才有意义。

- 涉及编码/布局的改动，**必须用独立解码器验证产物**
  （本仓库：`resvg` 渲染 + `rqrr` 解码，见 `bench/rust-tools/src/validation.rs`）
- **不得只检查"生成的图看起来像二维码"** —— 曾因此漏掉长期缺陷
  （两个 Rust 包长期产出无法解码的二维码，而性能数字仍显示正常）
- 校验器自身必须有反例测试（用错误内容验证必须失败），防止测试空转

新增正确性不变量 → 写进 `bench/rust-tools/tests/qr_validity.rs`。

---

## 6. 数据与数字：单一事实来源

- **唯一权威**：`docs/public/benchmark_speedup_verified.json`
- 所有文档中的倍数**必须**引用该文件，不得单独维护副本
- 修改数字后必须跑：`node scripts/check-perf-claims.js`
- 作废的数字**不得直接删除**，登记进权威文件的 `deprecated_claims`
- `docs/public/` 下数据文件必须声明 `_status`

---

## 7. 行尾：统一 LF

- `.gitattributes` 已强制 LF
- 新增的行不得为 CRLF（`scripts/check-repo-hygiene.js` 会检查）
- 若产生 CRLF 噪声，先修 `.gitattributes`，**不要逐个改文件**

---

## 8. AI 助手附加约束

1. **不得创建未声明的目录**
2. **不得留下调试产物** —— 会话结束前必须清理
3. **不得基于片段文本下结论**。声称"某处有问题"必须给出：
   - 文件路径 + 行号
   - 实际读取到的内容
   - 可复现的验证命令
4. **不得夸大结论** —— 严格区分"已确证"与"推测"
5. **不得绕过验证** —— 不允许用 `--no-verify`、`#[allow]` 掩盖问题；
   确需豁免时写明原因并经评审
6. **不得擅自执行 git 写操作**（commit / push / tag）—— 提交由人类决定

---

## 9. 自检命令

```bash
# 仓库卫生（禁止文件、未声明目录、CRLF、Cargo bin 对应）
pnpm run check:hygiene

# 性能数字口径一致
pnpm run check:perf-claims

# 两者一起
pnpm run check:all

# 能力范围（是否覆盖全部 40 版本）
pnpm run verify:capability

# 正确性回归
pnpm run verify:qr-validity
```

---

## 10. 提交前自检清单

```
[ ] 没有一次性脚本 / 生成资产 / 探测程序
[ ] 新增文件都有明确归属，未新建无谓目录
[ ] cargo fmt --all -- --check 通过
[ ] cargo clippy --workspace --all-targets -- -D warnings 通过
[ ] cargo test --workspace --release 通过
[ ] pnpm run check:all 通过
[ ] 涉及编码逻辑的改动已用独立解码器验证产物
[ ] 发现的 bug 已固化为回归测试
[ ] 性能数字与权威 JSON 一致
[ ] 行尾为 LF
```

---

## 违规处理

1. **未提交** → 立即清理
2. **已提交** → 单独提交一次清理（**不与功能改动混合**）
3. **已发布** → 登记为作废，并在 CHANGELOG 说明

完整条文与背景：[`GOVERNANCE.md`](../../../GOVERNANCE.md)
