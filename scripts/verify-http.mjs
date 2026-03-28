/**
 * Проверка, что `npm run serve` отдаёт HTML и lib/music-theory.js с корректным MIME.
 * Запуск: в другом терминале уже должен работать `npm run serve` (порт из PORT или 4173).
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';

const checks = [
  { path: '/', needType: 'text/html' },
  { path: '/lib/music-theory.js', needType: 'application/javascript' },
  { path: '/app/circle-scales.html', needType: 'text/html' },
  { path: '/theory-tables.html', needType: 'text/html' },
];

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: HOST, port: PORT, path, method: 'GET' },
      (res) => {
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          buf += c;
        });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: buf }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

try {
  for (const c of checks) {
    const r = await get(c.path);
    if (r.status !== 200) {
      console.error(`FAIL ${c.path}: HTTP ${r.status}`);
      process.exit(1);
    }
    const ct = String(r.headers['content-type'] || '');
    if (!ct.includes(c.needType.split('/')[0])) {
      console.error(`FAIL ${c.path}: Content-Type=${ct}`);
      process.exit(1);
    }
    if (c.path.endsWith('.js') && !ct.includes('application/javascript')) {
      console.error(`FAIL ${c.path}: expected application/javascript, got ${ct}`);
      process.exit(1);
    }
    console.log(`OK ${c.path} → ${ct.trim()}`);
  }
  const base = `http://${HOST}:${PORT}`;
  console.log('');
  console.log('Ссылки (вставьте в браузер):');
  console.log(`  ${base}/`);
  console.log(`  ${base}/app/circle-scales.html`);
  console.log(`  ${base}/theory-tables.html`);
  console.log(`  ${base}/lib/music-theory.js`);
  console.log('');
  console.log('verify-http: OK');
} catch (e) {
  console.error('Сервер не отвечает. Запустите в каталоге music: npm run serve');
  console.error(e.message || e);
  process.exit(1);
}
