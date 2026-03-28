/**
 * Статика с корректным MIME для ES-модулей (в т.ч. если расширение .mjs).
 * Запуск из каталога music: npm run serve
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const rel = decoded.replace(/^\/+/, '');
  const abs = path.join(root, rel);
  if (!abs.startsWith(root)) return null;
  return abs;
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = req.url === '/' ? '/web/stranichki.html' : req.url;
    const abs = safeJoin(ROOT, urlPath);
    if (!abs) {
      res.writeHead(403).end();
      return;
    }
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] ?? 'application/octet-stream';
    const body = await fs.readFile(abs);
    res.writeHead(200, { 'Content-Type': type });
    res.end(body);
  } catch {
    res.writeHead(500).end();
  }
});

server.listen(PORT, () => {
  process.stdout.write(
    `music static: http://127.0.0.1:${PORT}/ (→ web/stranichki.html) | http://127.0.0.1:${PORT}/web/stranichki.html | http://127.0.0.1:${PORT}/theory-tables.html | http://127.0.0.1:${PORT}/web/index.html | http://127.0.0.1:${PORT}/app/note-tone-gen.html | http://127.0.0.1:${PORT}/app/template-synth.html | http://127.0.0.1:${PORT}/app/bayan-keyboard.html (root ${ROOT})\n`,
  );
});
