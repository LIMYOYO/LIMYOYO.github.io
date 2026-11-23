// Draws one panel of the Moving Lifelines illustration at a given moment of a scene.
// Used by the browser widget (aed.js) and by tools/make-aed-snapshot.mjs for the still frame.
import { MAP, PATIENT, REACH, solveStatic, solveMobile, staticPathAt, mobilePathAt, carAt } from './aed-scenes.mjs';

// Seconds: ambient motion before the alert, circles growing in, the τ window, then the result held.
export const TIMING = { pre: 1.2, grow: 0.8, tau: 6, hold: 2.6 };
export const SCENE_SECONDS = TIMING.pre + TIMING.grow + TIMING.tau + TIMING.hold;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const f1 = (n) => n.toFixed(1);
const RING = 18;
const RING_LEN = 2 * Math.PI * RING;

function phase(t) {
  return {
    alert: t >= TIMING.pre,
    grow: clamp01((t - TIMING.pre) / TIMING.grow),
    f: clamp01((t - TIMING.pre - TIMING.grow) / TIMING.tau),
    over: t >= TIMING.pre + TIMING.grow + TIMING.tau,
  };
}

const volunteer = (x, y, cls) => `<g class="aed__volunteer ${cls}" transform="translate(${f1(x)} ${f1(y)}) scale(1.3)"><circle cy="-6" r="3.4"/><path d="M-6 6V3.5C-6-1 6-1 6 3.5V6Z"/></g>`;
const aedBox = (x, y, cls = '') => `<g class="aed__aed${cls}" transform="translate(${f1(x)} ${f1(y)}) scale(1.2)"><rect x="-8" y="-8" width="16" height="16"/><path d="M-4 0H4M0-4V4"/></g>`;
function car(x, y, cls, busy) {
  return `<g class="aed__car ${cls}" transform="translate(${f1(x)} ${f1(y)}) scale(1.2)"><rect x="-11" y="-6" width="22" height="12"/>`
    + (busy ? '<circle class="aed__passenger" r="2.6"/>' : '') + '</g>';
}
function patient(ph, result) {
  const cls = !ph.alert ? '' : result === true ? ' is-in-time' : result === false ? ' is-missed' : ' is-waiting';
  const remaining = ph.alert ? 1 - ph.f : 1;
  return `<g class="aed__patient${cls}" transform="translate(${PATIENT.x} ${PATIENT.y})">`
    + (ph.alert ? `<circle class="aed__clock-track" r="${RING}"/><circle class="aed__clock" r="${RING}" transform="rotate(-90)" stroke-dasharray="${f1(RING_LEN)}" stroke-dashoffset="${f1(RING_LEN * (1 - remaining))}"/>` : '')
    + (ph.alert ? `<text class="aed__tau" x="${RING + 6}" y="${-RING + 4}">τ</text>` : '')
    + '<circle class="aed__heart" r="8"/><path class="aed__pulse" d="M-5.5 0H-2.2L-1-3.4 1 3.4 2.2 0H5.5"/>'
    + '</g>';
}

// A radius drawn from a circle's centre at angle a (radians), labelled at its outer end.
function radiusLabel(c, r, a, label) {
  const x = c.x + r * Math.cos(a);
  const y = c.y + r * Math.sin(a);
  const lx = c.x + (r + 10) * Math.cos(a);
  const ly = c.y + (r + 10) * Math.sin(a);
  const anchor = Math.cos(a) >= 0 ? 'start' : 'end';
  return `<line class="aed__radius" x1="${c.x}" y1="${c.y}" x2="${f1(x)}" y2="${f1(y)}"/><text class="aed__label" x="${f1(lx)}" y="${f1(ly)}" text-anchor="${anchor}">${label}</text>`;
}
const pts = (list) => list.map((p) => `${f1(p.x)},${f1(p.y)}`).join(' ');
// Arrivals gather in a small ring around the patient so they do not hide each other.
const gather = (i, n) => {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
  return { x: PATIENT.x + 30 * Math.cos(a), y: PATIENT.y + 30 * Math.sin(a) };
};
// Status of one responder at fraction f of τ: moving, arrived (in time), or failed (window closed first).
const status = (arrived, ph) => (arrived ? ' is-arrived' : ph.over ? ' is-failed' : '');
// Patient result: true once anyone has arrived, false if the window closed with nobody, null while running.
function patientResult(anyArrived, ph) {
  if (!ph.alert || ph.grow < 1) return null;
  return anyArrived ? true : ph.over ? false : null;
}

export function renderPanel(kind, scene, t) {
  const ph = phase(t);
  const racing = ph.alert && ph.grow >= 1;
  const out = [];
  if (kind === 'static') {
    const { circles, inRange, routes } = solveStatic(scene);
    if (ph.alert) for (const { site, r } of circles) if (r > 0) out.push(`<circle class="aed__reach" cx="${site.x}" cy="${site.y}" r="${f1(r * ph.grow)}"/>`);
    if (ph.alert && ph.grow >= 1) {
      const big = circles.filter((c) => c.r > 0).sort((a, b) => b.r - a.r)[0];
      if (big) out.push(radiusLabel(big.site, big.r, -2.3, 'ℓˢ − d'));
    }
    const states = routes.map((r) => staticPathAt(r, ph.f));
    if (racing && ph.f > 0) {
      routes.forEach((r, i) => {
        const at = states[i];
        const line = at.carrying ? [r.volunteer, r.site, at.point] : [r.volunteer, at.point];
        out.push(`<polyline class="aed__trail${status(at.arrived, ph)}" points="${pts(line)}"/>`);
      });
    }
    scene.sites.forEach((site) => out.push(aedBox(site.x, site.y)));
    out.push(patient(ph, patientResult(states.some((x) => x.arrived) && racing, ph)));
    const nArrived = states.filter((x) => x.arrived).length;
    let k = 0;
    routes.forEach((r, i) => {
      if (!racing || ph.f === 0) {
        const v = r.volunteer;
        out.push(volunteer(v.x, v.y, !racing ? 'is-idle' : inRange[i] ? 'is-in-range' : 'is-out-of-range'));
        return;
      }
      const at = states[i];
      const p = at.arrived ? gather(k++, nArrived) : at.point;
      out.push(`<g class="aed__walker${at.carrying ? ' is-carrying' : ''}${status(at.arrived, ph)}" transform="translate(${f1(p.x)} ${f1(p.y)}) scale(1.3)"><circle cy="-6" r="3.4"/><path d="M-6 6V3.5C-6-1 6-1 6 3.5V6Z"/>`
        + (at.carrying ? '<g class="aed__carried" transform="translate(8 1)"><rect x="-4" y="-4" width="8" height="8"/><path d="M-2 0H2M0-2V2"/></g>' : '') + '</g>');
    });
  } else {
    const { routes } = solveMobile(scene);
    if (ph.alert) out.push(`<circle class="aed__reach" cx="${PATIENT.x}" cy="${PATIENT.y}" r="${f1(REACH.drive * ph.grow)}"/>`);
    if (ph.alert && ph.grow >= 1) out.push(radiusLabel(PATIENT, REACH.drive, -1.75, 'ℓᵐ'));
    const tAlert = t - TIMING.pre;
    const states = new Map(routes.map((r) => [r.car, mobilePathAt(r, ph.f)]));
    if (racing && ph.f > 0) {
      routes.forEach((r) => {
        const at = states.get(r.car);
        out.push(`<line class="aed__trail${status(at.arrived, ph)}" x1="${r.car.x}" y1="${r.car.y}" x2="${f1(at.point.x)}" y2="${f1(at.point.y)}"/>`);
      });
    }
    out.push(patient(ph, patientResult([...states.values()].some((x) => x.arrived) && racing, ph)));
    const nArrived = [...states.values()].filter((x) => x.arrived).length;
    let k = 0;
    scene.cars.forEach((c) => {
      if (c.busy) { const p = carAt(c, tAlert); out.push(car(p.x, p.y, 'is-busy', true)); return; }
      if (!ph.alert) { const p = carAt(c, tAlert); out.push(car(p.x, p.y, 'is-available', false)); return; }
      const at = states.get(c);
      const moving = racing && ph.f > 0;
      const p = moving ? (at.arrived ? gather(k++, nArrived) : at.point) : c;
      out.push(car(p.x, p.y, `is-responding${moving ? status(at.arrived, ph) : ''}`, false));
    });
  }
  return out.join('');
}

export function outcomeText(kind, scene, t) {
  const ph = phase(t);
  if (!ph.over) return '';
  if (kind === 'static') {
    const { routes } = solveStatic(scene);
    const ok = routes.filter((r) => r.ok).length;
    if (ok === 0) return 'No volunteer arrives in time: none starts inside a pickup circle.';
    return `${ok} of ${routes.length} volunteers arrive in time. The others start too far from an AED.`;
  }
  const { routes } = solveMobile(scene);
  const ok = routes.filter((r) => r.ok).length;
  const busy = scene.cars.filter((c) => c.busy).length;
  if (ok === 0) return `No car arrives in time: every car within reach is busy (${busy} busy).`;
  return `${ok} of ${routes.length} idle cars arrive in time. ${busy} busy cars cannot respond.`;
}

const LABELS = {
  static: 'Fixed-site AED map: the patient at the centre, AEDs with pickup circles, and volunteers inside or outside them',
  mobile: 'Vehicle-carried AED map: the patient at the centre, one driving circle, and cars that are idle or busy',
};
export function panelSvg(kind, scene, t) {
  return `<svg class="aed__map" viewBox="0 0 ${MAP.w} ${MAP.h}" role="img" aria-label="${LABELS[kind]}" data-aed-panel="${kind}">${renderPanel(kind, scene, t)}</svg>`;
}
