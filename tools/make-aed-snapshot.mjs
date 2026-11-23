// Writes _includes/aed-static.svg and _includes/aed-mobile.svg, the still frames shown before (or without) JavaScript.
// Run after changing assets/js/aed-scenes.mjs or aed-figures.mjs: node tools/make-aed-snapshot.mjs
import { writeFileSync } from 'node:fs';
import { SCENES } from '../assets/js/aed-scenes.mjs';
import { panelSvg, TIMING } from '../assets/js/aed-figures.mjs';
const end = TIMING.pre + TIMING.grow + TIMING.tau + 0.01;
for (const kind of ['static', 'mobile']) {
  writeFileSync(new URL(`../_includes/aed-${kind}.svg`, import.meta.url), panelSvg(kind, SCENES[0], end) + '\n');
}
console.log('wrote _includes/aed-static.svg and _includes/aed-mobile.svg');
