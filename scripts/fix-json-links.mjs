#!/usr/bin/env node
/**
 * 把 docs/ 中对基准数据 JSON 的「站内绝对链接」改为 GitHub 外链。
 *
 * ## 为什么必须用外链
 *
 * 实测（保留实验记录于 GOVERNANCE.md）：
 *
 *   写法                                构建后 href                      结果
 *   ──────────────────────────────────────────────────────────────────────
 *   [x](/benchmark_speedup_verified.json)  /benchmark_speedup_verified.json.html  404
 *   [x](/benchmark_speedup_verified.json/) /benchmark_speedup_verified.json/index.html 404
 *   <a href="/benchmark_speedup_verified.json">x</a>   （标签被剥离，链接消失）
 *   [x](https://github.com/.../blob/...)   原样保留                          ✅ 200
 *
 * rspress 把站内绝对路径当作页面路由处理，非 .html 后缀一律补 .html，
 * 而 docs/public/ 下的 JSON 是静态资源、不是页面，于是必然 404。
 *
 * ## 用法
 *
 *   node scripts/fix-json-links.mjs          # 预览
 *   node scripts/fix-json-links.mjs --write  # 实际写入
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const REPO = 'https://github.com/veaba/qrcodes/blob/main/docs/public';

const WRITE = process.argv.includes('--write');

/** docs/public/ 下实际存在的数据文件 */
const DATA_FILES = readdirSync(join(DOCS, 'public')).filter((f) => f.endsWith('.json'));

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'doc_build') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.mdx?$/.test(e)) out.push(p);
  }
  return out;
}

let totalChanged = 0;
const perFile = [];

for (const file of walk(DOCS)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  let content = readFileSync(file, 'utf8');
  const before = content;

  for (const name of DATA_FILES) {
    // 1. Markdown 链接：[文本](/name.json)  -> [文本](github url)
    //    文本可含反引号，故用非贪婪匹配到 ]
    content = content.replace(
      new RegExp(`\\[([^\\]]*)\\]\\(/${name.replace(/\./g, '\\.')}\\)`, 'g'),
      (_, text) => `[${text}](${REPO}/${name})`
    );

    // 2. 裸站内路径：`/name.json` 或 (/name.json) 之类
    content = content.replace(
      new RegExp(`\`/${name.replace(/\./g, '\\.')}\``, 'g'),
      `[\`${name}\`](${REPO}/${name})`
    );
  }

  if (content !== before) {
    const n = content.split('\n').reduce((acc, line, i) => {
      const oldLine = before.split('\n')[i] ?? '';
      return acc + (line === oldLine ? 0 : 1);
    }, 0);
    totalChanged += n;
    perFile.push({ rel, n });
    if (WRITE) writeFileSync(file, content);
  }
}

console.log(`JSON 数据文件: ${DATA_FILES.length} 个`);
console.log(`仓库外链前缀: ${REPO}/`);
console.log('─'.repeat(60));
if (perFile.length === 0) {
  console.log('✅ 无需修改（未发现站内绝对形式的 JSON 链接）');
} else {
  for (const { rel, n } of perFile) console.log(`  ${rel}  (${n} 行)`);
  console.log('');
  console.log(WRITE ? `✅ 已写入 ${perFile.length} 个文件` : `⚠️  预览模式，未写入。加 --write 生效`);
  console.log(`   手写但写错的链接数: ${totalChanged}`);
}
