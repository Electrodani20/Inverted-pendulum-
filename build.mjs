import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('.', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const [html, css, physics, motion, app] = await Promise.all(['index.html', 'style.css', 'physics.js', 'motion.js', 'app.js'].map(read));
// A portable, offline-capable version with no module imports or external fonts.
// Font URLs contain semicolons; remove complete import lines without corrupting :root.
const styles = css.replace(/^@import[^\r\n]*(?:\r?\n|$)/gm, '');
const script = physics.replace(/export /g, '') + '\n' + motion.replace(/export /g, '') + '\n' + app.replace(/^import[^\n]*\n/gm, '');
const bundled = html.replace('<link rel="stylesheet" href="/style.css">', `<style>${styles}</style>`)
  .replace('<script type="module" src="/app.js"></script>', `<script type="module">${script}</script>`)
  .replace('href="/" aria-label="Control Lab home"', 'href="#" aria-label="Control Lab home"');
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/inverted-pendulum.html', root), bundled);
await writeFile(new URL('dist/index.html', root), bundled);
await writeFile(new URL('dist/.nojekyll', root), '');
await writeFile(new URL('Inverted-Pendulum.html', root), bundled);
console.log('Built Inverted-Pendulum.html and dist/inverted-pendulum.html — open directly in any modern browser.');
