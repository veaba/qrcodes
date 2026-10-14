# 章程合规审计报告

> 审计对象：本仓库当前工作区（含未提交改动）
> 审计依据：[`GOVERNANCE.md`](https://github.com/veaba/qrcodes/blob/main/GOVERNANCE.md)
> 审计方法：自动化守卫 + git 视角人工核查

## 审计结论

| 类别 | 结果 |
|------|------|
| §3.1 三道门槛（fmt / clippy / test） | ✅ **全部通过** |
| §1.2 禁止入库内容 | ✅ **无违规** |
| §4.1 性能数字单一事实来源 | ✅ **一致** |
| §4.3 数据文件状态声明 | ✅ **已修复**（审计时 4/8 缺失） |
| §5.1 行尾统一 LF | ⏳ **待处理**：197 文件为 CRLF |
| §2 目录职责 / bin 声明 | ⏳ **待处理**：12 项未声明 |

**本次审计中已修复**：§4.3（4 个 JSON 补 `_status`）、章程 §2 目录表补 2 类目录、
章程新增 §3.4 审计方法条款、守卫新增规则 6（数据状态检查）。

**仍待处理**：§5.1 行尾归一化、§2 的 12 个未声明 bin。

---

## 一、通过项（已验证）

```
cargo fmt --all -- --check                      ✅ exit 0
cargo clippy --workspace --all-targets -D warnings  ✅ exit 0
cargo test --workspace --release                ✅ 25 + 3 + 11 passed
node scripts/check-repo-hygiene.js              ✅ exit 0
node scripts/check-perf-claims.js               ✅ 一致
```

§1.2 禁止内容（调试脚本 / 生成资产 / 探测程序 / 编辑器残留）
在「已跟踪 + 未跟踪未忽略」集合中扫描 —— **无违规**。

---

## 二、真实违规

### V1. 4/8 个数据文件缺 `_status`（§4.3）—— ✅ 已修复

| 文件 | 审计时 | 现状 |
|------|--------|------|
| `benchmark_speedup_verified.json` | ❌ 缺失 | ✅ `authoritative` |
| `benchmark_summary.json` | ❌ 缺失 | ✅ `index` |
| `benchmark_svg_rust.json` | ✅ secondary-source | — |
| `benchmark_svg_five_way.json` | —（后增） | ✅ `secondary-source` |

> `backend_benchmark_pk.json`、`backend_benchmark_pk_summary.json`、`benchmark_bun_result.json`、
> `benchmark_node_result.json` 四个文件已于 2026-03-20 删除（Node.js / Bun 对比同时变动
> 「运行时」与「实现」两个变量，无法归因；详见 `docs/bench/index.mdx`）。

权威文件缺 `_status` 尤其矛盾 —— 它是所有其他文件的判定依据，自己却没有声明状态。

**已做**：
1. 为 4 个文件补 `_status`（权威文件为 `authoritative`）
2. 守卫新增**规则 6** 检查此字段，并做负向测试确认会拦截
3. 章程 §4.3 补充合法取值：`authoritative` / `secondary-source` / `superseded` / `index`

---

### V2. 197 个文件仍为 CRLF（§5.1）

```
w/crlf   197
w/lf      41
w/none     3
```

`.gitattributes` 已创建，但**只对之后提交的文件生效**。
历史文件需要一次专门的 renormalize 提交。

**改进**（单独一次提交，不与功能改动混合）：

```bash
git add --renormalize .
git commit -m "chore: normalize line endings to LF"
```

⚠️ 注意：这会产生约 197 文件的 diff，应在**没有其他改动时**单独进行。

---

### V3. 12 个 bin 未在 Cargo.toml 声明（§2）

```
bench/rust-tools/src/bin/
  compare_matrix.rs      compare_matrix_v1.rs   compare_svgs.rs
  debug_format.rs        debug_map.rs           debug_map2.rs
  debug_matrix.rs        terminal_demo.rs
  test_qrcode_fast.rs    test_qrcode_rust.rs
  test_terminal_fast.rs  test_terminal_rust.rs
```

这些文件存在但不会被构建（`[[bin]]` 未声明）。
卫生守卫已将此项列为**告警**，但它们违反了 §2「文件必须有明确归属」。

**改进**：二选一
- 补声明（若要保留）
- 删除（若已废弃）

---

## 三、章程未覆盖的真实结构 —— ✅ 已补入章程 §2

这两项**不是违规**，而是**章程 §2 目录职责表不完整**：
文件本身合理，但章程没登记，导致守卫无法判断它们是否合法。

### G1. `packages/qrcode-wasm/scripts/`

含跟踪文件 `fix-pkg.js`（构建后修复 `pkg/package.json`）。

### G2. `packages/*/benches/`

`qrcode-fast` 与 `qrcode-rust` 有 `benches/`（Criterion 基准）。

**已做**：章程 §2 补充这两类目录，并明确「目录不对称是允许的」，
以及「新增目录必须同时登记进该表」。

---

## 四、建议清理（非违规）

### N1. `packages/qrcode-node/benchmark/` 空目录

无跟踪文件，内容数为 0。

### N2. `packages/qrcode-wasm/.omc/`

本地工具运行残留（`.omc/state/*.json`）。已被 `.gitignore` 覆盖，
但存在于工作区。

### N3. `packages/qrcode-js-shared/` 下 9 个临时脚本

```
compare.mjs  compare2-6.mjs  compare.cjs  test-hello.mjs  validate.mjs
时间戳：2026/5/28（早于本次审计会话，非本次产生）
```

按 §1.2 属于「调试脚本」，应清理。

---

## 五、审计方法的自我修正

审计过程中我先用 `Get-ChildItem` 直接扫描文件系统，产生了大量误报：

- `packages/qrcode-rust/target/**` 的 300+ SVG → **实际已被 `.gitignore` 忽略**
- `bench/kennytm-qrcode/**` 的 PNG/SVG → **实际是 git submodule**（上游 vendored 参考实现）

**正确方法**：审计集合 = `git ls-files` ∪ `git ls-files --others --exclude-standard`。
卫生守卫脚本已采用此方法，故无误报。

**这条经验已写进章程 §3.4**。

---

## 五·补、校验脚本的设计缺陷（已修正）

审计中还发现：**两个守卫脚本自身的设计是错的** —— 它们用「历史错误清单」
做拦截，而不是校验不变量。

### 缺陷 1：`check-perf-claims.js` 硬编码了作废清单

```js
// 修正前
const RETRACTED = [
  { pattern: /37\s*-\s*75\s*倍/, why: '...' },
  { pattern: /15\s*-\s*25\s*倍/, why: '...' },
  // ...每修一个错误就加一条
];
const ALLOWED_RANGES = new Set(['11-19', '6-9', '1.7-2.2', '6-19']);  // 与 JSON 重复
```

三个问题：
1. 每修一个新错误就要加一条规则，规则集无限增长
2. **拦不住没见过的新错误** —— 而那才是真正会发生的
3. 权威值在脚本和 JSON 里各存一份，必然漂移

**修正**：改为**白名单** —— 只从权威文件读允许值，脚本内零硬编码。
任何不在权威集合中的倍数都被拦下，包括尚未被发明出来的。

同时新增「出处标注」判定：明确写了来源文件或标注为勘误的行放行，
因为那不是口径漂移。

### 缺陷 2：`check-repo-hygiene.js` 硬编码了目录白名单

```js
// 修正前
const ALLOWED_SUBDIRS = {
  'bench/rust-tools/src': ['bin', 'lib'],   // 'lib' 根本不存在！
  tests: ['qrcode-shared', 'qrcode-node', ...],  // 目录清单的副本
};
```

问题：这是**文件系统清单的硬编码副本**，任何新增目录都要同步改脚本；
且它拦不住真正的问题（职责错位），只拦得住「新建目录」这个动作本身。

**修正**：移除目录白名单。目录合理性属于**代码评审**范畴，
无法用文件清单表达。

### 缺陷 3：规则过宽导致误报

修正过程中发现，`EDITOR_ARTIFACTS` 把 `.vscode/settings.json` 判为残留。
但该文件只含团队共享的拼写词典，**不含个人环境信息**，是合法约定。

**修正**：判据改为「是否含个人环境信息」，而非「是否来自编辑器」。
并在章程 §1.2 登记了合法例外。

### 记录这些缺陷的意义

这三个缺陷本身符合章程 §1.2.1 要防范的模式：
**用枚举历史代替校验不变量**。已把该原则写入章程：

> 写自动化校验时，禁止维护「曾经违规过的文件/数字」清单做拦截。
> 判据是**文件的类型与位置**，不是「过去是否有人犯过这个错」。

---

## 六、改进清单

| # | 项 | 对应条款 | 状态 |
|---|-----|---------|------|
| 1 | 补 4 个 JSON 的 `_status` | §4.3 | ✅ 已完成 |
| 2 | 章程 §2 补 `scripts/` 与 `benches/` | §2 | ✅ 已完成 |
| 3 | 章程补 §3.4「审计方法」 | §3 | ✅ 已完成 |
| 4 | 守卫新增规则 6（数据状态检查） | §4.3 | ✅ 已完成 |
| 5 | 单独提交 renormalize 行尾（197 文件） | §5.1 | ⏳ 待人工执行 |
| 6 | 处理 12 个未声明 bin | §2 | ⏳ 待决定保留或删除 |
| 7 | 清理 3 处残留（空目录 / .omc / 9 个脚本） | §1.2 | ⏳ 待人工执行 |

### 为何 5、6、7 需人工执行

- **#5 行尾归一化**：会产生约 197 文件的巨大 diff，必须**单独提交**、
  不与功能改动混合，时机由维护者决定。
- **#6 未声明 bin**：需要判断哪些仍有价值 —— 只有维护者知道。
  守卫已将其列为**告警**（不阻断），避免误删有用工具。
- **#7 残留清理**：`.omc/` 与 9 个脚本**不是本次会话产生的**，
  其归属需要维护者确认。

---

## 七、给章程的修订建议 —— ✅ 已采纳

基于本次审计发现的**方法缺陷**，已在章程中新增：

> **§3.4 审计方法：必须以 git 视角为准**
>
> 审计集合只能是 `git ls-files` ∪ `git ls-files --others --exclude-standard`。
> **不得**直接用文件系统遍历下结论 —— 那会把 `.gitignore` 覆盖的构建产物
> 与 git submodule 误判为违规。

该条款的触发原因（本报告第五节）已一并写入，保留可追溯性。
