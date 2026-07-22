/**
 * Re-emit the UMD bundles under the filenames 2.x published.
 *
 * 2.2.0 shipped dest/countdown.js, dest/countdown.min.js and their jQuery
 * counterparts. 3.0 builds to dist/ and uses .cjs so Node reads the CommonJS
 * bundle correctly under "type": "module" — which would 404 every unpkg /
 * jsDelivr URL and <script src> written against 2.x.
 *
 * So: copy the UMD bundles to dist/*.js for the new layout, to dest/* for the
 * old one, and make .cjs twins of the minified builds. The exports map points
 * the legacy paths at those twins, so Node deep-requires resolve as CommonJS
 * instead of being parsed as ESM. Browsers just fetch the files.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const dest = resolve(root, 'dest');
mkdirSync(dest, { recursive: true });

const copy = (from, to) => {
  const src = resolve(dist, from);
  if (!existsSync(src)) {
    throw new Error(`alias-dist: dist/${from} is missing — did the UMD build run?`);
  }
  copyFileSync(src, resolve(root, to));
  console.log(`aliased dist/${from} -> ${to}`);
};

for (const base of ['countdown', 'jquery.countdown']) {
  copy(`${base}.cjs`, `dist/${base}.js`);
  copy(`${base}.min.js`, `dist/${base}.min.cjs`);
  // the 2.x layout
  copy(`${base}.cjs`, `dest/${base}.js`);
  copy(`${base}.min.js`, `dest/${base}.min.js`);
}
