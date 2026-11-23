// Checks on the built site. Build first (see README), then: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPage } from './lib/site.mjs';

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
