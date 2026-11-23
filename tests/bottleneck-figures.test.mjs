import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT, slot, robotMarkup, personMarkup, snapshotSvg } from '../assets/js/bottleneck-figures.mjs';

test('twelve slots fit inside the drawing', () => {
  for (let i = 0; i < 12; i++) {
    const { x, y } = slot(i);
    assert.ok(x >= 0 && x + LAYOUT.SIZE <= LAYOUT.W && y >= 0 && y + LAYOUT.SIZE <= LAYOUT.H, `slot ${i}`);
  }
});

test('a robot has a body, eyes, antenna, work bar and an alert', () => {
  const svg = robotMarkup(0, 'working', 0.5);
  for (const part of ['robot__body', 'robot__eye', 'robot__antenna', 'robot__bar', 'robot__alert']) assert.ok(svg.includes(part), part);
  assert.match(svg, /class="robot is-working"/);
});

test('the person is drawn as a head and a body', () => {
  const svg = personMarkup(100, 200);
  assert.match(svg, /<g class="person"[^>]*transform="translate\(100 200\)"/);
  assert.match(svg, /<circle class="person__head"/);
  assert.match(svg, /<path class="person__body"/);
});

test('the still frame shows working, waiting and served robots and the person', () => {
  const svg = snapshotSvg();
  assert.match(svg, /^<svg class="sim"/);
  for (const s of ['is-working', 'is-waiting', 'is-served', 'is-empty']) assert.ok(svg.includes(s), s);
  assert.ok(svg.includes('class="person"'));
  assert.ok(svg.includes(`viewBox="0 0 ${LAYOUT.W} ${LAYOUT.H}"`));
});
