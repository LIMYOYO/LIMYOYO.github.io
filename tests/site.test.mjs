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

test('home shows 3 newest news', () => {
  const html = readPage('/');
  assert.equal(count(html, /data-news-item/g), 3);
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
  assert.ok(hero.includes('An illustration of the mechanism, not a result.'), 'note missing');
});

test('hero has fallback and labels', () => {
  const html = readPage('/');
  const hero = html.slice(html.indexOf('id="hero"'), html.indexOf('id="research"'));
  assert.match(hero, /<svg class="sim"[^>]*>[\s\S]*class="robot is-working"[\s\S]*class="person"/, 'still frame is in the page without JS');
  assert.match(html, /<label for="robots">Robots per person<\/label>/);
  assert.match(html, /<input[^>]*type="range"[^>]*id="robots"[^>]*min="1"[^>]*max="12"[^>]*value="6"/);
  assert.match(html, /<legend>When help is needed<\/legend>/);
  assert.match(html, /name="timing"[^>]*value="scattered"/);
  assert.match(html, /name="timing"[^>]*value="bursts"/);
  assert.match(html, /<button[^>]*class="[^"]*sim__toggle[^"]*"[^>]*>Pause<\/button>/);
  assert.doesNotMatch(html, /sim__toggle[^>]*aria-pressed/);
  assert.match(html, /data-readout[^>]*aria-live="off"|aria-live="off"[^>]*data-readout/);
  assert.match(html, /class="sr-only"[^>]*aria-live="polite"[^>]*data-announce|data-announce[^>]*aria-live="polite"/);
  assert.match(html, /<script type="module" src="\/assets\/js\/bottleneck\.js"><\/script>/);
});

test('no results or names leak', () => {
  const home = readPage('/');
  const hero = home.slice(home.indexOf('id="hero"'), home.indexOf('id="research"'));
  const scripts = ['bottleneck.js', 'bottleneck-sim.mjs', 'bottleneck-figures.mjs'].map((f) => readFileSync(join(ROOT, 'assets/js', f), 'utf8')).join('\n');
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

test('hero fits one screen: robots in two rows of six', () => {
  const html = readPage('/');
  assert.match(html, /<svg class="sim"[^>]*viewBox="0 0 792 330"/);
});

test('the included still frame matches the drawing code', async () => {
  const { snapshotSvg } = await import('../assets/js/bottleneck-figures.mjs');
  assert.equal(readFileSync(join(ROOT, '_includes/hero-snapshot.svg'), 'utf8').trim(), snapshotSvg().trim());
});

test('three font weights at most in light mode', () => {
  const css = readFileSync(join(ROOT, 'assets/css/site.css'), 'utf8').replace(/@media \(prefers-color-scheme: dark\)[\s\S]*?\n\}\n/, '');
  const weights = new Set([...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]));
  for (const m of css.matchAll(/font:\s*(\d{3})\s/g)) weights.add(m[1]);
  assert.ok(weights.size <= 3, [...weights].join(','));
});

test('public papers link out from the lists; unpublished ones do not', () => {
  const out = {
    '2026-ssrn-moving-lifelines': 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7119321',
    '2023-trb-ebike-staff-relocation': 'https://doi.org/10.1016/j.trb.2023.102820',
    '2025-tits-ebike-user-relocation': 'https://doi.org/10.1109/TITS.2025.3564359',
  };
  const none = ['2025-trb-user-collaborative-swapping', '2025-msom-crowdsourcing-rental'];
  for (const url of ['/', '/publications/']) {
    const html = readPage(url).replaceAll('&amp;', '&');
    const rowOf = (slug) => {
      const at = html.indexOf(`data-paper href="/publication/${slug}"`);
      assert.ok(at > -1, `${slug} missing on ${url}`);
      return html.slice(html.lastIndexOf('<li', at), html.indexOf('</li>', at));
    };
    for (const [slug, href] of Object.entries(out)) assert.ok(rowOf(slug).includes(`href="${href}"`), `${slug} has no outbound link on ${url}`);
    for (const slug of none) assert.doesNotMatch(rowOf(slug), /href="https?:/, `${slug} links out on ${url}`);
  }
});

test('CV page shows the PDF inline and offers a download', () => {
  const html = readPage('/cv/');
  assert.match(html, /<object[^>]*data="\/files\/cv_zeyulin\.pdf[^"]*"[^>]*type="application\/pdf"/);
  assert.match(html, /<a[^>]*href="\/files\/cv_zeyulin\.pdf"[^>]*download/);
  assert.match(html, /<a[^>]*href="\/files\/cv_zeyulin\.pdf"[^>]*target="_blank"/);
});

test('paper rows show their research area', () => {
  const areas = {
    '2026-ssrn-moving-lifelines': 'Healthcare operations',
    '2025-trb-user-collaborative-swapping': 'Shared mobility',
    '2025-msom-crowdsourcing-rental': 'Network competition',
    '2025-tits-ebike-user-relocation': 'Shared mobility',
    '2023-trb-ebike-staff-relocation': 'Shared mobility',
  };
  for (const url of ['/', '/publications/']) {
    const html = readPage(url);
    for (const [slug, area] of Object.entries(areas)) {
      const at = html.indexOf(`data-paper href="/publication/${slug}"`);
      const row = html.slice(html.lastIndexOf('<li', at), html.indexOf('</li>', at));
      assert.match(row, new RegExp(`class="row__area"[^>]*>${area}<`), `${slug} on ${url}`);
    }
  }
});

test('news docs state the real homepage count', () => {
  const limit = readFileSync(join(ROOT, '_layouts/home.html'), 'utf8').match(/news-rows\.html limit=(\d+)/)[1];
  const words = { 3: 3, 4: 4 };
  for (const f of ['README.md', '_data/news.yml']) {
    const m = readFileSync(join(ROOT, f), 'utf8').match(/homepage shows the first (\d+)/);
    assert.ok(m, `${f} does not say how many`);
    assert.equal(m[1], limit, `${f} says ${m[1]}, homepage shows ${words[limit] ?? limit}`);
  }
});

test('the AED illustration sits after the hero and before research', () => {
  const html = readPage('/');
  const at = ['id="hero"', 'id="lifelines"', 'id="research"'].map((s) => html.indexOf(s));
  assert.ok(at.every((i) => i > -1), String(at));
  assert.deepEqual([...at].sort((a, b) => a - b), at);
});

test('the AED illustration has two still maps, labels and controls', () => {
  const html = readPage('/');
  const sec = html.slice(html.indexOf('id="lifelines"'), html.indexOf('id="research"'));
  assert.equal(count(sec, /<svg class="aed__map"/g), 2);
  assert.match(sec, /data-aed-panel="static"/);
  assert.match(sec, /data-aed-panel="mobile"/);
  assert.match(sec, /<h2[^>]*>Who brings the AED in time\?<\/h2>/);
  assert.match(sec, /<button[^>]*data-aed-toggle[^>]*>Pause<\/button>/);
  assert.match(sec, /<button[^>]*data-aed-next[^>]*>Next scene<\/button>/);
  assert.match(sec, /data-aed-title/);
  assert.match(sec, /href="\/publication\/2026-ssrn-moving-lifelines"/);
  assert.match(sec, /<script type="module" src="\/assets\/js\/aed\.js"><\/script>/);
});

test('the AED still frame matches the drawing code', async () => {
  const { SCENES } = await import('../assets/js/aed-scenes.mjs');
  const { panelSvg, TIMING } = await import('../assets/js/aed-figures.mjs');
  const end = TIMING.pre + TIMING.grow + TIMING.tau + 0.01;
  for (const kind of ['static', 'mobile']) {
    assert.equal(readFileSync(join(ROOT, `_includes/aed-${kind}.svg`), 'utf8').trim(), panelSvg(kind, SCENES[0], end));
  }
});

test('no text is set smaller than 16px', () => {
  const css = readFileSync(join(ROOT, 'assets/css/site.css'), 'utf8');
  const rem = (v) => (v.endsWith('px') ? parseFloat(v) / 16 : parseFloat(v));
  const sm = css.match(/--text-sm:\s*([\d.]+(?:rem|px))/)[1];
  assert.ok(rem(sm) >= 1, `--text-sm is ${sm}`);
  for (const m of css.matchAll(/font-size:\s*([\d.]+(?:rem|px))/g)) assert.ok(rem(m[1]) >= 1, `font-size ${m[1]}`);
  for (const m of css.matchAll(/font:\s*\d{3}\s+([\d.]+(?:rem|px))/g)) assert.ok(rem(m[1]) >= 1, `font ${m[1]}`);
});

test('the research focus is one short sentence', () => {
  const html = readPage('/');
  const focus = html.match(/<p class="statement">([^<]+)<\/p>/)[1].trim();
  assert.equal((focus.match(/[.!?](\s|$)/g) || []).length, 1, focus);
  assert.ok(focus.split(/\s+/).length <= 25, `${focus.split(/\s+/).length} words`);
});

test('both illustrations share legend, controls bar and caption', () => {
  const html = readPage('/');
  const hero = html.slice(html.indexOf('id="hero"'), html.indexOf('id="lifelines"'));
  const aed = html.slice(html.indexOf('id="lifelines"'), html.indexOf('id="research"'));
  for (const [name, sec] of [['hero', hero], ['aed', aed]]) {
    assert.match(sec, /<ul class="legend"/, `${name} legend`);
    assert.match(sec, /class="figure-bar/, `${name} controls bar`);
    assert.match(sec, /class="figure-note">An illustration of the mechanism, not a result\.</, `${name} caption`);
  }
  assert.match(hero, /Robot working/);
  assert.match(hero, /Waiting for help/);
});
