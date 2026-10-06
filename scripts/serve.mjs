// Small, dependency-free local preview server. Not an authentication backend.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 4173);
const publicFiles = new Set(['index.html', 'admin.html', 'styles.css', 'sw.js', 'manifest.webmanifest']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end('Method not allowed'); return; }
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const relative = pathname.replace(/^\/+/, '');
    // Serve only the public app, never test tooling or checkout metadata.
    if (relative.split('/').some(segment => segment === '.' || segment === '..')) throw new Error('Not public');
    const publicAsset = /^assets\/[a-zA-Z0-9_/-]+\.(?:svg|png|jpe?g|webp)$/.test(relative);
    const publicScript = /^js\/[a-zA-Z0-9_-]+\.js$/.test(relative);
    if (!(publicFiles.has(relative) || publicAsset || publicScript)) throw new Error('Not public');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) throw new Error('Not found');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found'); }
});
server.listen(port, '0.0.0.0', () => console.log(`R1 Stream is ready at http://localhost:${server.address().port}`));
