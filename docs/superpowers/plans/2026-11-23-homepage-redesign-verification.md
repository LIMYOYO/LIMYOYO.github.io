# Homepage redesign: verification log

Date: 2026-11-23 · Branch: `claude/project-reading-d57dd5`

## Tests

`node --test tests/`: 30 pass, 0 fail. The suite covers:
- legacy URLs and redirects
- the old template being removed
- external resources
- news counts and Markdown
- section order
- internal links
- hero copy, fallback and labels
- the leak guard
- the advisor link and the TA link
- leftovers
- font weights
- the simulation core: 8 tests, including the bursts margin, saturation, equal help per unit of work, live changes and invariants

The Jekyll build (`tools/build.sh`, github-pages gem, Jekyll 3.10) finishes with no warnings.

## hallmark sloplint

Command (render tier; puppeteer-core installed in a scratchpad and passed via `HALLMARK_PUPPETEER`; Chrome 1440/1920/1280/375/320 widths). `_site/index.html` is passed only so its stamp applies to the URL results; it is a module shell and is not rendered from disk.

```
node ~/.claude/skills/hallmark/scripts/sloplint.mjs _site/index.html \
  --url http://localhost:4000/ --url http://localhost:4000/publications/ \
  --url http://localhost:4000/publication/2026-ssrn-moving-lifelines.html --url http://localhost:4000/news/ \
  --render --genre editorial
```

| Page | FAIL | REFLEX | Waived / dismissed | Notes |
|---|---|---|---|---|
| `/` | 0 | 0 | 44c waived | 58: 108 words in the window covering News and About |
| `/publications/` | 0 | 0 | 79 waived, 77 dismissed | 58: 94 words |
| `/publication/2026-ssrn-moving-lifelines` | 0 | 0 | 79 waived, 77 dismissed | 58: 242 words (the abstract) |
| `/news/` | 0 | 0 | 79 waived, 77 dismissed | 58: 139 words |

Stamp, inline in `_layouts/default.html`:
- `copy: verbatim` turns gate 58 (screen word budget) into notes. The news items, abstracts and bio are the owner's own text, kept as written (spec §6.4). The homepage shows 3 news items instead of 4 to stay closer to the budget.
- `waive 44c`: the hero's robot drawing sits above its own controls and readout, so its centre is 76px from the text block's centre.
- `waive 79`: on list and reading pages, the list or abstract starts directly under a short head, so there is no hero to fill the screen.
- `dismissed 77`: list pages are a single list, not a 6–9-section landing page.

The static pass on the built HTML still reports 26a (focus-visible), 34 (overflow-x clip) and 26b (:active, :disabled). These are artifacts: the static pass does not follow the root-relative `<link href="/assets/css/site.css">`. All four rules are in `assets/css/site.css`, and linting that file on its own raises none of them. The render tier, which loads the real page, finds no horizontal scroll at 320px.

Remaining Finish note: F1 flags straight quotes in the Moving Lifelines citation (front-matter text, kept verbatim).

## Contrast (WCAG, light / dark)

| Pair | Light | Dark |
|---|---|---|
| ink on paper | 17.81 | 16.28 |
| ink-2 on paper | 12.96 | 11.88 |
| muted on paper | 6.00 | 7.26 |
| accent on paper | 5.39 | 8.22 |
| accent-ink on accent | 5.55 | 8.23 |
| focus on paper | 4.74 | 8.84 |
| rule-2 on paper (control borders) | 3.09 | 3.23 |

## Browser checks (built-in browser, served `_site` on :4000)

- **12 robots:** going from 6 to 12 robots raised the readout from "Robots waiting 6%" to "40%" within 12 s.
- **Bursts at 6 robots:** the background tab was throttled, so this was replayed in Node with the widget's smoothing over 5 seeds. Waiting went from 8–20% to 23–39% within 10 s.
- **Mobile, 375×812:** no horizontal overflow; the slider is 195×44 px.
- **Hidden tab:** in a fronted tab, simulating `document.hidden` paused the sim and clearing it resumed it.
- **Reduced motion:** with `matchMedia` overridden, there is no autoplay; the Step button shows and advances the sim.
- **Dark mode:** screenshots are readable.
- **Found in the browser and fixed, each with a failing test first:** the Step button showed despite `hidden`; the SVG never unhid; the restored slider value disagreed with the sim.
