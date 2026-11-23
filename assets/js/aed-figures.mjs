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

const volunteer = (x, y, cls) => `<g class="aed__volunteer ${cls}" transform="translate(${f1(x)} ${f1(y)})"><circle cy="-6" r="3.4"/><path d="M-6 6V3.5C-6-1 6-1 6 3.5V6Z"/></g>`;
const aedBox = (x, y, cls = '') => `<g class="aed__aed${cls}" transform="translate(${f1(x)} ${f1(y)})"><rect x="-8" y="-8" width="16" height="16"/><path d="M-4 0H4M0-4V4"/></g>`;
function car(x, y, cls, busy) {
  return `<g class="aed__car ${cls}" transform="translate(${f1(x)} ${f1(y)})"><rect x="-11" y="-6" width="22" height="12"/>`
    + (busy ? '<circle class="aed__passenger" r="2.6"/>' : '') + '</g>';
}
function patient(ph, result) {
  const cls = !ph.alert ? '' : result === true ? ' is-in-time' : result === false ? ' is-missed' : ' is-waiting';
  const remaining = ph.alert ? 1 - ph.f : 1;
  return `<g class="aed__patient${cls}" transform="translate(${PATIENT.x} ${PATIENT.y})">`
    + (ph.alert ? `<circle class="aed__clock-track" r="${RING}"/><circle class="aed__clock" r="${RING}" transform="rotate(-90)" stroke-dasharray="${f1(RING_LEN)}" stroke-dashoffset="${f1(RING_LEN * (1 - remaining))}"/>` : '')
    + '<circle class="aed__heart" r="7"/><path class="aed__pulse" d="M-5 0H-2L-1-3 1 3 2 0H5"/>'
    + '</g>';
}

// Result once known: true = arrived in time, false = missed, null = still running.
function staticResult(route, ph) {
  if (!ph.alert || ph.grow < 1) return null;
  if (route) return staticPathAt(route, ph.f).arrived ? true : (ph.over ? false : null);
  return ph.over ? false : null;
}
function mobileResult(route, ph) {
  if (!ph.alert || ph.grow < 1) return null;
  if (route) return mobilePathAt(route, ph.f).arrived ? true : (ph.over ? false : null);
  return ph.over ? false : null;
}

export function renderPanel(kind, scene, t) {
  const ph = phase(t);
  const out = [];
  if (kind === 'static') {
    const { circles, inRange, route } = solveStatic(scene);
    if (ph.alert) for (const { site, r } of circles) if (r > 0) out.push(`<circle class="aed__reach" cx="${site.x}" cy="${site.y}" r="${f1(r * ph.grow)}"/>`);
    if (route && ph.grow >= 1 && ph.f > 0) {
      const at = staticPathAt(route, ph.f);
      const pts = at.carrying ? [route.volunteer, route.site, at.point] : [route.volunteer, at.point];
      out.push(`<polyline class="aed__trail" points="${pts.map((p) => `${f1(p.x)},${f1(p.y)}`).join(' ')}"/>`);
    }
    scene.sites.forEach((s) => out.push(aedBox(s.x, s.y, route && ph.f > 0 && s === route.site && staticPathAt(route, ph.f).carrying ? ' is-taken' : '')));
    scene.volunteers.forEach((v, i) => {
      if (route && ph.grow >= 1 && ph.f > 0 && v === route.volunteer) return;
      out.push(volunteer(v.x, v.y, !ph.alert || ph.grow < 1 ? 'is-idle' : inRange[i] ? 'is-in-range' : 'is-out-of-range'));
    });
    out.push(patient(ph, staticResult(route, ph)));
    if (route && ph.grow >= 1 && ph.f > 0) {
      const at = staticPathAt(route, ph.f);
      out.push(`<g class="aed__walker${at.carrying ? ' is-carrying' : ''}" transform="translate(${f1(at.point.x)} ${f1(at.point.y)})"><circle cy="-7" r="4"/><path d="M-7 7V4C-7-1 7-1 7 4V7Z"/>`
        + (at.carrying ? '<g class="aed__carried" transform="translate(9 2)"><rect x="-4.5" y="-4.5" width="9" height="9"/><path d="M-2.2 0H2.2M0-2.2V2.2"/></g>' : '') + '</g>');
    }
  } else {
    const { inCircle, route } = solveMobile(scene);
    if (ph.alert) out.push(`<circle class="aed__reach" cx="${PATIENT.x}" cy="${PATIENT.y}" r="${f1(REACH.drive * ph.grow)}"/>`);
    const tAlert = t - TIMING.pre;
    let driver = null;
    if (route && ph.grow >= 1 && ph.f > 0) {
      const at = mobilePathAt(route, ph.f);
      driver = at.point;
      out.push(`<line class="aed__trail" x1="${route.car.x}" y1="${route.car.y}" x2="${f1(at.point.x)}" y2="${f1(at.point.y)}"/>`);
    }
    scene.cars.forEach((c, i) => {
      if (driver && c === route.car) return;
      const frozen = route && c === route.car && ph.alert;
      const p = frozen ? c : carAt(c, tAlert);
      const reach = !ph.alert || ph.grow < 1 ? '' : inCircle[i] ? ' is-within' : ' is-beyond';
      out.push(car(p.x, p.y, (c.busy ? 'is-busy' : 'is-available') + reach, c.busy));
    });
    out.push(patient(ph, mobileResult(route, ph)));
    if (driver) out.push(car(driver.x, driver.y, 'is-dispatched', false));
  }
  return out.join('');
}

export function outcomeText(kind, scene, t) {
  const ph = phase(t);
  if (kind === 'static') {
    const { route } = solveStatic(scene);
    const r = staticResult(route, ph);
    if (r === true) return `In time: arrives at ${Math.round(staticPathAt(route, 1).arrivedAt * 100)}% of the window.`;
    if (r === false) return 'Missed. No volunteer can fetch an AED and reach the patient in time.';
    return '';
  }
  const { route } = solveMobile(scene);
  const r = mobileResult(route, ph);
  if (r === true) return `In time: arrives at ${Math.round(mobilePathAt(route, 1).arrivedAt * 100)}% of the window.`;
  if (r === false) return 'Missed. Every car within reach is busy with a passenger.';
  return '';
}

const LABELS = {
  static: 'Fixed-site AED map: the patient at the centre, AEDs with pickup circles, and volunteers inside or outside them',
  mobile: 'Vehicle-carried AED map: the patient at the centre, one driving circle, and cars that are idle or busy',
};
export function panelSvg(kind, scene, t) {
  return `<svg class="aed__map" viewBox="0 0 ${MAP.w} ${MAP.h}" role="img" aria-label="${LABELS[kind]}" data-aed-panel="${kind}">${renderPanel(kind, scene, t)}</svg>`;
}
