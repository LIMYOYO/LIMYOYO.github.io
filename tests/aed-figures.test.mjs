import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, solveStatic, solveMobile } from '../assets/js/aed-scenes.mjs';
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

test('everyone responds at once: all volunteers and all idle cars move', () => {
  const s = scene('typical');
  const t = TIMING.pre + TIMING.grow + TIMING.tau * 0.3;
  const st = renderPanel('static', s, t);
  assert.equal(count(st, /class="aed__walker/g), s.volunteers.length);
  const mo = renderPanel('mobile', s, t);
  assert.equal(count(mo, /class="aed__car is-responding/g), s.cars.filter((c) => !c.busy).length);
  assert.equal(count(mo, /class="aed__car is-busy/g), s.cars.filter((c) => c.busy).length);
});

test('when the window closes, arrivals are green and the rest are red', () => {
  for (const s of SCENES) {
    const st = renderPanel('static', s, END);
    const okS = solveStatic(s).routes.filter((r) => r.ok).length;
    assert.equal(count(st, /aed__walker[^"]*is-arrived/g), okS, s.id);
    assert.equal(count(st, /aed__walker[^"]*is-failed/g), s.volunteers.length - okS, s.id);
    const mo = renderPanel('mobile', s, END);
    const routes = solveMobile(s).routes;
    const okM = routes.filter((r) => r.ok).length;
    assert.equal(count(mo, /aed__car is-responding is-arrived/g), okM, s.id);
    assert.equal(count(mo, /aed__car is-responding is-failed/g), routes.length - okM, s.id);
  }
});

test('a volunteer on the second leg carries the AED', () => {
  const s = scene('typical');
  const late = renderPanel('static', s, TIMING.pre + TIMING.grow + TIMING.tau * 0.85);
  assert.match(late, /class="aed__walker[^"]*is-carrying/);
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

test('outcome text counts arrivals and names the bottleneck', () => {
  const s = scene('typical');
  const okS = solveStatic(s).routes.filter((r) => r.ok).length;
  assert.match(outcomeText('static', s, END), new RegExp(`${okS} of ${s.volunteers.length} volunteers arrive in time`));
  assert.match(outcomeText('static', scene('far-aeds'), END), /No volunteer/);
  assert.match(outcomeText('mobile', scene('rush-hour'), END), /busy/);
  assert.equal(outcomeText('static', s, 0), '');
});

test('a panel is a self-contained SVG', () => {
  const svg = panelSvg('static', scene('typical'), END);
  assert.match(svg, /^<svg class="aed__map"[^>]*viewBox="0 0 400 340"[^>]*role="img"[^>]*aria-label="[^"]+"/);
  assert.match(svg, /<\/svg>$/);
});
