import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../assets/js/bottleneck-sim.mjs';

const SEEDS = [1, 2, 3];

function run(sim, units, dt = 0.1) {
  for (let t = 0; t < units; t += dt) sim.step(dt);
  return sim;
}
const waiting = (robots, mode, seed) => run(createSim({ robots, mode, seed }), 5000).stats().robotsWaiting;

test('more robots per person means more waiting', () => {
  for (const seed of SEEDS) {
    const few = waiting(3, 'scattered', seed);
    const many = waiting(12, 'scattered', seed);
    assert.ok(many - few >= 0.2, `seed ${seed}: 3 robots ${few.toFixed(3)}, 12 robots ${many.toFixed(3)}`);
  }
});

test('help in bursts means more waiting than scattered', () => {
  for (const seed of SEEDS) {
    const scattered = waiting(6, 'scattered', seed);
    const bursts = waiting(6, 'bursts', seed);
    assert.ok(bursts - scattered >= 0.1, `seed ${seed}: scattered ${scattered.toFixed(3)}, bursts ${bursts.toFixed(3)}`);
  }
});

test('stats stay finite and within [0, 1] for every setting', () => {
  for (const mode of ['scattered', 'bursts']) {
    for (let robots = 1; robots <= 12; robots++) {
      const { robotsWaiting, personBusy } = run(createSim({ robots, mode, seed: 7 }), 600).stats();
      for (const v of [robotsWaiting, personBusy]) {
        assert.ok(Number.isFinite(v) && v >= 0 && v <= 1, `${mode} ${robots}: ${v}`);
      }
    }
  }
});

test('changing settings while running stays consistent', () => {
  const sim = createSim({ robots: 12, mode: 'bursts', seed: 4 });
  const sizes = [12, 1, 12, 5, 1, 9];
  for (let i = 0; i < 200; i++) {
    const n = sizes[i % sizes.length];
    sim.setRobots(n);
    if (i % 7 === 0) sim.setMode(i % 2 ? 'scattered' : 'bursts');
    run(sim, 10);
    const snap = sim.snapshot();
    assert.equal(snap.robots.length, n);
    for (const q of snap.queue) assert.ok(Number.isInteger(q) && q >= 0 && q < n, `queue holds ${q} with ${n} robots`);
    assert.ok(snap.person.target === null || (snap.person.target >= 0 && snap.person.target < n));
    for (const r of snap.robots) assert.ok(r.progress >= 0 && r.progress <= 1, `progress ${r.progress}`);
    const { robotsWaiting, personBusy } = sim.stats();
    assert.ok(Number.isFinite(robotsWaiting) && Number.isFinite(personBusy));
  }
});

test('same seed gives the same result', () => {
  const a = run(createSim({ robots: 8, mode: 'bursts', seed: 42 }), 1000).stats();
  const b = run(createSim({ robots: 8, mode: 'bursts', seed: 42 }), 1000).stats();
  assert.deepEqual(a, b);
});

test('a waiting robot is in the queue or being served, never both', () => {
  const sim = run(createSim({ robots: 10, mode: 'bursts', seed: 9 }), 300);
  const snap = sim.snapshot();
  snap.robots.forEach((r, i) => {
    const queued = snap.queue.includes(i);
    const served = snap.person.target === i;
    if (r.state === 'waiting') assert.ok(queued && !served, `robot ${i}`);
    if (r.state === 'served') assert.ok(served && !queued, `robot ${i}`);
    if (r.state === 'working') assert.ok(!queued && !served, `robot ${i}`);
  });
});

test('bursts mean more waiting whenever the person is not yet swamped', () => {
  for (const robots of [4, 6, 9]) {
    const scattered = waiting(robots, 'scattered', 1);
    const bursts = waiting(robots, 'bursts', 1);
    assert.ok(bursts > scattered + 0.05, `${robots} robots: scattered ${scattered.toFixed(3)}, bursts ${bursts.toFixed(3)}`);
  }
});

test('switching to bursts never visibly lowers waiting, even when swamped', () => {
  for (const robots of [10, 11, 12]) {
    const scattered = waiting(robots, 'scattered', 1);
    const bursts = waiting(robots, 'bursts', 1);
    assert.ok(bursts > scattered - 0.04, `${robots} robots: scattered ${scattered.toFixed(3)}, bursts ${bursts.toFixed(3)}`);
  }
});

test('both timings ask for about the same help per unit of work', () => {
  const helpPerWork = (robots, mode) => {
    const sim = createSim({ robots, mode, seed: 1 });
    let work = 0;
    let helps = 0;
    let prevTarget = null;
    for (let t = 0; t < 5000; t += 0.1) {
      sim.step(0.1);
      const snap = sim.snapshot();
      work += snap.robots.filter((r) => r.state === 'working').length * 0.1;
      if (snap.person.target !== null && snap.person.target !== prevTarget) helps++;
      prevTarget = snap.person.target;
    }
    return helps / work;
  };
  for (const robots of [3, 6, 12]) {
    const ratio = helpPerWork(robots, 'bursts') / helpPerWork(robots, 'scattered');
    assert.ok(ratio > 0.85 && ratio < 1.18, `${robots} robots: help-per-work ratio ${ratio.toFixed(2)}`);
  }
});
