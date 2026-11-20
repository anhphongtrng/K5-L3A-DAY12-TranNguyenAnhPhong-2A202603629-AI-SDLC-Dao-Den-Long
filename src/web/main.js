import { createGame, HZ, nearestLantern, step, tuning } from '../game/simulation.js';
import { horizontal, maps } from '../game/maps.js';
import { createAudio } from './audio.js';
import { createView } from './view.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const seed = 202603629;
const keyCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft',
  'ArrowRight', 'Space', 'KeyE', 'KeyR', 'ShiftLeft', 'ShiftRight', 'KeyP', 'Escape']);
const intro = {
  1: 'Ông Đăng: Mây ơi, hãy gom đom đóm và thắp sáng năm ngọn đèn trên Đảo Bến.',
  2: 'Ông Đăng: Cầu tre nối hai bờ. Hãy dùng bục nhảy và coi chừng Gió Lạc.',
  3: 'Ông Đăng: Theo dốc lên tầng cao và dùng bục nhảy để tới tháp chuông.',
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
  const slots = Array.from({ length: 10 }, () => $('motes').appendChild(document.createElement('span')));
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
      [['Bắt đầu', briefing], ['Cài đặt', () => settings(menu)]]);
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
      : reason === 'no_flames' ? 'Mây đã hết Ngọn Lửa.' : 'Đã hết thời gian để thắp đèn.';
    const actions = result === 'lost' ? [['Chơi lại Đêm', startNight]]
      : night < 3 ? [['Đêm kế tiếp', () => { night += 1; briefing(); }]] : [];
    panel('result', title, copy, [...actions, ['Về menu', menu]]);
  }
  function input() {
    const x = Number(keys.has('KeyA') || keys.has('ArrowLeft')) - Number(keys.has('KeyD') || keys.has('ArrowRight'));
    const z = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const has = (code) => keys.has(code) || pending.has(code);
    const result = { move: [x, z], cam_yaw_deg: yaw, jump: has('Space'), interact: has('KeyE'),
      pulse: has('KeyR'), dash: has('ShiftLeft') || has('ShiftRight') };
    pending.clear();
    return result;
  }
  window.addEventListener('keydown', (event) => {
    if (!keyCodes.has(event.code)) return;
    if (event.code === 'KeyP' || event.code === 'Escape') {
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
    $('time').textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    $('time').classList.toggle('danger', seconds <= 30);
    $('score').textContent = 'Đèn ' + lit + '/' + game.lanterns.length + ' · Điểm ' + game.score;
    slots.forEach((slot, index) => slot.classList.toggle('filled', index < p.carried));
    $('motes').setAttribute('aria-label', 'Đom đóm ' + p.carried + '/10');
    const charm = remaining(p.charmUntil);
    $('cooldowns').textContent = '⇢ Lướt ' + (charm ? 'Sẵn sàng' : remaining(p.dashReady).toFixed(1) + 's') +
      ' · ✧ Tỏa Sáng ' + remaining(p.pulseReady).toFixed(1) + 's' + (charm ? ' · Bùa ' + charm.toFixed(1) + 's' : '');
    const target = nearestLantern(game);
    $('prompt').textContent = target && horizontal(p.pos, target.pos) <= tuning.interact_radius
      ? 'E — Nạp ánh sáng (' + target.deposited + '/10)' : '';
    $('wind').textContent = game.wind.warning ? 'Gió mạnh sắp tới' : game.wind.active ? 'Gió mạnh' : '';
    const arrow = target && view.offscreen(target.pos);
    $('indicator').hidden = !target || arrow === null;
    if (target && arrow !== null) $('indicator').style.transform = 'rotate(' + arrow + 'rad)';
  }
  menu();
  view.onFrame((now) => {
    elapsed += Math.min(0.1, (now - (lastTime ?? now)) / 1000);
    lastTime = now;
    while (elapsed >= 1 / HZ) {
      elapsed -= 1 / HZ;
      if (screen === 'playing') advance();
    }
    view.render(game, yaw, now, game.sim_tick - lastPulse);
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
