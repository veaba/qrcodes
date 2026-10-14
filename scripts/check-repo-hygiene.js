#!/usr/bin/env node
/**
 * 仓库卫生检查
 *
 * ## 校验的不变量（与历史无关的通用规则）
 *
 *   1. 不提交编辑器/系统残留文件
 *   2. 不提交生成产物（图片、临时输出目录）
 *   3. 不提交一次性调试脚本（命名即意图，见 §1）
 *   4. Cargo.toml 的 [[bin]] 与实际文件一一对应
 *   5. agent 文档的相对链接有效
 *   6. docs/public/ 下的数据文件声明 _status
 *
 * ## 设计原则：不做「历史错误黑名单」
 *
 * 早期版本维护了一份「曾经违规过的目录/文件名」清单做拦截。那种做法的问题：
 *   - 每遇到一次违规就要加一条规则，规则集无限增长
 *   - 规则会过期（目录消失、文件重命名）后变成死代码
 *   - 拦不住没见过的新违规
 *
 * 现在只校验**与历史无关的通用不变量**：文件该不该存在，取决于它的
 * 类型与位置，而不取决于「过去是否有人犯过这个错」。
 *
 * ## 关于目录结构
 *
 * 本脚本**不**维护「允许的目录清单」。目录是否合理属于代码评审范畴，
 * 无法用文件清单表达，硬编码只会变成维护负担（且必然滞后于现实）。
 *
 * ## 用法
 *
 *   node scripts/check-repo-hygiene.js
 *   node scripts/check-repo-hygiene.js --verbose
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const errors = [];
const warnings = [];

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================================
// 规则 1：编辑器 / 系统残留
//
// 注意：`.vscode/settings.json` 之类的**团队共享配置**不算残留。
// 判据是「是否含个人环境信息」，而非「是否来自编辑器」。
// 因此这里只匹配明确的临时/个人产物。
// ============================================================

const EDITOR_ARTIFACTS =
  /(^|\/)(\.DS_Store|Thumbs\.db|.*\.swp|.*\.swo|.*\.orig|.*\.rej|.*~)$/;

// ============================================================
// 规则 2：生成产物
// ============================================================

/** 图片：除非位于约定的静态资源目录 */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|ico)$/i;
const ASSET_DIRS = /\/(assets|icons|public)\//;

/** 临时输出目录：这些名字表达的是「临时」意图 */
const TEMP_DIR = /\/(cap-out|tmp|temp|scratch|output|out)\//;

// ============================================================
// 规则 3：一次性调试脚本
//
// 判据是「命名表达了临时意图」，而不是「历史上出现过同名文件」。
// 放在包根目录（而非 src/ 或 tests/）的这类文件即视为遗留物。
// ============================================================

const SCRATCH_NAME = /^(compare|test|tmp|temp|scratch|debug|dump|probe|check)\d*\.[cm]?[jt]s$/i;
const PACKAGE_ROOT_FILE = /^packages\/[^/]+\/[^/]+$/;
const BENCH_ROOT_FILE = /^bench\/[^/]+\/[^/]+$/;

/** Rust 一次性探测程序：放在 src/bin/ 但命名表达了临时意图 */
const SCRATCH_BIN = /^bench\/rust-tools\/src\/bin\/.*\.rs$/;
const SCRATCH_BIN_NAME = /^(probe|diag|dump|tmp|temp|scratch)_/;

// ============================================================
// 规则 4（已移除）：Cargo.toml 与实际 bin 一一对应
//
// 曾用正则比对 Cargo.toml 的 [[bin]] 与 src/bin/*.rs。经实测这是**冗余**的：
//
//   $ cargo test --workspace     # 声明了不存在的 bin 会直接编译失败
//   error: couldn't read src/bin/ghost_bin.rs: 系统找不到指定的文件
//
// 而 CI 的 test-rust job 正是跑 `cargo test --workspace`，
// 因此该错误一定会被构建系统拦下，无需本脚本重复检查。
//
// 教训：写校验前先确认「现有工具链是否已经覆盖」，避免重复造轮子。
// ============================================================

// ============================================================
// 规则 5：agent 文档的相对链接必须有效
//
// agent 文档常被 AI 作为唯一依据读取；断链会导致规则读不到。
// ============================================================

function checkAgentDocLinks() {
  const collect = (dir, out = []) => {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) collect(full, out);
      else if (entry.endsWith('.md')) out.push(full);
    }
    return out;
  };

  const files = collect(join(ROOT, '.agents'));
  const agentsMd = join(ROOT, 'AGENTS.md');
  if (existsSync(agentsMd)) files.push(agentsMd);

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const dir = join(file, '..');
    for (const m of content.matchAll(/\]\((\.[^)#]+?\.md)\)/g)) {
      if (!existsSync(join(dir, m[1]))) {
        errors.push({ file: rel, msg: `相对链接断链: ${m[1]}` });
      }
    }
  }
}

// ============================================================
// 规则 6：docs/public/ 数据文件必须声明 _status
// ============================================================

const VALID_STATUS = new Set([
  'authoritative',
  'secondary-source',
  'superseded',
  'index',
]);

function checkDataStatus(all) {
  const targets = all
    .map((p) => p.replace(/\\/g, '/'))
    .filter((p) => p.startsWith('docs/public/') && p.endsWith('.json'));

  for (const rel of targets) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    let json;
    try {
      json = JSON.parse(readFileSync(full, 'utf8'));
    } catch (e) {
      errors.push({ file: rel, msg: `JSON 解析失败: ${e.message}` });
      continue;
    }
    if (json._status === undefined) {
      errors.push({
        file: rel,
        msg: `缺少 _status 声明；允许取值: ${[...VALID_STATUS].join(' / ')}`,
      });
    } else if (!VALID_STATUS.has(json._status)) {
      errors.push({
        file: rel,
        msg: `_status 取值非法: "${json._status}"；允许: ${[...VALID_STATUS].join(' / ')}`,
      });
    }
  }
}

/**
 * 权威文件必须唯一。
 * 若出现多个 authoritative，读者无法判断以谁为准。
 */
function checkAuthorityUniqueness(all) {
  const auth = [];
  for (const p of all) {
    const rel = p.replace(/\\/g, '/');
    if (!rel.startsWith('docs/public/') || !rel.endsWith('.json')) continue;
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    try {
      if (JSON.parse(readFileSync(full, 'utf8'))._status === 'authoritative') {
        auth.push(rel);
      }
    } catch {
      /* 已在规则 6 报告 */
    }
  }
  if (auth.length > 1) {
    errors.push({
      file: 'docs/public/',
      msg: `存在 ${auth.length} 个 authoritative 文件（应唯一）: ${auth.join(', ')}`,
    });
  }
}

// ============================================================
// 主流程
// ============================================================

function main() {
  const verbose = process.argv.includes('--verbose');

  // 审计集合：必须有 git 视角，否则会误报 .gitignore 覆盖的产物与 submodule
  const all = [
    ...new Set([
      ...git('ls-files'),
      ...git('ls-files', '--others', '--exclude-standard'),
    ]),
  ].map((p) => p.replace(/\\/g, '/'));

  // --- 规则 1 ~ 3：文件级检查 ---
  for (const p of all) {
    if (EDITOR_ARTIFACTS.test(p)) {
      errors.push({ file: p, msg: '编辑器/系统残留文件不得入库' });
    }

    if (IMAGE_EXT.test(p) && !ASSET_DIRS.test(p)) {
      errors.push({
        file: p,
        msg: '生成的图片资产不得入库；静态资源请放 assets/ 或 public/',
      });
    }

    if (TEMP_DIR.test(p)) {
      errors.push({ file: p, msg: '临时输出目录不得入库' });
    }

    if (
      (PACKAGE_ROOT_FILE.test(p) || BENCH_ROOT_FILE.test(p)) &&
      SCRATCH_NAME.test(basename(p))
    ) {
      errors.push({
        file: p,
        msg: '调试脚本不得放在包/工具根目录；有长期价值的应移入 tests/，否则删除',
      });
    }

    if (SCRATCH_BIN.test(p) && SCRATCH_BIN_NAME.test(basename(p))) {
      errors.push({
        file: p,
        msg: '一次性探测程序应固化为 tests/ 下的回归测试后删除',
      });
    }
  }

  // --- 规则 5 ~ 6 ---
  checkAgentDocLinks();
  checkDataStatus(all);
  checkAuthorityUniqueness(all);

  // --- 输出 ---
  console.log('仓库卫生检查');
  console.log('═'.repeat(60));
  console.log(`已检查文件: ${all.length}`);
  if (verbose) all.forEach((f) => console.log(`  - ${f}`));
  console.log('─'.repeat(60));

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} 条提示（不阻断）:\n`);
    for (const w of warnings) {
      console.log(`  ${w.file}`);
      console.log(`    ${w.msg}\n`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} 条违规（必须修复）:\n`);
    for (const e of errors) {
      console.error(`  ${e.file}`);
      console.error(`    ${e.msg}\n`);
    }
    console.error('详见 GOVERNANCE.md。');
    return 1;
  }

  console.log('✅ 未发现违规内容');
  return 0;
}

process.exit(main());
