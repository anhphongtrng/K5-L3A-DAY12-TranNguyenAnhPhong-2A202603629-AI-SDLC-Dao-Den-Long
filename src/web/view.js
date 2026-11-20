import * as THREE from 'three';
import { HZ, LOW_FUEL, MAX_FUEL } from '../game/simulation.js';
import { ground, rampAngles } from '../game/maps.js';

const color = {
  sky: 0x0e1430, fog: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a,
  wood: 0x6b4a2f, cloud: 0x12384a, lantern: 0xffb347, core: 0xffe9b0,
  dark: 0x5b5f6e, mote: 0xfff6c2, glow: 0xffe58a, shade: 0x120a1a,
  rim: 0x7a3cff, stun: 0x3a3450, robe: 0xe8e2d0, scarf: 0xc8102e,
  gold: 0xf2c14e, drifter: 0x8fa3b8,
};
const standard = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true });
const flat = (c) => new THREE.MeshBasicMaterial({ color: c });
const place = (parent, geometry, material, pos) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(pos);
  parent.add(mesh);
  return mesh;
};
const cylinder = (r, h) => new THREE.CylinderGeometry(r, r, h, 48);
const sphere = (r) => new THREE.IcosahedronGeometry(r, 1);

export function createView(container, { pixelRatio = Math.min(window.devicePixelRatio, 1.5) } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(pixelRatio);
  container.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(color.sky);
  scene.fog = new THREE.FogExp2(color.fog, 0.011);
  const ambient = new THREE.HemisphereLight(0xffffff, color.cloud, 0.15);
  const moon = new THREE.DirectionalLight(0xd3e0ff, 2);
  moon.position.set(-8, 12, -5);
  scene.add(ambient, moon);
  place(scene, new THREE.BoxGeometry(600, 1, 600), standard(color.cloud), [25, -13, 0]);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
  const character = new THREE.Group();
  const robe = new THREE.CapsuleGeometry(0.29, 0.62, 4, 8);
  place(character, robe, standard(color.robe), [0, 0.62, 0]);
  place(character, new THREE.ConeGeometry(0.55, 0.32, 12), standard(color.sand), [0, 1.25, 0]);
  place(character, new THREE.BoxGeometry(0.49, 0.13, 0.45), standard(color.scarf), [0, 0.92, 0]);
  place(character, sphere(0.13), flat(color.core), [0.43, 0.89, 0.05]);
  scene.add(character);
  const layers = new THREE.Group();
  scene.add(layers);
  const dark = standard(color.dark);
  const lit = flat(color.lantern);
  const glow = flat(color.glow);
  const core = flat(color.core);
  const mote = flat(color.mote);
  const shade = standard(color.shade);
  const stun = standard(color.stun);
  const rim = flat(color.rim);
  const drifter = standard(color.drifter);
  const red = standard(color.scarf);
  const gold = flat(color.gold);
  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: color.glow, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const pulseRing = place(scene, new THREE.RingGeometry(4.9, 5, 48), pulseMaterial, [0, 0, 0]);
  pulseRing.rotation.x = -Math.PI / 2;
  const grass = standard(color.grass);
  const sand = standard(color.sand);
  const wood = standard(color.wood);
  const orb = sphere(0.15);
  const shadeShape = sphere(0.7);
  const windLeaf = new THREE.BoxGeometry(0.24, 0.027, 0.13);
  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', resize);
  resize();
  let lanterns = [];
  let entities = new Map();
  let leaves = [];
  const terrain = new THREE.Group();
  layers.add(terrain);
  const project = new THREE.Vector3();

  function reset(game) {
    layers.traverse((item) => {
      if (item.isMesh && item.userData.owned) item.geometry.dispose();
    });
    const owned = (parent, geometry, material, pos) => {
      const mesh = place(parent, geometry, material, pos);
      mesh.userData.owned = true;
      return mesh;
    };
    layers.clear();
    terrain.clear();
    layers.add(terrain);
    entities = new Map();
    for (const [x, radius] of game.map.islands) {
      owned(terrain, cylinder(radius, 2.4), grass, [x, -1.2, 0]);
    }
    if (game.night === 2) {
      owned(terrain, new THREE.BoxGeometry(18, 0.35, 4), wood, [35, -0.175, 0]);
      for (let x = 26.5; x < 44; x += 0.6) {
        owned(terrain, new THREE.BoxGeometry(0.51, 0.08, 4), sand, [x, -0.04, 0]);
      }
    }
    if (game.night === 3) {
      owned(terrain, cylinder(8, 6), grass, [0, 3, 0]);
      const band = new THREE.Shape();
      band.absarc(0, 0, 24, 0, Math.PI, false);
      band.lineTo(-12, 0);
      band.absarc(0, 0, 12, Math.PI, 0, true);
      band.closePath();
      const terrace = owned(terrain, new THREE.ExtrudeGeometry(band, { depth: 3, bevelEnabled: false, curveSegments: 28 }), grass, [0, 3, 0]);
      terrace.rotation.x = Math.PI / 2;
      for (const degrees of rampAngles) {
        const a = THREE.MathUtils.degToRad(degrees);
        const ramp = owned(terrain, new THREE.BoxGeometry(Math.sqrt(45), 0.24, 3), sand,
          [27 * Math.cos(a), 1.4, 27 * Math.sin(a)]);
        ramp.rotation.order = 'YZX';
        ramp.rotation.y = -a;
        ramp.rotation.z = -Math.atan2(3, 6);
      }
      owned(terrain, cylinder(2, 8), wood, [0, 10, 0]);
    }
    for (const pad of game.map.pads) {
      owned(terrain, cylinder(1, 0.12), gold, [pad.pos[0], pad.pos[1] + 0.03, pad.pos[2]]);
    }
    lanterns = game.lanterns.map((l) => {
      const group = new THREE.Group();
      group.position.fromArray(l.pos);
      layers.add(group);
      owned(group, new THREE.CylinderGeometry(0.14, 0.24, 1.4, 8), wood, [0, 0.7, 0]);
      const bulb = owned(group, sphere(0.43), dark, [0, 1.55, 0]);
      const center = owned(group, sphere(0.23), core, [0, 1.58, -0.31]);
      const light = new THREE.PointLight(color.lantern, 0, 10);
      light.position.y = 1.65;
      group.add(light);
      const tears = new THREE.Group();
      group.add(tears);
      for (const side of [-1, 1]) {
        const tear = owned(tears, new THREE.BoxGeometry(0.07, 0.28, 0.026), shade,
          [side * 0.12, 1.56, side * 0.36]);
        tear.rotation.z = side * 0.6;
      }
      const gauge = new THREE.Group();
      gauge.position.y = 2.24;
      group.add(gauge);
      owned(gauge, new THREE.PlaneGeometry(1.1, 0.15), shade, [0, 0, 0]);
      const fill = owned(gauge, new THREE.PlaneGeometry(1, 0.09), gold, [0, 0, 0.01]);
      return { bulb, center, light, tears, gauge, fill };
    });
    leaves = Array.from({ length: 16 }, () => place(layers, windLeaf, gold, [0, 0, 0]));
  }

  function dynamic(game, now) {
    const active = new Set();
    const add = (item, kind, make) => {
      const key = kind + ':' + item.id;
      active.add(key);
      if (!entities.has(key)) entities.set(key, make());
      const mesh = entities.get(key);
      mesh.position.fromArray(item.pos);
      return mesh;
    };
    for (const item of game.motes) {
      const mesh = add(item, 'mote', () => {
        const group = new THREE.Group();
        const halo = place(group, orb, glow, [0, 0, 0]);
        halo.scale.setScalar(1.45);
        place(group, orb, mote, [0, 0, -0.12]);
        layers.add(group);
        return group;
      });
      mesh.position.y += 0.35 + 0.085 * Math.sin(now / 220 + item.pos[0]);
    }
    for (const item of game.shades) {
      const mesh = add(item, 'shade', () => {
        const core = place(layers, shadeShape, shade, [0, 0, 0]);
        const edge = place(core, shadeShape, rim, [0, 0.49, 0]);
        edge.scale.set(0.87, 0.4, 0.87);
        for (const side of [-1, 1]) {
          const eye = place(core, orb, rim, [side * 0.22, 0.11, -0.59]);
          eye.scale.setScalar(0.65);
        }
        return core;
      });
      mesh.material = item.state === 'stunned' ? stun : shade;
    }
    for (const item of game.drifters) {
      const mesh = add(item, 'drifter', () => place(layers, orb, drifter, [0, 0, 0]));
      mesh.scale.set(6, 1.25, 2.8);
      mesh.rotation.z = 0.25 * Math.sin(now / 140);
    }
    for (const item of game.charms.filter((c) => c.available)) {
      const mesh = add(item, 'charm', () => {
        const border = place(layers, orb, gold, [0, 0, 0]);
        const face = place(border, orb, red, [0, 0, 0.11]);
        face.scale.setScalar(0.77);
        border.scale.set(1.5, 2.45, 0.8);
        return border;
      });
      mesh.position.y += 0.65;
      mesh.rotation.y = now / 650;
    }
    for (const [key, mesh] of entities) {
      if (active.has(key)) continue;
      layers.remove(mesh);
      entities.delete(key);
    }
  }

  function render(game, yaw, now, pulseAge, orbit = null, reduceMotion = false) {
    character.position.fromArray(game.player.pos);
    character.rotation.y = Math.atan2(...game.player.face);
    character.visible = game.player.respawn === null &&
      (game.player.invuln <= game.sim_tick || game.sim_tick % 12 < 8);
    pulseRing.visible = pulseAge < 24;
    pulseRing.position.copy(character.position);
    pulseRing.position.y += 0.8;
    pulseRing.scale.setScalar(Math.min(1, (pulseAge + 3) / 16));
    pulseMaterial.opacity = Math.max(0, 1 - pulseAge / 24);
    ambient.intensity = 0.15 + 0.55 * game.lanterns.filter((l) => l.lit).length / game.lanterns.length;
    game.lanterns.forEach((l, i) => {
      const { bulb, center, light, tears, gauge, fill } = lanterns[i];
      const flash = !reduceMotion && l.lit && l.fuelUnits < LOW_FUEL && game.sim_tick % HZ >= HZ / 2;
      bulb.material = l.lit && !flash ? lit : dark;
      bulb.scale.setScalar(l.lit ? 1 : 0.8);
      center.visible = l.lit && !flash;
      tears.visible = !l.lit;
      light.intensity = l.lit ? (flash ? 5 : 35) : 0;
      gauge.visible = l.lit && !flash;
      const ratio = l.fuelUnits / MAX_FUEL;
      fill.scale.x = ratio;
      fill.position.x = (ratio - 1) / 2;
    });
    dynamic(game, now);
    leaves.forEach((leaf, index) => {
      leaf.visible = game.wind.warning || game.wind.active;
      const a = THREE.MathUtils.degToRad(game.wind.dir_deg);
      const forward = (now / 220 + index * 1.39) % 22 - 11;
      const cross = Math.sin(index * 42) * 9;
      leaf.position.set(character.position.x + forward * Math.cos(a) - cross * Math.sin(a),
        character.position.y + 1 + (index % 6) * 0.5,
        character.position.z + forward * Math.sin(a) + cross * Math.cos(a));
      leaf.rotation.z = now / 130 + index;
    });
    const angle = THREE.MathUtils.degToRad(yaw);
    camera.position.copy(character.position).add(new THREE.Vector3(-Math.sin(angle) * 7, 4.8, -Math.cos(angle) * 7));
    const cameraFloor = ground(game.night, camera.position.toArray());
    if (cameraFloor !== null) camera.position.y = Math.max(camera.position.y, cameraFloor + 1);
    camera.lookAt(character.position.x + Math.sin(angle) * 2, character.position.y + 0.75,
      character.position.z + Math.cos(angle) * 2);
    if (orbit !== null) {
      camera.position.set(30 * Math.cos(orbit), 15, 30 * Math.sin(orbit));
      camera.lookAt(0, 0, 0);
    }
    for (const { gauge } of lanterns) gauge.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
  }
  function offscreen(pos, always = false) {
    project.fromArray(pos);
    project.y += 1.5;
    const cameraSpace = project.clone().applyMatrix4(camera.matrixWorldInverse);
    project.project(camera);
    if (!always && cameraSpace.z < 0 && Math.abs(project.x) <= 0.9 && Math.abs(project.y) <= 0.83) return null;
    return Math.atan2(cameraSpace.x, cameraSpace.z < 0 ? cameraSpace.y : -Math.abs(cameraSpace.y) - 1);
  }
  const setAccessiblePalette = (enabled) => rim.color.setHex(enabled ? 0x00b3ff : color.rim);
  return { canvas: renderer.domElement, renderer: 'Three.js r' + THREE.REVISION + ' / WebGL 2',
    onFrame: (callback) => renderer.setAnimationLoop(callback),
    reset, render, offscreen, setAccessiblePalette };
}
