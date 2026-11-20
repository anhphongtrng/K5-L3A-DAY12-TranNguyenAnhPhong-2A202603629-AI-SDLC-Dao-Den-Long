import contract from '../../game.contract.json' with { type: 'json' };

export const tuning = contract.tuning;
export const HZ = 60;
export const ISLAND_RADIUS = 18;
const BUTTONS = ['jump', 'interact', 'pulse'];
export const idleInput = { move: [0, 0], cam_yaw_deg: 0 };

function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ring(radius, angle, height = 0) {
  return [radius * Math.cos(angle), height, radius * Math.sin(angle)];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function approach(from, to, meters) {
  const length = distance(from, to);
  if (length === 0) return [...from];
  const ratio = Math.min(1, meters / length);
  return [from[0] + (to[0] - from[0]) * ratio, from[1], from[2] + (to[2] - from[2]) * ratio];
}

export function createGame(seed, scenario = {}) {
  const random = randomFrom(seed);
  const lanterns = Array.from({ length: tuning.lantern_count_night1 }, (_, index) => {
    const id = `L${index + 1}`;
    const override = scenario.lanterns?.find((lantern) => lantern.id === id);
    const deposited = override?.deposited ?? (override?.lit ? tuning.lantern_cost : 0);
    return {
      id,
      pos: [...(override?.pos ?? ring(12, index * Math.PI * 2 / tuning.lantern_count_night1))],
      deposited,
      lit: override?.lit ?? deposited >= tuning.lantern_cost,
    };
  });
  const motes = scenario.motes ?? (scenario.random_motes === false ? [] :
    Array.from({ length: 45 }, () => ring(2 + 14 * random(), 2 * Math.PI * random())));
  const shades = scenario.shades ?? (scenario.random_shades === false ? [] :
    [ring(13, 2 * Math.PI * random(), 0.8), ring(16, 2 * Math.PI * random(), 0.8)]
      .map((pos) => ({ pos })));
  const usedIds = new Set(shades.flatMap((shade) => shade.id === undefined ? [] : [shade.id]));
  let nextShade = 1;
  return {
    tick: 0,
    state: 'playing',
    duration: scenario.time_left_s ?? tuning.night1_duration_s,
    time_left_s: scenario.time_left_s ?? tuning.night1_duration_s,
    score: 0,
    player: {
      pos: [...(scenario.player?.pos ?? [0, 0, 0])],
      carried: scenario.player?.carried ?? 0,
      flames: scenario.player?.flames ?? tuning.flames,
    },
    lanterns,
    motes: motes.map((pos) => [...pos]),
    shades: shades.map((shade) => {
      let id = shade.id;
      if (id === undefined) {
        while (usedIds.has(`S${nextShade}`)) nextShade += 1;
        id = `S${nextShade}`;
        nextShade += 1;
      }
      return { id, pos: [...shade.pos], state: 'chase', stunnedUntil: 0 };
    }),
    previousButtons: {},
    verticalSpeed: 0,
    invulnerableUntil: 0,
    pulseReadyAt: 0,
  };
}

function movePlayer(game, input, jump) {
  const [x, z] = input.move;
  const radians = input.cam_yaw_deg * Math.PI / 180;
  const stride = tuning.player_speed / HZ / Math.max(1, Math.hypot(x, z));
  const pos = game.player.pos;
  const nextX = pos[0] + (x * Math.cos(radians) + z * Math.sin(radians)) * stride;
  const nextZ = pos[2] + (-x * Math.sin(radians) + z * Math.cos(radians)) * stride;
  const radius = Math.hypot(nextX, nextZ);
  if (radius <= ISLAND_RADIUS || radius < Math.hypot(pos[0], pos[2])) {
    pos[0] = nextX;
    pos[2] = nextZ;
  }
  if (jump && pos[1] === 0) game.verticalSpeed = 5;
  if (pos[1] > 0 || game.verticalSpeed > 0) {
    pos[1] = Math.max(0, pos[1] + game.verticalSpeed / HZ);
    game.verticalSpeed = pos[1] === 0 ? 0 : game.verticalSpeed - 14 / HZ;
  }
}

function collect(game, emit) {
  game.motes = game.motes.filter((pos) => {
    if (game.player.carried >= tuning.carry_capacity ||
        distance(game.player.pos, pos) > tuning.pickup_radius) return true;
    game.player.carried += 1;
    game.score += tuning.score.per_mote;
    emit('mote_picked', { carried: game.player.carried });
    return false;
  });
}

function deposit(game, emit) {
  const nearest = game.lanterns.filter((lantern) => !lantern.lit)
    .map((lantern) => ({ lantern, meters: distance(game.player.pos, lantern.pos) }))
    .sort((a, b) => a.meters - b.meters)[0];
  if (!nearest || nearest.meters > tuning.interact_radius) return;
  const { lantern } = nearest;
  const amount = Math.min(game.player.carried, tuning.lantern_cost - lantern.deposited);
  if (amount <= 0) return;
  game.player.carried -= amount;
  lantern.deposited += amount;
  emit('deposit', { lantern_id: lantern.id, amount, deposited: lantern.deposited });
  if (lantern.deposited === tuning.lantern_cost) {
    lantern.lit = true;
    game.score += tuning.score.per_lantern;
    emit('lantern_lit', { lantern_id: lantern.id });
  }
}

function pulse(game, emit) {
  if (game.tick < game.pulseReadyAt || game.player.carried < tuning.pulse_cost) return;
  game.player.carried -= tuning.pulse_cost;
  game.pulseReadyAt = game.tick + tuning.pulse_cooldown_s * HZ;
  const stunnedIds = [];
  for (const shade of game.shades) {
    const meters = distance(shade.pos, game.player.pos);
    if (meters > tuning.pulse_radius) continue;
    shade.pos = meters === 0
      ? [shade.pos[0] + tuning.pulse_push_m, shade.pos[1], shade.pos[2]]
      : approach(shade.pos, game.player.pos, -tuning.pulse_push_m);
    shade.state = 'stunned';
    shade.stunnedUntil = game.tick + tuning.pulse_stun_s * HZ;
    stunnedIds.push(shade.id);
  }
  game.score += stunnedIds.length * tuning.score.per_stun;
  emit('pulse', { stunned_ids: stunnedIds });
}

function updateShades(game, emit) {
  const litLanterns = game.lanterns.filter((lantern) => lantern.lit);
  const inLight = (pos) => litLanterns.some((lantern) => distance(lantern.pos, pos) <= tuning.safe_radius);
  for (const shade of game.shades) {
    if (game.tick < shade.stunnedUntil) continue;
    shade.state = 'chase';
    const next = approach(shade.pos, game.player.pos, tuning.shade_speed / HZ);
    const enclosing = litLanterns.find((lantern) => distance(lantern.pos, shade.pos) <= tuning.safe_radius);
    if (enclosing) {
      shade.state = 'retreat';
      shade.pos = distance(shade.pos, enclosing.pos) === 0
        ? [shade.pos[0] + tuning.shade_speed / HZ, shade.pos[1], shade.pos[2]]
        : approach(shade.pos, enclosing.pos, -tuning.shade_speed / HZ);
      continue;
    }
    if (!inLight(next)) shade.pos = next;
    if (!inLight(game.player.pos) && game.tick >= game.invulnerableUntil &&
        distance(shade.pos, game.player.pos) <= tuning.shade_hit_radius) {
      game.player.flames = Math.max(0, game.player.flames - 1);
      game.invulnerableUntil = game.tick + tuning.invuln_s * HZ;
      emit('player_hit', { by: 'shade', flames: game.player.flames, dropped: 0 });
    }
  }
}

export function step(game, input = idleInput) {
  if (game.state !== 'playing') return [];
  game.tick += 1;
  game.time_left_s = Math.max(0, game.duration - game.tick / HZ);
  const events = [];
  const emit = (name, data) => events.push({ type: 'event', tick: game.tick, name, data });
  const pressed = Object.fromEntries(BUTTONS.map((button) => [
    button, Boolean(input[button] && !game.previousButtons[button]),
  ]));
  game.previousButtons = Object.fromEntries(BUTTONS.map((button) => [button, Boolean(input[button])]));
  movePlayer(game, input, pressed.jump);
  collect(game, emit);
  if (pressed.interact) deposit(game, emit);
  if (pressed.pulse) pulse(game, emit);
  if (!game.lanterns.every((lantern) => lantern.lit)) updateShades(game, emit);

  if (game.lanterns.every((lantern) => lantern.lit)) {
    game.state = 'won';
    game.score += Math.floor(game.time_left_s) * tuning.score.per_second_left +
      game.player.flames * tuning.score.per_flame_left;
    emit('game_over', { result: 'won', reason: 'all_lit' });
  } else if (game.player.flames === 0 || game.time_left_s === 0) {
    game.state = 'lost';
    emit('game_over', { result: 'lost', reason: game.player.flames === 0 ? 'no_flames' : 'dawn' });
  }
  return events;
}

const roundPosition = (pos) => pos.map((value) => Math.round(value * 1000) / 1000);

export function snapshot(game) {
  return {
    type: 'snapshot',
    tick: game.tick,
    sim_tick: game.tick,
    state: game.state,
    time_left_s: game.time_left_s,
    player: { ...game.player, pos: roundPosition(game.player.pos) },
    lanterns: game.lanterns.map((lantern) => ({ ...lantern, pos: roundPosition(lantern.pos) })),
    shades: game.shades.map(({ id, pos, state }) => ({ id, pos: roundPosition(pos), state })),
    motes_active: game.motes.length,
  };
}
