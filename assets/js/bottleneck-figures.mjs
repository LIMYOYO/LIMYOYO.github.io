// Drawing for the hero: where the twelve robot slots sit, and the SVG for a robot and for the person.
// Used by the browser widget and by tools/make-hero-snapshot.mjs (the still frame shown before JS runs).

export const LAYOUT = { COLS: 6, SIZE: 96, GAPX: 32, GAPY: 56, X0: 28, Y0: 24, W: 792, H: 330 };

export function slot(i) {
  const { COLS, SIZE, GAPX, GAPY, X0, Y0 } = LAYOUT;
  return { x: X0 + (i % COLS) * (SIZE + GAPX), y: Y0 + Math.floor(i / COLS) * (SIZE + GAPY) };
}

// Where the person stands when helping robot i: in the gap just below it.
export function standAt(i) {
  const { x, y } = slot(i);
  return { x: x + LAYOUT.SIZE / 2, y: y + LAYOUT.SIZE + 44 };
}

// Where the person waits when nobody needs help: between the two rows, in the middle.
export const HOME = { x: LAYOUT.W / 2, y: LAYOUT.Y0 + LAYOUT.SIZE + 46 };

const BAR = { x: 18, y: 76, w: 60, h: 8 };

// A robot in its slot. The body, eyes and antenna are line drawing; the work bar fills as the job runs.
// state: working | waiting | served | empty. progress: 0..1.
export function robotMarkup(i, state, progress = 0) {
  const { x, y } = slot(i);
  const w = (state === 'working' ? progress : 0) * BAR.w;
  return `<g class="robot is-${state}" data-robot="${i}" transform="translate(${x} ${y})">`
    + '<line class="robot__antenna" x1="48" y1="20" x2="48" y2="8"/><circle class="robot__antenna" cx="48" cy="6" r="4"/>'
    + '<rect class="robot__body" x="8" y="20" width="80" height="72"/>'
    + '<rect class="robot__eye" x="28" y="40" width="10" height="10"/><rect class="robot__eye" x="58" y="40" width="10" height="10"/>'
    + `<rect class="robot__track" x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}"/>`
    + `<rect class="robot__bar" x="${BAR.x}" y="${BAR.y}" width="${w.toFixed(1)}" height="${BAR.h}"/>`
    + '<g class="robot__alert"><line x1="76" y1="0" x2="76" y2="10"/><circle cx="76" cy="15" r="1.8"/></g>'
    + '</g>';
}

export const BAR_WIDTH = BAR.w;

// The person: a head and shoulders, standing with feet at (x, y).
export function personMarkup(x, y) {
  return `<g class="person" transform="translate(${x} ${y})">`
    + '<circle class="person__head" cx="0" cy="-31" r="7"/>'
    + '<path class="person__body" d="M-12 0 V-12 Q-12 -21 -3 -21 H3 Q12 -21 12 -12 V0 Z"/>'
    + '</g>';
}

// The still frame: six robots, two waiting, one being helped, the rest of the grid empty.
export function snapshotSvg() {
  const states = [['working', 0.55], ['waiting', 0], ['working', 0.85], ['served', 0], ['working', 0.2], ['waiting', 0]];
  const robots = Array.from({ length: 12 }, (_, i) => robotMarkup(i, states[i]?.[0] ?? 'empty', states[i]?.[1] ?? 0)).join('\n  ');
  const at = standAt(3);
  const { x, y } = slot(3);
  return `<svg class="sim" viewBox="0 0 ${LAYOUT.W} ${LAYOUT.H}" role="img" aria-label="Robots work, stop when they need help, and one person helps them one at a time">\n  ${robots}\n  <line class="sim__link" x1="${x + LAYOUT.SIZE / 2}" y1="${y + 92}" x2="${at.x}" y2="${at.y - 40}"/>\n  ${personMarkup(at.x, at.y)}\n</svg>`;
}
