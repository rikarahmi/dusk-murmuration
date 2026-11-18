// The world: night progress, light motes, storm clouds, wind gusts,
// spawning, collisions and scoring. Pure simulation — no drawing here — so
// the deterministic screenshots can run it forward headlessly.
import {
  CLOUD_HIT_LOSS,
  CLOUD_SPAWN_EVERY,
  CLOUD_SPAWN_LATE,
  CLOUD_SPEED,
  CLOUD_SPEED_LATE,
  COMBO_MAX,
  COMBO_WINDOW,
  H,
  INVULN_SECONDS,
  MAX_BIRDS,
  MOTE_CLUSTER,
  MOTE_LIFE,
  MOTE_SCORE,
  MOTE_SPAWN_EVERY,
  NIGHT_SECONDS,
  W,
  WIND_EVERY_MAX,
  WIND_EVERY_MIN,
  WIND_FORCE,
  WIND_FORCE_LATE,
  WIND_GUST,
  WIND_WARN,
} from './config.js';
import { mulberry32, range, chance } from './random.js';
import { addBird, birdCount, createFlock, removeBirds, updateFlock, updateLeader } from './flock.js';

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: rng() * W,
      y: rng() * (H - 200),
      r: range(rng, 0.6, 1.9),
      twinkle: range(rng, 0.4, 1.6),
      phase: range(rng, 0, Math.PI * 2),
    });
  }
  const state = {
    seed,
    rng,
    phase: 'title', // title | playing | paused | won | lost
    time: 0,
    nightT: 0, // 0 dusk → 1 dawn
    score: 0,
    combo: 1,
    comboTimer: 0,
    bestCombo: 1,
    motesCollected: 0,
    birdsLost: 0,
    flock: createFlock(rng),
    motes: [],
    clouds: [],
    particles: [],
    stars,
    moteTimer: 0.4,
    cloudTimer: 2.5,
    wind: { state: 'idle', timer: range(rng, WIND_EVERY_MIN, WIND_EVERY_MAX), dir: 1, strength: 0 },
    invuln: 0,
    shake: 0,
    flash: 0, // lightning flash inside a cloud, 0..1
    flashTimer: range(rng, 1, 3),
    muted: false,
  };
  spawnMoteCluster(state, W / 2 + 160, H / 2 - 60);
  spawnMoteCluster(state, W / 2 - 220, H / 2 + 40);
  return state;
}

// A cluster of motes: sometimes out in the open, sometimes hugging a storm
// cloud — the risk-versus-reward choice that grows as the night deepens.
function spawnMoteCluster(state, cx, cy) {
  const rng = state.rng;
  const nearCloud = state.clouds.length > 0 && chance(rng, 0.25 + state.nightT * 0.45);
  let baseX = cx;
  let baseY = cy;
  if (nearCloud) {
    const cloud = state.clouds[Math.floor(rng() * state.clouds.length)];
    baseX = cloud.x + range(rng, -cloud.r - 40, cloud.r + 40);
    baseY = cloud.y + range(rng, -70, 70);
  } else {
    baseX = range(rng, 120, W - 120);
    baseY = range(rng, 90, H - 220);
  }
  for (let i = 0; i < MOTE_CLUSTER; i += 1) {
    state.motes.push({
      x: baseX + range(rng, -70, 70),
      y: baseY + range(rng, -46, 46),
      r: range(rng, 7, 10),
      life: MOTE_LIFE,
      phase: range(rng, 0, Math.PI * 2),
      vx: range(rng, -8, 8),
      vy: range(rng, -4, 10),
    });
  }
}

function spawnCloud(state) {
  const rng = state.rng;
  const late = state.nightT;
  const fromLeft = chance(rng, 0.5);
  state.clouds.push({
    x: fromLeft ? -90 : W + 90,
    y: range(rng, 70, H - 260),
    r: range(rng, 52, 92),
    vx: (fromLeft ? 1 : -1) * range(rng, CLOUD_SPEED, CLOUD_SPEED + 26) * (1 + late * 0.6),
    bobPhase: range(rng, 0, Math.PI * 2),
    seed: range(rng, 0, 100),
  });
}

// One fixed step of the night. `steer` is {target} or {dir} or null;
// `audio` may be null (headless screenshot runs make no sound).
export function updateWorld(state, steer, dt, audio) {
  const flock = state.flock;
  state.time += dt;
  state.nightT = Math.min(1, state.time / NIGHT_SECONDS);
  if (state.invuln > 0) state.invuln -= dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 3);

  // Wind cycle: idle → warning → gust → idle.
  const wind = state.wind;
  wind.timer -= dt;
  if (wind.state === 'idle' && wind.timer <= 0) {
    wind.state = 'warn';
    wind.timer = WIND_WARN;
    wind.dir = chance(state.rng, 0.5) ? 1 : -1;
    wind.strength = WIND_FORCE + (WIND_FORCE_LATE - WIND_FORCE) * state.nightT;
    if (audio) audio.whoosh();
  } else if (wind.state === 'warn' && wind.timer <= 0) {
    wind.state = 'gust';
    wind.timer = WIND_GUST;
  } else if (wind.state === 'gust' && wind.timer <= 0) {
    wind.state = 'idle';
    wind.timer = range(state.rng, WIND_EVERY_MIN, WIND_EVERY_MAX);
  }
  const windPush = wind.state === 'gust' ? wind.dir * wind.strength : 0;

  const target = steer && steer.target ? steer.target : null;
  const dir = steer && steer.dir ? steer.dir : null;
  updateLeader(flock, target, dir, windPush, dt);
  updateFlock(flock, state.time, windPush, dt);

  // Motes drift, fade, and get collected by the lead bird alone: steering
  // is the skill, and the ribbon never vacuums the sky by itself.
  state.moteTimer -= dt;
  if (state.moteTimer <= 0) {
    state.moteTimer = MOTE_SPAWN_EVERY;
    spawnMoteCluster(state);
  }
  const leader = flock.leader;
  for (let i = state.motes.length - 1; i >= 0; i -= 1) {
    const m = state.motes[i];
    m.life -= dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.life <= 0) {
      state.motes.splice(i, 1);
      continue;
    }
    if (Math.hypot(m.x - leader.x, m.y - leader.y) < m.r + 16) {
      collectMote(state, m, audio);
      state.motes.splice(i, 1);
    }
  }

  // Combo fades if the player goes quiet for a while.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 1;
  }

  // Storm clouds drift across and strike when the leader flies into one.
  state.cloudTimer -= dt;
  const spawnEvery = CLOUD_SPAWN_EVERY + (CLOUD_SPAWN_LATE - CLOUD_SPAWN_EVERY) * state.nightT;
  if (state.cloudTimer <= 0) {
    state.cloudTimer = spawnEvery * range(state.rng, 0.8, 1.25);
    spawnCloud(state);
  }
  state.flashTimer -= dt;
  if (state.flashTimer <= 0) {
    state.flashTimer = range(state.rng, 0.8, 3.2);
    state.flash = 1;
  }
  for (let i = state.clouds.length - 1; i >= 0; i -= 1) {
    const c = state.clouds[i];
    c.x += c.vx * dt;
    c.y += Math.sin(state.time * 0.7 + c.bobPhase) * 6 * dt;
    if (c.x < -160 || c.x > W + 160) {
      state.clouds.splice(i, 1);
      continue;
    }
    if (state.invuln <= 0 && Math.hypot(c.x - leader.x, c.y - leader.y) < c.r + 8) {
      hitStorm(state, audio);
    }
  }

  // Trail sparkles behind the leader and bursts fade out.
  if (state.time % 0.06 < dt) {
    state.particles.push({
      x: leader.x + range(state.rng, -6, 6),
      y: leader.y + range(state.rng, -6, 6),
      vx: range(state.rng, -12, 12),
      vy: range(state.rng, -12, 12),
      life: 0.5,
      maxLife: 0.5,
      size: range(state.rng, 1.5, 3),
      kind: 'trail',
    });
  }
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Dawn arrives: the night is survived.
  if (state.nightT >= 1) {
    state.phase = 'won';
    if (audio) audio.dawnChord();
  }
  if (birdCount(flock) <= 0) {
    state.phase = 'lost';
  }
}

function collectMote(state, mote, audio) {
  state.score += MOTE_SCORE * state.combo;
  state.motesCollected += 1;
  state.combo = Math.min(COMBO_MAX, state.combo + 1);
  state.comboTimer = COMBO_WINDOW;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  if (state.flock.birds.length < MAX_BIRDS) addBird(state.flock, state.rng);
  for (let i = 0; i < 10; i += 1) {
    state.particles.push({
      x: mote.x,
      y: mote.y,
      vx: range(state.rng, -70, 70),
      vy: range(state.rng, -70, 70),
      life: 0.55,
      maxLife: 0.55,
      size: range(state.rng, 2, 4),
      kind: 'burst',
    });
  }
  if (audio) audio.chime(state.combo);
}

function hitStorm(state, audio) {
  const lost = removeBirds(state.flock, CLOUD_HIT_LOSS);
  state.birdsLost += lost;
  state.combo = 1;
  state.comboTimer = 0;
  state.invuln = INVULN_SECONDS;
  state.shake = 1;
  const l = state.flock.leader;
  for (let i = 0; i < 14; i += 1) {
    state.particles.push({
      x: l.x,
      y: l.y,
      vx: range(state.rng, -120, 120),
      vy: range(state.rng, -120, 120),
      life: 0.7,
      maxLife: 0.7,
      size: range(state.rng, 2, 5),
      kind: 'feather',
    });
  }
  if (audio) audio.thud();
  if (birdCount(state.flock) <= 0) state.phase = 'lost';
}

// Ambient drift for the title screen: the leader wanders a slow figure of
// eight while motes and clouds stay out of the way.
export function updateAmbient(state, dt) {
  state.time += dt;
  const target = {
    x: W / 2 + Math.sin(state.time * 0.24) * 320,
    y: H / 2 - 60 + Math.sin(state.time * 0.41) * 120,
  };
  updateLeader(state.flock, target, null, 0, dt);
  updateFlock(state.flock, state.time, 0, dt);
}
