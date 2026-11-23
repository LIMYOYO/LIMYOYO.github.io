import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../assets/js/aed-scenes.mjs';
import { TIMING, renderPanel, outcomeText, panelSvg } from '../assets/js/aed-figures.mjs';

const scene = (id) => SCENES.find((s) => s.id === id);
const END = TIMING.pre + TIMING.grow + TIMING.tau + 0.01;
const count = (s, re) => (s.match(re) || []).length;

test('before the alert there are no reach circles and nobody is marked', () => {
  const st = renderPanel('static', scene('typical'), 0);
  assert.equal(count(st, /class="aed__reach"/g), 0);
  assert.equal(count(st, /is-in-range/g), 0);
  const mo = renderPanel('mobile', scene('typical'), 0);
  assert.equal(count(mo, /class="aed__reach"/g), 0);
});

test('after the alert the circles are drawn and volunteers are split into in range and out of range', () => {
  const t = TIMING.pre + TIMING.grow;
  const st = renderPanel('static', scene('typical'), t);
  assert.equal(count(st, /class="aed__reach"/g), 2);
  assert.ok(count(st, /is-in-range/g) >= 1);
  assert.ok(count(st, /is-out-of-range/g) >= 1);
  assert.doesNotMatch(st, /is-busy|is-available/, 'volunteers have no busy state');
});

test('cars are drawn busy (with a passenger) or available, from the start', () => {
  const mo = renderPanel('mobile', scene('rush-hour'), 0);
  assert.ok(count(mo, /class="aed__car is-busy/g) >= 4);
  assert.ok(count(mo, /class="aed__passenger"/g) >= 4);
  assert.ok(count(mo, /class="aed__car is-available/g) >= 1);
});

test('the walker carries the AED on the second leg', () => {
  const s = scene('typical');
  const late = renderPanel('static', s, TIMING.pre + TIMING.grow + TIMING.tau * 0.75);
  assert.match(late, /class="aed__walker is-carrying"/);
  const early = renderPanel('static', s, TIMING.pre + TIMING.grow + TIMING.tau * 0.1);
  assert.match(early, /class="aed__walker"/);
});

test('the patient is marked in time or missed when the window closes', () => {
  assert.match(renderPanel('static', scene('typical'), END), /class="aed__patient is-in-time"/);
  assert.match(renderPanel('mobile', scene('typical'), END), /class="aed__patient is-in-time"/);
  assert.match(renderPanel('static', scene('far-aeds'), END), /class="aed__patient is-missed"/);
  assert.match(renderPanel('mobile', scene('rush-hour'), END), /class="aed__patient is-missed"/);
});

test('the time-window ring empties as τ runs out', () => {
  const ring = (t) => Number(renderPanel('mobile', scene('typical'), t).match(/class="aed__clock"[^>]*stroke-dashoffset="([\d.]+)"/)[1]);
  const start = ring(TIMING.pre + TIMING.grow);
  const mid = ring(TIMING.pre + TIMING.grow + TIMING.tau / 2);
  const end = ring(END);
  assert.ok(start < mid && mid < end, `${start} ${mid} ${end}`);
});

test('outcome text names the bottleneck when a delivery is missed', () => {
  assert.match(outcomeText('static', scene('far-aeds'), END), /No volunteer can fetch an AED/);
  assert.match(outcomeText('mobile', scene('rush-hour'), END), /busy/);
  assert.match(outcomeText('static', scene('typical'), END), /In time/);
  assert.equal(outcomeText('static', scene('typical'), 0), '');
});

test('a panel is a self-contained SVG', () => {
  const svg = panelSvg('static', scene('typical'), END);
  assert.match(svg, /^<svg class="aed__map"[^>]*viewBox="0 0 400 340"[^>]*role="img"[^>]*aria-label="[^"]+"/);
  assert.match(svg, /<\/svg>$/);
});
