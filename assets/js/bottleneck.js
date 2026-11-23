// Draws the bottleneck toy (bottleneck-sim.mjs) in the homepage hero and wires up its controls.
import { createSim, createClock } from './bottleneck-sim.mjs';
import { LAYOUT, slot, standAt, HOME, robotMarkup, personMarkup, BAR_WIDTH } from './bottleneck-figures.mjs';

const figure = document.querySelector('[data-sim]');
if (figure) start(figure);

function start(figure) {
  const svg = figure.querySelector('svg.sim');
  const controls = figure.querySelector('.sim__controls');
  const range = figure.querySelector('#robots');
  const output = figure.querySelector('#robots-value');
  const toggle = figure.querySelector('.sim__toggle');
  const stepButton = figure.querySelector('.sim__step');
  const readout = figure.querySelector('[data-readout]');
  const announce = figure.querySelector('[data-announce]');
  const timing = () => figure.querySelector('input[name="timing"]:checked')?.value ?? 'scattered';

  const SPEED = 1.2; // sim time units per second of real time
  const DT = 0.1; // sim step
  const TAU = 8; // readout smoothing window, in sim units (about 7 s of real time)
  const WALK = 0.18; // share of the remaining distance the person covers each frame

  const sim = createSim({ robots: +range.value, mode: timing() });
  sim.step(40); // start from a settled state rather than an empty one
  let { robotsWaiting: waitAvg, personBusy: busyAvg } = sim.stats();

  // Replace the still frame with the live drawing.
  svg.innerHTML = Array.from({ length: 12 }, (_, i) => robotMarkup(i, 'empty')).join('')
    + '<line class="sim__link"/>' + personMarkup(HOME.x, HOME.y);
  const robots = [...svg.querySelectorAll('.robot')].map((g) => ({ g, bar: g.querySelector('.robot__bar'), state: 'empty' }));
  const link = svg.querySelector('.sim__link');
  const person = svg.querySelector('.person');
  const pos = { ...HOME };

  function draw(snap, ease) {
    robots.forEach((r, i) => {
      const robot = snap.robots[i];
      const state = robot ? robot.state : 'empty';
      if (state !== r.state) { r.g.setAttribute('class', `robot is-${state}`); r.state = state; }
      r.bar.setAttribute('width', (state === 'working' ? robot.progress * BAR_WIDTH : 0).toFixed(1));
    });
    const t = snap.person.target;
    const goal = t === null ? HOME : standAt(t);
    pos.x += (goal.x - pos.x) * ease;
    pos.y += (goal.y - pos.y) * ease;
    person.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`);
    const arrived = t !== null && Math.hypot(goal.x - pos.x, goal.y - pos.y) < 6;
    link.style.display = arrived ? '' : 'none';
    if (arrived) {
      const { x, y } = slot(t);
      link.setAttribute('x1', x + LAYOUT.SIZE / 2);
      link.setAttribute('y1', y + 92);
      link.setAttribute('x2', pos.x.toFixed(1));
      link.setAttribute('y2', (pos.y - 40).toFixed(1));
    }
  }

  function advance(steps) {
    const k = 1 - Math.exp(-DT / TAU);
    for (let s = 0; s < steps; s++) {
      sim.step(DT);
      const snap = sim.snapshot();
      waitAvg += (snap.robots.filter((r) => r.state === 'waiting').length / snap.robots.length - waitAvg) * k;
      busyAvg += ((snap.person.target === null ? 0 : 1) - busyAvg) * k;
    }
  }

  const text = () => `Robots waiting ${Math.round(waitAvg * 100)}% · Person busy ${Math.round(busyAvg * 100)}%`;
  let lastText = 0;
  function updateReadout(force) {
    const now = performance.now();
    if (!force && now - lastText < 1000) return;
    lastText = now;
    readout.textContent = text();
  }

  // Screen readers hear the result once, a few seconds after a setting changes, not every second.
  let announceTimer = null;
  function announceSoon() {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      announce.textContent = `${range.value} robots per person, help ${timing() === 'bursts' ? 'in bursts' : 'scattered'}: ${text()}`;
    }, 5000);
  }

  let playing = false;
  let frame = null;
  let last = null;
  const clock = createClock({ speed: SPEED, dt: DT });
  function loop(now) {
    const seconds = last === null ? 0 : (now - last) / 1000;
    last = now;
    advance(clock(seconds));
    draw(sim.snapshot(), WALK);
    updateReadout(false);
    frame = requestAnimationFrame(loop);
  }
  const run = () => { if (frame === null) { last = null; frame = requestAnimationFrame(loop); } };
  const halt = () => { if (frame !== null) { cancelAnimationFrame(frame); frame = null; } };
  const sync = () => (playing && !document.hidden ? run() : halt());
  function setPlaying(on) {
    playing = on;
    toggle.textContent = on ? 'Pause' : 'Play';
    if (on) stepButton.setAttribute('hidden', ''); else stepButton.removeAttribute('hidden');
    sync();
  }

  // While paused, a settings change jumps ahead 20 sim units so the drawing and readout reflect it.
  function settingsChanged() {
    if (!playing) { advance(Math.round(20 / DT)); draw(sim.snapshot(), 1); updateReadout(true); }
    announceSoon();
  }
  range.addEventListener('input', () => {
    output.value = range.value;
    output.textContent = range.value;
    sim.setRobots(+range.value);
    draw(sim.snapshot(), 1);
    settingsChanged();
  });
  figure.querySelectorAll('input[name="timing"]').forEach((r) => r.addEventListener('change', () => { sim.setMode(timing()); settingsChanged(); }));
  toggle.addEventListener('click', () => setPlaying(!playing));
  stepButton.addEventListener('click', () => { advance(Math.round(5 / DT)); draw(sim.snapshot(), 1); updateReadout(true); });
  document.addEventListener('visibilitychange', sync);

  controls.removeAttribute('hidden');
  readout.removeAttribute('hidden');
  draw(sim.snapshot(), 1);
  updateReadout(true);

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  setPlaying(!still.matches);
  still.addEventListener?.('change', (e) => setPlaying(!e.matches));
}
