#!/usr/bin/env bun
/**
 * QRCode Terminal Demo
 * 演示如何在终端中直接显示二维码
 */

import { QRCode, QRErrorCorrectLevel } from '../../packages/qrcode-bun/src/index.ts';

console.log('\n=== QRCode Terminal Display Demo ===\n');

// 1. 基础终端输出
console.log('1. 基础终端二维码 (toTerminal):');
const qr1 = new QRCode('https://example.com', QRErrorCorrectLevel.M);
console.log(qr1.toTerminal());
console.log();

// 2. 反转颜色
console.log('2. 反转颜色 (invert=true):');
console.log(qr1.toTerminal(true));
console.log();

// 3. 自定义静区
console.log('3. 大静区 (quietZone=3):');
console.log(qr1.toTerminal(false, 3));
console.log();

// 4. 彩色终端输出
console.log('4. 彩色输出 (绿色前景):');
console.log(qr1.toTerminalColor('green'));
console.log();

console.log('5. 彩色输出 (蓝色前景，黄色背景):');
console.log(qr1.toTerminalColor('blue', 'yellow'));
console.log();

// 5. Braille 紧凑输出
console.log('6. Braille 紧凑输出:');
console.log(qr1.toTerminalBraille());
console.log();

// 6. 不同错误纠正级别对比
console.log('7. 错误纠正级别对比:');
const texts = ['Hello World', 'https://github.com/veaba/qrcodes'];
for (const text of texts) {
  const qr = new QRCode(text, QRErrorCorrectLevel.H);
  console.log(`\n文本："${text}"`);
  console.log(`模块数：${qr.moduleCount}x${qr.moduleCount}`);
  console.log(qr.toTerminal());
}


console.log('\n=== 使用场景 ===');
console.log('- 在 CI/CD 日志中显示二维码');
console.log('- 在 TUI 应用中直接渲染');
console.log('- 快速预览二维码内容');
console.log('- 无需图形界面即可分享二维码');
console.log();
