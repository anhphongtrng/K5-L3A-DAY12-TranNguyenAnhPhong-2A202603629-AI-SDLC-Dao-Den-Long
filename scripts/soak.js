import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createGame, randomFrom, step, HZ } from '../src/game/simulation.js';
import { integerOption } from './args.js';

function rss() {
  return process.memoryUsage.rss() / 1048576;
}

function run() {
  const { values } = parseArgs({ options: {
    seed: { type: 'string' }, nights: { type: 'string' }, out: { type: 'string' },
  } });
  const seed = integerOption(values.seed, 'seed', Number.MIN_SAFE_INTEGER);
  const nights = integerOption(values.nights, 'nights', 1);
  if (!values.out) throw new Error('Missing --out');
  const start = performance.now();
  const results = [];
  let crashes = 0;
  let memStart;
  for (let i = 0; i < nights; i += 1) {
    try {
      const game = createGame(seed + i, {}, i % 3 + 1);
      const random = randomFrom(seed + i);
      if (i === 0) memStart = rss();
      let move;
      while (game.state === 'playing' && game.sim_tick < game.duration * HZ) {
        if (game.sim_tick % 30 === 0) {
          const angle = random() * Math.PI * 2;
          move = [Math.cos(angle), Math.sin(angle)];
        }
        step(game, { move, cam_yaw_deg: 0, jump: random() < 0.05, dash: random() < 0.03,
          pulse: random() < 0.02, interact: random() < 0.1 });
      }
      results.push(game.state);
    } catch (error) {
      crashes += 1;
      results.push('crashed');
      console.error(error.message);
    }
  }
  const memEnd = rss();
  writeFileSync(values.out, JSON.stringify({ nights, crashes, results, mem_start_mb: memStart ?? null,
    mem_end_mb: memEnd, duration_s: (performance.now() - start) / 1000 }, null, 2) + '\n');
  if (crashes) process.exitCode = 1;
}

try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
