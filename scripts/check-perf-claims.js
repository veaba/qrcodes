#!/usr/bin/env node
/**
 * 性能倍数一致性校验
 *
 * ## 校验的不变量
 *
 * 文档中出现的任何「N 倍」性能宣称，其数值必须能在权威文件
 * （docs/public/benchmark_speedup_verified.json）的 headline 中找到出处。
 *
 * ## 为什么用白名单而不是黑名单
 *
 * 早期版本枚举了一批「曾经出现过的错误数字」做正则拦截。那种做法有三个问题：
 *   1. 每修一个新错误就要加一条规则，规则集无限增长
 *   2. 无法拦截「没见过的新错误」
 *   3. 权威值同时在脚本和 JSON 里各存一份，必然漂移
 *
 * 现在只从权威文件读取允许值，脚本本身不含任何硬编码数字。
 * 任何不在权威值集合中的倍数都会被拦下 —— 包括还没被发明出来的那些。
 *
 * ## 用法
 *
 *   node scripts/check-perf-claims.js
 *   node scripts/check-perf-claims.js --verbose
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const AUTHORITY = join(ROOT, 'docs', 'public', 'benchmark_speedup_verified.json');

const SKIP_DIRS = new Set([
  'node_modules', 'target', '.git', 'dist', 'pkg', '.next',
  'coverage', 'build', '.turbo', '.changeset',
  'doc_build', 'out', '.rspress', '.cache',
]);

const TEXT_EXT = new Set(['.md', '.mdx', '.rs', '.ts', '.js', '.mjs', '.yml', '.yaml']);

// ============================================================
// 权威值：唯一事实来源，全部从 JSON 读取
// ============================================================

/**
 * 从权威文件提取全部允许的倍数。
 *
 * headline 形如 { "qrcode_fast_vs_kennytm": "11-19x", ... }
 * 这里把 "11-19x" 展开为区间 {min:11, max:19}，并把端点也作为合法单值
 * （文档中可能只写「快 11 倍」）。
 */
function loadAuthority() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(AUTHORITY, 'utf8'));
  } catch (err) {
    throw new Error(`无法读取权威文件 ${relative(ROOT, AUTHORITY)}: ${err.message}`);
  }

  const headline = raw.headline ?? {};
  const ranges = [];
  const singles = new Set();

  // headline 中的 `_` 前缀键是元数据（如 _basis），不是倍率区间
  for (const [key, value] of Object.entries(headline)) {
    if (key.startsWith('_')) continue;
    const m = String(value).match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)x?$/i);
    if (!m) {
      // 允许单值形式，如 "12x"
      const s = String(value).match(/^(\d+(?:\.\d+)?)x?$/i);
      if (s) singles.add(parseFloat(s[1]));
      continue;
    }
    const min = parseFloat(m[1]);
    const max = parseFloat(m[2]);
    ranges.push({ key, min, max, label: String(value) });
    singles.add(min);
    singles.add(max);
  }

  /**
   * 已作废/被取代的区间。
   *
   * 背景：区间是**包含式**判定（9-19 允许 11），因此旧的窄区间
   * （如 11-19）在极值被拉宽后仍会被判定为合法 —— 这正是历史上
   * 24 处陈旧引用未被拦截的原因。
   *
   * 这里把 deprecated_claims 中形如「a-b 倍」的区间解析出来，
   * 若某行同时命中该区间且**未**标注勘误语境，则判为违规。
   */
  const deprecatedRanges = [];
  for (const entry of raw.deprecated_claims ?? []) {
    if (entry.status !== 'superseded' && entry.status !== 'retracted') continue;
    for (const m of String(entry.claim).matchAll(
      /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:倍|x)/gi,
    )) {
      deprecatedRanges.push({
        min: parseFloat(m[1]),
        max: parseFloat(m[2]),
        label: m[0],
        claim: entry.claim,
      });
    }
  }

  return { ranges, singles, headline, deprecatedRanges };
}

/**
 * 判断一个倍数值是否为权威允许值。
 * 区间内的任何值都允许（文档可能写 13 倍而非 11-19 倍）。
 */
function isAllowed(value, authority) {
  if (authority.singles.has(value)) return true;
  return authority.ranges.some((r) => value >= r.min && value <= r.max);
}

// ============================================================
// 扫描
// ============================================================

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(entry))) out.push(full);
  }
  return out;
}

/**
 * 提取一行中所有「N 倍 / N-M 倍」形式的性能宣称。
 *
 * 只匹配**紧邻**倍字的数字，避免误伤：
 *   - 缓存收益「提升 10-100 倍」→ 也会匹配，但通过语境过滤排除
 *   - 文件大小比「3.3-3.8 倍」→ 同上
 */
function extractClaims(line) {
  const claims = [];
  // 区间：11-19 倍 / 11 - 19x
  for (const m of line.matchAll(/(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)\s*(?:倍|x\b)/gi)) {
    claims.push({ type: 'range', min: parseFloat(m[1]), max: parseFloat(m[2]), text: m[0] });
  }
  // 单值：快 11 倍 / 11x faster
  for (const m of line.matchAll(/(\d+(?:\.\d+)?)\s*(?:倍|x\s*(?:faster|更快))/gi)) {
    const v = parseFloat(m[1]);
    // 区间已被上面的正则捕获时，跳过其端点
    if (claims.some((c) => c.text.includes(m[0].trim()))) continue;
    claims.push({ type: 'single', min: v, max: v, text: m[0] });
  }
  return claims;
}

/**
 * 该行是否在讨论「性能倍数」。
 *
 * 本仓库里还有若干与性能无关的倍率（缓存收益、文件大小、整数格式化），
 * 它们不受权威文件约束，必须排除，否则会产生大量误报。
 */
const PERF_CONTEXT = /kennytm|qrcode-fast|qrcode-rust|@veaba\/qrcode-(fast|rust)/i;
const PERF_WORD = /快|速度|提速|faster|speedup/i;

/**
 * 该行是否属于「非性能」语境（缓存/体积/格式化等）。
 * 这些行即使含倍数也应跳过。
 */
const NON_PERF_CONTEXT = /缓存|cache|体积|大小|KB|字节数|格式化|format!|to_string|SVG 大小/i;

/**
 * 该行是否**明确标注了出处或历史属性**。
 *
 * 这两种情况下的倍数不属于「口径漂移」，应当放行：
 *
 *   1. 引用其他数据源 —— 例如「（来源：benchmark_svg_rust.json）」
 *      只要标明了出处，读者就能判断该数字的适用范围。
 *   2. 勘误语境 —— 例如「此前文档中的 37-75 倍已撤回」
 *      这是历史说明，不是当前宣称。
 *
 * 反之，一个**没有任何出处标注**的倍数，若不在权威值集合里，
 * 就是真正的口径漂移 —— 那才是本脚本要拦的东西。
 */
const HAS_PROVENANCE =
  /来源|source|依据|见\s*`?docs\/public|benchmark_[a-z_]+\.json|_status|secondary-source/i;
const IS_ERRATUM =
  /作废|勘误|撤回|已废弃|不再|历史|旧值|旧数字|旧口径|此前|superseded|retracted|deprecated/i;

function main() {
  const verbose = process.argv.includes('--verbose');

  let authority;
  try {
    authority = loadAuthority();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  if (authority.ranges.length === 0) {
    console.error('❌ 权威文件未定义任何 headline 区间，无法校验');
    process.exit(1);
  }

  const files = walk(ROOT);
  const violations = [];
  let checkedLines = 0;
  let documentedLines = 0;

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');

    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      // 只检查性能语境
      if (!PERF_CONTEXT.test(line) || !PERF_WORD.test(line)) return;
      // 排除非性能倍率
      if (NON_PERF_CONTEXT.test(line)) return;

      const claims = extractClaims(line);
      if (claims.length === 0) return;
      checkedLines++;

      // 已标注出处或属勘误说明的行，其倍率不构成「口径漂移」
      const documented = HAS_PROVENANCE.test(line) || IS_ERRATUM.test(line);
      if (documented) {
        documentedLines++;
        return;
      }

      for (const c of claims) {
        const ok =
          isAllowed(c.min, authority) &&
          (c.type === 'single' || isAllowed(c.max, authority));
        if (!ok) {
          violations.push({
            file: rel,
            line: i + 1,
            text: line.trim(),
            claim: c.text,
            value: c.type === 'single' ? c.min : `${c.min}-${c.max}`,
          });
          continue;
        }

        // 虽是「区间内合法值」，但整段恰好等于某个已作废区间时，
        // 说明引用的是旧口径 —— 区间包含关系会漏掉这种情况，须单独拦。
        if (c.type !== 'single') {
          const dep = authority.deprecatedRanges.find(
            (d) => d.min === c.min && d.max === c.max,
          );
          if (dep) {
            violations.push({
              file: rel,
              line: i + 1,
              text: line.trim(),
              claim: c.text,
              value: `${c.min}-${c.max}`,
              deprecated: dep,
            });
          }
        }
      }
    });
  }

  // --- 输出 ---
  console.log('性能倍数一致性校验');
  console.log('═'.repeat(64));
  console.log('权威来源: docs/public/benchmark_speedup_verified.json');
  console.log('允许的倍数区间:');
  for (const r of authority.ranges) {
    console.log(`  ${r.label.padEnd(12)} (${r.key})`);
  }
  console.log(`已扫描文件: ${files.length}    含性能宣称的行: ${checkedLines}`);
  console.log(`其中已标注出处/勘误说明: ${documentedLines}（放行）`);
  if (verbose) files.forEach((f) => console.log(`  - ${relative(ROOT, f)}`));
  console.log('─'.repeat(64));

  if (violations.length === 0) {
    console.log('✅ 所有性能倍数均可在权威文件中找到出处');
    return 0;
  }

  console.error(`\n❌ ${violations.length} 处倍数与权威文件不符:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    声称: ${v.claim}  (值 ${v.value})`);
    if (v.deprecated) {
      console.error(`    原因: 该区间已被作废 —— ${v.deprecated.claim}`);
      console.error('          区间为包含式判定，旧窄区间会落在新宽区间内，故须显式拦截。');
    }
    console.error(`    原文: ${v.text.slice(0, 100)}`);
    console.error('');
  }
  console.error('请改为权威区间，或更新 docs/public/benchmark_speedup_verified.json。');
  return 1;
}

process.exit(main());
