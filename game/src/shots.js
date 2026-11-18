// Deterministic screenshot scenes behind ?shot=start|play|dawn|end.
// Each one plays the real rules forward from a fresh world for a fixed
// number of fixed steps, steered by a simple autopilot, so the frame is
// what a short game really looks like and the same seed always gives the
// same frame. No clock, no pointer, no sound: nothing here can vary.
import { H, W } from './config.js';
import { createWorld, updateAmbient, updateWorld } from './world.js';

const STEP = 1 / 60;
const START_SECONDS = 4;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;

// The autopilot chases the nearest light mote. With `avoid` it also keeps
// clear of storm clouds; without it, it flies straight at the nearest
// cloud — the end scene's hurried player.
function autopilotTarget(state, avoid) {
  const leader = state.flock.leader;
  let mote = null;
  let bestD = Infinity;
  for (const m of state.motes) {
    // Prefer motes with a clear approach when avoiding storms.
    if (avoid) {
      let safe = true;
      for (const c of state.clouds) {
        if (Math.hypot(m.x - c.x, m.y - c.y) < c.r + 50) {
          safe = false;
          break;
        }
      }
      if (!safe) continue;
    }
    const d = Math.hypot(m.x - leader.x, m.y - leader.y);
    if (d < bestD) {
      bestD = d;
      mote = m;
    }
  }
  let tx = mote ? mote.x : W / 2;
  let ty = mote ? mote.y : H / 2 - 60;
  if (avoid) {
    for (const c of state.clouds) {
      const dx = leader.x - c.x;
      const dy = leader.y - c.y;
      const d = Math.hypot(dx, dy);
      const keep = c.r + 170;
      if (d < keep && d > 1) {
        const push = ((keep - d) / keep) * 340;
        tx += (dx / d) * push;
        ty += (dy / d) * push;
      }
    }
  } else {
    let cloud = null;
    let cd = Infinity;
    for (const c of state.clouds) {
      const d = Math.hypot(c.x - leader.x, c.y - leader.y);
      if (d < cd) {
        cd = d;
        cloud = c;
      }
    }
    if (cloud) {
      tx = cloud.x;
      ty = cloud.y;
    }
  }
  return {
    x: Math.max(30, Math.min(W - 30, tx)),
    y: Math.max(30, Math.min(H - 100, ty)),
  };
}

function runPlaying(state, seconds, avoid) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.phase === 'won' || state.phase === 'lost') break;
    updateWorld(state, { target: autopilotTarget(state, avoid) }, STEP, null);
  }
  return state;
}

// Build one named scene. Throws on an unknown name so a bad query fails
// loudly instead of screenshotting the wrong frame.
export function buildShot(name, seed) {
  const state = createWorld(seed);
  if (name === 'start') {
    state.phase = 'title';
    for (let i = 0; i < Math.round(START_SECONDS / STEP); i += 1) {
      updateAmbient(state, STEP);
    }
    return state;
  }
  if (name === 'play') {
    state.phase = 'playing';
    return runPlaying(state, PLAY_SECONDS, true);
  }
  if (name === 'dawn') {
    state.phase = 'playing';
    runPlaying(state, 95, true);
    if (state.phase !== 'won') state.phase = 'won';
    return state;
  }
  if (name === 'end') {
    state.phase = 'playing';
    runPlaying(state, END_LIMIT_SECONDS, false);
    if (state.phase !== 'lost') state.phase = 'lost';
    return state;
  }
  throw new Error(`unknown shot: ${name}`);
}
