import contract from '../../game.contract.json' with { type: 'json' };
import { maps, ground, horizontal, rampHeight } from './maps.js';
export const tuning = contract.tuning;
export const HZ = 60;
export const ISLAND_RADIUS = 40;
export const idleInput = { move: [0, 0], cam_yaw_deg: 0 };
const buttons = ['jump', 'interact', 'pulse', 'dash', 'pause'];
const byId = (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true });
const ticks = (seconds) => Math.round(seconds * HZ);
const point = (p, x, z, speed) => [p[0] + x * speed, p[1], p[2] + z * speed];
const direction = (from, to) => {
  const d = horizontal(from, to);
  return d ? [(to[0] - from[0]) / d, (to[2] - from[2]) / d] : [1, 0];
};
const near = (a, b, r) => horizontal(a, b) <= r && Math.abs(a[1] - b[1]) <= 1.5;
const inLight = (p, lights) => lights.some((l) => horizontal(p, l.pos) <= tuning.safe_radius);
const tower = (night, p) => night === 3 && p[1] >= 5.99 && p[1] < 14 && Math.hypot(p[0], p[2]) < 2;
function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
const choose = (items, random) => items[Math.floor(random() * items.length)];
function nextId(game, key, prefix, entities) {
  let id;
  do { id = prefix + game.ids[key]++; } while (entities.some((entity) => entity.id === id));
  return id;
}
function mote(game, pos, kind, site = null) {
  game.motes.push({
    id: nextId(game, 'mote', 'M', game.motes), pos: [...pos], kind, site,
    expires: kind === 'dropped' ? game.sim_tick + 480 : null,
    collectAt: kind === 'dropped' ? game.sim_tick + 1 : 0,
  });
}
function matchSite(map, pos) {
  return map.motes.findIndex((site) => site[1] === pos[1] && horizontal(site, pos) < 0.001);
}
function growMote(game) {
  if (game.motes.length >= 30) return;
  const sites = game.map.motes.map((pos, index) => ({ pos, index }))
    .filter(({ index }) => !game.motes.some((m) => m.kind === 'random' && m.site === index));
  const site = choose(sites, game.random);
  if (site) mote(game, site.pos, 'random', site.index);
}
function shadeFrom(id, source) {
  return { id, pos: [...source.pos], state: source.state ?? 'chase',
    until: source.state_ticks_left ?? 0, push: null, eject: null,
    drift: [1, 0], patrolAt: 0, site: source.site ?? null };
}
function charmFrom(id, source) {
  return { id, pos: [...source.pos], available: source.available ?? true,
    readyAt: source.respawn_ticks ?? ticks(source.respawn_s ?? 45) };
}
export function createGame(seed, scenario = {}, night = 1) {
  const map = maps[night];
  const p = scenario.player ?? {};
  const pos = [...(p.pos ?? map.start ?? [0, 0, 0])];
  const game = {
    night, map, random: randomFrom(seed), tick: 0, sim_tick: 0, state: 'playing',
    duration: scenario.time_left_s ?? tuning['night' + night + '_duration_s'],
    time_left_s: scenario.time_left_s ?? tuning['night' + night + '_duration_s'], score: 0,
    player: { pos, vel: [0, 0, 0], carried: p.carried ?? 0, flames: p.flames ?? tuning.flames,
      grounded: ground(night, pos) === pos[1], face: [0, 1],
      invuln: p.invuln_ticks ?? 0, dashReady: p.dash_cd_ticks ?? 0,
      pulseReady: p.pulse_cd_ticks ?? 0, charmUntil: p.charm_ticks ?? 0,
      dashUntil: 0, dashDir: [0, 1], launch: null, respawn: null },
    lanterns: map.lanterns.map((base, i) => {
      const id = 'L' + (i + 1);
      const value = scenario.lanterns?.find((l) => l.id === id);
      const deposited = value?.deposited ?? (value?.lit ? tuning.lantern_cost : 0);
      return { id, pos: [...(value?.pos ?? base)], deposited, lit: value?.lit ?? deposited >= tuning.lantern_cost };
    }),
    motes: [], shades: [], drifters: [], charms: [], ids: { mote: 1, shade: 1, drifter: 1 },
    previous: {}, spawnMotes: scenario.random_motes !== false,
    spawnShades: scenario.random_shades !== false,
    spawnDrifters: night > 1 && scenario.random_drifters !== false,
    windEnabled: night === 3 && scenario.wind_enabled !== false,
    wind: { active: false, dir_deg: 0, warning: false },
  };
  if (scenario.motes) {
    for (const position of scenario.motes) mote(game, position, 'random', matchSite(map, position));
  } else if (game.spawnMotes) {
    for (let i = 0; i < 20; i += 1) growMote(game);
  }
  const shades = scenario.shades ?? [];
  const reserved = shades.filter((s) => s.id);
  for (const shade of shades) {
    game.shades.push(shadeFrom(shade.id ?? nextId(game, 'shade', 'S', reserved), shade));
  }
  const drifters = scenario.drifters ?? [];
  const reservedDrifters = drifters.filter((d) => d.id);
  game.drifters = drifters.map((d) => ({
    id: d.id ?? nextId(game, 'drifter', 'D', reservedDrifters), pos: [...d.pos], state: d.state ?? 'idle', stolen: d.stolen ?? 0,
    until: d.state_ticks_left ?? 240, drift: [1, 0], patrolAt: 0,
  }));
  game.charms = (scenario.charms ?? map.charms.map((pos) => ({ pos })))
    .map((c, i) => charmFrom(c.id ?? 'C' + (i + 1), { ...c, pos: c.pos ?? map.charms[i] }));
  return game;
}
function updateWind(game) {
  if (!game.windEnabled) return;
  const offset = game.sim_tick % 1800;
  if (offset === 1680) game.wind.dir_deg = game.random() * 360;
  game.wind.warning = offset >= 1680;
  game.wind.active = game.sim_tick >= 1800 && offset < 300;
}
function movePlayer(game, input, pressed, emit) {
  const p = game.player;
  const now = game.sim_tick;
  if (p.respawn !== null) {
    if (now >= p.respawn) {
      Object.assign(p, { pos: [...(game.map.start ?? [0, 0, 0])], vel: [0, 0, 0], grounded: true,
        invuln: now + 90, respawn: null, launch: null, dashUntil: 0, face: [0, 1] });
    }
    return;
  }

  const [x, z] = input.move;
  const angle = (input.cam_yaw_deg % 360) * Math.PI / 180;
  const length = Math.hypot(x, z);
  const scale = 1 / Math.max(1, length);
  const motion = [(x * Math.cos(angle) + z * Math.sin(angle)) * scale,
    (-x * Math.sin(angle) + z * Math.cos(angle)) * scale];
  if (length) p.face = motion.map((value) => value / Math.hypot(...motion));
  if (pressed.dash && now >= p.dashUntil && (now >= p.dashReady || now < p.charmUntil)) {
    p.dashUntil = now + ticks(tuning.dash_duration_s);
    p.dashReady = now + ticks(tuning.dash_cooldown_s);
    p.dashDir = [...p.face];
    emit('dash', {});
  }
  const dashing = now < p.dashUntil;
  if (pressed.jump && p.grounded && !dashing) {
    p.vel[1] = tuning.jump_speed;
    p.grounded = false;
  }
  const speed = now < p.charmUntil ? 7.2 : tuning.player_speed;
  const [vx, vz] = dashing ? p.dashDir.map((axis) => axis * tuning.dash_speed)
    : p.launch ?? motion.map((axis) => axis * speed);
  const windAngle = game.wind.dir_deg * Math.PI / 180;
  const dx = vx + (game.wind.active ? 2 * Math.cos(windAngle) : 0);
  const dz = vz + (game.wind.active ? 2 * Math.sin(windAngle) : 0);
  const next = point(p.pos, dx, dz, 1 / HZ);
  const oldGround = ground(game.night, p.pos);
  const floor = ground(game.night, next);
  const walkingRamp = p.grounded && floor !== null && Math.abs(floor - p.pos[1]) <= 0.15 &&
    game.night === 3 && (rampHeight(next[0], next[2]) !== null || rampHeight(p.pos[0], p.pos[2]) !== null);
  const projectedY = p.pos[1] + (!p.grounded && !dashing ? p.vel[1] / HZ : 0);
  const blocked = tower(game.night, [next[0], projectedY, next[2]]) ||
    (floor !== null && floor > Math.max(p.pos[1], projectedY) + 0.001 && !walkingRamp);
  p.vel[0] = blocked ? 0 : dx;
  p.vel[2] = blocked ? 0 : dz;
  if (!blocked) p.pos = next;
  const surface = blocked ? oldGround : floor;
  if (walkingRamp && !blocked) {
    p.pos[1] = floor;
  } else if (p.grounded && (surface === null || surface < p.pos[1] - 0.001)) {
    p.grounded = false;
  }
  if (!p.grounded && !dashing) {
    const nextY = p.pos[1] + p.vel[1] / HZ;
    p.vel[1] += tuning.gravity / HZ;
    if (surface !== null && p.pos[1] >= surface - 0.001 && nextY <= surface && p.vel[1] <= 0) {
      p.pos[1] = surface;
      p.vel[1] = 0;
      p.grounded = true;
      p.launch = null;
    } else {
      p.pos[1] = nextY;
    }
  }
  if (p.grounded) {
    const pad = game.map.pads.find((pad) => Math.abs(p.pos[1] - pad.pos[1]) < 0.001 && horizontal(p.pos, pad.pos) <= 1);
    if (pad) {
      p.launch = direction(pad.pos, pad.target).map((axis) => axis * pad.speed);
      p.vel[1] = pad.up;
      p.grounded = false;
    }
  }
  if (p.pos[1] < -10) {
    const lost = p.carried;
    p.carried = 0;
    p.flames = Math.max(0, p.flames - 1);
    p.respawn = now + 60;
    p.vel = [0, 0, 0];
    emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
  }
}
function collect(game, emit) {
  const p = game.player;
  game.motes = game.motes.filter((m) => {
    if (p.carried >= tuning.carry_capacity || game.sim_tick < m.collectAt || !near(p.pos, m.pos, tuning.pickup_radius)) return true;
    p.carried += 1;
    emit('mote_picked', { carried: p.carried });
    return false;
  });
  for (const charm of game.charms) {
    if (!charm.available || !near(p.pos, charm.pos, tuning.pickup_radius)) continue;
    charm.available = false;
    charm.readyAt = game.sim_tick + 2700;
    p.charmUntil = game.sim_tick + 600;
    emit('charm_picked', { charm_id: charm.id, charm_ticks: 600 });
  }
}
export function nearestLantern(game) {
  const p = game.player.pos;
  return game.lanterns.filter((l) => !l.lit).sort((a, b) => horizontal(a.pos, p) - horizontal(b.pos, p) || byId(a, b))[0];
}
function deposit(game, emit) {
  const p = game.player;
  const l = nearestLantern(game);
  if (!l || horizontal(p.pos, l.pos) > tuning.interact_radius) return;
  const amount = Math.min(p.carried, tuning.lantern_cost - l.deposited);
  if (amount <= 0) return;
  p.carried -= amount;
  l.deposited += amount;
  game.score += amount * tuning.score.per_mote;
  emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
  if (l.deposited === tuning.lantern_cost) {
    l.lit = true;
    game.score += tuning.score.per_lantern;
    emit('lantern_lit', { lantern_id: l.id });
  }
}
function flee(d, game, duration) {
  d.state = 'flee';
  d.until = game.sim_tick + duration;
  d.drift = direction(game.player.pos, d.pos);
}
function droppedAt(game, position, count, spread) {
  for (let i = 0; i < count; i += 1) {
    const angle = game.random() * Math.PI * 2;
    const pos = point(position, Math.cos(angle), Math.sin(angle), spread ? 1.5 + game.random() : 0);
    pos[1] = ground(game.night, pos) ?? position[1];
    mote(game, pos, 'dropped');
  }
}
function pulse(game, emit) {
  const p = game.player;
  const now = game.sim_tick;
  if (now < p.pulseReady || p.carried < tuning.pulse_cost) return;
  p.carried -= tuning.pulse_cost;
  p.pulseReady = now + ticks(tuning.pulse_cooldown_s);
  const within = (target) => Math.hypot(horizontal(p.pos, target.pos), p.pos[1] + 0.8 - target.pos[1]) <= tuning.pulse_radius;
  const stunnedIds = [];
  for (const shade of game.shades.filter(within).sort(byId)) {
    shade.state = 'stunned';
    shade.until = now + 120;
    shade.push = { dir: direction(p.pos, shade.pos), speed: 4 / 15, until: now + 15 };
    stunnedIds.push(shade.id);
  }
  game.score += stunnedIds.length * tuning.score.per_stun;
  emit('pulse', { stunned_ids: stunnedIds });
  for (const d of game.drifters.filter(within).sort(byId)) {
    if (d.state === 'chase') flee(d, game, 240);
    else if (d.state === 'flee' && d.stolen > 0) {
      droppedAt(game, d.pos, d.stolen, false);
      emit('drifter_drop', { drifter_id: d.id, amount: d.stolen });
      d.stolen = 0;
      d.until = now + 120;
    }
  }
}
function shadeMove(game, shade, dir, stride, lights, ejection = false) {
  const next = point(shade.pos, ...dir, stride);
  const floor = ground(game.night, next);
  const previousFloor = ground(game.night, shade.pos);
  if (floor === null || (previousFloor !== null && Math.abs(floor - previousFloor) > 0.16) ||
      (!ejection && inLight(next, lights)) || tower(game.night, next)) return false;
  if (floor !== previousFloor) next[1] = floor + 0.8;
  shade.pos = next;
  return true;
}
function updateShades(game, lights) {
  const now = game.sim_tick;
  for (const shade of game.shades) {
    if (shade.state !== 'chase' && shade.state !== 'wander' && now >= shade.until) shade.state = 'wander';
    const containing = lights.filter((l) => horizontal(shade.pos, l.pos) <= tuning.safe_radius);
    if (containing.length) {
      const light = containing[0];
      const directionOut = direction(light.pos, shade.pos);
      const stride = (tuning.safe_radius + 0.001 - horizontal(shade.pos, light.pos)) / 30;
      if (shade.eject?.id !== light.id) shade.eject = { id: light.id, stride };
      shadeMove(game, shade, directionOut, shade.eject.stride, lights, true);
      continue;
    }
    shade.eject = null;
    if (shade.state === 'stunned' || shade.state === 'recoil') {
      const push = shade.push;
      if (push && now < push.until && !shadeMove(game, shade, push.dir, push.speed, lights)) shade.push = null;
      continue;
    }
    if (shade.state === 'spawning') continue;
    const distance = horizontal(game.player.pos, shade.pos);
    if (shade.state === 'chase' && distance > 18) shade.state = 'wander';
    if (shade.state === 'wander' && distance <= 12) shade.state = 'chase';
    if (now >= shade.patrolAt) {
      const angle = game.random() * Math.PI * 2;
      shade.drift = [Math.cos(angle), Math.sin(angle)];
      shade.patrolAt = now + 120;
    }
    const dir = shade.state === 'chase' ? direction(shade.pos, game.player.pos) : shade.drift;
    const speed = game.night === 3 ? tuning.shade_speed_night3 : tuning.shade_speed;
    if (!shadeMove(game, shade, dir, speed / HZ, lights)) shade.patrolAt = now;
  }
}
function updateDrifters(game) {
  const p = game.player;
  const now = game.sim_tick;
  game.drifters = game.drifters.filter((d) => d.state !== 'removed' && !(d.state === 'flee' && now >= d.until));
  for (const d of game.drifters) {
    if (d.state === 'flee') {
      d.pos = point(d.pos, ...d.drift, 7 / HZ);
      continue;
    }
    d.state = p.carried >= 5 && horizontal(d.pos, p.pos) <= 15 ? 'chase' : 'idle';
    if (d.state === 'idle' && now >= d.patrolAt) {
      const angle = game.random() * Math.PI * 2;
      d.drift = [Math.cos(angle), Math.sin(angle)];
      d.patrolAt = now + 150;
    }
    const dir = d.state === 'chase' ? direction(d.pos, p.pos) : d.drift;
    d.pos = point(d.pos, ...dir, (d.state === 'chase' ? 7 : 2) / HZ);
  }
}
function contacts(game, lights, emit) {
  const p = game.player;
  if (p.respawn !== null) return;
  const now = game.sim_tick;
  for (const d of [...game.drifters].sort(byId)) {
    if (d.state !== 'chase' || horizontal(d.pos, p.pos) > 1.2) continue;
    d.stolen = Math.min(3, p.carried);
    p.carried -= d.stolen;
    flee(d, game, 240);
    emit('drifter_steal', { drifter_id: d.id, amount: d.stolen, carried: p.carried });
  }
  if (now < p.invuln || inLight(p.pos, lights)) return;
  const shade = [...game.shades].sort(byId).find((s) =>
    ['wander', 'chase'].includes(s.state) && !s.eject && !inLight(s.pos, lights) && near(p.pos, s.pos, tuning.shade_hit_radius));
  if (!shade) return;
  p.flames = Math.max(0, p.flames - 1);
  const dropped = Math.floor(p.carried * tuning.hit_drop_ratio);
  p.carried -= dropped;
  droppedAt(game, p.pos, dropped, true);
  p.invuln = now + 90;
  shade.state = 'recoil';
  shade.until = now + 61;
  shade.push = { dir: direction(p.pos, shade.pos), speed: 2 / 60, until: now + 61 };
  emit('player_hit', { by: 'shade', flames: p.flames, dropped });
}
function spawn(game, lights, emit) {
  const now = game.sim_tick;
  if (game.spawnMotes && now % 240 === 0) growMote(game);
  if (game.spawnShades && now >= 300 && (now - 300) % game.map.shadeInterval === 0) {
    for (let i = 0; i < (now === 300 ? 2 : 1) && game.shades.length < game.map.shadeCap; i += 1) {
      const available = game.map.shades.map((pos, site) => ({ pos, site })).filter(({ pos, site }) =>
        horizontal(pos, game.player.pos) >= 15 && !inLight(pos, lights) &&
        !game.shades.some((shade) => shade.site === site && horizontal(shade.pos, pos) < 1));
      const origin = choose(available, game.random);
      if (!origin) break;
      const id = nextId(game, 'shade', 'S', game.shades);
      const pos = [...origin.pos];
      pos[1] += 0.8;
      game.shades.push(shadeFrom(id, { ...origin, pos, state: 'spawning', state_ticks_left: now + 1 }));
      emit('shade_spawned', { id });
    }
  }
  if (game.spawnDrifters && now % 1200 === 0 && game.drifters.length < 2) {
    const origin = choose(game.map.shades, game.random);
    const id = nextId(game, 'drifter', 'D', game.drifters);
    game.drifters.push({ id, pos: [origin[0], 1.5, origin[2]], state: 'idle', stolen: 0,
      until: 0, drift: [1, 0], patrolAt: 0 });
  }
}
export function step(game, input = idleInput) {
  if (game.state !== 'playing' && game.state !== 'paused') return [];
  game.tick += 1;
  const events = [];
  const emit = (name, data) => events.push({ type: 'event', tick: game.tick, name, data });
  const pressed = Object.fromEntries(buttons.map((key) => [key, Boolean(input[key] && !game.previous[key])]));
  game.previous = Object.fromEntries(buttons.map((key) => [key, Boolean(input[key])]));
  if (pressed.pause) {
    game.state = game.state === 'paused' ? 'playing' : 'paused';
    emit(game.state === 'paused' ? 'paused' : 'resumed', {});
  }
  if (game.state === 'paused') return events;
  game.sim_tick += 1;
  game.time_left_s = Math.max(0, game.duration - game.sim_tick / HZ);
  game.motes = game.motes.filter((m) => m.expires === null || m.expires > game.sim_tick);
  for (const c of game.charms) if (!c.available && c.readyAt <= game.sim_tick) c.available = true;
  updateWind(game);
  movePlayer(game, input, pressed, emit);
  if (game.player.respawn === null) {
    collect(game, emit);
    if (pressed.interact) deposit(game, emit);
  }
  const lights = game.lanterns.filter((l) => l.lit);
  if (game.player.respawn === null && pressed.pulse) pulse(game, emit);
  updateShades(game, lights);
  updateDrifters(game);
  contacts(game, lights, emit);
  spawn(game, lights, emit);
  const reason = game.player.flames === 0 ? 'no_flames'
    : lights.length === game.lanterns.length ? 'all_lit' : game.time_left_s === 0 ? 'dawn' : null;
  if (reason) {
    game.state = reason === 'all_lit' ? 'won' : 'lost';
    if (game.state === 'won') game.score += Math.floor(game.time_left_s) * tuning.score.per_second_left +
      game.player.flames * tuning.score.per_flame_left;
    emit('game_over', { result: game.state, reason });
  }
  return events;
}

const rounded = (pos) => pos.map((value) => Math.round(value * 1000) / 1000);
const remaining = (deadline, game) => Math.max(0, deadline - game.sim_tick) / HZ;
export function snapshot(game) {
  const p = game.player;
  return {
    type: 'snapshot', tick: game.tick, sim_tick: game.sim_tick, night: game.night,
    state: game.state, time_left_s: game.time_left_s,
    wind: { active: game.wind.active, dir_deg: game.wind.dir_deg },
    player: { pos: rounded(p.pos), vel: rounded(p.vel), flames: p.flames, carried: p.carried,
      grounded: p.grounded, invuln: p.invuln > game.sim_tick,
      dash_cd_s: p.charmUntil > game.sim_tick ? 0 : remaining(p.dashReady, game),
      pulse_cd_s: remaining(p.pulseReady, game), charm_s: remaining(p.charmUntil, game) },
    lanterns: game.lanterns.map((l) => ({ ...l, pos: rounded(l.pos) })),
    shades: game.shades.map(({ id, pos, state }) => ({ id, pos: rounded(pos), state })),
    motes_active: game.motes.length,
    motes: game.motes.map(({ id, pos, kind, expires }) =>
      ({ id, pos: rounded(pos), kind, ttl_s: expires === null ? null : remaining(expires, game) })),
    drifters: game.drifters.map(({ id, pos, state, stolen }) => ({ id, pos: rounded(pos), state, stolen })),
    charms: game.charms.map(({ id, available, readyAt }) =>
      ({ id, available, respawn_s: available ? 0 : remaining(readyAt, game) })),
  };
}
