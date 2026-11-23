# Zeyu Lin — personal site

Source for <https://limyoyo.github.io>, built by GitHub Pages with Jekyll.

## Add news

Edit `_data/news.yml`. Put the newest item first:

```yaml
- date: Dec 2026
  text: >-
    The paper “…” was accepted at *Journal Name*. [Paper details](/publication/your-paper-slug)
```

`text` is Markdown, so `**bold**`, `*italic*` and `[links](url)` work. The homepage shows the first 3 items, and `/news/` shows all of them.

## Add a paper

Add a Markdown file to `_publications/`. Copy an existing one and change its front matter:

| Key | Meaning |
|---|---|
| `title` | Paper title |
| `category` | `workingpapers`, `manuscripts` or `conferences` |
| `area` | Research area shown in the lists, e.g. `Shared mobility` |
| `permalink` | `/publication/<slug>` |
| `date` | Used for ordering and the year shown |
| `venue` | Journal or conference |
| `review_status` | Optional, e.g. `Major Revision`. Shown as “**Major Revision** · Venue” |
| `paperurl` | Optional link for the “Read the paper” button |
| `citation` | Optional citation text |

The body of the file is the abstract shown on the paper's page.

## Update the CV

Edit `cv-source/cv_zeyulin.tex`, then run `tools/build-cv.sh` (needs MacTeX's `pdflatex`). It writes `files/cv_zeyulin.pdf`, which the CV page shows and offers for download.

## Edit the homepage

The research text, research areas and the About paragraph live in `_pages/about.md`. The interactive figure at the top is in `_includes/hero.html` and `assets/js/`.

## Preview locally

You need Docker running. The first build creates the `jekyll-site` image, which takes a few minutes.

```bash
tools/build.sh
python3 -m http.server 4000 -d _site
```

Then open <http://localhost:4000>.

Checks (they need Node 18 or newer):

```bash
node --test tests/
```
