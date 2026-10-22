import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('.', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const [html, css, physics, app] = await Promise.all(['index.html', 'style.css', 'physics.js', 'app.js'].map(read));
// A portable, offline-capable version with no module imports or external fonts.
const styles = css.replace(/^@import[^;]+;\s*/, '');
const script = physics.replace(/export /g, '') + '\n' + app.replace(/^import[^;]+;\s*/, '');
const bundled = html.replace('<link rel="stylesheet" href="/style.css">', `<style>${styles}</style>`)
  .replace('<script type="module" src="/app.js"></script>', `<script type="module">${script}</script>`)
  .replace('href="/" aria-label="Control Lab home"', 'href="#" aria-label="Control Lab home"');
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/inverted-pendulum.html', root), bundled);
await writeFile(new URL('Inverted-Pendulum.html', root), bundled);
console.log('Built Inverted-Pendulum.html and dist/inverted-pendulum.html — open directly in any modern browser.');
