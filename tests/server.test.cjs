const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

test('preview serves the app but rejects encoded traversal and private files', { timeout: 10000 }, async t => {
  const child = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => child.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/localhost:(\d+)/);
      if (match) resolve(Number(match[1]));
    });
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Preview exited before readiness: ${code}`)));
  });
  function request(url, method = 'GET') {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: url, method }, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', reject); req.end();
    });
  }
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(home.body, /R1 Stream/);
  assert.match(home.headers['content-type'], /text\/html/);
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  assert.equal((await request('/js/core.js')).status, 200);
  assert.equal((await request('/assets/icon.svg')).status, 200);
  const head = await request('/admin.html', 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.body, '');
  for (const file of ['/README.md', '/package.json', '/tests/core.test.cjs', '/.git/config',
    '/assets/..%2fREADME.md', '/js/..%2fscripts/serve.mjs', '/assets/%2e%2e%2fpackage.json',
    '/assets/..%2f..%2fREADME.md', '/js/%ZZ', '/assets/missing.webp']) {
    assert.equal((await request(file)).status, 404, file);
  }
  assert.equal((await request('/', 'POST')).status, 405);
});
