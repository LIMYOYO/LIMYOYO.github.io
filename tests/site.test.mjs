// Checks on the built site. Build first (see README), then: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readPage, allHtml, internalLinks, resolveUrl, count, ROOT } from './lib/site.mjs';

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

const newsEntries = () => count(readFileSync(join(ROOT, '_data/news.yml'), 'utf8'), /^- date:/gm);

test('home shows 4 newest news', () => {
  const html = readPage('/');
  assert.equal(count(html, /data-news-item/g), 4);
  const first = html.slice(html.indexOf('data-news-item'));
  assert.match(first.slice(0, first.indexOf('</li>')), /Transportation Science/);
});

test('news page shows all', () => {
  const html = readPage('/news/');
  assert.equal(newsEntries(), 6);
  assert.equal(count(html, /data-news-item/g), newsEntries());
});

test('news markdown renders', () => {
  assert.match(readPage('/news/'), /<strong>Major Revision<\/strong>/);
});

test('home links all papers', () => {
  assert.equal(count(readPage('/'), /data-paper/g), 5);
});

test('home sections in order', () => {
  const html = readPage('/');
  const at = ['hero', 'research', 'papers', 'news', 'about'].map((id) => html.indexOf(`id="${id}"`));
  for (const i of at) assert.ok(i > -1, `section missing: ${at}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at);
});

test('all internal links resolve', () => {
  for (const { path, html } of allHtml()) {
    for (const u of internalLinks(html)) assert.notEqual(resolveUrl(u), null, `${u} in ${path}`);
  }
});

const H1 = 'When machines do the work, who becomes the bottleneck?';
const STANDFIRST = 'I study how AI and robots change the work people still do — and when the person who checks, repairs, and steps in becomes the constraint.';

test('hero copy fixed', () => {
  const html = readPage('/');
  const hero = html.slice(html.indexOf('id="hero"'), html.indexOf('id="research"'));
  assert.match(hero, new RegExp(`<h1[^>]*>\\s*${H1.replace(/[?]/g, '\\?')}\\s*</h1>`));
  assert.ok(hero.includes(STANDFIRST), 'standfirst missing');
  assert.ok(hero.includes('An illustration, not a result.'), 'note missing');
});

test('hero has fallback and labels', () => {
  const html = readPage('/');
  assert.match(html, /<noscript>[\s\S]*?<svg[\s\S]*?<\/noscript>/);
  assert.match(html, /<label for="robots">Robots per person<\/label>/);
  assert.match(html, /<input[^>]*type="range"[^>]*id="robots"[^>]*min="1"[^>]*max="12"[^>]*value="6"/);
  assert.match(html, /<legend>When help is needed<\/legend>/);
  assert.match(html, /name="timing"[^>]*value="scattered"/);
  assert.match(html, /name="timing"[^>]*value="bursts"/);
  assert.match(html, /data-readout[^>]*aria-live="polite"|aria-live="polite"[^>]*data-readout/);
  assert.match(html, /<script type="module" src="\/assets\/js\/bottleneck\.js"><\/script>/);
});

test('no results or names leak', () => {
  const home = readPage('/');
  const hero = home.slice(home.indexOf('id="hero"'), home.indexOf('id="research"'));
  const scripts = ['bottleneck.js', 'bottleneck-sim.mjs'].map((f) => readFileSync(join(ROOT, 'assets/js', f), 'utf8')).join('\n');
  for (const text of [hero, scripts]) {
    assert.doesNotMatch(text, /quadrant|replacement ratio|substitution|we find|our results|\bMing\b/i);
  }
});

test('hidden attribute always hides', () => {
  const css = readFileSync(join(ROOT, 'assets/css/site.css'), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
});

test('hero controls opt out of form restoration', () => {
  const html = readPage('/');
  assert.match(html, /<input[^>]*id="robots"[^>]*autocomplete="off"/);
  assert.equal(count(html, /name="timing"[^>]*autocomplete="off"/g), 2);
});

test('advisor named and linked only in the about section', () => {
  const home = readPage('/');
  const about = home.slice(home.indexOf('id="about"'));
  assert.match(about, /advised by <a href="https:\/\/ming\.hu">Ming Hu<\/a>/);
});

test('teaching entry links the SJTU course story', () => {
  assert.match(readPage('/teaching/2024-production-simulation'), /href="https:\/\/news\.sjtu\.edu\.cn\/ztzl_aijyzl\/20260508\/222473\.html"/);
});

test('build output has no leftovers', () => {
  for (const p of ['talkmap', 'markdown_generator', 'scripts', 'sitemap/index.html', 'year-archive', 'CONTRIBUTING.md', 'docker-compose.yaml', 'Dockerfile', 'docs', 'tests', 'tools', 'package.json', 'assets/fonts', 'assets/webfonts', 'images/themes']) {
    assert.equal(resolveUrl('/' + p), null, `leftover in _site: ${p}`);
    assert.ok(!existsSync(join(ROOT, '_site', p)), `leftover in _site: ${p}`);
  }
});
