import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 8787);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    const pathname = url.pathname === '/' ? '/web/index.html' : decodeURIComponent(url.pathname);
    const target = normalize(join(root, pathname));

    if (!target.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const body = await readFile(target);
    response.writeHead(200, {
      'content-type': types[extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Balance Ding preview: http://127.0.0.1:${port}/web/index.html`);
});
