// Writes _includes/hero-snapshot.svg, the still frame the hero shows before (or without) JavaScript.
// Run after changing assets/js/bottleneck-figures.mjs: node tools/make-hero-snapshot.mjs
import { writeFileSync } from 'node:fs';
import { snapshotSvg } from '../assets/js/bottleneck-figures.mjs';
writeFileSync(new URL('../_includes/hero-snapshot.svg', import.meta.url), snapshotSvg() + '\n');
console.log('wrote _includes/hero-snapshot.svg');
