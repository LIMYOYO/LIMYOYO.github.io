// Geometry and timing for the "Moving Lifelines" illustration: who can bring an AED to the patient within τ.
// Map units are arbitrary; it illustrates the mechanism and claims no results.
//
// Fixed-site AED: a volunteer walks to an AED, then carries it to the patient. With walking reach
//   ℓs = vs·τ, an AED at distance d from the patient can be fetched by any volunteer within ℓs − d of it.
// Vehicle-carried AED: a car drives straight to the patient. With driving reach ℓm = vm·τ, any car
//   within ℓm can make it, but only if it is not busy with a passenger.

export const MAP = { w: 400, h: 340 };
export const PATIENT = { x: 200, y: 170 };
export const REACH = { walk: 130, drive: 150 };
const DRIFT = 4; // ambient car speed, map units per second

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const SCENES = [
  {
    id: 'typical',
    title: 'A typical call',
    note: 'A volunteer near an AED fetches it in time; an idle car nearby drives straight in.',
    sites: [{ x: 150, y: 140 }, { x: 290, y: 215 }],
    volunteers: [{ x: 110, y: 110 }, { x: 300, y: 235 }, { x: 60, y: 250 }, { x: 335, y: 85 }, { x: 230, y: 305 }],
    cars: [
      { x: 110, y: 100, busy: false, dir: 1 }, { x: 300, y: 250, busy: true, dir: -1 },
      { x: 330, y: 60, busy: false, dir: 1 }, { x: 55, y: 235, busy: true, dir: 1 }, { x: 240, y: 300, busy: false, dir: -1 },
    ],
  },
  {
    id: 'far-aeds',
    title: 'The AEDs are far away',
    note: 'Far AEDs leave tiny pickup circles. Volunteers right beside the patient still cannot help.',
    sites: [{ x: 105, y: 120 }, { x: 300, y: 250 }],
    volunteers: [{ x: 175, y: 150 }, { x: 228, y: 196 }, { x: 160, y: 205 }, { x: 250, y: 140 }, { x: 200, y: 235 }, { x: 140, y: 175 }, { x: 60, y: 60 }],
    cars: [
      { x: 260, y: 110, busy: false, dir: 1 }, { x: 120, y: 250, busy: true, dir: -1 },
      { x: 60, y: 120, busy: false, dir: -1 }, { x: 345, y: 280, busy: true, dir: 1 }, { x: 150, y: 50, busy: true, dir: 1 },
    ],
  },
  {
    id: 'rush-hour',
    title: 'Rush hour',
    note: 'Every car within reach is carrying a passenger. The idle ones are too far away.',
    sites: [{ x: 165, y: 195 }, { x: 270, y: 120 }],
    volunteers: [{ x: 120, y: 230 }, { x: 300, y: 95 }, { x: 70, y: 90 }, { x: 330, y: 270 }, { x: 205, y: 300 }],
    cars: [
      { x: 150, y: 120, busy: true, dir: 1 }, { x: 260, y: 220, busy: true, dir: -1 }, { x: 120, y: 255, busy: true, dir: 1 },
      { x: 290, y: 115, busy: true, dir: -1 }, { x: 375, y: 305, busy: false, dir: 1 }, { x: 28, y: 60, busy: false, dir: -1 },
    ],
  },
];

export function solveStatic(scene) {
  const circles = scene.sites.map((site) => {
    const d = dist(site, PATIENT);
    return { site, r: d < REACH.walk ? REACH.walk - d : 0 };
  });
  const inRange = scene.volunteers.map((v) => circles.some(({ site, r }) => r > 0 && dist(v, site) <= r));
  let route = null;
  for (const volunteer of scene.volunteers) {
    for (const { site, r } of circles) {
      if (r <= 0 || dist(volunteer, site) > r) continue;
      const leg1 = dist(volunteer, site);
      const leg2 = dist(site, PATIENT);
      if (!route || leg1 + leg2 < route.distance) route = { volunteer, site, leg1, leg2, distance: leg1 + leg2 };
    }
  }
  return { circles, inRange, route };
}

export function solveMobile(scene) {
  const inCircle = scene.cars.map((c) => dist(c, PATIENT) <= REACH.drive);
  let route = null;
  scene.cars.forEach((car, i) => {
    if (!inCircle[i] || car.busy) return;
    const d = dist(car, PATIENT);
    if (!route || d < route.distance) route = { car, distance: d };
  });
  return { inCircle, route };
}

const lerp = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });

// Where the walker is after a fraction f of τ has passed (walking ℓs per τ).
export function staticPathAt(route, f) {
  const s = Math.max(0, f) * REACH.walk;
  const arrivedAt = route.distance / REACH.walk;
  if (s < route.leg1) return { point: lerp(route.volunteer, route.site, s / route.leg1), carrying: false, arrived: false, arrivedAt };
  if (s < route.distance) return { point: lerp(route.site, PATIENT, (s - route.leg1) / route.leg2), carrying: true, arrived: false, arrivedAt };
  return { point: { ...PATIENT }, carrying: true, arrived: true, arrivedAt };
}

// Where the dispatched car is after a fraction f of τ has passed (driving ℓm per τ).
export function mobilePathAt(route, f) {
  const s = Math.max(0, f) * REACH.drive;
  const arrivedAt = route.distance / REACH.drive;
  if (s < route.distance) return { point: lerp(route.car, PATIENT, s / route.distance), arrived: false, arrivedAt };
  return { point: { ...PATIENT }, arrived: true, arrivedAt };
}

// Ambient motion: a car circles the patient at constant radius, t seconds from the alert.
export function carAt(car, t) {
  const r = dist(car, PATIENT);
  const a0 = Math.atan2(car.y - PATIENT.y, car.x - PATIENT.x);
  const a = a0 + (car.dir || 1) * (DRIFT * t) / Math.max(r, 1);
  return { x: PATIENT.x + r * Math.cos(a), y: PATIENT.y + r * Math.sin(a) };
}
