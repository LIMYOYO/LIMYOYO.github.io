// Plays the Moving Lifelines illustration: three scenes in a loop, both panels on one τ clock.
import { SCENES } from './aed-scenes.mjs';
import { TIMING, SCENE_SECONDS, renderPanel, outcomeText } from './aed-figures.mjs';

const root = document.querySelector('#lifelines');
if (root) start(root);

function start(root) {
  const panels = { static: root.querySelector('[data-aed-panel="static"]'), mobile: root.querySelector('[data-aed-panel="mobile"]') };
  const outcomes = { static: root.querySelector('[data-aed-outcome="static"]'), mobile: root.querySelector('[data-aed-outcome="mobile"]') };
  const title = root.querySelector('[data-aed-title]');
  const note = root.querySelector('[data-aed-note]');
  const counter = root.querySelector('[data-aed-count]');
  const controls = root.querySelector('[data-aed-controls]');
  const toggle = root.querySelector('[data-aed-toggle]');
  const next = root.querySelector('[data-aed-next]');
  const announce = root.querySelector('[data-aed-announce]');
  const END = TIMING.pre + TIMING.grow + TIMING.tau + 0.01;

  let index = 0;
  let t = 0;
  let lastText = { static: null, mobile: null };

  function draw() {
    const scene = SCENES[index];
    for (const kind of ['static', 'mobile']) {
      panels[kind].innerHTML = renderPanel(kind, scene, t);
      const text = outcomeText(kind, scene, t);
      if (text !== lastText[kind]) { outcomes[kind].textContent = text || ' '; lastText[kind] = text; }
    }
  }
  function showScene(i, { atEnd = false, speak = false } = {}) {
    index = (i + SCENES.length) % SCENES.length;
    const scene = SCENES[index];
    t = atEnd ? END : 0;
    counter.textContent = `${index + 1} of ${SCENES.length}`;
    title.textContent = `${scene.title}.`;
    note.textContent = scene.note;
    draw();
    if (speak) {
      announce.textContent = `${scene.title}. ${scene.note} Fixed-site: ${outcomeText('static', scene, END)} Vehicle: ${outcomeText('mobile', scene, END)}`;
    }
  }

  let playing = false;
  let frame = null;
  let last = null;
  function loop(now) {
    const dt = last === null ? 0 : Math.min(1, (now - last) / 1000);
    last = now;
    t += dt;
    if (t >= SCENE_SECONDS) showScene(index + 1);
    else draw();
    frame = requestAnimationFrame(loop);
  }
  const run = () => { if (frame === null) { last = null; frame = requestAnimationFrame(loop); } };
  const halt = () => { if (frame !== null) { cancelAnimationFrame(frame); frame = null; } };
  const sync = () => (playing && !document.hidden && onScreen ? run() : halt());
  function setPlaying(on) {
    playing = on;
    toggle.textContent = on ? 'Pause' : 'Play';
    sync();
  }

  // Only animate while the section is on screen.
  let onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { onScreen = entries.some((e) => e.isIntersecting); sync(); }, { rootMargin: '100px' }).observe(root);
  }

  toggle.addEventListener('click', () => setPlaying(!playing));
  next.addEventListener('click', () => showScene(index + 1, { atEnd: !playing, speak: true }));
  document.addEventListener('visibilitychange', sync);

  controls.removeAttribute('hidden');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  showScene(0, { atEnd: still.matches });
  setPlaying(!still.matches);
  still.addEventListener?.('change', (e) => { if (e.matches) showScene(index, { atEnd: true }); setPlaying(!e.matches); });
}
