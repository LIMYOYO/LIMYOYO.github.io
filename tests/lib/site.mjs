// Helpers for checking the built Jekyll site in _site/.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITE = join(ROOT, '_site');

// Resolve a site URL (e.g. "/cv/", "/publication/x", "/files/a.pdf") to a built file path, or null.
export function resolveUrl(url) {
  const clean = decodeURIComponent(url.split('#')[0].split('?')[0]);
  const rel = clean.replace(/^\//, '');
  const candidates = clean.endsWith('/')
    ? [join(SITE, rel, 'index.html')]
    : [join(SITE, rel), join(SITE, rel + '.html'), join(SITE, rel, 'index.html')];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile()) ?? null;
}

export function readPage(url) {
  const path = resolveUrl(url);
  return path ? readFileSync(path, 'utf8') : null;
}

export function allHtml(dir = SITE) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...allHtml(p));
    else if (name.endsWith('.html')) out.push({ path: p, html: readFileSync(p, 'utf8') });
  }
  return out;
}

// Root-relative href/src values, without anchors or query strings. Skips protocol-relative URLs.
export function internalLinks(html) {
  const links = new Set();
  for (const m of html.matchAll(/\s(?:href|src)="(\/(?!\/)[^"]*)"/g)) {
    const u = m[1].split('#')[0].split('?')[0];
    if (u) links.add(u);
  }
  return [...links];
}

export function count(html, re) {
  return (html.match(re) || []).length;
}
