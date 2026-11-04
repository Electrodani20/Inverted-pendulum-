import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep) && !file.startsWith(root)) throw new Error('Invalid path');
    // Serve only public application assets.
    if (!['index.html', 'style.css', 'app.js', 'physics.js', 'motion.js'].includes(file.slice(root.length))) {
      res.writeHead(404).end('Not found'); return;
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Control Lab listening on port ${process.env.PORT || 3000}`));
