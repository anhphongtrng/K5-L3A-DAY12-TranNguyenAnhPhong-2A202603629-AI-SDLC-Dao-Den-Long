import { capacity, createGame, HZ, interactionLantern, lanternCost, nearestLantern, step, tuning } from '../game/simulation.js';
import { horizontal, maps } from '../game/maps.js';
import { createAudio } from './audio.js';
import { createView } from './view.js';
import { bindings, createControls } from './controls.js';
import { loadScores, saveScore } from './scores.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const seed = 202603629;
const intro = {
  1: 'Ông Đăng: Thắp và châm dầu để giữ ít nhất 3 đèn sáng tới bình minh.',
  2: 'Ông Đăng: Giữ 4 đèn sáng tới bình minh. Dùng bục nhảy để qua đảo và coi chừng Gió Lạc.',
  3: 'Ông Đăng: Giữ 5 đèn sáng tới bình minh. Theo dốc và bục nhảy để tới tháp chuông.',
};
const metric = new URLSearchParams(location.search).has('fps');
function settingsValue(id, fallback) {
  const value = Number(localStorage.getItem('lantern:' + id) ?? fallback);
  return Number.isFinite(value) ? Math.max(id === 'sensitivity' ? 0.1 : 0, Math.min(1, value)) : fallback;
}
function start() {
  const view = createView($('scene'));
  const audio = createAudio();
  const keys = new Set();
  const pending = new Set();
  const controls = createControls($('bindings'), $('binding-status'), document.querySelector('footer'));
  $('reset-bindings').addEventListener('click', controls.reset);
  for (const id of ['reduce-motion', 'large-text']) {
    const option = $(id);
    option.checked = localStorage.getItem('lantern:' + id) === 'true';
    document.documentElement.classList.toggle(id, option.checked);
    option.addEventListener('change', () => {
      localStorage.setItem('lantern:' + id, String(option.checked));
      document.documentElement.classList.toggle(id, option.checked);
    });
  }
  const slots = Array.from({ length: tuning.capacity_max }, () => $('motes').appendChild(document.createElement('span')));
  const palette = $('accessible-palette');
  palette.checked = localStorage.getItem('lantern:accessible-palette') === 'true';
  function applyPalette() {
    document.documentElement.classList.toggle('accessible-palette', palette.checked);
    view.setAccessiblePalette(palette.checked);
  }
  palette.addEventListener('change', () => {
    localStorage.setItem('lantern:accessible-palette', String(palette.checked));
    applyPalette();
  });
  applyPalette();
  let sensitivity = settingsValue('sensitivity', 0.45);
  let night = 1;
  let total = 0;
  let game = createGame(seed);
  let screen = 'menu';
  let yaw = 0;
  let elapsed = 0;
  let lastTime;
  let lastSecond;
  let warning = false;
  let measurementStart;
  let measuredFrames = 0;
  let lastPulse = -Infinity;
  let shadeAlert;
  let scoreEntry;
  $('save-score').addEventListener('submit', async (event) => {
    event.preventDefault();
    const entry = scoreEntry;
    scoreEntry = null;
    if (!entry) return;
    const submit = $('save-score').querySelector('button');
    submit.disabled = true;
    try {
      await saveScore({ ...entry, name: $('player-name').value });
      $('save-status').textContent = 'Đã lưu điểm.';
    } catch (error) {
      $('save-status').textContent = error.message;
      if (screen === 'result') { scoreEntry = entry; submit.disabled = false; }
    }
  });
  $('volume').value = settingsValue('volume', 0.5);
  $('sensitivity').value = sensitivity;
  audio.volume(Number($('volume').value));
  for (const id of ['volume', 'sensitivity']) {
    $(id).addEventListener('input', () => {
      const value = Number($(id).value);
      localStorage.setItem('lantern:' + id, String(value));
      if (id === 'volume') audio.volume(value);
      else sensitivity = value;
    });
  }

  function panel(next, title, copy, actions) {
    screen = next;
    controls.cancel();
    $('save-score').hidden = true;
    $('leaderboard').hidden = true;
    keys.clear();
    pending.clear();
    $('panel').hidden = false;
    $('panel-title').textContent = title;
    $('panel-copy').textContent = copy;
    $('settings').hidden = next !== 'settings';
    $('actions').replaceChildren(...actions.map(([label, click]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', click);
      return button;
    }));
    $('actions').firstElementChild?.focus();
    audio.music(false);
  }
  function menu() {
    total = 0;
    night = 1;
    yaw = 0;
    lastPulse = -Infinity;
    game = createGame(seed);
    view.reset(game);
    $('hud').hidden = true;
    panel('menu', 'Đảo Đèn Lồng', 'Đưa ánh sáng trở lại ba hòn đảo trước bình minh.',
      [['Bắt đầu', briefing], ['Bảng xếp hạng', scores], ['Cài đặt', () => settings(menu)]]);
  }
  async function scores() {
    panel('scores', 'Bảng xếp hạng', '', [['Về menu', menu]]);
    try {
      const entries = await loadScores();
      if (screen !== 'scores') return;
      $('leaderboard').replaceChildren(...entries.map((entry) => {
        const item = document.createElement('li');
        item.textContent = entry.name + ' · ' + entry.score + ' điểm · ' + entry.nights_won + '/3 Đêm';
        return item;
      }));
      $('leaderboard').hidden = entries.length === 0;
      if (!entries.length) $('panel-copy').textContent = 'Chưa có điểm được lưu.';
    } catch (error) {
      if (screen === 'scores') $('panel-copy').textContent = error.message;
    }
  }
  function briefing() {
    $('hud').hidden = true;
    panel('briefing', 'Đêm ' + night + ' · ' + maps[night].name, intro[night],
      [['Vào đảo', startNight], ['Về menu', menu]]);
  }
  function playScreen() {
    screen = 'playing';
    $('panel').hidden = true;
    $('hud').hidden = false;
    keys.clear();
    pending.clear();
    view.canvas.focus();
    audio.music(true);
  }
  function startNight() {
    audio.start();
    game = createGame(seed, {}, night);
    yaw = 0;
    lastPulse = -Infinity;
    elapsed = 0;
    lastSecond = null;
    measurementStart = undefined;
    measuredFrames = 0;
    $('fps').hidden = true;
    warning = false;
    shadeAlert = undefined;
    view.reset(game);
    playScreen();
  }
  function settings(back) {
    panel('settings', 'Cài đặt', '', [['Quay lại', back]]);
  }
  function paused() {
    panel('paused', 'Tạm dừng', 'Đêm ' + night + ' · ' + maps[night].name,
      [['Tiếp tục', resume], ['Chơi lại Đêm', startNight], ['Cài đặt', () => settings(paused)], ['Về menu', menu]]);
  }
  function resume() {
    step(game, {});
    step(game, { ...input(), pause: true });
    playScreen();
  }
  function ending(result, reason) {
    if (result === 'won') total += game.score;
    const title = result === 'won' ? (night === 3 ? 'Bình Minh' : 'Đảo đã sáng!') : 'Đêm đã kết thúc';
    const copy = result === 'won' ? 'Điểm Đêm ' + night + ' là ' + game.score + ' · Tổng điểm ' + total
      : reason === 'no_flames' ? 'Mây đã hết Ngọn Lửa.' : 'Bình minh đến khi chưa đủ đèn đang sáng.';
    const actions = result === 'lost' ? [['Chơi lại Đêm', startNight]]
      : night < 3 ? [['Đêm kế tiếp', () => { night += 1; briefing(); }]] : [];
    panel('result', title, copy, [...actions, ['Về menu', menu]]);
    if (result === 'lost' || night === 3) {
      scoreEntry = { score: total, seed, nights_won: result === 'won' ? 3 : night - 1 };
      $('save-score').hidden = false;
      $('save-score').reset();
      $('save-score').querySelector('button').disabled = false;
      $('save-status').textContent = '';
    }
  }
  function input() {
    const held = (action) => controls.keys(action).some((key) => keys.has(key));
    const has = (action) => held(action) || controls.keys(action).some((key) => pending.has(key));
    const x = Number(held('left')) - Number(held('right'));
    const z = Number(held('up')) - Number(held('down'));
    const result = { move: [x, z], cam_yaw_deg: yaw, jump: has('jump'), interact: has('interact'),
      pulse: has('pulse'), dash: has('dash') };
    pending.clear();
    return result;
  }
  window.addEventListener('keydown', (event) => {
    if (screen === 'settings' && controls.capture(event)) return;
    if (!Object.keys(bindings).some((action) => controls.keys(action).includes(event.code))) return;
    if (controls.keys('pause').includes(event.code)) {
      if (event.repeat || !['playing', 'paused'].includes(screen)) return;
      event.preventDefault();
      if (screen === 'paused') resume();
      else {
        step(game, { ...input(), pause: true });
        paused();
      }
      return;
    }
    if (screen !== 'playing') return;
    event.preventDefault();
    keys.add(event.code);
    if (!event.repeat) pending.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); pending.clear(); });
  view.canvas.addEventListener('pointerdown', (event) => {
    if (screen === 'playing') view.canvas.setPointerCapture(event.pointerId);
  });
  view.canvas.addEventListener('pointermove', (event) => {
    if (screen === 'playing' && view.canvas.hasPointerCapture(event.pointerId)) {
      yaw = (yaw - event.movementX * sensitivity) % 360;
    }
  });
  function advance() {
    const command = input();
    const jumping = command.jump && !game.previous.jump && game.player.grounded;
    const events = step(game, command);
    if (jumping && game.player.vel[1] > 0) audio.play('jump');
    if (game.wind.warning && !warning) audio.play('wind');
    warning = game.wind.warning;
    const second = Math.ceil(game.time_left_s);
    if (second !== lastSecond && second > 0 && second <= 10) audio.play('countdown');
    lastSecond = second;
    for (const event of events) {
      if (event.name === 'pulse') lastPulse = game.sim_tick;
      if (event.name === 'shade_spawned') shadeAlert = { id: event.data.id, until: game.sim_tick + 180 };
      if (event.name === 'game_over') {
        audio.play(event.data.result);
        ending(event.data.result, event.data.reason);
      } else audio.play(event.name);
    }
  }
  function hud() {
    const p = game.player;
    const remaining = (tick) => Math.max(0, (tick - game.sim_tick) / HZ);
    const seconds = Math.ceil(game.time_left_s);
    const lit = game.lanterns.filter((l) => l.lit).length;
    $('flames').textContent = 'Ngọn Lửa ' + '◆'.repeat(p.flames) + '◇'.repeat(tuning.flames - p.flames);
    $('time').textContent = (palette.checked && seconds <= 30 ? '⚠ ' : '') +
      String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    $('time').classList.toggle('danger', seconds <= 30);
    const need = Math.ceil(tuning.win_ratio * game.lanterns.length);
    $('score').textContent = 'Đèn ' + lit + '/' + game.lanterns.length + ' · Cần ' + need + ' · Điểm ' + game.score;
    const limit = capacity(p.successfulLights);
    slots.forEach((slot, index) => {
      slot.hidden = index >= limit;
      slot.classList.toggle('filled', index < p.carried);
    });
    $('capacity').textContent = 'Đom đóm ' + p.carried + '/' + limit;
    const charm = remaining(p.charmUntil);
    $('cooldowns').textContent = '⇢ Lướt ' + (charm ? 'Sẵn sàng' : remaining(p.dashReady).toFixed(1) + 's') +
      ' · ✧ Tỏa Sáng ' + remaining(p.pulseReady).toFixed(1) + 's' + (charm ? ' · Bùa ' + charm.toFixed(1) + 's' : '');
    const target = nearestLantern(game);
    const interact = interactionLantern(game);
    $('prompt').textContent = interact && horizontal(p.pos, interact.pos) <= tuning.interact_radius
      ? controls.labelFor('interact') + (interact.lit ? ' — Châm dầu (' + (interact.fuelUnits / HZ).toFixed(1) + '/100)'
        : ' — Nạp ánh sáng (' + interact.deposited + '/' + lanternCost(interact) + ')') : '';
    $('wind').textContent = game.wind.warning || game.wind.active
      ? (palette.checked ? '⚠ ' : '') + (game.wind.warning ? 'Gió mạnh sắp tới' : 'Gió mạnh') : '';
    const arrow = target && view.offscreen(target.pos);
    $('indicator').hidden = !target || arrow === null;
    if (target && arrow !== null) $('indicator').style.transform = 'rotate(' + arrow + 'rad)';
    const enemy = shadeAlert && game.sim_tick < shadeAlert.until && game.shades.find((s) => s.id === shadeAlert.id);
    const low = game.lanterns.filter((lantern) => lantern.lit && lantern.fuelUnits < tuning.low_fuel_threshold * HZ);
    const alert = [enemy && 'Bóng Mực xuất hiện', seconds > 0 && seconds <= 10 && '10 giây cuối',
      low.length > 0 && 'Đèn ít dầu ' + low.map((l) => l.id).join(', ')].filter(Boolean).join(' · ');
    if ($('warnings').textContent !== alert) $('warnings').textContent = alert;
    $('shade-marker').hidden = !enemy;
    if (enemy) {
      const angle = view.offscreen(enemy.pos, true);
      const marker = $('shade-marker');
      marker.style.left = (50 + Math.sin(angle) * 45) + '%';
      marker.style.top = (50 - Math.cos(angle) * 43) + '%';
      marker.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'rad)';
    }
  }
  menu();
  view.onFrame((now) => {
    elapsed += Math.min(0.1, (now - (lastTime ?? now)) / 1000);
    lastTime = now;
    while (elapsed >= 1 / HZ) {
      elapsed -= 1 / HZ;
      if (screen === 'playing') advance();
    }
    view.render(game, yaw, now, $('reduce-motion').checked ? Infinity : game.sim_tick - lastPulse,
      null, $('reduce-motion').checked);
    if (!$('hud').hidden) hud();
    if (screen === 'playing') {
      if (metric) {
        measurementStart ??= now;
        measuredFrames += 1;
        const sample = now - measurementStart;
        if (sample >= 10000) {
          $('fps').hidden = false;
          $('fps').textContent = ((measuredFrames - 1) * 1000 / sample).toFixed(1) + ' FPS · ' +
            innerWidth + '×' + innerHeight + ' · ' + (sample / 1000).toFixed(1) + ' s';
          measurementStart = now;
          measuredFrames = 1;
        }
      }
    }
  });
}
try {
  start();
} catch (error) {
  $('scene-error').hidden = false;
  console.error(error);
}
