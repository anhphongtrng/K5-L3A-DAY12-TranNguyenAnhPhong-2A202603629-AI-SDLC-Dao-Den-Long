import * as THREE from 'three';
import { createGame, HZ, ISLAND_RADIUS, step, tuning } from '../game/simulation.js';
import './style.css';

const byId = (id) => document.getElementById(id);
const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft',
  'ArrowRight', 'Space', 'KeyF', 'KeyR', 'KeyQ', 'KeyE']);

function startScene() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  byId('scene').append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15132d);
  scene.fog = new THREE.FogExp2(0x15132d, 0.024);
  const ambient = new THREE.HemisphereLight(0xa9b6ff, 0x42304d, 1.35);
  const moonlight = new THREE.DirectionalLight(0xc4ceff, 1.8);
  moonlight.position.set(-5, 9, -3);
  scene.add(ambient, moonlight);

  function mesh(geometry, color) {
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, flatShading: true }));
  }

  const island = mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, 15, 2.4, 64), 0x394c42);
  island.position.y = -1.2;
  scene.add(island);

  const player = new THREE.Group();
  const robe = mesh(new THREE.CapsuleGeometry(0.29, 0.62, 4, 8), 0x57b8ad);
  robe.position.y = 0.62;
  const hat = mesh(new THREE.ConeGeometry(0.55, 0.35, 12), 0xe6bd78);
  hat.position.y = 1.25;
  const charm = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc574 }),
  );
  charm.position.set(0.39, 1, 0);
  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(tuning.pulse_radius - 0.06, tuning.pulse_radius, 48),
    new THREE.MeshBasicMaterial({ color: 0xffcf75, side: THREE.DoubleSide, transparent: true, depthWrite: false }),
  );
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.06;
  player.add(robe, hat, charm);
  scene.add(player, pulseRing);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
  function resize() {
    const { clientWidth, clientHeight } = byId('scene');
    camera.aspect = clientWidth / Math.max(1, clientHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  const interactive = new THREE.Group();
  scene.add(interactive);
  const postGeometry = new THREE.CylinderGeometry(0.16, 0.22, 1.35, 8);
  const bulbGeometry = new THREE.SphereGeometry(0.43, 10, 8);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x795342 });
  const darkBulb = new THREE.MeshStandardMaterial({ color: 0x846450 });
  const brightBulb = new THREE.MeshBasicMaterial({ color: 0xffbb66 });
  const moteGeometry = new THREE.IcosahedronGeometry(0.12, 0);
  const moteMaterial = new THREE.MeshBasicMaterial({ color: 0xffdc7a });
  const shadeGeometry = new THREE.IcosahedronGeometry(0.68, 1);
  const shadeMaterial = new THREE.MeshStandardMaterial({ color: 0x30204e, emissive: 0x22123b });
  const stunnedMaterial = new THREE.MeshStandardMaterial({ color: 0x6b519b, emissive: 0x5f3e6c });
  const hud = Object.fromEntries(['flames', 'carried', 'lit', 'time', 'score'].map((id) => [id, byId(id)]));
  const keys = new Set();
  let game;
  let view;
  let yaw;
  let accumulator;
  let lastPulse;
  let lastTime;

  function reset() {
    game = createGame(202603629);
    accumulator = 0;
    yaw = 0;
    lastPulse = -Infinity;
    keys.clear();
    interactive.clear();
    view = {
      lanterns: game.lanterns.map((lantern) => {
        const group = new THREE.Group();
        group.position.fromArray(lantern.pos);
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 0.675;
        const bulb = new THREE.Mesh(bulbGeometry, darkBulb);
        bulb.position.y = 1.5;
        const light = new THREE.PointLight(0xffaa55, 0, 7);
        light.position.copy(bulb.position);
        group.add(post, bulb, light);
        interactive.add(group);
        return { bulb, light };
      }),
      motes: new Map(game.motes.map((pos) => {
        const mote = new THREE.Mesh(moteGeometry, moteMaterial);
        mote.position.fromArray(pos);
        interactive.add(mote);
        return [pos, mote];
      })),
      shades: game.shades.map(() => {
        const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
        interactive.add(shade);
        return shade;
      }),
    };
    byId('result').hidden = true;
    renderer.domElement.focus();
  }

  renderer.domElement.tabIndex = -1;
  byId('restart').addEventListener('click', reset);
  window.addEventListener('keydown', (event) => {
    if (!controls.has(event.code) || event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  const axis = (forward, backward) => Number(forward) - Number(backward);
  function advance() {
    yaw += axis(keys.has('KeyE'), keys.has('KeyQ')) * 2.5;
    const events = step(game, {
      move: [
        axis(keys.has('KeyA') || keys.has('ArrowLeft'), keys.has('KeyD') || keys.has('ArrowRight')),
        axis(keys.has('KeyW') || keys.has('ArrowUp'), keys.has('KeyS') || keys.has('ArrowDown')),
      ],
      cam_yaw_deg: yaw,
      jump: keys.has('Space'),
      interact: keys.has('KeyF'),
      pulse: keys.has('KeyR'),
    });
    if (events.some((event) => event.name === 'pulse')) lastPulse = game.tick;
    const ending = events.find((event) => event.name === 'game_over');
    if (ending) {
      byId('result-title').textContent = game.state === 'won' ? 'Đảo đã sáng!' : 'Đêm đã kết thúc';
      const reason = {
        all_lit: 'Bạn đã thắp cả năm đèn.',
        no_flames: 'Mây đã hết máu.',
        dawn: 'Đã hết thời gian để thắp đèn.',
      }[ending.data.reason];
      byId('result-detail').textContent = `${reason} Điểm: ${game.score}.`;
      byId('result').hidden = false;
      byId('restart').focus();
    }
  }

  function render(milliseconds) {
    player.position.fromArray(game.player.pos);
    const litCount = game.lanterns.filter((lantern) => lantern.lit).length;
    ambient.intensity = 1.35 + litCount * 0.22;
    game.lanterns.forEach((lantern, index) => {
      const { bulb, light } = view.lanterns[index];
      bulb.material = lantern.lit ? brightBulb : darkBulb;
      light.intensity = lantern.lit ? 28 : 0;
    });
    const activeMotes = new Set(game.motes);
    for (const [pos, mote] of view.motes) {
      mote.visible = activeMotes.has(pos);
      mote.position.y = pos[1] + 0.36 + 0.09 * Math.sin(milliseconds / 220 + pos[0]);
    }
    game.shades.forEach((shade, index) => {
      view.shades[index].position.fromArray(shade.pos);
      view.shades[index].material = shade.state === 'stunned' ? stunnedMaterial : shadeMaterial;
    });
    const pulseAge = game.tick - lastPulse;
    pulseRing.visible = pulseAge < 24;
    pulseRing.position.set(player.position.x, 0.06, player.position.z);
    pulseRing.material.opacity = Math.max(0, 0.8 * (1 - pulseAge / 24));

    const angle = THREE.MathUtils.degToRad(yaw);
    camera.position.copy(player.position).add(new THREE.Vector3(
      -Math.sin(angle) * 6.7, 4.6, -Math.cos(angle) * 6.7,
    ));
    camera.lookAt(player.position.x + Math.sin(angle) * 1.8,
      player.position.y + 0.55, player.position.z + Math.cos(angle) * 1.8);
    hud.flames.textContent = game.player.flames;
    hud.carried.textContent = `${game.player.carried}/${tuning.carry_capacity}`;
    hud.lit.textContent = `${litCount}/${tuning.lantern_count_night1}`;
    hud.time.textContent = `${Math.ceil(game.time_left_s)} s`;
    hud.score.textContent = game.score;
    renderer.render(scene, camera);
  }

  reset();
  renderer.setAnimationLoop((milliseconds) => {
    accumulator += Math.min(0.1, (milliseconds - (lastTime ?? milliseconds)) / 1000);
    lastTime = milliseconds;
    while (accumulator >= 1 / HZ) {
      if (game.state === 'playing') advance();
      accumulator -= 1 / HZ;
    }
    render(milliseconds);
  });
}

try {
  startScene();
} catch (error) {
  byId('scene-error').hidden = false;
  console.error(error);
}
