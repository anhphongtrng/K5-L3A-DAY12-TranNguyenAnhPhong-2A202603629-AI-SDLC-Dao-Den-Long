export const bindings = {
  up: ['Tiến', 'KeyW', 'ArrowUp'], down: ['Lùi', 'KeyS', 'ArrowDown'],
  left: ['Trái', 'KeyA', 'ArrowLeft'], right: ['Phải', 'KeyD', 'ArrowRight'],
  jump: ['Nhảy', 'Space'], dash: ['Lướt', 'ShiftLeft', 'ShiftRight'],
  interact: ['Tương tác', 'KeyE'], pulse: ['Tỏa sáng', 'KeyR'], pause: ['Tạm dừng', 'KeyP', 'Escape'],
};
const defaults = () => Object.fromEntries(Object.entries(bindings).map(([action, [, key]]) => [action, key]));
const label = (key) => key.replace(/^Key|^Digit|^Arrow/u, '').replace(/^(Shift|Control|Alt)(Left|Right)$/u, '$1');
export function createControls(container, feedback, footer) {
  const storage = 'lantern:controls';
  let config = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(storage));
    if (saved && Object.keys(bindings).every((key) => typeof saved[key] === 'string' && saved[key]) &&
        new Set(Object.values(saved)).size === Object.keys(bindings).length) config = saved;
  } catch { /* Use defaults for invalid saved settings. */ }
  let capturing = null;
  const buttons = {};
  const keys = (action) => {
    const [, initial, alternate] = bindings[action];
    return config[action] === initial && alternate && !Object.values(config).includes(alternate)
      ? [initial, alternate] : [config[action]];
  };
  for (const [action, [name]] of Object.entries(bindings)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => {
      capturing = action;
      feedback.textContent = 'Nhấn phím mới cho ' + name + '.';
    });
    buttons[action] = button;
    container.append(button);
  }
  function update() {
    for (const [action, button] of Object.entries(buttons)) {
      button.textContent = bindings[action][0] + ' · ' + label(config[action]);
    }
    footer.textContent = Object.keys(bindings).map((action) =>
      label(config[action]) + ' ' + bindings[action][0].toLowerCase()).join(' · ') + ' · Kéo chuột xoay camera';
  }
  function persist() {
    localStorage.setItem(storage, JSON.stringify(config));
    update();
  }
  function capture(event) {
    if (!capturing) return false;
    event.preventDefault();
    if (event.repeat) return true;
    const code = event.code;
    if (!code || ['Tab', 'MetaLeft', 'MetaRight'].includes(code)) {
      feedback.textContent = 'Phím này dành cho điều hướng. Chọn phím khác.';
    } else if (Object.keys(bindings).some((action) => action !== capturing && keys(action).includes(code))) {
      feedback.textContent = 'Phím ' + label(code) + ' đã được dùng. Chọn phím khác.';
    } else {
      config[capturing] = code;
      capturing = null;
      feedback.textContent = 'Đã lưu phím.';
      persist();
    }
    return true;
  }
  update();
  return {
    keys, capture, labelFor: (action) => label(config[action]),
    cancel() { capturing = null; feedback.textContent = ''; },
    reset() { capturing = null; config = defaults(); feedback.textContent = 'Đã khôi phục phím mặc định.'; persist(); },
  };
}
