// 列出构建产物中所有指向 .json 的 href，用于确认 rspress 的路径改写行为。

import { readFileSync, existsSync } from 'node:fs';

const pages = process.argv.slice(2);
const RE = /href="([^"]*\.json[^"]*)"/g;

const all = new Set();
for (const page of pages) {
  if (!existsSync(page)) continue;
  const html = readFileSync(page, 'utf8');
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(html)) !== null) all.add(m[1]);
}

console.log('构建产物中的 JSON href:');
for (const h of [...all].sort()) console.log(`  ${h}`);
if (all.size === 0) console.log('  (无)');
