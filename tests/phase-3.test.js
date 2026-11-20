import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createGame, idleInput, snapshot, step } from '../src/game/simulation.js';

const make = (scenario, night) => createGame(42, {
  random_shades: false, random_motes: false, random_drifters: false, ...scenario,
}, night);
const advance = (game, count) => Array.from({ length: count }, () => step(game)).flat();
const light = (id, x, fuel) => ({ id, pos: [x, 0, 0], lit: true, fuel });
const press = (game, button) => step(game, { ...idleInput, [button]: true });

test('fuel expires exactly after 6000 ticks and relighting costs five', () => {
  const game = make({ player: { carried: 5 }, lanterns: [light('L1', 0, 100)] });
  assert.equal(snapshot(game).player.capacity, 10);
  advance(game, 5999);
  assert.equal(game.lanterns[0].lit, true);
  assert.equal(game.lanterns[0].fuelUnits, 1);
  assert.deepEqual(press(game, 'interact').map(({ name, data }) => [name, data]), [
    ['lantern_out', { lantern_id: 'L1' }],
    ['deposit', { lantern_id: 'L1', amount: 5, deposited: 5 }],
    ['lantern_lit', { lantern_id: 'L1', relight: true }],
  ]);
  assert.deepEqual(snapshot(game).lanterns[0], {
    id: 'L1', pos: [0, 0, 0], lit: true, deposited: 5, ever_lit: true, relit_count: 1, fuel: 100,
  });
  assert.equal(snapshot(game).player.capacity, 12);
  assert.equal(game.score, 65);
});

test('refueling rounds up, clamps at full, and picks the lowest id on a tie', () => {
  const game = make({ player: { carried: 4, successful_lights: 9 },
    lanterns: [light('L1', 1, 80), light('L2', -1, 50)] });
  assert.equal(snapshot(game).player.capacity, 20);
  assert.deepEqual(press(game, 'interact')[0].data, { lantern_id: 'L1', amount: 3, fuel: 100 });
  assert.equal(game.player.carried, 1);
  assert.equal(game.score, 15);
  assert.equal(press(game, 'interact').length, 0);
});

test('two draining shades stack, report every 60 ticks, and stop during pause', () => {
  const game = make({ lanterns: [light('L1', 20, 29)], shades: [
    { id: 'S1', pos: [20, 0.8, 0], state: 'drain', target_lantern_id: 'L1' },
    { id: 'S2', pos: [21, 0.8, 0], state: 'drain', target_lantern_id: 'L1' },
  ] });
  advance(game, 30);
  press(game, 'pause');
  const paused = snapshot(game);
  advance(game, 70);
  assert.equal(snapshot(game).lanterns[0].fuel, paused.lanterns[0].fuel);
  press(game, 'pause');
  const events = advance(game, 29);
  assert.deepEqual(events.map(({ name, data }) => [name, data]), [
    ['fuel_drain', { lantern_id: 'L1', shade_id: 'S1', fuel: 18 }],
    ['fuel_drain', { lantern_id: 'L1', shade_id: 'S2', fuel: 18 }],
  ]);
});

test('wander targets weak lights by id while chase stays focused on the player', () => {
  const game = make({ lanterns: [light('L1', 20, 25), light('L2', 24, 25)], shades: [
    { id: 'S1', pos: [22, 0.8, 0], state: 'wander' },
    { id: 'S2', pos: [16, 0.8, 0], state: 'chase' },
  ] });
  step(game);
  assert.equal(game.shades[0].state, 'drain');
  assert.equal(game.shades[0].targetLantern, 'L1');
  assert.ok(game.shades[1].pos[0] < 16);
  assert.equal(game.shades[1].state, 'chase');
});

test('pulse interrupts drain for 15 total points, and leaves the shade stunned', () => {
  const game = make({ player: { carried: 3 }, lanterns: [light('L1', 3, 20)], shades: [
    { pos: [3, 0.8, 0], state: 'drain', target_lantern_id: 'L1' },
  ] });
  assert.equal(press(game, 'pulse').at(-1).name, 'pulse');
  assert.equal(game.score, 15);
  assert.equal(game.shades[0].state, 'stunned');
  assert.equal(game.shades[0].targetLantern, null);
});

test('at 30 fuel a lantern is safe, and refueling ejects a shade at the island edge', () => {
  const game = make({ player: { carried: 1, pos: [39, 0, 0] }, lanterns: [light('L1', 39, 21)], shades: [
    { pos: [39.9, 0.8, 0], state: 'drain', target_lantern_id: 'L1' },
  ] });
  assert.equal(press(game, 'interact').at(-1).name, 'refuel');
  advance(game, 29);
  const [x, , z] = game.shades[0].pos;
  assert.ok(Math.hypot(x, z) <= 40);
  assert.ok(Math.hypot(x - 39, z) > 6);
  assert.equal(game.player.flames, 3);
  const exact = make({ lanterns: [light('L1', 0, 30 + 1 / 60)], shades: [{ pos: [0, 0.8, 0] }] });
  assert.equal(step(exact).some((e) => e.name === 'player_hit'), false);
  assert.equal(snapshot(exact).lanterns[0].fuel, 30);
});

test('dawn scores only surviving lights, and zero flames always loses', () => {
  const scenario = JSON.parse(readFileSync('tests/fixtures/phase-3-dawn.json', 'utf8'));
  const game = make(scenario);
  press(game, 'interact');
  assert.equal(game.state, 'playing');
  assert.deepEqual(advance(game, 59).slice(-2).map(({ name, data }) => [name, data]), [
    ['lantern_out', { lantern_id: 'L4' }],
    ['game_over', { result: 'won', reason: 'dawn_survived' }],
  ]);
  assert.equal(game.score, 622);
  for (const [night, required] of [[1, 3], [2, 4], [3, 5]]) {
    for (const count of [required - 1, required]) {
      const lanterns = Array.from({ length: count }, (_, i) => ({ id: 'L' + (i + 1), lit: true }));
      const sample = make({ lanterns, time_left_s: 1 / 60 }, night);
      assert.equal(step(sample).at(-1).data.reason, count === required ? 'dawn_survived' : 'dawn');
    }
  }
  const fatal = make({ ...scenario, time_left_s: 1 / 60,
    player: { pos: [41, -11, 0], flames: 1 } });
  assert.deepEqual(step(fatal).at(-1).data, { result: 'lost', reason: 'no_flames' });
});
