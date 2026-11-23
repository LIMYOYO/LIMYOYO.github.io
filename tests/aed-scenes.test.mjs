import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP, PATIENT, REACH, SCENES, solveStatic, solveMobile, staticPathAt, mobilePathAt, carAt } from '../assets/js/aed-scenes.mjs';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('there are three scenes: typical call, far AEDs, rush hour', () => {
  assert.deepEqual(SCENES.map((s) => s.id), ['typical', 'far-aeds', 'rush-hour']);
  for (const s of SCENES) assert.ok(s.title && s.note, s.id);
});

test('each scene produces the outcome its caption claims', () => {
  const expected = { typical: [true, true], 'far-aeds': [false, true], 'rush-hour': [true, false] };
  for (const s of SCENES) {
    assert.equal(solveStatic(s).routes.some((r) => r.ok), expected[s.id][0], `${s.id} static`);
    assert.equal(solveMobile(s).routes.some((r) => r.ok), expected[s.id][1], `${s.id} mobile`);
  }
});

test('every volunteer responds, heading for the AED with the shortest two-leg trip', () => {
  for (const s of SCENES) {
    const { routes } = solveStatic(s);
    assert.equal(routes.length, s.volunteers.length, s.id);
    routes.forEach((r) => {
      for (const site of s.sites) assert.ok(r.distance <= dist(r.volunteer, site) + dist(site, PATIENT) + 1e-9);
    });
  }
});

test('a volunteer arrives in time exactly when starting inside a pickup circle', () => {
  for (const s of SCENES) {
    const { routes, inRange } = solveStatic(s);
    routes.forEach((r, i) => assert.equal(r.ok, inRange[i], `${s.id} volunteer ${i}`));
  }
});

test('the typical call has volunteers and idle cars that make it and ones that do not', () => {
  const s = SCENES.find((x) => x.id === 'typical');
  const st = solveStatic(s).routes;
  const mo = solveMobile(s).routes;
  assert.ok(st.some((r) => r.ok) && st.some((r) => !r.ok));
  assert.ok(mo.some((r) => r.ok) && mo.some((r) => !r.ok));
});

test('every idle car drives; it arrives exactly when inside the driving circle; busy cars do not respond', () => {
  for (const s of SCENES) {
    const { routes, inCircle } = solveMobile(s);
    const idle = s.cars.filter((c) => !c.busy);
    assert.equal(routes.length, idle.length, s.id);
    routes.forEach((r) => {
      assert.ok(!r.car.busy);
      assert.equal(r.ok, inCircle[s.cars.indexOf(r.car)], s.id);
    });
  }
});

test('a pickup circle has radius walking reach minus the AED-to-patient distance', () => {
  for (const s of SCENES) {
    solveStatic(s).circles.forEach(({ site, r }) => {
      const d = dist(site, PATIENT);
      assert.equal(r, d < REACH.walk ? REACH.walk - d : 0);
    });
  }
});

test('a volunteer is in range exactly when inside some pickup circle', () => {
  for (const s of SCENES) {
    const { circles, inRange } = solveStatic(s);
    s.volunteers.forEach((v, i) => {
      const inside = circles.some(({ site, r }) => r > 0 && dist(v, site) <= r);
      assert.equal(inRange[i], inside, `${s.id} volunteer ${i}`);
    });
  }
});

test('far AEDs: many volunteers, some right next to the patient, none in range', () => {
  const s = SCENES.find((x) => x.id === 'far-aeds');
  assert.ok(s.volunteers.length >= 6);
  assert.ok(s.volunteers.some((v) => dist(v, PATIENT) < 60));
  assert.ok(solveStatic(s).inRange.every((x) => !x));
});

test('rush hour: several cars inside the driving circle, all busy', () => {
  const s = SCENES.find((x) => x.id === 'rush-hour');
  const { inCircle } = solveMobile(s);
  const inside = s.cars.filter((_, i) => inCircle[i]);
  assert.ok(inside.length >= 3);
  assert.ok(inside.every((c) => c.busy));
});

test('a volunteer out of range is still on the way when the window closes', () => {
  const s = SCENES.find((x) => x.id === 'far-aeds');
  const r = solveStatic(s).routes[0];
  const end = staticPathAt(r, 1);
  assert.ok(!end.arrived && dist(end.point, PATIENT) > 1);
});

test('the walker goes to the AED first, then to the patient, and arrives within the window', () => {
  const s = SCENES.find((x) => x.id === 'typical');
  const route = solveStatic(s).routes.find((r) => r.ok);
  assert.deepEqual(staticPathAt(route, 0).point, route.volunteer);
  const atSite = route.leg1 / REACH.walk;
  const mid = staticPathAt(route, atSite);
  assert.ok(dist(mid.point, route.site) < 1e-6 && mid.carrying);
  assert.ok(!staticPathAt(route, atSite * 0.5).carrying);
  const end = staticPathAt(route, 1);
  assert.ok(dist(end.point, PATIENT) < 1e-6 && end.arrived);
  assert.ok(end.arrivedAt <= 1);
});

test('the dispatched car drives straight to the patient within the window', () => {
  const s = SCENES.find((x) => x.id === 'typical');
  const route = solveMobile(s).routes.find((r) => r.ok);
  const half = mobilePathAt(route, 0.25);
  assert.ok(Math.abs(dist(half.point, route.car) - 0.25 * REACH.drive) < 1e-6);
  const end = mobilePathAt(route, 1);
  assert.ok(dist(end.point, PATIENT) < 1e-6 && end.arrived && end.arrivedAt <= 1);
});

test('cars drift around the patient without crossing the driving circle', () => {
  for (const s of SCENES) {
    s.cars.forEach((c, i) => {
      const r0 = dist(c, PATIENT);
      for (const t of [-2, 0, 4, 8]) {
        const r = dist(carAt(c, t), PATIENT);
        assert.equal(r <= REACH.drive, r0 <= REACH.drive, `${s.id} car ${i} at t=${t}`);
      }
    });
  }
});

test('everything stays on the map', () => {
  for (const s of SCENES) {
    for (const p of [...s.sites, ...s.volunteers, ...s.cars]) assert.ok(p.x > 8 && p.x < MAP.w - 8 && p.y > 8 && p.y < MAP.h - 8, `${s.id} ${p.x},${p.y}`);
  }
});

test('drifting cars stay on the map for the whole scene', () => {
  for (const s of SCENES) {
    s.cars.forEach((c, i) => {
      for (let t = -2; t <= 9; t += 0.5) {
        const p = carAt(c, t);
        assert.ok(p.x > 6 && p.x < MAP.w - 6 && p.y > 6 && p.y < MAP.h - 6, `${s.id} car ${i} at t=${t}: ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
      }
    });
  }
});
