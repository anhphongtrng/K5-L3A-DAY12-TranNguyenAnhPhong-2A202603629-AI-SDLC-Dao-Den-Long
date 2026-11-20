const radians = (degrees) => degrees * Math.PI / 180;
export const ring = (radius, count, offset = 0, x = 0, y = 0, spacing = 360 / count) =>
  Array.from({ length: count }, (_, i) => {
    const angle = radians(offset + i * spacing);
    return [x + radius * Math.cos(angle), y, radius * Math.sin(angle)];
  });

export const maps = {
  1: {
    name: 'Đảo Bến', islands: [[0, 40]],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motes: [...ring(12, 8), ...ring(33, 16)], shades: ring(37, 12, 15),
    shadeInterval: 480, shadeCap: 6, pads: [], charms: [],
  },
  2: {
    name: 'Đảo Cau', islands: [[0, 28], [70, 28]],
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motes: [0, 70].flatMap((x) => [...ring(10, 4, 0, x), ...ring(22, 8, 0, x)]),
    shades: [0, 70].flatMap((x) => ring(26, 8, 22.5, x)), shadeInterval: 420, shadeCap: 8,
    pads: [
      { pos: [20, 0, 18], target: [70, 0, 0], speed: 24, up: 14 },
      { pos: [50, 0, -18], target: [0, 0, 0], speed: 24, up: 14 },
    ],
    charms: [[35, 0, 0]],
  },
  3: {
    name: 'Đảo Chuông', islands: [[0, 45]], start: [0, 0, -12],
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motes: [...ring(34, 18), ...ring(18, 8, 20, 0, 3, 20), ...ring(5, 4, 45, 0, 6)],
    shades: ring(43, 16), shadeInterval: 360, shadeCap: 10,
    pads: [{ pos: [0, 3, 13], target: [0, 0, 0], speed: 8, up: 12 }],
    charms: [[30, 0, 25], [-30, 0, 25]],
  },
};

export const horizontal = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const rampAngles = [30, 150];
export const rampHeight = (x, z) => {
  for (const degrees of rampAngles) {
    const angle = radians(degrees);
    const along = x * Math.cos(angle) + z * Math.sin(angle);
    const across = z * Math.cos(angle) - x * Math.sin(angle);
    if (along >= 24 && along <= 30 && Math.abs(across) <= 1.5) return (30 - along) / 2;
  }
  return null;
};

export function ground(night, [x, , z]) {
  const radius = Math.hypot(x, z);
  if (night === 1) return radius <= 40 ? 0 : null;
  if (night === 2) {
    return radius <= 28 || Math.hypot(x - 70, z) <= 28 ||
      (x >= 26 && x <= 44 && Math.abs(z) <= 2) ? 0 : null;
  }
  if (radius <= 8) return 6;
  const ramp = rampHeight(x, z);
  if (ramp !== null) return ramp;
  if (radius >= 12 && radius <= 24 && z > 0) return 3;
  return radius <= 45 ? 0 : null;
}
