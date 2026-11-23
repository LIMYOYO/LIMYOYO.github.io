// Checks on the built site. Build first (see README), then: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPage, allHtml, ROOT } from './lib/site.mjs';

const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap';

const LEGACY = [
  '/',
  '/publications/',
  '/publication/2023-trb-ebike-staff-relocation',
  '/publication/2025-msom-crowdsourcing-rental',
  '/publication/2025-trb-user-collaborative-swapping',
  '/publication/2025-tits-ebike-user-relocation',
  '/publication/2026-ssrn-moving-lifelines',
  '/teaching/',
  '/teaching/2024-production-simulation',
  '/cv/',
  '/files/cv_zeyulin.pdf',
  '/404.html',
  '/sitemap.xml',
  '/feed.xml',
];
const REDIRECTS = ['/about/', '/about.html', '/resume'];

test('legacy URLs resolve', () => {
  for (const u of LEGACY) assert.notEqual(readPage(u), null, `missing ${u}`);
  for (const u of REDIRECTS) {
    const html = readPage(u);
    assert.notEqual(html, null, `missing redirect ${u}`);
    assert.match(html, /http-equiv="refresh"/, `${u} is not a redirect`);
  }
});

test('old template is gone', () => {
  for (const { path, html } of allHtml()) {
    assert.doesNotMatch(html, /author__avatar|masthead__menu|greedy-nav|academicons/, path);
  }
});

test('only allowed external resources', () => {
  for (const { path, html } of allHtml()) {
    for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
      assert.match(m[1], /^\/(?!\/)/, `external script ${m[1]} in ${path}`);
    }
    for (const m of html.matchAll(/<link[^>]*\shref="(https?:)?\/\/([^"]+)"/g)) {
      const href = `https://${m[2]}`.replaceAll('&amp;', '&');
      const preconnect = /rel="preconnect"/.test(m[0]) && /^https:\/\/fonts\.(googleapis|gstatic)\.com$/.test(href);
      assert.ok(href === FONTS || preconnect, `external link ${href} in ${path}`);
    }
  }
});

test('paper page shows status', () => {
  const html = readPage('/publication/2026-ssrn-moving-lifelines');
  assert.match(html, /Major Revision/);
  assert.match(html, /Management Science/);
  assert.match(html, /<h1[^>]*>[^<]*Moving Lifelines/);
});

test('dark tokens defined', () => {
  const css = readFileSync(join(ROOT, 'assets/css/site.css'), 'utf8');
  assert.match(css, /prefers-color-scheme:\s*dark/);
});
