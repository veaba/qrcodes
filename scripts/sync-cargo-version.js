#!/usr/bin/env node

/**
 * 同步 package.json 版本到 Cargo.toml
 * 用于 changeset version 后自动同步 Rust 包版本
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 需要同步的 Rust 包（package.json -> Cargo.toml）
const rustPackages = [
  'qrcode-rust',
  'qrcode-fast',
  'qrcode-rust-shared',
];

function syncVersion(pkgDir) {
  const pkgJsonPath = path.join(packagesDir, pkgDir, 'package.json');
  const cargoTomlPath = path.join(packagesDir, pkgDir, 'Cargo.toml');

  if (!fs.existsSync(pkgJsonPath) || !fs.existsSync(cargoTomlPath)) {
    return null;
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const cargoToml = fs.readFileSync(cargoTomlPath, 'utf-8');

  const newVersion = pkgJson.version;
  const versionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

  if (!versionMatch) {
    log(`  ⚠️  未找到 Cargo.toml 版本号: ${pkgDir}`, 'yellow');
    return null;
  }

  const oldVersion = versionMatch[1];

  // 更新 Cargo.toml 中的版本号
  let updatedCargoToml = cargoToml.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${newVersion}"`
  );

  // 同步 workspace 内 crate 的依赖版本声明。
  // 仅改自身 version 是不够的：`qrcode-rust-shared = { path = "...", version = "0.1.3" }`
  // 在 cargo 里等价于 `^0.1.3`，当 qrcode-rust-shared 自身升到 0.3.0 后约束无法满足，
  // 会让 `cargo metadata`（进而 wasm-pack / pnpm install 的 prepare 脚本）失败。
  const depVersions = [];
  updatedCargoToml = updatedCargoToml.replace(
    /^(\s*)([a-z0-9-]+)(\s*=\s*\{[^}]*?version\s*=\s*")([^"]+)(")/gm,
    (match, indent, depName, prefix, depVersion, suffix) => {
      // 只同步本 workspace 内的 rust crate，避免动第三方依赖的版本约束
      if (!rustPackages.includes(depName)) return match;
      if (depVersion === newVersion) return match;
      depVersions.push(`${depName}: ${depVersion} → ${newVersion}`);
      return `${indent}${depName}${prefix}${newVersion}${suffix}`;
    }
  );

  if (oldVersion === newVersion && depVersions.length === 0) {
    return { pkg: pkgDir, version: newVersion, changed: false };
  }

  fs.writeFileSync(cargoTomlPath, updatedCargoToml);

  return { pkg: pkgDir, oldVersion, newVersion, depVersions, changed: true };
}

function main() {
  log('\n🔄 同步 package.json 版本到 Cargo.toml', 'blue');
  log('─'.repeat(50), 'blue');

  let hasChanges = false;

  for (const pkg of rustPackages) {
    const result = syncVersion(pkg);

    if (!result) continue;

    if (result.changed) {
      log(`  ✅ ${pkg}: ${result.oldVersion} → ${result.newVersion}`, 'green');
      for (const dep of result.depVersions) {
        log(`     ↳ 依赖 ${dep}`, 'green');
      }
      hasChanges = true;
    } else {
      log(`  ℹ️  ${pkg}: ${result.version} (已是最新)`, 'yellow');
    }
  }

  if (hasChanges) {
    log('\n✅ 版本同步完成！', 'green');
  } else {
    log('\nℹ️  没有需要同步的版本变更', 'yellow');
  }
}

main();
