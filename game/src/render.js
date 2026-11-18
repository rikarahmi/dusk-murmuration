// Every pixel of Dusk Murmuration: dusk sky, moon, hills, storm clouds,
// glowing motes, the flapping flock, particles, the HUD and all four
// screens. Pure drawing — it never changes the state it is given.
import { H, HILL_FAR, HILL_NEAR, SKY_DAWN, SKY_DUSK, W } from './config.js';
import { birdCount } from './flock.js';

export const MUTE_BUTTON = { x: W - 66, y: 14, w: 52, h: 34 };
const TITLE_FONT = "Georgia, 'Times New Roman', serif";
const UI_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(lerp(ca[2], cb[2], t))})`;
}

function skyStops(nightT) {
  return SKY_DUSK.map((c, i) => mixHex(c, SKY_DAWN[i], nightT));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky(ctx, state) {
  const stops = skyStops(state.nightT);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.45, stops[1]);
  g.addColorStop(0.75, stops[2]);
  g.addColorStop(1, stops[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Amber glow hugging the horizon at dusk, rising sun glow at dawn.
  const glow = ctx.createRadialGradient(W * 0.5, H - 40, 20, W * 0.5, H - 40, 520);
  const glowColor = state.nightT < 0.5 ? 'rgba(255,150,70,0.30)' : 'rgba(255,214,130,0.42)';
  glow.addColorStop(0, glowColor);
  glow.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawStars(ctx, state) {
  for (const s of state.stars) {
    const alpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(state.time * s.twinkle + s.phase));
    const fade = 1 - state.nightT * 0.55; // stars thin out toward dawn
    ctx.globalAlpha = Math.max(0, alpha * fade);
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMoonAndSun(ctx, state) {
  const t = state.nightT;
  // The moon sinks a little as the night wears on.
  const mx = W - 190;
  const my = 108 + t * 60;
  const halo = ctx.createRadialGradient(mx, my, 8, mx, my, 110);
  halo.addColorStop(0, 'rgba(255,244,200,0.35)');
  halo.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mx, my, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7ecd0';
  ctx.beginPath();
  ctx.arc(mx, my, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(210,190,150,0.5)';
  ctx.beginPath();
  ctx.arc(mx - 10, my - 6, 7, 0, Math.PI * 2);
  ctx.arc(mx + 12, my + 10, 5, 0, Math.PI * 2);
  ctx.fill();
  // The sun climbs over the horizon in the last stretch of the night.
  if (t > 0.82) {
    const rise = (t - 0.82) / 0.18;
    const sx = 210;
    const sy = H - 130 - rise * 130;
    const sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, 130);
    sg.addColorStop(0, 'rgba(255,220,140,0.75)');
    sg.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sx, sy, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ridge(ctx, baseY, amp, freq, phase, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) {
    const y = baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase * 1.7) * amp * 0.4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function drawHills(ctx, state) {
  ridge(ctx, H - 118, 26, 0.004, state.time * 0.02, HILL_FAR);
  ridge(ctx, H - 62, 30, 0.003, 2.1 + state.time * 0.012, HILL_NEAR);
  // A few pine silhouettes on the near ridge.
  ctx.fillStyle = HILL_NEAR;
  const trees = [120, 260, 470, 830, 1010, 1180];
  for (const tx of trees) {
    const ty = H - 62 + Math.sin(tx * 0.003 + 2.1) * 30 + Math.sin(tx * 0.0081 + 3.57) * 12;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 52);
    ctx.lineTo(tx - 16, ty - 6);
    ctx.lineTo(tx - 7, ty - 6);
    ctx.lineTo(tx - 7, ty + 4);
    ctx.lineTo(tx + 7, ty + 4);
    ctx.lineTo(tx + 7, ty - 6);
    ctx.lineTo(tx + 16, ty - 6);
    ctx.closePath();
    ctx.fill();
  }
}

function drawClouds(ctx, state) {
  for (const c of state.clouds) {
    const bob = Math.sin(state.time * 0.7 + c.bobPhase) * 6;
    const cy = c.y + bob;
    const g = ctx.createRadialGradient(c.x, cy, 6, c.x, cy, c.r);
    g.addColorStop(0, '#4a3a63');
    g.addColorStop(0.7, '#33264a');
    g.addColorStop(1, 'rgba(38,28,58,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x - c.r * 0.45, cy + 8, c.r * 0.62, 0, Math.PI * 2);
    ctx.arc(c.x + c.r * 0.4, cy + 10, c.r * 0.66, 0, Math.PI * 2);
    ctx.arc(c.x, cy - c.r * 0.28, c.r * 0.72, 0, Math.PI * 2);
    ctx.arc(c.x - c.r * 0.1, cy + 14, c.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Lightning flickers inside the cloud when the flash is live.
    if (state.flash > 0) {
      const lx = c.x + Math.sin(c.seed * 7.3) * c.r * 0.4;
      ctx.globalAlpha = state.flash * 0.9;
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx, cy - c.r * 0.4);
      ctx.lineTo(lx - 8, cy);
      ctx.lineTo(lx + 6, cy + c.r * 0.35);
      ctx.lineTo(lx - 2, cy + c.r * 0.75);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawMotes(ctx, state) {
  for (const m of state.motes) {
    const fade = Math.min(1, m.life / 2);
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 3 + m.phase);
    const glow = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, m.r * 3.2);
    glow.addColorStop(0, `rgba(255,220,130,${0.55 * pulse * fade})`);
    glow.addColorStop(1, 'rgba(255,220,130,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Four-point star.
    ctx.fillStyle = `rgba(255,236,170,${fade})`;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - m.r * 1.5);
    ctx.quadraticCurveTo(m.x, m.y, m.x + m.r * 1.5, m.y);
    ctx.quadraticCurveTo(m.x, m.y, m.x, m.y + m.r * 1.5);
    ctx.quadraticCurveTo(m.x, m.y, m.x - m.r * 1.5, m.y);
    ctx.quadraticCurveTo(m.x, m.y, m.x, m.y - m.r * 1.5);
    ctx.fill();
  }
}

function drawBird(ctx, x, y, vx, vy, phase, size, isLeader) {
  const angle = Math.atan2(vy, vx);
  const flap = Math.sin(phase);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Number.isFinite(angle) && Math.hypot(vx, vy) > 20 ? angle : 0);
  if (isLeader) {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 2.6);
    glow.addColorStop(0, 'rgba(255,190,90,0.35)');
    glow.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wings: two sweeping arcs that flap with the phase.
  ctx.fillStyle = '#1a1230';
  const wingSpan = size * (1.5 + flap * 0.9);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-size * 0.4, -wingSpan, -size * 1.3, -wingSpan * 0.9);
  ctx.quadraticCurveTo(-size * 0.2, -size * 0.4, 0, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-size * 0.4, wingSpan * 0.8, -size * 1.2, wingSpan * 0.75);
  ctx.quadraticCurveTo(-size * 0.2, size * 0.4, 0, 0);
  ctx.fill();
  // Body: a slim teardrop with an amber rim on top.
  ctx.fillStyle = '#120c22';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 1.15, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,110,0.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 1.15, size * 0.42, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  // Beak.
  ctx.fillStyle = '#ffb85e';
  ctx.beginPath();
  ctx.moveTo(size * 1.1, -2);
  ctx.lineTo(size * 1.75, 0);
  ctx.lineTo(size * 1.1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFlock(ctx, state) {
  const flock = state.flock;
  for (const b of flock.birds) {
    drawBird(ctx, b.x, b.y, b.vx, b.vy, b.phase, b.size, false);
  }
  const l = flock.leader;
  drawBird(ctx, l.x, l.y, l.vx, l.vy, state.time * 11, 13, true);
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'feather') {
      ctx.fillStyle = `rgba(30,20,48,${a})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.45, p.life * 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.kind === 'burst' ? `rgba(255,214,120,${a})` : `rgba(255,200,140,${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWind(ctx, state) {
  const wind = state.wind;
  if (wind.state === 'warn') {
    const fromLeft = wind.dir > 0;
    const x = fromLeft ? 46 : W - 46;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(state.time * 12);
    ctx.fillStyle = '#ffd98a';
    ctx.font = `bold 26px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(fromLeft ? '→ ANGIN!' : 'ANGIN! ←', x + (fromLeft ? 60 : -60), 120);
    ctx.restore();
  }
  if (wind.state === 'gust') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,220,150,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      const y = 60 + ((i * 73 + state.time * 900 * wind.dir) % 560);
      const x0 = ((i * 211 + state.time * 700 * wind.dir) % (W + 300)) - 150;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + 90 * wind.dir, y - 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawHud(ctx, state) {
  ctx.save();
  ctx.textBaseline = 'middle';
  // Score.
  ctx.fillStyle = 'rgba(10,6,24,0.45)';
  roundRect(ctx, 16, 14, 210, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.font = `bold 24px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`Skor ${state.score}`, 30, 37);
  // Birds.
  ctx.fillStyle = 'rgba(10,6,24,0.45)';
  roundRect(ctx, 238, 14, 120, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#cfe0ff';
  ctx.font = `20px ${UI_FONT}`;
  ctx.fillText(`Burung ${birdCount(state.flock)}`, 252, 37);
  // Combo badge.
  if (state.combo > 1) {
    ctx.fillStyle = '#ffb020';
    roundRect(ctx, 370, 14, 74, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#1a1030';
    ctx.font = `bold 22px ${UI_FONT}`;
    ctx.fillText(`x${state.combo}`, 388, 37);
  }
  // Night progress: dusk → dawn.
  const barX = W / 2 - 170;
  const barY = 20;
  const barW = 340;
  ctx.fillStyle = 'rgba(10,6,24,0.55)';
  roundRect(ctx, barX - 6, barY - 6, barW + 12, 40, 12);
  ctx.fill();
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, '#3b2360');
  grad.addColorStop(0.6, '#e07a4e');
  grad.addColorStop(1, '#ffd98a');
  ctx.fillStyle = grad;
  roundRect(ctx, barX, barY, Math.max(8, barW * state.nightT), 28, 8);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.font = `16px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('☾', barX - 22, barY + 15);
  ctx.fillText('☀', barX + barW + 22, barY + 15);
  ctx.fillStyle = 'rgba(255,243,208,0.9)';
  ctx.font = `13px ${UI_FONT}`;
  ctx.fillText(state.nightT >= 1 ? 'Fajar!' : `Malam ${Math.floor(state.nightT * 100)}%`, barX + barW / 2, barY + 48);
  // Mute button.
  ctx.fillStyle = state.muted ? 'rgba(255,176,32,0.85)' : 'rgba(10,6,24,0.45)';
  roundRect(ctx, MUTE_BUTTON.x, MUTE_BUTTON.y, MUTE_BUTTON.w, MUTE_BUTTON.h, 8);
  ctx.fill();
  ctx.fillStyle = state.muted ? '#1a1030' : '#fff3d0';
  ctx.font = `20px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(state.muted ? '✕' : '♪', MUTE_BUTTON.x + MUTE_BUTTON.w / 2, MUTE_BUTTON.y + 18);
  ctx.restore();
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(8,5,20,0.55)';
  ctx.fillRect(0, 0, W, H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12,7,30,0.82)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,110,0.45)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, state) {
  dim(ctx);
  panel(ctx, W / 2 - 380, 150, 760, 420);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `bold 72px ${TITLE_FONT}`;
  ctx.fillText('DUSK', W / 2, 250);
  ctx.fillStyle = '#ffb85e';
  ctx.font = `bold 72px ${TITLE_FONT}`;
  ctx.fillText('MURMURATION', W / 2, 330);
  ctx.fillStyle = '#e8ddff';
  ctx.font = `22px ${UI_FONT}`;
  ctx.fillText('Arahkan kawanan starling melintasi langit senja menuju fajar.', W / 2, 392);
  ctx.fillStyle = '#cbb8ff';
  ctx.font = `18px ${UI_FONT}`;
  ctx.fillText('Mouse / panah / WASD — kumpulkan bintang cahaya, tambah burung.', W / 2, 428);
  ctx.fillText('Hindari awan badai: sekali sentuh, 3 burung hilang dan kombo reset.', W / 2, 456);
  ctx.fillText('P jeda · M suara · R mulai lagi', W / 2, 484);
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold 24px ${UI_FONT}`;
  const blink = 0.6 + 0.4 * Math.sin(state.time * 3);
  ctx.globalAlpha = blink;
  ctx.fillText('Klik atau tekan Enter untuk mulai', W / 2, 534);
  ctx.restore();
}

function drawPaused(ctx) {
  dim(ctx);
  panel(ctx, W / 2 - 220, H / 2 - 90, 440, 180);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `bold 44px ${TITLE_FONT}`;
  ctx.fillText('Jeda', W / 2, H / 2 - 18);
  ctx.fillStyle = '#e8ddff';
  ctx.font = `20px ${UI_FONT}`;
  ctx.fillText('Tekan P atau klik untuk lanjut', W / 2, H / 2 + 34);
  ctx.restore();
}

function drawWon(ctx, state) {
  dim(ctx);
  panel(ctx, W / 2 - 320, 130, 640, 440);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `bold 64px ${TITLE_FONT}`;
  ctx.fillText('FAJAR TIBA', W / 2, 224);
  ctx.fillStyle = '#e8ddff';
  ctx.font = `22px ${UI_FONT}`;
  ctx.fillText('Kawananmu bertahan sampai pagi. Langit cerah lagi.', W / 2, 272);
  ctx.fillStyle = '#fff3d0';
  ctx.font = `bold 30px ${UI_FONT}`;
  ctx.fillText(`Skor akhir  ${state.score}`, W / 2, 336);
  ctx.font = `22px ${UI_FONT}`;
  ctx.fillStyle = '#cfe0ff';
  ctx.fillText(`Bintang terkumpul  ${state.motesCollected}   ·   Kombo terbaik  x${state.bestCombo}`, W / 2, 384);
  ctx.fillText(`Burung tersisa  ${birdCount(state.flock)}   ·   Burung hilang  ${state.birdsLost}`, W / 2, 420);
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold 24px ${UI_FONT}`;
  ctx.fillText('Tekan R atau klik untuk main lagi', W / 2, 500);
  ctx.restore();
}

function drawLost(ctx, state) {
  dim(ctx);
  panel(ctx, W / 2 - 320, 150, 640, 400);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff9a7a';
  ctx.font = `bold 60px ${TITLE_FONT}`;
  ctx.fillText('KAWANAN HILANG', W / 2, 244);
  ctx.fillStyle = '#e8ddff';
  ctx.font = `22px ${UI_FONT}`;
  ctx.fillText('Badai mengambil burung terakhir sebelum fajar.', W / 2, 292);
  ctx.fillStyle = '#fff3d0';
  ctx.font = `bold 30px ${UI_FONT}`;
  ctx.fillText(`Skor  ${state.score}`, W / 2, 356);
  ctx.font = `22px ${UI_FONT}`;
  ctx.fillStyle = '#cfe0ff';
  ctx.fillText(`Bintang terkumpul  ${state.motesCollected}   ·   Kombo terbaik  x${state.bestCombo}`, W / 2, 404);
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold 24px ${UI_FONT}`;
  ctx.fillText('Tekan R atau klik untuk main lagi', W / 2, 480);
  ctx.restore();
}

// Draw one frame of `state`. The shake offset is a pure function of time,
// so a replayed state always draws the same frame.
export function draw(ctx, state) {
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake * 9;
    ctx.translate(Math.sin(state.time * 91) * s, Math.cos(state.time * 113) * s);
  }
  drawSky(ctx, state);
  drawStars(ctx, state);
  drawMoonAndSun(ctx, state);
  drawHills(ctx, state);
  drawMotes(ctx, state);
  drawClouds(ctx, state);
  drawFlock(ctx, state);
  drawParticles(ctx, state);
  drawWind(ctx, state);
  ctx.restore();
  if (state.phase === 'playing' || state.phase === 'paused') drawHud(ctx, state);
  if (state.phase === 'title') drawTitle(ctx, state);
  if (state.phase === 'paused') drawPaused(ctx);
  if (state.phase === 'won') drawWon(ctx, state);
  if (state.phase === 'lost') drawLost(ctx, state);
}
