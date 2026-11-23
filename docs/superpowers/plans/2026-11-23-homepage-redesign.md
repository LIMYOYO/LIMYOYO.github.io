# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Academic Pages / Minimal Mistakes look with an editorial design and an interactive "who becomes the bottleneck" hero, keeping every existing URL and the GitHub Pages build.

**Architecture:** The site stays on Jekyll, built by the `github-pages` gem. The old layouts, includes, Sass and JS give way to four small layouts (`default`, `home`, `page`, `paper`), one plain CSS file (no Sass), and a small vanilla JS simulation: a pure core module, unit-tested in Node, plus a browser widget that draws it. News moves to `_data/news.yml`. Node `node:test` checks the built `_site/` with no npm dependencies.

**Tech Stack:** Jekyll 3.x via `github-pages` (Docker image from the repo's `Dockerfile`), Liquid, plain CSS with OKLCH tokens, ES-module JavaScript, Node 26 `node:test`, hallmark `sloplint`.

**Spec:** `docs/superpowers/specs/2026-11-23-homepage-redesign-design.md`

## Global Constraints

- No custom Jekyll plugins. Use only those already in `_config.yml`: jekyll-feed, jekyll-sitemap, jekyll-redirect-from, jemoji, jekyll-gist, jekyll-paginate.
- No JS dependencies, no npm, no build step. The only external resource is the Google Fonts stylesheet:
  `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap`
- Tokens: copy the `:root` block in `~/.claude/skills/hallmark/references/themes/editorial.md` verbatim. Accent `oklch(49% 0.130 152)` covers at most 5% of any screen. No border radius, no box-shadow, no texture.
- Heads: Bricolage Grotesque 800, `"wdth" 75`, sentence case. Body: Source Serif 4, 18px, line-height 1.55. Labels: Bricolage 500, one step smaller, no letter-spacing. Never all caps, never an eyebrow above a heading.
- Fixed copy:
  - Hero `<h1>`: "When machines do the work, who becomes the bottleneck?"
  - Standfirst: "I study how AI and robots change the work people still do — and when the person who checks, repairs, and steps in becomes the constraint."
  - Note: "An illustration, not a result."
- Fixed control labels: "Robots per person" (range 1–12, default 6); "When help is needed" with the options "Scattered" and "In bursts".
- Readout format: `Robots waiting {n}% · Person busy {m}%`
- No model results (quadrants, replacement ratios, findings) and no advisor's name anywhere on the site.
- Legacy URLs must keep resolving:
  - `/` (plus the `/about/` and `/about.html` redirects)
  - `/publications/` and the 5 `/publication/<slug>` pages
  - `/teaching/` and `/teaching/2024-production-simulation`
  - `/cv/` (plus the `/resume` redirect) and `/files/cv_zeyulin.pdf`
  - `/404.html`, `/sitemap.xml`, `/feed.xml`
- Work happens only on branch `claude/project-reading-d57dd5`. Never push to `master`; the user merges once after a local preview.
- Node commands need `export PATH=/opt/homebrew/opt/node@26/bin:$PATH` first, because the default node@22 on this machine is broken.
- Build command (shown as `$BUILD` below). Use plain `docker build`/`docker run`, since this machine has no `docker compose` plugin:
  ```bash
  docker build -t jekyll-site . && docker run --rm -v "$PWD":/usr/src/app jekyll-site bundle exec jekyll build --config _config.yml,_config_docker.yml
  ```
- Test command (shown as `$TEST`): `node --test tests/`

## Review Focus

1. **Narrow phones (375px) and touch.** No horizontal scroll, the slider is usable with a thumb, and the hero shows headline, standfirst, simulation, then controls. → Task 5 adds a `resize_window` mobile check, and Task 7 adds sloplint at 8 widths.
2. **Reduced motion, no JS, hidden tab.** With reduced motion the page shows a still frame plus a "Step" button. Without JS the page shows a static SVG. A hidden tab pauses the simulation. → Task 5 adds a `<noscript>` site test and a browser check with reduced motion emulated.
3. **Dark mode.** Heads, body text, rules and the green all stay readable (WCAG AA). → Task 2 adds a contrast check of the dark tokens; Task 7 adds sloplint.
4. **Adding News later.** A new `_data/news.yml` entry with Markdown (bold, links) renders correctly. The homepage shows the newest 4, and `/news/` shows all of them. → Task 3 adds a site test of the counts and the rendered `<strong>`.
5. **Simulation edge settings.** At 1 robot, at 12 robots in bursts, and when the slider is dragged quickly, the sim never shows NaN, never goes over 100%, and leaves no stuck queue. → Task 4 adds unit tests over every setting.

---

## File map

| Path | Responsibility |
|---|---|
| `_layouts/default.html` | HTML shell: head (meta, fonts, CSS), masthead with nav, footer |
| `_layouts/home.html` | Homepage sections: hero, research, papers, news (4), about |
| `_layouts/page.html` | Plain reading page (CV, teaching items, news, 404) |
| `_layouts/paper.html` | Single publication page |
| `_includes/paper-rows.html` | Publication rows for one category (used by home and `/publications/`) |
| `_includes/news-rows.html` | News rows; parameter `limit` |
| `_includes/hero-snapshot.svg` | Static frame, used inside `<noscript>` |
| `assets/css/site.css` | All styles: tokens, light and dark |
| `assets/js/bottleneck-sim.mjs` | Pure simulation core, with no DOM |
| `assets/js/bottleneck.js` | Browser widget: draws the sim, wires up controls |
| `_data/news.yml` | News entries `{date, text}`, newest first |
| `_pages/news.md` | `/news/`, all entries |
| `tests/site.test.mjs` | Checks the built `_site/` |
| `tests/bottleneck-sim.test.mjs` | Unit tests for the sim core |
| `tests/lib/site.mjs` | Helpers: `readPage(url)`, `allHtml()`, `internalLinks(html)` |
| `README.md` | Maintenance guide: adding news, adding a paper, local preview |

---

### Task 1: Build harness and legacy-URL baseline

**Files:**
- Create: `tests/lib/site.mjs`, `tests/site.test.mjs`
- Modify: `.gitignore` (add `_site/` if it is missing)

**Interfaces:**
- Produces `tests/lib/site.mjs`:
  - `readPage(url: string): string | null`. Maps `/x/` to `_site/x/index.html`, and `/x` to `_site/x.html` or `_site/x/index.html`. Returns `null` when the page is missing.
  - `allHtml(): Array<{path: string, html: string}>`
  - `internalLinks(html: string): string[]`. Collects `href`/`src` values that start with `/` (anchors and query strings removed).

- [ ] **Step 1: Write the legacy test.** In `tests/site.test.mjs`, add `test('legacy URLs resolve')`. It loops over the Global Constraints URL list and asserts `readPage(u) !== null` for each one. For a redirect, assert the page contains `http-equiv="refresh"`.
- [ ] **Step 2: Build the current site.** Run `$BUILD`. Expected: exit 0 and `_site/index.html` exists. The first image build takes several minutes, so run it in the background.
- [ ] **Step 3: Run the tests.** Run `$TEST`. Expected: PASS on the old site. This is the baseline that later tasks must keep green.
- [ ] **Step 4: Commit.** `git add tests .gitignore && git commit -m "Add site build checks for legacy URLs"`

### Task 2: New shell, material and page layouts

**Files:**
- Create: `_layouts/default.html`, `_layouts/page.html`, `_layouts/paper.html`, `assets/css/site.css`
- Modify: `_config.yml` `defaults`. Pages use `page`, publications use `paper`, teaching uses `page`, and the `author_profile`, `share` and `comments` values are removed.
- Modify: `_pages/publications.html` and `_pages/teaching.html` (use `page` and the new rows), `_pages/cv.md`, `_pages/404.md`
- Create: `_includes/paper-rows.html`
- Delete: all old `_layouts/*` except the four new ones; all of `_includes/` except the new includes; `_sass/`; `assets/css/main.scss`, `assets/css/academicons*.css`, `assets/css/collapse.css`; `assets/js/*` (the old files)
- Test: `tests/site.test.mjs`

**Interfaces:**
- `default.html` exposes `{{ content }}` inside `<main id="main">`. Nav links: Research → `/#research`, Papers → `/publications/`, Teaching → `/teaching/`, CV → `/cv/`.
- `paper-rows.html` takes the parameter `category`. Each row is `<a class="row" data-paper href="{{ post.url }}">`, with the title, then `{review_status} · {venue}` (or `{venue}` alone), then the year.
- `paper.html` renders the title, `citation` authors, the status/venue line, `{{ content }}`, a `paperurl` button, and the citation. It reads the same front matter keys the current files use.

- [ ] **Step 1: Write the failing tests.**
  - `test('old template is gone')`: no built HTML contains `author__avatar`, `masthead__menu`, `greedy-nav` or `academicons`.
  - `test('only allowed external resources')`: every `<script src>` is internal. Every external `<link href>` is the fonts.googleapis.com URL or fonts.gstatic.com.
  - `test('paper page shows status')`: `/publication/2026-ssrn-moving-lifelines` contains "Major Revision" and "Management Science".
  - `test('dark tokens defined')`: `assets/css/site.css` contains `prefers-color-scheme: dark`.
- [ ] **Step 2: Confirm they fail.** Run `$BUILD && $TEST`. Expected: FAIL, because old template markers are present.
- [ ] **Step 3: Build the material and layouts.** Write the layouts and `site.css` to the Global Constraints material. Dark tokens follow hallmark `references/dark-mode.md`. Delete the old theme files.
  - Keep the stamp as the first comment in `site.css`: `/* Hallmark · editorial · … */`, in the format of hallmark `gates.md` §2.
- [ ] **Step 4: Check dark contrast.** Compute the contrast for ink on paper, ink-2 on paper, muted on paper and accent on paper, in both modes (a small Node script in the scratchpad that converts OKLCH to sRGB). Expected: every value ≥ 4.5, or ≥ 3 for large text. Adjust the dark token values if any falls short.
- [ ] **Step 5: Confirm the tests pass.** Run `$BUILD && $TEST`. Expected: all tests PASS, including Task 1's legacy URLs.
- [ ] **Step 6: Commit.** `git commit -am "Replace template shell with editorial layouts"` (`git add` the new files first)

### Task 3: Homepage content, news data and the news page

**Files:**
- Create: `_data/news.yml`, `_includes/news-rows.html`, `_layouts/home.html`, `_pages/news.md` (permalink `/news/`)
- Modify: `_pages/about.md`. Use `layout: home`, keep `permalink: /` and `redirect_from`, and move the text into front matter or the layout. The News bullets move to YAML.
- Modify: `README.md` (rewrite it as the maintenance guide)
- Test: `tests/site.test.mjs`

**Interfaces:**
- `_data/news.yml`: a list of `{date: "Nov 2026", text: "<markdown>"}`, newest first. Six entries, copied verbatim from `about.md`, except that the Transportation Science entry gets `date: Nov 2026`.
- `news-rows.html` takes the parameter `limit` (default all). Each row is `<li data-news-item>`, with the `<time>`-styled date on the left and `{{ text | markdownify }}`, with its `<p>` stripped, on the right.
- `home.html` sections, in order, each with an `id`: `hero` (filled in by Task 5), `research`, `papers`, `news`, `about`.
  - The `research` section shows the focus paragraph from `about.md` verbatim as the standfirst. The other-work paragraph appears as three ruled rows: "Shared mobility and on-demand platforms", "Network competition and game theory", "Learning-augmented optimization". **This is my own decision.** It keeps the 900px window under the 80-word screen budget, and the user can overrule it.
  - The `news` section ends with an "All news" link to `/news/`.
  - The `about` section has the square headshot `images/zeyu-lin-headshot.png` and the email, Google Scholar, SSRN and GitHub links from `_config.yml` `author`.

- [ ] **Step 1: Write the failing tests.**
  - `test('home shows 4 newest news')`: `/` has exactly 4 `data-news-item` entries, and the first contains "Transportation Science".
  - `test('news page shows all')`: `/news/` has `data-news-item` count equal to the number of YAML entries (6).
  - `test('news markdown renders')`: `/news/` contains `<strong>Major Revision</strong>`.
  - `test('home links all papers')`: `/` has 5 `data-paper` rows.
  - `test('home sections in order')`: the ids `hero`, `research`, `papers`, `news`, `about` appear in that order.
  - `test('all internal links resolve')`: for every built page, each `internalLinks` value resolves to a file in `_site`.
- [ ] **Step 2: Confirm they fail.** Run `$BUILD && $TEST`. Expected: FAIL (the news counts and section ids are missing).
- [ ] **Step 3: Implement the data, includes, layout and pages** per the Interfaces above, then rewrite `README.md` in three short sections: "Add news", "Add a paper", "Preview locally" (with `$BUILD`, plus `docker run -p 4000:4000 …` for serve).
- [ ] **Step 4: Confirm the tests pass.** Run `$BUILD && $TEST`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add -A _data _includes _layouts _pages README.md tests && git commit -m "Move news to data file and build editorial homepage"`

### Task 4: Simulation core

**Files:**
- Create: `assets/js/bottleneck-sim.mjs`
- Test: `tests/bottleneck-sim.test.mjs`

**Interfaces:**
- `createSim({robots: number, mode: 'scattered' | 'bursts', seed?: number}): Sim`
- `Sim.step(dt: number): void` advances simulated time.
- `Sim.setRobots(n: number): void` and `Sim.setMode(mode): void` change the settings while the sim runs, without resetting.
- `Sim.snapshot(): {robots: Array<{state: 'working' | 'waiting' | 'served', progress: number}>, person: {target: number | null}, queue: number[]}`
- `Sim.stats(): {robotsWaiting: number, personBusy: number}`. Both are fractions in [0, 1], computed as exponential moving averages over roughly the last 60 simulated time units.
- Seeded RNG (mulberry32). With no seed, it seeds from `Date.now()`.
- Model: one person, first come first served, one intervention per job. Pick the job length, the intervention length and the burst mechanism so that the tests below pass with clear margins. The spec leaves these values to the builder, and no number is shown as meaningful.

- [ ] **Step 1: Write the failing tests.** For each one, run 5,000 time units at `seed: 1` (and 2 and 3) and read `stats()`.
  - `more robots → more waiting`: `waiting(12, 'scattered') - waiting(3, 'scattered') >= 0.2`.
  - `bursts → more waiting`: `waiting(6, 'bursts') - waiting(6, 'scattered') >= 0.1`.
  - `stats bounded`: for every robots value in 1..12 and both modes, both stats are finite and within [0, 1].
  - `live changes are safe`: change `setRobots` from 12 to 1 to 12 every 10 time units for 2,000 units. Afterwards, `snapshot().robots.length` equals the current setting, the queue holds only valid indices, and the stats stay finite.
  - `deterministic`: two sims with the same seed give the same `stats()` after 1,000 units.
- [ ] **Step 2: Confirm they fail.** Run `node --test tests/bottleneck-sim.test.mjs`. Expected: FAIL, because the module is not found.
- [ ] **Step 3: Implement `createSim`** in `assets/js/bottleneck-sim.mjs`, with time-stepped logic and no DOM access.
- [ ] **Step 4: Confirm they pass.** Run `node --test tests/bottleneck-sim.test.mjs`. Expected: PASS for all three seeds.
- [ ] **Step 5: Commit.** `git add assets/js/bottleneck-sim.mjs tests/bottleneck-sim.test.mjs && git commit -m "Add bottleneck simulation core"`

### Task 5: Interactive hero

**Files:**
- Create: `assets/js/bottleneck.js`, `_includes/hero-snapshot.svg`
- Modify: `_layouts/home.html` (fill in the `hero` section), `assets/css/site.css`
- Test: `tests/site.test.mjs`, plus a browser check

**Interfaces:**
- Consumes `createSim`, `Sim.step`, `setRobots`, `setMode`, `snapshot` and `stats` from Task 4.
- Markup contract, which the tests rely on:
  - `<section id="hero">` holds the `<h1>`, the standfirst `<p>`, and `<figure data-sim>` containing the drawing surface, `<noscript>{% include hero-snapshot.svg %}</noscript>` and `<figcaption>`, which holds the note.
  - Controls: `<input type="range" id="robots" min="1" max="12" value="6">` with a `<label for="robots">`, and two radio buttons `name="timing"`, values `scattered` and `bursts`, inside a `<fieldset><legend>When help is needed</legend>`.
  - Readout: `<p data-readout aria-live="polite">`. Update the text at most once per second.
- Behaviour:
  - `requestAnimationFrame` loop.
  - Pause on `visibilitychange` when the tab is hidden.
  - When `matchMedia('(prefers-reduced-motion: reduce)')` matches, do not autoplay. Show the first frame and a `<button>Step</button>` that advances 5 time units.
  - Load with `<script type="module" src="/assets/js/bottleneck.js">`.
- Drawing:
  - Robots are squares in a grid. While working they show an ink progress fill. While waiting they are hollow outlines and stay in place.
  - The person is the one green dot. While serving a robot, a hairline links the dot to that robot.

- [ ] **Step 1: Write the failing tests.**
  - `test('hero copy fixed')`: `/` contains the exact `<h1>` text and the exact standfirst from Global Constraints.
  - `test('hero has fallback and labels')`: `/` contains `<noscript>` with `<svg`, `label for="robots"`, `<legend>When help is needed</legend>`, `data-readout` and `aria-live="polite"`.
  - `test('no results or names leak')`: no built HTML matches `/\bMing\b|quadrant|replacement ratio|we find|our results/i`.
- [ ] **Step 2: Confirm they fail.** Run `$BUILD && $TEST`. Expected: FAIL (the hero is empty).
- [ ] **Step 3: Implement the widget, the snapshot SVG and the hero markup and CSS.**
- [ ] **Step 4: Confirm the tests pass.** Run `$BUILD && $TEST`. Expected: PASS.
- [ ] **Step 5: Check in the browser.** Serve with `docker run --rm -p 4000:4000 -v "$PWD":/usr/src/app jekyll-site` and open `http://localhost:4000` in the built-in browser. Check each of these, with a screenshot where it helps:
  - (a) At 12 robots, or with "In bursts" selected, the waiting figure in the readout clearly rises within about 10 seconds.
  - (b) At the mobile preset (375×812) there is no horizontal scroll and the slider is reachable.
  - (c) Hiding the tab pauses the simulation (time does not advance while hidden).
  - (d) With reduced motion emulated through `matchMedia` overridden in the page via `javascript_tool` before reload, or by temporarily forcing the branch, the Step button appears.
  - (e) In the dark color scheme the page stays readable.
- [ ] **Step 6: Commit.** `git add -A assets _includes _layouts tests && git commit -m "Add interactive bottleneck hero"`

### Task 6: Remove template and talks leftovers

**Files:**
- Delete:
  - `_pages/category-archive.html`, `_pages/tag-archive.html`, `_pages/year-archive.html`, `_pages/collection-archive.html`, `_pages/page-archive.html`, `_pages/archive-layout-with-content.md`, `_pages/sitemap.md`
  - `_drafts/`, `_data/comments/`, `_data/ui-text.yml`, `_data/authors.yml`, `_data/navigation.yml` (if the new shell no longer reads it)
  - `talkmap/`, `talkmap.ipynb`, `talkmap_out.ipynb`, `talkmap.py`, `.github/workflows/scrape_talks.yml`, `markdown_generator/`, `scripts/`
  - `package.json`, `.devcontainer/`, `assets/fonts/`, `assets/webfonts/`, `images/themes/`
- Modify: `_config.yml`. Remove the `talks` and `portfolio` collections and their defaults, the `comments`/`staticman`/`analytics`/`site_theme` blocks, and any key the new layouts never read.
- Test: `tests/site.test.mjs`

- [ ] **Step 1: Check each path for references** before deleting it: `git grep -n "<basename>"`, excluding the file itself and `docs/`. Expected: no hits, except inside files that are also being deleted. Keep anything that is still referenced, and report it.
- [ ] **Step 2: Write the failing test.** `test('build output has no leftovers')`: `_site/talkmap`, `_site/markdown_generator`, `_site/sitemap/index.html` and `_site/year-archive` do not exist.
- [ ] **Step 3: Confirm it fails.** Run `$BUILD && $TEST`. Expected: FAIL.
- [ ] **Step 4: Delete the files and prune `_config.yml`.**
- [ ] **Step 5: Confirm a clean build.** Run `$BUILD 2>&1 | tee /tmp/claude-build.log && $TEST`. Expected: all tests PASS, and the log has no `Warning` or `Deprecation` lines from the site's own files.
- [ ] **Step 6: Commit.** `git add -A && git commit -m "Remove template and talks leftovers"`

### Task 7: Hallmark lint and final verification

**Files:**
- Modify: only what the findings require
- Create: `docs/superpowers/plans/2026-11-23-homepage-redesign-verification.md` (a short results log)

- [ ] **Step 1: Lint the main pages.** With the site served on :4000, run:
  `node ~/.claude/skills/hallmark/scripts/sloplint.mjs --url http://localhost:4000/ --url http://localhost:4000/publications/ --render --genre editorial`
  Expected: 0 FAIL. Fix every REFLEX, or waive it in the `site.css` stamp with gate, guard and reason (hallmark `gates.md` §2).
- [ ] **Step 2: Lint the reading pages.** Run the same command for `/publication/2026-ssrn-moving-lifelines` and `/news/`.
  - Expected: 0 FAIL, apart from gate 58 (the screen word budget), which the spec accepts for reading pages.
  - Add `copy: verbatim` to the stamp in `paper.html`/`page.html` (an inline `<style>` comment is fine) so that gate 58 reports as NOTE. If sloplint does not pick up the stamp, record the gate 58 result as accepted in the verification log, along with the spec reference.
- [ ] **Step 3: Run the full tests one last time.** Run `$BUILD && $TEST && node --test tests/bottleneck-sim.test.mjs`. Expected: PASS.
- [ ] **Step 4: Write the verification log.** Record the sloplint verdicts per page, any waivers, the contrast numbers from Task 2, and the browser checks from Task 5.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "Pass hallmark lint and record verification"`
- [ ] **Step 6: Stop and hand over.** Do not push to `master`. Tell the user the branch is ready to preview, using the README's serve command, and to merge once.
