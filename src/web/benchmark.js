import { createGame, HZ, randomFrom, step } from '../game/simulation.js';
import { createView } from './view.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed'));
const duration = Number(params.get('duration')) * 1000;
const random = randomFrom(seed);
function positions(count, y) {
  return Array.from({ length: count }, (_, i) => {
    const r = 39 * Math.sqrt((i + random()) / count);
    const a = i * Math.PI * (3 - Math.sqrt(5)) + random() * 0.22;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  });
}
const game = createGame(seed, {
  random_motes: false, random_shades: false,
  motes: positions(100, 0),
  shades: positions(200, 0.8).map((pos) => ({ pos, state: 'wander' })),
  lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true, fuel: 100 })),
});
game.benchmark = true;
const view = createView(document.querySelector('#scene'), { pixelRatio: 1 });
view.reset(game);
const times = [];
let start;
let previous;
let elapsed = 0;
view.onFrame((timestamp) => {
  start ??= timestamp;
  const age = timestamp - start;
  if (previous !== undefined) {
    elapsed += Math.min(250, timestamp - previous);
    if (previous - start >= 3000 && age <= 3000 + duration && timestamp > previous) {
      times.push(timestamp - previous);
    }
  }
  previous = timestamp;
  if (age >= 3000 + duration) {
    view.onFrame(null);
    if (!times.length) throw new Error('No complete frame in the measurement window');
    const slowest = [...times].sort((a, b) => b - a);
    const sum = (samples) => samples.reduce((total, sample) => total + sample, 0);
    const k = Math.max(1, Math.ceil(times.length * 0.01));
    globalThis.benchResult = {
      avg_fps: 1000 * times.length / sum(times),
      p1_low_fps: 1000 * k / sum(slowest.slice(0, k)),
      frame_ms_p95: slowest[times.length - Math.ceil(times.length * 0.95)],
      frames: times.length,
      renderer: view.renderer,
    };
    return;
  }
  while (elapsed >= 1000 / HZ) {
    step(game);
    elapsed -= 1000 / HZ;
  }
  view.render(game, 0, timestamp, Infinity, age / 15000 * 2 * Math.PI);
  if (!globalThis.benchLoaded) globalThis.benchLoaded = performance.timeOrigin + performance.now();
});
