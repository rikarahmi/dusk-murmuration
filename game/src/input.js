// Pointer + keyboard input, converted into the game's own logical canvas
// coordinates. The canvas is a fixed 1280x720 world scaled by CSS, so every
// pointer event is mapped back through the element's on-screen box.
import { W, H } from './config.js';

export function createInput(canvas) {
  const input = {
    pointerX: W / 2,
    pointerY: H / 2 - 80,
    pointerDown: false,
    pointerSeen: false,
    keys: new Set(),
    pressed: new Set(),
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    input.pointerX = p.x;
    input.pointerY = p.y;
    input.pointerSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toLogical(event);
    input.pointerX = p.x;
    input.pointerY = p.y;
    input.pointerDown = true;
    input.pointerSeen = true;
  });
  window.addEventListener('pointerup', () => {
    input.pointerDown = false;
  });
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.pointerDown = false;
  });
  return input;
}

// True while the key is held down.
export function isDown(input, code) {
  return input.keys.has(code);
}

// True once for the frame the key went down; main.js clears it each frame.
export function wasPressed(input, code) {
  return input.pressed.has(code);
}

export function clearPressed(input) {
  input.pressed.clear();
}

// Arrow keys / WASD as a unit direction vector, or null when none is held.
export function moveDirection(input) {
  let x = 0;
  let y = 0;
  if (isDown(input, 'ArrowLeft') || isDown(input, 'KeyA')) x -= 1;
  if (isDown(input, 'ArrowRight') || isDown(input, 'KeyD')) x += 1;
  if (isDown(input, 'ArrowUp') || isDown(input, 'KeyW')) y -= 1;
  if (isDown(input, 'ArrowDown') || isDown(input, 'KeyS')) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}
