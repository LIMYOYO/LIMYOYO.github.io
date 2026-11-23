// A toy model of robots that need one person's help from time to time.
// It illustrates a question; its numbers are not research results.
//
// Robots run jobs of length JOB in a loop. Every so often a robot stops and asks for help, which takes HELP.
// One person helps robots first come, first served; a stopped robot waits until the person reaches it.
// On average a robot asks for help once per JOB of work in both modes, so only the timing differs:
//   scattered: each robot asks after its own random amount of work (uniform on 0..2·JOB).
//   bursts:    shared shocks arrive on average every 5 time units; at each shock, every working robot that has done
//              at least 1 unit of work since its last help asks at the same moment (mean gap 1 + 5 = JOB).

const JOB = 6;
const HELP = 1;
const MIN_GAP = 1;
const SHOCK_RATE = 1 / 5;
const MAX_STEP = 0.1;
const EMA_WINDOW = 60;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSim({ robots = 6, mode = 'scattered', seed } = {}) {
  const rand = mulberry32(seed ?? Date.now());
  let currentMode = mode;
  const fleet = [];
  const queue = [];
  let target = null;
  let helpLeft = 0;
  let waitingAvg = 0;
  let busyAvg = 0;

  const newRobot = () => ({ state: 'working', progress: rand() * JOB, sinceHelp: rand() * JOB, askAfter: rand() * 2 * JOB });
  const ask = (i) => { fleet[i].state = 'waiting'; queue.push(i); };

  function setRobots(n) {
    n = Math.max(1, Math.min(12, Math.round(n)));
    while (fleet.length < n) fleet.push(newRobot());
    if (fleet.length > n) {
      fleet.length = n;
      for (let k = queue.length - 1; k >= 0; k--) if (queue[k] >= n) queue.splice(k, 1);
      if (target !== null && target >= n) { target = null; helpLeft = 0; }
    }
  }

  function setMode(m) { currentMode = m === 'bursts' ? 'bursts' : 'scattered'; }

  function tick(h) {
    const bursts = currentMode === 'bursts';
    const shock = bursts && rand() < 1 - Math.exp(-h * SHOCK_RATE);
    fleet.forEach((r, i) => {
      if (r.state !== 'working') return;
      r.progress = (r.progress + h) % JOB;
      r.sinceHelp += h;
      if (bursts ? shock && r.sinceHelp >= MIN_GAP : r.sinceHelp >= r.askAfter) ask(i);
    });
    if (target !== null) {
      helpLeft -= h;
      if (helpLeft <= 0) {
        Object.assign(fleet[target], { state: 'working', sinceHelp: 0, askAfter: rand() * 2 * JOB });
        target = null;
      }
    }
    if (target === null && queue.length) {
      target = queue.shift();
      fleet[target].state = 'served';
      helpLeft = HELP;
    }
    const k = 1 - Math.exp(-h / EMA_WINDOW);
    const waitingNow = fleet.filter((r) => r.state === 'waiting').length / fleet.length;
    waitingAvg += (waitingNow - waitingAvg) * k;
    busyAvg += ((target === null ? 0 : 1) - busyAvg) * k;
  }

  function step(dt) {
    let left = Math.max(0, dt);
    while (left > 1e-9) {
      const h = Math.min(MAX_STEP, left);
      tick(h);
      left -= h;
    }
  }

  setRobots(robots);
  setMode(mode);

  return {
    step,
    setRobots,
    setMode,
    snapshot: () => ({
      robots: fleet.map((r) => ({ state: r.state, progress: r.progress / JOB })),
      person: { target },
      queue: [...queue],
    }),
    stats: () => ({ robotsWaiting: Math.min(1, Math.max(0, waitingAvg)), personBusy: Math.min(1, Math.max(0, busyAvg)) }),
  };
}
