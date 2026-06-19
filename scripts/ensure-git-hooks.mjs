/**
 * Один раз настраивает core.hooksPath → githooks/ (pre-commit обновляет deploy-stamp.mjs).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = join(root, 'githooks');

if (!existsSync(hooksDir)) {
  process.exit(0);
}

try {
  const current = execSync('git config --get core.hooksPath', { cwd: root, encoding: 'utf8' }).trim();
  if (current === 'githooks') {
    process.exit(0);
  }
} catch {
  /* not set */
}

execSync('git config core.hooksPath githooks', { cwd: root });
console.log('git: core.hooksPath → githooks (pre-commit обновляет deploy-stamp)');
