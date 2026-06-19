/**
 * Обновляет deploy-stamp.mjs — метка времени последнего коммита/пуша для оверлея на страницах.
 * Вызывается pre-commit hook (githooks) или вручную: npm run stamp
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {Date} [date] */
export function formatDeployStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

const stamp = formatDeployStamp();
const outPath = join(root, 'deploy-stamp.mjs');
const body =
  '/** Авто-генерация: `npm run stamp` или pre-commit hook. Не править вручную. */\n' +
  `export const DEPLOY_STAMP = '${stamp}';\n`;

writeFileSync(outPath, body, 'utf8');
console.log(`deploy-stamp: ${stamp}`);
