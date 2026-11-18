// The murmuration: a lead bird the player steers, and a ribbon of birds
// that follows it on springs, so the flock flows and bends instead of
// snapping to a line. Each bird chases a point trailing the bird ahead.
import {
  FOLLOW_DAMPING,
  FOLLOW_STIFFNESS,
  LEADER_ACCEL,
  LEADER_SPEED,
  MAX_BIRDS,
  START_BIRDS,
  TRAIL_SPACING,
  W,
  H,
} from './config.js';
import { range } from './random.js';

export function createFlock(rng) {
  const leader = { x: W / 2, y: H / 2 - 60, vx: 0, vy: 0 };
  const birds = [];
  for (let i = 0; i < START_BIRDS; i += 1) {
    birds.push(makeBird(rng, leader.x - (i + 1) * TRAIL_SPACING, leader.y + range(rng, -14, 14), i));
  }
  return { leader, birds };
}

function makeBird(rng, x, y, index) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    phase: range(rng, 0, Math.PI * 2), // wing-flap phase
    flap: range(rng, 9, 12), // flaps per second
    size: range(rng, 9, 13),
    slot: index, // position in the ribbon, for the wobble offset
  };
}

// The leader accelerates toward `target` (pointer or autopilot point), or
// along `dir` when the keyboard steers. Wind adds a sideways push.
export function updateLeader(flock, target, dir, windPush, dt) {
  const l = flock.leader;
  if (dir) {
    l.vx += dir.x * LEADER_ACCEL * dt;
    l.vy += dir.y * LEADER_ACCEL * dt;
  } else if (target) {
    const dx = target.x - l.x;
    const dy = target.y - l.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const pull = Math.min(1, dist / 140);
      l.vx += (dx / dist) * LEADER_ACCEL * pull * dt;
      l.vy += (dy / dist) * LEADER_ACCEL * pull * dt;
    }
  }
  l.vx += windPush * dt;
  // Drag keeps the top speed in check and stops drift when idle.
  const drag = Math.exp(-3.2 * dt);
  l.vx *= drag;
  l.vy *= drag;
  const speed = Math.hypot(l.vx, l.vy);
  if (speed > LEADER_SPEED) {
    l.vx = (l.vx / speed) * LEADER_SPEED;
    l.vy = (l.vy / speed) * LEADER_SPEED;
  }
  l.x += l.vx * dt;
  l.y += l.vy * dt;
  l.x = Math.max(24, Math.min(W - 24, l.x));
  l.y = Math.max(24, Math.min(H - 90, l.y));
}

// Every bird springs toward a point trailing the bird ahead of it, with a
// slow sideways wobble so the ribbon breathes as it turns.
export function updateFlock(flock, time, windPush, dt) {
  const birds = flock.birds;
  let anchor = flock.leader;
  for (let i = 0; i < birds.length; i += 1) {
    const b = birds[i];
    const aheadSpeed = Math.hypot(anchor.vx, anchor.vy) || 1;
    const nx = anchor.vx / aheadSpeed;
    const ny = anchor.vy / aheadSpeed;
    // The wobble is shared along the ribbon (small phase step per bird), so
    // the whole flock snakes together instead of zigzagging apart.
    const wobble = Math.sin(time * 1.6 + b.slot * 0.35) * 8;
    const tx = anchor.x - nx * TRAIL_SPACING + -ny * wobble;
    const ty = anchor.y - ny * TRAIL_SPACING + nx * wobble;
    b.vx += (tx - b.x) * FOLLOW_STIFFNESS * dt;
    b.vy += (ty - b.y) * FOLLOW_STIFFNESS * dt;
    b.vx += windPush * dt * 0.9;
    const damp = Math.exp(-FOLLOW_DAMPING * dt);
    b.vx *= damp;
    b.vy *= damp;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.phase += b.flap * Math.PI * 2 * dt;
    anchor = b;
  }
}

export function addBird(flock, rng) {
  if (flock.birds.length >= MAX_BIRDS) return false;
  const tail = flock.birds[flock.birds.length - 1] || flock.leader;
  flock.birds.push(makeBird(rng, tail.x, tail.y + 8, flock.birds.length));
  return true;
}

export function removeBirds(flock, count) {
  const lost = Math.min(count, flock.birds.length);
  flock.birds.length -= lost;
  return lost;
}

export function birdCount(flock) {
  return flock.birds.length;
}
