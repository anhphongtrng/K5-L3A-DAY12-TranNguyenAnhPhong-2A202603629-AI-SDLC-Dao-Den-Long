import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { capacity, createGame, idleInput, snapshot, step, tuning } from './game/simulation.js';
import { maps } from './game/maps.js';

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const vector = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isFinite);
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
const arrayOf = (predicate) => (value) => Array.isArray(value) && value.every(predicate);
const optional = (value, key, predicate) => !(key in value) || predicate(value[key]);
const bool = (value) => typeof value === 'boolean';
const position = (value) => vector(value, 3);
const name = (value) => typeof value === 'string' && value.length > 0;
const unique = (items) => new Set(items).size === items.length;

function validScenario(scenario, night) {
  const lanternIds = maps[night].lanterns.map((_, index) => `L${index + 1}`);
  return object(scenario) &&
    optional(scenario, 'player', (player) => object(player) &&
      optional(player, 'pos', position) &&
      optional(player, 'successful_lights', integer) &&
      optional(player, 'carried', (value) => integer(value) && value <= capacity(player.successful_lights ?? 0)) &&
      optional(player, 'flames', integer) &&
      ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']
        .every((key) => optional(player, key, integer))) &&
    optional(scenario, 'random_motes', bool) &&
    optional(scenario, 'random_shades', bool) &&
    optional(scenario, 'random_drifters', bool) &&
    optional(scenario, 'wind_enabled', bool) &&
    optional(scenario, 'time_left_s', (value) => Number.isFinite(value) && value >= 0) &&
    optional(scenario, 'motes', arrayOf(position)) &&
    optional(scenario, 'shades', (shades) => arrayOf((shade) => object(shade) &&
      position(shade.pos) && optional(shade, 'id', name) &&
      optional(shade, 'state', (state) => ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'].includes(state)) &&
      optional(shade, 'target_lantern_id', (id) => lanternIds.includes(id)) &&
      optional(shade, 'state_ticks_left', integer))(shades) &&
      unique(shades.flatMap((shade) => shade.id === undefined ? [] : [shade.id]))) &&
    optional(scenario, 'drifters', (drifters) => arrayOf((d) => object(d) && position(d.pos) &&
      optional(d, 'id', name) && optional(d, 'stolen', integer) &&
      optional(d, 'state_ticks_left', integer) &&
      optional(d, 'state', (state) => ['idle', 'chase', 'flee', 'removed'].includes(state)))(drifters) &&
      unique(drifters.flatMap((d) => d.id === undefined ? [] : [d.id]))) &&
    optional(scenario, 'charms', (charms) => Array.isArray(charms) && charms.every((c, index) =>
      object(c) && (position(c.pos) || (c.pos === undefined && maps[night].charms[index] !== undefined)) &&
      optional(c, 'id', name) && optional(c, 'available', bool) &&
      optional(c, 'respawn_ticks', integer) &&
      optional(c, 'respawn_s', (seconds) => Number.isFinite(seconds) && seconds >= 0)) &&
      unique(charms.map((c, index) => c.id ?? `C${index + 1}`))) &&
    optional(scenario, 'lanterns', (lanterns) => arrayOf((lantern) => object(lantern) &&
      lanternIds.includes(lantern.id) && optional(lantern, 'pos', position) &&
      optional(lantern, 'lit', bool) &&
      optional(lantern, 'ever_lit', bool) &&
      optional(lantern, 'fuel', (value) => Number.isFinite(value) && value >= 0 && value <= tuning.fuel_max) &&
      optional(lantern, 'deposited', (value) => integer(value) && value <= tuning.lantern_cost))(lanterns) &&
      unique(lanterns.map((lantern) => lantern.id)));
}

function validInputs(inputs) {
  return object(inputs) && Array.isArray(inputs.frames) && inputs.frames.every((frame, index, frames) =>
    object(frame) && integer(frame.tick) && (index === 0 || frame.tick > frames[index - 1].tick) &&
    optional(frame, 'move', (move) => vector(move, 2) && move.every((axis) => Math.abs(axis) <= 1)) &&
    optional(frame, 'cam_yaw_deg', Number.isFinite) &&
    ['jump', 'interact', 'pulse', 'dash', 'pause'].every((button) => optional(frame, button, bool)));
}

class InvalidFile extends Error {}

function readJson(path, validate, label) {
  if (path === undefined) return undefined;
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new InvalidFile(`${label}: ${error.message}`);
  }
  if (!validate(data)) throw new InvalidFile(`${label}: invalid format`);
  return data;
}

function numberArgument(value, label, minimum) {
  const number = Number(value);
  if (!/^-?\d+$/.test(value ?? '') || !integer(number, minimum)) {
    throw new Error(`Invalid or missing --${label}`);
  }
  return number;
}

function run() {
  const args = process.argv.slice(2);
  const seedIndex = args.indexOf('--seed');
  if (seedIndex >= 0 && /^-\d+$/.test(args[seedIndex + 1] ?? '')) {
    args.splice(seedIndex, 2, `--seed=${args[seedIndex + 1]}`);
  }
  const { values: flags } = parseArgs({
    args,
    options: {
      seed: { type: 'string' },
      night: { type: 'string' },
      scenario: { type: 'string' },
      inputs: { type: 'string' },
      ticks: { type: 'string' },
      out: { type: 'string' },
      'snapshot-every': { type: 'string', default: '10' },
    },
    allowNegative: false,
  });
  const seed = numberArgument(flags.seed, 'seed', Number.MIN_SAFE_INTEGER);
  const ticks = numberArgument(flags.ticks, 'ticks', 0);
  const interval = numberArgument(flags['snapshot-every'], 'snapshot-every', 1);
  if (!['1', '2', '3'].includes(flags.night)) throw new Error('--night must be 1, 2 or 3');
  const night = Number(flags.night);
  if (!flags.out) throw new Error('Missing --out');

  const scenario = readJson(flags.scenario, (data) => validScenario(data, night), 'scenario');
  const frames = readJson(flags.inputs, validInputs, 'inputs')?.frames ?? [];
  const game = createGame(seed, scenario, night);
  const lines = [snapshot(game), { type: 'event', tick: 0, name: 'night_start', data: { night } }];
  let input = idleInput;
  let next = 0;
  while (game.tick < ticks && (game.state === 'playing' || game.state === 'paused')) {
    if (frames[next]?.tick === game.tick) {
      input = { ...input, ...frames[next] };
      next += 1;
    }
    lines.push(...step(game, input));
    if (game.tick % interval === 0) lines.push(snapshot(game));
  }
  lines.push({ type: 'end', ticks: game.tick, state: game.state, score: game.score });
  writeFileSync(flags.out, `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`);
}

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exitCode = error instanceof InvalidFile ? 2 : 1;
}
