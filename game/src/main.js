// Dusk Murmuration — entry point: the loop, the state machine
// (title → playing → paused → won / lost) and the wiring between input,
// world, audio and render. ?shot=start|play|dawn|end&seed=N renders one
// deterministic frame instead of starting the loop (for screenshots).
import { H, W } from './config.js';
import { AudioEngine } from './audio.js';
import { clearPressed, createInput, isDown, moveDirection, wasPressed } from './input.js';
import { MUTE_BUTTON, draw } from './render.js';
import { buildShot } from './shots.js';
import { createWorld, updateAmbient, updateWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const audio = new AudioEngine();

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function freshSeed() {
  return (Date.now() % 2147483647) | 1;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// --- Deterministic screenshot mode ---------------------------------------
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  const seed = Number(params.get('seed') || '1') || 1;
  const shotState = buildShot(shotName, seed);
  draw(ctx, shotState);
  window.__DUSK_DEBUG__ = { state: shotState, shot: shotName };
} else {
  startGame();
}

function startGame() {
  const input = createInput(canvas);
  let state = createWorld(freshSeed());
  let lastPhase = state.phase;
  setStatus('Dusk Murmuration: press Enter or click to start.');

  function restart() {
    state = createWorld(freshSeed());
    state.phase = 'playing';
    setStatus('Playing: gather light motes, dodge the storm clouds.');
  }

  function toggleMute() {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
  }

  function inMuteButton() {
    return (
      input.pointerX >= MUTE_BUTTON.x &&
      input.pointerX <= MUTE_BUTTON.x + MUTE_BUTTON.w &&
      input.pointerY >= MUTE_BUTTON.y &&
      input.pointerY <= MUTE_BUTTON.y + MUTE_BUTTON.h
    );
  }

  canvas.addEventListener('pointerdown', () => {
    audio.ensure();
    if (state.phase === 'playing' && inMuteButton()) {
      toggleMute();
      return;
    }
    if (state.phase === 'title') {
      state.phase = 'playing';
      setStatus('Playing: gather light motes, dodge the storm clouds.');
    } else if (state.phase === 'paused') {
      state.phase = 'playing';
    } else if (state.phase === 'won' || state.phase === 'lost') {
      restart();
    }
  });
  window.addEventListener('keydown', () => audio.ensure());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'playing') state.phase = 'paused';
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if (wasPressed(input, 'KeyM')) toggleMute();
    if (wasPressed(input, 'KeyR') && state.phase !== 'title') restart();

    if (state.phase === 'title') {
      updateAmbient(state, dt);
      if (wasPressed(input, 'Enter') || wasPressed(input, 'Space')) {
        state.phase = 'playing';
        setStatus('Playing: gather light motes, dodge the storm clouds.');
      }
    } else if (state.phase === 'playing') {
      const dir = moveDirection(input);
      const steer = dir
        ? { dir }
        : input.pointerSeen
          ? { target: { x: input.pointerX, y: input.pointerY } }
          : null;
      updateWorld(state, steer, dt, audio);
      if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape')) {
        state.phase = 'paused';
        setStatus('Paused.');
      }
    } else if (state.phase === 'paused') {
      if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape') || wasPressed(input, 'Enter')) {
        state.phase = 'playing';
      }
    } else if (state.phase === 'won' || state.phase === 'lost') {
      if (wasPressed(input, 'Enter') || wasPressed(input, 'Space')) restart();
    }

    if (state.phase !== lastPhase) {
      if (state.phase === 'won') setStatus(`Dawn breaks! Final score ${state.score}.`);
      if (state.phase === 'lost') setStatus(`The flock is lost. Score ${state.score}. Press R to play again.`);
      lastPhase = state.phase;
    }

    draw(ctx, state);
    clearPressed(input);
    requestAnimationFrame(frame);
  }
  window.__DUSK_DEBUG__ = { get state() { return state; } };
  requestAnimationFrame(frame);
}
