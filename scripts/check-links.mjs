// 检查构建产物中 JSON 链接是否真的渲染为 <a> 标签。
// rspress 对表格单元格内的 Markdown 链接处理方式需要实测确认。

import { readFileSync, existsSync } from 'node:fs';

const pages = process.argv.slice(2);
if (pages.length === 0) {
  console.error('用法: node check-links.mjs <html...>');
  process.exit(1);
}

const RE = /<a[^>]*href="([^"]*\.json)"[^>]*>([\s\S]*?)<\/a>/g;

for (const page of pages) {
  if (!existsSync(page)) {
    console.log(`  ${page}: 文件不存在`);
    continue;
  }
  const html = readFileSync(page, 'utf8');
  const found = [];
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(html)) !== null) {
    found.push(`${m[2].replace(/<[^>]+>/g, '').trim()} -> ${m[1]}`);
  }
  console.log(`  ${page}: ${found.length} 个 JSON 链接`);
  for (const f of found.slice(0, 8)) console.log(`      ${f}`);
}
