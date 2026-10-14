/**
 * 校验 JS 与 Rust 两份 RS_BLOCK_TABLE（各 160 项）是否与 QR 标准一致。
 *
 * 判定准则：sum(count × dataCount) 必须等于该 (版本, 级别) 的标准数据码字数。
 * 这张表决定纠错分块方式，错了会导致对应版本的二维码无法解码。
 *
 * 用法：
 *   node scripts/check-rs-blocks.js
 *
 * 路径按脚本自身位置解析，可从任意目录运行。
 */

import fs from 'fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const JS_TABLE = join(ROOT, 'packages', 'qrcode-js-shared', 'src', 'index.ts');
const RUST_TABLE = join(ROOT, 'packages', 'qrcode-rust-shared', 'src', 'qr_rs_block.rs');

// ISO/IEC 18004 标准数据码字数，索引 [版本-1][级别]，级别序 L,M,Q,H
// 来源：Thonky QR Tutorial "Error Correction Code Words and Block Information"
const STD_DATA_CODEWORDS = [
  [19,16,13,9],[34,28,22,16],[55,44,34,26],[80,64,48,36],[108,86,62,46],
  [136,108,76,60],[156,124,88,66],[194,154,110,86],[232,182,132,100],[274,216,154,122],
  [324,254,180,140],[370,290,206,158],[428,334,244,180],[461,365,261,197],[523,415,295,223],
  [589,453,325,253],[647,507,367,283],[721,563,397,313],[795,627,445,341],[861,669,485,385],
  [932,714,512,406],[1006,782,568,442],[1094,860,614,464],[1174,914,664,514],[1276,1000,718,538],
  [1370,1062,754,596],[1468,1128,808,628],[1531,1193,871,661],[1631,1267,911,701],[1735,1373,985,745],
  [1843,1455,1033,793],[1955,1541,1115,845],[2071,1631,1171,901],[2191,1725,1231,961],[2306,1812,1286,986],
  [2434,1914,1354,1054],[2566,1992,1426,1096],[2702,2102,1502,1142],[2812,2216,1582,1222],[2956,2334,1666,1276],
];

const LEVEL_NAMES = ['L', 'M', 'Q', 'H'];

function parseJsTable() {
  const src = fs.readFileSync(JS_TABLE, 'utf8');
  // 注意：声明的类型注解 `: number[][]` 里也含方括号，
  // 必须从 `=` 之后的数组字面量开始匹配，否则会立刻闭合。
  const anchor = src.indexOf('export const RS_BLOCK_TABLE');
  if (anchor < 0) {
    throw new Error(`未找到 export const RS_BLOCK_TABLE（${JS_TABLE}）`);
  }
  const eq = src.indexOf('=', anchor);
  const from = src.indexOf('[', eq);
  if (eq < 0 || from < 0) {
    throw new Error(`RS_BLOCK_TABLE 声明的数组字面量缺失（${JS_TABLE}）`);
  }
  let depth = 0, i = from;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) break; }
  }
  const body = src.slice(from + 1, i);
  const rows = [];
  const re = /\[([^\][]+)\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const nums = m[1]
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (nums.length) rows.push(nums);
  }
  return rows;
}

function parseRustTable() {
  const src = fs.readFileSync(RUST_TABLE, 'utf8');
  const start = src.indexOf('const RS_BLOCK_TABLE');
  // 关键：indexOf 传 -1 作为起始位置会被当作 0，于是会从文件开头
  // 找到无关的 `=` 与 `[`，**碰巧**继续扫到真正的表格而「静默成功」。
  // 必须显式判定锚点缺失，否则表格被改名/移动后本检查形同虚设。
  if (start < 0) {
    throw new Error(`未找到 const RS_BLOCK_TABLE（${RUST_TABLE}）`);
  }
  const eq = src.indexOf('=', start);
  const from = src.indexOf('[', eq);
  if (eq < 0 || from < 0) {
    throw new Error(`RS_BLOCK_TABLE 声明的数组字面量缺失（${RUST_TABLE}）`);
  }
  let depth = 0, i = from;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) break; }
  }
  const body = src.slice(from + 1, i);
  const rows = [];
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    rows.push(m[1].split(',').map((s) => parseInt(s.trim(), 10)));
  }
  return rows;
}

function check(label, rows) {
  console.log(`\n=== ${label}: ${rows.length} 行 ===`);
  let bad = 0;
  // 行数不足 160 时，缺失的版本根本不会被下面的循环覆盖。
  // 这必须算作失败，否则「表被截断」会静默通过。
  if (rows.length !== 160) {
    console.log(`  ❌ 行数应为 160，实际 ${rows.length}`);
    bad += Math.abs(160 - rows.length);
  }
  for (let idx = 0; idx < Math.min(rows.length, 160); idx++) {
    const ver = Math.floor(idx / 4) + 1;
    const lvl = idx % 4;
    const row = rows[idx];
    if (row.length % 3 !== 0) {
      console.log(`  ❌ v${ver}-${LEVEL_NAMES[lvl]} (idx ${idx}): 元素数 ${row.length} 不是 3 的倍数 -> ${JSON.stringify(row)}`);
      bad++;
      continue;
    }
    let data = 0;
    for (let k = 0; k < row.length; k += 3) data += row[k] * row[k + 2];
    const expected = STD_DATA_CODEWORDS[ver - 1][lvl];
    if (data !== expected) {
      console.log(
        `  ❌ v${ver}-${LEVEL_NAMES[lvl]} (idx ${idx}): 数据码字 ${data}, 标准 ${expected} (差 ${expected - data}) -> ${JSON.stringify(row)}`
      );
      bad++;
    }
  }
  console.log(bad === 0 ? '  ✅ 全部 160 项与标准一致' : `  ❌ 共 ${bad} 项不一致`);
  return bad;
}

function main() {
  let jsBad;
  let rustBad;
  try {
    jsBad = check('JS RS_BLOCK_TABLE', parseJsTable());
    rustBad = check('Rust RS_BLOCK_TABLE', parseRustTable());
  } catch (e) {
    // 解析失败（例如表格被重命名或语法改动）必须显式失败，
    // 而不是抛栈后由 Node 以非预期方式退出。
    console.error(`\n❌ 无法解析 RS_BLOCK_TABLE: ${e.message}`);
    console.error('请确认两份表的声明位置与格式未被改动。');
    return 1;
  }

  console.log('\n══════════════════════════════════');
  console.log(`JS 不一致: ${jsBad}    Rust 不一致: ${rustBad}`);

  const total = jsBad + rustBad;
  if (total === 0) {
    console.log('✅ 两份 RS_BLOCK_TABLE 均与 QR 标准一致');
    return 0;
  }

  console.error(`\n❌ 共 ${total} 项与 QR 标准不一致（必须修复）:`);
  console.error('  该表决定纠错分块方式，错了会导致对应版本的二维码无法解码。');
  console.error('  详见 GOVERNANCE.md。');
  return 1;
}

process.exit(main());
