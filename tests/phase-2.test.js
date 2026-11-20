import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const quiet = { random_motes: false, random_shades: false, random_drifters: false };
function run(t, { night = 1, ticks = 1, frames = [], interval = 1, scenario = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dao-den-long-phase2-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const setup = join(dir, 'scenario.json');
  const inputs = join(dir, 'inputs.json');
  const output = join(dir, 'out.jsonl');
  writeFileSync(setup, JSON.stringify({ ...quiet, ...scenario }));
  writeFileSync(inputs, JSON.stringify({ frames }));
  const child = spawnSync(process.execPath, ['src/headless.js', '--seed', '42', '--night', String(night),
    '--scenario', setup, '--inputs', inputs, '--ticks', String(ticks), '--snapshot-every', String(interval),
    '--out', output], { encoding: 'utf8', timeout: 30000 });
  assert.equal(child.status, 0, child.stderr || child.error?.message);
  const raw = readFileSync(output, 'utf8');
  const records = raw.trimEnd().split('\n').map(JSON.parse);
  return {
    raw, snapshots: new Map(records.filter((r) => r.type === 'snapshot').map((r) => [r.tick, r])),
    events: records.filter((r) => r.type === 'event'),
    end: records.at(-1),
  };
}
const event = (run, name) => run.events.find((e) => e.name === name);

test('standard maps and spawn schedule are deterministic', (t) => {
  const opts = { ticks: 300, interval: 60, scenario: { random_motes: true, random_shades: true } };
  const first = run(t, opts);
  assert.equal(first.raw, run(t, opts).raw);
  assert.equal(first.snapshots.get(0).motes.length, 20);
  assert.equal(first.snapshots.get(240).motes.length, 21);
  assert.deepEqual(first.snapshots.get(0).lanterns[0].pos, [0, 0, 25]);
  assert.equal(first.snapshots.get(300).shades.length, 2);
  assert.equal(event(first, 'shade_spawned').tick, 300);
  assert.equal(run(t, { night: 2 }).snapshots.get(0).lanterns.length, 6);
  assert.equal(run(t, { night: 3 }).snapshots.get(0).lanterns.length, 7);
});

test('pause freezes sim_tick, dash cooldown and dropped mote TTL', (t) => {
  const result = run(t, {
    ticks: 14, frames: [
      { tick: 0, dash: true }, { tick: 1, pause: true },
      { tick: 2, pause: false }, { tick: 13, pause: true },
    ], scenario: { player: { carried: 4 }, shades: [{ pos: [0, 0.8, 0] }] },
  });
  assert.equal(event(result, 'dash').tick, 1);
  const first = result.snapshots.get(1);
  const paused = result.snapshots.get(13);
  const resumed = result.snapshots.get(14);
  assert.equal(paused.state, 'paused');
  assert.equal(paused.sim_tick, first.sim_tick);
  assert.equal(paused.time_left_s, first.time_left_s);
  assert.equal(paused.player.dash_cd_s, first.player.dash_cd_s);
  assert.equal(first.motes.filter((m) => m.kind === 'dropped').length, 2);
  assert.deepEqual(paused.motes, first.motes);
  assert.equal(resumed.sim_tick, 2);
  assert.equal(event(result, 'resumed').tick, 14);
});

test('dash lasts 12 ticks, preserves airborne height and respects held-button edge', (t) => {
  const result = run(t, { ticks: 14, frames: [{ tick: 0, dash: true }],
    scenario: { player: { pos: [0, 2, 0] } } });
  assert.equal(result.events.filter((e) => e.name === 'dash').length, 1);
  assert.deepEqual(result.snapshots.get(12).player.pos, [0, 2, 2.8]);
  assert.equal(result.snapshots.get(13).player.vel[2], 0);
  assert.ok(result.snapshots.get(13).player.vel[1] < 0);
});

test('fall ignores invulnerability and respawns exactly 60 ticks later', (t) => {
  const result = run(t, { ticks: 61, scenario: { player: { pos: [41, -10.1, 0], carried: 8, invuln_ticks: 100 } } });
  assert.deepEqual(event(result, 'player_hit').data, { by: 'fall', flames: 2, dropped: 0, lost: 8 });
  assert.equal(result.snapshots.get(60).player.grounded, false);
  assert.deepEqual(result.snapshots.get(61).player.pos, [0, 0, 0]);
  assert.equal(result.snapshots.get(61).player.invuln, true);
});

test('the bridge, both types of jump pad, and summit ramp are traversable', (t) => {
  const bridge = run(t, { night: 2, ticks: 190, frames: [{ tick: 0, move: [1, 0] }],
    scenario: { player: { pos: [25, 0, 0] }, charms: [] } });
  assert.deepEqual(bridge.snapshots.get(190).player.pos, [44, 0, 0]);
  const across = run(t, { night: 2, ticks: 90, scenario: { player: { pos: [20, 0, 18] } } });
  assert.equal(across.snapshots.get(1).player.vel[1], 14);
  assert.ok(across.snapshots.get(90).player.pos[0] >= 50);
  assert.equal(across.snapshots.get(90).player.grounded, true);
  const summit = run(t, { night: 3, ticks: 80, scenario: { player: { pos: [0, 3, 13] } } });
  assert.equal(summit.snapshots.get(80).player.pos[1], 6);
  const ramp = run(t, { night: 3, ticks: 80,
    frames: [{ tick: 0, move: [-Math.sqrt(3) / 2, -0.5] }],
    scenario: { player: { pos: [31 * Math.sqrt(3) / 2, 0, 15.5] } } });
  assert.equal(ramp.snapshots.get(80).player.pos[1], 3);
});

test('wind warns before the first gust and pushes for five seconds', (t) => {
  const result = run(t, { night: 3, ticks: 2100, interval: 60 });
  assert.equal(result.snapshots.get(1680).wind.active, false);
  assert.equal(result.snapshots.get(1800).wind.active, true);
  assert.equal(result.snapshots.get(2100).wind.active, false);
  const velocity = result.snapshots.get(1800).player.vel;
  assert.ok(Math.abs(Math.hypot(velocity[0], velocity[2]) - 2) < 0.001);
});

test('drifter steals before the shade hit, and pulse recovers the stolen motes', (t) => {
  const result = run(t, { night: 2, ticks: 2, frames: [{ tick: 1, pulse: true }],
    scenario: { player: { carried: 10 }, drifters: [{ pos: [0.5, 0.8, 0] }], shades: [{ pos: [0, 0.8, 0] }] } });
  assert.deepEqual(result.events.filter((e) => e.tick === 1).map((e) => e.name), ['drifter_steal', 'player_hit']);
  assert.deepEqual(event(result, 'drifter_steal').data, { drifter_id: 'D1', amount: 3, carried: 7 });
  assert.equal(event(result, 'player_hit').data.dropped, 3);
  assert.deepEqual(event(result, 'drifter_drop').data, { drifter_id: 'D1', amount: 3 });
  assert.equal(result.snapshots.get(2).drifters[0].stolen, 0);
  const chase = run(t, { night: 2, frames: [{ tick: 0, pulse: true }],
    scenario: { player: { carried: 8 }, drifters: [{ state: 'chase', pos: [0.5, 0.8, 0] }] } });
  assert.equal(chase.snapshots.get(1).drifters[0].state, 'flee');
  assert.equal(event(chase, 'drifter_steal'), undefined);
});

test('charm accelerates running, lifts dash cooldown, expires and respawns', (t) => {
  const result = run(t, { night: 2, ticks: 2702, interval: 1, frames: [
    { tick: 1, move: [1, 0] }, { tick: 2, dash: true },
    { tick: 3, dash: false }, { tick: 4, dash: true }, { tick: 5, dash: false },
    { tick: 14, dash: true }, { tick: 15, dash: false, move: [0, 0] },
  ], scenario: { charms: [{ pos: [0, 0, 0] }], player: { dash_cd_ticks: 90 } } });
  assert.equal(event(result, 'charm_picked').data.charm_ticks, 600);
  assert.equal(result.snapshots.get(2).player.vel[0], 7.2);
  assert.deepEqual(result.events.filter((e) => e.name === 'dash').map((e) => e.tick), [3, 15]);
  assert.equal(result.snapshots.get(601).player.charm_s, 0);
  assert.equal(result.snapshots.get(2701).charms[0].available, true);
});
