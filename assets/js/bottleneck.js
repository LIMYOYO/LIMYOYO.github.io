// Draws the bottleneck toy (bottleneck-sim.mjs) in the homepage hero and wires up its controls.
import { createSim } from './bottleneck-sim.mjs';

const figure = document.querySelector('[data-sim]');
if (figure) start(figure);

function start(figure) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = figure.querySelector('svg.sim');
  const controls = figure.querySelector('.sim__controls');
  const range = figure.querySelector('#robots');
  const output = figure.querySelector('#robots-value');
  const stepButton = figure.querySelector('.sim__step');
  const readout = figure.querySelector('[data-readout]');
  const timing = () => figure.querySelector('input[name="timing"]:checked')?.value ?? 'scattered';

  const SPEED = 1.2; // simulated time units per second
  const TAU = 8; // smoothing window of the readout, in simulated time units
  const COLS = 4;
  const SIZE = 104;
  const GAP = 28;
  const ORIGIN = { x: 28, y: 24 };
  const slot = (i) => ({ x: ORIGIN.x + (i % COLS) * (SIZE + GAP), y: ORIGIN.y + Math.floor(i / COLS) * (SIZE + GAP) });

  const sim = createSim({ robots: +range.value, mode: timing() });
  sim.step(40); // start from a settled state rather than an empty one
  let { robotsWaiting: waitAvg, personBusy: busyAvg } = sim.stats();

  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent.appendChild(node);
    return node;
  };
  const robots = Array.from({ length: 12 }, (_, i) => {
    const { x, y } = slot(i);
    const g = el('g', { class: 'robot' }, svg);
    el('rect', { class: 'robot__frame', x, y, width: SIZE, height: SIZE }, g);
    const fill = el('rect', { class: 'robot__fill', x, y: y + SIZE, width: SIZE, height: 0 }, g);
    return { g, fill, x, y };
  });
  const link = el('line', { class: 'sim__link' }, svg);
  const person = el('circle', { class: 'sim__person', r: 10 }, svg);
  const home = { x: 280, y: 424 };
  const pos = { ...home };

  function draw(snap, ease) {
    robots.forEach((r, i) => {
      const robot = snap.robots[i];
      r.g.setAttribute('class', `robot is-${robot ? robot.state : 'empty'}`);
      if (!robot) return;
      const h = robot.state === 'working' ? robot.progress * SIZE : 0;
      r.fill.setAttribute('y', r.y + SIZE - h);
      r.fill.setAttribute('height', h);
    });
    const t = snap.person.target;
    const goal = t === null ? home : { x: robots[t].x + SIZE / 2, y: robots[t].y + SIZE + 22 };
    pos.x += (goal.x - pos.x) * ease;
    pos.y += (goal.y - pos.y) * ease;
    person.setAttribute('cx', pos.x.toFixed(1));
    person.setAttribute('cy', pos.y.toFixed(1));
    if (t === null) link.style.display = 'none';
    else {
      link.style.display = '';
      link.setAttribute('x1', robots[t].x + SIZE / 2);
      link.setAttribute('y1', robots[t].y + SIZE);
      link.setAttribute('x2', pos.x.toFixed(1));
      link.setAttribute('y2', (pos.y - 10).toFixed(1));
    }
  }

  function advance(units) {
    // Smooth the readout over a short window so it reacts within seconds.
    const dt = 0.1;
    for (let t = 0; t < units; t += dt) {
      sim.step(dt);
      const snap = sim.snapshot();
      const k = 1 - Math.exp(-dt / TAU);
      waitAvg += (snap.robots.filter((r) => r.state === 'waiting').length / snap.robots.length - waitAvg) * k;
      busyAvg += ((snap.person.target === null ? 0 : 1) - busyAvg) * k;
    }
  }

  let lastText = 0;
  function updateReadout(force) {
    const now = performance.now();
    if (!force && now - lastText < 1000) return;
    lastText = now;
    readout.textContent = `Robots waiting ${Math.round(waitAvg * 100)}% · Person busy ${Math.round(busyAvg * 100)}%`;
  }

  range.addEventListener('input', () => {
    output.value = range.value;
    output.textContent = range.value;
    sim.setRobots(+range.value);
    draw(sim.snapshot(), 1);
  });
  figure.querySelectorAll('input[name="timing"]').forEach((r) => r.addEventListener('change', () => sim.setMode(timing())));

  for (const node of [svg, controls, readout]) node.removeAttribute('hidden');
  draw(sim.snapshot(), 1);
  updateReadout(true);

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches) {
    stepButton.removeAttribute('hidden');
    stepButton.addEventListener('click', () => {
      advance(5);
      draw(sim.snapshot(), 1);
      updateReadout(true);
    });
    return;
  }

  let frame = null;
  let last = null;
  function loop(now) {
    const seconds = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    advance(seconds * SPEED);
    draw(sim.snapshot(), 0.25);
    updateReadout(false);
    frame = requestAnimationFrame(loop);
  }
  const play = () => { if (frame === null) { last = null; frame = requestAnimationFrame(loop); } };
  const pause = () => { if (frame !== null) { cancelAnimationFrame(frame); frame = null; } };
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  if (!document.hidden) play();
}
