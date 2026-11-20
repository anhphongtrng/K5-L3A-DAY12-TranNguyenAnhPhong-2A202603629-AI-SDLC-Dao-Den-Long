import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createGame, idleInput, snapshot, step, tuning } from '../src/game/simulation.js';

function run(t, args) {
  const dir = mkdtempSync(join(tmpdir(), 'dao-den-long-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = join(dir, 'game.jsonl');
  const child = spawnSync(process.execPath, [
    'src/headless.js', '--seed', '-42', '--night', '1', '--out', out, ...args,
  ], { encoding: 'utf8' });
  if (child.error) throw child.error;
  if (child.status !== 0) return child;
  const raw = readFileSync(out, 'utf8');
  return { ...child, raw, records: raw.trimEnd().split('\n').map(JSON.parse) };
}

test('default snapshots, deterministic seed, explicit interval and terminal summary', (t) => {
  const first = run(t, ['--ticks', '21']);
  const same = run(t, ['--ticks', '21']);
  const override = run(t, ['--ticks', '21', '--snapshot-every', '7']);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.raw, same.raw);
  assert.deepEqual(first.records.filter((r) => r.type === 'snapshot').map(({ tick }) => tick), [0, 10, 20]);
  assert.deepEqual(override.records.filter((r) => r.type === 'snapshot').map(({ tick }) => tick), [0, 7, 14, 21]);
  assert.deepEqual(first.records.at(-1), { type: 'end', ticks: 21, state: 'playing', score: 0 });
});

test('CLI picks up and lights the last lantern without ending the night', (t) => {
  const result = run(t, ['--ticks', '10', '--scenario', 'tests/fixtures/final-lantern.json',
    '--inputs', 'tests/fixtures/interact.json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.records[0].tick, 0);
  assert.equal(result.records[0].player.carried, 9);
  assert.deepEqual(result.records[1], { type: 'event', tick: 0, name: 'night_start', data: { night: 1 } });
  assert.deepEqual(result.records.slice(2, -1).filter((record) => record.type === 'event'), [
    { type: 'event', tick: 1, name: 'mote_picked', data: { carried: 10 } },
    { type: 'event', tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 10, deposited: 10 } },
    { type: 'event', tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1', relight: false } },
  ]);
  assert.deepEqual(result.records.at(-1), { type: 'end', ticks: 10, state: 'playing', score: 150 });
});

test('CLI pulse stuns only the nearby shade, then a hit ends the run', (t) => {
  const result = run(t, ['--ticks', '180', '--scenario', 'tests/fixtures/pulse-hit.json',
    '--inputs', 'tests/fixtures/pulse.json']);
  assert.equal(result.status, 0, result.stderr);
  const events = result.records.filter(({ type, tick }) => type === 'event' && tick > 0);
  assert.deepEqual(events[0], { type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['Near'] } });
  assert.deepEqual(events[1].data, { by: 'shade', flames: 0, dropped: 0 });
  assert.deepEqual(events[2].data, { result: 'lost', reason: 'no_flames' });
  assert.equal(result.records.at(-1).score, 5);
});

test('CLI rejects malformed input and scenario with exit code 2', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dao-den-invalid-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'invalid.json');
  writeFileSync(path, JSON.stringify({ frames: [{ tick: 0 }, { tick: 0 }], player: { pos: [0] } }));
  for (const flag of ['--inputs', '--scenario']) {
    const result = run(t, ['--ticks', '10', flag, path]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /invalid format/);
  }
});

test('movement normalizes diagonals and rotates with camera yaw', () => {
  const game = createGame(2, { random_motes: false, random_shades: false });
  for (let tick = 0; tick < 60; tick += 1) {
    step(game, { move: [1, 1], cam_yaw_deg: 90 });
  }
  assert.equal(Math.round(Math.hypot(game.player.pos[0], game.player.pos[2])), tuning.player_speed);
  assert.deepEqual(snapshot(game).player.pos, [4.243, 0, -4.243]);
});

test('jump is edge-triggered, dawn stops the game, and a new game resets state', () => {
  const game = createGame(2, { random_motes: false, random_shades: false, time_left_s: 2 });
  step(game, { ...idleInput, jump: true });
  assert.ok(game.player.pos[1] > 0);
  for (let tick = 1; tick < 119; tick += 1) step(game, { ...idleInput, jump: true });
  assert.equal(game.player.pos[1], 0);
  assert.deepEqual(step(game)[0].data, { result: 'lost', reason: 'dawn' });
  assert.deepEqual(step(game), []);
  const fresh = createGame(2);
  assert.equal(fresh.tick, 0);
  assert.equal(fresh.score, 0);
  assert.ok(fresh.lanterns.every((lantern) => !lantern.lit));
});

test('lit lantern protects the player and hurt invulnerability lasts 90 ticks', () => {
  const safe = createGame(3, {
    random_motes: false, shades: [{ pos: [0, 1, 0] }],
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }],
  });
  assert.deepEqual(step(safe), []);
  for (let tick = 2; tick <= 30; tick += 1) assert.deepEqual(step(safe), []);
  assert.ok(safe.shades[0].pos[0] > tuning.safe_radius);
  const unsafe = createGame(3, { random_motes: false, shades: [{ pos: [0, 1, 0] }, { pos: [0, 1, 0] }] });
  assert.equal(step(unsafe)[0].name, 'player_hit');
  for (let tick = 2; tick <= 90; tick += 1) assert.deepEqual(step(unsafe), []);
  assert.equal(step(unsafe)[0].data.flames, 1);
});

test('standard Night 1 supplies enough motes to meet the dawn threshold', () => {
  // Isolate supply and route progression. Enemy hazards are exercised by separate tests.
  const game = createGame(202603629, { random_shades: false });
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  while (game.state === 'playing') {
    const { pos, carried } = game.player;
    const ready = carried >= tuning.lantern_cost;
    const targets = ready
      ? game.lanterns.filter((lantern) => !lantern.lit).map((lantern) => lantern.pos)
      : game.motes.map((mote) => mote.pos);
    const [target] = [...targets].sort((a, b) => distance(pos, a) - distance(pos, b));
    if (!target) {
      step(game);
      continue;
    }
    const meters = distance(pos, target);
    const move = meters > 0 ? [(target[0] - pos[0]) / meters, (target[2] - pos[2]) / meters] : [0, 0];
    step(game, {
      ...idleInput,
      move,
      interact: ready && meters <= tuning.interact_radius,
    });
  }
  assert.equal(game.state, 'won');
  assert.ok(game.lanterns.filter((lantern) => lantern.lit).length >= 3);
});
